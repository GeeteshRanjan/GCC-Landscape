import { requireApiSession } from "@/lib/admin/guard";
import { buildPreview } from "@/lib/admin/publish";

/**
 * Diff preview. Validates the submitted dataset and reports what publishing it
 * would change, without writing anything.
 *
 * The session check is repeated here rather than left to a layout: a layout
 * cannot guard a route handler, and a route that forgot this would be silently
 * public.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const unauthorized = await requireApiSession();
  if (unauthorized) return unauthorized;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Malformed request body." }, { status: 400 });
  }

  const preview = await buildPreview(body);
  if (!preview.ok) {
    return Response.json(
      { error: preview.error, issues: preview.issues },
      { status: preview.status, headers: { "Cache-Control": "no-store" } },
    );
  }

  // `dataset` is deliberately not returned. The browser already has it, and
  // echoing 700 KB back on every keystroke-triggered preview is pure waste.
  return Response.json(
    {
      diff: preview.diff,
      target: preview.target,
      targetDescription: preview.targetDescription,
      message: preview.message,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
