import type { PeerCard, PeerView } from "@/data/screen1";
import { cn } from "@/lib/utils";
import { industryLine, largestLine, matchBasisFor, shortfallLine } from "./copy";
import {
  Chip,
  formatCount,
  formatProfessionals,
  Provenance,
  Stat,
} from "@/components/public/primitives";
import {
  BarTrack,
  FractionBar,
  ProportionSplit,
} from "@/components/public/charts";

/**
 * The four evidence blocks, plus the common-function list.
 *
 * Every one of them shows rather than describes, and each one shows the thing its
 * own claim is about — which is what changed here. Three of the four used to draw
 * the same thin bar:
 *
 *   - **The industry count** is a claim about a PROPORTION: five named companies
 *     out of fifty-nine. So it is drawn as one divided bar with the named peers as
 *     its leading slice. A single large number could not say "the five were
 *     selected", and that is the whole reason this block exists — it is what turns
 *     a thin peer set from a weakness into evidence.
 *   - **The largest in the industry** is a claim about MAGNITUDE, so it stays a
 *     ranked chart, on a proper shared axis with a baseline rather than five
 *     floating hairlines.
 *   - **The Fortune Global 500 count** is a claim about a FRACTION of a known list,
 *     so the denominator is drawn instead of being left in a footnote.
 *
 * The degenerate cases are still the interesting part, and each is handled rather
 * than left to render badly: a short peer set is stated in one line and never
 * padded, the industry split collapses to a single segment when the peers are the
 * whole industry, and the largest panel collapses to a line when it would repeat
 * the cards above it.
 */

/* ==========================================================================
   Peers
   ========================================================================== */

/**
 * One comparable company.
 *
 * Rebuilt for density rather than restyled. The card carried four labelled facts
 * in four stacked blocks with a gap between each, so five cards of three or four
 * short values each produced a grid of tall, mostly empty boxes — the single most
 * visible weakness on the screen. What it holds is a name, a year, a headcount
 * band and one to five cities; that is a dense object, and the layout now treats
 * it as one.
 *
 * The year leads the card as a rule above the name, because for a visitor
 * evaluating a first India centre "a company like us has been doing this since
 * 2013" is the fact on this card that changes a mind.
 */
/**
 * How each peer card spans a six-column row, so no row is left part-empty.
 *
 * A peer set is one to five companies, and three-to-a-row left a visible hole at
 * `lg` in the two commonest cases: five peers drew 3 + 2-and-a-gap, and four drew
 * 3 + 1-and-two-gaps. An empty cell in a grid of evidence reads as a card that
 * failed to load, which is the last thing this block can afford — it is the one
 * carrying invariant 2's "the free layer must stand alone as credible".
 *
 * So the row is six columns and a card takes two of them (three per row) or three
 * (two per row), whichever tiles the count exactly. Every size fills except one
 * peer, where nothing can: a single card stretched across a full row is not a
 * comparison, and a thin industry is supposed to look thin.
 *
 * Widening rather than stretching is deliberate. The alternative — padding the row
 * out with an empty cell — is what it does today, and equalising heights instead
 * would trade this hole for the one `items-start` exists to prevent.
 */
function peerSpans(count: number): string[] {
  const THIRD = "lg:col-span-2";
  const HALF = "lg:col-span-3";
  // Two and four tile exactly as two-per-row; five is three-then-two; three is a
  // full row already; one cannot tile and keeps the narrow width.
  if (count === 2 || count === 4) return Array(count).fill(HALF);
  if (count === 5) return [THIRD, THIRD, THIRD, HALF, HALF];
  return Array(count).fill(THIRD);
}

function PeerCardView({
  peer,
  alsoPeer = false,
  spanClass,
}: {
  peer: PeerCard;
  /** Marked when this company already appeared in the peer set above. */
  alsoPeer?: boolean;
  /** How much of the six-column row this card takes. Absent outside that grid. */
  spanClass?: string;
}) {
  return (
    // Borderless white on the teal tint band. The outline is gone because the
    // ground now supplies the edge — the same reason ansr.com's own cards have no
    // border. It was necessary against grey-50, which is two steps off white.
    <li className={cn("flex flex-col gap-5 bg-surface p-6 md:p-7", spanClass)}>
      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-semibold tracking-caps text-accent-teal uppercase tabular-nums">
          In India since {peer.establishedYear}
        </p>
        {/* Up from 18px. The company name is what a visitor scans this grid for,
            and at 18px it was the same size as the body copy under it. */}
        <h4 className="text-xl font-bold tracking-heading text-text">
          {peer.name}
        </h4>
      </div>

      <div className="flex flex-col gap-3 border-t border-border-subtle pt-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4">
            <p className="text-xs text-text-muted">India headcount</p>
            <p className="text-sm font-semibold text-text tabular-nums">
              {peer.headcount}
            </p>
          </div>
          {/* The one mark on this card, and the reason it is here: "companies like
              yours are already here" invites "and how big did they get" straight
              away, and five headcount BANDS in five separate boxes make the reader
              compare "300–400" with "900–1,000" with "under 50" by reading rather
              than by looking. Scaled against the largest of the five, so the bars
              compare the peers with each other. */}
          <BarTrack share={peer.sizeShare} />
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="text-xs text-text-muted">
            {peer.cities.length === 1 ? "Location" : "Locations"}
          </p>
          {/* Plain text rather than a chip per city. Five chips in a narrow card
              wrapped to three rows of pills and read as tags to filter by, which
              they are not — nothing on this screen is interactive. */}
          <p className="text-sm text-text">{peer.cities.join(" · ")}</p>
        </div>
      </div>

      {peer.fortuneGlobal500 || alsoPeer ? (
        <div className="flex flex-wrap gap-2">
          {peer.fortuneGlobal500 ? (
            <Chip tone="accent">Fortune Global 500</Chip>
          ) : null}
          {/* Ground stays `surface`: the chip is inside the white card, not on the
              tint band the card sits on. */}
          {alsoPeer ? <Chip>Also in your peer set</Chip> : null}
        </div>
      ) : null}
    </li>
  );
}

export function PeerBlockView({ view }: { view: PeerView }) {
  const shortfall = shortfallLine(view);

  if (view.peers.peers.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <p className="max-w-measure text-base text-text">{shortfall}</p>
        <Provenance>
          We never pad a peer set with a company you can see is not comparable.
        </Provenance>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Six columns rather than three, and `items-start` so a company with five
          cities does not set the height of the four beside it. The columns are
          six so a row can be filled by two cards as well as by three — see
          `peerSpans`. */}
      <ul className="grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-6">
        {view.peers.peers.map((peer, i) => (
          <PeerCardView
            key={peer.id}
            peer={peer}
            spanClass={peerSpans(view.peers.peers.length)[i]}
          />
        ))}
      </ul>

      {shortfall ? (
        // The one line the invariant requires. Plain, not apologetic, and
        // immediately before the industry count that carries the weight.
        <p className="max-w-measure text-base font-medium text-text">{shortfall}</p>
      ) : null}

      <Provenance>{matchBasisFor(view)}</Provenance>
    </div>
  );
}

/* ==========================================================================
   The industry count
   ========================================================================== */

/**
 * The industry, with the named peers drawn as its leading slice.
 *
 * This is the block that turns a thin peer set from a weakness into evidence, and
 * it could not do that as a number. "59" beside "5 companies match you closely"
 * leaves the reader to relate the two; one divided bar does the relating, and what
 * they then see is that five is a SELECTION rather than the supply.
 *
 * The segments come from `industrySplit`, so they always sum to the total and the
 * degenerate cases are already resolved: an exhaustive industry arrives as a single
 * segment, and an unanswered line of business as two rather than three.
 */
export function IndustryCountView({ view }: { view: PeerView }) {
  const { split, total } = view.industry;

  return (
    // A light card on the inverse band, which is how ansr.com puts a figure on a
    // dark ground — and here it is also what lets the chart stay exactly as it is.
    // `ProportionSplit` draws a grey track, a teal fill and black labels; all three
    // are correct on white and none of them are on deep teal. Recolouring eleven
    // marks for one placement would have been eleven chances for a track and its
    // fill to end up the same value, so the ground moves instead of the chart.
    <div className="bg-surface p-6 md:p-8">
      <ProportionSplit
        total={formatCount(total)}
        totalLabel={industryLine(view)}
        segments={split.map((segment) => ({
          label: segment.label,
          figure: formatCount(segment.count),
          share: segment.share,
          lead: segment.lead,
        }))}
      />
    </div>
  );
}

/* ==========================================================================
   The largest in the industry
   ========================================================================== */

/**
 * A ranked chart, not a card grid.
 *
 * The form carries the claim. "Largest" is a magnitude, and a grid of equal cards
 * cannot show one. It also solves a real repetition problem: at the top revenue
 * band the largest companies overlap heavily with the peer set, and three
 * identical cards restated under a new heading made the screen look padded. As
 * rows, an overlap is a marker rather than a duplicate.
 *
 * The bar is a share against the largest in the set, and the visible figure stays
 * the headcount band — a ratio derived from band midpoints is honest as a bar's
 * length and would not be honest as a published number. The mark itself comes from
 * `BarTrack`, so it is the same object as every bar on Screen 2; only the row
 * around it is local, because it carries index badges and a city caption that a
 * chart primitive has no business modelling.
 */
export function LargestBlockView({ view }: { view: PeerView }) {
  const { entries, repeatsPeers, shortfall } = view.largest;
  const line = largestLine(view);

  if (entries.length === 0 || repeatsPeers) {
    return <p className="max-w-measure text-base text-text">{line}</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <ol className="flex flex-col gap-5">
        {entries.map((entry, index) => (
          <li key={entry.company.id} className="flex flex-col gap-2">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span
                aria-hidden="true"
                className="text-xs font-semibold text-text-muted tabular-nums"
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <h4 className="text-base font-semibold tracking-heading text-text">
                {entry.company.name}
              </h4>
              {entry.company.fortuneGlobal500 ? (
                <Chip tone="accent">Fortune Global 500</Chip>
              ) : null}
              {entry.alsoPeer ? <Chip>Also in your peer set</Chip> : null}
              {/* Right-aligned into its own column, so five bands form a
                  readable stack of figures instead of ending wherever the
                  company name happened to stop. */}
              <span className="ms-auto text-sm font-semibold text-text tabular-nums">
                {entry.company.headcount}
              </span>
            </div>
            <BarTrack share={entry.company.sizeShare} emphasis={index === 0} />
            <p className="text-xs text-text-muted">
              {entry.company.cities.join(" · ")} · since{" "}
              <span className="tabular-nums">{entry.company.establishedYear}</span>
            </p>
          </li>
        ))}
      </ol>
      {/* One shared baseline under the whole set, which is what makes five bars a
          chart rather than five unrelated rules. */}
      <div aria-hidden="true" className="h-px w-full bg-border-strong" />
      <Provenance>
        {line}
        {shortfall > 0
          ? ` We hold ${entries.length} rather than ${view.peers.limit}; the industry does not go deeper in India yet.`
          : ""}{" "}
        Bars compare the size of the India centre, not revenue — revenue is held as
        bands, so nothing here is ranked by it.
      </Provenance>
    </div>
  );
}

/* ==========================================================================
   What they run
   ========================================================================== */

/**
 * The function list.
 *
 * Deliberately the one block on this screen with no mark on it. There is no
 * per-company function data and there will not be — the order is a general
 * pattern, most to least common, and drawing a bar beside each would invent a
 * magnitude the dataset does not contain. Two columns, ranked, with the basis
 * rendered from the model's own `functionsBasis` so the list cannot ship without
 * the sentence that says what it is.
 */
export function CommonFunctionsView({ view }: { view: PeerView }) {
  return (
    <div className="flex flex-col gap-6">
      {/* One column, not two: this block now sits in the 7-column well of a split
          section, where two columns of eight short items produced four cramped
          rows against a 48px heading beside them. `border-tint` rather than
          `border-subtle`, which is grey-100 and therefore lighter than the teal
          tint it would be drawn on. */}
      <ol className="grid gap-x-10 sm:grid-cols-2">
        {view.functions.map((fn, index) => (
          <li
            key={fn}
            className="flex items-baseline gap-4 border-b border-border-tint py-3.5"
          >
            <span
              aria-hidden="true"
              className="text-xs font-semibold text-accent-teal tabular-nums"
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="text-base text-text">{fn}</span>
          </li>
        ))}
      </ol>
      <Provenance>{view.functionsBasis}</Provenance>
    </div>
  );
}

/* ==========================================================================
   National scale
   ========================================================================== */

/**
 * Scale proof, across all of India rather than the peer set — which is the whole
 * point of the block, and the brief says so explicitly.
 *
 * The Fortune Global 500 figure is drawn as a fraction rather than shown as a
 * count with "Out of 500." in a footnote underneath it. The denominator IS the
 * evidence here: 181 is a number a reader has to place, and "181 of the 500" is a
 * number that places itself. The other two have no fixed denominator to draw
 * against, so they stay as figures — a bar with nothing to be a share of is
 * decoration.
 */
export function NationalScaleView({ view }: { view: PeerView }) {
  const { scale } = view;

  return (
    // On the inverse ground, reversed out. This is the last evidence before the
    // ask and it is three large numbers, so it is the one block that earns the
    // dark band directly rather than through a card.
    <div className="flex flex-col gap-10">
      <div className="grid items-start gap-10 sm:grid-cols-3">
        <FractionBar
          value={formatCount(scale.fortuneGlobal500Count)}
          ofLabel="of the Fortune Global 500"
          share={scale.fortuneGlobal500Share}
          label="already run a GCC in India"
          ground="inverse"
        />
        <FractionBar
          value={formatCount(scale.forbesGlobal2000Count)}
          ofLabel="of the Forbes Global 2000"
          share={scale.forbesGlobal2000Share}
          label="already run a GCC in India"
          ground="inverse"
        />
        {/* No bar: there is no denominator to draw this against, and a bar with
            nothing to be a share of is decoration. So it is a `Stat` rather than a
            third `FractionBar` — the rule under the figure is what gives it the
            same footing as the two bars beside it without inventing an axis. */}
        <Stat
          value={formatProfessionals(scale.fortuneGlobal500Professionals)}
          label="professionals inside those Fortune 500 centres"
          footnote={`${formatCount(scale.companyCount)} India GCCs on our map in total.`}
          size="display"
          ground="inverse"
        />
      </div>
      <Provenance ground="inverse">
        Headcount is held as bands, so professionals are the sum of band midpoints,
        rounded to the nearest ten thousand.
      </Provenance>
    </div>
  );
}
