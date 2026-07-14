import { ChevronLeft, ChevronRight } from "lucide-react";

function CustomersPagination({
  currentPage,
  totalPages,
  onPageChange,
}) {
  return (
    <div className="mt-6 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-6 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
      >
        <ChevronLeft size={18} />
        Previous
      </button>

      <div className="text-sm font-medium text-slate-600 dark:text-slate-300">
        Page{" "}
        <span className="font-semibold text-slate-900 dark:text-white">
          {currentPage}
        </span>{" "}
        of{" "}
        <span className="font-semibold text-slate-900 dark:text-white">
          {totalPages}
        </span>
      </div>

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
      >
        Next
        <ChevronRight size={18} />
      </button>
    </div>
  );
}

export default CustomersPagination;