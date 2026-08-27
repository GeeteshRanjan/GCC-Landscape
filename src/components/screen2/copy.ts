import type { MetricShape } from "@/data/metrics";
import type { MetricFunction } from "@/data/schema";
import type { GccStatus, PeerViewInput } from "@/data/screen1";

/**
 * Screen 2's visitor-facing sentences, in one file — same rule as Screen 1's
 * `copy.ts`. The components own layout; this owns language, so the wording a
 * client reviews is one file rather than five JSX trees.
 *
 * Three things the copy on this screen has to carry, all of them product
 * constraints rather than tone:
 *
 *   - **No lens names.** Supply, speed, place and cost are an internal filing
 *     system. Nothing below is a re-lettering of them: the per-tab lines describe
 *     what the tab answers in the visitor's own terms, and there are no group
 *     headings inside a tab at all.
 *   - **The tabs are four views, not four datasets.** A metric that appears on
 *     more than one tab carries the same figure on each — that is enforced in
 *     `src/data/metric-catalogue.ts` — so the copy must never imply that operations
 *     or HR is being measured separately. The shared figures are technology-role
 *     figures, and the cards deliberately do not say so: the point is to let each
 *     leader read the India engineering market in the terms they answer for.
 *   - **The scope change is said out loud.** Screen 1 was filtered to the
 *     visitor's industry and revenue band. Screen 2 is national. A visitor who
 *     carried the peer framing across would read every figure as a statement
 *     about their peers, which none of it is.
 *   - **A withheld figure is described as withheld, never as missing.** The
 *     wording says the value is left out on the server, because it is — and
 *     "there is nothing here to uncover" is a claim this codebase can actually
 *     stand behind.
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
      ? `What it would take for ${name} to run these functions in India`
      : "What it would take to run these functions in India",
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

  const lead =
    "Talent depth, time to stand up, what the location gives you, and how the cost moves. " +
    "These are figures for India as a whole — not for the companies in your peer set. " +
    "Each tab is the same national picture, showing the figures that function's leaders are asked to justify.";

  switch (input.gccStatus) {
    case "operating":
      return {
        title: TITLES.operating(name),
        lead,
        ctaHeading: "Where you sit against these",
        ctaBody:
          "ANSR runs the functions on this page for global companies, at every scale on it. A conversation is the fastest way to find out which of these numbers your own operation is already beating, and which it is not.",
        ctaLabel: "Talk to ANSR about your India GCC",
      };
    case "expanding":
      return {
        title: TITLES.expanding(name),
        lead,
        ctaHeading: "Costing the next function",
        ctaBody:
          "ANSR has stood up each of these functions from a first hire. A conversation is the fastest way to turn these benchmarks into a plan for the one you are adding — including the parts held back above.",
        ctaLabel: "Talk to ANSR about scaling your India GCC",
      };
    case "evaluating":
      return {
        title: TITLES.evaluating(name),
        lead,
        ctaHeading: "Turning this into a plan",
        ctaBody:
          "ANSR has built and run every function on this page inside India GCCs for global companies. A conversation is the fastest way to see what these numbers look like for your own roles, your own cities and your own sending country.",
        ctaLabel: "Talk to ANSR about building your India GCC",
      };
  }
}

/* ==========================================================================
   The tabs

   One line per function area, saying what the tab answers. Written as the
   visitor's question, not as the four lenses relabelled.
   ========================================================================== */

export const AREA_LEAD: Record<MetricFunction, string> = {
  tech: "How deep the engineering pool is, which specialisms it actually covers, and how India sits against the other locations on your list.",
  operations:
    "The same talent picture, alongside how long a function takes to stand up and whether the city stays up while it runs.",
  hr: "The same talent picture, alongside how quickly you can hire, how long a seat stays empty, and what the same person costs a year from now.",
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
  "Bench strength, graduate output and the hiring timings are the national workforce, not the share of it already inside GCCs, because that is what “available to hire” means. They are the same figures on every tab that shows them.";

export const AREA_PROVENANCE: Partial<Record<MetricFunction, string>> = {
  finance:
    "Cost is shown as indices, spreads and growth rates. We do not publish a per-head salary figure — not here, and not behind the gate.",
  // The three tabs that carry the shared supply figures each state where they
  // come from, rather than one tab stating it for the others.
  tech: BENCH_PROVENANCE,
  operations: BENCH_PROVENANCE,
  hr: BENCH_PROVENANCE,
};

/**
 * The screen-level caveat.
 *
 * Two claims, both true by construction rather than by promise: a figure is shown
 * exactly as entered, and a metric with a gap in it is dropped rather than
 * part-filled — which `publicMetricsFor` enforces and `ShownMetric` types.
 *
 * It says nothing about provenance dates. `asOf` used to default to "Sample, not
 * for publication" and rendered beside every figure, so this line had to
 * acknowledge it; the default is gone, `asOf` is now only ever a real provenance
 * string an admin has typed, and a line promising a caveat that is no longer there
 * would be worse than no line.
 */
export const SCREEN_PROVENANCE =
  "Figures are national aggregates maintained by ANSR and shown exactly as entered — a metric with a gap in it is left off this screen rather than part-filled. A figure marked with a plus is a floor rather than a point measurement.";

/* ==========================================================================
   The held group
   ========================================================================== */

export function heldHeading(count: number): string {
  return count === 1
    ? "One of these we work through with you"
    : "These we work through with you";
}

export const HELD_BODY =
  "The shapes below are real: the rows, columns and parts are exactly what these metrics hold. The figures are not on this page in any form — they are left out on the server, so there is nothing here to uncover. They also depend on your own roles, your own cities and the country you are hiring from, and a single number without that context would mislead more than it would inform.";

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

export const RANGE_LOW_FALLBACK = "at the low end";
export const RANGE_HIGH_FALLBACK = "at the high end";
export const RATING_KEY_LABEL = "Scale, weakest first";
export const TABS_LABEL = "Function";
