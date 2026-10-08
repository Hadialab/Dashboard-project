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

import type { ReactNode } from "react";

import exportPdf from "../../utils/exportPdf";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import type { Deal } from "../../types";

// `Record<string, string>` rather than `satisfies`: report.status is typed `string`,
// so indexing a three-key literal with it is an error under noImplicitAny. `satisfies`
// preserves the literal keys, which is the wrong trade here - it moves the failure to
// the call site instead of removing it. An unrecognised status yields undefined and
// renders no badge colour, which is what the API already does for an unknown value.
const statusStyles: Record<string, string> = {
  Generated: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  Draft: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  Archived: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

/**
 * Report-only fields, none of which a Deal carries.
 *
 * The reports table hands this modal a deal row, so these are always absent
 * today and the matching cells render blank. Kept in the type because the modal
 * reads them, and declared optional so the row it is actually given satisfies
 * it without a cast.
 */
type ReportExtras = {
  customers?: number;
  leads?: number;
  deals?: number;
  status?: string;
  description?: string;
};

type ReportDetailsModalProps = {
  /** The row being shown. Null or absent while closed. */
  report?: (Deal & ReportExtras) | null;
  open: boolean;
  onClose: () => void;
};

const ReportDetailsModal = ({ report, open, onClose }: ReportDetailsModalProps) => {
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
            // `?? ""` because ReportExtras.status is optional. Indexing with `undefined`
            // used to interpolate the literal text "undefined" into the class list
            // — an inert class, so it looked fine, but it was a real string in the
            // DOM. An absent status now contributes nothing.
            className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${statusStyles[report.status ?? ""]}`}
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

type InfoCardProps = {
  /** The lucide icon, already sized by the caller. */
  icon: ReactNode;
  title: ReactNode;
  /** A number or an already-formatted string. */
  value: ReactNode;
};

function InfoCard({ icon, title, value }: InfoCardProps) {
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
