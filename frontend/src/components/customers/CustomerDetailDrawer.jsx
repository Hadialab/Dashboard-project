import { Mail, Building2, Phone, CircleUser } from "lucide-react";
import Drawer from "../ui/Drawer";
import Button from "../ui/Button";
import FollowUpsPanel from "../ui/FollowUpsPanel";
import NotesTimeline from "../ui/NotesTimeline";

const statusColors = {
  Active: "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400",
  Pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400",
  Inactive: "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400",
};

function CustomerDetailsDrawer({ customer, open, onClose }) {
  if (!open || !customer) return null;

  const details = [
    { icon: Building2, label: "Company", value: customer.company },
    { icon: Mail, label: "Email", value: customer.email },
    { icon: Phone, label: "Phone", value: customer.phone || "+961 00 000 000" },
    { icon: CircleUser, label: "Customer ID", value: `#${customer.id}` },
  ];

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Customer Details"
      footer={
        <Button fullWidth onClick={onClose}>
          Close
        </Button>
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
          className={`mt-2 rounded-full px-3 py-1 text-xs font-medium ${statusColors[customer.status]}`}
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
