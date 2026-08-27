import { requireApiSession } from "@/lib/admin/guard";
import { publishDataset } from "@/lib/admin/publish";

/**
 * The commit. Runs the same validate-read-diff pipeline as the preview, then
 * writes through the selected store. Validation failure blocks the write; the
 * store never sees an invalid dataset.
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

  const result = await publishDataset(body);
  if (!result.ok) {
    return Response.json(
      { error: result.error, issues: result.issues },
      { status: result.status, headers: { "Cache-Control": "no-store" } },
    );
  }

  return Response.json(
    {
      ok: true,
      diff: result.diff,
      target: result.target,
      location: result.location,
      message: result.message,
      // The three metadata fields the server owns. The browser needs them to
      // reset its baseline to what was just published without the whole
      // dataset being echoed back.
      published: result.metadata,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
