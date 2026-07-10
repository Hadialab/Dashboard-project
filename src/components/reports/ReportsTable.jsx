import { useState } from "react";
import useReportStore from "../../store/reportStore";
import ReportDetailsModal from "./ReportDetailsModal";
import ReportActions from "./ReportActions";
import EmptyState from "./EmptyState";
const statusStyles = {
  Completed:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  Pending:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  Cancelled:
    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

const ReportsTable = () => {
  const {
    filteredReports,
    currentPage,
    itemsPerPage,
  } = useReportStore();

  const [selectedReport, setSelectedReport] = useState(null);
  const [open, setOpen] = useState(false);

  const startIndex = (currentPage - 1) * itemsPerPage;

  const paginatedReports = filteredReports.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5 dark:border-gray-800">
          <div>
            <h2 className="text-xl font-semibold">
              Recent Reports
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Showing {paginatedReports.length} of{" "}
              {filteredReports.length} reports
            </p>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr className="text-left">
                <th className="px-6 py-4 text-sm font-semibold">
                  Customer
                </th>

                <th className="px-6 py-4 text-sm font-semibold">
                  Report Type
                </th>

                <th className="px-6 py-4 text-sm font-semibold">
                  Status
                </th>

                <th className="px-6 py-4 text-sm font-semibold">
                  Orders
                </th>

                <th className="px-6 py-4 text-sm font-semibold">
                  Revenue
                </th>

                <th className="px-6 py-4 text-sm font-semibold">
                  Date
                </th>

                <th className="px-6 py-4 text-center text-sm font-semibold">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {paginatedReports.length > 0 ? (
                paginatedReports.map((report) => (
                  <tr
                    key={report.id}
                    className="border-t transition hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800"
                  >
                    <td className="px-6 py-4 font-medium">
                      {report.customer}
                    </td>

                    <td className="px-6 py-4">
                      {report.reportType}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          statusStyles[report.status]
                        }`}
                      >
                        {report.status}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      {report.orders}
                    </td>

                    <td className="px-6 py-4 font-semibold">
                      ${report.amount.toLocaleString()}
                    </td>

                    <td className="px-6 py-4">
                      {report.date}
                    </td>

                    <td className="px-6 py-4 text-center">
                      <ReportActions
                        report={report}
                        reports={filteredReports}
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
  <td colSpan="7">
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