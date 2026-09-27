function RowsPerPage({ value, onChange }) {
  return (
    <div className="flex items-center justify-between gap-3 sm:justify-start">
      <label
        htmlFor="rowsPerPage"
        className="text-sm text-slate-600 dark:text-slate-400"
      >
        Rows per page
      </label>

      <select
        id="rowsPerPage"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
      >
        <option value={10}>10</option>
        <option value={25}>25</option>
        <option value={50}>50</option>
        <option value={100}>100</option>
      </select>
    </div>
  );
}

export default RowsPerPage;