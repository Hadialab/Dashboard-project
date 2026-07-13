export const customers = [
  {
    id: 1,
    name: "John Smith",
    company: "Tech Solutions",
    email: "john@techsolutions.com",
    status: "Active",
  },
  {
    id: 2,
    name: "Sarah Johnson",
    company: "Creative Studio",
    email: "sarah@creative.com",
    status: "Active",
  },
  {
    id: 3,
    name: "Michael Brown",
    company: "Future Systems",
    email: "michael@future.com",
    status: "Inactive",
  },
  {
    id: 4,
    name: "Emily Davis",
    company: "NextGen Ltd",
    email: "emily@nextgen.com",
    status: "Pending",
  },
];
const statusColors = {
  Active:
    "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400",

  Pending:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400",

  Inactive:
    "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400",
};