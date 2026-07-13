import {
  DollarSign,
  Users,
  ShoppingCart,
  TrendingUp,
  UserPlus,
  BriefcaseBusiness
} from "lucide-react";

import StatCard from "./StatCard";

function StatsCards() {
 const stats = [
  {
    title: "Customers",
    value: "1,254",
    change: "+12 this month",
    icon: Users,
    color: "text-green-600",
  },
  {
    title: "Active Leads",
    value: "48",
    change: "+8 today",
    icon: UserPlus,
    color: "text-green-600",
  },
  {
    title: "Open Deals",
    value: "19",
    change: "$245K Pipeline",
    icon: BriefcaseBusiness,
    color: "text-blue-600",
  },
  {
    title: "Revenue",
    value: "$85,450",
    change: "+14% vs last month",
    icon: DollarSign,
    color: "text-green-600",
  },
];

  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <StatCard
          key={stat.title}
          {...stat}
        />
      ))}
    </div>
  );
}

export default StatsCards;