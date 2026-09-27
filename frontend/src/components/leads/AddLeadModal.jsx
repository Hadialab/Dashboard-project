import { useEffect, useState } from "react";
import { leadSchema } from "../../validation/leadSchema";
import Modal from "../ui/Modal";
import Input from "../ui/Input";
import Select from "../ui/Select";
import Button from "../ui/Button";
import OwnerSelect from "../ui/OwnerSelect";

// No rep is pre-selected. A real account is chosen from the company team, or the
// record is left for the person creating it.
const initialFormData = {
  name: "",
  company: "",
  email: "",
  phone: "",
  status: "New",
  source: "Website",
  // Which team member owns it. The display name is derived server-side.
  ownerId: "",
};

function AddLeadModal({ open, onClose, onAddLead, onUpdateLead, lead }) {
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});

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

  const handleChange = (e) => {
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
      const validationErrors = {};

      err.inner.forEach((error) => {
        validationErrors[error.path] = error.message;
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
          <option>New</option>
          <option>Contacted</option>
          <option>Qualified</option>
          <option>Proposal</option>
          <option>Lost</option>
        </Select>

        <Select
          label="Source"
          name="source"
          value={formData.source}
          onChange={handleChange}
        >
          <option>Website</option>
          <option>Referral</option>
          <option>LinkedIn</option>
          <option>Facebook</option>
          <option>Google Ads</option>
          <option>Cold Call</option>
        </Select>

        <OwnerSelect
          label="Assigned Representative"
          value={formData.ownerId}
          onChange={handleChange}
          containerClassName="md:col-span-2"
        />
      </div>
    </Modal>
  );
}

export default AddLeadModal;
