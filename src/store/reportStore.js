import { create } from "zustand";
import reportsData from "../data/reports";

const ITEMS_PER_PAGE = 10;

const applyFilters = (reports, filters) => {
  let filtered = reports.filter((report) => {
    const matchesType =
      filters.reportType === "All" ||
      report.reportType === filters.reportType;

    const matchesStatus =
      filters.status === "All" ||
      report.status === filters.status;

    const search = filters.search.toLowerCase();

    const matchesSearch =
      report.customer.toLowerCase().includes(search) ||
      report.reportType.toLowerCase().includes(search) ||
      report.status.toLowerCase().includes(search);

    const reportDate = new Date(report.date);

    const matchesDateFrom =
      !filters.dateFrom ||
      reportDate >= new Date(filters.dateFrom);

    const matchesDateTo =
      !filters.dateTo ||
      reportDate <= new Date(filters.dateTo);

    return (
      matchesType &&
      matchesStatus &&
      matchesSearch &&
      matchesDateFrom &&
      matchesDateTo
    );
  });

  if (filters.sortBy !== "none") {
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case "customer":
          return a.customer.localeCompare(b.customer);

        case "amount":
          return b.amount - a.amount;

        case "orders":
          return b.orders - a.orders;

        case "date":
          return new Date(b.date) - new Date(a.date);

        default:
          return 0;
      }
    });
  }

  return filtered;
};

const useReportStore = create((set, get) => ({
  reports: reportsData,

  filteredReports: reportsData,

  currentPage: 1,

  itemsPerPage: ITEMS_PER_PAGE,

  filters: {
    reportType: "All",
    status: "All",
    search: "",
    sortBy: "none",
    dateFrom: "",
    dateTo: "",
  },

  updateFilters: (newFilters) => {
    const filters = {
      ...get().filters,
      ...newFilters,
    };

    const filtered = applyFilters(reportsData, filters);

    set({
      filters,
      filteredReports: filtered,
      currentPage: 1,
    });
  },

  nextPage: () => {
    const { currentPage, filteredReports, itemsPerPage } = get();

    const totalPages = Math.ceil(
      filteredReports.length / itemsPerPage
    );

    if (currentPage < totalPages) {
      set({
        currentPage: currentPage + 1,
      });
    }
  },

  previousPage: () => {
    const { currentPage } = get();

    if (currentPage > 1) {
      set({
        currentPage: currentPage - 1,
      });
    }
  },

  setPage: (page) => set({ currentPage: page }),
}));

export default useReportStore;