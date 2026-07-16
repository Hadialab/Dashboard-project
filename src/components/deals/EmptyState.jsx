import { Briefcase, Plus } from "lucide-react";

function EmptyState({ onAddDeal }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm dark:border-slate-700 dark:bg-slate-950">
      {/* Icon */}
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20">
        <Briefcase
          size={30}
          className="text-blue-600 dark:text-blue-400"
        />
      </div>

      {/* Title */}
      <h2 className="mt-6 text-xl font-semibold text-slate-900 dark:text-white">
        No Deals Found
      </h2>

      {/* Description */}
      <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
        You don't have any deals yet, or no deals match your current
        search and filters. Start by creating your first deal.
      </p>

      {/* Action */}
      <button
        onClick={onAddDeal}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
      >
        <Plus size={18} />
        Add Deal
      </button>
    </div>
  );
}

export default EmptyState;