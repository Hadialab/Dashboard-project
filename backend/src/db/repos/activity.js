import { query } from "../pool.js";
import { toDateString, toTimestampString } from "../dates.js";

// Notes and follow-ups both hang off a customer or a deal, so they share a
// shape: organization_id, an entity reference, and their own payload.

const NOTES_SELECT =
  "id, entity_type, entity_id, body, author_id, author_name, created_at";
const FOLLOWUPS_SELECT =
  "id, entity_type, entity_id, title, type, due_at, details, status, created_by, created_by_name, created_at, completed_at";

async function nextId(sequence, prefix) {
  const { rows } = await query(`SELECT nextval('${sequence}') AS value`);
  return `${prefix}${String(rows[0].value).padStart(3, "0")}`;
}

// due_at and completed_at are DATE columns and arrive as local midnight, so they
// are formatted from local components; created_at is a real instant. See
// ../dates.js for why routing a DATE through UTC loses a day.
function coerce(key, value) {
  if (value === null || value === undefined) return value;

  if (key === "due_at" || key === "completed_at") return toDateString(value);

  return toTimestampString(value);
}

const camelize = (key) => key.replace(/_([a-z])/g, (_, char) => char.toUpperCase());

function toCamel(row) {
  if (!row) return null;

  const out = {};
  for (const [key, value] of Object.entries(row)) {
    out[camelize(key)] = coerce(key, value);
  }
  return out;
}

// ===== Notes =====

export const notesRepo = {
  // Newest first, matching the timeline in the UI.
  async listForEntity(organizationId, entityType, entityId) {
    const { rows } = await query(
      `SELECT ${NOTES_SELECT} FROM notes
        WHERE organization_id = $1 AND entity_type = $2 AND entity_id = $3
        ORDER BY created_at DESC, id DESC`,
      [organizationId, entityType, String(entityId)],
    );
    return rows.map(toCamel);
  },

  async insert(organizationId, { entityType, entityId, body, authorId, authorName }) {
    const id = await nextId("notes_id_seq", "n");

    const { rows } = await query(
      `INSERT INTO notes (id, organization_id, entity_type, entity_id, body, author_id, author_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING ${NOTES_SELECT}`,
      [id, organizationId, entityType, String(entityId), body, authorId, authorName],
    );

    return toCamel(rows[0]);
  },

  async findById(organizationId, id) {
    const { rows } = await query(
      `SELECT ${NOTES_SELECT} FROM notes WHERE organization_id = $1 AND id = $2`,
      [organizationId, String(id)],
    );
    return toCamel(rows[0]);
  },

  async remove(organizationId, id) {
    const { rows } = await query(
      `DELETE FROM notes WHERE organization_id = $1 AND id = $2 RETURNING ${NOTES_SELECT}`,
      [organizationId, String(id)],
    );
    return toCamel(rows[0]);
  },
};

// ===== Follow-ups =====

export const followUpsRepo = {
  // Due date ascending, so the next thing to do is at the top.
  async listForEntity(organizationId, entityType, entityId) {
    const { rows } = await query(
      `SELECT ${FOLLOWUPS_SELECT} FROM followups
        WHERE organization_id = $1 AND entity_type = $2 AND entity_id = $3
        ORDER BY due_at, id`,
      [organizationId, entityType, String(entityId)],
    );
    return rows.map(toCamel);
  },

  async listAll(organizationId) {
    const { rows } = await query(
      `SELECT ${FOLLOWUPS_SELECT} FROM followups
        WHERE organization_id = $1
        ORDER BY due_at, id`,
      [organizationId],
    );
    return rows.map(toCamel);
  },

  async insert(organizationId, followUp) {
    const id = await nextId("followups_id_seq", "f");

    const { rows } = await query(
      `INSERT INTO followups
         (id, organization_id, entity_type, entity_id, title, type, due_at, details, status, created_by, created_by_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9, $10)
       RETURNING ${FOLLOWUPS_SELECT}`,
      [
        id,
        organizationId,
        followUp.entityType,
        String(followUp.entityId),
        followUp.title,
        followUp.type,
        followUp.dueAt,
        followUp.details,
        followUp.createdBy,
        followUp.createdByName,
      ],
    );

    return toCamel(rows[0]);
  },

  async findById(organizationId, id) {
    const { rows } = await query(
      `SELECT ${FOLLOWUPS_SELECT} FROM followups WHERE organization_id = $1 AND id = $2`,
      [organizationId, String(id)],
    );
    return toCamel(rows[0]);
  },

  async update(organizationId, id, changes) {
    const sets = [];
    const values = [];
    let index = 3;

    for (const [field, column] of [
      ["status", "status"],
      ["title", "title"],
      ["dueAt", "due_at"],
      ["details", "details"],
      ["completedAt", "completed_at"],
    ]) {
      if (changes[field] === undefined) continue;
      sets.push(`${column} = $${index++}`);
      values.push(changes[field]);
    }

    if (sets.length === 0) return this.findById(organizationId, id);

    const { rows } = await query(
      `UPDATE followups SET ${sets.join(", ")}
        WHERE organization_id = $1 AND id = $2
        RETURNING ${FOLLOWUPS_SELECT}`,
      [organizationId, String(id), ...values],
    );

    return toCamel(rows[0]);
  },

  async remove(organizationId, id) {
    const { rows } = await query(
      `DELETE FROM followups WHERE organization_id = $1 AND id = $2 RETURNING ${FOLLOWUPS_SELECT}`,
      [organizationId, String(id)],
    );
    return toCamel(rows[0]);
  },
};

/**
 * Used when a user is deleted: their follow-ups become unowned rather than
 * being removed, so the record itself is not lost.
 */
export async function releaseCreator(organizationId, userId) {
  await query(
    "UPDATE followups SET created_by = NULL WHERE organization_id = $1 AND created_by = $2",
    [organizationId, userId],
  );
}

export { toCamel };
