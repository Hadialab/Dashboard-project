import SalesLineChart from "./SalesLineChart";
import RevenueBarChart from "./RevenueBarChart";
import TrafficPieChart from "./TrafficPieChart";
import VisitorsAreaChart from "./VisitorsAreaChart";

function ChartsSection() {
  return (
    <section className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
      <div className="space-y-6">
        <SalesLineChart />
        <VisitorsAreaChart />
      </div>

      <div className="grid gap-6">
        <RevenueBarChart />
        <TrafficPieChart />
      </div>
    </section>
  );
}

export default ChartsSection;