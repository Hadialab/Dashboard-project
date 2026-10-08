import { Eye, Pencil, Trash2 } from "lucide-react";
import DetailRow from "../ui/DataCard";
import usePermissions from "../../hooks/usePermissions";
import { stageBadge } from "../../utils/crmConstants";
import { formatRelative, formatRelativeShort } from "../../utils/time";

function DealsTable({ deals, onViewDeal, onEditDeal, onDeleteDeal }) {
  const { can } = usePermissions();
  const canEdit = can("deals", "edit");
  const canDelete = can("deals", "delete");

  return (
    <>
      {/* Tablet and up: table. Deal, Customer, Value and Actions always show;
          Stage from sm, Owner from lg, Expected Close from xl. */}
      <div className="mt-4 hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm md:block dark:border-slate-800 dark:bg-slate-950">
        <div className="overflow-x-auto">
          <table className="w-full min-w-max">
            <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
              <tr className="text-sm">
                <th className="whitespace-nowrap px-4 py-3 text-left font-semibold">
                  Deal
                </th>

                <th className="whitespace-nowrap px-4 py-3 text-left font-semibold">
                  Customer
                </th>

                <th className="whitespace-nowrap px-4 py-3 text-left font-semibold">
                  Value
                </th>

                <th className="whitespace-nowrap px-4 py-3 text-left font-semibold">
                  Stage
                </th>

                <th className="hidden whitespace-nowrap px-4 py-3 text-left font-semibold lg:table-cell">
                  Owner
                </th>

                <th className="hidden whitespace-nowrap px-4 py-3 text-left font-semibold xl:table-cell">
                  Expected Close
                </th>

                <th
                  title="Last updated"
                  className="hidden whitespace-nowrap px-4 py-3 text-left font-semibold lg:table-cell"
                >
                  Updated
                </th>

                <th className="whitespace-nowrap px-4 py-3 text-center font-semibold">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {deals.map((deal) => (
                <tr
                  key={deal.id}
                  className="border-b border-slate-200 text-sm transition last:border-none hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
                >
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
                        {deal.title.charAt(0)}
                      </div>

                      <p className="max-w-[180px] truncate font-medium text-slate-900 dark:text-white">
                        {deal.title}
                      </p>
                    </div>
                  </td>

                  <td className="max-w-[160px] truncate px-4 py-3 text-slate-600 dark:text-slate-300">
                    {deal.customer}
                  </td>

                  <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900 dark:text-white">
                    ${Number(deal.value).toLocaleString()}
                  </td>

                  <td className="whitespace-nowrap px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${stageBadge(deal.stage)}`}
                    >
                      {deal.stage}
                    </span>
                  </td>

                  <td className="hidden whitespace-nowrap px-4 py-3 text-slate-600 lg:table-cell dark:text-slate-300">
                    {deal.owner}
                  </td>

                  <td className="hidden whitespace-nowrap px-4 py-3 text-slate-600 xl:table-cell dark:text-slate-300">
                    {deal.expectedClose}
                  </td>

                  <td
                    title={formatRelative(deal.updatedAt)}
                    className="hidden whitespace-nowrap px-4 py-3 text-slate-500 lg:table-cell dark:text-slate-400"
                  >
                    {formatRelativeShort(deal.updatedAt)}
                  </td>

                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => onViewDeal(deal)}
                        aria-label={`View ${deal.title}`}
                        className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                      >
                        <Eye size={16} />
                      </button>

                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => onEditDeal(deal)}
                          aria-label={`Edit ${deal.title}`}
                          className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                        >
                          <Pencil size={16} />
                        </button>
                      )}

                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => onDeleteDeal(deal)}
                          aria-label={`Delete ${deal.title}`}
                          className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile: stacked cards showing every field. */}
      <div className="mt-4 space-y-3 md:hidden">
        {deals.map((deal) => (
          <div
            key={deal.id}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 font-semibold text-white">
                {deal.title.charAt(0)}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-900 dark:text-white">
                  {deal.title}
                </p>
                <p className="truncate text-sm text-slate-500 dark:text-slate-400">
                  {deal.customer}
                </p>
              </div>

              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${stageBadge(deal.stage)}`}
              >
                {deal.stage}
              </span>
            </div>

            <dl className="mt-3 border-t border-slate-100 pt-1 dark:border-slate-800">
              <DetailRow label="Value" value={`$${Number(deal.value).toLocaleString()}`} />
              <DetailRow label="Owner" value={deal.owner} />
              <DetailRow label="Expected Close" value={deal.expectedClose} />
              <DetailRow label="Last updated" value={formatRelative(deal.updatedAt)} />
            </dl>

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => onViewDeal(deal)}
                className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                <Eye size={16} />
                View
              </button>

              {canEdit && (
                <button
                  type="button"
                  onClick={() => onEditDeal(deal)}
                  className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
                >
                  <Pencil size={16} />
                  Edit
                </button>
              )}

              {canDelete && (
                <button
                  type="button"
                  onClick={() => onDeleteDeal(deal)}
                  className="flex min-h-11 items-center justify-center rounded-lg border border-red-200 px-4 text-red-600 transition hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
                  aria-label={`Delete ${deal.title}`}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export default DealsTable;
