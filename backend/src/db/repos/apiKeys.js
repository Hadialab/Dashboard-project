import { randomBytes, createHmac, timingSafeEqual } from "node:crypto";
import { query } from "../pool.js";

// API keys and webhooks for tenant automation.
//
// Both tables exist so a company can reach this API from something other than the
// app: a script that reconciles data nightly, a Slack channel that announces a
// closed deal. Neither is a convenience — a CRM that cannot be integrated is a
// spreadsheet with better styling.
//
// Two decisions run through this file.
//
// Secrets are stored hashed, and shown once. An API key and a webhook signing
// secret are both bearer credentials, and both are generated rather than chosen,
// so the value is in the table only at the moment it is created. Everything after
// that is a prefix — enough to identify the key in a list, not enough to use it.
//
// Signatures are compared in constant time. `===` on a secret leaks its prefix
// through timing, which is the whole reason `timingSafeEqual` exists; using it
// here is free and the alternative is a bug waiting to be written.

const KEY_PREFIX_LENGTH = 8;

/** Generates an API key. The plaintext is returned once and never again. */
export function generateApiKey() {
  const secret = randomBytes(32).toString("hex");

  return {
    // `crm_` + 8 characters is enough to find the key in a list without being
    // usable. It is not a secret and is deliberately not treated as one.
    plaintext: `crm_${secret}`,
    prefix: `crm_${secret.slice(0, KEY_PREFIX_LENGTH)}`,
    hash: hashApiKey(`crm_${secret}`),
  };
}

export function hashApiKey(plaintext) {
  return createHmac("sha256", "crm-api-key").update(plaintext).digest("hex");
}

/**
 * Compares two secrets without leaking their contents through timing.
 *
 * `timingSafeEqual` throws on a length mismatch, so both sides are hashed to a
 * fixed length first. That is not a workaround — hashing first is what makes the
 * comparison safe for inputs of different lengths.
 */
export function secretsMatch(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;

  const left = createHmac("sha256", "crm-api-key").update(a).digest();
  const right = createHmac("sha256", "crm-api-key").update(b).digest();

  return timingSafeEqual(left, right);
}

/** Generates a webhook signing secret. Shown once, stored as-is. */
export function generateSigningSecret() {
  return `whsec_${randomBytes(24).toString("hex")}`;
}

/**
 * Signs a webhook body.
 *
 * The timestamp is inside the signed material, not just alongside it: without it a
 * captured payload could be replayed indefinitely, because the signature would
 * still verify. The receiver compares against its own clock.
 */
export function signWebhook(secret, body, timestampSeconds) {
  return createHmac("sha256", secret).update(`${timestampSeconds}.${body}`).digest("hex");
}

export const API_KEY_SCOPES = [
  "customers:read",
  "customers:write",
  "leads:read",
  "leads:write",
  "deals:read",
  "deals:write",
  "reports:read",
];

/** Narrows an unknown value to known scopes, dropping anything unrecognised. */
export function normalizeScopes(scopes) {
  if (!Array.isArray(scopes)) return [];

  return [...new Set(scopes.filter((scope) => API_KEY_SCOPES.includes(scope)))];
}

export async function listApiKeys(organizationId) {
  const result = await query(
    `SELECT id, label, key_prefix, scopes, created_by, created_by_name,
            last_used_at, expires_at, revoked_at, created_at
       FROM api_keys
      WHERE organization_id = $1
      ORDER BY created_at DESC`,
    [organizationId],
  );

  return result.rows.map((row) => ({
    id: String(row.id),
    label: row.label,
    keyPrefix: row.key_prefix,
    scopes: row.scopes ?? [],
    createdByName: row.created_by_name,
    lastUsedAt: row.last_used_at ? row.last_used_at.toISOString() : null,
    expiresAt: row.expires_at ? row.expires_at.toISOString() : null,
    revokedAt: row.revoked_at ? row.revoked_at.toISOString() : null,
    createdAt: row.created_at.toISOString(),
  }));
}

/**
 * Stores a key.
 *
 * The plaintext is not a parameter — the caller has already thrown it away by the
 * time this is called, because it was returned to them once. Passing it in would
 * put it on the call stack and in any error report.
 */
export async function insertApiKey(organizationId, { label, prefix, hash, scopes }, actor) {
  const { rows } = await query(
    `INSERT INTO api_keys
       (organization_id, label, key_prefix, key_hash, scopes, created_by, created_by_name)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, label, key_prefix, scopes, created_by_name, created_at`,
    [
      organizationId,
      label,
      prefix,
      hash,
      scopes,
      actor?.id ?? null,
      // Denormalised for the same reason as everywhere else: the list has to stay
      // readable after the person who made the key has been removed.
      actor?.name ?? null,
    ],
  );

  return rows[0];
}

/** Revokes rather than deletes. A deleted key leaves no trace of having existed. */
export async function revokeApiKey(organizationId, id) {
  const { rows } = await query(
    `UPDATE api_keys
        SET revoked_at = now()
      WHERE organization_id = $1 AND id = $2 AND revoked_at IS NULL
      RETURNING id, label`,
    [organizationId, id],
  );

  return rows[0] ?? null;
}

/** The key a bearer token refers to, if it is live. Null for every failure mode. */
export async function findLiveApiKey(hash) {
  const { rows } = await query(
    `UPDATE api_keys
        SET last_used_at = now()
      WHERE key_hash = $1
        AND revoked_at IS NULL
        AND (expires_at IS NULL OR expires_at > now())
      RETURNING id, organization_id, scopes, created_by_name`,
    [hash],
  );

  return rows[0] ?? null;
}

export async function listWebhooks(organizationId) {
  const result = await query(
    `SELECT id, label, target_url, events, is_active, created_by_name, last_deliveries, created_at
       FROM webhooks
      WHERE organization_id = $1
      ORDER BY created_at DESC`,
    [organizationId],
  );

  return result.rows.map((row) => ({
    id: String(row.id),
    label: row.label,
    targetUrl: row.target_url,
    events: row.events ?? [],
    isActive: row.is_active,
    createdByName: row.created_by_name,
    lastDeliveries: row.last_deliveries ?? [],
    createdAt: row.created_at.toISOString(),
  }));
}

/**
 * Stores a webhook.
 *
 * The signing secret is returned once, here, and is readable in the database
 * afterwards. That is deliberate and different from the API key: a webhook secret
 * has to be *given* to the receiving system, which means it is configured
 * somewhere, and a hash would make that impossible. It is not a credential for
 * reading this API — it signs outbound requests — so its exposure is to the
 * receiver, which already has it.
 */
export async function insertWebhook(
  organizationId,
  { label, targetUrl, events, signingSecret },
  actor,
) {
  const { rows } = await query(
    `INSERT INTO webhooks
       (organization_id, label, target_url, events, signing_secret, created_by, created_by_name)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     -- signing_secret is in the RETURNING clause, not just the INSERT, because this
     -- row is the only time it is readable: it is shown once to the customer and
     -- there is nowhere else to look it up. Omitting it here meant the create
     -- response carried no secret at all, and it was simply lost.
     RETURNING id, label, target_url, events, signing_secret, is_active,
               created_by_name, created_at`,
    [
      organizationId,
      label,
      targetUrl,
      events,
      signingSecret,
      actor?.id ?? null,
      actor?.name ?? null,
    ],
  );

  return rows[0];
}

export async function setWebhookActive(organizationId, id, isActive) {
  const { rows } = await query(
    `UPDATE webhooks SET is_active = $3
      WHERE organization_id = $1 AND id = $2
      RETURNING id, is_active`,
    [organizationId, id, isActive],
  );

  return rows[0] ?? null;
}

export async function deleteWebhook(organizationId, id) {
  const { rows } = await query(
    `DELETE FROM webhooks WHERE organization_id = $1 AND id = $2 RETURNING id, label`,
    [organizationId, id],
  );

  return rows[0] ?? null;
}

/** The live subscriptions watching this organization, for the dispatcher. */
export async function liveWebhooks(organizationId) {
  const result = await query(
    `SELECT id, target_url, events, signing_secret
       FROM webhooks
      WHERE organization_id = $1 AND is_active = TRUE`,
    [organizationId],
  );

  return result.rows.map((row) => ({
    id: String(row.id),
    targetUrl: row.target_url,
    events: row.events ?? [],
    signingSecret: row.signing_secret,
  }));
}

/**
 * Records a delivery attempt, keeping the most recent few.
 *
 * Kept in the row rather than a separate attempts table: this is a debugging aid,
 * not an audit trail, and a company that wants an audit trail of their outbound
 * integrations is asking for something this should not pretend to be. Ten entries
 * is enough to see a pattern; more than that and the row stops being readable in a
 * list.
 */
export async function recordWebhookDelivery(id, delivery) {
  await query(
    `UPDATE webhooks
        SET last_deliveries = (
              SELECT COALESCE(jsonb_agg(value), '[]'::jsonb)
                FROM (
                  SELECT value FROM jsonb_array_elements(last_deliveries)
                  UNION ALL
                  SELECT $2::jsonb
                ) AS kept
              LIMIT 10
            )
      WHERE id = $1`,
    [id, JSON.stringify(delivery)],
  );
}