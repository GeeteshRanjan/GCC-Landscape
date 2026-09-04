import { figureParts, type ShownMetric } from "@/data/screen2";
import { cn } from "@/lib/utils";

/**
 * The row of national figures every function tab opens on.
 *
 * **One component for all four tabs, where there were four, and that is the whole
 * point of this file.** Each tab had grown its own opening section: technology drew a
 * borderless row with a line glyph over every figure and CSS hairlines between the
 * cells; HR drew three bordered cards each with a 64px filled teal disc; operations
 * drew four bordered cards with no glyph; finance drew three with a qualifier beside
 * the heading. Four tabs of one screen, four different answers to one question — and a
 * visitor crossing between them in a single click saw the page's opening object change
 * shape three times.
 *
 * **The shape is Screen 1's SNAPSHOT, copied deliberately rather than approximated.**
 * That strip is the peer view's opening object and it has been through three
 * iterations, each recorded on `screen1/snapshot.tsx`: a bordered container divided by
 * grid-gap rules, then four tiles with icon discs, then what is here. What survived is
 * the figure with its label directly beneath it and nothing drawn between them — no
 * card, no border, no fill, no shadow, no icon and no hairline. Two of the shapes this
 * file replaces are the two that strip already rejected, for reasons that hold equally
 * here: a bordered box on a tint reads as a table, and a pale disc holding a line icon
 * is the stats block every generated dashboard ships with.
 *
 * Three details from it are load-bearing rather than cosmetic:
 *
 *   - **The unit is a step down and baseline-aligned.** A `%` or an `M+` at the
 *     figure's own size is a third of the cell's optical weight carrying none of its
 *     information. Two real scale steps, never a fraction of an em — `0.55em` renders
 *     26.4px and 20.9px, and the surface then has two sizes nothing else uses. The
 *     split is done by `figureParts` in the view model, which is the module that
 *     produced the string; see the rule there.
 *   - **A FIXED height on the figure box, bottom-aligned.** So every label in the row
 *     sits on one line whatever its own figure is — a "2 – 6" and an "8.7M+" have
 *     different glyph extents, and a row whose labels do not align is the ragged card
 *     row again with the borders taken off.
 *   - **No rule and no divider between cells.** The gap is the only separation, which
 *     is what stops the row reading as a table. The `.gcc-figure-row` hairlines went
 *     with the four shapes; they were the one device Screen 1's strip had explicitly
 *     ruled out.
 *
 * **It is the tab's one orange role.** `--ansr-action` at 36/48px Bold is 3.35:1 on
 * white, which clears the 3:1 large-text floor and is illegal below it — so the title
 * under it is ink, the unit beneath that is muted, and the eyebrow above is
 * `--ansr-accent-warm`, the only orange legal at 12px. Heading and figures are one
 * orange act, exactly as they are on the snapshot.
 */

export interface SummaryFigure {
  /** The metric this figure came from. The key, and the heading id. */
  id: string;
  /** Already formatted by the view model. Split into numeral and unit here. */
  figure: string;
  /**
   * The upper end, where a cell states an extent rather than a point.
   *
   * One cell uses it — the operations tab's disruption days, which states both ends of
   * the real set because there is no single figure in the data. See `ops-view.tsx`.
   */
  high?: string;
  /**
   * A WORD unit, drawn beside the numeral at the same two-step-down size the symbolic
   * ones take.
   *
   * **Only for a unit `figureParts` cannot find, and that is the whole reason the field
   * exists.** That function splits a CLOSED trailing alphabet — `%`, `M`, `K`, `+` — off
   * a formatted figure, because it may only reduce a string it produced itself. A unit
   * like "mn sq ft" is not in that set and never will be: it is not a suffix on the
   * number, it is the metric's own `unit`, so the cell is handed it explicitly rather
   * than having the renderer parse for it.
   *
   * One cell uses it — the operations tab's Grade A office stock, whose title used to
   * carry the unit because a cell had nowhere else to put one. Set only where the figure
   * cannot be read without it; a unit that merely repeats the title is noise at 24px.
   */
  unit?: string;
  /**
   * The ONE line under the figure, and the only one.
   *
   * **A cell used to carry up to three: the metric's title, its unit, and a note naming
   * the population it was measured over.** Three lines of different lengths under five
   * figures is what made the row read as ragged rather than as a set, and two of the
   * three were usually saying one thing between them ("Grade A office stock" / "million
   * sq ft"). So the title is authored to explain the figure on its own — it carries the
   * unit where the figure cannot be read without one, and the scope where the figure is
   * one part of a larger set — and the other two lines are gone.
   *
   * `title` rather than `label` because it is still the metric's own title, verbatim,
   * and it is still the cell's heading. Nothing here composes or re-letters it.
   */
  title: string;
}

/**
 * The row's column count, by how many figures it holds.
 *
 * A static map because a Tailwind class cannot be interpolated — `lg:grid-cols-${n}`
 * generates no CSS at all, which renders as a single column and looks deliberate. It
 * has to vary, because a fixed five leaves finance's three figures with two empty
 * columns after them.
 *
 * **TWO columns on a phone, and the figure came down a step to pay for it.** This was
 * one column below `sm`, on the measurement that a 36px figure and its unit are most of
 * a 171px half-cell and that "99.95%" does not fit one. That measurement was right and
 * the conclusion was wrong: the answer is not to give a phone one figure per screen-width
 * row — four of them ran the row to about 440px with most of every line empty — it is to
 * set the figure at the size a half-cell holds. At 30px "99.95%" is about 108px of a
 * 155px cell, and the row reads as a set of national facts rather than as a list of four
 * unrelated ones. The snapshot on the peer view took the same correction in the same
 * pass, so the two surfaces still open on the same object.
 *
 * An odd last cell widens to the full row below `sm` — see the span in the cell below.
 */
const COLUMNS = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-2 sm:grid-cols-3",
  4: "grid-cols-2 lg:grid-cols-4",
  5: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
} as const;

type ColumnKey = keyof typeof COLUMNS;

function columnKey(count: number): ColumnKey {
  if (count <= 1) return 1;
  if (count >= 5) return 5;
  return count as ColumnKey;
}

export function SummaryFigures({
  heading,
  headingId,
  cells,
}: {
  /** What the figures are properties OF. See `FIGURES_HEADING`. Not drawn — `sr-only`. */
  heading: string;
  headingId: string;
  cells: readonly SummaryFigure[];
}) {
  if (cells.length === 0) return null;

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-5 md:gap-6">
      {/* **The heading is `sr-only` now, at ANSR's request.** The four subject lines
          ("India's technology talent", and the three others) were removed from the
          visible page — the figures open the tab directly, as the peer view's snapshot
          does. It stays in the accessibility tree because the band points its
          `aria-labelledby` here and a `<section>` with no accessible name is not a
          `region`; hidden with `sr-only` it is absolutely positioned, so it is not a
          flex item and adds no gap above the figures. */}
      <h2 id={headingId} className="sr-only">
        {heading}
      </h2>
      {/* A `ul` of `li`s, which is the counting contract the whole browser suite
          rests on: `#function-metrics ul > li` means "a figure-row cell" on every tab.
          Wider gaps than a bordered grid needs, because with no edge between two cells
          the space is the only thing separating them. */}
      {/* `gap-x-4` on a phone: at 375 a column is about 150px, so the horizontal space is
          the scarcest thing in a cell and a wrapping title needs it more than the boundary
          between two cells does. The vertical gap stays the wider of the two, which is
          what keeps two columns reading as two columns. */}
      <ul
        className={cn(
          "grid gap-x-4 gap-y-5 sm:gap-6 lg:gap-8",
          COLUMNS[columnKey(cells.length)],
        )}
      >
        {cells.map((cell, index) => {
          const value = figureParts(cell.figure);
          const high = cell.high ? figureParts(cell.high) : undefined;
          return (
            <li
              key={cell.id}
              className={cn(
                "flex min-w-0 flex-col gap-2",
                // **The odd last cell widens rather than sitting alone in a two-column
                // row.** A lone cell in a row of evidence reads as a figure that failed
                // to load — the same rule `packWidths` enforces on the card grid and the
                // impact band on its own figures. It applies on a phone only: from `sm`
                // the column count is the cell count or a divisor of it.
                cells.length > 1 &&
                  cells.length % 2 === 1 &&
                  index === cells.length - 1 &&
                  "col-span-2 sm:col-span-1",
              )}
            >
              {/* The fixed box, bottom-aligned. `items-end` on the outer element and
                  `items-baseline` on the inner one: the outer alignment is what lands
                  every label on one line, and the baseline is the relationship the
                  unit needs to its own numeral. */}
              {/* **30px on a phone, 36 from `sm`, 48 from `md`, and the box steps with
                  them.** The two-column phone row is what buys this: a figure that is
                  most of its own cell is not a figure, it is a headline. See `COLUMNS`. */}
              <p className="flex h-8 min-w-0 items-end text-3xl leading-none font-bold tracking-display text-action tabular-nums sm:h-9 sm:text-4xl md:h-12 md:text-5xl">
                <span className="flex min-w-0 items-baseline truncate">
                  {/* **Wrapped rather than left as a bare text node, and it is
                      layout-neutral**: inside a flex container a text run becomes an
                      anonymous flex item anyway, so this box is the one the browser was
                      already making. What it buys is a real element for the numeral —
                      which the specs need in order to measure the unit's position against
                      it, and to match the numeral exactly on the one cell whose unit is a
                      separate word rather than a suffix on the number. */}
                  <span data-figure-value="">{value.value}</span>
                  {value.suffix ? <Unit>{value.suffix}</Unit> : null}
                  {/* A word unit the formatter could not have found. Same component and
                      therefore the same two scale steps down as a `%` or an `M+`, so the
                      row has one relationship between a figure and its unit rather than
                      two. `whitespace-nowrap` lives on `Unit`: "mn sq ft" holding three
                      words must break as one object or not at all. */}
                  {cell.unit ? <Unit word>{cell.unit}</Unit> : null}
                  {high ? (
                    <>
                      {/* An en dash, spaced, because both operands are numerals and an
                          unspaced dash between digits reads as a minus. Hidden with the
                          word beside it, so the cell is announced as "2 to 6" rather
                          than as one run of digits. */}
                      <span aria-hidden="true" className="mx-1.5 shrink-0">
                        {"\u2013"}
                      </span>
                      <span className="sr-only"> to </span>
                      {high.value}
                      {high.suffix ? <Unit>{high.suffix}</Unit> : null}
                    </>
                  ) : null}
                </span>
              </p>
              {/* **ONE line under the figure, which is the whole change here.** A cell
                  carried up to three — the metric's title, its unit, and a note naming
                  the population the figure covered — so five cells put between five and
                  fifteen lines of different lengths under five figures, and the row read
                  as ragged rather than as a set. The titles are authored to explain their
                  own figure now: each carries the unit where the figure cannot be read
                  without one, and the scope where the figure is one part of a larger set.
                  See `SummaryFigure.title`.

                  `h3`, under this section's own `h2`. A level is an outline rather than
                  a size, and skipping one leaves a screen-reader user with a broken
                  structure. */}
              <h3
                id={`metric-${cell.id}-heading`}
                className="min-w-0 text-xs font-medium tracking-body text-pretty text-text sm:text-sm"
              >
                {cell.title}
              </h3>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/**
 * The unit, two scale steps under the figure.
 *
 * 18 against 30, 20 against 36 and 24 against 48 — every pair a real step on the scale,
 * and every one near half the figure, which is where a unit belongs. It steps at `sm` for
 * the same reason the figure does: the ratio is the relationship, so a figure that comes
 * down a step and a unit that does not is a unit that has come UP. `tracking-normal`
 * because `tracking-display` is fitted to digits and closes the gap a glyph this size
 * needs.
 */
function Unit({
  children,
  word = false,
}: {
  children: React.ReactNode;
  /**
   * A WORD unit rather than a symbol, which changes the gap and nothing else.
   *
   * A `%` or an `M+` is a suffix ON the numeral and sets tight against it — 2px, which
   * is a hair of optical separation rather than a space. "mn sq ft" is a separate token
   * and needs a real word space, so it takes 4px. Same size step either way: the size
   * is the relationship between a unit and its figure, and that does not depend on
   * whether the unit is spelled or drawn.
   */
  word?: boolean;
}) {
  return (
    // `whitespace-nowrap` because the figure box is a FIXED height with
    // `overflow: hidden` on the span inside it — a unit that wrapped would be clipped
    // rather than shown on a second line. `shrink-0` so a wide numeral beside it cannot
    // squeeze it to an ellipsis.
    // `data-figure-unit` is a stable hook for the spec that measures this against its own
    // numeral, and not a style — a spec selecting `span > span` by position broke the
    // moment the numeral gained a box of its own, which is the fragility this removes.
    <span
      data-figure-unit=""
      className={cn(
        "shrink-0 whitespace-nowrap text-lg font-semibold tracking-normal sm:text-xl md:text-2xl",
        word ? "ms-1" : "ms-0.5",
      )}
    >
      {children}
    </span>
  );
}

/**
 * Every bare scalar on a tab, as cells.
 *
 * Shared by the three tabs whose summary row is exactly its scalars — technology, HR
 * and finance. The operations tab builds its own cells, because three of its four are
 * one PART of a breakdown rather than a metric of their own, and which part is a
 * decision that belongs in one readable place; see `summaryCells` there.
 *
 * **The floor is no longer explained in words.** The trailing `+` on a figure stays —
 * it is authored on the metric and applied in `screen2.ts` — but the sentence spelling
 * it out ("+ indicates a floor…") was removed from every tab at ANSR's request, so no
 * cell carries a note about it.
 */
export function scalarCells(figures: readonly ShownMetric[]): SummaryFigure[] {
  return figures.flatMap((shown) =>
    shown.shape === "scalar"
      ? [
          {
            id: shown.metric.id,
            figure: shown.figure,
            title: shown.metric.title,
          },
        ]
      : [],
  );
}
