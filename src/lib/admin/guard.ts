import "server-only";

import { redirect } from "next/navigation";

import { hasValidSession } from "./session";

/**
 * The two ways a request is refused.
 *
 * Page routes redirect to the login form. API routes get a bare 401 — no
 * redirect, no HTML, no hint about what lives here. Both are applied at the
 * boundary rather than in middleware: middleware would be one more runtime to
 * keep Node-only, and the App Router already gives a layout that every admin
 * page must pass through.
 *
 * Every admin API route calls `requireApiSession` itself. That is deliberate
 * duplication — a route that forgets it would otherwise be silently public, and
 * a layout cannot guard a route handler.
 */

export async function requirePageSession(): Promise<void> {
  if (await hasValidSession()) return;
  redirect("/admin/login");
}

/** Returns a 401 Response when unauthenticated, or null when the caller may proceed. */
export async function requireApiSession(): Promise<Response | null> {
  if (await hasValidSession()) return null;
  return Response.json(
    { error: "Not authenticated." },
    { status: 401, headers: { "Cache-Control": "no-store" } },
  );
}
