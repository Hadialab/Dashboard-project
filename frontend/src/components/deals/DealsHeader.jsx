import { Plus } from "lucide-react";

function DealsHeader({ onAddDeal, showAddButton = true }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          Deals
        </h1>

        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Manage your sales opportunities and track every deal.
        </p>
      </div>

      {/* Add Button */}
      {showAddButton && (
        <button
          onClick={onAddDeal}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          <Plus size={18} />
          Add Deal
        </button>
      )}
    </div>
  );
}

export default DealsHeader;