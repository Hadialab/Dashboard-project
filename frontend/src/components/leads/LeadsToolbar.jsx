import { Search } from "lucide-react";

function LeadsToolbar({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusChange,
  sourceFilter,
  onSourceChange,
  sortBy,
  onSortChange,
}) {
  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[260px]">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            type="text"
            placeholder="Search leads..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:ring-blue-500/20"
          />
        </div>

        {/* Status */}
        <select
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value)}
          className="w-full xl:w-44 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:ring-blue-500/20"
        >
          <option value="All">All Statuses</option>
          <option value="New">New</option>
          <option value="Contacted">Contacted</option>
          <option value="Qualified">Qualified</option>
          <option value="Proposal">Proposal</option>
          <option value="Lost">Lost</option>
        </select>

        {/* Source */}
        <select
          value={sourceFilter}
          onChange={(e) => onSourceChange(e.target.value)}
          className="w-full xl:w-44 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:ring-blue-500/20"
        >
          <option value="All">All Sources</option>
          <option value="Website">Website</option>
          <option value="Referral">Referral</option>
          <option value="LinkedIn">LinkedIn</option>
          <option value="Facebook">Facebook</option>
          <option value="Google Ads">Google Ads</option>
          <option value="Cold Call">Cold Call</option>
        </select>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value)}
          className="w-full xl:w-48 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:ring-blue-500/20"
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="name-asc">Name (A-Z)</option>
          <option value="name-desc">Name (Z-A)</option>
          <option value="company-asc">Company (A-Z)</option>
          <option value="company-desc">Company (Z-A)</option>
        </select>
      </div>
    </div>
  );
}

export default LeadsToolbar;