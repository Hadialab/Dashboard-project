import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent, MouseEvent } from "react";
import { AlertTriangle, ArrowRight } from "lucide-react";

import Modal from "../ui/Modal";
import Input from "../ui/Input";
import Select from "../ui/Select";
import Button from "../ui/Button";
import { customerSchema } from "../../validation/customerSchema";
import type { CustomerInput } from "../../validation/customerSchema";
import { getApiErrorMessage } from "../../utils/apiError";
import { CUSTOMER_STATUSES } from "../../utils/crmConstants";
import type { Lead } from "../../types";

/**
 * Confirms turning a lead into a customer.
 *
 * The lead's name, company, email and phone are carried over as a starting point
 * and stay editable — a lead's details are not always what belongs on a customer
 * record, and making the user re-key what is already on screen would be busywork.
 *
 * A warning appears when a customer already uses this email. It does not block
 * the save: the same person can legitimately hold two records, and the server
 * does not enforce uniqueness, so blocking here would be a rule the UI invented.
 */

/**
 * `onConfirm` always creates. There is no update path to make optional here —
 * unlike a modal shared with an edit form — because converting a lead always
 * yields a new customer, and the lead itself is only marked, never rewritten.
 *
 * It is awaited and its rejection is what `submitError` reports, so it returns a
 * promise rather than being fire-and-forget.
 */
type ConvertLeadModalProps = {
  open: boolean;
  onClose: () => void;
  /** Creates the customer. Rejecting leaves the modal open with the error shown. */
  onConfirm: (customer: CustomerInput) => Promise<unknown>;
  /** The lead being converted. Null or absent while closed. */
  lead?: Lead | null;
  /** Every customer email in use, for the duplicate warning. */
  existingEmails?: string[];
};

function ConvertLeadModal({
  open,
  onClose,
  onConfirm,
  lead,
  existingEmails = [],
}: ConvertLeadModalProps) {
  const [formData, setFormData] = useState<CustomerInput>({
    name: "",
    company: "",
    email: "",
    phone: "",
    status: "Active",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (!open || !lead) return;

    setFormData({
      name: lead.name ?? "",
      company: lead.company ?? "",
      email: lead.email ?? "",
      phone: lead.phone ?? "",
      status: "Active",
    });

    setErrors({});
    setSubmitError("");
  }, [open, lead]);

  // The one handler behind every field: both Input and Select hand back the
  // same synthetic change event, so a union of the two element types is the
  // honest type rather than a cast to whichever was written last.
  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;

    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  // Compared case-insensitively: email addresses are not case sensitive in
  // practice, and "Jad@x.com" should match "jad@x.com".
  const existingMatch = useMemo(() => {
    const email = formData.email.trim().toLowerCase();
    if (!email) return null;

    return existingEmails.find((row) => String(row).toLowerCase() === email) ?? null;
  }, [formData.email, existingEmails]);

  // Both the form's onSubmit and the footer's button, so the parameter is the
  // union of the two events and stays optional — which is what the `?.` here
  // has always been guarding.
  async function handleSubmit(
    event?: FormEvent<HTMLFormElement> | MouseEvent<HTMLButtonElement>,
  ) {
    event?.preventDefault();

    try {
      await customerSchema.validate(formData, { abortEarly: false });
    } catch (err) {
      const validationErrors: Record<string, string> = {};

      // Yup's ValidationError, narrowed to the two fields read here. `inner`
      // carries one entry per failed field, which is why `validate` above is
      // asked for abortEarly: false.
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
      return;
    }

    setErrors({});
    setSaving(true);
    setSubmitError("");

    try {
      await onConfirm(formData);
    } catch (err) {
      // Through the shared helper rather than picking the first value of
      // `details` here. This component had its own copy of that logic, which
      // meant a 409 sending { customerId: "c041" } rendered a bare "c041" to the
      // user instead of the server's reason. One place decides what a failure
      // looks like, so it cannot drift between components.
      setSubmitError(getApiErrorMessage(err, "Could not convert this lead."));
    } finally {
      setSaving(false);
    }
  };

  if (!open || !lead) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Convert lead to customer"
      description="This creates a new customer record. The lead is kept and marked as converted."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} className="sm:w-auto">
            Cancel
          </Button>

          <Button onClick={handleSubmit} disabled={saving} className="sm:w-auto">
            {saving ? "Converting..." : "Convert to customer"}
          </Button>
        </>
      }
    >
      {/* Shows exactly what will be copied, so nothing is carried over by
          surprise. */}
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-900">
        <span className="text-slate-500 dark:text-slate-400">Lead</span>
        <span className="font-medium text-slate-900 dark:text-white">
          {lead.name}
        </span>
        <ArrowRight size={14} className="text-slate-400" aria-hidden="true" />
        <span className="text-slate-500 dark:text-slate-400">Customer</span>
        <span className="font-medium text-slate-900 dark:text-white">
          {formData.name || "—"}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Input
          label="Full Name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Full Name"
          error={errors.name}
        />

        <Input
          label="Company"
          name="company"
          value={formData.company}
          onChange={handleChange}
          placeholder="Company"
          error={errors.company}
        />

        <Input
          label="Email"
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="john@example.com"
          error={errors.email}
        />

        <Input
          label="Phone"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          placeholder="+961..."
          error={errors.phone}
        />

        <Select
          label="Status"
          name="status"
          value={formData.status}
          onChange={handleChange}
          error={errors.status}
          containerClassName="md:col-span-2"
        >
          {CUSTOMER_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </Select>
      </form>

      {existingMatch && (
        <p className="mt-4 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            A customer already uses this email address. Converting anyway will
            create a second record for the same person.
          </span>
        </p>
      )}

      {submitError && <p className="mt-3 text-sm text-rose-600">{submitError}</p>}
    </Modal>
  );
}

export default ConvertLeadModal;
