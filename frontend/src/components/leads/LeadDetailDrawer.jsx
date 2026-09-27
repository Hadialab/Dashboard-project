import { Building2, Mail, Phone, User, Calendar } from "lucide-react";
import Drawer from "../ui/Drawer";
import Button from "../ui/Button";

const statusColors = {
  New: "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
  Contacted: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400",
  Qualified: "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400",
  Proposal: "bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400",
  Lost: "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400",
};

function LeadDetailDrawer({ open, onClose, lead }) {
  if (!open || !lead) return null;

  const details = [
    { icon: Building2, label: "Company", value: lead.company },
    { icon: Mail, label: "Email", value: lead.email },
    { icon: Phone, label: "Phone", value: lead.phone },
    { icon: User, label: "Assigned Rep", value: lead.assignedRep },
    { icon: User, label: "Lead Source", value: lead.source },
    { icon: Calendar, label: "Created Date", value: lead.createdDate },
  ];

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Lead Details"
      footer={
        <Button fullWidth onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="flex flex-col items-center pb-2">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-xl font-bold text-white">
          {lead.name.charAt(0)}
        </div>

        <h3 className="mt-3 text-base font-semibold text-slate-900 dark:text-white">
          {lead.name}
        </h3>

        <span
          className={`mt-2 rounded-full px-3 py-1 text-xs font-medium ${statusColors[lead.status] ?? statusColors.Lost}`}
        >
          {lead.status}
        </span>
      </div>

      <div className="mt-4 space-y-2">
        {details.map(({ icon: Icon, label, value }) => (
          <div
            key={label}
            className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800"
          >
            <Icon size={16} className="shrink-0 text-blue-600" />

            <div className="min-w-0">
              <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
              <p className="break-words text-sm font-medium text-slate-900 dark:text-white">
                {value}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Drawer>
  );
}

export default LeadDetailDrawer;
