import { Plus } from "lucide-react";
import PageHeader from "../ui/PageHeader";
import usePermissions from "../../hooks/usePermissions";

function DealsHeader({ onAddDeal, showAddButton = true }) {
  const { can } = usePermissions();

  return (
    <PageHeader
      title="Deals"
      description="Manage your sales opportunities and track every deal."
      action={
        showAddButton && can("deals", "create") && (
          <button
            type="button"
            onClick={onAddDeal}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 sm:w-auto"
          >
            <Plus size={18} />
            Add Deal
          </button>
        )
      }
    />
  );
}

export default DealsHeader;
