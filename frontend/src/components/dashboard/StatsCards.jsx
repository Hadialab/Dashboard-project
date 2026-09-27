import { DollarSign, Users, UserPlus, BriefcaseBusiness } from "lucide-react";
import StatCard from "./StatCard";

// Figures are derived from the API response via getSummaryMetrics(), so these
// match the Reports page instead of being hardcoded placeholders.
function StatsCards({ summary }) {
  const {
    totalCustomers,
    totalLeads,
    totalDeals,
    totalRevenue,
    averageDealValue,
  } = summary;

  const stats = [
    {
      title: "Customers",
      value: totalCustomers.toLocaleString(),
      change: "Total on record",
      icon: Users,
      color: "text-slate-500 dark:text-slate-400",
    },
    {
      title: "Leads",
      value: totalLeads.toLocaleString(),
      change: "Total on record",
      icon: UserPlus,
      color: "text-slate-500 dark:text-slate-400",
    },
    {
      title: "Deals",
      value: totalDeals.toLocaleString(),
      change: `Avg $${Math.round(averageDealValue).toLocaleString()}`,
      icon: BriefcaseBusiness,
      color: "text-blue-600",
    },
    {
      title: "Deal Value",
      value: `$${totalRevenue.toLocaleString()}`,
      change: "Sum of all deals",
      icon: DollarSign,
      color: "text-green-600",
    },
  ];

  // 1 column on mobile, 2 on tablet, 4 on desktop.
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
      {stats.map((stat) => (
        <StatCard key={stat.title} {...stat} />
      ))}
    </div>
  );
}

export default StatsCards;
