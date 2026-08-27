"use client";

import { useMemo, useState } from "react";

import { useDraft, type TaxonomyKey } from "@/components/admin/draft-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Taxonomy editor: industry, revenue band, city, HQ country.
 *
 * Taxonomy is a first-class entity, so adding a value here reaches the public
 * dropdowns on the next publish with no code change — the dropdowns read
 * `dataset.taxonomy`, not a hardcoded list.
 *
 * The one genuinely dangerous list is revenue bands. Its ORDER is the contract
 * for adjacent-band peer matching, which is index arithmetic on the array. So:
 *
 *   - it is never sorted, here or anywhere;
 *   - a new band is appended and then moved into position deliberately;
 *   - reordering is exposed as Move up / Move down buttons rather than drag and
 *     drop, so it works from the keyboard without a rebuilt drag interaction.
 *
 * The other three lists are shown in the order they are stored too, because
 * silently sorting them would produce a diff on every publish.
 */

interface ListConfig {
  key: TaxonomyKey;
  title: string;
  description: string;
  /** Order carries meaning and must be editable. */
  ordered: boolean;
  addLabel: string;
}

const LISTS: readonly ListConfig[] = [
  {
    key: "industries",
    title: "Industries",
    description:
      "The primary peer match key. Renaming one updates every company that used it.",
    ordered: false,
    addLabel: "New industry",
  },
  {
    key: "revenueBands",
    title: "Revenue bands",
    description:
      "Order matters. Peer matching falls back to the band either side of the visitor's, counted by position in this list — so this must read lowest to highest. Never sorted alphabetically.",
    ordered: true,
    addLabel: "New revenue band",
  },
  {
    key: "cities",
    title: "India cities",
    description:
      "Offered when editing a company, and the source of the city density heatmap.",
    ordered: false,
    addLabel: "New city",
  },
  {
    key: "hqCountries",
    title: "HQ countries",
    description:
      "A sort preference for the peer set, never a filter on it.",
    ordered: false,
    addLabel: "New HQ country",
  },
];

export function TaxonomyManager() {
  const { draft } = useDraft();

  // Usage counts, so a value cannot be deleted out from under the rows that
  // reference it. Computed once per draft change rather than per list.
  const usage = useMemo(() => {
    const counts: Record<TaxonomyKey, Map<string, number>> = {
      industries: new Map(),
      revenueBands: new Map(),
      cities: new Map(),
      hqCountries: new Map(),
    };
    const bump = (map: Map<string, number>, value: string) =>
      map.set(value, (map.get(value) ?? 0) + 1);

    for (const company of draft.companies) {
      bump(counts.industries, company.industry);
      bump(counts.revenueBands, company.revenueBand);
      bump(counts.hqCountries, company.hqCountry);
      for (const city of company.cities) bump(counts.cities, city);
    }
    return counts;
  }, [draft.companies]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold tracking-heading text-text">
          Taxonomy
        </h1>
        <p className="mt-1 max-w-measure text-sm text-text-muted">
          These four lists are what the public dropdowns offer. A value added
          here appears there as soon as you publish — nothing needs to be
          changed in code.
        </p>
      </div>

      {LISTS.map((config) => (
        <TaxonomyList
          key={config.key}
          config={config}
          values={draft.taxonomy[config.key]}
          usage={usage[config.key]}
        />
      ))}
    </div>
  );
}

function TaxonomyList({
  config,
  values,
  usage,
}: {
  config: ListConfig;
  values: readonly string[];
  usage: Map<string, number>;
}) {
  const {
    addTaxonomyValue,
    renameTaxonomyValue,
    removeTaxonomyValue,
    moveTaxonomyValue,
  } = useDraft();

  const [newValue, setNewValue] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);

  function onAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = newValue.trim();
    if (!trimmed) {
      setAddError("Enter a value first.");
      return;
    }
    if (values.includes(trimmed)) {
      setAddError(`"${trimmed}" is already in this list.`);
      return;
    }
    addTaxonomyValue(config.key, trimmed);
    setNewValue("");
    setAddError(null);
  }

  function commitRename(index: number, from: string) {
    const trimmed = editingValue.trim();
    if (!trimmed) {
      setRenameError("A value cannot be empty.");
      return;
    }
    if (trimmed !== from && values.includes(trimmed)) {
      // Allowed, but it merges two values, so it is confirmed rather than done
      // silently — the row count moving is not obvious from the list.
      const count = usage.get(from) ?? 0;
      const ok = window.confirm(
        `"${trimmed}" already exists. Renaming will merge "${from}" into it, moving ${count} row${count === 1 ? "" : "s"} across. Continue?`,
      );
      if (!ok) return;
    }
    renameTaxonomyValue(config.key, from, trimmed);
    setEditingIndex(null);
    setRenameError(null);
  }

  return (
    <section
      aria-labelledby={`taxonomy-${config.key}`}
      className="border border-border-subtle bg-surface"
    >
      <div className="border-b border-border-subtle px-5 py-4">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2
            id={`taxonomy-${config.key}`}
            className="text-base font-semibold text-text"
          >
            {config.title}
          </h2>
          <p className="text-sm text-text-muted">{values.length} values</p>
          {config.ordered ? (
            <p className="text-xs font-medium uppercase tracking-caps text-action">
              Order is meaningful
            </p>
          ) : null}
        </div>
        <p className="mt-1 max-w-measure text-sm text-text-muted">
          {config.description}
        </p>
      </div>

      <ul className="divide-y divide-border-subtle">
        {values.map((value, index) => {
          const count = usage.get(value) ?? 0;
          const editing = editingIndex === index;
          return (
            <li
              key={`${value}-${index}`}
              className="flex flex-wrap items-center gap-3 px-5 py-2.5"
            >
              {config.ordered ? (
                <span
                  aria-hidden="true"
                  className="w-6 shrink-0 text-xs tabular-nums text-text-muted"
                >
                  {index + 1}
                </span>
              ) : null}

              {editing ? (
                <form
                  className="flex flex-1 flex-wrap items-center gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    commitRename(index, value);
                  }}
                >
                  <Label htmlFor={`rename-${config.key}-${index}`} className="sr-only">
                    Rename {value}
                  </Label>
                  <Input
                    id={`rename-${config.key}-${index}`}
                    value={editingValue}
                    onChange={(event) => setEditingValue(event.target.value)}
                    aria-invalid={renameError ? true : undefined}
                    aria-describedby={
                      renameError ? `rename-error-${config.key}-${index}` : undefined
                    }
                    className="max-w-xs"
                    autoFocus
                  />
                  <Button type="submit" size="sm">
                    Save
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingIndex(null);
                      setRenameError(null);
                    }}
                  >
                    Cancel
                  </Button>
                  {renameError ? (
                    <p
                      id={`rename-error-${config.key}-${index}`}
                      role="alert"
                      className="ansr-field-error w-full text-xs"
                    >
                      {renameError}
                    </p>
                  ) : null}
                </form>
              ) : (
                <>
                  <span className="flex-1 text-sm text-text">{value}</span>
                  <span className="text-xs text-text-muted">
                    {count === 0
                      ? "not used"
                      : `${count.toLocaleString()} row${count === 1 ? "" : "s"}`}
                  </span>

                  {config.ordered ? (
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="icon-sm"
                        aria-label={`Move ${value} up`}
                        disabled={index === 0}
                        onClick={() => moveTaxonomyValue(config.key, index, -1)}
                      >
                        <span aria-hidden="true">↑</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="icon-sm"
                        aria-label={`Move ${value} down`}
                        disabled={index === values.length - 1}
                        onClick={() => moveTaxonomyValue(config.key, index, 1)}
                      >
                        <span aria-hidden="true">↓</span>
                      </Button>
                    </div>
                  ) : null}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingIndex(index);
                      setEditingValue(value);
                      setRenameError(null);
                    }}
                  >
                    Rename
                    <span className="sr-only"> {value}</span>
                  </Button>

                  {/* Deleting a value still in use would fail the publish gate
                      on referential integrity, so it is refused here where the
                      reason can be explained. */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className={count === 0 ? "ansr-destructive" : undefined}
                    aria-disabled={count > 0 ? true : undefined}
                    title={
                      count > 0
                        ? `In use by ${count} row${count === 1 ? "" : "s"}. Reassign them first.`
                        : undefined
                    }
                    onClick={() => {
                      if (count > 0) return;
                      removeTaxonomyValue(config.key, value);
                    }}
                  >
                    Delete
                    <span className="sr-only"> {value}</span>
                  </Button>
                </>
              )}
            </li>
          );
        })}
      </ul>

      <form
        onSubmit={onAdd}
        className="flex flex-wrap items-end gap-3 border-t border-border-subtle px-5 py-4"
      >
        <div className="flex min-w-64 flex-col gap-1.5">
          <Label htmlFor={`add-${config.key}`}>{config.addLabel}</Label>
          <Input
            id={`add-${config.key}`}
            value={newValue}
            onChange={(event) => {
              setNewValue(event.target.value);
              setAddError(null);
            }}
            aria-invalid={addError ? true : undefined}
            aria-describedby={addError ? `add-error-${config.key}` : undefined}
          />
        </div>
        <Button type="submit" variant="outline">
          Add
        </Button>
        {config.ordered ? (
          <p className="text-xs text-text-muted">
            Added at the end. Move it into position with the arrows.
          </p>
        ) : null}
        {addError ? (
          <p
            id={`add-error-${config.key}`}
            role="alert"
            className="ansr-field-error w-full text-xs"
          >
            {addError}
          </p>
        ) : null}
      </form>
    </section>
  );
}
