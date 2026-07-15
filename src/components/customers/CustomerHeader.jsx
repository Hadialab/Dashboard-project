import { Plus } from "lucide-react";

function CustomersHeader({onAddCustomer, showAddButton = true}) {
  return (
    <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
          Customers
        </h1>

        <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Manage all your customers in one place.
        </p>
      </div>

        {showAddButton && (  
      <button
        onClick={onAddCustomer}
        className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 sm:px-5 sm:py-3 text-sm sm:text-base text-white transition hover:bg-blue-700"
      >
        <Plus size={18} />
        Add Customer
      </button>)}


    </div>
  );
}

export default CustomersHeader;