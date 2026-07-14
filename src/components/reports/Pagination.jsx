import useReportStore from "../../store/reportStore";

const Pagination = () => {
  const {
    filteredReports,
    currentPage,
    itemsPerPage,
    nextPage,
    previousPage,
    setPage,
  } = useReportStore();

  const totalPages = Math.ceil(
    filteredReports.length / itemsPerPage
  );

  if (totalPages <= 1) return null;

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
    <div className="mt-4 sm:mt-6 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 sm:px-6 sm:py-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:flex-row sm:items-center sm:justify-between">
      {/* Info Text */}
      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
        Showing{" "}
        <span className="font-medium">
          {(currentPage - 1) * itemsPerPage + 1}-
          {Math.min(currentPage * itemsPerPage, filteredReports.length)}
        </span>{" "}
        of <span className="font-medium">{filteredReports.length}</span>
      </p>

      {/* Page Indicator */}
      <div className="order-3 text-center text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 sm:order-2">
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
      <div className="order-1 flex items-center justify-between gap-2 sm:order-3 sm:justify-end">
        <button
          onClick={previousPage}
          disabled={currentPage === 1}
          className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800 sm:px-3 sm:py-2"
        >
          ← <span className="hidden sm:inline">Prev</span>
        </button>

        <div className="hidden gap-1 sm:flex">
          {getVisiblePages().map((page) => (
            <button
              key={page}
              onClick={() => setPage(page)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
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
          className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800 sm:px-3 sm:py-2"
        >
          <span className="hidden sm:inline">Next</span> →
        </button>
      </div>
    </div>
  );
};

export default Pagination;