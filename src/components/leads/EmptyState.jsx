import { Users, Plus } from "lucide-react";

function EmptyState({ onAddLead }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
        <Users
          size={32}
          className="text-slate-500 dark:text-slate-400"
        />
      </div>

      <h2 className="mt-6 text-2xl font-bold text-slate-900 dark:text-white">
        No Leads Found
      </h2>

      <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
        You don't have any leads yet. Start by adding your first lead to begin
        tracking potential customers.
      </p>

      <button
        onClick={onAddLead}
        className="mt-8 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-blue-700"
      >
        <Plus size={18} />
        Add Lead
      </button>
    </div>
  );
}

export default EmptyState;