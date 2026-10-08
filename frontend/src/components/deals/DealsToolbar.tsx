import { Search } from "lucide-react";
import Select from "../ui/Select";
import ScopeToggle from "../ui/ScopeToggle";
import type { Scope } from "../ui/ScopeToggle";
import { DEAL_STAGES } from "../../utils/crmConstants";

type DealsToolbarProps = {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  /** A stage name, or "All" for no stage filter. */
  stageFilter: string;
  onStageChange: (stage: string) => void;
  /** One of the option values below; "newest" is the default sort. */
  sortBy: string;
  onSortChange: (sort: string) => void;
  scope: Scope;
  onScopeChange: (scope: Scope) => void;
};

function DealsToolbar({
  searchTerm,
  onSearchChange,
  stageFilter,
  onStageChange,
  sortBy,
  onSortChange,
  scope,
  onScopeChange,
}: DealsToolbarProps) {
  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <ScopeToggle scope={scope} onScopeChange={onScopeChange} noun="Deals" />

      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
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
          {DEAL_STAGES.map((stage) => (
            <option key={stage} value={stage}>
              {stage}
            </option>
          ))}
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
