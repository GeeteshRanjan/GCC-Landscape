/**
 * Where the taxonomy's cities are, so the Screen 1 density view can be a map
 * rather than a bar chart.
 *
 * Two decisions worth recording, because both were deliberate:
 *
 *   1. **Coordinates are hardcoded here rather than stored in the dataset.** They
 *      are geographic fact, not company data — an admin has no reason to edit a
 *      city's latitude, and putting them in the dataset would mean the taxonomy
 *      editor could produce a city with a plausible-looking wrong position. A
 *      city added in admin and missing from this table degrades to being listed
 *      without a dot, which is visible and fixable, rather than being plotted
 *      somewhere invented.
 *
 *   2. **No India outline is drawn.** The obvious way to build the brief's
 *      "India map" is an outline path with dots on top, and hand-authoring that
 *      path is exactly the wrong risk to take: India's borders are politically
 *      contested, an approximate trace states a border claim the tool has no
 *      business making, and it would carry ANSR's brand while doing it. So the
 *      map plots real positions on an unbordered field. The dots' relative
 *      geography is accurate and no boundary is asserted. Adding a verified,
 *      licensed outline later is a drop-in behind `projectCity`.
 *
 * Values are the conventional city-centre coordinates, to two decimals — about a
 * kilometre, which is far finer than a dot on a 440-unit-wide field can express.
 */

export interface LatLon {
  /** Degrees north. */
  lat: number;
  /** Degrees east. */
  lon: number;
}

/**
 * Keyed by the exact `taxonomy.cities` value. "NCR" is a region rather than a
 * city — it stands in for Gurgaon, Noida and Delhi, the same compromise
 * `TIER1_CITIES` in derive.ts makes — so it is plotted at Delhi.
 */
export const CITY_COORDINATES: Readonly<Record<string, LatLon>> = {
  Ahmedabad: { lat: 23.03, lon: 72.58 },
  Aurangabad: { lat: 19.88, lon: 75.34 },
  Bengaluru: { lat: 12.97, lon: 77.59 },
  Bhubaneswar: { lat: 20.3, lon: 85.82 },
  Chandigarh: { lat: 30.73, lon: 76.78 },
  Chennai: { lat: 13.08, lon: 80.27 },
  Coimbatore: { lat: 11.02, lon: 76.96 },
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
  NCR: { lat: 28.61, lon: 77.21 },
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
 */
const FRAME = { minLat: 7.5, maxLat: 32, minLon: 67, maxLon: 90 } as const;

/** Where the longitude scale is true. Roughly mid-frame. */
const STANDARD_PARALLEL = 20;

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
 */
export function projectCity(city: string): Point | null {
  const at = CITY_COORDINATES[city];
  if (!at) return null;
  return {
    x:
      ((at.lon - FRAME.minLon) / (FRAME.maxLon - FRAME.minLon)) * MAP_WIDTH,
    // Latitude increases north, y increases downward.
    y:
      ((FRAME.maxLat - at.lat) / (FRAME.maxLat - FRAME.minLat)) * MAP_HEIGHT,
  };
}
