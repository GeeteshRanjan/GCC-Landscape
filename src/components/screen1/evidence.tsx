import { type PeerView } from "@/data/screen1";
import { cn } from "@/lib/utils";
import {
  largestLine,
  largestShortfallLine,
  largestOverlapLine,
  peerCountLine,
  shortfallLine,
} from "./copy";
import { FortuneBadge } from "./fortune-badge";
import { usePublicCopy } from "@/components/public/copy-context";
import {
  Chip,
  formatCount,
  formatProfessionals,
  formatShare,
} from "@/components/public/primitives";
import {
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
 *   - **The function list** is a claim about MEMBERSHIP and nothing else, so it
 *     carries no mark and no rank. There is no per-company function record in this
 *     dataset, so a share beside each function would be invented — and the ordering
 *     the numbered tiles used to draw had nothing behind it either, so both are gone.
 *     The heading says "most GCCs" rather than "these companies" for the same reason.
 *   - **The Fortune and Forbes counts** are claims about FRACTIONS of known lists, so
 *     each states its share in its own sentence. It was drawn as a bar for one pass
 *     and the third figure has no denominator to draw, which left the row two marks
 *     and a gap.
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
 * **ONE ROW, one column per peer, and the twelve-column row packing is gone with the
 * multi-row grid it existed to fix.**
 *
 * The set was three cards then two, which is where the empty space came from: a
 * five-card set on a twelve-column grid cannot divide evenly, so the second row's cards
 * were half-width holding a third-width card's content, and the packing machinery
 * (`rowPlan`, `layoutFor`, per-card spans, a two-column card interior for the widened
 * ones) existed entirely to manage that. None of it is needed once every card is the
 * same width on one line.
 *
 * **What the single row buys beyond the space is the ORDER.** The set is in relevance
 * order and never re-sorted, so the ranking has to be legible — that is what the
 * `Match N` eyebrow was for, and before it the "Closest comparison" chip, and before
 * that a table's first row. On one line, left-to-right reading position states it for
 * free, which is the same thing a table row position did. So the eyebrow could finally
 * go, and it is the row that paid for it rather than a decision to claim less.
 *
 * The column count is the PEER COUNT, capped at five. A fixed `grid-cols-5` would leave
 * three empty cells for a two-company industry, which is the part-empty artefact this
 * whole area exists to avoid — and thin industries are exactly where it would show.
 */
const LG_COLS: Record<number, string> = {
  1: "lg:grid-cols-1",
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
  5: "lg:grid-cols-5",
};

/**
 * The odd last card widens to fill the TWO-column grid.
 *
 * Between `sm` and `lg` the grid is two equal columns, so an odd number of cards leaves
 * the last one alone beside an empty cell — and an empty cell in a grid of evidence
 * reads as a card that failed to load. Five peers is the ordinary case, so it showed at
 * 768 on every default result. Widening is the only move permitted here: never narrow,
 * never reorder, because a narrower card misrepresents what it draws and the order
 * carries relevance.
 *
 * It does NOT change the card's interior any more. Every card is the same width on the
 * single `lg` row, so the two-column interior variant that existed for widened cards is
 * gone — and at `sm` a full-width card simply has more room for the stacked one.
 */
const SM_SPAN_FULL = "max-lg:sm:col-span-2";

/**
 * The city list, as pills. Short, and there are rarely more than three.
 *
 * **Two consumers now, and the second one takes `sm`.** The comparison cards draw
 * these at full size, where the city list is one of three labelled facts about the
 * company. The largest-centres rows draw them as a quiet second line under a
 * one-line ranking row, beside a `sm` Fortune chip — a full-size pill there competes
 * with the company name it qualifies, which is the same reasoning that put the index
 * membership at `sm` on those rows.
 *
 * **The ranking's copies now take the `quiet` tone as well as `sm`, at ANSR's request.**
 * A comparison card gives the city list a labelled row of its own, so a filled grey pill
 * under black is the right weight for it. On a ranking row the same pill sits between the
 * company name and its own bar, three or four of them a row, five rows deep — and the
 * block read as marks arguing with marks. The size step was not enough on its own because
 * what competes is the ink and the fill, not the type size.
 */
function CityCells({
  cities,
  size = "md",
  tone = "neutral",
}: {
  cities: readonly string[];
  size?: "md" | "sm";
  tone?: "neutral" | "quiet";
}) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {cities.map((city) => (
        <Chip key={city} size={size} tone={tone}>
          {city}
        </Chip>
      ))}
    </span>
  );
}

/**
 * A comparison card's interior. One column, one width, every card the same.
 *
 * **The two-column variant is gone with the multi-row grid it served.** It existed
 * because the twelve-column packing widened some cards to a half or the whole row, and a
 * widened card holding a narrow card's interior is a box with content in its leading
 * half. Every card is now one fifth of a single row, so there is one interior and
 * nothing to branch on — which also removed the `wide`/`smWide` pair and the vertical
 * divider that only the wide variant drew.
 *
 * The order is figure, cities, year: what the card exists for, then where, then since
 * when. Separated by space rather than by rules, because a horizontal rule inside a card
 * has to line up with the same rule in the four cards beside it and cannot, since city
 * lists wrap to different depths.
 */
function PeerCardBody({
  peer,
}: {
  peer: { headcount: string; cities: readonly string[]; establishedYear: number };
}) {
  /**
   * **The three labels are published copy, read here rather than threaded from
   * `PeerBlockView`.** This is the component that draws them, and the alternative is a
   * `labels` prop on a component whose parent maps over five peers — five copies of a
   * value that is the same for all five, passed through a boundary that exists to
   * describe one card.
   *
   * `peerHeadcountLabel` is drawn TWICE on this surface: here, and as the ranking's
   * column header 400px below. One key, so an edit moves both — the two figures are the
   * same quantity, and a reader crossing from the cards to the ranking must not meet two
   * names for it. See `LargestBlockView`.
   */
  const copy = usePublicCopy();

  return (
    // `h-full` so the body fills the card and `mt-auto` on the year has something to
    // push against — without it the flex column is only as tall as its content and the
    // auto margin has no free space to absorb.
    <div className="flex h-full flex-col gap-3.5">
      {/* **The figure the card exists for, and its label now says GCC.** "India
          employees" was ambiguous in the one way that matters on this screen: it could
          be read as the company's whole Indian workforce rather than the headcount of
          the centre this page is about. Every label on the card names the GCC for the
          same reason — a reader should not have to infer the subject from the section
          heading two hundred pixels up. */}
      <CardFact label={copy.peerHeadcountLabel}>
        {/* 20/24px, down from 24/30. Five cards on one row are about 205px wide at
            1440, and "59,900–60,000" at 30px overflowed its own cell — the figure has
            to fit the column it is the subject of. It is still the largest thing on the
            card, which is the ordering that matters: the company name above it is 16/18
            and Medium.

            Teal, not orange: the orange role on this surface belongs to the snapshot's
            figures and the terminating strip's, and five orange figures here would be a
            third band claiming the role. */}
        <p className="text-xl leading-none font-bold tracking-display text-accent-teal tabular-nums md:text-2xl">
          {peer.headcount}
        </p>
      </CardFact>
      {/* **"Cities", with "GCC" dropped, at ANSR's request.** Three of the card's four
          labels opened on the same three letters — "GCC headcount", "GCC cities", "GCC
          since" — which is the word repeated three times inside 120px on a card whose
          own section heading is "India GCCs closest to your profile". The subject is
          named by the heading and again by the figure's own label directly above this
          one, so a third statement of it is a prefix rather than information. */}
      <CardFact label={copy.peerCitiesLabel}>
        <CityCells cities={peer.cities} />
      </CardFact>
      {/* **"GCC since 2002", not "Established 2002".** The year is when the CENTRE was
          established, not the company — and on a card about JPMorgan Chase, "Established
          1799" is what a reader half-expects, so the old label was actively misleading.
          No `tabular-nums`: one year, inline, with no column to align to.

          **NOT pinned to the card's foot, and this was tried both ways in one sitting.**
          `mt-auto` makes all five years share a baseline across the row, which looks
          deliberate — and it buys that alignment by opening the slack ABOVE itself, so a
          card with two city chips beside one with six shows 60px of dead white between its
          chip list and its year. A gap in the middle of a card reads as a card that failed
          to load; the same gap collected at the card's bottom edge reads as padding, which
          is the whole reason the horizontal rule and its `mt-auto` came off in the first
          place. Five years at five heights is the cheaper artefact, and with the cards
          stretched to one height the difference is at most two chip rows. */}
      {/* **"In India since", with "GCC" dropped, at ANSR's request** — and the
          replacement had to keep what "GCC since" was protecting. The year is the
          CENTRE's, not the company's, so a bare "Since 1799" on a JPMorgan Chase card is
          exactly the misreading the label exists to prevent. "In India since" says the
          same thing without the third "GCC" on the card: the company has been in India
          since that year, which is true of the centre and cannot be read as the founding
          date. */}
      {/* **The label and the year are two elements, so the label is a PREFIX rather than
          a template.** There is no placeholder for an admin to move the year to the front
          of, and an edit cannot detach the two: whatever the field says, the year follows
          it in the same sentence, in the same weight. */}
      <span className="text-sm text-text-muted">
        {copy.peerSinceLabel}{" "}
        <span className="font-semibold text-text">{peer.establishedYear}</span>
      </span>
    </div>
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
  const columns = LG_COLS[Math.min(peers.length, 5)] ?? LG_COLS[5]!;

  return (
    <div className="flex flex-col gap-5">
      {/* One row at `lg`, one column per peer. Two columns between `sm` and `lg`, one
          below — a 205px card is the floor for a five-digit range, so the row can only
          exist where there is room for five of them. */}
      <ul className={cn("grid gap-3 sm:grid-cols-2 lg:gap-4", columns)}>
        {peers.map((peer, index) => (
          <li
            key={peer.id}
            className={cn(
              "min-w-0",
              // The odd last card fills the two-column row rather than sitting beside an
              // empty cell. Only between `sm` and `lg`; on the single row there is no
              // remainder to pack.
              index === peers.length - 1 && peers.length % 2 === 1 && peers.length > 1
                ? SM_SPAN_FULL
                : "",
            )}
          >
            <article
              className={cn(
                /**
                 * **A white fill on the mint zone, and nothing else — no border, no
                 * shadow, no radius.** This is the brand board's own card, read off a
                 * render of `Group 149.svg` rather than off a description: its three
                 * white model cards sit on a mint ground at TRUE ZERO radius with no
                 * border and no shadow anywhere, because the fill against the tint IS
                 * the boundary. It had `rounded-lg`, a hairline and `shadow-xs`, which
                 * is three devices doing one card's separation.
                 *
                 * **The earned-border rule agrees with the board here, which is why
                 * this is safe.** A `Panel` keeps its hairline because it draws a MARK
                 * and a bar's full width means nothing without an edge to measure
                 * against. These cards draw no mark — their bars went at ANSR's request
                 * and the headcount band is a figure now — so there is nothing here for
                 * an edge to measure, and the zone supplies the boundary.
                 *
                 * **`gcc-lift` is gone from here.** A 2px rise and a deeper shadow on
                 * hover is an affordance, and these cards are not interactive: there is
                 * nothing to press, no link, no disclosure. Eleven objects on this
                 * surface carried it and none of them did anything, which teaches a
                 * reader that a lift means nothing here — and then the two controls that
                 * ARE pressable have no gesture of their own.
                 */
                "flex h-full min-w-0 flex-col gap-3.5 rounded-none bg-surface p-4",
              )}
            >
              <div className="flex min-w-0 flex-col gap-1.5">
                {/* **No ordinal at all, and the single row is what paid for it.**
                    It was a `Match N` eyebrow, and before that a mint-filled square
                    counter, and before that a "Closest comparison" chip — three
                    attempts at the same problem, which is that relevance order is
                    never re-sorted and a multi-row grid has no row position to carry
                    it. On one line, left-to-right reading position states the order
                    for free, exactly as a table's row position did. So the eyebrow is
                    not a claim given up; it is a claim the layout now makes.

                    What it also removes is a line of small-caps grey above every one
                    of five company names, which was the first thing the eye met on
                    each card and said nothing a reader wanted. */}
                {/* **A REAL mark when one resolves, the name alone when it does not,
                    and NOTHING reserved either way.** No initial, no monogram, no
                    coloured square with a letter, no empty placeholder box — those
                    were always the banned cases and they stay banned, because each is
                    a fabricated identity or a visible gap.

                    **The absent case is ROUTINE, not exceptional.** The provider
                    resolves 86–95% of brands and the tier is off entirely with no
                    client ID configured, so a row of five mixing marks and bare names
                    is the normal rendering. That is why there is no `min-h` and no
                    placeholder here: an unmarked card is a complete card, identical to
                    how this screen rendered before marks existed.

                    `markUrl` is resolved in `screen1.ts` via `company-mark.ts`. This
                    component knows no provider, holds no client ID and picks no
                    source. */}
                {peer.markUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element -- a
                     third-party origin the optimiser cannot process, and the box is
                     already fixed by the resolver. */
                  <img
                    src={peer.markUrl}
                    /* **Empty alt, and this is the one case where that is correct.**
                       The company name is the very next element, as a real heading, so
                       the mark is a second reading of text already present — naming it
                       again would make a screen reader say the company twice. Same
                       reasoning as an `aria-hidden` chart mark. */
                    alt=""
                    width={128}
                    height={40}
                    /* Both caps plus `object-contain`, the customer strip's treatment.
                       A fixed height alone renders a 4.9:1 wordmark six times the
                       optical weight of a 0.8:1 stacked mark, so the row would read as
                       one company shouting. */
                    className="h-7 w-auto max-w-28 object-contain object-left md:h-8"
                    /* A brand the provider does not hold returns 404 by request, so
                       nothing renders rather than a generic letter tile — which would
                       be the monogram this card refuses to draw. */
                    loading="lazy"
                    decoding="async"
                  />
                ) : null}
                <h3 className="min-w-0 text-base leading-snug font-semibold text-pretty text-text md:text-lg">
                  {peer.name}
                </h3>
                {/* The index membership, beside the name it is a fact about. Where every
                    peer carries it, it becomes one line under the grid instead — a badge
                    every card has is not a badge.

                    **Fortune's own badge rather than an accent chip**, at the project
                    owner's instruction, including the colour rule it sits outside. It is
                    sized to the row it sits in rather than to the artwork — see
                    `FortuneBadge`. The `<span>` is load-bearing: an `<img>` in this flex
                    column stretches to the card's width without it. */}
                {showFortune && peer.fortuneGlobal500 ? (
                  <span>
                    <FortuneBadge />
                  </span>
                ) : null}
              </div>
              <PeerCardBody peer={peer} />
            </article>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-3">
        {/* Exact both sides. The cohort is the population the peers were drawn from,
            not the whole industry — see `peerCountLine`. */}
        {/* No `tabular-nums`. It aligns digits into columns and this is a sentence —
            the feature was applied across this surface by habit, including to a city
            name, and where nothing aligns it only widens the figures. What keeps it is
            a real column: the containment chart's stacked figures and the ranked rows'
            trailing figures. */}
        <p className="text-sm font-medium text-text">{peerCountLine(view)}</p>
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
   * **Three layers, always, and the third one changes FORM rather than going
   * missing.** With a sub-industry answered the innermost layer is that cohort — a
   * real population, so it draws as a proportional bar like the two behind it.
   * Without one it is the comparison set, which is a SELECTION of five, and five of
   * 1,834 is 0.27%: a length cannot carry it at any width, so it draws as a position
   * marker instead. See `Containment` for the arithmetic and for why no scale fixes
   * it.
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
      /**
       * **The extent the MARKER may not draw past, which is the industry's — not a
       * share of its own.** A marker states a position rather than a quantity, so
       * what it needs from the data is how much room it has before it would be
       * outside the population it is marking. Passing `shown / base` here would be
       * the old 0.27% back, expressed as a cap nothing reads.
       */
      share: share(Math.min(total, base)),
      marker: true,
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
 * The upper end of the industry, as a compact ranked chart.
 *
 * **It was a stack of company CARDS and the cards were the duplication.** At the top
 * revenue band the largest centres overlap heavily with the comparison set — three of
 * these five are JPMorgan Chase, Wells Fargo and Citigroup, which the visitor read a
 * screen earlier — and each row restated that company's headcount range, its city
 * list and its establishment year in a bordered card the same size as the one above.
 * A chip reading "Also in your peer set" admitted the repeat rather than resolving it.
 *
 * **Both blocks are legitimate and neither could be deleted.** One answers "who is
 * comparable to you" and the other "what the top of this industry looks like". What
 * was redundant was never the NAMES or the ORDER — JPMorgan Chase being the largest
 * BFSI centre in India is a different fact from its being the closest comparison —
 * but the card around them. So the row is now the minimum a ranking needs: the
 * position, the name, the figure, and the bar. The city list and the establishment
 * year are gone with the card; neither is part of a claim about size, and the map
 * band carries where the industry is.
 *
 * That turns the overlap from an apology into the finding. A row a reader recognises
 * inside a ranking of the industry's biggest centres tells them something new — that
 * their comparison set IS most of the upper end — and `largestOverlapLine` states it
 * in one sentence under the chart.
 *
 * **No per-row emphasis, and the bars run the full width of the card.** The leading
 * bar was drawn a step darker on the strength of being first, which the position
 * numeral and the order already say; and the bars were confined to a 224px column at
 * the row's trailing end, where 71% against 53% is 40px of difference next to a 350px
 * gulf of nothing. Full width, the same four figures are 200px apart and the shape of
 * the industry — one company far ahead, then a plateau — is the reading.
 *
 * The bar is a share against the largest in this set and the visible figure stays the
 * employee band: a ratio derived from band midpoints is honest as a length and would
 * not be honest as a published number. No axis note, because a ranking sorted by the
 * quantity its own bars encode states its axis in row one.
 */
export function LargestBlockView({ view }: { view: PeerView }) {
  // Two of the comparison card's three labels are drawn here as well — the column
  // header over the figures, and the year chip on each row. Same keys, because they name
  // the same two quantities; see `PeerCardBody`.
  const copy = usePublicCopy();
  const { entries, repeatsPeers } = view.largest;
  const line = largestLine(view);

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
  const overlap = largestOverlapLine(view);

  return (
    <div className="flex flex-col gap-5">
      {/* Only when the ranking had to walk down the revenue bands, which three
          industries do. The general case says nothing here — the section's own
          heading covers it. */}
      {view.largest.belowTopBand ? (
        <p className="max-w-measure text-sm text-text">{line}</p>
      ) : null}

      {/* **A column header, because nothing on the block said what the figure IS.** Five
          ranges at 20px down the trailing edge, over five bars, under a heading that says
          "largest" — a reader could take them for revenue, for the company's Indian
          workforce, or for the whole company. The section's own heading cannot carry it
          (it names the subject, not the quantity) and the count line that might have was
          removed at ANSR's request.

          One label over a column of five is the cheapest place to say it: the same
          small-caps treatment the comparison cards use for exactly this job, aligned to
          the edge the figures share. `justify-end` rather than `justify-between` — there is
          no leading column to label, since the names are self-evident.

          **`peerHeadcountLabel`, the same key the comparison card's own label reads.** The
          two figures are the same quantity in the same treatment, so two keys would let an
          edit give one quantity two names on one page. */}
      <div className="flex justify-end">
        <span className="text-[0.6875rem] font-semibold tracking-caps text-text-muted uppercase">
          {copy.peerHeadcountLabel}
        </span>
      </div>

      {/* Still an `<ol>`, and here that is a claim the block can support: the order
          IS the quantity the bars encode. Screen 1's function list went the other way
          — from `<ol>` to `<ul>` — for the opposite reason, that nothing measured its
          order. */}
      {/* **Rows sit further apart than the lines inside one, which they have to now
          that a row is three lines rather than two.** At 10px between rows and 6px
          inside, a tag line was as close to the bar beneath it as to the next row's
          name — so the block read as fifteen loose lines instead of five rows. 16px
          out, 6px in. */}
      <ol className="flex flex-col gap-4">
        {entries.map((entry) => (
          // 4px between the name and the tag-and-figure line, against 16px between rows.
          // It was 6px and the rendered gap read as about 15px: the name's own line box is
          // 28px around 18px of text at the default leading, and `items-end` on the line
          // below drops the pills to the bottom of a 24px figure line, so two invisible
          // half-gaps were stacked on the declared one. The h3 takes `leading-tight` for
          // the same reason — see below.
          <li key={entry.company.id} className="flex flex-col gap-1">
            {/* The name and its two markers, and nothing at the trailing edge any more:
                the figure moved down to sit against its own bar, so the split row that
                held the two apart has no second column left to justify. */}
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-1">
              {/* **No position numeral, at ANSR's request, and the shape can carry
                  its loss.** It was a zero-padded display numeral inline before the
                  name — the one ordinal on the surface that kept its place beside the
                  heading rather than moving above it, because on a ranking the position
                  genuinely is part of the subject.

                  What replaces it is what was always doing the work: the rows are
                  sorted by the quantity their own bars encode, so the first row draws a
                  full-width bar and every row below it draws a shorter one. Position is
                  legible from the bars alone, which is the same argument that let the
                  comparison cards drop `Match N` once they were on one line. The `<ol>`
                  stays, because the order is still a claim the block makes. */}
              {/* `leading-tight`, because the default leading on this step is 28px around
                  18px of glyph and the extra 10px sits between the name and the pills
                  under it as space nothing declared. Safe here where it would not be on a
                  comparison card: a ranking row's name is one line, so there is no second
                  line for the tighter leading to crowd. */}
              <h3 className="min-w-0 text-base leading-tight font-semibold text-text md:text-lg">
                {entry.company.name}
              </h3>
              {/* **The overlap marker, and its job changed with its wording.** As
                  "Also in your peer set" on a duplicate card it admitted the repeat.
                  On a chart row it is the thing that lets a reader map this ranking
                  onto the set they were given — and the sentence under the block
                  states what the mapping amounts to. Quiet text rather than a pill:
                  three pills down five one-line rows is more chrome than the rows
                  themselves. */}
              {entry.alsoPeer ? (
                <span className="text-xs font-medium text-text-muted">
                  in your comparison set
                </span>
              ) : null}
              {/* **`self-center`, and the wrapper is what carries it.** The row is
                  `items-baseline`, which is right for the name and the overlap note and
                  wrong for a replaced element: an image's baseline is its bottom edge, so
                  the badge would sit ON the name's baseline rather than level with it,
                  which at cap height reads as a mark that has slipped a line. Centred,
                  it sits inside the name's own band and the row does not grow at all. */}
              {!allFortune && entry.company.fortuneGlobal500 ? (
                <span className="self-center">
                  <FortuneBadge />
                </span>
              ) : null}
            </div>
            {/* **The cities and the year are back, as tags, at ANSR's request — and the
                shape they come back in is what keeps the earlier objection answered.**
                They were dropped with the company CARD, because a bordered card
                restating a company's city list, band and year 200px under the card that
                had already said all four was a third of the page as the same data twice.
                The duplication was the card, not the fields: as one quiet line of pills
                under a one-line ranking row they cost about 26px and they answer the
                question the ranking otherwise leaves — a reader who recognises a name
                from the set above still has to know WHERE the industry's biggest centres
                are and how long they have been here.

                `sm` chips and a muted year, so they sit under the name rather than beside
                it: the row's own subjects are the name and the figure, and these are
                qualifiers. The year is a chip too rather than the comparison card's
                sentence — on a ranking row a sentence would be the only prose in a
                column of marks — and it keeps "In India since" in full for the reason
                the card does, that a bare year on a JPMorgan Chase row reads as 1799. */}
            {/* **The tags, the figure and the bar are ONE group, and the tags share a
                LINE with the figure rather than sitting on their own.** Three
                arrangements were tried and each fixed the last one's artefact. The figure
                began at the trailing end of the NAME row, which was right while a row was
                two lines. The tag line then pushed the pills between the figure and its
                own bar, leaving the number nearer the company name than the mark it is
                the value of — the one arrangement a ranking cannot afford, since every
                bar is a second reading of the figure above it. Moving the figure down to
                the bar then left the pills with a 30px void beneath them across the
                card's whole leading half: the figure occupies only the trailing edge, so
                its line is empty everywhere the tags had just been.

                On one line there is no void and no orphaned figure. `items-end` so the
                pills land on the figure's own baseline rather than floating at the top of
                a 24px line; `justify-between` because the figure belongs over the edge
                the bar's trailing end is measured to, and the tags over the edge it
                starts from. 4px to the bar, tighter than anything else in the row, which
                is what says these two are a pair. */}
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1.5">
                <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                  {/* **`quiet` as well as `sm`, at ANSR's request.** These pills are a
                      qualifier on a row whose subject is the name above them and whose
                      evidence is the bar below them; at the neutral weight, four filled
                      grey pills a row over five rows were the heaviest thing in the block
                      after the figures. See `Chip`'s `quiet` tone for the measurement —
                      the ink gets lighter and the contrast goes UP. */}
                  <CityCells cities={entry.company.cities} size="sm" tone="quiet" />
                  <Chip size="sm" tone="quiet">
                    {copy.peerSinceLabel} {entry.company.establishedYear}
                  </Chip>
                </div>
                {/* **The same treatment as the comparison card's figure, and it is one
                    decision rather than two.** Both figures are the SAME QUANTITY — a GCC
                    headcount band, under a small-caps "GCC headcount" label — so a reader
                    crossing from the cards to the ranking is reading one kind of fact, and
                    it was set two ways: 18/20px near-black here against 20/24px accent
                    teal there. Near-black at Bold is the heaviest ink on the surface,
                    which is why five of them read as shouting rather than as evidence; the
                    teal is the same weight and reads as a figure. Matching also fixes the
                    step, so the ranking's figure is not a size the surface uses nowhere
                    else. */}
                {/* `ms-auto` as well as `justify-between`, because the two do different
                    jobs and only one of them survives a wrap. Where the pills fill the
                    line — HSBC carries six cities — the figure wraps onto a line of its
                    own, and `justify-between` on a single-item line puts it at the
                    LEADING edge: the figure column breaks on exactly the row with the
                    most to say. The auto margin pins it to the trailing edge either
                    way. */}
                <p className="ms-auto text-xl leading-none font-bold tracking-display text-accent-teal tabular-nums md:text-2xl">
                  {entry.company.headcount}
                </p>
              </div>
              {/* Full width, and no emphasis on any row. One shared axis is what makes
                  the five comparable, and the axis is the row above it. */}
              <BarTrack share={entry.company.sizeShare} />
            </div>
          </li>
        ))}
      </ol>

      <div className="flex flex-col gap-3">
        {/* **`largestCountLine` is no longer rendered, at ANSR's request.** It read "The
            5 largest BFSI GCCs in our India data." directly under a five-row ranking whose
            heading is "The largest BFSI GCCs in India" — a restatement of the heading with
            the row count in front of it, which the reader can see. It is kept in `copy.ts`
            and still unit-tested, so restoring it is one line.

            The SHORTFALL clause used to be appended to it and does not go with it: a
            ranking three short of its own limit has to say so. It is `largestShortfallLine`
            now, and it renders only where it fires. */}
        {largestShortfallLine(view) ? (
          <p className="max-w-measure text-sm font-medium text-text">
            {largestShortfallLine(view)}
          </p>
        ) : null}
        {/* **The overlap, as a finding rather than as a repeated chip.** This is what
            the three marked rows add up to, and it is the sentence that makes the
            repetition worth having: a visitor whose comparison set is most of the
            industry's upper end has learnt something the peer block could not tell
            them. Absent when nothing overlaps, and unreachable when everything does —
            `repeatsPeers` collapses the whole block in that case. */}
        {overlap ? (
          <p className="max-w-measure text-sm text-text">{overlap}</p>
        ) : null}
        {/* **No axis note.** It said "Full width is JPMorgan Chase, at
            59,900–60,000" under a stack whose first row is JPMorgan Chase, drawing a
            full-width bar, with that band beside it at 24px. On a ranking sorted by
            the quantity the bars encode, row one is the axis — so the sentence
            restated a name and a figure the reader had passed four rows earlier. */}
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
 * **The numbering is gone, and so is the `<ol>` under it.** Eight tiles each carrying
 * a rank badge drew the one quantity the block cannot honestly claim: the list is
 * hardcoded, `COMMON_FUNCTIONS_BASIS` was deleted, and there is no per-company
 * function record to derive a frequency from. A rank in the same square badge the
 * comparison cards use borrowed those cards' authority for a number nothing measured
 * — and the lead said "most to least common" beside it, so the two reinforced each
 * other. Both are gone together.
 *
 * The element changed with them rather than only the badge. An ordered list IS an
 * ordering claim: it is announced as one to a screen reader and it survives the badge
 * being deleted, so a `<ul>` is what makes the block silent about order in every
 * reading of it rather than just in the visual one.
 *
 * ## Why it is a list of rules rather than eight boxes
 *
 * **It was eight bordered tiles on a pale fill, each holding one string and nothing
 * else, each with a hover lift.** That is the container reflex in its purest form and
 * it made this the weakest block on the surface. A border says "this is an object with
 * properties"; there are no properties. A `gcc-lift` says "this does something"; it
 * does not. And a heading that deliberately claims no share and no order sat above
 * eight equally weighted cells that implied both — eight things the reader was
 * apparently meant to compare, or operate.
 *
 * A hairline row per function was the second shape and it fixed the borders without
 * fixing the grid: eight strings of very different lengths in fixed columns means every
 * column is as wide as the longest item in the block, so short items sat in cells two
 * thirds empty while the longest still wrapped to two lines. Ragged and short of room at
 * the same time, at every column count eight items may take — two is the same defect at
 * twice the width, and three would leave the last row a cell short.
 *
 * **The third shape is a wrapping set of tags, and it has no grid in it at all.** A tag
 * sizes to its own content, so there is no cell to be part-empty, nothing wraps
 * internally, and the set reflows from one line to four across the breakpoints without a
 * column count anywhere. The block goes from roughly 240px to about 90px, and it still
 * claims exactly nothing: no numeral, no bar, no mark, no hover state, and a `<ul>`.
 */
export function CommonFunctionsView({ view }: { view: PeerView }) {
  return (
    /**
     * **A wrapping set of tags, and the four-column ruled grid it replaces failed for a
     * reason a column count cannot fix.** Eight strings of very different lengths in a
     * fixed grid means every column is as wide as the longest item in the block, so
     * "Human resources" occupied a 270px cell holding 110px of text while the longest
     * item still wrapped to two lines — the block was simultaneously ragged and short of
     * room. Two columns is the same defect at twice the width; three is unavailable,
     * since eight items would leave the last row a cell short.
     *
     * A tag sizes to its own content, so there is no cell to be part-empty and nothing
     * wraps. The set reflows from one line to four across the breakpoints without a
     * column count anywhere in it, and the block's height falls from roughly 240px to
     * about 90px.
     *
     * **It is a tag rather than a chip because of what it must NOT say.** The block
     * claims no order and no share — there is no per-company function record in this
     * dataset — so the tag carries no numeral, no bar, no leading mark and no hover
     * state, and the list stays a `<ul>`. What a set of equal, unranked, unclickable
     * tags says is "these are in scope", which is the whole of the claim.
     *
     * The fill is `--ansr-surface` on the mint zone, which is the same relationship the
     * city chips on the comparison cards use and the reason there is no border: a white
     * pill on the tint is already a shape, and a hairline on top of it would be the
     * second edge the ruled version was drawing.
     */
    <ul className="flex flex-wrap gap-2 md:gap-2.5">
      {view.functions.map((fn) => (
        <li key={fn} className="min-w-0">
          {/* `whitespace-nowrap` is what guarantees the shape: a tag that wraps
              internally is a two-line pill, which is the artefact this replaced. The
              items run 16 to 28 characters, so the widest sets at about 215px — inside a
              278px content box, which is the narrowest this surface renders at 320.

              **No leading mark, no numeral, no bar.** A numeral would be the removed
              rank badge back, and the block claims no order — which is why the list is
              still a `<ul>`. A bullet or an icon would be decoration on the one block
              that deliberately carries no quantity. */}
          <span className="inline-flex items-center rounded-full bg-surface px-3.5 py-2 text-sm font-medium whitespace-nowrap text-text shadow-xs">
            {fn}
          </span>
        </li>
      ))}
    </ul>
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
  label,
}: {
  icon: React.ReactNode;
  value: string;
  /**
   * The predicate of a sentence whose subject is `value`. Read together they are one
   * whole sentence — which is what neither of the first two cells was: each opened
   * with "of the …", after a standalone "of 500" beside the figure had already given
   * the denominator once.
   */
  label: string;
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
        {/* **Orange, and this is the page's second stat-figure band rather than a
            second decision.** The board's dark-ground stat is exactly this shape — a
            figure in the action orange over a white predicate ("7" / "days to hire") —
            and using it here bookends the surface: it opens on four orange figures in
            the snapshot and closes on three, with the teal evidence between them. A
            page whose only warm mark was in its first 200px was the monotone complaint
            in a different form.

            `text-action`, the ANCHOR, not `--ansr-accent-warm`: on this ground the
            relationship inverts. The anchor is 4.77:1 on the inverse fill and clears
            AA for normal text, while the deep step is 2.44:1 and is a light-ground ink
            only. So both bands use the anchor and each does so for its own measured
            reason — size buys it on white, the ground buys it here. */}
        <p className="text-3xl leading-none font-bold tracking-display text-action tabular-nums md:text-4xl">
          {value}
        </p>
        <p className="text-sm text-text-inverse text-pretty">{label}</p>
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
  /**
   * **All three labels are published copy, and each is the PREDICATE of a sentence whose
   * subject is the figure above it.** That is what the 120/140-character caps in
   * `publicCopySchema` are protecting: a label long enough to wrap to a third line stops
   * reading as one sentence with the number, which is the whole construction of this
   * strip.
   *
   * The two index names are the one thing an edit here can genuinely break — "Fortune
   * Global 500" and "Fortune 500" are different lists with different membership, and the
   * figure is a count over the former. `screen1.test.ts` asserts the shipped wording
   * names each index in full; an admin edit is not checked by anything.
   */
  const copy = usePublicCopy();
  const { scale } = view;

  return (
    // Three across only at `lg`. At 768 the three groups fitted and "1.06 million"
    // broke across two lines mid-figure, which reads as two numbers.
    <div className="grid gap-8 lg:grid-cols-3 lg:gap-0 lg:divide-x lg:divide-border-inverse">
      {/* **No proportion bars, on any of the three.** The first two carried one and
          the third could not — there is no denominator for a headcount sum — so the
          row read as two figures with a mark and a share caption beside one figure
          missing both, which is the part-empty artefact this surface removes
          everywhere else. The share itself is not lost: it is inside the sentence,
          rounded once by `formatShare` exactly as the caption was. */}
      {/* **Neither label states a share now**, at ANSR's request — the "36% of the
          list" and "24% of the list" clauses are gone. The denominator is still on the
          line, inside the index name. */}
      <ScaleFigure
        icon={icons.fortune}
        value={formatCount(scale.fortuneGlobal500Count)}
        label={copy.scaleFortuneLabel}
      />
      <ScaleFigure
        icon={icons.forbes}
        value={formatCount(scale.forbesGlobal2000Count)}
        label={copy.scaleForbesLabel}
      />
      {/* The union of the two memberships, counted once each. It was the Fortune Global
          500 subset alone, under two cells naming two indices. */}
      <ScaleFigure
        icon={icons.people}
        value={formatProfessionals(scale.indexedProfessionals)}
        label={copy.scalePeopleLabel}
      />
    </div>
  );
}
