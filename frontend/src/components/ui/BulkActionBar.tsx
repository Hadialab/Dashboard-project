import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

import Button from "./Button";
import Select from "./Select";
import Modal from "./Modal";
import type { BulkResult } from "../../types";

/**
 * The bar that appears once rows are selected.
 *
 * Sticky to the bottom of the viewport rather than sitting in the page flow, so
 * it is reachable when the selection is made from a checkbox near the top of a
 * long list without scrolling back up to find it.
 *
 * Both actions report progress and take a confirming step. Bulk delete is
 * irreversible and easy to trigger by accident, so it goes through a dialog that
 * names how many records are about to go.
 */

/** A bulk handler returns nothing on success and throws when nothing landed. */
type BulkOutcome = BulkResult | void | null;

type BulkActionBarProps = {
  count: number;
  /** The statuses this resource can be set to. Empty disables the control. */
  statusOptions: readonly string[];
  onBulkStatusChange: (status: string) => Promise<BulkOutcome> | BulkOutcome;
  onBulkDelete: () => Promise<BulkOutcome> | BulkOutcome;
  /** Plural, e.g. "customers". Singularised for a single row. */
  noun?: string;
  disableStatus?: boolean;
  disableDelete?: boolean;
};

function BulkActionBar({
  count,
  statusOptions,
  onBulkStatusChange,
  onBulkDelete,
  noun = "records",
  disableStatus = false,
  disableDelete = false,
}: BulkActionBarProps) {
  const [status, setStatus] = useState("");
  const [working, setWorking] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  // A delete that partially fails should say so, rather than reporting a flat
  // success for the rows that happened to work.
  const [result, setResult] = useState<BulkResult | null>(null);

  const EMPTY: BulkResult = { ok: 0, failed: 0, errors: [] };

  async function run(action: () => Promise<BulkOutcome> | BulkOutcome) {
    setWorking(true);
    setResult(null);

    try {
      const outcome = await action();
      // `??` rather than a truthiness check: a handler returning 0 rows updated
      // is a real, successful outcome and must not be replaced with a fresh
      // empty result that reads as "nothing happened".
      //
      // The void arm is excluded explicitly because a `??` on a `void | T` union
      // stays `void | T`, which is not assignable to the state type. The `as`
      // is the narrowest one available and the branch below makes it true:
      // `void` is what a handler that reports nothing returns.
      const resolved = (outcome ?? EMPTY) as BulkResult;
      setResult(resolved);
      return resolved;
    } catch (error) {
      // The page handlers report their own success and partial-failure toasts,
      // so this is only for an action that threw outright — where nothing is
      // known about how many rows landed. Previously that escaped as an
      // unhandled rejection and the user saw the bar simply stop working.
      toast.error(
        error instanceof Error && error.message
          ? error.message
          : `Could not update the selected ${noun}.`,
      );
      return null;
    } finally {
      setWorking(false);
    }
  }

  async function handleStatusChange() {
    if (!status) return;

    // Captured before clearing, because the select is reset immediately so the
    // control shows its placeholder again rather than a stale choice.
    const chosen = status;
    setStatus("");

    // The page handler toasts, so the result is only used to decide whether the
    // selection is still meaningful.
    await run(() => onBulkStatusChange(chosen));
  }

  async function handleDelete() {
    const outcome = await run(() => onBulkDelete());

    // Only close on a clean run; a partial failure stays open with the count.
    if (outcome && outcome.failed === 0) setConfirmOpen(false);
  }

  const succeeded = result?.ok ?? 0;
  const failed = result?.failed ?? 0;

  // "customers" -> "customer". Done here rather than at each call site so the
  // singular can never disagree with the plural it is derived from.
  const singular = noun.replace(/s$/, "");
  const label = count === 1 ? singular : noun;

  return (
    <>
      <div className="sticky bottom-4 z-20 mt-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-lg sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-950">
        <p className="text-sm font-medium text-slate-900 dark:text-white">
          {count} {label} selected
        </p>

        <div className="flex flex-1 flex-wrap items-center gap-2 sm:justify-end">
          <label className="sr-only" htmlFor="bulk-status">
            Change status of selected records
          </label>

          <Select
            id="bulk-status"
            name="bulkStatus"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            disabled={working || disableStatus}
            className="min-w-40 py-2"
          >
            <option value="">Set status…</option>
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>

          <Button
            size="sm"
            onClick={handleStatusChange}
            disabled={!status || working || disableStatus}
          >
            {working ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : null}
            Apply
          </Button>

          <Button
            size="sm"
            variant="danger"
            icon={Trash2}
            onClick={() => setConfirmOpen(true)}
            disabled={working || disableDelete}
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Partial-failure feedback, announced rather than left in a toast the user
          may have looked away from — and persistent, because "3 of 5 went
          through" is something you may need to act on after the fact.
          A clean run needs no banner: the toast says it, and the rows themselves
          are visibly different. */}
      {result && failed > 0 && (
        <p
          role="status"
          className="mt-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
        >
          {succeeded} updated, {failed} could not be.
        </p>
      )}

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={`Delete ${count} ${label}?`}
        description="This cannot be undone. The records and everything attached to them — notes, follow-ups — are removed."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>

            <Button variant="danger" onClick={handleDelete} disabled={working}>
              {working ? "Deleting..." : `Delete ${count}`}
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600 dark:text-slate-300">
          You are about to permanently delete {count} {label}.
        </p>

        {failed > 0 && (
          <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">
            {failed} could not be deleted last time and will be retried.
          </p>
        )}
      </Modal>
    </>
  );
}

export default BulkActionBar;