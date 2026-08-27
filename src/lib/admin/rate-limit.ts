import "server-only";

/**
 * Login rate limiting, in process memory. Two budgets, because one is not enough.
 *
 * Per IP: five failures per fifteen minutes. Cheap, and it stops the obvious
 * sequential guessing script.
 *
 * Globally, across all clients in this process: twenty. This one is load-bearing.
 * `x-forwarded-for` is attacker-supplied, so the per-IP counter on its own is
 * defeated by rotating the header — five attempts becomes unlimited. The global
 * budget is what actually bounds a process.
 *
 * What neither budget does is bound a *distributed* attempt across several
 * instances, because there is no shared store and adding one would mean adding a
 * database. That is a real limit and it is why TOTP exists in ./totp.ts: a second
 * factor removes the value of guessing the password at all, which is a better
 * answer than pretending an in-memory counter is a global one. A cold start also
 * clears both budgets.
 *
 * The fixed response delay below is separate from either budget: it removes the
 * timing signal that separates "misconfigured" from "wrong password".
 */

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;
/** Bound on the map, so a spray of forged IPs cannot grow it without limit. */
const MAX_TRACKED_KEYS = 5_000;

/**
 * A second budget, across all clients in this process.
 *
 * The per-IP counter alone is close to decorative: `x-forwarded-for` is
 * attacker-supplied, so rotating it gives five fresh attempts every time. The
 * global budget is what actually bounds a single process, and it is the reason
 * the per-IP limit can stay tight without locking out a legitimate admin who
 * fat-fingers a password twice.
 *
 * The cooldown is deliberately short. A global lockout is a denial-of-service
 * lever against the one person who is supposed to get in, so it is sized to be
 * annoying to an attacker and survivable for the admin. Defeating a distributed
 * attempt across many instances is not this counter's job — that is what the
 * optional TOTP factor in ./totp.ts is for.
 */
const GLOBAL_MAX_ATTEMPTS = 20;
const GLOBAL_LOCKOUT_MS = 5 * 60 * 1000;

const globalFailures: number[] = [];
let globalLockedUntil = 0;

function globalState(now: number): { locked: boolean; retryAfterSeconds: number } {
  if (globalLockedUntil > now) {
    return {
      locked: true,
      retryAfterSeconds: Math.ceil((globalLockedUntil - now) / 1000),
    };
  }
  return { locked: false, retryAfterSeconds: 0 };
}

function recordGlobalFailure(now: number): void {
  while (globalFailures.length > 0 && now - (globalFailures[0] as number) >= WINDOW_MS) {
    globalFailures.shift();
  }
  globalFailures.push(now);
  if (globalFailures.length >= GLOBAL_MAX_ATTEMPTS) {
    globalLockedUntil = now + GLOBAL_LOCKOUT_MS;
    globalFailures.length = 0;
  }
}

interface Attempts {
  /** Epoch ms of each failure inside the current window. */
  failures: number[];
  lockedUntil: number;
}

const buckets = new Map<string, Attempts>();

function prune(now: number): void {
  for (const [key, entry] of buckets) {
    const live = entry.failures.some((t) => now - t < WINDOW_MS);
    if (!live && entry.lockedUntil <= now) buckets.delete(key);
  }
  if (buckets.size <= MAX_TRACKED_KEYS) return;
  // Still over budget: drop the oldest-touched keys. Map preserves insertion
  // order, and a key is re-inserted on every failure, so this is roughly LRU.
  const excess = buckets.size - MAX_TRACKED_KEYS;
  let dropped = 0;
  for (const key of buckets.keys()) {
    if (dropped >= excess) break;
    buckets.delete(key);
    dropped += 1;
  }
}

export interface RateLimitState {
  allowed: boolean;
  /** Seconds until the next attempt is permitted. Zero when allowed. */
  retryAfterSeconds: number;
  remainingAttempts: number;
}

export function checkRateLimit(key: string): RateLimitState {
  const now = Date.now();

  // Checked first: a forged IP gets a fresh per-IP bucket, so the per-IP result
  // means nothing until the global budget has had its say.
  const global = globalState(now);
  if (global.locked) {
    return {
      allowed: false,
      retryAfterSeconds: global.retryAfterSeconds,
      remainingAttempts: 0,
    };
  }

  const entry = buckets.get(key);
  if (!entry) {
    return { allowed: true, retryAfterSeconds: 0, remainingAttempts: MAX_ATTEMPTS };
  }

  if (entry.lockedUntil > now) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((entry.lockedUntil - now) / 1000),
      remainingAttempts: 0,
    };
  }

  const recent = entry.failures.filter((t) => now - t < WINDOW_MS);
  return {
    allowed: recent.length < MAX_ATTEMPTS,
    retryAfterSeconds: 0,
    remainingAttempts: Math.max(0, MAX_ATTEMPTS - recent.length),
  };
}

/** Records a failure and returns the state that now applies. */
export function recordFailure(key: string): RateLimitState {
  const now = Date.now();
  prune(now);
  recordGlobalFailure(now);

  const global = globalState(now);
  if (global.locked) {
    return {
      allowed: false,
      retryAfterSeconds: global.retryAfterSeconds,
      remainingAttempts: 0,
    };
  }

  const entry = buckets.get(key) ?? { failures: [], lockedUntil: 0 };
  buckets.delete(key);
  entry.failures = entry.failures.filter((t) => now - t < WINDOW_MS);
  entry.failures.push(now);
  if (entry.failures.length >= MAX_ATTEMPTS) entry.lockedUntil = now + LOCKOUT_MS;
  buckets.set(key, entry);

  if (entry.lockedUntil > now) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((entry.lockedUntil - now) / 1000),
      remainingAttempts: 0,
    };
  }
  return {
    allowed: true,
    retryAfterSeconds: 0,
    remainingAttempts: Math.max(0, MAX_ATTEMPTS - entry.failures.length),
  };
}

/**
 * Called on a successful login. Clears the global counter too: the case that
 * matters is a legitimate admin who mistyped twice and then got in, and leaving
 * the global budget primed after that would lock them out on their next slip.
 */
export function clearFailures(key: string): void {
  buckets.delete(key);
  globalFailures.length = 0;
  globalLockedUntil = 0;
}

/**
 * Client key for the limiter. `x-forwarded-for` is only trustworthy because
 * every deployment target for this app terminates at a proxy that sets it; a
 * direct-to-Node deployment would need this revisited.
 */
export function clientKey(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first || headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * Floor on how long a login attempt takes, so a wrong password and a
 * misconfigured hash are indistinguishable from the outside.
 */
export async function padResponseTime(startedAt: number, minimumMs = 400): Promise<void> {
  const elapsed = Date.now() - startedAt;
  if (elapsed >= minimumMs) return;
  await new Promise((resolve) => setTimeout(resolve, minimumMs - elapsed));
}

export const RATE_LIMIT_MAX_ATTEMPTS = MAX_ATTEMPTS;
