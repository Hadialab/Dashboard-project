import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import Card from "../ui/Card";
import { formatAxisCount } from "../../utils/chartFormat";

// Data comes from the API via getDealsByStage().
function DealsPipelineChart({ dealsStageData = [] }) {
  return (
    <Card className="p-4">
      <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
        Deals by Stage
      </h2>

      {dealsStageData.length === 0 ? (
        <p className="flex h-[240px] items-center justify-center text-sm text-slate-500 dark:text-slate-400">
          No deals to chart yet.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={240} className="sm:h-[350px]">
          <BarChart data={dealsStageData}>
            <XAxis dataKey="stage" tick={{ fontSize: 12 }} interval={0} />
            {/* allowDecimals: a deal count is a whole number, and a "1.5 deals"
                axis tick is a small thing that makes the chart look broken. */}
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={formatAxisCount}
              width={40}
              allowDecimals={false}
            />
            <Tooltip formatter={(value) => [`${value} ${value === 1 ? "deal" : "deals"}`, "Deals"]} />
            <Bar dataKey="count" fill="#22c55e" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}

export default DealsPipelineChart;
