import { useCallback, useEffect, useRef, useState } from "react";

import { liveUpdates } from "../services/liveEvents";
import type { LiveEvent, LiveStatus } from "../services/liveEvents";

/**
 * Re-runs a callback when someone else changes a record.
 *
 * The point is narrow and worth stating: live updates make *other people's* changes
 * appear without a refresh. They are not a local cache, and they deliberately do
 * not mutate anything in place — a subscriber refetches, which is correct by
 * construction because the server is the only thing that knows the result of a
 * write.
 *
 * So the shape is a refetch trigger, not a data feed:
 *
 *   useLiveUpdates(
 *     (event) => { if (event.entityType === "customer") refetch(); },
 *     ["customer"],
 *   );
 *
 * `watch` lists the entity types the page cares about, so a customer list does not
 * refetch because a deal moved.
 */
export function useLiveUpdates(
  handler: (event: LiveEvent) => void,
  watch: readonly LiveEvent["entityType"][] = [],
): void {
  // The handler is held in a ref so an inline arrow function does not resubscribe
  // on every render. Depending on the function identity directly would churn a
  // connection that is deliberately long-lived, which is its whole point.
  const latest = useRef(handler);
  latest.current = handler;

  // Serialised, because an array literal is a new value every render and the
  // effect below keys off it.
  const watched = watch.join(",");

  useEffect(() => {
    const wanted = new Set(watched.split(",").filter(Boolean));

    return liveUpdates.on((event) => {
      if (wanted.size > 0 && !wanted.has(event.entityType)) return;
      latest.current(event);
    });
  }, [watched]);
}

/**
 * Opens the stream while mounted.
 *
 * In the shell rather than in each page, so the connection is established once and
 * survives navigation. Mounting it per page would reconnect on every route change,
 * which means a ticket per navigation and a stream that is briefly down each time.
 */
export function useConnectLiveUpdates(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;

    void liveUpdates.connect();
  }, [enabled]);
}

/**
 * Connection state, plus a stable way to report changes to the user.
 *
 * The app shows one quiet indicator rather than a toast for every event: a
 * dashboard open all day would otherwise announce every colleague's edit, and the
 * volume is exactly what makes a notification system get switched off.
 */
export function useLiveIndicator(): {
  status: LiveStatus;
  latest: LiveEvent | null;
  clear: () => void;
} {
  const [status, setStatus] = useState<LiveStatus>("offline");
  const [latest, setLatest] = useState<LiveEvent | null>(null);

  useEffect(() => liveUpdates.onStatus(setStatus), []);

  const clear = useCallback(() => setLatest(null), []);

  return { status, latest, clear };
}