import { Plus } from "lucide-react";
import PageHeader from "../ui/PageHeader";
import usePermissions from "../../hooks/usePermissions";

function LeadsHeader({ onAddLead, showAddButton = true }) {
  const { can } = usePermissions();

  return (
    <PageHeader
      title="Leads"
      description="Manage and track potential customers."
      action={
        showAddButton && can("leads", "create") && (
          <button
            type="button"
            onClick={onAddLead}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 sm:w-auto"
          >
            <Plus size={18} />
            Add Lead
          </button>
        )
      }
    />
  );
}

export default LeadsHeader;
