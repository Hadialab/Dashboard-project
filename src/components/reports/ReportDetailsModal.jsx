import {
  X,
  User,
  Calendar,
  DollarSign,
  ShoppingCart,
  FileBarChart,
  CircleCheck,
  Printer,
  FileText,
} from "lucide-react";

import exportPdf from "../../utils/exportPdf";

const statusStyles = {
  Completed:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  Pending:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  Cancelled:
    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

const ReportDetailsModal = ({ report, open, onClose }) => {
  if (!open || !report) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-3xl rounded-3xl bg-white shadow-2xl dark:bg-gray-900 my-auto">

        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b px-4 sm:px-6 lg:px-8 py-4 sm:py-6 dark:border-gray-800">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold">
              Report Details
            </h2>

            <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-gray-500">
              Report #{report.id}
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-800 flex-shrink-0 self-start sm:self-auto"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="grid gap-3 sm:gap-6 p-4 sm:p-6 lg:p-8 grid-cols-1 md:grid-cols-2">

          <InfoCard
            icon={<User size={20} />}
            title="Customer"
            value={report.customer}
          />

          <InfoCard
            icon={<FileBarChart size={20} />}
            title="Report Type"
            value={report.reportType}
          />

          <InfoCard
            icon={<DollarSign size={20} />}
            title="Revenue"
            value={`$${report.amount.toLocaleString()}`}
          />

          <InfoCard
            icon={<ShoppingCart size={20} />}
            title="Orders"
            value={report.orders}
          />

          <div className="rounded-xl border p-3 sm:p-5">
            <div className="mb-2 sm:mb-3 flex items-center gap-2 text-gray-500 text-sm sm:text-base">
              <CircleCheck size={18} />
              Status
            </div>

            <span
              className={`rounded-full px-3 py-1 text-xs sm:text-sm font-semibold inline-block ${
                statusStyles[report.status]
              }`}
            >
              {report.status}
            </span>
          </div>

          <InfoCard
            icon={<Calendar size={20} />}
            title="Date"
            value={report.date}
          />
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-3 border-t px-4 sm:px-6 lg:px-8 py-4 sm:py-6 dark:border-gray-800">

          <button
            onClick={() => window.print()}
            className="flex items-center justify-center gap-2 rounded-xl border px-4 sm:px-5 py-2 sm:py-3 text-xs sm:text-base hover:bg-gray-100 dark:hover:bg-gray-800 order-2 sm:order-1"
          >
            <Printer size={18} />
            <span className="sm:inline hidden">Print</span>
            <span className="sm:hidden">Print</span>
          </button>

          <button
            onClick={() => exportPdf(report)}
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 sm:px-5 py-2 sm:py-3 text-xs sm:text-base text-white hover:bg-blue-700 order-1 sm:order-2"
          >
            <FileText size={18} />
            Export
          </button>

          <button
            onClick={onClose}
            className="rounded-xl border px-4 sm:px-5 py-2 sm:py-3 text-xs sm:text-base order-3"
          >
            Close
          </button>

        </div>
      </div>
    </div>
  );
};

function InfoCard({ icon, title, value }) {
  return (
    <div className="rounded-xl border p-3 sm:p-5">
      <div className="mb-2 sm:mb-3 flex items-center gap-2 text-gray-500 text-xs sm:text-sm">
        {icon}
        {title}
      </div>

      <h3 className="text-lg sm:text-xl font-semibold truncate">
        {value}
      </h3>
    </div>
  );
}

export default ReportDetailsModal;