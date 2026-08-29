"use client";

import { useState } from "react";
import { Tabs as TabsPrimitive } from "radix-ui";

import { companyName, type PeerViewInput } from "@/data/screen1";
import {
  metricWidth,
  type FunctionAreaView,
  type FunctionView,
  type MetricWidth,
  type ShownMetric,
} from "@/data/screen2";
import { BarChart3, Users } from "lucide-react";

import { ClosingCta } from "@/components/public/closing-cta";
import { Provenance } from "@/components/public/primitives";
import {
  ContextPanels,
  ProductIdentity,
  ScreenHeader,
  ViewPanel,
  ViewTabs,
  type ContextFact,
  type HeaderMotif,
} from "@/components/public/screen-header";
import { cn } from "@/lib/utils";
import {
  AREA_LEAD,
  AREA_PROVENANCE,
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
  ctaHref,
  onBack,
  onEditProfile,
  panelRef,
}: FunctionViewScreenProps) {
  const copy = functionFraming(input);
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
    <>
      <ScreenHeader
        motif={FUNCTION_MOTIF}
        tabs={
          /* The same component Screen 1 renders, with `current` flipped — which is
             what makes the treatment reverse rather than being two hand-built
             strips that have to be kept in agreement. Function Opportunity is the
             white cell here and connects to this screen's content surface; Peer
             Landscape returns to the band's own teal. */
          <ViewTabs
            current="functions"
            onSwitch={(next) => {
              if (next === "peers") onBack();
            }}
            icons={{
              peers: <Users className="size-5" />,
              functions: <BarChart3 className="size-5" />,
            }}
          />
        }
      >
        {/* **No `HeaderFinding` here, unlike Screen 1, and the asymmetry is the
            correct one.** Screen 1's band gained the finding because its content
            surface opens on a figure strip with no sentence in it — the band was
            otherwise a lockup and a row of answers, which is chrome and no content.
            This screen already opens on its finding as a real `h2`, two elements
            below; putting the same sentence on the band would be saying it twice
            inside one scroll, and the version in the band would be the one that is
            not a heading. */}
        <ProductIdentity id="product-identity" />
        {/* Straight to the form, not via the peer view. Same behaviour as Screen 1's
            row, which is the point: it is the same component in the same place on both
            screens, so the two cannot mean different things. */}
        <ContextPanels facts={facts} onEdit={onEditProfile} />
      </ScreenHeader>

      <ViewPanel view="functions" panelRef={panelRef}>
      <section
        // Named `function-metrics` rather than `functions`, because Screen 1 has a
        // `#functions` card and two ids that differ only by which phase is mounted are
        // two ids a spec will eventually confuse. Located by id in the suite, never by
        // its heading — the heading is this screen's finding and is a copywriter's to
        // change.
        id="function-metrics"
        aria-labelledby="functions-heading"
        // White, not the pale teal it was. The selected tab above it is a white
        // surface that has to read as continuous with this one — see `ViewTabs` — and
        // a white tab meeting a teal band is two layers rather than one. The metric
        // cards took a hairline border in the same change, since they used to borrow
        // their edge from the tint. Nothing else about this screen moved.
        className="bg-surface pt-10 pb-16 md:pt-12 md:pb-24"
      >
        <div className="mx-auto flex max-w-content flex-col gap-10 px-6 md:px-12">
          <div className="flex max-w-measure flex-col gap-4">
            {/* **This screen's finding, which used to be the display `h1` in a teal
                hero.** The `h1` is the product name now and is shared with Screen 1,
                so the sentence that says what THIS view is moved down to the head of
                its own content — where it is still the first thing read, and where it
                is no longer competing with a hero for the same 200px. */}
            <h2
              id="functions-heading"
              className="text-2xl leading-tight font-bold tracking-display text-text md:text-3xl lg:text-4xl"
            >
              {copy.title}
            </h2>
            <p className="text-base text-pretty text-text-muted md:text-lg">
              {copy.lead}
            </p>
          </div>

          <TabsPrimitive.Root
            value={active}
            onValueChange={setActive}
            // State lives in this component, like every other piece of screen
            // state in the tool. There is no URL to reflect a tab into.
            className="flex flex-col gap-8"
          >
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

      {/* Screen 1's close was removed at ANSR's request — its page now ends at the
          evidence strip. This one stays: the conversation still has to be offered
          somewhere, and this is the deeper of the two views, reached by a visitor
          who has already read the peer landscape. */}
      <ClosingCta href={ctaHref} copy={copy} headingId="function-cta-heading" />
      </ViewPanel>
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
/**
 * Every card's width, packed so no row is left part-empty.
 *
 * `metricWidth` is a property of a single metric and stays that way — it is what
 * the ordering sorts by, and a width that changed with its neighbours would make
 * that sort circular. But a card's width is a bet about what sits BESIDE it, and
 * that is a row-level question, so the adjustment lives here in the component,
 * which is the only thing this file is allowed to have an opinion about.
 *
 * This replaces a narrower rule that promoted a LONE third to a half. That fixed
 * the one-scalar case on finance and left the commonest one untouched: technology
 * has five thirds, which drew three, then two beside a visible gap, and then a
 * lone half card with an empty half-row next to it. Two holes in a tab. An empty
 * cell in a grid of figures reads as a card that failed to load — which on a
 * screen whose whole argument is "these numbers are solid" is expensive.
 *
 * Widths only ever widen. Nothing is narrowed to make a row tile, because a
 * narrower card is the metric's own shape being misrepresented, and nothing is
 * reordered, because the order is by how much of the eye a metric needs.
 */
function packWidths(shown: ShownMetric[]): MetricWidth[] {
  const widths = shown.map(metricWidth);

  // Thirds come first in the sort, so they are a leading run. Three fill a row; a
  // remainder of two widens to two halves, which fills one exactly. A remainder of
  // ONE cannot fill a row on its own, so it is widened to a half and left to pair
  // with the halves run behind it.
  const thirds = widths.filter((w) => w === "third").length;
  const remainder = thirds % 3;
  if (remainder > 0) {
    for (let i = thirds - remainder; i < thirds; i++) widths[i] = "half";
  }

  // Halves — the promoted ones and the metrics that were always halves — tile two
  // to a row. An odd one out goes full width, EXCEPT a single figure: a scalar
  // across twelve columns is the four-fifths-empty card the weighting exists to
  // prevent, and one part-empty row is the cheaper of the two.
  const lastHalf = widths.lastIndexOf("half");
  const odd = shown[lastHalf];
  if (odd) {
    const halves = widths.filter((w) => w === "half").length;
    if (halves % 2 === 1 && odd.shape !== "scalar") {
      widths[lastHalf] = "full";
    }
  }

  return widths;
}

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
        // Twelve columns and `items-start`, which together are the fix for this
        // screen's worst layout artefact. On a two-column grid every card
        // stretched to its row's tallest neighbour, so a single figure sitting
        // beside a nine-part breakdown rendered as a card four fifths full of
        // nothing. Widths are now weighted by what a card draws — `metricWidth` —
        // and height follows content.
        <ul
          className="gcc-enter grid grid-cols-1 items-start gap-4 sm:grid-cols-12"
          style={enter()}
        >
          {(() => {
            const widths = packWidths(area.shown);
            return area.shown.map((shown, i) => (
              <MetricCard
                key={shown.metric.id}
                shown={shown}
                width={widths[i] ?? metricWidth(shown)}
              />
            ));
          })()}
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
          <ul className="grid grid-cols-1 items-start gap-4 sm:grid-cols-12">
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
