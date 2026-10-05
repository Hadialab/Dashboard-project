import ResourceHeader from "../ui/ResourceHeader";

function LeadsHeader({ onAddLead, showAddButton = true }: { onAddLead: () => void; showAddButton?: boolean }) {
  return (
    <ResourceHeader
      resource="leads"
      title="Leads"
      description="Manage and track potential customers."
      addLabel="Add Lead"
      onAdd={onAddLead}
      showAddButton={showAddButton}
    />
  );
}

export default LeadsHeader;