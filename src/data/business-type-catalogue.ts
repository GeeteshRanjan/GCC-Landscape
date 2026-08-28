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
    name: "Data & analytics platform",
    industry: "Software & Internet",
    tags: ["software-product", "saas", "data-analytics", "ai-ml", "b2b", "enterprise-accounts", "cross-industry", "subscription-revenue"],
  },
  {
    id: "sw-ai-platform",
    name: "AI & machine learning platform",
    industry: "Software & Internet",
    tags: ["software-product", "saas", "ai-ml", "b2b", "enterprise-accounts", "cross-industry", "r-and-d-intensive", "subscription-revenue"],
  },
  {
    id: "sw-cloud-infra",
    name: "Cloud & infrastructure software",
    industry: "Software & Internet",
    tags: ["software-product", "saas", "cloud-infrastructure", "security", "networking-tech", "b2b", "enterprise-accounts", "cross-industry", "subscription-revenue"],
  },
  {
    id: "sw-devtools",
    name: "Developer tools & DevOps",
    industry: "Software & Internet",
    tags: ["software-product", "saas", "developer-tools", "collaboration-tools", "b2b", "smb-accounts", "cross-industry", "subscription-revenue"],
  },
  {
    id: "sw-erp",
    name: "ERP & core business systems",
    industry: "Software & Internet",
    tags: ["software-product", "saas", "core-business-systems", "b2b", "enterprise-accounts", "cross-industry", "subscription-revenue"],
  },
  {
    id: "sw-crm-cx",
    name: "CRM & customer experience software",
    industry: "Software & Internet",
    tags: ["software-product", "saas", "customer-systems", "b2b", "enterprise-accounts", "cross-industry", "subscription-revenue"],
  },
  {
    id: "sw-martech",
    name: "Marketing technology",
    industry: "Software & Internet",
    tags: ["software-product", "saas", "marketing-adtech", "customer-systems", "data-analytics", "b2b", "cross-industry", "subscription-revenue"],
  },
  {
    id: "sw-hr",
    name: "HR & workforce software",
    industry: "Software & Internet",
    tags: ["software-product", "saas", "hr-workforce-systems", "b2b", "enterprise-accounts", "cross-industry", "subscription-revenue"],
  },
  {
    id: "sw-finance",
    name: "Finance, accounting & tax software",
    industry: "Software & Internet",
    tags: ["software-product", "saas", "finance-systems", "core-business-systems", "b2b", "cross-industry", "regulated", "subscription-revenue"],
  },
  {
    id: "sw-supply-chain",
    name: "Supply chain & procurement software",
    industry: "Software & Internet",
    tags: ["software-product", "saas", "supply-chain-systems", "serves-logistics", "b2b", "enterprise-accounts", "cross-industry", "subscription-revenue"],
  },
  {
    id: "sw-collab",
    name: "Collaboration & productivity software",
    industry: "Software & Internet",
    tags: ["software-product", "saas", "collaboration-tools", "b2b", "b2c", "smb-accounts", "cross-industry", "subscription-revenue"],
  },
  {
    id: "sw-design-eng",
    name: "Design & engineering software",
    industry: "Software & Internet",
    tags: ["software-product", "design-engineering-tools", "b2b", "enterprise-accounts", "serves-industrial", "r-and-d-intensive", "subscription-revenue"],
  },
  {
    id: "sw-healthcare",
    name: "Healthcare software",
    industry: "Software & Internet",
    tags: ["software-product", "saas", "serves-healthcare", "b2b", "enterprise-accounts", "regulated", "subscription-revenue"],
  },
  {
    id: "sw-fintech-software",
    name: "Banking & financial software",
    industry: "Software & Internet",
    tags: ["software-product", "saas", "serves-financial", "finance-systems", "b2b", "enterprise-accounts", "regulated", "subscription-revenue"],
  },
  {
    id: "sw-insurance",
    name: "Insurance software",
    industry: "Software & Internet",
    tags: ["software-product", "saas", "serves-financial", "insurance-underwriting", "b2b", "enterprise-accounts", "regulated", "subscription-revenue"],
  },
  {
    id: "sw-retail-tech",
    name: "Retail & commerce software",
    industry: "Software & Internet",
    tags: ["software-product", "saas", "serves-retail", "b2b", "enterprise-accounts", "subscription-revenue"],
  },
  {
    id: "sw-telecom-software",
    name: "Telecom software & network systems",
    industry: "Software & Internet",
    tags: ["software-product", "saas", "serves-telecom", "b2b", "enterprise-accounts", "subscription-revenue"],
  },
  {
    id: "sw-govtech",
    name: "Public sector software",
    industry: "Software & Internet",
    tags: ["software-product", "saas", "serves-public-sector", "b2g", "regulated", "project-revenue", "subscription-revenue"],
  },
  {
    id: "sw-edtech",
    name: "Education technology",
    industry: "Software & Internet",
    tags: ["software-product", "saas", "serves-education", "education-services", "b2b", "b2c", "subscription-revenue"],
  },
  {
    id: "sw-construction-tech",
    name: "Construction & real estate software",
    industry: "Software & Internet",
    tags: ["software-product", "saas", "serves-construction", "real-estate", "design-engineering-tools", "b2b", "enterprise-accounts", "subscription-revenue"],
  },
  {
    id: "sw-logistics-tech",
    name: "Logistics & mobility software",
    industry: "Software & Internet",
    tags: ["software-product", "saas", "serves-logistics", "supply-chain-systems", "b2b", "subscription-revenue"],
  },
  {
    id: "sw-travel-tech",
    name: "Travel & hospitality software",
    industry: "Software & Internet",
    tags: ["software-product", "saas", "travel-booking", "b2b", "transaction-revenue", "subscription-revenue"],
  },
  {
    id: "sw-payments",
    name: "Payments & financial infrastructure",
    industry: "Software & Internet",
    tags: ["software-product", "saas", "payments-processing", "fintech", "serves-financial", "serves-retail", "b2b", "transaction-revenue", "regulated"],
  },
  {
    id: "sw-marketplace",
    name: "Consumer internet & marketplace",
    industry: "Software & Internet",
    tags: ["platform-marketplace", "ecommerce", "advertising-services", "b2c", "transaction-revenue", "asset-light"],
  },
  {
    id: "sw-gaming",
    name: "Gaming & interactive entertainment",
    industry: "Software & Internet",
    tags: ["software-product", "content-ip-owner", "gaming", "entertainment-content", "b2c", "r-and-d-intensive"],
  },
  {
    id: "sw-it-services",
    name: "IT & digital engineering services",
    industry: "Software & Internet",
    tags: ["services-firm", "outsourcing-bpo", "b2b", "enterprise-accounts", "cross-industry", "billable-hours", "project-revenue"],
  },
  {
    id: "sw-media-tech",
    name: "Media & content technology",
    industry: "Software & Internet",
    tags: ["software-product", "saas", "serves-media", "b2b", "subscription-revenue"],
  },
  {
    id: "sw-legal-compliance",
    name: "Legal, contract & compliance software",
    industry: "Software & Internet",
    tags: ["software-product", "saas", "legal-services", "regulated", "cross-industry", "b2b", "enterprise-accounts", "subscription-revenue"],
  },
  {
    id: "sw-automotive-tech",
    name: "Automotive & mobility software",
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
    name: "Industrial machinery & equipment",
    industry: "Manufacturing",
    tags: ["discrete-manufacturing", "machinery-equipment", "serves-industrial", "b2b", "capital-intensive", "supply-chain-heavy"],
  },
  {
    id: "mfg-automation",
    name: "Industrial automation & controls",
    industry: "Manufacturing",
    tags: ["discrete-manufacturing", "industrial-automation", "embedded-software", "serves-industrial", "b2b", "r-and-d-intensive"],
  },
  {
    id: "mfg-electrical-equipment",
    name: "Electrical equipment & power systems",
    industry: "Manufacturing",
    tags: ["discrete-manufacturing", "machinery-equipment", "grid-utilities", "serves-energy", "b2b", "capital-intensive"],
  },
  {
    id: "mfg-test-measurement",
    name: "Test & measurement instruments",
    industry: "Manufacturing",
    tags: ["discrete-manufacturing", "test-measurement", "electronic-components", "serves-industrial", "b2b", "r-and-d-intensive"],
  },
  {
    id: "mfg-conglomerate",
    name: "Diversified industrial conglomerate",
    industry: "Manufacturing",
    tags: ["discrete-manufacturing", "machinery-equipment", "cross-industry", "b2b", "capital-intensive", "supply-chain-heavy"],
  },
  {
    id: "mfg-hvac-building",
    name: "HVAC & building systems",
    industry: "Manufacturing",
    tags: ["discrete-manufacturing", "building-materials", "machinery-equipment", "serves-construction", "b2b", "field-operations"],
  },
  {
    id: "mfg-packaging",
    name: "Packaging manufacturing",
    industry: "Manufacturing",
    tags: ["process-manufacturing", "packaging", "b2b", "supply-chain-heavy", "capital-intensive"],
  },
  {
    id: "mfg-metals",
    name: "Steel, metals & mining",
    industry: "Manufacturing",
    tags: ["process-manufacturing", "metals-steel", "mining", "commodity-chemicals", "b2b", "capital-intensive", "field-operations"],
  },
  {
    id: "mfg-building-products",
    name: "Building products & materials",
    industry: "Manufacturing",
    tags: ["discrete-manufacturing", "building-materials", "serves-construction", "b2b", "supply-chain-heavy"],
  },
  {
    id: "mfg-tools",
    name: "Tools & hardware",
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
    name: "Agricultural, construction & mining equipment",
    industry: "Manufacturing",
    tags: ["discrete-manufacturing", "machinery-equipment", "agriculture", "mining", "engineering-construction", "b2b", "capital-intensive"],
  },
  {
    id: "mfg-electronics-components",
    // Added after classification: contract electronics manufacturers (Flex,
    // Jabil, Sanmina) and passive-component makers (TDK, Samsung Electro
    // Mechanics, TE Connectivity) had no honest home among the other twelve, and
    // were being pushed into `mfg-automation` on the word "electronics".
    name: "Electronics & components manufacturing",
    industry: "Manufacturing",
    tags: ["discrete-manufacturing", "electronic-components", "cross-industry", "supply-chain-heavy", "capital-intensive", "b2b"],
  },
  {
    id: "mfg-motion-control",
    name: "Motion, flow & control components",
    industry: "Manufacturing",
    tags: ["discrete-manufacturing", "machinery-equipment", "vehicle-components", "industrial-automation", "serves-industrial", "b2b", "r-and-d-intensive"],
  },
  {
    id: "mfg-print-imaging",
    name: "Printing, imaging & document systems",
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
    name: "Retail & commercial banking",
    industry: "BFSI",
    tags: ["balance-sheet-risk", "banking-lending", "regulated", "b2c", "b2b", "transaction-revenue"],
  },
  {
    id: "fin-investment-bank",
    name: "Investment banking & capital markets",
    industry: "BFSI",
    tags: ["balance-sheet-risk", "capital-markets", "asset-management", "regulated", "b2b", "enterprise-accounts", "transaction-revenue"],
  },
  {
    id: "fin-insurance-pc",
    name: "Property & casualty insurance",
    industry: "BFSI",
    tags: ["balance-sheet-risk", "insurance-underwriting", "regulated", "b2c", "b2b"],
  },
  {
    id: "fin-insurance-life",
    name: "Life & health insurance",
    industry: "BFSI",
    tags: ["balance-sheet-risk", "insurance-underwriting", "health-payer", "regulated", "b2c"],
  },
  {
    id: "fin-asset-management",
    name: "Asset & investment management",
    industry: "BFSI",
    tags: ["asset-management", "capital-markets", "regulated", "b2b", "b2c", "asset-light"],
  },
  {
    id: "fin-payments",
    name: "Payments & card networks",
    industry: "BFSI",
    tags: ["payments-processing", "fintech", "regulated", "transaction-revenue", "b2b", "b2c"],
  },
  {
    id: "fin-fintech-lending",
    name: "Fintech & digital lending",
    industry: "BFSI",
    tags: ["fintech", "balance-sheet-risk", "banking-lending", "platform-marketplace", "regulated", "b2c"],
  },
  {
    id: "fin-market-data",
    name: "Financial data & credit information",
    industry: "BFSI",
    tags: ["credit-data", "data-analytics", "capital-markets", "b2b", "subscription-revenue", "regulated"],
  },
  {
    id: "fin-exchange",
    name: "Exchanges & trading venues",
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
    name: "Insurance broking & claims services",
    industry: "BFSI",
    tags: ["services-firm", "insurance-underwriting", "regulated", "billable-hours", "enterprise-accounts", "b2b"],
  },
  {
    id: "fin-software-services",
    // Added after classification: Broadridge, MX, Smartstream, Candescent, Finzly
    // and Lean are technology vendors TO financial institutions, not financial
    // institutions. Their nearest peer is each other, not a bank.
    name: "Financial technology & processing services",
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
    id: "hc-biotech",
    name: "Biotechnology",
    industry: "Healthcare & Lifescience",
    tags: ["biotech", "pharmaceutical", "clinical-regulated", "regulated", "r-and-d-intensive", "b2b"],
  },
  {
    id: "hc-medical-devices",
    name: "Medical devices",
    industry: "Healthcare & Lifescience",
    tags: ["discrete-manufacturing", "medical-device", "diagnostics", "clinical-regulated", "regulated", "safety-critical", "r-and-d-intensive", "b2b"],
  },
  {
    id: "hc-diagnostics",
    name: "Diagnostics & laboratory services",
    industry: "Healthcare & Lifescience",
    tags: ["services-firm", "diagnostics", "clinical-regulated", "regulated", "field-operations", "b2b", "b2c"],
  },
  {
    id: "hc-provider",
    name: "Hospitals & care delivery",
    industry: "Healthcare & Lifescience",
    tags: ["services-firm", "hospital-care", "clinical-regulated", "regulated", "field-operations", "b2c"],
  },
  {
    id: "hc-cro",
    name: "Clinical research & development services",
    industry: "Healthcare & Lifescience",
    tags: ["services-firm", "clinical-research", "clinical-regulated", "regulated", "billable-hours", "project-revenue", "r-and-d-intensive", "b2b"],
  },
  {
    id: "hc-life-science-tools",
    name: "Life sciences tools & instruments",
    industry: "Healthcare & Lifescience",
    tags: ["discrete-manufacturing", "test-measurement", "medical-device", "clinical-regulated", "r-and-d-intensive", "b2b"],
  },
  {
    id: "hc-pharma-distribution",
    name: "Pharmaceutical distribution",
    industry: "Healthcare & Lifescience",
    tags: ["wholesale-distribution", "pharmaceutical", "regulated", "supply-chain-heavy", "b2b"],
  },
  {
    id: "hc-payer",
    name: "Health insurance & benefits management",
    industry: "Healthcare & Lifescience",
    tags: ["balance-sheet-risk", "health-payer", "insurance-underwriting", "serves-healthcare", "regulated", "b2b"],
  },
  {
    id: "hc-health-it",
    name: "Health information & care platforms",
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
    name: "Vehicle manufacturer (OEM)",
    industry: "Automotive",
    tags: ["discrete-manufacturing", "vehicle-oem", "b2c", "capital-intensive", "supply-chain-heavy", "safety-critical", "r-and-d-intensive"],
  },
  {
    id: "auto-commercial-oem",
    name: "Commercial vehicle & truck manufacturer",
    industry: "Automotive",
    tags: ["discrete-manufacturing", "vehicle-oem", "b2b", "capital-intensive", "supply-chain-heavy", "safety-critical"],
  },
  {
    id: "auto-ev",
    name: "Electric vehicle manufacturer",
    industry: "Automotive",
    tags: ["discrete-manufacturing", "vehicle-oem", "electric-vehicles", "b2c", "r-and-d-intensive", "capital-intensive"],
  },
  {
    id: "auto-components",
    name: "Automotive components (Tier 1)",
    industry: "Automotive",
    tags: ["discrete-manufacturing", "vehicle-components", "electric-vehicles", "serves-automotive", "b2b", "supply-chain-heavy", "safety-critical"],
  },
  {
    id: "auto-software",
    // Renamed away from "Automotive & mobility software", which was character-for
    // character identical to `sw-automotive-tech`. A visitor never sees both, since
    // the dropdown is filtered to their industry — but an admin sees the whole
    // catalogue, and two identically named types are unmaintainable.
    name: "In-vehicle software & electronics",
    industry: "Automotive",
    tags: ["software-product", "embedded-software", "serves-automotive", "b2b", "r-and-d-intensive", "safety-critical"],
  },
  {
    id: "auto-engineering-services",
    name: "Automotive engineering services",
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
    name: "Telecom network operator",
    industry: "Telecom",
    tags: ["network-operator", "telecom-services", "regulated", "capital-intensive", "b2c", "b2b", "subscription-revenue"],
  },
  {
    id: "tel-equipment",
    name: "Telecom & networking equipment",
    industry: "Telecom",
    tags: ["hardware-product", "telecom-equipment", "networking-tech", "serves-telecom", "b2b", "r-and-d-intensive"],
  },
  {
    id: "tel-satellite",
    name: "Satellite & space communications",
    industry: "Telecom",
    tags: ["network-operator", "telecom-services", "aerospace", "capital-intensive", "regulated", "b2b", "b2g"],
  },
  {
    id: "tel-cpaas",
    name: "Communications platforms & APIs",
    industry: "Telecom",
    tags: ["saas", "software-product", "telecom-services", "developer-tools", "transaction-revenue", "asset-light", "b2b"],
  },
  {
    id: "tel-infrastructure",
    name: "Network infrastructure & managed services",
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
    name: "Fabless chip design",
    industry: "Semiconductors",
    tags: ["fabless-design", "semiconductor", "hardware-product", "ip-licensing", "r-and-d-intensive", "asset-light", "b2b"],
  },
  {
    id: "semi-foundry",
    name: "Semiconductor manufacturing & foundry",
    industry: "Semiconductors",
    tags: ["process-manufacturing", "semiconductor", "capital-intensive", "supply-chain-heavy", "b2b"],
  },
  {
    id: "semi-equipment",
    name: "Semiconductor equipment & materials",
    industry: "Semiconductors",
    tags: ["discrete-manufacturing", "semiconductor", "machinery-equipment", "capital-intensive", "r-and-d-intensive", "b2b"],
  },
  {
    id: "semi-ip",
    name: "Semiconductor IP & design tools",
    industry: "Semiconductors",
    tags: ["semiconductor", "ip-licensing", "software-product", "design-engineering-tools", "r-and-d-intensive", "asset-light", "b2b"],
  },
  {
    id: "semi-analog",
    name: "Analog, power & mixed-signal semiconductors",
    industry: "Semiconductors",
    tags: ["semiconductor", "fabless-design", "electronic-components", "hardware-product", "r-and-d-intensive", "b2b"],
  },
  {
    id: "semi-components",
    name: "Electronic components & photonics",
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
    name: "Apparel & footwear brand",
    industry: "Retail",
    tags: ["brand-owner", "apparel", "footwear", "fashion-cycle", "dtc", "physical-stores", "supply-chain-heavy", "b2c"],
  },
  {
    id: "ret-sportswear",
    name: "Sportswear & athletic brand",
    industry: "Retail",
    tags: ["brand-owner", "sporting-goods", "apparel", "footwear", "fashion-cycle", "dtc", "physical-stores", "supply-chain-heavy", "b2c"],
  },
  {
    id: "ret-luxury",
    name: "Luxury & premium brand",
    industry: "Retail",
    tags: ["brand-owner", "luxury", "apparel", "footwear", "fashion-cycle", "dtc", "physical-stores", "b2c"],
  },
  {
    id: "ret-grocery",
    name: "Grocery & convenience retail",
    industry: "Retail",
    tags: ["retail-operator", "packaged-food", "perishable-goods", "physical-stores", "supply-chain-heavy", "b2c"],
  },
  {
    id: "ret-home-improvement",
    name: "Home improvement & furnishings retail",
    industry: "Retail",
    tags: ["retail-operator", "building-materials", "household-products", "physical-stores", "supply-chain-heavy", "b2c"],
  },
  {
    id: "ret-general-merchandise",
    name: "Department store & general merchandise",
    industry: "Retail",
    tags: ["retail-operator", "household-products", "physical-stores", "supply-chain-heavy", "b2c"],
  },
  {
    id: "ret-ecommerce",
    name: "E-commerce & online retail",
    industry: "Retail",
    tags: ["retail-operator", "ecommerce", "platform-marketplace", "dtc", "supply-chain-heavy", "transaction-revenue", "b2c"],
  },
  {
    id: "ret-specialty",
    name: "Specialty retail",
    industry: "Retail",
    tags: ["retail-operator", "sporting-goods", "physical-stores", "dtc", "supply-chain-heavy", "b2c"],
  },
  {
    id: "ret-consumer-brand",
    name: "Consumer products brand",
    industry: "Retail",
    tags: ["brand-owner", "household-products", "personal-care", "dtc", "supply-chain-heavy", "b2c"],
  },
  {
    id: "ret-auto-parts",
    name: "Automotive parts retail & distribution",
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
    name: "Broadcasting & studios",
    industry: "Media & Entertainment",
    tags: ["content-ip-owner", "entertainment-content", "ip-licensing", "advertising-services", "capital-intensive", "b2c"],
  },
  {
    id: "med-publishing",
    name: "Publishing & news",
    industry: "Media & Entertainment",
    tags: ["content-ip-owner", "publishing", "entertainment-content", "subscription-revenue", "b2c", "b2b"],
  },
  {
    id: "med-advertising",
    name: "Advertising & marketing services",
    industry: "Media & Entertainment",
    tags: ["services-firm", "advertising-services", "billable-hours", "project-revenue", "enterprise-accounts", "b2b"],
  },
  {
    id: "med-adtech",
    name: "Advertising technology & measurement",
    industry: "Media & Entertainment",
    tags: ["software-product", "saas", "marketing-adtech", "advertising-services", "data-analytics", "serves-media", "transaction-revenue", "b2b"],
  },
  {
    id: "med-gaming",
    name: "Gaming & esports",
    industry: "Media & Entertainment",
    tags: ["content-ip-owner", "gaming", "entertainment-content", "software-product", "r-and-d-intensive", "b2c"],
  },
  {
    id: "med-gambling",
    name: "Online gambling & betting",
    industry: "Media & Entertainment",
    tags: ["platform-marketplace", "gaming", "regulated", "transaction-revenue", "b2c"],
  },
  {
    id: "med-information-services",
    name: "Information & research services",
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
    name: "Accounting, audit & tax",
    industry: "Professional Services",
    tags: ["services-firm", "accounting-audit", "regulated", "billable-hours", "enterprise-accounts", "b2b"],
  },
  {
    id: "prof-legal",
    name: "Legal services",
    industry: "Professional Services",
    tags: ["services-firm", "legal-services", "regulated", "billable-hours", "enterprise-accounts", "b2b"],
  },
  {
    id: "prof-consulting",
    name: "Management & strategy consulting",
    industry: "Professional Services",
    tags: ["services-firm", "consulting", "accounting-audit", "billable-hours", "project-revenue", "enterprise-accounts", "b2b"],
  },
  {
    id: "prof-engineering-consulting",
    name: "Engineering & technical consulting",
    industry: "Professional Services",
    tags: ["services-firm", "consulting", "engineering-construction", "project-revenue", "billable-hours", "b2b"],
  },
  {
    id: "prof-staffing",
    name: "Staffing & workforce services",
    industry: "Professional Services",
    tags: ["services-firm", "staffing-workforce", "hr-workforce-systems", "outsourcing-bpo", "cross-industry", "b2b"],
  },
  {
    id: "prof-bpo",
    name: "Business process outsourcing",
    industry: "Professional Services",
    tags: ["services-firm", "outsourcing-bpo", "staffing-workforce", "cross-industry", "project-revenue", "enterprise-accounts", "b2b"],
  },
  {
    id: "prof-market-research",
    name: "Market research & consumer intelligence",
    industry: "Professional Services",
    tags: ["services-firm", "market-research", "data-analytics", "subscription-revenue", "b2b"],
  },
  {
    id: "prof-facilities",
    name: "Facilities & real estate services",
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
    name: "Advertising & marketing services",
    industry: "Professional Services",
    tags: ["services-firm", "advertising-services", "billable-hours", "project-revenue", "enterprise-accounts", "b2b"],
  },
  {
    id: "prof-compliance",
    name: "Regulatory & compliance services",
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
    name: "Specialty chemicals",
    industry: "Chemicals & Materials",
    tags: ["process-manufacturing", "specialty-chemicals", "capital-intensive", "r-and-d-intensive", "supply-chain-heavy", "b2b"],
  },
  {
    id: "chem-commodity",
    name: "Commodity & petrochemicals",
    industry: "Chemicals & Materials",
    tags: ["process-manufacturing", "commodity-chemicals", "oil-gas", "capital-intensive", "b2b"],
  },
  {
    id: "chem-coatings",
    name: "Paints & coatings",
    industry: "Chemicals & Materials",
    tags: ["process-manufacturing", "specialty-chemicals", "building-materials", "supply-chain-heavy", "b2b", "b2c"],
  },
  {
    id: "chem-agrochemicals",
    name: "Agrochemicals & seeds",
    industry: "Chemicals & Materials",
    tags: ["process-manufacturing", "agrochemicals", "agriculture", "regulated", "r-and-d-intensive", "b2b"],
  },
  {
    id: "chem-industrial-gases",
    name: "Industrial gases",
    industry: "Chemicals & Materials",
    tags: ["process-manufacturing", "commodity-chemicals", "capital-intensive", "field-operations", "b2b"],
  },
  {
    id: "chem-flavours",
    name: "Flavours, fragrances & ingredients",
    industry: "Chemicals & Materials",
    tags: ["process-manufacturing", "specialty-chemicals", "packaged-food", "r-and-d-intensive", "b2b"],
  },
  {
    id: "chem-packaging",
    name: "Industrial packaging materials",
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
    name: "Integrated oil & gas",
    industry: "Energy & Utilities",
    tags: ["process-manufacturing", "oil-gas", "capital-intensive", "regulated", "field-operations", "b2b"],
  },
  {
    id: "enr-oilfield-services",
    name: "Oilfield & energy services",
    industry: "Energy & Utilities",
    tags: ["services-firm", "oil-gas", "field-operations", "project-revenue", "b2b"],
  },
  {
    id: "enr-power-generation",
    name: "Power generation",
    industry: "Energy & Utilities",
    tags: ["power-generation", "grid-utilities", "capital-intensive", "regulated", "field-operations", "b2b"],
  },
  {
    id: "enr-renewables",
    name: "Renewable energy",
    industry: "Energy & Utilities",
    tags: ["power-generation", "renewables", "grid-utilities", "capital-intensive", "r-and-d-intensive", "b2b"],
  },
  {
    id: "enr-utilities",
    name: "Utilities & grid operations",
    industry: "Energy & Utilities",
    tags: ["network-operator", "grid-utilities", "regulated", "capital-intensive", "field-operations", "b2c"],
  },
  {
    id: "enr-energy-equipment",
    name: "Energy equipment & technology",
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
    name: "Freight forwarding & third-party logistics",
    industry: "Logistics & Transportation",
    tags: ["services-firm", "freight-logistics", "supply-chain-heavy", "asset-light", "transaction-revenue", "b2b"],
  },
  {
    id: "log-maritime",
    name: "Shipping & maritime transport",
    industry: "Logistics & Transportation",
    tags: ["network-operator", "shipping-maritime", "freight-logistics", "capital-intensive", "field-operations", "b2b"],
  },
  {
    id: "log-express",
    name: "Express & parcel delivery",
    industry: "Logistics & Transportation",
    tags: ["network-operator", "freight-logistics", "capital-intensive", "field-operations", "b2c", "b2b"],
  },
  {
    id: "log-rail",
    name: "Rail & surface transport",
    industry: "Logistics & Transportation",
    tags: ["network-operator", "freight-logistics", "capital-intensive", "regulated", "field-operations", "b2b"],
  },
  {
    id: "log-ports",
    name: "Ports & terminal operations",
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
    name: "Engineering & design services",
    industry: "Architecture, Engineering, & Construction",
    tags: ["services-firm", "engineering-construction", "civil-infrastructure", "project-revenue", "billable-hours", "b2b"],
  },
  {
    id: "aec-construction",
    name: "Construction & contracting",
    industry: "Architecture, Engineering, & Construction",
    tags: ["services-firm", "engineering-construction", "civil-infrastructure", "project-revenue", "field-operations", "capital-intensive", "b2b"],
  },
  {
    id: "aec-construction-equipment",
    name: "Construction equipment & materials",
    industry: "Architecture, Engineering, & Construction",
    tags: ["discrete-manufacturing", "machinery-equipment", "building-materials", "engineering-construction", "b2b"],
  },
  {
    id: "aec-shipbuilding",
    name: "Shipbuilding & marine engineering",
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
    name: "Consumer electronics & devices",
    industry: "Consumer Electronics",
    tags: ["hardware-product", "consumer-devices", "brand-owner", "supply-chain-heavy", "r-and-d-intensive", "b2c"],
  },
  {
    id: "ce-computing",
    name: "Computing hardware & servers",
    industry: "Consumer Electronics",
    tags: ["hardware-product", "computing-hardware", "consumer-devices", "storage-compute-hardware", "supply-chain-heavy", "b2b", "b2c"],
  },
  {
    id: "ce-storage",
    name: "Enterprise storage & data centre hardware",
    industry: "Consumer Electronics",
    tags: ["hardware-product", "storage-compute-hardware", "computing-hardware", "cloud-infrastructure", "enterprise-accounts", "b2b"],
  },
  {
    id: "ce-appliances",
    name: "Home appliances",
    industry: "Consumer Electronics",
    tags: ["discrete-manufacturing", "appliances", "brand-owner", "physical-stores", "supply-chain-heavy", "b2c"],
  },
];

/* ==========================================================================
   CPG — 24 companies
   ========================================================================== */
const CPG: BusinessTypeSeed[] = [
  {
    id: "cpg-food",
    name: "Packaged food",
    industry: "CPG",
    tags: ["process-manufacturing", "packaged-food", "food-processing", "brand-owner", "perishable-goods", "supply-chain-heavy", "b2c"],
  },
  {
    id: "cpg-beverages",
    name: "Beverages & brewing",
    industry: "CPG",
    tags: ["process-manufacturing", "beverages", "brand-owner", "capital-intensive", "supply-chain-heavy", "b2c"],
  },
  {
    id: "cpg-personal-care",
    name: "Personal care & beauty",
    industry: "CPG",
    tags: ["process-manufacturing", "personal-care", "luxury", "brand-owner", "dtc", "supply-chain-heavy", "b2c"],
  },
  {
    id: "cpg-home-care",
    name: "Household & home care products",
    industry: "CPG",
    tags: ["process-manufacturing", "household-products", "brand-owner", "supply-chain-heavy", "b2c"],
  },
  {
    id: "cpg-diversified",
    name: "Diversified consumer goods",
    industry: "CPG",
    tags: ["process-manufacturing", "brand-owner", "household-products", "personal-care", "packaged-food", "beverages", "supply-chain-heavy", "b2c"],
  },
];

/* ==========================================================================
   Aerospace & Defense — 18 companies
   ========================================================================== */
const AEROSPACE: BusinessTypeSeed[] = [
  {
    id: "aero-components",
    name: "Aerospace components & systems",
    industry: "Aerospace & Defense",
    tags: ["discrete-manufacturing", "aerospace", "safety-critical", "r-and-d-intensive", "supply-chain-heavy", "b2b"],
  },
  {
    id: "aero-primes",
    name: "Aerospace & defense primes",
    industry: "Aerospace & Defense",
    tags: ["discrete-manufacturing", "aerospace", "defense", "safety-critical", "capital-intensive", "project-revenue", "b2g"],
  },
  {
    id: "aero-engines",
    name: "Aircraft engines & propulsion",
    industry: "Aerospace & Defense",
    tags: ["discrete-manufacturing", "aerospace", "machinery-equipment", "safety-critical", "r-and-d-intensive", "capital-intensive", "b2b"],
  },
  {
    id: "aero-defense-electronics",
    name: "Defense electronics & systems",
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
    name: "Hotels & hospitality operations",
    industry: "Travel & Hospitality",
    tags: ["services-firm", "hospitality-operations", "field-operations", "capital-intensive", "physical-stores", "b2c"],
  },
  {
    id: "trv-agency",
    name: "Travel services & booking",
    industry: "Travel & Hospitality",
    tags: ["platform-marketplace", "travel-booking", "transaction-revenue", "asset-light", "b2c"],
  },
  {
    id: "trv-mobility",
    name: "Car rental & ride hailing",
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
    name: "Food processing",
    industry: "Agribusiness & Food Processing",
    tags: ["process-manufacturing", "food-processing", "packaged-food", "agriculture", "perishable-goods", "supply-chain-heavy", "b2b"],
  },
  {
    id: "agr-agribusiness",
    name: "Agribusiness & commodities",
    industry: "Agribusiness & Food Processing",
    tags: ["agriculture", "process-manufacturing", "agrochemicals", "commodity-chemicals", "supply-chain-heavy", "b2b"],
  },
  {
    id: "avi-airline",
    name: "Airline operations",
    industry: "Aviation",
    tags: ["network-operator", "airline-operations", "capital-intensive", "regulated", "safety-critical", "field-operations", "b2c"],
  },
  {
    id: "avi-services",
    name: "Aviation services & maintenance",
    industry: "Aviation",
    tags: ["services-firm", "airline-operations", "aerospace", "safety-critical", "field-operations", "b2b"],
  },
  {
    id: "edu-institution",
    name: "Education & training provider",
    industry: "Education",
    tags: ["services-firm", "education-services", "field-operations", "b2c", "b2b"],
  },
  {
    id: "edu-edtech",
    name: "Education technology & e-learning",
    industry: "Education",
    tags: ["saas", "software-product", "education-services", "serves-education", "subscription-revenue", "b2c"],
  },
  {
    id: "whl-industrial-supplies",
    name: "Industrial supplies distribution",
    industry: "Wholesale",
    tags: ["wholesale-distribution", "tools-hardware", "serves-industrial", "supply-chain-heavy", "b2b"],
  },
  {
    id: "whl-building-materials",
    name: "Building materials distribution",
    industry: "Wholesale",
    tags: ["wholesale-distribution", "building-materials", "serves-construction", "supply-chain-heavy", "b2b"],
  },
  {
    id: "rst-qsr",
    name: "Quick service restaurants",
    industry: "Restaurant & Food Service",
    tags: ["restaurant-operations", "brand-owner", "physical-stores", "field-operations", "perishable-goods", "b2c"],
  },
  {
    id: "rst-dining",
    name: "Restaurant chains & food service",
    industry: "Restaurant & Food Service",
    tags: ["restaurant-operations", "services-firm", "hospitality-operations", "physical-stores", "field-operations", "perishable-goods", "b2c"],
  },
  {
    id: "ele-electrical-products",
    name: "Electrical products & components",
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
