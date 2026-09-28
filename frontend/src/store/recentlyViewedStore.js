import { create } from "zustand";
import { persist } from "zustand/middleware";

const KEY = "recently-viewed";
const MAX = 5;

/**
 * The last few records the user opened.
 *
 * Persisted so the palette can offer them from anywhere in the app, which is the
 * point: a list you cannot reach without first navigating to the page that
 * contains it is not much of a shortcut.
 *
 * Stores only what the palette needs to render a result and jump to it — id,
 * type, a label and the route. Not the whole record, because a stale copy of a
 * customer sitting in localStorage for weeks is a liability rather than a
 * feature, and the target page re-reads the real data anyway.
 */
const useRecentlyViewedStore = create(
  persist(
    (set) => ({
      items: [],

      record(entry) {
        set((state) => {
          // Re-opening a record moves it to the top rather than adding a
          // duplicate, so the list stays five distinct things.
          const without = state.items.filter((item) => item.id !== entry.id);
          return { items: [entry, ...without].slice(0, MAX) };
        });
      },

      clear() {
        set({ items: [] });
      },
    }),
    {
      name: KEY,
      // Anything unexpected in localStorage is ignored rather than allowed to
      // break the palette on startup.
      partialize: (state) => ({ items: state.items }),
    },
  ),
);

export default useRecentlyViewedStore;
