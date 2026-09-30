import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Download, FileText, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import api from "../api/axios";

import PageHeader from "../components/ui/PageHeader";
import SummaryCards from "../components/reports/SummaryCards";
import ReportsCharts from "../components/reports/ReportsCharts";
import ReportsTable from "../components/reports/ReportsTable";
import Pagination from "../components/reports/Pagination";
import FunnelChart from "../components/reports/FunnelChart";
import ForecastCard from "../components/reports/ForecastCard";
import OwnerPerformanceTable from "../components/reports/OwnerPerformanceTable";

import {
  getSummaryMetrics,
  getRevenueTrend,
  getRecentDeals,
  getDealsByStage,
  getLeadsByStatus,
  getStageFunnel,
  getRevenueForecast,
  getPerformanceByOwner,
} from "../utils/reportAnalytics";

import exportCsv from "../utils/exportCsv";
import exportPdf from "../utils/exportPdf";



const Reports = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [customers, setCustomers] = useState([]);
  const [leads, setLeads] = useState([]);
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    search: searchParams.get("search") || "",
    reportType: searchParams.get("type") || "All",
    status: searchParams.get("status") || "All",
    sortBy: searchParams.get("sort") || "none",
    dateFrom: searchParams.get("from") || "",
    dateTo: searchParams.get("to") || "",
  });

  const [currentPage, setCurrentPage] = useState(
    Number(searchParams.get("page")) || 1
  );

  // Which export is in flight, so the button being pressed is the one that
  // shows a spinner and the other stays available.
  const [exporting, setExporting] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [customersRes, leadsRes, dealsRes] = await Promise.all([
  api.get("/customers"),
  api.get("/leads"),
  api.get("/deals"),
]);

        setCustomers(customersRes.data);
        setLeads(leadsRes.data);
        setDeals(dealsRes.data);
      } catch (error) {
        console.error("Error loading reports data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();

    if (filters.search.trim()) {
      params.set("search", filters.search);
    }

    if (filters.reportType !== "All") {
      params.set("type", filters.reportType);
    }

    if (filters.status !== "All") {
      params.set("status", filters.status);
    }

    if (filters.sortBy !== "none") {
      params.set("sort", filters.sortBy);
    }

    if (filters.dateFrom) {
      params.set("from", filters.dateFrom);
    }

    if (filters.dateTo) {
      params.set("to", filters.dateTo);
    }

    if (currentPage > 1) {
      params.set("page", currentPage.toString());
    }

    setSearchParams(params, { replace: true });
  }, [filters, currentPage, setSearchParams]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const itemsPerPage = 5;

  const summary = getSummaryMetrics(customers, leads, deals);

  const revenueData = getRevenueTrend(deals);

  const dealsStageData = getDealsByStage(deals);

  const leadsStatusData = getLeadsByStatus(leads);

  const funnelData = getStageFunnel(deals);
  const forecast = getRevenueForecast(deals);
  const ownerPerformance = getPerformanceByOwner(deals);

  const reports = getRecentDeals(deals);

  const filteredReports = reports.filter((deal) => {
    const query = filters.search.toLowerCase();

    const matchesSearch =
      deal.title.toLowerCase().includes(query) ||
      deal.customer.toLowerCase().includes(query) ||
      deal.owner.toLowerCase().includes(query);

    const matchesStage =
      filters.status === "All" ||
      deal.stage === filters.status;

    return matchesSearch && matchesStage;
  });

  const sortedReports = [...filteredReports].sort((a, b) => {
    if (filters.sortBy === "none") return 0;

    const first = String(a[filters.sortBy]).toLowerCase();
    const second = String(b[filters.sortBy]).toLowerCase();

    return first.localeCompare(second);
  });

  const startIndex = (currentPage - 1) * itemsPerPage;

  const paginatedReports = sortedReports.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  /**
   * Exports what the table below is showing — the filtered, sorted rows — rather
   * than every deal in the company, so the file matches the numbers on screen.
   * The button says "filtered" for the same reason.
   */
  const exportRows = sortedReports;

  const handleExportCsv = async () => {
    if (exportRows.length === 0) {
      toast.error("There is nothing to export with these filters.");
      return;
    }

    setExporting("csv");
    try {
      await exportCsv(exportRows);
      toast.success(`Exported ${exportRows.length} deals to CSV.`);
    } catch (error) {
      console.error("CSV export failed:", error);
      toast.error("Could not export the CSV.");
    } finally {
      setExporting(null);
    }
  };

  const handleExportPdf = async () => {
    if (exportRows.length === 0) {
      toast.error("There is nothing to export with these filters.");
      return;
    }

    setExporting("pdf");
    try {
      await exportPdf(exportRows, {
        summary: {
          totalDeals: summary.totalDeals,
          openDeals: forecast.openCount,
          wonValue: forecast.wonValue,
          openValue: forecast.openValue,
          weighted: forecast.weighted,
          winRate: forecast.winRate,
        },
        title: "CRM Deals Report",
      });
      toast.success(`Exported ${exportRows.length} deals to PDF.`);
    } catch (error) {
      console.error("PDF export failed:", error);
      toast.error("Could not export the PDF.");
    } finally {
      setExporting(null);
    }
  };

  const exportButtonClass =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200";

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        Loading reports...
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <PageHeader
        eyebrow="Analytics"
        title="CRM Reports & Analytics"
        description="Analyze customers, leads, deals, and revenue with real-time CRM insights."
        action={
          <>
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={exporting !== null}
              className={exportButtonClass}
            >
              {exporting === "csv" ? (
                <Loader2 size={16} className="animate-spin" aria-hidden="true" />
              ) : (
                <Download size={16} aria-hidden="true" />
              )}
              Export filtered CSV
            </button>

            <button
              type="button"
              onClick={handleExportPdf}
              disabled={exporting !== null}
              className={exportButtonClass}
            >
              {exporting === "pdf" ? (
                <Loader2 size={16} className="animate-spin" aria-hidden="true" />
              ) : (
                <FileText size={16} aria-hidden="true" />
              )}
              Export filtered PDF
            </button>
          </>
        }
      />

      <SummaryCards summary={summary} />

      <ReportsCharts
        revenueData={revenueData}
        dealsStageData={dealsStageData}
        leadsStatusData={leadsStatusData}
      />

      {/* Funnel and forecast side by side; the per-rep table underneath spans
          the full width because it has more columns than fit in half. */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4">
        <FunnelChart data={funnelData} />
        <ForecastCard forecast={forecast} />
      </div>

      <OwnerPerformanceTable rows={ownerPerformance} />

      <ReportsTable
        reports={paginatedReports}
        currentPage={currentPage}
        itemsPerPage={itemsPerPage}
        filters={filters}
        setFilters={setFilters}
      />

      <Pagination
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        totalItems={sortedReports.length}
        itemsPerPage={itemsPerPage}
      />
    </div>
  );
};

export default Reports;