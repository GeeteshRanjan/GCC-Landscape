import { publicCopySchema } from "./schema";
import type {
  BusinessType,
  Company,
  CustomerLogo,
  Dataset,
  CloseCopy,
  HeroCopy,
  ImpactStat,
  LatLon,
  Metric,
  PublicCopy,
  SiteContent,
  Taxonomy,
  TaxonomyListKey,
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

export type TaxonomyKey = TaxonomyListKey;

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

/**
 * What one taxonomy entry in the diff can be about: the four flat lists, plus the
 * two parallel keys that hold copies of strings from them.
 *
 * **The two are reported as entries in the same list rather than as a category of
 * their own, and that is what makes them visible without a renderer change.** Both
 * renderers walk `diff.taxonomy` and label each entry from `TAXONOMY_LABELS`, so a
 * new key with a label reads out on both surfaces the way an added city already
 * does. A separate category would have had two counts, two sections and two
 * chances to be left out of one of them — which is how `businessTypes` came to be
 * missing from `COMPANY_FIELDS`.
 */
export type TaxonomyDiffKey = TaxonomyKey | "pinnedIndustries" | "cityCoordinates";

export interface TaxonomyDiff {
  key: TaxonomyDiffKey;
  added: string[];
  removed: string[];
  /**
   * True when the values are the same set but in a different order. Only
   * meaningful for `revenueBands`, where order is the contract for
   * adjacent-band peer matching — a reorder there is a real change even though
   * added and removed are both empty.
   *
   * Never set for the two parallel keys, and that is the same judgement made the
   * other way: pinning decides MEMBERSHIP of the leading tier and position inside
   * it is still company count, so a reordered pin list draws an identical dropdown.
   * Reporting it would be the tag-reorder noise `diffBusinessTypes` refuses.
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
 * "Apparel & Footwear Brand" silently changes who Nike sees, with no company row
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
 * Site-content changes — every public string and figure that is data rather than
 * code.
 *
 * A fourth category rather than a field list folded into one of the others, and
 * for the sharpest reason of the four: this is the only part of the dataset whose
 * changes are visible on the public site regardless of what a visitor answered. A
 * month of company edits changes what a few visitors are shown; a one-character
 * edit here changes the headline every visitor reads. It gets its own count so it
 * can never be the smaller number hidden inside a larger one.
 *
 * Two shapes inside it, and which one a member takes follows from whether its keys
 * are fixed. `hero`, `close` and `copy` are field lists: the slots are known, so
 * every change is an edit and both sides are worth reading in full. `impactStats`,
 * `commonFunctions` and `logos` are collections whose rows are added, removed and
 * reordered, so each is keyed — by id, by the value itself, and by `src`
 * respectively, for the reasons recorded on each.
 */
export interface SiteContentDiff {
  hero: Array<{ field: keyof HeroCopy; before: string; after: string }>;
  /**
   * The close's two strings, reported exactly like the hero's.
   *
   * **It is in this category and not left out of the diff, which is the whole reason the
   * category exists.** The close is on both RESULT screens rather than the entry point, so
   * it is not literally the first thing every visitor reads — but it is the tool's only
   * call to action, and a publish that silently changed the words on it would be the same
   * defect as a silently changed headline. A field list rather than a keyed collection,
   * because the keys are fixed and every one of them is worth reading before approving.
   *
   * **Four fields now: two strings and the two per-screen links.** The links are in here
   * on a sharper version of the same argument — a retagged link changes nothing a reviewer
   * can see on the page, so if the diff did not carry it, a wrong UTM string or a typo in a
   * domain would reach production with the review saying "no site content changes". Both
   * sides are reported for the links exactly as for the prose, since a link is only
   * checkable by reading it.
   */
  close: Array<{ field: keyof CloseCopy; before: string; after: string }>;
  /**
   * The thirty static strings, reported exactly like the hero's two.
   *
   * A field list rather than a keyed collection because the keys are fixed: a copy
   * edit is always an edit, never an addition or a removal, so there is nothing to
   * key on and nothing to report as added. Each entry carries both sides for the
   * reason the hero's does — these are headings and labels a reviewer has to READ,
   * and "copy changed" tells them nothing they can approve.
   */
  copy: Array<{ field: keyof PublicCopy; before: string; after: string }>;
  /**
   * The function tags, as a set plus an order.
   *
   * Diffed like a taxonomy list rather than like the impact figures, because the
   * items ARE their own identity — there is no id, and a renamed tag is
   * indistinguishable from one removed and another added. Order is reported for the
   * same reason it is on the impact figures: it is what a visitor reads.
   */
  commonFunctions: {
    added: string[];
    removed: string[];
    reordered: boolean;
  };
  /**
   * The customer strip, keyed by `src`.
   *
   * **The file is the identity here, and it is the one field that is not free
   * text** — it is chosen from what is already served, so two rows pointing at the
   * same file would be the same mark twice. Repointing a row at a different file
   * therefore reads as one mark removed and another added, which is what it is: a
   * different company's logo in the strip. Renaming, resizing and reordering are
   * edits.
   */
  logos: {
    added: Array<Pick<CustomerLogo, "name" | "src">>;
    removed: Array<Pick<CustomerLogo, "name" | "src">>;
    changed: Array<{
      src: string;
      name: string;
      changes: Array<{ field: keyof CustomerLogo; before: string; after: string }>;
    }>;
    /** The strip scrolls in this order, so a reorder is a change. */
    reordered: boolean;
  };
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
  /**
   * Here from the day the field existed, on the `businessTypes` lesson below: a bulk
   * pass over all 1,834 companies that reported "no company changes" would publish as
   * a silent no-op. A domain decides which mark a peer card draws, so filling one is a
   * real change to what a visitor sees.
   */
  "domain",
  "hqCountry",
  "industry",
  "revenueBand",
  "establishedYear",
  "cities",
  "fte",
  "fortuneGlobal500",
  "forbesGlobal2000",
  /**
   * `businessTypes` was missing here, and it was the one omission that mattered.
   *
   * A company's sub-industry is the PRIMARY ordering signal in `similarity.ts`, so
   * moving one changes which peers a real visitor is shown. Left out of this list, a
   * re-tagging pass over the whole dataset printed "no company changes" and would
   * have published as a silent no-op — which is the opposite of the reason there is no
   * database. Six companies moving between sub-industries has to read as six changed
   * companies.
   */
  "businessTypes",
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
  "progression",
  "subset",
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
const CLOSE_FIELDS: ReadonlyArray<keyof CloseCopy> = [
  "body",
  "ctaLabel",
  /* The two links, diffed exactly like the two strings. A retagged link is the change
     most likely to be made quickly and least likely to be noticed on the page, since
     nothing visible moves — so it is the one in this object that most needs both sides
     spelled out in the review. */
  "ctaHrefPeers",
  "ctaHrefFunctions",
];

/**
 * What each close field is called in the review, because three of the four keys name a
 * slot rather than a thing an admin would recognise.
 *
 * Same reasoning as `PUBLIC_COPY_LABELS`: `ctaHrefFunctions` tells a reviewer nothing
 * about which screen's link moved. Held here rather than in the panel so the text renderer
 * and the UI renderer name the field identically — a publish reviewed in one and approved
 * in the other must not read as two different changes.
 */
export const CLOSE_FIELD_LABELS: Record<keyof CloseCopy, string> = {
  body: "body",
  ctaLabel: "button",
  ctaHrefPeers: "peer landscape link",
  ctaHrefFunctions: "function metrics link",
};
const IMPACT_FIELDS: ReadonlyArray<keyof ImpactStat> = ["value", "label"];
const LOGO_FIELDS: ReadonlyArray<keyof CustomerLogo> = ["name", "width", "height"];

/**
 * Read off the gate rather than typed out, and that is the lesson from
 * `COMPANY_FIELDS`.
 *
 * Thirty keys is exactly the length at which a hand-maintained list quietly loses
 * one, and a copy field missing from here is a publish that reports "no changes"
 * for a heading every visitor reads — the `businessTypes` defect again, thirty
 * times over. Derived from the schema's own shape, so a key added there is diffed
 * the moment it exists.
 */
const PUBLIC_COPY_FIELDS = Object.keys(publicCopySchema.shape) as ReadonlyArray<
  keyof PublicCopy
>;

/** A coordinate as one readable string, since both renderers show a list of them. */
function describeCoordinate(city: string, coord: LatLon): string {
  return `${city} (${coord.lat}, ${coord.lon})`;
}

/**
 * The two parallel taxonomy keys, as entries in the same list the four flat ones
 * produce.
 *
 * A MOVED coordinate is reported as the old one removed and the new one added,
 * rather than as a third kind of change. That is how a rename already reads in the
 * four lists — added under the new name, removed under the old — and it is honest
 * for a record: the entry that described the city before is gone and a different one
 * describes it now. It also means the existing renderers spell out both numbers
 * without either of them growing a case for a shape they have never seen.
 */
function diffParallelTaxonomy(
  next: Taxonomy,
  previous: Taxonomy,
): TaxonomyDiff[] {
  const entries: TaxonomyDiff[] = [];

  const pinnedBefore = new Set(previous.pinnedIndustries);
  const pinnedAfter = new Set(next.pinnedIndustries);
  const pinnedAdded = next.pinnedIndustries.filter((v) => !pinnedBefore.has(v));
  const pinnedRemoved = previous.pinnedIndustries.filter((v) => !pinnedAfter.has(v));
  if (pinnedAdded.length > 0 || pinnedRemoved.length > 0) {
    entries.push({
      key: "pinnedIndustries",
      added: pinnedAdded,
      removed: pinnedRemoved,
      reordered: false,
    });
  }

  const added: string[] = [];
  const removed: string[] = [];
  for (const [city, coord] of Object.entries(next.cityCoordinates)) {
    const old = previous.cityCoordinates[city];
    if (old === undefined) {
      added.push(describeCoordinate(city, coord));
      continue;
    }
    if (old.lat !== coord.lat || old.lon !== coord.lon) {
      removed.push(describeCoordinate(city, old));
      added.push(describeCoordinate(city, coord));
    }
  }
  for (const [city, coord] of Object.entries(previous.cityCoordinates)) {
    if (next.cityCoordinates[city] === undefined) {
      removed.push(describeCoordinate(city, coord));
    }
  }
  if (added.length > 0 || removed.length > 0) {
    entries.push({ key: "cityCoordinates", added, removed, reordered: false });
  }

  return entries;
}

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

  const close = CLOSE_FIELDS.filter(
    (field) => next.close[field] !== previous.close[field],
  ).map((field) => ({
    field,
    before: previous.close[field],
    after: next.close[field],
  }));

  const copy = PUBLIC_COPY_FIELDS.filter(
    (field) => next.copy[field] !== previous.copy[field],
  ).map((field) => ({
    field,
    before: previous.copy[field],
    after: next.copy[field],
  }));

  const functionsBefore = new Set(previous.commonFunctions);
  const functionsAfter = new Set(next.commonFunctions);
  const functionsAdded = next.commonFunctions.filter((v) => !functionsBefore.has(v));
  const functionsRemoved = previous.commonFunctions.filter(
    (v) => !functionsAfter.has(v),
  );
  const commonFunctions = {
    added: functionsAdded,
    removed: functionsRemoved,
    // Membership first, the same guard the taxonomy lists and the impact figures
    // both carry: an added item shifts everything after it, so a naive order
    // comparison would call every addition a reorder as well and count it twice.
    reordered:
      functionsAdded.length === 0 &&
      functionsRemoved.length === 0 &&
      !sameValue(previous.commonFunctions, next.commonFunctions),
  };

  const logos = diffLogos(next.logos, previous.logos);

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

  return {
    hero,
    close,
    copy,
    commonFunctions,
    logos,
    impactStats: { added, removed, changed, reordered },
  };
}

/** Field-level diff of the logo strip, keyed by `src`. See `SiteContentDiff.logos`. */
function diffLogos(
  next: readonly CustomerLogo[],
  previous: readonly CustomerLogo[],
): SiteContentDiff["logos"] {
  const before = new Map(previous.map((logo) => [logo.src, logo]));
  const after = new Map(next.map((logo) => [logo.src, logo]));

  const added: SiteContentDiff["logos"]["added"] = [];
  const changed: SiteContentDiff["logos"]["changed"] = [];
  for (const [src, logo] of after) {
    const old = before.get(src);
    if (!old) {
      added.push({ name: logo.name, src });
      continue;
    }
    const changes = LOGO_FIELDS.filter((field) => logo[field] !== old[field]).map(
      (field) => ({
        field,
        // Stringified because the three editable fields are a name and two
        // measurements, and a reviewer reads "106 → 128" the same way either way.
        before: String(old[field]),
        after: String(logo[field]),
      }),
    );
    if (changes.length > 0) changed.push({ src, name: logo.name, changes });
  }

  const removed: SiteContentDiff["logos"]["removed"] = [];
  for (const [src, logo] of before) {
    if (!after.has(src)) removed.push({ name: logo.name, src });
  }

  return {
    added,
    removed,
    changed,
    reordered:
      added.length === 0 &&
      removed.length === 0 &&
      !sameValue(
        previous.map((logo) => logo.src),
        next.map((logo) => logo.src),
      ),
  };
}

function siteContentCount(diff: SiteContentDiff): number {
  return (
    diff.hero.length +
    diff.close.length +
    diff.copy.length +
    diff.commonFunctions.added.length +
    diff.commonFunctions.removed.length +
    (diff.commonFunctions.reordered ? 1 : 0) +
    diff.logos.added.length +
    diff.logos.removed.length +
    diff.logos.changed.length +
    (diff.logos.reordered ? 1 : 0) +
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
    /**
     * The two parallel keys are diffed against an EMPTY taxonomy rather than listed
     * outright, so a first import that pins nothing and plots nothing produces no
     * entry for them at all. An entry with two empty lists would render as a
     * labelled heading with nothing under it on both surfaces.
     */
    const taxonomy: TaxonomyDiff[] = [
      ...TAXONOMY_KEYS.map((key) => ({
        key,
        added: [...next.taxonomy[key]],
        removed: [],
        reordered: false,
      })),
      ...diffParallelTaxonomy(next.taxonomy, {
        ...next.taxonomy,
        pinnedIndustries: [],
        cityCoordinates: {},
      }),
    ];

    return {
      firstImport: true,
      added: next.companies.map((c) => ({ id: c.id, name: c.name })),
      removed: [],
      changed: [],
      taxonomy,
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
        close: [],
        // The copy strings are the hero's case, thirty times: fixed keys with no
        // previous value, so every one of them would report as an edit against
        // nothing. The two collections beside them are the impact figures' case —
        // genuinely new rows — so they are listed.
        copy: [],
        commonFunctions: {
          added: [...next.siteContent.commonFunctions],
          removed: [],
          reordered: false,
        },
        logos: {
          added: next.siteContent.logos.map((logo) => ({
            name: logo.name,
            src: logo.src,
          })),
          removed: [],
          changed: [],
          reordered: false,
        },
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
        // Counted from what was actually built rather than from the number of keys
        // there are, since the two parallel ones only produce an entry when they
        // hold something.
        taxonomy: taxonomy.length,
        businessTypes: next.businessTypes.length,
        metrics: next.metrics.length,
        siteContent:
          next.siteContent.impactStats.length +
          next.siteContent.commonFunctions.length +
          next.siteContent.logos.length,
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
  taxonomy.push(...diffParallelTaxonomy(next.taxonomy, previous.taxonomy));

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

/**
 * Human label for a taxonomy entry. Used by both renderers.
 *
 * The two parallel keys are named for what they DO rather than for the key they
 * live under, because a reviewer approving a publish is deciding about a dropdown
 * and a map, not about the shape of a JSON object.
 */
export const TAXONOMY_LABELS: Record<TaxonomyDiffKey, string> = {
  industries: "Industries",
  revenueBands: "Revenue bands",
  cities: "Cities",
  hqCountries: "HQ countries",
  pinnedIndustries: "Industries held in the dropdown's leading tier",
  cityCoordinates: "City coordinates for the map",
};

/**
 * Human label for each static copy string. One wording, two surfaces.
 *
 * Beside `TAXONOMY_LABELS` and `METRIC_FIELD_LABELS` rather than in the admin form,
 * because both the form and the publish diff have to name the same slot and a
 * reviewer approving "figuresHr" learns nothing from the key. The admin editor
 * groups these by screen and reads its labels from here, so the words a person
 * types under cannot differ from the words they approve under.
 *
 * Each names WHERE the string appears, never what it says: several of them are two
 * words, and a label quoting the value would be stale the moment it was edited.
 */
export const PUBLIC_COPY_LABELS: Record<keyof PublicCopy, string> = {
  askTitle: "Form heading",
  askLead: "Form intro",
  askSubmit: "Form submit",
  askCompanyLabel: "Form field, company name",
  askIndustryLabel: "Form field, industry",
  askRevenueLabel: "Form field, revenue",
  askHqLabel: "Form field, headquarters",
  askIndustryPlaceholder: "Industry control, unanswered text",
  askIndustryHint: "Industry control, hint",
  askRevenuePlaceholder: "Revenue control, unanswered text",
  askRevenueHint: "Revenue control, hint",
  askHqPlaceholder: "Headquarters control, unanswered text",
  askFilterPlaceholder: "Dropdown filter, unanswered text",
  askSubmitError: "Form submit error",
  askFieldRequired: "Form field, unanswered error",
  filterEmpty: "Dropdown filter, nothing matched",
  customersLabel: "Logo strip description",
  impactTitleLead: "Impact band heading",
  headerPeers: "Peer view finding",
  headerFunctions: "Function view finding",
  viewPeers: "Peer view switch",
  viewFunctions: "Function view switch",
  pillCompany: "Answer pill, company",
  pillIndustry: "Answer pill, industry",
  pillHeadquarters: "Answer pill, headquarters",
  pillRevenueBand: "Answer pill, revenue band",
  functionPanelLabel: "Function view, panel description",
  editAnswers: "Result band, edit button",
  pillGroupLabel: "Result band, pill group description",
  viewSwitchLabel: "Result band, view switch description",
  homeTitle: "Result band, home link tooltip",
  editorTitle: "Answer editor heading",
  editorLead: "Answer editor intro",
  editorClose: "Answer editor, close button",
  editorSubmit: "Answer editor, submit button",
  gridRowHeader: "Capability grid, row column name",
  industryTitle: "Industry count heading",
  snapshotHeading: "Snapshot heading",
  peersTitle: "Peer grid heading",
  peersTitleFallback: "Peer grid heading, no company given",
  largestTitle: "Largest GCCs heading",
  mapTitle: "City map heading",
  cityScopeAll: "City map, all-cities scope",
  cityScopeTop: "City map, top-cities scope",
  cityCountHeader: "City map, count column",
  cityToggleToTop: "City map, collapse button",
  cityToggleToAll: "City map, expand button",
  peerHeadcountLabel: "Peer card, headcount",
  peerCitiesLabel: "Peer card, cities",
  peerSinceLabel: "Peer card, year",
  snapshotHeadcountLabel: "Snapshot, headcount",
  snapshotCitiesLabel: "Snapshot, city spread",
  snapshotLeadingCityLabel: "Snapshot, leading city",
  figureUnavailable: "Snapshot, missing figure",
  scaleTitle: "Scale strip heading",
  scaleFortuneLabel: "Scale strip, Fortune sentence",
  scaleForbesLabel: "Scale strip, Forbes sentence",
  scalePeopleLabel: "Scale strip, people sentence",
  figuresTech: "Technology figure row",
  figuresOperations: "Operations figure row",
  figuresHr: "HR figure row",
  figuresFinance: "Finance figure row",
  velocityHeading: "Hiring speed heading",
  hrAnalysisHeading: "HR analysis heading",
  opsSupportingHeading: "Operations supporting heading",
  sourceLine: "Attribution line",
  closeLabel: "Close band description",
  indexedNote: "Index card, base note",
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
  progression: "Drawn as one progression",
  subset: "Second part drawn inside the first",
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
      `  + ${diff.counts.siteContent} site content entries — the impact figures, the function list and the logo strip, plus the hero and close copy`,
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
  // The close, spelled out for the same reason the hero is: it is prose, and a reviewer
  // needs to read what it became rather than be told a field changed.
  for (const change of diff.siteContent.close) {
    lines.push(`  close ${CLOSE_FIELD_LABELS[change.field]}:`);
    lines.push(`    - ${change.before}`);
    lines.push(`    + ${change.after}`);
  }
  /* The static strings, one field per line with both sides — same treatment as the
     hero and the close, because these are headings and labels rather than a count of
     something. Named by their key, which is what the admin form labels them by too. */
  for (const change of diff.siteContent.copy) {
    lines.push(`  copy ${change.field}:`);
    lines.push(`    - ${change.before}`);
    lines.push(`    + ${change.after}`);
  }
  sample("functions added", diff.siteContent.commonFunctions.added);
  sample("functions removed", diff.siteContent.commonFunctions.removed);
  if (diff.siteContent.commonFunctions.reordered) {
    lines.push("  functions reordered");
  }
  sample(
    "logos added",
    diff.siteContent.logos.added.map((logo) => `${logo.name} ${logo.src}`),
  );
  sample(
    "logos removed",
    diff.siteContent.logos.removed.map((logo) => `${logo.name} ${logo.src}`),
  );
  for (const logo of diff.siteContent.logos.changed) {
    for (const change of logo.changes) {
      lines.push(
        `  logo ${logo.src} ${change.field}: ${change.before} -> ${change.after}`,
      );
    }
  }
  if (diff.siteContent.logos.reordered) {
    lines.push("  logos reordered");
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
