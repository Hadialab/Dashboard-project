import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";

import { formatAxisCount, formatAxisMoney, formatMoney } from "../../utils/chartFormat";
import type { RevenueTrendPoint, StageCount, StatusCount } from "../../utils/reportAnalytics";
import type { ValueType } from "recharts/types/component/DefaultTooltipContent";

type ReportsChartsProps = {
  /** One point per month that has an expected close date. */
  revenueData: RevenueTrendPoint[];
  /** One row per stage present in the data, not per canonical stage. */
  dealsStageData: StageCount[];
  /**
   * Passed by the page and deliberately not drawn — there is no leads-by-status
   * chart here. Accepted so the call site keeps compiling; removing it from the
   * page is a change to Reports.jsx, not to this component.
   */
  leadsStatusData?: StatusCount[];
};

const ReportsCharts = ({
  revenueData,
  dealsStageData,
}: ReportsChartsProps) => {
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4">
      {/* Revenue Trend */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">
          Revenue Trend
        </h2>

        <div className="h-[200px] sm:h-[220px] lg:h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={revenueData}
              margin={{
                top: 5,
                right: 10,
                left: 0,
                bottom: 0,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />

              <XAxis
                dataKey="month"
                tick={{ fontSize: 10 }}
                interval="preserveStartEnd"
              />

              {/* tickFormatter is not decoration. A raw 125000 does not fit a
                  30px axis, and Recharts clips rather than shrinks, so the
                  labels read ",00" and "0" — which looks like a broken
                  calculation rather than a broken label. See utils/chartFormat. */}
              <YAxis
                tick={{ fontSize: 10 }}
                tickFormatter={formatAxisMoney}
                width={54}
              />

              {/* Same cast as RevenueBarChart: recharts widens the formatter's argument to
                  ValueType for any series, and this one holds numbers. */}
              <Tooltip formatter={(value: ValueType) => [formatMoney(value as number), "Revenue"]} />

              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#2563eb"
                strokeWidth={2.5}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Deals by Stage */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">
          Deals by Stage
        </h2>

        <div className="h-[200px] sm:h-[220px] lg:h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={dealsStageData}
              margin={{
                top: 5,
                right: 10,
                left: 0,
                bottom: 22,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />

              <XAxis
                dataKey="stage"
                tick={{ fontSize: 10 }}
                interval={0}
                angle={-20}
                textAnchor="end"
                height={42}
              />

              <YAxis
                tick={{ fontSize: 10 }}
                tickFormatter={formatAxisCount}
                width={34}
                allowDecimals={false}
              />

              <Tooltip
                formatter={(value) => [`${value} ${value === 1 ? "deal" : "deals"}`, "Deals"]}
              />

              <Bar
                dataKey="count"
                fill="#22c55e"
                radius={[5, 5, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default ReportsCharts;