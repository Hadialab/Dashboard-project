const Pagination = ({
  currentPage,
  setCurrentPage,
  totalItems,
  itemsPerPage,
}) => {
  const totalPages = Math.ceil(
    totalItems / itemsPerPage
  );

  if (totalPages <= 1) return null;

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const previousPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const getVisiblePages = () => {
    const pages = [];
    let start;
    let end;

    if (totalPages <= 5) {
      start = 1;
      end = totalPages;
    } else if (currentPage <= 3) {
      start = 1;
      end = 5;
    } else if (currentPage >= totalPages - 2) {
      start = totalPages - 4;
      end = totalPages;
    } else {
      start = currentPage - 2;
      end = currentPage + 2;
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  };

  const controlClass =
    "inline-flex min-h-11 items-center justify-center gap-1 rounded-lg border px-3 text-sm font-medium transition " +
    "border-slate-200 bg-white hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 " +
    "dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800";

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <p className="text-center text-sm text-slate-600 dark:text-slate-400 lg:text-left">
          Showing{" "}
          <span className="font-medium text-slate-900 dark:text-white">
            {(currentPage - 1) * itemsPerPage + 1}–
            {Math.min(currentPage * itemsPerPage, totalItems)}
          </span>{" "}
          of{" "}
          <span className="font-medium text-slate-900 dark:text-white">
            {totalItems}
          </span>
        </p>

        <p className="text-center text-sm font-medium text-slate-600 dark:text-slate-400">
          Page{" "}
          <span className="font-semibold text-slate-900 dark:text-white">
            {currentPage}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-slate-900 dark:text-white">
            {totalPages}
          </span>
        </p>

        {/* Wraps rather than scrolling sideways. */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 lg:justify-end">
          <button
            type="button"
            onClick={previousPage}
            disabled={currentPage === 1}
            aria-label="Previous page"
            className={controlClass}
          >
            <span aria-hidden="true">←</span>
            <span className="hidden sm:inline">Prev</span>
          </button>

          <div className="hidden gap-1 sm:flex">
            {getVisiblePages().map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => setCurrentPage(page)}
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
            onClick={nextPage}
            disabled={currentPage === totalPages}
            aria-label="Next page"
            className={controlClass}
          >
            <span className="hidden sm:inline">Next</span>
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Pagination;