/**
 * The similarity atoms.
 *
 * A CODE-LEVEL VOCABULARY, deliberately not admin-editable, for the same reason
 * `METRIC_LENSES` is not: these are the substrate every peer score is computed
 * against. An admin inventing a tag nobody else carries creates a tag that
 * matches nothing, and deleting one silently re-scores every peer set in the
 * product. Business TYPES are admin-editable (see `business-type-catalogue.ts`);
 * the tags they draw from are a code change, on purpose.
 *
 * ── Why tags rather than a sub-industry hierarchy ────────────────────────────
 *
 * The source spreadsheet's Sub-Industry column has 620 values over 1834
 * companies and was dropped for it: as a match key it covered 35.8%. But the
 * failure was never granularity, it was ROLE — it was measured as a filter
 * competing with industry. A single bucket per company, however well sized,
 * fixes the first few peers and leaves the fall-through broken, and the
 * fall-through is where the complaint lives: Retail has 60 companies, so once
 * apparel is exhausted the next peer is whoever is biggest in Retail, which is
 * how a footwear brand ends up beside a home-improvement chain.
 *
 * Multi-label tags have no bucket to exhaust. Similarity is continuous, so a
 * business type with one member still yields a full, sensibly-ordered peer set
 * via tag adjacency, and the thin-bucket failure that killed sub-industry cannot
 * recur. See `similarity.ts` for the scoring and docs/business-types.md for the
 * measured vocabulary design.
 *
 * ── Two rules that make the vocabulary work ──────────────────────────────────
 *
 *  1. EVERY TAG MUST APPEAR ON AT LEAST TWO BUSINESS TYPES. A tag carried by
 *     exactly one type is functionally dead: it can only ever be shared in a
 *     type-against-itself comparison, which already scores maximum. `data:verify`
 *     asserts this, which is what stops the vocabulary drifting back towards 620
 *     values of one member each.
 *
 *     This rule did real work while authoring. `tobacco`, `aircraft-engines`,
 *     `semiconductor-equipment`, `express-parcel`, `industrial-gases` and a dozen
 *     others were all drafted and then removed once it was clear one type would
 *     carry them: what looked like precision was a tag that could never fire.
 *     Each collapsed into a broader atom that two or more types genuinely share —
 *     an aircraft-engine maker is `aerospace` + `machinery-equipment`, which is
 *     what actually makes it adjacent to the rest of aerospace.
 *
 *  2. Tag weight is never hand-authored. `similarity.ts` weights each tag by how
 *     RARE it is inside the industry being matched (inverse document frequency),
 *     so `retail-operator` contributes nothing inside Retail while `footwear`
 *     contributes a great deal. Nobody maintains a table of tag importances that
 *     then rots, and the weighting re-derives itself as companies are added.
 *
 * Tags are grouped by axis below. The axes are an authoring aid — the scorer
 * treats every tag identically and knows nothing about the grouping.
 */

/* ==========================================================================
   Axis 1 — form: what kind of business this fundamentally is

   The heaviest-reused axis, and the one that keeps a software company away from
   a manufacturer even when they serve the same vertical.
   ========================================================================== */
const FORM = [
  "software-product",
  "saas",
  "platform-marketplace",
  "hardware-product",
  "discrete-manufacturing",
  "process-manufacturing",
  "services-firm",
  "network-operator",
  "retail-operator",
  "brand-owner",
  /** Carries risk on its own balance sheet: a bank, an insurer, a lender. */
  "balance-sheet-risk",
  "content-ip-owner",
] as const;

/* ==========================================================================
   Axis 2 — who they sell to
   ========================================================================== */
const BUYER = [
  "b2b",
  "b2c",
  "b2g",
  "enterprise-accounts",
  "smb-accounts",
] as const;

/* ==========================================================================
   Axis 3 — vertical served

   Load-bearing for software and services, which is where the source data was
   least usable: 203 companies share the sub-industry "Enterprise Software" and
   the only thing separating them is who they sell to. A healthcare-claims
   platform and a bank-core platform are not peers, and this axis is what says so.
   ========================================================================== */
const VERTICAL = [
  "serves-healthcare",
  "serves-financial",
  "serves-retail",
  "serves-telecom",
  "serves-industrial",
  "serves-automotive",
  "serves-public-sector",
  "serves-education",
  "serves-media",
  "serves-construction",
  "serves-energy",
  "serves-logistics",
  /** Sells the same product into every vertical. The horizontal-SaaS marker. */
  "cross-industry",
] as const;

/* ==========================================================================
   Axis 4 — product domain, for technology businesses
   ========================================================================== */
const DOMAIN = [
  "security",
  "data-analytics",
  "ai-ml",
  "cloud-infrastructure",
  "developer-tools",
  /** ERP and the systems of record a business actually runs on. */
  "core-business-systems",
  "customer-systems",
  "marketing-adtech",
  "hr-workforce-systems",
  "finance-systems",
  "supply-chain-systems",
  "collaboration-tools",
  "design-engineering-tools",
  "payments-processing",
  "networking-tech",
  "storage-compute-hardware",
  "embedded-software",
] as const;

/* ==========================================================================
   Axis 5 — operating character

   How the business actually runs, which is what decides what its GCC does. Two
   companies sharing `regulated` and `clinical-regulated` have more in common
   operationally than two that merely share an industry label.
   ========================================================================== */
const CHARACTER = [
  "regulated",
  "safety-critical",
  "supply-chain-heavy",
  "capital-intensive",
  "r-and-d-intensive",
  "ip-licensing",
  "asset-light",
  /** Delivery requires people physically on site. */
  "field-operations",
  "physical-stores",
  "dtc",
  "subscription-revenue",
  "transaction-revenue",
  "project-revenue",
  "billable-hours",
  "clinical-regulated",
  "fashion-cycle",
  "perishable-goods",
] as const;

/* ==========================================================================
   Axis 6 — sector specifics

   The narrowest tags, and the ones that do the visible work: `footwear` shared
   between two Retail companies is the single strongest signal in that industry,
   precisely because almost nobody else carries it.
   ========================================================================== */
const SECTOR = [
  // Consumer goods and retail
  "apparel",
  "footwear",
  "luxury",
  "sporting-goods",
  "packaged-food",
  "beverages",
  "personal-care",
  "household-products",
  "restaurant-operations",
  "ecommerce",
  "consumer-devices",
  "appliances",

  // Health and life sciences
  "pharmaceutical",
  "biotech",
  "medical-device",
  "diagnostics",
  "hospital-care",
  "clinical-research",
  "health-payer",

  // Semiconductors and electronics
  "semiconductor",
  "fabless-design",
  "electronic-components",
  "computing-hardware",

  // Mobility
  "vehicle-oem",
  "vehicle-components",
  "electric-vehicles",
  "aerospace",
  "defense",
  "airline-operations",

  // Industrial, materials and energy
  "specialty-chemicals",
  "commodity-chemicals",
  "agrochemicals",
  "metals-steel",
  "mining",
  "building-materials",
  "packaging",
  "oil-gas",
  "power-generation",
  "renewables",
  "grid-utilities",
  "engineering-construction",
  "civil-infrastructure",
  "real-estate",
  "industrial-automation",
  "test-measurement",
  "machinery-equipment",
  "tools-hardware",
  "agriculture",
  "food-processing",

  // Financial services
  "banking-lending",
  "insurance-underwriting",
  "asset-management",
  "capital-markets",
  "fintech",
  "credit-data",

  // Communications and media
  "telecom-services",
  "telecom-equipment",
  "entertainment-content",
  "publishing",
  "gaming",
  "advertising-services",
  "market-research",

  // Services
  "consulting",
  "accounting-audit",
  "legal-services",
  "staffing-workforce",
  "outsourcing-bpo",
  /** Localization, translation, editorial and data-annotation: human effort
   *  applied to language and content, not software engineering. Rare enough
   *  inside Software & Internet to separate a content shop from a systems
   *  integrator. Also carried by BPO, whose content-moderation and document
   *  work is the same kind of labour. */
  "content-language-services",
  "education-services",

  // Movement of goods and people
  "freight-logistics",
  "shipping-maritime",
  "travel-booking",
  "hospitality-operations",
  "wholesale-distribution",
] as const;

/**
 * The whole vocabulary, flattened. Order is authoring order and carries no
 * meaning — the scorer derives every weight from the data.
 */
export const BUSINESS_TAGS = [
  ...FORM,
  ...BUYER,
  ...VERTICAL,
  ...DOMAIN,
  ...CHARACTER,
  ...SECTOR,
] as const;

export type BusinessTag = (typeof BUSINESS_TAGS)[number];

/** Axis membership, for the admin editor's grouped multiselect only. */
export const BUSINESS_TAG_AXES: ReadonlyArray<{
  axis: string;
  hint: string;
  tags: readonly BusinessTag[];
}> = [
  { axis: "Form", hint: "What kind of business this is", tags: FORM },
  { axis: "Buyer", hint: "Who it sells to", tags: BUYER },
  { axis: "Vertical", hint: "Which industry it serves", tags: VERTICAL },
  { axis: "Domain", hint: "Product area, for technology businesses", tags: DOMAIN },
  { axis: "Character", hint: "How the business runs", tags: CHARACTER },
  { axis: "Sector", hint: "Specific products and markets", tags: SECTOR },
];

const TAG_SET: ReadonlySet<string> = new Set(BUSINESS_TAGS);

export function isBusinessTag(value: string): value is BusinessTag {
  return TAG_SET.has(value);
}
