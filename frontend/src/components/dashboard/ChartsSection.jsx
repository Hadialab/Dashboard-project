import RevenueBarChart from "./RevenueBarChart";
import DealsPipelineChart from "./DealsPipelineChart";

function ChartsSection({ revenueData, dealsStageData }) {
  return (
    <section className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
      <RevenueBarChart revenueData={revenueData} />
      <DealsPipelineChart dealsStageData={dealsStageData} />
    </section>
  );
}

export default ChartsSection;
