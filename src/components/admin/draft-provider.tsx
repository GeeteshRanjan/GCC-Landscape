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
import type { Company, Dataset, Metric, Taxonomy } from "@/data/schema";
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
 * Bumped to v2 when the function metrics joined the editable slice.
 *
 * Not cosmetic. A draft stored under v1 has no `metrics` key, and restoring it
 * would produce a draft whose catalogue is missing — which the publish gate
 * rejects with a schema error the admin has no way to fix from the UI. A new key
 * means those drafts are simply not found, which is the honest outcome: the key
 * was versioned for exactly this.
 */
const STORAGE_KEY = "gcc-admin-draft-v2";
const AUTOSAVE_DEBOUNCE_MS = 800;

/** Everything the admin can edit. Metadata is server-owned. */
type EditableDataset = Pick<Dataset, "taxonomy" | "companies" | "metrics">;

export type TaxonomyKey = keyof Taxonomy;

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

  setTaxonomyValues: (key: TaxonomyKey, values: string[]) => void;
  addTaxonomyValue: (key: TaxonomyKey, value: string) => void;
  renameTaxonomyValue: (key: TaxonomyKey, from: string, to: string) => void;
  removeTaxonomyValue: (key: TaxonomyKey, value: string) => void;
  moveTaxonomyValue: (key: TaxonomyKey, index: number, delta: number) => void;

  /** Throw the draft away and go back to what is published. */
  discardDraft: () => void;
  /** Keep the local draft but re-pin it to the current baseline. */
  keepDraftAgainstNewBaseline: () => void;
  /** Called after a successful publish: the draft is now the baseline. */
  markPublished: (metadata: Pick<Dataset, "version" | "generatedAt" | "source">) => void;
}

const DraftContext = createContext<DraftContextValue | null>(null);

function editableOf(dataset: Dataset): EditableDataset {
  return {
    taxonomy: dataset.taxonomy,
    companies: dataset.companies,
    metrics: dataset.metrics,
  };
}



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
      !stored.editable?.metrics
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
      metrics: editable.metrics,
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

        return {
          ...current,
          taxonomy: { ...current.taxonomy, [key]: deduped },
          companies,
        };
      });
    },
    [applyEdit],
  );

  const removeTaxonomyValue = useCallback((key: TaxonomyKey, value: string) => {
    applyEdit((current) => ({
      ...current,
      taxonomy: {
        ...current.taxonomy,
        [key]: current.taxonomy[key].filter((v) => v !== value),
      },
    }));
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
        metrics: editable.metrics,
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
      addCompany,
      updateCompany,
      deleteCompany,
      metricById: (id) => metricIndex.get(id),
      replaceMetric,
      clearMetricValue,
      setTaxonomyValues,
      addTaxonomyValue,
      renameTaxonomyValue,
      removeTaxonomyValue,
      moveTaxonomyValue,
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
      setTaxonomyValues,
      addTaxonomyValue,
      renameTaxonomyValue,
      removeTaxonomyValue,
      moveTaxonomyValue,
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
