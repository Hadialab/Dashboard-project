import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { query } from "./pool.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(here, "schema.sql");

/**
 * Creates any missing tables and indexes.
 *
 * Idempotent, and run on every boot so a fresh clone needs no setup step. It
 * only ever creates, never drops — removing data is a deliberate act.
 */
export async function migrate() {
  const sql = fs.readFileSync(schemaPath, "utf8");
  await query(sql);
}

/** Cheap check used by the health endpoint. */
export async function ping() {
  await query("SELECT 1");
}
