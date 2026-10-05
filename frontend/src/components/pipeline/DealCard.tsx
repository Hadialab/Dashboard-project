import { Calendar, GripVertical, User } from "lucide-react";
import type { DragEvent } from "react";

import { DEAL_STAGES, isOneOf } from "../../utils/crmConstants";
import { formatMoney } from "../../utils/chartFormat";
import type { Deal, DealStage } from "../../types";

type DealCardProps = {
  deal: Deal;
  onOpen: (deal: Deal) => void;
  onMoveStage: (deal: Deal, stage: DealStage) => void;
  onDragStart?: (event: DragEvent<HTMLDivElement>, deal: Deal) => void;
  canEdit: boolean;
  isDragging: boolean;
};

/**
 * One deal on the pipeline board.
 *
 * Draggable via native HTML5 drag-and-drop, which needs no dependency. That API
 * has no touch equivalent at all, so the card also carries an explicit stage
 * picker: on a phone, and for anyone using a keyboard or a screen reader, that
 * select is the only way to move a deal and it works everywhere.
 *
 * The card is a button, not a div with a click handler, so Enter opens it and it
 * is reachable by tab.
 */
function DealCard({ deal, onOpen, onMoveStage, onDragStart, canEdit, isDragging }: DealCardProps) {
  // NUMERIC arrives from pg as a string, so this is a real conversion rather than
  // a defensive one — `Number(undefined)` would be NaN and render "NaN".
  const value = Number(deal.value ?? 0);

  return (
    <div
      draggable={canEdit}
      onDragStart={(event) => onDragStart?.(event, deal)}
      className={[
        "group rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition",
        "hover:border-slate-300 hover:shadow-md",
        "dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700",
        // Dimmed while in flight so it is obvious which card is being moved.
        isDragging ? "opacity-40" : "opacity-100",
      ].join(" ")}
    >
      <div className="flex items-start gap-2">
        {canEdit && (
          <GripVertical
            size={16}
            aria-hidden="true"
            className="mt-0.5 shrink-0 cursor-grab text-slate-300 transition group-hover:text-slate-400 dark:text-slate-600"
          />
        )}

        <button
          type="button"
          onClick={() => onOpen(deal)}
          className="min-w-0 flex-1 text-left"
        >
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
            {deal.title}
          </p>

          <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
            {deal.customer}
          </p>

          <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
            {formatMoney(value)}
          </p>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1">
              <User size={12} aria-hidden="true" />
              <span className="truncate">{deal.owner}</span>
            </span>

            {deal.expectedClose && (
              <span className="inline-flex items-center gap-1">
                <Calendar size={12} aria-hidden="true" />
                {deal.expectedClose}
              </span>
            )}
          </div>
        </button>
      </div>

      {canEdit && (
        <label className="mt-2 block">
          <span className="sr-only">Move {deal.title} to another stage</span>
          <select
            value={deal.stage}
            onChange={(event) => onMoveStage(deal, event.target.value as DealStage)}
            aria-label={`Stage for ${deal.title}`}
            className="min-h-9 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 outline-none transition focus:border-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
          >
            {/* A stage the data contains but DEAL_STAGES does not list still
                renders as the current value, rather than silently resetting the
                select to the first option. */}
            {!isOneOf(DEAL_STAGES, deal.stage) && (
              <option value={deal.stage}>{deal.stage}</option>
            )}

            {DEAL_STAGES.map((stage) => (
              <option key={stage} value={stage}>
                {stage}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}

export default DealCard;