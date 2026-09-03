import { getDataset } from "@/data/dataset";
import { buildPeerView, type PeerViewInput } from "@/data/screen1";
import { VariantHarness } from "@/components/public/variant-harness";

/**
 * TEMPORARY ROUTE — the peer-section variant harness. DELETE WITH `peers-variants.tsx`.
 *
 * It renders the real answer screen, four times over, from a real `PeerView` built the
 * way the server action builds one — same dataset, same matcher, same peers — so what is
 * being compared is the shipped surface with one section swapped, not a mock of it.
 *
 * The form is skipped deliberately: the input is fixed below, so every treatment is
 * judged against identical content. Nothing here is linked from the public screen and
 * nothing here is part of the browser suite, whose `testMatch` is narrow.
 */
export const dynamic = "force-dynamic";

/**
 * The sample answer. BFSI at the top-but-one revenue band with a US headquarters is the
 * ordinary case and the demanding one: it returns five peers, several of them Fortune
 * Global 500, and the widest headcount bands in the dataset — which is what a treatment
 * has to survive. The company name is supplied because the heading interpolates it.
 */
const SAMPLE: PeerViewInput = {
  companyName: "Northbridge Financial",
  industry: "BFSI",
  revenueBand: "$10 Bn – $20 Bn",
  hqCountry: "United States",
  gccStatus: "evaluating",
};

export default async function VariantsPage() {
  const dataset = await getDataset();
  const view = buildPeerView(dataset, SAMPLE);
  return (
    <VariantHarness
      view={view}
      publicCopy={dataset.siteContent.copy}
      closeCopy={dataset.siteContent.close}
    />
  );
}
