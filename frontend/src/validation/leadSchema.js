import * as yup from "yup";

export const leadSchema = yup.object({
  name: yup
    .string()
    .required("Name is required")
    .min(2, "Name must be at least 2 characters"),

  company: yup
    .string()
    .required("Company is required"),

  email: yup
    .string()
    .required("Email is required")
    .email("Invalid email address"),

  phone: yup
    .string()
    .required("Phone number is required")
    .matches(
      /^[+]?[0-9\s\-()]{7,20}$/,
      "Invalid phone number"
    ),

  status: yup
    .string()
    .required("Status is required"),

  source: yup
    .string()
    .required("Source is required"),

  assignedRep: yup
    .string()
    .required("Assigned representative is required"),
});