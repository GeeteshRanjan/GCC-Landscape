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

export interface GridRatingCell {
  /** The ordinal label, shown as text. Colour is never the only encoding. */
  rating: string;
  /** 1-based position in the metric's own scale. */
  step: number;
}

/**
 * A comparison grid. Two variants rather than one nullable shape, because a
 * rating cell and a number cell are read differently: a number is measured
 * against its row, an ordinal against the scale the metric declares.
 */
export type MetricGrid =
  | {
      kind: "numbers";
      columns: string[];
      rows: Array<{ label: string; cells: GridNumberCell[] }>;
    }
  | {
      kind: "ratings";
      columns: string[];
      /** The ordinal steps, weakest first. Rendered as the grid's key. */
      steps: string[];
      rows: Array<{ label: string; cells: GridRatingCell[] }>;
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
  | (ShownBase & { shape: "breakdown"; parts: MetricPart[] })
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

/* ==========================================================================
   Order

   Ascending render width, and stable within a step.
   ========================================================================== */

const SHAPE_ORDER: Record<ShownMetric["shape"], number> = {
  scalar: 0,
  range: 1,
  breakdown: 2,
  grid: 3,
};

/**
 * A single figure first, a grid last.
 *
 * Ordering by how much of the eye a metric needs, rather than by lens or by
 * catalogue position. Two things come out of it at once: a tab opens on the
 * figures that read in one glance and ends on the ones that need study, and the
 * card grid fills cleanly, because narrow cards are not interleaved with
 * full-width ones leaving half-rows of white behind them.
 *
 * Stable inside a step, so the catalogue's own order still decides between two
 * metrics of the same shape and the screen does not reshuffle when a value is
 * edited.
 */
function compareByShape(a: ShownMetric, b: ShownMetric): number {
  return SHAPE_ORDER[a.shape] - SHAPE_ORDER[b.shape];
}

/** How wide a card is. Grids need the full measure; everything else pairs up. */
export function metricSpan(shape: ShownMetric["shape"]): "half" | "full" {
  return shape === "grid" ? "full" : "half";
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

      if (scale) {
        const built: Array<{ label: string; cells: GridRatingCell[] }> = [];
        for (const [rowIndex, label] of rows.entries()) {
          const cells: GridRatingCell[] = [];
          for (let column = 0; column < columns.length; column += 1) {
            const cell = value.cells[rowIndex]?.[column];
            if (typeof cell !== "string") return null;
            const step = scale.indexOf(cell);
            if (step < 0) return null;
            cells.push({ rating: cell, step: step + 1 });
          }
          built.push({ label, cells });
        }
        return {
          metric,
          shape: "grid",
          grid: { kind: "ratings", columns: [...columns], steps: [...scale], rows: built },
        };
      }

      const built: Array<{ label: string; cells: GridNumberCell[] }> = [];
      for (const [rowIndex, label] of rows.entries()) {
        const raw: number[] = [];
        for (let column = 0; column < columns.length; column += 1) {
          const cell = value.cells[rowIndex]?.[column];
          if (typeof cell !== "number") return null;
          raw.push(cell);
        }
        const peak = rowScale(raw);
        built.push({
          label,
          cells: raw.map((n) => ({
            figure: fig(n),
            share: Math.min(Math.max(n / peak, 0), 1),
          })),
        });
      }
      return {
        metric,
        shape: "grid",
        grid: { kind: "numbers", columns: [...columns], rows: built },
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
    shown: shown.sort(compareByShape),
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
