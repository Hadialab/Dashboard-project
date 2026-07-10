import ReportFilters from "../components/reports/ReportFilters";
import SummaryCards from "../components/reports/SummaryCards";
import ReportsCharts from "../components/reports/ReportsCharts";
import ReportsTable from "../components/reports/ReportsTable";
import Pagination from "../components/reports/Pagination";

const Reports = () => {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">
          Business Reports
        </h1>

        <p className="mt-2 text-gray-500">
          Generate, analyze and export business reports.
        </p>
      </div>

      <ReportFilters />

      <SummaryCards />

      <ReportsCharts/>

      <ReportsTable/>

      <Pagination />
    </div>
  );
};

export default Reports;