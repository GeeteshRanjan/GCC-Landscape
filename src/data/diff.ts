import type {
  BusinessType,
  Company,
  Dataset,
  HeroCopy,
  ImpactStat,
  Metric,
  SiteContent,
  Taxonomy,
} from "./schema";

/**
 * Dataset diff — one computation, two renderers.
 *
 * A publish is a commit, and a commit nobody looked at is how a bad batch
 * ships. So nothing is written before a diff is shown. This module used to live
 * inside scripts/import-seed.ts as a console-only `printDiff`; admin needs the
 * same answer as markup rather than as stdout, so the computation moved here and
 * the two callers only differ in how they render it.
 *
 * `renderDiffText` is the console renderer, still used by the importer. The
 * admin publish view renders `DatasetDiff` directly.
 */

export type TaxonomyKey = keyof Taxonomy;

export const TAXONOMY_KEYS: readonly TaxonomyKey[] = [
  "industries",
  "revenueBands",
  "cities",
  "hqCountries",
] as const;

export interface FieldChange {
  field: keyof Company;
  before: unknown;
  after: unknown;
}

export interface ChangedCompany {
  id: string;
  name: string;
  changes: FieldChange[];
}

export interface TaxonomyDiff {
  key: TaxonomyKey;
  added: string[];
  removed: string[];
  /**
   * True when the values are the same set but in a different order. Only
   * meaningful for `revenueBands`, where order is the contract for
   * adjacent-band peer matching — a reorder there is a real change even though
   * added and removed are both empty.
   */
  reordered: boolean;
}

/** One edited metric. `field` is a top-level metric key. */
export interface MetricFieldChange {
  field: keyof Metric;
  before: unknown;
  after: unknown;
}

export interface ChangedMetric {
  id: string;
  title: string;
  changes: MetricFieldChange[];
}

/**
 * The Screen 2 catalogue's changes, kept separate from the company ones.
 *
 * Separate because they are separate decisions being approved: an admin
 * publishing a month of company rows and an admin publishing a batch of metric
 * values are reviewing different things, and folding both into one "changed"
 * count would hide whichever was smaller.
 */
export interface MetricsDiff {
  added: Array<Pick<Metric, "id" | "title">>;
  removed: Array<Pick<Metric, "id" | "title">>;
  changed: ChangedMetric[];
}

/**
 * Business-type catalogue changes, separate again from companies and metrics.
 *
 * Separate for a sharper reason than the metrics case: a change here re-scores
 * every peer set in the industry the type belongs to. Adding a tag to
 * "Apparel & footwear brand" silently changes who Nike sees, with no company row
 * touched — so a diff that reported only company changes would show "no changes"
 * for an edit that reshapes the product.
 */
export interface BusinessTypeFieldChange {
  field: keyof BusinessType;
  before: unknown;
  after: unknown;
}

export interface BusinessTypesDiff {
  added: Array<Pick<BusinessType, "id" | "name">>;
  removed: Array<Pick<BusinessType, "id" | "name">>;
  changed: Array<{ id: string; name: string; changes: BusinessTypeFieldChange[] }>;
}

/**
 * Site-content changes — the hero's copy and the impact figures.
 *
 * A fourth category rather than a field list folded into one of the others, and
 * for the sharpest reason of the four: this is the only part of the dataset whose
 * changes are visible on the entry point of the public site the moment they
 * publish. A month of company edits changes what a few visitors are shown; a
 * one-character edit here changes the headline every visitor reads. It gets its
 * own count so it can never be the smaller number hidden inside a larger one.
 *
 * `hero` is a field list because there are two fields and both are prose worth
 * reading in full before approving. `impactStats` is keyed by id like the other
 * collections, since rows are added, removed and reordered.
 */
export interface SiteContentDiff {
  hero: Array<{ field: keyof HeroCopy; before: string; after: string }>;
  impactStats: {
    added: Array<Pick<ImpactStat, "id" | "value" | "label">>;
    removed: Array<Pick<ImpactStat, "id" | "value" | "label">>;
    changed: Array<{
      id: string;
      label: string;
      changes: Array<{ field: keyof ImpactStat; before: string; after: string }>;
    }>;
    /** Order is what the visitor reads left to right, so a reorder is a change. */
    reordered: boolean;
  };
}

export interface DatasetDiff {
  /** No previous dataset — a first import. */
  firstImport: boolean;
  added: Array<Pick<Company, "id" | "name">>;
  removed: Array<Pick<Company, "id" | "name">>;
  changed: ChangedCompany[];
  taxonomy: TaxonomyDiff[];
  businessTypes: BusinessTypesDiff;
  metrics: MetricsDiff;
  siteContent: SiteContentDiff;
  /** Metadata that moves on every publish; called out so it is not mistaken for an edit. */
  generatedAtChanged: boolean;
  sourceChanged: boolean;
  /** Company, taxonomy and metric changes. `generatedAt` moving is not a change. */
  isEmpty: boolean;
  counts: {
    added: number;
    removed: number;
    changed: number;
    taxonomy: number;
    businessTypes: number;
    metrics: number;
    siteContent: number;
  };
}

const COMPANY_FIELDS: ReadonlyArray<keyof Company> = [
  "name",
  "hqCountry",
  "industry",
  "revenueBand",
  "establishedYear",
  "cities",
  "fte",
  "fortuneGlobal500",
  "forbesGlobal2000",
];

/**
 * Every metric field an admin can change. `id` is absent for the same reason it
 * is absent from COMPANY_FIELDS: it identifies the row, so a change to it is an
 * add plus a remove, not an edit.
 */
const METRIC_FIELDS: ReadonlyArray<keyof Metric> = [
  "functionArea",
  "lens",
  "title",
  "question",
  "unit",
  "format",
  "ratingScale",
  "indexBaseline",
  "asOf",
  "atLeast",
  "note",
  "structure",
  "value",
  "gated",
];

function sameValue(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function diffMetrics(
  next: readonly Metric[],
  previous: readonly Metric[],
): MetricsDiff {
  const before = new Map(previous.map((m) => [m.id, m]));
  const after = new Map(next.map((m) => [m.id, m]));

  const added: MetricsDiff["added"] = [];
  const changed: ChangedMetric[] = [];
  for (const [id, metric] of after) {
    const old = before.get(id);
    if (!old) {
      added.push({ id, title: metric.title });
      continue;
    }
    const changes = METRIC_FIELDS.filter(
      (field) => !sameValue(metric[field], old[field]),
    ).map((field) => ({ field, before: old[field], after: metric[field] }));
    if (changes.length > 0) changed.push({ id, title: metric.title, changes });
  }

  const removed: MetricsDiff["removed"] = [];
  for (const [id, metric] of before) {
    if (!after.has(id)) removed.push({ id, title: metric.title });
  }

  return { added, removed, changed };
}

/**
 * Field-level diff of the business-type catalogue.
 *
 * `tags` is compared as a SET rather than as an array, because tag order carries
 * no meaning — nothing reads it, and `similarity.ts` derives every weight from
 * the data. Reporting a reorder as a change would train an admin to ignore this
 * section, which is the opposite of what it is for. Compare that with
 * `taxonomy.revenueBands`, where order IS the contract and a reorder is reported.
 */
function diffBusinessTypes(
  next: readonly BusinessType[],
  previous: readonly BusinessType[],
): BusinessTypesDiff {
  const before = new Map(previous.map((type) => [type.id, type]));
  const after = new Map(next.map((type) => [type.id, type]));

  const added: BusinessTypesDiff["added"] = [];
  const changed: BusinessTypesDiff["changed"] = [];

  for (const [id, type] of after) {
    const old = before.get(id);
    if (!old) {
      added.push({ id, name: type.name });
      continue;
    }
    const changes: BusinessTypeFieldChange[] = [];
    if (old.name !== type.name) {
      changes.push({ field: "name", before: old.name, after: type.name });
    }
    if (old.industry !== type.industry) {
      changes.push({ field: "industry", before: old.industry, after: type.industry });
    }
    const oldTags = [...old.tags].sort();
    const newTags = [...type.tags].sort();
    if (oldTags.join("|") !== newTags.join("|")) {
      changes.push({
        field: "tags",
        before: oldTags.join(", "),
        after: newTags.join(", "),
      });
    }
    if (changes.length > 0) changed.push({ id, name: type.name, changes });
  }

  const removed: BusinessTypesDiff["removed"] = [];
  for (const [id, type] of before) {
    if (!after.has(id)) removed.push({ id, name: type.name });
  }

  return { added, removed, changed };
}

function businessTypesCount(diff: BusinessTypesDiff): number {
  return diff.added.length + diff.removed.length + diff.changed.length;
}

function metricsCount(diff: MetricsDiff): number {
  return diff.added.length + diff.removed.length + diff.changed.length;
}

const HERO_FIELDS: ReadonlyArray<keyof HeroCopy> = ["title", "lead"];
const IMPACT_FIELDS: ReadonlyArray<keyof ImpactStat> = ["value", "label"];

function diffSiteContent(
  next: SiteContent,
  previous: SiteContent,
): SiteContentDiff {
  const hero = HERO_FIELDS.filter(
    (field) => next.hero[field] !== previous.hero[field],
  ).map((field) => ({
    field,
    before: previous.hero[field],
    after: next.hero[field],
  }));

  const before = new Map(previous.impactStats.map((stat) => [stat.id, stat]));
  const after = new Map(next.impactStats.map((stat) => [stat.id, stat]));

  const added: SiteContentDiff["impactStats"]["added"] = [];
  const changed: SiteContentDiff["impactStats"]["changed"] = [];
  for (const [id, stat] of after) {
    const old = before.get(id);
    if (!old) {
      added.push({ id, value: stat.value, label: stat.label });
      continue;
    }
    const changes = IMPACT_FIELDS.filter(
      (field) => stat[field] !== old[field],
    ).map((field) => ({ field, before: old[field], after: stat[field] }));
    if (changes.length > 0) changed.push({ id, label: stat.label, changes });
  }

  const removed: SiteContentDiff["impactStats"]["removed"] = [];
  for (const [id, stat] of before) {
    if (!after.has(id)) removed.push({ id, value: stat.value, label: stat.label });
  }

  // Reported only when membership is otherwise unchanged, the same way a
  // taxonomy reorder is: an added or removed row moves the ids after it, so a
  // naive comparison would call every addition a reorder as well.
  const reordered =
    added.length === 0 &&
    removed.length === 0 &&
    !sameValue(
      previous.impactStats.map((stat) => stat.id),
      next.impactStats.map((stat) => stat.id),
    );

  return { hero, impactStats: { added, removed, changed, reordered } };
}

function siteContentCount(diff: SiteContentDiff): number {
  return (
    diff.hero.length +
    diff.impactStats.added.length +
    diff.impactStats.removed.length +
    diff.impactStats.changed.length +
    (diff.impactStats.reordered ? 1 : 0)
  );
}

export function diffDatasets(
  next: Dataset,
  previous: Dataset | null,
): DatasetDiff {
  if (!previous) {
    return {
      firstImport: true,
      added: next.companies.map((c) => ({ id: c.id, name: c.name })),
      removed: [],
      changed: [],
      taxonomy: TAXONOMY_KEYS.map((key) => ({
        key,
        added: [...next.taxonomy[key]],
        removed: [],
        reordered: false,
      })),
      businessTypes: {
        added: next.businessTypes.map((b) => ({ id: b.id, name: b.name })),
        removed: [],
        changed: [],
      },
      metrics: {
        added: next.metrics.map((m) => ({ id: m.id, title: m.title })),
        removed: [],
        changed: [],
      },
      siteContent: {
        // A first import has nothing to compare the hero against, and reporting
        // both fields as "changed" would be a diff against nothing. The impact
        // rows are listed because they genuinely are new rows.
        hero: [],
        impactStats: {
          added: next.siteContent.impactStats.map((s) => ({
            id: s.id,
            value: s.value,
            label: s.label,
          })),
          removed: [],
          changed: [],
          reordered: false,
        },
      },
      generatedAtChanged: true,
      sourceChanged: true,
      isEmpty: false,
      counts: {
        added: next.companies.length,
        removed: 0,
        changed: 0,
        taxonomy: TAXONOMY_KEYS.length,
        businessTypes: next.businessTypes.length,
        metrics: next.metrics.length,
        siteContent: next.siteContent.impactStats.length,
      },
    };
  }

  const before = new Map(previous.companies.map((c) => [c.id, c]));
  const after = new Map(next.companies.map((c) => [c.id, c]));

  const added: DatasetDiff["added"] = [];
  const changed: ChangedCompany[] = [];
  for (const [id, company] of after) {
    const old = before.get(id);
    if (!old) {
      added.push({ id, name: company.name });
      continue;
    }
    const changes = COMPANY_FIELDS.filter(
      (field) => !sameValue(company[field], old[field]),
    ).map((field) => ({ field, before: old[field], after: company[field] }));
    if (changes.length > 0) changed.push({ id, name: company.name, changes });
  }

  const removed: DatasetDiff["removed"] = [];
  for (const [id, company] of before) {
    if (!after.has(id)) removed.push({ id, name: company.name });
  }

  const taxonomy: TaxonomyDiff[] = [];
  for (const key of TAXONOMY_KEYS) {
    const oldValues = previous.taxonomy[key];
    const newValues = next.taxonomy[key];
    const oldSet = new Set(oldValues);
    const newSet = new Set(newValues);
    const addedValues = newValues.filter((v) => !oldSet.has(v));
    const removedValues = oldValues.filter((v) => !newSet.has(v));
    const reordered =
      addedValues.length === 0 &&
      removedValues.length === 0 &&
      !sameValue(oldValues, newValues);
    if (addedValues.length || removedValues.length || reordered) {
      taxonomy.push({
        key,
        added: addedValues,
        removed: removedValues,
        reordered,
      });
    }
  }

  const businessTypes = diffBusinessTypes(next.businessTypes, previous.businessTypes);
  const metrics = diffMetrics(next.metrics, previous.metrics);
  const siteContent = diffSiteContent(next.siteContent, previous.siteContent);

  const counts = {
    added: added.length,
    removed: removed.length,
    changed: changed.length,
    taxonomy: taxonomy.length,
    businessTypes: businessTypesCount(businessTypes),
    metrics: metricsCount(metrics),
    siteContent: siteContentCount(siteContent),
  };

  return {
    firstImport: false,
    added,
    removed,
    changed,
    taxonomy,
    businessTypes,
    metrics,
    siteContent,
    generatedAtChanged: next.generatedAt !== previous.generatedAt,
    sourceChanged: next.source !== previous.source,
    isEmpty:
      counts.added +
        counts.removed +
        counts.changed +
        counts.taxonomy +
        counts.businessTypes +
        counts.metrics +
        counts.siteContent ===
      0,
    counts,
  };
}

/** Human label for a taxonomy list. Used by both renderers. */
export const TAXONOMY_LABELS: Record<TaxonomyKey, string> = {
  industries: "Industries",
  revenueBands: "Revenue bands",
  cities: "Cities",
  hqCountries: "HQ countries",
};

/** One-line summary of a field value, for a table cell or a console line. */
export function formatFieldValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") {
    const fte = value as { min?: number; max?: number };
    if (typeof fte.min === "number" && typeof fte.max === "number") {
      return `${fte.min}–${fte.max}`;
    }
    return JSON.stringify(value);
  }
  return String(value);
}

/** Human label for a metric field, for both renderers. */
export const METRIC_FIELD_LABELS: Record<keyof Metric, string> = {
  id: "Id",
  functionArea: "Function",
  lens: "Lens (internal)",
  title: "Title",
  question: "Question",
  unit: "Unit",
  format: "Format",
  ratingScale: "Rating steps",
  indexBaseline: "Index base",
  asOf: "As of",
  atLeast: "Shown as a floor",
  note: "Internal note",
  structure: "Shape",
  value: "Values",
  gated: "Behind the gate",
};

/**
 * A metric field, described rather than dumped.
 *
 * `structure` and `value` are nested objects, and `JSON.stringify` of a five by
 * five grid is not something a reviewer reads — so the two that matter get a
 * summary, and everything else falls through to the shared formatter.
 */
export function formatMetricFieldValue(
  field: keyof Metric,
  value: unknown,
): string {
  if (value === undefined) return "—";

  if (field === "structure") {
    const structure = value as Metric["structure"];
    switch (structure.kind) {
      case "scalar":
        return "one number";
      case "range":
        return "a range";
      case "breakdown":
        return `${structure.entries.length} parts: ${structure.entries.join(", ")}`;
      case "matrix":
        return `${structure.rows.length} × ${structure.columns.length} grid: ${structure.rows.join(", ")} by ${structure.columns.join(", ")}`;
    }
  }

  if (field === "value") {
    if (value === null) return "not entered";
    const entered = value as Metric["value"];
    if (entered === null) return "not entered";
    switch (entered.kind) {
      case "scalar":
        return String(entered.value);
      case "range":
        return `${entered.min}–${entered.max}`;
      case "breakdown":
        return entered.values.map((n) => (n === null ? "—" : String(n))).join(", ");
      case "matrix":
        return entered.cells
          .map((row) => row.map((cell) => (cell === null ? "—" : String(cell))).join(" | "))
          .join(" / ");
    }
  }

  return formatFieldValue(value);
}

/** The console renderer. Kept here so the importer and admin cannot drift. */
export function renderDiffText(diff: DatasetDiff): string {
  if (diff.firstImport) {
    return [
      "Diff: no existing dataset — this is the first import.",
      `  + ${diff.counts.added} companies`,
      `  + ${diff.counts.businessTypes} business types`,
      `  + ${diff.counts.metrics} metrics`,
      `  + ${diff.counts.siteContent} impact figures, and the hero copy`,
    ].join("\n");
  }

  const lines: string[] = ["Diff against the current dataset"];
  lines.push(
    `  + ${diff.counts.added} added   - ${diff.counts.removed} removed   ~ ${diff.counts.changed} changed`,
  );

  const sample = (label: string, values: string[]) => {
    if (values.length === 0) return;
    const shown = values.slice(0, 8).join(", ");
    const extra = values.length > 8 ? ` …+${values.length - 8}` : "";
    lines.push(`  ${label}: ${shown}${extra}`);
  };

  sample(
    "added",
    diff.added.map((c) => c.id),
  );
  sample(
    "removed",
    diff.removed.map((c) => c.id),
  );
  sample(
    "changed",
    diff.changed.map(
      (c) => `${c.id} (${c.changes.map((f) => f.field).join(", ")})`,
    ),
  );

  for (const entry of diff.taxonomy) {
    const parts: string[] = [];
    if (entry.added.length) parts.push(`+[${entry.added.join(", ")}]`);
    if (entry.removed.length) parts.push(`-[${entry.removed.join(", ")}]`);
    if (entry.reordered) parts.push("reordered");
    lines.push(`  taxonomy.${entry.key}: ${parts.join(" ")}`);
  }

  sample(
    "business types added",
    diff.businessTypes.added.map((b) => b.id),
  );
  sample(
    "business types removed",
    diff.businessTypes.removed.map((b) => b.id),
  );
  sample(
    "business types changed",
    diff.businessTypes.changed.map(
      (b) => `${b.id} (${b.changes.map((c) => c.field).join(", ")})`,
    ),
  );
  sample(
    "metrics added",
    diff.metrics.added.map((m) => m.id),
  );
  sample(
    "metrics removed",
    diff.metrics.removed.map((m) => m.id),
  );
  sample(
    "metrics changed",
    diff.metrics.changed.map(
      (m) => `${m.id} (${m.changes.map((c) => c.field).join(", ")})`,
    ),
  );

  /* Site content last, and spelled out rather than sampled. Two reasons: there
     are at most eight lines of it, and it is the only part of the diff whose
     before-and-after a reviewer has to actually READ rather than count — an id
     list would tell them the headline changed without telling them to what. */
  for (const change of diff.siteContent.hero) {
    lines.push(`  hero ${change.field}:`);
    lines.push(`    - ${change.before}`);
    lines.push(`    + ${change.after}`);
  }
  for (const stat of diff.siteContent.impactStats.added) {
    lines.push(`  impact figure added: ${stat.value} ${stat.label}`);
  }
  for (const stat of diff.siteContent.impactStats.removed) {
    lines.push(`  impact figure removed: ${stat.value} ${stat.label}`);
  }
  for (const stat of diff.siteContent.impactStats.changed) {
    for (const change of stat.changes) {
      lines.push(
        `  impact ${stat.id} ${change.field}: ${change.before} -> ${change.after}`,
      );
    }
  }
  if (diff.siteContent.impactStats.reordered) {
    lines.push("  impact figures reordered");
  }

  if (diff.isEmpty) {
    lines.push(
      "  no company, taxonomy, business type, metric or site content changes",
    );
  }

  return lines.join("\n");
}
