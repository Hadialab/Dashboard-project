import { Plus } from "lucide-react";
import PageHeader from "../ui/PageHeader";
import usePermissions from "../../hooks/usePermissions";
import type { PermissionResource } from "../../types";

type HeaderProps = {
  /** Opens the create dialog. */
  onAdd: () => void;
  /**
   * Hidden when the list is empty. On a first-run company the page renders its
   * own empty state with a call to action, so two identical buttons would both
   * be on screen at once.
   */
  showAddButton?: boolean;
  /** The resource whose `create` permission gates the button. */
  resource: PermissionResource;
  title: string;
  description: string;
  addLabel: string;
};

function ResourceHeader({
  onAdd,
  showAddButton = true,
  resource,
  title,
  description,
  addLabel,
}: HeaderProps) {
  const { can } = usePermissions();

  return (
    <PageHeader
      title={title}
      description={description}
      action={
        showAddButton && can(resource, "create") && (
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 sm:w-auto"
          >
            <Plus size={18} aria-hidden="true" />
            {addLabel}
          </button>
        )
      }
    />
  );
}

export default ResourceHeader;