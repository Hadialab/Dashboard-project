import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Users, Target, Handshake, CornerDownLeft, Clock } from "lucide-react";

import Modal from "./Modal";
import Spinner from "./Spinner";
import api from "../../api/axios";
import usePermissions from "../../hooks/usePermissions";
import useRecentlyViewedStore from "../../store/recentlyViewedStore";

const TYPES = {
  customer: { label: "Customers", icon: Users, noun: "customer", to: "/customers" },
  lead: { label: "Leads", icon: Target, noun: "lead", to: "/leads" },
  deal: { label: "Deals", icon: Handshake, noun: "deal", to: "/deals" },
};

/**
 * Command palette (Cmd/Ctrl+K).
 *
 * Searches client-side, as the brief specifies: the three collections are small
 * enough that a round trip per keystroke would be slower, and a request on every
 * character is how you end up with a search box that lags.
 *
 * Data is fetched the first time it opens and then cached for the session, so
 * the first keystroke is not waiting on three requests.
 */
function CommandPalette({ open, onClose }) {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const recent = useRecentlyViewedStore((state) => state.items);

  const [query, setQuery] = useState("");
  const [records, setRecords] = useState(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const listRef = useRef(null);
  const inputRef = useRef(null);

  const canSeeCustomers = can("customers", "view");
  const canSeeLeads = can("leads", "view");
  const canSeeDeals = can("deals", "view");

  // Only collections this user may see are fetched. Asking for the rest would
  // return 403s in the console on every open.
  useEffect(() => {
    if (!open || records !== null) return;

    let cancelled = false;

    (async () => {
      setLoading(true);

      const sources = [
        canSeeCustomers ? ["customer", "/customers"] : null,
        canSeeLeads ? ["lead", "/leads"] : null,
        canSeeDeals ? ["deal", "/deals"] : null,
      ].filter(Boolean);

      try {
        const responses = await Promise.all(
          sources.map(([, url]) => api.get(url)),
        );

        if (cancelled) return;

        const merged = [];
        sources.forEach(([type], index) => {
          for (const row of responses[index].data) {
            merged.push({ ...row, type, id: `${type}:${row.id}` });
          }
        });

        setRecords(merged);
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, records, canSeeCustomers, canSeeLeads, canSeeDeals]);

  // Reset per opening, so the palette never reopens showing the last query.
  useEffect(() => {
    if (!open) return;

    setQuery("");
    setActiveIndex(0);
    // Focus after a frame, or the dialog's own focus handling wins the race.
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [];

    const pool = records ?? [];

    return pool
      .filter((record) => {
        const haystack = [
          record.name,
          record.title,
          record.company,
          record.customer,
          record.email,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(term);
      })
      // An exact-ish match on the leading field is far more likely to be what
      // was meant than a substring hit buried in a company name.
      .sort((a, b) => {
        const first = (row) =>
          String(row.name ?? row.title ?? "").toLowerCase().startsWith(term) ? 0 : 1;
        return first(a) - first(b);
      })
      .slice(0, 20);
  }, [query, records]);

  // Grouped for display, but the keyboard walks one flat list.
  const groups = useMemo(() => {
    const byType = { customer: [], lead: [], deal: [] };

    for (const record of matches) {
      byType[record.type]?.push(record);
    }

    return Object.entries(byType)
      .filter(([, rows]) => rows.length > 0)
      .map(([type, rows]) => ({ type, rows }));
  }, [matches]);

  const flat = useMemo(
    () => groups.flatMap((group) => group.rows),
    [groups],
  );

  // Keep the highlight in range as the result list changes under the cursor.
  useEffect(() => {
    setActiveIndex((index) => Math.min(index, Math.max(0, flat.length - 1)));
  }, [flat.length]);

  const go = useCallback(
    (record) => {
      if (!record) return;

      // `?open=` makes the target page open that record's drawer, so Enter lands
      // on the record rather than on a list the user has to search again.
      navigate(`${TYPES[record.type].to}?open=${record.id.split(":")[1]}`);

      setQuery("");
      onClose();
    },
    [navigate, onClose],
  );

  function handleKeyDown(event) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (flat.length === 0 ? 0 : (index + 1) % flat.length));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) =>
        flat.length === 0 ? 0 : (index - 1 + flat.length) % flat.length,
      );
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      go(flat[activeIndex]);
      return;
    }

    // Escape is handled by Modal itself, which already listens for it.
    if (event.key === "Tab") {
      // A single input and a list of buttons: trap Tab so focus cannot wander
      // into the page behind the overlay.
      event.preventDefault();
    }
  }

  // Scrolls the highlighted row into view during keyboard navigation.
  useEffect(() => {
    if (!open) return;

    const node = listRef.current?.querySelector(`[data-index="${activeIndex}"]`);
    node?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  const titleFor = (record) =>
    record.name ?? record.title ?? record.company ?? record.customer;

  const subtitleFor = (record) =>
    record.type === "deal" ? record.customer : record.company;

  return (
    <Modal open={open} onClose={onClose} size="lg" title="Search">
      <div onKeyDown={handleKeyDown}>
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            placeholder="Search customers, leads and deals..."
            aria-label="Search records"
            className="w-full rounded-lg border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>

        <div
          ref={listRef}
          className="mt-3 max-h-80 overflow-y-auto"
          role="listbox"
          aria-label="Search results"
        >
          {loading && (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500 dark:text-slate-400">
              <Spinner />
              Loading records…
            </div>
          )}

          {failed && (
            <p className="py-8 text-center text-sm text-rose-600">
              Could not load records to search.
            </p>
          )}

          {!loading && !failed && query.trim() === "" && (
            <div className="py-2">
              <p className="flex items-center gap-2 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <Clock size={12} aria-hidden="true" />
                Recently viewed
              </p>

              {recent.length === 0 ? (
                <p className="px-2 py-4 text-sm text-slate-500 dark:text-slate-400">
                  Nothing opened yet. Type to search instead.
                </p>
              ) : (
                <ul>
                  {recent.map((item) => {
                    const meta = TYPES[item.type];
                    if (!meta) return null;

                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => {
                            navigate(`${meta.to}?open=${item.recordId}`);
                            onClose();
                          }}
                          className="flex w-full min-h-11 items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <meta.icon
                            size={16}
                            className="shrink-0 text-slate-400"
                            aria-hidden="true"
                          />

                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-slate-900 dark:text-white">
                              {item.label}
                            </span>
                            <span className="block text-xs text-slate-500 dark:text-slate-400">
                              {meta.noun}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {!loading && query.trim() !== "" && flat.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
              No matches for &ldquo;{query.trim()}&rdquo;.
            </p>
          )}

          {groups.map((group) => {
            const meta = TYPES[group.type];

            return (
              <div key={group.type} className="py-1">
                <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {meta.label}
                </p>

                <ul>
                  {group.rows.map((record) => {
                    const index = flat.indexOf(record);
                    const active = index === activeIndex;

                    return (
                      <li key={record.id}>
                        <button
                          type="button"
                          data-index={index}
                          role="option"
                          aria-selected={active}
                          onMouseEnter={() => setActiveIndex(index)}
                          onClick={() => go(record)}
                          className={[
                            "flex w-full min-h-11 items-center gap-3 rounded-lg px-2 py-2 text-left transition",
                            active
                              ? "bg-blue-50 dark:bg-blue-950/50"
                              : "hover:bg-slate-100 dark:hover:bg-slate-800",
                          ].join(" ")}
                        >
                          <meta.icon
                            size={16}
                            className="shrink-0 text-slate-400"
                            aria-hidden="true"
                          />

                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-slate-900 dark:text-white">
                              {titleFor(record)}
                            </span>
                            {subtitleFor(record) && (
                              <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                                {subtitleFor(record)}
                              </span>
                            )}
                          </span>

                          {active && (
                            <CornerDownLeft
                              size={14}
                              className="shrink-0 text-slate-400"
                              aria-hidden="true"
                            />
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>

        <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-200 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>esc close</span>
        </p>
      </div>
    </Modal>
  );
}

export default CommandPalette;
