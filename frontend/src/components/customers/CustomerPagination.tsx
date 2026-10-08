/**
 * The pager under the Customers table.
 *
 * Page numbers are always chosen here rather than by the caller: at most five
 * buttons, always including the current page, so the row cannot grow without
 * bound as records are added.
 */
type CustomersPaginationProps = {
  currentPage: number;
  totalPages: number;
  /** Receives the page to move to. Callers clamp and refetch; this only asks. */
  onPageChange: (page: number) => void;
};

function CustomersPagination({
  currentPage,
  totalPages,
  onPageChange,
}: CustomersPaginationProps) {
  const handlePrevious = () => {
    if (currentPage > 1) onPageChange(currentPage - 1);
  };

  const handleNext = () => {
    if (currentPage < totalPages) onPageChange(currentPage + 1);
  };

  const getVisiblePages = () => {
    const pages: number[] = [];
    let start: number, end: number;

    if (totalPages <= 5) {
      start = 1;
      end = totalPages;
    } else {
      if (currentPage <= 3) {
        start = 1;
        end = 5;
      } else if (currentPage >= totalPages - 2) {
        start = totalPages - 4;
        end = totalPages;
      } else {
        start = currentPage - 2;
        end = currentPage + 2;
      }
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  // Fewer page buttons on narrow screens so the row never overflows.
  const isNarrow = typeof window !== "undefined" && window.innerWidth < 640;
  const visiblePages = isNarrow ? getVisiblePages().slice(0, 3) : getVisiblePages();

  const controlClass =
    "inline-flex min-h-11 items-center justify-center gap-1 rounded-lg border px-3 text-sm font-medium transition " +
    "border-slate-200 bg-white hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 " +
    "dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800";

  return (
    <div className="mt-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:mt-6 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-950">
      <p className="text-center text-sm font-medium text-slate-600 sm:order-1 dark:text-slate-400">
        Page{" "}
        <span className="font-semibold text-slate-900 dark:text-white">
          {currentPage}
        </span>{" "}
        of{" "}
        <span className="font-semibold text-slate-900 dark:text-white">
          {totalPages}
        </span>
      </p>

      <div className="flex flex-wrap items-center justify-center gap-2 sm:order-2 sm:justify-end">
        <button
          type="button"
          onClick={handlePrevious}
          disabled={currentPage === 1}
          aria-label="Previous page"
          className={controlClass}
        >
          <span aria-hidden="true">←</span>
          <span className="hidden sm:inline">Prev</span>
        </button>

        <div className="flex items-center gap-1">
          {visiblePages.map((page) => (
            <button
              key={page}
              type="button"
              onClick={() => onPageChange(page)}
              aria-current={currentPage === page ? "page" : undefined}
              className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg px-2 text-sm font-medium transition ${
                currentPage === page
                  ? "bg-blue-600 text-white"
                  : "border border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {page}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handleNext}
          disabled={currentPage === totalPages}
          aria-label="Next page"
          className={controlClass}
        >
          <span className="hidden sm:inline">Next</span>
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  );
}

export default CustomersPagination;
