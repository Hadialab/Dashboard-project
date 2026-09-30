/**
 * Drops and recreates the E2E database, so a run always starts from nothing.
 *
 * Every E2E test registers its own company, which makes the tests independent of
 * each other but not of the past: companies pile up across runs, and a stale row
 * can make a test fail for reasons that have nothing to do with the code. A clean
 * database per run removes that whole class of flake.
 *
 * The API applies the schema itself on boot and the migration is idempotent, so
 * there is nothing to set up here beyond an empty database.
 *
 * Refuses to run if E2E_DATABASE_URL points at anything that is not named crm_e2e.
 * This script drops a database, and doing that to the development one because of
 * a typo would be unrecoverable.
 */
import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";

const BACKEND_DIR = path.resolve(import.meta.dirname, "..", "..", "backend");
const ADMIN_URL =
  process.env.E2E_ADMIN_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/postgres";
const E2E_DB = process.env.E2E_DATABASE_NAME ?? "crm_e2e";

/** Reads DATABASE_URL from backend/.env so this needs no environment setup. */
function devDatabaseUrl() {
  try {
    const env = fs.readFileSync(path.join(BACKEND_DIR, ".env"), "utf8");
    return env.match(/^\s*DATABASE_URL\s*=\s*(.+)$/m)?.[1]?.trim();
  } catch {
    return undefined;
  }
}

if (process.env.E2E_DATABASE_URL && !process.env.E2E_DATABASE_URL.includes(E2E_DB)) {
  console.error(
    `Refusing to reset: E2E_DATABASE_URL does not name ${E2E_DB}. This script drops a database.`,
  );
  process.exit(1);
}

const client = new Client({ connectionString: devDatabaseUrl() ?? ADMIN_URL });

try {
  await client.connect();

  // Evict anyone still connected, or DROP DATABASE fails.
  await client.query(
    `SELECT pg_terminate_backend(pid)
       FROM pg_stat_activity
      WHERE datname = $1 AND pid <> pg_backend_pid()`,
    [E2E_DB],
  );

  await client.query(`DROP DATABASE IF EXISTS ${E2E_DB}`);
  await client.query(`CREATE DATABASE ${E2E_DB}`);

  console.log(`[e2e] reset database ${E2E_DB}`);
} catch (error) {
  console.error("[e2e] could not reset the E2E database:", error.message);
  console.error("       create it manually, or set E2E_ADMIN_DATABASE_URL");
  process.exitCode = 1;
} finally {
  await client.end();
}
