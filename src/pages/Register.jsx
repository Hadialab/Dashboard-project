import { useState } from "react";
import { Lock, Mail, User } from "lucide-react";
import * as yup from "yup";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../store/authStore";

const registerSchema = yup.object({
  name: yup
    .string()
    .min(2, "Name must be at least 2 characters")
    .required("Name is required"),

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
  const login = useAuthStore((state) => state.login);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleRegister = async (event) => {
    event.preventDefault();

    try {
      setIsSubmitting(true);
      setError("");

      await registerSchema.validate(formData);

      const existingUser = JSON.parse(
        localStorage.getItem("registeredUser")
      );

      if (
        existingUser &&
        existingUser.email.toLowerCase() === formData.email.toLowerCase()
      ) {
        setError("An account with this email already exists.");
        setIsSubmitting(false);
        return;
      }

      const user = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
      };

      localStorage.setItem("registeredUser", JSON.stringify(user));

      login({
        name: user.name,
        email: user.email,
      });

      navigate("/dashboard", { replace: true });
    } catch (validationError) {
      setError(validationError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10 dark:bg-slate-950 sm:px-6">
      <div className="mx-auto w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-8 shadow-2xl shadow-slate-200/40 transition dark:border-slate-800 dark:bg-slate-950 dark:shadow-none">
        <div className="mb-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.32em] text-slate-500 dark:text-slate-400">
            Create account
          </p>

          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Join your CRM
          </h1>

          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            Create your account to access the CRM dashboard.
          </p>
        </div>

        <form
          className="space-y-5"
          onSubmit={handleRegister}
          noValidate
        >
          <div className="space-y-2">
            <label
              htmlFor="name"
              className="text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Full name
            </label>

            <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 transition focus-within:border-blue-500 dark:border-slate-800 dark:bg-slate-900">
              <User size={18} className="text-slate-400" />

              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100"
                placeholder="Your full name"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="email"
              className="text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Email
            </label>

            <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 transition focus-within:border-blue-500 dark:border-slate-800 dark:bg-slate-900">
              <Mail size={18} className="text-slate-400" />

              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="password"
              className="text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Password
            </label>

            <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 transition focus-within:border-blue-500 dark:border-slate-800 dark:bg-slate-900">
              <Lock size={18} className="text-slate-400" />

              <input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100"
                placeholder="Create a password"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="confirmPassword"
              className="text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Confirm password
            </label>

            <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 transition focus-within:border-blue-500 dark:border-slate-800 dark:bg-slate-900">
              <Lock size={18} className="text-slate-400" />

              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100"
                placeholder="Confirm your password"
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-rose-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex w-full items-center justify-center rounded-3xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isSubmitting ? "Creating account..." : "Create account"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          Already have an account?{" "}
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="font-semibold text-blue-600 transition hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Sign in
          </button>
        </div>
      </div>
    </div>
  );
}

export default Register;