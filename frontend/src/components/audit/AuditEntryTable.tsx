import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import type { AuditChange, AuditEntry } from "../../types";
import { formatRelative } from "../../utils/time";
import { ACTION_LABELS, ENTITY_LABELS } from "./AuditFilterBar";

/**
 * The log as a table.
 *
 * One row per mutation, with the changed fields collapsed behind a toggle rather
 * than shown inline. Full fidelity means a permission change can carry sixteen
 * fields, so a table that showed them all would be unreadable at a glance — and
 * the glance is the common case: someone skimming for the odd entry, not
 * auditing one specific record.
 *
 * The record link is offered per entity type because each has its own detail
 * route. Unknown types simply get no link rather than a broken one.
 */

const RECORD_ROUTES: Record<string, (id: string) => string> = {
  customer: (id) => `/customers/${id}`,
  lead: (id) => `/leads/${id}`,
  deal: (id) => `/deals/${id}`,
};

const EM_DASH = "—";

/**
 * Renders one value from the `changes` map.
 *
 * Null on either side means the field was absent, and it reads as an em dash
 * rather than the string "null" — the distinction between "cleared" and "was
 * never set" is real but not worth a full sentence in a table cell.
 *
 * Objects (a permissions blob) are rendered as JSON rather than as
 * "[object Object]", which is what a naive String() would give.
 */
function formatValue(value: AuditChange["from"]): string {
  if (value === null || value === undefined) return EM_DASH;
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (typeof value === "object") return JSON.stringify(value);
  if (value === "") return "(blank)";

  return String(value);
}

/** `from → to`, or just the new value when there was nothing before. */
function describeChange(change: AuditChange): string {
  return `${formatValue(change.from)} → ${formatValue(change.to)}`;
}

/** Action colours. Only the three that matter get a colour; the rest stay quiet. */
const ACTION_STYLES: Record<string, string> = {
  create: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  delete: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  permission_change:
    "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
};

type AuditEntryTableProps = {
  entries: AuditEntry[];
  /** Called when a row's record link is followed. Injected by the page. */
  onNavigate?: (path: string) => void;
};

function AuditEntryTable({ entries, onNavigate }: AuditEntryTableProps) {
  // Expanded row ids, rather than a single index: an audit read often involves
  // comparing two entries, and a single-expand table makes that impossible.
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setExpanded((current) => {
      const next = new Set(current);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
      <table className="min-w-full divide-y divide-slate-200 text-left text-sm dark:divide-slate-800">
        <thead className="bg-slate-50 dark:bg-slate-900">
          <tr>
            <th scope="col" className="w-10 px-3 py-3" />
            <th
              scope="col"
              className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
            >
              When
            </th>
            <th
              scope="col"
              className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
            >
              Who
            </th>
            <th
              scope="col"
              className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
            >
              What
            </th>
            <th
              scope="col"
              className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
            >
              Changes
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800/60 dark:bg-slate-950">
          {entries.map((entry) => {
            const fields = Object.entries(entry.changes ?? {});
            const isOpen = expanded.has(entry.id);
            const route = RECORD_ROUTES[entry.entityType]?.(entry.entityId);

            return (
              <tr key={entry.id} className="align-top">
                <td className="px-3 py-3">
                  {/* Rendered as a button, not a checkbox: this is a disclosure,
                      and a checkbox implies a selection the table does not have. */}
                  <button
                    type="button"
                    onClick={() => toggle(entry.id)}
                    aria-expanded={isOpen}
                    aria-label={isOpen ? "Hide changes" : "Show changes"}
                    className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                  >
                    {isOpen ? (
                      <ChevronDown size={16} aria-hidden="true" />
                    ) : (
                      <ChevronRight size={16} aria-hidden="true" />
                    )}
                  </button>
                </td>

                <td className="whitespace-nowrap px-3 py-3 text-slate-600 dark:text-slate-300">
                  <time dateTime={entry.createdAt} title={entry.createdAt}>
                    {formatRelative(entry.createdAt)}
                  </time>
                </td>

                <td className="whitespace-nowrap px-3 py-3">
                  <span className="font-medium text-slate-900 dark:text-white">
                    {entry.actorName}
                  </span>
                  {/* A null id means the account is gone. Worth saying out loud,
                      because the entry is still here and its author is not. */}
                  {entry.actorId === null && (
                    <span className="ml-2 text-xs text-slate-400">(account removed)</span>
                  )}
                </td>

                <td className="px-3 py-3">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      ACTION_STYLES[entry.action] ??
                      "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {ACTION_LABELS[entry.action]}
                  </span>
                  {/* The label is the record's name, not its id: an auditor
                      scanning the log should be able to recognise a record
                      without looking it up. The id stays visible alongside it, so
                      a renamed record can still be traced back. */}
                  <span className="ml-2 text-slate-600 dark:text-slate-300">
                    {ENTITY_LABELS[entry.entityType]}
                    {entry.entityLabel ? (
                      <>
                        <span className="ml-1 font-medium text-slate-900 dark:text-white">
                          {entry.entityLabel}
                        </span>
                        {route && onNavigate ? (
                          <button
                            type="button"
                            onClick={() => onNavigate(route)}
                            className="ml-1 text-blue-600 hover:underline dark:text-blue-400"
                          >
                            {entry.entityId}
                          </button>
                        ) : (
                          <span className="ml-1 text-slate-400">{entry.entityId}</span>
                        )}
                      </>
                    ) : (
                      // No usable name: the id alone, and nothing invented.
                      <span className="ml-1 text-slate-400">{entry.entityId}</span>
                    )}
                  </span>
                </td>

                <td className="px-3 py-3">
                  {fields.length === 0 ? (
                    // Legitimate, not a bug: a delete that recorded nothing, or an
                    // update where nothing actually differed.
                    <span className="text-xs text-slate-400">No field values recorded</span>
                  ) : (
                    <>
                      <span className="text-slate-600 dark:text-slate-300">
                        {fields.length} field{fields.length === 1 ? "" : "s"}
                      </span>
                      {isOpen && (
                        <ul className="mt-2 space-y-1.5 border-l-2 border-slate-200 pl-3 dark:border-slate-800">
                          {fields.map(([field, change]) => (
                            <li
                              key={field}
                              className="flex flex-col gap-0.5 text-xs sm:flex-row sm:gap-2"
                            >
                              <span className="font-medium text-slate-700 sm:w-40 sm:shrink-0 dark:text-slate-200">
                                {field}
                              </span>
                              <span className="text-slate-600 dark:text-slate-300">
                                {describeChange(change)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default AuditEntryTable;