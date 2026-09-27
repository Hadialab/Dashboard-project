import { query } from "../pool.js";
import { toDateString, toNumber, toTimestampString } from "../dates.js";

// Record tables share a shape: a text id with a per-table letter prefix, and
// columns whose snake_case names map to the camelCase the API speaks. Describing
// them in one place avoids three near-identical files drifting apart.
//
// Each field declares three things that all have to agree:
//   column — the SQL column
//   alias  — the name the API exposes it as, which is also the key a client
//            sends and the key this repo reads on write
//   type   — how to coerce it
//
// The type is not optional. Without it Postgres hands back a NUMERIC as a string
// ("25000.00"), which the reports page then concatenates instead of adding, and
// a DATE as a Date that `toISOString()` shifts by a day east of UTC.

const text = (column, alias = column) => ({ column, alias, type: "text" });
const numeric = (column, alias = column) => ({ column, alias, type: "numeric" });
const date = (column, alias = column) => ({ column, alias, type: "date" });
const timestamp = (column, alias = column) => ({ column, alias, type: "timestamp" });

export const CRM_TABLES = {
  customers: {
    prefix: "c",
    entity: "customer",
    sequence: "customers_id_seq",
    fields: [
      text("name"),
      text("company"),
      text("email"),
      text("phone"),
      text("status"),
      timestamp("created_at", "createdAt"),
    ],
  },

  leads: {
    prefix: "l",
    entity: "lead",
    sequence: "leads_id_seq",
    // `createdDate` is the established API name for leads and deals. It is a
    // date, not a timestamp, so the column is DATE and it renders as one.
    fields: [
      text("name"),
      text("company"),
      text("email"),
      text("phone"),
      text("status"),
      text("source"),
      text("assigned_rep", "assignedRep"),
      numeric("owner_id", "ownerId"),
      date("created_at", "createdDate"),
    ],
  },

  deals: {
    prefix: "d",
    entity: "deal",
    sequence: "deals_id_seq",
    fields: [
      text("title"),
      text("customer"),
      text("owner"),
      numeric("owner_id", "ownerId"),
      text("stage"),
      // Read as a number: the reports page sums deal.value directly.
      numeric("value"),
      date("created_at", "createdDate"),
      date("expected_close", "expectedClose"),
    ],
  },
};

// A DATE column arrives as local midnight, so it is formatted from local
// calendar components; going through UTC would shift it a day for anyone east
// of Greenwich. See ../dates.js.
function coerce(value, type) {
  if (value === null || value === undefined) return value;

  if (type === "numeric") return toNumber(value);
  if (type === "date") return toDateString(value);
  if (type === "timestamp") return toTimestampString(value);

  return value;
}

function camelize(key) {
  return key.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
}

/**
 * Postgres lowercases unquoted identifiers, so `AS ownerId` arrives back as
 * `ownerid`. Every alias has to be double-quoted to survive, which is why the
 * alias is also used verbatim as the response key — one name, no second
 * camelization pass to disagree with.
 */
function toResponse(row, spec) {
  if (!row) return null;

  const out = {};
  for (const [key, value] of Object.entries(row)) {
    const field = spec.fields.find((f) => f.alias === key);
    out[key] = coerce(value, field?.type);
  }
  return out;
}

function selectList(spec) {
  return [
    "id",
    ...spec.fields.map((f) => `${f.column} AS "${f.alias}"`),
  ].join(", ");
}

async function nextId(client, sequence, prefix) {
  const { rows } = await client.query(`SELECT nextval('${sequence}') AS value`);
  return `${prefix}${String(rows[0].value).padStart(3, "0")}`;
}

// Turns an API-shaped document into column values. Unknown keys are ignored, so
// a client cannot write to a column it was not meant to.
function toRow(spec, doc) {
  const out = {};

  for (const field of spec.fields) {
    const value = doc[field.alias];
    if (value === undefined) continue;

    out[field.column] = coerce(value, field.type);
  }

  return out;
}

export function repo(table) {
  const spec = CRM_TABLES[table];
  if (!spec) throw new Error(`Unknown table: ${table}`);

  const select = selectList(spec);
  const read = (row) => toResponse(row, spec);

  return {
    spec,

    async all(organizationId) {
      const { rows } = await query(
        `SELECT ${select} FROM ${table} WHERE organization_id = $1 ORDER BY id`,
        [organizationId],
      );
      return rows.map(read);
    },

    async findById(organizationId, id) {
      const { rows } = await query(
        `SELECT ${select} FROM ${table} WHERE organization_id = $1 AND id = $2`,
        [organizationId, String(id)],
      );
      return read(rows[0]);
    },

    async insert(organizationId, doc, client) {
      const run = client ?? { query };

      const id = await nextId(run, spec.sequence, spec.prefix);
      const data = toRow(spec, doc);

      const columns = ["id", "organization_id", ...Object.keys(data)];
      const values = [id, organizationId, ...Object.values(data)];
      const placeholders = columns.map((_, index) => `$${index + 1}`);

      const { rows } = await run.query(
        `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders.join(", ")})
         RETURNING ${select}`,
        values,
      );

      return read(rows[0]);
    },

    async update(organizationId, id, changes, client) {
      const run = client ?? { query };
      const data = toRow(spec, changes);
      const keys = Object.keys(data);

      if (keys.length === 0) return this.findById(organizationId, id);

      const sets = keys.map((column, index) => `${column} = $${index + 3}`);
      const values = [organizationId, String(id), ...Object.values(data)];

      const { rows } = await run.query(
        `UPDATE ${table} SET ${sets.join(", ")}
          WHERE organization_id = $1 AND id = $2
          RETURNING ${select}`,
        values,
      );

      return read(rows[0]);
    },

    async remove(organizationId, id) {
      // Notes and follow-ups reference the parent by id rather than by foreign
      // key, so they are removed alongside it explicitly.
      await query(
        `DELETE FROM notes
          WHERE organization_id = $1 AND entity_type = $2 AND entity_id = $3`,
        [organizationId, spec.entity, String(id)],
      );

      await query(
        `DELETE FROM followups
          WHERE organization_id = $1 AND entity_type = $2 AND entity_id = $3`,
        [organizationId, spec.entity, String(id)],
      );

      const { rows } = await query(
        `DELETE FROM ${table} WHERE organization_id = $1 AND id = $2 RETURNING ${select}`,
        [organizationId, String(id)],
      );

      return read(rows[0]);
    },
  };
}
