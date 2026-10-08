import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import * as yup from "yup";
import Modal from "../ui/Modal";
import Input from "../ui/Input";
import Select from "../ui/Select";
import Button from "../ui/Button";
import OwnerSelect from "../ui/OwnerSelect";
import type { Deal } from "../../types";

/**
 * One form for both create and edit.
 *
 * `deal` is what distinguishes them: present means the record already exists and
 * is being updated, absent means it is being created — `onAddDeal` and
 * `onUpdateDeal` are separate so the page keeps ownership of what each call
 * means.
 *
 * Reused from the customer drawer, which passes `prefill` instead of `deal` to
 * start a deal for a known customer.
 */

/** The form's own shape: every field is the string an input holds. */
type DealFormData = {
  title: string;
  customer: string;
  /** A string until submit, where it is coerced with Number(). */
  value: string;
  stage: string;
  /** Empty string for unassigned; the API rejects a null here. */
  ownerId: string;
  expectedClose: string;
};

/** What the form submits: `value` is a number by the time it leaves. */
type DealFormPayload = {
  title: string;
  customer: string;
  value: number;
  stage: string;
  ownerId: string;
  expectedClose: string;
};

type AddDealModalProps = {
  open: boolean;
  onClose: () => void;
  /** New record. Receives only the form fields, not an id. */
  onAddDeal: (deal: DealFormPayload) => void;
  /**
   * Existing record. Receives the whole deal with the form fields applied.
   * Optional because a caller that only ever creates — the customer drawer —
   * has no update path and never passes one.
   */
  onUpdateDeal?: (deal: Deal) => void;
  /** The record being edited. Null or absent means create. */
  deal?: Deal | null;
  /**
   * Seeds a blank form, for starting a deal from somewhere else. Only the fields
   * present are applied; the rest keep their empty defaults.
   */
  prefill?: Partial<DealFormData> | null;
};

const dealSchema = yup.object({
  title: yup.string().required("Deal title is required"),
  customer: yup.string().required("Customer is required"),
  value: yup
    .number()
    .typeError("Deal value must be a number")
    .positive("Deal value must be greater than 0")
    .required("Deal value is required"),
  stage: yup.string().required("Stage is required"),
  expectedClose: yup.string().required("Expected close date is required"),
  // `owner` is not validated: the server derives it from `ownerId`, so the
  // browser's value is ignored. See the comment in validation/resources.js.
});

const initialFormData: DealFormData = {
  title: "",
  customer: "",
  value: "",
  stage: "Lead",
  ownerId: "",
  expectedClose: "",
};

function AddDealModal({
  open,
  onClose,
  onAddDeal,
  onUpdateDeal,
  deal,
  prefill,
}: AddDealModalProps) {
  const [formData, setFormData] = useState<DealFormData>(initialFormData);
  // Keyed by field name, so a new field needs no change here.
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (deal) {
      // The record is copied wholesale into form state. `value` comes back from
      // pg as a string on a NUMERIC column, and the input coerces it either way,
      // so the two shapes are the same thing to this form.
      setFormData(deal as unknown as DealFormData);
    } else {
      // `prefill` seeds a blank form, for starting a deal from somewhere else —
      // a customer drawer, say. It is read when the modal opens and is
      // deliberately not a dependency, because re-running on every parent
      // render would throw away anything being typed.
      setFormData({ ...initialFormData, ...(prefill ?? {}) });
    }

    setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deal, open]);

  // The one handler behind every field: Input, Select and OwnerSelect all hand
  // back the same synthetic change event, so a union of the two element types is
  // the honest type rather than a cast to whichever was written last.
  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const handleSubmit = async () => {
    try {
      await dealSchema.validate(formData, {
        abortEarly: false,
      });

      // Built explicitly rather than from the yup result: `ownerId` is not in
      // the schema, and dropping it would silently reset the owner on every save.
      const payload = {
        title: formData.title,
        customer: formData.customer,
        value: Number(formData.value),
        stage: formData.stage,
        ownerId: formData.ownerId,
        expectedClose: formData.expectedClose,
      };

      if (deal) {
        onUpdateDeal?.({ ...deal, ...payload });
      } else {
        onAddDeal(payload);
      }

      onClose();
    } catch (err) {
      const validationErrors: Record<string, string> = {};

      // Yup's ValidationError, narrowed to the two fields read here. `inner`
      // carries one entry per failed field, which is why `validate` above is
      // asked for abortEarly: false. Same shape as AddCustomerModal.
      (err.inner as { path?: string; message: string }[]).forEach((error) => {
        // Skipped when `path` is absent. Yup uses that for an error on the object
        // as a whole rather than on a field, and there is no field to attach it
        // to: these errors are keyed by field name and rendered against an input,
        // so writing it under the key "undefined" would produce a message no user
        // can see and no input can clear.
        if (error.path) {
          validationErrors[error.path] = error.message;
        }
      });

      setErrors(validationErrors);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={deal ? "Edit Deal" : "Add New Deal"}
      description={
        deal
          ? "Update the deal information."
          : "Fill in the details below to create a new deal."
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} className="sm:w-auto">
            Cancel
          </Button>

          <Button onClick={handleSubmit} className="sm:w-auto">
            {deal ? "Save Changes" : "Add Deal"}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Input
          label="Deal Title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          placeholder="Enter deal title"
          error={errors.title}
        />

        <Input
          label="Customer"
          name="customer"
          value={formData.customer}
          onChange={handleChange}
          placeholder="Enter customer"
          error={errors.customer}
        />

        <Input
          label="Deal Value ($)"
          type="number"
          name="value"
          value={formData.value}
          onChange={handleChange}
          placeholder="10000"
          error={errors.value}
        />

        <Select
          label="Stage"
          name="stage"
          value={formData.stage}
          onChange={handleChange}
          error={errors.stage}
        >
          <option>Lead</option>
          <option>Qualified</option>
          <option>Proposal</option>
          <option>Negotiation</option>
          <option>Won</option>
          <option>Lost</option>
        </Select>

        <OwnerSelect
          label="Deal Owner"
          value={formData.ownerId}
          onChange={handleChange}
          error={errors.ownerId}
        />

        <Input
          label="Expected Close"
          type="date"
          name="expectedClose"
          value={formData.expectedClose}
          onChange={handleChange}
          error={errors.expectedClose}
        />
      </div>
    </Modal>
  );
}

export default AddDealModal;
