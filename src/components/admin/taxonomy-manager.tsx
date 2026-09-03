"use client";

import { useMemo, useState } from "react";

import { useDraft, type TaxonomyKey } from "@/components/admin/draft-provider";
import { AdminPageHeader, AdminSection } from "@/components/admin/page-header";
import {
  AdminSearch,
  NoSearchMatches,
  useAdminSearch,
  useDeepLinkQuery,
} from "@/components/admin/search-box";
import { TAXONOMY_LIST_TITLES } from "@/components/admin/sections";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { latLonSchema } from "@/data/schema";

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
 *
 * **Two of the four carry a second thing per row, and both are extensions of this
 * config rather than editors of their own.** An industry can be held in the
 * dropdown's leading tier and a city can carry a coordinate for the density map;
 * both live in `taxonomy` as a parallel key holding copies of strings from the list
 * beside them, so both belong on the row that owns the string. Forking a second
 * component for either would have meant a second add, rename, delete and usage
 * count to keep in step with this one.
 */

interface ListConfig {
  key: TaxonomyKey;
  title: string;
  description: string;
  /** Order carries meaning and must be editable. */
  ordered: boolean;
  addLabel: string;
  /**
   * The per-row extra this list carries, if any. One field rather than a boolean
   * each, because a row can only ever have one: the two are keyed to different
   * lists and neither generalises to the other two.
   */
  rowExtra?: "pin" | "coordinate";
}

/**
 * The four lists. **The TITLE comes from `sections.ts`** and the rest is local: the
 * universal search has to tell an admin which list a value it found belongs to, and one
 * heading typed in two files is one that eventually disagrees with itself.
 */
const LISTS: readonly ListConfig[] = [
  {
    key: "industries",
    title: TAXONOMY_LIST_TITLES.industries,
    description:
      "The primary peer match key. Renaming one updates every company that used it.",
    ordered: false,
    addLabel: "New industry",
    rowExtra: "pin",
  },
  {
    key: "revenueBands",
    title: TAXONOMY_LIST_TITLES.revenueBands,
    description:
      "Order matters. Peer matching falls back to the band either side of the visitor's, counted by position in this list — so this must read lowest to highest. Never sorted alphabetically.",
    ordered: true,
    addLabel: "New revenue band",
  },
  {
    key: "cities",
    title: TAXONOMY_LIST_TITLES.cities,
    description:
      "Offered when editing a company, and the source of the city density heatmap.",
    ordered: false,
    addLabel: "New city",
    rowExtra: "coordinate",
  },
  {
    key: "hqCountries",
    title: TAXONOMY_LIST_TITLES.hqCountries,
    description:
      "A sort preference for the peer set, never a filter on it.",
    ordered: false,
    addLabel: "New HQ country",
  },
];

export function TaxonomyManager() {
  const { draft } = useDraft();
  const search = useAdminSearch();
  // Arriving from the universal search. No `open`: a taxonomy row has no editor to
  // open, it has a Rename button, and opening a rename field for somebody is putting
  // the keyboard in a destructive control they did not ask for.
  useDeepLinkQuery(search.setQuery);

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

  /**
   * One search over all four lists at once, and that is the whole reason it sits
   * here rather than one box per section.
   *
   * The four lists are 24, 7, ~200 and 201 values on ONE page, and an admin who has
   * been handed "Bengaluru is spelled wrong" does not know or care which list holds
   * it. So the query filters every list and a list with no matches drops out
   * entirely, which turns "read four sections" into "read the one that answered".
   */
  const results = LISTS.map((config) => ({
    config,
    // The original index travels with the value, because reordering and renaming are
    // both addressed by position in the FULL list. Filtering a list and then handing
    // a row its filtered index is how Move up moves the wrong value.
    rows: draft.taxonomy[config.key]
      .map((value, index) => ({ value, index }))
      .filter((row) => search.matches(row.value)),
  }));

  const shown = search.searching
    ? results.filter((entry) => entry.rows.length > 0)
    : results;
  const total = results.reduce((n, entry) => n + entry.rows.length, 0);

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Taxonomy"
        lead="What the public dropdowns offer, live on the next publish."
      />

      <AdminSearch
        placeholder="Bengaluru, Retail, Netherlands"
        hint="Searches all four lists. Only the lists with a match are shown."
        value={search.query}
        onChange={search.setQuery}
        status={
          search.searching
            ? `${total} value${total === 1 ? "" : "s"} across ${shown.length} list${shown.length === 1 ? "" : "s"}`
            : undefined
        }
      />

      {search.searching && total === 0 ? (
        <NoSearchMatches query={search.query} what="taxonomy values" />
      ) : null}

      {shown.map(({ config, rows }) => (
        <TaxonomyList
          key={config.key}
          config={config}
          values={draft.taxonomy[config.key]}
          rows={rows}
          filtering={search.searching}
          usage={usage[config.key]}
        />
      ))}
    </div>
  );
}

function TaxonomyList({
  config,
  values,
  rows,
  filtering,
  usage,
}: {
  config: ListConfig;
  /** The whole list. Still needed: add, rename and delete all validate against it. */
  values: readonly string[];
  /**
   * The rows to draw, each carrying its index in `values` rather than in this array.
   *
   * Two operations here are addressed by position — `moveTaxonomyValue` and the
   * "is this the last row" test that disables Move down — so a filtered index would
   * move a value the admin cannot see.
   */
  rows: readonly { value: string; index: number }[];
  /** A filter is applied, so what is on screen is not the whole list. */
  filtering: boolean;
  usage: Map<string, number>;
}) {
  const {
    draft,
    addTaxonomyValue,
    renameTaxonomyValue,
    removeTaxonomyValue,
    moveTaxonomyValue,
    setPinnedIndustry,
    setCityCoordinate,
  } = useDraft();

  const [newValue, setNewValue] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);
  /**
   * The coordinate editor holds its two fields locally and commits on Save, which is
   * the rename control's shape rather than the site-copy tab's write-through one.
   *
   * Deliberately, and for a reason that is about the value rather than about taste: a
   * coordinate is two numbers that only mean something together, and writing each
   * keystroke into the draft would put a half-typed "1" into the map's overlay and
   * plot a dot in the Arabian Sea until the second digit arrived. There is also
   * nothing to write for an empty field — the record has no null — so the pair has
   * to be complete before it can land.
   */
  const [plottingIndex, setPlottingIndex] = useState<number | null>(null);
  const [latText, setLatText] = useState("");
  const [lonText, setLonText] = useState("");
  const [coordError, setCoordError] = useState<string | null>(null);

  const pinned = new Set(draft.taxonomy.pinnedIndustries);
  const coordinates = draft.taxonomy.cityCoordinates;
  const extraHintId = `taxonomy-${config.key}-extra-hint`;

  function openCoordinates(index: number, value: string) {
    const held = coordinates[value];
    setPlottingIndex(index);
    setLatText(held ? String(held.lat) : "");
    setLonText(held ? String(held.lon) : "");
    setCoordError(null);
  }

  function commitCoordinate(city: string) {
    const lat = latText.trim();
    const lon = lonText.trim();
    if (!lat || !lon) {
      setCoordError(
        "Both numbers or neither — one on its own cannot place a dot. Use Clear to take the dot off.",
      );
      return;
    }
    // The schema's own bounds and the schema's own message, so this cannot say
    // "fine" for something the publish gate rejects — nor invent a second wording
    // for the same rule.
    const parsed = latLonSchema.safeParse({ lat: Number(lat), lon: Number(lon) });
    if (!parsed.success) {
      setCoordError(
        parsed.error.issues
          .map((issue) => `${issue.path.join(".") || "coordinate"}: ${issue.message}`)
          .join(" · "),
      );
      return;
    }
    setCityCoordinate(city, parsed.data);
    setPlottingIndex(null);
    setCoordError(null);
  }

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
    <AdminSection
      id={`taxonomy-${config.key}`}
      title={config.title}
      meta={
        <>
          <p className="text-sm text-text-muted">
            {filtering
              ? `${rows.length} of ${values.length} values`
              : `${values.length} values`}
          </p>
          {config.ordered ? (
            <p className="text-xs font-medium uppercase tracking-caps text-action">
              Order is meaningful
            </p>
          ) : null}
        </>
      }
      description={
        <>
          <p>{config.description}</p>
          {/* One hint for the whole list, referenced by every row's control rather
              than repeated on each of them: the explanation is about the column, not
              about the row, and twenty-four copies of it is what a screen reader
              would read out twenty-four times. */}
          {config.rowExtra === "pin" ? (
            <p id={extraHintId}>
              A pinned industry sits in the dropdown&rsquo;s leading tier however few
              companies it has. Position inside the tier is still by company count,
              so this decides membership only. Keep the set short — everything pinned
              makes nothing prominent.
            </p>
          ) : null}
          {config.rowExtra === "coordinate" ? (
            <p id={extraHintId}>
              Only needed for a city the code does not already know. A city with no
              coordinate is still counted, ranked and listed — it simply carries no
              dot on the map, and nothing on the public page says so.
            </p>
          ) : null}
        </>
      }
    >
      {filtering && config.ordered ? (
        /*
          Reordering is refused while the list is filtered, and refusing it is the
          honest option rather than the cautious one. Move up swaps with the value at
          the position ABOVE, which under a filter is a row that is not on screen — so
          the button would appear to do nothing while quietly rewriting the contract
          that peer band proximity is index arithmetic over. Nothing about that is
          recoverable by looking at the list, because the list is filtered.
        */
        <p className="border-b border-border-subtle px-5 py-2.5 text-xs text-text-muted">
          Clear the search to reorder. The arrows move a value past the one above or
          below it in the full list, which a filtered list is not showing.
        </p>
      ) : null}

      <ul className="divide-y divide-border-subtle">
        {rows.map(({ value, index }) => {
          const count = usage.get(value) ?? 0;
          const editing = editingIndex === index;
          const plotting = plottingIndex === index;
          const coordinate = coordinates[value];
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
              ) : plotting ? (
                <form
                  className="flex flex-1 flex-wrap items-end gap-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    commitCoordinate(value);
                  }}
                >
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`lat-${config.key}-${index}`} className="text-xs">
                      Latitude
                      {/* The city is in the accessible name and not on screen: a
                          hundred rows of "Latitude" would otherwise be a hundred
                          identically-named fields to a screen reader. */}
                      <span className="sr-only"> for {value}</span>
                    </Label>
                    <Input
                      id={`lat-${config.key}-${index}`}
                      value={latText}
                      inputMode="decimal"
                      className="w-28"
                      aria-invalid={coordError ? true : undefined}
                      aria-describedby={`${extraHintId}${coordError ? ` coord-error-${config.key}-${index}` : ""}`}
                      onChange={(event) => {
                        setLatText(event.target.value);
                        setCoordError(null);
                      }}
                      autoFocus
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`lon-${config.key}-${index}`} className="text-xs">
                      Longitude
                      <span className="sr-only"> for {value}</span>
                    </Label>
                    <Input
                      id={`lon-${config.key}-${index}`}
                      value={lonText}
                      inputMode="decimal"
                      className="w-28"
                      aria-invalid={coordError ? true : undefined}
                      aria-describedby={`${extraHintId}${coordError ? ` coord-error-${config.key}-${index}` : ""}`}
                      onChange={(event) => {
                        setLonText(event.target.value);
                        setCoordError(null);
                      }}
                    />
                  </div>
                  <Button type="submit" size="sm">
                    Save
                    <span className="sr-only"> coordinates for {value}</span>
                  </Button>
                  {coordinate ? (
                    <button
                      type="button"
                      className="ansr-destructive inline-flex h-8 items-center px-3 text-sm"
                      onClick={() => {
                        setCityCoordinate(value, null);
                        setPlottingIndex(null);
                        setCoordError(null);
                      }}
                    >
                      Clear
                      <span className="sr-only"> coordinates for {value}</span>
                    </button>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setPlottingIndex(null);
                      setCoordError(null);
                    }}
                  >
                    Cancel
                  </Button>
                  {coordError ? (
                    <p
                      id={`coord-error-${config.key}-${index}`}
                      role="alert"
                      className="ansr-field-error w-full text-xs"
                    >
                      {coordError}
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

                  {config.rowExtra === "pin" ? (
                    <label
                      htmlFor={`pin-${config.key}-${index}`}
                      className="flex min-h-6 shrink-0 cursor-pointer items-center gap-2 text-xs text-text"
                    >
                      <input
                        id={`pin-${config.key}-${index}`}
                        type="checkbox"
                        checked={pinned.has(value)}
                        aria-describedby={extraHintId}
                        onChange={(event) =>
                          setPinnedIndustry(value, event.target.checked)
                        }
                        className="size-4 shrink-0 accent-[var(--ansr-accent)]"
                      />
                      Leading tier
                      <span className="sr-only"> for {value}</span>
                    </label>
                  ) : null}

                  {config.rowExtra === "coordinate" ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openCoordinates(index, value)}
                    >
                      {/* The figures rather than the word "edit": whether a city
                          carries a dot is the thing an admin is scanning the list
                          for, and a button labelled "Coordinates" on every row says
                          nothing about which ones are missing. */}
                      {coordinate
                        ? `${coordinate.lat}, ${coordinate.lon}`
                        : "No coordinates"}
                      <span className="sr-only"> for {value} — edit</span>
                    </Button>
                  ) : null}

                  {config.ordered ? (
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="icon-sm"
                        aria-label={`Move ${value} up`}
                        disabled={filtering || index === 0}
                        onClick={() => moveTaxonomyValue(config.key, index, -1)}
                      >
                        <span aria-hidden="true">↑</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="icon-sm"
                        aria-label={`Move ${value} down`}
                        disabled={filtering || index === values.length - 1}
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
    </AdminSection>
  );
}
