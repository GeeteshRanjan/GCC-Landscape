/**
 * FOUR CANDIDATE TREATMENTS OF THE PEER SECTION. TEMPORARY — DELETE ON MERGE.
 *
 * The brief: the comparison set is the screen's primary evidence and it does not read
 * that way. The diagnosis is not that the cards are badly drawn, it is that the section
 * opts out of every device the bands around it use. Directly above it the snapshot puts
 * four figures at 48px in the brand orange on the pale mint; directly below it the
 * ranking draws bars inside a bordered `Panel`. Between the two sits a heading and five
 * white boxes whose largest ink is a 24px figure repeated five times at the same size —
 * which is a texture rather than a focal point. No boundary, no ornament, no size peak,
 * no change of pace.
 *
 * So each variant makes ONE decisive move, and the four move on four different axes:
 *
 *   A `exhibit`   — the GROUND. The band goes teal-deep and the five white cards become
 *                   the only lit objects on the surface. Cards untouched.
 *   B `authority` — the CARD. Same layout and ground; the card is redesigned as a real
 *                   object with a header, a hairline and a body, on `Panel`'s own
 *                   construction.
 *   C `ledger`    — the STRUCTURE. Five floating cards become ONE white slab of five
 *                   hairline-divided columns, with every fact aligned across all five
 *                   through a CSS subgrid. The comparison finally reads across.
 *   D `overrun`   — the SCALE. The heading takes the band finding's display step and the
 *                   row breaks the zone's container to the band's own edges, so this is
 *                   the one section on the card that overruns the grid it sits in.
 *
 * Nothing here introduces a colour, a font, a radius or a primitive the surface does not
 * already own. Every card stays radius `none`. No card is nested in a card. No bar
 * returns to a comparison card and no ordinal returns to one — left-to-right reading
 * position still states the relevance order in all four.
 *
 * `current` reproduces what ships today, so the harness compares like with like.
 */

import { usePublicCopy } from "@/components/public/copy-context";
import { Block, Zone } from "@/components/public/primitives";
import { type PeerCard, type PeerView } from "@/data/screen1";
import { cn } from "@/lib/utils";
import { CityCells, CompanyMark, PeerBlockView } from "./evidence";
import { peerCountLine, peersTitle, shortfallLine } from "./copy";
import { FortuneBadge } from "./fortune-badge";

export type PeersVariant =
  | "current"
  | "exhibit"
  | "authority"
  | "ledger"
  | "overrun"
  | "marks"
  | "distilled"
  | "reverse"
  | "rows"
  | "plate";

export const PEERS_VARIANTS: ReadonlyArray<{
  id: PeersVariant;
  name: string;
  move: string;
}> = [
  { id: "current", name: "Current", move: "What ships today" },
  { id: "exhibit", name: "A — Exhibit", move: "The band goes dark" },
  { id: "authority", name: "B — Authority", move: "The card is redesigned" },
  { id: "ledger", name: "C — Ledger", move: "One slab, five columns" },
  { id: "overrun", name: "D — Overrun", move: "Display heading, full-bleed row" },
  { id: "marks", name: "E — Marks", move: "The logo is the subject" },
  { id: "distilled", name: "F — Distilled", move: "Four elements per card, no pills" },
  { id: "reverse", name: "G — Reverse", move: "Five teal cards on the mint" },
  { id: "rows", name: "H — Rows", move: "Five full-width rows, figures in a column" },
  { id: "plate", name: "I — Plate", move: "G's teal card, B's plinth, inverted" },
];

/**
 * Mirrors `Enter` in `peer-view.tsx`, which is module-private there.
 *
 * Duplicated deliberately and only for the duration of this harness: a variant owns its
 * whole `Zone` (A changes the ground), so the stagger step has to be inside this file.
 * On merge the winner moves back into `peer-view.tsx` and uses the real one.
 */
function Enter({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn("gcc-enter", className)}
      style={{ "--gcc-enter-index": 2 } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

/** One row per peer count, capped at five. Same table `evidence.tsx` holds. */
const LG_COLS: Record<number, string> = {
  1: "lg:grid-cols-1",
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
  5: "lg:grid-cols-5",
};

const SM_SPAN_FULL = "max-lg:sm:col-span-2";

function columnsFor(count: number): string {
  return LG_COLS[Math.min(count, 5)] ?? LG_COLS[5]!;
}

/**
 * A badge every card carries is not a badge — the same suppression `evidence.tsx`
 * applies, reproduced here so a variant cannot disagree with the shipped rule.
 */
function fortuneVisible(peers: readonly PeerCard[]): boolean {
  return !(peers.length > 1 && peers.every((peer) => peer.fortuneGlobal500));
}

/**
 * **Whether the mark's height is worth reserving at all, and this is a defect the four
 * candidates fix rather than a variation between them.**
 *
 * The reservation exists so an unmarked card does not put its name, figure and every row
 * beneath it a mark's height above its neighbour's — which is right, and only right when
 * some card in the set HAS a mark. With the Brandfetch tier unset, which is production
 * today, no card in any set has one: every card reserves 28px of white against a
 * neighbour that reserved the same 28px, so all five open on a band of dead air with
 * nothing to align to. It is a visible part of why the section reads underweight.
 *
 * Reserving per SET rather than per card keeps the alignment in exactly the case it was
 * asked for and costs nothing in the case it was not. Nothing is drawn either way.
 */
function marksInSet(peers: readonly PeerCard[]): boolean {
  return peers.some((peer) => peer.markUrl !== null);
}

/**
 * The lines under the grid: the exact count, the shortfall where there is one, and the
 * universal-Fortune sentence. Identical in all five treatments — none of them changes
 * what the block CLAIMS, only how loudly it says it.
 */
function PeerFooter({
  view,
  peers,
  inverse = false,
}: {
  view: PeerView;
  peers: readonly PeerCard[];
  inverse?: boolean;
}) {
  const shortfall = shortfallLine(view);
  // On the accent band every line is white — `--ansr-text-inverse-muted` is 2.6:1 on
  // teal-600, which is the constraint `ask-hero.tsx` carries on the brand gradient.
  const ink = inverse ? "text-text-inverse" : "text-text";
  const inkMuted = ink;
  return (
    <div className="flex flex-col gap-3">
      <p className={cn("text-sm font-medium", ink)}>{peerCountLine(view)}</p>
      {shortfall ? (
        <p className={cn("max-w-measure text-sm", inkMuted)}>{shortfall}</p>
      ) : null}
      {fortuneVisible(peers) ? null : (
        <p className={cn("text-sm", inkMuted)}>
          Every company here is in the Fortune Global 500.
        </p>
      )}
    </div>
  );
}

/** A small-caps label over a value. The card's internal unit, as shipped. */
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
   A — Exhibit. The ground carries it.
   ========================================================================== */

/**
 * **The one move is the GROUND: the band takes the brand's own teal and the five white
 * cards become the only lit objects on the surface.**
 *
 * `Section` already documents the device and reserves it for a FIGURE band — reversing
 * content out of teal is the most emphatic thing this palette can do without touching
 * orange, which is committed to the CTA and unusable on the mint at any size. `Zone` was
 * simply never given a dark ground, because until now no band inside the result card
 * wanted one.
 *
 * **The cards themselves are untouched, and that is the whole reason this works.** White
 * at radius `none` on teal is the brand board's own figure-ground relationship inverted,
 * so the five objects gain a hard edge on all four sides for free — no border, no shadow,
 * no radius, nothing added to the card at all. The section stops having to announce
 * itself because the band announces it.
 *
 * **Teal-600 and not teal-deep, which was tried first and failed on a measurement.** The
 * result card floats on flat teal-deep, so a teal-deep band is the same value as the page
 * ground and the card loses its side edges for the whole height of the band — the primary
 * evidence was the one place the surface stopped reading as a single object. See the note
 * on `Zone`'s `accent`.
 *
 * The cost, stated plainly: one exception to the strict white/mint alternation, and a
 * second dark band on a card that already ends on one. Two ramp steps apart and three
 * sections apart, so they do not read as a pair — but it is ANSR's call, not this file's.
 */
function ExhibitZone({ view }: { view: PeerView }) {
  const copy = usePublicCopy();
  const peers = view.peers.peers;
  const showFortune = fortuneVisible(peers);
  const reserveMark = marksInSet(peers);

  return (
    <Zone ground="accent">
      <Enter>
        <section
          id="peers"
          aria-labelledby="peers-heading"
          className="flex min-w-0 flex-col"
        >
          <header className="flex flex-col gap-1.5">
            {/* The `lead` step, in white. `Block` deliberately offers no inverse variant —
                see its own note — so the one section that needs one draws its own header
                rather than adding a ground-dependent branch to a primitive used nine
                times. White and not the muted inverse ink: on teal-600 that token is
                2.6:1. */}
            <h2
              id="peers-heading"
              className="min-w-0 text-2xl leading-tight font-bold tracking-display text-balance text-text-inverse md:text-3xl"
            >
              {peersTitle(view, copy)}
            </h2>
          </header>
          <div className="mt-5 flex flex-col gap-5 md:mt-6">
            {peers.length === 0 ? (
              <p className="max-w-measure text-base text-text-inverse">
                {shortfallLine(view)}
              </p>
            ) : (
              <>
                <ul
                  className={cn(
                    "grid gap-3 sm:grid-cols-2 lg:gap-4",
                    columnsFor(peers.length),
                  )}
                >
                  {peers.map((peer, index) => (
                    <li
                      key={peer.id}
                      className={cn(
                        "min-w-0",
                        index === peers.length - 1 &&
                          peers.length % 2 === 1 &&
                          peers.length > 1
                          ? SM_SPAN_FULL
                          : "",
                      )}
                    >
                      <ShippedCard
                        peer={peer}
                        showFortune={showFortune}
                        reserveMark={reserveMark}
                      />
                    </li>
                  ))}
                </ul>
                <PeerFooter view={view} peers={peers} inverse />
              </>
            )}
          </div>
        </section>
      </Enter>
    </Zone>
  );
}

/**
 * The card as it ships, apart from the per-set mark reservation above. A and D change
 * nothing else about it — their move is the band, not the card.
 */
function ShippedCard({
  peer,
  showFortune,
  reserveMark,
}: {
  peer: PeerCard;
  showFortune: boolean;
  reserveMark: boolean;
}) {
  const copy = usePublicCopy();
  return (
    <article className="flex h-full min-w-0 flex-col gap-3.5 rounded-none bg-surface p-4">
      <div className="flex min-w-0 flex-col gap-1.5">
        {reserveMark ? <CompanyMark src={peer.markUrl} /> : null}
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="min-w-0 text-base leading-snug font-semibold text-pretty text-text md:text-lg">
            {peer.name}
          </h3>
          {showFortune && peer.fortuneGlobal500 ? (
            <span className="shrink-0">
              <FortuneBadge />
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex h-full flex-col gap-3.5">
        <CardFact label={copy.peerHeadcountLabel}>
          <p className="text-xl leading-none font-bold tracking-display text-accent-teal tabular-nums md:text-2xl">
            {peer.headcount}
          </p>
        </CardFact>
        <CardFact label={copy.peerCitiesLabel}>
          <CityCells cities={peer.cities} />
        </CardFact>
        <span className="text-sm text-text-muted">
          {copy.peerSinceLabel}{" "}
          <span className="font-semibold text-text">{peer.establishedYear}</span>
        </span>
      </div>
    </article>
  );
}

/* ==========================================================================
   B — Authority. The card becomes an object.
   ========================================================================== */

/**
 * **The one move is the CARD: the quantity the section exists for is lifted out of the
 * stack and given a filled teal plinth at the card's foot.**
 *
 * On the shipped card the headcount is a 24px teal figure in a column of three
 * same-looking facts, and it is the second of them. Five cards of that is five identical
 * text stacks — a texture, which is the diagnosis. A filled plinth makes the figure the
 * one thing on the card with a ground of its own, and because it is pinned to the foot of
 * an equal-height card the five plinths land on ONE line across the row. So the row gains
 * both a focal band and the alignment the floating cards never had, without a slab.
 *
 * **The fill is `--ansr-surface-accent`, the brand's own teal, and the figure is white on
 * it.** No colour is introduced — teal is already the ink of that figure — and white on
 * teal-600 is 8.55:1 against 5.9:1 for teal ink on white, so the figure reads LOUDER at
 * the same size. Which matters, because 30px is not available here: measured at five
 * columns, "22,100–22,200" wraps to two lines at 30px in a 205px card, and a figure that
 * wraps on three cards out of five is worse than a smaller one that never does.
 *
 * **`Panel`'s construction, inverted.** Every bordered card on both screens is an
 * identity block over a hairline over a body; this is the same three parts with the
 * emphasis at the bottom rather than the top, because on this card the identity is the
 * label and the figure is the finding. The city pills take the `quiet` tone the ranking
 * rows use: with a filled plinth below them they are the third thing on the card.
 *
 * Not a card inside a card: it is a region of one card, with no edge, no radius and no
 * shadow of its own — the same relationship `Panel`'s header has to `Panel`.
 */
function AuthorityCard({
  peer,
  showFortune,
  reserveMark,
}: {
  peer: PeerCard;
  showFortune: boolean;
  reserveMark: boolean;
}) {
  const copy = usePublicCopy();
  return (
    <article className="flex h-full min-w-0 flex-col rounded-none bg-surface">
      <div className="flex min-w-0 grow flex-col gap-3 p-4 md:p-5">
        {reserveMark ? <CompanyMark src={peer.markUrl} /> : null}
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="min-w-0 text-lg leading-snug font-semibold text-pretty text-text md:text-xl">
            {peer.name}
          </h3>
          {showFortune && peer.fortuneGlobal500 ? (
            <span className="shrink-0">
              <FortuneBadge />
            </span>
          ) : null}
        </div>
        <CardFact label={copy.peerCitiesLabel}>
          <CityCells cities={peer.cities} tone="quiet" />
        </CardFact>
        {/* No `mt-auto`, deliberately, and the plinth is why the shipped card's reasoning
            inverts here. There it pushed the year to the card's foot and opened the slack
            in the MIDDLE, which reads as a card that failed to load. With a filled plinth
            at the foot the slack collects immediately above it, against a hard edge,
            where it reads as the plinth's own breathing room. */}
        <span className="text-sm text-text-muted">
          {copy.peerSinceLabel}{" "}
          <span className="font-semibold text-text">{peer.establishedYear}</span>
        </span>
      </div>
      {/* The plinth. Pinned to the foot by the growing body above it, so five of them
          share one line whatever the city lists do. */}
      <div className="flex min-w-0 flex-col gap-1 bg-surface-accent px-4 py-3 md:px-5">
        <span className="text-[0.6875rem] font-semibold tracking-caps text-text-inverse uppercase">
          {copy.peerHeadcountLabel}
        </span>
        <p className="text-xl leading-none font-bold tracking-display text-text-inverse tabular-nums md:text-2xl">
          {peer.headcount}
        </p>
      </div>
    </article>
  );
}

function AuthorityZone({ view }: { view: PeerView }) {
  const copy = usePublicCopy();
  const peers = view.peers.peers;
  const showFortune = fortuneVisible(peers);
  const reserveMark = marksInSet(peers);
  return (
    <Zone ground="tint">
      <Enter>
        <Block id="peers" title={peersTitle(view, copy)} weight="lead">
          {peers.length === 0 ? (
            <p className="max-w-measure text-base text-text">{shortfallLine(view)}</p>
          ) : (
            <div className="flex flex-col gap-5">
              <ul
                className={cn(
                  "grid gap-3 sm:grid-cols-2 lg:gap-4",
                  columnsFor(peers.length),
                )}
              >
                {peers.map((peer, index) => (
                  <li
                    key={peer.id}
                    className={cn(
                      "min-w-0",
                      index === peers.length - 1 &&
                        peers.length % 2 === 1 &&
                        peers.length > 1
                        ? SM_SPAN_FULL
                        : "",
                    )}
                  >
                    <AuthorityCard
                      peer={peer}
                      showFortune={showFortune}
                      reserveMark={reserveMark}
                    />
                  </li>
                ))}
              </ul>
              <PeerFooter view={view} peers={peers} />
            </div>
          )}
        </Block>
      </Enter>
    </Zone>
  );
}

/* ==========================================================================
   C — Ledger. One slab, five columns, every fact aligned across.
   ========================================================================== */

/**
 * **The one move is the STRUCTURE: five floating cards become ONE object.**
 *
 * A peer comparison is a claim about five companies read ACROSS, and five separate boxes
 * are the one shape that cannot support that — each stacks its own facts at its own
 * heights, so a reader comparing city lists is comparing two things at two different
 * vertical positions. This is one white slab on the mint, divided by hairlines, with
 * every fact on a shared row through `grid-rows-subgrid`. The figures land on one line.
 * The city rows land on one line. The years land on one line.
 *
 * **Which also deletes the reserved-mark-height rule rather than working around it.** The
 * mark's row is a subgrid row, so it is exactly as tall as the tallest mark in the set
 * and an unmarked column costs nothing — the alignment the reservation was buying is now
 * structural. Nothing is drawn in an empty mark cell, so the banned placeholder stays
 * banned.
 *
 * **It is not a table and it is not the ranked table that was removed.** There is no row
 * header, no scroller, no cell borders, and no column a reader is invited to sort. It is
 * the same five cards sharing one edge instead of five.
 *
 * Below `lg` it stacks to one column and the dividers turn horizontal, which is the same
 * reading the cards give on a phone.
 */
function LedgerZone({ view }: { view: PeerView }) {
  const peers = view.peers.peers;
  const showFortune = fortuneVisible(peers);
  const copy = usePublicCopy();

  return (
    <Zone ground="tint">
      <Enter>
        <Block id="peers" title={peersTitle(view, copy)} weight="lead">
          {peers.length === 0 ? (
            <p className="max-w-measure text-base text-text">{shortfallLine(view)}</p>
          ) : (
            <div className="flex flex-col gap-5">
              {/* One slab. No border and no shadow: white against the mint IS the
                  boundary, which is the brand board's own card. The dividers are the
                  only rules on it. */}
              <ul
                className={cn(
                  "grid divide-y divide-border bg-surface lg:divide-x lg:divide-y-0",
                  // Five named rows, so every column's facts share them.
                  "lg:grid-rows-[auto_auto_auto_auto_auto]",
                  columnsFor(peers.length),
                )}
              >
                {peers.map((peer) => (
                  <li
                    key={peer.id}
                    className="grid min-w-0 gap-3.5 p-4 md:p-5 lg:row-span-5 lg:grid-rows-subgrid lg:gap-4"
                  >
                    {/* Row 1 — the mark, and this is where the slab pays for itself
                        twice. The mark is a shared subgrid row, so it is exactly as tall
                        as the tallest mark in the set and an unmarked column costs nothing:
                        the alignment the per-card reservation was buying is now
                        STRUCTURAL, and with no mark in the set at all the row collapses
                        rather than opening a band of white on all five. So `CompanyMark`'s
                        null branch is never reached from here. */}
                    <div className="flex min-w-0 items-end">
                      {peer.markUrl ? <CompanyMark src={peer.markUrl} /> : null}
                    </div>
                    {/* Row 2 — the company. */}
                    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                      <h3 className="min-w-0 text-base leading-snug font-semibold text-pretty text-text md:text-lg">
                        {peer.name}
                      </h3>
                      {showFortune && peer.fortuneGlobal500 ? (
                        <span className="shrink-0">
                          <FortuneBadge />
                        </span>
                      ) : null}
                    </div>
                    {/* Row 3 — the figure the section exists for, on one line across all
                        five columns. This is the alignment that makes the comparison
                        work, and it is the whole argument for the slab. The size is the
                        shipped one: 30px wraps "22,100–22,200" in a 205px column, and a
                        figure that wraps is exactly what an aligned row must not have. */}
                    <CardFact label={copy.peerHeadcountLabel}>
                      <p className="text-xl leading-none font-bold tracking-display text-accent-teal tabular-nums md:text-2xl">
                        {peer.headcount}
                      </p>
                    </CardFact>
                    {/* Row 4 — cities. */}
                    <CardFact label={copy.peerCitiesLabel}>
                      <CityCells cities={peer.cities} />
                    </CardFact>
                    {/* Row 5 — the year. */}
                    <span className="self-end text-sm text-text-muted">
                      {copy.peerSinceLabel}{" "}
                      <span className="font-semibold text-text">
                        {peer.establishedYear}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
              <PeerFooter view={view} peers={peers} />
            </div>
          )}
        </Block>
      </Enter>
    </Zone>
  );
}

/* ==========================================================================
   D — Overrun. The one section that breaks its own grid.
   ========================================================================== */

/**
 * **The one move is SCALE, in two coupled parts, and neither works alone.**
 *
 * The heading takes the step the header band's finding takes — 30/38px against the
 * `lead` step's 24/30 — so it is unambiguously the largest heading inside the card
 * rather than one notch above its neighbours. And the row of cards breaks the zone's
 * container to the band's own edges, so this is the only section on the surface whose
 * content is wider than the column everything else is set in. The heading stays inset,
 * which is what makes the break visible: the reader sees type on the grid and evidence
 * running past it.
 *
 * The extra air is the third part of the same move. A peak in a scroll is a change of
 * PACE as much as of size, and every zone on this card currently breathes identically.
 *
 * Nothing is added: no colour, no rule, no ornament, no border. The cards are byte-
 * identical to what ships. `.gcc-zone` already clips, so the break cannot widen a
 * document whose horizontal scroll the iframe does not own.
 */
function OverrunZone({ view }: { view: PeerView }) {
  const copy = usePublicCopy();
  const peers = view.peers.peers;
  const showFortune = fortuneVisible(peers);
  const reserveMark = marksInSet(peers);

  return (
    <Zone ground="tint" className="py-12 md:py-16">
      <Enter>
        <section
          id="peers"
          aria-labelledby="peers-heading"
          className="flex min-w-0 flex-col"
        >
          <h2
            id="peers-heading"
            className="min-w-0 max-w-lead text-3xl leading-tight font-bold tracking-display text-balance text-text md:text-4xl"
          >
            {peersTitle(view, copy)}
          </h2>
          <div className="mt-6 flex flex-col gap-5 md:mt-8">
            {peers.length === 0 ? (
              <p className="max-w-measure text-base text-text">{shortfallLine(view)}</p>
            ) : (
              <>
                {/* The break. Negative gutters equal to the zone's own padding, so the
                    row lands exactly on the band's edges rather than at a distance
                    chosen by eye. */}
                <ul
                  className={cn(
                    "-mx-6 grid gap-3 sm:grid-cols-2 md:-mx-8 lg:gap-4",
                    columnsFor(peers.length),
                  )}
                >
                  {peers.map((peer, index) => (
                    <li
                      key={peer.id}
                      className={cn(
                        "min-w-0",
                        index === peers.length - 1 &&
                          peers.length % 2 === 1 &&
                          peers.length > 1
                          ? SM_SPAN_FULL
                          : "",
                      )}
                    >
                      <ShippedCard
                        peer={peer}
                        showFortune={showFortune}
                        reserveMark={reserveMark}
                      />
                    </li>
                  ))}
                </ul>
                <PeerFooter view={view} peers={peers} />
              </>
            )}
          </div>
        </section>
      </Enter>
    </Zone>
  );
}

/* ==========================================================================
   Shared shell for the second set of candidates
   ========================================================================== */

/**
 * The row, and nothing about how a card is drawn.
 *
 * Every treatment in the second set keeps the shipped geometry exactly: ONE row at `lg`,
 * one column per peer capped at five, two columns between `sm` and `lg`, one below, the
 * odd last card widening rather than sitting beside an empty cell. **No peer is weighted
 * above another in any of them** — a wider or taller first card would restate the
 * relevance order the reading direction already carries, and it would do it by making one
 * company's figure physically bigger than another's, which is a claim the data does not
 * make. So the four differ only in what a card contains and what it sits on.
 */
function PeerGrid({
  peers,
  card,
}: {
  peers: readonly PeerCard[];
  card: (peer: PeerCard) => React.ReactNode;
}) {
  return (
    <ul className={cn("grid gap-3 sm:grid-cols-2 lg:gap-4", columnsFor(peers.length))}>
      {peers.map((peer, index) => (
        <li
          key={peer.id}
          className={cn(
            "min-w-0",
            index === peers.length - 1 && peers.length % 2 === 1 && peers.length > 1
              ? SM_SPAN_FULL
              : "",
          )}
        >
          {card(peer)}
        </li>
      ))}
    </ul>
  );
}

/**
 * The section shell: zone, stagger step, `Block` heading, grid, footer. Identical in all
 * four, so a candidate is only ever the card and the ground.
 */
function PeersSection({
  view,
  ground,
  behind,
  className,
  card,
}: {
  view: PeerView;
  ground: "surface" | "tint" | "pale" | "accent" | "inverse-soft";
  behind?: React.ReactNode;
  className?: string;
  card: (peer: PeerCard) => React.ReactNode;
}) {
  const copy = usePublicCopy();
  const peers = view.peers.peers;
  return (
    <Zone ground={ground} behind={behind} className={className}>
      <Enter>
        <Block id="peers" title={peersTitle(view, copy)} weight="lead">
          {peers.length === 0 ? (
            <p className="max-w-measure text-base text-text">{shortfallLine(view)}</p>
          ) : (
            <div className="flex flex-col gap-5">
              <PeerGrid peers={peers} card={card} />
              <PeerFooter view={view} peers={peers} />
            </div>
          )}
        </Block>
      </Enter>
    </Zone>
  );
}

/* ==========================================================================
   E — Marks. The evidence is the logos.
   ========================================================================== */

/**
 * **The one move is to make the MARK the card's subject instead of its introduction.**
 *
 * The section answers "are companies like mine already in India", and the fastest possible
 * answer to that is five marks a reader recognises without reading anything. Today the
 * mark is 28px, tucked above the name, doing less work than the caps label under it — so
 * the section asks the eye to read five company names in 16px type before it can tell the
 * reader anything at all. Five logos at 56px tell them at a glance. That is the whole
 * argument: not more contrast, less reading.
 *
 * **Nothing about a mark's rules changes and no mark markup is duplicated.** `lg` is a
 * third entry in `CompanyMark`'s box table, so the caps, `object-contain`, `alt=""`, the
 * failure branch and the radius are all still decided in the one place they always were.
 *
 * **The card loses a level rather than gaining one.** With the mark carrying recognition,
 * the name drops back to a caption under it and the headcount stays the card's one figure
 * — so this is a REDISTRIBUTION of the card's weight, not an addition to it.
 *
 * The honest dependency, stated once: this treatment is worth most when the mark tier is
 * ON, and it is off in production and gated on the trademark question. The name-alone card
 * is unchanged and still complete — the reserved band is per SET here, so a set with no
 * marks at all simply renders as the shipped card with a larger gap for nothing, which is
 * why the reservation is per set rather than per card.
 */
function MarksCard({
  peer,
  showFortune,
  reserveMark,
}: {
  peer: PeerCard;
  showFortune: boolean;
  reserveMark: boolean;
}) {
  const copy = usePublicCopy();
  return (
    <article className="flex h-full min-w-0 flex-col gap-4 rounded-none bg-surface p-4 md:p-5">
      <div className="flex min-w-0 flex-col gap-2.5">
        {reserveMark ? <CompanyMark src={peer.markUrl} size="lg" /> : null}
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          {/* A caption under the mark rather than the card's headline. Still an `h3` and
              still the card's accessible subject — the level is unchanged and only the
              size moved, because an outline is structure and not a size. */}
          <h3 className="min-w-0 text-sm leading-snug font-semibold text-pretty text-text-muted md:text-base">
            {peer.name}
          </h3>
          {showFortune && peer.fortuneGlobal500 ? (
            <span className="shrink-0">
              <FortuneBadge />
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex h-full min-w-0 flex-col gap-3.5">
        <CardFact label={copy.peerHeadcountLabel}>
          <p className="text-xl leading-none font-bold tracking-display text-accent-teal tabular-nums md:text-2xl">
            {peer.headcount}
          </p>
        </CardFact>
        <CardFact label={copy.peerCitiesLabel}>
          <CityCells cities={peer.cities} tone="quiet" />
        </CardFact>
        <span className="text-sm text-text-muted">
          {copy.peerSinceLabel}{" "}
          <span className="font-semibold text-text">{peer.establishedYear}</span>
        </span>
      </div>
    </article>
  );
}

/* ==========================================================================
   F — Distilled. Four elements per card and nothing else.
   ========================================================================== */

/**
 * **The one move is SUBTRACTION, and it is the only candidate that lowers the amount a
 * reader has to process rather than raising how loudly the section speaks.**
 *
 * Count what the shipped row asks for: five cards × (a mark, a name, a caps label, a
 * figure, a second caps label, two to five pills, a third label, a year) — about 60
 * elements and 15 label instances, none of which is what the reader came for. The labels
 * repeat five times each and say the same thing every time. Pills put a filled box round
 * every city, so a row of five cards carries up to eighteen small boxes competing with the
 * five figures the section exists to compare.
 *
 * So a card is four things: the mark, the name, the figure, and ONE muted line carrying
 * the cities and the year. Two of the three caps labels are gone; the cities lose their
 * pills and become the text they always were. Nothing is withheld — every fact the shipped
 * card states is still stated, in the same words.
 *
 * **What that buys is the figure.** With eleven fewer elements a card, the five figures are
 * the only substantial ink on the row, so they read as a comparison without needing to be
 * larger, coloured differently or given a ground. This is attention bought by removing
 * competition rather than by adding emphasis, which is the only kind that survives a
 * second look.
 */
function DistilledCard({
  peer,
  showFortune,
  reserveMark,
}: {
  peer: PeerCard;
  showFortune: boolean;
  reserveMark: boolean;
}) {
  const copy = usePublicCopy();
  return (
    <article className="flex h-full min-w-0 flex-col gap-3 rounded-none bg-surface p-4 md:p-5">
      {reserveMark ? <CompanyMark src={peer.markUrl} /> : null}
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <h3 className="min-w-0 text-base leading-snug font-semibold text-pretty text-text md:text-lg">
          {peer.name}
        </h3>
        {showFortune && peer.fortuneGlobal500 ? (
          <span className="shrink-0">
            <FortuneBadge />
          </span>
        ) : null}
      </div>
      {/* The card's one figure, and the one label it keeps — a bare headcount range with
          no label could be read as revenue, a year span or a rank, so this is the label
          that is carrying information rather than repeating the section heading. */}
      <div className="mt-1 flex min-w-0 flex-col gap-1.5">
        <span className="text-[0.6875rem] font-semibold tracking-caps text-text-muted uppercase">
          {copy.peerHeadcountLabel}
        </span>
        <p className="text-2xl leading-none font-bold tracking-display text-accent-teal tabular-nums">
          {peer.headcount}
        </p>
      </div>
      {/* Everything else, unlabelled and at one weight. The cities were labelled pills
          and are now the plain list they always were; the year keeps its prefix, because
          "2001" on a JPMorgan Chase card reads as a founding date without it.

          **Two lines rather than one joined by a middot, which was tried first.** A city
          list is two to five items and wraps, so a single run put "In India since" at the
          end of a wrapped line and broke the phrase across it — the join saved a line on
          two cards out of five and cost legibility on the other three. */}
      <div className="mt-auto flex min-w-0 flex-col gap-1 text-sm leading-snug text-text-muted">
        <p>{peer.cities.join(", ")}</p>
        <p>
          {copy.peerSinceLabel} {peer.establishedYear}
        </p>
      </div>
    </article>
  );
}

/* ==========================================================================
   G — Reverse. Five teal cards on the mint.
   ========================================================================== */

/**
 * **The one move is to invert the CARD rather than the band: five teal-deep cards on the
 * mint the section already sits on.**
 *
 * Same figure-ground inversion as the dark-band candidate and the opposite way round, and
 * the difference is worth stating because it is not a preference. A dark BAND makes the
 * five white cards the lit objects and needs the surrounding zone sequence to accept a
 * dark band. Dark CARDS make the five companies themselves the dark, dense objects on a
 * light band — so the alternation is untouched, the zone stays mint, and the section is
 * still unmistakably the heaviest thing on the surface.
 *
 * Ink is the inverse contract, unchanged from the terminating scale strip which is already
 * an inverse `Panel` on this screen: white name, `--ansr-text-inverse-muted` labels at
 * 7.02:1, and the figure in `--ansr-teal-bright`, which is for dark grounds only and is
 * where it belongs. City pills take `Chip`'s own `inverse` ground, which is an outline
 * rather than a fill — there is no rung below teal-deep to fill with.
 *
 * **The known defect, and it is the owner's call rather than something to design round.**
 * The lockup's `FORTUNE` is knocked OUT of its plate and the box round `GLOBAL 500` is a
 * rule with nothing inside it, so on teal-deep both fill with the ground behind them and
 * `GLOBAL` goes black-on-dark; the red plate, rule and `500` are all that survive. The
 * fills are literal and may not be recoloured except on
 * the project owner's instruction, and putting a white pill behind a trademark is chrome
 * round someone else's mark. So it renders as-is here, and if this is the treatment it
 * needs either a recolour grant or the badge moved off the card.
 */
function ReverseCard({
  peer,
  showFortune,
  reserveMark,
}: {
  peer: PeerCard;
  showFortune: boolean;
  reserveMark: boolean;
}) {
  const copy = usePublicCopy();
  return (
    <article className="flex h-full min-w-0 flex-col gap-3.5 rounded-none bg-surface-inverse p-4 md:p-5">
      <div className="flex min-w-0 flex-col gap-1.5">
        {reserveMark ? <CompanyMark src={peer.markUrl} /> : null}
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="min-w-0 text-base leading-snug font-semibold text-pretty text-text-inverse md:text-lg">
            {peer.name}
          </h3>
          {showFortune && peer.fortuneGlobal500 ? (
            <span className="shrink-0">
              <FortuneBadge />
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex h-full min-w-0 flex-col gap-3.5">
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="text-[0.6875rem] font-semibold tracking-caps text-text-inverse-muted uppercase">
            {copy.peerHeadcountLabel}
          </span>
          <p className="text-xl leading-none font-bold tracking-display text-accent-inverse tabular-nums md:text-2xl">
            {peer.headcount}
          </p>
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="text-[0.6875rem] font-semibold tracking-caps text-text-inverse-muted uppercase">
            {copy.peerCitiesLabel}
          </span>
          <CityCells cities={peer.cities} ground="inverse" />
        </div>
        <span className="text-sm text-text-inverse-muted">
          {copy.peerSinceLabel}{" "}
          <span className="font-semibold text-text-inverse">{peer.establishedYear}</span>
        </span>
      </div>
    </article>
  );
}

/* ==========================================================================
   I — Plate. G's card with B's plinth, inverted.
   ========================================================================== */

/**
 * **B and G merged, and the merge is not additive — each one supplies the thing the other
 * was missing.**
 *
 * G's move is the card fill: five teal-deep objects on the mint make the section the
 * heaviest thing on a light surface without asking the zone sequence to accept a dark band.
 * What it does not have is B's alignment — the figure is still one item in a stack, at a
 * different height on every card, so the five values that the section exists to compare do
 * not line up.
 *
 * B's move is the plinth: the figure gets a ground of its own at the foot of an
 * equal-height card, so the five plinths land on ONE line across the row. What it does not
 * have is presence — a white card with a teal foot is still a white card on a mint band.
 *
 * So: G's card, B's plinth, and **the plinth INVERTS with the card.** On a white card the
 * plinth had to be teal to register; on a teal-deep card it has to be white. It is the one
 * light plate on each of five dark objects, aligned across the row, carrying the figure in
 * the heading teal at 5.94:1 — which makes the row of headcounts the single most legible
 * thing on the band, on the darkest thing on the surface.
 *
 * **All five cards remain identical**: same fill, same plinth, same figure size, same
 * order. No card is weighted above another.
 *
 * Ink is G's inverse contract throughout the dark body — white name, `text-inverse-muted`
 * labels at 7.02:1, outlined city chips because there is no rung below teal-deep to fill
 * with. The figure moves OFF teal-bright, because on a white plinth it would be 2.1:1;
 * this is the same measurement that keeps `--ansr-teal-bright` to dark grounds only.
 *
 * **G's one defect carries over:** the lockup's `FORTUNE` is knocked out of its plate and
 * the box round `GLOBAL 500` is a bare rule, so on teal-deep both fill with the ground and
 * `GLOBAL` goes black-on-dark — the red plate, rule and `500` are all that read. The fills
 * are literal and may only be recoloured on the
 * project owner's instruction. If this is the treatment, it needs a recolour grant, or the
 * badge moves onto the white plinth beside the figure — which is a real option here that G
 * did not have, and is now the cheaper of the two.
 */
function PlateCard({
  peer,
  showFortune,
  reserveMark,
}: {
  peer: PeerCard;
  showFortune: boolean;
  reserveMark: boolean;
}) {
  const copy = usePublicCopy();
  return (
    <article className="flex h-full min-w-0 flex-col rounded-none bg-surface-inverse">
      {/* The dark body. `grow` is what pins the plinth to the foot, which is what puts the
          five plinths on one line — the same mechanism B uses and for the same reason. */}
      <div className="flex min-w-0 grow flex-col gap-3 p-4 md:p-5">
        {reserveMark ? <CompanyMark src={peer.markUrl} /> : null}
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="min-w-0 text-base leading-snug font-semibold text-pretty text-text-inverse md:text-lg">
            {peer.name}
          </h3>
          {showFortune && peer.fortuneGlobal500 ? (
            <span className="shrink-0">
              <FortuneBadge />
            </span>
          ) : null}
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="text-[0.6875rem] font-semibold tracking-caps text-text-inverse-muted uppercase">
            {copy.peerCitiesLabel}
          </span>
          <CityCells cities={peer.cities} ground="inverse" />
        </div>
        {/* No `mt-auto`, on B's reasoning: with a filled plate at the foot the slack
            collects against a hard edge, where it reads as the plate's own room rather
            than as a gap in the middle of a card. */}
        <span className="text-sm text-text-inverse-muted">
          {copy.peerSinceLabel}{" "}
          <span className="font-semibold text-text-inverse">{peer.establishedYear}</span>
        </span>
      </div>
      {/* The plate. White, because the card is dark — B's plinth inverted with its card. */}
      <div className="flex min-w-0 flex-col gap-1 bg-surface px-4 py-3 md:px-5">
        <span className="text-[0.6875rem] font-semibold tracking-caps text-text-muted uppercase">
          {copy.peerHeadcountLabel}
        </span>
        <p className="text-xl leading-none font-bold tracking-display text-accent-teal tabular-nums md:text-2xl">
          {peer.headcount}
        </p>
      </div>
    </article>
  );
}

/* ==========================================================================
   H — Rows. Five full-width rows and one column of figures.
   ========================================================================== */

/**
 * **The one move is READING DIRECTION, and it is the only candidate that can give the
 * figure a display size, because it is the only one that stops fighting for width.**
 *
 * Five columns cap the headcount at 24px — measured, twice: "22,100–22,200" wraps at 30px
 * in a 205px card, so no amount of typographic ambition gets a bigger figure out of a
 * five-across row. Turn the row ninety degrees and the constraint disappears: a full-width
 * row has 1,100px to spend, the figure sets at 38px, and the five figures stack into a
 * single trailing COLUMN that a reader compares by running one eye down it rather than by
 * saccading across five boxes and holding each value in memory. That is the cognitive-load
 * argument, and it is the substantive one — the aligned column does the comparing.
 *
 * **Every peer is still identical: same row height, same figure size, same order.** The
 * order still reads top-to-bottom exactly as it read left-to-right, so no ordinal comes
 * back and no company is drawn larger than another.
 *
 * **One slab, hairline-divided, not five floating rows** — five full-width cards on the
 * mint would put four mint stripes across the band and read as slots. And no bar on any
 * row, deliberately: the ranking below this one is bars sorted by the quantity they encode,
 * and adding bars here would make the two blocks the same block twice. What separates them
 * is that this one is in relevance order and states its figures only.
 */
function RowsPeer({
  peer,
  showFortune,
  reserveMark,
}: {
  peer: PeerCard;
  showFortune: boolean;
  reserveMark: boolean;
}) {
  const copy = usePublicCopy();
  return (
    <article className="flex min-w-0 flex-col gap-3 p-4 md:grid md:grid-cols-[1fr_auto] md:items-center md:gap-6 md:p-5">
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
          {/* The mark LEADS the name on one line here, as it does on a ranking row, so it
              is `md` rather than the comparison card's reserved band — a row's rhythm is
              set by its text either way. Reserved per set so a marked and an unmarked row
              still start their names at the same inline position. */}
          {reserveMark ? (
            <span className="shrink-0">
              <CompanyMark src={peer.markUrl} />
            </span>
          ) : null}
          <h3 className="min-w-0 text-lg leading-snug font-semibold text-pretty text-text md:text-xl">
            {peer.name}
          </h3>
          {showFortune && peer.fortuneGlobal500 ? (
            <span className="shrink-0">
              <FortuneBadge />
            </span>
          ) : null}
        </div>
        {/* Unlabelled and at one weight, on the distilled card's reasoning: the labels
            were the same two words five times over and the values say what they are. */}
        <p className="min-w-0 text-sm leading-snug text-text-muted">
          {peer.cities.join(", ")}
          <span aria-hidden> · </span>
          {copy.peerSinceLabel} {peer.establishedYear}
        </p>
      </div>
      {/* The figure column. `md:text-end` and `tabular-nums` together are what put five
          figures on one right edge with their digits in register — which is the whole
          reason this shape exists, so neither is optional. The label sits above the first
          figure only, as a column header; see `RowsSlab`. */}
      <p className="text-3xl leading-none font-bold tracking-display text-accent-teal tabular-nums md:text-end md:text-4xl">
        {peer.headcount}
      </p>
    </article>
  );
}

function RowsSlab({ view }: { view: PeerView }) {
  const peers = view.peers.peers;
  const showFortune = fortuneVisible(peers);
  const reserveMark = marksInSet(peers);
  const copy = usePublicCopy();

  return (
    <Zone ground="tint">
      <Enter>
        <Block id="peers" title={peersTitle(view, copy)} weight="lead">
          {peers.length === 0 ? (
            <p className="max-w-measure text-base text-text">{shortfallLine(view)}</p>
          ) : (
            <div className="flex flex-col gap-5">
              <div className="bg-surface">
                {/* One small-caps column header, stated once for all five, exactly as the
                    ranking states its own. Five copies of it is the ink the distilled card
                    removes, and a column is the one place a single header can serve every
                    row. Hidden below `md`, where the rows stack and the figure sits under
                    its own name rather than in a column. */}
                <p className="hidden px-5 pt-4 text-end text-[0.6875rem] font-semibold tracking-caps text-text-muted uppercase md:block">
                  {copy.peerHeadcountLabel}
                </p>
                <ul className="divide-y divide-border">
                  {peers.map((peer) => (
                    <li key={peer.id} className="min-w-0">
                      <RowsPeer
                        peer={peer}
                        showFortune={showFortune}
                        reserveMark={reserveMark}
                      />
                    </li>
                  ))}
                </ul>
              </div>
              <PeerFooter view={view} peers={peers} />
            </div>
          )}
        </Block>
      </Enter>
    </Zone>
  );
}

/* ==========================================================================
   The seam
   ========================================================================== */

/**
 * Zone 2 of the peer landscape, in whichever treatment is selected.
 *
 * `current` is the shipped composition, reproduced here rather than left in
 * `peer-view.tsx` so the four candidates and the incumbent go through one seam and
 * cannot drift apart while they are being compared.
 */
export function PeersZone({
  view,
  variant,
}: {
  view: PeerView;
  variant: PeersVariant;
}) {
  const copy = usePublicCopy();
  const peers = view.peers.peers;
  const showFortune = fortuneVisible(peers);
  const reserveMark = marksInSet(peers);

  if (variant === "exhibit") return <ExhibitZone view={view} />;
  if (variant === "authority") return <AuthorityZone view={view} />;
  if (variant === "ledger") return <LedgerZone view={view} />;
  if (variant === "overrun") return <OverrunZone view={view} />;
  if (variant === "marks") {
    return (
      <PeersSection
        view={view}
        ground="tint"
        card={(peer) => (
          <MarksCard peer={peer} showFortune={showFortune} reserveMark={reserveMark} />
        )}
      />
    );
  }
  if (variant === "distilled") {
    return (
      <PeersSection
        view={view}
        ground="tint"
        card={(peer) => (
          <DistilledCard
            peer={peer}
            showFortune={showFortune}
            reserveMark={reserveMark}
          />
        )}
      />
    );
  }
  if (variant === "reverse") {
    return (
      <PeersSection
        view={view}
        ground="tint"
        card={(peer) => (
          <ReverseCard peer={peer} showFortune={showFortune} reserveMark={reserveMark} />
        )}
      />
    );
  }
  if (variant === "rows") return <RowsSlab view={view} />;
  if (variant === "plate") {
    return (
      <PeersSection
        view={view}
        ground="tint"
        card={(peer) => (
          <PlateCard peer={peer} showFortune={showFortune} reserveMark={reserveMark} />
        )}
      />
    );
  }
  return (
    <Zone ground="tint">
      <Enter>
        {/* **A `Block`, not a `Panel`, and the accent gradient strip went with the
            border.** Five floating company cards inside a sixth bordered box is a card
            inside a card — the one nesting the craft floor treats as always wrong — and
            the outer edge was adding nothing the cards did not already have. What the
            strip was buying was "one card on this surface announces itself in colour";
            what it cost was that the primary evidence read as another panel in a stack
            of six.

            `weight="lead"` is what replaces it. The heading is a step above every other
            section's, so the hierarchy is carried by size rather than by a fill — which
            is also the honest version, since this block genuinely does outrank the five
            under it. */}
        {/* **No lead, at ANSR's request.** It was `peerLead`, the block's only statement
            of method — which industry the set was matched on and what it was ordered by.
            The heading now names the subject and the count line under the grid names the
            denominator, so what is lost is specifically the ORDERING claim: a visitor can
            no longer see why this exact five, in this exact order. `peerLead` is kept in
            `copy.ts` and still unit-tested on both branches, because it is the sentence to
            restore rather than a sentence that was wrong. On the blocked list. */}
        {/* **Derived rather than published, because it names the visitor's own company
            and the company name is optional.** See `peersTitle`. */}
        <Block id="peers" title={peersTitle(view, copy)} weight="lead">
          <PeerBlockView view={view} />
        </Block>
      </Enter>
    </Zone>
  );
}
