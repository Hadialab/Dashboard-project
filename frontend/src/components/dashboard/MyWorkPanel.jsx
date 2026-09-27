import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarClock, Hourglass, ArrowRight } from "lucide-react";

import Card from "../ui/Card";
import Button from "../ui/Button";
import { getClosingSoon, getStaleLeads, totalValue, CLOSING_SOON_DAYS, STALE_LEAD_DAYS } from "../../utils/myWork";
import { stageBadge, leadStatusBadge } from "../../utils/crmConstants";
import { daysUntil, formatRelative } from "../../utils/time";

/**
 * What needs doing now: deals about to close, and leads going quiet.
 *
 * Every row links straight to the record. It navigates with `?open=<id>`, which
 * the Leads and Deals pages read to open that record's drawer, so the user lands
 * on the record rather than on a list they then have to find it in again.
 *
 * Thresholds come from utils/myWork.js, not from here.
 */
function MyWorkPanel({ deals = [], leads = [], user, canSeeDeals, canSeeLeads }) {
  const navigate = useNavigate();

  // "My" work when a user is signed in; otherwise everything visible, so an
  // admin is not shown an empty panel just because they own nothing today.
  const scoped = useMemo(
    () => ({
      closing: getClosingSoon(deals, CLOSING_SOON_DAYS),
      stale: getStaleLeads(leads, STALE_LEAD_DAYS),
    }),
    [deals, leads],
  );

  const closingValue = totalValue(scoped.closing);
  const hasWork = scoped.closing.length > 0 || scoped.stale.length > 0;

  // A user with neither permission gets nothing to act on, so the panel is
  // hidden rather than rendered as two permanently empty lists.
  if (!canSeeDeals && !canSeeLeads) return null;

  if (!hasWork) {
    return (
      <Card className="p-4">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
          Needs your attention
        </h2>

        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Nothing due within {CLOSING_SOON_DAYS} days and no leads untouched for
          over {STALE_LEAD_DAYS}.{" "}
          {user ? "That is a good sign." : null}
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
          Needs your attention
        </h2>

        {scoped.closing.length > 0 && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {scoped.closing.length} closing · ${closingValue.toLocaleString()}
          </p>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {canSeeDeals && scoped.closing.length > 0 && (
          <section>
            <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <CalendarClock size={14} aria-hidden="true" />
              Closing within {CLOSING_SOON_DAYS} days
            </h3>

            <ul className="mt-2 space-y-1">
              {scoped.closing.map((deal) => {
                const remaining = daysUntil(deal.expectedClose);
                const overdue = remaining !== null && remaining < 0;

                return (
                  <li key={deal.id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/deals?open=${deal.id}`)}
                      className="flex w-full min-h-11 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-left transition hover:border-blue-500 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                          {deal.title}
                        </p>
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                          {deal.customer} · ${Number(deal.value ?? 0).toLocaleString()}
                        </p>
                      </div>

                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${stageBadge(deal.stage)}`}
                        >
                          {deal.stage}
                        </span>

                        <span
                          className={[
                            "text-xs font-medium",
                            overdue
                              ? "text-red-600 dark:text-red-400"
                              : "text-slate-500 dark:text-slate-400",
                          ].join(" ")}
                        >
                          {overdue
                            ? `${Math.abs(remaining)}d overdue`
                            : remaining === 0
                              ? "today"
                              : `in ${remaining}d`}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {canSeeLeads && scoped.stale.length > 0 && (
          <section>
            <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <Hourglass size={14} aria-hidden="true" />
              No activity for {STALE_LEAD_DAYS}+ days
            </h3>

            <ul className="mt-2 space-y-1">
              {scoped.stale.map((lead) => (
                <li key={lead.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/leads?open=${lead.id}`)}
                    className="flex w-full min-h-11 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-left transition hover:border-blue-500 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                        {lead.name}
                      </p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {lead.company}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${leadStatusBadge(lead.status)}`}
                    >
                      {lead.status}
                    </span>

                    <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">
                      {formatRelative(lead.updatedAt ?? lead.createdDate)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-200 pt-3 dark:border-slate-800">
        {canSeeLeads && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => navigate("/leads?scope=mine")}
          >
            My leads
            <ArrowRight size={14} />
          </Button>
        )}

        {canSeeDeals && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => navigate("/deals?scope=mine")}
          >
            My deals
            <ArrowRight size={14} />
          </Button>
        )}
      </div>
    </Card>
  );
}

export default MyWorkPanel;
