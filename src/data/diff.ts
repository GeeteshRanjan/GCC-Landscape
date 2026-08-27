import type { Company, Dataset, Metric, Taxonomy } from "./schema";

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

export interface DatasetDiff {
  /** No previous dataset — a first import. */
  firstImport: boolean;
  added: Array<Pick<Company, "id" | "name">>;
  removed: Array<Pick<Company, "id" | "name">>;
  changed: ChangedCompany[];
  taxonomy: TaxonomyDiff[];
  metrics: MetricsDiff;
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
    metrics: number;
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

function metricsCount(diff: MetricsDiff): number {
  return diff.added.length + diff.removed.length + diff.changed.length;
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
      metrics: {
        added: next.metrics.map((m) => ({ id: m.id, title: m.title })),
        removed: [],
        changed: [],
      },
      generatedAtChanged: true,
      sourceChanged: true,
      isEmpty: false,
      counts: {
        added: next.companies.length,
        removed: 0,
        changed: 0,
        taxonomy: TAXONOMY_KEYS.length,
        metrics: next.metrics.length,
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

  const metrics = diffMetrics(next.metrics, previous.metrics);

  const counts = {
    added: added.length,
    removed: removed.length,
    changed: changed.length,
    taxonomy: taxonomy.length,
    metrics: metricsCount(metrics),
  };

  return {
    firstImport: false,
    added,
    removed,
    changed,
    taxonomy,
    metrics,
    generatedAtChanged: next.generatedAt !== previous.generatedAt,
    sourceChanged: next.source !== previous.source,
    isEmpty:
      counts.added +
        counts.removed +
        counts.changed +
        counts.taxonomy +
        counts.metrics ===
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
      `  + ${diff.counts.metrics} metrics`,
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

  if (diff.isEmpty) lines.push("  no company, taxonomy or metric changes");

  return lines.join("\n");
}
