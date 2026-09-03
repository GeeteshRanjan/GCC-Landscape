"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { useDraft } from "@/components/admin/draft-provider";
import {
  KIND_LABELS,
  SEARCH_KINDS,
  buildAdminIndex,
  searchHref,
  type EntryKind,
  type SearchEntry,
} from "@/components/admin/search-index";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { matchesTokens, searchTokens } from "@/data/search";

/**
 * One search across the WHOLE admin, as a palette over the draft.
 *
 * ## What it is for, and why the per-page filters were not enough
 *
 * Each editing surface can now filter its own rows, which answers "narrow this list". It
 * does not answer the question an admin actually arrives with, which is **"where is this
 * thing?"** — a request comes in naming a company, a figure, a sentence or a word on the
 * public page, and finding it means already knowing which of six tabs owns that kind of
 * object. That is knowledge about the admin's own structure, and asking the person doing
 * the edit to hold it is what makes a five-second change slow and what gets the same
 * string edited in the wrong place.
 *
 * So `search-index.ts` indexes every editable thing in the draft — 1,834 companies, 164
 * sub-industries and their tags, every metric, every taxonomy value, every editable
 * public string, the impact figures, the function tags, the logos, plus the six pages
 * themselves — and this routes to it. **It is a way IN, never a second editor.** Nothing
 * is edited here; a result navigates to the surface that owns it, and that boundary is
 * what stops this becoming a third place the same field can be written from.
 *
 * ## How a result navigates, and why it is the URL
 *
 * Every entry carries an href with up to two parameters, both read by the target page
 * through `useDeepLinkQuery` / `useDeepLinkOpen` in `search-box.tsx`: `find` seeds that
 * page's own search box, so arriving shows the row among its siblings rather than alone;
 * `open` names a row whose editor should open on arrival.
 *
 * **The URL rather than a shared context, deliberately.** Admin is never framed, owns its
 * URL and may use real routes; the public screens may not, and that asymmetry is recorded
 * in `project.md`. Because it is the URL, the jump is bookmarkable, the back button undoes
 * it, and the mechanism is inspectable from the address bar when something lands on the
 * wrong row. A context would have been less plumbing and none of those three.
 *
 * ## Two costs, both paid deliberately
 *
 * **The index is built on FIRST OPEN, not on mount.** It is roughly 2,500 entries with a
 * prebuilt haystack each, and the shell hosting this loads on every admin page — so
 * building it eagerly would put that work in front of an admin who came to edit one
 * company. After the first open it is memoised per draft change, the same trade the
 * company table makes for its own rows.
 *
 * **It is called "Find anything" and not "Search", which is a constraint rather than a
 * flourish.** The company table's own field is labelled "Search" and Playwright's
 * `getByLabel` matches on substring, so a globally-present control whose accessible name
 * contained "Search" would make `getByLabel("Search")` ambiguous on that page and break
 * four existing specs. The distinction is also true: one searches a list, this searches
 * the product.
 */

/** Results shown per group before the "see all" row takes over. */
const PER_GROUP = 5;

export function GlobalSearch() {
  const { draft } = useDraft();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  /** Set on the first open and never unset, so the index is built at most once. */
  const [everOpened, setEverOpened] = useState(false);
  const [query, setQuery] = useState("");
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const listId = useId();
  const fieldId = useId();
  const hintId = useId();
  const input = useRef<HTMLInputElement>(null);

  const index = useMemo(
    () => (everOpened ? buildAdminIndex(draft) : []),
    [everOpened, draft],
  );

  const tokens = useMemo(() => searchTokens(query), [query]);

  /**
   * The matches, grouped and capped.
   *
   * **Capped per GROUP rather than overall**, which is the decision that makes an
   * ambiguous query useful: one flat top-twenty for "cost" is twenty companies with Cost
   * in the name and no sign that four metrics and a copy field also matched. Five per
   * kind keeps every kind visible, and the overflow row hands the rest to the page that
   * owns them, where they can be paged, sorted and edited.
   */
  const groups = useMemo(() => {
    if (tokens.length === 0) return [];
    const byKind = new Map<EntryKind, SearchEntry[]>();
    for (const item of index) {
      if (!matchesTokens(tokens, item.haystack)) continue;
      const bucket = byKind.get(item.kind);
      if (bucket) bucket.push(item);
      else byKind.set(item.kind, [item]);
    }
    return SEARCH_KINDS.filter((kind) => byKind.has(kind)).map((kind) => {
      const all = byKind.get(kind) ?? [];
      return { kind, shown: all.slice(0, PER_GROUP), total: all.length };
    });
  }, [index, tokens]);

  /** Flat, in drawn order — what the arrow keys walk. */
  const rows = useMemo(() => groups.flatMap((group) => group.shown), [groups]);
  const total = groups.reduce((n, group) => n + group.total, 0);

  /*
    Keep the highlight on a row that still exists, and reset to the FIRST result on every
    change rather than trying to preserve position: the list is rebuilt per keystroke, so
    "the row that was selected" is not a stable idea, and a highlight left on index 3 of a
    new list is a selection nobody made.
  */
  useEffect(() => {
    setActiveKey(rows[0]?.key ?? null);
  }, [rows]);

  /**
   * Command-K or Control-K from anywhere in the admin.
   *
   * On `window` rather than on a container, because the point is that it works while the
   * keyboard is inside a company row's field three sections down. Admin is never framed,
   * so a document-level shortcut cannot fire for a page we are embedded in — the
   * constraint that rules this out on the public screens does not apply here.
   */
  useEffect(() => {
    function onShortcut(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== "k") return;
      if (!event.metaKey && !event.ctrlKey) return;
      event.preventDefault();
      setEverOpened(true);
      setOpen((current) => !current);
    }
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, []);

  function go(item: SearchEntry) {
    setOpen(false);
    setQuery("");
    router.push(item.href);
  }

  /** The overflow row: hand the whole query to the page that owns this kind. */
  function goToAll(kind: EntryKind) {
    const item = rows.find((row) => row.kind === kind);
    if (!item) return;
    const path = item.href.split("?")[0] ?? "/admin";
    setOpen(false);
    setQuery("");
    router.push(searchHref(path, query));
  }

  function move(delta: number) {
    if (rows.length === 0) return;
    const at = rows.findIndex((row) => row.key === activeKey);
    const next = Math.min(Math.max((at === -1 ? 0 : at) + delta, 0), rows.length - 1);
    setActiveKey(rows[next]?.key ?? null);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        move(1);
        break;
      case "ArrowUp":
        event.preventDefault();
        move(-1);
        break;
      case "Home":
        event.preventDefault();
        setActiveKey(rows[0]?.key ?? null);
        break;
      case "End":
        event.preventDefault();
        setActiveKey(rows[rows.length - 1]?.key ?? null);
        break;
      case "Enter": {
        const item = rows.find((row) => row.key === activeKey);
        if (item) {
          event.preventDefault();
          go(item);
        }
        break;
      }
      default:
        break;
    }
  }

  // Encoded, because a key holds a company name with spaces and an ampersand — both
  // illegal in an id, and both silently break `aria-activedescendant`.
  const rowDomId = (key: string) =>
    `${listId}-${encodeURIComponent(key).replace(/%/g, "_")}`;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setEverOpened(true);
          setOpen(true);
        }}
        className="gap-2"
      >
        <Search aria-hidden="true" className="size-4" />
        Find anything
        {/* A hint, not a control, and out of the accessible name: a screen-reader user is
            told the shortcut by the palette's own hint line, where it is a sentence
            rather than two glyphs. */}
        <kbd
          aria-hidden="true"
          className="ms-1 hidden rounded-sm border border-border-subtle px-1.5 py-0.5 text-xs font-normal text-text-muted sm:inline"
        >
          ⌘K
        </kbd>
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setQuery("");
        }}
      >
        <DialogContent
          showCloseButton={false}
          /* Near the top rather than centred: the result list grows downward, and a
             vertically centred palette moves its own input as it fills. */
          /* Both breakpoints, because the base class carries an `sm:max-w-lg` that
             tailwind-merge keeps as a separate variant — overriding only the unprefixed
             one would leave the palette narrower on every screen above 640px than below
             it. */
          className="top-24 max-w-2xl translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-2xl"
          onOpenAutoFocus={(event) => {
            // The field, not the first focusable: this is a text box that happens to
            // have a list under it.
            event.preventDefault();
            input.current?.focus();
          }}
        >
          {/* A dialog must have a name. It is the palette's purpose rather than a visible
              heading, because the field's own label says the same thing and two headings
              over one input is a second thing to read. */}
          <DialogTitle className="sr-only">Find anything in the admin</DialogTitle>

          <div className="flex items-center gap-3 border-b border-border-subtle px-4 py-3">
            <Search aria-hidden="true" className="size-4 shrink-0 text-text-muted" />
            <Label htmlFor={fieldId} className="sr-only">
              Find anything in the admin
            </Label>
            <Input
              id={fieldId}
              ref={input}
              role="combobox"
              aria-expanded={rows.length > 0}
              aria-controls={listId}
              aria-activedescendant={activeKey ? rowDomId(activeKey) : undefined}
              aria-describedby={hintId}
              autoComplete="off"
              placeholder="A company, a metric, a label, a city…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={onKeyDown}
              className="h-auto border-0 bg-transparent p-0 text-base shadow-none focus-visible:border-0 focus-visible:ring-0"
            />
          </div>

          <div
            id={listId}
            role="listbox"
            aria-label="Results"
            className="max-h-96 overflow-y-auto"
          >
            {tokens.length === 0 ? (
              <p className="px-4 py-6 text-sm text-text-muted">
                Type to search every company, sub-industry, metric, taxonomy value and
                editable string in the draft.
              </p>
            ) : rows.length === 0 ? (
              <p className="px-4 py-6 text-sm text-text">
                Nothing in the admin matches &ldquo;{query.trim()}&rdquo;.
              </p>
            ) : (
              groups.map((group) => {
                const headingId = `${listId}-${group.kind}`;
                return (
                  <div
                    key={group.kind}
                    role="group"
                    aria-labelledby={headingId}
                    className="border-b border-border-subtle last:border-b-0"
                  >
                    <p
                      id={headingId}
                      className="bg-surface-subtle px-4 py-1.5 text-xs font-medium uppercase tracking-caps text-text-muted"
                    >
                      {KIND_LABELS[group.kind]}
                      <span className="ms-2 font-normal normal-case tracking-body">
                        {group.total}
                      </span>
                    </p>
                    {group.shown.map((item) => {
                      const active = item.key === activeKey;
                      return (
                        <div
                          key={item.key}
                          id={rowDomId(item.key)}
                          role="option"
                          aria-selected={active}
                          /*
                            The pointer commits, and the keyboard's position follows the
                            pointer, so the two never disagree about what Enter does.

                            `mousemove` rather than `mouseenter`, GUARDED: enter fires
                            once and so leaves a stale highlight when the arrow keys move
                            it while the pointer sits still over another row. Move fires
                            continuously, so the equality check is what keeps it from
                            being a state update per pixel.
                          */
                          onMouseMove={() => {
                            if (activeKey !== item.key) setActiveKey(item.key);
                          }}
                          onClick={() => go(item)}
                          className={[
                            "flex cursor-pointer items-baseline gap-3 px-4 py-2.5",
                            active ? "bg-surface-sunken" : "bg-surface",
                          ].join(" ")}
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-text">
                              {item.title}
                            </span>
                            {item.detail ? (
                              <span className="block truncate text-xs text-text-muted">
                                {item.detail}
                              </span>
                            ) : null}
                          </span>
                          <span className="shrink-0 text-xs text-text-muted">
                            {item.where}
                          </span>
                        </div>
                      );
                    })}
                    {group.total > group.shown.length ? (
                      /* Not an option: it is a different act — it hands the query to the
                         page rather than choosing a row, so it must not be reachable by
                         the arrow keys that choose rows. */
                      <button
                        type="button"
                        onClick={() => goToAll(group.kind)}
                        className="block w-full px-4 py-2 text-start text-xs font-medium text-action underline underline-offset-4"
                      >
                        See all {group.total} in {KIND_LABELS[group.kind].toLowerCase()}
                      </button>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>

          <p
            id={hintId}
            className="border-t border-border-subtle bg-surface-subtle px-4 py-2 text-xs text-text-muted"
          >
            {tokens.length > 0 && rows.length > 0
              ? `${total} match${total === 1 ? "" : "es"}. Up and down arrows to move, Enter to open, Escape to close.`
              : "Up and down arrows to move, Enter to open, Escape to close. Reopen with Command-K or Control-K."}
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
