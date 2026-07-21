export const getSummaryMetrics = (customers = [], leads = [], deals = []) => {
  const totalCustomers = customers.length;
  const totalLeads = leads.length;
  const totalDeals = deals.length;

  const totalRevenue = deals.reduce((sum, deal) => sum + deal.value, 0);

  const averageDealValue =
    totalDeals === 0 ? 0 : totalRevenue / totalDeals;

  const leadConversionRate =
    totalLeads === 0
      ? 0
      : ((totalDeals / totalLeads) * 100).toFixed(1);

  return {
    totalCustomers,
    totalLeads,
    totalDeals,
    totalRevenue,
    averageDealValue,
    leadConversionRate,
  };
};

export const getRevenueTrend = (deals = []) => {
  const months = {};

  deals.forEach((deal) => {
    const month = deal.expectedClose.slice(0, 7);

    if (!months[month]) {
      months[month] = {
        month,
        revenue: 0,
        deals: 0,
      };
    }

    months[month].revenue += deal.value;
    months[month].deals += 1;
  });

  return Object.values(months);
};

export const getDealsByStage = (deals = []) => {
  const stages = {};

  deals.forEach((deal) => {
    stages[deal.stage] = (stages[deal.stage] || 0) + 1;
  });

  return Object.entries(stages).map(([stage, count]) => ({
    stage,
    count,
  }));
};

export const getLeadsByStatus = (leads = []) => {
  const statuses = {};

  leads.forEach((lead) => {
    statuses[lead.status] = (statuses[lead.status] || 0) + 1;
  });

  return Object.entries(statuses).map(([status, count]) => ({
    status,
    count,
  }));
};

export const getRecentDeals = (deals = []) => {
  return [...deals]
    .sort(
      (a, b) =>
        new Date(b.expectedClose) - new Date(a.expectedClose)
    )
    .slice(0, 10);
};

export const getTopCustomers = (deals = []) => {
  const revenueMap = {};

  deals.forEach((deal) => {
    revenueMap[deal.customer] =
      (revenueMap[deal.customer] || 0) + deal.value;
  });

  return Object.entries(revenueMap)
    .map(([customer, revenue]) => ({
      customer,
      revenue,
    }))
    .sort((a, b) => b.revenue - a.revenue);
};