function CustomersPagination({
  currentPage,
  totalPages,
  onPageChange,
}) {
  const handlePrevious = () => {
    if (currentPage > 1) onPageChange(currentPage - 1);
  };

  const handleNext = () => {
    if (currentPage < totalPages) onPageChange(currentPage + 1);
  };

  const getVisiblePages = () => {
    const pages = [];
    let start, end;

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

  return (
    <div className="mt-4 sm:mt-6 flex flex-col gap-3 sm:gap-4 rounded-xl border border-slate-200 bg-white px-3 py-3 sm:px-6 sm:py-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:flex-row sm:items-center sm:justify-between">
      {/* Mobile: Page Indicator at top */}
      <div className="order-1 text-center text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 sm:order-1">
        Page{" "}
        <span className="font-semibold text-slate-900 dark:text-white">
          {currentPage}
        </span>{" "}
        of{" "}
        <span className="font-semibold text-slate-900 dark:text-white">
          {totalPages}
        </span>
      </div>

      {/* Pagination Controls */}
      <div className="order-2 flex items-center justify-center gap-1 sm:gap-2 sm:order-2 sm:justify-end flex-wrap">
        <button
          onClick={handlePrevious}
          disabled={currentPage === 1}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm font-medium transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-white flex-shrink-0"
        >
          <span>←</span>
          <span className="hidden sm:inline">Prev</span>
        </button>

        {/* Page Numbers - Responsive Display */}
        <div className="flex items-center gap-1 flex-wrap justify-center">
          {getVisiblePages().map((page) => (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`rounded-lg px-2 sm:px-2.5 py-1.5 text-xs sm:text-sm font-medium transition flex-shrink-0 ${
                currentPage === page
                  ? "bg-blue-600 text-white"
                  : "border border-slate-300 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-white"
              }`}
            >
              {page}
            </button>
          ))}
        </div>

        <button
          onClick={handleNext}
          disabled={currentPage === totalPages}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm font-medium transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-white flex-shrink-0"
        >
          <span className="hidden sm:inline">Next</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
}

export default CustomersPagination;