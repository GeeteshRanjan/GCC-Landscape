import type { Company, Dataset, Taxonomy } from "./schema";

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

export interface DatasetDiff {
  /** No previous dataset — a first import. */
  firstImport: boolean;
  added: Array<Pick<Company, "id" | "name">>;
  removed: Array<Pick<Company, "id" | "name">>;
  changed: ChangedCompany[];
  taxonomy: TaxonomyDiff[];
  /** Metadata that moves on every publish; called out so it is not mistaken for an edit. */
  generatedAtChanged: boolean;
  sourceChanged: boolean;
  /** Company + taxonomy changes only. `generatedAt` moving is not a change. */
  isEmpty: boolean;
  counts: { added: number; removed: number; changed: number; taxonomy: number };
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

function sameValue(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
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
      generatedAtChanged: true,
      sourceChanged: true,
      isEmpty: false,
      counts: {
        added: next.companies.length,
        removed: 0,
        changed: 0,
        taxonomy: TAXONOMY_KEYS.length,
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

  const counts = {
    added: added.length,
    removed: removed.length,
    changed: changed.length,
    taxonomy: taxonomy.length,
  };

  return {
    firstImport: false,
    added,
    removed,
    changed,
    taxonomy,
    generatedAtChanged: next.generatedAt !== previous.generatedAt,
    sourceChanged: next.source !== previous.source,
    isEmpty:
      counts.added + counts.removed + counts.changed + counts.taxonomy === 0,
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

/** The console renderer. Kept here so the importer and admin cannot drift. */
export function renderDiffText(diff: DatasetDiff): string {
  if (diff.firstImport) {
    return [
      "Diff: no existing dataset — this is the first import.",
      `  + ${diff.counts.added} companies`,
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

  if (diff.isEmpty) lines.push("  no company or taxonomy changes");

  return lines.join("\n");
}
