import { ChevronLeft, ChevronRight } from "lucide-react";

type LeadPaginationProps = {
  currentPage: number;
  totalPages: number;
  /** After filtering, not the whole collection. */
  totalLeads: number;
  leadsPerPage: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (perPage: number) => void;
};

function LeadPagination({
  currentPage,
  totalPages,
  totalLeads,
  leadsPerPage,
  onPageChange,
  onRowsPerPageChange,
}: LeadPaginationProps) {
  if (totalLeads === 0) return null;

  const start = (currentPage - 1) * leadsPerPage + 1;
  const end = Math.min(currentPage * leadsPerPage, totalLeads);

  /** Page numbers, with "..." standing in for a run of skipped pages. */
  const getPageNumbers = (): (number | string)[] => {
    const pages: (number | string)[] = [];

    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else if (currentPage <= 3) {
      pages.push(1, 2, 3, 4, "...", totalPages);
    } else if (currentPage >= totalPages - 2) {
      pages.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
    }

    return pages;
  };

  const controlClass =
    "inline-flex min-h-11 items-center justify-center gap-1 rounded-lg border px-3 text-sm font-medium transition " +
    "border-slate-200 bg-white hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 " +
    "dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800";

  return (
    <div className="mt-6 flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between dark:border-slate-800 dark:bg-slate-950">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Showing{" "}
        <span className="font-semibold text-slate-900 dark:text-white">{start}</span>{" "}
        to{" "}
        <span className="font-semibold text-slate-900 dark:text-white">{end}</span>{" "}
        of{" "}
        <span className="font-semibold text-slate-900 dark:text-white">{totalLeads}</span>{" "}
        leads
      </p>

      {/* Wraps rather than overflowing on narrow screens. */}
      <div className="flex flex-wrap items-center justify-between gap-3 lg:justify-end">
        <div className="flex items-center gap-2">
          <label
            htmlFor="leadsPerPage"
            className="text-sm text-slate-500 dark:text-slate-400"
          >
            Rows
          </label>

          <select
            id="leadsPerPage"
            value={leadsPerPage}
            onChange={(e) => onRowsPerPageChange(Number(e.target.value))}
            className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={15}>15</option>
            <option value={20}>20</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>

        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Previous page"
          className={controlClass}
        >
          <ChevronLeft size={16} />
          <span className="hidden sm:inline">Previous</span>
        </button>

        <div className="flex items-center gap-1">
          {getPageNumbers().map((page, index) =>
            page === "..." ? (
              <span key={index} className="px-1 text-slate-500">
                ...
              </span>
            ) : (
              <button
                key={index}
                type="button"
                // The `page === "..."` test above has already taken the ellipsis
                // out of this branch, but TypeScript re-widens `page` inside a
                // closure, so it has to be said again here.
                onClick={() => onPageChange(page as number)}
                aria-current={currentPage === page ? "page" : undefined}
                className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg px-2 text-sm font-medium transition ${
                  currentPage === page
                    ? "bg-blue-600 text-white"
                    : "border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                {page}
              </button>
            )
          )}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="Next page"
          className={controlClass}
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

export default LeadPagination;
