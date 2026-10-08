import {
  DollarSign,
  Users,
  UserPlus,
  Handshake,
  ArrowUpRight,
} from "lucide-react";

const SummaryCards = ({ summary }) => {
  const cards = [
    {
      title: "Customers",
      value: summary.totalCustomers.toLocaleString(),
      subtitle: "Total Customers",
      trend: "+8.2%",
      icon: Users,
      bg: "bg-blue-100 dark:bg-blue-900/30",
      iconColor: "text-blue-600",
    },
    {
      title: "Leads",
      value: summary.totalLeads.toLocaleString(),
      subtitle: "Active Leads",
      trend: "+5.7%",
      icon: UserPlus,
      bg: "bg-yellow-100 dark:bg-yellow-900/30",
      iconColor: "text-yellow-600",
    },
    {
      title: "Deals",
      value: summary.totalDeals.toLocaleString(),
      subtitle: "Open Deals",
      trend: "+10.4%",
      icon: Handshake,
      bg: "bg-purple-100 dark:bg-purple-900/30",
      iconColor: "text-purple-600",
    },
    {
      title: "Revenue",
      value: `$${summary.totalRevenue.toLocaleString()}`,
      subtitle: "Pipeline Revenue",
      trend: "+12.9%",
      icon: DollarSign,
      bg: "bg-emerald-100 dark:bg-emerald-900/30",
      iconColor: "text-emerald-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <div
            key={card.title}
            className="
              group
              overflow-hidden
              rounded-xl
              border
              border-slate-200
              bg-white
              p-4
              shadow-sm
              transition-all
              duration-300
              hover:-translate-y-1
              dark:border-slate-800
              dark:bg-slate-950
            "
          >
            <div className="flex items-center justify-between">
              <div
                className={`rounded-lg p-2 sm:p-2.5 ${card.bg}`}
              >
                <Icon
                  className={card.iconColor}
                  size={16}
                />
              </div>

              <div className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-600 dark:bg-green-900/30 dark:text-green-400">
                <ArrowUpRight size={12} />
                {card.trend}
              </div>
            </div>

            <div className="mt-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {card.title}
              </p>

              <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                {card.value}
              </h2>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {card.subtitle}
              </p>
            </div>

            <div className="mt-3 h-1 w-0 rounded-full bg-blue-600 transition-all duration-500 group-hover:w-full"></div>
          </div>
        );
      })}
    </div>
  );
};

export default SummaryCards;