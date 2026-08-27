import type { MetricGrid, ShownMetric, HeldMetric } from "@/data/screen2";
import { cn } from "@/lib/utils";
import { Chip } from "@/components/public/primitives";
import {
  HELD_CHIP,
  heldShapeNote,
  RANGE_HIGH_FALLBACK,
  RANGE_LOW_FALLBACK,
  RATING_KEY_LABEL,
} from "./copy";

/**
 * One metric, drawn.
 *
 * Five renderings, which is every shape the catalogue can produce: a single
 * figure, a spread, a set of named parts, a number grid, and the rating variant of
 * a grid. Plus a sixth thing that is not a rendering of a value at all — the
 * shape-only placeholder for a metric whose figures never left the server.
 *
 * No arithmetic here. Every figure arrives as a string and every bar as a
 * fraction, from `src/data/screen2.ts`, so what a bar is a share of is a tested
 * decision rather than an expression buried in a style attribute.
 *
 * Three rules the drawing follows:
 *
 *   - **A bar never carries a value on its own.** The figure is always beside it
 *     in text, and the bar is `aria-hidden` — it is a second reading of a number
 *     already present, which is why hiding it loses nothing.
 *   - **An ordinal is never colour alone.** A rating cell shows its label as text
 *     and its position as filled steps. Either one read on its own is complete.
 *   - **No shadows, and hairline borders only.** Separation on the public screens
 *     is tint and rule; elevation tokens exist for admin's overlays.
 */

/* ==========================================================================
   Chrome
   ========================================================================== */

function Card({
  span,
  sealed = false,
  children,
}: {
  span: "half" | "full";
  /** A held metric. Bordered strongly, so it reads as closed rather than empty. */
  sealed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <li
      className={cn(
        "flex flex-col gap-4 border bg-surface p-6",
        sealed ? "border-border-strong" : "border-border-subtle",
        span === "full" ? "sm:col-span-2" : "",
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
          className="text-lg font-semibold tracking-heading text-text"
        >
          {title}
        </Heading>
        {chip ? <Chip>{chip}</Chip> : null}
      </div>
      {/* The brief's "Why:" note, in the visitor's terms. The reason the card is
          on the screen, rather than a restatement of its title. */}
      <p className="max-w-measure text-sm text-text-muted">{question}</p>
    </div>
  );
}

/** Unit, index base and as-of date: what a figure needs to be readable at all. */
function CardMeta({
  unit,
  indexBaseline,
  asOf,
}: {
  unit?: string;
  indexBaseline?: string;
  asOf?: string;
}) {
  const parts = [
    unit,
    indexBaseline ? `Indexed: ${indexBaseline}` : undefined,
    // Verbatim, not prefixed with "As of". The schema calls this free-text
    // provenance rather than a date, so a prefix turns a phrase into nonsense the
    // moment somebody types anything other than a quarter. "2026 Q1" reads
    // correctly on its own. Absent for every seeded metric, which renders nothing.
    asOf,
  ].filter((part): part is string => Boolean(part));

  if (parts.length === 0) return null;
  return (
    <p className="text-xs text-text-muted">
      {parts.join(" · ")}
    </p>
  );
}

/** The track every bar sits in. One shape, so nothing drifts card to card. */
function Bar({ share }: { share: number }) {
  return (
    // Hidden: the figure it restates is always in text beside it.
    <div aria-hidden="true" className="h-1.5 w-full bg-surface-sunken">
      <div
        className="h-full bg-accent-teal"
        // A floor, so a genuinely tiny share is still visible as a mark rather
        // than reading as a missing bar.
        style={{ width: `${Math.max(share * 100, 1.5)}%` }}
      />
    </div>
  );
}

/* ==========================================================================
   The five shapes
   ========================================================================== */

/**
 * A figure and, when it has one, its unit on the same line.
 *
 * The unit used to sit in the card's meta row with the index base and the date,
 * which put "days" two lines below "40 to 90" with the end labels in between —
 * where it read as an orphan rather than as part of the figure. A set-level unit
 * like "graduates a year" still belongs in the meta row, because there it labels
 * every part at once rather than one number.
 */
function Unit({ unit }: { unit?: string }) {
  if (!unit) return null;
  return (
    <span className="text-base font-medium text-text-muted">{unit}</span>
  );
}

function ScalarValue({ figure, unit }: { figure: string; unit?: string }) {
  return (
    <p className="flex flex-wrap items-baseline gap-x-3 text-4xl leading-tight font-bold tracking-display text-text tabular-nums md:text-5xl">
      {figure}
      <Unit unit={unit} />
    </p>
  );
}

function RangeValue({
  low,
  high,
  lowLabel,
  highLabel,
  offset,
  unit,
}: {
  low: string;
  high: string;
  lowLabel: string | null;
  highLabel: string | null;
  offset: number;
  unit?: string;
}) {
  const labelled = lowLabel !== null || highLabel !== null;

  return (
    <div className="flex flex-col gap-3">
      <p className="flex flex-wrap items-baseline gap-x-3 text-3xl leading-tight font-bold tracking-display text-text tabular-nums md:text-4xl">
        {low}
        <span className="text-base font-medium text-text-muted">to</span>
        {high}
        <Unit unit={unit} />
      </p>

      {/* The track has no absolute scale to anchor to, so what it shows is how
          wide the spread is against its own upper end: the band runs from the low
          end to the high end on a 0-to-high track, so a long band means "highly
          variable" and a short one "tight".
 
          The two end ticks are what make that readable. Without them a narrow
          spread — 9,000 to 11,000 — drew as a short segment floating at the right,
          which reads as a value near the maximum rather than as a span. Hidden
          from assistive technology, because both ends are in text directly above. */}
      <div
        aria-hidden="true"
        className="relative h-3 w-full"
      >
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 bg-surface-sunken" />
        <div
          className="absolute top-1/2 end-0 h-1.5 -translate-y-1/2 bg-accent-teal"
          style={{ insetInlineStart: `${offset * 100}%` }}
        />
        <div
          className="absolute inset-y-0 w-0.5 bg-accent-teal"
          style={{ insetInlineStart: `${offset * 100}%` }}
        />
        <div className="absolute inset-y-0 end-0 w-0.5 bg-accent-teal" />
      </div>

      {labelled ? (
        // Two labelled ends, deliberately not a <ul>. They are a pair rather than
        // a list, and list semantics inside a card that is itself a list item made
        // "count the cards on this tab" mean something else.
        <div className="grid grid-cols-1 gap-1 text-xs text-text-muted sm:grid-cols-2">
          <p>
            <span className="font-medium text-text tabular-nums">{low}</span>{" "}
            {lowLabel ?? RANGE_LOW_FALLBACK}
          </p>
          <p className="sm:text-end">
            <span className="font-medium text-text tabular-nums">{high}</span>{" "}
            {highLabel ?? RANGE_HIGH_FALLBACK}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function BreakdownValue({
  parts,
}: {
  parts: ReadonlyArray<{ label: string; figure: string; share: number }>;
}) {
  return (
    <dl className="flex flex-col gap-3">
      {parts.map((part) => (
        <div key={part.label} className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4">
            <dt className="text-sm text-text">{part.label}</dt>
            <dd className="text-sm font-semibold text-text tabular-nums">
              {part.figure}
            </dd>
          </div>
          <Bar share={part.share} />
        </div>
      ))}
    </dl>
  );
}

/**
 * A comparison grid, as a real table.
 *
 * `<th scope>` on both axes rather than a grid of divs: a row and a column header
 * is exactly what this is, the semantics are free, and a screen-reader user gets
 * "Compensation, Tier 2 cities, 85" instead of a bare number. The horizontal
 * scroller is focusable, so a keyboard user can reach a grid that is wider than a
 * phone.
 */
function GridFrame({
  columns,
  labelledBy,
  children,
}: {
  columns: readonly string[];
  labelledBy: string;
  children: React.ReactNode;
}) {
  return (
    <div
      // `min-w-0`: inside a column flex container a scroll container will
      // otherwise take its content's width and push the card past the viewport.
      className="min-w-0 overflow-x-auto"
      // Focusable and named, so a keyboard-only user can scroll a grid wider
      // than the card. An unfocusable scroller is unreachable without a pointer.
      tabIndex={0}
      role="group"
      aria-labelledby={labelledBy}
    >
      <table className="w-full min-w-md border-collapse text-sm">
        <thead>
          <tr>
            <th scope="col" className="pb-2 text-start">
              {/* The row-header column has no heading of its own to show, but it
                  still needs a name for the table to read correctly. */}
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
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function GridRowHeader({ label }: { label: string }) {
  return (
    <th
      scope="row"
      className="py-3 pe-4 text-start align-top text-sm font-medium text-text"
    >
      {label}
    </th>
  );
}

function NumberGrid({
  grid,
  labelledBy,
}: {
  grid: Extract<MetricGrid, { kind: "numbers" }>;
  labelledBy: string;
}) {
  return (
    <GridFrame columns={grid.columns} labelledBy={labelledBy}>
      {grid.rows.map((row) => (
        <tr key={row.label} className="border-t border-border-subtle">
          <GridRowHeader label={row.label} />
          {row.cells.map((cell, index) => (
            <td key={grid.columns[index]} className="py-3 ps-4 align-top">
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-text tabular-nums">
                  {cell.figure}
                </span>
                <Bar share={cell.share} />
              </div>
            </td>
          ))}
        </tr>
      ))}
    </GridFrame>
  );
}

function RatingGrid({
  grid,
  labelledBy,
}: {
  grid: Extract<MetricGrid, { kind: "ratings" }>;
  labelledBy: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <GridFrame columns={grid.columns} labelledBy={labelledBy}>
        {grid.rows.map((row) => (
          <tr key={row.label} className="border-t border-border-subtle">
            <GridRowHeader label={row.label} />
            {row.cells.map((cell, index) => (
              <td key={grid.columns[index]} className="py-3 ps-4 align-top">
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-text">{cell.rating}</span>
                  {/* The label above is the whole reading; these are a second,
                      positional one. An ordinal is never colour alone. */}
                  <span aria-hidden="true" className="flex gap-0.5">
                    {grid.steps.map((step, stepIndex) => (
                      <span
                        key={step}
                        className={cn(
                          "h-1.5 w-3",
                          stepIndex < cell.step
                            ? "bg-accent-teal"
                            : "bg-surface-sunken",
                        )}
                      />
                    ))}
                  </span>
                </div>
              </td>
            ))}
          </tr>
        ))}
      </GridFrame>
      <p className="text-xs text-text-muted">
        {RATING_KEY_LABEL}: {grid.steps.join(" · ")}
      </p>
    </div>
  );
}

/* ==========================================================================
   The open card
   ========================================================================== */

export function MetricCard({ shown }: { shown: ShownMetric }) {
  const { metric } = shown;
  const headingId = `metric-${metric.id}-heading`;

  return (
    <Card span={shown.shape === "grid" ? "full" : "half"}>
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
        <RangeValue
          low={shown.low}
          high={shown.high}
          lowLabel={shown.lowLabel}
          highLabel={shown.highLabel}
          offset={shown.offset}
          unit={metric.unit}
        />
      ) : null}
      {shown.shape === "breakdown" ? <BreakdownValue parts={shown.parts} /> : null}
      {shown.shape === "grid" && shown.grid.kind === "numbers" ? (
        <NumberGrid grid={shown.grid} labelledBy={headingId} />
      ) : null}
      {shown.shape === "grid" && shown.grid.kind === "ratings" ? (
        <RatingGrid grid={shown.grid} labelledBy={headingId} />
      ) : null}

      <CardMeta
        // Placed with the figure for a scalar or a range; kept here for a
        // breakdown or a grid, where it labels every part at once.
        unit={
          shown.shape === "scalar" || shown.shape === "range"
            ? undefined
            : metric.unit
        }
        indexBaseline={metric.indexBaseline}
        asOf={metric.asOf}
      />
    </Card>
  );
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
          <HeldBlock className="h-1.5 w-full" />
        </div>
      );

    case "breakdown":
      return (
        <div aria-hidden="true" className="flex flex-col gap-3">
          {Array.from({ length: shape.entries }, (_, index) => (
            <div key={index} className="flex flex-col gap-1.5">
              <HeldBlock className="h-3 w-32" />
              <HeldBlock className="h-1.5 w-full" />
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
    <Card span={metric.shape.kind === "matrix" ? "full" : "half"} sealed>
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
