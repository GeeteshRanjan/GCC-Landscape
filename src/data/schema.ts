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

export const taxonomySchema = z.object({
  industries: z.array(nonEmpty).min(1),
  /** Ascending. Adjacency in peer matching is a step in this array. */
  revenueBands: z.array(nonEmpty).min(1),
  cities: z.array(nonEmpty).min(1),
  hqCountries: z.array(nonEmpty).min(1),
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

export const siteContentSchema = z.object({
  hero: heroCopySchema,
  /**
   * Capped at six. The band is one centred row on desktop, and a seventh figure
   * either wraps to a second row of one or shrinks all of them below the size
   * that makes a figure read as a figure. Five is what ANSR supplied.
   */
  impactStats: z.array(impactStatSchema).max(6),
});

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
};

export type HeroCopy = z.infer<typeof heroCopySchema>;
export type ImpactStat = z.infer<typeof impactStatSchema>;
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
      [keyof typeof dataset.taxonomy, "industry" | "revenueBand" | "hqCountry"]
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
