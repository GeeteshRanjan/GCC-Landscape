"use client";

import { useState } from "react";

import type { MapBlock } from "@/data/screen1";
import { INDIA_ISLAND_MARKS, INDIA_OUTLINE_PATH } from "@/data/india-outline";
import {
  formatCount,
  PanelAction,
  Provenance,
} from "@/components/public/primitives";
import { RankedBars, type BarRow } from "@/components/public/charts";

/**
 * Where in India the visitor's industry actually is.
 *
 * The brief asks for a heatmap, and this is one — density per city, filtered to
 * the visitor's industry, built from the city lists already in the company data
 * rather than a separate geography dataset.
 *
 * **The country is now drawn, and the outline is generated rather than traced.**
 * The previous version plotted real positions on an unbordered field with a faint
 * graticule, because invariant 8 forbids hand-authoring a contested boundary. What
 * that invariant always allowed is the version that is not a guess, and it is now
 * built: `scripts/build_india_outline.py` cuts India out of Natural Earth's India
 * point-of-view admin-0 set — public domain, point of view stated rather than
 * implied, and the same file the ask hero's dotted silhouette comes from. Two
 * different Indias on two screens of one page would be the hardest thing here to
 * defend, so there is one source.
 *
 * It is not a neutral rendering, because there is no neutral rendering of a
 * contested boundary. The claim drawn is India's own, under India's brand, which is
 * the most defensible position available — and it joins the hero's silhouette on
 * the list for ANSR's sign-off rather than opening a second question.
 *
 * **What the outline replaced, and what it fixed.** Seven dots on a tinted panel
 * with a dashed graticule read as a scatter of marks, not as a country: the
 * graticule asserted nothing, which was the point, and therefore told the eye
 * nothing either. Three things went with it:
 *
 *   - **The panel.** There is no box any more. The country sits directly on the
 *     band, filled in the pale mint, so the graphic is the subject rather than
 *     something inside a container.
 *   - **The graticule.** A coastline is a better reference than evenly spaced
 *     rules, and it is the reference the reader already has in their head.
 *   - **The bright-mint dot depth.** `--ansr-teal-bright` was carrying the middle
 *     density step, and it measures 2.44:1 on a light ground — banned in a chart
 *     by the palette's own rule. It was there before the rule was written down.
 *
 * The map is still paired with a ranked list, and the list still carries every
 * figure. That is what makes the block readable without the graphic rather than
 * needing a text alternative bolted on.
 */

/**
 * Dot radii, as a fraction of the field's width so they hold at any rendered
 * size. Area is what the eye reads as quantity, so the count is mapped through a
 * square root: a city with four times the companies gets twice the radius, not
 * four times.
 */
const RADIUS_MIN_RATIO = 0.018;
const RADIUS_MAX_RATIO = 0.062;

function radiusFor(companies: number, peak: number, width: number): number {
  const min = width * RADIUS_MIN_RATIO;
  const max = width * RADIUS_MAX_RATIO;
  if (peak <= 1) return min;
  const share = Math.sqrt(companies / peak);
  return min + (max - min) * share;
}

/**
 * Fill depth by share of the peak. Two steps, not three, and both are legible on
 * the pale-mint land.
 *
 * Classed rather than computed as an opacity, so the depth comes from the token
 * ramp. It went from three steps to two because the old middle step was
 * `--ansr-teal-bright`, which this palette does not permit in a chart on a light
 * ground at all, and the step below it was within a hair of the land it was drawn
 * on. Depth is the redundant second encoding here — area is the primary one — so
 * two steps that can both be seen beats three where one cannot.
 *
 * Tier-2 cities keep their outlined treatment regardless: that distinction is
 * categorical, it has to survive greyscale, and it is carried by form.
 */
function fillFor(companies: number, peak: number): string {
  const share = peak > 0 ? companies / peak : 0;
  return share >= 0.33 ? "fill-accent-teal" : "fill-teal-500";
}

/** How many cities get a label drawn on the field itself. */
const LABELLED = 3;

/**
 * How many hubs carry the pulse.
 *
 * **The halo pulses, never the dot.** A dot's radius is the encoding — it is how
 * many GCCs are in that city — so animating the radius animates the claim, and a
 * mark that grows and shrinks is a figure that grows and shrinks. The halo is a
 * separate ring that carries no value, starts at the dot's own radius and expands
 * out of it, so nothing measurable moves.
 *
 * Three, staggered, rather than all of them: the whole field breathing at once is
 * a screen artefact, and three offset by a third of the cycle each reads as the
 * leading hubs taking turns. Ambient motion, on the same footing as the customer
 * logo strip — see `--ansr-duration-pulse`.
 */
const PULSED = 3;

/** How many cities the ranked list shows before "Explore all cities". */
const RANKED = 8;

/** The region the disclosure controls, so `aria-controls` has something to name. */
const CITY_LIST_ID = "city-ranking";

export function CityMap({ map }: { map: MapBlock }) {
  /**
   * **"Explore all cities" is a real disclosure rather than a link, because the tool
   * cannot own the URL bar.** Every city is already in the payload — the ranked list
   * only ever showed the leading eight — so revealing the tail costs no round trip
   * and needs no route, which is what makes it honest rather than a control that
   * navigates nowhere.
   *
   * It is not the same thing as hiding a figure behind an affordance, which this
   * project forbids: the eight leading cities and the count of the ones past them are
   * both on the page before anything is pressed. What the toggle adds is the tail,
   * and every figure in it is a repeat of the same encoding.
   */
  const [showAll, setShowAll] = useState(false);

  const plotted = map.cities.filter((city) => city.point !== null);
  const ranked = showAll ? map.cities : map.cities.slice(0, RANKED);
  const tail = Math.max(map.cities.length - RANKED, 0);

  if (map.cities.length === 0) {
    return (
      <p className="max-w-measure text-base text-text-muted">
        We hold no India locations for {map.industry} yet, so there is nothing to
        map.
      </p>
    );
  }

  const summary = `${map.industry} GCC locations plotted on India. ${plotted
    .slice(0, 3)
    .map((city) => `${city.city}, ${formatCount(city.companies)}`)
    .join("; ")}${plotted.length > 3 ? `; and ${plotted.length - 3} more cities` : ""}. The ranked list beside this map carries every figure.`;

  const rows: BarRow[] = ranked.map((city, index) => ({
    label: city.city,
    figure: formatCount(city.companies),
    share: map.peak > 0 ? city.companies / map.peak : 0,
    emphasis: index === 0,
    qualifier: city.tier1 ? undefined : "emerging",
  }));

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,6fr)] lg:gap-10">
        {/* **Two columns only at `lg`, not `md`.** At 768 the map column came out
            around 370px, which puts the in-place city labels at about 11px and the
            three southern hubs on top of one another — the graphic was present and
            unreadable. Below `lg` the map takes the full width and the ranked list
            follows it, which is also the order the two are read in. */}
        {/* No panel. The country is the graphic, so it sits on the band's own
            ground — a tinted box around it was what made the previous version read
            as a widget rather than as a map.

            The legend is capped to the same width as the map and centred with it,
            so the two share a leading edge. Left to the column's full width the
            legend started 60px before the coastline did. */}
        <div className="mx-auto flex w-full max-w-[30rem] flex-col gap-5">
          <svg
            viewBox={`0 0 ${map.width} ${map.height}`}
            role="img"
            aria-label={summary}
            // Bounded by WIDTH, not height. With `w-full` plus a max-height the
            // drawing letterboxes inside its own box — `preserveAspectRatio`
            // centres it and the spare width goes to nothing. A width cap keeps
            // the box the same shape as the country, and the cap is on the wrapper
            // so the legend inherits it.
            className="block h-auto w-full"
          >
            {/* India, filled in the pale mint with a hairline coast.
                `fill-rule: evenodd` resolves interior rings as holes, which is why
                every ring is in one path. */}
            <path
              d={INDIA_OUTLINE_PATH}
              fillRule="evenodd"
              // `teal-500` for the coast, not `teal-300`. The land is the pale mint
              // and the two are close enough that a 300 hairline left the country
              // with no edge at all — the shape was carried entirely by a 1.15:1
              // fill difference against the band.
              className="fill-surface-tint stroke-teal-500"
              strokeWidth={map.width * 0.002}
            />
            {/* The 27 islands below the width of the stroke that would draw them —
                most of Lakshadweep, the smaller Nicobars. Zero-length subpaths
                rendered as dots by a round cap, the same technique the hero's map
                uses. They are drawn because they are Indian territory: an outline
                that omits them draws a claim smaller than India's own. */}
            <path
              d={INDIA_ISLAND_MARKS}
              fill="none"
              strokeLinecap="round"
              className="stroke-teal-500"
              strokeWidth={map.width * 0.005}
            />

            {/* The pulse, behind every dot so a halo never crosses a mark. */}
            {plotted.slice(0, PULSED).map((city, index) => {
              const point = city.point!;
              return (
                <circle
                  key={`pulse-${city.city}`}
                  aria-hidden="true"
                  className="gcc-map-pulse"
                  cx={point.x}
                  cy={point.y}
                  r={radiusFor(city.companies, map.peak, map.width)}
                  strokeWidth={map.width * 0.004}
                  style={{ "--gcc-pulse-index": index } as React.CSSProperties}
                />
              );
            })}

            {plotted.map((city) => {
              const point = city.point!;
              const radius = radiusFor(city.companies, map.peak, map.width);
              return (
                <circle
                  key={city.city}
                  cx={point.x}
                  cy={point.y}
                  r={radius}
                  // Tier-1 is filled at a depth set by density, tier-2 is
                  // hollow. A difference in form, not in hue: this palette cannot
                  // separate two meanings by colour, and fill against outline
                  // survives greyscale and colour blindness.
                  className={
                    city.tier1
                      ? `${fillFor(city.companies, map.peak)} stroke-surface`
                      : "fill-surface stroke-accent-teal"
                  }
                  strokeWidth={map.width * 0.004}
                >
                  <title>{`${city.city}: ${formatCount(city.companies)}`}</title>
                </circle>
              );
            })}

            {/* Labels last, so they sit over every dot rather than under the next
                one drawn. Only the leading few, because six of the seven tier-1
                cities cluster tightly enough that labelling all of them collides
                at any width an iframe is likely to get. */}
            {plotted.slice(0, LABELLED).map((city) => {
              const point = city.point!;
              const radius = radiusFor(city.companies, map.peak, map.width);
              // Placed on whichever side has room, decided from the dot's own
              // position rather than tuned per city — a hand-placed offset would
              // be wrong the first time an industry had a different leading three.
              const onLeft = point.x > map.width * 0.55;
              const gap = radius + map.width * 0.022;
              return (
                <text
                  key={`label-${city.city}`}
                  x={onLeft ? point.x - gap : point.x + gap}
                  y={point.y}
                  textAnchor={onLeft ? "end" : "start"}
                  dominantBaseline="middle"
                  // Knocked out of whatever is under it. Every label sits on the
                  // land, so it crosses the coastline, another city's dot, or both
                  // — and `paint-order: stroke` draws a halo of the band's own
                  // ground behind the glyphs before filling them, which is what
                  // keeps the name readable without moving it somewhere there is
                  // nothing to collide with. Placing labels in the sea instead
                  // would need a leader line per city and would put Bengaluru's
                  // name in the Arabian Sea.
                  paintOrder="stroke"
                  className="fill-text stroke-surface font-semibold"
                  strokeWidth={map.width * 0.008}
                  strokeLinejoin="round"
                  style={{ fontSize: `${map.width * 0.03}px` }}
                >
                  {city.city}
                  <tspan className="fill-text-muted">
                    {" "}
                    {formatCount(city.companies)}
                  </tspan>
                </text>
              );
            })}
          </svg>

          {/* One line, where there were four. The legend decodes the two mark
              shapes and stops there.

              **Two lines were removed at ANSR's request and one of them costs
              something real.** "Larger means more GCCs" was the area encoding said
              out loud — the ranked list beside the map carries every figure, so a
              reader can still recover it, but nothing on the graphic now says what
              size means. The other was the boundary attribution: "Boundaries as India
              states them, from Natural Earth's India point-of-view dataset."
              **Invariant 8 in project.md required that line on the page** — a drawn
              boundary saying whose it is, in words — and the outline is still drawn
              from exactly that dataset. The claim did not change; the statement of it
              did. This is the one removal in the pass that needs ANSR's explicit
              sign-off rather than just their instruction. */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-text-muted">
            <span className="inline-flex items-center gap-2">
              <svg viewBox="0 0 12 12" aria-hidden="true" className="size-3">
                <circle cx="6" cy="6" r="5" className="fill-accent-teal" />
              </svg>
              Established hub
            </span>
            <span className="inline-flex items-center gap-2">
              <svg viewBox="0 0 12 12" aria-hidden="true" className="size-3">
                <circle
                  cx="6"
                  cy="6"
                  r="4.5"
                  className="fill-surface stroke-accent-teal"
                  strokeWidth="1.5"
                />
              </svg>
              Emerging location
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          {/* The two column names, which the ranked list itself does not carry. A
              `dl` of city-and-count pairs with no headings leaves the reader to work
              out whether the trailing figure is companies, centres or people, and
              this page carries all three. */}
          <div
            aria-hidden="true"
            className="flex items-baseline justify-between gap-4 border-b border-border-strong pb-2 text-xs font-semibold tracking-caps text-text-muted uppercase"
          >
            <span>{showAll ? "All cities" : "Top cities"}</span>
            <span>Companies</span>
          </div>
          {/**
           * **No bars when every city holds one GCC**, which is the thin-industry
           * case and the one where a shared axis lies. Every share is then 1, so
           * `RankedBars` draws every city at full width — and a row of full bars
           * reads as "a lot of them" for a set where each city has exactly one.
           * There is no axis to draw because there is no variation to draw on it, so
           * the figures carry it alone. Same instinct as `FigureRow` on Screen 2.
           */}
          {/* **No axis note, at ANSR's request.** It said "Full width is 377 in
              Bengaluru." — the one thing a set of descending bars cannot say about
              itself. What makes its absence survivable here and nowhere else on the
              screen is that every row carries its own figure in text and the leading
              row IS the peak, so full width is legible from the first line of the
              list. It is still a real loss on a phone, where the emphasised first row
              and the bar beside it are not necessarily in view together. */}
          {map.peak > 1 ? (
            <div id={CITY_LIST_ID}>
              <RankedBars rows={rows} dense={rows.length > 8} />
            </div>
          ) : (
            <dl id={CITY_LIST_ID} className="flex flex-col">
              {ranked.map((city) => (
                <div
                  key={city.city}
                  className="flex items-baseline justify-between gap-4 border-b border-border-subtle py-2.5"
                >
                  <dt className="text-sm text-text">
                    {city.city}
                    {city.tier1 ? null : (
                      <span className="ps-2 text-xs text-text-muted">
                        emerging
                      </span>
                    )}
                  </dt>
                  <dd className="text-sm font-semibold text-text tabular-nums">
                    {formatCount(city.companies)}
                  </dd>
                </div>
              ))}
            </dl>
          )}
          {/* **The summary line is gone, at ANSR's request.** It read "22 cities in
              all, 14 of them past the 8 listed, 15 of them outside the established
              hubs." — the two facts a ranked list of eight cannot show. The tail count
              is partly recoverable from the disclosure below, which says what pressing
              it does; the tier-2 count is not recoverable from anywhere, so "how much
              of this industry has gone somewhere other than an established hub" is no
              longer answered on the page. The legend still names the two mark shapes,
              so the distinction is visible without being counted. */}

          {/* Only where there is a tail to reveal. A toggle that expands nothing is
              worse than no toggle. */}
          {tail > 0 ? (
            <div className="flex">
              <PanelAction
                onClick={() => setShowAll((open) => !open)}
                expanded={showAll}
                controls={CITY_LIST_ID}
              >
                {showAll ? "Show the leading cities only" : "Explore all cities"}
              </PanelAction>
            </div>
          ) : null}

          {/* **The denominator sentence is gone, at ANSR's request** — "Counted as
              company presences, so a company in three cities is counted in each — the
              total runs above the number of companies." A reader adding the list up
              and comparing it with the industry total will now find more presences
              than companies with nothing explaining why.

              What stays is the unplotted note, which is a different sentence and was
              only ever appended to that one. It is the block admitting that a city in
              the list is missing from the graphic, and dropping it would make the map
              quietly disagree with the list beside it. It renders for almost no
              industry, so it costs nothing where it does not apply. */}
          {map.unplotted.length > 0 ? (
            <Provenance>
              {map.unplotted.join(", ")}{" "}
              {map.unplotted.length === 1 ? "is" : "are"} listed but not plotted: we
              have no mapped position for{" "}
              {map.unplotted.length === 1 ? "it" : "them"} yet.
            </Provenance>
          ) : null}
      </div>
    </div>
  );
}
