import type { FunctionAreaView, ShownMetric } from "@/data/screen2";
import { usePublicCopy } from "@/components/public/copy-context";
import { Panel } from "@/components/public/primitives";
import {
  RangeBenchmark,
  RankedBars,
  type BarRow,
  type BarTone,
} from "@/components/public/charts";
import { TabZones } from "./zones";
import { figuresHeadings, hrSections, METRIC_NOTES } from "./copy";
import { GraduateOutput } from "./graduate-card";
import { ScaleMilestones } from "./milestone-card";
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
 * unchanged, the order is unchanged, and the words "All roles" are self-descriptive as
 * the all-up baseline, which is what actually tells a reader that row is the comparator.
 * Colour is the second carrier, never the only one — see `BarTone`.
 */
const SALARY_TONES: Record<string, BarTone> = {
  "All roles": "reference",
  /**
   * **"Roles outside engineering R&D" no longer takes `muted`, at ANSR's request.** It
   * was `grey-500` — a row deliberately held back from the comparison — and beside four
   * teal bars and one orange one it read as a third category rather than as a fifth
   * measurement of the same thing. It is not held back: it is the same quantity for a
   * different population, and it belongs on the same axis in the same colour as every
   * other row that is not the comparator.
   *
   * The `muted` tone stays in `BarTone` and is now carried by nothing — it is the one
   * fill available for a row a future chart genuinely does hold back, and `grey-500` is
   * the only light neutral in the palette that clears the 3:1 floor, so re-deriving it
   * would be re-doing that measurement.
   */
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
  /**
   * **The sealed group is DELETED at ANSR's request, so this tab renders nothing for a
   * gated metric.** `area.held` still exists and the gate is untouched — `publicMetric`
   * has no field a withheld figure could travel in — so the two gated HR metrics are
   * simply not drawn: no heading, no placeholder, no lock, no chip. The finance tab lost
   * its equivalent in the same pass. The derived path and the operations tab still have a
   * held branch; see `function-view.tsx`.
   */

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
  const copy = usePublicCopy();

  return (
    <SummaryFigures
      heading={figuresHeadings(copy).hr}
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
  const copy = usePublicCopy();

  return (
    <section
      id="hr-velocity"
      // The section's name, from the shared `velocityHeading` key — the operations tab
      // draws this same section under the same key, so the two cannot be reworded apart.
      // Located by `id` in the suite, never by this string.
      aria-label={hrSections(copy).velocity}
      className="flex min-w-0 flex-col"
    >
      {/* **`items-stretch` stays; the CENTRING inside each card is gone, at ANSR's
          request, and the two are separate decisions.**
          
          Stretching is what keeps the row to one bottom edge — at `items-start` the
          shorter card ended ~70px above its neighbour and the surplus was bare zone
          BETWEEN the cards, which reads as a card that failed to fill.
          
          Centring was then added so the surplus was split above and below the mark. That
          is the right call for a chart whose position carries nothing, and the wrong one
          here: these two cards are the same chart drawn twice, so a reader compares "7 –
          70 days" with "35 – 75 days" directly — and centring put the two value lines at
          different heights whenever the two cards' content differed by a line. Both cards
          now carry a note (see `METRIC_NOTES`), so the remaining difference is the
          endpoint-label pair, which only the first-hire card has. Top-aligned, the two
          values and the two rails line up exactly and the one leftover line sits at the
          foot of the shorter card, inside its own padding. */}
      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2 lg:gap-8">
        {ranges.map((shown) =>
          shown.shape === "range" ? (
            <Panel
              key={shown.metric.id}
              id={`metric-${shown.metric.id}`}
              title={shown.metric.title}
              // `h2`: the section's own group heading was removed at ANSR's request, so
              // a card is a top-level section of the tab now, exactly as on the derived
              // technology tab. A level down would skip from the sr-only summary `h2`.
              //
              // `grow` without a `justify`, so the body fills the stretched card and its
              // content stays at the top — see the note on the grid above.
              bodyClassName="flex grow flex-col"
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
    </section>
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
  const copy = usePublicCopy();

  return (
    <section
      id="hr-analysis"
      aria-label={hrSections(copy).analysis}
      className="flex min-w-0 flex-col"
    >
      {/* `items-stretch` and TOP-ALIGNED bodies, which is what the velocity section above
          now does — see the note there for why the centring came off both rows.

          **The two cards are also much closer in height than they were.** The milestone
          card used to run about 60px short of the salary ranking, and the surplus was the
          gap ANSR reported under it. It now carries a second rail, and the ranking carries
          three supplied specialism rows (SDE, Product Management and DevOps / Platform
          Engineering), so the ranking is eight rows against the two-rail milestone card.
          Those rows replaced a comparator sentence that had been doing the same levelling
          job with editorial copy — see `hr-salary-growth` in the catalogue and the absent
          note in `copy.ts`. */}
      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2 lg:gap-8">
        {/* **`ScaleMilestones` rather than a `Panel` and a track written out here.** The
            card now carries a second rail whose figures are supplied in code, and two
            copies of this markup would be two places to change them — the same call
            `GraduateOutput` made once this metric was drawn by two tabs. See
            `milestone-card.tsx` for what the second rail is and is not. */}
        {milestones?.shape === "breakdown" ? (
          <ScaleMilestones shown={milestones} />
        ) : null}

        {salary?.shape === "breakdown" ? (
          <Panel
            id={`metric-${salary.metric.id}`}
            title={salary.metric.title}
            // "Base pay growth, year on year" — what every figure measures, under the
            // heading that names the finding. See the metric's own comment.
            lead={salary.metric.unit}
            bodyClassName="flex grow flex-col gap-4"
          >
            {/* **Inline rows on a bare track, and both are earned rather than
                chosen.** The entries are authored in descending order, so
                `selfLabelling` holds: row one is full width and carries its own
                figure, which is what states the axis and is the only thing that
                licenses dropping the grey track. The figures sit directly beside the
                bars, so there is no axis note either — the unit is the card's lead.

                **The teal is the same teal the graduate card draws, at ANSR's request**,
                and it took a change in `BARE_FILL` rather than one here: a bare subject
                bar used to go a step deeper than a tracked one, so this ranking and the
                graduate ranking one section down were two teals doing one job. Nothing
                about this call site chose a colour before and nothing does now. */}
            {/* **The comparator is named in text by its own LABEL, so there is no note
                under this chart.** The "All roles" row is the one warm mark in a set of
                teal bars, and a colour may never be the only carrier of a distinction
                here — but "All roles" is self-descriptive as the all-up baseline, which is
                the text carrier. The parenthetical "(reference)" that used to do it, and
                the sentence that briefly replaced it, are both gone; the height the
                sentence was also buying is now carried by three supplied specialism rows. See
                `SALARY_TONES` above and the absent `copy.ts` note. */}
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
    </section>
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
