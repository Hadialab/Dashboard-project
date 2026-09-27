import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { getDeals, updateDeal } from "../services/dealService";
import usePermissions from "../hooks/usePermissions";

import PageHeader from "../components/ui/PageHeader";
import Card from "../components/ui/Card";
import Skeleton from "../components/ui/Skeleton";
import EmptyState from "../components/ui/EmptyState";
import DealDetailsDrawer from "../components/deals/DealDetailsDrawer";
import PipelineColumn from "../components/pipeline/PipelineColumn";

import { boardStages, WON_STAGE, LOST_STAGE } from "../utils/crmConstants";
import { getApiErrorMessage } from "../utils/apiError";

/**
 * The pipeline as a board: one column per stage, deals dragged between them.
 *
 * The table on the Deals page is better for scanning a long list; this is for
 * seeing where everything is stuck and moving it in one gesture.
 */
function Pipeline() {
  const { can } = usePermissions();
  const canEdit = can("deals", "edit");

  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Which column the pointer is currently over, for the drop highlight.
  const [dragOver, setDragOver] = useState(null);
  // The deal being dragged, so the card can be dimmed while it is in flight.
  const [dragging, setDragging] = useState(null);

  const [selectedDeal, setSelectedDeal] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const fetchDeals = useCallback(async () => {
    try {
      setLoading(true);
      setDeals(await getDeals());
      setError("");
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not load the pipeline."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  const stages = useMemo(() => boardStages(deals), [deals]);

  // Group once per render rather than filtering inside each column.
  const byStage = useMemo(() => {
    const grouped = Object.fromEntries(stages.map((stage) => [stage, []]));

    for (const deal of deals) {
      (grouped[deal.stage] ??= []).push(deal);
    }

    return grouped;
  }, [deals, stages]);

  /**
   * Moves a deal to a new stage.
   *
   * The card jumps immediately and the request follows, because a board that
   * waits for the network before responding feels broken. If the request fails
   * the previous state is put back and the failure is reported — leaving a card
   * in a column the server never accepted would be a silent lie about the
   * pipeline.
   */
  const moveDeal = useCallback(
    async (deal, stage) => {
      if (stage === deal.stage) return;

      const previous = deals;

      setDeals((current) =>
        current.map((row) => (row.id === deal.id ? { ...row, stage } : row)),
      );

      try {
        // PUT is a full replace, so the whole row goes back, not just the stage.
        const saved = await updateDeal(deal.id, { ...deal, stage });

        setDeals((current) =>
          current.map((row) => (row.id === saved.id ? saved : row)),
        );

        if (stage === WON_STAGE || stage === LOST_STAGE) {
          toast.success(
            `${deal.title} marked ${stage.toLowerCase()} — ${Number(
              deal.value ?? 0,
            ).toLocaleString()}`,
          );
        }
      } catch (err) {
        setDeals(previous);
        toast.error(
          getApiErrorMessage(err, `Could not move ${deal.title}. Change reverted.`),
        );
      }
    },
    [deals],
  );

  function handleDragStart(event, deal) {
    setDragging(deal.id);
    event.dataTransfer.effectAllowed = "move";
    // Some browsers only begin a drag once data is set. Only the id travels,
    // so no other field of the deal can be pasted somewhere unexpected.
    event.dataTransfer.setData("text/plain", deal.id);
  }

  function handleDragOver(event, stage) {
    if (!canEdit) return;
    // Without preventDefault the browser refuses the drop and no drop event
    // ever fires, so the column would highlight but nothing would move.
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragOver(stage);
  }

  function handleDragLeave(event) {
    // Ignore the leave that fires when the pointer moves onto a child element,
    // which would otherwise flicker the highlight as the drag passes over.
    if (event.currentTarget.contains(event.relatedTarget)) return;
    setDragOver(null);
  }

  function handleDrop(event, stage) {
    event.preventDefault();
    setDragOver(null);
    setDragging(null);

    const id = event.dataTransfer.getData("text/plain");
    const deal = deals.find((row) => row.id === id);

    if (deal) moveDeal(deal, stage);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Pipeline" description="Your opportunities by stage." />

        <div className="flex gap-4 overflow-x-auto pb-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="w-72 shrink-0 p-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-2 h-3 w-16" />
              <Skeleton className="mt-4 h-20 w-full" />
              <Skeleton className="mt-2 h-20 w-full" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pipeline"
        description={
          canEdit
            ? "Drag a deal between columns to change its stage."
            : "Your opportunities by stage."
        }
      />

      {error && <p className="text-sm text-rose-600">{error}</p>}

      {deals.length === 0 ? (
        <EmptyState
          title="No deals yet"
          description="Add a deal from the Deals page and it will appear here."
        />
      ) : (
        <>
          {/* Horizontal scroll rather than a squeezed grid: a board column that
              wraps its cards is worse than one you have to scroll to. */}
          <div className="-mx-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0">
            <div className="flex min-h-[24rem] items-stretch gap-4">
              {stages.map((stage) => (
                <PipelineColumn
                  key={stage}
                  stage={stage}
                  deals={byStage[stage] ?? []}
                  isOver={dragOver === stage}
                  canEdit={canEdit}
                  onDragStart={handleDragStart}
                  draggingId={dragging}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={(event) => handleDrop(event, stage)}
                  onOpenDeal={(deal) => {
                    setSelectedDeal(deal);
                    setIsDrawerOpen(true);
                  }}
                  onMoveStage={moveDeal}
                />
              ))}
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            {deals.length} {deals.length === 1 ? "deal" : "deals"} across{" "}
            {stages.length} stages
            {!canEdit && " — you have read-only access."}
          </p>
        </>
      )}

      <DealDetailsDrawer
        open={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedDeal(null);
        }}
        deal={selectedDeal}
      />
    </div>
  );
}

export default Pipeline;
