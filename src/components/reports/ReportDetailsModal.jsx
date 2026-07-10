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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-3xl bg-white shadow-2xl dark:bg-gray-900">

        {/* Header */}
        <div className="flex items-center justify-between border-b px-8 py-6 dark:border-gray-800">
          <div>
            <h2 className="text-2xl font-bold">
              Report Details
            </h2>

            <p className="mt-1 text-gray-500">
              Report #{report.id}
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X />
          </button>
        </div>

        {/* Body */}
        <div className="grid gap-6 p-8 md:grid-cols-2">

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

          <div className="rounded-xl border p-5">
            <div className="mb-3 flex items-center gap-2 text-gray-500">
              <CircleCheck size={18} />
              Status
            </div>

            <span
              className={`rounded-full px-3 py-1 text-sm font-semibold ${
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
        <div className="flex flex-wrap justify-end gap-3 border-t px-8 py-6 dark:border-gray-800">

          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-xl border px-5 py-3 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <Printer size={18} />
            Print
          </button>

          <button
            onClick={() => exportPdf(report)}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-white hover:bg-blue-700"
          >
            <FileText size={18} />
            Export PDF
          </button>

          <button
            onClick={onClose}
            className="rounded-xl border px-5 py-3"
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
    <div className="rounded-xl border p-5">
      <div className="mb-3 flex items-center gap-2 text-gray-500">
        {icon}
        {title}
      </div>

      <h3 className="text-xl font-semibold">
        {value}
      </h3>
    </div>
  );
}

export default ReportDetailsModal;