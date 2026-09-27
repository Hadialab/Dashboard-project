import { Search } from "lucide-react";
import Select from "../ui/Select";

function DealsToolbar({
  searchTerm,
  onSearchChange,
  stageFilter,
  onStageChange,
  sortBy,
  onSortChange,
}) {
  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />

          <input
            type="text"
            name="search"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search deals..."
            className="w-full rounded-lg border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>

        <Select
          name="stageFilter"
          value={stageFilter}
          onChange={(e) => onStageChange(e.target.value)}
          aria-label="Filter by stage"
        >
          <option value="All">All Stages</option>
          <option value="Lead">Lead</option>
          <option value="Qualified">Qualified</option>
          <option value="Proposal">Proposal</option>
          <option value="Negotiation">Negotiation</option>
          <option value="Won">Won</option>
          <option value="Lost">Lost</option>
        </Select>

        <Select
          name="sortBy"
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value)}
          aria-label="Sort deals"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="title-asc">Deal Title (A-Z)</option>
          <option value="title-desc">Deal Title (Z-A)</option>
          <option value="customer-asc">Customer (A-Z)</option>
          <option value="customer-desc">Customer (Z-A)</option>
          <option value="value-high">Highest Value</option>
          <option value="value-low">Lowest Value</option>
        </Select>
      </div>
    </div>
  );
}

export default DealsToolbar;
