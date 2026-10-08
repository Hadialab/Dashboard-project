import { AlertTriangle } from "lucide-react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import type { Customer } from "../../types";

/**
 * The confirming step before a customer is destroyed.
 *
 * `customer` is null while the modal is closed rather than the modal being
 * unmounted, which is why the name can be required in the body: the guard below
 * has already returned for the closed case.
 *
 * `onConfirm` takes no arguments — the page already holds the record in its own
 * state, so passing it back here would be a second source of truth.
 */
type DeleteCustomerModalProps = {
  open: boolean;
  customer?: Customer | null;
  onClose: () => void;
  onConfirm: () => void;
};

function DeleteCustomerModal({
  open,
  customer,
  onClose,
  onConfirm,
}: DeleteCustomerModalProps) {
  if (!open || !customer) return null;

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
          <span className="min-w-0">Delete Customer</span>
        </span>
      }
      description="This action cannot be undone."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} className="sm:w-auto">
            Cancel
          </Button>

          <Button variant="danger" onClick={onConfirm} className="sm:w-auto">
            Delete Customer
          </Button>
        </>
      }
    >
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Are you sure you want to delete{" "}
        <span className="font-semibold text-slate-900 dark:text-white">
          {customer.name}
        </span>
        ?
      </p>

      <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
        Deleting this customer will permanently remove their information from the
        customer list.
      </p>
    </Modal>
  );
}

export default DeleteCustomerModal;
