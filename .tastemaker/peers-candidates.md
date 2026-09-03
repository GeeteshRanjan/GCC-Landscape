# Peer section — candidate treatments, and the two on the shortlist

The comparison set is Screen 1's primary evidence and read as the quietest band on the surface. Nine
treatments were built and compared side by side on the real answer screen. **B and G are the shortlist;
nothing is chosen and nothing is merged.** This file is the durable record, because the harness that
draws them is temporary and everything is still uncommitted.

`.tastemaker/style-lock.md` outranks this file for anything it also covers, and `tokens.css` outranks
both. Restates no token values.

## Where the live code is

| Thing | Path |
| --- | --- |
| All nine treatments | `src/components/screen1/peers-variants.tsx` |
| The seam that selects one | `PeersZone`, same file; called from `peer-view.tsx` zone 2 |
| The switcher route | `src/app/variants/page.tsx` + `src/components/public/variant-harness.tsx` |
| How to run it | `GCC_DIST_DIR=.next-variants npx next dev -p 3400`, then `/variants` |
| Screenshots, 1440 and 390 | `.tastemaker/peers-candidates/` — B and G only |

**The whole harness is marked TEMPORARY in-code and is meant to be deleted on merge.** If it is deleted
before a choice is made, the two shortlisted card components are reproduced in full below and the
screenshots beside this file are what they looked like.

## The diagnosis

Directly above the section the snapshot puts four figures at 48px in the brand orange. The peers band
then offers a heading and five white cards whose largest ink is a 24px figure repeated five times at the
same size — a texture, not a focal point. No boundary, no ornament, no size peak, no change of pace.

**Two constraints every candidate had to obey.** No peer may be weighted above another: a wider or
taller first card restates the relevance order the reading direction already carries, and does it by
drawing one company's figure physically bigger than another's, which is a claim the data does not make.
And **30px is not available** for the headcount at five columns — "22,100–22,200" wraps in a 205px card,
measured repeatedly, so a louder figure needs a different ground under it, not a bigger size class.

## The nine, and what each move was

| Id | Name | The one move | Status |
| --- | --- | --- | --- |
| `current` | Current | What ships today | incumbent |
| `exhibit` | A | The band goes brand teal; white cards are the only lit objects | rejected |
| `authority` | B | The figure leaves the stack for a filled teal plinth at the card's foot | **shortlist** |
| `ledger` | C | Five cards become one slab of subgrid-aligned columns | rejected |
| `overrun` | D | Display heading, row breaks the container to the band's edges | rejected |
| `marks` | E | The logo becomes the card's subject at double size | open |
| `distilled` | F | Four elements a card; two caps labels and every city pill removed | open |
| `reverse` | G | Five teal-deep cards on the mint | **shortlist** |
| `rows` | H | Five full-width rows; figures at 38px in one aligned column | open |
| `plate` | I | G's teal card with B's plinth, inverted to white | open |

One further candidate was **cut rather than kept**: a band carrying `zone-streaks.svg` as brand
ornament. The asset is drawn in teal-200, which against the mint at the motif token's opacity is
invisible — it changed nothing. Run `brand_asset.py stat` and check an asset's ink against its ground
before designing round it.

## B — Authority

**The move.** The quantity the section exists for is lifted out of the fact stack and given a filled
teal plinth at the card's foot. Because it is pinned to the foot of an equal-height card, the five
plinths land on ONE line across the row — so the row gains both a focal band and the alignment the
floating cards never had, without becoming a slab.

**Why the fill is teal and the figure white.** No colour is introduced: teal is already that figure's
ink. White on `--ansr-surface-accent` is 8.55:1 against 5.94:1 for teal ink on white, so the figure
reads LOUDER at the same size — which is what routes round the 30px ceiling.

**Construction.** `Panel`'s three parts with the emphasis at the bottom rather than the top, because on
this card the identity is the label and the figure is the finding. Not a card inside a card: a region of
one card, no edge, no radius, no shadow of its own. City pills take the `quiet` tone the ranking rows
use, being the third thing on the card once the plinth exists.

**No `mt-auto` on the year, deliberately, and this inverts the shipped card's own reasoning.** There it
pushed the year to the foot and opened the slack in the MIDDLE, which reads as a card that failed to
load. With a filled plinth at the foot the slack collects immediately above it against a hard edge,
where it reads as the plinth's own room.

```tsx
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
```

Shell: `Zone ground="tint"`, the stagger step, `Block id="peers" title={peersTitle(view)} weight="lead"`,
the shipped grid geometry, then the count and shortfall lines. Unchanged from what ships.

**Open questions: none of its own.** B needs no grant and bends no rule.

## G — Reverse

**The move.** Invert the CARD rather than the band: five teal-deep cards on the mint the section already
sits on. Same figure-ground inversion as A and the opposite way round, and the difference is not a
preference — a dark BAND makes the five white cards the lit objects and needs the zone sequence to
accept a dark band; dark CARDS make the five companies themselves the dark, dense objects on a light
band, so the alternation is untouched and the zone stays mint.

**Ink is the inverse contract already used by the terminating scale strip**, which is an inverse `Panel`
on this same screen: white name, `--ansr-text-inverse-muted` labels at 7.02:1, the figure in
`--ansr-teal-bright`, which is for dark grounds only and is where it belongs. City pills take `Chip`'s
own `inverse` ground, which is an outline rather than a fill — there is no rung below teal-deep to fill
with.

```tsx
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
```

Same shell as B.

**Two open questions, both the owner's and neither designed round.**

1. **The Fortune badge loses its wordmark.** `FORTUNE` is black in Fortune's own artwork, so on
   teal-deep it disappears and the badge reads as the red `500` alone. The fills are literal and may
   only be recoloured on the project owner's instruction, and a white pill behind a trademark is chrome
   round someone else's mark. It renders as-is; it needs a recolour grant or the badge moved off the
   dark region.
2. **A dark-ink company logo disappears too.** The provider serves one file per brand with no
   dark-ground variant, and plenty of wordmarks are near-black. A/B/E/F/H all keep the mark on white and
   do not have this. **I `plate` is the answer to both if they block G** — same dark card, with the
   figure on a white plate at the foot, which is also where a badge could move.

## What the shortlist depends on outside itself

- **The per-SET mark reservation.** Every candidate reserves the mark's height only when some peer in
  the set has one. With the tier off, per-card reservation costs all five cards 28px of dead air against
  a neighbour reserving the same 28px. This is a change to a rule the owner set and is decided
  separately from the treatment.
- **Six supporting edits**, all marked temporary in-code, of which B needs none and G needs two:
  `CityCells`'s `ground` prop and its export from `evidence.tsx`. The others — `Zone`'s `accent` ground
  (A), `CompanyMark`'s `lg` size (E), `peer-view.tsx`'s `peersVariant` prop and `next.config.ts`'s
  `GCC_DIST_DIR` — go with the harness.

## The shared pieces both cards need

Recorded so this file is self-sufficient if the harness is deleted before a choice is made. `CompanyMark`,
`CityCells` and `FortuneBadge` are `evidence.tsx`'s and `screen1/fortune-badge.tsx`'s own and are not
reproduced — only the two exports that were added for the harness matter, and both are noted above.

```tsx
/** A small-caps label over a value. The card's internal unit, as shipped. */
function CardFact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="text-[0.6875rem] font-semibold tracking-caps text-text-muted uppercase">
        {label}
      </span>
      {children}
    </div>
  );
}

/** A badge every card carries is not a badge — the shipped suppression. */
function fortuneVisible(peers: readonly PeerCard[]): boolean {
  return !(peers.length > 1 && peers.every((peer) => peer.fortuneGlobal500));
}

/** Reserve the mark's height per SET, not per card. See "What the shortlist depends on". */
function marksInSet(peers: readonly PeerCard[]): boolean {
  return peers.some((peer) => peer.markUrl !== null);
}

/** One row at `lg`, one column per peer capped at five; two at `sm`; odd last card widens. */
const LG_COLS: Record<number, string> = {
  1: "lg:grid-cols-1",
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
  5: "lg:grid-cols-5",
};
const SM_SPAN_FULL = "max-lg:sm:col-span-2";

function PeerGrid({
  peers,
  card,
}: {
  peers: readonly PeerCard[];
  card: (peer: PeerCard) => React.ReactNode;
}) {
  const columns = LG_COLS[Math.min(peers.length, 5)] ?? LG_COLS[5]!;
  return (
    <ul className={cn("grid gap-3 sm:grid-cols-2 lg:gap-4", columns)}>
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

/** Zone, stagger step, `Block` heading, grid, footer. Identical in both. */
function PeersSection({
  view,
  card,
}: {
  view: PeerView;
  card: (peer: PeerCard) => React.ReactNode;
}) {
  const peers = view.peers.peers;
  const shortfall = shortfallLine(view);
  return (
    <Zone ground="tint">
      <div className="gcc-enter" style={{ "--gcc-enter-index": 2 } as React.CSSProperties}>
        <Block id="peers" title={peersTitle(view)} weight="lead">
          {peers.length === 0 ? (
            <p className="max-w-measure text-base text-text">{shortfall}</p>
          ) : (
            <div className="flex flex-col gap-5">
              <PeerGrid peers={peers} card={card} />
              <div className="flex flex-col gap-3">
                <p className="text-sm font-medium text-text">{peerCountLine(view)}</p>
                {shortfall ? (
                  <p className="max-w-measure text-sm text-text">{shortfall}</p>
                ) : null}
                {fortuneVisible(peers) ? null : (
                  <p className="text-sm text-text">
                    Every company here is in the Fortune Global 500.
                  </p>
                )}
              </div>
            </div>
          )}
        </Block>
      </div>
    </Zone>
  );
}
```
