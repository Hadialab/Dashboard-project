import { useMemo, useState } from "react";

import EmptyState from "./EmptyState";
import ReportActions from "./ReportActions";
import ReportDetailsModal from "./ReportDetailsModal";
import ReportFilters from "./ReportFilters";

import type { Dispatch, SetStateAction } from "react";

import type { Deal } from "../../types";
import type { ReportFilterState } from "./ReportFilters";

type ReportsTableProps = {
  /** Already filtered and sorted by the page; this slices it to one page. */
  reports: Deal[];
  currentPage: number;
  itemsPerPage: number;
  filters: ReportFilterState;
  setFilters: Dispatch<SetStateAction<ReportFilterState>>;
};

const ReportsTable = ({
  reports,
  currentPage,
  itemsPerPage,
  filters,
  setFilters,
}: ReportsTableProps) => {
  const [selectedReport, setSelectedReport] = useState<Deal | null>(null);
  const [open, setOpen] = useState(false);

  const paginatedReports = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;

    return reports.slice(start, start + itemsPerPage);
  }, [reports, currentPage, itemsPerPage]);

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        {/* Header */}
        <div className="border-b border-slate-200 px-4 py-4 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Recent Deals
          </h2>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Showing {reports.length} deals
          </p>
        </div>

        {/* Filters */}
        <div className="border-b border-slate-200 p-4 dark:border-slate-800">
          <ReportFilters
            filters={filters}
            setFilters={setFilters}
          />
        </div>

        {/* Tablet and up: table. The arbitrary min-width is gone, so the
            columns share the available space and the container scrolls only
            when it genuinely cannot fit. */}
        <div className="hidden w-full overflow-x-auto md:block">
          <table className="w-full min-w-max border-collapse text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr className="text-left">
                <th className="whitespace-nowrap px-4 py-3 font-semibold">
                  Deal
                </th>

                <th className="whitespace-nowrap px-4 py-3 font-semibold">
                  Customer
                </th>

                <th className="whitespace-nowrap px-4 py-3 font-semibold">
                  Owner
                </th>

                <th className="whitespace-nowrap px-4 py-3 font-semibold">
                  Stage
                </th>

                <th className="whitespace-nowrap px-4 py-3 text-right font-semibold">
                  Value
                </th>

                <th className="hidden whitespace-nowrap px-4 py-3 font-semibold lg:table-cell">
                  Expected Close
                </th>

                <th className="whitespace-nowrap px-4 py-3 text-center font-semibold">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {paginatedReports.map((deal) => (
                <tr
                  key={deal.id}
                  className="border-t border-slate-200 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
                >
                  <td className="max-w-[200px] truncate px-4 py-3 font-medium">
                    {deal.title}
                  </td>

                  <td className="max-w-[160px] truncate px-4 py-3">
                    {deal.customer}
                  </td>

                  <td className="whitespace-nowrap px-4 py-3">{deal.owner}</td>

                  <td className="whitespace-nowrap px-4 py-3">{deal.stage}</td>

                  <td className="whitespace-nowrap px-4 py-3 text-right font-semibold">
                    ${deal.value.toLocaleString()}
                  </td>

                  <td className="hidden whitespace-nowrap px-4 py-3 lg:table-cell">
                    {deal.expectedClose}
                  </td>

                  <td className="whitespace-nowrap px-4 py-3 text-center">
                    <ReportActions
                      report={deal}
                      filteredData={reports}
                      onView={(report: Deal) => {
                        setSelectedReport(report);
                        setOpen(true);
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile: the same rows as stacked cards. */}
        <div className="divide-y divide-slate-200 md:hidden dark:divide-slate-800">
          {paginatedReports.length ? (
            paginatedReports.map((deal) => (
              <div key={deal.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900 dark:text-white">
                      {deal.title}
                    </p>
                    <p className="truncate text-sm text-slate-500 dark:text-slate-400">
                      {deal.customer}
                    </p>
                  </div>

                  <span className="shrink-0 text-sm font-semibold text-slate-900 dark:text-white">
                    ${deal.value.toLocaleString()}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {deal.stage}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {deal.owner}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {deal.expectedClose}
                  </span>
                </div>

                <div className="mt-3">
                  <ReportActions
                    report={deal}
                    filteredData={reports}
                    onView={(report: Deal) => {
                      setSelectedReport(report);
                      setOpen(true);
                    }}
                  />
                </div>
              </div>
            ))
          ) : (
            <EmptyState />
          )}
        </div>

        {paginatedReports.length === 0 && (
          <div className="hidden md:block">
            <EmptyState />
          </div>
        )}
      </div>

      <ReportDetailsModal
        report={selectedReport}
        open={open}
        onClose={() => {
          setOpen(false);
          setSelectedReport(null);
        }}
      />
    </>
  );
};

export default ReportsTable;