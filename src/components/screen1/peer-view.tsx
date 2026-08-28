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
import { ADVANCE, framing, industryHeading, peerLead } from "./copy";
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
  return (
    <>
      <ScreenHeader motif={PEER_MOTIF}>
        <div className="flex max-w-measure flex-col gap-5">
          <HeaderKicker>India GCC landscape</HeaderKicker>
          <ScreenTitle headingRef={headingRef}>
            See who in your industry already runs a GCC in India
          </ScreenTitle>
          {/* One promise and one proof point. The previous version listed the three
              things the answer contains, which the answer's own headings say — and
              said it in the same breath as the number, so neither landed. */}
          <HeaderLead>
            Name your industry and we will show you the comparable companies,
            where they went and how big they got. Drawn from{" "}
            <strong className="font-semibold text-text-inverse">
              1,834 India centres
            </strong>{" "}
            we have mapped.
          </HeaderLead>
        </div>
      </ScreenHeader>

      <section
        aria-labelledby="ask-heading"
        className="bg-surface-tint py-16 md:py-20"
      >
        <div className="mx-auto max-w-content px-6 md:px-12">
          {/* The form sits on its own surface rather than loose on the band, and
              its heading is visible rather than screen-reader only.

              Both were the same problem: this is the one thing on the entry point
              a visitor has to DO, and it was rendered as five labelled controls
              floating on grey with no edge and no title. A panel makes it one
              object with a beginning and an end.

              The border is gone now that the band beneath it is the teal tint: a
              white panel on a tinted ground already has an edge, and ansr.com's own
              cards are borderless for exactly that reason. On grey-50 it needed the
              outline because the two values were two steps apart. */}
          <div className="flex flex-col gap-8 bg-surface p-6 md:p-10 lg:p-12">
            <div className="flex flex-col gap-2">
              <h2
                id="ask-heading"
                className="text-2xl font-bold tracking-heading text-text md:text-3xl"
              >
                Tell us about your company
              </h2>
              <p className="max-w-measure text-base text-text-muted">
                Four answers. Twenty seconds.
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
      </section>
    </>
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
