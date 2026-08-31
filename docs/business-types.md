# Business types — the peer-matching vocabulary

Reference detail, read on demand. Not steering.

This is the review artifact for the tagging. It exists so the business judgement can
be checked in an hour instead of by reading 1834 rows.

## The problem this solves

Industry is too coarse for the large industries. Retail lumps footwear brands with
home-improvement chains and e-commerce marketplaces; Software & Internet, at 656
companies, puts a fintech platform beside a hyperscaler. Measured before the change,
a visitor from Nike received:

> Amazon · Walmart · Target · Lowe's · 7-Eleven

All five are in Retail and in Nike's revenue band, and a CIO can see at a glance that
none of them is a comparable operation. Per invariant 3, one bad peer discredits the
whole card.

After:

> TJX · H&M · Adidas · GAP · Lululemon Athletica

## Why not sub-industry

The source spreadsheet has a Sub-Industry column with 620 values over 1834 companies.
`docs/data-audit.md` dropped it because, as a match key, it covered **35.8%** of
companies against 91.8% for industry + revenue band.

That measurement was correct and the conclusion drawn from it was too narrow: it
measured sub-industry **as a filter competing with industry**. One bucket per company
cannot fix the failure anyway, because the failure is in the fall-through. Retail has
60 companies and five slots, so once apparel is exhausted the next peer is whoever is
biggest in Retail — which is exactly how Lowe's reached Nike's card. A better-sized
bucket fixes the head of the list and leaves the tail as it was.

**Multi-label tags have no bucket to exhaust.** Similarity is continuous, so a
business type with three members still produces a full, sensibly-ordered peer set
through tag adjacency, and the thin-bucket failure that killed sub-industry cannot
recur. The number of business types is therefore not bounded from below by peer-set
size, which is why there are 164 of them and not 65.

## The two vocabularies, and why they differ in kind

| | Count | Editable | Why |
| --- | --- | --- | --- |
| **Tags** (`src/data/business-tags.ts`) | 138 | Code only | The substrate every peer score is computed against. A tag nobody else carries matches nothing; deleting one silently re-scores every peer set in the product. |
| **Business types** (`src/data/business-type-catalogue.ts`) | 164 | Admin | What a visitor picks and a company is assigned. ANSR must be able to add "Quick commerce" without a developer. |

Tags are grouped on six axes — form, buyer, vertical served, product domain,
operating character, sector specifics. The axes are an authoring aid; the scorer
treats every tag identically.

### A business type's NAME is Title Case

At ANSR's request. The vocabulary was authored in sentence case — "Apparel & footwear
brand" — and reads as Title Case throughout: **Apparel & Footwear Brand**. A new type
added in admin follows the same convention; there is no check enforcing it, because a
naming convention is not something a publish should be blocked on.

The rule that produced the 161 renames, and the three cases that needed deciding:

- **A word carrying a capital past its first letter is left exactly as authored.** That
  is what protects `ERP`, `CRM`, `HR`, `IT`, `AI`, `IP`, `OTC`, `HVAC`, `APIs`, `DevOps`,
  `(OEM)`. Testing for any capital at all was the first attempt and it was too broad:
  `In-vehicle` has one, so it survived untouched beside `Third-Party Logistics`.
- **A hyphen starts a new word** — `Third-Party`, `Mixed-Signal`, `E-Commerce`,
  `E-Learning`, `In-Vehicle`. The alternative left the two halves of one compound cased
  differently.
- **Small words stay lowercase after the first position.** Nothing in the current 164
  contains one; the rule is stated so the next name added is "Point of sale systems" and
  not a later correction pass.

**A rule here, where a COMPANY name gets a lookup table**, and the difference is where
the strings came from. `COMPANY_NAME_FIXES` has to be a table because 1834 company names
arrive from the world in every convention at once, so any rule damages more marks than it
repairs (see `normalize.ts`). These 164 are one authored series in one notation written by
one hand, so a rule cannot hit a row it was not aimed at.

**Nothing that matches was touched.** A company references a business type by `id`, tags
are keyed by `id`, `search-terms.ts` is keyed by `id`, and `business-type-map.ts` maps the
spreadsheet's own sub-industry strings to `id`. It is a display change with no data
migration under it — which is why it had to be applied in BOTH `business-type-catalogue.ts`
and `data/dataset.json`: the catalogue is what a re-import seeds from, so changing only the
dataset would have let the next import silently undo it.

**Every tag is carried by at least two business types**, asserted by `data:verify`.
A tag on exactly one type is dead: it can only ever be shared in a
type-against-itself comparison, which already scores maximum. That rule did real
work — `tobacco`, `aircraft-engines`, `semiconductor-equipment`, `express-parcel`,
`industrial-gases` and about a dozen others were drafted and then removed once it was
clear one type would carry them. Each collapsed into a broader atom two or more types
genuinely share.

## How the score works

```
score = 0.7 × businessSimilarity + 0.3 × bandProximity
```

`businessSimilarity` is the share of the visitor's **IDF-weighted** tag mass the
company also carries. Each tag is weighted by how rare it is *inside the industry
being matched*, so `retail-operator` contributes nothing inside Retail while
`footwear` contributes a great deal. **No tag weight is hand-authored**, which is
what stops the weighting rotting: it re-derives itself as companies are added.

`bandProximity` is a three-step function — 1.0 same band, 0.66 adjacent, 0 otherwise.
Not linear index distance, for two reasons: the bands are not evenly spaced ($5–10 Bn
against Above $20 Bn), and the flat third step makes the untagged case reduce to
exactly the old three-rung ladder.

Business similarity dominates revenue band deliberately. `toCard` in `screen1.ts`
drops `revenueBand`, so the peer card never shows it — a band mismatch is invisible to
the visitor while a business mismatch is the first thing they see. The same reasoning
demotes HQ country from the comparator's first key to a tiebreak.

**The similarity floor (0.20) is applied to `businessSimilarity` alone**, never to the
combined score. A perfect band match is worth 0.3; if the floor were on the combined
score, a business-irrelevant company in the right revenue band would qualify, which is
the exact bug the module exists to prevent.

The floor can **shorten** a peer set. That is invariant 3 working as intended, and
`data:verify` records how often it happens (see below) so the trade between quality and
length is a number rather than a guess.

**Why 0.20.** Swept at 0.10, 0.15, 0.20 and 0.25 against the real dataset. The median peer
count is 5 at every value and no value ever empties a set, so the choice is decided at the
margin. Raising the floor does more than shorten: because a perfect band match is worth 0.3
of the combined score, a company *below* the floor can outrank one above it, so lifting the
floor evicts that interloper and promotes a better peer. Moving 0.15 → 0.20 changed the
membership of seven sets and in all seven the newcomer was more similar than the company it
replaced — a utilities and grid-operations visitor stopped seeing Shell, BP, ExxonMobil and
Chevron (0.190) and started seeing Nextracker, LM Wind Power and Aggreko (0.291); an
aircraft-engines visitor stopped seeing Boeing (0.156) and started seeing Moog (0.325).
0.10 was rejected because it shows Caterpillar and Holcim to a shipbuilding visitor on three
generic tags. 0.25 costs seven more short sets while removing no new class of bad peer.

## Guarantees

- **Coverage cannot regress.** With no line of business selected, the engine returns
  peers identical to the old band ladder. Asserted two ways: a unit-test sweep over
  every industry × band × HQ country against `matchPeersByBandLadder` as an oracle,
  and a `data:verify` invariant on the published dataset.
- **The industry is still a hard boundary.** Nothing can return a company from another
  industry. Relaxing it — making industry a heavily-weighted tag so a footwear brand
  could see a global personal-care brand — is a real option the tag architecture makes
  cheap, and a separate decision.
- **Untagged is safe.** A company with no business type still appears through
  industry-level matching, exactly as before. This is what let the tagging roll out
  incrementally.

## How companies were classified

Two sources, in precedence order, both in `scripts/business-type-map.ts`.

**1. `SUB_INDUSTRY_TO_TYPE` — 601 mappings, 1200 companies.** The sub-industry values
precise enough to imply a business type ("Retail - Apparel", "Cybersecurity",
"Chemicals - Specialty"). Keyed by `industry||subIndustry`, because the same string
means different things in different industries: "Engineering Services" is an
automotive engineering firm under Automotive and a construction consultancy under AEC.

A first pass came from keyword rules; every group was then read back **grouped by
target type**, which is the only way mis-groupings surface. About forty entries moved
in that pass — CAD and PLM out of collaboration into design tools, spend and expense
management out of payments, procurement into supply chain, contract and e-signature
into their own type.

**2. `COMPANY_TO_TYPES` — 568 companies, classified individually.** The catch-alls
carry no business meaning: "Enterprise Software" covers 203 companies, "Financial
Services" 74, "Industrial Manufacturing" 111. Each of these companies was classified
from what it actually does — which vertical buys the product, and whether it carries
risk, sells software, or sells human effort.

**66 companies are deliberately untagged** (`DELIBERATELY_UNTAGGED`). Two kinds: small
private firms whose business could not be established with confidence, and rows
mis-filed at source — a fabless chip designer under Software, a defence group under
Automotive, a real-estate developer under Manufacturing. Correcting a company's
*industry* is a separate data decision, so rather than force a wrong type inside a
wrong industry, these stay untagged and match at industry level.

### The vetting pass

Every assignment was reviewed by an independent pass instructed to find errors rather
than confirm them. Agreement was 93–95%, and the corrections are recorded inline in
`scripts/business-type-map.ts`. The review found five genuine gaps in the vocabulary,
all now closed:

| Gap | Fix |
| --- | --- |
| Insurance brokers (Aon, Marsh, Gallagher, WTW, Sedgwick) filed as P&C underwriters | `fin-insurance-broker`. A broker carries no `balance-sheet-risk`, the tag that most defines an underwriter. |
| Vendors to banks (Broadridge, MX, Smartstream, FIS) filed as banks | `fin-software-services` |
| Contract electronics and passive components (Flex, Jabil, TDK, TE Connectivity) with no home | `mfg-electronics-components` |
| Advertising agencies collapsing into management consulting | `prof-marketing-services` |
| Mining-equipment makers (Metso, Weir, Normet) carrying `agriculture` and nothing else | `mining` tag added; type renamed |

It also caught `auto-software` and `sw-automotive-tech` sharing a character-identical
label, now renamed.

## Coverage, as published

**1768 of 1834 companies (96%)** carry a business type. 18 of 24 industries are fully
tagged. 50 companies carry two types.

The live figures are pinned in `data/verify-baseline.json` and reproduced by
`npm run data:verify`:

| Figure | Value |
| --- | --- |
| Business types defined | 164 |
| Distinct tags in use | 138 |
| Companies with a business type | 1768 |
| Companies with two business types | 68 |
| Industries fully tagged | 18 |
| Business types with no company | 1 |
| **Peer sets the floor shortens** | **147 of 1064** |

That last row is the one to watch. It is the price of the quality gain: 147 of the
1064 industry × business-type × band combinations return fewer than five peers
because the rest were not close enough to name. If ANSR judges that price too high,
`SIMILARITY_FLOOR` in `src/data/similarity.ts` is the single number to move, and this
figure is how the effect is measured. At the previous floor of 0.15 it was 112; the 35
extra are the cost of the seven improved sets described above, and they fall in thin
low-band combinations rather than in the industries most visitors arrive from.

## The types, by industry

Company counts in brackets. This is the list to read when checking whether the
vocabulary matches how ANSR thinks about these markets.

### Software & Internet — 624/656 tagged, 31 types
Cybersecurity (72) · Data & Analytics Platform (41) · Developer Tools & DevOps (39) · Healthcare Software (34) · Cloud & Infrastructure Software (33) · Banking & Financial Software (32) · Telecom Software & Network Systems (32) · IT & Digital Engineering Services (24) · Localization & Content Services (6) · CRM & Customer Experience Software (26) · Marketing Technology (26) · Design & Engineering Software (21) · Legal, Contract & Compliance Software (21) · AI & Machine Learning Platform (19) · Finance, Accounting & Tax Software (19) · Supply Chain & Procurement Software (18) · Travel & Hospitality Software (17) · Consumer Internet & Marketplace (17) · Media & Content Technology (17) · Retail & Commerce Software (15) · HR & Workforce Software (14) · Automotive & Mobility Software (14) · ERP & Core Business Systems (13) · Collaboration & Productivity Software (13) · Public Sector Software (13) · Construction & Real Estate Software (13) · Education Technology (11) · Insurance Software (10) · Logistics & Mobility Software (7) · Payments & Financial Infrastructure (5) · Gaming & Interactive Entertainment (2)

### BFSI — 181/189 tagged, 14 types
Asset & Investment Management (40) · Retail & Commercial Banking (38) · Life & Health Insurance (20) · Property & Casualty Insurance (17) · Investment Banking & Capital Markets (16) · Fintech & Digital Lending (14) · Exchanges & Trading Venues (14) · Financial Technology & Processing Services (10) · Financial Data & Credit Information (9) · Payment Processing & Gateways (8) · Insurance Broking & Claims Services (7) · Money Transfer & Remittance (5) · Commercial & Expense Cards (4) · Card Networks & Schemes (3)

### Manufacturing — 187/207 tagged, 14 types
Electrical Equipment & Power Systems (32) · Motion, Flow & Control Components (24) · Industrial Machinery & Equipment (21) · HVAC & Building Systems (20) · Industrial Automation & Controls (15) · Test & Measurement Instruments (13) · Agricultural, Construction & Mining Equipment (13) · Electronics & Components Manufacturing (11) · Tools & Hardware (8) · Printing, Imaging & Document Systems (8) · Diversified Industrial Conglomerate (7) · Steel, Metals & Mining (7) · Building Products & Materials (6) · Packaging Manufacturing (4)

### Healthcare & Lifescience — 135/135 tagged, 11 types
Pharmaceuticals (43) · Health Information & Care Platforms (25) · Medical Devices (23) · Hospitals & Care Delivery (11) · Life Sciences Tools & Instruments (7) · Health Insurance & Benefits Management (6) · Biotechnology (5) · Clinical Research & Development Services (5) · Pharmaceutical Distribution (5) · Diagnostics & Laboratory Services (4) · Consumer Health & OTC (3)

### Telecom — 76/76 tagged, 5 types
Telecom Network Operator (54) · Telecom & Networking Equipment (14) · Communications Platforms & APIs (3) · Network Infrastructure & Managed Services (3) · Satellite & Space Communications (2)

### Automotive — 75/76 tagged, 6 types
Automotive Components (Tier 1) (51) · Vehicle Manufacturer (OEM) (13) · Electric Vehicle Manufacturer (3) · In-Vehicle Software & Electronics (3) · Automotive Engineering Services (3) · Commercial Vehicle & Truck Manufacturer (2)

### Semiconductors — 72/72 tagged, 6 types
Fabless Chip Design (41) · Semiconductor Manufacturing & Foundry (8) · Analog, Power & Mixed-Signal Semiconductors (8) · Semiconductor Equipment & Materials (7) · Semiconductor IP & Design Tools (5) · Electronic Components & Photonics (3)

### Retail — 60/60 tagged, 10 types
Apparel & Footwear Brand (18) · Grocery & Convenience Retail (11) · Specialty Retail (7) · Department Store & General Merchandise (6) · E-Commerce & Online Retail (6) · Home Improvement & Furnishings Retail (6) · Sportswear & Athletic Brand (6) · Automotive Parts Retail & Distribution (3) · Consumer Products Brand (2) · Luxury & Premium Brand (2)

### Media & Entertainment — 56/58 tagged, 7 types
Advertising & Marketing Services (15) · Broadcasting & Studios (12) · Publishing & News (8) · Advertising Technology & Measurement (6) · Information & Research Services (6) · Gaming & Esports (5) · Online Gambling & Betting (4)

### Professional Services — 45/45 tagged, 10 types
Accounting, Audit & Tax (14) · Legal Services (8) · Business Process Outsourcing (6) · Market Research & Consumer Intelligence (5) · Advertising & Marketing Services (4) · Engineering & Technical Consulting (4) · Management & Strategy Consulting (4) · Facilities & Real Estate Services (3) · Regulatory & Compliance Services (2) · Staffing & Workforce Services (1)

### Chemicals & Materials — 43/43 tagged, 7 types
Specialty Chemicals (26) · Commodity & Petrochemicals (5) · Paints & Coatings (4) · Agrochemicals & Seeds (4) · Flavours, Fragrances & Ingredients (2) · Industrial Packaging Materials (2) · Industrial Gases (1)

### Energy & Utilities — 36/36 tagged, 6 types
Oilfield & Energy Services (15) · Integrated Oil & Gas (8) · Energy Equipment & Technology (5) · Renewable Energy (4) · Power Generation (3) · Utilities & Grid Operations (1)

### Architecture, Engineering, & Construction — 29/29 tagged, 4 types
Construction & Contracting (12) · Engineering & Design Services (11) · Construction Equipment & Materials (5) · Shipbuilding & Marine Engineering (1)

### Consumer Electronics — 29/29 tagged, 4 types
Consumer Electronics & Devices (19) · Computing Hardware & Servers (5) · Enterprise Storage & Data Centre Hardware (3) · Home Appliances (2)

### Logistics & Transportation — 28/31 tagged, 5 types
Freight Forwarding & Third-Party Logistics (12) · Shipping & Maritime Transport (10) · Express & Parcel Delivery (3) · Rail & Surface Transport (2) · Ports & Terminal Operations (1)

### Consumer Packaged Goods — 24/24 tagged, 5 types
Beverages & Brewing (10) · Personal Care & Beauty (6) · Diversified Consumer Goods (5) · Packaged Food (5) · Household & Home Care Products (3)

### Aerospace & Defense — 18/18 tagged, 4 types
Aerospace & Defense Primes (8) · Aerospace Components & Systems (7) · Aircraft Engines & Propulsion (2) · Defense Electronics & Systems (1)

### Travel & Hospitality — 15/15 tagged, 3 types
Hotels & Hospitality Operations (6) · Travel Services & Booking (6) · Car Rental & Ride Hailing (3)

### Agribusiness & Food Processing — 11/11 tagged, 2 types
Food Processing (10) · Agribusiness & Commodities (1)

### Aviation — 7/7 tagged, 2 types
Airline Operations (7) · Aviation Services & Maintenance (0)

### Education — 6/6 tagged, 2 types
Education & Training Provider (4) · Education Technology & E-Learning (2)

### Wholesale — 5/5 tagged, 2 types
Building Materials Distribution (3) · Industrial Supplies Distribution (3)

### Restaurant & Food Service — 4/4 tagged, 2 types
Quick Service Restaurants (3) · Restaurant Chains & Food Service (1)

### Electrical & Electronics — 2/2 tagged, 1 types
Electrical Products & Components (2)

## Known judgement calls

- **`sw-it-services` was split.** It held 30 companies, six of them language, content
  and data-annotation firms (Lionbridge, RWS, Straive, Jouve, i-Merit, Centific) tagged
  identically to systems integrators. They are now `sw-content-services`; see the split
  subsection below.
- **Life vs P&C insurance** was split per company from world knowledge; the source
  column said only "Insurance" for 33 companies.
- **Elevator makers** (Otis, Kone, Schindler) sit in `mfg-hvac-building` on the
  "building systems" reading.
- **Alphabet** carries `sw-marketplace` + `sw-cloud-infra`. The vetting pass argued
  for adding `sw-martech`, since advertising is most of revenue; `sw-marketplace`
  already carries the `advertising-services` tag, so the scoring outcome is close to
  identical.
- **Six business types had no company. Five were mapping errors and are fixed;** the
  companies existed and were filed under a coarser bucket by the source Sub-Industry
  string. Korn Ferry read "Research and Consulting" and Indecomm read "Information
  Services", so both collapsed into market research, leaving Staffing and BPO
  selectable with nobody behind them. Reckitt, Henkel and Kimberly-Clark read
  "Personal & Home Care" and collapsed into `cpg-diversified`. Mattel read "Retail -
  Toys & Games" and became a retailer rather than a brand. Ferguson and Winsupply read
  "Industrial Supplies" and became industrial rather than building-materials
  distributors. Each correction is recorded beside its entry in
  `scripts/business-type-map.ts`, and `tests/unit/match-quality.test.ts` asserts all
  five by name so a re-import cannot revert them quietly.
- **One remains, and it is honest: `avi-services`.** All seven Aviation companies are
  airlines, so there is no MRO or ground-handling business in the data to map. Removing
  the row or sourcing companies for it is ANSR's decision.
- **`cpg-diversified` was carrying twelve of the 24 CPG companies**, Nestlé, PepsiCo
  and Coca-Cola among them, because the source writes "CPG - Food & Beverage" and
  "CPG - Consumer Products" for businesses that are plainly food or beverage. P&G,
  Unilever, Philip Morris, BAT and Herbalife are still diversified, and there the
  source is reading them correctly.
- **`ret-sportswear` was carrying one company.** Puma was the only row whose source
  string happened to read "Retail - Sportswear", while Nike, Adidas, Under Armour,
  Lululemon and Columbia Sportswear sat in generic apparel — so a sportswear brand who
  picked the row named after their business got a set excluding the four companies they
  most wanted to see. All five now carry BOTH types, because `tagsForCompany` takes the
  union and they are credible apparel peers as well.

## Splitting a bucket that conflated distinct businesses

`ret-sportswear` above fixed a row named after a business it did not contain. The
converse defect is a row that contains SEVERAL businesses, all tagged identically, so
the engine cannot order within it and falls back to band and size. The reported case
was a payments visitor (a Stripe) shown card networks and money-transfer firms ahead of
its true merchant-acquirer peers.

The source Sub-Industry does not help here: all 20 payments companies read the catch-all
"Financial Services", so the finer split is world knowledge, like the original
`COMPANY_TO_TYPES` pass. `fin-payments` (was "Payments & card networks") became four:

| Type | Distinguishing atom | Companies |
| --- | --- | --- |
| **Payment Processing & Gateways** (`fin-payments`, id kept) | `serves-retail` (merchants) | Adyen, Worldline, Verifone, Network International, TSYS, PayPal, Peach Payments, Partior |
| **Card Networks & Schemes** (`fin-card-network`) | `network-operator` | Visa, Mastercard, American Express |
| **Money Transfer & Remittance** (`fin-money-transfer`) | `b2c` | Western Union, Wise, Payoneer, Euronet, Travelex |
| **Commercial & Expense Cards** (`fin-expense-cards`) | `finance-systems` | Corpay, WEX, Pleo, Blackhawk Network |

Two design rules made this safe, and both generalise to the other conflated buckets:

1. **Each finer type carries one atom the siblings lack.** `businessSimilarity` is the
   share of the VISITOR's tag mass a company shares, so a company only ranks below a
   peer when the visitor carries a tag that company does not. No new tag was needed —
   the four distinguishers are existing atoms, reused elsewhere, so the ">= 2 types per
   tag" rule still holds. Pick a distinguisher that is RARE in the industry (`serves-retail`,
   `finance-systems`, `network-operator` are); a common one like `b2c` still orders correctly
   at the finer type's own band but is too weak to beat a large sibling two bands away.

2. **All four keep the shared payments core** (`payments-processing`, `fintech`,
   `regulated`, `transaction-revenue`), so a sibling stays above the 0.20 floor as a
   SECONDARY peer and no set gets shorter. Measured: floor-shortened sets held at 147,
   coherence held (0.921 → 0.918), and a $1–5 Bn processing visitor now sees Adyen at
   rank 3 where it was 16th. `tests/unit/peer-resolution.test.ts` guards all of this;
   `scripts/analyze-conflation.ts` and `scripts/measure-peers.ts` are the tools that
   find the next such bucket and prove the before/after.
### `fin-asset-management` → asset managers vs fund servicers

The same defect, in BFSI. "Asset & Investment Management" held 40 companies tagged
identically, so band-and-size ranking put fund administrators and custody banks ahead
of a visitor's true asset-manager peers (and vice-versa). Ten of the forty are not
principals at all — they are the back office that asset managers outsource to. Split
into two:

| Type | Distinguishing atom | Companies |
| --- | --- | --- |
| **Asset & Investment Management** (`fin-asset-management`, id kept) | `asset-management` | BlackRock, Blackstone, KKR, Apollo, Ares, Goldman Sachs, Morgan Stanley, Vanguard, Invesco, Franklin, Fidelity (Investments and International), Macquarie, Nomura, EQT, Oaktree, DE Shaw, AQR, Caxton, M&G, Credit Suisse, UBS, Charles Schwab, Ameriprise, Julius Baer, LPL, Voya, Principal, TIAA |
| **Fund Administration & Asset Servicing** (`fin-fund-services`) | `services-firm` + `outsourcing-bpo` | Citco, IQ-EQ (×2), Alter Domus, Apex Group, AMICORP, Formidium, FNZ Group (fund admin); BNY, State Street, Northern Trust (custody / asset servicing) |

The two mechanics are the payments ones. `fin-fund-services` carries `services-firm` and
`outsourcing-bpo` — the second is unique to it within BFSI, so it is a strong (rare)
distinguisher — and deliberately does NOT carry `asset-management`, which is the atom the
asset-management visitor holds and a servicer lacks. Both keep the shared core
(`capital-markets`, `regulated`, `b2b`, `asset-light`), so each stays a secondary peer of
the other above the 0.20 floor. Custody banks (BNY, State Street, Northern Trust) are folded
in rather than given their own type, and carry no `balance-sheet-risk` — their GCC work is
servicing, not principal risk, the same call `fin-insurance-broker` makes. Measured:
short-set count held at 154, coherence held (0.9185 → 0.9188), and a $1–5 Bn asset-management
visitor now leads with Invesco / DE Shaw / Vanguard / Julius Baer / EQT where Apex Group and
FNZ (servicers) had been in the top five. The finer categories are world knowledge, not in
the source — flagged for ANSR sign-off.

### `sw-it-services` → systems integrators vs localization & content services

The same defect, in Software & Internet. "IT & Digital Engineering Services" held 30
companies tagged identically, so band-and-size ranking put language and content firms ahead
of a visitor's true systems-integrator peers, and vice-versa. Six of the thirty are not IT
outsourcers at all — they sell human effort applied to language and content. Split into two:

| Type | Distinguishing atom | Companies |
| --- | --- | --- |
| **IT & Digital Engineering Services** (`sw-it-services`, id kept) | `billable-hours` | Impetus, Kasmo, Calsoft, Chetu, InterraIT, SoftwareONE, Rimini Street, TTEC, GEP, Impiger, InfoCepts, ThoughtFocus, Zapcom, Ranosys, Web Spiders, Stratogent, STG, Arete IR, Cyclotron, Cyderes, Empaxis, Magic Software, Proventeq, iMedX |
| **Localization & Content Services** (`sw-content-services`) | `content-language-services` | Lionbridge, RWS Group, Straive, Jouve, i-Merit, Centific |

This split needed a NEW atom — there was no localization/translation tag. `content-language-services`
is added to `business-tags.ts` and, per the ">= 2 types per tag" rule, carried by a second type,
`prof-bpo` (Business Process Outsourcing) — BPO content moderation, document processing and
multilingual support are the same labour, and prof-bpo sits in a different industry so it does not
dilute the atom's rarity inside Software & Internet, where only `sw-content-services` carries it.
Both types keep the shared services core (`services-firm`, `outsourcing-bpo`, `b2b`,
`enterprise-accounts`, `cross-industry`, `project-revenue`); `sw-content-services` drops
`billable-hours` (volume/project work, not time-and-materials consultancy). Measured: short-set
count held at 154, coherence held (0.9188 → 0.9182), and a $1–5 Bn localization visitor now leads
with Lionbridge / Straive / Centific / RWS where systems integrators had filled the top of the set;
the sibling integrator visitor no longer leads with content firms. The finer split is world
knowledge, not in the source — flagged for ANSR sign-off.

### `hc-pharma` → innovator/prescription pharma vs consumer health & OTC

The same defect, in Healthcare & Lifescience. "Pharmaceuticals" held 46 companies tagged
identically, so band-and-size ranking put branded consumer-health businesses ahead of a visitor's
true innovator-pharma peers, and vice-versa. A $10–20 Bn pharma visitor's top five were Viatris,
Kenvue, Regeneron, Teva and Haleon — Kenvue and Haleon are OTC self-care brands, not drug makers.
Three of the 46 are consumer-health / OTC operations, spun out of big pharma but run as branded
consumer goods. Split into two:

| Type | Distinguishing atom | Companies |
| --- | --- | --- |
| **Pharmaceuticals** (`hc-pharma`, id kept) | `clinical-research` + `r-and-d-intensive` + `biotech` | innovator, prescription and generics makers — Pfizer, Novartis, AstraZeneca, Merck, Roche, Sanofi, J&J, Eli Lilly, Novo Nordisk, Teva, Sandoz, Viatris, Regeneron … (43) |
| **Consumer Health & OTC** (`hc-consumer-health`) | `brand-owner` + `personal-care` | Haleon, Kenvue, Opella Healthcare |

The mechanics are the payments ones. `hc-consumer-health` carries `brand-owner`, `personal-care`
and `b2c` — the first two are carried by NO other Healthcare type, so both are maximally rare (and
heavily IDF-weighted) inside this industry — and deliberately drops `clinical-research`,
`clinical-regulated`, `biotech`, `r-and-d-intensive` and `b2b`, the innovator atoms an
innovator visitor holds and a consumer-health business lacks. Both keep the shared pharma core
(`process-manufacturing`, `pharmaceutical`, `regulated`, `supply-chain-heavy`), so each stays a
secondary peer of the other above the 0.20 floor and no set shortens. No new tag was needed — all
three distinguishers are existing atoms reused from the retail and CPG brands, so the ">= 2 types
per tag" rule still holds. Measured: short-set count held at 154, coherence 0.9182 → 0.9163 (the
price of the three consumer-health sets now correctly carrying pharma only as secondary peers, the
same tradeoff accepted for payments), and a $10–20 Bn pharma visitor now leads with Viatris /
Regeneron / Teva / Sandoz / Astellas where Kenvue and Haleon had been in the top five; a
consumer-health visitor leads with Kenvue / Haleon / Opella. Generics makers stay in `hc-pharma` —
they are prescription-drug operations and defensible peers of innovator pharma. The finer split is
world knowledge, not in the source — flagged for ANSR sign-off.
