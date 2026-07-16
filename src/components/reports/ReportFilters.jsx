import { RotateCcw, Search } from "lucide-react";

const ReportFilters = ({ filters, setFilters }) => {
  const updateFilters = (newFilters) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
    }));
  };

  return (
    <div>
     
      

      {/* Search */}
      <div className="relative mb-4">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <input
          type="text"
          placeholder="Search reports..."
          value={filters.search}
          onChange={(e) =>
            updateFilters({
              search: e.target.value,
            })
          }
          className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
        {/* Report Type */}
        <div>
          <label className="mb-2 block text-sm font-medium">
            Report Type
          </label>

          <select
            value={filters.reportType}
            onChange={(e) =>
              updateFilters({
                reportType: e.target.value,
              })
            }
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="All">All</option>
            <option value="Customers">Customers</option>
            <option value="Leads">Leads</option>
            <option value="Deals">Deals</option>
            <option value="Revenue">Revenue</option>
          </select>
        </div>

        {/* Status */}
        <div>
          <label className="mb-2 block text-sm font-medium">
            Status
          </label>

          <select
            value={filters.status}
            onChange={(e) =>
              updateFilters({
                status: e.target.value,
              })
            }
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="All">All</option>
            <option value="Generated">Generated</option>
            <option value="Draft">Draft</option>
            <option value="Archived">Archived</option>
          </select>
        </div>

        {/* Sort */}
        <div>
          <label className="mb-2 block text-sm font-medium">
            Sort By
          </label>

          <select
            value={filters.sortBy}
            onChange={(e) =>
              updateFilters({
                sortBy: e.target.value,
              })
            }
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="none">None</option>
            <option value="title">Deal Title</option>
            <option value="customer">Customer</option>
            <option value="value">Deal Value</option>
            <option value="stage">Stage</option>
            <option value="expectedClose">Expected Close</option>
          </select>
        </div>

        {/* Date From */}
        <div>
          <label className="mb-2 block text-sm font-medium">
            Date From
          </label>

          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) =>
              updateFilters({
                dateFrom: e.target.value,
              })
            }
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>

        {/* Date To */}
        <div>
          <label className="mb-2 block text-sm font-medium">
            Date To
          </label>

          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) =>
              updateFilters({
                dateTo: e.target.value,
              })
            }
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 flex justify-end">
        <button
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
          className="flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium transition hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          <RotateCcw size={16} />
          Reset Filters
        </button>
      </div>
    </div>
  );
};

export default ReportFilters;