import type { ComponentType, InputHTMLAttributes, ReactNode } from "react";

/**
 * The field shape used by every form in the app: rounded-lg, px-4 py-3, a label
 * above and an error message below. Icon is an optional leading lucide icon.
 */

/** Narrower than lucide's icon type: this is the whole of what is passed. */
type FieldIcon = ComponentType<{
  size?: number;
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
}>;

type InputProps = {
  label?: ReactNode;
  /** A validation message. Its presence is what sets aria-invalid. */
  error?: string;
  /** Helper text, shown only when there is no error. */
  hint?: ReactNode;
  icon?: FieldIcon;
  className?: string;
  /** Classes for the wrapping div, which owns the label, hint and error. */
  containerClassName?: string;
  id?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "className" | "id">;

function Input({
  label,
  error,
  hint,
  icon: Icon,
  className = "",
  containerClassName = "",
  id,
  ...props
}: InputProps) {
  // Falling back to `name` means a labelled field without an explicit id still
  // wires up, which is what keeps `getByLabel` working across the whole app.
  const inputId = id ?? props.name;

  return (
    <div className={`space-y-2 ${containerClassName}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          {label}
        </label>
      )}

      <div className="relative">
        {Icon && (
          <Icon
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
        )}

        <input
          id={inputId}
          aria-invalid={error ? "true" : undefined}
          className={[
            "w-full rounded-lg border bg-white px-4 py-3 text-sm text-slate-900 outline-none transition",
            "placeholder:text-slate-400",
            "focus:border-blue-500",
            "dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100",
            Icon ? "pl-10" : "",
            error
              ? "border-red-400 dark:border-red-900"
              : "border-slate-200 dark:border-slate-800",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
          {...props}
        />
      </div>

      {/* An error replaces the hint: the user needs the problem, not the advice. */}
      {error ? (
        <p className="text-xs text-red-500">{error}</p>
      ) : (
        hint && <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>
      )}
    </div>
  );
}

export default Input;
