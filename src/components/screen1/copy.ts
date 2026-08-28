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
 * Plain-English names for the tags the peers share.
 *
 * The tag vocabulary is an internal filing system, exactly like Screen 2's
 * lenses — `supply-chain-heavy` is a slug, not a sentence. Anything without an
 * entry here is dropped rather than shown with its hyphens knocked out, so a new
 * tag can never leak a slug onto the page.
 */
const TAG_PHRASES: Readonly<Record<string, string>> = {
  apparel: "apparel",
  footwear: "footwear",
  "sporting-goods": "sportswear",
  luxury: "luxury goods",
  "brand-owner": "owning consumer brands",
  "retail-operator": "running retail outlets",
  "physical-stores": "a physical store estate",
  dtc: "selling direct to consumers",
  ecommerce: "online retail",
  "supply-chain-heavy": "a global supply chain",
  "fashion-cycle": "seasonal product cycles",
  pharmaceutical: "pharmaceuticals",
  biotech: "biotechnology",
  "medical-device": "medical devices",
  diagnostics: "diagnostics",
  "hospital-care": "care delivery",
  "clinical-research": "clinical research",
  "clinical-regulated": "clinical regulation",
  "banking-lending": "lending",
  "insurance-underwriting": "underwriting",
  "balance-sheet-risk": "carrying risk on the balance sheet",
  "asset-management": "asset management",
  "capital-markets": "capital markets",
  "payments-processing": "payment processing",
  fintech: "financial technology",
  security: "security products",
  "data-analytics": "data and analytics",
  "ai-ml": "machine learning",
  "cloud-infrastructure": "cloud infrastructure",
  "developer-tools": "developer tooling",
  "core-business-systems": "systems of record",
  saas: "subscription software",
  "software-product": "software products",
  "serves-healthcare": "selling to healthcare",
  "serves-financial": "selling to financial services",
  "serves-retail": "selling to retailers",
  "serves-industrial": "selling to industry",
  "enterprise-accounts": "enterprise sales",
  "r-and-d-intensive": "heavy R&D",
  "capital-intensive": "capital intensity",
  regulated: "a regulated environment",
  "safety-critical": "safety-critical engineering",
  "field-operations": "field operations",
  "billable-hours": "billable professional work",
  "project-revenue": "project-based delivery",
  "discrete-manufacturing": "discrete manufacturing",
  "process-manufacturing": "process manufacturing",
  "vehicle-components": "vehicle components",
  "vehicle-oem": "vehicle manufacturing",
  semiconductor: "semiconductors",
  "fabless-design": "fabless chip design",
  "telecom-services": "network operations",
  "freight-logistics": "freight and logistics",
  "engineering-construction": "engineering and construction",
  "packaged-food": "packaged food",
  beverages: "beverages",
  "personal-care": "personal care",
  "building-materials": "building materials",
  "oil-gas": "oil and gas",
  "power-generation": "power generation",
};

/** At most three, so the sentence stays a sentence. */
function phraseTags(tags: readonly string[], limit = 3): string[] {
  const phrases: string[] = [];
  for (const tag of tags) {
    const phrase = TAG_PHRASES[tag];
    if (phrase && !phrases.includes(phrase)) phrases.push(phrase);
    if (phrases.length === limit) break;
  }
  return phrases;
}

function joinPhrases(phrases: readonly string[]): string {
  if (phrases.length <= 1) return phrases[0] ?? "";
  if (phrases.length === 2) return `${phrases[0]} and ${phrases[1]}`;
  return `${phrases.slice(0, -1).join(", ")} and ${phrases.at(-1)}`;
}

/**
 * How the peer set was matched, said out loud.
 *
 * A CIO trusts a comparison more when the method is on the page. Two shapes,
 * because there are two genuinely different methods:
 *
 *  - With a line of business, the sentence names WHAT THE PEERS HAVE IN COMMON.
 *    That is both more useful and more honest than naming a revenue band, which
 *    the peer card does not even display.
 *  - Without one, the original three sentences are used verbatim, so an untagged
 *    industry reads exactly as it did before any of this existed.
 */
export function matchBasisFor(view: PeerView): string {
  const { businessMatched, sharedTags, basis } = view.peers;
  const businessType = view.industry.businessType;

  if (businessMatched && businessType) {
    const phrases = phraseTags(sharedTags);
    const shared = phrases.length > 0 ? `, and share ${joinPhrases(phrases)}` : "";
    return `Matched on your line of business — ${businessType.name.toLowerCase()}${shared}. Revenue band is a preference, not a filter, so a closer business beats a closer size.`;
  }

  return matchBasis(basis, view.input.revenueBand);
}

/**
 * The peer section's lead — the one line under the heading.
 *
 * It used to be a hardcoded string in `peer-view.tsx`: "Same industry, closest
 * revenue band, and companies from your own market first." That was true of the
 * band ladder and became false when matching went continuous, and it contradicted
 * `matchBasisFor` three lines below it on the same card, which says revenue band
 * is a preference rather than a filter. It was also observably wrong on the
 * flagship example — a US apparel visitor is shown H&M and Adidas, so "your own
 * market first" is not what happened.
 *
 * So it is derived rather than written, and it lives here because `copy.ts` holds
 * every visitor-facing sentence on this screen.
 */
export function peerLead(view: PeerView): string {
  const businessType = view.industry.businessType;

  if (view.peers.businessMatched && businessType) {
    // Named first because it is the strongest signal and the one the visitor
    // chose. Revenue band is mentioned as the secondary sort it actually is.
    return `Companies in the same line of business, closest revenue size second. Those headquartered in your own market come first only where the rest is equal.`;
  }

  // No line of business given: matching really is band-led, and the old sentence
  // is accurate again.
  return "Same industry, closest revenue band, and companies from your own market first.";
}

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
  const { shortfall, peers, limit, floorShortened } = view.peers;
  if (shortfall === 0) return null;

  const industry = view.industry.industry;
  const businessType = view.industry.businessType;

  if (peers.length === 0) {
    if (businessType) {
      return `No other ${businessType.name.toLowerCase()} in our data runs an India GCC yet. That is genuinely open ground.`;
    }
    return `No other ${industry} company in our data runs an India GCC yet. That is genuinely open ground.`;
  }

  const count = peers.length === 1 ? "one company" : `${peers.length} companies`;

  /**
   * A floor-shortened set is a DIFFERENT claim from a thin industry, and they must
   * not share a sentence. Here the industry has plenty of companies; what it does
   * not have is more that are genuinely comparable. Saying "this industry is thin"
   * over a 656-company industry would be visibly false.
   */
  if (floorShortened && businessType) {
    return `${industry} is not short of companies in India — but only ${count} are close enough to your line of business to be worth naming. We would rather show you ${peers.length} defensible comparisons than pad the list.`;
  }

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

/**
 * The industry-count band. `total` leads because `others` can be zero.
 *
 * With a line of business it becomes a two-level count, which is strictly stronger
 * evidence: a named set of peers, then how many others do the same thing, then how
 * many more are in the industry at all. That is what turns a thin peer set from a
 * weakness into a floor.
 */
export function industryLine(view: PeerView): string {
  const { total, others, industry, exhaustive, businessType } = view.industry;
  if (exhaustive) {
    return total === 1
      ? `That is the only ${industry} company in our India GCC data.`
      : `Those are every ${industry} company in our India GCC data.`;
  }

  if (businessType && businessType.count > 0) {
    // The business-type name is used as a LABEL rather than folded into the
    // sentence, because the names are singular ("Apparel & footwear brand") and
    // pluralising them in code produces "29 other companies in apparel & footwear
    // brand runs a GCC". A label sidesteps agreement entirely and reads cleanly
    // for all 158 of them.
    const same =
      businessType.count === 1
        ? "one other company in a comparable line of business runs a GCC in India"
        : `${businessType.count.toLocaleString("en-US")} companies in a comparable line of business run a GCC in India`;
    const rest = total - businessType.count;
    if (rest > 0) {
      return `${businessType.name} — ${same}, and ${rest.toLocaleString("en-US")} more across ${industry}.`;
    }
    return `${businessType.name} — ${same}.`;
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
