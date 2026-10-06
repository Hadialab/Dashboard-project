import { CalendarRange, RotateCcw } from "lucide-react";

import Button from "../ui/Button";
import Select from "../ui/Select";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "../../types";
import type { AuditAction, AuditEntityType, AuditFilters } from "../../types";

/**
 * The human phrasing for each action.
 *
 * Written out rather than derived from the value: "permission_change" is a fine
 * machine name and a poor sentence, and the audit view is read by people looking
 * for something to be alarmed about.
 */
const ACTION_LABELS: Record<AuditAction, string> = {
  create: "Created",
  update: "Changed",
  delete: "Deleted",
  convert: "Converted",
  permission_change: "Access changed",
  password_change: "Password changed",
};

const ENTITY_LABELS: Record<AuditEntityType, string> = {
  customer: "Customer",
  lead: "Lead",
  deal: "Deal",
  user: "Team member",
};

/** Exports for the table, so the two never disagree about a label. */
export { ACTION_LABELS, ENTITY_LABELS };

type AuditFilterBarProps = {
  filters: AuditFilters;
  onChange: (filters: AuditFilters) => void;
  /** Everyone with an entry, so the actor filter never offers a dead end. */
  actors: { id: number | null; name: string }[];
};

function AuditFilterBar({ filters, onChange, actors }: AuditFilterBarProps) {
  /** Sets one filter and resets the page, so a narrowed result starts at page 1. */
  function update(patch: Partial<AuditFilters>) {
    onChange({ ...filters, ...patch, offset: 0 });
  }

  const hasFilters = Boolean(
    filters.actorId || filters.actorName || filters.entityType || filters.entityId || filters.action || filters.from || filters.to,
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Select
          label="Who"
          name="actor"
          value={filters.actorId ? String(filters.actorId) : ""}
          onChange={(event) => {
            const value = event.target.value;

            // Cleared as null rather than "", so the request omits it instead of
            // sending a filter that matches nothing.
            const actor = actors.find((a) => String(a.id) === value);
            update({ actorId: actor?.id ?? null, actorName: null });
          }}
        >
          <option value="">Anyone</option>
          {actors.map((actor) => (
            <option key={actor.id ?? actor.name} value={actor.id ?? ""}>
              {actor.name}
              {actor.id === null ? " (account removed)" : ""}
            </option>
          ))}
        </Select>

        <Select
          label="What"
          name="entityType"
          value={filters.entityType ?? ""}
          onChange={(event) =>
            update({ entityType: (event.target.value || null) as AuditEntityType | null })
          }
        >
          <option value="">Anything</option>
          {AUDIT_ENTITY_TYPES.map((type) => (
            <option key={type} value={type}>
              {ENTITY_LABELS[type]}
            </option>
          ))}
        </Select>

        <Select
          label="Action"
          name="action"
          value={filters.action ?? ""}
          onChange={(event) => update({ action: (event.target.value || null) as AuditAction | null })}
        >
          <option value="">Any action</option>
          {AUDIT_ACTIONS.map((action) => (
            <option key={action} value={action}>
              {ACTION_LABELS[action]}
            </option>
          ))}
        </Select>

        <div className="space-y-2">
          <label
            htmlFor="audit-entity-id"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Record ID
          </label>
          <input
            id="audit-entity-id"
            type="search"
            value={filters.entityId ?? ""}
            onChange={(event) => update({ entityId: event.target.value || null })}
            placeholder="c041"
            className="min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="audit-from"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            From
          </label>
          <input
            id="audit-from"
            type="date"
            value={filters.from ?? ""}
            onChange={(event) => update({ from: event.target.value || null })}
            className="min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="audit-to"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            To
          </label>
          <input
            id="audit-to"
            type="date"
            value={filters.to ?? ""}
            onChange={(event) => update({ to: event.target.value || null })}
            className="min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>

        <div className="flex items-end">
          <Button
            variant="secondary"
            onClick={() =>
              onChange({
                actorId: null,
                actorName: null,
                entityType: null,
                entityId: null,
                action: null,
                from: null,
                to: null,
                offset: 0,
              })
            }
            disabled={!hasFilters}
            icon={RotateCcw}
          >
            Clear filters
          </Button>
        </div>
      </div>

      <p className="mt-3 flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
        <CalendarRange size={14} aria-hidden="true" className="mt-0.5 shrink-0" />
        Dates are matched in UTC, so a day boundary here matches the timestamps shown
        in the table below.
      </p>
    </div>
  );
}

export default AuditFilterBar;