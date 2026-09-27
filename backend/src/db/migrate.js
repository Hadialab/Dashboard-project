import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { query, transaction } from "./pool.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(here, "schema.sql");

// Tables that gained an `updated_at` after they were first created.
const UPDATED_AT_TABLES = ["customers", "leads", "deals"];

/**
 * Creates any missing tables, columns and constraints.
 *
 * Idempotent, and run on every boot so a fresh clone needs no setup step. It
 * only ever adds — removing data is a deliberate act.
 */
export async function migrate() {
  const sql = fs.readFileSync(schemaPath, "utf8");
  await query(sql);

  await backfillUpdatedAt();
}

/**
 * Gives pre-existing rows a sensible `updated_at`.
 *
 * `ADD COLUMN ... DEFAULT now()` stamps the moment of the migration onto every
 * row that already exists, so without this every old record would report "just
 * updated" — true of the column, useless to the reader. Backfilling from the
 * creation date is the honest answer for a row that has never been edited.
 */
async function backfillUpdatedAt() {
  for (const table of UPDATED_AT_TABLES) {
    // Only worth doing for rows whose updated_at is still the migration stamp,
    // i.e. it is later than the row was created.
    const { rowCount } = await query(
      `UPDATE ${table}
          SET updated_at = created_at
        WHERE updated_at > created_at + INTERVAL '1 second'`,
    );

    if (rowCount > 0) {
      console.log(`[db] backfilled updated_at on ${rowCount} ${table} row(s)`);
    }
  }
}

/** Cheap check used by the health endpoint. */
export async function ping() {
  await query("SELECT 1");
}

export { transaction };
