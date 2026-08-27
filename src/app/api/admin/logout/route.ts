import { destroySession } from "@/lib/admin/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Clears the session cookie. Unguarded on purpose — signing out without a valid
 * session is not a failure worth reporting, and a 401 here would leave a stale
 * cookie in place.
 */
export async function POST(): Promise<Response> {
  await destroySession();
  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
