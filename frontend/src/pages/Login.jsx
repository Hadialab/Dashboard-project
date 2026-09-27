import { useEffect, useState } from "react";
import { Lock, Mail } from "lucide-react";
import * as yup from "yup";
import useAuthStore from "../store/authStore";
import { useNavigate } from "react-router-dom";
import { getApiErrorMessage } from "../utils/apiError";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";

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
      setError(getApiErrorMessage(err, "Unable to sign in. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10 dark:bg-slate-950 sm:px-6">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8 dark:border-slate-800 dark:bg-slate-950">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
            Sign in
          </p>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            Welcome back
          </h1>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            Log in to access your admin dashboard and view insights.
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleLogin} noValidate>
          <Input
            label="Email"
            id="email"
            name="email"
            type="email"
            icon={Mail}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />

          <Input
            label="Password"
            id="password"
            name="password"
            type="password"
            icon={Lock}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            autoComplete="current-password"
          />

          {error && <p className="text-sm text-rose-600">{error}</p>}

          <Button
            type="submit"
            fullWidth
            disabled={isSubmitting}
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          Don't have an account?{" "}
          <button
            type="button"
            onClick={() => navigate("/register")}
            className="min-h-11 font-semibold text-blue-600 transition hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Create an account
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;
