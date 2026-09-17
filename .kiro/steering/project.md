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

**Five fields, four asked, four controls. Every asked field is read by the matching.**

| Input | Control | What uses it |
| --- | --- | --- |
| Industry | custom listbox → tree | Primary peer match key, and a hard boundary |
| Revenue band | custom listbox, the seven bands in the data | Peer similarity axis, weighted below business |
| HQ location | custom listbox, **every country** | Sort preference on the peer set |
| Sub-industry | **cascades out of industry**, optional | Business similarity — the primary ordering signal |
| Existing GCC status | **not asked** | Branches the framing. Constant; see below |

Never ask for a revenue figure — the data holds bands, so the input is a band. Hold any new field to the
standard that killed global headcount: if nothing consumes it, it does not get asked.

**COMPANY NAME IS GONE — the field, the zod property, the `companyName()` helper and three copy keys —
and it is the standard above applied to a field that had already shipped.** It personalised two strings
and was read by nothing else: no figure, no peer, no count, no ordering. Both strings now say what they
need to without it, so there was nothing left to consume it. Four consequences hold together. **It is not
the `gccStatus` case and the two must not be reasoned about together**: `gccStatus` is unasked and still
RENDERED, supplied as a constant, so its field is load-bearing; a name had no renderer left. **`peersTitle`
is a FLAT published key again** — see below — and `askCompanyLabel`, `pillCompany` and `peersTitleFallback`
were deleted rather than left editable and undrawn, which took the copy block from 70 keys to 67 and the
draft `STORAGE_KEY` to v10. **The pill row is THREE pills on both result screens**, and the parity is
asserted on each. And **`isVisitorsOwn` in `peers.ts` no longer fires for a visitor**: it keyed on the
name, so a visitor's own company can now appear in its own peer set. The guard is unchanged, still keyed on
`VisitorInput.companyName`, and is asserted through `matchPeers` in the unit suite — restoring the exclusion
means asking for a name again, which is a product decision and not a bug fix.

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
does not re-open the visitor's branch. **The pane is a flex sibling INSIDE the panel and the two panes
split the body in half** — it is not positioned outside it, so there is no room table and nothing to
clamp at runtime. **Below `md` it covers the first pane as a drill-in**, covering the BODY only so the
filter stays reachable. Rejected geometry, including the `layoutWidth / 2 − 400` table this replaced:
style lock.

**THE PANEL IS WIDER THAN THE FIELD, AND THE OPTIONS ARE IN COLUMNS.** A popup one field wide showed
eight of 24 industries, so a visitor was deciding between industries without seeing the set — and one
who cannot find their own row takes the broad answer, which is the findability failure below. `wide`
widens the panel to the whole form grid; `columns` is 2 for industry (its longest name is 41 characters
and needs a full half of the 800px body) and 3 for countries. Four things hold it together: **the
widening is expressed in the FIELD's own width and never the viewport's**, gated on `md` where the grid
gains its second column; **`wide` NAMES THE FIELD'S POSITION rather than being a boolean**, because the
offset needed depends on it — `"grid"` for a field that spans the whole grid, which takes NO margin, and
`"column"` for a field in the grid's TRAILING column, which reaches back over its sibling with
`calc(-100% - space-6)` (`.gcc-select-panel--reach`, its own class so the width and the offset are two
decisions). A field in the LEADING column may not widen at all and there is deliberately no value for it:
it was a boolean carrying that constraint in a comment, and when a removed field shifted every cell along
both wide panels drew a column and a gap off the leading edge of the card. **Columns are CSS multi-column
so DOM order IS column order**, which is what
keeps the keyboard walking what is drawn; and tier headings take `column-span: all`, so each tier
balances into its own equal columns. The body is a FIXED height on a wide panel and a CEILING otherwise
— seven revenue bands in a 416px box read as a list that failed to load. Opening a branch drops the
first pane to one column; the body's box does not change.

**A row is 14px on `--ansr-leading-snug` at 4px of block padding.** 16px is a floor on the TRIGGER only,
where iOS zooms the viewport; a row in an open popup cannot trigger that. **Row fills are diluted into
`--ansr-surface-pale`, the tint that marks India's column in the technology capability grid**, at
ANSR's request — matte, meaning one flat fill and no gradient, shadow, border or ring. **Nothing in the
panel's chrome is tinted**: the filter row, the hint line and the pane header are all on `--ansr-surface`,
separated by one hairline. The hint is 12px Medium in `--ansr-text-muted` with symmetric padding — a
supporting note, not a coloured strip.

**A SELECTED ROW IS MEDIUM WEIGHT IN THE HEADING TEAL, AND THERE IS NO CHECK GLYPH.** Removed at ANSR's
request: a mark drawn on one row has to be reserved on all of them, which put every label 22px inside
the hint and the tier heading and made the heading's inset a `calc`. The fill stays out of it — the fill
is the keyboard's position. Every row keeps `aria-selected`, which is what the assistive reading used.
**No `font-family` on the panel**: `font-display` is set once on the public root and the popup inherits
it, so restating it there was reverted as a second place to decide the typeface.

**A REVENUE BAND IS FORMATTED FOR THE VISITOR AND NEVER RENAMED IN THE DATA.** `formatRevenueBand` in
`primitives.tsx` spells `<` out as "Under" and takes the `$` off every row; the dropdown states the
currency once in its hint and each result screen's pill carries it in the label, "Revenue band (USD)".
The stored string stays the matching key and `taxonomy.revenueBands` order stays the contract, so admin
keeps showing the stored strings — admin edits the datum. Applied at all three display sites and pinned
on all seven bands by a unit test; `helpers.ts`'s `choose()` translates for the one control whose label
is not its value.

**`gccStatus` is kept, supplied as the `evaluating` constant (`ASSUMED_GCC_STATUS`), and rendered by
nothing.** `framing()` and `functionFraming` are both still exported and unit-tested on all three values,
and the unit suite is the only place the field can be varied at all. It briefly had a renderer on each
screen; the close's copy is now supplied and fixed, so there is nothing left for a status to select, and
Screen 1's `peerClosing` was deleted rather than kept as a second unrendered copy of the same branch. **Do
not delete the field on the strength of its being unrendered** — restoring a branched close is one prop.
Neither screen's fact summary echoes "India today": showing a constant there would be the tool telling a
visitor what they said about something it never asked.

**The three dropdowns are a custom listbox, not `<select>`, and not Radix Select** — Radix portals with
`position: fixed`, which anchors to the wrong viewport inside a frame sized to its own content. The
panel is absolutely positioned inside the field, always opens downward, and carries a filter above 12
options. **THE FILTER TAKES FOCUS ON OPEN ONLY WHERE THAT DOES NOT RAISE A KEYBOARD** — gated on
`(pointer: coarse)` in `hasVirtualKeyboard`, never on a width, a user agent or `ontouchstart`, since the
question is what the visitor's primary input IS. On a phone the panel and the software keyboard used to
arrive together and the keyboard took half the viewport, so a press meant to reveal options revealed
three. The trigger keeps focus, so every key still works; the filter takes it when it is pressed. It never flips, so it asks to be revealed: `scrollIntoView({ block: "nearest" })` on open,
targeting the cascade PANE when one is open, with `scroll-margin-block-end` absorbing the entrance
keyframe. That is not the banned scroll logic — it reads nothing, reports nothing, and is inert in the
embed. Admin keeps native selects. Specs drive both shapes through `choose()` and `chooseSubIndustry()`
in `tests/browser/helpers.ts`; `choose()` handles the tree by then taking the `All of {value}` row.

**A ROW COMMITS ON `pointerdown` FOR A MOUSE AND ON `pointerup` FOR A FINGER, and the split is the
decision.** A finger's press is also the start of a scroll, so committing on contact meant a drag down a
24-industry list chose whatever row it started on — and on the industry control the cascade then slid in
mid-gesture. So a touch press is held in a ref and acted on at `pointerup`, only within `TAP_SLOP` of
where it landed, and `pointercancel` abandons it. Four things hold together. **`preventDefault()` on the
`pointerdown` is what a touch may NOT have** — it suppresses the browser's own panning, which is the
gesture being protected — and mouse and pen keep it, which is why their path is unchanged. **The
compatibility `click` must therefore be SWALLOWED** (`swallowNextClick`): it is hit-tested against the
page as it stands when it fires, after the panel has unmounted, and it landed on the submit button — a
press choosing a revenue band submitted the form, measured. **All three compat events go, `mousedown`
included**, because focus follows `mousedown` and cancelling the click alone left the submit button
focus-ringed. And `activate` is untouched, so `Enter` never goes near a pointer handler.
`touch-action: pan-y` on `.gcc-select-scroll` states the one gesture the box owns; it cannot fix this
alone, because a handler on `pointerdown` runs whatever the default action was.

**A ROW IS FOUND BY WORDS THE VISITOR USES, NOT ONLY THE WORDS ON IT.** `search-terms.ts` holds
extra search terms per industry, per sub-industry and for the handful of countries with another
common name; `search.ts` is the single matcher. **The terms are CODE, for the same reason
`BUSINESS_TAGS` is** — a term routes a real person to a peer set. Nothing here is ever DISPLAYED: a
`treeitem`'s name is computed from its contents, so a visible synonym renames the row and breaks
every exact-name lookup. The rule is normalise (`&` → `and`, diacritics folded, **apostrophes
ELIDED not spaced** so `L'Oréal` becomes `loreal` and a visitor typing `Loreal` matches it,
punctuation to spaces), split the query, require EVERY token; a token of four characters or more is
a plain substring. A term must reach the row it is filed under and must not reach more than six
sub-industries — asserted, so the table cannot become keyword stuffing. The ceiling is scoped to
terms with NO short token in them, because a short token's breadth is the matcher's decision and not
the table's.

**A SHORT TOKEN IS A PREFIX FROM A WORD START, WHEREVER IT SITS IN THE QUERY.** Three characters or
fewer matches a word's opening letters anchored to a word boundary — `ai` reaches `AI platform` and
the aviation rows but not `retail` or `chain`, which unanchored substring matching would. It is a
prefix in EVERY position, not only when alone: a short SECOND word was once held to a whole word, so
`software se` matched nothing until `software secu` four characters in, which reads as the filter
having died. The cost is breadth on an initialism typed complete — `p and c` and `m and a` reach
more rows as prefixes than as whole words — but the AND across tokens still lands the wanted row near
the top, and a filter that answers every keystroke is worth more than one tight on three-token
initialisms. This is still the one place the matcher is narrower than a label substring (`ai` inside
`retail` is gone), so the widening guarantee in the test stays scoped to four characters and up.

**THE CASCADE'S SECOND PANE RANKS, THE FIRST PANE CUTS, and the asymmetry is the decision.**
Filtering pane B to the hits alone showed 2 of BFSI's 15 sub-industries for `fintech` and 2 of Software
& Internet's 31, so a visitor could not see the sibling that fitted them better — and the fallback from
"my row is not here" is the broad answer, which is the findability failure below. So pane B draws the
hits, then a breaker, then every remaining child; `partitionByMatch` in `search.ts` is the one
implementation and is pure so it is unit-testable with no jsdom. Pane A stays a hard filter, because
narrowing 24 industries to a handful is its whole job. **The breaker is drawn only when BOTH groups
exist** — gated on `matched.length` rather than on `filtering`, so all-match (`education` → Education)
and no-match (`wholesale` → Wholesale) both correctly draw none. It does not name the industry: the
pane header sits outside the scroll container, so the industry is permanently on screen above it. Pane
B's old "No sub-industries match" empty state is DELETED, not left unreachable — a nothing-matches note
beside fifteen visible rows is a false statement. Pane A keeps its own, which is still reachable.

**THE MATCHED RUN OF A LABEL IS HIGHLIGHTED, AND IT IS ONLY SAFE BECAUSE EVERY ROW CARRIES AN EXPLICIT
`aria-label`** — that overrides name-from-content, so splitting the visible label into `<mark>` elements
cannot rename the row or break an exact-name lookup. **`highlightRanges` in `search.ts` returns ranges
into the RAW label and must mirror `matchesTokens`' own token rules**, because `normaliseSearchText` is
not length-preserving: `&` becomes five characters, an apostrophe becomes none, `é` one from two. A raw
case-insensitive `indexOf` is the shortcut that silently highlights nothing in exactly the cases the
matcher was built for, so the normaliser is re-run one character at a time to keep an offset map, and a
change to `normaliseSearchText` is a change there too. **A row matched by a search TERM highlights
NOTHING** — the term is not in the label and may never be displayed, which is the same rule that keeps a
`treeitem`'s name computable. Two runs separated by nothing but separators are joined, so
`property and casualty` draws one phrase rather than three chunks. The mark is a `teal-200` fill plus a
weight step, never warm: orange has three roles here and a surface is not one of them.

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

**Dropdown order is derived from company counts**, with one exception: **`taxonomy.pinnedIndustries`**,
edited by a per-row toggle in the taxonomy editor — Retail and Consumer Packaged Goods sit in the leading
tier regardless of count, because ANSR expects enquiries out of proportion to dataset composition. Pinned
entries still sort by count inside the tier, so the list decides MEMBERSHIP and never position, and a
reorder of it is deliberately not reported by the diff. **A parallel list of names rather than a flag on a
restructured `industries`**: that list is a `string[]` companies, business types and the public dropdowns
all key on by value, so the schema checks the copy referentially instead. Keep the set short. Industry leads with the largest by count, HQ with the twelve largest, then alphabetical, as two
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
rule; **the logo strip must never imply those companies used this tool.** The strip has to read as a ROW
at every width: **32px marks and a 28px gap on a phone, 40 and 56 from `sm`**, because at the desktop pair
two marks filled a 375px viewport and the strip read as one logo sliding past. The band's own padding steps
with the mark — a shorter mark inside the old padding is the empty space the shrink was for.

**`--ansr-container-card` is a COMPOSITION token.** The hero copy and the card derive their leading edge
from the same box (`max-w-content px-6 md:px-12`, then `mx-auto max-w-card`), duplicated verbatim in
`ask-hero.tsx` and `peer-view.tsx`. Widening it moves the headline and moves the dot map's leading mask
fade with it. From `xl` the hero outdents by the card's whole margin and its lead takes
`--ansr-container-lead`; the two are gated on `xl` together, because widening the lead without shifting
left by the same step puts text on the map's visible field.

The form grid is **two equal columns, so there is exactly ONE interior boundary** — one column below `md`,
where the gap tightens to 16px because there it is only vertical rhythm and not also that boundary.
**THREE CONTROLS MEANS THE FIRST ONE SPANS THE ROW**: industry takes the whole first row, revenue band and
headquarters complete the second, and the submit spans both. A plain flow would leave the third field
beside an empty cell, which is the hole this layout keeps being rearranged to close. Two things depend on
industry being the field that spans — it is the primary match key, the hard boundary and the only control
with a second level, so it is the right one to widen; and its popup then needs no offset, which is why it
takes `wide="grid"` while headquarters, in the trailing column, takes `wide="column"`.

**THE PHONE STEP IS BUDGETED AGAINST A PHONE ON BOTH SURFACES, never derived from the desktop one by a
smaller multiplier.** What a visitor sees of the hero-and-card pair is `pb − pull`, the strip of band between
the lead and the card, so the shoulder and the pull only mean anything together: reducing both by the same
amount moves nothing and only changes how much of the card is drawn over the gradient. **`.gcc-hero-map`'s
`inset-block-end` is the PULL, per breakpoint** — one value for all three is how the phone band came to end
in 48px of dead gradient below a map that had already faded out. **Below `lg` the dot map is the DESKTOP
COMPOSITION AT A CLOSER CROP, and the crop is the only thing the mobile block may override.** A fixed `56rem`
frame with a `calc` trailing inset, so India resolves at the authored dot-to-pitch ratio at every width
instead of fusing into the lozenge a percentage zoom produced — and the MASK is inherited rather than
restated, at the project owner's instruction, because a phone-specific one (tighter vignette, a top hold, two
short fades in place of the long eased leading one) read as a different graphic rather than the same one at a
different width. **One value deviates: the opacity, 0.58 below `lg` against desktop's 0.86, and the CEILING
above it is measured** — on a phone the copy crosses the field's bright part and the mid-teal dot LIGHTENS the
ground under white ink, so a darker band is a LOWER opacity, 0.66 is the highest value that clears the 4.5:1
body floor with a margin antialiasing cannot eat, and 0.78 fails outright. One opacity for phone and tablet
alike. **The trailing inset puts India at 76% of the band, within a point of desktop's 75%, and the bound it
moves toward is the CROP** — the trailing mask fade completes off-screen at every phone width, so nothing but
the crop keeps the graphic from ending in a vertical rule. Both numbers and the full measurement table: the
block in globals.css. The impact band is TWO COLUMNS from the base, not from `sm`
— every phone in portrait is under 640px, so five stacked figures cost 95% of a viewport on evidence about
ANSR rather than about the visitor.

## Both result screens — one floating card on a dark ground

The teal context band is full-bleed; everything below it, to the end of the document, is inside a single
card that overlaps the band's foot and floats on the flat inverse teal. **The view switch is that
card's top row.**

- **The card is SOLID, not glass.** A hairline ring drawn as a `box-shadow` layer, two shadow layers at
  very different spreads, and a radius one step above every panel inside it. The `--ansr-shadow-*`
  tokens cannot supply it — they are fitted for a light surface and this ground IS teal-deep.
- **NOTHING WHITE MAY SIT BEHIND THE CARD'S BOTTOM CORNERS, and matching the close band's radius to the
  clip is not enough on its own.** A white layer paints the corner at the clip's antialiased coverage
  while the band's dark fill paints it at roughly the square of that coverage, and the difference is a
  light arc. So `ViewPanel` draws NO ground — its `bg-surface` was redundant, every `Zone` painting its
  own — and `.gcc-result-card` carries the band's fill across its bottom radius as a background layer.
  Measured at deviceScaleFactor 4 against the straight bottom edge, which is the ring alone: 123 and 131
  to 46 and 44. A new layer between the card and the close inherits this rule.
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
- **The band's ONE ornament is the entry point's dotted world map, at EVERY width, and it is the only
  thing drawn on the band.** Held back by opacity and faded out over half the band's height; below `lg`
  the frame is the hero's own fixed `56rem` rather than a percentage, which is what makes the dots
  resolve there. Two layers were retired to get there, both at the project owner's instruction, and
  neither may come back without the map giving up a width: each screen's brand MOTIF, which existed only
  for the widths the percentage frame could not serve — with it went `HeaderMotif`, both motif constants
  and `.gcc-hero-diagonal` / `.gcc-rings` — and the leading-edge dot LATTICE, which was a second dotted
  texture at a second density and, on a phone, the band's only graphic. **No blur on THIS band, at ANSR's
  request**: quieten it with opacity and the masks, never with a filter. That is scoped to the header
  band's map, which read as a low-resolution copy of the entry point's when blurred; the close's backdrop
  is a different graphic doing a different job and is blurred deliberately.
- **The card's top edge is where the selected tab meets the content**, same fill by construction. A line
  across that joint means something added a border.
- **A PHONE TAKES A STEP OFF EVERY CONTAINER, and it is the ACCUMULATION that pays for it rather than any
  one band looking tight.** `Zone` is `px-5 py-6` below `sm` against `px-6 py-8`, a `Panel` `px-4` against
  `px-5`, and a card or block heading is one step down (18/20/24px, 20/24/30 on `lead`). Six zones on the
  peer view turn 32px of block padding into 384px, and padding is read as a proportion of what it
  surrounds; the inline step goes the other way, buying back the 8px of MEASURE every narrow thing on these
  screens is competing for — a ranking row's tags, a figure cell, the map's own labels. A heading steps
  because the figures do: its size was chosen as a RATIO under them.
- **A FIGURE INSIDE A CARD STEPS AT `sm`, AND TWO FIGURES THAT ARE ONE QUANTITY STEP TOGETHER.** The
  comparison card's headcount band and the ranking's are 18/20/24px in one decision, on the argument that
  already gives them one label key; a milestone duration is 16/18. What does NOT step is a BAND's own display
  figure — the snapshot's four, the summary row's, a card's primary value — each of which is the thing its
  neighbours were sized against in the first place.

**The band carries three things:** `ANSR ATLAS` as the `h1`, the finding as a non-heading
display line, and the visitor's three answers as pills with one "Edit answers" button.

**The `h1` is the FULL LOCKUP — mark and wordmark — AND IT IS THE WAY HOME.** `ansr-logo-on-dark.svg`,
used literally, sized off the WORDMARK's cap height rather than the artboard (letters occupy 37.9 of the
file's 91 units, so 1.7em matches the display face's cap height). **The second half reads `ATLAS`, at
ANSR's request** — "GCC Intelligence" named a category directly above a finding line that describes the
screen, so the `h1` and the sentence under it did one job twice and neither was the product's name. Caps,
matching the entry point's headline, because a title-case word beside all-caps drawn letters reads as a
caption on the mark. No typed period.

**AND IT IS DRAWN, NOT TYPED — `AtlasWordmark` is the one piece of that markup, with two consumers.**
A supplied outline, the plate and the REGISTERED MARK removed and `fill="currentColor"` applied, and
nothing traced or refitted. Four things hold it together. **It is sized off the ANSR MARK BESIDE IT rather
than off the type, and the two sites therefore draw it at two sizes** — the numbers are measured by
rasterising and scanning ink, never read off path coordinates, because a traced outline's control points
sit outside its ink and both marks' S overshoots the cap line. Its caps are the box's 0.95125 fraction, so
the component's own `0.749em` puts them at 0.712em, matching the entry point's wordmark; **the result
screens step it to `0.717em` and the gap to a word space (`ms-[0.25em]`), at the call site**, because there
the brand half is the FULL lockup — ATLAS is the wider and heavier run and reads as the larger of the two
beside a circular mark that dwarfs the letters, so cap parity is the wrong target and the entry point's own
0.9641 ratio is the right one. Both numbers are `em` so they hold across the 24/30px step. Rejected
alternatives, including growing the lockup instead: style lock. **The `viewBox` is a crop and the contours keep the supplied
coordinates**, so what ships stays comparable to what was supplied. **The box is vertically SYMMETRIC
about the cap band**, which is what makes `items-center` land it on the lockup, and it is a FRAGMENT rather
than a wrapping span, because a span's own strut re-positions the mark inside the centred item. And the
accessible name is unchanged — the image's `alt` plus a visually hidden word, so both halves are drawn and
the `h1` still computes "ANSR ATLAS". **`ProductIdentity.onHome` wraps the lockup in a button and both screens pass it**: it is the only
route to the entry point now that "Edit answers" is a disclosure, so its accessible name stays the product
name and the destination goes in `title` — an `aria-label` there is read into the `h1`'s own name by
name-from-content and would put an instruction in the outline.

**Both screens carry the finding line, as a matched PAIR of CONSTANTS in `HEADER_LINES`** — "How your
industry operates in India" and "The India market beyond your industry". **Neither states a COUNT** (a
denominator belongs on the count line under the grid, which states it exactly) and **neither
INTERPOLATES the industry** — `HeaderFinding` is capped at `--ansr-container-lead` and sets at 48px, so
past ~36 characters it wraps, and a two-line band beside a one-line band is the height jump this pair
exists to remove.

**The answers are read-only pills with no hover state, and one button labelled "Edit answers" in
the SAME wrapping row, immediately after the last pill.** The button is the SIZE of a pill; the 44px
target is expanded off-screen by `.gcc-context-edit::after`, 7px top and bottom, with
`inset-inline: 0` — never a negative one, because the row's `gap-x` is 8px and a press landing on a pill
does nothing while feeling like a miss. **`.gcc-hit-44` is that expansion generalised, BLOCK-ONLY for the
same reason, and the answer editor's own Close pill is its other consumer** — the caller supplies
`position: relative` and a 30–32px control, so it cannot be dropped on anything and be assumed correct.
Industry, headquarters, revenue band. **THREE pills, and the fourth was the company name** — it was
conditional on the one field a visitor could leave blank, and it went with the question; `pillCompany` was
deleted rather than left as a label for a pill that can never render.
**BELOW `md` THE PILLS ARE READ BUT NOT DRAWN, at the project owner's instruction, so the row draws the
button alone.** The pills wrapped to three lines at 390 to restate what the visitor chose thirty seconds
earlier, on the one band they meet before any evidence. The markup is identical at every width and the
group keeps every member: the media query on `.gcc-context-pill` is the sr-only treatment, never
`display: none`, so nothing leaves the reading order — and it is done on the class rather than with
`sr-only md:not-sr-only`, which would leave `not-sr-only`'s `padding: 0` and the pill's own padding
fighting on generated order.
**"India today" is not among them and must not be**, and neither is a company name: the tool must echo
back only what the visitor actually answered.

**"EDIT ANSWERS" IS A DISCLOSURE, NOT A NAVIGATION, at ANSR's request, and this REVERSES the rule that
the pills' one control goes to the form.** It opens `AnswerEditor` — the entry point's own `InputPanel`,
one label swapped via `submitLabel` — and the correction is applied to the screen the visitor is standing
on. The pills themselves are UNCHANGED: still read-only, still no hover, still one control in the row. Six
things hold it together. **The panel is a SIBLING of the band, in `ResultSurface`'s `editor` slot, never
among the band's children** — `.gcc-result-band` is `overflow: hidden` because it clips the map, so an
editor inside it has all four dropdowns cut off at the band's foot. It takes
the CARD's own negative pull and the card drops to a plain top margin, so the surface's silhouette is
unchanged and only what sits in the notch differs; `z-20` is what lets its popups overhang the card. It is
on WHITE, because every control in `input-panel.tsx` was measured on the form card's fill and none of those
measurements survives a teal gradient. **`tool.tsx`'s `refine` carries the phase KIND across** where
`submit` always lands on peers — a correction made from Screen 2 must not move the visitor to Screen 1 —
and it does NOT push a history entry, the answers having changed while the screen did not. `onApply`
resolves to whether it worked and the panel closes only on success, so a failure keeps the error in front
of the visitor; Screen 1 also closes it by remount, Screen 2 cannot be keyed on the input because that
would throw the visitor off their function tab. And the button carries `aria-expanded` and `aria-controls`,
which a navigation had no use for. **The band still collects nothing** — same four controls, same five-field
contract, no new field, and no free-text input on either surface.

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
objects is pressable. **ONE EXCEPTION, at the project owner's instruction: the Fortune badge pops to
1.6 on hover**, via `.gcc-badge-pop` in `globals.css`, so it applies at both of `FortuneBadge`'s
placements. Transform only, so no row can grow; gated on `hover: hover` and on `no-preference`, both on
`.gcc-lift`'s reasoning. It is for LEGIBILITY, not affordance — at 16px the mark reads as a red `500` —
so there is no tap or focus variant and none may be added. **A COMPANY MARK POPS TOO, at 1.12 via
`.gcc-mark-pop`**, set in `CompanyMark` so both placements share one scale. **The two ratios differ
because a ratio is not a distance**: 1.6 on a 112px logo adds 34px a side and leaves the card, and 1.2
was measured leaving 2.3px between a ranking row's mark and the name. Any change to either number is
re-measured against the comparison card's 16px padding and that row's 10px gap. Nothing else on this
surface may take a hover. **It was a `motion` `whileHover` for one pass and the dependency is REMOVED** —
40KB gzipped, measured, for one hover; CSS keeps the values on the tokens where `brand_lint` can see
them, is reached by the global `reduce` clamp a scripted transform is not, and keeps the file a server
component.

**Section headings are 20/24px Bold with `tracking-display`**; the band's finding is 30/38/48px Light;
the `h1` lockup is 24/30px. **The three headings that contain a drawn wordmark stay Medium 500 with
`tracking-body`** — the ask hero's, the impact band's, and `ProductIdentity` — measured off the mark's
stem (0.137 of cap height) rather than chosen.

**SNAPSHOT — four figures before any card begins.** Every one is a property of the INDUSTRY: company
count, mean centre size, spread of cities, leading city. It **introduces no figure a card does not
evidence**, holds four cells whatever the result, and says "Data unavailable" rather than a dash, a zero
or an estimate. The SECTION HEADING carries the industry (`snapshotHeading`) and **no label does**.
**Never "GCC's".** **THE HEADING IS DRAWN `uppercase` AND THE PLURAL `s` IS EXEMPT FROM IT** —
`withCasedGccPlural` in `snapshot.tsx` returns the token to `normal-case`, because a full-caps transform
makes the s a fourth initial and the eyebrow reads "GCCS", which is the same corruption as "GCC's" arriving
from the presentation rather than the copy. Still a literal token on `withBrandMark`'s argument, the heading
being admin-editable and there being no position to slice at. **The match is CASE-INSENSITIVE and the output
is always the canonical `GCCs`, and both halves are load-bearing**: it matched literally while the published
heading said "GCCS", so the exemption was a silent no-op and the eyebrow drew the corruption the mechanism
exists to prevent. So the drawn line and the accessible name now agree on the house spelling whatever an
admin types — and the datum is corrected too, pinned by a unit test over the whole copy block, because a
tolerant renderer is not a reason to store the wrong spelling.
**TWO COLUMNS ON A PHONE, four from `lg`, and every size steps at `sm` as well as
`md`** — one column drew four full-width rows of a desktop-sized numeral beside an empty half-measure, and
the four cells are a SET whose point is that they are properties of one industry, which is something a
reader sees by seeing them together. 2×2 is the only arrangement of four symmetrical at both ends.

**ALL FOUR LABELS ARE SENTENCE PREDICATES COMPLETING THE FIGURE ABOVE THEM, at ANSR's request** — the
shape the terminating scale strip has always used, where they were noun phrases naming the measure. So
the three published caps are 56 rather than 32, and the labels are read as "189 / companies in this
industry have a GCC in India". Three consequences hold together. The opening cell is a COUNT of
comparable centres — never "Comparable GCCs", also at ANSR's request — still COMPOSED over the visitor's
scope, reading `businessType.count`, the population the PEERS came from, or `industry.total` where no
sub-industry was given, because any other population disagrees with the five cards below it. **The other
three name the INDUSTRY and must never name the sub-industry, and ANSR asked for the sub-industry on
two of them**: the city count and the leading city are both read off `view.map`, which is filtered to
`input.industry`, so "your sub-industry" or "peer GCCs" would name a population the figure was not
measured over — the labels say "your industry" and "these GCCs" instead, and specs assert both. The
same correction is on `mapTitle`. Zero renders "Data unavailable", so the share's
`<1%` special case is gone with it. **`industry.shareOfIndia` is still derived and is now rendered by nothing**; if it comes
back, it is computed in the view model over one population, never as `industry.total /
scale.companyCount`, which counts two populations differing by one. The leading city takes the same
orange as the three figures, one size step down, with no `tabular-nums` and no `tracking-display`. A unit
is a field (`Signal.suffix`), set two scale steps under the figure — never a fraction of an em.

**1. Up to five comparable companies.** ONE ROW, one column per peer, column count = peer count capped
at five. Two columns between `sm` and `lg`, one below, odd last card widens. No packing — nothing wraps.
Each card carries its employee band at 18/20/24px. **THERE IS NO ORDINAL ON A CARD** — left-to-right
reading position states the order, so restoring a multi-row grid means restoring an ordinal with it. Labels
are "GCC headcount", "Cities" and "In India since {year}"; only the figure names the GCC. No bars, no axis
note. **Headquarters is not shown and the field is dropped with the column.**

**THE CARD'S INTERIOR IS A COLUMN AT THE WIDTH IT IS DRAWN AT AND TWO CELLS ON A PHONE, where the card
takes the WHOLE measure.** `.gcc-peer-facts`: the figure and the year share a line, the city list keeps the
full measure, nothing is removed and the DOM order stays figure, cities, year. **Which fact pairs with the
figure is MEASURED** — two city chips and an overflow pill are ~176px, so pairing the list wrapped it to
three lines and made the two-column card taller than the column it replaced. It is a media query with a
LOWER BOUND rather than a utility: a cell has to hold a 112px band and a 116px year line, so two columns
need 248px of card and a 320px viewport gives 200 — below `23rem` the flex column renders unchanged.

**THE HEADING NAMES NO COMPANY AND IS ONE FLAT PUBLISHED KEY — "GCC details of your closest peers".** It
interpolated the visitor's own company for one pass, as a template plus a `peersTitleFallback` for the
majority who typed nothing; the field is gone, so there is one branch and one key and the fallback is
deleted. `peersTitle(view, copy)` in `screen1/copy.ts` keeps its unused `view` parameter so all seven call
sites are untouched. Two rules survive the collapse. **"GCC details" is the load-bearing half** — the cards
carry a headcount, a city list and a start year, facts about the CENTRE, and this is the only place on the
block that says so. And **never "closest to yours"**, which presumes the visitor already runs an India
centre when `gccStatus` is a constant the form never asks for; asserted in both suites.

**THE SHORT-SET LINE IS DRAWN ABOVE THE CARDS, under the heading, at ANSR's request.** `shortfallLine`
led the block from below for every earlier pass, which meant a reader met a short grid, counted it, and only
then found the reason few companies clear their own sub-industry. Read first it is a call-out. Three things
hold together. **The published branch's wording moved with the position** — `peersNarrowNote` closed on "the
closest comparisons above" and now points forward at the cards, so a move here is a copy edit and not only a
JSX one. **The COUNT line stays under the grid**, because it states what the grid shows, which is also what
keeps the count stated exactly once and this sentence free of a number. And the position is asserted by
GEOMETRY rather than DOM order, a CSS reorder being how a block reads wrong while its markup looks right.

**`company.domain` IS THE IDENTIFIER A MARK IS SOURCED BY, AND IT IS `.optional()` RATHER THAN
`.default("")`.** A defaulted string is written back on every publish, so it would put `"domain": ""` on all
1,834 companies — an unreadable diff on the file whose reviewable diff is why there is no database. So a
blank is stored as `undefined`, never `""`: `sameValue` in `diff.ts` compares through `JSON.stringify`,
where those two differ, and an editor emitting `""` would report every company as changed. `domain` is in
`COMPANY_FIELDS` on the `businessTypes` lesson. **`canonicalDomain` reduces and `DOMAIN_PATTERN` validates,
both in `normalize.ts` and deliberately separate** — that split is what lets the bulk import report "this
row was cleaned" apart from "this row is wrong", and it is why a pasted browser URL is accepted in admin.

**A BULK DOMAIN PASS GOES THROUGH `scripts/domains.ts`, NEVER THROUGH A HAND EDIT OR A ONE-OFF MERGE
SCRIPT.** Three modes: `domains:template` writes every company's id and name to `data/domains.csv`,
`domains:merge --from` fills that template from an arbitrary name-and-domain file, and `domains:import`
reads it back — **dry run by default, `--apply` the only thing that writes** — refusing the whole file on
one bad row. **`merge` matches on exact name, then on case and whitespace folded, and NEVER fuzzily**:
three names are ambiguous across two companies each, 22 contain a comma, and legal suffixes are stored as
supplied, so anything unresolved is written to `data/domains-unmatched.csv` for a human to place by id. A
miss costs a lookup and a mismatch costs trust, so it errs entirely towards missing. Four guards, each
covering a way a spreadsheet corrupts silently: the header is checked literally, an unknown id is refused,
**the name column is compared against the dataset's own so a row-shifted or re-sorted file is caught before
it puts one company's domain on another**, and every company must have a row so a truncated export cannot
read as a clean partial import. A shared domain WARNS and never blocks — subsidiaries legitimately share
one. `data/domains.csv` is a transient working file and is not committed.

**A REAL COMPANY MARK IS PERMITTED ON A PEER CARD, at the project owner's decision.** What stays banned is
everything that was never the ask: no initial, no monogram, no coloured square with a letter, no drawn
placeholder of any kind. **`CompanyMark` IN `evidence.tsx` IS THE ONE PIECE OF MARK MARKUP, with two consumers and two sizes.**
`md` on the comparison card, where the mark sits ABOVE the name and introduces the card; `sm` on a
largest-centres row, where it LEADS the row before the name and must stay smaller than it, the row's
subject still being the company. Every rule the mark obeys lives in that component — `alt=""` because the
name is always the adjacent heading, and both a height AND a width cap with `object-contain` on the customer
strip's measurement, and `shrink-0` — never on a wrapper at a call site. **`self-start` is scoped to the
CARD sizes**: on a flex column it resolves on the inline axis and is what lets the width come from the
ratio, and on a ranking row it would resolve on the block axis and top-align the mark against a line that
is deliberately centred. **A COMPARISON CARD RESERVES THE MARK'S HEIGHT WHETHER OR NOT ONE RENDERS, at the
project owner's instruction, and this REVERSES the earlier "nothing reserved" rule** — five cards on one
row are read across, so an unmarked card put its name, figure and every row beneath it a mark's height
above its neighbour's. **The reservation is scoped to `sm` AND UP, because that is where a row exists**: on
a phone the grid is one column, so no two cards share a horizontal band and the reserved band is 28px of
blank opening every unmarked card. **What is reserved is SPACE and nothing else**: no fill, no border, no
hatch, so it reads as air rather than as a slot that failed to load, which is what keeps the banned
placeholder banned.
**THE RESERVATION IS `CompanyMark`'S JOB, SO NO CALLER MAY GUARD ON `markUrl` BEFORE CALLING IT** — the
ranking row did, and the guard cannot see the case that actually happens: a URL that resolves and then
FAILS to load leaves the component returning null and the caller's wrapper standing, so a zero-width flex
item plus the row's own `gap-x` indented the name of every company with a domain. The
**A LAYOUT CHECK FOR THE MARK IS WORTHLESS ON A DEV SERVER WITH A CLIENT ID SET, and `.env.local` sets
one.** With the tier on, every company with a domain gets a URL and a failing request lands on the same
branch as no mark at all, so any bug in the no-mark branch is invisible — that is how a missing slot
reservation once survived a browser check. Run one with the var blanked, on its own `GCC_DIST_DIR`, and
revert `tsconfig.json` afterwards because `next dev` rewrites its `include` too.

**A ranking row reserves NOTHING** — its mark leads one line, so reserving would indent an unmarked
company's name past its own bar. Reserving it, to buy one name column while twenty companies carried a
committed mark, was tried and reverted with the marks themselves. **A mark that FAILS TO LOAD takes the same branch as a company with no
domain, decided in the browser** — the resolver cannot know whether the provider holds a brand, so the
element is dropped on `error` AND on a mount that finds `complete` with a zero `naturalWidth`, the SSR
case a replayed handler misses; left in place, the browser draws its own broken-file glyph, which IS a
drawn placeholder. **The FORTUNE BADGE sits on the name's
own LINE in both blocks**, at the project owner's instruction: a row of its own put a card with one three
cells deep before its figure. Both placements take `items-center` or `self-center` rather than a baseline,
because an image's baseline is its bottom edge and the badge would otherwise read as having slipped a line.

**`company-mark.ts` IS THE ONE RESOLVER AND THE COMPONENT DECIDES NOTHING.** `resolveCompanyMark` returns
a finished URL or null, in a fixed order — a committed mark first, then a Brandfetch
hotlink, then nothing. `PeerCard.markUrl` carries the URL and **`domain` is deliberately not on the card**,
so no component can build its own URL; the exhaustive key list in `screen1.test.ts` is what keeps that
deliberate. **Null is ROUTINE, not exceptional** — twenty companies have a committed mark, the provider
resolves 86–95% of the rest, six companies carry no domain, and the provider tier is off entirely without a
client ID — so the name-alone card is load-bearing
and holds the mark's height open with an empty band and NOTHING drawn in it. A real mark takes `alt=""`, because the company
name is the very next element and naming it twice is the accessibility defect.

**THE COMMITTED TIER IS BUILT AND WIRED AND DELIBERATELY EMPTY.** `COMPANY_MARKS` in `company-marks.ts`
maps a company `id` to a served path and `uploadedCompanyMark` is what `toCard` passes as the resolver's
first argument; the table holds nothing, so every company falls through to the provider. Twenty entries were
added and then removed at the project owner's instruction — the layout reason is below. It is a CODE table
rather than the `logo-manifest.json` that was pencilled in, so the one-file rule needed no exception, and
four rules hold for when entries return. **It is CODE on `COMPANY_NAME_FIXES`' argument**: the entry is
worthless without the FILE and the file is a commit, so an admin-editable table could name a mark that is not
served — and that failure is INVISIBLE, because a missing mark is the routine branch and reports nothing.
**There is no admin UI for it and that is deliberate**; admin's logo picker belongs to the customer strip,
where the files are already served and the only choice is which appear. It is keyed by `id`, never by name,
company names not being unique even case-folded. **ONE FILE PER TRADEMARK: a top-level path points into
`/logos/` where the strip's own copy lives**, on the lesson `public/badges/` records — a second copy is how
two placements start drawing different marks; `/logos/companies/` is the home for a mark whose company is NOT
in the strip, and the strip's `src` pattern excludes the subdirectory so such a file can never imply a
customer relationship. `tests/unit/company-marks.test.ts` asserts all four against whatever the table holds,
including that it is empty today.

**THE BOX IS A HEIGHT CAP PLUS A WIDTH CAP, NEVER A FIXED PAIR — and the whole peer-mark layout depends on
the provider normalising the artwork for us.** A provider mark is letterboxed into the box `MARK_BOX` asks
for, so every mark arrives at ONE ratio whatever the brand's own shape is, and `CompanyMark` only has to stop
it exceeding the space: `h-7 max-w-28 md:h-8` on a card, `h-5 max-w-20 md:h-6` on a ranking row.

**COMMITTED FILES BREAK THAT ASSUMPTION, WHICH IS WHY `COMPANY_MARKS` IS EMPTY.** A file cropped to its own
ink carries the ARTWORK's ratio — 0.78:1 to 5.18:1 across the twenty-two served — so with height capped and
width free the footprint ran 25px to 112px, a wordmark covered 4.5x the ink area of a stacked mark, and on a
ranking row, where the mark leads the name, every row started its name at a different x. **Four fixes were
built and all four were reverted, at the project owner's instruction, because each cost more than it bought:**
a fixed 2:1 slot (uniform footprint, but narrow marks floated 35px from their own name); trailing-aligning
the ink inside that slot (constant gap, but a ragged leading edge); reserving the slot on every ranking row
(one name column, but every name indented past its own bar and unmarked rows showing a hole); and a drawn
rounded TILE with the logo centred in it (genuinely uniform, but only where a logo EXISTS, and the size a
tile needs to be legible pushed the rows taller). **So the rule is: a committed mark must be letterboxed to
the resolver's own box BEFORE it reaches the table, or the placement has to be redesigned around variable
ratios.** Until one of those is done the table stays empty and the peer sections draw from the provider.

**RESAVING A LOGO AT A DIFFERENT PIXEL SIZE CANNOT FIX A FIT PROBLEM.** Every mark is drawn with a definite
CSS height and `object-contain`, so the file's pixel dimensions are scaled away and only its RATIO survives —
a 128px file and a 512px file of the same artwork render identically. Fit is a property of the BOX, and what
a file genuinely can be wrong about is its ratio, which is why `logo:crop` measures ink bounds and why
`DEFAULT_LOGOS` records them. Letterboxing onto a fixed canvas changes the ratio and IS the exception.

**THE TIER IS OFF UNLESS `NEXT_PUBLIC_GCC_BRANDFETCH_CLIENT_ID` IS SET, and off is the safe default.**
Unset means no third-party request, no extra CSP origin and every card on the name alone. `NEXT_PUBLIC_`
by necessity — the value ships inside an `img src`, which is the provider's own specified usage — so it is
config, never a secret, and never committed. **The public `img-src` is DERIVED FROM THE SAME VAR** in
`next.config.ts`, so the origin is allowed only while the tier is on and switching it off needs no second
edit. Nothing in this repo ever fetches a mark: their terms permit the embedded link and forbid
retrieval. **`/fallback/404` is a path segment and `lettermark` is banned** — see `docs/traps.md` for both,
each measured.

**THE BROWSER SUITE PINS THE TIER OFF, in `playwright.config.ts`'s `fixtureEnv()`, and that is not a
convenience.** `next build` reads `.env.local`, so a developer setting a client ID to see marks locally
silently turns the suite into a test that makes five third-party image requests per peer render — measured
at 7.7 minutes for the public project, and in a combined run the contention pushed twelve unrelated
`0-search` specs past their timeouts while all twelve passed in isolation. A suite whose result depends on
a third party's latency is not deterministic and its failures name the wrong specs. **The peer-card
assertions therefore check the SHAPE of what may render, never a count**, so they hold in both states; a
real mark is verified in a browser, which is the only place the provider serves one anyway.

**THE CUSTOMER MARKS ARE CLEARED FOR USE, at the project owner's confirmation: they are ANSR's own
customers.** That clearance is what lets all twenty-two ship in the strip. **It does NOT extend to the
provider tier**, which would resolve a logo for any of the 1,834, most of whom ANSR has no relationship
with — so that tier carries its own decision as well as its own client ID. **The Fortune badge is also
outside the clearance and still open** — Fortune's own guidance is that logo use needs written approval
through PARS International, and a grant is normally to a LISTED company promoting itself rather than to a
third party describing others.

**THE CONFIGURED CLIENT ID IS BEING REJECTED, so the peer sections currently draw no marks at all.** Every
`cdn.brandfetch.io` request 302s to the provider's own hotlinking guidelines, measured against three
referrers and identically with no id at all, and the browser then blocks that redirect under the public
`img-src`. So the tier is ON in `.env.local` and returns NOTHING: `markUrl` resolves, the image fails, and
`CompanyMark` collapses to the no-mark branch. That is why the peer sections look the way they did before any
logo work — the name-alone card is what has been shipping. Read a mark that will not render as this before
suspecting the card.

**THE INDEX MEMBERSHIP IS FORTUNE'S OWN BADGE, NOT AN ACCENT CHIP, at the project owner's instruction.**
`FortuneBadge` in `screen1/fortune-badge.tsx` is the one component and the one place the SIZE is decided,
because the two sites that draw it — the comparison card and the largest-centres ranking row — state the
same fact about the same kind of company and must not drift. **16px, set by the CAP HEIGHT of the name
beside it and never by the artwork**: 40px sized off the badge's own wordmark and 24px matched to the
`sm` chip's box were both rejected as too big. **The cost is that `FORTUNE` and `GLOBAL` stop resolving
below about 20px and the badge reads as a red `500` mark** — accepted, and it is why `alt` carries the
index name here while the company mark two elements above it takes `alt=""`. On the ranking row the
wrapper takes `self-center`, because an image's baseline is its bottom edge and the row is
`items-baseline`. **THE TWO BLOCKS NOW DIFFER ON THE UNIVERSAL CASE, and the difference is the whole
decision.** The comparison cards keep `showFortune`: universal, it is one SENTENCE under the grid. The
ranking has NO suppression at all, at the project owner's instruction — the badge draws on every row that
carries the membership. `allFortune` is deleted rather than left unread. What made a badge on every row
the banned shape was that it was an accent CHIP repeated five times and then restated in a sixth line;
with the chip now Fortune's own 16px badge and that line gone, suppressing it would leave the universal
case stating the membership nowhere. **On the ranking row the badge shares ONE flex item with the overlap
marker, so the two wrap together** — below `md` the badge otherwise broke onto a line of its own at the
leading edge, where a bare red `500` reads as a stray graphic rather than as that company's
accreditation. The asset is a VECTOR supplied by the project owner,
cropped from its empty 2000×2000 artboard to the lockup's own bounds, 0.96:1. **Nothing is ever TRACED**
— the outlines and the supplied file's own transform are carried over verbatim, because the numerals are
Fortune's artwork and tracing them would be hand-authoring a trademark.
**A public spec asserts the peers band's only NAMED image is this badge**, which is the narrowed form of
the old blanket "no named image" count.

**THE COUNT LINE UNDER THE GRID ENDS IN AN ARROW THAT JUMPS TO THE CLOSE**, at ANSR's request.
`JumpToClose` in `evidence.tsx`, inside the paragraph rather than beside it, so it reads as the end of
that sentence — in INLINE flow and never as a flex item, because a wrapping flex row makes the sentence
one item and the arrow another, which strands the arrow alone on the next line at every phone width; the
32px of ink takes a negative block margin so it overhangs the line rather than growing it. Four things: it is `--ansr-action` at 3.4:1 on the zone's WHITE ground and may not be
lifted onto the mint, where the same orange is 2.63:1; it is the CTA role, which is the only orange this
zone spends; 32px of target rather than 44, because a 44px box inside a 20px line box pushes the
paragraph's two lines apart, and 32 clears the 24px floor; and `behavior` is `smooth` only when the
visitor has not asked for less motion. **In the EMBED it does nothing** — a frame sized to its own content
has no scroll of ours and the host page's is cross-origin — so making it work framed is a second message
in `use-frame-height.ts`'s protocol plus a listener on ansr.com, not a change to this file. It is not the
banned scroll logic: it reads nothing and reports nothing, and writes once in response to a press.

**2. The industry count, as three OVERLAPPING layers on one z-stack** — national base, industry inside
it, and inside that either the visitor's sub-industry or the comparison set. **Always three layers.**
Layers step down from a shared top edge so each label owns an exposed band. **A LEADING CORNER IS ROUNDED
ONLY WHERE IT BELONGS TO THE STACK RATHER THAN TO A LAYER INSIDE IT** — every bar shares the leading and
bottom edges, so their bottom-leading corners coincide and round into one, while the stepped TOP edges put
an inner layer's top-leading corner mid-stack where a curve cuts a notch showing the fill behind. So
`--back` keeps that corner and every other layer squares it, flush to the shared zero, which is the axis
rather than the end of a mark. **The block closes on `copy.industryBasisNote`**, 12px muted, in `CardMeta`'s
treatment: the outermost layer is every GCC in the dataset, so the one figure a reader can take for a
national total states what it was counted over. **It names the SCOPE and never the uncertainty** — the tool
does not narrate its own integrity, so "indicative, drawn from the GCCs ANSR tracks" and never "figures are
approximate". Editable, and `nonEmpty` is the guarantee that matters: the sentence can be reworded and
cannot be emptied, so the qualification is on the page whatever it says. Not a divided bar — the
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
exists. **A COMPACT RANKED CHART, not a list of company cards.** A row is the `sm` company mark, name, figure,
full-width bar, plus city and year as `sm` pills. There is no position numeral — the bars are sorted by
the quantity they encode, so row one is full width and position reads off the bars. **A ROW IS A GRID OF
NAMED AREAS — `.gcc-rank-row` — WITH TWO ARRANGEMENTS, and neither is a wrap.** From `sm`: name, then the
tags sharing a line with the figure, then the bar. On a PHONE: the figure moves up to the NAME's line and
the tags go under the bar, because at 375 the tags alone take two lines, so the figure wrapped under them
— three lines below the column header that names it and two above the bar it is the value of. Areas rather
than `order`, so the reading order is name → tags → figure → bar at both widths; one DOM tree, so no
figure is in the accessibility tree twice. The trailing column is `auto`-sized, which is why the figure
needs neither `ms-auto` nor `justify-between` any more: a column cannot wrap. **24px between rows, 8px
from the name to the line under it, 4px from figure to bar** — a grid has ONE row gap, so 4px is the gap
and the item opening the second group carries the other 4 as a margin; the name takes `leading-tight`. The
figure is the comparison card's treatment, 18/20/24px in the heading teal, and the two step together at
`sm` because they are one quantity. **BELOW `sm` THE OVERLAP MARKER AND THE BADGE TAKE A LINE OF THEIR OWN**
(`basis-full` on their shared flex item), so the badge has ONE x on every row: flowing inline after the name
its position was wherever that name ended, and where the name wrapped it broke to a third line anyway — five
rows, five offsets, two depths. It costs no line for the FIGURE, which drops to the bottom of the name block
under `align-items: end` and lands beside that line, still directly above its own bar. **The BADGE leads that
line and the marker is `whitespace-nowrap`**, both because one x means one: marker-first put the badge at the
leading edge on a row outside the peer set and 156px in on a row inside it, and a marker wrapping to two lines
moved it again between phone widths. `order` is paint order only, so the DOM stays marker then badge and the
reading is unchanged; from `sm` the group flows after the name, marker first. **One small-caps
COLUMN HEADER names the quantity** ("GCC headcount"). **THE NAME LINE IS `items-center`, NOT `items-baseline`, and no item on it carries
`self-center`** — the mark is the tallest thing on that line, so it sets the line's cross size and
centring it there was a no-op while the name, as the max-ascent baseline item, sat flush to the cross
start with its cap midline above its box midline. Measured: 2.27px of drift between the mark's midline and
the name's, down to 0.63px, which is the face's own ascent/descent asymmetry and is not correctable
without a magic number. Bars run the FULL WIDTH and no row is drawn a step darker. **The BLOCK CLOSES ON NOTHING but
`largestShortfallLine`, which renders only where it fires.** `largestOverlapLine` is exported, unit-tested
and rendered nowhere, at ANSR's request; the per-row **"in your peer set"** marker — the product's word,
not "comparison set" — states the overlap one row at a time, which is every quantity the sentence had.

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
Fill is `--ansr-surface` on the mint zone, no border. **A tag is 12px in a tighter box below `sm`, at the
project owner's instruction** — a membership marker at caption weight, and at 14px almost every item took a
line to itself, which made the one block claiming nothing the tallest thing on the phone's peer view after
the map. **The shipped set is written to a 16-to-28
character range so no item decides the layout**, and the schema caps an item at 32 and the list at 12 —
the set wraps as one row with no column count, so an item much longer than the rest is the one that
decides the layout. The section heading carries the basis: "Common functions run
from the India GCCs" is a claim about India GCCs at large and cannot be read as one about the companies
above it. **"Common" is the word doing that**, so a reword has to keep it, and no possessive may tie the
list to the grid — asserted.

**`PeerCard.sizeShare` is the single definition of a headcount-midpoint ratio** — honest as a bar's
length, never as a published figure, always against the largest member of the set that card came back in.
The two Screen 1 blocks that compute it are scaled separately. The visible figure stays the band.

## Screen 2 — Function View

Tech, Operations, HR, Finance — **content-width cells at EVERY width: `justify-between` and 12px labels on a
phone, a wrapping flex row at the full size from `sm`.** The equal-width `grid-cols-4` that sat between them
is gone at the project owner's instruction: it fixed the ragged two-line wrap and put "HR", 16px of ink, in a
68px cell under a 68px selected rule, so one tab in four read as a short word floating in a slot and the
indicator named the cell rather than the word. **What wrapped the original row was the PADDING, not the
labels** — the four are 180px of ink at 12px against a 224px strip at 320, and `px-5` a side added 160. So
the cells take their own width and the slack is distributed; `min-w-8` is the only thing the padding was
still buying, holding "HR" to a 32px target above the 24px floor without widening the other three. Metrics are filed internally by four lenses — supply, speed, place, cost —
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

**BOTH SCREENS CLOSE ON THE SAME BAND, and it is the tool's only outbound link.** Restored at the project
owner's decision after being removed twice at ANSR's request. `ClosingCta` in `closing-cta.tsx` is the one
implementation; each screen passes an id, a resolved `ctaHref` and the close's copy. **One link per screen and
a spec on each asserts the count**, so a second CTA cannot appear anywhere. The band still collects
NOTHING: no form, no email field, no stored visitor input.

**WHERE THAT LINK POINTS IS ADMIN-EDITABLE, ONE FIELD PER RESULT SCREEN, so each can carry its own UTM
tagging.** `close.ctaHrefPeers` and `close.ctaHrefFunctions`; a single URL made the two presses one
analytics event. Five things hold together. **Blank is LEGAL and means "use whatever is configured"** —
the only strings in `siteContent` that may be empty, because the shipped default must reproduce today's
behaviour, so `lengthError`'s required reading does not apply and the admin form uses `ctaLinkError`.
**`resolveCtaHref` in `derive.ts` is the one place the three sources are ordered** — field, then
`NEXT_PUBLIC_GCC_CTA_URL`, then ansr.com — and it falls back PER SCREEN, so tagging one screen does not
untag the other; the env path stays live so a deployment with one landing page needs no data edit, and
`tool.tsx` is the one caller because it is the one place holding both the copy and the phase. **`isCtaUrl`
in `normalize.ts` VALIDATES and never transforms, and its `http`/`https` allow-list is a security boundary
rather than tidiness**: the value lands in an `href` on ANSR's own domain, and the query string IS the
tagging, so a canonicaliser would destroy the attribution the fields exist to carry — the pasted string,
the diffed string and the `href` are one value. It is a `.refine`, so `CTA_URL_MAX_LENGTH` is imported by
the admin rather than read off the schema. And **both links are in `CLOSE_FIELDS`**: a retagged link moves
nothing visible, so a diff that omitted it would put a wrong UTM string live under "no site content
changes" — `CLOSE_FIELD_LABELS` names the screen in both renderers and a blank side reads "(not set)".

**It is a PAYWALL band: a blurred field of chart panels with the ask centred on it.** What is blurred is
synthetic — `CloseBackdrop` and `TILES` draw eight authored panels in four chart kinds (a headline figure,
a column chart, a donut, a sparkline), reading nothing from the data. **It is not a gated metric covered up
and it must never become one**; see invariant 1. **A "figure" in the field is a BLOCK at display height,
never a typed number** — a blurred numeral is still a real character in the public DOM, so a plausible
figure there is a fabricated one in the bundle. The whole layer is `aria-hidden` and a spec on each screen
asserts it contains no text at all.

**Three things hold the field together and each fixed a specific defect.** Every tile carries its own faint
panel fill, because blocks on the bare ground read as scattered marks rather than as a dashboard. The eight
tiles have 180-degree ROTATIONAL symmetry, so the field is balanced about the centre where the copy sits.
And the grid gap must stay WIDER THAN THE BLUR RADIUS or adjacent rows merge into one tall panel.

**The band admits WHITE INK ONLY, and that is measured rather than stylistic.** The veil is one flat value,
so its weight is set by the faintest ink on the band; at the weight `--ansr-text-inverse-muted` needs, the
field is too dim for the tiles to be distinguishable. White is 8.08:1 against the field's brightest
possible pixel, the muted token is 3.93:1 and is forbidden here. Same class of constraint as
`ask-hero.tsx`. **The veil is FLAT, never radial** — a radial one is a spotlight behind the copy, removed
at the project owner's request.

**The backdrop fades out at the band's own edges, and that is a bug fix.** It carried `transform: scale()`,
which pushed the brightest content into the band's corners — and the close is the card's last band, so
those are the CARD's bottom corners, where `.gcc-result-card` draws a 9%-white ring on the teal-deep page
ground. Bright blur behind a light ring read as light leaking out of the card's foot.

**TWO elements, and a spec counts them: one line and one button.** No heading, no eyebrow, no secondary
action, no panel. **The band has NO `h2`** — its accessible name is an `aria-label` (`CLOSE_LABEL`), the way
`#function-metrics` names itself, because a `<section>` with no name is not a `region`; an `sr-only` heading
is the wrong fix and `docs/traps.md` says why. Centred, on `--ansr-surface-inverse-soft` via `Zone`'s exempt
ground, and the last thing inside the card — `SOURCE_LINE` still follows it outside, on the page ground.

**It asks QUIETLY: 16/18/20px Light for the line, 48px for the pill.** The phone step is the same argument
arriving by measure rather than by size — at 18px a 98-character sentence is four centred lines, which is
the second hero the promotion below was reverted for. The contrast bound is on the COLOUR and does not move
with it: the veil is one flat value. The line was promoted to the heading's
old display scale once and reverted — at 24/30/38 a one-sentence band reads as a second hero, and the close
is the last thing on a long page of evidence.

**The copy is `siteContent.close`, so the close is the only EDITABLE band on the result screens.** Four
fields — `body`, `ctaLabel` and the two links above — on the same argument the hero is editable on: it is positioning on ANSR's own
schedule rather than an argument about the dataset. `closeCopySchema` is defaulted so an older dataset still
reads (the `metrics` precedent); `SiteContentDiff.close` means an edit is REPORTED, which is that category's
whole reason to exist; the admin tab is "Site copy" rather than "Entry point". **There is no heading field**
— a field an admin can fill that nothing draws is worse than none. **No public spec names the button's
words**, because editable copy must not be a spec's locator.

Four earlier shapes are deleted rather than parked: a bordered panel NAMING each withheld metric beside a
frosted empty slot (`withheldTitles` and its prop went with it), a "NEXT STEP" eyebrow, a per-status branched
copy set of up to eighteen sentences, and the `h2` "Unlock the full GCC landscape". Git holds all four.

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
  **A WORD unit is passed in as `SummaryFigure.unit` instead and NEVER parsed for**, because it is not a
  suffix on the number — it is the metric's own `unit`, admin-editable, and the renderer abbreviates
  nothing. One cell uses it, `ops-grade-a-office-stock` at "854 mn sq ft", set at ANSR's request where the
  title had been carrying the unit; its `unit` is stored as "mn sq ft" rather than "million sq ft" because
  the string is now DRAWN beside a 48px numeral. The gap is the only difference from a symbol — 4px rather
  than 2px, a word space rather than optical separation — and both take `whitespace-nowrap`, since the
  figure box is a fixed height that would clip a wrapped unit. Measured at 170px of ink in the tightest
  192px cell (`lg`, four columns); re-measure before lengthening it. `data-figure-unit` and
  `data-figure-value` are stable spec hooks, not styles.
  Anything else comes back whole, which protects a grouped count, a bare index and a signed delta.
- **Figure above its label visually, heading before its figure in the DOM.** Label is ink; unit and note
  are muted.
- **A FIXED height on the figure box and nothing reserved below it**, stepping with the figure at `sm`
  and `md`.
- **Column count from a STATIC map**, because a Tailwind class cannot be interpolated. **TWO columns on a
  phone and the figure a step down (30px) to fit them**, on the snapshot's own reasoning; an odd last cell
  widens to the full row below `sm`, since a lone cell in a row of evidence reads as one that failed to
  load.
- **The floor note is once for the ROW** where more than one figure declares a floor, per-cell otherwise,
  and still per-card where a CARD carries one.
- **A composed row carries no QUALIFIER.**

**A COMPOSED TAB MAY DRAW A METRIC AS A SUMMARY FIGURE RATHER THAN A CARD, and only if it is a bare
SCALAR.** Operations is the one that does. **A cell is ONE line under its figure and that line is the
metric's own TITLE** — the unit and the population a lifted part must not claim are authored into the
title, because a note written beside a lifted figure drifts and a title cannot. There is no
`OPS_SUMMARY_NOTES` and no second string per cell.
**The disruption cell states "0", at the project owner's explicit instruction, and it is ONE OF TWO
figures on either screen the data does not support** — the metric's four supplied values do not include a
zero. It is supplied in `ops-view.tsx` (`DISRUPTION_FIGURE`) and never written into the metric, so
`ops-disruption-days` still holds only supplied values and admin still edits the datum. It previously
stated "2 – 6" with a spec asserting the absence of a zero; that assertion is inverted now.
**The second is the SCALE CURVE'S ANSR RAIL and it is handled identically.** `ANSR_MONTHS` in
`screen2/milestone-card.tsx`, supplied at the project owner's instruction, never written into
`ops-scale-milestones` or `hr-scale-milestones`. Three things hold it. **BOTH RAILS ARE DRAWN
IDENTICALLY** — same ring dots, same visible waypoint names, same ink — because a rail drawn differently
from the rail it is compared with reads as a different kind of chart; discs, teal figures and clipped
labels were each tried on the lower rail and each reverted at ANSR's request. **THE SECOND RAIL TAKES THE
FIRST RAIL'S POSITIONS**, so the axis is the MILESTONE rather than elapsed time and a reader compares
straight down a column — which means a position on it is NOT proportional to the figure beneath it, and
the figures are the only statement of its durations. That is why the card states no ratio, percentage or
"faster", asserted by a spec: with the geometry borrowed, any claim about the size of the gap has to come
from the numbers. The CAPTION is the only difference between the two, and the ANSR one carries the full
lockup.
`ops-grade-a-office-stock` loses its vacant figure and
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
summary figures, and the salary ranking's comparator row. Both finance index charts set their values in
the heading teal.

**THAT COMPARATOR MUST BE NAMED IN TEXT SOMEWHERE ON ITS CARD, and the label is where.** It was "All
roles (reference)"; ANSR asked the bracket off, and the self-descriptive label "All roles" carries the
distinction itself — a spec asserts both the bracket and any comparator sentence stay absent. The
sentence `METRIC_NOTES["hr-salary-growth"]` briefly carried it was removed at the project owner's request
and replaced by SUPPLIED specialism rows (SDE, Product Management and DevOps / Platform Engineering):
the sentence was also closing the height gap with the scale-milestones card beside it, and real rows do
that with data. The ranking is EIGHT rows, the count the project owner judged symmetrical against the
two-rail milestone card. The comparator's sibling rows take the SAME teal as every other bar on the
screen — `muted` is now carried by nothing, kept for a chart that genuinely holds a row back. **A BAR TAKES ONE TEAL WHETHER OR NOT IT HAS A TRACK**: `BARE_FILL` and `TRACKED_FILL`
both set `teal-500` on `subject`, and the brand teal is `EMPHASIS_FILL` alone, so `emphasis` is tested
before `bare` in `BarTrack`. Measurements: style lock.

**THE CAPABILITY GRID EMPHASISES NO COLUMN**, at ANSR's request — the pale band, the teal heading and the
deeper segments all came off `OrdinalGrid`. `anchorColumn` is still derived by `anchorColumnFor` and
unit-tested on both rules, drawn by nothing, so restoring it is one prop; the admin coupling notice that
warned about renaming "India" went with the emphasis rather than staying as a warning nobody can verify.

**BUT THE DEPTH IS NOW A FUNCTION OF THE RATING, at ANSR's request: the top step takes `accent-teal` and
every step below it `teal-500`.** `ratingFill` in `charts.tsx` keys on the CELL'S OWN rating, so a
top-rated Poland cell draws exactly as a top-rated India cell does — which is what keeps it clear of the
emphasis above, where a darker mark in one COLUMN read as a higher rating. Two steps and not four: these
segments are the only visible encoding, so every fill must clear 3:1 on its own `surface-sunken` track,
which `teal-400` (2.15:1) and everything lighter do not. The key draws each step at its own fill so the
deep one is decodable. **The open conflict is that in today's ratings EVERY "Very strong" is India's
column**, so the two readings are indistinguishable from the rendered grid — India's Cybersecurity row,
rated Strong and drawn lighter, is the only visual cue. On the blocked list. The specs therefore pin the
MECHANISM on "Strong", which does span columns, rather than on the top step.

**`couplings()` IN `metric-editor.tsx` IS WHERE AN INVISIBLE DEPENDENCY ON AN ADMIN EDIT IS SURFACED, and
there are four.** Each is advisory, blocks no save and marks no field invalid, and the first three are a
mirror of a public constant, copied because importing a public component would pull the public React tree
into the admin bundle. Two are cosmetic and say so — the capability grid's glyph column (`GLYPH_ROWS`) and the
salary comparator's tone (`TONED_ENTRIES`). **The third warns that the card would state something FALSE
and therefore gets no softening clause**: `ANSR_RAIL_MONTHS` compares the scale-milestone figures an admin
is typing against the supplied ANSR rail, keys on `metric.id` rather than on a label because a figure has
no name, and reads the FORM rather than the delta. It is the only check that exists — the supplied months
are not in the dataset, so the schema, the diff and `data:verify` are all blind to the relationship. **The
fourth guards the one metric whose `unit` the public screen DRAWS** — `ops-grade-a-office-stock`, promoted
into the operations figure row, where its unit sets two scale steps under a 48px numeral in a 192px cell.
`DRAWN_UNIT_MAX` is a LENGTH rather than a mirrored constant, which is the deviation worth knowing: there is
no public list to mirror, and `unitSchema`'s 60-character cap cannot be tightened because two other metrics'
units are legitimately 39 and 42 characters of prose in an axis note. Re-derive the 12 if the figure row's
column count or the unit's size step changes. A notice whose coupling is removed is DELETED, not reworded: a
warning the reader cannot verify is one they learn to ignore.

**A metric is a shape plus, separately, its numbers.** Structure (`scalar`, `range`, `breakdown`,
`matrix`) is authored once; `value` is nullable. That split is what lets the catalogue ship as definitions
with no invented figures and lets a gated metric render a placeholder with no value near the browser.
`alignValue` re-fits numbers when the shape changes, in one tested place.

**`atLeast` marks a metric whose figures are a floor** — part of the definition, not the value. Every
figure renders with a trailing `+`, applied in one place in `screen2.ts`. Refused on a rating, dropped by
the gate.

**A PROGRESSION'S RAIL IS HORIZONTAL AT EVERY WIDTH — ONE LAYOUT, at the project owner's instruction — and
the vertical phone rail and the line-less list before it are both deleted.** `.gcc-milestones` places each
waypoint as label, ring, figure down one column standing on the rail at `--gcc-at`; the only things that step
at `sm` are three SIZES, never a placement. **The item cap is a PERCENTAGE of the rail below `sm` and a length
above it, and the cap is what made the horizontal reading unavailable before.** The tightest pair of waypoints
is 16.7% of the rail apart at every width, so a 3.5rem cap clears at 1024 and collides at 320; 14% clears by
the same 2.7% of the rail everywhere. **The wrapper's inset is a percentage for the same reason** — it absorbs
half an item and half an item is now a percentage — so `px-[7%] sm:px-7`, and the captions take it as they
already did from `sm`. The label row stays two lines RESERVED, which is what keeps a capped label wrapping
rather than overflowing and what the rail's own offset is derived from.

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
are about half the cell's area.** **It is an intrinsically sized GRID of EQUAL columns, never a wrapping
flex row** — four ordinal words of four different widths at one inline gap sat at four unrelated offsets,
so no cluster lined up with any other and the trailing-aligned wrap left a ragged last line, which is what
ANSR read as asymmetry. `1fr` columns under `w-fit` all resolve to the widest label's max-content, so every
cluster starts at the same offset in its own column and `ms-auto` keeps the block trailing. Two columns
below `sm`, four from it: four at the widest label's width do not fit a 320px card, and 2x2 is the only
arrangement of four regular at both ends.

**THE GRID REFLOWS BELOW `md` — one block per capability, one line per hub — because the scroller hid the
visitor's own column by default.** At 375 that container is 237px against a 672px table, `scrollLeft` is 0 on
load, and India, the column every other column is read against, sat past the edge with no fade, arrow or
shadow. A scroll cue would have made the hiding visible rather than fixed it. Between `md` and `lg` the table
still draws, and fits by stepping its own cell padding and minimum down; from `lg` both are what they were.
`display: block` on a table's parts drops the implicit table semantics, so **`OrdinalGrid` declares
`table`/`rowgroup`/`row`/`columnheader`/`rowheader`/`cell` explicitly** and each cell carries its column's
name as its own `aria-hidden` span — the `thead` stays in the document, visually hidden, because it is what
associates a cell with its column for anyone reading by role.

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
- **`IndexTable` DRAWS NO BAR AND EMPHASISES NO ROW**, both removed at ANSR's request. Every cell states
  its exact index and that is the only encoding. **THE BASE COLUMN'S `surface-pale` BAND IS GONE TOO, at
  ANSR's request, so there is no `background-color` anywhere in the table** — it read as a light blue band
  down the middle of a cost table, and this is the third emphasis the card has lost. What marks the base is
  INK ALONE, bold in the heading teal, it being the reference the rest are read against and holding the same
  figure in every row by definition; a spec asserts both the absent fill and the bold, because ink is now the
  whole signal. `cells[].share` is unread
  here and stays for `IndexLollipop`. With the emphasised row gone, `metric-card.tsx`'s capability grid is
  again the ONLY place this screen reads an admin-editable string.
- **THE TABLE IS CENTRED IN EQUAL COLUMNS, at ANSR's request, and centring alone does not achieve it.**
  Auto widths let the longest header decide where its own digits sat, so five columns read as five ragged
  groups; the layout is `table-fixed` with a quarter to the row header and the locations dividing the rest,
  which makes the widths a property of the table rather than of the strings in it. A fixed layout never
  overflows, so `min-w-xl` is back — one step below the `2xl` the bars used, because `2xl` put the last
  location outside a 768px card. Only a phone scrolls it, and inside the container.
- **`IndexSpread` labels BOTH marks with their own figures, each centred on the mark it names.** The
  comparator's was ANSR's request; the base's is centred on its own mark rather than pinned to the row's end
  edge, so one axis is not labelled by two different rules.
- **`IndexSpread` DRAWS NO DISPLAY FIGURE: each point is its name, its mark and its figure in one
  positioned column ON the rail.** The pair of 30px figures above the rail came off at ANSR's request — the
  card stated each index twice and carried four numbers for one difference — so the column names moved onto
  the marks they belong to, which also deletes the disc-and-ring key that sat beside them. **Only the marks
  and the origin are `aria-hidden` now**; hiding the rail wholesale was correct only while the pair existed
  in text above it, so the `dt`/`dd` pair per point is the card's one accessible reading. Geometry is
  `.gcc-index-rail` in globals.css, on `.gcc-milestones`' pattern and for its reason: the rail's offset is
  derived from a reserved label row, so a wrapped name overflows upward instead of moving its own mark.
- **THE RAIL IS INSET BY HALF A MARKER AT BOTH ENDS, and that is geometry rather than margin.** The axis
  runs zero to the base, so the base's share is 1 by construction and its disc centred on the track's last
  pixel — half of it outside the column. **The three cards share a two-row subgrid and go three across at
  `lg`, never `md`**: at 768 three columns put the two marks 27px apart and collided their labels into
  "Tier 2Tier 1". The delta chip sits under its heading, not beside it.
- **A COLUMN NAME IS SHORTENED IN THE DATA, never by the renderer.** The tier spread's columns are `Tier 1`
  / `Tier 2` in the catalogue and in `dataset.json`, and `indexBaseline` uses the same short form so the card
  names its base once; the full phrase survives in the metric's own title. A long name is what makes those
  two labels collide, so the fix is an admin edit — a renderer that trimmed the string would be parsing a
  label.
- **Nesting is AUTHORED (`subset`); a shared `unit` is only the precondition.** Two same-unit parts
  without it draw as two ADJACENT proportional blocks. Refused on anything but two parts, on parts with no
  shared unit, and alongside `progression`.
- **A RANGE'S TWO END LABELS BRACKET THE RAIL AT EVERY WIDTH** — two columns, trailing one end-aligned.
  Stacked at the leading edge on a phone they read as a two-item list of notes, where they name the two
  ends of the drawing above them. **AND THEY ARE IN THE RAIL'S OWN GROUP, 4px under the endpoint figures,
  at 12px MEDIUM** — the card's note sits 16px below them, so as a third sibling of the chart's column at
  `gap-6` they were 28px from the figures they name, nearer the note than the drawing and set in the note's
  exact treatment. Two gaps decide which block a caption joins, so the fix is the ratio between them and
  the weight step, and it is not scoped to a width: the desktop card carries the same two gaps.
- **A bar is dropped where it would mislead, and the axis is never truncated to rescue it.** 99.95%
  against 99.5% is caught by `clusteredHigh` and drawn as figures alone. A cost index draws a visible zero
  tick. **THE ORIGIN'S NUMERAL IS NOT DRAWN BELOW `sm` and the TICK still is**, because the numeral was
  costing the low endpoint figure its position: a low end at 10% of the rail is 29px at 390, so the `0` and
  the figure collide and `--gcc-range-floor` pushed the figure 19px off the mark it belongs to — a
  misplacement, on a chart whose whole construction is that the number sits under its own mark, and it is
  what "not placed right" was. The floor is zero where there is nothing to clear.
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
area and fill depth both tracking the count. **The labelled set is the ranked list's set AT EVERY WIDTH,
expanding with the disclosure, and the phone's four-city exception is gone** at the project owner's
instruction — a graphic pointing at four of the eight rows directly beneath it is the disagreement that
rule exists to prevent. What a phone still does differently is spend a 236px map's room: the type size is
derived from the label COUNT (`phoneLabelShare`, three measured steps at the list's own collapsed and
expanded sizes) and **a phone label draws the NAME ALONE**, the count being a third of every label's width
to restate a figure the list carries one line below. `showFigure` is therefore a LAYOUT input rather than a
rendering one — the room a label needs is what picks its side of the country. The 9% wrapper reserve is a
measured ceiling: the panel's `overflow: hidden` is the clip, so the room a label has is that padding plus
the panel's own 16px and nothing more, and widening the gutter shrinks the frame the type is a share of.
Two layers, one layout function, both `aria-hidden`; the layer is named by `data-map-labels`, because
`svg text` means both. **The one ambient animation is a halo BEHIND the leading
hubs, never the dot** — a dot's radius is the figure, so animating it animates the claim.

**A CITY THE SOURCE ABBREVIATES IS EXPANDED WHERE THE SPREADSHEET IS READ, on `canonicalIndustry`'s own
argument.** `CITY_ALIASES` / `canonicalCity` in `normalize.ts`, applied inside `parseCities` and BEFORE its
de-duplication so both spellings collapse to one entry. The one entry is `NCR` → **`Delhi NCR`**, at ANSR's
request, and the rename is what the rule is for: a city string is the key `CITY_COORDINATES` in `geo.ts` and
`TIER1_CITIES` in `derive.ts` both look up, and the importer is the recovery path — so renaming the published
dataset alone would leave the next import with a city that is counted, ranked and listed, carrying no dot and
no tier-1 standing. Admin needs no change of its own: the taxonomy editor renders `taxonomy.cities`, so the
datum IS the admin label. Expansions only, exactly as with industries; merging two cities or fixing a typo
belongs in the taxonomy editor, where the rename cascades and the diff records it.

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
  entry point's form card and controls at `lg`, the floating result card at `xl` — stepping to `lg` below
  `md`, where at `px-6` on a phone the card is 342 of 390 across and reads as the page rather than as a
  plate on a ground; the close band's own bottom corners and the answer editor above it follow it. `pill` for chips,
  counters and actions. `md` is admin's default. **A LOGO is the one CONTENT allowed a radius** —
  `md` on a peer card's `CompanyMark`, whose box is letterboxed padding, `sm` on the customer strip,
  whose files are cropped to their ink; the Fortune badge takes none. Steps: style lock.
- **A border is earned** — mark → `Panel`, text or a grid of cards → `Block`, sealed card → firmer border.
- **Public form field boundaries use `--ansr-grey-500`**, the only light neutral clearing 3:1 on white.
- **Status is carried by form, not colour** — icon, label, weight, shape. The four `--ansr-status-*`
  tokens are retired and lint-blocked. Destructive controls use `.ansr-destructive`.
- **`text-accent` is the ORANGE** (shadcn contract variable). The brand heading teal is `text-accent-teal`.
- **Body copy is the display face at Light 300**, the brand's single biggest typographic tell. One filled
  primary action per screen. Body copy capped at `max-w-measure`.
- **Brand motifs and textures are adapted, never pasted** — `scripts/brand_asset.py`, and note `recolor
  --map` takes one comma-separated string, not a repeated flag. **Logos are the only literal-use
  exception**, and there are five: `ansr-wordmark.tsx` in the ask hero, `atlas-wordmark.tsx` in the ask
  hero and both result screens' `h1` (the product's own name, supplied as an outline by the project owner
  and the only home those contours have — the file it came from is a root SVG and therefore gitignored),
  the inline lockup in
  `impact-band.tsx`, `ProductIdentity`, and the FULL lockup on the scale curve's ANSR rail caption
  (`public/brand/ansr-logo.svg`, the light-ground file, whose wordmark is `currentColor` and therefore
  near-black inside an `<img>`). Activate the `ansr-brand-assets` skill before touching anything under
  `assets/brand/`.
- **A THIRD-PARTY accreditation mark is a second literal-use case and takes no brand rule at all** —
  the Fortune Global 500 badge, `public/badges/`, whose red is Fortune's and is deliberately outside
  the token system at the project owner's instruction. It lives inside the ASSET FILE, never in CSS,
  so the no-raw-hex rule is not bent to admit it — `.svg` is not in `brand_lint.py`'s `SCAN_EXT`. The
  fills are literal and never `currentColor`, so no surface can tint it. Never re-drawn, never
  tokenised, and recoloured only on the project owner's own instruction: `GLOBAL` and the `500` are
  Fortune's red and `FORTUNE` is black, applied as a fill on groups the supplied outlines already
  separate.
- **SVGs at the repo ROOT are gitignored** (`/*.svg`, root-anchored). If a root SVG seems ignored, it is.

## Invariants

Violating any of these breaks the product, not just the build.

1. **Gated values never reach the visitor's browser.** Fully loaded cost per FTE by role and level, HR
   cost per employee served, the cost-vs-ecosystem-depth trade-off, and the workplace-cost gradient are
   server-side omissions rendered as shape-only placeholders. **A CSS blur over real text is a leak** — a
   paint-time filter is reversible from markup the browser already holds, so concealment is never a
   rendering decision. The close's blurred backdrop is not an exception to this and is the reason to state
   it twice: what it blurs is an authored lattice that reads nothing from the data, and a spec on each
   screen asserts the layer contains no text. **Rendering a gated metric and blurring it would satisfy no
   rule here and break this one.**
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
   cannot plot a city somewhere invented. **`taxonomy.cityCoordinates` is an OVERLAY on it, never a
   replacement**, read first by `projectCity` and bounded to India's own extent by the schema: it supplies
   the one thing the code cannot, which is where a city added after the seed actually is. **A city with no
   coordinate on either side is counted, ranked and listed and simply carries no dot, and nothing on the
   public screen says so** — the gap is surfaced in the taxonomy editor, where it can be fixed. **The frame is fixed, may never be fitted to whichever cities an
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
  **BUT EVERY PHASE PUSHES A HISTORY ENTRY, so Back steps a phase**, at ANSR's request — submitting the form
  is the only navigation-shaped act on the entry point, so Back on a result used to leave the tool. Four
  things hold it. `pushState` is called with NO URL argument, so the address is untouched and the rule above
  is intact. The entry holds an INDEX into a phase trail in a ref (`HISTORY_MARK`), never a `PeerView` — a
  matched result is tens of kilobytes and a structured clone that would have to survive a view-model change.
  The trail does not survive a RELOAD and a restored entry resolves to the ask, which is correct rather than
  a gap: the result comes from a server action over answers the tool does not store. And a `popstate`
  transition writes NO scroll position — the browser's own restoration is where the visitor actually was on
  that entry, which is better than either offset the tool would state. **Inside an iframe this adds entries
  to the host page's joint session history**, so Back on ansr.com steps through the tool before leaving the
  page; that is the requested behaviour and it is the host's to know about.
- Height is negotiated via `postMessage`. No `100vh`, no fixed or sticky positioning that assumes it owns
  the scroll container.
- **No scroll-driven motion and no scroll-position logic.** An IntersectionObserver or scroll listener
  against our own viewport fires for content the visitor cannot see. Motion is tied to state changes or
  to a pointer. **There is no animation library and every animation is CSS off brand tokens.**
  `motion` (framer-motion) was installed for one hover and removed: 40KB gzipped, measured with an
  esbuild probe of exactly what was imported, on the entry point of a tool loaded INSIDE someone else's
  page — our bundle is added to everything ANSR already ships. Weight is judged on that basis here, and a
  library earns its place only if CSS cannot do the thing at all.
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

**Four editable collections, one file.** Companies, `peerOverrides`, metrics, and `siteContent` — the entry point's hero
copy, ANSR's impact figures, the result screens' CLOSE, the peer view's `commonFunctions` tags, the
entry point's `logos`, and `copy`, the 67 static visitor-facing strings — all live in `dataset.json`. A second file would mean a second write
target, a second diff, a second cache and a publish that could half-succeed. `metrics` is **defaulted to
`[]` rather than required**, so a dataset written before it existed still reads — the fs store refuses an
unrecognised version, so bumping `DATASET_VERSION` would have turned a compatible addition into a broken
read.

**THE LINE BETWEEN AN EDITABLE STRING AND A CODE ONE IS WHETHER IT STATES A CLAIM ABOUT THE DATASET.**
A heading, a label or an attribution names what a reader is looking at and asserts nothing about it, so it
is `siteContent.copy` — 61 flat keys and 6 templates, each capped at a render limit measured on the real layout, grouped by
screen in the editor. A sentence that states a count, a share or an ordering has to move when the thing it
describes moves, so it stays a function in `copy.ts`: `peerCountLine`, `shortfallLine`, `largestLine`,
`industrySentence`, `largestOverlapLine` and their siblings are derived and have no fixed wording to edit.

**Three strings clear the first test and still stay in code, and each is worth keeping.**
`FUNCTIONS_TITLE` — "Common functions run from the India GCCs" — is what stops eight function tags being read as
a claim about the five companies above them, and there is no per-company function record to support
anything narrower; as free text it could be reworded into a falsehood nothing catches. The snapshot's
opening label is COMPOSED over the visitor's scope, so a flat field could hold only one of its two
branches. And `ASK.submitPending` is a transient machine state whose length is load-bearing.
**`industryBasisNote` was a fourth for one pass and is a KEY**, at the project owner's decision: the
containment chart's basis line is the only thing between three exact counts and a claim about the market,
which argued for code, and it was overruled because a basis line is ANSR's own voice. `nonEmpty` is what
survives of the argument — the note can be reworded and cannot be emptied — so the wording rule is enforced
by a unit test on the shipped value and by the admin hint, not by the schema.
**A KEY IS REMOVED WHEN ITS CONSUMER GOES, and the reason is always the same one: an editable field that
draws nothing is a change an admin makes and cannot see.** `snapshotShareLabel` rendered nowhere.
`askCompanyLabel` and `pillCompany` labelled a control and a pill that the company-name removal deleted, and
`peersTitleFallback` existed only because that heading had a no-name branch. **Removing a key needs the
STORAGE KEY bumped too** — zod strips an unrecognised key rather than refusing it, so a draft written before
the removal would publish cleanly with the extra string silently dropped, which no shape check can catch;
`peersTitle` is the sharper half of the same bump, having stopped being a template, so a stale draft's value
would still validate and then draw `{company}` as literal text over the primary evidence.
**A whole new COLLECTION is the blunt case the version was always right for, and `peerOverrides` took it
to v11 — with a line in the shape check as well**, because the key is `.default([])`-ed: a v10 draft parses
with the gap filled by an empty list, so publishing one would DELETE every pinned peer set and report it as
an ordinary edit, and a pinned set is invisible on the public screen by design.
`draft-provider.tsx` is at v11.

**A STRING THAT NAMES ITS SCOPE RATHER THAN ASSERTING ANYTHING IS A TEMPLATE, NOT A REASON TO STAY IN
CODE.** `copyTemplate` in `schema.ts` builds a field that MUST contain its declared `{slot}`s, and the
refine BLOCKS the publish when one is deleted — so `snapshotHeading` is editable while `{industry}`,
the one thing that heading exists to state, cannot be removed. Six things hold it together.
**`COPY_TEMPLATES` holds the slots AND the cap in ONE table**, because `.refine()` erases `maxLength` and
the admin reads every other bound off the schema; `copyFieldMax` is the single call, so the editor holds
no cap of its own. **The cap is measured on the FILLED string** — the taxonomy's longest industry is 41
characters, so the factory subtracts the slot's own width and a template that validates still fits once
substituted, asserted against the real taxonomy. **`COPY_PLACEHOLDERS` is a CLOSED set**, each name a
promise the render path holds that value, so an admin cannot invent a slot that publishes as literal text.
**`fillTemplate` leaves an unsupplied slot AS TYPED**, so a caller that forgets one draws a visible
`{industry}` rather than a gap that reads as intended copy. **A SLOT IS DELETED WITH THE INPUT IT NAMED** —
`{company}` and its `peersTitle` entry went when the form stopped asking for a name, and the placeholder set
being CLOSED is what made that a type error at every site rather than a string that quietly stopped being
substituted. And **the snapshot's opening label is still NOT a field**: its branches differ by which NOUN
the sentence uses, not by a value in a slot, so a template cannot express it and faking one would hand an
admin the choice of population.

**ONE BRANCH OF `shortfallLine` IS PUBLISHED THIS WAY — `peersNarrowNote` — AND DROPPING ITS COUNT IS WHAT
MADE IT POSSIBLE.** The sub-industry branch read "{industry} is not short of companies in India — but only
3 are close enough to your sub-industry to be worth naming", which stated a number `peerCountLine` already
states exactly, ungrammatically at a set of one, alongside an em dash and the tool narrating its own
restraint. Without the count it names the SCOPE that shortened the list and nothing else, which is this
rule's own category; `{industry}` stays required, because without it the sentence claims something about
India at large. **The other three branches stay derived and are not candidates**: each names a quantity or
a population, so each has to move when the engine does. A unit test pins the publishable branch on the
properties rather than the wording — industry named, no digit, no em dash. **The wording is DIRECTIONAL now
that the line sits above the cards**: it says few GCCs closely match the sub-industry and then points
forward at them, so a reword may not restore "above".

**A NEW COPY KEY IS WRITTEN INTO `data/dataset.json` IN THE SAME COMMIT, BECAUSE THE MERGE MAKES THE DIFF
BLIND TO IT.** Both sides of a publish diff are schema-parsed, so the merge fills both and a missing key
reports NO change — the file then gains those lines silently on the next unrelated publish, under a commit
about something else. That is the reviewable diff, which is the whole reason there is no database. So the
keys go in by LINE, in `publicCopySchema`'s DECLARATION order because that is what zod emits and therefore
what a publish would write, and using the file's own `\uXXXX` escaping rather than the raw character —
`JSON.stringify` does not escape, which is the standing divergence `docs/traps.md` records on 1,240 existing
lines and not a thing to fix one key at a time. Verify by parsing the file and asserting the self-diff is
`isEmpty`.

**THE PUBLISHED COPY BLOCK IS MERGED OVER THE SHIPPED ONE, WHICH IS WHAT MAKES A NEW STRING A COMPATIBLE
CHANGE.** `siteContentSchema.copy` is a `z.preprocess` spreading `DEFAULT_PUBLIC_COPY` under the stored
value. Defaulting the whole object only ever helped a dataset with no `copy` at all; every dataset written
before a new KEY has a `copy` that is present and short by one, so without the merge adding a string
refuses the committed dataset and production's alike. **A merge rather than a `.default()` per field**, so
the shipped value stays in exactly one place — and no future key needs a default of its own. The cost is
that the merge makes the draft restore's shape check BLIND, since the keys are present after it: that is
why twenty-nine additions bumped `STORAGE_KEY` to v7 and ONE more took it to v8, and why three REMOVALS
took it to v10 — the merge is per-KEY, so
a draft short by one string has that gap filled with the shipped value and publishes it as an approved
edit. A bump is now the only instrument for a copy-shape change, at any size.

**A VISITOR-FACING STRING AN ADMIN CAN REWORD MUST NOT BE A SPEC'S LOCATOR.** `0-screen1.spec.ts` and
`0-search.spec.ts` import `DEFAULT_PUBLIC_COPY` and read the KEY instead of typing the words, which is
the convention for every spec that names one from now on — the fixture publishes the shipped defaults, so
it resolves to what renders, and a spec naming a key the schema dropped fails at the type level rather
than as a timeout. What stays literal is anything asserted ABSENT: a removed sentence has no key to read.
**The form field labels are the sharpest case** — `choose(page, …)` and `getByLabel` reach every control
by label, so those four keys are the most spec-coupled strings in the repo.

**`askIndustryPlaceholder` IS ALSO THE INDUSTRY POPUP'S ACCESSIBLE NAME**, because `select-field.tsx`
passes `placeholder` to the tree's `aria-label`. One editable key therefore decides both the muted text in
the closed trigger and the name assistive technology reads for the open list — which is what makes
`getByLabel("Industry")` ambiguous once open, the trap `docs/traps.md` records. Keep it a NAME rather than
an instruction.

**A STRING INSIDE A RENDERER NO METRIC ROUTES TO STAYS IN CODE, BECAUSE AN EDITABLE FIELD THAT DRAWS
NOTHING IS WORSE THAN NONE.** That is the rule `snapshotShareLabel` was deleted under, and `gridDisplay`
is where it gets decided for the grids: today's data produces `ratings` once (`tech-capability-comparison`,
so `OrdinalGrid`'s `sr-only` row header IS live and IS a key), `dumbbell` once and `lollipop` three times —
and `numbers` never. So `NumberGridChart`'s `Measure` and `IndexLollipop`'s `Comparator` stay in code
however much they look like the row header beside them. **Check the routing before moving a chart string**,
by reading `ratingScale` off the METRIC and `indexBaseline` and the column count off it — not off
`structure`, which holds neither.

**A STRING `charts.tsx` DRAWS TAKES A REQUIRED PROP, NEVER A CONTEXT READ.** That module has no
`"use client"` and is imported by server components, so it cannot hold a hook; `closing-cta.tsx` and
`snapshot.tsx` are the same case. Required rather than defaulted, so a new caller cannot silently
reintroduce a hardcoded name. `ClosingCta`'s name arrives as `label` separately from its `copy`, because
that prop is `siteContent.close` — an offer, edited in its own admin section — while the name is a landmark
name edited with the others.

**WHAT STAYS IN CODE IS NARROWER THAN IT WAS, AND `ASK.submitPending` IS THE LINE.** The submit error and
the required-field message are editable now: neither states a claim, and ANSR's voice matters most when
something has broken. `submitPending` does not move, because its length is load-bearing against the submit
label's own width — two editable strings whose RELATIVE widths decide whether the button resizes mid-press
is a coupling no cap can express. `FUNCTIONS_TITLE` and the derived sentences are unchanged.

**Each constant in both `copy.ts` files READS its `DEFAULT_PUBLIC_COPY` key rather than restating the
string**, so there is one shipped value per string and the wording cannot drift between the code default
and the schema default. The reasoning for every wording decision stays in `copy.ts`; only the value moved.
`PublicCopyProvider` in `copy-context.tsx` supplies the published block, and **its context DEFAULT is the
shipped block** — so a component with no provider above it renders the real wording rather than nothing,
which is what keeps the provider optional instead of load-bearing.
**`tests/unit/public-copy.test.ts` IS THE ENFORCEMENT, SO THOSE MIRROR CONSTANTS ARE NOT DEAD CODE HOWEVER
THEY LOOK FROM `src/components` ALONE.** `ASK`, `CUSTOMERS`, `IMPACT`, `INDUSTRY_TITLE`, `SCALE` and
`SNAPSHOT_LABELS` are read by that test and frequently by nothing else, because the component reads the same
key through `usePublicCopy()` instead — a sweep scoped to `src/` reports all six as unused and deleting them
removes the no-drift guarantee rather than any duplication. A copy audit did exactly that; see
`docs/copy-audit.md`.

**Why the hero copy and the close are data when no other public string is:** everything else is an argument
about the dataset and lives beside the logic making the argument. The hero is positioning, the impact figures
are corporate facts on their own schedule, and the close is an offer — none of the three makes a claim about
the data. This category changes what every visitor is shown regardless of what they
answered, so it gets its own diff and leads the preview. Its default is real content rather than `[]`, and
`close` is `.default()`-ed for the reason `metrics` is `[]`-defaulted: a required new key would make every
dataset written before it a broken read. **The hero's company count is deliberately "1,800+" and not 1,834** — editable text, not
`companies.length`; `data:verify` cannot check it and a spec asserts the exact figure is absent.

**THE HERO TITLE MUST CONTAIN THE LITERAL SUBSTRINGS `ANSR` AND `ATLAS`, and nothing enforces either.**
`withBrandMark` and `withProductMark` in `ask-hero.tsx` find them and swap each for its drawn wordmark, so
a headline spelling either any other way renders that half as plain type — silently, and it looks
deliberate. Both are matched as LITERAL TOKENS rather than sliced by position, because the title is
admin-editable free text and the alternative is a copy field per half. **The product mark is found in
the REMAINDER after the brand mark**, so the two substitutions cannot overlap or reorder. **The run up to
the first SPACE after `ATLAS` is held in a nowrap span with the mark**: an inline SVG is an atomic inline
and the line breaker takes an opportunity beside one, which put the title's colon alone at the head of the
second line. Only the ANSR mark takes the orange, and only where it leads — the contrast bound below. It
is the product's own name now, "ANSR ATLAS Benchmark against your peers", which sets to three lines at the
display size and is what the 60-character cap is measured against. **No punctuation after the name, at the
project owner's request** — the colon that was there while the name was typed became a typed character
against the trailing edge of an outlined mark, and the lockup separates the name from the promise on its
own. So the nowrap span usually holds nothing, which is the mechanism doing its job rather than a case to
delete: the wrapping rule is a property of an atomic inline, not of one title's punctuation. **BELOW `lg`
THE PRODUCT NAME OWNS ITS OWN LINE, and that `<br>` is the composition's one manual break** — after the
mark's nowrap span, `lg:hidden`, and emitted only where the title continues past the name. Desktop already
breaks there at 72px so `display: none` leaves it untouched; from about 400px `text-balance` did not, and
"ANSR ATLAS Benchmark" on one line reads the product's name as the first two words of a sentence. That is a
naming failure rather than a ragging one, so it may not be left to a cap or to the balancer — both move
with the font size and the string. **The `h1` takes `text-pretty` below `lg` and `text-balance` from it,
and the pair goes with the break**: the balancer does not reach across a forced break, so it left a
single-word last line, which is the one thing it is there to prevent. **The impact band's heading is the other
place the mark is typed nowhere**: it reads "[ANSR] By The Numbers", so the mark LEADS the line and
`impactTitleLead` holds only "By The Numbers". A `{" "}` after the image is load-bearing for the ACCESSIBLE
NAME rather than the layout — JSX strips whitespace containing a newline, and without it the name computes
to one word while the visible gap survives on the margin.

**NO EM DASH IN VISITOR-FACING COPY, at ANSR's request.** It was in the hero's lead and the close's body,
the two editable bands, and both now take a COLON rather than a comma: what follows the break names the
things the clause before it promises, and both halves already carry commas of their own, so a comma at the
join reads as another list item. Fixed in `DEFAULT_SITE_CONTENT`, `DEFAULT_CLOSE_COPY` and
`dataset.json` together — a public string lives in more places than the render path. Scoped to what a
visitor reads: a metric's `note` is admin-only, dropped by the gate on both branches, and keeps its dashes.

**The importer preserves the catalogue.** A re-import rebuilds companies and taxonomy and would otherwise
erase months of typed-in metric values in a way that looks like a normal import.
`--reseed-metrics`, `--reseed-business-types` and `--reseed-site-content` adopt the in-code versions and are
loud about what they discard. **The importer is also the recovery path**: companies, taxonomy, business types
and the metric catalogue are all reproducible from the seed plus the in-code tables, so a lost `dataset.json`
is rebuilt rather than re-typed — `data:verify` matching the committed baseline is what confirms the rebuild
is faithful.

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

**AN ADMIN MAY REPLACE THE COMPUTED SET FOR ONE COMBINATION OF ANSWERS — `dataset.peerOverrides` — AND IT
IS A REPLACEMENT AND NEVER A NUDGE.** Whatever is in `companyIds` is the peer set, in that order, and
whatever is not is not shown, which is what makes one field both an include list and an exclude list. It
exists because the data is thin in places: a sub-industry with four eligible companies, two obvious
comparisons that score below the floor, a company ANSR would rather not put in front of one kind of
visitor. **The engine is right almost everywhere and this collection should stay empty** — it ships empty,
`data:verify` profiles the count, and a number climbing over time is the signal that the scoring wants
fixing rather than overruling. Ten things hold together.

**A combination is a PATTERN, not a tuple.** `industry` is required; sub-industry, revenue band and HQ are
each optional and absent means ANY, so one row can cover the whole of Education. `industry` is required
twice over: it is the hard boundary, so a row without it could put a bank in front of a retailer, and it
is what scopes the candidate list the admin picks from, which is unusable at 1,834 rows. **An absent field
on the INPUT is a real answer** — a visitor who named no sub-industry — so the test is equality and not
truthiness, which is what lets one set be pinned for the broad answer and another for a narrowed one.

**Precedence is by SPECIFICITY, weighted as distinct powers of two — sub-industry 4, band 2, HQ 1** — which
mirrors what each field means to the engine and makes a tie unreachable. `industry` scores nothing, being
on every row. **A DUPLICATE COMBINATION IS REFUSED BY THE SCHEMA rather than resolved**, because the
tiebreak would be list position, which no editor shows; so which set a visitor saw would depend on
something invisible. A BROADER row already covering a combination is legal and is the useful case — the
editor states it as a finding and only an exact duplicate blocks a save. **Refusing on "anything covers
this" instead was a real bug**: the broad row still covers the combination until the narrow one exists, so
the check was permanently true and narrowing was unreachable.

**`matchPeers` decides it, and four reported fields are deliberately NOT what the scored path would say.**
`shortfall` is ZERO whatever the length — every branch of `shortfallLine` is a claim about the DATA, and a
curated set of three is three because somebody chose three. `floorShortened` is false for the same reason.
`sharedTags` is empty and `businessMatched` false, because naming what the peers share would invent a
rationale for a decision made by hand. `tier` IS computed from the returned companies' own bands, that
being an observation rather than a story. **Every POPULATION count is untouched** — `industryTotal`,
`closeMatches`, `sameBusinessType` — so the containment chart and the count line under the grid stay true.

**Nothing on the public screen says a set was hand-picked, and there is no honest sentence that could.**
`overriddenBy` is on `PeerResult` for `data:verify` and the admin preview and stops at the view-model
boundary. **The admin's candidate list is `rankCandidates`, the engine's own ranking**, so the five it
would have shown are marked and the ones the floor REJECTED are visible — the latter being why most people
will come here. `eligible` is `ranked` FILTERED, so the two agree on order. **`compareScored` is one
comparator with two callers** for the same reason: a second sort written for the admin would drift.

Referential integrity is the schema's: every pinned company must exist and be in the row's own industry, a
sub-industry must belong to it, the set is 1 to 5, and no company twice. So the cascades are mandatory —
`deleteCompany` unpins and drops a row left empty, `removeBusinessType` DROPS the row rather than widening
it to "any", and the taxonomy rename and remove sweep all three fields. **Widening on a delete is the wrong
move every time**: it applies a hand-picked set to more visitors than it was written for, silently. The
importer PRESERVES overrides and PRUNES what no longer resolves, loudly, and has no `--reseed` flag because
there is nothing in code to seed from.

**A similarity floor of 0.20 applies to `businessSimilarity` ALONE, never the combined score** — a perfect
band match is worth 0.3, which on the combined score would drag a business-irrelevant company over the
line. The floor can shorten a set; that is invariant 3, not a defect, and `data:verify` counts how often.
Reasoning for 0.20 over 0.15 sits beside the constant in `similarity.ts`.

**A FULL SET THAT REACHED PAST THE VISITOR'S ANSWERS SAYS SO, IN ONE LINE ON TWO AXES.** `broadenedLine`
is `shortfallLine`'s pair: where the short line explains a set of three, this explains a set of five that
could not be filled from the visitor's own sub-industry or size, so it reached the closest comparable
companies a little further out. Two independent signals on `PeerResult`: `shownSameBusinessType` (its gap
to `peers.length` is the sub-industry reach) and `bandReached` (some shown peer beyond ±1 revenue band —
±1 is comfortable, further is the call-out). The view model exposes `broadenedBusiness` and `broadenedBand`;
the line names whichever fired — "beyond your sub-industry", "beyond your revenue band", or both — and
never a reach that did not happen. **The band axis does not need a sub-industry**: a visitor thin at their
own size trips it alone. **Both signals require `shortfall === 0`, so the line is mutually exclusive with
`shortfallLine` by construction** — that one wins the tie, and the caller renders
`shortfallLine(view) ?? broadenedLine(view)`. **It stays a DERIVED function, not an editable key**: it
asserts which axis the result reached on, the same category as the other `shortfallLine` branches, and an
override sets both signals so it cannot fire on a hand-picked set.

**The old three-rung band ladder survives as `matchPeersByBandLadder`, as the test oracle.** With no
sub-industry the scored engine reproduces it company-for-company, asserted in `similarity.test.ts` and as
a `data:verify` invariant. Do not delete it without deleting those.

**Sub-industry is never a match key.** 620 values over 1834 companies is not a taxonomy: it is read on
import, collapsed through `scripts/business-type-map.ts` into one of 164 business types, and discarded.

**TAGS ARE DATA NOW, AND THE WEIGHT CAP IS WHAT PAID FOR IT.** `BUSINESS_TAGS` (138) is still the
AUTHORED vocabulary and still code, but `businessTypeSchema.tags` validates SHAPE rather than enum
membership, so an admin can add a tag of their own. What made that shippable is measured: IDF is
unbounded, so a fresh tag arrives at roughly 100x a common one (Software & Internet: 6.44 on one carrier,
5.75 on two, 0.05 for `b2b`) and dominates the visitor's own denominator — one invented tag cut the
eligible population 20% on average and 95% at worst, and took the named five to two in five
sub-industries. **`capCustomTagWeights` in `similarity.ts` holds a tag OUTSIDE the authored vocabulary to
the sharpest AUTHORED weight in its own industry**, so a custom tag can be as discriminating as the best
reviewed one and no more. **The cap is scoped by PROVENANCE and not by frequency, and that is not a
stylistic choice**: eleven authored tag-and-industry pairs already sit at company frequency 1
(`agrochemicals` in Agribusiness, `defense` in Architecture, Engineering & Construction, `services-firm`
in Restaurant & Food Service and eight more), so a flat clamp at the two-carrier weight would have
silently re-scored eleven industries as the side effect of an unrelated feature. It is provably a NO-OP on
the shipped dataset — every tag in it is authored, asserted in `peer-overrides.test.ts` — so no peer set
that ships today can have moved. **A tag is a SLUG**, on `id`'s argument: it is compared by equality, so
`Quick Commerce` and `quick-commerce` would be two tags sharing nothing, which is how a vocabulary rots
back towards 620 values of one member. `normaliseTagInput` runs in the EDITOR and shows the slug before
the tag is added, never silently at the publish gate. **`isBusinessTag` no longer means "valid" and now
means "was reviewed"** — the weight cap is the only thing in the product that reads it.
**The nudge says a lonely tag is the MAXIMUM-weight case, and the old hint said the opposite.**
`business-type-manager.tsx` claimed a one-type tag "has no effect at all", in a docblock and under the
picker; both were backwards and both are corrected. Adding such a tag is allowed and is the admin's call.
**A business type's NAME is Title Case**, at ANSR's request — "Apparel & Footwear Brand". Applied in
`business-type-catalogue.ts` AND `dataset.json`, because the catalogue is what a re-import seeds from.
The rule and the acronym and hyphen cases: `docs/business-types.md`. Nothing that matches moved — a
company, a tag, a search term and `business-type-map.ts` all key on `id`.
**Every tag FROM THE AUTHORED VOCABULARY must be carried by at least two business types**, asserted by
`data:verify` — scoped there rather than left blanket, because an admin's addition necessarily starts on
one type and `--accept` deliberately cannot silence an invariant. An admin's one-carrier tag is a profile
figure (`tags added in admin`, `tags on a single business type`) and is bounded by the cap instead. **A company's
business types must belong to its own industry**, enforced by the schema — so an industry rename cascades
into `businessTypes[].industry` as well as into companies. **An untagged company is a safe state**: 38 are
deliberately untagged. It still counts in every total, but it can never be shown as a peer to a visitor
who names a sub-industry — similarity 0 is below the floor.

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

**Two PARALLEL keys sit beside the four lists and are not lists themselves** — `pinnedIndustries` holds
copies of strings from `industries`, `cityCoordinates` is keyed by a string from `cities`. Both are
edited on the row that owns the string rather than in an editor of their own, both are checked
referentially by the schema, and **both are carried by the rename cascade and the remove sweep** — a pin
or a coordinate left under a name that no longer exists is a publish that fails on an edit the UI
reported as successful. `TAXONOMY_LIST_KEYS` in `schema.ts` names the four flat lists, because
`keyof Taxonomy` used to mean exactly that and stopped the moment these two arrived.

**The four function areas and four lenses are enums, not taxonomy.** The metric editor can rename a
metric, rewrite its question, and add, rename or remove the parts and axes of its shape — but not add or
delete a whole metric, and not change its format, function area, lens or gating. **`atLeast` IS editable**,
and the line between it and those is worth keeping: it is a claim about how the figures in front of the
admin were arrived at, which only whoever entered them knows, so `replaceMetric` takes it from the form
while it re-pins the rest. `progression` and `subset` stay out because both change which chart is drawn. A
genuinely new metric is a code change to the catalogue, deliberately. Because six titles appear on more
than one tab, admin's Edit button names the function area alongside the title.

**A TITLE RENAMED IN ADMIN LANDS IN `dataset.json` ONLY, AND THAT LEAVES TWO PLACES DISAGREEING WITH IT.**
`metric-catalogue.ts` still holds the old wording, so `--reseed-metrics` would silently undo the rename;
and the browser specs name titles literally, so they now assert a string the published data no longer has.
Neither is caught by the schema, the diff or `data:verify`. So a rename is finished by cascading it into
the catalogue and every spec that names it — which is the third leg of the load-bearing-title rule in
`docs/traps.md`, stated here because a publish is where it actually happens.

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

**Known gap:** no per-company function list, and there will not be one. The set the brief permits is
`siteContent.commonFunctions`, admin-editable — it can be data BECAUSE the block claims nothing: no
numeral, no bar, no order. `DEFAULT_COMMON_FUNCTIONS` in `schema.ts` is the seed.

## Architecture map

What lives where. Never a file listing — the tree is supplied each session.

| Path | Responsibility |
| --- | --- |
| `src/app/` | App Router. `layout.tsx` self-hosts the display face via `next/font` and exposes it as `--gcc-font-display-loaded`, which `tokens.css` reads — the generated family name is hashed, so naming the face literally would fall through to the sans stack and lose Light 300. **`font-display` is set ONCE, on the public root in `tool.tsx`**, never per surface. `body` stays on `--ansr-font-sans` so admin keeps Inter. `page.tsx` is the only public route, serves both screens, and is `force-dynamic`. `actions.ts` is the public surface's single server action — one seam, so there is one place to check the dataset does not cross. Screen 2 needs none: its payload does not depend on the visitor. `globals.css` is the Tailwind theme aliased onto brand tokens; it restates no values and clears Tailwind's palette. **`--ansr-gradient-teal` and `--ansr-gradient-orange` are `background` SHORTHAND values, not images** — a colour is not a valid `<image>`, so aliasing them into `--background-image-*` emits an invalid `background-image` that paints nothing silently while still generating a class that looks correct. Both go through `.gcc-ground-gradient`; only `--ansr-gradient-conic` stays aliased. |
| `src/data/` | The whole data layer, and the only place that knows the dataset shape. `schema.ts` (zod contract), `normalize.ts` (cleaning primitives, shared by importer and admin upload so one format never gets two parsers), `derive.ts`, `peers.ts` (scored engine + Screen 1 counts + the ladder oracle + `rankCandidates`, the one ranking the admin's override editor draws, and `matchPeerOverride`, the one precedence rule), `similarity.ts` (IDF weighting, band steps, `SIMILARITY_FLOOR`, `capCustomTagWeights`), `search.ts` + `search-terms.ts` (the matcher and its vocabulary — the two modules in here a CLIENT component imports, which is why neither may ever take `server-only` and why they hold no dataset; `search.ts` now serves the ADMIN filters as well as the visitor's dropdown, and `searchableText` is the variadic haystack builder that made that possible without a second matcher), `business-tags.ts`, `business-type-catalogue.ts`, `company-mark.ts` (the resolver) + `company-marks.ts` (`COMPANY_MARKS`, the committed tier's one table), `diff.ts` (one computation, two renderers), `metrics.ts` (`publicMetric`, the gate), `metric-catalogue.ts`, `store.ts` + `store/{fs,github}-store.ts`, `publish-store.ts` (selects the write target, refuses to guess), `dataset.ts` (cached read, mtime+size invalidation, `server-only` — which is what makes "never ship the dataset" a build error). `screen1.ts` is Screen 1's view model; two fields carry their own justification — `industry.averageHeadcount` is a mean of FTE BAND MIDPOINTS, industry-level, rounded coarser than the narrowest band, and never renderable without a method line; `scale.asOf` is the dataset's `generatedAt`, the only date here that is a machine fact, and `dataset.source` is deliberately not carried across. `screen2.ts` is Screen 2's view model and holds `figureParts`, `layoutArea`, `metricWidth`, `packWidths`, `breakdownDisplay`, `gridDisplay`, `breakdownScale`, `selfLabelling`, `journeyLegs`; it imports the gate rather than `dataset.metrics`, so there is no path around it, and resolves every metric to pre-formatted figures with no nullable value left in the type. `geo.ts` (city coordinates, `MAP_FRAME`), `india-outline.ts` and `dot-world-map.ts` (both GENERATED, never hand-edited), `countries.ts`. |
| `src/app/admin/` | Seven routes, and the NAV groups them the way the product is: *Public screens* (Site copy, Function metrics), *Data* (Companies, Taxonomy, Sub-industries, Pinned peer sets), *Release* (Publish). **"Pinned peer sets" is filed under *Data* rather than under *Public screens*, and the filing is a judgement**: it decides what a visitor is shown, which argues for the first group, but it is a decision about which companies are comparable — the same kind as tagging a sub-industry, and unusable without the company table beside it. **The labels use the product's own vocabulary and the ROUTES never move** — `/admin/business-types` reads "Sub-industries" because that is the word a visitor sees, while the route, the dataset key and the component keep their names. The nav is `role="group"` rather than a list, because `listitem` is counted page-wide by a spec where it means an impact figure. `page-header.tsx` holds `AdminPageHeader` and `AdminSection`, the two idioms every page is built from — they were hand-rolled at fifteen call sites, which is how the pages drifted to two different outer gaps and three heading densities. `login/` sits outside the `(authed)` route group; the group's layout is the guard and hosts the draft provider. A route group rather than middleware — middleware would be a second runtime to keep Node-only for no gain. |
| `src/app/api/admin/` | Login, logout, diff preview, publish. Each **re-checks the session itself** — a layout cannot guard a route handler, and a route that forgot would be silently public. |
| `src/lib/admin/` | `password.ts` (scrypt), `session.ts` (signed cookie, `server-only`), `rate-limit.ts` (two budgets), `totp.ts` (RFC 6238 on `node:crypto`, no dependency), `guard.ts` (redirect for pages, bare 401 for APIs), `publish.ts` (validate → read → diff, shared by preview and commit), `constants.ts` (exists because `server-only` throws under `tsx`). |
| `src/components/admin/` | Client-side admin UI. **`sections.ts` is the one home for what the admin is MADE OF, by name** — the seven tabs with a summary and search terms each, and the four taxonomy list titles. The nav renders it, the universal search indexes it and the taxonomy editor titles its lists from it, so a renamed tab cannot stay reachable under its old name; it holds no JSX, because the shell loads on every page and the index must not have to import an editor to learn what its lists are called. **`search-index.ts` + `global-search.tsx` are the UNIVERSAL search: an index and a palette, split so the half that fails silently is testable.** The index is every editable thing in the draft plus the seven pages; the palette is a ⌘K dialog in the shell. Rules: **it is a way IN and never a second editor**, so a result navigates and nothing is edited there; results are **capped per KIND, not overall**, so an ambiguous query cannot bury five kinds under 1,834 companies; the jump is carried by the **URL** (`?find=` seeds the target page's own filter, `?open=` opens one row's editor) because admin owns its URL, which makes it bookmarkable and the back button an undo; **`?open=` may only be set for the surfaces that read it** — four now, asserted, because the other three have nothing to open and the result would quietly under-deliver; and `peer-override` is the one KIND whose collection is legitimately empty, so the coverage test asserts one entry per row for it rather than at least one; a page entry's `terms` name the PAGE and never the fields on it, since every field is indexed on its own and pages sort first; and the index is built on **first open**, not on mount. **The trigger is "Find anything" and must never contain the word "Search"**: the company table's field is labelled `Search` and Playwright's `getByLabel` matches on substring, so a globally-present control naming it breaks four specs. **`search-box.tsx` is the ONE search control and the one filter hook, on all six editing surfaces, and it wraps the PUBLIC matcher rather than an `includes`** — so `&`, accents and punctuation fold, a second word narrows instead of matching nothing, and a one-letter query answers immediately. It decides the CONTROL and never what is searchable: each page builds its own haystack, because only the page knows which of its fields an admin would type. Companies keeps its own markup and gained memoised haystacks, one per row per draft rather than per keystroke. Two rules the pages share: a section with no match is HIDDEN and the count says how many are, since a page that silently loses two thirds of itself reads as broken; and **a filtered list may not be REORDERED** — taxonomy's arrows swap with the row above in the FULL list, which a filter is not showing. `draft-provider.tsx` autosaves locally and pins the baseline it started from; its `STORAGE_KEY` is versioned and **must be bumped whenever the editable shape changes**, because restoring a draft missing a key produces a schema error the admin cannot fix from the UI — and `tests/browser/helpers.ts` owns `DRAFT_STORAGE_KEY` and must move with it. **A DEFAULTED key is the quieter and worse case, and the restore guard is what catches it**: a draft written before one still parses on the way out, so publishing it would silently RESET that collection to the shipped values and report it as an ordinary edit. So the restore checks the keys it is about to trust by shape and drops a draft that predates them. `site-content-manager.tsx` is the one editor with no local form state and no Save button — nothing in it has a cross-field rule, so there is no second copy of the truth. **`controls.tsx` is the shared control vocabulary the HAND-ROLLED forms use** — `ADMIN_CONTROL`, `AdminField`, `AdminCount`, `AdminEmpty`, `AdminChip`, `AdminRows` — extracted because three surfaces had grown three control heights, two border tokens and a visible focus ring on only one of them; it is beside `fields.tsx` rather than inside it because that module owns whole labelled fields bound to the draft, and these are the recipes a form composing its own layout needs. **`AdminField` puts the hint in `aria-describedby` and NEVER inside the `<label>`**, which is what it was extracted to fix: the obvious shape folds the hint into the control's accessible NAME, so a select called "Industry" was really called "Industry" plus a sentence — read out before every option, and on a form holding both Industry and Sub-industry it made a name lookup for either one ambiguous. It clones its single child to inject the ids, so the call sites stay plain JSX. `peer-override-manager.tsx` is the pinned-peer-set editor. Plus the app shell, company table and editor, taxonomy editor, metric catalogue and editor, publish view. |
| `src/components/public/` | What both screens use. `tool.tsx` owns the phase machine — ask, Peer View, Function View — as component state, and moves focus to the new phase's landmark on every transition. **On the result screens that landmark is the tab panel, not the `h1`**, which is identical on both. **The focus move is an effect keyed on the phase, never a call beside `setPhase`** — the `requestAnimationFrame` version assumed React commits before the next frame, and when it did not the ref was null and the only announcement was silently dropped; it passed locally and failed on the deployed build. The effect must skip its first run. **It always takes `preventScroll`, and `tool.tsx` states the position itself**: the visitor's own offset between the two views, document top for anything involving the ask. The offset is read on the press and written back after the commit, because `preventScroll` alone still dropped to 0 when a ~2,900px document was replaced by a ~1,650px one. None of this is the banned scroll logic and every write is inert in the embed. `primitives.tsx` holds `Section`, `Stat`, chip, fact-list and provenance shapes, the number formatters, `Panel` (bordered card, radius `none`, no shadow, `PanelTone` = `plain | inverse | sealed`, plus `chip` and `headingLevel`), `Block` (same landmark contract, no container, `weight="lead"`) and `Zone` (the alternating full-bleed grounds; each screen owns its own SEQUENCE — plus `inverse-soft`, the one ground EXEMPT from the alternation, and `behind`, a full-bleed layer under the padded container, both of which exist for the close). `screen-header.tsx` owns the whole result SURFACE: `ResultSurface` (ornamented band + floating card, taking the tab bar and the panel as separate props because their order is not a caller's decision, plus a `footer` for the caption under the card), `ProductIdentity`, `HeaderFinding`, `ContextPanels`, `ViewTabs`. `charts.tsx` is the shared vocabulary, including `Containment`, `RangeBenchmark`, `MilestoneTrack`, `IndexSpread`, `IndexTable`, `BarTone`, and the five renderers with no live caller. `closing-cta.tsx` is the shared close — `ClosingCta`, `PrimaryCta`, `CloseBackdrop`, the `TILES` field and the one `CLOSE_COPY`; both result screens render it, and neither decides anything about the backdrop or supplies a word of the copy. `atlas-wordmark.tsx` is the product name drawn — supplied outlines, cropped `viewBox`, `currentColor`, sized off the ANSR lockup's cap height, and the one home those contours have; it is here rather than beside `ansr-wordmark.tsx` because both result screens' `h1` and the entry point's headline draw it. `answer-editor.tsx` is the in-place answer editor both result screens mount in `ResultSurface`'s `editor` slot — `AnswerEditor`, `AnswerEditing` and `ANSWER_EDITOR_ID`; it wraps the entry point's own `InputPanel` rather than rebuilding the form, holds no open state (each screen does) and owns none of the request (the tool does). This folder exists because Screen 2 wanted most of `screen1/primitives.tsx`. |
| `src/components/screen1/` | The public Peer View. `peer-view.tsx` (ask and answer states), `ask-hero.tsx` (the one band using the brand's real display ground, which **admits white ink only** — every muted token measures under 3:1 on it), `customer-logos.tsx`, `impact-band.tsx`, `ansr-wordmark.tsx` (drawn lockup, sized off cap height, word carried in `sr-only` so the accessible name is unchanged), `dotted-world-map.tsx` (layout only — two `<path>` elements over generated geometry; all ink, opacity, radius and edge fade in `.gcc-hero-map` and `.gcc-header-map`, so the two placements cannot diverge), `input-panel.tsx` (four controls over five fields, all four of them dropdowns and no free-text input since the company name went, its own field primitives because a public form and a dense internal tool want different densities; `AskOptions` bundles the four option lists because the form is mounted in two places now, and `submitLabel` is the one thing the answer editor's copy of it changes), `select-field.tsx` (the widget all four use, and the one place an option carrying children turns the popup into a tree; `.gcc-select-*` in globals.css carries both shapes and the measured room table), `evidence.tsx` (comparison grid, containment layers, largest-centres chart, function tags, scale strip; `CityCells` has two consumers, and `JumpToClose` is the count line's arrow), `city-map.tsx`, `snapshot.tsx`, `fortune-badge.tsx` (`FortuneBadge`, the one place the badge's size is decided), `copy.ts` (**every DERIVED visitor-facing sentence, and the reasoning behind every wording** — the static strings are `siteContent.copy` now and each constant here reads its key, so there is one shipped value per string), `use-frame-height.ts`. **Both ranked TABLES are gone, and with them the focusable horizontal scroller.** |
| `src/components/screen2/` | The public Function View. `function-view.tsx` (screen + four tabs, on the Radix Tabs primitive rather than the registry wrapper — 44px triggers, no `transition-all`, no shadow; cuts the already-packed card list where widths change). `metric-card.tsx` is layout only — selects no chart and does no arithmetic; owns the shape-only placeholder (static, hatched, uniform, so it reads as sealed rather than loading), `CardMeta`, and the capability grid's row glyphs keyed by LABEL, the single place this screen reads an admin-editable string, guarded all-or-nothing. `summary-figures.tsx` (`SummaryFigures` + `scalarCells`), `zones.tsx` (`TabZones`), `graduate-card.tsx` (`GraduateOutput`) and `milestone-card.tsx` (`ScaleMilestones` + `ANSR_MONTHS`) — both drawn by operations AND HR, here rather than in either file because two views of one shared metric must not be two pieces of markup, and because the ANSR rail's supplied figures must have one home, `hr-view.tsx`, `ops-view.tsx`, `fin-view.tsx` (the three composed tabs; `OpsPanel` has no gated metric and owns `summaryCells`, which selects rather than computes; `FinPanel` refuses most of its own reference and owns the tier spread and location grid). `copy.ts` holds `FIGURES_HEADING`, `SOURCE_LINE`, `VELOCITY_HEADING` (one heading shared by two tabs, a constant rather than the same words typed twice), `heldHeading`, `indexedNote`, `METRIC_NOTES`, each composition's own strings, and six sentences exported, unit-tested and rendered nowhere. |
| `src/components/ui/` | shadcn/ui, unmodified from the registry. On-brand because `globals.css` maps the contract variables onto brand tokens. |
| `data/` | `dataset.json`, pretty-printed on purpose — a reviewable diff is the reason there is no database. `verify-baseline.json`, updated only by `data:verify -- --accept`. Both tracked. |
| `public/logos/` | The customer strip's marks, twenty-two. It is also where a committed PEER mark would point, one file per trademark and never two, but `COMPANY_MARKS` is empty so nothing else reads this directory today. Eighteen are real vectors; four arrived as a base64 raster inside an SVG `<pattern>` and are re-encoded to PNG at 2x display height. **Check a new logo's bytes, not its extension.** Each file's `viewBox` is its own INK bounds, measured by rasterising and scanning alpha — an artboard is routinely padding (Hudson's Bay was 578x444 around 446x297) and `getBBox` ignores strokes and filters. Contours are carried over verbatim; nothing is traced. `companies/` is the subdirectory for a mark whose company is not in the strip, and the strip's `src` pattern excludes it. |
| `public/badges/` | Third-party accreditation marks, and neither `public/logos/` nor `public/brand/` is the right home for one — the first is companies' own marks, the second is ANSR's own adapted motifs. One file: `fortune-global-500.svg`, a VECTOR supplied by the project owner, with the artboard cropped to the lockup's own bounds and no outline redrawn. The 111×120 raster it replaced is deleted, not parked — two copies of one trademark is how the two placements start drawing different marks. |
| `assets/brand/` | Brand source of truth; `tokens.css` is authoritative. |
| `public/brand/` | Motifs already adapted for a placement, served as static files. Derived output — each reproducible from `assets/brand/` with a `brand_asset.py` command recorded beside its use. |
| `.tastemaker/` | `style-lock.md` — **both public screens' visual decisions and the reasoning behind them**, including every rejected alternative. Restates no token values; `docs/design-reference.md` and `tokens.css` outrank it. |
| `.impeccable/` | Untracked working directory of a skill that is no longer installed. `critique/` holds one dated snapshot, kept as a local artifact. |
| `tests/unit/` | Vitest, node environment, no jsdom. Pure and server-side logic. `vitest.config.ts` resolves the `react-server` condition, which is how these import a `server-only` module at all. |
| `tests/browser/` | Playwright against a real `next build && next start`, on its own dataset copy. Covers what a unit test structurally cannot: draft lifecycle, autosave, restore after reload, stale-baseline conflict, focus behaviour. **Serial, one worker** — the server holds the rate limiter and dataset cache in memory. **The whole suite is single-tenant and TWO CONCURRENT RUNS CANNOT COEXIST**: one port 3210, one fixture copy, one `test-results/`, and `next build` writes the `.next/` a dev server may be holding. A second run started midway through the first fails the first with `page.goto` timeouts and `ENOENT` on trace artifacts, which reads as a product bug and is not one. Reads, `tsc`, `npm run test` and `brand:lint` are safe in parallel; `test:browser` and `build` are not. Numbered specs run in reading order; `6-lockout.spec.ts` exhausts the limiter and must stay last. The `public` project runs first, before the publish spec rewrites the fixture. **Each project's `testMatch` is narrow, so a spec numbered outside all of them silently never runs.** `helpers.ts` owns `DRAFT_STORAGE_KEY`, `choose()`, `chooseSubIndustry()`, and `band()` / `expectBand()`. **A public spec must never locate a band by its heading text** — twenty did, and a copy pass broke all twenty. The id is the contract; `expectBand` accepts either `aria-labelledby` or `aria-label`, and what must not pass is a band with neither. Peer landscape ids: `snapshot`, `peers`, `industry`, `largest`, `functions`, `map`, `scale`. Screen 2: `function-metrics`, plus `hr-velocity`, `hr-analysis`, `hr-held`, `ops-velocity`, `ops-supporting` — prefixed by function because two composed tabs draw the same section under the same heading. `0-search.spec.ts` drives the dropdown FILTER, and it takes a fresh load per industry — from `md` the cascade pane sits beside the list so both are clickable, but below `md` the second one is behind a drill-in. |
| `scripts/` | Run by hand, never at request time. Python: `brand_lint.py`, `brand_asset.py`, `brand_status_analysis.py`, `inspect_xlsx.py`, `build_dot_map.py`, `build_india_outline.py`. Node: `crop-logo.mjs` (`npm run logo:crop`), which crops a supplied logo to its own ink bounds and prints the pair to record — node rather than python because it needs a real rasteriser, and playwright is already a dev dependency. TypeScript via `tsx`: `import-seed.ts`, `verify-data.ts`, `admin-hash.ts` (mints the env values from a TTY prompt so the password never lands in shell history), `business-type-map.ts` (601 sub-industry mappings + 568 per-company decisions, keyed `industry||name` because company names are not unique even case-insensitively), `check-business-tags.ts`, `check-company-types.ts`, and the two analysis scripts `sweep-floor.ts` (worthless if its self-check does not say SOUND) and `proto-industry-tag.ts`. Rerun them rather than re-deriving their numbers. |
| `.kiro/` | `steering/` — always-in-context rules, three files. `hooks/` — `brand-guard` (PostFileSave → `brand_lint.py`) and `handoff-refresh` (Stop → rewrite the handoff). `settings/` — MCP config, permission-guarded against agent writes. `skills/` — one skill, `ansr-brand-assets`, which is ours; **untracked**, and `skill-sources.json` pins the 135 removed third-party packs for restoration. |
| `docs/` | Reference, read on demand. Not steering. `brief.md` (read it, not the image), `data-audit.md`, `business-types.md`, `design-reference.md`, `ansrx-visual-language.md`, `traps.md`, `copy-audit.md` + `copy-audit-charts.md` (what each visitor-facing string was judged to be, and why). |

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
