import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, Menu, Search } from "lucide-react";
import ThemeToggle from "../ui/ThemeToggle";
import UserMenu from "./UserMenu";

const suggestions = [
  "Revenue report",
  "Customer activity",
  "New users",
  "Settings overview",
  "Billing history",
];

const notifications = [
  {
    title: "New user signed up",
    subtitle: "A team member just created an account.",
    time: "2m ago",
  },
  {
    title: "Subscription renewed",
    subtitle: "Monthly Plan renewed successfully.",
    time: "20m ago",
  },
  {
    title: "Server load stabilized",
    subtitle: "CPU usage dropped below 70%.",
    time: "1h ago",
  },
];

function Navbar({ onToggleSidebar }) {
  const [query, setQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const searchRef = useRef(null);
  const notificationRef = useRef(null);

  const filteredSuggestions = useMemo(() => {
    if (!query.trim()) return suggestions;
    return suggestions.filter((item) =>
      item.toLowerCase().includes(query.toLowerCase())
    );
  }, [query]);

  useEffect(() => {
    const listener = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false);
      }
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setShowNotifications(false);
      }
    };

    window.addEventListener("click", listener);
    return () => window.removeEventListener("click", listener);
  }, []);

  return (
    <header className="sticky top-0 z-30 w-full flex-shrink-0 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 shadow-sm transition dark:border-slate-800 dark:bg-slate-950 md:px-6">
      <button
        type="button"
        onClick={onToggleSidebar}
        className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:border-blue-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-blue-500 dark:hover:bg-slate-900 md:hidden"
        aria-label="Toggle navigation"
      >
        <Menu size={20} />
      </button>

      <div className="relative w-full max-w-xl" ref={searchRef}>
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setShowResults(true);
          }}
          onFocus={() => setShowResults(true)}
          type="text"
          placeholder="Search the dashboard"
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-blue-500 dark:focus:ring-blue-900"
        />

        {showResults && filteredSuggestions.length > 0 && (
          <div className="absolute left-0 top-full mt-3 w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg ring-1 ring-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:ring-slate-800">
            <div className="space-y-1 p-3">
              {filteredSuggestions.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    setQuery(item);
                    setShowResults(false);
                  }}
                  className="w-full rounded-2xl px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="ml-auto flex items-center gap-3">
        <div className="relative" ref={notificationRef}>
          <button
            type="button"
            onClick={() => setShowNotifications((prev) => !prev)}
            className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:border-blue-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-blue-500 dark:hover:bg-slate-900"
            aria-label="Open notifications"
          >
            <Bell size={20} />
            <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-blue-500 ring-2 ring-white dark:ring-slate-950" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-3 w-80 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg ring-1 ring-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:ring-slate-800">
              <div className="border-b border-slate-200 px-4 py-4 text-sm font-semibold text-slate-900 dark:border-slate-800 dark:text-slate-100">
                Notifications
              </div>
              <div className="space-y-2 p-4">
                {notifications.map((notification) => (
                  <div key={notification.title} className="rounded-3xl px-4 py-3 transition hover:bg-slate-100 dark:hover:bg-slate-900">
                    <p className="font-medium text-slate-900 dark:text-white">{notification.title}</p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{notification.subtitle}</p>
                    <span className="mt-2 inline-block text-xs text-slate-400 dark:text-slate-500">{notification.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}

export default Navbar;
