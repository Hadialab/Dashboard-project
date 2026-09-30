import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "light" | "dark";

type ThemeState = {
  theme: Theme;
  /** Anything that is not "light" becomes dark, so a corrupt value is safe. */
  setTheme: (value: string) => void;
  toggleTheme: () => void;
};

const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "dark",
      setTheme: (value) =>
        set({ theme: value === "light" ? "light" : "dark" }),
      toggleTheme: () =>
        set((state) => ({
          theme: state.theme === "light" ? "dark" : "light",
        })),
    }),
    {
      name: "theme-storage",
    },
  ),
);

export default useThemeStore;
