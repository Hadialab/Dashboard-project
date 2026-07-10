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

  return (
    <div className="mt-6 flex items-center justify-between">
      <p className="text-sm text-gray-500">
        Showing {(currentPage - 1) * itemsPerPage + 1} -
        {Math.min(
          currentPage * itemsPerPage,
          filteredReports.length
        )}{" "}
        of {filteredReports.length}
      </p>

      <div className="flex gap-2">
        <button
          onClick={previousPage}
          disabled={currentPage === 1}
          className="rounded border px-3 py-2 disabled:opacity-50"
        >
          Previous
        </button>

        {Array.from(
          { length: totalPages },
          (_, i) => i + 1
        ).map((page) => (
          <button
            key={page}
            onClick={() => setPage(page)}
            className={`rounded px-3 py-2 ${
              currentPage === page
                ? "bg-blue-600 text-white"
                : "border"
            }`}
          >
            {page}
          </button>
        ))}

        <button
          onClick={nextPage}
          disabled={currentPage === totalPages}
          className="rounded border px-3 py-2 disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default Pagination;