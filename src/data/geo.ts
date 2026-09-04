/**
 * Where the taxonomy's cities are, so the Screen 1 density view can be a map
 * rather than a bar chart.
 *
 * Two decisions worth recording, because both were deliberate:
 *
 *   1. **The table below is the source, and the dataset may only OVERLAY it.**
 *      Coordinates are geographic fact rather than company data — an admin has no
 *      reason to edit a city's latitude, and a dataset that owned every position
 *      outright would let the taxonomy editor move Bengaluru by typing. What the
 *      dataset can supply is the one thing this file cannot: where a city added
 *      after the seed actually is. `taxonomy.cityCoordinates` is that, and
 *      `projectCity` reads it as an overlay on the cities below.
 *
 *      The overlay takes PRECEDENCE, so a coordinate that turns out to be wrong is
 *      correctable without a deploy — but it is a correction path and not a second
 *      home for geography, because the table is still the answer for every city the
 *      overlay says nothing about, which today is all of them.
 *
 *      A city with no coordinate on either side is listed without a dot, which is
 *      visible and fixable, rather than being plotted somewhere invented. There is
 *      no fallback position and no centre-of-India default: a dot is a claim about
 *      where a company is, and a guessed one is a wrong claim drawn at full
 *      confidence.
 *
 *   2. **The outline is generated from a licensed source, never hand-authored.**
 *      Invariant 8 has always forbidden a traced or approximated India — a guess
 *      at a contested boundary, drawn under ANSR's brand — and has always allowed
 *      "a verified, licensed outline ... if one is ever sourced". One is:
 *      `scripts/build_india_outline.py` cuts it out of Natural Earth's India
 *      point-of-view admin-0 set, the same public-domain file the ask hero's
 *      dotted silhouette comes from, and writes `src/data/india-outline.ts`. Same
 *      dataset as the hero on purpose: two different Indias on two screens of one
 *      page is the failure that would be hardest to defend.
 *
 *      **That is why the frame below is what it is.** It used to run to 90°E and
 *      32°N, which contains every GCC city and therefore looked correct — and cuts
 *      off the northeast and Ladakh. Fine while nothing was drawn; a boundary claim
 *      by omission the moment something is. The frame now contains India's whole
 *      extent (68.1–97.4°E, 6.8–37.1°N) with margin.
 *
 * Values are the conventional city-centre coordinates, to two decimals — about a
 * kilometre, which is far finer than a dot on a 440-unit-wide field can express.
 */

/**
 * Declared here rather than imported from `schema.ts`, which infers the same shape
 * from `latLonSchema`.
 *
 * The two are structurally identical, so the dataset's coordinates satisfy this
 * without a conversion — and the duplication is what keeps this module free of zod.
 * `city-map.tsx` is a client component and imports `MAP_WIDTH` from here, so an
 * import of the schema would put the whole validation layer in the browser bundle to
 * buy two numbers a name.
 */
export interface LatLon {
  /** Degrees north. */
  lat: number;
  /** Degrees east. */
  lon: number;
}

/**
 * Keyed by the exact `taxonomy.cities` value. "Delhi NCR" is a region rather than
 * a city — it stands in for Gurgaon, Noida and Delhi, the same compromise
 * `TIER1_CITIES` in derive.ts makes — so it is plotted at Delhi.
 *
 * **The seed spells it "NCR" and the alias in `normalize.ts` is what makes the two
 * agree.** The name here is the one a visitor and an admin read, so it must be the
 * published string; a re-import that reintroduced the bare abbreviation would leave
 * the city counted, ranked and listed with no dot, which is the one failure mode this
 * table's own contract calls out.
 */
export const CITY_COORDINATES: Readonly<Record<string, LatLon>> = {
  Ahmedabad: { lat: 23.03, lon: 72.58 },
  Aurangabad: { lat: 19.88, lon: 75.34 },
  Bengaluru: { lat: 12.97, lon: 77.59 },
  Bhubaneswar: { lat: 20.3, lon: 85.82 },
  Chandigarh: { lat: 30.73, lon: 76.78 },
  Chennai: { lat: 13.08, lon: 80.27 },
  Coimbatore: { lat: 11.02, lon: 76.96 },
  "Delhi NCR": { lat: 28.61, lon: 77.21 },
  Goa: { lat: 15.49, lon: 73.83 },
  Guntur: { lat: 16.31, lon: 80.44 },
  Hyderabad: { lat: 17.39, lon: 78.49 },
  Indore: { lat: 22.72, lon: 75.86 },
  Jaipur: { lat: 26.91, lon: 75.79 },
  Khopoli: { lat: 18.79, lon: 73.34 },
  Kochi: { lat: 9.93, lon: 76.27 },
  Kolkata: { lat: 22.57, lon: 88.36 },
  Madurai: { lat: 9.93, lon: 78.12 },
  Malappuram: { lat: 11.07, lon: 76.07 },
  Mangaluru: { lat: 12.91, lon: 74.86 },
  Mohali: { lat: 30.7, lon: 76.72 },
  Mumbai: { lat: 19.08, lon: 72.88 },
  Mysuru: { lat: 12.3, lon: 76.64 },
  Nagpur: { lat: 21.15, lon: 79.09 },
  "Navi Mumbai": { lat: 19.03, lon: 73.03 },
  Pune: { lat: 18.52, lon: 73.86 },
  Salem: { lat: 11.66, lon: 78.15 },
  Surat: { lat: 21.17, lon: 72.83 },
  Tirupati: { lat: 13.63, lon: 79.42 },
  Trivandrum: { lat: 8.52, lon: 76.94 },
  Vadodara: { lat: 22.31, lon: 73.18 },
  Vishakhapatnam: { lat: 17.69, lon: 83.22 },
};

/**
 * The plotted field, in degrees. Wider than the cities' own extent on purpose:
 * fitting the box to whichever cities a given industry happens to occupy would
 * make one industry's two cities fill the frame and imply national spread. A
 * fixed frame means a thin industry looks thin, which is the honest reading.
 *
 * **It must stay byte-identical to `INDIA_OUTLINE_FRAME`**, which is generated
 * beside the outline path from the same numbers. They cannot import from each
 * other — one side is a Python script — so `tests/unit/screen1.test.ts` asserts
 * they agree. A frame that moves here and not there puts every city dot in the
 * wrong place on a correctly drawn country, which reads as a data error.
 *
 * The southern margin is deliberately generous: India's own extent reaches 6.75°N
 * at Great Nicobar, and the island marks have to sit inside the box rather than on
 * its edge.
 */
export const MAP_FRAME = {
  minLat: 5,
  maxLat: 38.5,
  minLon: 66,
  maxLon: 99,
} as const;

/**
 * Where the longitude scale is true. Mid-frame.
 *
 * Exported for the same reason `MAP_FRAME` is: it is half of the projection the
 * generated outline was drawn with, so it is part of this module's contract rather
 * than an internal.
 */
export const MAP_STANDARD_PARALLEL = 21.75;

const FRAME = MAP_FRAME;
const STANDARD_PARALLEL = MAP_STANDARD_PARALLEL;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

/**
 * Equirectangular, with the longitude span corrected at the standard parallel so
 * the country is not stretched sideways. Sized from that correction rather than
 * picked, which is why the numbers below are derived and not chosen.
 */
const LON_SCALE = Math.cos(toRadians(STANDARD_PARALLEL));

/** Viewport height in user units; width follows from the projection. */
export const MAP_HEIGHT = 500;
export const MAP_WIDTH = Math.round(
  (MAP_HEIGHT * (FRAME.maxLon - FRAME.minLon) * LON_SCALE) /
    (FRAME.maxLat - FRAME.minLat),
);

export interface Point {
  x: number;
  y: number;
}

/**
 * City name to a point in the `MAP_WIDTH` x `MAP_HEIGHT` box, or null when the
 * city has no recorded coordinate. Null is a real outcome, not a bug: admin can
 * add a city to the taxonomy at any time, and the caller lists it without a dot.
 *
 * `overlay` is `taxonomy.cityCoordinates`, and it is OPTIONAL rather than required
 * for a reason beyond call-site convenience: the projection is also what the
 * generated outline was drawn with and what several tests reason about, none of
 * which have a dataset in hand. A caller with no overlay gets the seeded table,
 * which is what this function has always returned.
 *
 * Resolution order is overlay, then table, then null — the precedence argued for at
 * the top of this file. Read as `??` on the lookup rather than as a merged object so
 * a dataset carrying an empty `cityCoordinates`, which is every dataset today, does
 * no work per city.
 */
export function projectCity(
  city: string,
  overlay?: Readonly<Record<string, LatLon>>,
): Point | null {
  const at = overlay?.[city] ?? CITY_COORDINATES[city];
  if (!at) return null;
  return {
    x:
      ((at.lon - FRAME.minLon) / (FRAME.maxLon - FRAME.minLon)) * MAP_WIDTH,
    // Latitude increases north, y increases downward.
    y:
      ((FRAME.maxLat - at.lat) / (FRAME.maxLat - FRAME.minLat)) * MAP_HEIGHT,
  };
}
