import type { ChangeEvent } from "react";

/** The page sizes offered. Doubling each time, which is why 10 is the floor. */
const SIZES = [10, 25, 50, 100] as const;

type RowsPerPageProps = {
  value: number;
  /** Receives the new count, already a number. */
  onChange: (rows: number) => void;
};

function RowsPerPage({ value, onChange }: RowsPerPageProps) {
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
        // Parsed here rather than passed through, because the page state is a
        // number and a string would compare false against every option and
        // render the select blank.
        onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange(Number(e.target.value))}
        className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
      >
        {SIZES.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>
    </div>
  );
}

export default RowsPerPage;