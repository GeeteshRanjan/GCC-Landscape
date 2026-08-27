import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";

import {
  TOTP_DIGITS,
  describeTotpProblem,
  encodeBase32,
  generateTotpSecret,
  isTotpRequired,
  totpUri,
  verifyTotp,
} from "@/lib/admin/totp";

/**
 * TOTP is hand-rolled on node:crypto rather than pulled from a library, so it
 * gets held to the specification rather than to its own output. The RFC 6238
 * vectors below are the published ones; if this implementation drifts, an
 * authenticator app stops working and there is no way back into admin except
 * editing the environment.
 */

/** The RFC's fixed ASCII seed, "12345678901234567890". */
const RFC_SECRET = encodeBase32(Buffer.from("12345678901234567890", "utf8"));

/** Independent generator, written from the RFC rather than reusing the module. */
function codeAt(secretBase32: string, epochMs: number): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of secretBase32.toUpperCase().replace(/[\s=-]/g, "")) {
    value = (value << 5) | alphabet.indexOf(char);
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(epochMs / 1000 / 30)));
  const digest = createHmac("sha1", Buffer.from(bytes)).update(counter).digest();
  const offset = (digest[digest.length - 1] as number) & 0x0f;
  const binary =
    (((digest[offset] as number) & 0x7f) << 24) |
    (((digest[offset + 1] as number) & 0xff) << 16) |
    (((digest[offset + 2] as number) & 0xff) << 8) |
    ((digest[offset + 3] as number) & 0xff);
  return String(binary % 10 ** 6).padStart(6, "0");
}

beforeEach(() => {
  vi.unstubAllEnvs();
});

describe("RFC 6238 conformance", () => {
  /**
   * The SHA-1 rows of the RFC's test table. Times are in seconds; the last is
   * past 2^31 seconds, which is where a 32-bit counter silently breaks.
   */
  const vectors: ReadonlyArray<[seconds: number, code: string]> = [
    [59, "287082"],
    [1_111_111_109, "081804"],
    [1_111_111_111, "050471"],
    [1_234_567_890, "005924"],
    [2_000_000_000, "279037"],
    [20_000_000_000, "353130"],
  ];

  for (const [seconds, expected] of vectors) {
    it(`matches the published code at T=${seconds}`, () => {
      const at = seconds * 1000;
      expect(codeAt(RFC_SECRET, at)).toBe(expected);
      expect(verifyTotp(expected, RFC_SECRET, at)).toBe(true);
    });
  }

  it("handles counters past 2^31 seconds, where a 32-bit shift would break", () => {
    // The T=20000000000 row above is the guard. Asserted separately so the
    // reason is visible when it fails.
    expect(verifyTotp("353130", RFC_SECRET, 20_000_000_000 * 1000)).toBe(true);
  });
});

describe("verifyTotp", () => {
  const secret = generateTotpSecret();
  const now = 1_700_000_000_000;

  it("accepts the current step and one step either side", () => {
    expect(verifyTotp(codeAt(secret, now), secret, now)).toBe(true);
    expect(verifyTotp(codeAt(secret, now - 30_000), secret, now)).toBe(true);
    expect(verifyTotp(codeAt(secret, now + 30_000), secret, now)).toBe(true);
  });

  it("rejects two steps out, so the window does not creep", () => {
    expect(verifyTotp(codeAt(secret, now - 60_001), secret, now)).toBe(false);
    expect(verifyTotp(codeAt(secret, now + 60_001), secret, now)).toBe(false);
  });

  it("rejects a code minted from a different secret", () => {
    expect(verifyTotp(codeAt(generateTotpSecret(), now), secret, now)).toBe(false);
  });

  it("accepts the spacing and casing that real apps and people produce", () => {
    const code = codeAt(secret, now);
    expect(verifyTotp(`${code.slice(0, 3)} ${code.slice(3)}`, secret, now)).toBe(true);
    expect(verifyTotp(code, secret.toLowerCase(), now)).toBe(true);
    expect(verifyTotp(code, `${secret} `, now)).toBe(true);
    // Authenticator apps display secrets in hyphenated groups.
    expect(verifyTotp(code, secret.replace(/(.{4})/g, "$1-"), now)).toBe(true);
  });

  it("rejects anything that is not exactly six digits", () => {
    for (const bad of ["", "12345", "1234567", "abcdef", "12 34 5", "-12345", "12345 "]) {
      expect(verifyTotp(bad, secret, now)).toBe(false);
    }
  });

  it("rejects rather than throwing when the secret is unusable", () => {
    const code = codeAt(secret, now);
    for (const bad of ["", "not!base32", "1", undefined]) {
      expect(verifyTotp(code, bad, now)).toBe(false);
    }
  });

  it("is six digits, matching what the otpauth URI advertises", () => {
    expect(TOTP_DIGITS).toBe(6);
    expect(totpUri(secret)).toContain("digits=6");
  });
});

describe("generateTotpSecret", () => {
  it("is 160 bits of base32, as RFC 4226 recommends for SHA-1", () => {
    const secret = generateTotpSecret();
    expect(secret).toMatch(/^[A-Z2-7]+$/);
    expect(secret).toHaveLength(32);
  });

  it("does not repeat", () => {
    const secrets = new Set(Array.from({ length: 50 }, () => generateTotpSecret()));
    expect(secrets.size).toBe(50);
  });
});

describe("totpUri", () => {
  it("is a scannable otpauth URI carrying every parameter an app needs", () => {
    const secret = generateTotpSecret();
    const uri = new URL(totpUri(secret));

    expect(uri.protocol).toBe("otpauth:");
    expect(uri.searchParams.get("secret")).toBe(secret);
    expect(uri.searchParams.get("algorithm")).toBe("SHA1");
    expect(uri.searchParams.get("period")).toBe("30");
    expect(uri.searchParams.get("issuer")).toBe("ANSR");
  });

  it("escapes a label so a space cannot break the URI", () => {
    expect(totpUri("ABCDEFGH", "Some Label")).toContain("Some%20Label");
  });
});

describe("configuration", () => {
  it("is off when the variable is unset or blank, and on when it is set", () => {
    expect(isTotpRequired()).toBe(false);

    vi.stubEnv("ADMIN_TOTP_SECRET", "   ");
    expect(isTotpRequired()).toBe(false);

    vi.stubEnv("ADMIN_TOTP_SECRET", generateTotpSecret());
    expect(isTotpRequired()).toBe(true);
  });

  it("reports nothing when the factor is simply not in use", () => {
    expect(describeTotpProblem()).toBeNull();
  });

  it("reports a secret that is set but unusable, rather than failing silently", () => {
    vi.stubEnv("ADMIN_TOTP_SECRET", "not-valid-base32!");
    expect(describeTotpProblem()).toContain("ADMIN_TOTP_SECRET");

    // Set but far too short to be a real secret — the worst case, because it
    // would otherwise "work" while being trivially guessable.
    vi.stubEnv("ADMIN_TOTP_SECRET", "ABCD");
    expect(describeTotpProblem()).toContain("base32");
  });

  it("is silent on a freshly minted secret", () => {
    vi.stubEnv("ADMIN_TOTP_SECRET", generateTotpSecret());
    expect(describeTotpProblem()).toBeNull();
  });
});
