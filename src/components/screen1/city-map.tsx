import type { MapBlock } from "@/data/screen1";
import { Chip, formatCount, Provenance } from "@/components/public/primitives";
import { BarTrack } from "@/components/public/charts";

/**
 * Where in India the visitor's industry actually is.
 *
 * The brief asks for a heatmap, and this is one — density per city, filtered to
 * the visitor's industry, built from the city lists already in the company data
 * rather than a separate geography dataset.
 *
 * **No India outline is drawn, and that is the design.** The obvious build is a
 * country outline with dots on top, and hand-authoring that outline is the one
 * risk not worth taking here: India's borders are contested, an approximate trace
 * asserts a border position the tool has no business asserting, and it would do
 * it under ANSR's brand. So the dots sit on an unbordered field at their real
 * relative positions. Every position is accurate; no boundary is claimed. A
 * verified, licensed outline drops in behind `projectCity` whenever one is
 * sourced.
 *
 * **What changed, and why the previous version failed as a map.** Seven small
 * hollow-ish dots, bounded to 384px wide, sat on a plain tinted panel with the
 * only labels in a list beside it — so the graphic carried no names at all and
 * read as a scatter of marks rather than as a country. Three fixes, in order of
 * how much they mattered:
 *
 *   - **The leading cities are labelled in place.** The reason they were not is
 *     real — six of the seven tier-1 cities cluster tightly enough that labelling
 *     all of them collides at any width an iframe is likely to get. So only the
 *     three largest are labelled, and each is placed on the side of its dot with
 *     room, which is decided from the dot's own position rather than by hand.
 *   - **A faint graticule.** Not a border, and it asserts none: evenly spaced
 *     rules give the eye something to read position against, which is what makes
 *     the field read as a plotted space rather than as a decorative panel.
 *   - **Density is carried by fill depth as well as by area.** Two encodings of
 *     one value, which is redundant on purpose — area is hard to judge at small
 *     sizes and depth survives being small.
 *
 * The map is still paired with a ranked list, and the list still carries every
 * figure. That is what makes the whole block readable without the graphic, rather
 * than needing a text alternative bolted on.
 */

/**
 * Dot radii, as a fraction of the field's width so they hold at any rendered
 * size. Area is what the eye reads as quantity, so the count is mapped through a
 * square root: a city with four times the companies gets twice the radius, not
 * four times.
 */
const RADIUS_MIN_RATIO = 0.02;
const RADIUS_MAX_RATIO = 0.075;

function radiusFor(companies: number, peak: number, width: number): number {
  const min = width * RADIUS_MIN_RATIO;
  const max = width * RADIUS_MAX_RATIO;
  if (peak <= 1) return min;
  const share = Math.sqrt(companies / peak);
  return min + (max - min) * share;
}

/**
 * Fill depth by share of the peak, on the same teal ramp the charts use.
 *
 * Classed rather than computed as an opacity, so the depth comes from the token
 * ramp and a city at the bottom of the scale is still a solid mark rather than a
 * ghost. Tier-2 cities keep their outlined treatment regardless — that distinction
 * is categorical, it has to survive greyscale, and it is carried by form.
 */
function fillFor(companies: number, peak: number): string {
  const share = peak > 0 ? companies / peak : 0;
  if (share >= 0.66) return "fill-accent-teal";
  if (share >= 0.25) return "fill-teal-400";
  return "fill-teal-300";
}

/** How many cities get a label drawn on the field itself. */
const LABELLED = 3;

export function CityMap({ map }: { map: MapBlock }) {
  const plotted = map.cities.filter((city) => city.point !== null);
  const ranked = map.cities.slice(0, 8);
  const tier2Count = map.cities.filter((city) => !city.tier1).length;

  if (map.cities.length === 0) {
    return (
      <p className="max-w-measure text-base text-text-muted">
        We hold no India locations for {map.industry} yet, so there is nothing to
        map.
      </p>
    );
  }

  const summary = `${map.industry} GCC locations across India. ${plotted
    .slice(0, 3)
    .map((city) => `${city.city}, ${formatCount(city.companies)}`)
    .join("; ")}${plotted.length > 3 ? `; and ${plotted.length - 3} more cities` : ""}. The ranked list beside this map carries every figure.`;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid items-start gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* The teal tint rather than grey-50, and no border. The map band sits on
            `surface`, so the plotting field needs to be a distinguishable ground
            for the dots to sit on — a neutral grey panel with an outline read as an
            unstyled box left over from a wireframe. */}
        <div className="bg-surface-tint p-6">
          <svg
            viewBox={`0 0 ${map.width} ${map.height}`}
            role="img"
            aria-label={summary}
            // Wider than before and bounded in both axes: an industry with two
            // cities would otherwise leave a tall column of nothing, and one with
            // thirty would grow past the list beside it.
            className="mx-auto block h-auto max-h-[28rem] w-full"
          >
            {/* A graticule, not a boundary. Evenly spaced rules over the whole
                field, asserting nothing about where anything begins or ends —
                they exist so the eye has something to read position against. */}
            <g aria-hidden="true" className="stroke-border-strong" opacity="0.5">
              {[0.25, 0.5, 0.75].map((fraction) => (
                <line
                  key={`v${fraction}`}
                  x1={map.width * fraction}
                  y1={0}
                  x2={map.width * fraction}
                  y2={map.height}
                  strokeWidth={map.width * 0.002}
                  strokeDasharray={`${map.width * 0.008} ${map.width * 0.012}`}
                />
              ))}
              {[0.25, 0.5, 0.75].map((fraction) => (
                <line
                  key={`h${fraction}`}
                  x1={0}
                  y1={map.height * fraction}
                  x2={map.width}
                  y2={map.height * fraction}
                  strokeWidth={map.width * 0.002}
                  strokeDasharray={`${map.width * 0.008} ${map.width * 0.012}`}
                />
              ))}
            </g>

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
                  // outlined. A difference in form, not in hue: this palette
                  // cannot separate two meanings by colour, and a
                  // fill-versus-outline distinction survives greyscale and colour
                  // blindness.
                  className={
                    city.tier1
                      ? `${fillFor(city.companies, map.peak)} stroke-accent-teal`
                      : "fill-transparent stroke-accent-teal"
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
              const gap = radius + map.width * 0.02;
              return (
                <text
                  key={`label-${city.city}`}
                  x={onLeft ? point.x - gap : point.x + gap}
                  y={point.y}
                  textAnchor={onLeft ? "end" : "start"}
                  dominantBaseline="middle"
                  className="fill-text font-semibold"
                  style={{ fontSize: `${map.width * 0.032}px` }}
                >
                  {city.city}
                  <tspan className="fill-text-muted"> {formatCount(city.companies)}</tspan>
                </text>
              );
            })}
          </svg>

          <div className="mt-5 flex flex-col gap-2 border-t border-border-strong pt-4 text-xs text-text-muted">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="inline-flex items-center gap-2">
                <svg viewBox="0 0 12 12" aria-hidden="true" className="size-3">
                  <circle
                    cx="6"
                    cy="6"
                    r="5"
                    className="fill-accent-teal stroke-accent-teal"
                  />
                </svg>
                Established hub
              </span>
              <span className="inline-flex items-center gap-2">
                <svg viewBox="0 0 12 12" aria-hidden="true" className="size-3">
                  <circle
                    cx="6"
                    cy="6"
                    r="5"
                    className="fill-transparent stroke-accent-teal"
                  />
                </svg>
                Emerging location
              </span>
              <span>Size and depth both track the number of GCCs.</span>
            </div>
            {/* Says what the graphic is and, as importantly, what it is not. No
                national outline is drawn — see the note at the top of this file. */}
            <p>
              Positions are geographically accurate. The grid is a reference, not a
              boundary — no borders are drawn.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <ol className="flex flex-col gap-3">
            {ranked.map((city, index) => {
              const share = map.peak > 0 ? city.companies / map.peak : 0;
              return (
                <li key={city.city} className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="text-sm font-medium text-text">
                      {city.city}
                      {city.tier1 ? null : (
                        <span className="ps-2 text-xs font-regular text-text-muted">
                          emerging
                        </span>
                      )}
                    </span>
                    <span className="text-sm font-semibold text-text tabular-nums">
                      {formatCount(city.companies)}
                    </span>
                  </div>
                  {/* Dropped entirely when the peak is one: every bar would be
                      full width, which reads as "a lot" for a set where every city
                      has a single GCC. */}
                  {map.peak > 1 ? (
                    <BarTrack share={share} emphasis={index === 0} />
                  ) : null}
                </li>
              );
            })}
          </ol>
          {map.peak > 1 ? (
            <div aria-hidden="true" className="h-px w-full bg-border-strong" />
          ) : null}
          {map.cities.length > ranked.length ? (
            <p className="text-xs text-text-muted">
              And {formatCount(map.cities.length - ranked.length)} more{" "}
              {map.cities.length - ranked.length === 1 ? "city" : "cities"}.
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Chip>
              {formatCount(map.cities.length)}{" "}
              {map.cities.length === 1 ? "city" : "cities"}
            </Chip>
            {tier2Count > 0 ? (
              <Chip tone="accent">
                {formatCount(tier2Count)} beyond the established hubs
              </Chip>
            ) : null}
          </div>
        </div>
      </div>

      <Provenance>
        Counted as company presences, so a company in three cities is counted in
        each — the total runs above the number of companies.
        {map.unplotted.length > 0
          ? ` ${map.unplotted.join(", ")} ${map.unplotted.length === 1 ? "is" : "are"} listed but not plotted: we have no mapped position for ${map.unplotted.length === 1 ? "it" : "them"} yet.`
          : ""}
      </Provenance>
    </div>
  );
}
