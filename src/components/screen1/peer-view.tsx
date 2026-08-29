"use client";



import { BarChart3, Globe, Landmark, Users } from "lucide-react";

import { Panel } from "@/components/public/primitives";
import {
  ContextPanels,
  HeaderFinding,
  ProductIdentity,
  ScreenHeader,
  ViewPanel,
  ViewTabs,
  type ContextFact,
  type HeaderMotif,
} from "@/components/public/screen-header";
import type { HeroCopy, ImpactStat } from "@/data/schema";
import { companyName, type PeerView, type PeerViewInput } from "@/data/screen1";
import { cn } from "@/lib/utils";
import { CityMap } from "./city-map";
import type { BusinessTypeOption, TieredOptions } from "./input-panel";
import {
  CommonFunctionsView,
  IndustryCountView,
  LargestBlockView,
  NationalScaleView,
  PeerBlockView,
} from "./evidence";
import {
  ASK,
  framing,
  FUNCTIONS_LEAD,
  FUNCTIONS_TITLE,
  INDUSTRY_TITLE,
  industrySentence,
  LARGEST_LEAD,
  largestTitle,
  mapHeading,
  mapTitle,
  PEERS_TITLE,
  peerLead,
  SCALE,
  signals,
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
  industries: TieredOptions;
  revenueBands: readonly string[];
  hqCountries: TieredOptions;
  businessTypesByIndustry: Readonly<Record<string, readonly BusinessTypeOption[]>>;
  initial?: PeerViewInput;
  pending: boolean;
  submitError: string | null;
  onSubmit: (input: PeerViewInput) => void;
}) {
  return (
    <div className="font-display">
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
                {ASK.panelTitle}
              </h2>
              {/* Light 300, which is the brand's own paragraph weight and the whole
                  reason this screen is on the display face. Black rather than muted:
                  it is a sentence the visitor has to read to know what the form does,
                  not a caption, and `--ansr-text-muted` on white is where a line
                  starts being skipped. Capped at the reading measure so it does not
                  run the full 896px of the card. */}
              <p className="max-w-measure text-base leading-normal font-light text-pretty text-text md:text-lg">
                {ASK.panelLead}
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

      <CustomerLogos />

      <ImpactBand stats={impactStats} />
    </div>
  );
}

/**
 * The answer: a compact teal context area, then one white content surface holding
 * six cards.
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
 *   1. The teal context area — the product name, and the visitor's four answers as
 *      controls. No headline, no lead, no decorative map. See `ScreenHeader`.
 *   2. The tab strip at its foot, whose selected cell is the same white surface as
 *      the content below it, so the two are one layer.
 *   3. SNAPSHOT — four industry-level figures, the index to everything under it.
 *   4. The comparison table, full width.
 *   5. Two analytical rows, each a third and two thirds: the industry context beside
 *      the largest centres, then the function list beside the locations map.
 *   6. The terminating dark evidence strip, which is where the page ends.
 *
 * **The page ends at the strip.** There is no closing CTA card, no "Talk to ANSR"
 * panel, no footer and no methodology links. What the screen owes the reader is
 * either inside the strip's own source line or in the provenance on the card that
 * needed it. `ctaHref` is therefore no longer threaded into this screen at all —
 * Screen 2 still carries the conversation.
 *
 * **Two thirds, not halves, on both analytical rows.** The industry context is one
 * figure and three stepped tracks; the largest centres are a four-column table. Half
 * each left the table cramped enough to scroll at 1440 while the card beside it was
 * two thirds empty. Same asymmetry on the row below, for the same reason: a ranked
 * list of eight functions is narrow and a map with a ranked list beside it is not.
 */
export function PeerViewAnswer({
  panelRef,
  view,
  onChangeDetails,
  onOpenFunctions,
}: {
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
  onChangeDetails: () => void;
  onOpenFunctions: () => void;
}) {
  const copy = framing(view);
  const peerCount = view.peers.peers.length;
  const name = companyName(view.input);

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
    { label: "Revenue band", value: view.input.revenueBand },
  ];

  return (
    /**
     * The whole screen is on the display face, which is what makes it read as the
     * same product as the entry point. It brings Light 300 body copy with it — the
     * brand's single biggest typographic tell, and the reason this is worth a class
     * rather than being left to `body`. Admin keeps Inter deliberately.
     */
    <div className="font-display">
      <ScreenHeader
        motif={PEER_MOTIF}
        tabs={
          <ViewTabs
            current="peers"
            onSwitch={(next) => {
              if (next === "functions") onOpenFunctions();
            }}
            icons={{
              peers: <Users className="size-5" />,
              functions: <BarChart3 className="size-5" />,
            }}
          />
        }
      >
        <div className="flex flex-col gap-3 md:gap-4">
          <ProductIdentity id="product-identity" />
          {/* **The finding, back on the band and not as a heading.** The pass that
              cut the display hero left this band holding a lockup and a row of
              answers — chrome and no content — so a visitor who had just submitted a
              form was told which product they were in and what they had typed, and
              nothing about the result. `copy.title` is the same sentence the old 72px
              hero carried, at a third of the size. The `h1` stays the product; see
              `HeaderFinding` for why this is deliberately not a second heading. */}
          <HeaderFinding>{copy.title}</HeaderFinding>
        </div>
        <ContextPanels facts={facts} onEdit={onChangeDetails} />
      </ScreenHeader>

      <ViewPanel view="peers" panelRef={panelRef}>
        {/* A polite live region, because the answer replaced the form without a
            navigation. Not assertive: the visitor asked for this. `framing().title` is
            also now on the band above as `HeaderFinding`, so this is a second reading
            of a visible sentence rather than the only copy of it — which is the right
            way round. */}
        <p role="status" className="sr-only">
          {peerCount === 0
            ? `No comparable companies found in ${view.industry.industry}.`
            : `${copy.title}. Showing ${peerCount} comparable ${peerCount === 1 ? "company" : "companies"} in ${view.industry.industry}.`}
        </p>

        {/* ---- Zone 1: the industry at a glance, on the pale teal -------------
            Continuous with the band above it, so the strip reads as the last thing
            the header says rather than the first thing the content does. That is
            also what makes it survive being four figures with no section around
            them. */}
        <Zone ground="tint">
          <Enter index={1}>
            <Snapshot signals={signals(view)} />
          </Enter>
        </Zone>

        {/* ---- Zone 2: the comparison set, on white ---------------------------
            The primary evidence, and the only section that gets a whole zone to
            itself. The accent header strip is spent here rather than shared out —
            one card on the surface announces itself in colour, and it is this one. */}
        <Zone ground="surface">
          <Enter index={2}>
            <Panel
              id="peers"
              title={PEERS_TITLE}
              lead={peerLead(view)}
              tone="accent"
            >
              <PeerBlockView view={view} />
            </Panel>
          </Enter>
        </Zone>

        {/* ---- Zone 3: the industry around them, on the near-white mint -------
            Two sections that are both about the industry rather than about the five
            companies, so they share a ground and a row.

            `items-start` on the row. A grid child stretches to its row by default, so
            the containment card was padded out to the height of the list beside it and
            rendered with a band of empty white under its own content — the same
            artefact Screen 2's metric grid has `items-start` for. */}
        <Zone ground="pale">
          <Enter index={3} className="grid items-start gap-4 lg:grid-cols-5 lg:gap-5">
            {/* Three fifths and two fifths, and the split is decided by the two
                cards' own shapes rather than by which matters more. The containment
                chart is a wide chart — three labelled layers on one axis — and the
                function list is eight short lines that tile two to a row. Eight tiles
                in two columns is four rows, which comes out within about 20px of this
                card's height, so the row has no visible shortfall on either side.

                Eight in THREE columns was tried and is worse for a reason that has
                nothing to do with width: 8 does not divide by 3, so the last row loses
                a cell — and an empty cell in a grid of evidence reads as a tile that
                failed to load. Two and four are the only column counts 8 tiles may
                take, and four is too narrow for "Business operations and shared
                services". */}
            <Panel
              id="industry"
              title={INDUSTRY_TITLE}
              lead={industrySentence(view)}
              className="lg:col-span-3"
              motif={<PanelArc />}
            >
              <IndustryCountView view={view} />
            </Panel>
            <Panel
              id="functions"
              title={FUNCTIONS_TITLE}
              lead={FUNCTIONS_LEAD}
              className="lg:col-span-2"
            >
              <CommonFunctionsView view={view} />
            </Panel>
          </Enter>
        </Zone>

        {/* ---- Zone 4: the upper end, on white -------------------------------
            A ranking, and it gets the tinted card so it is visibly a different kind
            of block from the white comparison cards two zones up. */}
        <Zone ground="surface">
          <Enter index={4}>
            {/* **The ordering, as the section's lead rather than as a footnote.** It
                was "Ranges reflect reported employee bands, so nothing here is ranked
                by revenue." at 12px under the block — the one sentence that stops a
                reader taking "largest" for largest by revenue, in the place least
                likely to be read. We hold bands, never revenue, so it cannot simply be
                dropped. */}
            <Panel
              id="largest"
              title={largestTitle(view)}
              lead={LARGEST_LEAD}
              tone="tint"
              motif={<PanelArc placement="top" />}
            >
              <LargestBlockView view={view} />
            </Panel>
          </Enter>
        </Zone>

        {/* ---- Zone 5: where, on the pale teal -------------------------------- */}
        <Zone ground="tint">
          <Enter index={5}>
            {/* The section's heading is fixed, so the DERIVED finding is its lead.
                `mapHeading` is exact where a fixed heading cannot be — "63% of the
                Retail footprint in India is in Bengaluru" when one city dominates, and
                the plain version when none does. */}
            <Panel id="map" title={mapTitle(view)} lead={mapHeading(view)}>
              <CityMap map={view.map} />
            </Panel>
          </Enter>
        </Zone>

        {/* ---- Zone 6: national scale, and the page ends here ----------------
            The inverse card on white rather than an inverse zone: a dark block with
            its own corners, floating on white, is a harder stop than a dark band that
            runs to the frame's edge — and a hard stop is what the last thing on the
            page wants. Nothing below it. */}
        <Zone ground="surface" className="pb-10 md:pb-14">
          <Enter index={6}>
            <Panel
              id="scale"
              title={SCALE.title}
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
      </ViewPanel>
    </div>
  );
}

/**
 * One full-bleed ground, holding one or two sections.
 *
 * **The zones are what stopped the surface reading as one flat page**, and they are
 * deliberately not the seven bands they replaced. A band was one section with its own
 * 48px heading and 80–112px of air, which is what put the first figure below the
 * fold. A zone is a colour change at a boundary and nothing else: the sections inside
 * it keep card density and card headings, and two of them can still sit on one row.
 *
 * Four values in six zones — mint, white, near-white mint, white, mint, white — so
 * every boundary is visible and no two adjacent zones are the same. The near-white
 * (`surface-pale`) is what lets two mint zones appear on one page without reading as
 * stripes: it is a different step of the same hue, so the sequence has a rhythm
 * rather than an alternation.
 *
 * `overflow-hidden` via `.gcc-zone`, because a zone is where a full-bleed ornament
 * would be cropped. None is placed yet — the ornaments on this surface are inside
 * cards — and the class is there so adding one cannot silently widen the document,
 * which the iframe does not own the scroll of.
 */
function Zone({
  ground,
  className,
  children,
}: {
  ground: "surface" | "tint" | "pale";
  className?: string;
  children: React.ReactNode;
}) {
  const GROUND = {
    surface: "bg-surface",
    tint: "bg-surface-tint",
    pale: "bg-surface-pale",
  } as const;
  return (
    <div className={cn("gcc-zone", GROUND[ground])}>
      <div
        className={cn(
          // Tighter than the band system's rhythm, on purpose. This is an embedded
          // tool inside a page with its own rhythm, and the complaint this pass is
          // answering was that everything was too far apart.
          "mx-auto max-w-content px-6 py-8 md:px-12 md:py-10",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

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
