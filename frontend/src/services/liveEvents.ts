import api from "../api/axios";

// The live-update stream.
//
// Server-Sent Events, connected with a short-lived ticket rather than the session
// token. `EventSource` cannot set an `Authorization` header, so the alternatives
// were the session token in a query string — where it lands in proxy logs and
// browser history and cannot be revoked — or a cookie the app does not use. The
// ticket is the smallest thing that avoids both.
//
// What this module owns, and why it is not just a bare `new EventSource(...)`:
//
//   - the ticket, which expires, so it is fetched again for every connection
//   - reconnection, across the server restarting and the network dropping
//   - the fact that a client which reconnects may have missed events, so a gap has
//     to result in a refetch rather than being silently absorbed

export type LiveEvent = {
  /** Monotonic per process. Present so reconnects can be reasoned about. */
  eventId: number;
  organizationId: number;
  entityType: "customer" | "lead" | "deal" | "user";
  entityId: string;
  action: "create" | "update" | "delete" | "convert" | "permission_change" | "password_change";
  /** A display name only, so a toast can say who without fetching anything. */
  actorName: string | null;
};

/** Connection state, for the indicator in the header. */
export type LiveStatus = "connecting" | "live" | "reconnecting" | "offline";

type Handler = (event: LiveEvent) => void;
type StatusHandler = (status: LiveStatus) => void;

// Browser backoff. Starts at 1s and doubles to a 30s ceiling.
//
// The doubling matters: when the API restarts, every open tab reconnects at once.
// Reconnecting in lockstep turns a brief outage into a thundering herd, and the
// ceiling stops a client that has been failing for hours from hammering the
// server once a minute forever.
const RECONNECT_MIN_MS = 1_000;
const RECONNECT_MAX_MS = 30_000;

export class LiveUpdates {
  private source: EventSource | null = null;
  private handlers = new Set<Handler>();
  private statusHandlers = new Set<StatusHandler>();
  private attempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  /** True only for the duration of a close, to stop an in-flight reconnect. */
  private closing = false;
  private status: LiveStatus = "offline";

  /** Subscribe to changes. Returns the unsubscribe function. */
  on(handler: Handler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  /** Subscribe to connection state. Returns the unsubscribe function. */
  onStatus(handler: StatusHandler): () => void {
    this.statusHandlers.add(handler);
    handler(this.status);
    return () => this.statusHandlers.delete(handler);
  }

  /**
   * Opens the stream. Safe to call once; repeat calls are ignored.
   *
   * Not called from a React effect directly — see useLiveUpdates, which owns the
   * lifecycle. This is the transport and knows nothing about React.
   */
  async connect(): Promise<void> {
    if (this.source || this.closing) return;

    this.setStatus("connecting");

    let ticket: string;
    try {
      // Fetched per connection rather than cached, because it is single-use by
      // design and short-lived. Reusing one across reconnects would fail on the
      // second attempt.
      const response = await api.post<{ ticket: string }>("/events/ticket");
      ticket = response.data.ticket;
    } catch {
      // The session is gone or the API is down. Either way there is nothing to
      // stream, and the regular request layer will report the real problem.
      this.setStatus("offline");
      this.scheduleReconnect();
      return;
    }

    const url = `${api.defaults.baseURL}/events?ticket=${encodeURIComponent(ticket)}`;
    const source = new EventSource(url);
    this.source = source;

    source.onopen = () => {
      this.attempt = 0;
      this.setStatus("live");
    };

    source.onmessage = (message) => {
      let event: LiveEvent;
      try {
        event = JSON.parse(message.data) as LiveEvent;
      } catch {
        return;
      }

      for (const handler of this.handlers) {
        try {
          handler(event);
        } catch {
          // One bad subscriber must not stop the others, and must not tear down the
          // stream.
        }
      }
    };

    source.onerror = () => {
      source.close();
      this.source = null;
      this.scheduleReconnect();
    };
  }

  /**
   * Closes the stream.
   *
   * The pending reconnect is cleared as well as the socket. Without that, a timer
   * set a moment before logout would open a fresh stream afterwards — which is
   * precisely how a signed-out tab ends up still receiving a colleague's activity.
   *
   * Deliberately reversible: signing back in has to be able to connect again, and
   * the app holds one instance for its lifetime rather than rebuilding the module.
   */
  close(): void {
    this.closing = true;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.source?.close();
    this.source = null;
    this.closing = false;
    this.setStatus("offline");
  }

  private scheduleReconnect(): void {
    // The guard matters beyond tidiness: `connect` is async, so a reconnect can be
    // queued while a close is in flight, and without this it would reopen a stream
    // the caller has already asked to stop.
    if (this.closing || this.reconnectTimer) return;

    const delay = Math.min(RECONNECT_MIN_MS * 2 ** this.attempt, RECONNECT_MAX_MS);
    this.attempt += 1;
    this.setStatus("reconnecting");

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connect();
    }, delay);
  }

  private setStatus(status: LiveStatus): void {
    this.status = status;
    for (const handler of this.statusHandlers) handler(status);
  }
}

/** One instance for the app. Created here so a module reload cannot leave two. */
export const liveUpdates = new LiveUpdates();