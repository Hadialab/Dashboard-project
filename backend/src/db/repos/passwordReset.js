import { randomBytes, createHash } from "node:crypto";
import { query } from "../pool.js";
import { findUserByIdGlobal } from "./users.js";

// Password reset tokens.
//
// The one rule that matters here: the plaintext token exists only in the email,
// and this table stores its hash. Everything else here is convenience —
// single-use, expiring, one row per request — and all of it is worthless if a
// leaked copy of this table yields working reset links.
//
// sha256, not bcrypt. bcrypt is deliberately slow, which is the right default for
// verifying a *guessable* secret like a password. This is not guessable: it is 32
// bytes from the CSPRNG, so an attacker who has the table has nothing to iterate
// against and the hash costs nothing to compute. The slow-hash property would buy
// nothing and would make every reset request noticeably slower.

/** 32 bytes of CSPRNG output, hex-encoded. 256 bits: not a number worth guessing. */
export function generateResetToken() {
  return randomBytes(32).toString("hex");
}

/** The value actually stored. Exact for a random token, so a single pass suffices. */
export function hashResetToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Records a freshly issued token.
 *
 * A new row rather than an update of the old one, because "request a reset" must
 * work when a previous link is still live and unexpired — otherwise a user who
 * loses the second email has to wait out the first one. Both rows stay valid; each
 * works once.
 */
export async function insertResetToken(userId, token, expiresAt) {
  const { rows } = await query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)
     RETURNING id, expires_at`,
    [userId, hashResetToken(token), expiresAt],
  );

  return rows[0];
}

/**
 * The user a token belongs to, if and only if the token is still usable.
 *
 * Three conditions, all in the WHERE clause rather than in JavaScript, so a
 * concurrent request cannot consume a token between the read and the write:
 *
 *   used_at IS NULL   single-use — a second attempt finds this row and is refused
 *   expires_at > now  the window is enforced by the database's clock, not the
 *                     app server's, so a skewed worker cannot extend it
 *   the hash matches  the plaintext token is never stored
 *
 * Returns null for every failure mode. The caller cannot distinguish "no such
 * token" from "expired" from "already used", which is the point: a caller that
 * could tell them apart would be an oracle for whether a token ever existed.
 */
export async function findUserByResetToken(token) {
  const { rows } = await query(
    `SELECT r.user_id
       FROM password_reset_tokens r
       JOIN users u ON u.id = r.user_id
      WHERE r.token_hash = $1
        AND r.used_at IS NULL
        AND r.expires_at > now()`,
    [hashResetToken(token)],
  );

  if (rows.length === 0) return null;

  return findUserByIdGlobal(rows[0].user_id);
}

/**
 * Spends a token, marking it used.
 *
 * The `used_at IS NULL` in the WHERE is load-bearing: it makes the update
 * conditional, so of two simultaneous resets with the same token exactly one
 * updates a row and the other matches nothing. Without it, both would succeed and
 * the single-use property would be advisory.
 *
 * Returns the number of rows updated, which is how the caller knows whether it
 * won the race.
 */
export async function consumeResetToken(token) {
  const result = await query(
    `UPDATE password_reset_tokens
        SET used_at = now()
      WHERE token_hash = $1
        AND used_at IS NULL
        AND expires_at > now()`,
    [hashResetToken(token)],
  );

  return result.rowCount;
}

/**
 * How many live tokens a user may hold at once.
 *
 * This is the rate limit on `POST /auth/forgot-password`, and it works without a
 * per-IP counter because the thing worth limiting is per-account: the abuse is
 * using the endpoint to send mail to a known address as fast as possible, and
 * that is bounded by how many tokens one account can hold.
 *
 * Three is enough for a user who lost the email, clicked twice because the page
 * seemed slow, and is now trying again from another device.
 */
/**
 * The link a reset email carries.
 *
 * Its own function so it can be asserted without sending mail, which is the only
 * way to test it — the alternative is an end-to-end test that needs a working
 * provider and an inbox.
 *
 * `appUrl` is trimmed of a trailing slash first. A configured `https://crm.x.com/`
 * would otherwise produce `https://crm.x.com//reset-password`, which some routers
 * treat as a different path, and the user gets a 404 from a link that looks
 * correct in their mail client.
 */
export function buildResetUrl(appUrl, token) {
  return `${appUrl.replace(/\/+$/, "")}/reset-password?token=${token}`;
}

export const MAX_LIVE_RESET_TOKENS = 3;

/**
 * Whether this user has room for another live reset token.
 *
 * Counted in SQL rather than kept in memory so it holds across processes and
 * restarts — and so a rate limit that resets whenever the server restarts is not a
 * rate limit.
 *
 * Expired and already-used tokens are not counted: they cannot be spent, so
 * holding one is not a way to make progress toward the limit.
 */
export async function canIssueResetToken(userId) {
  const { rows } = await query(
    `SELECT count(*)::int AS live
       FROM password_reset_tokens
      WHERE user_id = $1
        AND used_at IS NULL
        AND expires_at > now()`,
    [userId],
  );

  return (rows[0]?.live ?? 0) < MAX_LIVE_RESET_TOKENS;
}

/**
 * Invalidates a user's outstanding reset tokens.
 *
 * Called when a password is set through any route, including a self-service reset.
 * Without it, a link requested before a password change stays valid afterwards,
 * which means a link forwarded to an attacker before the user noticed is still
 * good after they have already secured the account.
 *
 * Expired and used rows are left alone. Deleting them would be tidier but would
 * mean a write per reset against rows that can never be used again, and the table
 * only holds what someone asked for.
 */
export async function invalidateResetTokens(userId) {
  await query(
    `UPDATE password_reset_tokens
        SET used_at = now()
      WHERE user_id = $1
        AND used_at IS NULL`,
    [userId],
  );
}

/**
 * Removes tokens that expired more than a day ago.
 *
 * For a `setInterval` in server.js, not a migration: the table is small and grows
 * only when people forget passwords, so an occasional sweep is enough and nothing
 * should depend on it having run.
 *
 * The grace period is what makes the sweep safe to run concurrently with a real
 * request. A token expiring between this DELETE and a user's click would otherwise
 * be removed a moment before they used it; holding expired rows for a day means
 * the only tokens deleted are ones that were already dead when the sweep started.
 */
export async function pruneExpiredResetTokens() {
  const result = await query(
    `DELETE FROM password_reset_tokens
      WHERE expires_at < now() - interval '1 day'`,
  );

  return result.rowCount;
}