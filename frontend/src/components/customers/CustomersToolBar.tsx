import { Search, Upload } from "lucide-react";
import Select from "../ui/Select";
import { CUSTOMER_STATUSES } from "../../utils/crmConstants";

const CustomersToolbar = ({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderChange,
  onImport,
  canImport = false,
}) => {
  return (
    <div className="mt-4 flex flex-col gap-3 sm:mt-6 lg:flex-row lg:items-center lg:justify-between">
      <div className="relative w-full lg:max-w-xs">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />

        <input
          type="text"
          name="search"
          placeholder="Search customers..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
        />
      </div>

      {/* Filters stack full-width on mobile, then sit in a row from sm up. */}
      <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center">
        <Select
          name="statusFilter"
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value)}
          aria-label="Filter by status"
        >
          <option value="All">All statuses</option>
          {CUSTOMER_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </Select>

        <Select
          name="sortBy"
          value={sortBy}
          onChange={(e) => onSortByChange(e.target.value)}
          aria-label="Sort by"
        >
          <option value="name">Name</option>
          <option value="company">Company</option>
          <option value="status">Status</option>
        </Select>

        <Select
          name="sortOrder"
          value={sortOrder}
          onChange={(e) => onSortOrderChange(e.target.value)}
          aria-label="Sort order"
        >
          <option value="asc">Ascending</option>
          <option value="desc">Descending</option>
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
  );
};

export default CustomersToolbar;
