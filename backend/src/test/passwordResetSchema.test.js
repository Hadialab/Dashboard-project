import { describe, it, expect } from "vitest";

import {
  validateForgotPassword,
  validateResetPassword,
  RESET_TOKEN_PATTERN,
} from "../validation/passwordResetSchema.js";

// The two rules this module exists to protect, and both are silent when broken:
// a response that varies reveals which addresses are registered, and a token
// check that disagrees with the route's turns a 400 into an oracle.

describe("validateForgotPassword", () => {
  it("accepts a normal address", () => {
    const { errors } = validateForgotPassword({ email: "nadia@example.com" });

    expect(errors).toEqual({});
  });

  it("normalises case and surrounding space", () => {
    // Addresses are stored lowercased, so a lookup has to normalise too or
    // "Owner@Example.com" silently finds nothing and no mail is sent.
    const { value } = validateForgotPassword({ email: "  OWNER@Example.COM  " });

    expect(value.email).toBe("owner@example.com");
  });

  it("rejects a malformed address", () => {
    for (const email of ["", "not-an-email", "a@b", "@example.com", "a b@example.com"]) {
      const { errors } = validateForgotPassword({ email });

      expect(errors.email, `for ${JSON.stringify(email)}`).toBe("Enter a valid email address");
    }
  });

  it("rejects a body that is not an object", () => {
    for (const body of [null, undefined, "email", 42, ["a@b.com"]]) {
      expect(validateForgotPassword(body).errors).toHaveProperty("_");
    }
  });

  it("never looks the address up, so it cannot distinguish a registered one", () => {
    // Deliberately takes only the address. The shape of the validation is
    // identical for every address that parses, and the route answers the same
    // way whether or not the account exists.
    const { value } = validateForgotPassword({ email: "definitely-not-registered@example.com" });

    expect(value).toEqual({ email: "definitely-not-registered@example.com" });
    expect(value).not.toHaveProperty("exists");
    expect(value).not.toHaveProperty("user");
  });
});

describe("RESET_TOKEN_PATTERN", () => {
  it("matches what generateResetToken produces", () => {
    expect(RESET_TOKEN_PATTERN.test("a".repeat(64))).toBe(true);
  });

  it("rejects anything else", () => {
    // Uppercase hex, wrong length and non-hex are all refused: the shape check is
    // what keeps an arbitrary string from becoming a database lookup.
    expect(RESET_TOKEN_PATTERN.test("A".repeat(64))).toBe(false);
    expect(RESET_TOKEN_PATTERN.test("a".repeat(63))).toBe(false);
    expect(RESET_TOKEN_PATTERN.test("a".repeat(65))).toBe(false);
    expect(RESET_TOKEN_PATTERN.test("g".repeat(64))).toBe(false);
    expect(RESET_TOKEN_PATTERN.test("")).toBe(false);
  });
});

describe("validateResetPassword", () => {
  it("accepts a well-formed request", () => {
    const { value, errors } = validateResetPassword({
      token: "a".repeat(64),
      password: "newpassword1234",
    });

    expect(errors).toEqual({});
    expect(value.token).toHaveLength(64);
    expect(value.password).toBe("newpassword1234");
  });

  it("does not report a problem with the token", () => {
    // This is the whole point. Reporting a malformed token here, while the route
    // answers an unknown one differently, would let an attacker tell which
    // 64-character guesses were ever issued.
    const malformed = validateResetPassword({ token: "nope", password: "newpassword1234" });
    const unknown = validateResetPassword({ token: "a".repeat(64), password: "newpassword1234" });

    expect(malformed.errors).toEqual({});
    expect(unknown.errors).toEqual({});
    // Identical shape, so the route's single rejection covers both.
    expect(Object.keys(malformed.value)).toEqual(Object.keys(unknown.value));
  });

  it("still reports a problem with the password", () => {
    // A password problem is the user's own input, and saying so leaks nothing —
    // unlike anything derived from the token.
    const { errors } = validateResetPassword({ token: "a".repeat(64), password: "short" });

    expect(errors.password).toBe("Password must be at least 6 characters");
  });

  it("applies the same password policy as registration", () => {
    // Both rules in one place, so "I can register with that but not reset to it"
    // cannot happen.
    const tooLong = validateResetPassword({
      token: "a".repeat(64),
      password: "x".repeat(73),
    });

    expect(tooLong.errors.password).toBe("Password must be at most 72 bytes");
  });

  it("measures the password limit in bytes, not characters", () => {
    // bcrypt truncates at 72 bytes. 30 emoji are 30 characters but 120 bytes, so a
    // character count would accept a password whose tail bcrypt silently drops.
    const emoji = "😀".repeat(30);
    const { errors } = validateResetPassword({ token: "a".repeat(64), password: emoji });

    expect(errors.password).toBe("Password must be at most 72 bytes");
  });

  it("trims the token, so a link pasted with a stray space still works", () => {
    const { value } = validateResetPassword({ token: "  " + "a".repeat(64) + "  ", password: "newpassword1234" });

    expect(value.token).toBe("a".repeat(64));
  });

  it("rejects a body that is not an object", () => {
    for (const body of [null, undefined, "token", 42, []]) {
      expect(validateResetPassword(body).errors).toHaveProperty("_");
    }
  });
});