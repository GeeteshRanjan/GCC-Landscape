/**
 * Builds the fixture the browser tests run against. Run by `npm run test:browser`
 * before Playwright starts.
 *
 * Two things it guarantees, both of which matter more than they look:
 *
 *   - The tests get their own copy of the dataset, in tests/browser/.tmp. They
 *     publish for real, and publishing writes a file — pointing that at
 *     data/dataset.json would mean the suite rewrites the actual published data,
 *     and a failing test would leave it rewritten.
 *   - The admin password hash is generated with the real `hashPassword`, not
 *     hardcoded. A committed hash would drift the moment the format changed, and
 *     the format has already changed once.
 */
import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

import { hashPassword } from "../../src/lib/admin/password";
import { generateTotpSecret } from "../../src/lib/admin/totp";

export const TEST_PASSWORD = "e2e-test-password-not-a-real-one";
/**
 * The one extra framing origin the suite builds with. SET rather than blanked, so the
 * header assertions in `1-auth.spec.ts` prove the opt-in reaches the public CSP AND
 * that `/admin` stays `'none'` while one is configured — and so a value in a
 * developer's `.env.local` cannot leak into the build (a process variable wins over
 * the file). `.example` is reserved and can never be a real site.
 */
export const TEST_FRAME_ANCESTOR = "https://portfolio.example";
const TMP = path.join(process.cwd(), "tests", "browser", ".tmp");

async function main(): Promise<void> {
  mkdirSync(TMP, { recursive: true });

  const datasetPath = path.join(TMP, "dataset.json");
  copyFileSync(path.join(process.cwd(), "data", "dataset.json"), datasetPath);

  const env = {
    ADMIN_PASSWORD_HASH: await hashPassword(TEST_PASSWORD),
    ADMIN_SESSION_SECRET: `e2e-session-secret-${generateTotpSecret()}`,
    // Explicitly `fs`, so the suite can never be pointed at a real repository by
    // a stray environment variable.
    GCC_DATA_STORE: "fs",
    GCC_DATASET_PATH: datasetPath,
    // Second factor off for the main suite; the auth spec turns it on separately
    // by talking to a server started with it.
    ADMIN_TOTP_SECRET: "",
    GCC_FRAME_ANCESTORS_EXTRA: TEST_FRAME_ANCESTOR,
  };

  writeFileSync(path.join(TMP, "env.json"), `${JSON.stringify(env, null, 2)}\n`, "utf8");
  console.log(
    `prepare: fixture ready in tests/browser/.tmp (dataset copy + generated credentials)`,
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
