import { Plus, Users } from "lucide-react";

// Matches the customers empty state: same radius, same title size, same
// full-width-on-mobile button.
function EmptyState({ onAddLead }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-4 py-12 text-center dark:border-slate-700 dark:bg-slate-950">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20">
        <Users size={28} className="text-blue-600 dark:text-blue-400" />
      </div>

      <h2 className="mt-6 text-lg font-semibold text-slate-900 dark:text-white">
        No Leads Found
      </h2>

      <p className="mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
        You don't have any leads yet. Start by adding your first lead to begin
        tracking potential customers.
      </p>

      <button
        type="button"
        onClick={onAddLead}
        className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 sm:w-auto"
      >
        <Plus size={18} />
        Add Lead
      </button>
    </div>
  );
}

export default EmptyState;
