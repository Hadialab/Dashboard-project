import type { ComponentType, ReactNode } from "react";

/**
 * Shared button. Interactive elements are always rounded-lg with px-4 py-3,
 * which is the token pair from the design system.
 *
 * `icon` renders a leading lucide icon. `fullWidth` is for form submits.
 */

/**
 * The icon shape this component actually uses. Narrower than lucide's own
 * component type on purpose: a prop typed as the whole icon type accepts an icon
 * with a dozen props, none of which this component passes, which hides a mistake
 * rather than catching one.
 */
export type ButtonIcon = ComponentType<{ size?: number; className?: string }>;

/** Derived from the record below rather than written out twice. */
const VARIANTS = {
  primary:
    "bg-blue-600 text-white hover:bg-blue-700 focus-visible:outline-blue-600",
  secondary:
    "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900",
  danger:
    "bg-red-600 text-white hover:bg-red-700 focus-visible:outline-red-600",
  ghost:
    "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
} as const;

const SIZES = {
  sm: "px-3 py-2 text-xs",
  md: "px-4 py-3 text-sm",
} as const;

export type ButtonVariant = keyof typeof VARIANTS;
export type ButtonSize = keyof typeof SIZES;

type ButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ButtonIcon;
  fullWidth?: boolean;
  className?: string;
  children?: ReactNode;
  /** Overridden to allow "submit" on a form submit. */
  type?: "button" | "submit" | "reset";
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type" | "className" | "children">;

function Button({
  variant = "primary",
  size = "md",
  icon: Icon,
  fullWidth = false,
  className = "",
  children,
  type = "button",
  ...props
}: ButtonProps) {
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
