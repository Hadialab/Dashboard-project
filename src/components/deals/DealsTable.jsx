import { Eye, Pencil, Trash2 } from "lucide-react";

const stageColors = {
  Lead:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",

  Qualified:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400",

  Proposal:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400",

  Negotiation:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400",

  Won:
    "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400",

  Lost:
    "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400",
};

function DealsTable({
  deals,
  onViewDeal,
  onEditDeal,
  onDeleteDeal,
}) {
  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="overflow-x-auto">
        <table className="w-full table-fixed">
          <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
            <tr className="text-xs sm:text-sm">
              <th className="px-2 py-2.5 text-left font-semibold sm:px-4 sm:py-3">
                Deal
              </th>

              <th className="px-2 py-2.5 text-left font-semibold sm:px-4 sm:py-3">
                Customer
              </th>

              <th className="px-2 py-2.5 text-left font-semibold sm:px-4 sm:py-3">
                Value
              </th>

              <th className="hidden sm:table-cell px-2 py-2.5 text-left font-semibold sm:px-4 sm:py-3">
                Stage
              </th>

              <th className="hidden lg:table-cell px-2 py-2.5 text-left font-semibold sm:px-4 sm:py-3">
                Owner
              </th>

              <th className="hidden xl:table-cell px-2 py-2.5 text-left font-semibold sm:px-4 sm:py-3">
                Expected Close
              </th>

              <th className="px-2 py-2.5 text-center font-semibold sm:px-4 sm:py-3">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {deals.map((deal) => (
              <tr
                key={deal.id}
                className="border-b border-slate-200 text-xs transition hover:bg-slate-50 last:border-none dark:border-slate-800 dark:hover:bg-slate-900 sm:text-sm"
              >
                {/* Deal */}
                <td className="px-2 py-2.5 sm:px-4 sm:py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
                      {deal.title.charAt(0)}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-900 dark:text-white">
                        {deal.title}
                      </p>
                    </div>
                  </div>
                </td>

                {/* Customer */}
                <td className="max-w-[140px] truncate px-2 py-2.5 text-slate-600 dark:text-slate-300 sm:px-4 sm:py-3">
                  {deal.customer}
                </td>

                {/* Value */}
                <td className="px-2 py-2.5 font-medium text-slate-900 dark:text-white sm:px-4 sm:py-3">
                  ${Number(deal.value).toLocaleString()}
                </td>

                {/* Stage */}
                <td className="hidden whitespace-nowrap px-2 py-2.5 sm:table-cell sm:px-4 sm:py-3">
                  <span
                    className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                      stageColors[deal.stage]
                    }`}
                  >
                    {deal.stage}
                  </span>
                </td>

                {/* Owner */}
                <td className="hidden px-2 py-2.5 text-slate-600 dark:text-slate-300 lg:table-cell sm:px-4 sm:py-3">
                  {deal.owner}
                </td>

                {/* Expected Close */}
                <td className="hidden px-2 py-2.5 text-slate-600 dark:text-slate-300 xl:table-cell sm:px-4 sm:py-3">
                  {deal.expectedClose}
                </td>

                {/* Actions */}
                <td className="px-2 py-2.5 sm:px-4 sm:py-3">
                  <div className="flex justify-center gap-1">
                    <button
                      onClick={() => onViewDeal(deal)}
                      className="rounded-md p-1 transition hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <Eye size={14} />
                    </button>

                    <button
                      onClick={() => onEditDeal(deal)}
                      className="rounded-md p-1 transition hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <Pencil size={14} />
                    </button>

                    <button
                      onClick={() => onDeleteDeal(deal)}
                      className="rounded-md p-1 transition hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 size={14} />
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

export default DealsTable;