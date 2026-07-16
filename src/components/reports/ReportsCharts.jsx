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

const ReportsCharts = ({
  revenueData,
  dealsStageData,
}) => {
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4">
      {/* Revenue Trend */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-4 lg:p-5">
        <h2 className="mb-3 text-sm font-semibold sm:text-base">
          Revenue Trend
        </h2>

        <div className="h-[200px] sm:h-[220px] lg:h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={revenueData}
              margin={{
                top: 5,
                right: 10,
                left: -10,
                bottom: 0,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />

              <XAxis
                dataKey="month"
                tick={{ fontSize: 10 }}
                interval="preserveStartEnd"
              />

              <YAxis
                tick={{ fontSize: 10 }}
                width={30}
              />

              <Tooltip />

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
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-4 lg:p-5">
        <h2 className="mb-3 text-sm font-semibold sm:text-base">
          Deals by Stage
        </h2>

        <div className="h-[200px] sm:h-[220px] lg:h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={dealsStageData}
              margin={{
                top: 5,
                right: 10,
                left: -10,
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
                width={30}
              />

              <Tooltip />

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