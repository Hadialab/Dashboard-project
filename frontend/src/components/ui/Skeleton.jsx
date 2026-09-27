// Loading placeholder. `className` lets callers match the shape of whatever is
// loading — a table row height or a stat card height.
function Skeleton({ className = "" }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800 ${className}`}
    />
  );
}

// Table-shaped skeleton: a header strip plus a configurable number of rows.
// Matches the real table's cell padding so nothing jumps when data lands.
export function SkeletonTable({ rows = 5, columns = 4 }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
        <Skeleton className="h-4 w-32" />
      </div>

      <div className="divide-y divide-slate-200 dark:divide-slate-800">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex items-center gap-4 px-4 py-4">
            {Array.from({ length: columns }).map((__, colIndex) => (
              <Skeleton
                key={colIndex}
                className={`h-4 ${colIndex === 0 ? "w-1/3" : "flex-1"}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Skeleton;
