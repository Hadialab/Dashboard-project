function DeleteLeadModal({
  open,
  onClose,
  onConfirm,
  lead,
}) {
  if (!open || !lead) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
        {/* Header */}
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            Delete Lead
          </h2>

          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-slate-900 dark:text-white">
              {lead.name}
            </span>
            ? This action cannot be undone.
          </p>
        </div>

        {/* Footer */}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancel
          </button>

          <button
            onClick={() => {
              onConfirm(lead.id);
              onClose();
            }}
            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
          >
            Delete Lead
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteLeadModal;