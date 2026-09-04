import type { ShownMetric } from "@/data/screen2";
import { Panel } from "@/components/public/primitives";
import {
  MilestoneTrack,
  type MilestonePoint,
  type MilestoneTrackSpec,
} from "@/components/public/charts";
import { MILESTONE_CAPTIONS } from "./copy";

/**
 * The scale curve, as one card, drawn the same way on every tab that carries it.
 *
 * **It lives here rather than in a tab file for the reason `graduate-card.tsx` does.**
 * Operations and HR both draw `SCALE_MILESTONES`, and two copies of this markup would be
 * two readings of one progression — which is exactly what it used to be, a staircase on
 * operations and a single line on HR, until ANSR asked for one reading. Now that the card
 * carries a second rail with figures supplied in code, a second copy would also be a
 * second place to change those figures.
 *
 * ==========================================================================
 * THE SECOND RAIL
 * ==========================================================================
 *
 * **`ANSR_MONTHS` is SUPPLIED, at the project owner's explicit instruction, and the
 * dataset does not contain it.** It is the same class of thing as `DISRUPTION_FIGURE` in
 * `ops-view.tsx` and it is handled the same way, which is the part that matters:
 *
 *   - It is supplied HERE, in the component, and never written into the metric. So
 *     `ops-scale-milestones` and `hr-scale-milestones` still hold only the supplied
 *     market figures, admin still edits the datum, `data:verify` still reads what it
 *     always read, and the shared-title invariant is untouched.
 *   - It states no ratio and no percentage. Four durations, on a rail, beside four
 *     durations — the comparison is the drawing, and a "40% faster" line would be an
 *     arithmetic claim about two sets of numbers only one of which has a source.
 *   - It is monotonic and it is slower than nothing: every waypoint is later than the one
 *     before it, and each is a real number of months rather than a fraction of the market
 *     figure, so nothing here is derived from the data it sits beside.
 *
 * **It is the second figure on either screen the data does not support**, and like the
 * first it is recorded rather than hidden. A reviewer removing it deletes this constant
 * and the second track, and the card returns to one rail with no other change.
 */
const ANSR_MONTHS = [4, 8, 16, 24] as const;

/**
 * The ANSR rail, at the market rail's OWN positions.
 *
 * ==========================================================================
 * WHAT THE HORIZONTAL AXIS MEANS, AND THAT IT CHANGED
 * ==========================================================================
 *
 * **Each waypoint sits directly under the market waypoint it answers, at ANSR's request,
 * and that makes the axis the MILESTONE rather than elapsed time.** The two rails are
 * therefore column-aligned: "50 FTEs" over "50 FTEs", "500 FTEs" over "500 FTEs", with
 * only the durations under them differing. Reading down a column is the comparison the
 * card exists to offer, and reading down a column only works if the columns line up.
 *
 * **The first version divided the ANSR months by the market curve's own largest value**,
 * so sixteen months landed at 44% of the rail while the market's twenty-four landed at
 * 67% — one shared time axis, two curves of different length on it. That is the more
 * literal drawing of the numbers and it is not the one ANSR asked for: the lower rail
 * ended two thirds of the way along, its four circles fell between the upper rail's rather
 * than under them, and the reader had to match figures by eye to work out which waypoint
 * was which.
 *
 * **The cost, stated plainly, because it is a real one.** On the market rail a position is
 * proportional to the figure beneath it — six, twelve, twenty-four and thirty-six months at
 * a sixth, a third, two thirds and all of the rail. On this rail it is not: sixteen months
 * is drawn at the position twenty-four months occupies above it. So the lower rail's
 * geometry is borrowed rather than earned, and its FIGURES are the only statement of its
 * own durations. That is acceptable here for one reason — every figure is on screen, in
 * text, directly under its own circle — and it is the reason the card states no ratio and
 * no "faster": the drawing is now an alignment, and any claim about the size of the gap has
 * to come from the numbers rather than from the picture.
 */
function ansrPoints(
  parts: readonly { label: string; share: number }[],
): readonly MilestonePoint[] {
  return parts.flatMap((part, index) => {
    const months = ANSR_MONTHS[index];
    // No supplied figure for this waypoint: an admin adding a fifth milestone gets a
    // shorter second rail rather than an extrapolated fifth circle. Nothing here invents a
    // number to fill a position.
    if (months === undefined) return [];
    return [
      {
        // The market rail's own waypoint name, verbatim, so the two columns are visibly
        // the same milestone rather than two strings a reader has to compare.
        label: part.label,
        // `format: "duration"` keeps its digits at this magnitude, so the market rail's
        // own figures are the bare numerals and this matches them by construction rather
        // than by calling a formatter with a different set of arguments.
        figure: String(months),
        // **The market waypoint's position, not this figure's.** See the block comment.
        share: part.share,
      },
    ];
  });
}

export function ScaleMilestones({
  shown,
}: {
  shown: ShownMetric & { shape: "breakdown" };
}) {
  /**
   * `parts` rather than `legs`. Both carry the same fraction — a leg's `share` is its
   * cumulative value over the last waypoint, and a part's is its value over the largest,
   * which for a rising duration set is the same number — and `parts` is always present,
   * so there is no fallback branch to get wrong.
   */
  const market: readonly MilestonePoint[] = shown.parts.map((part) => ({
    label: part.label,
    figure: part.figure,
    share: part.share,
  }));

  const tracks: MilestoneTrackSpec[] = [
    { caption: MILESTONE_CAPTIONS.market, points: market },
  ];
  // The market points themselves, so the second rail cannot end up on positions the first
  // one is not on. Passing `shown.parts` and re-reading `share` there would be the same
  // number by coincidence; passing the drawn points makes it the same number by
  // construction.
  const accelerated = ansrPoints(market);
  if (accelerated.length > 0) {
    tracks.push({
      /**
       * **The FULL LOCKUP — the circular mark and the wordmark — at ANSR's request, where
       * this was the drawn wordmark alone.** `ansr-logo.svg`, used literally, which is the
       * one thing the brand rules allow to be placed unmodified. The light-ground file
       * rather than the on-dark one `ProductIdentity` serves: the wordmark in it is
       * `currentColor`, which inside an `<img>` resolves to the document's own default
       * ink, so it comes out near-black on this card's white and the mark keeps the brand
       * orange it ships with.
       *
       * **Sized off the ARTBOARD at 28px, not off the caption's cap height.** The
       * wordmark-only lockup could be set inline in a line of type because its glyph box
       * IS its cap height; this artboard is 253×91 with the mark occupying the full
       * height and the letters only the middle 43% of it, so matching the 12px caption
       * would have put the wordmark's caps at 5px. 28px gives it about 12px of cap — the
       * caption's own size — and reads as a logo placed beside a label rather than as a
       * word inside one.
       *
       * `alt="ANSR"` rather than an empty alt: this is a real image with real text in it,
       * so the caption's accessible reading is "Built with ANSR". Same call
       * `ProductIdentity` makes.
       */
      caption: (
        <span className="inline-flex items-center gap-2">
          {MILESTONE_CAPTIONS.ansrPrefix}
          {/* eslint-disable-next-line @next/next/no-img-element -- a fixed-ratio SVG
              lockup, which the optimiser cannot improve on. */}
          <img
            src="/brand/ansr-logo.svg"
            alt="ANSR"
            width={253}
            height={91}
            /* One step down on a phone, where the caption sits inside the rail's own 7%
               inset and the whole card is a third of the width it was measured at. */
            className="h-6 w-auto shrink-0 sm:h-7"
          />
        </span>
      ),
      points: accelerated,
    });
  }

  return (
    <Panel
      id={`metric-${shown.metric.id}`}
      title={shown.metric.title}
      // "months, median" — the unit, once, rather than under each of eight circles.
      // `MilestoneTrack` deliberately does not repeat it, on either rail.
      lead={shown.metric.unit}
      bodyClassName="flex grow flex-col"
    >
      <MilestoneTrack tracks={tracks} />
    </Panel>
  );
}
