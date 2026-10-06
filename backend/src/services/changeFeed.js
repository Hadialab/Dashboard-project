// Turning Postgres notifications into per-organization subscriptions.
//
// A thin layer over db/events.js. Its whole job is the one thing NOTIFY cannot do:
// a notification carries every organization's changes on one channel, so each
// process has to fan them out to only the streams that asked for that tenant.
//
// Doing that here rather than in the route means the route holds no fan-out
// state, so a stream cannot leak another tenant's events by forgetting a filter.

let nextEventId = 1;

const subscribers = new Map();

/**
 * Delivers a change to every stream watching this organization.
 *
 * Called from the LISTEN/NOTIFY handler in db/events.js, so it runs once per
 * process per change rather than once per stream.
 */
export function deliverChange(change) {
  const listeners = subscribers.get(change.organizationId);
  if (!listeners || listeners.size === 0) return;

  // The id is per-process and monotonic. It exists so `Last-Event-ID` is
  // meaningful on reconnect, not to order events across processes — a client that
  // reconnects may briefly see events from the old and new streams interleaved,
  // which is harmless because every event means "refetch" rather than "apply this
  // diff".
  const event = { ...change, eventId: nextEventId++ };

  for (const listener of listeners) {
    try {
      listener(event);
    } catch (error) {
      // One broken stream must not stop the others receiving it, so a throwing
      // listener is dropped from the set rather than propagated.
      console.error("[events] a subscriber threw:", error.message);
      listeners.delete(listener);
    }
  }
}

/**
 * Subscribes to one organization's changes.
 *
 * Returns the unsubscribe function, which the route is required to call on close.
 */
export function subscribeToChanges(organizationId, listener) {
  const existing = subscribers.get(organizationId);

  if (existing) {
    existing.add(listener);
  } else {
    subscribers.set(organizationId, new Set([listener]));
  }

  return function unsubscribe() {
    const listeners = subscribers.get(organizationId);
    if (!listeners) return;

    listeners.delete(listener);

    // Drop the empty set rather than leaving it behind: an organization whose last
    // user closed their tab would otherwise keep an entry for the life of the
    // process, which is a slow leak proportional to tenant count.
    if (listeners.size === 0) subscribers.delete(organizationId);
  };
}

/** How many streams are open, per organization. For tests and diagnostics. */
export function subscriberCounts() {
  return Object.fromEntries([...subscribers].map(([org, set]) => [org, set.size]));
}