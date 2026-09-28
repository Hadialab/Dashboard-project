/**
 * Per-rep performance: deal count, total value, win rate.
 *
 * A table rather than another chart. There are four numbers per person, they need
 * to be read as a set, and there are rarely more than a handful of reps — a bar
 * chart of four columns per rep is harder to compare than numbers in a grid.
 */
function OwnerPerformanceTable({ rows }) {
  if (!rows || rows.length === 0) {
    return (
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Performance by Owner
        </h2>

        <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
          No deals to report yet.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="border-b border-slate-200 p-4 dark:border-slate-800">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Performance by Owner
        </h2>

        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Win rate counts only deals that have closed — an open deal has neither
          been won nor lost.
        </p>
      </div>

      {/* Scrolls inside its own container rather than pushing the page sideways. */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-max text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
            <tr className="text-left">
              <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">
                Owner
              </th>
              <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">
                Deals
              </th>
              <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">
                Open
              </th>
              <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">
                Won
              </th>
              <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">
                Lost
              </th>
              <th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-200">
                Total value
              </th>
              <th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-200">
                Avg deal
              </th>
              <th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-200">
                Win rate
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr
                key={row.owner}
                className="border-b border-slate-100 transition last:border-none hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
              >
                <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                  {row.owner}
                </td>

                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                  {row.deals}
                </td>

                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                  {row.open}
                </td>

                <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400">
                  {row.won}
                </td>

                <td className="px-4 py-3 text-rose-600 dark:text-rose-400">
                  {row.lost}
                </td>

                <td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-white">
                  ${row.value.toLocaleString()}
                </td>

                <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">
                  ${Math.round(row.average).toLocaleString()}
                </td>

                <td className="px-4 py-3 text-right">
                  {row.winRate === null ? (
                    <span className="text-slate-400" title="No deals have closed yet">
                      —
                    </span>
                  ) : (
                    <span
                      className={
                        row.winRate >= 50
                          ? "font-medium text-emerald-600 dark:text-emerald-400"
                          : "text-slate-600 dark:text-slate-300"
                      }
                    >
                      {row.winRate}%
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default OwnerPerformanceTable;
