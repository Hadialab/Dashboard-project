import { Search, RotateCcw, FileBarChart } from "lucide-react";
import useReportStore from "../../store/reportStore";

const ReportFilters = () => {
  const { filters, updateFilters } = useReportStore();

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold">Report Builder</h2>
        <p className="mt-1 text-sm text-gray-500">
          Filter and generate custom business reports.
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />

        <input
          type="text"
          placeholder="Search customers, report types or status..."
          value={filters.search}
          onChange={(e) =>
            updateFilters({
              search: e.target.value,
            })
          }
          className="w-full rounded-xl border px-4 py-3 pl-10 focus:border-blue-500 focus:outline-none"
        />
      </div>

      {/* Filters */}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-6">
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
            className="w-full rounded-xl border px-3 py-3"
          >
            <option value="All">All</option>
            <option value="Sales">Sales</option>
            <option value="Orders">Orders</option>
            <option value="Customers">Customers</option>
            <option value="Products">Products</option>
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
            className="w-full rounded-xl border px-3 py-3"
          >
            <option value="All">All</option>
            <option value="Completed">Completed</option>
            <option value="Pending">Pending</option>
            <option value="Cancelled">Cancelled</option>
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
            className="w-full rounded-xl border px-3 py-3"
          >
            <option value="none">None</option>
            <option value="customer">Customer</option>
            <option value="amount">Revenue</option>
            <option value="orders">Orders</option>
            <option value="date">Date</option>
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
            className="w-full rounded-xl border px-3 py-3"
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
            className="w-full rounded-xl border px-3 py-3"
          />
        </div>

        {/* Generate Button */}
        <div className="flex items-end">
          <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-700">
            <FileBarChart size={18} />
            Generate
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={() =>
            updateFilters({
              search: "",
              reportType: "All",
              status: "All",
              sortBy: "none",
              dateFrom: "",
              dateTo: "",
            })
          }
          className="flex items-center gap-2 rounded-xl border px-5 py-3 transition hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <RotateCcw size={18} />
          Reset Filters
        </button>
      </div>
    </div>
  );
};

export default ReportFilters;