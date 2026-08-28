import type { MetricShape } from "@/data/metrics";
import type { MetricFunction } from "@/data/schema";
import type { GccStatus, PeerViewInput } from "@/data/screen1";

/**
 * Screen 2's visitor-facing sentences, in one file — same rule as Screen 1's
 * `copy.ts`. The components own layout; this owns language, so the wording a
 * client reviews is one file rather than five JSX trees.
 *
 * **Who this is written for, and what that costs.** Not ANSR. A CIO, COO, CHRO or
 * CFO at a large global company who is deciding whether India is worth a
 * several-hundred-person commitment, reading on a phone, between two other
 * meetings. Three consequences the wording has to carry:
 *
 *   - **The answer leads.** Every heading and lead states what the reader is
 *     looking at, not what we did to produce it.
 *   - **No sentence about our own rigour.** The screen used to explain that it
 *     shows figures exactly as entered and drops incomplete ones — true, and worth
 *     doing, and worth nothing to the reader. Method belongs in the provenance
 *     line, once, at the foot. Everywhere else it reads as protesting.
 *   - **Nothing sells.** The evidence is the argument. A sentence that praises
 *     India rather than measuring it is the one thing this audience discounts the
 *     whole page for.
 *
 * Three product constraints on top of that, unchanged:
 *
 *   - **No lens names.** Supply, speed, place and cost are an internal filing
 *     system. Nothing below is a re-lettering of them.
 *   - **The tabs are four views, not four datasets.** A metric on more than one
 *     tab carries the same figure on each, so the copy must never imply that
 *     operations or HR is measured separately.
 *   - **The scope change is said out loud.** Screen 1 was filtered to the
 *     visitor's industry. Screen 2 is national. A visitor who carried the peer
 *     framing across would read every figure as a statement about their peers.
 */

/** The way back to Screen 1. A real control in the flow, not a pinned edge. */
export const BACK_LABEL = "Back to your peer view";

/* ==========================================================================
   The header
   ========================================================================== */

export interface FunctionFraming {
  title: string;
  lead: string;
  ctaHeading: string;
  ctaBody: string;
  ctaLabel: string;
}

const TITLES: Record<GccStatus, (name: string | null) => string> = {
  evaluating: (name) =>
    name
      ? `What an India GCC would give ${name}`
      : "What an India GCC would give you",
  operating: () => "The benchmarks your India functions sit against",
  expanding: () => "The benchmarks for the functions you are adding",
};

/**
 * The same `gccStatus` input Screen 1 branches on, consumed again here. It
 * changes the framing rather than the evidence: "could this work" and "is what we
 * run competitive" are different questions over identical national figures.
 */
export function functionFraming(input: PeerViewInput): FunctionFraming {
  const name = input.companyName?.trim() || null;

  /**
   * Two sentences, and the second one is the important one.
   *
   * The previous version ran to three sentences and forty-seven words, the last
   * of which explained the tab structure — "each tab is the same national picture,
   * showing the figures that function's leaders are asked to justify". True, and
   * a description of our own information architecture. The reader needs the scope
   * change and nothing else, because the tab labels already say what the tabs are.
   */
  const lead =
    "Talent depth, time to stand up, what the location gives you, and how the cost moves. " +
    "These are figures for India as a whole — the market your peers hire in, not a measure of the peers themselves.";

  switch (input.gccStatus) {
    case "operating":
      return {
        title: TITLES.operating(name),
        lead,
        ctaHeading: "Where you sit against these",
        ctaBody:
          "ANSR runs these functions for global companies at every scale on this page. A conversation is the quickest way to see which of these numbers you are already beating.",
        ctaLabel: "Talk to ANSR about your India GCC",
      };
    case "expanding":
      return {
        title: TITLES.expanding(name),
        lead,
        ctaHeading: "Costing the next function",
        ctaBody:
          "ANSR has stood up each of these functions from a first hire. A conversation turns these benchmarks into a plan for the one you are adding — including the figures held back above.",
        ctaLabel: "Talk to ANSR about scaling your India GCC",
      };
    case "evaluating":
      return {
        title: TITLES.evaluating(name),
        lead,
        ctaHeading: "What this looks like for your roles",
        ctaBody:
          "These are national figures. Yours depend on the roles you would move, the cities you would pick and the country you are hiring from — which is a conversation, not a page.",
        ctaLabel: "Talk to ANSR about building your India GCC",
      };
  }
}

/* ==========================================================================
   The tabs

   One line per function area, saying what the tab answers. Written as the
   visitor's question, not as the four lenses relabelled — and cut to one clause,
   because a lead paragraph above a grid of cards that each carry their own
   question is the third time the reader has been told what they are looking at.
   ========================================================================== */

export const AREA_LEAD: Record<MetricFunction, string> = {
  tech: "How deep the engineering pool is, which specialisms it covers, and how India sits against the other locations on your list.",
  operations:
    "The same talent picture, plus how long a function takes to stand up and whether the city stays up while it runs.",
  hr: "The same talent picture, plus how fast you can hire, how long a seat stays empty, and what the same person costs a year from now.",
  finance:
    "Where the cost advantage comes from, whether it lasts, and what going beyond the established hubs is worth.",
};

/**
 * The one caveat this screen owes a CIO on the cost tab, stated where the cost
 * figures are rather than in a footer nobody reaches. It is true by construction:
 * the schema has no currency format and refuses a currency-looking unit, so an
 * absolute per-head figure cannot be stored in this dataset at all.
 */
const BENCH_PROVENANCE =
  "Bench strength, graduate output and the hiring timings are the national workforce rather than the share already inside GCCs — that is what “available to hire” means. Same figures on every tab that shows them.";

export const AREA_PROVENANCE: Partial<Record<MetricFunction, string>> = {
  finance:
    "Cost is shown as indices, spreads and growth rates. We publish no per-head salary figure — not here, and not behind the gate.",
  // The three tabs that carry the shared supply figures each state where they
  // come from, rather than one tab stating it for the others.
  tech: BENCH_PROVENANCE,
  operations: BENCH_PROVENANCE,
  hr: BENCH_PROVENANCE,
};

/**
 * The screen-level caveat. One sentence now.
 *
 * It used to be two, the first of which promised that figures are shown exactly
 * as entered and that a metric with a gap is left off rather than part-filled.
 * Both are true, both are enforced in `publicMetricsFor`, and neither is
 * information to a reader — an absent metric is absent, and a sentence explaining
 * that we would never part-fill one draws attention to a failure mode nobody
 * suspected. What survives is the part that changes how a figure is READ: the
 * plus marker.
 */
export const SCREEN_PROVENANCE =
  "National aggregates maintained by ANSR. A figure marked with a plus is a floor rather than a point measurement.";

/* ==========================================================================
   The held group
   ========================================================================== */

export function heldHeading(count: number): string {
  return count === 1
    ? "One figure we work through with you"
    : "Figures we work through with you";
}

/**
 * Why a shape is on the screen with nothing in it.
 *
 * Cut from four sentences to two. The removed pair explained that the shapes are
 * real and that the values are omitted server-side so there is nothing to
 * uncover — which is a promise made to a reader who had not accused us of
 * anything, and which reads as defensive precisely because it is so specific. The
 * reason these are held is the reason worth keeping, and it is a real one: a
 * single number without the reader's own roles and cities behind it would mislead.
 */
export const HELD_BODY =
  "These depend on the roles you would move, the cities you would pick and the country you are hiring from. A single national number would mislead more than it would inform, so the shape is here and the figures are not.";

export const HELD_CHIP = "Held back";

/**
 * What a withheld metric's shape is, in words.
 *
 * Cardinality is all we have — `publicMetric` drops the row and column names, the
 * unit, the index base and the as-of date, because a row label beside a visible
 * axis can imply the answer. So the sentence counts, and names nothing.
 */
export function heldShapeNote(shape: MetricShape): string {
  switch (shape.kind) {
    case "scalar":
      return "One figure.";
    case "range":
      return "A low end and a high end.";
    case "breakdown":
      return `${shape.entries} parts.`;
    case "matrix":
      return `${shape.rows} rows across ${shape.columns} columns.`;
  }
}

/* ==========================================================================
   Small labels
   ========================================================================== */

export const RATING_KEY_LABEL = "Scale, weakest first";
export const TABS_LABEL = "Function";
