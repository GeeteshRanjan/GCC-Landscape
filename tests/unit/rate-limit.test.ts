import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The limiter holds state in module scope on purpose, so every test reloads the
 * module to get a clean process. Time is faked, because the windows are fifteen
 * minutes long and a test suite that waited them out would be useless.
 *
 * The load-bearing test here is "rotating the IP header does not buy more
 * attempts". That was a real hole: `x-forwarded-for` is supplied by the client,
 * so a per-IP-only limiter is defeated by incrementing a number, and twenty-four
 * forged addresses got twenty-four attempts. It is the reason the global budget
 * exists, and it is the test most likely to catch someone removing it.
 */
async function freshLimiter() {
  vi.resetModules();
  return import("@/lib/admin/rate-limit");
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-08-27T10:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("per-IP budget", () => {
  it("allows a first attempt from an unseen client", async () => {
    const { checkRateLimit, RATE_LIMIT_MAX_ATTEMPTS } = await freshLimiter();
    const state = checkRateLimit("203.0.113.1");

    expect(state.allowed).toBe(true);
    expect(state.remainingAttempts).toBe(RATE_LIMIT_MAX_ATTEMPTS);
    expect(state.retryAfterSeconds).toBe(0);
  });

  it("counts down and then locks out", async () => {
    const { checkRateLimit, recordFailure, RATE_LIMIT_MAX_ATTEMPTS } = await freshLimiter();
    const ip = "203.0.113.2";

    const remaining: number[] = [];
    for (let i = 0; i < RATE_LIMIT_MAX_ATTEMPTS; i += 1) {
      remaining.push(recordFailure(ip).remainingAttempts);
    }

    // Four, three, two, one, then zero and locked.
    expect(remaining).toEqual([4, 3, 2, 1, 0]);
    const state = checkRateLimit(ip);
    expect(state.allowed).toBe(false);
    expect(state.retryAfterSeconds).toBeGreaterThan(0);
  });

  /**
   * The lockout must not be bypassable by finally guessing right. The route
   * checks the limiter before it checks the password for exactly this reason.
   */
  it("keeps refusing a locked-out client regardless of what they send next", async () => {
    const { checkRateLimit, recordFailure } = await freshLimiter();
    const ip = "203.0.113.3";
    for (let i = 0; i < 5; i += 1) recordFailure(ip);

    vi.advanceTimersByTime(60_000);
    expect(checkRateLimit(ip).allowed).toBe(false);
  });

  it("does not leak one client's failures into another", async () => {
    const { checkRateLimit, recordFailure } = await freshLimiter();
    for (let i = 0; i < 5; i += 1) recordFailure("203.0.113.4");

    expect(checkRateLimit("203.0.113.4").allowed).toBe(false);
    expect(checkRateLimit("203.0.113.5").allowed).toBe(true);
  });

  it("lets a client back in once the lockout expires", async () => {
    const { checkRateLimit, recordFailure } = await freshLimiter();
    const ip = "203.0.113.6";
    for (let i = 0; i < 5; i += 1) recordFailure(ip);
    expect(checkRateLimit(ip).allowed).toBe(false);

    vi.advanceTimersByTime(15 * 60 * 1000 + 1_000);
    expect(checkRateLimit(ip).allowed).toBe(true);
  });

  it("forgets stale failures, so slow typos never accumulate into a lockout", async () => {
    const { checkRateLimit, recordFailure } = await freshLimiter();
    const ip = "203.0.113.7";

    // Four failures spread beyond the window, repeatedly. Never five inside it.
    for (let round = 0; round < 4; round += 1) {
      for (let i = 0; i < 4; i += 1) recordFailure(ip);
      vi.advanceTimersByTime(15 * 60 * 1000 + 1_000);
      expect(checkRateLimit(ip).allowed).toBe(true);
    }
  });
});

describe("global budget", () => {
  /**
   * The regression test for the actual vulnerability. Without the global budget
   * this loop returns `allowed` on all forty attempts.
   */
  it("stops an attacker who rotates the IP header", async () => {
    const { checkRateLimit, recordFailure } = await freshLimiter();

    let allowedAttempts = 0;
    for (let i = 1; i <= 40; i += 1) {
      const ip = `192.0.2.${i}`;
      if (!checkRateLimit(ip).allowed) continue;
      allowedAttempts += 1;
      recordFailure(ip);
    }

    expect(allowedAttempts).toBeLessThanOrEqual(20);
    expect(allowedAttempts).toBeGreaterThan(5);
  });

  it("refuses a brand new client once the global budget is spent", async () => {
    const { checkRateLimit, recordFailure } = await freshLimiter();
    for (let i = 1; i <= 20; i += 1) recordFailure(`192.0.2.${i}`);

    const state = checkRateLimit("198.51.100.200");
    expect(state.allowed).toBe(false);
    expect(state.retryAfterSeconds).toBeGreaterThan(0);
  });

  /**
   * Sized to be survivable: a global lockout is a denial-of-service lever
   * against the one person who is supposed to get in, so it clears in minutes
   * rather than the per-IP fifteen.
   */
  it("clears its lockout well before the per-IP one would", async () => {
    const { checkRateLimit, recordFailure } = await freshLimiter();
    for (let i = 1; i <= 20; i += 1) recordFailure(`192.0.2.${i}`);
    expect(checkRateLimit("198.51.100.201").allowed).toBe(false);

    vi.advanceTimersByTime(5 * 60 * 1000 + 1_000);
    expect(checkRateLimit("198.51.100.201").allowed).toBe(true);
  });

  it("does not fire for a legitimate admin fumbling their password", async () => {
    const { checkRateLimit, recordFailure } = await freshLimiter();
    const ip = "198.51.100.5";
    for (let i = 0; i < 3; i += 1) recordFailure(ip);

    expect(checkRateLimit(ip).allowed).toBe(true);
    expect(checkRateLimit("198.51.100.6").allowed).toBe(true);
  });
});

describe("clearFailures", () => {
  it("resets both budgets on a successful login", async () => {
    const { checkRateLimit, clearFailures, recordFailure } = await freshLimiter();
    const ip = "198.51.100.7";

    // Nineteen global failures plus four for this client: one more of either
    // would lock something.
    for (let i = 1; i <= 19; i += 1) recordFailure(`192.0.2.${i}`);
    for (let i = 0; i < 4; i += 1) recordFailure(ip);

    clearFailures(ip);

    // The admin who just got in must not be one slip from a lockout.
    expect(checkRateLimit(ip).remainingAttempts).toBe(5);
    for (let i = 0; i < 4; i += 1) recordFailure(ip);
    expect(checkRateLimit(ip).allowed).toBe(true);
  });
});

describe("clientKey", () => {
  it("takes the first hop of x-forwarded-for", async () => {
    const { clientKey } = await freshLimiter();
    expect(
      clientKey(new Headers({ "x-forwarded-for": "203.0.113.9, 70.41.3.18, 150.172.238.178" })),
    ).toBe("203.0.113.9");
  });

  it("falls back to x-real-ip, then to a constant", async () => {
    const { clientKey } = await freshLimiter();
    expect(clientKey(new Headers({ "x-real-ip": "203.0.113.10" }))).toBe("203.0.113.10");
    expect(clientKey(new Headers())).toBe("unknown");
    expect(clientKey(new Headers({ "x-forwarded-for": "  " }))).toBe("unknown");
  });

  /**
   * Every unknown-origin request sharing one bucket is intended: it means a
   * direct-to-Node deployment with no proxy degrades to a single shared budget
   * rather than to no budget at all.
   */
  it("groups all header-less requests together", async () => {
    const { checkRateLimit, clientKey, recordFailure } = await freshLimiter();
    const key = clientKey(new Headers());
    for (let i = 0; i < 5; i += 1) recordFailure(key);
    expect(checkRateLimit(clientKey(new Headers())).allowed).toBe(false);
  });
});

describe("memory bound", () => {
  it("does not grow without limit when sprayed with forged addresses", async () => {
    const { recordFailure } = await freshLimiter();

    // Well past the 5,000-key cap. The assertion is that this completes and does
    // not exhaust memory; the cap itself is internal.
    for (let i = 0; i < 12_000; i += 1) {
      recordFailure(`10.${(i >> 16) & 255}.${(i >> 8) & 255}.${i & 255}`);
      // Keep the global budget out of the way, since it is not what is under test.
      if (i % 10 === 0) vi.advanceTimersByTime(6 * 60 * 1000);
    }

    expect(process.memoryUsage().heapUsed).toBeLessThan(512 * 1024 * 1024);
  });
});

describe("padResponseTime", () => {
  it("waits out the remainder of the floor", async () => {
    const { padResponseTime } = await freshLimiter();
    const startedAt = Date.now();

    const pending = padResponseTime(startedAt, 400);
    await vi.advanceTimersByTimeAsync(399);
    let settled = false;
    void pending.then(() => (settled = true));
    await Promise.resolve();
    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(2);
    await pending;
  });

  it("returns immediately when the work already took longer than the floor", async () => {
    const { padResponseTime } = await freshLimiter();
    const startedAt = Date.now() - 5_000;
    await expect(padResponseTime(startedAt, 400)).resolves.toBeUndefined();
  });
});
