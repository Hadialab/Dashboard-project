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
  ScrollText,
  Building2,
} from "lucide-react";
import type { ComponentType } from "react";

import useAuthStore from "../../store/authStore";
import usePermissions from "../../hooks/usePermissions";
import type { PermissionResource } from "../../types";

/**
 * The icon subset every entry uses. Narrower than lucide's own type, on purpose.
 *
 * `aria-hidden` is typed as `boolean | "true" | "false"` because React accepts
 * all three and rejects a bare string. Typing it as `boolean` alone rejects the
 * `aria-hidden="true"` form that appears all over this codebase.
 */
type NavIcon = ComponentType<{
  size?: number;
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
}>;

type NavLinkSpec = {
  name: string;
  path: string;
  icon: NavIcon;
  /** The resource whose access gates this link. */
  permission?: PermissionResource;
  /** Admin only, regardless of the permission table. */
  adminOnly?: boolean;
};

/**
 * `permission` is the resource whose access gates this link. A user without it
 * does not see the link, and the route itself is guarded too — hiding it is a
 * convenience, not the mechanism.
 */
const LINKS: NavLinkSpec[] = [
  { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { name: "Customers", path: "/customers", icon: Users, permission: "customers" },
  { name: "Leads", path: "/leads", icon: UserPlus, permission: "leads" },
  { name: "Deals", path: "/deals", icon: Handshake, permission: "deals" },
  // Gated on deals rather than a separate resource: the board shows the same
  // records the Deals list does, and someone allowed to see one can see the
  // other.
  { name: "Pipeline", path: "/pipeline", icon: Columns3, permission: "deals" },
  { name: "Follow-ups", path: "/followups", icon: CalendarCheck },
  { name: "Reports", path: "/reports", icon: FileBarChart, permission: "reports" },
  { name: "Settings", path: "/settings", icon: Settings },
  // Admin only. A Sales user reaching these URLs directly still gets a clear
  // explanation rather than a 403.
  { name: "Team", path: "/team", icon: UserCog, adminOnly: true },
  // Admin only for the same reason as Team, and gated the same way: the API
  // refuses this section to a rep regardless of the permission table, because it
  // is metadata about the company rather than CRM data.
  { name: "Audit Log", path: "/audit", icon: ScrollText, adminOnly: true },
  // Admin only, same reason: company settings, API keys and webhooks are about
  // the company rather than its records, and a rep who can read them can read which
  // integrations it runs.
  { name: "Company", path: "/company", icon: Building2, adminOnly: true },
];

type SidebarProps = {
  /** Mobile drawer state. Below md the sidebar is always shown regardless. */
  isOpen: boolean;
  onClose: () => void;
};

function Sidebar({ isOpen, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const { can, isAdmin } = usePermissions();

  const visibleLinks = LINKS.filter(
    (link) =>
      (!link.adminOnly || isAdmin) && (!link.permission || can(link.permission, "view")),
  );

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <>
      {/* No aria-hidden here.
          An earlier version added `aria-hidden={!isOpen}` on the theory that the
          off-screen mobile drawer should be hidden from assistive tech. It broke
          the entire E2E suite: `aria-hidden` removes a subtree from the
          accessibility tree, and Playwright's `getByRole` — correctly — ignores
          aria-hidden subtrees, so every sidebar link became unfindable.

          It was wrong on its own terms too. From md up the sidebar is always
          visible (`md:translate-x-0` overrides the transform), so hiding it
          whenever `isOpen` was false hid a panel that was plainly on screen.
          The real fix for an off-screen drawer is inert-style handling or a
          focus trap, neither of which is worth the complexity here — the links
          being reachable is better than the drawer being perfectly hidden. */}
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
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          <nav className="flex-1 space-y-2">
            {visibleLinks.map(({ name, path, icon: Icon }) => (
              <NavLink
                key={path}
                to={path}
                // onClick closes the mobile drawer, otherwise tapping a link
                // navigates and leaves the panel covering the page you landed on.
                onClick={onClose}
                className={({ isActive }) =>
                  `flex min-h-11 items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition ${
                    isActive
                      ? "bg-blue-600 text-white"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                  }`
                }
              >
                <Icon size={18} className="shrink-0" aria-hidden="true" />
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
              <LogOut size={18} aria-hidden="true" />
              Log Out
            </button>
          </div>
        </div>
      </aside>

      {/* Decorative: the aside already covers the content behind it, and an
          aria-hidden overlay inside the accessibility tree would give a
          screen-reader user a second, redundant "navigation" region. */}
      {isOpen && (
        <div
          aria-hidden="true"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-slate-950/30 backdrop-blur-sm md:hidden"
        />
      )}
    </>
  );
}

export default Sidebar;