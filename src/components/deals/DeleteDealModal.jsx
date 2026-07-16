import { TriangleAlert } from "lucide-react";

function DeleteDealModal({
  open,
  onClose,
  onConfirm,
  deal,
}) {
  if (!open || !deal) return null;

  const handleDelete = () => {
    onConfirm(deal.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
        {/* Header */}
        <div className="flex flex-col items-center border-b border-slate-200 px-6 py-5 dark:border-slate-800">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
            <TriangleAlert
              size={24}
              className="text-red-600 dark:text-red-400"
            />
          </div>

          <h2 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">
            Delete Deal
          </h2>

          <p className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-slate-900 dark:text-white">
              {deal.title}
            </span>
            ? This action cannot be undone.
          </p>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-300 py-2.5 text-sm font-medium transition hover:bg-slate-100 dark:border-slate-700 dark:text-white dark:hover:bg-slate-800"
          >
            Cancel
          </button>

          <button
            onClick={handleDelete}
            className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-medium text-white transition hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteDealModal;