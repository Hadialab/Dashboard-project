function DealTableSkeleton() {
  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="overflow-x-auto">
        <table className="w-full table-fixed">
          <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
            <tr>
              {Array.from({ length: 7 }).map((_, index) => (
                <th
                  key={index}
                  className="px-4 py-3 text-left"
                >
                  <div className="h-4 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {Array.from({ length: 5 }).map((_, row) => (
              <tr
                key={row}
                className="border-b border-slate-200 dark:border-slate-800"
              >
                {/* Deal */}
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />

                    <div className="space-y-2">
                      <div className="h-4 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                    </div>
                  </div>
                </td>

                {/* Customer */}
                <td className="px-4 py-4">
                  <div className="h-4 w-28 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                </td>

                {/* Value */}
                <td className="px-4 py-4">
                  <div className="h-4 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                </td>

                {/* Stage */}
                <td className="hidden px-4 py-4 sm:table-cell">
                  <div className="h-6 w-24 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
                </td>

                {/* Owner */}
                <td className="hidden px-4 py-4 lg:table-cell">
                  <div className="h-4 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                </td>

                {/* Expected Close */}
                <td className="hidden px-4 py-4 xl:table-cell">
                  <div className="h-4 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                </td>

                {/* Actions */}
                <td className="px-4 py-4">
                  <div className="flex justify-center gap-2">
                    <div className="h-7 w-7 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
                    <div className="h-7 w-7 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
                    <div className="h-7 w-7 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
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

export default DealTableSkeleton;