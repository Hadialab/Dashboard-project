import Card from "../ui/Card";

function StatCard({ title, value, change, icon: Icon, color }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {title}
          </p>

          {/* Scales down on narrow cards so a long value never overflows. */}
          <h3 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
            {value}
          </h3>

          <p className={`mt-1 text-xs font-medium ${color}`}>{change}</p>
        </div>

        <div className="shrink-0 rounded-lg bg-slate-100 p-3 dark:bg-slate-800">
          <Icon size={22} className="text-slate-600 dark:text-slate-300" />
        </div>
      </div>
    </Card>
  );
}

export default StatCard;
