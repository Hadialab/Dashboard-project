import { X } from "lucide-react";
import { useState } from "react";

function AddCustomerModal({ open, onClose ,onAddCustomer}) {
   const [ formData,setFormData]= useState({
     name: "",
  company: "",
  email: "",
  phone: "",
  status: "Active",
   });

 const handleChange = (e) => {
  const { name, value } = e.target;

  setFormData((prev) => ({
    ...prev,
    [name]: value,
  }));
};
const handleSubmit = () => {
  onAddCustomer(formData);

  setFormData({
    name: "",
    company: "",
    email: "",
    phone: "",
    status: "Active",
  });

  onClose();
};







  
  
    if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-slate-700">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              Add Customer
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Create a new customer record.
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Full Name
            </label>
            <input
              type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                  placeholder="Full Name"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Company
            </label>
            <input
               type="text"
             name="company"
  value={formData.company}
  onChange={handleChange}
  placeholder="Company"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Email
            </label>
            <input
              type="email"
              name="email"
               value={formData.email}
  onChange={handleChange}
              placeholder="john@example.com"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Phone
            </label>
            <input
             type="text"
             name="phone"
  value={formData.phone}
  onChange={handleChange}
              placeholder="+961..."
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Status
            </label>

            <select 
             name="status"
  value={formData.status}
  onChange={handleChange}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
              <option>Active</option>
<option>Pending</option>
<option>Inactive</option>
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-slate-200 p-5 dark:border-slate-700">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-300 px-4 py-2 text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancel
          </button>

          <button onClick={handleSubmit} className="rounded-xl bg-blue-600 px-5 py-2 text-white transition hover:bg-blue-700">
            Add Customer
          </button>
        </div>
      </div>
    </div>
  );
}

export default AddCustomerModal;