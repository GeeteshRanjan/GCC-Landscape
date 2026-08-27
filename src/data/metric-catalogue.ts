/**
 * The Screen 2 catalogue, transcribed from docs/brief.md.
 *
 * Definitions only. Every value is `null`, because none of the Screen 2 figures
 * have been supplied — they are entered through the admin forms, and inventing
 * plausible numbers here would put fabricated data in front of a CIO evaluating
 * a several-hundred-person commitment. The one exception is the capability grid,
 * whose cells come from the worked example in the brief itself and are recorded
 * with their provenance in the metric's own note.
 *
 * What IS authored here is structure: which parts a breakdown has, which rows and
 * columns a grid has. Those are the question, not the answer, and the admin owns
 * them — the editor can rename, add and remove them, and `alignValue` keeps any
 * numbers already typed in step.
 *
 * This is a SEED. It is used when a dataset has no catalogue yet. Once admin has
 * edited it, the dataset is the record and the importer preserves it; see
 * scripts/import-seed.ts.
 */
import type { Metric } from "./schema";

/** Ordinal steps for the capability grid, weakest first. */
const CAPABILITY_SCALE = ["Developing", "Moderate", "Strong", "Very strong"] as const;

/**
 * The brief's own note about time to first hire, split across the two ends of the
 * range so each end says which operating model produces it.
 */
const FIRST_HIRE_MIN = "with an employer of record and serviced space";
const FIRST_HIRE_MAX = "with a build-operate-transfer engagement";

export const METRIC_CATALOGUE: readonly Metric[] = [
  /* ===================== Technology ===================== */
  {
    id: "tech-bench-strength",
    functionArea: "tech",
    lens: "supply",
    title: "Technology bench strength",
    question: "How many people with the skills we need are available today?",
    unit: "FTEs",
    format: "number",
    structure: { kind: "scalar" },
    value: null,
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
    structure: {
      kind: "breakdown",
      entries: [
        "Computer science and IT",
        "Electronics and communication",
        "Mathematics and statistics",
        "Other engineering",
      ],
    },
    value: null,
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
    structure: {
      kind: "breakdown",
      entries: [
        "Software development",
        "Data, AI and machine learning",
        "Quality engineering",
        "Cloud and infrastructure",
        "Cybersecurity",
      ],
    },
    value: null,
    gated: false,
  },
  {
    id: "tech-leadership-depth",
    functionArea: "tech",
    lens: "supply",
    title: "Leadership depth",
    question:
      "Can we hire technology managers who have already run teams at the scale we are planning?",
    unit: "professionals with 10+ years of experience",
    format: "number",
    structure: { kind: "scalar" },
    value: null,
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
    structure: { kind: "scalar" },
    value: null,
    gated: false,
  },
  {
    id: "tech-open-source-signal",
    functionArea: "tech",
    lens: "supply",
    title: "Open-source contribution",
    question: "Are engineers here building in the open, or only inside their employers?",
    unit: "contributors",
    format: "number",
    structure: {
      kind: "breakdown",
      entries: ["GitHub", "GitLab", "Kaggle"],
    },
    value: null,
    gated: false,
  },
  {
    id: "tech-community-events",
    functionArea: "tech",
    lens: "supply",
    title: "Technical community activity",
    question: "Is there a working community around our stack, or would we be starting one?",
    unit: "conferences and meetups a year",
    format: "number",
    structure: { kind: "scalar" },
    value: null,
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
      "Cells for India, Poland and the Philippines are the worked example in docs/brief.md, carried over as supplied. Vietnam is a comparator the brief names but does not rate, so it is left empty rather than guessed.",
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
        ["Very strong", "Strong", "Developing", null],
        ["Very strong", "Strong", "Developing", null],
        ["Very strong", "Strong", "Moderate", null],
        ["Strong", "Strong", "Moderate", null],
        ["Very strong", "Strong", "Strong", null],
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
    unit: "FTEs",
    format: "number",
    structure: { kind: "scalar" },
    value: null,
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
    structure: {
      kind: "breakdown",
      entries: [
        "Commerce and accounting",
        "Business administration",
        "Engineering",
        "Science",
      ],
    },
    value: null,
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
    structure: { kind: "range" },
    value: null,
    gated: false,
  },
  {
    id: "ops-grade-a-office-stock",
    functionArea: "operations",
    lens: "supply",
    title: "Grade A office stock available",
    question: "Is there space we could move into at the quality our people expect?",
    unit: "million sq ft",
    format: "number",
    structure: { kind: "scalar" },
    value: null,
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
    structure: {
      kind: "range",
      minLabel: FIRST_HIRE_MIN,
      maxLabel: FIRST_HIRE_MAX,
    },
    value: null,
    gated: false,
  },
  {
    id: "ops-scale-milestones",
    functionArea: "operations",
    lens: "speed",
    title: "Time to reach each scale milestone",
    question: "Once the first team proves out, how quickly do centres here add the next hundred?",
    unit: "days, median",
    format: "duration",
    note:
      "The brief's note: the point is that centres scale as the model proves out and functions are added once the work is proven — shown as the ramp, not stated as a claim.",
    structure: {
      kind: "breakdown",
      entries: ["To 100 FTEs", "To 500 FTEs", "To 1,000 FTEs"],
    },
    value: null,
    gated: false,
  },
  {
    id: "ops-power-uptime",
    functionArea: "operations",
    lens: "place",
    title: "Power and connectivity uptime",
    question: "Can we run a shift here without planning around outages?",
    format: "percent",
    structure: { kind: "scalar" },
    value: null,
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
    structure: {
      kind: "breakdown",
      entries: [
        "Nearest hyperscaler region",
        "Singapore",
        "Frankfurt",
        "Northern Virginia",
      ],
    },
    value: null,
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
    structure: {
      kind: "breakdown",
      entries: ["Power", "Flooding", "Transit"],
    },
    value: null,
    gated: false,
  },

  /* ===================== HR ===================== */
  {
    id: "hr-bench-strength",
    functionArea: "hr",
    lens: "supply",
    title: "HR bench strength",
    question: "How many experienced HR professionals could we hire from?",
    unit: "FTEs",
    format: "number",
    structure: { kind: "scalar" },
    value: null,
    gated: false,
  },
  {
    id: "hr-graduate-output",
    functionArea: "hr",
    lens: "supply",
    title: "Graduate output by discipline",
    question: "Is there a steady intake we could build an HR team from?",
    unit: "graduates a year",
    format: "number",
    structure: {
      kind: "breakdown",
      entries: [
        "Human resources and industrial relations",
        "Business administration",
        "Psychology and social sciences",
        "Commerce",
      ],
    },
    value: null,
    gated: false,
  },
  {
    id: "hr-leadership-depth",
    functionArea: "hr",
    lens: "supply",
    title: "Leadership depth",
    question: "Can we hire an HR leader who has already built a centre from nothing?",
    unit: "professionals with 10+ years of experience",
    format: "number",
    note:
      "Open question from the brief: whether this counts technology leadership only or non-technology as well. Decide before entering a figure, and say which in the as-of note.",
    structure: { kind: "scalar" },
    value: null,
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
    structure: { kind: "range" },
    value: null,
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
      "The brief filed this as optional. Kept, because it is a real question for the audience; drop the metric rather than publish a partial answer if the data is not there.",
    structure: {
      kind: "breakdown",
      entries: [
        "Women in the workforce",
        "Women in leadership",
        "First-generation graduates",
        "Returning after a career break",
      ],
    },
    value: null,
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
      "Entity incorporation plus PF, PT, ESI and Shops & Establishments registrations.",
    structure: { kind: "range" },
    value: null,
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
    structure: {
      kind: "range",
      minLabel: FIRST_HIRE_MIN,
      maxLabel: FIRST_HIRE_MAX,
    },
    value: null,
    gated: false,
  },
  {
    id: "hr-scale-milestones",
    functionArea: "hr",
    lens: "speed",
    title: "Time to reach each scale milestone",
    question: "How quickly does hiring here go from a first team to a full centre?",
    unit: "days, median",
    format: "duration",
    structure: {
      kind: "breakdown",
      entries: ["To 100 FTEs", "To 500 FTEs", "To 1,000 FTEs"],
    },
    value: null,
    gated: false,
  },
  {
    id: "hr-offer-acceptance",
    functionArea: "hr",
    lens: "speed",
    title: "Offer acceptance rate",
    question: "When we make an offer here, does it get taken?",
    format: "percent",
    structure: { kind: "scalar" },
    value: null,
    gated: false,
  },
  {
    id: "hr-salary-growth",
    functionArea: "hr",
    lens: "cost",
    title: "Base salary growth year on year",
    question: "How fast is the cost of the same person rising?",
    format: "percent",
    structure: { kind: "scalar" },
    value: null,
    gated: false,
  },
  {
    id: "hr-cost-per-employee-served",
    functionArea: "hr",
    lens: "cost",
    title: "HR cost per employee served",
    question:
      "What does it cost to support each employee once the HR team, the systems, payroll and vendors are counted?",
    format: "index",
    indexBaseline: "Sending country = 100",
    structure: {
      kind: "breakdown",
      entries: ["HR team ratio", "HR systems", "Payroll and vendor support"],
    },
    value: null,
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
      "Gated, and an index by construction. Absolute per-head figures are never shown in any lens — there is no currency format in the schema to hold one.",
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
    value: null,
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
      "Latest year-on-year movement per component. A longer series can be added as a grid once more than one year is held.",
    structure: {
      kind: "breakdown",
      entries: ["Compensation", "Operating cost", "Workplace"],
    },
    value: null,
    gated: false,
  },
  {
    id: "fin-cost-composition",
    functionArea: "finance",
    lens: "cost",
    title: "What drives the cost advantage",
    question: "Where does the saving actually come from?",
    format: "percent",
    note: "A directional split. The parts are meant to read as roughly a whole.",
    structure: {
      kind: "breakdown",
      entries: [
        "People",
        "Workplace",
        "Infrastructure",
        "Compliance",
        "Operating support",
      ],
    },
    value: null,
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
      "Columns start at the two tiers because that is the headline. Individual cities can be added as columns once per-city figures exist.",
    structure: {
      kind: "matrix",
      rows: ["Compensation", "Office space", "Transport", "Local operating support"],
      columns: ["Tier 1 cities", "Tier 2 cities"],
    },
    value: null,
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
      "An index, never a figure. No absolute per-head cost appears here or anywhere else.",
    structure: {
      kind: "matrix",
      rows: [
        "Product engineering",
        "Data and AI",
        "Shared services",
        "Finance and accounting",
        "Customer operations",
      ],
      columns: ["India", "Poland", "Philippines", "Vietnam", "Mexico"],
    },
    value: null,
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
    indexBaseline: "Tier 1 cities = 100",
    note:
      "Gated. Its purpose is to stop a low-cost city looking attractive without its execution risk, which is exactly why it is the conversation rather than the free layer.",
    structure: {
      kind: "matrix",
      rows: [
        "Cost position",
        "Talent depth",
        "Peer presence",
        "Infrastructure",
        "Room to scale",
      ],
      columns: ["Tier 1 cities", "Tier 2 cities"],
    },
    value: null,
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
    structure: {
      kind: "breakdown",
      entries: [
        "Central business district",
        "Suburban technology park",
        "Peripheral campus",
      ],
    },
    value: null,
    gated: true,
  },
];

/** A fresh copy, so a caller mutating the result cannot corrupt the seed. */
export function seedMetricCatalogue(): Metric[] {
  return structuredClone(METRIC_CATALOGUE) as Metric[];
}
