import { useEffect } from "react";
import { X } from "lucide-react";

// Side drawer. Slides in from the right on desktop; on mobile it takes the full
// width so detail content is readable rather than squeezed into a sliver.
function Drawer({ open, onClose, title, children, footer }) {
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

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/50 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
        onClick={(event) => event.stopPropagation()}
        // Full width on mobile, capped on sm and up.
        className="flex h-full w-full flex-col border-l border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-950 sm:max-w-md"
      >
        {title && (
          <div className="flex items-center justify-between gap-4 border-b border-slate-200 p-4 dark:border-slate-800">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {title}
            </h2>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close drawer"
              className="-m-1 shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <X size={18} />
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4">{children}</div>

        {footer && (
          <div className="border-t border-slate-200 p-4 dark:border-slate-800">
            {footer}
          </div>
        )}
      </aside>
    </div>
  );
}

export default Drawer;
