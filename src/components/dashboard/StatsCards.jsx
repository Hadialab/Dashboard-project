import {
  DollarSign,
  Users,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";

import StatCard from "./StatCard";

function StatsCards() {
  const stats = [
    {
      title: "Revenue",
      value: "$24,560",
      change: "+12.5%",
      icon: DollarSign,
      color: "text-green-600",
    },
    {
      title: "Users",
      value: "3,245",
      change: "+8.3%",
      icon: Users,
      color: "text-green-600",
    },
    {
      title: "Orders",
      value: "845",
      change: "-2.1%",
      icon: ShoppingCart,
      color: "text-red-500",
    },
    {
      title: "Growth",
      value: "18%",
      change: "+4.7%",
      icon: TrendingUp,
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