"use client";

import { ChevronDown, ChevronLeft, ChevronRight, Search } from "lucide-react";

import { usePublicCopy } from "@/components/public/copy-context";
import { fillTemplate } from "@/data/schema";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import {
  highlightRanges,
  matchesTokens,
  partitionByMatch,
  searchHaystack,
  searchTokens,
} from "@/data/search";
import { cn } from "@/lib/utils";

/**
 * The public form's dropdown: a custom listbox, on-brand, keyboard-complete — and
 * optionally two levels deep, as a CASCADE rather than an indent.
 *
 * **Why this replaced the native `<select>`, and what it cost.** A native select's
 * closed control can be styled and its open MENU cannot — that menu is drawn by the
 * operating system, so on macOS the form ended in a grey Aqua popup that looked
 * nothing like the page it belonged to. For a tool whose whole job is to look
 * credible in front of a CIO, the one element they actually interact with reading as
 * a different product is a real cost. Everything else here is the price of fixing it.
 *
 * **It is NOT built on Radix Select, and that is an iframe constraint rather than a
 * preference.** Radix portals its content and positions it with `position: fixed`.
 * Inside a frame sized to its own content by `postMessage`, a fixed element anchors
 * to the frame's viewport rather than the parent's — so the panel is placed against
 * a viewport the visitor is not looking through, and the parent page scrolling while
 * it is open moves the field out from under it. A browser spec asserts nothing on
 * the page computes to `fixed` or `sticky` for exactly this class of bug. So the
 * panel is `position: absolute` inside the field's own wrapper: it moves with the
 * field because it is part of the document, with no measuring and no scroll listener.
 *
 * **It always opens downward, and it never flips**, for the same reason. Choosing the
 * other side when there is no room below requires reading the viewport, and the
 * public screens may not — the parent decides what is on screen. What it does
 * instead is ASK to be revealed: a bounded `max-height` and a `scrollIntoView` on
 * open, which reads nothing and is inert inside a correctly sized frame. See the
 * reveal effect below for why that is not the banned thing and for the 11px the
 * entrance keyframe costs.
 *
 * **What was rebuilt, because the platform was giving it away free:** roving
 * selection with `aria-activedescendant`, Home/End, Escape, click-outside, focus
 * returning to the trigger, and scrolling the active option into view. Type-ahead is
 * not the platform's single-character jump but a real filter, which is strictly
 * better for the list this form is worst at — 201 countries — and is why the
 * exchange is worth making rather than merely survivable.
 *
 * **The one genuine regression is on touch.** A native select opens the OS wheel
 * picker, which is better than any custom panel on a phone. The filter is the
 * compensation: typing three letters beats spinning a wheel through 201 entries.
 * Recorded in the style lock so it is a decision rather than an oversight.
 *
 * ## Two levels, drawn as a cascade
 *
 * Industry and sub-industry used to be two controls, which cost the form a field and
 * the visitor two extra clicks — and left the grid with five cells to fill in two
 * columns. They are one control now: an industry may carry sub-industries, and
 * choosing one answers both questions at once.
 *
 * **The second level is a SECOND PANE beside the first, not an indent inside it**,
 * and the indent it replaces had three problems that were all the same problem. It
 * grew the panel by up to nine rows on expand, so a popup already overhanging the
 * card ran a third of the way into the customer-logo strip below it; the panel's
 * height changed under the pointer mid-interaction; and two levels of one list at
 * 24px of indent read as an outline rather than as a choice within a choice. A
 * fixed-height body with the branch drawn beside it fixes all three: the panel is
 * exactly as tall open as closed, whatever is expanded.
 *
 * ## The panel is WIDER than the field, and that is what makes the list readable
 *
 * **A popup the width of one form field is the wrong container for 24 industries.**
 * It showed eight rows of 24 in a 16rem scrollport, so a visitor deciding between
 * industries could not see the set they were deciding within — which is the failure
 * mode that matters here, because a visitor who cannot find their own row takes a
 * broader answer and the peer set loses its primary ordering signal. Findability, not
 * scoring, is what this control is for.
 *
 * So `wide` widens the panel to the whole form grid and lays the options out in
 * COLUMNS. Two things make that legal inside a frame:
 *
 *   - **The widening is expressed in the FIELD's own width, never the viewport's.**
 *     The form grid is two equal columns with a 24px gap, so the sibling column is
 *     `100% + 24px` of this field — a negative inline-start margin of exactly that
 *     against `inset-inline: 0` gives a panel spanning the grid. Nothing measures the
 *     card, the container or the window, so there is no room table to re-measure and
 *     nothing to clamp at runtime. This replaced a table of pane widths fitted to
 *     `layoutWidth / 2 − 400` at four breakpoints, every value of which depended on
 *     the card, the container AND the grid all staying put.
 *   - **Columns are CSS multi-column, so DOM order is column order.** Content flows
 *     down column one and then down column two, which is the order the keyboard walks
 *     — so ArrowDown moves down the column under the pointer and steps to the top of
 *     the next at the bottom, with no separately-derived navigation order to fall out
 *     of step with what is drawn. A grid with `grid-auto-flow: row` would have filled
 *     left-to-right and put the keyboard order across the columns instead.
 *
 * Group headings take `column-span: all`, so each tier balances into its own columns
 * under a full-width label rather than the two tiers interleaving down one column.
 *
 * **The branch opens on the TRAILING side — parent left, child right — which is ANSR's
 * call and the direction a cascade reads in.** It is now a flex sibling INSIDE the
 * panel rather than a box positioned outside it, which is what the widening bought:
 * the pane no longer has to fit between the card and the window edge, so it works from
 * `md` up instead of only from 1440, and the two panes split the body in half. At the
 * card's full width that is 400px each, which is one line for every industry name and
 * every sub-industry name in the taxonomy — the previous 16rem pane truncated or
 * wrapped most of them.
 *
 * **Opening a branch drops the first pane from two columns to one.** The body's box is
 * unchanged — same width, same height — so nothing moves around the panel; the list
 * inside it re-flows into the half it still has. That is a visible reflow and it is the
 * accepted cost of parent-left/child-right at this width: the alternative is two
 * columns of 255px, where two thirds of the industry names wrap. The row that was
 * pressed keeps its fill and its leading rule, so the reflow has an anchor.
 *
 * **Below `md` the pane is a drill-in**, covering the first pane with its own header as
 * the way back, because there the panel is one field wide and two halves of it are
 * unusable. One element, two shapes, rather than a second component that can drift.
 *
 * So `option.children` turns the popup from a `listbox` into a `tree`. That is the
 * correct ARIA pairing rather than a clever one — a combobox may own a listbox, a
 * tree, a grid or a dialog, and a listbox whose options contain other options is
 * none of those. The switch is driven by the data because the nesting is: an
 * industry with no sub-industries mapped has nothing to open, and if the dataset
 * ever carried no business types at all this degrades to exactly the flat listbox it
 * was before. `aria-haspopup` and the popup's own role are read from the same flag,
 * so they cannot disagree.
 *
 * **The branch pane is `aria-owns`-ed by its parent row rather than nested inside
 * it.** A cascade puts the child list in a different box from the parent, so the DOM
 * cannot also express the tree's containment — which is the case `aria-owns` exists
 * for. It also keeps the filter input out of the `tree` element, where a textbox
 * would be invalid.
 *
 * **Choosing an industry does not close the panel.** It commits the industry — the
 * trigger updates, so the answer visibly took — and opens its branch, because that
 * is the only moment a visitor learns a narrower answer is available. The branch's
 * first row is `All of {industry}`, already selected, which is both the way out and
 * the statement of what happens if they take it. The panel closes on that row, on a
 * sub-industry, on Escape, or on a press outside — four exits, none of them a
 * dead end.
 */

export interface SelectOption {
  value: string;
  label: string;
  /**
   * Extra words this option can be found by, beyond its printed label.
   *
   * The label is what ANSR chose to call the row; these are what a visitor calls
   * their own business. Nothing here is displayed — a row that showed its synonyms
   * would also be handing them to `treeitem`'s name computation. See
   * `src/data/search-terms.ts` for what earns a place in the list and why the list
   * is code.
   */
  terms?: readonly string[];
  /**
   * One further level of narrower choices, and one only.
   *
   * A third level is deliberately not supported: the cascade would need a third
   * pane, and the room table in `.gcc-select-pane` barely affords the second one.
   * A tree that deep is a navigation problem rather than a field. Any `children`
   * on a child are ignored.
   */
  children?: readonly SelectOption[];
}

export interface SelectGroup {
  label: string;
  options: readonly SelectOption[];
}

/** Above this many options the panel gets a filter box; below it, one is clutter. */
const FILTER_THRESHOLD = 12;

/**
 * Whether focusing a text input on this device would raise a keyboard OVER the page.
 *
 * **`(pointer: coarse)` and not a width, a user-agent string or `ontouchstart`.** The
 * question is not how wide the viewport is — a 700px window on a laptop has a hardware
 * keyboard and wants the filter focused — and it is not whether touch EXISTS, since a
 * touchscreen laptop has both and its primary pointer is still fine. `pointer: coarse`
 * is the one query that asks what the visitor's primary input actually is, which is
 * exactly the thing that decides whether a focused input costs half the screen.
 *
 * Read at the moment the panel opens rather than held in state: it can genuinely change
 * under a visitor who docks a tablet, and there is nothing to re-render when it does.
 * Guarded for the server render, where `window` does not exist and this runs on the
 * client-only open transition anyway.
 */
function hasVirtualKeyboard(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(pointer: coarse)").matches;
}

/**
 * A row's label with the matched run marked.
 *
 * **Safe to split into elements ONLY because every row carries an explicit
 * `aria-label`.** A `treeitem`'s name is otherwise computed from its contents, so
 * chopping the label into three nodes would be the thing this control is careful about
 * everywhere else — but `aria-label` overrides name-from-content outright, so the
 * accessible name stays the whole plain label whatever this draws. The specs that look
 * rows up by exact name are unaffected, and a browser spec pins that.
 *
 * `<mark>` rather than a styled `<span>`: the element means "relevant in the current
 * context", which is exactly what a filter hit is, and it is the standard shape for
 * search highlighting. Its default yellow is overridden in `.gcc-select-mark`.
 *
 * **Nothing is drawn when the row matched on a search TERM instead of its label** —
 * `highlightRanges` returns no ranges and the label renders as one plain string. That is
 * the case a shortcut would get wrong by displaying the term, which must never become
 * visible text. See `highlightRanges`.
 */
function HighlightedLabel({
  label,
  tokens,
}: {
  label: string;
  tokens: readonly string[];
}) {
  const ranges = useMemo(() => highlightRanges(label, tokens), [label, tokens]);
  if (ranges.length === 0) return <>{label}</>;

  const parts: React.ReactNode[] = [];
  let at = 0;
  for (const [start, end] of ranges) {
    if (start > at) parts.push(label.slice(at, start));
    parts.push(
      <mark key={`${start}-${end}`} className="gcc-select-mark">
        {label.slice(start, end)}
      </mark>,
    );
    at = end;
  }
  if (at < label.length) parts.push(label.slice(at));
  return <>{parts}</>;
}

/**
 * One rendered line in a pane.
 *
 * Headings sit in the same list as options rather than wrapping each group, because
 * the keyboard has to walk the options in the order they are DRAWN. A nested render
 * plus a separately-derived navigation order is how those two silently stop
 * agreeing.
 *
 * **`rowId` is separate from `value` and both are needed.** The branch pane's
 * leading row commits the industry it belongs to, so it carries the same `value` as
 * the parent row over in the first pane — two rows, one value. Roving on `value`
 * would give them one identity and one DOM id; roving on `rowId` keeps them
 * distinct while `value` stays the thing that gets committed.
 */
type Row =
  | { kind: "heading"; rowId: string; label: string }
  | {
      kind: "option";
      rowId: string;
      value: string;
      label: string;
      /** Set only on a row that commits a NESTED value. */
      parent?: string;
      /** True for the parent row of a branch — the one that opens a pane. */
      branching: boolean;
      /** True for the branch pane's own "all of this industry" row. */
      whole: boolean;
    };

export function SelectField({
  id,
  value,
  groups,
  placeholder,
  /**
   * One line inside the panel, above the options.
   *
   * The only place the second level can be explained without putting help text on
   * the form itself — a visitor has no way to guess that an industry row opens a
   * pane. Rendered where the affordance is rather than under the label, so it costs
   * the card no height and cannot shift the grid.
   */
  hint,
  /**
   * What the second level is called, in the branch pane's own header.
   *
   * Passed in rather than hardcoded because the component is generic and the term
   * is not: three of the four controls have no second level at all.
   */
  childLabel,
  wide,
  columns,
  disabled,
  invalid,
  describedBy,
  triggerRef,
  onChange,
}: {
  /** Comes from the `Field` wrapper, so the visible label's `htmlFor` still lands. */
  id: string;
  value: string;
  /** One group renders without a heading; several render with group semantics. */
  groups: readonly SelectGroup[];
  placeholder: string;
  hint?: string;
  childLabel?: string;
  /**
   * Widen the panel to the whole form grid and lay the options out in columns.
   *
   * **Set per control rather than derived from the option count, because widening is
   * a statement about where the field sits in the grid.** The panel widens on its
   * LEADING side, which is only correct for a control in the grid's trailing column —
   * industry and headquarters are, revenue band is not. A count-based rule would
   * eventually widen the wrong field off the leading edge of the card.
   *
   * Revenue band declines it for a second reason as well: seven options fit a
   * single column, and a panel three times the width of its own field for seven rows
   * reads as a rendering fault rather than as room.
   */
  wide?: boolean;
  /**
   * How many columns the first pane takes at the widened width. Two by default.
   *
   * Three is for a list of SHORT labels — countries. The industry taxonomy's longest
   * name is 41 characters, which needs the full half of an 800px body to stay on one
   * line, so a third column there buys density by wrapping two thirds of the rows.
   * Ignored entirely when `wide` is unset, and ignored while a branch is open.
   */
  columns?: 2 | 3;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
  /**
   * Hands the trigger node out, so the form can put the keyboard on the first
   * control that failed validation.
   *
   * Not optional by accident: the previous native `<select>` carried this as a plain
   * `ref` and losing it in the swap made `focus()` a silent no-op — errors appeared
   * correctly and the keyboard simply did not move, which is the exact
   * keyboard-only regression nobody catches by clicking. A browser spec pins it.
   */
  triggerRef?: (node: HTMLButtonElement | null) => void;
  /**
   * `parent` is set only when a NESTED option was chosen, and it is what lets one
   * control answer two questions: the caller reads the pair as
   * (industry, sub-industry) rather than having to look the child up again.
   */
  onChange: (value: string, parent?: string) => void;
}) {
  /**
   * The widget's OWN two strings — the filter's placeholder and the nothing-matched
   * line — read here rather than taken as props, because they are the same on all four
   * controls. A caller supplies what is specific to its field (`placeholder`, `hint`);
   * the panel's chrome is the panel's business.
   */
  const copy = usePublicCopy();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  /** The industry whose sub-industries are showing in the second pane. */
  const [branch, setBranch] = useState<string | null>(null);

  const listId = useId();
  const groupId = useId();
  const hintId = useId();
  const wrapper = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const filterInput = useRef<HTMLInputElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  /**
   * Every option, parents and children alike, keyed by value — the lookup behind
   * both the trigger's label and the "which parent does this belong to" question.
   *
   * Values are unique across levels by construction: an industry is its own name
   * and a sub-industry is a slug id, so the two vocabularies cannot collide.
   */
  const index = useMemo(() => {
    const map = new Map<
      string,
      {
        label: string;
        parentLabel?: string;
        parent?: string;
        children?: readonly SelectOption[];
      }
    >();
    // One searchable string per row, built ONCE per option set rather than once per
    // keystroke: the country field has 201 rows and the industry tree has 182, and
    // rebuilding either on every character is work with a visible cost on a phone.
    const haystacks = new Map<string, string>();
    let nested = false;
    let count = 0;
    for (const group of groups) {
      for (const option of group.options) {
        map.set(option.value, { label: option.label, children: option.children });
        haystacks.set(option.value, searchHaystack(option.label, option.terms));
        count += 1;
        for (const child of option.children ?? []) {
          nested = true;
          count += 1;
          map.set(child.value, {
            label: child.label,
            parentLabel: option.label,
            parent: option.value,
          });
          haystacks.set(child.value, searchHaystack(child.label, child.terms));
        }
      }
    }
    return { map, haystacks, nested, count };
  }, [groups]);

  const showFilter = index.count > FILTER_THRESHOLD;
  const nested = index.nested;
  /**
   * The query as tokens, normalised once. Empty array means no filter is applied.
   *
   * `matchesTokens` against a row's prebuilt haystack replaces what used to be
   * `label.toLowerCase().includes(needle)`. It is a strict widening — see the note at
   * the top of `src/data/search.ts` — so this cannot hide a row that was findable
   * before, and it is what makes `3pl`, `insurtech`, `p and c` and `payment gateway`
   * reach a row at all.
   */
  const tokens = useMemo(() => searchTokens(filter), [filter]);
  const filtering = tokens.length > 0;
  const rowMatches = (value: string) =>
    matchesTokens(tokens, index.haystacks.get(value) ?? "");

  /**
   * The first pane: the industries, tiered, filtered.
   *
   * A row survives the filter on its own label OR on one of its children's, because
   * dropping a parent whose sub-industry matched would hide the hit entirely.
   */
  const paneA = useMemo<readonly Row[]>(() => {
    const out: Row[] = [];

    for (const group of groups) {
      const body: Row[] = [];

      for (const option of group.options) {
        const children = option.children ?? [];
        const selfMatch = rowMatches(option.value);
        const childMatch =
          filtering && children.some((child) => rowMatches(child.value));
        if (!selfMatch && !childMatch) continue;

        body.push({
          kind: "option",
          rowId: option.value,
          value: option.value,
          label: option.label,
          branching: children.length > 0,
          whole: false,
        });
      }

      if (body.length === 0) continue;
      // A single group is not given a heading: one flat list with one label above
      // it is a redundant heading rather than a grouping.
      if (groups.length > 1) {
        out.push({ kind: "heading", rowId: `heading-${group.label}`, label: group.label });
      }
      out.push(...body);
    }

    return out;
    // `rowMatches` closes over `tokens` and `index`, both of which are in the list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, tokens, index]);

  const branchMeta = branch ? index.map.get(branch) : undefined;
  const branchChildren = branchMeta?.children ?? [];

  /**
   * The second pane: `All of {industry}` first, then its sub-industries.
   *
   * The leading row is not decoration. Committing an industry opens this pane rather
   * than closing the panel, so something in here has to be the way out that keeps
   * the broad answer — and a row saying what the broad answer IS beats a button
   * saying Done, which would leave the visitor to work out what it was agreeing to.
   */
  const paneB = useMemo<readonly Row[]>(() => {
    if (!branch || !branchMeta) return [];
    /**
     * **The filter RANKS this pane rather than cutting it**, which is the one place the
     * two panes deliberately behave differently. Filtering to the hits alone showed 2 of
     * BFSI's 15 sub-industries for `fintech` and 2 of Software & Internet's 31 — so the
     * visitor could not see the sibling that fitted them better, and the fallback from
     * "my row is not here" is `All of {industry}`, which drops the primary ordering
     * signal this control exists to capture.
     *
     * Pane A stays a hard filter, and the asymmetry is the point: pane A answers WHICH
     * INDUSTRY, where narrowing 24 rows to a handful is the whole job; pane B answers
     * which sub-industry inside an industry the visitor has already committed to, where
     * the full set IS the decision context and the query is only a hint about where to
     * look first.
     */
    const { matched, others } = partitionByMatch(
      branchChildren,
      filtering ? (child) => rowMatches(child.value) : null,
    );

    const childRow = (child: SelectOption): Row => ({
      kind: "option",
      rowId: child.value,
      value: child.value,
      label: child.label,
      parent: branch,
      branching: false,
      whole: false,
    });

    const rows: Row[] = [
      {
        kind: "option",
        rowId: `whole-${branch}`,
        value: branch,
        label: `All of ${branchMeta.label}`,
        branching: false,
        whole: true,
      },
    ];
    rows.push(...matched.map(childRow));
    /**
     * The breaker, and it is drawn ONLY when both groups exist.
     *
     * With every child matched there is nothing on the far side of it, and with none
     * matched nothing was hoisted — in both cases a heading would be labelling a
     * division that is not there. `matched.length` is what gates it rather than
     * `filtering`, so all three states fall out of one condition. Measured cases:
     * `education` matches both of Education's children, `wholesale` matches neither of
     * Wholesale's.
     *
     * It does not name the industry. The pane's own header sits OUTSIDE the scroll
     * container, so the industry is permanently on screen directly above this row, and
     * "Other sub-industries in Architecture, Engineering, & Construction" wraps in a
     * 400px pane.
     */
    if (matched.length > 0 && others.length > 0) {
      rows.push({
        kind: "heading",
        rowId: `others-${branch}`,
        label: `Other ${childLabel ?? "options"}`,
      });
    }
    rows.push(...others.map(childRow));
    return rows;
    // `branchChildren` is derived from `branchMeta`, which is derived from `branch`;
    // `rowMatches` from `tokens` and `index`. `childLabel` is a prop and is listed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branch, branchMeta, tokens, index, childLabel]);

  const options = (rows: readonly Row[]) =>
    rows.filter((row): row is Extract<Row, { kind: "option" }> => row.kind === "option");

  const paneAOptions = useMemo(() => options(paneA), [paneA]);
  const paneBOptions = useMemo(() => options(paneB), [paneB]);

  const inPaneB = paneBOptions.some((row) => row.rowId === activeRowId);
  /** The keyboard's world is ONE pane at a time — the pane the active row is in. */
  const navigable = inPaneB ? paneBOptions : paneAOptions;
  const activeRow = navigable.find((row) => row.rowId === activeRowId);

  const selected = value ? index.map.get(value) : undefined;
  const selectedLabel = selected
    ? selected.parentLabel
      ? // Both halves, because a sub-industry alone does not say which industry it
        // sits in — and the field's own label only names the first level.
        `${selected.parentLabel} · ${selected.label}`
      : selected.label
    : undefined;

  // A stable DOM id per row, so `aria-activedescendant` has something to point at.
  // Encoded, because a country name contains spaces and an industry contains an
  // ampersand — both illegal in an id and both silently break the reference.
  const rowDomId = (rowId: string) =>
    `${listId}-${encodeURIComponent(rowId).replace(/%/g, "_")}`;

  // Read during effects that must not re-run when these change. See the open
  // effect below for why keying on `value` is wrong now that a commit can happen
  // without the panel closing.
  const latest = useRef({ value, paneAOptions });
  latest.current = { value, paneAOptions };

  function close(returnFocus = true) {
    setOpen(false);
    setFilter("");
    setActiveRowId(null);
    if (returnFocus) trigger.current?.focus();
  }

  function commit(row: Extract<Row, { kind: "option" }>) {
    onChange(row.value, row.parent);
    close();
  }

  /**
   * A press or Enter on a first-pane row.
   *
   * Three outcomes, and the third is the one worth naming: pressing the row of a
   * branch that is ALREADY open commits and closes. Otherwise the only way to
   * confirm a broad answer would be to travel into the second pane for it, and a
   * visitor who has just pressed "Retail" twice has said what they mean.
   */
  function activate(row: Extract<Row, { kind: "option" }>) {
    if (!row.branching) {
      commit(row);
      return;
    }
    if (branch === row.value) {
      commit(row);
      return;
    }
    setBranch(row.value);
    // Commit the industry now rather than on the way out. The trigger updates, so
    // the answer visibly took, and any of the four exits leaves it standing.
    onChange(row.value, undefined);
  }

  // Click outside. `pointerdown` rather than `click`, so a press that starts
  // outside closes the panel before the click lands on whatever is under it.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!wrapper.current?.contains(event.target as Node)) close(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  /**
   * Focus the filter on open so typing works immediately, which is the whole point
   * of having one, and put the keyboard on the row the current answer sits in.
   *
   * **Except where focusing an input raises a keyboard over the list it was opened to
   * show — see `hasVirtualKeyboard`.** On a phone the panel and the software keyboard
   * arrive together, and the keyboard takes about half the viewport: the visitor pressed
   * a control to see options and got three of them under a keyboard they did not ask
   * for. So a coarse pointer gets the panel and nothing else, and the filter takes focus
   * only when it is pressed — which is the moment a visitor has actually asked to type.
   * Nothing else about the panel changes: the trigger keeps focus, so it still handles
   * every arrow, Enter, Escape and Home/End the same way, and `onKeyDown` is on both
   * elements already.
   *
   * An effect rather than a call beside `setOpen`, because the input does not exist
   * until React has committed the panel — the same trap the phase machine documents
   * in `tool.tsx`.
   *
   * **Keyed on the open transition ALONE, and `value` is deliberately not a
   * dependency.** Choosing an industry now commits without closing, so a `value` in
   * the deps would re-run this on that commit and immediately drag the active row
   * back to the top of the first pane — the pane the visitor has just left. The
   * current answer is read through a ref instead.
   *
   * **The panel opens with NO branch open, even when the answer is a sub-industry**,
   * and re-opening the visitor's branch for them was tried and is worse. A visitor
   * re-opening this control is usually there to change the INDUSTRY, and pre-opening a
   * branch puts the industry list behind a pane below `md` and into a single column
   * above it — in both cases narrowing the thing they came back for. It also loses
   * nothing: the trigger already reads "Retail · Apparel & Footwear Brand", so the
   * narrower answer is on screen either way, and the industry it belongs to is where
   * the keyboard lands.
   */
  useEffect(() => {
    if (!open) return;
    if (showFilter && !hasVirtualKeyboard()) filterInput.current?.focus();
    const current = latest.current.value;
    const meta = current ? index.map.get(current) : undefined;
    setBranch(null);
    // A sub-industry has no row in the first list, so the keyboard goes to the
    // industry that owns it.
    const target = meta?.parent ?? current;
    setActiveRowId(
      (target
        ? latest.current.paneAOptions.find((row) => row.value === target)?.rowId
        : undefined) ?? (latest.current.paneAOptions[0]?.rowId ?? null),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, showFilter]);

  /**
   * Bring the open panel into view.
   *
   * **The bug this fixes.** The panel always opens downward and never flips, so a
   * visitor who opens the industry control with the card's lower half below the fold
   * saw the first three rows of thirty and nothing telling them there were more. It
   * was not clipped — the panel extends the document and the page can be scrolled —
   * which is worse than clipping, because a list cut off exactly at the window edge
   * looks like the whole list. At 390px wide it showed one row.
   *
   * **Why this is allowed, when reading scroll position is not.** The public screens
   * may not run scroll LISTENERS or `IntersectionObserver` against their own viewport,
   * because the tool is framed and the parent decides what is on screen — an observer
   * fires for content the visitor cannot see. `scrollIntoView` is the opposite
   * direction of travel: it reads nothing and reports nothing, it asks the browser to
   * reveal an element in whatever scrollport actually contains it. The rule was being
   * read one step stronger than it is, and the panel's own "keep the active row in
   * view" effect below has always relied on the same call.
   *
   * It is also correctly inert in the embed. A frame sized to its own content by
   * `postMessage` has no scrollport of its own, so there is nothing to scroll and this
   * is a no-op — which is right, because in that case the panel cannot be cut off by
   * the frame either. What it fixes is every context where our viewport IS the
   * visitor's: the tool opened directly, an in-house deployment served from ansr.com
   * without a frame, and a frame embedded before the height snippet was added.
   *
   * `block: "nearest"` scrolls by the minimum needed and does nothing at all when the
   * panel already fits, so it cannot move the page under a visitor who did not need
   * it. No `behavior: "smooth"`: the panel's own 160ms entrance is the motion for this
   * moment, and a second easing curve running against it reads as the page lurching.
   *
   * **Keyed on `open` alone, and it used to need `branch` too.** While the cascade pane
   * was positioned outside the panel's border box it could extend past whatever the
   * browser had just revealed, so opening a branch had to re-ask — and the reveal had
   * to target the PANE rather than the panel to mean anything. The pane is a flex
   * sibling inside the body now and the body's height is fixed, so the panel's
   * rectangle is the whole popup at every state and one call covers it.
   */
  useEffect(() => {
    if (!open) return;
    panel.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [open]);

  // Keep the active row in view. `block: "nearest"` so it scrolls its pane by the
  // minimum, rather than jumping the row to the middle on every keystroke.
  useEffect(() => {
    if (!open || !activeRowId) return;
    const node = panel.current?.querySelector(`#${CSS.escape(rowDomId(activeRowId))}`);
    node?.scrollIntoView({ block: "nearest" });
    // `rowDomId` is derived from `listId`, which is stable for this component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeRowId]);

  function move(delta: number) {
    if (navigable.length === 0) return;
    const at = navigable.findIndex((row) => row.rowId === activeRowId);
    const next = at === -1 ? 0 : Math.min(Math.max(at + delta, 0), navigable.length - 1);
    setActiveRowId(navigable[next]?.rowId ?? null);
  }

  /** Leaves the branch pane: the parent row keeps the keyboard, the pane closes. */
  function leaveBranch() {
    const parent = branch;
    setBranch(null);
    setActiveRowId(parent);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        setOpen(true);
      }
      return;
    }
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        move(1);
        break;
      case "ArrowUp":
        event.preventDefault();
        move(-1);
        break;
      // Right and Left are the tree pattern's own expand and collapse, and they are
      // the only way the keyboard reaches the second pane — the chevron is a pointer
      // affordance and nothing inside the popup's tree is focusable. Since the pane
      // opens trailing-side, the binding and the direction on screen agree.
      case "ArrowRight": {
        if (inPaneB || !activeRow?.branching) break;
        event.preventDefault();
        if (branch === activeRow.value) setActiveRowId(paneBOptions[0]?.rowId ?? null);
        else activate(activeRow);
        break;
      }
      case "ArrowLeft":
        if (!inPaneB) break;
        event.preventDefault();
        leaveBranch();
        break;
      case "Home":
        event.preventDefault();
        setActiveRowId(navigable[0]?.rowId ?? null);
        break;
      case "End":
        event.preventDefault();
        setActiveRowId(navigable[navigable.length - 1]?.rowId ?? null);
        break;
      case "Enter":
        event.preventDefault();
        if (activeRow) activate(activeRow);
        break;
      case "Escape":
        event.preventDefault();
        close();
        break;
      case "Tab":
        // Let focus leave naturally, but do not leave a panel open behind it.
        close(false);
        break;
      default:
        break;
    }
  }

  /** One row, in either pane. */
  function renderRow(row: Extract<Row, { kind: "option" }>) {
    const isSelected = row.value === value && (row.whole ? !selected?.parent : true);
    const isActive = row.rowId === activeRowId;
    const isOpenBranch = row.branching && branch === row.value;
    /** In the cascade pane rather than the first list. Both of its rows qualify. */
    const inPane = row.whole || row.parent !== undefined;

    return (
      <div
        key={row.rowId}
        id={rowDomId(row.rowId)}
        role={nested ? "treeitem" : "option"}
        /**
         * **Named explicitly, and `aria-owns` is why it has to be.** A row's name is
         * otherwise computed from its contents — and an element that owns a subtree
         * owns it in the ACCESSIBILITY tree, so the moment a branch opened, the
         * parent row's name became the industry followed by every row in the pane it
         * had just opened. A screen reader would have announced the whole cascade as
         * the name of the row that opened it.
         *
         * Every row carries it rather than only the branching ones, so one row's name
         * is not computed by a different mechanism from its neighbour's — which is
         * also what keeps the count chip out of the name without depending on its
         * `aria-hidden`.
         */
        aria-label={row.label}
        aria-selected={isSelected}
        // Position in the tree, not which value the row commits. The pane's leading
        // row commits the INDUSTRY and still sits inside the owned group, so it is a
        // level-2 node — announcing it as level 1 would describe a group whose first
        // child claims to be a sibling of the item that owns it.
        aria-level={nested ? (row.parent || row.whole ? 2 : 1) : undefined}
        aria-expanded={row.branching ? isOpenBranch : undefined}
        // The branch pane lives in a different box from the row that owns it, so
        // the DOM cannot express the containment and `aria-owns` does instead.
        aria-owns={isOpenBranch ? groupId : undefined}
        // `pointerdown`, so the row acts before the click-outside handler can see
        // the press.
        onPointerDown={(event) => {
          event.preventDefault();
          activate(row);
        }}
        onPointerEnter={() => setActiveRowId(row.rowId)}
        className={cn(
          "gcc-select-row",
          isActive && "gcc-select-row--active",
          isOpenBranch && "gcc-select-row--branch",
          /**
           * **Selected is weight plus ink, and there is no longer a check glyph.**
           *
           * The check was the second signal beside the weight, and it was removed at
           * ANSR's request for a reason worth keeping written down: it was reserved on
           * EVERY row whether it was drawn or not, because a glyph that appears only on
           * the selected row shifts that row's label by 22px. So all 24 industries and
           * all 201 countries paid its width, the labels started 22px inside the tier
           * heading and the hint above them, and what it bought was a mark on the one
           * row a visitor had already chosen — which the trigger above the panel is
           * also displaying, in full. It cost alignment everywhere to restate an
           * answer once.
           *
           * **Both signals are in `.gcc-select-row--selected` rather than as utilities
           * here**, because the utility version silently did not work: `globals.css` is
           * unlayered and Tailwind's utilities are layered, so `.gcc-select-row`'s own
           * `color` beat `text-accent-teal` and the row rendered plain black. The weight
           * worked only because nothing in that rule sets `font-weight`. `aria-selected`
           * is on every row regardless, so the assistive reading never depended on
           * either.
           */
          isSelected && "gcc-select-row--selected",
        )}
      >
        {/* **A row in a COLUMN wraps; a row in a full-width single-column list
            truncates.** A truncated option costs the visitor the ability to tell two
            of them apart, which is the whole job here — so an ellipsis is only
            acceptable where the row has the panel's full width and the label is
            genuinely exceptional. In a column it is the common case: at `md` the body
            is 592px, so a half of it is 296px and the three longest industry names and
            half the sub-industry names run past it. `break-inside: avoid` on the row
            keeps a wrapped label whole rather than splitting it across a column break. */}
        <span
          className={cn("min-w-0 flex-1", inPane || wide ? "text-pretty" : "truncate")}
        >
          <HighlightedLabel label={row.label} tokens={tokens} />
        </span>
        {row.branching ? (
          // **`aria-hidden`, and the count is the reason.** A `treeitem`'s accessible
          // name is computed from its contents, so a visible "10" beside the label
          // would make the row's name "Retail 10" — which breaks every exact-name
          // lookup, including a visitor's screen reader announcing the industry they
          // are on. The state it hints at is already carried properly by
          // `aria-expanded`, and the pane's own header says the count out loud once
          // it is open.
          // `.gcc-select-cue` groups the count and the chevron so the two take the
          // accent together on the active row. One element, one colour transition —
          // a cue whose halves change at different times reads as a fault.
          <span aria-hidden="true" className="gcc-select-cue">
            {/* How many narrower choices are behind the row. Says a branch exists
                and how deep it is, which a bare chevron does not. */}
            <span className="gcc-select-count">{index.map.get(row.value)?.children?.length}</span>
            {/* One direction at every width now that the pane opens trailing-side: it
                appears to the right beside the list, and slides in from the right as a
                drill-in. It also agrees with ArrowRight, which is what the tree
                pattern binds to "deeper". */}
            <ChevronRight aria-hidden="true" className="size-3.5" />
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div ref={wrapper} className="relative">
      <button
        id={id}
        // One callback feeding two consumers. React allows a single `ref` per
        // element, so the panel's own handle and the form's validation handle have
        // to be assigned together — passing `triggerRef` as a second `ref` prop
        // would silently replace the first.
        ref={(node) => {
          trigger.current = node;
          triggerRef?.(node);
        }}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        // Read from the same flag as the popup's own role, so the promise and the
        // thing it describes cannot drift apart.
        aria-haspopup={nested ? "tree" : "listbox"}
        aria-activedescendant={open && activeRowId ? rowDomId(activeRowId) : undefined}
        aria-invalid={invalid ? true : undefined}
        aria-describedby={describedBy}
        disabled={disabled}
        onClick={() => (open ? close() : setOpen(true))}
        onKeyDown={onKeyDown}
        className={cn(
          "gcc-field flex h-12 w-full min-w-0 items-center justify-between gap-2 px-4",
          "text-start text-base font-light text-text outline-none",
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        {/* The placeholder is muted and the chosen value is not, so "unanswered"
            survives greyscale rather than being carried by position alone. */}
        <span className={cn("truncate", !selectedLabel && "text-text-muted")}>
          {selectedLabel ?? placeholder}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "size-4 shrink-0 transition-[transform,color] duration-fast ease-standard",
            open ? "rotate-180 text-accent-teal" : "text-text-muted",
          )}
        />
      </button>

      {open ? (
        <div
          ref={panel}
          // Absolute, not fixed — see the note at the top of this file. `z-20` so it
          // clears the fields below it; the BAND carries `z-10` for the same reason
          // one level up, because the card's own entrance transform makes it a
          // stacking context this cannot escape. See `peer-view.tsx`.
          //
          // **No `overflow-hidden`, deliberately.** It was there to clip the children
          // to the rounded corners, and it also clipped the filter input's focus ring
          // to a stray sliver along one edge — a visible focus indicator half-drawn
          // looks like a rendering fault rather than focus. It would now also clip
          // the branch pane, which is a child and sits outside this box entirely.
          // Rounding moves onto the children instead, so nothing needs clipping.
          //
          // `.gcc-select-panel` carries the entrance, the elevation and the halo. The
          // elevation is the point rather than the polish: this popup overhangs the
          // form card and lands on the customer-logo strip, so at the card's own
          // shadow weight it read as PART of the page behind it — the logos beside it
          // at the same height looked like they were showing through. It is opaque
          // and always was; what it lacked was any evidence of being in front.
          className={cn(
            "gcc-select-panel absolute inset-x-0 top-full z-20 mt-2",
            // Widens leading-side to the whole form grid from `md`. See the `wide`
            // prop and `.gcc-select-panel--wide`, where the one measurement is.
            wide && "gcc-select-panel--wide",
          )}
        >
          {showFilter ? (
            // `.gcc-select-filter` carries the ground and the focus treatment. The
            // global focus ring is the brand orange, and on a field that is focused
            // the moment the panel opens that drew an orange box around the search
            // row every single time — the one persistent orange on a screen whose
            // rule is one per band, spent on a filter rather than on the submit. The
            // class replaces it with a rule along the row's own bottom edge, which is
            // a focus indicator that belongs to the control instead of boxing it.
            <div className="gcc-select-filter">
              <Search aria-hidden="true" className="gcc-select-filter__icon size-4" />
              <input
                ref={filterInput}
                type="text"
                value={filter}
                // Not a search landmark and not a form field of its own: it filters
                // the list beside it and submits nothing.
                aria-label={`Filter ${index.count} options`}
                autoComplete="off"
                onChange={(event) => setFilter(event.target.value)}
                onKeyDown={onKeyDown}
                placeholder={copy.askFilterPlaceholder}
                // 40px and 14px, down from 48 and 16. The chrome above the options is
                // height taken off the options themselves, and this row is a filter
                // rather than a field a visitor has to fill in — it keeps a 40px
                // target, which is what a control inside an already-open popup needs
                // rather than the 44px floor for a control on the page.
                className="h-10 w-full bg-transparent ps-8 pe-3 text-sm font-light text-text outline-none"
              />
            </div>
          ) : null}

          {hint ? (
            <p id={hintId} className="gcc-select-hint">
              {hint}
            </p>
          ) : null}

          {/* **The body is a FIXED-HEIGHT flex row, and the fixed height is the
              invariant.** Both panes stretch to it, so the panel is exactly as tall
              open as closed — which is what the cascade replaced an expanding indent
              to get, and what stops a popup already overhanging the card growing
              further into the logo strip under the pointer. It is also the containing
              block for the drill-in below `md`. See `.gcc-select-body`. */}
          <div className="gcc-select-body">
            {/* The scrollport, separate from the multi-column region inside it. They
                cannot be one element: a multi-column box with a definite height
                becomes a fragmentainer and overflows in the INLINE direction, adding
                columns rather than scrolling. With the height on the wrapper and the
                columns at height auto, the content balances into equal columns and the
                wrapper scrolls if the result is taller than the body. */}
            <div className="gcc-select-scroll">
              <div
                id={listId}
                role={nested ? "tree" : "listbox"}
                aria-label={placeholder}
                aria-describedby={hint ? hintId : undefined}
                className={cn(
                  "gcc-select-cols gcc-select-cols--multi",
                  columns === 3 && "gcc-select-cols--3",
                  // A branch takes half the body, so the list beside it is one column.
                  branch && "gcc-select-cols--single",
                )}
              >
                {paneAOptions.length === 0 ? (
                  <p className="gcc-select-empty">
                    {fillTemplate(copy.filterEmpty, { query: filter.trim() })}
                  </p>
                ) : (
                  paneA.map((row) =>
                    row.kind === "heading" ? (
                      <p
                        key={row.rowId}
                        // Presentational in the tree, because a tree's only legal
                        // grouping is a `group` under a `treeitem` — and these tiers
                        // group SIBLINGS. They are a scanning aid rather than
                        // information: the order they impose is already the order the
                        // rows are read in.
                        role="presentation"
                        className="gcc-select-heading"
                      >
                        {row.label}
                      </p>
                    ) : (
                      renderRow(row)
                    ),
                  )
                )}
              </div>
            </div>

            {branch && branchMeta ? (
              // The cascade. A flex sibling from `md`, taking the trailing half of the
              // body; an absolute overlay over the first pane below it, where half a
              // field's width is unusable.
              <div className="gcc-select-pane">
                {/* A real button, not a decorated div. Focus moving inside the popup is
                    already the established shape here — the filter input is focusable
                    and inside the same panel — and a back affordance a touch screen
                    reader cannot reach would be the only way out of the drill-in for
                    the visitors least able to guess at one. */}
                <button
                  type="button"
                  onClick={leaveBranch}
                  className="gcc-select-pane__head"
                  aria-label={`Close ${branchMeta.label} ${childLabel ?? "options"}`}
                >
                  {/* Drawn only in the drill-in, where this header is the sole way back.
                      Beside the list it came out of, a back arrow would be pointing at
                      something still on screen. */}
                  <ChevronLeft
                    aria-hidden="true"
                    className="gcc-select-pane__back size-3.5 shrink-0"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-text">
                      {branchMeta.label}
                    </span>
                    {childLabel ? (
                      <span className="block text-xs font-light text-text-muted">
                        {branchChildren.length} {childLabel}
                      </span>
                    ) : null}
                  </span>
                </button>
                <div className="gcc-select-scroll">
                  <div
                    id={groupId}
                    role="group"
                    aria-label={branchMeta.label}
                    // No `--multi`: the pane is already half the body, so a second
                    // column inside it would be 148px at `md`.
                    className="gcc-select-cols"
                  >
                    {/* **No empty state here any more, and it is deleted rather than
                        left unreachable.** It said "No sub-industries match X" and it
                        could only fire while the filter CUT this pane. The filter ranks
                        it now, so every child is always present — a "nothing matches"
                        note beside fifteen visible rows is a false statement, and the
                        `wholesale` → Wholesale case (neither child matches) is exactly
                        where it used to fire. Pane A keeps its own empty state, which is
                        still reachable. */}
                    {paneB.map((row) =>
                      row.kind === "heading" ? (
                        /* The "others" breaker. `presentation` for the same reason
                           pane A's tier headings are: a tree's only legal grouping is
                           a `group` under a `treeitem`, and this divides SIBLINGS. It
                           is a scanning aid — the order it marks is already the order
                           the rows are read in, and `options()` strips it so the
                           keyboard steps straight from the last hit to the first
                           other. */
                        <p
                          key={row.rowId}
                          role="presentation"
                          className="gcc-select-heading"
                        >
                          {row.label}
                        </p>
                      ) : (
                        renderRow(row)
                      ),
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
