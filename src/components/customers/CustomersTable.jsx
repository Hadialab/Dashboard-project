import { Eye, Pencil, Trash2 } from "lucide-react";


const statusColors = {
  Active:
    "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400",

  Pending:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400",

  Inactive:
    "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400",
};

function CustomersTable({ customers,onView}) {
  return (
    <div className="mt-4 sm:mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="overflow-x-auto">
        <table className="w-full min-w-max">
          <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
            <tr className="text-xs sm:text-sm">
              <th className="px-3 py-3 sm:px-6 sm:py-4 text-left font-semibold whitespace-nowrap">
                Customer
              </th>

              <th className="px-3 py-3 sm:px-6 sm:py-4 text-left font-semibold whitespace-nowrap">
                Company
              </th>

              <th className="hidden px-3 py-3 sm:px-6 sm:py-4 text-left font-semibold whitespace-nowrap md:table-cell">
                Email
              </th>

              <th className="px-3 py-3 sm:px-6 sm:py-4 text-left font-semibold whitespace-nowrap">
                Status
              </th>

              <th className="px-3 py-3 sm:px-6 sm:py-4 text-center font-semibold whitespace-nowrap">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {customers.map((customer) => (
              <tr
                key={customer.id}
                className="border-b border-slate-200 transition text-xs sm:text-sm hover:bg-slate-50 last:border-none dark:border-slate-800 dark:hover:bg-slate-900"
              >
                <td className="px-3 py-3 sm:px-6 sm:py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-blue-600 font-semibold text-white text-xs sm:text-sm flex-shrink-0">
                      {customer.name.charAt(0)}
                    </div>

                    <span className="font-medium text-slate-900 dark:text-white truncate">
                      {customer.name}
                    </span>
                  </div>
                </td>

                <td className="px-3 py-3 sm:px-6 sm:py-4 text-slate-600 dark:text-slate-300 truncate">
                  {customer.company}
                </td>

                <td className="hidden px-3 py-3 sm:px-6 sm:py-4 text-slate-600 dark:text-slate-300 truncate md:table-cell text-xs">
                  {customer.email}
                </td>

                <td className="px-3 py-3 sm:px-6 sm:py-4 whitespace-nowrap">
                  <span
                    className={`rounded-full px-2 py-0.5 sm:px-3 sm:py-1 text-xs font-semibold inline-block ${statusColors[customer.status]}`}
                  >
                    {customer.status}
                  </span>
                </td>

                <td className="px-3 py-3 sm:px-6 sm:py-4 whitespace-nowrap">
                  <div className="flex justify-center gap-1 sm:gap-2">
                    <button onClick={()=>onView(customer)} className="rounded-lg p-1.5 sm:p-2 transition hover:bg-slate-100 dark:hover:bg-slate-800">
                      <Eye size={16} className="sm:w-[18px] sm:h-[18px]" />
                    </button>

                    <button className="rounded-lg p-1.5 sm:p-2 transition hover:bg-slate-100 dark:hover:bg-slate-800">
                      <Pencil size={16} className="sm:w-[18px] sm:h-[18px]" />
                    </button>

                    <button className="rounded-lg p-1.5 sm:p-2 text-red-500 transition hover:bg-red-50 dark:hover:bg-red-900/20">
                      <Trash2 size={16} className="sm:w-[18px] sm:h-[18px]" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default CustomersTable;