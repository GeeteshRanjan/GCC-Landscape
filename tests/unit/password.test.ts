import { describe, expect, it } from "vitest";

import {
  PASSWORD_MIN_LENGTH,
  describeHashProblem,
  hashPassword,
  verifyPassword,
} from "@/lib/admin/password";

/**
 * The env-format tests are not padding. A `$`-separated hash — which is what
 * every scrypt and argon2 library emits, and what this code originally emitted —
 * is silently mangled by dotenv's variable expansion, so a correct password fails
 * against a hash that looks fine in the file. That cost a real debugging cycle,
 * so the format is pinned here rather than left as a comment someone can undo.
 */

// scrypt at N=16384 is deliberately slow. A handful of hashes per file is fine;
// the default 5s timeout is not.
const SLOW = { timeout: 20_000 };

describe("hashPassword", () => {
  it("produces a colon-separated scrypt hash with no dollar signs", SLOW, async () => {
    const hash = await hashPassword("a-perfectly-fine-password");

    expect(hash).not.toContain("$");
    const parts = hash.split(":");
    expect(parts).toHaveLength(6);
    expect(parts[0]).toBe("scrypt");
    expect(Number(parts[1])).toBeGreaterThanOrEqual(16384);
  });

  it("emits base64url, so no +, / or = reaches an env file", SLOW, async () => {
    // Twenty hashes: the salt is random, so a single sample would only
    // occasionally contain a byte that base64 would encode as + or /.
    const hashes = await Promise.all(
      Array.from({ length: 20 }, (_, i) => hashPassword(`password-number-${i}`)),
    );
    for (const hash of hashes) {
      const [, , , , salt, key] = hash.split(":");
      expect(salt).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(key).toMatch(/^[A-Za-z0-9_-]+$/);
    }
  });

  it("salts, so the same password never hashes twice the same", SLOW, async () => {
    const [a, b] = await Promise.all([
      hashPassword("identical-password"),
      hashPassword("identical-password"),
    ]);
    expect(a).not.toBe(b);
  });
});

describe("verifyPassword", () => {
  it("accepts the right password and rejects a wrong one", SLOW, async () => {
    const hash = await hashPassword("vitest-only-password-fixture");

    await expect(verifyPassword("vitest-only-password-fixture", hash)).resolves.toBe(true);
    await expect(verifyPassword("vitest-only-password-fixtur", hash)).resolves.toBe(false);
    await expect(verifyPassword("Correct-Horse-Battery-Staple", hash)).resolves.toBe(false);
    await expect(verifyPassword("", hash)).resolves.toBe(false);
  });

  it("rejects a hash that dotenv would have eaten, rather than throwing", SLOW, async () => {
    const hash = await hashPassword("some-real-password");
    // What arrives when a `$`-separated hash meets variable expansion: the
    // scheme survives and everything after the first `$` is gone.
    await expect(verifyPassword("some-real-password", "scrypt")).resolves.toBe(false);
    await expect(verifyPassword("some-real-password", "scrypt:::::")).resolves.toBe(false);
    // And the legacy format itself must not be silently accepted.
    await expect(
      verifyPassword("some-real-password", hash.replace(/:/g, "$")),
    ).resolves.toBe(false);
  });

  it("returns false on malformed input instead of throwing", SLOW, async () => {
    for (const bad of [
      "",
      "not-a-hash",
      "bcrypt:16384:8:1:c2FsdA:a2V5",
      "scrypt:0:8:1:c2FsdA:a2V5",
      "scrypt:16384:8:1::a2V5",
      "scrypt:16384:8:1:c2FsdA:",
      "scrypt:notanumber:8:1:c2FsdA:a2V5",
    ]) {
      await expect(verifyPassword("anything", bad)).resolves.toBe(false);
    }
  });

  it("survives a password with characters an env file would choke on", SLOW, async () => {
    const awkward = 'p@ss"word$with\\stuff #and =signs';
    const hash = await hashPassword(awkward);
    await expect(verifyPassword(awkward, hash)).resolves.toBe(true);
  });

  it("handles a long unicode password", SLOW, async () => {
    const unicode = "पासवर्ड-🔐-très-långt-密码";
    const hash = await hashPassword(unicode);
    await expect(verifyPassword(unicode, hash)).resolves.toBe(true);
    await expect(verifyPassword("पासवर्ड-🔐-très-långt-密", hash)).resolves.toBe(false);
  });
});

describe("describeHashProblem", () => {
  it("names an unset variable", () => {
    expect(describeHashProblem(undefined)).toContain("ADMIN_PASSWORD_HASH is not set");
    expect(describeHashProblem("")).toContain("ADMIN_PASSWORD_HASH is not set");
  });

  it("explains the dollar-sign trap when the hash is malformed", () => {
    const problem = describeHashProblem("scrypt");
    expect(problem).toContain("scrypt:N:r:p:salt:key");
    // The whole point of the message: point at dotenv, not at the password.
    expect(problem).toContain("$");
  });

  it("is silent on a valid hash", SLOW, async () => {
    expect(describeHashProblem(await hashPassword("a-valid-password"))).toBeNull();
  });
});

describe("PASSWORD_MIN_LENGTH", () => {
  it("is at least 12, which is what admin-hash enforces at mint time", () => {
    expect(PASSWORD_MIN_LENGTH).toBeGreaterThanOrEqual(12);
  });
});
