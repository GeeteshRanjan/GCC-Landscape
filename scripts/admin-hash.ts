/**
 * Mints the admin environment values.
 *
 *   npm run admin:hash                 # prompts for a password, hidden input
 *   npm run admin:hash -- --secret     # only regenerate ADMIN_SESSION_SECRET
 *   npm run admin:hash -- --totp       # only mint ADMIN_TOTP_SECRET
 *
 * Run by hand, never at request time. The password is read from a TTY with echo
 * off rather than taken as an argument, because an argument lands in shell
 * history and in the process list.
 */
import { randomBytes } from "node:crypto";
import process from "node:process";
import readline from "node:readline";

// Imported from constants.ts, not session.ts: session.ts is `server-only` and
// pulls in next/headers, neither of which resolves under `tsx`.
import { PASSWORD_MIN_LENGTH, SECRET_MIN_LENGTH } from "../src/lib/admin/constants";
import { hashPassword } from "../src/lib/admin/password";
import { generateTotpSecret, totpUri } from "../src/lib/admin/totp";

/** base64url, so the value needs no quoting in an env file or a host's UI. */
function newSecret(): string {
  return randomBytes(48).toString("base64url");
}

async function promptHidden(question: string): Promise<string> {
  if (!process.stdin.isTTY) {
    console.error(
      "admin-hash: stdin is not a TTY, so the password cannot be read without echoing it.\n" +
        "Run this in an interactive terminal.",
    );
    process.exit(1);
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });

  // Suppress echo: readline still collects the keystrokes, the terminal just
  // does not print them.
  const output = process.stdout;
  let muted = false;
  const originalWrite = output.write.bind(output);
  (output as unknown as { write: typeof originalWrite }).write = ((
    chunk: string | Uint8Array,
    ...rest: unknown[]
  ) => {
    if (muted && typeof chunk === "string" && !chunk.includes("\n")) return true;
    return (originalWrite as (...args: unknown[]) => boolean)(chunk, ...rest);
  }) as typeof originalWrite;

  try {
    const answer = await new Promise<string>((resolve) => {
      rl.question(question, (value) => resolve(value));
      muted = true;
    });
    return answer;
  } finally {
    muted = false;
    (output as unknown as { write: typeof originalWrite }).write = originalWrite;
    rl.close();
    originalWrite("\n");
  }
}

function printTotp(): void {
  const secret = generateTotpSecret();
  console.log(
    [
      "",
      "Second factor. Optional, and the only thing that bounds a distributed",
      "guessing attempt — the login rate limiter is per-process, so it cannot.",
      "",
      "Scan this in any authenticator app (1Password, Authy, Google Authenticator):",
      "",
      `  ${totpUri(secret)}`,
      "",
      "Or enter the secret by hand:",
      "",
      `  ${secret}`,
      "",
      "Then set it in the environment. Confirm a code works BEFORE you close your",
      "current session — a wrong secret here locks you out of admin entirely, and",
      "the only way back is editing the environment.",
      "",
      `ADMIN_TOTP_SECRET=${secret}`,
      "",
      "Leave the variable unset to keep login as password-only.",
      "",
    ].join("\n"),
  );
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes("--secret")) {
    console.log("\nADMIN_SESSION_SECRET regenerated. Every existing session is now invalid.\n");
    console.log(`ADMIN_SESSION_SECRET=${newSecret()}\n`);
    return;
  }

  if (args.includes("--totp")) {
    printTotp();
    return;
  }

  const password = await promptHidden("Admin password: ");
  if (password.length < PASSWORD_MIN_LENGTH) {
    console.error(
      `admin-hash: password must be at least ${PASSWORD_MIN_LENGTH} characters (got ${password.length}).`,
    );
    process.exit(1);
  }
  const confirm = await promptHidden("Confirm password: ");
  if (confirm !== password) {
    console.error("admin-hash: the two entries did not match; nothing generated.");
    process.exit(1);
  }

  const hash = await hashPassword(password);
  const secret = newSecret();

  console.log(
    [
      "",
      "Put both lines in .env.local for development, and in the host's environment",
      "for a deployment. The password itself is not stored anywhere — if it is lost,",
      "re-run this script to set a new one.",
      "",
      `ADMIN_PASSWORD_HASH=${hash}`,
      `ADMIN_SESSION_SECRET=${secret}`,
      "",
      `(ADMIN_SESSION_SECRET must stay at least ${SECRET_MIN_LENGTH} characters. Rotating it logs the admin out everywhere.)`,
      "",
      "For a second factor — worth having, because the login rate limiter is",
      "per-process and cannot bound a distributed attempt — run:",
      "",
      "  npm run admin:hash -- --totp",
      "",
    ].join("\n"),
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
