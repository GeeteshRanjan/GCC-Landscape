import type { HeldMetric, MetricWidth, ShownMetric } from "@/data/screen2";
import { cn } from "@/lib/utils";
import { Chip } from "@/components/public/primitives";
import {
  Dumbbells,
  FigureRow,
  IndexLollipop,
  NestedBar,
  NumberGridChart,
  OrdinalGrid,
  RangeBar,
  RankedBars,
  StackedShare,
} from "@/components/public/charts";
import { HELD_CHIP, heldShapeNote, RATING_KEY_LABEL } from "./copy";

/**
 * One metric, drawn.
 *
 * **This file selects no charts and does no arithmetic.** Both used to happen
 * here, and both moved: every figure arrives as a string, every mark as a
 * fraction, and which of the nine renderings a metric gets is decided by
 * `breakdownDisplay` / `gridDisplay` in `src/data/screen2.ts`, where a test can
 * pin it. What is left here is layout — which is the only thing a component
 * should have an opinion about.
 *
 * The chart vocabulary itself is `components/public/charts.tsx`, shared with
 * Screen 1 so a bar means the same thing on both. Its governing rule is worth
 * repeating because it is what rules out a charting library here: every mark
 * carries its figure in text beside it and nothing is behind a hover. A
 * tooltip-driven chart puts the number one pointer-hover away, which on a phone
 * is nowhere.
 */

/* ==========================================================================
   Chrome
   ========================================================================== */

/**
 * How a card's width maps onto the grid.
 *
 * Twelve columns rather than two, because widths are now weighted by what the
 * card draws — see `metricWidth`. Two columns could only ever express "half" and
 * "full", which is what produced the layout's worst artefact: a single figure
 * paired with a nine-part breakdown stretched to the taller card's height, and
 * rendered as a card four fifths full of nothing.
 */
const WIDTH_CLASS: Record<MetricWidth, string> = {
  third: "sm:col-span-6 lg:col-span-4",
  half: "sm:col-span-6",
  full: "sm:col-span-12",
};

function Card({
  width,
  sealed = false,
  children,
}: {
  width: MetricWidth;
  /** A held metric. Bordered strongly, so it reads as closed rather than empty. */
  sealed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <li
      className={cn(
        // `self-start` is the other half of the stretch fix: a grid item stretches
        // to its row by default, so even correct widths would leave a short card
        // padded out to a tall neighbour. Height follows content instead.
        "flex flex-col gap-5 self-start rounded-md bg-surface p-6 md:p-7",
        /**
         * **Every card is bordered now, and the reason is the tab strip.** An open
         * card used to be borderless and take its edge from the pale-teal band the
         * grid sat on — which worked, and stopped working when the selected view tab
         * became a white surface that has to be continuous with the content beneath
         * it. A white tab meeting a teal band is not one layer, so this screen's
         * ground went white, and a white card on a white ground has no edge to
         * borrow.
         *
         * A SEALED card keeps the STRONGER edge, which is what it always was: that
         * firmer outline is the whole signal that the slot is closed rather than
         * empty, and it now has to be a step above its neighbours rather than the
         * only border on the screen.
         */
        sealed ? "border-2 border-border-strong" : "border border-border",
        WIDTH_CLASS[width],
      )}
    >
      {children}
    </li>
  );
}

function CardHead({
  id,
  title,
  question,
  chip,
  level,
}: {
  id: string;
  title: string;
  question: string;
  chip?: string;
  /**
   * 3 for an open card, which sits directly under the band's own h2; 4 for a held
   * one, which sits under the held group's h3. Levels are a real outline, not a
   * size — skipping one leaves a screen-reader user with a broken structure.
   */
  level: 3 | 4;
}) {
  const Heading = level === 3 ? "h3" : "h4";
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
        <Heading
          id={id}
          className="text-xl font-bold tracking-heading text-text"
        >
          {title}
        </Heading>
        {chip ? <Chip>{chip}</Chip> : null}
      </div>
      {/* The reason the card is on the screen, in the visitor's terms — not a
          restatement of its title. */}
      <p className="max-w-measure text-sm text-text-muted">{question}</p>
    </div>
  );
}

/**
 * Provenance a figure needs to be readable: the index base, and where it came
 * from.
 *
 * The unit is no longer here. It used to sit in this row alongside them, which
 * put "days" two lines below "40 to 90" with the end labels in between, reading
 * as an orphan rather than as part of the figure. It travels with the figure now,
 * and a set-level unit ("graduates a year") travels as the chart's axis note,
 * where it labels every part at once.
 */
function CardMeta({
  indexBaseline,
  asOf,
}: {
  indexBaseline?: string;
  asOf?: string;
}) {
  const parts = [
    indexBaseline ? `Indexed: ${indexBaseline}` : undefined,
    // Verbatim, not prefixed with "As of". The schema calls this free-text
    // provenance rather than a date, so a prefix turns a phrase into nonsense the
    // moment somebody types anything other than a quarter.
    asOf,
  ].filter((part): part is string => Boolean(part));

  if (parts.length === 0) return null;
  return <p className="text-xs text-text-muted">{parts.join(" · ")}</p>;
}

/**
 * A figure and its unit on one line.
 *
 * Sized down from the previous 48px display, which is the size Screen 1's
 * national scale figures use. Three of those on a tab, then five more, spends the
 * emphasis until none of them has any — and a metric card's figure is evidence
 * inside an argument rather than the headline of a band.
 */
function ScalarValue({ figure, unit }: { figure: string; unit?: string }) {
  return (
    <p className="flex flex-wrap items-baseline gap-x-3 text-3xl leading-tight font-bold tracking-display text-text tabular-nums md:text-4xl">
      {figure}
      {unit ? (
        <span className="text-sm font-medium text-text-muted">{unit}</span>
      ) : null}
    </p>
  );
}

/* ==========================================================================
   The open card
   ========================================================================== */

export function MetricCard({
  shown,
  width,
}: {
  shown: ShownMetric;
  /** From `metricWidth`, so the grid and the ordering agree on one value. */
  width: MetricWidth;
}) {
  const { metric } = shown;
  const headingId = `metric-${metric.id}-heading`;

  return (
    <Card width={width}>
      <CardHead
        id={headingId}
        title={metric.title}
        question={metric.question}
        level={3}
      />

      {shown.shape === "scalar" ? (
        <ScalarValue figure={shown.figure} unit={metric.unit} />
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
          rows={shown.grid.rows}
          anchorColumn={shown.grid.anchorColumn}
          labelledBy={headingId}
          keyLabel={RATING_KEY_LABEL}
        />
      ) : null}

      <CardMeta indexBaseline={metric.indexBaseline} asOf={metric.asOf} />
    </Card>
  );
}

/**
 * One of four readings of a set of named parts.
 *
 * Which one is `shown.display`, decided from the values in `screen2.ts`. The two
 * that are not a bar chart are the interesting ones, and both exist because a bar
 * would have been actively worse:
 *
 *   - `stack` — a percentage split that sums to a whole. Four bars against a 100%
 *     axis say "each of these is some of it"; one divided bar says "these four
 *     are all of it", which is the claim.
 *   - `figures` — percentages clustered at the top of their domain. On an honest
 *     axis 99.95% and 99.5% draw as identical bars; on a truncated one they draw
 *     a difference that is not there. So no bar, and the figures carry it.
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

    case "nested": {
      const [total, part] = shown.parts;
      // Guarded rather than asserted: `breakdownDisplay` only returns "nested"
      // for exactly two parts, and a half-drawn card is the thing worth avoiding.
      if (!total || !part) return <RankedBars rows={shown.parts} axisNote={unit} />;
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
      return (
        <RankedBars
          rows={shown.parts}
          axisNote={unit}
          dense={shown.parts.length > 5}
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
       unavailable. A firmer edge says closed.
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

export function HeldMetricCard({ held }: { held: HeldMetric }) {
  const { metric } = held;

  return (
    <Card width={metric.shape.kind === "matrix" ? "full" : "half"} sealed>
      <CardHead
        id={`metric-${metric.id}-heading`}
        title={metric.title}
        question={metric.question}
        chip={HELD_CHIP}
        level={4}
      />
      <HeldShape shape={metric.shape} />
      <p className="text-xs text-text-muted">{heldShapeNote(metric.shape)}</p>
    </Card>
  );
}
