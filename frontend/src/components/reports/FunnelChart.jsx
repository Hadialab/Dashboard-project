import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// Matches the stage badge colours, so the funnel and the tables agree on what
// "Proposal" looks like.
const FUNNEL_FILL = {
  Lead: "#3b82f6",
  Qualified: "#eab308",
  Proposal: "#a855f7",
  Negotiation: "#f97316",
  Won: "#22c55e",
};

/**
 * Deal count at each stage, with the drop-off to the next.
 *
 * A horizontal bar rather than a tapered funnel, because the bar can carry a
 * count and a drop-off label legibly at mobile width; a funnel shape with this
 * much text on it would be unreadable on a phone.
 *
 * The caveat that matters is in getStageFunnel: these are current positions, not
 * cumulative reach.
 */
function FunnelChart({ data }) {
  const hasDeals = data.some((row) => row.count > 0);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
        Pipeline Funnel
      </h2>

      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Deals at each stage right now. A later stage can hold more than an earlier
        one, since deals enter at Lead and move forward.
      </p>

      {!hasDeals ? (
        <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
          No deals to chart yet.
        </p>
      ) : (
        <div className="mt-3 h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 4, right: 56, left: 8, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />

              <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="stage"
                tick={{ fontSize: 11 }}
                width={82}
              />

              <Tooltip
                formatter={(value, _name, item) => [
                  `${value} ${value === 1 ? "deal" : "deals"} · $${item.payload.value.toLocaleString()}`,
                  "At this stage",
                ]}
              />

              <Bar dataKey="count" radius={[0, 5, 5, 0]} barSize={22}>
                {data.map((row) => (
                  <Cell
                    key={row.stage}
                    fill={FUNNEL_FILL[row.stage] ?? "#64748b"}
                  />
                ))}

                {/* The count on the bar, and the drop-off beside it. Both are
                    omitted rather than shown as a misleading 0%. */}
                <LabelList
                  dataKey="count"
                  position="right"
                  offset={8}
                  className="fill-slate-700 dark:fill-slate-200"
                  style={{ fontSize: 11, fontWeight: 600 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* The stage-to-stage change as a list, because at mobile width the
          chart's own labels are too small to read and this is the number people
          came for.

          A later stage can legitimately hold more deals than an earlier one —
          deals enter at Lead and work forward — so that case is labelled as
          growth rather than dressed up as a negative drop-off. */}
      <ul className="mt-3 space-y-1 border-t border-slate-100 pt-3 dark:border-slate-800">
        {data.map((row, index) => {
          const next = data[index + 1];
          if (!next) return null;

          return (
            <li
              key={row.stage}
              className="flex flex-wrap items-center justify-between gap-2 text-sm"
            >
              <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: FUNNEL_FILL[row.stage] ?? "#64748b" }}
                  aria-hidden="true"
                />
                {row.stage} → {next.stage}
              </span>

              <span className="text-slate-500 dark:text-slate-400">
                {row.change === 0 ? (
                  "no change"
                ) : row.grew ? (
                  <>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      +{row.change}
                    </span>{" "}
                    more progressed
                  </>
                ) : (
                  <>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {row.dropOff}%
                    </span>{" "}
                    drop-off · {next.count} of {row.count}
                  </>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default FunnelChart;
