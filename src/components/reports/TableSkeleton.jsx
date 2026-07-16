const TableSkeleton = () => {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="animate-pulse p-6">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="mb-4 h-12 rounded-lg bg-slate-200 dark:bg-slate-800"
          />
        ))}
      </div>
    </div>
  );
};

export default TableSkeleton;