type DealPaginationProps = {
  currentPage: number;
  totalPages: number;
  /** After filtering, not the whole collection. */
  totalDeals: number;
  dealsPerPage: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (perPage: number) => void;
};

function DealPagination({
  currentPage,
  totalPages,
  totalDeals,
  dealsPerPage,
  onPageChange,
  onRowsPerPageChange,
}: DealPaginationProps) {
  const controlClass =
    "inline-flex min-h-11 items-center justify-center gap-1 rounded-lg border px-3 text-sm font-medium transition " +
    "border-slate-200 bg-white hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 " +
    "dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800";

  return (
    <div className="mt-6 flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between dark:border-slate-800 dark:bg-slate-950">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Showing{" "}
        <span className="font-semibold text-slate-900 dark:text-white">
          {Math.min((currentPage - 1) * dealsPerPage + 1, totalDeals)}
        </span>{" "}
        -{" "}
        <span className="font-semibold text-slate-900 dark:text-white">
          {Math.min(currentPage * dealsPerPage, totalDeals)}
        </span>{" "}
        of{" "}
        <span className="font-semibold text-slate-900 dark:text-white">
          {totalDeals}
        </span>{" "}
        deals
      </p>

      <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
        <div className="flex items-center gap-2">
          <label
            htmlFor="dealsPerPage"
            className="text-sm text-slate-600 dark:text-slate-400"
          >
            Rows
          </label>

          <select
            id="dealsPerPage"
            value={dealsPerPage}
            onChange={(e) => onRowsPerPageChange(Number(e.target.value))}
            className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={15}>15</option>
            <option value={20}>20</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={controlClass}
          >
            Previous
          </button>

          <span className="px-1 text-sm font-medium text-slate-700 dark:text-slate-300">
            {currentPage} / {totalPages || 1}
          </span>

          <button
            type="button"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages || totalPages === 0}
            className={controlClass}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

export default DealPagination;
