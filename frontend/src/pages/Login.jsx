import { useEffect, useState } from "react";
import { Lock, Mail } from "lucide-react";
import * as yup from "yup";
import useAuthStore from "../store/authStore";
import { useNavigate } from "react-router-dom";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);

  useEffect(() => {
    if (isLoggedIn) {
      navigate("/dashboard", { replace: true });
    }
  }, [isLoggedIn, navigate]);

  const loginSchema = yup.object({
    email: yup
      .string()
      .email("Enter a valid email address")
      .required("Email is required"),
    password: yup
      .string()
      .min(6, "Password must be at least 6 characters")
      .required("Password is required"),
  });

  async function validate() {
    try {
      await loginSchema.validate({ email, password });
      setError("");
      return true;
    } catch (validationError) {
      setError(validationError.message);
      return false;
    }
  }

  async function handleLogin(event) {
    event.preventDefault();

    if (!(await validate())) {
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      // Credentials are checked by the API, which is also what guards the CRM
      // data. The token it returns is what authorises later requests.
      await login({ email, password });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.error ?? "Unable to sign in. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10 dark:bg-slate-950 sm:px-6">
      <div className="mx-auto w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-8 shadow-2xl shadow-slate-200/40 transition dark:border-slate-800 dark:bg-slate-950 dark:shadow-none">
        <div className="mb-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.32em] text-slate-500 dark:text-slate-400">
            Sign in
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Welcome back
          </h1>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            Log in to access your admin dashboard and view insights.
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleLogin} noValidate>
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Email
            </label>
            <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 transition focus-within:border-blue-500 dark:border-slate-800 dark:bg-slate-900">
              <Mail size={18} className="text-slate-400" />
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Password
            </label>
            <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 transition focus-within:border-blue-500 dark:border-slate-800 dark:bg-slate-900">
              <Lock size={18} className="text-slate-400" />
              <input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100"
                placeholder="Enter your password"
              />
            </div>
          </div>

          {error && <p className="text-sm text-rose-600">{error}</p>}

          <button
            type="submit"
            className="inline-flex w-full items-center justify-center rounded-3xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          Don't have an account?{" "}
          <button
            type="button"
            onClick={() => navigate("/register")}
            className="font-semibold text-blue-600 transition hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Create an account
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;
