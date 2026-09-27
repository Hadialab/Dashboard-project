// The default raised surface. Every card in the app should be this component
// rather than a hand-written div with its own radius and shadow.
function Card({ as: Tag = "div", className = "", children, ...props }) {
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
export function CardBody({ className = "", children, ...props }) {
  return (
    <div className={`p-4 ${className}`} {...props}>
      {children}
    </div>
  );
}

export default Card;
