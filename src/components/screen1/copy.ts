import type { PeerTier } from "@/data/peers";
import type { PeerView } from "@/data/screen1";

/**
 * Screen 1's visitor-facing sentences, in one file.
 *
 * Kept out of the components on purpose. This is the wording a client reviews and
 * a copywriter edits, and hunting it through six JSX files is how "we changed one
 * word" becomes a code review. The components own layout; this owns language.
 *
 * Two rules the copy has to carry, both of them product invariants rather than
 * style preferences:
 *
 *   - A thin peer set is stated plainly, in one line, and reframed as first-mover
 *     ground. It is never padded and never hidden. The industry count that
 *     follows is what carries the weight.
 *   - Nothing claims more precision than the data has. Professionals are summed
 *     from headcount bands, so the number is approximate and says so.
 */

/** The visitor's company name when given, else a neutral stand-in. */
function subject(view: PeerView): string | null {
  const name = view.input.companyName?.trim();
  return name && name.length > 0 ? name : null;
}

export interface Framing {
  title: string;
  lead: string;
  ctaHeading: string;
  ctaBody: string;
  ctaLabel: string;
}

/**
 * The `gccStatus` input's entire consumer. It changes the framing of the whole
 * answer, because "should we do this" and "how does what we run compare" are
 * different questions over identical evidence.
 */
export function framing(view: PeerView): Framing {
  const name = subject(view);
  const industry = view.industry.industry;

  switch (view.input.gccStatus) {
    case "operating":
      return {
        title: name
          ? `How ${name}'s India GCC compares`
          : "How your India GCC compares",
        lead: `Comparable companies in ${industry}, the wider industry picture, and the scale of the India base — so you can benchmark what you already run.`,
        ctaHeading: "Getting more out of what you already run",
        ctaBody:
          "ANSR has built and run GCCs for global companies at every one of these scales. A conversation is the fastest way to find out what a benchmark like this means for your own operation.",
        ctaLabel: "Talk to ANSR about your India GCC",
      };
    case "expanding":
      return {
        title: name
          ? `The ground ${name} is expanding into`
          : "The ground you are expanding into",
        lead: `Comparable companies in ${industry}, the wider industry picture, and the scale of the India base — so you can size the next phase against what peers have already built.`,
        ctaHeading: "Sizing the next phase",
        ctaBody:
          "ANSR has taken GCCs from a first hire to several thousand people. A conversation is the fastest way to work out what the next phase costs and how quickly it can stand up.",
        ctaLabel: "Talk to ANSR about scaling your India GCC",
      };
    case "evaluating":
      return {
        title: name
          ? `Companies comparable to ${name} already run GCCs in India`
          : "Comparable companies already run GCCs in India",
        lead: `Comparable companies in ${industry}, the wider industry picture, and the scale of the India base — so you can size the decision against what peers have already done.`,
        ctaHeading: "Working out whether this is right for you",
        ctaBody:
          "ANSR has built India GCCs for global companies across every industry on this page. A conversation is the fastest way to find out what one would look like for yours.",
        ctaLabel: "Talk to ANSR about building your India GCC",
      };
  }
}

/**
 * How the peer set was matched, said out loud.
 *
 * A CIO trusts a comparison more when the method is on the page, and the ladder
 * is defensible enough to show: same industry throughout, revenue band widening
 * only when it has to, and the visitor's own market first.
 */
export function matchBasis(basis: PeerTier, revenueBand: string): string {
  switch (basis) {
    case "same-band":
      return `Same industry, ${revenueBand} revenue. Companies headquartered in your own market come first.`;
    case "adjacent-band":
      return `Same industry, ${revenueBand} revenue and the bands either side of it. Companies headquartered in your own market come first.`;
    case "industry":
      return "Same industry, across every revenue band. Companies headquartered in your own market come first.";
  }
}

/**
 * The thin-set line. One sentence, no apology, no padding.
 *
 * Returns null at a full set, so the component renders nothing rather than a
 * reassuring line nobody needed.
 */
export function shortfallLine(view: PeerView): string | null {
  const { shortfall, peers, limit } = view.peers;
  if (shortfall === 0) return null;

  const industry = view.industry.industry;
  if (peers.length === 0) {
    return `No other ${industry} company in our data runs an India GCC yet. That is genuinely open ground.`;
  }

  const count = peers.length === 1 ? "one company" : `${peers.length} companies`;
  return `${industry} is thin in India at any size — ${count} rather than ${limit}. Fewer peers is early ground, not absent ground, and we would rather show you ${peers.length} defensible comparisons than pad the list.`;
}

/**
 * The industry section's heading.
 *
 * "Bigger than five names" is true for twenty of the twenty-four industries and a
 * plain falsehood for the smallest, where the peer set already is the whole
 * industry. A heading that contradicts the number directly beneath it costs more
 * credibility than the line was ever going to buy.
 */
export function industryHeading(view: PeerView): string {
  if (view.industry.exhaustive) {
    return `All of ${view.industry.industry} in India, in one view`;
  }
  return "Your industry in India is bigger than five names";
}

/** The industry-count band. `total` leads because `others` can be zero. */
export function industryLine(view: PeerView): string {
  const { total, others, industry, exhaustive } = view.industry;
  if (exhaustive) {
    return total === 1
      ? `That is the only ${industry} company in our India GCC data.`
      : `Those are every ${industry} company in our India GCC data.`;
  }
  const clause =
    others === 1
      ? "one more beyond the companies above"
      : `${others.toLocaleString("en-US")} more beyond the companies above`;
  return `${industry} companies running a GCC in India — ${clause}.`;
}

/** The largest-in-industry panel's framing, including its two degraded shapes. */
export function largestLine(view: PeerView): string {
  const { topBand, belowTopBand, repeatsPeers, entries } = view.largest;
  const industry = view.industry.industry;

  if (entries.length === 0) {
    return `We hold no ${industry} company large enough to anchor this comparison yet.`;
  }
  if (repeatsPeers) {
    return `At ${industry}'s current depth in India, the largest companies here are the same ones shown above.`;
  }
  if (belowTopBand && topBand) {
    return `The largest ${industry} companies with an India GCC. None sits in the top revenue band yet, so this starts at ${topBand}.`;
  }
  return `The largest ${industry} companies with an India GCC, by the size of the GCC itself.`;
}

/**
 * The band that offers the visitor Screen 2.
 *
 * It lives in Screen 1's copy file because the band is on Screen 1 — the words a
 * visitor reads before they decide to go on are this screen's problem, not the
 * next screen's. Screen 2 owns the words for coming back.
 *
 * Deliberately not "see more data": it names what is on the other side, because a
 * CIO does not click a vague invitation. And it names the four function areas
 * rather than the four internal lenses, which are a filing system and never a
 * public label.
 */
export const ADVANCE = {
  kicker: "The numbers behind it",
  title: "What running a function here actually looks like",
  lead: "Talent depth, how quickly a function stands up, what the location gives you, and how the cost moves — across technology, operations, HR and finance.",
  label: "See the function view",
} as const;
