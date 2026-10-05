import { query } from "../pool.js";
import { toTimestampString } from "../dates.js";

// Append-only. There is deliberately no update and no delete: the functions
// below are the complete surface, and an audit trail that can be rewritten
// cannot answer the question it exists to answer.
//
// Two consequences worth stating, because they are deliberate rather than
// oversights:
//   - No DELETE route for this table exists anywhere in the API. Rows leave only
//     when the organization is deleted, which cascades.
//   - Retention is not pruned by the application. A log that quietly discards its
//     oldest rows stops being evidence, so that belongs in a scheduled job or an
//     operator's decision, not in a default.

// Written out rather than composed from the crm.js field descriptors: this
// table nests values inside a JSONB column, and that coercion does not apply.
const AUDIT_SELECT = `
  id, organization_id, actor_id, actor_name, action,
  entity_type, entity_id, changes, created_at
`;

/** Serialises one row into the camelCase shape the API speaks. */
function toRow(row) {
  if (!row) return null;

  return {
    id: String(row.id),
    // Nullable: the user may have been deleted since. The id is still returned so
    // the client can tell "that user, since removed" from a renamed account.
    actorId: row.actor_id ?? null,
    actorName: row.actor_name,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    // pg parses JSONB into a JS object already. The `??` covers a row written
    // before the column had a default.
    changes: row.changes ?? {},
    createdAt: toTimestampString(row.created_at),
  };
}

/**
 * Writes one entry.
 *
 * Never throws: the audit write happens after the business write has already
 * succeeded, and failing the request would report a change that did happen as an
 * error. Same reasoning the activity timeline uses. It does mean a failure here
 * is visible only in the log, which is why the failure is logged loudly.
 */
export async function insertAuditEntry(organizationId, entry) {
  try {
    await query(
      `INSERT INTO audit_log
         (organization_id, actor_id, actor_name, action, entity_type, entity_id, changes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        organizationId,
        entry.actorId ?? null,
        entry.actorName ?? "Unknown",
        entry.action,
        entry.entityType,
        String(entry.entityId),
        // Serialised explicitly: pg would otherwise send a JS object as an
        // unparameterised literal, which is neither indexable nor safe.
        JSON.stringify(entry.changes ?? {}),
      ],
    );
  } catch (error) {
    console.error("[audit] could not write entry:", error.message);
  }
}

/**
 * The admin view's query.
 *
 * Every filter is optional and combined with AND. `limit` is capped so a filter
 * matching everything cannot pull a company's whole history into memory at once.
 */
export async function listAuditEntries(organizationId, filters = {}) {
  const { clause, params } = buildFilters(organizationId, filters);

  const limit = Math.min(Number(filters.limit) || 100, 500);
  const offset = Math.max(Number(filters.offset) || 0, 0);

  const result = await query(
    `SELECT ${AUDIT_SELECT}
       FROM audit_log
      WHERE ${clause}
      ORDER BY created_at DESC, id DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset],
  );

  return { rows: result.rows.map(toRow), limit, offset };
}

/** Total matching the same filters, for the admin view's count line. */
export async function countAuditEntries(organizationId, filters = {}) {
  const { clause, params } = buildFilters(organizationId, filters);

  const result = await query(
    `SELECT count(*)::int AS total FROM audit_log WHERE ${clause}`,
    params,
  );

  return result.rows[0]?.total ?? 0;
}

/** The distinct actors who have written anything, for the filter dropdown. */
export async function listAuditActors(organizationId) {
  const result = await query(
    `SELECT DISTINCT actor_id, actor_name
       FROM audit_log
      WHERE organization_id = $1
      ORDER BY actor_name`,
    [organizationId],
  );

  return result.rows.map((row) => ({ id: row.actor_id ?? null, name: row.actor_name }));
}

/**
 * Builds the WHERE clause and its parameters.
 *
 * Shared by the list and the count rather than duplicated, because two copies of
 * a filter are two chances for them to disagree — and they would disagree
 * silently, showing a count that did not match the rows under it.
 *
 * Values always go through a placeholder. `entityId` is free text from the
 * query string, so string-concatenating it would be an injection hole.
 */
function buildFilters(organizationId, filters) {
  const conditions = ["organization_id = $1"];
  const params = [organizationId];

  const next = (value) => {
    params.push(value);
    return `$${params.length}`;
  };

  if (filters.actorId) conditions.push(`actor_id = ${next(Number(filters.actorId))}`);
  // By name as well as by id: once an account is deleted actor_id is null, and
  // only the name still identifies who did the work.
  if (!filters.actorId && filters.actorName) {
    conditions.push(`actor_name ILIKE ${next(`%${filters.actorName}%`)}`);
  }
  if (filters.entityType) conditions.push(`entity_type = ${next(filters.entityType)}`);
  if (filters.action) conditions.push(`action = ${next(filters.action)}`);
  if (filters.entityId) conditions.push(`entity_id ILIKE ${next(`%${filters.entityId}%`)}`);

  // The date range is anchored in UTC, not the server's timezone, and the
  // distinction is not cosmetic.
  //
  // `created_at` is TIMESTAMPTZ, so it stores an absolute instant. Casting the
  // bound to `date` makes Postgres interpret it in the *session* timezone, which
  // is the server's — and this machine is three hours ahead of UTC. An entry made
  // at 19:00 UTC on the 5th is stored as 22:00 on the 5th locally, but an entry
  // made at 02:00 UTC on the 5th is 05:00 on the 5th, and one made at 23:00 UTC
  // on the 4th is *02:00 on the 5th* locally. Casting the bound the same way
  // would then make "today" start at 00:00 local, which is 21:00 the previous
  // evening UTC — and every entry from the last three hours of yesterday would
  // be excluded from today's range, silently.
  //
  // The browser's own calendar day is what the user means by "today", and the
  // timestamps it renders are UTC. So the range is pinned to UTC and both ends
  // are inclusive of the whole day.
  if (filters.from) {
    conditions.push(`created_at >= (${next(filters.from)})::date AT TIME ZONE 'UTC'`);
  }

  if (filters.to) {
    // Exclusive of the following midnight, so a range ending on a day includes
    // that whole day. `<= '2026-10-06'` would compare against midnight and drop
    // everything after it, which reads as an empty result.
    conditions.push(
      `created_at < ((${next(filters.to)})::date + interval '1 day') AT TIME ZONE 'UTC'`,
    );
  }

  return { clause: conditions.join(" AND "), params };
}