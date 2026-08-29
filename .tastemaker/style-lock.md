 # Style lock — GCC Landscape

Established: 2026-08-27, with Screen 1 (the Peer View).
Source: **the existing ANSR brand system**, not a generated palette.

This file exists so Screen 2 does not re-derive what Screen 1 already settled. It is a
pointer plus the decisions that are *not* in the brand system — it deliberately restates no
token values, because `assets/brand/tokens.css` is the single source of truth and a second
copy of a hex here is how the two start disagreeing.

Precedence: `.kiro/steering/design-stack.md` and `assets/brand/tokens.css` outrank this file.
Nothing here may introduce a colour, type size, spacing step, radius or duration.

## Palette, type, spacing, radius, elevation, motion

All eight token families are already defined and authoritative in
`assets/brand/tokens.css`, aliased onto Tailwind in `src/app/globals.css`. No palette was
generated and none should be. Use the semantic aliases (`--ansr-surface-*`, `--ansr-text-*`,
`--ansr-action*`, `--ansr-accent`), never the ramps directly.

**The palette was replaced on 2026-08-28, and this file was written under the old one.** Every
composition decision below survived; every colour figure was re-measured. The values now come from
`Group 149.svg` (measured in `docs/ansrx-visual-language.md`) rather than from
Branding_Palette.docx: the action orange is `#FD4E11`, the dark ground is a navy, and there is a
**bright mint-teal accent that the old palette had no equivalent for**. One rule below reversed
outright as a result — see the reference-intelligence section — and one new rule appeared:
`--ansr-accent-inverse` is legible only on a dark ground, at 2.44:1 on white.

## Typeface — the display face, and Light 300

**A web font now loads.** Until the reference pass nothing did, so `--ansr-font-display` fell
through its whole stack to `system-ui` and with it the one typographic fact that most identifies
this brand: **body copy is the display face's Light 300**. A missing face does not fail loudly — it
renders in the system sans at Regular, which looks deliberate.

Hanken Grotesk, self-hosted through `next/font` in `layout.tsx`, with real 300/400/500/600/700
files. It is the stand-in; the brand's face is Moderat and its licence for an embedded tool is
ANSR's to answer. When it is, Moderat goes in front of it in `--ansr-font-display` and nothing else
changes.

**Opted into per surface, not set on `body`.** The ask screen carries `font-display`; the answer
state, Screen 2 and admin still resolve to `--ansr-font-sans`. Admin stays on Inter deliberately —
tabular numerals and small-size legibility matter more there than brand voice.

## Type scale — use the display end of it

The scale had a 48px step neither public screen ever reached: section headings sat at 24/30px
and the h1 at 38/48px, against a 1280px canvas. Everything came out mid-scale, which is half
of why the screens read as a document.

- **h1 (`ScreenTitle`): 48 / 60 / 72px**, bold, `tracking-display`, `text-balance`. 72px is
  `--ansr-text-7xl`, added in this pass — ansr.com's own hero sets around there and the scale
  stopped one step below the brand's actual display voice. Desktop only.
- **Section heading: 30 / 38 / 48px**, bold. Set by `Section`, so no band improvises one.
- **A figure that is a band: 48 / 60px** (`Stat size="display"`, `FractionBar`). Capped at 60
  deliberately — 72px is the h1's, and at 72 in a one-third column "1.06 million" broke across
  two lines mid-figure, which reads as two numbers.
- **A figure inside a card: 30 / 38px** (`ScalarValue`). Unchanged, and it should stay: a
  metric card's figure is evidence inside an argument, not the headline of a band, and eight
  of them at display size spend the emphasis until none of them has any.
- `text-balance` matters once type is this large — an unbalanced 72px headline drops one short
  word onto its own line.

**Figures are the persuasion, so they carry a rule.** `Stat` puts a hairline under the figure
with the label below it: it separates the number from its label without a box and gives a lone
figure an edge to sit on. Straight from ansr.com's own stat shape.

## Colour contract — re-measured against the new palette

**Black on the orange fill still stands, and now it is measured twice.** The brand's own pairing
for a primary action is white on `--ansr-orange`. On the old orange that was 3.22:1; on `#FD4E11`
it is **3.35:1** — still a WCAG AA failure at every size a control uses. Black on the same fill is
**6.27:1**. The reference puts white on its pill twice and is wrong both times; do not copy it.

So the public screens put **black on the orange fill**, not `--ansr-action-text`. The palette is
left alone and a legal pairing used instead, per the ordered failure path: reuse a pairing that
already passes before touching a token. Applied in `src/components/screen1/input-panel.tsx` and the
closing CTA in `peer-view.tsx`.

Pairings verified for the public screens:

| Pairing | Ratio | Use |
| --- | --- | --- |
| `--ansr-text` on `--ansr-surface` | 21:1 | body, headings |
| `--ansr-text-muted` on `--ansr-surface` | 8.59:1 | secondary copy, captions |
| `--ansr-accent` on `--ansr-surface` | 9.81:1 | kickers, figures, the industry count |
| `--ansr-accent` on `--ansr-surface-subtle` | 8.92:1 | same, on a neutral panel |
| `--ansr-text` on `--ansr-surface-tint` | 16.52:1 | body and headings on the teal band |
| `--ansr-text-muted` on `--ansr-surface-tint` | 6.76:1 | secondary copy on the teal band |
| `--ansr-accent` on `--ansr-surface-tint` | 7.72:1 | kickers and figures on the teal band |
| `--ansr-white` on `--ansr-accent` | 9.81:1 | accent chips |
| `--ansr-white` on `--ansr-surface-inverse` | 15.96:1 | inverse bands |
| `--ansr-white` on `--ansr-surface-inverse-soft` | 13.79:1 | a raised card on an inverse band |
| `--ansr-text-inverse-muted` on `--ansr-surface-inverse` | 6.89:1 | leads and kickers on an inverse band |
| `--ansr-text-inverse-muted` on `--ansr-surface-inverse-soft` | 5.95:1 | same, and the `FractionBar` fill on its track |
| `--ansr-accent-inverse` on `--ansr-surface-inverse` | 6.53:1 | the accent on a dark band |
| `--ansr-accent-inverse` on `--ansr-surface-inverse-soft` | 5.64:1 | same, on a raised card |
| `--ansr-white` on `--ansr-gradient-teal`, worst point | 11.68:1 | Screen 2 and the answer header |
| `--ansr-text-inverse-muted` on `--ansr-gradient-teal`, worst point | 5.04:1 | leads on those headers |
| `--ansr-white` on `--ansr-gradient-hero`, worst point | 5.18:1 | **the ask hero, and the only ink allowed on it** |
| `--ansr-text` on `--ansr-action` | 6.27:1 | **primary CTA label** |
| ~~`--ansr-white` on `--ansr-action`~~ | 3.35:1 | **do not use** |
| ~~`--ansr-accent-inverse` on `--ansr-surface`~~ | 2.44:1 | **do not use — dark grounds only** |
| ~~`--ansr-text-inverse-muted` on `--ansr-gradient-hero`~~ | 2.23:1 | **do not use** |

**The two gradient rows are the ones that needed thinking about rather than measuring once, and
both are now bounded at the token so a placement cannot get them wrong.**

- `--ansr-gradient-teal` is capped at `teal-700`. It used to peak at the old `--ansr-teal`, where
  `--ansr-text-inverse-muted` measured **3.30:1** — a latent AA failure on every band using that
  gradient, which survived because the table above only ever measured that ink against the two
  *flat* inverse grounds. Capped, every ink allowed on an inverse ground clears AA anywhere on the
  band.
- `--ansr-gradient-hero` is the reference's own linear navy-to-mint, capped at 60% of the way to
  the accent. Run to the full accent as the reference draws it, white is 2.44:1 at the bottom
  edge; the reference survives that only because its hero copy sits in the top third, which is a
  per-placement guarantee rather than a property of the ground. **Nothing muted may sit on it** —
  hierarchy there is carried by size and weight in one ink, which is what the reference's own hero
  does. It has no muted lead at all.

Re-measure with `python3 .kiro/skills/tastemaker/scripts/check_contrast.py <fg> <bg>` before
introducing any pairing not listed.

## Density & spacing — public screens only

Admin is a dense internal tool and keeps its own density. These apply to the public screens.

- Control height **44px** (`h-11`), against admin's 36px. A public form has to survive a
  phone and a first-time visitor. This is why `src/components/screen1/input-panel.tsx` has
  its own field primitives rather than importing `components/admin/fields.tsx` — sharing
  them would mean an admin tweak silently changing the public screen.
- Section padding is **weighted by role**: connective `py-14 md:py-16`, standard
  `py-16 md:py-24`, pivotal `py-20 md:py-28`. Still tighter than a standalone landing page's
  128–192px tiers, and still for the iframe reason — 192px of air inside an iframe spends the
  host page's scroll on nothing. But the first pass read that constraint as "uniformly tight"
  and capped everything between 48 and 80px, which is why no band had a moment of its own. A
  pivotal band now genuinely outweighs a connective one.
- Card internal padding `p-6` (24px). Content cards, not compact tiles.
- Body copy capped at `max-w-measure` (the token's own 68ch), never a hand-picked `ch`.

## Section separation — three grounds, assigned by role

**`--ansr-surface` (white), `--ansr-surface-tint` (teal-100), `--ansr-surface-inverse`
(teal-deep)**, plus the two gradient grounds. The reference uses four and **repeats them rather
than alternating** — pale mint appears twice and navy twice, and no two adjacent bands share one.
Never a divider rule between bands — the brand's geometry is already
hard-edged and hairline-heavy, and rules between full-width bands read as noise on top of
it. The ground is the separation.

The first pass used two grounds, white against `--ansr-surface-subtle`, alternated at every
boundary, and reserved the inverse ground for the close. **That is what made both screens
read as a form rather than as ANSR.** Measured against `Group 149.svg`, a real ansr.com page:
its hero viewport is ~59% saturated teal and ~20% white, and it alternates three grounds
down the page. Ours was ~95% one value, so no band announced itself and nothing had an entry
point. Two grounds two steps apart is not a sectioning mechanism.

Grounds are chosen **by what a band does**, not alternated blindly:

| Band role | Ground | Why |
| --- | --- | --- |
| Hero | the teal gradient | The brand's own display ground. See below. |
| Evidence in cards | `tint` | A white card needs a tinted ground to have an edge without a border. |
| A band that IS one figure | `inverse` | The most emphatic thing this palette can do without orange. |
| Dense charts, wide tables | `surface` | A ranked chart wants a calm ground and the full measure. |
| The close | `inverse` + the orange pill | The orange is what marks it now, not the darkness. |

**The hero is `--ansr-gradient-teal`, through `.gcc-ground-gradient`.** Not a `bg-*` utility,
and this is a trap worth knowing: `--ansr-gradient-teal` and `--ansr-gradient-orange` are
`background` **shorthand** values — a gradient layer over a solid ground colour — so aliasing
them into Tailwind's `--background-image-*` namespace emits a `background-image` whose last
layer is a colour. That is invalid, so it paints nothing, and it does so **silently** while
still generating a utility class. The alias existed from the start and survived because
nothing had used it. Only `--ansr-gradient-conic` is a real image and stays aliased.

**Two inverse bands per screen plus the close is correct, not excessive.** What distinguishes
the close is the one orange pill, once per screen — not being the only dark band.

## Shape language

- Radius `md` (4px) by default, `none` against a motif. Straight from the token scale's own
  rules.
- **`pill` is for chips, counters, and the ACTIONS** — the primary CTA (`PrimaryCta`), the
  form's submit, the advance-to-Screen-2 button, and the header's quiet button. ansr.com's own
  controls are pills and the radius scale allows it. It works as a signal only because
  nothing else borrows it: every card, panel and field on both screens stays hard-edged.
- **No shadows on the public screens.** Separation is carried by tint and hairline borders.
  The brand is graphic, not glossy, and elevation tokens exist for admin's overlays.

## Motion

One moment per screen, and on Screen 1 it is the ask-to-answer swap: the evidence bands
stagger in behind the new header. `.gcc-enter` in `globals.css`, driven by a
`--gcc-enter-index` custom property so the stagger is data rather than hand-written delays.
Durations and easings come from the motion tokens; the whole sequence stays under the 400ms
flow threshold per band.

**No scroll-driven motion, ever, on the public screens.** The tool is iframed and does not
own the scroll container, so an IntersectionObserver against our own viewport fires for
content the visitor cannot see — the parent decides what is on screen. This is a correctness
constraint, not a taste preference, and it is why no GSAP/ScrollTrigger dependency was added.

Wrapped in `prefers-reduced-motion: no-preference` as an opt-in, on top of the global
`reduce` collapse already in `tokens.css`.

## Brand assets

**One motif moment per screen, on the entry point only.** The evidence bands get none —
ornament is not a substitute for hierarchy, and a dense evidence block wants no competition.

**Ornament on an inverse ground is its own posture, `.gcc-motif-inverse`.** The
`.ansr-motif` token opacity of 0.18 is calibrated for dark ink over a light ground, where the
job is to stop a graphic competing with black text. Over deep teal, 0.18 of a *light* ink
composites to within a couple of RGB values of the ground — measurably present, visibly
absent. `--ansr-motif-opacity-inverse` (0.4) is the named posture; the closing band had
already needed a hand-rolled override for exactly this, and now does not. Raising it costs no
contrast, because copy on an inverse band is white and a light motif raises the floor beneath
it rather than lowering the ceiling above it.

Screen 1 uses **`pin-diagonal`**, recoloured onto three light ramp steps and trimmed to
`public/brand/hero-diagonal.svg`, placed with `.gcc-hero-diagonal` — oversized, anchored past
the trailing edge, cropped by the header's own `overflow-hidden` and masked away from the
headline. Three ramp steps rather than one flat tint, so the streaks keep their internal depth
instead of flattening to a silhouette.

It replaced `arc-dome`, and why is worth keeping: the dome was the right instinct on a white
header and the wrong asset on a teal one. Stretched wide enough to bleed across a header, the
only part of a dome that fits inside that height is its flattest slice — which reads as
diagonal wallpaper rather than as arcs. If the flattest slice is what reads, the honest asset
is the one that is actually diagonal. The manifest's warning about chart-like motifs does not
apply on a header; there are no bars on it.

Both motifs stay hidden below `md`, where the header text runs full width and there is no
empty ground to occupy. Nothing is lost — they were never carrying meaning, and on mobile the
gradient carries the hero on its own.

No logo on the public screens — the host ansr.com page already carries it, and a second
lockup inside the iframe duplicates it.

## Structure

Not a marketing macrostructure. Screen 1 is a two-state tool: **ask**, then **answer**.

Answer bands widen from the most specific evidence to the least, so the least specific lands
immediately before the ask: comparable peers → the industry count → the largest in the
industry → the functions they run → where they are → the national base → the call to action.

Every band is a `<section>` with `aria-labelledby`. A `<section>` with no accessible name is
not a `region` landmark, so it is unreachable by role for a screen-reader user and untestable
by role in the browser suite.

**Two band shapes, `stack` and `split`, chosen by what the band draws.** `split` puts the
heading in a leading 5-of-12 column beside the content — ansr.com's dominant section shape,
and the one thing that lets a heading be genuinely large without pushing the evidence off the
fold. It is for grids and lists (`industry`, `functions`). `stack` keeps the heading above
full-width content and is for anything needing the whole measure: ranked bars with figures at
their trailing end, the city map, the three-figure scale row. A ranked chart in a 7-column
well is crushed.

One consequence to remember: `CommonFunctionsView` went from two columns to two columns inside
a 7-column well, which is tighter than it looks on paper. Check a split band's content at `lg`
rather than assuming the well is as wide as the band.

## Reference intelligence

- Design read: an **embedded evidence tool** for CIO/CTO/COO/HR and finance leaders at large
  global companies, mode **Persuade — by evidence, not by pitch**, in an institutional,
  hard-edged visual lane set by the brand.
- Dials: variance **3** (this must look like ANSR, not like something novel), motion **3**,
  density **6**, art direction **7**.
- **Art direction was 4 and that was the error.** "Institutional, restrained" was read as
  "quiet", and quiet on a white ground with mid-scale type is indistinguishable from
  unfinished. ansr.com is itself heavily art-directed — full-bleed saturated grounds, 72px
  display type, graphics bleeding off the canvas. Matching the brand *requires* a high setting
  here; 4 was a misreading of the brand, not a safe interpretation of it.
- **The reference is `Group 149.svg`**, a 1440×5531 export of an ANSRx page. It is fully measured
  in `docs/ansrx-visual-language.md` and **the export itself is no longer needed** — read the
  measurement, not the file.
- **Take its colour too.** This line said the opposite for a day: that the reference's palette was
  pre-brand deck art and only its composition could be trusted. That reading came from
  `brand_lint.py` rejecting the reference's own most-used accent, which looked like evidence and
  was actually just the lint being older than the art direction. The reference was not built from
  the docx palette at all — different action orange, different ground, and an accent the docx does
  not contain — so "newer direction" and "built from the old deck" were the two candidate
  explanations, and it was the first. **Everything now comes from the reference: colour,
  composition, scale and rhythm.** The one thing still refused is its accessibility: white on its
  orange pill, and its 1.11 body leading.
- Measured in `docs/ansrx-visual-language.md` — typeface and weights, the
  type scale with real line-height ratios, the 12×86/21 grid, the four-ground band system and
  its rhythm, every measured hex against its token, the five motifs as reproducible parameters,
  and the anatomy of all eight components. Read that instead of re-deriving; it also records how
  each figure was obtained, so a suspect number can be re-measured rather than argued about.
- Anti-reference: the SaaS marketing page. This audience discounts a screen that reads as
  marketing, and one fabricated-looking detail discredits the rest. Show, caption, cite the
  method, state the limits.

## Shared, not per-screen

`src/components/public/` holds what both screens use: `primitives.tsx` (`Section`, `Stat`,
`Chip`, `FactList`, `Provenance`, the number formatters), `screen-header.tsx` (the one
motif-bearing header band, `HeaderKicker`, `QuietButton`, `InputSummary`), `closing-cta.tsx`
(the single inverse band), and `tool.tsx` (the phase machine). It moved out of
`screen1/` when Screen 2 wanted most of it — a cross-folder import would have made `screen1`
the owner of shapes both screens depend on.

Numbers group in **`en-US`**, and the audience is the reason rather than the subject. The tool
is about India and is read by CIOs in the US, Europe and Japan; Indian grouping renders 600,000
as "6,00,000". Screen 1's figures are byte-identical either way, which is why this went
unnoticed until Screen 2 arrived with figures in the millions.

## Screen 2 — the decisions it settled

Carried over unchanged: the colour contract, 44px controls, weighted section padding, the
`.gcc-enter` stagger, one motif on the header. Its grounds are the hero gradient, one `tint`
field holding the tabs and cards, and the inverse close — thinner than Screen 1's alternation
because a tabbed data view is one field by nature, and the white cards on the tint are what
carry it.

**Motif: `arc-quarter`**, recoloured to `--ansr-teal-500` and trimmed, at `.gcc-rings`. Same arc
family as Screen 1's horizon so the two read as one system, but a quarter rather than a dome — a
measured segment rather than an open horizon. Its concentric origin is at the asset's leading
top and the rings sweep down and across, so anchoring the box to the trailing edge puts the void
where the leading-aligned headline is. The manifest's own warning about chart-like motifs ruled
out `pin-cascade`, `pin-staircase` and `pin-rows-interlock`: this screen is full of real bars,
and a motif made of bars beside them reads as data.

**Tabs are the Radix primitive, not `@shadcn/tabs`.** The registry wrapper was installed,
evaluated and removed for three measurable reasons: 36px triggers against the public screens'
44px, `transition-all`, and a shadow on the active trigger. Roving tabindex and the tab/panel
ARIA wiring still come from Radix. Same call `input-panel.tsx` made about admin's fields.

**No group headings inside a tab.** The four lenses re-lettered as public subheadings would have
been a transcription of an internal filing system. What each card leads with is its own
question; the order is by how much of the eye a metric needs — single figure, spread, parts,
grid — which also makes the card grid fill without half-rows.

**A withheld metric reads as sealed, not as loading.** `.gcc-held`: static, hatched,
hard-edged, and uniform wherever it repeats, because a varying width is how a skeleton imitates
text and would imply a value. Stronger border and a chip rather than a dimmed card — dimming
says unavailable, a firmer edge says closed. The held metrics are collected at the end of the
tab under one heading that says why, because scattered things look like failures and collected
things look like a decision.

**Percent bars scale to 100, always; everything else to the largest part in the metric.** The
cost of that rule is short bars for growth rates. The alternative — scaling percentages to the
set's own maximum — draws 35% as a full bar, and a bar that overstates a value is worse than one
that understates a difference. Same instinct as the catalogue's own range-collapse rule.

**Charts were considered and declined as a LIBRARY, then built as a vocabulary.** See the
next section — `src/components/public/charts.tsx` is now the shared chart layer for both
screens, and the reasons for not reaching for `bklit-ui` (`@visx` + `motion`) hardened rather
than changed.

**Motion is the tab switch.** Radix unmounts the inactive panel, so the panel's three blocks
replay `.gcc-enter` on every switch. Three steps rather than one per card: twelve staggered
cards would put the last most of a second behind the first.

## The chart vocabulary — what both screens draw with

`src/components/public/charts.tsx`, shared so a bar means the same thing on both screens.
Eleven marks: `RankedBars`, `BarTrack`, `StackedShare`, `RangeBar`, `NestedBar`, `FigureRow`,
`IndexLollipop`, `Dumbbells`, `OrdinalGrid`, `NumberGridChart`, `FractionBar`,
`ProportionSplit`.

**The governing rule: every mark carries its figure in text beside it, and nothing is behind
a hover.** That is what rules out a charting library here rather than taste. A tooltip-driven
chart puts the number one pointer-hover away, which on a phone is nowhere — and this tool is
embedded in a marketing page a CIO will open on a phone. It is also why every mark is
`aria-hidden`: a mark is a SECOND reading of a figure already present, so hiding it loses
nothing. `bklit-ui` is a good library and its charts are hover-first; that is the mismatch,
not the dependency weight.

**Which chart draws what is decided in the view model, not the component.** `breakdownDisplay`
and `gridDisplay` in `src/data/screen2.ts`, so a chart choice is a property of the data that a
test can pin, and `metric-card.tsx` has no selection logic in it at all. Three of those rules
exist because the obvious version drew something false:

- **A shared axis across a whole index grid, with the base drawn as a rule.** Per-row scaling
  made "India = 100" the *shortest* mark in a row where the United States drew a full one. The
  numbers were right and the picture said the opposite. Direction now lives in the metric's own
  `indexBaseline` text ("Lower is cheaper"), because only the author of a metric knows it.
- **A two-column index is a gap, not two bars.** The answer to "what would we save" is the
  distance, so the delta is formatted in the view model and sits beside the row label. Both
  `Dumbbells` and `IndexLollipop` draw a visible zero tick — a cost index clusters at the top
  of its own scale, and a truncated axis is exactly how you would fake this chart.
- **Stop drawing bars where a bar would mislead.** 99.95% against 99.5% is two identical bars
  on an honest axis and a fabricated difference on a truncated one, so `FigureRow` shows the
  figures alone. And nesting a part inside its total requires the two parts to share a
  `unit` — without that test, 1,400 meetup groups and 120 conferences were drawn as
  containment, asserting that a conference is a kind of meetup group.

**Part-to-whole gets one divided bar, never a row of bars.** Four bars against a 100% axis say
"each of these is some of it"; one divided bar says "these four are all of it". Same reasoning
puts Screen 1's industry count on `ProportionSplit` — five named peers as the leading slice of
fifty-nine is what makes them read as a selection rather than as the supply, which is the
block's whole job.

**Order is never re-sorted by value.** The catalogue's own orders are meaningful — graduate
output groups by discipline family, latency runs outward by distance, milestones run by size —
and sorting would destroy all three to buy a comparison the shared axis already gives.

**Colour in a chart is ordinal only, on the teal ramp: darker means more.** Categorical hue is
not available — the teal steps sit within ΔE 0.087 — so anything that must survive greyscale is
carried by form: fill against outline, or a labelled step count.

## Card width is weighted by what a card draws

`metricWidth` returns `third | half | full` onto a twelve-column grid, and the panel is
`items-start`. Both halves matter: on a two-column stretch grid a single figure beside a
nine-part breakdown rendered as a card four fifths full of nothing, which was the worst
artefact on either screen. Ordering is by width, so thirds fill a row exactly before halves
begin.

**Rows are then packed so none is left part-empty** — `packWidths` in `function-view.tsx`, in the
component because "how much of this row is left over" is a layout question. It replaced a
narrower rule that promoted a LONE third to a half: that fixed finance's single scalar and missed
the common case, because technology has five thirds and drew three, then two beside a visible gap,
then a lone half card with an empty half-row next to it. Two holes in a tab, and an empty cell in
a grid of figures reads as a card that failed to load.

Three properties hold it together. Widths only ever **widen** — a narrower card is the metric's
own shape being misrepresented. Nothing is **reordered**, because the order is by how much of the
eye a metric needs. And a **scalar is never promoted to full**: one figure across twelve columns
is the four-fifths-empty card this whole weighting exists to prevent, so finance keeps one
part-empty row deliberately, as the cheaper of the two artefacts.

## The same rule, applied to Screen 1's two grids

Both were three-to-a-row on a grid that could only divide by three, so both left holes at `lg`.
Six columns divide by two and by three, which is what lets a row be filled either way.

- **Peer cards** — `peerSpans` in `evidence.tsx`. A card takes two columns or three, whichever
  tiles the set exactly: five peers draw 3 + 2, four draw 2 + 2, three fill a row already. Only a
  single peer cannot tile, and it keeps the narrow width — a lone card stretched across a row is
  not a comparison, and a thin industry is supposed to look thin. Widening rather than equalising
  heights, because `items-start` is there to stop a six-city company setting the height of the
  four beside it.
- **The ask form** — `FieldProps.span` in `input-panel.tsx`. Five controls cannot tile two
  columns and the leftover cell landed beside Headquarters, a hole in the middle of the one thing
  on the entry point a visitor has to *do*. The two text inputs take three columns each and the
  three selects take two each, so both rows fill and the panel is 96px shorter. DOM order is
  untouched, so tab order and the spec asserting the six inputs are unaffected. The two rows
  divide differently and therefore do not share internal edges; that is the price of filling
  them, and it is cheaper than the hole.

**The advance band's empty trailing width is not one of these.** `split` was tried there and
rendered worse: the content column is `items-start`, so a single pill top-aligned with the kicker,
which put the action ahead of the sentence motivating it in reading order and detached it from its
own heading. It stays `stack`, and it reads as a deliberate pair with the closing CTA below it —
same heading-lead-pill shape, teal then orange. Do not re-try `split` here.

## The ask screen — what the reference pass settled

The entry point, rebuilt against `Group 149.svg` rather than refined. **Only this screen.** The
answer state and Screen 2 keep their own header, their own gradient and Inter, and rolling any of
this outward is their pass, not a side effect of this one. Two bands, one motif each, no rule
between them.

**A separate hero component, and the reason is a contrast bound rather than taste.**
`ScreenHeader` is shared by the answer state and Screen 2, and both need something the reference's
display ground cannot carry: a muted ink for a lead, a facts summary, a way back. On
`--ansr-gradient-hero` a muted ink measures 2.23:1. So a shared header would have had to give up
either the ground or AA on two screens. `ask-hero.tsx` exists because the ask has no muted copy on
it and can therefore use the real ground.

**The hero is white-only, and hierarchy is size and weight.** 80px at 1.05 leading in Regular,
then 20px in Light 300, then a pill. That is the reference's own hero — it has no muted lead at all
— and it is what the ground allows. The 1.05 is load-bearing: at our `tight` 1.15 a two-line
headline reads as two lines rather than as one object.

**The hero's pill is outlined, not orange, and it moves focus rather than linking.** The
reference's hero pill is orange because its hero is the only action in that band; ours is not, and a
screen with two orange controls has no primary action. It focuses the industry select, which is the
only scrolling mechanism the iframe constraints leave — a fragment link would push a history entry
inside a frame that does not own its URL, and nothing may read scroll position. It is genuinely
load-bearing on a phone, where the form is entirely below the fold. A browser spec pins it, and
pins the two-refs-on-one-node arrangement it needs: passing the hero's ref as a second `ref` prop
silently replaces the validation ref, and the only symptom is focus quietly not moving on a failed
submit.

**The form panel is the reference's offer card, not a bordered box.** Radius 0, a generous top
shoulder, no border, no shadow, and it ends in a dissolve. Ten of twelve columns, deliberately not
centred — the reference's own stat card sits right of centre with empty ground beside it.

**Three things about that panel that only the render showed.**

- **`.ansr-dissolve` must be a SIBLING of the panel, never a child.** As a child it inherited the
  panel's own white underneath itself, so the masked hairlines were white on white while the
  panel's background still filled the box and drew exactly the hard edge the dissolve exists to
  remove. It rendered as 96px of blank card. The effect only exists where its fill meets a
  different ground — and it needs length, since white on the mint ground is 1.27:1 by construction.
- **`.ansr-bar-ramp` is a vertical field in the trailing ground, not a full-bleed band.** Run
  across the band's width it drew a picket fence: the loudest thing on the screen after the
  headline, reading as a divider rule the brand never draws, and continuing down either side of the
  panel as though the panel had been dropped on it. It also needs a **wider pitch than the
  reference's measured 20px** — those figures are for a 219-wide panel where the ramp is one
  graphic, and tiled down a tall strip the eye reads the repeat instead of the ramp.
- **On a phone the panel is full-bleed.** Inset, its own padding put its content 24px further in
  than the hero's text, and left the fields the narrowest thing on either screen. The band also
  drops its top padding there, because 64px of mint between a dark hero and a white panel is too
  thin to read as a band and too thick to read as nothing. Two full-bleed blocks meeting is
  correct: the ground change is the separation.

**Form controls are filled with one bottom rule, radius 0** — `.gcc-field`. Not a style change:
`--ansr-border-strong` is **1.78:1 on white**, so the bordered box it replaces never had a boundary
meeting 1.4.11's 3:1 for a control. It looked fine because a 4px grey box reads as a field by
convention. The fill is the band's own tint against the panel's white, so the field is cut out of
the panel rather than drawn on it, and the rule is `--ansr-accent` at 7.72:1. 44px stays.

**Selected state is a fill inversion, not a border tint.** The status tiles invert to the accent
ground with white copy. No hue is available for "chosen" that is not already spoken for, and an
inverted fill survives greyscale where a border tint does not. The radio's `accent-color` flips
with it, or it is a teal dot on teal.

**Errors clear when the field is answered.** Validation still only runs on submit — marking a field
invalid before someone has finished answering it is noise — but an error surviving its own
correction is worse: `aria-invalid` stays true, the screen reader keeps announcing it, and the
orange rule keeps drawing the eye to the one row that no longer needs it.

**Copy — three lines that shipped and were wrong**, each now asserted absent by a spec:

- *"Four answers. Twenty seconds."* promised a length, above a form with six fields. A count that
  disagrees with the thing under it is worse than no count. Removed rather than corrected: a
  visitor deciding whether to spend ninety seconds is not weighing twenty against forty.
- *"Nothing you enter is stored or sent to us"* was false in the half that matters. The answers
  **are** sent, to a server action, because peer matching cannot happen in the browser without
  shipping the dataset there. In front of an audience that reads privacy language for a living, a
  claim disprovable from a network tab discredits every measured figure beside it. Now: "Your
  answers build this one result. Nothing is kept."
- *"(optional)"* beside the company name talked visitors out of the one input that personalises
  every sentence of the result. Line of business keeps the marker, where it explains a control
  disabled until an industry is chosen. The small inconsistency is the cheaper of the two.

The headline states the visitor's situation rather than describing the tool, which is what 80px of
type is for: "See who in your industry already runs a GCC in India" was the mechanism; "Your
industry is already in India" is the finding, and it is true for every industry in the data.

**Uppercase form labels were tried and reverted.** At 14px across five fields, tracked caps turn a
public form into a data-entry table. The reference's own small label is sentence-case Light; weight
carries a label here.

**A public spec locates the ask by `h1#ask-title`, never by its wording** — the same rule
`helpers.ts` states for the evidence bands. The headline's words are asserted once, on their own,
as the subject.

## Screen 1 — what the refinement pass settled

- **The ask is a bordered panel with a visible heading**, not five controls loose on the tinted
  band under an `sr-only` h2. It is the one thing on the entry point a visitor has to *do*.
- **Peer cards lead with the year** — "In India since 2013" as the kicker above the name. For
  someone evaluating a first centre, that a comparable company has been doing this for a decade
  is the fact on the card that changes a mind. Cities are plain text, not a chip each: five
  chips wrapped to three rows of pills and read as filters, which nothing here is.
- **Peer cards carry one bar**, scaled against the largest of the five, because "companies like
  yours are already here" invites "and how big did they get" immediately. `PeerCard.sizeShare`
  is the single definition of that ratio; `LargestEntry` no longer carries its own copy.
- **The city map is a plotted field, not a scatter.** A faint graticule (a reference, not a
  boundary — invariant 8 still holds and the caption still says so), density carried by fill
  depth as well as by dot area, and the leading three cities labelled in place on whichever
  side has room, decided from the dot's own position rather than tuned per city.

## The one brand texture, and where it sits

`texture/deep-teal-diagonal-wide.svg` cropped to a 480-unit band via `brand_asset.py` and
placed on the closing CTA as `.gcc-close-streaks`. The close earns it: it is the only band that
asks for something rather than showing something, and it was a flat rectangle. The motif
opacity is overridden for this placement — the token's value is the posture for ink over a
*light* ground, and over the inverse band it composited to within a couple of RGB values of the
ground. Contrast measured, not eyeballed: white 10.48:1, the 80% body copy 7.31:1.

## Copy — who it is for

Not ANSR, and not an analyst. A CIO, COO, CHRO or CFO at a large global company with no India
centre yet, who will give this ninety seconds. Three rules the rewrite applied, each of which
cost the previous version something:

- **Every heading states the finding, not the mechanism.** "The wider industry" made the reader
  work out what they were being shown; "The five above were a selection, not the supply" does
  not.
- **Leads carry one fact.** All three framings opened with the same twenty-word list of the
  sections below — a table of contents in prose, immediately above the headings it listed.
- **The tool never narrates its own integrity.** "We would rather show you three defensible
  comparisons than pad the list" was the most quotable line on the screen and the most
  self-regarding: it answers a doubt the reader did not have, and plants it by answering. Not
  padding a peer set is an invariant enforced in `matchPeers` and asserted in `data:verify` —
  it does not also need to be a promise on the page. A browser spec now asserts the line is
  absent.
- **The ask is a card with a visible heading**, not five controls loose on the tinted band
  under an `sr-only` h2. It is the one thing on the entry point a visitor has to *do*. The
  card's own treatment is the section above, which supersedes the "bordered panel, radius 0"
  this bullet used to describe.