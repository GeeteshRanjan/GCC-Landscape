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

**Opted into per surface, not set on `body`.** Both states of Screen 1 carry `font-display` now;
Screen 2 and admin still resolve to `--ansr-font-sans`. Admin stays on Inter deliberately —
tabular numerals and small-size legibility matter more there than brand voice. Screen 2 is the
remaining one, and it is a pass rather than a class: the face's metrics differ from the system
sans, so anything on it tuned by eye can reflow.

**The ask being the only surface that opted in was itself the bug.** Ask-to-answer is a single
state change with no navigation, so the typeface changing under the visitor was the most noticeable
thing about the transition — and it changed the wrong way, brand voice on the form and UI sans on
the evidence.

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

**Two AMBIENT loops exist, both outside that scale.** The customer-logo marquee
(`--ansr-duration-marquee`, 48s) and the density map's hub halo (`--ansr-duration-pulse`, 3.2s).
Both are opt-in inside `no-preference` with a real fallback, because tokens.css's global 1ms
duration clamp under `reduce` leaves an infinite loop flickering at frame rate rather than
stopping it. The halo's rule — animate a ring behind the mark, never the mark, because the mark's
size is the figure — is in the answer state's section below.

Wrapped in `prefers-reduced-motion: no-preference` as an opt-in, on top of the global
`reduce` collapse already in `tokens.css`.

**The ASK now has a moment too, and its absence was visible once everything around it was
polished.** Every band on the answer state and all of Screen 2 arrive on `.gcc-enter`; the
entry point — the first thing anyone sees — was the one surface that snapped into existence.
Three steps at the same `--gcc-enter-index` cadence: headline 0, lead 1, form card 2, so the
page assembles top-down and is settled inside 500ms. The dot map fades separately, for the
reason recorded in its own section. Nothing is staggered INSIDE the card: the form is the
thing the visitor came to use, and assembling it field by field behind an already-delayed
card buys an effect at the cost of the one interaction that matters.

**Two interaction-level animations, both on the form, and both are the cheapest polish
available:**

- **The select panel's entrance** — 180ms, `--ansr-ease-entrance`, from `scale(0.98)` with
  `transform-origin: top`. It grows out of the field it is anchored to; scaled from the
  centre it appears to arrive from nowhere and drift into place. From 0.98 and never from 0,
  because nothing arrives from nothing. **No exit animation**: the panel unmounts on select,
  and holding it on screen to fade it out delays the one thing the visitor asked for. Slow
  where the visitor is deciding, fast where the system is responding.

  **A keyframe rather than a transition, which inverts the usual advice for a reason.**
  Transitions win for elements toggled rapidly, because they retarget mid-flight where a
  keyframe restarts from zero. This panel is conditionally rendered — there is no resting
  state to interpolate from and it is out of the DOM before it could be re-entered.

- **`active:scale-[0.98]` on the submit.** A button that does not move under a press reads as
  a picture of a button. Named properties (`background-color`, `transform`), never `all`, so
  the transition cannot pick up something it was never measured for.

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
Twelve marks: `RankedBars`, `BarTrack`, `StackedShare`, `RangeBar`, `NestedBar`, `FigureRow`,
`IndexLollipop`, `Dumbbells`, `OrdinalGrid`, `NumberGridChart`, `FractionBar`,
`ProportionSplit`.

**The governing rule: every mark carries its figure in text beside it, and nothing is behind
a hover.** `FractionBar` quietly broke it for months and nobody noticed, which is worth knowing
about the rule rather than about that component: its numerator and denominator were both on the
page, so the block looked fully labelled, and the PROPORTION the bar actually draws was nowhere.
A rule this file states is not self-enforcing — check that the figure a mark draws is the figure
written beside it, not merely that figures are present. That is what rules out a charting library here rather than taste. A tooltip-driven
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

- **Peer cards** — superseded by the overhaul pass. `peerSpans` and the six-column grid are gone:
  the grid is twelve columns with a full-width lead card, and `supportingSpans` tiles the 1–4 cards
  under it — every one of those counts divides twelve exactly, which is the reason the lead is full
  width rather than half. The packing RULE carried over unchanged and is what made the new grid
  cheap: widen only, never narrow, never reorder, and let a single peer stay part-empty because a
  thin industry is supposed to look thin. `items-start` is still there to stop a six-city company
  setting the height of the three beside it. See "The peer grid is a lead card plus supporting
  cards" below.
- **The ask form** — and it is the one grid here that ended up solving the packing problem by
  removing a card rather than by widening one. Five controls cannot tile two columns, and the
  spans that made them fit put a 3/3 row above a 2/2/2 row, which share no interior edge. Line
  of business then moved inside the industry dropdown, so there are four controls: two clean
  rows plus a full-width submit, no spans and no holes. `FieldProps.span` is gone. The current
  grid and the two arrangements it supersedes are in "The form's grid" below.

**The advance band's empty trailing width is not one of these.** `split` was tried there and
rendered worse: the content column is `items-start`, so a single pill top-aligned with the kicker,
which put the action ahead of the sentence motivating it in reading order and detached it from its
own heading. It stays `stack`, and it reads as a deliberate pair with the closing CTA below it —
same heading-lead-pill shape, teal then orange. Do not re-try `split` here.

## The entry point — the five-band composition

The ask state is five bands that read as one page, and this section replaces the
reference-pass description of it entirely. What that pass settled about the ANSWER state
and Screen 2 is unchanged and still recorded above.

    1. the teal gradient hero, leading-aligned, with the dotted map on its trailing side
    2. the white form card, overlapping the hero's bottom edge
    3. the pale-teal band the card's lower half sits on
    4. the customer-logo strip
    5. the dark impact band

**A separate hero component, and the reason is a contrast bound rather than taste.**
`ScreenHeader` is shared by the answer state and Screen 2, and both need something the
reference's display ground cannot carry: a muted ink for a lead, a facts summary, a way
back. On `--ansr-gradient-hero` a muted ink measures 2.23:1. So a shared header would have
had to give up either the ground or AA on two screens. `ask-hero.tsx` exists because the
ask has no muted copy on it and can therefore use the real ground.

**The hero is leading-aligned and inset, and carries exactly two text elements.** 80px
Medium 500 at 1.05 leading, then 24px Light 300. Nothing else — no eyebrow, no pill, no
proof line.

- **Leading-aligned, which reverses a centred pass and is back to the reference's own hero
  anatomy.** Centring was the honest composition for a band with nothing on either side of
  the copy, which is what this band was for one pass — no ornament at all. With the dotted
  map back, centring is wrong twice: the copy sits off-axis from both the graphic and the
  band, and the graphic has to be pushed to the trailing edge to clear copy reaching three
  quarters of the way across. Leading-aligned, the band is two things beside each other and
  both get more room than centred gave either.
- **The leading edge is the FORM CARD's, derived rather than tuned, and this is the single
  change that made the two bands read as one page.** They were three different left edges
  within 130px of each other — copy at 187, card at 272, the card's own heading at 320,
  measured at 1440. Nothing looked broken and nothing agreed, which is exactly the register
  that reads as unfinished.

  A tuned percentage cannot fix it, and the previous `ms-[5%]` is the proof: the card is
  CENTRED and CAPPED, so the offset between the container's gutter and the card's edge is a
  different number at every viewport width. So both bands now derive their edge from the same
  box — `max-w-content px-6 md:px-12`, then `mx-auto max-w-card` inside it — duplicated
  verbatim in `ask-hero.tsx` and `peer-view.tsx`. The card container's `px-4` was raised to
  `px-6` to match, which was the whole misalignment at 390.

  **`--ansr-container-card` is therefore a COMPOSITION token now, not just this card's
  width.** Widening it moves the headline, and moves the dot map's leading mask fade with it,
  because that fade is measured against where the copy ends. One decision, three files, each
  of which says so.
- **The copy then sits outside that edge — 24px at `lg`, and the card's WHOLE margin from
  `xl`, which puts it on the container's own gutter.** ANSR asked for it further left twice.
  This is not a return to a tuned inset: `max-w-card` still puts both bands in the same place
  at every width, and `lg:-ms-6 xl:-ms-36` pulls a fixed distance off it — at `xl` and above
  that distance is exactly the card's margin, so the copy lands on the gutter without this
  file knowing where the gutter is. The failure the derivation exists to prevent was three
  edges agreeing on nothing; two edges a deliberate 144px apart is a composition. The gutter
  is also where "further left" runs out — past it the copy is off the page's own edge.

  **Desktop only, because the room is only there on a desktop.** At `md` the card already
  fills the container between its gutters, so an outdent would spend the gutter and leave the
  headline 8px off the viewport edge. Quarter strength at `lg`, where the card has 16px of
  margin to give; the whole margin from `xl`, where it has 144px.

- **The cap is per element, not on the block, and the lead is 6rem wider than the headline.**
  One cap made the paragraph inherit a limit chosen for the headline: `max-w-hero` (44rem) is
  what stops an 80px display line running out as a strapline, and it broke ANSR's
  137-character sentence to three lines with a two-word orphan. The h1 keeps it; the lead
  takes `max-w-lead` (50rem) from `xl`.

  **The shift and the widening are one decision — 6rem left, 6rem right — so the block's
  trailing edge is unchanged at every width.** Measured: 744 at 1024, 848 at 1280, 928 at
  1440, before and after. That is why the map's leading mask fade did not have to move, and
  it is the constraint to respect next time: widen the lead without shifting left by the same
  step and the sentence runs onto the map's visible field. Verified at 1024, where the wider
  cap is deliberately NOT applied — nothing shifts left there to pay for it, and unconditional
  it pushed the tail from 744 to 840 against a fade completing near 625.

  **Below `xl` the lead stays at 20px rather than 24px**, which is how the same two lines are
  bought at the narrower cap. Two lines is the target at every width from `md`; the phone
  takes four and should.
- **Medium 500 is MEASURED off the wordmark, not chosen — and this is the fix for a real
  mismatch.** The heading is the one place in the tool where drawn letters and set letters
  share a baseline, so its weight is not free. The lockup's N stem is 5.18 units against a
  37.86 cap height, a ratio of 0.137; Hanken Grotesk's stem-to-cap is ~0.11 at Regular,
  ~0.138 at Medium and ~0.20 at Bold. So Medium matches to a rounding error, and the Bold
  this shipped as was half again as heavy as the mark beside it — two fonts on one line.
  **This supersedes the earlier Bold argument**, which was about presence against the white
  card; leading alignment and keeping 80px rather than dropping to 72 pay that back.
- **`tracking-body` (0), where every other display heading takes `tracking-display`
  (-0.02em).** Same measurement: the lockup's A-to-N sidebearing gap is 3.96 units, ~0.075em
  against its implied em — normal to slightly loose. This is the only heading with a drawn
  word in it and the only one that should differ.
- **The kicker is gone because the product label IS the headline.** An eyebrow above it
  would have been the same words twice. `heroCopySchema` has no `kicker` field, so the slot
  cannot be refilled by accident.
- **The pill is gone because the form is no longer below the fold.** It moved focus to the
  industry select, which earned its place when the form was a separate band; the card now
  overlaps the hero, so its first field is already visible and the pill was a control that
  scrolled you to something you could see. The two-refs-on-one-node arrangement it required
  went with it.
- `--ansr-container-hero` (704px) caps the block. `--ansr-measure` is the reading measure —
  correct for a paragraph, far too wide for 80px type, which runs as one line most of the
  way across a 1280 canvas and leaves the line below it stranded.

**"ANSR" in the headline is set in the action orange, and only the FIRST occurrence is.**
That is a contrast bound, not a stylistic rule. Orange on `--ansr-gradient-hero` measures
4.27:1 at the top of the band falling to 2.95:1 by 45% down, so it clears the 3:1
large-text floor on the headline's first line (3.62:1 at worst) and **fails on its
second**. The first line always begins at the hero's top padding and is exactly one
line-height tall whatever the title's length, so a leading "ANSR" is legal by construction
rather than by luck. The admin hint says to keep it first, for the same reason.

**Matched as a literal token, not sliced by position** — the opposite of the call made for
the impact band's heading. There the name is the last word of a fixed string, so two copy
fields are right. Here the title is admin-editable free text, so two fields would mean an
admin had to know to split their headline; matching a literal survives rewording, and
removing the word simply removes the mark.

**What lands in that slot is the DRAWN WORDMARK, not the typed word** — `ANSR Name.svg`,
inlined. It is the only literal use of a brand asset on either public screen, which the
adapt-never-paste rule allows for logos and nothing else. Two measurements make it sit in a
line of type rather than beside one, and both are in `ansr-wordmark.tsx`:

- **Sized off CAP HEIGHT (0.72em), not font size.** The lockup's letters fill its artboard
  top to bottom, so matching the font size sets the mark about a third too large and it
  rides above the line.
- **`fill="currentColor"`.** The mark inherits the ink of the span it replaced, so the
  orange is still one decision made in one place — and the contrast bound above still
  governs it, unchanged, because a logo in a headline is large-scale non-text content held
  to the same 3:1.

The accessible name is unchanged: the SVG is `aria-hidden` and the word sits beside it in
`sr-only` text. Heading focus moves here on every phase change, so the name is not
something to leave to how a browser flattens an inline graphic's label.

**The overlap is two numbers in two files and they only mean anything together.** The
hero's bottom padding is oversized so there is hero left under the card; the card's
negative top margin pulls it up into that space. Roughly the upper third of the card sits
on the gradient at desktop, less at tablet, least on a phone. A browser spec asserts the
fraction, because:

**`flow-root` on the transition band is what makes the overlap happen at all.** The card's
negative top margin is on the first in-flow descendant of a section with no top padding or
border, so it COLLAPSES THROUGH and moves the section itself by the same amount — the tint
ground travels with the card, the two stay flush, and the rendered result is a card sitting
exactly on the boundary. It looks like the margin was ignored. A block formatting context
stops it, and `flow-root` is the one way to get one that does not also clip, float, or
change the box's own layout. **`overflow-hidden` would clip the third of the card that is
supposed to be on the hero**, which is why the band that replaced it has no clipping
ancestor at all.

**The card is rounded with one very light shadow, a departure the brief asked for.**
Everything else on the public screens is hard-edged and shadowless. It earns the exception
by crossing two grounds: a border on a card spanning a light-to-dark boundary is visible
against one and invisible against the other, so elevation is the only separation available.
`--ansr-container-card` (896px) caps it — wider than the hero's text block, which the brief
allows and two columns of 48px controls need.

**Two motifs from the previous version are gone rather than moved.** The bar-ramp field in
the trailing ground, because the form is centred and leaves no trailing ground. And the line
dissolve under the panel, because `.ansr-dissolve` only exists where its own fill meets a
DIFFERENT ground, and this card's fill meets two.

### The hero's ornament: a dotted world map

**The fan is gone and a dotted world map is in its place**, with India picked out in the
action orange. It is the first ornament on either screen that is not a brand motif — a
generated graphic, from `scripts/build_dot_map.py` into two SVG paths, styled by
`.gcc-hero-map`. It obeys the same posture rules a motif does: held back, masked at every
edge, measured against the ink over it, out of the accessibility tree, `pointer-events:
none`.

**It is a WINDOW on the world, not the whole of it, and that frame is the decision every
other number follows from.** Three requirements fight: a dot has to be legible on a 1x
display, India's dots have to be spaced far enough apart to read as dots rather than as a
smudge, and the graphic has to fit the trailing half of a hero. Drawn to the full 360° India
is ~70px tall there and its dots merge. So the window is 219° wide (lon -71 to 148, lat -34
to 75), asymmetric about India on purpose — 154° west of it and 65° east, which puts India
about seven tenths across the frame while still showing the Atlantic and the eastern
Americas on the far left, where the mask takes them. Everything past ~119°E falls in the
slice that hangs beyond the viewport and is cropped.

**The PANEL is 94% of the band, pinned by its trailing edge at -5%, and the two numbers are
not independent.** `inline-size` is the zoom — 94% reads ~6.2px per degree against ~3.9 at
the old 60%, so India is well over half again as large with the projection and the window
untouched. The trailing inset is the slide. But because the box is pinned on the right and
India sits at a fixed 0.684 across the generated window, WIDENING the box also carries India
inward: **the zoom is a second slide, and that is why the pair can only ever be changed
together.** India's centre is `band × ((1 + |inset|) − 0.316 × inline-size)`, which is worth
keeping because it is what makes the trade explicit:

| inline-size / inset | India's centre |
| --- | --- |
| 82% / -2% | ~76% of the band |
| 89% / -2% | ~73.9% |
| 94% / -5% | ~75.3%, and ~5.6% larger |

**94% / -5% is the current step, at ANSR's request, and it exists to balance the hero copy
moving 96px further left** — a larger graphic sitting slightly further out against a headline
that now starts on the container gutter. Widening alone would have pulled India further
inward, which is the opposite of what was asked; the extra 3% of outward inset pays that back
and adds ~1.4% on top. **The bound is the eastern crop, and this went the safe way on it**:
more negative is more crop, and the trailing fade spans 14% of the box, so at 94%/-5% it
completes near 92% of the band, inside the viewport. The danger is the other direction —
past about -1% the frame's own east edge comes inside the viewport, where that fade is not
sized to hide it. The vignette is unaffected either way: `at 68% 47%` is a fraction of the
box, so it tracks India wherever the box goes.

**ONE dot size across both layers, at ANSR's request, where there used to be two — and the
world GRID moved to pay for it.** The ratio of pitch to dot size is the only number that
matters, and it is set in two files that have to move together: the grid steps in
`build_dot_map.py`, the `stroke-width` in `.gcc-hero-map`. Two sizes held both ratios near
0.4 and made the ground's dots visibly larger than the subject's, which is backwards however
well each measured. Equalised at `clamp(1.5px, 0.15vw, 2.9px)` — between the two it replaces
and closer to India's, because India's finer grid is the tighter constraint — the world
dropped to ~0.32 and read thin, which the deeper vignette would have made worse. So the world
grid came in from 1.15° to 1.0°: world ~0.37, India ~0.49. **India is still the denser layer,
and with size no longer distinguishing them the pitch is the only thing that does** — it has
to read as a silhouette where the world reads as texture. Past ~0.6 a layer stops being made
of dots at all, which is the ceiling on this. It costs ~2,700 more world dots, ~30% on a path
string that lives in a cached chunk.

**The radius is `vw`-proportional, and that is forced by `non-scaling-stroke` rather than
chosen.** Stroke width is read in device pixels, so pitch scales with the viewport and a
fixed radius does not: the ratio drifts at both ends and the graphic is only correct at the
width it was last read at. It was — at a flat 1.8px India held together at 1440 and had
thinned into specks by 1920, where the pitch had grown a third and the dot had not. The clamp
holds both ratios flat instead. Its floor only engages just above `lg`, the narrowest width
this renders at.

**Every island gets exactly one dot, and that is a correctness fix rather than a polish
pass.** India's 0.75° grid is ~83km between rows and the Andaman & Nicobar and Lakshadweep
groups are archipelagos of islands mostly narrower than that, so almost none of them
contained a grid point and the map drew India without its own territory. Refining the whole
India grid until the atolls caught points would need ~0.05° — 200x the dots, and it would
draw the island groups heavier than the mainland's coastline. So a second pass adds one
interior point per India polygon the main grid missed: 33 of them, 18 across the Andaman &
Nicobar chain and 16 across Lakshadweep. That is the weight the territory occupies, which is
what ANSR asked for. The point is the mean of the polygon's outer ring, verified inside, with
a coarse bbox scan as the fallback for a crescent.

**The world ink is a MID ramp step, and that is the contrast lesson the fan taught.** The fan
had to be pushed to 0.20 opacity because its lightest step is a near-white: it LIGHTENED the
ground under white text on a ground already only 5.18:1 against white at its bright end.
`--ansr-accent-inverse` (teal-400) at the composited ~0.5 keeps white at 9.2:1 over a dot at
the top of the band and 6.6:1 half way down — so the field can sit at a real opacity instead
of being held back until it disappears. **The orange never meets text by construction rather
than by measurement**: India lands ~215px clear of the trailing edge of the copy's own capped
box at 1440, and the gap WIDENS with the viewport because the copy is capped in pixels and
the map is sized in percent.

**A focus vignette makes India the lit thing and the world the ground it sits on.** A radial
ellipse in the mask, centred on India rather than on the box — 68% across, which is where the
window puts it, and 47% down, which is India's own latitude centre against the box's, two
degrees higher because `slice` centres the crop on the window's mid-latitude. An ellipse and
not a circle: the frame is 2:1, so a circle covering India's 30° of longitude reaches a third
of the way to the poles.

**It bottoms out rather than running to transparent, and that floor is the whole difference
between a vignette and a spotlight.** Run to transparent the world disappears outside the
ellipse and India reads as an orange shape floating on a gradient — the one outcome worse
than no graphic, and the same failure the base opacity was raised twice to avoid. Five stops
so the falloff reads as light rather than as an edge.

**Deepened at ANSR's request: the ellipse is tighter (50% × 124%) and the floor is 18% rather
than 34%.** So the falloff spans nearly five times its range instead of three, which is what
makes it read as light on a globe rather than as a slightly uneven field. **18% is the bound**
— below ~15% the periphery stops resolving as dots at all under the base opacity and the
graphic becomes India plus a rumour.

**The base opacity is 0.86, up from 0.65 and then 0.82, because `mask-composite: intersect`
MULTIPLIES alpha.** Every deepening of the vignette takes another slice off the periphery of a
graphic already held back, so the base has to rise with it for the focus to have anywhere to
fall from — otherwise a vignette is only a dimmer map. **The two are one adjustment and must
move together.** It does not touch the contrast measurements above: the vignette can only ever
reduce alpha where the copy is.

**The leading mask is EASED, not linear, and it protects the copy.** A linear ramp to full at
46% left the field at ~90% alpha behind the tail of the lead. **Its stops track where the copy
ENDS, so they are derived and they move whenever the copy's alignment does** — centred at 704px
the block reached ~74% of the band and the ramp could not complete before 62% of the box;
left-aligned at a 5% inset it ended near 60% and the ramp completed at 50%; on the card's
leading edge it reached ~65% and the ramp completed at 58%; **outside that edge, in a box
widened from 82% to 89%, the ramp completes at 54%** — both changes push the same way,
because the copy ends further left and a fixed distance is a smaller fraction of a wider box.

**It then stayed at 54% through two more passes, and that is a result rather than an
oversight.** The copy's trailing edge did not move when the block shifted to the container
gutter, because the lead gained on the right exactly what the block lost on the left. And the
box growing to 94% moves the ramp's absolute position by about 1% of the band, since a wider
box starts further out by almost as much as 54% of it reaches back — measured, 61.1% of the
band before and 61.8% after, against copy whose cap ends at 64% and whose text ends at 60%.
Three short fades on the other edges stop the graphic being a rectangle of dots with hard cuts
in it.

**The map fades up on mount, and the fade is on the SVG rather than on its container.**
`.gcc-enter` ends its keyframe at `opacity: 1` and `fill: both` outranks a declared value, so
put on `.gcc-hero-map` it would silently overwrite the measured 0.82 and leave the field at
full strength under white text — the one thing every contrast note in that block exists to
prevent. The child starts at 1, so animating the child composites under the parent correctly.
320ms behind a 120ms delay: the headline lands first and the ground arrives under it. Opacity
only, because a scale on 8,800 dots is a large composited layer redrawn every frame for an
effect nobody would name.

**Its block-end inset is the CARD's overlap, not the hero's padding.** The visible band is the
hero minus the strip the card is drawn over, so the map's bottom edge lands on the card's top
edge. Sized off the padding it stopped ~50px short and left the brightest third of the band
empty, which read as a graphic crammed into a corner.

**Desktop only — `lg`, one breakpoint later than the fan, and it was read at 768 before it was
decided.** India sits about seven tenths across the frame wherever the frame is, because that
is where it is on the Earth relative to this window. At 768 the headline runs nearly the full
band, so those seven tenths are behind its last word: the orange came out from under
"Intelligence" and was clipped by the viewport at once. **No opacity fixes that; the collision
is geometric.** So the rule the fan followed holds one step later — the band has spare ground
only when the copy is capped well inside it.

**It asserts a boundary, and there is no neutral option.** A dotted silhouette of India is a
claim about where India ends. The dataset is Natural Earth's INDIA point-of-view admin-0 set,
one file for both layers: mixing a default-view world with an India-view India would paint the
disputed strip orange while the neighbour's polygon still claimed it, which is two dot layers
overlapping at the most sensitive boundary on the map. This does not relax invariant 8 — the
city density map still plots coordinates on an unbordered field and says so — and it is the
one thing here that wants ANSR's sign-off rather than a measurement.

### The form

**Controls are white with a neutral hairline, and teal appears only on focus.** Three
versions got here, and the first two were wrong for the same underlying reason. The
original filled with `surface-tint` — the band's own ground — which read as a heavy inset
well. The second went to `teal-50` with a `teal-500` outline: legible and modern, and it
put a saturated teal edge on every control directly above a saturated teal BAND, so the
form and the ground behind it were the same colour idea at two strengths and the fields
read as belonging to the band rather than to the card. At rest the form is now neutral,
which is what lets the tint band and the mint hero carry the brand's colour without the
controls competing.

**The border colour is a contrast floor, not a style choice.** The field is white on a
white card, so the outline is the only thing identifying the control and 1.4.11 wants 3:1
for it. `--ansr-grey-500` is **3.28:1 on white** — the lightest neutral in this palette
that is legal, which is why it is the one. The softer greys everyone reaches for first are
unavailable: `--ansr-border-strong` (grey-300) is 1.78:1 and `--ansr-border-tint` is
1.65:1. Both look right and neither is a boundary. Note grey-500 only clears the floor
against WHITE — it drops to 2.98:1 on a `grey-50` fill, which is the other reason the fill
is not tinted.

**Hover darkens the hairline rather than filling the box**, because a fill change makes a
row of five fields flicker as the pointer crosses them — and it sits behind
`(hover: hover) and (pointer: fine)`, because a touch device fires hover on tap and leaves
the field looking half-focused until something else is touched.

**Focus is `--ansr-accent` plus the global orange ring, and the 1px-to-2px thickening is an
INSET shadow** rather than a thicker border, so the control does not shift a pixel and nudge
every field after it. Two signals, since a colour change alone would not survive greyscale.

**A second, OUTER shadow at 12% of the accent is the one thing on the field that is about
feel rather than legibility.** An edge swapping colour is correct and reads as nothing
happening; a control that blooms slightly is what makes a form feel like software rather than
like a document. Outside the box so it cannot reduce the field's own contrast, a shadow
rather than an outline so it does not consume the focus ring's slot, and 12% is under the
threshold where it would read as a second border. `box-shadow` is in the transition, so it
eases in with the edge instead of snapping. The invalid state takes the same shape in the
attention colour — two hues of one treatment, not two treatments.

**The label tints to the accent on `group-focus-within`.** Decoration only: the ring and the
field's own edge carry the state, so nothing is signalled by colour alone.

`--ansr-radius-lg` (8px), not the scale's 4px default: nothing here sits against a motif,
and a 4px field inside an 8px card reads as a mismatch rather than as restraint. 48px tall,
up from the 44px touch floor.

**Labels are Medium, not Semibold.** At 14px Semibold over a Light 300 value the label was
working harder than the answer it introduced. Medium against Light is still a two-step
interval, which is all a label needs.

### The form's grid, and why the old one read as dated

**Two equal columns: two rows of two, then the submit across both.** This replaced a
six-column grid whose first row was two three-column text inputs and whose second was three
two-column selects — chosen because six divides by both two and three, so neither row left an
empty cell.

**It is arithmetically right and optically wrong, and that was most of what read as dated.**
Two and three share no INTERIOR column boundary, so the split in row one lands in the middle
of a field in row two: five fields drew six unaligned vertical edges. Nothing was misaligned
enough to look like a bug and nothing agreed.

Three things fall out of the fix, and each was a separate complaint before it:

- **Every control is the same width**, so the card has two edges instead of six.
- **The submit spans the grid as its own row**, `w-full`. With five controls it filled a sixth
  cell, which was then the only arrangement leaving no hole; **the industry merge took the
  count to four, and that inverts** — a button in a fifth cell leaves an empty one beside it,
  which is the artefact this layout keeps being rearranged to close. Two rows of fields and
  then a terminal action leaves none, and nothing competes for the same glance as the button.
  It also ends the arrangement before last, where the action sat alone with ~700px of empty
  white beside it.
- **`md:px-3` is gone.** It existed because the selects were 179px at `md`, leaving 119px for
  a placeholder needing 125, so "Choose a country" rendered as "Choose a coun…". At two equal
  columns the narrowest select is 284px, so the inset is uniform again — one shape for one
  control instead of three.

**The `mt-7` submit offset is gone with the fifth cell**, and the reasoning is recorded because
it will be needed if a control is ever added back: a field is a 20px label plus an 8px gap plus
the control, so 28px down is where the control beside it starts, and aligning to THAT is true
whatever the opposite cell holds. `self-end` looked identical at rest and drifted the moment a
validation message appeared under Headquarters — the message grew the row and the button went
with it while the field it aligned to did not.

**The card also carries a lead now, not just a heading**, both supplied by ANSR verbatim:
"Build your GCC intelligence view", then one Light 300 line at 16/18px capped at
`--ansr-measure`. The heading was "Set your company context", which named the act without
saying what it produces; the pair splits the work — the heading is what the visitor gets, the
line is what it costs them. Black rather than muted, because it is a sentence they have to read
rather than a caption. Held in `ASK` in `copy.ts` and deliberately NOT in
`siteContent.hero`: the hero is positioning and is admin-editable for that reason, while this
describes the controls directly beneath it and changes when they do.

**The card's heading is `--ansr-accent` and Medium, where it was black and Bold.** Two
problems, one fix. Bold made the form's heading the heaviest type on the page — heavier than
an 80px hero headline set in Medium — so the eye landed on the card's title rather than on the
claim above it. And the card carried no brand colour at rest: white fill, black type, neutral
hairlines, teal only on focus, which read as a form from a different site sitting on ANSR's
hero. The heading teal is 9.81:1 on white, so it costs nothing in legibility. Reached as
`text-accent-teal` — Tailwind's own `accent` is the shadcn contract variable and is orange
here, which is both off-brand for a heading and the band's one orange already spent on the
submit.

**The form heading and the submit stay leading-aligned**, which they always were; what changed
is that the hero now agrees with them. A form has a strong start edge that every label and
field shares, and the submit sits on it because that is where the eye is after the last field.

### The dropdowns

**A custom listbox, not `<select>`** — `select-field.tsx`. A native select's closed control
can be styled and its open MENU cannot: that menu is drawn by the OS, so on macOS the form
ended in a grey Aqua popup that looked nothing like the page. For a tool whose job is to
look credible to a CIO, the one element they interact with reading as a different product
is a real cost. Everything below is the price of fixing it.

**Not built on Radix Select, and that is an iframe constraint rather than a preference.**
Radix portals its content and positions it with `position: fixed`. Inside a frame sized to
its own content by `postMessage`, a fixed element anchors to the frame's viewport rather
than the parent's, so the panel is placed against a viewport the visitor is not looking
through and the parent scrolling moves the field out from under it. A browser spec asserts
nothing computes to `fixed` or `sticky` for exactly this class of bug. The panel is
`position: absolute` inside the field's own wrapper: it moves with the field because it is
part of the document, with no measuring and no scroll listener.

**It always opens downward**, for the same reason — flipping requires reading the viewport,
and nothing in the public screens may. A bounded `max-height` plus a scrollable page is the
honest alternative.

**What had to be rebuilt, because the platform was giving it away free:** roving selection
with `aria-activedescendant`, Home/End, Escape, click-outside, focus returning to the
trigger, and scrolling the active option into view. Type-ahead is not the platform's
single-character jump but a **real filter**, above 12 options — strictly better for the
list this form is worst at, and the reason the exchange is worth making rather than merely
survivable.

**The one genuine regression is on touch.** A native select opens the OS wheel picker,
which beats any custom panel on a phone. The filter is the compensation: typing three
letters beats spinning through 201 entries. Recorded here so it is a decision rather than
an oversight.

**The panel is not a plain white rectangle, and the four things that make it read as software
are all cheap.** Rows are **inset chips** — held back 4px and rounded to `md` — because a fill
that runs to the panel's own edges makes the box read as a table with a highlighted row, and
the same fill inset reads as a target. A **check glyph in the accent** is the second signal on a
selected row beside its weight, since the fill is already spoken for by the keyboard's position
and a state sharing a signal with another state is not a state. The tier headings carry a
**hairline above** rather than extra space: two tiers separated by space alone read as two lists
in one box, and the rule is what makes them read as one list in two parts. And a **count chip**
on a branching row says both that a branch exists and how deep it is, which a bare chevron
does not — `aria-hidden`, because a `treeitem`'s name is computed from its contents and "Retail
9" is not the name of anything.

**The elevation is legibility, not polish.** The panel overhangs the form card and lands on the
customer-logo strip, and at the card's own shadow weight it had no evidence of being in FRONT of
that strip — so the logos beside it at the same height read as showing through an opaque box.
`.gcc-select-panel` now carries three layers: a hairline **halo at 18% of the accent**, which
ties the popup to the field it came out of (that field is wearing the same bloom at 12% while
focused, so the pair reads as one control in two parts), then two real shadows heavier than
`--ansr-shadow-lg`. That token is calibrated for a card resting on a band; this is the one place
in the project where a shadow has to carry the whole read across a band boundary.

### The industry cascade

**The industry dropdown is TWO LEVELS, and the popup's role is decided by the data.**
Sub-industry used to be its own field; it is now a second level inside industry, at ANSR's
request — fewer clicks for the same answer, and one fewer cell to fill. `option.children` turns
the popup from a `listbox` into a `tree`, which is the correct ARIA pairing rather than a clever
one: a combobox may own a listbox, a tree, a grid or a dialog, and a listbox whose options
contain options is none of those. `aria-haspopup` and the popup's own role read the same flag,
so they cannot disagree, and an industry with nothing mapped under it simply has nothing to
open — with no business types at all the control degrades to exactly the flat listbox it was.

**The second level is a SECOND PANE beside the first, not an indent inside it.** The indent had
three problems that were one problem: it grew the panel by up to nine rows on expand, so a popup
already overhanging the card ran a third of the way into the logo strip; the panel's height
changed under the pointer mid-interaction; and two levels of one list at 24px of indent read as
an outline rather than as a choice within a choice. A fixed-height parent list with the branch
drawn beside it fixes all three — **the panel is now exactly as tall open as closed**, and a
browser spec asserts it, because the simpler nesting is what anyone would reach for next.

**It opens on the TRAILING side — parent left, child right.** ANSR's call, and the direction a
cascade reads in. What it costs is width. This control is the form's right-hand column at every
viewport, so the room for the pane is whatever is left between the card's inner edge and the
window edge:

| layout width | 768 | 1024 | 1280 | 1366 | 1440 | 1536 | 1920 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| room (px) | 88 | 112 | 240 | 283 | 320 | 336 | 560 |

Above 1280 that is exactly `layoutWidth / 2 − 400`, because the container caps at 1280 and the
card is centred in it. **Nothing may clamp the pane to that number at runtime** — reading the
viewport is what the iframe forbids — so the widths are taken FROM the table: 16rem from 1440,
18rem from 1536, each leaving at least 56px for the window edge and a classic scrollbar.
Re-measure the table if the card, the container or the grid changes; every value depends on all
three. A browser spec asserts no horizontal scrolling at seven widths, because a pane that
overruns the window gives the framed document a scrollbar the parent page cannot fix.

**Below 1440 the same pane becomes a drill-in**, covering the parent list with its own header as
the way back. One element and two shapes rather than a second component that can drift from the
first. **The threshold is 1440 rather than the narrowest width that fits anything**: a 13rem pane
does fit from about 1320 and was tried, and at that width nearly every sub-industry wraps to two
lines beside a 388px list. The full-width drill-in gives each name one line, so it is the better
shape there rather than a fallback — 1280 and 1366 laptops drill in on purpose.

**Re-opening the control does NOT re-open the visitor's branch.** Tried, and worse: below 1440 the
pane covers the whole panel, filter included, so a visitor coming back to change their industry
found the list and the filter both behind a pane they had not asked for. It loses nothing — the
trigger already reads "Retail · Apparel & footwear brand" — and the keyboard lands on the industry
that owns the answer.

**Choosing an industry does not close the panel.** It commits the industry — the trigger
updates, so the answer visibly took — and opens its branch, because that is the only moment a
visitor learns a narrower answer is available. The branch's leading row is **`All of {industry}`,
already checked**, which is both the way out and the statement of what happens if they take it;
a Done button would have left them to work out what they were agreeing to. Pressing an
already-open branch row commits and closes, so a visitor who pressed "Retail" twice has said
what they mean. Four exits, none of them a dead end: that row, a sub-industry, Escape, or a
press outside.

Four details, each with a wrong version that looks fine:

- **The pane is `aria-owns`-ed by its parent row, not nested inside it** — a cascade puts the
  child list in a different box, which is the case `aria-owns` exists for. It also keeps the
  filter textbox out of the `tree` element, where it would be invalid.
- **Every row therefore carries an explicit `aria-label`.** An element that owns a subtree owns
  it in the ACCESSIBILITY tree, so the moment a branch opened, the parent row's name became the
  industry followed by every row in the pane it had just opened — a screen reader would announce
  the whole cascade as the name of the row that opened it. Found by four specs failing to locate
  a row called "Retail".
- **The trigger shows both halves** — "Retail · Apparel & footwear brand". The field is labelled
  "Industry", so a trigger reading only the sub-industry would leave the industry answered and
  invisible.
- **The tier headings are `role="presentation"` in tree mode.** A tree's only legal grouping is
  a `group` under a `treeitem`, and these tiers group SIBLINGS. They are a scanning aid rather
  than information — the order they impose is already the order the rows are read in.

**ArrowRight and ArrowLeft agree with the direction on screen**, which is one thing the trailing
side buys: Right-means-deeper is what the tree pattern binds, and the pane is now to the right.
A single `ChevronRight` on the branching row says the same thing at every width — it points where
the pane appears when there is room beside the panel, and where it slides in from when there is
not.

**A pane row wraps where a first-level row truncates.** At 16rem, "Department store & general
merchandise" would lose most of itself to an ellipsis. Two lines in a narrow column costs a
little height; a truncated sub-industry costs the visitor the ability to tell two of them apart.

**The panel's affordance line lives inside the panel**, not under the field: "Pick an industry
to see its sub-industries (optional)". It is the one thing on this form a visitor cannot see the
shape of before opening it, and putting it in the panel costs the card no height and cannot shift
the grid. It replaced a status line under the old control, which existed to announce that a
disabled field had become usable — there is no disabled state now, because the level is not there
until the industry it belongs to is picked.

**That "(optional)" does not reopen the no-optional-markers rule.** That rule is about FIELD
LABELS, where the marker was talking visitors out of answering. This is one word inside a popup,
about a second level that is genuinely skippable and that nothing else on the form announces.

**The term is "sub-industry", at ANSR's request**, replacing "line of business" everywhere a
visitor or an admin can read it. The DATA is untouched: the field is still `businessTypeId`, the
collection is still `dataset.businessTypes`, and `docs/business-types.md` still names the
vocabulary. Only the words changed.

**The filter row's focus indicator is NOT the global ring, and this is the one place that ring
is overridden.** `tokens.css` puts a 2px orange outline on every focusable element and says it
is never removed. Here it was not a focus indicator at all: the filter takes focus the instant
the panel opens, so it drew a permanent orange rectangle around the search row of every
dropdown on the entry point — on a screen whose rule is one orange per band, spent on a filter
instead of on the submit. It is replaced, not dropped: a 2px accent rule along the row's own
bottom edge, drawn as an inset shadow so nothing shifts, at 9.81:1 and the full width of the
control, which is a larger indicator than the ring it replaces. Tailwind's `outline-none`
cannot do this — `tokens.css` is unlayered and utilities are layered, so it has to be an
unlayered rule of equal specificity.

**`z-10` on the `#ask` band, and without it the logo strip paints over the open dropdown.**
The panel already carries `z-20` and that z-index cannot escape the band: the card carries
`.gcc-enter`, whose keyframe leaves a computed `transform` on it, and **an element with a
transform is a stacking context** — so the panel's 20 is scoped inside the card, and the card
competes in the root context at an effective 0, where the marquee track (also transformed, and
later in the DOM) wins. The symptom is a dropdown whose lower half has ten company logos drawn
through its text, and only the two panels long enough to overhang the card show it. Raising the
band lifts everything in it; the card-over-hero overlap is unaffected because the hero is
earlier.

**Two things the swap broke silently and both are now pinned by specs.** The validation
refs lived on the `<select>` elements, so `focus()` after a failed submit became a no-op —
errors appeared and the keyboard did not move, which is the exact keyboard-only regression
nobody catches by clicking; the trigger now takes a `triggerRef`. And a button has no
`value`, so `toHaveValue` in three specs would have compared against `undefined` and passed
whatever the control did; those assert on the trigger's visible text instead.

**Dropdown order is derived from the data, with one deliberate exception.** Industry leads
with the largest by company count and HQ with the twelve largest, then alphabetical, as two
groups. A hardcoded list of "important" values is a second thing to maintain and is wrong
the first time nobody remembers to. The HQ tier is capped at twelve (91.4% of companies)
rather than every country in the data — 47 entries under a heading claiming they were the
common ones, with Jamaica and Slovenia among them, is a label the list contradicts.

The exception is `PINNED_INDUSTRIES`: Retail and Consumer Packaged Goods sit in the leading
tier regardless of count, because ANSR expects enquiries from them out of proportion to how
much of the researched dataset they occupy — Retail is eighth by count and Consumer Packaged
Goods sixteenth. **Anticipated demand and dataset composition are genuinely different
things, and only ANSR knows the first.** Pinned entries still sort by count inside the tier,
so the row reads largest-first. Keep the list short: every addition is a claim that the data
is wrong about what visitors will pick, and past four or five the honest move is to relabel
the group rather than keep pinning.

**`revenueBands` is never tiered or sorted** — its order is the peer-matching contract,
because the adjacent-band step is index arithmetic on the array.

### The bands below the form

**The gap between the card and the strip is TWO paddings that add up, and they are set
together.** The tint band's `pb` and the strip's own `py` are adjacent, so at 56 + 40 = 96px
the tint below the card read as an empty band rather than as air under it — the card had
visibly finished and nothing had started. Now `pb-6 md:pb-8` against `py-7 md:py-8`, a third
of the way closer, and each file names the other. Neither number means anything alone.

**The logo strip is the first continuous motion in the project**, where everything else is
`.gcc-enter` tied to a state change. Three constraints shaped it: motion cannot be
scroll-driven or scroll-paused (the parent owns the scroll container), nothing may compute
to `fixed` or `sticky`, and `prefers-reduced-motion` needs a real fallback rather than the
global 1ms duration clamp — which on an infinite loop leaves the track flickering at frame
rate. So the animation is opt-in inside `no-preference`, and under `reduce` the strip
becomes a scrollable row. `linear`, because every easing token accelerates and a loop that
eases visibly slows at each seam. `--ansr-duration-marquee` (48s) is ambient motion and is
deliberately not a sixth step on a scale whose five values are all under 400ms.

**Third-party marks are not recoloured, monochromed or tiled**, so size and rhythm are the
only things the strip controls — which turns out to be the whole design problem. A single
uniform height is the obvious rule and is visibly wrong: at 40px tall Walmart renders 195px
wide beside a 31px Target, six times the optical weight, so the strip reads as "Walmart,
and some others". **Capping both dimensions** (`h-10 max-w-32`, `object-contain`) fixes it
with two numbers instead of ten hand-tuned heights and self-corrects for logos nobody has
seen yet. Of ten marks only Walmart hits the width cap, which is exactly the outlier.

**`h-10 w-auto`, not `max-h-10 h-auto`, and the difference was a bug.** With both CSS
dimensions `auto` a replaced element falls back to its source's intrinsic SIZE, and an SVG
carrying only a `viewBox` has a ratio but no size — all six vector marks resolved against
the 300x150 default and collapsed to 0x0 inside the capped flex row. The files carry
explicit `width`/`height` again and the height here is definite. A spec asserts no mark
renders under 8px wide.

**The impact band is not `Section` + `Stat`**, and it is the one place a fourth ground
exists. Its ground is `--ansr-surface-deep` and its heading is centred, where every
`Section` heading is leading-aligned; rendering it through `Section` would have meant adding
a fourth ground and a centred variant to a component nine bands share and neither wants. It
asserts nothing about the dataset — these are ANSR's numbers about ANSR — which is what
keeps it clear of the no-invented-figures invariant. The figures are
`--ansr-accent-inverse`, the first use of the bright mint anywhere in the tool.

**The brand name in the heading is the DRAWN LOCKUP, stacked under the lead, and the band's
one orange is now its burst rather than a coloured word.** Same rule spent once, and it no
longer has to be measured as text because it is not text. `public/brand/ansr-logo-on-dark.svg`
— the second literal use of a brand asset on a public screen, which the adapt-never-paste rule
allows for logos and nothing else.

**It is INLINE, as the sentence's last word, and three measurements read off the file's own
geometry are what put it on the line.** The lockup is 253x91 with the wordmark's cap band from
y 26.40 to 64.31. None of the three is the font size:

- **`h-[1.728em]`.** The letters are 37.91 of 91, so 0.4166 of the box; dividing the display
  face's 0.72em cap height by that puts the lockup's letters at exactly the cap height of the
  words either side of them. Matching the FONT SIZE would set the mark ~2.4x too large. Same
  trick as `ansr-wordmark.tsx` one band up.
- **`align-[-0.507em]`.** An inline-block sits its own BOTTOM edge on the baseline, and this
  lockup has 26.69 of 91 below the letters' baseline — the burst's lower rays. Unshifted the
  whole mark floats half its own height above the line. 0.2933 x 1.728em pulls it back so the
  drawn baseline and the typed baseline are one line.
- **`ms-[0.1em]` on top of the word space.** The burst has no left sidebearing — its outermost
  ray is at x=0 — so a plain space leaves a ray ~10px from the "y" at 48px, which reads as
  crowding.

**The type scale steps DOWN at the small end and the leading is nearly double, and both exist
to hold the mark on this line.** The constraint is not how big the words want to be, it is
whether "Impact delivered by" plus a 2.78:1 lockup fits the content width: at the previous 30px
base the pair measured ~407px against 342px available at 390 and wrapped, putting the mark alone
on a second line. 20px base keeps it on one line down to a 320px viewport. `leading-[1.8]`,
not `leading-tight`, because the mark overhangs the cap line and the baseline by ~0.5em each —
invisible on one line, where the band's padding absorbs it, and the insurance for the narrow
widths where the pair wraps anyway. Without it the burst's rays reach into the line above, which
is the failure that made an earlier pass stack the mark instead of inlining it.

**The ON-DARK variant, not `ansr-logo.svg` itself.** That file's wordmark is `currentColor`,
which is right inlined as markup and useless through an `<img>`, where there is nothing to
inherit and the letters would render black on the deepest ground in the palette. The manifest
keeps the white-wordmark variant for exactly this.

**Medium 500 and `tracking-body` on the heading**, for the same measured reason as the hero's
`h1`. A Bold heading beside the drawn mark read as two fonts on one line, which it was.

**A rule under each figure, not a card per figure.** The brief asked for floating cards and
then for "a clean section with typography"; this is the second, because a card on a dark
band needs either a border or a shadow and the public screens have neither.

**Column count follows the figure count**, because it is admin-editable up to six and five
columns with six figures leaves one alone on a second row. Same rule as `packWidths` and
`peerSpans`. A lookup, not an interpolated class name — Tailwind scans source text, so
`lg:grid-cols-${n}` compiles to a class that was never generated and fails as a silently
unstyled grid.

**The impact rings: the widened viewBox is the whole fix, and it is the opposite of a
crop.** `arc-dome.svg` declares `viewBox="0 0 784 378"` while its paths are a COMPLETE set
of concentric rings centred at (551.5, 551.5) inside an 1103-square clip. The frame was
slicing every circle through its middle, so the render ended on a hard straight chord
partway up the band. Nothing was redrawn: the frame was told the truth about what the file
already contained. Both placements then put the ring set's **centre on a corner** of the
band, via a half-translate rather than a negative inset — a whole circle inside the band
would just move the visible cut to the band's own edges, and an `inset-block-end`
percentage resolves against the container's height while the element is sized from its
width, so it would drift as the band grew. No mirroring: concentric circles are radially
symmetric, so the previous `scale(-1)` did nothing. The pair is symmetric by placement.

**One `.ansr-motif` wrapping two images, never two `.ansr-motif` siblings.** tokens.css
carries `.ansr-motif + * { position: relative; z-index: raised }` so whatever follows a
motif sits above it — which silently assumes a motif is followed by CONTENT. Two adjacent
motifs handed the second one `position: relative`, overriding the absolute positioning it
needs: it fell into the flow at the top of the band, at the wrong edge, and pushed the
heading down by its own height. The band rendered with one ring set misplaced and 237px of
empty ground above the title.

### Copy and inputs

**The India-presence question was removed at ANSR's request and its FIELD was not.**
`gccStatus` still reaches the server, still drives `framing()`, and is supplied as the
`evaluating` constant — the one branch whose copy is true regardless of who is reading,
because it is a statement about the industry rather than about the visitor. The answer's
fact summary dropped "India today" with it: showing a constant there would be the tool
telling the visitor what they said about something it never asked. The branching is still
covered in `tests/unit/screen1.test.ts`, which is where the input can be varied.

**Copy removed, each asserted absent by a spec:** the hero kicker, the hero pill, and "Your
answers build this one result. Nothing is kept." The last was true and still is — it
narrated the tool's own integrity at the exact moment of submitting, and not keeping
anything is enforced by there being no store rather than by a promise. The three lines the
reference pass removed stay removed and stay asserted.

**Line of business is no longer a field, and no field on the form is marked "(optional)".**
It is a nested level in the industry dropdown; the marker only ever belonged to it, because it
was the one control disabled until another was answered and the label was what explained why it
could be left alone. There is no disabled state now. Company name deliberately never carried
the marker even though the server accepts it empty — it personalises every sentence of the
result, and labelling it optional talked visitors out of the one input that costs nothing and
changes the most. A spec asserts the count is zero, and asserts no separate line-of-business
control exists.

**A public spec locates the ask by `h1#ask-title`, never by its wording** — the same rule
`helpers.ts` states for the evidence bands. The headline's words are asserted once, on
their own, as the subject.

## The answer state — what the overhaul pass settled

This section supersedes the refinement pass's account of the answer state. What that pass
settled about the ENTRY POINT is unchanged and recorded above.

The diagnosis first, because every decision below is an answer to it. Seven bands, each one
kicker → 48px heading → content, all leading-aligned, all at the same internal density, six of
seven drawing a bar, and 12px muted captions under everything. Nothing was *wrong*; nothing had
an entry point either. The page read as a well-made template.

**The answer state is on `font-display` now.** The ask was the only surface that opted in, so a
visitor crossing from one to the other in a single state change — no navigation — had the
typeface change under them, in the wrong direction: brand voice on the form, UI sans on the
evidence. It brings Light 300 body copy with it, which is the brand's biggest typographic tell.
Admin still keeps Inter.

### The peer grid is a lead card plus a comparison table

Five equal boxes was the flattest thing on the page. It also threw away information it already
had: the peers are RANKED, card one is the closest comparison the tool found, and nothing said
so.

**Giving the closest match its own shape was the half-fix, and the critique pass finished it.** The
remaining four were near-identical white boxes carrying the same three attributes in the same three
positions — which is the shape of a table whose rows have been cut apart and given padding.
Everything a reader wants to do with them is a comparison across one attribute: who has been here
longest, who is in more than one city, who is biggest. Four cards make that four separate reads with
the eye travelling in a Z; four rows make it one read down a column. The density went up with it, and
the `min-h-14` the cards needed to stop four name lengths setting four card heights went away — a
layout spending vertical space on alignment a table gets free from its own grid.

- **Below `md` it collapses to stacked labelled rows and stops being a table.** Four columns of
  wrapped city lists at 320px is worse than either form. `<thead>` is `display: none` there and each
  cell draws its own label, so the accessible reading matches the visual at both widths. No ARIA is
  declared to paper over the difference: above `md` the native table semantics are real, below it
  there is genuinely no table.
- **The bar needed its own slot in the cell, and this was a correctness bug rather than a nicety.**
  It started inside the value, which is fine at `md` — the cell is the column, so every track is the
  same width. Below `md` the value is a trailing-aligned inline box sized to its own content, so each
  row's track came out as wide as that row's figure happened to be: four bars on four different axes,
  drawn to look like a comparison.
- **`showFortune`, and the rule it borrows.** At the top revenue band in most industries all five
  peers are Fortune Global 500, so the block drew the same chip five times — the exact thing the
  largest-in-industry panel had already been fixed for. Universal, it is one line under the block;
  mixed, the chips stay and mean something. One rule, one wording, one screen.
- **`supportingSpans` is gone with the cards.** A table has no part-empty cell to pack.

- **The lead card is full width and horizontal**, with the figure at 48/60px and a chip reading
  "Closest comparison" — true under both orderings, which was checked rather than assumed.
- **Its bar spans the whole card and the two texts sit at its ends.** Laid out as two columns of
  content it rendered with ~600px of nothing between the name and the number at 1440. A wide
  card whose content is not wide is worse than a narrow one, so the element that genuinely wants
  the width gets it and the labels become its ends.
- **Below three peers there is no lead card** — a lead needs something to lead. Two peers are two
  equal halves; one peer keeps the narrow width and leaves the row part-empty, because a lone
  card across twelve columns is not a comparison and a thin industry is supposed to look thin.
- **Two peers or one are still cards**, and that is where the twelve-column grid survives: two are
  equal halves, one keeps the narrow width and leaves the row part-empty.
- **The headcount is the card's figure, not a labelled row.** It was a 14px value right-aligned
  against a 12px "India headcount" label, which is the shape of a spec sheet. The band is the one
  number a visitor compares across five companies, so it leads at 30px with the label demoted to
  a caption. Name at 20px between the two: the name is what the grid is scanned for, the figure
  is the comparison, and neither may be the size of a caption.

### The density map draws India

**Invariant 8 permitted this all along and now it is built.** It forbids a traced or approximated
outline and allows "a verified, licensed outline ... if one is ever sourced" — and one was
already in the repo, since the ask hero's dotted silhouette comes from Natural Earth's India
point-of-view set. `scripts/build_india_outline.py` cuts the outline from **the same file**;
project.md's invariant 8 carries the full position.

- **The frame had to grow, and that was a correctness fix.** 67–90°E and 7.5–32°N contains every
  GCC city and cuts off the northeast and Ladakh. Fine while nothing was drawn; a boundary claim
  by omission the moment something is.
- **There is no panel any more.** The country sits directly on the white band, filled in the pale
  mint with a `teal-500` hairline coast. A tinted box around it was what made the previous
  version read as a widget rather than as a map, and the coast is 500 rather than 300 because the
  land-against-band fill difference is 1.15:1 — the shape was being carried by nothing.
- **The graticule is gone.** A coastline is a better reference than evenly spaced rules, and it is
  the one the reader already has.
- **Labels are knocked out with `paint-order: stroke`.** Every label sits on the land, so it
  crosses a coastline or another dot. Moving them into the sea would need a leader line each and
  would put Bengaluru's name in the Arabian Sea.
- **The bright-mint dot depth was a latent breach and is gone.** `--ansr-teal-bright` carried the
  middle density step at 2.44:1 on a light ground; it predated the rule being written down. Two
  steps now — `accent` and `teal-500` — because depth is the redundant encoding here and two that
  can be seen beats three where one cannot.
- **No bars in the ranked list when every city holds one GCC.** Every share is then 1, so a row of
  full-width bars reads as "a lot of them" for a set where each city has exactly one. Same
  instinct as `FigureRow` on Screen 2.

### The hub pulse, and the rule it is built on

The project's second continuous motion, on the same footing as the marquee: `--ansr-duration-pulse`
(3.2s) is an ambient period, not a sixth step on a scale whose five values are all under 400ms.

**What moves is a halo, never a mark.** A dot's radius IS the figure, so animating the dot animates
the claim — a mark that grows and shrinks is a number that grows and shrinks. The halo is a separate
ring carrying no value, expanding out of the dot's own radius and fading to nothing. Three hubs,
offset by a third of the cycle so they take turns rather than breathe together, and `scale(1.9)`
because at 2.4 the halo reached from Bengaluru to Hyderabad and read as a region.

Three implementation notes, each of which was a bug first: `transform-box: fill-box` (an SVG
transform resolves against the viewBox origin, so a plain `scale()` throws the ring across the map);
`opacity: 0` at rest, so under `reduce` — where no animation is declared at all — the ring never
becomes a permanent second circle around three dots; and the animation opt-in inside
`no-preference`, because tokens.css's global 1ms clamp on an infinite loop flickers rather than
stops.

### The four other bands

- **A badge every row carries is not a badge.** At the upper end of most industries all five
  companies are Fortune Global 500, so the panel drew the same accent chip five times. Universal,
  it becomes one line of text under the chart; mixed, the chips stay and mean something.
- **The largest chart is capped at `--ansr-container-card`.** `stack` gives it the full 1184px,
  which put a company name and its figure ~1,000px apart with only their own bar between — five
  rows of that read as a table that had lost its middle columns. 896px is a width this project
  already has a token for.
- **The index badges are gone from that chart.** Descending bars on a shared axis already make
  "largest first" the most visible property; a zero-padded ordinal restated it in the busiest
  place on the row.
- **The function list is `columns-2`, not `grid-cols-2`, and that is what let the numerals go.**
  This is the quietest block on the screen by design — the only information in it is the order —
  and eight accent-teal ordinals were the busiest thing on the band with the least to say. They
  could not simply be deleted from a grid, though: a grid fills ROW-major, so the most common
  function sat level with the second most common and a ranking read across when it should read
  down. Multi-column flows column-major and the order carries itself.
- **`FractionBar` gained the figure it was missing.** Its numerator and denominator were both on
  the page and the PROPORTION — the thing the bar draws — was nowhere, which made it the only mark
  in the project a reader could not read. It also turned out to be the useful number: "181 of the
  Fortune Global 500" is a count, "36% of the list" is the claim. And it now draws `Stat`'s rule
  over its label, because side by side in the scale band the one figure with no denominator looked
  like a different kind of object rather than the same object without a bar.
- **The scale band's two index figures no longer share a label.** "already run a GCC in India"
  appeared verbatim under both, so the eye reported two identical objects and moved on — and the
  sentence was the heading's job anyway.

### Bento, kanban, and why neither

Both were considered for the evidence bands and both are wrong here, for the same reason. A bento
of unequal tiles asserts an editorial hierarchy ACROSS its tiles; a kanban asserts columns of equal
status and a flow between them. This page is a linear argument that widens from five named
companies to a national figure, and full-bleed bands on alternating grounds are what carry a linear
argument. Tiling the bands would say the reader may enter anywhere, which is the one thing the
order exists to prevent.

Where the pattern DOES apply is inside a band, once, where the data has a real hierarchy: the peer
grid's lead card. That is a bento of two tiers, and it earns it because the ranking is real.

### Still true from the refinement pass

- **The ask is a card with a visible heading and a lead**, not controls loose on the tinted band
  under an `sr-only` h2. Its treatment is in "The form's grid" above.
- **Peer cards carry one bar**, scaled against the largest of the set. `PeerCard.sizeShare` is the
  single definition of that ratio; `LargestEntry` does not carry its own copy.
- **Cities are plain text, not a chip each.** Five chips wrapped to three rows of pills and read as
  filters, which nothing here is. They are now on one line with the year rather than in a labelled
  row of their own — both are short and neither needs a label.
- **The leading three cities are labelled in place**, on whichever side has room, decided from the
  dot's own position rather than tuned per city.

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
  work out what they were being shown. Note the example this line used to give — "The five above
  were a selection, not the supply" — which the overhaul pass replaced for failing the same rule
  one step further on: it stated a finding and then made the reader decode "not the supply", and
  hardcoded a count the page derives.
- **Leads carry one fact.** All three framings opened with the same twenty-word list of the
  sections below — a table of contents in prose, immediately above the headings it listed.
- **The tool never narrates its own integrity.** "We would rather show you three defensible
  comparisons than pad the list" was the most quotable line on the screen and the most
  self-regarding: it answers a doubt the reader did not have, and plants it by answering. Not
  padding a peer set is an invariant enforced in `matchPeers` and asserted in `data:verify` —
  it does not also need to be a promise on the page. A browser spec now asserts the line is
  absent.
- **The ask is a card with a visible heading and a lead**, not controls loose on the tinted
  band under an `sr-only` h2. It is the one thing on the entry point a visitor has to *do*.
  The card's own treatment, its heading and the ANSR-supplied pair of sentences are in "The
  form's grid" above, which supersedes the "bordered panel, radius 0" this bullet used to
  describe.

### Two more rules the answer state's copy pass added

- **A heading may not hardcode a figure the page derives.** "The five above were a selection, not
  the supply" sat directly above a block that shows however many peers the industry can supply, so
  a three-company set was told it had seen five. Every count in a heading is derived now, spelled
  as a word, and pinned by a unit test that walks all 24 industries. The same instinct produced the
  map's heading: "clusters in a handful of cities" was vague where the data is exact, and is now
  the leading city's actual share — with a floor on the DENOMINATOR as well as on the share,
  because a true "Kolkata holds 50%" over a footprint of two is a percentage with authority it has
  not earned.
- **A section's lead is where a method belongs; a footnote is for a caveat and an axis.** The peer
  block had it backwards — the sub-industry, the shared characteristics and the revenue-band caveat
  were one three-clause sentence at 12px under the cards, so the most trust-building thing on the
  band was the least likely to be read, while the lead above it said a weaker version of the same
  thing. Method up, caveats and the bar's axis down.

Two words that had to go for a reason worth recording. **"they" in a kicker or heading**, where
"they" pointed at the wrong noun: "What they run" and "Where they went" both read as being about the
five named companies, and the functions list is the general India pattern while the map is
industry-wide. The basis line under the list existed partly to undo its own kicker. And **a
possessive on an industry name** — `${industry}'s` produces "Electronics's" and "Consumer Packaged
Goods's", and there is no apostrophe rule that makes 24 admin-editable names come out right, so the
map's heading is phrased to avoid one.

## The critique pass — what it changed, and what it could not have

An external critique of the answer state, held locally rather than in the repo. Its diagnosis was
right and worth recording in one line: the page had strong information underneath it and presented that
information as a long editorial report rather than as an intelligence product. Seven full-height
bands, each one kicker → 48px heading → content, so the first thing a visitor saw after submitting a
form was a *section* — and every figure proving the form had worked was at least one scroll away.

### The signal strip, and why it is not a bento

Four figures under the headline, overlapping the hero: the peer count, the industry base, the leading
city, the largest peer centre. **It holds nothing new** — all four are evidenced by bands below, so it
is the index rather than a source.

- **One container with cells divided by a 1px grid gap over a tinted ground**, not four tiles. A tile
  per figure asserts an editorial hierarchy across four things that are peers, and adds a fifth card
  shape to a screen that has four. The gap-as-rule is what makes it survive two, three or four cells
  wrapping to two rows without any cell growing a double edge.
- **A cell whose figure the data cannot supply is dropped, never filled.** Two of the four depend on
  the result. A dash or an "n/a" in the first thing a CIO reads is the cheapest available way to lose
  invariant 2. The peer count is the one cell that always renders, including at zero: zero is a
  finding, not a missing figure.
- **The overlap is the entry point's machinery reused**, deliberately, because the ask card already
  establishes that shape as this tool's way of saying "this is the result of what you just did".
  Three parts read together: `bleed` on `ScreenHeader` (pb-28/32) is the space, the strip's
  `-mt-16 md:-mt-20` is the pull, and `flow-root` + `z-10` are what make it work at all. At
  pb-32/40 against a -14/-16 pull the hero left ~96px of empty teal above the strip, which read as a
  gap rather than as an overlap — both numbers were measured at 1440 and 390, not picked.
- **One column at 390 rather than 2×2**, which is a deliberate deviation from the critique. The values
  are headcount RANGES — "59,900–60,000" — and two-up at 390 gives each cell 171px, where that wraps.
- The band's ground is `surface`, so the strip is white-on-white with a border for its edge and the
  peers band below stays `tint`. No two adjacent bands share a ground.

### The copy rules it added

- **"already" is gone from every visitor-facing sentence, and a unit test walks all 24 industries to
  keep it that way.** It was in a heading, two leads and three body sentences, every one doing the same
  job: leaning on the reader to feel late. The tense carries it — a company that runs a centre in India
  runs one now — so the word was adding pressure rather than information, and a page that applies
  pressure six times is a page this audience discounts. One use survives, allowed by name in the test:
  "the ones already named above", which is about what the page has shown rather than about the market.
- **"actually" went with it**, for contributing nothing to a sentence nobody had contradicted. And
  "landed" became "has built": landing describes arriving somewhere, which makes a footprint built
  over twenty years sound provisional.
- **The kickers are a stable analytical vocabulary now** — relevant peers, industry context, largest
  industry centres, operating scope, India footprint, global enterprise presence, function
  opportunity. "The upper end" and "What a GCC runs" added reading effort and named nothing; a visitor
  can navigate by these instead of decoding each one.
- **The h1 is the finding and the company name is context.** "Nike would not be first. Here is who
  already is." was memorable and wrong four ways: it gave the first post-submit moment the tone of an
  advertisement, presumed the reader's concern was priority and answered it as a rebuttal, named no
  action so it said nothing about what those companies did, and left the actual finding in the band
  below. The name moved into the fact row, where it is visible for the whole page rather than for one
  sentence — and the headline is now personalised by something stronger than a name.
- **Every bar states what full width is.** This was a real gap rather than a preference: the project's
  governing chart rule is that every mark carries its figure in text, which both peer and largest bars
  did, but neither said what the track's maximum was. A reader could not tell whether it was the
  largest centre in the set, the largest in India, or the top of a band. Both notes name the company,
  because the ratio behind the length is derived from band midpoints and may not be published.
- **`largestLine`'s possessive was broken and this pass found it.** `${industry}'s` produced
  "Electrical & Electronics's" — in the branch every thin industry takes, so the one sentence
  guaranteed to reach the visitors most likely to see it. Two tests now assert against it.

### The view switch

The tool has two result views and only one was ever advertised: from the peer view the function view
was a single button in the second-to-last band, and nothing on either screen said which of the two
was being read. One component in both headers, naming both and marking the current one. The current
view is a `<span aria-current="true">`, not a disabled button — a control that does nothing when
pressed is worse than no control, and `disabled` would put the one element stating where the visitor
is beyond the accessibility tree's reach. The `advance` band stays: it is the motivated transition
reached in reading order, and this is the map.

### What the critique asked for and could not have

Recorded because each will be asked for again, and the reason is a property of this product rather
than a disagreement about design.

- **A persistent sticky application header.** The tool is framed in an ansr.com page and negotiates
  its height, so it never owns a scroll container — a pinned header fixes itself to a viewport the
  visitor may not be looking at. The substance was taken non-stickily: the switch, the fact row and
  "Change these details" are all in the header, in reading order.
- **Information tooltips, on eight terms.** See the section below, which predates the critique and
  answers it. The critique's own interaction rules also say not to rely on hover on touch devices.
- **State boundaries, an inset for the islands, and a density glow under the dots.** Invariant 8: the
  outline comes from Natural Earth's India point-of-view admin-0 set and nothing is traced or
  approximated. State boundaries are admin-1 — a different layer, and mixing point-of-view sets is
  how the disputed strip ends up painted twice. The glow is worse than unavailable: interpolating a
  density surface from twenty city points is the no-estimated-figures rule broken in visual form.
- **A capability matrix with "widely established / growing / selective" columns.** There is no
  per-company function data and there will not be, so every cell would be invented. The critique says
  so itself two paragraphs later. The ordered list stays.
- **Sort controls on the peer set.** "Best match" is the only ordering the engine defines, and
  re-sorting by size would leave the block's own heading — "most relevant to your profile" —
  describing a list no longer in relevance order.
- **Hover cross-highlighting between the map and its ranked list, and map filter controls.** Neither
  is a correctness problem: every figure is already in text, so nothing is hidden. Both are additive
  interaction, both need client state, and both are nowhere on a phone. Not rejected on principle —
  deferred.
- **Capping the hub pulse at two cycles.** A judgement call, not a constraint. It is one line if ANSR
  wants it; note that no scroll-position logic is available to trigger it on entry, so "on load" is
  the only cue, and the finite/infinite distinction is load-bearing for the
  `document.getAnimations()` trap in the handoff.
- **Typography in px.** The project has a token scale.

### No information tooltips, and that was a decision rather than an omission

An "i" affordance was evaluated for this pass as a way to cut text, and declined on this screen. Two
reasons, both properties of the page rather than of tooltips:

- **Nothing is behind a hover** is a hard rule here — a CIO opens this inside a marketing page on a
  phone, where a hover is nowhere. So it would have to be click-to-open, which is a real component:
  focus management, Escape, click-outside, and absolute positioning inside its own container,
  because a portalled `fixed` element anchors to the wrong viewport inside a frame.
- **The text that remains is not the kind that may be hidden.** Every sentence left is either a
  caveat — and a caveat a visitor has to open is a caveat the screen is hiding — or a method line
  that earns its place at reading size. The problem on this screen was repetition and length, not
  presence, and it was fixed by cutting rather than by folding.

It becomes reasonable where a term's DEFINITION changes how a figure reads and that definition is
not a caveat. Screen 2's index bases are the candidate; this screen is not.

**The critique pass asked again, on eight specific terms, and the answer held for a third reason it
supplies itself.** Its §J is that the basis of the match must be inspectable without a methodology
paragraph — which is what `peerLead` already does, in one line at reading size above the cards. That
is the whole substance of the tooltip it wanted, granted without the affordance. The same applies to
the axis notes and to the strip's per-cell notes: every one of them is the sentence a tooltip would
have held, rendered where a phone can read it.

## The dashboard pass — the answer state stops being a report

ANSR supplied an approved page composition for the Peer Landscape and it moved the screen from a
long editorial argument to an **intelligence product**: a compact product-and-context strip on the
brand teal, two connected view tabs, then one white surface holding six bordered cards at enterprise
density. The critique pass above had diagnosed the problem correctly and treated it in place, band by
band; this pass changed the container. Both sets of reasoning stand — every copy rule, every axis
note, every degenerate-case sentence from that pass survives here — but the shapes they sit in are
new, so what follows supersedes the previous section's *layout* decisions and nothing else.

### Why bands became cards

A band owns the full width by definition and carries its own ground, 80–112px of vertical air and a
48px heading. Seven of them cost three things that mattered more than the rhythm they bought:

- **The first figure was below the fold.** A visitor who had just pressed a submit button was shown
  a *section*.
- **No two pieces of evidence could sit beside each other.** The industry context and the largest
  centres are read against each other, and they were two scroll positions.
- **The heading was the loudest thing in every band.** On evidence, the figures should be.

`Panel` is the replacement and it is deliberately not `Section` with smaller padding: 16px heading,
one hairline border, `rounded-md`, no shadow, and it can be a grid child. `Section` and the
three-ground band system stay in `primitives.tsx` for a surface that wants a band; Screen 1 no longer
does.

### The teal area — what it is allowed to contain

Two things. `ANSR. GCC Intelligence` as the `h1`, and the four answers as four panels. No headline,
no lead, no dotted world map — the map belongs to the entry point's hero, and the ANALYTICAL India
map in the locations card is a different graphic and stays.

**The `h1` is the product, not the finding, and that is the one genuinely contentious trade in this
pass.** It used to read "5 relevant peers operate a GCC in India" at 72px, which is a good sentence
and the strongest thing on the old page. There is no room for it now and no version of this
composition that has room. What it must not do is disappear, so it moved into the `role="status"`
region every result already renders — which means every reader is told the finding once, rather than
only the ones who read a headline. `framing()` still produces it and `gccStatus` still selects the
branch; only where it lands moved.

**The context panels are DARKER than the band, not lighter, and that is contrast rather than taste.**
A translucent white overlay lightens the gradient underneath, and measured over
`--ansr-gradient-teal`'s brightest point an 8% white fill puts `--ansr-text-inverse-muted` at roughly
2.5:1 — so the uppercase label fails AA and every label would have to become pure white, competing
with the value it labels. A translucent black recedes instead and both inks improve: white lands near
11:1 and the muted teal label near 4.8:1. `.gcc-context-panel` carries it, as a relative darken so it
holds at every point of the radial gradient without a per-placement measurement. Hover goes deeper,
never lighter — a control that gets harder to read when you point at it is the wrong direction.

Radius is `md`. The `lg` exception ANSR asked for is scoped to the entry point's form card and its
fields; these are not those controls.

### The tabs — a connected strip, not a segmented control

The pill switch said "here is a small setting". The tool has exactly two analytical views and
choosing between them is the primary act on the page. So: full height, dividing the whole container
width, and **the selected cell is the same white surface as the content under it** — the tab and the
page are one layer, which is what makes the content read as belonging to the tab rather than as a
section that happens to follow it. Both browser specs assert that as geometry and computed fill
rather than by class name: the tab's bottom edge and the panel's top edge are the same line, and
`backgroundColor` matches.

Consequences, in the order they bit:

- **The teal band has `pb-0`.** There is nothing to tune between the tab and the surface. A gap means
  something added padding.
- **The orange active indicator is under the LABEL, not on the tab's bottom edge.** On the bottom
  edge it sits between the tab and the page and breaks the continuous surface, which is the whole
  point of the shape. Under the label, white still runs beneath it into the content.
- **The unselected tab is transparent**, so the band's own gradient shows through — which is what
  "the same deep teal as the section above" means when the section above is a gradient rather than a
  flat fill. A hairline is all the structure it needs.
- **Screen 2's content ground went from pale teal to WHITE**, and its metric cards took a hairline
  border in the same change. A white tab meeting a teal band is two layers; and an open metric card
  used to borrow its edge from the tint it sat on, which stopped existing. A sealed card keeps the
  stronger edge, now `border-2` — that firmer outline is the whole signal that the slot is closed
  rather than empty, and it has to be a step above its neighbours rather than the only border on the
  screen.
- **Manual activation, not automatic.** Arrow keys move focus, Enter or Space activates. Activating
  swaps the entire screen, so arrowing across with automatic activation would tear the page down and
  rebuild it under a visitor who was only looking.
- **Focus on a phase change moves to the tab panel**, not the `h1`. With one shared product heading,
  focusing it announces nothing.

### The six cards — widths, and why two thirds rather than halves

Both analytical rows are a third and two thirds, and both are `items-start`.

| Row | Left | Right |
| --- | --- | --- |
| 2 / 3 | The wider industry context — one figure, three stepped tracks | The largest centres — a four-column table |
| 4 / 5 | Functions — a ranked list of eight short strings | Locations — a map with a ranked list beside it |

Half each left both tables cramped enough to scroll at 1440 while the card beside them was two thirds
empty. `items-start` is not cosmetic either: a grid child stretches to its row, so the industry card
was padded out to the height of the table beside it and rendered with ~300px of empty white under its
own content — the same artefact Screen 2's metric grid has `items-start` for.

The `Panel` heading row is `flex items-start` and does **not** wrap. On `flex-wrap` a heading that did
not fit beside the ordinal took a line of its own with the badge above it, so the narrowest card on a
row grew a two-line header and its neighbour did not.

### The two tables — scrolling, not stacking

The peer block reflowed into stacked labelled rows below `md`, which kept the accessible reading
matching the visual and cost the comparison entirely: five companies as five labelled blocks cannot be
read down a column, and that is the only reason the table exists. Both tables now sit in a focusable,
named horizontal scroller. Two things that are not optional:

- **`tabIndex={0}` with a role and a name.** An overflow container that is not focusable is
  unreachable without a pointer.
- **A visible line saying it scrolls**, below `lg`. A table running past the edge of a phone with
  nothing saying so looks like a table with its last columns missing — and the columns past the fold
  are the employee range, the one a reader came for.

`min-w-3xl` rather than `min-w-2xl`, and `min-w-48` on the locations column: at 768 the tighter table
squeezed the city pills into one per line and rows ran to four times their height.

### Nested steps, and why not a divided bar

The industry context drew one divided bar whose segments summed to the industry total — a part-to-whole
claim. The three figures the approved composition asks for are not parts of one another's sum: 5 is
inside a cohort which is inside the industry. Drawn as a divided bar a reader adds them; drawn as a
row of independent bars they lose the containment. `NestedSteps` draws stepped tracks on one shared
axis, which says "each of these is inside the one above it".

**Both fills are LIGHT steps, and that is a measured constraint.** The figures sit on the tracks —
which is what keeps three rows to the height of three rows — so every fill has to take black ink at AA
wherever a label overhangs it. `teal-200` measures 12.73:1 against black and `teal-300` 9.06:1;
`teal-500` is 4.09:1 and fails, and `--ansr-accent` is 2.14:1. So the accent teal is unavailable here
despite being the obvious choice for the lead step, and `teal-400` is unavailable for the separate
reason the palette already bans it in a chart on a light ground. The lead is marked by depth AND by
weight on its label, so the distinction survives greyscale.

The middle step is labelled "In a comparable sub-industry", not "in a comparable scale band" as the
reference composition calls it. The population is companies above the similarity floor — business
similarity, not revenue band — and mislabelling it would be a false statement about how the peers
were chosen, sitting directly under a table whose method line says the opposite.

### What the reference composition asked for and did not get, and why

Five things. Each is a case where matching the picture would have meant putting a figure or an
affordance on the page that the data or the architecture cannot support.

- **A share percentage and a bar against each function.** There is no per-company function record in
  this dataset and there will not be, so all eight percentages would have been invented. The card
  shows the ORDER, numbered, and the provenance says that the order is all it is. This is the single
  most visible departure from the picture and the least negotiable.
- **"Explore more comparable companies" under the peer table.** There is no deeper set to fetch —
  `DEFAULT_PEER_LIMIT` is the cap, and everything above the similarity floor that is not shown is
  counted in the card below. What is there instead is the exact count, both sides: "Showing 5 of 59
  comparable Retail companies." The reference reads "5 of many", which is the one thing in it that
  must not ship: the figure is available, and a vague denominator in front of a CIO reads as a number
  we would rather not state.
- **"View full ranking" under the largest centres.** That card already holds every entry the engine
  returns. The line that makes the link unnecessary is there instead.
- **A logo disc beside each company name and in the company panel.** The dataset holds no marks. An
  initial in a coloured square is a fabricated identity, an empty placeholder is a visible gap, and
  either in front of a CIO reading companies they know is worse than the name alone. The name cell is
  where a mark goes if any are ever licensed; nothing else has to move. A browser spec asserts there
  is no `img` in the peer card or the profile group.
- **"people across Fortune 500 GCCs in India".** The figure counts professionals inside Fortune
  GLOBAL 500 companies; the two indices have different membership. Both names are written out in full
  everywhere, and a spec asserts the short form is absent.

One thing the reference asked for that IS built and looks like an exception: `ChevronDown` on the
three answer panels. It reads as "this opens a menu" and it does not — it returns to the form. It is
kept because the destination really is the dropdown for that field, and the accessible name is exact
where the glyph is loose: "Change your industry. Currently BFSI." A chevron that opened nothing and
announced nothing would be the dishonest version.

### The page ends at the evidence strip

Removed at ANSR's request: the closing CTA card, the "Talk to ANSR" panel, the review-profile action,
the sunburst, and the methodology, coverage and privacy links. There is no footer. The one compact
source line the page carries is inside the strip that terminates it — the disclaimer, the band-midpoint
method, the dataset's own size, "Source: ANSR GCC Database", and the date. A browser spec walks the
DOM after `#scale` and asserts nothing rendering follows it.

**The date is `dataset.generatedAt`, at month precision.** It is the only date here that is a machine
fact rather than something an admin typed, so it cannot go stale the way an "as of" can. Month, not
day: the stamp is an ISO instant and publishing to the minute would imply the research was refreshed
then, when what happened is that a batch of edits was committed. `dataset.source` is deliberately not
shown — it is free text for the admin's benefit and currently holds the seed spreadsheet's filename.

### The average headcount, which is the one new published figure

The snapshot's second cell is a mean of FTE band midpoints, and this project's standing rule is that a
band-midpoint ratio is honest as a bar's LENGTH and not as a published figure. It is published anyway,
and the reasoning is that it is the same class of claim the evidence strip already makes: `professionals`
is a sum of the same midpoints, on the page, with a provenance line naming the method. A mean is that
sum over a count. Three things make it defensible and none of them is optional:

- **Rounded**, by `roundHeadcount`, to a step coarser than the narrowest band in the data.
- **Industry-level, not peer-set-level.** An average over five similarity-ranked companies is a
  statistic about our matching rather than about India.
- **Never rendered bare.** "Mean of reported employee bands, rounded" is beside it, and a unit test
  asserts the label starts with "Average" and the note says "mean".

## The zone pass — the answer state stops being monotonous

This section supersedes the dashboard pass above wherever the two disagree. What the dashboard
pass settled remains the diagnosis it was answering: seven full-bleed bands were a landing page,
and one white surface of bordered cards is the right shape for the answer to a form. What it got
wrong is what happens when that rule is applied uniformly.

**The diagnosis.** Eight cards, every one a white rectangle with a hairline border, a 16px
heading and an accent-filled step number. Correct, dense, and cognitively flat: nothing on the
page told the eye that the comparison set and the national scale proof are different kinds of
claim, so a reader scrolling it had to read every heading to find out where they were. Two
ranked tables inside it made it worse — a table is the densest thing on any page, and two of
them under two headings read as a spreadsheet pasted into a brand page. The entry point,
meanwhile, was the surface everyone liked.

### Zones, not bands

A zone is a full-bleed ground holding one or two sections, and nothing else. It is not a band:
the sections inside it keep card density and card headings, and two of them can still share a
row. What it adds is a colour change at a boundary, which is the cheapest way to say "the kind
of claim has changed".

Six of them, in order: mint (`surface-tint`), white, near-white mint (`surface-pale`), white,
mint, white. Two rules behind that sequence:

- **No two adjacent zones share a ground**, or the boundary is invisible and the zone was free.
- **`surface-pale` is what lets two mint zones appear on one page without reading as stripes.**
  It is a different step of the same hue, so the sequence has a rhythm rather than an
  alternation. Alternating exactly two values was the first pass's mistake at the band level and
  it would have been the same mistake here.

Vertical rhythm is `py-8 md:py-10` — tighter than the band system's `py-16` to `py-28`, and
deliberately so. This is an embedded tool inside a page with its own rhythm, and the complaint
this pass answers was that everything was too far apart.

### Card tones — four, assigned by class of evidence

`PanelTone` is `plain | tint | accent | inverse`, applied once per class rather than alternated:

- `accent` — a teal gradient heading strip over a white body. **Spent once, on the comparison
  set**, which is the primary evidence. Two accent headers would make neither of them mean
  anything, the same arithmetic that governs one orange per band.
- `tint` — a pale mint fill. On the largest-centres block, so a second list of companies is
  visibly a different kind of block from the white comparison cards two zones up.
- `plain` — white. Where the content is the colour: the containment chart, the function tiles,
  the map.
- `inverse` — deep teal, and still only the terminating scale strip. It stays a card on a WHITE
  zone rather than becoming an inverse zone: a dark block with its own corners floating on white
  is a harder stop than a dark band running to the frame's edge, and a hard stop is what the last
  thing on the page wants.

Radius went from `md` to `lg` and the cards took a shadow, which reverses the "public screens
have no shadows" rule. That rule was written when every card sat on one white page and a hairline
was enough of an edge. A card that has to read as lifted off a pale mint band needs elevation
from somewhere — a hairline against a tint is nearly invisible — and `lg` is the step the entry
point's form card already uses, which is the composition this surface is being brought into line
with.

### The step numbers are gone

The reference composition numbered its six cards 1 to 6 and this drew them as accent discs.
Numbering asserts that the cards are a SEQUENCE to be worked through in order, which they are
not — they are six independent readings of one result, and a visitor who cares only about
locations is not skipping steps 1 to 4. It also spent the surface's one accent fill six times,
on the least informative element of each card. Removed at ANSR's request; the `ordinal` prop went
with it rather than being left for someone to pass again.

### The teal band gets its subject back

Cutting the display hero was right. The pass that cut it left the band holding a lockup and a row
of answers, which is chrome and no content: a visitor who had just submitted a form was told
which product they were in and what they had typed, and nothing about the result.

So the finding is back, at `text-2xl` to `text-4xl` rather than 72px, in Light. Three things
about it:

- **It is not a heading.** The `h1` is the product and is identical on both result screens; a
  second heading here would put the finding into the document outline where a phase change would
  silently rewrite it. Screen readers still get it from each screen's own live region.
- **The lockup dropped a step**, to `text-xl md:text-2xl`. It was the largest type in the band
  when it was the only type in the band; with a 36px sentence under it, a 30px lockup competed
  with the claim it introduces.
- **Screen 2 does not carry it.** Its content surface already opens on the same claim as a real
  `h2`, two elements below, so putting it on the band would be saying it twice inside one scroll
  — and the version in the band would be the one that is not a heading.

The band also gained `.gcc-header-lattice`: a 1px-on-24px dot field on the leading edge, opposite
the diagonal motif, so the band has ornament at both ends and the middle — where the finding
sits — has neither. Areal coverage is about 0.5%, so it cannot lift the ground under white text;
that is arithmetic rather than a judgement.

### The answers stop being controls

Third shape, and the reasoning is worth keeping because the second one looked obviously right.
The dashboard pass made each answer a full-width chevroned button, on the argument that the thing
which is wrong should be the thing you press. On screen that produced four large bordered
chevroned cells directly under the product name — the loudest element in the band, reading as
four dropdowns the visitor was expected to operate. And the chevron promised an in-place editor
that does not exist: all four left the page for the form. Four affordances for one destination.

They are pill-shaped read-only tags now, with no hover state, sized to their own content rather
than divided into equal columns — equal columns forced a two-word revenue band to occupy the same
width as a four-word industry name, which is what made the group read as a form. The way back is
one outlined button, "Change my answers", at the trailing end on desktop and under the pills on a
phone.

### The comparison table becomes cards, and the row packing goes one level deeper

The table was the right instinct for the wrong content. Four of its five columns held a chip
list, a year and a band — nothing a reader ranks down a column — and the one column they came
for, the employee band, was a 14px cell behind a horizontal scroll on a phone. Cards give it 24px
in the first screenful.

- **Rows are planned before spans are assigned.** Five cards become three then two; four become
  two and two, never three and one. A remainder of one takes the full width.
- **Widening a card changes its interior, not just its box.** A half-width card holding a
  third-width card's interior is 40% empty, which is the same artefact the packing exists to
  prevent one level down. A wide card splits its figure and its footer into two columns — gated
  on `lg`, the breakpoint the span itself is gated on, because below it no card is wide and a
  two-column interior squeezed a five-digit range onto two lines.
- **The rank badge replaces the row position.** A grid has no first row, so relevance order has
  to be drawn. It is a hard-edged square counter in the pale mint, not the accent disc the step
  numbers used — that fill is now spent at most once per card, on a figure.

### The containment chart, and the collision that decided its geometry

Three overlapping bars sharing a leading edge, requested by ANSR in that shape and better than
the stepped tracks it replaces for one reason: stepped tracks put a gap between rows, and a gap
is the one thing the eye reliably reads as separation.

- **Concentric was the first attempt and it collides.** Bars centred on one block axis, each
  label at its own trailing end: correct at 1440, and at 390 the outermost bar's right-aligned
  label and a 10%-wide inner bar's outside label land in the same 40px of the same line. The gap
  between them is a function of the ratio between two real figures, so there is no viewport at
  which it is reliably safe.
- **Stepping the top edge fixes it structurally.** Each layer gets an exposed band of `1/n` of
  the stack, its label sits inside that band, and no two labels can meet. The bars still share a
  leading edge and still overlap along z.
- **Always three layers.** Two is the shape it looks and says least in — a full-width pale
  rectangle with a small darker one in its corner — so the comparison set substitutes for an
  unanswered sub-industry, which most visitors leave unanswered. It is also stronger evidence:
  India, then your industry, then the handful on this page.
- **Depth is picked by layer COUNT, not position.** `teal-100` against `teal-200` is a 1.2:1
  difference; two layers take the ends of the ramp instead. Every fill is a light step because
  every one may end up under a label, and the shallow shadow rather than the hue is what carries
  the layering.
- **200px tall.** Three bands of about 67px, which is enough for a 24px figure and its label and
  no more — and it is what brings the card within about 20px of the function list beside it.

### What was removed, and what each removal cost

Ten lines came off this screen at ANSR's request. Seven cost nothing a reader needs. Three did:

- **The map's boundary attribution.** "Boundaries as India states them, from Natural Earth's
  India point-of-view dataset." Project.md's invariant 8 required it on the page, and the outline
  is still generated from that dataset — so the claim drawn has not changed, only the statement of
  whose claim it is. This is the one removal that needs sign-off rather than instruction.
- **The mean-headcount method line.** "Mean of reported employee bands, rounded." The figure is
  still a rounded mean of band midpoints; the honesty now rests on the word "Typical" in the
  label, chosen precisely because it claims a central tendency rather than an arithmetic result.
- **The scale strip's whole source-and-method block.** The audit disclaimer, the band-midpoint
  line, the national count, the database credit and the as-at date. The page now carries no
  provenance at its foot at all.

Two more were removed and their job moved rather than disappearing: the function block's two
caveat paragraphs became the heading "Functions most GCCs run from India", which is a claim about
GCCs in general and cannot be read as one about the companies above it; and the largest block's
"nothing here is ranked by revenue" became the section's lead, where it is read before the ranking
rather than after it.

### Motion

Two additions, both tied to state rather than to scroll — the tool does not own the scroll
container:

- **`.gcc-lift`** on the small cards inside a section: a 2px rise, a deeper shadow and an accent
  edge. Gated on `hover: hover` as well as on motion, because a touch device holds the hover state
  after a tap and would leave one card permanently raised. Under `reduce` the edge still answers
  the pointer — dropping the feedback entirely would spend a real affordance on a preference about
  motion.
- **The containment bars grow** from the shared leading edge, outermost first, one fast step
  apart, with each label fading in a step behind its own bar so a figure never arrives before the
  length it restates. Clipped rather than scaled, because a scale would distort the rounded end.
  The labels use an opacity-only keyframe: `.gcc-enter` ends on a transform, and `fill: both`
  outranks a declared value, so it would have overwritten the `translateY` that positions them.
