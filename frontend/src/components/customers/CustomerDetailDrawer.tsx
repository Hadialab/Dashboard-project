import { Mail, Building2, Phone, CircleUser, Calendar, Handshake } from "lucide-react";
import { useEffect } from "react";
import Drawer from "../ui/Drawer";
import Button from "../ui/Button";
import FollowUpsPanel from "../ui/FollowUpsPanel";
import NotesTimeline from "../ui/NotesTimeline";
import usePermissions from "../../hooks/usePermissions";
import useRecentlyViewedStore from "../../store/recentlyViewedStore";
import { customerStatusBadge } from "../../utils/crmConstants";
import { formatRelative } from "../../utils/time";

function CustomerDetailsDrawer({ customer, open, onClose, onCreateDeal }) {
  const { can } = usePermissions();
  const remember = useRecentlyViewedStore((state) => state.record);

  // A deal references its customer by name, so starting one from here carries
  // that name over. The server still derives the owner.
  const canCreateDeal = can("deals", "create");

  // Opening the drawer is what counts as "viewed" — that is what the command
  // palette offers as a way back.
  useEffect(() => {
    if (!open || !customer) return;

    remember({
      id: `customer:${customer.id}`,
      recordId: customer.id,
      type: "customer",
      label: customer.name,
    });
  }, [open, customer, remember]);

  if (!open || !customer) return null;

  const details = [
    { icon: Building2, label: "Company", value: customer.company },
    { icon: Mail, label: "Email", value: customer.email },
    { icon: Phone, label: "Phone", value: customer.phone || "+961 00 000 000" },
    { icon: CircleUser, label: "Customer ID", value: `#${customer.id}` },
    { icon: Calendar, label: "Last updated", value: formatRelative(customer.updatedAt) },
  ];

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Customer Details"
      footer={
        <div className="flex flex-col gap-2 sm:flex-row">
          {canCreateDeal && onCreateDeal && (
            <Button
              variant="secondary"
              icon={Handshake}
              onClick={() => onCreateDeal(customer)}
              className="sm:flex-1"
            >
              Create deal
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
          {customer.name.charAt(0)}
        </div>

        <h3 className="mt-3 text-base font-semibold text-slate-900 dark:text-white">
          {customer.name}
        </h3>

        <span
          className={`mt-2 rounded-full px-3 py-1 text-xs font-medium ${customerStatusBadge(customer.status)}`}
        >
          {customer.status}
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

      {/* Follow-ups and the activity timeline for this customer. */}
      <FollowUpsPanel
        entityType="customer"
        entityId={customer.id}
        contact={{ name: customer.name, email: customer.email }}
      />

      <NotesTimeline entityType="customer" entityId={customer.id} />
    </Drawer>
  );
}

export default CustomerDetailsDrawer;
