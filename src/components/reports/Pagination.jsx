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

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:px-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Info */}
        <p className="text-center text-xs text-slate-600 dark:text-slate-400 sm:text-sm lg:text-left">
          Showing{" "}
          <span className="font-medium">
            {(currentPage - 1) * itemsPerPage + 1}–
            {Math.min(
              currentPage * itemsPerPage,
              totalItems
            )}
          </span>{" "}
          of{" "}
          <span className="font-medium">
            {totalItems}
          </span>
        </p>

        {/* Current Page */}
        <div className="text-center text-xs font-medium text-slate-600 dark:text-slate-400 sm:text-sm">
          Page{" "}
          <span className="font-semibold text-slate-900 dark:text-white">
            {currentPage}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-slate-900 dark:text-white">
            {totalPages}
          </span>
        </div>

        {/* Controls */}
        <div className="overflow-x-auto">
          <div className="flex min-w-max items-center justify-center gap-1.5 lg:justify-end">
            <button
              onClick={previousPage}
              disabled={currentPage === 1}
              className="whitespace-nowrap rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800 sm:px-3 sm:py-2 sm:text-sm"
            >
              ← Prev
            </button>

            <div className="hidden gap-1 sm:flex">
              {getVisiblePages().map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`rounded-lg px-2.5 py-1.5 text-xs transition sm:px-3 sm:py-2 sm:text-sm ${
                    currentPage === page
                      ? "bg-blue-600 text-white"
                      : "border border-slate-300 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              onClick={nextPage}
              disabled={currentPage === totalPages}
              className="whitespace-nowrap rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800 sm:px-3 sm:py-2 sm:text-sm"
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pagination;