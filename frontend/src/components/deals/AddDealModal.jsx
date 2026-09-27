import { useEffect, useState } from "react";
import * as yup from "yup";
import Modal from "../ui/Modal";
import Input from "../ui/Input";
import Select from "../ui/Select";
import Button from "../ui/Button";

const dealSchema = yup.object({
  title: yup.string().required("Deal title is required"),
  customer: yup.string().required("Customer is required"),
  value: yup
    .number()
    .typeError("Deal value must be a number")
    .positive("Deal value must be greater than 0")
    .required("Deal value is required"),
  stage: yup.string().required("Stage is required"),
  owner: yup.string().required("Owner is required"),
  expectedClose: yup.string().required("Expected close date is required"),
});

const initialFormData = {
  title: "",
  customer: "",
  value: "",
  stage: "Lead",
  owner: "",
  expectedClose: "",
};

function AddDealModal({ open, onClose, onAddDeal, onUpdateDeal, deal }) {
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (deal) {
      setFormData(deal);
    } else {
      setFormData(initialFormData);
    }

    setErrors({});
  }, [deal, open]);

  const handleChange = (e) => {
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
      const validatedData = await dealSchema.validate(formData, {
        abortEarly: false,
      });

      if (deal) {
        onUpdateDeal({
          ...validatedData,
          id: deal.id,
        });
      } else {
        onAddDeal(validatedData);
      }

      onClose();
    } catch (err) {
      const validationErrors = {};

      err.inner.forEach((error) => {
        validationErrors[error.path] = error.message;
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

        <Input
          label="Deal Owner"
          name="owner"
          value={formData.owner}
          onChange={handleChange}
          placeholder="Enter owner"
          error={errors.owner}
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
