import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Optional TOTP second factor (RFC 6238), from `ADMIN_TOTP_SECRET`.
 *
 * This is the honest answer to the one thing the rate limiter cannot do. Both of
 * its budgets live in process memory, so several instances mean several budgets
 * and a cold start clears them — a distributed attempt is not bounded. Adding a
 * shared counter would mean adding a database, which this project deliberately
 * does not have. A second factor sidesteps the whole argument: guessing the
 * password stops being worth anything, at any rate, from any number of hosts.
 *
 * Opt-in by design. Unset the env var and login behaves exactly as it did, so
 * this is available rather than imposed. `npm run admin:hash -- --totp` mints a
 * secret and prints the `otpauth://` URI to scan.
 *
 * No dependency: HMAC-SHA1 is in `node:crypto` and base32 is thirty lines. A
 * TOTP library here would be more code to audit than the algorithm.
 *
 * No `server-only` marker, for the same reason as password.ts: scripts/admin-hash.ts
 * imports it under `tsx`, where that marker throws.
 */

const DIGITS = 6;
const STEP_SECONDS = 30;
/**
 * Accept the neighbouring steps as well as the current one, so a phone clock a
 * few seconds out still works. One step either side is the usual choice: it
 * widens the guessing surface from one code to three, which against a 5-per-IP
 * and 20-per-process budget is immaterial.
 */
const WINDOW_STEPS = 1;

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export class TotpConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TotpConfigError";
  }
}

/** True when a second factor is configured and therefore required. */
export function isTotpRequired(): boolean {
  return Boolean(process.env.ADMIN_TOTP_SECRET?.trim());
}

export function encodeBase32(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

function decodeBase32(input: string): Buffer | null {
  // Authenticator apps display secrets in spaced, lowercase-tolerant groups and
  // people paste them back that way, so both are accepted.
  const normalized = input.replace(/[\s-]/g, "").replace(/=+$/, "").toUpperCase();
  if (normalized.length === 0) return null;

  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of normalized) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) return null;
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/** 20 random bytes, base32-encoded — the length RFC 4226 recommends for SHA-1. */
export function generateTotpSecret(): string {
  return encodeBase32(randomBytes(20));
}

/** The URI an authenticator app scans. `label` is what shows in the app. */
export function totpUri(secret: string, label = "ANSR GCC admin"): string {
  const encodedLabel = encodeURIComponent(label);
  const params = new URLSearchParams({
    secret,
    issuer: "ANSR",
    algorithm: "SHA1",
    digits: String(DIGITS),
    period: String(STEP_SECONDS),
  });
  return `otpauth://totp/${encodedLabel}?${params.toString()}`;
}

function codeForStep(key: Buffer, step: number): string {
  // Eight-byte big-endian counter. Written with a BigInt so the high word is not
  // silently dropped the way a 32-bit shift would.
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));

  const digest = createHmac("sha1", key).update(counter).digest();
  const offset = (digest[digest.length - 1] as number) & 0x0f;
  const binary =
    (((digest[offset] as number) & 0x7f) << 24) |
    (((digest[offset + 1] as number) & 0xff) << 16) |
    (((digest[offset + 2] as number) & 0xff) << 8) |
    ((digest[offset + 3] as number) & 0xff);

  return String(binary % 10 ** DIGITS).padStart(DIGITS, "0");
}

/**
 * Verifies a submitted code against the configured secret.
 *
 * Returns false rather than throwing on a malformed secret, so a misconfigured
 * env var reads as "wrong code" to the client while `describeTotpProblem` gives
 * the operator the real reason in the log.
 */
export function verifyTotp(
  submitted: string,
  secret = process.env.ADMIN_TOTP_SECRET,
  now = Date.now(),
): boolean {
  const key = secret ? decodeBase32(secret.trim()) : null;
  if (!key || key.length === 0) return false;

  const cleaned = submitted.replace(/\s/g, "");
  if (!new RegExp(`^\\d{${DIGITS}}$`).test(cleaned)) return false;

  const currentStep = Math.floor(now / 1000 / STEP_SECONDS);
  const submittedBuffer = Buffer.from(cleaned, "utf8");

  // Every candidate is compared, and the result is accumulated rather than
  // returned early, so the number of comparisons does not depend on which step
  // matched.
  let matched = false;
  for (let offset = -WINDOW_STEPS; offset <= WINDOW_STEPS; offset += 1) {
    const candidate = Buffer.from(codeForStep(key, currentStep + offset), "utf8");
    if (
      candidate.length === submittedBuffer.length &&
      timingSafeEqual(candidate, submittedBuffer)
    ) {
      matched = true;
    }
  }
  return matched;
}

/** Operator-facing diagnosis. Never sent to the client. */
export function describeTotpProblem(): string | null {
  const secret = process.env.ADMIN_TOTP_SECRET?.trim();
  if (!secret) return null;
  const key = decodeBase32(secret);
  if (!key || key.length < 10) {
    return "ADMIN_TOTP_SECRET is not a usable base32 secret of at least 10 bytes. Run `npm run admin:hash -- --totp` to mint one, or unset it to disable the second factor.";
  }
  return null;
}

export const TOTP_DIGITS = DIGITS;
