import pg from "pg";
import { config } from "../config.js";

// A single pool for the process. `pg` reuses connections, so this is created
// once at import time.
export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  max: config.databasePoolSize,
  // Fail fast rather than hanging a request if the database is unreachable.
  connectionTimeoutMillis: 10_000,
  idleTimeoutMillis: 30_000,
});

pool.on("error", (error) => {
  // An idle client errored (network blip, database restart). Log it; pg will
  // open a fresh connection for the next query.
  console.error("[db] idle client error:", error.message);
});

export function query(text, params) {
  return pool.query(text, params);
}

/** Runs `fn` inside a transaction, rolling back if it throws. */
export async function transaction(fn) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function closePool() {
  await pool.end();
}
