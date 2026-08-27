/**
 * The Screen 2 catalogue, transcribed from docs/brief.md and populated from the
 * figures supplied 2026-08-27.
 *
 * This is a SEED. It is used when a dataset has no catalogue yet, and adopted
 * over an existing one only by `npm run data:import -- --reseed-metrics`. Once
 * admin has edited a metric, the dataset is the record; see scripts/import-seed.ts.
 *
 * Three rules govern every value below, and they are the reason some supplied
 * figures are not here.
 *
 * **Every figure here is illustrative and will be replaced.** `seedMetricCatalogue`
 * stamps each one with `asOf: SAMPLE_PROVENANCE`, which is a public field, so a
 * sample number that escapes to a visitor arrives labelled rather than passed off
 * as research. That is the safeguard; the notes below are the explanation.
 *
 * **No absolute money, ever — and this one is not about data quality.** The
 * supplied data contained per-head dollar and per-square-foot rupee figures. There
 * is no currency format in the schema and a currency-looking unit is refused, so
 * those cannot be stored whether they are real or sample. Cost is expressed as
 * indices against a stated base, which is what the brief asks for and what makes a
 * figure publishable at all. Replacing these samples does not relax that.
 *
 * **A range collapses to its conservative end.** Several figures arrived as
 * ranges, and a breakdown slot holds one number. The end stored is the one that
 * understates India's advantage — 15% rather than 22% cheaper. A tool whose job is
 * to earn a conversation cannot afford a figure a CIO's own team can beat down.
 * Each note records the full range, and the rule should survive the samples.
 *
 * **Structure follows the data, not the other way round.** Where the supplied
 * split did not match the seeded parts — disruption by city rather than by cause,
 * salary growth by specialism rather than one average — the shape was changed to
 * match. Parts with no figure behind them were removed rather than left empty,
 * because an empty slot keeps the whole metric off the public screen.
 */
import type { Metric } from "./schema";

/**
 * Provenance stamped on every seeded metric.
 *
 * `asOf` is a PUBLIC field — it renders beside the figure — so this is the
 * safeguard that matters: every number in the seed is illustrative, and if one
 * ever reaches a visitor before it has been replaced, the visitor is told so
 * rather than shown a fabricated figure presented as research. It clears itself
 * the moment a real figure is entered with a real date, which is why it is a
 * default rather than a hardcoded value on each entry.
 *
 * `npm run data:verify` counts how many metrics still carry it, so the number
 * going to zero is a visible milestone rather than something to remember.
 */
export const SAMPLE_PROVENANCE = "Sample, not for publication";

/** Ordinal steps for the capability grid, weakest first. */
const CAPABILITY_SCALE = ["Developing", "Moderate", "Strong", "Very strong"] as const;

const FIRST_HIRE_EOR = "on an employer of record";
const FIRST_HIRE_DIRECT = "hiring directly into your own entity";

export const METRIC_CATALOGUE: readonly Metric[] = [
  /* ===================== Technology ===================== */
  {
    id: "tech-bench-strength",
    functionArea: "tech",
    lens: "supply",
    title: "Technology bench strength",
    question: "How many people with the skills we need are available today?",
    unit: "technology professionals",
    format: "number",
    note:
      "The national technology workforce, which is what 'available today' means for someone hiring. For context, 2.36M work in India GCCs and 1.4M of those are in technology roles — proof of adoption rather than available supply.",
    structure: { kind: "scalar" },
    value: { kind: "scalar", value: 5_800_000 },
    gated: false,
  },
  {
    id: "tech-graduate-output",
    functionArea: "tech",
    lens: "supply",
    title: "Graduate output by discipline",
    question: "Will the talent pool still be deep enough tomorrow, as we grow?",
    unit: "graduates a year",
    format: "number",
    note: "Roughly 2.55M STEM graduates a year in total. The parts below are disjoint.",
    structure: {
      kind: "breakdown",
      entries: [
        "Engineering, other disciplines",
        "Computer science and IT",
        "Electronics and communication",
        "Mathematics and statistics",
        "Other sciences",
      ],
    },
    value: {
      kind: "breakdown",
      values: [1_500_000, 300_000, 250_000, 200_000, 350_000],
    },
    gated: false,
  },
  {
    id: "tech-ecosystem-size",
    functionArea: "tech",
    lens: "supply",
    title: "Technology ecosystem by specialism",
    question: "Is the depth spread across the specialisms we need, or concentrated in one?",
    unit: "professionals",
    format: "number",
    note:
      "Specialisms overlap, so these do not sum to the bench strength figure. Quality engineering was a seeded part with no figure behind it and was removed.",
    structure: {
      kind: "breakdown",
      entries: [
        "Full-stack and product engineering",
        "Cloud",
        "Data engineering and analytics",
        "AI and machine learning",
        "Embedded and ER&D",
        "SRE and DevOps",
        "Cybersecurity",
      ],
    },
    value: {
      kind: "breakdown",
      values: [600_000, 520_000, 450_000, 416_000, 350_000, 200_000, 180_000],
    },
    gated: false,
  },
  {
    id: "tech-leadership-depth",
    functionArea: "tech",
    lens: "supply",
    title: "Leadership depth",
    question:
      "Can we hire technology managers who have already run teams at the scale we are planning?",
    unit: "leaders who have run teams of 100+ engineers",
    format: "number",
    note:
      "A range as supplied, so stored as one. Separately, 400+ India-based leaders hold global mandates — a different claim, and there is no metric for it.",
    structure: { kind: "range" },
    value: { kind: "range", min: 9_000, max: 11_000 },
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
  {
    id: "ops-bench-strength",
    functionArea: "operations",
    lens: "supply",
    title: "Operations bench strength",
    question: "How many people with operations experience are available today?",
    unit: "professionals",
    format: "number",
    note: "Roughly 620K of these already work inside GCCs.",
    structure: { kind: "scalar" },
    value: { kind: "scalar", value: 800_000 },
    gated: false,
  },
  {
    id: "ops-graduate-output",
    functionArea: "operations",
    lens: "supply",
    title: "Graduate output by discipline",
    question: "Will the pool of people we can train into these roles keep replenishing?",
    unit: "graduates a year",
    format: "number",
    note:
      "Against roughly 4.5M general graduates a year in total. Engineering and science were seeded parts with no operations-specific figures and were removed.",
    structure: {
      kind: "breakdown",
      entries: ["Commerce", "Management and MBA", "Finance and accounting"],
    },
    value: { kind: "breakdown", values: [600_000, 450_000, 250_000] },
    gated: false,
  },
  {
    id: "ops-backfill-time",
    functionArea: "operations",
    lens: "supply",
    title: "Time to backfill a role",
    question: "When somebody leaves, how long does the seat stay empty?",
    unit: "days",
    format: "duration",
    note: "Mid-level 35–45 days, specialist 60–75. The wider span is stored so neither case is hidden.",
    structure: {
      kind: "range",
      minLabel: "for a mid-level operations role",
      maxLabel: "for a specialist role",
    },
    value: { kind: "range", min: 35, max: 75 },
    gated: false,
  },
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
    id: "ops-time-to-first-hire",
    functionArea: "operations",
    lens: "speed",
    title: "Time to first hire",
    question: "How soon could somebody actually start work?",
    unit: "days",
    format: "duration",
    note:
      "Six to ten weeks from mandate to first joiner. The supplied figure does not split by operating model, so the end labels the brief called for are not set here; the HR equivalent does split.",
    structure: { kind: "range" },
    value: { kind: "range", min: 42, max: 70 },
    gated: false,
  },
  {
    id: "ops-scale-milestones",
    functionArea: "operations",
    lens: "speed",
    title: "Time to reach each scale milestone",
    question: "Once the first team proves out, how quickly do centres here add the next hundred?",
    unit: "months, median",
    format: "duration",
    note:
      "Months rather than days, as supplied — converting would invent precision. The 100 FTE milestone was given as 9–12 months and the conservative end is stored.",
    structure: {
      kind: "breakdown",
      entries: ["To 50 FTEs", "To 100 FTEs", "To 300 FTEs", "To 500 FTEs"],
    },
    value: { kind: "breakdown", values: [6, 12, 24, 36] },
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
  {
    id: "hr-bench-strength",
    functionArea: "hr",
    lens: "supply",
    title: "HR bench strength",
    question: "How many experienced HR professionals could we hire from?",
    unit: "professionals",
    format: "number",
    note: "Roughly 55K of these have GCC experience specifically.",
    structure: { kind: "scalar" },
    value: { kind: "scalar", value: 180_000 },
    gated: false,
  },
  {
    id: "hr-graduate-output",
    functionArea: "hr",
    lens: "supply",
    title: "Graduate output by discipline",
    question: "Is there a steady intake we could build an HR team from?",
    unit: "HR postgraduates a year",
    format: "number",
    note:
      "From MBA and MSW programmes. Supplied as one figure, so the seeded four-way split was collapsed rather than padded with guesses.",
    structure: { kind: "scalar" },
    value: { kind: "scalar", value: 45_000 },
    gated: false,
  },
  {
    id: "hr-leadership-depth",
    functionArea: "hr",
    lens: "supply",
    title: "Leadership depth",
    question: "Can we hire an HR leader who has already built a centre from nothing?",
    unit: "HR leaders",
    format: "number",
    note:
      "Split because the two answer different questions: can somebody start this, and has anybody taken it to full scale.",
    structure: {
      kind: "breakdown",
      entries: ["Have built a centre from zero", "Have scaled one past 1,000 FTEs"],
    },
    value: { kind: "breakdown", values: [1_200, 350] },
    gated: false,
  },
  {
    id: "hr-backfill-time",
    functionArea: "hr",
    lens: "supply",
    title: "Time to backfill a role",
    question: "When somebody leaves, how long does the seat stay empty?",
    unit: "days",
    format: "duration",
    note: "Mid-level 40–50 days, an HR head 75–90. The wider span is stored so neither case is hidden.",
    structure: {
      kind: "range",
      minLabel: "for a mid-level HR role",
      maxLabel: "for an HR head",
    },
    value: { kind: "range", min: 40, max: 90 },
    gated: false,
  },
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
    id: "hr-legal-readiness-days",
    functionArea: "hr",
    lens: "speed",
    title: "Time to legal employer readiness",
    question: "How long before we can legally employ somebody in our own name?",
    unit: "days",
    format: "duration",
    note:
      "Own entity is 8–12 weeks, covering incorporation plus PF, PT, ESI and Shops & Establishments registrations. An employer of record is 2–5 days but is not employment in your own name.",
    structure: {
      kind: "range",
      minLabel: FIRST_HIRE_EOR,
      maxLabel: "incorporating your own entity",
    },
    value: { kind: "range", min: 2, max: 84 },
    gated: false,
  },
  {
    id: "hr-time-to-first-hire",
    functionArea: "hr",
    lens: "speed",
    title: "Time to first hire",
    question: "How soon could somebody actually start work?",
    unit: "days",
    format: "duration",
    note: "Under two weeks on an employer of record, six to ten weeks hiring direct.",
    structure: {
      kind: "range",
      minLabel: FIRST_HIRE_EOR,
      maxLabel: FIRST_HIRE_DIRECT,
    },
    value: { kind: "range", min: 14, max: 70 },
    gated: false,
  },
  {
    id: "hr-scale-milestones",
    functionArea: "hr",
    lens: "speed",
    title: "Time to reach each scale milestone",
    question: "How quickly does hiring here go from a first team to a full centre?",
    unit: "months, median",
    format: "duration",
    note:
      "The 100 FTE milestone was supplied as 9–12 months and the 500 as 500–600 FTEs in 36; the conservative end of each is stored.",
    structure: {
      kind: "breakdown",
      entries: ["To 100 FTEs", "To 300 FTEs", "To 500 FTEs"],
    },
    value: { kind: "breakdown", values: [12, 24, 36] },
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
      "By city, since the spread is the point. Lower end of each supplied range: Bengaluru 62–68, Hyderabad 72–78, Pune 75–82, Chennai 78–85. Offer dropout runs 10–28% depending on the city.",
    structure: {
      kind: "breakdown",
      entries: ["Bengaluru", "Hyderabad", "Pune", "Chennai"],
    },
    value: { kind: "breakdown", values: [62, 72, 75, 78] },
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
    title: "How the cost advantage is moving",
    question: "Is the advantage durable, or is it closing while we deliberate?",
    format: "percent",
    note:
      "The gap is still 55–65% and is held to be durable to around 2032. Conservative ends stored: US and UK growth given as 3–4%, narrowing as 1.5–2 points a year. The seeded split by compensation, operating cost and workplace had no figures behind it.",
    structure: {
      kind: "breakdown",
      entries: [
        "India wage growth",
        "US and UK wage growth",
        "The advantage narrowing, a year",
      ],
    },
    value: { kind: "breakdown", values: [9.8, 3, 2] },
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
    indexBaseline: "Tier 1 cities = 100",
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
    question: "For the same role, how does India sit against the alternatives?",
    format: "index",
    indexBaseline: "India = 100",
    note:
      "Derived from the supplied senior-engineer comparison by dividing through India's figure, which is exactly the conversion the brief asks for — indices, never amounts. Only that one role was supplied, so it is the only row. Separately, India runs about 2.1 heads for every one US head. Vietnam was a seeded column with no figure and was removed.",
    structure: {
      kind: "matrix",
      rows: ["Senior engineer"],
      columns: ["India", "Philippines", "Mexico", "Poland", "United States"],
    },
    value: {
      kind: "matrix",
      cells: [[100, 122, 167, 189, 367]],
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
 * A fresh copy, so a caller mutating the result cannot corrupt the seed, with
 * provenance stamped on anything that does not already state its own.
 */
export function seedMetricCatalogue(): Metric[] {
  return (structuredClone(METRIC_CATALOGUE) as Metric[]).map((metric) => ({
    ...metric,
    asOf: metric.asOf ?? SAMPLE_PROVENANCE,
  }));
}
