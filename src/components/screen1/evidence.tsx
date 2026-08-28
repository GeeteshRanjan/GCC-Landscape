import type { PeerCard, PeerView } from "@/data/screen1";
import { cn } from "@/lib/utils";
import { industryLine, largestLine, matchBasisFor, shortfallLine } from "./copy";
import {
  Chip,
  FactList,
  formatCount,
  formatProfessionals,
  Provenance,
} from "@/components/public/primitives";

/**
 * The four evidence blocks, plus the common-function list.
 *
 * Every one of them shows rather than describes: peers are cards with their own
 * facts, the industry count is one figure at display size, the largest companies
 * are a ranked set with proportional bars, and scale is three figures with their
 * caveats attached. There is no paragraph on this screen explaining what a peer
 * card would have said.
 *
 * The degenerate cases are the interesting part, and each is handled explicitly
 * rather than left to render badly:
 *
 *   - A short peer set is stated in one line and never padded.
 *   - The industry count leads with the industry total, because "and 0 others" is
 *     what `others` says for the two smallest industries.
 *   - The largest-in-industry panel collapses to a line when it would otherwise
 *     repeat the peer cards verbatim, which is what happens whenever the peer set
 *     already exhausted the industry.
 */

function PeerCardView({
  peer,
  alsoPeer = false,
}: {
  peer: PeerCard;
  /** Marked when this company already appeared in the peer set above. */
  alsoPeer?: boolean;
}) {
  return (
    <li className="flex flex-col gap-4 border border-border-subtle bg-surface p-6">
      <div className="flex flex-col gap-2">
        <h4 className="text-lg font-semibold tracking-heading text-text">
          {peer.name}
        </h4>
        <div className="flex flex-wrap gap-2">
          {peer.fortuneGlobal500 ? <Chip tone="accent">Fortune Global 500</Chip> : null}
          {alsoPeer ? <Chip>Also in your peer set</Chip> : null}
        </div>
      </div>

      <FactList
        facts={[
          { term: "India headcount", value: peer.headcount },
          { term: "Established", value: String(peer.establishedYear) },
        ]}
      />

      <div className="flex flex-col gap-2">
        <p className="text-xs text-text-muted">
          {peer.cities.length === 1 ? "Location" : "Locations"}
        </p>
        <ul className="flex flex-wrap gap-2">
          {peer.cities.map((city) => (
            <li key={city}>
              <Chip>{city}</Chip>
            </li>
          ))}
        </ul>
      </div>
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
          One bad comparison costs more than a short list.
        </Provenance>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {view.peers.peers.map((peer) => (
          <PeerCardView key={peer.id} peer={peer} />
        ))}
      </ul>

      {shortfall ? (
        // The one line the invariant requires. Plain, not apologetic, and
        // immediately before the industry count that carries the weight.
        <p className="max-w-measure text-base font-medium text-text">{shortfall}</p>
      ) : null}

      <Provenance>
        {matchBasisFor(view)} Headcount is shown
        as a band because that is how it is held — we do not publish a per-company
        figure we cannot stand behind.
      </Provenance>
    </div>
  );
}

/**
 * The industry count. One figure, at the largest size on the screen.
 *
 * This is the block that turns a thin peer set from a weakness into evidence:
 * five named companies plus "and 184 others in BFSI" reads stronger than five
 * names alone. It leads with the industry total rather than the remainder because
 * the remainder is zero for Electrical & Electronics and Restaurant & Food
 * Service, and a headline number that can be zero is not a headline.
 */
export function IndustryCountView({ view }: { view: PeerView }) {
  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-center md:gap-12">
      <p className="text-6xl leading-tight font-bold tracking-display text-accent-teal tabular-nums">
        {formatCount(view.industry.total)}
      </p>
      <div className="flex max-w-measure flex-col gap-3">
        <p className="text-xl font-medium text-text">{industryLine(view)}</p>
        <p className="text-sm text-text-muted">
          Every one of them made the same decision you are weighing, and did it
          without knowing what you now know about the others.
        </p>
      </div>
    </div>
  );
}

/**
 * The largest companies in the industry — a ranked list, not a card grid.
 *
 * The form carries the claim. "Largest" is a magnitude, and a grid of equal cards
 * cannot show one; a ranked row with a proportional bar can. It also solves a real
 * repetition problem: at the top revenue band the largest companies overlap
 * heavily with the peer set, and three identical cards restated under a new
 * heading made the screen look padded. As rows, an overlap is a marker rather than
 * a duplicate.
 *
 * The bar is a share against the largest in the set. The visible figure stays the
 * headcount band — a ratio derived from band midpoints is honest as a bar length
 * and would not be honest as a published number.
 */
export function LargestBlockView({ view }: { view: PeerView }) {
  const { entries, repeatsPeers, shortfall } = view.largest;
  const line = largestLine(view);

  if (entries.length === 0 || repeatsPeers) {
    return <p className="max-w-measure text-base text-text">{line}</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <ol className="flex flex-col">
        {entries.map((entry, index) => (
          <li
            key={entry.company.id}
            className="flex flex-col gap-3 border-b border-border-subtle py-4 first:border-t"
          >
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
              <span
                aria-hidden="true"
                className="text-sm font-semibold text-accent-teal tabular-nums"
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <h4 className="text-lg font-semibold tracking-heading text-text">
                {entry.company.name}
              </h4>
              <span className="text-sm text-text-muted tabular-nums">
                {entry.company.headcount} in India
              </span>
              <span className="text-sm text-text-muted tabular-nums">
                since {entry.company.establishedYear}
              </span>
              {entry.company.fortuneGlobal500 ? (
                <Chip tone="accent">Fortune Global 500</Chip>
              ) : null}
              {entry.alsoPeer ? <Chip>Also in your peer set</Chip> : null}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {/* Restates the band beside it, so it carries nothing of its own and
                  is hidden rather than announced twice. */}
              <div
                aria-hidden="true"
                className="h-1.5 w-full max-w-xs bg-surface-sunken"
              >
                <div
                  className="h-full bg-accent-teal"
                  style={{ width: `${Math.max(entry.sizeShare * 100, 2)}%` }}
                />
              </div>
              <p className="text-xs text-text-muted">
                {entry.company.cities.join(" · ")}
              </p>
            </div>
          </li>
        ))}
      </ol>
      <Provenance>
        {line}
        {shortfall > 0
          ? ` We hold ${entries.length} rather than ${view.peers.limit}; the industry does not go deeper in India yet.`
          : ""}{" "}
        Ranked by the size of the India GCC, not by revenue — we hold revenue as
        bands, so nothing here is ranked by it.
      </Provenance>
    </div>
  );
}

export function CommonFunctionsView({ view }: { view: PeerView }) {
  return (
    <div className="flex flex-col gap-6">
      <ol className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
        {view.functions.map((fn, index) => (
          <li
            key={fn}
            className="flex items-baseline gap-4 border-b border-border-subtle pb-3"
          >
            <span
              aria-hidden="true"
              className="text-sm font-semibold text-accent-teal tabular-nums"
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="text-base text-text">{fn}</span>
          </li>
        ))}
      </ol>
      {/* Rendered from the model's own `functionsBasis`, so the list cannot ship
          without the sentence saying what it is. */}
      <Provenance>{view.functionsBasis}</Provenance>
    </div>
  );
}

/**
 * Scale proof, across all of India rather than the peer set — which is the whole
 * point of the block, and the brief says so explicitly.
 */
export function NationalScaleView({ view }: { view: PeerView }) {
  const { scale } = view;

  const figures = [
    {
      value: formatCount(scale.fortuneGlobal500Count),
      label: "Fortune Global 500 companies run a GCC in India",
      footnote: "Out of 500.",
    },
    {
      value: formatProfessionals(scale.fortuneGlobal500Professionals),
      label: "professionals working in those GCCs",
      footnote: "Approximate: summed from headcount bands.",
    },
    {
      value: formatCount(scale.companyCount),
      label: "India GCCs on our map in total",
      footnote: `Including ${formatCount(scale.forbesGlobal2000Count)} Forbes Global 2000 companies.`,
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <dl className="grid gap-8 sm:grid-cols-3">
        {figures.map((figure) => (
          <div key={figure.label} className="flex flex-col gap-1">
            <dd
              className={cn(
                "text-4xl leading-tight font-bold tracking-display tabular-nums text-text",
                "md:text-5xl",
              )}
            >
              {figure.value}
            </dd>
            <dt className="text-sm font-medium text-text">{figure.label}</dt>
            <p className="text-xs text-text-muted">{figure.footnote}</p>
          </div>
        ))}
      </dl>
      <Provenance>
        Headcount is held as bands, so totals are the sum of band midpoints and
        are rounded to the nearest ten thousand. We would rather round than imply
        a precision the data does not have.
      </Provenance>
    </div>
  );
}
