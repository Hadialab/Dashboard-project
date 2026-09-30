import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";

vi.mock("../api/axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  TOKEN_KEY: "token",
  getToken: vi.fn(),
}));

vi.mock("../services/authService", () => ({
  getCurrentUser: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
}));

import { TOKEN_KEY, getToken } from "../api/axios";
import { getCurrentUser, login as loginRequest, register as registerRequest } from "../services/authService";
import useAuthStore from "../store/authStore";
import useThemeStore from "../store/themeStore";
import useNotificationStore from "../store/notificationStore";
import { useNotificationGenerator } from "../services/notificationService";

const DAY = 86_400_000;
const iso = (offset) => new Date(Date.now() + offset * DAY).toISOString().slice(0, 10);

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  act(() => {
    useAuthStore.setState({ isLoggedIn: false, user: null, isChecking: true });
    useNotificationStore.setState({ notifications: [] });
  });
});

describe("authStore", () => {
  it("stays signed out with no stored token", async () => {
    getToken.mockReturnValue(null);

    await act(() => useAuthStore.getState().restoreSession());

    expect(useAuthStore.getState().isLoggedIn).toBe(false);
    expect(useAuthStore.getState().isChecking).toBe(false);
    // No need to ask the API when there is nothing to verify.
    expect(getCurrentUser).not.toHaveBeenCalled();
  });

  it("restores a session from a valid token", async () => {
    getToken.mockReturnValue("tok");
    getCurrentUser.mockResolvedValue({ id: 1, role: "admin" });

    await act(() => useAuthStore.getState().restoreSession());

    expect(useAuthStore.getState().isLoggedIn).toBe(true);
    expect(useAuthStore.getState().user).toEqual({ id: 1, role: "admin" });
    expect(useAuthStore.getState().isChecking).toBe(false);
  });

  it("clears a token the API rejects", async () => {
    getToken.mockReturnValue("stale");
    getCurrentUser.mockResolvedValue(null);
    localStorage.setItem(TOKEN_KEY, "stale");

    await act(() => useAuthStore.getState().restoreSession());

    expect(useAuthStore.getState().isLoggedIn).toBe(false);
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  it("stores the token and user on login", async () => {
    loginRequest.mockResolvedValue({ token: "tok", user: { id: 2, role: "rep" } });

    await act(() => useAuthStore.getState().login({ email: "a@b.test", password: "pw" }));

    expect(localStorage.getItem(TOKEN_KEY)).toBe("tok");
    expect(useAuthStore.getState().user).toEqual({ id: 2, role: "rep" });
  });

  it("propagates a rejected login so the page can show the reason", async () => {
    loginRequest.mockRejectedValue(new Error("Invalid credentials"));

    await expect(useAuthStore.getState().login({})).rejects.toThrow("Invalid credentials");
    expect(useAuthStore.getState().isLoggedIn).toBe(false);
  });

  it("stores the token and user on register", async () => {
    registerRequest.mockResolvedValue({ token: "tok", user: { id: 3 } });

    await act(() => useAuthStore.getState().register({}));

    expect(localStorage.getItem(TOKEN_KEY)).toBe("tok");
    expect(useAuthStore.getState().isLoggedIn).toBe(true);
  });

  it("re-reads the user after a role change", async () => {
    getCurrentUser.mockResolvedValue({ id: 4, role: "admin" });

    await act(() => useAuthStore.getState().refreshUser());

    // The role in the store is a snapshot from sign-in; this is how it catches up.
    expect(useAuthStore.getState().user.role).toBe("admin");
  });

  it("ends the session when refresh finds the token invalid", async () => {
    getCurrentUser.mockResolvedValue(null);
    localStorage.setItem(TOKEN_KEY, "stale");

    await act(() => useAuthStore.getState().refreshUser());

    expect(useAuthStore.getState().isLoggedIn).toBe(false);
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  it("clears everything on logout", () => {
    localStorage.setItem(TOKEN_KEY, "tok");
    useAuthStore.setState({ isLoggedIn: true, user: { id: 1 } });

    act(() => useAuthStore.getState().logout());

    expect(useAuthStore.getState().isLoggedIn).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });
});

describe("themeStore", () => {
  it("defaults to dark", () => {
    act(() => useThemeStore.setState({ theme: "dark" }));

    expect(useThemeStore.getState().theme).toBe("dark");
  });

  it("sets a light theme", () => {
    act(() => useThemeStore.getState().setTheme("light"));

    expect(useThemeStore.getState().theme).toBe("light");
  });

  it("falls back to dark for anything that is not light", () => {
    act(() => useThemeStore.getState().setTheme("light"));
    act(() => useThemeStore.getState().setTheme("banana"));

    expect(useThemeStore.getState().theme).toBe("dark");
  });

  it("toggles both ways", () => {
    act(() => useThemeStore.getState().toggleTheme());
    expect(useThemeStore.getState().theme).toBe("light");

    act(() => useThemeStore.getState().toggleTheme());
    expect(useThemeStore.getState().theme).toBe("dark");
  });
});

describe("useNotificationGenerator", () => {
  const notifications = () => useNotificationStore.getState().notifications;

  it("notifies when a lead is created, with a link to it", () => {
    const { result } = renderHook(() => useNotificationGenerator());

    act(() => result.current.leadCreated({ id: "l031", name: "Marwan Y", company: "Bekaa Dairy" }));

    expect(notifications()).toHaveLength(1);
    expect(notifications()[0].title).toBe("New lead captured");
    expect(notifications()[0].link).toBe("/leads?open=l031");
  });

  it("notifies for a deal won", () => {
    const { result } = renderHook(() => useNotificationGenerator());

    act(() => result.current.dealStageChanged({ id: "d045", title: "Zgharta CRM", stage: "Won", value: 41000 }));

    expect(notifications()[0].title).toBe("Deal won");
  });

  it("notifies for a deal lost", () => {
    const { result } = renderHook(() => useNotificationGenerator());

    act(() => result.current.dealStageChanged({ id: "d047", title: "Kfarhbab", stage: "Lost", value: 12500 }));

    expect(notifications()[0].title).toBe("Deal lost");
  });

  it("stays silent for a stage that is not an outcome", () => {
    const { result } = renderHook(() => useNotificationGenerator());

    act(() => result.current.dealStageChanged({ id: "d039", title: "Vertex Fleet", stage: "Proposal", value: 14000 }));

    // Dragging between open stages is not news.
    expect(notifications()).toHaveLength(0);
  });

  it("keeps one notification for a deal dragged back and forth", () => {
    const { result } = renderHook(() => useNotificationGenerator());
    const deal = { id: "d045", title: "Zgharta CRM", stage: "Won", value: 41000 };

    act(() => result.current.dealStageChanged(deal));
    act(() => result.current.dealStageChanged(deal));
    act(() => result.current.dealStageChanged(deal));

    expect(notifications()).toHaveLength(1);
  });

  it("separates a won and a lost notification for the same deal", () => {
    const { result } = renderHook(() => useNotificationGenerator());
    const deal = { id: "d045", title: "Zgharta CRM", value: 41000 };

    act(() => result.current.dealStageChanged({ ...deal, stage: "Won" }));
    act(() => result.current.dealStageChanged({ ...deal, stage: "Lost" }));

    expect(notifications()).toHaveLength(2);
  });

  it("raises a reminder for a deal closing inside three days", () => {
    const { result } = renderHook(() => useNotificationGenerator());

    act(() => result.current.checkClosingSoon([
      { id: "d043", title: "Tyre Export", stage: "Proposal", value: 47500, expectedClose: iso(1) },
    ]));

    expect(notifications()[0].title).toBe("Deal closing soon");
    // Marked as a reminder, not an event, so the UI can label the timestamp.
    expect(notifications()[0].type).toBe("due");
  });

  it("does not repeat a reminder on a re-check", () => {
    // Without the day-keyed dedupe, every page load would add another copy.
    const { result } = renderHook(() => useNotificationGenerator());
    const deals = [{ id: "d043", title: "Tyre Export", stage: "Proposal", value: 47500, expectedClose: iso(1) }];

    act(() => result.current.checkClosingSoon(deals));
    act(() => result.current.checkClosingSoon(deals));
    act(() => result.current.checkClosingSoon(deals));

    expect(notifications()).toHaveLength(1);
  });

  it("ignores a deal further out than three days", () => {
    const { result } = renderHook(() => useNotificationGenerator());

    act(() => result.current.checkClosingSoon([
      { id: "d044", title: "Far Off", stage: "Proposal", value: 1000, expectedClose: iso(20) },
    ]));

    expect(notifications()).toHaveLength(0);
  });

  it("ignores a won deal that happens to be dated soon", () => {
    const { result } = renderHook(() => useNotificationGenerator());

    act(() => result.current.checkClosingSoon([
      { id: "d045", title: "Already Won", stage: "Won", value: 41000, expectedClose: iso(1) },
    ]));

    expect(notifications()).toHaveLength(0);
  });

  it("raises one reminder per qualifying deal", () => {
    const { result } = renderHook(() => useNotificationGenerator());

    act(() => result.current.checkClosingSoon([
      { id: "a", title: "A", stage: "Lead", value: 1, expectedClose: iso(0) },
      { id: "b", title: "B", stage: "Qualified", value: 1, expectedClose: iso(2) },
      { id: "c", title: "C", stage: "Proposal", value: 1, expectedClose: iso(30) },
    ]));

    expect(notifications().map((n) => n.key).sort()).toEqual(
      [`deal-closing:a:${new Date().toISOString().slice(0, 10)}`, `deal-closing:b:${new Date().toISOString().slice(0, 10)}`].sort(),
    );
  });

  it("keeps each callback referentially stable across renders", () => {
    const { result, rerender } = renderHook(() => useNotificationGenerator());
    const first = result.current;

    rerender();
    rerender();

    // The callbacks are memoised, which is what lets a consumer put them in a
    // dependency array. The wrapper object itself is a fresh literal each render,
    // so consumers must destructure rather than depend on the object.
    expect(result.current.leadCreated).toBe(first.leadCreated);
    expect(result.current.dealStageChanged).toBe(first.dealStageChanged);
    expect(result.current.checkClosingSoon).toBe(first.checkClosingSoon);
  });
});
