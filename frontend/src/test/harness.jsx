import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { vi } from "vitest";

import useAuthStore from "../store/authStore";
import useNotificationStore from "../store/notificationStore";
import useRecentlyViewedStore from "../store/recentlyViewedStore";

/**
 * Renders a page the way the app does: inside a router, with toasts mounted so
 * success and error messages can be asserted on, and with the session stores
 * seeded.
 *
 * The three stores are reset first because two of them persist to localStorage.
 * A notification left over from a previous test would make an unread-badge
 * assertion pass or fail for the wrong reason.
 */

export const ADMIN = {
  id: "u1",
  name: "QA Admin",
  email: "qaadmin@test.local",
  role: "admin",
  // Reported as unrestricted, which is what the server sends for an admin.
  permissions: {
    customers: { view: true, create: true, edit: true, delete: true },
    leads: { view: "all", create: true, edit: true, delete: true },
    deals: { view: "all", create: true, edit: true, delete: true },
    reports: { view: true },
  },
};

/** A Sales user who may read customers and leads but not delete anything. */
export const RESTRICTED_REP = {
  id: "u2",
  name: "Rep One",
  email: "repone@test.local",
  role: "rep",
  permissions: {
    customers: { view: true, create: false, edit: false, delete: false },
    leads: { view: "own", create: true, edit: false, delete: false },
    deals: { view: false, create: false, edit: false, delete: false },
    reports: { view: false },
  },
};

export function seedSession(user = ADMIN) {
  useAuthStore.setState({ isLoggedIn: true, user, isChecking: false });
}

export function resetStores() {
  localStorage.clear();
  useAuthStore.setState({ isLoggedIn: false, user: null, isChecking: true });
  useNotificationStore.setState({ notifications: [] });
  useRecentlyViewedStore.setState({ items: [] });
}

/** Renders `ui` inside the providers every page in this app expects. */
export function renderWithProviders(ui, { route = "/", user = ADMIN } = {}) {
  seedSession(user);

  const result = render(
    <MemoryRouter initialEntries={[route]}>
      {ui}
      <Toaster />
    </MemoryRouter>,
  );

  return result;
}

/** Suppresses toast rendering noise while still letting assertions read it. */
export function silenceToasts() {
  return vi.spyOn(console, "error").mockImplementation(() => {});
}
