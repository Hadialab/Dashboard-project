import {
  
  UserPlus,
  Target,
  BriefcaseBusiness,
  CalendarPlus,
} from "lucide-react";

const actions = [
  {
    title: "Add Customer",
    description: "Create a new customer profile.",
    icon: UserPlus,
  },
  {
    title: "Add Lead",
    description: "Register a potential customer.",
    icon: Target,
  },
  {
    title: "Create Deal",
    description: "Start a new sales opportunity.",
    icon: BriefcaseBusiness,
  },
  {
    title: "Schedule Meeting",
    description: "Book a customer meeting.",
    icon: CalendarPlus,
  },
];

function QuickActions() {
  return (
    <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
            Quick actions
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-900 dark:text-white">
            Quick CRM Actions
          </h2>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {actions.map(({ title, description, icon: Icon }) => (
          <button
            key={title}
            type="button"
            className="group flex flex-col items-start gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-5 text-left transition hover:border-blue-500 hover:bg-white hover:shadow-lg dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-500 dark:hover:bg-slate-950"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-200 text-slate-700 transition group-hover:bg-blue-600 group-hover:text-white dark:bg-slate-800 dark:text-slate-200 dark:group-hover:bg-blue-600">
              <Icon size={20} />
            </div>
            <div>
              <p className="text-base font-semibold text-slate-900 dark:text-white">{title}</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default QuickActions;
