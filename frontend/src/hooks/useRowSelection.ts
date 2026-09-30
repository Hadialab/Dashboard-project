import { useCallback, useMemo, useState } from "react";

/** Anything with an id, which is all selection needs. */
type Identified = { id: string };

/** What a page gets back. */
export type RowSelection = {
  selected: string[];
  count: number;
  /** Drops selections for rows that are no longer visible. */
  sync: (visibleRows: Identified[]) => void;
  toggle: (id: string) => void;
  toggleAll: (visibleRows: Identified[]) => void;
  clear: () => void;
  isSelected: (id: string) => boolean;
  /** Every visible row is ticked. False for an empty page, never vacuously true. */
  allVisibleSelected: (visibleRows: Identified[]) => boolean;
  /** Some but not all — what makes the header checkbox indeterminate. */
  someVisibleSelected: (visibleRows: Identified[]) => boolean;
};

/**
 * Row selection for a table, shared by Customers and Leads.
 *
 * Selection is scoped to what is currently *rendered* (the current page), not to
 * every loaded record. That is deliberate: the "select all" checkbox in the
 * header says "select all on this page", and a user who ticks it expects to act
 * on the rows they can see. Acting on records from another page they never
 * looked at would be a nasty surprise in a delete.
 *
 * Pruning happens through `sync`, which the page calls with the rows it is about
 * to render. Anything that disappears — a filter change, a delete, a page turn —
 * is dropped from the selection automatically, so the bulk bar can never act on
 * a record that is no longer in front of the user.
 */
export function useRowSelection(): RowSelection {
  const [selected, setSelected] = useState<string[]>([]);

  const sync = useCallback((visibleRows: Identified[]) => {
    setSelected((prev) => {
      if (prev.length === 0) return prev;

      const visibleIds = new Set(visibleRows.map((row) => row.id));
      const next = prev.filter((id) => visibleIds.has(id));

      // Return the same array when nothing changed, so this does not re-render
      // the table on every page load.
      return next.length === prev.length ? prev : next;
    });
  }, []);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((row) => row !== id) : [...prev, id]));
  }, []);

  const toggleAll = useCallback(
    (visibleRows: Identified[]) => {
      const visibleIds = visibleRows.map((row) => row.id);
      const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.includes(id));

      setSelected(allSelected ? [] : visibleIds);
    },
    [selected],
  );

  const clear = useCallback(() => setSelected([]), []);

  const isSelected = useCallback((id: string) => selected.includes(id), [selected]);

  const allVisibleSelected = useCallback(
    (visibleRows: Identified[]) =>
      visibleRows.length > 0 && visibleRows.every((row) => selected.includes(row.id)),
    [selected],
  );

  const someVisibleSelected = useCallback(
    (visibleRows: Identified[]) =>
      visibleRows.some((row) => selected.includes(row.id)) &&
      !visibleRows.every((row) => selected.includes(row.id)),
    [selected],
  );

  return useMemo(
    () => ({
      selected,
      count: selected.length,
      sync,
      toggle,
      toggleAll,
      clear,
      isSelected,
      allVisibleSelected,
      someVisibleSelected,
    }),
    [selected, sync, toggle, toggleAll, clear, isSelected, allVisibleSelected, someVisibleSelected],
  );
}

export default useRowSelection;
