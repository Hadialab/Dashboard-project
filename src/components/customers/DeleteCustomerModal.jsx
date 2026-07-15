import { AlertTriangle } from "lucide-react";

function DeleteCustomerModal({
  open,
  customer,
  onClose,
  onConfirm,
}) {
  if (!open || !customer) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
        {/* Header */}
        <div className="border-b border-slate-200 p-6 dark:border-slate-700">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <AlertTriangle
                size={24}
                className="text-red-600 dark:text-red-400"
              />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Delete Customer
              </h2>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                This action cannot be undone.
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-slate-900 dark:text-white">
              {customer.name}
            </span>
            ?
          </p>

          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            Deleting this customer will permanently remove their information
            from the customer list.
          </p>
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 p-6 dark:border-slate-700 sm:flex-row sm:justify-end">
          <button
            onClick={onClose}
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 sm:w-auto"
          >
            Cancel
          </button>

          <button
            onClick={onConfirm}
            className="w-full rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 sm:w-auto"
          >
            Delete Customer
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteCustomerModal;