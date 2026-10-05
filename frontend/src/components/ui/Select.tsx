import type { ReactNode, SelectHTMLAttributes } from "react";

/**
 * Select matching Input's field styling, so dropdowns line up with the text
 * fields beside them.
 */
type SelectProps = {
  label?: ReactNode;
  /** A validation message. Its presence is what sets aria-invalid. */
  error?: string;
  className?: string;
  /** Classes for the wrapping div, which owns the label and the error text. */
  containerClassName?: string;
  id?: string;
  children?: ReactNode;
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, "className" | "children" | "id">;

function Select({
  label,
  error,
  className = "",
  containerClassName = "",
  id,
  children,
  ...props
}: SelectProps) {
  // Falling back to `name` means a labelled field without an explicit id still
  // wires up, which is what keeps `getByLabel` working across the whole app.
  const selectId = id ?? props.name;

  return (
    <div className={`space-y-2 ${containerClassName}`}>
      {label && (
        <label
          htmlFor={selectId}
          className="block text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          {label}
        </label>
      )}

      <select
        id={selectId}
        aria-invalid={error ? "true" : undefined}
        className={[
          "w-full appearance-none rounded-lg border bg-white px-4 py-3 text-sm text-slate-900 outline-none transition",
          "focus:border-blue-500",
          "dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100",
          error
            ? "border-red-400 dark:border-red-900"
            : "border-slate-200 dark:border-slate-800",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...props}
      >
        {children}
      </select>

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

export default Select;
