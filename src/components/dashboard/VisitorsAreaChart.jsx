import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

const visitorsData = [
  { month: "Jan", visitors: 2800 },
  { month: "Feb", visitors: 3200 },
  { month: "Mar", visitors: 3600 },
  { month: "Apr", visitors: 4200 },
  { month: "May", visitors: 4700 },
  { month: "Jun", visitors: 5200 },
  { month: "Jul", visitors: 5600 },
  { month: "Aug", visitors: 6100 },
];

function VisitorsAreaChart() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-950">
      <div className="mb-6">
        <p className="text-sm text-slate-500">Visitor growth</p>
        <h2 className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
          Website traffic
        </h2>
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={visitorsData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="visitorsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: "1px solid #e2e8f0",
                backgroundColor: "#fff",
                color: "#0f172a",
              }}
            />
            <Area type="monotone" dataKey="visitors" stroke="#2563eb" fill="url(#visitorsGradient)" strokeWidth={3} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default VisitorsAreaChart;
