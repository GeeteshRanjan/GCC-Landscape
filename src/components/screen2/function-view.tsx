"use client";

import { useState } from "react";
import { Tabs as TabsPrimitive } from "radix-ui";

import { GCC_STATUS_LABELS, type PeerViewInput } from "@/data/screen1";
import type { FunctionAreaView, FunctionView } from "@/data/screen2";
import { ClosingCta } from "@/components/public/closing-cta";
import { Provenance } from "@/components/public/primitives";
import {
  HeaderKicker,
  InputSummary,
  QuietButton,
  ScreenHeader,
  type HeaderMotif,
} from "@/components/public/screen-header";
import { cn } from "@/lib/utils";
import {
  AREA_LEAD,
  AREA_PROVENANCE,
  BACK_LABEL,
  functionFraming,
  heldHeading,
  HELD_BODY,
  SCREEN_PROVENANCE,
  TABS_LABEL,
} from "./copy";
import { HeldMetricCard, MetricCard } from "./metric-card";

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

export interface FunctionViewScreenProps {
  view: FunctionView;
  /** Screen 1's answers, reused to frame this screen. Nothing new is asked. */
  input: PeerViewInput;
  ctaHref: string;
  onBack: () => void;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
}

export function FunctionViewScreen({
  view,
  input,
  ctaHref,
  onBack,
  headingRef,
}: FunctionViewScreenProps) {
  const copy = functionFraming(input);
  const first = view.areas[0]?.functionArea ?? "tech";
  const [active, setActive] = useState<string>(first);

  return (
    <>
      <ScreenHeader motif={FUNCTION_MOTIF}>
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

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <InputSummary
              facts={[
                { term: "Industry", value: input.industry },
                { term: "Revenue", value: input.revenueBand },
                { term: "Headquarters", value: input.hqCountry },
                { term: "India today", value: GCC_STATUS_LABELS[input.gccStatus] },
              ]}
            />
            <QuietButton onClick={onBack}>{BACK_LABEL}</QuietButton>
          </div>
        </div>
      </ScreenHeader>

      <section
        aria-labelledby="functions-heading"
        className="bg-surface-subtle py-20"
      >
        <div className="mx-auto flex max-w-content flex-col gap-8 px-6 md:px-12">
          <h2
            id="functions-heading"
            className="text-2xl font-semibold tracking-heading text-text md:text-3xl"
          >
            The four functions, measured
          </h2>

          <TabsPrimitive.Root
            value={active}
            onValueChange={setActive}
            // State lives in this component, like every other piece of screen
            // state in the tool. There is no URL to reflect a tab into.
            className="flex flex-col gap-8"
          >
            <TabsPrimitive.List
              aria-label={TABS_LABEL}
              className="flex flex-wrap gap-x-2 border-b border-border-strong"
            >
              {view.areas.map((area) => (
                <TabsPrimitive.Trigger
                  key={area.functionArea}
                  value={area.functionArea}
                  className={cn(
                    // 44px, the public screens' control height, against the
                    // registry wrapper's 36. A first-time visitor on a phone.
                    "-mb-px inline-flex min-h-11 items-center border-b-2 border-transparent px-3",
                    "text-base font-semibold text-text-muted",
                    "transition-colors duration-fast ease-standard hover:text-text",
                    "data-[state=active]:border-accent-teal data-[state=active]:text-text",
                  )}
                >
                  {area.label}
                </TabsPrimitive.Trigger>
              ))}
            </TabsPrimitive.List>

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
        </div>
      </section>

      <ClosingCta href={ctaHref} copy={copy} headingId="function-cta-heading" />
    </>
  );
}

/**
 * One tab's contents.
 *
 * There are no group headings inside a tab, and that is the deliberate part. The
 * catalogue files every metric under one of four lenses — talent supply, speed to
 * stand up, location, cost — and rendering those as four public subheadings would
 * have been a transcription of an internal filing system rather than a decision
 * about this screen. What each card leads with instead is its own question, in the
 * visitor's terms; the order is by how much of the eye a metric needs, decided in
 * `src/data/screen2.ts`.
 *
 * The staggered blocks are the screen's one motion moment. Three steps, so the
 * whole sequence lands well inside the flow threshold however many cards a tab has
 * — staggering twelve cards individually would have put the last one most of a
 * second behind the first.
 */
function AreaPanel({ area }: { area: FunctionAreaView }) {
  const provenance = AREA_PROVENANCE[area.functionArea];
  let step = 0;
  const enter = () =>
    ({ "--gcc-enter-index": step++ }) as React.CSSProperties;

  return (
    <div className="flex flex-col gap-8">
      <p
        className="gcc-enter max-w-measure text-base text-text-muted"
        style={enter()}
      >
        {AREA_LEAD[area.functionArea]}
      </p>

      {area.shown.length > 0 ? (
        <ul
          className="gcc-enter grid grid-cols-1 gap-4 sm:grid-cols-2"
          style={enter()}
        >
          {area.shown.map((shown) => (
            <MetricCard key={shown.metric.id} shown={shown} />
          ))}
        </ul>
      ) : null}

      {area.held.length > 0 ? (
        <section
          aria-labelledby={`held-${area.functionArea}-heading`}
          className="gcc-enter flex flex-col gap-6 border-t border-border-strong pt-8"
          style={enter()}
        >
          <div className="flex flex-col gap-3">
            <h3
              id={`held-${area.functionArea}-heading`}
              className="text-xl font-semibold tracking-heading text-text"
            >
              {heldHeading(area.held.length)}
            </h3>
            <p className="max-w-measure text-sm text-text-muted">{HELD_BODY}</p>
          </div>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {area.held.map((held) => (
              <HeldMetricCard key={held.metric.id} held={held} />
            ))}
          </ul>
        </section>
      ) : null}

      <div className="gcc-enter flex flex-col gap-3" style={enter()}>
        {provenance ? <Provenance>{provenance}</Provenance> : null}
        <Provenance>{SCREEN_PROVENANCE}</Provenance>
      </div>
    </div>
  );
}
