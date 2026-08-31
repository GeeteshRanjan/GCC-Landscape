import type { BusinessTag } from "./business-tags";

/**
 * The seed business-type catalogue: what a visitor picks, and what a company is
 * assigned.
 *
 * The same relationship to `dataset.businessTypes` that `metric-catalogue.ts` has
 * to `dataset.metrics` — this is the seed transcribed once, and after the first
 * import admin is the system of record. `npm run data:import` preserves whatever
 * is stored; `--reseed-business-types` adopts this file instead and says loudly
 * what it discarded.
 *
 * ── Why there are ~115 of these and not ~65 ──────────────────────────────────
 *
 * With a hierarchy, the count would be bounded from below by peer-set size: a
 * bucket needs six members to seat five peers, so granularity has to be traded
 * against coverage, and that trade is what made 620 sub-industries unusable.
 *
 * Tag scoring removes the bound entirely. A type with three members still yields
 * a full peer set, because the ordering comes from tag adjacency across the whole
 * industry rather than from the bucket. So the only real constraint left is that
 * a visitor must recognise their own business in a dropdown at a glance, which
 * argues for MORE precision, not less. The largest list any one visitor sees is
 * Software & Internet's, because the dropdown is filtered to their industry.
 *
 * ── How the tags were assigned ───────────────────────────────────────────────
 *
 * Never mechanically. The test applied to every row was: would a CIO at a company
 * of this type look at another company carrying these tags and accept it as a
 * comparable operation? That is why `hc-pharma` carries `clinical-research` (large
 * pharma runs its own trials) while `hc-cro` does not carry `pharmaceutical` (a
 * contract research organisation does not own the molecule), and why every
 * software type carries a vertical rather than only a product domain — a
 * claims-processing platform and a bank-core platform share `saas` and almost
 * nothing that matters.
 *
 * Ids are stable and referenced by `company.businessTypes`, so renaming a `name`
 * is free and changing an `id` is not.
 */

export interface BusinessTypeSeed {
  id: string;
  name: string;
  /** Must be a value in `taxonomy.industries`. Enforced by the schema. */
  industry: string;
  tags: readonly BusinessTag[];
}

/* ==========================================================================
   Software & Internet — 656 companies, the largest and worst-served industry

   203 of them share the sub-industry "Enterprise Software", which says nothing
   about who they sell to and is why a fintech platform currently sits beside a
   hyperscaler. These 28 types split that mass along the two axes that actually
   separate software businesses: what the product does, and which industry buys it.
   ========================================================================== */
const SOFTWARE: BusinessTypeSeed[] = [
  {
    id: "sw-security",
    name: "Cybersecurity",
    industry: "Software & Internet",
    tags: ["software-product", "saas", "security", "b2b", "enterprise-accounts", "cross-industry", "subscription-revenue", "r-and-d-intensive"],
  },
  {
    id: "sw-data-analytics",
    name: "Data & Analytics Platform",
    industry: "Software & Internet",
    tags: ["software-product", "saas", "data-analytics", "ai-ml", "b2b", "enterprise-accounts", "cross-industry", "subscription-revenue"],
  },
  {
    id: "sw-ai-platform",
    name: "AI & Machine Learning Platform",
    industry: "Software & Internet",
    tags: ["software-product", "saas", "ai-ml", "b2b", "enterprise-accounts", "cross-industry", "r-and-d-intensive", "subscription-revenue"],
  },
  {
    id: "sw-cloud-infra",
    name: "Cloud & Infrastructure Software",
    industry: "Software & Internet",
    tags: ["software-product", "saas", "cloud-infrastructure", "security", "networking-tech", "b2b", "enterprise-accounts", "cross-industry", "subscription-revenue"],
  },
  {
    id: "sw-devtools",
    name: "Developer Tools & DevOps",
    industry: "Software & Internet",
    tags: ["software-product", "saas", "developer-tools", "collaboration-tools", "b2b", "smb-accounts", "cross-industry", "subscription-revenue"],
  },
  {
    id: "sw-erp",
    name: "ERP & Core Business Systems",
    industry: "Software & Internet",
    tags: ["software-product", "saas", "core-business-systems", "b2b", "enterprise-accounts", "cross-industry", "subscription-revenue"],
  },
  {
    id: "sw-crm-cx",
    name: "CRM & Customer Experience Software",
    industry: "Software & Internet",
    tags: ["software-product", "saas", "customer-systems", "b2b", "enterprise-accounts", "cross-industry", "subscription-revenue"],
  },
  {
    id: "sw-martech",
    name: "Marketing Technology",
    industry: "Software & Internet",
    tags: ["software-product", "saas", "marketing-adtech", "customer-systems", "data-analytics", "b2b", "cross-industry", "subscription-revenue"],
  },
  {
    id: "sw-hr",
    name: "HR & Workforce Software",
    industry: "Software & Internet",
    tags: ["software-product", "saas", "hr-workforce-systems", "b2b", "enterprise-accounts", "cross-industry", "subscription-revenue"],
  },
  {
    id: "sw-finance",
    name: "Finance, Accounting & Tax Software",
    industry: "Software & Internet",
    tags: ["software-product", "saas", "finance-systems", "core-business-systems", "b2b", "cross-industry", "regulated", "subscription-revenue"],
  },
  {
    id: "sw-supply-chain",
    name: "Supply Chain & Procurement Software",
    industry: "Software & Internet",
    tags: ["software-product", "saas", "supply-chain-systems", "serves-logistics", "b2b", "enterprise-accounts", "cross-industry", "subscription-revenue"],
  },
  {
    id: "sw-collab",
    name: "Collaboration & Productivity Software",
    industry: "Software & Internet",
    tags: ["software-product", "saas", "collaboration-tools", "b2b", "b2c", "smb-accounts", "cross-industry", "subscription-revenue"],
  },
  {
    id: "sw-design-eng",
    name: "Design & Engineering Software",
    industry: "Software & Internet",
    tags: ["software-product", "design-engineering-tools", "b2b", "enterprise-accounts", "serves-industrial", "r-and-d-intensive", "subscription-revenue"],
  },
  {
    id: "sw-healthcare",
    name: "Healthcare Software",
    industry: "Software & Internet",
    tags: ["software-product", "saas", "serves-healthcare", "b2b", "enterprise-accounts", "regulated", "subscription-revenue"],
  },
  {
    id: "sw-fintech-software",
    name: "Banking & Financial Software",
    industry: "Software & Internet",
    tags: ["software-product", "saas", "serves-financial", "finance-systems", "b2b", "enterprise-accounts", "regulated", "subscription-revenue"],
  },
  {
    id: "sw-insurance",
    name: "Insurance Software",
    industry: "Software & Internet",
    tags: ["software-product", "saas", "serves-financial", "insurance-underwriting", "b2b", "enterprise-accounts", "regulated", "subscription-revenue"],
  },
  {
    id: "sw-retail-tech",
    name: "Retail & Commerce Software",
    industry: "Software & Internet",
    tags: ["software-product", "saas", "serves-retail", "b2b", "enterprise-accounts", "subscription-revenue"],
  },
  {
    id: "sw-telecom-software",
    name: "Telecom Software & Network Systems",
    industry: "Software & Internet",
    tags: ["software-product", "saas", "serves-telecom", "b2b", "enterprise-accounts", "subscription-revenue"],
  },
  {
    id: "sw-govtech",
    name: "Public Sector Software",
    industry: "Software & Internet",
    tags: ["software-product", "saas", "serves-public-sector", "b2g", "regulated", "project-revenue", "subscription-revenue"],
  },
  {
    id: "sw-edtech",
    name: "Education Technology",
    industry: "Software & Internet",
    tags: ["software-product", "saas", "serves-education", "education-services", "b2b", "b2c", "subscription-revenue"],
  },
  {
    id: "sw-construction-tech",
    name: "Construction & Real Estate Software",
    industry: "Software & Internet",
    tags: ["software-product", "saas", "serves-construction", "real-estate", "design-engineering-tools", "b2b", "enterprise-accounts", "subscription-revenue"],
  },
  {
    id: "sw-logistics-tech",
    name: "Logistics & Mobility Software",
    industry: "Software & Internet",
    tags: ["software-product", "saas", "serves-logistics", "supply-chain-systems", "b2b", "subscription-revenue"],
  },
  {
    id: "sw-travel-tech",
    name: "Travel & Hospitality Software",
    industry: "Software & Internet",
    tags: ["software-product", "saas", "travel-booking", "b2b", "transaction-revenue", "subscription-revenue"],
  },
  {
    id: "sw-payments",
    name: "Payments & Financial Infrastructure",
    industry: "Software & Internet",
    tags: ["software-product", "saas", "payments-processing", "fintech", "serves-financial", "serves-retail", "b2b", "transaction-revenue", "regulated"],
  },
  {
    id: "sw-marketplace",
    name: "Consumer Internet & Marketplace",
    industry: "Software & Internet",
    tags: ["platform-marketplace", "ecommerce", "advertising-services", "b2c", "transaction-revenue", "asset-light"],
  },
  {
    id: "sw-gaming",
    name: "Gaming & Interactive Entertainment",
    industry: "Software & Internet",
    tags: ["software-product", "content-ip-owner", "gaming", "entertainment-content", "b2c", "r-and-d-intensive"],
  },
  {
    id: "sw-it-services",
    name: "IT & Digital Engineering Services",
    industry: "Software & Internet",
    tags: ["services-firm", "outsourcing-bpo", "b2b", "enterprise-accounts", "cross-industry", "billable-hours", "project-revenue"],
  },
  {
    // Split out of sw-it-services: localization, translation, editorial and
    // data-annotation firms (Lionbridge, RWS, Straive, Jouve, i-Merit, Centific)
    // were tagged identically to systems integrators, so band-and-size ordering
    // mixed them. `content-language-services` is the one atom the sibling lacks;
    // the rest is the shared services core so an integrator stays a secondary
    // peer above the floor. Drops `billable-hours` — this is volume/project work,
    // not consultancy time-and-materials.
    id: "sw-content-services",
    name: "Localization & Content Services",
    industry: "Software & Internet",
    tags: ["services-firm", "outsourcing-bpo", "content-language-services", "b2b", "enterprise-accounts", "cross-industry", "project-revenue"],
  },
  {
    id: "sw-media-tech",
    name: "Media & Content Technology",
    industry: "Software & Internet",
    tags: ["software-product", "saas", "serves-media", "b2b", "subscription-revenue"],
  },
  {
    id: "sw-legal-compliance",
    name: "Legal, Contract & Compliance Software",
    industry: "Software & Internet",
    tags: ["software-product", "saas", "legal-services", "regulated", "cross-industry", "b2b", "enterprise-accounts", "subscription-revenue"],
  },
  {
    id: "sw-automotive-tech",
    name: "Automotive & Mobility Software",
    industry: "Software & Internet",
    tags: ["software-product", "embedded-software", "serves-automotive", "b2b", "r-and-d-intensive", "subscription-revenue"],
  },
];

/* ==========================================================================
   Manufacturing — 207 companies, 111 of them filed as "Industrial Manufacturing"
   ========================================================================== */
const MANUFACTURING: BusinessTypeSeed[] = [
  {
    id: "mfg-industrial-equipment",
    name: "Industrial Machinery & Equipment",
    industry: "Manufacturing",
    tags: ["discrete-manufacturing", "machinery-equipment", "serves-industrial", "b2b", "capital-intensive", "supply-chain-heavy"],
  },
  {
    id: "mfg-automation",
    name: "Industrial Automation & Controls",
    industry: "Manufacturing",
    tags: ["discrete-manufacturing", "industrial-automation", "embedded-software", "serves-industrial", "b2b", "r-and-d-intensive"],
  },
  {
    id: "mfg-electrical-equipment",
    name: "Electrical Equipment & Power Systems",
    industry: "Manufacturing",
    tags: ["discrete-manufacturing", "machinery-equipment", "grid-utilities", "serves-energy", "b2b", "capital-intensive"],
  },
  {
    id: "mfg-test-measurement",
    name: "Test & Measurement Instruments",
    industry: "Manufacturing",
    tags: ["discrete-manufacturing", "test-measurement", "electronic-components", "serves-industrial", "b2b", "r-and-d-intensive"],
  },
  {
    id: "mfg-conglomerate",
    name: "Diversified Industrial Conglomerate",
    industry: "Manufacturing",
    tags: ["discrete-manufacturing", "machinery-equipment", "cross-industry", "b2b", "capital-intensive", "supply-chain-heavy"],
  },
  {
    id: "mfg-hvac-building",
    name: "HVAC & Building Systems",
    industry: "Manufacturing",
    tags: ["discrete-manufacturing", "building-materials", "machinery-equipment", "serves-construction", "b2b", "field-operations"],
  },
  {
    id: "mfg-packaging",
    name: "Packaging Manufacturing",
    industry: "Manufacturing",
    tags: ["process-manufacturing", "packaging", "b2b", "supply-chain-heavy", "capital-intensive"],
  },
  {
    id: "mfg-metals",
    name: "Steel, Metals & Mining",
    industry: "Manufacturing",
    tags: ["process-manufacturing", "metals-steel", "mining", "commodity-chemicals", "b2b", "capital-intensive", "field-operations"],
  },
  {
    id: "mfg-building-products",
    name: "Building Products & Materials",
    industry: "Manufacturing",
    tags: ["discrete-manufacturing", "building-materials", "serves-construction", "b2b", "supply-chain-heavy"],
  },
  {
    id: "mfg-tools",
    name: "Tools & Hardware",
    industry: "Manufacturing",
    tags: ["discrete-manufacturing", "tools-hardware", "machinery-equipment", "b2b", "b2c", "supply-chain-heavy"],
  },
  {
    id: "mfg-agricultural-equipment",
    // Renamed to cover mining plant explicitly. The classification pass put
    // Metso, Weir and Normet here as heavy equipment, which is right — but under
    // the old name and without `mining` they carried `agriculture` and nothing
    // else, which would have made a mining-equipment maker read as a tractor
    // company.
    name: "Agricultural, Construction & Mining Equipment",
    industry: "Manufacturing",
    tags: ["discrete-manufacturing", "machinery-equipment", "agriculture", "mining", "engineering-construction", "b2b", "capital-intensive"],
  },
  {
    id: "mfg-electronics-components",
    // Added after classification: contract electronics manufacturers (Flex,
    // Jabil, Sanmina) and passive-component makers (TDK, Samsung Electro
    // Mechanics, TE Connectivity) had no honest home among the other twelve, and
    // were being pushed into `mfg-automation` on the word "electronics".
    name: "Electronics & Components Manufacturing",
    industry: "Manufacturing",
    tags: ["discrete-manufacturing", "electronic-components", "cross-industry", "supply-chain-heavy", "capital-intensive", "b2b"],
  },
  {
    id: "mfg-motion-control",
    name: "Motion, Flow & Control Components",
    industry: "Manufacturing",
    tags: ["discrete-manufacturing", "machinery-equipment", "vehicle-components", "industrial-automation", "serves-industrial", "b2b", "r-and-d-intensive"],
  },
  {
    id: "mfg-print-imaging",
    name: "Printing, Imaging & Document Systems",
    industry: "Manufacturing",
    tags: ["discrete-manufacturing", "hardware-product", "machinery-equipment", "b2b", "supply-chain-heavy"],
  },
];

/* ==========================================================================
   BFSI — 189 companies, 74 filed only as "Financial Services"
   ========================================================================== */
const BFSI: BusinessTypeSeed[] = [
  {
    id: "fin-retail-bank",
    name: "Retail & Commercial Banking",
    industry: "BFSI",
    tags: ["balance-sheet-risk", "banking-lending", "regulated", "b2c", "b2b", "transaction-revenue"],
  },
  {
    id: "fin-investment-bank",
    name: "Investment Banking & Capital Markets",
    industry: "BFSI",
    tags: ["balance-sheet-risk", "capital-markets", "asset-management", "regulated", "b2b", "enterprise-accounts", "transaction-revenue"],
  },
  {
    id: "fin-insurance-pc",
    name: "Property & Casualty Insurance",
    industry: "BFSI",
    tags: ["balance-sheet-risk", "insurance-underwriting", "regulated", "b2c", "b2b"],
  },
  {
    id: "fin-insurance-life",
    name: "Life & Health Insurance",
    industry: "BFSI",
    tags: ["balance-sheet-risk", "insurance-underwriting", "health-payer", "regulated", "b2c"],
  },
  {
    id: "fin-asset-management",
    name: "Asset & Investment Management",
    industry: "BFSI",
    tags: ["asset-management", "capital-markets", "regulated", "b2b", "b2c", "asset-light"],
  },
  {
    // Split from "Asset & investment management", which ranked within itself by
    // band and size alone: fund administrators (Citco, IQ-EQ, Alter Domus, Apex,
    // AMICORP, Formidium, FNZ) and custody/asset-servicing banks (BNY, State
    // Street, Northern Trust) were tagged identically to BlackRock and KKR, so a
    // fund-administration visitor saw PE and mutual-fund houses ahead of its true
    // back-office peers. These are services businesses, not principals: they run
    // fund accounting, transfer agency and custody FOR asset managers. The two
    // atoms below — `services-firm` and `outsourcing-bpo` — are what an asset
    // manager lacks, and both are rare in BFSI (nothing else here carries
    // `outsourcing-bpo`), so a fund-services visitor ranks fund-services firms
    // first. Deliberately NOT tagged `asset-management`: that is the atom the
    // asset-management visitor carries and these firms lack, which is what keeps
    // BlackRock above a fund administrator for an asset-management visitor. The
    // shared core (`capital-markets`, `regulated`, `b2b`, `asset-light`) keeps
    // each a secondary peer of the other above the 0.20 floor, so no set shortens.
    // Custody banks keep no `balance-sheet-risk` here for the same reason the
    // insurance broker does not: their GCC work is servicing, not principal risk.
    // The finer split is world knowledge, not in the source — flagged for ANSR.
    id: "fin-fund-services",
    name: "Fund Administration & Asset Servicing",
    industry: "BFSI",
    tags: ["services-firm", "outsourcing-bpo", "capital-markets", "regulated", "b2b", "asset-light"],
  },
  {
    // Split from a single "Payments & card networks" bucket that ranked within
    // itself by band and size alone: every payments company carried an identical
    // tag set, so a merchant-acquirer visitor (a Stripe) saw card networks and
    // money-transfer firms ahead of its true peers. The four types below each
    // carry one atom the other three lack — the only way businessSimilarity, which
    // scores the share of the VISITOR's tags a company shares, can rank a true peer
    // first. All four keep the shared payments core, so a sibling stays above the
    // 0.20 floor as a secondary peer rather than dropping out. No new tag was
    // needed; the distinguishers are existing atoms. See docs/business-types.md.
    id: "fin-payments",
    // Merchant acquiring and gateways — the Adyen/Worldline/Stripe cluster.
    // `serves-retail` (merchants) is the atom card networks and remittance lack.
    name: "Payment Processing & Gateways",
    industry: "BFSI",
    tags: ["payments-processing", "fintech", "serves-retail", "regulated", "transaction-revenue", "b2b"],
  },
  {
    // `network-operator` (the scheme itself) is what a card network has and an
    // acquirer, a remittance firm and a card programme do not.
    id: "fin-card-network",
    name: "Card Networks & Schemes",
    industry: "BFSI",
    tags: ["payments-processing", "fintech", "network-operator", "regulated", "transaction-revenue", "b2b"],
  },
  {
    // `b2c` is the distinguisher: consumer cross-border money movement. The other
    // three payments types are b2b-only, so a remittance visitor ranks remittance
    // firms first.
    id: "fin-money-transfer",
    name: "Money Transfer & Remittance",
    industry: "BFSI",
    tags: ["payments-processing", "fintech", "regulated", "transaction-revenue", "b2c", "b2b"],
  },
  {
    // Spend and expense management IS a finance system; `finance-systems` is the
    // atom that separates Corpay/WEX/Pleo from acquirers and networks.
    id: "fin-expense-cards",
    name: "Commercial & Expense Cards",
    industry: "BFSI",
    tags: ["payments-processing", "fintech", "finance-systems", "regulated", "transaction-revenue", "b2b"],
  },
  {
    id: "fin-fintech-lending",
    name: "Fintech & Digital Lending",
    industry: "BFSI",
    tags: ["fintech", "balance-sheet-risk", "banking-lending", "platform-marketplace", "regulated", "b2c"],
  },
  {
    id: "fin-market-data",
    name: "Financial Data & Credit Information",
    industry: "BFSI",
    tags: ["credit-data", "data-analytics", "capital-markets", "b2b", "subscription-revenue", "regulated"],
  },
  {
    id: "fin-exchange",
    name: "Exchanges & Trading Venues",
    industry: "BFSI",
    tags: ["capital-markets", "platform-marketplace", "regulated", "transaction-revenue", "b2b"],
  },
  {
    id: "fin-insurance-broker",
    // Added after classification. Aon, Marsh, Gallagher, WTW and Sedgwick were
    // all being filed as P&C insurers, which hands them `balance-sheet-risk` — a
    // claim that is simply false for a broker, and the one tag that most defines
    // an underwriter's operation. A broker sells distribution and claims
    // handling; the risk sits with someone else.
    name: "Insurance Broking & Claims Services",
    industry: "BFSI",
    tags: ["services-firm", "insurance-underwriting", "regulated", "billable-hours", "enterprise-accounts", "b2b"],
  },
  {
    id: "fin-software-services",
    // Added after classification: Broadridge, MX, Smartstream, Candescent, Finzly
    // and Lean are technology vendors TO financial institutions, not financial
    // institutions. Their nearest peer is each other, not a bank.
    name: "Financial Technology & Processing Services",
    industry: "BFSI",
    tags: ["software-product", "saas", "serves-financial", "regulated", "enterprise-accounts", "subscription-revenue", "b2b"],
  },
];

/* ==========================================================================
   Healthcare & Lifescience — 135 companies
   ========================================================================== */
const HEALTHCARE: BusinessTypeSeed[] = [
  {
    id: "hc-pharma",
    name: "Pharmaceuticals",
    industry: "Healthcare & Lifescience",
    tags: ["process-manufacturing", "pharmaceutical", "biotech", "clinical-research", "clinical-regulated", "regulated", "r-and-d-intensive", "supply-chain-heavy", "b2b"],
  },
  {
    // Split out of hc-pharma: consumer-health / OTC businesses (Haleon, Kenvue,
    // Opella) share the pharma core but are branded consumer-goods operations, not
    // innovator drug makers. The distinguishers a consumer-health visitor holds and
    // an innovator lacks are `brand-owner`, `personal-care` and `b2c` — none of the
    // other Healthcare types carries the first two, so both are maximally rare (and
    // heavily IDF-weighted) inside this industry. Deliberately drops the clinical /
    // R&D atoms (`clinical-research`, `clinical-regulated`, `biotech`,
    // `r-and-d-intensive`, `b2b`) that define an innovator, which is the reverse
    // distinguisher. Keeps the shared core (process-manufacturing, pharmaceutical,
    // regulated, supply-chain-heavy) so each side stays a secondary peer of the
    // other above the 0.20 floor. See docs/business-types.md.
    id: "hc-consumer-health",
    name: "Consumer Health & OTC",
    industry: "Healthcare & Lifescience",
    tags: ["process-manufacturing", "brand-owner", "pharmaceutical", "personal-care", "regulated", "supply-chain-heavy", "b2c"],
  },
  {
    id: "hc-biotech",
    name: "Biotechnology",
    industry: "Healthcare & Lifescience",
    tags: ["biotech", "pharmaceutical", "clinical-regulated", "regulated", "r-and-d-intensive", "b2b"],
  },
  {
    id: "hc-medical-devices",
    name: "Medical Devices",
    industry: "Healthcare & Lifescience",
    tags: ["discrete-manufacturing", "medical-device", "diagnostics", "clinical-regulated", "regulated", "safety-critical", "r-and-d-intensive", "b2b"],
  },
  {
    id: "hc-diagnostics",
    name: "Diagnostics & Laboratory Services",
    industry: "Healthcare & Lifescience",
    tags: ["services-firm", "diagnostics", "clinical-regulated", "regulated", "field-operations", "b2b", "b2c"],
  },
  {
    id: "hc-provider",
    name: "Hospitals & Care Delivery",
    industry: "Healthcare & Lifescience",
    tags: ["services-firm", "hospital-care", "clinical-regulated", "regulated", "field-operations", "b2c"],
  },
  {
    id: "hc-cro",
    name: "Clinical Research & Development Services",
    industry: "Healthcare & Lifescience",
    tags: ["services-firm", "clinical-research", "clinical-regulated", "regulated", "billable-hours", "project-revenue", "r-and-d-intensive", "b2b"],
  },
  {
    id: "hc-life-science-tools",
    name: "Life Sciences Tools & Instruments",
    industry: "Healthcare & Lifescience",
    tags: ["discrete-manufacturing", "test-measurement", "medical-device", "clinical-regulated", "r-and-d-intensive", "b2b"],
  },
  {
    id: "hc-pharma-distribution",
    name: "Pharmaceutical Distribution",
    industry: "Healthcare & Lifescience",
    tags: ["wholesale-distribution", "pharmaceutical", "regulated", "supply-chain-heavy", "b2b"],
  },
  {
    id: "hc-payer",
    name: "Health Insurance & Benefits Management",
    industry: "Healthcare & Lifescience",
    tags: ["balance-sheet-risk", "health-payer", "insurance-underwriting", "serves-healthcare", "regulated", "b2b"],
  },
  {
    id: "hc-health-it",
    name: "Health Information & Care Platforms",
    industry: "Healthcare & Lifescience",
    tags: ["software-product", "saas", "serves-healthcare", "hospital-care", "regulated", "subscription-revenue", "b2b"],
  },
];

/* ==========================================================================
   Automotive — 76 companies
   ========================================================================== */
const AUTOMOTIVE: BusinessTypeSeed[] = [
  {
    id: "auto-oem",
    name: "Vehicle Manufacturer (OEM)",
    industry: "Automotive",
    tags: ["discrete-manufacturing", "vehicle-oem", "b2c", "capital-intensive", "supply-chain-heavy", "safety-critical", "r-and-d-intensive"],
  },
  {
    id: "auto-commercial-oem",
    name: "Commercial Vehicle & Truck Manufacturer",
    industry: "Automotive",
    tags: ["discrete-manufacturing", "vehicle-oem", "b2b", "capital-intensive", "supply-chain-heavy", "safety-critical"],
  },
  {
    id: "auto-ev",
    name: "Electric Vehicle Manufacturer",
    industry: "Automotive",
    tags: ["discrete-manufacturing", "vehicle-oem", "electric-vehicles", "b2c", "r-and-d-intensive", "capital-intensive"],
  },
  {
    id: "auto-components",
    name: "Automotive Components (Tier 1)",
    industry: "Automotive",
    tags: ["discrete-manufacturing", "vehicle-components", "electric-vehicles", "serves-automotive", "b2b", "supply-chain-heavy", "safety-critical"],
  },
  {
    id: "auto-software",
    // Renamed away from "Automotive & mobility software", which was character-for
    // character identical to `sw-automotive-tech`. A visitor never sees both, since
    // the dropdown is filtered to their industry — but an admin sees the whole
    // catalogue, and two identically named types are unmaintainable.
    name: "In-Vehicle Software & Electronics",
    industry: "Automotive",
    tags: ["software-product", "embedded-software", "serves-automotive", "b2b", "r-and-d-intensive", "safety-critical"],
  },
  {
    id: "auto-engineering-services",
    name: "Automotive Engineering Services",
    industry: "Automotive",
    tags: ["services-firm", "serves-automotive", "design-engineering-tools", "project-revenue", "billable-hours", "b2b"],
  },
];

/* ==========================================================================
   Telecom — 76 companies
   ========================================================================== */
const TELECOM: BusinessTypeSeed[] = [
  {
    id: "tel-operator",
    name: "Telecom Network Operator",
    industry: "Telecom",
    tags: ["network-operator", "telecom-services", "regulated", "capital-intensive", "b2c", "b2b", "subscription-revenue"],
  },
  {
    id: "tel-equipment",
    name: "Telecom & Networking Equipment",
    industry: "Telecom",
    tags: ["hardware-product", "telecom-equipment", "networking-tech", "serves-telecom", "b2b", "r-and-d-intensive"],
  },
  {
    id: "tel-satellite",
    name: "Satellite & Space Communications",
    industry: "Telecom",
    tags: ["network-operator", "telecom-services", "aerospace", "capital-intensive", "regulated", "b2b", "b2g"],
  },
  {
    id: "tel-cpaas",
    name: "Communications Platforms & APIs",
    industry: "Telecom",
    tags: ["saas", "software-product", "telecom-services", "developer-tools", "transaction-revenue", "asset-light", "b2b"],
  },
  {
    id: "tel-infrastructure",
    name: "Network Infrastructure & Managed Services",
    industry: "Telecom",
    tags: ["services-firm", "telecom-services", "telecom-equipment", "serves-telecom", "project-revenue", "field-operations", "b2b"],
  },
];

/* ==========================================================================
   Semiconductors — 72 companies
   ========================================================================== */
const SEMICONDUCTORS: BusinessTypeSeed[] = [
  {
    id: "semi-fabless",
    name: "Fabless Chip Design",
    industry: "Semiconductors",
    tags: ["fabless-design", "semiconductor", "hardware-product", "ip-licensing", "r-and-d-intensive", "asset-light", "b2b"],
  },
  {
    id: "semi-foundry",
    name: "Semiconductor Manufacturing & Foundry",
    industry: "Semiconductors",
    tags: ["process-manufacturing", "semiconductor", "capital-intensive", "supply-chain-heavy", "b2b"],
  },
  {
    id: "semi-equipment",
    name: "Semiconductor Equipment & Materials",
    industry: "Semiconductors",
    tags: ["discrete-manufacturing", "semiconductor", "machinery-equipment", "capital-intensive", "r-and-d-intensive", "b2b"],
  },
  {
    id: "semi-ip",
    name: "Semiconductor IP & Design Tools",
    industry: "Semiconductors",
    tags: ["semiconductor", "ip-licensing", "software-product", "design-engineering-tools", "r-and-d-intensive", "asset-light", "b2b"],
  },
  {
    id: "semi-analog",
    name: "Analog, Power & Mixed-Signal Semiconductors",
    industry: "Semiconductors",
    tags: ["semiconductor", "fabless-design", "electronic-components", "hardware-product", "r-and-d-intensive", "b2b"],
  },
  {
    id: "semi-components",
    name: "Electronic Components & Photonics",
    industry: "Semiconductors",
    tags: ["electronic-components", "semiconductor", "discrete-manufacturing", "hardware-product", "b2b"],
  },
];

/* ==========================================================================
   Retail — 60 companies, and the industry the whole change was prompted by

   `ret-apparel`, `ret-sportswear` and `ret-luxury` share `apparel`, `footwear`
   and `fashion-cycle`; `ret-home-improvement` shares none of them. That is the
   Nike-beside-a-home-improvement-chain problem, fixed in the data rather than in
   a special case.
   ========================================================================== */
const RETAIL: BusinessTypeSeed[] = [
  {
    id: "ret-apparel",
    name: "Apparel & Footwear Brand",
    industry: "Retail",
    tags: ["brand-owner", "apparel", "footwear", "fashion-cycle", "dtc", "physical-stores", "supply-chain-heavy", "b2c"],
  },
  {
    id: "ret-sportswear",
    name: "Sportswear & Athletic Brand",
    industry: "Retail",
    tags: ["brand-owner", "sporting-goods", "apparel", "footwear", "fashion-cycle", "dtc", "physical-stores", "supply-chain-heavy", "b2c"],
  },
  {
    id: "ret-luxury",
    name: "Luxury & Premium Brand",
    industry: "Retail",
    tags: ["brand-owner", "luxury", "apparel", "footwear", "fashion-cycle", "dtc", "physical-stores", "b2c"],
  },
  {
    id: "ret-grocery",
    name: "Grocery & Convenience Retail",
    industry: "Retail",
    tags: ["retail-operator", "packaged-food", "perishable-goods", "physical-stores", "supply-chain-heavy", "b2c"],
  },
  {
    id: "ret-home-improvement",
    name: "Home Improvement & Furnishings Retail",
    industry: "Retail",
    tags: ["retail-operator", "building-materials", "household-products", "physical-stores", "supply-chain-heavy", "b2c"],
  },
  {
    id: "ret-general-merchandise",
    name: "Department Store & General Merchandise",
    industry: "Retail",
    tags: ["retail-operator", "household-products", "physical-stores", "supply-chain-heavy", "b2c"],
  },
  {
    id: "ret-ecommerce",
    name: "E-Commerce & Online Retail",
    industry: "Retail",
    tags: ["retail-operator", "ecommerce", "platform-marketplace", "dtc", "supply-chain-heavy", "transaction-revenue", "b2c"],
  },
  {
    id: "ret-specialty",
    name: "Specialty Retail",
    industry: "Retail",
    tags: ["retail-operator", "sporting-goods", "physical-stores", "dtc", "supply-chain-heavy", "b2c"],
  },
  {
    id: "ret-consumer-brand",
    name: "Consumer Products Brand",
    industry: "Retail",
    tags: ["brand-owner", "household-products", "personal-care", "dtc", "supply-chain-heavy", "b2c"],
  },
  {
    id: "ret-auto-parts",
    name: "Automotive Parts Retail & Distribution",
    industry: "Retail",
    tags: ["retail-operator", "wholesale-distribution", "vehicle-components", "physical-stores", "supply-chain-heavy", "b2c"],
  },
];

/* ==========================================================================
   Media & Entertainment — 58 companies
   ========================================================================== */
const MEDIA: BusinessTypeSeed[] = [
  {
    id: "med-broadcast",
    name: "Broadcasting & Studios",
    industry: "Media & Entertainment",
    tags: ["content-ip-owner", "entertainment-content", "ip-licensing", "advertising-services", "capital-intensive", "b2c"],
  },
  {
    id: "med-publishing",
    name: "Publishing & News",
    industry: "Media & Entertainment",
    tags: ["content-ip-owner", "publishing", "entertainment-content", "subscription-revenue", "b2c", "b2b"],
  },
  {
    id: "med-advertising",
    name: "Advertising & Marketing Services",
    industry: "Media & Entertainment",
    tags: ["services-firm", "advertising-services", "billable-hours", "project-revenue", "enterprise-accounts", "b2b"],
  },
  {
    id: "med-adtech",
    name: "Advertising Technology & Measurement",
    industry: "Media & Entertainment",
    tags: ["software-product", "saas", "marketing-adtech", "advertising-services", "data-analytics", "serves-media", "transaction-revenue", "b2b"],
  },
  {
    id: "med-gaming",
    name: "Gaming & Esports",
    industry: "Media & Entertainment",
    tags: ["content-ip-owner", "gaming", "entertainment-content", "software-product", "r-and-d-intensive", "b2c"],
  },
  {
    id: "med-gambling",
    name: "Online Gambling & Betting",
    industry: "Media & Entertainment",
    tags: ["platform-marketplace", "gaming", "regulated", "transaction-revenue", "b2c"],
  },
  {
    id: "med-information-services",
    name: "Information & Research Services",
    industry: "Media & Entertainment",
    tags: ["services-firm", "market-research", "data-analytics", "credit-data", "publishing", "subscription-revenue", "b2b"],
  },
];

/* ==========================================================================
   Professional Services — 45 companies
   ========================================================================== */
const PROFESSIONAL: BusinessTypeSeed[] = [
  {
    id: "prof-accounting",
    name: "Accounting, Audit & Tax",
    industry: "Professional Services",
    tags: ["services-firm", "accounting-audit", "regulated", "billable-hours", "enterprise-accounts", "b2b"],
  },
  {
    id: "prof-legal",
    name: "Legal Services",
    industry: "Professional Services",
    tags: ["services-firm", "legal-services", "regulated", "billable-hours", "enterprise-accounts", "b2b"],
  },
  {
    id: "prof-consulting",
    name: "Management & Strategy Consulting",
    industry: "Professional Services",
    tags: ["services-firm", "consulting", "accounting-audit", "billable-hours", "project-revenue", "enterprise-accounts", "b2b"],
  },
  {
    id: "prof-engineering-consulting",
    name: "Engineering & Technical Consulting",
    industry: "Professional Services",
    tags: ["services-firm", "consulting", "engineering-construction", "project-revenue", "billable-hours", "b2b"],
  },
  {
    id: "prof-staffing",
    name: "Staffing & Workforce Services",
    industry: "Professional Services",
    tags: ["services-firm", "staffing-workforce", "hr-workforce-systems", "outsourcing-bpo", "cross-industry", "b2b"],
  },
  {
    id: "prof-bpo",
    name: "Business Process Outsourcing",
    industry: "Professional Services",
    // Carries `content-language-services` as the second holder of that atom (the
    // >=2-types rule): BPO content moderation, document processing and
    // multilingual support are the same labour a localization shop sells.
    tags: ["services-firm", "outsourcing-bpo", "content-language-services", "staffing-workforce", "cross-industry", "project-revenue", "enterprise-accounts", "b2b"],
  },
  {
    id: "prof-market-research",
    name: "Market Research & Consumer Intelligence",
    industry: "Professional Services",
    tags: ["services-firm", "market-research", "data-analytics", "subscription-revenue", "b2b"],
  },
  {
    id: "prof-facilities",
    name: "Facilities & Real Estate Services",
    industry: "Professional Services",
    tags: ["services-firm", "real-estate", "field-operations", "project-revenue", "b2b"],
  },
  {
    id: "prof-marketing-services",
    // Added on vetting. "Advertising Services", "Marketing Services", "Media &
    // Advertising" and "Agency" were all collapsing into `prof-consulting`, which
    // made the management-consulting peer set majority advertising agencies. The
    // work is agency work; `med-advertising` was unreachable because it belongs to
    // a different industry.
    name: "Advertising & Marketing Services",
    industry: "Professional Services",
    tags: ["services-firm", "advertising-services", "billable-hours", "project-revenue", "enterprise-accounts", "b2b"],
  },
  {
    id: "prof-compliance",
    name: "Regulatory & Compliance Services",
    industry: "Professional Services",
    tags: ["services-firm", "legal-services", "consulting", "serves-public-sector", "regulated", "billable-hours", "b2b"],
  },
];

/* ==========================================================================
   Chemicals & Materials — 43 companies
   ========================================================================== */
const CHEMICALS: BusinessTypeSeed[] = [
  {
    id: "chem-specialty",
    name: "Specialty Chemicals",
    industry: "Chemicals & Materials",
    tags: ["process-manufacturing", "specialty-chemicals", "capital-intensive", "r-and-d-intensive", "supply-chain-heavy", "b2b"],
  },
  {
    id: "chem-commodity",
    name: "Commodity & Petrochemicals",
    industry: "Chemicals & Materials",
    tags: ["process-manufacturing", "commodity-chemicals", "oil-gas", "capital-intensive", "b2b"],
  },
  {
    id: "chem-coatings",
    name: "Paints & Coatings",
    industry: "Chemicals & Materials",
    tags: ["process-manufacturing", "specialty-chemicals", "building-materials", "supply-chain-heavy", "b2b", "b2c"],
  },
  {
    id: "chem-agrochemicals",
    name: "Agrochemicals & Seeds",
    industry: "Chemicals & Materials",
    tags: ["process-manufacturing", "agrochemicals", "agriculture", "regulated", "r-and-d-intensive", "b2b"],
  },
  {
    id: "chem-industrial-gases",
    name: "Industrial Gases",
    industry: "Chemicals & Materials",
    tags: ["process-manufacturing", "commodity-chemicals", "capital-intensive", "field-operations", "b2b"],
  },
  {
    id: "chem-flavours",
    name: "Flavours, Fragrances & Ingredients",
    industry: "Chemicals & Materials",
    tags: ["process-manufacturing", "specialty-chemicals", "packaged-food", "r-and-d-intensive", "b2b"],
  },
  {
    id: "chem-packaging",
    name: "Industrial Packaging Materials",
    industry: "Chemicals & Materials",
    tags: ["process-manufacturing", "packaging", "supply-chain-heavy", "capital-intensive", "b2b"],
  },
];

/* ==========================================================================
   Energy & Utilities — 36 companies
   ========================================================================== */
const ENERGY: BusinessTypeSeed[] = [
  {
    id: "enr-oil-gas",
    name: "Integrated Oil & Gas",
    industry: "Energy & Utilities",
    tags: ["process-manufacturing", "oil-gas", "capital-intensive", "regulated", "field-operations", "b2b"],
  },
  {
    id: "enr-oilfield-services",
    name: "Oilfield & Energy Services",
    industry: "Energy & Utilities",
    tags: ["services-firm", "oil-gas", "field-operations", "project-revenue", "b2b"],
  },
  {
    id: "enr-power-generation",
    name: "Power Generation",
    industry: "Energy & Utilities",
    tags: ["power-generation", "grid-utilities", "capital-intensive", "regulated", "field-operations", "b2b"],
  },
  {
    id: "enr-renewables",
    name: "Renewable Energy",
    industry: "Energy & Utilities",
    tags: ["power-generation", "renewables", "grid-utilities", "capital-intensive", "r-and-d-intensive", "b2b"],
  },
  {
    id: "enr-utilities",
    name: "Utilities & Grid Operations",
    industry: "Energy & Utilities",
    tags: ["network-operator", "grid-utilities", "regulated", "capital-intensive", "field-operations", "b2c"],
  },
  {
    id: "enr-energy-equipment",
    name: "Energy Equipment & Technology",
    industry: "Energy & Utilities",
    tags: ["discrete-manufacturing", "machinery-equipment", "renewables", "grid-utilities", "serves-energy", "capital-intensive", "b2b"],
  },
];

/* ==========================================================================
   Logistics & Transportation — 31 companies
   ========================================================================== */
const LOGISTICS: BusinessTypeSeed[] = [
  {
    id: "log-freight",
    name: "Freight Forwarding & Third-Party Logistics",
    industry: "Logistics & Transportation",
    tags: ["services-firm", "freight-logistics", "supply-chain-heavy", "asset-light", "transaction-revenue", "b2b"],
  },
  {
    id: "log-maritime",
    name: "Shipping & Maritime Transport",
    industry: "Logistics & Transportation",
    tags: ["network-operator", "shipping-maritime", "freight-logistics", "capital-intensive", "field-operations", "b2b"],
  },
  {
    id: "log-express",
    name: "Express & Parcel Delivery",
    industry: "Logistics & Transportation",
    tags: ["network-operator", "freight-logistics", "capital-intensive", "field-operations", "b2c", "b2b"],
  },
  {
    id: "log-rail",
    name: "Rail & Surface Transport",
    industry: "Logistics & Transportation",
    tags: ["network-operator", "freight-logistics", "capital-intensive", "regulated", "field-operations", "b2b"],
  },
  {
    id: "log-ports",
    name: "Ports & Terminal Operations",
    industry: "Logistics & Transportation",
    tags: ["network-operator", "shipping-maritime", "civil-infrastructure", "capital-intensive", "field-operations", "b2b"],
  },
];

/* ==========================================================================
   Architecture, Engineering, & Construction — 29 companies
   ========================================================================== */
const AEC: BusinessTypeSeed[] = [
  {
    id: "aec-engineering",
    name: "Engineering & Design Services",
    industry: "Architecture, Engineering, & Construction",
    tags: ["services-firm", "engineering-construction", "civil-infrastructure", "project-revenue", "billable-hours", "b2b"],
  },
  {
    id: "aec-construction",
    name: "Construction & Contracting",
    industry: "Architecture, Engineering, & Construction",
    tags: ["services-firm", "engineering-construction", "civil-infrastructure", "project-revenue", "field-operations", "capital-intensive", "b2b"],
  },
  {
    id: "aec-construction-equipment",
    name: "Construction Equipment & Materials",
    industry: "Architecture, Engineering, & Construction",
    tags: ["discrete-manufacturing", "machinery-equipment", "building-materials", "engineering-construction", "b2b"],
  },
  {
    id: "aec-shipbuilding",
    name: "Shipbuilding & Marine Engineering",
    industry: "Architecture, Engineering, & Construction",
    // `metals-steel` is not decoration: a shipyard is heavy steel fabrication
    // before it is anything else, which is what makes it adjacent to a steelmaker
    // rather than to an architecture practice.
    tags: ["discrete-manufacturing", "shipping-maritime", "engineering-construction", "metals-steel", "defense", "capital-intensive", "b2b"],
  },
];

/* ==========================================================================
   Consumer Electronics — 29 companies
   ========================================================================== */
const CONSUMER_ELECTRONICS: BusinessTypeSeed[] = [
  {
    id: "ce-devices",
    name: "Consumer Electronics & Devices",
    industry: "Consumer Electronics",
    tags: ["hardware-product", "consumer-devices", "brand-owner", "supply-chain-heavy", "r-and-d-intensive", "b2c"],
  },
  {
    id: "ce-computing",
    name: "Computing Hardware & Servers",
    industry: "Consumer Electronics",
    tags: ["hardware-product", "computing-hardware", "consumer-devices", "storage-compute-hardware", "supply-chain-heavy", "b2b", "b2c"],
  },
  {
    id: "ce-storage",
    name: "Enterprise Storage & Data Centre Hardware",
    industry: "Consumer Electronics",
    tags: ["hardware-product", "storage-compute-hardware", "computing-hardware", "cloud-infrastructure", "enterprise-accounts", "b2b"],
  },
  {
    id: "ce-appliances",
    name: "Home Appliances",
    industry: "Consumer Electronics",
    tags: ["discrete-manufacturing", "appliances", "brand-owner", "physical-stores", "supply-chain-heavy", "b2c"],
  },
];

/* ==========================================================================
   Consumer Packaged Goods — 24 companies
   ========================================================================== */
const CPG: BusinessTypeSeed[] = [
  {
    id: "cpg-food",
    name: "Packaged Food",
    industry: "Consumer Packaged Goods",
    tags: ["process-manufacturing", "packaged-food", "food-processing", "brand-owner", "perishable-goods", "supply-chain-heavy", "b2c"],
  },
  {
    id: "cpg-beverages",
    name: "Beverages & Brewing",
    industry: "Consumer Packaged Goods",
    tags: ["process-manufacturing", "beverages", "brand-owner", "capital-intensive", "supply-chain-heavy", "b2c"],
  },
  {
    id: "cpg-personal-care",
    name: "Personal Care & Beauty",
    industry: "Consumer Packaged Goods",
    tags: ["process-manufacturing", "personal-care", "luxury", "brand-owner", "dtc", "supply-chain-heavy", "b2c"],
  },
  {
    id: "cpg-home-care",
    name: "Household & Home Care Products",
    industry: "Consumer Packaged Goods",
    tags: ["process-manufacturing", "household-products", "brand-owner", "supply-chain-heavy", "b2c"],
  },
  {
    id: "cpg-diversified",
    name: "Diversified Consumer Goods",
    industry: "Consumer Packaged Goods",
    tags: ["process-manufacturing", "brand-owner", "household-products", "personal-care", "packaged-food", "beverages", "supply-chain-heavy", "b2c"],
  },
];

/* ==========================================================================
   Aerospace & Defense — 18 companies
   ========================================================================== */
const AEROSPACE: BusinessTypeSeed[] = [
  {
    id: "aero-components",
    name: "Aerospace Components & Systems",
    industry: "Aerospace & Defense",
    tags: ["discrete-manufacturing", "aerospace", "safety-critical", "r-and-d-intensive", "supply-chain-heavy", "b2b"],
  },
  {
    id: "aero-primes",
    name: "Aerospace & Defense Primes",
    industry: "Aerospace & Defense",
    tags: ["discrete-manufacturing", "aerospace", "defense", "safety-critical", "capital-intensive", "project-revenue", "b2g"],
  },
  {
    id: "aero-engines",
    name: "Aircraft Engines & Propulsion",
    industry: "Aerospace & Defense",
    tags: ["discrete-manufacturing", "aerospace", "machinery-equipment", "safety-critical", "r-and-d-intensive", "capital-intensive", "b2b"],
  },
  {
    id: "aero-defense-electronics",
    name: "Defense Electronics & Systems",
    industry: "Aerospace & Defense",
    tags: ["discrete-manufacturing", "defense", "electronic-components", "safety-critical", "r-and-d-intensive", "b2g"],
  },
];

/* ==========================================================================
   Travel & Hospitality — 15 companies
   ========================================================================== */
const TRAVEL: BusinessTypeSeed[] = [
  {
    id: "trv-hotels",
    name: "Hotels & Hospitality Operations",
    industry: "Travel & Hospitality",
    tags: ["services-firm", "hospitality-operations", "field-operations", "capital-intensive", "physical-stores", "b2c"],
  },
  {
    id: "trv-agency",
    name: "Travel Services & Booking",
    industry: "Travel & Hospitality",
    tags: ["platform-marketplace", "travel-booking", "transaction-revenue", "asset-light", "b2c"],
  },
  {
    id: "trv-mobility",
    name: "Car Rental & Ride Hailing",
    industry: "Travel & Hospitality",
    tags: ["platform-marketplace", "travel-booking", "transaction-revenue", "field-operations", "asset-light", "b2c"],
  },
];

/* ==========================================================================
   The remaining industries. Small enough that one or two types each is the whole
   picture — and, per the design, that costs nothing: a type with two members
   still produces a full peer set through tag adjacency.
   ========================================================================== */
const REMAINDER: BusinessTypeSeed[] = [
  {
    id: "agr-food-processing",
    name: "Food Processing",
    industry: "Agribusiness & Food Processing",
    tags: ["process-manufacturing", "food-processing", "packaged-food", "agriculture", "perishable-goods", "supply-chain-heavy", "b2b"],
  },
  {
    id: "agr-agribusiness",
    name: "Agribusiness & Commodities",
    industry: "Agribusiness & Food Processing",
    tags: ["agriculture", "process-manufacturing", "agrochemicals", "commodity-chemicals", "supply-chain-heavy", "b2b"],
  },
  {
    id: "avi-airline",
    name: "Airline Operations",
    industry: "Aviation",
    tags: ["network-operator", "airline-operations", "capital-intensive", "regulated", "safety-critical", "field-operations", "b2c"],
  },
  {
    id: "avi-services",
    name: "Aviation Services & Maintenance",
    industry: "Aviation",
    tags: ["services-firm", "airline-operations", "aerospace", "safety-critical", "field-operations", "b2b"],
  },
  {
    id: "edu-institution",
    name: "Education & Training Provider",
    industry: "Education",
    tags: ["services-firm", "education-services", "field-operations", "b2c", "b2b"],
  },
  {
    id: "edu-edtech",
    name: "Education Technology & E-Learning",
    industry: "Education",
    tags: ["saas", "software-product", "education-services", "serves-education", "subscription-revenue", "b2c"],
  },
  {
    id: "whl-industrial-supplies",
    name: "Industrial Supplies Distribution",
    industry: "Wholesale",
    tags: ["wholesale-distribution", "tools-hardware", "serves-industrial", "supply-chain-heavy", "b2b"],
  },
  {
    id: "whl-building-materials",
    name: "Building Materials Distribution",
    industry: "Wholesale",
    tags: ["wholesale-distribution", "building-materials", "serves-construction", "supply-chain-heavy", "b2b"],
  },
  {
    id: "rst-qsr",
    name: "Quick Service Restaurants",
    industry: "Restaurant & Food Service",
    tags: ["restaurant-operations", "brand-owner", "physical-stores", "field-operations", "perishable-goods", "b2c"],
  },
  {
    id: "rst-dining",
    name: "Restaurant Chains & Food Service",
    industry: "Restaurant & Food Service",
    tags: ["restaurant-operations", "services-firm", "hospitality-operations", "physical-stores", "field-operations", "perishable-goods", "b2c"],
  },
  {
    id: "ele-electrical-products",
    name: "Electrical Products & Components",
    industry: "Electrical & Electronics",
    tags: ["discrete-manufacturing", "electronic-components", "appliances", "supply-chain-heavy", "b2b"],
  },
];

/**
 * The seed catalogue, flattened. Order within an industry is the order the
 * public dropdown offers, so the broadest types lead.
 */
export const BUSINESS_TYPE_CATALOGUE: readonly BusinessTypeSeed[] = [
  ...SOFTWARE,
  ...MANUFACTURING,
  ...BFSI,
  ...HEALTHCARE,
  ...AUTOMOTIVE,
  ...TELECOM,
  ...SEMICONDUCTORS,
  ...RETAIL,
  ...MEDIA,
  ...PROFESSIONAL,
  ...CHEMICALS,
  ...ENERGY,
  ...LOGISTICS,
  ...AEC,
  ...CONSUMER_ELECTRONICS,
  ...CPG,
  ...AEROSPACE,
  ...TRAVEL,
  ...REMAINDER,
];
