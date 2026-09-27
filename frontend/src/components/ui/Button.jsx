// Shared button. Interactive elements are always rounded-lg with px-4 py-3,
// which is the token pair from the design system.
//
// `icon` renders a leading lucide icon. `fullWidth` is for form submits.
const VARIANTS = {
  primary:
    "bg-blue-600 text-white hover:bg-blue-700 focus-visible:outline-blue-600",
  secondary:
    "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900",
  danger:
    "bg-red-600 text-white hover:bg-red-700 focus-visible:outline-red-600",
  ghost:
    "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
};

const SIZES = {
  sm: "px-3 py-2 text-xs",
  md: "px-4 py-3 text-sm",
};

function Button({
  variant = "primary",
  size = "md",
  icon: Icon,
  fullWidth = false,
  className = "",
  children,
  type = "button",
  ...props
}) {
  return (
    <button
      type={type}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition",
        "disabled:cursor-not-allowed disabled:opacity-60",
        VARIANTS[variant] ?? VARIANTS.primary,
        SIZES[size] ?? SIZES.md,
        fullWidth ? "w-full" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {Icon && <Icon size={16} className="shrink-0" aria-hidden="true" />}
      {children}
    </button>
  );
}

export default Button;
