import { useEffect, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { customerSchema } from "../../validation/customerSchema";
import Modal from "../ui/Modal";
import Input from "../ui/Input";
import Select from "../ui/Select";
import Button from "../ui/Button";
import { CUSTOMER_STATUSES } from "../../utils/crmConstants";

const initialFormData = {
  name: "",
  company: "",
  email: "",
  phone: "",
  status: "Active",
};

function AddCustomerModal({
  open,
  onClose,
  onAddCustomer,
  onUpdateCustomer,
  customer,
  existingEmails = [],
}) {
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name,
        company: customer.company,
        email: customer.email,
        phone: customer.phone,
        status: customer.status,
      });
    } else {
      setFormData(initialFormData);
    }

    setErrors({});
  }, [customer, open]);

  // A warning, not a block. The same person can legitimately hold two records,
  // and the API does not enforce email uniqueness, so refusing here would invent
  // a rule the rest of the app does not follow.
  const duplicateMatch = useMemo(() => {
    const email = formData.email.trim().toLowerCase();
    if (!email) return null;

    return existingEmails.find(
      (value) => String(value).toLowerCase() === email,
    );
  }, [formData.email, existingEmails]);

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
      await customerSchema.validate(formData, {
        abortEarly: false,
      });

      setErrors({});

      if (customer) {
        onUpdateCustomer({
          ...customer,
          ...formData,
        });
      } else {
        onAddCustomer(formData);
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

  const isEditing = !!customer;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit Customer" : "Add Customer"}
      description={
        isEditing
          ? "Update the customer's information."
          : "Create a new customer record."
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} className="sm:w-auto">
            Cancel
          </Button>

          <Button onClick={handleSubmit} className="sm:w-auto">
            {isEditing ? "Save Changes" : "Add Customer"}
          </Button>
        </>
      }
    >
      {/* Single column on mobile, two from md. */}
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
          error={errors.status}
          containerClassName="md:col-span-2"
        >
          {CUSTOMER_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </Select>
      </div>

      {/* Only on create: editing an existing customer will obviously match its
          own email. */}
      {duplicateMatch && !customer && (
        <p className="mt-4 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            Another customer already uses this email address. Saving will create
            a second record for the same person.
          </span>
        </p>
      )}
    </Modal>
  );
}

export default AddCustomerModal;
