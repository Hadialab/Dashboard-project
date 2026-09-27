import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import Card from "../ui/Card";

// Data comes from the API via getRevenueTrend(). Renders an empty state rather
// than a hardcoded placeholder series when there is no data.
function RevenueBarChart({ revenueData = [] }) {
  return (
    <Card className="p-4">
      <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
        Deal Value by Month
      </h2>

      {revenueData.length === 0 ? (
        <p className="flex h-[240px] items-center justify-center text-sm text-slate-500 dark:text-slate-400">
          No deals to chart yet.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={240} className="sm:h-[350px]">
          <BarChart data={revenueData}>
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} width={50} />
            <Tooltip />
            <Bar dataKey="revenue" fill="#3b82f6" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}

export default RevenueBarChart;
