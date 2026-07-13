import RevenueBarChart from "./RevenueBarChart";
import DealsPipelineChart from "./DealsPipelineChart";

function ChartsSection() {
  return (
    <section className="grid gap-6 lg:grid-cols-2">
      <RevenueBarChart />
      <DealsPipelineChart />
    </section>
  );
}

export default ChartsSection;