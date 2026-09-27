import { useNavigate, NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Settings,
  LogOut,
  X,
  FileBarChart,
  Users,
  UserPlus,
  Handshake,
  CalendarCheck,
  UserCog,
  Columns3,
} from "lucide-react";
import useAuthStore from "../../store/authStore";
import usePermissions from "../../hooks/usePermissions";

// `permission` is the resource whose access gates this link. A user without it
// does not see the link, and the route itself is guarded too.
const links = [
  { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { name: "Customers", path: "/customers", icon: Users, permission: "customers" },
  { name: "Leads", path: "/leads", icon: UserPlus, permission: "leads" },
  { name: "Deals", path: "/deals", icon: Handshake, permission: "deals" },
  { name: "Pipeline", path: "/pipeline", icon: Columns3, permission: "deals" },
  { name: "Follow-ups", path: "/followups", icon: CalendarCheck },
  { name: "Reports", path: "/reports", icon: FileBarChart, permission: "reports" },
  { name: "Settings", path: "/settings", icon: Settings },
  // Admin only. A Sales user reaching this URL directly still gets a clear
  // explanation rather than a 403.
  { name: "Team", path: "/team", icon: UserCog, adminOnly: true },
];

function Sidebar({ isOpen, onClose }) {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const { can, isAdmin } = usePermissions();

  const visibleLinks = links.filter(
    (link) => (!link.adminOnly || isAdmin) && (!link.permission || can(link.permission, "view")),
  );

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-40 h-screen w-72 transform overflow-y-auto border-r border-slate-200 bg-white shadow-lg transition duration-300 ease-in-out dark:border-slate-800 dark:bg-slate-950 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        <div className="flex h-full flex-col px-4 py-6 sm:px-6">
          <div className="mb-8 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                Admin Studio
              </p>
              <h1 className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
                Workspace
              </h1>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 md:hidden"
              aria-label="Close sidebar"
            >
              <X size={18} />
            </button>
          </div>

          <nav className="flex-1 space-y-2">
            {visibleLinks.map(({ name, path, icon: Icon }) => (
              <NavLink
                key={path}
                to={path}
                className={({ isActive }) =>
                  `flex min-h-11 items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition ${
                    isActive
                      ? "bg-blue-600 text-white"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                  }`
                }
              >
                <Icon size={18} className="shrink-0" />
                {name}
              </NavLink>
            ))}
          </nav>

          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="font-semibold text-slate-900 dark:text-white">Need help?</p>
            <p className="mt-2 text-slate-500 dark:text-slate-400">
              Explore onboarding, billing, and team settings.
            </p>
          </div>

          <div className="mt-6 border-t border-slate-200 pt-6 dark:border-slate-800">
            <button
              type="button"
              onClick={handleLogout}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100 dark:border-red-900 dark:bg-red-950 dark:text-red-300 dark:hover:bg-red-900"
            >
              <LogOut size={18} />
              Log Out
            </button>
          </div>
        </div>
      </aside>

      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-30 bg-slate-950/30 backdrop-blur-sm md:hidden"
        />
      )}
    </>
  );
}

export default Sidebar;
