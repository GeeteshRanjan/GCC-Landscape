import { Fragment } from "react";

import { cn } from "@/lib/utils";

/**
 * The chart vocabulary both public screens draw with.
 *
 * **Every mark carries its figure in text, and nothing is behind a hover.**
 * That is the constraint that shaped this file, and it is the reason there is no
 * charting library underneath it. A tooltip-driven chart puts the number one
 * pointer-hover away, which on a phone is nowhere — and this tool is embedded in
 * a marketing page that a CIO will open on a phone. So a mark is always a SECOND
 * reading of a figure already present, which is also why every mark here is
 * `aria-hidden`: hiding it loses nothing.
 *
 * Three more rules, each of which rules something out:
 *
 *   - **No arithmetic.** Every figure arrives as a string and every mark as a
 *     fraction, decided in `src/data/screen2.ts` or `src/data/screen1.ts`. What a
 *     bar is a share of is a tested decision, not an expression in a style
 *     attribute.
 *   - **A truncated axis is never used to manufacture a difference.** Where the
 *     honest bar would be uninformative — two uptime figures a fifth of a point
 *     apart — the answer is to stop drawing bars, not to move the baseline. That
 *     is what `FigureRow` is for.
 *   - **Direction is stated, never implied.** A cost index where 100 is the
 *     cheapest option draws the cheapest option as the SHORTEST mark, which the
 *     eye reads as "worst" unless the axis says otherwise. `IndexLollipop` labels
 *     its own axis and anchors the baseline column in accent.
 *
 * Colour is carried by the teal ramp only, and it is always ordinal: darker means
 * more. Categorical hue is not available in this palette — the teal steps sit
 * within ΔE 0.087 of one another, so two unrelated categories cannot be told
 * apart by colour here. Where a distinction has to survive greyscale it is
 * carried by form: fill against outline, or a labelled step count.
 */

/* ==========================================================================
   Chrome shared by every chart
   ========================================================================== */

/**
 * The line a chart's marks sit against.
 *
 * A bar chart without a baseline is a set of floating rectangles — the shared
 * zero is what makes two bars comparable at a glance, and it was the thing most
 * obviously missing before this file existed.
 */
function Baseline() {
  return <div aria-hidden="true" className="h-px w-full bg-border-strong" />;
}

/**
 * The bar itself, exported so a caller composing its own rows still gets one
 * visual language.
 *
 * Screen 1's largest-in-industry ranking needs a row that carries index badges
 * and a city caption, which `RankedBars` deliberately does not model — a chart
 * primitive that took arbitrary nodes per row would stop being a chart. So the
 * row is composed there and the MARK comes from here, which is the only part that
 * has to match.
 */
export function BarTrack({
  share,
  emphasis = false,
}: {
  share: number;
  emphasis?: boolean;
}) {
  return (
    // Hidden: the figure it restates is always in text beside it.
    <div aria-hidden="true" className="h-2 w-full bg-surface-sunken">
      <div
        className={cn("h-full", emphasis ? "bg-accent-teal" : "bg-teal-400")}
        // A floor, so a genuinely tiny share is a visible mark rather than an
        // apparently missing bar.
        style={{ width: `${Math.max(share * 100, 1.5)}%` }}
      />
    </div>
  );
}

/**
 * What the far end of the axis means, in words.
 *
 * Every chart here shares an axis across its own rows and none across cards, so
 * a reader has to be told what full width is. One line, at the foot of the chart,
 * in the smallest size — present, not prominent.
 */
export function AxisNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs text-text-muted tabular-nums">{children}</p>
  );
}

/** A legend swatch. Ordinal depth only — never a categorical hue. */
function Swatch({ depth }: { depth: RampDepth }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block size-2.5 shrink-0", RAMP[depth])}
    />
  );
}

/**
 * The sequential ramp, deepest first.
 *
 * Five steps, which is as many as the eye separates reliably and more than any
 * chart here needs. Deepest is the brand teal rather than teal-900: 900 is the
 * inverse SURFACE, and a mark the same colour as the closing band would read as
 * a different kind of thing.
 */
const RAMP = [
  "bg-accent-teal",
  "bg-teal-400",
  "bg-teal-300",
  "bg-teal-200",
  "bg-teal-100",
] as const;

type RampDepth = 0 | 1 | 2 | 3 | 4;

/** Deepest for the largest share, so depth and length agree. */
function depthFor(index: number, total: number): RampDepth {
  if (total <= 1) return 0;
  const step = Math.round((index / (total - 1)) * (RAMP.length - 1));
  return Math.min(Math.max(step, 0), RAMP.length - 1) as RampDepth;
}

/* ==========================================================================
   RankedBars — the workhorse

   A set of named values on one shared axis. Used for every count, duration and
   non-whole percentage breakdown, and for Screen 1's city density and
   largest-in-industry blocks.

   Order is the caller's, never re-sorted here, and that is deliberate rather
   than lazy. The catalogue's own orders are meaningful — graduate output is
   grouped by discipline family, latency runs outward by distance, scale
   milestones run by size — and sorting by value would destroy all three to buy
   a comparison the shared axis already provides.
   ========================================================================== */

export interface BarRow {
  label: string;
  /** Already formatted. The bar is a second reading of this. */
  figure: string;
  /** 0 to 1 against the chart's own axis. */
  share: number;
  /** One row per chart at most: the visitor's own position, or the leader. */
  emphasis?: boolean;
  /** A short qualifier after the label — "emerging", "median". */
  qualifier?: string;
}

export function RankedBars({
  rows,
  axisNote,
  reference,
  dense = false,
}: {
  rows: readonly BarRow[];
  /** What full width is. Omitted only when the section states it already. */
  axisNote?: string;
  /**
   * A comparator drawn across the whole chart — the average a set of growth
   * rates is spread around, say. This is the thing that turns a list of numbers
   * into a reading of which ones are unusual.
   */
  reference?: { share: number; label: string };
  /** Nine rows in a half-width card need the tighter step. */
  dense?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        {reference ? (
          <div
            aria-hidden="true"
            className="absolute inset-y-0 w-px border-s border-dashed border-border-strong"
            style={{ insetInlineStart: `${reference.share * 100}%` }}
          />
        ) : null}
        <dl className={cn("flex flex-col", dense ? "gap-2" : "gap-3")}>
          {rows.map((row) => (
            <div key={row.label} className="flex flex-col gap-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                <dt className="text-sm text-text">
                  {row.label}
                  {row.qualifier ? (
                    <span className="ps-2 text-xs font-regular text-text-muted">
                      {row.qualifier}
                    </span>
                  ) : null}
                </dt>
                <dd
                  className={cn(
                    "text-sm tabular-nums",
                    row.emphasis
                      ? "font-bold text-accent-teal"
                      : "font-semibold text-text",
                  )}
                >
                  {row.figure}
                </dd>
              </div>
              {/* Taller than a hairline and on a visible track: a 6px bar on a
                  near-white track reads as an underline rather than as a
                  quantity, which is what it did before. */}
              <BarTrack share={row.share} emphasis={row.emphasis} />
            </div>
          ))}
        </dl>
      </div>
      <Baseline />
      {reference || axisNote ? (
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          {axisNote ? <AxisNote>{axisNote}</AxisNote> : <span />}
          {reference ? (
            <p className="text-xs text-text-muted">
              <span
                aria-hidden="true"
                className="me-2 inline-block h-px w-4 border-t border-dashed border-border-strong align-middle"
              />
              {reference.label}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/* ==========================================================================
   StackedShare — part to whole

   For the one thing a set of bars genuinely cannot show: that the parts ARE the
   whole. Four bars against a 100% axis say "each of these is some of it"; one
   divided bar says "these four are all of it", which is the actual claim.
   ========================================================================== */

export function StackedShare({
  parts,
  axisNote,
}: {
  parts: ReadonlyArray<{ label: string; figure: string; share: number }>;
  axisNote?: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div
        aria-hidden="true"
        className="flex h-8 w-full overflow-hidden bg-surface-sunken"
      >
        {parts.map((part, index) => (
          <span
            key={part.label}
            className={cn(
              RAMP[depthFor(index, parts.length)],
              // A hairline of ground between segments, so two adjacent depths
              // still read as two segments at small sizes.
              index > 0 ? "border-s border-surface" : "",
            )}
            style={{ width: `${part.share * 100}%` }}
          />
        ))}
      </div>
      {/* Direct labels, not a colour key to cross-reference. The segment order
          and the list order are the same, so the eye maps them by position. */}
      <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
        {parts.map((part, index) => (
          <div
            key={part.label}
            className="flex items-baseline gap-2 border-t border-border-subtle pt-2"
          >
            <Swatch depth={depthFor(index, parts.length)} />
            <dt className="min-w-0 flex-1 text-sm text-text">{part.label}</dt>
            <dd className="text-sm font-semibold text-text tabular-nums">
              {part.figure}
            </dd>
          </div>
        ))}
      </dl>
      {axisNote ? <AxisNote>{axisNote}</AxisNote> : null}
    </div>
  );
}

/* ==========================================================================
   RangeBar — a spread on a real axis

   The previous version drew the band with no axis at all, so a spread of 9,000
   to 11,000 rendered as a short segment floating at the right and read as "a
   value near the maximum". Two ticks fixed that; a labelled axis fixes it
   properly, because the reader can now see that the track starts at zero.
   ========================================================================== */

export function RangeBar({
  low,
  high,
  lowLabel,
  highLabel,
  offset,
  unit,
  axisNote,
}: {
  low: string;
  high: string;
  lowLabel: string | null;
  highLabel: string | null;
  /** Where the band starts on a 0-to-high track. */
  offset: number;
  unit?: string;
  axisNote?: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <p className="flex flex-wrap items-baseline gap-x-3 text-3xl leading-tight font-bold tracking-display text-text tabular-nums md:text-4xl">
        {low}
        <span className="text-base font-medium text-text-muted">to</span>
        {high}
        {unit ? (
          <span className="text-base font-medium text-text-muted">{unit}</span>
        ) : null}
      </p>

      <div className="flex flex-col gap-1.5">
        <div aria-hidden="true" className="relative h-4 w-full">
          <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 bg-surface-sunken" />
          <div
            className="absolute top-1/2 end-0 h-2 -translate-y-1/2 bg-accent-teal"
            style={{ insetInlineStart: `${offset * 100}%` }}
          />
          {/* Both ends ticked to the full height of the track, so the band reads
              as a span between two points rather than as a bar with a gap. */}
          <div
            className="absolute inset-y-0 w-0.5 bg-accent-teal"
            style={{ insetInlineStart: `${offset * 100}%` }}
          />
          <div className="absolute inset-y-0 end-0 w-0.5 bg-accent-teal" />
        </div>
        <Baseline />
      </div>

      {lowLabel !== null || highLabel !== null ? (
        // A pair, deliberately not a <ul>: list semantics inside a card that is
        // itself a list item made "count the cards on this tab" mean something
        // else.
        <div className="grid grid-cols-1 gap-2 text-xs text-text-muted sm:grid-cols-2">
          {lowLabel !== null ? (
            <p>
              <span className="font-semibold text-text tabular-nums">{low}</span>{" "}
              {lowLabel}
            </p>
          ) : (
            <span />
          )}
          {highLabel !== null ? (
            <p className="sm:text-end">
              <span className="font-semibold text-text tabular-nums">{high}</span>{" "}
              {highLabel}
            </p>
          ) : null}
        </div>
      ) : null}

      {axisNote ? <AxisNote>{axisNote}</AxisNote> : null}
    </div>
  );
}

/* ==========================================================================
   NestedBar — a subset inside its total

   Two bars side by side say "854 and 132". One bar inside another says "132 of
   the 854", which is the relationship the metric is actually about — total stock
   answers whether the market is deep, vacant stock answers whether you could
   move in now, and the second is only meaningful against the first.
   ========================================================================== */

export function NestedBar({
  total,
  part,
  axisNote,
}: {
  total: { label: string; figure: string };
  part: { label: string; figure: string; share: number };
  axisNote?: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4">
          <p className="text-sm text-text">{total.label}</p>
          <p className="text-2xl font-bold tracking-display text-text tabular-nums">
            {total.figure}
          </p>
        </div>
        <div
          aria-hidden="true"
          className="flex h-8 w-full items-center border border-border-strong bg-surface-sunken"
        >
          <div
            className="h-full bg-accent-teal"
            style={{ width: `${Math.max(part.share * 100, 1.5)}%` }}
          />
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4">
          <p className="flex items-baseline gap-2 text-sm text-text">
            <Swatch depth={0} />
            {part.label}
          </p>
          <p className="text-sm font-semibold text-accent-teal tabular-nums">
            {part.figure}
          </p>
        </div>
      </div>
      {axisNote ? <AxisNote>{axisNote}</AxisNote> : null}
    </div>
  );
}

/* ==========================================================================
   NestedSteps — three populations, each inside the last

   `NestedBar` above draws a part inside its total, which is two levels. This is
   the same claim at three: the industry, the slice of it that is comparable to the
   visitor, and the companies actually named on the page.

   **It is deliberately NOT a divided bar, and the distinction is the claim rather
   than the style.** `ProportionSplit` and `StackedShare` say "these parts ARE the
   whole" — the segments sum to the total and sit beside one another. These three
   figures do not sum to anything: 5 is inside 314 which is inside 656. Drawn as
   one divided bar the reader would add them, and drawn as a row of independent
   bars they would lose the containment that is the entire point. Stepped tracks on
   one shared axis say "each of these is inside the one above it", which is what is
   true.

   **Colour marks the lead, not a quantity.** Length is the quantity here and every
   figure is in text beside its own track, so the depth step on the innermost row is
   free to mean "the ones named above" instead. That is the same convention
   `ProportionSplit` uses for its `lead` segment, and it is why this chart does not
   walk the ordinal ramp: a ramp would put the smallest, most relevant population in
   the palest step, where it would be a sliver nobody could see.

   **Both fills are LIGHT steps, and that is a contrast constraint rather than a
   preference.** The figures sit on the tracks — which is what keeps three rows to
   the height of three rows — so every fill has to take black ink at AA wherever a
   label happens to overhang it. `teal-200` measures 12.73:1 against black and
   `teal-300` 9.06:1; `teal-500` is 4.09:1 and fails, and `--ansr-accent` is 2.14:1.
   So the accent teal is unavailable here despite being the obvious choice for the
   lead, and `teal-400` is unavailable for the separate reason the palette already
   bans it in a chart on a light ground. Do not "strengthen" either fill without
   re-measuring the ink on it.
   ========================================================================== */

export interface NestedStep {
  label: string;
  /** Already formatted. The track is a second reading of this. */
  figure: string;
  /** 0 to 1 against the outermost population. */
  share: number;
  /** The companies named on the page. At most one step, and it is the last. */
  lead?: boolean;
}

export function NestedSteps({
  steps,
  axisNote,
}: {
  steps: readonly NestedStep[];
  axisNote?: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <dl className="flex flex-col gap-1.5">
        {steps.map((step) => (
          <div key={step.label} className="relative">
            {/* The full extent of the outermost population, drawn on every row, so
                the three tracks share one visible axis rather than each being its
                own private chart. Without it a 0.8% innermost step reads as a mark
                floating at the leading edge of nothing. */}
            <div aria-hidden="true" className="h-9 w-full bg-surface-sunken" />
            <div
              aria-hidden="true"
              className={cn(
                "absolute inset-y-0 start-0",
                step.lead ? "bg-teal-300" : "bg-teal-200",
              )}
              // A floor, so the named handful is a visible step rather than an
              // apparently empty row.
              style={{ width: `${Math.max(step.share * 100, 2)}%` }}
            />
            {/* Ink is black on every row, whatever it overhangs — see the block
                comment. The lead is marked by weight on its LABEL as well as by the
                depth step, so the distinction survives greyscale. */}
            <div className="absolute inset-0 flex items-center gap-2 px-3">
              <dd className="text-base font-bold text-text tabular-nums">
                {step.figure}
              </dd>
              <dt
                className={cn(
                  "min-w-0 truncate text-sm text-text",
                  step.lead ? "font-semibold" : "",
                )}
              >
                {step.label}
              </dt>
            </div>
          </div>
        ))}
      </dl>
      {axisNote ? <AxisNote>{axisNote}</AxisNote> : null}
    </div>
  );
}

/* ==========================================================================
   Containment — three populations as one overlapping z-stack

   The shape ANSR asked for, and it replaces `NestedSteps` on the peer landscape.
   Three bars sharing a leading edge, drawn on top of one another rather than under
   one another: widest and lightest at the back, narrowest and darkest in front.

   **Why it beats the stepped version at saying the same thing.** Stepped tracks put
   a gap between each row, and a gap is the one thing the eye reliably reads as
   separation — so three populations that are inside one another were drawn as three
   rows that are beside one another, and the containment had to be carried by the
   labels. Overlapping bars have no gap to misread: the smaller ones are visibly ON
   the larger, which is the claim.

   It is still not a divided bar, for the reason `NestedSteps` was not: these figures
   do not sum to anything. 314 is inside 656 which is inside 1,834.

   Two rules the component enforces rather than trusts:

     - **Each layer's figure is in text, on or beside its own bar.** Every mark in
       this project carries its figure, and here the label is also what stops three
       nested rectangles being a decoration.
     - **A bar too short to hold its label puts the label OUTSIDE it.** A thin
       industry takes this branch every time — two companies against a national base
       of 1,834 is a 0.1% bar — and the alternative is a figure clipped to nothing.
       Outside, the label lands on the layer behind, which is a light step and takes
       black ink at AA.
   ========================================================================== */

export interface ContainmentLayer {
  label: string;
  /** Already formatted. The bar is a second reading of this. */
  figure: string;
  /** 0 to 1 against the outermost layer. */
  share: number;
}

/**
 * The depth ramp, picked by how many layers there are rather than by position.
 *
 * Two layers take the ends of the ramp and three take all of it, so a two-layer
 * chart — which is what an industry with no sub-industry selected produces — is not
 * drawn as two adjacent steps a reader cannot separate. `teal-100` against
 * `teal-200` is a 1.2:1 difference; against `teal-300` it is worth looking at.
 *
 * Every fill is a LIGHT step because every one of them may end up under a label; see
 * the CSS block for the measurements and for why the accent teal is unavailable
 * here.
 */
const CONTAINMENT_RAMP: Record<number, readonly string[]> = {
  1: ["bg-teal-100"],
  2: ["bg-teal-100", "bg-teal-300"],
  3: ["bg-teal-100", "bg-teal-200", "bg-teal-300"],
};

export function Containment({
  layers,
}: {
  layers: readonly ContainmentLayer[];
}) {
  const count = layers.length;
  const ramp = CONTAINMENT_RAMP[count] ?? CONTAINMENT_RAMP[3]!;
  /**
   * **The bars step DOWN from a shared top edge and all end on the same bottom
   * edge, which is what makes the labels possible.**
   *
   * Concentric was the first attempt: every bar centred on one block axis, each
   * label at its own bar's trailing end. It reads correctly at 1440 and collides at
   * 390 — the outermost bar's right-aligned label and a 10%-wide inner bar's
   * outside label end up in the same 40px of the same line, because both are
   * vertically centred on the same axis. There is no width at which that is
   * reliably safe, since the gap between them is a function of the ratio between two
   * real figures.
   *
   * Stepping the top edge gives every layer an exposed horizontal band of its own,
   * so a label sits inside its own layer's band and can never meet another. The
   * bars still share a leading edge, still overlap along the z axis, and still run
   * widest-and-lightest at the back — the layer beneath is visible above each one,
   * which is what says "inside".
   *
   * The band is `1/n` of the stack, so two layers split it in half and three in
   * thirds. Derived rather than tabulated: a table would have to be extended the
   * first time a fourth population existed.
   */
  const band = 100 / count;

  return (
    <div className="gcc-containment">
      {layers.map((layer, index) => {
        // A floor, so a genuinely tiny population is a visible sliver rather than an
        // apparently missing layer. A thin industry against the national base is
        // 0.1%, and that case is the reason the floor exists.
        const width = Math.max(layer.share * 100, 1.5);
        return (
          /* A real fragment rather than a `display: contents` wrapper. Both flatten
             the box tree, but `contents` leaves the wrapper in the DOM — which puts
             each bar first among ITS OWN siblings, so the `:first-of-type` rule that
             suppresses the outermost layer's shadow would have matched every one of
             them. A fragment emits no node, so the bars really are consecutive
             siblings. */
          <Fragment key={layer.label}>
            <div
              aria-hidden="true"
              className={cn(
                "gcc-containment__bar",
                ramp[Math.min(index, ramp.length - 1)],
              )}
              style={
                {
                  insetBlockStart: `${index * band}%`,
                  blockSize: `${100 - index * band}%`,
                  inlineSize: `${width}%`,
                  "--gcc-layer-index": index,
                } as React.CSSProperties
              }
            />
            {/* The figure and its label, in their own layer above every bar, inside
                their own layer's exposed band and aligned to the shared leading edge.
                A label on a narrow layer overflows onto the lighter fills behind it,
                which is safe: every fill this chart uses takes black ink at AA, and
                no other label is in this band. */}
            <div
              className="gcc-containment__label"
              style={
                {
                  insetBlockStart: `${index * band}%`,
                  blockSize: `${band}%`,
                  "--gcc-layer-index": index,
                } as React.CSSProperties
              }
            >
              <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="text-lg leading-none font-bold text-text tabular-nums md:text-2xl">
                  {layer.figure}
                </span>
                <span className="text-xs font-medium text-text md:text-sm">
                  {layer.label}
                </span>
              </span>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}

/* ==========================================================================
   FigureRow — when a bar would mislead

   For a set of percentages clustered at the top of their own domain. Uptime of
   99.95% against 99.5% on an honest 0-to-100 axis draws two identical bars; on a
   truncated axis it draws a difference that is not there. Neither is worth
   having, so the figures carry it alone.

   This is a rendering decision made from the data in `src/data/screen2.ts`, not
   a per-metric override — see `breakdownDisplay`.
   ========================================================================== */

export function FigureRow({
  parts,
}: {
  parts: ReadonlyArray<{ label: string; figure: string }>;
}) {
  return (
    <dl
      className={cn(
        "grid gap-6",
        parts.length > 2 ? "sm:grid-cols-3" : "sm:grid-cols-2",
      )}
    >
      {parts.map((part) => (
        <div
          key={part.label}
          className="flex flex-col gap-1 border-t-2 border-accent-teal pt-3"
        >
          <dd className="text-3xl leading-tight font-bold tracking-display text-text tabular-nums">
            {part.figure}
          </dd>
          <dt className="text-sm text-text-muted">{part.label}</dt>
        </div>
      ))}
    </dl>
  );
}

/* ==========================================================================
   IndexLollipop — an index against its own baseline

   The chart this file exists for. The previous rendering scaled each row to its
   own maximum, so "India = 100" drew the SHORTEST bar in a row where the United
   States drew a full one — and a reader scanning a cost table reads the long bar
   as the winner. The number was right and the picture said the opposite.

   Three things fix it. The axis is shared across every row, so the rows are
   comparable rather than each being its own private chart. The baseline is drawn
   as a rule at 100 and labelled. And the anchor column is the only one in
   accent, so the eye finds it first and reads outward from it.
   ========================================================================== */

export interface LollipopRow {
  label: string;
  cells: ReadonlyArray<{
    column: string;
    figure: string;
    /** 0 to 1 against the axis shared by the whole chart. */
    share: number;
    /** The baseline column. Exactly one per row. */
    anchor: boolean;
  }>;
}

export function IndexLollipop({
  rows,
  baselineShare,
  baselineLabel,
  axisNote,
}: {
  rows: readonly LollipopRow[];
  /** Where the index base sits on the shared axis. */
  baselineShare: number;
  baselineLabel: string;
  axisNote?: string;
}) {
  return (
    <div className="flex flex-col gap-5">
      {rows.map((row) => (
        <div key={row.label} className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-text">{row.label}</p>

          {/* The figures, in text, in column order. This is the reading; the
              plot below is the second one. */}
          <dl className="flex flex-wrap gap-x-6 gap-y-1">
            {row.cells.map((cell) => (
              <div key={cell.column} className="flex items-baseline gap-1.5">
                <dt className="text-xs text-text-muted">{cell.column}</dt>
                <dd
                  className={cn(
                    "text-sm tabular-nums",
                    cell.anchor
                      ? "font-bold text-accent-teal"
                      : "font-semibold text-text",
                  )}
                >
                  {cell.figure}
                </dd>
              </div>
            ))}
          </dl>

          <div aria-hidden="true" className="relative h-6 w-full">
            <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border-subtle" />
            {/* Zero, so the axis is visibly not truncated. */}
            <div className="absolute inset-y-1 start-0 w-px bg-border-strong" />
            {/* The index base, as a rule through every row. This is what makes the
                anchor column readable as a reference rather than as just another
                dot that happens to be filled. */}
            <div
              className="absolute inset-y-0 w-px bg-border-strong"
              style={{ insetInlineStart: `${baselineShare * 100}%` }}
            />
            {row.cells.map((cell) => (
              <span
                key={cell.column}
                className={cn(
                  "absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full",
                  // Fill against outline, so the anchor survives greyscale.
                  cell.anchor
                    ? "bg-accent-teal"
                    : "border-2 border-teal-400 bg-surface",
                )}
                style={{ insetInlineStart: `${cell.share * 100}%` }}
              />
            ))}
          </div>
        </div>
      ))}

      <div className="flex flex-col gap-2 border-t border-border-strong pt-3">
        <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-xs text-text-muted">
          <span className="inline-flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-block size-3 rounded-full bg-accent-teal"
            />
            {baselineLabel}
          </span>
          <span className="inline-flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-block size-3 rounded-full border-2 border-teal-400 bg-surface"
            />
            Comparator
          </span>
        </p>
        {axisNote ? <AxisNote>{axisNote}</AxisNote> : null}
      </div>
    </div>
  );
}

/* ==========================================================================
   DumbbellRow — two positions and the gap between them

   For a two-column index, where the answer is neither figure but the distance.
   Two bars make a reader subtract; a connector with the difference on it does
   the subtraction where the eye already is.
   ========================================================================== */

export interface DumbbellData {
  label: string;
  from: { column: string; figure: string; share: number };
  to: { column: string; figure: string; share: number };
  /** Formatted by the view model, so no arithmetic happens here. */
  delta: string;
}

export function Dumbbells({
  rows,
  axisNote,
}: {
  rows: readonly DumbbellData[];
  axisNote?: string;
}) {
  const [first] = rows;

  return (
    <div className="flex flex-col gap-5">
      {rows.map((row) => {
        const start = Math.min(row.from.share, row.to.share);
        const end = Math.max(row.from.share, row.to.share);
        return (
          <div key={row.label} className="flex flex-col gap-2">
            {/* The delta sits beside the label rather than at the far edge of the
                row, because it is the ANSWER. Pushed right by a `justify-between`
                it ended up above the plot's right end and read as a label for
                whatever mark happened to be under it. */}
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p className="text-sm font-semibold text-text">{row.label}</p>
              <p className="text-base font-bold text-accent-teal tabular-nums">
                {row.delta}
              </p>
            </div>

            {/* Then the two ends, then the plot. Figures before the mark, so the
                mark is read as a restatement of them rather than the other way
                round. */}
            <dl className="flex flex-wrap gap-x-6 gap-y-1">
              <div className="flex items-baseline gap-1.5">
                <dt className="text-xs text-text-muted">{row.from.column}</dt>
                <dd className="text-sm font-semibold text-text tabular-nums">
                  {row.from.figure}
                </dd>
              </div>
              <div className="flex items-baseline gap-1.5">
                <dt className="text-xs text-text-muted">{row.to.column}</dt>
                <dd className="text-sm font-bold text-accent-teal tabular-nums">
                  {row.to.figure}
                </dd>
              </div>
            </dl>

            <div aria-hidden="true" className="relative h-4 w-full">
              <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border-subtle" />
              {/* The zero end, drawn.

                  Both marks on a cost index sit near the top of the scale, so
                  without an anchor at the left the pair reads as a spread floating
                  in the middle of nowhere. A visible zero is what tells the reader
                  the axis is not truncated — which matters more here than anywhere
                  else on the screen, because a truncated axis is exactly how you
                  would fake this chart. */}
              <div className="absolute inset-y-0 start-0 w-px bg-border-strong" />
              <div
                className="absolute top-1/2 h-1 -translate-y-1/2 bg-teal-200"
                style={{
                  insetInlineStart: `${start * 100}%`,
                  inlineSize: `${Math.max(end - start, 0) * 100}%`,
                }}
              />
              <span
                className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-teal-400 bg-surface"
                style={{ insetInlineStart: `${row.from.share * 100}%` }}
              />
              <span
                className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-teal"
                style={{ insetInlineStart: `${row.to.share * 100}%` }}
              />
            </div>
          </div>
        );
      })}

      {first ? (
        <div className="flex flex-col gap-2 border-t border-border-strong pt-3">
          <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-xs text-text-muted">
            <span className="inline-flex items-center gap-2">
              <span
                aria-hidden="true"
                className="inline-block size-3 rounded-full border-2 border-teal-400 bg-surface"
              />
              {first.from.column}
            </span>
            <span className="inline-flex items-center gap-2">
              <span
                aria-hidden="true"
                className="inline-block size-3 rounded-full bg-accent-teal"
              />
              {first.to.column}
            </span>
          </p>
          {axisNote ? <AxisNote>{axisNote}</AxisNote> : null}
        </div>
      ) : null}
    </div>
  );
}

/* ==========================================================================
   OrdinalGrid — a rated comparison

   An ordinal has no distance, so it gets no bar and no axis. What it gets is a
   filled step count against the metric's own declared scale, at a size that can
   actually be counted — the previous 6px blocks could not be.

   Kept as a real table with `scope` on both axes, because a row and a column
   header is exactly what this is and a screen-reader user should hear "Data and
   AI, Poland, Strong" rather than a bare word.
   ========================================================================== */

export function OrdinalGrid({
  columns,
  steps,
  rows,
  labelledBy,
  anchorColumn,
  keyLabel,
}: {
  columns: readonly string[];
  /** Weakest first. Drawn as the key. */
  steps: readonly string[];
  rows: ReadonlyArray<{
    label: string;
    cells: ReadonlyArray<{ rating: string; step: number }>;
  }>;
  labelledBy: string;
  /** The column the visitor is deciding about. Emphasised, never re-ordered. */
  anchorColumn?: string;
  keyLabel: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div
        className="min-w-0 overflow-x-auto"
        // Focusable and named: an unfocusable scroller is unreachable without a
        // pointer, and this grid is wider than a phone.
        tabIndex={0}
        role="group"
        aria-labelledby={labelledBy}
      >
        <table className="w-full min-w-md border-collapse text-sm">
          <thead>
            <tr>
              <th scope="col" className="pb-2 text-start">
                <span className="sr-only">Capability</span>
              </th>
              {columns.map((column) => (
                <th
                  key={column}
                  scope="col"
                  className={cn(
                    "pb-2 ps-4 text-start text-xs font-semibold tracking-caps uppercase",
                    column === anchorColumn
                      ? "text-accent-teal"
                      : "text-text-muted",
                  )}
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-t border-border-subtle">
                <th
                  scope="row"
                  className="py-3 pe-4 text-start align-top text-sm font-medium text-text"
                >
                  {row.label}
                </th>
                {row.cells.map((cell, index) => {
                  const anchored = columns[index] === anchorColumn;
                  return (
                    <td key={columns[index]} className="py-3 ps-4 align-top">
                      <div className="flex flex-col gap-2">
                        <span
                          className={cn(
                            "text-sm",
                            anchored
                              ? "font-bold text-accent-teal"
                              : "font-medium text-text",
                          )}
                        >
                          {cell.rating}
                        </span>
                        {/* The label above is the whole reading. These are a
                            second, positional one — countable now. */}
                        <span aria-hidden="true" className="flex gap-1">
                          {steps.map((step, stepIndex) => (
                            <span
                              key={step}
                              className={cn(
                                "h-2 w-4",
                                stepIndex < cell.step
                                  ? anchored
                                    ? "bg-accent-teal"
                                    : "bg-teal-400"
                                  : "bg-surface-sunken",
                              )}
                            />
                          ))}
                        </span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <AxisNote>
        {keyLabel}: {steps.join(" · ")}
      </AxisNote>
    </div>
  );
}

/* ==========================================================================
   NumberGridChart — a numeric grid with no index base

   The fallback for a matrix that is neither an index nor a rating. Each cell is
   read against its own ROW, because the rows measure different things and a
   shared axis across them would compare a latency with a headcount.
   ========================================================================== */

export function NumberGridChart({
  columns,
  rows,
  labelledBy,
}: {
  columns: readonly string[];
  rows: ReadonlyArray<{
    label: string;
    cells: ReadonlyArray<{ figure: string; share: number }>;
  }>;
  labelledBy: string;
}) {
  return (
    <div
      className="min-w-0 overflow-x-auto"
      tabIndex={0}
      role="group"
      aria-labelledby={labelledBy}
    >
      <table className="w-full min-w-md border-collapse text-sm">
        <thead>
          <tr>
            <th scope="col" className="pb-2 text-start">
              <span className="sr-only">Measure</span>
            </th>
            {columns.map((column) => (
              <th
                key={column}
                scope="col"
                className="pb-2 ps-4 text-start text-xs font-semibold tracking-caps text-text-muted uppercase"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-t border-border-subtle">
              <th
                scope="row"
                className="py-3 pe-4 text-start align-top text-sm font-medium text-text"
              >
                {row.label}
              </th>
              {row.cells.map((cell, index) => (
                <td key={columns[index]} className="py-3 ps-4 align-top">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-sm font-semibold text-text tabular-nums">
                      {cell.figure}
                    </span>
                    <span
                      aria-hidden="true"
                      className="block h-2 w-full bg-surface-sunken"
                    >
                      <span
                        className="block h-full bg-teal-400"
                        style={{ width: `${Math.max(cell.share * 100, 1.5)}%` }}
                      />
                    </span>
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ==========================================================================
   FractionBar — "N of M"

   Screen 1's Fortune Global 500 count. "181" is a number; "181 of the Fortune
   Global 500" is a claim about a proportion, and the proportion is the evidence.
   So the figure leads and the bar shows what fraction of the list it is.
   ========================================================================== */

export function FractionBar({
  value,
  ofLabel,
  share,
  shareLabel,
  label,
  ground = "surface",
}: {
  value: string;
  ofLabel: string;
  share: number;
  /**
   * The bar's own figure, in text.
   *
   * **This was missing, and its absence was a quiet breach of this file's governing
   * rule**: every mark carries its figure in text beside it. The fraction's
   * numerator and denominator were both on the page and the PROPORTION — the thing
   * the bar draws — was nowhere, so the one mark here was the only one in the
   * project a reader could not read. It also turned out to be the most useful
   * number in the band: "181 of the Fortune Global 500" is a count, "36% of the
   * list" is the claim.
   */
  shareLabel?: string;
  label: string;
  /**
   * The one mark in this file that renders on the inverse ground, because Screen
   * 1's national-scale band is a figure band and these figures ARE that band.
   *
   * It is a parameter rather than a second component, and it is the only one:
   * every other mark here stays on a light ground, and where a chart has to appear
   * on a dark band it goes inside a light card instead. Ten ground-aware marks
   * would be ten chances for a track and its fill to end up the same value.
   */
  ground?: "surface" | "inverse";
}) {
  const inverse = ground === "inverse";
  return (
    <div className="flex flex-col gap-3">
      <p
        className={cn(
          "flex flex-wrap items-baseline gap-x-2 leading-tight font-bold tracking-display tabular-nums",
          "text-5xl md:text-6xl",
          inverse ? "text-text-inverse" : "text-text",
        )}
      >
        {value}
        <span
          className={cn(
            "text-base font-medium",
            inverse ? "text-text-inverse-muted" : "text-text-muted",
          )}
        >
          {ofLabel}
        </span>
      </p>
      {/* Full width, not `max-w-xs`. Capped, the track stopped short of its own
          column and read as a bar that had failed to finish rather than as an axis
          the fill is a fraction of. */}
      <div
        aria-hidden="true"
        className={cn(
          "h-2 w-full",
          // On the inverse ground the empty part of the track has to be lighter
          // than the band and darker than the fill, or the bar reads as full.
          inverse ? "bg-surface-inverse-soft" : "bg-surface-sunken",
        )}
      >
        <div
          className={cn("h-full", inverse ? "bg-teal-300" : "bg-accent-teal")}
          style={{ width: `${Math.max(share * 100, 1.5)}%` }}
        />
      </div>
      {/* A rule over the label, which is `Stat`'s shape. The two components stand
          side by side in Screen 1's scale band, and without it the one figure with
          no denominator to draw looked like a different kind of object rather than
          the same object without a bar. */}
      <div
        className={cn(
          "border-t pt-3",
          inverse ? "border-border-inverse" : "border-border-strong",
        )}
      >
        <p
          className={cn(
            "text-base font-medium",
            inverse ? "text-text-inverse" : "text-text",
          )}
        >
          {label}
        </p>
        {shareLabel ? (
          <p
            className={cn(
              "mt-1 text-xs tabular-nums",
              inverse ? "text-text-inverse-muted" : "text-text-muted",
            )}
          >
            {shareLabel}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/* ==========================================================================
   ProportionSplit — the peer set inside its industry

   Screen 1's industry count, and the block that has to carry a thin peer set.
   Five named companies is a small number until it is drawn as the leading slice
   of a much larger one — at which point the reader can see that the five are a
   selection rather than the supply.
   ========================================================================== */

export function ProportionSplit({
  total,
  totalLabel,
  segments,
}: {
  total: string;
  totalLabel: string;
  segments: ReadonlyArray<{
    label: string;
    figure: string;
    share: number;
    /** The named peers. Drawn deepest, and first. */
    lead?: boolean;
  }>;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-baseline gap-x-4">
        <p className="text-5xl leading-tight font-bold tracking-display text-accent-teal tabular-nums md:text-6xl">
          {total}
        </p>
        <p className="max-w-measure text-base font-medium text-text">
          {totalLabel}
        </p>
      </div>

      <div
        aria-hidden="true"
        className="flex h-10 w-full overflow-hidden border border-border-strong bg-surface-sunken"
      >
        {segments.map((segment, index) => (
          <span
            key={segment.label}
            className={cn(
              segment.lead ? "bg-accent-teal" : RAMP[depthFor(index, 3)],
              index > 0 ? "border-s border-surface" : "",
            )}
            style={{ width: `${segment.share * 100}%` }}
          />
        ))}
      </div>

      <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-3">
        {segments.map((segment, index) => (
          <div
            key={segment.label}
            className={cn(
              "flex flex-col gap-1 border-t-2 pt-2",
              segment.lead ? "border-accent-teal" : "border-border-strong",
            )}
          >
            <div className="flex items-baseline gap-2">
              <Swatch depth={segment.lead ? 0 : depthFor(index, 3)} />
              <dd className="text-2xl font-bold tracking-display text-text tabular-nums">
                {segment.figure}
              </dd>
            </div>
            <dt className="text-sm text-text-muted">{segment.label}</dt>
          </div>
        ))}
      </dl>
    </div>
  );
}
