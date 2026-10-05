import { FileSearch } from "lucide-react";

/**
 * Reports' empty state.
 *
 * Distinct from ui/EmptyState: this one has an icon and fixed copy, because
 * there is only ever one reason the reports list is empty — the filters matched
 * nothing — so there is nothing for a caller to configure.
 */
const EmptyState = () => {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
        <FileSearch size={28} className="text-blue-600 dark:text-blue-400" aria-hidden="true" />
      </div>

      <h2 className="mt-6 text-lg font-semibold text-slate-900 dark:text-white">
        No reports found
      </h2>

      <p className="mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
        No CRM reports match your current search or filters. Try adjusting the
        filters or reset them to view all reports.
      </p>
    </div>
  );
};

export default EmptyState;