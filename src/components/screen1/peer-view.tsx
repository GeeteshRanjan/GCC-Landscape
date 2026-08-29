"use client";



import { ClosingCta } from "@/components/public/closing-cta";
import { Section, type Ground } from "@/components/public/primitives";
import {
  HeaderKicker,
  HeaderLead,
  InputSummary,
  QuietButton,
  ScreenHeader,
  ScreenTitle,
  type HeaderMotif,
} from "@/components/public/screen-header";
import type { HeroCopy, ImpactStat } from "@/data/schema";
import { GCC_STATUS_LABELS, type PeerView, type PeerViewInput } from "@/data/screen1";
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
import { ADVANCE, ASK, framing, industryHeading, peerLead } from "./copy";
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
        className="relative flow-root bg-surface-tint pb-10 md:pb-14"
      >
        {/* Twelve columns' worth of container, but the card is centred and
            narrower than the full measure rather than taking ten of twelve off to
            one side. That was right when a motif occupied the trailing ground; with
            a centred hero above it, an off-centre card breaks the one thing the
            brief asks for — that every band shares a visual centre. */}
        <div className="mx-auto max-w-content px-4 md:px-12">
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
            )}
          >
            <div className="flex flex-col gap-8 md:gap-10">
              <h2
                id="ask-heading"
                className="text-2xl leading-tight font-bold tracking-display text-balance text-text md:text-3xl lg:text-4xl"
              >
                {ASK.panelTitle}
              </h2>
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
 * The bands, in the order they build the argument: who is comparable, how many
 * more there are, who the biggest are, what they run, where they run it, and how
 * large the whole base is. Widening from five named companies to a national
 * figure, so the least specific evidence lands last.
 *
 * Then two closes, in that order, and the order is the point: the tool offers the
 * visitor more of itself before it asks them for anything. The function view is a
 * teal-filled control on a tinted band; the conversation is the one orange fill on
 * the one inverse band. Two different registers, distinguished by form and by
 * ground rather than by two buttons of equal weight side by side.
 *
 * Tint alternates at every boundary — one separation mechanism, applied
 * consistently.
 */
export function PeerViewAnswer({
  headingRef,
  view,
  ctaHref,
  onChangeDetails,
  onOpenFunctions,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  view: PeerView;
  ctaHref: string;
  onChangeDetails: () => void;
  onOpenFunctions: () => void;
}) {
  const copy = framing(view);
  const peerCount = view.peers.peers.length;

  /**
   * Declared rather than inferred, because the bands no longer share one shape:
   * `lead` and `layout` are present on some and not others, and an inferred union
   * has neither key on every member — so reading `band.layout` in the render below
   * would not compile.
   */
  type Band = {
    id: string;
    kicker: string;
    title: string;
    lead?: string;
    ground: Ground;
    weight: "connective" | "standard" | "pivotal";
    layout?: "stack" | "split";
    body: React.ReactNode;
  };

  /**
   * The bands, in the order they build the argument.
   *
   * Every title states the finding rather than naming the section. "The wider
   * industry" and "The upper end" made the reader work out what they were being
   * shown; a heading that says it is the same number of words and does the work
   * for them. The kickers stay as the connective tissue — they are the numbering,
   * not the label.
   */
  const bands: Band[] = [
    {
      id: "peers",
      kicker: "Comparable companies",
      title:
        peerCount === 1
          ? "One company like yours is already here"
          : `${peerCount} companies like yours are already here`,
      lead: peerLead(view),
      ground: "tint" as const,
      weight: "pivotal" as const,
      body: <PeerBlockView view={view} />,
    },
    {
      id: "industry",
      kicker: "Your industry",
      title: industryHeading(view),
      // A figure band. One number is the whole argument here, so it gets the
      // inverse ground and the display size — the most emphatic thing this palette
      // can do without touching orange, which is committed to the CTA.
      ground: "inverse" as const,
      weight: "pivotal" as const,
      layout: "split" as const,
      body: <IndustryCountView view={view} />,
    },
    {
      id: "largest",
      kicker: "The upper end",
      title: `How large ${view.industry.industry} centres get here`,
      // Stack, not split: five ranked bars with figures at their trailing end need
      // the whole measure, and a 7-column well would crush them.
      ground: "surface" as const,
      weight: "standard" as const,
      body: <LargestBlockView view={view} />,
    },
    {
      id: "functions",
      kicker: "What they run",
      title: "The work India centres typically carry",
      ground: "tint" as const,
      weight: "standard" as const,
      layout: "split" as const,
      body: <CommonFunctionsView view={view} />,
    },
    {
      id: "map",
      kicker: "Where they went",
      title: `${view.industry.industry} clusters in a handful of cities`,
      lead: "GCCs per city, filtered to your industry.",
      ground: "surface" as const,
      weight: "standard" as const,
      body: <CityMap map={view.map} />,
    },
    {
      id: "scale",
      kicker: "The whole base",
      title: "How much of the global index is already here",
      lead: "Across all of India, not just your industry.",
      // The second figure band, and the last piece of evidence before the ask.
      ground: "inverse" as const,
      weight: "pivotal" as const,
      body: <NationalScaleView view={view} />,
    },
    {
      id: "advance",
      kicker: ADVANCE.kicker,
      title: ADVANCE.title,
      lead: ADVANCE.lead,
      ground: "tint" as const,
      weight: "connective" as const,
      // Deliberately `stack`, and the empty trailing width is not a defect worth
      // fixing. `split` was tried and rendered worse: the column is `items-start`,
      // so a single pill top-aligned with the kicker, which put the action ahead of
      // the sentence that motivates it in reading order and detached it from its
      // own heading. A left-aligned connective band with air beside it is the
      // normal shape here; a floating trailing button is not.
      body: <AdvanceToFunctions onOpenFunctions={onOpenFunctions} />,
    },
  ];

  return (
    <>
      <ScreenHeader motif={PEER_MOTIF}>
        <div className="flex flex-col gap-8">
          <div className="flex max-w-measure flex-col gap-5">
            <HeaderKicker>India GCC landscape</HeaderKicker>
            <ScreenTitle headingRef={headingRef}>{copy.title}</ScreenTitle>
            <HeaderLead>{copy.lead}</HeaderLead>
          </div>

          {/* A polite live region, because the answer replaced the form without a
              navigation. Not assertive: the visitor asked for this. */}
          <p role="status" className="sr-only">
            {peerCount === 0
              ? `No comparable companies found in ${view.industry.industry}.`
              : `Showing ${peerCount} comparable ${peerCount === 1 ? "company" : "companies"} in ${view.industry.industry}.`}
          </p>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            {/* Three facts, not four. "India today" was here and is gone with the
                question that produced it: `gccStatus` is now a constant supplied by
                the form rather than an answer the visitor gave — see
                `ASSUMED_GCC_STATUS` in `input-panel.tsx` — so echoing it back would
                be the tool telling the visitor what they said about something it
                never asked. The value still frames the whole answer; it is just no
                longer presented as theirs.

                Every remaining fact is an answer they actually typed, which is the
                property this summary needs to keep: it exists so a visitor can see
                what the result was built from before deciding to change it. */}
            <InputSummary
              facts={[
                { term: "Industry", value: view.industry.industry },
                { term: "Revenue", value: view.input.revenueBand },
                { term: "Headquarters", value: view.input.hqCountry },
              ]}
            />
            <QuietButton onClick={onChangeDetails}>
              Change these details
            </QuietButton>
          </div>
        </div>
      </ScreenHeader>

      {bands.map((band, index) => (
        <div
          key={band.id}
          className="gcc-enter"
          // The stagger is data, not a hand-written delay per section. The header
          // is index 0, so the first band starts one step behind it.
          style={{ "--gcc-enter-index": index + 1 } as React.CSSProperties}
        >
          <Section
            id={band.id}
            kicker={band.kicker}
            title={band.title}
            lead={band.lead}
            ground={band.ground}
            weight={band.weight}
            layout={band.layout}
          >
            {band.body}
          </Section>
        </div>
      ))}

      <ClosingCta href={ctaHref} copy={copy} headingId="peer-cta-heading" />
    </>
  );
}

/**
 * The way on to Screen 2.
 *
 * Teal fill rather than orange: orange is restricted to the one outward call to
 * action per screen, and a screen with two orange buttons has no primary action at
 * all. White on `--ansr-accent` measures 8.55:1, which is already in the verified
 * pairing list — no new pairing was introduced to make this work.
 */
function AdvanceToFunctions({
  onOpenFunctions,
}: {
  onOpenFunctions: () => void;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onOpenFunctions}
        className={cn(
          // Pill and teal. Same shape as the orange close, so both read as
          // actions; different fill, so only one reads as THE action.
          "inline-flex min-h-12 items-center rounded-full bg-surface-accent px-7",
          "text-base font-semibold text-text-on-accent",
          "transition-colors duration-fast ease-standard hover:bg-surface-inverse",
        )}
      >
        {ADVANCE.label}
      </button>
    </div>
  );
}
