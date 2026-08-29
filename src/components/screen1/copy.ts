import { formatCount } from "@/components/public/primitives";
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
  /**
   * The form card's own heading and the one line under it, both supplied by ANSR
   * verbatim.
   *
   * **The card has a lead now where it had only a title, and that is what the
   * heading needed to stop carrying alone.** "Set your company context" was a
   * label: it named the act without saying what the act produces. The pair splits
   * the work — the heading is what the visitor gets, the line is what it costs them
   * and what comes back.
   *
   * It is deliberately NOT `siteContent.hero`. The hero is positioning and is
   * admin-editable for that reason; this describes the controls directly beneath it,
   * so it belongs with the rest of the form's chrome and changes when the form does.
   */
  panelTitle: "Build your GCC intelligence view",
  panelLead:
    "Share your company details to identify relevant companies with GCCs in India and explore talent, capability and location metrics.",
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
   * Two fields, and the split now does something different from what it was written
   * for. It existed because the brand name was set in the action orange and a
   * highlight inside a heading is structure rather than styling. The name is no
   * longer typed at all — it is the drawn lockup, stacked under the lead — so
   * `titleBrand` is now the ACCESSIBLE NAME for a graphic rather than a styled span.
   *
   * Still two fields rather than one string the component slices on the last word:
   * a slice would silently move if the heading were reworded, and the point of
   * holding copy in one file is that rewording it is safe.
   *
   * The rendered heading is still one accessible name, "Impact delivered by ANSR".
   *
   * The band's one orange is now the lockup's burst rather than the word. Same rule,
   * spent once — and it no longer has to be measured as text, because it is not text.
   */
  titleLead: "Impact delivered by",
  titleBrand: "ANSR",
} as const;



/**
 * The count, as the subject of the headline.
 *
 * **The h1 states the result now, and the company name has moved out of it.** It
 * used to be "Nike would not be first. Here is who already is." — memorable, and
 * wrong in four ways that only became visible written down: it gave the first thing
 * a visitor sees after submitting a form the tone of an advertisement; "would not be
 * first" presumes their concern is priority and frames it as a rebuttal; "here is who
 * already is" names no action, so it says nothing about what those companies did; and
 * the actual finding — that comparable companies exist and how many — was in the band
 * below rather than in the headline.
 *
 * What a visitor needs from this line is proof the form produced a result. So the
 * headline carries the count, and the company name moves into the context row
 * beneath it, where it is visible for the whole page rather than for one sentence.
 * Nothing is lost: the personalisation is still on screen, and the headline is now
 * personalised by something stronger than a name — their own peer count in their own
 * industry.
 *
 * Spelled as a digit, unlike the counts in section headings. Those sit inside prose
 * at 48px where a numeral reads as a data field that escaped a table; this IS the
 * figure, at 72px, and a figure is a numeral.
 */
function peerSubject(count: number): string {
  if (count === 1) return "One relevant peer";
  return `${count} relevant peers`;
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
  const industry = view.industry.industry;
  const count = view.peers.peers.length;
  const subjectPhrase = peerSubject(count);

  /**
   * One sentence, and it says what the reader can do with the page.
   *
   * All three used to open with the same twenty-word list of the sections below —
   * comparable companies, the wider industry picture, the scale of the India base
   * — which is a table of contents written as prose, immediately above the
   * headings it lists. The reader is about to scroll past all three.
   *
   * **The three titles now share a subject and differ in predicate.** The finding is
   * the same regardless of where the visitor already stands — this many companies in
   * their industry run a centre here — so the count leads all three. What `gccStatus`
   * changes is what the reader is being invited to DO with the count, which is a verb
   * rather than a headline, and the same distinction runs through the leads and the
   * closes. The zero case gets its own sentence in each branch, because "0 relevant
   * peers operate a GCC in India" is a headline built out of an absence, and the band
   * below it says the honest version at reading size.
   */
  switch (view.input.gccStatus) {
    case "operating":
      return {
        title:
          count === 0
            ? `No ${industry} peer in India is close enough to benchmark against`
            : `${subjectPhrase} to benchmark your India GCC against`,
        // "Everything below is drawn from…" was the tool describing its own
        // sourcing. The reader wants to know what they are looking at, not where it
        // came from — that is what the provenance lines are for.
        lead: `Compare your centre with the ${industry} companies operating closest to your profile, and with the wider industry around them.`,
        ctaHeading: "Read these benchmarks against what you run",
        ctaBody:
          "ANSR builds and runs India centres for global companies at every scale on this page. A conversation is the quickest way to find out what this benchmark means for yours.",
        ctaLabel: "Talk to ANSR about your India GCC",
      };
    case "expanding":
      return {
        title:
          count === 0
            ? `No ${industry} peer in India is close enough to compare with yet`
            : `${subjectPhrase} in the ground you are expanding into`,
        lead: `See what the ${industry} companies closest to your profile have built here, and how far the industry goes beyond them.`,
        ctaHeading: "Size the next phase against these findings",
        ctaBody:
          "ANSR has taken India centres from a first hire to several thousand people. A conversation is the quickest way to size the next phase and how fast it can stand up.",
        ctaLabel: "Talk to ANSR about scaling your India GCC",
      };
    case "evaluating":
      return {
        title:
          count === 0
            ? `No ${industry} peer in India is close enough to name yet`
            : `${subjectPhrase} ${count === 1 ? "operates" : "operate"} a GCC in India`,
        // "— what they built, where, and when" was a table of contents in prose,
        // immediately above the three headings it listed. What replaces it is a
        // preview of the dimensions the page actually covers, in the order it covers
        // them — which is the one thing the reader cannot get from the headline.
        lead: `Explore where the ${industry} companies closest to your profile operate, how large their centres are, and what the wider industry has built.`,
        // "What this would look like for you" promised a result the page does not
        // produce and read as the moment the tool stopped analysing and started
        // selling. This one is about the analysis the visitor has just read.
        ctaHeading: "Put the landscape in your company's context",
        ctaBody:
          "ANSR has built India centres for global companies in every industry on this page. A conversation is the quickest way to read these findings against your own operating priorities.",
        ctaLabel: "Talk to ANSR about building your India GCC",
      };
  }
}

/* The plain-English tag phrases, the two joiners that built a sentence out of them,
   and `matchBasisFor` — which was the peer block's footnote — are GONE, along with
   `matchBasis` and `peerAxisNote`.

   All of it existed to render two sentences under the comparison set: "They all
   share capital intensity and discrete manufacturing. Revenue band and headquarters
   are preferences rather than filters, so a closer business outranks a closer size
   or a nearer market." and "Bars compare these companies with each other. Full
   width is Enphase Energy, at 1,500–1,600." Both were removed at ANSR's request,
   and both had earned their place: the first is why H&M can outrank a US peer for a
   US visitor, and the second is the axis a bar cannot be read without.

   They are deleted rather than left exported, because tested copy that nothing
   renders is how a screen ends up with two versions of its own explanation. What
   replaces the first is `peerLead`, which names the sub-industry the set was matched
   on and is rendered as the section's own lead. What replaces the second is that the
   comparison cards no longer draw bars at all — each card carries its employee band
   as a figure at 24px, which is the reading the bar was a second copy of. The
   largest-centres block keeps its bars and therefore keeps `largestAxisNote`.

   The headquarters preference is no longer stated anywhere on the screen. With the
   column gone there is nothing visible for it to explain, but it is a real
   departure: a visitor cannot now see why a Swedish company outranks an American one
   for an American reader.
   ========================================================================== */


/**
 * The peer section's lead — the one line under the heading.
 *
 * It used to be a hardcoded string in `peer-view.tsx`: "Same industry, closest
 * revenue band, and companies from your own market first." That was true of the
 * band ladder and became false when matching went continuous, and it contradicted
 * the footnote three lines below it on the same card, which said revenue band is a
 * preference rather than a filter. It was also observably wrong on the flagship
 * example — a US apparel visitor is shown H&M and Adidas, so "your own market first"
 * is not what happened.
 *
 * **It is now the one place the method is stated, because the footnote it used to
 * agree with is gone.** So the accuracy of this sentence carries alone, and the
 * unit test that pinned the two to each other pins this one to the peer set itself.
 *
 * Derived rather than written, and it lives here because `copy.ts` holds every
 * visitor-facing sentence on this screen.
 */
export function peerLead(view: PeerView): string {
  const businessType = view.industry.businessType;

  if (view.peers.businessMatched && businessType) {
    /**
     * **"Matched on", not "all of these are".** The distinction is the whole
     * accuracy of the sentence: peers come from everything above the similarity
     * floor, so a set can legitimately include a company in a COMPARABLE
     * sub-industry rather than the visitor's own — which the industry split beside
     * it labels as exactly that. A lead claiming every card shares the visitor's
     * sub-industry would be contradicted by the bar one band down.
     *
     * The sub-industry is named because it is the one answer on the form a visitor
     * could reasonably wonder whether the tool used.
     */
    return `Matched on your sub-industry, ${businessType.name.toLowerCase()}. Ranked by how close each business is to yours, then by size.`;
  }

  // No sub-industry given: matching really is band-led, and the old sentence
  // is accurate again.
  return "Same industry, closest revenue band, and companies from your own market first.";
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
    return `${industry} is not short of companies in India — but only ${count} are close enough to your sub-industry to be worth naming.`;
  }

  return `${industry} is thin in India at any size: ${count} rather than ${limit}. Early ground, not absent ground.`;
}

/* The industry card's heading used to be DERIVED — "All of X in India, in one view"
   when the peer set was the whole industry, and "Your peers sit within a much larger
   industry base" otherwise. It is gone, not moved: the card headings on the result
   surface are the approved composition's and are fixed, so there was nowhere for a
   variable one to go. The claim it protected is not lost — `industryLine` already says
   the peers ARE the industry in the exhaustive case, which is the branch that mattered,
   and it renders directly under the figure.
   ========================================================================== */

/**
 * The map section's heading, and it is derived rather than written.
 *
 * It used to be "`${industry}` clusters in a handful of cities", which is vague
 * where the data is exact — the map beside it knows precisely how concentrated the
 * industry is, and "a handful" is the one word on the page that could have been a
 * number and was not.
 *
 * Two branches, because there are two genuinely different findings and only one of
 * them is about concentration. Above 40% of the industry's presence in one city the
 * finding IS that city; below it the finding is the spread, and a headline naming
 * the leader would overstate it. The threshold is a judgement rather than a
 * measurement, and it is deliberately high: at 40% the leading city holds more than
 * everywhere else combined would need two cities to match.
 *
 * The share is of PRESENCES, not companies — a company in three cities is counted
 * in each — which is what the block's own provenance line says. That is the only
 * denominator available and it is the same one every figure in the block uses, so
 * the heading and the ranked list beside it cannot disagree.
 */
export function mapHeading(view: PeerView): string {
  const { industry, cities } = view.map;
  const total = cities.reduce((sum, city) => sum + city.companies, 0);
  const leader = cities[0];

  /**
   * **A floor on the denominator, not just on the share**, and the thin case is why.
   * Electrical & Electronics has two presences, one each in Kolkata and NCR, so the
   * concentration branch fired with a perfectly true "Kolkata holds 50%" — a
   * percentage carrying two decimal places of authority over a sample of two. Below
   * five the spread heading is the honest one.
   *
   * The sentence leads with the figure and avoids a possessive on the industry name:
   * "Consumer Packaged Goods's" and "Electronics's" are both what `${industry}'s`
   * produces, and there is no apostrophe rule that makes a list of 24 admin-editable
   * names come out right.
   */
  if (leader && total >= 5) {
    const share = leader.companies / total;
    if (share >= 0.4) {
      return `${Math.round(share * 100)}% of the ${industry} footprint in India is in ${leader.city}`;
    }
  }
  /**
   * **"actually landed" lost two words and gained nothing by keeping them.**
   * "Actually" carries no meaning in a sentence nobody has contradicted, and
   * "landed" describes arriving somewhere — which makes an operating footprint
   * built over twenty years sound provisional. "Has built" is what the companies
   * did, and it is what the map shows.
   */
  return `Where ${industry} has built in India`;
}

/**
 * The industry-count band. `total` leads because `others` can be zero.
 *
 * With a sub-industry it becomes a two-level count, which is strictly stronger
 * evidence: a named set of peers, then how many others do the same thing, then how
 * many more are in the industry at all. That is what turns a thin peer set from a
 * weakness into a floor.
 */
/**
 * The label beside the industry total. Short, because the chart carries the parts.
 *
 * It used to be the whole block: a sentence that named the sub-industry, the
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

  // "already" is gone from here and from every other line on the screen. It appeared
  // in a heading, two leads and three body sentences, and each one was doing the same
  // job: leaning on the reader to feel late. The tense already carries it — a company
  // that runs a centre in India runs one now — so the word was adding pressure rather
  // than information, and a page that applies pressure six times is a page a CIO
  // discounts.
  return total === 1
    ? `other ${industry} company runs a centre in India.`
    : `other ${industry} companies run a centre in India.`;
}

/**
 * The industry line as a whole sentence, with its own figure in front of it.
 *
 * `industryLine` is a FRAGMENT — it was written to follow a 48px figure, so it opens
 * "other BFSI companies run a centre in India." That figure is gone from the block:
 * it was the same number the containment chart's own middle layer is labelled with,
 * 120px away, and a reader shown one number twice has to check that the two agree.
 * So the sentence moved up to the section's lead and needs the figure inside it.
 *
 * Composed here rather than in the component, because `copy.ts` owns every
 * visitor-facing sentence on this screen and a component joining two strings with a
 * space is a sentence written in a component.
 */
export function industrySentence(view: PeerView): string {
  return `${formatCount(view.industry.total)} ${industryLine(view)}`;
}

/** The largest-in-industry panel's framing, including its two degraded shapes. */
export function largestLine(view: PeerView): string {
  const { topBand, belowTopBand, repeatsPeers, entries } = view.largest;
  const industry = view.industry.industry;

  if (entries.length === 0) {
    return `We hold no ${industry} company large enough to anchor this comparison yet.`;
  }
  if (repeatsPeers) {
    /**
     * **A possessive on an industry name, which the style lock warns about and this
     * line was breaking.** `${industry}'s` produces "Electrical & Electronics's" and
     * "Consumer Packaged Goods's", and this is the branch a thin industry always
     * takes — so the one sentence guaranteed to be read by the visitors most likely
     * to see it was the one with the broken apostrophe. Rephrased to avoid one, the
     * same way `mapHeading` is.
     */
    return `At the current depth of ${industry} in India, the largest centres are the ones already named above.`;
  }
  if (belowTopBand && topBand) {
    // The first sentence is gone: the band's own heading now says "The largest
    // {industry} centres in India" verbatim, and this line renders directly under it.
    // What is left is the only part the heading cannot carry — that the ranking had
    // to walk down the revenue bands to find members at all.
    return `No ${industry} company in India sits in the top revenue band yet, so this ranking starts at ${topBand}.`;
  }
  return `The largest ${industry} centres in India, ranked by the size of the centre itself.`;
}

/* ==========================================================================
   The card headings and count lines
   ========================================================================== */

/**
 * The comparison section's heading. Static, and it states no count for a reason.
 *
 * It read "{N} companies like yours are already here", and every part of that was
 * doing something wrong: "like yours" is a bare similarity claim, "already" is the
 * word this pass removed from six places for leaning on the reader to feel late, and
 * "here" is imprecise where the page is otherwise exact about India. The count is
 * also directly under it, in the line that says how many of how many are shown.
 *
 * "Companies selected for comparison" replaced it and was accurate and inert — it
 * described what the tool did rather than what the reader is looking at. This names
 * the finding without overstating it: "closest" is exactly what the relevance
 * ordering produces and what the rank badge on each card shows, and "comparable" is
 * the word the count line and the section lead both already use.
 */
export const PEERS_TITLE = "The closest comparable companies in India";

/**
 * How many are shown, out of what.
 *
 * **The cohort is the population the peers were actually drawn from**, which is the
 * companies above the similarity floor when a sub-industry was given and the whole
 * industry when it was not. Naming the industry total in the sub-industry case would
 * be the wrong denominator — the five were not selected out of 656, they were
 * selected out of the 314 close enough to be candidates — and the nested steps in
 * the card below draw exactly that relationship.
 *
 * Exact both sides. "5 of many comparable companies" was in the reference
 * composition and is the one thing in it that must not ship: the figure is available,
 * and a vague denominator in front of a CIO reads as a number we would rather not
 * state.
 */
export function peerCountLine(view: PeerView): string {
  const shown = view.peers.peers.length;
  const industry = view.industry.industry;
  const cohort = view.industry.businessType?.count ?? view.industry.total;

  if (shown === 0) return `No comparable ${industry} companies to show.`;
  // The cohort can equal or fall below what is shown when the peers exhausted it —
  // "5 of 5" is fine and "5 of 3" would be arithmetic nobody can follow.
  if (cohort <= shown) {
    return shown === 1
      ? `The one comparable ${industry} company in our data.`
      : `All ${formatCount(shown)} comparable ${industry} companies in our data.`;
  }
  return `Showing ${formatCount(shown)} of ${formatCount(cohort)} comparable ${industry} companies.`;
}

/**
 * The industry-context section's heading.
 *
 * **"The wider industry context" named the mechanism; this names the question.** A
 * reader arriving at a heading called "context" has to work out what they are being
 * shown before they can decide whether to read it — and what they are being shown is
 * how much of their own industry has committed to India, which is the question the
 * whole screen exists to answer at scale.
 *
 * Static, and it has to be: the containment chart under it is the same shape for
 * every result, and a heading that changed with the finding would have to be honest
 * about a thin industry in a place the chart already is.
 */
export const INDUSTRY_TITLE = "How much of your industry is in India";

/**
 * The largest-centres section's lead.
 *
 * **It was a provenance note at the foot of the block** — "Ranges reflect reported
 * employee bands, so nothing here is ranked by revenue." — which is the one sentence
 * that stops a reader taking "largest" for largest by revenue, set at 12px in the
 * place least likely to be read. We hold employee BANDS and never revenue, so it
 * cannot just be deleted with the rest of the caveats; it moved to the head of the
 * section, where it explains the ranking before the ranking is read.
 *
 * Shorter than the original, and the clause it lost was the one doing least: "ranges
 * reflect reported employee bands" describes the data rather than the ordering, and
 * every row on the block shows a range, so the reader can see it.
 */
export const LARGEST_LEAD =
  "Ranked by the size of the centre itself, never by revenue.";

/** The largest-centres card's heading, which names the industry. */
export function largestTitle(view: PeerView): string {
  return `The largest ${view.industry.industry} centres in India`;
}

/**
 * What the largest-centres ranking covers, under the table.
 *
 * It exists because the reference composition put a "View full ranking" link here
 * and there is no fuller ranking to link to — the panel already holds every entry
 * the engine returns, capped at the same limit as the peer set. A link that went
 * nowhere would be worse than the sentence that makes it unnecessary, so the
 * sentence answers the question the link was there to raise.
 */
export function largestCountLine(view: PeerView): string {
  const shown = view.largest.entries.length;
  const industry = view.industry.industry;
  if (shown === 1) {
    return `The largest ${industry} centre in India we hold.`;
  }
  return `The ${formatCount(shown)} largest ${industry} centres in India we hold.`;
}

/**
 * The functions section's heading and its one-line lead.
 *
 * **These carry what two removed caveat paragraphs used to.** The block previously
 * ended in "The general pattern across India GCCs, most to least common. Not a
 * per-company breakdown of the companies above." followed by "Ordered by how common
 * each function is. We hold no per-company function record, so no share of companies
 * is stated for any of them." Both were removed at ANSR's request, and both were
 * true and load-bearing: without them a reader could take eight functions under a
 * grid of five companies for those five companies' functions.
 *
 * So the heading does the work instead. "most GCCs run" is a claim about GCCs in
 * general and cannot be read as a claim about the companies above, and the lead
 * states the ordering in six words rather than in two sentences. Nothing on the
 * block draws or implies a share, which is the property a spec still asserts.
 */
export const FUNCTIONS_TITLE = "Functions most GCCs run from India";

/** The ordering, said once, at reading size instead of in a footnote. */
export const FUNCTIONS_LEAD = "Most to least common across India GCCs.";

/** The locations card's heading, which names the industry. */
export function mapTitle(view: PeerView): string {
  return `India's leading GCC locations for ${view.industry.industry}`;
}

/* ==========================================================================
   The terminating evidence strip
   ========================================================================== */

/**
 * The last thing on the page, and the only band on it that is not about the
 * visitor's industry.
 *
 * **"Fortune Global 500" and "Fortune 500" are different lists and are never
 * interchanged.** The reference composition labels the third figure "people across
 * Fortune 500 GCCs in India", which is wrong — the figure counts professionals
 * inside FORTUNE GLOBAL 500 companies, and the two indices have different
 * membership. Both index names are written out in full everywhere they appear, for
 * the same reason the counts are drawn against their real denominators.
 */
export const SCALE = {
  title: "Leading global companies have established GCCs in India",
  fortuneLabel: "of the Fortune Global 500 companies have GCCs in India",
  forbesLabel: "of the Forbes Global 2000 companies have GCCs in India",
  peopleLabel: "people across those Fortune Global 500 GCCs in India",
} as const;

/* The strip's source-and-method block is GONE, and so is `asOfLine`, which
   formatted the dataset's own generation stamp into a month and a year.

   What went with it: the audit disclaimer ("indicative rather than audited"), the
   band-midpoint method line, the national company count, "Source: ANSR GCC
   Database" and the machine-stamped "Data as at" date. Removed at ANSR's request.

   **This is the one removal in this pass with no compensating line anywhere, and it
   is worth naming as a departure rather than a tidy-up.** The page now carries no
   provenance at its foot at all: the professionals figure is a sum of headcount
   BANDS and nothing on the screen says so, and there is no date telling a reader how
   current any of it is. `scale.asOf` is still on the view model, so restoring the
   date is one line rather than a data change.
   ========================================================================== */

/* The band that offered the visitor Screen 2 — kicker, heading, lead and an
   "Explore the function view" button — is GONE, and it is not coming back as a
   band. The two views are now a tab strip at the head of the page, present from
   the first paint on both screens, so the only thing the band still did was repeat
   an offer the visitor had already been given and could already see. It was also
   the last thing before the close, which is where a page should be presenting
   evidence rather than navigation. See `ViewTabs`.
   ========================================================================== */

/* ==========================================================================
   SNAPSHOT

   Four figures at the top of the content surface, before any section begins.

   **What it fixes is a five-second problem.** The answer state opened straight into
   seven full-height bands, each one kicker → 48px heading → content, so the first
   thing a visitor saw after submitting a form was a section rather than a result.
   Every figure on this strip already existed further down the page; none of them was
   reachable without scrolling, and a reader who gave the page ninety seconds spent
   the first twenty of them establishing that it had worked.

   It is deliberately NOT a fifth kind of card and not a bento of tiles. One
   container, cells divided by rules, one figure each — see `SignalStrip`. A tile per
   figure would assert an editorial hierarchy across four things that are peers.

   **A cell whose figure the data cannot supply is omitted, never filled.** Three of
   the four depend on the result: a visitor whose industry returned no comparable
   company has no largest peer centre, and an industry with no mapped cities has no
   leading location. The strip renders two, three or four cells. It never renders a
   dash, an "n/a" or a zero standing in for a figure that does not exist — the whole
   screen's credibility rests on the free layer being believable, and a placeholder
   in the first thing a CIO reads is the cheapest possible way to lose that.

   The peer count is the one cell that always renders, including at zero. Zero is a
   real finding rather than a missing figure, it is the finding the headline states,
   and the band below it says the honest version at reading size.
   ========================================================================== */

/**
 * Which line icon a cell draws.
 *
 * A key rather than a component, because this file holds language and holds no
 * JSX. `snapshot.tsx` owns the mapping to a glyph, which is also the only place
 * that has to change if the icon set does.
 */
export type SnapshotIcon = "companies" | "people" | "cities" | "location";

export interface Signal {
  icon: SnapshotIcon;
  /**
   * Already formatted, or null when the data cannot supply it.
   *
   * Null is a real state rather than a defect: an industry with no mapped city has
   * no leading location and no city count, and there is no honest figure to put
   * there. The cell renders a stated "Data unavailable" instead of a dash, a zero
   * or an estimate — the whole screen's credibility rests on the free layer being
   * believable, and a fabricated figure in the first thing a CIO reads is the
   * cheapest possible way to lose that.
   */
  value: string | null;
  /** What the figure is. Names the industry where the figure is industry-level. */
  label: string;
  /**
   * What it counts, or how it was arrived at, in one short line.
   *
   * Not decoration and not a caveat. A bare "656" beside "Companies in BFSI" leaves
   * a reader unable to tell whether they are looking at companies, centres or
   * people, and this page carries all three — so every cell says which. On the mean
   * headcount it is also the method line the figure may not appear without.
   */
  note: string;
}

/**
 * The four snapshot cells.
 *
 * **Every one of them is INDUSTRY-level, and that is the change from the version
 * this replaced.** The old strip led with the peer count and the largest peer
 * centre — both properties of a five-company set our own matching chose, which is a
 * statistic about the tool rather than about India. A CIO reading a snapshot wants
 * the size of the ground, not the size of our sample; the peer set is evidenced
 * immediately below and states its own count there.
 *
 * The cell count is fixed at four. The strip used to drop a cell it could not fill,
 * which was right when the grid sized itself to whatever came back and is wrong for
 * a stated four-up snapshot — a three-cell row of four columns reads as a card that
 * failed to load. What it must never do instead is invent the figure; see `value`.
 */
export function signals(view: PeerView): Signal[] {
  const industry = view.industry.industry;
  const leader = view.map.cities[0];
  const cityCount = view.map.cities.length;
  const average = view.industry.averageHeadcount;

  return [
    {
      icon: "companies",
      value: view.industry.total > 0 ? formatCount(view.industry.total) : null,
      // The label names the industry, because every figure on this strip is a
      // property of the INDUSTRY rather than of the five-company set our own matching
      // chose — and a reader who takes the first cell for a peer-set statistic
      // misreads the other three the same way.
      //
      // **It cannot say "already", however well the word would work here.** Six uses
      // were removed across this file for leaning on the reader to feel late, and the
      // rule is asserted rather than remembered — see the copy test. The note carries
      // the "and they are operating" half instead, where it is a fact about the count
      // rather than pressure on the reader.
      //
      // **"other than your own" is gone**, at ANSR's request. `industry.total` does
      // still exclude the visitor's own company where the data holds it, so the
      // exclusion is now unstated rather than untrue — a difference of one on a figure
      // in the hundreds, against a clause that made the strip's opening cell read as a
      // footnote.
      label: `${industry} companies in India`,
      note: "Each running a GCC here",
    },
    {
      icon: "people",
      value: average !== null ? formatCount(average) : null,
      // "Typical", not "average": the figure is a rounded mean of employee bands, and
      // "typical" is the honest word for a number arrived at that way — it claims a
      // central tendency rather than an arithmetic result. "GCCs" plural, never
      // "GCC's", which ANSR asked never to appear.
      label: `Typical centre size in ${industry}`,
      // **The method line is gone** — "Mean of reported employee bands, rounded" —
      // at ANSR's request. It is the one removal on this strip with a cost worth
      // recording: the figure IS a mean of band midpoints, so the page no longer says
      // how it was arrived at. "Typical" and "people" are doing what they can.
      note: "People, across every centre",
    },
    {
      icon: "cities",
      value: cityCount > 0 ? formatCount(cityCount) : null,
      // Was "Total Indian cities represented", which is a database field name read
      // aloud. What the figure answers is whether the industry is concentrated or
      // spread, so that is what the cell says.
      label: "Indian cities in play",
      note: "Hubs and emerging locations",
    },
    {
      icon: "location",
      value: leader ? leader.city : null,
      // "Most common location" named the metric; this names the answer. The note
      // stops the reader wondering whether it leads on companies, centres or people.
      label: "Where the industry concentrates",
      note: `More ${industry} GCCs than any other city`,
    },
  ];
}

/* ==========================================================================
   Axis notes

   Every bar on this screen carries a figure in text beside it, which is the
   project's governing chart rule — but until now none of them said what FULL WIDTH
   was, and that is a second and separate requirement. A bar whose axis is unstated
   looks precise and communicates nothing: a reader cannot tell whether the track is
   the largest company in the set, the largest in India, or the top of some band.

   Both sets are scaled against their own largest member — see `PeerCard.sizeShare`,
   and the two peaks are deliberately computed separately — so both notes name that
   member. Which is also the only honest thing they can say, since the ratio itself
   may not be published.
   ========================================================================== */

/* `peerAxisNote` is gone with the comparison bars it explained. Each card carries
   its employee band as a figure at 24px instead, which is the reading the bar was a
   second copy of — so there is no axis left to name. Removed at ANSR's request. */

/** What full width means on the largest-in-industry ranking. */
export function largestAxisNote(view: PeerView): string | null {
  const first = view.largest.entries[0]?.company;
  if (!first || view.largest.entries.length < 2) return null;
  return `Full width is ${first.name}, at ${first.headcount}.`;
}
