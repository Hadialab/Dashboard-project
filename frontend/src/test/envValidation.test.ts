import { describe, it, expect } from "vitest";

import { describeEnvProblems, findEnvProblems } from "../envValidation";

/**
 * These rules are the reason a deploy build fails rather than shipping a bundle
 * pointing at nothing, so they are pinned as behaviour rather than left to be
 * discovered in production.
 *
 * `isDeploy` is passed explicitly, because "is this a real deployment" is the
 * caller's judgement, not something the rules can infer.
 */

const dev = (extra: Record<string, string> = {}) =>
  findEnvProblems({ VITE_API_URL: "http://localhost:5000", ...extra }, false);

const deploy = (extra: Record<string, string> = {}) =>
  findEnvProblems({ VITE_API_URL: "https://api.acme.test", ...extra }, true);

describe("findEnvProblems — a working configuration", () => {
  it("accepts a real https URL", () => {
    expect(deploy()).toEqual([]);
  });

  it("accepts a relative URL, for an API behind the same host", () => {
    // A proxy setup is a legitimate deployment shape, not a mistake.
    expect(findEnvProblems({ VITE_API_URL: "/api" }, true)).toEqual([]);
  });

  it("accepts a real http URL for a non-deploy build", () => {
    expect(dev()).toEqual([]);
  });

  it("reports nothing for a Vite boolean flag", () => {
    // Vite injects real booleans for DEV/PROD, so passing import.meta.env
    // straight through must not be a type error or a crash.
    expect(findEnvProblems({ DEV: true, PROD: false, VITE_API_URL: "http://x.test" }, false)).toEqual([]);
  });
});

describe("findEnvProblems — a missing API URL", () => {
  it("rejects an absent URL", () => {
    const problems = findEnvProblems({}, true);

    expect(problems).toHaveLength(1);
    expect(problems[0].variable).toBe("VITE_API_URL");
    expect(problems[0].problem).toMatch(/not set/);
  });

  it("rejects an empty or whitespace-only URL", () => {
    // A blank value in a .env file is a realistic accident, and "" would
    // otherwise become a relative request against the app's own origin.
    expect(findEnvProblems({ VITE_API_URL: "   " }, true)).toHaveLength(1);
  });

  it("reports only the URL, because nothing else can be judged without it", () => {
    const problems = findEnvProblems({ VITE_API_TIMEOUT: "soon" }, true);

    expect(problems.map((p) => p.variable)).toEqual(["VITE_API_URL"]);
  });
});

describe("findEnvProblems — a malformed API URL", () => {
  it("rejects something that is not a URL at all", () => {
    const problems = findEnvProblems({ VITE_API_URL: "api.example.com" }, true);

    expect(problems).toHaveLength(1);
    expect(problems[0].problem).toMatch(/not a valid URL/);
  });

  it("rejects a scheme the browser cannot fetch over", () => {
    // "ftp://" parses as a URL, so a scheme check is the only thing standing
    // between a bad value and a silent failure on every request.
    const problems = findEnvProblems({ VITE_API_URL: "ftp://api.example.com" }, true);

    expect(problems.some((p) => /scheme/.test(p.problem))).toBe(true);
  });
});

describe("findEnvProblems — a published build", () => {
  it("rejects http", () => {
    // Everything else about http is fine locally. On a public deployment it
    // means the bearer token crosses the network in the clear.
    const problems = findEnvProblems({ VITE_API_URL: "http://api.acme.test" }, true);

    expect(problems.some((p) => /https/.test(p.problem))).toBe(true);
  });

  it("rejects a placeholder host left over from the committed .env files", () => {
    // The committed files carry readable placeholders so a build picks up the
    // right shape. A deploy that forgets to override them would ship an app that
    // reaches nobody — which no local test would catch.
    for (const host of ["api.example.com", "api.example.org", "api.your-api-host"]) {
      const problems = findEnvProblems({ VITE_API_URL: `https://${host}` }, true);

      expect(problems.some((p) => /placeholder/.test(p.problem))).toBe(true);
    }
  });

  it("allows a placeholder host for a local build", () => {
    // Checking that the production bundle compiles is a legitimate local task.
    // Refusing it would only teach people to bypass the check.
    expect(findEnvProblems({ VITE_API_URL: "https://api.example.com" }, false)).toEqual([]);
  });

  it("does not mistake a real host ending in 'example' for a placeholder", () => {
    // A substring match would reject a legitimate host.
    expect(findEnvProblems({ VITE_API_URL: "https://api.acme.test" }, true)).toEqual([]);
  });
});

describe("findEnvProblems — the timeout", () => {
  it("accepts a positive integer", () => {
    expect(dev({ VITE_API_TIMEOUT: "60000" })).toEqual([]);
  });

  it("accepts being unset, because there is a sane default", () => {
    expect(findEnvProblems({ VITE_API_URL: "http://localhost:5000" }, false)).toEqual([]);
  });

  it.each([
    ["soon", "not a number"],
    ["0", "instant timeout"],
    ["-1", "a negative timeout"],
  ])("rejects %s (%s)", (value) => {
    // All three either hang forever or fail every request.
    const problems = dev({ VITE_API_TIMEOUT: value });

    expect(problems.map((p) => p.variable)).toContain("VITE_API_TIMEOUT");
  });
});

describe("findEnvProblems — the Sentry DSN", () => {
  it("accepts a real DSN", () => {
    expect(deploy({ VITE_SENTRY_DSN: "https://abc@o1.ingest.sentry.io/2" })).toEqual([]);
  });

  it("accepts being empty, which means tracking is off", () => {
    expect(deploy({ VITE_SENTRY_DSN: "" })).toEqual([]);
  });

  it("rejects a bare key, which would be sent unencrypted", () => {
    // Sentry accepts a bare key, but over http that is stack traces and user
    // identifiers in the clear.
    const problems = deploy({ VITE_SENTRY_DSN: "abc123" });

    expect(problems.map((p) => p.variable)).toContain("VITE_SENTRY_DSN");
  });
});

describe("describeEnvProblems", () => {
  it("names the variable, the problem and the fix", () => {
    const text = describeEnvProblems(findEnvProblems({ VITE_API_URL: "nope" }, true), "production");

    expect(text).toContain("production");
    expect(text).toContain("VITE_API_URL");
    expect(text).toContain("Fix:");
    // Says plainly that nothing was written, so nobody deploys a stale dist.
    expect(text).toMatch(/Nothing was written to dist/);
  });

  it("lists every problem at once, so fixing them takes one pass", () => {
    const text = describeEnvProblems(
      findEnvProblems({ VITE_API_URL: "http://api.example.com", VITE_API_TIMEOUT: "x" }, true),
      "production",
    );

    // A build that reported one problem at a time would be unfixable in practice.
    expect(text).toContain("VITE_API_URL");
    expect(text).toContain("VITE_API_TIMEOUT");
  });
});
