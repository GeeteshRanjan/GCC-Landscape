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
          //
          // **Medium 500 and `tracking-body`, matching the lockup below it.** Same
          // measurement as the hero's `h1`: the wordmark's stem is 0.137 of its cap
          // height, which is Hanken Grotesk's Medium, and its sidebearings are
          // normal rather than the -0.02em `tracking-display` sets. A Bold heading
          // over the drawn mark read as two different fonts stacked, which is
          // exactly what it was.
          // **The type scale steps DOWN at the small end and the leading is nearly
          // double, and both exist to hold the lockup on this line.**
          //
          // The heading is one line with a graphic in it, so the constraint is not
          // how big the words want to be — it is whether "Impact delivered by" plus a
          // 2.78:1 lockup fits the content width. At the previous 30px base the pair
          // measured ~407px against 342px available at 390, so it wrapped and put the
          // mark alone on a second line. 20px base keeps it on one line down to a
          // 320px viewport, and the steps above it have room to spare.
          //
          // `leading-[1.8]`, not `leading-tight`: the lockup is 1.728em tall and
          // centred on the wordmark's cap band, so it overhangs the cap line by
          // ~0.5em and the baseline by ~0.5em. On one line the band's own padding
          // absorbs that and the leading is invisible. The leading is insurance for
          // the widths where the pair does wrap anyway — without it the burst's rays
          // reach into the line above, which is the failure mode that made the
          // previous pass stack the mark instead of inlining it.
          className="text-center text-xl leading-[1.8] font-medium tracking-body text-balance text-text-inverse sm:text-2xl md:text-4xl lg:text-5xl"
        >
          {IMPACT.titleLead}{" "}
          {/* The brand name, drawn rather than typed, and set INLINE where the word
              used to be — so the sentence still reads as one sentence and the mark is
              its last word rather than a signature under it.
              
              **Three measurements make it sit on the line, all read off the file's own
              geometry, and none of them is the font size.** The lockup is 253x91 with
              the wordmark's cap band from y 26.40 to 64.31:
              
                - **Height `1.728em`.** The letters are 37.91 of 91, so 0.4166 of the
                  box. Dividing the display face's 0.72em cap height by that puts the
                  lockup's letters at exactly the cap height of the words either side
                  of them — which is the whole trick, and it is the same one
                  `ansr-wordmark.tsx` uses one band up. Matching the FONT SIZE instead
                  would set the mark about 2.4x too large.
                - **`vertical-align: -0.507em`.** An inline-block sits its own BOTTOM
                  edge on the baseline, and this lockup has 26.69 of 91 below the
                  letters' baseline — the burst's lower rays. Unshifted, the whole mark
                  floats half its own height above the line. 0.2933 x 1.728em pulls it
                  back down so the drawn baseline and the typed baseline are the same
                  line. In `em`, so it tracks every step of the scale above.
                - **`w-auto` with both intrinsic attributes present**, so the ratio is
                  known before the file lands. An SVG carrying only a `viewBox`
                  resolves to 300x150 and can collapse outright when one axis is auto.
              
              **The on-dark variant, not `ansr-logo.svg` itself.** That file's wordmark
              is `currentColor`, which is right when it is inlined as markup and useless
              through an `<img>`, where there is no colour to inherit and the letters
              would render black on the deepest ground in the palette.
              `ansr-logo-on-dark.svg` is the same lockup with the wordmark resolved to
              white, which is what the manifest keeps it for. Logos are the one brand
              asset used literally.
              
              The band's one orange is the burst rather than a coloured word — the rule
              holding rather than being spent twice, and it no longer has to be measured
              as text because it is not text. */}
          <span className="sr-only">{IMPACT.titleBrand}</span>
          {/* eslint-disable-next-line @next/next/no-img-element -- a logo with a
              fixed intrinsic ratio, served as-is; nothing for an optimiser to do. */}
          <img
            src="/brand/ansr-logo-on-dark.svg"
            alt=""
            aria-hidden="true"
            width={253}
            height={91}
            // `ms-[0.1em]` on top of the word space. The burst has no left
            // sidebearing — its outermost ray starts at x=0 in the viewBox — so a
            // plain word space puts a ray about 10px from the "y" at 48px, which
            // reads as crowding rather than as spacing. In `em` so it holds at every
            // step of the scale.
            className="ms-[0.1em] inline-block h-[1.728em] w-auto align-[-0.507em]"
          />
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
