import { Building2, MapPin, Map as MapIcon, Users } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Signal, SnapshotIcon } from "./copy";

/**
 * SNAPSHOT — the four industry-level figures at the head of the content surface.
 *
 * **What it is for is the first five seconds.** The answer state used to open
 * straight into full-height evidence bands, each one kicker → 48px heading →
 * content, so the first thing a visitor saw after submitting a form was a *section*
 * and every figure that proved the form had worked was at least one scroll away. A
 * reader giving the page ninety seconds spent the first twenty establishing that it
 * had produced a result at all.
 *
 * **Nothing here is a new figure and nothing here is about the peer set.** All four
 * are properties of the visitor's INDUSTRY in India — the company count, the mean
 * centre size, the spread of cities and the leading one — each evidenced by a card
 * further down. The version this replaced led with the peer count and the largest
 * peer centre, which are properties of a five-company set our own matching chose:
 * a statistic about the tool rather than about the ground the visitor is sizing.
 *
 * **One container with divided cells, not four tiles.** A tile per figure would
 * assert an editorial hierarchy across four things that are peers, and would add a
 * fifth card shape to a surface that already has one. The rules between cells come
 * from a 1px grid gap over a tinted ground rather than from per-cell borders, which
 * is what makes it survive wrapping to two rows without any cell growing a double
 * edge.
 *
 * **A cell the data cannot fill says so.** The cell count is fixed at four, so a
 * missing figure cannot be resolved by dropping the column — and it must never be
 * resolved by estimating one. See `Signal.value`.
 */

/**
 * The glyph per cell. Mapped here rather than in `copy.ts`, which holds language
 * and holds no JSX — and here rather than inline, so swapping the icon set is one
 * edit.
 *
 * Line icons at one stroke weight, sized off the figure beside them. Every one is
 * `aria-hidden`: the label states what the figure is, so an icon with its own
 * accessible name would be that label read twice.
 */
const ICONS: Record<SnapshotIcon, React.ComponentType<{ className?: string }>> = {
  companies: Building2,
  people: Users,
  cities: MapIcon,
  location: MapPin,
};

export function Snapshot({ signals }: { signals: readonly Signal[] }) {
  if (signals.length === 0) return null;

  return (
    <section
      id="snapshot"
      aria-labelledby="snapshot-heading"
      className="flex flex-col gap-3"
    >
      {/* A real `h2`, set at kicker size. It is the section's name — the reference
          composition sets it as a small caps label rather than a heading, and the
          semantic level and the visual weight are allowed to disagree: on this
          surface the figures are the subject.

          **"Snapshot" was the tool's word for the strip; this is the reader's.** A
          section called Snapshot describes the component; one called "Your industry
          in India" describes what the four figures are about, which is also the one
          thing that stops a reader taking them for facts about the peer set. */}
      <h2
        id="snapshot-heading"
        className="text-xs font-semibold tracking-caps text-accent-teal uppercase"
      >
        Your industry in India
      </h2>

      <div className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4")}>
        {signals.map((signal) => {
          const Icon = ICONS[signal.icon];
          return (
            <div
              key={signal.label}
              className={cn(
                // **Four floating tiles, where this was one container divided by 1px
                // grid-gap rules.** The divided version was the right call on a white
                // page — it kept the group reading as one object and never doubled an
                // edge — and it is the wrong one now that the strip sits on the pale
                // mint band: a single bordered box on a tint reads as a table, and its
                // internal rules were drawn in the same value as the ground behind it,
                // so the whole group lost its structure the moment the ground moved.
                //
                // Separate tiles also let the figure sit at the top of the card rather
                // than beside an icon, which is what buys the size step below.
                "flex min-w-0 flex-col gap-3 rounded-lg border border-border-tint",
                "bg-surface p-4 shadow-xs md:p-5",
              )}
            >
              {/* Icon and figure on one line, the icon leading. A pale disc rather
                  than a bare glyph: four loose icons at the top of four tiles read as
                  decoration, and a contained one reads as the tile's marker. */}
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-tint text-accent-teal"
                >
                  <Icon className="size-4.5" />
                </span>
                {signal.value !== null ? (
                  // **Up a step, to 30/36px.** The figures were 24/30 inside a divided
                  // container where they had to stay quiet enough not to fight the
                  // rules around them. On their own tiles they are the subject, and
                  // this is still well under the display sizes the page reserves for a
                  // single figure that IS a section.
                  //
                  // `min-w-0` plus `truncate`: the fourth cell holds a city name, and
                  // "Thiruvananthapuram" in a quarter-width tile has to shorten rather
                  // than widen the row.
                  <p className="min-w-0 truncate text-3xl leading-none font-bold tracking-display text-text tabular-nums md:text-4xl">
                    {signal.value}
                  </p>
                ) : (
                  /* Stated, not dashed. A dash reads as zero and a zero here would
                     be a claim; "Data unavailable" is the only honest thing to put
                     where a figure the dataset cannot supply would go. Set at the
                     label's size rather than the figure's, so a missing number does
                     not shout. */
                  <p className="text-sm font-semibold text-text-muted">
                    Data unavailable
                  </p>
                )}
              </div>
              <div className="flex min-w-0 flex-col gap-1 border-t border-border-tint pt-3">
                <p className="text-sm font-semibold text-text text-pretty">
                  {signal.label}
                </p>
                {/* What the figure counts. Kept because a bare figure beside a short
                    label leaves a reader unable to tell whether they are looking at
                    companies, centres or people, and this page carries all three. */}
                <p className="text-xs text-text-muted text-pretty">{signal.note}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
