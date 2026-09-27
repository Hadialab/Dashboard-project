import { Briefcase, Plus } from "lucide-react";

// Same shape as the customers and leads empty states.
function EmptyState({ onAddDeal }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-4 py-12 text-center dark:border-slate-700 dark:bg-slate-950">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20">
        <Briefcase size={28} className="text-blue-600 dark:text-blue-400" />
      </div>

      <h2 className="mt-6 text-lg font-semibold text-slate-900 dark:text-white">
        No Deals Found
      </h2>

      <p className="mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
        You don't have any deals yet, or no deals match your current search and
        filters. Start by creating your first deal.
      </p>

      <button
        type="button"
        onClick={onAddDeal}
        className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 sm:w-auto"
      >
        <Plus size={18} />
        Add Deal
      </button>
    </div>
  );
}

export default EmptyState;
