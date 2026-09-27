import {
  X,
  Users,
  UserPlus,
  Handshake,
  DollarSign,
  Calendar,
  CircleCheck,
  Printer,
  FileText,
} from "lucide-react";

import exportPdf from "../../utils/exportPdf";

const statusStyles = {
  Generated:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  Draft:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  Archived:
    "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

const ReportDetailsModal = ({ report, open, onClose }) => {
  if (!open || !report) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
      <div className="my-auto w-full max-w-3xl rounded-3xl bg-white shadow-2xl dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5 dark:border-slate-800">
          <div>
            <h2 className="text-2xl font-bold">
              CRM Report Details
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {report.title}
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 transition hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2">
          <InfoCard
            icon={<Users size={20} />}
            title="Customers"
            value={report.customers}
          />

          <InfoCard
            icon={<UserPlus size={20} />}
            title="Leads"
            value={report.leads}
          />

          <InfoCard
            icon={<Handshake size={20} />}
            title="Deals"
            value={report.deals}
          />

         <InfoCard
  icon={<DollarSign size={20} />}
  title="Deal Value"
  value={`$${report.value.toLocaleString()}`}
/>

<InfoCard
  icon={<Calendar size={20} />}
  title="Expected Close"
  value={report.expectedClose}
/>

          <div className="rounded-xl border border-slate-200 p-5 dark:border-slate-700">
            <div className="mb-3 flex items-center gap-2 text-slate-500">
              <CircleCheck size={18} />
              Status
            </div>

            <span
              className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${
                statusStyles[report.status]
              }`}
            >
              {report.status}
            </span>
          </div>

          <div className="md:col-span-2 rounded-xl border border-slate-200 p-5 dark:border-slate-700">
            <h3 className="mb-2 text-sm font-medium text-slate-500">
              Description
            </h3>

            <p className="text-sm leading-6 text-slate-700 dark:text-slate-300">
              {report.description}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-3 border-t border-slate-200 px-6 py-5 dark:border-slate-800 sm:flex-row sm:justify-end">
          <button
            onClick={() => window.print()}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-5 py-3 transition hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            <Printer size={18} />
            Print
          </button>

          <button
            onClick={() => exportPdf(report)}
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-white transition hover:bg-blue-700"
          >
            <FileText size={18} />
            Export PDF
          </button>

          <button
            onClick={onClose}
            className="rounded-xl border border-slate-300 px-5 py-3 transition hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
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
    <div className="rounded-xl border border-slate-200 p-5 dark:border-slate-700">
      <div className="mb-3 flex items-center gap-2 text-sm text-slate-500">
        {icon}
        {title}
      </div>

      <h3 className="text-xl font-semibold">{value}</h3>
    </div>
  );
}

export default ReportDetailsModal;