"use client";

import { useMemo, useState } from "react";

import {
  ADMIN_CONTROL,
  AdminChip,
  AdminCount,
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
import {
  BUSINESS_TAG_AXES,
  BUSINESS_TAG_MAX_LENGTH,
  isBusinessTag,
  normaliseTagInput,
} from "@/data/business-tags";
import type { BusinessType } from "@/data/schema";
import { slugify } from "@/data/normalize";

import { useDraft } from "./draft-provider";

/**
 * The business-type catalogue: what a visitor picks on Screen 1, and what a company
 * is assigned.
 *
 * **The TAG VOCABULARY is editable here now too, which reverses the split this file was
 * written under.** It used to be business types editable and tags fixed in code, because
 * a tag nobody else carries matches nothing. The real objection was sharper than that and
 * is now handled properly: IDF is unbounded, so a tag on one type arrives at roughly a
 * hundred times a common one and swamps the visitor's own denominator — measured cutting
 * the eligible population 20% on average and 95% at worst. `capCustomTagWeights` in
 * `similarity.ts` holds a tag outside the authored vocabulary to the sharpest AUTHORED
 * weight in the same industry, so the expressiveness is available and the engine cannot
 * be blown up by it. The authored 138 keep their exact weights, so nothing that ships
 * today moves.
 *
 * Three things about editing here are worth knowing before you do it:
 *
 *  - **A tag change re-scores an industry.** Adding `luxury` to "Apparel & Footwear
 *    Brand" changes which five companies a visitor from Nike sees, with no company row
 *    touched. The publish diff reports it as a real change for exactly that reason.
 *  - **A tag on only one type is the MAXIMUM-weight case, not a no-op.** This file used
 *    to say the opposite, in a docblock and in a hint under the picker, and both were
 *    backwards: a rare tag is the most discriminating thing in the pool, which is why
 *    the cap exists. The nudge in the form says so now.
 *  - **A tag is a matching KEY, compared by equality.** So it is a slug: `Quick
 *    Commerce`, `quick commerce` and `quick-commerce` would otherwise be three tags
 *    sharing nothing, which is how a vocabulary rots back into 620 values of one member.
 */

export function BusinessTypeManager() {
  const { draft, addBusinessType, updateBusinessType, removeBusinessType } = useDraft();
  const search = useAdminSearch();
  const [industryFilter, setIndustryFilter] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  // Arriving from the universal search. `open` is a business-type id, which is what
  // the editing state holds. The industry filter is deliberately NOT set from the
  // link: the query alone reaches the row, and a filter the admin did not choose is
  // the thing that later looks like a broken search.
  useDeepLinkQuery(search.setQuery);
  useDeepLinkOpen(setEditing);

  /** How many companies carry each type, and how many types carry each tag. */
  const usage = useMemo(() => {
    const byType = new Map<string, number>();
    for (const company of draft.companies) {
      for (const id of company.businessTypes) {
        byType.set(id, (byType.get(id) ?? 0) + 1);
      }
    }
    const byTag = new Map<string, number>();
    for (const type of draft.businessTypes) {
      for (const tag of type.tags) byTag.set(tag, (byTag.get(tag) ?? 0) + 1);
    }
    return { byType, byTag };
  }, [draft.companies, draft.businessTypes]);

  /**
   * Every tag in the draft that is NOT in the authored vocabulary.
   *
   * Collected here and handed to the form so an admin's addition is reusable across types
   * — a custom tag that only ever appeared on the type it was typed into would be the
   * one-carrier case by construction, which is exactly what the cap exists to contain and
   * not what anybody wants.
   */
  const customTags = useMemo(
    () =>
      [...usage.byTag.keys()].filter((tag) => !isBusinessTag(tag)).sort(),
    [usage.byTag],
  );

  /**
   * Which sub-industries have a pinned peer set, so a tag edit here can be read against
   * the fact that it will not reach that combination.
   *
   * The cue that would otherwise be missing: an admin retagging a type to fix a bad peer
   * set has no way to know the set is pinned and the retag will change nothing a visitor
   * sees. That is a silent no-op on a deliberate edit, which is the class of failure this
   * repo spends most of its comments on.
   */
  const pinned = useMemo(() => {
    const byType = new Map<string, number>();
    for (const override of draft.peerOverrides) {
      if (!override.businessTypeId) continue;
      byType.set(
        override.businessTypeId,
        (byType.get(override.businessTypeId) ?? 0) + 1,
      );
    }
    return byType;
  }, [draft.peerOverrides]);

  /**
   * Filtered by industry, then by the query, then sorted.
   *
   * **The query reaches the TAGS as well as the name**, which is the thing the
   * industry select cannot do and the reason a text search earns its place on a page
   * that already had a filter. Tags are the similarity substrate, so the question an
   * admin actually arrives with is "which types carry `luxury`?" — an audit that
   * spans industries and was previously 164 rows read by eye. The id is in scope too,
   * because a tag check script and `business-type-map.ts` both name types by id, so
   * an id is what an admin is holding when they come here from a terminal.
   */
  const visible = useMemo(() => {
    const types = draft.businessTypes.filter((type) => {
      if (industryFilter && type.industry !== industryFilter) return false;
      return search.matches(type.name, type.id, type.tags);
    });
    return [...types].sort(
      (a, b) => a.industry.localeCompare(b.industry) || a.name.localeCompare(b.name),
    );
    // `search.matches` is stable per query; the query is what changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.businessTypes, industryFilter, search.matches]);

  return (
    <div className="flex flex-col gap-6">
      {/* The `h1` stays "Business types" — it names the DATA, and it is what the
          business-types spec locates this page by. The nav says "Sub-industries",
          which is the word a visitor reads. */}
      <AdminPageHeader
        title="Business types"
        lead="What a visitor picks as their sub-industry, and what drives peer similarity."
      >
        <Button onClick={() => setAdding(true)}>Add a business type</Button>
      </AdminPageHeader>

      {/* The industry select sits INSIDE the search row rather than beside it: the
          two narrow the same list, and a filter an admin has forgotten they set is
          the commonest cause of "the search is broken". One Clear resets both. */}
      <AdminSearch
        placeholder="Payments, luxury, sw-ai-platform"
        hint="Searches the name, the id and the tags. A tag search spans every industry."
        value={search.query}
        onChange={search.setQuery}
        onClear={() => setIndustryFilter("")}
      >
        {/* "Filter by industry", not "Industry": the edit form below has its own
            Industry select, and two controls with the same accessible name make
            both unaddressable by name. */}
        <AdminField label="Filter by industry" className="w-64">
          <select
            value={industryFilter}
            onChange={(event) => setIndustryFilter(event.target.value)}
            className={ADMIN_CONTROL}
          >
            <option value="">Every industry ({draft.businessTypes.length})</option>
            {draft.taxonomy.industries.map((industry) => (
              <option key={industry} value={industry}>
                {industry}
              </option>
            ))}
          </select>
        </AdminField>
      </AdminSearch>

      <AdminCount note="Editing tags re-scores every peer set in that industry.">
        {visible.length} business {visible.length === 1 ? "type" : "types"}.
      </AdminCount>

      {visible.length === 0 && search.searching ? (
        <NoSearchMatches
          query={search.query}
          what="business types"
          hint="Try a shorter word, or clear the industry filter."
        />
      ) : null}

      {adding ? (
        <AdminSection
          id="add-business-type"
          title="New business type"
          padded
        >
          <BusinessTypeForm
            industries={draft.taxonomy.industries}
            existingIds={draft.businessTypes.map((type) => type.id)}
            customTags={customTags}
            tagUsage={usage.byTag}
            onCancel={() => setAdding(false)}
            onSave={(type) => {
              addBusinessType(type);
              setAdding(false);
            }}
          />
        </AdminSection>
      ) : null}

      {visible.length > 0 ? (
        <AdminSection
          id="business-type-catalogue"
          title="Catalogue"
          meta={
            <span className="text-xs text-text-muted">
              {industryFilter || "every industry"}
            </span>
          }
        >
          <AdminRows>
            {visible.map((type) => {
              const companies = usage.byType.get(type.id) ?? 0;
              const isEditing = editing === type.id;
              const pins = pinned.get(type.id) ?? 0;
              return (
                <AdminRow key={type.id} className="flex-col items-stretch">
                  {isEditing ? (
                    <BusinessTypeForm
                      industries={draft.taxonomy.industries}
                      existingIds={draft.businessTypes.map((t) => t.id)}
                      initial={type}
                      customTags={customTags}
                      tagUsage={usage.byTag}
                      onCancel={() => setEditing(null)}
                      onSave={(next) => {
                        updateBusinessType(type.id, {
                          name: next.name,
                          industry: next.industry,
                          tags: next.tags,
                        });
                        setEditing(null);
                      }}
                    />
                  ) : (
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                        <div className="min-w-0">
                          <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-text">
                            {type.name}
                            {/* The cue a retag needs: this sub-industry's peer set is
                                pinned, so editing tags will not change what those
                                visitors see. */}
                            {pins > 0 ? (
                              <AdminChip
                                tone="strong"
                                title="A pinned peer set covers this sub-industry, so a tag edit will not change the peers those visitors see."
                              >
                                {pins === 1
                                  ? "peer set pinned"
                                  : `${pins} peer sets pinned`}
                              </AdminChip>
                            ) : null}
                          </p>
                          <p className="text-xs text-text-muted">
                            {type.industry} · {type.id} ·{" "}
                            {companies === 0
                              ? "no companies"
                              : `${companies} ${companies === 1 ? "company" : "companies"}`}
                          </p>
                        </div>
                        <AdminRowActions>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditing(type.id)}
                          >
                            Edit {type.name} ({type.industry})
                          </Button>
                          <button
                            type="button"
                            onClick={() => {
                              const message =
                                companies > 0
                                  ? `Remove ${type.name}? ${companies} ${companies === 1 ? "company" : "companies"} will fall back to industry-level matching.`
                                  : `Remove ${type.name}?`;
                              if (window.confirm(message)) removeBusinessType(type.id);
                            }}
                            className="ansr-destructive h-9 rounded-md px-3 text-sm"
                          >
                            Remove
                          </button>
                        </AdminRowActions>
                      </div>
                      {/* Tags as chips rather than as one interpuncted string. Sixteen
                          tags joined by middots is a line a reader has to parse before
                          they can find one; a chip per tag is scannable, and the custom
                          ones are distinguishable, which the string could not show. */}
                      <p className="flex flex-wrap gap-1">
                        {type.tags.map((tag) => (
                          <AdminChip
                            key={tag}
                            tone={isBusinessTag(tag) ? "quiet" : "strong"}
                            title={
                              isBusinessTag(tag)
                                ? undefined
                                : "Added in admin — its weight is capped at the sharpest authored tag in this industry."
                            }
                          >
                            {tag}
                          </AdminChip>
                        ))}
                      </p>
                    </div>
                  )}
                </AdminRow>
              );
            })}
          </AdminRows>
        </AdminSection>
      ) : null}
    </div>
  );
}

function BusinessTypeForm({
  industries,
  existingIds,
  initial,
  customTags,
  tagUsage,
  onCancel,
  onSave,
}: {
  industries: readonly string[];
  existingIds: readonly string[];
  initial?: BusinessType;
  /** Tags added in admin elsewhere in the draft, so they are reusable here. */
  customTags: readonly string[];
  tagUsage: Map<string, number>;
  onCancel: () => void;
  onSave: (type: BusinessType) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [industry, setIndustry] = useState(initial?.industry ?? "");
  const [tags, setTags] = useState<string[]>([...(initial?.tags ?? [])]);
  const [newTag, setNewTag] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isNew = initial === undefined;
  const id = isNew ? slugify(name) : initial.id;

  /**
   * Custom tags from elsewhere in the draft, plus any typed into THIS form.
   *
   * Both, because a tag added here is not in the draft until Save — so a picker reading
   * the draft alone would show the admin's own new tag vanishing the moment they added
   * it, which reads as the addition having failed.
   */
  const customOptions = useMemo(
    () =>
      [...new Set([...customTags, ...tags.filter((tag) => !isBusinessTag(tag))])].sort(),
    [customTags, tags],
  );

  /** What `newTag` will actually become, shown before it is added. */
  const pendingTag = normaliseTagInput(newTag);
  const pendingProblem = (() => {
    if (!pendingTag) return null;
    if (tags.includes(pendingTag)) return "already on this type";
    if (pendingTag.length < 2) return "too short";
    if (pendingTag.length > BUSINESS_TAG_MAX_LENGTH) return "too long";
    return null;
  })();

  function toggle(tag: string) {
    setTags((current) =>
      current.includes(tag)
        ? current.filter((t) => t !== tag)
        : [...current, tag],
    );
  }

  function addTag() {
    if (!pendingTag || pendingProblem) return;
    setTags((current) => [...current, pendingTag]);
    setNewTag("");
  }

  function save() {
    if (!name.trim()) return setError("Name is required.");
    if (!industry) return setError("Choose an industry.");
    if (tags.length < 2) {
      return setError(
        "Pick at least two tags — similarity needs something to share, and a one-tag type would match either everything in its industry or nothing.",
      );
    }
    if (isNew && (!id || existingIds.includes(id))) {
      return setError(
        !id ? "That name produces no usable id." : `The id "${id}" is already taken.`,
      );
    }
    setError(null);
    onSave({ id, name: name.trim(), industry, tags });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <AdminField
          label="Name"
          hint={isNew ? `Id will be "${id || "—"}"` : `Id stays "${id}"`}
        >
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={ADMIN_CONTROL}
            placeholder="Quick commerce"
          />
        </AdminField>
        {/* Distinct from the list's "Filter by industry" above. Two selects whose
            accessible names both start "Industry" cannot be told apart by name. */}
        <AdminField
          label="Belongs to industry"
          hint="Only companies in this industry can carry this type."
        >
          <select
            value={industry}
            onChange={(event) => setIndustry(event.target.value)}
            className={ADMIN_CONTROL}
          >
            <option value="">Choose an industry</option>
            {industries.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </AdminField>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-medium text-text">
          Tags ({tags.length} selected)
        </legend>
        {/*
          **The hint used to say a one-carrier tag "has no effect at all", and that was
          backwards.** IDF makes a rare tag the MOST influential thing in the pool, which
          is the whole reason the vocabulary was closed and the whole reason the cap now
          exists. Saying the opposite invited exactly the edit the cap has to absorb.
        */}
        <p className="text-xs text-text-muted">
          The similarity signal. Weighting is automatic and it runs the other way from
          intuition: a tag most of the industry carries counts for almost nothing, a rare
          one counts for a great deal. So pick what is true rather than what sounds
          distinctive. The count beside each tag is how many types already carry it.
        </p>
        {BUSINESS_TAG_AXES.map((axis) => (
          <div key={axis.axis} className="flex flex-col gap-1">
            <p className="text-xs font-medium text-text">
              {axis.axis} — {axis.hint}
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {axis.tags.map((tag) => (
                <TagCheckbox
                  key={tag}
                  tag={tag}
                  checked={tags.includes(tag)}
                  carriers={tagUsage.get(tag)}
                  onToggle={() => toggle(tag)}
                />
              ))}
            </div>
          </div>
        ))}

        {customOptions.length > 0 ? (
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium text-text">
              Added in admin — outside the reviewed vocabulary
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {customOptions.map((tag) => (
                <TagCheckbox
                  key={tag}
                  tag={tag}
                  checked={tags.includes(tag)}
                  carriers={tagUsage.get(tag)}
                  onToggle={() => toggle(tag)}
                />
              ))}
            </div>
          </div>
        ) : null}

        {/*
          Adding a tag, with the nudge rather than a refusal.

          The nudge is the deal: a tag no other type carries is legal and is the admin's
          call, but it is the maximum-weight case, so what they are told is what it costs
          rather than that it does nothing. The slug is shown BEFORE the tag is added, so
          "Quick Commerce" becoming `quick-commerce` is visible and rejectable — a
          normaliser that ran silently at the publish gate is how one idea gets two tags.
        */}
        <div className="flex flex-col gap-2 rounded-md border border-border-subtle bg-surface-subtle p-3">
          <div className="flex flex-wrap items-end gap-3">
            <AdminField
              label="Add a tag of your own"
              hint={
                pendingTag
                  ? pendingProblem
                    ? `Will be "${pendingTag}" — ${pendingProblem}.`
                    : `Will be added as "${pendingTag}".`
                  : "Lowercase and hyphenated, because a tag is matched by equality — two spellings would be two tags."
              }
              className="min-w-56 flex-1"
            >
              <input
                value={newTag}
                onChange={(event) => setNewTag(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    // Inside a form-shaped block with a Save button beside it, so Enter
                    // has to be claimed here or it submits the type.
                    event.preventDefault();
                    addTag();
                  }
                }}
                className={ADMIN_CONTROL}
                placeholder="quick-commerce"
              />
            </AdminField>
            <Button
              variant="outline"
              disabled={!pendingTag || pendingProblem !== null}
              onClick={addTag}
            >
              Add tag
            </Button>
          </div>
          {pendingTag && !pendingProblem && (tagUsage.get(pendingTag) ?? 0) === 0 ? (
            <p role="status" className="text-xs text-text">
              <span className="font-semibold">No other business type carries this.</span>{" "}
              That is allowed and it is your call — but a tag nobody else has is the
              STRONGEST signal in its industry, not a weak one, so it will dominate the
              match for anyone who selects this sub-industry. Its weight is capped at the
              sharpest reviewed tag in the industry, which is what keeps that survivable.
              Add it to a second type to make it a comparison rather than a fingerprint.
            </p>
          ) : null}
        </div>
      </fieldset>

      {error ? (
        <p role="alert" className="ansr-field-error text-sm">
          {error}
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button onClick={save}>{isNew ? "Add to draft" : "Save to draft"}</Button>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

/**
 * One tag checkbox.
 *
 * **The tag's own text leads the label and nothing precedes it**, which is a spec
 * contract: `3-business-types.spec.ts` reaches these by `getByRole("checkbox", { name:
 * /^luxury/ })`. The carrier count follows it, muted.
 */
function TagCheckbox({
  tag,
  checked,
  carriers,
  onToggle,
}: {
  tag: string;
  checked: boolean;
  carriers: number | undefined;
  onToggle: () => void;
}) {
  return (
    <label className="flex min-h-8 items-center gap-1.5 text-xs text-text">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="size-4 shrink-0 accent-[var(--ansr-accent)]"
      />
      <span>
        {tag}
        {carriers !== undefined ? (
          <span className="text-text-muted"> ({carriers})</span>
        ) : null}
      </span>
    </label>
  );
}
