import type { MetricShape } from "@/data/metrics";
import type { PeerViewInput } from "@/data/screen1";
import {
  DEFAULT_PUBLIC_COPY,
  type MetricFunction,
  type PublicCopy,
} from "@/data/schema";

/**
 * **The seven static headings in this file are DERIVED from `DEFAULT_PUBLIC_COPY`.**
 *
 * Same split as Screen 1's `copy.ts`: the schema holds the shipped wording because it is
 * published data an admin edits, this file holds the reasoning because that is a code
 * decision. The constants below read the schema key rather than restating its string, so
 * there is one value and the reasoning cannot drift away from what it explains; the
 * grouped shapes (`FIGURES_HEADING`, `HR_SECTIONS`, `OPS_SECTIONS`) are each a function
 * of `PublicCopy` applied to the default, which is what keeps the SHAPE in one place as
 * well as the value.
 *
 * The screens render through `usePublicCopy()`, so these constants are the value the
 * context resolves to with no provider above it. Everything else in the file — every
 * derived sentence, every per-metric note, the held group's strings — stays in code for
 * the reasons recorded beside each one.
 */

/**
 * Screen 2's visitor-facing sentences, in one file — same rule as Screen 1's
 * `copy.ts`. The components own layout; this owns language, so the wording a
 * client reviews is one file rather than five JSX trees.
 *
 * **This file used to be most of the screen and is now almost none of it.** What
 * went, in one pass, and what each removal cost:
 *
 *   - **The screen `h2`** — "What an India GCC would give {name}". A promise rather
 *     than a claim, and the band above already names the scope.
 *   - **The lead under it.** Its job was the scope change, which `HEADER_LINES.functions`
 *     states on the band in six words. Genuinely redundant.
 *   - **`AREA_LEAD`, the per-tab lead.** Four sentences describing the cards below
 *     them, each of which carries its own title. The same redundancy Screen 1's
 *     `industrySentence` had.
 *   - **Every card's `question` line.** Thirty-five sentences, one per card, each
 *     restating in a question what the card's title and unit already say. The field
 *     is untouched in the data and still crosses the gate — see `metric-card.tsx`.
 *   - **`HELD_BODY`.** Its reason moved into `heldHeading`, which is what the
 *     snapshot did on Screen 1 when its notes went and its heading took the subject.
 *   - **`SCREEN_PROVENANCE` and `AREA_PROVENANCE`.** Three claims, two of which no
 *     heading or label can carry. They are below, exported and unit-tested and
 *     rendered nowhere, on `handoff.md`'s blocked list for ANSR.
 *
 * **The governing rule, taken from Screen 1's own removal pass:** cut the sentence;
 * where cutting costs a claim the page cannot otherwise reveal, keep the sentence
 * exported and tested but unrendered and put the claim in front of ANSR. Where the
 * job can move into a heading, a label or an in-place chip, move it there rather
 * than keeping a paragraph.
 *
 * **Who this is written for, and what that costs.** Not ANSR. A CIO, COO, CHRO or
 * CFO at a large global company who is deciding whether India is worth a
 * several-hundred-person commitment, reading on a phone, between two other
 * meetings. Three consequences the wording has to carry:
 *
 *   - **The answer leads.** Every heading states what the reader is looking at, not
 *     what we did to produce it.
 *   - **No sentence about our own rigour.** The screen used to explain that it shows
 *     figures exactly as entered and drops incomplete ones — true, and worth doing,
 *     and worth nothing to the reader.
 *   - **Nothing sells.** The evidence is the argument. A sentence that praises India
 *     rather than measuring it is the one thing this audience discounts the whole
 *     page for.
 *
 * Two product constraints on top of that, unchanged:
 *
 *   - **No lens names.** Supply, speed, place and cost are an internal filing
 *     system. Nothing below is a re-lettering of them.
 *   - **The tabs are four views, not four datasets.** A metric on more than one tab
 *     carries the same figure on each, so the copy must never imply that operations
 *     or HR is measured separately.
 */

/* ==========================================================================
   The close
   ========================================================================== */

/**
 * `gccStatus` branched into a close, **kept, unit-tested on all three values, and
 * RENDERED BY NOTHING.**
 *
 * It used to carry a `title` and a `lead` as well — the screen's `h2` and the paragraph
 * under it — which is where `project.md`'s "five visible strings" came from. That was
 * wrong twice over: the lead was one shared constant that did not branch at all, so it
 * was four, and both went with the screen's own explanation.
 *
 * **What unrendered it is that the close stopped depending on the visitor.** Its copy is
 * supplied, fixed, and identical on both screens — one heading, one line, one label in
 * `CLOSE_COPY` — so there is nothing left for a status to select. Screen 1's equivalent
 * (`peerClosing`) is deleted rather than kept, because this one already carries the
 * branch and a second unrendered copy of it would be two things to keep in step for no
 * reader.
 *
 * **So `gccStatus` is once again a field nothing draws, and that is a recorded state
 * rather than a defect.** Do not delete it on the strength of this: `framing()` on
 * Screen 1 and this function are both exported and tested on all three values, and the
 * unit suite is the only place the field can be varied at all — the form does not ask.
 * Restoring a branched close is one prop.
 *
 * The shape is `ClosingCopy`'s two fields rather than its own declaration with the same
 * names, which is the drift worth avoiding — two files describing one component's copy,
 * free to fall out of step. `ctaLabel` is gone: three labels of the form "Talk to ANSR
 * about {verb} your India GCC" each restated the heading above them.
 */
export interface FunctionFraming {
  ctaHeading: string;
  ctaBody: string;
}

export function functionFraming(input: PeerViewInput): FunctionFraming {
  switch (input.gccStatus) {
    case "operating":
      return {
        ctaHeading: "Which of these you are beating",
        ctaBody:
          "That depends on your roles, your cities and how you staff them.",
      };
    case "expanding":
      return {
        ctaHeading: "What the next function costs",
        ctaBody: "That depends on the roles you add and where you add them.",
      };
    case "evaluating":
      return {
        ctaHeading: "What these mean for your roles",
        ctaBody:
          "The national picture narrows once the roles and the cities are yours.",
      };
  }
}

/* ==========================================================================
   The held group
   ========================================================================== */

/**
 * Why these figures are not on the page, said in the heading rather than under it.
 *
 * `HELD_BODY` used to carry it as a paragraph — "These depend on the roles you would
 * move, the cities you would pick and the country you are hiring from. A single
 * national number would mislead more than it would inform, so the shape is here and
 * the figures are not." Everything after the first sentence is now drawn rather than
 * said: the sealed card, its chip and `heldShapeNote` are all three of them the
 * statement that the shape is here and the figure is not. What only words could carry
 * is the REASON, and a heading holds it in nine.
 */
/**
 * **"shaped by", where this said "depends on", and it is now the only wording.** The HR
 * composition asked for "Figures shaped by your roles and cities" and got its own
 * constant, so one screen headed the same group two ways: HR said "shaped by" and the
 * other three said "depend on". A visitor met the difference by clicking a tab, with
 * nothing behind it but which file drew the tab. ANSR's wording won, the HR constant is
 * gone, and the count survives because a group of one is a real state.
 */
export function heldHeading(count: number): string {
  return count === 1
    ? "One figure shaped by your roles and cities"
    : "Figures shaped by your roles and cities";
}

export const HELD_CHIP = "Held back";

/**
 * What a withheld metric's shape is, in words.
 *
 * Cardinality is all we have — `publicMetric` drops the row and column names, the
 * unit, the index base and the as-of date, because a row label beside a visible
 * axis can imply the answer. So the sentence counts, and names nothing.
 */
export function heldShapeNote(shape: MetricShape): string {
  switch (shape.kind) {
    case "scalar":
      return "One figure.";
    case "range":
      return "A low end and a high end.";
    case "breakdown":
      return `${shape.entries} parts.`;
    case "matrix":
      return `${shape.rows} rows across ${shape.columns} columns.`;
  }
}

/* ==========================================================================
   Small labels
   ========================================================================== */

export const RATING_KEY_LABEL = "Scale, weakest first";
export const TABS_LABEL = "Function";

/**
 * What the figure row at the head of each tab is, named.
 *
 * **Not a lens re-lettered, which is the constraint this had to clear.** The
 * catalogue files every metric under talent supply, speed to stand up, location or
 * cost, and this file's standing rule is that none of those four words appears on a
 * public screen — four subheadings per tab would have been a transcription of an
 * internal filing system. None of the four below is one of them. What each says is
 * what the figures under it are properties OF, which is the job Screen 1's
 * `snapshotHeading` does for its own four cells: without it a tab opened on five bare
 * numbers directly beneath a tab strip, with nothing stating that they are national
 * figures about India rather than anything the visitor typed.
 *
 * **"At a glance" is doing real work rather than padding.** Every figure in the row is
 * evidenced by a chart further down the same tab — the row introduces nothing — so the
 * phrase is an accurate description of the row's relationship to the rest of the tab.
 *
 * Authored for all four tabs rather than for the one the reference composition covers.
 * A heading that appeared on technology and nowhere else would read as an oversight on
 * the other three, and the four figure rows are the same kind of object.
 */
/**
 * **"at a glance" is gone from all four, and the heading is an EYEBROW now.** The
 * earlier note argued the phrase was doing real work — every figure in the row is
 * evidenced by a chart further down, so the row introduces nothing and "at a glance" is
 * an accurate description of that relationship. What changed is where the line sits:
 * `SummaryFigures` sets it as a 12px caps eyebrow, which is Screen 1's own device for
 * the same object, and eleven characters of caps padding on a line whose whole job is to
 * name a subject is the length that stops it reading as a label. The relationship is
 * still true; it is not the reader's problem.
 */
/**
 * **The four-key mapping lives here and nowhere else.** `publicCopySchema` names its
 * fields after the tabs a reader sees (`figuresOperations`) while the code keys them off
 * `MetricFunction` (`operations`), and the two vocabularies are not the same list —
 * `tech` against `figuresTech` is the one that does not transliterate. One function is
 * what stops four call sites each doing that translation, and each getting one wrong
 * would be a heading from the wrong tab rather than a type error.
 */
export function figuresHeadings(copy: PublicCopy): Record<MetricFunction, string> {
  return {
    tech: copy.figuresTech,
    // "landscape" rather than "base", at ANSR's wording for the composed operations tab.
    // The four cells under it are a workforce, an uptime, a stock of floorspace and a
    // count of lost days — "base" named the first of those and stretched over the rest.
    operations: copy.figuresOperations,
    hr: copy.figuresHr,
    finance: copy.figuresFinance,
  };
}

export const FIGURES_HEADING: Record<MetricFunction, string> =
  figuresHeadings(DEFAULT_PUBLIC_COPY);

/**
 * Who stands behind the figures, under the content surface.
 *
 * **Not a restoration of `SCREEN_SOURCE`, and the difference is what it claims.** That
 * sentence — "National aggregates maintained by ANSR." — makes two claims a reader
 * cannot check and one of them is about method. This is an attribution and nothing
 * else, in the position a source line belongs: outside the card, after the evidence,
 * at caption size. Requested in exactly this form.
 *
 * `SCREEN_SOURCE` stays exported, unrendered and on the blocked list, because the
 * claim it carries — that these are aggregates rather than a survey — is still one no
 * heading or label on the screen can make.
 */
export const SOURCE_LINE = DEFAULT_PUBLIC_COPY.sourceLine;

/**
 * How to read the trailing plus, on the cards that have one and nowhere else.
 *
 * `SCREEN_PROVENANCE` explained it once at the foot of every tab, for the five
 * metrics that use it out of thirty-five. It is a per-card reading instruction, so it
 * sits with the other per-card reading instruction — `indexBaseline`'s "Lower is
 * cheaper" — in `CardMeta`, on the cards it applies to.
 */
export const FLOOR_NOTE = "+ indicates a floor, not a point measurement";

/**
 * The one section heading that appears on more than one tab.
 *
 * **Two composed tabs draw the same two shared metrics under it, so it is one constant
 * rather than the same words typed twice.** `TIME_TO_FIRST_HIRE` and `BACKFILL_TIME` are
 * single definitions spread onto three tabs, and the standing instruction for the
 * composed tabs is that a shared section reads identically across functions — a reader
 * crossing from HR to operations must not be able to tell that two files drew it. Two
 * literals would let one be reworded alone; this cannot be.
 *
 * It is not a lens name. `speed` is what the catalogue files these two under; what this
 * says is what the two ranges in the section MEASURE, which is the same test
 * `FIGURES_HEADING` passes.
 */
/**
 * **"How long hiring takes", where this was "Hiring velocity benchmarks".** Three words
 * of which one was a claim: "velocity" is consultant register for the thing the two
 * cards measure in days, and "benchmarks" names what kind of object the section is
 * rather than what it tells the reader. The peer view's headings are all of this shape —
 * "GCC details of peers closest to {company}", "Common functions run from the India GCCs"
 * — a subject stated, no noun for the artefact.
 */
/**
 * **One schema KEY, which is the published form of "one constant rather than the same
 * words typed twice".** `velocityHeading` is a single field, so an admin who rewords the
 * section rewords it on both tabs at once and cannot reword one alone — exactly the
 * property two literals would have given up, now held one level further out.
 */
export const VELOCITY_HEADING = DEFAULT_PUBLIC_COPY.velocityHeading;

/* ==========================================================================
   The HR composition

   **One tab is composed rather than derived, and this is where its language lives.**
   Every other tab lays itself out from the data — `layoutArea` decides what is a
   figure and what is a card, `metricWidth` decides how wide, and `AreaPanel`
   alternates grounds from the list it is handed. The HR tab is a supplied
   composition: named analytical sections, in a stated order, with a stated grouping.
   See `hr-view.tsx` for what that costs and why it is scoped to one tab.

   Two rules the strings below still obey. **Nothing claims anything the data does not
   already say** — each heading names what its section holds, and the one caveat is a
   caveat rather than a finding. And **nothing names a lens**: "Hiring velocity" is not
   `speed` re-lettered, it is what the two ranges in that section measure, exactly as
   `FIGURES_HEADING` names what its figures are properties of.
   ========================================================================== */

/**
 * The two analytical section headings, in composition order.
 *
 * The figure row supplies its own from `FIGURES_HEADING`, and the held group its own
 * from `heldHeading`, so these are the two sections in between.
 */
/**
 * `analysis` reads "Scale and salary pressure", where it was "Scale and salary
 * analysis". The two cards are how long the next hundred people take and what the same
 * person costs next year, so "pressure" is what the second one measures; "analysis" was a
 * word about us doing analysis, which is the class of sentence this screen keeps cutting.
 */
export function hrSections(copy: PublicCopy) {
  return {
    velocity: copy.velocityHeading,
    analysis: copy.hrAnalysisHeading,
  };
}

export const HR_SECTIONS = hrSections(DEFAULT_PUBLIC_COPY);

/**
 * How to read a metric, per metric, on a composed tab.
 *
 * **Keyed by metric ID, which is the one key admin cannot reach.** A title or a unit
 * is admin-editable free text; an id is a catalogue constant, so a caveat cannot be
 * detached from its own metric by an edit that looks like a wording change. Same
 * argument as `FIGURE_ICONS` in `metric-card.tsx`.
 *
 * This is deliberately not the metric's `note`. That field is the admin's working
 * record — it names the supplied sub-ranges and what was stored from them — and
 * `publicMetric` drops it for exactly that reason. What a visitor needs is the shorter
 * claim: the two endpoints are operating models, and everything else about their own
 * number moves with decisions this page has not asked them about.
 *
 * **Two ids for one sentence, not one entry read by two tabs.** `TIME_TO_FIRST_HIRE`
 * is one shared metric spread onto three tabs with a different id each, and the two
 * composed tabs both draw it; keying on the id is what makes the caveat travel with the
 * DRAWING rather than with the definition, so the technology tab — which does not carry
 * this metric at all — cannot inherit a note for a card it does not have.
 *
 * **Both velocity cards carry one now, and the second one is why.** The two sat side by
 * side with a caveat under one and nothing under the other, so the shorter card's own
 * value line floated at a different height from its neighbour's — the asymmetry ANSR
 * reported across the pair. Backfill's line is not filler bought to level the row: the
 * metric stores a deliberately wide 35–75 because it collapses a per-FUNCTION split, and
 * the thing a reader actually needs to know is which END of that span their own vacancy
 * sits at. That is a seniority question, not a function one, so saying it does not
 * reintroduce anything the metric exists to collapse.
 */
export const METRIC_NOTES: Record<string, string> = {
  "hr-time-to-first-hire":
    "Timelines vary by hiring model, role, location and seniority.",
  "ops-time-to-first-hire":
    "Timelines vary by hiring model, role, location and seniority.",
  // The supplied sub-ranges, as the one thing that tells a reader where in the span to
  // look: mid-level 35–45 days, specialist 60–75. Stated as the two ends rather than as
  // four more numerals, because the span is already above it.
  "hr-backfill-time":
    "A mid-level seat refills near the lower end; a scarce specialism near the upper.",
  "ops-backfill-time":
    "A mid-level seat refills near the lower end; a scarce specialism near the upper.",
  /**
   * **`hr-salary-growth` has NO note, and its absence is the decision worth recording.**
   * The comparator ("All roles", the one orange row) still may not be carried by colour
   * alone — but its own label is self-descriptive as the all-up baseline, so the label IS
   * the text carrier and no separate sentence is needed. The sentence that briefly lived
   * here ("All roles is the market comparator…") was doing double duty: naming the
   * comparator, and closing the height gap with the scale-milestones card beside it. Three
   * supplied specialism rows (SDE, Product Management and DevOps / Platform Engineering) do
   * the second job with data instead, at
   * the project owner's request, so the editorial line came off. See `hr-view.tsx`.
   */
};

/**
 * What names each rail on the scale curve.
 *
 * **Code rather than `siteContent.copy`, and the second one decides it.** A caption that
 * names a rail asserts nothing about the dataset and would ordinarily be an editable
 * string — but the ANSR rail's caption is half a drawn wordmark, so the editable part is a
 * fragment that has to sit in front of a mark and reads as nothing without it. An admin
 * given "Built with" in a text box can only make the caption worse. The subject rail's
 * caption goes in the same place for the same reason the pair of them is one decision.
 *
 * Neither states a ratio, a percentage or a duration. The figures are on the rails and the
 * comparison is the drawing; a caption doing the arithmetic would be a claim, and only one
 * of the two rails has a source behind it.
 */
export const MILESTONE_CAPTIONS = {
  /**
   * "Typical India GCC", not "the market" or "the average". The metric's own unit already
   * says "months, median", so this names the SUBJECT of the median rather than restating
   * the statistic — and "typical" is the word a median supports.
   */
  market: "Typical India GCC",
  /** Set immediately before the ANSR lockup. See `ScaleMilestones`. */
  ansrPrefix: "Built with",
} as const;

/* ==========================================================================
   The operations composition

   **The second tab composed rather than derived**, to a supplied structure and
   reference render. See `ops-view.tsx` for what it places and what it gives up; the
   same two rules the HR strings obey hold here. Nothing below claims anything the data
   does not already say, and nothing names a lens — "Supporting operational benchmarks"
   is not `place` re-lettered, it is what the two charts in that section are relative to
   the two hiring ranges above them.
   ========================================================================== */

/**
 * The two analytical section headings, in composition order.
 *
 * The summary row supplies its own from `FIGURES_HEADING`, and the graduate card is a
 * bare `Panel` under its own title, so these are the two grouped sections between them.
 *
 * `velocity` is the SAME CONSTANT the HR tab uses rather than the same words typed
 * twice. Both tabs draw the same two shared metrics in the same component under this
 * heading, and the whole instruction behind this pass is that a shared section reads
 * identically across functions — two string literals would let one of them be reworded
 * alone, which is the drift this indirection exists to make impossible.
 */
/**
 * `supporting` reads "Scale and connectivity", where it was "Supporting operational
 * benchmarks". Both of the words that went were about the section rather than about
 * India: "supporting" ranks it against the sections around it, which is our filing
 * problem, and "benchmarks" names the artefact. The two cards are the scale curve and
 * network latency, which is what the heading now says.
 */
export function opsSections(copy: PublicCopy) {
  return {
    velocity: copy.velocityHeading,
    supporting: copy.opsSupportingHeading,
  };
}

export const OPS_SECTIONS = opsSections(DEFAULT_PUBLIC_COPY);

/* --------------------------------------------------------------------------
   The held group — DELETED

   **The sealed group is gone from the HR and finance tabs at ANSR's request, and every
   string it needed went with it.** `HR_HELD_LEAD`, `HR_HELD_AVAILABILITY`,
   `HR_HELD_VARIES`, `HR_RATIO_MODELS`, `HELD_LOCK_LABEL`, `HELD_MATRIX_ROW_PREFIX` and
   `HELD_MATRIX_COLUMN_PREFIX` were all authored for that one composition; with nothing
   drawing it they are deleted rather than kept exported, because none of them carries a
   CLAIM the page can no longer make — the removal is of the whole statement, not of a
   sentence that said it. Git holds them.

   `OPS_SUMMARY_NOTES` went in the same pass: a summary cell is one line under its figure
   now, so there is nowhere for a note to go, and the scope a lifted figure must not lose
   is authored into the metric's own title instead. See `SummaryFigure.title`.

   The GATE is untouched. `publicMetric` still has no field a withheld figure could travel
   in, and `heldHeading`, `HELD_CHIP` and `heldShapeNote` below still serve the derived
   path and the operations tab.
   -------------------------------------------------------------------------- */

/* ==========================================================================
   Kept, tested, and rendered nowhere

   Three claims that cost the page something no heading or label can carry. Each is
   one prop to restore, each is on `handoff.md`'s blocked list, and each has a
   browser spec asserting its ABSENCE so no half of the removal comes back by
   accident. This is the device Screen 1 used for `LARGEST_LEAD` and `peerLead`.
   ========================================================================== */

/**
 * The source credit, and there is now none on the screen.
 *
 * Screen 1 lost its own at ANSR's request and that is a blocked item there; this is
 * the same class of removal and belongs beside it. What goes with it is any statement
 * that these are aggregates rather than a survey, and any statement of who maintains
 * them.
 */
export const SCREEN_SOURCE = "National aggregates maintained by ANSR.";

/**
 * The one caveat the cost tab owes a CIO, and the page can no longer make it.
 *
 * True by construction — the schema has no currency format and refuses a
 * currency-looking unit, so an absolute per-head figure cannot be stored in this
 * dataset at all — and invisible without a sentence. A reader sees indices and can
 * infer that cost is expressed as indices; what they cannot see is that no salary
 * figure exists behind the gate either, which is the part that answers "so what are
 * you holding back". Nothing on the tab can imply it, so it is here rather than
 * paraphrased into a label.
 */
export const COST_PROVENANCE =
  "Cost is shown as indices, spreads and growth rates. We publish no per-head salary figure — not here, and not behind the gate.";

/**
 * What the shared supply figures count, and that they do not move between tabs.
 *
 * Two claims, and both were considered for a label before landing here. The first —
 * that 8.7 million is the national workforce rather than the headcount already inside
 * GCCs — could move into the metric's own `unit`, which is the field that names what
 * is counted; that is a dataset edit rather than a copy change and is ANSR's to
 * approve, so it is proposed rather than done. The second — that a metric on three
 * tabs carries one figure on all three — was deliberately NOT given a per-card chip:
 * fifteen chips saying "you would see this elsewhere too" is a statement about our own
 * information architecture, which is the one thing this file's doctrine forbids.
 */
export const SHARED_SUPPLY_PROVENANCE =
  "Bench strength, graduate output and the hiring timings are the national workforce rather than the share already inside GCCs — that is what “available to hire” means. Same figures on every tab that shows them.";

/* ==========================================================================
   The finance composition

   **The third tab composed rather than derived**, to a supplied structure and reference
   render. See `fin-view.tsx` for what it places and — at more length than either of the
   other two needed — what it refuses. The same two rules hold: nothing below claims
   anything the data does not already say, and nothing names a lens.

   **Four things the supplied composition asks for are not here, and three of them are
   refusals rather than omissions.** They are on `handoff.md`'s blocked list:

     - **"Operating cost advantage vs global peers — 30–40% lower"**, as the leading
       card of the overview row. No such figure exists in this repository — not in the
       catalogue, not in `docs/brief.md`, not in the dataset — and the instruction with
       the composition was to introduce no new metric. The overview row is the three
       growth rates that do exist, which fill it exactly.
     - **A "Cost structure breakdown" panel** — people 64%, facilities 13%, technology
       9%, business services 8%, other 6%. Same problem, and a second one: it is a
       second cost composition beside `fin-cost-composition`, whose figures are the ones
       `docs/brief.md` asks for under that name. Two splits of one subject, one of them
       unsourced.
     - **A "Deep dive" section** of three bulleted text columns. Every bullet would be a
       claim about cost with nothing behind it, on the one screen whose entire argument
       is that nothing on it is invented.
     - **A "Book a conversation" call to action.** Not a data question: the tool has no
       CTA on either screen at ANSR's request, and a browser spec asserts that the
       public surface contains no outbound link at all. Restoring one is a decision
       about the whole tool rather than about this tab.
   ========================================================================== */

/**
 * What every figure in the finance overview row measures, beside the row's heading.
 *
 * **A qualifier rather than a second heading, and it is true of all three.** The row is
 * the wage, operating and workplace growth rates, which is the brief's cost-durability
 * metric split three ways — so "year-on-year growth" is the one thing the three have in
 * common and the one thing the heading above them does not say. It is the only figure
 * row on the screen whose cells share a unit that none of them carries as a `unit`
 * field.
 *
 * The heading itself is unchanged and is still `FIGURES_HEADING.finance`. The reference
 * asks for "FUNCTION OVERVIEW", which names nothing the reader is looking at — and a
 * fourth figure-row heading that was a section label where the other three name a
 * subject would read as an oversight on the other three tabs.
 *
 * **Kept, and rendered nowhere.** Two things settled it. All three card TITLES end in
 * "year on year", so the row stated the period four times; and the row's heading is a
 * 12px caps eyebrow on every tab now, which a line of body text beside it reads as a
 * subtitle to rather than as a qualifier of. One prop to restore.
 */
export const FIN_FIGURES_QUALIFIER = "Year-on-year growth";

/**
 * What a composed finance card's parts are shares OF, per metric.
 *
 * Keyed by id, for the reason `METRIC_NOTES` is: an id is the one field admin cannot
 * reach, so a subtitle cannot be detached from its own metric by an edit that looks
 * like a wording change.
 *
 * One entry. The other two composed cards state their own subtitle from the metric's
 * `indexBaseline`, which is admin-editable data saying the same kind of thing — see
 * `indexedNote`.
 */
export const FIN_LEADS: Record<string, string> = {
  "fin-cost-composition": "Share of total cost advantage",
};

/**
 * The one interpretive line on the tab, under the stacked bar it interprets.
 *
 * **It states what the chart's own leading segment already draws, which is normally the
 * reason a line gets cut.** It survives because the segment is 72% of a four-part split
 * and the reading a CFO takes from that — that the advantage is a talent story rather
 * than a property story — is the decision the section exists to inform. It is also the
 * composition's explicit ask.
 *
 * **Kept, and rendered nowhere — the survival argument above did not survive the
 * render.** It was a filled mint strip under the bar, which made the sentence the
 * loudest object on the tab; and what it says is what the bar's own leading segment
 * draws at 72% of the width with its figure beside its label. The peer view's rule is
 * the one that applies: cut the sentence where the evidence on screen makes it, keep it
 * exported where cutting costs a claim, and put the claim in front of ANSR. The reading
 * a CFO takes from a 72% segment is the one thing here that only words could carry, so
 * it is on the blocked list rather than deleted.
 *
 * It was **guarded on the drawing rather than trusted** — `fin-view.tsx` rendered it only
 * where the leading part was in fact the largest, so an edited split could not leave a
 * sentence the bar contradicted. Restoring the line means restoring that guard; the
 * residual coupling it could never cover is the WORD "salary", which is the leading
 * entry's own admin-editable label.
 */
export const FIN_DRIVERS_INSIGHT =
  "Talent (salary) is the biggest lever of cost advantage.";

/** The corner cell of the delivery-location table. What its row labels are. */
export const FIN_TABLE_ROW_HEADER = "Function";

/**
 * How an index states its base, in one place.
 *
 * `CardMeta` built this string inline and the composed finance cards need the same one
 * as a card SUBTITLE rather than as a foot note — an index base is the first thing a
 * reader needs and the last thing a card that puts it at the bottom gives them. Two
 * literals would let one be reworded alone.
 *
 * The baseline itself is verbatim admin-editable text and is never parsed. "Tier 1
 * cities = 100. Lower is cheaper." carries its own direction, which is why there is no
 * separate direction sentence beside it.
 */
export function indexedNote(baseline: string): string {
  return `Indexed: ${baseline}`;
}
