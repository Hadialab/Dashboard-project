import { create } from "zustand";
import { persist } from "zustand/middleware";

const KEY = "notifications";
const MAX = 50;

/**
 * Notifications generated from real events in the CRM.
 *
 * Replaces the three hardcoded entries the navbar used to show, which described
 * things that never happened — "New user signed up", "Server load stabilized".
 *
 * Two kinds end up here:
 *   event  — pushed by a page when something happens (a lead created, a deal
 *            marked Won). Always carries a `key`.
 *   due    — derived on load from a deal closing soon. Deduplicated by `key`,
 *            which is the part that matters: without it, re-checking on every
 *            render or every tab focus would pile up the same reminder.
 *
 * `key` is the identity of a notification for deduplication, not an id — the
 * same event should never appear twice, however many times it is re-derived.
 */
const useNotificationStore = create(
  persist(
    (set) => ({
      notifications: [],

      /**
       * Adds a notification, or refreshes the existing one with the same key.
       *
       * Refreshing rather than ignoring is deliberate for the derived "due"
       * notifications: if a deal's close date moves, the reminder should move
       * with it instead of the old one lingering.
       */
      notify({ key, title, body, type = "event", link = null }) {
        set((state) => {
          const without = state.notifications.filter((n) => n.key !== key);
          const existing = state.notifications.find((n) => n.key === key);

          const entry = {
            key,
            title,
            body,
            type,
            link,
            createdAt: new Date().toISOString(),
            // Re-adding something already read should not silently mark it unread
            // again — the user has dealt with it.
            read: existing?.read ?? false,
          };

          return { notifications: [entry, ...without].slice(0, MAX) };
        });
      },

      markRead(key) {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.key === key ? { ...n, read: true } : n,
          ),
        }));
      },

      markAllRead() {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        }));
      },

      remove(key) {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.key !== key),
        }));
      },

      clear() {
        set({ notifications: [] });
      },
    }),
    {
      name: KEY,
      // Notifications are not a source of truth: they are a convenience list, and
      // a corrupt entry should never stop the app booting.
      partialize: (state) => ({ notifications: state.notifications }),
    },
  ),
);

/** How many are unread, for the bell badge. */
export const selectUnreadCount = (state) =>
  state.notifications.filter((n) => !n.read).length;

export default useNotificationStore;
