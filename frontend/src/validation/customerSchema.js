import * as Yup from "yup";

export const customerSchema = Yup.object({
  name: Yup.string().required("Name is required"),

  company: Yup.string().required("Company is required"),

  email: Yup.string()
    .email("Invalid email address")
    .required("Email is required"),

  phone: Yup.string()
  .matches(
    /^\+?[0-9\s\-()]{7,20}$/,
    "Enter a valid phone number"
  )
  .required("Phone number is required"),

  status: Yup.string().required("Status is required"),
});