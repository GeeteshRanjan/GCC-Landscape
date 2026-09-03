"use client";



import { Globe, Landmark, Users } from "lucide-react";

import { useState } from "react";

import {
  AnswerEditor,
  ANSWER_EDITOR_ID,
  type AnswerEditing,
} from "@/components/public/answer-editor";
import { CloseBackdrop, ClosingCta } from "@/components/public/closing-cta";
import { usePublicCopy } from "@/components/public/copy-context";
import { Block, formatRevenueBand, Panel, Zone } from "@/components/public/primitives";
import {
  ContextPanels,
  headerLines,
  HeaderFinding,
  ProductIdentity,
  ResultSurface,
  ViewPanel,
  ViewTabs,
  type ContextFact,
  type HeaderMotif,
} from "@/components/public/screen-header";
import type { CloseCopy, CustomerLogo, HeroCopy, ImpactStat } from "@/data/schema";
import { companyName, type PeerView, type PeerViewInput } from "@/data/screen1";
import { cn } from "@/lib/utils";
import { CityMap } from "./city-map";
import type { BusinessTypeOption, TieredOptions } from "./input-panel";
import {
  CommonFunctionsView,
  IndustryCountView,
  LargestBlockView,
  NationalScaleView,
} from "./evidence";
import { PeersZone, type PeersVariant } from "./peers-variants";
import {
  FUNCTIONS_TITLE,
  largestTitle,
  mapTitle,
  signals,
  snapshotHeading,
  snapshotLabels,
} from "./copy";
import { Snapshot } from "./snapshot";
import { AskHero } from "./ask-hero";
import { CustomerLogos } from "./customer-logos";
import { ImpactBand } from "./impact-band";
import { InputPanel } from "./input-panel";

/**
 * Screen 1, the Peer View. Two states over one set of inputs.
 *
 * **State is owned above this file**, in `components/public/tool.tsx`, because
 * there are now two screens sharing one phase machine. The tool is embedded in an
 * ansr.com page and cannot own the URL bar, so ask-to-answer and peers-to-functions
 * are both state changes rather than navigations. That has consequences worth
 * naming, because they look like omissions otherwise: there are no deep links into
 * a result, the browser's back button does not step back to the form, and the
 * "Change these details" control is the only way back — which is why it is a real
 * button in the normal flow rather than something sticky at an edge.
 *
 * Nothing here is fixed, sticky, or sized against the viewport. Height is reported
 * to the parent instead; see `use-frame-height.ts`.
 */

/**
 * The ANSWER state's motif. The ask has its own hero and its own fan now — see
 * `ask-hero.tsx` — so this is no longer shared between the two states of this
 * screen.
 *
 * `pin-diagonal` recoloured onto three light ramp steps and trimmed with
 * `scripts/brand_asset.py` — see `.gcc-hero-diagonal` in globals.css for the
 * commands and the placement. Never placed unmodified.
 *
 * It replaces the `arc-dome` horizon, which was the right instinct on a white
 * header and the wrong asset once the header became the brand's teal gradient: an
 * arc dome at 0.18 on white was a smudge nobody could see, and the part of a dome
 * that fits inside a header's height is its flattest slice, which reads as
 * diagonal wallpaper rather than arcs. If the flattest slice of a dome is what
 * reads, the honest asset is the one that is actually diagonal.
 */
const PEER_MOTIF: HeaderMotif = {
  src: "/brand/hero-diagonal.svg",
  width: 1080,
  height: 437,
  placement: "gcc-hero-diagonal",
};

/**
 * The ask: five bands that read as one composition.
 *
 *   1. the teal gradient hero, centred
 *   2. the white form card, overlapping the hero's bottom edge
 *   3. the pale-teal band the card's lower half sits on
 *   4. the customer-logo strip
 *   5. the dark impact band
 *
 * **The whole screen is on the display face** (`font-display`), which no other
 * surface is yet. Body copy on it is Light 300, which is the brand's single
 * biggest typographic tell and the thing this screen most obviously got wrong
 * before. It is scoped here rather than set on `body` deliberately: the answer
 * state and Screen 2 are a separate pass, and admin is a dense internal tool that
 * keeps Inter.
 *
 * **The overlap is two numbers in two files and they have to be read together.**
 * The hero's bottom padding (`ask-hero.tsx`) is oversized so there is hero left
 * under the card, and the card's negative top margin here pulls it up into that
 * space. Neither is meaningful alone — increasing the pull without increasing the
 * padding walks the card up into the supporting line. The pull is expressed in
 * spacing steps rather than a percentage of the card, because a percentage of an
 * element whose height depends on how many fields wrap is not a number anyone can
 * reason about; the visible result is roughly the upper third of the card on the
 * hero at desktop, less at tablet, least on a phone.
 *
 * **Two things the previous version had are gone rather than moved.** The bar-ramp
 * field in the trailing ground, because the form is now centred and there is no
 * trailing ground to put it in. And the line dissolve under the panel, because a
 * card that overlaps two grounds needs a real edge on both of them — a dissolve
 * only works where its own fill meets a different ground, and this card's fill
 * meets two.
 */
export function PeerViewAsk({
  headingRef,
  heroCopy,
  impactStats,
  logos,
  industries,
  revenueBands,
  hqCountries,
  businessTypesByIndustry,
  initial,
  pending,
  submitError,
  onSubmit,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  heroCopy: HeroCopy;
  impactStats: readonly ImpactStat[];
  /**
   * The customer marks, on their way to `CustomerLogos`. Threaded rather than read
   * from the copy context, because this is the only band that draws them — see
   * `GccLandscapeToolProps.logos`.
   */
  logos: readonly CustomerLogo[];
  industries: TieredOptions;
  revenueBands: readonly string[];
  hqCountries: TieredOptions;
  businessTypesByIndustry: Readonly<Record<string, readonly BusinessTypeOption[]>>;
  initial?: PeerViewInput;
  pending: boolean;
  submitError: string | null;
  onSubmit: (input: PeerViewInput) => void;
}) {
  const copy = usePublicCopy();

  return (
    // The display face is set once on the public root in `tool.tsx`, not per phase — it
    // was on this wrapper and on the answer's, and missing from Screen 2, which is how
    // one shared header came to render in two different typefaces.
    <div>
      <AskHero headingRef={headingRef} copy={heroCopy} />

      <section
        id="ask"
        aria-labelledby="ask-heading"
        // The transition band. Its ground is `--ansr-surface-tint`, which is the
        // pale mint the brief names — it was already in the palette as
        // `--ansr-teal-100`, so no new colour was introduced for it.
        //
        // **No `overflow-hidden` here, and that is the load-bearing difference
        // from the band this replaces.** The card is pulled up out of this
        // section's own box by a negative margin, so a clipping ancestor would cut
        // its top third off — which is exactly the part that is supposed to be on
        // the hero. The old band clipped because it had a motif to crop; it has
        // none now, so nothing needs clipping and the card is free to escape.
        //
        // **`flow-root` is what makes the overlap happen at all**, and without it
        // the whole composition silently does not work. The card's negative top
        // margin is on the first in-flow descendant of a section with no top
        // padding or border, so it COLLAPSES THROUGH and moves the section itself
        // up by the same 128px — the tint ground travels with the card, the two
        // stay flush, and the rendered result is a card sitting exactly on the
        // boundary with no overlap. It looks like the margin was ignored. A block
        // formatting context stops the collapse, and `flow-root` is the one way to
        // get one that does not also clip (`overflow-hidden`), float, or change
        // the box's own layout.
        //
        // The bottom padding is what separates the card from the logo strip. Sized
        // to read as air under the card rather than as an empty band: the strip
        // has its own padding too, so these two add up and the pair was set
        // together.
        // **The bottom padding was cut by a third, and the logo strip's own top
        // padding with it.** The two add up, and at 56 + 40 = 96px the tint band
        // below the card read as an empty band rather than as air under it — the
        // card had visibly finished and nothing had started. The pair is set
        // together and has to stay that way; see `CustomerLogos`.
        // **`z-10` on the BAND, and it is not decoration — without it the logo strip
        // paints over the open dropdown.** The panel already carries `z-20`, and that
        // z-index cannot escape this band: the card carries `.gcc-enter`, whose
        // keyframe leaves a computed `transform` on it, and an element with a
        // transform is a STACKING CONTEXT. So the panel's 20 is scoped inside the
        // card, and the card competes in the root context at an effective 0 — where
        // the marquee track, which also has a transform and comes later in the DOM,
        // wins. The symptom is a dropdown whose lower half has ten company logos
        // drawn through its text, only for the two dropdowns long enough to overhang
        // the card. Raising the band lifts everything in it, including the panel, and
        // leaves the card-over-hero overlap unaffected because the hero is earlier.
        className="relative z-10 flow-root bg-surface-tint pb-6 md:pb-8"
      >
        {/* **This pair — `max-w-content px-6 md:px-12` then `mx-auto max-w-card` —
            is duplicated verbatim in `ask-hero.tsx`, and the duplication is the
            point.** It is what gives the hero's copy and this card the same leading
            edge at every viewport width. They were three different left edges within
            130px of each other; nothing looked broken and nothing agreed, which is
            the register that reads as unfinished.

            It cannot be a tuned inset on the hero instead. The card is centred and
            capped, so the offset between the container's gutter and the card's edge
            is a different number at every width — which is exactly why the previous
            `ms-[5%]` could not converge. Deriving both edges from one box is the only
            version that holds.

            `px-4` was raised to `px-6` here for the same reason: the hero has always
            used `px-6` at phone width, and the 8px difference was the whole
            misalignment at 390.

            So `--ansr-container-card` is now a COMPOSITION token, not just this
            card's width — widening it moves the headline, and moves the dot map's
            leading mask fade with it. Three files, one decision. */}
        <div className="mx-auto max-w-content px-6 md:px-12">
          <div
            className={cn(
              // The pull, and it is the negative counterpart of the hero's own
              // bottom padding — 128/160/192px there against 80/112/128 here, so
              // roughly a third of the card sits on the gradient and the rest of
              // that padding stays visible as hero. Read the two together: raising
              // this without raising that walks the card up into the supporting
              // line. Less pull on a phone, where the hero's copy ends closer to
              // the band's bottom edge and a deep overlap would crowd it.
              "relative -mt-20 md:-mt-28 lg:-mt-32",
              // Centred and capped at `--ansr-container-card`. Wider than the
              // hero's text block, which the brief allows and the form needs, and
              // well inside the container — see the token for both bounds.
              "mx-auto max-w-card",
              // The card. Rounded, which is a departure from the public screens'
              // hard-edged panels and is the brief's own call; a restrained step,
              // not a pill. One very light shadow, no border, no ring: it has to
              // read as lifted off two grounds at once, and a border on a card
              // that crosses a light-to-dark boundary is visible against one and
              // invisible against the other.
              "rounded-lg bg-surface shadow-md",
              // Generous but controlled. The top shoulder is smaller than the old
              // panel's 80px: that emptiness made a hard-edged panel read as
              // composed, and a rounded card lifted onto a gradient does not need
              // it.
              "px-5 py-8 sm:px-8 md:px-10 md:py-12 lg:px-12",
              // **The ask animates in, which it did not before, and the omission was
              // visible once the rest of the page was polished.** Every band on the
              // ANSWER state and all of Screen 2 arrive on `.gcc-enter`; the entry
              // point — the first thing anyone sees — was the one surface that
              // snapped into existence. Index 2 puts it a step behind the headline
              // and the lead, so the page assembles top-down in three ~120ms steps
              // and is settled inside 500ms.
              //
              // Nothing here is scroll-driven, which is the constraint that rules out
              // the obvious version: the tool is iframed and does not own the scroll
              // container, so an observer against our own viewport fires for content
              // the visitor cannot see. This is tied to mount instead, which for the
              // ask is the same moment.
              "gcc-enter",
            )}
            style={{ "--gcc-enter-index": 2 } as React.CSSProperties}
          >
            <div className="flex flex-col gap-7 md:gap-9">
              {/* Heading and lead as one block, tighter than the gap to the form
                  below them: they are two halves of one statement, and the form is
                  the next thing. */}
              <div className="flex flex-col gap-3">
              <h2
                id="ask-heading"
                // **Teal and Medium, where this was black and Bold.** Two problems,
                // one fix. The weight made the form's heading the heaviest type on
                // the page — heavier than an 80px hero headline set in Medium — so
                // the eye landed on the card's title rather than on the claim above
                // it. And the card had no brand colour anywhere at rest: white fill,
                // black type, neutral hairlines, with teal appearing only on focus.
                // It read as a form from a different site sitting on ANSR's hero.
                //
                // `--ansr-accent` (reached as `text-accent-teal`, since Tailwind's own
                // `accent` is the shadcn contract variable and is orange here) is the
                // sanctioned heading teal on a light ground
                // and measures 9.81:1 on white, so this costs nothing in legibility
                // and buys the one thing the card was missing: a colour it shares
                // with the band it overlaps.
                //
                // `tracking-display` stays, unlike the two headings that carry a
                // drawn wordmark — there is no mark on this line to match.
                className="text-2xl leading-tight font-medium tracking-display text-balance text-accent-teal md:text-3xl lg:text-4xl"
              >
                {/* Published copy, so the card's heading and the line under it can be
                    reworded without a deploy. `ASK` still holds the shipped wording and
                    the reasoning for it — see the note at the head of `copy.ts`. */}
                {copy.askTitle}
              </h2>
              {/* Light 300, which is the brand's own paragraph weight and the whole
                  reason this screen is on the display face. Black rather than muted:
                  it is a sentence the visitor has to read to know what the form does,
                  not a caption, and `--ansr-text-muted` on white is where a line
                  starts being skipped. Capped at the reading measure so it does not
                  run the full 896px of the card. */}
              <p className="max-w-measure text-base leading-normal font-light text-pretty text-text md:text-lg">
                {copy.askLead}
              </p>
              </div>
              <InputPanel
                industries={industries}
                revenueBands={revenueBands}
                hqCountries={hqCountries}
                businessTypesByIndustry={businessTypesByIndustry}
                initial={initial}
                pending={pending}
                submitError={submitError}
                onSubmit={onSubmit}
              />
            </div>
          </div>
        </div>
      </section>

      <CustomerLogos logos={logos} />

      <ImpactBand stats={impactStats} />
    </div>
  );
}

/**
 * The answer: a compact teal context band, then ONE FLOATING CARD holding six zones
 * to the end of the page.
 *
 * **This replaced seven full-bleed bands, and the change is structural.** The
 * previous shape was a landing page: a 200px display hero stating the finding, then
 * seven sections each with its own ground, 80–112px of vertical air and a 48px
 * heading. It read well scrolled slowly and badly in the ninety seconds this
 * audience gives it — the first figure was below the fold, no two pieces of evidence
 * could be compared side by side, and the last two bands were navigation and a CTA
 * rather than evidence.
 *
 * What it is now, in order:
 *
 *   1. The teal band — the product lockup, the finding, and the visitor's four
 *      answers as quiet pills with one way back. Its ornament is the entry point's
 *      own dotted map from `lg`. See `ResultSurface`.
 *   2. The card's top row: the two views as equal halves, the selected one filled
 *      with the mint zone that follows it, so the joint is invisible.
 *   3. SNAPSHOT — four industry-level figures, the index to everything under it.
 *   4. The packed grid of comparison cards, full width.
 *   5. Two analytical rows, three fifths and two fifths: the containment chart beside
 *      the function list, then the ranked centres and the locations map.
 *   6. The terminating dark evidence strip, which is where the ARGUMENT ends.
 *   7. The close, on the exempt dark ground, which is where the CARD ends.
 *
 * **The close is restored at the project owner's decision**, having been removed at
 * ANSR's request on the page-end instruction. `ctaHref` is threaded into this screen
 * again, and `gccStatus` gains a renderer here for the first time — `peerClosing` in
 * this screen's own `copy.ts`. There is still no footer and no methodology link: what
 * the screen owes the reader is inside the strip's own source line or in the
 * provenance on the card that needed it.
 *
 * **The band still collects nothing.** No form, no email field, and no visitor input
 * stored anywhere in this codebase — that half of the brief is unchanged, and the
 * specs assert it on both screens.
 *
 * **Three fifths and two fifths, not halves, on the analytical row.** The containment
 * chart is a wide chart; the function list is eight short lines that tile two to a
 * row. Half each left one card two thirds empty beside the other.
 */
export function PeerViewAnswer({
  panelRef,
  view,
  onHome,
  editing,
  onOpenFunctions,
  ctaHref,
  closeCopy,
  peersVariant = "current",
}: {
  /**
   * **TEMPORARY.** Which candidate treatment of the comparison set to draw. Defaults to
   * the shipped one, so the only caller that passes it is the variants harness. Goes with
   * `peers-variants.tsx` once a treatment is chosen.
   */
  peersVariant?: PeersVariant;
  /**
   * The tab panel, which is where focus goes on a phase change.
   *
   * Not a heading ref any more. The `h1` is the product name and is identical on
   * both result screens, so focusing it would announce nothing about the change —
   * whereas a panel named by its own tab announces "Peer landscape, tab panel",
   * which is the phase change said out loud. See `tool.tsx`.
   */
  panelRef: React.RefObject<HTMLDivElement | null>;
  view: PeerView;
  /**
   * Back to the entry point, from the band's own lockup.
   *
   * **This replaced `onChangeDetails`, and the rename is the change rather than a
   * tidy-up.** That prop was "Edit answers", which left the result for the form; the
   * answers are corrected in place now, so the only thing left that goes to the entry
   * point is the mark. See `AnswerEditor` and `ProductIdentity`.
   */
  onHome: () => void;
  /** What the answer editor needs from the tool. The open state is held here. */
  editing: AnswerEditing;
  onOpenFunctions: () => void;
  /** Where the close links out to. See `tool.tsx`. */
  ctaHref: string;
  /** The close's editable copy. See `tool.tsx`. */
  closeCopy: CloseCopy;
}) {
  const copy = usePublicCopy();
  const peerCount = view.peers.peers.length;
  const name = companyName(view.input);

  /**
   * Whether the answer editor is open.
   *
   * Held here rather than in the tool, because it is state about one band on one screen
   * and nothing above this component reads it. It resets by REMOUNT rather than by a
   * handler: `tool.tsx` keys this screen on the visitor's answers, so a successful
   * correction replaces the whole tree and the panel closes with it.
   */
  const [editorOpen, setEditorOpen] = useState(false);

  /**
   * The four answers, in the order the form asks them.
   *
   * The company panel is omitted rather than stubbed when the field was left blank,
   * since it is optional on the form — and `ContextPanels` divides three cells evenly
   * as well as four.
   *
   * **The industry is not repeated as a descriptor under the company name.** The
   * reference composition shows it in both places; it is the same string twice inside
   * 40px of each other, and the industry has a panel of its own two cells over.
   *
   * **There is no "India today" panel, and there must not be.** `gccStatus` is a
   * constant the form supplies rather than something the visitor answered, so showing
   * it here would be the tool reading its own assumption back as their input.
   *
   * **They carry a label and a value and nothing else now.** Each fact used to carry
   * an `action` and an optional `actionLabel`, because each panel was its own button
   * with its own accessible name. All four went to the same place, so there is one
   * button beside the row instead and the per-fact wording went with it — see
   * `ContextPanels`. "Your company" shortened to "Company" in the same change: a pill
   * is sized to its own content, and the possessive was two thirds of the width of
   * the value it labelled.
   */
  const facts: ContextFact[] = [
    ...(name ? [{ label: "Company", value: name }] : []),
    { label: "Industry", value: view.industry.industry },
    { label: "Headquarters", value: view.input.hqCountry },
    /**
     * **Formatted, not the raw stored band, and the LABEL is where the currency went.**
     * The dropdown spells `<` out as "Under" and drops the `$` from every row, stating
     * the currency once in its own hint — so echoing the raw string here would show the
     * visitor a different answer from the one they picked. This pill has no hint to
     * carry the unit, so it goes in the label: "(USD)" is one word against seven rows
     * of repeated marks. `formatRevenueBand` is the single definition, shared with the
     * control and with Screen 2's identical row.
     */
    { label: "Revenue band (USD)", value: formatRevenueBand(view.input.revenueBand) },
  ];

  return (
    /**
     * The display face is set once on the public root in `tool.tsx`. It was on this
     * wrapper and on the ask's, and on neither of Screen 2's — so the shared header
     * band changed typeface across a tab switch. See `tool.tsx`.
     */
    <div>
      <ResultSurface
        motif={PEER_MOTIF}
        tabs={
          <ViewTabs
            current="peers"
            onSwitch={(next) => {
              if (next === "functions") onOpenFunctions();
            }}
            // This screen's content opens on the near-white mint, so that is what the
            // selected cell is filled with — the joint between the two is then the
            // absence of an edge rather than two fills that nearly match.
            //
            // **`pale`, because the snapshot's zone is the near-white mint now.** It was
            // plain `surface` — and a white zone at the top of a white card has no
            // boundary at all, so the four figures read as a row floating in unbounded
            // space rather than as the block the card opens with. The mint `tint` is not
            // available to it: `--ansr-action` is 2.63:1 there against 3.29:1 on the pale,
            // so the orange figures would fail the 3:1 large-text floor at any size.
            //
            // The bar has to follow the zone or the joint this component exists to hide
            // reappears as an edge. See `Zone` for why the pale may only ever neighbour
            // the mint.
            ground="pale"
          />
        }
        card={
          <ViewPanel view="peers" panelRef={panelRef}>
            {/* A polite live region, because the answer replaced the form without a
                navigation. Not assertive: the visitor asked for this.

                **It announces the RESULT, and it is now the only place the count is
                spoken on arrival.** It used to open with `framing().title` and then the
                count, which a screen-reader user then met again on the way down — and the
                tab panel takes focus on the phase change and announces its own name, so
                the finding was the third thing said about one state change. The band's
                line no longer states a count at all, so this region and the grid's own
                count line are what carry it. */}
            <p role="status" className="sr-only">
              {peerCount === 0
                ? `No comparable companies found in ${view.industry.industry}.`
                : `Showing ${peerCount} comparable ${peerCount === 1 ? "company" : "companies"} in ${view.industry.industry}.`}
            </p>

            {/* ---- Zone 1: the industry at a glance, on the pale teal -------------
                First inside the card, so the strip reads as what the card opens with
                rather than as the first thing the content does. That is also what makes
                it survive being four figures with no section around them. */}
            <Zone ground="pale">
              <Enter index={1}>
                {/* **The three static labels are passed IN, not read inside
                    `signals`.** That is a plain function the unit suite calls over all
                    24 industries with no React tree, so it cannot hold a hook — see
                    `SnapshotLabels`. The fourth label stays composed inside it, because
                    it names the visitor's own scope.

                    `snapshotHeading` is unchanged and still derived: it interpolates the
                    industry, which is the whole reason all four labels stopped naming
                    it. */}
                <Snapshot
                  signals={signals(view, snapshotLabels(copy))}
                  heading={snapshotHeading(view)}
                />
              </Enter>
            </Zone>

            {/* ---- Zone 2: the comparison set, on white ---------------------------
                The primary evidence, and the only section that gets a whole zone to
                itself. The accent header strip is spent here rather than shared out —
                one card on the surface announces itself in colour, and it is this
                one. */}
            {/* **TEMPORARY SEAM — the four candidate treatments of this section.** The
                composition below is unchanged and is what `variant="current"` renders;
                `PeersZone` owns the whole zone rather than its contents because one
                candidate changes the zone's own ground. Delete `peers-variants.tsx` and
                restore the block below inline once a treatment is chosen. */}
            {/* The shipped composition — a `Block` rather than a `Panel`, `weight="lead"`
                rather than an accent fill, and no lead sentence — is reproduced verbatim
                as `PeersZone`'s `current` branch, together with the whole of its
                reasoning. Nothing about it has changed. */}
            <PeersZone view={view} variant={peersVariant} />

            {/* ---- Zone 3: the upper end, beside the industry it sits in --------
                **The two blocks that answer "and how does that compare" are now one
                row, directly under the comparison set, and the order came from the
                reader's own question sequence.** Previously the containment chart shared
                a row with the function list and the ranking was a zone further down, so
                a reader who had just met five named companies was handed a scope
                statement before being told where those five sit in their industry.

                Ranking first at three fifths, containment beside it at two: the ranking
                is the block a reader compares the five names against, so it is the one
                that has to be adjacent to them. The containment chart answers the next
                question — how much of the industry any of this represents — and it is
                the narrower chart, three labelled layers on one axis rather than five
                rows of name-and-figure.

                `items-start` on the row. A grid child stretches to its row by default,
                so the shorter card was padded out to its neighbour's height and rendered
                with a band of empty white under its own content. */}
            <Zone ground="surface">
              <Enter
                index={3}
                className="grid items-start gap-6 lg:grid-cols-5 lg:gap-8"
              >
                {/* **`plain`, where this was `tint`.** The tone existed to make the card
                    visibly a different kind of block from the white comparison cards —
                    and it never did, because the pale fill differs from white by about
                    4% lightness. What separates them now is that the comparison set has
                    no card at all. Two of the four tones were doing one tone's work.

                    It keeps its border because it draws MARKS: five bars on one shared
                    axis, where the card's own edge is what full width means. The lead
                    carries the ordering, which was a 12px note under the block — the one
                    sentence that stops a reader taking "largest" for largest by revenue,
                    in the place least likely to be read. */}
                {/* **No lead, at ANSR's request, and this is the removal with the
                    sharpest edge on it.** `LARGEST_LEAD` said "Ranked by the size of the
                    centre itself, never by revenue." — the one sentence stopping a reader
                    taking "largest" for largest by revenue, on a page that holds revenue
                    BANDS and can never rank by them. Every row shows a headcount range
                    and the bars encode that range, so the evidence is on screen; what is
                    gone is the sentence that says which quantity "largest" means. On the
                    blocked list beside the other provenance removals. */}
                <Panel
                  id="largest"
                  title={largestTitle(view)}
                  className="lg:col-span-3"
                  motif={<PanelArc placement="top" />}
                >
                  <LargestBlockView view={view} />
                </Panel>
                {/* **No lead, at ANSR's request** — `industrySentence` described the
                    three layers the chart draws, in the order it draws them, which the
                    chart's own labels already say.

                    **`lg:h-full` plus a centring body, because removing the lead made a
                    short card shorter.** The ranking beside it runs about 480px and this
                    card about 300, so the row left a band of empty zone under the narrower
                    one — the gap was between the blocks rather than inside either, but it
                    read as this card having failed to fill. Stretching the card and
                    centring the chart in it spends that space on the chart instead of
                    leaving it under the card. The row is still `items-start` for its other
                    child; this one opts into the row's height explicitly. */}
                {/* **`lg:justify-center` is what absorbs the ranking's new height.** That
                    block now carries a tag line per row, so the row is taller than it was
                    and this card stretches with it — and an unbounded stretch is worse
                    than a short card, because the chart's three bands grow with it until
                    each figure sits at the top of a region six times its own height.
                    `.gcc-containment` caps its own stretch (see globals.css); the leftover
                    room stays here and is split above and below the chart, which reads as
                    padding where the same space collected underneath read as a card that
                    failed to fill. */}
                <Panel
                  id="industry"
                  title={copy.industryTitle}
                  className="lg:col-span-2 lg:h-full"
                  bodyClassName="flex flex-col lg:grow lg:justify-center [&>*]:lg:grow"
                  motif={<PanelArc />}
                >
                  <IndustryCountView view={view} />
                </Panel>
              </Enter>
            </Zone>

            {/* ---- Zone 4: what they run from here, on the mint ------------------
                **Moved below the two industry blocks and given the full width, which is
                what made it compact rather than what made it bigger.** It was two fifths
                of the row above, where eight items could only tile two to a column and
                the block ran about 240px for eight strings — a lot of height for the
                least information on the page. At full width the same eight items are
                four columns and two rows.

                It stays a `Block` rather than a `Panel`: no figure, no share, no order,
                by design, so a bordered card around it would assert it is an object with
                properties. */}
            <Zone ground="tint">
              <Enter index={4}>
                {/* No lead, at ANSR's request. `FUNCTIONS_LEAD` said "Common across
                    India GCCs, whatever the industry." — which the heading already says
                    in "most GCCs", and that phrase is what `project.md` records as
                    carrying the block's generality claim after two caveat paragraphs were
                    removed. So the claim survives the sentence going. */}
                <Block id="functions" title={FUNCTIONS_TITLE}>
                  <CommonFunctionsView view={view} />
                </Block>
              </Enter>
            </Zone>

            {/* ---- Zone 5: where, on the pale teal -------------------------------- */}
            <Zone ground="surface">
              <Enter index={5}>
                {/* The section's heading is fixed, so the DERIVED finding is its lead.
                    `mapHeading` is exact where a fixed heading cannot be — "63% of the
                    Retail footprint in India is in Bengaluru" when one city dominates,
                    and the plain version when none does. */}
                {/* **No lead, at ANSR's request**, and this one cost a derived figure.
                    `mapHeading` was exact where the fixed heading cannot be — "63% of the
                    Retail footprint in India is in Bengaluru" when one city dominates —
                    so the block's one statement of concentration is gone and the ranked
                    list beside the map is what carries it now. Kept in `copy.ts` and
                    still unit-tested on both branches. On the blocked list. */}
                <Panel id="map" title={mapTitle(view)}>
                  <CityMap map={view.map} />
                </Panel>
              </Enter>
            </Zone>

            {/* ---- Zone 6: national scale, and the card ends here ----------------
                An inverse CARD on a light zone rather than an inverse zone: a dark
                block with its own corners, floating, is a harder stop than a dark band
                that runs to the card's edge — and a hard stop is what the last thing in
                the card wants. The ground under it is the mint rather than white now,
                which the alternation decided; a dark card floats on either, and this is
                the one zone whose own value the card does not depend on.

                **It no longer ends the card and has given its extra bottom padding
                back.** The close is below it, and a zone that is not last takes the
                zone rhythm's own padding — the override existed only so the card's
                foot was not tight against the last thing in it. */}
            <Zone ground="tint">
              <Enter index={6}>
                <Panel
                  id="scale"
                  title={copy.scaleTitle}
                  tone="inverse"
                  bodyClassName="py-6 md:py-8"
                >
                  <NationalScaleView
                    view={view}
                    icons={{
                      fortune: <Globe className="size-5" />,
                      forbes: <Landmark className="size-5" />,
                      people: <Users className="size-5" />,
                    }}
                  />
                </Panel>
              </Enter>
            </Zone>

            {/* ---- Zone 7: the close, and NOW the card ends here -----------------
                **Restored at the project owner's decision**, having been removed at
                ANSR's request on the page-end instruction. The zone above is still the
                terminating EVIDENCE and still reads as a hard stop for the argument;
                what follows it is the ask, which is a different kind of band and is
                marked as one by its ground.

                **`inverse-soft` is exempt from the alternation**, so it may follow the
                mint above it without breaking the strict white/mint sequence the other
                six zones hold — see `Zone`. It is teal-800 rather than the inverse
                teal because the card floats on teal-deep, and an inverse band here
                would take the card's own bottom edge with it.

                The dark `Panel` above and this dark ZONE are deliberately different
                objects: a floating inverse card on a light zone is a stop, and a band
                running to the card's edge is a surface. Two stops in a row would have
                been the mistake; a stop then a surface is the shape. */}
            <Zone ground="inverse-soft" behind={<CloseBackdrop />}>
              <Enter index={7}>
                <ClosingCta id="close" href={ctaHref} copy={closeCopy} />
              </Enter>
            </Zone>
          </ViewPanel>
        }
        /* The answers, corrected in the overlap the card normally occupies. Rendered
           outside the band because the band clips — see `ResultSurface.editor`.

           `onApply` closes the panel only on success, which on this screen is belt and
           braces: the tool keys the whole screen on the input, so a landed correction
           remounts and the panel goes with it. It is the failure case that needs the
           check — the panel has to stay open holding the error. */
        editor={
          editorOpen ? (
            <AnswerEditor
              options={editing.options}
              initial={view.input}
              pending={editing.pending}
              error={editing.error}
              onApply={async (next) => {
                if (await editing.onApply(next)) setEditorOpen(false);
              }}
              onCancel={() => setEditorOpen(false)}
            />
          ) : undefined
        }
      >
        <div className="flex flex-col gap-3 md:gap-4">
          {/* The lockup is the way back to the entry point, which it became when
              "Edit answers" stopped being one. See `ProductIdentity`. */}
          <ProductIdentity id="product-identity" onHome={onHome} />
          {/* **The band's line comes from `HEADER_LINES` now, not from `framing()`.**
              `copy.title` stated a COUNT — "5 India GCCs match your BFSI profile" — and
              five is what the grid SHOWS, capped by the peer limit, not how many matched:
              the count line under the grid says "Showing 5 of 189". The band understated
              the evidence directly above a line that contradicted it, and read as "we
              could only find five".

              **`framing()` therefore has no caller in `src/` at all.** It is kept and
              still unit-tested, like `peerLead` and `LARGEST_LEAD` before it, and reduced
              to its `title` — the lead and the three CTA fields went, since this screen
              renders no lead from it and has no CTA by instruction.

              **That says nothing about `gccStatus`, which is rendered on Screen 2.**
              `functionFraming` branches on the same field for its `h2`, its lead and all
              three fields of the closing CTA. Do not read this function's deadness as the
              field's.

              The `h1` stays the product; see `HeaderFinding` for why this is not a second
              heading. */}
          <HeaderFinding>{headerLines(copy).peers}</HeaderFinding>
        </div>
        {/* A disclosure now, not a way out: it opens `AnswerEditor` below the band. */}
        <ContextPanels
          facts={facts}
          onEdit={() => setEditorOpen((open) => !open)}
          editing={editorOpen}
          controls={ANSWER_EDITOR_ID}
        />
      </ResultSurface>
    </div>
  );
}

/**
 * The zone sequence on this surface, and the reasoning that set it.
 *
 * `Zone` itself now lives in `components/public/primitives.tsx`, because the function
 * view draws with it too and two copies would be two rhythms to keep in agreement.
 * What is local to this screen is the SEQUENCE, which is recorded here.
 *
 * **The zones are what stopped the surface reading as one flat page**, and they are
 * deliberately not the seven bands they replaced. A band was one section with its own
 * 48px heading and 80–112px of air, which is what put the first figure below the
 * fold. A zone is a colour change at a boundary and nothing else: the sections inside
 * it keep card density and card headings, and two of them can still sit on one row.
 *
 * **The grounds strictly alternate — white and mint — and `surface-pale` is
 * deliberately not part of the rhythm.**
 *
 * The near-white was a third value, carrying the rhythm on the argument that two mint
 * zones on one page would otherwise read as stripes. What settled it was a
 * measurement: `--ansr-surface-pale` and `--ansr-surface` are about 2% apart in
 * lightness, so a pale zone touching a white one is not a boundary at all. The
 * sequence had two of those, and nothing looked wrong — the boundaries simply were
 * not there.
 *
 * **The OPENING zone is the exception, and it is the near-white.** A white zone at the
 * top of a white card has no boundary anywhere — not against the card, not against the
 * tab bar above it — so the snapshot's four figures read as a row floating in unbounded
 * space rather than as the block the card opens with. The mint is not available to it
 * either: `--ansr-action` is 2.63:1 on the mint against 3.29:1 on the pale, so the
 * orange figures would fail the 3:1 large-text floor at any size.
 *
 * So the sequence is pale, mint, white, mint, white, mint. Every one of the five
 * boundaries is a real value change, and the pale still only ever neighbours the mint —
 * which is the rule it broke twice in the version this replaced, where it sat against
 * white and the boundary simply was not there.
 */

/**
 * The brand's arc dome, cropped into a card's corner.
 *
 * Already adapted — recoloured and trimmed by `scripts/brand_asset.py` into
 * `public/brand/header-horizon.svg` — so nothing here places brand art unmodified.
 * The two placements and the posture live in `.gcc-panel-arc` and
 * `.gcc-panel-arc-top`; the `aria-hidden` is applied by `Panel`, which is the one
 * place a decorative graphic cannot be got wrong by a caller.
 */
function PanelArc({ placement = "bottom" }: { placement?: "bottom" | "top" }) {
  return (
    <div
      className={cn(
        "ansr-motif hidden md:block",
        placement === "top" ? "gcc-panel-arc-top" : "gcc-panel-arc",
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- decorative, fixed
          intrinsic ratio, and not worth an optimiser round trip. */}
      <img
        src="/brand/header-horizon.svg"
        alt=""
        width={1080}
        height={540}
        className="block h-auto w-full"
      />
    </div>
  );
}

/**
 * One step of the entrance stagger.
 *
 * The delay is data — `--gcc-enter-index` multiplied by one duration step in
 * globals.css — rather than a hand-written delay per row, so adding a row cannot
 * leave two of them arriving together. It opts out under
 * `prefers-reduced-motion`, which is handled in the stylesheet rather than here.
 */
function Enter({
  index,
  className,
  children,
}: {
  index: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn("gcc-enter", className)}
      style={{ "--gcc-enter-index": index } as React.CSSProperties}
    >
      {children}
    </div>
  );
}
