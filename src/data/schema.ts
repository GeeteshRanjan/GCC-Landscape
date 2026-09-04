import { z } from "zod";

import { BUSINESS_TAGS } from "./business-tags";
/**
 * `normalize.ts` imports nothing, so this cannot cycle. The pattern lives there
 * beside `canonicalDomain` because a cleaner and its validator drifting apart is the
 * failure this pairing exists to prevent.
 */
import { CTA_URL_MAX_LENGTH, DOMAIN_PATTERN, isCtaUrl } from "./normalize";

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

/* ==========================================================================
   Copy TEMPLATES — an editable string with a mandatory slot in it
   ========================================================================== */

/**
 * The placeholders a copy template may carry, and the value each one stands for.
 *
 * **A closed set, deliberately.** A template's slot is filled from the view model at
 * render time, so a name here is a promise that the render path has that value in
 * hand — an admin cannot invent `{headcount}` and have it resolve, and a typo would
 * otherwise publish as literal text in a heading. `fillTemplate` replaces only these.
 */
export const COPY_PLACEHOLDERS = {
  /** The visitor's industry, as `view.industry.industry`. */
  industry: "{industry}",
  /** The visitor's own company name. Only legal where a fallback key exists beside it. */
  company: "{company}",
  /** The visitor's own typed text, echoed back by the dropdown filter. */
  query: "{query}",
  /** A metric's own `indexBaseline`, which is itself admin-editable. */
  baseline: "{baseline}",
} as const;

export type CopyPlaceholder = keyof typeof COPY_PLACEHOLDERS;

/**
 * An editable string that MUST contain the slots it is declared with.
 *
 * **The refine is the whole point: a template with its slot deleted is refused, and
 * the save is blocked.** These strings exist because ANSR wanted a heading to name the
 * visitor's own scope, so the slot is not decoration — `Snapshot of {industry} GCCs in
 * India` with the slot removed reads "Snapshot of GCCs in India" on every industry, and
 * the snapshot's section heading is the ONE place the industry is named (all four cell
 * labels stopped naming it precisely so this line could). A silent fallback would make
 * that a rule an admin can switch off without being told. So the schema refuses it, and
 * `site-content-manager.tsx` states the requirement on the field rather than letting the
 * publish be where an admin finds out.
 *
 * **The cap is measured on the FILLED string, not this one.** The longest industry name
 * in the taxonomy is 41 characters, so a caller passes the cap it wants AFTER
 * substitution and this subtracts the slot's own width — otherwise a template that
 * validates renders past the measurement its cap was taken from.
 */
function copyTemplate(key: CopyTemplateKey): z.ZodType<string> {
  const { slots: placeholders, filledMax } = COPY_TEMPLATES[key];
  const slots = placeholders.map((name) => COPY_PLACEHOLDERS[name]);
  /**
   * The widest thing each slot can become, so the cap holds for the worst real case
   * rather than for the template as typed. `industry` is the taxonomy's longest name;
   * `company`, `query` and `baseline` are visitor or admin values with no bound this
   * schema can see, so they are budgeted at the slot's own width and the caller's cap
   * carries the rest.
   */
  const widest: Record<CopyPlaceholder, number> = {
    industry: 41,
    company: 0,
    query: 0,
    baseline: 0,
  };
  const budget = placeholders.reduce(
    (total, name) => total + Math.max(0, widest[name] - COPY_PLACEHOLDERS[name].length),
    0,
  );

  return nonEmpty.max(Math.max(1, filledMax - budget)).refine(
    (value) => slots.every((slot) => value.includes(slot)),
    {
      message:
        slots.length === 1
          ? `must contain ${slots[0]}, which is replaced with the real value`
          : `must contain each of ${slots.join(", ")}, which are replaced with the real values`,
    },
  );
}

/**
 * The character cap the admin editor states for a copy field, template or not.
 *
 * One call so the editor has no branch of its own and no number of its own: a plain
 * string's bound is read off the schema where it is declared, and a template's comes
 * from `COPY_TEMPLATES` because `.refine()` erased it. Returns `undefined` only if a
 * field somehow has neither, which the editor renders as "no limit" rather than
 * guessing.
 */
export function copyFieldMax(key: keyof PublicCopy): number | undefined {
  if (isCopyTemplate(key)) return COPY_TEMPLATES[key].filledMax;
  const field = publicCopySchema.shape[key];
  return field instanceof z.ZodString ? (field.maxLength ?? undefined) : undefined;
}

/**
 * Substitute a template's slots. The one implementation, used by every render path.
 *
 * A slot with no value supplied is left as typed rather than blanked: that can only
 * happen if a caller forgets to pass one, and a visible `{industry}` in a heading is a
 * bug that reports itself, where an empty gap reads as intentional copy.
 */
export function fillTemplate(
  template: string,
  values: Partial<Record<CopyPlaceholder, string>>,
): string {
  let filled = template;
  for (const [name, slot] of Object.entries(COPY_PLACEHOLDERS)) {
    const value = values[name as CopyPlaceholder];
    if (value === undefined) continue;
    filled = filled.split(slot).join(value);
  }
  return filled;
}

/**
 * Every template key, the slots it requires, and the cap on its FILLED length.
 *
 * **This table is the single home for both facts, because `.refine()` erases
 * `maxLength`.** The admin editor reads every other field's cap straight off
 * `publicCopySchema.shape`, which is what stops a bound being restated in the UI and
 * being wrong — a template is a `ZodType` rather than a `ZodString`, so that route is
 * closed and the cap would have had to be typed a second time in the editor. Both sides
 * read this instead: the schema builds the field from it, and `copyFieldMax` hands the
 * editor the same number. `public-copy.test.ts` pins every shipped default against it.
 */
export const COPY_TEMPLATES = {
  snapshotHeading: { slots: ["industry"], filledMax: 72 },
  peersTitle: { slots: ["company"], filledMax: 80 },
  largestTitle: { slots: ["industry"], filledMax: 72 },
  mapTitle: { slots: ["industry"], filledMax: 80 },
  indexedNote: { slots: ["baseline"], filledMax: 60 },
  filterEmpty: { slots: ["query"], filledMax: 60 },
} as const satisfies Record<
  string,
  { slots: readonly CopyPlaceholder[]; filledMax: number }
>;

export type CopyTemplateKey = keyof typeof COPY_TEMPLATES;

/** Whether a copy key is a template, narrowing so callers can reach `COPY_TEMPLATES`. */
export function isCopyTemplate(key: string): key is CopyTemplateKey {
  return key in COPY_TEMPLATES;
}

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
  /**
   * The company's registrable domain, lowercase and bare. The identifier a logo
   * provider is asked for; nothing else in the product reads it.
   *
   * **`.optional()` rather than `.default("")`, and the difference is 1,834 lines.**
   * A defaulted string is written back on every publish, so adding it would put
   * `"domain": ""` on every company in `dataset.json` — a diff nobody can read, on the
   * file whose reviewable diff is the reason there is no database. Optional means an
   * unfilled company carries no key at all and only a real domain shows up.
   *
   * **So a blank must be stored as `undefined`, never `""`.** `sameValue` in `diff.ts`
   * compares through `JSON.stringify`, where those two are not equal — an editor
   * emitting `""` for an untouched blank would report every company as changed.
   *
   * Validated against `DOMAIN_PATTERN` and cleaned by `canonicalDomain`, both in
   * `normalize.ts`, so the admin form and the bulk import cannot disagree about what a
   * domain is. The empty string is accepted here only so a form round-trip cannot fail
   * the gate on a field the admin left alone.
   */
  domain: z
    .string()
    .max(253)
    .refine((value) => value === "" || DOMAIN_PATTERN.test(value), {
      message:
        "domain must be a bare registrable domain, lowercase, with no scheme, www. or path — e.g. nike.com",
    })
    .optional(),
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
 * layout depends on. `title` renders at 40-80px in a leading-aligned column: past
 * ~60 characters it takes a third line on desktop and pushes the overlapping card
 * below it off the first screen. `lead` sits under the headline as a two-line
 * supporting sentence; the cap is set to that target rather than to the reading
 * measure, so an admin cannot quietly grow it into a paragraph that crowds the
 * card. An admin needing more words than this needs a different band, and the form
 * says so rather than letting them find out on the live site.
 */
export const heroCopySchema = z.object({
  title: nonEmpty.max(60),
  lead: nonEmpty.max(180),
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
 * A CTA link as stored: blank, or an absolute `http`/`https` URL with its query string
 * intact.
 *
 * **`.refine` rather than a regex, so this is a `ZodEffects` and has no readable
 * `maxLength`.** That is why the admin form reads `CTA_URL_MAX_LENGTH` from
 * `normalize.ts` instead of introspecting the schema the way it does for every other cap.
 * The bound and the predicate are both imported from the one module that owns them, so
 * the two cannot state different rules — which is the same guarantee reading `.maxLength`
 * off the schema buys elsewhere.
 */
const ctaUrl = z
  .string()
  .trim()
  .max(CTA_URL_MAX_LENGTH)
  .refine((value) => value === "" || isCtaUrl(value), {
    message:
      "Must be a full link starting with https:// (or http://), or left blank to use the configured default.",
  })
  .default("");

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
 * **Two strings and two links, and there is still no heading** — the band's accessible
 * name is an `aria-label` in the component, and a heading field nothing draws would be a
 * field asked for and never consumed. If a heading comes back it is a schema addition and
 * a component change together, which is the right amount of friction.
 *
 * The two caps are render limits rather than editorial taste. `body` is the band's display
 * line, set large and centred at the lead measure: past roughly 140 characters it runs to
 * four lines and the button falls out of the first screenful on a phone. `ctaLabel` sits
 * in a pill that must not wrap — 28 characters is what fits at 390 with the pill's own
 * padding, measured rather than guessed. The links have no render limit at all, so their
 * cap is a different kind of bound; see `CTA_URL_MAX_LENGTH`.
 */
export const closeCopySchema = z.object({
  body: nonEmpty.max(140),
  ctaLabel: nonEmpty.max(28),
  /**
   * Where the button goes, ONE FIELD PER RESULT SCREEN.
   *
   * **Two fields rather than one, because the point of them is the query string.** The
   * band is the tool's only outbound link and it renders on both result screens, so a
   * single URL makes the two presses indistinguishable in ANSR's analytics — a visitor
   * who converts off the peer landscape and one who converts off the function metrics
   * arrive as the same event. Separate fields let each carry its own UTM tagging, which
   * is the whole reason this is data and not one environment variable.
   *
   * **Blank is legal and means "use the configured default", which is why these are the
   * only strings in `siteContent` that may be empty.** The link out existed before this
   * field did, as `NEXT_PUBLIC_GCC_CTA_URL` with ansr.com behind it, and that path is
   * still live — see `resolveCtaHref` in `derive.ts`. So an untagged deployment keeps
   * working, an admin who wants tagging fills these, and nobody has to fill a field to
   * preserve today's behaviour. It also means `lengthError`'s "required" reading does not
   * apply here and the admin form uses its own validator.
   *
   * **`.default("")` rather than `.optional()`, which is the opposite of the call on
   * `company.domain` and for a reason that does not carry across.** A defaulted string is
   * written back on every publish; on 1,834 companies that was 1,834 unreadable lines of
   * diff, and here it is two keys on one object. What the default buys is a fixed slot,
   * so the diff reports these as field edits with both sides — the shape a reviewer needs
   * for a link — rather than as a key appearing and disappearing.
   *
   * Validated but never transformed, so the pasted string, the diffed string and the
   * `href` are one value. See `isCtaUrl`.
   */
  ctaHrefPeers: ctaUrl,
  ctaHrefFunctions: ctaUrl,
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
  /**
   * The four form field LABELS, and the four controls' placeholders and hints.
   *
   * **These are the most spec-coupled strings in the repo and that is the thing to know
   * before rewording one.** The labels are how every browser spec reaches a control
   * (`choose(page, "Headquarters", …)`, `getByLabel("Industry")`), so a spec must read
   * these keys rather than typing the words — see the locator note in `project.md`.
   *
   * **`askIndustryPlaceholder` is also the industry popup's ACCESSIBLE NAME**, because
   * `select-field.tsx` passes `placeholder` straight to the tree's `aria-label`. That is
   * what makes `getByLabel("Industry")` ambiguous once the popup is open, which is a
   * documented trap — so this one key decides both the muted text in the closed trigger
   * and the name assistive technology reads for the open list.
   *
   * Caps: a label sits on one line above its control; a placeholder is truncated inside
   * the trigger but is read whole as the popup's name; a hint is 12px on one line inside
   * the panel, and 80 is what fits without wrapping at the panel's narrowest.
   */
  askCompanyLabel: nonEmpty.max(32),
  askIndustryLabel: nonEmpty.max(32),
  askRevenueLabel: nonEmpty.max(32),
  askHqLabel: nonEmpty.max(32),
  askIndustryPlaceholder: nonEmpty.max(48),
  askIndustryHint: nonEmpty.max(80),
  askRevenuePlaceholder: nonEmpty.max(48),
  askRevenueHint: nonEmpty.max(80),
  askHqPlaceholder: nonEmpty.max(48),
  /** The filter above 12 options, in a 40px row. Never the popup's name. */
  askFilterPlaceholder: nonEmpty.max(40),
  /**
   * The two strings a visitor only ever sees when something is WRONG, and they are
   * editable on the argument that ANSR's voice matters most at that moment.
   *
   * `askSubmitError` was typed twice in `tool.tsx`, once in `submit` and once in
   * `refine`; one key is now the single definition. **What stays in code is
   * `ASK.submitPending`**, whose length is load-bearing against the submit label's own
   * width — two editable strings whose RELATIVE widths decide whether the button
   * resizes mid-press is a coupling no cap can express.
   */
  askSubmitError: nonEmpty.max(120),
  askFieldRequired: nonEmpty.max(48),
  /**
   * The dropdown filter's empty state. A TEMPLATE, because it echoes the visitor's own
   * typed text back — `{query}` is the one placeholder whose value comes from neither
   * the dataset nor the admin.
   */
  filterEmpty: copyTemplate("filterEmpty"),
  /* The logo strip's accessible name, and the impact band's heading. */
  customersLabel: nonEmpty.max(80),
  /**
   * The impact band's heading, MINUS the brand name — the lockup is drawn, and it
   * now LEADS the line rather than closing it.
   *
   * The heading reads "[ANSR] By The Numbers", so this field holds only "By The
   * Numbers". It used to hold "Impact delivered by" with the mark as the sentence's
   * last word; ANSR asked for the shorter title, in which the brand comes first, so
   * the component draws the mark then this string. The accessible name is still one
   * phrase, assembled the same way round.
   *
   * The 40-character cap is unchanged and is still the same measurement: the heading
   * is words plus a 2.78:1 lockup on ONE line at 320px, and what a longer phrase
   * costs is the mark dropping to a line of its own with its rays reaching into the
   * first.
   */
  impactTitleLead: nonEmpty.max(40),
  /* The result band, shared by both screens. Capped to hold one line. */
  headerPeers: nonEmpty.max(40),
  headerFunctions: nonEmpty.max(40),
  /* The view switch. Two equal halves, so neither may wrap. */
  viewPeers: nonEmpty.max(24),
  viewFunctions: nonEmpty.max(24),
  /**
   * The four answer pills on both result screens' context band, and the accessible
   * name of the function view's tab panel.
   *
   * **One set of keys for two screens, which is the point.** The labels were two
   * separate literal arrays, `peer-view.tsx` and `function-view.tsx`, so rewording a
   * pill meant editing two files by hand and the two screens' rows could disagree —
   * `project.md` requires they read identically. `pillRevenueBand` carries the currency
   * because the pill has no hint to put it in; the FORM's own label for the same input is
   * `askRevenueLabel` and the two are deliberately different strings.
   */
  pillCompany: nonEmpty.max(24),
  pillIndustry: nonEmpty.max(24),
  pillHeadquarters: nonEmpty.max(24),
  pillRevenueBand: nonEmpty.max(24),
  /** Never drawn. The `<section>` would not be a `region` without it. */
  functionPanelLabel: nonEmpty.max(60),
  /**
   * The result band's own controls and landmark names.
   *
   * **`editAnswers` names a DISCLOSURE, not a navigation** — it opens the answer editor
   * in place. Avoid "profile", which implies a stored account this tool does not have.
   * `homeTitle` is the lockup-as-button's `title`: the destination goes there rather than
   * in an `aria-label`, which name-from-content would read into the `h1` itself.
   * `pillGroupLabel` and `viewSwitchLabel` are landmark names, never drawn.
   */
  editAnswers: nonEmpty.max(24),
  pillGroupLabel: nonEmpty.max(60),
  viewSwitchLabel: nonEmpty.max(40),
  homeTitle: nonEmpty.max(40),
  /**
   * The answer editor — one component with one job, and its whole vocabulary.
   *
   * `editorSubmit` is what `InputPanel`'s `submitLabel` carries, and it is the ONE string
   * that differs between the entry point's form and this panel; that prop exists so the
   * two can differ without a second copy of the form.
   */
  editorTitle: nonEmpty.max(32),
  editorLead: nonEmpty.max(120),
  editorClose: nonEmpty.max(16),
  editorSubmit: nonEmpty.max(32),
  /**
   * The capability grid's leading `columnheader`, which is `sr-only`.
   *
   * **Read aloud and never seen, which is why it is here rather than left in code**: the
   * other column names are the metric's own admin-editable strings, so this was the one
   * name in that table an admin could not reach. It is on the grid `metric-card.tsx`
   * routes a rated matrix to, which today is the technology capability comparison.
   */
  gridRowHeader: nonEmpty.max(24),
  /**
   * Peer landscape section headings.
   *
   * **`peersTitle` IS BACK, as a template, and that reverses a documented retreat.** It
   * left this object when ANSR's wording started naming the visitor's own company:
   * the name is optional, so the heading has two branches and a flat field could hold
   * only one of them. A template holds both — `peersTitle` carries `{company}` and
   * `peersTitleFallback` is the word substituted when no name was given — so the
   * mechanism that forced it into code is the mechanism that brings it back.
   *
   * **The snapshot's opening label is still NOT here**, and its reasoning is unchanged
   * rather than superseded: it is composed over the visitor's SCOPE, so its two branches
   * differ by which noun the sentence uses ("your industry" / "your sub-industry"), not
   * by a value dropped into one slot. A template cannot express that and inventing a
   * second slot to fake it would put the choice of noun in an admin's hands.
   */
  industryTitle: nonEmpty.max(40),
  snapshotHeading: copyTemplate("snapshotHeading"),
  peersTitle: copyTemplate("peersTitle"),
  peersTitleFallback: nonEmpty.max(32),
  largestTitle: copyTemplate("largestTitle"),
  mapTitle: copyTemplate("mapTitle"),
  /**
   * The city map's disclosure. Two pairs: the scope word in the panel header, and the
   * button that switches it. Both members of each pair are drawn in the same place, so
   * they are capped together.
   */
  cityScopeAll: nonEmpty.max(24),
  cityScopeTop: nonEmpty.max(24),
  /**
   * The count column's name, opposite the scope word.
   *
   * **It is here because the ranked list carries no other statement of what the trailing
   * figure IS**, and this page carries companies, centres and people. Capped with the
   * scope word it shares a line with.
   */
  cityCountHeader: nonEmpty.max(24),
  cityToggleToTop: nonEmpty.max(40),
  cityToggleToAll: nonEmpty.max(40),
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
   *
   * **The cap is 56, up from 32, because the labels are SENTENCE PREDICATES now.**
   * ANSR reworded all four from noun phrases naming the metric ("Typical GCC
   * headcount") to clauses completing the figure above them ("average employees in
   * each GCC"), which is the shape the terminating scale strip has always used — and
   * those three caps are 120 and 140 for the same reason. 56 is what fits three lines
   * of a `lg:grid-cols-4` cell at 14px, which is where a fourth line starts pushing
   * one cell's label visibly deeper than its neighbours'.
   */
  snapshotHeadcountLabel: nonEmpty.max(56),
  snapshotCitiesLabel: nonEmpty.max(56),
  snapshotLeadingCityLabel: nonEmpty.max(56),
  /**
   * What a snapshot cell draws instead of a figure it does not have.
   *
   * **Never a dash, a zero or an estimate** — that is the rule this string exists to
   * satisfy, and the cap is the fixed-height figure box it sits in, which would clip a
   * second line rather than grow.
   */
  figureUnavailable: nonEmpty.max(24),
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
  /**
   * The close band's accessible name.
   *
   * **The band has no `h2`, so without this it is a `<section>` with no name and
   * therefore not a `region`.** It is editable alongside the two strings the band draws,
   * which are `siteContent.close` fields — this one is here because it is a landmark
   * name rather than an offer, the same category as `functionPanelLabel`.
   */
  closeLabel: nonEmpty.max(60),
  /**
   * How to read an index card, wrapping the metric's OWN `indexBaseline`.
   *
   * A template on `{baseline}`, and the lowest-stakes one here: the value in the slot is
   * already admin-editable data, so this key only owns the words around it.
   */
  indexedNote: copyTemplate("indexedNote"),
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
   * The customer strip. Defaulted, and capped at twenty-four.
   *
   * **The cap is a curation limit rather than a layout one and it moved because the
   * SERVED set moved.** The strip scrolls, so a longer list costs no height and
   * breaks nothing; what a long list costs is the band's meaning, which is a chosen
   * set of proof rather than every mark anybody could find. Twelve was the ceiling
   * while ten files existed. Twenty-two are served now, so twelve would put the
   * shipped default itself over the cap — the schema would refuse the dataset it
   * defaults to, which is a check that has stopped describing anything.
   *
   * Twenty-four is the served count plus the room to commit two more adaptations
   * without a schema edit, and `MAX_LOGOS` in `site-content-manager.tsx` mirrors it
   * so the Add button disables with a reason instead of the publish failing on a
   * list somebody spent ten minutes filling.
   */
  logos: z.array(customerLogoSchema).max(24).default(() => [...DEFAULT_LOGOS]),
  /**
   * **Every key is MERGED over the shipped block, so adding a string is a compatible
   * change rather than a broken read.** This is the same compatibility rule `metrics`
   * and `close` are defaulted for, but it has to work one level deeper: defaulting the
   * whole object only helps a dataset with no `copy` at all, and every dataset written
   * before a new KEY has a `copy` that is present and now short by one. Without the
   * merge, adding a string here refuses the committed dataset and production's alike.
   *
   * **A merge rather than a `.default()` on each field, because the shipped value must
   * live in exactly one place.** Per-field defaults would restate all fifty-seven
   * strings beside `DEFAULT_PUBLIC_COPY`, which is the drift `public-copy.test.ts`
   * exists to prevent. It also means no FUTURE key needs a default of its own.
   *
   * A stored value that is not an object is passed through untouched, so it fails on
   * the schema's own message rather than being silently replaced by the defaults.
   */
  copy: z
    .preprocess(
      (value) =>
        value && typeof value === "object" && !Array.isArray(value)
          ? { ...DEFAULT_PUBLIC_COPY, ...value }
          : value,
      publicCopySchema,
    )
    .default(() => DEFAULT_PUBLIC_COPY),
});

/**
 * Held separately from `DEFAULT_SITE_CONTENT` so the schema's own `.default()` can name it
 * without forward-referencing the larger object it is a member of.
 */
export const DEFAULT_CLOSE_COPY: CloseCopy = {
  /**
   * **The offer is now the visitor's OWN profile rather than the rest of the dataset,
   * at ANSR's request, and that changes what the band is asking.** It read "Access the
   * complete dataset, deeper benchmarks and detailed cost structures behind your
   * results" — an offer of more rows, which is a weak ask after a page that has just
   * shown a visitor five named peers and thirty national figures. "The hyper-custom GCC
   * profile built for your company" is an offer of work done ON their answers, which is
   * the thing the free layer genuinely cannot supply.
   *
   * It does not become a claim about the dataset and so does not move out of data: the
   * band still collects nothing and still states no count, a share or an ordering.
   */
  /**
   * **No em dash, at ANSR's request, and a colon rather than a comma.** The clause after
   * the break is a list of what the profile contains, so it is an expansion of the thing
   * named before it — which is what a colon says. A comma could not: the list already
   * holds two of its own ("deeper benchmarks, cost structures, and more"), so a third
   * comma at the join would read as a fourth item rather than as the break.
   */
  body:
    "Access the hyper-custom GCC profile built for your company: " +
    "deeper benchmarks, cost structures, and more.",
  ctaLabel: "See the full report",
  /**
   * **Both links ship BLANK, and blank is a real answer rather than an unfinished
   * field.** The shipped default has to reproduce today's behaviour exactly, and today's
   * behaviour is `NEXT_PUBLIC_GCC_CTA_URL` with ansr.com behind it — so seeding a URL here
   * would silently take the deployment's configured link out of the path on the next
   * publish. Empty means "whatever is configured", which is what a dataset that has never
   * been told about UTM tagging should say.
   *
   * It also keeps the default free of a guessed deep path, on the same argument as the
   * fallback in `page.tsx`: a plausible-looking URL that 404s is worse than a general one
   * that works.
   */
  ctaHrefPeers: "",
  ctaHrefFunctions: "",
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
 * The twenty-two marks, with the ink bounds each was measured at.
 *
 * **Every one of these is produced by `npm run logo:crop`, and a hand-typed pair is a
 * layout shift waiting to happen.** The dimensions are the RATIO an `<img>` reserves
 * before the file arrives, so a wrong one moves the band directly under the form. An
 * earlier Walmart export arrived with a `viewBox` nine tenths too small and rendered only
 * "Wal"; the script exists because that is invisible until somebody looks at the file.
 * `company-marks.test.ts` checks every vector's stated ratio against its own `viewBox`.
 *
 * **THE ORDER ALTERNATES ASPECT RATIO RATHER THAN GROUPING THE NEW MARKS AFTER THE
 * OLD, and that is the same measurement the dual cap in `customer-logos.tsx` exists
 * for.** These twenty-two span 0.78:1 (Target) to 5.18:1 (lululemon). Appended in the
 * order they were supplied, the second half is a run of six wide wordmarks — every
 * one of them pinned to the 128px width cap and therefore rendering SHORT — so a
 * third of the strip reads as small type while the first third reads as marks. Reading
 * a wide, a mid and a narrow in rotation keeps each screenful of the moving row at a
 * comparable optical weight, which is what stops one mark deciding the rhythm.
 *
 * Nothing about the order is a claim: the band states no ranking and no relationship
 * between adjacent marks, which is precisely why it is free to be arranged for
 * legibility. An admin reorder is still reported by the diff.
 */
export const DEFAULT_LOGOS: readonly CustomerLogo[] = [
  { name: "Walmart", src: "/logos/walmart.svg", width: 128, height: 30 },
  { name: "Best Buy", src: "/logos/bestbuy.png", width: 106, height: 64 },
  { name: "Target", src: "/logos/target.svg", width: 62, height: 79 },
  { name: "JCPenney", src: "/logos/jcpenney.svg", width: 128, height: 30 },
  { name: "Nike", src: "/logos/nike.svg", width: 98, height: 51 },
  { name: "Airbnb", src: "/logos/airbnb.svg", width: 86, height: 72 },
  { name: "lululemon", src: "/logos/lululemon.svg", width: 128, height: 25 },
  { name: "Lowe's", src: "/logos/lowes.svg", width: 125, height: 62 },
  { name: "X", src: "/logos/x.svg", width: 55, height: 50 },
  { name: "Kenvue", src: "/logos/kenvue.svg", width: 128, height: 30 },
  { name: "Wells Fargo", src: "/logos/wellsfargo.png", width: 127, height: 64 },
  { name: "PepsiCo", src: "/logos/pepsico.png", width: 81, height: 64 },
  { name: "DocuSign", src: "/logos/docusign.svg", width: 128, height: 26 },
  { name: "Goldman Sachs", src: "/logos/goldmansachs.png", width: 154, height: 64 },
  { name: "7-Eleven", src: "/logos/7eleven.svg", width: 128, height: 121 },
  { name: "Land O'Lakes", src: "/logos/landolakes.svg", width: 128, height: 28 },
  { name: "3M", src: "/logos/3m.svg", width: 128, height: 67 },
  { name: "Rakuten", src: "/logos/rakuten.svg", width: 128, height: 38 },
  { name: "FedEx", src: "/logos/fedex.svg", width: 128, height: 36 },
  { name: "Victoria's Secret", src: "/logos/victoriassecret.svg", width: 128, height: 42 },
  { name: "Hudson's Bay Company", src: "/logos/hudsonsbay.svg", width: 128, height: 85 },
  { name: "Uber", src: "/logos/uber.svg", width: 128, height: 45 },
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
  askTitle: "Find your peers",
  askLead:
    "Share your company details to identify relevant companies with GCCs in " +
    "India and explore talent, capability and location metrics.",
  askSubmit: "Build my GCC Landscape",
  askCompanyLabel: "Company name",
  askIndustryLabel: "Industry",
  /**
   * **"Annual revenue" on the FORM, "Revenue band (USD)" on the pill**, and the two are
   * separate keys because they do separate jobs. The form's own currency statement is
   * `askRevenueHint`, inside the panel; the pill has no hint, so it carries the unit in
   * its label. See `pillRevenueBand`.
   */
  askRevenueLabel: "Annual revenue",
  askHqLabel: "Headquarters",
  askIndustryPlaceholder: "Choose your industry",
  askIndustryHint: "Pick an industry to see its sub-industries (optional)",
  askRevenuePlaceholder: "Choose a band",
  askRevenueHint: "All figures in US dollars.",
  askHqPlaceholder: "Choose a country",
  askFilterPlaceholder: "Type to narrow the list",
  askSubmitError:
    "Something went wrong reaching our data. Please try again in a moment.",
  askFieldRequired: "Choose one to continue.",
  /* Curly quotes, matching the typography everywhere else on the surface. */
  filterEmpty: "Nothing matches \u201C{query}\u201D.",
  customersLabel: "Companies ANSR has worked with in India",
  impactTitleLead: "By The Numbers",
  headerPeers: "How your industry operates in India",
  headerFunctions: "The India market beyond your industry",
  viewPeers: "Peer Landscape",
  viewFunctions: "Function Metrics",
  pillCompany: "Company",
  pillIndustry: "Industry",
  pillHeadquarters: "Headquarters",
  pillRevenueBand: "Revenue band (USD)",
  functionPanelLabel: "India market metrics by function",
  editAnswers: "Edit answers",
  pillGroupLabel: "Your profile, as you entered it",
  viewSwitchLabel: "Result view",
  homeTitle: "Back to the start",
  editorTitle: "Your answers",
  editorLead: "Change anything below and your results update on this page.",
  editorClose: "Close",
  editorSubmit: "Update my results",
  gridRowHeader: "Capability",
  industryTitle: "Inside India's GCC base",
  /* "GCCs", never "GCC's", which ANSR asked never to appear. */
  snapshotHeading: "Snapshot of {industry} GCCs in India",
  peersTitle: "GCC details of peers closest to {company}",
  /**
   * **"your profile", never "yours".** "Closest to yours" presumes the visitor already
   * runs an India centre, and `gccStatus` is a constant the form never asks for.
   */
  peersTitleFallback: "your profile",
  largestTitle: "The largest {industry} GCCs in India",
  /* Not "Where …": the block's own heading would then open the way the lead used to. */
  mapTitle: "Cities where {industry} companies have set up",
  cityScopeAll: "All cities",
  cityScopeTop: "Top cities",
  cityCountHeader: "Companies",
  cityToggleToTop: "Show the leading cities only",
  cityToggleToAll: "Explore all cities",
  peerHeadcountLabel: "GCC headcount",
  peerCitiesLabel: "Cities",
  peerSinceLabel: "In India since",
  snapshotHeadcountLabel: "average employees in each GCC",
  /**
   * **"your industry", NOT "your sub-industry", and the difference is the figure this
   * label sits under.** ANSR's wording named the sub-industry; the count is
   * `view.map.cities.length`, which is the industry's own city spread — the map block
   * is filtered to `input.industry` and there is no per-sub-industry city derivation to
   * read. A label claiming the narrower population over the wider figure is the one
   * thing copy on this surface may not do. The same correction is made on the leading
   * city below and on `mapTitle`.
   */
  snapshotCitiesLabel: "cities in India host GCCs from your industry",
  /**
   * **"these GCCs", not "peer GCCs".** The leading city is `view.map.cities[0]` — the
   * industry's top city, not the five-company peer set's — and "peer" would name a
   * population this cell was not measured over. "These" refers to the section heading
   * directly above, which names the industry once for all four cells.
   */
  snapshotLeadingCityLabel: "the city where most of these GCCs are based",
  figureUnavailable: "Data unavailable",
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
  closeLabel: "Unlock the full GCC landscape",
  indexedNote: "Indexed: {baseline}",
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
    /**
     * **The product has a NAME now — Atlas — and the headline states what the tool does
     * with it.** "ANSR GCC Intelligence" named a category; this names the product and
     * the promise in one line.
     *
     * **The literal substrings "ANSR" and "ATLAS" are both load-bearing and must survive
     * any rewording.** `withBrandMark` and `withProductMark` in `ask-hero.tsx` find them
     * and swap each for its drawn wordmark, so a headline that spells either differently
     * silently renders that half as plain type and loses a mark from the band.
     *
     * **No punctuation after the name, at the project owner's request.** It read
     * "ANSR ATLAS: Benchmark against your peers" while the name was typed; with both
     * halves now drawn, the colon was a typed character sitting against the trailing
     * edge of an outlined mark. What it was doing — separating the name from the promise
     * — the lockup now does on its own.
     */
    title: "ANSR ATLAS Benchmark against your peers",
    /**
     * **No em dash, at ANSR's request, and a colon for the reason the close's body takes
     * one.** What follows the break names the three kinds of data the sentence before it
     * promises, so it expands the clause rather than continuing it — and "talent, cost and
     * location" already carries a comma, so a comma at the join would read as a fourth
     * item in that list instead of as the break between the two halves.
     */
    lead:
      "See how the top companies in your industry run their India GCCs today: " +
      "talent, cost and location data drawn from our research into 1,800+ centres.",
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
