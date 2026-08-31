# GCC Landscape — product & architecture invariants

Durable truth, paid for on every turn. Rules only: what must hold and what must not change. **Why a
rule exists, and what was tried before it, lives elsewhere** — `.tastemaker/style-lock.md` for visual
decisions, `docs/` for reference detail. If a line here explains a rejected alternative, it is in the
wrong file.

Companions: `handoff.md` (where we are right now), `.tastemaker/style-lock.md` (visual reasoning),
`docs/design-reference.md` (brand, tokens, measurements), `docs/traps.md` (what has cost time).

## What we are building

A self-serve web tool embedded on ANSR's site. A visitor enters a few facts about their company and
gets a personalised picture of the India GCC market: what comparable companies already do here, and the
function-level metrics they would care about. Aim is to inform, and to earn a conversation.

**Audience:** CIO / CTO / COO / HR and finance leaders at large global companies, evaluating or
expanding an India GCC. Arriving from ansr.com or outbound campaigns. Not analysts, not students.

Full brief: `docs/brief.md`. Read it before building either screen.

**Cut from the brief, deliberately — do not reintroduce:** the editable peer set; "India GCC as a % of
global tech workforce"; company-name autocomplete (suggestions could only come from our own 1834, so an
unmapped visitor reads an empty dropdown as "this tool does not know who we are"); lead capture of any
kind. No form, no email field, no stored visitor input anywhere in this codebase.

## Inputs — the contract

**Six fields, five asked, four controls.**

| Input | Control | What uses it |
| --- | --- | --- |
| Company name | text | Personalises copy only |
| Industry | custom listbox → tree | Primary peer match key, and a hard boundary |
| Revenue band | custom listbox, the seven bands in the data | Peer similarity axis, weighted below business |
| HQ location | custom listbox, **every country** | Sort preference on the peer set |
| Sub-industry | **cascades out of industry**, optional | Business similarity — the primary ordering signal |
| Existing GCC status | **not asked** | Branches the framing. Constant; see below |

Never ask for a revenue figure — the data holds bands, so the input is a band. Hold any new field to the
standard that killed global headcount: if nothing consumes it, it does not get asked.

**"Sub-industry" is the term everywhere a visitor or an admin can read it**, at ANSR's request. The DATA
is untouched: the field is still `businessTypeId`, the collection is still `dataset.businessTypes`, and
`business-tags.ts`, `business-type-catalogue.ts` and `docs/business-types.md` keep their names.

**Sub-industry is a level inside the industry dropdown, not a field of its own.** The field on
`PeerViewInput` is unchanged and still optional. Consequences that hold together: the industry popup is
a `tree` rather than a `listbox`, and the role is read from the data so the two cannot disagree; there
is no disabled-until-answered control and no live region; and **no field LABEL is marked "(optional)"**.
The one "(optional)" that exists is inside the industry popup on the affordance line describing the
second level. Restoring a separate field is a UI change, not a data migration.

**That level is a CASCADE, not an indent.** Pressing an industry commits it and opens a second pane
BESIDE the list, trailing-side, parent left and child right. Five things hold together: the panel is
exactly as tall open as closed; the pane never gives the framed document a horizontal scrollbar; the
pane is `aria-owns`-ed by its parent row rather than nested in it, so **every row carries an explicit
`aria-label`**; the pane's leading `All of {industry}` row is the exit that keeps the broad answer,
because the press that opened the pane deliberately does not close the panel; and re-opening the control
does not re-open the visitor's branch. Room beside the field is `layoutWidth / 2 − 400` above 1280,
nothing may clamp the pane at runtime (reading the viewport is what the iframe forbids), so widths come
from a measured table and **below 1440 the pane covers the parent list as a drill-in**. Table and
rejected geometry: style lock.

**`gccStatus` is kept, supplied as the `evaluating` constant (`ASSUMED_GCC_STATUS`), and rendered by
nothing.** `framing()` and `functionFraming` are both still exported and unit-tested on all three
values. **Do not delete the field on the strength of its being unrendered** — restoring a close is one
component and one prop. Neither screen's fact summary echoes "India today": showing a constant there
would be the tool telling a visitor what they said about something it never asked.

**The three dropdowns are a custom listbox, not `<select>`, and not Radix Select** — Radix portals with
`position: fixed`, which anchors to the wrong viewport inside a frame sized to its own content. The
panel is absolutely positioned inside the field, always opens downward, and carries a filter above 12
options. It never flips, so it asks to be revealed: `scrollIntoView({ block: "nearest" })` on open,
targeting the cascade PANE when one is open, with `scroll-margin-block-end` absorbing the entrance
keyframe. That is not the banned scroll logic — it reads nothing, reports nothing, and is inert in the
embed. Admin keeps native selects. Specs drive both shapes through `choose()` and `chooseSubIndustry()`
in `tests/browser/helpers.ts`; `choose()` handles the tree by then taking the `All of {value}` row.

**A ROW IS FOUND BY WORDS THE VISITOR USES, NOT ONLY THE WORDS ON IT.** `search-terms.ts` holds
extra search terms per industry, per sub-industry and for the handful of countries with another
common name; `search.ts` is the single matcher. **The terms are CODE, for the same reason
`BUSINESS_TAGS` is** — a term routes a real person to a peer set. Nothing here is ever DISPLAYED: a
`treeitem`'s name is computed from its contents, so a visible synonym renames the row and breaks
every exact-name lookup. The rule is normalise (`&` → `and`, diacritics folded, punctuation to
spaces), split the query, require EVERY token; **a token of three characters or fewer must match a
whole word**, which is narrower than a substring on purpose and is what makes `ai`, `3pl`, `cro` and
`kyc` land. A term must reach the row it is filed under and must not reach more than six
sub-industries — asserted, so the table cannot become keyword stuffing.

**Findability is the peer set's real failure mode, not scoring.** Coherence with a sub-industry is
0.9-plus; without one it is 0.13 in Manufacturing and 0.23 in Software & Internet, and no engine
change can lift it because there is no signal to read. So a complaint about bad peers is diagnosed at
the input first. `tests/unit/match-quality.test.ts` and `tests/unit/search-terms.test.ts` hold both
measurements; `docs/data-audit.md` records the numbers.

**A sub-industry with no companies mapped to it is a defect until proven otherwise.** Five of the six
were the source Sub-Industry string read too coarsely, not gaps in the data. `avi-services` is the
one honest empty: the dataset holds seven airlines and no MRO. **`businessTypes` is in
`COMPANY_FIELDS` in `diff.ts`** — left out, a whole re-tagging pass reported "no company changes" and
would have published as a silent no-op.

**Dropdown order is derived from company counts**, with one exception: `PINNED_INDUSTRIES` — Retail and
Consumer Packaged Goods sit in the leading tier regardless of count, because ANSR expects enquiries out
of proportion to dataset composition. Pinned entries still sort by count inside the tier. Keep the list
short. Industry leads with the largest by count, HQ with the twelve largest, then alphabetical, as two
groups. **`revenueBands` is never tiered or sorted** — its order is the matching contract.

**A company NAME is corrected in the same one place, by the same kind of table.**
`COMPANY_NAME_FIXES` / `canonicalCompanyName` in `normalize.ts`, applied in `readRows` beside the
industry. **A table and never a rule:** 23 names arrive in full capitals and 18 are correct (SABIC,
AECOM, IQVIA, MULTIVAC), 20 start lowercase and 17 are brand styling (eBay, iSolved, smartShift,
ebm-papst) — a title-case rule damages 18 marks to repair 5. **A CASE-only fix is free; anything that
changes a letter must also be changed in `business-type-map.ts`**, which folds case but not letters,
so the company would silently go untagged. **A legal-entity suffix is left as supplied** and two rows
that look like one company stay two rows.

**An industry abbreviation is expanded ONCE, where the spreadsheet is read.** `CPG` becomes "Consumer
Packaged Goods" via `canonicalIndustry` in `normalize.ts`, inside `readRows`. Renaming the published
dataset instead silently untags all 24 companies, because `business-type-map.ts` is keyed
`industry||subIndustry`. Only expansions belong in that alias table; merging industries or fixing a typo
belongs in the taxonomy editor, where the rename cascades and the diff records it.

**Two country lists, doing two jobs.** `taxonomy.hqCountries` is DERIVED FROM THE COMPANIES by
`buildTaxonomy` — anything added by hand is deleted by the next import, and it is what matching sees.
`HQ_COUNTRIES` in `src/data/countries.ts` is what a VISITOR may pick: every country. `hqCountry` is the
one input validated against the taxonomy UNION the world list; every other field is validated against
the taxonomy alone.

## Screen 1 — the entry point

Five bands read as one page: the teal gradient hero (centred, two text elements, no control), the white
form card overlapping the hero's bottom edge, the pale-teal band its lower half sits on, a scrolling
strip of ANSR customer logos, and a dark band of ANSR's own impact figures. The last two are evidence
about ANSR rather than about the dataset, which is what keeps them clear of the no-invented-figures
rule; **the logo strip must never imply those companies used this tool.**

**`--ansr-container-card` is a COMPOSITION token.** The hero copy and the card derive their leading edge
from the same box (`max-w-content px-6 md:px-12`, then `mx-auto max-w-card`), duplicated verbatim in
`ask-hero.tsx` and `peer-view.tsx`. Widening it moves the headline and moves the dot map's leading mask
fade with it. From `xl` the hero outdents by the card's whole margin and its lead takes
`--ansr-container-lead`; the two are gated on `xl` together, because widening the lead without shifting
left by the same step puts text on the map's visible field.

The form grid is **two equal columns**, two rows of two with the submit spanning both.

## Both result screens — one floating card on a dark ground

The teal context band is full-bleed; everything below it, to the end of the document, is inside a single
card that overlaps the band's foot and floats on the flat inverse teal. **The view switch is that
card's top row.**

- **The card is SOLID, not glass.** A hairline ring drawn as a `box-shadow` layer, two shadow layers at
  very different spreads, and a radius one step above every panel inside it. The `--ansr-shadow-*`
  tokens cannot supply it — they are fitted for a light surface and this ground IS teal-deep.
- **The switch is full width, two equal halves, no shape of its own.** As the card's first row its
  corners ARE the card's, under the card's own `overflow: hidden`.
- **The selected cell is filled with the ground of the content beneath it** — hence `ViewTabs`' `ground`
  prop. The bar's own ground is `--ansr-teal-100`, darker than either content ground, so the selected
  cell is the lightest thing in the row. The unselected cell declares no fill and the bar's mint shows
  through.
- **NOTHING IS DRAWN IN THE BAR:** no orange rule, no teal edge, no radius, no divider between the
  cells, **no glyph on either cell**. Three signals over `aria-selected`: the fill, the ink from muted to
  heading teal, and the weight.
- Labels are **"Peer Landscape"** and **"Function Metrics"**, and they live in `screen-header.tsx` rather
  than either screen's `copy.ts`.
- Real ARIA tabs, roving tabindex, **manual activation** — arrow moves focus, Enter or Space activates,
  because activating swaps the entire screen. `aria-controls` on the selected tab alone. **Not sticky.**
- **The band carries the entry point's dotted world map from `lg` and the screen's motif below it —
  swapped at that breakpoint, never layered.** Held back by opacity and faded out over half the band's
  height. **No blur, at ANSR's request**: quieten it with opacity and the masks, never with a filter.
  Plus `.gcc-header-lattice` on the leading edge.
- **The card's top edge is where the selected tab meets the content**, same fill by construction. A line
  across that joint means something added a border.

**The band carries three things:** `ANSR GCC Intelligence` as the `h1`, the finding as a non-heading
display line, and the visitor's four answers as pills with one "Edit answers" button.

**The `h1` is the FULL LOCKUP — mark and wordmark.** `ansr-logo-on-dark.svg`, used literally, sized off
the WORDMARK's cap height rather than the artboard (letters occupy 37.9 of the file's 91 units, so 1.7em
matches the display face's cap height). Accessible name "ANSR GCC Intelligence" from the image's `alt`.
No typed period.

**Both screens carry the finding line, as a matched PAIR of CONSTANTS in `HEADER_LINES`** — "How your
industry operates in India" and "The India market beyond your industry". **Neither states a COUNT** (a
denominator belongs on the count line under the grid, which states it exactly) and **neither
INTERPOLATES the industry** — `HeaderFinding` is capped at `--ansr-container-lead` and sets at 48px, so
past ~36 characters it wraps, and a two-line band beside a one-line band is the height jump this pair
exists to remove.

**The four answers are read-only pills with no hover state, and one button labelled "Edit answers" in
the SAME wrapping row, immediately after the last pill.** The button is the SIZE of a pill; the 44px
target is expanded off-screen by `.gcc-context-edit::after`, 7px top and bottom, with
`inset-inline: 0` — never a negative one, because the row's `gap-x` is 8px and a press landing on a pill
does nothing while feeling like a miss. Company name (when given), industry, headquarters, revenue band.
**"India today" is not among them and must not be.** `companyName` in `src/data/screen1.ts` is the single
definition of "did they type one".

## Screen 1 — Peer Landscape

**A compact teal context area, then SIX ZONES of alternating ground, each holding one or two cards.**
The grounds STRICTLY ALTERNATE white and mint so all five boundaries are visible. `--ansr-surface-pale`
is ~2% off white and **may only ever neighbour the mint**; the sequence is pale, mint, white, mint,
white, mint.

**A BORDER IS EARNED.** A block that draws a MARK keeps its `Panel`, because a chart's marks are
measured against the card's own edges. A grid of its own cards takes a `Block`, since wrapping five
floating cards in a sixth bordered box is a card inside a card. A block that is text takes a `Block`.
Four panels, not eleven. Hierarchy is `weight="lead"` on the primary block's heading, never a tone.
**`gcc-lift` is on nothing on this surface** — a rise on hover is an affordance and none of these
objects is pressable.

**Section headings are 20/24px Bold with `tracking-display`**; the band's finding is 30/38/48px Light;
the `h1` lockup is 24/30px. **The three headings that contain a drawn wordmark stay Medium 500 with
`tracking-body`** — the ask hero's, the impact band's, and `ProductIdentity` — measured off the mark's
stem (0.137 of cap height) rather than chosen.

**SNAPSHOT — four figures before any card begins.** Every one is a property of the INDUSTRY: company
count, mean centre size, spread of cities, leading city. It **introduces no figure a card does not
evidence**, holds four cells whatever the result, and says "Data unavailable" rather than a dash, a zero
or an estimate. The SECTION HEADING carries the industry (`snapshotHeading`) and **no label does** —
labels are three or four words each. **Never "GCC's".** The share is `industry.shareOfIndia`, derived in
the view model over one population; computing it from `industry.total / scale.companyCount` was an
arithmetic defect, those two counting populations that differ by one. The leading city takes the same
orange as the three figures, one size step down, with no `tabular-nums` and no `tracking-display`. A unit
is a field (`Signal.suffix`), set two scale steps under the figure — never a fraction of an em.

**1. Up to five comparable companies.** ONE ROW, one column per peer, column count = peer count capped
at five. Two columns between `sm` and `lg`, one below, odd last card widens. No packing — nothing wraps.
Each card carries its employee band at 20/24px. **THERE IS NO ORDINAL ON A CARD** — left-to-right reading
position states the order, so restoring a multi-row grid means restoring an ordinal with it. Labels are
"GCC headcount", "Cities" and "In India since {year}"; only the figure names the GCC. Heading is **"India
GCCs closest to your PROFILE"**, never "closest to yours". No bars, no axis note. **Headquarters is not
shown and the field is dropped with the column.** **No company logo, initial, monogram or reserved empty
box appears anywhere** — the dataset holds no marks, so each is either a fabricated identity or a visible
gap.

**2. The industry count, as three OVERLAPPING layers on one z-stack** — national base, industry inside
it, and inside that either the visitor's sub-industry or the comparison set. **Always three layers.**
Layers step down from a shared top edge so each label owns an exposed band. Not a divided bar — the
figures sum to nothing. **EVERY LABEL STARTS AT THE CHART'S OWN LEADING EDGE**; what associates a label
with its layer is the BAND, not horizontal adjacency. **THE INNERMOST LAYER IS A POSITION MARKER, NOT A
THIRD BAR, WHENEVER IT IS A SELECTION RATHER THAN A POPULATION** — a fixed-width accent mark capped by
the layer it sits inside, with its figure in text beside it. No log or square-root axis: buying
visibility by making the length a lie is the same move as truncating an axis. Where the third level IS a
population it draws proportionally and the marker never appears. The marker is the one non-light fill in
the chart. **This is the one visible departure from what ANSR asked for, and it is on the blocked list to
be shown, not undone.**

**3. The largest companies in the industry with an India GCC.** We hold revenue BANDS, so nothing can be
ranked by revenue: take the highest band with members in that industry and fill downward, ordered by GCC
size. Three industries have nobody in the top band, so the panel must degrade rather than assume one
exists. **A COMPACT RANKED CHART, not a list of company cards.** A row is position, name, figure,
full-width bar, plus city and year as `sm` pills. **A ROW IS TWO LINES, and the tags share the second one
with the figure** — the figure carries `ms-auto` as well as `justify-between`, because a wrapped
single-item line puts a justified item at the LEADING edge. 16px between rows, 4px inside one, 4px from
figure to bar; the name takes `leading-tight`. The figure is the comparison card's treatment at 18/20px
near-black. **One small-caps COLUMN HEADER names the quantity** ("GCC headcount"). Bars run the FULL
WIDTH and no row is drawn a step darker. `largestOverlapLine` states the peer overlap once, as quiet
text; null when nothing overlaps, unreachable when everything does (`repeatsPeers` collapses the block).
`largestShortfallLine` renders only where it fires.

**4. The terminating scale strip** — Fortune Global 500 count and summed professionals, across all of
India. **Three cells, three whole sentences, no marks and NO SHARE.** Each label is the predicate of a
sentence whose subject is the figure above it; the denominator is stated once, inside the index name.
**The third figure is the UNION of the two index memberships, deduplicated by construction** —
`indexedProfessionals` sums over companies on *either* index; adding two sums would overstate by 60%,
since 171 of the 181 Fortune companies are also in the Forbes 2000. Keeps its card, because its fill IS
its meaning.

**The analytical row is the RANKING beside the containment chart, three fifths and two fifths,
`items-start`.** The function list is not on that row.

**The function list is a WRAPPING SET OF TAGS** with no column count at all. **The tags claim nothing:**
no numeral, no bar, no leading mark, no hover state, no order, and it stays a `<ul>` — there is no
per-company function record in this dataset. `whitespace-nowrap` guarantees nothing wraps internally.
Fill is `--ansr-surface` on the mint zone, no border. **`COMMON_FUNCTIONS` is written to a 16-to-28
character range so no item decides the layout.** The section heading carries the basis: "Functions most
GCCs run from India" is a claim about GCCs in general and cannot be read as one about the companies
above it.

**`PeerCard.sizeShare` is the single definition of a headcount-midpoint ratio** — honest as a bar's
length, never as a published figure, always against the largest member of the set that card came back in.
The two Screen 1 blocks that compute it are scaled separately. The visible figure stays the band.

## Screen 2 — Function View

Tech, Operations, HR, Finance. Metrics are filed internally by four lenses — supply, speed, place, cost —
and **the lens names are an internal filing system, never public UI labels.** Admin shows them, labelled
internal. `METRIC_LENSES` in `schema.ts` is the contract.

**The four tabs are four VIEWS of one national picture, not four datasets.** A metric appearing on more
than one tab carries **the same figure on every one**, authored once in `metric-catalogue.ts` and spread
onto each tab with a different id via `onTab`. `data:verify` carries it as an invariant: metrics sharing
a title must be identical apart from `id` and `functionArea`. Every shared figure is a technology-role
figure and the cards deliberately do not say so.

**Counts:** technology 8, HR 10, operations and finance per the catalogue. `tech-graduate-pipeline`
replaces `tech-graduate-output` and is the one place a tab deliberately shows less than the shared
metric — it holds two of that metric's own figures unchanged, so the two cards cannot disagree. It does
not AGGREGATE (2.05M is arithmetically available and is not authored; "engineering graduate output" is a
claim about what counts as engineering, and that is ANSR's to approve) and it does not NEST (450K is
total management and MBA output, not MBA graduates holding an engineering degree). **No overlap
percentage anywhere.**

**HR, OPERATIONS AND FINANCE ARE COMPOSED; technology is the only tab the derivation draws.** `HrPanel`,
`OpsPanel`, `FinPanel` select metrics BY ID and state their own section headings. The seam is one early
return each in `AreaPanel`. Each renders whatever it does not place in a generic grid rather than
dropping it, and widens an odd last card. `layoutArea`, `metricWidth`, `packWidths` and the derived zone
sequence are **not dead** — they are technology, and the fallback for anything a composed tab gains. **A
fourth composition request is a request to delete a derivation with one live caller: decide it as that.**

**ALL FOUR TABS ARE THE PEER VIEW'S SURFACE: one zone per section, strictly alternating, bordered square
cards.** A block that draws a MARK gets a bordered `Panel` at radius `none`; a run of text or a grid of
its own cards gets a `Block`; the space between sections is the two zones' own padding, never a per-section
gap. `TabZones` in `screen2/zones.tsx` is the single implementation, **white first on every tab**, because
the tab strip sits on the section's own white. `surface-pale` is not in this screen's sequence. The mint
therefore no longer means "withheld" — the sealed pair's firmer border, lock and chip are the signal.

**One card inside another is forbidden.**

**SCREEN 2 EXPLAINS NOTHING.** No screen `h2`, no lead, no per-tab lead, no card `question` line, no held
group paragraph, no provenance line, no interpretive strip. **The cards are `h2`** and the band carries an
`aria-label`; the held group is an `h2` with sealed cards at `h3`. **`question` is untouched in the data
and unrendered** — still authored, still admin-editable, still crossing the gate, which is what keeps the
schema's no-digits rule guarding something real.

**THE TOOL HAS NO CALL TO ACTION ON EITHER SCREEN.** What ends the page is the capability matrix and then
`SOURCE_LINE` under the card, on the page ground. `closing-cta.tsx` is rendered by nothing;
`NEXT_PUBLIC_GCC_CTA_URL` reaches nothing and `ctaHref` is still threaded to `tool.tsx`. **There is no
outbound link anywhere on either public screen** and a spec asserts it.

**EVERY BARE SCALAR LEAVES THE CARD GRID FOR ONE FIGURE ROW, drawn by `SummaryFigures`** on Screen 1's
snapshot treatment. The split is by SHAPE, and that is what licenses moving a scalar at all: a scalar
draws no mark, so nothing a card's edges were measuring can be misrepresented. `layoutArea` returns
`figures` and `cards`; `scalarCells` is the shared builder. Rules:

- **The heading is an EYEBROW** (`FIGURES_HEADING`, per tab), 12px caps in `--ansr-accent-warm`. Not a
  lens re-lettered — none of the four lens words appears.
- **NO GLYPH ON ANY CELL AND NO RULE BETWEEN TWO OF THEM.** The gap is the separation. Nothing sets
  `data-cols`.
- **A UNIT IS TWO SCALE STEPS DOWN FROM ITS NUMERAL**, split by `figureParts` in `screen2.ts` — legal
  there because that module produced the string and its trailing alphabet is closed (`%`, `M`, `K`, `+`).
  Anything else comes back whole, which protects a grouped count, a bare index and a signed delta.
- **Figure above its label visually, heading before its figure in the DOM.** Label is ink; unit and note
  are muted.
- **A FIXED height on the figure box and nothing reserved below it.**
- **Column count from a STATIC map**, because a Tailwind class cannot be interpolated. One column below
  `sm`.
- **The floor note is once for the ROW** where more than one figure declares a floor, per-cell otherwise,
  and still per-card where a CARD carries one.
- **A composed row carries no QUALIFIER.**

**A COMPOSED TAB MAY DRAW A METRIC AS A SUMMARY FIGURE RATHER THAN A CARD, and only if it is a bare
SCALAR.** Operations is the one that does. **The supporting note is the part's own LABEL, not a sentence
in `copy.ts`** — a note authored beside a lifted figure drifts; a part's label cannot.
`OPS_SUMMARY_NOTES` holds the one exception, the disruption cell, which states the whole set's extent.
**The disruption cell states "2 – 6", not "0 days"** — there is no zero in this dataset, and a spec
asserts the extent AND the absence of a zero. `ops-grade-a-office-stock` loses its vacant figure and
nothing replaces it; accepted by the project owner as the cost of the promotion.

**Card width is `metricWidth` → `half | full` on twelve columns, `items-start`. There is no `third`.** A
half is six columns wherever the grid has columns, and **the grid only has columns from `lg`** — a tablet
is a one-column reading of this screen, so below `lg` every width class is inert. Ordering is by width.
**A breakdown is full measure past SEVEN parts.** `packWidths` lives in `screen2.ts`, is unit-tested on
all four tabs, and a browser spec asserts the same property at 1440, 768 and 390. **The two-column
composition falls out of the WIDTHS** — `compareByWidth` puts halves first, `packWidths` leaves an even
run alone — so nothing in the component chooses which metric goes where.

**Every card grid on the public screens packs so no row is left part-empty**, because an empty cell in a
grid of evidence reads as a card that failed to load. Three grids do it: Screen 2's metric panel, Screen
2's HELD panel, and the ask form (`FieldProps.span`). **Packing may only ever WIDEN a card**, never
narrow or reorder one.

**A card is a `<section>` with an accessible name, and a `<section>` is not valid inside a `<ul>`** — so a
card grid is a `div` of landmarks, and `getByRole("listitem")` in a spec means a figure-row cell.

**A TAB HAS ONE ORANGE ROLE AND IT IS THE FIGURE ROW** — `--ansr-action` at 30/38px Bold. Nowhere else on
such a tab. **The HR tab has TWO, in two different bands**, which the once-per-band rule permits: the
summary figures, and the salary ranking's comparator row, whose entry names itself in TEXT ("All roles
(reference)"). Both finance index charts set their values in the heading teal.

**A metric is a shape plus, separately, its numbers.** Structure (`scalar`, `range`, `breakdown`,
`matrix`) is authored once; `value` is nullable. That split is what lets the catalogue ship as definitions
with no invented figures and lets a gated metric render a placeholder with no value near the browser.
`alignValue` re-fits numbers when the shape changes, in one tested place.

**`atLeast` marks a metric whose figures are a floor** — part of the definition, not the value. Every
figure renders with a trailing `+`, applied in one place in `screen2.ts`. Refused on a rating, dropped by
the gate.

**`progression` marks a breakdown whose parts are waypoints on ONE path**, authored because nothing in the
data can tell a growth curve from four destinations measured once each. Refused on anything but a
breakdown of three or more parts, refused alongside `atLeast`, dropped by the gate. The derived
monotonicity check survives as a GUARD, not a second opinion: a progression whose figures stopped rising
falls back to bars. Both composed tabs draw it as `MilestoneTrack`; the derived INTERVALS are on no
screen and a spec asserts their absence. Accepted by the project owner.

## Chart rules

`src/components/public/charts.tsx` is the vocabulary both screens draw with. **There is no charting
library under it, and that is the reason rather than a preference about dependencies.**

**Every mark carries its figure in text beside it, and nothing is behind a hover.** A tooltip puts the
number one pointer-hover away, which on a phone is nowhere. Every mark is therefore `aria-hidden`: a mark
is a second reading of a figure already present.

**Two scoped exceptions, and neither generalises.** The capability grid inverts it — the rating word is
`sr-only` and the segments carry it on screen, licensed because the four ordinal words are present in
TEXT in the KEY. The segments still clear 3:1 against their own track, being the only visible encoding.
And the density map's city marks are `--ansr-action` at 2.03:1 on the land, under the 1.4.11 floor,
licensed because the ranked list beside it carries every city and count. **No other chart may take a warm
colour or sit under the floor on the strength of either.**

**A CELL'S MARK IS A LANDSCAPE RECTANGLE (16×10), NOT A SQUARE** — four squares read as four objects to
count, four rectangles read as one part-filled segmented bar, which is the comparison a rated matrix
exists for. **The key is DRAWN rather than listed, sits BELOW the grid at the trailing end, and its marks
are about half the cell's area.** The grid scrolls inside its own container below ~610px.

**Colour inside a chart is ordinal only, on the teal ramp — darker means more.** The ramp is monotonic in
Oklab lightness end to end and supplies no categorical hue, so any distinction that must survive greyscale
is carried by form: fill against outline, or a labelled step count.

**Which chart draws a metric is a property of the DATA, decided in `screen2.ts`, never in the component.**
`breakdownDisplay` and `gridDisplay` own it; `metric-card.tsx` draws what it is handed. **No rule may
parse a label** — entry and axis names are admin-editable.

- **An index grid shares ONE axis across every row, with the base drawn as a rule.** The base column is
  found from the cells (the column identical in every row), never parsed out of `indexBaseline`.
- **Direction lives in the metric's own `indexBaseline`**, because `format: "index"` says nothing about
  whether up is good.
- **Nesting is AUTHORED (`subset`); a shared `unit` is only the precondition.** Two same-unit parts
  without it draw as two ADJACENT proportional blocks. Refused on anything but two parts, on parts with no
  shared unit, and alongside `progression`.
- **A bar is dropped where it would mislead, and the axis is never truncated to rescue it.** 99.95%
  against 99.5% is caught by `clusteredHigh` and drawn as figures alone. A cost index draws a visible zero
  tick.
- **A PERCENTAGE SCALES TO 100 ONLY WHERE THE PARTS ARE THE WHOLE.** A stacked bar has no choice. A RATE
  is not a share of anything and scales to its own largest part. `breakdownScale` takes the display.
- **A part-to-whole claim gets one divided bar, never a row of bars.**
- **Order is never re-sorted by value.** The catalogue's orders are meaningful.
- **Whether a bar set may drop its grey track is derived, not assumed.** `selfLabelling` is a
  non-increasing test over the values: only a ranking sorted by the quantity its own bars encode states
  its axis in row one, and only it draws bare bars. Everything else keeps its track — which is also the
  shared zero baseline.
- **Counts abbreviate and nothing else does.** `formatCompact` applies to a scalar, the ends of a range,
  and the parts of a `number` breakdown. A unit is used only where the division is exact; K needs a whole
  number of thousands at 10,000 or above. Durations, percentages, indices and every grid cell keep their
  digits.

**India heatmap** — built from the city lists in the company data, filtered to the visitor's industry, dot
area and fill depth both tracking the count. **The one ambient animation is a halo BEHIND the leading
hubs, never the dot** — a dot's radius is the figure, so animating it animates the claim.

**Five renderers have no live caller and each is kept as a fallback rather than dead code:** `Journey`,
`NestedBar`, `RangeBar`, `Dumbbells`, `IndexLollipop`. All five are what `metric-card.tsx` would route a
derived tab's metric to.

## Design rules

**`assets/brand/tokens.css` is the single source of truth. Never a raw hex, magic pixel, or ad-hoc
duration** — `scripts/brand_lint.py` enforces it, including inside comments, so record a derived asset's
recipe by naming its source and target tokens rather than quoting values. Measurements, provenance, the
retired palette and the reasoning behind every rule below: `docs/design-reference.md`.

- **Orange has three roles** — CTAs, display FIGURES, small categorical EYEBROWS — and **one role per
  band, never two**. Never a surface, never body text.
- **`--ansr-action` above the 3:1 large-text floor only; `--ansr-accent-warm` for caption-size ink.**
  `--ansr-action` is unusable on the mint at any size, so a figure on a mint zone sits on a white card's
  own fill. `--ansr-accent-warm` is unusable on a dark ground. Neither may fill a control.
- **`--ansr-teal-bright` is for dark grounds only** and is unavailable inside a chart on a light ground.
- **Radius `none` on every card and panel on the public screens.** Two exceptions, both containers: the
  entry point's form card and controls at `lg`, the floating result card at `xl`. `pill` for chips,
  counters and actions. `md` is admin's default.
- **A border is earned** — mark → `Panel`, text or a grid of cards → `Block`, sealed card → firmer border.
- **Public form field boundaries use `--ansr-grey-500`**, the only light neutral clearing 3:1 on white.
- **Status is carried by form, not colour** — icon, label, weight, shape. The four `--ansr-status-*`
  tokens are retired and lint-blocked. Destructive controls use `.ansr-destructive`.
- **`text-accent` is the ORANGE** (shadcn contract variable). The brand heading teal is `text-accent-teal`.
- **Body copy is the display face at Light 300**, the brand's single biggest typographic tell. One filled
  primary action per screen. Body copy capped at `max-w-measure`.
- **Brand motifs and textures are adapted, never pasted** — `scripts/brand_asset.py`, and note `recolor
  --map` takes one comma-separated string, not a repeated flag. **Logos are the only literal-use
  exception**, and there are three: `ansr-wordmark.tsx` in the ask hero, the stacked lockup in
  `impact-band.tsx`, and `ProductIdentity`. Activate the `ansr-brand-assets` skill before touching
  anything under `assets/brand/`.
- **SVGs at the repo ROOT are gitignored** (`/*.svg`, root-anchored). If a root SVG seems ignored, it is.

## Invariants

Violating any of these breaks the product, not just the build.

1. **Gated values never reach the visitor's browser.** Fully loaded cost per FTE by role and level, HR
   cost per employee served, the cost-vs-ecosystem-depth trade-off, and the workplace-cost gradient are
   server-side omissions rendered as shape-only placeholders. A CSS blur over real text is a leak.
   **`publicMetric` in `src/data/metrics.ts` is the single enforcement point**: its gated branch has no
   `value` or `structure` field for a number to travel in, so the compiler carries the invariant. It also
   drops row and column names, the unit, the index base and the as-of date; both branches drop `lens` and
   `note`. Two schema-level guarantees: **there is no currency format** and a currency-looking `unit` is
   refused, so no absolute money figure can be expressed at all; and **a gated metric's title and question
   may not contain digits**. `gated` is not an admin control — the provider re-pins it on save. Gated
   metrics *are* edited normally in admin; the gate is on the way out.
2. **The free layer must stand alone as credible.** Peer proof carries it.
3. **Peers must be defensibly comparable.** Never pad a thin set — one bad peer discredits the whole card.
   When the set is short we say so plainly and the industry count carries the weight.
4. **Absolute per-head salary figures are never shown**, in any lens, gated or not. Cost is indices,
   spreads, growth rates and relative positions.
5. **Excel is a seed, never a runtime dependency.** Nothing reads `.xlsx` on request.
6. **No raw hex, magic pixel, or ad-hoc duration.** See Design rules.
7. **The public surface never hints that an admin exists.** No login link, no admin nav, no "sign in".
8. **Every India outline comes from Natural Earth's India point-of-view admin-0 set, and nothing is ever
   traced, approximated or hand-authored.** A dotted or filled silhouette IS a boundary claim, so there is
   no neutral rendering available; what is available is a claim whose point of view is stated rather than
   implied. **Two surfaces draw it from one file** — `build_dot_map.py` → `dot-world-map.ts` and
   `build_india_outline.py` → `india-outline.ts` — because mixing a default-view layer with an India-view
   one paints a disputed strip two ways, and drawing two different Indias on one page is the hardest thing
   here to defend. Both cache the same geojson under `.cache/` and commit only derived path strings.
   Positions come from `CITY_COORDINATES` in `geo.ts` — geographic fact, in code, so the taxonomy editor
   cannot plot a city somewhere invented. **The frame is fixed, may never be fitted to whichever cities an
   industry occupies, and must contain the whole of India.** `MAP_FRAME` and `INDIA_OUTLINE_FRAME` are the
   same numbers written twice and a unit test asserts they agree. **The visible attribution caption is
   gone at ANSR's request and a spec asserts its absence** — the open conflict is that the page no longer
   states whose claim it draws; first item on the blocked list.

## Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | **Next.js (App Router), TypeScript**, repo root | Three non-optional server needs: gated metrics must not serialize, admin needs auth and a write endpoint holding the publish credential, peer matching filters server-side. Not for SEO — the iframe means nothing is indexed. |
| Styling | **Tailwind v4 + shadcn/ui** | `@theme` consumes `tokens.css` directly, no duplicated palette. |
| Data | **Versioned JSON in the repo. No database, no bucket.** | 326 KB, 33 KB gzipped; every query is filter-then-sort. Publishing is monthly and batched, so a rebuild per publish costs nothing — and git supplies version history, diffs and rollback for free. |
| Auth | Single admin password, scrypt-hashed in env, signed httpOnly cookie, rate limited, optional TOTP | Real auth without a database. **`ADMIN_PASSWORD_HASH` uses `:` separators and base64url, not `$` and base64** — dotenv expands `$N`, so a `$`-separated hash arrives truncated and a correct password fails. Rate limiting has **two budgets**, per IP and per process, because `x-forwarded-for` is attacker-supplied. **`ADMIN_TOTP_SECRET` set without first confirming a working code locks everyone out** — no UI recovery path. `.env.example` documents every key. |
| Deploy | **`GeeteshRanjan/GCC-Landscape`** → **`gcc-landscape.vercel.app`** | Also the value `GCC_GITHUB_REPO` needs; the two must never diverge, because publishing commits to the repo the app deploys from. **Vercel applies env vars only to builds created after they were added.** |
| Delivery | **iframe embed in an ansr.com page** | Client's call. |

**iframe consequences, all load-bearing:**

- The tool cannot own the URL bar. Screen state is component state, not routes. Deep links are out.
- Height is negotiated via `postMessage`. No `100vh`, no fixed or sticky positioning that assumes it owns
  the scroll container.
- **No scroll-driven motion and no scroll-position logic.** An IntersectionObserver or scroll listener
  against our own viewport fires for content the visitor cannot see. Motion is tied to state changes,
  which is why no scroll-animation dependency is installed.
- `frame-ancestors` allows ansr.com for public routes and `'none'` for `/admin`.
- **Admin is never framed and is exempt from every constraint above** — real routes, owns the URL, may
  assume viewport height and a sticky header. Do not carry those patterns into the public screens, and do
  not simplify them out of admin to match.

**Preview deployments are behind Vercel Deployment Protection**, so a preview URL returns Vercel's login
page rather than the tool. Only `gcc-landscape.vercel.app`, built from `main`, is publicly reachable.
"Review it on the preview" is not a workflow that exists until protection is disabled or a bypass token is
minted. This is also why the browser suite runs against a local production build.

**Vercel is a host, not a platform.** ANSR may take this in-house, so nothing host-specific is used:

- Data access goes through a thin `DataStore` interface — `read`, `write`. The GitHub store reads with the
  Contents API's `raw` media type and writes through the Git Data API (blob, tree, commit, non-forced ref
  update). **Do not simplify either back**: the Contents API's JSON form returns *empty content* above
  1 MB, and its single-call update cannot express a real fast-forward check.
- **`GCC_GITHUB_TOKEN` is a scheduled failure.** On expiry, publishing returns "GitHub refused the request
  (401)" with a valid password and a valid draft. Record the expiry with the deployment and read that 401
  as an expired token before debugging anything else.
- **Reads and writes select different stores, deliberately.** Reads always come from the local JSON.
  Writes go to the deployment's source of truth, and the diff is computed against that same place —
  diffing against the baked-in file while committing to a branch that has moved is how one publish
  silently reverts another. With nothing configured in production, publishing refuses to start.
- **`GCC_DATA_STORE=fs` on a serverless host loses data silently.** It is the obvious way to make the
  "publishing is unavailable" banner go away and it is wrong: the filesystem is ephemeral, so a publish
  validates, diffs, reports success, and is gone on the next deploy. `fs` is for local development and for
  a self-hosted server with a real disk. Leaving it unset on such a host is the safe state.
- **The read cache is invalidated by the file, not by the writer.** `dataset.ts` stamps each cached copy
  with mtime and size. Clearing the cache from the publish endpoint was measured not to work — a route
  handler and a layout can be bundled separately, each with its own module state.
- Node runtime everywhere. No edge runtime, no Vercel-only middleware behaviour.
- **`next build && next start` on a plain Node host is the portability test.** Any scheduled work is a
  plain route protected by a shared secret.

## Data

**Seed:** `Consolidated_GCC_India_Database_2026_New.xlsx` — 1834 companies, 16 columns, one sheet.
Profiled in `docs/data-audit.md`; read that before touching the schema. `exceljs` carries a moderate
`uuid` advisory reachable only when *writing*; this script is offline and read-only, and the version is
pinned.

**Excel is a seed, not a system of record.** Imported once, cleaned and normalised on the way in; after
that **admin is the authoritative editor** — company CRUD, taxonomy, business types, the Screen 2 metrics,
and `siteContent`. The spreadsheet is read again only to bulk-append a future batch, through the same
validation.

**Pipeline:** upload or edit → parse → validate against schema → **diff preview** → publish, which commits
the JSON and triggers a rebuild. Live in about a minute; that latency was weighed and accepted, so do not
reopen it. Validation failure blocks the publish. Rollback is a git revert. **The admin never touches
git** — the app makes the commit server-side and admin sees one Publish button.

**Publishing is batched.** Edits are held as a **draft in the browser**, autosaved locally, with an
unpublished-changes warning. No server-side draft storage exists. This is why no runtime datastore is
needed: nothing is written one field at a time.

**Development never publishes to the configured production store.** Locally the store is `fs` and writes
to `data/dataset.json`. To exercise the publish path deliberately, use the browser suite, which runs
against its own copy in `tests/browser/.tmp`.

**The dataset is read server-side and held in memory. It is never shipped whole to the browser** —
Screen 1 sends five peers and a few counts.

**Three editable collections, one file.** Companies, metrics, and `siteContent` (the entry point's hero
copy and ANSR's impact figures) all live in `dataset.json`. A second file would mean a second write
target, a second diff, a second cache and a publish that could half-succeed. `metrics` is **defaulted to
`[]` rather than required**, so a dataset written before it existed still reads — the fs store refuses an
unrecognised version, so bumping `DATASET_VERSION` would have turned a compatible addition into a broken
read.

**Why the hero copy is data when no other public string is:** everything else is an argument about the
dataset and lives beside the logic making the argument. The hero is positioning and the impact figures are
corporate facts on their own schedule. It is the only part of a publish that changes what every visitor
sees on arrival, so it gets its own diff category and leads the preview. Its default is real content
rather than `[]`. **The hero's company count is deliberately "1,800+" and not 1,834** — editable text, not
`companies.length`; `data:verify` cannot check it and a spec asserts the exact figure is absent.

**The importer preserves the catalogue.** A re-import rebuilds companies and taxonomy and would otherwise
erase months of typed-in metric values in a way that looks like a normal import.
`--reseed-metrics` and `--reseed-site-content` adopt the in-code versions and are loud about what they
discard.

**No invented metric values, and no estimated ones.** An incomplete open metric is left off the public
screen rather than rendered half-filled; a gated one is always included. Three rules govern the
catalogue's values: **supplied money becomes an index, or nothing** (no currency format exists; where the
source gave no comparison base the metric stays empty with a `STILL NEEDS` note); **a range collapses to
the end that understates India's advantage**; **structure follows the data** — parts with no figure are
removed rather than left empty. **Five figures are provisional, including two 10% placeholders marked
`PLACEHOLDER` in their notes**; `docs/data-audit.md` names all five, and a unit test pins the MARKER
rather than the number.

**Columns kept:** company name, HQ country, revenue band, industry, establishment year, city list, FTE
range, Fortune Global 500 flag, Forbes Global 2000 flag. **Dropped:** sub-industry, company type, exact
GCC headcount, estimated FTEs, S.No. FTE range is the only headcount field, stored as a normalised
`(min, max)` pair. Every supplied range is already closed, so no ceilings are invented. Display strings,
location count and tier-2 presence are **derived, never stored** — storing them is how two columns start
disagreeing.

### Peer matching

```
score = 0.7 × businessSimilarity + 0.3 × bandProximity
ordering: score, then HQ country, then GCC size, year, name
```

`businessSimilarity` is the share of the visitor's **IDF-weighted** tag mass a company shares, weights
being rarity within the industry, **never hand-authored**. `bandProximity` is three steps: 1.0 same band,
0.66 adjacent, 0 otherwise.

**Matching never leaves the industry.** Education has six companies and fills five slots from its own;
Electrical & Electronics has two and stays three short and says so. Relaxing the boundary is cheap under
this architecture and is a separate decision.

**A similarity floor of 0.20 applies to `businessSimilarity` ALONE, never the combined score** — a perfect
band match is worth 0.3, which on the combined score would drag a business-irrelevant company over the
line. The floor can shorten a set; that is invariant 3, not a defect, and `data:verify` counts how often.
Reasoning for 0.20 over 0.15 sits beside the constant in `similarity.ts`.

**The old three-rung band ladder survives as `matchPeersByBandLadder`, as the test oracle.** With no
sub-industry the scored engine reproduces it company-for-company, asserted in `similarity.test.ts` and as
a `data:verify` invariant. Do not delete it without deleting those.

**Sub-industry is never a match key.** 620 values over 1834 companies is not a taxonomy: it is read on
import, collapsed through `scripts/business-type-map.ts` into one of 158 business types, and discarded.

**Tags are code, business types are data.** `BUSINESS_TAGS` (137) is the scoring substrate — deleting one
silently re-scores every peer set, so the vocabulary is a code change. Business types are admin-editable.
**Every tag must be carried by at least two business types**, asserted by `data:verify`. **A company's
business types must belong to its own industry**, enforced by the schema — so an industry rename cascades
into `businessTypes[].industry` as well as into companies. **An untagged company is a safe state**: 66 are
deliberately untagged.

**The comparison block shows neither revenue band nor HQ country.** `toCard` drops `revenueBand`,
`industry`, `businessTypes`, `forbesGlobal2000` and `hqCountry`. HQ has been off, on, and off again, and
the rule that survived is **remove the column and the field together, or the next reader assumes the
omission was an oversight.** Nothing about matching moved on any occasion: HQ is a sort preference and
never a filter.

**`peerLead` is exported, unit-tested on both branches, and rendered nowhere**, so the block states no
method. Two rules came out of its history and both are pinned by specs: **every branch of a derived
sentence needs its own assertion**; and **the default branch claims ONE key**, because with no
sub-industry the score is band proximity alone, which is a three-step function rather than a distance —
and the next key down is HQ, which the card does not show. A test asserts a size-ordering counter-example
EXISTS rather than asserting size ordering holds.

**No copy may claim something a card cannot show.** And **a test that reads a dropped field gets
`undefined`**, so a comparison over it silently passes: assert that the guard holds, or read the field
from the dataset.

**NO SECTION ON THE PEER VIEW RENDERS A LEAD.** `Panel` and `Block` both still take the prop; nothing
passes it. Every removed sentence still exists in `copy.ts`, is still unit-tested, and its absence is
asserted by a browser spec.

### Taxonomy

**Admin-editable, first class:** industry, revenue band, city, HQ country. A new value appears in the
public dropdowns on the next publish. **Renaming cascades into every company that referenced it** —
without the cascade the publish fails referential integrity, which is correct but useless. Deleting a
value still in use is refused in the editor, where the reason can be explained, rather than at the schema
gate. **`taxonomy.revenueBands` is ordered ascending and that order is the contract**; the editor appends
and offers Move up / Move down, and the diff reports a reorder as a real change.

**The four function areas and four lenses are enums, not taxonomy.** The metric editor can rename a
metric, rewrite its question, and add, rename or remove the parts and axes of its shape — but not add or
delete a whole metric, and not change its format, function area, lens, gating or `atLeast` marker. A
genuinely new metric is a code change to the catalogue, deliberately. Because six titles appear on more
than one tab, admin's Edit button names the function area alongside the title.

### `data:verify`

**Two different things, and the distinction is load-bearing.** *Invariants* are properties of the code
that must hold for any dataset; a failure is a bug and `--accept` deliberately cannot silence it.
*Profile figures* are the measurements in `docs/data-audit.md`; a legitimate admin edit is supposed to
move them, they live in `data/verify-baseline.json`, and accepting a real change is
`npm run data:verify -- --accept`, which rewrites the baseline and prints the delta. Commit that file
alongside the data change and bring the audit document into line. The gated set is recorded **by id
rather than counted**, so a metric losing its gate reads as a named change. **Do not collapse the split
back into one list of hardcoded numbers** — a check that must be edited or ignored after every legitimate
change has stopped being a check.

**Known gap:** no per-company function list, and there will not be one. `COMMON_FUNCTIONS` is the
hardcoded set the brief permits.

## Architecture map

What lives where. Never a file listing — the tree is supplied each session.

| Path | Responsibility |
| --- | --- |
| `src/app/` | App Router. `layout.tsx` self-hosts the display face via `next/font` and exposes it as `--gcc-font-display-loaded`, which `tokens.css` reads — the generated family name is hashed, so naming the face literally would fall through to the sans stack and lose Light 300. **`font-display` is set ONCE, on the public root in `tool.tsx`**, never per surface. `body` stays on `--ansr-font-sans` so admin keeps Inter. `page.tsx` is the only public route, serves both screens, and is `force-dynamic`. `actions.ts` is the public surface's single server action — one seam, so there is one place to check the dataset does not cross. Screen 2 needs none: its payload does not depend on the visitor. `globals.css` is the Tailwind theme aliased onto brand tokens; it restates no values and clears Tailwind's palette. **`--ansr-gradient-teal` and `--ansr-gradient-orange` are `background` SHORTHAND values, not images** — a colour is not a valid `<image>`, so aliasing them into `--background-image-*` emits an invalid `background-image` that paints nothing silently while still generating a class that looks correct. Both go through `.gcc-ground-gradient`; only `--ansr-gradient-conic` stays aliased. |
| `src/data/` | The whole data layer, and the only place that knows the dataset shape. `schema.ts` (zod contract), `normalize.ts` (cleaning primitives, shared by importer and admin upload so one format never gets two parsers), `derive.ts`, `peers.ts` (scored engine + Screen 1 counts + the ladder oracle), `similarity.ts` (IDF weighting, band steps, `SIMILARITY_FLOOR`), `search.ts` + `search-terms.ts` (the dropdown filter's matcher and its vocabulary — the two modules in here a CLIENT component imports, which is why neither may ever take `server-only` and why they hold no dataset), `business-tags.ts`, `business-type-catalogue.ts`, `diff.ts` (one computation, two renderers), `metrics.ts` (`publicMetric`, the gate), `metric-catalogue.ts`, `store.ts` + `store/{fs,github}-store.ts`, `publish-store.ts` (selects the write target, refuses to guess), `dataset.ts` (cached read, mtime+size invalidation, `server-only` — which is what makes "never ship the dataset" a build error). `screen1.ts` is Screen 1's view model; two fields carry their own justification — `industry.averageHeadcount` is a mean of FTE BAND MIDPOINTS, industry-level, rounded coarser than the narrowest band, and never renderable without a method line; `scale.asOf` is the dataset's `generatedAt`, the only date here that is a machine fact, and `dataset.source` is deliberately not carried across. `screen2.ts` is Screen 2's view model and holds `figureParts`, `layoutArea`, `metricWidth`, `packWidths`, `breakdownDisplay`, `gridDisplay`, `breakdownScale`, `selfLabelling`, `journeyLegs`; it imports the gate rather than `dataset.metrics`, so there is no path around it, and resolves every metric to pre-formatted figures with no nullable value left in the type. `geo.ts` (city coordinates, `MAP_FRAME`), `india-outline.ts` and `dot-world-map.ts` (both GENERATED, never hand-edited), `countries.ts`. |
| `src/app/admin/` | Six tabs: Companies, Taxonomy, Business types, Metrics, Entry point, Publish. `login/` sits outside the `(authed)` route group; the group's layout is the guard and hosts the draft provider. A route group rather than middleware — middleware would be a second runtime to keep Node-only for no gain. |
| `src/app/api/admin/` | Login, logout, diff preview, publish. Each **re-checks the session itself** — a layout cannot guard a route handler, and a route that forgot would be silently public. |
| `src/lib/admin/` | `password.ts` (scrypt), `session.ts` (signed cookie, `server-only`), `rate-limit.ts` (two budgets), `totp.ts` (RFC 6238 on `node:crypto`, no dependency), `guard.ts` (redirect for pages, bare 401 for APIs), `publish.ts` (validate → read → diff, shared by preview and commit), `constants.ts` (exists because `server-only` throws under `tsx`). |
| `src/components/admin/` | Client-side admin UI. `draft-provider.tsx` autosaves locally and pins the baseline it started from; its `STORAGE_KEY` is versioned and **must be bumped whenever the editable shape changes**, because restoring a draft missing a key produces a schema error the admin cannot fix from the UI. `site-content-manager.tsx` is the one editor with no local form state and no Save button — nothing in it has a cross-field rule, so there is no second copy of the truth. Plus the app shell, company table and editor, taxonomy editor, metric catalogue and editor, publish view. |
| `src/components/public/` | What both screens use. `tool.tsx` owns the phase machine — ask, Peer View, Function View — as component state, and moves focus to the new phase's landmark on every transition. **On the result screens that landmark is the tab panel, not the `h1`**, which is identical on both. **The focus move is an effect keyed on the phase, never a call beside `setPhase`** — the `requestAnimationFrame` version assumed React commits before the next frame, and when it did not the ref was null and the only announcement was silently dropped; it passed locally and failed on the deployed build. The effect must skip its first run. **It always takes `preventScroll`, and `tool.tsx` states the position itself**: the visitor's own offset between the two views, document top for anything involving the ask. The offset is read on the press and written back after the commit, because `preventScroll` alone still dropped to 0 when a ~2,900px document was replaced by a ~1,650px one. None of this is the banned scroll logic and every write is inert in the embed. `primitives.tsx` holds `Section`, `Stat`, chip, fact-list and provenance shapes, the number formatters, `Panel` (bordered card, radius `none`, no shadow, `PanelTone` = `plain | inverse | sealed`, plus `chip` and `headingLevel`), `Block` (same landmark contract, no container, `weight="lead"`) and `Zone` (the alternating full-bleed grounds; each screen owns its own SEQUENCE). `screen-header.tsx` owns the whole result SURFACE: `ResultSurface` (ornamented band + floating card, taking the tab bar and the panel as separate props because their order is not a caller's decision, plus a `footer` for the caption under the card), `ProductIdentity`, `HeaderFinding`, `ContextPanels`, `ViewTabs`. `charts.tsx` is the shared vocabulary, including `Containment`, `RangeBenchmark`, `MilestoneTrack`, `IndexSpread`, `IndexTable`, `BarTone`, and the five renderers with no live caller. `closing-cta.tsx` is rendered by nothing. This folder exists because Screen 2 wanted most of `screen1/primitives.tsx`. |
| `src/components/screen1/` | The public Peer View. `peer-view.tsx` (ask and answer states), `ask-hero.tsx` (the one band using the brand's real display ground, which **admits white ink only** — every muted token measures under 3:1 on it), `customer-logos.tsx`, `impact-band.tsx`, `ansr-wordmark.tsx` (drawn lockup, sized off cap height, word carried in `sr-only` so the accessible name is unchanged), `dotted-world-map.tsx` (layout only — two `<path>` elements over generated geometry; all ink, opacity, radius and edge fade in `.gcc-hero-map` and `.gcc-header-map`, so the two placements cannot diverge), `input-panel.tsx` (four controls over six fields, its own field primitives because a public form and a dense internal tool want different densities), `select-field.tsx` (the widget all four use, and the one place an option carrying children turns the popup into a tree; `.gcc-select-*` in globals.css carries both shapes and the measured room table), `evidence.tsx` (comparison grid, containment layers, largest-centres chart, function tags, scale strip; `CityCells` has two consumers), `city-map.tsx`, `snapshot.tsx`, `copy.ts` (**every visitor-facing sentence**, because which lines exist is a statement about what may honestly be claimed), `use-frame-height.ts`. **Both ranked TABLES are gone, and with them the focusable horizontal scroller.** |
| `src/components/screen2/` | The public Function View. `function-view.tsx` (screen + four tabs, on the Radix Tabs primitive rather than the registry wrapper — 44px triggers, no `transition-all`, no shadow; cuts the already-packed card list where widths change). `metric-card.tsx` is layout only — selects no chart and does no arithmetic; owns the shape-only placeholder (static, hatched, uniform, so it reads as sealed rather than loading), `CardMeta`, and the capability grid's row glyphs keyed by LABEL, the single place this screen reads an admin-editable string, guarded all-or-nothing. `summary-figures.tsx` (`SummaryFigures` + `scalarCells`), `zones.tsx` (`TabZones`), `graduate-card.tsx` (`GraduateOutput`, drawn by operations AND HR, here rather than in either file because two views of one shared metric must not be two pieces of markup), `hr-view.tsx`, `ops-view.tsx`, `fin-view.tsx` (the three composed tabs; `OpsPanel` has no gated metric and owns `summaryCells`, which selects rather than computes; `FinPanel` refuses most of its own reference and owns the tier spread and location grid). `copy.ts` holds `FIGURES_HEADING`, `SOURCE_LINE`, `VELOCITY_HEADING` (one heading shared by two tabs, a constant rather than the same words typed twice), `heldHeading`, `indexedNote`, `METRIC_NOTES`, each composition's own strings, and six sentences exported, unit-tested and rendered nowhere. |
| `src/components/ui/` | shadcn/ui, unmodified from the registry. On-brand because `globals.css` maps the contract variables onto brand tokens. |
| `data/` | `dataset.json`, pretty-printed on purpose — a reviewable diff is the reason there is no database. `verify-baseline.json`, updated only by `data:verify -- --accept`. Both tracked. |
| `public/logos/` | Customer marks, derived from the gitignored `Customer Logos/`. Six are real vectors; four arrived as a base64 raster inside an SVG `<pattern>` and are re-encoded to PNG at 2x display height. **Check a new logo's bytes, not its extension.** |
| `assets/brand/` | Brand source of truth; `tokens.css` is authoritative. |
| `public/brand/` | Motifs already adapted for a placement, served as static files. Derived output — each reproducible from `assets/brand/` with a `brand_asset.py` command recorded beside its use. |
| `.tastemaker/` | `style-lock.md` — **both public screens' visual decisions and the reasoning behind them**, including every rejected alternative. Restates no token values; `docs/design-reference.md` and `tokens.css` outrank it. |
| `.impeccable/` | Untracked working directory of a skill that is no longer installed. `critique/` holds one dated snapshot, kept as a local artifact. |
| `tests/unit/` | Vitest, node environment, no jsdom. Pure and server-side logic. `vitest.config.ts` resolves the `react-server` condition, which is how these import a `server-only` module at all. |
| `tests/browser/` | Playwright against a real `next build && next start`, on its own dataset copy. Covers what a unit test structurally cannot: draft lifecycle, autosave, restore after reload, stale-baseline conflict, focus behaviour. **Serial, one worker** — the server holds the rate limiter and dataset cache in memory. Numbered specs run in reading order; `6-lockout.spec.ts` exhausts the limiter and must stay last. The `public` project runs first, before the publish spec rewrites the fixture. **Each project's `testMatch` is narrow, so a spec numbered outside all of them silently never runs.** `helpers.ts` owns `DRAFT_STORAGE_KEY`, `choose()`, `chooseSubIndustry()`, and `band()` / `expectBand()`. **A public spec must never locate a band by its heading text** — twenty did, and a copy pass broke all twenty. The id is the contract; `expectBand` accepts either `aria-labelledby` or `aria-label`, and what must not pass is a band with neither. Peer landscape ids: `snapshot`, `peers`, `industry`, `largest`, `functions`, `map`, `scale`. Screen 2: `function-metrics`, plus `hr-velocity`, `hr-analysis`, `hr-held`, `ops-velocity`, `ops-supporting` — prefixed by function because two composed tabs draw the same section under the same heading. `0-search.spec.ts` drives the dropdown FILTER, and **it may not open two industries in one pass** — below 1440 the cascade pane is a drill-in that covers the parent list, so the second industry is behind it. |
| `scripts/` | Run by hand, never at request time. Python: `brand_lint.py`, `brand_asset.py`, `brand_status_analysis.py`, `inspect_xlsx.py`, `build_dot_map.py`, `build_india_outline.py`. TypeScript via `tsx`: `import-seed.ts`, `verify-data.ts`, `admin-hash.ts` (mints the env values from a TTY prompt so the password never lands in shell history), `business-type-map.ts` (601 sub-industry mappings + 568 per-company decisions, keyed `industry||name` because company names are not unique even case-insensitively), `check-business-tags.ts`, `check-company-types.ts`, and the two analysis scripts `sweep-floor.ts` (worthless if its self-check does not say SOUND) and `proto-industry-tag.ts`. Rerun them rather than re-deriving their numbers. |
| `.kiro/` | `steering/` — always-in-context rules, three files. `hooks/` — `brand-guard` (PostFileSave → `brand_lint.py`) and `handoff-refresh` (Stop → rewrite the handoff). `settings/` — MCP config, permission-guarded against agent writes. `skills/` — one skill, `ansr-brand-assets`, which is ours; **untracked**, and `skill-sources.json` pins the 135 removed third-party packs for restoration. |
| `docs/` | Reference, read on demand. Not steering. `brief.md` (read it, not the image), `data-audit.md`, `business-types.md`, `design-reference.md`, `ansrx-visual-language.md`, `traps.md`. |

## Document protocol

**Three steering files. Everything here is paid for on every single turn**, so a fourth needs a reason and
a fifth almost certainly means something belongs in `docs/`.

- **`project.md`** — durable rules. Edited by replacement, never by appending. **Reasoning about rejected
  alternatives does not belong here**; it goes to the style lock. If a line is no longer true it is
  deleted, not annotated.
- **`handoff.md`** — volatile state, rewritten in ONE pass by the `handoff-refresh` Stop hook. **Shape,
  not length, is the limit** — see below.
- **`.tastemaker/style-lock.md`** — visual decisions and their history. No limit; read on demand.
- **`docs/*.md`** — reference detail. Not auto-loaded. One topic per file, named for the topic.
- **Superseded content is deleted**, not struck through and not moved to an "Archive" heading. Git holds
  the history.

**These files are committed. No live credential ever goes in one** — refer to `npm run admin:hash` and
name the variable, never the value. Same for test fixtures: a credential-shaped string trips push
protection and every downstream scanner.

### `handoff.md` is bounded by SHAPE, not by a line count

A line budget is what made maintaining this file expensive: every session re-read it, measured it, and
shaved wording to fit, which costs more than the file does to carry. So the budget is structural. Four
sections, each a list with a hard item cap:

```
## Where we are     — at most 5 bullets
## Next action      — at most 5, numbered, most urgent first
## Blocked          — at most 12, numbered
## Traps            — a pointer to docs/traps.md plus at most 5 bullets
```

Three rules make that free to maintain:

1. **Never measure, never shave.** Do not count lines and do not reword to fit. Over the cap, **delete or
   merge a whole item.** A bullet may be two sentences; if it needs three, its reasoning belongs in
   `project.md` or the style lock and the bullet becomes a pointer.
2. **One write.** Compose the file and write it once. Never edit the previous copy down line by line.
3. **State and pointers, never reasoning.** Where we are, what is next, what is blocked, what would bite,
   and WHERE the explanation lives. A handoff line that says *why* is duplicating something that already
   has a home.

**A resolved item is deleted, not marked done.** When Blocked is full, the least urgent item moves into
`project.md` as a rule or into the style lock as a decision — it does not get compressed in place.
