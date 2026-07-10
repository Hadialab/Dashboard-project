const TableSkeleton = () => {
  return (
    <div className="overflow-hidden rounded-2xl border bg-white shadow-sm dark:bg-gray-900">
      <div className="animate-pulse p-6">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="mb-4 h-12 rounded-lg bg-gray-200 dark:bg-gray-700"
          />
        ))}
      </div>
    </div>
  );
};

export default TableSkeleton;