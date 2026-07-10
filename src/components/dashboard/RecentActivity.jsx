import { Download, RefreshCcw } from "lucide-react";

const activityItems = [
  {
    title: "New subscription",
    description: "Acme Corp purchased the Pro plan.",
    time: "5m ago",
    status: "Success",
  },
  {
    title: "Payment failed",
    description: "Customer card declined on renewal.",
    time: "22m ago",
    status: "Failed",
  },
  {
    title: "Team member added",
    description: "A new collaborator joined the Sales team.",
    time: "1h ago",
    status: "Pending",
  },
  {
    title: "Export completed",
    description: "Monthly report is ready for download.",
    time: "2h ago",
    status: "Success",
  },
];

const statusStyles = {
  Success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-200/10 dark:text-emerald-300",
  Failed: "bg-rose-100 text-rose-700 dark:bg-rose-200/10 dark:text-rose-300",
  Pending: "bg-amber-100 text-amber-700 dark:bg-amber-200/10 dark:text-amber-300",
};

function RecentActivity() {
  function exportCsv() {
    const csvRows = [
      ["Title", "Description", "Time", "Status"],
      ...activityItems.map((item) => [item.title, item.description, item.time, item.status]),
    ];

    const csvContent = csvRows.map((row) => row.map((value) => `"${value}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "recent-activity.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
            Recent activity
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-900 dark:text-white">
            Latest updates
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-blue-500 dark:hover:bg-slate-950"
          >
            <Download size={16} />
            Export CSV
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-blue-500 dark:hover:bg-slate-950"
          >
            <RefreshCcw size={16} />
            Refresh
          </button>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {activityItems.map((item) => (
          <div key={item.title} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-300 hover:bg-white dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-500 dark:hover:bg-slate-950">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">{item.title}</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{item.description}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-500 dark:text-slate-400">{item.time}</span>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[item.status]}`}>
                  {item.status}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default RecentActivity;
