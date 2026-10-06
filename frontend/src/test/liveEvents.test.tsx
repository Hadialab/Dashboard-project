import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";

// Mocked at the top rather than per-test with doMock: the stream is constructed
// once per test with `new`, so a single module-level mock is both simpler and less
// order-dependent than swapping implementations between dynamic imports.
const post = vi.fn();
vi.mock("../api/axios", () => ({
  default: { post: (...args: unknown[]) => post(...args), defaults: { baseURL: "http://api.test" } },
}));

import { LiveUpdates, liveUpdates } from "../services/liveEvents";
import { useLiveUpdates } from "../hooks/useLiveUpdates";
import type { LiveEvent } from "../services/liveEvents";

/** Collects what the refetch callbacks were called with. */
const received: string[] = [];

// The stream is the only thing in the app with a connection that outlives a
// request, so what matters here is lifecycle: that it closes, that it does not
// reconnect after being closed, and that one bad subscriber cannot take down the
// stream for everyone else.

/** A controllable EventSource, since jsdom has none. */
class FakeEventSource {
  static instances: FakeEventSource[] = [];
  static last(): FakeEventSource {
    return FakeEventSource.instances[FakeEventSource.instances.length - 1];
  }

  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  closed = false;
  url: string;

  constructor(url: string) {
    this.url = url;
    FakeEventSource.instances.push(this);
  }

  close() {
    this.closed = true;
  }

  emit(over: Partial<LiveEvent> = {}) {
    this.onmessage?.({
      data: JSON.stringify({
        eventId: 1,
        organizationId: 1,
        entityType: "customer",
        entityId: "c001",
        action: "update",
        actorName: "Nadia",
        ...over,
      }),
    });
  }

  open() {
    this.onopen?.();
  }
}

const TICKET = "a".repeat(64);

/** Opens a stream with the ticket request stubbed to succeed. */
async function connect() {
  post.mockResolvedValue({ data: { ticket: TICKET } });
  const live = new LiveUpdates();
  await live.connect();
  return live;
}

beforeEach(() => {
  FakeEventSource.instances = [];
  received.length = 0;
  post.mockReset();
  vi.stubGlobal("EventSource", FakeEventSource);
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("LiveUpdates", () => {
  it("asks for a ticket rather than putting the session token in the URL", async () => {
    // The reason the ticket exists at all: EventSource cannot set a header, and a
    // session token in a query string lands in proxy logs and browser history where
    // it cannot be revoked.
    await connect();

    expect(post).toHaveBeenCalledWith("/events/ticket");
    expect(FakeEventSource.last().url).toBe(`http://api.test/events?ticket=${TICKET}`);
    expect(FakeEventSource.last().url).not.toContain("Bearer");
  });

  it("refuses to open without a ticket, and retries rather than giving up", async () => {
    // Live updates enhance a refetch rather than providing it, so a failed ticket
    // must not be fatal â€” but it must not hammer either.
    post.mockRejectedValue(new Error("401"));

    const live = new LiveUpdates();
    await live.connect();

    expect(FakeEventSource.instances).toHaveLength(0);

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(post).toHaveBeenCalledTimes(2);
  });

  it("backs off rather than reconnecting instantly", async () => {
    // After a restart every open tab reconnects at once; reconnecting in lockstep
    // turns a brief outage into a thundering herd.
    await connect();
    FakeEventSource.last().onerror?.();

    await act(async () => {
      vi.advanceTimersByTime(999);
    });
    expect(post).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    expect(post).toHaveBeenCalledTimes(2);
  });

  it("does not reconnect after being closed", async () => {
    // The logout path. A reconnect queued a moment before close would open a fresh
    // stream afterwards, which is how a signed-out tab keeps receiving a
    // colleague's activity.
    const live = await connect();
    FakeEventSource.last().onerror?.();

    live.close();

    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });
    expect(post).toHaveBeenCalledTimes(1);
  });

  it("closes the socket it was holding", async () => {
    const live = await connect();
    const source = FakeEventSource.last();

    live.close();

    expect(source.closed).toBe(true);
  });

  it("can be reopened after a close, because signing back in has to work", async () => {
    const live = await connect();

    live.close();
    await live.connect();

    expect(post).toHaveBeenCalledTimes(2);
  });

  it("fetches a fresh ticket per connection", async () => {
    // Tickets are short-lived, so caching one across reconnects would fail on the
    // second attempt and leave the client retrying forever.
    await connect();
    FakeEventSource.last().onerror?.();

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(post).toHaveBeenCalledTimes(2);
  });

  it("delivers events to every subscriber", async () => {
    const live = await connect();
    const first = vi.fn();
    const second = vi.fn();
    live.on(first);
    live.on(second);

    FakeEventSource.last().emit();

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("keeps delivering after one subscriber throws", async () => {
    // One page with a broken handler must not take down the stream for the rest of
    // the app â€” that looks like the whole feature failing.
    const live = await connect();
    const broken = vi.fn(() => {
      throw new Error("bad handler");
    });
    const healthy = vi.fn();
    live.on(broken);
    live.on(healthy);

    FakeEventSource.last().emit();

    expect(broken).toHaveBeenCalled();
    expect(healthy).toHaveBeenCalledTimes(1);
  });

  it("ignores an unparseable payload instead of throwing at the socket", async () => {
    const live = await connect();
    const handler = vi.fn();
    live.on(handler);

    FakeEventSource.last().onmessage?.({ data: "not json" });
    expect(handler).not.toHaveBeenCalled();

    // And the next good one still arrives.
    FakeEventSource.last().emit();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("stops delivering after a subscriber unsubscribes", async () => {
    const live = await connect();
    const handler = vi.fn();
    const off = live.on(handler);

    off();
    FakeEventSource.last().emit();

    expect(handler).not.toHaveBeenCalled();
  });

  it("reports status transitions to a late subscriber", async () => {
    // A component that mounts after the connection is already up must be told it
    // is up, or it renders "offline" while the stream is working.
    const live = await connect();
    FakeEventSource.last().open();

    const seen: string[] = [];
    live.onStatus((status) => seen.push(status));

    expect(seen).toEqual(["live"]);
  });
});

describe("useLiveUpdates", () => {
  // These spy on the real singleton rather than a test double. That means no
  // test-only seam is added to the production module, and the filtering below is
  // the code that actually runs.
  type Listener = (event: LiveEvent) => void;

  function captureListener(): { listener: Listener; on: ReturnType<typeof vi.spyOn> } {
    let listener: Listener = () => {};
    const on = vi
      .spyOn(liveUpdates, "on")
      .mockImplementation((handler: Listener) => {
        listener = handler;
        return () => {};
      });

    return { get listener() { return listener; }, on };
  }

  const delivered = (over: Partial<LiveEvent> = {}) => ({
    eventId: 1,
    organizationId: 1,
    entityType: "customer",
    entityId: "c001",
    action: "update",
    actorName: "Nadia",
    ...over,
  });

  it("refetches only for the entity types it watches", () => {
    // A customer list must not refetch because a deal moved.
    const handler = vi.fn();
    const captured = captureListener();
    renderHook(() => useLiveUpdates(handler, ["customer"]));

    act(() => captured.listener(delivered({ entityType: "deal" })));
    expect(handler).not.toHaveBeenCalled();

    act(() => captured.listener(delivered({ entityType: "customer" })));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("handles every event when nothing is watched", () => {
    // The audit log watches nothing: it wants to know about all of it.
    const handler = vi.fn();
    const captured = captureListener();
    renderHook(() => useLiveUpdates(handler));

    act(() => captured.listener(delivered({ entityType: "deal" })));
    act(() => captured.listener(delivered({ entityType: "user" })));

    expect(handler).toHaveBeenCalledTimes(2);
  });

  it("calls the newest handler without resubscribing on every render", () => {
    // An inline arrow is a new function every render, so depending on its identity
    // would tear down and rebuild a deliberately long-lived subscription each time.
    const captured = captureListener();

    const { rerender } = renderHook(({ tag }: { tag: string }) => {
      useLiveUpdates(() => received.push(tag), ["customer"]);
      return null;
    }, { initialProps: { tag: "first" } });

    const subscriptionsAfterMount = captured.on.mock.calls.length;
    rerender({ tag: "second" });
    rerender({ tag: "third" });

    expect(captured.on.mock.calls.length).toBe(subscriptionsAfterMount);

    // The refetch that happens is the *latest* callback, not the one captured at
    // mount â€” which is the whole reason the handler lives in a ref.
    act(() => captured.listener(delivered()));
    expect(received).toEqual(["third"]);
  });

  it("unsubscribes on unmount", () => {
    const captured = captureListener();
    const { unmount } = renderHook(() => useLiveUpdates(() => {}, ["customer"]));

    unmount();

    const unsubscribe = captured.on.mock.results[0]?.value as (() => void) | undefined;
    expect(unsubscribe).toBeTypeOf("function");
  });

  it("does not resubscribe when the watched list changes value but not content", () => {
    // `watch` is joined to a string for exactly this reason: an array literal is a
    // new value every render.
    const captured = captureListener();
    const { rerender } = renderHook(() => useLiveUpdates(() => {}, ["customer", "lead"]));

    const afterMount = captured.on.mock.calls.length;
    rerender();
    rerender();

    expect(captured.on.mock.calls.length).toBe(afterMount);
  });
});
