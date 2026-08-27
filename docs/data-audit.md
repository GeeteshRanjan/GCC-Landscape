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
| 6 | Sub-Industry | **620** | Unusable as a match key. Dropped. See below. |
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

**Resolution: sub-industry is dropped entirely, from both the schema and the input form.** Measured
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

So the ladder is industry + revenue band, then industry + adjacent revenue band, then whatever
exists. That reaches 98% and needs no sub-industry taxonomy work at all.

The HQ-country row is the reason country priority must be a **sort preference rather than a
filter**: filtering on it costs 33 points of coverage.

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
| CPG | 24 | 14 | 18 |
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

## What the product needs and this file does not have

- **Functions per company.** Screen 1 Part 2 shows functions common across peers. No column here.
- **Headcount per city.** `GCC FTE Range` is company-wide, and `GCC Location(s)` is an unweighted
  list. Oracle spans eight cities in the 19,700–19,800 band; nothing says how that splits. So the
  India heatmap can weight a city by number of GCCs and not by number of people, and no per-city
  headcount claim can be made from this file.
- **Global headcount / global tech workforce.** Needed as the denominator for "India GCC as a share
  of global tech workforce". Not present, and not derivable.
- **Function-view metrics.** Every Screen 2 number. Separate dataset, not yet supplied. The
  catalogue that will hold them now exists — see below.
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

**35 metric definitions**, transcribed from `docs/brief.md` and seeded from
`src/data/metric-catalogue.ts`:

| Function area | Metrics |
| --- | --- |
| Technology | 8 |
| Operations | 9 |
| HR | 12 |
| Finance | 6 |

Filed against four internal lenses — supply, speed, place, cost. The brief's author used six, adding
Fit and Optional; both collapse into supply, because both were supply questions (Fit is comparative
capability supply across delivery locations, and the Optional diversity block is the composition of
the workforce on offer). Nothing from the brief lost a home. **The lens is never a public label** —
`publicMetric` strips the field, and the admin surface labels the groupings as internal.

**Values entered: 1 of 35, and that is deliberate.** None of the Screen 2 figures have been supplied.
Seeding plausible-looking numbers would put fabricated data in front of a CIO evaluating a
several-hundred-person commitment, so every metric ships with `value: null` and is left off the
public screen until it is filled. The single exception is `tech-capability-comparison`, whose India /
Poland / Philippines cells are the worked example in the brief itself, carried over as supplied;
Vietnam is a comparator the brief names but does not rate, so that column is empty and the metric
therefore still counts as incomplete.

**Four gated metrics**, matching the invariant list in `project.md`:
`hr-cost-per-employee-served`, `hr-fully-loaded-cost`, `fin-cost-vs-ecosystem-depth`,
`fin-workplace-cost-gradient`.

**What a visitor would receive today**, measured through `publicMetricsFor` — the same function the
public screens will call: `tech 0, operations 0, hr 2, finance 2`. The four are the gated ones, which
always ship as a placeholder of the right shape; every open metric is still incomplete.

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
