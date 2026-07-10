import WelcomeHeader from "../components/dashboard/WelcomeHeader";
import StatsCards from "../components/dashboard/StatsCards";
import ChartsSection from "../components/dashboard/ChartsSection";
import QuickActions from "../components/dashboard/QuickActions";
import RecentActivity from "../components/dashboard/RecentActivity";

function Dashboard() {
  return (
    <div className="space-y-8">
      <div className="grid gap-6 xl:grid-cols-[1.55fr_0.95fr]">
        <WelcomeHeader />
        <QuickActions />
      </div>

      <StatsCards />

      <ChartsSection />

      <RecentActivity />
    </div>
  );
}

export default Dashboard;