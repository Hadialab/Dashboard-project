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
    <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
      {/* Revenue */}
      <div className="overflow-hidden rounded-xl border bg-white p-4 sm:p-6 shadow-sm dark:bg-gray-900">
        <h2 className="mb-3 sm:mb-5 text-base sm:text-lg font-semibold">
          Revenue Trend
        </h2>

        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />

           <XAxis dataKey="date" tick={{ fontSize: 12 }} />

           <YAxis tick={{ fontSize: 12 }} />

            <Tooltip />

            <Line
              dataKey="revenue"
              stroke="#2563eb"
             strokeWidth={2}
             dot={false}
           />
         </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Orders */}
      <div className="overflow-hidden rounded-xl border bg-white p-4 sm:p-6 shadow-sm dark:bg-gray-900">
        <h2 className="mb-3 sm:mb-5 text-base sm:text-lg font-semibold">
         Orders
        </h2>

        <ResponsiveContainer width="100%" height={250}>
         <BarChart data={chartData}>
           <CartesianGrid strokeDasharray="3 3" />

           <XAxis dataKey="date" tick={{ fontSize: 12 }} />

           <YAxis tick={{ fontSize: 12 }} />

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