import type { ImpactStat } from "@/data/schema";
import { cn } from "@/lib/utils";

import { IMPACT } from "./copy";

/**
 * How many columns the row takes on desktop, by how many figures there are.
 *
 * **The count is admin-editable, so the grid cannot be a fixed five.** The schema
 * caps it at six, and five columns with six figures leaves one alone on a second
 * row — an empty cell in a row of evidence, which reads as something that failed
 * to load. That is the same rule `packWidths` and `peerSpans` enforce on the other
 * two grids on this screen, applied to the one that arrived last.
 *
 * One figure per column up to five, because a row of five short figures is the
 * shape the brief asks for and each still gets real width at 1280. Six splits
 * three and three rather than running to six columns: at six the figures are
 * narrow enough that a two-line label wraps to three.
 *
 * A lookup rather than an interpolated class name, because Tailwind scans source
 * text — `lg:grid-cols-${n}` compiles to a class that was never generated, and the
 * failure is a silently unstyled grid rather than an error.
 *
 * `auto-fit` was the obvious alternative and is worse here: it re-flows on
 * available width rather than on the count, so the same five figures draw 5-up at
 * one width and 4-then-1 at another, and the orphan reappears at sizes nobody
 * checked.
 */
const DESKTOP_COLUMNS: Readonly<Record<number, string>> = {
  1: "lg:grid-cols-1",
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
  5: "lg:grid-cols-5",
  6: "lg:grid-cols-3",
};

/**
 * The impact band: ANSR's own corporate figures, on the deepest ground in the
 * palette, between two mirrored domes.
 *
 * **Why this is not `Section` + `Stat`.** Those exist and are the right shapes for
 * the answer state, where a figure is evidence inside an argument and sits on one
 * of the three assigned grounds. This band is neither: its ground is
 * `--ansr-surface-deep`, which `Ground` does not carry and should not, and its
 * heading is centred where every `Section` heading is leading-aligned. Rendering
 * it through `Section` would have meant adding a fourth ground and a centred
 * variant to a component shared by nine bands that want neither.
 *
 * **The figures are data, not copy.** They come from
 * `dataset.siteContent.impactStats` and are edited in admin, because they are
 * corporate facts on their own schedule — a figure that goes stale because
 * changing it needed a developer is the failure the whole `siteContent` key
 * exists to prevent. Only the heading is fixed.
 *
 * **This band asserts nothing about the dataset**, which is what keeps it clear of
 * the invariant that no figure may be invented. Nothing here is derived from the
 * 1,834 companies, nothing is summed from headcount bands, and nothing claims to
 * be a measurement of the India market — these are ANSR's numbers about ANSR,
 * supplied by ANSR. That is also why they sit below the customer strip rather than
 * inside the evidence bands: it is the same kind of claim as the logos.
 */
export function ImpactBand({ stats }: { stats: readonly ImpactStat[] }) {
  // An empty list would render a heading over nothing. The schema cannot forbid
  // it — an admin mid-edit legitimately has zero rows — so the band withdraws
  // rather than drawing a headed void.
  if (stats.length === 0) return null;

  return (
    <section
      id="impact"
      aria-labelledby="impact-heading"
      // `overflow-hidden` is load-bearing twice: it crops both domes to the band,
      // which is what lets them be oversized enough to read as a slice of
      // something larger, and it is what stops them adding horizontal page
      // scroll. `isolate` gives the two absolutely-positioned motifs a stacking
      // context of their own so they cannot escape above the content.
      className="relative isolate overflow-hidden bg-surface-deep py-14 md:py-20"
    >
      {/* The pair. One file, two corners — see `.gcc-impact-ring`.
          Decorative and carrying no information the figures do not, so the whole
          layer is out of the accessibility tree. Hidden below `md`, where the
          figures stack into a column that occupies the full width and there is no
          empty ground for ornament: at phone width the domes were behind the
          numbers rather than beside them, which is the one thing the brief asked
          them not to do.

          **ONE `.ansr-motif` wrapping two images, not two `.ansr-motif` siblings,
          and that is a real constraint rather than tidiness.** tokens.css carries
          `.ansr-motif + * { position: relative; z-index: raised }` so that whatever
          follows a motif sits above it — which silently assumes a motif is followed
          by CONTENT. Two adjacent motifs make the second one its own predecessor's
          sibling, so it was handed `position: relative`, overriding the absolute
          positioning it needs: it fell into the flow at the top of the band, at the
          leading edge instead of the trailing one, and pushed the heading down by
          its own height. The band rendered with one dome in the wrong place and 237
          pixels of empty ground above the title. Wrapped, the adjacency rule
          applies to the content div, which is what it was written for. */}
      <div className="ansr-motif gcc-motif-inverse gcc-impact-rings hidden md:block" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element -- decorative,
            fixed intrinsic ratio, and not worth an optimiser round trip. */}
        <img
          src="/brand/impact-rings.svg"
          alt=""
          width={1103}
          height={1103}
          className="gcc-impact-ring gcc-impact-ring--start"
        />
        {/* eslint-disable-next-line @next/next/no-img-element -- as above. */}
        <img
          src="/brand/impact-rings.svg"
          alt=""
          width={1103}
          height={1103}
          className="gcc-impact-ring gcc-impact-ring--end"
        />
      </div>

      <div className="relative mx-auto max-w-content px-6 md:px-12">
        <h2
          id="impact-heading"
          // Centred, unlike every `Section` heading, because the row below it is
          // centred and a leading-aligned heading over a centred row reads as two
          // unrelated blocks. Same size step as `Section` sets, so it does not
          // become a second h1 by weight.
          className="text-center text-3xl leading-tight font-bold tracking-display text-balance text-text-inverse md:text-4xl lg:text-5xl"
        >
          {IMPACT.titleLead}{" "}
          {/* The one orange thing on this band. `text-action` rather than
              `text-accent-inverse`, which is the mint the figures use — the brand
              name and the numbers should not read as the same kind of emphasis. */}
          <span className="text-action">{IMPACT.titleBrand}</span>
        </h2>

        {/* A `dl`, because these genuinely are term-and-definition pairs and the
            semantics are free. `dt`/`dd` are visually reversed — the figure reads
            first — which is a presentational reordering of a real pair rather
            than markup chosen for looks: the LABEL is the term. */}
        <dl
          className={cn(
            "mt-8 grid grid-cols-1 gap-x-8 gap-y-8 md:mt-12 md:gap-y-10 sm:grid-cols-2",
            DESKTOP_COLUMNS[Math.min(stats.length, 6)],
          )}
        >
          {stats.map((stat, index) => (
            <div
              key={stat.id}
              className={cn(
                "flex flex-col gap-3 text-center",
                // The two-column orphan, widened. See `DESKTOP_COLUMNS`.
                stats.length % 2 === 1 &&
                  index === stats.length - 1 &&
                  "sm:col-span-2 lg:col-span-1",
              )}
            >
              {/* The figure. `tabular-nums` so the digits in a row of five sit on
                  a common width — without it "225K+" and "210+" are optically
                  misaligned in a way that reads as sloppy rather than as
                  different numbers.

                  `--ansr-accent-inverse`, the bright mint, and this ground is the
                  one place it is legal: 6.77:1 here against 2.44:1 on white. It
                  is the reference's whole dark-ground voice and nothing in this
                  tool had used it yet. */}
              <dd className="order-1 text-4xl leading-tight font-bold tracking-display tabular-nums text-accent-inverse md:text-5xl">
                {stat.value}
              </dd>
              {/* A rule between figure and label, which is ansr.com's own stat
                  shape and the reason these read as figures rather than as cards:
                  it separates the number from its label without a box. The brief
                  asked for cards and then for "a clean section with typography" —
                  this is the second, because a floating card per figure on a dark
                  band needs either a border or a shadow, and the public screens
                  have neither. */}
              <dt className="order-2 border-t border-border-inverse pt-3 text-base font-medium text-text-inverse">
                {stat.label}
              </dt>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
