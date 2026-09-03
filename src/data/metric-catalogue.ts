/**
 * The Screen 2 catalogue, transcribed from docs/brief.md and populated from the
 * figures supplied 2026-08-27, revised 2026-08-28.
 *
 * This is a SEED. It is used when a dataset has no catalogue yet, and adopted
 * over an existing one only by `npm run data:import -- --reseed-metrics`. Once
 * admin has edited a metric, the dataset is the record; see scripts/import-seed.ts.
 *
 * **The four tabs are four VIEWS of one national picture, not four datasets.**
 * This is the thing the file's shape now enforces. The tool is not claiming that
 * operations leaders look at a different India from technology leaders; it is
 * putting in front of each of them the figures they are asked to justify. So a
 * metric that appears on more than one tab is authored ONCE, below, and spread
 * onto each tab with a different id — which makes "the numbers are the same in
 * every view" a property of the file rather than a thing to check by eye across
 * three definitions that drifted. Every shared figure is a technology-role figure,
 * and deliberately does not say so on the card: the visitor is being shown the
 * India engineering market through their own function's lens, and re-labelling
 * every number "for technology roles" would turn that into noise.
 *
 * Three further rules govern the values, and they are the reason some supplied
 * figures are not here.
 *
 * **No absolute money, ever.** The supplied data contained per-head dollar and
 * per-square-foot rupee figures. There is no currency format in the schema and a
 * currency-looking unit is refused, so those cannot be stored whether they are
 * real or illustrative. Cost is expressed as indices against a stated base, which
 * is what the brief asks for and what makes a figure publishable at all.
 *
 * **A range collapses to the end that understates India's advantage.** Several
 * figures arrived as ranges, and a breakdown slot holds one number. A tool whose
 * job is to earn a conversation cannot afford a figure a CIO's own team can beat
 * down. Each note records the full range.
 *
 * **Structure follows the data, not the other way round.** Where the supplied
 * split did not match the seeded parts, the shape was changed to match. Parts with
 * no figure behind them were removed rather than left empty, because an empty slot
 * keeps the whole metric off the public screen.
 */
import type { Metric } from "./schema";

/** Ordinal steps for the capability grid, weakest first. */
const CAPABILITY_SCALE = ["Developing", "Moderate", "Strong", "Very strong"] as const;

/**
 * The two ends of the first-hire range, as whole clauses.
 *
 * **They read on their own now, where they used to read only after their figure.** They
 * were "on an employer of record" and "hiring directly into your own entity" —
 * fragments, written to be prefixed with the endpoint value by `RangeBar`. The HR tab
 * draws this metric as a benchmark whose figures sit on the rail itself, so a fragment
 * beneath it had nothing to attach to, and repeating "7 days" 20px under the 7 already
 * on the mark is the duplication this project removes everywhere else. `RangeBar` drops
 * the prefix to match, so the operations tab reads the same way.
 *
 * **Shortened at ANSR's request, and they still read on their own.** They were
 * "Hiring through an employer of record" and "Hiring directly into your own entity".
 * What the shorter pair had to keep is the fact that these name an OPERATING MODEL
 * rather than a function or a seniority — "Through …" carries that, and it is the
 * distinction the metric exists to draw, since the operations tab used to show an
 * unlabelled 42–70 and hid the fastest route entirely.
 */
const FIRST_HIRE_EOR = "Through EOR model";
const FIRST_HIRE_DIRECT = "Through own entity";

/* ==========================================================================
   Shared metrics — authored once, shown on more than one tab

   A metric's `id` and `functionArea` are what place it on a tab; everything else
   is what it SAYS. Splitting the two apart is what makes a shared figure
   impossible to fork: there is one set of numbers, one title and one note, and
   `onTab` only decides where it appears.
   ========================================================================== */

type SharedMetric = Omit<Metric, "id" | "functionArea">;

function onTab(
  base: SharedMetric,
  id: string,
  functionArea: Metric["functionArea"],
): Metric {
  return { ...structuredClone(base), id, functionArea };
}

/**
 * Bench strength. The national technology workforce, on every tab that has it.
 *
 * Not "technology bench strength", and not split per function: there is no
 * separate operations or HR talent claim being made here, and there never was.
 * The figure a COO or a CHRO needs from this screen is how many people India can
 * staff a centre from, which is the same figure a CTO needs.
 */
const BENCH_STRENGTH: SharedMetric = {
  lens: "supply",
  title: "Technology professionals",
  question: "How many people with the skills we need are available today?",
  unit: "professionals",
  format: "number",
  atLeast: true,
  note:
    "The national technology workforce, which is what 'available today' means for someone hiring. For context, 2.36M work in India GCCs and 1.4M of those are in technology roles — proof of adoption rather than available supply. A floor, hence atLeast.",
  structure: { kind: "scalar" },
  value: { kind: "scalar", value: 8_700_000 },
  gated: false,
};

/**
 * Graduate output, every discipline in one list.
 *
 * Previously three different metrics — engineering and science on the technology
 * tab, commerce and management on operations, HR postgraduates on HR — which
 * implied each function only draws from its own stream. It does not: the same
 * annual output is what every function recruits against, and a COO reading only
 * the commerce line was being shown a smaller India than exists. The parts are
 * disjoint, so they can sit in one list.
 */
const GRADUATE_OUTPUT: SharedMetric = {
  lens: "supply",
  title: "Graduate output by discipline",
  question: "Will the talent pool still be deep enough tomorrow, as we grow?",
  unit: "graduates a year",
  format: "number",
  note:
    "Roughly 2.55M STEM graduates a year against roughly 4.5M general graduates. The parts are disjoint. Human resources is postgraduate output from MBA and MSW programmes, which is why it is an order of magnitude below the rest.",
  structure: {
    kind: "breakdown",
    entries: [
      "Engineering, other disciplines",
      "Computer science and IT",
      "Electronics and communication",
      "Mathematics and statistics",
      "Commerce",
      "Management and MBA",
      "Finance and accounting",
      "Human resources",
    ],
  },
  value: {
    kind: "breakdown",
    values: [
      1_500_000,
      300_000,
      250_000,
      200_000,
      600_000,
      450_000,
      250_000,
      45_000,
    ],
  },
  gated: false,
};

/**
 * Leadership depth. One figure, and the unit carries the definition.
 *
 * It used to be two different things: a count of technology leaders who had run
 * 100+ engineer teams, and an HR split by "built from zero" against "scaled past
 * 1,000". Both were narrower claims than the question a CIO is actually asking,
 * which is whether there is a senior layer here at all. So it is the size of that
 * layer, on both tabs, and the same number.
 */
const LEADERSHIP_DEPTH: SharedMetric = {
  lens: "supply",
  /* **"of experience" restored at ANSR's request, on BOTH tabs by construction.** It is
     a shared metric, so the one edit here covers the technology and HR cards and they
     cannot drift apart. The title now matches `unit` word for word, which is harmless:
     the tabs that draw this draw it as a figure-row cell, where the title is the cell's
     only line and the unit is never rendered separately. */
  title: "Professionals with 10+ years of experience",
  question: "Is there a senior layer here we could hire our leadership from?",
  unit: "professionals with 10+ years of experience",
  format: "number",
  note:
    "The size of the experienced layer, not a count of people who have run a specific team size — the narrower claims that used to sit here were not answerable from the supplied data. Separately, 400+ India-based leaders hold global mandates, which is a different claim and has no metric.",
  structure: { kind: "scalar" },
  value: { kind: "scalar", value: 800_000 },
  gated: false,
};

/**
 * Time to backfill. A technology role, and the card does not say so.
 *
 * Operations and HR each carried their own version with different numbers, which
 * read as a claim that an ops seat and an HR seat refill at different speeds. The
 * question both were really answering is how long a seat stays empty in the India
 * market, so there is one answer.
 */
const BACKFILL_TIME: SharedMetric = {
  lens: "supply",
  title: "Time to backfill a role",
  question: "When somebody leaves, how long does the seat stay empty?",
  unit: "days",
  format: "duration",
  note:
    "Mid-level 35–45 days, specialist 60–75. The wider span is stored so neither case is hidden. End labels are deliberately absent: naming them would re-introduce the per-function split this metric exists to collapse.",
  structure: { kind: "range" },
  value: { kind: "range", min: 35, max: 75 },
  gated: false,
};

/** Time to first hire. The two ends are operating models, not functions. */
const TIME_TO_FIRST_HIRE: SharedMetric = {
  lens: "speed",
  title: "Time to first hire",
  question: "How soon could somebody actually start work?",
  unit: "days",
  format: "duration",
  note:
    "A week on an employer of record, up to ten weeks hiring direct into your own entity. The split that matters is the operating model, which is why the ends are labelled with it — the operations tab used to carry an unlabelled 42–70 instead, which hid the fastest route entirely.",
  structure: {
    kind: "range",
    minLabel: FIRST_HIRE_EOR,
    maxLabel: FIRST_HIRE_DIRECT,
  },
  value: { kind: "range", min: 7, max: 70 },
  gated: false,
};

/**
 * The scale curve. One curve, four milestones, on every tab that shows it.
 *
 * **`progression` is what stops this being drawn as four unrelated bars**, which is
 * what it was: four tracks on one axis, sharing nothing, saying "here are four
 * separate quantities" about a single centre measured four times as it grows. The
 * flag is authored rather than derived for the reason recorded on the field in
 * `schema.ts` — the operations tab's latency breakdown has the same format and the
 * same rising values and is genuinely four destinations, so monotonicity cannot tell
 * them apart.
 *
 * The values stay cumulative elapsed months from the first hire, exactly as
 * supplied. The intervals a reader actually wants — six months to the first fifty,
 * six more to a hundred, twelve more to three hundred — are derived in
 * `screen2.ts`, so nothing here restates them and they cannot drift.
 */
const SCALE_MILESTONES: SharedMetric = {
  lens: "speed",
  title: "Time to reach each scale milestone",
  question: "Once the first team proves out, how quickly do centres here add the next hundred?",
  unit: "months, median",
  format: "duration",
  progression: true,
  note:
    "Months rather than days, as supplied — converting would invent precision. The 100 FTE milestone was given as 9–12 months and the 500 as 500–600 FTEs in 36; the conservative end of each is stored. The HR tab used to omit the 50 FTE step, which made the curve look slower off the line than it is.",
  structure: {
    kind: "breakdown",
    /**
     * **"50 FTEs" rather than "To 50 FTEs", and the milestone track is why.** The HR
     * tab draws this metric as four positions on one horizontal line, and at 1024 the
     * first two land 56px apart — "To 50 FTEs" does not fit between them, and "To" was
     * carrying nothing a reader needed: the card's own title already says "Time to
     * reach each scale milestone", so every entry began by repeating the title's own
     * preposition. It reads the same in `Journey`'s rows on the operations tab, where
     * the label is followed by its interval.
     */
    entries: ["50 FTEs", "100 FTEs", "300 FTEs", "500 FTEs"],
  },
  value: { kind: "breakdown", values: [6, 12, 24, 36] },
  gated: false,
};

/* ==========================================================================
   The catalogue
   ========================================================================== */

export const METRIC_CATALOGUE: readonly Metric[] = [
  /* ===================== Technology ===================== */
  onTab(BENCH_STRENGTH, "tech-bench-strength", "tech"),
  {
    id: "tech-manager-depth",
    functionArea: "tech",
    lens: "supply",
    /* "Manager-level and above" at ANSR's request. The hyphenated form reads as one
       seniority band rather than as a plural of people, which is what the figure is. */
    title: "Manager-level and above",
    question: "Is there a management layer here, or would every lead be an import?",
    unit: "professionals in manager and above roles",
    format: "number",
    atLeast: true,
    note: "A floor. Sits between bench strength and leadership depth as the middle of the pyramid.",
    structure: { kind: "scalar" },
    value: { kind: "scalar", value: 1_400_000 },
    gated: false,
  },
  onTab(LEADERSHIP_DEPTH, "tech-leadership-depth", "tech"),
  /**
   * The graduate pipeline, as the two parts of it a technology reader recruits from.
   *
   * **Not `GRADUATE_OUTPUT`, and this is the one place a tab deliberately shows less
   * than the shared metric.** The nine-discipline list is still the right card for
   * operations and HR, whose readers need the commerce, finance and HR streams. On
   * the technology tab it drew nine hairlines in one card, six of which a CTO does
   * not recruit against, and ANSR asked for the discipline split off this page. Both
   * figures below are the shared metric's own, unchanged, so the two cards cannot
   * disagree: 1.5M is its "Engineering, other disciplines" part and 450K is its
   * "Management and MBA graduates" part.
   *
   * **Two things it deliberately does not do, and both were asked for explicitly.**
   *
   * It does not AGGREGATE. Engineering, computer science and IT, and electronics and
   * communication are documented as disjoint, so 1.5M + 300K + 250K = 2.05M is
   * arithmetically available — and it is not authored here, because "an aggregate
   * engineering graduate figure" is a claim about what counts as engineering and that
   * is ANSR's to approve rather than ours to derive. So the stored figure is preserved
   * and the label says exactly what it measures, which is engineering disciplines
   * OTHER than the two counted separately.
   *
   * It does not NEST. 450K is the total management and MBA output, not the count of
   * MBA graduates who hold an engineering degree, and those are different statements.
   * Drawing the smaller block inside the larger would assert an overlap the source
   * never states, so the two are drawn adjacent — see `subset` in `schema.ts`, which
   * is the field that makes that a decision rather than a side effect of both parts
   * being measured in graduates. There is deliberately no overlap percentage anywhere:
   * no verified figure supports one.
   */
  {
    id: "tech-graduate-pipeline",
    functionArea: "tech",
    lens: "supply",
    /* Renamed in admin and published, so the catalogue follows the datum rather than
       the other way round — left behind, a `--reseed-metrics` would silently undo it.
       "Graduate pipeline for technology" at ANSR's request, in sentence case: it was the
       one title on the tab in Title Case, which read as a proper noun for a product. */
    title: "Graduate pipeline for technology",
    question: "Will the talent pool still be deep enough tomorrow, as we grow?",
    unit: "graduates a year",
    format: "number",
    note:
      "Both figures are GRADUATE_OUTPUT's own parts, unchanged. Deliberately NOT aggregated with computer science and IT (300K) or electronics and communication (250K): those are counted separately in the shared metric and an aggregate engineering total needs ANSR's approval of what counts as engineering. Deliberately NOT nested: 450K is total management and MBA output, not MBA graduates with an engineering background, so no containment and no overlap percentage. The full nine-discipline split is still on the operations and HR tabs.",
    structure: {
      kind: "breakdown",
      entries: ["Engineering, other disciplines", "Management & MBA graduates"],
    },
    value: { kind: "breakdown", values: [1_500_000, 450_000] },
    gated: false,
  },
  {
    id: "tech-ecosystem-size",
    functionArea: "tech",
    lens: "supply",
    /* Renamed in admin and published; the catalogue follows the datum. See the
       `tech-graduate-pipeline` note above for why leaving it behind is not neutral. */
    title: "Talent Depth by Specialisation",
    question: "Is the depth spread across the specialisms we need, or concentrated in one?",
    unit: "professionals",
    format: "number",
    atLeast: true,
    note:
      "Specialisms overlap, so these do not sum to the bench strength figure. Every part is a floor. Quality engineering was a seeded part with no figure behind it and was removed.",
    structure: {
      kind: "breakdown",
      entries: [
        "Full-stack and product engineering",
        "Data engineering and analytics",
        "Embedded and ER&D",
        "SRE and DevOps",
        "Cloud",
        "AI and machine learning",
        "Cybersecurity",
      ],
    },
    value: {
      kind: "breakdown",
      values: [1_700_000, 1_500_000, 1_400_000, 1_300_000, 1_200_000, 1_200_000, 150_000],
    },
    gated: false,
  },
  {
    id: "tech-gcc-scale-count",
    functionArea: "tech",
    lens: "supply",
    /* **A sentence predicate, at ANSR's request, and the card it draws is why it works.**
       This metric is a bare scalar, so it lands in the tab's figure ROW rather than in a
       card — and there the title is the one line under the figure, so "1,250" above
       "GCCs have tech teams of 100+ FTEs" reads as a whole sentence. "GCCs above 100 tech
       FTEs" was a noun phrase naming the measure instead. */
    title: "GCCs have tech teams of 100+ FTEs",
    question: "How many centres have already grown past the size we are aiming for?",
    unit: "GCCs",
    format: "number",
    note:
      "Roughly 60% of 2,117 centres. About 450 are above 1,000 FTEs, which the metric definition does not cover.",
    structure: { kind: "scalar" },
    value: { kind: "scalar", value: 1_250 },
    gated: false,
  },
  {
    id: "tech-open-source-signal",
    functionArea: "tech",
    lens: "supply",
    title: "Developers on GitHub",
    question: "Are engineers here building in the open, or only inside their employers?",
    unit: "developers on GitHub",
    format: "number",
    note:
      "Second largest developer population globally, around 13% of global public contributions, with roughly 2.9M new accounts a year. GitLab and Kaggle were seeded parts with no figures and were removed, which makes this a single figure rather than a split.",
    structure: { kind: "scalar" },
    value: { kind: "scalar", value: 17_000_000 },
    gated: false,
  },
  /**
   * **`tech-community-events` was here and is deleted at ANSR's request.** Two parts
   * — about 1,400 active technical meetup groups and about 120 major conferences a
   * year — counted across the top eight cities.
   *
   * Deleted rather than gated or emptied, which is the same distinction
   * `hr-workforce-diversity` was removed under: a gated card says a figure exists and
   * is being held, an empty definition is one an admin can half-fill into a live
   * card, and this metric is out of scope rather than either. The figures are in git;
   * restoring it is a catalogue entry plus a dataset edit.
   *
   * It is also the metric the shared-unit containment heuristic was wrong about — it
   * declared no unit precisely because a conference is not a kind of meetup group —
   * so the reasoning behind `subset` outlived the case that motivated it. Do not
   * fold either figure into the technology figure row: ANSR asked for the meetup
   * count off this page, not moved up it.
   */
  {
    id: "tech-capability-comparison",
    functionArea: "tech",
    lens: "supply",
    title: "Capability against other GCC hubs",
    question:
      "Where does India lead the alternatives we are also considering, and where is it merely level?",
    format: "rating",
    ratingScale: [...CAPABILITY_SCALE],
    note:
      "India, Poland and the Philippines are the worked example in docs/brief.md. Vietnam is rated illustratively — the brief names it as a comparator but never rates it, and the supplied comparison was prose about headcount scale rather than capability. Vietnam reads as emerging: competitive on product engineering, thinner on AI and security. Replace with a real assessment before this ships.",
    structure: {
      kind: "matrix",
      rows: [
        "Product engineering",
        "Data and AI",
        "Cloud and platform",
        "Cybersecurity",
        "Enterprise technology",
      ],
      columns: ["India", "Poland", "Philippines", "Vietnam"],
    },
    value: {
      kind: "matrix",
      cells: [
        ["Very strong", "Strong", "Developing", "Moderate"],
        ["Very strong", "Strong", "Developing", "Developing"],
        ["Very strong", "Strong", "Moderate", "Moderate"],
        ["Strong", "Strong", "Moderate", "Developing"],
        ["Very strong", "Strong", "Strong", "Moderate"],
      ],
    },
    gated: false,
  },

  /* ===================== Operations ===================== */
  onTab(BENCH_STRENGTH, "ops-bench-strength", "operations"),
  onTab(GRADUATE_OUTPUT, "ops-graduate-output", "operations"),
  onTab(BACKFILL_TIME, "ops-backfill-time", "operations"),
  onTab(TIME_TO_FIRST_HIRE, "ops-time-to-first-hire", "operations"),
  onTab(SCALE_MILESTONES, "ops-scale-milestones", "operations"),
  {
    id: "ops-grade-a-office-stock",
    functionArea: "operations",
    lens: "supply",
    /* **The unit has left the title and now sits beside the figure**, at ANSR's request:
       "854 mn sq ft" over "Grade A stock in top 7 cities". The title had been carrying it
       because a figure-row cell is one line and there was nowhere else for it to go; the
       cell takes an explicit `unit` now, so the title states the scope alone. The scope
       must stay in it — this cell lifts the leading PART of a two-part breakdown, so
       without "in top 7 cities" the figure would read as national stock. */
    title: "Grade A stock in top 7 cities",
    question: "Is there space we could move into at the quality our people expect?",
    /* **"mn sq ft", not "million sq ft", because this string is now DRAWN beside the
       figure** rather than read as prose in an axis note. At two scale steps under a 48px
       numeral, "million sq ft" is wider than the numeral it qualifies and overruns a
       fifth of the figure row; the abbreviation is what fits the cell. Still one authored
       string and still admin-editable — the renderer abbreviates nothing. */
    unit: "mn sq ft",
    format: "number",
    /**
     * The one real containment in the catalogue, and now it is authored.
     *
     * Vacant stock is part of total stock, so "132 of the 854" is the relationship and
     * the smaller bar belongs inside the larger. It used to be INFERRED from the two
     * parts sharing a unit, which is a precondition for containment rather than
     * evidence of it — the technology tab's graduate pair is two disjoint populations
     * measured in the same unit, and the heuristic would have nested them.
     */
    subset: true,
    note:
      "Both figures rather than a choice between them: total stock answers whether the market is deep, and vacant answers whether we could move in now. Across the top seven cities at 15.5% vacancy; Bengaluru alone holds 241 msf of the total. `subset` is authored because vacant stock is genuinely part of total stock — the shared unit alone never established that.",
    structure: {
      kind: "breakdown",
      entries: ["Total Grade A stock, top seven cities", "Vacant and available now"],
    },
    value: { kind: "breakdown", values: [854, 132] },
    gated: false,
  },
  {
    id: "ops-power-uptime",
    functionArea: "operations",
    lens: "place",
    title: "Uptime at a Grade A campus",
    question: "Can we run a shift here without planning around outages?",
    format: "percent",
    note:
      "Split because the campus figure and the grid figure answer different worries, and a single number would hide the weaker one.",
    structure: {
      kind: "breakdown",
      entries: ["At a Grade A campus with N+1 backup", "Tier 1 city grid"],
    },
    value: { kind: "breakdown", values: [99.95, 99.5] },
    gated: false,
  },
  {
    id: "ops-network-latency",
    functionArea: "operations",
    lens: "place",
    title: "Network latency to cloud regions",
    question: "Will our teams be working at the same responsiveness as the rest of the business?",
    unit: "milliseconds",
    format: "duration",
    /**
     * **Seven destinations, up from four, at ANSR's request** — and the three that were
     * added are the reason to read the note before touching this metric.
     *
     * The set is ordered OUTWARD BY DISTANCE, not by value, which is what makes it a
     * geography rather than a ranking. That order is also what keeps `selfLabelling`
     * false, so the bars keep the grey track that is their shared axis; a set sorted by
     * its own quantity would drop it. The two happen to coincide here because latency
     * rises with distance, and the day one of them does not, the ORDER is the contract.
     *
     * **Three of the seven are PROVISIONAL and the note names them.** Same-city, another
     * India region, Europe and US East are the supplied figures, unchanged. Middle East,
     * Singapore and US West are typical published round-trip times for the same routes,
     * added so the card covers the regions a global business actually runs in — and they
     * are marked rather than blended in, for the reason every provisional figure in this
     * catalogue is: a number promoted from estimate to measurement should read as a change
     * to a list somebody has to explain.
     */
    note:
      "Upper end of each supplied range, so nothing reads better than it is: 2–8 ms intra-city to the Mumbai, Hyderabad and Chennai regions, 25–40 ms inter-city. PROVISIONAL: Middle East, Singapore and US West are typical published round-trip times for those routes rather than supplied figures, added at ANSR's request to cover the regions a global business runs in — confirm all three before this ships. Singapore was previously a seeded part with no figure at all and was removed; it is back with a provisional one. Ordered outward by distance, never by value.",
    structure: {
      kind: "breakdown",
      entries: [
        "Same-city cloud region",
        "Another India region",
        "Middle East",
        "Singapore",
        "Europe",
        "US East",
        "US West",
      ],
    },
    value: { kind: "breakdown", values: [8, 40, 50, 70, 110, 180, 230] },
    gated: false,
  },
  {
    id: "ops-disruption-days",
    functionArea: "operations",
    lens: "place",
    title: "Working days lost a year, by city",
    question: "How many working days a year does the city actually lose?",
    unit: "days a year",
    format: "duration",
    note:
      "By city, as supplied, rather than by cause — the seeded split of power, flooding and transit had no figures behind it. Monsoon, civic strikes and extreme weather together account for 3–6 days nationally.",
    structure: {
      kind: "breakdown",
      entries: ["Bengaluru", "Hyderabad", "Pune", "Chennai"],
    },
    value: { kind: "breakdown", values: [4, 2, 3, 6] },
    gated: false,
  },

  /* ===================== HR ===================== */
  onTab(BENCH_STRENGTH, "hr-bench-strength", "hr"),
  onTab(LEADERSHIP_DEPTH, "hr-leadership-depth", "hr"),
  /**
   * **`hr-graduate-output` is BACK, at ANSR's request**, taking HR from nine metrics to
   * ten. It was removed for a pass on the argument that a nine-way disciplinary split is
   * a claim about national graduate supply while the decision on this page is about
   * hiring an India team — reach, speed to fill a seat, speed to scale, and what the same
   * person costs next year.
   *
   * That argument is overruled rather than disproved: an HR leader sizing a centre is
   * also the reader who has to say where next year's intake comes from, and this metric's
   * commerce, finance and human-resources streams are the ones a CHRO recruits against
   * and the technology tab deliberately does not show.
   *
   * **Restoring it was one line, which is the whole reason it stayed a shared metric.**
   * `GRADUATE_OUTPUT` is untouched, so nothing about the figure moved and nothing forked
   * — operations and HR now draw one definition through one component, `GraduateOutput`
   * in `screen2/graduate-card.tsx`. Two of its parts are still quoted verbatim by
   * `tech-graduate-pipeline`, which is the one tab that shows less than the shared metric.
   */
  onTab(GRADUATE_OUTPUT, "hr-graduate-output", "hr"),
  onTab(BACKFILL_TIME, "hr-backfill-time", "hr"),
  onTab(TIME_TO_FIRST_HIRE, "hr-time-to-first-hire", "hr"),
  onTab(SCALE_MILESTONES, "hr-scale-milestones", "hr"),
  /**
   * **`hr-workforce-diversity` was here and is removed at ANSR's request.** It held
   * three percentages — women across India GCCs, women in technology roles, women in
   * engineering degree enrolment — under the title "Workforce diversity".
   *
   * It is DELETED rather than gated or emptied, which are the two things that look
   * like the same act and are not: a gated metric draws a sealed card claiming a
   * figure exists and is being held, and an empty one leaves a definition an admin
   * can half-fill into a live card. Neither is true here — the metric is out of
   * scope, not withheld.
   *
   * What it cost: it was the only home for the brief's Optional diversity block,
   * which `project.md` recorded as collapsing into the supply lens. That claim is
   * corrected there rather than annotated here. The figures themselves are in git.
   */
  {
    id: "hr-offer-acceptance",
    functionArea: "hr",
    lens: "speed",
    title: "Offer acceptance rate",
    question: "When we make an offer here, does it get taken?",
    format: "percent",
    note:
      "One national figure. It was a four-city split, which invited a city comparison this screen is not making and cannot support — the visitor has not chosen a city at this point, and picking one for them reads as a recommendation. The supplied city ranges were Bengaluru 62–68, Hyderabad 72–78, Pune 75–82, Chennai 78–85, and offer dropout runs 10–28% depending on the city.",
    structure: { kind: "scalar" },
    value: { kind: "scalar", value: 72 },
    gated: false,
  },
  {
    id: "hr-salary-growth",
    functionArea: "hr",
    lens: "cost",
    /**
     * **Retitled to name the finding, with the quantity moved into the unit.** It was
     * "Base salary growth year on year", which names the measurement and leaves the
     * reader to work out what the ranking is for. The figures answer a question —
     * which skills are repricing fastest — and the title says it now, with the
     * measurement directly under it as the unit, which is the field that names what
     * every figure counts. Nothing else about the metric moved.
     *
     * **The entries are in DESCENDING order and the supplied values are untouched.** The
     * order is authored rather than sorted at render — `RankedBars` never re-sorts, and
     * `project.md`'s rule is that a catalogue order is meaningful — so putting the
     * scarce skills first is a decision recorded here. It has one derived consequence
     * worth knowing: `nonIncreasing` now holds, so the set is self-labelling and the
     * bars drop their grey track. Row one is full width and carries its own figure,
     * which is what states the axis.
     *
     * **Three specialism rows — "Software Development (SDE)", "Product Management" and
     * "DevOps / Platform Engineering" — were added at the project owner's instruction with
     * supplied figures.** They replaced an earlier "Data engineering" placeholder, and they
     * replaced the comparator SENTENCE that used to sit under the chart: the sentence was
     * closing the height gap with the scale-milestones card beside it as much as naming the
     * comparator, and real specialism rows do the first job with data rather than editorial
     * copy.
     *
     * **Product Management (14.5) is IN, on the project owner's call.** It was briefly left
     * out on a reading that seven rows sat level with the two-rail scale-milestones card
     * and an eighth overshot; the project owner judged the seven-row card asymmetrical
     * against that neighbour, so all three supplied rows stay and the ranking is eight
     * rows. Each supplied range was read at the end that UNDERSTATES India's advantage — a
     * higher growth rate is the less favourable reading of a cost — so "~14–15%" is 15 and
     * "~13–14%" is 14.
     *
     * **"(reference)" is OFF the comparator's label at ANSR's request, and the comparator
     * is now named by its own label.** The "All roles" row is drawn in the action orange —
     * the one warm mark on a ranking of teal bars — and a colour may never be the only
     * carrier of a distinction on these screens, so something in TEXT has to say that row
     * is not another specialism. The words "All roles" are self-descriptive as the all-up
     * baseline, so the label itself is that text carrier; the parenthetical that used to
     * do it, and the sentence that briefly replaced it, are both gone.
     *
     * **"Non-ER&D roles" is "Roles outside engineering R&D".** Same population, and the
     * acronym was the last piece of internal vocabulary on the card. A CHRO reading a
     * salary ranking should not have to expand ER&D to find out which of the two floor
     * rows applies to them.
     *
     * The two renamed entries have one consequence worth knowing: `SALARY_TONES` in
     * `hr-view.tsx` is keyed by these labels, and it moved with them.
     */
    title: "Where salary pressure is strongest",
    // "Base pay", not "Base salary" — the title one line above already says salary, and
    // the unit's job is to say WHICH pay figure and over what period.
    unit: "Base pay growth, year on year",
    question: "How fast is the cost of the same person rising?",
    format: "percent",
    note:
      "Split by specialism because a single average hides the scarce skills. Ordered descending so the ranking states its own axis in row one. 'All roles' is the comparator in the action orange; its self-descriptive label carries that distinction — never colour alone. SDE (15), Product Management (14.5) and DevOps / Platform Engineering (14) were supplied by the project owner, giving eight rows. 'Non-ER&D roles' is now 'Roles outside engineering R&D'.",
    structure: {
      kind: "breakdown",
      entries: [
        "AI and machine learning",
        "Cybersecurity",
        "Cloud",
        "Software Development (SDE)",
        "Product Management",
        "DevOps / Platform Engineering",
        "All roles",
        "Roles outside engineering R&D",
      ],
    },
    value: { kind: "breakdown", values: [21.1, 20, 16.1, 15, 14.5, 14, 9.8, 7.5] },
    gated: false,
  },
  {
    id: "hr-cost-per-employee-served",
    functionArea: "hr",
    lens: "cost",
    /**
     * **Shortened to "HR support ratio", because the rest of it was the unit.** The
     * title was "HR support ratio per employee served", and "per employee served" is
     * exactly what `unit` says one line down — on a sealed card, where the title is
     * one of only three fields the gate lets across, spending half of it on the unit
     * is the whole card saying less. The unit is dropped by the gate, so the shorter
     * title is what a visitor reads; the longer one was never adding the words the
     * reader needed.
     */
    title: "HR support ratio",
    question:
      "How many employees does each HR person support once the centre is running, against while it is still being built?",
    unit: "employees per HR person",
    format: "number",
    note:
      "Retitled from 'HR cost per employee served', then shortened from 'HR support ratio per employee served' — the trailing clause duplicated the unit. The supplied cost figure was an absolute annual amount per employee, which this schema cannot hold and the brief forbids showing; the staffing ratio is the part of the brief's own definition that survives. To restore the cost view, supply it as an index against the sending country.",
    structure: {
      kind: "breakdown",
      entries: ["Once running at scale", "During the build phase"],
    },
    value: { kind: "breakdown", values: [120, 60] },
    gated: true,
  },
  {
    id: "hr-fully-loaded-cost",
    functionArea: "hr",
    lens: "cost",
    title: "Fully loaded cost by role family and level",
    question:
      "How does the all-in cost of a role compare with the same role in the sending country, once statutory contributions, facilities, IT and HR support are counted?",
    format: "index",
    indexBaseline: "Same role in the sending country = 100",
    note:
      "Indices only, never amounts — the supplied figures were absolute annual costs per role, which cannot be stored here and which the brief forbids showing in any lens. These cells are illustrative and carry the shape the real data must take: cheapest at the junior end, and the advantage narrowing steadily with seniority, because leadership is the scarce thing everywhere. Loading is roughly 1.35 times base, which is already inside these numbers rather than stated separately.",
    structure: {
      kind: "matrix",
      rows: [
        "Engineering",
        "Operations",
        "Finance",
        "Human resources",
        "Leadership",
      ],
      columns: ["Analyst", "Specialist", "Manager", "Senior manager", "Director"],
    },
    value: {
      kind: "matrix",
      cells: [
        [22, 26, 31, 38, 46],
        [18, 21, 26, 32, 40],
        [20, 24, 29, 35, 43],
        [19, 22, 27, 33, 41],
        [24, 28, 35, 44, 55],
      ],
    },
    gated: true,
  },

  /* ===================== Finance ===================== */
  {
    id: "fin-cost-growth",
    functionArea: "finance",
    lens: "cost",
    /* "Salary growth in India, YoY" at ANSR's request. All three finance growth titles
       were reworded together to "YoY" — they draw as three cells of one figure row, so
       the abbreviation is what keeps the three labels one line each at 3 columns, and a
       row where one cell spells out what its neighbours abbreviate reads as three
       different measures. "Salary" rather than "wage" is ANSR's own vocabulary. */
    title: "Salary growth in India, YoY",
    question: "Is the cost of the same person here rising faster than we can plan for?",
    format: "percent",
    note:
      "India only. It used to sit beside US and UK wage growth and a 'the advantage narrowing' line, which turned one readable number into a three-way comparison a finance leader has to reconcile — and the narrowing figure was a derived opinion rather than a measurement. The gap is still 55–65% and is held to be durable to around 2032; that belongs in the conversation, not on a bar.",
    structure: { kind: "scalar" },
    value: { kind: "scalar", value: 9.8 },
    gated: false,
  },
  /**
   * The other two thirds of the brief's "cost advantage durability".
   *
   * `docs/brief.md` asks for historical movement in cost terms, **split three ways:
   * compensation, operating cost, workplace**. Only the compensation third was ever
   * built — that is `fin-cost-growth` above. These are the missing two, added at
   * ANSR's request, and three scalars is the right shape rather than one three-part
   * breakdown: the three measure different things against different bases, and as
   * three thirds they fill a row exactly where a lone scalar leaves finance opening
   * on the part-empty row `metricWidth` exists to prevent.
   *
   * **BOTH FIGURES ARE PLACEHOLDERS AT 10%, ON THE PROJECT OWNER'S INSTRUCTION, SO THE
   * CARDS CAN BE DEMONSTRATED.** No real figure for either has been supplied — not in
   * the brief, not in the 2026-08-27 data, not in ANSR's later revisions — so 10 is a
   * round number chosen to be obviously provisional rather than an estimate derived
   * from anything. It is the same footing as the three cells already filled from
   * judgement (Vietnam's capability column, `hr-fully-loaded-cost`'s grid, and the depth
   * row in `fin-cost-vs-ecosystem-depth`), and it is tracked the same way: flagged
   * `PLACEHOLDER` in the note here, asserted by a unit test, and on `handoff.md`'s
   * blocked list until replaced.
   *
   * **They are trivially replaceable and no developer is needed.** A figure is admin
   * data, so both are edited under Metrics → Finance and land on the next publish. What
   * needed a code change was the DEFINITION — admin can fill a metric and cannot create
   * one — and that is what this block is.
   *
   * The one thing to keep true: neither figure may be quietly promoted from placeholder
   * to fact by deleting the marker. Replace the number and the marker together.
   */
  {
    id: "fin-operating-cost-growth",
    functionArea: "finance",
    lens: "cost",
    title: "Increase in operating costs, YoY",
    question:
      "Is the cost of running the centre — utilities, transport, facilities management, local support — rising faster than the wage bill?",
    format: "percent",
    // A `note` is capped at 600 characters by the schema, so anything longer than a
    // sentence or two of provenance belongs in the block comment above rather than here.
    note:
      "PLACEHOLDER at 10% — a demo figure, not a measurement. The operating-cost third of the brief's cost-durability metric; the compensation third is fin-cost-growth at 9.8%. Nothing supplied covers this one: the tier spread is a LEVEL difference between tier 1 and tier 2 rather than a movement over time, and no year-on-year operating figure exists in the supplied data. Deliberately not derived from the wage figure — the two move on different drivers, which is why the brief asks for them separately. Replace with a real rate before publication.",
    structure: { kind: "scalar" },
    value: { kind: "scalar", value: 10 },
    gated: false,
  },
  {
    id: "fin-workplace-cost-growth",
    functionArea: "finance",
    lens: "cost",
    title: "Increase in workplace costs, YoY",
    question:
      "Is the cost of the space itself rising, and by enough to change a five-year plan?",
    format: "percent",
    note:
      "PLACEHOLDER at 10% — a demo figure, not a measurement. The workplace third of the brief's cost-durability metric. The nearest supplied figures are a 15.5% vacancy rate across the top seven cities and the Bengaluru sub-market rent card behind fin-workplace-cost-gradient — both a position at one moment, neither a rate of change, and a gradient across sub-markets is not a movement over time. Rent growth is the figure to ask for, national or Bengaluru, stated as a percentage. Replace before publication.",
    structure: { kind: "scalar" },
    value: { kind: "scalar", value: 10 },
    gated: false,
  },
  {
    id: "fin-cost-composition",
    functionArea: "finance",
    lens: "cost",
    title: "What drives the cost advantage",
    question: "Where does the saving actually come from?",
    format: "percent",
    note: "A directional split, and these four sum to a whole.",
    structure: {
      kind: "breakdown",
      entries: [
        "Salary differential",
        "Real estate and facilities",
        "Statutory and benefits differential",
        "Scale and span-of-control efficiency",
      ],
    },
    value: { kind: "breakdown", values: [72, 12, 8, 8] },
    gated: false,
  },
  {
    id: "fin-tier-cost-spread",
    functionArea: "finance",
    lens: "cost",
    title: "Tier 1 and tier 2 operating cost spread",
    question: "What would we save by going beyond the established hubs?",
    format: "index",
    // The DIRECTION belongs here rather than in the component, because the author
    // of a metric is the only one who knows it. `format: "index"` says nothing
    // about whether up is good, and a chart that guessed would eventually put an
    // arrow on the wrong end of a real number.
    // "Tier 1", matching the column it names. The longer "Tier 1 cities" was kept here for
    // one pass as the place the full phrase survived; ANSR asked for the short form
    // everywhere, and a subtitle naming the base differently from the label on the base's
    // own mark is two names for one thing on one card.
    indexBaseline: "Tier 1 = 100. Lower is cheaper.",
    note:
      "Indices, not amounts. Conservative end of each supplied range: all-in 25–35% below, compensation 15–22% lower, rent roughly half. Attrition also runs 4–6 points lower in tier 2, which is not a cost and has no slot here.",
    structure: {
      kind: "matrix",
      rows: ["All-in operating cost", "Compensation", "Office space"],
      // **"Tier 1" and "Tier 2", not "Tier 1 cities", at ANSR's request.** The names are
      // drawn above their own marks on the rail now rather than above a display figure,
      // and two marks on this metric sit as little as 15% of the rail apart — so the
      // shorter string is what stops the two labels colliding. Shortened HERE and never in
      // the component: a column name is admin-editable, and `project.md` bans a renderer
      // that parses one. `indexBaseline` above uses the same short form, so the card names
      // its base once; the metric's own title is where "tier 2" is spelled out.
      columns: ["Tier 1", "Tier 2"],
    },
    value: {
      kind: "matrix",
      cells: [
        [100, 75],
        [100, 85],
        [100, 81],
      ],
    },
    gated: false,
  },
  {
    id: "fin-india-vs-hubs",
    functionArea: "finance",
    lens: "cost",
    title: "Cost against other GCC hubs",
    question: "For the same work, how does India sit against the alternatives?",
    format: "index",
    indexBaseline: "India = 100. Higher is more expensive.",
    note:
      "By umbrella function rather than by role. The single 'Senior engineer' row was derived from the one comparison the source supplied, and one engineering row cannot answer the question a finance leader is actually asking — which is what the whole centre costs, function by function. The technology row is that original derivation; the other three carry the same shape and are illustrative until real per-function comparisons are supplied. Separately, India runs about 2.1 heads for every one US head. Vietnam was a seeded column with no figure and was removed.",
    structure: {
      kind: "matrix",
      rows: ["Technology", "Operations", "Human resources", "Finance"],
      columns: ["India", "Philippines", "Mexico", "Poland", "United States"],
    },
    value: {
      kind: "matrix",
      cells: [
        [100, 122, 167, 189, 367],
        [100, 115, 148, 171, 312],
        [100, 118, 152, 176, 328],
        [100, 120, 158, 182, 340],
      ],
    },
    gated: false,
  },
  {
    id: "fin-cost-vs-ecosystem-depth",
    functionArea: "finance",
    lens: "cost",
    title: "Cost position against ecosystem depth",
    question:
      "Does a cheaper city still carry the talent depth, peer presence, infrastructure and room to scale to execute there?",
    format: "index",
    indexBaseline: "Bengaluru = 100",
    note:
      "By city rather than by tier, as supplied. Both rows are indexed on Bengaluru so they can be read against each other, which is the whole point: tier 2 is 30–35% cheaper but thin above 300 FTEs, so cost falls faster than depth. Pune and tier 2 depth are described only qualitatively in the source and are filled illustratively here.",
    structure: {
      kind: "matrix",
      rows: ["Cost position", "GCC units present"],
      columns: ["Bengaluru", "Hyderabad", "Pune", "Tier 2 cities"],
    },
    value: {
      kind: "matrix",
      cells: [
        [100, 85, 80, 70],
        [100, 47, 33, 12],
      ],
    },
    gated: true,
  },
  {
    id: "fin-workplace-cost-gradient",
    functionArea: "finance",
    lens: "cost",
    title: "Workplace cost gradient",
    question: "How much does the workplace cost change as we move out from the centre?",
    format: "index",
    indexBaseline: "Central business district = 100",
    note:
      "Indexed from the Bengaluru sub-market rent card, so no per-square-foot amount is stored anywhere. The fall from centre to periphery is roughly 60%.",
    structure: {
      kind: "breakdown",
      entries: [
        "Central business district",
        "Secondary business district",
        "Outer ring road",
        "Suburban technology park",
        "Peripheral campus",
      ],
    },
    value: { kind: "breakdown", values: [100, 93, 70, 45, 37] },
    gated: true,
  },
];

/**
 * A fresh copy, so a caller mutating the result cannot corrupt the seed.
 *
 * Nothing is stamped on the way out. There used to be a `SAMPLE_PROVENANCE`
 * default in `asOf` — "Sample, not for publication" — which rendered beside every
 * figure on Screen 2 as a caveat. It is gone: `asOf` is now only ever a real
 * provenance string an admin has typed, and an empty one renders nothing.
 */
export function seedMetricCatalogue(): Metric[] {
  return structuredClone(METRIC_CATALOGUE) as Metric[];
}
