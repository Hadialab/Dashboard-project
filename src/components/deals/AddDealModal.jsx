import { useEffect, useState } from "react";
import * as yup from "yup";

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

function AddDealModal({
  open,
  onClose,
  onAddDeal,
  onUpdateDeal,
  deal,
}) {
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

  if (!open) return null;

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

  const handleSubmit = async (e) => {
    e.preventDefault();

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
        {/* Header */}
        <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {deal ? "Edit Deal" : "Add New Deal"}
          </h2>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {deal
              ? "Update the deal information."
              : "Fill in the details below to create a new deal."}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Deal Title
              </label>

              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Enter deal title"
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />

              {errors.title && (
                <p className="mt-1 text-xs text-red-500">{errors.title}</p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Customer
              </label>

              <input
                type="text"
                name="customer"
                value={formData.customer}
                onChange={handleChange}
                placeholder="Enter customer"
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />

              {errors.customer && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.customer}
                </p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Deal Value ($)
              </label>

              <input
                type="number"
                name="value"
                value={formData.value}
                onChange={handleChange}
                placeholder="10000"
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />

              {errors.value && (
                <p className="mt-1 text-xs text-red-500">{errors.value}</p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Stage
              </label>

              <select
                name="stage"
                value={formData.stage}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option>Lead</option>
                <option>Qualified</option>
                <option>Proposal</option>
                <option>Negotiation</option>
                <option>Won</option>
                <option>Lost</option>
              </select>

              {errors.stage && (
                <p className="mt-1 text-xs text-red-500">{errors.stage}</p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Deal Owner
              </label>

              <input
                type="text"
                name="owner"
                value={formData.owner}
                onChange={handleChange}
                placeholder="Enter owner"
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />

              {errors.owner && (
                <p className="mt-1 text-xs text-red-500">{errors.owner}</p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Expected Close
              </label>

              <input
                type="date"
                name="expectedClose"
                value={formData.expectedClose}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />

              {errors.expectedClose && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.expectedClose}
                </p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 border-t border-slate-200 pt-5 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-5 py-2.5 font-medium transition hover:bg-slate-100 dark:border-slate-700 dark:text-white dark:hover:bg-slate-800"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-5 py-2.5 font-medium text-white transition hover:bg-blue-700"
            >
              {deal ? "Save Changes" : "Add Deal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddDealModal;