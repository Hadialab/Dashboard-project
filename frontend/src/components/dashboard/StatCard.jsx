function StatCard({ title, value, change, icon: Icon, color }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">
            {title}
          </p>

          <h2 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
            {value}
          </h2>

          <p className={`mt-2 text-sm font-medium ${color}`}>
            {change}
          </p>
        </div>

        <div className="rounded-xl bg-slate-100 p-4 dark:bg-slate-800">
          <Icon size={28} />
        </div>
      </div>
    </div>
  );
}

export default StatCard;