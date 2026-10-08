import { TriangleAlert } from "lucide-react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import type { Deal } from "../../types";

type DeleteDealModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (id: string) => void;
  /** The deal about to go. Null or absent while closed. */
  deal?: Deal | null;
};

function DeleteDealModal({ open, onClose, onConfirm, deal }: DeleteDealModalProps) {
  if (!open || !deal) return null;

  const handleDelete = () => {
    onConfirm(deal.id);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={
        <span className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <TriangleAlert size={22} className="text-red-600 dark:text-red-400" />
          </span>
          <span className="min-w-0">Delete Deal</span>
        </span>
      }
      description="This action cannot be undone."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} className="sm:w-auto">
            Cancel
          </Button>

          <Button variant="danger" onClick={handleDelete} className="sm:w-auto">
            Delete
          </Button>
        </>
      }
    >
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Are you sure you want to delete{" "}
        <span className="font-semibold text-slate-900 dark:text-white">
          {deal.title}
        </span>
        ?
      </p>
    </Modal>
  );
}

export default DeleteDealModal;
