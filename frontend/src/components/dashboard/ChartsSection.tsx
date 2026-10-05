import RevenueBarChart from "./RevenueBarChart";
import DealsPipelineChart from "./DealsPipelineChart";
import type { RevenueTrendPoint, StageCount } from "../../utils/reportAnalytics";

type ChartsSectionProps = {
  revenueData: RevenueTrendPoint[];
  dealsStageData: StageCount[];
};

function ChartsSection({ revenueData, dealsStageData }: ChartsSectionProps) {
  return (
    <section className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
      <RevenueBarChart revenueData={revenueData} />
      <DealsPipelineChart dealsStageData={dealsStageData} />
    </section>
  );
}

export default ChartsSection;