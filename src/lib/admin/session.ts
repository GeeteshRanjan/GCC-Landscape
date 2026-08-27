import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

import { SECRET_MIN_LENGTH } from "./constants";

/**
 * Admin session: a signed, httpOnly cookie. No server-side session store,
 * because there is no database and one admin does not need one.
 *
 * The cookie carries an issued-at, an expiry and a random nonce, HMAC-signed
 * with `ADMIN_SESSION_SECRET`. Rotating that secret invalidates every existing
 * session, which is the logout-everywhere lever.
 *
 * Not JWT: a JWT here would add a dependency and an algorithm-confusion
 * footgun to carry two integers and a nonce.
 */

export const SESSION_COOKIE = "gcc_admin_session";
const SESSION_TTL_SECONDS = 12 * 60 * 60;

export { SECRET_MIN_LENGTH } from "./constants";

interface SessionPayload {
  /** Issued at, epoch seconds. */
  iat: number;
  /** Expires at, epoch seconds. */
  exp: number;
  /** Random, so two sessions minted in the same second are distinguishable. */
  jti: string;
}

export class SessionConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SessionConfigError";
  }
}

function secret(): string {
  const value = process.env.ADMIN_SESSION_SECRET;
  if (!value || value.length < SECRET_MIN_LENGTH) {
    throw new SessionConfigError(
      `ADMIN_SESSION_SECRET must be set and at least ${SECRET_MIN_LENGTH} characters. Generate one with \`openssl rand -base64 48\`.`,
    );
  }
  return value;
}

/** Operator-facing config check, used by the login page to fail usefully. */
export function describeSessionConfigProblem(): string | null {
  try {
    secret();
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64url(input: string): Buffer {
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function sign(payload: string): string {
  return base64url(createHmac("sha256", secret()).update(payload).digest());
}

function serialize(payload: SessionPayload): string {
  const encoded = base64url(JSON.stringify(payload));
  return `${encoded}.${sign(encoded)}`;
}

/**
 * Verifies signature then expiry, in that order. An expired-but-unsigned token
 * must not be distinguishable from an expired signed one.
 */
export function verifySessionToken(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;

  const encoded = token.slice(0, dot);
  const provided = fromBase64url(token.slice(dot + 1));

  let expected: Buffer;
  try {
    expected = fromBase64url(sign(encoded));
  } catch {
    return null;
  }
  if (provided.length !== expected.length) return null;
  if (!timingSafeEqual(provided, expected)) return null;

  let payload: SessionPayload;
  try {
    payload = JSON.parse(fromBase64url(encoded).toString("utf8")) as SessionPayload;
  } catch {
    return null;
  }

  if (typeof payload.exp !== "number" || typeof payload.iat !== "number") {
    return null;
  }
  if (payload.exp * 1000 <= Date.now()) return null;
  return payload;
}

export async function createSession(): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
    jti: randomBytes(12).toString("hex"),
  };

  const store = await cookies();
  store.set(SESSION_COOKIE, serialize(payload), {
    httpOnly: true,
    // `strict` rather than `lax`: /admin is never linked to from anywhere, and
    // never framed, so there is no cross-site navigation that needs the cookie.
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** True when the request carries a valid, unexpired session cookie. */
export async function hasValidSession(): Promise<boolean> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value) !== null;
}
