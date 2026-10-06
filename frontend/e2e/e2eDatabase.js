import fs from "node:fs";
import path from "node:path";

// Resolved from this file rather than with a relative "..", which is ambiguous
// about what it is relative to and pointed outside the project when the API was
// actually started rather than reused.
const BACKEND_DIR = path.resolve(import.meta.dirname, "..", "..", "backend");

/**
 * Resolves the database the E2E run uses, with the fallback included.
 *
 * Prefers an explicit E2E_DATABASE_URL. Otherwise it reuses the credentials from
 * backend/.env and swaps in a separate database, so the E2E run needs no
 * environment setup at all and can never write to the database being developed
 * against. With no .env — which is the case in CI — it falls back to
 * DATABASE_URL from the environment.
 *
 * The fallback lives *here* rather than at each call site. It was originally
 * applied in playwright.config.js only, and a spec that resolved the URL without
 * it got `undefined` in CI and failed with `SASL: client password must be a
 * string` — a message that points at Postgres credentials and has nothing to do
 * with the actual cause. One definition of "the E2E database", so a spec and the
 * config cannot disagree about which one that is.
 */
export function resolveE2eDatabaseUrl() {
  const url = preferredE2eDatabaseUrl() ?? process.env.DATABASE_URL;

  if (!url) {
    throw new Error(
      "No database URL for the E2E run. Set E2E_DATABASE_URL, or DATABASE_URL so it can " +
        "be derived from backend/.env.",
    );
  }

  return url;
}

/** The swapped-database URL, or undefined when it cannot be derived. */
function preferredE2eDatabaseUrl() {
  if (process.env.E2E_DATABASE_URL) return process.env.E2E_DATABASE_URL;

  let devEnv;
  try {
    devEnv = fs.readFileSync(path.join(BACKEND_DIR, ".env"), "utf8");
  } catch {
    return undefined; // No .env: the caller's DATABASE_URL fallback applies.
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