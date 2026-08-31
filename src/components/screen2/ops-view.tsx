import type {
  FunctionAreaView,
  LaidOutHeld,
  MetricPart,
  ShownMetric,
} from "@/data/screen2";
import { Block, Panel } from "@/components/public/primitives";
import {
  MilestoneTrack,
  RangeBenchmark,
  RankedBars,
  type BarRow,
} from "@/components/public/charts";
import {
  FIGURES_HEADING,
  FLOOR_NOTE,
  heldHeading,
  METRIC_NOTES,
  OPS_SECTIONS,
  OPS_SUMMARY_NOTES,
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
 * **The disruption cell states an EXTENT, and that is a refusal.** The supplied
 * composition asks for "0 days", noted as the lowest recorded across the cities
 * assessed. There is no zero in this dataset: the four cities are 4, 2, 3 and 6 days,
 * and the metric's own note puts the national figure at 3–6. A card reading 0 would be
 * an invented figure on a screen whose entire argument is that nothing here is invented.
 * The lowest single city — 2 — would be truthful and would be the best case presented as
 * the fact. The extent is neither: it states both ends of the real set, so it also
 * preserves the one thing removing the by-city section would otherwise have thrown away,
 * which is how far the cities differ. The conflict is on the blocked list to be shown to
 * ANSR, not to be undone.
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
 * The lowest and highest part of a breakdown, by share.
 *
 * Selection, not reduction: both figures are returned verbatim as the strings the view
 * model formatted. Collapses to a single figure where the set has one distinct value,
 * so a one-city dataset would read "4 days" rather than "4 – 4".
 */
function extentOf(parts: readonly MetricPart[]): { figure: string; high?: string } | null {
  const first = parts[0];
  if (!first) return null;
  let low = first;
  let high = first;
  for (const part of parts) {
    if (part.share < low.share) low = part;
    if (part.share > high.share) high = part;
  }
  return low.figure === high.figure
    ? { figure: low.figure }
    : { figure: low.figure, high: high.figure };
}

function summaryCells(shown: readonly ShownMetric[]): SummaryFigure[] {
  const cells: SummaryFigure[] = [];

  const bench = pick(shown, BENCH_ID);
  if (bench?.shape === "scalar") {
    cells.push({
      id: bench.metric.id,
      figure: bench.figure,
      title: bench.metric.title,
      unit: bench.metric.unit,
      // The floor is what this cell's note says; the others' notes name the population
      // their figure was measured over. One field, because a cell has one note.
      note: bench.metric.atLeast ? FLOOR_NOTE : undefined,
    });
  }

  /**
   * The leading part of each of these two, with the part's own label as the note.
   *
   * The leading part is the one the composition asks for in both cases — total stock
   * rather than vacant, the Grade A campus rather than the Tier 1 grid — and it is the
   * catalogue's own first entry, so nothing here reorders or chooses between parts on a
   * criterion of its own.
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
      unit: metric.metric.unit,
      note: metric.metric.atLeast ? FLOOR_NOTE : lead.label,
    });
  }

  const disruption = pick(shown, DISRUPTION_ID);
  if (disruption?.shape === "breakdown") {
    const extent = extentOf(disruption.parts);
    if (extent) {
      cells.push({
        id: DISRUPTION_ID,
        ...extent,
        title: disruption.metric.title,
        unit: disruption.metric.unit,
        note: disruption.metric.atLeast
          ? FLOOR_NOTE
          : OPS_SUMMARY_NOTES[DISRUPTION_ID],
      });
    }
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
    <Block id="ops-velocity" title={OPS_SECTIONS.velocity}>
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
              headingLevel={3}
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
    </Block>
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
    <Block id="ops-supporting" title={OPS_SECTIONS.supporting}>
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2 lg:gap-8">
        {milestones?.shape === "breakdown" ? (
          <Panel
            id={`metric-${milestones.metric.id}`}
            title={milestones.metric.title}
            // "months, median" — the unit once, rather than under each of four circles.
            lead={milestones.metric.unit}
            headingLevel={3}
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
            headingLevel={3}
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
    </Block>
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
