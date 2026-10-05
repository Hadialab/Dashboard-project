import DealCard from "./DealCard";
import { formatAxisMoney } from "../../utils/chartFormat";
import type { Deal, DealStage } from "../../types";
import type { DragEvent } from "react";

type PipelineColumnProps = {
  stage: DealStage;
  deals: Deal[];
  /** Whether a dragged card is currently over this column. */
  isOver?: boolean;
  canEdit: boolean;
  onDragOver?: (event: DragEvent<HTMLElement>, stage: DealStage) => void;
  onDragLeave?: (event: DragEvent<HTMLElement>) => void;
  onDrop?: (event: DragEvent<HTMLElement>) => void;
  onDragStart?: (event: DragEvent<HTMLDivElement>, deal: Deal) => void;
  /** Id of the card being dragged, so it alone renders dimmed. */
  draggingId?: string;
  onOpenDeal: (deal: Deal) => void;
  onMoveStage: (deal: Deal, stage: DealStage) => void;
};

/**
 * One stage of the pipeline: a heading with the running count and value, and the
 * deals currently in it.
 *
 * Acts as the drop target. `isOver` only changes the ring colour — the actual
 * move happens in the board's onDrop, which is the only place that knows how to
 * persist the change.
 */
function PipelineColumn({
  stage,
  deals,
  isOver,
  canEdit,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragStart,
  draggingId,
  onOpenDeal,
  onMoveStage,
}: PipelineColumnProps) {
  // Summed in a loop rather than reduce-with-NaN-guard: pg returns NUMERIC as a
  // string, and a single unparseable value would poison the whole total.
  const total = deals.reduce((sum, deal) => {
    const value = Number(deal.value ?? 0);
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);

  return (
    <section
      aria-label={`${stage} stage, ${deals.length} deals`}
      onDragOver={(event) => onDragOver?.(event, stage)}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={[
        "flex w-72 shrink-0 flex-col rounded-xl border bg-slate-50 transition",
        isOver
          ? "border-blue-400 bg-blue-50 ring-2 ring-blue-200 dark:border-blue-500 dark:bg-blue-950/40 dark:ring-blue-900"
          : "border-slate-200 dark:border-slate-800 dark:bg-slate-900/40",
      ].join(" ")}
    >
      <header className="border-b border-slate-200 p-3 dark:border-slate-800">
        <div className="flex items-center justify-between gap-2">
          <h2 className="truncate text-sm font-semibold text-slate-900 dark:text-white">
            {stage}
          </h2>

          <span className="shrink-0 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {deals.length}
          </span>
        </div>

        {/* Abbreviated rather than toLocaleString: six columns have to fit
            side by side, and "$48000.00" is wider than the column. */}
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {formatAxisMoney(total)}
        </p>
      </header>

      <div className="min-h-24 flex-1 space-y-2 overflow-y-auto p-2">
        {deals.length === 0 ? (
          <p className="px-1 py-4 text-center text-xs text-slate-400 dark:text-slate-500">
            {canEdit ? "Drop a deal here" : "No deals"}
          </p>
        ) : (
          deals.map((deal) => (
            <DealCard
              key={deal.id}
              deal={deal}
              canEdit={canEdit}
              isDragging={draggingId === deal.id}
              onOpen={onOpenDeal}
              onMoveStage={onMoveStage}
              onDragStart={onDragStart}
            />
          ))
        )}
      </div>
    </section>
  );
}

export default PipelineColumn;