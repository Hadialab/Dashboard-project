import { describe, it, expect, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";

import useNotificationStore, { selectUnreadCount } from "../store/notificationStore";
import useRecentlyViewedStore from "../store/recentlyViewedStore";
import { usePermissions } from "../hooks/usePermissions";
import { useRowSelection } from "../hooks/useRowSelection";
import useAuthStore from "../store/authStore";

/**
 * Both stores persist, which means they read from localStorage at import time.
 * Each test starts from a clean store rather than trusting whatever the previous
 * one left behind, since a leaked notification would silently break a count.
 */
beforeEach(() => {
  localStorage.clear();
  act(() => {
    useNotificationStore.setState({ notifications: [] });
    useRecentlyViewedStore.setState({ items: [] });
  });
});

describe("notificationStore", () => {
  const notify = (over = {}) =>
    act(() => {
      useNotificationStore.getState().notify({
        key: "lead-new:l031",
        title: "New lead captured",
        body: "Marwan Y",
        ...over,
      });
    });

  const all = () => useNotificationStore.getState().notifications;

  it("adds a notification", () => {
    notify();

    expect(all()).toHaveLength(1);
    expect(all()[0].title).toBe("New lead captured");
  });

  it("deduplicates by key instead of stacking on every render", () => {
    // This is the whole point of the key. Re-deriving on every render or tab
    // focus would otherwise pile up the same reminder.
    notify();
    notify();
    notify();

    expect(all()).toHaveLength(1);
  });

  it("refreshes the existing entry rather than ignoring the new one", () => {
    notify({ body: "closes 2026-10-03" });
    notify({ body: "closes 2026-10-05" });

    expect(all()).toHaveLength(1);
    // A deal whose close date moved should have its reminder move with it.
    expect(all()[0].body).toBe("closes 2026-10-05");
  });

  it("keeps a notification read when it is re-derived", () => {
    notify();
    act(() => useNotificationStore.getState().markRead("lead-new:l031"));
    notify();

    // The user has dealt with it; re-deriving must not mark it unread again.
    expect(all()[0].read).toBe(true);
  });

  it("puts the newest first", () => {
    notify({ key: "a", title: "First" });
    notify({ key: "b", title: "Second" });

    expect(all().map((n) => n.title)).toEqual(["Second", "First"]);
  });

  it("caps the list so it cannot grow without bound", () => {
    for (let i = 0; i < 60; i += 1) notify({ key: `k${i}` });

    expect(all()).toHaveLength(50);
    // The most recent survives the trim.
    expect(all()[0].key).toBe("k59");
  });

  it("marks one read without touching the others", () => {
    notify({ key: "a" });
    notify({ key: "b" });
    act(() => useNotificationStore.getState().markRead("a"));

    expect(all().find((n) => n.key === "a").read).toBe(true);
    expect(all().find((n) => n.key === "b").read).toBe(false);
  });

  it("ignores markRead for a key it does not hold", () => {
    notify({ key: "a" });
    act(() => useNotificationStore.getState().markRead("nope"));

    expect(all()[0].read).toBe(false);
  });

  it("marks everything read", () => {
    notify({ key: "a" });
    notify({ key: "b" });
    act(() => useNotificationStore.getState().markAllRead());

    expect(all().every((n) => n.read)).toBe(true);
  });

  it("removes one", () => {
    notify({ key: "a" });
    notify({ key: "b" });
    act(() => useNotificationStore.getState().remove("a"));

    expect(all().map((n) => n.key)).toEqual(["b"]);
  });

  it("clears everything", () => {
    notify({ key: "a" });
    notify({ key: "b" });
    act(() => useNotificationStore.getState().clear());

    expect(all()).toHaveLength(0);
  });

  it("counts only unread for the badge", () => {
    notify({ key: "a" });
    notify({ key: "b" });
    notify({ key: "c" });
    act(() => useNotificationStore.getState().markRead("a"));

    expect(selectUnreadCount(useNotificationStore.getState())).toBe(2);
  });

  it("reports zero unread for an empty list", () => {
    expect(selectUnreadCount(useNotificationStore.getState())).toBe(0);
  });

  it("defaults type to event and link to null", () => {
    notify();

    expect(all()[0].type).toBe("event");
    expect(all()[0].link).toBeNull();
  });

  it("stamps a createdAt", () => {
    notify();

    expect(Number.isNaN(Date.parse(all()[0].createdAt))).toBe(false);
  });
});

describe("recentlyViewedStore", () => {
  const record = (entry) => act(() => useRecentlyViewedStore.getState().record(entry));
  const items = () => useRecentlyViewedStore.getState().items;

  it("records a view", () => {
    record({ id: "d039", type: "deal", label: "Vertex Fleet", route: "/deals?open=d039" });

    expect(items()).toHaveLength(1);
    expect(items()[0].label).toBe("Vertex Fleet");
  });

  it("moves a re-opened record to the top instead of duplicating it", () => {
    record({ id: "a", type: "deal", label: "A" });
    record({ id: "b", type: "deal", label: "B" });
    record({ id: "a", type: "deal", label: "A" });

    expect(items().map((i) => i.id)).toEqual(["a", "b"]);
  });

  it("keeps at most five distinct records", () => {
    for (const id of ["a", "b", "c", "d", "e", "f"]) record({ id, type: "deal", label: id });

    expect(items()).toHaveLength(5);
    expect(items().map((i) => i.id)).toEqual(["f", "e", "d", "c", "b"]);
  });

  it("clears", () => {
    record({ id: "a", type: "deal", label: "A" });
    act(() => useRecentlyViewedStore.getState().clear());

    expect(items()).toHaveLength(0);
  });
});

describe("usePermissions", () => {
  const asUser = (user) => act(() => useAuthStore.setState({ user }));

  afterEach(() => asUser(null));

  it("lets an admin do everything regardless of stored permissions", () => {
    asUser({ role: "admin", permissions: { customers: { delete: false } } });

    const { result } = renderHook(() => usePermissions());

    expect(result.current.can("customers", "delete")).toBe(true);
    expect(result.current.can("deals", "view")).toBe(true);
    expect(result.current.isAdmin).toBe(true);
  });

  it("grants a rep an action their permissions allow", () => {
    asUser({ role: "rep", permissions: { leads: { view: "all", create: true, edit: true, delete: false } } });

    const { result } = renderHook(() => usePermissions());

    expect(result.current.can("leads", "create")).toBe(true);
    expect(result.current.can("leads", "edit")).toBe(true);
  });

  it("denies an action their permissions withhold", () => {
    asUser({ role: "rep", permissions: { leads: { view: "all", delete: false } } });

    const { result } = renderHook(() => usePermissions());

    expect(result.current.can("leads", "delete")).toBe(false);
  });

  it("treats own and all as a view grant", () => {
    asUser({ role: "rep", permissions: { deals: { view: "own" } } });

    const { result } = renderHook(() => usePermissions());

    expect(result.current.can("deals", "view")).toBe(true);
    expect(result.current.canViewSection("deals")).toBe(true);
  });

  it("denies a resource with no permission entry at all", () => {
    asUser({ role: "rep", permissions: { leads: { view: "own" } } });

    const { result } = renderHook(() => usePermissions());

    expect(result.current.can("deals", "view")).toBe(false);
    expect(result.current.canViewSection("reports")).toBe(false);
  });

  it("denies everything when signed out", () => {
    asUser(null);

    const { result } = renderHook(() => usePermissions());

    expect(result.current.can("customers", "view")).toBe(false);
    expect(result.current.isAdmin).toBe(false);
  });
});

describe("useRowSelection", () => {
  const rows = [{ id: "c1" }, { id: "c2" }, { id: "c3" }];

  it("toggles a single row", () => {
    const { result } = renderHook(() => useRowSelection());

    act(() => result.current.toggle("c1"));
    expect(result.current.selected).toEqual(["c1"]);

    act(() => result.current.toggle("c1"));
    expect(result.current.selected).toEqual([]);
  });

  it("selects every visible row and deselects on a second call", () => {
    const { result } = renderHook(() => useRowSelection());

    act(() => result.current.toggleAll(rows));
    expect(result.current.count).toBe(3);

    act(() => result.current.toggleAll(rows));
    expect(result.current.count).toBe(0);
  });

  it("drops selections for rows that are no longer visible", () => {
    // A bulk delete must never act on a record the user cannot see.
    const { result } = renderHook(() => useRowSelection());

    act(() => result.current.toggleAll(rows));
    act(() => result.current.sync([{ id: "c1" }, { id: "c2" }]));

    expect(result.current.selected).toEqual(["c1", "c2"]);
  });

  it("clears the selection", () => {
    const { result } = renderHook(() => useRowSelection());

    act(() => result.current.toggleAll(rows));
    act(() => result.current.clear());

    expect(result.current.selected).toEqual([]);
    expect(result.current.count).toBe(0);
  });

  it("reports whether every visible row is selected", () => {
    const { result } = renderHook(() => useRowSelection());

    act(() => result.current.toggleAll(rows));
    expect(result.current.allVisibleSelected(rows)).toBe(true);

    act(() => result.current.toggle("c2"));
    expect(result.current.allVisibleSelected(rows)).toBe(false);
  });

  it("treats an empty page as not-all-selected", () => {
    // "Select all" on a page with no rows must not read as "everything is
    // ticked", and must not offer to act on nothing.
    const { result } = renderHook(() => useRowSelection());

    expect(result.current.allVisibleSelected([])).toBe(false);
  });

  it("reports a partial selection, which is what makes the header box indeterminate", () => {
    const { result } = renderHook(() => useRowSelection());

    expect(result.current.someVisibleSelected(rows)).toBe(false);

    act(() => result.current.toggle("c2"));
    expect(result.current.someVisibleSelected(rows)).toBe(true);

    // All selected is not "some": the header should read as fully ticked.
    act(() => result.current.toggleAll(rows));
    expect(result.current.someVisibleSelected(rows)).toBe(false);
  });

  it("reports whether one row is selected", () => {
    const { result } = renderHook(() => useRowSelection());

    act(() => result.current.toggle("c1"));

    expect(result.current.isSelected("c1")).toBe(true);
    expect(result.current.isSelected("c2")).toBe(false);
  });

  it("is a no-op on sync when nothing is selected", () => {
    const { result } = renderHook(() => useRowSelection());

    act(() => result.current.sync(rows));

    expect(result.current.selected).toEqual([]);
  });
});
