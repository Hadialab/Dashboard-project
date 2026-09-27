import { useEffect } from "react";
import { X } from "lucide-react";

// Modal overlay. Full-screen on mobile, centred with a max width above sm, so
// a form is never a cramped fixed-width box on a phone.
//
// Behaviour is unchanged from the modals it replaces: the caller controls open
// state, this only handles escape-to-close, body scroll lock, and backdrop click.
function Modal({
  open,
  onClose,
  title,
  description,
  size = "md",
  children,
  footer,
}) {
  // Lock background scroll and close on Escape while open.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const widths = {
    sm: "sm:max-w-md",
    md: "sm:max-w-2xl",
    lg: "sm:max-w-4xl",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
        onClick={(event) => event.stopPropagation()}
        className={[
          "w-full rounded-t-2xl border border-slate-200 bg-white shadow-lg",
          "dark:border-slate-800 dark:bg-slate-950",
          // Rounded on all sides once it is a centred dialog rather than a sheet.
          "sm:rounded-2xl",
          widths[size] ?? widths.md,
        ].join(" ")}
      >
        {title && (
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-4 sm:p-6 dark:border-slate-800">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {title}
              </h2>

              {description && (
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {description}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="-m-1 shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <X size={18} />
            </button>
          </div>
        )}

        <div className="max-h-[70vh] overflow-y-auto p-4 sm:p-6">{children}</div>

        {footer && (
          <div className="flex flex-col-reverse gap-2 border-t border-slate-200 p-4 sm:flex-row sm:justify-end sm:p-6 dark:border-slate-800">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export default Modal;
