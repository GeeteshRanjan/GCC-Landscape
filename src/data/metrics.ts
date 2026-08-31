/**
 * The Screen 2 metric catalogue's behaviour: what a metric means, whether it is
 * finished, how its shape and its numbers stay aligned when the shape is edited,
 * and — the part that carries an invariant — what a visitor is allowed to see.
 *
 * Pure functions over values from src/data/schema.ts. No `server-only` marker:
 * the admin runs the alignment helpers in the browser, and the redaction helpers
 * have to be importable by the server components that will render Screen 2.
 */
import {
  METRIC_FUNCTIONS,
  METRIC_LENSES,
  type Metric,
  type MetricFormat,
  type MetricFunction,
  type MetricLens,
  type MetricStructure,
  type MetricValue,
} from "./schema";

/* --------------------------------------------------------------------------
   Labels
   -------------------------------------------------------------------------- */

/** Screen 2's tabs. Public. */
export const METRIC_FUNCTION_LABELS: Record<MetricFunction, string> = {
  tech: "Technology",
  operations: "Operations",
  hr: "HR",
  finance: "Finance",
};

/**
 * Lens labels for the ADMIN ONLY.
 *
 * The lens is an internal filing system and must never appear on a public
 * screen. Admin is internal staff, and being able to see that a function's
 * metrics fall into talent, speed, location and cost is the whole reason the
 * filing exists — so it is shown there, and `publicMetric` drops the field
 * entirely so the public side cannot render it even by mistake.
 */
export const METRIC_LENS_ADMIN_LABELS: Record<MetricLens, string> = {
  supply: "Talent supply",
  speed: "Speed to stand up",
  place: "Location and infrastructure",
  cost: "Cost",
};

export const METRIC_FORMAT_LABELS: Record<MetricFormat, string> = {
  number: "Count",
  percent: "Percentage",
  index: "Index",
  duration: "Duration",
  rating: "Rating",
};

/* --------------------------------------------------------------------------
   Shape
   -------------------------------------------------------------------------- */

/**
 * A metric's shape with no content: how many parts, how many rows and columns.
 * Enough to lay out a placeholder of the right size and nothing else.
 */
export type MetricShape =
  | { kind: "scalar" }
  | { kind: "range" }
  | { kind: "breakdown"; entries: number }
  | { kind: "matrix"; rows: number; columns: number };

export function metricShape(structure: MetricStructure): MetricShape {
  switch (structure.kind) {
    case "scalar":
      return { kind: "scalar" };
    case "range":
      return { kind: "range" };
    case "breakdown":
      return { kind: "breakdown", entries: structure.entries.length };
    case "matrix":
      return {
        kind: "matrix",
        rows: structure.rows.length,
        columns: structure.columns.length,
      };
  }
}

/* --------------------------------------------------------------------------
   The gate
   -------------------------------------------------------------------------- */

/** A metric as it may reach the browser, with the value in it. */
export interface OpenMetric {
  gated: false;
  id: string;
  functionArea: MetricFunction;
  title: string;
  question: string;
  format: MetricFormat;
  unit?: string;
  ratingScale?: string[];
  indexBaseline?: string;
  asOf?: string;
  /** The figures are a floor. Rendered as a trailing "+" on every one of them. */
  atLeast?: boolean;
  /** The parts are waypoints on one path. Drawn as a progression, not as bars. */
  progression?: boolean;
  /** The second part is inside the first. Drawn nested; without it, adjacent. */
  subset?: boolean;
  structure: MetricStructure;
  value: MetricValue | null;
}

/**
 * A gated metric as it may reach the browser. There is no `value` field and no
 * `structure` field to put one in — only a count of the shapes to draw.
 */
export interface GatedMetric {
  gated: true;
  id: string;
  functionArea: MetricFunction;
  title: string;
  question: string;
  format: MetricFormat;
  shape: MetricShape;
}

export type PublicMetric = OpenMetric | GatedMetric;

/**
 * The only way a metric is allowed to cross to the browser.
 *
 * Gating is a server-side omission, and this is where the omission happens. The
 * gated branch of the return type has no field a number could travel in, so
 * "the value never reaches the browser" is checked by the compiler rather than
 * remembered by whoever writes the component. A CSS blur over real text would
 * be a leak; so would shipping the whole metric and picking fields in JSX.
 *
 * Both branches drop `lens` (internal filing) and `note` (the admin's working
 * notes). The gated branch additionally drops the structure's labels, the unit,
 * the index base, the as-of date, `atLeast`, `progression` and `subset`: a row label
 * plus a visible axis can imply the answer, and the placeholder does not need any of
 * them to be the right size. The last three in particular describe figures that are
 * not there — `atLeast` qualifies one, `progression` and `subset` each say how a set
 * of them relate.
 */
export function publicMetric(metric: Metric): PublicMetric {
  if (metric.gated) {
    return {
      gated: true,
      id: metric.id,
      functionArea: metric.functionArea,
      title: metric.title,
      question: metric.question,
      format: metric.format,
      shape: metricShape(metric.structure),
    };
  }
  return {
    gated: false,
    id: metric.id,
    functionArea: metric.functionArea,
    title: metric.title,
    question: metric.question,
    format: metric.format,
    ...(metric.unit === undefined ? {} : { unit: metric.unit }),
    ...(metric.ratingScale === undefined ? {} : { ratingScale: metric.ratingScale }),
    ...(metric.indexBaseline === undefined
      ? {}
      : { indexBaseline: metric.indexBaseline }),
    ...(metric.asOf === undefined ? {} : { asOf: metric.asOf }),
    ...(metric.atLeast === undefined ? {} : { atLeast: metric.atLeast }),
    ...(metric.progression === undefined
      ? {}
      : { progression: metric.progression }),
    ...(metric.subset === undefined ? {} : { subset: metric.subset }),
    structure: metric.structure,
    value: metric.value,
  };
}

/**
 * Screen 2's payload for one function area.
 *
 * Incomplete open metrics are dropped rather than rendered half-filled: a bar
 * chart with two of five bars missing reads as broken, not as pending. A gated
 * metric is always included — it has nothing to be missing.
 */
export function publicMetricsFor(
  metrics: readonly Metric[],
  functionArea: MetricFunction,
): PublicMetric[] {
  return metrics
    .filter((metric) => metric.functionArea === functionArea)
    .filter((metric) => metric.gated || isMetricComplete(metric))
    .map(publicMetric);
}

/* --------------------------------------------------------------------------
   Completeness
   -------------------------------------------------------------------------- */

/** True when every slot this metric defines holds a number. */
export function isMetricComplete(metric: Metric): boolean {
  const value = metric.value;
  if (value === null) return false;
  if (value.kind !== metric.structure.kind) return false;
  switch (value.kind) {
    case "scalar":
    case "range":
      return true;
    case "breakdown":
      return (
        value.values.length > 0 && value.values.every((n) => n !== null)
      );
    case "matrix":
      return (
        value.cells.length > 0 &&
        value.cells.every(
          (row) => row.length > 0 && row.every((cell) => cell !== null),
        )
      );
  }
}

export interface MetricProgress {
  total: number;
  complete: number;
  /** Started but not finished: some cells filled, some empty. */
  partial: number;
  empty: number;
  gated: number;
}

export function metricProgress(metrics: readonly Metric[]): MetricProgress {
  let complete = 0;
  let partial = 0;
  let empty = 0;
  let gated = 0;
  for (const metric of metrics) {
    if (metric.gated) gated += 1;
    if (isMetricComplete(metric)) complete += 1;
    else if (metric.value === null) empty += 1;
    else partial += 1;
  }
  return { total: metrics.length, complete, partial, empty, gated };
}

/* --------------------------------------------------------------------------
   Grouping, for the admin surface
   -------------------------------------------------------------------------- */

export interface MetricGroup {
  lens: MetricLens;
  metrics: Metric[];
}

export interface MetricFunctionGroup {
  functionArea: MetricFunction;
  groups: MetricGroup[];
}

/**
 * Function area, then lens, in the declared order of both enums — so the admin
 * sees a stable arrangement rather than one that shuffles as metrics are edited.
 * Empty lenses are dropped; the whole function area is dropped if it has nothing.
 */
export function groupMetrics(
  metrics: readonly Metric[],
): MetricFunctionGroup[] {
  return METRIC_FUNCTIONS.map((functionArea) => ({
    functionArea,
    groups: METRIC_LENSES.map((lens) => ({
      lens,
      metrics: metrics.filter(
        (metric) => metric.functionArea === functionArea && metric.lens === lens,
      ),
    })).filter((group) => group.metrics.length > 0),
  })).filter((entry) => entry.groups.length > 0);
}

/* --------------------------------------------------------------------------
   Keeping shape and numbers aligned
   -------------------------------------------------------------------------- */

/**
 * An all-empty value of the right shape, so a form has slots to type into.
 *
 * Scalar and range have no empty representation — a number is either entered or
 * the whole value is null — so they return null and the form treats "no value"
 * as the empty state.
 */
export function emptyValueFor(structure: MetricStructure): MetricValue | null {
  switch (structure.kind) {
    case "scalar":
    case "range":
      return null;
    case "breakdown":
      return { kind: "breakdown", values: structure.entries.map(() => null) };
    case "matrix":
      return {
        kind: "matrix",
        cells: structure.rows.map(() => structure.columns.map(() => null)),
      };
  }
}

/**
 * Re-fits an existing value to a changed structure.
 *
 * The admin owns the labels — the seeded discipline and segment names are
 * starting points — so adding, removing or renaming a part has to keep the
 * numbers already typed. Alignment is by position: a renamed part keeps its
 * number, a removed one loses it, a new one arrives empty. Position is the only
 * honest correspondence available, and doing this in one tested function is why
 * the form cannot produce a value the publish gate then rejects for a length
 * mismatch.
 */
export function alignValue(
  structure: MetricStructure,
  value: MetricValue | null,
): MetricValue | null {
  if (value === null) return emptyValueFor(structure);
  if (value.kind !== structure.kind) return emptyValueFor(structure);

  if (structure.kind === "breakdown" && value.kind === "breakdown") {
    if (value.values.length === structure.entries.length) return value;
    return {
      kind: "breakdown",
      values: structure.entries.map((_, index) => value.values[index] ?? null),
    };
  }

  if (structure.kind === "matrix" && value.kind === "matrix") {
    const sameSize =
      value.cells.length === structure.rows.length &&
      value.cells.every((row) => row.length === structure.columns.length);
    if (sameSize) return value;
    return {
      kind: "matrix",
      cells: structure.rows.map((_, rowIndex) =>
        structure.columns.map(
          (_column, columnIndex) => value.cells[rowIndex]?.[columnIndex] ?? null,
        ),
      ),
    };
  }

  return value;
}

/**
 * Formats a metric's value for a summary line. Never a currency, because no
 * metric can hold one; see the absent currency format in schema.ts.
 */
export function formatMetricValue(metric: Metric): string {
  const value = metric.value;
  if (value === null) return "Not entered";
  const unit = metric.unit ? ` ${metric.unit}` : "";
  const one = (n: number) =>
    metric.format === "percent" ? `${n}%` : `${n.toLocaleString("en-IN")}${unit}`;

  switch (value.kind) {
    case "scalar":
      return one(value.value);
    case "range":
      return `${value.min.toLocaleString("en-IN")}–${one(value.max)}`;
    case "breakdown": {
      const filled = value.values.filter((n) => n !== null).length;
      return `${filled} of ${value.values.length} entered`;
    }
    case "matrix": {
      const cells = value.cells.flat();
      const filled = cells.filter((cell) => cell !== null).length;
      return `${filled} of ${cells.length} entered`;
    }
  }
}
