import type { PeerTier } from "@/data/peers";
import type { PeerView } from "@/data/screen1";

/**
 * Screen 1's visitor-facing sentences, in one file.
 *
 * Kept out of the components on purpose. This is the wording a client reviews and
 * a copywriter edits, and hunting it through six JSX files is how "we changed one
 * word" becomes a code review. The components own layout; this owns language.
 *
 * **Who this is written for.** Not ANSR, and not an analyst. A CIO, COO, CHRO or
 * CFO at a large global company with no India centre yet, who has arrived from an
 * ansr.com page or an email and will give this ninety seconds. They want to know
 * whether companies like theirs are already here and what that looked like. Three
 * things follow, and each of them cost the previous version something:
 *
 *   - **Every heading states the finding, not the mechanism.** A section called
 *     "The wider industry" makes the reader work out what they are being shown; one
 *     that says how many of their industry are already here does not.
 *   - **Sentences carry one fact.** The leads ran to three clauses joined by dashes
 *     — "comparable companies, the wider industry picture, and the scale of the
 *     India base, so you can size the decision" — which is a table of contents in
 *     prose form, restating the section headings the reader is about to scroll past.
 *   - **The tool never describes its own integrity.** Lines like "we would rather
 *     show you three defensible comparisons than pad the list" and "we do not
 *     publish a per-company figure we cannot stand behind" are true, and are the
 *     reason the data is trustworthy, and are still the wrong words on the page:
 *     they raise a doubt the reader did not have. The behaviour stays; the
 *     narration goes.
 *
 * Two rules on top of that, both product invariants rather than style:
 *
 *   - A thin peer set is stated plainly, in one line, and reframed as first-mover
 *     ground. It is never padded and never hidden. The industry count that
 *     follows is what carries the weight.
 *   - Nothing claims more precision than the data has. Professionals are summed
 *     from headcount bands, so the number is approximate and says so.
 */

/**
 * The ask — the first thing a visitor reads, and the only screen state where the
 * tool has shown them nothing yet.
 *
 * So it gets one claim and one number, and stops. The previous version put the
 * claim, the mechanism and the corpus size in a single sentence joined by a dash,
 * then repeated the corpus size as bold text inside it, then followed it with
 * "Four answers. Twenty seconds." — a promise about the form's length, above a
 * form with six fields, two of them optional. That line is gone rather than
 * corrected: a visitor deciding whether to spend ninety seconds is not weighing
 * twenty against forty, and a number on the page that disagrees with the thing
 * directly under it costs more than the reassurance was worth.
 *
 * `title` is the claim. It is true for every industry in the data — the thinnest
 * has two companies — and it is a statement rather than an offer, which is what
 * 80px of type is for. "See who in your industry already runs a GCC in India" was
 * the previous headline and it described the tool; this describes their situation.
 *
 * `lead` carries one fact and one promise, one short sentence each. Nothing in it
 * qualifies, hedges or sells: the number is either persuasive on its own or it is
 * not, and this audience discounts a screen that reads as marketing.
 */
/**
 * **The hero's own words are no longer here.** The title and the supporting line
 * come from `dataset.siteContent.hero`, edited in admin and published with
 * everything else — see `heroCopySchema`. They moved because they are
 * positioning rather than an argument about the data: every other string in this
 * file is derived from or reasons about the dataset, and changing one is a
 * reviewable code change. A headline is marketing's to change on a Tuesday.
 *
 * What is left here is the form's own chrome, which is not positioning: it
 * describes controls this file's own component owns.
 *
 * Three lines were removed outright rather than moved, and each is asserted
 * absent by a browser spec:
 *
 *   - The hero's uppercase kicker. The product label IS the headline now, so an
 *     eyebrow above it would have been the same words twice.
 *   - The hero's outlined pill ("Choose your industry"). It moved focus to the
 *     industry select, which earned its place when the form was a full band
 *     below the fold. The form now overlaps the hero, so its first field is
 *     already on screen and the pill was a control that scrolled you to
 *     something you could see.
 *   - "Your answers build this one result. Nothing is kept." True, and still
 *     true, but it answers a doubt at the exact moment the visitor is deciding
 *     to submit — and the tool does not narrate its own integrity. Not keeping
 *     anything is enforced by there being no store, not by a promise.
 */
export const ASK = {
  panelTitle: "Set your company context",
  submit: "See my results",
  submitPending: "Finding comparable companies…",
} as const;

/**
 * The customer-logo strip.
 *
 * **It has no visible heading, and that is the requirement rather than an
 * oversight** — so the section carries an accessible name instead, which is what
 * makes it a real `region` landmark rather than an anonymous `<section>`.
 *
 * The name is the one place the claim gets stated precisely, and the precision
 * matters: these are companies ANSR has worked with in India. Nothing here says
 * or implies they used this tool, because they did not.
 */
export const CUSTOMERS = {
  label: "Companies ANSR has worked with in India",
} as const;

/**
 * The impact band.
 *
 * The figures themselves are `dataset.siteContent.impactStats` — ANSR's own
 * corporate numbers, editable in admin, because they move on their own schedule
 * and a stale one is worse than none. Only the heading is fixed, because it
 * names what the band is rather than asserting anything.
 */
export const IMPACT = {
  /**
   * Split into two parts because the brand name is set in the action orange, and a
   * highlight inside a heading is structure rather than styling — it needs its own
   * element. Kept as two fields rather than one string the component slices on the
   * last word: a slice would silently move the highlight if the heading were ever
   * reworded, and the point of holding copy in one file is that rewording it is
   * safe.
   *
   * The rendered heading is still one accessible name, "Impact delivered by ANSR".
   *
   * Orange here is legal on both counts. It measures 4.95:1 on the impact ground, so
   * it clears AA as text; and the brand restricts orange to one appearance per band,
   * which this band has spare — it carries no CTA.
   */
  titleLead: "Impact delivered by",
  titleBrand: "ANSR",
} as const;

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

  /**
   * One sentence, and it says what the reader can do with the page.
   *
   * All three used to open with the same twenty-word list of the sections below —
   * comparable companies, the wider industry picture, the scale of the India base
   * — which is a table of contents written as prose, immediately above the
   * headings it lists. The reader is about to scroll past all three.
   */
  switch (view.input.gccStatus) {
    case "operating":
      return {
        title: name
          ? `How ${name}'s India GCC compares`
          : "How your India GCC compares",
        lead: `Everything below is drawn from companies like yours that already operate here.`,
        ctaHeading: "Getting more out of what you already run",
        ctaBody:
          "ANSR builds and runs India centres for global companies at every scale on this page. A conversation is the quickest way to find out what this benchmark means for yours.",
        ctaLabel: "Talk to ANSR about your India GCC",
      };
    case "expanding":
      return {
        title: name
          ? `The ground ${name} is expanding into`
          : "The ground you are expanding into",
        lead: `What comparable companies have already built here, and how far the market goes beyond them.`,
        ctaHeading: "Sizing the next phase",
        ctaBody:
          "ANSR has taken India centres from a first hire to several thousand people. A conversation is the quickest way to size the next phase and how fast it can stand up.",
        ctaLabel: "Talk to ANSR about scaling your India GCC",
      };
    case "evaluating":
      return {
        title: name
          ? `${name} would not be first. Here is who already is.`
          : "You would not be first. Here is who already is.",
        lead: `Comparable ${industry} companies with a centre in India — what they built, where, and when.`,
        ctaHeading: "What this would look like for you",
        ctaBody:
          "ANSR has built India centres for global companies in every industry on this page. A conversation is the quickest way to find out what one would look like for yours.",
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
    return `Matched on line of business — ${businessType.name.toLowerCase()}${shared}. Revenue band is a preference rather than a filter, so a closer business beats a closer size.`;
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
    return "Ranked by how close their business is to yours, then by size.";
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
      return `No other ${businessType.name.toLowerCase()} in our data runs an India centre yet. That is open ground.`;
    }
    return `No other ${industry} company in our data runs an India centre yet. That is open ground.`;
  }

  const count = peers.length === 1 ? "one" : String(peers.length);

  /**
   * A floor-shortened set is a DIFFERENT claim from a thin industry, and they must
   * not share a sentence. Here the industry has plenty of companies; what it does
   * not have is more that are genuinely comparable. Saying "this industry is thin"
   * over a 656-company industry would be visibly false.
   *
   * Both sentences lost their closing clause — "we would rather show you three
   * defensible comparisons than pad the list". It was the most quotable line on the
   * screen and the most self-regarding: the reader has not asked whether we pad
   * lists, and answering it plants the question. The behaviour is unchanged and is
   * an invariant; only the narration is gone.
   */
  if (floorShortened && businessType) {
    return `${industry} is not short of companies in India — but only ${count} are close enough to your line of business to be worth naming.`;
  }

  return `${industry} is thin in India at any size: ${count} rather than ${limit}. Early ground, not absent ground.`;
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
  return "The five above were a selection, not the supply";
}

/**
 * The industry-count band. `total` leads because `others` can be zero.
 *
 * With a line of business it becomes a two-level count, which is strictly stronger
 * evidence: a named set of peers, then how many others do the same thing, then how
 * many more are in the industry at all. That is what turns a thin peer set from a
 * weakness into a floor.
 */
/**
 * The label beside the industry total. Short, because the chart carries the parts.
 *
 * It used to be the whole block: a sentence that named the line of business, the
 * count within it and the remainder across the industry — three numbers in one
 * sentence, sitting beside a fourth at display size. `industrySplit` now draws
 * those three as a divided bar with each count labelled, so a sentence restating
 * them is the same information twice and the reader has to check whether the two
 * agree.
 *
 * What is left is the one thing the chart cannot say: what the total counts.
 */
export function industryLine(view: PeerView): string {
  const { total, industry, exhaustive } = view.industry;

  if (exhaustive) {
    return total === 1
      ? `${industry} company with a centre in India — the only one in our data.`
      : `${industry} companies with a centre in India, and that is all of them in our data.`;
  }

  return total === 1
    ? `other ${industry} company already runs a centre in India.`
    : `other ${industry} companies already run a centre in India.`;
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
    return `The largest ${industry} companies in India. None sits in the top revenue band yet, so this starts at ${topBand}.`;
  }
  return `The largest ${industry} companies in India, by the size of the centre itself.`;
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
  kicker: "Next",
  title: "Now the numbers behind it",
  lead: "Talent depth, how fast a function stands up, what the location gives you and how the cost moves — for technology, operations, HR and finance.",
  label: "See the function view",
} as const;
