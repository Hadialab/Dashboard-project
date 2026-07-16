import { Search } from "lucide-react";

function DealsToolbar({
  searchTerm,
  onSearchChange,
  stageFilter,
  onStageChange,
  sortBy,
  onSortChange,
}) {
  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Search */}
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search deals..."
            className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </div>

        {/* Stage Filter */}
        <select
          value={stageFilter}
          onChange={(e) => onStageChange(e.target.value)}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        >
          <option value="All">All Stages</option>
          <option value="Lead">Lead</option>
          <option value="Qualified">Qualified</option>
          <option value="Proposal">Proposal</option>
          <option value="Negotiation">Negotiation</option>
          <option value="Won">Won</option>
          <option value="Lost">Lost</option>
        </select>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value)}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="title-asc">Deal Title (A-Z)</option>
          <option value="title-desc">Deal Title (Z-A)</option>
          <option value="customer-asc">Customer (A-Z)</option>
          <option value="customer-desc">Customer (Z-A)</option>
          <option value="value-high">Highest Value</option>
          <option value="value-low">Lowest Value</option>
        </select>
      </div>
    </div>
  );
}

export default DealsToolbar;