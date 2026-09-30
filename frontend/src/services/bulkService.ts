import { updateCustomer, deleteCustomer } from "./customerService";
import { updateLead, deleteLead } from "./leadService";
import type { BulkResult, Customer, Lead } from "../types";

/**
 * Bulk operations, run one record at a time.
 *
 * Deliberately not a single batch endpoint. The API has no batch route, and
 * adding one that bypassed the per-record permission and ownership checks in the
 * resource factory would be a way around them. Going through the existing
 * per-record service keeps every row validated and authorised identically to a
 * single edit — and it means a row that fails does not roll back the rest.
 *
 * That is a real trade-off: 50 records is 50 requests. It is the right one here
 * because correctness and per-row error reporting matter more than request count
 * at this scale, and a partial failure is reported rather than hidden.
 */

/** Yields to the event loop every `batchSize` rows so a progress bar paints. */
const yieldToPaint = (): Promise<void> =>
  new Promise((resolve) => {
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => resolve());
    } else {
      setTimeout(resolve, 0);
    }
  });

/** Anything with an id, and a label to show when it fails. */
type Labelled = { id: string; name?: string; title?: string };

type Progress = (done: number, total: number) => void;

async function runOver<T extends Labelled>(
  records: T[],
  apply: (record: T) => Promise<unknown>,
  { batchSize = 5, onProgress }: { batchSize?: number; onProgress?: Progress } = {},
): Promise<BulkResult> {
  const result: BulkResult = { ok: 0, failed: 0, errors: [] };

  for (const [index, record] of records.entries()) {
    try {
      await apply(record);
      result.ok += 1;
    } catch (error) {
      result.failed += 1;

      const response = (error as { response?: { data?: { error?: string } } })?.response;
      result.errors.push({
        id: record.id,
        // Deals carry a title, not a name. Reading name ?? id would label every
        // deal "undefined" in the failure list.
        name: record.name ?? record.title ?? record.id,
        message:
          response?.data?.error ?? "Could not be saved. You may not have permission.",
      });
    }

    onProgress?.(index + 1, records.length);

    // Every batch, hand control back so a progress bar actually paints.
    if ((index + 1) % batchSize === 0) await yieldToPaint();
  }

  return result;
}

/** Applies a status to many customers. */
export function bulkSetCustomerStatus(
  records: Customer[],
  status: string,
  onProgress?: Progress,
): Promise<BulkResult> {
  return runOver(
    records,
    (record) => updateCustomer(record.id, { ...record, status }),
    { onProgress },
  );
}

/** Applies a status to many leads. */
export function bulkSetLeadStatus(
  records: Lead[],
  status: string,
  onProgress?: Progress,
): Promise<BulkResult> {
  return runOver(
    records,
    (record) => updateLead(record.id, { ...record, status }),
    { onProgress },
  );
}

/** Deletes many customers. */
export function bulkDeleteCustomers(
  records: Customer[],
  onProgress?: Progress,
): Promise<BulkResult> {
  return runOver(
    records,
    (record) => deleteCustomer(record.id),
    { onProgress },
  );
}

/** Deletes many leads. */
export function bulkDeleteLeads(records: Lead[], onProgress?: Progress): Promise<BulkResult> {
  return runOver(
    records,
    (record) => deleteLead(record.id),
    { onProgress },
  );
}
