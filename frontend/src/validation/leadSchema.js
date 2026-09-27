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
});

// assignedRep is not validated here. The server derives it from the record's
// owner, so whatever the browser sends is ignored — requiring it would only
// produce a confusing "required" error on a field the user cannot meaningfully
// fill in.