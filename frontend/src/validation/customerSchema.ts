import * as Yup from "yup";

/**
 * The single-create form's schema, reused verbatim by the CSV import so both
 * paths reject the same things for the same reasons.
 *
 * Kept in step with `Customer` in src/types — `status` in particular is a union
 * of real values, but validated as a plain string because the form offers a
 * fixed list and the import snaps a free-text column back to the first real
 * value. The import is the only path where an arbitrary string can arrive.
 */
export const customerSchema = Yup.object({
  name: Yup.string().required("Name is required"),

  company: Yup.string().required("Company is required"),

  email: Yup.string()
    .email("Invalid email address")
    .required("Email is required"),

  phone: Yup.string()
    .matches(
      /^\+?[0-9\s\-()]{7,20}$/,
      "Enter a valid phone number",
    )
    .required("Phone number is required"),

  status: Yup.string().required("Status is required"),
});

/** What `validate` returns once the schema is satisfied. */
export type CustomerInput = Yup.InferType<typeof customerSchema>;

export default customerSchema;