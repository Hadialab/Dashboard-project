import { randomBytes, createHash } from "node:crypto";

// Password reset tokens: construction only, with no database involved.
//
// Split from db/repos/passwordReset.js for two reasons.
//
// The first is testability. Importing anything from db/repos/ pulls in the pool,
// which pulls in config.js, which throws at module load when DATABASE_URL is unset
// — so a unit test of a pure function would need a configured database. That is a
// real coupling, not a test artefact: config.js's job is to refuse to run without
// its settings, and a token has no settings.
//
// The second is that this is genuinely a different concern. Nothing here reads or
// writes anything; deciding what a token looks like and how it is stored are
// separable questions, and keeping them apart means the hashing scheme can change
// without touching a SQL statement.
//
// One rule matters here: the plaintext token exists only in the email, and
// persistence stores its hash. Everything else in this file is convenience, and all
// of it is worthless if a leaked copy of the table yields working reset links.
//
// sha256, not bcrypt. bcrypt is deliberately slow, which is the right default for
// verifying a *guessable* secret like a password. This is not guessable — it is 32
// bytes from the CSPRNG — so an attacker who has the table has nothing to iterate
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
 * The link a reset email carries.
 *
 * Its own function so it can be asserted without sending mail, which is the only
 * way to test it — the alternative is an end-to-end test that needs a working
 * provider and a readable inbox.
 *
 * `appUrl` is trimmed of a trailing slash first. A configured `https://crm.x.com/`
 * would otherwise produce `https://crm.x.com//reset-password`, which some routers
 * treat as a different path, and the user gets a 404 from a link that looks
 * correct in their mail client.
 */
export function buildResetUrl(appUrl, token) {
  return `${appUrl.replace(/\/+$/, "")}/reset-password?token=${token}`;
}

/**
 * How many live tokens a user may hold at once.
 *
 * This is the rate limit on `POST /auth/forgot-password`, and it works without a
 * per-IP counter because the thing worth limiting is per-account: the abuse is
 * using the endpoint to send mail to a known address as fast as possible, and that
 * is bounded by how many tokens one account can hold.
 *
 * Three is enough for a user who lost the email, clicked twice because the page
 * seemed slow, and is now trying again from another device.
 */
export const MAX_LIVE_RESET_TOKENS = 3;