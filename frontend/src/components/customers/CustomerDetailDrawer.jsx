import {
  Mail,
  Building2,
  Phone,
  CircleUser,
} from "lucide-react";

function CustomerDetailsDrawer({ customer, open, onClose }) {
  if (!open || !customer) return null;

  const statusColors = {
    Active:
      "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400",
    Pending:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400",
    Inactive:
      "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
        {/* Header */}
        <div className="border-b border-slate-200 px-5 py-3 text-center dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Customer Details
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Customer information
          </p>
        </div>

        {/* Body */}
        <div className="space-y-4 p-5">
          {/* Avatar */}
          <div className="flex flex-col items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
              {customer.name.charAt(0)}
            </div>

            <h3 className="mt-2 text-base font-semibold text-slate-900 dark:text-white">
              {customer.name}
            </h3>

            <span
              className={`mt-2 rounded-full px-3 py-1 text-xs font-semibold ${
                statusColors[customer.status]
              }`}
            >
              {customer.status}
            </span>
          </div>

          {/* Information */}
          <div className="space-y-2">
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <Building2 size={16} className="text-blue-600" />

              <div>
                <p className="text-xs text-slate-500">Company</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {customer.company}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <Mail size={16} className="text-blue-600" />

              <div>
                <p className="text-xs text-slate-500">Email</p>
                <p className="break-all text-sm font-medium text-slate-900 dark:text-white">
                  {customer.email}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <Phone size={16} className="text-blue-600" />

              <div>
                <p className="text-xs text-slate-500">Phone</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {customer.phone || "+961 00 000 000"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <CircleUser size={16} className="text-blue-600" />

              <div>
                <p className="text-xs text-slate-500">Customer ID</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  #{customer.id}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 p-4 dark:border-slate-800">
          <button
            onClick={onClose}
            className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default CustomerDetailsDrawer;