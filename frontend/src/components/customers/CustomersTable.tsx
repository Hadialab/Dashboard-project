import { Eye, Pencil, Trash2 } from "lucide-react";
import DetailRow from "../ui/DataCard";
import RowCheckbox from "../ui/RowCheckbox";
import usePermissions from "../../hooks/usePermissions";
import { customerStatusBadge } from "../../utils/crmConstants";
import { formatRelative, formatRelativeShort } from "../../utils/time";
import type { RowSelection } from "../../hooks/useRowSelection";
import type { Customer } from "../../types";

/**
 * The Customers list, rendered twice: as a real table above md and as stacked
 * cards below it, so the same data never gets cut off on a phone.
 *
 * The three row handlers are separate rather than one `onRowAction`, so the page
 * gets each decision as its own call rather than this component deciding what an
 * action name means.
 *
 * `selection` comes from useRowSelection and is optional: a page may render the
 * rows without offering selection, and every access below is optional-chained
 * rather than assumed present.
 */
type CustomersTableProps = {
  customers: Customer[];
  onView: (customer: Customer) => void;
  onEditCustomer: (customer: Customer) => void;
  onDeleteCustomer: (customer: Customer) => void;
  /** Row selection for the current page. Absent means no checkbox column. */
  selection?: RowSelection;
};

function CustomersTable({
  customers,
  onView,
  onEditCustomer,
  onDeleteCustomer,
  selection,
}: CustomersTableProps) {
  const { can } = usePermissions();
  const canEdit = can("customers", "edit");
  const canDelete = can("customers", "delete");

  // Selection is pointless without permission to act on the result, so the
  // checkbox column disappears entirely for a read-only user.
  const canSelect = canEdit || canDelete;
  const isSelected = canSelect ? (selection?.isSelected ?? (() => false)) : () => false;
  const toggle = canSelect ? (selection?.toggle ?? (() => {})) : () => {};
  const toggleAll = canSelect ? (selection?.toggleAll ?? (() => {})) : () => {};
  const allSelected = selection?.allVisibleSelected?.(customers) ?? false;
  const someSelected = selection?.someVisibleSelected?.(customers) ?? false;

  return (
    <>
      {/* Desktop and tablet: a real table that scrolls inside its own
          container, so it never pushes the page sideways. */}
      <div className="mt-4 hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm md:block dark:border-slate-800 dark:bg-slate-950">
        <div className="overflow-x-auto">
          <table className="w-full min-w-max">
            <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
              <tr className="text-xs sm:text-sm">
                {canSelect && (
                  <th className="w-10 px-2 py-3 lg:px-3 lg:py-4">
                    <RowCheckbox
                      checked={allSelected}
                      indeterminate={someSelected}
                      onChange={() => toggleAll(customers)}
                      label="Select every customer on this page"
                    />
                  </th>
                )}

                <th className="whitespace-nowrap px-4 py-3 text-left font-semibold lg:px-6 lg:py-4">
                  Customer
                </th>

                <th className="whitespace-nowrap px-4 py-3 text-left font-semibold lg:px-6 lg:py-4">
                  Company
                </th>

                <th className="hidden whitespace-nowrap px-4 py-3 text-left font-semibold lg:table-cell lg:px-6 lg:py-4">
                  Email
                </th>

                <th className="whitespace-nowrap px-4 py-3 text-left font-semibold lg:px-6 lg:py-4">
                  Status
                </th>

                <th
                  title="Last updated"
                  className="hidden whitespace-nowrap px-4 py-3 text-left font-semibold xl:table-cell lg:px-6 lg:py-4"
                >
                  Updated
                </th>

                <th className="whitespace-nowrap px-4 py-3 text-center font-semibold lg:px-6 lg:py-4">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {customers.map((customer) => (
                <tr
                  key={customer.id}
                  className="border-b border-slate-200 text-sm transition last:border-none hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
                >
                  {canSelect && (
                    <td className="px-2 py-3 lg:px-3 lg:py-4">
                      <RowCheckbox
                        checked={isSelected(customer.id)}
                        onChange={() => toggle(customer.id)}
                        label={`Select ${customer.name}`}
                      />
                    </td>
                  )}

                  <td className="whitespace-nowrap px-4 py-3 lg:px-6 lg:py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
                        {customer.name.charAt(0)}
                      </div>

                      <span className="truncate font-medium text-slate-900 dark:text-white">
                        {customer.name}
                      </span>
                    </div>
                  </td>

                  <td className="truncate px-4 py-3 text-slate-600 lg:px-6 lg:py-4 dark:text-slate-300">
                    {customer.company}
                  </td>

                  <td className="hidden truncate px-4 py-3 text-slate-600 lg:table-cell lg:px-6 lg:py-4 dark:text-slate-300">
                    {customer.email}
                  </td>

                  <td className="whitespace-nowrap px-4 py-3 lg:px-6 lg:py-4">
                    <span
                      className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${customerStatusBadge(customer.status)}`}
                    >
                      {customer.status}
                    </span>
                  </td>

                  <td
                    title={formatRelative(customer.updatedAt)}
                    className="hidden whitespace-nowrap px-4 py-3 text-slate-500 xl:table-cell lg:px-6 lg:py-4 dark:text-slate-400"
                  >
                    {formatRelativeShort(customer.updatedAt)}
                  </td>

                  <td className="whitespace-nowrap px-4 py-3 lg:px-6 lg:py-4">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => onView(customer)}
                        aria-label={`View ${customer.name}`}
                        className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                      >
                        <Eye size={16} />
                      </button>

                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => onEditCustomer(customer)}
                          aria-label={`Edit ${customer.name}`}
                          className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                        >
                          <Pencil size={16} />
                        </button>
                      )}

                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => onDeleteCustomer(customer)}
                          aria-label={`Delete ${customer.name}`}
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

      {/* Mobile: the same data as a stacked card list, so nothing is cut off
          and every action is a full-width tap target. */}
      <div className="mt-4 space-y-3 md:hidden">
        {canSelect && customers.length > 0 && (
          <div className="flex items-center gap-2 px-1">
            <RowCheckbox
              checked={allSelected}
              indeterminate={someSelected}
              onChange={() => toggleAll(customers)}
              label="Select every customer on this page"
            />
            <span className="text-sm text-slate-500 dark:text-slate-400">
              Select all on this page
            </span>
          </div>
        )}

        {customers.map((customer) => (
          <div
            key={customer.id}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950"
          >
            <div className="flex items-start gap-3">
              {canSelect && (
                <RowCheckbox
                  checked={isSelected(customer.id)}
                  onChange={() => toggle(customer.id)}
                  label={`Select ${customer.name}`}
                />
              )}

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 font-semibold text-white">
                {customer.name.charAt(0)}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-900 dark:text-white">
                  {customer.name}
                </p>
                <p className="truncate text-sm text-slate-500 dark:text-slate-400">
                  {customer.company}
                </p>
              </div>

              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${customerStatusBadge(customer.status)}`}
              >
                {customer.status}
              </span>
            </div>

            <dl className="mt-3 border-t border-slate-100 pt-1 dark:border-slate-800">
              <DetailRow label="Email" value={customer.email} />
              <DetailRow label="Phone" value={customer.phone} />
              <DetailRow
                label="Last updated"
                value={formatRelative(customer.updatedAt)}
              />
            </dl>

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => onView(customer)}
                className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                <Eye size={16} />
                View
              </button>

              {canEdit && (
                <button
                  type="button"
                  onClick={() => onEditCustomer(customer)}
                  className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
                >
                  <Pencil size={16} />
                  Edit
                </button>
              )}

              {canDelete && (
                <button
                  type="button"
                  onClick={() => onDeleteCustomer(customer)}
                  className="flex min-h-11 items-center justify-center rounded-lg border border-red-200 px-4 text-red-600 transition hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
                  aria-label={`Delete ${customer.name}`}
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

export default CustomersTable;
