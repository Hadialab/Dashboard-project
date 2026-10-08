import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import { AlertTriangle } from "lucide-react";
import { leadSchema } from "../../validation/leadSchema";
import Modal from "../ui/Modal";
import Input from "../ui/Input";
import Select from "../ui/Select";
import Button from "../ui/Button";
import { LEAD_STATUSES, LEAD_SOURCES } from "../../utils/crmConstants";
import OwnerSelect from "../ui/OwnerSelect";
import type { Lead } from "../../types";

/**
 * The form's own shape: every field is the string an input holds.
 *
 * `leadSchema` exports a `LeadInput` for the six fields it validates, and the
 * payload is not typed with it. `ownerId` is a seventh field the schema has
 * never heard of — the server derives the display name from the owner rather
 * than accepting one — so a `LeadInput` payload would silently drop the
 * assignment on every save. AddCustomerModal can reuse its `CustomerInput`
 * because its form has no such field.
 */
type LeadFormData = {
  name: string;
  company: string;
  email: string;
  phone: string;
  status: string;
  source: string;
  /** Empty string for unassigned; the API rejects a null here. */
  ownerId: string;
};

type AddLeadModalProps = {
  open: boolean;
  onClose: () => void;
  /** New record. Receives only the form fields, not an id. */
  onAddLead: (lead: LeadFormData) => void;
  /** Existing record. Receives the whole lead with the form fields applied. */
  onUpdateLead: (lead: Lead) => void;
  /** The record being edited. Null or absent means create. */
  lead?: Lead | null;
  /**
   * Every email already in use, for the duplicate check. Leads and customers
   * together, because a lead whose email is already a customer is the duplicate
   * worth catching.
   */
  existingEmails?: string[];
};

// No rep is pre-selected. A real account is chosen from the company team, or the
// record is left for the person creating it.
const initialFormData: LeadFormData = {
  name: "",
  company: "",
  email: "",
  phone: "",
  status: "New",
  source: "Website",
  // Which team member owns it. The display name is derived server-side.
  ownerId: "",
};

function AddLeadModal({
  open,
  onClose,
  onAddLead,
  onUpdateLead,
  lead,
  existingEmails = [],
}: AddLeadModalProps) {
  const [formData, setFormData] = useState<LeadFormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // A warning, not a block — see the note in AddCustomerModal.
  const duplicateMatch = useMemo(() => {
    const email = formData.email.trim().toLowerCase();
    if (!email) return null;

    return existingEmails.find((value) => String(value).toLowerCase() === email);
  }, [formData.email, existingEmails]);

  useEffect(() => {
    if (lead) {
      setFormData({
        name: lead.name,
        company: lead.company,
        email: lead.email,
        phone: lead.phone,
        status: lead.status,
        source: lead.source,
        ownerId: lead.ownerId ?? "",
      });
    } else {
      setFormData(initialFormData);
    }

    setErrors({});
  }, [lead, open]);

  // The one handler behind every field: Input, Select and OwnerSelect all hand
  // back the same synthetic change event, so a union of the two element types is
  // the honest type rather than a cast to whichever was written last.
  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: "",
    }));
  };

  const handleSubmit = async () => {
    try {
      await leadSchema.validate(formData, {
        abortEarly: false,
      });

      setErrors({});

      // Built explicitly rather than from the form state, so nothing the user
      // cannot see or change is sent.
      const payload = {
        name: formData.name,
        company: formData.company,
        email: formData.email,
        phone: formData.phone,
        status: formData.status,
        source: formData.source,
        ownerId: formData.ownerId,
      };

      if (lead) {
        onUpdateLead({ ...lead, ...payload });
      } else {
        onAddLead(payload);
      }

      setFormData(initialFormData);
      onClose();
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
    }
  };

  const isEditing = !!lead;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit Lead" : "Add Lead"}
      description={
        isEditing ? "Update the lead information." : "Create a new lead."
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} className="sm:w-auto">
            Cancel
          </Button>

          <Button onClick={handleSubmit} className="sm:w-auto">
            {isEditing ? "Save Changes" : "Add Lead"}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
        >
          {LEAD_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </Select>

        <Select
          label="Source"
          name="source"
          value={formData.source}
          onChange={handleChange}
        >
          {LEAD_SOURCES.map((source) => (
            <option key={source} value={source}>
              {source}
            </option>
          ))}
        </Select>

        <OwnerSelect
          label="Assigned Representative"
          value={formData.ownerId}
          onChange={handleChange}
          containerClassName="md:col-span-2"
        />
      </div>

      {/* Only on create: editing a lead will obviously match its own email. */}
      {duplicateMatch && !lead && (
        <p className="mt-4 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            Another lead or customer already uses this email address. Saving
            will create a second record for the same person.
          </span>
        </p>
      )}
    </Modal>
  );
}

export default AddLeadModal;
