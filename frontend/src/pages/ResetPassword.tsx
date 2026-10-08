import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Lock } from "lucide-react";

import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import { resetPassword } from "../services/authService";
import { getApiErrorMessage } from "../utils/apiError";

/**
 * Sets a new password from an emailed link.
 *
 * Two behaviours worth stating, because both are deliberate and both look like
 * omissions:
 *
 *   - A missing or already-spent token shows the refusal and a way to ask for a new
 *     link, rather than a password form that cannot work. The token is only known
 *     to be bad once the server has said so, so the page asks on load rather than
 *     guessing from a missing query parameter.
 *
 *   - A successful reset does not sign the user in. The response deliberately
 *     carries no session token, so this page cannot grant one even by accident;
 *     the user signs in with the password they just chose.
 */

// Matches the server's own rule. Checking here means an obviously wrong link says
// so immediately rather than after a round trip.
const TOKEN_PATTERN = /^[a-f0-9]{64}$/;

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get("token") ?? "";
  // Set when the server refuses a token that looked well-formed — the only way to
  // learn that an expired or already-used link is dead.
  const [rejected, setRejected] = useState(false);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const looksValid = TOKEN_PATTERN.test(token);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password !== confirm) {
      setError("The two passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      await resetPassword({ token, password });
      // Straight to the login page with a note, rather than a success screen that
      // leaves the user guessing whether they are signed in.
      navigate("/login?reset=1", { replace: true });
    } catch (cause) {
      // A token the server will not accept is a dead link, not a typo. Showing a
      // generic failure here would have the user retype the same link.
      if (getApiErrorMessage(cause, "").startsWith("This reset link")) {
        setRejected(true);
      } else {
        setError(getApiErrorMessage(cause, "Could not set your new password."));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  // A token that is not the right shape is rejected immediately, without asking the
  // server: nothing could work, so there is no reason to show a form whose submit
  // button can only fail. `checked` is not part of this condition — waiting for the
  // first render to settle would briefly show a working-looking form to someone who
  // followed a broken link.
  const tokenRejected = rejected || !looksValid;

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10 dark:bg-slate-950 sm:px-6">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8 dark:border-slate-800 dark:bg-slate-950">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
            Password reset
          </p>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            Choose a new password
          </h1>
        </div>

        {tokenRejected ? (
          <div
            role="alert"
            className="rounded-xl border border-amber-200 bg-amber-50/60 p-5 text-center dark:border-amber-900/60 dark:bg-amber-950/20"
          >
            <AlertTriangle
              size={26}
              className="mx-auto text-amber-600 dark:text-amber-400"
              aria-hidden="true"
            />
            <p className="mt-3 text-sm font-medium text-slate-900 dark:text-white">
              This link is no longer valid
            </p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Reset links work once and expire after 15 minutes. If yours has already been used or
              has expired, ask for a new one.
            </p>
            <Link
              to="/forgot-password"
              className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Request a new link
            </Link>
          </div>
        ) : (
          <form className="space-y-5" onSubmit={handleSubmit} noValidate>
            <p className="flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-green-600" aria-hidden="true" />
              Pick something you have not used here before. You will sign in with it on the next
              screen.
            </p>

            <Input
              label="New password"
              id="password"
              name="password"
              type="password"
              icon={Lock}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              // Not "current-password": the browser should not offer a stored
              // credential here, because the password being replaced is unknown.
              autoComplete="new-password"
            />

            <Input
              label="Confirm new password"
              id="confirm"
              name="confirm"
              type="password"
              icon={Lock}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Type it again"
              autoComplete="new-password"
            />

            {error && (
              <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">
                {error}
              </p>
            )}

            <Button type="submit" fullWidth disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Set new password"}
            </Button>
          </form>
        )}

        <div className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
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

export default ResetPassword;
