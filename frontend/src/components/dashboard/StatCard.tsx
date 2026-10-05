import type { ComponentType, ReactNode } from "react";

import Card from "../ui/Card";

/** The icon subset StatCard renders. Narrower than lucide's own type. */
type StatIcon = ComponentType<{ size?: number; className?: string }>;

type StatCardProps = {
  title: string;
  /** Pre-formatted. The caller decides the unit and separators. */
  value: ReactNode;
  /** The delta line, e.g. "+12% vs last month". */
  change?: string;
  icon: StatIcon;
  /** Tailwind text colour class for the delta — green up, red down. */
  color?: string;
};

function StatCard({ title, value, change, icon: Icon, color = "" }: StatCardProps) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {title}
          </p>

          {/* min-w-0 above, so this truncates rather than pushing the icon out
              of the card on a long value. */}
          <h3 className="mt-2 truncate text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
            {value}
          </h3>

          {change && (
            <p className={`mt-1 text-xs font-medium ${color}`}>{change}</p>
          )}
        </div>

        <div className="shrink-0 rounded-lg bg-slate-100 p-3 dark:bg-slate-800">
          <Icon size={22} className="text-slate-600 dark:text-slate-300" aria-hidden="true" />
        </div>
      </div>
    </Card>
  );
}

export default StatCard;