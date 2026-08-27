import { describeHashProblem, verifyPassword } from "@/lib/admin/password";
import {
  RATE_LIMIT_MAX_ATTEMPTS,
  checkRateLimit,
  clearFailures,
  clientKey,
  padResponseTime,
  recordFailure,
} from "@/lib/admin/rate-limit";
import { createSession, describeSessionConfigProblem } from "@/lib/admin/session";
import { describeTotpProblem, isTotpRequired, verifyTotp } from "@/lib/admin/totp";

/**
 * The login attempt. Rate limited before the password is even hashed, so a
 * locked-out client cannot use this endpoint as a scrypt-powered CPU sink.
 *
 * Every failure returns the same message and takes the same minimum time. A
 * misconfigured `ADMIN_PASSWORD_HASH`, an unknown password and a malformed body
 * are indistinguishable from outside; the operator gets the real reason in the
 * server log.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * One message for every failure. With a second factor configured it must not say
 * which of the two was wrong — that would tell someone holding a leaked password
 * that they only need the phone, and vice versa.
 */
function genericFailure(): string {
  return isTotpRequired()
    ? "That password or code is not correct."
    : "That password is not correct.";
}

function json(body: unknown, status: number, extraHeaders?: HeadersInit) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...extraHeaders },
  });
}

export async function POST(request: Request): Promise<Response> {
  const startedAt = Date.now();
  const key = clientKey(request.headers);

  const limit = checkRateLimit(key);
  if (!limit.allowed) {
    return json(
      {
        error: `Too many attempts. Try again in ${Math.ceil(limit.retryAfterSeconds / 60)} minute(s).`,
        lockedOut: true,
      },
      429,
      { "Retry-After": String(limit.retryAfterSeconds) },
    );
  }

  const configProblem =
    describeSessionConfigProblem() ??
    describeHashProblem(process.env.ADMIN_PASSWORD_HASH) ??
    describeTotpProblem();
  if (configProblem) {
    // Operator-facing only. The client is told nothing it could act on.
    console.error(`[admin] login unavailable: ${configProblem}`);
    await padResponseTime(startedAt);
    return json({ error: genericFailure() }, 401);
  }

  let password = "";
  let code = "";
  try {
    const body = (await request.json()) as { password?: unknown; code?: unknown };
    if (typeof body.password === "string") password = body.password;
    if (typeof body.code === "string") code = body.code;
  } catch {
    // Falls through to the same failure as a wrong password.
  }

  // Both factors are checked and the results combined, with no early return on
  // the password. A short-circuit would leak which factor failed through
  // response time, which is exactly what a lost phone plus a leaked password
  // does not need to be told apart.
  const passwordOk =
    password.length > 0 &&
    (await verifyPassword(password, process.env.ADMIN_PASSWORD_HASH as string));
  const codeOk = isTotpRequired() ? verifyTotp(code) : true;
  const ok = passwordOk && codeOk;

  if (!ok) {
    const next = recordFailure(key);
    await padResponseTime(startedAt);
    if (!next.allowed) {
      return json(
        {
          error: `Too many attempts. Try again in ${Math.ceil(next.retryAfterSeconds / 60)} minute(s).`,
          lockedOut: true,
        },
        429,
        { "Retry-After": String(next.retryAfterSeconds) },
      );
    }
    return json(
      {
        error: genericFailure(),
        remainingAttempts: next.remainingAttempts,
        maxAttempts: RATE_LIMIT_MAX_ATTEMPTS,
      },
      401,
    );
  }

  clearFailures(key);
  await createSession();
  await padResponseTime(startedAt);
  return json({ ok: true }, 200);
}
