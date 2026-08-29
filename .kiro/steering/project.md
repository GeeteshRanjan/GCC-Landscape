# GCC Landscape — product & architecture invariants

Durable truth. Always in context. Change only with a stated reason, and update the same day the
code changes — a stale line here silently corrupts every session that follows.

Companions: `design-stack.md` (tokens, brand), `skill-router.md` (which skill to run),
`handoff.md` (where we are right now). Deep reference lives in `docs/` and is read on demand.

## What we are building

A self-serve web tool on ANSR's site. A visitor enters a few facts about their company and gets a
personalised picture of the India GCC market: what comparable companies already do here, and the
function-level metrics they would care about. Aim is to inform, and to earn a conversation.

**Audience:** CIO / CTO / COO / HR and finance leaders at large global companies, evaluating or
expanding an India GCC. Arriving from ansr.com or outbound campaigns. Not analysts, not students.

Full transcription of the source brief: `docs/brief.md`. Read it before building either screen.

**Inputs — the CONTRACT has six and the FORM asks five, deliberately.** Global headcount was cut
once nothing consumed it; hold the set to the same standard. Sub-industry is the only optional
one asked: left unanswered the peer set is byte-identical to what the others produced, so it adds
precision without adding a required field.

**"Sub-industry" is the term everywhere a visitor or an admin can read it**, at ANSR's request. It
replaced "line of business" in copy, labels and test names; the DATA is untouched — the field is
still `businessTypeId`, the collection is still `dataset.businessTypes`, and `business-tags.ts`,
`business-type-catalogue.ts` and `docs/business-types.md` keep their names because they are about
the vocabulary rather than about what a visitor is asked.

**Six fields, five asked, FOUR controls — sub-industry is a level inside the industry dropdown,
not a field of its own.** ANSR asked for it: one act instead of two, and one fewer cell to fill.
The field on `PeerViewInput` is unchanged and still optional, so nothing about matching moved.
Three consequences that hold together: the industry popup is a `tree` rather than a `listbox` (a
listbox whose options contain options is neither), there is no disabled-until-answered control and
therefore no live region announcing that one became usable, and **no field LABEL on the form is
marked "(optional)"** — the marker only ever belonged to the control that needed its disabled state
explained, and on a label it talks visitors out of answering. The one "(optional)" that exists is
inside the industry popup, on the affordance line describing the second level, which is a different
thing: not a label, and about a level nothing else on the form announces. Restoring a separate
field is a UI change, not a data migration.

**That level is a CASCADE, not an indent, and the panel's height is the reason.** Pressing an
industry commits it and opens a second pane BESIDE the list; expanding rows inside the list grew a
popup that already overhangs the form card a third of the way into the customer-logo strip, and
changed its height under the pointer. **The pane opens TRAILING-side — parent left, child right —
at ANSR's request, and that costs width**: the room beside the field is `layoutWidth / 2 − 400`
above 1280, nothing may clamp the pane to it at runtime (reading the viewport is what the iframe
forbids), so the widths come from a measured table and below 1440 the pane covers the parent list
as a drill-in instead. Five things hold together: the panel is exactly as tall open as closed, the
pane never gives the framed document a horizontal scrollbar (both pinned by specs, at seven
widths), the pane is `aria-owns`-ed by its parent row rather than nested in it, every row therefore
carries an explicit `aria-label` (an owned subtree lands in the row's computed name otherwise), and
the pane's leading `All of {industry}` row is the exit that keeps the broad answer — because the
press that opened the pane deliberately does not close the panel. Re-opening the control does not
re-open the visitor's branch, since below 1440 that would hide the filter behind a pane nobody
asked for. The measured table, the rejected geometry and the rejected 1320 threshold are in
`.tastemaker/style-lock.md`.

**Existing GCC status is the sixth, and ANSR asked for the question to be removed.** The FIELD was
kept: `gccStatus` still reaches the server, still branches `framing()`, and is supplied by the form
as the `evaluating` constant — see `ASSUMED_GCC_STATUS`. `evaluating` because its copy is the one
branch true regardless of who is reading (the peer count in their own industry) rather than a claim
about the visitor. Two consequences that must hold together: **neither screen's fact summary echoes
"India today"**, because showing a constant there would be the tool telling a visitor what they said
about something it never asked; and the branching stays covered in `tests/unit/screen1.test.ts`,
which is where the input can actually be varied. Restoring the question is a UI change, not a data
migration.

**Both result screens show the same four answers, from one component, as quiet pills with ONE
control beside them.** Three shapes have been tried and the reasoning for the current one is worth
keeping. They began as a run of `dt`/`dd` pairs beside one "Change these details" button, which made
a visitor notice a wrong revenue band in a caption and then find an unrelated control. They became
four full-width chevroned buttons, one per answer — and that was worse in a way only the render
showed: all four went to the same place, so there were four affordances for one destination, the
chevron promised an in-place editor that does not exist, and the group read as four dropdowns the
visitor was expected to operate, directly under the product name. They are now pill-shaped read-only
tags with no hover state, and the way back is one button labelled **"Change my answers"**. The route
itself is unchanged and still reaches the form with the answers intact; Screen 2 still has it, having
had none before the second shape.

Company name (when given), industry, headquarters and revenue band — every one an answer they typed.
**"India today" is not among them and must not be**, and Screen 2 was wrong about this for months:
the peer view dropped it correctly and the function view kept it, so a visitor crossing between them
in one state change was shown a constant read back as their own answer on the very next screen. `companyName` in `src/data/screen1.ts` is the single definition of "did they type one",
because three inline trims is how a blank-but-not-empty name personalises one screen and not the
other.

| Input | Control | What uses it |
| --- | --- | --- |
| Company name | text | Personalises copy only |
| Industry | select | Primary peer match key, and a hard boundary |
| Revenue band | select, the seven bands in the data | Peer similarity axis, weighted below business |
| HQ location | select, **every country** | Sort preference on the peer set |
| Existing GCC status | **not asked** | Branches the framing. Constant; see above |
| Sub-industry | **cascades out of industry**, optional | Business similarity — the primary ordering signal |

Never ask for a revenue figure. The data holds bands, so the input is a band.

**An industry abbreviation is expanded ONCE, where the spreadsheet is read.** `CPG` reaches the
dataset as "Consumer Packaged Goods" via `canonicalIndustry` in `normalize.ts`, called inside
`readRows`. Renaming the published dataset alone is the obvious move and is the broken one:
`business-type-map.ts` is keyed `industry||subIndustry`, so the next import would look up
"Consumer Packaged Goods||CPG - Ice Cream" against a table written as "CPG||…", find nothing, and
silently untag all 24 companies. Untagged is a safe state, which is exactly why nobody would
notice. Only expansions belong in that alias table — merging two industries or fixing a typo
changes who is compared with whom and belongs in the taxonomy editor, where the rename cascades
and the diff records it.

**Two country lists, doing two jobs, and the split is load-bearing.** `taxonomy.hqCountries` is
DERIVED FROM THE COMPANIES by `buildTaxonomy` — so it is the list we have evidence about, it is
what peer matching sees, and anything added to it by hand is silently deleted by the next import.
`HQ_COUNTRIES` in `src/data/countries.ts` is what a VISITOR may pick: every country, because a CIO
who cannot find their own in the dropdown has been told the tool is not for them — the same failure
that killed company-name autocomplete. **Nothing about matching changed and nothing needed to**: HQ
is a sort preference and never a filter, so an unrepresented country contributes no ordering signal
and the existing skew toward represented countries is preserved rather than diluted. `hqCountry` is
therefore the one input validated against the taxonomy UNION the world list; every other field is
validated against the taxonomy alone, because the others are keys the matching reads.

**Dropdown order is derived from company counts, with one deliberate exception.** Industry leads
with the largest by count and HQ with the twelve largest (91.4% of companies), then alphabetical, as
two groups. A hardcoded list of "important" values is a second thing to maintain and is wrong the
first time nobody remembers to.

The exception is `PINNED_INDUSTRIES` — Retail and Consumer Packaged Goods sit in the leading tier
regardless of count, because ANSR expects enquiries from them out of proportion to how much of the
researched dataset they occupy (Retail is eighth by count, Consumer Packaged Goods sixteenth).
**Anticipated demand and dataset composition are different things, and only ANSR knows the first.**
Pinned entries still sort by count inside the tier. Keep the list short: every addition is a claim
the data is wrong about what visitors will pick.

**`revenueBands` is never tiered or sorted** — its order is the matching contract.

**The three dropdowns are a custom listbox, not `<select>`, and the industry one is a tree.** A
native select's open menu is drawn by the OS and cannot be styled, which left the form ending in a
macOS Aqua popup. It is deliberately NOT built on Radix Select: that portals its content with
`position: fixed`, and inside a frame sized to its own content a fixed element anchors to the wrong
viewport. The panel is absolutely positioned inside the field, always opens downward (flipping would
require reading the viewport), and carries a filter above 12 options. **The popup's role is read
from the data** — an option carrying children makes it a tree — so the two cannot disagree and an
industry with no sub-industries mapped simply has nothing to open. The regression is on touch,
where the native wheel picker was better; the filter is the compensation. Admin keeps native
selects — only the entry point changed, and its specs drive both shapes through `choose()` and
`chooseSubIndustry()` in `tests/browser/helpers.ts`. **`choose()` handles the industry control's
stay-open behaviour by then taking the `All of {value}` row**, so a spec never has to know which
shape it is driving.

**Two screens.**

*Screen 1's ask state — the entry point.* Five bands read as one page: the teal gradient hero
(centred, two text elements, no control), the white form card overlapping the hero's bottom edge,
the pale-teal band its lower half sits on, a scrolling strip of ANSR customer logos, and a dark band
of ANSR's own impact figures. The last two are evidence about ANSR rather than about the dataset,
which is what keeps them clear of the no-invented-figures rule; the logo strip must never imply
those companies used this tool. Composition detail and the measurements behind it are in
`.tastemaker/style-lock.md`.

*Screen 1 — Peer Landscape.* **A compact teal context area, then SIX ZONES of alternating ground,
each holding one or two bordered cards.** Not seven full-bleed bands: that shape was a landing page —
a 200px display hero stating the finding, then seven sections each with its own ground, 80–112px of
air and a 48px heading — and it read badly in the ninety seconds this audience gives it. The first
figure was below the fold, no two pieces of evidence could be compared side by side, and the last two
bands were navigation and a CTA rather than evidence.

**Nor is it the one flat white surface that replaced those bands.** Eight cards, every one a white
rectangle with a hairline border and a 16px heading, stacked down one white page: correct, dense, and
cognitively flat — nothing told the eye that the comparison set and the national scale proof are
different kinds of claim. A zone is a colour change at a boundary and nothing else, so the sections
inside it keep card density and two of them can still share a row. The grounds run mint, white,
near-white mint, white, mint, white, so no boundary is invisible and no two adjacent zones match.
Cards carry one of four **tones** — plain, tint, accent, inverse — applied once per class of evidence
rather than alternated. Reasoning and the rejected alternatives are in the style lock.

The teal area carries three things: `ANSR. GCC Intelligence` as the `h1`, **the finding as a
non-heading display line**, and the visitor's four answers as pills with one "Change my answers"
button. The finding came back because the band was otherwise a lockup and a row of answers — chrome
and no content, so a visitor who had just submitted a form was told which product they were in and
what they had typed and nothing about the result. It is deliberately not a second heading: the `h1`
is the product and is shared by both result screens. Screen 2 does NOT carry it, because its content
surface already opens on the same claim as a real `h2`. At the band's foot sit the two view tabs,
whose selected cell is the same white surface as the content below it.

Then SNAPSHOT — four figures before any card begins, so the result is legible without scrolling.
**Every one is a property of the INDUSTRY**: its company count, the mean centre size, the spread of
cities, the leading one. The previous strip led with the peer count and the largest peer centre,
which are properties of a five-company set our own matching chose — a statistic about the tool rather
than about the ground being sized. The snapshot introduces no figure a card does not evidence, it
holds four cells whatever the result, and a cell the data cannot supply says "Data unavailable"
rather than showing a dash, a zero or an estimate.
1. Up to five comparable companies already running India GCCs — cities, year established, India
   headcount as a band. **A packed grid of floating cards, and there is no lead card and no table.**
   Both shapes were tried and both failed for a stated reason. A full-width lead card carrying the
   closest match at display size left that company the one in the set that could not be compared
   with anything. A five-row table fixed that and was a spreadsheet dropped into a brand page: four
   of its five columns held a chip list, a year and a band rather than anything a reader ranks down
   a column, no cell could carry a figure at a size worth reading, and on a phone the column a
   reader came for was behind a horizontal scroll. Cards give each company its employee band at
   24px, and rows are PACKED — five become three then two, four become two and two — so no row is
   left part-empty. **The relevance order is carried by a rank badge on each card**, which is what a
   table's row position did for free; the "Closest comparison" chip is gone at ANSR's request.
   **Headquarters is not shown and the field is dropped with the column** (see below).
2. **The industry count, as three OVERLAPPING bars on one z-stack** — the national base, the
   industry inside it, and inside that either the visitor's sub-industry or the comparison set
   itself. Requested by ANSR in that exact shape, and it beats the stepped tracks it replaced for
   one reason: stepped tracks put a gap between rows, and a gap is the one thing the eye reliably
   reads as separation, which is the opposite of "inside". It is still not a divided bar — 5 is
   inside 189 which is inside 1,834, and those figures sum to nothing. **Always three layers**: two
   is the shape it looks and says least in, so the comparison set substitutes for an unanswered
   sub-industry. The bars step down from a shared top edge to give each label an exposed band of its
   own; concentric bars collided at phone width, which is a function of the ratio between two real
   figures and therefore has no safe viewport. This is what turns the thin-peer case from a weakness
   into evidence.
3. **The largest companies in their industry with an India GCC**, as an aspirational anchor. We hold
   revenue *bands*, not revenue, so nothing can be ranked by revenue. The rule is: take the highest
   band that has members in that industry and fill from there downward, ordered by GCC size. Three
   industries have nobody in the top band, so the panel must degrade rather than assume one exists.
4. The Fortune Global 500 count and summed professionals, as scale proof — across all of India, not
   just the peer set. **The strip's source-and-method block is gone at ANSR's request** and nothing
   replaced it, which is the one removal in that pass with no compensating line: the professionals
   figure is a sum of headcount BANDS and the page no longer says so, and there is no as-at date.
   `scale.asOf` is still on the view model, so restoring the date is one line.

*Screen 2 — Function View.* Tech, Operations, HR, Finance. Internally the metrics are organised by
four lenses — supply, speed, place, cost — but **the lens names are an internal filing system, not
public UI labels**. The rendered grouping and copy on the public screen are a design decision, made
per screen. Admin does show them, labelled as internal, because that is what a filing system is for.

**The four tabs are four VIEWS of one national picture, not four datasets.** The tool is not claiming
that a COO looks at a different India from a CTO; it is putting in front of each of them the figures
they are asked to justify. So a metric that appears on more than one tab carries **the same figure on
every one of them** — bench strength, graduate output, leadership depth, time to backfill, time to
first hire and the scale curve are all shared. They are authored **once** in
`src/data/metric-catalogue.ts` and spread onto each tab with a different id, and `data:verify` carries
the property as an **invariant**: metrics sharing a title must be identical apart from `id` and
`functionArea`. There is no legitimate edit that makes two views of one number disagree. Every shared
figure is a technology-role figure and the cards deliberately do not say so — re-labelling each one
"for technology roles" would be noise over the point.

The brief's author used six lenses, adding Fit and Optional. Both collapse into supply: Fit is
comparative capability supply across delivery locations, and the Optional diversity block is the
composition of the workforce on offer. Nothing from the brief lost a home, and the four are the
contract — see `METRIC_LENSES` in `src/data/schema.ts`.

**A metric is a shape plus, separately, its numbers.** Structure (`scalar`, `range`, `breakdown`,
`matrix`) is authored once; `value` is nullable and arrives later. That split is what makes two
things work at once: the catalogue can ship as definitions with no invented figures, and a gated
metric has a shape to render a placeholder from without a value existing anywhere near the browser.
`alignValue` re-fits the numbers when the shape changes, in one tested place, so the form cannot
build something the publish gate then rejects for a length mismatch.

**`atLeast` marks a metric whose figures are a floor**, and it is part of the definition rather than
the value — "8.7 million or more" is a claim about how the figure was arrived at, and it holds whatever
number is entered next month. Every figure the metric produces renders with a trailing `+`, applied in
one place in `src/data/screen2.ts` so a parts list cannot silently drop it and make a stronger claim
than the data does. Refused on a rating, since an ordinal has no "or more", and dropped by the gate,
where it would qualify a figure that is not there.

**India heatmap.** Built from the city lists in the company data — density of GCCs per city, filtered
to the visitor's industry. Not a separate dataset. Dots on India's own outline (invariant 8), with dot
area and fill depth both tracking the count. **The one ambient animation on it is a halo BEHIND the
leading hubs, never the dot** — a dot's radius is the figure, so animating it animates the claim.

**Every mark on a chart carries its figure in text beside it, and nothing is behind a hover.**
`src/components/public/charts.tsx` is the vocabulary both screens draw with, and this rule is why
there is no charting library under it rather than a preference about dependencies. A tooltip-driven
chart puts the number one pointer-hover away, which on a phone is nowhere — and the tool is embedded
in a marketing page a CIO opens on a phone. It is also why every mark is `aria-hidden`: a mark is a
second reading of a figure already present, so hiding it loses nothing. `bklit-ui` is a good library
and hover-first; that is the mismatch.

Colour inside a chart is **ordinal only, on the teal ramp — darker means more.** That survived the
palette swap for a reason worth keeping: an ordinal ramp needs monotonic lightness, not separable
hue, and the four-anchor ramp is monotonic in Oklab lightness end to end. What it still does not
supply is categorical hue — 9 of its 36 step pairs sit under the ΔE 0.15 "clearly different"
threshold and the whole dark end is at 0.043–0.046 — so any distinction that must survive greyscale
is carried by form: fill against outline, or a labelled step count. **`--ansr-teal-bright` is not
available inside a chart on a light ground at all**, at 2.44:1 on white.

**Which chart draws a metric is a property of the DATA, decided in `screen2.ts`, never in the
component.** `breakdownDisplay` and `gridDisplay` own it; `metric-card.tsx` draws what it is handed.
No rule may parse a label — entry and axis names are admin-editable, so a rule that read "To 500
FTEs" to find the number 500 would silently change a chart the first time somebody renamed a part.
Three of those rules exist because the obvious version drew a falsehood, and each is pinned by a test:

- **An index grid shares ONE axis across every row, with the base drawn as a rule.** Scaling each row
  to its own maximum made "India = 100" the shortest mark in a row where the United States drew a
  full one: on a cost table the eye reads the long bar as the winner, so the numbers were right and
  the picture said the opposite. The base column is found from the cells — the column identical in
  every row — never parsed out of `indexBaseline`, which is free text an admin types.
- **Direction lives in the metric's own `indexBaseline`** ("Tier 1 cities = 100. Lower is cheaper."),
  because `format: "index"` says nothing about whether up is good and only the author of a metric
  knows. A chart that guessed would eventually put the arrow on the wrong end of a real number.
- **Nesting one part inside another requires the two to share a `unit`.** Without that test, 1,400
  meetup groups and 120 conferences a year were drawn as conferences *inside* meetup groups. A shared
  unit is the definition's own statement that two parts measure the same kind of thing; that metric
  declares none precisely because they do not.

**A bar is dropped where it would mislead, and the axis is never truncated to rescue it.** 99.95%
against 99.5% draws as two identical bars on an honest axis and as a fabricated difference on a
moved one, so the figures carry it alone. A cost index clusters at the top of its own scale, so those
charts draw a visible zero tick — a truncated axis is exactly how one would be faked.

**A part-to-whole claim gets one divided bar, never a row of bars.** Four bars against a 100% axis say
"each of these is some of it"; one divided bar says "these four are all of it". The same reasoning
puts Screen 1's industry count on a proportion split: five named peers as the leading slice of
fifty-nine is what makes them read as a selection rather than as the supply, which is that block's
entire job.

**Order is never re-sorted by value.** The catalogue's own orders are meaningful — graduate output
groups by discipline family, latency runs outward by distance, milestones run by size — and sorting
would destroy all three to buy a comparison the shared axis already provides.

**Card width is weighted by what a card draws** (`metricWidth` → `third | half | full` on twelve
columns, panel `items-start`). Both halves are load-bearing: on a two-column stretch grid a single
figure beside a nine-part breakdown rendered as a card four fifths full of nothing. Ordering is by
width, so narrow cards fill a row before wide ones begin.

**Every card grid on the public screens then packs its rows so none is left part-empty**, because an
empty cell in a grid of evidence reads as a card that failed to load. **Three grids do it now**, each
on a grid whose column count divides by both two and three: Screen 2's metric panel (`packWidths`),
the ask form (`FieldProps.span`) and Screen 1's comparison cards (`rowPlan` / `layoutFor`). The
packing may only ever **widen** a card, never narrow or reorder one — a narrower card misrepresents
what it draws, and the order carries meaning. One case stays part-empty on purpose: a lone scalar on
Screen 2, since one figure across twelve columns is the artefact the weighting exists to prevent.
Reasoning and the rejected alternatives are in the style lock.

**Widening a comparison card changes its INTERIOR, not just its box.** Five peers pack as three
thirds then two halves, and a half-width card holding a third-width card's interior is 40% empty —
which is the same artefact the packing exists to prevent, one level down. A wide card lays its figure
and its footer in two columns instead, and that split is gated on `lg`, which is the breakpoint the
span itself is gated on: below it the grid is two equal columns, no card is wide, and a two-column
interior squeezed a five-digit range onto two lines.

**The function-tile grid is the case where the column count is decided by the ITEM COUNT.** Eight
functions may take two columns or four and never three, because 8 does not divide by 3 and the last
row would lose a cell. Four is too narrow for "Business operations and shared services", so it is
two — which is also what brings the card within about 20px of the containment chart beside it.

**Screen 1's analytical row is three fifths and two fifths, not halves.** The containment chart is a
wide chart; the function list is eight short lines that tile two to a row. The row is `items-start`,
or the shorter card is padded out to its neighbour's height and renders with a band of empty white
under its own content. **The largest-centres block is a full-width vertical stack rather than a
column in that row**: it is a RANKING, and a ranked stack with a display numeral and one shared bar
axis is what a ranking looks like — two grids of company cards under two headings is what makes a
page read as padded.

**A ratio derived from headcount band midpoints is honest as a bar's length and never as a published
figure.** `PeerCard.sizeShare` is the single definition of it, always against the largest member of
the set that card came back in — the two Screen 1 blocks that compute it are scaled separately,
because sharing one peak would flatten every peer bar whenever the industry happened to contain an
Amazon. The visible figure stays the band.

**Only the largest-centres block draws those bars now.** The comparison cards dropped theirs at
ANSR's request, along with the axis note that named the company at full width — each card carries its
band as a 24px figure instead, which is the reading the bar was a second copy of. The largest block
keeps both, because "largest" IS a magnitude and a stack of five bands with no marks is a list rather
than a ranking. Its bar column is fixed-width on desktop so five bars share one axis; sized to its
own figure, each row would draw its own axis and the set would look comparable without being so.

**Cut from the brief, deliberately:** the editable peer set, and "India GCC as a % of global tech
workforce". Do not reintroduce either.

**Built, then cut: company-name autocomplete.** Typing a name offered matching companies and prefilled
industry, revenue band and sub-industry. It worked, it shipped nothing to the browser it should not
have, and it was still wrong: the suggestions could only ever come from our own 1834, so a visitor at a
large company we have not mapped types their name, sees an empty dropdown, and reads it as "this tool
does not know who we are" — in front of the exact audience the tool exists to impress. **The absence of
a suggestion is itself a message, which is why no amount of care in the mechanism fixes it.** Do not
reintroduce it against this dataset. It becomes reasonable only against a data source that covers
companies we have not researched, and at that point the empty state is a genuine "not found" rather than
a statement about ANSR's coverage.

**Lead capture is out of scope.** The tool informs and earns a conversation; the CTA links out to a
separate landing page. No form, no email field, no stored visitor input anywhere in this codebase.

## Invariants

Violating any of these breaks the product, not just the build.

1. **Gated values never reach the visitor's browser.** Fully loaded cost per FTE by role and level,
   HR cost per employee served, the cost-vs-ecosystem-depth trade-off, and the workplace-cost
   gradient are server-side omissions rendered as shape-only placeholders. A CSS blur over real text
   is a leak. Absolute per-head salary figures are never shown, gated or not.

   **`publicMetric` in `src/data/metrics.ts` is the single enforcement point, and the only way a
   metric may cross.** Its gated branch has no `value` or `structure` field for a number to travel
   in, so the compiler carries the invariant rather than whoever writes the component. It also drops
   the row and column names, the unit, the index base and the as-of date: a row label beside a
   visible axis can imply the answer, and a placeholder needs only cardinality to be the right size.
   Both branches drop `lens` and `note`.

   Gated metrics *are* edited normally in admin, and that is not a contradiction — admin is
   authenticated and already holds the whole dataset, exactly as it does for companies. The gate is
   on the way out.

   Two ways the schema makes a leak impossible rather than merely discouraged: there is **no
   currency format**, and a currency-looking `unit` is refused, so no absolute money figure can be
   expressed at all; and a **gated metric's title and question may not contain digits**, because
   both do cross to the browser and omitting the value is no help if the sentence beside it gives
   the answer away. `gated` is not an admin control — the provider re-pins it on save.
2. **The free layer must stand alone as credible.** Peer proof carries it. If a screen only makes
   sense once the gate is paid, the free layer has failed.
3. **Peers must be defensibly comparable.** Never pad a thin set with a company the visitor can see
   is wrong — one bad peer discredits the whole card. When the set is short we say so plainly and
   reframe it as first-mover ground, in one short line — then the industry count carries the weight.
4. **Absolute per-head salary figures are never shown**, in any lens, gated or not. The brief is
   explicit. Cost is expressed as indices, spreads, growth rates and relative positions.
5. **Excel is a seed, never a runtime dependency.** Nothing reads `.xlsx` on request, and after the
   first import admin is the system of record.
6. **No raw hex, magic pixel, or ad-hoc duration.** `assets/brand/tokens.css` governs;
   `scripts/brand_lint.py` enforces. The palette itself comes from `Group 149.svg`, measured in
   `docs/ansrx-visual-language.md`; Branding_Palette.docx is superseded and its values are now
   what the lint rejects. See `design-stack.md`.
7. **The public surface never hints that an admin exists.** No login link, no admin nav, no
   "sign in". Admin is reached by typing the URL and is behind real auth — an unguessable path is
   not access control.
8. **Every India outline in this project comes from Natural Earth's India point-of-view admin-0
   set, and nothing is ever traced, approximated or hand-authored.** India's borders are contested,
   so a guessed outline states a border position the tool has no business stating — under ANSR's
   brand, in front of the client's own prospects. A dotted or filled silhouette IS a boundary
   claim, so there is no neutral rendering available; what is available is a claim whose point of
   view is stated rather than implied, and that is India's own, drawn under India's brand. It is
   the most defensible position, not a neutral one, and it is on the list for ANSR's sign-off.

   **Two surfaces draw it, from one file, and the shared source is load-bearing.** The ask hero's
   dotted world map (`scripts/build_dot_map.py` → `src/data/dot-world-map.ts`) and the Screen 1
   density map's filled outline (`scripts/build_india_outline.py` → `src/data/india-outline.ts`).
   Mixing a default-view layer with an India-view one would paint the disputed strip one colour
   while the neighbour's own polygon still claimed it, and drawing two different Indias on two
   screens of one page is the hardest thing here to defend. Both generators cache the same 13 MB
   public-domain geojson under `.cache/` and commit only derived path strings.

   **What the density map still may not do.** Positions come from `CITY_COORDINATES` in
   `src/data/geo.ts` — geographic fact, in code rather than in the dataset, so the taxonomy editor
   cannot produce a city plotted somewhere invented. The frame is fixed and may never be fitted to
   whichever cities an industry happens to occupy: a fixed frame is what makes a thin industry look
   thin. **The frame must also contain the whole of India**, which is not a composition preference
   — it ran to 90°E and 32°N for months, which holds every GCC city and cuts off the northeast and
   Ladakh. Harmless while nothing was drawn, a boundary claim by omission the moment something is.
   `MAP_FRAME` in `geo.ts` and `INDIA_OUTLINE_FRAME` in the generated file are the same numbers
   written twice and a unit test asserts they agree; a frame that moves on one side only puts every
   dot in the wrong place on a correctly drawn country.

   **The visible caption is GONE, at ANSR's request, and this is the one open conflict in this
   file.** It read "Boundaries as India states them, from Natural Earth's India point-of-view
   dataset." Everything above still holds — the outline is still generated from that dataset, both
   surfaces still share one source, nothing is traced — so the claim drawn has not changed. What
   changed is that the page no longer STATES whose claim it is, which is the specific thing the
   second paragraph above argues for: a claim whose point of view is stated rather than implied. A
   browser spec now asserts the line is absent, so restoring it is a decision rather than an
   accident, and it is the first item on the blocked list in `handoff.md`.

## Stack

Decided. Reasons recorded because they constrain later choices.

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | **Next.js (App Router), TypeScript**, at the repo root | Three server needs, none optional: gated metrics must not be serialized to the browser, admin needs auth and a write endpoint holding the publish credential, and peer matching filters the dataset server-side. A Vite SPA would need a second deployable to do any of it. Not chosen for SEO — the iframe means nothing here is indexed as a destination. |
| Styling | **Tailwind v4 + shadcn/ui** | `@theme` consumes `tokens.css` directly, no duplicated palette. |
| Data | **Versioned JSON in the repo. No database, no bucket.** | The dataset is 326 KB, 33 KB gzipped, and every query is "filter by industry and band, then sort". Publishing happens roughly monthly in one batched sitting, so a rebuild per publish costs nothing — and git then supplies version history, diffs and rollback for free, instead of us building a snapshot-pointer mechanism to reproduce them. |
| Auth | Single admin password, scrypt-hashed in env, signed httpOnly cookie, rate limited, optional TOTP | Real auth without a database. `ADMIN_PASSWORD_HASH` uses `:` separators and base64url, **not** the conventional `$` and base64: dotenv expands `$N` as a variable reference, so a `$`-separated hash arrives truncated and a correct password fails. Do not standardise the format back. Rate limiting has **two** budgets — per IP and per process — because `x-forwarded-for` is attacker-supplied and the per-IP one alone is defeated by rotating it. Neither bounds a distributed attempt across instances, which is what `ADMIN_TOTP_SECRET` is for; it is opt-in and unset by default. **Setting it without first confirming a working code locks everyone out of admin** — there is no recovery path through the UI, only editing the variable and redeploying, so it is the one setting that must never be enabled speculatively. `.env.example` documents every key. |
| Deploy | **`GeeteshRanjan/GCC-Landscape`** on GitHub → **`gcc-landscape.vercel.app`** **for now** | Preview URLs matter for a stakeholder-reviewed tool. That `owner/name` is also the value `GCC_GITHUB_REPO` needs before admin publishing works, and the two must never diverge: publishing commits to the repo the app is deployed from, because the commit is what triggers the rebuild. **Vercel applies environment variables only to builds created after they were added** — changing one and not redeploying leaves the running app with the old set, or with none, and the app cannot tell you that. |
| Delivery | **iframe embed in an ansr.com page** | Client's call. Consequences below. |

**iframe consequences, all load-bearing:**
- The tool cannot own the URL bar. Screen state lives in component state, not routes, and
  Screen 1 → Screen 2 is not a page navigation. Deep links are out unless the parent cooperates.
- Height is negotiated with the parent via `postMessage`. Never assume viewport height; no
  `100vh` layouts, no fixed/sticky positioning that assumes it owns the scroll container.
- **No scroll-driven motion, and no scroll-position logic.** The parent decides what is on screen,
  so an IntersectionObserver or scroll listener against our own viewport fires for content the
  visitor cannot see and stays silent for content they can. Motion on the public screens is tied to
  state changes instead — which is also why no scroll-animation dependency is installed.
- `frame-ancestors` allows ansr.com for public routes and `'none'` for `/admin`.
- Admin is unaffected: same deployment, `/admin`, opened directly, never framed. Because it is never
  framed it is **exempt from every constraint above** — it uses real routes, owns the URL, and may
  assume viewport height and a sticky header. Do not carry those patterns back into the public
  screens, and do not "simplify" them out of admin to match.

**Preview deployments are behind Vercel Deployment Protection, and that partly defeats the reason
Vercel was chosen.** Every push builds a preview, but fetching one returns Vercel's own login page, not
the tool — so an ANSR stakeholder cannot open a preview link, and neither can any automated check. Only
`gcc-landscape.vercel.app`, built from `main`, is publicly reachable. Either disable protection for
previews or mint a bypass token before treating a preview URL as something a reviewer can use; until
then "review it on the preview" is not a workflow that exists. This is also why the browser suite runs
against a local production build rather than a deployed one.

**Vercel is a host, not a platform.** ANSR may take this in-house, so nothing host-specific gets
used. Concretely:

- Data access goes through a thin `DataStore` interface — `read`, `write` — so the write path is one
  swappable module: GitHub commit in production, direct file write in local development, plain disk
  write if ANSR self-hosts on a server with a filesystem. No host-specific storage API anywhere.
  The GitHub store reads with the Contents API's `raw` media type and writes through the Git Data API
  — blob, tree, commit, non-forced ref update. Both choices are about limits the simple path silently
  hits: the Contents API's JSON form returns *empty content* above 1 MB, and its single-call update
  cannot express a real fast-forward check. Do not "simplify" either back. Verified against the real
  repository: a publish produces one commit touching only the dataset path, so basing the new tree on the
  parent's does keep every other file — the failure mode a hand-built tree would have introduced.

  **`GCC_GITHUB_TOKEN` is a scheduled failure.** A fine-grained token expires, and when it does
  publishing starts returning "GitHub refused the request (401)" with a valid password and a valid
  draft — a failure that looks like a bug months after anyone last touched this. Record the expiry
  date with the deployment, and read that 401 as an expired token before debugging anything else.
  **Reads and writes select different stores, deliberately.** Reads always come from the local JSON,
  because a GitHub round trip per cold start would add a network dependency and a rate limit to the
  public screens for nothing. Writes go wherever the deployment's source of truth is, and the diff is
  computed against that same place — diffing against the baked-in file while committing to a branch
  that has moved is how one publish silently reverts another. With nothing configured in production,
  publishing refuses to start rather than writing somewhere the next deploy discards.

  **`GCC_DATA_STORE=fs` on a serverless host is the one setting that loses data silently.** It is the
  obvious way to make the "publishing is unavailable" banner go away, and it is wrong: the filesystem
  is ephemeral, so a publish validates, shows a correct diff, reports success, and is gone on the next
  deploy. `fs` is for local development and for a self-hosted server with a real disk. Leaving the
  variable unset on such a host is the safe state, and the banner is doing its job.

  **The read cache is invalidated by the file, not by the writer.** `dataset.ts` stamps each cached
  copy with the dataset's mtime and size and re-reads when either moves. Having the publish endpoint
  clear the cache is not sufficient and was measured not to work: a route handler and a layout can be
  bundled separately, each with its own copy of module-level state, so the handler clears a cache the
  page never reads. The symptom is a publish that writes the file, reports success, and keeps serving
  the old data until the process restarts. It only bites where nothing restarts the process — a
  self-hosted deployment writing to a real disk — and relying on a rebuild to paper over it would make
  correctness a property of the host rather than of this module.
- Node runtime everywhere. No edge runtime, no Vercel-only middleware behaviour.
- `next build && next start` must work on a plain Node host. That is the portability test.
- Any scheduled work is a plain route protected by a shared secret, callable by any cron.

When it does move in-house and the tool is served from ansr.com directly, the iframe may disappear.
That is a simplification, not a migration — but do not relax the iframe constraints below until it
has actually happened.

## Data

**Seed:** `Consolidated_GCC_India_Database_2026_New.xlsx` — 1834 companies, 16 columns, one sheet.
Profiled in `docs/data-audit.md`; read that before touching the schema.

`exceljs` carries a moderate `uuid` advisory reachable only when *writing*; this is an offline,
read-only script, and the version is pinned.

**Excel is a seed, not a system of record.** It is imported once, cleaned and normalised on the way
in, and after that **admin is the authoritative editor** — full row CRUD on companies, plus taxonomy,
plus the Screen 2 metrics. The spreadsheet is never read again except to bulk-append a future batch
of new companies, which goes through the same validation as the seed.

**Pipeline.** Upload or edit → parse → validate against schema → **diff preview** → publish, which
commits the JSON and triggers a rebuild. Live in about a minute; that latency was weighed against
instant-publish alternatives and accepted, so do not reopen it. Validation failure blocks the
publish. Rollback is a git revert.

**Development never publishes to the configured production store.** Once `GCC_DATA_STORE=github` is set
somewhere, a publish is a real commit to the real branch that rebuilds the live site — so "just testing
the pipeline" mutates the client's data and shows up in history. Locally the store is `fs` and writes to
`data/dataset.json`, which is fine and revertible. To exercise the publish path deliberately, use the
browser suite: it runs against its own copy of the dataset in `tests/browser/.tmp`, which is exactly why
that fixture exists.

**The admin never touches git.** The app makes the commit server-side with a token from the
environment. Admin sees one Publish button and no mention of a repository.

**Publishing is batched, not continuous.** The admin does a month's worth of edits in one sitting.
Those edits are held as a **draft in the browser**, autosaved locally, with an explicit
unpublished-changes warning — no server-side draft storage exists. Publish sends the whole edited
dataset as a single commit. This is the reason no runtime datastore is needed: nothing is ever
written to a live store one field at a time.

The dataset is read server-side and held in memory. It is never shipped whole to the browser —
Screen 1 sends five peers and a few counts, nothing more.

**Three editable collections, one admin, one file.** Companies seed from a spreadsheet; the Screen 2
metrics are typed in; and `siteContent` holds the entry point's hero copy and ANSR's impact figures.

**Why the hero copy is data when no other public string is.** Everything else on the public screens
is an argument about the dataset, so it lives beside the logic that makes the argument and changing
it is a reviewable code change. These two are neither: the hero is positioning, and the impact
figures are corporate facts on their own schedule. A figure that goes stale because changing it
needed a developer is the failure this key exists to prevent. It is the only part of a publish that
changes what EVERY visitor sees on arrival, which is why it gets its own diff category and leads the
publish preview.

Its default is real content rather than `[]`, unlike the other two — an empty company list is a
coherent state, an empty hero is not. `--reseed-site-content` adopts the default over the stored
copy, and the plain import preserves what is stored for the same reason it preserves metrics.
**The hero's company count is deliberately "1,800+" and not the dataset's 1,834**: ANSR asked for
the rounded form, so it is editable text rather than `companies.length`, `data:verify` cannot check
it, and a browser spec asserts the exact figure is absent so nobody "corrects" it.

**Two datasets, one admin, one file.** The company table seeds from a spreadsheet upload. The Screen 2
function metrics are hundreds of individual values with no spreadsheet behind them, so admin edits
those as forms, through the same draft-then-publish flow.

They live under `metrics` in the **same `dataset.json`**, not a second file, and that is what makes
"one pipeline" true rather than aspirational: the schema is already the publish gate, the diff, the
browser draft, the two stores and the mtime-and-size read cache all carry the new key with no changes.
A second file would mean a second write target, a second diff, a second cache and a publish that could
half-succeed. The key is **defaulted to `[]` rather than required**, so a dataset written before it
existed still reads — the fs store refuses a version it does not recognise, so bumping
`DATASET_VERSION` would have turned a backwards-compatible addition into a broken read.

**The importer preserves the catalogue; the seed is only used when there is none.** A re-import
rebuilds companies and taxonomy from the spreadsheet, and would otherwise erase months of typed-in
metric values in a way that looks exactly like a normal import. `scripts/import-seed.ts` carries the
existing `metrics` across untouched.

**No invented metric values, and no estimated ones.** The audience is a CIO sizing a
several-hundred-person commitment, so a plausible-looking placeholder figure is worse than an empty
screen. An incomplete open metric is left off the public screen rather than rendered half-filled; a
gated one is always included, because it has nothing to be missing. Three rules govern the catalogue's
values, and `docs/data-audit.md` records how each played out:

- **Supplied money becomes an index, or nothing.** Absolute amounts cannot be stored — no currency
  format exists — so where the source gave a comparison base they are divided through it, and where it
  did not the metric stays empty with a `STILL NEEDS` note. Never estimated into place.
- **A range collapses to the end that understates India's advantage.** A breakdown slot holds one
  number, and a figure a client's own team can beat down costs more than it gains.
- **Structure follows the data.** If the supplied split does not match the seeded parts, the shape
  changes; parts with no figure are removed rather than left empty.

**`npm run data:import -- --reseed-metrics` adopts the catalogue in code over the stored one.** The
plain import preserves what is stored, which is right for a monthly spreadsheet append and wrong when
the definitions themselves have changed in a commit. It is loud about what it discards, and the diff
is the record.

**Columns kept.** Company name, HQ country, revenue band, industry, establishment year, city list,
FTE range, Fortune Global 500 flag, Forbes Global 2000 flag.

**Columns dropped** — sub-industry (see below), company type, exact GCC headcount, estimated FTEs,
S.No. FTE range is the only headcount field: stored as a normalised `(min, max)` integer pair, which
kills the hyphen-vs-en-dash inconsistency in the source. Every supplied range is already a closed
pair, so no ceilings need inventing. Display strings, location count and tier-2 presence are derived
from range and city list, never stored — storing them is how two columns start disagreeing.

**Peer matching is a continuous score, not a ladder.** Every company in the visitor's industry is
scored and ordered:

```
score = 0.7 × businessSimilarity + 0.3 × bandProximity     ordering: score, then HQ country,
                                                            then GCC size, year, name
```

`businessSimilarity` is the share of the visitor's **IDF-weighted** tag mass a company shares, where
tags come from its business type(s). Weights are rarity within the industry and are **never
hand-authored** — a tag every retailer carries scores zero there and the weighting re-derives itself
as companies are added. `bandProximity` is a three-step function: 1.0 same band, 0.66 adjacent, 0
otherwise.

**Business similarity outranks both revenue band and HQ country, and the comparison block shows
NEITHER.** A `PeerCard` carries id, name, cities, headcount band, established year and the Fortune
flag; `toCard` drops `revenueBand`, `industry`, `businessTypes`, `forbesGlobal2000` — and `hqCountry`.

HQ has been off, on, and off again, and the rule that survived all three is **remove the column and
the field together, or the next reader will assume the omission was an oversight.** It was dropped for
years on the argument that a market mismatch should stay invisible while a business mismatch is the
first thing a visitor sees. It was shown for one pass at ANSR's request, because a CIO reading a
comparison set asks where each company is headquartered. ANSR then asked for it back off, and the
field went with the column.

**Nothing about matching moved on any of the three occasions, and nothing needed to**: HQ is a SORT
PREFERENCE and never a filter, so its presence on a card cannot explain why a company is absent or
change how many come back. `input.hqCountry` is still one of the four answers echoed on the result
band, and `peers.ts` still reads the dataset's own field.

**What the removal did cost is the explanation.** The method line under the block — "revenue band and
headquarters are preferences rather than filters, so a closer business outranks a closer size or a
nearer market" — went with the column, so a visitor can no longer see why this exact set puts H&M
(Sweden) and Adidas (Germany) above GAP (USA) for a US apparel visitor. `peerLead` is now the only
statement of method on the block: it names the sub-industry matched on and puts business before size.

**No copy may claim something a card cannot show.** A lead promising "companies from your own market
first" shipped and was false for the reason above. And **a test that reads a dropped field gets
`undefined`**, so a comparison over it silently passes; assert that the guard itself holds, or read
the field from the dataset.

**A similarity floor of 0.20 applies to `businessSimilarity` ALONE, never the combined score.** A
perfect band match is worth 0.3; on the combined score it would drag a business-irrelevant company
over the line, which is the bug the whole mechanism exists to prevent. The floor can shorten a set —
that is invariant 3, not a defect — and `data:verify` counts how often (147 of 1064), so the trade is
measured rather than guessed.

**Raising the floor does not merely truncate, which is why 0.20 rather than 0.15.** Since a perfect
band match is worth 0.3 of the combined score, a company below the floor can outrank one above it, so
lifting the floor evicts that interloper and promotes a more similar peer. Measured over the whole
dataset, every set whose membership changed between 0.15 and 0.20 gained a company more similar than
the one it lost. The reasoning and the rejected values are in `similarity.ts` beside the constant;
`docs/business-types.md` carries the version for ANSR.

**The old three-rung band ladder survives as `matchPeersByBandLadder`, as the test oracle.** With no
sub-industry selected the scored engine returns its output company-for-company; that equivalence
is asserted both in `similarity.test.ts` and as a `data:verify` invariant, and is what makes the
whole change provably additive. Do not delete it without deleting those.

**Sub-industry is still never a match key.** 620 values over 1834 companies is not a taxonomy. It is
read on import, collapsed through `scripts/business-type-map.ts` into one of 158 business types, and
discarded. The 35.8% coverage figure that killed it measured it as a FILTER; as a continuous
similarity signal it costs no coverage at all. See `docs/business-types.md`.

**Tags are code, business types are data.** `BUSINESS_TAGS` (137, in `business-tags.ts`) is the
scoring substrate: a tag nobody else carries matches nothing, and deleting one silently re-scores
every peer set, so changing the vocabulary is a code change — the same reasoning as `METRIC_LENSES`.
Business types are admin-editable, because ANSR must be able to add "Quick commerce" without a
developer. **Every tag must be carried by at least two business types**, asserted by `data:verify`:
a one-type tag can only be shared in a type-against-itself comparison and is therefore dead, and
that rule is what stops the vocabulary drifting back towards 620 values of one member each.

**Matching never leaves the industry.** Measured consequences the copy has to carry rather than the
data hide: Education has six companies, so it fills all five slots from its own industry and no
further; Electrical & Electronics has two, so it stays three short and says so. Relaxing the
boundary — industry as a heavily-weighted tag rather than a filter, so a footwear brand could see a
global personal-care brand — is cheap under this architecture and is a separate decision.

**A company's business types must belong to its own industry**, enforced by the schema. So an
industry rename cascades into `businessTypes[].industry` as well as into companies, and deleting an
industry drops the types scoped to it. Miss either and the publish fails referential integrity from
an edit the UI reported as successful.

**An untagged company is a safe state, not a gap.** It matches at industry level exactly as before
business types existed, which is what let the tagging roll out one industry at a time. 66 companies
are deliberately untagged and listed as such.

**`taxonomy.revenueBands` is ordered ascending, and that order is the contract** — step 2 above is
index arithmetic on the array. Nothing sorts it, anywhere. The taxonomy editor appends a new band at
the end and offers Move up / Move down to place it, and the publish diff reports a reorder as a real
change even when no value was added or removed, because a reorder changes who matches as a peer.

**Taxonomy is a first-class, admin-editable entity.** Industry, revenue band, city, HQ country.
Admin adds a value and it appears in the public dropdowns on the next publish — no code change, no
developer involved. Renaming a value **cascades into every company that referenced it**; without the
cascade the publish fails referential integrity, which is correct but useless. Deleting a value still
in use is refused in the editor, where the reason can be explained, rather than at the schema gate.

**The four function areas and four lenses are enums, not taxonomy.** They come from the brief and
Screen 2's tab structure, so there is nothing for an admin to add. The metric editor can rename a
metric, rewrite its question, and add, rename or remove the parts and axes of its shape — but not add
or delete a whole metric, and not change its format, its function area, its lens, its gating or its
`atLeast` floor marker. If a genuinely new metric is ever needed, that is a code change to the
catalogue, deliberately. Because six titles now appear on more than one tab, admin's Edit button names
the function area alongside the title — three buttons all called "Edit Bench strength" would leave an
admin unable to tell which copy they had opened, or that there were three.

**`data:verify` checks two different things and the distinction is load-bearing.**

*Invariants* are properties of the code that must hold for any dataset, seed or heavily edited: peer
matching never leaves the industry, a thin industry degrades rather than pads, HQ country never changes
how many peers come back, the largest-in-industry panel is never empty, known revenue bands stay in
ascending order, a metric shown on several tabs carries one set of figures, every tag is carried by at
least two business types, a company never carries a business type from another industry, no peer is
ever shown below the similarity floor, the floor never empties a set the industry could fill, and
**selecting no sub-industry reproduces the old band ladder exactly**. A failure here is a bug, and
`--accept` deliberately cannot silence it.

*Profile figures* are the measurements in `docs/data-audit.md` — counts, index membership, aggregate
professionals, city density, coverage, and the metric catalogue's completeness. They pin a snapshot,
and a legitimate admin edit is supposed to move them; entering a batch of metric values is exactly
that. The gated set is recorded **by id rather than counted**, so a metric quietly losing its gate
reads as a named change in the baseline diff instead of a number going down by one. They live in `data/verify-baseline.json`, not hardcoded in the script, so accepting a real
change is `npm run data:verify -- --accept`, which rewrites the baseline and prints the delta. Commit
that file alongside the data change and bring the audit document into line.

That split is what makes the check survivable after a publish. Do not collapse it back into one list
of hardcoded numbers: a check that must be edited or ignored after every legitimate change has
stopped being a check.

**Known gaps** — tracked in `handoff.md`:
- No per-company function list, and there will not be one. `COMMON_FUNCTIONS` in
  `src/data/screen1.ts` is the hardcoded set the brief permits. **The two lines that said so are
  gone at ANSR's request**, and the SECTION HEADING carries the job instead: "Functions most GCCs run
  from India" is a claim about GCCs in general and cannot be read as one about the companies above it.
  `COMMON_FUNCTIONS_BASIS` and `PeerView.functionsBasis` were deleted with them rather than left as
  data nothing renders. ANSR has still to sign off the wording and the order.
- Screen 2 metric values: all 35 populated, from figures ANSR supplied and revised rather than from a
  citable source, and three filled from judgement. **The "Sample, not for publication" stamp has been
  removed at ANSR's request**, so nothing on the page now flags a figure as not-yet-final; `asOf` is
  only ever provenance an admin typed. `data:verify` counts how many state none. See
  `docs/data-audit.md`.

## Architecture map

Maintained as directories acquire responsibilities. The file tree is supplied automatically each
session, so this records **what lives where and why**, never a file listing.

| Path | Responsibility |
| --- | --- |
| `src/app/` | Next.js App Router. `layout.tsx` self-hosts the display face through `next/font` and exposes it as `--gcc-font-display-loaded`, which `tokens.css` reads — the family name `next/font` generates is hashed, so naming the face literally in the token would silently fall through to the sans stack and lose **Light 300**, which is the brand's single biggest typographic tell. A surface opts in with `font-display`; `body` stays on `--ansr-font-sans` so admin keeps Inter. `page.tsx` is the tool's only public route and serves BOTH screens; it is `force-dynamic`, because a prerender would bake the taxonomy into the build and defeat the read cache the data layer was designed around. `actions.ts` is the public surface's single server action — deliberately one seam, so there is one place to check that the dataset does not cross. Screen 2 needs no action: its payload does not depend on the visitor, so `page.tsx` builds it per request and passes it down. `globals.css` is the Tailwind theme, aliased onto the brand tokens — it restates no values and clears Tailwind's default palette so off-brand colour is unreachable through a utility class, and it carries the public screens' one motion sequence and the three band grounds. **`--ansr-gradient-teal` and `--ansr-gradient-orange` are `background` SHORTHAND values, not images** — each is a gradient layer composited over a solid ground colour, because that is how the brand board builds them. A colour is not a valid `<image>`, so aliasing them into Tailwind's `--background-image-*` namespace emits a `background-image` whose last layer is a colour, which is invalid and paints **nothing, silently, while still generating a utility class that looks correct**. That alias existed from the first commit and was only discovered when something finally used it. Both are consumed through `.gcc-ground-gradient`, which uses the `background` shorthand they are written for; only `--ansr-gradient-conic` is a real image and stays aliased. Do not "tidy" the two back into the theme block. |
| `src/data/` | The whole data layer, and the only place that knows the dataset shape. `schema.ts` is the zod contract; `normalize.ts` holds the cleaning primitives, shared by the seed importer and the future admin upload so one file format never gets two parsers; `derive.ts` computes everything not stored; `peers.ts` is the scored matching engine and the Screen 1 counts, pure functions over a loaded dataset, and it keeps `matchPeersByBandLadder` as the equivalence oracle; `similarity.ts` is the IDF weighting, the business-similarity ratio, the band step function and the floor — the single place a peer's rank is decided, and the place to change one number (`SIMILARITY_FLOOR`) if ANSR wants longer sets at lower quality; `business-tags.ts` is the 137-tag vocabulary, code-level for the same reason `METRIC_LENSES` is; `business-type-catalogue.ts` is the 158-type seed, standing to `dataset.businessTypes` exactly as `metric-catalogue.ts` stands to `dataset.metrics`; `diff.ts` is the dataset diff — one computation with two renderers, a console one for the importer and structured output for the admin preview, so the two can never disagree; `metrics.ts` holds the Screen 2 catalogue's behaviour, and `publicMetric` there is the single place a gated value is omitted; `metric-catalogue.ts` is the seed transcribed from the brief and populated, and the place a metric shown on several tabs is authored once and spread onto each with a different id; `store.ts` + `store/{fs,github}-store.ts` are the `DataStore` implementations; `publish-store.ts` selects the write target and refuses to guess; `dataset.ts` is the cached server-side read, invalidated by an mtime-and-size check rather than by anyone remembering to clear it, and is `server-only`, which is what makes "never ship the dataset to the browser" a build error rather than a habit. `screen1.ts` is Screen 1's view model — the pure function that turns a dataset plus five inputs into the couple of kilobytes the Peer Landscape renders, and the place that decides whether a result is degenerate so the copy can say something true about it. Two fields there carry their own justification and may not be read without it: `industry.averageHeadcount` is a mean of FTE BAND MIDPOINTS, rounded by `roundHeadcount` to a step coarser than the narrowest band, industry-level rather than peer-set-level, and never renderable without the method line beside it; and `scale.asOf` is the dataset's own `generatedAt`, which is the only date here that is a machine fact rather than something an admin typed — `dataset.source` is deliberately NOT carried across, since it is documented as free text for the admin's benefit and currently holds the seed spreadsheet's filename; `geo.ts` holds the city coordinates the density map plots, hardcoded here because they are geographic fact rather than admin-editable data, and exports `MAP_FRAME` / `MAP_STANDARD_PARALLEL` because a generated file is projected from them; `india-outline.ts` is GENERATED by `scripts/build_india_outline.py` and is the density map's India, one filled path plus a dot per island too small to stroke — invariant 8 governs it; `select-field.tsx`'s options come from here too; `dot-world-map.ts` is GENERATED and never hand-edited — the ask hero's dotted world map as two SVG paths, written by `scripts/build_dot_map.py`, and it lives here rather than beside the component because it is data the component draws, not markup; `countries.ts` is the HQ input vocabulary — every country, code-level because `taxonomy.hqCountries` is company-derived and a re-import would delete anything added to it. `screen2.ts` is Screen 2's view model: it imports the gate rather than `dataset.metrics`, so there is no path around it, and it resolves every metric to pre-formatted figures and bar fractions with no nullable value left in the type — which is where the "an incomplete open metric is dropped, never half-filled" rule becomes something the compiler carries. |
| `src/app/admin/` | The admin surface. Six tabs: Companies, Taxonomy, Business types, Metrics, Entry point, Publish. `login/` sits outside the `(authed)` route group and is the one path without a session; the group's layout is the guard for everything else and hosts the draft provider, so a draft survives moving between tabs. A route group rather than middleware: middleware would be a second runtime to keep Node-only for no gain. |
| `src/app/api/admin/` | Login, logout, diff preview, publish. Each **re-checks the session itself** — deliberate duplication, because a layout cannot guard a route handler and a route that forgot would be silently public. |
| `src/lib/admin/` | Auth and the publish pipeline. `password.ts` is scrypt hashing; `session.ts` is the signed cookie and is `server-only`; `rate-limit.ts` is the two-budget login limiter; `totp.ts` is the optional second factor, RFC 6238 on `node:crypto` with no dependency; `guard.ts` holds the two refusal shapes (redirect for pages, bare 401 for APIs); `publish.ts` is the validate → read → diff pipeline shared by preview and commit; `constants.ts` exists solely because `server-only` throws under `tsx`, so anything a script imports cannot carry the marker. |
| `src/components/admin/` | Client-side admin UI. `site-content-manager.tsx` is the Entry point tab and is the one editor with NO local form state and no Save button — nothing in it has a cross-field rule that must land as one edit, so each control writes straight to the draft and there is no second copy of the truth to get out of step. `draft-provider.tsx` is the browser draft, autosaved locally and pinned to the baseline it started from; its `STORAGE_KEY` is versioned and **is bumped whenever the editable shape changes**, because restoring a draft missing a key produces a schema error the admin cannot fix from the UI. The rest is the app-shell chrome, the company table and editor, the taxonomy editor, the metric catalogue and editor, and the publish view. |
| `src/components/public/` | What both screens use. `tool.tsx` owns the whole phase machine — ask, Peer View, Function View — as component state rather than routes, because the tool cannot own the URL bar, and moves focus to the new phase's landmark on every transition since nothing else announces a change that was not a navigation. **On the two RESULT screens that landmark is the tab panel, not the `h1`** — the `h1` is now the shared product lockup and is identical on both, so focusing it would announce nothing about the change, whereas a panel named by its own tab announces "Peer landscape, tab panel". The ask keeps its heading, because its `h1` is its own. **That focus move is an effect keyed on the phase, never a call beside `setPhase`.** It was written as `setPhase(...)` followed by a `requestAnimationFrame` that focused a ref, which assumes React commits before the next frame; when it does not, the ref is null, the focus call silently does nothing, and the only announcement a screen reader gets for a phase change is dropped. It passed every local test and failed against the deployed build. An effect runs after commit, so the heading is mounted by definition — and it must skip its first run, or an arriving visitor has the keyboard moved and the frame scrolled before they have done anything. `primitives.tsx` holds the stat, chip, fact-list and provenance shapes plus the number formatters; `Panel` is the bordered card the result surface is built from — NOT a variant of `Section`, which is a full-bleed band with its own ground and a 48px heading, and which Screen 1 no longer uses; the **three-ground band system** and `Section` stay for a surface that wants a band. `screen-header.tsx` is the motif-bearing teal CONTEXT area both result screens open with, plus `ProductIdentity` (the shared `h1`), `HeaderFinding` (the finding as a non-heading display line, Screen 1 only), `ContextPanels` (the four answers as pills plus one "Change my answers" button) and `ViewTabs`. It carries a second generated ornament, `.gcc-header-lattice`, on the leading edge opposite the motif — a 1px-on-24px dot field whose areal coverage is about 0.5%, so it is a texture the eye reads and a contrast measurement cannot. **The band has no bottom padding**, because the selected tab has to be physically continuous with the content surface beneath it; if a gap appears, something has added padding. The tabs are real ARIA tabs with a roving tabindex and **manual activation** — arrow keys move focus, Enter or Space activates — because activating swaps the entire screen and arrowing across with automatic activation would tear the page down under a visitor who was only looking. `aria-controls` is set on the selected tab alone, since the other view's panel is genuinely not mounted. **Deliberately not sticky**: the tool never owns a scroll container inside the frame. The two view labels live here rather than in either screen's `copy.ts`, because they are the one pair of strings belonging to neither screen alone and the failure mode is the switch disagreeing with itself about where the visitor is. `closing-cta.tsx` is Screen 2's close only — **Screen 1's page ends at its evidence strip, at ANSR's request** — and what marks it is the one orange pill per screen. It is still the one place a brand texture sits. `charts.tsx` is the chart vocabulary both screens draw with — see below — and `Containment` there is Screen 1's three overlapping bars, whose layers step down from a shared top edge so each label gets an exposed band of its own. `PanelTone` on `Panel` is the four card flavours; `Zone` in `peer-view.tsx` is the alternating full-bleed grounds. This folder exists because Screen 2 wanted most of `screen1/primitives.tsx`: importing across screen folders would have made `screen1` the owner of shapes both screens depend on. |
| `src/components/screen1/` | The public Peer View. `peer-view.tsx` is the ask and answer states; `customer-logos.tsx` is the marquee strip and `impact-band.tsx` the dark figures band, both entry-point-only; `ask-hero.tsx` is the ask's own hero band, separate from the shared `ScreenHeader` because it is the one band that uses the brand's real display ground and that ground **admits white ink only** — every muted token measures under 3:1 on it, so a shared header would have had to give up either the ground or AA on the two screens that do need a muted lead; `ansr-wordmark.tsx` is the drawn lockup that stands where the headline's "ANSR" used to be typed — one of TWO literal uses of a brand asset on a public screen, the other being the full lockup stacked in `impact-band.tsx`'s heading, and logos are the only exception the adapt-never-paste rule grants. **Both headings that carry a drawn mark are Medium 500 / `tracking-body`, measured off the mark rather than chosen**: the lockup's stem is 0.137 of its cap height, which is the display face's Medium, and its sidebearings are normal rather than `tracking-display`'s -0.02em — a Bold heading beside it is two fonts on one line. Every other display heading keeps Bold + `tracking-display`. It is sized off cap height and inherits the ink, with the word carried beside it in `sr-only` text so the heading's accessible name is unchanged; `dotted-world-map.tsx` is that band's ornament and is layout only — two `<path>` elements over generated geometry, with every ink, opacity, radius and edge fade in `.gcc-hero-map`; `input-panel.tsx` is the four controls over six fields, with its own field primitives rather than admin's because a public form and a dense internal tool want different densities — and its grid is TWO EQUAL COLUMNS, two rows of two with the submit spanning both, because a 3/3 row over a 2/2/2 row shares no interior boundary and drew six unaligned edges from five fields; `select-field.tsx` is the widget all four use, and the one place an option carrying children turns the popup into a tree and cascades a second pane out of it — the pane is a child of the panel so its placement resolves against it, and `.gcc-select-*` in globals.css carries its two shapes, the measured room table behind them, the row chrome and the elevation. **`--ansr-container-card` is a COMPOSITION token, not just the form card's width**: the hero copy and the card derive their leading edge from the same box (`max-w-content px-6 md:px-12`, then `mx-auto max-w-card`), duplicated verbatim in `ask-hero.tsx` and `peer-view.tsx`, because the card is centred and capped so no tuned inset can align them at every width. Widening it moves the headline, and moves the dot map's leading mask fade with it, since that fade is measured against where the copy ends. **The hero then outdents by the card's WHOLE margin from `xl`, landing on the container gutter, and its lead takes `--ansr-container-lead` — 6rem left and 6rem right, one decision.** That pairing is what keeps the copy's trailing edge fixed, which is why the map's fade did not move; widening the lead without shifting left by the same step puts text on the map's visible field, and the two are gated on `xl` together for that reason. `evidence.tsx` and `city-map.tsx` are the cards. `evidence.tsx` owns the packed comparison-card grid and its row plan, the containment chart's layer construction, the ranked largest-centres stack, the function tiles and the terminating evidence strip. **Both ranked TABLES are gone**, and with them the focusable horizontal scroller they needed: cards and tiles reflow, so there is nothing to scroll sideways and no column past the fold. That closes the trade the scroller existed to manage — the comparison a table bought at the cost of a phone reader scrolling for the one figure they came for — because each card now carries that figure at 24px in the first screenful. **No company logo, initial, monogram or reserved empty box appears anywhere**: the dataset holds no marks, so each of those is either a fabricated identity or a visible gap. Every card starts with the name, and the name row is where a mark would go if any were ever licensed. `snapshot.tsx` is the four industry-level figures at the head of the content surface, as four floating tiles on the mint zone — it was one bordered container divided by 1px grid-gap rules, which was right on a white page and wrong once the strip sat on a tint: a single bordered box on a tint reads as a table, and its internal rules were drawn in the same value as the ground behind it. **It holds nothing new** — every figure on it is evidenced by a card further down — and it renders four cells whatever the result, stating "Data unavailable" rather than dropping a column or inventing a figure. **`copy.ts` holds every visitor-facing sentence**, including the card headings and their leads, the exact cohort counts, the snapshot's cells and the one surviving axis note, since which lines exist is a statement about what may honestly be claimed. `use-frame-height.ts` negotiates height with the hosting page. |
| `src/components/screen2/` | The public Function View. `function-view.tsx` is the screen and the four function tabs, built on the Radix Tabs primitive rather than the registry wrapper — 44px triggers, no `transition-all`, no shadow. `metric-card.tsx` is layout only: it selects no chart and does no arithmetic, because both are decided in `screen2.ts` where a test can pin them. It owns the shape-only placeholder for a withheld metric — static, hatched and uniform, so it reads as sealed rather than as loading. There are deliberately no group headings inside a tab, because four public subheadings would have been the internal lenses re-lettered. `copy.ts` holds every visitor-facing sentence, as on Screen 1. |
| `src/components/ui/` | shadcn/ui components, unmodified from the registry. On-brand because `globals.css` maps the registry's contract variables onto brand tokens. |
| `data/` | `dataset.json` — the published dataset, tracked in git. Pretty-printed on purpose: a reviewable diff is the reason there is no database. `verify-baseline.json` holds the profile figures `data:verify` compares against; also tracked, and updated only by `data:verify -- --accept`. |
| `public/logos/` | Customer marks for the entry-point strip, derived from `Customer Logos/` at the repo root — **which is held locally and gitignored**, like the root SVGs, because the raw client hand-off is working reference material and these adapted copies are what the app serves. Six are real vectors; four arrived as a single base64 raster inside an SVG `<pattern>` at full source resolution (~520 KB for four) and are re-encoded to PNG at 2x display height. **Check a new logo's bytes, not its extension** — an `.svg` that is really a raster is invisible until someone looks. Walmart's export also had a `viewBox` nine tenths too small, so only "Wal" rendered. |
| `assets/brand/` | Brand source of truth. `tokens.css` is authoritative. Motifs adapted, never pasted. **SVGs at the repo ROOT are gitignored** (`/*.svg`, root-anchored, so this folder and `public/brand/` are unaffected) — design exports land there by accident and one 7 MB Figma file committed by a careless `git add .` is in the history forever. If a root SVG seems to be ignored, it is. |
| `public/brand/` | Motifs already adapted for a specific placement, served as static files. Derived output, not source — each one is reproducible from `assets/brand/` with a `scripts/brand_asset.py` command recorded next to where it is used. |
| `.tastemaker/` | `style-lock.md` — both public screens' visual decisions and the reasoning behind them, so a third surface reuses rather than re-derives. It restates no token values; `design-stack.md` and `tokens.css` outrank it. |
| `tests/unit/` | Vitest, node environment, no jsdom. Pure and server-side logic: hashing, session signing, TOTP, the rate limiter, the diff, the schema, the cleaning primitives, the metric catalogue and its gate, the GitHub store against a stubbed `fetch`, and the publish pipeline against a temp file. `vitest.config.ts` resolves the `react-server` condition, which is how these import a `server-only` module at all. |
| `tests/browser/` | Playwright against a real `next build && next start`, on its own copy of the dataset. Covers what a unit test structurally cannot: the draft lifecycle, autosave, restore after reload, the stale-baseline conflict, and focus behaviour. Serial, one worker — the server holds the rate limiter and the dataset cache in memory, so parallelism would make test order part of the result. Numbered specs run in reading order; `6-lockout.spec.ts` exhausts the limiter and must stay last. The `public` project covers both public screens and runs first, before the publish spec rewrites the fixture. Each project's `testMatch` is a narrow pattern, so a spec numbered outside all of them lands in no project and silently never runs — `helpers.ts` also owns `DRAFT_STORAGE_KEY`, so a provider bump is one edit rather than eight, and `band()` / `expectBand()`, which locate a public evidence band by its stable section id. **A public spec must never locate a band by its heading text.** Twenty of them did, and a copy pass that changed nothing they were testing broke all twenty — a suite that fails for a reason unrelated to its subject is one people learn to re-run rather than read. The id is the contract; `expectBand` still asserts the landmark, since a `<section>` with no accessible name is not a `region` — and it accepts **either** `aria-labelledby` or `aria-label`, because a band may legitimately have no visible heading. What must not pass is a band with neither. The ids on the peer landscape are `snapshot`, `peers`, `industry`, `largest`, `functions`, `map` and `scale`; Screen 2's metrics section is `function-metrics`, named apart from Screen 1's `functions` card because two ids differing only by which phase is mounted are two ids a spec will eventually confuse. |
| `scripts/` | Maintenance tools, run by hand, never at request time. Python: `brand_lint.py` enforces tokens, `brand_asset.py` adapts SVGs, `inspect_xlsx.py` profiles data drops, `build_dot_map.py` cuts the ask hero's dotted world map out of a Natural Earth geojson and writes `src/data/dot-world-map.ts`, and `build_india_outline.py` cuts the density map's India outline out of **the same file** and writes `src/data/india-outline.ts` — both cache that 13 MB source under `.cache/` (gitignored, public domain, re-downloadable) and commit only derived path strings, because the alternative is either a megabyte of geometry in a visitor's browser or a few CPU-seconds on every cold start of a `force-dynamic` page. One source for both, per invariant 8. Two things about that pair that cost time once each: **`brand_lint.py` rejects a raw hex inside a COMMENT as well as in code**, including an otherwise-helpful `brand_asset.py` reproduce command, so a derived asset's recipe is recorded by naming its source and target tokens rather than by quoting their values; and **`brand_asset.py recolor --map` takes one comma-separated string, not a repeated flag** — repeating it silently applies only the last pair, and the sole signal is an "unmapped colors left as-is" line on stderr. TypeScript via `tsx`: `import-seed.ts` is the xlsx → JSON pipeline, `verify-data.ts` reproduces every figure in `docs/data-audit.md` from the published dataset and exits non-zero if one moves, `admin-hash.ts` mints the two admin env values from a TTY prompt so the password never lands in shell history. `sweep-floor.ts` and `proto-industry-tag.ts` are peer-matching analysis rather than maintenance: the first sweeps `SIMILARITY_FLOOR` and self-checks against `matchPeers` at the shipped value before reporting anything, the second prototypes industry-as-a-weighted-tag over a global pool without touching `src/`. Both are committed because they are the evidence behind a shipped decision and a live open one — rerun them rather than re-deriving the numbers, and note the first is worthless if its self-check does not say SOUND. `business-type-map.ts` is the classification table — 601 sub-industry mappings plus 568 per-company decisions, keyed by `industry||name` because company names are not unique even case-insensitively — and it is the reviewable artifact behind `docs/business-types.md`. `check-business-tags.ts` and `check-company-types.ts` are the authoring checks for that table, run by hand while editing it; `data:verify` carries the same properties as invariants once published. |
| `docs/` | Deep reference, read on demand. Not steering. `brief.md` is the transcription of the source mind map — read it, not the image. `data-audit.md` is the profile of the source database. `business-types.md` is the peer-matching vocabulary: why tags rather than sub-industry, how the score works, and the 158 types by industry — the document to hand ANSR when they want to check the business judgement. `ansrx-visual-language.md` is `Group 149.svg` measured to the point where the 7.1 MB export never has to be opened again — typeface, weights, type scale, grid, band system, every hex against its token, the motifs as parameters, component anatomy, and the four brand questions the reference raises that only ANSR can answer. |
| `.kiro/steering/` | Always-in-context rules. Four files, kept small on purpose. Tracked, along with `hooks/`, `settings/` and `skill-sources.json`. **`.kiro/skills/` is deliberately untracked** — 300 files of vendored third-party packs with one LICENSE between them, and git history is forever. `skill-sources.json` pins each pack's repo and commit, so re-cloning restores them. |

## Document protocol

Four steering files and a `docs/` folder. Adding a fifth steering file needs a reason, because
everything here is paid for on every single turn.

**These files are committed.** No live credential ever goes in one, not even a throwaway that only
guards a local dev server — refer to `npm run admin:hash` and name the variable, never the value. The
same applies to test fixtures: a credential-shaped string trips push protection and every scanner
downstream, and a scanner that cries wolf over test data is one people learn to ignore.

- **`project.md` (this file)** — durable. Edited by replacement, never by appending. If a line is
  no longer true, it is deleted, not annotated with a correction.
- **`handoff.md`** — volatile, current state only. **Rewritten in ONE pass** at the end of each
  working session, never appended to and never sanded line by line. Yesterday's state is not
  context, it is noise. The `handoff-refresh` Stop hook enforces the rewrite.

  **It carries STATE AND POINTERS, never reasoning**, and that content rule is what keeps it small
  — the line count is a symptom. Where we are, what is next, what is blocked, what would bite, and
  where the explanation lives. The explanation itself belongs in this file if it is durable or in
  the style lock if it is visual, both of which have room. A handoff line that says *why* is
  duplicating something that already has a home, and duplicated reasoning is what made every
  previous version overrun.

  **Target ~90 lines, ceiling 140.** Deliberately a range: a hard number invites trimming sentences
  toward it, and one session of that cost several times what the whole file costs to carry. Over the
  ceiling, delete a whole section or move it to its proper home — never shave wording.
- **`docs/*.md`** — reference detail. Not auto-loaded. One topic per file, named for the topic.
- **Superseded content is deleted.** Not struck through, not moved to an "Archive" heading. Git
  holds the history; these files hold the present.
