import ResourceHeader from "../ui/ResourceHeader";

function CustomersHeader({
  onAddCustomer,
  showAddButton = true,
}: {
  onAddCustomer: () => void;
  showAddButton?: boolean;
}) {
  return (
    <ResourceHeader
      resource="customers"
      title="Customers"
      description="Manage all your customers in one place."
      addLabel="Add Customer"
      onAdd={onAddCustomer}
      showAddButton={showAddButton}
    />
  );
}

export default CustomersHeader;