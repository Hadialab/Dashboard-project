import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { leadSchema } from "../../validation/leadSchema";

const initialFormData = {
  name: "",
  company: "",
  email: "",
  phone: "",
  status: "New",
  source: "Website",
  assignedRep: "Sarah Wilson",
};

function AddLeadModal({
  open,
  onClose,
  onAddLead,
  onUpdateLead,
  lead,
}) {
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
        assignedRep: lead.assignedRep,
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

      if (lead) {
        onUpdateLead({
          ...lead,
          ...formData,
        });
      } else {
        onAddLead(formData);
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

  if (!open) return null;

  const isEditing = !!lead;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-3 sm:p-4">
      <div className="my-auto w-full max-w-2xl rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 p-4 sm:p-6 dark:border-slate-700">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white sm:text-xl">
              {isEditing ? "Edit Lead" : "Add Lead"}
            </h2>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
              {isEditing
                ? "Update the lead information."
                : "Create a new lead."}
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="grid grid-cols-1 gap-4 p-4 sm:p-6 md:grid-cols-2">

          <div>
            <label className="mb-2 block text-sm font-medium dark:text-slate-300">
              Full Name
            </label>

            <input
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Full Name"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />

            {errors.name && (
              <p className="mt-1 text-xs text-red-500">{errors.name}</p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium dark:text-slate-300">
              Company
            </label>

            <input
              name="company"
              value={formData.company}
              onChange={handleChange}
              placeholder="Company"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />

            {errors.company && (
              <p className="mt-1 text-xs text-red-500">{errors.company}</p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium dark:text-slate-300">
              Email
            </label>

            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="john@example.com"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />

            {errors.email && (
              <p className="mt-1 text-xs text-red-500">{errors.email}</p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium dark:text-slate-300">
              Phone
            </label>

            <input
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+961..."
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />

            {errors.phone && (
              <p className="mt-1 text-xs text-red-500">{errors.phone}</p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium dark:text-slate-300">
              Status
            </label>

            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option>New</option>
              <option>Contacted</option>
              <option>Qualified</option>
              <option>Proposal</option>
              <option>Lost</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium dark:text-slate-300">
              Source
            </label>

            <select
              name="source"
              value={formData.source}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option>Website</option>
              <option>Referral</option>
              <option>LinkedIn</option>
              <option>Facebook</option>
              <option>Google Ads</option>
              <option>Cold Call</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium dark:text-slate-300">
              Assigned Representative
            </label>

            <select
              name="assignedRep"
              value={formData.assignedRep}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option>Sarah Wilson</option>
              <option>David Brown</option>
              <option>James Carter</option>
              <option>Emma Taylor</option>
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-2 border-t border-slate-200 p-4 sm:flex-row sm:justify-end sm:p-6 dark:border-slate-700">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm dark:border-slate-700 dark:text-slate-300"
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            {isEditing ? "Save Changes" : "Add Lead"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AddLeadModal;