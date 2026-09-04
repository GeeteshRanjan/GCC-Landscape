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
/**
 * What KIND of row a bar belongs to, where a set holds more than one kind.
 *
 * **Three values, and the two that are not `subject` exist for exactly one chart** —
 * the HR tab's salary-pressure ranking, where four of the five rows are specialisms
 * and the fifth is the all-roles comparator they are read against. Ordinal depth
 * cannot say that: the ramp means "more" and this is a difference in kind, not in
 * quantity.
 *
 *   - `subject` — the default, and every row on every other chart in this file.
 *   - `reference` — the comparator the rest of the set is read against. Takes
 *     `--ansr-action`, which is 3.35:1 on white and clears the 3:1 floor WCAG 1.4.11
 *     asks of a non-text graphic. This is the one place a bar is warm, and it is
 *     licensed by the row also carrying the word in its LABEL — see the entry name on
 *     `hr-salary-growth`. A colour that is the only carrier of a distinction is not
 *     available in this palette and is not being used as one here.
 *   - `muted` — a row deliberately held back from the comparison. `--ansr-grey-500` at
 *     3.28:1 on white, which is the only light neutral in the palette that clears the
 *     floor. **Not `--ansr-teal-300`**, which is the blue-grey the composition asks for
 *     and measures about 2.3:1 on white — under the floor, on a mark, which is not
 *     available whatever it looks like.
 */
export type BarTone = "subject" | "reference" | "muted";

/**
 * The fill each tone takes on a BARE track, where the bar sits on the card's white.
 *
 * **`subject` is `teal-500` here, matching the tracked fill, and it was the brand teal
 * until ANSR asked for one bar colour across the screen.** The argument for the deeper
 * step was that a bare bar loses the grey track it was measured against, so it should
 * gain weight to keep reading as a mark rather than as a tint. What that produced in
 * practice was two teals doing one job on one tab: the HR tab's graduate output keeps its
 * track and draws `teal-500`, its salary ranking is self-labelling and drew the brand
 * teal, and the two cards sat one section apart looking like two kinds of chart.
 *
 * `teal-500` is 5.14:1 on white against 4.51:1 on the track, so the mark is if anything
 * stronger without the track than with it — the original worry does not survive the
 * measurement. What the brand teal is now reserved for is `EMPHASIS_FILL`, which is the
 * one place a bar is meant to be deeper than its neighbours.
 */
const BARE_FILL: Record<BarTone, string> = {
  subject: "bg-teal-500",
  reference: "bg-action",
  muted: "bg-grey-500",
};

/**
 * The fill an EMPHASISED row takes — the one row in a set that is the visitor's own
 * position, or the leader.
 *
 * It is a separate map now rather than a reuse of `BARE_FILL`, and it had to become one:
 * with `BARE_FILL.subject` stepped back to `teal-500` to match the tracked fill, sharing
 * the map would have drawn an emphasised row in exactly the fill its neighbours already
 * take, which is an emphasis that emphasises nothing.
 *
 * Only `subject` differs. A `reference` or `muted` row is already a different KIND of
 * thing from the rows around it, so there is nothing for a depth step to add.
 */
const EMPHASIS_FILL: Record<BarTone, string> = {
  subject: "bg-accent-teal",
  reference: "bg-action",
  muted: "bg-grey-500",
};

/** The fill each tone takes on the grey track. Measured against `--ansr-grey-100`. */
const TRACKED_FILL: Record<BarTone, string> = {
  subject: "bg-teal-500",
  // 2.61:1 on the grey track against 3.35:1 on white, so a warm row is only offered
  // where the track is gone. Kept in the map rather than refused, because the caller
  // that would reach it is the one chart that is always bare — and a silently wrong
  // colour is worse than a documented one.
  reference: "bg-action",
  muted: "bg-grey-500",
};

export function BarTrack({
  share,
  emphasis = false,
  bare = false,
  tone = "subject",
}: {
  share: number;
  emphasis?: boolean;
  /**
   * Which kind of row this is. See `BarTone`.
   *
   * Separate from `emphasis`, which is about WHICH row matters most in a set of one
   * kind — the visitor's own position, or the leader. A tone is about a row being a
   * different kind of thing from its neighbours, and the two never co-occur.
   */
  tone?: BarTone;
  /**
   * No track behind the bar, and the bar in the deeper teal.
   *
   * **For a ranking that states its own axis, and only for one.** The grey track is
   * what tells a reader where full width is, so dropping it is only safe where
   * something else does — in a set sorted by the quantity its bars encode, the first
   * row IS full width and carries its figure, which is the self-labelling exemption
   * `project.md` grants. On an unsorted set, or a grid of bars, the track stays.
   *
   * **The fill does NOT go a step darker any more.** It did, on the argument that a bar
   * losing its track should gain weight to keep reading as a mark — and the measurement
   * does not support it: `teal-500` is 4.51:1 on the track and 5.14:1 on the card's own
   * white, so the bare bar is the stronger of the two before anything is changed. What
   * the deeper step actually bought was two teals doing one job on one tab. See
   * `BARE_FILL`.
   */
  bare?: boolean;
}) {
  return (
    // Hidden: the figure it restates is always in text beside it.
    <div
      aria-hidden="true"
      className={cn("w-full", bare ? "h-1.5" : "h-2 bg-surface-sunken")}
    >
      <div
        /**
         * **`teal-500`, where this was `teal-400`, and the old value was illegal
         * against its own track.** `--ansr-teal-400` is `--ansr-teal-bright`, which
         * `design-stack.md` states outright is not available inside a chart on a light
         * ground: it measures 2.44:1 on white and **2.15:1 on this track's own
         * `--ansr-grey-100`** — well under the 3:1 floor WCAG 1.4.11 asks of a non-text
         * graphic, on the default fill of every bar on both public screens.
         *
         * `teal-500` is 4.51:1 against the same track and 5.14:1 on white, and it is
         * still a clear step lighter than the `accent` the emphasis branch takes, so
         * the ordinal relationship the ramp depends on is unchanged.
         */
        className={cn(
          "h-full",
          // The tone decides the hue; `emphasis` and `bare` decide the depth within
          // the default tone. A toned row is already a different kind of thing, so it
          // takes its own fill on every track rather than a darker step of the teal.
          //
          // **Emphasis is tested FIRST, and the order matters now that a bare subject
          // bar is `teal-500`.** The two used to share one map, so which branch ran was
          // immaterial; with `BARE_FILL.subject` matching the tracked fill, an
          // emphasised row on a bare chart would otherwise draw in the same teal as the
          // rows it is meant to stand out from.
          emphasis
            ? EMPHASIS_FILL[tone]
            : bare
              ? BARE_FILL[tone]
              : TRACKED_FILL[tone],
        )}
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
  /**
   * A row that is a different KIND of thing from its neighbours. See `BarTone`.
   *
   * Defaults to `subject`, so every existing chart is unchanged. The figure's ink
   * follows it: a `reference` row's figure takes `--ansr-accent-warm`, which is the
   * only orange legal at 14px (6.53:1 on white against `--ansr-action`'s 3.35:1), so
   * the row's colour is consistent between its bar and its number without either
   * being illegal at its own size.
   */
  tone?: BarTone;
}

export function RankedBars({
  rows,
  axisNote,
  quantityHeader,
  reference,
  dense = false,
  inline = false,
  bareTrack = false,
}: {
  rows: readonly BarRow[];
  /** What full width is. Omitted only when the section states it already. */
  axisNote?: string;
  /**
   * What the figure column COUNTS, named once above it rather than under the chart.
   *
   * **This is Screen 1's device, and it is what a unit should have been doing here all
   * along.** The peer view's largest-centres ranking names its quantity in one small-caps
   * column header over the figures ("GCC headcount"); this chart put the same information
   * in an `axisNote` at the FOOT of the card, where a reader meets it after the seven
   * figures it was supposed to be qualifying — so the numerals were unlabelled at the
   * moment they were read, and the word sat in the position a caveat sits in.
   *
   * Aligned to the trailing edge, over the figure column it names, and only offered on
   * the `inline` layout because that is the layout with a figure column to head. A caller
   * passes this OR `axisNote`, never both: they are the same string in two positions.
   */
  quantityHeader?: string;
  /**
   * A comparator drawn across the whole chart — the average a set of growth
   * rates is spread around, say. This is the thing that turns a list of numbers
   * into a reading of which ones are unusual.
   */
  reference?: { share: number; label: string };
  /** Nine rows in a half-width card need the tighter step. */
  dense?: boolean;
  /**
   * Label, bar and figure on ONE line, with no track behind the bar.
   *
   * **The compact reading of a ranking, and it is a third of the height.** The
   * default row is two lines — label and figure on the first, a full-width bar on the
   * second — which is right for Screen 1's largest-centres block, where the bar is
   * the block's whole argument and runs the measure of the card. A seven-row list of
   * specialisms is a different job: the reader is scanning a ranked column, and a
   * two-line row put 24px of bar between every pair of names and made the set as tall
   * as the card beside it.
   *
   * On one line the bar becomes the middle column, so it is read between the name and
   * the figure rather than under both, and the track goes with it — see `bare` on
   * `BarTrack` for why that is only safe on a set sorted by its own quantity.
   *
   * It wraps rather than shrinks: below `sm` the bar drops to its own full-width line
   * and the row is the two-line default again, which is the layout that already works
   * at 390.
   */
  inline?: boolean;
  /**
   * Drop the grey track behind the bars.
   *
   * Separate from `inline` because they answer different questions: `inline` is how
   * much vertical room a row takes, and this is whether the chart still tells the
   * reader where full width is. Only a set ranked by the quantity its own bars encode
   * does — see `selfLabelling` in `screen2.ts`, which is where that is decided.
   */
  bareTrack?: boolean;
}) {
  /**
   * **One figure track for the whole chart, and without it the bars did not share an
   * axis.** An inline row is its own grid, so a `max-content` figure column was sized by
   * THAT row's own figure — which made the bar column a different width in every row. On
   * the latency breakdown ("8", "40", "110", "180") the four tracks ended 16px apart, so
   * four bars measured against four different full widths, which is the one thing a shared
   * axis is for. The figures still right-aligned, so it read as bars stopping short at
   * random.
   *
   * The width is the longest figure in `ch`, which is exact rather than approximate:
   * every figure is set in `tabular-nums`, so a digit is exactly 1ch, and the non-digit
   * characters a figure can carry (`.`, `%`, `M`, `K`, `+`) are all narrower than one —
   * so a character count in `ch` is an over-estimate by construction and cannot clip.
   * The surplus lands to the LEFT of a right-aligned figure, where it is gap.
   *
   * A layout measure taken from the strings, not arithmetic on the data: nothing here
   * reads a value, and the figures were formatted by the view model.
   */
  const figureChars = rows.reduce(
    (longest, row) => Math.max(longest, row.figure.length),
    1,
  );

  return (
    <div
      className="flex flex-col gap-3"
      style={{ "--gcc-figure-track": `${figureChars}ch` } as React.CSSProperties}
    >
      {/* The figure column's own header, at the trailing edge above the numerals it
          names. `justify-end` rather than a grid matching the rows: the rows' figure
          column is `max-content`, so a header laid out in the same grid would be as wide
          as the longest figure and would centre over it rather than sit at the edge the
          figures are aligned to. Small caps and muted, which is the register Screen 1's
          own column header uses — it is chrome naming a quantity, not evidence. */}
      {quantityHeader && inline ? (
        <p className="flex justify-end text-xs font-semibold tracking-caps text-text-muted uppercase">
          {quantityHeader}
        </p>
      ) : null}
      <div className="relative">
        {reference ? (
          <div
            aria-hidden="true"
            className="absolute inset-y-0 w-px border-s border-dashed border-border-strong"
            style={{ insetInlineStart: `${reference.share * 100}%` }}
          />
        ) : null}
        <dl
          className={cn(
            "flex flex-col",
            /**
             * **An inline row needs a bigger gap BETWEEN rows below `sm`, and it is a
             * disambiguation rather than breathing room.** Under `sm` the bar drops to
             * its own line 8px under its label — so at a 10px row gap the bar sat 8px
             * from the name above it and 10px from the name below it, and which row it
             * belonged to was a two-pixel judgement. From `sm` the bar is back in its
             * own column and the row gap can be tight again.
             */
            inline
              ? dense
                ? "gap-5 sm:gap-2.5"
                : "gap-6 sm:gap-3"
              : dense
                ? "gap-2"
                : "gap-3",
          )}
        >
          {rows.map((row) =>
            inline ? (
              <div
                key={row.label}
                /**
                 * **A grid rather than `flex-wrap`, because the wrap point has to be a
                 * decision and not a consequence.** Flex-wrapped, the row broke wherever
                 * the three items stopped fitting, which at 768 put the figure on its own
                 * line under the label with the bar left floating beside them — a
                 * layout nobody chose, arrived at by arithmetic between a `basis-40`
                 * label and a percentage bar column. Two explicit shapes instead: name
                 * and figure with the bar beneath, and from `sm` all three in one row.
                 *
                 * `gap-y-2` rather than 4px: where the bar sits under the label, a 6px
                 * teal bar with no track behind it reads at 4px as an underline of the
                 * text above rather than as a quantity.
                 */
                /* The figure track is the chart's, not the row's — see
                   `--gcc-figure-track` above. `max-content` here is what let every row
                   size its own bar column differently. */
                className={cn(
                  "grid items-center gap-x-4 gap-y-2",
                  "grid-cols-[minmax(0,1fr)_var(--gcc-figure-track)]",
                  "sm:grid-cols-[minmax(0,1fr)_30%_var(--gcc-figure-track)]",
                )}
              >
                <dt
                  className={cn(
                    "order-1 min-w-0 text-sm",
                    // The comparator names itself in the label as well as in the
                    // colour, so the ink follows the bar. `accent-warm` rather than
                    // `action`, which is illegal at this size — see `BarRow.tone`.
                    row.tone === "reference"
                      ? "font-semibold text-accent-warm"
                      : "text-text",
                  )}
                >
                  {row.label}
                  {row.qualifier ? (
                    <span className="ps-2 text-xs font-regular text-text-muted">
                      {row.qualifier}
                    </span>
                  ) : null}
                </dt>
                {/* Third in the flow below `sm`, spanning both columns on its own line;
                    the middle column from `sm`, where it is read between the name and
                    the figure rather than under both. */}
                <div className="order-3 col-span-2 sm:order-2 sm:col-span-1">
                  <BarTrack
                    share={row.share}
                    emphasis={row.emphasis}
                    bare={bareTrack}
                    tone={row.tone}
                  />
                </div>
                <dd
                  className={cn(
                    "order-2 text-sm tabular-nums sm:order-3 sm:text-end",
                    row.tone === "reference"
                      ? "font-bold text-accent-warm"
                      : row.emphasis
                        ? "font-bold text-accent-teal"
                        : "font-semibold text-text",
                  )}
                >
                  {row.figure}
                </dd>
              </div>
            ) : (
              <div key={row.label} className="flex flex-col gap-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                  <dt
                    className={cn(
                      "text-sm",
                      row.tone === "reference"
                        ? "font-semibold text-accent-warm"
                        : "text-text",
                    )}
                  >
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
                      row.tone === "reference"
                        ? "font-bold text-accent-warm"
                        : row.emphasis
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
                <BarTrack
                  share={row.share}
                  emphasis={row.emphasis}
                  tone={row.tone}
                />
              </div>
            ),
          )}
        </dl>
      </div>
      {/* An inline row's bar is the middle column, so a rule under the list would sit
          under the labels and the figures too and would not be an axis for anything.
          The set states its own axis in row one instead. */}
      {inline ? null : <Baseline />}
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
        /* **The figure prefix is gone and the labels are whole clauses now.** Each
           read "7 on an employer of record" — the endpoint value, then a fragment
           that only made sense after it. The display value above states both ends
           already, so the prefix was the third appearance of the same number on one
           card, and the fragment could not be reused by the HR tab's benchmark
           drawing, where the figures sit on the rail itself. See `FIRST_HIRE_EOR` in
           the catalogue: the labels carry their own verb now. */
        <div className="grid grid-cols-1 gap-2 text-xs text-text-muted sm:grid-cols-2">
          {lowLabel !== null ? <p>{lowLabel}</p> : <span />}
          {highLabel !== null ? (
            <p className="sm:text-end">{highLabel}</p>
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
   AdjacentBlocks — two populations, sized against each other, and nothing else

   The counterpart to `NestedBar`, and the reason both exist is that they make
   different claims about the same two numbers. One bar inside another says "132 of
   the 854". Two blocks side by side say "1.5M, and separately 450K" — their sizes are
   comparable and their memberships are not.

   **The distinction is load-bearing rather than stylistic, and the graduate pair is
   why.** 450K is total management and MBA output; it is not the number of MBA
   graduates who hold an engineering degree, and the source does not contain that
   number. Nesting the smaller block would assert an overlap nobody has measured, in
   front of a reader who is deciding whether to trust the rest of the page. So
   containment is authored on the metric — see `subset` in `schema.ts` — and this is
   what a two-part breakdown draws without it.

   Three things it does, each closing off a way of implying the overlap anyway:

     - **Areas are proportional to the figures, and the blocks are equal height**, so
       the widths carry the ratio. Both are `span` from the view model, which is a
       share of the SET rather than of the larger part.
     - **A gap between them, and two different fills.** Touching blocks in one colour
       read as one divided bar, which is a part-to-whole claim.
     - **No connector, no bracket, no percentage.** There is nothing to state about how
       the two relate, so nothing is drawn between them.

   Labels sit BELOW their blocks rather than inside. Inside is better where it fits and
   it does not fit here at every width: at 390 the narrower block is about 80px, and a
   four-word label inside it wraps to six lines and sets the height of the whole
   chart. Below, each label owns its block's full width, takes a rule in its block's
   own colour as the connector, and reads the same at 390 as at 1440.
   ========================================================================== */

export function AdjacentBlocks({
  blocks,
  unit,
}: {
  blocks: ReadonlyArray<{
    label: string;
    figure: string;
    /** 0 to 1 of the set's total. Widths, so equal heights give proportional areas. */
    span: number;
  }>;
  /** What the figures count. Rendered above the blocks, under the card's heading. */
  unit?: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* Above the blocks, so it reads as the heading's supporting line rather than as
          an axis note for a chart that has no axis. */}
      {unit ? <AxisNote>{unit}</AxisNote> : null}
      {/* Not a `dl`: a figure sits inside its block and its label below it, so the two
          belong to one column, and a `dd` preceding its own `dt` is not a description
          list. The same call `RangeBar` makes about its own pair. */}
      <div className="flex w-full items-stretch gap-1">
        {blocks.map((block, index) => (
          <div
            key={block.label}
            className="flex min-w-0 flex-col gap-2"
            // The proportional width, and the one inline style on this surface that is
            // genuinely data: a Tailwind class cannot express a fraction derived from
            // two figures. `flex-basis` rather than `width` so the gap is taken out of
            // the row rather than out of the proportions.
            style={{ flexBasis: `${block.span * 100}%` }}
          >
            <p
              // A stable hook for the spec that measures these two boxes against each
              // other. Not a style: `.gcc-adjacent-block` has no rule behind it, and the
              // alternative was a spec locating a proportional block by `tabular-nums`,
              // which the axis note above it also carries.
              className={cn(
                "gcc-adjacent-block",
                // One height for both, which is what makes width the only encoding.
                // Shallow enough that a block is a band rather than a slab: at 144px
                // the larger block was 400×144 of flat teal holding four characters,
                // which spends more ink than the claim is worth.
                "flex h-24 items-end px-2 py-3 md:h-28 md:px-4",
                /**
                 * **Three steps rather than two, and the narrow block sets all of them.**
                 * At 390 the card's content is about 278px, so a block at 23% of the set
                 * is 64px — and "450K" at 30px is 78px of glyph before any padding, so
                 * the figure broke out of its own block and sat on the zone beside it.
                 * The type steps down with the viewport until it fits the NARROWEST
                 * block the proportions can produce, because that is the one that fails
                 * first; the wide block is never the constraint.
                 *
                 * Shrinking the block instead was the alternative and is not available:
                 * its width IS the figure, so widening it to fit its own label would
                 * make the drawing disagree with the number inside it.
                 */
                "text-base leading-none font-bold tracking-display tabular-nums sm:text-2xl md:text-3xl",
                index === 0
                  ? // White on the brand teal: 5.86:1, and the only ink allowed on it.
                    "bg-accent-teal text-text-inverse"
                  : /**
                     * **`teal-500`, filled, with NO OUTLINE — the outline is removed at
                     * ANSR's request and the fill had to move for it to go.**
                     *
                     * It was `teal-300` behind a brand-teal border, and the border was
                     * load-bearing rather than decorative: `teal-300` measures 1.82:1 on
                     * the mint zone under it, so the block's own EXTENT was carried by
                     * the outline and dropping the border alone would have drawn one
                     * block and a gap. ANSR read the outline as a hard dark rule around
                     * a pale box, which beside the solid block next to it made the pair
                     * look like two different kinds of object rather than two shares of
                     * one quantity.
                     *
                     * So the pair is now the ordinal step this file already uses
                     * everywhere else — the brand teal against `teal-500`, exactly the
                     * pair `BarTrack` uses for emphasis against default. `teal-500` is
                     * 5.14:1 on white and deeper still on the mint, so the extent is
                     * unambiguous from the fill and needs nothing drawn round it; white
                     * on it is 5.14:1, which is legal at any size and comfortably clear
                     * at the 24/30px Bold this figure sets.
                     *
                     * Darker means more is preserved: the larger share takes the deeper
                     * teal, so the ramp still reads in greyscale.
                     */
                    "bg-teal-500 text-text-inverse",
              )}
            >
              {block.figure}
            </p>
            <p
              className={cn(
                // The label's rule follows its own block's fill, so the two stay one
                // column. It moves with the fill above for the same reason it was
                // `teal-300` before: a rule in a colour the block no longer uses reads as
                // a third step in a two-step ramp.
                "border-t-2 pt-2 text-xs text-text",
                index === 0 ? "border-accent-teal" : "border-teal-500",
              )}
            >
              {block.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ==========================================================================
   Journey — waypoints on one path

   For a breakdown whose parts are one thing measured repeatedly as it goes, rather
   than a set of subjects measured once each. The scale curve is the case: six months
   to fifty FTEs, twelve to a hundred, twenty-four to three hundred, thirty-six to
   five hundred.

   **Why `RankedBars` was the wrong chart for it, which is the whole reason this
   exists.** Four bars from a shared zero on a shared axis is the drawing of four
   independent quantities — it is what graduate output by discipline is, and what
   latency to four cloud regions is. Applied to a curve it said "here are four
   separate durations" about one centre measured four times, and the reader had no way
   to see that the twelve contains the six.

   **A staircase says it instead.** Every leg begins where the previous one ended, so
   the row for "To 300 FTEs" is visibly the row above it plus twelve more months, and
   the accent segment on each row is that row's own contribution. The full extent of a
   row is still its stored figure, so nothing is invented and no axis is moved: the
   last row is full width because it is the whole journey, which is what makes the axis
   readable without a note about it.

   Two things it deliberately does not do. It does not re-sort — the order IS the path.
   And it does not draw the first leg differently: its run-up is genuinely zero, so its
   accent segment starts at the axis, and its interval is its cumulative figure and is
   therefore printed once rather than twice.

   **The two fills are `teal-500` and the accent, and both are floor-constrained.**
   They sit on the `surface-sunken` track every bar here uses, where `teal-400` and
   everything lighter measures under the 3:1 WCAG 1.4.11 asks of a non-text graphic —
   the same measurement `BarTrack` records. So the pair is the same pair `BarTrack`
   already uses for default against emphasis, and a hairline of the card's own ground
   is drawn at the joint so the step is legible as a boundary even where two adjacent
   teals are not separable by eye.
   ========================================================================== */

export interface JourneyLegRow {
  label: string;
  /** Cumulative, already formatted. The full extent of the row is a second reading. */
  figure: string;
  /** 0 to 1 — where this leg ends. */
  share: number;
  /** 0 to 1 — where this leg begins. Zero on the first. */
  offset: number;
  /** Signed and formatted by the caller. Absent on the first leg. */
  interval?: string;
}

export function Journey({
  legs,
  axisNote,
}: {
  legs: readonly JourneyLegRow[];
  axisNote?: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <dl className="flex flex-col gap-3">
        {legs.map((leg) => (
          <div key={leg.label} className="flex flex-col gap-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4">
              <dt className="text-sm text-text">
                {leg.label}
                {leg.interval ? (
                  // The leg's own contribution, in text beside the mark that draws
                  // it — the accent segment is a second reading of this, exactly as
                  // the row's full extent is a second reading of the figure.
                  <span className="ps-2 text-xs font-regular text-text-muted tabular-nums">
                    {leg.interval}
                  </span>
                ) : null}
              </dt>
              <dd className="text-sm font-semibold text-text tabular-nums">
                {leg.figure}
              </dd>
            </div>
            <div aria-hidden="true" className="relative h-2 w-full bg-surface-sunken">
              {/* Everything already elapsed when this leg started. Context, so it
                  takes the lighter of the two legal fills. */}
              <div
                className="absolute inset-y-0 start-0 bg-teal-500"
                style={{ width: `${leg.offset * 100}%` }}
              />
              {/* This leg. The news, so it takes the accent — and it carries the
                  ground hairline on its leading edge, which is what makes the joint
                  visible where the two teals are one step apart. */}
              <div
                className={cn(
                  "absolute inset-y-0 bg-accent-teal",
                  leg.offset > 0 ? "border-s border-surface" : "",
                )}
                style={{
                  insetInlineStart: `${leg.offset * 100}%`,
                  // A floor, so a short leg is a visible mark rather than an
                  // apparently missing one.
                  inlineSize: `${Math.max((leg.share - leg.offset) * 100, 1.5)}%`,
                }}
              />
            </div>
          </div>
        ))}
      </dl>
      <Baseline />
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

   **Three orders of magnitude are not drawable as three lengths, and that is the
   constraint that decided the rest of this component.** The real numbers on the
   default path are 1,834, 189 and 5 — so the middle layer is 10.3% and the innermost
   is 0.27%. Drawn as extents on one axis the third layer is a floored sliver a reader
   cannot see and cannot measure, and no width fixes it: at 390 the industry layer is
   about 32px, so there is nothing for a fifth of a percent to be inside. A log or a
   square-root scale would make it visible by making the length a lie, which is the
   same move as truncating an axis and is banned here for the same reason.

   So the innermost level is stated as a POSITION rather than as a quantity, via
   `marker`. Its figure is in text exactly as every other layer's is — the mark was
   always the second reading — and what the mark now says is "inside this population,
   here, are the ones on this page" instead of "this many". It is the only element in
   the chart in the accent fill, so it is visibly a different kind of mark rather than
   a bar that came out short. Where the third level IS a real population — a
   sub-industry cohort — it draws as a proportional bar and the marker never appears.

   Three rules the component enforces rather than trusts:

     - **Each layer's figure is in text, on or beside its own mark.** Every mark in
       this project carries its figure, and here the label is also what stops three
       nested rectangles being a decoration.
     - **A label sits on whichever side of its own trailing edge has more room.** The
       outermost layer is full width, so its label is inside it; every narrower layer
       puts its label after its trailing edge, where the eye follows the mark to the
       figure instead of reading a figure that overhangs the mark it belongs to. That
       is also what fills the width the chart used to leave empty.
     - **A marker never draws wider than the layer it is inside.** Its width is
       `min(a fixed step, the parent's own extent)`, resolved in CSS, so a thin
       industry — two companies against a national base of 1,834 — gets a marker
       clipped to its parent rather than one sticking out of it.
   ========================================================================== */

export interface ContainmentLayer {
  label: string;
  /** Already formatted. The bar is a second reading of this. */
  figure: string;
  /**
   * 0 to 1 against the outermost layer.
   *
   * **For a `marker` layer this is the extent the marker must stay INSIDE — the
   * parent population's share — not the marker's own quantity.** A marker draws no
   * quantity, so it has no share of its own to draw; what it needs to know is how
   * much room it has before it would be outside the population it is marking.
   */
  share: number;
  /**
   * Draw a fixed-width position marker instead of a proportional extent.
   *
   * For a level that is a SELECTION rather than a population — the handful of
   * companies named on the page. See the block comment: five of 1,834 is 0.27%, and
   * a length is the one form that cannot carry it.
   */
  marker?: boolean;
}

/**
 * The depth ramp, picked by how many layers there are rather than by position.
 *
 * Two layers take the ends of the ramp and three take all of it, so a two-layer
 * chart — which is what an industry with no sub-industry selected produces — is not
 * drawn as two adjacent steps a reader cannot separate. `teal-100` against
 * `teal-200` is a 1.2:1 difference; against `teal-300` it is worth looking at.
 *
 * Every BAR fill is a light step, because the outermost bar carries its own label and
 * every other bar may have a narrower layer's label land on it; see the CSS block for
 * the measurements. A `marker` is the exception and takes the accent teal — no label
 * sits on it, because a label always starts at or after its own layer's extent and
 * each label is confined to its own layer's band.
 */
const CONTAINMENT_RAMP: Record<number, readonly string[]> = {
  1: ["bg-teal-100"],
  2: ["bg-teal-100", "bg-teal-300"],
  3: ["bg-teal-100", "bg-teal-200", "bg-teal-300"],
};

/**
 * How wide a bar has to be, as a percentage of the chart, to hold its own label.
 *
 * At 50 the rule states itself: the label goes on whichever side of the bar's
 * trailing edge has more room. The outermost layer is always full width and takes the
 * inside branch; on the default path the industry layer is 10.3% and takes the
 * outside one, where it has nine tenths of the width for a figure and four words.
 */
const LABEL_INSIDE_MIN = 50;

export function Containment({
  layers,
  className,
}: {
  layers: readonly ContainmentLayer[];
  /**
   * The stack's own box, for a caller that has to place it.
   *
   * One consumer, and it passes exactly one thing: the peer view's card stretches to
   * the ranking beside it, so the chart opts into that stretch with `lg:grow` — capped
   * by its own `max-block-size`, which is where the stretch is actually bounded. Layout
   * belongs to the caller because only the caller knows what the chart shares a row
   * with; every mark inside stays this file's.
   */
  className?: string;
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
    <div className={cn("gcc-containment", className)}>
      {layers.map((layer, index) => {
        // A floor, so a genuinely tiny population is a visible sliver rather than an
        // apparently missing layer. A thin industry against the national base is
        // 0.1%, and that case is the reason the floor exists.
        const extent = Math.max(layer.share * 100, 1.5);
        /**
         * **Where this layer's label goes, and it is one rule with two branches.** A
         * marker has no extent to hold text, so its label is always after it. A bar
         * keeps its label inside only while the inside is the roomier side; below
         * half the chart the label goes after the trailing edge, which is what turns
         * the width this chart used to leave empty into the place the figures are
         * read.
         */
        /**
         * **Every label starts at the chart's own leading edge now, so the three read as
         * one column.** The rule was "inside its own mark while the inside is the roomier
         * side, otherwise after the mark's trailing edge", which is defensible per label
         * and rendered badly as a set: on the default path the outermost label sat at the
         * leading edge, the industry label 10% in, and the marker's label after an 8px
         * tick — three different indents, two of them floating in the middle of the pale
         * parent field with a third of the card empty to their right.
         *
         * A common indent costs the property that a label never overhangs its own mark:
         * "189 in BFSI" now crosses the trailing edge of the 189 bar. What replaces it as
         * the association is the BAND — every layer owns an exposed horizontal strip of
         * the stack and its label is confined to that strip, which is the same mechanism
         * that already stops two labels colliding. Left-to-right reading then goes label,
         * label, label down one edge instead of chasing three marks.
         *
         * `LABEL_INSIDE_MIN` is kept as the record of the measurement that decided the
         * old rule; nothing reads it while every label is inside.
         */
        const inside = true;
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
                /* An explicit modifier rather than `:first-of-type`. That selector
                   matched on ELEMENT type, so it depended on the outermost bar
                   happening to be the first `div` among its siblings — which any
                   wrapper, and any future layer drawn as something other than a bar,
                   would have quietly broken. */
                index === 0 ? "gcc-containment__bar--back" : "",
                layer.marker ? "gcc-containment__bar--marker" : "",
                layer.marker
                  ? // The one non-light fill in the chart, and it is available for the
                    // reason the bars' fills are not: no label ever lands on a marker.
                    // It is also what says "a different kind of mark" — this level is a
                    // position, not a quantity.
                    "bg-accent-teal"
                  : ramp[Math.min(index, ramp.length - 1)],
              )}
              style={
                {
                  insetBlockStart: `${index * band}%`,
                  /* A marker occupies only its own band. A bar runs to the shared
                     bottom edge, so every layer behind it stays visible above it —
                     which is the part of the geometry that says "inside". */
                  blockSize: layer.marker
                    ? `${band}%`
                    : `${100 - index * band}%`,
                  /* The extent, consumed differently by the two shapes: a bar's own
                     width, or the room a marker may not draw past. See the CSS. */
                  "--gcc-extent": `${extent}%`,
                  "--gcc-layer-index": index,
                } as React.CSSProperties
              }
            />
            {/* The figure and its label, in their own layer above every bar and
                confined to their own layer's exposed band, so two labels can never
                meet. It starts at the leading edge for the outermost layer and after
                its own mark for every narrower one — where it lands on the lighter
                fills behind, which take black ink at AA. */}
            <div
              className={cn(
                "gcc-containment__label",
                /**
                 * **A marker's label starts from the MARKER, not from `--gcc-extent`.**
                 * This was the one real rendering defect in the chart. For a marker
                 * layer `extent` is the PARENT's share — the room the mark may not draw
                 * past — while the mark itself is a fixed step of about 8px. Feeding
                 * that same `extent` to the label put the figure at the parent
                 * population's trailing edge, roughly 90px away from the 8px tick it
                 * belongs to, with pale fill between them: a figure attached to
                 * nothing, on the one element ANSR is being asked to accept as a
                 * departure from their three-bar request.
                 *
                 * The offset is resolved in CSS rather than here because that is where
                 * the marker's own width is resolved, and the two must be the same
                 * expression or they drift apart the first time one of them changes.
                 * See `.gcc-containment__label--marker`.
                 */
                /* The marker's own offset is no longer needed: with every label at the
                   chart's leading edge, the marker's label already sits against the
                   marker, which is itself at that edge. The class stays defined in the
                   stylesheet for the day a label goes back to trailing its mark. */
                "",
              )}
              style={
                {
                  insetBlockStart: `${index * band}%`,
                  blockSize: `${band}%`,
                  "--gcc-label-start": inside ? "0%" : `${extent}%`,
                  /* **Also on the label, not only on the bar**, because the marker
                     variant needs it to resolve the same `min()` the mark's own width
                     uses. Left off, `min(var(--ansr-space-2), var(--gcc-extent))`
                     substitutes an undefined operand, the declaration is invalid at
                     computed-value time, `inset-inline-start` falls back to `auto`, and
                     the label shrink-wraps against the chart's trailing edge — which
                     renders as the figure sitting even further from its mark than the
                     bug this fixes. A silent fallback, so it looked like the override
                     had not been written. */
                  "--gcc-extent": `${extent}%`,
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
                    : "border-2 border-teal-500 bg-surface",
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
              className="inline-block size-3 rounded-full border-2 border-teal-500 bg-surface"
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
                className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-teal-500 bg-surface"
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
                className="inline-block size-3 rounded-full border-2 border-teal-500 bg-surface"
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

   **The rating word is now `sr-only` and the segments carry it on screen, which
   inverts which of the two is the visible reading.** Every cell used to draw both —
   "Very strong" in text AND four filled segments — twenty times over on one card,
   under a key at the foot naming the same four words again. That is the same figure
   said three ways in one grid, and it is what made the widest card on the screen
   wider than a phone: twenty rating words at `text-sm` are what the horizontal
   scroller exists to hold.

   **Doing it needs a precedent, and there is exactly one.** This project's rule is
   that a mark is a SECOND reading of a figure already in text, which is why every
   mark here is `aria-hidden`. The density map on Screen 1 is the one block allowed to
   break that — its orange city marks sit under the non-text contrast floor and are
   permitted because "every mark on that map is a second reading of a figure already
   in text", the ranked list beside it. The same argument licenses this and nothing
   wider: the four ordinal words are still present in text, in the KEY, which is why
   the key moved from the foot of the grid to above it. A reader meets the scale before
   the segments they have to count with it, rather than after; and the words are in the
   document, so the segments are redundant to text rather than the sole carrier of it.

   What does NOT come with that licence: the segments still clear 3:1 against their own
   track, because they are now the only visible encoding and the map's contrast
   exemption is scoped to the map. And the accessible reading is unchanged — the rating
   word is hidden from the eye, never from the accessibility tree, so a screen-reader
   user still hears "Data and AI, Poland, Strong".

   The key itself is `RatingKey`, below the grid at the trailing end and DRAWN rather
   than listed — see its own comment for why four words separated by middots were not a
   key at all, and why the "before the thing it decodes" argument does not survive the
   key becoming legible.
   ========================================================================== */

export function OrdinalGrid({
  columns,
  steps,
  rows,
  labelledBy,
  keyLabel,
  rowHeader,
}: {
  columns: readonly string[];
  /**
   * The leading `columnheader`'s name, which is `sr-only`.
   *
   * A required prop rather than a context read, because this module has no `"use client"`
   * and is imported by server components — so it cannot hold a hook. Required rather than
   * defaulted, so a new caller cannot silently reintroduce a hardcoded name.
   */
  rowHeader: string;
  /** Weakest first. Drawn as the key. */
  steps: readonly string[];
  rows: ReadonlyArray<{
    label: string;
    cells: ReadonlyArray<{ rating: string; step: number }>;
    /**
     * A restrained outline glyph beside the row's name. Decorative and
     * `aria-hidden` — the row header already names the capability.
     *
     * Supplied by the caller rather than derived here, and keyed there off the row
     * LABEL, which is admin-editable. That is a deliberate exception to the rule
     * that nothing may read a label, and it is safe for one reason: the worst case
     * is a renamed row losing its glyph. Nothing about the rating, the scale or the
     * grid's reading depends on it, and the caller drops the whole column rather
     * than render a ragged one — see `CAPABILITY_ICONS` in `metric-card.tsx`.
     */
    icon?: React.ReactNode;
  }>;
  labelledBy: string;
  /**
   * **`anchorColumn` is gone, at ANSR's request, and with it all three of its
   * emphases.** The subject column was tinted `surface-pale` the whole height of the
   * grid, its heading took the brand teal, and its filled segments went a step darker
   * than the comparators'. ANSR read the band as a highlight over India, on a grid whose
   * whole job is to let a reader compare four locations on equal terms — an emphasis on
   * one column is a thumb on that scale, and the visitor knows which column is theirs
   * because it is named.
   *
   * The column is still DERIVED — `anchorColumnFor` in `screen2.ts` still finds it and
   * `grid.anchorColumn` still carries it, unit-tested on both of its rules — so
   * restoring the emphasis is a prop rather than a derivation. It is drawn by nothing,
   * which is the same standing `industry.shareOfIndia` has on Screen 1.
   *
   * **`ratingFill` is not that emphasis coming back and the difference is which axis the
   * depth is read off.** It draws a top-rated cell in the deeper teal wherever the cell
   * appears — every column, not one — so the depth encodes the RATING rather than whose
   * column it is. That is the thing the removed emphasis was mistaken for; see the note
   * on `ratingFill`.
   */
  keyLabel: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div
        className="min-w-0 overflow-x-auto"
        // Focusable and named: an unfocusable scroller is unreachable without a
        // pointer, and this grid is wider than a tablet. Below `md` it reflows and
        // there is nothing left to scroll — see `.gcc-rating-grid`.
        tabIndex={0}
        role="group"
        aria-labelledby={labelledBy}
      >
        {/* **The minimum and the cell padding both step down below `lg`, so a tablet
            stops scrolling a column off too.** `min-w-2xl` plus `px-4` needs 672px and a
            768px viewport gives this scroller 558 — measured, with the last column and
            five of its cells past the edge and `scrollLeft` at 0. That is the same defect
            as the phone one below, one breakpoint up, and it has a cheaper fix: a cell's
            marker group is a fixed 76px, so the only elastic parts are the cell padding
            and the row header. At `px-2` four cells take 368px and the row header keeps
            190 of the 558 — enough for "Enterprise technology" on one line — so nothing
            wraps and nothing scrolls anywhere in the `md`-to-`lg` range, where this
            scroller is between 558 and 814px wide.

            `min-w-lg` rather than `min-w-0` for the floor: below 512px the marker groups
            themselves would start colliding, and that is the width the scroller is a real
            answer for. It is never reached in practice — the reflow takes over at `md`.

            From `lg` both values are what they were, so desktop is untouched.

            **Below `md` the table reflows instead, and the explicit ARIA roles are what
            make that safe.** `.gcc-rating-grid` sets `display: block` on the table's own
            parts, which drops a browser's implicit table semantics — so the roles are
            declared rather than inherited. On every width from `md` up they are exactly
            what the elements already mean, so nothing is asserted here that is not true;
            below `md` they are the only thing keeping a comparison grid a grid. The
            reasoning for the reflow itself is in globals.css beside the class. */}
        <table
          role="table"
          className="gcc-rating-grid w-full min-w-lg border-collapse text-sm lg:min-w-2xl"
        >
          <thead role="rowgroup">
            <tr role="row">
              <th role="columnheader" scope="col" className="pb-2 text-start">
                <span className="sr-only">{rowHeader}</span>
              </th>
              {columns.map((column) => (
                <th
                  key={column}
                  role="columnheader"
                  scope="col"
                  className={cn(
                    // **Centred over its own marker group, not leading-aligned.** A
                    // cell's four segments are 76px of mark in a column two or three
                    // times that wide, so a leading-aligned heading sat over the first
                    // segment rather than over the group and read as a label for it.
                    // One treatment for every column, including the visitor's own. See
                    // the note on `keyLabel` for why the emphasis came off.
                    "px-2 pb-2 text-center text-xs font-semibold tracking-caps text-text-muted uppercase lg:px-4",
                  )}
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody role="rowgroup">
            {rows.map((row) => (
              <tr key={row.label} role="row" className="border-t border-border-subtle">
                <th
                  role="rowheader"
                  scope="row"
                  className="py-3 pe-2 text-start align-middle text-sm font-medium text-text lg:pe-4"
                >
                  <span className="flex items-center gap-2.5">
                    {row.icon ? (
                      <span
                        aria-hidden="true"
                        className="shrink-0 text-accent-teal"
                      >
                        {row.icon}
                      </span>
                    ) : null}
                    {row.label}
                  </span>
                </th>
                {row.cells.map((cell, index) => {
                  return (
                    <td
                      key={columns[index]}
                      role="cell"
                      // No fill on any column. The `surface-pale` band that ran the
                      // height of the subject column came off at ANSR's request.
                      className="px-2 py-3 align-middle lg:px-4"
                    >
                      {/* The accessible reading, and the only one that is not
                          positional. Hidden from the eye rather than from the
                          accessibility tree: the cell still reads "Data and AI,
                          Poland, Strong". */}
                      <span className="sr-only">{cell.rating}</span>
                      {/* **The column's name, drawn inside the cell and only below `md`.**
                          Once the table reflows there is no column above a cell to read
                          its heading off, so the heading has to travel with it. Real
                          markup rather than `content: attr()` for two reasons: the string
                          is admin-editable and this is not the renderer deciding
                          anything about it, and a pseudo-element's text lands in the
                          accessibility tree in some browsers, where it would say
                          "Poland" a second time after the `columnheader` already has.
                          `aria-hidden` settles that — the heading row is still present,
                          still associated, and merely visually hidden at this width. */}
                      <span aria-hidden="true" className="gcc-rating-grid__column">
                        {columns[index]}
                      </span>
                      {/* The visible reading, decoded against the key above, and
                          centred under its own column heading. */}
                      <span
                        aria-hidden="true"
                        className="flex justify-center gap-1"
                      >
                        {steps.map((step, stepIndex) => (
                          <span
                            key={step}
                            className={cn(
                              RATING_MARK,
                              stepIndex < cell.step
                                ? ratingFill(cell.step, steps.length)
                                : "bg-surface-sunken",
                            )}
                          />
                        ))}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <RatingKey steps={steps} keyLabel={keyLabel} />
    </div>
  );
}

/**
 * A rated cell's fill, by the RATING it holds rather than by the column it sits in.
 *
 * **The top step takes the deeper `accent-teal` and every step below it `teal-500`, at
 * ANSR's request** — the brand teal being the fill the graduate pipeline's larger block
 * uses one tab over, which is where the colour was asked for from.
 *
 * **It is per-RATING, which is what keeps it clear of the rule it looks like it breaks.**
 * `anchorColumn` was removed because the subject column's segments were drawn a step
 * darker, and a darker mark in one COLUMN reads as a higher rating rather than as "this
 * is you" — the emphasis was lying about the quantity. Here the depth IS the quantity:
 * every cell rated at the top step is deeper wherever it appears, in India's column and
 * in Poland's alike, so nothing is emphasised and the grid still emphasises no column.
 * It is the file's own ordinal rule applied to a chart that had only been counting —
 * darker means more, which is what `RAMP` and `depthFor` do everywhere else.
 *
 * **Two steps, not four, and the count is deliberate.** A full ramp across four ratings
 * would put the weakest cells on a pale teal, and these segments are the ONLY visible
 * encoding on this chart — the rating word beside them is `sr-only` — so every fill has
 * to clear 3:1 against its own `surface-sunken` track. `teal-400` measures 2.15:1 there
 * and everything lighter is worse, which is the same measurement `BarTrack` records. So
 * the legal range is exactly the two deepest steps, and the top rating gets the deeper
 * of them.
 */
function ratingFill(step: number, total: number): string {
  return step >= total ? "bg-accent-teal" : "bg-teal-500";
}

/**
 * The rating grid's mark. **A landscape rectangle, not a square**, and the shape is
 * the whole reason it works: four squares in a row read as four separate objects a
 * reader has to count one at a time, where four rectangles read as one segmented
 * bar that happens to be part-filled. It was 10×10 for a pass and the grid lost the
 * at-a-glance comparison down a column that is the only thing a rated matrix is for.
 * 16×10 also restores the 76px marker group the column headings are centred over.
 */
const RATING_MARK = "h-2.5 w-4";

/**
 * The same mark in the KEY, at about half the area. Same landscape ratio, because the
 * ratio is what makes four of them read as one part-filled bar rather than four
 * objects; the smaller size is what keeps the key from reading as another grid row.
 */
const RATING_KEY_MARK = "h-1.5 w-2.5";

/**
 * The scale, drawn as what it decodes rather than listed as four words.
 *
 * **It was "Developing · Moderate · Strong · Very strong" and that is not a key.**
 * The cells carry a COUNT — one filled segment of four, two, three, four — and a run
 * of four words separated by middots states the ORDER of the steps while saying
 * nothing about which count is which. A reader met a cell with two filled marks and
 * had to infer from position in a list that two means Moderate. So each step is now
 * drawn at its own fill against the same four-segment track the cells use.
 *
 * **At `RATING_KEY_MARK`, deliberately smaller than the cells' own mark.** Drawn at
 * the cell size the key was sixteen marks of exactly the weight of the eighty above
 * it, sitting one gap under the last row — so it read as a fifth data row for
 * whichever location the eye happened to land on, which is the interference ANSR
 * reported. The obvious argument says a key should match what it decodes, and it is
 * beaten here by the fact that the words are ON the key: a reader pairing "two filled"
 * with "Moderate" needs the pattern, not the scale, and the same aspect ratio carries
 * the pattern at any size. The size is what says this is chrome rather than evidence.
 *
 * **Below the grid and at the trailing end, at ANSR's request.** It was above, on the
 * argument that the segments are the only visible reading so a reader needs the scale
 * before the thing it decodes. What survives of that argument is what actually
 * licenses the `sr-only` rating in the cells — the four ordinal words are still
 * present in TEXT, somewhere in this card — and that is a property of the document
 * rather than of the order. Drawn rather than listed, it is also now legible on the
 * way back: a reader who meets an unfamiliar cell looks down, not up.
 *
 * The framing stays `sr-only` for the reason it always was: weakest-first is useful
 * to someone meeting four words with no left-to-right to read them in, and is a third
 * of the visible line explaining an order the words already have.
 */
function RatingKey({
  steps,
  keyLabel,
}: {
  steps: readonly string[];
  keyLabel: string;
}) {
  return (
    /**
     * **An inline GRID of equal columns, not a wrapping flex row, and that is what
     * makes it read as a scale.**
     *
     * It was `flex flex-wrap … justify-end` with a 16px inline gap, and the four steps
     * are four labels of very different widths — "Moderate" against "Very strong" —
     * each behind its own four-mark cluster. Even pitch was therefore impossible: the
     * groups sat at four unrelated offsets, so the mark clusters did not line up with
     * each other and nothing in the key lined up with anything above it. Wrapping made
     * it worse rather than differently — a trailing-aligned last line under filled
     * earlier ones is a ragged block by construction, which is the "here and there" of
     * it.
     *
     * `1fr` columns in an INTRINSICALLY sized grid resolve to the widest column's
     * max-content, so all four take the width "Very strong" needs and every cluster
     * starts at the same offset inside its own column. The grid is only as wide as it
     * needs to be, so `ms-auto` keeps it at the trailing end where ANSR put it.
     *
     * **Two columns below `sm`, four from it.** Four equal columns at the widest
     * label's width do not fit a 320px card, and letting them wrap is what was being
     * fixed; 2x2 is the only arrangement of four that is regular at both ends, which
     * is the argument the snapshot's own cells are laid out on.
     */
    <p className="ms-auto grid w-fit grid-cols-2 items-center gap-x-4 gap-y-1.5 text-xs text-text-muted sm:grid-cols-4">
      <span className="sr-only">{keyLabel}: </span>
      {steps.map((step, stepIndex) => (
        <span key={step} className="inline-flex items-center gap-1.5">
          {/* The mark is the second reading; the word beside it is the figure. */}
          <span aria-hidden="true" className="flex gap-0.5">
            {steps.map((track, trackIndex) => (
              <span
                key={track}
                className={cn(
                  RATING_KEY_MARK,
                  // The same fill the cells use for this step, which is the point of a
                  // key: the top row is drawn in the deeper teal because a top-rated
                  // cell is, so a reader meeting `accent-teal` in the grid can decode it
                  // here. See `ratingFill`.
                  trackIndex <= stepIndex
                    ? ratingFill(stepIndex + 1, steps.length)
                    : "bg-surface-sunken",
                )}
              />
            ))}
          </span>
          {step}
        </span>
      ))}
    </p>
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
                      {/* `teal-500`, as in `BarTrack` — `teal-400` is 2.15:1 against
                          this track and cannot carry a mark. */}
                      <span
                        className="block h-full bg-teal-500"
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

/* ==========================================================================
   RangeBenchmark — a spread read as two named operating models

   `RangeBar` above is the general reading of a low end and a high end: the figures
   at display size, a band on a zeroed track, and the end labels underneath. This is
   the same claim drawn as a BENCHMARK, which is what the HR tab's two hiring
   timings are — a reader is not asking "what is the spread", they are asking "what
   does each end cost me", and the two ends are different operating decisions rather
   than two samples of one thing.

   Three differences from `RangeBar`, each of which is the reason this is a separate
   component rather than a flag on that one:

     - **The endpoints are POINTS, not the ends of a band.** A hollow ring at the low
       end and a filled dot at the high end, because each one is a real, chooseable
       position — hire on an employer of record and it is seven days, hire into your
       own entity and it is seventy. A filled band says "somewhere in here", which is
       the right drawing for a backfill spread and the wrong one for a choice.
     - **Each endpoint carries its own figure directly beneath its mark**, so the
       number is read at the position it belongs to rather than in a caption pair
       below. That is the same rule every chart here follows — the mark is a second
       reading of a figure in text — applied at the endpoint instead of at the row.
     - **The origin is labelled.** `RangeBar`'s own comment records why: a spread
       drawn with no visible zero reads as "a value near the maximum". A `0` at the
       start of the rail is the cheapest way to say the rail starts there, and it is
       what makes the run-up before the low endpoint legible as elapsed time.

   The rail is grey up to the low endpoint and teal from there to the high one, which
   is the same language `Journey` uses for a leg's run-up against the leg itself.

   **`px-7` on the wrapper is measured, not decorative.** The endpoint figures are
   centred on their own marks, so the outermost one overhangs the rail by half its own
   width — about 26px for "70 days" at this size. 28px of slack absorbs it at every
   width the card is drawn at, including a 222px rail at 390. Without it the figure
   either clips or widens the framed document, and the iframe does not own its own
   horizontal scroll.
   ========================================================================== */

export function RangeBenchmark({
  low,
  high,
  lowLabel,
  highLabel,
  offset,
  unit,
  originLabel = "0",
}: {
  low: string;
  high: string;
  /** What the low end IS — an operating model, not a caveat. */
  lowLabel: string | null;
  highLabel: string | null;
  /** Where the low endpoint sits on a 0-to-high rail, 0 to 1. */
  offset: number;
  unit?: string;
  /** The origin tick. A string so a caller can suppress it with an empty one. */
  originLabel?: string;
}) {
  return (
    <div className="flex flex-col gap-6">
      {/* **The primary value, in the heading teal rather than the action orange.**
          The orange roles on this screen are the figure row and the salary
          comparator; a card's own value is evidence inside a section, and two orange
          roles in one band is what the brand rule forbids. `--ansr-accent` is 6.63:1
          on white, so it is legal at any size — unlike the orange, which is only
          legal above the large-text floor. */}
      <p className="flex flex-wrap items-baseline gap-x-3 text-3xl leading-tight font-bold tracking-display text-accent-teal tabular-nums md:text-4xl">
        {low}
        {/* An en dash, not a hyphen: this is a range between two values. Spaced,
            because both operands are numerals and an unspaced dash between digits
            reads as a minus. */}
        <span aria-hidden="true">{"\u2013"}</span>
        {high}
        {unit ? (
          <span className="text-base font-medium text-text-muted">{unit}</span>
        ) : null}
      </p>

      {/* **THE RAIL AND THE TWO END LABELS ARE ONE GROUP, 4px apart, and that is what
          the labels were missing.** They used to be a third sibling of this flex
          column, so `gap-6` put them 28px under the endpoint figures — and the caller
          sets its own note 16px below them. Two 12px muted lines, the nearer of them
          the note, is the note's own first line by every proximity reading available:
          the pair floated in the middle of the card naming nothing, which is what
          "too far from where it is supposed to be" was on a phone, where the card is
          narrow enough that the two labels also meet in the middle and read as one
          sentence.

          So each label is now its own figure's second line — 4px, the same step
          `.gcc-index-rail__figure` puts between a mark's name and its number — and the
          16px to the note is the larger gap rather than the smaller one. Grouped at
          EVERY width, not below `sm` alone: the ambiguity is a ratio between two gaps
          and the desktop card carries the same two gaps. */}
      <div className="flex flex-col gap-1">
        {/* Everything in here is a second reading of the sentence above, so it is
            hidden: a screen reader has already been given "7 – 70 days". The end
            labels below are NOT, and that is why they sit outside this element rather
            than inside the group's first child.

          **The 28px inset is GONE, at ANSR's request, and the endpoint figures moved to
          pay for it.** The rail used to sit inside `px-7` because both endpoint figures
          were centred on their own marks and the trailing one therefore overhung the
          rail's end by about half its width — and the tool is framed, so it cannot own a
          horizontal scrollbar to absorb that. The cost was that the rail started 28px
          inside the card's text start line: the value above it, the endpoint labels below
          it and the card's own heading all began at one edge and the drawing began at
          another, which is the asymmetry ANSR reported across the two velocity cards.

          So the rail now runs the card's full measure and the trailing figure is
          right-ALIGNED to the rail's end rather than centred on it — the same call the
          origin `0` already made at the leading end, and for the same reason. The two
          figures now bracket the rail exactly as the `0` and the heading do, and nothing
          can overhang. */}
        <div aria-hidden="true">
          <div className="relative">
            {/* The rail. Grey for the run-up, teal for the span between the two
                choosable positions. */}
            <div className="relative h-4">
              <div className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 bg-border-strong" />
              <div
                className="absolute top-1/2 end-0 h-0.5 -translate-y-1/2 bg-accent-teal"
                style={{ insetInlineStart: `${offset * 100}%` }}
              />
              {/* The origin, as a tick on the rail rather than a dot: it is where the
                  measurement starts, not a position anybody hires at. */}
              <div className="absolute inset-y-1 start-0 w-0.5 bg-border-strong" />
              {/* Low: hollow, because it is the cheaper route and the ring reads as
                  "start here". Filled would make the two ends look ordered by value. */}
              <span
                className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent-teal bg-surface"
                style={{ insetInlineStart: `${offset * 100}%` }}
              />
              {/* High: solid, and flush inside the rail's end rather than centred on
                  it, so it cannot overhang a card that has no horizontal slack. */}
              <span className="absolute top-1/2 end-0 size-3.5 -translate-y-1/2 rounded-full bg-accent-teal" />
            </div>

            {/* The figures, each under its own mark. `whitespace-nowrap` because a
                wrapped endpoint figure would put its unit under its own number and
                read as two lines of a caption. */}
            {/* **`--gcc-range-floor` is the clearance the low figure keeps from the origin
                label, and it is ZERO below `sm` because the origin label is not drawn
                there.** See both notes below. Declared here rather than in globals.css
                because it is read by exactly one inline style, two elements down. */}
            <div className="relative mt-2 h-6 [--gcc-range-floor:0rem] sm:[--gcc-range-floor:3rem]">
              {originLabel ? (
                // Flush to the rail's start rather than centred on it. Centred, it
                // straddles the origin and eats into the low figure's clearance below —
                // and there is nothing to the left of zero for it to be centred over.
                /**
                 * **NOT DRAWN BELOW `sm`, and the low figure's alignment is what it was
                 * costing.** The low endpoint of the first-hire card sits at 10% of the
                 * rail, which is 29px at 390 — so the `0` and "7 days" overlap, and the
                 * floor below pushes the figure to 48px to clear it. The figure then sits
                 * 19px to the trailing side of the mark it belongs to, which on a chart
                 * whose whole construction is "the number is under its own mark" is the one
                 * misplacement that matters. That is the "not placed right" reading, and it
                 * is a collision rather than a type size.
                 *
                 * What the `0` buys is that the run-up before the low endpoint is legible as
                 * elapsed time. What it costs on a phone is the low figure's position. The
                 * TICK on the rail is still drawn at both widths, so the rail still visibly
                 * starts at an origin; only the numeral goes. Scoped to the phone because
                 * from `sm` the rail is long enough for both to be right — and the zero-tick
                 * rule a cost index depends on is about the tick, which is untouched.
                 */
                <span className="absolute start-0 hidden text-xs text-text-muted tabular-nums sm:block">
                  {originLabel}
                </span>
              ) : null}
              <span
                /**
                 * **Centred on its own mark, except where that would collide with the
                 * origin.** A low endpoint at 10% of a 222px rail — the first-hire card at
                 * 390 — puts this label's leading edge behind the `0`, and two numerals
                 * overlapping is the one failure that makes a chart unreadable rather than
                 * merely tight. `max()` floors the centre at 3rem, so the label shifts a
                 * few pixels off its dot in exactly the case where it had to move and sits
                 * on it everywhere else. A small misalignment against an illegible
                 * overlap.
                 *
                 * **The floor is ZERO below `sm`, where there is no `0` to collide with**, so
                 * the figure sits exactly on its own mark — which is the phone width the
                 * clash was measured at and the width the compromise was worst on. See the
                 * origin label above.
                 */
                className="absolute -translate-x-1/2 text-sm font-bold whitespace-nowrap text-text tabular-nums"
                style={{
                  insetInlineStart: `max(${offset * 100}%, var(--gcc-range-floor))`,
                }}
              >
                {low}
                {unit ? (
                  <span className="ps-1 font-regular text-text-muted">{unit}</span>
                ) : null}
              </span>
              {/* Flush to the rail's end rather than centred on it, which is what let the
                  enclosing 28px inset go. The high mark is itself flush INSIDE the rail's
                  end, so the figure's trailing edge and the mark's trailing edge line up —
                  the alignment reads the same as centring did, and it costs no overhang. */}
              <span className="absolute end-0 text-sm font-bold whitespace-nowrap text-text tabular-nums">
                {high}
                {unit ? (
                  <span className="ps-1 font-regular text-text-muted">{unit}</span>
                ) : null}
              </span>
            </div>
          </div>
        </div>

        {lowLabel !== null || highLabel !== null ? (
          /* A pair, deliberately not a `<ul>`: a card is already a landmark, and list
             semantics inside it would make "count the items on this tab" mean
             something else. Same reasoning as `RangeBar`'s own label pair. */
          /* **TWO columns at every width, with the trailing label end-aligned at every
             width, and the phone case is the reason this changed.** It was one column below
             `sm`, which stacked "Through EOR model" and "Through own entity" at the leading
             edge, one under the other, in the order they appear in the DOM — so on a phone
             the two operating models sat together on one side of a card whose whole subject
             is that they are at OPPOSITE ends of the rail above them. The labels name the
             two endpoints; they have to bracket the rail the way the endpoint figures do,
             or they are a two-item list of unrelated notes.

             At 375 a column is about 120px and the longer of the two labels is roughly 100px
             of ink at 12px, so it fits on one line and wraps to two at 320 — which costs
             nothing, because each label wraps inside its own end of the rail.

             **MEDIUM weight, which is the other half of the grouping fix above.** At
             `text-xs` in `--ansr-text-muted` these were the note's own treatment exactly,
             so on a phone the pair read as the note's first line whatever the gaps did.
             Medium is what `.gcc-index-rail__label` sets on the same thing — a name for a
             mark, at caption size — and it separates a label from prose without spending an
             ink step the note would then have to answer. */
          <div className="grid grid-cols-2 gap-3 text-xs font-medium text-text-muted">
            {lowLabel !== null ? <p>{lowLabel}</p> : <span />}
            {highLabel !== null ? <p className="text-end">{highLabel}</p> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ==========================================================================
   MilestoneTrack — one cumulative progression, drawn as one line

   `Journey` above draws the same data as a staircase of rows: one row per waypoint,
   each leg starting where the last ended. That is the right reading inside a stack of
   other bar charts, because it shares their row rhythm. This is the reading the HR
   composition asks for and it says one more thing: there is a SINGLE line, and the
   four milestones are positions on it.

   **The positions are proportional to the stored figures, not evenly spaced.** Six,
   twelve, twenty-four and thirty-six months land at 17%, 33%, 67% and 100% of the
   rail, so the drawing shows what the numbers say — the first two milestones are close
   together and the last is a long way out. Evenly spaced circles would be a lie about
   the one thing this chart exists to show, and it is the same lie a truncated axis
   tells: the labels would be right and the picture wrong.

   **Nothing here parses a label.** The milestone names arrive verbatim from the
   catalogue ("To 50 FTEs"), and the durations arrive already formatted. Splitting "To
   50 FTEs" into a numeral and a unit to match the reference render would mean reading
   an admin-editable string, which is banned outright on this screen — a renamed entry
   would silently redraw the chart. The unit belongs once, as the card's subtitle.

   **The layout is a CSS class, not two DOM trees, and below `sm` the rail turns
   VERTICAL.** A 246px rail puts the first two circles 41px apart, which no label fits
   between, so the chart cannot be drawn across the card at that width. It is drawn down
   it instead: the same line, the same rings on it, and the same `--gcc-at` shares read as
   vertical offsets, so the spacing stays proportional to the stored figures and the two
   tracks stay comparable against one axis length. What was there before was a plain list
   of rows with no line at all — every figure stated, and nothing saying the four were
   positions on one progression. Rendering both and hiding one would put every milestone
   in the accessibility tree twice, so the items carry `--gcc-at` and `.gcc-milestones`
   places them; the rail and the rings are `aria-hidden` at both widths.

   **It draws MORE THAN ONE rail now, and the second one is a comparison against the
   first.** The component takes a list of tracks rather than a list of points, and every
   track's shares are computed by the caller against ONE denominator — so a waypoint that
   happens two thirds of the way through the market's own curve sits at two thirds of
   every rail. That is the whole reason the second rail is worth drawing: the reader is
   comparing horizontal positions, and two rails on two axes would compare nothing.

   **EVERY TRACK IS DRAWN IDENTICALLY, at ANSR's request, and the two earlier attempts to
   differentiate the second one are both reverted.** It had discs where the first has
   rings, its figures in the heading teal, and its waypoint names clipped to a screen
   reader on the argument that a second set of the same four strings is chrome. All three
   made the lower rail read as a different KIND of chart from the one it is being compared
   with — which is the one thing it must not do, since the comparison is the whole point
   and it only works if the two drawings are the same drawing.

   So the only difference between two tracks is the CAPTION above each and the figures on
   it. That is enough: the caption names the rail, and one of them carries the ANSR lockup,
   which is a stronger and more accessible carrier than a fill ever was.
   ========================================================================== */

export interface MilestonePoint {
  /** The waypoint, verbatim from the catalogue. */
  label: string;
  /** The elapsed figure at that waypoint, already formatted. */
  figure: string;
  /** 0 to 1 against the last waypoint, which is the whole progression. */
  share: number;
}

export interface MilestoneTrackSpec {
  /**
   * What this rail IS, in as few words as the reader needs. Rendered above the rail at
   * the caption step; a node rather than a string so a caller can set a drawn wordmark
   * in it.
   */
  caption: React.ReactNode;
  points: readonly MilestonePoint[];
}

export function MilestoneTrack({ tracks }: { tracks: readonly MilestoneTrackSpec[] }) {
  return (
    // The 28px inset stays here, where `RangeBenchmark`'s equivalent has gone: these
    // items are absolutely positioned and translated by half their own width, so the
    // last waypoint on a 100% share genuinely overhangs the rail's end by up to half of
    // `max-inline-size` — and the tool is framed and cannot own a horizontal scrollbar.
    // `RangeBenchmark` could align its trailing figure to the end instead; a centred
    // absolute item cannot.
    // **`gap-8` between tracks, against the `space-2` each chart sits below its own
    // caption.** A caption belongs to the rail under it, so that pair has to be the
    // tighter of the two distances — at the earlier `gap-5` over a `space-4` inset the two
    // gaps were near enough equal that the second caption read as a note on the first
    // chart. Four times the inset is the separation ANSR asked for, and it is the same
    // grouping rule every stacked block on these screens follows.
    // **On a phone the inset is a PERCENTAGE, because what it has to absorb is one.** The
    // rail is horizontal at every width now, so the overhang exists at every width — and
    // below `sm` the item cap is 14% of the rail rather than 3.5rem, so half an item is
    // 6% of the wrapper and no fixed inset can be right at both 320 and 430. 7% covers it
    // with a point to spare at every phone width, and it shrinks with the card instead of
    // eating a fifth of a 248px measure the way 28px would. From `sm` the cap is a length
    // again and so is this. The captions take the inset too, exactly as they already do
    // from `sm`.
    <div className="flex flex-col gap-8 px-[7%] sm:px-7">
      {tracks.map((track, index) => (
        <div key={index} className="gcc-milestone-track flex flex-col">
          {/* Above its own rail, at the caption step, in the same ink on every track —
              the tracks are drawn identically and their captions are the only thing
              telling them apart, so a coloured one would be re-introducing the
              differentiation that came off the rails themselves. */}
          <p className="text-xs font-medium text-text-muted">{track.caption}</p>
          <dl className="gcc-milestones">
            {/* The line itself. One element per track, drawn behind that track's items,
                so there is exactly one rail however many milestones it has. */}
            <div aria-hidden="true" className="gcc-milestones__rail" />
            {track.points.map((point) => (
              <div
                key={point.label}
                className="gcc-milestones__item"
                style={{ "--gcc-at": `${point.share * 100}%` } as React.CSSProperties}
              >
                {/* **The milestone above the line and its duration below**, which is the
                    composition's own instruction and is also the right way round: the
                    milestone is what the reader is aiming at and the duration is the
                    answer. In the DOM the term precedes its definition regardless, so a
                    screen reader reads "50 FTEs, 6".

                    **Every track carries its names visibly**, including a second track
                    naming the same four waypoints. Clipping the lower set to a screen
                    reader was tried and reverted at ANSR's request: it saved four
                    repeated strings and cost the second rail its own reading, so the
                    lower chart no longer looked like the upper one. Two rails a reader is
                    asked to compare have to be the same object twice. */}
                <dt className="gcc-milestones__label text-xs font-semibold text-text">
                  {point.label}
                </dt>
                <span aria-hidden="true" className="gcc-milestones__dot" />
                {/* 16px below `sm`, against the 12px waypoint name above the ring: the
                    duration is still the larger of the pair, which is the ordering that
                    matters, and at 18px in a column capped at 14% of a 208px rail it was
                    the widest thing in an item whose name has to wrap inside the same
                    cap. `--gcc-milestone-figure-gap` steps with it. */}
                <dd className="gcc-milestones__figure text-base font-bold tracking-display text-text tabular-nums sm:text-lg">
                  {point.figure}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
}

/* ==========================================================================
   IndexSpread — one row of a two-column index, as its own card

   `Dumbbells` above draws the same data as a stack of rows sharing one axis, which is
   the right reading inside a grid of other charts. This is the reading the finance
   composition asks for: one card per measure, and its two indices ON the rail rather than
   above it.

   **The pair of display figures is GONE at ANSR's request, and the labels moved onto the
   marks.** The card stated each index twice — a 30px figure under its column name, and
   the same number again as a small label under its own mark — so a card whose whole
   subject is one difference carried four numbers. What is left is the rail: each point is
   its name, its mark and its figure in one positioned column, and the figure moved up to
   the step the pair used to hold so the card still has a value to read at a glance. The
   geometry is `.gcc-milestones`', for the reason that file gives.

   **Nothing here is `aria-hidden` except the marks, and that is what the removal
   changed.** The whole rail used to be hidden wholesale, which was correct while the
   figures existed above it in text; with the pair gone, hiding the rail would leave the
   card's own numbers in no accessible reading at all. So the `dl` is real — each column
   name is a `dt` and its index the `dd` that follows it — and only the marks and the
   axis furniture are hidden, which is this file's rule everywhere else: a mark is a
   second reading of a figure already present.

   **The rail still starts at zero, and that is a deliberate departure from the supplied
   render.** The reference draws a 50-to-125 axis with ticks at 50, 75, 100 and 125,
   which puts 75 against 100 a third of the way along a track rather than three quarters
   — a 25% difference magnified into a 2:1 picture. `project.md` bans exactly that for a
   cost index ("a truncated axis is exactly how one would be faked"), and `Dumbbells`
   carries the same argument in its own comment because both marks on a cost index sit
   near the top of the scale. So the axis is the one the view model already shares
   across the whole metric, with its zero drawn, and the magnification is refused. The
   difference the reference was trying to make visible is stated exactly instead — as
   the delta, in text, beside the card's own heading.

   **Which marker is which is form, not hue.** The composition asks for dark teal
   against turquoise; `--ansr-teal-bright` is 2.44:1 on white and is not available for a
   mark on a light ground at any size, so the pair is a filled disc against a ring — the
   same fill-against-outline device every other chart here uses, and the one that
   survives greyscale. The base takes the fill because it is the reference point the
   card is read against.

   **There is no legend, and there is no key beside a figure either.** The composition asks
   for a shared Tier 1 / Tier 2 legend above the three cards, which is what a chart needs
   when its marks are unlabelled. These marks are labelled — each one carries its own
   column name directly above it — so a legend would be the same two strings a third and
   fourth time in one section. The device the labels replaced was a disc and a ring drawn
   beside the old display figures, which is now the same repetition one step smaller.
   ========================================================================== */

export interface IndexSpreadPoint {
  /** The column this figure came from. Drawn as its label. */
  column: string;
  /** Already formatted. */
  figure: string;
  /** 0 to 1 against the axis shared by the whole metric. */
  share: number;
}

export function IndexSpread({
  base,
  comparator,
}: {
  base: IndexSpreadPoint;
  comparator: IndexSpreadPoint;
}) {
  const start = Math.min(base.share, comparator.share);
  const end = Math.max(base.share, comparator.share);
  return (
    // `.gcc-index-rail` holds every measurement, because the rail's offset is derived
    // from the reserved label row and two copies of that number is how a rail stops
    // meeting its marks. It also carries the half-marker inset at each end: the axis runs
    // zero to the base, so the base's share is 1 by construction and its mark would
    // otherwise hang half outside the column.
    <dl className="gcc-index-rail">
      <div aria-hidden="true" className="gcc-index-rail__line" />
      {/* The gap between the two points, which is what this card is about. */}
      <div
        aria-hidden="true"
        className="gcc-index-rail__span"
        style={
          {
            "--gcc-from": `${start * 100}%`,
            "--gcc-span": `${Math.max(end - start, 0) * 100}%`,
          } as React.CSSProperties
        }
      />
      {/* **Zero, drawn and labelled, which is the record of refusing the supplied 50-to-125
          axis.** The reference's domain puts 75 against 100 a third of the way along a
          track rather than three quarters, and `project.md` bans exactly that for a cost
          index. Axis furniture rather than a point being compared, so the whole item is
          hidden and its figure is muted — the two real readings are the `dt`/`dd` pairs
          below it. */}
      <div
        aria-hidden="true"
        className="gcc-index-rail__item"
        style={{ "--gcc-at": "0%" } as React.CSSProperties}
      >
        <span className="gcc-index-rail__label" />
        <span className="gcc-index-rail__tick" />
        <span className="gcc-index-rail__figure text-lg leading-tight font-medium text-text-muted tabular-nums">
          0
        </span>
      </div>
      {[base, comparator].map((point, index) => (
        <div
          key={point.column}
          className="gcc-index-rail__item"
          style={{ "--gcc-at": `${point.share * 100}%` } as React.CSSProperties}
        >
          {/* **The column's name above its own mark, at ANSR's request.** It sat above a
              display figure with a disc or a ring beside it; on the mark it names, the
              marker's shape needs no key at all. In the DOM the term still precedes its
              definition, so a screen reader reads "Tier 1, 100". */}
          <dt className="gcc-index-rail__label text-xs font-medium text-text-muted">
            {point.column}
          </dt>
          {/* Form, not hue: a disc for the base, a ring for the comparator. The
              composition asks for dark teal against turquoise, and `--ansr-teal-bright` is
              2.44:1 on white, so it is unavailable for a mark on a light ground at any
              size. Decorative — its figure is directly below it. */}
          <span
            aria-hidden="true"
            className={cn(
              "gcc-index-rail__dot",
              index === 0 ? "gcc-index-rail__dot--base" : undefined,
            )}
          />
          {/* **The heading teal, never the orange.** A card's own value is evidence inside
              a section; the tab's one orange role is the figure row at the head of it, and
              two orange roles in one band is what the brand rule forbids. `--ansr-accent`
              is 6.63:1 on white and legal at any size.

              `text-lg` rather than the `text-3xl` the deleted pair held: three figures now
              share one row, and the two that matter sit 15 to 25% of the rail apart, which
              at the display step would collide on the narrowest card this draws in. */}
          <dd className="gcc-index-rail__figure text-lg leading-tight font-bold tracking-display text-accent-teal tabular-nums">
            {point.figure}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/* ==========================================================================
   IndexTable — an index grid read as a table

   `IndexLollipop` above draws the same data as one plotted row per measure, which is
   what a derived tab gets. This is the reading the finance composition asks for, and
   the argument for it is about what the reader is doing: four functions against five
   locations is twenty figures that are compared DOWN a column as much as along a row,
   and a plot per row cannot be read down. A table can.

   Three things make it a table rather than a grid of boxes:

     - **Every cell states its exact index**, so nothing is encoded only by length.
       Which is now the ONLY encoding — see below.
     - **The base column is the one thing marked, and it is marked by INK ALONE** — bold
       in the heading teal, on a column holding the identical figure in every row by
       definition, so it is the reference the other four are read against rather than a
       value competing with them. It had a `surface-pale` band as well and ANSR asked for
       it off; see the cell below.
     - **Row separators and nothing else.** No boxed cells: a border around every cell
       would draw twenty rectangles over twenty numbers.

   **THE BARS ARE GONE, AND SO IS THE EMPHASISED ROW, both at ANSR's request.** Each
   non-base cell drew a bare teal bar beside its figure, all sixteen against the grid's
   own largest cell, and the reader's own function was filled a step to mark the row they
   were on. Two things came off with them and are worth knowing before either is
   restored. The bars were this card's only visual encoding of magnitude, so a reader now
   compares twenty numbers as numbers — which is defensible for a small index grid and
   would not be for a wider one. And the emphasised row was the one place this screen read
   an admin-editable string; with it gone, `IndexTable` reads none, and `DeliveryLocations`
   no longer needs to know which tab it is on.

   **The figures are CENTRED in equal columns, at ANSR's request, and the two go
   together.** Start-aligned digits in auto-width columns put each column's numbers hard
   against a boundary whose position was decided by the longest header on it — so
   "PHILIPPINES" pushed its own three digits into the middle of a wide column while
   "MEXICO" held its against the left of a narrow one, and the twenty figures read as
   five ragged groups rather than one grid. A fixed layout gives every location column
   the same width and centring puts the digits on that column's own axis, which is what
   makes a column readable DOWN — the reading this component exists for. `tabular-nums`
   already guarantees the digits themselves align.

   The row-header column takes a quarter and the five locations divide the rest, so the
   equal widths are a property of the table rather than of the strings in it. The minimum
   width is back for a different reason from the one that removed it: a fixed layout never
   overflows, so without it a phone would compress each column until its own header
   wrapped to three lines. It is the container that scrolls, never the document.
   ========================================================================== */

export interface IndexTableRow {
  label: string;
  cells: ReadonlyArray<{
    column: string;
    figure: string;
    /**
     * 0 to 1 against the axis shared by the whole grid.
     *
     * **Unread here now the bars are gone**, and kept because it is the view model's own
     * shape — `IndexLollipop` draws the same rows on a derived tab and does read it.
     */
    share: number;
    /** The index base column. Exactly one per row. */
    anchor: boolean;
  }>;
}

export function IndexTable({
  columns,
  rows,
  rowHeader,
  labelledBy,
}: {
  columns: readonly string[];
  rows: readonly IndexTableRow[];
  /** What the row labels are, for the corner cell. */
  rowHeader: string;
  labelledBy: string;
}) {
  return (
    /* Focusable and named, because a table wider than its card scrolls INSIDE its own
       container — the tool is framed and does not own the document's horizontal scroll.
       Same contract as `NumberGridChart` and `OrdinalGrid`. */
    <div
      className="min-w-0 overflow-x-auto"
      tabIndex={0}
      role="group"
      aria-labelledby={labelledBy}
    >
      {/* `table-fixed`, which is what makes the five location columns equal — under auto
          layout each one sized to its own header and no two were the same width. The
          minimum is what the fixed layout costs on a phone: with nothing to overflow, six
          columns would divide a 340px card and every header would wrap. `min-w-xl` and
          not a step above it, because the tablet card is the width that decides this — at
          `2xl` the last location fell outside a 768 card and had to be scrolled to, on a
          layout that fits there unaided. */}
      <table className="w-full min-w-xl table-fixed border-collapse text-sm">
        <thead>
          <tr>
            {/* A quarter to the row labels, so the remaining five divide the rest evenly
                — the widths come from the table, not from the longest string in it. */}
            <th
              scope="col"
              className="w-1/4 pb-3 pe-4 text-start text-xs font-semibold tracking-caps text-text-muted uppercase"
            >
              {rowHeader}
            </th>
            {columns.map((column) => (
              /* Centred, and the padding is symmetric for the same reason: the header
                 sits on its column's own axis, directly above the digits. */
              <th
                key={column}
                scope="col"
                className="px-3 pb-3 text-center text-xs font-semibold tracking-caps text-text-muted uppercase"
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
                className="py-3 pe-4 text-start align-middle text-sm font-medium whitespace-nowrap text-text"
              >
                {row.label}
              </th>
              {row.cells.map((cell) => (
                <td
                  key={cell.column}
                  /**
                   * **NO FILL ON THE BASE COLUMN, at ANSR's request, and the table has
                   * no fill anywhere now.** The base carried `surface-pale` — the same
                   * ~2% tint that marks India's column in the technology capability grid
                   * — on the argument that the reference the other four are read against
                   * has to be findable. It read as a light blue band down the middle of a
                   * cost table, which is one highlight too many on a card whose bars and
                   * whose emphasised row were already removed for being emphasis nobody
                   * asked for.
                   *
                   * What marks the base is its INK, which is the same signal at a
                   * fraction of the weight: bold in the heading teal against normal in
                   * the body ink, on a column that holds the identical figure in every
                   * row by definition. Restoring the fill is one class here — and it is
                   * the third emphasis this card has lost, so restore it only on a
                   * request that names it.
                   */
                  className="px-3 py-3 text-center align-middle"
                >
                  {/* One element per cell, which is what aligns the columns. The flex row
                      that held a figure beside a bar is gone with the bar. */}
                  <span
                    className={cn(
                      "tabular-nums",
                      cell.anchor
                        ? "font-bold text-accent-teal"
                        : "font-normal text-text",
                    )}
                  >
                    {cell.figure}
                  </span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
