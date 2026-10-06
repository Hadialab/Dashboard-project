import { query } from "../pool.js";
import { toTimestampString } from "../dates.js";

/**
 * The record of what was sent.
 *
 * Write-only as far as the application is concerned — nothing in the API reads
 * this back yet, and that is deliberate for now. It exists so a failure is
 * diagnosable from the database rather than from whatever the logs happened to
 * keep, and it is the thing a future "sent email" admin view or a bounce webhook
 * would be built on.
 *
 * As with the audit log, a write failure here is logged rather than thrown: the
 * message has already been attempted, and failing the caller's request would
 * report a completed action as an error.
 */
export async function logEmailAttempt({
  organizationId = null,
  userId = null,
  template,
  recipient,
  subject,
  status,
  detail = null,
}) {
  try {
    await query(
      `INSERT INTO sent_email
         (organization_id, user_id, template, recipient, subject, status, detail)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [organizationId, userId, template, recipient, subject, status, detail],
    );
  } catch (error) {
    console.error("[email] could not record the attempt:", error.message);
  }
}

/**
 * A company's recent sends, newest first.
 *
 * Exists for the tests and for an operator with psql; the API does not expose it
 * yet. Capped rather than paginated because there is no caller that needs more,
 * and an unbounded query against a table that grows forever is the kind of thing
 * that is written casually and then called from a page.
 */
export async function listSentEmail(organizationId, limit = 100) {
  const result = await query(
    `SELECT id, user_id, template, recipient, subject, status, detail, created_at
       FROM sent_email
      WHERE organization_id = $1
      ORDER BY created_at DESC, id DESC
      LIMIT $2`,
    [organizationId, Math.min(Number(limit) || 100, 500)],
  );

  return result.rows.map((row) => ({
    id: String(row.id),
    userId: row.user_id ?? null,
    template: row.template,
    recipient: row.recipient,
    subject: row.subject,
    status: row.status,
    detail: row.detail ?? null,
    createdAt: toTimestampString(row.created_at),
  }));
}