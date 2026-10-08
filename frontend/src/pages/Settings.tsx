import useThemeStore from "../store/themeStore";
import PageHeader from "../components/ui/PageHeader";
import Card from "../components/ui/Card";
import { SunMedium, Moon } from "lucide-react";
import type { Theme } from "../store/themeStore";
import type { ButtonIcon } from "../components/ui/Button";

const options: { value: Theme; label: string; icon: ButtonIcon }[] = [
  { value: "light", label: "Light", icon: SunMedium },
  { value: "dark", label: "Dark", icon: Moon },
];

// Appearance is the one setting that actually works today: the theme store
// persists to localStorage, so the choice survives a refresh.
function Settings() {
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Workspace preferences and configuration."
      />

      <Card className="p-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Appearance
        </h2>

        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Choose how the dashboard looks. Saved on this device.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {options.map(({ value, label, icon: Icon }) => {
            const isActive = theme === value;

            return (
              <button
                key={value}
                type="button"
                onClick={() => setTheme(value)}
                aria-pressed={isActive}
                className={`flex min-h-11 items-center gap-3 rounded-lg border p-4 text-left transition ${
                  isActive
                    ? "border-blue-500 bg-blue-50 dark:border-blue-500 dark:bg-blue-950"
                    : "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
                }`}
              >
                <Icon size={18} className="shrink-0 text-slate-600 dark:text-slate-300" />

                <span className="text-sm font-medium text-slate-900 dark:text-white">
                  {label}
                </span>

                {isActive && (
                  <span className="ml-auto text-xs font-medium text-blue-600 dark:text-blue-400">
                    Active
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

export default Settings;
