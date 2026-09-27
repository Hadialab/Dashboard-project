import { Briefcase, Building2, DollarSign, User, Calendar } from "lucide-react";
import Drawer from "../ui/Drawer";
import Button from "../ui/Button";
import FollowUpsPanel from "../ui/FollowUpsPanel";
import NotesTimeline from "../ui/NotesTimeline";

const stageColors = {
  Lead: "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
  Qualified: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400",
  Proposal: "bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400",
  Negotiation: "bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400",
  Won: "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400",
  Lost: "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400",
};

function DealDetailsDrawer({ deal, open, onClose }) {
  if (!open || !deal) return null;

  const details = [
    { icon: Building2, label: "Customer", value: deal.customer },
    {
      icon: DollarSign,
      label: "Deal Value",
      value: `$${Number(deal.value).toLocaleString()}`,
    },
    { icon: User, label: "Deal Owner", value: deal.owner },
    { icon: Calendar, label: "Expected Close", value: deal.expectedClose },
    { icon: Briefcase, label: "Stage", value: deal.stage },
  ];

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Deal Details"
      footer={
        <Button fullWidth onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="flex flex-col items-center pb-2">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-xl font-bold text-white">
          {deal.title.charAt(0)}
        </div>

        <h3 className="mt-3 text-center text-base font-semibold text-slate-900 dark:text-white">
          {deal.title}
        </h3>

        <span
          className={`mt-2 rounded-full px-3 py-1 text-xs font-medium ${stageColors[deal.stage]}`}
        >
          {deal.stage}
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

      {/* A deal has no email of its own, so contact is left undefined and the
          Email button falls back to explaining that. */}
      <FollowUpsPanel entityType="deal" entityId={deal.id} />
      <NotesTimeline entityType="deal" entityId={deal.id} />
    </Drawer>
  );
}

export default DealDetailsDrawer;
