function DealPagination({
  currentPage,
  totalPages,
  totalDeals,
  dealsPerPage,
  onPageChange,
  onRowsPerPageChange,
}) {
  return (
    <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 md:flex-row md:items-center md:justify-between">
      {/* Results */}
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Showing{" "}
        <span className="font-semibold text-slate-900 dark:text-white">
          {Math.min((currentPage - 1) * dealsPerPage + 1, totalDeals)}
        </span>{" "}
        -
        <span className="font-semibold text-slate-900 dark:text-white">
          {" "}
          {Math.min(currentPage * dealsPerPage, totalDeals)}
        </span>{" "}
        of{" "}
        <span className="font-semibold text-slate-900 dark:text-white">
          {totalDeals}
        </span>{" "}
        deals
      </p>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {/* Rows Per Page */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600 dark:text-slate-400">
            Rows:
          </span>

          <select
            value={dealsPerPage}
            onChange={(e) =>
              onRowsPerPageChange(Number(e.target.value))
            }
            className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={15}>15</option>
            <option value={20}>20</option>
          </select>
        </div>

        {/* Pagination */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-white dark:hover:bg-slate-800"
          >
            Previous
          </button>

          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {currentPage} / {totalPages || 1}
          </span>

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages || totalPages === 0}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-white dark:hover:bg-slate-800"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

export default DealPagination;