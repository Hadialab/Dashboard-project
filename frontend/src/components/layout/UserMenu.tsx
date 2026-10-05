import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, Settings, User as UserIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";

import useAuthStore from "../../store/authStore";

function UserMenu() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    // Click-away rather than a blur handler: the button keeps focus after
    // toggling, so blur would close the menu the instant it opened.
    const listener = (event: MouseEvent) => {
      // `contains` rather than `===`, so a click on the trigger itself — which is
      // inside the ref — does not count as outside and fight the toggle.
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    window.addEventListener("click", listener);
    return () => window.removeEventListener("click", listener);
  }, []);

  function handleLogout() {
    // Tokens are stateless, so clearing it client-side is enough to end the
    // session. Revoking it server-side would need a token blacklist.
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm font-medium text-slate-900 transition hover:border-blue-300 hover:bg-slate-50 sm:gap-3 sm:px-3 sm:py-2 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:hover:border-blue-500 dark:hover:bg-slate-900"
      >
        {/* Decorative: the name and role beside it carry the meaning, and the
            initial would be read aloud as a stray letter. */}
        <div
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white"
        >
          {user?.name?.[0] ?? "U"}
        </div>

        <div className="hidden text-left md:block">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            {user?.name ?? "Admin"}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {user?.role === "admin" ? "Administrator" : "Sales"}
          </p>
        </div>

        <ChevronDown size={18} className="hidden md:block" aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          className="fixed inset-x-3 top-16 z-10 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-3 sm:w-56 dark:border-slate-800 dark:bg-slate-950"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              navigate("/profile");
              setOpen(false);
            }}
            className="flex min-h-11 w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            <UserIcon size={16} className="shrink-0" aria-hidden="true" />
            Profile
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              navigate("/settings");
              setOpen(false);
            }}
            className="flex min-h-11 w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            <Settings size={16} className="shrink-0" aria-hidden="true" />
            Settings
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            className="flex min-h-11 w-full items-center gap-3 border-t border-slate-200 px-4 py-3 text-left text-sm text-rose-600 transition hover:bg-slate-100 dark:border-slate-800 dark:text-rose-400 dark:hover:bg-slate-900"
          >
            <LogOut size={16} className="shrink-0" aria-hidden="true" />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

export default UserMenu;