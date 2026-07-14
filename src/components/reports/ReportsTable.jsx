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
       <div className="flex flex-col gap-3 border-b border-gray-200 px-4 py-4 sm:px-6 sm:py-5 dark:border-gray-800 md:flex-row md:items-center md:justify-between">
          <div>
           <h2 className="text-lg sm:text-xl font-semibold">
              Recent Reports
            </h2>

           <p className="mt-1 text-xs sm:text-sm text-gray-500">
              Showing {paginatedReports.length} of{" "}
              {filteredReports.length} reports
            </p>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
         <table className="w-full min-w-max">
            <thead className="bg-gray-50 dark:bg-gray-800">
             <tr className="text-left text-xs sm:text-sm">
               <th className="px-4 py-3 sm:px-6 sm:py-4 font-semibold whitespace-nowrap">
                  Customer
                </th>

               <th className="px-4 py-3 sm:px-6 sm:py-4 font-semibold whitespace-nowrap">
                  Report Type
                </th>

               <th className="px-4 py-3 sm:px-6 sm:py-4 font-semibold whitespace-nowrap">
                  Status
                </th>

               <th className="px-4 py-3 sm:px-6 sm:py-4 font-semibold whitespace-nowrap text-right">
                  Orders
                </th>

               <th className="px-4 py-3 sm:px-6 sm:py-4 font-semibold whitespace-nowrap text-right">
                  Revenue
                </th>

               <th className="hidden px-4 py-3 sm:px-6 sm:py-4 font-semibold whitespace-nowrap sm:table-cell">
                  Date
                </th>

               <th className="px-4 py-3 sm:px-6 sm:py-4 text-center font-semibold whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {paginatedReports.length > 0 ? (
                paginatedReports.map((report) => (
                  <tr
                    key={report.id}
                   className="border-t text-xs sm:text-sm transition hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800"
                  >
                   <td className="px-4 py-3 sm:px-6 sm:py-4 font-medium whitespace-nowrap">
                      {report.customer}
                    </td>

                   <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap">
                      {report.reportType}
                    </td>

                   <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap">
                      <span
                       className={`rounded-full px-2 py-0.5 text-xs font-semibold inline-block ${
                          statusStyles[report.status]
                        }`}
                      >
                        {report.status}
                      </span>
                    </td>

                   <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-right">
                      {report.orders}
                    </td>

                   <td className="px-4 py-3 sm:px-6 sm:py-4 font-semibold whitespace-nowrap text-right">
                      ${report.amount.toLocaleString()}
                    </td>

                   <td className="hidden px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap sm:table-cell text-gray-500">
                      {report.date}
                    </td>

                   <td className="px-4 py-3 sm:px-6 sm:py-4 text-center">
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