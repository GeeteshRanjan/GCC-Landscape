import {
  DOT_MAP_HEIGHT,
  DOT_MAP_INDIA_PATH,
  DOT_MAP_VIEWBOX,
  DOT_MAP_WIDTH,
  DOT_MAP_WORLD_PATH,
} from "@/data/dot-world-map";

/**
 * The ask hero's ornament: the world as a staggered field of dots, with India
 * picked out in the action orange.
 *
 * **Two elements, not four thousand.** Each layer is a single `<path>` whose `d`
 * is a run of zero-length subpaths; `stroke-linecap: round` renders each one as a
 * circle. The obvious version — one `<circle>` per dot — would put ~4,200 nodes
 * behind a headline, on a surface whose height is measured and posted to the
 * parent frame on every resize. Two paths cost nothing to lay out.
 *
 * **The geometry is generated at authoring time**, by `scripts/build_dot_map.py`,
 * and imported here as a module constant. Because this subtree is a client
 * component, that string lands in a cached JS chunk rather than being re-sent in
 * the RSC payload of a `force-dynamic` page on every request. Nothing is computed
 * at render, so there is nothing to memoise: the component is a pure function of
 * two frozen strings, and React re-rendering it re-emits the same two nodes.
 *
 * **`vector-effect: non-scaling-stroke` is why dot SIZE is a constant across
 * breakpoints while dot SPACING scales.** Stroke width is then read in device
 * pixels rather than user units, so the tablet map is the same dot at a tighter
 * pitch rather than a shrunken one — which is what keeps India legible as the
 * frame narrows. It also means the radius is set once, in CSS, per breakpoint.
 *
 * Decorative, and everything it conveys is said in words elsewhere on the page:
 * out of the accessibility tree, out of the tab order, and `pointer-events: none`
 * so it cannot take a click meant for the form overlapping it.
 *
 * The two inks, the opacity, the frame and the edge fades all live in
 * `.gcc-hero-map` in `globals.css`, where the contrast measurements that set them
 * are written down beside them.
 */
export function DottedWorldMap() {
  return (
    <svg
      viewBox={DOT_MAP_VIEWBOX}
      width={DOT_MAP_WIDTH}
      height={DOT_MAP_HEIGHT}
      // Anchored to its own right edge, because the right edge is the one that is
      // deliberately cropped by the hero's `overflow-hidden`. `slice` rather than
      // `meet`: the frame is a window onto a larger graphic, not a box the graphic
      // has to fit inside.
      // `slice`, so the frame is a window onto a larger graphic rather than a box
      // the graphic has to fit inside — and so a narrower or shorter band crops
      // instead of shrinking. That is what keeps the dot pitch usable as the
      // viewport narrows: the tablet map is a tighter crop of the same map, not a
      // reduction of it. Centred on both axes, which puts India in the right third
      // of the panel at every crop the generated window allows.
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      strokeLinecap="round"
      className="gcc-hero-map__svg"
      aria-hidden="true"
      focusable="false"
    >
      <path className="gcc-hero-map__world" d={DOT_MAP_WORLD_PATH} />
      <path className="gcc-hero-map__india" d={DOT_MAP_INDIA_PATH} />
    </svg>
  );
}
