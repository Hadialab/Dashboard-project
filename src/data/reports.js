const reportTypes = [
  "Sales",
  "Orders",
  "Customers",
  "Products",
];

const statuses = [
  "Completed",
  "Pending",
  "Cancelled",
];

const customers = [
  "John Smith",
  "Sarah Johnson",
  "Michael Brown",
  "Emily Davis",
  "David Wilson",
  "Olivia Miller",
  "James Taylor",
  "Sophia Anderson",
  "Daniel Thomas",
  "Emma Jackson",
];

const reports = Array.from({ length: 100 }, (_, index) => ({
  id: index + 1,

  customer:
    customers[Math.floor(Math.random() * customers.length)],

  reportType:
    reportTypes[Math.floor(Math.random() * reportTypes.length)],

  status:
    statuses[Math.floor(Math.random() * statuses.length)],

  amount: Math.floor(Math.random() * 5000) + 500,

  orders: Math.floor(Math.random() * 25) + 1,

  date: `2026-07-${String((index % 30) + 1).padStart(2, "0")}`,
}));

export default reports;