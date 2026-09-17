import { useState } from "react";
import { ChevronRight } from "lucide-react";

import { type PeerView } from "@/data/screen1";
import { cn } from "@/lib/utils";
import {
  largestLine,
  largestShortfallLine,
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
export function CityCells({
  cities,
  size = "md",
  tone = "neutral",
  ground = "surface",
  max,
}: {
  cities: readonly string[];
  size?: "md" | "sm";
  tone?: "neutral" | "quiet";
  /**
   * **TEMPORARY, and it is `Chip`'s own prop passed through rather than a new decision.**
   * Both shipped placements draw these on a white card, so the ground was never in
   * question; one candidate treatment of the peer section draws the card in teal-deep,
   * where a filled grey pill inverts wrongly and `Chip` already has the outlined form for
   * it. Goes with `peers-variants.tsx` if that treatment is not chosen.
   */
  ground?: "surface" | "tint" | "inverse";
  /**
   * **The most cities to show before the rest collapse into a "+N" pill, at ANSR's
   * request.** A comparison card is one fifth of a row, so a company in six cities used
   * to draw six pills that wrapped to three lines — and five cards wrapping to different
   * depths is the misalignment that made the block read as ragged rather than as a set.
   * Capping the count keeps every card's city row one line tall, which is the symmetry
   * the request is about; the cities are already in prominence order (see
   * `orderCitiesByProminence`), so the ones a reader cares about are the ones that show.
   *
   * Left undefined the list draws in full, which is every placement that is not a
   * space-constrained card.
   */
  max?: number;
}) {
  return (
    <span className="flex flex-wrap gap-1.5">
      <CityOverflow
        cities={cities}
        size={size}
        tone={tone}
        ground={ground}
        max={max}
      />
    </span>
  );
}

/**
 * The city pills, plus a "+N" disclosure pill when the list is capped.
 *
 * **The overflow pill is a real button, so the hidden cities are reachable by hover AND
 * by press**, which is what ANSR asked for: the `title` names them on hover, and a press
 * expands the list in place. It carries an `aria-label` that reads the hidden names, so
 * the count is not the only thing announced — a screen reader hears "and 2 more: …"
 * rather than a bare "+2".
 *
 * It is the same rounded pill as the cities it stands in for — `Chip`'s `quiet` tone at
 * the row's own size — so it reads as part of the same line rather than as a control
 * dropped into it. Once expanded it is gone: the full list is showing, so there is
 * nothing left to disclose.
 */
function CityOverflow({
  cities,
  size,
  tone,
  ground,
  max,
}: {
  cities: readonly string[];
  size: "md" | "sm";
  tone: "neutral" | "quiet";
  ground: "surface" | "tint" | "inverse";
  max?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const capped =
    max !== undefined && !expanded && cities.length > max ? max : cities.length;
  const shown = cities.slice(0, capped);
  const hidden = cities.slice(capped);

  return (
    <>
      {shown.map((city) => (
        <Chip key={city} size={size} tone={tone} ground={ground}>
          {city}
        </Chip>
      ))}
      {hidden.length > 0 ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          title={hidden.join(", ")}
          aria-label={`Show ${hidden.length} more ${
            hidden.length === 1 ? "city" : "cities"
          }: ${hidden.join(", ")}`}
          className={cn(
            "inline-flex items-center rounded-full font-medium",
            "transition-colors duration-fast ease-standard",
            "focus-visible:ring-2 focus-visible:ring-accent-teal focus-visible:outline-none",
            size === "sm"
              ? "px-2 py-0.5 text-[0.6875rem] leading-snug"
              : "px-2.5 py-1 text-xs",
            ground === "inverse"
              ? "border border-border-inverse text-text-inverse-muted hover:text-text-inverse"
              : "bg-surface-sunken text-text-muted hover:text-text",
          )}
        >
          +{hidden.length}
        </button>
      ) : null}
    </>
  );
}

/**
 * A company's mark, wherever one is drawn on this surface.
 *
 * **Two consumers, so ONE piece of markup**, on the same reasoning as `CityCells` above:
 * the comparison card and the largest-centres ranking both draw a company's logo, and two
 * copies of an `<img>` with two sets of caps is how the same mark ends up two sizes.
 *
 * **Every rule the mark has to obey lives here.** `alt=""` because the company name is
 * always the adjacent element as a real heading, so naming the mark would make a screen
 * reader say the company twice — the same argument that makes a chart mark `aria-hidden`.
 * Both a height AND a width cap plus `object-contain`, because a single height renders a
 * 4.9:1 wordmark at six times the optical weight of a 0.8:1 stacked mark; that is
 * measured on the customer strip and it is why the resolver requests a fixed box.
 *
 * **ON A COMPARISON CARD THE MARK'S HEIGHT IS RESERVED WHETHER OR NOT ONE RENDERS, at the
 * project owner's instruction, and this reverses the earlier rule.** The absent case is
 * ROUTINE — most of a five-card row can come back unmarked — and while a card without one
 * is still a complete card, it is a card whose name, figure and every row beneath it sit a
 * mark's height higher than its neighbour's. Five cards on one row are read across, so the
 * misalignment lands on the figure the block exists to compare. Reserving the box costs an
 * empty band on an unmarked card; not reserving it costs the row's own baseline.
 *
 * **What is reserved is SPACE and nothing else** — no fill, no border, no hatch, no
 * monogram. Every one of those is the placeholder tile this surface still refuses, and the
 * distinction is the whole reason this is acceptable: an empty band reads as air, a drawn
 * box reads as a slot that failed to load.
 *
 * **A ranking row reserves NOTHING**, because its mark leads the row on one line: reserving
 * there would indent every unmarked company's name past its own bar for no gain, and the
 * row's vertical rhythm is set by the text either way.
 *
 * **A FIXED TILE WITH THE LOGO CENTRED INSIDE IT WAS TRIED AND REVERTED, and the reason is
 * worth keeping because it will look tempting again.** A provider mark is letterboxed into
 * the box the resolver ASKS for, so every mark arrives at one ratio and this component only
 * has to cap it. Committed files are cropped to their own ink, so their ratios are the
 * artwork's — 0.78:1 to 5.18:1 — and capping height alone let the footprint run 25px to
 * 112px. Rebuilding the provider's box in CSS fixed that and cost more than it bought: a
 * drawn tile is only uniform where a logo EXISTS, so an unmarked row showed a hole beside a
 * marked one, and the sizes needed to make a tile legible pushed the ranking's rows taller.
 * The mark tier is the provider's again and the box below is a CAP, not a tile.
 *
 * `md` is the comparison card, where the mark sits above the name and is the card's
 * introduction. `sm` is a ranking row, where it sits BEFORE the name on one line and is a
 * recognition aid rather than a subject — so it is deliberately smaller than the name it
 * precedes.
 */
export function CompanyMark({
  src,
  size = "md",
}: {
  src: string | null;
  /**
   * **`lg` is TEMPORARY and belongs to one candidate treatment of the peer section**, the
   * one that makes the mark the card's subject rather than its introduction. It is a
   * third entry in the box table below and nothing else: every rule the mark obeys is
   * still decided here, which is the reason this component is the only mark markup on the
   * surface. Goes with `peers-variants.tsx` if that treatment is not the one chosen.
   */
  size?: "md" | "sm" | "lg";
}) {
  /**
   * **A mark that FAILS collapses to the no-mark case, and that needs a state because the
   * URL is resolved on the server.** The resolver cannot know whether the provider holds a
   * brand — it asks for `/fallback/404` precisely so an unheld one is a real 404 rather
   * than a generated tile — so the only place the answer arrives is the browser, as a
   * failed request. Left alone, the `<img>` keeps its `width`/`height` and the browser
   * draws its own broken-file glyph in the box — a drawn placeholder, which is exactly what
   * the reserved band below is not. Dropping the element routes the failure into the same
   * branch as a company with no domain at all, so the two indistinguishable outcomes render
   * indistinguishably.
   *
   * **The failed URL is held rather than a boolean**, so the state resets by itself when
   * the visitor edits their answers and a new peer set reuses this position with a
   * different `src` — a boolean would hide the next company's real mark.
   */
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  /**
   * One box for both branches, so the space a missing mark holds open is the space a
   * present one occupies. Two class lists would be two numbers to keep in step, and the
   * symptom would be a half-line of drift on exactly the cards nobody has a logo for.
   *
   * **A height cap AND a width cap, never a fixed pair.** The provider letterboxes every
   * brand into the box the resolver asks for, so a mark arrives at one ratio whatever the
   * artwork is, and these two numbers only have to stop it exceeding the space. Pinning
   * both dimensions instead turns the box into a tile — see the note on the component.
   */
  const box =
    size === "lg"
      ? // Double the card size. The width cap moves with the height so the ratio guard
        // holds: a 4.9:1 wordmark and a 0.8:1 stacked mark still land at comparable
        // optical weight, which is the measurement the two caps exist for.
        "h-12 max-w-36 md:h-14"
      : size === "md"
        ? "h-7 max-w-28 md:h-8"
        : "h-5 max-w-20 md:h-6";

  if (!src || failedSrc === src) {
    /* Reserved on the card, nothing on a ranking row — see the note above. `aria-hidden`
       and empty: there is no fill, no border and no text, so a screen reader meets the
       company name exactly as it does on a marked card.

       **AND NOTHING BELOW `sm`, because there is no row to align across down there.** The
       reservation exists for one reason: cards sharing a row are read across, so an
       unmarked card puts its name, figure and every row beneath it a mark's height above
       its neighbour's. On a phone the grid is ONE column, so no two cards share a
       horizontal band and there is nothing for the empty band to keep in step — it is
       28px of blank at the top of every unmarked card, which is the first thing on the
       card and says nothing. The instruction it implements is about the row; where the
       row does not exist, neither does the reason. */
    return size === "sm" ? null : (
      <span aria-hidden className={cn("hidden sm:block", box)} />
    );
  }
  return (
    /* eslint-disable-next-line @next/next/no-img-element -- a third-party origin the
       optimiser cannot process, and the box is already fixed by the resolver. */
    <img
      src={src}
      alt=""
      width={128}
      height={40}
      /* **`rounded-md` — 4px, the smallest step that reads as a curve at this size.**
         The mark is requested inside a FIXED box and the provider letterboxes into it,
         so a brand supplied as a full-bleed coloured tile arrives square-cut against a
         surface whose own cards are radius `none`, and it read as the only hard-cut
         object on the card. Anything above one step starts eating the tile's own ink at
         28px, which is the one thing this must not do — a clipped logo is a damaged
         trademark. Marks with transparent surrounds are unaffected either way: there is
         nothing in their corners to round. */
      /* **`self-start` is what makes the radius above visible on the TRAILING corners,
         and without it only the leading two curve.** A comparison card's interior is a
         flex COLUMN, so an `<img>` with `w-auto` is stretched to the column's cross size
         and clamped by `max-w` — the box was 112px wide whatever the mark's ratio, the
         fitted artwork sat flush left under `object-left`, and the slack was all on the
         right, where a corner radius has nothing to clip. `align-self: start` lets the
         width resolve from the ratio instead, so the box hugs the artwork and all four
         corners are drawn on it. Nothing moves: the ink was already left-aligned. */
      /* **`.gcc-mark-pop` — the hover growth, at the project owner's instruction and on
         the Fortune badge's argument.** Here rather than at either call site, for the
         reason every other rule about the mark is here: two copies would be two scales.
         It is 1.2 where the badge is 1.6, because a ratio on a 112px logo is a far bigger
         movement than the same ratio on a 16px badge — the measurement, both collision
         checks and the centre-origin decision are in the CSS rule's own comment. */
      /* **`shrink-0` is HERE rather than on a wrapper at the call site, and that is a bug
         fix.** The ranking row wrapped this in `<span className="shrink-0">` and guarded
         the wrapper on `markUrl` — which cannot know about the case that actually happens,
         a URL that resolves and then fails to load. The component collapsed to null and
         the wrapper stayed: a zero-width flex item plus the row's own 10px `gap-x`, so
         every company with a domain had its name indented 10px and every company without
         one did not. With the provider tier returning nothing today that is most of the
         block, and it is half of the "the badge sits here and there" reading — the names it
         is measured from were not on one edge either. Owning the flex behaviour here is
         also what the no-caller-guards rule already asks for. */
      className={cn(
        "gcc-mark-pop w-auto shrink-0 rounded-md object-contain object-left",
        /* **`self-start` is the CARD's alignment and must not reach a ranking row.** On
           the card the mark is an item in a flex COLUMN, so `align-self: start` resolves
           on the inline axis and is what lets the width come from the ratio — see the note
           above. A ranking row is a flex ROW, where the same declaration resolves on the
           BLOCK axis and top-aligns the mark against a line the row deliberately centres;
           that only became reachable when the row's wrapper span went, since a wrapper is
           what used to be the flex item. */
        size === "sm" ? "" : "self-start",
        box,
      )}
      /* A brand the provider does not hold returns a real 404 by request, so nothing
         renders rather than a generic letter tile — which would be the monogram this
         surface refuses to draw. See `company-mark.ts`. */
      loading="lazy"
      decoding="async"
      onError={() => setFailedSrc(src)}
      /**
       * **`onError` alone is not enough, because this markup is server-rendered.** The peer
       * view is a client component but it still SSRs, so the browser can request and fail
       * the image BEFORE React hydrates and attaches the handler — and a load event that
       * already fired is not replayed. The ref runs on mount and catches exactly that
       * case: `complete` with a zero `naturalWidth` is a decode that finished and produced
       * nothing, which is a failure whatever its cause.
       */
      ref={(node) => {
        if (node?.complete && node.naturalWidth === 0) setFailedSrc(src);
      }}
    />
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
    /**
     * **ON A PHONE THE FIGURE AND THE YEAR SIT SIDE BY SIDE, and that is the answer to the
     * empty space on this block rather than a smaller type size.**
     *
     * A card is one fifth of a row from `lg`, two columns at `sm`, and the WHOLE MEASURE on
     * a phone — so the column that reads correctly at 205px was drawing a thirteen-character
     * figure and a two-chip city list down the leading half of a 270px box and leaving the
     * trailing half blank, four rows deep, five cards deep. That is a card whose interior was
     * measured for a width it is not being drawn at, and the symptom is the space rather than
     * the type.
     *
     * `.gcc-peer-facts` carries the arrangement, the width it needs and the reason the city
     * list is the fact that keeps the full measure. It is in globals.css because it has a
     * measured LOWER BOUND — two columns need about 118px each and a 320px viewport gives 94
     * — and a bound between two breakpoints is a media query rather than a utility.
     */
    <div className="gcc-peer-facts flex h-full flex-col gap-3.5">
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
        {/* **18px below `sm`**, which is the step the ranking's copy of this figure
            takes for the same reason and at the same width: the two are the same
            quantity in the same treatment, so a phone step applied to one and not the
            other would be the drift the shared label key exists to prevent. In a
            half-width phone cell 20px put "59,900–60,000" at 130px of ink against about
            132px of cell. */}
        <p className="text-lg leading-none font-bold tracking-display text-accent-teal tabular-nums sm:text-xl md:text-2xl">
          {peer.headcount}
        </p>
      </CardFact>
      {/* **"Cities", with "GCC" dropped, at ANSR's request.** Three of the card's four
          labels opened on the same three letters — "GCC headcount", "GCC cities", "GCC
          since" — which is the word repeated three times inside 120px on a card whose
          own section heading already names the GCC ("GCC details of peers closest to
          {company}", derived — see `peersTitle`). The subject is
          named by the heading and again by the figure's own label directly above this
          one, so a third statement of it is a prefix rather than information. */}
      {/* The city list keeps the full measure — see `.gcc-peer-facts`. Placement rather
          than DOM order, so the reading order stays figure, cities, year at every width. */}
      <CardFact label={copy.peerCitiesLabel} className="gcc-peer-facts__cities">
        {/* Two cities then "+N": a card is ~205px wide at five columns, so two hub
            names plus the overflow pill is the most that holds on one line, and one
            line is what keeps the five cards' city rows aligned. */}
        <CityCells cities={peer.cities} max={2} />
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
      <span className="gcc-peer-facts__since text-sm text-text-muted">
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
  className,
}: {
  label: string;
  children: React.ReactNode;
  /**
   * Grid placement only, and only from the one caller that needs it. The card's body is
   * a two-column grid on a phone and a flex column above it, so a fact that has to move
   * cell has to say so from outside — see `PeerCardBody`.
   */
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
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
/**
 * The arrow after the count line: jump to the close.
 *
 * **The one orange thing in this zone, and it is the CTA role rather than a fourth one.**
 * Orange has three jobs on these screens — actions, display figures, small categorical
 * eyebrows — one per band. This zone spends none of them, and what this arrow points at is
 * the page's single call to action, so it is the action role used at caption size on the
 * band that leads to it. `--ansr-action` measures 3.4:1 on this zone's white ground, which
 * clears the 3:1 floor a graphical control has to clear; it would NOT clear it on the mint,
 * which is why this may not be lifted into a tinted zone unchanged.
 *
 * **32px of target, not 44.** The public form's controls are 44 because they are the thing
 * a visitor came to operate; this is a glyph at the end of a 20px sentence, and a 44px box
 * inside that line box would push the two lines of the paragraph apart to make room for it.
 * 32 clears the 24px floor for target size with room to spare, and the arrow is redundant
 * anyway — the close is at the end of the same document, reachable by scrolling and by Tab.
 *
 * **It sits in INLINE flow, and it used to be a flex item.** The distinction only shows on
 * a phone, where the sentence wraps: a flex row put the whole sentence in one item and the
 * arrow in another, so the arrow left the sentence entirely and started the next line
 * alone. See the paragraph in `PeerBlockView`.
 *
 * **It scrolls, and in the EMBED it will not.** `scrollIntoView` acts on the scroll
 * container the element is in, and the tool negotiates its height with the parent — so
 * inside an iframe sized to its own content there is no scroll of ours to move, and the
 * host page's is cross-origin and out of reach. Standalone, which is how the tool is
 * reviewed today, it works. Making it work framed needs a second message in
 * `use-frame-height.ts`'s protocol and a listener on the ansr.com page to honour it, which
 * is a change to the embed rather than to this file.
 *
 * This is not the scroll-position logic the public screens ban. That ban is on
 * scroll-DRIVEN behaviour — listeners and observers against a viewport the parent controls
 * — which fires for content nobody is looking at. This reads nothing and reports nothing;
 * it writes once, in direct response to a press.
 */
function JumpToClose() {
  return (
    <button
      type="button"
      onClick={() => {
        const target = document.getElementById("close");
        if (!target) return;
        // The visitor's own motion preference decides, not this component. A smooth
        // scroll across ~2,000px is a long animation to be given to someone who has
        // asked for less of them.
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        target.scrollIntoView({
          behavior: reduce ? "auto" : "smooth",
          block: "start",
        });
      }}
      /* A real name, because an arrow names nothing. It says where the press GOES rather
         than what it does to the page — "scroll down" describes the mechanism, and the
         mechanism is the part that does not survive the embed. */
      aria-label="Jump to the full report"
      className={cn(
        // **32px of ink inside a 20px line box, and the negative block margin is what
        // keeps the line rhythm.** As an inline-block the button's own height would set
        // the line box for the line it lands on, so the last line of the paragraph would
        // stand 12px taller than the one above it — visible as a widening gap under a
        // sentence, which is what the flex row was avoiding before it started stranding
        // the arrow on its own line. `-my-1.5` takes the box's contribution back to 20px
        // and lets the target overhang the line instead: the same trade `.gcc-hit-44`
        // makes, for the same reason, on a control whose ink is deliberately small.
        //
        // **The inline margin is NEGATIVE, and that is the same trade on the other
        // axis.** The gap a reader sees is not this margin — it is this margin plus the
        // 8px of empty box between the 32px target and the 16px icon centred in it, plus
        // the ~6px of blank the chevron's own glyph carries inside that icon box. At
        // `ms-1` that summed to about 18px, which is four word spaces after a full stop:
        // the arrow read as a mark beside the sentence rather than as the end of it,
        // which is the whole reason it was moved into inline flow. `-ms-2` cancels the
        // box's own leading padding and leaves the glyph's ~6px as the gap — one word
        // space, optically. The target does not shrink; it overhangs the sentence's last
        // character, which costs nothing because a press on a full stop had no other
        // meaning.
        "-ms-2 -my-1.5 inline-flex size-8 items-center justify-center rounded-full align-middle",
        "text-action",
        // Transform and colour only, both named — never `all`, which would pick up a
        // property this was not measured for. The nudge is the affordance: an arrow that
        // does not move under a pointer reads as punctuation.
        "transition-[color,transform] duration-fast ease-standard",
        // The nudge follows the arrow: it points along the reading direction now, so it
        // leans into it rather than dropping down the page.
        "hover:translate-x-0.5 hover:text-action-hover",
        "focus-visible:ring-2 focus-visible:ring-accent-teal focus-visible:outline-none",
      )}
    >
      {/* **A head-only arrow, pointing along the line, at ANSR's request.** A shafted
          down-arrow drew a vertical stroke that read as a divider at the end of the
          sentence and pointed off the sentence rather than through it. A chevron is the
          arrowhead alone, facing the trailing edge — the direction the eye is already
          travelling toward the close. */}
      <ChevronRight aria-hidden="true" className="size-4" strokeWidth={2.5} />
    </button>
  );
}

export function PeerBlockView({ view }: { view: PeerView }) {
  const peers = view.peers.peers;
  // One of this sentence's four branches is published copy, so the block needs the
  // resolved block rather than the shipped default. See `shortfallLine`.
  const copy = usePublicCopy();
  const shortfall = shortfallLine(view, copy);

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
      {/* **THE SHORT-SET LINE LEADS THE BLOCK, at ANSR's request, and it used to close
          it.** Under the grid it was an explanation a reader only reached after counting
          three cards and wondering — so the fact that few GCCs clear the visitor's own
          sub-industry was the last thing said about a set it is the first thing to know
          about. Above the cards it is a call-out: the heading names the subject, this
          names what shortened it, then the evidence.

          **The published branch's wording moved with it** — it closed on "the closest
          comparisons above" and now points forward. See `peersNarrowNote` in `schema.ts`.

          It keeps `max-w-measure` and its 14px setting, so nothing about the line itself
          changed; what changed is which side of the grid it sits on. The count line stays
          under the grid, which is the only place it can be — it states what the grid
          shows. */}
      {shortfall ? (
        <p className="max-w-measure text-sm text-text">{shortfall}</p>
      ) : null}
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
                <CompanyMark src={peer.markUrl} />
                {/* **The name and the index badge share a LINE, at the project owner's
                    instruction.** The badge was a row of its own under the name, which
                    made a card with one three cells deep before its figure and left the
                    cards uneven wherever only some peers carry it. Beside the name it
                    qualifies, it costs no height at all on the common case.

                    `items-center` rather than `items-baseline`: an image's baseline is
                    its bottom edge, so on a baseline row the badge sits ON the name's
                    baseline and reads as a mark that has slipped a line. The
                    largest-centres row solves the same problem with `self-center` and
                    records it there. `flex-wrap` because a long name on a narrow card
                    must push the badge down rather than squeeze it. */}
                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                  <h3 className="min-w-0 text-base leading-snug font-semibold text-pretty text-text md:text-lg">
                    {peer.name}
                  </h3>
                  {/* Where every peer carries it, it becomes one line under the grid
                      instead — a badge every card has is not a badge.

                      **Fortune's own badge rather than an accent chip**, at the project
                      owner's instruction, including the colour rule it sits outside. It
                      is sized to the row it sits in rather than to the artwork — see
                      `FortuneBadge`. The `<span>` is load-bearing: an `<img>` in a flex
                      container stretches without it. */}
                  {showFortune && peer.fortuneGlobal500 ? (
                    <span className="shrink-0">
                      <FortuneBadge />
                    </span>
                  ) : null}
                </div>
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
        {/* The count, with the jump to the close after it. The arrow is inside the
            paragraph rather than beside it so it reads as the end of that sentence —
            "showing 5 of 18, and here is what to do about it" — which is the only
            relationship that justifies putting a control on a line of evidence. */}
        {/* **A normal text paragraph, NOT a flex row, and that is what fixes the arrow's
            placement on a phone.** As a wrapping flex container the sentence was one item
            and the arrow was another, so the moment the sentence needed two lines — which
            it does at every phone width — the text took the full row and the arrow dropped
            to a line of its own at the leading edge, a lone orange chevron under a
            paragraph, pointing at nothing next to it. Inline flow puts it after the final
            character wherever that character lands, which is the "end of the sentence"
            reading the arrow was placed for. The gap is the chevron's own inner blank,
            the button's inline margin having been made negative to cancel the rest — see
            `JumpToClose`. */}
        <p className="text-sm font-medium text-text">
          {peerCountLine(view)}
          <JumpToClose />
        </p>
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
  const copy = usePublicCopy();
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
  /**
   * **One note under the chart, and it is a scope line rather than a caveat.** The
   * outermost layer is every GCC in the dataset, which is the one figure on this surface
   * a reader can mistake for a national total — so the basis is stated where the figure
   * is, at 12px muted, in the treatment Screen 2's `CardMeta` uses for the same job.
   * Published copy: read through the context like every other static string here, with
   * `INDUSTRY_BASIS_NOTE` as the shipped value and the wording rule.
   *
   * **A wrapper, because the card stretches and the chart is what may absorb it.** The
   * panel's body grows to the ranking beside it and passes that growth to its one child;
   * with a second child that would have stretched the note's own box as well. So the
   * wrapper takes the growth, the chart takes it from there up to its own
   * `max-block-size`, and `justify-center` splits whatever is left above and below the
   * pair — which is the behaviour the body used to get on its own.
   */
  return (
    <div className="flex min-w-0 flex-col gap-3 lg:justify-center">
      <Containment layers={layers} className="lg:grow" />
      <p className="max-w-measure text-xs text-text-muted">
        {copy.industryBasisNote}
      </p>
    </div>
  );
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
   * **`allFortune` is gone from this block, at the project owner's instruction, and it
   * is the second half of one decision rather than a reversal of the first.**
   *
   * The suppression existed to stop the block drawing the same accent CHIP five times
   * and saying it a sixth in a sentence underneath. Both of those are now gone: the
   * membership is Fortune's own 16px badge sized off the name's cap height, and the
   * sentence came off with the overlap line. What was left was the one state where the
   * fact is universal and NOTHING states it — a ranking of the industry's biggest
   * centres silent on the one accreditation every row carries.
   *
   * So the badge draws wherever the company is on the index, universal or mixed. It is a
   * badge rather than the chip the rule was written against, and it is the only mark on
   * the row that is not a company's own logo.
   */

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
          name — so the block read as fifteen loose lines instead of five rows.
          16px out was still not enough once every row carried a pill line: at 1440 the
          bar sat 16px above the next company's name and 4px under its own pills, which
          is a 4:1 ratio on paper and reads as one continuous wall of fifteen lines.
          24px out, 8px in — and the two sentences that used to close the block paid for
          the extra height. */}
      <ol className="flex flex-col gap-6">
        {entries.map((entry) => (
          // 8px between the name and the tag-and-figure line, against 24px between rows.
          // It was 4px, chosen against the line-box slack the name and the `items-end`
          // pill line contribute — but that slack is what makes the two read as one
          // block: the pills are a qualifier ON the name, and at 4px they were touching
          // it. The h3 takes `leading-tight` so the declared gap is most of the rendered
          // one — see below.
          // **The row is a GRID with named areas, and the areas are re-laid at `sm`.**
          // See `.gcc-rank-row` in globals.css for both arrangements and why the phone
          // needs its own: with one arrangement the figure was wrapping onto a line of
          // its own, below two lines of pills, which put it three lines under the column
          // header that names it and two lines above the bar it is the value of.
          <li key={entry.company.id} className="gcc-rank-row">
            {/* The name and its two markers, and nothing at the trailing edge any more:
                the figure moved down to sit against its own bar, so the split row that
                held the two apart has no second column left to justify. */}
            {/* **`items-center`, not `items-baseline`, and that is a measured fix rather
                than a preference.** Baseline alignment put the mark's optical midline
                2.27px BELOW the name's cap-height midline on every row at 1440, so the
                name read as sitting high against its own logo. The cause is that the
                mark is the TALLEST item on the line, so the line's cross size is the
                mark's own height and `self-center` on it was a no-op — while the name,
                as the max-ascent baseline item, was flush to the line's cross start,
                where its cap midline sits above its box midline. Centring the line drops
                the residual to 0.63px, which is the font's own ascent/descent asymmetry
                and is not correctable without a magic number.

                The cost is that the overlap marker and the badge now centre on the name
                rather than share its baseline. Both are short qualifiers at a smaller
                step beside one line of name, and their cap midlines land within 0.7px of
                the name's — the relationship a shared baseline was buying is still
                visible. Nesting the name and the marker in their own baseline group was
                the alternative and it buys that 0.63px back at the price of a wrapper
                that wraps as one unit. */}
            <div className="gcc-rank-row__name flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
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
              {/* **The mark leads the row, at the project owner's instruction, and it is
                  the `sm` size.** A ranking's rows are scanned for recognition before they
                  are read, so a logo at the leading edge is doing the work the position
                  numeral used to — which is also why it must stay SMALLER than the name it
                  precedes: the row's subject is still the company, and a mark at the
                  card's size would outweigh it.

                  **No `self-center` any more — the row itself centres now.** It was here
                  because the row was `items-baseline`, and it was doing nothing: the mark
                  is the tallest thing on the line, so centring it in a line its own height
                  is a no-op. See the note on the row. `shrink-0` stays, so a long name
                  cannot compress it to a sliver.

                  **THE `markUrl` GUARD AND THE `shrink-0` WRAPPER ARE BOTH GONE, and their
                  removal is a bug fix rather than a tidy-up.** A ranking row reserves
                  nothing, so a row without a mark renders no slot at all and its name sits
                  at the leading edge, flush with its own bar — and the wrapper broke
                  exactly that. `CompanyMark` collapses to null when a resolved URL FAILS TO
                  LOAD, which the provider tier makes the common case, but the wrapper is
                  decided on the server: it stayed as a zero-width flex item and the row's
                  10px `gap-x` came with it, so a company with a domain had its name
                  indented 10px and a company without one did not. Every rule about the
                  mark, `shrink-0` included, is `CompanyMark`'s. */}
              <CompanyMark src={entry.company.markUrl} size="sm" />
              <h3 className="min-w-0 text-base leading-tight font-semibold text-text md:text-lg">
                {entry.company.name}
              </h3>
              {/* **The overlap marker, and its job changed with its wording.** As
                  "Also in your peer set" on a duplicate card it admitted the repeat.
                  On a chart row it is the thing that lets a reader map this ranking
                  onto the set they were given — and the sentence under the block
                  states what the mapping amounts to. Quiet text rather than a pill:
                  three pills down five one-line rows is more chrome than the rows
                  themselves.

                  **"peer set" rather than "comparison set", at ANSR's request.** The
                  section above is headed "GCC details of peers closest to {company}", so
                  "peer" is now the product's own word for that set as well as the shorter
                  one. */}
              {/* **The marker and the badge are ONE flex item, so they wrap together.**
                  Below `md` a long name plus both qualifiers overflows the row and the
                  badge broke onto a line of its own at the leading edge — a lone red `500`
                  mark under a company name, which reads as a stray graphic rather than as
                  that company's accreditation. It only became reachable when the badge
                  stopped being suppressed in the universal case. Grouped, line two is
                  "in your peer set" and the badge together, which is a phrase.

                  Rendered at all only when one of the two is present, so no empty flex
                  item ever contributes the row's `gap-x`. */}
              {/* **BELOW `sm` THE GROUP TAKES A LINE OF ITS OWN, so the badge has ONE
                  position on every row.** Flowing inline after the name, its x is
                  wherever that company's name happens to end — and where the name wraps
                  it broke onto a third line anyway, so five rows drew the badge at five
                  different offsets and two different depths. "Sitting here and there" is
                  exactly right and it is a property of inline flow, not of the badge.

                  `basis-full` on a wrapping flex row puts it at the leading edge of its
                  own line, under the name it accredits, at the same x on every row. It
                  also gives the name the row's full measure back, which is what a
                  31-character name was competing with the figure for.

                  **It costs no extra line for the FIGURE, which is the part that makes
                  this cheap.** The figure is the grid's own trailing column at
                  `align-items: end`, so it drops to the bottom of the name block and
                  lands beside this line — still directly above its own bar and still
                  under the column header that names it, which are the two relationships
                  the phone arrangement exists to protect. A row with neither marker is
                  one line and the figure sits on the name, exactly as before. */}
              {entry.alsoPeer || entry.company.fortuneGlobal500 ? (
                <span className="flex items-center gap-x-2.5 max-sm:basis-full">
                  {/* `whitespace-nowrap` so the marker cannot break into two lines inside
                      an `items-center` group. It is 90px at 320 beside a 16px badge, so
                      there is room, and a wrapped marker was what still moved the badge
                      between phone widths after the group took its own line. */}
                  {entry.alsoPeer ? (
                    <span className="text-xs font-medium whitespace-nowrap text-text-muted">
                      in your peer set
                    </span>
                  ) : null}
                  {/* **The wrapper stays and its `self-center` is gone with the row's
                      change to `items-center`.** It is still load-bearing: an `<img>` in
                      a flex container stretches without it, which is the same reason the
                      comparison card wraps its own copy.

                      **Unconditional on the index membership now** — see the note above
                      `return` for why `allFortune` no longer gates it. */}
                  {/* **THE BADGE LEADS THE GROUP BELOW `sm`, so its x is the row's leading
                      edge on every row that carries it.** With the marker first it sat at
                      61px on a row that is not in the peer set and at 156 on one that is —
                      one of two positions rather than one, which is the same complaint at
                      lower amplitude. `order` is paint order only: the DOM stays marker
                      then badge, so a screen reader reads "in your peer set, Fortune Global
                      500" at every width. From `sm` the group flows after the name and the
                      marker leads it, unchanged. */}
                  {entry.company.fortuneGlobal500 ? (
                    <span className="shrink-0 max-sm:-order-1">
                      <FortuneBadge />
                    </span>
                  ) : null}
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

                On one line there is no void and no orphaned figure. The figure sits over
                the edge the bar's trailing end is measured to and the tags over the edge
                it starts from, 4px above the bar, which is tighter than anything else in
                the row and is what says the figure and the bar are a pair.

                **A FOURTH arrangement exists for the phone, and the three areas below are
                how both are expressed.** At 375 the pills take two lines on their own, so
                the shared line was never shared: the figure wrapped under them, three
                lines below the column header that names it and two above its own bar. The
                row is a grid with named areas now — `.gcc-rank-row` in globals.css carries
                the desktop map, the phone map and the reasoning — and nothing about the
                desktop composition moved. */}
              <div className="gcc-rank-row__tags flex min-w-0 flex-wrap items-center gap-1.5">
                {/* **`quiet` as well as `sm`, at ANSR's request.** These pills are a
                    qualifier on a row whose subject is the name above them and whose
                    evidence is the bar below them; at the neutral weight, four filled
                    grey pills a row over five rows were the heaviest thing in the block
                    after the figures. See `Chip`'s `quiet` tone for the measurement —
                    the ink gets lighter and the contrast goes UP. */}
                {/* Three cities then "+N" on the wider ranking row, where the pills
                    share a line with the year chip — the same overflow the comparison
                    cards use, so a company in six cities does not push the row's
                    figure onto its own line. */}
                <CityCells
                  cities={entry.company.cities}
                  size="sm"
                  tone="quiet"
                  max={3}
                />
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
              {/* **No `ms-auto` and no `justify-between` any more: the trailing edge is
                  the grid's own second column, which is `auto`-sized, so the figure
                  cannot be moved by whatever the tags beside it do.** Both were here to
                  survive a wrap — on a single-item wrapped line `justify-between` puts
                  the item at the LEADING edge, so the figure column broke on exactly the
                  row with the most cities to list. A column cannot wrap. */}
              {/* **18px below `sm`, at the project owner's instruction, where every wider
                  width is unchanged.** A headcount band is thirteen characters, so at
                  20px it took 130px of a 295px row — half the measure for a figure that
                  shares its line with the company name. The step down keeps it the
                  largest thing on the row, which is the only ordering that matters here,
                  and it is the same step the comparison card's own copy of this figure
                  takes so the two still read as one quantity. */}
              <p className="gcc-rank-row__figure text-lg leading-none font-bold tracking-display text-accent-teal tabular-nums sm:text-xl md:text-2xl">
                {entry.company.headcount}
              </p>
              {/* Full width, and no emphasis on any row. One shared axis is what makes
                  the five comparable, and the axis is the row above it. */}
              <div className="gcc-rank-row__bar">
                <BarTrack share={entry.company.sizeShare} />
              </div>
          </li>
        ))}
      </ol>

      {/* **`largestCountLine` is no longer rendered, at ANSR's request.** It read "The
            5 largest BFSI GCCs in our India data." directly under a five-row ranking whose
            heading is "The largest BFSI GCCs in India" — a restatement of the heading with
            the row count in front of it, which the reader can see. It is kept in `copy.ts`
            and still unit-tested, so restoring it is one line.

            The SHORTFALL clause used to be appended to it and does not go with it: a
            ranking three short of its own limit has to say so. It is `largestShortfallLine`
            now, and it renders only where it fires. */}
      {/* **The overlap sentence is GONE, at ANSR's request, and so is the universal
            Fortune sentence.** The first read "4 of the 5 largest Retail GCCs in India
            are in your comparison set above." and the second "Every company here is in
            the Fortune Global 500." — two full-measure sentences under a five-row chart,
            neither of which adds a quantity the chart does not already carry: the
            per-row "in your peer set" marker states the overlap company by company, and
            the badge states the index membership on every row that carries it.
            `largestOverlapLine` is kept in `copy.ts` and still unit-tested, so restoring
            it is one line; it is on the blocked list with the other removed sentences.

            **The badge is what replaced the Fortune sentence, not nothing** — see the
            note above `return`. Removing the sentence and keeping the suppression would
            have left the universal case stating the membership in neither place.

            **No axis note either.** It said "Full width is JPMorgan Chase, at
            59,900–60,000" under a stack whose first row is JPMorgan Chase, drawing a
            full-width bar, with that band beside it at 24px. On a ranking sorted by the
            quantity the bars encode, row one is the axis. */}
      {largestShortfallLine(view) ? (
        <p className="max-w-measure text-sm font-medium text-text">
          {largestShortfallLine(view)}
        </p>
      ) : null}
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
    <ul className="flex flex-wrap gap-1.5 sm:gap-2 md:gap-2.5">
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
          {/* **12px and a tighter box below `sm`, at the project owner's instruction.**
              At 14px with 14px of inline padding the shortest item in the set is about
              150px of pill, so at 295px almost every tag took a line to itself and eight
              memberships — the one block on this surface that claims nothing at all —
              were 340px of the phone's document, more than the five peer cards' figures
              put together. A tag is a membership marker at caption weight, so the caption
              size is the right size for it; two per line is also what makes the set read
              as a SET rather than as eight stacked buttons. Every wider width is
              unchanged. */}
          <span className="inline-flex items-center rounded-full bg-surface px-3 py-1.5 text-xs font-medium whitespace-nowrap text-text shadow-xs sm:px-3.5 sm:py-2 sm:text-sm">
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
