"use client";

import { ClosingCta } from "@/components/public/closing-cta";
import { Section } from "@/components/public/primitives";
import {
  HeaderKicker,
  InputSummary,
  QuietButton,
  ScreenHeader,
  type HeaderMotif,
} from "@/components/public/screen-header";
import { GCC_STATUS_LABELS, type PeerView, type PeerViewInput } from "@/data/screen1";
import { cn } from "@/lib/utils";
import { CityMap } from "./city-map";
import {
  CommonFunctionsView,
  IndustryCountView,
  LargestBlockView,
  NationalScaleView,
  PeerBlockView,
} from "./evidence";
import { ADVANCE, framing, industryHeading } from "./copy";
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
 * `arc-dome` recoloured to `--ansr-teal-600` and trimmed with
 * `scripts/brand_asset.py`, then held back by `.ansr-motif` and masked to a
 * horizon — see `.gcc-horizon` in globals.css. Never placed unmodified.
 *
 * Two things learned by looking at it, worth not relearning: stretched wide enough
 * to bleed across the header, the only part of the dome that fits inside a
 * header's height is its flattest slice, which reads as diagonal wallpaper rather
 * than arcs; and the headline is leading-aligned and capped at the reading measure,
 * so the trailing side is the ground the ornament should take.
 */
const PEER_MOTIF: HeaderMotif = {
  src: "/brand/header-horizon.svg",
  width: 784,
  height: 280,
  placement: "gcc-horizon",
};

export function PeerViewAsk({
  headingRef,
  industries,
  revenueBands,
  hqCountries,
  initial,
  pending,
  submitError,
  onSubmit,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  industries: readonly string[];
  revenueBands: readonly string[];
  hqCountries: readonly string[];
  initial?: PeerViewInput;
  pending: boolean;
  submitError: string | null;
  onSubmit: (input: PeerViewInput) => void;
}) {
  return (
    <>
      <ScreenHeader motif={PEER_MOTIF}>
        <div className="flex max-w-measure flex-col gap-4">
          <HeaderKicker>India GCC landscape</HeaderKicker>
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="text-4xl leading-tight font-bold tracking-display text-text md:text-5xl"
          >
            See who in your industry already runs a GCC in India
          </h1>
          <p className="text-lg text-text-muted">
            Four answers and you get the comparable companies, the cities they
            chose, and the scale of the India base — drawn from{" "}
            <strong className="font-semibold text-text">
              1,834 mapped India GCCs
            </strong>
            .
          </p>
        </div>
      </ScreenHeader>

      <section aria-labelledby="ask-heading" className="bg-surface-subtle py-16">
        <div className="mx-auto max-w-content px-6 md:px-12">
          <h2 id="ask-heading" className="sr-only">
            Tell us about your company
          </h2>
          <InputPanel
            industries={industries}
            revenueBands={revenueBands}
            hqCountries={hqCountries}
            initial={initial}
            pending={pending}
            submitError={submitError}
            onSubmit={onSubmit}
          />
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

  const bands = [
    {
      id: "peers",
      kicker: "Comparable companies",
      title:
        peerCount === 1
          ? "One company matches you closely"
          : `${peerCount} companies match you closely`,
      lead: "Same industry, closest revenue band, and companies from your own market first.",
      tint: true,
      body: <PeerBlockView view={view} />,
    },
    {
      id: "industry",
      kicker: "The wider industry",
      title: industryHeading(view),
      tint: false,
      body: <IndustryCountView view={view} />,
    },
    {
      id: "largest",
      kicker: "The upper end",
      title: "The largest companies in your industry here",
      tint: true,
      body: <LargestBlockView view={view} />,
    },
    {
      id: "functions",
      kicker: "What they run",
      title: "The functions India GCCs carry",
      tint: false,
      body: <CommonFunctionsView view={view} />,
    },
    {
      id: "map",
      kicker: "Where they are",
      title: `${view.industry.industry} GCCs across India`,
      lead: "Density by city, filtered to your industry.",
      tint: true,
      body: <CityMap map={view.map} />,
    },
    {
      id: "scale",
      kicker: "The whole base",
      title: "The scale you would be joining",
      lead: "Across all of India, not just your industry.",
      tint: false,
      body: <NationalScaleView view={view} />,
    },
    {
      id: "advance",
      kicker: ADVANCE.kicker,
      title: ADVANCE.title,
      lead: ADVANCE.lead,
      tint: true,
      body: <AdvanceToFunctions onOpenFunctions={onOpenFunctions} />,
    },
  ];

  return (
    <>
      <ScreenHeader motif={PEER_MOTIF}>
        <div className="flex flex-col gap-6">
          <div className="flex max-w-measure flex-col gap-4">
            <HeaderKicker>India GCC landscape</HeaderKicker>
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="text-4xl leading-tight font-bold tracking-display text-text md:text-5xl"
            >
              {copy.title}
            </h1>
            <p className="text-lg text-text-muted">{copy.lead}</p>
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
            tint={band.tint}
            weight={
              band.id === "peers"
                ? "pivotal"
                : band.id === "advance"
                  ? "connective"
                  : "standard"
            }
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
          "inline-flex min-h-11 items-center rounded-md bg-surface-accent px-6",
          "text-base font-semibold text-text-on-accent",
          "transition-colors duration-fast ease-standard hover:bg-surface-inverse",
        )}
      >
        {ADVANCE.label}
      </button>
    </div>
  );
}
