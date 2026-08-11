import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../api/axios";

import SummaryCards from "../components/reports/SummaryCards";
import ReportsCharts from "../components/reports/ReportsCharts";
import ReportsTable from "../components/reports/ReportsTable";
import Pagination from "../components/reports/Pagination";

import {
  getSummaryMetrics,
  getRevenueTrend,
  getRecentDeals,
  getDealsByStage,
  getLeadsByStatus,
} from "../utils/reportAnalytics";



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

  const totalPages = Math.max(
    1,
    Math.ceil(sortedReports.length / itemsPerPage)
  );

  const startIndex = (currentPage - 1) * itemsPerPage;

  const paginatedReports = sortedReports.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        Loading reports...
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 px-4 sm:space-y-6 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">
          CRM Reports & Analytics
        </h1>

        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          Analyze customers, leads, deals, and revenue with real-time CRM
          insights.
        </p>
      </div>

      <SummaryCards summary={summary} />

      <ReportsCharts
        revenueData={revenueData}
        dealsStageData={dealsStageData}
        leadsStatusData={leadsStatusData}
      />

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