function CustomerTableSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      {/* Table Header */}
      <div className="grid grid-cols-4 gap-4 border-b border-slate-200 p-4 dark:border-slate-700 md:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-4 animate-pulse rounded bg-slate-200 dark:bg-slate-700"
          />
        ))}
      </div>

      {/* Table Rows */}
      {Array.from({ length: 5 }).map((_, row) => (
        <div
          key={row}
          className="grid grid-cols-4 gap-4 border-b border-slate-100 p-4 last:border-0 dark:border-slate-800 md:grid-cols-5"
        >
          {Array.from({ length: 5 }).map((_, col) => (
            <div
              key={col}
              className="h-4 animate-pulse rounded bg-slate-200 dark:bg-slate-700"
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export default CustomerTableSkeleton;