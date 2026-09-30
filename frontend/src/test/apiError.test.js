import { describe, it, expect } from "vitest";

import { getApiErrorMessage } from "../utils/apiError";
import axios from "axios";

/**
 * The distinction this module exists to draw: "the server said no" and "the
 * request never arrived" are different problems with different fixes, and
 * telling someone to "try again" when the API is not running wastes their time.
 */

const axiosError = (overrides = {}) => {
  const error = new axios.AxiosError("failed");
  Object.assign(error, overrides);
  return error;
};

describe("getApiErrorMessage", () => {
  it("prefers a field-level validation message", () => {
    const err = axiosError({
      response: { status: 400, data: { error: "Validation failed", details: { email: "Invalid email address" } } },
    });

    expect(getApiErrorMessage(err, "fallback")).toBe("Invalid email address");
  });

  it("uses the server's error when there are no field details", () => {
    const err = axiosError({ response: { status: 409, data: { error: "This lead has already been converted" } } });

    expect(getApiErrorMessage(err, "fallback")).toBe("This lead has already been converted");
  });

  it("falls back to the status when the body says nothing useful", () => {
    const err = axiosError({ response: { status: 500, data: {} } });

    expect(getApiErrorMessage(err, "fallback")).toBe("Request failed (500).");
  });

  it("copes with a response that has no body at all", () => {
    const err = axiosError({ response: { status: 502 } });

    expect(getApiErrorMessage(err, "fallback")).toBe("Request failed (502).");
  });

  it("explains a network failure rather than suggesting a retry", () => {
    // Retrying cannot help when the backend is not running.
    const err = axiosError({ code: "ERR_NETWORK" });
    const message = getApiErrorMessage(err, "fallback");

    expect(message).toContain("Could not reach the API");
    expect(message).toContain("5000");
    expect(message).not.toMatch(/try again/i);
  });

  it("distinguishes a dropped request from a blocked one", () => {
    const err = axiosError({ code: "ECONNABORTED" });

    expect(getApiErrorMessage(err, "fallback")).toBe("Could not reach the API. Please check your connection.");
  });

  it("returns the caller's fallback for a non-axios error", () => {
    expect(getApiErrorMessage(new Error("boom"), "Could not save the customer.")).toBe(
      "Could not save the customer.",
    );
  });

  it("returns the fallback for null rather than throwing", () => {
    expect(getApiErrorMessage(null, "fallback")).toBe("fallback");
  });

  it("handles a 403 with an empty body", () => {
    const err = axiosError({ response: { status: 403, data: { details: {} } } });

    expect(getApiErrorMessage(err, "fallback")).toBe("Request failed (403).");
  });

  it("reads details as a field map on a 400", () => {
    // A 400 is the API's "Validation failed", and its details are field -> message.
    const err = axiosError({
      response: { status: 400, data: { error: "Validation failed", details: { phone: "Invalid phone number" } } },
    });

    expect(getApiErrorMessage(err, "fallback")).toBe("Invalid phone number");
  });

  it("ignores details on a non-400, where they are a payload not a message", () => {
    // The regression: a 409 conversion conflict sends { customerId: "c041" }, and
    // taking the first value of that printed a bare "c041" as the error. The
    // value is a string, so only the status can tell the two cases apart.
    const err = axiosError({
      response: {
        status: 409,
        data: { error: "This lead has already been converted", details: { customerId: "c041" } },
      },
    });

    expect(getApiErrorMessage(err, "fallback")).toBe("This lead has already been converted");
  });

  it("ignores non-string detail values on a 400", () => {
    const err = axiosError({
      response: { status: 400, data: { error: "Something was wrong", details: { field: 42 } } },
    });

    expect(getApiErrorMessage(err, "fallback")).toBe("Something was wrong");
  });
});
