import { Search } from "lucide-react";
import Select from "../ui/Select";
import { LEAD_STATUSES, LEAD_SOURCES } from "../../utils/crmConstants";

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
}) {
  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      {/* Stacks on mobile and tablet, becomes a single row at xl. */}
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="relative w-full xl:max-w-xs">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />

          <input
            type="text"
            name="search"
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
        </div>
      </div>
    </div>
  );
}

export default LeadsToolbar;
