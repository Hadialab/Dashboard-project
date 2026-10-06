import fs from "node:fs";
import path from "node:path";

// Resolved from this file rather than with a relative "..", which is ambiguous
// about what it is relative to and pointed outside the project when the API was
// actually started rather than reused.
const BACKEND_DIR = path.resolve(import.meta.dirname, "..", "..", "backend");

/**
 * Resolves the database the E2E API uses.
 *
 * Prefers an explicit E2E_DATABASE_URL. Otherwise it reuses the credentials from
 * backend/.env and swaps in a separate database, so the E2E run needs no
 * environment setup at all and can never write to the database being developed
 * against.
 *
 * Shared between playwright.config.js and the specs, because a spec that opened
 * its own connection to a *different* database would appear to find nothing and
 * fail in a way that looks like an application bug.
 */
export function resolveE2eDatabaseUrl() {
  if (process.env.E2E_DATABASE_URL) return process.env.E2E_DATABASE_URL;

  let devEnv;
  try {
    devEnv = fs.readFileSync(path.join(BACKEND_DIR, ".env"), "utf8");
  } catch {
    return undefined; // No .env: fall back to DATABASE_URL from the environment.
  }

  const match = devEnv.match(/^\s*DATABASE_URL\s*=\s*(.+)$/m);
  if (!match) return undefined;

  // Same host, port and credentials; a different database.
  return match[1].trim().replace(/\/[^/?]+(\?|$)/, "/crm_e2e$1");
}

/** The ports the E2E stack uses. Kept next to the resolver so both agree. */
export const E2E_API_PORT = process.env.E2E_API_PORT ?? "5001";
export const E2E_WEB_PORT = process.env.E2E_WEB_PORT ?? "5174";

/** The origin the emailed reset link points at during an E2E run. */
export const E2E_APP_URL = `http://localhost:${E2E_WEB_PORT}`;