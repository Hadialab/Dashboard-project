import { Download, RefreshCcw } from "lucide-react";
import Card from "../ui/Card";
import { exportActivityCsv } from "../../utils/exportCsv";

// Receives real records from the Dashboard rather than a hardcoded list.
function RecentActivity({ items = [], topCustomers = [], onRefresh }) {
  function handleExport() {
    // Activity rows are not deals, so they get their own exporter. This used to
    // reshape them into deal-shaped objects to satisfy exportCsv, which wrote a
    // file headed "Deal ID, Deal, Customer, Owner, Stage, Value" with the Stage
    // column holding customer statuses and every value 0.
    exportActivityCsv(items);
  }

  return (
    <Card className="p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
            Recent activity
          </p>
          <h2 className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
            Latest updates
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-blue-500 dark:hover:bg-slate-950"
          >
            <Download size={16} />
            Export CSV
          </button>

          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-blue-500 dark:hover:bg-slate-950"
          >
            <RefreshCcw size={16} />
            Refresh
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
            No recent activity yet.
          </p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="rounded-lg border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-300 hover:bg-white dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-500 dark:hover:bg-slate-950"
            >
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {item.description}
                  </p>
                </div>

                <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">
                  {item.time}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {topCustomers.length > 0 && (
        <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Top customers by deal value
          </h3>

          <ul className="mt-2 space-y-1">
            {topCustomers.slice(0, 3).map((entry) => (
              <li
                key={entry.customer}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="min-w-0 truncate text-slate-600 dark:text-slate-300">
                  {entry.customer}
                </span>
                <span className="shrink-0 font-medium text-slate-900 dark:text-white">
                  ${entry.revenue.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

export default RecentActivity;
