import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight } from "lucide-react";

import Modal from "../ui/Modal";
import Input from "../ui/Input";
import Select from "../ui/Select";
import Button from "../ui/Button";
import { customerSchema } from "../../validation/customerSchema";
import { getApiErrorMessage } from "../../utils/apiError";
import { CUSTOMER_STATUSES } from "../../utils/crmConstants";

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
function ConvertLeadModal({ open, onClose, onConfirm, lead, existingEmails = [] }) {
  const [formData, setFormData] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    status: "Active",
  });
  const [errors, setErrors] = useState({});
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

  const handleChange = (event) => {
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

  async function handleSubmit(event) {
    event?.preventDefault();

    try {
      await customerSchema.validate(formData, { abortEarly: false });
    } catch (err) {
      const validationErrors = {};
      err.inner.forEach((error) => {
        validationErrors[error.path] = error.message;
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
      const detail = err.response?.data?.details;
      setSubmitError(
        detail
          ? Object.values(detail)[0]
          : getApiErrorMessage(err, "Could not convert this lead."),
      );
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
