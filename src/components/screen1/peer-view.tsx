"use client";

import { useRef } from "react";

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
import { GCC_STATUS_LABELS, type PeerView, type PeerViewInput } from "@/data/screen1";
import { cn } from "@/lib/utils";
import { CityMap } from "./city-map";
import type { BusinessTypeOption } from "./input-panel";
import {
  CommonFunctionsView,
  IndustryCountView,
  LargestBlockView,
  NationalScaleView,
  PeerBlockView,
} from "./evidence";
import { ADVANCE, ASK, framing, industryHeading, peerLead } from "./copy";
import { AskHero } from "./ask-hero";
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
 * The ask: the hero, then the form panel. Two bands, no divider between them, and
 * one motif each.
 *
 * **The whole screen is on the display face** (`font-display`), which no other
 * surface is yet. Body copy on it is Light 300, which is the brand's single
 * biggest typographic tell and the thing this screen most obviously got wrong
 * before. It is scoped here rather than set on `body` deliberately: the answer
 * state and Screen 2 are a separate pass, and admin is a dense internal tool that
 * keeps Inter. Rolling it outward is the next screen's job, not a side effect of
 * this one.
 */
export function PeerViewAsk({
  headingRef,
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
  industries: readonly string[];
  revenueBands: readonly string[];
  hqCountries: readonly string[];
  businessTypesByIndustry: Readonly<Record<string, readonly BusinessTypeOption[]>>;
  initial?: PeerViewInput;
  pending: boolean;
  submitError: string | null;
  onSubmit: (input: PeerViewInput) => void;
}) {
  /**
   * The hero pill's target. A ref handed down to the form rather than a DOM query
   * or a fragment link:
   *
   *   - A fragment link would push a history entry inside the iframe, and the tool
   *     does not own its URL.
   *   - `document.getElementById` would need an id on a control whose id comes
   *     from `useId`, so it would have to be hardcoded and could collide.
   *
   * `focus()` scrolls the control into view as a side effect of the browser doing
   * its job, which is the only scrolling mechanism the iframe constraints allow —
   * nothing here reads scroll position or observes intersection.
   */
  const industryRef = useRef<HTMLSelectElement>(null);

  return (
    <div className="font-display">
      <AskHero
        headingRef={headingRef}
        onJumpToForm={() => industryRef.current?.focus()}
      />

      <section
        id="ask"
        aria-labelledby="ask-heading"
        // No top padding below `md`. With the panel full-bleed on a phone, 64px of
        // padding left a strip of mint between the hero and the panel that was too
        // thin to read as a band and too thick to read as nothing. The brand draws no
        // rule between bands and the ground change IS the separation, so two
        // full-bleed blocks meeting is the correct mobile shape; the panel's own top
        // shoulder carries the air. From `md` the panel is inset and the band needs
        // its padding back.
        className="relative overflow-hidden bg-surface-tint pb-16 md:pt-20 md:pb-24"
      >
        {/* Motif B, the reference's signature ornament, and the first thing in this
            project to use `.ansr-bar-ramp`.

            It is a VERTICAL FIELD IN THE TRAILING GROUND, not a full-bleed band, and
            the difference is the whole placement. Run across the band's width it
            drew a picket fence — the loudest thing on the screen after the headline,
            reading as a divider rule between the two bands, which the brand never
            draws, and continuing down either side of the panel as though the panel
            had been dropped on top of it. Confined to a strip beside the panel it is
            what the reference actually does with it: band 4 puts a 219-wide bar-ramp
            panel flush to the trailing edge of a card and nothing else. See
            `.gcc-ask-ramp`. */}
        <div
          className="ansr-motif gcc-ask-ramp ansr-bar-ramp ansr-bar-ramp--tile hidden lg:block"
          aria-hidden="true"
        />

        {/* `px-0` below `md`, so the panel is full-bleed on a phone.
            Two things it buys, and both were visible in the render: the panel's own
            padding then puts its content at the same inset as the hero's text
            instead of 24px further in, and the fields get 48px back on a 390px
            screen, where they were the narrowest thing on either screen. From `md`
            up the panel is an inset card again, which is what gives it an edge. */}
        <div className="relative mx-auto max-w-content px-0 md:px-12">
          <div className="grid lg:grid-cols-12">
            {/* Ten of twelve, leaving the trailing ground for the ramp.
                Deliberately not centred — the reference's own stat card sits right of
                centre with empty ground beside it rather than balanced in its band.

                The panel is the reference's offer-card anatomy rather than a bordered
                box, and each part of that is load-bearing:

                  - **Radius 0.** Every panel, card and accordion row in the
                    reference is a true 0; only the pill CTA and one stat card round.
                  - **A generous top shoulder.** The reference leaves 95px of empty
                    card above its first ink. That emptiness is what makes a
                    hard-edged panel read as composed rather than as a container,
                    and it is the cheapest thing here to spoil by tightening.
                  - **No border and no shadow.** A white panel on the tinted ground
                    already has an edge, and the brand is graphic, not glossy.
                  - **It ends in a dissolve rather than an edge.** */}
            <div className="lg:col-span-10">
              <div className="flex flex-col gap-10 bg-surface px-6 pt-16 pb-12 md:px-10 md:pt-20 md:pb-16 lg:px-12">
                <h2
                  id="ask-heading"
                  className="text-3xl leading-tight font-bold tracking-display text-balance text-text md:text-4xl lg:text-5xl"
                >
                  {ASK.panelTitle}
                </h2>
                <InputPanel
                  industryRef={industryRef}
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

              {/* Motif C, and the first thing to use `.ansr-dissolve`: 27 hairlines of
                  the panel's own white decaying into the band, so the panel has no
                  bottom edge. It stays crisp at any zoom, which a gradient fade does
                  not.

                  **A sibling of the panel, not a child of it.** As a child it
                  inherited the panel's own white fill underneath itself, so the
                  masked hairlines were white on white — invisible — while the
                  panel's background still filled the box and drew exactly the hard
                  edge this exists to remove. It rendered as 96px of blank card. The
                  effect only exists where the fill it carries is against a
                  DIFFERENT ground. */}
              <div
                // 112px against the reference's 154. The effect is white-on-mint at
                // 1.27:1 by construction, so it needs length to read at all — at
                // 80px it was a smudge rather than a dissolve.
                className="ansr-dissolve gcc-panel-dissolve h-16 md:h-28"
                aria-hidden="true"
              />
            </div>
          </div>
        </div>
      </section>
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
            <InputSummary
              facts={[
                { term: "Industry", value: view.industry.industry },
                { term: "Revenue", value: view.input.revenueBand },
                { term: "Headquarters", value: view.input.hqCountry },
                {
                  term: "India today",
                  value: GCC_STATUS_LABELS[view.input.gccStatus],
                },
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
