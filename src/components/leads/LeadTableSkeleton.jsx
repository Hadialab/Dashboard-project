function LeadsTableSkeleton() {
  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          {/* Header */}
          <thead className="bg-slate-50 dark:bg-slate-800">
            <tr>
              {[
                "Lead",
                "Company",
                "Email",
                "Status",
                "Source",
                "Assigned Rep",
                "Actions",
              ].map((header) => (
                <th
                  key={header}
                  className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>

          {/* Skeleton Rows */}
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {Array.from({ length: 5 }).map((_, index) => (
              <tr key={index} className="animate-pulse">
                {/* Lead */}
                <td className="px-6 py-4">
                  <div className="space-y-2">
                    <div className="h-4 w-32 rounded bg-slate-200 dark:bg-slate-700" />
                    <div className="h-3 w-24 rounded bg-slate-200 dark:bg-slate-700" />
                  </div>
                </td>

                {/* Company */}
                <td className="px-6 py-4">
                  <div className="h-4 w-28 rounded bg-slate-200 dark:bg-slate-700" />
                </td>

                {/* Email */}
                <td className="px-6 py-4">
                  <div className="h-4 w-40 rounded bg-slate-200 dark:bg-slate-700" />
                </td>

                {/* Status */}
                <td className="px-6 py-4">
                  <div className="h-6 w-20 rounded-full bg-slate-200 dark:bg-slate-700" />
                </td>

                {/* Source */}
                <td className="px-6 py-4">
                  <div className="h-6 w-24 rounded-full bg-slate-200 dark:bg-slate-700" />
                </td>

                {/* Assigned Rep */}
                <td className="px-6 py-4">
                  <div className="h-4 w-28 rounded bg-slate-200 dark:bg-slate-700" />
                </td>

                {/* Actions */}
                <td className="px-6 py-4">
                  <div className="flex justify-end gap-2">
                    <div className="h-9 w-9 rounded-lg bg-slate-200 dark:bg-slate-700" />
                    <div className="h-9 w-9 rounded-lg bg-slate-200 dark:bg-slate-700" />
                    <div className="h-9 w-9 rounded-lg bg-slate-200 dark:bg-slate-700" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default LeadsTableSkeleton;