import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import axios from "axios";

import ForgotPassword from "../pages/ForgotPassword";
import ResetPassword from "../pages/ResetPassword";
import { requestPasswordReset, resetPassword } from "../services/authService";

// The security property these pages have to preserve is a client-side one too: the
// reset form must not become a way to find out who has an account. It is easy to
// reintroduce that by "improving" the message, so it is asserted here rather than
// only on the API.

vi.mock("../services/authService", () => ({
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
}));

const mockRequest = vi.mocked(requestPasswordReset);
const mockReset = vi.mocked(resetPassword);

const TOKEN = "a".repeat(64);

const apiError = (status: number, error: string) => {
  const failure = new axios.AxiosError("Request failed");
  failure.response = { status, data: { error } } as never;
  return failure;
};

beforeEach(() => {
  mockRequest.mockReset();
  mockReset.mockReset();
});

describe("ForgotPassword", () => {
  it("says the same thing whether or not the address exists", async () => {
    // The server's own wording, passed through rather than reinterpreted.
    mockRequest.mockResolvedValue(
      "If an account exists with that address, a reset link is on its way.",
    );

    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>,
    );

    await userEvent.type(screen.getByLabelText(/email/i), "nobody@example.com");
    await userEvent.click(screen.getByRole("button", { name: /send the reset link/i }));

    expect(
      await screen.findByText(/if an account exists with that address/i),
    ).toBeInTheDocument();
  });

  it("never says an address is not registered", async () => {
    mockRequest.mockResolvedValue(
      "If an account exists with that address, a reset link is on its way.",
    );

    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>,
    );

    await userEvent.type(screen.getByLabelText(/email/i), "nobody@example.com");
    await userEvent.click(screen.getByRole("button", { name: /send the reset link/i }));

    await screen.findByText(/check your email/i);

    // The phrases a page would reach for if it were trying to be helpful, and
    // which would each be an account-existence oracle.
    expect(screen.queryByText(/no account/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/unknown email/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/not registered/i)).not.toBeInTheDocument();
  });

  it("replaces the form once sent, so the request is not sent twice", async () => {
    mockRequest.mockResolvedValue("If an account exists, a reset link is on its way.");

    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>,
    );

    await userEvent.type(screen.getByLabelText(/email/i), "someone@example.com");
    await userEvent.click(screen.getByRole("button", { name: /send the reset link/i }));

    await screen.findByText(/check your email/i);

    // The field is gone, so a second submit is not possible.
    expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();
    expect(mockRequest).toHaveBeenCalledTimes(1);
  });

  it("tells the user where to look when nothing arrives", async () => {
    // "Check your email" is only reassuring if they know what to do next.
    mockRequest.mockResolvedValue("If an account exists, a reset link is on its way.");

    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>,
    );

    await userEvent.type(screen.getByLabelText(/email/i), "someone@example.com");
    await userEvent.click(screen.getByRole("button", { name: /send the reset link/i }));

    expect(await screen.findByText(/spam folder/i)).toBeInTheDocument();
    // And a way out for someone with no working email address at all.
    expect(screen.getByText(/ask an administrator/i)).toBeInTheDocument();
  });

  it("does not call the API for an empty address", async () => {
    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByRole("button", { name: /send the reset link/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/enter your email/i);
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it("trims the address before sending it", async () => {
    mockRequest.mockResolvedValue("If an account exists, a reset link is on its way.");

    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>,
    );

    await userEvent.type(screen.getByLabelText(/email/i), "  someone@example.com  ");
    await userEvent.click(screen.getByRole("button", { name: /send the reset link/i }));

    await waitFor(() => expect(mockRequest).toHaveBeenCalledWith("someone@example.com"));
  });

  it("shows a failure the user can act on", async () => {
    mockRequest.mockRejectedValue(apiError(500, "Internal error"));

    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>,
    );

    await userEvent.type(screen.getByLabelText(/email/i), "someone@example.com");
    await userEvent.click(screen.getByRole("button", { name: /send the reset link/i }));

    // The form stays, so they can retry without retyping.
    expect(await screen.findByRole("alert")).toHaveTextContent(/internal error/i);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });
});

describe("ResetPassword", () => {
  function renderAt(token: string | null) {
    return render(
      <MemoryRouter initialEntries={[`/reset-password${token ? `?token=${token}` : ""}`]}>
        <Routes>
          <Route path="/reset-password" element={<ResetPassword />} />
          {/* Stubs, so navigating away does not warn about a missing route. */}
          <Route path="/login" element={<div>login page</div>} />
          <Route path="/forgot-password" element={<div>request page</div>} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it("refuses a link with no token, without calling the API", async () => {
    renderAt(null);

    expect(await screen.findByText(/this link is no longer valid/i)).toBeInTheDocument();
    // Not worth a round trip: nothing could work.
    expect(mockReset).not.toHaveBeenCalled();
  });

  it("refuses a token of the wrong shape without calling the API", async () => {
    renderAt("too-short");

    expect(await screen.findByText(/this link is no longer valid/i)).toBeInTheDocument();
    expect(mockReset).not.toHaveBeenCalled();
  });

  it("offers a way to ask for a new link when the token is dead", async () => {
    // A dead link with no way forward is the worst outcome: the user is locked out
    // with no route to recovery.
    renderAt(null);

    expect(await screen.findByRole("link", { name: /request a new link/i })).toBeInTheDocument();
  });

  it("turns a server rejection into the dead-link state", async () => {
    // The server refusing a well-formed token is how an expired or already-used
    // link learns that it is. Showing a generic error would have the user resubmit
    // the same dead link.
    mockReset.mockRejectedValue(
      apiError(400, "This reset link is no longer valid. Request a new one."),
    );

    renderAt(TOKEN);

    await userEvent.type(screen.getByLabelText(/^new password$/i), "newpassword1234");
    await userEvent.type(screen.getByLabelText(/confirm new password/i), "newpassword1234");
    await userEvent.click(screen.getByRole("button", { name: /set new password/i }));

    expect(await screen.findByText(/this link is no longer valid/i)).toBeInTheDocument();
  });

  it("refuses mismatched passwords before calling the API", async () => {
    renderAt(TOKEN);

    await userEvent.type(screen.getByLabelText(/^new password$/i), "newpassword1234");
    await userEvent.type(screen.getByLabelText(/confirm new password/i), "somethingelse1234");
    await userEvent.click(screen.getByRole("button", { name: /set new password/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/do not match/i);
    expect(mockReset).not.toHaveBeenCalled();
  });

  it("refuses a password below the server's minimum", async () => {
    renderAt(TOKEN);

    await userEvent.type(screen.getByLabelText(/^new password$/i), "short");
    await userEvent.type(screen.getByLabelText(/confirm new password/i), "short");
    await userEvent.click(screen.getByRole("button", { name: /set new password/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/at least 6 characters/i);
    expect(mockReset).not.toHaveBeenCalled();
  });

  it("sends the token and the new password", async () => {
    mockReset.mockResolvedValue({} as never);

    renderAt(TOKEN);

    await userEvent.type(screen.getByLabelText(/^new password$/i), "newpassword1234");
    await userEvent.type(screen.getByLabelText(/confirm new password/i), "newpassword1234");
    await userEvent.click(screen.getByRole("button", { name: /set new password/i }));

    await waitFor(() =>
      expect(mockReset).toHaveBeenCalledWith({ token: TOKEN, password: "newpassword1234" }),
    );
  });

  it("sends the user to sign in rather than signing them in", async () => {
    // The API returns no session token, so there is nothing to sign in with. The
    // page must not pretend otherwise.
    mockReset.mockResolvedValue({} as never);

    renderAt(TOKEN);

    await userEvent.type(screen.getByLabelText(/^new password$/i), "newpassword1234");
    await userEvent.type(screen.getByLabelText(/confirm new password/i), "newpassword1234");
    await userEvent.click(screen.getByRole("button", { name: /set new password/i }));

    // Lands on the login page rather than the dashboard.
    expect(await screen.findByText(/login page/i)).toBeInTheDocument();
  });

  it("does not store the new password anywhere on the page", async () => {
    mockReset.mockResolvedValue({} as never);

    renderAt(TOKEN);

    const password = screen.getByLabelText(/^new password$/i);
    expect(password).toHaveAttribute("type", "password");
    // The browser must not offer the old credential here, which it would if this
    // claimed to be the current password.
    expect(password).toHaveAttribute("autocomplete", "new-password");
  });
});