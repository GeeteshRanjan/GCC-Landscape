import type {
  FunctionAreaView,
  LaidOutHeld,
  ShownMetric,
} from "@/data/screen2";
import { Panel } from "@/components/public/primitives";
import {
  MilestoneTrack,
  RangeBenchmark,
  RankedBars,
  type BarRow,
} from "@/components/public/charts";
import {
  FIGURES_HEADING,
  heldHeading,
  METRIC_NOTES,
  OPS_SECTIONS,
} from "./copy";
import { GraduateOutput } from "./graduate-card";
import { HeldMetricCard } from "./metric-card";
import { SummaryFigures, type SummaryFigure } from "./summary-figures";
import { TabZones } from "./zones";

/**
 * The operations tab, composed rather than derived.
 *
 * **The second tab to be authored, and everything `hr-view.tsx` says about the cost
 * applies here unchanged** — it selects metrics BY ID, so a metric added to the
 * catalogue does not appear where this file puts things, and the leftover branch at the
 * foot is what stops that being silence. Read that file's header before this one; what
 * follows is only what is different about operations.
 *
 * **Three of the nine metrics are drawn as ONE FIGURE EACH rather than as their own
 * card, which is new and is the whole shape of this composition.** The derived tab drew
 * eight cards: the two hiring ranges, the scale curve, the latency breakdown, the
 * graduate split, plus a card each for office stock, uptime and disruption days. ANSR
 * asked for those last three as summary figures at the head of the tab and for their
 * sections removed. So the tab opens on four figures — a workforce, an uptime, a stock
 * of floorspace and a count of lost days — and every chart below it is a chart worth
 * charting.
 *
 * **What that costs, stated because it is a real loss and not a tidy-up.** A summary
 * figure is ONE part of a breakdown, and two of these breakdowns had a second part with
 * a job:
 *
 *   - `ops-power-uptime` is deliberately split so the campus figure and the Tier 1 grid
 *     figure sit together — its own note says a single number "would hide the weaker
 *     one", which is exactly what showing 99.95% alone does. What keeps that honest is
 *     the cell's supporting note, which is the PART'S OWN LABEL: "At a Grade A campus
 *     with N+1 backup" scopes the figure to the campus, so the card claims nothing about
 *     the grid rather than quietly claiming the campus figure for it. That is why the
 *     notes come from the data and not from a sentence in `copy.ts`.
 *   - `ops-grade-a-office-stock` loses its vacant-stock figure, and with it the answer
 *     to "could we move in now". Nothing on the tab replaces it; it is on
 *     `handoff.md`'s blocked list.
 *
 * **The disruption cell states "0", at the project owner's explicit instruction, and it
 * is the one figure on this screen that the data does not support.** The metric's four
 * cities are 4, 2, 3 and 6 days and its own note puts the national figure at 3–6, so
 * there is no zero anywhere in the dataset. This cell previously stated the real extent
 * ("2 – 6") precisely because a nought is not a measurement that exists here; that
 * refusal was overruled on instruction, so the figure is now a literal.
 *
 * Two consequences to know before touching it. The figure is written HERE rather than
 * into the metric, so `ops-disruption-days` still holds only supplied values and admin
 * still edits real ones — the fabrication is confined to this one cell and is visible in
 * one place. And the browser spec that asserted the absence of a zero on this tab now
 * asserts its presence, which is the record that the change was deliberate.
 *
 * **Nothing here draws a mark that the derived tab did not, and two things it drew are
 * gone.** The nested office-stock bar and the two-figure uptime pair went with their
 * cards. `Journey` — the staircase reading of the scale curve — goes with the switch to
 * `MilestoneTrack`, which the composition asks for explicitly so the two composed tabs
 * draw the progression identically. That has a consequence worth knowing before anyone
 * looks for it: `journeyLegs`' derived intervals ("+6", "+12", "+12") are no longer
 * drawn anywhere on the screen, because operations was the last tab drawing them.
 * `Journey` is still the renderer for a `journey` display in `metric-card.tsx`, so a
 * progression on a derived tab would still get it.
 */

/* ==========================================================================
   Selection

   By id, and every lookup may fail. A missing metric drops its cell or its card
   rather than throwing or drawing an empty one — the same rule `publicMetricsFor`
   applies a layer down.
   ========================================================================== */

/** The three metrics that appear only as a summary figure. */
const BENCH_ID = "ops-bench-strength";
const UPTIME_ID = "ops-power-uptime";
const OFFICE_ID = "ops-grade-a-office-stock";
const DISRUPTION_ID = "ops-disruption-days";

const VELOCITY_IDS = ["ops-time-to-first-hire", "ops-backfill-time"] as const;

const MILESTONES_ID = "ops-scale-milestones";
const LATENCY_ID = "ops-network-latency";
const GRADUATES_ID = "ops-graduate-output";

/** Everything this file places, so the leftovers can be found by subtraction. */
const PLACED_IDS: readonly string[] = [
  BENCH_ID,
  UPTIME_ID,
  OFFICE_ID,
  DISRUPTION_ID,
  ...VELOCITY_IDS,
  MILESTONES_ID,
  LATENCY_ID,
  GRADUATES_ID,
];

function pick(shown: readonly ShownMetric[], id: string): ShownMetric | undefined {
  return shown.find((metric) => metric.metric.id === id);
}

/* ==========================================================================
   The summary row's four cells

   Built here rather than in the component that draws them, for the same reason every
   fraction on this screen is built in `screen2.ts`: which part of a breakdown a
   headline figure comes from is a decision, and a decision belongs where it can be
   read in one place.

   **No arithmetic and no formatting.** Every figure below is a string the view model
   already produced, and the extent is SELECTED by comparing parts' `share` — which is
   each part's value over the metric's own largest, so it orders the parts without this
   file ever seeing a number. A component that computed a minimum would then have to
   format it, and formatting is the one thing that must not happen twice.
   ========================================================================== */

/**
 * The cells are `SummaryFigure`s, which is the shared row's own type.
 *
 * **A local `SummaryCell` interface was here and it was the same five fields plus a
 * `floor` boolean.** The boolean is resolved into the cell's `note` as it is built —
 * every cell on this tab carries a note of its own, and a floor is one of the things a
 * note can say — so there is nothing left for a second type to hold. Four tabs, one
 * cell shape, and the browser suite's `#function-metrics ul > li` contract means the
 * same thing on all of them.
 */

/**
 * What the disruption cell states, verbatim.
 *
 * **Supplied by the project owner and not derived from the metric.** The extent this
 * replaced was selected by comparing parts' `share`, which is why `extentOf` is gone
 * along with it — nothing on this tab reduces a breakdown to a pair any more. See the
 * file header for what the literal costs and why it is confined to this constant.
 */
const DISRUPTION_FIGURE = "0";

function summaryCells(shown: readonly ShownMetric[]): SummaryFigure[] {
  const cells: SummaryFigure[] = [];

  const bench = pick(shown, BENCH_ID);
  if (bench?.shape === "scalar") {
    cells.push({
      id: bench.metric.id,
      figure: bench.figure,
      title: bench.metric.title,
    });
  }

  /**
   * The leading part of each of these two.
   *
   * The leading part is the one the composition asks for in both cases — total stock
   * rather than vacant, the Grade A campus rather than the Tier 1 grid — and it is the
   * catalogue's own first entry, so nothing here reorders or chooses between parts on a
   * criterion of its own.
   *
   * **The part's own label used to ride along as the cell's note, and the SCOPE it was
   * carrying now lives in the metric's title instead.** A cell is one line under its
   * figure, so there is nowhere for a second string to go — and the reason the label was
   * there at all was that a lifted part must not claim its parent's population: 99.95% is
   * true of a Grade A campus and not of the Tier 1 grid. Both titles state that
   * themselves now ("Uptime at a Grade A campus", "Grade A stock, mn sq ft, top 7
   * cities"), which is one authored string rather than two strings that have to agree.
   */
  for (const id of [UPTIME_ID, OFFICE_ID]) {
    const metric = pick(shown, id);
    if (metric?.shape !== "breakdown") continue;
    const lead = metric.parts[0];
    if (!lead) continue;
    cells.push({
      id,
      figure: lead.figure,
      title: metric.metric.title,
    });
  }

  // Still gated on the metric being present, so removing it from the catalogue removes
  // the cell rather than leaving a figure with nothing behind it at all.
  const disruption = pick(shown, DISRUPTION_ID);
  if (disruption?.shape === "breakdown") {
    cells.push({
      id: DISRUPTION_ID,
      figure: DISRUPTION_FIGURE,
      title: disruption.metric.title,
    });
  }

  return cells;
}

/* ==========================================================================
   The tab
   ========================================================================== */

export function OpsPanel({ area }: { area: FunctionAreaView }) {
  const cells = summaryCells(area.shown);
  const velocity = VELOCITY_IDS.map((id) => pick(area.shown, id)).filter(
    (metric): metric is ShownMetric => metric?.shape === "range",
  );
  const milestones = pick(area.shown, MILESTONES_ID);
  const latency = pick(area.shown, LATENCY_ID);
  const graduates = pick(area.shown, GRADUATES_ID);
  const leftovers = area.shown.filter(
    (metric) => !PLACED_IDS.includes(metric.metric.id),
  );

  /**
   * The sections this tab has, in composition order. `TabZones` gives each one its own
   * ground and alternates from the list — see that file for why one white ground with
   * 48/64px section gaps was the wrong answer, and `hr-view.tsx` for what the change
   * costs.
   */
  const sections: React.ReactNode[] = [];
  if (cells.length > 0) {
    sections.push(<OperationsSummary key="figures" cells={cells} />);
  }
  if (velocity.length > 0) {
    sections.push(<Velocity key="velocity" ranges={velocity} />);
  }
  if (milestones || latency) {
    sections.push(
      <Supporting key="supporting" milestones={milestones} latency={latency} />,
    );
  }
  if (graduates?.shape === "breakdown") {
    sections.push(<GraduateOutput key="graduates" shown={graduates} />);
  }
  if (leftovers.length > 0) {
    sections.push(<Leftovers key="leftovers" metrics={leftovers} />);
  }
  /* **Operations has no gated metric today, so this adds nothing — and the branch is
     here rather than removed on purpose.** The instruction was to drop the "figures
     shaped by your roles and cities" section, and on this tab the data already satisfies
     it: all nine metrics are open. Suppressing the branch as well would mean a metric
     gated in a later commit was invisible on the page while being perfectly present in
     the data, which is the one failure mode that looks like nothing at all. Same
     reasoning as `Leftovers`. */
  if (area.heldCards.length > 0) {
    sections.push(<HeldGroup key="held" cards={area.heldCards} />);
  }

  return <TabZones sections={sections} />;
}

/* ==========================================================================
   1 — India's operations landscape

   Four national facts, in `SummaryFigures` — the same component the other three tabs
   open on, and one of them states an extent rather than a point.

   **Four bordered cards are gone; the discipline they were carrying is not.** The
   instruction was typography and nothing else — no glyph, no illustration, no ring, no
   bar — because a gauge behind 99.95% would be a part-to-whole claim about a figure that
   is not part of anything, and a mark behind a single number invents a scale it has no
   axis for. All of that still holds. What the border was doing was making four labels of
   four different lengths read as four equal cells, and the shared row does it with a
   fixed figure box instead: every label sits on one line because the box above it is one
   height, which is Screen 1's snapshot device.

   Every cell here carries a note, which is what makes the promotion honest rather than
   lossy — three of the four figures are the LEADING PART of a breakdown whose own section
   was removed, and the note is that part's own label. See the file comment.
   ========================================================================== */

function OperationsSummary({ cells }: { cells: readonly SummaryFigure[] }) {
  return (
    <SummaryFigures
      heading={FIGURES_HEADING.operations}
      headingId="figures-operations-heading"
      cells={cells}
    />
  );
}

/* ==========================================================================
   2 — Hiring velocity benchmarks

   The same two metrics, in the same component, under the same heading constant as the
   HR tab. Nothing about this section is operations-specific and that is the point: a
   reader crossing between the two tabs must not be able to tell that two files drew it.
   ========================================================================== */

function Velocity({ ranges }: { ranges: readonly ShownMetric[] }) {
  return (
    <section
      id="ops-velocity"
      aria-label={OPS_SECTIONS.velocity}
      className="flex min-w-0 flex-col"
    >
      {/* `items-stretch` and a centring body, exactly as the HR tab draws this same
          section — see the comment there. A reader crossing between the two tabs must not
          be able to tell that two files drew it. */}
      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2 lg:gap-8">
        {ranges.map((shown) =>
          shown.shape === "range" ? (
            <Panel
              key={shown.metric.id}
              id={`metric-${shown.metric.id}`}
              title={shown.metric.title}
              bodyClassName="flex flex-col grow justify-center"
            >
              <div className="flex flex-col gap-4">
                <RangeBenchmark
                  low={shown.low}
                  high={shown.high}
                  lowLabel={shown.lowLabel}
                  highLabel={shown.highLabel}
                  offset={shown.offset}
                  unit={shown.metric.unit}
                />
                {METRIC_NOTES[shown.metric.id] ? (
                  <p className="text-xs text-text-muted">
                    {METRIC_NOTES[shown.metric.id]}
                  </p>
                ) : null}
              </div>
            </Panel>
          ) : null,
        )}
      </div>
    </section>
  );
}

/* ==========================================================================
   3 — Supporting operational benchmarks

   How long the next hundred people take, and how far the cloud is. Two questions about
   running a centre here, side by side.

   **Two different chart types for two different claims**, which is the same argument
   the HR tab's analysis section makes. The scale curve is one centre measured four
   times as it grows; the latency set is four destinations measured once each. Both are
   four rising durations, and drawing them the same way — which is what the derived
   layout did before `progression` existed — told the reader they were the same kind of
   thing.
   ========================================================================== */

function Supporting({
  milestones,
  latency,
}: {
  milestones?: ShownMetric;
  latency?: ShownMetric;
}) {
  return (
    <section
      id="ops-supporting"
      aria-label={OPS_SECTIONS.supporting}
      className="flex min-w-0 flex-col"
    >
      {/* `items-stretch` and centring bodies, exactly as the HR tab draws its own
          analysis row and as the velocity section above already does — the milestone track
          is shorter than the latency ranking beside it, and at `items-start` the surplus
          was bare zone under the shorter card. */}
      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2 lg:gap-8">
        {milestones?.shape === "breakdown" ? (
          <Panel
            id={`metric-${milestones.metric.id}`}
            title={milestones.metric.title}
            // "months, median" — the unit once, rather than under each of four circles.
            lead={milestones.metric.unit}
            bodyClassName="flex flex-col grow justify-center"
          >
            {/* **`MilestoneTrack`, which is what the HR tab draws, replacing `Journey`.**
                Both read the same `parts` — a part's `share` is its value over the
                largest, which for a rising duration set is where it sits on the whole
                progression — so no figure moved and nothing forked. What changed is that
                the two composed tabs now draw one progression one way. The cost is the
                derived intervals, which only `Journey` renders; see the file comment. */}
            <MilestoneTrack
              points={milestones.parts.map((part) => ({
                label: part.label,
                figure: part.figure,
                share: part.share,
              }))}
            />
          </Panel>
        ) : null}

        {latency?.shape === "breakdown" ? (
          <Panel
            id={`metric-${latency.metric.id}`}
            title={latency.metric.title}
            // "milliseconds", once, rather than after each of four figures.
            lead={latency.metric.unit}
            bodyClassName="flex flex-col grow justify-center"
          >
            {/* **Inline rows, and the grey track STAYS.** The track is what tells a
                reader where full width is, and only a set sorted by the quantity its own
                bars encode states that itself — this one runs outward by distance, so
                `selfLabelling` is false and the track is the shared axis every row is
                measured against. Passed rather than hardcoded, so re-ordering the
                entries in admin changes the drawing correctly. */}
            <RankedBars
              rows={latency.parts.map(
                (part): BarRow => ({
                  label: part.label,
                  figure: part.figure,
                  share: part.share,
                }),
              )}
              inline
              bareTrack={latency.selfLabelling}
            />
          </Panel>
        ) : null}
      </div>
    </section>
  );
}

/* ==========================================================================
   4 — Graduate output by discipline

   Drawn by `GraduateOutput` in `graduate-card.tsx`, which is where this card's own
   reasoning lives. It was a function in this file while operations was the only tab
   left showing the shared metric; HR's view of it is restored at ANSR's request, so
   the markup moved to one place rather than being copied into a second tab. Nothing
   about the drawing changed.
   ========================================================================== */

/* ==========================================================================
   Leftovers — anything the catalogue gained that this file does not place

   Not dead code. This composition selects by id, so an operations metric added in a
   later commit would otherwise be present in the data and invisible on the page. A
   generic card is a worse reading than a placed one and an infinitely better one than
   silence. See `hr-view.tsx`, which carries the same branch for the same reason.
   ========================================================================== */

function Leftovers({ metrics }: { metrics: readonly ShownMetric[] }) {
  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2 lg:gap-8">
      {metrics.map((shown, index) => (
        <Panel
          key={shown.metric.id}
          id={`metric-${shown.metric.id}`}
          title={shown.metric.title}
          lead={shown.metric.unit}
          // An odd last card takes the whole measure, which is `packWidths`'s rule
          // applied to the one grid here whose length is not known in advance.
          className={
            index === metrics.length - 1 && metrics.length % 2 === 1
              ? "lg:col-span-2"
              : undefined
          }
        >
          {shown.shape === "breakdown" ? (
            <RankedBars
              rows={shown.parts.map(
                (part): BarRow => ({
                  label: part.label,
                  figure: part.figure,
                  share: part.share,
                }),
              )}
              inline
              bareTrack={shown.selfLabelling}
            />
          ) : (
            <p className="text-3xl leading-tight font-bold tracking-display text-text tabular-nums">
              {shown.shape === "scalar" ? shown.figure : null}
            </p>
          )}
        </Panel>
      ))}
    </div>
  );
}

/* ==========================================================================
   The held group — unreachable today, and see `OpsPanel` for why it is here

   Drawn with the DERIVED tab's own components and heading, not HR's composed pair.
   HR's sealed cards are a hand-built matrix preview and a two-model ratio preview,
   authored against the two metrics that tab actually holds; there is no way to know what
   a future gated operations metric would be, so this falls back to the generic
   placeholder every other tab uses.
   ========================================================================== */

function HeldGroup({ cards }: { cards: readonly LaidOutHeld[] }) {
  const headingId = "ops-held-heading";
  return (
    <section
      id="ops-held"
      aria-labelledby={headingId}
      className="flex flex-col gap-6"
    >
      <h2
        id={headingId}
        className="text-xl leading-snug font-bold tracking-display text-text md:text-2xl"
      >
        {heldHeading(cards.length)}
      </h2>
      {/* Twelve columns, because `HeldMetricCard` carries its own `lg:col-span-*` from
          the width `heldWidth` gave it — the widths are already packed by `layoutArea`,
          so no row can be left part-empty. */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {cards.map(({ held, width }) => (
          <HeldMetricCard key={held.metric.id} held={held} width={width} />
        ))}
      </div>
    </section>
  );
}
