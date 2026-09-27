import { useNavigate } from "react-router-dom";
import { UserPlus, Target, BriefcaseBusiness, FileBarChart } from "lucide-react";
import Card from "../ui/Card";

// Each action navigates to the relevant page. "Schedule Meeting" pointed at a
// Calendar page that has no route, so it went to Reports instead.
const actions = [
  {
    title: "Add Customer",
    description: "Create a new customer profile.",
    icon: UserPlus,
    to: "/customers",
  },
  {
    title: "Add Lead",
    description: "Register a potential customer.",
    icon: Target,
    to: "/leads",
  },
  {
    title: "Create Deal",
    description: "Start a new sales opportunity.",
    icon: BriefcaseBusiness,
    to: "/deals",
  },
  {
    title: "View Reports",
    description: "Analyse performance and revenue.",
    icon: FileBarChart,
    to: "/reports",
  },
];

function QuickActions() {
  const navigate = useNavigate();

  return (
    <Card className="p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
        Sales Workspace
      </p>

      <h2 className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
        Quick CRM Actions
      </h2>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {actions.map(({ title, description, icon: Icon, to }) => (
          <button
            key={title}
            type="button"
            onClick={() => navigate(to)}
            className="group flex min-h-11 flex-col items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-blue-500 hover:bg-white dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-500 dark:hover:bg-slate-950"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-slate-700 transition group-hover:bg-blue-600 group-hover:text-white dark:bg-slate-800 dark:text-slate-200 dark:group-hover:bg-blue-600">
              <Icon size={18} />
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
