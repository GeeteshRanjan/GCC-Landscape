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

**Resolution: the 620 values are collapsed into 158 business types carrying a 137-tag vocabulary,
and similarity is scored continuously rather than filtered.** Coverage does not move, because a
visitor who selects no line of business gets the band ladder's peers unchanged — asserted as an
invariant, not assumed. The design, the vetting and the coverage figures are in
`docs/business-types.md`.

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
7. Collapse Sub-Industry into a business type through `scripts/business-type-map.ts`. An
   unmapped value leaves the company untagged and is reported as a warning rather than failing
   the import — a future batch will contain strings nobody has seen, and untagged is safe.

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

**35 metric definitions**, transcribed from `docs/brief.md` and seeded from
`src/data/metric-catalogue.ts`. Revised 2026-08-28 against ANSR's review; the counts below are
post-revision:

| Function area | Metrics |
| --- | --- |
| Technology | 9 |
| Operations | 9 |
| HR | 11 |
| Finance | 6 |

### The tabs are four views of one national picture

The single largest correction from the review, and it changes how the catalogue is authored rather
than just what is in it. The four function tabs were carrying different figures for the same thing —
a technology bench strength and an operations bench strength, three separate graduate-output
splits, two different backfill times, two different scale curves. That implied the tool was
measuring four separate Indias. It is not: it is showing each function's leaders the figures they
are asked to justify, over one national picture.

So a metric that appears on more than one tab is now **authored once** in
`src/data/metric-catalogue.ts` and spread onto each tab with a different id. Six titles are shared:

| Metric | Tabs | Figure |
| --- | --- | --- |
| Bench strength | Technology, Operations, HR | 8.7M+ professionals |
| Graduate output by discipline | Technology, Operations, HR | 9 disciplines, 3.9M a year |
| Leadership depth | Technology, HR | 800,000 with 10+ years |
| Time to backfill a role | Operations, HR | 35–75 days |
| Time to first hire | Operations, HR | 7–70 days |
| Time to reach each scale milestone | Operations, HR | 6 / 12 / 24 / 36 months |

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
capability supply across delivery locations, and the Optional diversity block is the composition of
the workforce on offer). Nothing from the brief lost a home. **The lens is never a public label** —
`publicMetric` strips the field, and the admin surface labels the groupings as internal.

**Values entered: all 35.** The figures supplied 2026-08-27 and revised 2026-08-28 came from ANSR
rather than from a source this repository can cite, and three of them were filled from judgement
(below). Rather than leave gaps that would read as bugs, every metric is populated.

**The sample stamp is gone.** Every seeded metric used to carry `asOf: "Sample, not for publication"`,
which is a **public** field and rendered beside every figure on Screen 2. ANSR asked for it removed, so
the default in `seedMetricCatalogue` is deleted and `asOf` is now only ever a provenance string an
admin has typed; an absent one renders nothing. The trade is explicit and worth recording: the caveat
was the mechanism that made a not-yet-final figure arrive labelled rather than passed off as research,
and nothing replaces it. `data:verify` still reports how many metrics state no provenance — currently
35 — so the number going down remains the visible milestone, but it is now a count in a script rather
than a warning on the page.

Three metrics were filled from judgement rather than from the supplied data, each recorded in its own
note: Vietnam's column in the capability grid, the role-by-level grid in `hr-fully-loaded-cost`, and
the depth row for Pune and tier 2 in `fin-cost-vs-ecosystem-depth`.

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
public screens call: `tech 9, operations 9, hr 11, finance 6` — the whole catalogue, since nothing is
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
