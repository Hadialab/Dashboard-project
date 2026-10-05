// Deciding what an audit entry should say changed.
//
// Kept separate from the route that writes it, because this is the part with the
// subtlety: deciding whether two values are "the same" is easy to get wrong in
// ways that quietly corrupt the log rather than crashing it.

// Fields the server owns. A client that sends them is ignored (crm.js refuses to
// write them), so a difference here is not a change the user made and must not be
// recorded as one — it would put a timestamp edit in an audit log as though
// someone had touched the record.
const SERVER_OWNED = new Set(["id", "createdAt", "updatedAt", "createdDate"]);

/**
 * Compares two values the way the database would.
 *
 * Everything here arrives either from Postgres or from a JSON body, and the same
 * logical value can appear as a number in one and a string in the other: a
 * NUMERIC(14,2) column hands back a string, while a form sends "12000". Compared
 * with `===`, "12000" !== 12000, so saving a form without touching the deal
 * value would log a change on every keystroke-save and bury the real edits.
 *
 * null and undefined are treated as equivalent, for the same reason: clearing an
 * owner that was already unset is not a change.
 */
function isSameValue(from, to) {
  if (from === null || from === undefined) return to === null || to === undefined;

  if (typeof from === "object" || typeof to === "object") {
    return JSON.stringify(from) === JSON.stringify(to);
  }

  // Compared as strings, so 12000 and "12000" match but "12,000" does not —
  // which is correct, since a form would never send a thousands separator into a
  // numeric field.
  return String(from) === String(to);
}

/**
 * The fields that actually differ between two versions of a record.
 *
 * Full fidelity by design: every changed field is returned, not only the ones the
 * activity timeline narrates. A log that silently omitted a changed email address
 * would be worse than no log, because it would answer "nothing changed" and be
 * believed.
 *
 * Returns a plain object shaped `{ field: { from, to } }`, which is what gets
 * stored as JSONB. `from`/`to` are kept as they arrived rather than coerced to
 * strings: a number in the log reads as a number, and the audit view formats it
 * for display.
 */
export function diffRecord(before, after) {
  const changes = {};

  // The union of both key sets: a field present in one and absent in the other
  // is a change, and iterating only the "after" keys would miss a field that was
  // cleared.
  const fields = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);

  for (const field of fields) {
    if (SERVER_OWNED.has(field)) continue;

    const from = before?.[field];
    const to = after?.[field];

    if (!isSameValue(from, to)) {
      changes[field] = { from: from ?? null, to: to ?? null };
    }
  }

  return changes;
}

/** True when a diff found nothing — used to skip writing a meaningless entry. */
export function hasChanges(changes) {
  return Object.keys(changes).length > 0;
}

/**
 * Builds the `changes` map for a record being created.
 *
 * Every provided field counts as a change from nothing, which is what makes a
 * create readable in the log without inventing a synthetic "from".
 */
export function describeCreation(record, fields) {
  const changes = {};

  for (const field of fields) {
    const value = record?.[field];
    if (value === undefined) continue;
    changes[field] = { from: null, to: value };
  }

  return changes;
}

/**
 * Builds the `changes` map for a record being deleted.
 *
 * The prior values are what make this entry useful: once the row is gone, "user X
 * deleted customer c041" is much weaker than the same entry plus the name and
 * email that were removed.
 */
export function describeDeletion(record, fields) {
  const changes = {};

  for (const field of fields) {
    const value = record?.[field];
    if (value === undefined) continue;
    changes[field] = { from: value, to: null };
  }

  return changes;
}