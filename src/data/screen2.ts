import {
  METRIC_FUNCTION_LABELS,
  publicMetricsFor,
  type GatedMetric,
  type OpenMetric,
  type PublicMetric,
} from "./metrics";
import { METRIC_FUNCTIONS, type Dataset, type MetricFormat, type MetricFunction } from "./schema";

/**
 * Screen 2's view model: the Function View, and nothing else.
 *
 * Two jobs, and the first one is an invariant.
 *
 * **Everything crosses through `publicMetricsFor`.** Reading `dataset.metrics`
 * here would bypass the gate, and the leak would be invisible in review — the
 * page would look identical. So this file imports the gate and never the raw
 * array, and the types below are built on `OpenMetric` / `GatedMetric` rather
 * than `Metric`, which means a gated value has no field to travel in even by
 * accident.
 *
 * **The lens never crosses either.** `publicMetric` already strips it, and this
 * file deliberately does not re-derive a public grouping that mirrors it. The
 * lenses are an internal filing system; supply / speed / place / cost re-lettered
 * as four public headings would be a transcription of the filing system rather
 * than a decision about the screen. What governs the order here is how a metric
 * READS, not what it is filed under — see `compareByShape`.
 *
 * The second job is to leave the components with no arithmetic and no null
 * handling. Every figure below is already a string, every bar already a fraction,
 * and `ShownMetric` has no nullable value in it — which is the type-level
 * statement of `publicMetricsFor`'s own rule that an incomplete open metric is
 * dropped rather than rendered half-filled.
 */

/* ==========================================================================
   Shapes, as the screen renders them
   ========================================================================== */

/** One named part of a breakdown. */
export interface MetricPart {
  label: string;
  figure: string;
  /** 0 to 1, for the bar. See `breakdownScale` for what it is a share of. */
  share: number;
}

export interface GridNumberCell {
  figure: string;
  /** 0 to 1, against the largest cell in the SAME ROW. */
  share: number;
}

/* ==========================================================================
   Which chart draws a metric

   The decision lives here rather than in the component, for the same reason the
   scales do: it is a property of the DATA, and a property of the data is
   something a test can pin. `metric-card.tsx` then has no chart selection in it
   at all — it draws what it is handed.

   Every rule below is derived from values and structure only. Nothing parses a
   label, deliberately: entry and axis names are admin-editable, so a rule that
   read "To 500 FTEs" to find the number 500 would silently change which chart a
   metric gets the first time somebody renamed a part.
   ========================================================================== */

/**
 * How a breakdown is drawn.
 *
 *   - `stack` — the parts are the whole. A percentage split that sums to 100 is
 *     making a part-to-whole claim, and a row of separate bars is the one thing
 *     that cannot show it.
 *   - `figures` — a bar would mislead. Percentages clustered at the top of their
 *     domain (99.95 against 99.5) draw as identical bars on an honest axis, and
 *     as a fabricated difference on a truncated one. Neither is worth having.
 *   - `nested` — two parts where the smaller is a subset of the larger. Drawn
 *     inside it, because "132 of the 854" is the actual relationship.
 *   - `bars` — everything else.
 */
export type BreakdownDisplay = "bars" | "stack" | "figures" | "nested";

/** Sums to a whole, within the rounding the source figures carry. */
function sumsToWhole(values: readonly number[]): boolean {
  const total = values.reduce((sum, value) => sum + value, 0);
  return Math.abs(total - 100) <= 0.5;
}

/**
 * Every value is high in its own domain and they sit close together, so the
 * difference between them is smaller than the width of the axis can show.
 */
function clusteredHigh(values: readonly number[]): boolean {
  const min = Math.min(...values);
  const max = Math.max(...values);
  return min >= 90 && max <= 100 && max - min <= 10;
}

export function breakdownDisplay(
  format: MetricFormat,
  values: readonly number[],
  /**
   * The metric's unit, and it is load-bearing rather than decorative here — see
   * the containment test below.
   */
  unit?: string,
): BreakdownDisplay {
  if (format === "percent") {
    if (values.length >= 2 && values.length <= 6 && sumsToWhole(values)) {
      return "stack";
    }
    if (clusteredHigh(values)) return "figures";
    return "bars";
  }
  /**
   * Two parts, measured in the SAME unit, one of which fits inside the other with
   * room to spare.
   *
   * The unit requirement is the whole rule, and it is there because the version
   * without it drew a false claim. "Technical community activity" holds 1,400
   * meetup groups and 120 conferences a year: two parts, and 120 is comfortably
   * under half of 1,400, so a size-only rule nested the conferences inside the
   * meetup groups and asserted that a conference is a kind of meetup group. It is
   * not — the catalogue's own note says the two parts count different things,
   * which is exactly why that metric declares no unit.
   *
   * A shared unit is not proof of containment, and nothing available here is. What
   * it is, is the definition's own statement that the two parts measure the same
   * kind of thing, which is a precondition — and it is authored rather than
   * inferred. "Total Grade A stock" and "vacant and available now" are both
   * million sq ft; the nesting is real.
   */
  if (values.length === 2 && unit !== undefined) {
    const [first, second] = values;
    if (
      typeof first === "number" &&
      typeof second === "number" &&
      first > 0 &&
      second > 0 &&
      second / first <= 0.5
    ) {
      return "nested";
    }
  }
  return "bars";
}

/**
 * How a matrix is drawn.
 *
 *   - `ratings` — an ordinal. No axis, because an ordinal has no distance.
 *   - `dumbbell` — a two-column index, where the answer is the gap rather than
 *     either figure.
 *   - `lollipop` — an index across three or more columns, on ONE axis shared by
 *     every row, with the base drawn as a rule. Scaling each row to its own
 *     maximum is what made "India = 100" the shortest mark in its row.
 *   - `numbers` — a matrix with no index base. Rows measure different things, so
 *     each cell is read against its own row.
 */
export type GridDisplay = "ratings" | "dumbbell" | "lollipop" | "numbers";

export interface GridRatingCell {
  /** The ordinal label, shown as text. Colour is never the only encoding. */
  rating: string;
  /** 1-based position in the metric's own scale. */
  step: number;
}

/** One dot on a shared index axis. */
export interface GridIndexCell {
  column: string;
  figure: string;
  /** 0 to 1 against the axis shared by the WHOLE grid, not by the row. */
  share: number;
  /** The index base column. */
  anchor: boolean;
}

/** A two-column index row, where the gap is the answer. */
export interface GridDeltaRow {
  label: string;
  from: { column: string; figure: string; share: number };
  to: { column: string; figure: string; share: number };
  /** Already formatted and signed. No arithmetic in the component. */
  delta: string;
}

/**
 * A comparison grid, in one of four readings.
 *
 * Four variants rather than one nullable shape, because these are genuinely
 * different charts: a number is measured against its row, an index against the
 * base it declares, an ordinal against the scale it declares, and a two-column
 * index against neither — against the distance between its own two ends.
 */
export type MetricGrid =
  | {
      kind: "numbers";
      columns: string[];
      rows: Array<{ label: string; cells: GridNumberCell[] }>;
    }
  | {
      kind: "lollipop";
      columns: string[];
      rows: Array<{ label: string; cells: GridIndexCell[] }>;
      /** Where the index base sits on the shared axis. */
      baselineShare: number;
      baselineColumn: string;
    }
  | {
      kind: "dumbbell";
      rows: GridDeltaRow[];
    }
  | {
      kind: "ratings";
      columns: string[];
      /** The ordinal steps, weakest first. Rendered as the grid's key. */
      steps: string[];
      rows: Array<{ label: string; cells: GridRatingCell[] }>;
      /** The column the visitor is deciding about, when it is on the grid. */
      anchorColumn?: string;
    };

interface ShownBase {
  metric: OpenMetric;
}

/**
 * A metric with figures behind it, resolved to exactly what gets drawn.
 *
 * Five renderings, which is the full set the catalogue can produce: a single
 * figure, a spread, a set of named parts, a number grid, and the rating variant
 * of a grid. `shape` is deliberately not the structure's own `kind` — the two
 * grid variants share a structure and need different components.
 */
export type ShownMetric =
  | (ShownBase & { shape: "scalar"; figure: string })
  | (ShownBase & {
      shape: "range";
      low: string;
      high: string;
      /** The end labels from the structure, when the definition supplies them. */
      lowLabel: string | null;
      highLabel: string | null;
      /**
       * Where the spread starts on a 0-to-upper-end track, 0 to 1. The track has
       * no absolute scale to anchor to, so what it shows is how WIDE the spread
       * is relative to its own upper end — which is the honest claim, and the one
       * the copy makes ("as little as X, as much as Y").
       */
      offset: number;
    })
  | (ShownBase & {
      shape: "breakdown";
      parts: MetricPart[];
      /** Which chart draws these parts. See `breakdownDisplay`. */
      display: BreakdownDisplay;
    })
  | (ShownBase & { shape: "grid"; grid: MetricGrid });

/** A metric whose figures are withheld. Cardinality and nothing else. */
export interface HeldMetric {
  metric: GatedMetric;
}

export interface FunctionAreaView {
  functionArea: MetricFunction;
  /** The public tab label. */
  label: string;
  shown: ShownMetric[];
  /**
   * The gated metrics, collected at the end of the tab rather than left in place.
   *
   * A withheld panel sitting between two filled ones reads as broken; a set of
   * them under one heading that says why reads as deliberate. Scattered things
   * look like failures, collected things look like a decision — which is the
   * whole visual problem a shape-only placeholder has to solve.
   */
  held: HeldMetric[];
}

export interface FunctionView {
  areas: FunctionAreaView[];
}

/* ==========================================================================
   Formatting
   ========================================================================== */

/**
 * Thousands grouping, `en-US`, and that is the audience rather than the subject.
 *
 * The tool is about India and is read by CIOs in the US, Europe and Japan. Indian
 * digit grouping renders 600,000 as "6,00,000", which is correct for an Indian
 * reader and a stumble for everyone this screen is written for. Screen 2 is the
 * first place any figure is large enough for the difference to show at all — see
 * the same note in `components/public/primitives.tsx`, and the test that pins it.
 */
const grouped = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

/**
 * A count in the units a CIO reads at a glance, and never a rounded one.
 *
 * "5.8 million" only replaces "58,00,000" when the division is exact to two
 * decimals. A figure that would need rounding to fit the unit keeps its digits
 * instead: this screen's whole credibility rests on nothing being quietly
 * approximated, and 17,342,881 shown as "17.34 million" is an approximation
 * dressed as a headline.
 */
export function formatCompact(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    const millions = value / 1_000_000;
    const rounded = Math.round(millions * 100) / 100;
    if (rounded === millions) {
      return `${grouped.format(millions)} million`;
    }
  }
  return grouped.format(value);
}

/**
 * One number, as its format wants to be read.
 *
 * There is no currency branch and there never can be: the schema has no currency
 * format and refuses a currency-looking unit, so no absolute money figure exists
 * to format. Cost arrives as indices, spreads and growth rates.
 *
 * `compact` is on for the two shapes that show a figure on its own — a scalar and
 * the ends of a range — and off inside a breakdown or a grid. Learned by looking at
 * it: a parts list reading "1.5 million / 300,000 / 250,000" makes the reader
 * convert between units to compare two rows of the same list, which is exactly the
 * work a breakdown exists to save them. One presentation per set of parts.
 */
export function formatFigure(
  format: MetricFormat,
  value: number,
  compact = false,
): string {
  switch (format) {
    case "percent":
      return `${grouped.format(value)}%`;
    case "number":
      return compact ? formatCompact(value) : grouped.format(value);
    case "index":
    case "duration":
    case "rating":
      return grouped.format(value);
  }
}

/* ==========================================================================
   Scales

   A bar has to be worth drawing. Two rules, and the first one exists because the
   obvious single rule produces a lie.
   ========================================================================== */

/**
 * What a breakdown's bars are a share of.
 *
 * A percentage has a domain of its own, so it scales to 100. Scaling percentages
 * to the largest value in the set instead would draw 99.95% uptime as a full bar
 * and 99.5% as a bar 0.45% shorter — which reads as "one of these is a rounding
 * error away from the other" only by accident, and would read as a real gap the
 * moment the numbers were 40 and 42.
 *
 * Everything else — counts, durations, indices — has no natural ceiling, so it
 * scales to the largest part present and the bars are a comparison within the
 * metric. Never across metrics: two cards' bars are not the same scale and the
 * cards never sit close enough to imply they are.
 */
export function breakdownScale(format: MetricFormat, values: readonly number[]): number {
  if (format === "percent") return 100;
  return Math.max(...values, 1);
}

/** A grid row's peak, so a numeric cell is read against its own row. */
export function rowScale(values: readonly number[]): number {
  return Math.max(...values, 1);
}

/**
 * The whole tool's subject, and the column a visitor is deciding about.
 *
 * A magic string, and a deliberate one — the same kind `geo.ts` carries when it
 * hardcodes India's city coordinates and `screen1.ts` carries in
 * `COMMON_FUNCTIONS`. The tool is about India; a comparison grid that contains an
 * India column is comparing India with alternatives, and the reader should find
 * it first.
 *
 * It degrades safely rather than breaking: the columns are admin-editable, so if
 * this one is renamed the grid simply loses its emphasis and falls back to the
 * index-base rule below. Nothing throws and no figure moves.
 */
export const SUBJECT_COLUMN = "India";

/**
 * Which column a grid is read outward from.
 *
 * Two rules, in order. The subject wins where it is present. Failing that, the
 * index base is the column whose value is IDENTICAL in every row — which is what
 * an index base is, and is true of "Tier 1 cities = 100" and "Bengaluru = 100"
 * without either string appearing here.
 *
 * Derived from the cells rather than read out of `indexBaseline`, because that
 * field is free text an admin types. A rule that parsed it would break on a typo
 * and, worse, would break silently.
 */
export function anchorColumnFor(
  columns: readonly string[],
  rows: ReadonlyArray<readonly unknown[]>,
): string | undefined {
  if (columns.includes(SUBJECT_COLUMN)) return SUBJECT_COLUMN;
  if (rows.length === 0) return undefined;
  for (const [index, column] of columns.entries()) {
    const first = rows[0]?.[index];
    if (first === undefined) continue;
    if (rows.every((row) => row[index] === first)) return column;
  }
  return undefined;
}

/**
 * Which of the four grid readings a matrix gets. Structure and values only.
 */
export function gridDisplay(
  hasRatingScale: boolean,
  hasIndexBaseline: boolean,
  columnCount: number,
): GridDisplay {
  if (hasRatingScale) return "ratings";
  if (!hasIndexBaseline) return "numbers";
  return columnCount === 2 ? "dumbbell" : "lollipop";
}

/* ==========================================================================
   Order

   Ascending render width, and stable within a step.
   ========================================================================== */

const WIDTH_ORDER: Record<MetricWidth, number> = {
  third: 0,
  half: 1,
  full: 2,
};

/**
 * Narrowest first, widest last.
 *
 * Ordering by the width a card takes rather than by lens or catalogue position,
 * which buys two things at once. A tab opens on the figures that read in one
 * glance and ends on the ones that need study. And the grid packs: three thirds
 * fill a row exactly, then halves, then the full-width charts — so no row is left
 * with a card stretched to a taller neighbour's height beside it.
 *
 * Ordering by width rather than by shape matters now that width is decided by the
 * data: a percentage split that sums to a whole is drawn as one stacked bar and
 * wants the full measure, while a two-part percentage does not, and both are
 * `breakdown`.
 *
 * Stable inside a step, so the catalogue's own order still decides between two
 * metrics of the same width and the screen does not reshuffle when a value is
 * edited.
 */
function compareByWidth(a: ShownMetric, b: ShownMetric): number {
  return WIDTH_ORDER[metricWidth(a)] - WIDTH_ORDER[metricWidth(b)];
}

/**
 * How much of the row a card takes, on a twelve-column grid.
 *
 * Weighted by what the card actually has to draw, rather than one width for
 * everything. That is what fixes the layout's worst artefact: a single figure
 * paired with a nine-part breakdown used to stretch to the taller card's height,
 * leaving a card that was four fifths empty white space with one number in the
 * corner of it. Three narrow cards to a row instead, so a scalar sits beside
 * scalars.
 *
 * Returned as a token rather than a class string: the mapping to Tailwind belongs
 * in the component, and a view model that emitted `sm:col-span-6` would be a data
 * layer with an opinion about breakpoints.
 */
export type MetricWidth = "third" | "half" | "full";

export function metricWidth(shown: ShownMetric): MetricWidth {
  switch (shown.shape) {
    case "scalar":
      return "third";
    case "range":
      return "half";
    case "breakdown":
      // A stacked whole and a long parts list both want the full measure: the
      // stack because its segments have to be wide enough to label, and a long
      // list because nine rows in a half-width card is a column of hairlines.
      if (shown.display === "stack") return "full";
      if (shown.display === "figures") return "half";
      return shown.parts.length > 5 ? "full" : "half";
    case "grid":
      return "full";
  }
}

/* ==========================================================================
   Resolution
   ========================================================================== */

function resolve(metric: OpenMetric): ShownMetric | null {
  const value = metric.value;
  /**
   * Every figure this metric produces, with the floor marker if it declares one.
   *
   * Applied here rather than inside `formatFigure` so it lands on all five
   * renderings at once and cannot be forgotten on one of them: "8.7 million+" and
   * "1.7 million+" are the same claim about the same metric, and a breakdown whose
   * parts silently dropped the "+" would be a stronger claim than the data makes.
   */
  const fig = (n: number, compact = false) =>
    `${formatFigure(metric.format, n, compact)}${metric.atLeast ? "+" : ""}`;
  // Unreachable through `publicMetricsFor`, which drops an incomplete open
  // metric. Kept as a guard rather than an assertion because the alternative is
  // a half-drawn card, and the whole point is that we would rather show nothing.
  if (value === null || value.kind !== metric.structure.kind) return null;

  switch (value.kind) {
    case "scalar":
      return {
        metric,
        shape: "scalar",
        figure: fig(value.value, true),
      };

    case "range": {
      const structure = metric.structure;
      return {
        metric,
        shape: "range",
        low: fig(value.min, true),
        high: fig(value.max, true),
        lowLabel: structure.kind === "range" ? structure.minLabel ?? null : null,
        highLabel: structure.kind === "range" ? structure.maxLabel ?? null : null,
        offset: value.max > 0 ? Math.min(Math.max(value.min / value.max, 0), 1) : 0,
      };
    }

    case "breakdown": {
      if (metric.structure.kind !== "breakdown") return null;
      const numbers = value.values.filter((n): n is number => n !== null);
      if (numbers.length !== metric.structure.entries.length) return null;
      const scale = breakdownScale(metric.format, numbers);
      return {
        metric,
        shape: "breakdown",
        display: breakdownDisplay(metric.format, numbers, metric.unit),
        parts: metric.structure.entries.map((label, index) => {
          // In bounds: the length check above is what makes this safe. The
          // fallback exists only because the compiler cannot see that.
          const n = numbers[index] ?? 0;
          return {
            label,
            figure: fig(n),
            share: Math.min(Math.max(n / scale, 0), 1),
          };
        }),
      };
    }

    case "matrix": {
      if (metric.structure.kind !== "matrix") return null;
      const { rows, columns } = metric.structure;
      const scale = metric.ratingScale;

      const display = gridDisplay(
        scale !== undefined,
        metric.indexBaseline !== undefined,
        columns.length,
      );

      if (display === "ratings") {
        // Narrowed by `gridDisplay`, which returns "ratings" only when a scale is
        // present. Kept as a guard rather than an assertion.
        if (!scale) return null;
        const built: Array<{ label: string; cells: GridRatingCell[] }> = [];
        const ordinals: string[][] = [];
        for (const [rowIndex, label] of rows.entries()) {
          const cells: GridRatingCell[] = [];
          const raw: string[] = [];
          for (let column = 0; column < columns.length; column += 1) {
            const cell = value.cells[rowIndex]?.[column];
            if (typeof cell !== "string") return null;
            const step = scale.indexOf(cell);
            if (step < 0) return null;
            cells.push({ rating: cell, step: step + 1 });
            raw.push(cell);
          }
          ordinals.push(raw);
          built.push({ label, cells });
        }
        return {
          metric,
          shape: "grid",
          grid: {
            kind: "ratings",
            columns: [...columns],
            steps: [...scale],
            rows: built,
            anchorColumn: anchorColumnFor(columns, ordinals),
          },
        };
      }

      // Every numeric reading needs the whole grid read before any cell can be
      // scaled, because three of the four share one axis across every row.
      const numeric: number[][] = [];
      for (const [rowIndex] of rows.entries()) {
        const raw: number[] = [];
        for (let column = 0; column < columns.length; column += 1) {
          const cell = value.cells[rowIndex]?.[column];
          if (typeof cell !== "number") return null;
          raw.push(cell);
        }
        numeric.push(raw);
      }

      if (display === "numbers") {
        return {
          metric,
          shape: "grid",
          grid: {
            kind: "numbers",
            columns: [...columns],
            rows: rows.map((label, rowIndex) => {
              const raw = numeric[rowIndex] ?? [];
              const peak = rowScale(raw);
              return {
                label,
                cells: raw.map((n) => ({
                  figure: fig(n),
                  share: Math.min(Math.max(n / peak, 0), 1),
                })),
              };
            }),
          },
        };
      }

      const anchor = anchorColumnFor(columns, numeric);
      const anchorIndex = anchor ? columns.indexOf(anchor) : -1;
      // Shared across every row, which is what makes the rows comparable — and
      // what stops the base column drawing as the shortest mark in its own row.
      const axisMax = Math.max(...numeric.flat(), 1);

      if (display === "dumbbell") {
        // Two columns and an identified base. Without one there is no direction
        // to the gap, so it falls back to the shared-axis reading.
        if (anchorIndex === 0 || anchorIndex === 1) {
          const otherIndex = anchorIndex === 0 ? 1 : 0;
          const fromColumn = columns[anchorIndex];
          const toColumn = columns[otherIndex];
          if (fromColumn !== undefined && toColumn !== undefined) {
            return {
              metric,
              shape: "grid",
              grid: {
                kind: "dumbbell",
                rows: rows.map((label, rowIndex) => {
                  const raw = numeric[rowIndex] ?? [];
                  const from = raw[anchorIndex] ?? 0;
                  const to = raw[otherIndex] ?? 0;
                  const difference = to - from;
                  return {
                    label,
                    from: {
                      column: fromColumn,
                      figure: fig(from),
                      share: Math.min(Math.max(from / axisMax, 0), 1),
                    },
                    to: {
                      column: toColumn,
                      figure: fig(to),
                      share: Math.min(Math.max(to / axisMax, 0), 1),
                    },
                    // Signed with a real minus sign rather than a hyphen, and
                    // formatted here so the component does no arithmetic.
                    delta: `${difference > 0 ? "+" : difference < 0 ? "\u2212" : ""}${formatFigure(
                      metric.format,
                      Math.abs(difference),
                    )}`,
                  };
                }),
              },
            };
          }
        }
      }

      const baseValue = anchorIndex >= 0 ? numeric[0]?.[anchorIndex] : undefined;
      return {
        metric,
        shape: "grid",
        grid: {
          kind: "lollipop",
          columns: [...columns],
          baselineShare:
            baseValue !== undefined
              ? Math.min(Math.max(baseValue / axisMax, 0), 1)
              : 0,
          baselineColumn: anchor ?? columns[0] ?? "",
          rows: rows.map((label, rowIndex) => {
            const raw = numeric[rowIndex] ?? [];
            return {
              label,
              cells: raw.map((n, columnIndex) => ({
                column: columns[columnIndex] ?? "",
                figure: fig(n),
                share: Math.min(Math.max(n / axisMax, 0), 1),
                anchor: columnIndex === anchorIndex,
              })),
            };
          }),
        },
      };
    }
  }
}

function isGated(metric: PublicMetric): metric is GatedMetric {
  return metric.gated;
}

export function buildFunctionAreaView(
  metrics: readonly PublicMetric[],
  functionArea: MetricFunction,
): FunctionAreaView {
  const shown: ShownMetric[] = [];
  const held: HeldMetric[] = [];

  for (const metric of metrics) {
    if (isGated(metric)) {
      held.push({ metric });
      continue;
    }
    const resolved = resolve(metric);
    if (resolved !== null) shown.push(resolved);
  }

  return {
    functionArea,
    label: METRIC_FUNCTION_LABELS[functionArea],
    shown: shown.sort(compareByWidth),
    held,
  };
}

/**
 * The whole Function View, in the declared order of the four function areas.
 *
 * An area with nothing to show and nothing held is dropped, so a dataset whose
 * catalogue has been edited down does not render an empty tab. Every area has
 * content in the seeded catalogue; the guard is for the dataset after admin has
 * been at it.
 */
export function buildFunctionView(dataset: Dataset): FunctionView {
  const areas = METRIC_FUNCTIONS.map((functionArea) =>
    // The gate. The only path from `dataset.metrics` to this screen.
    buildFunctionAreaView(publicMetricsFor(dataset.metrics, functionArea), functionArea),
  ).filter((area) => area.shown.length > 0 || area.held.length > 0);

  return { areas };
}
