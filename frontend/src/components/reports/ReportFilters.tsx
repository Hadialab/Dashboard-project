import { RotateCcw, Search } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";

import Select from "../ui/Select";

import type { ReportSortKey } from "./reportSort";

/**
 * The filter bar's state, owned by the page and passed down whole so the URL sync
 * in Reports.jsx and the filtering in ReportsTable read from one object.
 *
 * Every field is a select option value or a search string. The option lists
 * below are the only thing that constrains them, and the database does not
 * constrain the underlying stage either, so they stay plain strings.
 *
 * `sortBy` is the exception - see ReportSortKey.
 */
export type ReportFilterState = {
  search: string;
  /** "All", or a report type. */
  reportType: string;
  /** "All", or a deal stage. */
  status: string;
  /**
   * A deal field name, or "none" for no sort.
   *
   * Union rather than plain `string` because the page indexes a Deal with it
   * (`report[filters.sortBy]`), which a bare string cannot do. The options below
   * are the source of truth for the list.
   */
  sortBy: ReportSortKey;
  /** YYYY-MM-DD, or empty for no lower bound. */
  dateFrom: string;
  /** YYYY-MM-DD, or empty for no upper bound. */
  dateTo: string;
};

type ReportFiltersProps = {
  filters: ReportFilterState;
  setFilters: Dispatch<SetStateAction<ReportFilterState>>;
};

const ReportFilters = ({ filters, setFilters }: ReportFiltersProps) => {
  // Merged rather than replacing: each control owns one field, so a change here
  // must not reset the others the page is also reading.
  const updateFilters = (newFilters: Partial<ReportFilterState>) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
    }));
  };

  const dateClass =
    "min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100";

  return (
    <div>
      <div className="relative mb-4">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />

        <input
          type="text"
          name="search"
          placeholder="Search reports..."
          value={filters.search}
          onChange={(e) => updateFilters({ search: e.target.value })}
          className="w-full rounded-lg border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
        />
      </div>

      {/* 1 column on mobile, 2 on tablet, 5 on desktop. */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Select
          label="Report Type"
          name="reportType"
          value={filters.reportType}
          onChange={(e) => updateFilters({ reportType: e.target.value })}
        >
          <option value="All">All</option>
          <option value="Customers">Customers</option>
          <option value="Leads">Leads</option>
          <option value="Deals">Deals</option>
          <option value="Revenue">Revenue</option>
        </Select>

        <Select
          label="Status"
          name="status"
          value={filters.status}
          onChange={(e) => updateFilters({ status: e.target.value })}
        >
          <option value="All">All</option>
          <option value="Generated">Generated</option>
          <option value="Draft">Draft</option>
          <option value="Archived">Archived</option>
        </Select>

        <Select
          label="Sort By"
          name="sortBy"
          value={filters.sortBy}
          // The cast is the price of the union type above: a <select> hands
          // back a string, and the only thing that makes it one of these six is
          // that the options below are exactly these six.
          onChange={(e) =>
            updateFilters({ sortBy: e.target.value as ReportSortKey })
          }
        >
          <option value="none">None</option>
          <option value="title">Deal Title</option>
          <option value="customer">Customer</option>
          <option value="value">Deal Value</option>
          <option value="stage">Stage</option>
          <option value="expectedClose">Expected Close</option>
        </Select>

        <div className="space-y-2">
          <label
            htmlFor="dateFrom"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Date From
          </label>

          <input
            id="dateFrom"
            type="date"
            value={filters.dateFrom}
            onChange={(e) => updateFilters({ dateFrom: e.target.value })}
            className={dateClass}
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="dateTo"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Date To
          </label>

          <input
            id="dateTo"
            type="date"
            value={filters.dateTo}
            onChange={(e) => updateFilters({ dateTo: e.target.value })}
            className={dateClass}
          />
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={() =>
            setFilters({
              search: "",
              reportType: "All",
              status: "All",
              sortBy: "none",
              dateFrom: "",
              dateTo: "",
            })
          }
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <RotateCcw size={16} />
          Reset Filters
        </button>
      </div>
    </div>
  );
};

export default ReportFilters;
