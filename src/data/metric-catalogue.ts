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

const FIRST_HIRE_EOR = "on an employer of record";
const FIRST_HIRE_DIRECT = "hiring directly into your own entity";

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
  title: "Bench strength",
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
      "Other sciences",
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
      350_000,
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
  title: "Leadership depth",
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

/** The scale curve. One curve, four milestones, on every tab that shows it. */
const SCALE_MILESTONES: SharedMetric = {
  lens: "speed",
  title: "Time to reach each scale milestone",
  question: "Once the first team proves out, how quickly do centres here add the next hundred?",
  unit: "months, median",
  format: "duration",
  note:
    "Months rather than days, as supplied — converting would invent precision. The 100 FTE milestone was given as 9–12 months and the 500 as 500–600 FTEs in 36; the conservative end of each is stored. The HR tab used to omit the 50 FTE step, which made the curve look slower off the line than it is.",
  structure: {
    kind: "breakdown",
    entries: ["To 50 FTEs", "To 100 FTEs", "To 300 FTEs", "To 500 FTEs"],
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
    title: "Managers and above",
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
  onTab(GRADUATE_OUTPUT, "tech-graduate-output", "tech"),
  {
    id: "tech-ecosystem-size",
    functionArea: "tech",
    lens: "supply",
    title: "Technology ecosystem by specialism",
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
    title: "GCCs operating above 100 technology FTEs",
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
    title: "Open-source contribution",
    question: "Are engineers here building in the open, or only inside their employers?",
    unit: "developers on GitHub",
    format: "number",
    note:
      "Second largest developer population globally, around 13% of global public contributions, with roughly 2.9M new accounts a year. GitLab and Kaggle were seeded parts with no figures and were removed, which makes this a single figure rather than a split.",
    structure: { kind: "scalar" },
    value: { kind: "scalar", value: 17_000_000 },
    gated: false,
  },
  {
    id: "tech-community-events",
    functionArea: "tech",
    lens: "supply",
    title: "Technical community activity",
    question: "Is there a working community around our stack, or would we be starting one?",
    format: "number",
    note:
      "Groups counted across the top eight cities; Bengaluru alone has about 450. Largest chapters are Python, Kubernetes, AWS and PyTorch. No unit is set because the two parts count different things.",
    structure: {
      kind: "breakdown",
      entries: ["Active technical meetup groups", "Major conferences a year"],
    },
    value: { kind: "breakdown", values: [1_400, 120] },
    gated: false,
  },
  {
    id: "tech-capability-comparison",
    functionArea: "tech",
    lens: "supply",
    title: "Capability compared with other delivery locations",
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
    title: "Grade A office stock",
    question: "Is there space we could move into at the quality our people expect?",
    unit: "million sq ft",
    format: "number",
    note:
      "Both figures rather than a choice between them: total stock answers whether the market is deep, and vacant answers whether we could move in now. Across the top seven cities at 15.5% vacancy; Bengaluru alone holds 241 msf of the total.",
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
    title: "Power and connectivity uptime",
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
    note:
      "Upper end of each supplied range, so nothing reads better than it is: 2–8 ms intra-city to the Mumbai, Hyderabad and Chennai regions, 25–40 ms inter-city. Singapore was a seeded part with no figure and was removed.",
    structure: {
      kind: "breakdown",
      entries: [
        "Same-city cloud region",
        "Another India region",
        "Europe",
        "US East",
      ],
    },
    value: { kind: "breakdown", values: [8, 40, 110, 180] },
    gated: false,
  },
  {
    id: "ops-disruption-days",
    functionArea: "operations",
    lens: "place",
    title: "Days lost to disruption",
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
  onTab(GRADUATE_OUTPUT, "hr-graduate-output", "hr"),
  onTab(BACKFILL_TIME, "hr-backfill-time", "hr"),
  onTab(TIME_TO_FIRST_HIRE, "hr-time-to-first-hire", "hr"),
  onTab(SCALE_MILESTONES, "hr-scale-milestones", "hr"),
  {
    id: "hr-workforce-diversity",
    functionArea: "hr",
    lens: "supply",
    title: "Workforce diversity",
    question: "Would a centre here look like the workforce we are trying to build?",
    format: "percent",
    note:
      "Women in technology roles is projected to reach 35% by 2027; the current figure is stored, not the projection. Women in leadership, first-generation graduates and return-to-work were seeded parts with no figures and were removed.",
    structure: {
      kind: "breakdown",
      entries: [
        "Women across India GCCs",
        "Women in technology roles",
        "Women in engineering degree enrolment",
      ],
    },
    value: { kind: "breakdown", values: [35, 25, 28.8] },
    gated: false,
  },
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
    title: "Base salary growth year on year",
    question: "How fast is the cost of the same person rising?",
    format: "percent",
    note:
      "Split by specialism because a single average hides the scarce skills, which is where a plan actually gets repriced.",
    structure: {
      kind: "breakdown",
      entries: [
        "All roles",
        "AI and machine learning",
        "Cybersecurity",
        "Cloud",
        "Non-ER&D roles",
      ],
    },
    value: { kind: "breakdown", values: [9.8, 21.1, 20, 16.1, 7.5] },
    gated: false,
  },
  {
    id: "hr-cost-per-employee-served",
    functionArea: "hr",
    lens: "cost",
    title: "HR support ratio per employee served",
    question:
      "How many employees does each HR person support once the centre is running, against while it is still being built?",
    unit: "employees per HR person",
    format: "number",
    note:
      "Retitled from 'HR cost per employee served'. The supplied cost figure was an absolute annual amount per employee, which this schema cannot hold and the brief forbids showing; the staffing ratio is the part of the brief's own definition that survives. To restore the cost view, supply it as an index against the sending country.",
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
    title: "India wage growth year on year",
    question: "Is the cost of the same person here rising faster than we can plan for?",
    format: "percent",
    note:
      "India only. It used to sit beside US and UK wage growth and a 'the advantage narrowing' line, which turned one readable number into a three-way comparison a finance leader has to reconcile — and the narrowing figure was a derived opinion rather than a measurement. The gap is still 55–65% and is held to be durable to around 2032; that belongs in the conversation, not on a bar.",
    structure: { kind: "scalar" },
    value: { kind: "scalar", value: 9.8 },
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
    indexBaseline: "Tier 1 cities = 100. Lower is cheaper.",
    note:
      "Indices, not amounts. Conservative end of each supplied range: all-in 25–35% below, compensation 15–22% lower, rent roughly half. Attrition also runs 4–6 points lower in tier 2, which is not a cost and has no slot here.",
    structure: {
      kind: "matrix",
      rows: ["All-in operating cost", "Compensation", "Office space"],
      columns: ["Tier 1 cities", "Tier 2 cities"],
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
    title: "India compared with other delivery locations",
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
