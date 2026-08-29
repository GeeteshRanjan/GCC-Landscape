#!/usr/bin/env python3
"""Generate the ask hero's dotted world map as two SVG paths, at authoring time.

Why a script and not a runtime computation
------------------------------------------
Point-in-polygon over Natural Earth's 10m admin-0 set is ~600k coordinates and a
few seconds of CPU. Doing it in the browser would ship a megabyte of geometry to
a visitor for a decorative background; doing it on the server would spend that
CPU on every cold start of a page that is already `force-dynamic`. So it is done
once, here, and the OUTPUT is committed: two path strings in
`src/data/dot-world-map.ts`, imported by a client component and therefore living
in a cached JS chunk rather than in the RSC payload.

Why one dataset and not two
---------------------------
The world layer and the India layer are cut from the SAME file. Mixing a
default-view world with an India-view India would paint the disputed strip orange
while the neighbour's own polygon still claimed it — two dot layers overlapping at
exactly the most sensitive boundary on the map. One source makes that impossible.

**The file is Natural Earth's India point-of-view edition**
(`ne_10m_admin_0_countries_ind`), which is a full world dataset drawn as India
states its own boundaries. A dotted silhouette IS a boundary claim, so there is no
neutral option here — see `.tastemaker/style-lock.md` for the decision and its
standing with invariant 8, which governs the city map and is deliberately not
relaxed by this.

Natural Earth is public domain (no attribution required, none implied). The file
is ~13 MB and is NOT committed: it is cached under `.cache/` (gitignored) and
re-downloaded if absent.

Run:  python3 scripts/build_dot_map.py
"""

from __future__ import annotations

import json
import math
import os
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / ".cache"
SOURCE_URL = (
    "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/"
    "geojson/ne_10m_admin_0_countries_ind.geojson"
)
SOURCE_FILE = CACHE / "ne_10m_admin_0_countries_ind.geojson"
OUT = ROOT / "src" / "data" / "dot-world-map.ts"

HIGHLIGHT = "IND"

# ---------------------------------------------------------------------------
# Frame
#
# Equirectangular, so x is longitude and y is latitude and the two layers align
# by construction.
#
# **The frame is a WINDOW on the world, not the whole of it, and the window is
# what makes every other number here work.** Three requirements fight each other:
# a dot has to be ~1.5px to be seen at all, India's dots have to be spaced far
# enough apart to read as dots rather than as a blob, and the graphic has to fit
# in the right half of a hero. Drawn to the full 360°, India is ~70px tall in that
# panel and its dots merge — the silhouette becomes an orange smudge. So the frame
# is 219° wide, and India lands about seven tenths across it.
#
# The window is asymmetric about India on purpose: it reaches 154° west of India's
# centre and 65° east, which puts India in the right third of the panel — clear of
# the headline, which is centred and capped — while still showing the Atlantic and
# the eastern edge of the Americas on the far left, where the mask fades them out.
# Everything east of ~119°E falls in the slice of the panel that hangs past the
# viewport and is cropped, which is where the eastern Pacific belongs anyway.
#
# Antarctica is dropped and the poles are outside the window: at this dot spacing
# an equirectangular Arctic is stretched noise.
# ---------------------------------------------------------------------------
LON_MIN, LON_MAX = -71.0, 148.0
LAT_MIN, LAT_MAX = -34.0, 75.0

# Dot spacing, in degrees. India's grid is finer, which is the whole reason the
# silhouette survives at a size that is not oversized. The world grid is sparse
# because it is ornament behind a headline.
#
# **The ratio of pitch to DOT SIZE is the only number that matters here, and it is
# what "finer" means.** Both are set together, in two files: the step here, and the
# `stroke-width` in `.gcc-hero-map`, which is read in device pixels because the
# paths carry `non-scaling-stroke`. A step change alone does not refine anything —
# it just crowds the same dots, and past a ratio of about 0.6 the field fills in and
# stops being made of dots at all.
#
# The panel was widened from 60% to 74% of the hero, which raised the desktop scale
# from ~3.9 to ~4.9px per degree. Held at the old steps that would have SPREAD the
# field: same dots, more space between them. So both steps came down further than
# the rescale alone required, and both dot radii came down with them:
#
#   world:  1.15° -> ~6.2px pitch against a ~2.5px dot   (ratio 0.40)
#   India:  0.75° -> ~4.0px pitch against a ~1.9px dot   (ratio 0.46)
#
# Those are the figures at the 82% panel. The CSS side is `vw`-proportional rather
# than fixed precisely so the two ratios hold at every width the map renders at — a
# fixed radius made the graphic correct only at whatever width it was last read at.
#
# **The two dot RADII are now equal, at ANSR's request, and that is what moved the
# world step.** The layers used to be drawn at two sizes — a larger dot on the sparse
# world grid, a smaller one on India's finer grid — which held both ratios near 0.4
# but made the ground's dots visibly bigger than the subject's. One size across both
# layers is a defensible request and it costs exactly one thing: at the old 1.15° the
# world field dropped to a ratio of ~0.32 and read thin, which the deeper vignette
# would have made worse. So the world grid comes in to 1.0° to buy the density back
# from spacing instead of from size:
#
#   world:  1.0°  -> ~5.9px pitch against a ~2.2px dot   (ratio 0.37)
#   India:  0.75° -> ~4.4px pitch against a ~2.2px dot   (ratio 0.49)
#
# India is still the denser layer, which is the whole point — it has to read as a
# silhouette rather than as texture, and with the dot size no longer distinguishing
# them the pitch is the only thing left that does. It costs ~2,700 more world dots,
# which is ~30% on a path string that lives in a cached chunk.
WORLD_STEP = 1.0
INDIA_STEP = 0.75


def download() -> None:
    if SOURCE_FILE.exists():
        return
    CACHE.mkdir(exist_ok=True)
    print(f"downloading {SOURCE_URL}", file=sys.stderr)
    urllib.request.urlretrieve(SOURCE_URL, SOURCE_FILE)


def rings_of(geometry: dict) -> list[list[list[float]]]:
    """Flatten a geometry into a list of polygons, each a list of rings."""
    kind = geometry["type"]
    coords = geometry["coordinates"]
    if kind == "Polygon":
        return [coords]
    if kind == "MultiPolygon":
        return list(coords)
    return []


class Polygon:
    __slots__ = ("rings", "x0", "y0", "x1", "y1")

    def __init__(self, rings: list[list[list[float]]]) -> None:
        self.rings = rings
        xs = [p[0] for ring in rings for p in ring]
        ys = [p[1] for ring in rings for p in ring]
        self.x0, self.x1 = min(xs), max(xs)
        self.y0, self.y1 = min(ys), max(ys)

    def contains(self, x: float, y: float) -> bool:
        if not (self.x0 <= x <= self.x1 and self.y0 <= y <= self.y1):
            return False
        # Even-odd crossing count over every ring of the polygon at once, which is
        # what makes holes fall out for free: an interior ring flips the parity
        # back, so a point in a lake is outside.
        inside = False
        for ring in self.rings:
            n = len(ring)
            j = n - 1
            for i in range(n):
                xi, yi = ring[i][0], ring[i][1]
                xj, yj = ring[j][0], ring[j][1]
                if (yi > y) != (yj > y):
                    if xi + (y - yi) / (yj - yi) * (xj - xi) > x:
                        inside = not inside
                j = i
        return inside


def bin_index(polygons: list[Polygon]) -> dict[int, list[Polygon]]:
    """Bucket polygons by the integer longitudes their bbox spans.

    Without this, every candidate point would be tested against every polygon on
    Earth. With it, a point in the Bay of Bengal is tested against a handful.
    """
    bins: dict[int, list[Polygon]] = {}
    for poly in polygons:
        for b in range(math.floor(poly.x0), math.floor(poly.x1) + 1):
            bins.setdefault(b, []).append(poly)
    return bins


def hit(bins: dict[int, list[Polygon]], x: float, y: float) -> bool:
    for poly in bins.get(math.floor(x), ()):
        if poly.contains(x, y):
            return True
    return False


def representative_point(poly: Polygon) -> tuple[float, float] | None:
    """A point inside a polygon, for one too small to catch a grid row.

    The mean of the outer ring's vertices first, which is inside for any convex or
    near-convex shape and therefore inside for essentially every island. When it is
    not — a crescent atoll, a C-shaped bay — a coarse scan of the bbox finds one.

    Returns None only for a polygon with no interior at any resolution this bothers
    to try, which is a degenerate sliver and correctly left undrawn rather than
    marked at a guessed position.
    """
    ring = poly.rings[0]
    cx = sum(p[0] for p in ring) / len(ring)
    cy = sum(p[1] for p in ring) / len(ring)
    if poly.contains(cx, cy):
        return cx, cy

    span_x = poly.x1 - poly.x0
    span_y = poly.y1 - poly.y0
    steps = 12
    for i in range(1, steps):
        for j in range(1, steps):
            x = poly.x0 + span_x * i / steps
            y = poly.y0 + span_y * j / steps
            if poly.contains(x, y):
                return x, y
    return None


def num(v: float) -> str:
    s = f"{v:.1f}"
    return s[:-2] if s.endswith(".0") else s


def path_of(points: list[tuple[float, float]]) -> str:
    """A zero-length capped subpath per dot, so thousands of dots are ONE element.

    `stroke-linecap: round` renders a zero-length subpath as a filled circle, so
    `h0` after each move is a dot. Six thousand `<circle>` nodes would be the
    obvious version and would put six thousand elements in the layout tree behind
    a headline; this is two.
    """
    return "".join(f"M{num(x)} {num(y)}h0" for x, y in points)


def main() -> int:
    download()
    data = json.loads(SOURCE_FILE.read_text())

    world: list[Polygon] = []
    india: list[Polygon] = []
    for feature in data["features"]:
        props = feature["properties"]
        if props.get("ADM0_A3") == "ATA" or props.get("NAME") == "Antarctica":
            continue
        polys = [Polygon(r) for r in rings_of(feature["geometry"])]
        world.extend(polys)
        if props.get("ADM0_A3") == HIGHLIGHT:
            india.extend(polys)

    if not india:
        print(f"no feature for {HIGHLIGHT}", file=sys.stderr)
        return 1

    world_bins = bin_index(world)
    india_bins = bin_index(india)

    world_points: list[tuple[float, float]] = []
    india_points: list[tuple[float, float]] = []

    def grid(step: float, lo_lon: float, hi_lon: float, lo_lat: float, hi_lat: float):
        """A staggered grid: every other row is offset half a step.

        Staggered rather than square on purpose — a square grid of dots reads as a
        halftone screen laid over a map, a staggered one reads as a field the map
        was cut out of.
        """
        rows = int(round((hi_lat - lo_lat) / step))
        for r in range(rows + 1):
            lat = lo_lat + r * step
            offset = (step / 2) if r % 2 else 0.0
            lon = lo_lon + offset
            while lon <= hi_lon:
                yield lon, lat
                lon += step

    for lon, lat in grid(WORLD_STEP, LON_MIN, LON_MAX, LAT_MIN, LAT_MAX):
        if hit(india_bins, lon, lat):
            continue  # India is drawn by its own, finer pass
        if hit(world_bins, lon, lat):
            world_points.append((lon - LON_MIN, LAT_MAX - lat))

    # Clamped to the window, so a polygon reaching past the frame cannot emit dots
    # the viewBox will never show.
    ib = (
        max(min(p.x0 for p in india), LON_MIN),
        max(min(p.y0 for p in india), LAT_MIN),
        min(max(p.x1 for p in india), LON_MAX),
        min(max(p.y1 for p in india), LAT_MAX),
    )
    for lon, lat in grid(INDIA_STEP, ib[0], ib[2], ib[1], ib[3]):
        if hit(india_bins, lon, lat):
            india_points.append((lon - LON_MIN, LAT_MAX - lat))

    # ------------------------------------------------------------------
    # Every island gets at least one dot.
    #
    # **Why this pass exists.** A 0.75° grid is ~83 km between rows, and the
    # Andaman & Nicobar and Lakshadweep groups are archipelagos of islands mostly
    # narrower than that — so almost none of them contained a grid point, and the
    # map drew India without them. That is not a rendering nicety: they are Indian
    # territory, and a dotted silhouette that omits them is drawing a claim about
    # India smaller than India's own. The map is already sourced from Natural
    # Earth's India point-of-view edition for exactly this reason.
    #
    # **One dot per island, and no more.** Refining the whole India grid until the
    # atolls caught points would have to reach ~0.05°, which is 200x the dots for a
    # subcontinent that already reads correctly — and would draw the island groups
    # heavier than the mainland's coastline. A single dot per polygon marks the
    # territory at the weight it occupies, which is what was asked for.
    #
    # Polygons that the main pass already covered are skipped, so the mainland and
    # the larger islands are untouched by this.
    islands = 0
    for poly in india:
        if not (
            LON_MIN <= poly.x1 and poly.x0 <= LON_MAX
            and LAT_MIN <= poly.y1 and poly.y0 <= LAT_MAX
        ):
            continue
        # Already represented? Cheap bbox test first, then containment.
        if any(
            poly.x0 <= x + LON_MIN <= poly.x1
            and poly.y0 <= LAT_MAX - y <= poly.y1
            and poly.contains(x + LON_MIN, LAT_MAX - y)
            for x, y in india_points
        ):
            continue

        point = representative_point(poly)
        if point is None:
            continue
        lon, lat = point
        if not (LON_MIN <= lon <= LON_MAX and LAT_MIN <= lat <= LAT_MAX):
            continue
        india_points.append((lon - LON_MIN, LAT_MAX - lat))
        islands += 1

    width = LON_MAX - LON_MIN
    height = LAT_MAX - LAT_MIN

    world_path = path_of(world_points)
    india_path = path_of(india_points)

    body = f'''/**
 * The ask hero's dotted world map, as two SVG paths.
 *
 * GENERATED — do not edit. `python3 scripts/build_dot_map.py` rewrites this file
 * from Natural Earth's India point-of-view admin-0 set; that script carries the
 * reasoning for the projection, the dot spacing and the choice of dataset.
 *
 * Equirectangular: one user unit is one degree, x is longitude measured from
 * {num(LON_MIN)}\u00b0 and y is latitude measured down from {num(LAT_MAX)}\u00b0. That is why the two
 * layers align exactly without either of them knowing about the other.
 *
 * Each path is a run of zero-length subpaths, one per dot, drawn as circles by
 * `stroke-linecap: round`. Dots: {len(world_points):,} world, {len(india_points):,} India.
 */

export const DOT_MAP_VIEWBOX = "0 0 {num(width)} {num(height)}";

export const DOT_MAP_WIDTH = {num(width)};
export const DOT_MAP_HEIGHT = {num(height)};

/** Every landmass except India, on a {num(WORLD_STEP)}\u00b0 staggered grid. */
export const DOT_MAP_WORLD_PATH =
  "{world_path}";

/**
 * India alone, on a finer {num(INDIA_STEP)}\u00b0 grid so the silhouette stays readable, plus one
 * dot for each island the grid was too coarse to catch — {islands} of them, which is
 * what puts Andaman & Nicobar and Lakshadweep on the map at all.
 */
export const DOT_MAP_INDIA_PATH =
  "{india_path}";
'''

    OUT.write_text(body)
    print(
        f"wrote {OUT.relative_to(ROOT)}: "
        f"{len(world_points)} world dots, {len(india_points)} India dots "
        f"({islands} of them lone islands), "
        f"{len(world_path) + len(india_path)} path chars"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
