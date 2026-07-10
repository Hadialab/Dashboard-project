import { X } from "lucide-react";

const ReportDetailsModal = ({ report, open, onClose }) => {
  if (!open || !report) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Report Details</h2>

          <button onClick={onClose}>
            <X />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-5">

          <div>
            <p className="text-sm text-gray-500">Customer</p>
            <h3 className="font-semibold">{report.customer}</h3>
          </div>

          <div>
            <p className="text-sm text-gray-500">Report Type</p>
            <h3 className="font-semibold">{report.reportType}</h3>
          </div>

          <div>
            <p className="text-sm text-gray-500">Revenue</p>
            <h3 className="font-semibold">
              ${report.amount.toLocaleString()}
            </h3>
          </div>

          <div>
            <p className="text-sm text-gray-500">Orders</p>
            <h3 className="font-semibold">
              {report.orders}
            </h3>
          </div>

          <div>
            <p className="text-sm text-gray-500">Status</p>

            <span className="rounded-full bg-green-100 px-3 py-1 text-sm text-green-700">
              {report.status}
            </span>
          </div>

          <div>
            <p className="text-sm text-gray-500">Date</p>

            <h3 className="font-semibold">
              {report.date}
            </h3>
          </div>

        </div>

        <div className="mt-8 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border px-4 py-2"
          >
            Close
          </button>

          <button className="rounded-lg bg-blue-600 px-4 py-2 text-white">
            Export PDF
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportDetailsModal;