import {
  FORBES_GLOBAL_2000_SIZE,
  FORTUNE_GLOBAL_500_SIZE,
  type PeerView,
} from "@/data/screen1";
import { cn } from "@/lib/utils";
import {
  largestAxisNote,
  largestCountLine,
  largestLine,
  peerCountLine,
  SCALE,
  shortfallLine,
} from "./copy";
import {
  Chip,
  formatCount,
  formatProfessionals,
  formatShare,
} from "@/components/public/primitives";
import {
  AxisNote,
  BarTrack,
  Containment,
  type ContainmentLayer,
} from "@/components/public/charts";

/**
 * The evidence sections on the peer landscape surface.
 *
 * Every one of them shows rather than describes, and each shows the thing its own
 * claim is about — which is the rule that decided each shape here:
 *
 *   - **The comparison set** is a grid of FLOATING CARDS. It was a five-row table
 *     for one pass and the table was the right instinct for the wrong content: a
 *     table is for reading down a column, and four of the five columns held a chip
 *     list, a year and a band rather than anything a reader ranks. What the table
 *     bought was alignment; what it cost was that the block read as a spreadsheet
 *     dropped into a brand page, with hairlines every 48px and no card able to
 *     carry a figure at a size worth reading. Cards give each company a headcount
 *     figure at display size, keep the relevance order visible through a rank
 *     badge, and pack so no row is left part-empty.
 *   - **The wider industry context** is a claim about CONTAINMENT — a sub-industry
 *     inside an industry inside the national base — so it is three OVERLAPPING bars
 *     sharing a leading edge. See `Containment`.
 *   - **The largest centres** is a claim about MAGNITUDE, so its cards keep a bar on
 *     one shared axis with the band as the visible figure, and they are stacked as a
 *     ranking rather than gridded as a set. Deliberately a different shape from the
 *     comparison cards: two grids of company cards on one page would read as the
 *     same block twice.
 *   - **The function list** is a claim about ORDER and nothing else, so it carries
 *     no mark. There is no per-company function record in this dataset, so a share
 *     beside each function would be invented — the heading says "most GCCs" rather
 *     than "these companies" for that reason.
 *   - **The Fortune and Forbes counts** are claims about FRACTIONS of known lists,
 *     so the denominators are drawn rather than left in a footnote.
 *
 * The degenerate cases are the interesting part and each is handled rather than left
 * to render badly: a short peer set is stated in one line and never padded, the
 * containment collapses to two layers when no sub-industry was given, and the
 * largest block collapses to a line when it would repeat the cards above it.
 */

/* ==========================================================================
   Card scaffolding, shared by the two company blocks
   ========================================================================== */

/**
 * How a row of cards divides, so no row is ever left part-empty.
 *
 * **A twelve-column grid and a per-row plan, not `grid-cols-3`.** Five cards in
 * three columns leaves one empty cell, and an empty cell in a grid of evidence
 * reads as a card that failed to load — the same artefact Screen 2's metric packing
 * exists to prevent. So rows are planned first and the spans follow: five becomes
 * three then two, four becomes two then two, and a lone card takes the full width
 * rather than a third of it.
 *
 * Returned as row SIZES rather than as per-card spans because the rule is about
 * rows: what must never happen is a row whose cards do not add up to twelve.
 */
function rowPlan(count: number): number[] {
  const rows: number[] = [];
  let left = count;
  while (left > 0) {
    if (left === 4) {
      // Two and two, never three and one. A single card on a row after three is the
      // part-empty row in its worst form — a full-width card restating a third-width
      // one.
      rows.push(2, 2);
      break;
    }
    if (left <= 3) {
      rows.push(left);
      break;
    }
    rows.push(3);
    left -= 3;
  }
  return rows;
}

/**
 * Span classes by row size. A lookup, because **a Tailwind class cannot be
 * interpolated** — `lg:col-span-${n}` generates no CSS at all.
 */
const SPAN: Record<number, string> = {
  1: "lg:col-span-12",
  2: "lg:col-span-6",
  3: "lg:col-span-4",
};

/**
 * The span each card takes, in order, plus whether that span is a WIDE one.
 *
 * The width matters to the card's own interior, not just to the grid. A card built
 * for a third of twelve columns, stretched to a half or the whole width, is the same
 * content in a wider box — which is a card that looks like it failed to fill, and is
 * exactly the artefact the row packing exists to prevent. So a wide card lays its
 * interior out in two columns instead; see `PeerCardBody`.
 */
function layoutFor(count: number): Array<{ span: string; wide: boolean }> {
  const out: Array<{ span: string; wide: boolean }> = [];
  for (const size of rowPlan(count)) {
    for (let i = 0; i < size; i += 1) {
      out.push({ span: SPAN[size] ?? SPAN[3]!, wide: size < 3 });
    }
  }
  return out;
}

/** The city list, as pills. Short, and there are rarely more than three. */
function CityCells({ cities }: { cities: readonly string[] }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {cities.map((city) => (
        <Chip key={city}>{city}</Chip>
      ))}
    </span>
  );
}

/**
 * A comparison card's interior, in one column or two.
 *
 * **The two-column variant is what makes the packed row honest.** Five peers pack as
 * three thirds then two halves, and a half-width card holding a third-width card's
 * interior is 40% empty — which reads as a card that failed to load, the exact
 * artefact the packing exists to prevent. Widening a card has to change what it does
 * with the width, not just how much of it there is.
 *
 * The figure leads in both variants, because it is what the card exists for. What
 * moves is the footer: stacked under the figure when the card is narrow, beside it
 * when the card is wide.
 */
function PeerCardBody({
  peer,
  wide,
  showFortune,
}: {
  peer: { headcount: string; cities: readonly string[]; establishedYear: number; fortuneGlobal500: boolean };
  wide: boolean;
  showFortune: boolean;
}) {
  const figure = (
    // The figure the card exists for, at a size worth reading. In the table this was
    // a 14px cell at the far right of a five-column row, behind a horizontal scroll
    // on a phone.
    <CardFact label="India employees">
      <p className="text-2xl leading-none font-bold tracking-display text-accent-teal tabular-nums">
        {peer.headcount}
      </p>
    </CardFact>
  );

  const footer = (
    <div className="flex flex-col gap-3">
      <CardFact label="India locations">
        <CityCells cities={peer.cities} />
      </CardFact>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-sm text-text-muted">
          Established{" "}
          <span className="font-semibold text-text tabular-nums">
            {peer.establishedYear}
          </span>
        </span>
        {showFortune && peer.fortuneGlobal500 ? (
          <Chip tone="accent">Fortune Global 500</Chip>
        ) : null}
      </div>
    </div>
  );

  if (wide) {
    return (
      // A rule BETWEEN the two halves rather than above the footer, so the divider
      // follows the layout instead of being a horizontal line left over from the
      // stacked variant. Logical properties, so it flips with the writing direction.
      //
      // **Gated on `lg`, which is the breakpoint the SPAN is gated on.** At `sm` and
      // `md` the grid is two equal columns and no card is wide, so a two-column
      // interior there squeezed a five-digit range onto two lines and stacked the city
      // chips into a vertical strip. The interior may only split where the card
      // actually got the width.
      <div className="mt-auto flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
        <div className="lg:w-2/5 lg:shrink-0">{figure}</div>
        <div className="border-t border-border pt-3 lg:border-t-0 lg:border-s lg:pt-0 lg:ps-6">
          {footer}
        </div>
      </div>
    );
  }

  return (
    <>
      {figure}
      {/* `mt-auto` so the footer sits on the card's own bottom edge whatever the name
          above it wrapped to. Without it a two-line company name pushed its
          neighbour's facts out of alignment across the row, which is the specific
          thing the table was better at and the thing a card grid has to be deliberate
          about. */}
      <div className="mt-auto border-t border-border pt-3">{footer}</div>
    </>
  );
}

/** A small caps label over a value. The card's internal unit. */
function CardFact({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="text-[0.6875rem] font-semibold tracking-caps text-text-muted uppercase">
        {label}
      </span>
      {children}
    </div>
  );
}

/* ==========================================================================
   Companies selected for comparison
   ========================================================================== */

/**
 * The comparison set, as a packed grid of company cards.
 *
 * **The rank badge is what replaces the table's row position.** Order is relevance
 * order and it is never re-sorted, so the ranking has to be visible — in a table it
 * was free, because a reader knows the first row is first. A grid has no first, so
 * each card carries its position. That is also the whole of the ranking marker now:
 * the "Closest comparison" chip on the leading card is gone at ANSR's request, and
 * the badge says the same thing without spending an accent fill on it.
 *
 * **Three things the previous table carried and this deliberately does not.** The
 * headquarters column, dropped with the field — see `PeerCard`. The shared-tag and
 * preference footnote, which was an explanation of the matching rather than
 * evidence about the companies. And the bar axis note, which went with the bars:
 * every card now carries its employee band as a figure at 24px, which is the
 * reading the bar was a second copy of, and a set of five bars needed a sentence
 * underneath saying whose company full width was.
 *
 * Sort controls are still absent, and for the same reason as before: "best match"
 * is the only ordering the matching engine defines, and re-sorting by size would
 * leave the section's own heading describing a list that is no longer in relevance
 * order.
 */
export function PeerBlockView({ view }: { view: PeerView }) {
  const peers = view.peers.peers;
  const shortfall = shortfallLine(view);

  if (peers.length === 0) {
    return <p className="max-w-measure text-base text-text">{shortfall}</p>;
  }

  /**
   * **A badge every card carries is not a badge.** In BFSI at the top revenue band
   * all five peers are in the Fortune Global 500, so the block drew the same chip
   * five times — which spends the "notice this" signal until none of the five has
   * it. Where it is universal it becomes one line under the grid; where it is mixed
   * the chips stay and mean something.
   */
  const showFortune = !(
    peers.length > 1 && peers.every((peer) => peer.fortuneGlobal500)
  );
  const layout = layoutFor(peers.length);

  return (
    <div className="flex flex-col gap-5">
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-12 lg:gap-4">
        {peers.map((peer, index) => {
          const wide = layout[index]?.wide ?? false;
          return (
            <li key={peer.id} className={cn("min-w-0", layout[index]?.span)}>
              <article
                className={cn(
                  // The floating card. Radius `lg` and a soft edge, matching the entry
                  // point's form card rather than the hairline panels this surface used
                  // to be built from — that composition is the one this page is being
                  // brought into line with.
                  "gcc-lift flex h-full min-w-0 flex-col gap-4 rounded-lg border",
                  "border-border-strong/50 bg-surface p-4 shadow-xs md:p-5",
                )}
              >
                <div className="flex items-start gap-3">
                  {/* The rank. Tabular and hard-edged, and `aria-hidden` because the
                      list it is in already conveys position — a screen reader
                      announcing "1, Adidas, list item 1 of 5" would read it twice. */}
                  <span
                    aria-hidden="true"
                    className="gcc-rank mt-0.5 inline-flex size-6 shrink-0 items-center justify-center text-xs font-bold tabular-nums"
                  >
                    {index + 1}
                  </span>
                  {/* **No logo, no initial, no monogram and no reserved empty box.**
                      This dataset holds no company marks: a coloured square with a
                      letter in it is a fabricated identity, an empty placeholder is a
                      visible gap, and either one in front of a CIO reading companies
                      they know is worse than the name alone. */}
                  <h3 className="min-w-0 flex-1 text-base font-semibold text-pretty text-text md:text-lg">
                    {peer.name}
                  </h3>
                </div>
                <PeerCardBody
                  peer={peer}
                  wide={wide}
                  showFortune={showFortune}
                />
              </article>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-col gap-3">
        {/* Exact both sides. The cohort is the population the peers were drawn from,
            not the whole industry — see `peerCountLine`. */}
        <p className="text-sm font-medium text-text tabular-nums">
          {peerCountLine(view)}
        </p>
        {shortfall ? (
          // The one line the invariant requires. Plain, not apologetic, and
          // immediately before the block that carries the weight.
          <p className="max-w-measure text-sm text-text">{shortfall}</p>
        ) : null}
        {showFortune ? null : (
          <p className="text-sm text-text">
            Every company here is in the Fortune Global 500.
          </p>
        )}
      </div>
    </div>
  );
}

/* ==========================================================================
   The wider industry context
   ========================================================================== */

/**
 * The visitor's industry and sub-industry, drawn inside the national base.
 *
 * This is the block that turns a thin peer set from a weakness into evidence, and
 * it could not do that as a number. "59" beside five names leaves the reader to
 * relate the two; the overlapping bars do the relating, and what the reader then
 * sees is that their sub-industry is a real population inside a much larger one.
 *
 * **The outermost layer is now every GCC in India, not the industry**, which is the
 * change ANSR asked for and it is a better opening figure: the industry total on its
 * own is a number with nothing to be large or small against. With 1,834 behind it,
 * an industry of 656 reads as a third of the national base and an industry of two
 * reads as open ground — the same figure, two findings, neither of them stated by
 * the tool.
 *
 * The middle layer is labelled for the sub-industry rather than for a revenue band,
 * which the reference composition called it. The population is the companies above
 * the similarity floor — business similarity, not revenue band — and mislabelling it
 * would be a false statement about how the peers were chosen, sitting directly under
 * a grid whose own lead says the opposite.
 */
export function IndustryCountView({ view }: { view: PeerView }) {
  const { total, industry, businessType } = view.industry;
  const base = view.scale.companyCount;
  const share = (count: number) => (base > 0 ? count / base : 0);

  /**
   * **Three layers, always, and the third one changes shape rather than going
   * missing.** With a sub-industry answered the innermost layer is that cohort, which
   * is the population the comparison set was actually drawn from. Without one it is
   * the comparison set itself.
   *
   * The alternative was two layers whenever sub-industry was left unanswered — which
   * is most visitors — and two layers is the case this chart looks worst in: a
   * full-width pale bar with one darker bar inside it and a band of nothing between
   * them. It is also weaker evidence. Three steps say "India, then your industry,
   * then the handful on this page", which is the funnel a reader is actually being
   * walked down; two say "your industry is a tenth of India" and stop.
   */
  const shown = view.peers.peers.length;
  const layers: ContainmentLayer[] = [
    { label: "GCCs across India", figure: formatCount(base), share: 1 },
    {
      label: `in ${industry}`,
      figure: formatCount(total),
      share: share(Math.min(total, base)),
    },
  ];
  if (businessType) {
    // Clamped rather than trusted: both figures are counted over the same
    // population, but a floor-shortened set means the cohort can exceed nothing and
    // still has to land inside the industry it is drawn from.
    const cohort = Math.min(businessType.count, total);
    layers.push({
      label: "in your sub-industry",
      figure: formatCount(cohort),
      share: share(cohort),
    });
  } else if (shown > 0) {
    layers.push({
      label: "shown above",
      figure: formatCount(shown),
      share: share(Math.min(shown, total)),
    });
  }

  /**
   * **The standalone figure that used to open this block is gone, and removing it is
   * a de-duplication rather than a trim.** The block was a 48px "189", then the
   * sentence "other BFSI companies run a centre in India", then a chart whose middle
   * layer is labelled "189 in BFSI" — the same number twice, 120px apart, with the
   * reader left to check that the two agree. The sentence moved up to the section's
   * own lead, where `Panel` renders it, and the chart carries every figure.
   */
  return <Containment layers={layers} />;
}

/* ==========================================================================
   The largest industry centres
   ========================================================================== */

/**
 * The upper end of the industry, as a stack of ranked cards.
 *
 * **Stacked and horizontal, where the comparison set is a grid.** Both blocks are
 * lists of companies, so the one thing they must not be is the same shape — two
 * identical grids under two headings is what makes a page read as padded. The
 * difference is not arbitrary either: this block is a RANKING, and a vertical stack
 * with a display numeral and a bar on one shared axis is what a ranking looks like.
 *
 * It also solves a real repetition problem. At the top revenue band the largest
 * companies overlap heavily with the comparison set; as a ranked row an overlap is a
 * marker on a card the reader has already seen rather than a duplicate card.
 *
 * The bar is a share against the largest in this set and the visible figure stays
 * the employee band — a ratio derived from band midpoints is honest as a bar's length
 * and would not be honest as a published number, which is why the axis note names
 * the company at full width rather than stating a ratio.
 */
export function LargestBlockView({ view }: { view: PeerView }) {
  const { entries, repeatsPeers, shortfall } = view.largest;
  const line = largestLine(view);
  const axisNote = largestAxisNote(view);

  if (entries.length === 0 || repeatsPeers) {
    return <p className="max-w-measure text-base text-text">{line}</p>;
  }

  /**
   * At the upper end of most industries every company here is in the Fortune Global
   * 500, so the block drew the same accent chip on every card. Where it is universal
   * it becomes one line underneath; where it is mixed the chips mean something.
   */
  const allFortune =
    entries.length > 1 && entries.every((entry) => entry.company.fortuneGlobal500);

  return (
    <div className="flex flex-col gap-5">
      {/* Only when the ranking had to walk down the revenue bands, which three
          industries do. The general case says nothing here — the section's own
          heading covers it. */}
      {view.largest.belowTopBand ? (
        <p className="max-w-measure text-sm text-text">{line}</p>
      ) : null}

      <ol className="flex flex-col gap-3">
        {entries.map((entry, index) => (
          <li key={entry.company.id}>
            <article
              className={cn(
                "gcc-lift flex flex-col gap-4 rounded-lg border border-border-strong/50",
                "bg-surface p-4 shadow-xs md:flex-row md:items-center md:gap-6 md:p-5",
              )}
            >
              {/* The rank as a display numeral in a light ramp step, not as a filled
                  badge. On a ranking the position is the subject, so it is allowed to
                  be large; in the pale teal it is large without competing with the
                  name beside it. Zero-padded so 1 and 10 occupy one width and the
                  names stay on one leading edge. */}
              <span
                aria-hidden="true"
                className="text-3xl leading-none font-bold tracking-display text-teal-300 tabular-nums md:text-4xl"
              >
                {String(index + 1).padStart(2, "0")}
              </span>

              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-semibold text-pretty text-text md:text-lg">
                    {entry.company.name}
                  </h3>
                  {!allFortune && entry.company.fortuneGlobal500 ? (
                    <Chip tone="accent">Fortune Global 500</Chip>
                  ) : null}
                  {entry.alsoPeer ? <Chip>Also in your peer set</Chip> : null}
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <CityCells cities={entry.company.cities} />
                  <span className="text-sm text-text-muted">
                    since{" "}
                    <span className="font-semibold text-text tabular-nums">
                      {entry.company.establishedYear}
                    </span>
                  </span>
                </div>
              </div>

              {/* The magnitude, fixed-width on desktop so five bars share one axis
                  rather than each being sized to its own figure — which is the exact
                  bug the table's `mark` slot existed to prevent, and it would come
                  straight back if this were an inline block after the name. */}
              <div className="flex w-full flex-col gap-2 md:w-56">
                <p className="text-xl leading-none font-bold text-text tabular-nums md:text-2xl md:text-end">
                  {entry.company.headcount}
                </p>
                <BarTrack share={entry.company.sizeShare} emphasis={index === 0} />
              </div>
            </article>
          </li>
        ))}
      </ol>

      <div className="flex flex-col gap-3">
        {/* What the ranking covers. It replaces the reference composition's "View
            full ranking" link, which had nothing to link to — this block already
            holds every entry the engine returns. */}
        <p className="text-sm font-medium text-text tabular-nums">
          {largestCountLine(view)}
          {/* Only where the ranking ran out of companies. It is a property of the
              count rather than a caveat about the method, so it belongs on this line
              rather than in a note of its own. */}
          {shortfall > 0
            ? ` ${entries.length} rather than ${view.peers.limit}: the industry does not go deeper in India yet.`
            : ""}
        </p>
        {/* What full width is. Descending bars on a shared axis with no stated
            maximum look precise and say nothing. */}
        {axisNote ? <AxisNote>{axisNote}</AxisNote> : null}
        {allFortune ? (
          <p className="text-sm text-text">
            Every company here is in the Fortune Global 500.
          </p>
        ) : null}
      </div>
    </div>
  );
}

/* ==========================================================================
   Functions run from India GCCs
   ========================================================================== */

/**
 * The function list — the one block on this surface with no mark on it.
 *
 * **The reference composition draws a percentage and a bar against each function,
 * and every one of those figures would have to be invented.** There is no
 * per-company function record in this dataset and there will not be; what we hold
 * is an ORDER, most to least common across India GCCs.
 *
 * **The two caveat paragraphs are gone and the HEADING carries the job they were
 * doing.** They said, at 12px under a list of eight words, that this is the general
 * India pattern rather than a breakdown of the companies above and that no share is
 * stated for any of them — two sentences about the same limitation, in the register
 * that makes a page feel defensive. The section is now called what it is: functions
 * most GCCs run, which is a claim about GCCs in general and not about the five
 * companies in the block above. Nothing on the block states or implies a share.
 *
 * Numbered tiles rather than a bordered list, because the block had to stop looking
 * like a table of contents. The rank is the only quantity the block can honestly
 * draw, and putting it in the same square badge the comparison cards use is what
 * ties the two together.
 */
export function CommonFunctionsView({ view }: { view: PeerView }) {
  return (
    <ol className="grid gap-2 sm:grid-cols-2">
      {view.functions.map((fn, index) => (
        <li key={fn}>
          <div
            className={cn(
              "gcc-lift flex h-full items-center gap-3 rounded-lg border",
              "border-border-tint bg-surface-pale px-3 py-3 md:px-4",
            )}
          >
            <span
              aria-hidden="true"
              className="gcc-rank inline-flex size-6 shrink-0 items-center justify-center text-xs font-bold tabular-nums"
            >
              {index + 1}
            </span>
            <span className="min-w-0 text-sm font-medium text-text md:text-base">
              {fn}
            </span>
          </div>
        </li>
      ))}
    </ol>
  );
}

/* ==========================================================================
   The terminating evidence strip
   ========================================================================== */

/**
 * One figure in the strip: an icon, the number, and what it is a number of.
 *
 * Three evenly spaced groups with hairline dividers, per the reference composition.
 * The dividers are logical-property borders rather than a separate element, so they
 * disappear correctly when the row wraps to a column on a phone.
 */
function ScaleFigure({
  icon,
  value,
  ofLabel,
  label,
  share,
  shareLabel,
}: {
  icon: React.ReactNode;
  value: string;
  /** The denominator, beside the figure. Omitted where there is not one. */
  ofLabel?: string;
  label: string;
  /** 0 to 1 of a known list. Omitted where there is no denominator to draw. */
  share?: number;
  shareLabel?: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-4 px-0 lg:px-6 lg:first:ps-0 lg:last:pe-0">
      <span
        aria-hidden="true"
        className="mt-1 inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-inverse-soft text-accent-inverse"
      >
        {icon}
      </span>
      <div className="flex min-w-0 flex-col gap-2">
        <p className="flex flex-wrap items-baseline gap-x-2 text-3xl leading-none font-bold tracking-display text-text-inverse tabular-nums md:text-4xl">
          {value}
          {ofLabel ? (
            <span className="text-base font-medium text-text-inverse-muted">
              {ofLabel}
            </span>
          ) : null}
        </p>
        <p className="text-sm text-text-inverse text-pretty">{label}</p>
        {share !== undefined && shareLabel ? (
          <>
            {/* The proportion, drawn against its real denominator. A count of a
                fixed list has one, so leaving it in a footnote would be dropping the
                evidence: 181 is a number a reader has to place, "181 of the 500" is
                a number that places itself. */}
            <div
              aria-hidden="true"
              className="h-1.5 w-full max-w-40 bg-surface-inverse-soft"
            >
              <div
                className="h-full bg-accent-inverse"
                style={{ width: `${Math.max(share * 100, 1.5)}%` }}
              />
            </div>
            <p className="text-xs text-text-inverse-muted tabular-nums">
              {shareLabel}
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Scale proof across all of India rather than the visitor's industry — which is the
 * point of the strip, and the brief says so explicitly. The last thing on the page.
 *
 * **The third figure is labelled "Fortune Global 500", not "Fortune 500".** The
 * reference composition says the latter; they are different lists with different
 * membership, and the figure counts professionals inside Fortune GLOBAL 500
 * companies. See `SCALE`.
 *
 * **The source-and-method block under the figures is gone**, at ANSR's request: the
 * audit disclaimer, the band-midpoint method line, the national company count, the
 * database credit and the machine-stamped as-at date. So the page now carries no
 * provenance at its foot at all, which is a departure worth knowing about rather
 * than a tidy-up — the figures here are sums of headcount BANDS, and nothing on the
 * screen says so any more.
 */
export function NationalScaleView({
  view,
  icons,
}: {
  view: PeerView;
  /** Supplied by the caller, so this file draws no glyphs. */
  icons: { fortune: React.ReactNode; forbes: React.ReactNode; people: React.ReactNode };
}) {
  const { scale } = view;

  return (
    // Three across only at `lg`. At 768 the three groups fitted and "1.06 million"
    // broke across two lines mid-figure, which reads as two numbers.
    <div className="grid gap-8 lg:grid-cols-3 lg:gap-0 lg:divide-x lg:divide-border-inverse">
      <ScaleFigure
        icon={icons.fortune}
        value={formatCount(scale.fortuneGlobal500Count)}
        ofLabel={`of ${formatCount(FORTUNE_GLOBAL_500_SIZE)}`}
        label={SCALE.fortuneLabel}
        share={scale.fortuneGlobal500Share}
        shareLabel={`${formatShare(scale.fortuneGlobal500Share)} of the list`}
      />
      <ScaleFigure
        icon={icons.forbes}
        value={formatCount(scale.forbesGlobal2000Count)}
        ofLabel={`of ${formatCount(FORBES_GLOBAL_2000_SIZE)}`}
        label={SCALE.forbesLabel}
        share={scale.forbesGlobal2000Share}
        shareLabel={`${formatShare(scale.forbesGlobal2000Share)} of the list`}
      />
      {/* No bar: there is no denominator to draw this against, and a bar with
          nothing to be a share of is decoration. */}
      <ScaleFigure
        icon={icons.people}
        value={formatProfessionals(scale.fortuneGlobal500Professionals)}
        label={SCALE.peopleLabel}
      />
    </div>
  );
}
