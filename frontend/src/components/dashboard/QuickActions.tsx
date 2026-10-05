import { useNavigate } from "react-router-dom";
import { UserPlus, Target, BriefcaseBusiness, FileBarChart } from "lucide-react";
import type { ComponentType } from "react";

import Card from "../ui/Card";
import usePermissions from "../../hooks/usePermissions";
import type { PermissionResource } from "../../types";

type QuickAction = {
  title: string;
  description: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  to: string;
  /**
   * The resource whose `view` permission gates this card. Hidden entirely when
   * absent — a card that leads to an explanatory 403 page is worse than no card.
   */
  permission?: PermissionResource;
};

/**
 * Each action navigates to the relevant page.
 *
 * The permission on each entry is not decoration: QuickActions sits on the
 * dashboard, which every signed-in user reaches, so without it a rep with no
 * deals access is shown a card that goes straight to "No access to this
 * section".
 */
const ACTIONS: QuickAction[] = [
  {
    title: "Add Customer",
    description: "Create a new customer profile.",
    icon: UserPlus,
    to: "/customers",
    permission: "customers",
  },
  {
    title: "Add Lead",
    description: "Register a potential customer.",
    icon: Target,
    to: "/leads",
    permission: "leads",
  },
  {
    title: "Create Deal",
    description: "Start a new sales opportunity.",
    icon: BriefcaseBusiness,
    to: "/deals",
    permission: "deals",
  },
  {
    title: "View Reports",
    description: "Analyse performance and revenue.",
    icon: FileBarChart,
    to: "/reports",
    permission: "reports",
  },
];

function QuickActions() {
  const navigate = useNavigate();
  const { can } = usePermissions();

  const visible = ACTIONS.filter(
    (action) => !action.permission || can(action.permission, "view"),
  );

  return (
    <Card className="p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
        Sales Workspace
      </p>

      <h2 className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
        Quick CRM Actions
      </h2>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {visible.map(({ title, description, icon: Icon, to }) => (
          <button
            key={title}
            type="button"
            onClick={() => navigate(to)}
            className="group flex min-h-11 flex-col items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-blue-500 hover:bg-white dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-500 dark:hover:bg-slate-950"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-slate-700 transition group-hover:bg-blue-600 group-hover:text-white dark:bg-slate-800 dark:text-slate-200 dark:group-hover:bg-blue-600">
              <Icon size={18} aria-hidden="true" />
            </div>

            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {title}
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {description}
              </p>
            </div>
          </button>
        ))}
      </div>
    </Card>
  );
}

export default QuickActions;