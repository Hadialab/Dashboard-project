import {
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
import Modal from "../ui/Modal";
import Button from "../ui/Button";

const statusStyles = {
  Generated: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  Draft: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  Archived: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

const ReportDetailsModal = ({ report, open, onClose }) => {
  if (!open || !report) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="CRM Report Details"
      description={report.title}
      footer={
        <>
          <Button
            variant="secondary"
            onClick={() => window.print()}
            icon={Printer}
            className="sm:w-auto"
          >
            Print
          </Button>

          <Button onClick={() => exportPdf(report)} icon={FileText} className="sm:w-auto">
            Export PDF
          </Button>

          <Button variant="secondary" onClick={onClose} className="sm:w-auto">
            Close
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <InfoCard
          icon={<Users size={18} />}
          title="Customers"
          value={report.customers}
        />

        <InfoCard
          icon={<UserPlus size={18} />}
          title="Leads"
          value={report.leads}
        />

        <InfoCard
          icon={<Handshake size={18} />}
          title="Deals"
          value={report.deals}
        />

        <InfoCard
          icon={<DollarSign size={18} />}
          title="Deal Value"
          value={`$${report.value.toLocaleString()}`}
        />

        <InfoCard
          icon={<Calendar size={18} />}
          title="Expected Close"
          value={report.expectedClose}
        />

        <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
          <div className="mb-3 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <CircleCheck size={18} />
            Status
          </div>

          <span
            className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${statusStyles[report.status]}`}
          >
            {report.status}
          </span>
        </div>

        <div className="rounded-lg border border-slate-200 p-4 sm:col-span-2 dark:border-slate-800">
          <h3 className="mb-2 text-sm font-medium text-slate-500 dark:text-slate-400">
            Description
          </h3>

          <p className="text-sm text-slate-700 dark:text-slate-300">
            {report.description}
          </p>
        </div>
      </div>
    </Modal>
  );
};

function InfoCard({ icon, title, value }) {
  return (
    <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
      <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {icon}
        {title}
      </div>

      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
        {value}
      </h3>
    </div>
  );
}

export default ReportDetailsModal;