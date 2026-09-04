"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { alignValue } from "@/data/metrics";
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
  TaxonomyListKey,
} from "@/data/schema";
import { slugify, uniqueSlug } from "@/data/normalize";

/**
 * The draft. Every edit lands here, nothing is sent to the server until Publish.
 *
 * This is the shape project.md asks for: publishing is batched and roughly
 * monthly, so a month of edits is held in the browser, autosaved locally, and
 * sent as a single commit. No server-side draft storage exists, and none should
 * be added — that trade was considered and rejected.
 *
 * Two consequences worth being explicit about:
 *
 *   - The whole dataset does reach this browser. That does not violate "the
 *     dataset is never shipped to the browser": that rule is about the public
 *     surface, where Screen 1 sends five peers and a few counts. Admin is
 *     authenticated, unlinked, and cannot edit rows it cannot see.
 *   - The draft is pinned to the baseline it was started from. If the published
 *     data moves underneath — someone else publishes, or the seed is
 *     re-imported — the stored draft is stale and is surfaced as a conflict
 *     rather than silently replayed over data it never saw.
 */

/**
 * Bumped to v3 when the business-type catalogue joined the editable slice; v2
 * added the function metrics; v5 when the close's copy did.
 *
 * Not cosmetic. A draft stored under an older key is missing a whole editable
 * collection, and restoring it would produce a draft the publish gate rejects
 * with a schema error the admin has no way to fix from the UI. A new key means
 * those drafts are simply not found, which is the honest outcome: the key was
 * versioned for exactly this.
 *
 * `tests/browser/helpers.ts` owns `DRAFT_STORAGE_KEY` and must move with it.
 *
 * **The keys added since v5 are guarded by SHAPE rather than by a sixth
 * version, and the restore below is where that happens.** A version bump is the
 * blunt instrument and it is the right one when a whole collection appears; these
 * five are all `.default()`-ed in the schema, which makes the failure quieter and
 * worse. A v5 draft written before them parses on the way out — the defaults fill
 * the gaps — so publishing one would silently RESET the pinned industries, the
 * coordinates, the function list, the logo strip and every copy string to the
 * shipped values, and report it as an ordinary edit. So the restore checks the keys
 * it is about to trust and drops a draft that predates them.
 *
 * **The close's two per-screen CTA links are guarded the same way, and they are the case
 * that shows why the check is by TYPE and not by truthiness.** Blank is a legal value for
 * a link — it means "use the configured default" — so `!link` would discard a draft in
 * which an admin had deliberately cleared one. Publishing a draft that predates the keys
 * would reset both links to blank and silently untag the only outbound link in the
 * product, which is the same class of quiet reset as the five above.
 *
 * **v6 is a key REMOVED rather than added, and that is the case a shape check cannot
 * catch.** `copy.peersTitle` left the schema when the comparable-companies heading
 * started naming the visitor's own company. A v5 draft still holds the key; zod strips
 * an unrecognised key rather than refusing it, so such a draft would publish cleanly and
 * the extra string would vanish without appearing in the diff — quiet, and it would take
 * the admin's real edits in that draft with it if the shape had drifted further. There is
 * no key whose ABSENCE marks a v5 draft, so a version bump is the only instrument
 * available here.
 *
 * **v7 is twenty-nine keys ADDED, and it needs a bump for a reason the earlier additions
 * did not: `copy` is now MERGED over the shipped block rather than defaulted as a whole.**
 * That merge is what makes a new string a compatible change to a published dataset — an
 * older `dataset.json` reads forward instead of failing validation. Applied to a stored
 * DRAFT it does the same thing silently, so a v6 draft would parse, fill twenty-nine gaps
 * with shipped values, and publish them as though an admin had approved each one. The
 * shape check cannot see it either: the keys are present after the merge, which is the
 * point of the merge. `peersTitle` also returns here as a TEMPLATE, so a v6 draft that
 * still carried the old flat string would now be validated against a `{company}` slot it
 * has no reason to contain.
 *
 * **v8 is ONE key added, `copy.industryBasisNote`, and it needs the bump for exactly the
 * reason v7 did.** The merge is per-KEY, so a v7 draft is short by one, parses, has the
 * gap filled with the shipped sentence, and publishes it as an approved edit. One string
 * is not a smaller version of that problem — it is the same problem — and the bump is now
 * the only instrument for a copy-shape change.
 *
 * **v9 is `copy.peersNarrowNote`, one key, on v8's reasoning exactly** — and it carries
 * v7's second lesson as well as v8's first: the key is a TEMPLATE, so a v8 draft filled
 * from the merge would be validated against an `{industry}` slot it has never held.
 */
const STORAGE_KEY = "gcc-admin-draft-v9";
const AUTOSAVE_DEBOUNCE_MS = 800;

/** Everything the admin can edit. Metadata is server-owned. */
type EditableDataset = Pick<
  Dataset,
  "taxonomy" | "companies" | "businessTypes" | "metrics" | "siteContent"
>;

export type TaxonomyKey = TaxonomyListKey;

interface StoredDraft {
  /** The baseline this draft was started from. */
  baselineGeneratedAt: string;
  savedAt: string;
  editable: EditableDataset;
}

export type SaveState = "idle" | "saving" | "saved" | "unavailable";

export interface DraftConflict {
  /** The baseline the stored draft expected. */
  draftBaseline: string;
  savedAt: string;
}

interface DraftContextValue {
  baseline: Dataset;
  draft: Dataset;
  dirty: boolean;
  saveState: SaveState;
  /** A stored draft that no longer matches the published baseline. */
  conflict: DraftConflict | null;

  companyById: (id: string) => Company | undefined;

  addCompany: (company: Omit<Company, "id">) => string;
  updateCompany: (id: string, patch: Partial<Omit<Company, "id">>) => void;
  deleteCompany: (id: string) => void;

  metricById: (id: string) => Metric | undefined;
  /**
   * Saves a whole edited metric. One call rather than a patch per field, so a
   * shape change and the numbers re-fitted to it land in a single edit — the
   * admin's "Save" is one undoable step, and no render sees a metric whose value
   * length disagrees with its shape.
   */
  replaceMetric: (id: string, next: Metric) => void;
  /** Back to no numbers at all, leaving the definition alone. */
  clearMetricValue: (id: string) => void;

  businessTypeById: (id: string) => BusinessType | undefined;
  addBusinessType: (type: BusinessType) => void;
  updateBusinessType: (id: string, patch: Partial<Omit<BusinessType, "id">>) => void;
  removeBusinessType: (id: string) => void;

  /**
   * The hero's copy. A patch rather than a whole-object replace, because the two
   * fields are edited in separate controls and there is no cross-field rule that
   * needs them to land together — unlike a metric, where a shape change and the
   * numbers re-fitted to it must be one edit.
   */
  updateHeroCopy: (patch: Partial<HeroCopy>) => void;
  /** The close's copy, patched the same way and for the same reason as the hero's. */
  updateCloseCopy: (patch: Partial<CloseCopy>) => void;
  /** Returns the id of the new row, so the caller can focus it. */
  addImpactStat: () => string;
  updateImpactStat: (id: string, patch: Partial<Omit<ImpactStat, "id">>) => void;
  removeImpactStat: (id: string) => void;
  /**
   * Reorder by one step. Impact stats render as one ordered row, so their order
   * is the display order and an admin has to be able to set it — the same
   * reasoning as `moveTaxonomyValue`, for a different reason: there the order is
   * a matching contract, here it is what the visitor reads left to right.
   */
  moveImpactStat: (index: number, delta: number) => void;

  /**
   * The thirty static strings, patched like the hero's two and for the same
   * reason: they are thirty independent slots with no rule spanning any pair, so
   * there is nothing that has to land as one edit.
   */
  updatePublicCopy: (patch: Partial<PublicCopy>) => void;
  /**
   * The function tags, replaced wholesale rather than patched per item.
   *
   * `setTaxonomyValues` sets the precedent: adding, renaming, removing and
   * reordering a flat list of strings are four shapes of one operation, and a
   * mutator per shape would be four ways to write the same array. The editor
   * computes the next list and hands it over.
   */
  setCommonFunctions: (values: string[]) => void;
  addLogo: () => void;
  updateLogo: (index: number, patch: Partial<CustomerLogo>) => void;
  removeLogo: (index: number) => void;
  /** Reorder by one step. The strip scrolls in this order. */
  moveLogo: (index: number, delta: number) => void;

  setTaxonomyValues: (key: TaxonomyKey, values: string[]) => void;
  addTaxonomyValue: (key: TaxonomyKey, value: string) => void;
  renameTaxonomyValue: (key: TaxonomyKey, from: string, to: string) => void;
  removeTaxonomyValue: (key: TaxonomyKey, value: string) => void;
  moveTaxonomyValue: (key: TaxonomyKey, index: number, delta: number) => void;

  /**
   * The two parallel taxonomy keys, each with its own mutator rather than a
   * generic one, because neither is a flat list of its own values: one holds
   * copies of strings from `industries` and the other is keyed by a string from
   * `cities`. The generic list mutators above would have needed a special case
   * each; see `TAXONOMY_LIST_KEYS` in the schema for the same split.
   */
  setPinnedIndustry: (industry: string, pinned: boolean) => void;
  /** `null` removes the coordinate, which is how a city goes back to carrying no dot. */
  setCityCoordinate: (city: string, coord: LatLon | null) => void;

  /**
   * Undo one pending change, restoring its baseline value. The surgical
   * counterpart to `discardDraft`: an admin sitting on a month of edits with a
   * few stale ones mixed in can drop the stale ones one at a time rather than
   * throwing the whole draft away.
   */
  revert: (target: RevertTarget) => void;

  /** Throw the draft away and go back to what is published. */
  discardDraft: () => void;
  /** Keep the local draft but re-pin it to the current baseline. */
  keepDraftAgainstNewBaseline: () => void;
  /** Called after a successful publish: the draft is now the baseline. */
  markPublished: (metadata: Pick<Dataset, "version" | "generatedAt" | "source">) => void;
}

const DraftContext = createContext<DraftContextValue | null>(null);

/**
 * One pending change, addressed precisely enough to put it back.
 *
 * The publish diff carries the coordinates of every change — an id, a field, a
 * collection — and this is the same set expressed as an instruction to undo one.
 * The grain follows what the diff draws: a company or a copy string is reverted
 * field by field, because that is how they read; a metric, a business type or a
 * whole taxonomy list is reverted as one entity, because a single field of one
 * is not independently meaningful.
 *
 * The value put back always comes from the baseline, never from the diff's own
 * `before`, which is formatted for display (tags are comma-joined, coordinates
 * are stringified) and does not round-trip.
 */
export type RevertTarget =
  | { kind: "companyField"; id: string; field: keyof Company }
  | { kind: "company"; id: string }
  | { kind: "metric"; id: string }
  | { kind: "businessType"; id: string }
  | { kind: "taxonomy"; key: keyof Dataset["taxonomy"] }
  | { kind: "heroField"; field: keyof HeroCopy }
  | { kind: "closeField"; field: keyof CloseCopy }
  | { kind: "copyField"; field: keyof PublicCopy }
  | { kind: "commonFunctions" }
  | { kind: "logos" }
  | { kind: "impactStats" };

/**
 * Put one entity back to its baseline, handling the three shapes a change can
 * take: an edit (present both sides — replace it), an addition (present only in
 * the draft — drop it), and a removal (present only in the baseline — reinsert it
 * where it sits there, so order is not disturbed).
 */
function revertById<T extends { id: string }>(
  current: readonly T[],
  base: readonly T[],
  id: string,
): T[] {
  const baseItem = base.find((item) => item.id === id);
  const inCurrent = current.some((item) => item.id === id);
  if (baseItem && inCurrent) {
    return current.map((item) => (item.id === id ? baseItem : item));
  }
  if (baseItem && !inCurrent) {
    const at = base.findIndex((item) => item.id === id);
    const next = [...current];
    next.splice(Math.min(at, next.length), 0, baseItem);
    return next;
  }
  if (!baseItem && inCurrent) {
    return current.filter((item) => item.id !== id);
  }
  return [...current];
}

/**
 * Pure: the editable slice with one change undone against the baseline. Kept out
 * of the component so the logic is a data transform rather than a closure over
 * render state, the same reasoning the metric mutators are written under.
 */
function revertEditable(
  current: EditableDataset,
  base: EditableDataset,
  target: RevertTarget,
): EditableDataset {
  switch (target.kind) {
    case "companyField": {
      const baseCompany = base.companies.find((c) => c.id === target.id);
      // A field revert only reaches an edited company, which is present in both.
      // A company added in the draft has no baseline field to restore to.
      if (!baseCompany) return current;
      return {
        ...current,
        companies: current.companies.map((company) =>
          company.id === target.id
            ? ({ ...company, [target.field]: baseCompany[target.field] } as Company)
            : company,
        ),
      };
    }
    case "company":
      return {
        ...current,
        companies: revertById(current.companies, base.companies, target.id),
      };
    case "metric":
      return {
        ...current,
        metrics: revertById(current.metrics, base.metrics, target.id),
      };
    case "businessType":
      return {
        ...current,
        businessTypes: revertById(current.businessTypes, base.businessTypes, target.id),
      };
    case "taxonomy":
      return {
        ...current,
        taxonomy: {
          ...current.taxonomy,
          [target.key]: base.taxonomy[target.key],
        } as Dataset["taxonomy"],
      };
    case "heroField":
      return {
        ...current,
        siteContent: {
          ...current.siteContent,
          hero: {
            ...current.siteContent.hero,
            [target.field]: base.siteContent.hero[target.field],
          } as HeroCopy,
        },
      };
    case "closeField":
      return {
        ...current,
        siteContent: {
          ...current.siteContent,
          close: {
            ...current.siteContent.close,
            [target.field]: base.siteContent.close[target.field],
          } as CloseCopy,
        },
      };
    case "copyField":
      return {
        ...current,
        siteContent: {
          ...current.siteContent,
          copy: {
            ...current.siteContent.copy,
            [target.field]: base.siteContent.copy[target.field],
          } as PublicCopy,
        },
      };
    case "commonFunctions":
      return {
        ...current,
        siteContent: {
          ...current.siteContent,
          commonFunctions: [...base.siteContent.commonFunctions],
        },
      };
    case "logos":
      return {
        ...current,
        siteContent: { ...current.siteContent, logos: [...base.siteContent.logos] },
      };
    case "impactStats":
      return {
        ...current,
        siteContent: { ...current.siteContent, impactStats: [...base.siteContent.impactStats] },
      };
  }
}

function editableOf(dataset: Dataset): EditableDataset {
  return {
    taxonomy: dataset.taxonomy,
    companies: dataset.companies,
    businessTypes: dataset.businessTypes,
    metrics: dataset.metrics,
    siteContent: dataset.siteContent,
  };
}



/**
 * What a new row in the logo strip starts as.
 *
 * `src` is empty, so a new row is incomplete until a file is chosen and the editor
 * says so — the same state an added impact figure starts in. The two dimensions are
 * not: they are a plausible starting size rather than a measurement, because zero is
 * refused by the schema and would put a bounds error on a row nobody had touched
 * yet. 64 is the height every raster mark in the shipped set was exported at, and
 * measuring the real ink bounds is the whole job of the two fields.
 */
const NEW_LOGO: CustomerLogo = { name: "", src: "", width: 100, height: 64 };

/** Which taxonomy list a company field draws from. */
const COMPANY_FIELD_FOR: Record<TaxonomyKey, keyof Company | "cities"> = {
  industries: "industry",
  revenueBands: "revenueBand",
  hqCountries: "hqCountry",
  cities: "cities",
};

export function DraftProvider({
  baseline,
  children,
}: {
  baseline: Dataset;
  children: React.ReactNode;
}) {
  // The baseline arrives from a server layout that re-renders on navigation.
  // It is held in state so a re-render with an identical prop does not clobber
  // an in-flight edit, and so `markPublished` can advance it.
  const [currentBaseline, setCurrentBaseline] = useState(baseline);
  const [editable, setEditable] = useState<EditableDataset>(() =>
    editableOf(baseline),
  );
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [conflict, setConflict] = useState<DraftConflict | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const pinnedBaseline = useRef(baseline.generatedAt);
  // A ref, not state: the autosave effect has to read this without it being a
  // dependency. See the comment on that effect.
  const storageUnavailable = useRef(false);

  /**
   * A newly published or re-imported baseline arriving from the server.
   *
   * Only ever moves forward, and that is the whole subtlety. `markPublished`
   * advances the baseline locally the moment a publish succeeds, while the
   * `baseline` prop still holds the copy the server rendered before it. Comparing
   * for mere inequality treats our own advance as the server disagreeing: it
   * reverts the baseline to the stale prop and raises a conflict warning
   * immediately after a successful publish, leaving the admin looking at
   * "publishing would overwrite whatever changed in between" about their own
   * change, with a draft that has gone dirty again and invites publishing twice.
   *
   * So the guard is strictly newer. A genuinely newer copy — someone else
   * published, or the seed was re-imported — still surfaces as a conflict.
   */
  useEffect(() => {
    const incoming = Date.parse(baseline.generatedAt);
    const held = Date.parse(currentBaseline.generatedAt);
    if (!Number.isFinite(incoming) || !Number.isFinite(held)) return;
    if (incoming <= held) return;

    setCurrentBaseline(baseline);
    setConflict((existing) =>
      existing ?? {
        draftBaseline: pinnedBaseline.current,
        savedAt: new Date().toISOString(),
      },
    );
  }, [baseline, currentBaseline.generatedAt]);

  // Restore from localStorage once, on mount. Deliberately not during render:
  // the server and the first client render must agree.
  useEffect(() => {
    setHydrated(true);
    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      storageUnavailable.current = true;
      setSaveState("unavailable");
      return;
    }
    if (!raw) return;

    let stored: StoredDraft;
    try {
      stored = JSON.parse(raw) as StoredDraft;
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }
    if (
      !stored.editable?.companies ||
      !stored.editable?.taxonomy ||
      !stored.editable?.metrics ||
      !stored.editable?.siteContent ||
      // The five keys added after this storage key was last moved. Checked here
      // rather than by a sixth version for the reason recorded on STORAGE_KEY: all
      // five are defaulted in the schema, so a draft missing one publishes cleanly
      // and resets it, which is the one outcome this provider must never produce.
      !stored.editable.taxonomy.pinnedIndustries ||
      !stored.editable.taxonomy.cityCoordinates ||
      !stored.editable.siteContent.commonFunctions ||
      !stored.editable.siteContent.logos ||
      !stored.editable.siteContent.copy ||
      // The close's two per-screen CTA links, checked on the same argument as the five
      // above and with one difference that matters: BLANK IS A LEGAL VALUE for these, so
      // truthiness is the wrong test — `!""` would throw away every draft in which an
      // admin has deliberately left a link unset. The presence of the key is what marks a
      // draft written after the field existed, so the type is what is checked.
      typeof stored.editable.siteContent.close?.ctaHrefPeers !== "string" ||
      typeof stored.editable.siteContent.close?.ctaHrefFunctions !== "string"
    ) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }

    setEditable(stored.editable);
    if (stored.baselineGeneratedAt !== baseline.generatedAt) {
      setConflict({
        draftBaseline: stored.baselineGeneratedAt,
        savedAt: stored.savedAt,
      });
    }
    setSaveState("saved");
    // Restoring only ever happens against the baseline the page loaded with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Every mutation goes through here, and it marks the draft unsaved in the same
   * synchronous update that changes it.
   *
   * Without that pairing there is a window — one render — where the draft has
   * changed but `saveState` is still "idle" or a stale "saved", and the status
   * line reads "Saved locally" for work that is not on disk yet. It is a single
   * frame, but it is the status lying about whether an hour of edits would
   * survive closing the tab, so it gets designed out rather than tolerated.
   */
  const applyEdit = useCallback(
    (update: (current: EditableDataset) => EditableDataset) => {
      setSaveState("saving");
      setEditable(update);
    },
    [],
  );

  const dirty = useMemo(() => {
    // Stringify is ~5ms on this dataset and only runs when the draft changes.
    // An edit counter would be cheaper and wrong: editing a field back to its
    // original value must clear the dirty flag, not increment it.
    return (
      JSON.stringify(editable) !== JSON.stringify(editableOf(currentBaseline))
    );
  }, [editable, currentBaseline]);

  /**
   * Debounced autosave. A month of edits is only safe locally if it survives a
   * closed tab, and writing 700 KB on every keystroke is not.
   *
   * `saveState` must NOT be a dependency here, and the reason is worth keeping
   * written down. Including it makes the effect retrigger on its own output:
   * setting "saving" re-runs the effect, the cleanup cancels the pending timer,
   * and once the write lands and sets "saved" the whole cycle starts again. The
   * result is a permanent "Saving locally…" that never settles and a 700 KB
   * write every debounce interval, forever — the status lying about whether work
   * is safe, which is the one thing this component must never do.
   *
   * Storage availability is tracked in a ref for the same reason: it has to gate
   * the effect without being able to retrigger it.
   */
  useEffect(() => {
    if (!hydrated || storageUnavailable.current) return;

    if (!dirty) {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* nothing worth reporting */
      }
      setSaveState("idle");
      return;
    }

    setSaveState("saving");
    const timer = window.setTimeout(() => {
      const stored: StoredDraft = {
        baselineGeneratedAt: pinnedBaseline.current,
        savedAt: new Date().toISOString(),
        editable,
      };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
        setSaveState("saved");
      } catch {
        // Almost always the quota. Say so rather than showing a false "Saved".
        storageUnavailable.current = true;
        setSaveState("unavailable");
      }
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [editable, dirty, hydrated]);

  // Last resort against a closed tab mid-edit. The banner is the real warning;
  // this catches the case where nobody read it.
  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const draft = useMemo<Dataset>(
    () => ({
      version: currentBaseline.version,
      generatedAt: currentBaseline.generatedAt,
      source: currentBaseline.source,
      taxonomy: editable.taxonomy,
      companies: editable.companies,
      businessTypes: editable.businessTypes,
      metrics: editable.metrics,
      siteContent: editable.siteContent,
    }),
    [currentBaseline, editable],
  );

  const metricIndex = useMemo(
    () => new Map(editable.metrics.map((m) => [m.id, m])),
    [editable.metrics],
  );

  const companyIndex = useMemo(
    () => new Map(editable.companies.map((c) => [c.id, c])),
    [editable.companies],
  );

  const addCompany = useCallback((company: Omit<Company, "id">) => {
    const id = uniqueSlug(
      company.name,
      new Set(editable.companies.map((c) => c.id)),
    );
    applyEdit((current) => ({
      ...current,
      // Newest first: an admin who just added a row expects to see it.
      companies: [{ ...company, id }, ...current.companies],
    }));
    return id;
  }, [applyEdit, editable.companies]);

  const updateCompany = useCallback(
    (id: string, patch: Partial<Omit<Company, "id">>) => {
      applyEdit((current) => ({
        ...current,
        companies: current.companies.map((company) =>
          company.id === id ? { ...company, ...patch } : company,
        ),
      }));
    },
    [applyEdit],
  );

  const deleteCompany = useCallback((id: string) => {
    applyEdit((current) => ({
      ...current,
      companies: current.companies.filter((company) => company.id !== id),
    }));
  }, [applyEdit]);

  /**
   * Metric mutators. Both read the metric out of `current` inside the updater
   * rather than from a closure over `editable.metrics`, so neither takes it as a
   * dependency. That is not tidiness: a dependency on the slice they also write
   * is how the autosave loop documented above gets recreated one callback at a
   * time.
   */
  const replaceMetric = useCallback((id: string, next: Metric) => {
    applyEdit((current) => ({
      ...current,
      metrics: current.metrics.map((metric) =>
        metric.id === id
          ? {
              ...next,
              /**
               * Identity and classification are re-pinned from the metric being
               * replaced, not taken from the form.
               *
               * `gated` especially: which metrics sit behind the gate is a
               * product decision recorded in project.md, not an admin setting,
               * and a form field that could flip it would make a documented
               * invariant one stray click from being wrong. Same for `format`,
               * which decides whether a cell may hold text.
               *
               * **`atLeast` is deliberately NOT in this list**, which is the whole
               * reason the spread above comes first. It is part of the definition
               * like `format` is, but it is a claim about how the figures being
               * typed were arrived at — so it is the editor's to set and arrives
               * with the rest of the form. `progression` and `subset` are not
               * editable at all, so they ride the spread unchanged.
               */
              id: metric.id,
              functionArea: metric.functionArea,
              lens: metric.lens,
              format: metric.format,
              gated: metric.gated,
              value: alignValue(next.structure, next.value),
            }
          : metric,
      ),
    }));
  }, [applyEdit]);

  const clearMetricValue = useCallback((id: string) => {
    applyEdit((current) => ({
      ...current,
      metrics: current.metrics.map((metric) =>
        metric.id === id ? { ...metric, value: null } : metric,
      ),
    }));
  }, [applyEdit]);

  const addBusinessType = useCallback((type: BusinessType) => {
    applyEdit((current) => {
      if (current.businessTypes.some((existing) => existing.id === type.id)) return current;
      return { ...current, businessTypes: [...current.businessTypes, type] };
    });
  }, [applyEdit]);

  /**
   * Spread the original rather than rebuilding the object field by field, so a field
   * this editor does not surface is preserved rather than silently dropped — the same
   * discipline `atLeast` needs in the metric editor.
   */
  const updateBusinessType = useCallback(
    (id: string, patch: Partial<Omit<BusinessType, "id">>) => {
      applyEdit((current) => ({
        ...current,
        businessTypes: current.businessTypes.map((type) =>
          type.id === id ? { ...type, ...patch } : type,
        ),
      }));
    },
    [applyEdit],
  );

  /**
   * Removing a type also clears it from every company that carried it.
   *
   * Without the sweep the dataset fails referential integrity at publish — a company
   * pointing at a business type that no longer exists. Deliberately a cascade rather
   * than a refusal, unlike taxonomy deletion: a business type is a matching signal, so
   * losing it degrades a company to industry-level matching, which is a safe state.
   * A taxonomy value cannot degrade like that, which is why that one is refused instead.
   */
  const removeBusinessType = useCallback((id: string) => {
    applyEdit((current) => ({
      ...current,
      businessTypes: current.businessTypes.filter((type) => type.id !== id),
      companies: current.companies.map((company) =>
        company.businessTypes.includes(id)
          ? { ...company, businessTypes: company.businessTypes.filter((t) => t !== id) }
          : company,
      ),
    }));
  }, [applyEdit]);

  /* ----------------------------------------------------------------------
     Site content. No cascade and no referential integrity to maintain —
     nothing else in the dataset points at the hero copy or an impact figure —
     so these are the simplest mutators in the file. They still go through
     `applyEdit` so the draft is marked unsaved in the same update, which is the
     one property none of them may skip.
     ---------------------------------------------------------------------- */

  const updateHeroCopy = useCallback((patch: Partial<HeroCopy>) => {
    applyEdit((current) => ({
      ...current,
      siteContent: {
        ...current.siteContent,
        hero: { ...current.siteContent.hero, ...patch },
      },
    }));
  }, [applyEdit]);

  const updateCloseCopy = useCallback((patch: Partial<CloseCopy>) => {
    applyEdit((current) => ({
      ...current,
      siteContent: {
        ...current.siteContent,
        close: { ...current.siteContent.close, ...patch },
      },
    }));
  }, [applyEdit]);

  /**
   * A new row starts empty apart from its id, and the id is generated rather
   * than typed.
   *
   * An impact stat's id is never shown to anyone and never referenced from
   * outside this list — it exists so React and the form have a stable row
   * identity. Deriving it from the label the way `addCompany` derives a company
   * slug from a name would mean the id changing as the admin types, which is
   * exactly how a controlled input loses focus on every keystroke.
   */
  const addImpactStat = useCallback(() => {
    const id = uniqueSlug(
      `stat-${editable.siteContent.impactStats.length + 1}`,
      new Set(editable.siteContent.impactStats.map((stat) => stat.id)),
    );
    applyEdit((current) => ({
      ...current,
      siteContent: {
        ...current.siteContent,
        // Appended, not prepended. Unlike a company row, order here is what the
        // visitor reads, so a new figure lands at the end and is moved into
        // place deliberately.
        impactStats: [...current.siteContent.impactStats, { id, value: "", label: "" }],
      },
    }));
    return id;
  }, [applyEdit, editable.siteContent.impactStats]);

  const updateImpactStat = useCallback(
    (id: string, patch: Partial<Omit<ImpactStat, "id">>) => {
      applyEdit((current) => ({
        ...current,
        siteContent: {
          ...current.siteContent,
          impactStats: current.siteContent.impactStats.map((stat) =>
            stat.id === id ? { ...stat, ...patch } : stat,
          ),
        },
      }));
    },
    [applyEdit],
  );

  const removeImpactStat = useCallback((id: string) => {
    applyEdit((current) => ({
      ...current,
      siteContent: {
        ...current.siteContent,
        impactStats: current.siteContent.impactStats.filter((stat) => stat.id !== id),
      },
    }));
  }, [applyEdit]);

  const moveImpactStat = useCallback((index: number, delta: number) => {
    applyEdit((current) => {
      const stats = [...current.siteContent.impactStats];
      const target = index + delta;
      if (index < 0 || index >= stats.length) return current;
      if (target < 0 || target >= stats.length) return current;
      const [moved] = stats.splice(index, 1);
      stats.splice(target, 0, moved as ImpactStat);
      return {
        ...current,
        siteContent: { ...current.siteContent, impactStats: stats },
      };
    });
  }, [applyEdit]);

  const updatePublicCopy = useCallback((patch: Partial<PublicCopy>) => {
    applyEdit((current) => ({
      ...current,
      siteContent: {
        ...current.siteContent,
        copy: { ...current.siteContent.copy, ...patch },
      },
    }));
  }, [applyEdit]);

  /**
   * The whole list at once, stored exactly as handed over — nothing is trimmed,
   * de-duplicated or dropped here.
   *
   * Deliberately, because every cleanup that belongs to a finished list is wrong
   * while one is being typed: dropping an empty item takes the row the admin just
   * added, and collapsing a duplicate takes the row under their cursor the moment
   * they finish typing a label that already exists. The schema trims on parse, and
   * the editor is what refuses to leave an item empty.
   */
  const setCommonFunctions = useCallback((values: string[]) => {
    applyEdit((current) => ({
      ...current,
      siteContent: { ...current.siteContent, commonFunctions: values },
    }));
  }, [applyEdit]);

  const addLogo = useCallback(() => {
    applyEdit((current) => ({
      ...current,
      siteContent: {
        ...current.siteContent,
        // Appended, like an impact figure and for the same reason: order here is
        // what the strip scrolls through, so a new mark lands at the end and is
        // moved into place deliberately.
        logos: [...current.siteContent.logos, NEW_LOGO],
      },
    }));
  }, [applyEdit]);

  /**
   * Patched by INDEX, not by a key, because a logo has no id.
   *
   * `src` is the closest thing to one — it is the only field chosen from a fixed
   * set rather than typed — but it is also editable, so keying on it would make
   * pointing a row at a different file indistinguishable from replacing the row.
   * The index is stable for the duration of one edit, which is all a controlled
   * input needs, and the rows are never sorted.
   */
  const updateLogo = useCallback((index: number, patch: Partial<CustomerLogo>) => {
    applyEdit((current) => ({
      ...current,
      siteContent: {
        ...current.siteContent,
        logos: current.siteContent.logos.map((logo, i) =>
          i === index ? { ...logo, ...patch } : logo,
        ),
      },
    }));
  }, [applyEdit]);

  const removeLogo = useCallback((index: number) => {
    applyEdit((current) => ({
      ...current,
      siteContent: {
        ...current.siteContent,
        logos: current.siteContent.logos.filter((_, i) => i !== index),
      },
    }));
  }, [applyEdit]);

  const moveLogo = useCallback((index: number, delta: number) => {
    applyEdit((current) => {
      const logos = [...current.siteContent.logos];
      const target = index + delta;
      if (index < 0 || index >= logos.length) return current;
      if (target < 0 || target >= logos.length) return current;
      const [moved] = logos.splice(index, 1);
      logos.splice(target, 0, moved as CustomerLogo);
      return { ...current, siteContent: { ...current.siteContent, logos } };
    });
  }, [applyEdit]);

  const setTaxonomyValues = useCallback((key: TaxonomyKey, values: string[]) => {
    applyEdit((current) => ({
      ...current,
      taxonomy: { ...current.taxonomy, [key]: values },
    }));
  }, [applyEdit]);

  const addTaxonomyValue = useCallback((key: TaxonomyKey, value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    applyEdit((current) => {
      if (current.taxonomy[key].includes(trimmed)) return current;
      return {
        ...current,
        // Appended, never sorted. For revenueBands the order is the contract
        // for adjacent-band peer matching, so a new band lands at the end and
        // is moved into position deliberately.
        taxonomy: { ...current.taxonomy, [key]: [...current.taxonomy[key], trimmed] },
      };
    });
  }, [applyEdit]);

  /**
   * Rename cascades into every company that referenced the old value. Without
   * the cascade the dataset fails referential integrity at publish time, which
   * is a correct-but-useless outcome: the schema would reject a rename that the
   * UI made look successful.
   */
  const renameTaxonomyValue = useCallback(
    (key: TaxonomyKey, from: string, to: string) => {
      const next = to.trim();
      if (!next || next === from) return;

      applyEdit((current) => {
        const values = current.taxonomy[key];
        if (!values.includes(from)) return current;
        // Merging into an existing value is allowed; the list must not gain a
        // duplicate as a result.
        const renamed = values.map((v) => (v === from ? next : v));
        const deduped = renamed.filter((v, i) => renamed.indexOf(v) === i);

        const field = COMPANY_FIELD_FOR[key];
        const companies = current.companies.map((company) => {
          if (field === "cities") {
            if (!company.cities.includes(from)) return company;
            const cities = company.cities.map((c) => (c === from ? next : c));
            return {
              ...company,
              cities: cities.filter((c, i) => cities.indexOf(c) === i),
            };
          }
          return company[field] === from ? { ...company, [field]: next } : company;
        });

        /**
         * Industries are referenced from a SECOND place, and missing it breaks the
         * publish rather than merely leaving stale text.
         *
         * A business type is scoped to an industry, and the schema rejects a company
         * carrying a type from a different one. So renaming "Retail" without
         * rewriting `businessTypes[].industry` leaves every retailer pointing at a
         * type that now belongs to an industry nobody is in — a referential-integrity
         * error at publish time, from an edit the UI reported as successful. Exactly
         * the failure the company cascade exists to prevent, one level along.
         */
        const businessTypes =
          key === "industries"
            ? current.businessTypes.map((type) =>
                type.industry === from ? { ...type, industry: next } : type,
              )
            : current.businessTypes;

        /**
         * The two parallel taxonomy keys hold COPIES of strings from the primary
         * lists, so a rename has to carry the copy across as well.
         *
         * Same failure as the business-type cascade above, one level along: the
         * schema checks a pinned industry against `industries` and a coordinate's
         * key against `cities`, so a pin or a coordinate left under the old name is
         * a publish that fails referential integrity on an edit the UI reported as
         * successful. That is the correct-but-useless outcome the whole cascade
         * exists to avoid.
         */
        const pinned = current.taxonomy.pinnedIndustries;
        const renamedPins =
          key === "industries" ? pinned.map((v) => (v === from ? next : v)) : pinned;
        // A merge can pin the same industry twice. Nothing downstream breaks on
        // that — membership is read as a set — but the diff would report a pin
        // nobody added, so it is collapsed here the same way the list itself is.
        const pinnedIndustries = renamedPins.filter(
          (v, i) => renamedPins.indexOf(v) === i,
        );

        const held = current.taxonomy.cityCoordinates;
        const moving = key === "cities" ? held[from] : undefined;
        const cityCoordinates =
          moving === undefined
            ? held
            : Object.fromEntries([
                ...Object.entries(held).filter(([city]) => city !== from),
                // A merge keeps the SURVIVING name's own coordinate: it describes
                // the place that is left, and the name being renamed away was a
                // second spelling of it.
                ...(held[next] === undefined
                  ? ([[next, moving]] as Array<[string, LatLon]>)
                  : []),
              ]);

        return {
          ...current,
          taxonomy: {
            ...current.taxonomy,
            [key]: deduped,
            pinnedIndustries,
            cityCoordinates,
          },
          companies,
          businessTypes,
        };
      });
    },
    [applyEdit],
  );

  const removeTaxonomyValue = useCallback((key: TaxonomyKey, value: string) => {
    applyEdit((current) => {
      // Removing an industry orphans any business type scoped to it, and the schema
      // rejects a business type whose industry is not in the taxonomy. The editor
      // already refuses to delete a value still referenced by a company, so nothing
      // can still be pointing at these.
      const businessTypes =
        key === "industries"
          ? current.businessTypes.filter((type) => type.industry !== value)
          : current.businessTypes;

      // And the two parallel keys, for the reason spelled out in the rename above:
      // the schema checks both against the list they copy from, so a pin or a
      // coordinate for a value that no longer exists fails the publish.
      const pinnedIndustries =
        key === "industries"
          ? current.taxonomy.pinnedIndustries.filter((v) => v !== value)
          : current.taxonomy.pinnedIndustries;
      const cityCoordinates =
        key === "cities" && current.taxonomy.cityCoordinates[value] !== undefined
          ? Object.fromEntries(
              Object.entries(current.taxonomy.cityCoordinates).filter(
                ([city]) => city !== value,
              ),
            )
          : current.taxonomy.cityCoordinates;

      return {
        ...current,
        taxonomy: {
          ...current.taxonomy,
          [key]: current.taxonomy[key].filter((v) => v !== value),
          pinnedIndustries,
          cityCoordinates,
        },
        businessTypes,
      };
    });
  }, [applyEdit]);

  /** Reorder by one step. Only revenueBands needs it, but nothing breaks elsewhere. */
  const moveTaxonomyValue = useCallback(
    (key: TaxonomyKey, index: number, delta: number) => {
      applyEdit((current) => {
        const values = [...current.taxonomy[key]];
        const target = index + delta;
        if (index < 0 || index >= values.length) return current;
        if (target < 0 || target >= values.length) return current;
        const [moved] = values.splice(index, 1);
        values.splice(target, 0, moved as string);
        return { ...current, taxonomy: { ...current.taxonomy, [key]: values } };
      });
    },
    [applyEdit],
  );

  /**
   * Pinning is membership, not position. The industry is appended rather than
   * inserted anywhere in particular, because order INSIDE the leading tier is still
   * company count — this list decides who is in the tier and nothing else.
   */
  const setPinnedIndustry = useCallback((industry: string, pinned: boolean) => {
    applyEdit((current) => {
      const held = current.taxonomy.pinnedIndustries;
      // No-op guard, so toggling a checkbox back to where it was does not mark the
      // draft unsaved for an edit that changed nothing.
      if (pinned === held.includes(industry)) return current;
      return {
        ...current,
        taxonomy: {
          ...current.taxonomy,
          pinnedIndustries: pinned
            ? [...held, industry]
            : held.filter((v) => v !== industry),
        },
      };
    });
  }, [applyEdit]);

  /**
   * Clearing a coordinate DELETES the key rather than writing an empty value.
   *
   * "We do not know where this is" is the absence of an entry, and it has to stay
   * that way: `projectCity` reads this record as an overlay on the code's own table,
   * so an entry present but blank would shadow a city the code already knows and
   * take its dot off the map. There is also nothing to write — the bounds refuse a
   * zero pair and the schema has no null to put in one.
   */
  const setCityCoordinate = useCallback((city: string, coord: LatLon | null) => {
    applyEdit((current) => {
      const held = current.taxonomy.cityCoordinates;
      if (coord === null) {
        if (held[city] === undefined) return current;
        return {
          ...current,
          taxonomy: {
            ...current.taxonomy,
            cityCoordinates: Object.fromEntries(
              Object.entries(held).filter(([name]) => name !== city),
            ),
          },
        };
      }
      return {
        ...current,
        taxonomy: {
          ...current.taxonomy,
          cityCoordinates: { ...held, [city]: coord },
        },
      };
    });
  }, [applyEdit]);

  const revert = useCallback(
    (target: RevertTarget) => {
      applyEdit((current) =>
        revertEditable(current, editableOf(currentBaseline), target),
      );
    },
    [applyEdit, currentBaseline],
  );

  const discardDraft = useCallback(() => {
    setEditable(editableOf(currentBaseline));
    pinnedBaseline.current = currentBaseline.generatedAt;
    setConflict(null);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* nothing worth reporting */
    }
    setSaveState("idle");
  }, [currentBaseline]);

  const keepDraftAgainstNewBaseline = useCallback(() => {
    pinnedBaseline.current = currentBaseline.generatedAt;
    setConflict(null);
  }, [currentBaseline.generatedAt]);

  const markPublished = useCallback(
    (metadata: Pick<Dataset, "version" | "generatedAt" | "source">) => {
      setCurrentBaseline((current) => ({
        ...current,
        ...metadata,
        taxonomy: editable.taxonomy,
        companies: editable.companies,
        businessTypes: editable.businessTypes,
        metrics: editable.metrics,
        siteContent: editable.siteContent,
      }));
      pinnedBaseline.current = metadata.generatedAt;
      setConflict(null);
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* nothing worth reporting */
      }
      setSaveState("idle");
    },
    [editable],
  );

  const value = useMemo<DraftContextValue>(
    () => ({
      baseline: currentBaseline,
      draft,
      dirty,
      saveState,
      conflict,
      companyById: (id) => companyIndex.get(id),
      businessTypeById: (id) => editable.businessTypes.find((t) => t.id === id),
      addBusinessType,
      updateBusinessType,
      removeBusinessType,
      updateCloseCopy,
      addCompany,
      updateCompany,
      deleteCompany,
      metricById: (id) => metricIndex.get(id),
      replaceMetric,
      clearMetricValue,
      updateHeroCopy,
      addImpactStat,
      updateImpactStat,
      removeImpactStat,
      moveImpactStat,
      updatePublicCopy,
      setCommonFunctions,
      addLogo,
      updateLogo,
      removeLogo,
      moveLogo,
      setTaxonomyValues,
      addTaxonomyValue,
      renameTaxonomyValue,
      removeTaxonomyValue,
      moveTaxonomyValue,
      setPinnedIndustry,
      setCityCoordinate,
      revert,
      discardDraft,
      keepDraftAgainstNewBaseline,
      markPublished,
    }),
    [
      currentBaseline,
      draft,
      dirty,
      saveState,
      conflict,
      companyIndex,
      addCompany,
      updateCompany,
      deleteCompany,
      metricIndex,
      replaceMetric,
      clearMetricValue,
      updateHeroCopy,
      addImpactStat,
      updateImpactStat,
      removeImpactStat,
      moveImpactStat,
      updatePublicCopy,
      setCommonFunctions,
      addLogo,
      updateLogo,
      removeLogo,
      moveLogo,
      editable.businessTypes,
      addBusinessType,
      updateBusinessType,
      removeBusinessType,
      setTaxonomyValues,
      addTaxonomyValue,
      renameTaxonomyValue,
      removeTaxonomyValue,
      moveTaxonomyValue,
      setPinnedIndustry,
      setCityCoordinate,
      revert,
      discardDraft,
      keepDraftAgainstNewBaseline,
      markPublished,
    ],
  );

  return <DraftContext.Provider value={value}>{children}</DraftContext.Provider>;
}

export function useDraft(): DraftContextValue {
  const context = useContext(DraftContext);
  if (!context) {
    throw new Error("useDraft must be used inside a DraftProvider.");
  }
  return context;
}

/** Suggested id for a not-yet-added company, shown in the new-company form. */
export function previewSlug(name: string): string {
  return name.trim() ? slugify(name) : "";
}
