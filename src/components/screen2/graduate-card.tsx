import type { ShownMetric } from "@/data/screen2";
import { Panel } from "@/components/public/primitives";
import { RankedBars, type BarRow } from "@/components/public/charts";

/**
 * Graduate output by discipline, as one card, drawn the same way on every tab that
 * carries it.
 *
 * **It lives here rather than in a tab file because TWO composed tabs draw it.** It was
 * local to `ops-view.tsx` while operations was the only tab left showing it; HR's view of
 * the shared metric is restored at ANSR's request, and two copies of this markup would be
 * two readings of one figure — nine parts split into columns one way on operations and
 * another way on HR, drifting the first time either is touched. Same reasoning as
 * `VELOCITY_HEADING` being a constant rather than the same words typed twice, and as both
 * composed tabs drawing the scale curve through `MilestoneTrack`.
 *
 * Nine disciplines at the full measure, as two columns of compact rows.
 *
 * **A bare `Panel` rather than a section wrapping a card**, because the metric's own
 * title is the only heading this block needs — a `Block` above it would state the same
 * words twice.
 *
 * **Two columns, one scale, and the scale is free.** Every part's `share` is against the
 * metric's own largest value, so both halves are on the same axis whichever component
 * draws them — there is no per-column maximum to get wrong. The split is the catalogue's
 * order cut in half, so the disciplines stay grouped by family: the four engineering and
 * science streams lead, the commerce, management, finance and HR streams follow. Nothing
 * is sorted by value, here or anywhere on this screen.
 *
 * **The figures are abbreviated — "1.5M", not "1,500,000" — and that is the project's
 * count rule rather than a choice made here.** `formatCompact` uses a unit only where the
 * division into it is exact, so nothing is rounded to fit; 45,000 becomes "45K" and a
 * figure that did not divide cleanly would keep every digit. The alternative is a column
 * of seven-digit numerals against a bar, which is the reading the abbreviation pass
 * replaced across the whole screen.
 *
 * **The id comes from the metric, so the two tabs' cards are `metric-ops-graduate-output`
 * and `metric-hr-graduate-output`.** Two views of one figure are still two sections of two
 * documents, and a spec locating one must not match the other.
 */
export function GraduateOutput({
  shown,
}: {
  shown: ShownMetric & { shape: "breakdown" };
}) {
  // Floor rather than ceiling, so nine parts read four then five: the taller column is
  // the trailing one, which is the direction a wrapped list already reads in.
  const split = Math.floor(shown.parts.length / 2);
  const columns = [shown.parts.slice(0, split), shown.parts.slice(split)];

  return (
    <Panel
      id={`metric-${shown.metric.id}`}
      title={shown.metric.title}
      // "graduates a year" — the metric's own unit, verbatim. Nothing on this screen
      // re-letters an admin-editable string.
      lead={shown.metric.unit}
    >
      {/* Two `dl`s rather than one in two CSS columns: a multi-column `dl` breaks a row
          across the column boundary, which would put a label at the foot of one column
          and its bar at the head of the next. One column below `lg`, where nine rows at
          full width is the layout that already works. */}
      <div className="grid grid-cols-1 gap-x-10 gap-y-3 lg:grid-cols-2">
        {columns.map((parts, index) =>
          parts.length > 0 ? (
            <RankedBars
              key={index}
              rows={parts.map(
                (part): BarRow => ({
                  label: part.label,
                  figure: part.figure,
                  share: part.share,
                }),
              )}
              inline
              bareTrack={shown.selfLabelling}
            />
          ) : null,
        )}
      </div>
    </Panel>
  );
}
