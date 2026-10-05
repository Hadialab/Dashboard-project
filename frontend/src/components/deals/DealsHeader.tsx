import ResourceHeader from "../ui/ResourceHeader";

function DealsHeader({ onAddDeal, showAddButton = true }: { onAddDeal: () => void; showAddButton?: boolean }) {
  return (
    <ResourceHeader
      resource="deals"
      title="Deals"
      description="Manage your sales opportunities and track every deal."
      addLabel="Add Deal"
      onAdd={onAddDeal}
      showAddButton={showAddButton}
    />
  );
}

export default DealsHeader;