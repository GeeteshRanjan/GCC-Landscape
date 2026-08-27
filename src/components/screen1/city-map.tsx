import type { MapBlock } from "@/data/screen1";
import { Chip, formatCount, Provenance } from "@/components/public/primitives";

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
 * The map is paired with a ranked list rather than labelled in place. Two reasons:
 * six of the seven tier-1 cities cluster tightly enough that in-place labels
 * collide at any width an iframe is likely to get, and a list carries the exact
 * figures the map can only imply — which also makes the whole block readable
 * without the graphic, rather than needing a text alternative bolted on.
 */

/**
 * Dot radii, as a fraction of the field's width so they hold at any rendered
 * size. Area is what the eye reads as quantity, so the count is mapped through a
 * square root: a city with four times the companies gets twice the radius, not
 * four times.
 */
const RADIUS_MIN_RATIO = 0.014;
const RADIUS_MAX_RATIO = 0.068;

function radiusFor(companies: number, peak: number, width: number): number {
  const min = width * RADIUS_MIN_RATIO;
  const max = width * RADIUS_MAX_RATIO;
  if (peak <= 1) return min;
  const share = Math.sqrt(companies / peak);
  return min + (max - min) * share;
}

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
      <div className="grid items-start gap-8 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <div className="bg-surface-subtle p-6">
          <svg
            viewBox={`0 0 ${map.width} ${map.height}`}
            role="img"
            aria-label={summary}
            // Bounded in both axes: an industry with two cities would otherwise
            // leave a 500-unit column of nothing, and one with thirty would grow
            // past the list beside it.
            className="mx-auto block h-auto max-h-96 w-full max-w-sm"
          >
            {plotted.map((city) => {
              const point = city.point!;
              const radius = radiusFor(city.companies, map.peak, map.width);
              return (
                <circle
                  key={city.city}
                  cx={point.x}
                  cy={point.y}
                  r={radius}
                  // Tier-1 is filled, tier-2 is outlined. A difference in form,
                  // not in hue: this palette cannot separate two meanings by
                  // colour, and a fill-versus-outline distinction survives
                  // greyscale and colour blindness.
                  className={
                    city.tier1
                      ? "fill-accent-teal/70 stroke-accent-teal"
                      : "fill-transparent stroke-accent-teal"
                  }
                  strokeWidth={map.width * 0.004}
                >
                  <title>{`${city.city}: ${formatCount(city.companies)}`}</title>
                </circle>
              );
            })}
          </svg>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs text-text-muted">
            <span className="inline-flex items-center gap-2">
              <svg viewBox="0 0 12 12" aria-hidden="true" className="size-3">
                <circle
                  cx="6"
                  cy="6"
                  r="5"
                  className="fill-accent-teal/70 stroke-accent-teal"
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
            <span>Dot area is proportional to the number of GCCs.</span>
            {/* Says what the graphic is and, as importantly, what it is not. No
                national outline is drawn — see the note at the top of this file. */}
            <span className="basis-full text-center">
              Positions are geographically accurate. No borders are drawn.
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <ol className="flex flex-col gap-3">
            {ranked.map((city) => {
              const share = map.peak > 0 ? (city.companies / map.peak) * 100 : 0;
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
                  {/* The bar restates the figure beside it, so it carries no
                      information of its own and is hidden from assistive
                      technology rather than announced twice.

                      Dropped entirely when the peak is one: every bar would be
                      full width, which reads as "a lot" for a set where every
                      city has a single GCC. */}
                  {map.peak > 1 ? (
                    <div
                      aria-hidden="true"
                      className="h-1.5 w-full bg-surface-sunken"
                    >
                      <div
                        className="h-full bg-accent-teal"
                        style={{ width: `${Math.max(share, 1)}%` }}
                      />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ol>
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
        Counted as company presences, so a company operating in three cities is
        counted in each — the total runs above the number of companies.
        {map.unplotted.length > 0
          ? ` ${map.unplotted.join(", ")} ${map.unplotted.length === 1 ? "is" : "are"} listed but not plotted: we have no mapped position for ${map.unplotted.length === 1 ? "it" : "them"} yet.`
          : ""}
      </Provenance>
    </div>
  );
}
