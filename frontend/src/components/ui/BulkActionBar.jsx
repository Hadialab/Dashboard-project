import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";

import Button from "./Button";
import Select from "./Select";
import Modal from "./Modal";

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
function BulkActionBar({
  count,
  statusOptions,
  onBulkStatusChange,
  onBulkDelete,
  noun = "records",
  disableStatus = false,
  disableDelete = false,
}) {
  const [status, setStatus] = useState("");
  const [working, setWorking] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  // A delete that partially fails should say so, rather than reporting a flat
  // success for the rows that happened to work.
  const [result, setResult] = useState(null);

  async function run(action) {
    setWorking(true);
    setResult(null);

    try {
      const outcome = await action();
      setResult(outcome ?? { ok: 0, failed: 0 });
    } finally {
      setWorking(false);
    }
  }

  async function handleStatusChange() {
    if (!status) return;

    const chosen = status;
    setStatus("");

    const outcome = await run(() => onBulkStatusChange(chosen));

    if (outcome && outcome.failed === 0) {
      setResult(null);
    }
  }

  async function handleDelete() {
    const outcome = await run(() => onBulkDelete());

    // Only close on a clean run; a partial failure stays open with the count.
    if (outcome && outcome.failed === 0) setConfirmOpen(false);
  }

  const succeeded = result?.ok ?? 0;
  const failed = result?.failed ?? 0;

  return (
    <>
      <div className="sticky bottom-4 z-20 mt-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-lg sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-950">
        <p className="text-sm font-medium text-slate-900 dark:text-white">
          {count} {count === 1 ? noun.replace(/s$/, "") : noun} selected
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
            {working ? <Loader2 size={14} className="animate-spin" /> : null}
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

      {/* Progress and partial-failure feedback, announced rather than trapped
          in a toast the user may have looked away from. */}
      {result && succeeded + failed > 0 && (
        <p
          role="status"
          className={[
            "mt-2 rounded-lg border p-3 text-sm",
            failed > 0
              ? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
              : "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200",
          ].join(" ")}
        >
          {failed > 0
            ? `${succeeded} updated, ${failed} could not be.`
            : `${succeeded} updated.`}
        </p>
      )}

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={`Delete ${count} ${count === 1 ? noun.replace(/s$/, "") : noun}?`}
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
          You are about to permanently delete {count}{" "}
          {count === 1 ? noun.replace(/s$/, "") : noun}.
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
