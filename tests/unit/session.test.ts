import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `session.ts` imports `next/headers`, which only resolves inside a request
 * scope. The cookie-writing half of the module is therefore covered by the
 * browser tests, where there is a real request; what is worth testing in
 * isolation is the signing and verification, which is where a forgery would get
 * in.
 *
 * `next/headers` is stubbed rather than the module being split apart — the
 * split would exist only for the test, and `cookies()` is never called on any
 * path exercised below.
 */
vi.mock("next/headers", () => ({
  cookies: () => {
    throw new Error("cookies() must not be reached by these tests");
  },
}));

const SECRET = "a-secret-that-is-comfortably-long-enough-to-pass";

async function loadSession() {
  // Re-imported per test so the module reads whatever env the test just set.
  vi.resetModules();
  return import("@/lib/admin/session");
}

/** Mints a token the way createSession does, without touching cookies(). */
function forgeToken(payload: object, secret: string): string {
  const { createHmac } = require("node:crypto") as typeof import("node:crypto");
  const b64 = (input: string) =>
    Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const encoded = b64(JSON.stringify(payload));
  const sig = createHmac("sha256", secret).update(encoded).digest("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${encoded}.${sig}`;
}

function validPayload(overrides: Record<string, unknown> = {}) {
  const now = Math.floor(Date.now() / 1000);
  return { iat: now, exp: now + 3600, jti: "abcdef012345", ...overrides };
}

beforeEach(() => {
  vi.stubEnv("ADMIN_SESSION_SECRET", SECRET);
});

describe("verifySessionToken", () => {
  it("accepts a correctly signed, unexpired token", async () => {
    const { verifySessionToken } = await loadSession();
    const payload = validPayload();
    expect(verifySessionToken(forgeToken(payload, SECRET))).toMatchObject({
      exp: payload.exp,
    });
  });

  it("rejects a token signed with a different secret", async () => {
    const { verifySessionToken } = await loadSession();
    const token = forgeToken(validPayload(), "a-completely-different-secret-of-good-length");
    expect(verifySessionToken(token)).toBeNull();
  });

  it("rejects a tampered payload", async () => {
    const { verifySessionToken } = await loadSession();
    const token = forgeToken(validPayload(), SECRET);
    const [encoded, signature] = token.split(".");

    // Extend the expiry and keep the old signature — the obvious forgery.
    const forged = forgeToken(validPayload({ exp: 9_999_999_999 }), SECRET).split(".")[0];
    expect(verifySessionToken(`${forged}.${signature as string}`)).toBeNull();

    // Flip a character in the signature.
    const flipped = `${signature?.slice(0, -1)}${signature?.endsWith("A") ? "B" : "A"}`;
    expect(verifySessionToken(`${encoded as string}.${flipped}`)).toBeNull();
  });

  it("rejects an expired token even though the signature is valid", async () => {
    const { verifySessionToken } = await loadSession();
    const now = Math.floor(Date.now() / 1000);
    const token = forgeToken({ iat: now - 7200, exp: now - 1, jti: "x" }, SECRET);
    expect(verifySessionToken(token)).toBeNull();
  });

  it("rejects structurally broken tokens without throwing", async () => {
    const { verifySessionToken } = await loadSession();
    for (const bad of [
      undefined,
      "",
      ".",
      "no-dot-at-all",
      ".onlysignature",
      "onlypayload.",
      "!!!.!!!",
      `${Buffer.from("not json").toString("base64url")}.sig`,
    ]) {
      expect(verifySessionToken(bad as string | undefined)).toBeNull();
    }
  });

  it("rejects a payload missing exp or iat", async () => {
    const { verifySessionToken } = await loadSession();
    expect(verifySessionToken(forgeToken({ iat: 1, jti: "x" }, SECRET))).toBeNull();
    expect(verifySessionToken(forgeToken({ exp: 9_999_999_999, jti: "x" }, SECRET))).toBeNull();
    expect(
      verifySessionToken(forgeToken({ iat: "now", exp: "later", jti: "x" }, SECRET)),
    ).toBeNull();
  });

  /**
   * Rotating ADMIN_SESSION_SECRET is the documented logout-everywhere lever, so
   * it has to actually work.
   */
  it("stops accepting existing tokens once the secret is rotated", async () => {
    const first = await loadSession();
    const token = forgeToken(validPayload(), SECRET);
    expect(first.verifySessionToken(token)).not.toBeNull();

    vi.stubEnv("ADMIN_SESSION_SECRET", "a-rotated-secret-also-long-enough-to-pass");
    const second = await loadSession();
    expect(second.verifySessionToken(token)).toBeNull();
  });
});

describe("secret configuration", () => {
  it("refuses a missing or short secret rather than signing with a weak one", async () => {
    vi.stubEnv("ADMIN_SESSION_SECRET", "");
    let session = await loadSession();
    expect(session.describeSessionConfigProblem()).toContain("ADMIN_SESSION_SECRET");

    vi.stubEnv("ADMIN_SESSION_SECRET", "too-short");
    session = await loadSession();
    expect(session.describeSessionConfigProblem()).toContain(
      String(session.SECRET_MIN_LENGTH),
    );
  });

  it("is silent on a long enough secret", async () => {
    const session = await loadSession();
    expect(session.describeSessionConfigProblem()).toBeNull();
  });

  /**
   * A misconfigured secret makes verification fail closed rather than throw, so
   * a broken deployment sends the admin to the login form instead of a 500. The
   * operator still learns the real reason: the login route logs
   * `describeSessionConfigProblem()` before returning its generic failure.
   */
  it("fails closed rather than crashing when the secret is unusable", async () => {
    vi.stubEnv("ADMIN_SESSION_SECRET", "short");
    const { verifySessionToken, describeSessionConfigProblem } = await loadSession();

    expect(verifySessionToken(forgeToken(validPayload(), SECRET))).toBeNull();
    expect(describeSessionConfigProblem()).not.toBeNull();
  });
});
