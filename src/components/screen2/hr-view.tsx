import { Lock, UserRound } from "lucide-react";

import type { FunctionAreaView, HeldMetric, ShownMetric } from "@/data/screen2";
import { Block, Panel } from "@/components/public/primitives";
import {
  MilestoneTrack,
  RangeBenchmark,
  RankedBars,
  type BarRow,
  type BarTone,
} from "@/components/public/charts";
import { TabZones } from "./zones";
import { cn } from "@/lib/utils";
import {
  FIGURES_HEADING,
  HELD_LOCK_LABEL,
  HELD_MATRIX_COLUMN_PREFIX,
  HELD_MATRIX_ROW_PREFIX,
  heldHeading,
  heldShapeNote,
  HR_HELD_AVAILABILITY,
  HR_HELD_VARIES,
  HR_RATIO_MODELS,
  HR_SECTIONS,
  METRIC_NOTES,
} from "./copy";
import { GraduateOutput } from "./graduate-card";
import { scalarCells, SummaryFigures } from "./summary-figures";

/**
 * The HR tab, composed rather than derived.
 *
 * **This is the one tab whose layout is authored, and that is a real departure from
 * how this screen works.** Every other tab is laid out by the data: `layoutArea`
 * splits the scalars out into a figure row, `metricWidth` decides how much of the
 * measure each remaining card needs, `packWidths` fills the rows, and `AreaPanel`
 * alternates the grounds from whichever of those sections the tab happens to have.
 * Nothing in a component chooses which metric goes where, which is exactly what makes
 * the technology tab's two-column talent section a property a test can pin.
 *
 * What this file gives up, and what it buys:
 *
 *   - **It selects metrics BY ID.** `AreaPanel` never names one. An id is the safest
 *     key available — it is a catalogue constant that admin cannot reach, unlike a
 *     title or a unit — and it is the same key `FIGURE_ICONS` is already built on. The
 *     cost is real and is not hidden: adding an HR metric in the catalogue does not
 *     make it appear here, so `hrLayout` below returns the leftovers and they are
 *     drawn in a generic grid rather than silently dropped.
 *   - **It states its own section headings and its own grouping.** Four analytical
 *     groups and a sealed one, in a stated order, because the composition asked for a
 *     reading — market, then velocity, then scale and cost, then the graduate supply all
 *     three of those stand on, then what depends on the visitor — and that sequence is an
 *     argument rather than a consequence of how wide each chart is.
 *
 * **It is scoped to one tab on purpose.** Generalising it would mean four authored
 * compositions and no derived layout at all, which trades a tested property for four
 * files that have to be kept in agreement with the catalogue by hand. If ANSR wants
 * the other three composed too, that is the moment to decide the derivation is gone —
 * not a thing to arrive at one tab at a time.
 *
 * **One zone per section, alternating, and the cards are square — which reverses this
 * file's own earlier decision.** It ran the three analytical sections on ONE white
 * ground with 48/64px of space between them, and drew their cards at a 4px radius, on
 * the argument that a bordered card supplies its own boundary so a ground change on top
 * of it would be two devices doing one job.
 *
 * That argument holds in isolation and did not survive being read beside the other
 * three tabs. It made this tab's rhythm — and its corners — a property of which file
 * drew it: technology alternated grounds and drew borderless square cards, the composed
 * tabs ran one ground and drew rounded ones, and a visitor met the difference by
 * clicking a tab. The peer view answers it once for a whole surface: bordered square
 * cards, sitting in zones that strictly alternate, at the zone's own padding rather
 * than at a gap set per section. So that is what all four tabs do now.
 *
 * What is lost is real and is the reason the earlier version existed: the mint no
 * longer means "everything on this ground is withheld", because the mint is now just
 * every other zone. The sealed pair still carries a firmer border, a lock and a chip,
 * which were always the signal — the ground was the fourth of four.
 *
 * The 48/64px section gaps went with it. A zone's own `py-8 md:py-10` is the rhythm on
 * both result screens, and two of those add to 80px at a boundary, which is more than
 * the gap it replaces.
 */

/* ==========================================================================
   Selection

   By id, and every lookup is a `find` that may fail. A missing metric drops its
   section rather than throwing or drawing an empty card, which is the same rule
   `publicMetricsFor` applies one layer down: we would rather show nothing than
   something half-filled.
   ========================================================================== */

const FIGURE_IDS = [
  "hr-bench-strength",
  "hr-leadership-depth",
  "hr-offer-acceptance",
] as const;

const VELOCITY_IDS = ["hr-time-to-first-hire", "hr-backfill-time"] as const;

const MILESTONES_ID = "hr-scale-milestones";
const SALARY_ID = "hr-salary-growth";
const GRADUATES_ID = "hr-graduate-output";

/** Everything this file places, so the leftovers can be found by subtraction. */
const PLACED_IDS: readonly string[] = [
  ...FIGURE_IDS,
  ...VELOCITY_IDS,
  MILESTONES_ID,
  SALARY_ID,
  GRADUATES_ID,
];

function pick(shown: readonly ShownMetric[], id: string): ShownMetric | undefined {
  return shown.find((metric) => metric.metric.id === id);
}

/**
 * Which rows of the salary ranking are not specialisms.
 *
 * **Keyed by the entry LABEL, which is the one admin-editable string this tab reads,
 * and it is licensed by what happens when it is wrong.** Every other rule on this
 * screen is forbidden from parsing a label because the consequence is a changed CLAIM.
 * The consequence here is that a renamed row draws in the default teal: the figure is
 * unchanged, the order is unchanged, and the word "(reference)" is in the label itself,
 * which is what actually tells a reader that row is the comparator. Colour is the
 * second carrier, never the only one — see `BarTone`.
 */
const SALARY_TONES: Record<string, BarTone> = {
  "All roles (reference)": "reference",
  "Non-ER&D roles": "muted",
};

/* ==========================================================================
   The tab
   ========================================================================== */

export function HrPanel({ area }: { area: FunctionAreaView }) {
  const figures = FIGURE_IDS.map((id) => pick(area.shown, id)).filter(
    (metric): metric is ShownMetric => metric?.shape === "scalar",
  );
  const velocity = VELOCITY_IDS.map((id) => pick(area.shown, id)).filter(
    (metric): metric is ShownMetric => metric?.shape === "range",
  );
  const milestones = pick(area.shown, MILESTONES_ID);
  const salary = pick(area.shown, SALARY_ID);
  const graduates = pick(area.shown, GRADUATES_ID);
  // Anything the catalogue gained that this composition does not know about. Drawn
  // rather than dropped, so a new HR metric is visible on the page the day it lands
  // instead of being silently invisible until somebody reads this file.
  const leftovers = area.shown.filter(
    (metric) => !PLACED_IDS.includes(metric.metric.id),
  );

  /**
   * The sections this tab has, in composition order — market, then velocity, then scale
   * and cost, then graduate supply, then what depends on the visitor. `TabZones` gives each one its own
   * ground and alternates from the list, so a tab that loses a section cannot end up
   * with two white zones together.
   */
  const sections: React.ReactNode[] = [];
  if (figures.length > 0) {
    sections.push(<MarketSummary key="figures" figures={figures} />);
  }
  if (velocity.length > 0) {
    sections.push(<Velocity key="velocity" ranges={velocity} />);
  }
  if (milestones || salary) {
    sections.push(
      <Analysis key="analysis" milestones={milestones} salary={salary} />,
    );
  }
  /**
   * **Graduate output, restored at ANSR's request, and LAST of the analytical sections
   * on purpose.**
   *
   * It is the one card here that is not about the visitor's own hiring: the three above
   * it answer how many people are reachable, how fast a seat fills and what the same
   * person costs next year, and this one answers where next year's intake comes from.
   * That is the supply question behind all three, so it reads as the ground the tab
   * stands on rather than as a fourth benchmark — which also puts the tallest object on
   * the tab at its foot rather than in the middle of it.
   *
   * The operations tab places the same card in the same position, and both draw it with
   * `GraduateOutput`, so two views of one figure cannot diverge. See `graduate-card.tsx`.
   */
  if (graduates?.shape === "breakdown") {
    sections.push(<GraduateOutput key="graduates" shown={graduates} />);
  }
  if (leftovers.length > 0) {
    sections.push(<Leftovers key="leftovers" metrics={leftovers} />);
  }
  if (area.held.length > 0) {
    sections.push(<HeldGroup key="held" held={area.held} />);
  }

  return <TabZones sections={sections} />;
}

/* ==========================================================================
   1 — India's hiring market

   Three national facts, in `SummaryFigures` — the same component the other three tabs
   open on.

   **Three bordered cards and three 64px filled teal discs are gone, and the discs are
   the removal worth recording.** The supplied composition asked for them and they were
   drawn: a line glyph reversed out of a solid teal circle, beside the figure, on each of
   three cards. Two things were wrong with it once the four tabs were read together.
   Operations and finance carry no glyph at ANSR's own instruction, so one composed tab
   in three had them; and Screen 1's snapshot went through exactly this shape and
   rejected it — four pale discs holding line icons is the stats block every generated
   dashboard ships with, and it was the first 200px of the surface, so it set the
   register for everything under it.

   **They are still facts rather than charts, which was the composition's real point.**
   Nothing draws a mark: an acceptance rate of 72% against an implied 100% would be a
   part-to-whole claim about a figure that is not part of anything. What carried that
   before was a bordered card with no chart in it; what carries it now is a figure with
   its label under it and nothing drawn between them.

   The floor note is per CELL here, because exactly one of the three declares a floor —
   see `scalarCells`. Technology has two in one row and states it once for the row.
   ========================================================================== */

function MarketSummary({ figures }: { figures: readonly ShownMetric[] }) {
  return (
    <SummaryFigures
      heading={FIGURES_HEADING.hr}
      headingId="figures-hr-heading"
      cells={scalarCells(figures)}
    />
  );
}

/* ==========================================================================
   2 — Hiring velocity benchmarks

   Two ranges, two equal cards. `RangeBenchmark` rather than `RangeBar`: these are two
   choosable positions rather than a band, and the reasoning is on that component.
   ========================================================================== */

function Velocity({ ranges }: { ranges: readonly ShownMetric[] }) {
  return (
    <Block id="hr-velocity" title={HR_SECTIONS.velocity}>
      {/* **`items-stretch` and a centring body, which is the peer view's own fix for this
          exact row.** One of these two cards carries endpoint labels and a caveat and the
          other carries neither, so at `items-start` the shorter one ended ~70px above its
          neighbour and left a band of bare zone beside it — the gap was between the cards
          rather than inside either, and it read as a card that had failed to fill. Peer
          zone 3 does the same thing for the same reason: stretch the card, centre the
          chart in it, and the leftover room is split above and below the mark, where it
          reads as padding. */}
      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2 lg:gap-8">
        {ranges.map((shown) =>
          shown.shape === "range" ? (
            <Panel
              key={shown.metric.id}
              id={`metric-${shown.metric.id}`}
              title={shown.metric.title}
              // Under this section's `h2`.
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
                {/* The one caveat either card owes a reader, on the card it applies
                    to. See `METRIC_NOTES` for why this is not the metric's own
                    `note`, which is the admin's working record and never crosses. */}
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
   3 — Scale and salary analysis

   Two different questions about growing a centre, side by side: how long the next
   hundred takes, and what the same person costs next year.

   **Two different chart types, deliberately.** A progression and a ranking are not the
   same claim, and drawing both as bars — which is what the derived layout does — was
   the complaint the composition is answering: a tab of four bar charts reads as one
   undifferentiated dashboard, and the reader has no signal that one of them is a single
   path measured four times.
   ========================================================================== */

function Analysis({
  milestones,
  salary,
}: {
  milestones?: ShownMetric;
  salary?: ShownMetric;
}) {
  return (
    <Block id="hr-analysis" title={HR_SECTIONS.analysis}>
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2 lg:gap-8">
        {milestones?.shape === "breakdown" ? (
          <Panel
            id={`metric-${milestones.metric.id}`}
            title={milestones.metric.title}
            // "months, median" — the unit, once, rather than under each of four
            // circles. `MilestoneTrack` deliberately does not repeat it.
            lead={milestones.metric.unit}
            headingLevel={3}
          >
            {/* `parts` rather than `legs`. Both carry the same fraction — a leg's
                `share` is its cumulative value over the last waypoint, and a part's is
                its value over the largest, which for a rising duration set is the same
                number — and `parts` is always present, so there is no fallback branch
                to get wrong. */}
            <MilestoneTrack
              points={milestones.parts.map((part) => ({
                label: part.label,
                figure: part.figure,
                share: part.share,
              }))}
            />
          </Panel>
        ) : null}

        {salary?.shape === "breakdown" ? (
          <Panel
            id={`metric-${salary.metric.id}`}
            title={salary.metric.title}
            // "Base salary growth, year on year" — what every figure measures, under
            // the heading that names the finding. See the metric's own comment.
            lead={salary.metric.unit}
            headingLevel={3}
          >
            {/* **Inline rows on a bare track, and both are earned rather than
                chosen.** The entries are authored in descending order, so
                `selfLabelling` holds: row one is full width and carries its own
                figure, which is what states the axis and is the only thing that
                licenses dropping the grey track. The figures sit directly beside the
                bars, so there is no axis note either — the unit is the card's lead. */}
            <RankedBars
              rows={salary.parts.map(
                (part): BarRow => ({
                  label: part.label,
                  figure: part.figure,
                  share: part.share,
                  tone: SALARY_TONES[part.label] ?? "subject",
                }),
              )}
              inline
              bareTrack={salary.selfLabelling}
            />
          </Panel>
        ) : null}
      </div>
    </Block>
  );
}

/* ==========================================================================
   Leftovers — anything the catalogue gained that this file does not place

   **Not dead code and not a fallback nobody sees.** This composition selects by id, so
   an HR metric added in admin or in a later commit would otherwise be invisible on the
   page while being perfectly present in the data — a failure that looks like nothing at
   all. A generic grid is a worse reading than a placed one and an infinitely better one
   than silence.
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
          headingLevel={3}
          /**
           * **An odd last card takes the whole measure**, which is `packWidths`'s rule
           * applied to the one grid on this tab whose length is not known in advance. It
           * is not a detail: this branch first ran with a single leftover in it and left
           * a half-empty row, which is exactly the "a card failed to load" reading the
           * packing rule exists to prevent — and it is the failure mode most likely to
           * appear months from now, when somebody adds an HR metric and nobody reads this
           * file.
           */
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
   4 — Figures shaped by your roles and cities

   The two withheld metrics, on the mint.

   **The ground is the one place colour carries meaning on this tab.** Everything on it
   is held back, which is why the sealed group gets a boundary the three analytical
   sections do not: the reader needs to know they have crossed from what the page can
   tell them to what it cannot.

   Four things carry the withholding, and each rules something out:

     - **A lock, and it has an accessible name.** The chip the other tabs use says
       "Held back" in text beside the heading; the composition asks for a lock disc
       instead, so the words move into `sr-only` text on the disc. A decorative padlock
       with nothing announced would leave a screen-reader user with a card that is
       simply missing its content.
     - **Uniform hatched blocks, never a varying width.** A loading skeleton varies its
       widths to imitate text and animates to say "wait". These do neither. See
       `.gcc-held`.
     - **The cardinality is real and stated in words.** Five rows across five columns is
       exactly what the gate leaves, and `heldShapeNote` says it.
     - **Nothing is dimmed.** Dimming says unavailable; a firmer edge says closed. That
       is `tone="sealed"`.
   ========================================================================== */

function HeldGroup({ held }: { held: readonly HeldMetric[] }) {
  return (
    /* **No lead, and `HR_HELD_LEAD` is kept exported and unrendered.** It said "These
       measures depend on the roles, levels and Indian locations selected for your GCC."
       directly under a heading reading "Figures shaped by your roles and cities", above
       two cards each stating what its own figure varies with, above a line saying when
       both become available. Four statements of one idea inside 200px. The heading keeps
       the claim, the per-card lines keep the specificity, and the availability line
       keeps the one thing none of them says — see `HR_HELD_AVAILABILITY`. */
    <Block id="hr-held" title={heldHeading(held.length)}>
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2 lg:gap-8">
          {held.map((metric) => (
            <HeldPreview key={metric.metric.id} held={metric} />
          ))}
        </div>
        {/* **A condition, aligned to the leading edge, and not a control.** The
            composition asked for an "Update roles & cities" button here; the tool asks
            five questions and none of them is a role, a level or a city, so the button
            would name a destination that does not exist. See `HR_HELD_AVAILABILITY`. */}
        <p className="text-sm text-text-muted">{HR_HELD_AVAILABILITY}</p>
      </div>
    </Block>
  );
}

function HeldPreview({ held }: { held: HeldMetric }) {
  const { metric } = held;
  return (
    <Panel
      id={`metric-${metric.id}`}
      title={metric.title}
      lead={HR_HELD_VARIES[metric.id]}
      tone="sealed"
      headingLevel={3}
    >
      {/* Preview and lock on one row, the lock at the trailing edge and vertically
          centred against whatever the preview's height turns out to be. `items-center`
          rather than `items-start`, because the lock is a property of the whole card
          rather than of its first line. */}
      <div className="flex items-center gap-5">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {metric.shape.kind === "matrix" ? (
            <MatrixPreview rows={metric.shape.rows} columns={metric.shape.columns} />
          ) : (
            <RatioPreview />
          )}
          <p className="text-xs text-text-muted">{heldShapeNote(metric.shape)}</p>
        </div>
        <LockDisc />
      </div>
    </Panel>
  );
}

function LockDisc() {
  return (
    <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-surface-tint text-accent-teal">
      <Lock aria-hidden="true" strokeWidth={1.5} className="size-5" />
      {/* The chip's words, kept. A padlock alone is a picture; this is the card's
          status, and it has to be readable by something other than the eye. */}
      <span className="sr-only">{HELD_LOCK_LABEL}</span>
    </span>
  );
}

/**
 * The support ratio, as two named operating models with the quantity withheld.
 *
 * **Both groups are identical, which is the whole discipline of it.** The reference
 * composition draws five dark figures against four pale ones, and that is a ratio — a
 * number, drawn, for a metric whose number never left the server. So each model gets one
 * person glyph and one hatched block of the same size: the card states that there are
 * two models and that each has a ratio, and asserts nothing whatever about how the two
 * compare.
 *
 * The two names are not the withheld structure's entries — those never cross. See
 * `HR_RATIO_MODELS`.
 */
function RatioPreview() {
  return (
    <div className="grid grid-cols-2 gap-4">
      {HR_RATIO_MODELS.map((model) => (
        <div key={model} className="flex flex-col gap-2">
          <span className="w-fit rounded-full bg-surface-tint px-3 py-1 text-xs font-semibold text-accent-teal">
            {model}
          </span>
          <div aria-hidden="true" className="flex items-center gap-2">
            {/* The subject of the ratio, drawn once. One glyph rather than a cluster:
                a cluster is a count. */}
            <UserRound
              strokeWidth={1.5}
              className="size-5 shrink-0 text-text-muted"
            />
            <span className="gcc-held block h-6 flex-1" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * The cost matrix, at its real size, with generic ordinals for labels.
 *
 * The gate drops the row and column names — a row label beside a visible axis can imply
 * the answer — and leaves five rows across five columns. `Role family 1` and `L1` carry
 * the metric's own title, which does cross, plus a position in a list. Neither names a
 * role family and neither states what a level is. See `HELD_MATRIX_ROW_PREFIX`.
 */
function MatrixPreview({
  rows,
  columns,
}: {
  rows: number;
  columns: number;
}) {
  return (
    // Hidden wholesale: `heldShapeNote` says the same thing in words, and a grid of
    // empty cells announced one at a time is noise with no content in it.
    <div
      aria-hidden="true"
      className="grid gap-x-3 gap-y-2"
      style={{
        gridTemplateColumns: `max-content repeat(${columns}, minmax(0, 1fr))`,
      }}
    >
      <span />
      {Array.from({ length: columns }, (_, column) => (
        <span
          key={`column-${column}`}
          className="text-center text-xs font-semibold text-text-muted tabular-nums"
        >
          {HELD_MATRIX_COLUMN_PREFIX}
          {column + 1}
        </span>
      ))}
      {Array.from({ length: rows }, (_, row) => (
        <Row key={`row-${row}`} index={row} columns={columns} />
      ))}
    </div>
  );
}

/**
 * One row of the matrix preview.
 *
 * A fragment rather than a wrapper element, because the grid's columns have to be the
 * grid's own — a `div` per row would make every row a single cell and the column
 * headers would line up with nothing.
 */
function Row({ index, columns }: { index: number; columns: number }) {
  return (
    <>
      <span className="text-xs whitespace-nowrap text-text-muted">
        {HELD_MATRIX_ROW_PREFIX} {index + 1}
      </span>
      {Array.from({ length: columns }, (_, column) => (
        <span
          key={column}
          className={cn("gcc-held block h-4 w-full rounded-sm")}
        />
      ))}
    </>
  );
}
