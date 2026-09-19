"use client";

import { useState } from "react";

import type { MapBlock } from "@/data/screen1";
import { INDIA_ISLAND_MARKS, INDIA_OUTLINE_PATH } from "@/data/india-outline";
import { MAP_HEIGHT, MAP_WIDTH } from "@/data/geo";
import {
  formatCount,
  PanelAction,
  Provenance,
} from "@/components/public/primitives";
import { RankedBars, type BarRow } from "@/components/public/charts";
import { usePublicCopy } from "@/components/public/copy-context";

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
 * **The graphic is soft marks on an unstroked silhouette, and that pass is what
 * stopped it reading as a school diagram.** Five things were wrong at once and
 * each had the same cause — every element on the field had a hard edge, so nothing
 * was ground and everything was a figure:
 *
 *   - **Two strokes and two fills.** Established hubs were a solid disc with a
 *     white stroke; emerging ones a white disc with a teal stroke. Now a hub is a
 *     radial falloff with a hard core and an emerging city is a hairline ring with
 *     no fill: one stroke and one fill on the field, differing in whether the mark
 *     has a body. Area is still the encoding and `radiusFor` is untouched.
 *   - **The country was stroked**, so India read as a boundary drawing rather than
 *     as the ground the marks sit on. It is a filled silhouette now. Invariant 8
 *     governs where the geometry comes from, not whether it is outlined.
 *   - **The island specks were the highest-contrast marks in the eastern half of
 *     the frame** while carrying no data, which is how territory comes to read as
 *     dirt on a screen. They are drawn in the land's own value now.
 *   - **Labels collided with marks.** They sat beside their dots with a knockout
 *     stroke, and the knockout is what ate a bite out of the Pune dot. They are in
 *     the open sea east of the coast now, with a leader line back — see
 *     `layOutLabels`, which also explains why that field was the right place.
 *   - **The legend was at the foot of a 430px graphic**, further from the marks it
 *     decodes than from anything else on the card. It is at the head of the ranked
 *     list, beside the rows that use the same word.
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
/**
 * **Both ends came down by the same factor at ANSR's request**, so the encoding is
 * untouched: area still tracks the count and the ratio between any two cities is
 * exactly what it was. What changed is the scale the whole set is drawn at.
 *
 * The reason is the southern cluster. Bengaluru, Chennai, Mysuru, Mangaluru,
 * Coimbatore and Salem sit inside a few degrees of each other, and at the old peak
 * radius the leading city's halo swallowed its neighbours rather than overlapping
 * them — which reads as one enormous blob instead of as a dense region, and loses the
 * very thing the map is for. Smaller marks overlap and stay countable.
 */
const RADIUS_MIN_RATIO = 0.0135;
const RADIUS_MAX_RATIO = 0.046;

function radiusFor(companies: number, peak: number, width: number): number {
  const min = width * RADIUS_MIN_RATIO;
  const max = width * RADIUS_MAX_RATIO;
  if (peak <= 1) return min;
  const share = Math.sqrt(companies / peak);
  return min + (max - min) * share;
}

/**
 * The hard core inside a halo, as a fraction of the field's width.
 *
 * **The halo is soft, so something has to stay sharp or the position stops being
 * a position.** A radial falloff has no edge, and a mark with no edge cannot be
 * read against a coastline — Mumbai and Pune are 80km apart and the reader has to
 * see that as two places. The core is a fixed radius rather than a share of the
 * halo's: it carries no quantity, so scaling it would be a second encoding of the
 * same figure drawn at a different size.
 *
 * Capped at a fraction of the halo it sits in, so the smallest hub does not come
 * out as a solid disc with a faint rim — which is the old fill-plus-stroke mark
 * back again at the bottom of the scale.
 */
const CORE_RATIO = 0.0044;
const CORE_MAX_SHARE = 0.3;

function coreFor(radius: number, width: number): number {
  return Math.min(width * CORE_RATIO, radius * CORE_MAX_SHARE);
}

/**
 * The coastline, per latitude band, derived from the outline path itself.
 *
 * **This is what makes "outside the country" a computable fact rather than a
 * guess**, and it is why the labels can sit in the frame's own seas instead of in
 * gutters bolted onto the side. For each band it holds the westmost and eastmost x
 * the silhouette reaches, so a label can be placed just beyond the coast at its own
 * latitude — which is also what makes the placement scatter around the country's
 * shape rather than stack into one column.
 *
 * **Parsed from `INDIA_OUTLINE_PATH` rather than generated beside it.** The path is
 * pure `M`/`L`/`Z` polygons in absolute coordinates, so the extents are exact, and
 * deriving them from the same string means there is no second artefact to keep in
 * step — a generated table could go stale against a regenerated outline and nothing
 * would say so. It also inherits invariant 8 for free: the extents are a property of
 * the Natural Earth geometry, not of anything hand-authored.
 *
 * Computed once at module load. Segments are sampled rather than only their
 * vertices, because a long coastal run can cross several bands without putting a
 * vertex in any of them.
 */
const COAST_BANDS = 96;

interface Extent {
  min: number;
  max: number;
}

function buildCoast(width: number, height: number): Extent[] {
  const bands: Extent[] = Array.from({ length: COAST_BANDS }, () => ({
    min: Infinity,
    max: -Infinity,
  }));
  const bandHeight = height / COAST_BANDS;
  const bandOf = (y: number) =>
    Math.min(COAST_BANDS - 1, Math.max(0, Math.floor(y / bandHeight)));

  const record = (x: number, y: number) => {
    const band = bands[bandOf(y)]!;
    if (x < band.min) band.min = x;
    if (x > band.max) band.max = x;
  };

  /**
   * **The MAINLAND polygon only, and this one mattered.** The outline holds every
   * island large enough to draw, and the Andaman and Nicobar chain sits at the far
   * east of the frame at exactly the latitudes of Chennai and Bengaluru. Measured
   * across every subpath, the east "coast" at those latitudes came out as the
   * Andamans rather than the mainland, so the Bay of Bengal — the roomiest empty
   * water in the frame — read as fully occupied and the southern labels were all
   * pushed west across the country.
   *
   * The mainland is the subpath with the most points, by a wide margin, so this needs
   * no threshold to tune. The cost is that a label may now be placed over an island
   * speck; they are drawn in the land's own value under a blur, and no label reaches
   * that far east in practice, so the trade is worth it.
   */
  const subpaths = INDIA_OUTLINE_PATH.split("M").slice(1);
  const mainland = subpaths.reduce((longest, candidate) =>
    candidate.length > longest.length ? candidate : longest,
  );

  for (const subpath of [mainland]) {
    const numbers = subpath.match(/-?\d+(?:\.\d+)?/g);
    if (!numbers) continue;
    let previousX: number | null = null;
    let previousY: number | null = null;
    for (let i = 0; i + 1 < numbers.length; i += 2) {
      const x = Number(numbers[i]);
      const y = Number(numbers[i + 1]);
      if (previousX !== null && previousY !== null) {
        // Sample at half a band so no crossing is missed.
        const steps = Math.max(
          1,
          Math.ceil(Math.abs(y - previousY) / (bandHeight / 2)),
        );
        for (let step = 1; step <= steps; step += 1) {
          const t = step / steps;
          record(previousX + (x - previousX) * t, previousY + (y - previousY) * t);
        }
      } else {
        record(x, y);
      }
      previousX = x;
      previousY = y;
    }
  }

  // A band the country does not reach inherits its nearest populated neighbour, so
  // a label north or south of the landmass still has a defined coast to sit beyond
  // rather than an infinity.
  let lastKnown: Extent | null = null;
  for (const band of bands) {
    if (band.min === Infinity) {
      if (lastKnown) Object.assign(band, lastKnown);
    } else {
      lastKnown = { min: band.min, max: band.max };
    }
  }
  for (let i = bands.length - 1; i >= 0; i -= 1) {
    const band = bands[i]!;
    if (band.min === Infinity) {
      const next = bands[i + 1];
      if (next) Object.assign(band, next);
      else Object.assign(band, { min: width / 2, max: width / 2 });
    }
  }
  return bands;
}

const COAST = buildCoast(MAP_WIDTH, MAP_HEIGHT);

/** The country's west and east edge at a given y. */
function coastAt(y: number, height: number): Extent {
  const bandHeight = height / COAST_BANDS;
  const index = Math.min(
    COAST_BANDS - 1,
    Math.max(0, Math.floor(y / bandHeight)),
  );
  return COAST[index]!;
}

/**
 * Where the city labels go.
 *
 * **Every city the ranked list names gets one**, at ANSR's request — the leading
 * eight, and all of them once the visitor expands. And they are SCATTERED around the
 * country rather than stacked in one column, which is the other half of the ask and
 * the reason the coast table above exists.
 *
 * Three things decide a placement, in order:
 *
 *   1. **Which side has room.** Room is measured from the coast at that latitude to
 *      the frame's edge, so it is the Arabian Sea on one side and the Bay of Bengal
 *      on the other, and it varies down the country. A label goes to the side that
 *      can actually hold its text.
 *   2. **Then the nearer coast**, when both sides fit, which keeps the leader short
 *      and is what makes the set scatter: the southern cities reach the Bay, the
 *      western ones the Arabian Sea.
 *   3. **Then vertical de-collision within each side**, after which the coast is read
 *      AGAIN at the settled y — otherwise a label that moved down a hundred units
 *      would still be hugging the coastline of the latitude it came from.
 *
 * **A single side was tried first and was wrong for a reason specific to this data:
 * every Indian GCC city is west of the frame's midline**, so a rule as obvious as
 * "nearer half of the frame" put all eight in one gutter and left the Bay of Bengal
 * empty. The frame is wide because it has to contain the whole of India including the
 * northeast, not because the cities are spread across it.
 *
 * Nothing here is per-city. The labelled set changes with the visitor's own
 * disclosure, so any hand-placed offset would be wrong on the next click.
 */
interface Label {
  city: string;
  figure: string;
  /** The leader's start: the city's own position. */
  dotX: number;
  dotY: number;
  /** The dotted pointer, at the label end. */
  circleX: number;
  /**
   * The leader's bend, ON THE COASTLINE at the label's own settled latitude.
   *
   * **This is what stops a leader running flat across the country.** The elbow used to
   * be derived from the vertical offset alone — `dotX + min(|dotY - y|, run * 0.55)` —
   * which meant a label needing no de-collision sat about one line-height above its
   * dot, so the diagonal leg covered barely a dozen units and the remaining horizontal
   * leg covered everything else. For an inland city that is a long horizontal rule
   * drawn across the landmass, which the style lock calls the one mark this graphic
   * must not draw: on a map whose borders are the whole point, a straight line over
   * land is read as a border.
   *
   * Pinning the bend to the coast splits the leader by TERRITORY rather than by
   * arithmetic. Everything over land is the single diagonal from the dot to the
   * coastline; everything from the coastline to the pointer is the short leg out into
   * open water, where a horizontal line cannot be mistaken for anything. The diagonal
   * gets the vertical budget it needs from `rise`, which now grows with the distance
   * the leader has to cross — see there.
   *
   * The orthogonal alternative — a vertical stub then a horizontal run — is the shape
   * this file rejected before, and for the same reason it is rejected again: a purely
   * axis-aligned leader reads as a graticule rule, and this map dropped its graticule
   * precisely because a straight horizontal or vertical line over India is the mark
   * most easily mistaken for a boundary. Two diagonals do not have that problem.
   */
  elbowX: number;
  /** Where the text anchors, just past the pointer. */
  textX: number;
  /** Shared by the pointer and the text. */
  y: number;
  side: "left" | "right";
}

/**
 * Average glyph advance as a share of the font size, for the display face at
 * medium.
 *
 * An estimate, and it only decides which side a label goes to and how much room it
 * is assumed to need — never what anything says. Measuring for real would mean
 * `getComputedTextLength`, which needs a layout pass and would make the graphic
 * shift after paint.
 */
const GLYPH_ADVANCE = 0.55;

/**
 * The pointer's radius, derived from the label size rather than set.
 *
 * **Smaller than it was, and a complete circle rather than a dashed one.** The dash
 * pattern was four arcs round the circumference, and at this size that does not read
 * as "dotted" — it reads as a circle that has failed to draw. A small solid ring says
 * the same thing (annotation, not a city) without looking broken, because the size
 * and the grey already separate it from a mark.
 */
function pointerRadiusFor(fontSize: number): number {
  return fontSize * 0.26;
}

/**
 * The PHONE layer's type size, as a share of the frame's width, from how many names it
 * has to place.
 *
 * **The phone names the whole ranked set, so the size is what gives.** A name's ink is
 * proportional to this share and the room it has is the frame's own seas, which do not
 * grow — so the room per name is what a count buys or spends. Three steps rather than a
 * continuous curve, because the reason for each is a different one:
 *
 * - **Up to four names: 0.05.** About 14px on a ~300px box, which is the same physical
 *   size the desktop label has at 1440. This is the measured case — four is what the
 *   seas hold at that size with every leader still reading as a diagonal.
 * - **Up to eight, the collapsed list: 0.036.** Eight names at 0.05 need about twice
 *   the sea there is, and the de-collision answers an impossible fit by stacking them
 *   into a column, which is the gutter layout this map exists to replace. 0.036 is
 *   about 11px on the same box: below the desktop-parity size and still a name.
 * - **Past eight, the expanded list: 0.026.** Twenty-two names is dense at any size and
 *   the binding constraint stops being the sea and becomes the frame's own height —
 *   one side's stack is `1.7 x fontSize` per label, so past about fifteen the column
 *   runs off the bottom and the overflow correction drags the whole set below its own
 *   dots. This is a hair under the desktop share, and it is the honest price of "show
 *   every city" on a 300px map.
 *
 * The steps are the collapsed and expanded set sizes the list itself uses (`RANKED`),
 * so a change to how many rows the list shows before its disclosure has to be made here
 * too — which is the coupling, and it is the one that keeps the two readings naming the
 * same places.
 */
function phoneLabelShare(count: number): number {
  if (count <= 4) return 0.05;
  if (count <= RANKED) return 0.04;
  return 0.033;
}

/**
 * The leader lines for one label layer.
 *
 * Extracted so the phone layer and the desktop layer are one piece of markup with two
 * sets of inputs. They cannot be one LAYER — the leaders go under the city marks and the
 * names go over them, so the two halves sit either side of the marks in the tree.
 */
function MapLeaders({
  labels,
  width,
  pointerRadius,
  className,
  hovered,
}: {
  labels: readonly Label[];
  width: number;
  pointerRadius: number;
  className: string;
  /**
   * The hovered city's name, whose leader is drawn in the text ink instead of the grey.
   *
   * **This is what stops the readout being a restatement.** Above `sm` the label already
   * carries the count, so a plate repeating it says nothing new — what a reader hovering a
   * name actually wants is WHICH dot it belongs to, and with up to twenty-two leaders
   * crossing the peninsula that is the hard part. Darkening the one leader answers it; the
   * plate at the dot is the confirmation at the far end. No width change, so nothing moves
   * and no other leader is displaced.
   */
  hovered: string | null;
}) {
  return (
    <g className={className} aria-hidden="true">
      {labels.map((label) => {
        const outward = label.side === "left" ? -1 : 1;
        const toX = label.circleX - outward * pointerRadius;
        /**
         * **Both legs always exist, and the bend is a place rather than a ratio.** The
         * elbow sits on the coastline at the label's own latitude, so the first leg is
         * the diagonal across land and the second is the short run out into open water.
         * Clamped so the bend cannot end up beyond the pointer itself, which would fold
         * the leader back on itself for a city whose coast is further out than its own
         * label — the northeastern latitudes, where the frame's water is narrow.
         *
         * The previous version derived the bend from the vertical offset and a 55% cap
         * on the horizontal run; see `Label.elbowX` for why that put a flat rule across
         * the peninsula.
         */
        const elbowX =
          outward === -1 ? Math.max(label.elbowX, toX) : Math.min(label.elbowX, toX);
        return (
          <polyline
            key={`leader-${label.city}`}
            points={`${label.dotX},${label.dotY} ${elbowX},${label.y} ${toX},${label.y}`}
            fill="none"
            strokeLinejoin="round"
            strokeLinecap="round"
            className={label.city === hovered ? "stroke-text" : "stroke-grey-500"}
            strokeWidth={width * 0.002}
          />
        );
      })}
    </g>
  );
}

/**
 * The pointers and the names for one label layer — everything that draws OVER the city
 * marks. The pair with `MapLeaders`.
 */
function MapNames({
  labels,
  width,
  fontSize,
  pointerRadius,
  className,
  scope,
  showFigure,
  onHover,
}: {
  labels: readonly Label[];
  width: number;
  fontSize: number;
  pointerRadius: number;
  className: string;
  /**
   * Reports which city the pointer is on, so hovering a NAME reads out the same city
   * hovering its dot does.
   *
   * A name is the easier of the two to hit — it is a word, where the mark it belongs to
   * can be a few pixels across — and it is the thing the visitor is actually looking at
   * when they are working out which city a leader points to. See `CityReadout`.
   */
  onHover: (city: string | null) => void;
  /**
   * Whether each name carries its count. Passed rather than derived from `scope`, so
   * the two decisions — which layer this is, and what a label says — stay separable;
   * it is also what `layOutLabels` was given, and the pair must agree or a label is
   * placed for ink it does not draw.
   */
  showFigure: boolean;
  /**
   * Which of the two layers this is, as a stable spec hook rather than a style.
   *
   * There are two `text` layers in this SVG now and only one of them is drawn at any
   * width, so `svg text` no longer means "the labels on screen" — it means both sets.
   * A spec counting labels against the ranked list has to say which layer it is
   * counting, and it must not do that by matching a Tailwind class.
   */
  scope: "phone" | "wide";
}) {
  return (
    <g className={className} aria-hidden="true" data-map-labels={scope}>
      {labels.map((label) => (
        <g
          key={`name-${label.city}`}
          /* `pointerenter` / `pointerleave` rather than `mouseenter`, so a pen and a
             finger take the same path as a mouse; `pointercancel` because a touch that
             turns into a scroll never sends a leave. */
          onPointerEnter={() => onHover(label.city)}
          onPointerLeave={() => onHover(null)}
          onPointerCancel={() => onHover(null)}
        >
          {/* **The dotted pointer sits at the LABEL end, at ANSR's request** — where the
              name is, rather than at the city. It replaced a solid pin at the city end,
              which had a problem of its own: that end already has the halo's hard core,
              so a second circle there was either invisible behind it or a competing mark
              on top of it. At the name end there is nothing to compete with, and the
              stroke says plainly that it is annotation rather than another city. */}
          <circle
            cx={label.circleX}
            cy={label.y}
            r={pointerRadius}
            // The card's own fill, so the leader stops at the rim rather than showing
            // through a hollow ring.
            className="fill-surface stroke-grey-500"
            strokeWidth={width * 0.002}
          />
          {/* **The name, outside the country and never over it** — the whole point of
              placing in the seas. No knockout stroke is needed, because there is nothing
              underneath to knock out; the knockout is what used to eat a bite out of the
              Pune dot.

              Typography is the display face at Medium with the figure alongside in
              tabular numerals and a muted ink, so a column of names reads as one list
              and the counts line up down it. `paint-order` and semibold both went: at
              this size semibold in a gutter reads as shouting, and the project's own
              display scale puts Medium here. */}
          <text
            x={label.textX}
            y={label.y}
            textAnchor={label.side === "left" ? "end" : "start"}
            dominantBaseline="middle"
            className="fill-text font-display font-medium tracking-body"
            style={{ fontSize: `${fontSize}px` }}
          >
            {label.city}
            {showFigure ? (
              <tspan className="fill-text-muted tabular-nums"> {label.figure}</tspan>
            ) : null}
          </text>
        </g>
      ))}
    </g>
  );
}

/**
 * The hovered city's name and count, drawn at its own dot.
 *
 * **This replaced a native `<title>`, and latency is the whole reason.** A `<title>`
 * inside a shape is an OS tooltip: it arrives about a second after the pointer settles,
 * in browser chrome, at the pointer rather than at the mark. On a card where the figure
 * is already in the list beside it, a second of nothing happening reads as the graphic
 * being inert — which is what it was reported as. This is immediate, has no transition,
 * and is positioned by the data rather than by the cursor.
 *
 * **It is not a figure kept behind a hover**, which this project forbids: every count is
 * in the ranked list, and above `sm` on the map's own labels too. What the readout buys is
 * not access to the number but proximity — it puts it at the dot, so a reader working out
 * which mark a leader belongs to does not travel back to the list and lose their place.
 *
 * Placed above the dot and clamped to the frame on both axes, so a hub near an edge does
 * not draw its plate outside the viewBox. `pointer-events: none` on the whole group,
 * because a readout that can be hovered is a readout that flickers when the plate covers
 * the mark that opened it.
 */
function CityReadout({
  city,
  figure,
  x,
  y,
  radius,
  width,
  fontSize,
}: {
  city: string;
  figure: string;
  x: number;
  y: number;
  /** The mark's own radius, so the plate clears the halo rather than sitting on it. */
  radius: number;
  width: number;
  fontSize: number;
}) {
  const padX = fontSize * 0.5;
  const padY = fontSize * 0.34;
  const textWidth = `${city} ${figure}`.length * GLYPH_ADVANCE * fontSize;
  const plateWidth = textWidth + padX * 2;
  const plateHeight = fontSize + padY * 2;
  // Above the mark, or below it where there is no room above.
  const above = y - radius - fontSize * 0.5 - plateHeight;
  const plateY = above < 0 ? y + radius + fontSize * 0.5 : above;
  const plateX = Math.min(
    Math.max(x - plateWidth / 2, 0),
    Math.max(width - plateWidth, 0),
  );
  return (
    <g aria-hidden="true" className="pointer-events-none">
      <rect
        x={plateX}
        y={plateY}
        width={plateWidth}
        height={plateHeight}
        rx={fontSize * 0.3}
        strokeWidth={width * 0.002}
        className="gcc-map-tip-plate"
      />
      <text
        x={plateX + padX}
        y={plateY + plateHeight / 2}
        dominantBaseline="middle"
        className="gcc-map-tip-label font-display font-medium tracking-body"
        style={{ fontSize: `${fontSize}px` }}
      >
        {city}
        <tspan className="gcc-map-tip-figure tabular-nums"> {figure}</tspan>
      </text>
    </g>
  );
}

function layOutLabels(
  cities: readonly { city: string; companies: number; point: { x: number; y: number } }[],
  width: number,
  height: number,
  fontSize: number,
  /**
   * Whether the label carries its count as well as its name.
   *
   * **It is a layout input, not a rendering one, which is why it is here rather than
   * only in `MapNames`.** The room a label needs is what decides which side of the
   * country it goes to and how far off the coast it sits, and "Bengaluru 1004" needs
   * about 55% more of it than "Bengaluru" does. A layer that dropped the figure at
   * paint time would still be placed as though it were carrying one, which is the
   * whole gutter's width spent on ink that is not there.
   */
  showFigure: boolean,
): Label[] {
  if (cities.length === 0) return [];

  const pointerRadius = pointerRadiusFor(fontSize);
  /**
   * **How far off the coast the pointer sits, and it more than doubled.** At 0.022 of
   * the width the names sat almost against the coastline, and a soft blurred edge
   * immediately behind small type is what was costing legibility — the glyphs had no
   * clear ground of their own. Pushed out, each name sits on the card's own white.
   *
   * It is paid for out of the room available inside the frame, so a wider inset sends
   * more labels into the wrapper's padding. That is the right way to spend it: the
   * padding exists, and a name that is hard to read is not worth keeping inside the
   * viewBox.
   */
  const inset = width * 0.05;
  const textGap = fontSize * 0.55;
  const step = fontSize * 1.7;
  const lead = inset + pointerRadius * 2 + textGap;
  /**
   * The vertical offset every label starts with, which is what guarantees the elbow
   * has a bend to draw. Without it a label that needs no de-collision sits at its own
   * dot's latitude, the diagonal leg has zero length, and the leader comes out as a
   * plain horizontal rule — which is both the shape this map must not draw and, with
   * some leaders bent and some not, visibly inconsistent across the set.
   */
  const baseRise = fontSize * 1.15;
  /**
   * **How much vertical offset a label gains per unit of LAND its leader has to
   * cross**, which is what turns the land leg from a flat rule into a diagonal.
   *
   * The base rise alone is about one line-height, which is plenty for a coastal city —
   * Mumbai's leader leaves the dot and is over water almost immediately, so a short
   * 45° stub is the whole land crossing. It is nowhere near enough for an inland one:
   * Hyderabad's dot is a long way from the Bay, so with a fixed rise the diagonal
   * covered a dozen units and a horizontal leg covered the rest of the peninsula.
   *
   * Scaling the offset by the land distance gives every leader roughly the same ANGLE
   * over land instead of the same vertical offset. At 0.45 the land leg sits at about
   * 24° from horizontal, which is unmistakably a diagonal at every width the map
   * renders at, and it is shallow enough that eight labels still fit the frame's height
   * once the de-collision below has spread them.
   *
   * It is deliberately not steeper. At 45° the two inland northern cities would need
   * more vertical offset than the frame has left above them, and the overflow
   * correction would then drag the whole column down past its own dots.
   */
  const LAND_RISE = 0.45;

  const rows = cities.map((row) => {
    const figure = formatCount(row.companies);
    const textWidth =
      (showFigure ? `${row.city} ${figure}` : row.city).length *
      GLYPH_ADVANCE *
      fontSize;
    const coast = coastAt(row.point.y, height);
    const roomLeft = coast.min;
    const roomRight = width - coast.max;
    const need = lead + textWidth;

    /**
     * **One cost per side, in the same units, so the two concerns can actually be
     * traded off.** A hard "does it fit inside the frame" test was tried first and
     * sent Ahmedabad — a city on the Arabian Sea — to the Bay of Bengal, because
     * Gujarat reaches far enough west that its own sea was 33 units short. The leader
     * then crossed the entire country to reach water it did not need.
     *
     * So overflowing the frame by a little is priced, and priced the same as crossing
     * the country by a little. A short leader with a label that runs slightly into the
     * wrapper's padding beats a correct-by-the-rule label on the far side, which is
     * the right way round: the padding exists for this, and a leader spanning India is
     * the one mark this graphic keeps having to avoid.
     */
    const cost = (room: number, distance: number) =>
      distance + Math.max(0, need - room);
    const side: "left" | "right" =
      cost(roomLeft, row.point.x - coast.min) <=
      cost(roomRight, coast.max - row.point.x)
        ? "left"
        : "right";

    /**
     * The land the leader has to cross on the chosen side: the dot to that side's
     * coastline at the dot's own latitude. Near zero for a coastal city, and the
     * whole width of the peninsula for an inland one.
     */
    const landRun =
      side === "left"
        ? Math.max(0, row.point.x - coast.min)
        : Math.max(0, coast.max - row.point.x);
    const rise = baseRise + landRun * LAND_RISE;

    return {
      city: row.city,
      figure,
      dotX: row.point.x,
      dotY: row.point.y,
      side,
      // Above its own dot, or below where there is no room above.
      y:
        row.point.y - rise < fontSize
          ? row.point.y + rise
          : row.point.y - rise,
    };
  });

  const placed: Label[] = [];
  for (const side of ["left", "right"] as const) {
    const column = rows
      .filter((row) => row.side === side)
      .sort((a, b) => a.y - b.y);

    let previous = -Infinity;
    for (const row of column) {
      row.y = Math.max(row.y, previous + step);
      previous = row.y;
    }
    const last = column[column.length - 1];
    const overflow = last ? last.y - (height - fontSize * 0.6) : 0;
    if (overflow > 0) for (const row of column) row.y -= overflow;

    for (const row of column) {
      // Read the coast again at the SETTLED latitude, not the city's own.
      const coast = coastAt(row.y, height);
      const circleX =
        side === "left" ? coast.min - inset : coast.max + inset;
      placed.push({
        city: row.city,
        figure: row.figure,
        dotX: row.dotX,
        dotY: row.dotY,
        circleX,
        // The bend, on the coastline at the SETTLED latitude — the same reading of the
        // coast that places the pointer, so the two cannot disagree about where the
        // water starts. See `Label.elbowX`.
        elbowX: side === "left" ? coast.min : coast.max,
        textX:
          side === "left"
            ? circleX - pointerRadius - textGap
            : circleX + pointerRadius + textGap,
        y: row.y,
        side,
      });
    }
  }
  return placed;
}

/**
 * **THERE IS NO HUB PULSE, at the project owner's instruction, and `PULSED` /
 * `PULSE_CYCLES` are deleted rather than set to zero.**
 *
 * Three leading hubs carried an expanding accent ring for two cycles as the screen
 * arrived. Every constraint this project puts on motion was satisfied — the ring
 * carried no value, so no figure moved; it ran on three marks rather than the whole
 * field; it stopped rather than looping — and it was still emphasis by RANK, drawn in
 * motion, on the one graphic whose entire claim is the comparison of dot areas. A
 * reader sizing Chennai against Bengaluru was doing it while two of the marks moved.
 *
 * It is the same argument that took `emphasis` off the ranked list's leading row: the
 * three cities are already first in the list, already the largest marks, and already
 * labelled. `.gcc-map-pulse` and its keyframes went from globals.css in the same pass.
 */

/** How many cities the ranked list shows before "Explore all cities". */
const RANKED = 8;

/** The region the disclosure controls, so `aria-controls` has something to name. */
const CITY_LIST_ID = "city-ranking";

/**
 * The halo gradient's id.
 *
 * Referenced from the legend's own `<svg>` as well as from the map's, which works
 * because `url(#id)` resolves against the document rather than the element — and it
 * is the point: a legend swatch drawn as a flat disc would be decoding a mark that
 * does not exist on the field.
 */
const HALO_GRADIENT_ID = "gcc-map-halo";

/** The land's dot texture. One consumer, but `url(#…)` needs the name twice. */
const DOT_PATTERN_ID = "gcc-map-dots";

/**
 * The dot field's grain, as fractions of the projected map's width.
 *
 * **The two are set together and the coverage is what actually matters.** A circle of
 * radius r on an s x s grid inks `pi * r^2 / s^2` of the area, and that ratio is what
 * the eye reads as the country's value — so the pair can be made as fine as wanted
 * while the country keeps exactly the presence it had as a flat fill. At these values
 * coverage is ~16%, which puts `--ansr-motif-ink` dots at an average of about
 * `--ansr-teal-100` over the card: the same wash the flat fill gave, now as texture.
 *
 * That is why the ink is a mid teal rather than the pale one it replaced. Dots at
 * `teal-100` over 16% of the area average out to roughly nothing — the country would
 * not be faint, it would be absent, and "almost unnoticeable" still has to leave a
 * country for the marks to sit on.
 *
 * The blur is deliberately smaller than the spacing. Past it the dots merge into a
 * flat fill and the whole texture is gone; see `.gcc-map-land`.
 */
const DOT_SPACING_RATIO = 0.0066;
const DOT_RADIUS_RATIO = 0.0015;

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
  const copy = usePublicCopy();
  const [showAll, setShowAll] = useState(false);

  /**
   * Which city the pointer is on, by name.
   *
   * Held as the NAME rather than the row, so the readout always reads today's figure out
   * of `map.cities` — a disclosure or a new industry replaces that array, and a captured
   * row would keep drawing the count it was hovered with.
   */
  const [hovered, setHovered] = useState<string | null>(null);

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

  /**
   * **No `emphasis` on the leading row, and dropping it is a correctness fix rather
   * than a restraint one.** It was set on `index === 0`, which drew the first bar in
   * `--ansr-accent` and every other bar in a lighter step — so colour was encoding
   * RANK while length encoded quantity, and the second-placed city at 64% of the peak
   * carried exactly the same fill as the eighth at 4%. On a ramp whose whole contract
   * is "darker means more", that is the one thing a fill may not do.
   *
   * Nothing is lost: the list is sorted, so the leading row is already first, its bar
   * is already full width by construction, and its figure is already beside it. The
   * emphasis was a fourth statement of a fact three other things carry.
   *
   * `BarTrack` keeps the prop, because there is a legitimate use for it — the
   * visitor's OWN position in a set, which is a categorical distinction rather than a
   * rank. Nothing on Screen 1 has one.
   */
  const rows: BarRow[] = ranked.map((city) => ({
    label: city.city,
    figure: formatCount(city.companies),
    share: map.peak > 0 ? city.companies / map.peak : 0,
    qualifier: city.tier1 ? undefined : "emerging",
  }));

  /**
   * **The labelled set is exactly the ranked list's set**, at ANSR's request — the
   * leading eight, and every city once the visitor expands. So the two readings name
   * the same places and the disclosure drives both at once, which is what stops the
   * graphic and the list beside it disagreeing about how much of the industry is on
   * screen.
   *
   * Filtered to the plotted ones, because a city admin added with no coordinate has
   * no dot to point at. It stays in the list and the unplotted note names it.
   */
  const plottedRanked = ranked
    .filter((city) => city.point !== null)
    .map((city) => ({ ...city, point: city.point! }));
  const labelFontSize = map.width * (showAll ? 0.023 : 0.027);
  const labels = layOutLabels(
    plottedRanked,
    map.width,
    map.height,
    labelFontSize,
    true,
  );
  const pointerRadius = pointerRadiusFor(labelFontSize);

  /**
   * **A phone names the SAME SET the desktop layer does — the ranked list's, expanding
   * with the disclosure — at the project owner's instruction, and the scoped exception
   * that let it name four is gone.**
   *
   * The map used to drop the whole label layer below `sm`, and then named the leading
   * four at nearly twice the desktop type share. The four was the wrong half of the
   * trade: a reader on a phone met eight ranked rows beside a map that pointed at half
   * of them, so the two readings disagreed about how much of the industry was on
   * screen — which is exactly what "the labelled set is the ranked list's set" exists
   * to prevent.
   *
   * **What remains different is the SIZE, and it is now derived from the count rather
   * than fixed.** The font size is a share of the frame, so the desktop share renders
   * at about 8px on a ~300px box, which is not a name; 0.05 renders at about 14px,
   * which is. But the ink a name costs scales with that share and the room it has is
   * the frame's own seas, so the two cannot both be held: at 0.05 a name like
   * "Bengaluru 1004" needs about 47% of the map's width on one side, where the widest
   * sea offers about 25%. Four names at 0.05 fit. Eight do not, and every one of the
   * expanded set is a third case again.
   *
   * So `phoneLabelShare` spends the room on whichever set is actually being named. The
   * cost is real and worth stating plainly: an expanded phone map sets its names at
   * roughly the size the desktop map does, which is small. It is the same cost the
   * desktop layer pays when it expands — 0.023 against 0.027 — arriving one step
   * earlier because the frame is smaller, and the alternative is a graphic that points
   * at four of twenty-two rows sitting directly beneath it.
   *
   * **The phone label draws the NAME ONLY, and dropping the count is what bought the
   * size back.** "Bengaluru 43" needs about 55% more room than "Bengaluru", and room is
   * exactly what is short here — so the figure was costing a third of every label's
   * width to restate, one line away, a number the ranked list under the map already
   * carries in a 30px row. That is the same argument the label layer itself stands on:
   * the list is the reading, and the map is where the reading is placed. The figure
   * stays on the desktop layer, where the gutter can afford it and the list is beside
   * the map rather than below it.
   *
   * The layout function is the same one, called with a different font size and told not
   * to reserve room for a figure — no second algorithm, so a change to the placement
   * rules cannot apply to one width and not the other. Both layers are `aria-hidden` at
   * every width, so having two in the DOM puts nothing in the accessibility tree twice.
   */
  const phoneLabelFontSize = map.width * phoneLabelShare(plottedRanked.length);
  const phoneLabels = layOutLabels(
    plottedRanked,
    map.width,
    map.height,
    phoneLabelFontSize,
    false,
  );
  const phonePointerRadius = pointerRadiusFor(phoneLabelFontSize);

  /**
   * The hovered row, resolved out of today's `plotted` rather than captured on the
   * pointer event. A city with no coordinate has no dot to draw a readout at, and a name
   * held from a previous industry simply resolves to nothing.
   */
  const hoveredCity =
    hovered === null ? null : (plotted.find((city) => city.city === hovered) ?? null);

  return (
    /**
     * **Side by side, map and ranked list — the layout ANSR asked to keep.**
     *
     * A full-width map with the list beneath it was built in between, to buy room for
     * label gutters on both sides, and it is not needed: the labels sit in the
     * frame's OWN seas now rather than outside it, so the map keeps its column and
     * the country keeps its size. `coastAt` is what made that possible. The only
     * thing outside the viewBox is the occasional label at a latitude where the
     * country is too wide to leave room, which the wrapper's small padding absorbs.
     */
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,6fr)] lg:gap-6">
        {/* **`overflow-visible` plus a small inline padding is the safety valve, not
            the layout.** Almost every label lands inside the viewBox; the few at wide
            latitudes run past it, and rather than shrink the whole map to guarantee
            room that most labels do not need, the wrapper reserves a little and the
            SVG is allowed to draw into it.

            Percentage padding, because it has to be a share of the map's own width
            for the reserved room to mean the same thing in user units at every size.

            **A phone reserves 9%, and it is a MEASURED ceiling rather than a chosen
            step.** It had no padding while it had no label layer, then 6% while it named
            four. Naming the whole ranked set puts more labels on the crowded western side,
            and the reserve is what the widest of them needs to clear the panel's own
            `overflow: hidden` — the clip is the panel's border box, so the room a label
            actually has is this padding plus the panel's 16px and nothing more. Measured
            at 320, 375, 390 and 430: at 9% the leftmost label lands inside the clip at
            every one of them, and it is the widest phone that binds rather than the
            narrowest, because the panel's own padding is a fixed 16px and therefore a
            larger share of a small card.

            **It is paid for out of the map, and that is the trade this reserve IS.**
            Every point of padding shrinks India, and the type size is a share of the
            frame, so widening the gutter to fit a label also shrinks the label. 9% is
            where the two meet; past it the names stop growing. See `phoneLabelShare`. */}
        <div className="mx-auto w-full max-w-[32rem] px-[9%] sm:px-[10%]">
          <svg
            viewBox={`0 0 ${map.width} ${map.height}`}
            role="img"
            aria-label={summary}
            // Bounded by WIDTH, not height: with `w-full` plus a max-height the
            // drawing letterboxes inside its own box, because `preserveAspectRatio`
            // centres it and the spare width goes to nothing.
            className="block h-auto w-full overflow-visible"
          >
            {/* The halo's falloff, defined once and referenced by every hub.
                `objectBoundingBox` units are the default, so one gradient scales to
                each circle's own bounding box and the profile is identical at every
                radius — which is what keeps the falloff from becoming a second,
                accidental encoding. */}
            <defs>
              {/* **The land is a fine DOT FIELD at ANSR's request, and it is a
                  pattern rather than generated geometry.** The ask was for the hero's
                  dotted treatment but finer — fine enough to be almost unnoticeable.

                  The hero gets its dots from `scripts/build_dot_map.py`, which writes
                  ~112KB of zero-length subpaths. Finer dots over India at this scale
                  would be more than that again, shipped to a visitor's browser for a
                  texture the point of which is that you barely see it. A pattern is a
                  few bytes, is clipped to the country by the fill itself, and lets the
                  spacing be set to whatever "fine" turns out to mean.

                  **The geometry is unchanged and invariant 8 is untouched.** It governs
                  where the outline comes from, not how it is filled — the same reasoning
                  that allowed unstroking it. What is drawn is still the Natural Earth
                  India point-of-view polygon; only its fill is now a texture.

                  Unlike the hero, dot size scales with the drawing rather than holding
                  constant in device pixels. The hero needs `non-scaling-stroke` because
                  it is a subject at one width; this is ground at four, and a texture
                  that keeps its absolute grain while the country shrinks gets coarser
                  relative to what it fills. */}
              <pattern
                id={DOT_PATTERN_ID}
                patternUnits="userSpaceOnUse"
                width={map.width * DOT_SPACING_RATIO}
                height={map.width * DOT_SPACING_RATIO}
              >
                <circle
                  cx={(map.width * DOT_SPACING_RATIO) / 2}
                  cy={(map.width * DOT_SPACING_RATIO) / 2}
                  r={map.width * DOT_RADIUS_RATIO}
                  className="gcc-map-dot"
                />
              </pattern>
              <radialGradient id={HALO_GRADIENT_ID}>
                {/* **Dense to ~45% of the radius, not 30%, and the render is what
                    moved it.** At 30% the falloff was so gradual that the visible
                    extent of a mark was well inside its encoded radius, and
                    Bengaluru at 90 and Chennai at 34 came out looking the same size
                    — which is the encoding failing, not a styling preference. Held
                    dense for nearly half the radius, area reads again and the mark
                    still has no edge to make it a diagram.

                    Stop colours are set in CSS so the token is named rather than
                    written out; see `.gcc-map-halo-stop`. */}
                <stop offset="0" className="gcc-map-halo-stop" stopOpacity="1" />
                <stop offset="0.45" className="gcc-map-halo-stop" stopOpacity="0.88" />
                <stop offset="0.78" className="gcc-map-halo-stop" stopOpacity="0.42" />
                <stop offset="1" className="gcc-map-halo-stop" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* India, filled and UNSTROKED — a silhouette rather than a boundary
                drawing. Invariant 8 governs where the geometry comes from, not
                whether it is outlined: a filled shape is the same claim, drawn as
                ground. `fill-rule: evenodd` resolves interior rings as holes, which
                is why every ring is in one path.

                **`teal-200`, not the pale mint the land used to be.** Unstroking at
                `teal-100` leaves no country at all — 1.27:1 against the card is a
                ghost, and the hairline coast was there to compensate for exactly
                that. One step down is 1.65:1: a shape the eye reads as ground, with
                black label ink at 12.7:1 on it and the emerging ring's hairline at
                3.12:1, which clears the non-text boundary floor. */}
            {/* **The land and its islands share one blurred group, at ANSR's
                request.** The blur is what lets the country be ground rather than
                subject: a crisp silhouette behind soft marks was the last hard edge
                left on the field, and it was competing with them. Blurring the group
                rather than each path keeps the coast and the islands at the same
                softness — done separately the specks would stay sharp and go back to
                reading as dirt.

                The land also went a step LIGHTER with the blur, from `teal-200` to
                `teal-100`. That is not a second opinion about the earlier darkening,
                it is what the bright orange needs: at `teal-200` the mint and the
                orange sit at nearly the same luminance and the marks vibrated against
                the ground, which is most of what read as bad colour. A lighter, softer
                ground is what makes the orange the brightest thing on the card. */}
            <g className="gcc-map-land">
              <path
                d={INDIA_OUTLINE_PATH}
                fillRule="evenodd"
                fill={`url(#${DOT_PATTERN_ID})`}
              />
              {/* The 27 islands below the width of the stroke that would draw them —
                most of Lakshadweep, the smaller Nicobars. Zero-length subpaths
                rendered as dots by a round cap, the same technique the hero's map
                uses. They are drawn because they are Indian territory: an outline
                that omits them draws a claim smaller than India's own.

                **Drawn in the land's own value now, not a step darker.** At
                `teal-500` they were the highest-contrast marks in the eastern half
                of the frame while carrying no data, so they read as specks of dirt
                on the screen rather than as territory. In the same token as the
                land they are the quietest thing in the graphic and still present,
                which is the whole requirement. */}
              {/* Sized to the land's own dot and inked the same, so an island reads as
                  one more grain of the same texture rather than as a different kind of
                  mark. They are round-cap zero-length subpaths, which is the technique
                  the hero's map uses — so on this surface the islands are the one place
                  the dots really are geometry. */}
              <path
                d={INDIA_ISLAND_MARKS}
                fill="none"
                strokeLinecap="round"
                className="gcc-map-dot-stroke"
                strokeWidth={map.width * DOT_RADIUS_RATIO * 2}
              />
            </g>

            {/* **Angled elbow callouts, at ANSR's request.** A 45° leg out of the
                city, then a horizontal leg out to the gutter where the name sits.

                A right-angled version was built first and lost for a reason worth
                keeping: **a purely orthogonal leader reads as a graticule rule**, and
                this map dropped its graticule precisely because a horizontal or
                vertical line drawn across India is the mark most easily mistaken for
                a boundary. A 45° leg belongs to no coordinate system, so it reads as
                annotation. The diagonal is clamped so it can never overshoot the
                gutter and double back.

                **They are the quietest ink on the field, and with up to twenty-two of
                them that is what keeps this from becoming a starburst.** Grey rather
                than the marks' orange: the leaders are wayfinding between two things
                that already carry the data, so anything louder competes with the marks
                for the same attention. `--ansr-grey-500` is the project's designated
                boundary grey and the only light neutral clearing 3:1.

                **They go under the marks, the text and pointers over them**, so a
                leader crossing a city it does not belong to disappears behind it and
                comes out the other side — which reads as passing rather than as
                stopping at it. */}
            <MapLeaders
              labels={phoneLabels}
              width={map.width}
              pointerRadius={phonePointerRadius}
              className="sm:hidden"
              hovered={hovered}
            />
            <MapLeaders
              labels={labels}
              width={map.width}
              pointerRadius={pointerRadius}
              className="hidden sm:block"
              hovered={hovered}
            />

            {/* **ONE mark form on the field, at ANSR's request.** It was a solid
                disc with a white stroke against a white disc with a teal stroke —
                two strokes and two fills on one grid, which is what made the graphic
                read as a school diagram. That became a halo against a hairline ring,
                and it is now a halo against a smaller halo: every city gets the same
                treatment and area is the only thing that varies.

                **What that costs is the established/emerging distinction ON THE
                GRAPHIC, and it is a real loss rather than a simplification.** The
                hollow ring was the project's status-by-form rule doing actual work —
                two marks differing in whether they had a body, which survives
                greyscale, on a palette whose own note says it cannot separate
                meanings by hue. With one form there is nothing left to carry it, and
                a second colour step would be the thing that rule exists to forbid.
                The distinction now lives only in the ranked list beside the map,
                where each tier-2 city is labelled "emerging". The two-shape legend
                went with it, since a key naming two marks that no longer differ is
                simply false. On the blocked list for ANSR. */}
            {plotted.map((city) => {
              const point = city.point!;
              const radius = radiusFor(city.companies, map.peak, map.width);
              return (
                <g
                  key={city.city}
                  onPointerEnter={() => setHovered(city.city)}
                  onPointerLeave={() => setHovered(null)}
                  onPointerCancel={() => setHovered(null)}
                >
                  {/* Area is still the encoding and the radius function is
                      untouched — the halo's outer edge is the same circle the
                      solid disc drew, so the claim has not moved.

                      **The `<title>` is gone and `CityReadout` is what replaced
                      it.** A `<title>` is an OS tooltip about a second behind the
                      pointer, which is what "too slow" was; the readout is
                      immediate and sits at the dot. Nothing is lost to assistive
                      technology: this `<svg>` is a `role="img"` with its own
                      `aria-label`, so its descendants were never in the
                      accessibility tree, and the ranked list beside it names every
                      city with its figure. */}
                  <circle
                    aria-hidden="true"
                    cx={point.x}
                    cy={point.y}
                    r={radius}
                    className="gcc-map-halo"
                  />
                  <circle
                    aria-hidden="true"
                    cx={point.x}
                    cy={point.y}
                    r={coreFor(radius, map.width)}
                    className="fill-action"
                  />
                  {/* The hit area, and it is deliberately larger than the mark. A
                      halo has no edge, and the smallest one in a thin industry is a
                      couple of device pixels across — so hovering the mark itself is
                      a precision task on exactly the cities a reader most needs
                      named. Transparent rather than a low opacity, so it adds no ink
                      to a field whose whole point is the density of what is on it. */}
                  <circle
                    aria-hidden="true"
                    cx={point.x}
                    cy={point.y}
                    r={Math.max(radius, map.width * 0.02)}
                    className="gcc-map-hit"
                  />
                </g>
              );
            })}

            {/* **The pointers and the names, over the marks and over the leaders**, so a
                leader stops cleanly at its pointer's rim and a name is never behind a
                city. `MapNames` carries both and the reasoning for each.

                **Two layers naming the same cities, and the phone one is not the desktop
                one drawn smaller.** It names the same ranked set — the leading eight, and
                every plotted city once the visitor expands — at a type size derived from
                how many that is, and it draws each name WITHOUT its count. Both
                differences are the same 236px-wide map being budgeted for. See
                `phoneLabels` and `phoneLabelShare`. The phone layer used to be nothing at
                all, and then four names. */}
            <MapNames
              labels={phoneLabels}
              width={map.width}
              fontSize={phoneLabelFontSize}
              pointerRadius={phonePointerRadius}
              className="sm:hidden"
              scope="phone"
              showFigure={false}
              onHover={setHovered}
            />
            <MapNames
              labels={labels}
              width={map.width}
              fontSize={labelFontSize}
              pointerRadius={pointerRadius}
              className="hidden sm:block"
              scope="wide"
              showFigure
              onHover={setHovered}
            />

            {/* **Last in the tree, so the readout is over every mark, leader and name.**
                One layer for both widths — the plate is sized off the frame and the
                position comes from the city's own dot, neither of which is a property of
                which label layer is drawn. See `CityReadout`. */}
            {hoveredCity ? (
              <CityReadout
                city={hoveredCity.city}
                figure={formatCount(hoveredCity.companies)}
                x={hoveredCity.point!.x}
                y={hoveredCity.point!.y}
                radius={radiusFor(hoveredCity.companies, map.peak, map.width)}
                width={map.width}
                fontSize={map.width * 0.032}
              />
            ) : null}
          </svg>
        </div>

        <div className="flex flex-col gap-5">
          {/* **THERE IS NO LEGEND ANY MORE, and it is the third line this block has
              lost to an instruction rather than to an argument.** It named two mark
              shapes — "Established hub" and "Emerging location" — and every city on
              the field now draws the same halo, so the key was describing a
              distinction the graphic had stopped making. A false key is worse than
              none, so it went with the ring rather than being reworded.

              It had already moved here from the foot of the map in the same pass,
              because under a 430px graphic it sat further from the marks it decoded
              than from anything else on the card. That move is moot now and the
              reasoning is kept only so the next person does not put it back down
              there.

              **What the graphic no longer says, in order of when it was lost.**
              "Larger means more GCCs" — the area encoding said out loud. "Boundaries
              as India states them, from Natural Earth's India point-of-view dataset."
              — which **invariant 8 in project.md required on the page**, and the
              outline is still cut from exactly that dataset, so the claim drawn has
              not changed while the statement of whose claim it is has gone. And now
              the tier distinction. Each was ANSR's call; all three are on the blocked
              list, because the accumulation is the problem rather than any one of
              them. The ranked list is doing all of the explaining. */}

          {/* The two column names, which the ranked list itself does not carry. A
              `dl` of city-and-count pairs with no headings leaves the reader to work
              out whether the trailing figure is companies, centres or people, and
              this page carries all three. */}
          <div
            aria-hidden="true"
            className="flex items-baseline justify-between gap-4 border-b border-border-strong pb-2 text-xs font-semibold tracking-caps text-text-muted uppercase"
          >
            <span>{showAll ? copy.cityScopeAll : copy.cityScopeTop}</span>
            <span>{copy.cityCountHeader}</span>
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
                {showAll ? copy.cityToggleToTop : copy.cityToggleToAll}
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
