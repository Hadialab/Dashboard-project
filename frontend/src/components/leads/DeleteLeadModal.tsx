import { AlertTriangle } from "lucide-react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";

function DeleteLeadModal({ open, onClose, onConfirm, lead }) {
  if (!open || !lead) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={
        <span className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <AlertTriangle size={22} className="text-red-600 dark:text-red-400" />
          </span>
          <span className="min-w-0">Delete Lead</span>
        </span>
      }
      description="This action cannot be undone."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} className="sm:w-auto">
            Cancel
          </Button>

          <Button
            variant="danger"
            onClick={() => {
              onConfirm(lead.id);
              onClose();
            }}
            className="sm:w-auto"
          >
            Delete Lead
          </Button>
        </>
      }
    >
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Are you sure you want to delete{" "}
        <span className="font-semibold text-slate-900 dark:text-white">
          {lead.name}
        </span>
        ?
      </p>

      <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
        Deleting this lead will permanently remove it from your pipeline.
      </p>
    </Modal>
  );
}

export default DeleteLeadModal;
