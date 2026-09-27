import { useCallback, useMemo, useState } from "react";

/**
 * Row selection for a table, shared by Customers and Leads.
 *
 * Selection is scoped to what is currently *rendered* (the current page), not to
 * every loaded record. That is deliberate: the "select all" checkbox in the header
 * says "select all on this page", and a user who ticks it expects to act on the
 * rows they can see. Acting on records from another page they never looked at
 * would be a nasty surprise in a delete.
 *
 * Pruning happens through `sync`, which the page calls with the rows it is about
 * to render. Anything that disappears — a filter change, a delete, a page turn —
 * is dropped from the selection automatically, so the bulk bar can never act on
 * a record that is no longer in front of the user.
 */
export function useRowSelection() {
  const [selected, setSelected] = useState([]);

  // Drops selections for rows that are no longer visible.
  const sync = useCallback((visibleRows) => {
    setSelected((prev) => {
      if (prev.length === 0) return prev;

      const visibleIds = new Set(visibleRows.map((row) => row.id));
      const next = prev.filter((id) => visibleIds.has(id));

      // Return the same array when nothing changed, so this does not re-render
      // the table on every page load.
      return next.length === prev.length ? prev : next;
    });
  }, []);

  const toggle = useCallback((id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((row) => row !== id) : [...prev, id],
    );
  }, []);

  const toggleAll = useCallback((visibleRows) => {
    const visibleIds = visibleRows.map((row) => row.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.includes(id));

    setSelected(allSelected ? [] : visibleIds);
  }, [selected]);

  const clear = useCallback(() => setSelected([]), []);

  const isSelected = useCallback((id) => selected.includes(id), [selected]);

  const allVisibleSelected = useCallback(
    (visibleRows) =>
      visibleRows.length > 0 && visibleRows.every((row) => selected.includes(row.id)),
    [selected],
  );

  const someVisibleSelected = useCallback(
    (visibleRows) =>
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
