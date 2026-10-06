import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, Send } from "lucide-react";

import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import { requestPasswordReset } from "../services/authService";
import { getApiErrorMessage } from "../utils/apiError";

/**
 * Asks for a reset link.
 *
 * One thing is deliberately absent: any statement about whether the address is
 * registered. The API answers identically either way, and this page passes that
 * answer straight through rather than trying to be helpful about it. Showing
 * "no account with that address" would turn this form into a way to find out who
 * has an account here, and the sentence the server sends says exactly as much as
 * it should.
 */
function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");

    // Checked here so an obviously malformed address does not become a round trip.
    // This is a shape check only — it says nothing about whether the address
    // exists, and must not grow into one.
    if (!email.trim()) {
      setError("Enter your email address.");
      return;
    }

    setIsSubmitting(true);

    try {
      await requestPasswordReset(email.trim());
      setSent(true);
    } catch (cause) {
      setError(getApiErrorMessage(cause, "Could not send the reset link. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10 dark:bg-slate-950 sm:px-6">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8 dark:border-slate-800 dark:bg-slate-950">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
            Password reset
          </p>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            Forgotten your password?
          </h1>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            Enter the address you signed up with and we will email you a link to choose a new
            password.
          </p>
        </div>

        {sent ? (
          // Shown instead of the form, not above it. The point is that there is
          // nothing left to do here, and a still-editable field underneath makes
          // people submit twice.
          <div
            role="status"
            className="rounded-xl border border-blue-200 bg-blue-50/60 p-5 text-center dark:border-blue-900/60 dark:bg-blue-950/20"
          >
            <Mail
              size={26}
              className="mx-auto text-blue-600 dark:text-blue-400"
              aria-hidden="true"
            />
            <p className="mt-3 text-sm font-medium text-slate-900 dark:text-white">
              Check your email
            </p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              If an account exists with that address, a reset link is on its way. The link works
              once and expires in 15 minutes.
            </p>
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              Nothing arrived? Check your spam folder, then try again — or ask an administrator
              to reset it for you.
            </p>
          </div>
        ) : (
          <form className="space-y-5" onSubmit={handleSubmit} noValidate>
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

            {error && (
              <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">
                {error}
              </p>
            )}

            <Button type="submit" fullWidth disabled={isSubmitting} icon={Send}>
              {isSubmitting ? "Sending..." : "Send the reset link"}
            </Button>
          </form>
        )}

        <div className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          Remembered it?{" "}
          <Link
            to="/login"
            className="inline-flex min-h-11 items-center font-semibold text-blue-600 transition hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;