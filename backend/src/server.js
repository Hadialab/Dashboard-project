import "dotenv/config";
import { createApp } from "./app.js";
import { migrate, ping } from "./db/migrate.js";
import { closePool } from "./db/pool.js";
import { startChangeListener, stopChangeListener } from "./db/events.js";
import { deliverChange } from "./services/changeFeed.js";
import { pruneExpiredResetTokens } from "./db/repos/passwordReset.js";
import { config } from "./config.js";

// Once an hour. The sweep only deletes rows that expired more than a day ago, so
// running it more often than that would do nothing; running it much less often
// would let the table grow for weeks between passes.
const RESET_TOKEN_SWEEP_MS = 60 * 60 * 1000;

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

  // Before accepting traffic, so the first subscriber gets events rather than
  // waiting for the next write. Failure to listen is logged by the function itself
  // and does not stop the boot: live updates enhance a refetch, they do not
  // provide it.
  await startChangeListener(deliverChange);

  // The host is stated rather than left to Node's default, even though omitting it
  // already binds to every interface. Two reasons:
  //
  //   1. The log line is the only evidence a deploy has that it bound correctly,
  //      and "localhost" in it reads as loopback-only to whoever is debugging a
  //      502 — which is exactly the wrong conclusion, and the one that sends people
  //      looking for a bug that isn't there. Printing 0.0.0.0 states the fact.
  //   2. IPv4-only becomes explicit. Node's unspecified host resolves to `::` when
  //      IPv6 is available, which accepts IPv4 through v4-mapped addresses only if
  //      net.ipv6.bindv6only is 0. That is the default, but it is a kernel setting,
  //      so "0.0.0.0" removes the dependency on it entirely.
  const server = app.listen(config.port, config.host, () => {
    // Read the port back off the server rather than echoing config.port: if the
    // configured port were 0, the OS assigns a real one, and logging the
    // configured value would name a port nothing is listening on.
    console.log(`CRM API listening on port ${server.address().port} (${config.host})`);
  });

  // Housekeeping. Expired reset tokens accumulate, one per forgotten password, and
  // are the only table in the app that nothing ever deletes from.
  //
  // unref'd so the interval does not hold the process open on shutdown — without it
  // a SIGTERM would wait for the next tick rather than exiting.
  const pruner = setInterval(() => {
    pruneExpiredResetTokens().catch((error) =>
      console.error("[auth] could not prune reset tokens:", error.message),
    );
  }, RESET_TOKEN_SWEEP_MS);

  pruner.unref?.();

  // Close the pool on shutdown so in-flight requests finish and connections are
  // released, rather than being cut off.
  const shutdown = (signal) => {
    console.log(`\n[api] ${signal} received, shutting down`);

    void (async () => {
      await stopChangeListener();
      await closePool();
      process.exit(0);
    })();

    server.close();
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

start().catch((error) => {
  console.error("[api] failed to start:", error);
  process.exit(1);
});
