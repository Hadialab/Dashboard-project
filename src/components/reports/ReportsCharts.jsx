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

import useReportStore from "../../store/reportStore";

const ReportsCharts = () => {
  const { filteredReports } = useReportStore();

  const chartData = filteredReports.map((report) => ({
    date: report.date.slice(5),
    revenue: report.amount,
    orders: report.orders,
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Revenue */}
      <div className="rounded-xl border bg-white p-6 shadow-sm dark:bg-gray-900">
        <h2 className="mb-5 text-lg font-semibold">
          Revenue Trend
        </h2>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />

            <XAxis dataKey="date" />

            <YAxis />

            <Tooltip />

            <Line
              dataKey="revenue"
              stroke="#2563eb"
              strokeWidth={3}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Orders */}
      <div className="rounded-xl border bg-white p-6 shadow-sm dark:bg-gray-900">
        <h2 className="mb-5 text-lg font-semibold">
          Orders
        </h2>

        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />

            <XAxis dataKey="date" />

            <YAxis />

            <Tooltip />

            <Bar
              dataKey="orders"
              fill="#22c55e"
              radius={[5, 5, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ReportsCharts;