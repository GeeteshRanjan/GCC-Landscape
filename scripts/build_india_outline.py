#!/usr/bin/env python3
"""Generate the city map's India outline as SVG paths, at authoring time.

Why this exists at all
----------------------
Invariant 8 forbids a hand-authored or approximated India outline on the density
map, and it always did — India's borders are contested, and a traced silhouette
states a border position the tool has no business stating, under ANSR's brand, in
front of the client's own prospects. What it always ALLOWED is the version that is
not a guess: *"A verified, licensed outline may be added behind `projectCity` if
one is ever sourced."*

One is sourced. `scripts/build_dot_map.py` already cuts the ask hero's dotted
silhouette out of **Natural Earth's India point-of-view admin-0 set**
(`ne_10m_admin_0_countries_ind`), which is public domain and whose point of view is
stated rather than implied. That is the most defensible position available: the
claim drawn is India's own, under India's brand. It is not a neutral one — there is
no neutral rendering of a contested boundary — which is why the hero's silhouette is
already on the list for ANSR's sign-off, and why this outline joins the same item
rather than opening a second one.

Two consequences follow, and they are the whole reason this is one script reading
one file rather than a convenient outline from anywhere:

  - **Same dataset as the hero.** A default-view outline here beside an India-view
    silhouette there would have the tool drawing two different Indias on two
    screens of the same page.
  - **The frame had to grow, and that was a correctness fix rather than a
    composition one.** `geo.ts` framed the field at 67–90°E and 7.5–32°N, which is
    fine for plotting dots — every GCC city is inside it — and draws an India with
    no northeast past 90°E and no Ladakh past 32°N. An outline clipped there is a
    boundary claim by omission, and a considerably worse one than the map was
    avoiding by drawing nothing. The frame now contains the whole of India's own
    extent (68.1–97.4°E, 6.8–37.1°N) with margin.

Why a script and not a runtime computation
------------------------------------------
The source is 13 MB and India alone is 8,474 vertices across 35 polygons. Shipping
that to a browser to draw a background graphic, or simplifying it on every cold
start of a `force-dynamic` page, are both the wrong trade. It is projected and
simplified once, here, and the OUTPUT is committed: two path strings in
`src/data/india-outline.ts`.

The source file is cached under `.cache/` (gitignored, public domain,
re-downloadable) and shared with `build_dot_map.py`.

Run:  python3 scripts/build_india_outline.py
"""

from __future__ import annotations

import json
import math
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
OUT = ROOT / "src" / "data" / "india-outline.ts"

COUNTRY = "IND"

# ---------------------------------------------------------------------------
# The frame, and it must stay byte-identical to `FRAME` in `src/data/geo.ts`.
#
# The two cannot import from each other — one is Python and one is TypeScript — so
# the generated file EXPORTS the frame it was projected with and a unit test
# asserts `geo.ts` still agrees. That is the only guard that matters: if the frame
# moves on one side and not the other, every dot lands in the wrong place on a
# correctly drawn country, which looks like a data error rather than a frame error.
#
# Chosen to contain India's own extent with margin, not fitted to it. A frame
# fitted to the outline would put Kanyakumari and Ladakh hard against the edges,
# and a frame fitted to whichever CITIES an industry happens to occupy is the thing
# invariant 8's note explicitly rules out — a fixed frame is what makes a thin
# industry look thin.
# ---------------------------------------------------------------------------
MIN_LAT, MAX_LAT = 5.0, 38.5
MIN_LON, MAX_LON = 66.0, 99.0
STANDARD_PARALLEL = 21.75

MAP_HEIGHT = 500
LON_SCALE = math.cos(math.radians(STANDARD_PARALLEL))
MAP_WIDTH = round(
    (MAP_HEIGHT * (MAX_LON - MIN_LON) * LON_SCALE) / (MAX_LAT - MIN_LAT)
)

# ---------------------------------------------------------------------------
# How much detail survives.
#
# Both numbers are in USER UNITS of the projected box, not degrees, because what
# matters is what the renderer can resolve. The field is ~457x500 units and renders
# somewhere between ~300 and ~560 CSS px wide, so a unit is roughly a pixel.
#
# TOLERANCE is the Douglas-Peucker band: a vertex whose removal moves the line by
# less than this is dropped. 0.7 units is under a rendered pixel at the widest this
# field gets, and it takes India from 8,474 vertices to 725 — an 8.5 KB path string
# instead of a 100 KB one. It is deliberately NOT tuned tighter: a coastline drawn
# at more precision than the display can resolve is bytes in a visitor's bundle
# buying nothing, and this is a ground for real data rather than a cartographic
# product. Tighter was measured — 0.5 costs 3 KB more for 281 vertices no one can
# see.
#
# MIN_SPAN is the line between "draw this polygon" and "mark it with a dot". Below
# it a polygon is smaller than the stroke that would draw it, so an outline renders
# as an indistinct smudge — and Lakshadweep's atolls are an order of magnitude
# below it. The dot pass is the same answer `build_dot_map.py` reached for the
# hero's islands, and for the same reason: these are Indian territory, and a
# silhouette that omits them draws a claim about India smaller than India's own.
# ---------------------------------------------------------------------------
TOLERANCE = 0.7
MIN_SPAN = 2.5


def download() -> None:
    if SOURCE_FILE.exists():
        return
    CACHE.mkdir(exist_ok=True)
    print(f"downloading {SOURCE_URL}", file=sys.stderr)
    urllib.request.urlretrieve(SOURCE_URL, SOURCE_FILE)


def project(lon: float, lat: float) -> tuple[float, float]:
    """Equirectangular with the longitude span corrected at the standard parallel.

    Identical arithmetic to `projectCity` in `src/data/geo.ts`, which is what makes
    a city dot land on the right part of the country.
    """
    return (
        ((lon - MIN_LON) / (MAX_LON - MIN_LON)) * MAP_WIDTH,
        # Latitude increases north, y increases downward.
        ((MAX_LAT - lat) / (MAX_LAT - MIN_LAT)) * MAP_HEIGHT,
    )


def simplify(points: list[tuple[float, float]], tolerance: float):
    """Douglas-Peucker, iterative.

    Iterative rather than recursive because the mainland ring is 7,498 points and a
    pathological split order would blow the interpreter's stack — which would show
    up as a crash in a build script months from now rather than as anything anyone
    could read.
    """
    if len(points) < 3:
        return points

    keep = [False] * len(points)
    keep[0] = keep[-1] = True
    stack = [(0, len(points) - 1)]

    while stack:
        first, last = stack.pop()
        if last <= first + 1:
            continue
        ax, ay = points[first]
        bx, by = points[last]
        dx, dy = bx - ax, by - ay
        span = math.hypot(dx, dy)

        worst, worst_at = -1.0, first
        for i in range(first + 1, last):
            px, py = points[i]
            if span == 0:
                distance = math.hypot(px - ax, py - ay)
            else:
                # Perpendicular distance from the point to the chord.
                distance = abs(dy * (px - ax) - dx * (py - ay)) / span
            if distance > worst:
                worst, worst_at = distance, i

        if worst > tolerance:
            keep[worst_at] = True
            stack.append((first, worst_at))
            stack.append((worst_at, last))

    return [p for p, k in zip(points, keep) if k]


def num(v: float) -> str:
    """One decimal. A tenth of a unit is a tenth of a pixel."""
    s = f"{v:.1f}"
    return s[:-2] if s.endswith(".0") else s


def ring_path(points: list[tuple[float, float]]) -> str:
    head = f"M{num(points[0][0])} {num(points[0][1])}"
    rest = "".join(f"L{num(x)} {num(y)}" for x, y in points[1:])
    return f"{head}{rest}Z"


def main() -> int:
    download()
    data = json.loads(SOURCE_FILE.read_text())

    feature = next(
        (f for f in data["features"] if f["properties"].get("ADM0_A3") == COUNTRY),
        None,
    )
    if feature is None:
        print(f"no feature for {COUNTRY}", file=sys.stderr)
        return 1

    geometry = feature["geometry"]
    polygons = (
        geometry["coordinates"]
        if geometry["type"] == "MultiPolygon"
        else [geometry["coordinates"]]
    )

    outline_rings: list[str] = []
    marks: list[tuple[float, float]] = []
    source_vertices = 0
    kept_vertices = 0

    for polygon in polygons:
        # Every ring of the polygon, projected. Ring 0 is the exterior; any others
        # are holes, which `fill-rule: evenodd` resolves for free once they are in
        # the same path.
        projected = [
            [project(point[0], point[1]) for point in ring] for ring in polygon
        ]
        source_vertices += sum(len(ring) for ring in projected)

        exterior = projected[0]
        xs = [x for x, _ in exterior]
        ys = [y for _, y in exterior]
        span = max(max(xs) - min(xs), max(ys) - min(ys))

        if span < MIN_SPAN:
            # Too small for a stroke to describe. One dot, at the ring's centroid,
            # which for an island this size is inside it by construction.
            marks.append((sum(xs) / len(xs), sum(ys) / len(ys)))
            continue

        for ring in projected:
            simplified = simplify(ring, TOLERANCE)
            # A ring reduced below a triangle has no area left to draw.
            if len(simplified) < 3:
                continue
            kept_vertices += len(simplified)
            outline_rings.append(ring_path(simplified))

    outline = "".join(outline_rings)
    # The hero's trick: a zero-length subpath renders as a filled circle under
    # `stroke-linecap: round`, so every island is one element rather than 23.
    mark_path = "".join(f"M{num(x)} {num(y)}h0" for x, y in marks)

    body = f'''/**
 * India's outline for the Screen 1 density map, as SVG paths.
 *
 * GENERATED — do not edit. `python3 scripts/build_india_outline.py` rewrites this
 * file from Natural Earth's India point-of-view admin-0 set; that script carries
 * the reasoning, the licence position, and why invariant 8 permits this.
 *
 * The projection is the one in `src/data/geo.ts`, so a city plotted by
 * `projectCity` lands on the right part of the country. `INDIA_OUTLINE_FRAME`
 * below is exported for exactly that reason: it is what `geo.ts` is asserted
 * against, because a frame that moves on one side only puts every dot in the
 * wrong place on a correctly drawn country.
 *
 * {len(outline_rings)} rings at {kept_vertices:,} vertices, down from {source_vertices:,} at a {num(TOLERANCE)}-unit
 * tolerance, plus {len(marks)} islands too small for a stroke to describe.
 */

/** The frame this was projected in. Asserted against `geo.ts`. */
export const INDIA_OUTLINE_FRAME = {{
  minLat: {MIN_LAT},
  maxLat: {MAX_LAT},
  minLon: {MIN_LON},
  maxLon: {MAX_LON},
  standardParallel: {STANDARD_PARALLEL},
  width: {MAP_WIDTH},
  height: {MAP_HEIGHT},
}} as const;

/**
 * The mainland and every island large enough to draw, as one path.
 *
 * Interior rings are in the same path deliberately: `fill-rule: evenodd` resolves
 * them as holes, so nothing has to know which rings are which.
 */
export const INDIA_OUTLINE_PATH =
  "{outline}";

/**
 * The {len(marks)} islands below the stroke's own width — most of Lakshadweep, and the
 * smaller Nicobars. Zero-length subpaths, drawn as dots by `stroke-linecap: round`.
 *
 * They are here rather than dropped because they are Indian territory: an outline
 * that omits them draws a claim about India smaller than India's own, which is the
 * failure the point-of-view dataset was chosen to avoid.
 */
export const INDIA_ISLAND_MARKS =
  "{mark_path}";
'''

    OUT.write_text(body)
    print(
        f"wrote {OUT.relative_to(ROOT)}: "
        f"{MAP_WIDTH}x{MAP_HEIGHT} frame, {len(outline_rings)} rings, "
        f"{kept_vertices} vertices (from {source_vertices}), "
        f"{len(marks)} island marks, {len(outline) + len(mark_path)} path chars"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
