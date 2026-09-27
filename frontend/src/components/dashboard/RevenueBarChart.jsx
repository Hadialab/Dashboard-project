import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

const data = [
  { month: "Jan", revenue: 2400 },
  { month: "Feb", revenue: 3200 },
  { month: "Mar", revenue: 4800 },
  { month: "Apr", revenue: 3900 },
  { month: "May", revenue: 5200 },
  { month: "Jun", revenue: 6100 },
];

function RevenueBarChart() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <h2 className="mb-6 text-xl font-semibold">
        Monthly Revenue
      </h2>

      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={data}>
          <XAxis dataKey="month" />

          <YAxis />

          <Tooltip />

          <Bar
            dataKey="revenue"
            fill="#3b82f6"
            radius={[8, 8, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default RevenueBarChart;