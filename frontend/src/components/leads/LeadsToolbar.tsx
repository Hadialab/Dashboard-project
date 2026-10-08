import { Search, Upload } from "lucide-react";
import Select from "../ui/Select";
import ScopeToggle from "../ui/ScopeToggle";
import type { Scope } from "../ui/ScopeToggle";
import { LEAD_STATUSES, LEAD_SOURCES } from "../../utils/crmConstants";

type LeadsToolbarProps = {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  /** A status name, or "All" for no status filter. */
  statusFilter: string;
  onStatusChange: (status: string) => void;
  /** A source name, or "All" for no source filter. */
  sourceFilter: string;
  onSourceChange: (source: string) => void;
  /** One of the option values below; "newest" is the default sort. */
  sortBy: string;
  onSortChange: (sort: string) => void;
  /** One of the convertedFilter options: include, all or only. */
  convertedFilter: string;
  onConvertedFilterChange: (filter: string) => void;
  scope: Scope;
  onScopeChange: (scope: Scope) => void;
  onImport: () => void;
  /** Import is a create, so the page gates it on the same permission. */
  canImport?: boolean;
};

function LeadsToolbar({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusChange,
  sourceFilter,
  onSourceChange,
  sortBy,
  onSortChange,
  convertedFilter,
  onConvertedFilterChange,
  scope,
  onScopeChange,
  onImport,
  canImport = false,
}: LeadsToolbarProps) {
  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <ScopeToggle scope={scope} onScopeChange={onScopeChange} noun="Leads" />

      {/* Stacks on mobile and tablet, becomes a single row at xl. */}
      <div className="mt-4 flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="relative w-full xl:max-w-xs">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />

          <input
            type="text"
            name="search"
            // Same reason as DealsToolbar: a placeholder is not an accessible name,
            // and it vanishes once the field has a value.
            aria-label="Search leads"
            placeholder="Search leads..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:flex xl:flex-1">
          <Select
            name="statusFilter"
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value)}
            aria-label="Filter by status"
          >
            <option value="All">All Statuses</option>
            {LEAD_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </Select>

          <Select
            name="sourceFilter"
            value={sourceFilter}
            onChange={(e) => onSourceChange(e.target.value)}
            aria-label="Filter by source"
          >
            <option value="All">All Sources</option>
            {LEAD_SOURCES.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </Select>

          {/* Converted leads are kept rather than deleted, so this is how the
              conversion history is reviewed — or kept out of the working list. */}
          <Select
            name="convertedFilter"
            value={convertedFilter}
            onChange={(e) => onConvertedFilterChange(e.target.value)}
            aria-label="Filter converted leads"
          >
            <option value="include">Include converted</option>
            <option value="all">Hide converted</option>
            <option value="only">Only converted</option>
          </Select>

          <Select
            name="sortBy"
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            aria-label="Sort leads"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="name-asc">Name (A-Z)</option>
            <option value="name-desc">Name (Z-A)</option>
            <option value="company-asc">Company (A-Z)</option>
            <option value="company-desc">Company (Z-A)</option>
          </Select>

          {canImport && (
            <button
              type="button"
              onClick={onImport}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              <Upload size={16} />
              Import CSV
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default LeadsToolbar;
