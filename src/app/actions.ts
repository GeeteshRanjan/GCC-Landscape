"use server";

import { getDataset } from "@/data/dataset";
import {
  buildPeerView,
  businessTypesForIndustry,
  peerViewInputSchema,
  type PeerView,
} from "@/data/screen1";

/**
 * Screen 1's only server call.
 *
 * A server action rather than a route with search params, because the tool is
 * iframed and does not own the URL bar: screen state lives in component state,
 * so there is no route for the inputs to live in. A server action keeps the
 * dataset on the server anyway, which a client-side filter could not.
 *
 * What crosses is a `PeerView` — five peer cards, a few counts and a city list.
 * The dataset itself never does; `src/data/dataset.ts` is `server-only`, so an
 * attempt to import it from a client component is a build error rather than a
 * silent 700 KB payload.
 *
 * This is a public, unauthenticated endpoint, which is correct for a public
 * screen: it is read-only, returns nothing that is not already published on the
 * screen, and every input is validated against the taxonomy before it reaches
 * the matcher. Nothing about the visitor is stored or logged — there is no lead
 * capture in this codebase.
 */

export type PeerViewResult =
  | { ok: true; view: PeerView }
  | { ok: false; reason: string };

export async function fetchPeerView(input: unknown): Promise<PeerViewResult> {
  let dataset;
  try {
    dataset = await getDataset();
  } catch {
    // The store's message names a filesystem path, so it is logged rather than
    // returned. A visitor can do nothing with it.
    return {
      ok: false,
      reason: "The GCC data is unavailable right now. Please try again shortly.",
    };
  }

  // The business-type list is scoped to the chosen industry, so validation needs
  // the industry first. Read loosely here and let the schema reject anything that
  // is not a real industry — this only decides WHICH id list to validate against.
  const industry =
    typeof input === "object" && input !== null && "industry" in input
      ? String((input as { industry: unknown }).industry)
      : "";
  const allowedBusinessTypes = businessTypesForIndustry(dataset, industry).map(
    (type) => type.id,
  );

  const parsed = peerViewInputSchema(dataset.taxonomy, allowedBusinessTypes).safeParse(
    input,
  );
  if (!parsed.success) {
    // Deliberately not the zod message: the only way to see this is to send
    // something the form cannot produce, and the field names are of no use to a
    // visitor who did not hand-craft the request.
    return {
      ok: false,
      reason: "Those details did not look right. Please check them and try again.",
    };
  }

  return { ok: true, view: buildPeerView(dataset, parsed.data) };
}
