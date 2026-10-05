import RevenueBarChart from "./RevenueBarChart";
import DealsPipelineChart from "./DealsPipelineChart";

/** One month of the revenue trend. */
type RevenuePoint = {
  month: string;
  revenue: number;
};

/** One stage's deal count. */
type StageCount = {
  stage: string;
  count: number;
};

type ChartsSectionProps = {
  revenueData: RevenuePoint[];
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