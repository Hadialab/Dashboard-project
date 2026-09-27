import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

const data = [
  { stage: "New", deals: 18 },
  { stage: "Qualified", deals: 12 },
  { stage: "Proposal", deals: 8 },
  { stage: "Negotiation", deals: 5 },
  { stage: "Won", deals: 14 },
];

function DealsPipelineChart() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <h2 className="mb-6 text-xl font-semibold">
        Deals by Stage
      </h2>

      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={data}>
          <XAxis dataKey="stage" />
          <YAxis />
          <Tooltip />
          <Bar
            dataKey="deals"
            fill="#22c55e"
            radius={[8, 8, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default DealsPipelineChart;