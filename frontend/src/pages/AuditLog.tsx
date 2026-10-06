import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import PageHeader from "../components/ui/PageHeader";
import EmptyState from "../components/ui/EmptyState";
import ErrorState from "../components/ui/ErrorState";
import Spinner from "../components/ui/Spinner";
import AuditFilterBar from "../components/audit/AuditFilterBar";
import AuditEntryTable from "../components/audit/AuditEntryTable";
import { getAuditLog } from "../services/auditService";
import { normalizeError } from "../utils/apiError";
import { useLiveUpdates } from "../hooks/useLiveUpdates";
import type { AppError } from "../utils/apiError";
import type { AuditFilters, AuditLogResponse } from "../types";

// Admin-only page, mirroring the reports page's structure: filters on top, a
// table below, and the filter state kept in the URL so a filtered log can be
// shared or reloaded.
//
// Read-only throughout. There is no action here by design — see auditService.ts.

const PAGE_SIZE = 50;

// Filters live in the query string rather than component state so that a
// reload, a back button and a copied link all reproduce the same view. Only the
// fields the filters can set are read back; limit and offset are handled by the
// paginator and are not part of a shareable "view".
function filtersFromParams(params: URLSearchParams): AuditFilters {
  return {
    actorId: params.get("actorId") ? Number(params.get("actorId")) : null,
    actorName: params.get("actorName"),
    entityType: (params.get("entityType") as AuditFilters["entityType"]) ?? null,
    entityId: params.get("entityId"),
    action: (params.get("action") as AuditFilters["action"]) ?? null,
    from: params.get("from"),
    to: params.get("to"),
    offset: Number(params.get("offset")) || 0,
    limit: PAGE_SIZE,
  };
}

function AuditLogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const filters = filtersFromParams(searchParams);

  const [data, setData] = useState<AuditLogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  // The whole error rather than just its message, because a 403 needs a different
  // explanation than a connection failure and a retry button would be wrong.
  const [error, setError] = useState<AppError | null>(null);
  // Bumped to re-run the fetch effect without changing the filters. This is what
  // makes a live update actually refetch: re-sending identical filters would
  // produce an identical URL, and the effect keys off the URL.
  const [refetch, setRefetch] = useState(0);

  /**
   * Re-fetches whenever the filters change.
   *
   * The request is not abortable through the service, so a slow response for an
   * old filter set could overwrite a newer one. The effect's cleanup flag is what
   * prevents that: a response arriving after the filters changed is discarded
   * rather than rendered, which is the same guard the other list pages use.
   */
  useEffect(() => {
    let current = true;

    setLoading(true);
    setError(null);

    // Derived from searchParams inside the effect rather than from the
    // `filters` variable above. `filters` is rebuilt on every render, so naming it
    // as a dependency would re-fetch forever; searchParams is the real input and
    // changes exactly when the view should change.
    getAuditLog(filtersFromParams(searchParams))
      .then((result) => {
        if (!current) return;
        setData(result);
      })
      .catch((cause: unknown) => {
        if (!current) return;
        setError(normalizeError(cause, "We could not load the audit log."));
      })
      .finally(() => {
        if (current) setLoading(false);
      });

    return () => {
      current = false;
    };
    // `refetch` is the dependency that makes the live update work: re-sending the
    // same filters would produce the same URL, so the effect would not re-run and
    // nothing would refresh.
  }, [searchParams, refetch]);

  // Refresh when anything changes, so an admin watching the log sees activity as it
  // happens rather than on a manual refresh.
  //
  // A refetch rather than prepending a row: the event carries no field values, and
  // an entry built from it would be missing the before/after detail that is the
  // whole reason to read this log. "Something changed, go and ask the server" is
  // both correct by construction and never stale.
  useLiveUpdates(() => {
    setRefetch((n) => n + 1);
  });

  const updateFilters = useCallback(
    (next: AuditFilters) => {
      const params = new URLSearchParams();

      // Empty values are omitted rather than written as blank, so the URL stays
      // readable and the request sends no dead filters.
      for (const [key, value] of Object.entries(next)) {
        if (value === null || value === undefined || value === "" || value === 0) continue;
        params.set(key, String(value));
      }

      setSearchParams(params, { replace: true });
    },
    [setSearchParams],
  );

  const total = data?.total ?? 0;
  const offset = filters.offset ?? 0;
  const hasPrevious = offset > 0;
  const hasNext = offset + PAGE_SIZE < total;
  const isFiltered = Boolean(
    filters.actorId || filters.actorName || filters.entityType || filters.entityId ||
      filters.action || filters.from || filters.to,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="ADMINISTRATION"
        title="Audit Log"
        description="Every change to a customer, lead, deal or team member's access, with the values before and after."
      />

      {/* Not rendered at all for a rep. It renders before the response arrives,
          so the only way to hide it is to know the refusal — which is why this is
          gated on the error rather than on the sidebar link being absent. */}
      {error?.kind !== "forbidden" && (
        // Not disabled while loading: narrowing a slow query is exactly what
        // someone does when it returns too much.
        <AuditFilterBar
          filters={filters}
          onChange={updateFilters}
          actors={data?.actors ?? []}
        />
      )}

      {loading && !data && (
        <div className="flex items-center justify-center py-12">
          <Spinner size={28} className="text-slate-400" />
        </div>
      )}

      {error &&
        (error.kind === "forbidden" ? (
          // A rep who reaches this URL. Explains the refusal rather than showing
          // a 403, and offers no retry: retrying is not what is missing here.
          <EmptyState
            title="This log is for administrators"
            description="Your account can see the customers, leads and deals it has access to, but the audit log is limited to company administrators."
          />
        ) : (
          <ErrorState
            title="The audit log could not be loaded"
            message={error.message}
            onRetry={error.retryable ? () => updateFilters(filters) : undefined}
            retrying={loading}
          />
        ))}

      {!error && data && data.entries.length === 0 && (
        <EmptyState
          title={isFiltered ? "Nothing matches those filters" : "No activity recorded yet"}
          description={
            isFiltered
              ? "No entries in this company match the filters you have set."
              : "Entries appear here as soon as someone creates, edits or deletes a record."
          }
          isSearchResult={isFiltered}
          buttonText={isFiltered ? "Clear filters" : undefined}
          onClick={isFiltered ? () => updateFilters({ offset: 0, limit: PAGE_SIZE }) : undefined}
        />
      )}

      {!error && data && data.entries.length > 0 && (
        <>
          <AuditEntryTable entries={data.entries} onNavigate={navigate} />

          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600 dark:text-slate-300">
            <span>
              Showing {offset + 1}–{offset + data.entries.length} of {total}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => updateFilters({ ...filters, offset: Math.max(offset - PAGE_SIZE, 0) })}
                disabled={!hasPrevious || loading}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:hover:bg-slate-900"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => updateFilters({ ...filters, offset: offset + PAGE_SIZE })}
                disabled={!hasNext || loading}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:hover:bg-slate-900"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      {loading && data && (
        <p aria-live="polite" className="text-xs text-slate-500">
          Refreshing…
        </p>
      )}
    </div>
  );
}

export default AuditLogPage;