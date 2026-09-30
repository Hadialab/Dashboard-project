import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { Notification, NotificationType } from "../types";

const KEY = "notifications";
const MAX = 50;

/** What a caller passes to add one. Everything but the key is defaulted. */
export type NotificationInput = {
  /**
   * Identity for deduplication, not a database id. The same event must never
   * appear twice, however many times it is re-derived.
   */
  key: string;
  title: string;
  body: string;
  type?: NotificationType;
  link?: string | null;
};

type NotificationState = {
  notifications: Notification[];

  /**
   * Adds a notification, or refreshes the existing one with the same key.
   *
   * Refreshing rather than ignoring is deliberate for the derived "due"
   * notifications: if a deal's close date moves, the reminder should move with
   * it instead of the old one lingering.
   */
  notify: (input: NotificationInput) => void;

  markRead: (key: string) => void;
  markAllRead: () => void;
  remove: (key: string) => void;
  clear: () => void;
};

/**
 * Notifications generated from real events in the CRM.
 *
 * Replaces the three hardcoded entries the navbar used to show, which described
 * things that never happened — "New user signed up", "Server load stabilized".
 *
 * Two kinds end up here:
 *   event — pushed by a page when something happens (a lead created, a deal
 *           marked Won). Always carries a `key`.
 *   due   — derived on load from a deal closing soon. Deduplicated by `key`,
 *           which is the part that matters: without it, re-checking on every
 *           render or every tab focus would pile up the same reminder.
 */
const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      notifications: [],

      notify({ key, title, body, type = "event", link = null }) {
        set((state) => {
          const without = state.notifications.filter((n) => n.key !== key);
          const existing = state.notifications.find((n) => n.key === key);

          const entry: Notification = {
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
          notifications: state.notifications.map((n) => (n.key === key ? { ...n, read: true } : n)),
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
export const selectUnreadCount = (state: NotificationState): number =>
  state.notifications.filter((n) => !n.read).length;

export default useNotificationStore;
