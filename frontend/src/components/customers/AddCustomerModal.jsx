import { useEffect, useState } from "react";
import { customerSchema } from "../../validation/customerSchema";
import Modal from "../ui/Modal";
import Input from "../ui/Input";
import Select from "../ui/Select";
import Button from "../ui/Button";

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
          <option>Active</option>
          <option>Pending</option>
          <option>Inactive</option>
        </Select>
      </div>
    </Modal>
  );
}

export default AddCustomerModal;
