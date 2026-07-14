import { Eye, Pencil, Trash2 } from "lucide-react";


const statusColors = {
  Active:
    "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400",

  Pending:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400",

  Inactive:
    "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400",
};

function CustomersTable({ customers}) {
  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <table className="w-full">
        <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
          <tr>
            <th className="px-6 py-4 text-left text-sm font-semibold">
              Customer
            </th>

            <th className="px-6 py-4 text-left text-sm font-semibold">
              Company
            </th>

            <th className="px-6 py-4 text-left text-sm font-semibold">
              Email
            </th>

            <th className="px-6 py-4 text-left text-sm font-semibold">
              Status
            </th>

            <th className="px-6 py-4 text-center text-sm font-semibold">
              Actions
            </th>
          </tr>
        </thead>

        <tbody>
          {customers.map((customer) => (
            <tr
              key={customer.id}
              className="border-b border-slate-200 transition hover:bg-slate-50 last:border-none dark:border-slate-800 dark:hover:bg-slate-900"
            >
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 font-semibold text-white">
                    {customer.name.charAt(0)}
                  </div>

                  <span className="font-medium text-slate-900 dark:text-white">
                    {customer.name}
                  </span>
                </div>
              </td>

              <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                {customer.company}
              </td>

              <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                {customer.email}
              </td>

              <td className="px-6 py-4">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColors[customer.status]}`}
                >
                  {customer.status}
                </span>
              </td>

              <td className="px-6 py-4">
                <div className="flex justify-center gap-2">
                  <button className="rounded-lg p-2 transition hover:bg-slate-100 dark:hover:bg-slate-800">
                    <Eye size={18} />
                  </button>

                  <button className="rounded-lg p-2 transition hover:bg-slate-100 dark:hover:bg-slate-800">
                    <Pencil size={18} />
                  </button>

                  <button className="rounded-lg p-2 text-red-500 transition hover:bg-red-50 dark:hover:bg-red-900/20">
                    <Trash2 size={18} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default CustomersTable;