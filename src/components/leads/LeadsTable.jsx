import { Eye, Pencil, Trash2 } from "lucide-react";

const statusColors = {
  New:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",

  Contacted:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400",

  Qualified:
    "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400",

  Proposal:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400",

  Lost:
    "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400",
};

const sourceColors = {
  Website:
    "bg-sky-100 text-sky-700 dark:bg-sky-900/20 dark:text-sky-400",

  Referral:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400",

  LinkedIn:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",

  Facebook:
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400",

  "Google Ads":
    "bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400",

  "Cold Call":
    "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

function LeadsTable({
  leads,
  onViewLead,
  onEditLead,
  onDeleteLead,
}) {
  return (
    <div className="mt-4 sm:mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="overflow-x-auto">
        <table className="w-full table-fixed">
          <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
            <tr className="text-xs sm:text-sm">
              <th className="px-2 py-2.5 sm:px-4 sm:py-3 text-left font-semibold whitespace-nowrap">
                Lead
              </th>

              <th className="px-2 py-2.5 sm:px-4 sm:py-3 text-left font-semibold whitespace-nowrap">
                Company
              </th>

              <th className="hidden md:table-cell px-2 py-2.5 sm:px-4 sm:py-3 text-left font-semibold whitespace-nowrap">
                Email
              </th>

              <th className="hidden sm:table-cell px-2 py-2.5 sm:px-4 sm:py-3 text-left font-semibold whitespace-nowrap">
  Status
</th>

              <th className="hidden lg:table-cell px-2 py-2.5 sm:px-4 sm:py-3 text-left font-semibold whitespace-nowrap">
                Source
              </th>

              <th className="hidden xl:table-cell px-2 py-2.5 sm:px-4 sm:py-3 text-left font-semibold whitespace-nowrap">
                Assigned Rep
              </th>

              <th className="px-2 py-2.5 sm:px-4 sm:py-3 text-center font-semibold whitespace-nowrap">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {leads.map((lead) => (
              <tr
                key={lead.id}
                className="border-b border-slate-200 transition text-xs sm:text-sm hover:bg-slate-50 last:border-none dark:border-slate-800 dark:hover:bg-slate-900"
              >
                <td className="hidden sm:table-cell px-2 py-2.5 sm:px-4 sm:py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="flex h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
                      {lead.name.charAt(0)}
                    </div>

                    <div className="min-w-0 max-w-[120px]">
                      <p className="truncate font-medium text-slate-900 dark:text-white">
                        {lead.name}
                      </p>

                     <p className="hidden sm:block truncate text-xs text-slate-500 dark:text-slate-400">
  {lead.phone}
</p>
                    </div>
                  </div>
                </td>

                <td className="max-w-[140px] px-2 py-2.5 sm:px-4 sm:py-3 truncate text-slate-600 dark:text-slate-300">
                  {lead.company}
                </td>

                <td className="hidden md:table-cell max-w-[180px] px-2 py-2.5 sm:px-4 sm:py-3 text-xs truncate text-slate-600 dark:text-slate-300">
                  {lead.email}
                </td>

                <td className="px-2 py-2.5 sm:px-4 sm:py-3 whitespace-nowrap">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold sm:px-3 sm:py-1 ${
                      statusColors[lead.status]
                    }`}
                  >
                    {lead.status}
                  </span>
                </td>

                <td className="hidden lg:table-cell px-2 py-2.5 sm:px-4 sm:py-3 whitespace-nowrap">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold sm:px-3 sm:py-1 ${
                      sourceColors[lead.source]
                    }`}
                  >
                    {lead.source}
                  </span>
                </td>

                <td className="hidden xl:table-cell px-2 py-2.5 sm:px-4 sm:py-3 text-slate-600 dark:text-slate-300">
                  {lead.assignedRep}
                </td>

           <td className="px-2 py-2.5 sm:px-4 sm:py-3 whitespace-nowrap">
  <div className="flex justify-center gap-1">
    <button
      onClick={() => onViewLead(lead)}
      className="rounded-md p-1 transition hover:bg-slate-100 dark:hover:bg-slate-800"
    >
     <Eye size={14} />
    </button>

    <button
      onClick={() => onEditLead(lead)}
      className="rounded-md p-1 transition hover:bg-slate-100 dark:hover:bg-slate-800"
    >
      <Pencil
        size={14}
       
      />
    </button>

    <button
      onClick={() => onDeleteLead(lead)}
      className="rounded-md p-1 transition hover:bg-red-50 dark:hover:bg-red-900/20"
    >
      <Trash2 size={14} />
    </button>
  </div>
</td>

                 
               

               
             
            </tr>))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default LeadsTable;