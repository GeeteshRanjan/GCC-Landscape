# Copy audit: visitor-facing strings not admin-editable

Read-only audit. No code, schema, or file other than this report was changed.

## Step 0 — mechanical candidate list

`rg` is not installed in this environment (`command not found: rg`), so the candidate
list was generated with an equivalent Python sweep over the same five paths
(`src/components/screen1/copy.ts`, `src/components/screen2/copy.ts`,
`src/components/screen1/*.tsx`, `src/components/screen2/*.tsx`,
`src/components/public/*.tsx`), using the same three patterns
(`"[A-Z][^"]{6,}"`, `'[A-Z][^']{6,}'`, `` `[^`]*\$\{[^`]*` ``) and the same comment-line
filter (a line-comment heuristic covering `//`, `*`, and single-line `/* … */`; block
comments are tracked across lines). This is a substring heuristic, not a parser, so it
was over-inclusive (JSX attribute values, `id`/`aria-*` glue strings, key-code strings
like `"ArrowDown"`, SVG path data, CSS class strings) and every candidate was confirmed
by opening the file at that line before being reported below.

- **Raw candidate count (all three patterns, all lines): 492**
- **Non-comment count (after the comment-line filter): 253**
- Of those 253, the large majority are excluded by the task's own scope: SVG `d` path
  data (`ansr-wordmark.tsx`, `atlas-wordmark.tsx`), CSS percentage template literals in
  `charts.tsx`/`closing-cta.tsx` (`` `${share * 100}%` ``), DOM id templates
  (`` `metric-${id}` ``, `` `${id}-heading` ``), keyboard key names (`"ArrowRight"`,
  `"Home"`), and lookup-table keys matched against admin-editable data rather than
  literals that reach the DOM themselves (`CAPABILITY_ICONS`, `SALARY_TONES`). Every
  string in the tables below survived that exclusion and was traced to either a real
  render call site or confirmed absent from one.

## Category counts

| Category | Count |
| --- | --- |
| A — flat, no claim, not editable | 22 |
| B — template, no claim, not editable | 5 (2 more listed for cross-reference but filed under D) |
| C — states a claim, correctly in code | 16 (10 of these are also unrendered and cross-filed under D) |
| D — unrendered | 20 |
| E — already editable (reported for boundary visibility only) | not enumerated row-by-row; see note below |

Counts are arrived at by literally counting the rows in each table below; a symbol that
appears in more than one table (because it is both a claim AND unrendered, for example)
is counted once in each table it legitimately belongs to, which is why the totals do not
sum to the raw candidate count.

**Note on E.** Nearly every heading/label on both screens is category E: it reads a
`DEFAULT_PUBLIC_COPY` key through `usePublicCopy()` (directly, e.g. `copy.askTitle`, or
via a constant that reads the key, e.g. `ASK.submitPending`... — no, that one is A, see
below). Enumerating all of them row-by-row would pad this report with entries the task
says must not be reported as gaps. I have instead named the E constants only where they
were plausible A/B candidates before I traced them (e.g. `INDUSTRY_TITLE`, `SCALE`,
`CUSTOMERS`, parts of `ASK`, `IMPACT.titleLead`) and marked them as E in-line rather than
giving them a numbered A/B row.

---

## Category A — flat, no claim, not editable

| Symbol | File:line | Verbatim value | Rendered at | Interpolated values | Reason |
| --- | --- | --- | --- | --- | --- |
| (inline) | `src/components/public/tool.tsx:407` | `"Something went wrong reaching our data. Please try again in a moment."` | `src/components/screen1/input-panel.tsx:632-636` via `submitError` prop | none | Fixed error string, names nothing about the dataset, is a plain oversight. |
| (inline) | `src/components/public/tool.tsx:448` | `"Something went wrong reaching our data. Please try again in a moment."` | same as above (second call site, `refine`) | none | Same string, second use in `refine()`; identical reasoning. |
| `REQUIRED_MESSAGE` | `src/components/screen1/input-panel.tsx:78` | `"Choose one to continue."` | `input-panel.tsx:634-636` region, rendered per-field via `error` prop on `Field` | none | Fixed validation copy, no claim about the dataset. |
| (inline) | `src/components/screen1/input-panel.tsx:508` | `"Choose your industry"` | same line, `placeholder` prop of `SelectField` | none | Fixed placeholder text. |
| (inline) | `src/components/screen1/input-panel.tsx:514` | `"Pick an industry to see its sub-industries (optional)"` | same line, `hint` prop | none | Fixed hint text. |
| (inline) | `src/components/screen1/input-panel.tsx:542` | `"Choose a band"` | same line, `placeholder` prop | none | Fixed placeholder. |
| (inline) | `src/components/screen1/input-panel.tsx:548` | `"All figures in US dollars."` | same line, `hint` prop | none | Fixed hint, names nothing about the data. |
| (inline) | `src/components/screen1/input-panel.tsx:587` | `"Choose a country"` | same line, `placeholder` prop | none | Fixed placeholder. |
| (inline) | `src/components/screen1/peer-view.tsx:460` (facts array) | `"Company"` | `peer-view.tsx:459-471`, rendered as pill label via `ContextPanels`/`ContextPill` | none | Fixed pill label, names what the reader is looking at. |
| (inline) | `src/components/screen1/peer-view.tsx:461` | `"Industry"` | same array/site | none | Same reasoning. |
| (inline) | `src/components/screen1/peer-view.tsx:462` | `"Headquarters"` | same array/site | none | Same reasoning. |
| (inline) | `src/components/screen1/peer-view.tsx:471` | `"Revenue band (USD)"` | same array/site | none | Fixed label; the value beside it is formatted by `formatRevenueBand`, but the label itself is a fixed string. |
| (inline) | `src/components/screen2/function-view.tsx:145` (facts array) | `"Company"` | `function-view.tsx:144-151`, rendered via the same `ContextPanels` mechanism | none | Duplicate of the Screen 1 pill label, in a second literal — a second oversight in the same file family. |
| (inline) | `src/components/screen2/function-view.tsx:146` | `"Industry"` | same site | none | Same reasoning. |
| (inline) | `src/components/screen2/function-view.tsx:147` | `"Headquarters"` | same site | none | Same reasoning. |
| (inline) | `src/components/screen2/function-view.tsx:151` | `"Revenue band (USD)"` | same site | none | Same reasoning. |
| (inline) | `src/components/screen2/function-view.tsx:187` | `"India market metrics by function"` | same line, `aria-label` on the tab panel `<section>` | none | Fixed accessible name for the section; no claim. |
| (inline) | `src/components/screen1/select-field.tsx:1006` | `"Type to narrow the list"` | same line, `placeholder` on the filter input | none | Fixed placeholder. |
| (inline) | `src/components/screen1/city-map.tsx:1211` | `"All cities"` / `"Top cities"` | same line, toggled span text | none | Fixed toggle-state labels, no claim. |
| (inline) | `src/components/screen1/city-map.tsx:1273` | `"Show the leading cities only"` / `"Explore all cities"` | same line, `PanelAction` button text | none | Fixed disclosure-button labels. |
| (inline) | `src/components/screen1/select-field.tsx:1050` | `` `Nothing matches "${filter.trim()}".` `` | same line | the visitor's own typed filter text | Classified as A rather than B: the only interpolated value is the visitor's own input echoed back, not a dataset claim — see note below the table. |
| (inline) | `src/components/screen1/snapshot.tsx:162` | `Data unavailable` (JSX text, not a quoted literal) | same location, rendered when `signal.value === null` | none | Fixed placeholder text for a missing figure; states no claim itself (the surrounding logic is what decides when it fires). |

**Note on the filter's "Nothing matches" string.** I flagged this as a genuine borderline
call. It interpolates the visitor's own typed query, not a name drawn from the dataset,
and asserts no count, share or ordering — it is closer to A than B because the
interpolated value is not something "an admin could not know in advance" in the way an
industry or company name is. I have placed it in A on the grounds that the only variable
part is the visitor's own keystrokes, which a translated template could hold as
`{query}` without losing any dataset-dependent meaning. If the audit's B definition is
read strictly as "any interpolation at all", this row should move to B; the fact
underlying the classification does not change either way.

**Total confirmed A: 22 rows**, matching the category-count table above.

---

## Category B — template, no claim, not editable

| Symbol | File:line | Verbatim value | Rendered at | Interpolated values | Reason |
| --- | --- | --- | --- | --- | --- |
| `snapshotHeading` | `src/components/screen1/copy.ts:1442` | `` `Snapshot of ${view.industry.industry} GCCs in India` `` | `src/components/screen1/peer-view.tsx:538`, via `<Snapshot heading={snapshotHeading(view)} …>` | `view.industry.industry` (a name) | Names the visitor's scope, asserts no count/share/ordering. The example given in the task prompt itself. |
| `peersTitle` | `src/components/screen1/copy.ts:751` | ``GCC details of peers closest to ${name ?? "your profile"}`` | `src/components/screen1/peers-variants.tsx:1276` (the `current` branch reached via `PeersZone` in `peer-view.tsx:557`) | `name` (the visitor's own company name, optional) | Two branches, neither a claim; the company name is a name, not a quantity. This is the string the schema comment explicitly discusses as a rejected field (see Category E note). |
| `largestTitle` | `src/components/screen1/copy.ts:856` | `` `The largest ${view.industry.industry} GCCs in India` `` | `src/components/screen1/peer-view.tsx:603`, `title={largestTitle(view)}` | `view.industry.industry` (a name) | Names the industry, states no count or ordering value itself (the ranking below states the order). |
| `mapTitle` | `src/components/screen1/copy.ts:1027` | `` `Cities where ${view.industry.industry} companies have set up` `` | `src/components/screen1/peer-view.tsx:679`, `title={mapTitle(view)}` | `view.industry.industry` (a name) | Names the industry, asserts no count/share. |
| `mapHeading` | `src/components/screen1/copy.ts:556, 566` | Two branches: `` `${Math.round(share * 100)}% of the ${industry} footprint in India is in ${leader.city}` `` and `` `Where ${industry} has built in India` `` | **NONE FOUND** — see Category D | share/industry/city | Listed here for completeness of what it WOULD be if rendered; the first branch states a share, so on inspection this function is not a clean B — see the note under its Category D entry, which is where it is actually filed given it has no live caller. |
| `largestCountLine` | `src/components/screen1/copy.ts:894` | `` `The largest ${industry} GCC in our India data.` `` / `` `The ${formatCount(shown)} largest ${industry} GCCs in our India data.` `` | **NONE FOUND** — see Category D | industry, a count | Listed for completeness; filed under D since it has no live caller. The second branch states a count, so if it is ever restored it would arguably need re-examination as C rather than B. |
| `indexedNote` | `src/components/screen2/copy.ts:638` | `` `Indexed: ${baseline}` `` | `src/components/screen2/fin-view.tsx:279, 368` and `src/components/screen2/metric-card.tsx:110`, as a card `lead` | `baseline` (`metric.indexBaseline`, an admin-editable free-text string) | Names how to read the card's own index base; asserts no count of its own. The baseline text is itself admin-editable data, so this is a genuine template wrapper around a field that already exists — worth noting as the lowest-value B on the list. |

**Total confirmed, rendered B: 5** (`snapshotHeading`, `peersTitle`, `largestTitle`,
`mapTitle`, `indexedNote`). `mapHeading` and `largestCountLine` are listed in this table
for cross-reference only; they are filed under Category D below because neither has a
live call site today.

---

## Category C — states a claim, correctly in code

These are reported for boundary visibility only, per the task's own instruction — they
are NOT gaps.

| Symbol | File:line | Verbatim value (summary) | Rendered at | Reason |
| --- | --- | --- | --- | --- |
| `peerLead` | `src/components/screen1/copy.ts:384` (two branches, ~415, ~462) | States the sub-industry match method and an ordering key | **Unrendered** — see D | States a matching method/ordering; C by content, D by render status. Filed under D. |
| `shortfallLine` | `src/components/screen1/copy.ts:472` | States a count of comparable companies and whether the set is thin | `src/components/screen1/{evidence.tsx:712-714, peers-variants.tsx:427,502,724,1145}` | States a count/shortfall; correctly in code. |
| `industryLine` | `src/components/screen1/copy.ts:589` | States a count of other companies in the industry | Called only from `industrySentence`, which is unrendered — see D | States a count. Filed under D since its only caller has no render site. |
| `industrySentence` | `src/components/screen1/copy.ts:622` | States a count (exhaustive branch) or a containment relationship | **Unrendered** — see D | States a count/relationship; C by content, D by render status. |
| `largestLine` | `src/components/screen1/copy.ts:654` | States whether a large-company ranking exists, is exhausted, or had to relax its floor | `src/components/screen1/evidence.tsx:1023-1026` (`LargestBlockView`) | States a shortfall/degraded-shape condition. |
| `largestShortfallLine` | `src/components/screen1/copy.ts:888` | States a count shortfall against the peer limit | `src/components/screen1/evidence.tsx:1367-1372` | States a count. |
| `largestOverlapLine` | `src/components/screen1/copy.ts:932` | States a proportion (`X of Y largest GCCs are also in your peer set`) | **Unrendered** — see D | States a share/count; C by content, D by render status. |
| `peerCountLine` | `src/components/screen1/copy.ts:769` | States shown count vs. cohort denominator | `src/components/screen1/evidence.tsx:867` | Directly states a count/denominator. |
| `framing` (all three branches) | `src/components/screen1/copy.ts:274` | States a peer count in the headline | **Unrendered** — see D | States a count; C by content, D by render status. |
| `functionFraming` (all three branches) | `src/components/screen2/copy.ts:110` | Branches on `gccStatus`, but content does not state a dataset count/share — reclassified, see note | `src/components/screen2/function-view.tsx` — **not found as a render call site**, see D | Listed in C by the file's own doctrine comment ("gccStatus... RENDERED BY NOTHING"), but I could not find a render call site in `function-view.tsx` or elsewhere; filed under D. Kept in this C table because the surrounding comments assert it is a claim-carrying branch worth preserving unrendered. |
| `heldShapeNote` | `src/components/screen2/copy.ts:175` | States cardinality of a withheld metric's shape (parts/rows/columns count) | `src/components/screen2/metric-card.tsx:522` | States a count (of parts/rows/columns). |
| `heldHeading` | `src/components/screen2/copy.ts:160` | States the count of held-back figures (singular/plural branch) | `src/components/screen2/ops-view.tsx:513`, `src/components/screen2/function-view.tsx:561` | Branches on a count (1 vs. many). |
| `SCREEN_SOURCE` | `src/components/screen2/copy.ts:497` | Claims aggregates/method | **Unrendered** — see D | States a method claim; correctly kept unrendered per the file's own doctrine. |
| `COST_PROVENANCE` | `src/components/screen2/copy.ts:510` | Claims no per-head salary figure exists, gated or not | **Unrendered** — see D | States a claim about what the dataset withholds; correctly unrendered. |
| `SHARED_SUPPLY_PROVENANCE` | `src/components/screen2/copy.ts:525` | Claims a figure is shared unchanged across tabs | **Unrendered** — see D | States a cross-tab identity claim; correctly unrendered. |
| `FIN_DRIVERS_INSIGHT` | `src/components/screen2/copy.ts:619` | States that talent is "the biggest lever" (a superlative/comparison read off a 72% chart segment) | **Unrendered** — see D | Superlative claim; correctly unrendered per its own comment, guarded on the underlying chart previously. |

---

## Category D — unrendered

Every row below was checked by searching for every plausible call form (`Name(`,
`Name.field`, bare `Name`, and the schema-mirror name if one exists) across
`src/components/screen1/**`, `src/components/screen2/**`, and `src/components/public/**`.
None returned a JSX or attribute usage.

| Symbol | File:line | Verbatim value (or summary if long/branching) | Rendered at | Reason |
| --- | --- | --- | --- | --- |
| `framing` / `Framing.title` | `src/components/screen1/copy.ts:274` | Three branches, each interpolating a count and the industry | NONE | No call site to `framing(` anywhere in `src/`. The file's own comment confirms this explicitly. |
| `peerLead` | `src/components/screen1/copy.ts:384` | Two branches naming the sub-industry match method or a single ordering key | NONE | No call site to `peerLead(` outside its own definition and a comment reference in `peers-variants.tsx:1267`. |
| `mapHeading` | `src/components/screen1/copy.ts:536` | Two branches: a concentration-share sentence and a plain "has built" sentence | NONE | No call site to `mapHeading(` outside its own definition; `peer-view.tsx:670-677` comments confirm removal ("No lead, at ANSR's request... the block's one statement of concentration is gone"). |
| `industryLine` | `src/components/screen1/copy.ts:589` | States a company count in the industry | Only called internally by `industrySentence`, which is itself unrendered | Transitively unrendered. |
| `industrySentence` | `src/components/screen1/copy.ts:622` | Exhaustive-branch count sentence or containment sentence | NONE | No call site; `peer-view.tsx:609-612` comments confirm ("No lead, at ANSR's request — `industrySentence` described..."). |
| `largestCountLine` | `src/components/screen1/copy.ts:894` | Count of largest-ranking rows shown | NONE | No call site; `evidence.tsx:1340-1343` comment confirms explicitly ("`largestCountLine` is no longer rendered, at ANSR's request"). |
| `largestOverlapLine` | `src/components/screen1/copy.ts:932` | States overlap between largest-ranking and peer set | NONE | No call site; the function's own doc comment says "Rendered nowhere, at ANSR's request... On the blocked list." |
| `INDUSTRY_TITLE` | `src/components/screen1/copy.ts:826` | `= DEFAULT_PUBLIC_COPY.industryTitle` (mirror constant) | NONE (component reads `copy.industryTitle` via context instead — see `peer-view.tsx:632`) | The constant itself is never imported or referenced anywhere; it is dead code that duplicates a value already reached through `usePublicCopy()`. The underlying string IS rendered (category E), but through the context, not through this constant. |
| `SCALE` (the object, all four fields: `title`, `fortuneLabel`, `forbesLabel`, `peopleLabel`) | `src/components/screen1/copy.ts:1072` | Mirrors `DEFAULT_PUBLIC_COPY.scaleTitle`/`scaleFortuneLabel`/`scaleForbesLabel`/`scalePeopleLabel` | NONE (component reads `copy.scaleTitle` etc. directly — `peer-view.tsx:702`, `evidence.tsx:1601,1606,1613`) | Same pattern as `INDUSTRY_TITLE`: the object is never imported anywhere in `src/`; dead mirror. Underlying strings ARE rendered (E), via context, not via this object. |
| `ASK.panelTitle` | `src/components/screen1/copy.ts:130` | `= DEFAULT_PUBLIC_COPY.askTitle` | NONE (component reads `copy.askTitle` directly — `peer-view.tsx:302`) | `ASK.panelTitle` field never referenced; only `ASK.submitPending` (a genuinely code-only field) is used from this object. |
| `ASK.panelLead` | `src/components/screen1/copy.ts:131` | `= DEFAULT_PUBLIC_COPY.askLead` | NONE (component reads `copy.askLead` directly — `peer-view.tsx:311`) | Same reasoning as `ASK.panelTitle`. |
| `ASK.submit` | `src/components/screen1/copy.ts:133` | `= DEFAULT_PUBLIC_COPY.askSubmit` | NONE (component reads `copy.askSubmit` directly — `input-panel.tsx:679`) | Same reasoning. |
| `IMPACT.titleLead` | `src/components/screen1/copy.ts:187` | `= DEFAULT_PUBLIC_COPY.impactTitleLead` | NONE (component reads `copy.impactTitleLead`? — **not found either**; see note) | Neither `IMPACT.titleLead` nor a direct `copy.impactTitleLead` read was found in `impact-band.tsx`; only `IMPACT.titleBrand` is used there (line 206). This is worth flagging as an unresolved item — see the unresolved list. |
| `CUSTOMERS` (the object; field `label`) | `src/components/screen1/copy.ts:157` | `= { label: DEFAULT_PUBLIC_COPY.customersLabel }` | NONE (component reads `copy.customersLabel` directly — `customer-logos.tsx:208`) | Dead mirror object; underlying string IS rendered (E) via context. |
| `SCREEN_SOURCE` | `src/components/screen2/copy.ts:497` | `"National aggregates maintained by ANSR."` | NONE | No call site; `function-view.tsx:352-354` comment confirms explicitly. |
| `COST_PROVENANCE` | `src/components/screen2/copy.ts:510` | `"Cost is shown as indices, spreads and growth rates. We publish no per-head salary figure — not here, and not behind the gate."` | NONE | No call site found anywhere in `src/components/screen2/`. |
| `SHARED_SUPPLY_PROVENANCE` | `src/components/screen2/copy.ts:525` | (long sentence about shared supply figures) | NONE | No call site found. |
| `FIN_FIGURES_QUALIFIER` | `src/components/screen2/copy.ts:578` | `"Year-on-year growth"` | NONE | Imported into `fin-view.tsx:15` but never referenced as a value anywhere in that file — dead import. The file's own comment (`fin-view.tsx:176-181`) confirms: "kept exported and is no longer drawn." |
| `FIN_DRIVERS_INSIGHT` | `src/components/screen2/copy.ts:619` | `"Talent (salary) is the biggest lever of cost advantage."` | NONE | Imported into `fin-view.tsx:14` but never referenced as a value — dead import. Comment at `fin-view.tsx:217-220` confirms: "exported, unrendered and blocked." |
| `functionFraming` (all three branches) | `src/components/screen2/copy.ts:110` | Branches on `gccStatus`: e.g. `ctaHeading: "Which of these you are beating"`, `ctaBody: "That depends on your roles, your cities and how you staff them."` | NONE FOUND in `function-view.tsx` or elsewhere in `src/components/screen2/` or `src/components/public/` | See the unresolved list — the file's own top-of-file comment for `copy.ts` explicitly claims `gccStatus`/`functionFraming` is "RENDERED BY NOTHING", which matches what I found, but this contradicts the earlier `handoff.md`/`project.md` framing that Screen 2 "has always rendered five strings off this field." I could not resolve this discrepancy from the code alone — flagged below. |

---

## Category E — already editable (boundary notes, not gaps)

Not exhaustively enumerated (see note under the category-count table). Worth recording
explicitly because they were the ones most likely to be mistaken for A/B on a first pass:

- `INDUSTRY_TITLE`, `SCALE.*`, `ASK.panelTitle`/`panelLead`/`submit`, `CUSTOMERS.label`,
  `IMPACT.titleLead` (partially, see unresolved) — all mirror a `DEFAULT_PUBLIC_COPY` key
  but are dead code; the actual rendered value in each case is reached by the component
  calling `usePublicCopy()` directly and reading the schema key, not by importing the
  mirror constant. The underlying STRING is category E (published, admin-editable); the
  CONSTANT is category D (unused code).
- `peersTitle`'s removed sibling, `siteContent.copy.peersTitle`, is discussed at length in
  `schema.ts:838-848` as the worked example of exactly the B pattern this audit is about —
  it was a flat field until ANSR asked for the visitor's company name to be interpolated,
  at which point it had to leave the schema and become `peersTitle()` in code. This is the
  clearest evidence in the repo that the project is already aware of the B category and has
  a working precedent for moving a string INTO code when a name has to be interpolated. It
  does not, by itself, resolve whether the reverse move (bringing today's B strings into a
  templated schema field) is wanted — that is a scope decision, correctly out of bounds for
  this audit.

---

## Highest-value A and B entries, by visitor visibility

1. **`snapshotHeading`** (B) — `Snapshot of ${industry} GCCs in India`. Section heading,
   first content a visitor reads after the band on Screen 1. The task's own worked
   example.
2. **`peersTitle`** (B) — `GCC details of peers closest to ${name}`. Section heading over
   the primary evidence block (five comparison cards).
3. **`largestTitle`** (B) — `The largest ${industry} GCCs in India`. Section heading over
   the largest-companies ranking.
4. **`mapTitle`** (B) — `Cities where ${industry} companies have set up`. Section heading
   over the city map.
5. **`Data unavailable`** (A) — `snapshot.tsx:162`. Fallback text inside the snapshot's
   four figure cells; visible whenever a figure cannot be computed.
6. **`"India market metrics by function"`** (A) — accessible name of Screen 2's whole tab
   panel; not visually drawn, but computed into every screen-reader user's landmark list.
7. **The two `"Something went wrong..."` strings** (A) — `tool.tsx:407,448`. Low-frequency
   but high-stakes: the only error copy a visitor ever sees if the server action fails.
8. **`REQUIRED_MESSAGE`** (A) — `"Choose one to continue."` — the only validation copy on
   the entire form, shown per unanswered required field.
9. **The four placeholders/hints in `input-panel.tsx`** (A) — `"Choose your industry"`,
   `"Choose a band"`, `"Choose a country"`, `"Pick an industry to see its sub-industries
   (optional)"`, `"All figures in US dollars."` — every visitor who opens a dropdown reads
   one of these.
10. **The duplicated `"Company"/"Industry"/"Headquarters"/"Revenue band (USD)"` pill
    labels** (A) — present as two separate literal arrays (`peer-view.tsx` and
    `function-view.tsx`), so a rewording today requires editing two files by hand — worth
    surfacing even though each individual string is low-value copy.
11. **`indexedNote`** (B) — lowest-value B on the list: wraps an already-admin-editable
    `indexBaseline` string in a fixed `"Indexed: "` prefix.

---

## Anything I could not resolve

1. **`functionFraming` / `gccStatus`'s Screen 2 render status is contradictory across the
   codebase's own comments, and I could not find a call site either way.** The steering
   doc for this project (`handoff.md`, item under "Blocked", and multiple comments inside
   `screen2/copy.ts` and `screen1/input-panel.tsx`) assert that `functionFraming` "has
   always rendered five strings" on Screen 2 (`h2`, lead, CTA heading/body/label). But the
   `screen2/copy.ts` file's own top-of-file doctrine comment says the opposite: "gccStatus
   is once again a field nothing draws... RENDERED BY NOTHING." My own search of
   `function-view.tsx` and every other file under `src/components/screen2/` and
   `src/components/public/` found no call to `functionFraming(` outside its own
   definition and the interface it returns (`FunctionFraming`). **The question a human
   needs to answer:** is `functionFraming` currently rendered anywhere (perhaps behind a
   feature flag, an admin-only view, or a file this sweep did not cover), or has the
   `handoff.md`/`project.md` description gone stale relative to a removal that happened
   after those docs were last updated? I have filed it under D on the strength of the
   grep evidence, but flag that this contradicts the project's own steering docs, which
   this audit was told to accept as background rather than re-litigate.
2. **`IMPACT.titleLead` has no confirmed render path.** `impact-band.tsx` reads
   `IMPACT.titleBrand` (line 206) but I could not find a reference to `IMPACT.titleLead`
   or to `copy.impactTitleLead` anywhere in that file or elsewhere in `src/`. The comment
   block in `screen1/copy.ts:169-187` describes `titleLead` as "the first word" of the
   rendered heading ("ANSR By The Numbers") and states the rendered heading is "ANSR By
   The Numbers", but I could not locate the JSX that actually places that text next to
   the drawn lockup. **The question a human needs to answer:** is the impact band's
   visible heading text ("By The Numbers") currently rendered by a mechanism this sweep
   missed (e.g. a prop drilled in from a parent rather than read via `usePublicCopy()`
   inside `impact-band.tsx` itself), or is the heading currently rendering as the lockup
   image alone with no trailing text? This needs a runtime check (view the rendered page)
   rather than a static grep, which is outside this audit's read-only, no-build scope.
3. **Whether the filter's `` `Nothing matches "${filter.trim()}".` `` string belongs in A
   or B is a judgement call I made rather than a fact I confirmed** (see the note under
   the Category A table). A human should confirm which side of the line "interpolates the
   visitor's own input" is meant to fall on, since the task's own B definition ("every
   interpolated value is a NAME... an industry, a company name, a city") does not
   explicitly cover "the visitor's own typed text" as a fourth case.
