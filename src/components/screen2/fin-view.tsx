import { METRIC_FUNCTION_LABELS } from "@/data/metrics";
import type { FunctionAreaView, LaidOutHeld, ShownMetric } from "@/data/screen2";
import { Panel } from "@/components/public/primitives";
import {
  IndexSpread,
  IndexTable,
  RankedBars,
  StackedShare,
  type BarRow,
  type IndexTableRow,
} from "@/components/public/charts";
import {
  FIGURES_HEADING,
  FIN_DRIVERS_INSIGHT,
  FIN_FIGURES_QUALIFIER,
  FIN_LEADS,
  FIN_TABLE_ROW_HEADER,
  FLOOR_NOTE,
  heldHeading,
  indexedNote,
} from "./copy";
import { HeldMetricCard } from "./metric-card";
import { scalarCells, SummaryFigures } from "./summary-figures";
import { TabZones } from "./zones";

/**
 * The finance tab, composed rather than derived.
 *
 * **The third authored tab, and everything `hr-view.tsx` says about the cost applies
 * here unchanged** — it selects metrics BY ID, so a metric added to the catalogue does
 * not appear where this file puts things, and the leftover branch at the foot is what
 * stops that being silence. Read that file's header first; what follows is only what is
 * different about finance.
 *
 * **Three of four is past the threshold `project.md` set, and this pass does not pretend
 * otherwise.** Two composed tabs was the point at which the next one was supposed to be
 * a decision about whether the derivation survives at all. It does survive, for exactly
 * one tab — technology — and that is now the whole justification for `layoutArea`,
 * `metricWidth`, `packWidths` and `AreaPanel`'s derived zone sequence remaining on the
 * screen. None of it is dead: it is what a metric added to a composed tab still falls
 * back to, and it is what technology renders. But the next composition request is a
 * request to delete a derivation with one live caller, and that is a bigger change than
 * a fourth early return.
 *
 * **What is new here is how much of the supplied composition is REFUSED.** Both earlier
 * compositions had one deviation each — HR's missing "Update roles & cities" button,
 * operations' "0 days". This one has three, and they are the same class of problem three
 * times: the reference asks for figures and sentences that do not exist in this
 * repository. `copy.ts`'s finance block lists all four asks that are not drawn and why.
 * The short version:
 *
 *   - **The overview row is THREE cards, not four.** The leading card the reference
 *     asks for is "Operating cost advantage vs global peers — 30–40% lower", and no such
 *     figure exists here. The nearest thing in the catalogue is a sentence inside
 *     `fin-cost-growth`'s admin note putting the wage gap at 55–65%, which is a
 *     different quantity measured against a different base and does not cross the gate.
 *     Three growth rates fill the row exactly, which is the shape the metrics were added
 *     in — see the block comment on `fin-operating-cost-growth`.
 *   - **There is no second "Cost structure breakdown" panel.** Its five figures are
 *     unsourced, and it would sit beside `fin-cost-composition` as a second split of one
 *     subject.
 *   - **There is no "Deep dive" section and no call to action.** The bullets would be
 *     invented claims; the CTA is gone from the whole tool at ANSR's request, and a
 *     browser spec asserts the public surface holds no outbound link.
 *
 * The consequence of the second refusal is worth stating because it changes the layout
 * rather than just removing a card: with one analytical panel instead of two, the
 * reference's balanced two-column row does not exist here. The drivers chart takes the
 * whole measure — which is the width `metricWidth` gives a stacked whole anyway, for the
 * reason that a part-to-whole bar needs room to label its segments.
 *
 * **Nothing on this tab draws a mark the derived version did not, and two things are
 * drawn differently.** The tier spread was `Dumbbells`, a stack of three rows on one
 * axis, and is now three cards; the location comparison was `IndexLollipop`, a plot per
 * row, and is now a table. Both are the composition's ask and both have an argument
 * behind them on the components themselves. `Dumbbells` and `IndexLollipop` are still
 * what a derived tab's index grid gets, and technology has none, so both now have no
 * live caller — the same position `Journey`, `NestedBar` and `RangeBar` are already in.
 */

/* ==========================================================================
   Selection
   ========================================================================== */

/** The overview row, in catalogue order: wage, operating cost, workplace. */
const FIGURE_IDS = [
  "fin-cost-growth",
  "fin-operating-cost-growth",
  "fin-workplace-cost-growth",
] as const;

const COMPOSITION_ID = "fin-cost-composition";
const SPREAD_ID = "fin-tier-cost-spread";
const HUBS_ID = "fin-india-vs-hubs";

/** Everything this file places, so the leftovers can be found by subtraction. */
const PLACED_IDS: readonly string[] = [
  ...FIGURE_IDS,
  COMPOSITION_ID,
  SPREAD_ID,
  HUBS_ID,
];

function pick(shown: readonly ShownMetric[], id: string): ShownMetric | undefined {
  return shown.find((metric) => metric.metric.id === id);
}

/* ==========================================================================
   The tab
   ========================================================================== */

export function FinPanel({ area }: { area: FunctionAreaView }) {
  const figures = FIGURE_IDS.map((id) => pick(area.shown, id)).filter(
    (metric): metric is ShownMetric => metric?.shape === "scalar",
  );
  const drivers = pick(area.shown, COMPOSITION_ID);
  const spread = pick(area.shown, SPREAD_ID);
  const hubs = pick(area.shown, HUBS_ID);
  const leftovers = area.shown.filter(
    (metric) => !PLACED_IDS.includes(metric.metric.id),
  );

  /**
   * The sections this tab has, in composition order — overview, where the advantage
   * comes from, what a cheaper city saves, how India sits against the alternatives, then
   * what depends on the visitor. `TabZones` gives each one its own ground and alternates
   * from the list; see that file for why one white ground with 48/64px section gaps was
   * the wrong answer.
   */
  const sections: React.ReactNode[] = [];
  if (figures.length > 0) {
    sections.push(<CostOverview key="figures" figures={figures} />);
  }
  if (drivers?.shape === "breakdown") {
    sections.push(<Drivers key="drivers" shown={drivers} />);
  }
  if (spread?.shape === "grid" && spread.grid.kind === "dumbbell") {
    sections.push(
      <TierSpread key="spread" shown={spread} rows={spread.grid.rows} />,
    );
  }
  if (hubs?.shape === "grid" && hubs.grid.kind === "lollipop") {
    sections.push(
      <DeliveryLocations
        key="hubs"
        shown={hubs}
        columns={hubs.grid.columns}
        rows={hubs.grid.rows}
        functionArea={area.functionArea}
      />,
    );
  }
  if (leftovers.length > 0) {
    sections.push(<Leftovers key="leftovers" metrics={leftovers} />);
  }
  if (area.heldCards.length > 0) {
    sections.push(<HeldGroup key="held" cards={area.heldCards} />);
  }

  return <TabZones sections={sections} />;
}

/* ==========================================================================
   1 — India's cost base

   Three growth rates, in `SummaryFigures` — the same component the other three tabs
   open on.

   **Three bordered cards are gone and the row's qualifier with them.** The instruction
   was typography and nothing else — no icon, no coloured fill, no mark of any kind,
   because a gauge behind 9.8% would be a part-to-whole claim about a figure that is not
   part of anything — and that is unchanged. What the border was doing was making three
   labels of three different lengths read as three equal cells, which the shared row does
   with a fixed figure box instead.

   **`FIN_FIGURES_QUALIFIER` is kept exported and is no longer drawn.** "Year-on-year
   growth" sat beside the heading because all three figures are rates and none carries a
   `unit` field — but all three TITLES already end in "year on year", so the row said it
   four times, and the heading is now a 12px eyebrow that a second line of body text
   beside it reads as a subtitle to. The period is on every card that has one.
   ========================================================================== */

function CostOverview({ figures }: { figures: readonly ShownMetric[] }) {
  return (
    <SummaryFigures
      heading={FIGURES_HEADING.finance}
      headingId="figures-finance-heading"
      cells={scalarCells(figures)}
    />
  );
}

/* ==========================================================================
   2 — What drives the cost advantage

   One divided bar, because the four parts ARE the whole.

   **A bare `Panel` under the metric's own title**, rather than a `Block` wrapping a
   card: the section heading the composition asks for is the metric's title word for
   word, so a `Block` above it would state the same words twice. Same call the operations
   tab's graduate card makes.
   ========================================================================== */

function Drivers({ shown }: { shown: ShownMetric & { shape: "breakdown" } }) {
  return (
    <Panel
      id={`metric-${shown.metric.id}`}
      title={shown.metric.title}
      lead={FIN_LEADS[shown.metric.id]}
    >
      {/* The segments and their key, from the shared component: one divided bar with a
          hairline of the card's own ground between segments, then the four parts as
          labels with their figures at the trailing edge.

          **`FIN_DRIVERS_INSIGHT` was a tinted strip under this bar and is now exported,
          unrendered and blocked.** "Talent (salary) is the biggest lever of cost
          advantage." is what the bar's own leading segment draws at 72% of the width,
          with the figure beside its label — so the sentence was the chart read back to a
          CFO, in a filled box, which is the loudest object on the tab. It is the peer
          view's rule applied here: cut the sentence where the evidence on screen makes
          it; keep it exported where cutting costs a claim, and put the claim in front of
          ANSR rather than deciding for them.

          The `leads` guard went with it. It compared the parts' shares so an edited
          split could not leave a sentence the bar contradicted; with no sentence there
          is nothing to guard, and restoring the line means restoring the guard. */}
      <StackedShare parts={shown.parts} />
    </Panel>
  );
}

/* ==========================================================================
   3 — Tier 1 and tier 2 operating cost spread

   Three measures, one card each.

   **A `div` of `div`s, deliberately not a `ul` of `li`s.** Every spec in the browser
   suite counts `#function-metrics ul > li` as a figure-row cell, on all four tabs — so a
   second list inside a tab would silently change what "how many figures does this tab
   lead on" means. The three cards are a set and would be a defensible list; the counting
   contract is worth more than the semantics here, and the same reasoning already makes
   the card grids `div`s.

   **The direction is stated once and there is no separate legend.** The composition asks
   for "Lower index = lower cost" beneath each of the three scales and for a shared Tier
   1 / Tier 2 key above them. The metric's own `indexBaseline` — "Tier 1 cities = 100.
   Lower is cheaper." — carries the direction already and is drawn as the panel's
   subtitle; and the key is on each card's own two figure labels rather than in a legend
   for the set, because a legend made each column name appear four times in one section.
   See `IndexSpread`.
   ========================================================================== */

interface SpreadRow {
  label: string;
  from: { column: string; figure: string; share: number };
  to: { column: string; figure: string; share: number };
  delta: string;
}

function TierSpread({
  shown,
  rows,
}: {
  shown: ShownMetric;
  rows: readonly SpreadRow[];
}) {
  return (
    <Panel
      id={`metric-${shown.metric.id}`}
      title={shown.metric.title}
      /* The index base as the card's SUBTITLE rather than a note at its foot, which is
         where `CardMeta` puts it on a derived tab. An index base is the first thing a
         reader needs in order to read a single figure on the card, and this card's
         figures start 24px below the heading. */
      lead={
        shown.metric.indexBaseline
          ? indexedNote(shown.metric.indexBaseline)
          : undefined
      }
    >
      {/* **Three columns separated by space, not three bordered boxes inside a bordered
          card.** They each had a hairline and a 4px radius, which put a card inside a
          card — the one nesting both public screens rule out, and the exact defect the
          peer view removed when it stopped wrapping five floating company cards in a
          sixth bordered box. The outer `Panel` is the object; these are its contents, and
          what groups each one is that its name, its difference and its rail are adjacent.
          The gap widened to carry the separation the borders were doing. */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-col gap-4">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
              {/* `h3`, under the panel's own `h2`. A level is an outline rather than a
                  size, and skipping one leaves a screen-reader user with a broken
                  structure. */}
              <h3 className="min-w-0 text-sm font-semibold tracking-body text-text">
                {row.label}
              </h3>
              {/* **The answer, beside the name it belongs to.** The view model already
                  formatted and signed it with a real minus sign, so nothing here
                  subtracts. It is index POINTS rather than a percentage — the base is
                  100, so the two coincide, but writing "%" would be this file adding a
                  unit the data does not carry. */}
              <p className="rounded-full bg-surface-tint px-2.5 py-0.5 text-xs font-semibold text-accent-teal tabular-nums">
                {row.delta} vs {row.from.column}
              </p>
            </div>
            <IndexSpread base={row.from} comparator={row.to} />
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* ==========================================================================
   4 — India compared with other delivery locations

   Twenty indices, as a table.

   The argument for a table over the derived tab's plot-per-row is on `IndexTable`
   itself: four functions against five locations is read DOWN a column as much as along a
   row, and a row of dots cannot be read down.

   **The visitor's own function is the emphasised row**, matched against the tab's own
   public label. That reads an admin-editable row name, which every other rule on this
   screen is forbidden from doing — licensed here by what happens when it is wrong: a
   renamed row loses a tint, and no figure, axis or ordering depends on it.
   ========================================================================== */

function DeliveryLocations({
  shown,
  columns,
  rows,
  functionArea,
}: {
  shown: ShownMetric;
  columns: readonly string[];
  rows: readonly IndexTableRow[];
  functionArea: FunctionAreaView["functionArea"];
}) {
  const own = METRIC_FUNCTION_LABELS[functionArea].toLowerCase();
  return (
    <Panel
      id={`metric-${shown.metric.id}`}
      title={shown.metric.title}
      lead={
        shown.metric.indexBaseline
          ? indexedNote(shown.metric.indexBaseline)
          : undefined
      }
    >
      <IndexTable
        columns={columns}
        rows={rows.map((row) => ({
          ...row,
          emphasis: row.label.toLowerCase() === own,
        }))}
        rowHeader={FIN_TABLE_ROW_HEADER}
        labelledBy={`metric-${shown.metric.id}-heading`}
      />
    </Panel>
  );
}

/* ==========================================================================
   Leftovers — anything the catalogue gained that this file does not place

   Not dead code. This composition selects by id, so a finance metric added in a later
   commit would otherwise be present in the data and invisible on the page. See
   `hr-view.tsx`, which carries the same branch for the same reason.
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
   The held group — the workplace gradient and the cost-versus-depth grid

   Drawn with the DERIVED tab's components and heading, exactly as the operations tab
   does it. HR's sealed pair is a hand-built preview authored against the two metrics
   that tab holds; there is nothing equivalent authored for these two, and the generic
   placeholder is what every other tab shows.
   ========================================================================== */

function HeldGroup({ cards }: { cards: readonly LaidOutHeld[] }) {
  const headingId = "fin-held-heading";
  return (
    <section
      id="fin-held"
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
          the width `heldWidth` gave it — already packed by `layoutArea`, so no row can
          be left part-empty. */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {cards.map(({ held, width }) => (
          <HeldMetricCard key={held.metric.id} held={held} width={width} />
        ))}
      </div>
    </section>
  );
}
