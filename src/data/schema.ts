import { z } from "zod";

import { BUSINESS_TAGS } from "./business-tags";

/**
 * The published dataset shape. This is the contract for every consumer: the
 * seed importer writes it, the DataStore validates it on read, and admin will
 * validate against it before a publish is allowed.
 *
 * Columns kept and dropped are recorded in .kiro/steering/project.md and
 * justified in docs/data-audit.md. Two rules govern this file:
 *
 *   - Nothing derivable is stored. Location count, tier-2 presence and the FTE
 *     display string all come from `cities` and `fte` at read time. Storing
 *     them is how two fields start disagreeing.
 *   - Taxonomy is a first-class entity, and `revenueBands` is ORDERED,
 *     ascending. Peer matching's "adjacent band" step is index arithmetic on
 *     that array, so the order is data, not presentation.
 */

const nonEmpty = z.string().trim().min(1);

const slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "id must be a lowercase slug");

export const fteRangeSchema = z
  .object({
    min: z.number().int().min(0),
    max: z.number().int().min(0),
  })
  .refine((r) => r.max >= r.min, {
    message: "fte.max must be greater than or equal to fte.min",
  });

export const companySchema = z.object({
  /** Stable slug. The source has one duplicate name, so the name is not a key. */
  id: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "id must be a lowercase slug"),
  name: nonEmpty,
  /** Country, not city — the source column is misleadingly named "Company HQ". */
  hqCountry: nonEmpty,
  industry: nonEmpty,
  revenueBand: nonEmpty,
  /** Year the India GCC was established. */
  establishedYear: z.number().int().min(1900).max(2100),
  /** One or more India cities. Order as supplied. */
  cities: z.array(nonEmpty).min(1),
  /** The only headcount field kept. Always a closed pair; see the audit. */
  fte: fteRangeSchema,
  fortuneGlobal500: z.boolean(),
  forbesGlobal2000: z.boolean(),
  /**
   * What this company actually does, by reference to `dataset.businessTypes`.
   *
   * Defaulted to `[]` rather than required, which is the whole reason this could
   * be added without touching `DATASET_VERSION` or re-importing: a company row
   * written before the field existed still parses, and an untagged company falls
   * through to industry-level peer matching — byte-identically to how the product
   * behaved before any of this existed. That is what makes the tagging safe to
   * roll out one industry at a time.
   *
   * An ARRAY because a handful of companies genuinely are two businesses; the
   * dataset is overwhelmingly length 0 or 1. Where there are two, similarity uses
   * the union of their tags, so a conglomerate is a credible peer for both sides
   * of itself rather than a diluted match for neither.
   */
  businessTypes: z.array(nonEmpty).default([]),
});

/**
 * A business type: what a visitor picks, and the tag set a company inherits.
 *
 * Admin-editable, unlike the tag vocabulary it draws from — ANSR must be able to
 * add "Quick commerce" without a developer, but must not be able to invent a tag,
 * because a tag nobody else carries matches nothing and deleting one silently
 * re-scores every peer set in the product. See `business-tags.ts`.
 */
export const businessTypeSchema = z.object({
  id: slug,
  /** The public dropdown label. Renaming is free; changing `id` is not. */
  name: nonEmpty.max(80),
  /** Must be a value in `taxonomy.industries`. Checked below. */
  industry: nonEmpty,
  /**
   * At least two, because similarity needs something to share. A one-tag type
   * would either match everything in its industry or nothing.
   */
  tags: z.array(z.enum(BUSINESS_TAGS)).min(2).max(16),
});

/**
 * Where a city sits, so the density map can plot it.
 *
 * Bounded to India's own extent rather than to the globe. `MAP_FRAME` in geo.ts is
 * the field the map draws, and a coordinate outside it would render a dot on the
 * frame's edge or clipped away entirely — which reads as a broken map rather than as
 * a bad number. The bounds are deliberately a little wider than the frame so a city
 * on the boundary is not refused by rounding.
 */
export const latLonSchema = z.object({
  lat: z.number().min(5).max(38.5),
  lon: z.number().min(66).max(99),
});

/**
 * The four flat string lists, named so "a taxonomy list" has a type.
 *
 * `keyof Taxonomy` used to mean exactly this, and it stopped meaning it the moment
 * the two parallel keys below arrived — one is a record, the other holds copies of
 * strings from `industries` rather than values of its own. Everything that
 * generically walks the lists (the rename cascade, the usage counts, the diff, the
 * editor's own config) wants these four and nothing else, so they get their own key
 * type instead of a wider one each of those places would have to narrow again.
 */
export const TAXONOMY_LIST_KEYS = [
  "industries",
  "revenueBands",
  "cities",
  "hqCountries",
] as const;

export type TaxonomyListKey = (typeof TAXONOMY_LIST_KEYS)[number];

export const taxonomySchema = z.object({
  industries: z.array(nonEmpty).min(1),
  /** Ascending. Adjacency in peer matching is a step in this array. */
  revenueBands: z.array(nonEmpty).min(1),
  cities: z.array(nonEmpty).min(1),
  hqCountries: z.array(nonEmpty).min(1),
  /**
   * Industries held in the dropdown's leading tier whatever their company count.
   *
   * **A parallel list of names rather than a flag on a restructured `industries`,
   * and that is a compatibility decision.** `industries` is a `string[]` that
   * companies, business types and the public dropdowns all key on by value;
   * turning it into an array of objects would touch every one of those consumers
   * to buy one boolean. A second list of the same strings costs a referential
   * check, which `datasetSchema` does below.
   *
   * Defaulted, so a dataset written before the key existed still reads. Order
   * inside the tier is still by count — this decides membership, not position.
   */
  pinnedIndustries: z.array(nonEmpty).default([]),
  /**
   * Coordinates for cities the code does not already know.
   *
   * **An OVERLAY on `CITY_COORDINATES`, never a replacement for it.** The code's
   * table is geographic fact for the 31 cities the seed shipped, and it stays the
   * source for those so the taxonomy editor cannot move Bengaluru. What this adds
   * is the one thing the code cannot supply: where a city added after the seed
   * actually is. `projectCity` reads the overlay first, then the table.
   *
   * A city with no coordinate on either side is counted, ranked and listed as
   * normal and simply carries no dot. Nothing on the public screen says so — see
   * the admin hint, which is where the gap is surfaced.
   */
  cityCoordinates: z.record(nonEmpty, latLonSchema).default({}),
});

/* ==========================================================================
   Screen 2 — the function metric catalogue

   A second dataset with no spreadsheet behind it. It lives under its own
   top-level key inside the same `Dataset` rather than in a second file, which
   is what lets it reuse the whole existing pipeline: this schema is the publish
   gate, `formatIssues` turns a failure into a message naming the metric, the
   diff and the browser draft carry it, and the mtime-and-size read cache
   invalidates it. A second file would need a second store target, a second
   diff, and a publish that could half-succeed.
   ========================================================================== */

/**
 * The four function areas. These ARE the public UI — Screen 2's tabs.
 *
 * Named `functionArea` and not `function` because `function` cannot be
 * destructured; `const { function } = metric` is a syntax error, and a field
 * name that breaks at the first refactor is not worth the two saved characters.
 */
export const METRIC_FUNCTIONS = ["tech", "operations", "hr", "finance"] as const;

/**
 * The four lenses. An INTERNAL FILING SYSTEM, and never a public label.
 *
 * The brief's author used six (adding Fit and Optional); those two collapse into
 * the four here, because both were really supply questions: Fit is comparative
 * capability supply across delivery locations, and the Optional diversity block
 * is the composition of the workforce on offer. Nothing from the brief lost a
 * home — see docs/brief.md and the catalogue in src/data/metric-catalogue.ts.
 *
 * The admin surface does show these, because admin is internal staff and this is
 * what a filing system is for. `publicMetric` in src/data/metrics.ts strips the
 * field, so it cannot reach a visitor even by accident.
 */
export const METRIC_LENSES = ["supply", "speed", "place", "cost"] as const;

/**
 * How a number is read. Governs rendering and the bounds checked below.
 *
 * There is deliberately NO currency format, and there never will be: the brief
 * forbids absolute per-head salary figures in any lens, gated or not, so the
 * schema is built so money cannot be expressed rather than trusting everyone to
 * remember. Cost is indices, spreads, growth rates and relative positions. The
 * `unit` check below closes the obvious way round it.
 */
export const METRIC_FORMATS = [
  "number",
  "percent",
  "index",
  "duration",
  "rating",
] as const;

export type MetricFunction = (typeof METRIC_FUNCTIONS)[number];
export type MetricLens = (typeof METRIC_LENSES)[number];
export type MetricFormat = (typeof METRIC_FORMATS)[number];

/** Currency, in any of the forms someone would reach for. */
const CURRENCY_PATTERN =
  /[₹$€£¥]|\b(inr|usd|eur|gbp|jpy|rs|rupees?|lakhs?|crores?|dollars?|euros?|pounds?)\b/i;

const unitSchema = z
  .string()
  .trim()
  .min(1)
  .max(60)
  .refine((unit) => !CURRENCY_PATTERN.test(unit), {
    message:
      "cost is expressed as indices, spreads and growth rates — a currency unit would make this an absolute money figure, which is never shown",
  });

/**
 * The metric's SHAPE, authored once and independent of whether anyone has
 * entered a number yet.
 *
 * Keeping structure out of the value is what makes two things work. Values can
 * be absent — none of the Screen 2 figures have been supplied, so the catalogue
 * ships with definitions and nulls rather than invented numbers. And a gated
 * metric still has a shape to render a placeholder from without a value
 * existing anywhere near the browser.
 */
export const metricStructureSchema = z.discriminatedUnion("kind", [
  /** One number. */
  z.object({ kind: z.literal("scalar") }),
  /**
   * A spread. The end labels belong here rather than on the value because which
   * operating model each end represents is part of the definition — "as low as
   * 7 days with an employer of record, against 30 for a build-operate-transfer"
   * is the brief's own note, not a measurement.
   */
  z.object({
    kind: z.literal("range"),
    minLabel: z.string().trim().min(1).max(120).optional(),
    maxLabel: z.string().trim().min(1).max(120).optional(),
  }),
  /** Named parts: a split by discipline, by segment, by milestone. */
  z.object({
    kind: z.literal("breakdown"),
    entries: z.array(nonEmpty).min(2).max(24),
  }),
  /** A comparison grid: capability by location, cost by role and level. */
  z.object({
    kind: z.literal("matrix"),
    rows: z.array(nonEmpty).min(1).max(24),
    columns: z.array(nonEmpty).min(2).max(12),
  }),
]);

/**
 * The numbers, when they exist. `null` inside a breakdown or a matrix is a cell
 * nobody has filled yet, which is different from a zero.
 */
export const metricValueSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("scalar"), value: z.number() }),
  z.object({
    kind: z.literal("range"),
    min: z.number(),
    max: z.number(),
  }),
  z.object({
    kind: z.literal("breakdown"),
    values: z.array(z.number().nullable()),
  }),
  z.object({
    kind: z.literal("matrix"),
    /** Numbers, or a rating label when the format is `rating`. */
    cells: z.array(z.array(z.union([z.number(), nonEmpty, z.null()]))),
  }),
]);

const metricObjectSchema = z.object({
  id: slug,
  functionArea: z.enum(METRIC_FUNCTIONS),
  /** Internal only. Stripped by `publicMetric`. */
  lens: z.enum(METRIC_LENSES),
  /** The public heading. */
  title: nonEmpty.max(120),
  /** The brief's "Why:" note, in the visitor's terms. Public. */
  question: nonEmpty.max(300),
  unit: unitSchema.optional(),
  format: z.enum(METRIC_FORMATS),
  /** Required when `format` is "rating", forbidden otherwise. */
  ratingScale: z.array(nonEmpty).min(2).max(8).optional(),
  /** Required when `format` is "index": an index with no stated base is unreadable. */
  indexBaseline: z.string().trim().min(1).max(80).optional(),
  /**
   * The figures are a floor, not a point measurement, and render with a trailing
   * "+".
   *
   * Part of the DEFINITION rather than of the value, which is why it lives beside
   * `format` and not inside `metricValueSchema`: "8.7 million or more technology
   * professionals" is a claim about how the figure was arrived at, and it holds
   * whatever number is entered next month. Keeping it here also means the admin
   * editor cannot flip it while typing a value — the same reason `format` and
   * `gated` are not editable either.
   *
   * Only meaningful where a figure is a count, so it is refused on a rating; an
   * ordinal has no "or more".
   */
  atLeast: z.boolean().optional(),
  /**
   * The parts are waypoints on ONE path, not a set of independent subjects.
   *
   * **Authored, for exactly the reason `indexBaseline` carries direction:** nothing
   * in the data can tell the two apart. "To 50 FTEs / To 100 / To 300 / To 500" and
   * "Same-city cloud region / Another India region / Europe / US East" are both a
   * duration breakdown whose values rise from part to part — the first is one centre
   * measured four times as it grows, the second is four destinations measured once
   * each. Only the author of a metric knows which, and a rule that guessed from
   * monotonicity would have drawn the latency metric as a journey.
   *
   * Deliberately not inferred from the LABELS either. Entry names are
   * admin-editable, so a rule that read "To 500 FTEs" would change the chart the
   * first time somebody renamed a part.
   *
   * Refused on anything but a breakdown of three or more parts: a progression of
   * two points is a range, and it has one already.
   */
  progression: z.boolean().optional(),
  /**
   * The SECOND part is contained by the first. Drawn inside it, not beside it.
   *
   * **Authored for the same reason `progression` is, and it replaces a heuristic
   * that could draw a falsehood.** Containment used to be inferred from two parts
   * sharing a `unit` and the smaller being under half the larger — on the argument
   * that a shared unit is the definition's own statement that two parts measure the
   * same KIND of thing. That is a precondition for containment and never evidence of
   * it. "Total Grade A stock" and "vacant and available now" are both million sq ft
   * and the nesting is real; "Engineering, other disciplines" and "Management and
   * MBA graduates" are both graduates a year and are disjoint populations, so
   * nesting them asserts that every MBA graduate holds an engineering degree — a
   * claim the source does not make and that no arithmetic here could check.
   *
   * So the shared unit stays a precondition and this flag is the claim. Two parts in
   * one unit WITHOUT it are drawn adjacent, which states their sizes and asserts no
   * relationship between them.
   *
   * Refused on anything but a breakdown of exactly two parts: with three or more,
   * which one contains which is not expressible by a boolean, and the honest drawing
   * is a set of bars.
   */
  subset: z.boolean().optional(),
  /** Free-text provenance shown to the visitor, e.g. "2026 Q1". */
  asOf: z.string().trim().min(1).max(40).optional(),
  /** Internal working note. Never served — see `publicMetric`. */
  note: z.string().trim().max(600).optional(),
  structure: metricStructureSchema,
  value: metricValueSchema.nullable(),
  /**
   * Behind the gate. A server-side omission, not a CSS blur: `publicMetric`
   * returns a variant that structurally cannot carry a value.
   */
  gated: z.boolean(),
});

/** Bounds per format. Loose enough to be data, tight enough to catch a typo. */
const FORMAT_BOUNDS: Partial<Record<MetricFormat, { min: number; max: number }>> = {
  // Growth can be negative; a rate in the thousands is a units mistake.
  percent: { min: -100, max: 1000 },
  index: { min: 0, max: 10_000 },
  duration: { min: 0, max: 100_000 },
  number: { min: 0, max: 1_000_000_000 },
};

export const metricSchema = metricObjectSchema.superRefine((metric, ctx) => {
  const issue = (message: string, path: (string | number)[] = []) =>
    ctx.addIssue({ code: "custom", path, message });

  if ((metric.format === "rating") !== (metric.ratingScale !== undefined)) {
    issue(
      metric.format === "rating"
        ? "a rating metric needs ratingScale, so the ordinal steps are named"
        : "ratingScale only applies when format is \"rating\"",
      ["ratingScale"],
    );
  }
  if (metric.format === "index" && metric.indexBaseline === undefined) {
    issue("an index needs indexBaseline — an index with no stated base is unreadable", [
      "indexBaseline",
    ]);
  }
  if (metric.format !== "index" && metric.indexBaseline !== undefined) {
    issue("indexBaseline only applies when format is \"index\"", ["indexBaseline"]);
  }
  if (metric.ratingScale && new Set(metric.ratingScale).size !== metric.ratingScale.length) {
    issue("ratingScale repeats a step", ["ratingScale"]);
  }
  if (metric.atLeast && metric.format === "rating") {
    issue("an ordinal step has no \"or more\" — atLeast only applies to a figure", [
      "atLeast",
    ]);
  }
  if (
    metric.progression &&
    (metric.structure.kind !== "breakdown" || metric.structure.entries.length < 3)
  ) {
    issue(
      "a progression is a breakdown of three or more waypoints — two points are a range",
      ["progression"],
    );
  }
  if (metric.progression && metric.atLeast) {
    // A progression is drawn from the DIFFERENCES between its waypoints, and the
    // difference between two floors is not itself a floor. Marking the intervals
    // would claim more than the data does; leaving them unmarked beside marked
    // waypoints would put two kinds of figure in one chart.
    issue("a progression's intervals cannot carry a floor marker", ["atLeast"]);
  }
  if (
    metric.subset &&
    (metric.structure.kind !== "breakdown" || metric.structure.entries.length !== 2)
  ) {
    issue(
      "containment is a claim about exactly two parts — with three or more, which one contains which is not expressible",
      ["subset"],
    );
  }
  if (metric.subset && metric.unit === undefined) {
    // The unit is the definition's statement that the two parts measure the same
    // kind of thing, which is a precondition for one being inside the other. A
    // containment claim over two parts that do not declare a shared kind is the
    // meetup-groups-and-conferences defect with a flag on it.
    issue("a contained part needs a unit shared with its total", ["subset"]);
  }
  if (metric.subset && metric.progression) {
    // Waypoints on one path are all contained by the last of them, so the flag
    // would be either redundant or a second, contradictory reading of the parts.
    issue("a progression's waypoints are already cumulative — subset says nothing", [
      "subset",
    ]);
  }

  // A rating is an ordinal label, so it can only live in cells. Nothing in the
  // brief asks for a lone ordinal, and allowing one would mean a second way to
  // encode the same thing.
  if (metric.format === "rating" && metric.structure.kind !== "matrix") {
    issue("a rating is only meaningful in a comparison grid", ["format"]);
  }

  const duplicates = (values: readonly string[]) =>
    new Set(values).size !== values.length;
  if (metric.structure.kind === "breakdown" && duplicates(metric.structure.entries)) {
    issue("two parts share a label", ["structure", "entries"]);
  }
  if (metric.structure.kind === "matrix") {
    if (duplicates(metric.structure.rows)) issue("two rows share a label", ["structure", "rows"]);
    if (duplicates(metric.structure.columns)) {
      issue("two columns share a label", ["structure", "columns"]);
    }
  }

  /**
   * Gated metrics: no digits in the two fields that do reach the browser.
   *
   * The gate is a server-side omission, so the value is safe. The leak this
   * closes is the sentence next to it — a title or question written as "is India
   * 40% cheaper fully loaded?" hands over the answer the gate exists to hold
   * back, and no amount of care about the value field prevents it.
   */
  if (metric.gated) {
    for (const field of ["title", "question"] as const) {
      if (/\d/.test(metric[field])) {
        issue(
          `a gated metric's ${field} is public, so it cannot contain a figure — describe the question, not the answer`,
          [field],
        );
      }
    }
  }

  const value = metric.value;
  if (value === null) return;

  if (value.kind !== metric.structure.kind) {
    issue(
      `the value is a ${value.kind} but the metric is defined as a ${metric.structure.kind}`,
      ["value", "kind"],
    );
    return;
  }

  const bounds = FORMAT_BOUNDS[metric.format];
  const checkNumber = (n: number, path: (string | number)[]) => {
    if (!Number.isFinite(n)) {
      issue("not a finite number", path);
      return;
    }
    if (bounds && (n < bounds.min || n > bounds.max)) {
      issue(
        `${n} is outside the range a ${metric.format} metric can hold (${bounds.min} to ${bounds.max})`,
        path,
      );
    }
  };

  if (value.kind === "scalar") {
    checkNumber(value.value, ["value", "value"]);
  }

  if (value.kind === "range") {
    checkNumber(value.min, ["value", "min"]);
    checkNumber(value.max, ["value", "max"]);
    if (value.max < value.min) {
      issue("the upper end is below the lower end", ["value", "max"]);
    }
  }

  if (value.kind === "breakdown" && metric.structure.kind === "breakdown") {
    if (value.values.length !== metric.structure.entries.length) {
      issue(
        `${value.values.length} values for ${metric.structure.entries.length} parts — every part needs a slot, even an empty one`,
        ["value", "values"],
      );
    }
    value.values.forEach((n, index) => {
      if (n !== null) checkNumber(n, ["value", "values", index]);
    });
  }

  if (value.kind === "matrix" && metric.structure.kind === "matrix") {
    const { rows, columns } = metric.structure;
    if (value.cells.length !== rows.length) {
      issue(
        `${value.cells.length} rows of cells for ${rows.length} rows`,
        ["value", "cells"],
      );
    }
    const scale = metric.ratingScale ? new Set(metric.ratingScale) : null;
    value.cells.forEach((row, rowIndex) => {
      if (row.length !== columns.length) {
        issue(
          `${row.length} cells for ${columns.length} columns`,
          ["value", "cells", rowIndex],
        );
      }
      row.forEach((cell, columnIndex) => {
        const path = ["value", "cells", rowIndex, columnIndex];
        if (cell === null) return;
        if (scale) {
          if (typeof cell !== "string" || !scale.has(cell)) {
            issue(`"${String(cell)}" is not one of the rating steps`, path);
          }
          return;
        }
        if (typeof cell !== "number") {
          issue("only a rating metric may hold text in a cell", path);
          return;
        }
        checkNumber(cell, path);
      });
    });
  }
});

/* ==========================================================================
   Site content — the entry point's own words and figures

   The two things on the public entry point that are neither a company row nor a
   function metric, and that ANSR has to be able to change without a developer:
   the hero's copy, and the corporate impact figures.

   **Why these are data and the rest of the copy is not.** Every other string on
   the public screens is an argument about the dataset, so it lives beside the
   logic that makes the argument (`screen1/copy.ts`) and changing it is a
   reviewable code change. These two are different: the hero is positioning,
   which marketing owns, and the impact figures are corporate facts that move on
   their own schedule and are wrong the moment they are stale. A figure that goes
   stale because editing it needed a developer is the exact failure this key
   exists to prevent.

   Deliberately NOT in `taxonomy` — taxonomy is flat string lists with rename
   cascades and usage counts, and none of that machinery applies here. `metrics`
   and `businessTypes` set the precedent for an editable collection beside it.
   ========================================================================== */

/**
 * The hero band's copy: a title and a supporting line, and deliberately nothing
 * else.
 *
 * **There is no kicker field, and its absence is the design.** The product label
 * IS the title here — the band used to carry an uppercase eyebrow above an
 * unrelated headline, and collapsing the two is what lets a centred block read
 * as one object instead of three stacked fragments. A schema with a `kicker` slot
 * is an invitation to fill it, so the slot is gone rather than left empty.
 *
 * Bounded lengths rather than free text, because both have a typographic job the
 * layout depends on. `title` renders at 60-80px in a centred column: past ~60
 * characters it takes a third line on desktop and pushes the overlapping card
 * below it off the first screen. `lead` is capped near the reading measure. An
 * admin needing more words than this needs a different band, and the form says
 * so rather than letting them find out on the live site.
 */
export const heroCopySchema = z.object({
  title: nonEmpty.max(60),
  lead: nonEmpty.max(240),
});

/**
 * One corporate impact figure.
 *
 * `value` is free text and stays that way on purpose. These are not computed
 * from anything — they are ANSR's own published figures, already carrying their
 * own units and qualifiers ("225K+", "$2.5B+", "14M+"). Splitting a number from
 * its suffix would mean the schema deciding how "$2.5B+" is assembled, and the
 * next figure ANSR supplies would break the parts list. The `atLeast` reasoning
 * from the metric catalogue does not transfer: there the `+` is a claim about
 * how a figure was derived from data we hold, and here the whole string is
 * supplied.
 *
 * Which also means nothing here can be validated as a number, so nothing
 * pretends to. The gate checks it is short enough to render.
 */
export const impactStatSchema = z.object({
  id: slug,
  value: nonEmpty.max(16),
  label: nonEmpty.max(64),
});

/**
 * The close's copy — the one band on the RESULT screens that is editable data.
 *
 * **It is here for the same reason the hero is, and that reason is the test any future
 * addition has to pass.** Every other public string is an argument about the dataset and
 * lives beside the logic making the argument, so moving it into data would separate a
 * claim from the thing that justifies it. The close makes no claim about the dataset: it
 * is positioning and an offer, on ANSR's own schedule rather than the data's. Same
 * category as the hero, so it gets the same treatment.
 *
 * **Two fields, because the band renders two strings.** There is no heading — the band's
 * accessible name is an `aria-label` in the component, and a heading field nothing draws
 * would be a field asked for and never consumed. If a heading comes back it is a schema
 * addition and a component change together, which is the right amount of friction.
 *
 * The caps are the render limits rather than editorial taste. `body` is the band's display
 * line, set large and centred at the lead measure: past roughly 140 characters it runs to
 * four lines and the button falls out of the first screenful on a phone. `ctaLabel` sits
 * in a pill that must not wrap — 28 characters is what fits at 390 with the pill's own
 * padding, measured rather than guessed.
 */
export const closeCopySchema = z.object({
  body: nonEmpty.max(140),
  ctaLabel: nonEmpty.max(28),
});

/**
 * One customer mark in the entry point's scrolling strip.
 *
 * **The file is chosen from what is already served, never uploaded.** `src` is
 * validated as a path under `/logos/`, so this field cannot become a way to point the
 * strip at an arbitrary URL — the marks are adapted copies committed to
 * `public/logos/`, and adapting a new one is a `brand_asset.py` step rather than a
 * form field. What an admin controls is which of them appear, in what order, and
 * under what name.
 *
 * `width` and `height` are the mark's own ink bounds, and both are needed: the strip
 * caps height AND width, because ten marks across three aspect ratios set to one
 * uniform height render a 4.9:1 wordmark six times the optical weight of a 0.8:1
 * stacked mark. See `customer-logos.tsx`.
 */
export const customerLogoSchema = z.object({
  /** The company, as its accessible name. Never drawn as text. */
  name: nonEmpty.max(40),
  src: z
    .string()
    .regex(
      /^\/logos\/[A-Za-z0-9._-]+\.(svg|png)$/,
      "src must be a file already served from /logos/, e.g. /logos/nike.svg",
    ),
  width: z.number().int().min(1).max(400),
  height: z.number().int().min(1).max(200),
});

/**
 * The static visitor-facing strings, as data.
 *
 * **Only the ones that state no CLAIM about the dataset, which is the line every
 * entry here had to clear.** Most copy on the public screens is an argument about
 * the company data and lives beside the logic making that argument — a sentence
 * naming a count, a share or an ordering has to move when the thing it describes
 * moves, so holding it as free text would let it drift into a falsehood nothing
 * catches. Those stay in `copy.ts`, as do all the derived sentences, which are
 * functions of the visitor's answers and have no fixed wording to edit.
 *
 * What is here is headings, labels and attributions: they name what a reader is
 * looking at without asserting anything about it. Two exceptions kept in code
 * deliberately, both because the exact wording is load-bearing:
 * `FUNCTIONS_TITLE`, whose phrasing is what stops eight function tags being read
 * as a claim about the five companies above them, and `peerCountLine` and its
 * siblings, which state exact counts.
 *
 * **Every cap is a render limit measured on the real layout, not editorial
 * taste.** The two band lines especially: `HeaderFinding` sets at 48px capped at
 * the lead measure, so past roughly 36 characters it wraps — and a two-line band
 * on one view beside a one-line band on the other puts back the height jump
 * across the tab switch that the pair exists to remove.
 */
export const publicCopySchema = z.object({
  /* The entry point's form card. */
  askTitle: nonEmpty.max(48),
  askLead: nonEmpty.max(200),
  askSubmit: nonEmpty.max(32),
  /* The logo strip's accessible name, and the impact band's heading. */
  customersLabel: nonEmpty.max(80),
  impactTitleLead: nonEmpty.max(40),
  /* The result band, shared by both screens. Capped to hold one line. */
  headerPeers: nonEmpty.max(40),
  headerFunctions: nonEmpty.max(40),
  /* The view switch. Two equal halves, so neither may wrap. */
  viewPeers: nonEmpty.max(24),
  viewFunctions: nonEmpty.max(24),
  /* Peer landscape section headings. */
  peersTitle: nonEmpty.max(60),
  industryTitle: nonEmpty.max(40),
  /* The peer card's three small-caps labels. */
  peerHeadcountLabel: nonEmpty.max(24),
  peerCitiesLabel: nonEmpty.max(24),
  peerSinceLabel: nonEmpty.max(24),
  /**
   * The snapshot's cell labels — THREE of the four, not all of them.
   *
   * The opening cell's label is deliberately absent, and its absence is the rule
   * this whole object is held to: a field an admin can fill that nothing draws is
   * worse than no field at all. That label is COMPOSED over the visitor's own scope
   * — "GCCs in your industry" or "GCCs in your sub-industry" — so a flat string
   * could hold only one of its two branches, and an admin editing it would change
   * neither. It stays in `copy.ts` with the other derived wording.
   */
  snapshotHeadcountLabel: nonEmpty.max(32),
  snapshotCitiesLabel: nonEmpty.max(32),
  snapshotLeadingCityLabel: nonEmpty.max(32),
  /* The terminating scale strip. Each label is a whole sentence's predicate. */
  scaleTitle: nonEmpty.max(60),
  scaleFortuneLabel: nonEmpty.max(120),
  scaleForbesLabel: nonEmpty.max(120),
  scalePeopleLabel: nonEmpty.max(140),
  /* Function metrics. One figure-row eyebrow per tab. */
  figuresTech: nonEmpty.max(40),
  figuresOperations: nonEmpty.max(40),
  figuresHr: nonEmpty.max(40),
  figuresFinance: nonEmpty.max(40),
  /* The composed tabs' section headings. `velocity` is shared by HR and operations. */
  velocityHeading: nonEmpty.max(40),
  hrAnalysisHeading: nonEmpty.max(40),
  opsSupportingHeading: nonEmpty.max(40),
  /* The attribution under the function view's card. */
  sourceLine: nonEmpty.max(60),
});

export const siteContentSchema = z.object({
  hero: heroCopySchema,
  /**
   * Capped at six. The band is one centred row on desktop, and a seventh figure
   * either wraps to a second row of one or shrinks all of them below the size
   * that makes a figure read as a figure. Five is what ANSR supplied.
   */
  impactStats: z.array(impactStatSchema).max(6),
  /**
   * **Defaulted rather than required, and that is a compatibility decision with a
   * precedent.** `metrics` was defaulted to `[]` for exactly this reason: the fs store
   * refuses an unrecognised `version`, so requiring a new key would turn a compatible
   * addition into a broken read of every dataset written before it existed — including
   * the one committed in `data/`. With a default, an older file reads and publishes
   * forward.
   */
  close: closeCopySchema.default(() => DEFAULT_CLOSE_COPY),
  /**
   * The functions block on the peer view.
   *
   * **A plain list of labels that claims nothing, which is why it can be data at
   * all.** There is no per-company function record in this dataset and there will
   * not be one, so the block draws no numeral, no bar and no order — the tags are a
   * statement about India GCCs in general, made by the section heading above them.
   * That heading stays in code for exactly that reason; these do not have to.
   *
   * Capped at 12 and each item at 32 characters, because the set wraps as one row of
   * tags with no column count: an item much longer than the rest is the one that
   * decides the layout. The shipped eight sit inside a 16-to-28 character range.
   */
  commonFunctions: z.array(nonEmpty.max(32)).min(1).max(12).default(() => [
    ...DEFAULT_COMMON_FUNCTIONS,
  ]),
  /**
   * The customer strip. Defaulted, and capped at twelve — the strip scrolls, so a
   * longer set is not a layout failure, but it stops being a curated set of proof.
   */
  logos: z.array(customerLogoSchema).max(12).default(() => [...DEFAULT_LOGOS]),
  copy: publicCopySchema.default(() => DEFAULT_PUBLIC_COPY),
});

/**
 * Held separately from `DEFAULT_SITE_CONTENT` so the schema's own `.default()` can name it
 * without forward-referencing the larger object it is a member of.
 */
export const DEFAULT_CLOSE_COPY: CloseCopy = {
  body:
    "Access the complete dataset, deeper benchmarks and detailed cost " +
    "structures behind your results.",
  ctaLabel: "Unlock full intelligence",
};

/**
 * The eight functions, in the order ANSR supplied. Order carries no claim — the
 * block states none — so it is the order they are read in and nothing more.
 */
export const DEFAULT_COMMON_FUNCTIONS: readonly string[] = [
  "Technology & engineering",
  "Data & analytics",
  "Finance & accounting",
  "Shared services & operations",
  "Human resources",
  "Customer & partner support",
  "Procurement & supply chain",
  "Legal, risk & compliance",
];

/**
 * The ten marks, with the ink bounds each was measured at. Walmart's export
 * arrived with a `viewBox` nine tenths too small, so only "Wal" rendered; the
 * corrected file is what these dimensions describe.
 */
export const DEFAULT_LOGOS: readonly CustomerLogo[] = [
  { name: "Best Buy", src: "/logos/bestbuy.png", width: 106, height: 64 },
  { name: "Target", src: "/logos/target.svg", width: 62, height: 79 },
  { name: "Walmart", src: "/logos/walmart.svg", width: 107, height: 22 },
  { name: "Lowe's", src: "/logos/lowes.svg", width: 125, height: 62 },
  { name: "Nike", src: "/logos/nike.svg", width: 98, height: 51 },
  { name: "Airbnb", src: "/logos/airbnb.svg", width: 86, height: 72 },
  { name: "X", src: "/logos/x.svg", width: 55, height: 50 },
  { name: "Wells Fargo", src: "/logos/wellsfargo.png", width: 127, height: 64 },
  { name: "PepsiCo", src: "/logos/pepsico.png", width: 81, height: 64 },
  { name: "Goldman Sachs", src: "/logos/goldmansachs.png", width: 154, height: 64 },
];

/**
 * The shipped wording for every static string, and the fallback a dataset written
 * before this key existed reads with.
 *
 * Each of these was authored in `copy.ts` and the reasoning for the wording stays
 * there — this is the value, not the argument for it. Changing one here changes the
 * live site on the next publish; changing the reasoning is still a code edit.
 */
export const DEFAULT_PUBLIC_COPY: PublicCopy = {
  askTitle: "Build your GCC intelligence view",
  askLead:
    "Share your company details to identify relevant companies with GCCs in " +
    "India and explore talent, capability and location metrics.",
  askSubmit: "See my results",
  customersLabel: "Companies ANSR has worked with in India",
  impactTitleLead: "Impact delivered by",
  headerPeers: "How your industry operates in India",
  headerFunctions: "The India market beyond your industry",
  viewPeers: "Peer Landscape",
  viewFunctions: "Function Metrics",
  peersTitle: "India GCCs closest to your profile",
  industryTitle: "Inside India's GCC base",
  peerHeadcountLabel: "GCC headcount",
  peerCitiesLabel: "Cities",
  peerSinceLabel: "In India since",
  snapshotHeadcountLabel: "Typical GCC headcount",
  snapshotCitiesLabel: "Indian cities with a GCC",
  snapshotLeadingCityLabel: "Leading GCC city",
  scaleTitle: "The world's largest companies, in India",
  scaleFortuneLabel: "Fortune Global 500 companies run a GCC in India.",
  scaleForbesLabel: "Forbes Global 2000 companies run a GCC in India.",
  scalePeopleLabel:
    "people work in those Fortune Global 500 and Forbes Global 2000 GCCs in India.",
  figuresTech: "India's technology talent",
  figuresOperations: "India's operations landscape",
  figuresHr: "India's hiring market",
  figuresFinance: "India's cost base",
  velocityHeading: "How long hiring takes",
  hrAnalysisHeading: "Scale and salary pressure",
  opsSupportingHeading: "Scale and connectivity",
  sourceLine: "Source: ANSR Research",
};

/**
 * What ships when the key is absent, and what `--reseed-site-content` restores.
 *
 * Inline here rather than in a catalogue file of its own, unlike
 * `metric-catalogue.ts`: this is three strings and five pairs, and a separate
 * module would have to import the types from here, which is a cycle bought for
 * nothing. It is also the schema's own `.default()`, so it has to be in scope at
 * definition time.
 *
 * **Every figure below is ANSR's own supplied copy and none of it is derived.**
 * The company count in the lead is deliberately "1,800+" and not the dataset's
 * actual 1,834: ANSR asked for the rounded form, and a figure that moves by
 * three every time a company is added is not the claim they want to make. So it
 * is a string an admin edits, not `companies.length` — and `data:verify` cannot
 * check it against the data, because it is not supposed to agree exactly.
 */
export const DEFAULT_SITE_CONTENT: SiteContent = {
  hero: {
    title: "ANSR GCC Intelligence",
    lead:
      "A tool to evaluate your GCC opportunity using competitor data and " +
      "benchmarks from 1,800+ global companies operating centres in India.",
  },
  impactStats: [
    { id: "professionals-hired", value: "225K+", label: "Professionals hired" },
    { id: "centers-established", value: "210+", label: "Global centres established" },
    {
      id: "workspace-managed",
      value: "14M+",
      label: "Sq ft of workspace under management",
    },
    { id: "years-experience", value: "20+", label: "Years of experience" },
    { id: "capital-created", value: "$2.5B+", label: "Capital investment created" },
  ],
  close: DEFAULT_CLOSE_COPY,
  /**
   * **Key order here matches `siteContentSchema`'s declaration order, and that is a
   * correctness requirement rather than tidiness.** Zod emits a parsed object in the
   * order its schema declares, `serializeDataset` is `JSON.stringify`, and
   * `JSON.stringify` preserves insertion order — so a literal whose keys run in a
   * different order serialises to different bytes than the same content round-tripped
   * through the schema. The GitHub store asserts the two are byte-identical, because
   * otherwise a publish through one store shows up as a whole-file rewrite in the
   * other's diff.
   */
  commonFunctions: [...DEFAULT_COMMON_FUNCTIONS],
  logos: [...DEFAULT_LOGOS],
  copy: DEFAULT_PUBLIC_COPY,
};

export type HeroCopy = z.infer<typeof heroCopySchema>;
export type ImpactStat = z.infer<typeof impactStatSchema>;
export type CloseCopy = z.infer<typeof closeCopySchema>;
export type CustomerLogo = z.infer<typeof customerLogoSchema>;
export type PublicCopy = z.infer<typeof publicCopySchema>;
export type LatLon = z.infer<typeof latLonSchema>;
export type SiteContent = z.infer<typeof siteContentSchema>;

export type MetricStructure = z.infer<typeof metricStructureSchema>;
export type MetricValue = z.infer<typeof metricValueSchema>;
export type Metric = z.infer<typeof metricSchema>;

export const datasetSchema = z
  .object({
    /** Bumped by hand only when the shape changes, not per publish. */
    version: z.number().int().min(1),
    generatedAt: z.string().datetime(),
    /** Where this batch came from. Free text, for the admin's benefit. */
    source: nonEmpty,
    taxonomy: taxonomySchema,
    companies: z.array(companySchema).min(1),
    /**
     * The business-type catalogue. Defaulted for the same reason `metrics` is:
     * a dataset written before the key existed still reads, so this is a
     * backwards-compatible addition rather than a version bump the fs store
     * would refuse.
     *
     * Not part of `taxonomy`, deliberately. Taxonomy is four flat string lists
     * and the whole rename-cascade, usage-count and diff machinery assumes that
     * shape; a record-shaped fifth key would have needed a special case in every
     * one of them. `metrics` set the precedent for an editable collection that
     * lives beside taxonomy instead of inside it.
     */
    businessTypes: z.array(businessTypeSchema).max(400).default([]),
    /**
     * The Screen 2 catalogue. Defaulted rather than required, so a dataset
     * written before this key existed still reads and `DATASET_VERSION` does not
     * have to move — the fs store refuses a version it does not recognise, and
     * bumping it would turn a backwards-compatible addition into a broken read.
     * The parsed type is non-optional, so no consumer has to consider absence.
     */
    metrics: z.array(metricSchema).max(400).default([]),
    /**
     * The entry point's hero copy and impact figures. Defaulted for the same
     * reason `metrics` and `businessTypes` are — a dataset written before this
     * key existed still reads, so it is a backwards-compatible addition rather
     * than a `DATASET_VERSION` bump the fs store would refuse as an unknown
     * version.
     *
     * The default is real content rather than `[]`, which is the one difference
     * from the other two. An empty company list or metric catalogue is a
     * coherent state — nothing renders. An empty hero is not: the entry point
     * has no headline, and there is no visitor-facing story where that is the
     * right outcome. So this key cannot be empty, and the seed is the approved
     * copy.
     */
    siteContent: siteContentSchema.default(DEFAULT_SITE_CONTENT),
  })
  .superRefine((dataset, ctx) => {
    const seen = new Set<string>();
    for (const [index, company] of dataset.companies.entries()) {
      if (seen.has(company.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["companies", index, "id"],
          message: `duplicate company id: ${company.id}`,
        });
      }
      seen.add(company.id);
    }

    // Referential integrity against the taxonomy. A company referencing a value
    // the dropdowns do not offer is unreachable by any visitor, so it is an
    // error rather than a warning.
    const checks: ReadonlyArray<
      [TaxonomyListKey, "industry" | "revenueBand" | "hqCountry"]
    > = [
      ["industries", "industry"],
      ["revenueBands", "revenueBand"],
      ["hqCountries", "hqCountry"],
    ];

    for (const [taxonomyKey, companyKey] of checks) {
      const allowed = new Set(dataset.taxonomy[taxonomyKey]);
      for (const [index, company] of dataset.companies.entries()) {
        if (!allowed.has(company[companyKey])) {
          ctx.addIssue({
            code: "custom",
            path: ["companies", index, companyKey],
            message: `${companyKey} "${company[companyKey]}" is not in taxonomy.${taxonomyKey}`,
          });
        }
      }
    }

    const allowedCities = new Set(dataset.taxonomy.cities);
    for (const [index, company] of dataset.companies.entries()) {
      for (const [cityIndex, city] of company.cities.entries()) {
        if (!allowedCities.has(city)) {
          ctx.addIssue({
            code: "custom",
            path: ["companies", index, "cities", cityIndex],
            message: `city "${city}" is not in taxonomy.cities`,
          });
        }
      }
    }
    /* ----------------------------------------------------------------------
       The two parallel taxonomy lists. Both hold copies of strings that live in
       one of the four primary lists, which is the cost of not restructuring
       those into arrays of objects — so both need the check that keeps the copy
       honest. A pinned industry that no longer exists would silently stop
       pinning anything; a coordinate keyed to a deleted city would plot a dot
       for a place no company is in.
       ---------------------------------------------------------------------- */
    const allowedIndustries = new Set(dataset.taxonomy.industries);
    for (const [index, industry] of dataset.taxonomy.pinnedIndustries.entries()) {
      if (!allowedIndustries.has(industry)) {
        ctx.addIssue({
          code: "custom",
          path: ["taxonomy", "pinnedIndustries", index],
          message: `pinned industry "${industry}" is not in taxonomy.industries`,
        });
      }
    }
    for (const city of Object.keys(dataset.taxonomy.cityCoordinates)) {
      if (!allowedCities.has(city)) {
        ctx.addIssue({
          code: "custom",
          path: ["taxonomy", "cityCoordinates", city],
          message: `coordinate for "${city}", which is not in taxonomy.cities`,
        });
      }
    }

    /* ----------------------------------------------------------------------
       Business types.

       Two checks, and the second is the one that matters. A business type is
       scoped to an industry, and a company may only carry a type from its OWN
       industry — otherwise a Retail company could be tagged "Retail banking"
       and would be scored against a pool it can never be a member of, which is
       exactly the kind of silent nonsense the peer set cannot survive.
       ---------------------------------------------------------------------- */
    const businessTypeIds = new Set<string>();
    const industrySet = new Set(dataset.taxonomy.industries);
    const industryOfType = new Map<string, string>();

    for (const [index, type] of dataset.businessTypes.entries()) {
      if (businessTypeIds.has(type.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["businessTypes", index, "id"],
          message: `duplicate business type id: ${type.id}`,
        });
      }
      businessTypeIds.add(type.id);
      industryOfType.set(type.id, type.industry);

      if (!industrySet.has(type.industry)) {
        ctx.addIssue({
          code: "custom",
          path: ["businessTypes", index, "industry"],
          message: `industry "${type.industry}" is not in taxonomy.industries`,
        });
      }

      if (new Set(type.tags).size !== type.tags.length) {
        ctx.addIssue({
          code: "custom",
          path: ["businessTypes", index, "tags"],
          message: `business type "${type.id}" repeats a tag`,
        });
      }
    }

    for (const [index, company] of dataset.companies.entries()) {
      if (new Set(company.businessTypes).size !== company.businessTypes.length) {
        ctx.addIssue({
          code: "custom",
          path: ["companies", index, "businessTypes"],
          message: `${company.name} repeats a business type`,
        });
      }
      for (const [typeIndex, id] of company.businessTypes.entries()) {
        const path = ["companies", index, "businessTypes", typeIndex];
        if (!businessTypeIds.has(id)) {
          ctx.addIssue({
            code: "custom",
            path,
            message: `business type "${id}" is not in businessTypes`,
          });
          continue;
        }
        const owner = industryOfType.get(id);
        if (owner !== undefined && owner !== company.industry) {
          ctx.addIssue({
            code: "custom",
            path,
            message: `business type "${id}" belongs to ${owner}, but ${company.name} is in ${company.industry}`,
          });
        }
      }
    }

    const metricIds = new Set<string>();
    for (const [index, metric] of dataset.metrics.entries()) {
      if (metricIds.has(metric.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["metrics", index, "id"],
          message: `duplicate metric id: ${metric.id}`,
        });
      }
      metricIds.add(metric.id);
    }

    // Impact stat ids are React keys and the admin form's row identity. A
    // duplicate silently makes two rows edit as one.
    const impactIds = new Set<string>();
    for (const [index, stat] of dataset.siteContent.impactStats.entries()) {
      if (impactIds.has(stat.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["siteContent", "impactStats", index, "id"],
          message: `duplicate impact stat id: ${stat.id}`,
        });
      }
      impactIds.add(stat.id);
    }

    for (const key of ["industries", "revenueBands", "cities", "hqCountries"] as const) {
      const values = dataset.taxonomy[key];
      if (new Set(values).size !== values.length) {
        ctx.addIssue({
          code: "custom",
          path: ["taxonomy", key],
          message: `taxonomy.${key} contains duplicates`,
        });
      }
    }
  });

export type FteRange = z.infer<typeof fteRangeSchema>;
export type Company = z.infer<typeof companySchema>;
export type BusinessType = z.infer<typeof businessTypeSchema>;
export type Taxonomy = z.infer<typeof taxonomySchema>;
export type Dataset = z.infer<typeof datasetSchema>;

/** Current shape version. Bump only on a breaking shape change. */
export const DATASET_VERSION = 1;

export function parseDataset(input: unknown): Dataset {
  return datasetSchema.parse(input);
}

/**
 * Formats a ZodError into something an admin can act on. Used by the importer
 * now and by the publish endpoint later — a validation failure blocks a
 * publish, so the message has to name the row.
 */
export function formatIssues(error: z.ZodError, limit = 25): string {
  const lines = error.issues
    .slice(0, limit)
    .map((issue) => `  ${issue.path.join(".") || "(root)"}: ${issue.message}`);
  const extra = error.issues.length - lines.length;
  if (extra > 0) lines.push(`  ...and ${extra} more`);
  return lines.join("\n");
}
