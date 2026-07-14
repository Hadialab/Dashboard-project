import {
  DollarSign,
  ShoppingCart,
  Users,
  TrendingUp,
  ArrowUpRight,
} from "lucide-react";
import useReportStore from "../../store/reportStore";

const SummaryCards = () => {
  const { filteredReports } = useReportStore();

  const totalRevenue = filteredReports.reduce(
    (sum, report) => sum + report.amount,
    0
  );

  const totalOrders = filteredReports.reduce(
    (sum, report) => sum + report.orders,
    0
  );

  const totalCustomers = filteredReports.length;

  const averageOrder =
    totalOrders === 0 ? 0 : totalRevenue / totalOrders;

  const cards = [
    {
      title: "Revenue",
      value: `$${totalRevenue.toLocaleString()}`,
      subtitle: "Total Revenue",
      trend: "+12.4%",
      icon: DollarSign,
      bg: "bg-emerald-100 dark:bg-emerald-900/30",
      iconColor: "text-emerald-600",
    },
    {
      title: "Orders",
      value: totalOrders.toLocaleString(),
      subtitle: "Completed Orders",
      trend: "+8.2%",
      icon: ShoppingCart,
      bg: "bg-blue-100 dark:bg-blue-900/30",
      iconColor: "text-blue-600",
    },
    {
      title: "Customers",
      value: totalCustomers.toLocaleString(),
      subtitle: "Filtered Customers",
      trend: "+5.9%",
      icon: Users,
      bg: "bg-purple-100 dark:bg-purple-900/30",
      iconColor: "text-purple-600",
    },
    {
      title: "Average Order",
      value: `$${averageOrder.toFixed(2)}`,
      subtitle: "Average Value",
      trend: "+3.4%",
      icon: TrendingUp,
      bg: "bg-orange-100 dark:bg-orange-900/30",
      iconColor: "text-orange-600",
    },
  ];

  return (
    <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <div
            key={card.title}
            className="
              group
              overflow-hidden
              rounded-2xl
              border
              border-gray-200
              bg-white
              p-4
              sm:p-6
              shadow-sm
              transition-all
              duration-300
              hover:-translate-y-1
              hover:shadow-xl
              dark:border-gray-800
              dark:bg-gray-900
            "
          >
            <div className="flex items-center justify-between">
              <div
                className={`rounded-xl p-2 sm:p-3 ${card.bg}`}
              >
                <Icon
                  className={card.iconColor}
                  size={20}
                />
              </div>

              <div className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-600 dark:bg-green-900/30">
                <ArrowUpRight size={12} />
                {card.trend}
              </div>
            </div>

            <div className="mt-4 sm:mt-6">
              <p className="text-xs sm:text-sm text-gray-500">
                {card.title}
              </p>

              <h2 className="mt-1 sm:mt-2 text-2xl sm:text-4xl font-bold tracking-tight">
                {card.value}
              </h2>

              <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-gray-500">
                {card.subtitle}
              </p>
            </div>

            <div className="mt-4 sm:mt-6 h-1 w-0 rounded-full bg-blue-600 transition-all duration-500 group-hover:w-full"></div>
          </div>
        );
      })}
    </div>
  );
};

export default SummaryCards;