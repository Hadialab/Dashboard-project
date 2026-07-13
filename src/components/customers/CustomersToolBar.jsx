import { Search, Filter } from "lucide-react";

function CustomersToolbar() {
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
          className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        />
      </div>

      <div className="flex gap-3">
        <button className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 transition hover:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
          <Filter size={18} />
          Status
        </button>

        <button className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 transition hover:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
          <Filter size={18} />
          Company
        </button>
      </div>
    </div>
  );
}

export default CustomersToolbar;