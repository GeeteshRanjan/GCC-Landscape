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
size, which is why there are 158 of them and not 65.

## The two vocabularies, and why they differ in kind

| | Count | Editable | Why |
| --- | --- | --- | --- |
| **Tags** (`src/data/business-tags.ts`) | 137 | Code only | The substrate every peer score is computed against. A tag nobody else carries matches nothing; deleting one silently re-scores every peer set in the product. |
| **Business types** (`src/data/business-type-catalogue.ts`) | 158 | Admin | What a visitor picks and a company is assigned. ANSR must be able to add "Quick commerce" without a developer. |

Tags are grouped on six axes — form, buyer, vertical served, product domain,
operating character, sector specifics. The axes are an authoring aid; the scorer
treats every tag identically.

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
| Business types defined | 158 |
| Distinct tags in use | 137 |
| Companies with a business type | 1768 |
| Companies with two business types | 50 |
| Industries fully tagged | 18 |
| Business types with no company | 6 |
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

### Software & Internet — 624/656 tagged, 30 types
Cybersecurity (72) · Data & analytics platform (41) · Developer tools & DevOps (39) · Healthcare software (34) · Cloud & infrastructure software (33) · Banking & financial software (32) · Telecom software & network systems (32) · IT & digital engineering services (30) · CRM & customer experience software (26) · Marketing technology (26) · Design & engineering software (21) · Legal, contract & compliance software (21) · AI & machine learning platform (19) · Finance, accounting & tax software (19) · Supply chain & procurement software (18) · Travel & hospitality software (17) · Consumer internet & marketplace (17) · Media & content technology (17) · Retail & commerce software (15) · HR & workforce software (14) · Automotive & mobility software (14) · ERP & core business systems (13) · Collaboration & productivity software (13) · Public sector software (13) · Construction & real estate software (13) · Education technology (11) · Insurance software (10) · Logistics & mobility software (7) · Payments & financial infrastructure (5) · Gaming & interactive entertainment (2)

### BFSI — 181/189 tagged, 11 types
Asset & investment management (40) · Retail & commercial banking (38) · Life & health insurance (20) · Payments & card networks (20) · Property & casualty insurance (17) · Investment banking & capital markets (16) · Fintech & digital lending (14) · Exchanges & trading venues (14) · Financial technology & processing services (10) · Financial data & credit information (9) · Insurance broking & claims services (7)

### Manufacturing — 187/207 tagged, 14 types
Electrical equipment & power systems (32) · Motion, flow & control components (24) · Industrial machinery & equipment (21) · HVAC & building systems (20) · Industrial automation & controls (15) · Test & measurement instruments (13) · Agricultural, construction & mining equipment (13) · Electronics & components manufacturing (11) · Tools & hardware (8) · Printing, imaging & document systems (8) · Diversified industrial conglomerate (7) · Steel, metals & mining (7) · Building products & materials (6) · Packaging manufacturing (4)

### Healthcare & Lifescience — 135/135 tagged, 10 types
Pharmaceuticals (46) · Health information & care platforms (25) · Medical devices (23) · Hospitals & care delivery (11) · Life sciences tools & instruments (7) · Health insurance & benefits management (6) · Biotechnology (5) · Clinical research & development services (5) · Pharmaceutical distribution (5) · Diagnostics & laboratory services (4)

### Telecom — 76/76 tagged, 5 types
Telecom network operator (54) · Telecom & networking equipment (14) · Communications platforms & APIs (3) · Network infrastructure & managed services (3) · Satellite & space communications (2)

### Automotive — 75/76 tagged, 6 types
Automotive components (Tier 1) (51) · Vehicle manufacturer (OEM) (13) · Electric vehicle manufacturer (3) · In-vehicle software & electronics (3) · Automotive engineering services (3) · Commercial vehicle & truck manufacturer (2)

### Semiconductors — 72/72 tagged, 6 types
Fabless chip design (41) · Semiconductor manufacturing & foundry (8) · Analog, power & mixed-signal semiconductors (8) · Semiconductor equipment & materials (7) · Semiconductor IP & design tools (5) · Electronic components & photonics (3)

### Retail — 60/60 tagged, 10 types
Apparel & footwear brand (18) · Grocery & convenience retail (11) · Specialty retail (8) · Home improvement & furnishings retail (6) · Department store & general merchandise (6) · E-commerce & online retail (6) · Automotive parts retail & distribution (3) · Luxury & premium brand (2) · Sportswear & athletic brand (1) · Consumer products brand (0)

### Media & Entertainment — 56/58 tagged, 7 types
Advertising & marketing services (15) · Broadcasting & studios (12) · Publishing & news (8) · Advertising technology & measurement (6) · Information & research services (6) · Gaming & esports (5) · Online gambling & betting (4)

### Professional Services — 45/45 tagged, 10 types
Accounting, audit & tax (14) · Legal services (8) · Market research & consumer intelligence (7) · Engineering & technical consulting (4) · Advertising & marketing services (4) · Management & strategy consulting (3) · Facilities & real estate services (3) · Regulatory & compliance services (2) · Staffing & workforce services (0) · Business process outsourcing (0)

### Chemicals & Materials — 43/43 tagged, 7 types
Specialty chemicals (26) · Commodity & petrochemicals (5) · Paints & coatings (4) · Agrochemicals & seeds (4) · Flavours, fragrances & ingredients (2) · Industrial packaging materials (2) · Industrial gases (1)

### Energy & Utilities — 36/36 tagged, 6 types
Oilfield & energy services (15) · Integrated oil & gas (8) · Energy equipment & technology (5) · Renewable energy (4) · Power generation (3) · Utilities & grid operations (1)

### Architecture, Engineering, & Construction — 29/29 tagged, 4 types
Construction & contracting (12) · Engineering & design services (11) · Construction equipment & materials (5) · Shipbuilding & marine engineering (1)

### Consumer Electronics — 29/29 tagged, 4 types
Consumer electronics & devices (19) · Computing hardware & servers (5) · Enterprise storage & data centre hardware (3) · Home appliances (2)

### Logistics & Transportation — 28/31 tagged, 5 types
Freight forwarding & third-party logistics (12) · Shipping & maritime transport (10) · Express & parcel delivery (3) · Rail & surface transport (2) · Ports & terminal operations (1)

### Consumer Packaged Goods — 24/24 tagged, 5 types
Diversified consumer goods (14) · Beverages & brewing (6) · Packaged food (2) · Personal care & beauty (2) · Household & home care products (0)

### Aerospace & Defense — 18/18 tagged, 4 types
Aerospace & defense primes (8) · Aerospace components & systems (7) · Aircraft engines & propulsion (2) · Defense electronics & systems (1)

### Travel & Hospitality — 15/15 tagged, 3 types
Hotels & hospitality operations (6) · Travel services & booking (6) · Car rental & ride hailing (3)

### Agribusiness & Food Processing — 11/11 tagged, 2 types
Food processing (10) · Agribusiness & commodities (1)

### Aviation — 7/7 tagged, 2 types
Airline operations (7) · Aviation services & maintenance (0)

### Education — 6/6 tagged, 2 types
Education & training provider (4) · Education technology & e-learning (2)

### Wholesale — 5/5 tagged, 2 types
Industrial supplies distribution (5) · Building materials distribution (0)

### Restaurant & Food Service — 4/4 tagged, 2 types
Quick service restaurants (3) · Restaurant chains & food service (1)

### Electrical & Electronics — 2/2 tagged, 1 types
Electrical products & components (2)

## Known judgement calls

- **`sw-it-services` holds 30 companies.** Several are language and content services
  firms (Lionbridge, RWS, TransPerfect, Straive, i-Merit) with no closer type. If
  localisation deserves its own type, that is a code change to the catalogue.
- **Life vs P&C insurance** was split per company from world knowledge; the source
  column said only "Insurance" for 33 companies.
- **Elevator makers** (Otis, Kone, Schindler) sit in `mfg-hvac-building` on the
  "building systems" reading.
- **Alphabet** carries `sw-marketplace` + `sw-cloud-infra`. The vetting pass argued
  for adding `sw-martech`, since advertising is most of revenue; `sw-marketplace`
  already carries the `advertising-services` tag, so the scoring outcome is close to
  identical.
- **Six business types have no company** and are reachable only if an admin assigns
  one. They are kept because they are the correct home for values a future spreadsheet
  batch may contain.
