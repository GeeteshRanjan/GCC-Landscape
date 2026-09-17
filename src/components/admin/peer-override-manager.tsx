"use client";

import { useMemo, useState } from "react";

import {
  ADMIN_CONTROL,
  ADMIN_TEXTAREA,
  AdminChip,
  AdminCount,
  AdminEmpty,
  AdminField,
  AdminRow,
  AdminRowActions,
  AdminRows,
} from "@/components/admin/controls";
import { AdminPageHeader, AdminSection } from "@/components/admin/page-header";
import {
  AdminSearch,
  NoSearchMatches,
  useAdminSearch,
  useDeepLinkOpen,
  useDeepLinkQuery,
} from "@/components/admin/search-box";
import { Button } from "@/components/ui/button";
import { HQ_COUNTRIES } from "@/data/countries";
import { fteDisplay } from "@/data/derive";
import { describePeerOverride } from "@/data/diff";
import {
  DEFAULT_PEER_LIMIT,
  matchPeerOverride,
  rankCandidates,
} from "@/data/peers";
import {
  PEER_OVERRIDE_MAX_COMPANIES,
  type Dataset,
  type PeerOverride,
} from "@/data/schema";
import { SIMILARITY_FLOOR } from "@/data/similarity";

import { useDraft } from "./draft-provider";

/**
 * Pinned peer sets: the one place an admin overrules the scoring engine.
 *
 * ## What the page is for
 *
 * The peer set is normally computed — industry, then IDF-weighted business similarity,
 * then revenue-band proximity, with a floor under it. That is right almost everywhere and
 * this page should stay almost empty. Where it is not right is where the data is thin: a
 * sub-industry with four eligible companies, a pair of obvious comparisons that happen to
 * score below the floor, a company ANSR would rather not put in front of one particular
 * kind of visitor. For those, an admin names the five companies and the engine steps
 * aside for that combination only.
 *
 * ## Three things make it usable rather than merely possible
 *
 * **The candidate list is the ENGINE'S OWN.** `rankCandidates` is the same function
 * `matchPeers` takes its answer from, so the list an admin picks from is in the order the
 * algorithm would have used, and the five it would have shown are marked. Without that,
 * pinning a set is guessing at what you are replacing. It also shows the companies the
 * floor REJECTED, which is the actual reason most people come here — those are invisible
 * on the public screen and are frequently the ones somebody wants back.
 *
 * **A combination that is already pinned says so, in the form and in the list.** The
 * check is `matchPeerOverride`, the engine's own lookup, so "already pinned" here means
 * exactly what it means to a visitor — including the case where a BROADER row already
 * covers the combination being typed, which a same-fields comparison would miss and which
 * is the confusing one.
 *
 * **Every combination is a PATTERN.** Leaving a field on "any" is how one row covers the
 * whole of Education. Precedence is by specificity, resolved in `matchPeerOverride`, and
 * the schema refuses two rows on the same combination — so what an admin sees here is
 * what a visitor gets, with no invisible tiebreak.
 *
 * ## What this page cannot do
 *
 * Reach outside the industry, pin nothing, or pin a company twice — all three are refused
 * by the schema rather than by this form, so a hand-edited `dataset.json` cannot smuggle
 * them past either. And the public screen never says a set was chosen by hand: there is
 * no honest sentence for it, so `overriddenBy` stops at the view-model boundary.
 */

const ANY = "";

interface Draftable {
  industry: string;
  businessTypeId: string;
  revenueBand: string;
  hqCountry: string;
  companyIds: string[];
  note: string;
}

const EMPTY: Draftable = {
  industry: "",
  businessTypeId: ANY,
  revenueBand: ANY,
  hqCountry: ANY,
  companyIds: [],
  note: "",
};

function toDraftable(override: PeerOverride): Draftable {
  return {
    industry: override.industry,
    businessTypeId: override.businessTypeId ?? ANY,
    revenueBand: override.revenueBand ?? ANY,
    hqCountry: override.hqCountry ?? ANY,
    companyIds: [...override.companyIds],
    note: override.note ?? "",
  };
}

/**
 * The form's empty string means "any", and the stored field is ABSENT rather than empty.
 *
 * Not cosmetic. `sameValue` in `diff.ts` compares through `JSON.stringify`, where `""`
 * and `undefined` are different — so a form that emitted `""` for an untouched wildcard
 * would report every override as changed on every publish, which is the exact defect
 * `company.domain` is `.optional()` rather than `.default("")` to avoid.
 */
function fromDraftable(form: Draftable): Omit<PeerOverride, "id"> {
  return {
    industry: form.industry,
    businessTypeId: form.businessTypeId || undefined,
    revenueBand: form.revenueBand || undefined,
    hqCountry: form.hqCountry || undefined,
    companyIds: [...form.companyIds],
    note: form.note.trim() || undefined,
  };
}

export function PeerOverrideManager() {
  const { draft, addPeerOverride, replacePeerOverride, removePeerOverride } = useDraft();
  const search = useAdminSearch();
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  useDeepLinkQuery(search.setQuery);
  useDeepLinkOpen(setEditing);

  const companyNames = useMemo(
    () => new Map(draft.companies.map((company) => [company.id, company.name])),
    [draft.companies],
  );
  const typeNames = useMemo(
    () => new Map(draft.businessTypes.map((type) => [type.id, type.name])),
    [draft.businessTypes],
  );

  /**
   * The query reaches the combination AND the pinned company names, which is the search
   * an admin actually arrives with: "is Lowe's pinned anywhere" is the audit that is
   * otherwise every row read by eye.
   */
  const visible = useMemo(() => {
    const rows = draft.peerOverrides.filter((override) =>
      search.matches(
        override.industry,
        override.businessTypeId ? typeNames.get(override.businessTypeId) : undefined,
        override.businessTypeId,
        override.revenueBand,
        override.hqCountry,
        override.note,
        override.companyIds.map((id) => companyNames.get(id) ?? id),
      ),
    );
    return [...rows].sort(
      (a, b) =>
        a.industry.localeCompare(b.industry) ||
        describePeerOverride(a).localeCompare(describePeerOverride(b)),
    );
    // `search.matches` is stable per query; the query is what changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.peerOverrides, search.matches, companyNames, typeNames]);

  const none = draft.peerOverrides.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Pinned peer sets"
        lead="Name the comparable companies yourself, for one combination of answers. Everything not pinned keeps using the scoring engine."
      >
        <Button
          onClick={() => {
            setEditing(null);
            setAdding(true);
          }}
        >
          Pin a peer set
        </Button>
      </AdminPageHeader>

      {none && !adding ? (
        <AdminEmpty
          title="Nothing is pinned, and that is the healthy state."
          lead="The engine scores every company in the visitor's industry and shows the five closest. Pin a set only where that answer is wrong — a thin sub-industry, a company the similarity floor keeps out, or one you would rather not show."
        >
          <Button onClick={() => setAdding(true)}>Pin a peer set</Button>
        </AdminEmpty>
      ) : null}

      {adding ? (
        <OverrideForm
          draft={draft}
          initial={EMPTY}
          onCancel={() => setAdding(false)}
          onSave={(next) => {
            addPeerOverride(next);
            setAdding(false);
          }}
        />
      ) : null}

      {!none ? (
        <>
          <AdminSearch
            placeholder="Education, Lowe's, ret-sportswear"
            hint="Searches the combination, the note and the names of the pinned companies."
            value={search.query}
            onChange={search.setQuery}
          />

          <AdminCount note="A pinned set replaces the engine's answer for exactly the answers it names.">
            {visible.length} pinned{" "}
            {visible.length === 1 ? "peer set" : "peer sets"}.
          </AdminCount>

          {visible.length === 0 && search.searching ? (
            <NoSearchMatches
              query={search.query}
              what="pinned peer sets"
              hint="Try the industry, or a company you expect to be pinned."
            />
          ) : null}

          {visible.length > 0 ? (
            <AdminSection
              id="pinned-peer-sets"
              title="Pinned combinations"
              meta={
                <span className="text-xs text-text-muted">
                  most specific wins
                </span>
              }
              description="A field reading “any” matches every answer. Where two rows both fit, the one naming more fields is used."
            >
              <AdminRows>
                {visible.map((override) => (
                  <AdminRow key={override.id} className="flex-col items-stretch">
                    {editing === override.id ? (
                      <OverrideForm
                        draft={draft}
                        initial={toDraftable(override)}
                        editingId={override.id}
                        onCancel={() => setEditing(null)}
                        onSave={(next) => {
                          replacePeerOverride(override.id, next);
                          setEditing(null);
                        }}
                      />
                    ) : (
                      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                        <div className="min-w-0">
                          <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-text">
                            <span>{override.industry}</span>
                            <Facet
                              value={
                                override.businessTypeId
                                  ? (typeNames.get(override.businessTypeId) ??
                                    override.businessTypeId)
                                  : null
                              }
                              any="any sub-industry"
                            />
                            <Facet
                              value={
                                override.revenueBand
                                  ? override.revenueBand
                                  : null
                              }
                              any="any revenue band"
                            />
                            <Facet value={override.hqCountry ?? null} any="any HQ" />
                          </p>
                          <p className="mt-1 text-xs text-text-muted">
                            {override.companyIds
                              .map((id) => companyNames.get(id) ?? id)
                              .join(" → ")}
                          </p>
                          {override.note ? (
                            <p className="mt-1 max-w-measure text-xs text-text-muted italic">
                              {override.note}
                            </p>
                          ) : null}
                        </div>
                        <AdminRowActions>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setAdding(false);
                              setEditing(override.id);
                            }}
                          >
                            Edit {describePeerOverride(override)}
                          </Button>
                          <button
                            type="button"
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Unpin ${describePeerOverride(override)}? The scoring engine will answer this combination again.`,
                                )
                              ) {
                                removePeerOverride(override.id);
                              }
                            }}
                            className="ansr-destructive h-9 rounded-md px-3 text-sm"
                          >
                            Unpin
                          </button>
                        </AdminRowActions>
                      </div>
                    )}
                  </AdminRow>
                ))}
              </AdminRows>
            </AdminSection>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

/**
 * One facet of the combination: the value, or the wildcard as a quiet chip.
 *
 * A wildcard has to be DRAWN rather than left as a gap. The difference between "this row
 * covers one revenue band" and "this row covers all seven" is the entire meaning of the
 * row, and an absence cannot carry it — the same reason `describePeerOverride` spells the
 * wildcards out for the publish diff.
 */
function Facet({ value, any }: { value: string | null; any: string }) {
  if (value === null) {
    return <AdminChip>{any}</AdminChip>;
  }
  return <AdminChip tone="strong">{value}</AdminChip>;
}

function OverrideForm({
  draft,
  initial,
  editingId,
  onCancel,
  onSave,
}: {
  draft: Dataset;
  initial: Draftable;
  /** Set when editing, so the row being edited is not reported as a clash with itself. */
  editingId?: string;
  onCancel: () => void;
  onSave: (next: Omit<PeerOverride, "id">) => void;
}) {
  const [form, setForm] = useState<Draftable>(initial);
  const [error, setError] = useState<string | null>(null);
  const candidateSearch = useAdminSearch();

  const patch = (next: Partial<Draftable>) =>
    setForm((current) => ({ ...current, ...next }));

  /** The sub-industries that exist under the chosen industry. */
  const subIndustries = useMemo(
    () =>
      draft.businessTypes
        .filter((type) => type.industry === form.industry)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [draft.businessTypes, form.industry],
  );

  /**
   * The engine's own answer for the combination being typed.
   *
   * Recomputed on every facet change, which is what makes the picker below a preview
   * rather than a list: changing the revenue band re-scores everything and moves the five
   * the algorithm would show, and an admin needs to see that before deciding to overrule
   * it. It is `rankCandidates`, the same function `matchPeers` reads — so this cannot
   * drift from what a visitor gets.
   */
  const ranking = useMemo(() => {
    if (!form.industry) return null;
    return rankCandidates(draft, {
      industry: form.industry,
      // The band is a scoring input, so a wildcard combination has no band to score
      // against and every company lands on the same band proximity. The list is still
      // correctly ordered by business similarity, which is the signal that matters here.
      revenueBand: form.revenueBand,
      hqCountry: form.hqCountry || undefined,
      businessTypeId: form.businessTypeId || undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, form.industry, form.revenueBand, form.hqCountry, form.businessTypeId]);

  /** What the engine would show, so the admin can see what they are replacing. */
  const engineIds = useMemo(
    () =>
      new Set(
        (ranking?.eligible ?? [])
          .slice(0, DEFAULT_PEER_LIMIT)
          .map((entry) => entry.company.id),
      ),
    [ranking],
  );

  const eligibleIds = useMemo(
    () => new Set((ranking?.eligible ?? []).map((entry) => entry.company.id)),
    [ranking],
  );

  /**
   * Two different questions, and collapsing them into one was a bug.
   *
   * **`covering` is the CUE and `exact` is the REFUSAL.** The first is
   * `matchPeerOverride` — the engine's own lookup — so it answers "does anything already
   * govern these answers", which catches the case a field comparison cannot: a broad row
   * an admin has forgotten. Pinning `Retail · sportswear · any band` when
   * `Retail · any · any` exists is not a duplicate, and yet the new row silently takes
   * precedence over the old one for a slice of its visitors, which is worth being told.
   *
   * The second is an exact same-combination match, and it is the only thing that may
   * block a save — because it is the only thing the schema refuses. Refusing on
   * `covering` instead meant a legitimate NARROWING could not be saved at all: the broad
   * row still covers the combination until the narrow one exists, so the check was
   * permanently true and the feature's main use was unreachable.
   */
  const covering = useMemo(() => {
    if (!form.industry) return null;
    const found = matchPeerOverride(draft, {
      industry: form.industry,
      revenueBand: form.revenueBand,
      hqCountry: form.hqCountry || undefined,
      businessTypeId: form.businessTypeId || undefined,
    });
    if (!found || found.id === editingId) return null;
    return found;
  }, [draft, form, editingId]);

  const exact = useMemo(() => {
    if (!form.industry) return null;
    const wanted = fromDraftable(form);
    return (
      draft.peerOverrides.find(
        (row) =>
          row.id !== editingId &&
          row.industry === wanted.industry &&
          row.businessTypeId === wanted.businessTypeId &&
          row.revenueBand === wanted.revenueBand &&
          row.hqCountry === wanted.hqCountry,
      ) ?? null
    );
  }, [draft.peerOverrides, form, editingId]);

  const candidates = useMemo(() => {
    if (!ranking) return [];
    return ranking.ranked.filter((entry) =>
      candidateSearch.matches(entry.company.name, entry.company.revenueBand),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ranking, candidateSearch.matches]);

  function toggle(id: string) {
    setForm((current) => {
      if (current.companyIds.includes(id)) {
        return {
          ...current,
          companyIds: current.companyIds.filter((c) => c !== id),
        };
      }
      if (current.companyIds.length >= PEER_OVERRIDE_MAX_COMPANIES) return current;
      // Appended, so the order of PICKING is the order of drawing. There is no ordinal on
      // a peer card, so left-to-right position is the only statement of ranking — which
      // makes it the admin's to set, and Move up / Move down below is how it is set.
      return { ...current, companyIds: [...current.companyIds, id] };
    });
  }

  function move(index: number, delta: number) {
    setForm((current) => {
      const next = [...current.companyIds];
      const target = index + delta;
      const here = next[index];
      const there = next[target];
      // Read out and checked rather than destructure-swapped: `noUncheckedIndexedAccess`
      // types both as possibly undefined, and a swap that silently wrote one in would be
      // a hole in the list rather than a reorder.
      if (target < 0 || target >= next.length || here === undefined || there === undefined) {
        return current;
      }
      next[index] = there;
      next[target] = here;
      return { ...current, companyIds: next };
    });
  }

  function save() {
    if (!form.industry) return setError("Choose an industry.");
    if (form.companyIds.length === 0) {
      return setError(
        "Pick at least one company. A pinned set of nothing is indistinguishable from a row somebody abandoned, so it is refused rather than shown as an empty comparison grid.",
      );
    }
    // Only an EXACT duplicate blocks. A broader row that already covers this combination
    // is legal — precedence is defined by specificity — and the cue above is where the
    // admin is told about it.
    if (exact) {
      return setError(
        `${describePeerOverride(exact)} already covers this exact combination. Edit that row instead, or narrow this one — two rows on one combination would make which set a visitor sees depend on invisible ordering, so the publish gate refuses it.`,
      );
    }
    setError(null);
    onSave(fromDraftable(form));
  }

  return (
    <div className="flex flex-col gap-5">
      <AdminSection
        id={`override-combination-${editingId ?? "new"}`}
        title="Which answers this applies to"
        description="Industry is required. Leave the rest on “any” to cover every answer for that field."
        padded
      >
        <div className="grid gap-4 md:grid-cols-2">
          <AdminField
            label="Industry"
            hint="The hard boundary. Peer matching never leaves it, so a pinned company must be in it too."
          >
            <select
              value={form.industry}
              onChange={(event) =>
                // Changing the industry invalidates both the sub-industry and every
                // pinned company, so both are cleared rather than left to fail the
                // schema at publish — the same cascade the visitor's own dropdown does.
                patch({
                  industry: event.target.value,
                  businessTypeId: ANY,
                  companyIds: [],
                })
              }
              className={ADMIN_CONTROL}
            >
              <option value="">Choose an industry</option>
              {draft.taxonomy.industries.map((industry) => (
                <option key={industry} value={industry}>
                  {industry}
                </option>
              ))}
            </select>
          </AdminField>

          <AdminField
            label="Sub-industry"
            hint={
              form.industry
                ? `${subIndustries.length} in ${form.industry}. “Any” also covers a visitor who chose no sub-industry.`
                : "Choose an industry first."
            }
          >
            <select
              value={form.businessTypeId}
              disabled={!form.industry}
              onChange={(event) => patch({ businessTypeId: event.target.value })}
              className={ADMIN_CONTROL}
            >
              <option value={ANY}>Any sub-industry</option>
              {subIndustries.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </AdminField>

          <AdminField
            label="Revenue band"
            hint="The stored string, in the taxonomy's own order — which is what “adjacent band” means to the engine. A visitor reads it through `formatRevenueBand`; admin edits the datum."
          >
            <select
              value={form.revenueBand}
              onChange={(event) => patch({ revenueBand: event.target.value })}
              className={ADMIN_CONTROL}
            >
              <option value={ANY}>Any revenue band</option>
              {draft.taxonomy.revenueBands.map((band) => (
                <option key={band} value={band}>
                  {band}
                </option>
              ))}
            </select>
          </AdminField>

          <AdminField
            label="HQ location"
            hint="Every country a visitor can pick, not only the ones with companies in the data."
          >
            <select
              value={form.hqCountry}
              onChange={(event) => patch({ hqCountry: event.target.value })}
              className={ADMIN_CONTROL}
            >
              <option value={ANY}>Any HQ location</option>
              {[...new Set([...draft.taxonomy.hqCountries, ...HQ_COUNTRIES])]
                .sort((a, b) => a.localeCompare(b))
                .map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
            </select>
          </AdminField>
        </div>

        {covering ? (
          /* The visual cue for "already set", in the place it is actionable: while the
             combination is being typed, not after saving. `role=status` rather than
             `alert` — it is a finding about the draft, and only the exact-duplicate case
             becomes a real error on save.

             **Two wordings, because the two cases need different actions.** An exact
             duplicate has to be merged; a broader row means this one will take over for a
             slice of its visitors, which is usually the intent and always worth stating. */
          <p
            role="status"
            className="mt-4 rounded-md border border-border-strong bg-surface-subtle px-3 py-2 text-sm text-text"
          >
            {exact ? (
              <>
                <span className="font-semibold">
                  This exact combination is already pinned.
                </span>{" "}
                {describePeerOverride(exact)} covers it, with{" "}
                {exact.companyIds.length}{" "}
                {exact.companyIds.length === 1 ? "company" : "companies"}. Edit that row
                instead.
              </>
            ) : (
              <>
                <span className="font-semibold">
                  A broader pinned set already covers this.
                </span>{" "}
                {describePeerOverride(covering)} governs these answers today. Saving this
                narrower row takes precedence over it for the visitors it names, and
                leaves the broader one in place for everyone else.
              </>
            )}
          </p>
        ) : null}

        <div className="mt-4">
          <AdminField
            label="Note"
            hint="Why this set was chosen. Admin-only, read by nothing on the public screens — and the only alternative to git archaeology, because a pinned set looks exactly like the engine's own answer."
          >
            <textarea
              value={form.note}
              rows={2}
              maxLength={280}
              onChange={(event) => patch({ note: event.target.value })}
              className={ADMIN_TEXTAREA}
              placeholder="Only four companies clear the floor here, and two of them are subsidiaries of the same group."
            />
          </AdminField>
        </div>
      </AdminSection>

      {form.industry ? (
        <AdminSection
          id={`override-picked-${editingId ?? "new"}`}
          title="The peer set, in order"
          meta={
            <span className="text-xs text-text-muted">
              {form.companyIds.length} of {PEER_OVERRIDE_MAX_COMPANIES}
            </span>
          }
          description="Left to right is the order the cards are drawn in. There is no numeral on a peer card, so position is the only statement of ranking."
          padded
        >
          {form.companyIds.length === 0 ? (
            <p className="text-sm text-text-muted">
              Nothing picked yet. Choose from the candidates below.
            </p>
          ) : (
            <ol className="flex flex-col gap-2">
              {form.companyIds.map((id, index) => {
                const company = draft.companies.find((c) => c.id === id);
                return (
                  <li
                    key={id}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-border-subtle bg-surface-subtle px-3 py-2"
                  >
                    <span className="text-sm font-medium text-text">
                      {index + 1}. {company?.name ?? id}
                    </span>
                    {company ? (
                      <span className="text-xs text-text-muted">
                        {company.revenueBand} ·{" "}
                        {fteDisplay(company.fte)}
                      </span>
                    ) : null}
                    <span className="ms-auto flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={index === 0}
                        onClick={() => move(index, -1)}
                      >
                        Move {company?.name ?? id} up
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={index === form.companyIds.length - 1}
                        onClick={() => move(index, 1)}
                      >
                        Move {company?.name ?? id} down
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggle(id)}
                      >
                        Remove {company?.name ?? id}
                      </Button>
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </AdminSection>
      ) : null}

      {ranking ? (
        <AdminSection
          id={`override-candidates-${editingId ?? "new"}`}
          title={`Every ${form.industry} company, as the engine ranks them`}
          meta={
            <span className="text-xs text-text-muted">
              {ranking.pool.length} in the industry, {ranking.eligible.length} above the
              floor
            </span>
          }
          description={
            ranking.visitorTagCount === 0
              ? "No sub-industry named, so there is no business similarity to score and the order is revenue-band proximity alone — which is what a visitor who skips the sub-industry gets."
              : `Ordered by the same score a visitor's peer set is. The similarity floor is ${SIMILARITY_FLOOR}; companies under it never appear on the public screen, which is usually why somebody is on this page.`
          }
          padded
        >
          <div className="flex flex-col gap-3">
            {/*
              **"Find a company" and it must never contain the word "Search".** The list
              above carries a control labelled `Search`, and `getByLabel` matches on
              SUBSTRING — so a second control whose name contained it would make both
              unaddressable by name, to a spec and to a screen reader alike. Same trap the
              global search trigger records, and the same fix.
            */}
            <AdminSearch
              label="Find a company"
              placeholder="Lowe's, Above $20 Bn"
              value={candidateSearch.query}
              onChange={candidateSearch.setQuery}
            />
            <ul className="max-h-96 divide-y divide-border-subtle overflow-y-auto rounded-md border border-border-subtle">
              {candidates.map((entry) => {
                const picked = form.companyIds.includes(entry.company.id);
                const full =
                  !picked && form.companyIds.length >= PEER_OVERRIDE_MAX_COMPANIES;
                return (
                  <li
                    key={entry.company.id}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2"
                  >
                    <label className="flex min-w-0 flex-1 items-center gap-2">
                      <input
                        type="checkbox"
                        checked={picked}
                        disabled={full}
                        onChange={() => toggle(entry.company.id)}
                        className="size-4 shrink-0 accent-[var(--ansr-accent)]"
                      />
                      <span className="min-w-0 text-sm text-text">
                        {entry.company.name}
                      </span>
                    </label>
                    <span className="flex flex-wrap items-center gap-1.5">
                      {/* The two states an admin is here to see. "Engine shows" is what
                          is being replaced; "below the floor" is the company that cannot
                          appear without a pin, which is the commonest reason to pin. */}
                      {engineIds.has(entry.company.id) ? (
                        <AdminChip tone="strong">engine shows</AdminChip>
                      ) : null}
                      {!eligibleIds.has(entry.company.id) ? (
                        <AdminChip title={`Similarity ${entry.businessSimilarity.toFixed(2)}, under the ${SIMILARITY_FLOOR} floor`}>
                          below the floor
                        </AdminChip>
                      ) : null}
                      <span className="text-xs text-text-muted">
                        {entry.company.revenueBand} ·{" "}
                        {fteDisplay(entry.company.fte)} · {entry.company.hqCountry}
                      </span>
                    </span>
                  </li>
                );
              })}
              {candidates.length === 0 ? (
                <li className="px-3 py-6 text-center text-sm text-text-muted">
                  No candidates match that search.
                </li>
              ) : null}
            </ul>
          </div>
        </AdminSection>
      ) : null}

      {error ? (
        <p role="alert" className="ansr-field-error text-sm">
          {error}
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button onClick={save}>
          {editingId ? "Save to draft" : "Add to draft"}
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
