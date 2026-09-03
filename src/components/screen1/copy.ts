import { formatCount } from "@/components/public/primitives";
import { DEFAULT_PUBLIC_COPY, type PublicCopy } from "@/data/schema";
import { companyName, type PeerView } from "@/data/screen1";

/**
 * **Every STATIC heading and label in this file is now DERIVED from
 * `DEFAULT_PUBLIC_COPY`, and none of them is typed twice.**
 *
 * The schema holds the shipped wording, because these strings are published data an
 * admin edits; this file holds the reasoning for the wording, because that reasoning is
 * a code decision and belongs where the code is. Splitting them that way is only safe
 * if there is exactly one copy of the value — so the constants below read the schema
 * key rather than restating its string, and `tests/unit/public-copy.test.ts` pins each
 * one to the key it came from. Restating a string here would give the surface two
 * defaults, and the one nobody rendered would be the one the next reader edited.
 *
 * **What these constants are FOR, now that the screens read the published copy through
 * `usePublicCopy()`:** they are the value the context resolves to when no provider is
 * above it, which is the shipped wording. So each comment below still explains the
 * string directly under it. What they are not is the render path — a wording change
 * ships through the dataset, not through this file.
 *
 * Everything DERIVED stays here untouched. A sentence that names a count, a share or an
 * ordering has to move when the thing it describes moves, so it cannot be free text an
 * admin edits; and a function of the visitor's answers has no fixed wording to edit in
 * the first place. `FUNCTIONS_TITLE` also stays, for a third reason: its exact phrasing
 * is what stops eight function tags being read as a claim about the five companies above
 * them.
 */

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
  panelTitle: DEFAULT_PUBLIC_COPY.askTitle,
  panelLead: DEFAULT_PUBLIC_COPY.askLead,
  submit: DEFAULT_PUBLIC_COPY.askSubmit,
  /**
   * **The one field here that is NOT published data, and the asymmetry is deliberate.**
   * The other three are what a visitor reads while deciding whether to fill the form in,
   * which is positioning an admin may want to reword. This is what the button says for
   * the ~300ms the server action is in flight — a transient machine state rather than a
   * message, and an admin editing it could not see the result of the edit without
   * throttling their own connection. It is also the one string here whose LENGTH is
   * load-bearing: the button does not resize between states, so a longer word wraps the
   * only control on the card.
   */
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
  label: DEFAULT_PUBLIC_COPY.customersLabel,
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
   * longer typed at all — it is the drawn lockup, inline and LEADING the heading — so
   * `titleBrand` is now the ACCESSIBLE NAME for a graphic rather than a styled span.
   *
   * The rendered heading is "ANSR By The Numbers": this field is the first word and
   * `impactTitleLead` is the rest. The mark used to close the sentence instead; see
   * `impact-band.tsx`.
   *
   * Still two fields rather than one string the component slices on the last word:
   * a slice would silently move if the heading were reworded, and the point of
   * holding copy in one file is that rewording it is safe.
   *
   * The rendered heading is still one accessible name, "ANSR By The Numbers".
   *
   * The band's one orange is now the lockup's burst rather than the word. Same rule,
   * spent once — and it no longer has to be measured as text, because it is not text.
   */
  titleLead: DEFAULT_PUBLIC_COPY.impactTitleLead,
  /**
   * **Not published data, because it is not a string — it is the accessible NAME of the
   * drawn lockup.** An admin who could edit it could rename ANSR's own mark to something
   * the graphic beside it does not say, and the rendered result would look correct to
   * everyone who is not using a screen reader. The one field on this surface where a
   * typo is invisible is the one field that stays in code.
   */
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
/**
 * **"India GCCs", where this said "relevant peers".** Two problems with the old
 * phrase, and the band is the worst place on the surface for either. "Relevant" is
 * the tool grading its own output — a reader cannot check it, and a claim they cannot
 * check in the first sentence after a form is where trust is spent rather than
 * earned. And "peer" is our word for a matched company; the visitor's word for what
 * these are is a GCC, which is the noun every other line on the surface now uses.
 *
 * Naming the centre also makes the line survive being read beside the function view's
 * own band line, which is the same construction over the same subject. See
 * `HEADER_LINES` in `screen-header.tsx`.
 */
function peerSubject(count: number): string {
  if (count === 1) return "One India GCC";
  return `${count} India GCCs`;
}

/**
 * **ONE field, where this had five.** `lead`, `ctaHeading`, `ctaBody` and `ctaLabel`
 * are gone, and four of the five were dead well before `title` was: Screen 1 has never
 * rendered `framing().lead`, and it has no CTA at all — the page ends at its evidence
 * strip, at ANSR's request. So three CTA strings sat in a function belonging to the one
 * screen that must not have a CTA, which is how a reader restoring "the framing" would
 * have wired up the element the page-end instruction forbids.
 *
 * `title` stays because it is the one field that was rendered until this pass and is the
 * one thing there is a decision to revisit: whether the band's line varies with what the
 * visitor already runs. Screen 2's `FunctionFraming` is a separate interface with its own
 * five fields, all of them rendered, so nothing here constrains it.
 */
export interface Framing {
  title: string;
}

/**
 * Screen 1's `gccStatus` branch. **It currently has no caller in `src/`.**
 *
 * The band's line is a constant from `HEADER_LINES` — the wording this produced stated a
 * peer count the grid's own count line contradicted. So this is kept for the same reason
 * `peerLead` and `LARGEST_LEAD` are: it is the sentence to restore rather than a sentence
 * that was wrong, and the unit suite is the only place `gccStatus` can be varied at all.
 *
 * **`gccStatus` itself is very much alive, and it is rendered on Screen 2.**
 * `functionFraming` in `screen2/copy.ts` branches on the same field and every one of its
 * five strings reaches the page: the `h2`, the lead, and the closing CTA's heading, body
 * and label. Do not read this function's lack of a caller as evidence the field is
 * decoration — deleting `gccStatus` breaks Screen 2's heading and its call to action.
 */
export function framing(view: PeerView): Framing {
  const industry = view.industry.industry;
  const count = view.peers.peers.length;
  const subjectPhrase = peerSubject(count);

  /**
   * One sentence per status, sharing a subject and differing in predicate.
   *
   * The finding is the same regardless of where the visitor already stands — this many
   * India GCCs resemble their company — so the count leads all three. What `gccStatus`
   * changes is what the reader is invited to DO with it. The zero case gets its own
   * sentence in each branch, because "0 India GCCs match your profile" is a headline
   * built out of an absence.
   *
   * **The three CTA fields and the lead are gone rather than left unrendered**, and
   * neither was a casualty of this pass: `lead` was never rendered on this screen, and
   * Screen 1 has no CTA at all by instruction. See `Framing`.
   */
  switch (view.input.gccStatus) {
    case "operating":
      return {
        title:
          count === 0
            ? `No ${industry} GCC in India is close enough to benchmark against`
            : `${subjectPhrase} to benchmark yours against`,
      };
    case "expanding":
      return {
        title:
          count === 0
            ? `No ${industry} GCC in India is close enough to compare with yet`
            : `${subjectPhrase} in the ground you are expanding into`,
      };
    case "evaluating":
      return {
        /**
         * **The line names the match, not the fact that a GCC exists.** It read "5
         * relevant peers operate a GCC in India", which spent its verb on something true
         * of every company in the dataset by construction — the corpus holds nothing else
         * — and graded its own output with "relevant" in the same breath.
         *
         * It is not what the band renders. That is a constant, because even this wording
         * states a COUNT, and five is what the grid shows rather than how many matched.
         * The branch is the shape to restore if the band's line is ever allowed to vary
         * with what the visitor runs; the count would have to come out of it first.
         */
        title:
          count === 0
            ? `No ${industry} GCC in India is a close enough match yet`
            : `${subjectPhrase} ${count === 1 ? "matches" : "match"} your ${industry} profile`,
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
   largest-centres block keeps its bars and has since dropped its own axis note too,
   for a different reason: on a ranking sorted by the quantity the bars encode, the
   first row is the axis. See below.

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
 * **The fix only reached one of the two branches, and the other went on returning
 * that exact sentence for a year.** Answering a sub-industry got a derived, accurate
 * lead; leaving it blank — which is the path most visitors take, and the one every
 * screenshot of this page was taken on — fell through to the same false string, under
 * a comment asserting it was accurate again. It was not: headquarters is a tiebreak
 * beneath the score and cannot put anything first, and the comparison card stopped
 * showing headquarters at all. Both branches are now derived; see the second one.
 *
 * **It is also the one place the method is stated, because the footnote it used to
 * agree with is gone.** So the accuracy of this sentence carries alone, and the
 * unit test that pinned the two to each other pins each branch to the peer set it
 * sits above.
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
    /**
     * **"India GCCs" rather than "companies", and it is a clarity fix rather than a
     * new claim.** Every card in this set runs a centre in India by construction — the
     * dataset holds nothing else — but the lead never said so, and the section heading
     * two hundred pixels up does not either now that the place phrase came off it. So a
     * reader met five company names, a headcount and a city list, and had to infer that
     * the subject was the centre rather than the company. Naming it once here is what
     * the card labels then inherit.
     */
    /**
     * **"then by revenue band", where this said "then by size".** The score's second
     * term is band proximity, and "size" could be read as either that or the centre
     * headcount every card carries as its own figure — which is NOT a key at all. A
     * reader comparing two adjacent cards' figures would have found the claim broken.
     * Naming the key removes the ambiguity without changing what is claimed.
     */
    return `India GCCs matched on your sub-industry, ${businessType.name.toLowerCase()}, ranked by how close each business is to yours, then by revenue band.`;
  }

  /**
   * No sub-industry given, which is the path most visitors take.
   *
   * **The sentence here was the false one, and the comment above it said so while
   * the code went on returning it.** It read "Same industry, closest revenue band,
   * and companies from your own market first." — accurate under the old band ladder,
   * and wrong twice over since:
   *
   *   - Headquarters is a TIEBREAK below the score, so it can never put a company
   *     first. It reorders only companies the score has already tied.
   *   - The comparison card no longer shows headquarters at all, so a visitor cannot
   *     check the claim even where it happens to hold. No copy on this screen may
   *     claim something a card cannot show.
   *
   * What IS true on this path: with no sub-industry every company's business
   * similarity is zero, so the score reduces to band proximity alone — and that is a
   * THREE-STEP function, not a distance: same band, then adjacent band, then everyone
   * else equally. So the sentence says "closest first" and not "ranked by how close",
   * which would claim a total ordering the engine does not compute. Two companies five
   * bands apart and three bands apart are tied here, and a sentence promising a
   * gradient would be describing an ordering that does not exist.
   *
   * **It deliberately claims no SECOND key, and the test is why.** The obvious longer
   * sentence — "then the largest India centres" — was written first, on the reasoning
   * that within a band tie the comparator falls through to centre size, and it is
   * visible because each card carries its employee band as its own figure. It is also
   * false: `matchPeers` puts the headquarters tiebreak BETWEEN the score and the size,
   * and in Agribusiness & Food Processing that fires and lifts a 150-employee US
   * company above a 650-employee one. A reader comparing the two figures on adjacent
   * cards would see the claim break. Headquarters cannot be named in its place either
   * — it is the one key the block does not show.
   *
   * So one key, stated exactly. `tests/unit/screen1.test.ts` pins the sentence to the
   * ordering it describes over every industry, and separately pins the size ordering
   * as NOT holding — so restoring the longer sentence fails a test that names the
   * counter-example, rather than drifting quietly the way this branch did for a year.
   */
  /**
   * **"India GCCs in your industry", for the same reason as the branch above**, and the
   * ordering claim is unchanged: closest revenue band first, one key, no gradient
   * promised. The word "companies" was doing double duty — it named the subject and
   * implied the whole company — where the figure on every card is the centre's
   * headcount.
   */
  return "India GCCs in your industry, closest to your revenue band first.";
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
  /**
   * **The exhaustive branch keeps its figure and the ordinary branch drops it, and
   * the split is about what each one has to CLAIM.** An exhausted industry needs the
   * count in the sentence because the claim is about that count — that it is all of
   * them — and the chart beside it is degenerate in exactly the case a reader is most
   * likely to doubt.
   *
   * Everywhere else the figure was the fourth appearance of one number. The strip
   * above said it, this sentence said it, the chart's own middle layer is labelled
   * with it, and the peer count line divides by it — so a reader met "189" four
   * times in four wordings and had to satisfy themselves the four agreed before
   * trusting any of them, which is the exact cost the snapshot exists to remove. The
   * chart is where it belongs, because the chart is the only place it has a
   * denominator.
   *
   * **"other" went with it**, and it was a real defect rather than a spare word:
   * "189 other BFSI companies" invites the question "other than which?" and nothing
   * on the page answers it. `industry.total` does still exclude the visitor's own
   * company where the data holds it — a difference of one on a figure in the
   * hundreds — so the exclusion is now unstated rather than untrue.
   *
   * What is left describes the three layers the chart draws, in the order it draws
   * them, and states no quantity at all.
   */
  if (view.industry.exhaustive) {
    return `${formatCount(view.industry.total)} ${industryLine(view)}`;
  }
  return `Every GCC in India, with ${view.industry.industry} inside it, and the companies above inside that.`;
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
 *
 * **The place phrase came off, and the reason is the six headings read together
 * rather than anything wrong with this one.** Five of the surface's six section
 * headings ended on the same prepositional phrase — "in India", "is in India", "in
 * India", "from India", "in India" — all of them the same length and the same
 * declarative construction. Each was defensible on its own and the set was one
 * sentence six times, which is exactly the artefact a rule applied without a
 * companion rule about variety produces. See the heading-cadence note below.
 *
 * The place phrase is back in a different form, as "India GCCs" rather than a trailing
 * "in India" — so the cadence fix holds while the subject is named. See below.
 *
 * **"India GCCs", not "companies", and that word is the one thing the heading was
 * missing.** Dropping the place phrase fixed the cadence and cost the subject: a reader
 * met "The companies closest to yours" over five company names, a headcount and a city
 * list, with nothing on the block saying that the subject is the CENTRE rather than the
 * company. Naming it in the heading is what the lead and the card labels then inherit,
 * and it is shorter than the phrase it replaced.
 */
/**
 * **"closest to your profile", not "closest to yours", and the old wording assumed
 * the visitor has a GCC.** "Yours" has to refer to something, and the only candidate
 * on the page was an India centre — which most readers of this screen do not have.
 * `gccStatus` is a constant the form never asks for, so the tool cannot know either
 * way, and a heading that presumes the answer is the one thing this surface may not
 * do: it reads as a page written for somebody else.
 *
 * "Your profile" is exactly what the matching consumed — the four answers echoed on
 * the band directly above — so the heading now names the real comparison and claims
 * nothing about what the visitor runs.
 */
/**
 * **It names the visitor's company now, at ANSR's request, and that is why it stopped
 * being published copy.** It was `siteContent.copy.peersTitle` — a fixed string, so
 * legitimately a field an admin could edit. "GCC details of peers closest to {company}"
 * is not fixed: the company name is the one OPTIONAL input, so the heading has two
 * branches, and a flat field could hold only one of them. Same reasoning as the
 * snapshot's opening label, which never became a field; see `publicCopySchema`.
 *
 * **The fallback branch is "your profile", which is the wording the whole heading used
 * to be.** It is kept rather than replaced because of what it was chosen to avoid:
 * "closest to yours" presumes the visitor already runs an India centre, and `gccStatus`
 * is a constant the form never asks for, so the tool cannot know. "Your profile" is
 * exactly what the matching consumed — the four answers echoed on the band above — so it
 * names the real comparison and claims nothing about what the visitor runs.
 *
 * `companyName` in `screen1.ts` is the single definition of "did they type one", so this
 * branches on the same call the context pills do and the two cannot disagree.
 */
export function peersTitle(view: PeerView): string {
  const name = companyName(view.input);
  return `GCC details of peers closest to ${name ?? "your profile"}`;
}

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

  // **"GCCs", not "companies", in all four branches.** The count is of centres in India,
  // and the same word was carrying both meanings across this block — the lead, the card
  // labels and this line. One subject, named the same way in every one of them.
  if (shown === 0) return `No comparable ${industry} GCCs to show.`;
  // The cohort can equal or fall below what is shown when the peers exhausted it —
  // "5 of 5" is fine and "5 of 3" would be arithmetic nobody can follow.
  if (cohort <= shown) {
    return shown === 1
      ? `The one comparable ${industry} GCC in our data.`
      : `All ${formatCount(shown)} comparable ${industry} GCCs in our data.`;
  }
  return `Showing ${formatCount(shown)} of ${formatCount(cohort)} comparable ${industry} GCCs.`;
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
 *
 * **Reworded for the cadence, and it describes the chart more exactly than the
 * question did.** "How much of your industry is in India" was the second of five
 * headings ending on the same phrase, and it also framed the block as a single
 * quantity when what the chart draws is a nesting: the national base, the industry
 * inside it, the companies above inside that. A noun phrase with an appositive says
 * that; a "how much" question promises one number.
 */
/**
 * **"inside the national picture" was a figure of speech where the chart is exact.**
 * A "picture" is not a quantity, the appositive construction read as a line of prose
 * rather than as a card heading, and the block it sat over draws three counted
 * populations nested inside one another. What the chart shows is an industry's share
 * of India's GCC base, so that is what the heading names.
 */
/**
 * **Short enough for ONE line in a two-fifths card, which is what decided the wording.**
 * "Your industry within India's GCC base" is 37 characters and set on two lines at 20px
 * Bold in a ~393px card — and a two-line heading over a three-layer chart pushes the
 * chart down far enough that the card stops matching the ranking beside it. Thirty-seven
 * characters is roughly four over what fits.
 *
 * What went is "your industry", and it costs nothing: the chart's own middle layer is
 * labelled "in {industry}", so the reader is told whose industry inside the graphic. The
 * heading only has to name the frame, which is India's whole GCC base.
 */
export const INDUSTRY_TITLE = DEFAULT_PUBLIC_COPY.industryTitle;

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

/**
 * The largest-centres card's heading, which names the industry.
 *
 * **"GCCs", not "centres", and the heading was the one place on the block the subject
 * went unnamed.** "The largest Software & Internet centres in India" could be read as
 * the largest offices, plants or campuses an industry runs here; every row under it is
 * a global capability centre, which is the word the rest of the surface uses. The body
 * copy keeps "centre" where it is the plain-English noun inside a sentence — the
 * heading is where the class of thing has to be stated.
 */
export function largestTitle(view: PeerView): string {
  return `The largest ${view.industry.industry} GCCs in India`;
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
/**
 * **"we hold" is gone from both branches.** It is how the people maintaining the
 * dataset talk about it, not how a reader would: a CIO is being told what the tool
 * covers, and "we hold" makes the sentence about our filing rather than about India.
 * "in our data" is the phrasing `peerCountLine` and `shortfallLine` already use for
 * the same qualification, so all three now scope their counts the same way.
 */
/**
 * The ranking ran out of companies before it ran out of slots.
 *
 * **It used to be a clause appended to `largestCountLine`**, on the reasoning that a
 * shortfall is a property of the count rather than a caveat about the method. That line
 * is no longer rendered — ANSR asked for it off, since the section heading already says
 * what the block is and the column header now says what the figure is — so the clause
 * needed somewhere to live rather than going with it. A ranking that is three short of
 * its own limit has to say so; that is invariant 3 in the block's own terms.
 *
 * Null at a full ranking, so the component renders nothing rather than a line about an
 * absence there is none of.
 */
export function largestShortfallLine(view: PeerView): string | null {
  const { entries, shortfall } = view.largest;
  if (shortfall === 0 || entries.length === 0) return null;
  return `${formatCount(entries.length)} rather than ${formatCount(view.peers.limit)}: ${view.industry.industry} does not go deeper in India yet.`;
}

export function largestCountLine(view: PeerView): string {
  const shown = view.largest.entries.length;
  const industry = view.industry.industry;
  /**
   * **"GCCs", following the heading.** The heading names the subject as a GCC and these
   * two lines sit four rows under it; with "centres" here the block named one thing two
   * ways inside 400px, which on a page that also holds companies and people is the
   * ambiguity every label on this surface was rewritten to remove.
   */
  if (shown === 1) {
    return `The largest ${industry} GCC in our India data.`;
  }
  return `The ${formatCount(shown)} largest ${industry} GCCs in our India data.`;
}

/**
 * How much of the industry's upper end the visitor's own comparison set already is.
 *
 * **This is the sentence that turns the overlap between the two company blocks from a
 * repetition into a finding.** At the top revenue band the largest centres in an
 * industry are largely the same companies as the closest comparisons — three of five
 * on the default path — and the previous shape marked each of those rows "Also in your
 * peer set", which admits the repeat and resolves nothing. Stated as a proportion of
 * the ranking it is new information, and it is information a CIO wants: their
 * comparison set is not a sample from the middle of the industry, it is most of its
 * top.
 *
 * Null at both ends of the range, and neither is a special case being papered over.
 * Nothing overlapping means there is nothing to say. Everything overlapping never
 * reaches here — `repeatsPeers` collapses the whole block to one line rather than
 * redrawing the peer set under a second heading.
 *
 * **Rendered nowhere, at ANSR's request, and kept for the reason every other removed
 * sentence is kept.** It sat as a full-measure line under the five-row chart and states
 * no quantity the chart does not: the per-row "in your peer set" marker already names
 * which rows overlap, one row at a time. Restoring it is one line in
 * `LargestBlockView`. On the blocked list.
 */
export function largestOverlapLine(view: PeerView): string | null {
  const entries = view.largest.entries;
  const overlap = entries.filter((entry) => entry.alsoPeer).length;
  if (overlap === 0 || overlap === entries.length) return null;

  const industry = view.industry.industry;
  // Exact both sides, like every other count on this screen. "Most of" would be a
  // judgement where the two figures are available and say it themselves.
  // "GCCs", as the heading and the count line above it both say. See `largestCountLine`.
  const of = `${formatCount(overlap)} of the ${formatCount(entries.length)} largest ${industry} GCCs in India`;
  // "peer set", the word the per-row marker uses and the word the product uses. It said
  // "comparison set" while the marker did; ANSR asked for the shorter one, and one
  // vocabulary matters more here than in most places, since the sentence and the marker
  // are two readings of the same overlap.
  return overlap === 1
    ? `${of} is in your peer set above.`
    : `${of} are in your peer set above.`;
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
/**
 * **Reworded at ANSR's request, and the generality claim is what had to survive it.**
 * It was "Functions most GCCs run from India". "Common functions run from the India
 * GCCs" keeps the two words the block depends on: "common", which says the set is
 * typical of India GCCs at large rather than measured off anything on this page, and
 * the plural "GCCs" with no possessive tying it to the five cards above. There is no
 * per-company function record in this dataset, so a heading a reader could take as a
 * claim about those five companies would be a claim with nothing behind it.
 *
 * It stays in code for that reason and is asserted absent from published copy.
 */
export const FUNCTIONS_TITLE = "Common functions run from the India GCCs";

/**
 * What the list is, and deliberately not what order it is in.
 *
 * **It claimed an ordering the page has no evidence for.** "Most to least common
 * across India GCCs." — `COMMON_FUNCTIONS` is a hardcoded list, `COMMON_FUNCTIONS_BASIS`
 * was deleted, and there is no per-company function record in this dataset and will
 * not be. So the rank was an assertion with nothing behind it, and the block drew it
 * as eight numbered tiles, which is what made an unevidenced claim look measured. The
 * numbering went with the sentence; see `CommonFunctionsView`.
 *
 * What replaces it is the one thing about the list that is both true and worth
 * knowing: it does not move with the visitor's answers. That is the property a reader
 * needs in order not to mistake eight functions under a grid of five companies for
 * those five companies' functions — which is the job the two removed caveat
 * paragraphs used to do, and it is said here as a fact about the list rather than as
 * a disclaimer about the tool.
 */
export const FUNCTIONS_LEAD = "Common across India GCCs, whatever the industry.";

/**
 * The locations card's heading, which names the industry.
 *
 * **"India's leading GCC locations for {industry}" read as a database field.** It
 * front-loaded the place, the category and the qualifier before arriving at the
 * subject, and it was the longest heading in the zone. A "Where …" opening states the
 * question the block answers in four words, and the block's own lead — `mapHeading` —
 * gives the exact finding underneath it, with the leading city and its share.
 */
export function mapTitle(view: PeerView): string {
  /**
   * **Not "Where …", because the LEAD already opens that way.** The first attempt at
   * breaking the cadence was "Where {industry} centres cluster", which put "Where
   * {industry} centres cluster" directly above `mapHeading`'s plain branch, "Where
   * {industry} has built in India" — two consecutive lines opening on the same word,
   * which is the same defect as the six headings, one card down. The interrogative
   * noun phrase asks the block's question without taking the lead's opening.
   */
  /**
   * **The INDUSTRY, not the sub-industry, and ANSR asked for the sub-industry.** The
   * map is built from `density`, which is filtered to `input.industry` — see `MapBlock`,
   * whose own `industry` field is `input.industry` verbatim — so a heading naming the
   * sub-industry would name a population the dots were not drawn from. Narrowing the
   * map itself is a data change rather than a copy one and is not free: the thinnest
   * sub-industries hold a handful of companies, which is two or three dots on an outline
   * of India. The same correction is made on two snapshot labels; see
   * `snapshotCitiesLabel`.
   */
  return `Cities where ${view.industry.industry} companies have set up`;
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
/**
 * **All three labels were fragments, and two of them said 500 twice.**
 *
 * The cell rendered a 36px "181", then a smaller "of 500" beside it, then
 * "of the Fortune Global 500 companies have GCCs in India" underneath — so a reader
 * met the denominator twice and then a line beginning with a preposition, which is
 * not a sentence in any reading order. The Forbes cell had the same shape.
 *
 * Each label is now the predicate of a whole sentence whose subject is the figure
 * above it: "181 / Fortune Global 500 companies run a GCC in India." The denominator
 * appears once, inside the index name, where it belongs — the standalone "of 500" is
 * gone from the component with it.
 *
 * **The share moved into the sentence and the two proportion bars went.** They were
 * drawn on the first two cells and there is no denominator to draw on the third, so
 * the row was two cells with a mark and a share caption beside one cell without
 * either — visibly a figure that failed to load rather than a figure that has no
 * fraction. Dropping the marks costs nothing the rule cares about: the project's
 * chart rule is that every mark carries its figure in text, and here the text is all
 * that is left, still stating the same rounded whole percentage.
 *
 * **"Fortune Global 500" and "Fortune 500" are different lists and are never
 * interchanged.** The reference composition labels the third figure "people across
 * Fortune 500 GCCs in India", which is wrong — the figure counts professionals inside
 * Fortune GLOBAL 500 companies, and the two indices have different membership. Both
 * index names are written out in full everywhere they appear.
 */
export const SCALE = {
  /**
   * **The longest heading on the surface became the shortest, and the clause it lost
   * was carrying nothing.** "Leading global companies have established GCCs in India"
   * is nine words to say what a noun phrase says in six, it was the fifth heading in
   * a row ending on "in India", and "have established" is the kind of verb a press
   * release uses. The three figures under it are memberships of two largest-company
   * indices plus the people inside them, so naming the subject and the place is the
   * whole job.
   */
  title: DEFAULT_PUBLIC_COPY.scaleTitle,
  /**
   * **The share clause is gone from both, at ANSR's request.** Each label read
   * "…run a GCC in India, 36% of the list." — the share was moved INTO the sentence
   * when the two proportion bars came off, on the argument that a figure with a
   * denominator should state it. What is left is the count and the claim, and the
   * denominator is still stated once, inside the index name: "Fortune Global 500" names
   * its own 500. A reader who wants the fraction has both numbers on the line.
   *
   * They no longer take an argument. `formatShare` is still what `largestOverlapLine`
   * and the snapshot use, so nothing about how a share is rounded changed — this strip
   * simply states none.
   */
  fortuneLabel: DEFAULT_PUBLIC_COPY.scaleFortuneLabel,
  forbesLabel: DEFAULT_PUBLIC_COPY.scaleForbesLabel,
  /**
   * **"those" now means BOTH indices, and the figure is their union.** It was the
   * Fortune Global 500 subset alone, under two cells naming two different indices — so
   * the narrower of the two memberships was reported as the total for both. The figure
   * is `scale.indexedProfessionals`, deduplicated by construction rather than by
   * subtraction; a company on both lists is counted once. See `indexedProfessionals`.
   */
  peopleLabel: DEFAULT_PUBLIC_COPY.scalePeopleLabel,
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

/* `SnapshotIcon` and `Signal.icon` are GONE. They named which line glyph a cell drew,
   back when each cell was a floating tile with a pale disc holding an icon. The tiles
   were replaced by four typographic stat rows and the discs went with them — the icon
   was the single most category-interchangeable element on the surface and it did no work
   the label beside it was not already doing.

   The field outlived the glyph by a pass and nothing read it. A value nothing renders is
   how the next reader concludes the omission was an oversight and puts the icons back.
   ========================================================================== */

/**
 * Whether the cell's value is a MAGNITUDE or an ANSWER.
 *
 * **Three of the four cells hold a number and the fourth holds a city, and drawing
 * them the same way was the single most damaging element on the surface.** The strip
 * set every value in one treatment — 36px bold, the action orange, `tabular-nums`,
 * `tracking-display` — which put the string "Bengaluru" in a numeral slot,
 * letter-spaced for digits it does not contain, as the loudest thing on a 3,500px
 * page. A place name rendered as a figure is the visible seam of a filled template,
 * in front of an audience whose one reason to distrust the page is that it might be
 * automated.
 *
 * So the cell states which kind of value it holds and `snapshot.tsx` draws it
 * accordingly. `place` is not a quieter figure: it is a different thing, and it takes
 * the ink and the size of a name rather than of a quantity. The cell count stays at
 * four either way — that is the invariant — so this changes the treatment and never
 * the shape of the strip.
 */
export type SignalKind = "figure" | "place";

export interface Signal {
  /**
   * Which treatment the value takes. Defaulting is deliberately not offered: a new
   * cell has to say what kind of value it is, or it inherits the bug this field
   * exists to fix.
   */
  kind: SignalKind;
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
  /**
   * A unit that renders a step DOWN from the figure — the `%` on a share, and
   * nothing else so far.
   *
   * It is a field rather than a regex over `value`, because the alternative is a
   * component parsing its own data: `"<1%"` has a symbol at each end, and the first
   * unit that is a word rather than a glyph would silently be split off too. The
   * producer knows what the unit is, so the producer states it.
   *
   * Why it is separated at all: a `%` set at the figure's own size is 30% of the
   * cell's optical weight for none of its information, and four of them across a row
   * of four is the difference between a figure and a data field. Held at roughly
   * three fifths, it reads as the unit it is.
   */
  suffix?: string;
  /**
   * What the figure is.
   *
   * **All four are three or four words and none of them names the industry any more.**
   * The industry was interpolated into three of the four, which made one label 34
   * characters against another's 24 and left the row visibly ragged under four figures
   * that align perfectly — and it said the same word three times inside 900px. The
   * section's own heading names the industry once, which is where a subject shared by
   * every cell belongs.
   */
  label: string;
  /**
   * **There is no `note`, and the four of them were removed at ANSR's request.**
   *
   * Each cell used to carry a second line under its label — "Of 1,834 GCCs in India",
   * "Employees per GCC", "Hubs and emerging locations", "More BFSI GCCs than any other
   * city". The argument for them was that a bare figure beside a short label leaves a
   * reader unsure whether they are looking at companies, centres or people, and this
   * page carries all three. What settled it against them is that the labels now name
   * the GCC themselves, so the notes were restating the subject a third time and adding
   * a fourth text row to a cell that has three.
   *
   * The one real cost is on the mean headcount, whose note was the last trace of a
   * method line: the figure is a rounded mean of band midpoints and nothing on the strip
   * says so. That is already on the blocked list with the two other provenance removals.
   */
}

/**
 * The three snapshot labels that are published strings, and NOT the fourth.
 *
 * **The opening cell's label is composed, which is why it is not here and cannot be.**
 * It reads "companies in this sub-industry have a GCC in India" or "…this industry…"
 * depending on whether
 * the visitor named a sub-industry, so it is a function of the input rather than a fixed
 * string — the same reason every derived sentence in this file stayed in code. A flat
 * field could only hold one of the two branches, and the branch it dropped would be the
 * one most visitors see.
 *
 * `publicCopySchema` carries three snapshot labels rather than four for that reason. It
 * briefly held a fourth — "Of every GCC in India", the label from the version of this
 * cell that stated the industry's SHARE of the national base, before ANSR asked for a
 * count — and it was removed rather than left unread: an editable field nothing draws is
 * a change an admin makes and cannot see, which is worse than no field. `0-screen1.spec.ts`
 * asserts that old string is absent from the strip.
 */
export interface SnapshotLabels {
  headcount: string;
  cities: string;
  leadingCity: string;
}

/** The three labels as published copy supplies them. See `SnapshotLabels`. */
export function snapshotLabels(copy: PublicCopy): SnapshotLabels {
  return {
    headcount: copy.snapshotHeadcountLabel,
    cities: copy.snapshotCitiesLabel,
    leadingCity: copy.snapshotLeadingCityLabel,
  };
}

/** The shipped wording, which is what `signals` uses when a caller states nothing. */
export const SNAPSHOT_LABELS = snapshotLabels(DEFAULT_PUBLIC_COPY);

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
 *
 * **The labels are an ARGUMENT, not a hook call, and that is what keeps this pure.**
 * Three of the four are published strings now, so the obvious version reads
 * `usePublicCopy()` here — and this is a plain function called from a component, not a
 * component, so a hook in it would be a rules-of-hooks violation that happens to work
 * until something calls it in a loop or a branch. It is also the reason the unit suite
 * can run it at all: `tests/unit/screen1.test.ts` calls it over all 24 industries with
 * no React tree anywhere. So the caller reads the context and passes the strings in,
 * defaulted to the shipped ones for every caller that has no opinion.
 */
export function signals(
  view: PeerView,
  labels: SnapshotLabels = SNAPSHOT_LABELS,
): Signal[] {
  const leader = view.map.cities[0];
  const cityCount = view.map.cities.length;
  const average = view.industry.averageHeadcount;

  /**
   * **The opening cell is a COUNT of comparable centres again, at ANSR's request, where
   * it was the industry's share of the national base.**
   *
   * What the share was solving is still real and is worth stating so it is not
   * rediscovered as a defect: a count here is the same number a reader also meets on the
   * containment chart's middle layer and as the denominator of the peer count line. The
   * share sidestepped that by publishing the one quantity the chart draws and never
   * states. It was overruled on the ground that a percentage of every GCC in India is a
   * fact about the market's composition, while what a visitor arrives wanting is how many
   * companies like theirs are already here.
   *
   * **`businessType.count`, which is the population the PEERS were drawn from** — every
   * company above the similarity floor in the visitor's sub-industry, not the ones
   * carrying their exact business type. It has to be that population or this cell
   * disagrees with the five cards below it; see `IndustryBlock.businessType`.
   *
   * Sub-industry is optional, so the cell has a second branch rather than a hole: with no
   * sub-industry the comparable set IS the industry, and the label says so. Neither branch
   * names the industry — the section heading does that once, for all four cells.
   */
  const comparable = view.industry.businessType
    ? { count: view.industry.businessType.count, scope: "sub-industry" }
    : { count: view.industry.total, scope: "industry" };

  return [
    {
      kind: "figure",
      /**
       * A grouped count, and no `suffix` — the cell's `%` went with the share.
       *
       * **Zero renders as "Data unavailable" rather than as a nought**, which is the
       * strip's standing rule and matters more on this cell than on any other: a 0 in the
       * opening figure of a personalised result says "there is nobody like you here",
       * which is a claim, where the truth is that this industry is thin enough that the
       * comparable population cannot be stated. The peer block and the containment chart
       * below both say that in words. Unreachable in today's data on the industry branch
       * — the thinnest industry holds two companies — and reachable in principle on the
       * sub-industry one.
       */
      value: comparable.count > 0 ? formatCount(comparable.count) : null,
      // **The industry is named by the SECTION, not by any label.** Every figure on this
      // strip is a property of the industry rather than of the five-company set our own
      // matching chose, and a reader who takes the first cell for a peer-set statistic
      // misreads the other three the same way — so the subject is stated once, where it
      // governs all four cells. See `snapshotHeading`.
      //
      // **It cannot say "already", however well the word would work here.** Six uses
      // were removed across this file for leaning on the reader to feel late, and the
      // rule is asserted rather than remembered — see the copy test.
      //
      // A noun phrase, as all four labels are.
      //
      // **"GCCs in your {scope}", where this read "Comparable GCCs in your {scope}"** — at
      // ANSR's request, and the word that went was carrying something. On the industry
      // branch nothing is lost: `industry.total` IS every GCC in the industry, so the
      // shorter label is the more exact of the two. On the sub-industry branch the figure
      // is the population above the similarity floor rather than everything sharing one
      // sub-industry label, so "companies in this sub-industry" reads very slightly wider
      // than what is counted. Accepted because it cannot mislead in the direction that
      // matters: the count is the population the five cards below were drawn from, so the
      // cell and the cards still agree, which is the failure the count was chosen to avoid.
      //
      // "your" stays — it is the one place on this strip the visitor's own answer is
      // addressed, the other three cells being national facts.
      // **A sentence predicate now, completing the figure above it, which is the shape
      // ANSR reworded all four cells into** — the terminating scale strip has always
      // read this way. Still composed over the visitor's own scope, and still the one
      // label on the strip that addresses their answer; the other three are national
      // facts. "this sub-industry" rather than "your sub-industry" because the clause
      // already has a subject, and "companies in your sub-industry have a GCC" reads as
      // though the visitor owns the population.
      label: `companies in this ${comparable.scope} have a GCC in India`,
    },
    {
      kind: "figure",
      value: average !== null ? formatCount(average) : null,
      // "Typical", not "average": the figure is a rounded mean of employee bands, and
      // "typical" is the honest word for a number arrived at that way — it claims a
      // central tendency rather than an arithmetic result. "GCCs" plural, never
      // "GCC's", which ANSR asked never to appear.
      label: labels.headcount,
    },
    {
      kind: "figure",
      value: cityCount > 0 ? formatCount(cityCount) : null,
      // Two versions before this one. "Total Indian cities represented" was a database
      // field name read aloud; "Indian cities in play" was consultants' shorthand, and
      // it made a plain count of cities sound like a shortlist somebody had drawn up.
      // The figure is the number of Indian cities where this industry operates a
      // centre, so that is what the label says.
      label: labels.cities,
    },
    {
      /**
       * **The one `place` on the strip, and the one element on the surface that most
       * needed to stop being a figure.** A city name set in the figure treatment —
       * 36px bold, the action orange, letter-spaced for digits, `tabular-nums` on
       * letters — was the loudest thing on a 3,500px page and, worse, the visible
       * seam of a filled template: the reader can see that a slot built for a number
       * received a string. See `SignalKind`.
       */
      kind: "place",
      value: leader ? leader.city : null,
      // "Most common location" named the metric; this names the answer. The note
      // stops the reader wondering whether it leads on companies, centres or people.
      label: labels.leadingCity,
    },
  ];
}

/**
 * The snapshot section's own heading.
 *
 * **It names the industry, which is what let all four labels stop naming it.** The
 * heading was "Your industry in India" — correct, and it left the subject unstated, so
 * three of the four labels had to interpolate the industry themselves and the row read
 * ragged under four aligned figures. A subject shared by every cell belongs in the
 * section name, said once.
 */
export function snapshotHeading(view: PeerView): string {
  // "GCCs", never "GCC's", which ANSR asked never to appear.
  return `Snapshot of ${view.industry.industry} GCCs in India`;
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
   second copy of — so there is no axis left to name. Removed at ANSR's request.

   **`largestAxisNote` is now gone too, and this is the one axis note whose absence
   costs nothing.** It read "Full width is JPMorgan Chase, at 59,900–60,000." —
   directly beneath a ranked stack whose FIRST ROW is JPMorgan Chase, drawing a
   full-width bar, with 59,900–60,000 set beside it at 24px. The sentence restated a
   company name and a figure the reader had passed four rows earlier, which is the
   opposite of what an axis note is for: an unstated axis is a problem when nothing on
   screen reveals it, and on a ranking sorted by the quantity the bars encode, row one
   IS the axis.

   The general rule it came from still holds and still applies to any bar set that is
   not self-labelling this way. The two blocks that draw bars on this screen have both
   now dealt with it by making the figure legible rather than by describing it. */
