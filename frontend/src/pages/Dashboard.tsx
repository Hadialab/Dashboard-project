import { useState, useEffect, useCallback } from "react";
import api from "../api/axios";
import WelcomeHeader from "../components/dashboard/WelcomeHeader";
import StatsCards from "../components/dashboard/StatsCards";
import ChartsSection from "../components/dashboard/ChartsSection";
import QuickActions from "../components/dashboard/QuickActions";
import RecentActivity from "../components/dashboard/RecentActivity";
import MyWorkPanel from "../components/dashboard/MyWorkPanel";
import Skeleton from "../components/ui/Skeleton";
import usePermissions from "../hooks/usePermissions";
import useAuthStore from "../store/authStore";

// Dashboard figures come from the API, not hardcoded placeholders. The same
// analytics helpers the Reports page uses are reused so both screens agree.
import {
  getSummaryMetrics,
  getRevenueTrend,
  getDealsByStage,
  getTopCustomers,
} from "../utils/reportAnalytics";

function Dashboard() {
  const { can } = usePermissions();
  const currentUser = useAuthStore((state) => state.user);
  const [customers, setCustomers] = useState([]);
  const [leads, setLeads] = useState([]);
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const canSeeCustomers = can("customers", "view");
  const canSeeLeads = can("leads", "view");
  const canSeeDeals = can("deals", "view");

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      // Only request what the user may see, rather than asking and getting
      // nothing back.
      const [customersRes, leadsRes, dealsRes] = await Promise.all([
        canSeeCustomers ? api.get("/customers") : Promise.resolve({ data: [] }),
        canSeeLeads ? api.get("/leads") : Promise.resolve({ data: [] }),
        canSeeDeals ? api.get("/deals") : Promise.resolve({ data: [] }),
      ]);

      setCustomers(customersRes.data);
      setLeads(leadsRes.data);
      setDeals(dealsRes.data);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
      setError("Could not load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, [canSeeCustomers, canSeeLeads, canSeeDeals]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28 w-full" />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full" />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-900 dark:bg-red-950">
        <p className="text-sm font-medium text-red-700 dark:text-red-300">
          {error}
        </p>

        <button
          type="button"
          onClick={fetchDashboardData}
          className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          Try again
        </button>
      </div>
    );
  }

  const summary = getSummaryMetrics(customers, leads, deals);
  const revenueData = getRevenueTrend(deals);
  const dealsStageData = getDealsByStage(deals);
  const topCustomers = getTopCustomers(deals);

  // The activity feed is derived from the newest records in each collection,
  // since the API has no activity log.
  const activityItems = [
    ...customers
      .slice()
      .sort((a, b) => String(b.id).localeCompare(String(a.id)))
      .slice(0, 2)
      .map((c) => ({
        id: `c-${c.id}`,
        title: "New customer added",
        description: `${c.name} — ${c.company}`,
        // A date, like every other row here. This was the customer's status, so
        // the row read "Nadine C — Beirut Dairy | Active" in a slot the UI styles
        // and reads as a timestamp — and the CSV export inherited the confusion.
        // createdDate first, so this reads as a plain date like the lead and deal
        // rows rather than as a full ISO instant.
        time: c.createdDate ?? c.createdAt ?? "",
      })),
    ...leads
      .slice()
      .sort((a, b) => String(b.createdDate).localeCompare(String(a.createdDate)))
      .slice(0, 1)
      .map((l) => ({
        id: `l-${l.id}`,
        title: "New lead captured",
        description: `${l.name} via ${l.source}`,
        time: l.createdDate,
      })),
    ...deals
      .slice()
      .sort((a, b) => String(b.createdDate).localeCompare(String(a.createdDate)))
      .slice(0, 2)
      .map((d) => ({
        id: `d-${d.id}`,
        title: `Deal moved to ${d.stage}`,
        description: `${d.title} — $${Number(d.value).toLocaleString()}`,
        time: d.createdDate,
      })),
  ];

  return (
    <div className="space-y-6">
      {/* Stacks on mobile and tablet, side by side only on wide desktop. */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.55fr_0.95fr] xl:gap-6">
        <WelcomeHeader />
        <QuickActions />
      </div>

      <StatsCards summary={summary} />

      <MyWorkPanel
        deals={deals}
        leads={leads}
        user={currentUser}
        canSeeDeals={canSeeDeals}
        canSeeLeads={canSeeLeads}
      />

      <ChartsSection
        revenueData={revenueData}
        dealsStageData={dealsStageData}
      />

      <RecentActivity
        items={activityItems}
        topCustomers={topCustomers}
        onRefresh={fetchDashboardData}
      />
    </div>
  );
}

export default Dashboard;
