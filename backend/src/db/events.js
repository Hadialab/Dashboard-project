import pg from "pg";
import { query } from "./pool.js";
import { config } from "../config.js";

// Change notifications, carried over Postgres's own LISTEN/NOTIFY.
//
// The obvious implementation is an in-process EventEmitter, and it is the wrong
// one. Every API process would only see writes it handled itself, so running two
// replicas behind a load balancer means a client connected to process A never
// hears about a change written through process B — and nothing errors. It looks
// like working software that quietly shows stale data, which is the worst kind of
// bug to notice in production.
//
// LISTEN/NOTIFY fixes that with no new infrastructure, because Postgres is already
// a shared dependency: a publish is a normal statement that every process is
// already listening for. The costs are real and worth stating — an 8000-byte
// payload limit, no delivery guarantee if a listener is down, and notifications
// coalescing per channel under load. None of them matter for "a record changed",
// which is idempotent by nature: the client reacts by refetching, so a missed or
// duplicated event costs a refresh rather than a wrong value.

const CHANNEL = "crm_record_changed";

/**
 * Publishes a change to everyone listening for this organization.
 *
 * The payload deliberately carries identifiers and nothing else — no names, no
 * field values. It crosses a wire to every connected browser, and a notification
 * saying "customer c041 changed" is enough to refetch; putting the customer's
 * name and phone number in it would push tenant data at a channel that has no
 * business carrying it.
 *
 * Never throws. The caller's write has already committed, and failing the request
 * because a notification could not be sent would report a successful change as an
 * error. A client that misses an event sees stale data until its next refetch,
 * which is the state the app was in before this existed.
 */
export async function publishChange({ organizationId, entityType, entityId, action, actorName }) {
  try {
    await query("SELECT pg_notify($1, $2)", [
      CHANNEL,
      JSON.stringify({
        organizationId,
        entityType,
        entityId: String(entityId),
        action,
        // A display name so a client can say "Nadia changed a customer" without
        // fetching the user. Not an identifier, so nothing here can be used to
        // look anyone up.
        actorName: actorName ?? null,
      }),
    ]);
  } catch (error) {
    console.error("[events] could not publish a change:", error.message);
  }
}

// One dedicated connection for the whole process.
//
// A pool connection cannot be used: LISTEN is session state, so the listener must
// stay on the same connection for its lifetime, and taking one out of the pool
// would shrink the pool for every request while doing it.
let listenerClient = null;
let listening = false;

/**
 * Starts delivering this organization's changes to `onChange`.
 *
 * Called once from server.js. Failures are logged and retried rather than
 * propagated: live updates are an enhancement over refetching, so a database that
// is briefly unreachable should not stop the API from booting.
 */
export async function startChangeListener(onChange) {
  if (listening) return;

  const client = new pg.Client({ connectionString: config.databaseUrl });

  client.on("error", (error) => {
    // Postgres restarts, or the connection drops. pg does not reconnect a Client
    // automatically, so this is where it has to be done by hand.
    console.error("[events] listener connection lost:", error.message);
    listening = false;

    setTimeout(() => {
      void startChangeListener(onChange);
    }, 2000).unref?.();
  });

  try {
    await client.connect();
    await client.query(`LISTEN ${CHANNEL}`);

    client.on("notification", (message) => {
      if (message.channel !== CHANNEL || !message.payload) return;

      try {
        onChange(JSON.parse(message.payload));
      } catch (error) {
        // A payload we cannot parse is not worth killing the listener for; the next
        // one will be fine.
        console.error("[events] unparseable notification:", error.message);
      }
    });

    listenerClient = client;
    listening = true;
    console.log(`[events] listening on ${CHANNEL}`);
  } catch (error) {
    console.error("[events] could not start the listener:", error.message);
  }
}

export async function stopChangeListener() {
  if (!listenerClient) return;

  try {
    await listenerClient.end();
  } catch {
    // Already gone. Nothing useful to do with the failure.
  }

  listenerClient = null;
  listening = false;
}