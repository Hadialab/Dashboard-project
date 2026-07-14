import { Plus } from "lucide-react";

function CustomersHeader({onAddCustomer}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          Customers
        </h1>

        <p className="mt-2 text-slate-500 dark:text-slate-400">
          Manage all your customers in one place.
        </p>
      </div>

      <button
        onClick={onAddCustomer}
        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-white transition hover:bg-blue-700"
      >
        <Plus size={18} />
        Add Customer
      </button>
    </div>
  );
}

export default CustomersHeader;