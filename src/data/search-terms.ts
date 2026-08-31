/**
 * The words a visitor types when they are looking for their own line of business,
 * as opposed to the words ANSR chose to print on the row.
 *
 * ── Why this file exists ────────────────────────────────────────────────────
 *
 * Sub-industry is the primary ordering signal in `similarity.ts`, and it is
 * optional. That combination is safe only if a visitor can FIND their answer. The
 * filter used to be a substring test against the row's own label, and measured
 * against a list of ordinary trade words — `fintech`, `saas`, `3pl`, `bpo`,
 * `insurtech`, `medtech`, `edtech`, `qsr`, `reinsurance`, `wafer` — 41 of 102
 * matched nothing at all. A visitor who finds nothing takes `All of {industry}`,
 * which drops the signal entirely: peer-set coherence in Software & Internet falls
 * from 0.93 with a sub-industry to 0.23 without one, and in Manufacturing to 0.13.
 * Those two industries are 863 of the 1,834 companies.
 *
 * So a bad peer set is usually not a scoring failure. It is a discovery failure
 * that the scorer then faithfully reports. `tests/unit/search-terms.test.ts`
 * measures it.
 *
 * ── Why the terms are CODE and not data ─────────────────────────────────────
 *
 * The same reasoning that keeps `BUSINESS_TAGS` in code. A term is part of the
 * vocabulary a visitor is routed by, so adding or removing one changes which peer
 * set a real person sees — and that deserves a diff and a test, not a text field.
 * Business types stay admin-editable; a type added in admin simply has no extra
 * terms until someone writes them, and `data:verify` reports the gap rather than
 * failing.
 *
 * ── What belongs here and what does not ─────────────────────────────────────
 *
 * A term is a word a visitor would use for THEMSELVES. It is not a keyword-stuffing
 * exercise: every term is asserted to resolve to the sub-industry it is filed under,
 * so a term broad enough to hit five of them is a test failure rather than a
 * judgement call. Company names are deliberately absent — the dataset holds no
 * mapping from a name to a line of business for anyone outside its own 1,834, so
 * "stripe" as a term would be us guessing on a visitor's behalf.
 *
 * Spelling variants are in scope and carry real weight: `defence`/`defense`,
 * `tyre`/`tire`, `fertiliser`/`fertilizer`, `centre`/`center`. So are the acronyms
 * a leader in that business would type before the full phrase.
 */

/**
 * Extra search terms per INDUSTRY, keyed by the industry's exact taxonomy name.
 *
 * `BFSI` is the reason this half of the file is not optional. It is the one
 * industry name in the taxonomy that is an abbreviation a visitor outside India
 * has very likely never seen, and the row says nothing else. Somebody at an
 * American insurer types "insurance", finds `Insurance software` under Software &
 * Internet, and never learns that 189 banks and insurers were one row away.
 */
export const INDUSTRY_TERMS: Readonly<Record<string, readonly string[]>> = {
  "Aerospace & Defense": ["defence", "aviation manufacturing", "space", "military", "airframe"],
  "Agribusiness & Food Processing": ["agriculture", "farming", "agri", "crops", "dairy", "food manufacturing"],
  "Architecture, Engineering, & Construction": [
    "aec", "architecture", "engineering", "construction", "infrastructure", "epc", "civil", "built environment",
  ],
  Automotive: ["auto", "car", "vehicle", "mobility", "ev", "electric vehicle"],
  Aviation: ["airline", "air transport", "flight", "carrier"],
  BFSI: [
    "banking", "financial services", "finance", "insurance", "capital markets", "fintech",
    "payments", "wealth", "lending", "asset management", "bank", "insurer", "financial",
  ],
  "Chemicals & Materials": ["chemical", "materials", "petrochemical", "polymers", "coatings", "gases"],
  "Consumer Electronics": ["electronics", "devices", "hardware", "gadgets", "computing"],
  "Consumer Packaged Goods": ["cpg", "fmcg", "consumer goods", "packaged goods", "household brands", "beauty", "beverages"],
  Education: ["edtech", "learning", "training", "university", "school", "academic", "higher education"],
  "Electrical & Electronics": ["electrical", "components", "wiring", "switchgear"],
  "Energy & Utilities": ["energy", "power", "oil", "gas", "utility", "renewables", "solar", "wind", "grid"],
  "Healthcare & Lifescience": [
    "healthcare", "health", "life sciences", "pharma", "pharmaceutical", "biotech", "medical",
    "medtech", "hospital", "clinical", "diagnostics",
  ],
  "Logistics & Transportation": ["logistics", "transport", "shipping", "freight", "supply chain", "3pl", "delivery"],
  Manufacturing: ["industrial", "factory", "machinery", "equipment", "plant", "engineering products", "discrete manufacturing"],
  "Media & Entertainment": ["media", "entertainment", "publishing", "broadcast", "advertising", "content", "streaming", "gaming"],
  "Professional Services": ["consulting", "advisory", "services firm", "outsourcing", "bpo", "audit", "legal", "staffing"],
  "Restaurant & Food Service": ["restaurant", "food service", "dining", "qsr", "catering", "hospitality food"],
  Retail: ["retail", "stores", "shops", "ecommerce", "e commerce", "merchandise", "brand", "consumer retail"],
  Semiconductors: ["semiconductor", "semis", "chip", "chips", "silicon", "fab", "wafer", "ic"],
  "Software & Internet": [
    "software", "saas", "tech", "technology", "internet", "cloud", "platform", "app",
    "digital", "it", "product company", "web",
  ],
  Telecom: ["telecom", "telco", "telecommunications", "carrier", "mobile network", "isp", "connectivity", "5g"],
  "Travel & Hospitality": ["travel", "hospitality", "hotel", "tourism", "booking", "leisure"],
  Wholesale: ["wholesale", "distribution", "distributor", "supplies", "b2b distribution"],
};

/**
 * Extra search terms per SUB-INDUSTRY, keyed by business type id.
 *
 * The two payments entries — `sw-payments` under Software & Internet and
 * `fin-payments` under BFSI — deliberately share most of their terms. They are the
 * clearest case of one real business the taxonomy holds on both sides of a hard
 * industry boundary, and matching never crosses that boundary. Surfacing both rows
 * for the same query is the whole remedy available here: the visitor cannot be
 * shown peers from both, so the least we can do is not hide the choice from them.
 * The census of every such pair is in `tests/unit/match-quality.test.ts`.
 */
export const SUB_INDUSTRY_TERMS: Readonly<Record<string, readonly string[]>> = {
  /* ── Software & Internet ─────────────────────────────────────────────────── */
  "sw-security": ["security", "infosec", "siem", "identity", "iam", "endpoint", "zero trust", "threat", "soc"],
  "sw-data-analytics": ["analytics", "bi", "business intelligence", "data warehouse", "lakehouse", "etl", "data platform", "observability"],
  "sw-ai-platform": ["ai", "artificial intelligence", "ml", "machine learning", "llm", "genai", "generative", "mlops", "computer vision", "nlp"],
  "sw-cloud-infra": ["cloud", "iaas", "paas", "hyperscaler", "kubernetes", "virtualisation", "virtualization", "middleware", "database"],
  "sw-devtools": ["devops", "developer tools", "ci cd", "sre", "platform engineering", "apm", "source control", "testing tools"],
  "sw-erp": ["erp", "core systems", "back office", "financial systems", "manufacturing software", "epm"],
  "sw-crm-cx": ["crm", "cx", "customer experience", "contact centre", "contact center", "ccaas", "support software", "helpdesk", "sales software"],
  "sw-martech": ["martech", "marketing", "marketing automation", "cdp", "email marketing", "seo", "personalisation", "personalization"],
  "sw-hr": ["hr tech", "hrtech", "hcm", "payroll", "recruiting software", "ats", "workforce management", "people software", "lms"],
  "sw-finance": ["accounting software", "tax software", "spend management", "expense", "treasury software", "billing", "revenue recognition", "fp and a"],
  "sw-supply-chain": ["supply chain software", "procurement", "sourcing", "wms", "tms", "inventory software", "scm", "spend"],
  "sw-collab": ["collaboration", "productivity", "messaging", "video conferencing", "document management", "workflow", "intranet", "project management"],
  "sw-design-eng": ["cad", "cae", "eda adjacent", "plm", "simulation", "3d", "bim", "design software", "engineering software"],
  "sw-healthcare": ["health it", "healthtech", "ehr", "emr", "rcm", "revenue cycle", "clinical software", "telehealth", "medtech software"],
  "sw-fintech-software": ["core banking", "banking software", "lending software", "treasury", "capital markets software", "wealth software", "regtech", "fintech"],
  "sw-insurance": ["insurtech", "insurance software", "policy administration", "claims software", "underwriting software", "actuarial"],
  "sw-retail-tech": ["retail tech", "retailtech", "pos", "point of sale", "ecommerce platform", "merchandising", "loyalty", "omnichannel", "commerce"],
  "sw-telecom-software": ["oss", "bss", "telecom software", "network software", "billing telecom", "charging", "sdn", "nfv"],
  "sw-govtech": ["govtech", "public sector", "government software", "civic", "defence software", "defense software", "tax administration"],
  "sw-edtech": ["edtech", "e learning", "elearning", "learning platform", "student information", "courseware", "assessment"],
  "sw-construction-tech": ["proptech", "contech", "construction software", "real estate software", "facilities software", "bim software", "field service"],
  "sw-logistics-tech": ["logistics software", "supply chain visibility", "fleet software", "last mile", "freight tech", "mobility platform", "telematics"],
  "sw-travel-tech": ["travel tech", "traveltech", "booking engine", "gds", "hospitality software", "property management system", "revenue management"],
  "sw-payments": [
    "payments", "payment gateway", "payment processing", "psp", "payment service provider",
    "merchant acquiring", "acquirer", "fintech", "financial infrastructure", "checkout",
    "billing payments", "open banking", "embedded finance", "banking as a service", "baas",
    "card issuing", "wallet", "remittance", "payouts",
  ],
  "sw-marketplace": ["marketplace", "consumer internet", "classifieds", "social", "dating", "food delivery", "gig", "aggregator", "d2c platform"],
  "sw-gaming": ["games", "gaming", "video games", "mobile games", "game studio", "game engine", "interactive entertainment"],
  "sw-it-services": ["it services", "system integrator", "si", "digital engineering", "product engineering", "outsourced development", "consulting technology", "managed it"],
  "sw-media-tech": ["media tech", "streaming", "ott", "video platform", "cdn", "content management", "cms", "digital asset management"],
  "sw-legal-compliance": ["legaltech", "legal software", "contract management", "clm", "compliance software", "grc", "e discovery", "esg software"],
  "sw-automotive-tech": ["automotive software", "connected car", "adas software", "in vehicle", "autonomous", "mobility software", "dealer software"],

  /* ── Manufacturing ──────────────────────────────────────────────────────── */
  "mfg-industrial-equipment": ["machinery", "industrial equipment", "capital equipment", "pumps", "compressors", "machine tools", "process equipment"],
  "mfg-automation": ["automation", "robotics", "plc", "scada", "dcs", "controls", "industrial iot", "motion control systems", "mechatronics"],
  "mfg-electrical-equipment": ["electrical equipment", "power systems", "transformers", "switchgear", "motors", "drives", "energy management hardware"],
  "mfg-test-measurement": ["test and measurement", "instruments", "metrology", "sensors", "calibration", "inspection", "oscilloscope"],
  "mfg-conglomerate": ["conglomerate", "diversified industrial", "multi industry", "holding company industrial"],
  "mfg-hvac-building": ["hvac", "heating", "cooling", "air conditioning", "refrigeration", "building systems", "elevators", "fire and security"],
  "mfg-packaging": ["packaging", "cartons", "corrugated", "flexible packaging", "bottling equipment", "labels"],
  "mfg-metals": ["steel", "metals", "mining", "aluminium", "aluminum", "foundry", "smelting", "alloys"],
  "mfg-building-products": ["building products", "cement", "concrete", "glass", "insulation", "roofing", "gypsum", "construction materials"],
  "mfg-tools": ["tools", "hardware", "power tools", "fasteners", "abrasives", "cutting tools"],
  "mfg-agricultural-equipment": ["agricultural equipment", "tractors", "farm machinery", "construction equipment", "mining equipment", "off highway", "earthmoving"],
  "mfg-electronics-components": ["electronics manufacturing", "ems", "pcb", "contract manufacturing", "connectors", "passive components", "cables"],
  "mfg-motion-control": ["motion control", "hydraulics", "pneumatics", "bearings", "valves", "actuators", "seals", "flow control"],
  "mfg-print-imaging": ["printing", "printers", "imaging", "copiers", "document systems", "scanners", "3d printing", "additive manufacturing"],

  /* ── BFSI ───────────────────────────────────────────────────────────────── */
  "fin-retail-bank": ["retail bank", "commercial bank", "consumer banking", "credit union", "deposits", "mortgage", "branch banking", "corporate banking"],
  "fin-investment-bank": ["investment bank", "capital markets", "m and a", "private equity", "hedge fund", "brokerage", "securities", "underwriting"],
  "fin-insurance-pc": ["p and c", "property and casualty", "general insurance", "reinsurance", "commercial lines", "motor insurance", "specialty insurance", "lloyds"],
  "fin-insurance-life": ["life insurance", "health insurance", "annuities", "pensions", "retirement", "protection", "life insurer"],
  "fin-asset-management": ["asset management", "investment management", "wealth management", "mutual funds", "etf", "private banking", "pension fund", "custody"],
  // Payments was one row and is now four. `fin-payments` keeps the general payment
  // words so it still pairs with `sw-payments` across the industry boundary (the
  // assertion in search-terms.test.ts); the three siblings carry only the words that
  // point at THEM, so a query narrows to the right corner.
  "fin-payments": [
    "payments", "payment gateway", "payment processing", "psp", "payment service provider",
    "acquirer", "merchant acquiring", "issuer processing", "pos acquiring", "checkout",
    "payment infrastructure", "fintech",
  ],
  "fin-card-network": [
    "card network", "card scheme", "payment network", "payment rails", "interchange",
    "card association", "credit card network", "debit network",
  ],
  "fin-money-transfer": [
    "money transfer", "remittance", "cross border payments", "wallet", "digital wallet",
    "prepaid", "foreign exchange", "fx", "money movement", "payouts", "atm",
  ],
  "fin-expense-cards": [
    "corporate cards", "commercial cards", "expense management", "spend management",
    "fuel cards", "fleet cards", "gift cards", "prepaid cards", "procurement cards",
    "corporate payments",
  ],
  "fin-fintech-lending": ["fintech", "digital lending", "neobank", "challenger bank", "bnpl", "buy now pay later", "consumer credit", "peer to peer lending", "credit platform", "digital bank"],
  "fin-market-data": ["market data", "credit bureau", "credit information", "ratings", "financial data", "reference data", "index provider", "credit scoring"],
  "fin-exchange": ["exchange", "stock exchange", "clearing", "trading venue", "settlement", "post trade", "derivatives exchange", "custodian"],
  "fin-insurance-broker": ["insurance broker", "broking", "claims", "loss adjusting", "tpa", "third party administrator", "reinsurance broking", "risk advisory"],
  "fin-software-services": ["financial technology services", "processing services", "bank technology", "outsourced processing", "regtech", "kyc", "aml", "financial crime"],

  /* ── Healthcare & Lifescience ───────────────────────────────────────────── */
  "hc-pharma": ["pharma", "pharmaceutical", "drugs", "generics", "specialty pharma", "vaccines", "branded drugs", "otc"],
  "hc-biotech": ["biotech", "biotechnology", "biologics", "gene therapy", "cell therapy", "biosimilars", "genomics", "mrna"],
  "hc-medical-devices": ["medical devices", "medtech", "implants", "surgical", "imaging equipment", "orthopaedics", "orthopedics", "cardiovascular devices", "dental"],
  "hc-diagnostics": ["diagnostics", "lab", "laboratory", "pathology", "in vitro diagnostics", "ivd", "testing services", "reference lab"],
  "hc-provider": ["hospital", "clinic", "care delivery", "provider", "health system", "primary care", "nursing", "physician group"],
  "hc-cro": ["cro", "clinical research", "contract research", "clinical trials", "cdmo", "pharmacovigilance", "regulatory affairs", "biometrics"],
  "hc-life-science-tools": ["life sciences tools", "lab instruments", "reagents", "consumables", "sequencing", "chromatography", "bioprocessing", "mass spectrometry"],
  "hc-pharma-distribution": ["pharma distribution", "wholesaler", "pbm", "pharmacy", "drug distribution", "specialty distribution", "cold chain pharma"],
  "hc-payer": ["payer", "health plan", "health insurance", "benefits", "managed care", "hmo", "claims administration", "tpa health"],
  "hc-health-it": ["health it", "healthtech", "digital health", "ehr", "emr", "telehealth", "patient engagement", "population health", "care platform"],

  /* ── Automotive ─────────────────────────────────────────────────────────── */
  "auto-oem": ["oem", "car maker", "carmaker", "passenger vehicles", "automaker", "vehicle manufacturer", "luxury cars", "motorcycles"],
  "auto-commercial-oem": ["trucks", "commercial vehicles", "buses", "heavy vehicles", "trailers", "fleet manufacturer"],
  "auto-ev": ["ev", "electric vehicle", "battery electric", "e mobility", "charging", "electrification"],
  "auto-components": ["tier 1", "auto components", "auto parts", "powertrain", "tyres", "tires", "braking", "interiors", "seating", "supplier"],
  "auto-software": ["in vehicle software", "automotive electronics", "adas", "infotainment", "ecu", "autosar", "connected vehicle", "autonomous driving"],
  "auto-engineering-services": ["automotive engineering", "vehicle engineering services", "design services automotive", "prototyping", "homologation", "testing automotive"],

  /* ── Telecom ────────────────────────────────────────────────────────────── */
  "tel-operator": ["telco", "mobile operator", "mno", "isp", "broadband", "carrier", "wireless operator", "fixed line", "5g operator"],
  "tel-equipment": ["telecom equipment", "networking equipment", "routers", "switches", "radio access", "ran", "optical", "base station", "cpe"],
  "tel-satellite": ["satellite", "space communications", "vsat", "leo", "geo satellite", "earth station"],
  "tel-cpaas": ["cpaas", "communications api", "sms api", "voice api", "messaging platform", "ucaas", "sip", "video api"],
  "tel-infrastructure": ["network infrastructure", "managed services network", "towers", "fibre", "fiber", "data centre interconnect", "network deployment"],

  /* ── Semiconductors ─────────────────────────────────────────────────────── */
  "semi-fabless": ["fabless", "chip design", "soc", "asic", "processor", "gpu", "npu", "chipset", "silicon design"],
  "semi-foundry": ["foundry", "fab", "wafer", "osat", "packaging semiconductor", "assembly and test", "memory manufacturing", "idm"],
  "semi-equipment": ["semiconductor equipment", "wafer fab equipment", "lithography", "etch", "deposition", "metrology semiconductor", "photoresist", "semiconductor materials"],
  "semi-ip": ["semiconductor ip", "eda", "design tools", "ip cores", "rtl", "physical design", "verification", "silicon ip"],
  "semi-analog": ["analog", "power management", "mixed signal", "rf", "mosfet", "pmic", "discrete semiconductors", "sensors semiconductor"],
  "semi-components": ["electronic components", "photonics", "optoelectronics", "lasers", "mems", "displays", "leds"],

  /* ── Retail ─────────────────────────────────────────────────────────────── */
  "ret-apparel": ["apparel", "footwear", "clothing", "fashion", "shoes", "garments", "accessories brand"],
  "ret-sportswear": ["sportswear", "athletic", "activewear", "athleisure", "sports brand", "outdoor brand"],
  "ret-luxury": ["luxury", "premium brand", "jewellery", "jewelry", "watches", "designer", "high end"],
  "ret-grocery": ["grocery", "supermarket", "convenience", "food retail", "hypermarket", "c store", "fuel retail"],
  "ret-home-improvement": ["home improvement", "diy", "furnishings", "furniture", "hardware retail", "home decor", "garden"],
  "ret-general-merchandise": ["department store", "general merchandise", "mass retail", "discount retail", "big box", "variety store"],
  "ret-ecommerce": ["ecommerce", "e commerce", "online retail", "d2c", "direct to consumer", "marketplace retail", "online store"],
  "ret-specialty": ["specialty retail", "category retail", "pet retail", "beauty retail", "toys", "books", "optical retail"],
  "ret-consumer-brand": ["consumer brand", "consumer products", "branded goods", "licensed brands"],
  "ret-auto-parts": ["auto parts retail", "aftermarket", "spares", "tyre retail", "tire retail", "vehicle servicing"],

  /* ── Media & Entertainment ──────────────────────────────────────────────── */
  "med-broadcast": ["broadcast", "tv", "television", "studio", "film", "streaming service", "radio", "production"],
  "med-publishing": ["publishing", "news", "newspaper", "magazine", "books publisher", "journals", "academic publishing"],
  "med-advertising": ["advertising", "agency", "creative agency", "media buying", "brand marketing", "pr", "communications agency"],
  "med-adtech": ["adtech", "programmatic", "dsp", "ssp", "ad measurement", "attribution", "audience data", "ad exchange"],
  "med-gaming": ["gaming", "esports", "video games", "game publisher", "game studio", "console"],
  "med-gambling": ["gambling", "betting", "igaming", "casino", "sportsbook", "lottery", "wagering"],
  "med-information-services": ["information services", "research services", "data services", "intelligence", "analyst firm", "benchmarking"],

  /* ── Professional Services ──────────────────────────────────────────────── */
  "prof-accounting": ["accounting", "audit", "tax", "assurance", "cpa", "bookkeeping", "big four", "financial reporting services"],
  "prof-legal": ["legal", "law firm", "litigation", "counsel", "legal process outsourcing", "lpo", "ip services"],
  "prof-consulting": ["consulting", "strategy", "management consulting", "transformation", "advisory", "operations consulting"],
  "prof-engineering-consulting": ["engineering consulting", "technical consulting", "testing inspection certification", "tic", "environmental consulting", "surveying"],
  "prof-staffing": ["staffing", "recruitment", "talent", "workforce services", "contingent labour", "contingent labor", "rpo", "executive search"],
  "prof-bpo": ["bpo", "business process outsourcing", "shared services", "back office services", "customer service outsourcing", "gbs", "ito", "call centre", "call center"],
  "prof-market-research": ["market research", "consumer insights", "surveys", "panels", "brand tracking", "mystery shopping"],
  "prof-facilities": ["facilities management", "real estate services", "fm", "workplace services", "property management", "corporate real estate", "cre"],
  "prof-marketing-services": ["marketing services", "advertising services", "brand services", "content marketing", "crm services", "field marketing"],
  "prof-compliance": ["regulatory services", "compliance services", "certification", "risk consulting", "screening", "background checks", "esg assurance"],

  /* ── Chemicals & Materials ──────────────────────────────────────────────── */
  "chem-specialty": ["specialty chemicals", "additives", "adhesives", "catalysts", "surfactants", "performance materials", "lubricants"],
  "chem-commodity": ["commodity chemicals", "petrochemicals", "polymers", "plastics", "resins", "olefins", "base chemicals"],
  "chem-coatings": ["paints", "coatings", "pigments", "inks", "varnish", "decorative paints", "industrial coatings"],
  "chem-agrochemicals": ["agrochemicals", "crop protection", "seeds", "pesticides", "fertiliser", "fertilizer", "herbicides", "crop science"],
  "chem-industrial-gases": ["industrial gases", "oxygen", "nitrogen", "hydrogen", "helium", "cryogenics", "welding gases"],
  "chem-flavours": ["flavours", "flavors", "fragrances", "ingredients", "aromas", "food ingredients", "nutrition ingredients"],
  "chem-packaging": ["packaging materials", "films", "laminates", "flexible packaging materials", "barrier materials", "industrial packaging"],

  /* ── Energy & Utilities ─────────────────────────────────────────────────── */
  "enr-oil-gas": ["oil and gas", "upstream", "downstream", "refining", "lng", "exploration", "petroleum", "integrated energy"],
  "enr-oilfield-services": ["oilfield services", "drilling", "well services", "seismic", "subsea", "offshore services", "completions"],
  "enr-power-generation": ["power generation", "ipp", "thermal power", "nuclear", "gas turbines power", "captive power"],
  "enr-renewables": ["renewables", "solar", "wind", "green energy", "battery storage", "hydro", "geothermal", "clean energy", "hydrogen energy"],
  "enr-utilities": ["utility", "grid", "transmission", "distribution utility", "water utility", "electricity supplier", "gas utility", "smart metering"],
  "enr-energy-equipment": ["energy equipment", "energy technology", "turbines", "inverters", "trackers", "grid equipment", "ev charging equipment"],

  /* ── Logistics & Transportation ─────────────────────────────────────────── */
  "log-freight": ["3pl", "third party logistics", "freight forwarding", "4pl", "warehousing", "customs brokerage", "contract logistics", "trucking", "less than truckload"],
  "log-maritime": ["shipping", "maritime", "ocean freight", "container lines", "tankers", "vessel operations", "bulk carriers", "chartering"],
  "log-express": ["express", "parcel", "courier", "last mile", "same day delivery", "postal", "e commerce delivery"],
  "log-rail": ["rail", "railway", "surface transport", "intermodal", "rolling stock operations", "road transport"],
  "log-ports": ["ports", "terminals", "container terminal", "stevedoring", "harbour", "harbor", "inland container depot"],

  /* ── Architecture, Engineering, & Construction ──────────────────────────── */
  "aec-engineering": ["engineering design", "architecture", "consulting engineers", "epcm", "structural", "mep", "urban planning", "bim services"],
  "aec-construction": ["construction", "contracting", "epc", "general contractor", "civil works", "infrastructure delivery", "project management construction"],
  "aec-construction-equipment": ["construction equipment", "cranes", "formwork", "scaffolding", "modular", "aggregates", "site equipment"],
  "aec-shipbuilding": ["shipbuilding", "shipyard", "marine engineering", "naval architecture", "vessel construction", "offshore fabrication"],

  /* ── Consumer Electronics ───────────────────────────────────────────────── */
  "ce-devices": ["consumer electronics", "smartphones", "wearables", "audio", "cameras", "tv hardware", "smart home devices"],
  "ce-computing": ["computing hardware", "pc", "laptop", "servers", "workstations", "peripherals", "printers hardware"],
  "ce-storage": ["storage", "enterprise storage", "data centre hardware", "data center hardware", "ssd", "hdd", "nas", "san"],
  "ce-appliances": ["appliances", "white goods", "home appliances", "kitchen appliances", "washing machines", "small appliances"],

  /* ── Consumer Packaged Goods ────────────────────────────────────────────── */
  "cpg-food": ["packaged food", "snacks", "confectionery", "dairy brands", "frozen food", "cereal", "baked goods", "food brands"],
  "cpg-beverages": ["beverages", "brewing", "beer", "spirits", "soft drinks", "wine", "bottling", "energy drinks", "juices"],
  "cpg-personal-care": ["personal care", "beauty", "cosmetics", "skincare", "haircare", "oral care", "fragrance brands", "toiletries"],
  "cpg-home-care": ["home care", "household products", "cleaning products", "detergents", "laundry", "hygiene", "tissue"],
  "cpg-diversified": ["diversified consumer goods", "multi category consumer", "fmcg conglomerate", "tobacco"],

  /* ── Aerospace & Defense ────────────────────────────────────────────────── */
  "aero-components": ["aerospace components", "aerostructures", "avionics", "landing gear", "cabin interiors", "aerospace systems", "mro parts"],
  "aero-primes": ["prime contractor", "defence prime", "defense prime", "airframer", "space systems", "missiles", "military platforms", "shipbuilding defence"],
  "aero-engines": ["aircraft engines", "propulsion", "turbines aero", "jet engines", "engine mro", "rocket propulsion"],
  "aero-defense-electronics": ["defence electronics", "defense electronics", "radar", "electronic warfare", "c4isr", "military communications", "sonar", "night vision"],

  /* ── Travel & Hospitality ───────────────────────────────────────────────── */
  "trv-hotels": ["hotels", "hospitality operations", "resorts", "lodging", "serviced apartments", "casinos resorts", "cruise"],
  "trv-agency": ["travel services", "booking", "ota", "online travel", "travel management", "tmc", "tour operator", "corporate travel"],
  "trv-mobility": ["car rental", "ride hailing", "taxi", "car sharing", "fleet leasing", "mobility services", "chauffeur"],

  /* ── Agribusiness & Food Processing ─────────────────────────────────────── */
  "agr-food-processing": ["food processing", "food manufacturing", "meat processing", "milling", "edible oils", "ingredients processing", "dairy processing"],
  "agr-agribusiness": ["agribusiness", "commodities", "grain trading", "plantations", "farming", "aquaculture", "animal nutrition", "agri trading"],

  /* ── Aviation ───────────────────────────────────────────────────────────── */
  "avi-airline": ["airline", "carrier", "flag carrier", "low cost carrier", "cargo airline", "flight operations", "passenger airline"],
  "avi-services": ["aviation services", "mro", "ground handling", "airport services", "catering aviation", "fbo", "line maintenance"],

  /* ── Education ──────────────────────────────────────────────────────────── */
  "edu-institution": ["university", "college", "school", "training provider", "higher education", "vocational", "certification body", "test prep"],
  "edu-edtech": ["edtech", "e learning", "elearning", "online courses", "mooc", "learning platform", "tutoring platform", "corporate learning"],

  /* ── Wholesale ──────────────────────────────────────────────────────────── */
  "whl-industrial-supplies": ["industrial distribution", "mro supplies", "industrial supplies", "electrical distribution", "fasteners distribution", "safety supplies"],
  "whl-building-materials": ["building materials distribution", "builders merchant", "lumber", "plumbing supplies", "hvac distribution", "roofing distribution"],

  /* ── Restaurant & Food Service ──────────────────────────────────────────── */
  "rst-qsr": ["qsr", "quick service", "fast food", "drive thru", "franchise restaurants", "pizza", "coffee chain", "burgers"],
  "rst-dining": ["restaurant chains", "casual dining", "food service", "catering", "contract catering", "cafes", "full service restaurants"],

  /* ── Electrical & Electronics ───────────────────────────────────────────── */
  "ele-electrical-products": ["electrical products", "wiring devices", "cables and wires", "circuit protection", "lighting", "electrical accessories", "enclosures"],
};

/**
 * Extra search terms for HQ COUNTRY, keyed by the exact entry in `HQ_COUNTRIES`.
 *
 * Short by design. The list is every country in the world and the field is a sort
 * preference rather than a match key, so the only entries that earn a term are the
 * ones a visitor plausibly types under another name — `UK` for somebody who thinks
 * "England", `USA` for somebody who thinks "America", and the handful of official
 * long forms that begin with a different letter than the common name does.
 */
export const HQ_COUNTRY_TERMS: Readonly<Record<string, readonly string[]>> = {
  UK: ["united kingdom", "britain", "great britain", "england", "scotland", "wales", "northern ireland", "gb"],
  USA: ["united states", "america", "us", "u s a"],
  UAE: ["united arab emirates", "dubai", "abu dhabi", "emirates"],
  Netherlands: ["holland", "dutch"],
  "South Korea": ["korea", "republic of korea"],
  "North Korea": ["korea"],
  China: ["prc", "mainland china"],
  "Hong Kong": ["hk", "hong kong sar"],
  Taiwan: ["roc", "chinese taipei"],
  Ireland: ["republic of ireland", "eire"],
  Switzerland: ["swiss"],
  Germany: ["deutschland"],
  Japan: ["nippon"],
  India: ["bharat"],
  Russia: ["russian federation"],
  "Czech Republic": ["czechia"],
  Turkey: ["turkiye"],
  "Saudi Arabia": ["ksa", "kingdom of saudi arabia"],
  Vietnam: ["viet nam"],
  Myanmar: ["burma"],
  "Ivory Coast": ["cote d ivoire", "cote divoire"],
  Eswatini: ["swaziland"],
  "Cape Verde": ["cabo verde"],
  "North Macedonia": ["macedonia"],
  "Democratic Republic of the Congo": ["drc", "congo kinshasa", "zaire"],
  Congo: ["congo brazzaville", "republic of the congo"],
  "Timor-Leste": ["east timor"],
  Bahamas: ["the bahamas"],
  Laos: ["lao"],
  Syria: ["syrian arab republic"],
  Iran: ["persia"],
};
