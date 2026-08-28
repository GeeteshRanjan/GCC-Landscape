import { getDataset } from "@/data/dataset";
import { businessTypesForIndustry } from "@/data/screen1";
import { buildFunctionView } from "@/data/screen2";
import { GccLandscapeTool } from "@/components/public/tool";

/**
 * The tool's only public route, and both of its screens.
 *
 * The server's job here is the three dropdown lists, a link, and Screen 2's whole
 * payload. Screen 1's answer arrives later through the `fetchPeerView` server
 * action, because it depends on what the visitor types; Screen 2's does not depend
 * on the visitor at all, so it is built here once per request instead of behind a
 * second round trip.
 *
 * `buildFunctionView` is the only path from the dataset to Screen 2, and it goes
 * through `publicMetricsFor` — so a gated metric's value is omitted here, on the
 * server, before anything is serialized. The dataset itself never crosses:
 * `@/data/dataset` is `server-only`, so importing it from the client component
 * below would be a build error rather than a 700 KB payload nobody noticed.
 *
 * Taxonomy drives the dropdowns straight from the published data, which is what
 * makes admin's promise true — a value added in the taxonomy editor appears here
 * on the next publish with no code change.
 */

/**
 * Where the closing CTA goes. Configured rather than hardcoded because the
 * hosting page and its conversion path are the client's to decide, and the tool
 * ships before that decision.
 *
 * The fallback is ansr.com itself: certainly correct, if less specific than the
 * real landing page will be. It is deliberately not a guessed deep path — a
 * plausible-looking URL that 404s is worse than a general one that works.
 */
const CTA_HREF = process.env.NEXT_PUBLIC_GCC_CTA_URL ?? "https://www.ansr.com/";

/**
 * Rendered per request rather than prerendered at build time.
 *
 * Left to itself Next prerenders this page, which bakes the taxonomy into the
 * build output — and that quietly undoes the read path the data layer was built
 * around. `dataset.ts` invalidates its cache from the file's mtime and size
 * specifically so a deployment that writes to a real disk picks up a publish
 * without a rebuild; a prerendered page would not pick it up even on a process
 * restart. On Vercel a publish rebuilds anyway, so this costs nothing there and
 * keeps the self-hosted path correct.
 */
export const dynamic = "force-dynamic";

export default async function Page() {
  const dataset = await getDataset();

  /**
   * Business-type options per industry, built here rather than shipped from the
   * dataset.
   *
   * This is ids and labels only — a few kilobytes — and it deliberately excludes
   * the tag sets. Tags are the scoring substrate and belong on the server; the
   * browser needs nothing but a dropdown. Same discipline as everywhere else on
   * this route: the dataset never crosses whole.
   */
  const businessTypesByIndustry = Object.fromEntries(
    dataset.taxonomy.industries.map((industry) => [
      industry,
      businessTypesForIndustry(dataset, industry),
    ]),
  );

  return (
    <GccLandscapeTool
      industries={dataset.taxonomy.industries}
      revenueBands={dataset.taxonomy.revenueBands}
      hqCountries={dataset.taxonomy.hqCountries}
      businessTypesByIndustry={businessTypesByIndustry}
      functionView={buildFunctionView(dataset)}
      ctaHref={CTA_HREF}
    />
  );
}
