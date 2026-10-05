import { Moon, SunMedium } from "lucide-react";

import useThemeStore from "../../store/themeStore";

/**
 * Both icons are decorative here — the button's aria-label carries the meaning,
 * and swapping them on click means neither one alone describes the state.
 */
function ThemeToggle() {
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-blue-300 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-blue-500 dark:hover:bg-slate-900 dark:hover:text-white"
      aria-label="Toggle theme"
    >
      {theme === "light" ? (
        <SunMedium size={20} aria-hidden="true" />
      ) : (
        <Moon size={20} aria-hidden="true" />
      )}
    </button>
  );
}

export default ThemeToggle;
