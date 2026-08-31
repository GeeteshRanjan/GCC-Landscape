# Data audit — Consolidated_GCC_India_Database_2026_New.xlsx

Profiled 2026-08-26 with `python3 scripts/inspect_xlsx.py <file>`. Reproduce any number here with
that script. One sheet, `All GCC Data`: **1834 companies × 16 columns, no blank cells anywhere.**

Read this before designing the schema, the peer-matching rule, or the importer.

## Columns as supplied

| # | Header | Distinct | Notes |
| --- | --- | --- | --- |
| 0 | S.No. | 1834 | Row ordinal, stored as float (`1.0`). Discard — not an identity. |
| 1 | Company Name | 1833 | **One duplicate name.** Needs a real primary key. |
| 2 | Company HQ | 47 | Country, not city. Clean. |
| 3 | Company Type | 2 | Public / Private. Dropped — nothing in the brief uses it. |
| 4 | Company Revenue Band (2025) | 7 | Clean, well distributed. The similarity axis. |
| 5 | Industry / Sector | 24 | Clean, usable as-is. The match key. |
| 6 | Sub-Industry | **620** | Unusable as a match key. Read on import, collapsed into a business type, then discarded — never stored. See below. |
| 7 | GCC Establish Year | 74 | **Mixed types**: `2022` and `2022.0` are stored as distinct values. |
| 8 | GCC Location(s) | 277 | Comma-joined city list. Needs splitting into a relation. |
| 9 | Location Presence | 8 | Count of col 8. **Derive, don't store.** |
| 10 | GCC Headcount | 1083 | Float (`1225.0`). One company at 0. Dropped — see the midpoint measurement below. |
| 11 | GCC FTE Range | 130 | **The retained headcount field.** All 130 values are closed pairs — no open-ended forms. Only defect is dash inconsistency (`0-50` vs `0–50`). Parse to `(min, max)`. |
| 12 | Estimated GCC FTEs | 125 | Display string (`1200+`, `<50`). Dropped — derive from the range. |
| 13 | Fortune Global 500 | 2 | **181 companies Yes.** |
| 14 | Forbes Global 2000 | 2 | 483 Yes. |
| 15 | Tier-2 Presence | 2 | 166 Yes. Derivable from col 8 given a tier-1 city list. |

## The finding that changes the design: sub-industry is too granular

620 sub-industry values across 1834 companies — roughly three companies each. Coverage of a
"five same-sub-industry peers" rule, measured:

| Bucket | Sub-industries | Companies covered |
| --- | --- | --- |
| ≥1 company | 620 | 1834 (100%) |
| ≥2 | 196 | 1410 (77%) |
| ≥3 | 111 | 1240 (68%) |
| ≥5 | 58 | 1065 (58%) |
| ≥10 | 23 | 848 (46%) |

**Resolution: sub-industry is never a match key, and is not stored.** Measured
coverage of every candidate match key, counting a company as covered when its bucket holds at least
six members so five peers can be shown:

| Match key | Covered | Buckets |
| --- | --- | --- |
| Industry only | 1823 (99.4%) | 24 |
| **Industry + revenue band** | **1683 (91.8%)** | 136 |
| **Industry + revenue band ±1 step** | **1795 (97.9%)** | — |
| Industry + HQ country | 1437 (78.4%) | 267 |
| Industry + revenue band + HQ country | 1082 (59.0%) | 556 |
| Sub-industry + revenue band *(original spec)* | 657 (35.8%) | 932 |

So the band ladder is industry + revenue band, then industry + adjacent revenue band, then
whatever exists. That reaches 98% and needs no sub-industry taxonomy work at all.

The HQ-country row is the reason country priority must be a **sort preference rather than a
filter**: filtering on it costs 33 points of coverage.

### What the 35.8% figure does and does not settle

Every number above measures a candidate match key **as a filter competing with industry**. That
is the right measurement for a filter and it settled the question for filters: sub-industry
cannot be one.

It does not settle whether the column is *useful*, and the peer sets showed it was not settled.
Industry alone put Amazon, Walmart, Target, Lowe's and 7-Eleven in front of a visitor from Nike —
all Retail, all in the right revenue band, and none of them a comparable operation. A better-sized
bucket would not have fixed it either: Retail has 60 companies and five slots, so once apparel is
exhausted the next peer is whoever is biggest in the industry, which is exactly how Lowe's got
there.

**Resolution: the 620 values are collapsed into 161 business types carrying a 137-tag vocabulary,
and similarity is scored continuously rather than filtered.** Coverage does not move, because a
visitor who selects no line of business gets the band ladder's peers unchanged — asserted as an
invariant, not assumed. The design, the vetting and the coverage figures are in
`docs/business-types.md`.

### The measurement that says whether the collapse worked

Sub-industry coverage was the wrong question. The right one is **peer-set coherence**: mean pairwise
business similarity across the five companies actually returned, symmetrised, using the same weights
the engine ranks by. It is implemented in `tests/unit/match-quality.test.ts` and it separates the
two paths through the form by a factor of three to seven:

| Industry | Companies | Visitor names a sub-industry | Visitor takes `All of {industry}` |
| --- | --- | --- | --- |
| Software & Internet | 656 | 0.93 | 0.23 |
| Manufacturing | 207 | 0.94 | 0.13 |
| BFSI | 189 | 0.96 | 0.31 |
| Retail | 60 | 0.90 | 0.27 |
| Healthcare & Lifescience | 135 | 0.96 | 0.30 |

Two things follow, and both are why a reported "these peers are nothing like us" is usually not a
scoring bug.

**The degraded path cannot be improved from inside the engine.** With no sub-industry there is no
business signal at all, so the score collapses to band proximity and the ordering is the old
three-rung ladder's — provably, per `similarity.test.ts`. The 0.13 in Manufacturing is the honest
value of "five companies that share a revenue band".

**So the leverage is entirely in DISCOVERY.** Measured against 102 ordinary trade words a leader
would type for their own business — `fintech`, `saas`, `3pl`, `bpo`, `insurtech`, `medtech`, `qsr`,
`reinsurance`, `wafer` — **41 matched no row in the dropdown at all**, because the filter tested the
row's printed label as a substring. `src/data/search-terms.ts` is the fix and
`tests/unit/search-terms.test.ts` keeps all 41 as the regression list.

### Six sub-industries had no companies; five were mapping errors

A sub-industry a visitor can pick and nobody carries is the primary ordering question answered for
nothing. Found by the same test file, and five of the six traced to the source Sub-Industry string
being read too coarsely:

| Sub-industry | Was | Because the source says |
| --- | --- | --- |
| Staffing & workforce services | Korn Ferry filed as market research | "Research and Consulting" |
| Business process outsourcing | Indecomm filed as market research | "Information Services" |
| Household & home care products | Reckitt, Henkel, Kimberly-Clark filed as diversified | "Personal & Home Care" |
| Consumer products brand | Mattel filed as a retailer | "Retail - Toys & Games" |
| Building materials distribution | Ferguson, Winsupply filed as industrial supplies | "Industrial Supplies" |

The sixth, **Aviation services & maintenance, is honestly empty** — all seven Aviation entries are
airlines, so there is no MRO or ground-handling company to map. Removing the row or sourcing
companies for it is ANSR's call.

Two further corrections came out of the same pass. **`cpg-diversified` held twelve of the 24 CPG
companies**, including Nestlé, PepsiCo and Coca-Cola, because the source writes "CPG - Food &
Beverage" and "CPG - Consumer Products" for companies that are plainly food or beverage businesses.
And **`ret-sportswear` held one company** — Puma, the only row whose source string happened to read
"Retail - Sportswear" — while Nike, Adidas, Under Armour, Lululemon and Columbia sat in generic
apparel. All are recorded per company in `scripts/business-type-map.ts` with the reasoning beside
them.

## Cell comments: three of them, dropped

`xl/comments1.xml` holds source notes — LinkedIn pages, an MCA/ROC filing, a JLR press release.
There are **3 comments in the whole file**, so they were never a usable provenance layer. Dropped.
If per-field sourcing is wanted later it needs to be a real column, not cell notes.

## Cities

Six cities carry the database; the tail is long and thin. Counts are company-appearances, so they
sum past 1834 because 626 companies list more than one city.

Bengaluru 1004 · Hyderabad 434 · Pune 372 · NCR 334 · Chennai 282 · Mumbai 224 · Coimbatore 36 ·
Ahmedabad 27 · Kolkata 26 · Trivandrum 24 · Vadodara 19 · Kochi 12 · Jaipur 12 · Chandigarh 9 ·
Mangaluru 8 · tail below 8.

`NCR` is a region rather than a city, and stands in for Gurgaon/Noida/Delhi. Fine as a label, but
it needs a deliberate decision if the UI ever maps or ranks cities.

## Industry sizes, and the top-band problem

Feeds two Screen 1 blocks: the "X other companies in your industry" count, and the largest-companies
panel. There is no revenue figure in the data, only a band, so nothing can be ranked by revenue —
the panel takes the highest band that has members in the industry and fills downward.

| Industry | Total | Above $20 Bn | ≥ $10 Bn |
| --- | --- | --- | --- |
| Software & Internet | 656 | 16 | 24 |
| Manufacturing | 207 | 26 | 52 |
| BFSI | 189 | 53 | 76 |
| Healthcare & Lifescience | 135 | 36 | 52 |
| Automotive | 76 | 33 | 44 |
| Telecom | 76 | 13 | 17 |
| Semiconductors | 72 | 7 | 15 |
| Retail | 60 | 17 | 30 |
| Media & Entertainment | 58 | 3 | 15 |
| Professional Services | 45 | **0** | 3 |
| Chemicals & Materials | 43 | 7 | 17 |
| Energy & Utilities | 36 | 12 | 17 |
| Logistics & Transportation | 31 | 8 | 15 |
| Architecture, Engineering, & Construction | 29 | 3 | 7 |
| Consumer Electronics | 29 | 12 | 15 |
| Consumer Packaged Goods | 24 | 14 | 18 |
| Aerospace & Defense | 18 | 9 | 11 |
| Travel & Hospitality | 15 | 1 | 5 |
| Agribusiness & Food Processing | 11 | 5 | 8 |
| Aviation | 7 | 6 | 6 |
| Education | 6 | **0** | **0** |
| Wholesale | 5 | 1 | 1 |
| Restaurant & Food Service | 4 | 1 | 2 |
| Electrical & Electronics | 2 | **0** | **0** |

Professional Services, Education and Electrical & Electronics have nobody in the top band, and the
last two have nobody above $10 Bn either. The panel must walk down the bands, not assume a threshold.
Education and Electrical & Electronics are also too small (6 and 2 companies) for a five-peer set at
all — they fall to the "state the shortfall" path every time.

## No open-ended ranges to repair

Checked, because it looked like a cleanup task. **Every one of the 130 FTE Range values is a closed
pair.** Widths: 50 wide for 450 companies, 100 wide for 1380, and five outliers at 200–1000 wide.
Largest upper bound is 60,000.

The open-ended forms (`100+`, `<50`, `11700+`) appear only in `Estimated GCC FTEs`, which is a
display string derived from the range and is being dropped. So no upper ceiling needs inventing.

Revenue bands are likewise seven closed bands. The two ends — `< $100 Mn` and `Above $20 Bn` — are
open by design, which is what a top and bottom band are for.

## Size on disk

Serialised to the fields actually kept, all 1834 companies come to **326 KB raw, 33 KB gzipped**.
That is why there is no database: the entire dataset is smaller than a photograph, loads into memory
in one read, and every query the product makes is a filter and a sort.

## Dropping exact headcount costs almost nothing

Exact GCC headcount is dropped in favour of the FTE range. The one thing that seemed to depend on it
is Screen 1 Part 3, a *sum* of professionals employed. Measured against range midpoints:

| Set | Exact sum | From range midpoints | Error |
| --- | --- | --- | --- |
| Fortune Global 500 (181 companies) | 1,058,997 | 1,059,175 | +0.0% |
| All 1834 companies | 2,607,569 | 2,610,500 | +0.1% |

**The figure the strip publishes is now the UNION of the two indices, not the Fortune subset.** ANSR
asked for both, and the deduplication is a property of how it is computed rather than a correction
applied afterwards — the sum is taken over companies filtered on *either* index, so a company on both
lists appears once. The overlap is large enough that the distinction is most of the figure:

| Set | Companies | Professionals from midpoints |
| --- | --- | --- |
| Fortune Global 500 | 181 | 1,059,175 |
| Forbes Global 2000 | 483 | 1,640,100 |
| On both | 171 | — |
| **Either index (published)** | **493** | **1,688,200** |
| The two sums added, i.e. the double count | — | 2,699,275 |

So a naive addition would overstate by 1,011,075 — 60% of the true figure. `indexedProfessionals` in
`peers.ts` is the single definition; `data:verify` pins it as a profile figure under
"professionals, either index (deduplicated)".

The ranges are narrow enough (mostly 100-wide buckets) that midpoints reproduce the aggregate within
a tenth of a percent. Reporting a rounded figure — "over a million professionals" — is unaffected.
Per-peer display becomes a band rather than a precise number, which reads better anyway.

## Cleaning the importer must do

Every one of these is a real defect in the current file, not a hypothetical.

1. Coerce year off float-strings (`2022.0` → 2022) before any grouping.
2. Parse FTE range into a `(min, max)` integer pair. Handles both dash variants and the open-ended
   forms in one place.
3. Resolve the duplicate company name; mint a stable slug key.
4. Split the city list into a relation against a canonical city table.
5. Coerce Yes/No columns to boolean.
6. Recompute location count and tier-2 presence, and **report any disagreement with the supplied
   values** as an import warning. A mismatch means the source row is stale.
7. Collapse Sub-Industry into a business type through `scripts/business-type-map.ts`. An
   unmapped value leaves the company untagged and is reported as a warning rather than failing
   the import — a future batch will contain strings nobody has seen, and untagged is safe.

## Company-name shapes: 13 corrected, and the rest deliberately not

Classified by shape rather than read one by one, because the useful question was which classes
contain a defect and which contain brand styling. Corrections live in `COMPANY_NAME_FIXES` in
`src/data/normalize.ts` and are applied in `readRows` beside `canonicalIndustry`.

| Class | Count | Defects | Left alone |
| --- | --- | --- | --- |
| Full capitals, 5+ letters | 23 | 5 — DR. MARTENS, GRUPO ANTOLIN, KDDI CORPORATION, OIA GLOBAL, ADVANZ PHARMA | 18 are how the company writes itself: SABIC, AECOM, IQVIA, ABBYY, GEODIS, MULTIVAC, STRATACACHE, TEOCO, TOMIA, IDEMIA, CIRCOR, AMICORP, COMPLY, DAMAC, EVERSANA, FICOSA, INVECAS, SOBIS |
| Starts lowercase | 20 | 3 — eurofins, ilantus, o9 solutions | 17 are brand styling: eBay, iSolved, pSemi, smartShift, d-Matrix, dSpace, eClinicalWorks, ePropelled, eRevMax, e-con, f5, iMedX, i-Merit, lastminute.com, blueBriX, ebm-papst, eSentire |
| Spaced dash | 1 | 1 — `EA - Electronic Arts` → `EA (Electronic Arts)`, the parenthetical form the file already uses 20+ times | 37 unspaced hyphens are all correct (Coca-Cola, Rolls-Royce, T-Mobile) |
| Lowercase after a hyphen or dot | 12 | 3 — Sanmina-sci, Read-ink, Iq-eq | 9 are genuine: N-able, Harrison.ai, Digital.ai, Kore.ai, Observe.ai, SiMa.ai, Musafir.com, CeX Webuy.com, Jiffy.ai |
| Misspelled brand | — | 1 — `Victoria Secret` → `Victoria's Secret` | — |
| Trailing `Inc.` / `Corp.` / `Plc.` | 28 | **0.** Left exactly as supplied | Stripping them would rewrite a legal name on a judgement about house style, and only 28 of 1,834 carry one |
| Stray whitespace | 0 | 0 | `cleanText` already handles the non-breaking space below; a test asserts no name carries stray whitespace |

**A case-only correction is free. Anything that changes a letter has to be edited in
`scripts/business-type-map.ts` too**, which keys on `industry||name` and folds case but not letters —
so a corrected spelling the map still holds in its old form silently drops the company's business
type, and untagged is a safe state and therefore an invisible one. Two of the 13 change a letter and
both are edited in both places; `tests/unit/normalize.test.ts` asserts every corrected company is
still tagged.

### Three duplicate-looking pairs, left as they are

| Pair | Same | Different |
| --- | --- | --- |
| Astera Labs / Astera Labs | HQ, industry, founded 2024 | revenue band, cities, FTE |
| IQ-EQ / IQ-EQ | HQ, industry, revenue band | founded 2022 vs 2026, cities, FTE |
| STATS Perform / Stats Perform | HQ | industry, cities, FTE, year |

Kept as separate rows with suffixed slugs. Merging any of them changes the company count and
therefore every profile figure in `data/verify-baseline.json`, and whether each pair is one entity or
two GCC entries for one entity is ANSR's call, not something the spreadsheet answers. The IQ-EQ pair
previously differed only by casing, which hid the collision rather than recording it; both rows now
read `IQ-EQ` and the duplicate is visible.

### Two taxonomy values worth a decision, not corrected here

- **`Scotland` is an HQ country.** It is part of the UK, and the UK is also in the list, so one
  visitor's peers sort differently from another's for no reason. Renaming cascades into every company
  that references it, which is the taxonomy editor's job and a publish of its own.
- **`Vishakhapatnam`** is the source's spelling; `Visakhapatnam` is standard. It also has to agree
  with `CITY_COORDINATES` in `geo.ts`, so the rename is two edits, not one.

## Two whitespace defects worth naming

Both were invisible until they broke a lookup, and both are handled by `cleanText`.

- At least one cell contains a **non-breaking space** inside the value:
  `"Healthcare\u00a0Enterprise Management"`. JavaScript's `\s` matches U+00A0 so `cleanText`
  normalises it, but any tool that only calls `.strip()` will not, and the mismatch shows up as a
  silent lookup miss rather than an error.
- Company names are **not unique, even case-insensitively**. "STATS Perform" (Software & Internet)
  and "Stats Perform" (Media & Entertainment) are different companies. Any per-company lookup keyed
  on name must also be scoped by industry; keyed on name alone it gives both rows the same value.

## What the product needs and this file does not have

- **Functions per company.** Screen 1 Part 2 shows functions common across peers. No column here.
- **Headcount per city.** `GCC FTE Range` is company-wide, and `GCC Location(s)` is an unweighted
  list. Oracle spans eight cities in the 19,700–19,800 band; nothing says how that splits. So the
  India heatmap can weight a city by number of GCCs and not by number of people, and no per-city
  headcount claim can be made from this file.
- **Global headcount / global tech workforce.** Needed as the denominator for "India GCC as a share
  of global tech workforce". Not present, and not derivable.
- **Function-view metrics.** Every Screen 2 number. A separate dataset with no spreadsheet behind it;
  supplied directly by ANSR and now populated in full — see below.
## What the import found that this profile did not

Added 2026-08-27, after the seed import ran. Everything above profiles the file **as supplied**;
these are the deltas that only appear once the cleaning in `src/data/normalize.ts` has run.
Reproduce all of it with `npm run data:import -- --dry-run`, and assert it with `npm run data:verify`.

**Three duplicate company names, not one.** `Astera Labs` is the raw duplicate counted in column 1.
`Stats Perform` and `IQ-EQ` collide only after whitespace normalisation, so a profile of the raw
strings cannot see them. All six rows are kept with distinct slugs — two rows may be two genuinely
different entities, and merging them is an admin decision, not an importer's.

**Two rows list the same city twice** — `Precisely` and `SMEC`. This is the whole explanation for
their supplied Location Presence being one higher than their city list. De-duplicating within a row
drops NCR's appearance count from 334 to **332**; every other city count above is unaffected.

**128 distinct FTE ranges, not 130.** Two of the 130 source strings are dash variants of a range
already present, so normalising to an integer pair collapses them. The drop is the dash fix working,
not data loss.

### Tier-1 city membership, decided by measurement

Deriving Tier-2 Presence needs a tier-1 list, and the source does not supply one. Candidate sets
scored against the source's own flag (166 Yes):

| Candidate tier-1 set | Agrees with source |
| --- | --- |
| Six majors (Bengaluru, Hyderabad, Pune, NCR, Chennai, Mumbai) | 1798 / 1834 |
| **Six majors + Kolkata** | **1822 / 1834** |
| Six majors + Kolkata + Ahmedabad | 1796 / 1834 |

So Kolkata is tier-1 in the source's own terms and Ahmedabad is not. Recorded as `TIER1_CITIES` in
`src/data/derive.ts`. The 12 remaining disagreements are reported as import warnings and **not
reconciled** — the derived value wins, because the supplied column is not carried into the dataset at
all. Derived tier-2 presence is therefore 176 companies, not 166.

### Size on disk, as published

`data/dataset.json` is 720 KB, 56 KB gzipped. The 326 KB / 33 KB figures above are minified; the
published file is pretty-printed so that a publish produces a reviewable line-per-field diff, which
is the reason git can stand in for a database at all. The Screen 2 catalogue added roughly 20 KB of
that.

## The Screen 2 function metric catalogue

Added 2026-08-27. Nothing in this section comes from the spreadsheet — this is the second dataset,
and it has no spreadsheet behind it at all. It lives under `metrics` in the same `dataset.json`, and
the figures are typed into admin.

**35 metric definitions, all with figures**, transcribed from `docs/brief.md` and seeded from
`src/data/metric-catalogue.ts`. Revised 2026-08-28 against ANSR's review, then three times more; the
counts below are current:

| Function area | Metrics | A visitor receives |
| --- | --- | --- |
| Technology | 8 | 8 |
| Operations | 9 | 9 |
| HR | 10 | 10 |
| Finance | 8 | 8 |

Five movements behind those numbers:

- **`tech-community-events` was removed** at ANSR's request, in the pass that rebuilt the technology
  tab to the supplied composition. It held two parts — about 1,400 active technical meetup groups
  across the top eight cities, and about 120 major conferences a year. Deleted rather than gated or
  emptied, on the same reasoning as the diversity block below, and deliberately NOT folded into the
  figure row at the head of the tab: the ask was for the community evidence off that page, not moved
  up it. The figures are in git.
- **`tech-graduate-output` was replaced by `tech-graduate-pipeline`**, which is a net zero on the
  count and a real change to what the tab shows. The shared nine-discipline split is unchanged and
  still on the operations and HR tabs; the technology tab now carries a two-part metric holding two of
  that metric's OWN figures — 1.5M "Engineering, other disciplines" and 450K "Management and MBA
  graduates". No figure is new, none is aggregated, and the two are drawn adjacent rather than nested.
  See "The graduate pair" below.
- **`hr-workforce-diversity` was removed** at ANSR's request, taking HR from 11 to 10. It held three
  percentages — women across India GCCs, women in technology roles, women in engineering degree
  enrolment. Deleted rather than gated or emptied: a gated card claims a figure is being withheld and
  an empty definition can be half-filled into a live card, and the metric is out of scope rather than
  either.
- **`hr-graduate-output` was removed and is RESTORED**, both at ANSR's request, so HR went 10 → 9 → 10
  and is back where it started. It was dropped on the argument that a nine-way disciplinary split is a
  claim about national graduate supply while the decision on that page is about hiring an India team —
  reach, speed to fill a seat, speed to scale, and what the same person costs next year. That is
  overruled rather than disproved: the commerce, finance and human-resources streams are the ones a
  CHRO recruits against, and no other tab shows them to that reader. `GRADUATE_OUTPUT` itself was never
  touched through either pass, so no figure moved and nothing forked — which is exactly why restoring
  it cost one line in the catalogue. Operations and HR now draw it through one component,
  `GraduateOutput` in `src/components/screen2/graduate-card.tsx`, so the two views cannot diverge.
- **Finance gained two, taking it from 6 to 8.** `fin-operating-cost-growth` and
  `fin-workplace-cost-growth` are the other two thirds of the brief's "cost advantage durability →
  growth YoY, split three ways: compensation, operating cost, workplace" — the compensation third
  being `fin-cost-growth` at 9.8%. **Both figures are PLACEHOLDERS at a round 10%**, placed so the
  cards can be demonstrated, flagged in their own notes and listed below with the other provisional
  figures. Neither has ever been supplied and neither is derived from anything; replacing them is an
  admin edit, not a code change.

### The tabs are four views of one national picture

The single largest correction from the review, and it changes how the catalogue is authored rather
than just what is in it. The four function tabs were carrying different figures for the same thing —
a technology bench strength and an operations bench strength, three separate graduate-output
splits, two different backfill times, two different scale curves. That implied the tool was
measuring four separate Indias. It is not: it is showing each function's leaders the figures they
are asked to justify, over one national picture.

So a metric that appears on more than one tab is now **authored once** in
`src/data/metric-catalogue.ts` and spread onto each tab with a different id. Six titles are shared,
and one of them has lost and regained a tab: graduate output was dropped from technology and then from
HR, and the HR view is back at ANSR's request, so it is on operations and HR. Each of those passes was
a change to where a metric APPEARS and not to what it says — the figure is untouched, and the
technology tab's own two-part pipeline reuses two of its parts unchanged rather than restating them:

| Metric | Tabs | Figure |
| --- | --- | --- |
| Bench strength | Technology, Operations, HR | 8.7M+ professionals |
| Graduate output by discipline | Operations, HR | 9 disciplines, 3.9M a year |
| Leadership depth | Technology, HR | 800,000 with 10+ years |
| Time to backfill a role | Operations, HR | 35–75 days |
| Time to first hire | Operations, HR | 7–70 days |
| Time to reach each scale milestone | Operations, HR | 6 / 12 / 24 / 36 months |

**Keeping it shared through the pass where only one tab drew it is what made restoring the HR view one
line.** The tidy-up available then was to inline it as an ordinary operations metric; it would have been
wrong twice, because two of its parts are quoted verbatim by `tech-graduate-pipeline` and because a
dropped view came back. The technology view is still dropped and the same rule still applies to it.

Four label changes landed in the HR pass and none of them touched a value:

- **`hr-salary-growth` is "Where salary pressure is strongest"**, with "Base salary growth, year on
  year" moved into its `unit`. Its five entries are reordered descending — 21.1, 20, 16.1, 9.8, 7.5 —
  which is an authored order rather than a sort at render, and "All roles" is now "All roles
  (reference)" so the comparator names itself in text as well as in colour.
- **`hr-cost-per-employee-served` is "HR support ratio"**, shortened because "per employee served"
  duplicated the unit — and on a gated card the title is one of only three fields that cross.
- **`TIME_TO_FIRST_HIRE`'s end labels are whole clauses** — "Hiring through an employer of record"
  and "Hiring directly into your own entity" — where they were fragments written to be prefixed with
  their own endpoint figure. Affects the operations tab's rendering of the same metric, which now
  reads the same way.
- **`SCALE_MILESTONES`'s entries lost their "To " prefix**: "50 FTEs" rather than "To 50 FTEs". The HR
  tab draws them as four positions on one line, where the first two land about 56px apart at 1024.

Every shared figure is a technology-role figure, and the cards deliberately do not say so — the
point is to let each leader read the India engineering market in the terms they answer for, not to
label every number "for technology roles".

`data:verify` carries this as an **invariant**, not a profile figure: metrics sharing a title must be
byte-identical apart from `id` and `functionArea`. The seed guarantees it by construction, but a
dataset that has been through admin does not — three separate rows are three separate things to edit,
and an admin correcting bench strength on one tab and not the others is exactly the drift the check
catches. There is no legitimate edit that makes two views of one number disagree, which is why
`--accept` cannot silence it.

### What else the review changed

- **Bench strength is 8.7M+**, replacing 5.8M, and is one figure rather than three.
- **Graduate output is one nine-discipline list** — engineering, CS and IT, electronics,
  mathematics, other sciences, commerce, management, finance and accounting, human resources —
  rather than a per-function slice of it.
- **Specialism figures raised and reordered**: full-stack 1.7M+, data 1.5M+, embedded and ER&D
  1.4M+, SRE and DevOps 1.3M+, cloud 1.2M+, AI and ML 1.2M+, cybersecurity 150,000+.
- **`tech-manager-depth` added**: 1.4M+ in manager and above roles, the middle of the pyramid
  between bench strength and leadership depth.
- **Leadership depth is one number**, 800,000 professionals with 10+ years. The two narrower claims
  it used to carry — technology leaders who had run 100+ engineer teams, and HR leaders who had
  built a centre from zero — were not answerable from the supplied data.
- **Time to first hire starts at 7 days**, on an employer of record, on both tabs. The operations
  copy previously started at 42 and hid the fastest route entirely.
- **`hr-legal-readiness-days` removed** outright.
- **Offer acceptance is one national figure**, 72%, not a four-city split: the visitor has not chosen
  a city at that point, and picking one for them reads as a recommendation.
- **`fin-cost-growth` is India's own wage growth alone**, 9.8%. The US and UK comparison and the
  derived "advantage narrowing" line are gone — one readable number rather than a three-way
  reconciliation, and the narrowing figure was an opinion rather than a measurement.
- **`fin-india-vs-hubs` compares umbrella functions**, not one role. Technology, Operations, Human
  resources, Finance. The technology row is the original derivation from the supplied senior-engineer
  comparison; the other three carry the same shape and are illustrative until real per-function
  figures arrive.

### The graduate pair, and the two aggregations deliberately not made

`tech-graduate-pipeline` holds exactly two figures, both of them `GRADUATE_OUTPUT`'s own parts,
unchanged: **1,500,000 "Engineering, other disciplines"** and **450,000 "Management and MBA
graduates"**. Two things it could have done and does not, each of which would have been a new claim
rather than a new drawing.

**It does not aggregate an engineering total.** Engineering, computer science and IT (300,000), and
electronics and communication (250,000) are documented as disjoint, so 2.05M is arithmetically
available. It is not authored, because "the annual engineering graduate output" is a claim about what
counts as engineering, and that is ANSR's to approve rather than ours to derive. So the stored figure
is preserved and the label says exactly what it measures — engineering disciplines OTHER than the two
counted separately. If ANSR approves an aggregate, it is a catalogue edit and the label changes with
it.

**It does not nest the MBA block inside engineering.** 450,000 is TOTAL management and MBA output. It
is not the number of MBA graduates who hold an engineering degree, and nothing supplied contains that
number — the two statements are not equivalent, and drawing the smaller block inside the larger asserts
an overlap nobody has measured. The two are drawn as adjacent proportional blocks, with no connector, no
bracket and **no overlap percentage anywhere**: an earlier draft carried "~26% of MBA graduates have an
engineering background", which had no source behind it and is not in this repository.

That decision is enforced rather than remembered. Containment is now an authored field on the metric —
`subset` in `src/data/schema.ts` — because it used to be INFERRED from two parts sharing a unit and the
smaller being under half the larger, and this pair satisfies both conditions while being disjoint. The
one real containment in the catalogue, `ops-grade-a-office-stock` (132 msf vacant of 854 total), now
declares it. A shared unit remains a precondition and never evidence.

### Floors, marked as floors

`atLeast` is new on the metric schema: a boolean on the DEFINITION, beside `format`, saying that this
metric's figures are a floor rather than a point measurement. Every figure it produces renders with a
trailing `+` — the headline and every part of a breakdown, applied in one place in
`src/data/screen2.ts` so a parts list cannot silently drop it and make a stronger claim than the data
does. It is refused on a rating, since an ordinal step has no "or more", and the gate drops it for a
gated metric, where it would qualify a figure that is not there. Five metrics carry it:
`tech-bench-strength`, `ops-bench-strength`, `hr-bench-strength`, `tech-manager-depth`,
`tech-ecosystem-size`.

Filed against four internal lenses — supply, speed, place, cost. The brief's author used six, adding
Fit and Optional; both collapse into supply, because both were supply questions (Fit is comparative
capability supply across delivery locations). **The lens is never a public label** — `publicMetric`
strips the field, and the admin surface labels the groupings as internal.

**One thing from the brief now has no home:** the Optional diversity block, whose only metric was
`hr-workforce-diversity`, removed at ANSR's request. Everything else the brief asks for is either
implemented or defined and awaiting a figure.

**Values entered: all 35, of which five are provisional.** The figures supplied 2026-08-27 and revised
2026-08-28 came from ANSR rather than from a source this repository can cite. Every metric is fully
populated — a partly-filled one is dropped from the public screen rather than rendered with holes in
it — but populated is not the same as measured, and the five exceptions are named rather than counted
so that promoting one to fact reads as a change to a list rather than as a number moving by one.

**The sample stamp is gone.** Every seeded metric used to carry `asOf: "Sample, not for publication"`,
which is a **public** field and rendered beside every figure on Screen 2. ANSR asked for it removed, so
the default in `seedMetricCatalogue` is deleted and `asOf` is now only ever a provenance string an
admin has typed; an absent one renders nothing. The trade is explicit and worth recording: the caveat
was the mechanism that made a not-yet-final figure arrive labelled rather than passed off as research,
and nothing replaces it. `data:verify` still reports how many metrics state no provenance — currently
35 — so the number going down remains the visible milestone, but it is now a count in a script rather
than a warning on the page.

Five figures are provisional, each recorded in its own note. Three were filled from judgement rather
than from the supplied data: Vietnam's column in the capability grid, the role-by-level grid in
`hr-fully-loaded-cost`, and the depth row for Pune and tier 2 in `fin-cost-vs-ecosystem-depth`. Two
are placeholders at a round 10% rather than judgement at all: `fin-operating-cost-growth` and
`fin-workplace-cost-growth`. `tests/unit/metrics.test.ts` asserts the `PLACEHOLDER` marker on the
latter two, so the figure can be edited from admin — the intended path — while removing the marker
fails the suite.

**No absolute money survived the import, and that is enforced rather than trusted.** The supplied
data contained per-head dollar amounts and per-square-foot rupee rents. Where the source also gave a
comparison base they were converted to an index — `fin-india-vs-hubs` divides the senior-engineer
figures through India's to give `India 100, Philippines 122, Mexico 167, Poland 189, US 367`, now the
technology row of a four-function grid, and
`fin-workplace-cost-gradient` indexes the Bengaluru rent card to `100 / 93 / 70 / 45 / 37`. Where it
gave no base, the grid was filled with illustrative indices carrying the shape the real data must
take. A unit test asserts the serialized catalogue contains no currency token in any field, `note`
included. **This rule is not about data quality and does not relax when the samples are replaced** —
the schema has no currency format, so an absolute per-head amount cannot be stored at all.

**Ranges collapse to their conservative end.** Several figures arrived as ranges and a breakdown slot
holds one number, so the end stored is the one that understates India's advantage: compensation 15%
rather than 22% below tier 1, latency at the top of each supplied span, the conservative end of each
scale milestone. Every affected metric records the full range in its note.

**Structure followed the data where the two disagreed.** Disruption days are split by city rather
than by cause, salary growth by specialism rather than one average, and uptime into campus versus
grid — because that is how the figures arrived. Seeded parts with no figure behind them were removed
rather than left empty, since an empty slot keeps the whole metric off the public screen.
`tech-open-source-signal` collapsed from a breakdown to a single figure for the same reason, and
`hr-cost-per-employee-served` was retitled to the staffing ratio it can actually hold. The 2026-08-28
review collapsed three more the other way — leadership depth, offer acceptance and `fin-cost-growth`
each became a single figure because the split they carried was narrower or noisier than the question.

**Four gated metrics**, matching the invariant list in `project.md`:
`hr-cost-per-employee-served`, `hr-fully-loaded-cost`, `fin-cost-vs-ecosystem-depth`,
`fin-workplace-cost-gradient`.

**What a visitor would receive today**, measured through `publicMetricsFor` — the same function the
public screens call: `tech 8, operations 9, hr 10, finance 8` — the whole catalogue, since nothing is
incomplete. Gated metrics count too, because they ship as a placeholder of the right shape rather
than not at all.

`npm run data:verify` records all of the above as **profile figures, not invariants**. Entering a
month of values is supposed to move them, so `-- --accept` is the correct response to a legitimate
edit. The gated set is recorded by id rather than counted, so a metric quietly losing its gate shows
up as a named change in the baseline diff rather than as a number going down by one.

Two figures the schema makes structurally impossible rather than merely discouraged:

- **No absolute per-head money figure.** There is no currency format in the schema, and a unit that
  looks like currency is rejected. Cost is indices, spreads and growth rates.
- **No figure inside a gated metric's public text.** A gated metric's title and question do cross to
  the browser, so digits in either are refused — the value being omitted server-side is no help if
  the sentence beside it gives the answer away.
