// The field shape used by every form in the app: rounded-lg, px-4 py-3, a label
// above and an error message below. Icon is an optional leading lucide icon.
function Input({
  label,
  error,
  hint,
  icon: Icon,
  className = "",
  containerClassName = "",
  id,
  ...props
}) {
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
