import { STAGE_PROBABILITY } from "../../utils/crmConstants";

/**
 * The forecast headline: what the open pipeline is worth if it converts at the
 * stage probabilities, alongside the raw open value for comparison.
 *
 * The gap between the two is the point — quoting open pipeline at face value
 * treats a Lead exactly like a Negotiation, which is how forecasts come in
 * wildly high.
 */
function ForecastCard({ forecast }) {
  const {
    openCount = 0,
    openValue = 0,
    weighted = 0,
    wonValue = 0,
    winRate = null,
  } = forecast ?? {};

  // What share of the raw open value survives the weighting. Meaningless with no
  // open pipeline, so it is hidden rather than shown as 0%.
  const confidence = openValue === 0 ? null : Math.round((weighted / openValue) * 100);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
        Revenue Forecast
      </h2>

      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Open pipeline weighted by how likely each stage is to close.
      </p>

      <div className="mt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Weighted forecast
        </p>

        <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">
          ${Math.round(weighted).toLocaleString()}
        </p>

        {confidence !== null && (
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {confidence}% of ${openValue.toLocaleString()} open across{" "}
            {openCount} {openCount === 1 ? "deal" : "deals"}
          </p>
        )}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
        <div>
          <dt className="text-xs text-slate-500 dark:text-slate-400">Open value</dt>
          <dd className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-white">
            ${openValue.toLocaleString()}
          </dd>
        </div>

        <div>
          <dt className="text-xs text-slate-500 dark:text-slate-400">Won to date</dt>
          <dd className="mt-0.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
            ${wonValue.toLocaleString()}
          </dd>
        </div>

        <div>
          <dt className="text-xs text-slate-500 dark:text-slate-400">Win rate</dt>
          <dd className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-white">
            {/* Only deals that have closed can produce a rate. */}
            {winRate === null ? "—" : `${winRate}%`}
          </dd>
        </div>

        <div>
          <dt className="text-xs text-slate-500 dark:text-slate-400">Open deals</dt>
          <dd className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-white">
            {openCount}
          </dd>
        </div>
      </dl>

      {/* The weights are shown rather than hidden, because a forecast whose
          assumptions are invisible is not one anybody can argue with. */}
      <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Assumed close probability
        </p>

        <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
          {Object.entries(STAGE_PROBABILITY)
            .filter(([stage]) => stage !== "Won" && stage !== "Lost")
            .map(([stage, probability]) => (
              <li key={stage} className="text-xs text-slate-500 dark:text-slate-400">
                {stage}{" "}
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {Math.round(probability * 100)}%
                </span>
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
}

export default ForecastCard;
