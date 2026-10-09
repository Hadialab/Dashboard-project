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

  // No host argument, deliberately — see the note below. An earlier version
  // passed "0.0.0.0" explicitly and that was a mistake, found the hard way.
  const server = app.listen(config.port, config.host, () => {
    // Read the port back off the server rather than echoing config.port: if the
    // configured port were 0, the OS assigns a real one, and logging the
    // configured value would name a port nothing is listening on.
    //
    // The address is read from the socket rather than from config, because the
    // address that actually got bound is the fact worth logging. It is `::` in
    // practice, and "listening on port 5000 (::)" is the honest line: it says the
    // socket is dual-stack, which is what lets a browser that resolved
    // `localhost` to `::1` reach it.
    const { address, port } = server.address();
    console.log(`CRM API listening on port ${port} (bound ${address})`);
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
