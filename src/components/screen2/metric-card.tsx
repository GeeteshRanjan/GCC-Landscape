import {
  Cloud,
  CodeXml,
  Database,
  Layers,
  Settings,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

import type { HeldMetric, MetricWidth, ShownMetric } from "@/data/screen2";
import { cn } from "@/lib/utils";
import { Block, Panel } from "@/components/public/primitives";
import {
  AdjacentBlocks,
  Dumbbells,
  FigureRow,
  IndexLollipop,
  Journey,
  NestedBar,
  NumberGridChart,
  OrdinalGrid,
  RangeBar,
  RankedBars,
  StackedShare,
} from "@/components/public/charts";
import {
  HELD_CHIP,
  heldShapeNote,
  indexedNote,
  RATING_KEY_LABEL,
} from "./copy";

/**
 * One metric, drawn.
 *
 * **This file selects no charts, does no arithmetic, and no longer owns a card
 * shell.** Chart selection is `breakdownDisplay` / `gridDisplay` in
 * `src/data/screen2.ts`, widths and packing are `layoutArea` there, and the card is
 * `Panel` from `components/public/primitives.tsx` — the same component Screen 1's
 * evidence is built from. What is left here is which chart component receives which
 * fields.
 *
 * **The bespoke `Card` that used to live here is gone, and its own comment is what
 * retired it.** It justified bordering every card on the grounds that the selected
 * view tab had become a white surface the content must be continuous with, so a white
 * card on a white ground had no edge to borrow. That stopped being true when the
 * switch became the floating card's top row: the tab is now filled with the content's
 * own ground by construction, and the joint it was reasoning about is the absence of
 * anything rather than two edges lined up. What decides a border now is Screen 1's
 * earned-border rule, and these cards earn one — every card in this grid draws a
 * MARK, and a bar's full width means nothing without an edge to measure it against.
 *
 * The scalars do not earn one and are not here at all: they are `FunctionFigures`
 * below, which is the figure row.
 *
 * The chart vocabulary is `components/public/charts.tsx`, shared with Screen 1 so a
 * bar means the same thing on both. Its governing rule is why there is no charting
 * library under it: every mark carries its figure in text beside it and nothing is
 * behind a hover, because a tooltip puts the number one pointer-hover away, which on
 * a phone is nowhere.
 */

/* ==========================================================================
   Chrome
   ========================================================================== */

/**
 * How a card's width maps onto the grid.
 *
 * **Two values, and it is correct at every breakpoint for the first time.** `third`
 * mapped to `sm:col-span-6 lg:col-span-4`, so between `sm` and `lg` a third was
 * really a half — and the packing rule reasoned in thirds-of-twelve, which is why it
 * could leave a hole at 768 that never appeared at 1440. A half is six columns at
 * every width the grid has columns at, so there is no width whose meaning changes.
 *
 * **The grid starts at `lg`, not at `sm`, and 768 is why.** Two cards abreast from
 * 640px gave each of them a 300–490px column, and both of technology's halves broke in
 * it: the graduate blocks put a 24px figure inside a proportional block 81px wide, and
 * the specialism rows had to fit a name, a bar and a figure into 350px, which wrapped
 * the figure onto its own line under the label. A tablet is a one-column reading of
 * this screen and always was — the previous grid simply never had a card narrow enough
 * to notice. Below `lg` there are no grid columns at all, so a card is full width and
 * every width class is inert.
 */
const WIDTH_CLASS: Record<MetricWidth, string> = {
  half: "lg:col-span-6",
  full: "lg:col-span-12",
};

/**
 * What a figure needs to be read correctly: how to take the index, how to take the
 * plus, and where it came from.
 *
 * The unit is not here — it travels with the figure, and a set-level unit
 * ("graduates a year") travels as the chart's axis note, where it labels every part
 * at once.
 */
function CardMeta({
  indexBaseline,
  asOf,
}: {
  indexBaseline?: string;
  asOf?: string;
}) {
  const parts = [
    // `indexedNote`, not a literal: the composed finance cards state the same string as
    // a card SUBTITLE rather than as a foot note, and two copies of the prefix would let
    // one of them be reworded alone.
    indexBaseline ? indexedNote(indexBaseline) : undefined,
    // The floor sentence ("+ indicates a floor…") was removed at ANSR's request; the
    // trailing `+` on the figure carries it now, unexplained.
    // Verbatim, not prefixed with "As of". The schema calls this free-text
    // provenance rather than a date, so a prefix turns a phrase into nonsense the
    // moment somebody types anything other than a quarter.
    asOf,
  ].filter((part): part is string => Boolean(part));

  if (parts.length === 0) return null;
  return <p className="text-xs text-text-muted">{parts.join(" · ")}</p>;
}

/* ==========================================================================
   The figure row moved out of this file

   **Every tab's opening row of figures is `SummaryFigures` now, in
   `summary-figures.tsx`.** This file drew technology's — with a line glyph over each
   figure and CSS hairlines between the cells — while HR, operations and finance each
   drew their own, so one screen had four different opening objects. One component
   draws all four, on Screen 1's snapshot treatment; the reasoning, including why the
   glyphs and the dividers went, is on that file.
   ========================================================================== */

/* ==========================================================================
   The open card
   ========================================================================== */

export function MetricCard({
  shown,
  width,
  container = "panel",
}: {
  shown: ShownMetric;
  /** From `layoutArea`, already packed, so the component does no arithmetic. */
  width: MetricWidth;
  /**
   * Whether the card draws its own edge.
   *
   * **`panel` is the default, which reverses a recorded decision and puts this screen
   * back on the peer view's rule.** For one pass it was `block`: the argument was that
   * the zones do the sectioning, so a boundary between sections is a colour change
   * rather than two hairlines, and that an inline ranked row puts its bar in a 38%
   * middle column with no track, so the card's edge was never what the bar measured
   * against. Both halves are still true and neither was the problem.
   *
   * What settled it is that the other three tabs never gave their borders up. So the
   * one screen carried borderless cards on technology and bordered ones on HR,
   * operations and finance — a difference a visitor meets by clicking a tab, with
   * nothing behind it but which file drew the tab. The peer view answers the same
   * question one way for the whole surface: a block that draws a MARK gets a `Panel`,
   * a grid of its own cards or a run of text gets a `Block`, and the zones alternate
   * underneath both. Every card in this grid draws a mark.
   *
   * `block` is kept and is not dead: it is what a section of text or of its own cards
   * would take, and it is one prop away.
   */
  container?: "panel" | "block";
}) {
  const { metric } = shown;
  // Both containers derive their heading id as `${id}-heading`, which is the id the
  // grid charts point `aria-labelledby` at.
  const panelId = `metric-${metric.id}`;
  const headingId = `${panelId}-heading`;
  const Container = container === "panel" ? Panel : Block;

  return (
    <Container
      id={panelId}
      title={metric.title}
      className={WIDTH_CLASS[width]}
      /* The card grid stretches its row to one bottom edge, so the body takes the
         surplus and centres the chart in it — otherwise the shorter chart sits at the
         top of a tall card and the empty space just moves inside the border. `Block`
         takes no `bodyClassName`, so this is passed only where the container is a
         `Panel`, which is every card in the grid today. */
      {...(container === "panel"
        ? { bodyClassName: "flex flex-col grow justify-center" }
        : {})}
    >
      {/* One column with a real gap, so `CardMeta` is not butted against the last
          row of the chart above it. Neither container supplies one — `Panel`'s body
          and `Block`'s both stack their children — and the reading instruction is the
          one element on the card that must not look like part of the chart. */}
      <div className="flex flex-col gap-4">
      {shown.shape === "scalar" ? (
        // Unreachable through `layoutArea`, which routes every scalar to the figure
        // row. Kept so a card can still render one rather than nothing.
        <p className="text-3xl leading-tight font-bold tracking-display text-text tabular-nums md:text-4xl">
          {shown.figure}
        </p>
      ) : null}

      {shown.shape === "range" ? (
        <RangeBar
          low={shown.low}
          high={shown.high}
          lowLabel={shown.lowLabel}
          highLabel={shown.highLabel}
          offset={shown.offset}
          unit={metric.unit}
        />
      ) : null}

      {shown.shape === "breakdown" ? (
        <BreakdownChart shown={shown} unit={metric.unit} />
      ) : null}

      {shown.shape === "grid" && shown.grid.kind === "numbers" ? (
        <NumberGridChart
          columns={shown.grid.columns}
          rows={shown.grid.rows}
          labelledBy={headingId}
        />
      ) : null}

      {shown.shape === "grid" && shown.grid.kind === "lollipop" ? (
        <IndexLollipop
          rows={shown.grid.rows}
          baselineShare={shown.grid.baselineShare}
          baselineLabel={shown.grid.baselineColumn}
          axisNote={metric.unit}
        />
      ) : null}

      {shown.shape === "grid" && shown.grid.kind === "dumbbell" ? (
        <Dumbbells rows={shown.grid.rows} axisNote={metric.unit} />
      ) : null}

      {shown.shape === "grid" && shown.grid.kind === "ratings" ? (
        <OrdinalGrid
          columns={shown.grid.columns}
          steps={shown.grid.steps}
          rows={withRowIcons(shown.grid.rows)}
          anchorColumn={shown.grid.anchorColumn}
          labelledBy={headingId}
          keyLabel={RATING_KEY_LABEL}
        />
      ) : null}

      <CardMeta indexBaseline={metric.indexBaseline} asOf={metric.asOf} />
      </div>
    </Container>
  );
}

/**
 * A glyph beside each capability in the comparison grid.
 *
 * **Keyed off the row LABEL, which is the one place on this screen that reads one,
 * and it is licensed by what happens when it is wrong.** Every other rule here is
 * forbidden from parsing a label because the consequence is a changed CLAIM — a
 * renamed part silently redrawing a chart, or a parsed axis name changing a number.
 * The consequence here is a missing 16px outline glyph, and the grid says exactly the
 * same thing without it.
 *
 * The all-or-nothing guard is the same as the figure row's, for the same reason: five
 * rows of which four have a glyph reads as one that failed to load. A renamed row
 * therefore drops the whole column rather than leaving a gap in it.
 *
 * `FIGURE_ICONS` is keyed by id and this is not, because a matrix row is not a metric
 * — it is one of the admin-editable strings inside one, and there is no id to key on.
 */
const CAPABILITY_ICONS: Record<string, LucideIcon> = {
  "Product engineering": CodeXml,
  "Data and AI": Database,
  "Cloud and platform": Cloud,
  Cybersecurity: ShieldCheck,
  "Enterprise technology": Settings,
  // The two other matrix row vocabularies a rated grid could arrive with. Present so
  // the guard is satisfiable on more than the one grid it was written for.
  "Shared services": Layers,
  Engineering: Settings,
};

function withRowIcons<T extends { label: string }>(
  rows: readonly T[],
): Array<T & { icon?: React.ReactNode }> {
  const mapped = rows.every((row) => CAPABILITY_ICONS[row.label] !== undefined);
  if (!mapped) return rows.map((row) => ({ ...row }));
  return rows.map((row) => {
    // Non-null by the guard above, which the compiler cannot see.
    const Icon = CAPABILITY_ICONS[row.label]!;
    return {
      ...row,
      icon: <Icon aria-hidden="true" strokeWidth={1.5} className="size-4.5" />,
    };
  });
}

/**
 * One of five readings of a set of named parts.
 *
 * Which one is `shown.display`, decided from the values in `screen2.ts`. The ones
 * that are not a bar chart are the interesting ones, and each exists because a bar
 * would have been actively worse:
 *
 *   - `stack` — a percentage split that sums to a whole. Four bars against a 100%
 *     axis say "each of these is some of it"; one divided bar says "these four
 *     are all of it", which is the claim.
 *   - `figures` — percentages clustered at the top of their domain. On an honest
 *     axis 99.95% and 99.5% draw as identical bars; on a truncated one they draw
 *     a difference that is not there. So no bar, and the figures carry it.
 *   - `journey` — the parts are waypoints on one path. Bars from a shared zero
 *     say "four separate quantities" about one centre measured four times.
 */
function BreakdownChart({
  shown,
  unit,
}: {
  shown: Extract<ShownMetric, { shape: "breakdown" }>;
  unit?: string;
}) {
  switch (shown.display) {
    case "stack":
      return <StackedShare parts={shown.parts} axisNote={unit} />;

    case "figures":
      return <FigureRow parts={shown.parts} />;

    case "journey":
      // Guarded rather than asserted, like `nested` below: `breakdownDisplay` only
      // returns "journey" when the legs can be built, and a half-drawn card is the
      // thing worth avoiding.
      return shown.legs ? (
        <Journey legs={shown.legs} axisNote={unit} />
      ) : (
        <RankedBars rows={shown.parts} axisNote={unit} inline />
      );

    case "adjacent": {
      /**
       * Two proportional blocks side by side, asserting nothing about how the two
       * populations relate. See `AdjacentBlocks` and `subset` in `schema.ts` — this is
       * what a two-part breakdown draws when containment is NOT claimed, and the
       * graduate pair is the case it exists for.
       */
      const blocks = shown.parts.flatMap((part) =>
        part.span === undefined
          ? []
          : [{ label: part.label, figure: part.figure, span: part.span }],
      );
      // Guarded rather than asserted, like the two below: `span` is set on exactly the
      // parts of an adjacent breakdown, and a half-drawn card is the thing worth
      // avoiding.
      return blocks.length === shown.parts.length ? (
        <AdjacentBlocks blocks={blocks} unit={unit} />
      ) : (
        <RankedBars rows={shown.parts} axisNote={unit} inline />
      );
    }

    case "nested": {
      const [total, part] = shown.parts;
      // Guarded rather than asserted: `breakdownDisplay` only returns "nested"
      // for exactly two parts, and a half-drawn card is the thing worth avoiding.
      if (!total || !part)
        return <RankedBars rows={shown.parts} axisNote={unit} inline />;
      return (
        <NestedBar
          total={{ label: total.label, figure: total.figure }}
          part={{
            label: part.label,
            figure: part.figure,
            // Against the total rather than against the chart's own scale, which
            // is what makes it a containment rather than a comparison.
            share: part.share,
          }}
          axisNote={unit}
        />
      );
    }

    case "bars":
      /**
       * **`inline`, which is a third of the height and is the same chart.** Label, bar
       * and figure on one line, with the bar as the middle column and no grey track
       * behind it. Safe here because every bar set this screen draws is ranked by the
       * quantity its bars encode, so row one is full width and states the axis — the
       * self-labelling exemption. It wraps back to the two-line layout below `sm`.
       */
      /**
       * **The unit heads the figure COLUMN now instead of sitting under the chart.** As an
       * `axisNote` "professionals" rendered at the foot of the card, after the seven
       * figures it qualifies — so the numerals were unlabelled where they are actually
       * read. See `quantityHeader` on `RankedBars`; it is the peer view's own device.
       */
      return (
        <RankedBars
          rows={shown.parts}
          quantityHeader={unit}
          dense={shown.parts.length > 5}
          inline
          bareTrack={shown.selfLabelling}
        />
      );
  }
}

/* ==========================================================================
   The held card

   The screen's hardest visual problem: a placeholder that reads as deliberately
   withheld rather than as broken or as still loading.

   Four choices carry it, and each rules something out:

     - **Uniform, hard-edged, static blocks.** A loading skeleton varies its widths
       to imitate text and animates to say "wait". These do neither: every block
       in a row is the same size and nothing moves, so there is nothing to wait
       for. The hatch is what makes them read as sealed rather than as an
       unstyled div.
     - **The cardinality is real and stated in words.** "Five rows across five
        columns" is exactly what the gate leaves us — `publicMetric` drops the row
        and column names, the unit and the index base, because a row label beside a
        visible axis can imply the answer. So the shape is drawn true and named in
        text, and nothing is invented to fill it.
     - **A stronger border and a chip, not a dimmer card.** Dimming says
       unavailable. A firmer edge says closed. That is `tone="sealed"` on `Panel`
       now rather than a bespoke shell here, so a held card and an open one cannot
       drift apart in radius, padding or heading scale.
     - **Never a blur over real text.** There is no real text here to blur: the
       value never reached the browser, and `GatedMetric` has no field it could
       have travelled in.
   ========================================================================== */

/** One withheld slot. Uniform by design — a varying width would imply a value. */
function HeldBlock({ className }: { className?: string }) {
  return <span className={cn("gcc-held block", className)} />;
}

function HeldShape({ shape }: { shape: HeldMetric["metric"]["shape"] }) {
  // Hidden wholesale: `heldShapeNote` says the same thing in words, and a grid of
  // empty blocks announced cell by cell is noise with no content in it.
  switch (shape.kind) {
    case "scalar":
      return (
        <div aria-hidden="true">
          <HeldBlock className="h-10 w-40" />
        </div>
      );

    case "range":
      return (
        <div aria-hidden="true" className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <HeldBlock className="h-8 w-24" />
            <HeldBlock className="h-8 w-24" />
          </div>
          <HeldBlock className="h-2 w-full" />
        </div>
      );

    case "breakdown":
      return (
        <div aria-hidden="true" className="flex flex-col gap-3">
          {Array.from({ length: shape.entries }, (_, index) => (
            <div key={index} className="flex flex-col gap-1.5">
              <HeldBlock className="h-3 w-32" />
              <HeldBlock className="h-2 w-full" />
            </div>
          ))}
        </div>
      );

    case "matrix":
      return (
        <div aria-hidden="true" className="flex flex-col gap-2">
          {Array.from({ length: shape.rows }, (_, rowIndex) => (
            <div
              key={rowIndex}
              className="grid gap-2"
              style={{
                gridTemplateColumns: `repeat(${shape.columns}, minmax(0, 1fr))`,
              }}
            >
              {Array.from({ length: shape.columns }, (_, columnIndex) => (
                <HeldBlock key={columnIndex} className="h-6 w-full" />
              ))}
            </div>
          ))}
        </div>
      );
  }
}

export function HeldMetricCard({
  held,
  width,
}: {
  held: HeldMetric;
  /** From `layoutArea`. The held grid is packed now too — it used to leave a hole. */
  width: MetricWidth;
}) {
  const { metric } = held;

  return (
    <Panel
      id={`metric-${metric.id}`}
      title={metric.title}
      tone="sealed"
      className={WIDTH_CLASS[width]}
      chip={HELD_CHIP}
      // Under the held group's own `h2`, so a level down. The size is unchanged —
      // a sealed card is not a smaller card, it is a closed one.
      headingLevel={3}
    >
      <HeldShape shape={metric.shape} />
      <p className="text-xs text-text-muted">{heldShapeNote(metric.shape)}</p>
    </Panel>
  );
}
