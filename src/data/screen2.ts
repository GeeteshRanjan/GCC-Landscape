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
  /**
   * 0 to 1 of the SET's total, present only on an `adjacent` breakdown.
   *
   * A second fraction rather than a reuse of `share`, because the two are shares of
   * different things and the adjacent blocks need this one. `share` is against the
   * largest part, so the largest block would be full width and the smaller one 30% of
   * the row on top of it — a row overflowing by 30%. Against the TOTAL, two blocks of
   * equal height have areas in the ratio of their figures, which is the
   * proportionality the drawing claims.
   *
   * Derived here rather than in the component for the reason every fraction on this
   * screen is: a component with a division in it can be wrong without a test noticing.
   */
  span?: number;
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
 *   - `nested` — two parts where the smaller is a subset of the larger, and the
 *     definition SAYS SO. Drawn inside it, because "132 of the 854" is the actual
 *     relationship.
 *   - `adjacent` — two parts in one unit with no containment claimed. Two
 *     proportional blocks side by side: their sizes are stated and compared, and
 *     nothing about how the two populations relate is asserted.
 *   - `journey` — the parts are waypoints on ONE path. Four bars on a shared axis
 *     say "four separate quantities"; a staircase whose every leg begins where the
 *     last one ended says "one thing, measured four times as it went".
 *   - `bars` — everything else.
 */
export type BreakdownDisplay =
  | "bars"
  | "stack"
  | "figures"
  | "nested"
  | "adjacent"
  | "journey";

/** One leg of a progression: where it starts, where it ends, and how long it is. */
export interface JourneyLeg {
  label: string;
  /** Cumulative, formatted. The waypoint this leg arrives at. */
  figure: string;
  /** 0 to 1 against the whole journey — where this leg ENDS. */
  share: number;
  /** 0 to 1 — where this leg BEGINS. Zero for the first. */
  offset: number;
  /**
   * The increment over the previous waypoint, signed and formatted.
   *
   * Absent on the first leg, whose interval and cumulative figure are the same
   * number.
   */
  interval?: string;
}

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

/** Every part is larger than the one before it, with no ties. */
function strictlyIncreasing(values: readonly number[]): boolean {
  return values.every((value, index) => index === 0 || value > (values[index - 1] ?? 0));
}

/**
 * No part is larger than the one before it. Ties allowed.
 *
 * **The test for whether a bar set states its own axis**, which is what decides
 * whether it may drop the grey track behind its bars. `project.md`'s rule is that an
 * unstated axis is a problem wherever nothing on screen reveals full width, with one
 * narrow exemption: a ranking sorted by the quantity its bars encode reveals it in row
 * one, because row one is the longest bar and carries its figure. That is a property
 * of the ORDER, so it is derived here rather than assumed of every bar chart — nothing
 * on this screen is ever re-sorted, and the latency and disruption breakdowns are
 * deliberately in distance and city order rather than by value.
 *
 * Ties are allowed because two equal specialisms at 1.2M do not stop the first row
 * being the longest bar. Only an ASCENDING or unordered set does.
 */
function nonIncreasing(values: readonly number[]): boolean {
  return values.every(
    (value, index) => index === 0 || value <= (values[index - 1] ?? Infinity),
  );
}

export function breakdownDisplay(
  format: MetricFormat,
  values: readonly number[],
  /**
   * The metric's unit, and it is load-bearing rather than decorative here — see
   * the containment test below.
   */
  unit?: string,
  /**
   * The definition's own statement that the parts are one path rather than a set of
   * subjects. See the field in `schema.ts` for why it has to be authored.
   */
  progression?: boolean,
  /**
   * The definition's own statement that the second part is inside the first. See the
   * field in `schema.ts` for why a shared unit could never establish it.
   */
  subset?: boolean,
): BreakdownDisplay {
  /**
   * **The authored claim wins, and the derived check is a guard on it rather than a
   * second opinion.** A staircase draws each leg starting where the last one ended,
   * which is only true of values that rise; an admin who edits one below its
   * predecessor would otherwise get a leg drawn backwards. So a progression whose
   * figures have stopped progressing falls back to the ordinary rules and draws bars
   * — the wrong picture of the claim rather than a false one.
   */
  if (progression && values.length >= 3 && strictlyIncreasing(values)) {
    return "journey";
  }
  if (format === "percent") {
    if (values.length >= 2 && values.length <= 6 && sumsToWhole(values)) {
      return "stack";
    }
    if (clusteredHigh(values)) return "figures";
    return "bars";
  }
  /**
   * Two parts, measured in the SAME unit. Either the smaller is inside the larger or
   * it sits beside it, and only the definition can say which.
   *
   * **The shared unit is a precondition, not the rule, and it used to be the rule.**
   * Containment was inferred from two parts sharing a unit with the smaller under half
   * the larger, on the argument that a shared unit is the definition's own statement
   * that both parts measure the same KIND of thing. That is true and it is not enough:
   * "Engineering, other disciplines" and "Management and MBA graduates" are both
   * graduates a year, 450K is under half of 1.5M, and they are disjoint populations —
   * so the heuristic would have drawn the MBA block inside engineering and asserted
   * that every MBA graduate holds an engineering degree. Nothing in the values can
   * distinguish that from vacant floorspace inside total floorspace, which is exactly
   * the situation `progression` is in, so it is resolved the same way: authored.
   *
   * The size test survives on the nested path only, and it is about the DRAWING rather
   * than the claim — a part that is most of its total draws as a bar nearly filling
   * another bar, which reads as a rendering fault. Over half, a claimed subset falls
   * back to two adjacent blocks, which still states both figures truthfully.
   */
  if (values.length === 2 && unit !== undefined) {
    const [first, second] = values;
    if (
      typeof first === "number" &&
      typeof second === "number" &&
      first > 0 &&
      second > 0
    ) {
      if (subset && second / first <= 0.5) return "nested";
      return "adjacent";
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
      /**
       * The parts are in descending order, so the set states its own axis.
       *
       * What licenses dropping the grey track behind the bars — see `nonIncreasing`.
       * Carried on the resolved metric rather than recomputed in the component,
       * because "does this chart reveal what full width is" is a claim, and a claim
       * belongs where a test can pin it.
       */
      selfLabelling: boolean;
      /**
       * The same parts as one path, present exactly when `display` is "journey".
       *
       * Alongside `parts` rather than instead of them, so the width rule and the
       * ordering still read one shape — and so a fallback to bars needs no second
       * resolution pass.
       */
      legs?: JourneyLeg[];
    })
  | (ShownBase & { shape: "grid"; grid: MetricGrid });

/** A metric whose figures are withheld. Cardinality and nothing else. */
export interface HeldMetric {
  metric: GatedMetric;
}

/** One card in a tab's grid, with its width already packed. */
export interface LaidOutCard {
  shown: ShownMetric;
  width: MetricWidth;
}

/** One withheld card, with its width already packed. */
export interface LaidOutHeld {
  held: HeldMetric;
  width: MetricWidth;
}

export interface FunctionAreaView {
  functionArea: MetricFunction;
  /** The public tab label. */
  label: string;
  shown: ShownMetric[];
  /**
   * The bare single figures, as one row rather than as a card each.
   *
   * **A scalar was the worst object on this screen and the card was why.** Five of
   * the nine technology metrics are one number, and after the question line was
   * removed a scalar card was a 20px title, a figure, a unit and roughly its own
   * content's area again in border, radius and padding. Two of them were 552×150
   * boxes holding fifty-one characters. So the card goes and the figures become one
   * object, which is Screen 1's own snapshot treatment — a figure, its label, no
   * container, no border, no hairline between them.
   *
   * **The split is by SHAPE, and that is what licenses it.** A scalar draws no mark,
   * so there is nothing about it that a card's edges were measuring and nothing that
   * moving it can misrepresent. Every metric that draws a mark is in `cards` below,
   * at the width `metricWidth` gives it.
   */
  figures: ShownMetric[];
  /** Everything that draws a mark, in width order, packed so no row is part-empty. */
  cards: LaidOutCard[];
  /**
   * The gated metrics, collected at the end of the tab rather than left in place.
   *
   * A withheld panel sitting between two filled ones reads as broken; a set of
   * them under one heading that says why reads as deliberate. Scattered things
   * look like failures, collected things look like a decision — which is the
   * whole visual problem a shape-only placeholder has to solve.
   */
  held: HeldMetric[];
  /**
   * The same list, packed.
   *
   * **This grid left a real hole on two tabs and nobody had looked.** HR's held pair
   * is a breakdown then a matrix — a half followed by a full — and a full cannot fit
   * beside a half, so it dropped to the next row and left six empty columns next to
   * the placeholder. Finance had the mirror of it. The packing was only ever applied
   * to the open grid.
   */
  heldCards: LaidOutHeld[];
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
 * **Abbreviated now — "8.7M" rather than "8.7 million" — and the reason is the
 * typography rather than a preference about words.** These figures are set at the
 * display step, 30/38px, and the unit spelled out is longer than the number it
 * qualifies: "8.7 million+" is twelve characters where "8.7M+" is five, so the five
 * cells of the technology figure row each spent most of their width on a word that
 * is the same in all five. At that size the abbreviation is what lets the numeral
 * lead. It is also what the reference composition asks for.
 *
 * **Nothing is rounded to fit, which is the rule this shares with the version it
 * replaces.** A unit is only used when the division into it is EXACT: 8,700,000
 * becomes "8.7M" because 8.7 is exact to two decimals, and 17,342,881 stays
 * "17,342,881" rather than becoming "17.34M", because this screen's whole
 * credibility rests on nothing being quietly approximated.
 *
 * **Thousands are stricter than millions, and 1,250 is why.** A count of GCCs shown
 * as "1.25K" is less immediate and less natural than the digits, so K is used only
 * where the value is a whole number of thousands AND large enough that the digits
 * are the harder read — 800,000 becomes "800K", 45,000 becomes "45K", and 1,250 and
 * 1,400 keep their commas. The 10,000 floor is where a comma-grouped figure stops
 * being read at a glance; below it the digits win.
 */
export const THOUSANDS_FLOOR = 10_000;

export function formatCompact(value: number): string {
  const magnitude = Math.abs(value);
  if (magnitude >= 1_000_000) {
    const millions = value / 1_000_000;
    // Exact to two decimals or not at all. This is the no-quiet-approximation rule.
    if (Math.round(millions * 100) / 100 === millions) {
      return `${grouped.format(millions)}M`;
    }
  }
  if (magnitude >= THOUSANDS_FLOOR && value % 1_000 === 0) {
    return `${grouped.format(value / 1_000)}K`;
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
 * `compact` is on for a scalar, for the ends of a range, and — since the
 * abbreviation pass — for the parts of a COUNT breakdown. It stays off inside a grid.
 *
 * **That reverses a recorded decision, and the abbreviation is what changed.** It was
 * off inside a breakdown because a parts list reading "1.5 million / 300,000 /
 * 250,000" makes the reader convert between units to compare two rows of one list.
 * Abbreviated the same list reads "1.5M / 300K / 250K", where the suffix is one
 * character rather than a word and the numerals still align under `tabular-nums` — so
 * the conversion is still there but it is no longer buried in prose, and the
 * alternative is a column of seven-digit figures against a bar. The specialism list
 * is the case that forced it: 1,700,000 down to 150,000 is a set nobody reads at a
 * glance, and "1.7M+" to "150K+" is.
 *
 * Grids keep the digits. A cell is read against its own row rather than against the
 * cell beside it, so there is no set-wide reading for an abbreviation to help.
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

/**
 * A formatted figure split into its numeral and its trailing unit.
 *
 * **What it is for is typography, and Screen 1's snapshot is where the rule comes
 * from.** A `%` or an `M+` set at the figure's own 48px is a third of the cell's
 * optical weight carrying none of its information, so the unit renders two scale
 * steps down and baseline-aligned to the numeral. Four cells of "8.7M+" at one size
 * read as a data field; the same four with the unit held back read as figures.
 *
 * **It lives here rather than in a component, and that is the whole reason it is
 * allowed to exist.** `project.md`'s rule is that a unit is a FIELD rather than a
 * suffix a component parses off a value — the failure it prevents is a component
 * regexing data it did not produce, where the first unit that is a word rather than a
 * glyph gets silently split. This module is the producer: every string it is given
 * came out of `formatFigure` or `formatCompact` a few lines above, so the trailing
 * alphabet is closed and known — `%`, `M`, `K`, `+`, and nothing else. A duration's
 * unit ("months, median") is a separate field on the metric and never lands in a
 * figure, which is what keeps the alphabet closed.
 *
 * Anything that does not end in that alphabet comes back whole with no suffix, so a
 * grouped count ("1,250") and a bare index ("85") are unaffected and a signed delta
 * ("−15", with a real minus) cannot lose its sign.
 */
export interface FigureParts {
  /** The numeral, including grouping and any leading symbol. */
  value: string;
  /** The unit, if the figure carries one. Rendered a step down. */
  suffix?: string;
}

/** The closed set of trailing units the formatters above can produce. */
const FIGURE_SUFFIX = /^(.*?)([MK]?\+|[MK%])$/;

export function figureParts(figure: string): FigureParts {
  const match = FIGURE_SUFFIX.exec(figure);
  // A figure that is only a unit is not a figure. Left whole rather than reduced to
  // an empty numeral with a suffix beside it.
  if (!match || !match[1]) return { value: figure };
  return { value: match[1], suffix: match[2] };
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
export function breakdownScale(
  format: MetricFormat,
  values: readonly number[],
  /**
   * Which chart the parts are going into. Load-bearing for percentages only.
   *
   * Optional, defaulting to `bars`, so the two callers that only care about the
   * non-percentage rule do not have to resolve a display first.
   */
  display: BreakdownDisplay = "bars",
): number {
  /**
   * **A percentage scales to 100 only where it is a SHARE OF A WHOLE, which on this
   * screen means a stacked bar.** That is the case the rule was written for and it is
   * not negotiable there: `StackedShare` lays its segments end to end, so the shares
   * have to sum to one or the bar overflows its own track and stops being a
   * part-to-whole claim at all.
   *
   * **A percentage that is a RATE is not a share of anything, and 100 is not its
   * axis.** The salary ranking is the case: growth rates from 7.5% to 21.1% against a
   * 100% axis draw as five slivers occupying a fifth of the track, with four fifths of
   * every card given to a region no value can ever reach — which tells the reader
   * nothing about the ranking and, worse, implies there is a 100% figure to be read
   * against. Scaled to the largest part, the bars say what the ranking says: AI and
   * machine learning is 2.8 times Non-ER&D, and 21.1 against 20.0 is a 5% difference in
   * length for a 5% difference in value.
   *
   * **The dangerous case is already gone by the time this is reached.** `project.md`'s
   * rule is that a bar is dropped where it would mislead and an axis is never truncated
   * to rescue it — 99.95% against 99.5% must not draw a difference that is not there.
   * `clusteredHigh` catches exactly that in `breakdownDisplay` and routes it to
   * `figures`, which draws no bars whatsoever. So the only percentages that arrive here
   * as `bars` are spread across their own range, where proportional length is the
   * honest drawing.
   */
  if (format === "percent" && display === "stack") return 100;
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
  half: 0,
  full: 1,
};

/**
 * Narrowest first, widest last.
 *
 * Ordering by the width a card takes rather than by lens or catalogue position, so
 * a tab opens on the charts that read in one glance and ends on the ones that need
 * study, and so the grid packs — halves tile two to a row, then the full-measure
 * charts, and no row is left with a card stretched to a taller neighbour's height
 * beside it.
 *
 * Ordering by width rather than by shape matters because width is decided by the
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
 * everything: a stacked whole needs room to label its segments, a nine-part list
 * in a half-width card is a column of hairlines.
 *
 * **There is no `third` any more, and the scalars are why.** A third existed so a
 * single figure could sit beside two other single figures rather than stretch to a
 * nine-part breakdown's height. The scalars are not in this grid at all now — they
 * are the figure row above it, see `layoutArea` — so every card here draws a MARK,
 * and a mark wants either half the measure or all of it. Two values also make the
 * grid correct at every breakpoint for the first time: `third` mapped to
 * `sm:col-span-6 lg:col-span-4`, so a rule reasoning in thirds-of-twelve was wrong
 * between `sm` and `lg`, where a third is really a half.
 *
 * Returned as a token rather than a class string: the mapping to Tailwind belongs
 * in the component, and a view model that emitted `sm:col-span-6` would be a data
 * layer with an opinion about breakpoints.
 */
export type MetricWidth = "half" | "full";

export function metricWidth(shown: ShownMetric): MetricWidth {
  switch (shown.shape) {
    // Unreachable through `layoutArea`, which takes the scalars out first. Kept
    // total rather than throwing: a scalar has no mark, so half is the honest
    // answer to "how much room does this need" if one ever arrives here.
    case "scalar":
      return "half";
    case "range":
      return "half";
    case "breakdown":
      if (shown.display === "stack") return "full";
      if (shown.display === "figures") return "half";
      /**
       * **Seven rows still fit a half, and nine do not.** The threshold was five, which
       * put the seven specialisms at full measure — seven bars stretched across 1,120px,
       * where the longest is the width of the card and the reader's eye travels the
       * whole measure to reach a figure that is 4% longer than the one above it. At half
       * measure with the dense step the same seven rows are a compact ranked list, which
       * is what a ranking wants, and it is what lets the graduate pair sit beside it as
       * one two-column composition rather than two stacked full-width cards.
       *
       * Nine is where it stops: the graduate split's parts are 45,000 against 1.5M, so
       * its short rows are already hairlines at full measure and halving the axis makes
       * the smallest of them a few pixels. Nothing in the catalogue has six or eight
       * parts, so the boundary is only ever tested by the two cases it was set from.
       */
      return shown.parts.length > 7 ? "full" : "half";
    case "grid":
      return "full";
  }
}

/**
 * A withheld metric's width, from its cardinality alone.
 *
 * The gate leaves nothing else to weight it by — `publicMetric` drops the unit, the
 * axis names and the value — and cardinality is exactly what a shape-only
 * placeholder needs in order to be the right size.
 */
export function heldWidth(held: HeldMetric): MetricWidth {
  return held.metric.shape.kind === "matrix" ? "full" : "half";
}

/* ==========================================================================
   Packing — no row may be left part-empty

   An empty cell in a grid of evidence reads as a card that failed to load, which on
   a screen whose whole argument is "these numbers are solid" is expensive.

   **This moved out of the component, and the reason it may now.** It lived in
   `function-view.tsx` on the stated grounds that a card's width is a bet about what
   sits BESIDE it, which is a row-level question rather than a property of one
   metric. That was right while there were three widths and the scalars were in the
   grid: the packing depended on how the browser auto-placed a `third` that was a
   half below `lg`, which is a layout fact. With two widths and every scalar out of
   the grid, the result is a pure function of the metric list — so it is data, it is
   unit-testable, and `no row is part-empty` becomes a property a test can pin
   rather than something only a screenshot can show.
   ========================================================================== */

/**
 * Widths for one run of cards, with any odd half widened to fill its row.
 *
 * **Widths only ever widen.** Nothing is narrowed, because a narrower card
 * misrepresents what it draws, and nothing is reordered, because the order is by how
 * much of the eye a card needs. Halves tile two to a row; a lone trailing half
 * cannot fill a row on its own, so it takes the whole measure.
 *
 * The cost is visible on the technology tab, where the single half is a two-part
 * breakdown that then draws two very long bars. That is the cheaper of the two
 * defects — the alternative is a visible hole beside it — and it is only reachable
 * on a tab with an odd number of halves.
 */
export function packWidths(widths: readonly MetricWidth[]): MetricWidth[] {
  const packed = [...widths];
  const halves = packed.filter((width) => width === "half").length;
  if (halves % 2 === 1) {
    const last = packed.lastIndexOf("half");
    if (last >= 0) packed[last] = "full";
  }
  return packed;
}

/* ==========================================================================
   Resolution
   ========================================================================== */

/**
 * The parts of a progression as legs of one path.
 *
 * The stored values are CUMULATIVE — six months to fifty FTEs, twelve to a hundred —
 * so each leg runs from the previous waypoint to its own, and the intervals a reader
 * wants are the differences. Derived here rather than authored twice: a catalogue
 * holding both totals and gaps is a catalogue where the two can disagree, and the
 * whole reason `SCALE_MILESTONES` is authored once is that two copies of one figure
 * drift.
 *
 * `fig` is the caller's formatter, so a leg's interval is formatted exactly as its
 * waypoint is. `progression` and `atLeast` are mutually exclusive in the schema,
 * which is what makes that safe — the difference between two floors is not itself a
 * floor, so a marked interval would be a stronger claim than the data makes.
 */
function journeyLegs(
  labels: readonly string[],
  values: readonly number[],
  fig: (n: number) => string,
): JourneyLeg[] {
  // Cumulative and strictly increasing, both guaranteed by `breakdownDisplay`
  // before this is reached, so the last value is the whole journey.
  const total = values[values.length - 1] ?? 0;
  const at = (n: number) => (total > 0 ? Math.min(Math.max(n / total, 0), 1) : 0);
  return labels.map((label, index) => {
    const value = values[index] ?? 0;
    const previous = index === 0 ? 0 : (values[index - 1] ?? 0);
    return {
      label,
      figure: fig(value),
      share: at(value),
      offset: at(previous),
      // Absent on the first leg, which has no predecessor to be an interval from —
      // its interval and its cumulative figure are the same number, and printing it
      // twice would read as two quantities. Signed here so the component does no
      // arithmetic, the same way the dumbbell's delta is.
      ...(index === 0 ? {} : { interval: `+${fig(value - previous)}` }),
    };
  });
}

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
      // Display first, then scale: what a percentage's bars are a share OF depends on
      // whether it is a share of a whole, and only the display knows that.
      const display = breakdownDisplay(
        metric.format,
        numbers,
        metric.unit,
        metric.progression,
        metric.subset,
      );
      const scale = breakdownScale(metric.format, numbers, display);
      /**
       * Counts abbreviate, everything else keeps its digits. A duration in months or
       * days is never large enough to need a unit, a percentage has its own, and an
       * index is a bare number by definition — so `number` is the only format where
       * the question arises. See `formatFigure`.
       */
      const compactParts = metric.format === "number";
      // For the adjacent blocks only. Summing a set of parts is meaningless for most
      // breakdowns — the specialisms overlap, the uptime figures are two readings of
      // one thing — which is why it feeds `span` and nothing else.
      const total = numbers.reduce((sum, n) => sum + n, 0);
      return {
        metric,
        shape: "breakdown",
        display,
        selfLabelling: nonIncreasing(numbers),
        ...(display === "journey"
          ? {
              legs: journeyLegs(metric.structure.entries, numbers, (n) =>
                fig(n, compactParts),
              ),
            }
          : {}),
        parts: metric.structure.entries.map((label, index) => {
          // In bounds: the length check above is what makes this safe. The
          // fallback exists only because the compiler cannot see that.
          const n = numbers[index] ?? 0;
          return {
            label,
            figure: fig(n, compactParts),
            share: Math.min(Math.max(n / scale, 0), 1),
            // Only where two blocks are laid side by side. Everything else scales
            // against the largest part, and a second fraction on those would be a
            // field nothing reads.
            ...(display === "adjacent" && total > 0
              ? { span: Math.min(Math.max(n / total, 0), 1) }
              : {}),
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

  const ordered = shown.sort(compareByWidth);
  return {
    functionArea,
    label: METRIC_FUNCTION_LABELS[functionArea],
    shown: ordered,
    held,
    ...layoutArea(ordered, held),
  };
}

/**
 * One tab's structure: the figure row, then the packed card grid, then the held grid.
 *
 * The figures keep the catalogue's own order among themselves rather than being
 * re-sorted — they are all one width, so there is nothing for a width sort to say
 * about them, and the catalogue order is the one place a deliberate sequence exists
 * (bench strength before managers before leadership depth is the pyramid).
 */
export function layoutArea(
  shown: readonly ShownMetric[],
  held: readonly HeldMetric[],
): Pick<FunctionAreaView, "figures" | "cards" | "heldCards"> {
  const figures = shown.filter((metric) => metric.shape === "scalar");
  const drawn = shown.filter((metric) => metric.shape !== "scalar");

  const packed = packWidths(drawn.map(metricWidth));
  const cards = drawn.map((metric, index) => ({
    shown: metric,
    // In bounds by construction: `packWidths` returns one width per input.
    width: packed[index] ?? metricWidth(metric),
  }));

  const heldPacked = packWidths(held.map(heldWidth));
  const heldCards = held.map((metric, index) => ({
    held: metric,
    width: heldPacked[index] ?? heldWidth(metric),
  }));

  return { figures, cards, heldCards };
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
