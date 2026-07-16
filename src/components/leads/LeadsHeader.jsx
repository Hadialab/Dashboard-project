import { Plus } from "lucide-react";

function LeadsHeader({ onAddLead, showAddButton = true }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
          Leads
        </h1>

        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Manage and track potential customers.
        </p>
      </div>

      {showAddButton && (
        <button
          onClick={onAddLead}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-blue-700 sm:w-auto"
        >
          <Plus size={18} />
          Add Lead
        </button>
      )}
    </div>
  );
}

export default LeadsHeader;