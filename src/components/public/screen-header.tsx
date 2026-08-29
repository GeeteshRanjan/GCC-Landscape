"use client";

import { Pencil } from "lucide-react";

import { AnsrWordmark } from "@/components/screen1/ansr-wordmark";
import { cn } from "@/lib/utils";

/**
 * The compact teal CONTEXT AREA both result screens open with, and the connected
 * tab strip that hands off to the white content surface below it.
 *
 * **This replaced a full display hero, and the replacement is the point rather
 * than a side effect.** Both result screens used to open on a 200px-tall teal band
 * carrying a kicker, a 72px headline stating the finding, a two-line lead, the
 * visitor's answers as a run of `dt`/`dd` pairs and a pill switch — so the first
 * thing a visitor saw after submitting a form was a second piece of marketing, and
 * the first actual figure was a scroll away. On a tool embedded in a marketing page
 * that is the host page's scroll being spent restating what the visitor just did.
 *
 * What the teal area is for now is exactly two things: saying which product this
 * is, and showing the profile the answer was computed from as something the visitor
 * can act on. Everything else moved down into the evidence.
 *
 * **Three consequences worth knowing before editing this file.**
 *
 *   - **The `h1` is the product, not the finding.** `ProductIdentity` renders it,
 *     so it is the same heading on both result screens — which is correct here and
 *     would not be on a page with routes: the two views are two readings of one
 *     result, and the view a visitor is in is stated by the selected tab's
 *     `aria-selected` rather than by a heading that changes under them. The finding
 *     itself is announced through the live region each screen renders.
 *   - **Focus moves to the TAB PANEL on a phase change, not to the `h1`.** With one
 *     shared product heading, focusing it would announce nothing new. A panel named
 *     by its own tab announces "Peer landscape, tab panel", which is the phase
 *     change said out loud. See `tool.tsx`.
 *   - **The band has no bottom padding**, because the selected tab has to be
 *     physically continuous with the content surface beneath it. There is nothing
 *     to tune between them; if a gap appears, something has added padding.
 */

export interface HeaderMotif {
  /** A file under `public/brand/`, already adapted. */
  src: string;
  /** Intrinsic size, so the box reserves the right ratio before the SVG lands. */
  width: number;
  height: number;
  /**
   * The placement class: where the motif is anchored and how it is masked. One
   * per screen, in globals.css, because the anchor depends on where that screen's
   * text actually is.
   */
  placement: string;
}

/**
 * The teal band: identity, context panels, then the tab strip flush at its foot.
 *
 * `children` is the identity and the panels; `tabs` is the strip. They are separate
 * props rather than one children list because the strip is the only thing in here
 * that must sit outside the band's vertical padding, and a caller that put it in
 * the wrong order would break the connection to the content surface silently.
 */
export function ScreenHeader({
  motif,
  tabs,
  children,
}: {
  motif: HeaderMotif;
  tabs: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    // The brand's own teal gradient — a fitted token (radial teal over teal-deep),
    // so this is the brand's actual display ground rather than a colour picked to
    // look rich. Its contrast contract holds without a per-placement measurement:
    // the brightest point is `--ansr-teal-700`, and every ink allowed on an inverse
    // ground clears AA across the whole band.
    //
    // `pb-0` is load-bearing. See the file comment.
    <div className="gcc-ground-gradient relative overflow-hidden pt-10 pb-0 md:pt-14">
      {/* Decorative and redundant: everything it could convey is in the text
          beside it. Out of the tab order and out of the accessibility tree. */}
      <div
        className={cn(
          "ansr-motif gcc-motif-inverse hidden md:block",
          motif.placement,
        )}
        aria-hidden="true"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- decorative,
            fixed intrinsic ratio, and not worth an optimiser round trip. */}
        <img
          src={motif.src}
          alt=""
          width={motif.width}
          height={motif.height}
          className="block h-auto w-full"
        />
      </div>
      {/* **A second ornament layer, and it is generated rather than placed.** The
          band carried exactly one motif and a flat gradient, which is why it read as
          a coloured strip with a logo on it. This adds the brand's own pin field as a
          fine dot lattice along the leading edge — behind the copy, at a strength
          measured so it cannot lift the local ground under white text. See
          `.gcc-header-lattice`. */}
      <div aria-hidden="true" className="gcc-header-lattice" />
      <div className="relative mx-auto max-w-content px-6 md:px-12">
        <div className="flex flex-col gap-6 md:gap-7">{children}</div>
        {/* Outside the gap stack and hard against the band's bottom edge, so the
            selected tab's white fill is continuous with the content surface. */}
        <div className="mt-7 md:mt-9">{tabs}</div>
      </div>
    </div>
  );
}

/**
 * The finding, as the band's own display line.
 *
 * **The band had no sentence in it at all, and that is what made it boring rather
 * than compact.** Cutting the old display hero was right — a 200px marketing
 * headline restating the form was the host page's scroll spent on nothing — but the
 * pass that cut it left the band holding a lockup and a row of answers, which is
 * chrome and no content. A visitor who had just submitted a form was told what
 * product they were in and what they had typed, and nothing about the result.
 *
 * So the finding comes back, at a fraction of the size the hero used: one line, one
 * claim, `text-3xl` to `text-4xl` rather than 72px, under a lockup that stays the
 * `h1`. It is deliberately NOT a heading — the `h1` is the product and is identical
 * on both result screens, and a second heading here would put the finding into the
 * document outline where a phase change would silently rewrite it. Screen readers
 * get the finding from each screen's own live region, which is unchanged.
 *
 * White ink only. `--ansr-text-inverse-muted` is legal on this gradient, but the
 * line is the band's subject and a muted subject under a coloured lockup inverts
 * the hierarchy.
 */
export function HeaderFinding({ children }: { children: React.ReactNode }) {
  return (
    <p className="max-w-lead text-2xl leading-tight font-light tracking-body text-balance text-text-inverse md:text-3xl lg:text-4xl">
      {children}
    </p>
  );
}

/**
 * `ANSR. GCC Intelligence` — the product lockup, and the `h1` of both result
 * screens.
 *
 * **The wordmark is drawn, the rest is typed, and the weight is measured off the
 * mark rather than chosen.** `AnsrWordmark`'s stem is 0.137 of its cap height,
 * which is the display face's Medium 500, and its sidebearings are normal rather
 * than `tracking-display`'s -0.02em — so a Bold heading beside it is two fonts on
 * one line. Same rule as the entry point's headline and the impact band's, and the
 * only three places a drawn mark sits in a line of type.
 *
 * The period after the mark is TYPED, in the action orange, because the lockup's
 * artboard has no punctuation in it. It is inside the accessible name deliberately:
 * the heading reads "ANSR. GCC Intelligence", which is the product's name, and a
 * mark whose `sr-only` text said only "ANSR" would leave the heading reading
 * "ANSR GCC Intelligence" — a different string from the one on the page.
 */
export function ProductIdentity({ id }: { id: string }) {
  return (
    <h1
      id={id}
      // **Down a step, from 24/30px to 20/24px, because the band now has a subject
      // and the lockup is not it.** The product name was the largest type in the band
      // when it was the only type in the band; with the finding under it at 36px, a
      // 30px lockup competed with the sentence it introduces. Small caps-adjacent
      // scale is the right register for a product label above a claim — the reference
      // does the same thing, and it is why the lockup reads as a mark rather than as
      // a headline.
      className="flex items-baseline text-xl leading-tight font-medium tracking-body text-text-inverse md:text-2xl"
    >
      {/* Orange on the gradient's darker half, where the copy sits. The wordmark
          inherits the ink of the span it is in, which is what makes it one decision
          with the period rather than two. */}
      {/**
       * **The period is part of the product's name and travels inside the wordmark's
       * label, not as a text node beside it.** Name-from-content inserts whitespace at
       * element boundaries, so a typed period after the mark computed the heading's
       * accessible name as "ANSR . GCC Intelligence" — correct on screen, wrong read
       * aloud. The visible period is therefore `aria-hidden` and the mark's own hidden
       * label carries "ANSR.". Verified with an aria snapshot rather than reasoned
       * about.
       */}
      <span className="text-action">
        <AnsrWordmark label="ANSR." />
        <span aria-hidden="true">.</span>
      </span>
      <span className="ps-2">GCC Intelligence</span>
    </h1>
  );
}

/**
 * One answer, read back: a small caps label and the value, in a rounded pill.
 *
 * **These stopped being controls, and that is a reversal of the previous pass.**
 * Each answer used to be a full-width button with a chevron or a pencil on it, on
 * the argument that the thing which is wrong should be the thing you press. What
 * that produced on screen was four large, bordered, chevroned cells directly under
 * the product name — the loudest element in the band, reading as four dropdowns
 * the visitor was expected to operate. The chevron in particular promised an
 * in-place editor that does not exist: every one of them left the page for the
 * form. Four affordances for one destination.
 *
 * So the answers are a summary again, and the way back is one explicit button
 * beside them — see `ContextPanels`. The pill is deliberately quiet: pill radius,
 * no chevron, no hover state, and small enough that it reads as a caption on the
 * band rather than as a control on it.
 *
 * **The fill is a translucent BLACK, not white, and that is a contrast decision
 * rather than a style one.** A white overlay lightens the gradient underneath and
 * pushes `--ansr-text-inverse-muted` to roughly 2.5:1, so the label would have to
 * become pure white and compete with the value it labels. Black recedes instead:
 * white lands near 11:1 and the muted label near 4.8:1. `.gcc-context-pill` in
 * globals.css carries it, and it degrades across the whole radial gradient without
 * a per-placement measurement because it is a relative darken.
 */
function ContextPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="gcc-context-pill inline-flex max-w-full items-baseline gap-2 px-3.5 py-1.5">
      <span className="shrink-0 text-[0.6875rem] font-semibold tracking-caps text-text-inverse-muted uppercase">
        {label}
      </span>
      {/* `truncate` with a `min-w-0` parent: "Consumer Packaged Goods" and
          "Above $20 Bn" are very different lengths, and a long industry name must
          shorten rather than push the row onto another line. The full value is
          always in the group's own reading order either way, and the form behind
          the change button holds it verbatim. */}
      <span className="min-w-0 truncate text-sm font-medium text-text-inverse">
        {value}
      </span>
    </span>
  );
}

export interface ContextFact {
  label: string;
  value: string;
}

/**
 * The answers as a row of pills, with ONE control beside them.
 *
 * **One button, not four.** All four answers only ever led to the same place — the
 * form, with the answers intact — so four separate affordances were four ways to
 * ask for one thing, and the chevron on three of them implied an editor that does
 * not exist. The single control says exactly what it does and where it goes, which
 * is what the four accessible names were individually having to explain.
 *
 * The row wraps rather than dividing into a grid of equal cells. Equal columns
 * forced a two-word revenue band to occupy the same width as a four-word industry
 * name, which is what made the group read as a form; pills sized to their own
 * content read as a summary. The control sits at the trailing end on desktop and
 * falls under the pills on a phone, where a trailing control would be off the edge
 * of a wrapped row.
 *
 * A company pill is only rendered when the visitor typed a name, since that field
 * is optional on the form.
 */
export function ContextPanels({
  facts,
  onEdit,
}: {
  facts: readonly ContextFact[];
  onEdit: () => void;
}) {
  return (
    <div
      role="group"
      aria-label="Your profile, as you entered it"
      className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-6"
    >
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {facts.map((fact) => (
          <ContextPill key={fact.label} label={fact.label} value={fact.value} />
        ))}
      </div>
      {/* **"Change my answers", and the wording is the point of the control.** It
          names the thing the visitor typed rather than the tool's word for it —
          "Edit profile" implied a stored account, which this tool does not have and
          must not imply. `shrink-0` so a long industry name never squeezes the label
          onto two lines. */}
      <button
        type="button"
        onClick={onEdit}
        className="gcc-context-edit group inline-flex shrink-0 items-center gap-2 self-start px-4 py-2 text-sm font-semibold text-text-inverse md:self-auto"
      >
        <Pencil aria-hidden="true" className="size-3.5 shrink-0" />
        Change my answers
      </button>
    </div>
  );
}

/* ==========================================================================
   The view tabs
   ========================================================================== */

/**
 * The two view names, here rather than in either screen's `copy.ts`.
 *
 * They are the one pair of strings that belongs to neither screen alone: both
 * screens render both labels, so holding them in one screen's copy file would make
 * that screen the owner of the other's name — and the failure mode is the switch
 * disagreeing with itself about what the visitor is looking at. Deliberately not
 * "Screen 1" and "Screen 2", which are our words for them and not anyone else's.
 */
const VIEW_LABELS = {
  peers: "Peer Landscape",
  functions: "Function Opportunity",
} as const;

export type ViewKind = keyof typeof VIEW_LABELS;

const VIEW_ORDER: readonly ViewKind[] = ["peers", "functions"];

/** Stable ids, so a tab and its panel can point at each other across two files. */
export const viewTabId = (view: ViewKind) => `view-tab-${view}`;
export const viewPanelId = (view: ViewKind) => `view-panel-${view}`;

/**
 * The two result views, as one connected tab strip at the foot of the teal band.
 *
 * **This was a pill-shaped segmented control and the change is structural rather
 * than decorative.** A floating pill said "here is a small setting"; the tool has
 * exactly two analytical views and choosing between them is the primary act on the
 * page. So the tabs are full-height, they divide the whole container width, and the
 * selected one is the same white surface as the content under it — the tab and the
 * page are one layer, which is what makes the content read as belonging to the tab
 * rather than as a section that happens to follow it.
 *
 * **Real tab semantics, with MANUAL activation.** `role="tablist"` with a roving
 * tabindex, arrow keys plus Home/End to move focus, Enter or Space to activate.
 * Manual rather than automatic because activating swaps the entire screen: arrowing
 * across with automatic activation would tear the page down and rebuild it under a
 * visitor who was only looking. `aria-controls` is set on the selected tab alone,
 * since the inactive view's panel is genuinely not mounted — there is one result on
 * the page at a time, and pointing at an absent id would be a broken reference
 * rather than a hidden panel.
 *
 * **Selected state is never carried by colour alone.** `aria-selected` is the
 * machine reading; the white surface, the weight change and the orange rule are
 * three redundant visual ones.
 *
 * Deliberately NOT sticky, and that is an iframe constraint rather than a
 * preference: the tool negotiates its height with the parent and never owns a
 * scroll container, so a pinned strip would fix itself to a viewport the visitor
 * may not be looking at.
 */
export function ViewTabs({
  current,
  onSwitch,
  icons,
}: {
  current: ViewKind;
  /** Called with the view being moved to. The tool owns the phase. */
  onSwitch: (view: ViewKind) => void;
  /** One line icon per view, supplied by the caller so this file draws no glyphs. */
  icons: Record<ViewKind, React.ReactNode>;
}) {
  const move = (from: number, to: number) => {
    const next = VIEW_ORDER[(to + VIEW_ORDER.length) % VIEW_ORDER.length];
    if (!next || next === VIEW_ORDER[from]) return;
    document.getElementById(viewTabId(next))?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        move(index, index + 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        move(index, index - 1);
        break;
      case "Home":
        event.preventDefault();
        move(index, 0);
        break;
      case "End":
        event.preventDefault();
        move(index, VIEW_ORDER.length - 1);
        break;
    }
  };

  return (
    <div role="tablist" aria-label="Result view" className="flex">
      {VIEW_ORDER.map((view, index) => {
        const selected = view === current;
        return (
          <button
            key={view}
            id={viewTabId(view)}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={selected ? viewPanelId(view) : undefined}
            // The roving tabindex. Exactly one tab is in the tab order, and it is
            // the selected one, so Tab lands on where the visitor already is.
            tabIndex={selected ? 0 : -1}
            onClick={() => onSwitch(view)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              // Equal halves, full height, hard-edged at the bottom. The top
              // corners take the smallest radius in the scale so the strip reads as
              // a pair of tabs rather than as two rectangles; the bottom stays
              // square because it has to meet the content surface flush.
              "flex flex-1 items-end justify-center gap-2.5 rounded-t-md pt-4 pb-3",
              "px-3 text-sm font-semibold md:gap-3 md:px-6 md:text-base",
              // Colour only. `transition-all` on a control that changes surface,
              // ink and border at once is what makes a tab strip feel loose.
              "transition-colors duration-fast ease-standard",
              selected
                ? // The white surface that continues into the page.
                  "bg-surface text-accent-teal"
                : // Transparent, so the band's own gradient shows through — which is
                  // what "the same deep teal as the section above" means when the
                  // section above is a gradient rather than a flat fill. The hairline
                  // is the only structure it needs.
                  "border-t border-border-inverse bg-transparent text-text-inverse hover:bg-surface-inverse-soft",
              // The divider between the two cells, drawn by the trailing one so it
              // is never doubled.
              index > 0 && !selected ? "border-s border-border-inverse" : "",
            )}
          >
            <span
              className={cn(
                // The active indicator: an orange rule under the LABEL, with white
                // still running beneath it into the content. Put on the tab's own
                // bottom edge it would sit between the tab and the page and break
                // the continuous surface that is the whole point of the shape.
                "flex items-center gap-2.5 border-b-2 pb-2.5 md:gap-3",
                selected ? "border-action" : "border-transparent",
              )}
            >
              <span aria-hidden="true" className="shrink-0">
                {icons[view]}
              </span>
              {VIEW_LABELS[view]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * The white content surface, named by the tab that selected it.
 *
 * It is the focus target on every phase change — see the file comment — so it
 * carries `tabIndex={-1}` and the ref, and a screen reader announces "Peer
 * landscape, tab panel" rather than re-reading a heading that did not change.
 */
export function ViewPanel({
  view,
  panelRef,
  children,
}: {
  view: ViewKind;
  panelRef: React.RefObject<HTMLDivElement | null>;
  children: React.ReactNode;
}) {
  return (
    <div
      ref={panelRef}
      id={viewPanelId(view)}
      role="tabpanel"
      aria-labelledby={viewTabId(view)}
      tabIndex={-1}
      // No focus ring on the panel itself: it is a 3,000px region, and outlining
      // the whole page on a phase change is noise rather than a location. The tab
      // above it is the visible marker, and it is already marked.
      className="bg-surface outline-none"
    >
      {children}
    </div>
  );
}
