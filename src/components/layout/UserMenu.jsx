import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, Settings, User as UserIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../../store/AuthStore";

function UserMenu() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    const listener = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    window.addEventListener("click", listener);
    return () => window.removeEventListener("click", listener);
  }, []);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition hover:border-blue-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:hover:border-blue-500 dark:hover:bg-slate-900"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 font-semibold text-white">
          {user?.name?.[0] ?? "U"}
        </div>

        <div className="hidden text-left md:block">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            {user?.name ?? "Admin"}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Administrator</p>
        </div>

        <ChevronDown size={18} className="hidden md:block" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-10 mt-3 w-56 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl ring-1 ring-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:ring-slate-800">
          <button
            type="button"
            onClick={() => {
              navigate("/profile");
              setOpen(false);
            }}
            className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            <UserIcon size={16} />
            Profile
          </button>
          <button
            type="button"
            onClick={() => {
              navigate("/settings");
              setOpen(false);
            }}
            className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            <Settings size={16} />
            Settings
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 border-t border-slate-200 px-4 py-3 text-left text-sm text-rose-600 transition hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-900"
          >
            <LogOut size={16} />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

export default UserMenu;
