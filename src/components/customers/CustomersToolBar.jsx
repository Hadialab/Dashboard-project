import { Search, Filter } from "lucide-react";

const CustomersToolbar =({
 searchTerm,
  onSearchChange,
  statusFilter,
  onStatusChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderChange,
})=>{  
 
 
  return (
    <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="relative w-full lg:max-w-md">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <input
          type="text"
          placeholder="Search customers..."
           value={searchTerm}
           onChange={(e)=> onSearchChange(e.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        />
      </div>

  <div className="flex gap-3">
          <select
        value={statusFilter}
        onChange={(e) => onStatusChange(e.target.value)}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900">
      <option value="All">All</option>
      <option value="Active">Active</option>
      <option value="Pending">Pending</option>
      <option value="Inactive">Inactive</option>
         </select>
         
         <select
  value={sortBy}
  onChange={(e) => onSortByChange(e.target.value)}
  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
>
  <option value="name">Name</option>
  <option value="company">Company</option>
  <option value="status">Status</option>
</select>

<select
  value={sortOrder}
  onChange={(e) => onSortOrderChange(e.target.value)}
  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
>
  <option value="asc">Ascending</option>
  <option value="desc">Descending</option>
</select>
       
  </div>
    </div>
  );
}

export default CustomersToolbar;