import { Eye, Pencil, Trash2, UserCheck } from "lucide-react";
import DetailRow from "../ui/DataCard";
import RowCheckbox from "../ui/RowCheckbox";
import usePermissions from "../../hooks/usePermissions";
import { leadStatusBadge, leadSourceBadge, CONVERTED_STATUS } from "../../utils/crmConstants";
import { formatRelative, formatRelativeShort } from "../../utils/time";
import type { RowSelection } from "../../hooks/useRowSelection";
import type { Lead } from "../../types";

type LeadsTableProps = {
  /** The current page's rows only — pagination happens on the page. */
  leads: Lead[];
  onViewLead: (lead: Lead) => void;
  onEditLead: (lead: Lead) => void;
  onDeleteLead: (lead: Lead) => void;
  onConvertLead: (lead: Lead) => void;
  /** Row selection for the current page. Absent means no checkbox column. */
  selection?: RowSelection;
};

function LeadsTable({
  leads,
  onViewLead,
  onEditLead,
  onDeleteLead,
  onConvertLead,
  selection,
}: LeadsTableProps) {
  const { can } = usePermissions();
  const canEdit = can("leads", "edit");
  const canDelete = can("leads", "delete");

  // Converting writes to two resources, so both permissions are needed before
  // the action is worth offering.
  const canConvert = canEdit && can("customers", "create");

  // Selection is pointless without permission to act on the result.
  const canSelect = canEdit || canDelete;
  const isSelected = canSelect ? (selection?.isSelected ?? (() => false)) : () => false;
  const toggle = canSelect ? (selection?.toggle ?? (() => {})) : () => {};
  const toggleAll = canSelect ? (selection?.toggleAll ?? (() => {})) : () => {};
  const allSelected = selection?.allVisibleSelected?.(leads) ?? false;
  const someSelected = selection?.someVisibleSelected?.(leads) ?? false;

  return (
    <>
      {/* Tablet and up: real table, scrolling inside its own container. */}
      <div className="mt-6 hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm md:block dark:border-slate-800 dark:bg-slate-950">
        <div className="overflow-x-auto">
          <table className="w-full min-w-max">
            <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
              <tr className="text-sm">
                {canSelect && (
                  <th className="w-10 px-2 py-3">
                    <RowCheckbox
                      checked={allSelected}
                      indeterminate={someSelected}
                      onChange={() => toggleAll(leads)}
                      label="Select every lead on this page"
                    />
                  </th>
                )}

                <th className="whitespace-nowrap px-4 py-3 text-left font-semibold">
                  Lead
                </th>

                <th className="whitespace-nowrap px-4 py-3 text-left font-semibold">
                  Company
                </th>

                <th className="hidden whitespace-nowrap px-4 py-3 text-left font-semibold lg:table-cell">
                  Email
                </th>

                <th className="whitespace-nowrap px-4 py-3 text-left font-semibold">
                  Status
                </th>

                <th className="hidden whitespace-nowrap px-4 py-3 text-left font-semibold xl:table-cell">
                  Source
                </th>

                <th className="hidden whitespace-nowrap px-4 py-3 text-left font-semibold xl:table-cell">
                  Assigned Rep
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
              {leads.map((lead) => (
                <tr
                  key={lead.id}
                  className="border-b border-slate-200 text-sm transition last:border-none hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
                >
                  {canSelect && (
                    <td className="px-2 py-3">
                      <RowCheckbox
                        checked={isSelected(lead.id)}
                        onChange={() => toggle(lead.id)}
                        label={`Select ${lead.name}`}
                      />
                    </td>
                  )}

                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
                        {lead.name.charAt(0)}
                      </div>

                      <div className="min-w-0 max-w-[160px]">
                        <p className="truncate font-medium text-slate-900 dark:text-white">
                          {lead.name}
                        </p>
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                          {lead.phone}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="max-w-[180px] truncate px-4 py-3 text-slate-600 dark:text-slate-300">
                    {lead.company}
                  </td>

                  <td className="hidden max-w-[200px] truncate px-4 py-3 text-slate-600 lg:table-cell dark:text-slate-300">
                    {lead.email}
                  </td>

                  <td className="whitespace-nowrap px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${leadStatusBadge(lead.status)}`}
                    >
                      {lead.status}
                    </span>
                  </td>

                  <td className="hidden whitespace-nowrap px-4 py-3 xl:table-cell">
                    <span
                      className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${leadSourceBadge(lead.source)}`}
                    >
                      {lead.source}
                    </span>
                  </td>

                  <td className="hidden whitespace-nowrap px-4 py-3 text-slate-600 xl:table-cell dark:text-slate-300">
                    {lead.assignedRep}
                  </td>

                  <td
                    title={formatRelative(lead.updatedAt)}
                    className="hidden whitespace-nowrap px-4 py-3 text-slate-500 lg:table-cell dark:text-slate-400"
                  >
                    {formatRelativeShort(lead.updatedAt)}
                  </td>

                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => onViewLead(lead)}
                        aria-label={`View ${lead.name}`}
                        className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                      >
                        <Eye size={16} />
                      </button>

                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => onEditLead(lead)}
                          aria-label={`Edit ${lead.name}`}
                          className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                        >
                          <Pencil size={16} />
                        </button>
                      )}

                      {/* Not offered on an already-converted lead: the server
                          refuses, and a second customer for the same person is
                          not something to enable by accident. */}
                      {canConvert && lead.status !== CONVERTED_STATUS && (
                        <button
                          type="button"
                          onClick={() => onConvertLead(lead)}
                          aria-label={`Convert ${lead.name} to a customer`}
                          title="Convert to customer"
                          className="rounded-lg p-2 text-slate-500 transition hover:bg-teal-50 hover:text-teal-600 dark:text-slate-400 dark:hover:bg-teal-900/20 dark:hover:text-teal-400"
                        >
                          <UserCheck size={16} />
                        </button>
                      )}

                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => onDeleteLead(lead)}
                          aria-label={`Delete ${lead.name}`}
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

      {/* Mobile: stacked cards, so no column is ever cut off. */}
      <div className="mt-6 space-y-3 md:hidden">
        {canSelect && leads.length > 0 && (
          <div className="flex items-center gap-2 px-1">
            <RowCheckbox
              checked={allSelected}
              indeterminate={someSelected}
              onChange={() => toggleAll(leads)}
              label="Select every lead on this page"
            />
            <span className="text-sm text-slate-500 dark:text-slate-400">
              Select all on this page
            </span>
          </div>
        )}

        {leads.map((lead) => (
          <div
            key={lead.id}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950"
          >
            <div className="flex items-start gap-3">
              {canSelect && (
                <RowCheckbox
                  checked={isSelected(lead.id)}
                  onChange={() => toggle(lead.id)}
                  label={`Select ${lead.name}`}
                />
              )}

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 font-semibold text-white">
                {lead.name.charAt(0)}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-900 dark:text-white">
                  {lead.name}
                </p>
                <p className="truncate text-sm text-slate-500 dark:text-slate-400">
                  {lead.company}
                </p>
              </div>

              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${leadStatusBadge(lead.status)}`}
              >
                {lead.status}
              </span>
            </div>

            <dl className="mt-3 border-t border-slate-100 pt-1 dark:border-slate-800">
              <DetailRow label="Email" value={lead.email} />
              <DetailRow label="Phone" value={lead.phone} />
              <DetailRow label="Source" value={lead.source} />
              <DetailRow label="Assigned Rep" value={lead.assignedRep} />
              <DetailRow label="Last updated" value={formatRelative(lead.updatedAt)} />
            </dl>

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => onViewLead(lead)}
                className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                <Eye size={16} />
                View
              </button>

              {canEdit && (
                <button
                  type="button"
                  onClick={() => onEditLead(lead)}
                  className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
                >
                  <Pencil size={16} />
                  Edit
                </button>
              )}

              {canConvert && lead.status !== CONVERTED_STATUS && (
                <button
                  type="button"
                  onClick={() => onConvertLead(lead)}
                  className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
                >
                  <UserCheck size={16} />
                  Convert
                </button>
              )}

              {canDelete && (
                <button
                  type="button"
                  onClick={() => onDeleteLead(lead)}
                  className="flex min-h-11 items-center justify-center rounded-lg border border-red-200 px-4 text-red-600 transition hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
                  aria-label={`Delete ${lead.name}`}
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

export default LeadsTable;
