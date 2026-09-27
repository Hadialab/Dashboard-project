import { Plus } from "lucide-react";
import PageHeader from "../ui/PageHeader";

function CustomersHeader({ onAddCustomer, showAddButton = true }) {
  return (
    <PageHeader
      title="Customers"
      description="Manage all your customers in one place."
      action={
        showAddButton && (
          <button
            type="button"
            onClick={onAddCustomer}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 sm:w-auto"
          >
            <Plus size={18} />
            Add Customer
          </button>
        )
      }
    />
  );
}

export default CustomersHeader;
