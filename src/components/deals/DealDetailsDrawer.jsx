import {
  Briefcase,
  Building2,
  DollarSign,
  User,
  Calendar,
} from "lucide-react";

function DealDetailsDrawer({ deal, open, onClose }) {
  if (!open || !deal) return null;

  const stageColors = {
    Lead:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",

    Qualified:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400",

    Proposal:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400",

    Negotiation:
      "bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400",

    Won:
      "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400",

    Lost:
      "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400",
  };

  const DetailItem = ({ icon: Icon, label, value }) => (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
      <Icon size={16} className="text-blue-600" />

      <div>
        <p className="text-xs text-slate-500">{label}</p>

        <p className="break-all text-sm font-medium text-slate-900 dark:text-white">
          {value}
        </p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
        {/* Header */}
        <div className="border-b border-slate-200 px-5 py-3 text-center dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Deal Details
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Deal information
          </p>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {/* Avatar */}
          <div className="flex flex-col items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
              {deal.title.charAt(0)}
            </div>

            <h3 className="mt-2 text-center text-base font-semibold text-slate-900 dark:text-white">
              {deal.title}
            </h3>

            <span
              className={`mt-2 rounded-full px-3 py-1 text-xs font-semibold ${
                stageColors[deal.stage]
              }`}
            >
              {deal.stage}
            </span>
          </div>

          {/* Information */}
          <div className="space-y-2">
            <DetailItem
              icon={Building2}
              label="Customer"
              value={deal.customer}
            />

            <DetailItem
              icon={DollarSign}
              label="Deal Value"
              value={`$${Number(deal.value).toLocaleString()}`}
            />

            <DetailItem
              icon={User}
              label="Deal Owner"
              value={deal.owner}
            />

            <DetailItem
              icon={Calendar}
              label="Expected Close"
              value={deal.expectedClose}
            />

            <DetailItem
              icon={Briefcase}
              label="Stage"
              value={deal.stage}
            />
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

export default DealDetailsDrawer;