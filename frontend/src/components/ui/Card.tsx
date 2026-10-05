import type { ElementType, HTMLAttributes, ReactNode } from "react";

/**
 * The default raised surface. Every card in the app should be this component
 * rather than a hand-written div with its own radius and shadow.
 */

/**
 * `as` is the reason this needs a generic: a Card rendered `as="section"` must
 * accept section attributes and must still accept div ones at the call site.
 * `ElementType` alone would type it as the union of everything, which accepts
 * invalid combinations — `href` without `as="a"`, say. The default parameter
 * pins that down without asking every caller for a type argument.
 */
type CardProps<T extends ElementType = "div"> = {
  as?: T;
  className?: string;
  children?: ReactNode;
} & HTMLAttributes<HTMLElement>;

function Card({ as: Tag = "div", className = "", children, ...props }: CardProps) {
  return (
    <Tag
      className={`rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950 ${className}`}
      {...props}
    >
      {children}
    </Tag>
  );
}

// Card with the standard p-4 inner padding. Use for content blocks; use bare
// Card for containers that manage their own padding (tables, forms).
export function CardBody({ className = "", children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`p-4 ${className}`} {...props}>
      {children}
    </div>
  );
}

export default Card;
