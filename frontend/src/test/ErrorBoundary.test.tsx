import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";

import ErrorBoundary from "../components/ErrorBoundary";

/**
 * A component that throws on demand, so the boundary can be exercised for real.
 *
 * The throw is conditional rather than unconditional so the same component can
 * also be rendered in a healthy state, which is what proves the boundary is
 * transparent when nothing is wrong.
 */
function Boom({ explode }: { explode: boolean }) {
  if (explode) throw new Error("Component exploded on purpose");
  return <p>Everything is fine</p>;
}

/** Lets "Try again" be given something to recover into. */
function Harness() {
  const [broken, setBroken] = useState(true);

  return (
    <div>
      <button type="button" onClick={() => setBroken(false)}>
        heal
      </button>
      <ErrorBoundary label="the harness page">
        <Boom explode={broken} />
      </ErrorBoundary>
    </div>
  );
}

const originalError = console.error;

afterEach(() => {
  // React logs every caught error to console.error. Expected here.
  vi.restoreAllMocks();
  console.error = originalError;
});

describe("ErrorBoundary", () => {
  it("renders its children when nothing is wrong", () => {
    render(
      <ErrorBoundary>
        <Boom explode={false} />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Everything is fine")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows an alert instead of a blank screen when a child throws", () => {
    console.error = vi.fn();

    render(
      <ErrorBoundary label="the test page">
        <Boom explode />
      </ErrorBoundary>,
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    // The label is woven in, so the user is told which part broke.
    expect(screen.getByText(/something went wrong on the test page/i)).toBeInTheDocument();
  });

  it("reads plainly when no label is given", () => {
    console.error = vi.fn();

    render(
      <ErrorBoundary>
        <Boom explode />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("says the data is safe, because a crash deletes nothing", () => {
    console.error = vi.fn();

    render(
      <ErrorBoundary>
        <Boom explode />
      </ErrorBoundary>,
    );

    expect(screen.getByText(/nothing has been deleted/i)).toBeInTheDocument();
  });

  it("reports the error to its onError, rather than swallowing it", () => {
    // A crash nobody hears about is a crash that ships and gets worse.
    console.error = vi.fn();
    const onError = vi.fn<(error: Error) => void>();

    render(
      <ErrorBoundary onError={onError}>
        <Boom explode />
      </ErrorBoundary>,
    );

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(onError.mock.calls[0][0].message).toMatch(/exploded on purpose/);
  });

  it("recovers in place when the fault was transient", async () => {
    // The case the retry button exists for: a child threw because of state that
    // has since changed, so re-rendering is enough and no reload is needed.
    console.error = vi.fn();
    const user = userEvent.setup();

    render(<Harness />);
    expect(screen.getByRole("alert")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /heal/i }));
    await user.click(screen.getByRole("button", { name: /try again/i }));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText("Everything is fine")).toBeInTheDocument();
  });

  it("offers a full reload as the fallback when re-rendering fails too", () => {
    console.error = vi.fn();

    render(
      <ErrorBoundary>
        <Boom explode />
      </ErrorBoundary>,
    );

    // Both routes out are present, because which one works depends on whether
    // the fault was transient.
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reload the app/i })).toBeInTheDocument();
  });

  it("shows the message but keeps the stack behind a disclosure", () => {
    // A stack in the UI tells a user nothing and a screenshot of it tells an
    // attacker a great deal, so it is present but not shouted at.
    console.error = vi.fn();

    render(
      <ErrorBoundary>
        <Boom explode />
      </ErrorBoundary>,
    );

    expect(screen.getByText(/exploded on purpose/)).toBeInTheDocument();
    expect(screen.getByText(/technical detail/i)).toBeInTheDocument();
  });

  it("uses the app variant for a full-screen backstop", () => {
    console.error = vi.fn();

    const { container } = render(
      <ErrorBoundary variant="app" label="the app">
        <Boom explode />
      </ErrorBoundary>,
    );

    expect(screen.getByText(/something went wrong on the app/i)).toBeInTheDocument();
    // The app variant fills the viewport, so nothing else can be misread as
    // working content.
    expect(container.firstChild).toHaveClass("min-h-screen");
  });
});
