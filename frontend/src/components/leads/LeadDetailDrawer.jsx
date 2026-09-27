import { Building2, Mail, Phone, User, Calendar, UserCheck } from "lucide-react";
import Drawer from "../ui/Drawer";
import Button from "../ui/Button";
import FollowUpsPanel from "../ui/FollowUpsPanel";
import NotesTimeline from "../ui/NotesTimeline";
import usePermissions from "../../hooks/usePermissions";
import { leadStatusBadge, CONVERTED_STATUS } from "../../utils/crmConstants";
import { formatRelative } from "../../utils/time";

function LeadDetailDrawer({ open, onClose, lead, onConvertLead }) {
  const { can } = usePermissions();

  // Converting writes to two resources, so both permissions are needed. An
  // already-converted lead is not offered it again.
  const canConvert =
    can("leads", "edit") &&
    can("customers", "create") &&
    lead?.status !== CONVERTED_STATUS;

  if (!open || !lead) return null;

  const details = [
    { icon: Building2, label: "Company", value: lead.company },
    { icon: Mail, label: "Email", value: lead.email },
    { icon: Phone, label: "Phone", value: lead.phone },
    { icon: User, label: "Assigned Rep", value: lead.assignedRep },
    { icon: User, label: "Lead Source", value: lead.source },
    { icon: Calendar, label: "Created", value: formatRelative(lead.createdDate) },
    { icon: Calendar, label: "Last updated", value: formatRelative(lead.updatedAt) },
  ];

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Lead Details"
      footer={
        <div className="flex flex-col gap-2 sm:flex-row">
          {canConvert && onConvertLead && (
            <Button
              variant="secondary"
              icon={UserCheck}
              onClick={() => onConvertLead(lead)}
              className="sm:flex-1"
            >
              Convert to customer
            </Button>
          )}

          <Button onClick={onClose} className="sm:flex-1">
            Close
          </Button>
        </div>
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
          className={`mt-2 rounded-full px-3 py-1 text-xs font-medium ${leadStatusBadge(lead.status)}`}
        >
          {lead.status}
        </span>
      </div>

      {/* The customer this lead became, so the conversion history is readable
          from the lead rather than only from a database column. */}
      {lead.convertedCustomerId && (
        <p className="mt-3 rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm text-teal-800 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-200">
          Converted to customer{" "}
          <span className="font-semibold">#{lead.convertedCustomerId}</span>
        </p>
      )}

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

      {/* Follow-ups and the activity timeline, matching the customer and deal
          drawers. */}
      <FollowUpsPanel
        entityType="lead"
        entityId={lead.id}
        contact={{ name: lead.name, email: lead.email }}
      />

      <NotesTimeline entityType="lead" entityId={lead.id} />
    </Drawer>
  );
}

export default LeadDetailDrawer;
