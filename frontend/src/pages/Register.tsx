import { useState } from "react";
import { Building2, Lock, Mail, User } from "lucide-react";
import * as yup from "yup";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../store/authStore";
import { getApiErrorMessage } from "../utils/apiError";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import type { ChangeEvent, FormEvent } from "react";

/** The five fields the form holds. All strings: this is what the inputs hold. */
type RegisterFormData = {
  name: string;
  organizationName: string;
  email: string;
  password: string;
  /** Never sent to the API — only compared against `password` client-side. */
  confirmPassword: string;
};

const registerSchema = yup.object({
  name: yup
    .string()
    .min(2, "Name must be at least 2 characters")
    .required("Name is required"),

  organizationName: yup
    .string()
    .min(2, "Company name must be at least 2 characters")
    .required("Company name is required"),

  email: yup
    .string()
    .email("Enter a valid email address")
    .required("Email is required"),

  password: yup
    .string()
    .min(6, "Password must be at least 6 characters")
    .required("Password is required"),

  confirmPassword: yup
    .string()
    .oneOf([yup.ref("password")], "Passwords must match")
    .required("Please confirm your password"),
});

function Register() {
  const navigate = useNavigate();
  const register = useAuthStore((state) => state.register);

  const [formData, setFormData] = useState<RegisterFormData>({
    name: "",
    organizationName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setIsSubmitting(true);
      setError("");

      await registerSchema.validate(formData);

      // The account is created by the API, which stores a hashed password and
      // returns a session token. No credentials are kept in the browser.
      //
      // Each signup creates its own company and the person signing up becomes
      // that company's admin, so they can then add their own team.
      await register({
        name: formData.name,
        organizationName: formData.organizationName,
        email: formData.email,
        password: formData.password,
      });

      navigate("/dashboard", { replace: true });
    } catch (err) {
      // Yup throws for client-side validation; anything else came from the API.
      // Only Yup's aggregate error carries `inner`; an Axios failure does not.
      const validation = err as { inner?: unknown[]; message?: string };

      if (validation.inner) {
        setError(validation.message ?? "");
      } else {
        setError(
          getApiErrorMessage(err, "Unable to create your account. Please try again.")
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10 dark:bg-slate-950 sm:px-6">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8 dark:border-slate-800 dark:bg-slate-950">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
            Create account
          </p>

          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            Set up your workspace
          </h1>

          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            You will be the admin of this workspace, and can add your own team
            afterwards. Your data stays separate from any other company.
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleRegister} noValidate>
          <Input
            label="Company name"
            id="organizationName"
            name="organizationName"
            type="text"
            icon={Building2}
            value={formData.organizationName}
            onChange={handleChange}
            placeholder="Acme Inc."
            autoComplete="organization"
          />

          <Input
            label="Full name"
            id="name"
            name="name"
            type="text"
            icon={User}
            value={formData.name}
            onChange={handleChange}
            placeholder="Your full name"
            autoComplete="name"
          />

          <Input
            label="Email"
            id="email"
            name="email"
            type="email"
            icon={Mail}
            value={formData.email}
            onChange={handleChange}
            placeholder="you@example.com"
            autoComplete="email"
          />

          <Input
            label="Password"
            id="password"
            name="password"
            type="password"
            icon={Lock}
            value={formData.password}
            onChange={handleChange}
            placeholder="Create a password"
            autoComplete="new-password"
          />

          <Input
            label="Confirm password"
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            icon={Lock}
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="Confirm your password"
            autoComplete="new-password"
          />

          {error && <p className="text-sm text-rose-600">{error}</p>}

          <Button type="submit" fullWidth disabled={isSubmitting}>
            {isSubmitting ? "Creating account..." : "Create account"}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          Already have an account?{" "}
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="min-h-11 font-semibold text-blue-600 transition hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Sign in
          </button>
        </div>
      </div>
    </div>
  );
}

export default Register;
