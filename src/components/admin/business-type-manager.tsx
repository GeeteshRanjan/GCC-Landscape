"use client";

import { useMemo, useState } from "react";

import { AdminPageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { BUSINESS_TAG_AXES, type BusinessTag } from "@/data/business-tags";
import type { BusinessType } from "@/data/schema";
import { slugify } from "@/data/normalize";

import { useDraft } from "./draft-provider";

/**
 * The business-type catalogue: what a visitor picks on Screen 1, and what a company
 * is assigned.
 *
 * Editable here, unlike the TAG vocabulary it draws from. The split is deliberate and
 * it is the same one Screen 2 makes between metric definitions and metric values:
 * ANSR must be able to add "Quick commerce" without a developer, but must not be able
 * to invent a tag, because a tag nobody else carries matches nothing and deleting one
 * silently re-scores every peer set in the product.
 *
 * Two things about editing here are worth knowing before you do it:
 *
 *  - **A tag change re-scores an industry.** Adding `luxury` to "Apparel & footwear
 *    brand" changes which five companies a visitor from Nike sees, with no company row
 *    touched. The publish diff reports it as a real change for exactly that reason.
 *  - **A tag on only one type does nothing.** It can only be shared in a
 *    type-against-itself comparison, which already scores maximum. `data:verify`
 *    fails on it rather than letting the vocabulary rot, and the count beside each tag
 *    below is there so the situation is visible while editing rather than at publish.
 */

const CONTROL =
  "min-h-11 w-full rounded-md border border-border bg-surface px-3 text-sm text-text";

export function BusinessTypeManager() {
  const { draft, addBusinessType, updateBusinessType, removeBusinessType } = useDraft();
  const [industryFilter, setIndustryFilter] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

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

  const visible = useMemo(() => {
    const types = industryFilter
      ? draft.businessTypes.filter((type) => type.industry === industryFilter)
      : draft.businessTypes;
    return [...types].sort(
      (a, b) => a.industry.localeCompare(b.industry) || a.name.localeCompare(b.name),
    );
  }, [draft.businessTypes, industryFilter]);

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

      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <label className="flex w-64 flex-col gap-1.5">
          {/* "Filter by industry", not "Industry": the edit form below has its own
              Industry select, and two controls with the same accessible name make
              both unaddressable by name. */}
          <span className="text-sm font-medium text-text">Filter by industry</span>
          <select
            value={industryFilter}
            onChange={(event) => setIndustryFilter(event.target.value)}
            className={CONTROL}
          >
            <option value="">Every industry ({draft.businessTypes.length})</option>
            {draft.taxonomy.industries.map((industry) => (
              <option key={industry} value={industry}>
                {industry}
              </option>
            ))}
          </select>
        </label>
        <p className="text-sm text-text-muted">
          {visible.length} business {visible.length === 1 ? "type" : "types"}. Editing tags
          re-scores every peer set in that industry.
        </p>
      </div>

      {adding ? (
        <BusinessTypeForm
          industries={draft.taxonomy.industries}
          existingIds={draft.businessTypes.map((type) => type.id)}
          onCancel={() => setAdding(false)}
          onSave={(type) => {
            addBusinessType(type);
            setAdding(false);
          }}
        />
      ) : null}

      <ul className="flex flex-col gap-3">
        {visible.map((type) => {
          const companies = usage.byType.get(type.id) ?? 0;
          const isEditing = editing === type.id;
          return (
            <li
              key={type.id}
              className="rounded-md border border-border bg-surface p-4"
            >
              {isEditing ? (
                <BusinessTypeForm
                  industries={draft.taxonomy.industries}
                  existingIds={draft.businessTypes.map((t) => t.id)}
                  initial={type}
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
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-text">{type.name}</p>
                      <p className="text-xs text-text-muted">
                        {type.industry} · {type.id} ·{" "}
                        {companies === 0
                          ? "no companies"
                          : `${companies} ${companies === 1 ? "company" : "companies"}`}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setEditing(type.id)}
                        className="min-h-11 rounded-md border border-border px-3 text-sm text-text"
                      >
                        Edit {type.name} ({type.industry})
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const message =
                            companies > 0
                              ? `Remove ${type.name}? ${companies} ${companies === 1 ? "company" : "companies"} will fall back to industry-level matching.`
                              : `Remove ${type.name}?`;
                          if (window.confirm(message)) removeBusinessType(type.id);
                        }}
                        className="ansr-destructive min-h-11 rounded-md px-3 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-text-muted">
                    {type.tags.join(" · ")}
                  </p>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function BusinessTypeForm({
  industries,
  existingIds,
  initial,
  tagUsage,
  onCancel,
  onSave,
}: {
  industries: readonly string[];
  existingIds: readonly string[];
  initial?: BusinessType;
  tagUsage?: Map<string, number>;
  onCancel: () => void;
  onSave: (type: BusinessType) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [industry, setIndustry] = useState(initial?.industry ?? "");
  const [tags, setTags] = useState<BusinessTag[]>([...(initial?.tags ?? [])]);
  const [error, setError] = useState<string | null>(null);

  const isNew = initial === undefined;
  const id = isNew ? slugify(name) : initial.id;

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
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-text">Name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={CONTROL}
            placeholder="Quick commerce"
          />
          <span className="text-xs text-text-muted">
            {isNew ? `Id will be "${id || "—"}"` : `Id stays "${id}"`}
          </span>
        </label>
        <label className="flex flex-col gap-1.5">
          {/* Distinct from the list's "Filter by industry" above. Two selects whose
              accessible names both start "Industry" cannot be told apart by name. */}
          <span className="text-sm font-medium text-text">Belongs to industry</span>
          <select
            value={industry}
            onChange={(event) => setIndustry(event.target.value)}
            className={CONTROL}
          >
            <option value="">Choose an industry</option>
            {industries.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <span className="text-xs text-text-muted">
            Only companies in this industry can carry this type.
          </span>
        </label>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-medium text-text">
          Tags ({tags.length} selected)
        </legend>
        <p className="text-xs text-text-muted">
          The similarity signal. Weighting is automatic — a tag most of the industry
          carries counts for little, a rare one counts for a lot — so pick what is true
          rather than what sounds distinctive. The count beside each tag is how many
          types already carry it; a tag on only one type has no effect at all.
        </p>
        {BUSINESS_TAG_AXES.map((axis) => (
          <div key={axis.axis} className="flex flex-col gap-1">
            <p className="text-xs font-medium text-text">
              {axis.axis} — {axis.hint}
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {axis.tags.map((tag) => {
                const checked = tags.includes(tag);
                const carriers = tagUsage?.get(tag);
                return (
                  <label
                    key={tag}
                    className="flex min-h-8 items-center gap-1.5 text-xs text-text"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setTags((current) =>
                          checked
                            ? current.filter((t) => t !== tag)
                            : [...current, tag],
                        )
                      }
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
              })}
            </div>
          </div>
        ))}
      </fieldset>

      {error ? (
        <p role="alert" className="ansr-field-error text-sm">
          {error}
        </p>
      ) : null}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={save}
          className="min-h-11 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          {isNew ? "Add to draft" : "Save to draft"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 rounded-md border border-border px-4 text-sm text-text"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
