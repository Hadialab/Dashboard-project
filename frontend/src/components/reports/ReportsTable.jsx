import { useMemo, useState } from "react";

import EmptyState from "./EmptyState";
import ReportActions from "./ReportActions";
import ReportDetailsModal from "./ReportDetailsModal";
import ReportFilters from "./ReportFilters";

const ReportsTable = ({
  reports,
  currentPage,
  itemsPerPage,
  filters,
  setFilters,
}) => {
  const [selectedReport, setSelectedReport] = useState(null);
  const [open, setOpen] = useState(false);

  const paginatedReports = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;

    return reports.slice(start, start + itemsPerPage);
  }, [reports, currentPage, itemsPerPage]);

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {/* Header */}
        <div className="border-b border-slate-200 px-4 py-4 dark:border-slate-800 sm:px-5">
          <h2 className="text-base font-semibold sm:text-lg">
            Recent Deals
          </h2>

          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            Showing {reports.length} deals
          </p>
        </div>

        {/* Filters */}
        <div className="border-b border-slate-200 p-3 dark:border-slate-800 sm:p-4">
          <ReportFilters
            filters={filters}
            setFilters={setFilters}
          />
        </div>

        {/* Table */}
        <div className="w-full overflow-x-auto">
          <table className="min-w-[820px] w-full border-collapse text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr className="text-left">
                <th className="whitespace-nowrap px-3 py-3 font-semibold sm:px-4">
                  Deal
                </th>

                <th className="whitespace-nowrap px-3 py-3 font-semibold sm:px-4">
                  Customer
                </th>

                <th className="whitespace-nowrap px-3 py-3 font-semibold sm:px-4">
                  Owner
                </th>

                <th className="whitespace-nowrap px-3 py-3 font-semibold sm:px-4">
                  Stage
                </th>

                <th className="whitespace-nowrap px-3 py-3 text-right font-semibold sm:px-4">
                  Value
                </th>

                <th className="whitespace-nowrap px-3 py-3 font-semibold sm:px-4">
                  Expected Close
                </th>

                <th className="whitespace-nowrap px-3 py-3 text-center font-semibold sm:px-4">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {paginatedReports.length ? (
                paginatedReports.map((deal) => (
                  <tr
                    key={deal.id}
                    className="border-t border-slate-200 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
                  >
                    <td className="whitespace-nowrap px-3 py-3 font-medium sm:px-4">
                      {deal.title}
                    </td>

                    <td className="whitespace-nowrap px-3 py-3 sm:px-4">
                      {deal.customer}
                    </td>

                    <td className="whitespace-nowrap px-3 py-3 sm:px-4">
                      {deal.owner}
                    </td>

                    <td className="whitespace-nowrap px-3 py-3 sm:px-4">
                      {deal.stage}
                    </td>

                    <td className="whitespace-nowrap px-3 py-3 text-right font-semibold sm:px-4">
                      ${deal.value.toLocaleString()}
                    </td>

                    <td className="whitespace-nowrap px-3 py-3 sm:px-4">
                      {deal.expectedClose}
                    </td>

                    <td className="whitespace-nowrap px-3 py-3 text-center sm:px-4">
                      <ReportActions
                        report={deal}
                        filteredData={reports}
                        onView={(report) => {
                          setSelectedReport(report);
                          setOpen(true);
                        }}
                      />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7}>
                    <EmptyState />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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