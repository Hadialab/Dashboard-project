import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// The health endpoint.
//
// It is the one route a deployment gate, an orchestrator and a human all depend on
// before they send traffic anywhere. That makes its failure mode worth pinning down:
// an endpoint that returns 200 when the database is unreachable reports a broken
// deployment as healthy, and everything downstream then trusts that answer.
//
// So both branches are asserted, and `ping` is mocked rather than left to a real
// database. A test that only passes when Postgres happens to be running is not a
// test, it is a dependency.

const { pingMock } = vi.hoisted(() => ({ pingMock: vi.fn() }));

vi.mock("../db/migrate.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    // Only `ping` is stubbed. The rest of the module stays real, so a change to the
    // real module that breaks this import still fails the suite.
    ping: pingMock,
  };
});

const { createApp } = await import("../app.js");

/** Boots the app on an ephemeral port and returns the parsed response. */
async function callHealth() {
  const app = createApp();
  const server = app.listen(0);

  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/health`);

    return { status: response.status, body: await response.json() };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

describe("GET /health", () => {
  beforeEach(() => {
    // `mockReset`, not just `mockResolvedValue`: the implementation resets either
    // way but the call history does not, and an assertion on the call count would
    // otherwise read calls left over from the previous test.
    pingMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("answers 200 and reports the database up when the database answers", async () => {
    pingMock.mockResolvedValue(undefined);

    const { status, body } = await callHealth();

    expect(status).toBe(200);
    expect(body).toEqual({ status: "ok", database: "up" });
  });

  it("actually pings the database rather than returning 200 unconditionally", async () => {
    pingMock.mockResolvedValue(undefined);

    await callHealth();

    expect(pingMock).toHaveBeenCalledTimes(1);
  });

  it("answers 503 when the database is unreachable", async () => {
    pingMock.mockRejectedValue(new Error("connection refused"));

    const { status, body } = await callHealth();

    expect(status).toBe(503);
    expect(body).toEqual({ status: "degraded", database: "down" });
  });

  it("does not leak the database error to the caller", async () => {
    pingMock.mockRejectedValue(
      new Error("connect ECONNREFUSED 127.0.0.1:5432 password=secret"),
    );

    const { body } = await callHealth();

    // A health endpoint is unauthenticated and polled constantly, so its error text
    // would reach whoever can reach it.
    expect(JSON.stringify(body)).not.toContain("secret");
    expect(JSON.stringify(body)).not.toContain("ECONNREFUSED");
  });

  it("needs no Authorization header, because a deploy gate has no token", async () => {
    pingMock.mockResolvedValue(undefined);

    const app = createApp();
    const server = app.listen(0);

    try {
      const { port } = server.address();
      const response = await fetch(`http://127.0.0.1:${port}/health`);

      // 401 here would break the Dockerfile HEALTHCHECK, the deploy poll in
      // deploy.yml, and any platform-level health probe, all of which are
      // unauthenticated by nature.
      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});