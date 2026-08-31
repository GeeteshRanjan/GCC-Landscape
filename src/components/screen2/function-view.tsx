"use client";

import { useState } from "react";
import { Tabs as TabsPrimitive } from "radix-ui";

import { companyName, type PeerViewInput } from "@/data/screen1";
import type { FunctionAreaView, FunctionView, LaidOutCard } from "@/data/screen2";
import { Zone } from "@/components/public/primitives";
import {
  ContextPanels,
  HEADER_LINES,
  HeaderFinding,
  ProductIdentity,
  ResultSurface,
  ViewPanel,
  ViewTabs,
  type ContextFact,
  type HeaderMotif,
} from "@/components/public/screen-header";
import { cn } from "@/lib/utils";
import {
  FIGURES_HEADING,
  FLOOR_NOTE,
  heldHeading,
  SOURCE_LINE,
  TABS_LABEL,
} from "./copy";
import { HeldMetricCard, MetricCard } from "./metric-card";
import { scalarCells, SummaryFigures } from "./summary-figures";
import { FinPanel } from "./fin-view";
import { HrPanel } from "./hr-view";
import { OpsPanel } from "./ops-view";

/**
 * Screen 2 — the Function View.
 *
 * **How it connects to Screen 1.** It does not. There is no route to move
 * between: the tool is embedded in an ansr.com page and cannot own the URL bar,
 * so this screen is a third value of the phase state in
 * `components/public/tool.tsx`, reached by a button on the Peer View and left by
 * the one in this header. The consequences are the same ones Screen 1 already
 * carries and are worth naming so they do not look like omissions: no deep link
 * into a function tab, the browser's back button does not step back to the peer
 * view, and the way back is a real control in the normal flow rather than
 * something pinned to an edge. Nothing here is fixed, sticky, or sized against
 * the viewport; height is reported to the parent by the same hook.
 *
 * **The one motion moment is the tab switch.** Radix unmounts the inactive panel,
 * so the panel's blocks replay `.gcc-enter` on every switch — three steps, driven
 * by the same `--gcc-enter-index` custom property Screen 1 uses. No scroll-driven
 * motion, because the parent decides what is on screen and an observer against our
 * own viewport fires for content the visitor cannot see.
 *
 * **The tabs are the Radix primitive, not the registry wrapper.** `@shadcn/tabs`
 * was evaluated and set aside for three concrete reasons rather than taste: its
 * triggers are 36px against the 44px the public screens use, it carries
 * `transition-all`, and its active trigger takes a shadow — and the public screens
 * have no shadows. The behaviour that is genuinely hard to get right (roving
 * tabindex, arrow-key movement, the tab/panel ARIA wiring) still comes from Radix.
 * This is the same call `input-panel.tsx` made about admin's field primitives.
 */

/**
 * `arc-quarter` recoloured from its source grey to `--ansr-teal-500` and trimmed
 * with `scripts/brand_asset.py`, then written to `public/brand/`. Reproduce it by
 * running `recolor --map <source grey>=<the teal token's value>` followed by
 * `trim`; the two values are in `assets/brand/manifest.json` and `tokens.css`
 * respectively, and are deliberately not repeated here — brand_lint.py is right to
 * refuse a literal hex in source even inside a comment.
 *
 * Chosen for meaning, not shape. It is the same arc family as Screen 1's horizon,
 * so the two screens read as one system, but a quarter rather than a dome — a
 * measured segment rather than an open horizon, which is what this screen is. Its
 * concentric origin sits at the leading top of the asset and the rings sweep down
 * and across, so anchoring the box to the trailing edge puts the void where the
 * leading-aligned headline is and the ring density where there is nothing. The
 * manifest's warning about chart-like motifs ruled out `pin-cascade`,
 * `pin-staircase` and `pin-rows-interlock`: this screen is full of real bars, and
 * a motif made of bars beside them reads as data.
 */
const FUNCTION_MOTIF: HeaderMotif = {
  src: "/brand/function-rings.svg",
  width: 848,
  height: 565,
  placement: "gcc-rings",
};

/**
 * **`FUNCTION_ICONS` was here and the four tab glyphs are removed at ANSR's request.**
 *
 * The argument for having them is recorded because it was a real one and it is simply
 * overruled: this strip is four cells of a flat list, scanned rather than toggled, and a
 * line glyph shortens that scan — which is why the two-cell VIEW switch giving up its
 * icons did not automatically decide this row. What the removal buys is that the two
 * strips at the head of the card now carry the same amount of chrome as each other,
 * which is none, and the tab labels are the only thing in either.
 *
 * Two things went with them. The `gap-2.5` on a trigger, which had nothing left to
 * separate; and the `px-4` the triggers were narrowed to so four labelled tabs with
 * glyphs still fit one line at 390 — back to `px-5`, which is what they were before.
 */

export interface FunctionViewScreenProps {
  view: FunctionView;
  /** Screen 1's answers, reused to frame this screen. Nothing new is asked. */
  input: PeerViewInput;
  onBack: () => void;
  /**
   * Back to the form, with the answers intact.
   *
   * New on this screen. The context panels are controls now, and a control that
   * looks like it changes an answer has to actually change it — previously this
   * screen had no route to the form at all, so a visitor who noticed a wrong revenue
   * band here had to go back to the peer view first to find one.
   */
  onEditProfile: () => void;
  /** The tab panel, which is where focus goes on a phase change. See `tool.tsx`. */
  panelRef: React.RefObject<HTMLDivElement | null>;
}

export function FunctionViewScreen({
  view,
  input,
  onBack,
  onEditProfile,
  panelRef,
}: FunctionViewScreenProps) {
  const name = companyName(input);
  const first = view.areas[0]?.functionArea ?? "tech";
  const [active, setActive] = useState<string>(first);

  /**
   * The same four panels Screen 1 shows, from the same answers, in the same order.
   *
   * **Both screens carry the same facts, and Screen 2 was wrong about this for
   * months.** Its summary used to include "India today" — the label of a question
   * ANSR had removed — so a visitor crossing from the peer view, where it was
   * correctly dropped, was shown a constant read back as their own answer on the very
   * next screen. It is not here for the same reason it is not there.
   *
   * **They are quiet pills again, with one control beside them.** For one pass each
   * answer was its own chevroned button; all four went to the same place, so there
   * were four affordances for one destination and the chevron implied an in-place
   * editor that does not exist. The way back is unchanged and is still real — this
   * screen had none at all before that pass — it is now a single labelled button. See
   * `ContextPanels`.
   */
  const facts: ContextFact[] = [
    ...(name ? [{ label: "Company", value: name }] : []),
    { label: "Industry", value: input.industry },
    { label: "Headquarters", value: input.hqCountry },
    { label: "Revenue band", value: input.revenueBand },
  ];

  return (
    <ResultSurface
      motif={FUNCTION_MOTIF}
      tabs={
        /* The same component Screen 1 renders, with `current` flipped — which is
           what makes the treatment reverse rather than being two hand-built strips
           that have to be kept in agreement. Function Metrics is the selected half
           here, filled with this card's own white; Peer Landscape is the open cell
           beside it, showing the bar's mint through. */
        <ViewTabs
          current="functions"
          onSwitch={(next) => {
            if (next === "peers") onBack();
          }}
        />
      }
      card={
        <ViewPanel view="functions" panelRef={panelRef}>
          <section
            // Named `function-metrics` rather than `functions`, because Screen 1 has a
            // `#functions` card and two ids that differ only by which phase is mounted are
            // two ids a spec will eventually confuse. Located by id in the suite, never by
            // any text in it.
            id="function-metrics"
            /**
             * **Named directly, because the band no longer has a heading to point at.**
             * Its `h2` was `functionFraming`'s title — "What an India GCC would give
             * {name}" — a promise rather than a claim, and one the band above already
             * covers in scope terms. A `<section>` with no accessible name is not a
             * `region` and is invisible to a screen-reader user navigating by landmark,
             * which is the failure `expectBand` exists to catch; it accepts either
             * mechanism and Screen 1's snapshot strip already uses this one for the same
             * reason. The cards inside are `h2` now, so the outline skips no level.
             */
            aria-label="India market metrics by function"
            /**
             * **White at the top, and alternating grounds below that.** The section
             * itself is white because it is the surface the floating card opens on —
             * the selected view tab is filled with this value, which is what makes the
             * joint at the card's top edge the absence of anything rather than two
             * edges lined up. What changed is everything under the function tab strip:
             * it was one flat white band holding a grid of bordered cards, and it is
             * now Screen 1's own zone system, so a boundary between two sections is a
             * colour change and the cards inside them have given up their borders. See
             * `AreaPanel`.
             *
             * The bottom padding is gone with it: a zone carries its own, and the last
             * zone's ground now runs to the card's foot.
             */
            className="bg-surface pt-10 md:pt-12"
          >
            <TabsPrimitive.Root
              value={active}
              onValueChange={setActive}
              // State lives in this component, like every other piece of screen
              // state in the tool. There is no URL to reflect a tab into.
              className="flex flex-col"
            >
              {/* `md:px-8`, matching the zones below: this content is inside the
                  floating card, so the container's own `md:px-12` would be a third
                  inset on top of the card's gutter and rim.

                  **The tab strip is the first thing inside the band, and there is
                  nothing above it.** There were three things: an `h2` stating what an
                  India GCC would give the visitor, a lead stating that the figures are
                  national, and — inside every tab — a third sentence describing the
                  cards under it. The band above the card already carries the scope in
                  six words, and the four tab labels already say what is on offer. What
                  remains is the switch and the evidence.

                  It sits OUTSIDE the zones rather than in the first one, because a zone
                  is full-bleed inside the card and the strip is not: it is the panel's
                  own navigation, and putting it on the first zone's ground would make
                  the ground change land above the switch rather than under it. */}
              <div className="mx-auto w-full max-w-content px-6 md:px-8">
                <TabsPrimitive.List
                  aria-label={TABS_LABEL}
                  className="flex flex-wrap border-b border-border-tint"
                >
                  {view.areas.map((area) => (
                    <TabsPrimitive.Trigger
                      key={area.functionArea}
                      value={area.functionArea}
                      className={cn(
                        // 44px, the public screens' control height, against the
                        // registry wrapper's 36. A first-time visitor on a phone.
                        "-mb-px inline-flex min-h-12 items-center border-b-2 border-transparent px-5",
                        "text-base font-semibold text-text-muted",
                        // Colour and border only, never `transition-all` — that was one
                        // of the three reasons the registry's tab wrapper was removed.
                        "transition-colors duration-fast ease-standard",
                        "hover:text-text",
                        // The active tab takes a tinted ground as well as the rule, so
                        // it reads as a selected surface rather than as one word that
                        // happens to be darker than the three beside it. It is the only
                        // navigation on this screen and it was the faintest thing on it.
                        "data-[state=active]:border-accent-teal data-[state=active]:bg-surface",
                        "data-[state=active]:text-accent-teal",
                      )}
                    >
                      {area.label}
                    </TabsPrimitive.Trigger>
                  ))}
                </TabsPrimitive.List>
              </div>

              {view.areas.map((area) => (
                <TabsPrimitive.Content
                  key={area.functionArea}
                  value={area.functionArea}
                  className="outline-none"
                >
                  <AreaPanel area={area} />
                </TabsPrimitive.Content>
              ))}
            </TabsPrimitive.Root>
          </section>

          {/* **`ClosingCta` was here and is removed at ANSR's request, so the tool now
              has no call to action on either screen.** Screen 1's went first, on the
              page-end instruction; this was the remaining one, and the argument for
              keeping it — that the conversation has to be offered somewhere, and this is
              the deeper of the two views — is unchanged and simply overruled. The page
              ends at the capability matrix and the source line.

              **Two consequences worth naming before anyone acts on them.**
              `NEXT_PUBLIC_GCC_CTA_URL` now reaches nothing: `ctaHref` is still threaded
              from `page.tsx` to `tool.tsx` and stops there, because a link out is a
              decision to restore rather than a variable to delete. And `gccStatus` has
              lost its ONLY renderer — `functionFraming`'s three CTA fields were the last
              thing on either screen that branched on it, `framing()` on Screen 1 having
              had no caller for some time. Both branches are still exported and
              unit-tested on all three values. The field is the one piece of the input
              contract that nothing now draws, and `project.md` records that as a state
              to restore from rather than as dead weight to remove. */}
        </ViewPanel>
      }
      footer={SOURCE_LINE}
    >
        {/* **This band has a line now, and it is a SCOPE statement rather than this
            screen's finding.** It had none for one pass, on the argument that the
            content surface already opens on the finding as a real `h2` — which is still
            true, and is why the line here is not that sentence. What the argument missed
            is that the band is shared with Screen 1, which does carry a line: crossing
            between the two views in one state change dropped a whole row out of the band
            and jumped the answer pills 60px up the page, so the header read as two
            different headers rather than as one object with two views in it.

            The two lines are a matched pair, held together in `HEADER_LINES` so neither
            can drift out of construction with the other. Screen 1's states a count of
            matching GCCs; this one states which market the figures below are about,
            because they are national and do not move with the visitor's answers. */}
        <div className="flex flex-col gap-3 md:gap-4">
          <ProductIdentity id="product-identity" />
          <HeaderFinding>{HEADER_LINES.functions}</HeaderFinding>
        </div>
        {/* Straight to the form, not via the peer view. Same behaviour as Screen 1's
            row, which is the point: it is the same component in the same place on both
            screens, so the two cannot mean different things. */}
        <ContextPanels facts={facts} onEdit={onEditProfile} />
    </ResultSurface>
  );
}

/**
 * A card grid: twelve columns, `items-start`, widths already packed.
 *
 * **A `div` rather than a `ul`.** Each card is a `<section>` with an accessible name —
 * a real landmark, reachable by role — and a `<section>` is not valid inside a `<ul>`.
 * The list semantics are no loss: these are independent readings of one market rather
 * than an ordered set, which is exactly what Screen 1 does with its own grid.
 *
 * **`gap-6 lg:gap-8`, which is the peer view's own analytical row.** It was 32/40px,
 * set when these cards had no borders and the space was the only thing separating two
 * columns. The cards are bordered again — see `MetricCard` — so a hairline plus 40px of
 * ground is more air than any boundary needs, and 40px between two cards inside a zone
 * whose own padding is 40px left the grid reading as three separate objects. The peer
 * view puts its two analytical cards 24/32px apart and they are the same kind of pair.
 */
function CardGrid({ cards }: { cards: readonly LaidOutCard[] }) {
  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12 lg:gap-8">
      {cards.map(({ shown, width }) => (
        <MetricCard key={shown.metric.id} shown={shown} width={width} />
      ))}
    </div>
  );
}

/**
 * One tab's contents, as a sequence of zones.
 *
 * **This was one flat white band holding a grid of bordered cards, and it is now
 * Screen 1's zone system.** The complaint the change answers is the one the peer view
 * already went through twice: a run of cards down a single ground is correct, dense and
 * cognitively flat — nothing tells the eye that five national figures, a talent
 * pipeline and an international comparison are different kinds of claim. A zone is a
 * colour change at a boundary and nothing else, so the sections inside keep their
 * density and the boundary costs no vertical room.
 *
 * **The grounds strictly alternate, and the sequence is derived rather than written
 * out.** White beside white is not a boundary, so the sections a tab actually has
 * decide the sequence: technology gets white for the figure row, mint for the talent
 * pair, white for the capability matrix. A tab with no half-width cards does not
 * therefore end up with two white zones in a row, which is what a hardcoded sequence
 * would have produced. The case that forced the derivation was the operations tab, which
 * is composed now — as are HR and finance — so the ONE tab still reaching this code is
 * technology, and the rule is kept because it is the cheaper of the two ways to be right
 * rather than because a second live tab depends on it.
 *
 * **The split is by WIDTH, which is what makes the two-column section fall out of the
 * data rather than being composed by hand.** Half-width cards tile two to a row and are
 * ordered before the full-measure ones by `compareByWidth`, so the leading run of
 * halves IS the two-column composition and the rest is the full-width evidence under
 * it. Nothing here chooses which metric goes where.
 *
 * There are still no group headings inside a tab. The catalogue files every metric
 * under one of four lenses — talent supply, speed to stand up, location, cost — and
 * rendering those as public subheadings would be a transcription of an internal filing
 * system. The one heading a zone carries is the figure row's, which names the row's
 * subject rather than its lens; see `FIGURES_HEADING`.
 *
 * The staggered zones are the screen's one motion moment. Three steps at most, so the
 * whole sequence lands well inside the flow threshold however many cards a tab has —
 * staggering twelve cards individually would have put the last one most of a second
 * behind the first.
 */
function AreaPanel({ area }: { area: FunctionAreaView }) {
  /**
   * **HR is composed rather than derived, and this is the whole seam.** One tab, one
   * branch, and everything below it is untouched — the technology and finance tabs still
   * get their layout from `layoutArea` and their grounds from the sequence derived below.
   *
   * The reasoning, the cost and the reason it is scoped to one tab are in
   * `hr-view.tsx`. What matters here is that the branch is a single early return rather
   * than a set of conditionals threaded through the derivation: a half-composed tab
   * would be the worst of both, and the next tab ANSR wants composed should be a
   * decision about whether the derivation survives at all.
   */
  if (area.functionArea === "hr") return <HrPanel area={area} />;
  /**
   * **Operations is the second composed tab, and two of four is where this stops being
   * an exception.** The seam is still one early return per tab and the derivation below
   * is still untouched — but half the screen is now authored, so the next tab ANSR wants
   * composed is the moment to decide whether the derivation survives at all rather than
   * a third branch to add. `ops-view.tsx` records what it places and what it costs.
   */
  if (area.functionArea === "operations") return <OpsPanel area={area} />;
  /**
   * **Finance is the third, and this is the last early return that can be added without
   * a decision about the derivation itself.** Three of the four tabs are authored, so
   * everything below this line now renders exactly one tab — technology. It is not dead:
   * it is what a metric added to a composed tab falls back to, and it is what technology
   * draws. But a fourth composition request is a request to delete a derivation with one
   * caller, which is a different change from this one. `fin-view.tsx` records what it
   * places and, at more length than either of the others needed, what it refuses.
   */
  if (area.functionArea === "finance") return <FinPanel area={area} />;

  /**
   * Two filters, no arithmetic. `layoutArea` has already decided every width and
   * packed the run so no row is part-empty; `compareByWidth` has already put the
   * halves first. All that happens here is that one ordered list is cut in two at the
   * point where the widths change, so each half can take its own ground.
   */
  const narrow = area.cards.filter((card) => card.width === "half");
  const wide = area.cards.filter((card) => card.width === "full");

  /**
   * The zones this tab actually has, in order, each with the ground it takes.
   *
   * Built as a list so the alternation is a property of the list rather than four
   * conditionals that each have to know what came before them. `surface` first,
   * because the section's own ground is white and the switch above the first zone sits
   * on it — a mint first zone would put a colour change immediately under the tab
   * strip and read as though the strip belonged to the band above.
   */
  const sections: React.ReactNode[] = [];

  if (area.figures.length > 0) {
    sections.push(
      /* **The figure row, first on every tab that has one.** Every bare scalar as one
         object rather than as a card each — see `SummaryFigures`, which all four tabs
         draw now. It leads because a single figure reads in one glance and a chart does
         not, and it is the tab's one orange role.

         The floor note is the ROW's here rather than each cell's: two of technology's
         five figures declare a floor, so a per-cell note rendered the same sentence
         twice inside one row, 400px apart, with nothing saying it referred to two
         different figures. */
      <SummaryFigures
        key="figures"
        cells={scalarCells(area.figures, { floor: "row" })}
        heading={FIGURES_HEADING[area.functionArea]}
        headingId={`figures-${area.functionArea}-heading`}
        note={
          area.figures.some((shown) => shown.metric.atLeast)
            ? FLOOR_NOTE
            : undefined
        }
      />,
    );
  }
  if (narrow.length > 0) {
    sections.push(<CardGrid key="narrow" cards={narrow} />);
  }
  if (wide.length > 0) {
    sections.push(<CardGrid key="wide" cards={wide} />);
  }
  if (area.heldCards.length > 0) {
    sections.push(
      <section
        key="held"
        aria-labelledby={`held-${area.functionArea}-heading`}
        className="flex flex-col gap-6"
      >
        {/* The heading is the whole framing now. `HELD_BODY` said the reason and then
            said three more times, in prose, what the sealed card, its chip and its
            cardinality note each already draw — so the reason moved into the heading
            and the paragraph went. See `heldHeading`.

            The rule that used to sit above this group is gone with the flat band: the
            zone's own ground change is the separation now, and a hairline on top of it
            would be two devices doing one job. */}
        <h2
          id={`held-${area.functionArea}-heading`}
          className="text-xl leading-snug font-bold tracking-display text-text md:text-2xl"
        >
          {heldHeading(area.held.length)}
        </h2>
        {/* Packed too, which it never was: HR's pair is a half then a full, and a
            full cannot fit beside a half, so it dropped a row and left six empty
            columns beside the placeholder. Finance had the mirror of it. */}
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12 lg:gap-8">
          {area.heldCards.map(({ held, width }) => (
            <HeldMetricCard key={held.metric.id} held={held} width={width} />
          ))}
        </div>
      </section>,
    );
  }

  return (
    <>
      {sections.map((section, index) => (
        <Zone
          // The key is the section's own, set above — index would be stable here but
          // would tie the identity of a zone to its position, and a tab that gains a
          // section would remount every zone after it.
          key={(section as React.ReactElement).key ?? index}
          ground={index % 2 === 0 ? "surface" : "tint"}
          className="gcc-enter"
          // Three steps at most, so the stagger is capped however many zones a tab
          // has. `Zone` forwards the class to its inner container, which is where the
          // animation and this custom property both apply.
          style={{ "--gcc-enter-index": Math.min(index, 2) } as React.CSSProperties}
        >
          {section}
        </Zone>
      ))}
    </>
  );
}
