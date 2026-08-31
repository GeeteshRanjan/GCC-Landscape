import type { CloseCopy } from "@/data/schema";
import { cn } from "@/lib/utils";

/**
 * The close, shared by both public result screens: a blurred field of content with the
 * ask floating centred on it.
 *
 * **It is back, at the project owner's decision**, having been removed twice at ANSR's
 * request — Screen 1's on the page-end instruction, Screen 2's in the pass that rebuilt
 * its zones. Both are restored together rather than one at a time: the failure mode this
 * component was extracted to prevent is one screen's close drifting away from the
 * other's, and a close on one screen only is that drift at its largest.
 *
 * It links out and collects nothing — no form, no email field, no visitor input stored
 * anywhere in this codebase. Lead capture is still out of scope by design.
 *
 * **The shape is a paywall overlay, and the blurred layer is SYNTHETIC.** This is the
 * one thing to understand before editing the file. `Lattice` below draws an abstract
 * field of blocks; it is not a gated metric rendered and covered up, and it could not
 * be — `publicMetric`'s gated branch has no `value` and no `structure` field, so a
 * withheld figure never reaches this document. A CSS blur over real text would be a leak
 * whatever it looked like, because a paint-time filter is reversible from the markup the
 * browser already holds.
 *
 * What the blur therefore says is true at the only level it speaks: there is more detail
 * here than the page is giving you. ANSR holds four gated metrics this tool never ships.
 * The layer carries no figure, no metric name and no claim — there is no glyph in it to
 * resolve at any blur, only structure — and it is `aria-hidden` in full, so the band's
 * accessible content is its heading, its line and its button. Nothing fabricated is in
 * the reading order.
 *
 * **An earlier pass listed the withheld metrics by name** in a bordered panel beside the
 * ask, with frosted glass over an empty slot for each figure. Also honest, and cut as
 * too much band for a close. `withheldTitles` and the prop that carried the names went
 * with it; git holds them.
 *
 * **No eyebrow.** "NEXT STEP" over a heading that is itself the next step labels the band
 * rather than telling the reader anything, and it is the class of line both screens keep
 * cutting.
 *
 * **No vignette either.** The veil over the field was a radial gradient, solid behind the
 * copy and clearing at the edges. It read as a spotlight dropped on the band; a paywall
 * dims its surface evenly, because what is behind it is uniformly out of reach.
 */

/**
 * The band's own accessible name.
 *
 * **There is no heading any more, so the section needs a name another way.** It read
 * "Unlock the full GCC landscape" and was removed so the supporting line and the button
 * carry the band between them — the heading and the line were saying the same thing at two
 * sizes, and cutting the larger one let the smaller become the subject.
 *
 * `aria-label` rather than an `sr-only` `h2`, and there is precedent: Screen 2's
 * `#function-metrics` names itself exactly this way, for exactly this reason. An invisible
 * heading would sit in the document outline announcing a level no sighted reader can see,
 * and `docs/traps.md` records what that costs in a test suite. A `<section>` with no name
 * at all is not a `region`, so it would be unreachable by role and untestable by role —
 * which `expectBand` exists to catch.
 *
 * Not editable, unlike the two strings the band renders: it is a landmark name rather than
 * copy, it is never read by a sighted visitor, and a blank one silently removes the
 * landmark.
 */
const CLOSE_LABEL = "Unlock the full GCC landscape";

/**
 * The one outward call to action, once per screen.
 *
 * A pill, because that is what ANSR's own site uses for a primary action and the radius
 * scale allows `pill` here. Everything else on these screens is hard-edged at `none` —
 * the pill is the shape that marks the single action, so it only works as long as
 * nothing else borrows it.
 */
export function PrimaryCta({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      // Opens in the top-level window rather than inside the iframe: a marketing page
      // rendered in a frame sized to this tool's own content is broken, and `_parent`
      // keeps the visitor on ansr.com rather than in a new tab they have to manage.
      target="_parent"
      className={cn(
        // **Up from 48px/`text-base` to 56px/`text-lg`.** With the heading gone the band is
        // two elements, so the button is now half of it rather than the third thing under a
        // headline — and at the old size it read as a footnote beneath a display line set at
        // 38px. It is still the only filled control on the surface, which is what lets it be
        // the largest interactive thing without competing with anything.
        "inline-flex min-h-12 items-center rounded-full bg-action px-8 text-base font-semibold",
        // BLACK on the orange fill, not white. Measured 6.27:1 against 3.35:1, which
        // fails AA at every size this label uses. The palette was left alone and a legal
        // pairing used instead — `--ansr-action-text` stays in tokens.css so the brand's
        // stated intent is recorded, and is not what renders.
        "text-text transition-colors duration-fast ease-standard hover:bg-action-hover",
      )}
    >
      {children}
    </a>
  );
}

/**
 * The blurred field behind the ask.
 *
 * **Four columns of blocks, and they are texture rather than a mock-up of anything.**
 * The widths and heights vary because a uniform grid blurs into a flat wash and stops
 * suggesting structure — which is the opposite of the rule the deleted sealed panel
 * followed, and the difference is what the shape stands for. A slot standing in for one
 * NAMED metric's figure had to be uniform, because a varying width there implies a digit
 * count. Nothing here is named or paired with anything, so variation implies only that
 * content has structure.
 *
 * Authored rather than derived from the data on purpose: reading the real metrics to size
 * these blocks would make the texture a function of figures that must not cross the gate,
 * which is a coupling worth never having.
 *
 * Blur, hold-back and scale live in `.gcc-close-backdrop`, and the block fill in
 * `.gcc-close-block`, so this component sets no colour and no filter.
 */
/**
 * One tile in the field. Four kinds, each a different KIND of chart.
 *
 * **Every number below is a proportion — a height, a width, a coordinate — and none of
 * them is a figure.** That distinction is the whole licence for this layer to exist. A
 * blurred numeral is still a real character in the public DOM, so typing `$4,200` here
 * would put a fabricated cost figure in the bundle: unreadable on screen, plainly
 * readable in the markup, and exactly what invariant 1 and the no-invented-figures rule
 * exist to prevent.
 *
 * So a "figure" is a BLOCK at display height. After a 10px blur a wide block at figure
 * scale between two small ones is indistinguishable from a headline number with a label
 * over it and a delta under it, which is the read the band wants — and there is nothing
 * behind it to be wrong. The specs assert the layer contains no text at all, on both
 * screens.
 *
 * **Four kinds rather than six.** A ranked-rows tile and a small-table tile were both in
 * here and both blurred to the same thing as each other and as the figure tile's label
 * rows — three variants of "horizontal bars of differing width", which is what made the
 * field read as noise. What is left is four shapes that stay distinct at 10px: a headline
 * figure, a column chart, a donut and a line.
 */
type Tile =
  /** A label, a headline figure, a delta. The high-value shape. */
  | { readonly kind: "figure"; readonly label: number; readonly figure: number; readonly note: number }
  /** A column chart. */
  | { readonly kind: "bars"; readonly heights: readonly number[] }
  /** A donut. The only round thing in the field, and the only one that reads as a share. */
  | { readonly kind: "ring"; readonly label: number; readonly sweep: number }
  /** A sparkline, the only tile that needs real geometry. */
  | { readonly kind: "spark"; readonly points: string; readonly label: number };

/**
 * Eight tiles: four columns by two rows at `sm`, two by four on a phone.
 *
 * **The arrangement has 180-degree ROTATIONAL symmetry, and that is what stopped the band
 * looking accidental.** Read the first row left to right and the second row right to left
 * and you get the same four kinds in the same order, so every tile has a partner
 * diagonally opposite it: the two headline figures are at opposite corners, the two donuts
 * are on the inside pair, and the field is balanced about the centre where the copy sits.
 *
 * Rotational rather than mirrored, deliberately. A mirror puts identical shapes side by
 * side across the centre line, which reads as a repeated pattern — the thing the previous
 * version was accused of. Rotation gives balance with no two neighbours alike in either
 * axis.
 *
 * It survives the breakpoint: at two columns the reading order pairs (figure, bars),
 * (ring, spark), (spark, ring), (bars, figure) — still symmetric about the middle, so the
 * phone gets a balanced field rather than the desktop one cut in half.
 */
const TILES: readonly Tile[] = [
  { kind: "figure", label: 52, figure: 76, note: 34 },
  { kind: "bars", heights: [42, 68, 54, 88, 61] },
  { kind: "ring", label: 46, sweep: 68 },
  { kind: "spark", points: "0,26 14,17 28,21 42,9 56,13 70,4", label: 58 },
  { kind: "spark", points: "0,22 14,25 28,12 42,16 56,7 70,10", label: 54 },
  { kind: "ring", label: 50, sweep: 42 },
  { kind: "bars", heights: [58, 40, 74, 50, 84] },
  { kind: "figure", label: 46, figure: 70, note: 38 },
];

function TileBody({ tile }: { tile: Tile }) {
  switch (tile.kind) {
    case "figure":
      return (
        <>
          <span
            className="gcc-close-block block h-2"
            style={{ width: `${tile.label}%` }}
          />
          {/* The headline. `h-7` is display scale against the `h-2` label above it, and
              the ratio is what makes it read as a figure rather than as another bar. */}
          <span
            className="gcc-close-block mt-auto block h-7"
            style={{ width: `${tile.figure}%` }}
          />
          <span
            className="gcc-close-block block h-2"
            style={{ width: `${tile.note}%` }}
          />
        </>
      );

    case "bars":
      return (
        <div className="flex min-h-6 flex-1 items-end gap-1.5">
          {tile.heights.map((height, index) => (
            <span
              key={index}
              className="gcc-close-block block flex-1"
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
      );

    case "ring":
      return (
        <>
          <span
            className="gcc-close-block block h-2"
            style={{ width: `${tile.label}%` }}
          />
          {/* **A real donut rather than a plain circle, and the arc is the point.** A full
              ring blurs to an even annulus, which reads as a bevelled hole; a ring with a
              visible SWEEP reads as a share of something. Drawn as a `conic-gradient` with
              the hole punched by a radial mask, so it is one element with no overlay to
              keep aligned — see `.gcc-close-ring`. Centred, because it is the only tile
              whose shape has no reading direction. */}
          <span
            className="gcc-close-ring mx-auto mt-auto block size-16"
            style={{ "--gcc-ring-sweep": `${tile.sweep}%` } as React.CSSProperties}
          />
        </>
      );

    case "spark":
      return (
        <>
          <span
            className="gcc-close-block block h-2"
            style={{ width: `${tile.label}%` }}
          />
          {/* The one tile with real geometry. A non-uniform `preserveAspectRatio` so the
              line stretches to whatever the tile is, which keeps it a sparkline at every
              column width. */}
          <svg
            className="mt-auto h-9 w-full"
            viewBox="0 0 70 30"
            preserveAspectRatio="none"
          >
            {/* `non-scaling-stroke`, because `preserveAspectRatio="none"` scales the two
                axes differently and takes the stroke width with it — the line came out
                thinner vertically than horizontally and disappeared into the blur. With
                it the stroke is the same weight whatever the tile's proportions are. */}
            <polyline
              className="gcc-close-line"
              points={tile.points}
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </>
      );
  }
}

/**
 * The close's full-bleed layer, for `Zone`'s `behind` slot.
 *
 * **It is passed to the zone rather than rendered inside `ClosingCta` because it has to
 * reach the CARD's edges.** `ClosingCta` renders inside the zone's padded container,
 * capped at the lead measure and centred; a backdrop in there would stop at the gutter
 * and read as a rectangle parked in the middle of the band. `Zone` gained one slot for
 * exactly this — see its `behind` prop.
 *
 * Exported from this file rather than assembled by each caller so the two screens cannot
 * end up with different backdrops, which is the same reason the band itself is one
 * component. Both callers pass it and neither decides anything about it.
 */
export function CloseBackdrop() {
  return (
    <>
      <div aria-hidden="true" className="gcc-close-backdrop">
        {/* Two columns on a phone, four from `sm`. At 390 four columns is ~80px per tile,
            which blurs to a flat wash for the same reason a field of thin stripes did.

            `auto-rows-fr` so the two rows split the band's height evenly whatever it is —
            the tiles have different content heights, and without it a row of bars would
            take the surplus and the figure tiles beside it would sit in a short cell.

            The inline styles below are DATA rather than decisions: a Tailwind width or
            height class cannot be interpolated, and the alternative is forty
            arbitrary-value classes saying the same thing less clearly. */}
        <div className="grid h-full w-full auto-rows-fr grid-cols-2 gap-6 p-4 sm:grid-cols-4 md:gap-8 md:p-5">
          {TILES.map((tile, index) => (
            /**
             * **Each tile is a PANEL with its own fill, and that single change is most of
             * what took the field from accidental to deliberate.** Before, the blocks sat
             * directly on the band's ground with nothing grouping them, so eight unrelated
             * runs of bars read as scattered marks; a faint card behind each one turns the
             * same marks into a grid of eight panels, which is what a dashboard behind
             * glass looks like. The fill is `.gcc-close-tile`.
             *
             * The tile also fills its own cell top to bottom. An earlier version centred
             * its content, which left the band's top and bottom as empty ground and made
             * the field read as a strip floating in the middle.
             */
            <div
              key={index}
              className="gcc-close-tile flex h-full min-w-0 flex-col gap-2 p-3"
            >
              <TileBody tile={tile} />
            </div>
          ))}
        </div>
      </div>
      {/* The veil, and what guarantees the copy's contrast. One flat value across the
          whole band — see `.gcc-close-scrim` for the worst-case measurement that set it,
          and for why the radial version it replaced was wrong. */}
      <div aria-hidden="true" className="gcc-close-scrim" />
    </>
  );
}

export function ClosingCta({
  id,
  href,
  copy,
}: {
  /**
   * The band's id, which is how the browser suite locates it. **Its accessible name comes
   * from `aria-label` rather than from a heading in it**, because the band has no heading —
   * see `CLOSE_LABEL`. `expectBand` accepts either mechanism and what must not pass is a
   * band with neither.
   */
  id: string;
  href: string;
  /** The band's two strings, from `siteContent.close`. Admin-editable. */
  copy: CloseCopy;
}) {
  return (
    <section
      id={id}
      // Named rather than labelled by a heading, because there is no heading. See
      // `CLOSE_LABEL`.
      aria-label={CLOSE_LABEL}
      // Centred and capped at the LEAD measure, which is the display cap: with the heading
      // gone the supporting line IS the display type, so it takes the wider measure the
      // heading used to have rather than the reading measure it had as a subordinate line.
      //
      // `py` here rather than on the zone: the band needs enough height for the blurred
      // field behind it to read as a field rather than as a stripe, and that is a property
      // of this composition rather than of the zone rhythm.
      className="mx-auto flex max-w-lead flex-col items-center gap-6 py-12 text-center md:py-16"
    >
      {/**
       * The band's statement, and now its subject — but a QUIET one.
       *
       * **The `h2` above this is gone and this line took its place rather than its size.**
       * The two were saying the same thing twice — "Unlock the full GCC landscape" over
       * "Access the complete dataset, deeper benchmarks and detailed cost structures" — so
       * the band opened with a promise and then explained it. Cutting the promise leaves the
       * specific sentence, which is the one worth reading.
       *
       * **18/20px, which is ONE step up from where it started and three down from where it
       * briefly went.** Promoting it to the heading's old display scale (24/30/38 with
       * `tracking-display`) was wrong: at that size a 98-character sentence is three lines of
       * display type and the band stops being a close and starts being a second hero. The
       * close is the last thing on a long page of evidence and should ask quietly. So it
       * keeps the reading measure and reading-size leading, and gains one step of size over
       * the version that sat under a heading.
       *
       * **WHITE, not `--ansr-text-inverse-muted`, and that is not a prominence decision.**
       * The muted token measures 3.93:1 over the field's brightest possible pixel, which
       * fails AA for text at this size — and the alternative is raising the veil to 78%,
       * where the tiles behind it stop being distinguishable. White is 8.08:1 there. At 18px
       * Light 300 it still reads as quietly as the muted token would; what it does not do is
       * fail the contrast floor. `ask-hero.tsx` is white-only for the same class of reason.
       */}
      <p className="max-w-measure text-lg leading-relaxed font-light text-balance text-text-inverse md:text-xl">
        {copy.body}
      </p>
      <PrimaryCta href={href}>{copy.ctaLabel}</PrimaryCta>
    </section>
  );
}
