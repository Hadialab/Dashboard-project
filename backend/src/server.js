import "dotenv/config";
import { createApp } from "./app.js";
import { migrate, ping } from "./db/migrate.js";
import { closePool } from "./db/pool.js";
import { config } from "./config.js";

async function start() {
  // Create any missing tables before accepting traffic. Without this the first
  // request against a fresh database would fail on a missing relation rather
  // than reporting a clear startup problem.
  if (config.runMigrationsOnBoot) {
    await migrate();
    console.log("[db] schema up to date");
  }

  try {
    await ping();
  } catch (error) {
    // Fail loudly: a clear message here beats every request 500ing later.
    console.error("[db] cannot reach PostgreSQL:", error.message);
    console.error("    Check DATABASE_URL in backend/.env");
    process.exit(1);
  }

  const app = createApp();
  const server = app.listen(config.port, () => {
    console.log(`CRM API listening on http://localhost:${config.port}`);
  });

  // Close the pool on shutdown so in-flight requests finish and connections are
  // released, rather than being cut off.
  const shutdown = (signal) => {
    console.log(`\n[api] ${signal} received, shutting down`);
    server.close(async () => {
      await closePool();
      process.exit(0);
    });
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

start().catch((error) => {
  console.error("[api] failed to start:", error);
  process.exit(1);
});
