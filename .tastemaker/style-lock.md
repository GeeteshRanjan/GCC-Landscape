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
| `--ansr-action` on `--ansr-surface` | 3.35:1 | **stat figures only** — large text, so the floor is 3:1 |
| `--ansr-action` on `--ansr-surface-inverse` | 4.77:1 | stat figures on the terminating strip |
| `--ansr-action` on `--ansr-surface-deep` | 4.95:1 | same, on the impact band's ground |
| `--ansr-accent-warm` on `--ansr-surface` | 6.53:1 | **categorical eyebrows** on white |
| `--ansr-accent-warm` on `--ansr-surface-pale` | 6.42:1 | same, on the near-white mint |
| `--ansr-accent-warm` on `--ansr-surface-tint` | 5.14:1 | same, on the mint — the binding ground |
| ~~`--ansr-white` on `--ansr-action`~~ | 3.35:1 | **do not use** |
| ~~`--ansr-action` on `--ansr-surface-tint`~~ | 2.63:1 | **do not use — not even as a large figure** |
| ~~`--ansr-accent-warm` on `--ansr-surface-inverse`~~ | 2.44:1 | **do not use — light grounds only** |
| ~~`--ansr-accent-inverse` on `--ansr-surface`~~ | 2.44:1 | **do not use — dark grounds only** |
| ~~`--ansr-accent-inverse` on `--ansr-surface-tint`~~ | 1.92:1 | **do not use** — the board does; see below |
| ~~`--ansr-teal-300` on `--ansr-surface-pale`~~ | 2.27:1 | **do not use** — was the largest block's ordinal |
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

- **Radius `none` on every card and panel on the public screens**, settled by the card-system
  pass against a render of the board: every container on `Group 149.svg` is true zero. Two
  named exceptions, both containers rather than contents — the entry point's form card at 8px,
  which the client asked for, and the floating result card at `xl`, which is on a teal-deep
  ground and is the one round object on the surface. `md` (4px) survives only in admin.
- **`pill` is for chips, counters, and the ACTIONS** — the primary CTA (`PrimaryCta`), the
  form's submit, the advance-to-Screen-2 button, and the header's quiet button. ansr.com's own
  controls are pills and the radius scale allows it. It works as a signal only because
  nothing else borrows it: every card, panel and field on both screens stays hard-edged.
- **No shadows on the public screens, with one exception that proves the rule.** The board
  carries none on 5,531px. Separation is the ground change, and a hairline where a block
  draws a MARK. The exception is `.gcc-result-card`, whose two layers are composed out of
  tokens because it floats on `--ansr-teal-deep` and the shadow tokens are fitted at 8-14% of
  that same colour. `Panel` briefly had `shadow-sm` and the comparison cards `shadow-xs`; both
  are gone. Elevation tokens exist for admin's overlays.
- **A LOGO is the third thing on the public screens allowed a radius, and it takes two
  different steps for one reason: how the file is cropped.** A peer card's `CompanyMark` takes
  `md` (4px) — the mark is requested inside a fixed box and Brandfetch letterboxes into it, so
  its corners are padding and a brand supplied as a full-bleed coloured tile stops being the
  only hard-cut object on a card whose own radius is `none`. The customer strip takes `sm`
  (2px): those ten files are cropped to their own ink bounds and the `<img>` box IS that crop
  for nine of them, so every pixel a radius removes there is trademark. `lg` on either was not
  tried and should not be — at a 20–28px mark height it eats the tile's ink, and a clipped logo
  is a damaged trademark. The Fortune badge stays square-cut: its artboard is cropped to the
  lockup's own bounds, so any radius at 16px cuts the `500`.
- **An unmarked comparison card holds the mark's height open, and the thing that makes a
  reserved band acceptable where a reserved BOX never was is that nothing is drawn in it.**
  At the project owner's instruction, reversing "nothing reserved when there is no mark". The
  cost of not reserving was measured on a five-card row where every mark fails: each name,
  figure and city row sat 32px above where a marked card puts it, so the row lost the shared
  baseline the block exists to compare across. An empty band reads as air; a fill, border or
  hatch would read as a slot that failed to load, which is the placeholder tile still banned.
  The ranking row reserves nothing — its mark leads one line, so a reserved width would
  indent an unmarked company's name past its own bar.
- **A radius on an `<img>` only shows on the edges the ARTWORK reaches, which is why
  `CompanyMark` needs `self-start`.** The comparison card's interior is a flex column, so an
  img with `w-auto` took the column's cross size and clamped to `max-w` — a 112px box at every
  ratio, with the fitted mark flush left under `object-left` and every pixel of slack on the
  right. The leading corners curved and the trailing two could not, because there was nothing
  in them to clip. Measured in a headless browser: 112px before, 102.4px after, and the ink
  does not move. The ranking row never had it — its mark is inside a span on a flex ROW.

## Motion

One moment per screen, and on Screen 1 it is the ask-to-answer swap: the evidence bands
stagger in behind the new header. `.gcc-enter` in `globals.css`, driven by a
`--gcc-enter-index` custom property so the stagger is data rather than hand-written delays.
Durations and easings come from the motion tokens; the whole sequence stays under the 400ms
flow threshold per band.

**No scroll-driven motion, ever, on the public screens.** The tool is iframed and does not
own the scroll container, so an IntersectionObserver against our own viewport fires for
content the visitor cannot see — the parent decides what is on screen. This is a correctness
constraint, not a taste preference, and it is why no GSAP/ScrollTrigger dependency was added — and
why `motion` was removed again, below.

**One POINTER moment exists and it is the Fortune badge, at the project owner's instruction.**
`.gcc-badge-pop` in `globals.css`: `scale(1.6)` on hover, so a 16px badge reaches 25.6px.
**1.25 was tried first and read as not clearly visible**, correctly — the resting height is a name's
cap height, so a quarter of 16px is 4px of growth on a mark whose own detail is already below the
resolving threshold. At 1.6 the badge is about a third taller than the row's tallest resting item and
`FORTUNE` begins to resolve, which is the point: the pop is for LEGIBILITY, not affordance. It costs
nothing in layout — a transform takes no part in it, so no row grows and the `Panel`'s
`overflow-hidden` never reaches it, the badge sitting mid-row inside the card's own padding on every
side. `--ansr-duration-base` and `--ansr-ease-spring`, the one token with an overshoot, which is what
makes it read as a pop rather than a swell; the token's own note allows one accent use and this is it.

**Built with `motion` (framer-motion) for one pass, then rebuilt in CSS, and the CSS version is
better on four counts rather than only cheaper.** The values stay on the tokens where `brand_lint`
can see them, instead of being mirrored as JS numbers Motion needs because it cannot resolve a custom
property. `tokens.css`'s global `reduce` clamp reaches a CSS transition and cannot reach a scripted
transform, so the `useReducedMotion` hook goes. The `hover: hover` gate — `.gcc-lift`'s own reasoning
— stops a touch device holding the state after a tap and leaving one badge permanently enlarged,
which `whileHover` did not handle. And `FortuneBadge` goes back to being a server component. The
weight was the prompt rather than the argument: 40KB gzipped for `motion.img` plus
`useReducedMotion`, measured with an esbuild probe, on the entry point of a tool loaded inside
ansr.com's own page.

**A COMPANY MARK POPS TOO, at the project owner's instruction — `.gcc-mark-pop`, 1.12, in
`CompanyMark` so the comparison card and the ranking row cannot end up with two scales.** The
lesson worth keeping is that **a scale is a ratio and a reader sees the distance**, so one number
cannot serve two object sizes: 1.6 on a 112px-wide logo adds 34px a side and puts the mark outside
its own card. **1.2 was measured and rejected on a collision** — worst case it left 2.3px between a
ranking row's logo and the company name, the 10px gap almost entirely eaten, which reads as
touching. 1.12 leaves 5.4px there and 11.7px inside the comparison card's 16px padding, and holds at
1440, 768 and 390. Both figures are from a fully-inked mark at the max-width cap, so they are the
worst case rather than the typical one. **Centre origin, not `left`**: growing only rightward keeps a
card's leading edge clean but drives the entire increase into the row's gap.

**The customer-logo strip is deliberately left out.** Its marks are inside a running marquee, and a
hover target that is moving under the pointer is a different interaction with a different answer.

**Still a deliberate exception to "nothing on the peer surface rises on hover", not a repeal of
it.** That rule exists because a hover response is an affordance and none of these objects is
pressable, which is true of the badge and the marks too — neither opens anything, and neither takes a
tap or focus variant. Under `reduce` the pop simply does not happen, and unlike `.gcc-lift` nothing is
substituted, because there is no affordance being withheld.

**Neither pop can be asserted on a MARK in the browser suite, and that is structural.** The suite
pins the Brandfetch tier off, so no company mark renders in it at all — the badge's hover is asserted
in `0-screen1.spec.ts` and the mark's cannot be. Verified by hand instead, by routing the CDN to a
synthetic inked box; see the Brandfetch trap in the handoff.

**Two AMBIENT periods exist, both outside that scale.** The customer-logo marquee
(`--ansr-duration-marquee`, 48s) and the density map's hub halo (`--ansr-duration-pulse`, 3.2s).
**Only the marquee still loops** — the halo runs two cycles and stops, for the reason in the answer
state's section below.
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
the same fill inset reads as a target. A selected row is **Medium weight in the heading teal**,
since the fill is already spoken for by the keyboard's position and a state sharing a signal
with another state is not a state.

**A check glyph in the accent was that second signal and it has been removed, at ANSR's
request.** It cost the whole panel its alignment to restate one answer: a mark that appears only
on the selected row would shift that row's label by 22px, so the space had to be reserved on
every row — all 24 industries and all 201 countries — which pushed every label 22px inside the
tier heading and the hint line above it, and forced the heading's own inset to be a `calc`
reaching past it. What it bought was a tick on the one row the visitor had already chosen, which
the trigger directly above the panel is also displaying in full. Weight from Light 300 to Medium
500 is a 200-unit jump and reads clearly; the teal takes over the colour the glyph was carrying,
so the pair still survives greyscale on the weight, and `aria-selected` was always what the
assistive reading used. The tier headings carry a
**hairline above** rather than extra space: two tiers separated by space alone read as two lists
in one box, and the rule is what makes them read as one list in two parts. And a **count** on a
branching row says both that a branch exists and how deep it is, which a bare chevron does not —
`aria-hidden`, because a `treeitem`'s name is computed from its contents and "Retail 9" is not
the name of anything.

**The count's grey PILL is gone, and the pill was noise rather than chrome.** Thirty filled
`grey-100` capsules down the trailing edge of a thirty-row list, each holding one or two digits,
directly beside a chevron already saying "there is more behind this row" — the container carried
nothing the numeral did not, it went muddy wherever it landed on a tinted row, and it was the
second loudest object in a panel whose subject is the labels. What it was actually providing was
the column alignment, and `min-inline-size` provides that on its own. The count and the chevron
are now one `.gcc-select-cue` element so both take the accent together on the active row: a cue
whose halves change colour at different times reads as a rendering fault.

**Four more things were wrong on the render, and each was a different kind of mistake.**

- **The active row's fill was the BAND GROUND.** `--ansr-surface-tint` is `teal-100` — the mint
  the whole form card sits on — so the panel's loudest fill was at full page-band strength 4px
  from the row above it, and a hovered row read as a filled table cell rather than as a target
  the pointer is over. It is a **60% dilution** of that same mint now, and the branch-open row
  85%, so the two states differ by depth rather than by colour and neither ever matches the
  ground outside the card. **Mixing off `--ansr-accent` instead was tried and rendered grey**:
  the accent is `teal-600`, a dark low-chroma teal whose job is ink, so a tenth of it in white
  lands on a neutral with barely any hue left — and a grey hover fill on a teal brand reads as
  the browser's default rather than as a decision. It is a mix rather than a ramp step because
  the ramp has nothing between `teal-50` (2% off white, invisible here) and `teal-100`.
- **The panel's edge was fainter than the closed control's.** `--ansr-border-strong` is grey-300
  at 1.78:1 while `.gcc-field` is outlined in grey-500 at 3.28:1 — so the element in front of
  everything else had the weakest border on the card. It is a quarter of the accent mixed into
  grey-500: the neutral's weight, in the lit trigger's colour family, without becoming a
  saturated teal box on a card whose rule is that teal means "in use".
- **The trigger went dark the moment its own panel opened.** The panel focuses its filter input
  on open, so the trigger lost `:focus` and dropped back to the neutral hairline — leaving a
  teal-haloed panel hanging under a grey rectangle at the exact moment the two are one control
  in two parts. `.gcc-field[aria-expanded="true"]:not(:focus-visible)` restores the focused edge.
  The attribute is already there for the assistive tree, so the selector cannot drift from the
  state it describes, and the outer 12% bloom is deliberately NOT repeated — two glows meeting
  in the 8px gap read as a smudge rather than as depth.
- **The header was two near-identical strips.** The filter and the hint already shared
  `surface-pale`, so the hairline between them divided that ground from itself: three pieces of
  chrome (search, note, tier heading) to read past before the first choosable row.
  `.gcc-select-filter:has(+ .gcc-select-hint)` drops the internal rule, the hint loses its top
  padding, and the note reads as a caption belonging to the search above it. `:has` rather than
  a class, because the condition is that the two are adjacent.

**The panes' scrollbars are themed, and it is the only scrollbar in the project that is.** A
201-country list is scrolled by everyone who reaches it, so left alone this control shipped
macOS's translucent grey overlay and Windows' 15px light-grey trough — the one surface on the
panel belonging to no design system. Standard properties only: `::-webkit-scrollbar` would allow
the thumb to be drawn to the pixel and it also opts the element out of overlay behaviour, which
turns a bar that floats over the list into one permanently taking 15px out of a 13rem pane. Scoped
to the two lists rather than set globally, because the public screens do not own their scroll
container and theming the document's bar would be styling the host page's furniture.

**The open panel is REVEALED, and reading the ban one step too strong is what left it cut off.**
The panel opens downward and never flips, so a visitor with the card's lower half below the fold
saw five rows of thirty at 1440×900 and ONE row at 390 — not clipped, since the panel extends the
document, which is worse than clipping because a list ending exactly at the window edge looks like
the whole list. `select-field.tsx` now asks the browser to scroll it in. That is allowed: the ban
is on scroll-DRIVEN behaviour — listeners and observers against a viewport the parent controls —
and `scrollIntoView` reads nothing, reports nothing, and is inert inside a frame sized to its own
content, which is also the one case where the panel could not be cut off anyway. The panel's own
"keep the active row in view" effect has always used the same call.

Three details it took a measurement to get right. The target used to be the **PANE** when a branch
was open, and had to be keyed on `branch` as well as `open`, because the pane was then positioned
outside the panel's border box and could extend past whatever the browser had just revealed. The
pane is a flex sibling inside a fixed-height body now, so the panel's rectangle is the whole popup
at every state and one call on `open` covers it. `block: "nearest"` scrolls by the
minimum and does nothing when the panel already fits, so it cannot move the page under someone who
did not need it. And **`scroll-margin-block-end: var(--ansr-space-6)` is load-bearing, not air**:
the scroll happens on the frame the panel mounts, when the entrance keyframe still has it at
`scale(0.98)` translated up 4px — so the box the browser aligns is about 11px shorter and higher
than the one that settles 240ms later, and the panel hung that far past the window edge at every
one of four viewports tested. 24px covers the delta and leaves the air. Block-end only: aligning
the top is what happens when the panel is taller than the scrollport, and a margin there would
push the field that owns it further off screen.

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
cascade reads in. It now does so INSIDE the panel, as a flex sibling of the first pane, and the
two split the body in half.

**The version this replaced was positioned OUTSIDE the panel, and the whole of what follows is
the reasoning that is now dead.** The pane had to fit between the card's inner edge and the window
edge, so its widths came from a measured table:

| layout width | 768 | 1024 | 1280 | 1366 | 1440 | 1536 | 1920 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| room (px) | 88 | 112 | 240 | 283 | 320 | 336 | 560 |

Above 1280 that is exactly `layoutWidth / 2 − 400`, because the container caps at 1280 and the
card is centred in it. Nothing could clamp the pane to that number at runtime — reading the
viewport is what the iframe forbids — so 16rem was taken from the table at 1440 and 18rem at 1536,
and **below 1440 the pane became a drill-in** because there was no room beside it. Every value
depended on the card width, the container cap AND the grid all staying put, none of it could be
checked by a test, and the two laptop widths most visitors are on drilled in.

Widening the panel deleted all of it. The pane splits a box whose width is the form grid's, so
there is nothing left to measure: the side-by-side shape works from `md` instead of from 1440, and
at the `lg` body's 800px each half is 400px — one line for every industry name and every
sub-industry name in the taxonomy, where the 16rem pane wrapped or truncated most of them. The
browser spec that asserted the two shapes now asserts the drill-in at 390 and 720 and the split
from 768 up, and the no-horizontal-scrolling sweep at seven widths stays exactly as it was,
because a popup that overruns the window still gives the framed document a scrollbar the parent
page cannot fix.

**Below `md` it is still a drill-in**, covering the first pane with its own header as the way
back, because there the panel is one field wide and two halves of it are unusable. One element and
two shapes rather than a second component that can drift from the first. It now covers the BODY
rather than the whole panel, so the filter stays reachable while a visitor is inside a branch —
which was a real fault in the old shape, not a refinement.

**Opening a branch drops the first pane from two columns to one.** The body's box does not change
— same width, same height — so nothing moves around the panel; the list re-flows into the half it
still has. That reflow is visible and is the accepted cost of parent-left/child-right at this
width. The alternative was two columns of 255px, where two thirds of the industry names wrap; a
reserved empty pane was also tried and is worse, because 272px of prompt beside the list is dead
space at the moment a visitor is scanning 24 rows. The row that was pressed keeps its fill and its
leading rule, so the reflow has an anchor.

**Re-opening the control does NOT re-open the visitor's branch.** Tried, and worse: a visitor
coming back to this control is usually there to change the INDUSTRY, and pre-opening a branch puts
the industry list behind a pane below `md` and into a single column above it — narrowing, in both
cases, the exact thing they came back for. It loses nothing — the trigger already reads
"Retail · Apparel & Footwear Brand" — and the keyboard lands on the industry that owns the answer.

### The panel is wider than the field, and the options are in columns

**The failure this fixes is findability, and findability is this control's real failure mode.**
A popup one form field wide showed eight rows of 24 industries in a 16rem scrollport, so a visitor
was deciding between industries without seeing the set they were deciding within. One who cannot
find their own row takes the broad answer instead, and the peer set loses its primary ordering
signal — 0.9-plus coherence with a sub-industry against 0.13 without one in Manufacturing, measured
in `docs/data-audit.md`. No amount of scoring work recovers that; only the control can.

**The widening is expressed in the FIELD's own width, never the viewport's.** The form grid is two
equal columns with a 24px gap, so the sibling column is `100% + 24px` of this field, and a negative
inline-start margin of exactly that against `inset-inline: 0` gives a panel spanning the grid — a
percentage margin resolves against the containing block's inline size, and the containing block is
the field's own wrapper. Nothing measures the card, the container or the window. Gated on `md`,
where the grid gains its second column; below that there is no sibling to widen into and the panel
is field-width with one column, which on a phone is the only shape available anyway. Measured, for
the two widths the column counts are fitted to: the grid is **592px at `md` and 800px from `lg`**.

**It is LEADING-side, which is why `wide` is a per-control prop rather than derived from the option
count.** Only a field in the grid's trailing column can widen this way — industry and headquarters
are, revenue band is not — and a count-based rule would eventually widen the leading column's panel
off the card.

**Columns are CSS multi-column, and that is a keyboard decision as much as a layout one.** Content
flows down column one and then down column two, which is the order the keyboard walks — so
ArrowDown moves down the column under the pointer and steps to the top of the next at the bottom,
with no separately-derived navigation order to fall out of step with what is drawn. A grid with
`grid-auto-flow: row` would have filled left-to-right and put the keyboard order across the columns.
Two traps came with it, both now written into the CSS: **a multi-column box with a definite height
becomes a fragmentainer**, so height goes on a wrapper and the columns run at height auto, or content
past the height adds columns and overflows sideways instead of scrolling; and **tier headings need
`column-span: all`**, or the two tiers interleave down one column and a heading lands mid-column with
its hairline cutting across two rows of the same tier. Spanning is also what makes the columns
symmetrical per tier rather than balanced across the whole list.

**Two columns for industry, three for countries, and the counts are measurements.** The taxonomy's
longest industry name is 41 characters, which at 14px needs about 290px of label — so at 800px two
columns give 400px each and every name stays on one line, while three would give 267px and wrap two
thirds of them. A country name is short, so the list that gains most from density is also the one
that can afford it.

**The body is a FIXED height on a wide panel and a CEILING otherwise.** The fixed height is what the
cascade exists for. The ceiling is for revenue band: given a height it drew seven rows at the top of
a 416px box with 230px of nothing under them, which reads as a list that failed to load rather than
as a short list. Heights are fitted to the industry list, the longest thing that has to fit whole —
24 industries in two tiers at a 26px row is 364px, so 26rem from `lg` shows the entire taxonomy with
no scrolling at all.

### The type came down, and the fills came off the chrome

**A row is 14px on `--ansr-leading-snug` at 4px of block padding — 26px, where it was 40.** Every
pixel of row height is a row not on screen: at the old measurements 24 industries needed 960px and
had 256. **16px was never a legibility floor here.** The floor that matters is on the TRIGGER, where
iOS zooms the viewport for anything smaller, and the trigger keeps 16px for it; a row in an already
open popup is not a text input and cannot trigger that behaviour. `sm` is also the size this project
already sets dense evidence at, so the popup is now in step with the tables rather than a step above
them. `--ansr-leading-snug` rather than `normal` because a wrapped two-line label has to read as ONE
row, and at 1.5 two lines of one row are hard to tell from two rows.

**Row fills are diluted into `--ansr-surface-pale` rather than into white**, at ANSR's request: the
fill is the tint that marks India's column in the technology capability grid, one step up so it can
carry a hover. Diluting into white drove the mix toward a neutral as it lightened; diluting into
`teal-50` keeps the mint in it at every strength. 45% rather than the India tint neat, because
`teal-50` is ~2% off white — a band marker on a table, and invisible as a hover state on a white
list. **Matte is carried by what is absent**: one flat fill, no gradient, no inner shadow, no border,
no ring, and the row's only other change on hover is its cue's ink.

**Nothing in the panel's chrome is tinted.** The filter row, the hint line and the pane header were
all on `surface-pale` and all three are now on `surface`, separated by one hairline. With the hover
wash and the branch row both in the mint family, a tinted chrome strip put the panel's loudest mint
where nothing was happening — and stacked three coloured bands to read past before the first
choosable option. **The hint is a supporting note, not a strip**: 12px Medium in
`--ansr-text-muted`, with the same padding above as below. Medium rather than the brand's Light 300,
which is right for a paragraph and is too little ink at 12px in grey beside a 14px option list, and
this line has to be noticed once.

### The revenue band is spelled out for a visitor and never renamed in the data

`< $100 Mn` is drawn as **Under 100 Mn**. Two changes, both ANSR's: a mathematical operator in a list
a CFO reads is a glyph that has to be decoded where the word is not — and it makes the two ends of
the set symmetrical, since "Above $20 Bn" was already spelled out — and the currency mark comes off
all seven rows to be stated once in the panel's hint, because up to two `$` a row is fourteen marks
saying one thing and crowding the figures that differ.

**The data is untouched.** `taxonomy.revenueBands` order is the peer-matching contract and the
strings are the keys 1834 companies carry, so renaming would cascade into every company, move the
`data:verify` profile, and put a taxonomy migration behind a typographic decision. `formatRevenueBand`
is presentation, applied at the three places a visitor sees a band; **admin keeps showing the stored
strings, which is correct, because admin edits the datum.** The pill has no hint to carry the unit so
its LABEL does — "Revenue band (USD)" — and both result screens use the same one, because a band read
one way in the control and another in the echo of the visitor's own answer is two answers.

**Choosing an industry does not close the panel.** It commits the industry — the trigger
updates, so the answer visibly took — and opens its branch, because that is the only moment a
visitor learns a narrower answer is available. The branch's leading row is **`All of {industry}`,
already marked as the answer**, which is both the way out and the statement of what happens if they take it;
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
- **The trigger shows both halves** — "Retail · Apparel & Footwear Brand". The field is labelled
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
`gccStatus` still reaches the server, still branches Screen 2's `functionFraming` — which
renders its `h2`, its lead and its closing CTA — and is supplied as the
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
- **There is no panel any more.** The country sits directly on the white card. A tinted box around
  it was what made the previous version read as a widget rather than as a map.
- **The graticule is gone.** A coastline is a better reference than evenly spaced rules, and it is
  the one the reader already has.
- **The bright-mint dot depth was a latent breach and is gone.** `--ansr-teal-bright` carried the
  middle density step at 2.44:1 on a light ground; it predated the rule being written down. The
  depth steps have since gone entirely — see the pass below.
- **No bars in the ranked list when every city holds one GCC.** Every share is then 1, so a row of
  full-width bars reads as "a lot of them" for a set where each city has exactly one. Same
  instinct as `FigureRow` on Screen 2.

### The soft-mark pass — why it stopped reading as a school diagram

Read off element renders of the map card at 1440, 768 and 390. **Five faults with one cause: every
element on the field had a hard edge, so nothing was ground and everything was a figure.** Fixing
any one alone would not have moved it.

- **Two strokes and two fills became one of each, and then ONE mark form at ANSR's request.**
  Established hubs were a solid disc with a white stroke; emerging ones a white disc with a teal
  stroke. That became a halo against a hairline ring, then a halo against a smaller halo — every
  city drawing the same mark, with area the only thing that varies.

  **The cost is real and is not a simplification.** The hollow ring was the status-by-form rule
  doing actual work: two marks differing in whether they had a BODY, which survives greyscale,
  on a palette whose own note says it cannot separate meanings by hue. With one form there is
  nothing left to carry established-versus-emerging, and a second colour step is precisely what
  that rule forbids. The distinction now exists only as the "emerging" qualifier on the ranked
  list's rows. **The two-shape legend went with it** — a key naming two marks that no longer
  differ is false, so it was removed rather than reworded. On the blocked list.
- **`radiusFor` is untouched, so the claim did not move.** Area is still the encoding; the halo's
  outer edge is the same circle the disc drew.
- **The falloff holds dense to 45% of the radius, not 30%.** At 30% — which is what the direction
  asked for — the visible extent of a mark fell well inside its encoded radius, and Bengaluru at 90
  came out the same size as Chennai at 34. That is the encoding failing, not a matter of taste, and
  the render is what moved it. The mark still has no edge.
- **A fixed hard core, capped at 30% of the halo it sits in.** A soft mark has no boundary, and
  Mumbai and Pune are 80km apart — at this scale the reader has to see two places. The core carries
  no quantity, so it does not scale; the cap stops the smallest hub rendering as a solid disc with a
  faint rim, which is the old mark back again at the bottom of the scale.
- **The two density steps are gone with the disc.** Depth was always the redundant second encoding —
  area is primary — and a gradient cannot express a token step cleanly without a second gradient
  def. One mark form was the point of the pass.
- **The marks are the BRIGHT brand orange, and the ground was rebuilt around it rather than the rule
  bent.** The ask went orange, then brown, then bright and vibrant. Brown shipped for one pass on a
  token derived for it, `--ansr-orange-800`; the mark is now `--ansr-action`, the anchor. The ramp step
  stays and its semantic alias went with its purpose — see design-stack.md.
  **What made that work was moving the land, not the mark.** The anchor is 2.03:1 on `teal-200`, where
  the marks used to sit — nearly the same luminance as the ground, which is exactly why the colour read
  badly: two saturated fills at one value vibrate instead of separating. On `teal-100`, blurred, the
  ground drops away and the mark is the brightest thing on the card.
  It is still under 3:1 against that ground, and the position taken is the project's own: **every mark
  here is a second reading of a figure already in text.** The ranked list carries every city and count,
  which is the same reason the marks are `aria-hidden` rather than described. Where the argument does
  not reach is a mark carrying something the text does not — no other chart may borrow it. It is also
  **the first chart colour in the project off the teal ramp**; the scoped exception is in project.md.
- **The marks came down in SIZE by one factor at both ends, so the encoding is untouched.** Area still
  tracks the count and any two cities keep their exact ratio. The reason is the southern cluster:
  Bengaluru, Chennai, Mysuru, Mangaluru, Coimbatore and Salem sit within a few degrees, and at the old
  peak the leading city's halo swallowed its neighbours rather than overlapping them — one blob instead
  of a dense region, which loses the thing the map is for.
- **The country is unstroked, BLURRED, and filled with a very fine DOT FIELD.** A hairline coast made
  India a boundary DRAWING; a filled silhouette is the same claim drawn as ground, and invariant 8
  governs the geometry's provenance rather than whether it is outlined — or how it is filled. Pinned by
  a spec asserting the outline's computed `stroke` is `none`.
  It went from `teal-200` to `teal-100` to a texture. The intermediate step is worth keeping because it
  explains the blur: unstroked at `teal-100` a CRISP silhouette is 1.27:1 and reads as a ghost, and the
  blur is what let the lighter step work — blurred, the country has no edge to be judged by, so it
  reads as a wash rather than as a shape that failed to draw. Bright orange needs that; at `teal-200`
  the mint sat at the mark's own luminance and the two vibrated.
- **The dots are an SVG PATTERN, not generated geometry, and that is a size decision.** ANSR asked for
  the hero's dotted treatment but finer — fine enough to be almost unnoticeable. The hero gets its dots
  from `build_dot_map.py`, which writes ~112KB of zero-length subpaths; finer dots over India at this
  scale would be more again, shipped to a browser for a texture whose whole point is that you barely
  see it. A pattern is a few bytes and is clipped to the country by the fill itself.
  **The grain and the ink had to be chosen together, and the coverage is the number that matters.** A
  circle of radius r on an s x s grid inks `pi*r^2/s^2` of the area, and that ratio is what the eye
  reads as the country's value. At ~16% coverage, `--ansr-motif-ink` dots average to `#D6EAE8` over the
  card against the flat fill's `#D1E9E7` — the same presence, now as texture. This is also why the ink
  is a MID teal rather than the pale one it replaced: `teal-100` dots over 16% of the area average out
  to nothing, and the country would not be faint, it would be absent.
  Unlike the hero, dot size scales with the drawing rather than holding constant in device pixels. The
  hero needs `non-scaling-stroke` because it is a subject at one width; this is ground at four, and a
  texture holding its absolute grain while the country shrinks gets coarser relative to what it fills.
- **The blur must stay SMALLER THAN THE DOT SPACING**, and that is the only constraint on its value.
  Spacing is ~3 user units, so the old 1.6 merged the dots into a flat wash and the whole change would
  have been invisible — the same country as before with more work behind it. At 0.7 the dots stay
  individually present while the field goes soft. Raising one means raising the other.
  It is on a GROUP holding the outline and the islands together: done per path the specks keep their own
  hard edge and go back to reading as dirt. The radius is in user units, so it scales with the drawing
  rather than getting relatively heavier as the map gets smaller.
- **The island specks are sized and inked to the land's own dot.** They were the highest-contrast marks
  in the eastern half of the frame while carrying no data, which is how territory comes to read as dirt
  on a screen; matched to the grain, an island is one more of the same texture. They are round-cap
  zero-length subpaths — so on this surface the islands are the one place the dots really are geometry.
  Still drawn, because the frame must contain the whole of India.

**Every ranked city is labelled, OUTSIDE the country, scattered both sides.** ANSR asked for the
names the list shows — the leading eight, and all of them once the visitor expands — never over the
map, and not stacked on one side. Three shapes were built before this one and each failed for a
reason worth keeping.

- **Beside the dots, with a `paint-order: stroke` knockout.** Fine for three, and the knockout is what
  ate a bite out of the Pune dot. There is no room beside a dot in a cluster this tight.
- **One column in the Bay of Bengal.** It fills the frame's empty east and is better for the southern
  hubs. What it does to a WEST coast city is disqualifying: Mumbai's leader came out as a ~200px
  hairline straight across the peninsula at a constant latitude. **A long horizontal line across
  India, under ANSR's brand, on a graphic whose entire provenance argument is invariant 8, is the one
  mark this thing must not draw** — a reader who takes it for a boundary is not being unreasonable.
- **Gutters outside the viewBox, with the map full width and the list beneath it.** Twenty-two labels
  will not fit in whatever sea is nearest, so the labels left the frame — and in a 7-of-13 column that
  put the country at 289px with 7px type. Going full width bought the size and cost the layout ANSR
  wanted kept.

**What resolved it was deriving the coastline from the outline path itself.** `coastAt` parses
`INDIA_OUTLINE_PATH` — pure `M`/`L`/`Z` polygons — into the westmost and eastmost x per latitude band,
so "outside the country" is a computable fact and the frame's own seas become usable. That is what
puts the map back in its column at full size with the labels still clear of the land, and it is why
they scatter around the country's shape instead of stacking.

- **No second artefact.** The extents come from the same string the map draws, so nothing can go stale
  against a regenerated outline, and they inherit invariant 8 for free.
- **The MAINLAND polygon only, and this one mattered.** Measured across every subpath, the east coast
  at Chennai's and Bengaluru's latitudes came out as the ANDAMANS, so the roomiest water in the frame
  read as occupied and every southern label was pushed west across the country. The mainland is the
  longest subpath by a wide margin, so it needs no threshold.
- **Side is one cost per side in the same units**, distance to that coast plus however much the text
  would overflow the frame. A hard fits-inside test sent Ahmedabad — a city on the Arabian Sea — to the
  Bay of Bengal, because Gujarat reaches far enough west that its own sea was 33 units short. Pricing
  overflow the same as crossing makes a short leader with a slightly overflowing label win, which is
  the right way round.
- **The coast is read AGAIN at the settled latitude** after vertical de-collision, or a label that
  moved a hundred units still hugs the coastline it came from.
- **`overflow-visible` plus a small percentage padding is the safety valve, not the layout.** Most
  labels land inside the viewBox. Reserving room for the few that do not, rather than shrinking the
  whole map, is what keeps the country full size — and it is why a spec asserts the document never
  gains horizontal scroll at 640 with the list expanded. Visible overflow does not affect layout but
  does enlarge an ancestor's scrollable region, and the 320px reflow test cannot catch it because
  below `sm` no label is drawn.

**The legend moved from the foot of the map to the head of the ranked list, and then went entirely.**
It sat under a 430px graphic, further from the marks it decoded than from anything else on the card —
a key a reader has to travel to is a key they decode the graphic without. The move is moot now that
one mark form left it nothing true to say, and it is recorded only so nobody puts it back at the
bottom. The column gutter came down from `gap-10` to `gap-6` in the same pass and stays.

**Three things this block has now lost to an instruction rather than to an argument**, in order:
"Larger means more GCCs" — the area encoding said out loud; the boundary attribution, which
**invariant 8 required on the page**; and the tier distinction with its legend. Each was ANSR's call
and each is defensible alone. The accumulation is the thing to raise, not any one of them: the ranked
list is now doing all of the explaining, and the graphic states nothing about itself.

**What was refused from the direction: overlapping the ranked list onto the map.** The map's box is
not padding — it is India plus the sea the labels and the Andamans occupy — so the list would have
covered either the northeast or the labels. The intent behind it, no dead gutter and a legend near
the marks, is met by the two changes above.

### The hub pulse, and the rule it is built on

`--ansr-duration-pulse` (3.2s) is an ambient period, not a sixth step on a scale whose five values
are all under 400ms.

**It runs for two cycles and stops. It used to be `infinite`, and that was the one place this
project's motion read as decoration rather than as meaning.** Nothing about the map changes once the
screen has arrived, so a pulse that never ends announces an event that is not happening — and a
reader comparing two halo areas is doing it on a graphic that keeps moving under them. Two cycles
say which three are the leading hubs and then get out of the way, which puts this on the enter
animations' footing rather than the marquee's. The count lives in the component (`PULSE_CYCLES`) and
reaches CSS as a custom property, so the number and its reasoning sit together; a spec asserts the
computed `animation-iteration-count` is 2.

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

**Superseded in part — the close is back on both screens. See "The close comes back, as a paywall
band" at the end of this file.** The evidence strip is still the last EVIDENCE and still terminates the
argument; what follows it now is the ask. Everything else this pass removed stayed removed, which is why
the close's return is one band of three elements rather than the five things listed here.

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
- `tint` — a pale mint fill. On the largest-centres block. It was chosen so a second list of
  companies read as a different kind of block from the white comparison cards two zones up; that
  block is a chart now and is one anyway, but the tint stays because a `surface-sunken` bar track
  needs it to stay visible and because `plain` would leave this value with no consumer at all.
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

### The containment chart, and the ratio that decided its geometry

Three overlapping layers sharing a leading edge, requested by ANSR in that shape and better than
the stepped tracks it replaces for one reason: stepped tracks put a gap between rows, and a gap
is the one thing the eye reliably reads as separation.

**The diagnosis this pass answered.** On the default path the chart drew 5 inside 189 inside
1,834 — 0.27% and 10.3% — so the innermost layer was a floored sliver nobody could see, the
middle one was a 64px block whose own label overhung it, and the lower two thirds of a 200px card
were empty tint. It was worse at 390, not better. **Three orders of magnitude are not drawable as
three lengths and no tuning changes that**: a log or square-root axis buys the visibility by making
the length a lie, which is the same move as truncating an axis and is out for the same reason.

- **Concentric was the first attempt and it collides.** Bars centred on one block axis, each
  label at its own trailing end: correct at 1440, and at 390 the outermost bar's right-aligned
  label and a 10%-wide inner bar's outside label land in the same 40px of the same line. The gap
  between them is a function of the ratio between two real figures, so there is no viewport at
  which it is reliably safe.
- **Stepping the top edge fixes it structurally.** Each layer gets an exposed band of `1/n` of
  the stack, its label lives in that band, and no two labels can meet. The layers still share a
  leading edge and still overlap along z.
- **A label sits on whichever side of its own mark's trailing edge has more room.** One rule,
  stated as a 50% threshold: the full-width outermost layer keeps its label inside, and every
  narrower mark puts its figure after its own trailing edge. That is what stopped a figure
  overhanging the bar it belongs to, and it is what turned the width this chart used to leave
  empty into the place the figures are read. Labels used to sit at the leading edge unconditionally
  — the component documented the outside case and never implemented it.
- **The innermost level is a POSITION MARKER when it is a selection rather than a population.**
  Five companies is not a quantity this axis can hold, so it stops pretending to be one: a
  fixed-width mark, capped by `min()` at the extent of the layer it is inside, so a thin industry
  gets a marker clipped to its parent rather than one sticking out of it. Its figure is in text
  beside it exactly as every other layer's is — the mark was always the second reading — and what
  it now says is "inside this population, here" instead of "this many". An answered sub-industry is
  a real population and draws as a proportional bar, so ANSR's three-bar shape survives intact on
  that path. **This is the one visible departure from the shape ANSR asked for; it is on the
  blocked list to be shown with a render, not to be quietly reverted.**
- **Always three layers.** Two is the shape it looks and says least in — a full-width pale
  rectangle with a small darker one in its corner — so the comparison set substitutes for an
  unanswered sub-industry, which most visitors leave unanswered. It is also stronger evidence:
  India, then your industry, then the handful on this page.
- **Depth is picked by layer COUNT, not position.** `teal-100` against `teal-200` is a 1.2:1
  difference; two layers take the ends of the ramp instead. Every BAR fill is a light step because
  a label may land on it, and the shallow shadow rather than the hue is what carries the layering.
  **The marker is the exception and takes `--ansr-accent`** — the one non-light fill here, and it
  is available precisely because no label ever lands on a marker: a label is confined to its own
  layer's band and starts at or after its own extent, so the marker's 8px is the one region
  guaranteed to carry no text. The level that most needs to be emphatic finally can be.
- **144px tall, down from 200.** Three bands of 48px, which holds one line of a 24px figure and
  its label — and one line is all a band needs now that no label overhangs its own mark. The extra
  56px was fill: on the default path two thirds of the chart is the outermost layer's own pale
  ground, and making that region taller made the card read as mostly empty without making one
  figure easier to read. It also gave up the 20px height match with the function list beside it,
  which was the old height's stated justification — **matching a chart to the card beside it is
  padding**, and `items-start` exists so the shorter card may simply end.
- **And capped at 352px, because this card DOES opt into its row's height.** 144 is the floor and the
  cap is the ceiling on the same stretch: the body grows the chart into whatever the ranking beside it
  runs to, which moved once already. See "The card that was too short".
- **The outermost bar's shadow is suppressed by an explicit `--back` modifier, not by
  `:first-of-type`.** That selector matched on element type, so it depended on the outermost bar
  happening to be the first `div` among its siblings — which any wrapper, and any layer drawn as
  something other than a bar, would have silently given the shadow back to. The `Fragment` is
  still required for a different reason: a `display: contents` wrapper leaves a node in the DOM.

### The largest-centres block stops being a second set of company cards

**A third of the answer state was the same data twice.** The comparison cards showed JPMorgan
Chase, Wells Fargo and Citigroup with their headcount ranges; the largest-centres block showed the
same three with identical ranges about 400px later, each in a bordered card the same size, each
labelled "Also in your peer set" — a chip that admits a repeat rather than resolving one.

**Neither block could be deleted.** One answers "who is comparable to you" and the other "what the
top of this industry looks like", and both are in the brief. So what went was the CARD, not the
content: the names and the order were never the repetition, since JPMorgan Chase being the largest
BFSI centre in India is a different fact from its being the closest comparison.

- **A row is now the minimum a ranking needs**: the position numeral, the name, the figure at the
  trailing edge, and a full-width bar beneath. Five rows in about 280px where five cards took 700.
- **The city chips and the establishment year went with the card, and came back without it.** The
  removal read the finding one step too strongly: the duplication was a bordered box restating four
  facts at the size of the box that first said them, not the facts. At ANSR's request they return
  as `sm` pills — about 26px a row, no second card — and they answer what a ranking otherwise
  leaves open, since a reader who recognises a name from the set above still has nothing telling
  them where the biggest centres are. The year is a pill too rather than the comparison card's
  sentence: on a row of marks a sentence would be the only prose in the column. **What may not come
  back is the card.**
- **The row settled at two lines, and it took three arrangements to get there.** The figure at the
  trailing end of the NAME row was right until the tags existed. A tag line of its own then put the
  pills between the figure and its own bar — the number nearer the company name than the mark it is
  the value of, which a ranking cannot afford. Moving the figure down to the bar left the pills with
  a ~30px void beneath them across the card's leading half, since a figure occupies only the
  trailing edge and its line is empty everywhere the tags had just been. **Tags and figure on ONE
  line has neither**, with `items-end` so the pills land on the figure's baseline instead of
  floating at the top of a 24px line.
- **`ms-auto` on the figure as well as `justify-between`.** They do different jobs and only one
  survives a wrap: where the pills fill the line — HSBC carries six cities — the figure wraps onto a
  line of its own, and a justified single item goes to the LEADING edge. The figure column would
  have broken on exactly the row with the most to say.
- **16px between rows, 4px inside one, 4px from the figure to its bar**, and `leading-tight` on the
  name. At 6px the rendered name-to-pills gap read as about 15px: the default leading on that step
  is 28px around 18px of glyph, and `items-end` below adds another half-gap, so two invisible ones
  were stacked on the declared one. The tightest pairing in the row is the figure and its bar, which
  is what says those two are one thing.
- **That closes the ~350px gulf** the card row had between its city chips and its figure column.
  It was structural: a `name | flex-1 | figure + 224px bar` row in an 1184px card has nothing to
  put in the middle once the middle is short.
- **The bars run full width and no row is drawn darker.** In a 224px column, 71% against 53% is
  40px of difference at the far right of a wide card, next to four other bars 100px apart — which
  is why four of five read as identical lengths. At full width the same figures are 200px apart,
  and the shape of the industry reads: one company far ahead, then a plateau. The leading row's
  darker fill said "first", which the numeral and the descending order already say twice.
- **The figure takes the comparison card's treatment exactly** — 20/24px Bold, `tracking-display`,
  `--ansr-accent`. It was 18/20px Bold in `--ansr-text`, which is the same quantity under the same
  small-caps label set two ways, and near-black at Bold is the heaviest ink on the surface: five of
  them read as shouting where five teal ones read as evidence. It also retires a type step nothing
  else on the surface used.
- **The overlap was the finding and is now only the marker, at ANSR's request.**
  `largestOverlapLine` stated it once and exactly — "4 of the 5 largest Retail GCCs in India are in
  your comparison set above." — which was something the peer block could not say: the set is not a
  sample from the middle of the industry, it is most of its top. What killed it is that the marker
  already says it row by row, and the sentence sat at full measure under a chart that had just spent
  five rows on the same overlap. So the per-row marker is now the whole statement, as quiet muted
  text rather than a pill; three pills down five one-line rows are more chrome than the rows
  themselves. Its wording went from "in your comparison set" to **"in your peer set"** in the same
  pass — the shorter phrase, and the one the rest of the product uses. The function is kept and
  unit-tested, so restoring the sentence is one line.
- **The universal Fortune sentence came off this block too, and the BADGE is what replaced it, at the
  project owner's instruction.** Removing the sentence and keeping `allFortune` left the one state
  where the fact is universal and nothing states it — a ranking of the industry's biggest centres
  silent on the accreditation every row carries. So the suppression is deleted here and the badge
  draws on every Fortune row. It is not a return to the shape this block was fixed for: what was
  rejected was an accent CHIP five times over plus a sixth line restating it, and both of those are
  gone. The comparison cards keep `showFortune`, because that block still has the sentence to fall
  back on — so the two blocks differ on the universal case, deliberately.
- **The name line is `items-center` and nothing on it carries `self-center`, and that is a measured
  fix.** Baseline-aligned, the mark's optical midline sat 2.27px BELOW the name's cap-height midline on
  every row at 1440 — the name read as sitting high against its own logo. The cause is that the mark is
  the TALLEST item on the line, so the line's cross size is the mark's own height and `self-center` on it
  was a no-op, while the name as the max-ascent baseline item was flush to the cross start, where its cap
  midline sits above its box midline. Centring the line takes the drift to 0.63px and the line's height
  does not change. The residual is the face's own ascent/descent asymmetry; the only way to close it is a
  hardcoded offset, so it stays. **Rejected: nesting the name and the marker in their own baseline
  group.** It buys that 0.63px back and costs a wrapper that wraps as one unit, so a long name cannot
  break away from its qualifier. The marker and the badge now centre on the name rather than share its
  baseline, and their cap midlines land within 0.7px of it — the relationship a shared baseline was
  buying is still visible.
- **A row needs 24px around it, not 16px, and that only became true when the pill line arrived.**
  With a two-line row, 16px out against 4px in was a 4:1 ratio and read as five rows. With the tags
  back, the bar sat 16px above the next company's name and 4px under its own pills — five rows of
  three lines each reading as one wall of fifteen. 24px between rows, 8px from the name to the
  figure-and-bar group, and 4px from the figure to its own bar, which is still the tightest gap in
  the row and is what says those two are one mark. The two deleted sentences paid for the height, so
  the block is shorter than it was and still matches the containment chart beside it at 1440.
- **Still an `<ol>`.** Here the order IS the quantity the bars encode, so list semantics are a claim
  the block can support — the opposite of the function tiles, which went from `<ol>` to `<ul>`
  because nothing measured their order.
- **`tone="tint"` survives the change.** The pale mint body was chosen so a second list of
  companies read as a different kind of block from the white comparison cards; a chart already is
  one, but the tint is also what a grey-100 bar track needs behind it to stay visible, and moving
  the panel to `plain` would leave `tint` with no consumer at all.
- **Rejected: pairing this chart with the containment chart on one row.** They are both
  industry-scale claims and the dashboard pass wanted them side by side, and now that neither is a
  card list they would not read as the same block. It would save another ~185px, and it needs the
  functions tiles at four columns on their own zone plus a tone reassignment — which is the card
  system, and the card system is a session of its own. Left as an open decision below.

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

## Visual questions still open on the answer state

Moved here from `handoff.md`, which had accumulated them as "open decisions" — they are visual
judgements, so this is where they belong and where the reasoning around them already lives. None is
blocked on ANSR; each is a call somebody has to make with a render in front of them.

- **Card shadows and radius `lg` on the public screens reverse the no-shadow rule the band system
  was built on.** Narrowed rather than settled by the specificity pass: the function tiles are gone
  and the panels are down from eleven to four, so what still carries `shadow-xs` and an 8px radius is
  the five comparison cards and the four chart panels. Either the entry point's sanctioned exception
  widens deliberately to cover them, or they go back to hairline and `md`.
- **The hero map is absent below 1024px**, which is most phone and tablet traffic. Entry point only,
  so no evidence is lost; what is lost is the one ornament that makes the ask band read as ANSR's.
- **The locations map's labels are about 12px at 390 and the three leading hubs cluster tightly
  there.** The in-place labels are set against Hanken's metrics, so re-read this once Moderat lands
  rather than tuning it twice.
- **Deferred from the earlier critique, not refused:** hover cross-highlighting between the
  locations map and its ranked list, and map filter controls. Both are interactions rather than
  omissions, and neither is blocked on anyone.
- **Zone 3's row is no longer lopsided, and the fix was not the one proposed here.** The plan was to
  pair the two charts on that row and give the function tiles a zone of their own. What happened
  instead is that the tiles stopped being tiles: eight hairline rows are about 240px against the
  bordered version's ~420px, so the row comes within reach of the containment chart without moving
  either block. The chart-pairing idea is still available and now has less to buy.

## The colour-role pass — orange stops being CTA-only

The answer state was monotone teal with one orange mark on it, the wordmark, and both the colour
and the type were departures from the brand board rather than from the palette. This pass reads the
board rather than the palette doc, and the finding is that **we had been enforcing a rule nobody
chose.**

### What the board actually does with orange, measured rather than eyeballed

Sampled from `Group 149.svg` at full resolution, glyph cores rather than antialiased edges. Values
are named by token because `brand_lint.py` reads any file for raw hex and two of the sampled values
are on its off-brand list.

| Board element | Ground | Ink it samples as | Size / weight |
| --- | --- | --- | --- |
| `Get Started` pill fill | hero gradient | `--ansr-orange` exactly | pill |
| `7` in "7 days to hire" | `--ansr-surface-deep` | `--ansr-orange` exactly | ~44px bold |
| `For Speed` / `For Flexibility` / `For Ownership` | white card | `--ansr-orange` exactly | ~13px bold caps |
| `2.2M+` / `20+` / `14M+` | white | a vermilion ~0.1 off the anchor | ~40px bold |
| `candidates ready` under each figure | white | same vermilion | ~14px bold |
| `Problem 1`…`Problem 4` eyebrow | mint | `--ansr-teal-300` exactly | ~12px regular |
| `Your plans are still nascent.` | mint | ~`--ansr-teal-bright` | ~26px semibold |
| `Your growth playbook is like…` | mint | `--ansr-teal` exactly | ~54px bold |
| `Come as you are.` | mint | black | ~54px bold |
| `ANSRx Ready` / `What powers ANSRx` | white | `--ansr-teal` exactly | ~26px / ~44px |
| `Tell us how we can help.` | dark | `--ansr-teal-bright` | ~44px |

Three things fall out of that table and each changed a decision:

1. **Orange carries display FIGURES and small categorical EYEBROWS, not only CTAs.** Four of the
   eleven rows are orange and only one of them is a control. The stat-figure orange samples a
   vermilion rather than the anchor, which is the board's colour management rather than a second
   orange — the same discrepancy `tokens.css` already records for the gradient peaks. So the
   **role** is the board's and the **value** is a token, exactly as the gradient geometry is.
2. **The board's large heading on mint is `--ansr-teal`, not the bright accent.** The premise this
   pass started from was that bright teal carries large headings on the mint ground. It does not —
   black or `--ansr-teal` does, and the bright accent only appears on mint at ~26px, where it
   measures **1.92:1**. The ban stands and the board is not an argument against it, because the
   board does not actually do the thing. Nothing was adopted here.
3. **The board's own quiet eyebrow is `--ansr-teal-300` on mint, at 1.82:1.** The device is right
   and the value is decoration-grade. Adopted as a device, in `--ansr-text-muted` (6.76:1 on mint,
   8.59:1 on white).

### The rule, restated: one orange ROLE per band, not one orange mark

`design-stack.md` said "once per band", which is the board's own rule and was being read as
once-per-*mark*. Read that way it is unsatisfiable on this surface: Screen 1 has no CTA, so orange
had no legal home at all and the whole answer state carried one orange element.

Restated, a band may carry **one orange role** and repeat it across the peers of that role. Four
snapshot figures are one decision, not four marks. What it still forbids is two orange roles in one
band — a figure and an eyebrow and a chip in the same zone is what the original rule was protecting
against, and that is intact.

Recorded as a brand ask; ANSR has not confirmed it.

### `--ansr-orange-700`, and why the ramp needed a dark end

The orange ramp was tints only, with a comment saying they exist "for motif falloff, not for
surfaces and not for text". That was the load-bearing constraint: **`--ansr-orange` cannot be text
on any light ground in this palette.** 3.35:1 on white, 3.29:1 on the pale ground, 2.63:1 on the
mint. A large figure clears the 3:1 large-text floor on white and nothing smaller clears 4.5:1
anywhere — so the brand's own eyebrow role was unreachable, and refusing it would have been the
palette refusing a documented brand behaviour.

`--ansr-orange-700` is the anchor a quarter of the way to black in Oklab, the exact mirror of 400
being a quarter of the way to white. A derivation rather than a picked value, and
`brand_asset.py ramp` reproduces it — checked, the script and the CSS agree.

| | Oklab L | hue | on white | on pale | on mint | on inverse |
| --- | --- | --- | --- | --- | --- | --- |
| `--ansr-orange` (500) | 0.666 | 36.3° | 3.35:1 | 3.29:1 | 2.63:1 | 4.77:1 |
| `--ansr-orange-700` | 0.498 | 36.3° | **6.53:1** | **6.42:1** | **5.14:1** | 2.44:1 |

Hue holds to a tenth of a degree, so it is the same colour darker rather than a new one. Aliased as
**`--ansr-accent-warm`**, which completes a set that is easier to hold whole than as three rules:

| Token | What it is | Where |
| --- | --- | --- |
| `--ansr-accent` | teal | ink on a light ground |
| `--ansr-accent-inverse` | bright teal | ink on a dark ground |
| `--ansr-accent-warm` | deep orange | ink on a light ground |
| `--ansr-action` | the brand orange | fills, and figures large enough for 3:1 |

**The two oranges invert against each other and that is the thing to remember.** Orange gets
*darker* as the type gets smaller; teal gets *brighter* as the ground gets darker. So the snapshot's
figures and the terminating strip's figures are both `--ansr-action` for opposite reasons — size
buys the floor on white (3.35:1, large text), the ground buys it on the inverse fill (4.77:1) — and
the eyebrow beside those white-ground figures is the deep step because 12px caps needs 4.5:1.

`--ansr-accent-warm` may never fill a control. It is an ink, and there is still exactly one filled
primary action per screen.

### Where the roles landed

- **Zone 1, the snapshot.** Four figures in `--ansr-action` at 30/38px bold, on each tile's own
  white fill and never on the mint zone behind it. The section's `h2` becomes the categorical
  eyebrow in `--ansr-accent-warm`. One role, one band — the eyebrow names the class the four
  figures belong to, so it is part of the same act rather than a second one.
- **Zone 6, the terminating strip.** Three figures in `--ansr-action` on the inverse fill. This is
  the board's "7 days to hire" shape, and it is what stops the page being warm for 200px and teal
  for the remaining 3,400. The icon discs stay `--ansr-accent-inverse`, which is the board's own
  pairing on its 3-up row: teal disc, orange figure.
- **Nowhere else.** The comparison cards' figures stay `--ansr-accent` and their ordinals stay
  muted grey; five orange figures there would be a second role in a second band, and the peers card
  already announces itself with the accent header strip.

### Type — the answer surface gets the display end of the scale

The display *face* was already on this surface. What was missing was the scale: every section
heading was 16/18px, the shared `h1` lockup was 20/24px, and the entry point's own `h1` is 80px — so
the result screen read as a different product from the form that produced it.

| Element | Was | Now | Weight / tracking |
| --- | --- | --- | --- |
| `HeaderFinding` | 24/30/38 | **30/38/48** | Light 300, `tracking-display`, `leading-display` at 48 |
| `ProductIdentity` (`h1`) | 20/24 | **24/30** | Medium 500, `tracking-body` — mark-bearing |
| `Panel` heading | 16/18 semibold | **20/24 bold** | `tracking-display` |
| `Panel` lead | 14 | **14/16** | unchanged |
| Comparison card `h3` | 16/18 | **18/20** | semibold |
| Comparison card figure | 24 | **24/30** | bold, `tracking-display` |

**The mark-bearing exception is unchanged and still applies to exactly the three headings that
contain a drawn wordmark** — the ask hero's `h1`, the impact band's, and `ProductIdentity`. Medium
500 and `tracking-body`, measured off the lockup's own stem at 0.137 of cap height. Every other
display heading is Bold with `tracking-display`.

The finding stays a step under nothing and a step over the lockup at every breakpoint (30 over 24,
38 over 30, 48 over 30), which preserves the reason the lockup was taken *down* in the first place:
the band has a subject and the product label is not it.

Page height 3517 → 3660 at 1440. The snapshot's first figure is still above the fold.

### The ordinals — the board's device, not a filled chip

Three numbered lists were named in the brief for this pass and only **one** of them was still a
filled chip. Recorded because the other two are already-solved and a future reader will otherwise
re-solve them:

- **Comparison cards 1–5** were a mint-filled square counter beside the company name. Now a quiet
  small-caps `Match N` eyebrow *above* the name, in `--ansr-text-muted` — the board's own
  `Problem 1` device. `aria-hidden`, as the badge was, because the `<li>` conveys position.
  **The relevance order survives**, which was the constraint: it is what the removed "Closest
  comparison" chip carried and what the removed table's row position carried before that, so the
  ordinal could not simply go. Only its volume changed. `.gcc-rank` is deleted rather than orphaned.
- **Largest centres 01–05** were already typographic, and were `--ansr-teal-300` on the card's pale
  fill at **2.27:1** — decoration-grade contrast on an element carrying information, so a reader
  could not find the third-largest centre. Now `--ansr-text-muted` at 8.43:1. It keeps its inline
  position beside the name, because on a ranking the ordinal is genuinely part of the subject.
- **Function tiles 1–8** carry no ordinal and have not since the numbering was removed with the
  ordering claim. Nothing to do; the `<ul>` is the assertion that guards it.

### Still open after this pass

- ~~The chart marks are `--ansr-teal-bright` on light tracks at 2.44:1.~~ **Closed by the
  card-system pass.** Four comparator rings, now `teal-500`. The ordinal ramp keeps `teal-400`
  for the measured reason recorded there.
- **Whether orange may carry the eyebrow AND the figures in one band**, which is what the restated
  rule permits and what the snapshot now does. It is the one part of this pass that goes beyond what
  the board demonstrates, since the board's eyebrows and its stat figures are in different bands.
- **The density map's eastern field is still partly empty.** The far-east label column that would
  have filled it was refused for drawing a hairline across the peninsula; see the soft-mark pass. A
  legitimate remaining option is to bring the frame's east edge in — but `MAP_FRAME` must keep the
  whole of India, and it is the same numbers as `INDIA_OUTLINE_FRAME` with a unit test asserting
  they agree, so it is a generator change rather than a styling one.
- **The ask hero's dotted world map has not had this pass** and is deliberately untouched. It is a
  different mark on a different ground; nothing here transfers to it unexamined.

## The card pass — the answer becomes one object

Requested by ANSR in three parts: put the whole peer view on one big floating card that runs to the
end of the page, make the view switch part of that card, and bring the entry point's dotted map onto
the band. Applied to both result screens, because the switch is one control and a visitor crosses it
in one state change — the two screens cannot disagree about where their own tabs are.

### What the card replaced

Two full-bleed stacks: the teal band, then a white content surface running edge to edge to the end of
the document. The zones inside it were right and are unchanged. What was missing is a level above
them: nothing said that all of this is ONE answer, produced by one act, distinct from the ansr.com
page the tool is framed inside. A frame edge is the cheapest way to say it and the only one that does
not cost a sentence.

The shape now: full-bleed teal band, then a card capped at `--ansr-container-content` with the
container's own gutters, pulled up onto the band's foot by 80/96px against the band's 112/128px of
bottom padding — the same two-numbers-in-two-places relationship as the entry point's form card over
its hero. Below the card, the page ground shows for one more band step, and the document ends.

**The page ground is the FLAT `--ansr-surface-inverse`, not the teal gradient.** The gradient is
fitted with its hot spot at 95% 85% of its own box; stretched over a 3,500px document the bright
quarter lands behind the card's foot, where nothing needs it, and the header goes flat. So the band
keeps the gradient at the size it was fitted for and the page carries the flat step. That leaves a
seam where the two meet — at the gradient's hot spot they are several steps apart, visible across the
gutters the card does not cover — and `.gcc-result-band::after` fades the band's last 96px into the
page ground to close it. The fade can only ever darken a ground whose ink is white, so it needs no
measurement of its own.

### The glass version, and why it went

The first pass built the card as a glass frame: an 8px translucent white rim with `backdrop-filter:
blur(14px) saturate(1.06)` behind it and the content opaque inside. It was rejected on sight, and the
reasons are worth keeping because the same shape will be proposed again.

- **It reads as a default, not a decision.** A blurred translucent panel is the most over-used
  surface treatment of the last five years; on a tool whose entire argument is that its figures are
  serious, the container arriving in the current house style of consumer software is working against
  the content.
- **The backdrop had nothing worth blurring.** Behind the card is a flat ground and a smooth fitted
  gradient. Blurring a smooth field is a no-op — the only thing the filter had to work with was the
  band's two ornaments, which the card's top 40px overlaps. All the treatment actually contributed
  was a milky edge, which is the part that looked cheap.
- **The alternative was worse.** Making the effect legible would have meant translucent ZONE grounds,
  and every figure on both screens sits on one of three light grounds whose ratios are recorded in
  `design-stack.md`. A 6% mix of dark teal into them takes a 4.6:1 muted line under AA. Measured, not
  guessed: `--ansr-text-muted` on `--ansr-surface` is 8.59:1, and the same ink over a 94% surface on
  this ground is ~8.0 — fine there, and the cell that fails is the caption on the mint zone.

### What holds the card off the ground instead

Three devices, none of them an effect, each doing one job:

1. **A hairline ring at 9% white, drawn as the FIRST `box-shadow` layer** rather than as a border. A
   real border on a rounded box whose child fills it is clipped by the same `overflow: hidden` that
   clips the tab bar's corners; a shadow layer sits outside the fill and cannot be. At 9% it is a
   line the eye resolves at any distance and never a grey frame.
2. **Two shadow layers at very different spreads** — `0 32px 64px` at 38% black to separate the card
   from the ground, `0 6px 16px` at 26% to seat it. **The `--ansr-shadow-*` tokens cannot carry
   this**: they are fitted for a light surface at 8–14% of `--ansr-teal-deep`, and on a ground that
   IS teal-deep a 14% teal-deep shadow is invisible. The values are composed in `.gcc-result-card`,
   still out of tokens, with the reason written beside them.
3. **`--ansr-radius-xl` (12px), one step above every panel inside it**, so the card is unambiguously
   the container and the evidence cards unambiguously contents. It is the top of the scale; the brand
   is hard-edged and the panels are on `md`.

### The switch — three shapes, and why this one has no bends

- **A full-width strip at the header band's foot**, selected half white and continuous with a
  full-bleed white page. Right for that page; orphaned the moment the content moved into a card,
  because a strip spanning the frame is wider than the thing it selects and its white cell no longer
  met anything.
- **A content-sized notch sticking up out of the card's top edge.** This is where the bends ANSR
  objected to came from, and they were not a tuning problem: a rounded tab abutting a rounded card is
  two curves that have to agree, plus a step where the notch ends and the card carries on, plus a
  1px joint held closed by a negative margin.
- **The card's own top row**, full width, two equal halves. There is nothing to align because there
  is nothing attached: the corners are the card's radius under the card's `overflow: hidden`, and the
  joint under the selected cell is the absence of anything rather than two edges lined up.

Three properties make it read as one surface rather than as a bar on top of one, and all three are
asserted in `0-screen1.spec.ts` and `0-screen2.spec.ts`:

- **The selected cell is filled with the ground of the content beneath it** — the mint zone on Screen
  1, white on Screen 2 — which is why `ViewTabs` takes a `ground` prop. Hard-coding white was tried
  and put a white cell above a mint zone, which is a visible edge across the one joint the shape
  exists to remove.
- **The bar's own ground is `--ansr-teal-200`, DARKER than either content ground.** The first version
  used the near-white `--ansr-surface-pale`, which left the unselected half brighter than the
  selected one on Screen 1 — the row arguing with its own indicator. Every ink is measured against
  it: `--ansr-text-muted` 5.2:1, the heading teal 5.94:1, black 12.73:1, and `--ansr-action` 2.03:1,
  which is why orange is the 3px rule there and never text.
- **The orange rule is on the selected cell's TOP edge**, with a transparent 3px track reserved on
  both cells so the label does not shift when selection moves. On the bottom edge it would draw a
  line across the joint.

No divider between the cells: exactly one is always selected, so their fills always differ, and a
rule between two different fills is a line drawn for its own sake. Hover on the unselected cell
DARKENS by 6% rather than lightening — selection is the lightest state in the row, and a switch that
lightens on hover invites the pointer to read hover as selected.

The icons are dropped below `sm`. That is a fit rather than a taste: both glyphs plus their gaps put
the pair at 283px inside a 272px content box at 320, which is a horizontal scrollbar on a document
the iframe does not own the scroll of. Without them both labels also come back onto one line each at
390.

### Zone padding, which the card moved

A zone is now inset three times over — the container's gutter, the card, then its own padding — so
`md:px-12` inside the card left the snapshot's leading city name overflowing its cell by 3px and
truncating to "Bengalu…". Measured with `scrollWidth` against `clientWidth` rather than judged: 166
available against 169 needed. Both content surfaces are on `md:px-8` now, and the figure cells are
what set it, being the narrowest thing on either screen and the first to fail.

### The band's map

ANSR asked for the entry point's dotted map on the result band, fading smoothly into the card. It is
the same component and the same two child classes — `.gcc-hero-map__world` and
`.gcc-hero-map__india` carry the inks, the dot radius and the entrance — so this is one graphic used
twice rather than a second copy of one, and the inks cannot diverge. `.gcc-header-map` is the
placement, and every difference from the hero's answers something about this band:

- **NO BLUR, and the blur is the thing this placement stopped doing.** It carried `blur(1.6px)`
  against a ~2.2px dot at a ~6px pitch for a pass, on the argument that the entry point's map IS its
  band's subject — two text elements, no control — while here the band already carries a finding, four
  answers and the way into the card, so a second crisp graphic would compete with all three. Rendered,
  a softened dot at half opacity does not read as atmosphere; it reads as a low-resolution copy of the
  entry point's own map, which is the one thing a shared component exists to prevent, and ANSR asked
  for it off. What holds the graphic back was never the filter — it is the opacity, the vignette and
  the four mask ramps below, all unchanged. **If it ever needs to be quieter, lower the opacity.** A
  filter over a dot field costs apparent quality at every step and buys nothing the mask does not.
- **Opacity 0.5 against the hero's 0.86.** 0.42 was tried first and put the field so far back that
  India stopped resolving as a shape at all, which is a graphic paying its layout cost and returning
  nothing.
- **A long fade at the foot — five stops over more than half the box.** It has to reach nothing
  before the card's top edge with no boundary anywhere. A short ramp over a dot field shows itself as
  a band of thinning dots, which is the artefact this is sized to avoid.
- **74% wide at -6%, and a shallower vignette** than the hero's, whose deep spotlight would make this
  map a subject again.

**The two ornaments are swapped at `lg`, never layered.** Above it the map has the band; below it the
screen's own motif does, because the finding runs most of the band's width there and the dots cannot
resolve in the narrower frame. One ornament at every width, two at none — which is what the pair did
when both were on the trailing edge at the same time.

### Still open after this pass

- **The lockup's registered mark reads as a dot at 24px.** It is part of `ansr-logo-on-dark.svg` and
  therefore part of the literal-use exception, but it is visually close to the typed period that was
  just removed. A version of the file without the ® would settle it, and that is an asset request.

## The specificity pass — the peer view stops looking generated

The complaint that opened this pass was "the peer page looks very ai", and an `/impeccable critique`
run scored it 18/32 with a verdict worth keeping verbatim: **every decision specific to this product
lived in sentences and in data discipline, and every decision that determined the page's shape was
category-generic.** The honesty machinery — exact denominators, "Data unavailable" instead of a dash,
no invented logos — is the strongest thing the screen has and none of it is visible in a screenshot.
What was visible was eleven bordered cards, four icon-chip stat tiles, eight boxes holding eight
words, and six headings five of which ended on the same prepositional phrase.

Four things carried the generated look, and they are ordered here by how much each contributed.

### 1. A border has to be earned — the `Block` primitive

Every section was a `Panel`, so the surface was eleven bordered objects on a page whose zones were
already doing the sectioning. The four `PanelTone` values were supposed to say which kind of claim a
card was making and could not: `plain` covered three unrelated kinds of evidence, and `tint` differs
from `plain` by about 4% lightness. Two of the four tones were doing one tone's work.

`Block` in `primitives.tsx` is the un-carded sibling of `Panel` — same landmark contract, no
container — and the rule is now structural rather than tonal:

- **A block that draws a MARK keeps its `Panel`.** A chart or a map needs a frame, because the marks
  are measured against the card's own edges and a bar's full width means nothing without one. The
  containment chart, the ranked centres, the density map. The terminating scale strip keeps its card
  too, on a different ground: its fill IS its meaning.
- **A block that is a grid of its own cards takes a `Block`.** Five floating company cards inside a
  sixth bordered box is a card inside a card, which the craft floor treats as always wrong, and the
  outer edge added nothing the cards did not already have.
- **A block that is text takes a `Block`.** The function list claims no share and no order; a
  container around it asserts it is an object with properties.

Bordered panels went from seven to four and `gcc-lift` from eleven to zero — **a 2px rise and a
deeper shadow on hover is an affordance, and none of those eleven objects was pressable.** Teaching a
reader that a lift means nothing is worse than not having one, because the two controls that are
pressable then have no gesture of their own.

**What replaced the accent gradient strip is size, not colour.** The comparison block was the one
card that announced itself in colour; it now takes `weight="lead"`, a heading one step above every
other section's. That is the honest version of the hierarchy the tones were faking, because this
block genuinely does outrank the five under it.

### 2. The snapshot stops being the template

Four tiles, each a pale disc holding a line icon, a figure beside it, a hairline, a label and a note.
It is the stats block every generated dashboard ships with, structurally unmodified — and it was the
first 200px inside the card, so it set the register for everything below it. The two shapes before it
are worth recording: one bordered container divided by 1px grid-gap rules, which was right on a white
page and read as a table the moment it sat on a tint; then the four tiles.

What is there now is the board's own device — **the figure, a rule under it, then the label**, which
`Stat` in `primitives.tsx` had implemented all along. Removing four discs removed the component's
entire resemblance to the library it resembled, and removing four containers removed four borders and
four shadows.

**The fourth cell was the worst element on the page and it is now a different kind of thing.** A city
name was set in the figure treatment — 36px bold, the action orange, `tabular-nums` on letters,
`tracking-display` fitted to digits — which made a place name the loudest element on a 3,500px
document and, worse, the visible seam of a filled template: a reader can see that a slot built for a
number received a string. `SignalKind` is now part of the data, so a cell states whether it holds a
magnitude or an answer and the component draws it accordingly. A `place` takes the ink and the size
of a name.

**The value row is a FIXED height, not a minimum.** With `min-h` the box grew to whichever was taller
— 48px for a figure, 44px for a name — so the fourth rule sat 4px above its three neighbours,
measured. That is the "four hairlines that agree with nothing" defect in miniature, reintroduced by
the fix for it.

### 3. The figures stop repeating

`189` appeared four times in three framings: the snapshot's first cell, the industry card's lead, the
containment chart's middle layer, and the denominator of the peer count line. `5` appeared four
times. A reader who meets one number in four wordings has to satisfy themselves the four agree before
trusting any of them, which is the exact cost a snapshot exists to remove.

One home per figure. The count stays in the chart, which is the only place it has a denominator. The
snapshot's cell became the industry's **share** of the national base — the one quantity the chart
draws and never states, so the strip now adds a figure rather than repeating one. `industrySentence`
states no quantity outside its exhaustive branch, and **"other" went with the figure**: "189 other
BFSI companies" invites "other than which?" and nothing on the page answers it.

**A thin industry reads `<1%`, never `0%`.** Two companies against 1,834 rounds to nought, and a
nought in the opening cell says the industry is not in India at all — to the exact visitors the
shortfall copy is written to reassure.

### 4. The heading cadence

Read consecutively, the six section headings were: "The closest comparable companies **in India**" /
"How much of your industry **is in India**" / "The largest BFSI centres **in India**" / "Functions
most GCCs run **from India**" / "India's leading GCC locations for BFSI" / "Leading global companies
have established GCCs **in India**". Six headings, five ending on the same phrase, all the same length
and the same declarative construction. Each was defensible alone and `copy.ts` argues each one
individually; together they were one sentence six times. **This is what a rule produces when it has
no companion rule about variety** — and it is the single most recognisable signature of generated
copy on the whole surface.

Four changed, and two deliberately did not. `largestTitle` keeps "in India" because it is now the only
heading that does; `FUNCTIONS_TITLE` keeps its wording because `project.md` pins it as the thing
carrying the block's generality claim after two caveat paragraphs were removed.

**One near-miss worth recording.** The map heading was first rewritten to "Where {industry} centres
cluster", which put it directly above `mapHeading`'s own plain branch, "Where {industry} has built in
India" — two consecutive lines opening on the same word. The same defect, one card down. It is
"Which cities {industry} has chosen" instead.

### The zones lose their third value

The sequence was mint, white, near-white, white, mint, white. `--ansr-surface-pale` and
`--ansr-surface` are about 2% apart in lightness, so the near-white touching white is not a boundary
at all — the sequence had two of those, and nothing looked wrong: two of the five boundaries simply
were not there.

The near-white may therefore only ever neighbour the mint. Once the opening zone also has to be a
light ground — the snapshot's orange figures are 3.35:1 on white, 3.29:1 on the near-white and
**2.63:1 on the mint, which is unusable at any size** — no arrangement keeps every boundary visible.
**Strict alternation is what is left**: white, mint, white, mint, white, mint, and five visible
boundaries instead of three. `pale` stays available on `Zone` and on `ViewTabs` for a surface that
wants it beside a mint zone; nothing on this screen does.

Two consequences. The comparison cards now sit on mint rather than white, which is the strongest
ground a white card can have and the right one for the primary evidence. And the terminating dark card
floats on mint rather than white — it is the one zone whose own value the card does not depend on.

### The peer grid at 768

Three artefacts, one width, and the table this replaced had none of them.

- **An empty half-cell.** Five cards in two columns is 2/2/1, and the row packing only engaged on the
  twelve-column grid at `lg` — so the artefact `rowPlan` exists to prevent was present at the width
  most likely to show it. The odd last card now widens to fill the row, which is the only move the
  packing rule permits: never narrow, never reorder.
- **And its interior widens with it.** A full-width card holding a third-width card's stacked interior
  left 340px of its trailing half empty, which is the same artefact one level down. `smWide` is a
  separate flag from `wide` because the two are true at different widths: card five of five is full
  width at `sm` and half width at `lg`.
- **Holes in the middle of cards.** `mt-auto` pinned the footer to the card's bottom edge, which kept
  the rule aligned across a row only while every card's content was the same height. It never is: a
  neighbour that grew a wrapped name or a fifth city chip made the row taller and the slack opened as
  40–45px of dead white between the shorter cards' figure and their rule.

**Dropping `mt-auto` and the rule together is what fixes both.** Without `mt-auto` the slack moves to
the card's bottom, where it reads as padding rather than as a gap — and that exposes the rule, which
then sits at a different height in every card of the row, three of them 27px apart at 1440. So the
rule goes too: with space alone separating figure from footer there is nothing left to misalign. The
wide variant keeps its divider because a **vertical** rule has nothing to line up with in the card
beside it. The Fortune chip moved to the name block for the same class of reason: on the footer's last
line, its presence in a mixed set changed one card's footer height and nothing else's.

### The map's leaders, and the fix that was refused

Three of eight leaders drew a long horizontal line across the landmass — Hyderabad's ran east across
the peninsula and out over the Bay. On a map whose borders are the whole point, a straight line over
land is read as a border, which this file already calls the one mark the graphic must not draw.

**The obvious fix is the one this file rejected before and it is refused again:** routing the leader
vertically then horizontally is a purely axis-aligned elbow, and an orthogonal leader reads as a
graticule rule — the map dropped its graticule for precisely that reason.

The mechanism was that `rise` was a constant. A label needing no de-collision sat about one
line-height above its dot, so the diagonal leg covered a dozen units and a horizontal leg covered
everything else. Two changes, and both are about territory rather than arithmetic:

- **The bend is pinned to the COASTLINE** at the label's own settled latitude, read from the same
  `coastAt` call that places the pointer. Everything over land is the single diagonal; everything from
  the coast to the pointer is a short leg in open water, where a horizontal line cannot be mistaken
  for anything.
- **`rise` grows with the land the leader has to cross** — `baseRise + landRun * 0.45`. That gives
  every leader roughly the same ANGLE over land instead of the same vertical offset: about 24° from
  horizontal, unmistakably a diagonal. Not steeper, because at 45° the two inland northern cities need
  more vertical room than the frame has above them and the overflow correction drags the column down
  past its own dots.

**What was NOT fixed, deliberately: the halo clusters.** Mumbai with Pune, and Bengaluru with Chennai,
still merge into one mass. The critique's proposed fix — cap a mark's halo at the distance to its
nearest neighbour — cannot be taken, because **the halo's outer radius IS the encoding**: area tracks
the company count, so capping it makes the mark say something the data does not. Steepening the
gradient's falloff was the other candidate and it fights a value already tuned once in the opposite
direction, from 30% to 45%, for legibility. The position is that the cores stay separable, every
figure is in the ranked list beside the map, and the marks are `aria-hidden` because they are a second
reading. It is on the open list rather than solved.

### The containment marker's label, and a CSS trap worth remembering

For a `marker` layer, `--gcc-extent` is the PARENT population's share — the room the mark may not draw
past — while the mark itself is a fixed 8px step. Feeding that extent to the label put the figure at
the parent's trailing edge, about 90px from the tick it belongs to, with pale fill between them: a
figure attached to nothing, on the one element ANSR is being asked to accept as a departure from their
three-bar request.

**The trap: the first fix rendered worse than the bug and looked like it had never been written.**
`.gcc-containment__label--marker` sets `inset-inline-start: min(var(--ansr-space-2), var(--gcc-extent))`
— but `--gcc-extent` was only ever set on the BAR element, and the label is its SIBLING, not its
descendant, so it inherits nothing the bar declares. The custom property was undefined, the declaration
was invalid at computed-value time, `inset-inline-start` fell back to `auto`, and the label shrink-
wrapped against the chart's trailing edge. Silent. The property is now set on both, and the width
expression is duplicated between the two rules on purpose: if one changes, change both.

### Measured contrast failures the critique surfaced

- **`BarTrack`'s default fill was `--ansr-teal-400`**, which is `--ansr-teal-bright` — the token
  `design-stack.md` states outright is not available inside a chart on a light ground. It measures
  2.44:1 on white and **2.15:1 against this track's own `--ansr-grey-100`**, under the 3:1 floor 1.4.11
  asks of a non-text graphic, on the default fill of every bar on both public screens. `teal-500` is
  4.51:1 against the same track and still a clear step lighter than the emphasis branch, so the ramp's
  ordinal relationship is unchanged. The two other `teal-400` fills in `charts.tsx` went with it.
- **The city list's leading row carried `emphasis`**, drawing the first bar in the accent and every
  other in a lighter step — so colour encoded RANK while length encoded quantity, and the second city
  at 64% of the peak carried the same fill as the eighth at 4%. On a ramp whose whole contract is
  "darker means more", that is the one thing a fill may not do. The prop stays for a legitimate use —
  the visitor's own position in a set, which is categorical — and nothing on Screen 1 has one.
- **Two focusable targets were under 44px**: "Edit answers" at 136.5 × 38 and `PanelAction` at
  126.5 × 36. Four things on the whole screen are focusable; there was no reason for two of them to be
  the tight ones.

### The motif that read as a pasted swatch

`.gcc-panel-arc-top` rendered as a hard-edged rectangular patch of ribbing with visible straight
boundaries, directly above the surface's best block. **A mask applies to the element's own box and the
transform rotates the masked result** — so a gradient written `to bottom left`, correct for the
unrotated bottom placement, arrived visually reversed under `rotate(180deg)`: dense against the card's
interior, transparent off the card's outer corner. Written `to top right` and rotated with the element,
the density lands in the corner the content never reaches.

### Smaller corrections in the same pass

- **`tabular-nums` where nothing aligns.** It was on a city name, on "Established 2002", and on both
  count sentences. The feature aligns digits into columns; where there is no column it only widens the
  figures. What keeps it is a real column: the containment chart's stacked figures and the ranked rows'
  trailing figures.
- **The disclosure arrow became a chevron.** `→` is the glyph for going somewhere and the control goes
  nowhere — it expands a region in place, on a tool that does not own the URL bar. The collapsed and
  expanded states are now one glyph rotated, where before an arrow became a dash that read as "minus".
- **The live region stopped restating the finding.** It opened with `framing().title`, which is
  rendered on the band; the count is rendered under the grid; and the tab panel announces itself on
  focus. The finding was the third thing said about one state change. `#header-finding` now carries an
  id so a spec asserts it where it renders — two specs had been checking it in the one place it is
  deliberately no longer said.
- **The function list has no leading mark.** A short teal rule was tried and is redundant twice over:
  the row's own hairline delimits the item, and at 12×1px in front of 16px text it reads as an em dash.

### Still open after this pass

- **The density map's city labels compute to 12.339px**, off the type scale at every width, because the
  size is a fraction of the SVG's viewBox width. That proportionality is correct for the marks and
  wrong for text a person reads, but the label layout estimates its own text widths in viewBox units —
  so a fixed CSS size would need `layOutLabels` reworked, and this pass had just changed its geometry.
  Left as measured rather than half-fixed. Re-read it when Moderat lands, with the 390 clustering.
- **The halo clusters**, above. Needs ANSR's eye on whether the mark form can change at all, since one
  mark form was their instruction.
- **Two zones carry a white card on a white ground** — the containment chart and the map — which the
  strict alternation forced. A hairline and a shadow are all that separate them from the zone. It is the
  cost of making every boundary visible, and the cheaper of the two.
- **The scale strip still has icon discs**, which is the device the snapshot just lost. Three marks on a
  dark terminating card is a different case from four on the page's opening strip, and the board's own
  dark-ground stat uses them — but if the discs go anywhere else, they should go here too.

## The one-row pass — the comparison set stops leaving holes

Six client instructions, taken in one pass, all on the peer view. The through-line is that
the previous pass fixed what each block SAID and this one fixes what the page's shape and
its vocabulary say.

### Five cards, one row, and the whole packing layer goes with it

The set was three cards then two, which is where the empty space came from: five cards on a
twelve-column grid cannot divide evenly, so the second row held half-width cards carrying a
third-width card's content. Everything built to manage that — `rowPlan`, `layoutFor`,
per-card spans, a `wide` flag, an `smWide` flag, a two-column card interior for widened
cards, a vertical divider only the wide variant drew — existed for a grid that no longer
exists. **One column per peer at `lg` deleted all of it.**

The column count is the PEER COUNT capped at five, never a fixed `grid-cols-5`: a
two-company industry would otherwise leave three empty cells, and thin industries are
exactly where that shows. Two columns between `sm` and `lg`, one below, with the odd last
card still widening to fill its row.

**The card interior had to come down with the width.** Five cards at 1440 are about 205px
each, and the headcount range at 30px overflowed its own cell — it is 20/24px now, still
the largest thing on the card and still a clear step over the company name at 16/18.

**The `Match N` eyebrow is gone, and the row is what paid for it.** Three devices have
carried relevance order on this block: a "Closest comparison" chip, a mint-filled square
counter, then a small-caps eyebrow. All three existed because the order is never re-sorted
and a multi-row grid has no row position to carry it. On one line, left-to-right reading
position states it for free — the same thing a table's first row did. So the ordinal is not
a claim given up; it is a claim the layout now makes. What went with it is a line of grey
small caps above every one of five company names, which was the first thing the eye met on
each card and said nothing a reader wanted.

**The year is deliberately NOT pinned to the card's foot, and it was tried both ways in one
sitting.** `mt-auto` gives all five years one baseline, which looks deliberate — and buys it
by opening the slack above itself, so a card with two city chips beside one with six showed
60px of dead white between its chips and its year. A gap in the middle of a card reads as a
card that failed to load; the same gap at the card's bottom edge reads as padding. That is
the same trade the horizontal rule lost, one element down.

### The vocabulary — one page was naming one thing three ways

The section said "companies", the card labels said "India employees" and "India locations",
the snapshot said "centre", and the heading said none of them. So a reader met five company
names and a headcount and had to infer that the subject is the CENTRE rather than the
company — an inference that is not safe on a card about JPMorgan Chase, where "Established
1799" is what the old label half-promised.

Every one of them now names the GCC: the heading, both `peerLead` branches, all four
branches of the count line, the three card labels, and the snapshot's four cells. **None of
it is a new sentence** — each is the same claim with its subject named, and the heading got
shorter doing it.

Two of the changes are accuracy rather than clarity. **"GCC since 2002" replaces
"Established 2002"**, because the year is the centre's and the old label read as the
company's. And **"then by revenue band" replaces "then by size"** in the sub-industry lead:
the score's second term is band proximity, while "size" reads just as easily as the centre
headcount every card carries as its own figure — which is not a key at all, so a reader
comparing two adjacent figures would have found the claim broken.

### The snapshot's city — coloured, and no longer clipped

Two defects in the cell the previous pass had just rebuilt.

**Black was wrong in the render rather than on paper.** Three cells carried a coloured
figure and the fourth carried near-black text, so the strip read as three cells that had
loaded and one that had not. The cell has to be as PRESENT as its neighbours; what it must
not be is the same KIND of thing. `--ansr-accent-teal` at 9.81:1 on white does both — it is
the one cell whose value is an answer rather than a quantity, and orange on this surface is
reserved for figures.

**The descenders were being clipped, by two things at once.** `leading-none` sets the line
box to the em square, which cuts the tail off the g in "Bengaluru"; and `truncate` puts
`overflow: hidden` on the same box `items-end` is aligning, so the clip landed on the glyph
rather than on the line. `leading-tight` on the outer box, which keeps the fixed height that
aligns the four rules, and the ellipsis moved to an inner span.

### The information order — the reader's own question sequence

The flow was: five named companies → a scope statement about functions → where those five
sit in their industry. So a reader who had just met the comparison set was handed a list of
eight functions before being told what the set represents.

**The ranking moved up beside the containment chart, directly under the comparison set.**
Three fifths and two fifths, and the split follows which block answers which question: the
ranking is what a reader compares the five names against, so it has to be adjacent to them;
the containment chart answers the next question — how much of the industry any of this is —
and is the narrower chart, three labelled layers against five rows of name-and-figure.

**Functions moved below both and gained the full width, which is what made it compact.** At
two fifths it could only tile two to a column: eight items were four rows and about 240px for
the least information on the page. At full width the same eight are four columns and two
rows. Four columns was previously refused as too narrow for "Business operations and shared
services" — that was measured at two fifths, where a column is about 170px; at full width it
is about 270px and the string sets on two lines. Three columns is still refused, because 8
does not divide by 3.

**Its rules were invisible and that is a measurement, not a preference.** They were
`border-border-tint`, which IS `--ansr-teal-200`, on the mint zone — 1.30:1 against their own
ground, the exact defect the divided snapshot container failed on. `teal-300` is 1.82:1, a
visible hairline; `teal-500` at 4.04:1 draws eight lines that read as structure rather than
as separation.

### The view switch — the orange rule was the tell

**A 3px accent bar along a selected tab is the single most reproduced indicator in the
framework-template idiom**, and it sat on the first row of the page's main object, so a
reader met it before any evidence. It was also the only orange on the surface not doing the
job the brand board gives orange — figures and categorical eyebrows — so it spent the accent
on chrome.

What carries selection instead is the JOINT, which is the one signal a template cannot copy:
the selected cell is filled with the ground of the content beneath it and has no bottom edge,
so the cell and the surface are physically one shape. **The unselected cell gets what the
selected one gives up — a bottom edge.** That is the inversion the previous version was
missing: both halves sat flush on the bar, so the unselected one read as a raised mint
rectangle in the card's top corner rather than as a cell behind it.

**A darker fill for the unselected cell was tried first and measured out.**
`--ansr-teal-300` is 1.37:1 against the bar's `--ansr-teal-200` — not a visible step — and
its own ink then failed: `--ansr-text-muted` measures 3.71:1 on it against 5.20:1 on the bar,
so a darker cell would have bought a fill nobody could see by giving up an AA-passing label.
The edge is `--ansr-teal-500` at 3.12:1 against the bar, over the 3:1 a boundary needs, where
`--ansr-teal-400` is 1.48:1 and would have drawn a line that is not there.

Selection is now carried four ways over `aria-selected`, and three of the four are properties
of the joint rather than colour: fill continuity with the content, the absence of a bottom
edge, the ink moving from muted to the heading teal, and the weight.

### Still open after this pass

- **Zone 3's row is unbalanced the other way now.** The ranking card runs about 480px and
  the containment card about 350, so there is roughly 130px of zone whitespace under the
  narrower one. `items-start` is deliberate — stretching would pad the chart instead — so
  this is space between blocks rather than a hole in a card, and it is the cheaper of the two.
- **The scale strip's icon discs** and **the density map's 12.339px labels** are unchanged
  from the previous pass's open list.

### Focus never scrolls, and the tool states the position instead

**`focus()` scrolls its target into view, and letting it do so was wrong on BOTH phase transitions,
in opposite directions.** One symptom was reported as a jumpy toggle and the other as a page that
loads already scrolled; they are the same line of code.

**Between the two result views it moved the page when nothing had moved.** Both phases mount under
one identical header band and one identical card top edge, so the switch changes only what is inside
the card — and scrolling to the top of it dragged a visitor who had chosen to read three sections
down back to a band that had not changed. The card is deliberately not sticky, so nothing on screen
explained the jump.

**Entering the result was worse, and moving the focus target is what introduced it silently.** The
target on a result screen is the TAB PANEL rather than the `h1`, because the `h1` is now the product
lockup and is identical on both views, so focusing it would announce nothing about the change. But
the panel begins BELOW the tab bar — 323px into the document at 1440, measured — so submitting the
form landed the visitor inside the card's first section with the whole teal band, the finding, their
four answers and the view switch itself scrolled off above them, having to scroll UP to find the
header of a screen they had just asked for. Focusing the `h1` used to mask it.

So `preventScroll` on every transition, and the position written explicitly: the visitor's own offset
between the two result views, and document top for anything involving the ask — which IS the top of
the new surface in both directions, since the result screen opens on the teal band and the ask on the
hero. Keeping the focus MOVE is not optional either way: no navigation happens between phases, so it
is the only thing telling a screen reader the screen changed, and the panel is named by its own tab so
it still announces "Peer landscape, tab panel" wherever the page is standing.

Two things measured rather than assumed. `preventScroll` alone did NOT hold the offset across a
toggle: the two views are 2,907px and 1,654px at 1440, and replacing a tall document with a short one
in one commit puts the browser's own scroll restoration in charge, which drops to 0. And `scrollTo`
clamps to the new document, so a position past the shorter view's end lands at its end — which in the
ordinary flow never fires, the tab bar being the card's top row and not sticky, so a visitor has to
have it on screen to press it. Every write is inert in the embed, where a frame sized to its own
content has no scroll of its own — as was the `focus()` scroll it replaces, so the framed case did not
change.

## The strip-back pass — every section loses its lead

A client list, taken in one pass on top of the one-row pass. The through-line is **removal**: six
section leads, four snapshot notes, five rank numerals, and one accent rule. What is worth recording
is which removals were free and which cost something, because three of them cost a real claim.

### The six leads

Nothing on the peer view renders a `lead` any more. The prop still exists on both `Panel` and `Block`,
every sentence is still exported from `copy.ts` and still unit-tested, and every browser spec now
asserts the ABSENCE — so restoring any one is a prop, and no half of it comes back by accident.

**Three were redundant.** `industrySentence`'s ordinary branch described the three layers the
containment chart's own labels name. `FUNCTIONS_LEAD`'s "whatever the industry" is carried by the
heading, which is a claim about GCCs in general rather than about the five companies above.
`mapHeading`'s derived finding is stated by the ranked city list beside the map.

**Three cost something, and they are on the blocked list rather than settled.** `LARGEST_LEAD` was the
sentence stopping a reader taking "largest" for largest by revenue — on a page that holds revenue
BANDS and can never rank by them, that is the sharpest edge in the pass; what remains is the evidence
rather than the statement, since the heading says "centres" and every row shows the range its bar
encodes. `industrySentence`'s exhaustive branch told a reader of a six-company industry that the set
above IS the industry rather than a selection, so an exhausted industry now looks like any other.
`peerLead` was the block's only statement of method.

### The snapshot's notes, and why that removal was safe

Four cells each carried a 12px grey line under the label — "Of 1,834 GCCs in India", "Employees per
GCC", "Hubs and emerging locations", "More {industry} GCCs than any other city". That is two type
sizes and three vertical gaps per cell for one number, which is what made the strip read as loosely
packed rather than as four figures.

It is safe because **the labels name their own subject** — that was the notes' whole job: a bare
figure beside a short label leaves a reader unable to tell whether they are looking at companies,
centres or people, and this page carries all three. The one real loss is the leading city's cell,
where the note said why that city leads; the map card states it with a share.

**The labels no longer interpolate the industry, and the section heading does instead.** Three of the
four did — "Share of India's GCCs in {industry}", "Typical GCC size in {industry}" — which put one
label at 34 characters against another at 24 under four figures that align to the pixel, and said the
same word three times inside 900px. The heading is `{industry} in India`; the labels are three or four
words each. A subject shared by every cell belongs in the section's name.

**The hairline between figure and label went with them.** It is ansr.com's own stat device and it
works inside a container, where it gives a lone figure an edge to sit on. On four bare cells it drew
four rules across the row's full width — the header of a table whose body never arrives — and forced
12px of clearance either side, so each cell spent 27px separating two things that are one unit. The
label sits directly under the figure at `gap-2`, a step lighter and a step back in ink, since it is no
longer holding its own against a drawn edge.

**The fixed-height figure box survives the rule that motivated it**, for a better reason than aligning
edges: a place name is 30px where a figure is 48px, so without it the fourth label would sit 18px
above its three neighbours.

### The unit, two scale steps down

`%` at the figure's own size is about a third of the cell's optical weight carrying none of its
information, and it turns the strip's opening cell from a figure into a data field. It is a `suffix`
field on `Signal` rather than a regex over `value` — `<1%` has a symbol at each end, so a component
splitting its own data would eventually take the wrong one — and it is set at **20 against the
figure's 38, 24 against its 48**, both real scale steps. `0.55em` was the first attempt and renders
26.4px and 20.9px: near enough optically, and it puts two sizes on the surface that nothing else uses.
`items-baseline` on an inner box, because the outer box is a fixed height bottom-aligning the cell
while the unit has to align to the numeral's baseline.

### The city, in orange

Third ink in three passes, and the sequence is worth keeping. **Black** read as a cell that had not
loaded, beside three that carried a coloured figure. **Teal** fixed that and kept the cell a different
KIND of thing from its neighbours, which was the argument for it — orange being reserved for figures
on this surface. ANSR asked for orange, so the distinction is now carried by size and weight alone.

**`--ansr-accent-warm`, not `--ansr-action`, and that is the documented size rule rather than a
hedge.** The anchor is 3.35:1 on white — legal on the 48px figures beside it, and legal on nothing
below the large-text floor, which this value is at 20px on the base breakpoint. `accent-warm` is
6.53:1 and clears AA for normal text at any size. Orange gets darker as the type gets smaller.

### The containment labels become a column

The label rule was "inside its own mark while the inside is the roomier side, otherwise after the
mark's trailing edge". Defensible per label; bad as a set. On the default path it produced three
different indents — the outermost at the leading edge, the industry layer 10% in, the marker's label
after an 8px tick — with two of the three floating in the middle of the pale parent field and a third
of the card empty to their right.

**Every label now starts at the chart's own leading edge.** What associates a label with its layer is
the BAND rather than horizontal adjacency: each layer owns an exposed horizontal strip and its label is
confined to it, which is already the mechanism that stops two labels colliding. The cost is real and
recorded — a narrow layer's label overhangs its own mark, which the old rule existed to prevent — and
it buys back the marker's label sitting against the marker, since the marker is at that same edge.

`LABEL_INSIDE_MIN` is kept as the record of the measurement behind the old rule. Nothing reads it.

### The card that was too short

Removing `industrySentence` made a short card shorter: the ranking beside it runs about 480px and the
containment card about 300, so the row left a band of empty zone under the narrower one. The gap was
between the blocks rather than inside either, but it read as the card having failed to fill.

`lg:h-full` on the card plus a growing body spends that space on the chart instead of leaving it under
the card. **The row stays `items-start` for its other child** and this one opts into the row's height
explicitly — stretching the row would pad the ranking too, and padding a chart to match its neighbour
is the artefact `items-start` was added for.

**Then the ranking grew a tag line per row and the growing body became the problem it had solved.** At
1440 the row runs about 600px, so an unbounded stretch put the chart near 500px — three bands of 170px, each
holding one 24px figure at its top edge, on a chart whose outermost layer is the pale ground. That is
the "mostly empty tint" the drop from 200px to 144px was fixing, reached from the other side: the fix
for a card too short cannot be a chart too tall.

**So the chart caps its own stretch at 352px and the card centres what is left.** 352 is three bands of
about 117px, generous against the 48px a figure and its label need and short of the point where the pale
region is most of the card. The remaining ~90px sits above and below the chart — symmetrical, which
reads as padding, where the same space collected underneath read as a card that had failed to fill.
`max-block-size` on `.gcc-containment` and `lg:justify-center` on the panel body are the two halves;
they have to move together, since capping alone leaves the slack at the bottom.

### The notch, curved

**One step of the radius scale on the unselected cell's two bottom corners.** The outer one is already
inside the card's own `xl` clip, so what reads is the INNER corner: the point where the unselected cell
stops and the selected one carries on becomes a soft shoulder rather than a right angle.

One step is the point. At `lg` the cell starts to read as a separate pill sitting on the card, which is
the content-sized notch ANSR rejected two passes ago. The TOP corners stay square — they are the card's
own, under its `overflow: hidden`, and rounding them is what produced the two-curves-that-cannot-agree
problem the bar was rebuilt to remove.

### The coherence audit

Run against the rendered page rather than the source, because that is where an inconsistency actually
lives.

**Radii are coherent and nothing needed changing.** Four values render, and they nest: 12px on the
result card, 8px on every `Panel` and every comparison card, 4px on details (the tab's lower corners,
the containment bars' trailing edge), and the pill on pills. Ascending, one step per level of nesting.
This also settles the style lock's own open item about the 8px exception — it is now the card level of
a three-step scale rather than a borrowed value.

**Typography is coherent.** Every visible element on the surface renders Hanken Grotesk. An earlier
reading of the audit flagged Inter and was wrong: the hits were `<title>`, `<script>` and `<style>`,
which have no rendered text. Weights run 300/400/500/600/700 with Light appearing once, on the band's
finding.

**One value is still off the type scale: the density map's city labels, at 12.339px.** The size is a
fraction of the SVG's viewBox width, so the rendered pixel size follows the map's displayed width and
cannot be pinned to a step without decoupling the text from the viewBox — and `layOutLabels` estimates
its own text widths in viewBox units, so decoupling means reworking the layout that places every label.
Left measured rather than half-fixed.

### A harness constraint worth keeping

**Every review screenshot must stay under 2000px on both axes.** `deviceScaleFactor: 2` at a 1440
viewport produces a 2880px-wide element shot, and a tall section at 1x can exceed 2000px of height on
its own — either one fails the request outright rather than degrading. `.cache/review/audit.ts` renders
at scale 1 and clips every shot to a 1900px box. Use 2x only for a narrow element whose natural size
leaves the headroom.

## The client-list pass — ten edits from ANSR's own reading of the peer view

One session, ten requests, read against the impeccable craft floor. Eight are visual and are below;
the two copy-only ones are folded into `project.md` where the claims live. Nothing in this pass
conflicted with the brand board, so the skill and the incumbent system agreed throughout — the one
place they pulled apart is recorded under the switch.

### The switch: nothing is drawn in it any more

**The teal edge under the unselected cell is gone, and its curve with it.** It was the previous pass's
answer to "what does an unselected tab look like when the selected one has no indicator": the selected
cell gives up its bottom border to flow into the content, so the other one takes it. Defensible
written down and wrong on the render — a `--ansr-teal-500` line arriving from nowhere, stopping halfway
across the card's top edge, with a one-step radius bending it out of the cell at each end. Two curves
in the composition with nothing to agree with, which is the exact failure the notch shape was rebuilt
to remove.

**Then the unselected half was asked to be more transparent, and the first attempt went backwards.** A
translucent darken over the cell (8% black over `--ansr-teal-200`) is the textbook recessed treatment
and it rendered as a saturated mint slab in the card's top corner — heavier than the version already
asked to lighten. The fix was to remove a value rather than add one: **the bar's ground moved a step to
`--ansr-teal-100` and the cell declares no fill at all**, so what shows through it is the bar. The only
constrained property is unchanged — the bar must be darker than either content ground, so the card
stays a light object and the selected cell stays the lightest thing in the row — and `teal-100` is
1.27:1 against white, the same magnitude of step `teal-200` gave. Every ink improves rather than
degrades, since the ground got lighter.

**No glyph on either cell.** Two 20px line icons, both already `aria-hidden`, both
category-interchangeable, neither saying anything its label did not. On a two-cell switch where exactly
one is always selected, an icon is a fourth redundant signal — and it was the one that made the row
read as an app toolbar rather than as the card's own top edge. It also removes the breakpoint rule that
had to drop them below `sm` to keep both labels on one line at 320.

Selection is now three signals over `aria-selected`: the selected cell filled with the content's own
ground where the other shows the bar's, the ink from muted to the heading teal, and the weight.

### The header, as one object with two views in it

Screen 1's band carried a lockup, a display line and four answer pills; Screen 2's carried a lockup and
four pills. Crossing between them in one state change dropped a whole row out of the band and jumped
the pills 60px up the page, so **one shared header read as two different headers**. The line was
Screen 1's on the argument that Screen 2 already opens on its finding as a real `h2` — true, and the
reason its band line is a SCOPE statement rather than that finding.

The two lines live together in `HEADER_LINES` because they are a pair and the failure mode is one
drifting out of construction with the other. **Each has to set on one line**: `HeaderFinding` is capped
at `--ansr-container-lead` and sets at 48px, so past roughly 36 characters it wraps and the two bands
differ in height again. The first attempt at Screen 2's enumerated all four lenses and wrapped; the
lenses are named in full by that screen's own lead two elements below.

### The Edit answers control, back to the size of a pill

`min-h-11` met the 44px minimum by making the only button in the band 44px tall beside four 30px answer
tags, so **the loudest object in the header was the one piece of chrome rather than any of the four
answers it acts on** — the same defect as the pass before it, which pushed the control to the opposite
end of the container. A control has to look like it belongs to the things it changes, and outsizing
them by half is not belonging.

The visible pill matches the tags; `.gcc-context-edit::after` overhangs the box 7px top and bottom for
a 48px target. **`inset-inline: 0`, never a negative inline value**: the row's `gap-x` is 8px, so
overhanging horizontally would put the target under a pill, and a press landing on a pill does nothing
while feeling like a miss. The row's `gap-y` is 12px, under the 14px of vertical overhang — safe only
because the pills are not focusable and there is exactly one of these per screen.

### The function list: a tag set, not a grid

Every column count eight items may take fails the same way. **A fixed column is as wide as the longest
item in the block**, so "Human resources" sat in a 270px cell holding 110px of text while "Business
operations & shared services" still wrapped to two lines — ragged and short of room at the same time.
Two columns is that at twice the width; three is unavailable, since eight items leave the last row a
cell short. The four-column version was the second shape and it fixed the borders without fixing the
grid.

A wrapping tag set has no grid in it: nothing can be part-empty, nothing wraps internally
(`whitespace-nowrap` guarantees it), and the set reflows one line to eight across the breakpoints.
**240px to about 90px.** It claims exactly nothing — no numeral, no bar, no mark, no hover state, still
a `<ul>` — which is required, since there is no per-company function record in this dataset. White fill
on the mint zone, the same relationship the city chips use, and no border: a white pill on the tint is
already a shape.

The copy moved with the shape. `COMMON_FUNCTIONS` is written to a 16-to-28 character range so no single
item decides the layout; the outlier was 37 characters, half again the next longest.

At 1440 the set lands 6 + 2 rather than 4 + 4. That is the natural shape of a content-sized set and it
is left alone: forcing balance means either stretching the second row's two tags to half the row each,
which is the part-empty artefact in pill form, or cutting words to hit a width.

### One typeface, at last

`font-display` was on the ask's wrapper and the peer answer's and on **neither of Screen 2's**, so
Screen 2 rendered in Inter — including the `h1` lockup and the answer pills, which are the same
components Screen 1 draws in the display face. Switching tabs changed the typeface of the header
without changing the header. It is one class on the public root in `tool.tsx` now, so a fourth phase
cannot be added without it.

Verified on the render rather than in the source: every visible element on all three phases computes
Hanken Grotesk, and every rendered size is on the scale — the `%` suffix was the one value off it and
is now two real steps down. The 12.339px density-map label is unchanged and still measured rather than
half-fixed.

**The brand's face is still not on the page.** Moderat is what ansr.com sets and what this pass was
asked for; there are no licensed files in the repo, so `--ansr-font-display` still resolves to Hanken
Grotesk. Nothing about the plumbing needs designing — drop woff2 files in and put Moderat at the front
of the token — so this is a licence question rather than a design one. On the blocked list.

## The second client list — six more, and two of them were arithmetic

### The snapshot stops being a white strip on a white card

"Empty and lifeless" was the note, and the ground was most of it: **Zone 1 was `--ansr-surface`
inside a white card**, so the block had no boundary against the card, none against the tab bar, and
none against the zone below until the mint started. Four figures floating in undifferentiated white.

It is `--ansr-surface-pale` now, which is the one exception to the strict alternation and was already
anticipated by `ViewTabs`' `ground` prop. The mint was never available to it: `--ansr-action` is
2.63:1 there against 3.29:1 on the pale, so the orange figures would fail the 3:1 large-text floor at
any size. Sequence is pale, mint, white, mint, white, mint — five real boundaries, and the pale still
only ever neighbours the mint, which is the rule the three-value version broke twice.

**The leading city took the same orange and came up one step.** It was `--ansr-accent-warm` at 20/30px
beside three `--ansr-action` figures at 36/48 — two different oranges and a two-step size gap, which
is why it read as a cell borrowed from another component. The deeper step was needed while the value
was 20px; at 30/38 Semibold the anchor clears the large-text floor. It keeps no `tabular-nums` and no
`tracking-display`, and that plus the one remaining step is what still separates a place from a
quantity.

### Two figures whose arithmetic was wrong

Both were asked about rather than reported, and both turned out to be real.

**The share divided two populations that differ by one.** `industry.total / scale.companyCount`:
the numerator is the peer pool, which drops the visitor's own company where the dataset holds it, and
the denominator is every company, which does not. So the direction of the error depended on whether
the visitor's own company happened to be in our data. It is `industry.shareOfIndia` now, derived in
the view model over one population, and a unit test drives it with a named company that IS in the
dataset — the case that made it wrong.

**The professionals figure reported the narrower of two memberships as the total for both.** It was
the Fortune Global 500 subset, 1,059,175, under two cells naming two different indices. The union is
1,688,200 across 493 companies, and the deduplication is most of the figure: adding the two sums
separately gives 2,699,275, because 171 of the 181 Fortune companies are also in the Forbes 2000. It
is self-deduplicating by construction — one filter with an OR over the company list, so a company
appears once — rather than by subtracting an intersection. Arithmetic in `docs/data-audit.md`.

### Copy that named the arithmetic instead of the claim

- **"GCCs in your sub-industry"**, and the share this label belonged to is gone. Two moves, both at
  ANSR's request. The cell went from `industry.shareOfIndia` back to a COUNT — of `businessType.count`
  where a sub-industry was given, `industry.total` where it was not — on the ground that a percentage of
  every GCC in India describes the market's composition while a visitor arrives wanting to know how many
  companies like theirs are already here. And the label lost the word "Comparable". What the share was
  solving is still real and is recorded above under the arithmetic: the count is a number the reader also
  meets on the containment chart's middle layer and as the denominator of the peer count line. Two
  consequences: the `<1%` special case for a thin industry is gone, a count needing no such branch, and the
  sub-industry label reads marginally wider than what it counts, since the figure is the population above
  the similarity floor rather than everything sharing one label. Accepted because the cell and the five
  cards below it are drawn from the same population, which is the disagreement that mattered.
- **"Snapshot of {industry} GCCs in India"** as the section heading, at ANSR's wording. Never "GCC's".
- **"Inside India's GCC base"** for the containment card. "Your industry within India's GCC base" is 37
  characters and set on two lines at 20px Bold in a ~393px card, which pushes the chart down far enough
  that the card stops matching the ranking beside it. "Your industry" is what went, and it costs
  nothing: the chart's own middle layer is labelled "in {industry}".
- **The scale strip states no share on any cell.** ", 36% of the list." arrived when the proportion bars
  came off, on the argument that a figure with a denominator should state it. Off at ANSR's request; the
  count and the index name are both on the line, so the fraction is available without being asserted.

### The ranking finally says what its figure is

Five ranges down the trailing edge, over five bars, under a heading that says "largest" — nothing on
the block named the quantity, so a reader could take them for revenue, for the company's whole Indian
workforce, or for the company. The section heading names the subject and cannot carry both.

One small-caps **"GCC headcount"** over the column the figures share, in the same treatment the
comparison cards use for exactly this job, `justify-end` because there is no leading column to label.
`largestCountLine` came off in the same pass — "The 5 largest BFSI GCCs in our India data." under a
five-row ranking headed "The largest BFSI GCCs in India" is the heading with a row count in front of
it. **The shortfall clause did not go with it**: it was appended to that line, and a ranking short of
its own limit still has to say so, so it is `largestShortfallLine` and renders only when it fires.

### The hero pair, third wording

Screen 1's band line has now been wrong three ways, and the sequence is the useful part.

1. "5 relevant peers operate a GCC in India" — graded its own output with a word the reader cannot
   check, and spent its verb on something true of every company in the dataset by construction.
2. "5 India GCCs match your BFSI profile" — fixed both, and was still false in the one direction that
   matters. **Five is what the grid SHOWS**, capped by the peer limit, not how many matched; the count
   line under the grid says "Showing 5 of 189". So the band understated the evidence directly beneath it
   and read as "we could only find five".
3. **"How your industry operates in India"** — no count in either direction. It does not say "and more"
   either: a denominator belongs on the count line, which states it exactly.

Screen 2's is **"The India market beyond your industry"**, at ANSR's wording. "Behind {industry} GCCs"
was right about the subject and wrong about the relationship — these figures are not the market behind
one industry, they are the market that extends past it.

**Neither line interpolates the industry, and that is a hard constraint rather than a preference.**
`HeaderFinding` is capped at `--ansr-container-lead` and sets at 48px, so anything past roughly 36
characters wraps — and a two-line band beside a one-line band is the height jump across the tab switch
that this pair exists to remove. Industry names run from "BFSI" to "Agribusiness & Food Processing", so
an interpolated line is one line for some visitors and two for others; the previous function line held
`{industry}` and was verified on BFSI alone. The band is not impersonal for it — the four answer pills
directly beneath carry the company, industry, headquarters and revenue band.

Both are sentence case with a capital first letter. The peer line used to open on a digit.

**`framing()` now has no consumer on either screen**, and is kept and unit-tested on all three
`gccStatus` branches for the same reason `peerLead` and `LARGEST_LEAD` are: the unit suite is the only
place that input can be varied at all.

---

## The Screen 2 truth pass — the charts state their claims and the copy stops explaining

First of four passes on the function view, and it changes **no styling at all**. Restyling a screen
whose content is about to change is work thrown away, so this pass makes the claims true, the charts
the right shape and the copy as spare as Screen 1's; type, colour, cards and motion come later.

Two things it is worth knowing before reading the rest: the page got dramatically shorter without a
single spacing value moving (finance at 390 fell from 4,720px to 3,785px, twelve long paragraphs to
two), and the whole reduction came from removing sentences and one chart, not from tightening
anything.

### The audit: 35 metrics, one chart genuinely wrong

Every metric was inventoried against the claim its own definition makes. **One mismatch, appearing
twice** — `SCALE_MILESTONES`, authored once and spread onto operations and HR. Everything else drew
the claim it was making. Three cases were examined and deliberately left alone, and they are worth
recording because each looks like a defect on a first read:

- **Rates on a 0-to-100 axis draw short bars.** Salary growth (7.5% to 21.1%) and workforce
  diversity (25% to 35%) both live in the leftmost fifth of their track. That is `breakdownScale`'s
  percent rule, which exists to stop 99.95% and 99.5% drawing as a fabricated gap, and it is honest:
  scaling a growth rate to the largest value present would turn 21% into a full bar and imply a
  ceiling the quantity does not have.
- **Length encoding a quantity where less is better.** Latency (8 to 180ms) and days lost to
  disruption (2 to 6) both draw the worst case longest, and a reader scanning for the winner reads
  the long bar as the winner — the exact failure `IndexLollipop` was rebuilt to fix. The difference
  is that an index carries no valence at all, whereas "latency" and "days LOST" carry it in the
  noun. Fixing this properly means a per-metric direction field, authored the way `indexBaseline`
  carries direction; it is not worth one for two metrics whose headings already say it.
- **Cost indices clustered at the top of their axis.** The tier spread's six marks all sit between
  75 and 100 of a 0-to-100 track. Documented behaviour with a drawn zero tick, which is the whole
  point: a truncated axis is exactly how this chart would be faked.

### The progression: four bars became one staircase

`SCALE_MILESTONES` is one centre measured four times as it grows — 6, 12, 24 and 36 months to reach
50, 100, 300 and 500 FTEs. It was drawn as four bars from a shared zero, which is the drawing of
**four independent quantities**: exactly what graduate output by discipline is, and exactly what this
is not. Nothing on the card told a reader that the twelve contains the six.

**`Journey` in `charts.tsx` draws each leg starting where the previous one ended.** Row three is
visibly row two plus twelve more months, and the accent segment on each row is that row's own
contribution with its `+12` in text beside it. The full extent of a row is still its stored figure,
so nothing is invented and no axis is moved — and the last row is full width because it is the whole
journey, which is what makes the axis readable without a note about it.

**Two shapes were rejected before this one, both for measurable reasons.** A horizontal timeline with
four labelled dots puts 6 and 12 seventeen percent apart, which at 390 is about 50px for a figure and
three words, and no width makes that safe because the spacing is a function of the ratio between two
real figures. A vertical spine with proportionally-tall segments fixes the collision and introduces a
worse problem: the segments are only proportional while the text beside them fits inside its share,
so on a phone the lengths silently stop being the quantity. The staircase reuses the row grammar
`RankedBars` already has, so it reflows at 390 the same way every other chart on the screen does and
its percentages are exact at every width.

**Both fills are floor-constrained, and it is the same measurement `BarTrack` records.** They sit on
the `surface-sunken` track, where `teal-400` and everything lighter is under 3:1 — so the run-up is
`teal-500` and the leg is the accent, which is the pair `BarTrack` already uses for default against
emphasis. A hairline of the card's own ground sits at the joint, because two adjacent teals one step
apart are not reliably separable and the joint is the whole reading.

### Why the discriminator is authored and not derived

The chart is chosen from the data in `screen2.ts`, per the standing rule, and the data cannot tell a
journey from a set of subjects. Network latency — on the same tab — is the same format, the same
length and the same rising values, and is four destinations measured once each. A monotonicity rule
would have drawn it as a staircase.

So `progression` is a boolean on the metric definition, beside `atLeast`, for precisely the reason
`indexBaseline` carries direction: only the author of a metric knows. It is refused on anything but a
breakdown of three or more parts (two points are a range, and there is a shape for that), refused
alongside `atLeast` (the difference between two floors is not a floor), and dropped by the gate. The
derived check survives as a **guard** rather than a second opinion: a progression whose figures have
stopped rising falls back to bars, so an admin editing a waypoint below its predecessor gets the
wrong picture of the claim rather than a leg drawn backwards.

### The capability grid: segments only, and the key moved

> **Superseded in two ways by a later pass, recorded below in "The capability grid: rectangles, and a
> key that decodes".** The mark is a landscape rectangle rather than a square, and the key is drawn
> below the grid at the trailing end rather than listed above it. The inversion argument in this
> section is unaffected and is still the licence.

Every cell drew its rating twice — "Very strong" in text and four filled segments — twenty times on
one card, under a key at the foot naming the same four words a third time. Twenty rating words at
`text-sm` are most of why the widest card on the screen was wider than a phone.

The word is `sr-only` now and the segments are the only visible reading, which **inverts which of the
two carries the figure**. That needs a licence and there is exactly one precedent: Screen 1's density
map, whose orange marks are permitted because every one of them restates a figure the ranked list
beside it already carries. The same argument holds here — the four ordinal words are still in text,
in the KEY — and it is why **the key moved from under the grid to above it**. A reader meets the scale
before the thing it decodes rather than after, and the words are in the document, so the segments are
redundant to text rather than the sole carrier of it.

What does not come with that licence: the segments still clear 3:1 against their own track, because
they are now the only visible encoding and the map's contrast exemption is scoped to the map. And the
accessible reading is unchanged — a cell still reads "Data and AI, Poland, Strong". The browser spec
asserts both halves, the second one as **geometry** rather than text, because `innerText` reports
`sr-only` content and a text assertion would have passed whether the change happened or not.

### The copy strip: four explanations became none

Removed: the screen `h2`, the lead under it, the four per-tab leads, all thirty-five card questions,
the held group's paragraph, and both provenance lines. What a tab holds now is the switch and the
evidence.

**The governing rule is Screen 1's own, applied case by case.** Cut the sentence; where cutting costs
a claim the page cannot otherwise reveal, keep it exported and unit-tested but unrendered and put it
in front of ANSR; where the job can move into a heading, a label or a chip, move it there.

Four removals left a mark unexplained and each is settled in place rather than by keeping a
paragraph:

- **The trailing `+`.** `SCREEN_PROVENANCE` explained it once at the foot of every tab, for five
  metrics out of thirty-five — so four tabs each ended on a caveat about a marker most of their cards
  did not have. It is a per-card reading instruction, so it sits with the other per-card reading
  instruction, in `CardMeta`, beside `indexBaseline`'s "Lower is cheaper", on the cards that have one.
- **The sealed cards.** Three devices already draw "the shape is here and the figure is not" — the
  stronger border, `HELD_CHIP`, and `heldShapeNote`'s cardinality. Only the REASON needed words, and
  `heldHeading` holds it in nine: "Figures that depend on your roles and cities".
- **The no-per-head-salary claim.** Invariant-true by construction and invisible without a sentence.
  A reader can infer from the indices that cost is expressed as an index; nothing can imply that no
  salary figure exists behind the gate either, which is the part that answers "so what are you
  holding back". Kept, tested, unrendered, blocked.
- **What the shared supply figures count.** Two claims in one sentence. That 8.7 million is the
  national workforce rather than GCC headcount could move into the metric's own `unit` — the field
  whose job is naming what is counted — but that is a dataset edit and ANSR's to approve, so it is
  proposed rather than done. That a metric on three tabs carries one figure on all three was
  considered for a per-card chip and **refused**: fifteen chips saying "you would see this elsewhere
  too" is a statement about our own information architecture, which is the one thing this screen's
  copy doctrine forbids.

**The card question was the largest single removal and it is the one with no compensating anything.**
Thirty-five sentences, one per card, each asking what its own title, unit and figure answer in three
words — and on a phone doubling the height of every card on the screen. The tab a visitor opens on had
nine of them. The FIELD is untouched: `question` is still authored, still admin-editable, and still
crosses the gate, which is what keeps the schema's rule that a gated title and question may not
contain digits guarding something real. It is unrendered in exactly the sense the removed sentences
are unrendered.

### Two consequences of removing the `h2`

**The heading outline.** Cards were `h3` under that `h2`; left alone they would be `h3` directly under
the `h1`, a skipped level and a broken structure for anyone navigating by heading. They are `h2` now —
with no section heading above them a card IS a top-level section of the tab, so this is the correct
outline rather than a promotion for its own sake — and the held group is another `h2` with its sealed
cards at `h3`. The band carries `aria-label="India market metrics by function"`, having no heading left
to point `aria-labelledby` at; `expectBand` accepts either, and Screen 1's snapshot strip already uses
that mechanism for the same reason.

**`gccStatus` survives, and the count in `project.md` was wrong twice.** It recorded five branching
strings — the `h2`, the lead and three CTA fields. The lead was one shared constant that never
branched, so it was four; the `h2` and the lead are both gone, so it is three. Three is still enough:
`functionFraming`'s close is the only thing standing between the field and someone deleting it, and
Screen 1's own branch has no caller at all. `functionFraming` had **no unit test whatsoever** before
this pass, under a comment in `screen1.test.ts` asserting that it did — that is fixed with the rest.

### Still open after this pass

- The three unrendered sentences are on `handoff.md`'s blocked list and each is one prop to restore.
- The unit change on the three shared supply metrics is proposed, not done — a dataset edit ANSR has
  to approve.
- The capability grid still needs its horizontal scroller at 390 (`min-w-md`), showing two columns of
  four. Better than one-and-a-bit, still a scroller.
- The `+ is a floor` note appears three times on the technology tab. Correct per the per-card rule,
  and worth a look at 1440 to confirm it reads as a footnote rather than a refrain.
- ~~Styling is untouched by instruction.~~ **Done by the card-system pass**, which took passes two
  to four in one go along with Screen 1's outstanding card chrome.

### One map trap, moved here from the handoff

Recorded where the map's other geometry decisions are, because it is durable rather than session state.

**`coastAt` must read the MAINLAND subpath only.** Taken across all subpaths, the east coast at
Chennai's latitude is the ANDAMANS — so every southern leader is pushed west, across the country, to a
coastline a thousand kilometres out to sea. The outline is one path with many subpaths by construction
(invariant 8: it is generated, never traced), so this is a property of the data and not a bug that can
be fixed once.

### The finance row's ragged titles — CLOSED by the card-system pass

The cost-durability trio now fills a row of three thirds, which retires the lone-scalar part-empty row.
What it introduced is smaller and still visible: **"Operating cost growth year on year" and its workplace
twin wrap to two lines at third width where "India wage growth year on year" does not**, so the three
figures in that row sit at two different baselines under `items-start`.

Thirty characters fit on one line in a third-width card and thirty-four do not, and "year on year" is
twelve of them. Three ways out were recorded, and all three needed ANSR to rename an admin-editable title. **None
was needed.** The three cost-growth metrics are scalars, so the Ledger structure moved them out of the
card grid into the figure row, whose labels are pinned to two lines' worth of room — the figures share a
baseline whatever the titles say. Verified on the render at 1440: 9.8%, 10% and 10% on one baseline.

## The card-system pass — one card language, on both screens

Three jobs in one pass, and they had to be one pass because `Panel` and `Block` live in
`components/public/` and both screens draw with them. Doing Screen 2 first would have had it adopt a
card system that was about to change.

The promoted structure came out of a variant harness — `Current`, `Ledger`, `Lead`, `Stepped`, behind
the picker from `.kiro/skills/variant/picker.md`, hosted in the real chrome on the real payload. ANSR
picked **Ledger**. The harness is deleted, which is the rule; what it settled is below.

### The Ledger structure, and what it argues

*A bare number is not a card.* Every bare scalar leaves the card grid and becomes one figure row;
everything that draws a MARK keeps its card. Nothing is promoted, nothing is reordered, and no metric
is asserted to be the tab's answer — which is what separated it from `Lead`, the variant that
promoted the capability comparison and was the only one that reordered anything.

**Why a scalar was the worst object on this screen.** Five of technology's nine metrics are one
number, and once the `question` line was removed a scalar card was a 20px title, a figure, a unit, and
roughly its own content's area again in border, radius and padding. Two of them measured 552×150
holding fifty-one characters. The card was doing no work a definition list would not do better, and it
was spending the tab's whole hierarchy budget on the tab's least-framed content.

**The split is by SHAPE, and that is what licenses it.** A scalar draws no mark, so there is nothing
about it that a card's edges were measuring and nothing that moving it can misrepresent. That is the
seam between the critique's finding and `project.md`'s rule that width is a property of what a card
draws — the rule holds for everything that draws, and the scalars were never really in its scope.

Measured, technology at 1440: panel 1967px → 1339px, and the tab's first figure moved from y=528 to
y=415.

### Three rejected alternatives, from the harness

- **`Lead`** — the capability comparison promoted out of last place and out of its card, at the display
  register, with the scalars demoted beneath it as supporting evidence. The strongest claim of the
  three and the one that reads best at 1440. Rejected: it is the only variant that reorders, and the
  card it promotes is the one needing a horizontal scroller at 390, so a phone reader meets the
  scroller first.
- **`Stepped`** — the lead answer open, the figure row visible, the three remaining charts behind
  `<details>` rows whose summaries carry their finding in text. It fits the whole technology tab on one
  screen at 1440 (panel 884px, 0.98× the fold). Rejected: a page arguing that its numbers are solid
  showing fewer of them.
- **The incumbent grid**, kept in the picker as `Current` so the comparison was against the real thing
  rather than against a memory of it.

### `metricWidth` has no `third`, and that is what made the grid correct at 768

`third` mapped to `sm:col-span-6 lg:col-span-4` — six columns below `lg` and four above it — while the
packing rule reasoned in thirds-of-twelve. So a rule that tiled perfectly at 1440 could leave a hole
between `sm` and `lg`, and did. With the scalars gone every card draws a mark, and a mark wants either
half the measure or all of it: `half` is six columns at every breakpoint and `full` is twelve. There is
no longer a width whose meaning changes with the viewport.

**The packing moved into `screen2.ts`, reversing a recorded decision.** It lived in the component
because a card's width is a bet about what sits BESIDE it, which is a row-level question rather than a
property of one metric. That was right while there were three widths and the browser's auto-placement
of a `third` was part of the answer. With two widths and no scalars it is a pure function of the metric
list — so it is data, and "no row is part-empty" is a property a unit test pins on all four tabs
instead of something only a screenshot can show. A browser spec asserts the same thing on the render at
1440, 768 and 390, because the unit test proves the arithmetic and only the browser proves it was the
right arithmetic.

**The held grid was never packed at all, and it left a real hole on two tabs.** HR's pair is a
breakdown then a matrix — a half then a full — and a full cannot fit beside a half, so it dropped to
the next row and left six empty columns beside the placeholder. Finance had the mirror of it. Nobody
had looked, because the packing was only ever applied to the open grid.

**One cost, named rather than smoothed over.** A lone trailing half widens to full, so on technology
the two-part community-activity breakdown draws two very long bars across the whole measure. That is
the cheaper of the two defects — the alternative is a visible hole beside it — and it is only reachable
on a tab with an odd number of halves.

### The figure row

Screen 1's snapshot treatment, on the same problem: a figure, its label, no container, no border, no
icon, no hairline between them.

- **The label is 14px muted above a 30/38px figure**, which inverts the card's own relationship, where a
  20px bold title sat above its evidence. The `h2` per metric survives — the card shell went and the
  document outline did not, and five headings collapsed into one region would read better to the eye
  while leaving a screen-reader user with five fewer landmarks than the incumbent has.
- **The label is pinned to two lines' worth of room**, so the figures share a baseline. Without it "GCCs
  operating above 100 technology FTEs" wraps and drops its own figure 20px below the four beside it —
  the ragged card row again with the borders off. **This is what retired the finance row's ragged
  titles**: that item's three ways out all needed ANSR to rename an admin-editable title, and none was
  needed.
- **The column count varies with the figure count**, from a static map, because a Tailwind class cannot
  be interpolated. Fixed at five, finance's three figures occupied three fifths of the measure with two
  empty columns after them — the same left-weighted row the packing rule exists to prevent, one
  component over.
- **The floor note is once for the row.** Per-card was right for a grid of cards and wrong the moment
  the scalars became one row: technology's two floor figures put the same sentence twice inside one row,
  400px apart, with nothing saying it referred to two different figures. It is still per-card where a
  CARD carries a floor, which is the half of the rule that did not change.
- **No heading above it, and none is available.** A group heading inside a tab would be the internal
  lenses re-lettered. What separates it from the grid is a rule — the one device left when a label is
  forbidden.

### Card chrome, re-derived from the board rather than from a description of it

`Group 149.svg` was rendered at 1440 and read directly: `fullPage` times out on a 7.4MB 5,531px file,
so it was inlined with `setContent` and shot four times, a viewport at a time.

What the board actually does:

- **Every container on it is TRUE ZERO radius.** The three white model cards, the FAQ rows, all of it.
  The only round things on 5,531px are the pill CTA and two 4px social squares.
- **No shadow anywhere.**
- **Its white cards sit on a mint ground with no border at all**, because the fill against the tint IS
  the boundary.
- **Borders appear on exactly one thing: the FAQ rows**, where each row is an independent interactive
  object.

So `Panel` loses `rounded-lg` and `shadow-sm`, and Screen 1's comparison cards lose their border and
shadow as well as their radius. The premise behind the shadow was right — a hairline against a tint is
nearly invisible — and the conclusion was one device too many.

**What the hairline is kept FOR is the marks, not the separation.** A `Panel` is what a block takes
when it draws a mark, and a bar's full width means nothing without an edge to measure against. That
edge has to be explicit on a white zone, where the fill supplies no boundary at all, so it is one
treatment on both zones rather than a per-ground rule. The comparison cards are the case where the
board and the earned-border rule agree: they draw no mark, so they get no border.

**The floating result card keeps its radius and its two shadow layers.** It is on a teal-deep ground
where the shadow tokens are invisible, and it is the container — being the one round object on the
surface is what says so. The entry point's form card keeps its 8px, which the client asked for.

**`design-stack.md`'s radius rule follows this**: `none` for cards and panels on the public screens,
with the form card and the result card as the two named exceptions, and `pill` still for chips,
counters and the actions.

### `PanelTone` had four values and two were dead

`tint` differs from `plain` by about 4% lightness and had no caller. `accent` was the teal gradient
heading strip, and what announces the primary evidence is now `weight="lead"` on a `Block`, which is
size rather than colour. Neither was passed anywhere in `src/` — they were an API nobody could use
correctly, because the one thing they were for is done by a different primitive.

`sealed` replaces them, from Screen 2: a step firmer on the same border, which is the whole signal that
a slot is closed rather than broken. Never a dimmer card — dimming says unavailable. It is `tone` on
`Panel` rather than a bespoke shell in `metric-card.tsx`, so a held card and an open one cannot drift
apart in radius, padding or heading scale.

Two props arrived with it, both with one caller: `chip`, for the "Held back" status beside the heading,
and `headingLevel`, because a sealed card sits under the held group's own `h2` and a level is a real
outline rather than a size.

### Screen 2's chart cards ARE `Panel` now

They were a bespoke `Card` in `metric-card.tsx`, and its own comment is what retired it: it justified
bordering every card on the grounds that the selected view tab had become a white surface the content
must be continuous with, so a white card on a white ground had no edge to borrow. **That stopped being
true when the switch became the floating card's top row** — the tab is filled with the content's own
ground by construction, and the joint it was reasoning about is the absence of anything rather than two
edges lined up.

The consequence worth knowing: a `Panel` is a `<section>` with an accessible name, and a `<section>` is
not valid inside a `<ul>`, so the card grid is a `div` and the cards are landmarks rather than list
items. No loss — these are independent readings of one market rather than an ordered set, which is
exactly what Screen 1 already does with its own grid of panels. Every spec that located a card by
`getByRole("listitem")` had to move to `section[id^="metric-"]`, and the figure row is what `listitem`
means now.

### Type and colour on Screen 2

The card headings came right for free: they are `Panel`'s, so they are 20/24px Bold `tracking-display`,
the same as Screen 1's. The held group's own heading was Semibold `tracking-heading` — the only display
heading on either screen set differently from every other — and is now Bold `tracking-display` with the
rest.

**One orange ROLE, and it is the figure row.** `--ansr-action` at 30/38px Bold, measured at 3.33:1 on
white, which clears the 3:1 large-text floor and is illegal below it — so the label beside it is muted
ink rather than a smaller orange. It is the board's own 3-up stat device and Screen 1's snapshot
treatment, and it lands here because the figure row is the one band on the tab whose peers are all the
same kind of thing.

**No eyebrow, and this is where the craft floor and the brand disagree.** `craft-floor.md` bans a
kicker above a heading outright — "no brief earns it back". The board uses one on all three model cards
("For Speed", "For Flexibility", "For Ownership") and on its problem grid, and Screen 1's snapshot
already carries one. Impeccable's own rule is that the brief wins over a saturated-pattern warning, so
the board wins where a band has a heading to put one above. Screen 2's figure row has no heading and
cannot have one, so the question does not arise here — the role is the figures alone.

**Nowhere else on the tab.** One orange role per band is intact: the closing CTA's pill is a different
band, and the chart cards' figures stay as they were.

### The chart contrast item the colour-role pass left open

`--ansr-teal-bright` on a light track at 2.44:1, recorded as belonging to "the card-system session".
Four instances, all of them the comparator ring on the index charts — `border-2 border-teal-400
bg-surface`, a ring on white — now `teal-500`, which is the same value `BarTrack` and `OrdinalGrid`
already moved to for the same reason.

**The ordinal RAMP keeps its `teal-400`, measured and deliberate.** It is a contiguous segment inside a
divided bar on a `surface-sunken` track, adjacent to `teal-500` above and `teal-300` below, and every
segment's figure is in text in the list beneath it beside its own swatch. That is a different case from
a mark on a light ground, and changing it would alter an encoding whose monotonic lightness is
load-bearing.

### Still open after this pass

- **The card border is 1.25:1 against both the card fill and the white zone**, and the sealed card's is
  1.78:1. Both are under 3:1, which is correct — 1.4.11 governs controls, and a card is not one — but
  it does mean the open/sealed distinction rests mostly on the 1px/2px width difference rather than on
  the colour step. Worth a look at 390.
- **Technology's community-activity card draws two bars across the full measure**, the named cost of
  the odd-half rule.
- **The capability grid still needs its horizontal scroller at 390**, unchanged by this pass.
- **The tab still states no provenance** — not one of technology's nine metrics sets `asOf` or
  `indexBaseline`. A data question, on the blocked list.
- `--ansr-orange-800` still has no consumer, and the two dark teals (`#072228` vs `--ansr-teal-deep`)
  are still two tokens within dE ~1.

## The technology composition pass — Screen 2 becomes zones, and the graduate pair stops lying

Screen 2's technology tab rebuilt to a supplied composition and reference render. The reference is
`Tech view.png` at the repo root. Everything below is the reasoning; `project.md` holds the durable
claims and `design-stack.md` the border and radius rules.

### What the reference asked for that the old tab could not give

The old tab was correct and read as a report. One flat white band, a figure row, then a grid of
bordered cards down it — the shape the peer view had already abandoned twice for the same reason.
Nothing told the eye that five national figures, a talent pipeline and an international comparison are
different KINDS of claim, so a reader scanning for the second one had to read headings to find it.

So the tab is Screen 1's zone system now. `Zone` moved to `components/public/primitives.tsx`, because
two copies of that markup would be two rhythms and two insets to keep in agreement; what stays local to
each screen is its own SEQUENCE, and the peer view's is recorded where the component used to be.

**The sequence is derived, not written out.** White for the figure row, mint for the half-width cards,
white for the full-measure ones, mint for the held group — from whichever of those four a tab has. A
hardcoded sequence puts two white zones together on operations, which has one figure and no halves.
`surface-pale` is not in this screen's sequence at all: it is 2% off white, so it is only a boundary
against the mint, and this screen has no opening-zone problem for it to solve (the tab strip sits above
the first zone, on the section's own white).

### The two-column section is a consequence of the widths, not a composition

This is the part worth keeping. `compareByWidth` already ordered halves before fulls and `packWidths`
already left an even run of halves alone — so the leading run of halves IS a two-column section, and the
remainder is the full-measure evidence under it. `AreaPanel` cuts the list where the widths change and
gives each part a ground. Nothing chooses which metric goes where.

Two things had to move for technology to produce the asked-for shape, and both are data rules rather
than layout:

- **The breakdown width threshold went from five parts to seven.** Seven specialisms at full measure put
  the longest bar across 1,120px, where the eye travels the whole card to reach a figure 4% longer than
  the one above it. At half measure with the dense step the same seven are a compact ranked list, which
  is what a ranking wants. Nine is where it stops: the graduate split runs 45,000 against 1.5M, so its
  short rows are hairlines at full measure already. Nothing in the catalogue has six or eight parts.
- **`tech-graduate-output` was replaced by a two-part tech-only metric.** Nine hairlines, six of which a
  CTO does not recruit against, and ANSR asked for the split off this page. The shared metric is
  untouched on operations and HR.

The cost is that the composition now depends on technology having exactly two halves. A third would
widen one to fill its row and the section would become three cards. `screen2.test.ts` pins the widths and
a browser spec measures the geometry at 1440, so that change cannot happen quietly.

### The graduate pair, and the falsehood the old rule would have drawn

The one genuine data-integrity finding of the pass.

Containment used to be INFERRED: two parts, same `unit`, smaller under half the larger. The argument was
that a shared unit is the definition's own statement that both parts measure the same KIND of thing —
which is true, and is a precondition rather than evidence. The graduate pair satisfies every condition
and is DISJOINT: 1.5M engineering graduates and 450K management and MBA graduates are both graduates a
year, 450K is 30% of 1.5M, and nesting them asserts that every MBA graduate holds an engineering degree.
Nothing supplied contains that number.

So containment is authored — `subset` on the metric, exactly like `progression`, and for the identical
recorded reason: nothing in the data can tell the two cases apart. `ops-grade-a-office-stock` (132 msf
vacant of 854 total) declares it and is the only real containment in the catalogue. Two same-unit parts
WITHOUT it draw as `adjacent`.

**`AdjacentBlocks`, and the three ways it closes off implying the overlap anyway.** Equal heights with
widths from `span` — a share of the SET's total, not of the larger part, because against the larger part
two blocks would sum to 130% and overflow the row. A gap and two different fills, because touching
blocks in one colour read as a divided bar, which is a part-to-whole claim. And no connector, no bracket,
no percentage: there is nothing to state about how the two relate.

**Also not done: the aggregate.** Engineering + CS/IT + electronics = 2.05M is arithmetically available,
the parts being documented as disjoint. It is not authored, because "the annual engineering graduate
output" is a claim about what counts as engineering and only ANSR can approve one. The stored figure is
preserved and the label says exactly what it measures. **The reference render shows 1.70M here, which is
the specialism figure rather than a graduate figure — that is the one number on it not followed.**

Three rendered defects and their fixes, each found on the render and not by reasoning:

- **The pale block was invisible.** `surface-tint` IS `teal-100`, which is the mint the zone is filled
  with: 1.00:1 against its own ground, so the chart drew one block and a gap. `teal-200` is 1.30:1 and
  `teal-300` is 1.82:1 there — a visible step and still under the 3:1 that 1.4.11 asks of an
  informative graphic. So the EXTENT is carried by a brand-teal outline at 7.72:1 and the fill is left
  free to be the pale aqua the composition asks for. Fill against outline is this file's usual device.
  The figure inside is the brand teal at 4.23:1 on `teal-300`: under AA for body text, over the 3:1
  large-text floor that applies at 24/30px Bold, and its LABEL is outside the block where the same ink
  is 7.72:1.
- **The figure overflowed the narrow block at 390 and at 768.** The block's width IS the figure, so
  widening it to fit its own label would make the drawing disagree with the number inside it. The type
  steps down instead — three steps, set by the narrowest block the proportions can produce.
- **Labels sit BELOW their blocks, not inside.** Inside is better where it fits and it does not fit at
  every width: at 390 the narrower block is about 64px, and a four-word label inside it wraps to six
  lines and sets the height of the whole chart. Below, each label owns its block's full width and takes
  a rule in its block's own colour as the connector.

### The inline ranked row, and the track it may drop

`RankedBars` gained `inline`: label, bar and figure on one line, with the bar as the middle column. A
third of the height, and the reason a seven-row ranking can sit at half measure at all. The default
two-line row is unchanged and is still right for Screen 1's largest-centres block, where the bar is the
block's whole argument and runs the card's measure.

**The track is a separate flag and a separate argument.** The grey track is what tells a reader where
full width is, so dropping it needs something else to. `project.md`'s axis rule has exactly one
exemption — a ranking sorted by the quantity its own bars encode states its axis in row one, because row
one is the longest bar and carries its figure. So `selfLabelling` is a non-increasing test over the
values, derived in `screen2.ts` where a test can pin it, and only a set that passes draws bare. The
latency and disruption breakdowns are in distance and city order and keep their tracks. Ties are allowed:
two specialisms at 1.2M do not stop row one being the longest bar.

The fill goes a step darker when the track goes, from `teal-500` to the brand teal: `teal-500` was chosen
at 4.51:1 against `surface-sunken`, and with the track gone the bar sits on the card's white, where the
brand teal is 6.63:1 and reads as a mark rather than a tint.

### Two rendered breaks at 768 and 390, and what they changed

**The grid now starts at `lg`, not `sm`.** Two cards abreast from 640px gave each a 300–490px column and
both of technology's halves broke in it — a 24px figure in an 81px block, and a name, a bar and a figure
in 350px. A tablet is a one-column reading of this screen and always was; the previous grid simply never
had a card narrow enough to notice.

**The inline row is a grid, not `flex-wrap`.** Flex-wrapped it broke wherever the three items stopped
fitting, which at 768 put the figure on its own line under the label with the bar floating beside them —
a layout nobody chose, arrived at by arithmetic between a `basis-40` label and a percentage column. Two
explicit shapes instead. And below `sm` the row gap goes to 20px against the bar's own 8px, because at a
10px row gap the bar sat 8px from the name above and 10px from the name below and which row it belonged
to was a two-pixel judgement.

### The figure row

Five changes, all of them from the reference, and three of them fixed something.

- **A heading, `FIGURES_HEADING`, per tab.** Not the lens re-lettering the no-group-headings rule
  forbids: none of supply, speed, place or cost appears, and what it says is what the figures are
  properties OF — `snapshotHeading`'s job on Screen 1. Without it the tab opened on five bare numbers
  under a tab strip with nothing stating they are national.
- **Abbreviated figures.** At 30/38px the spelled-out unit is longer than the number it qualifies:
  "8.7 million+" is twelve characters against five. Two rules keep it honest — a unit only where the
  division is exact, and K only for a whole number of thousands at 10,000 or above, which is what keeps
  1,250 GCCs as "1,250". Applied to count breakdowns too, reversing the recorded decision that kept
  digits there; abbreviated, "1.5M / 300K" is one character of suffix rather than a word.
- **A teal line glyph above each figure**, keyed by metric ID because an id is the one field admin
  cannot reach, and all-or-nothing because four glyphs and a gap read as one that failed to load.
- **Figure above label visually, heading before figure in the DOM.** `order` on two elements of one
  labelled pair: a screen reader reads "Bench strength, 8.7M+" and the eye scans the numbers.
- **The reserved height moved from the heading to the label-and-unit PAIR.** On the heading, a one-line
  title left a 40px gap above its own unit while a two-line title had none — cells ended level and their
  contents did not.

**The dividers are CSS keyed to `data-cols`.** Which cell begins a row changes at every breakpoint, so a
`border-s` on "every cell but the first" draws a rule down the middle of a wrapped row. A count with no
rule gets no dividers, which is the safe direction to fail in.

### The capability matrix

India's column tinted `surface-pale` the height of the grid, country headings centred over their own
marker group rather than aligned to its first segment, a restrained glyph beside each capability name,
and the scale's four words carrying themselves with "Scale, weakest first:" moved to `sr-only` — a third
of that line explained an order the words already have, and nobody reads "developing" as the strong end.
Hidden rather than deleted, because weakest-first is genuinely useful to a screen-reader user meeting the
words with no left-to-right to read them in.

**FOUR markers, not the five the composition asks for, and this is a stated departure.** The declared
scale has four ordinal steps, so four is the number of positions a rating can occupy; a fifth is a step
the assessment does not contain. The rule that no supplied rating may be changed or exaggerated is what
rules it out, and the reference render is itself inconsistent about it — its India rows show five and its
comparator rows four.

### The page end

`ClosingCta` is rendered by nothing now, on both screens. The page ends at the capability matrix and one
attribution under the card — `SOURCE_LINE`, on the page ground rather than inside it, because it is an
attribution for the surface and not a note on whichever zone happens to be last. `ResultSurface` gained a
`footer` slot for it; Screen 1 passes none.

**Two things that went with it and are on the blocked list**, not settled: the tool now has no call to
action anywhere, and `gccStatus` has lost its only renderer.

### Three links the composition asks for and this pass did not build

"View graduate talent methodology →", "Explore all specialisms →" and "How we score capability →". There
is nowhere to send them: the tool is one route inside an iframe, there are no methodology pages, and
`NEXT_PUBLIC_GCC_CTA_URL` is unset. A link promising a page that does not exist is the copy rule's own
failure case — no copy may claim something the tool cannot show — so they are absent rather than pointed
at a landing page. Each is one prop once a URL exists.

### Still open after this pass

- **The three methodology links have no destinations.** Above.
- **Five markers versus four in the capability grid.** A departure taken deliberately; ANSR's to confirm.
- **The reference's 1.70M graduate figure is not followed**, being the specialism figure rather than a
  graduate one. The verified 1.5M and its exact label are used instead.
- **Full-measure cards on operations and finance now stack on one ground with no borders between them.**
  Forty pixels of space and a Bold heading separate them, and it holds — but it is the least tested
  consequence of the border removal, and those two tabs were not what the composition was written for.
- **The capability grid still needs its horizontal scroller at 390**, unchanged.
- **The tab still states no provenance** — not one of technology's metrics sets `asOf` or
  `indexBaseline`. A data question, unchanged.

## The HR composition pass — one tab stops being derived

Screen 2's HR tab, rebuilt to a supplied composition and a reference render (`HR NEW VIEW.png` at
the repo root). It is the first tab whose layout is AUTHORED rather than computed from the data, and
that is the decision to understand before any of the visual ones. Durable claims are in
`project.md`; the radius and bar-tone rules are in `design-stack.md`; this is the reasoning and what
was rejected.

### Composed rather than derived, and what that cost

Every other tab lays itself out from the data. `layoutArea` splits the bare scalars into a figure
row, `metricWidth` decides how much of the measure each remaining card needs, `packWidths` fills
the rows, and `AreaPanel` alternates the grounds from whichever sections the tab happens to have.
Nothing in a component chooses which metric goes where, which is what makes the technology tab's
two-column talent section a property a unit test and a browser spec can both pin.

`HrPanel` selects by metric id, states four section headings, and puts the sealed pair on its own
ground. Three things make that survivable rather than merely convenient:

- **The key is the id.** A title and a unit are admin-editable free text; an id is a catalogue
  constant the metric editor cannot reach. It is the same key `FIGURE_ICONS` was already built on,
  for the same reason.
- **Nothing is silently dropped.** A metric the composition does not place is rendered in a generic
  grid at the foot of the white zone, and an odd last card there widens to fill its row. That
  branch is not hypothetical: it ran on the first pass, against a stale test fixture that still held
  `hr-graduate-output`, and it left a half-empty row — which is exactly the "a card failed to load"
  reading the packing rule exists to prevent. The widening was added because of it.
- **The seam is one early return.** A half-composed tab, with some sections placed and others
  derived, would be the worst of both; and the next tab ANSR wants composed is the moment to decide
  whether the derivation survives at all rather than something to arrive at one tab at a time.

### Two grounds, not four, and the cards take their borders back

The other tabs alternate white and mint at every section boundary because their cards are
borderless — a colour change is the only thing separating two sections. Here the three analytical
sections share ONE white ground and their cards carry a hairline and a 4px radius.

**A boundary drawn twice is two devices doing one job.** A bordered card supplies its own edge, so a
ground change between two sections of bordered cards is redundant; and the composition asks for
"thin neutral-grey dividers and card borders" in as many words. What that buys is the one thing the
alternation could not say: the mint is now meaningful rather than rhythmic. Everything on it is
withheld, which is a real change of kind and worth a boundary.

**Radius `md` rather than `lg` or `none`.** The board is true zero everywhere and that is still the
default; the composition asked for corners that are "subtle and consistent, not overly soft", which
is 4px — the step the entry point's own form fields already carry. `Panel` takes a `radius` prop so
it is a decision about a SURFACE rather than about a card: a tab where two cards disagree about
their corners is worse than either value.

### The summary cards — facts, not charts

Three national figures at the head of the tab: 8.7M+, 800K, 72%. On the derived tabs these would be
the borderless figure row; here they are equal-width bordered cards with a teal glyph disc, the
figure in `--ansr-action` at 30/38px, and the label under it in ink.

**No mark on any of them, and that is the composition's own instruction restated as a rule.** A ring
or a gauge behind 72% would be a part-to-whole claim about a figure that is not part of anything, and
a bar behind a single number invents a scale it has no axis for. What a card adds over a bare row is
not a mark, it is a cell: three labels of unequal length read as three equal readings of one market.

**Still a `ul` of `li`s.** They are three readings, not three sections, so they are not `metric-*`
landmarks — which also keeps `getByRole("listitem")` meaning "a figure cell" in every spec on this
screen, exactly as it does on the other three tabs.

**The floor note is per-card here and per-row there, and both are the same rule.** The note goes
wherever it is unambiguous. Technology has TWO floor figures in one row, so a per-card note rendered
the same sentence twice about 400px apart with nothing saying it referred to two different figures.
HR has exactly one, so the card is where it belongs — and on a card it reads as a note about its own
figure rather than a caveat about all three. Reworded to "+ indicates a floor, not a point
measurement", at the composition's wording: the plus is a marker ON a figure rather than the figure
itself, which is what the verb now says.

**Retitling was refused.** The reference labels the first card "Addressable professionals"; the data
says "Bench strength" with "professionals" as its unit, and both are shared with two other tabs.
Titles are data, the values are what the brief protects, and the reference's phrasing is a
description rather than a mandated label — so the data won. This is a deviation and it is on the
blocked list rather than settled.

### `RangeBenchmark` — a spread drawn as two choosable positions

`RangeBar` draws a low end and a high end as a BAND on a zeroed track with the end labels
underneath. That is right for the backfill spread as a spread, and wrong for what the hiring
timings actually are: a reader is not asking "what is the range", they are asking "what does each
end cost me", because the two ends are two operating models. So the endpoints are POINTS — a hollow
ring at the low end, a filled dot at the high one — and each carries its own figure directly beneath
its own mark.

Three details are measured rather than chosen:

- **`px-7` on the rail's wrapper.** The endpoint figures are centred on their marks, so the outermost
  overhangs the rail by half its own width — about 26px for "70 days". 28px of slack absorbs it at
  every width the card is drawn at, including a 222px rail at 390. Without it the figure either clips
  or widens the framed document, and the iframe does not own its own horizontal scroll.
- **The origin is labelled, and the low figure is floored at `3rem`.** A `0` at the rail's start is
  the cheapest way to say the track starts there — `RangeBar`'s own comment records that a spread with
  no visible zero reads as "a value near the maximum". At 390 the low endpoint sits at 10% of a 222px
  rail, which put its label's leading edge behind the `0` and rendered "7 days" struck through. The
  centre is now `max(offset, 3rem)`: a few pixels off its dot in the one case where it had to move,
  and on it everywhere else. A small misalignment against an illegible overlap.
- **The rail is grey up to the low endpoint and teal from there**, which is the language `Journey`
  already uses for a leg's run-up against the leg itself.

**The end labels became whole clauses**, and that reached back into the catalogue. They were "on an
employer of record" and "hiring directly into your own entity" — fragments written to be prefixed
with their own endpoint figure by `RangeBar`. With the figures on the rail there was nothing for a
fragment to attach to, and prefixing would have been the third appearance of the same number on one
card. `RangeBar` dropped its prefix in the same change, so the operations tab reads the same way.

### `MilestoneTrack` — one line, and the positions are the claim

`Journey` draws the scale curve as a staircase of rows, which shares the row rhythm of the bar charts
around it. On this tab there is one more thing to say: there is a SINGLE line and the four milestones
are positions on it.

**Proportional, not evenly spaced, and this is the pass's one hard argument with the reference.** The
reference render spaces the four circles evenly. Six, twelve, twenty-four and thirty-six months are
not evenly spaced — they land at a sixth, a third, two thirds and all of the rail — and even spacing
would be a lie about the one thing this chart exists to show, which is that the first two milestones
are close together and the last is a long way out. It is the same lie a truncated axis tells, and it
is banned here for the same reason. A browser spec pins the four fractions.

That choice created the only real layout problem in the pass, and three attempts are worth recording:

- **`width: max-content` alone.** Each item as wide as its own label, so at 1024 "To 50 FTEs" and
  "To 100 FTEs" ran together — the two are about 56px apart there, which is the tightest pair the
  chart is ever drawn at.
- **Shrinking the type.** Rejected: an arbitrary size below `text-xs` is off the scale, and it would
  have bought about 8px.
- **What shipped: a `3.5rem` cap plus shorter entries.** Capped, a milestone wraps to two lines
  rather than colliding, and the reserved label height already accounts for two. The entries lost
  their "To " prefix in the catalogue — "50 FTEs" — which was not a layout hack: the card's own title
  is "Time to reach each scale milestone", so every entry began by repeating the title's own
  preposition, and it reads identically in `Journey`'s rows on the operations tab.

**Nothing parses a label.** The reference draws "50" and "FTEs" as two lines with different weights;
splitting the entry to produce that would mean reading an admin-editable string, which is banned
outright on this screen. The label is rendered verbatim and wraps naturally. The unit — "months,
median" — is the card's subtitle rather than a word repeated under each of four circles.

**The layout is a CSS class, `.gcc-milestones`, not two DOM trees.** Below `sm` a 246px rail puts the
first two circles 41px apart, which no label fits between, so the honest fallback is a vertical
list. Rendering both and hiding one would put every milestone in the accessibility tree twice; the
items carry a `--gcc-at` custom property instead and are positioned absolutely only where there is
room. Same call `.gcc-figure-row` made about its dividers.

**The label's height is reserved and the rail's offset is derived from it.** Each item is a
three-row column — label, dot, figure — and the rail is ONE element drawn behind all of them. A
milestone whose name wraps would otherwise push its own dot lower than its neighbours' and the rail
would pass through none of them. The dot is a ring rather than a disc so the rail reads as
continuous THROUGH each milestone; a filled dot on a 2px line reads as a join between two segments.

### The salary ranking — and the percentage-scale defect it exposed

Five growth rates, descending, inline rows on a bare track. Two things came out of it.

**The bars were three-pixel slivers on the first render**, because `breakdownScale` returned 100 for
every percentage. That rule was right about the case it was written for and wrong about this one: a
stacked bar's segments are laid end to end and MUST sum to one, but a growth rate is not a share of
anything, and five rates from 7.5% to 21.1% against a 100% axis occupy a fifth of the track with
four fifths of the card given to a region no value can reach — while implying there is a 100% figure
to be read against. The scale now depends on the display, and the case the old rule protected is
already gone by then: 99.95% against 99.5% is caught by `clusteredHigh` and drawn as figures with no
bars at all. That is what makes it safe rather than a relaxation, and it is the reason the display is
resolved before the scale rather than after.

**The comparator is warm, and it is warm because something written says so first.** The composition
asks for orange on the all-roles row and a muted blue-grey on Non-ER&D. Colour cannot carry that alone
— this palette has no categorical hue, which is a measured fact rather than a preference — so the
entry was renamed "All roles (reference)" in the catalogue and the tone became the second reading. The
row's figure and label take `--ansr-accent-warm`, since `--ansr-action` is illegal at 14px.

**Both halves of that then moved at ANSR's request, and the reasoning survives the move.** The bracket
came off the label: it read as an editorial aside welded to a category name, and it made the plainest
row on the card carry the longest string. It was replaced by a sentence under the chart, then the
sentence was removed too at the project owner's request — the words "All roles" are self-descriptive as
the all-up baseline, so the LABEL itself is the written carrier and no note is needed. The sentence had
also been closing the height gap with the scale-milestones card beside it; that job now falls to three
supplied specialism rows (SDE, Product Management and DevOps / Platform Engineering), so the height is
bought with data rather than editorial copy — the ranking is eight rows, the count the project owner
judged level with the two-rail milestone card. And the muted row went back to the subject teal: beside the teal
bars and one orange one, a grey bar read as a third CATEGORY rather than as another measurement of the
same quantity, which is a stronger claim than "held back from the comparison". `muted` stays in `BarTone` for a chart that genuinely holds a row back —
`--ansr-grey-500` at 3.28:1 is the only light neutral that clears the floor, and the
`--ansr-teal-300` the composition describes measures about 2.3:1 and is unavailable whatever it looks
like, so re-deriving it later would be re-doing that measurement.

**And the four subject bars stepped back a shade, which is the one change here that is not local to
this card.** They were `--ansr-accent` because the ranking is self-labelling and drops its grey track,
and a bare bar used to go a step deeper to compensate for losing the track it was measured against.
The measurement does not support the compensation: `--ansr-teal-500` is 4.51:1 on the track and 5.14:1
on the card's own white, so the bare bar is the stronger of the two before anything changes. What the
deeper step actually bought was two teals doing one job on one tab — this ranking in the brand teal and
the graduate ranking one section below it in `teal-500`, which is the mismatch ANSR reported. So
`BARE_FILL.subject` is `teal-500` now and the brand teal is the `emphasis` fill alone, which is the one
place a bar is meant to be deeper than its neighbours.

**"20%", not "20.0%".** The reference shows a padded decimal for column alignment. Same value, and
matching set-wide decimals would mean a formatter that reads its siblings — a change to every tab to
buy alignment on one card. Left as it is, and noted.

### The sealed pair, and the control that was not built

**A lock disc rather than a chip, with the words kept.** The derived tabs put "Held back" in a `Chip`
beside the heading; the composition asks for a padlock. The words moved into `sr-only` text on the
disc rather than being dropped — a decorative padlock with nothing announced leaves a screen-reader
user with a card that appears to have no content at all. A browser spec counts the phrase twice.

**The support-ratio preview draws two IDENTICAL groups, and the reference does not.** The reference
shows five dark person glyphs against four pale ones, which is a ratio: a number, drawn, for a metric
whose number never left the server. Each model gets one person glyph and one hatched block of the
same size, so the card states that there are two models and that each has a ratio and asserts nothing
about how they compare. A browser spec measures both blocks and requires one distinct width.

The two model names — "High touch" and "Scaled" — are authored copy, not the withheld structure's
entries, which never cross the gate. They leak nothing: the metric's own `question` already names
both models in public ("once the centre is running, against while it is still being built").

**The matrix preview's `L1`–`L5` and `Role family 1`–`5` are ordinals, not names.** The gate drops the
real row and column names because a row label beside a visible axis can imply the answer, and it
leaves cardinality. The metric's title crosses and already says the columns are levels; the ordinals
add a position in a list and nothing else. A spec asserts the real names ("Analyst", "Senior
manager", "Director") are absent.

**No "Update roles & cities" button, and this is the pass's one refusal.** The composition asks for it
aligned right beneath the two cards. The tool asks five questions and none is a role, a level or a
city, so the button would name a destination that does not exist — which is precisely the defect the
four chevroned answer pills were rebuilt to remove, and precisely what `project.md` means by no copy
claiming something the page cannot show. `HR_HELD_AVAILABILITY` states the condition instead, and a
spec asserts that section holds no button and no link. On the blocked list.

### The function tab strip gains glyphs — REVERSED by the operations pass

Four line icons were added here — laptop, gear, people, chart — `aria-hidden`, keyed by the function
enum, all four or none, with the triggers narrowed to `px-4` so four labelled tabs with glyphs still
fit one line at 390. The argument was that this strip is four cells of a flat list, scanned rather
than toggled, so a glyph shortens the scan — which is a different case from the two-cell VIEW switch,
where an icon is a fourth redundant signal.

**ANSR asked for them off in the operations pass, and the strip is back to four bare labels at
`px-5`.** The argument above is unchanged and simply overruled. See the operations pass below.

### Still open

- ~~The reference's re-labels were not adopted~~ — "Addressable professionals" for "Bench strength".
  **Settled by the project owner: the data's title stays.** Titles are data and shared across tabs.
- **"20%" against the reference's "20.0%".** A set-wide decimal alignment is available and would
  touch every tab. Still open.
- **The milestone pair is tight at 1024**, where "50 FTEs" and "100 FTEs" sit about 6px apart. It is
  legible at every width tested and it is what proportional spacing costs; a wider card or a shorter
  label are the two ways out. **The operations tab now draws the same chart, so this is on two tabs.**
- ~~Operations and finance were not touched~~ — operations was composed in the pass below. **Finance
  is the one derived tab left besides technology.**

## The operations composition pass — three metrics stop being cards

Screen 2's operations tab, rebuilt to a supplied structure and a reference render
(`Operations New View.png` at the repo root). The second tab whose layout is authored. Everything the
HR pass settled about composing a tab holds here unchanged and is not restated; this records only
what is new, and the one figure that was refused.

### What is new: a metric can be a FIGURE instead of a card

The derived tab drew eight cards. Three of them — Grade A office stock, power and connectivity
uptime, days lost to disruption by city — are gone as sections at ANSR's request, and one headline
figure from each is now a cell in the summary row at the head of the tab. That is a shape neither
`layoutArea` nor `HrPanel` had: `layoutArea` promotes a metric to the figure row only if it is a bare
SCALAR, on the stated grounds that a scalar draws no mark and so nothing a card's edges were
measuring can be misrepresented by moving it. These three are breakdowns.

**So the promotion is lossy, and two of the three losses are real.** Recording them is the whole
reason this section exists:

- **`ops-power-uptime` is split on purpose.** Its own note says a single number "would hide the weaker
  one" — 99.95% at a Grade A campus against 99.5% on the Tier 1 city grid. Showing the campus figure
  alone is exactly that. What keeps it honest is that the cell's supporting note is the **part's own
  label**, from the data: "At a Grade A campus with N+1 backup" scopes the figure to the campus, so
  the cell claims nothing about the grid rather than quietly claiming the campus figure for it.
- **`ops-grade-a-office-stock` loses its vacant figure**, and with it the answer to "could we move in
  now". Nothing replaces it. On the blocked list.
- **`ops-disruption-days` loses nothing**, because its cell states the EXTENT of the whole set rather
  than one part of it. See below.

**Three of the four notes come from the data and one from `copy.ts`, and that split is the rule
rather than a convenience.** A note authored beside a figure lifted out of admin-editable data is a
sentence that can drift away from the figure it qualifies; a part's own label cannot. The one authored
note is the disruption cell's, which describes the whole set and therefore has no single part label to
take — and it deliberately does not count the cities ("across the cities assessed", not "the four
cities assessed"), because an admin adding a fifth city would falsify a count silently.

### The refusal that was overruled: "0 days" is not in this dataset

The composition asks the fourth cell to read **0 days**, noted as the lowest recorded across the
cities assessed. The four cities are 4, 2, 3 and 6 days, and the metric's own note puts the national
figure at 3–6. There is no zero.

Three options were on the table:

- **0** — an invented figure, on a screen whose entire argument is that nothing on it is invented.
- **2** — truthful, and the best case presented as the fact. The label says "Days lost to disruption",
  not "in the best city"; the note would carry the scope and the 36px numeral would carry the claim.
- **2 – 6** — both real ends. It states no best case, and it preserves the one thing removing the
  by-city section would otherwise have thrown away, which is how far the cities differ.

**The extent shipped, and the project owner then instructed the cell to read 0, explicitly overriding
this.** So the cell now states a figure the dataset cannot evidence. What the reversal changed and what
it did not:

- The literal lives in `ops-view.tsx` as `DISRUPTION_FIGURE`, never in the metric. `ops-disruption-days`
  still holds only supplied values, admin still edits real ones, and the fabrication is one constant in
  one file rather than a number in the data.
- The four city figures are not on the tab, so nothing on screen contradicts the 0.
- The browser spec that asserted the ABSENCE of a zero now asserts its presence, and says in its own
  comment that it is the reversal. Without that, the next pass over this file reads the 0 as a bug and
  restores the extent.
- `extentOf` is deleted rather than parked. Nothing on this tab reduces a breakdown to a pair now, and
  the en-dash-plus-`sr-only`-"to" rendering in `summary-figures.tsx` (`SummaryFigure.high`) has no
  caller — kept, because it is the shape any future extent would take.

### The summary cards carry no glyph, unlike HR's

HR's three summary cards have a filled teal disc with a line glyph in it. These four have nothing:
no glyph, no illustration, no ring, no bar, at ANSR's instruction that the cells communicate through
typography alone. The reasoning the HR pass gave for having no MARK holds here identically and the
glyph goes for a different reason — four cells at a quarter of the measure are 250px wide at 1440, and
a 56px disc beside a two-line title is most of the cell's leading edge.

Everything else is HR's card verbatim: `rounded-md`, a hairline, `bg-surface`, the figure in
`--ansr-action` at 30/38px Bold, the title in ink at 16px, the unit muted at 14px, the note at 12px on
`mt-auto`. Four columns at `lg`, two at `sm`, one below.

**Figure above title, which is HR's DOM order and not the reference's.** The reference draws the label
first and the figure under it. HR's card puts the figure first, the prompt asks for "large orange
figures with compact dark text beneath", and a summary row that reads one way on one composed tab and
the other way on the next is worse than either. HR's order won.

### One white zone, and the pale teal was refused

Same as HR: all four sections on `bg-surface`, bordered cards at radius `md`, the rhythm between
sections carried by 48/64px of space and a Bold `h2`. The brief permits "very pale teal ... for subtle
section separation" and `--ansr-surface-pale` is deliberately unused — it is about 2% off white, so
against this zone it would not be a boundary at all. That is the same measurement that keeps it out of
the peer view's alternation.

**This tab therefore renders ONE zone, where every other tab renders two or three.** It has no gated
metric, so there is no mint band. The browser spec that asserted "at least two zones per tab" was
relaxed to one — the property it is really about is that ADJACENT grounds differ, and the floor was
incidental.

### `Journey` loses its last caller

The scale curve is drawn by `MilestoneTrack`, which is what the HR tab draws, because the composition
asks for the two composed tabs to draw the progression identically. Operations was the only tab still
drawing `Journey`'s staircase.

**What goes with it is the derived intervals — "+6", "+12", "+12" — and they are now on no screen.**
That is a real loss: the staircase said "six more months to the next hundred", which is the reading a
COO acts on, and a position on a rail does not. `journeyLegs` is still derived and unit-tested and
`metric-card.tsx` still routes a `journey` display to `Journey`, so a progression on a derived tab
would still get the staircase; nothing in the catalogue is in that position today. A browser spec
asserts the intervals are absent, so the loss is a decision rather than something nobody noticed.

### The two charts that stayed charts

- **Network latency** — `RankedBars` inline, with the grey track KEPT. The track is what tells a
  reader where full width is, and only a set sorted by the quantity its own bars encode states that
  itself. This one runs outward by distance, so `selfLabelling` is false and the track is the shared
  axis every row is measured against — which is also the "shared zero baseline" the brief asks for.
  The reference draws a numeric tick axis under the bars (0, 50, 100, 150, 200); that is not built,
  because every row already carries its exact figure beside its own bar and a tick axis would be a
  second reading of a set that is already fully labelled.
- **Graduate output** — one full-measure card, nine disciplines as two `dl`s side by side, four then
  five, in the catalogue's own order so the disciplines stay grouped by family. **One scale across
  both columns is free rather than arranged**: every part's `share` is against the metric's own largest
  value in the view model, so there is no per-column maximum to get wrong. Two `dl`s rather than one
  in CSS columns, because a multi-column `dl` breaks a row across the boundary and would put a label
  at the foot of one column with its bar at the head of the next.

**The figures are abbreviated — "1.5M", not the reference's "1,500,000".** That is the project's count
rule and it is exact rather than rounded: `formatCompact` uses a unit only where the division into it
is exact, so 45,000 becomes "45K" and a figure that did not divide cleanly would keep every digit. The
alternative is a column of seven-digit numerals against a bar, which is the reading the abbreviation
pass replaced across the whole screen. Forking the formatter for one card was the only other option.

### The navigation glyphs come off

Four bare labels at `px-5`, and the `gap-2.5` went with the icons. What the removal buys is that the
two strips at the head of the floating card now carry the same amount of chrome as each other, which
is none — the view switch gave up its glyphs one pass earlier for its own reasons, and the tab strip
was the last thing on the surface reading as an app toolbar. It also retires the breakpoint fiddle
that narrowed the triggers to fit glyphs at 390.

### Settled by the project owner after the render was read

All four deviations from the reference were accepted as drawn, and the three losses the pass caused were
accepted as costs rather than defects. Recorded here so none of them is re-litigated as an oversight:

- **The label sits UNDER the figure**, HR's order, not the reference's — so the two composed tabs' summary
  rows read the same way round.
- **The unit renders as the data's "million sq ft"**, not the reference's "mn sq. ft". A dataset edit in
  admin if ANSR wants the short form; nothing on this screen re-letters admin data.
- **Counts stay abbreviated** — "1.5M", not the reference's "1,500,000". The deciding case was not the
  general rule: `tech-graduate-pipeline` quotes two of these exact figures on the technology tab, so full
  digits here alone would put one number in two presentations one tab apart. Changing it everywhere is one
  constant in `formatCompact` plus test updates.
- **"Bench strength" keeps its title**, the reference's "Operations professionals" being a re-label of data
  shared with two other tabs.
- **The three losses** — the vacant office-stock figure, the Tier 1 grid uptime figure, and `Journey`'s
  derived intervals — are accepted. The uptime scope is carried by the cell's supporting note; the other
  two have no replacement on the page.

### Still open on operations

- **The "0 days" conflict**, above. The one item on this tab that needs ANSR before it ships.
- **Two of four tabs are composed now.** That is the threshold the HR pass named: the next tab ANSR
  wants composed is the moment to decide whether the derivation survives at all rather than a third
  early return to add. Read the finance and technology tabs beside these two before deciding.

## The finance composition pass — the third tab, and the first one that mostly says no

Screen 2's finance tab rebuilt to a supplied structure and reference render (`Finance New View.png` at
the repo root). `FinPanel` in `src/components/screen2/fin-view.tsx`, reached by a third early return in
`AreaPanel`. Everything the HR and operations passes settled about a composed tab holds unchanged: select
by metric id, one white ground, bordered cards at radius `md`, a mint zone for the withheld pair, a
leftover branch so a new metric is drawn rather than silently dropped.

**What is new is the proportion of the reference that could not be built.** HR gave up one control and
operations one figure. Three of this reference's asks are figures and sentences that exist NOWHERE in
this repository, and a fourth is an instruction the whole tool is already under. Each is asserted absent
by a browser spec and each is on `handoff.md`'s blocked list.

### The four refusals

- **"Operating cost advantage vs global peers — 30–40% lower"**, the leading card of the overview row.
  Searched the catalogue, `docs/brief.md` and the dataset: no such figure. The nearest is a 55–65% wage
  gap inside `fin-cost-growth`'s admin note — a different quantity against a different base, and a note
  does not cross the gate. **The row is three cards, not four**, which is the shape the two
  cost-durability metrics were added in and which fills a row exactly.
- **A second "Cost structure breakdown"** — people 64%, facilities 13%, technology 9%, business services
  8%, other 6%. Unsourced, and it would sit beside `fin-cost-composition`, whose 72/12/8/8 split is what
  `docs/brief.md` asks for under that exact name. Two splits of one subject, one invented.
  **This is the refusal that changed the layout**: with one analytical panel instead of two there is no
  balanced two-column row on this tab, and the drivers chart takes the whole measure — which is the width
  `metricWidth` gives a stacked whole anyway.
- **The "Deep dive" section** — three columns of bullets under "Top cost drivers", "What's cheaper in
  India", "What's similar". Every bullet would be an unsourced claim about cost.
- **"Book a conversation"**, in a "Need a closer look?" card. Not a data question: ANSR removed the CTA
  from both screens, and a spec asserts the public surface holds no outbound link at all.

### The axis refusal, which is about drawing rather than about data

The tier-spread cards are asked for on a **50-to-125** scale with ticks at 50, 75, 100 and 125. That puts
75 against 100 a third of the way along a track rather than three quarters — a 25-point difference
magnified into a 2:1 picture. `project.md` bans exactly that for a cost index, and `Dumbbells` already
carried the argument in its own comment: both marks on a cost index sit near the top of the scale, so a
truncated axis is how one would be faked.

So `IndexSpread` draws the zero-based axis the view model already shares across the whole metric. Two
things make that legible rather than merely honest, and the first was found by reading the render:

- **Both ends of the rail are labelled — "0" and the base's own figure.** Without them two marks at 75%
  and 100% of a zero-based track render as a short segment floating at the right, which is the exact
  defect `RangeBar` was rebuilt to fix. The first render had the ticks missing and looked unfinished.
- **The comparator's mark carries its own figure beneath it — 75, 85, 81 — added at ANSR's request.** It
  is the third appearance of that number on one card: the pair of figures above, this label, and the delta
  beside the heading as a difference from 100. Normally the repetition this screen removes; kept because
  the rail is where a reader looks to see WHERE the cheaper option sits, and a positioned mark with no
  number on it sends them back up to the pair to work out which of the two it is. Centred on the mark and
  `whitespace-nowrap`, so it never wraps and drags the row's height; the base needs no such label, the rail
  ending at it. What it has to clear is that end tick — at 85 against 100 the two sit 15% of the rail
  apart, about 30px on the narrowest card this draws in, which is enough for two two-digit labels. The
  browser spec that reads positioned marks out of the `aria-hidden` wrapper now expects three per card
  rather than two.
- **The difference is stated in text**, as the signed delta beside each card's own name — "−25 vs Tier 1
  cities". Index POINTS, not a percentage: the base is 100 so the two coincide, but writing "%" would be
  a component adding a unit the data does not carry.

### Two drawings replaced, and both had a reason beyond the ask

- **The tier spread was `Dumbbells`** — three rows on one axis — and is **three cards**. One measure per
  card, its delta under its name, and its two indices on the rail rather than above it.
- **The location comparison was `IndexLollipop`** — a plot per row — and is **`IndexTable`**, a real
  table. The argument is what the reader is doing: four functions against five locations is twenty
  figures compared DOWN a column as much as along a row, and a row of dots cannot be read down.

**The bars and the emphasised row are gone, at ANSR's request, and the table is figures alone.** Four
decisions are deleted with them and are recorded here because each was measured, so restoring either mark
means restoring the reasoning rather than re-deriving it: the base column carried no bar (India is the
same figure in every row, so a bar on it would be four identical marks encoding the axis — sixteen bars,
not twenty); the bars were bare and shared one maximum, the grid's largest cell at 367, which is the
self-labelling exemption that licenses dropping a track; `teal-500` measured 5.14:1 on white and 4.04:1 on
the emphasised row's own tint, both clear of the 3:1 floor 1.4.11 asks of a non-text graphic; and where the
tinted column and the tinted row crossed, the ROW won, because two tints of one value draw an L that breaks
in a single cell and a row whose fill stops in the middle reads as a rendering fault.

What the removal cost, stated plainly: the bars were this card's only encoding of magnitude, so twenty
indices are now compared as numbers. Defensible at four rows by five columns and not at a wider grid.
What it bought: the figures are one element per cell — and with no emphasised row, `IndexTable` reads no
admin-editable string at all, which returns `metric-card.tsx`'s capability grid to being the only place on
this screen that does.

### The table is CENTRED in EQUAL columns, and the two are one decision

Asked for at ANSR's request, and the alignment alone would not have fixed what was wrong. Start-aligned
digits in an auto-width table put each column's figures against a boundary decided by the longest header
above them, so "PHILIPPINES" held its three digits near the middle of a wide column while "MEXICO" held
its at the left of a narrow one, and twenty figures read as five ragged groups instead of one grid. So the
layout is fixed: the row-header column takes a quarter and the five locations divide the rest, which makes
the equal widths a property of the table rather than of the strings in it. Centring then puts each figure
and its own header on the column's shared axis, which is what makes the grid readable DOWN — the reading
the table exists for. `tabular-nums` was already doing the within-column part.

**The minimum width is back, for the opposite reason it was removed.** It came off with the bars, which had
forced the table wider than its card at every breakpoint. A fixed layout has the inverse failure: it never
overflows, so on a phone six columns divide a ~330px card and every header wraps to three lines. `min-w-xl`
and deliberately not the `2xl` the bars used — at `2xl` the last location fell outside a 768px card and had
to be scrolled to, on a layout that fits a tablet unaided. Only a phone scrolls it now, inside the
container, never the document.

### The tier spread's rail is inset by half a marker, and its cards align on a subgrid

Two defects, one section, and neither was the axis. The rail runs zero to the base, so the base's share is
1 by construction on every row of this metric — which centred a 16px disc on the track's last pixel and
left half of it hanging outside the column into the grid gap while the zero tick sat flush inside at the
other end. The marker is a spacing step, so the inset is half of it — `margin-inline` on `.gcc-index-rail`,
which the whole chart shares: both extremes sit wholly inside one measure and the two ends match. The base's own
figure moved off `end-0` onto its marker's position in the same pass — right-aligned, its centre sat half a
label short of the disc it named, so one axis had its two ends labelled by two different rules.

And the three cards now share a two-row subgrid. The measure names are three different lengths and each
carries a chip naming the base, so the header was one line on the middle card and two on the first — which
pushed one card's figures, rail and axis a whole line below its neighbours' and read as three unrelated
charts rather than one comparison. The chip also moved UNDER its heading rather than beside it: it wrapped
anyway on two of three cards, and a chip that lands below its name on one card and beside it on the next is
the same inconsistency the subgrid removes. `content-start` keeps the shorter card from stretching its own
contents to fill the taller row.

**The India column keeps its fill and its heading-teal figures**, which is what the instruction asked to
keep. It is the base every other figure is read against, so it is the one thing in the grid still marked —
and with the row emphasis gone it runs unbroken, so the crossing rule above has nothing left to arbitrate.

### The shared legend became a per-figure key, and then no key at all

The reference puts one Tier 1 / Tier 2 legend above the three cards. Built that way first, and the render
showed why not: every card already named both columns above its own figures, so the legend made each column
name appear FOUR times inside one section. The disc and the ring moved onto the labels that were already
there, and `IndexSpreadKey` was written and then deleted rather than left unused. Both are moot now — the
names sit directly above the marks they belong to, so the marker's shape needs no key at all.

### The display pair came off and the names moved onto the marks

Asked for at ANSR's request, and the card was carrying the redundancy plainly once it was pointed at: each
index was a 30px figure under its column name AND the same number again as a small label under its own mark,
so a card whose entire subject is one difference held four numbers. What is left is the rail. Each point is
one positioned column — name above, mark, figure below — which is `.gcc-milestones`' geometry, chosen for
its reason rather than by resemblance: a name, a mark and a number that belong together should be one thing
in the DOM as well as on screen.

Three consequences, each a decision rather than a fallout:

- **The rail stopped being `aria-hidden`.** Hiding it wholesale was right while the figures existed in text
  above it; with the pair deleted, hiding it would have left the card's own numbers in no accessible reading
  at all. Only the marks and the origin are hidden now.
- **The figures took `text-lg`, not the pair's `text-3xl`.** Three figures share one row and the two that
  matter sit 15 to 25% of the rail apart, which at the display step collide on the narrowest card the chart
  is drawn in.
- **The set goes three across at `lg` rather than `md`.** At 768 three columns are ~180px each, which puts
  the marks 27px apart and rendered as "Tier 2Tier 1" and "85100". Screen 2's card grids already gain their
  columns at `lg` for their own reason, so this is the screen's rule rather than an exception to it.

**The column names were shortened in the DATA, and that is the whole reason the labels fit.** "Tier 1
cities" above a mark is ~70px against a 43px gap. `Tier 1` / `Tier 2` in the catalogue and in
`dataset.json`, with `indexBaseline` moved to the same short form so the subtitle and the mark do not name
one base two ways. Trimming the string in `IndexSpread` would have been the quick version and is banned:
a column name is admin-editable, so the renderer would have been parsing a label. The consequence to keep
in view is that a long name typed in admin makes those labels long again — it wraps upward rather than
displacing the mark, which is the degradation the reserved label row buys.

### Three smaller deviations, each recorded so it is not re-litigated

- **The heading is unchanged.** The reference asks for "FUNCTION OVERVIEW"; `FIGURES_HEADING.finance`
  stays "India's cost base at a glance", because the reference's version names nothing the reader is
  looking at where the other three tabs' rows name a subject. What the ask does buy is the **qualifier** —
  "Year-on-year growth", beside the heading at the smaller step, which all three figures share and none
  of them carries as a `unit`.
- **No "vs last year" sub-line, and no shortened card labels.** Every one of those titles already ends in
  "year on year", and shortening a title to make room would mean parsing an admin-editable string.
- **"Lower index = lower cost" is stated once**, as the panel's subtitle via the metric's own
  `indexBaseline`, rather than under each of the three scales. Three copies of one sentence inside one
  section is the redundancy this screen keeps removing. The **"View by: Total operating cost" selector**
  is not drawn either: there is one view of this metric, so the control would have one option and nowhere
  to go — the same defect as HR's missing "Update roles & cities" button.

### The uppercase question, decided against the render

Every section heading in the reference is small uppercase with wide tracking. On this screen `tracking-caps`
uppercase is the treatment for COLUMN headers and other small labels, and section headings are 20/24px Bold
sentence case on both other composed tabs. Adopting the reference's idiom on finance alone would have put
two heading systems on one screen, visible to anyone crossing from HR — which is the failure
`VELOCITY_HEADING` exists to prevent. The words are taken where they name something; the case is the
screen's.

### What the pass costs, and what is now load-bearing

- **`Dumbbells` and `IndexLollipop` join `Journey`, `NestedBar` and `RangeBar` with no live caller.** Five
  renderers, all still what `metric-card.tsx` would route a derived tab's metric to. Technology has no
  index grid, which is why these two are unreachable rather than merely unused.
- **`FIGURE_COLUMNS[3]` in `metric-card.tsx` has no live caller either.** Technology's five is the only
  count the derived figure row now produces.
- **The part-empty-row spec was measuring the wrong box.** It took every row's available width from the
  first card's parent, which held while the first card was always inside a padding-free grid; a composed
  tab can put a full-measure `Panel` directly inside the zone's own padded container, and a 1120px card
  measured against a 1184px padded box reports 0.946 for a row that is completely full. It reads each
  row's own container content box now.

### Still open on finance

- **The three unsourced asks.** Two of them — the peer cost advantage and the cost-structure split —
  become one dataset edit each the moment ANSR supplies a figure, since a definition already exists for
  neither and would be a catalogue change. The deep dive needs source material before it needs a design.
- **The 50-to-125 axis** is a deliberate refusal, not an oversight. If ANSR wants the magnification it is
  a decision to overturn a written invariant, and it should be taken as one.
- **Three of four tabs are composed.** The derivation now draws exactly one tab. A fourth composition
  request is a request to delete it, which is a bigger change than a fourth early return.

---

## The benchmark pass — the four function tabs are held to the peer view

The peer view was read as the reference and the four function tabs were measured against it, on
instruction: the charts and the figures stay, everything about how they are written, spaced, sized and
contained comes into line. Nothing on the peer view was touched.

### What the audit found

One screen with four answers to every question. The tabs differed in ways no reader could attribute to
anything but which file drew them:

| | technology (derived) | HR | operations | finance |
| --- | --- | --- | --- | --- |
| opening row | borderless figures, line glyph over each, CSS hairlines between cells | 3 bordered cards, 64px filled teal discs | 4 bordered cards, no glyph | 3 bordered cards + a qualifier beside the heading |
| card container | `Block`, no border | `Panel`, 4px radius | `Panel`, 4px radius | `Panel`, 4px radius |
| section rhythm | one zone per section, grounds alternate | ONE white zone, 48/64px gaps | ONE white zone, 48/64px gaps | ONE white zone, 48/64px gaps |
| withheld group heading | `heldHeading` — "depend on" | `HR_HELD_HEADING` — "shaped by" | n/a | `heldHeading` |
| units | at the figure's own size — "8.7M+" all at 38px | same | same | same |

Against the peer view: bordered square cards for anything with a mark, `Block` for text or a grid of
its own cards, zones alternating under both at the zone's own padding, one snapshot row of bare
typographic figures with the unit two scale steps down, and a 12px caps eyebrow naming it.

### The opening row — one component, on the snapshot's treatment

`screen2/summary-figures.tsx`. Four implementations became one, and the shape is Screen 1's snapshot
copied rather than approximated — which matters because that strip has been through three iterations
and two of the four shapes replaced here are ones it already rejected:

- **A bordered box on a tint reads as a table.** That is why the snapshot's first version — one
  container divided by grid-gap rules — was abandoned when it landed on the mint band.
- **A pale disc holding a line icon is the stats block every generated dashboard ships with.** The
  snapshot's second version was exactly HR's supplied composition, and it was the first 200px inside
  the card, so it set the register for everything below it.

Operations and finance already carried no glyph at ANSR's instruction that those cells communicate
through typography alone, so the tab that had discs was one in four and the tab that had line glyphs was
one in four. Both went. The dividers went with them: they were CSS keyed to a `data-cols` count because
which cell begins a wrapped row changes at every breakpoint — correct mechanism, ruled-out device.

**The unit is two real scale steps down and baseline-aligned.** 36/48px numeral against a 20/24px unit,
never `0.55em`, which renders 26.4 and 20.9 and puts two sizes on the surface that nothing else uses.
The split is `figureParts` in `screen2.ts`, in the view model rather than in the component: the rule it
has to clear is that a unit is a field rather than something a component regexes off a value, and what
that rule is protecting against is a component parsing data it did not produce. This module produced the
string, so the trailing alphabet is closed — `%`, `M`, `K`, `+` — and everything else comes back whole,
which is what keeps a grouped count, a bare index and a signed delta intact.

**One column below `sm`, not two.** At 36px a figure and its unit are most of a 171px half-cell at 390.

**The fixed figure box stays; the reserved label-and-unit pair goes.** The box is what lands every label
in the row on one line. The `min-h-16` under it bought an aligned bottom edge against no visible edge, at
the cost of up to 24px of declared empty space in three of five cells to tidy the one whose title wraps —
which is the spread-out reading this pass was called in to fix.

### Cards, corners and zones — one answer per surface

`MetricCard`'s container default went back to `panel` and the composed tabs' `radius="md"` came off. Both
reverse decisions recorded in this file, and the arguments for them were not wrong — they were local. A
colour change plus two hairlines IS two devices doing one job; a bordered card DOES supply its own
boundary; an inline ranked row's bar IS in a 38% middle column with no track, so the card's edge was
never its reference. None of that survives a visitor clicking between two tabs and finding a different
surface with the same content on it.

`TabZones` in `screen2/zones.tsx` is the single implementation of the sequence: white first on every tab
— the function tab strip sits on the section's own white, and a mint opening zone would put a colour
change immediately under the strip — then strict alternation from the list of sections a tab actually
has. The 48/64px section gaps went with it; two zones' own `py-8 md:py-10` is 80px at a boundary, which
is more than the gap it replaces, and it is the peer view's rhythm rather than a per-tab number.

**What the change costs, stated because it was the earlier version's whole point:** on HR and finance the
mint no longer means "everything on this ground is withheld". It is every other zone now. The sealed pair
still carries a firmer border, a lock and a chip; the ground was the fourth of four signals.

**One card inside a card is still forbidden.** The finance tier spread's three measures each sat in a
bordered 4px box inside the bordered `Panel` holding them — the same nesting the peer view removed when
it stopped wrapping five floating company cards in a sixth bordered box. Three columns separated by
space now, grouped by the adjacency of each one's name, difference and rail.

**Two grid gaps came down**: the metric grid from 32/40px to the peer view's own 24/32px, since 40px
between two bordered cards inside a zone padded at 40px read as three separate objects; and the held grid
from 16px to the same 24/32.

**The hiring-speed pair takes `items-stretch` with a centring body**, which is the peer view's fix for
its own analytical row. One of those two cards carries endpoint labels and a caveat and the other carries
neither, so at `items-start` the shorter one ended ~70px above its neighbour and left a band of bare zone
beside it — the gap was between the cards rather than inside either, which reads as a card that failed
to fill.

### Copy

Six changes, all of them cuts, and each one either moved a job into a heading or left the claim to the
evidence beside it — which is the peer view's own removal doctrine.

- **"at a glance" off all four figure-row headings.** Eleven characters of padding on a caps line whose
  job is to name a subject. The earlier defence — that the row introduces nothing, so the phrase
  describes its relationship to the rest of the tab accurately — is true and is not the reader's problem.
- **`VELOCITY_HEADING`: "Hiring velocity benchmarks" → "How long hiring takes".** One consultant noun
  and one artefact noun, for a section whose two cards are measured in days.
- **`OPS_SECTIONS.supporting`: "Supporting operational benchmarks" → "Scale and connectivity".**
  "Supporting" ranks the section against its neighbours, which is our filing problem; "benchmarks" names
  the artefact. The two cards are the scale curve and network latency.
- **`HR_SECTIONS.analysis`: "Scale and salary analysis" → "Scale and salary pressure".** "Analysis" is a
  word about us doing analysis.
- **`heldHeading` is the only wording for the withheld group**, at ANSR's "shaped by". HR had a constant
  of its own, so one screen headed one group two ways.
- **Three sentences unrendered, exported and asserted absent** — the pattern this project uses for a
  removal that costs a claim: `HR_HELD_LEAD` (a fourth statement of its own heading),
  `FIN_FIGURES_QUALIFIER` (all three titles in that row end in "year on year"), and
  `FIN_DRIVERS_INSIGHT`, which was a filled mint strip saying what its own bar draws at 72% of the card's
  width. The `leads` guard went with the last one; restoring the line means restoring the guard.

### Still open after this pass

- **The technology tab is the only derived one and now the only justification for `layoutArea`,
  `metricWidth`, `packWidths` and the derived split.** Unchanged from the finance pass, and this pass
  made the four tabs look alike, which makes the derivation easier to delete and no more correct to.
- **The figure row's ragged sub-lines** where a title wraps to two lines — technology's fourth cell. The
  fix is a reserved height, which is what was removed; it is a real trade rather than a defect.
- **Nothing has been read on a phone or at 768.** The suite asserts no horizontal scroll and no
  part-empty row at 1440, 768 and 390; the render was read at 1440 only.

## The capability grid: rectangles, and a key that decodes

Three changes to `OrdinalGrid` on the technology tab, all at ANSR's request against a reference
render. Supersedes two decisions in "The capability grid: segments only, and the key moved"; the
inversion argument there is untouched and is still what licenses the `sr-only` rating in the cells.

### The mark is a landscape rectangle, not a square

`RATING_MARK` is `h-2.5 w-4` — 16×10. It was 10×10 for a pass, and the shape is not a preference:

- **Four squares in a row read as four separate objects**, which a reader counts one at a time. Four
  rectangles read as **one segmented bar that happens to be part-filled**, which is the comparison
  down a column that a rated matrix exists for. At 10×10 the grid still contained the information and
  had stopped delivering it at a glance.
- 16×10 with a 4px gap restores the **76px marker group** the column headings were already centred
  over — that number is in the heading's own comment and had been wrong for a pass.
- The table's floor moved with it, `min-w-md` → `min-w-2xl`: four columns of marker group plus 32px of
  padding each, plus the row header, needs about 610px before anything wraps. Below that the grid
  scrolls **inside its own container**, which is the contract it already had.

### The key is drawn, not listed

It was `AxisNote` holding `steps.join(" · ")` — "Developing · Moderate · Strong · Very strong". That
is not a key. **The cells carry a COUNT and a run of middot-separated words states only the ORDER**,
so a reader meeting a cell with two filled marks had to infer from position in a list that two means
Moderate. Each step now draws its own fill against the same four-segment track: `▮▯▯▯ Developing`
through `▮▮▮▮ Very strong`, which is the pairing and nothing more.

### Below the grid, at the trailing end

Also asked for, and it gives up the argument that put it above — that the segments are the only
visible reading, so a reader needs the scale before the thing it decodes. What it does **not** give
up is the licence, because that rests on the four ordinal words being present in TEXT somewhere in
this card, which is a property of the document rather than of the order. Drawn rather than listed it
is also legible on the way back: a reader who meets an unfamiliar cell looks down, not up.

### The key's marks are half the area of a cell's

`RATING_KEY_MARK` is `h-1.5 w-2.5`, same ratio. Drawn at the cell size first, and rendered that way
the key was **sixteen marks of exactly the weight of the eighty above it, one gap under the last
row** — so it read as a fifth data row for whichever location the eye landed on. ANSR reported it as
interference with the table, which is exactly what it was.

The obvious argument says a key should match the size of what it decodes, and it loses here for one
reason: **the words are on the key**. A reader pairing "two filled" with "Moderate" needs the
pattern, not the scale, and the ratio carries the pattern at any size. The size is what says chrome
rather than evidence. Gaps came down with it — `gap-x-4` between entries, `gap-1.5` to the word,
`gap-0.5` between marks — so the whole key is one line at 1440 and two at 390, right-aligned both
times.

### Pinned

- A new spec asserts the cell mark as **geometry** (`width > height × 1.3` on all eighty), because
  the shape is the finding and a class assertion passes on any width.
- The key spec now asserts three things it did not: sixteen marks present, the key **below** the table
  rather than above, and its trailing edge past the card's midpoint. Plus the key mark under 75% of a
  cell mark's area — the one property that regressed inside this pass.

### Still open

- **Read at 768.** Verified on a render at 1440 and 390 only. At 390 the grid's scroller shows two
  columns of four, unchanged by this pass.

## Graduate output returns to HR, and the card moves out of the operations tab

ANSR asked for the nine-discipline graduate breakdown on the HR tab as well. `hr-graduate-output` had
been removed one pass earlier at their own request, so the whole change is a restoration — HR went ten
metrics to nine to ten, and no figure was edited in either direction.

**One line of data, and one component moved.** The catalogue entry is `onTab(GRADUATE_OUTPUT,
"hr-graduate-output", "hr")`; keeping the metric authored once through the pass where a single tab drew
it is what reduced the restoration to that. What was NOT acceptable was copying the drawing: the card
was a local `Graduates` function inside `ops-view.tsx`, and a second copy in `hr-view.tsx` would be two
readings of one figure — the same nine parts split into columns one way here and another way there,
diverging the first time either file was touched. So it is `GraduateOutput` in `graduate-card.tsx`, and
both composed tabs call it. Same argument as `VELOCITY_HEADING` being a constant rather than the same
words typed twice, and as both composed tabs drawing the scale curve through `MilestoneTrack`.

**It is the LAST analytical section on the HR tab, not a fourth benchmark in the middle of it.** The
three above it are about the visitor's own hiring — how many people are reachable, how fast a seat
fills, what the same person costs next year — and this one is about where next year's intake comes
from, which is the supply all three stand on. Reading order follows that, and it also puts the tallest
object on the tab at its foot rather than between two shorter ones. Operations places the same card in
the same position, so a reader crossing between the two tabs meets it in the same place.

**It takes a zone of its own from `TabZones`, so the alternation absorbs it.** Nothing about the
grounds is written per section: HR now has five sections rather than four and the mint lands where the
list puts it. Nothing else on either tab moved.

### Pinned
- A new browser spec reads the `dt`/`dd` pairs off both cards and asserts they are **identical**,
  which is the property the extraction exists to guarantee. It reads pairs rather than geometry
  because the card is two `dl`s above `lg` and one below it.
- HR's section-order spec is five entries now, with the graduate card located by
  `metric-hr-graduate-output` rather than by `expectBand` — it is a bare `Panel` under the metric's
  own title, not a `Block` wrapping cards.
- Three counts moved and each was a deliberate edit: HR is 8 + 2 metrics, 3 figures + 5 cards from
  `layoutArea`, and 3 + 7 `metric-*` sections on the render.

### Still open
- **Read the HR tab at 768 and 390.** The horizontal-scroll spec passes at three widths, but nobody
  has looked at the new card's two columns collapsing to one under the salary ranking.

---

## Appendix — decisions moved out of `project.md` (2026-08-31)

`project.md` was cut from 1,716 lines to 765 because it had become the record of every rejected
alternative as well as the rules, and it is paid for on every turn. The division of labour is now
explicit: **`project.md` states what must hold; this file states what was tried and why it lost.**

Most of what follows already has a fuller account in a section above — this appendix exists so that
nothing was lost in the cut, and so a reader who only finds a rule can find its history. Where a section
above covers an item, that section is the better read.

**The result surface.** Glass before solid: a translucent rim over a `backdrop-filter` reads as a default
rather than a decision, and on a flat ground plus a smooth fitted gradient there was almost nothing to
blur. The shadow cannot come from `--ansr-shadow-*`, which are fitted at 8–14% of `--ansr-teal-deep` for a
light surface, and this ground IS teal-deep.

**The view switch, four rejected indicators.** A content-sized notch sticking out of the card's top edge —
a rounded tab meeting a rounded card is two curves that have to agree and cannot. A 3px orange accent bar
over the selected tab — the most reproduced device in the framework-template idiom, and the only orange on
the surface not doing the job the board gives orange. A `--ansr-teal-500` edge under the *unselected* cell
with a one-step curve on its lower corners — rendered, a coloured line arriving from nowhere, stopping
halfway across the card's top edge, curving out at each end. A translucent darken over the unselected cell
— rendered as a saturated slab heavier than the version ANSR had just asked to lighten. The bar's ground
moved `teal-200` → `teal-100` at ANSR's request that the unselected half be more transparent; only the
direction of that step is constrained. The two 20px line glyphs went because on a two-cell switch where
exactly one is always selected an icon is a fourth redundant signal, and it was the one that made the row
read as an app toolbar; it also retired the breakpoint rule that dropped them below `sm`.
"Function Opportunity" → "Function Metrics": "Opportunity" sold the view before the visitor reached it and
named nothing on it, and the new pair is both {qualifier + what you get}.

**The four answers, three shapes.** `dt`/`dd` pairs beside one "Change these details" button made a
visitor notice a wrong revenue band in a caption and then hunt for an unrelated control. Four full-width
chevroned buttons, one per answer, was worse in a way only the render showed: four affordances for one
destination, a chevron promising an in-place editor that does not exist, and a group reading as four
dropdowns directly under the product name. Pills plus one "Edit answers" button is the third. The button
was pushed to the trailing end of the container, which at desktop left up to 700px of empty band between a
control and the only things it acts on; and it was `min-h-11`, which made the only chrome in the band the
loudest object in it beside four 30px tags — hence the pill size with the target expanded off-screen.

**The peer landscape, two rejected surfaces.** Seven full-bleed bands: a 200px display hero stating the
finding, seven grounds, 80–112px of air and 48px headings — a landing page, which read badly in the ninety
seconds this audience gives it, put the first figure below the fold, let no two pieces of evidence be
compared side by side, and ended on navigation and a CTA rather than evidence. Then one flat white surface
of eight bordered cards with 16px headings: correct, dense, and cognitively flat, with nothing telling the
eye that the comparison set and the national scale proof are different kinds of claim. Eleven `Panel`s
became four when the border became earned; `PanelTone` went from four values to three, `tint` differing
from `plain` by about 4% lightness with no caller and `accent` being the gradient heading strip that
`weight="lead"` replaced.

**The comparison block, two rejected shapes.** A full-width lead card carrying the closest match at
display size left that company the one member of the set that could not be compared with anything. A
five-row table was a spreadsheet dropped into a brand page: four of its five columns held a chip list, a
year and a band rather than anything a reader ranks down a column, no cell could carry a figure at a size
worth reading, and on a phone the column a reader came for was behind a horizontal scroll. Three ordinal
devices died with the multi-row grid — a "Closest comparison" chip, a mint-filled square counter, a
`Match N` eyebrow — because on one line reading position states the order exactly. Label prefixes dropped
at ANSR's request: "India employees" and "India locations" named the country the whole page is about and
left the reader to infer that the subject is the centre rather than the company, and "Established {year}"
half-promised 1799 on a JPMorgan Chase card. The bars went at ANSR's request, each card carrying its band
as a 20/24px figure instead — 30px overflowed a 205px cell.

**The containment chart.** Stepped tracks lost because a gap is the one thing the eye reliably reads as
separation, which is the opposite of "inside"; concentric bars collided at phone width, which is a
function of the ratio between two real figures and therefore has no safe viewport. The old label rule put
each label on whichever side of its own mark had more room, which is defensible per label and rendered as
three different indents with two of them floating in the middle of the pale parent field. The innermost
layer as an extent was a floored sliver at 0.27% with the card's lower two thirds empty tint; a log or
square-root axis was refused because buying visibility by making the length a lie is the same move as
truncating an axis.

**The largest-centres block.** As a list of company cards it duplicated the comparison set — three of five
in BFSI — restating each company's headcount range, city list and year in a bordered card the reader had
passed a screen earlier, under a chip admitting the repeat and resolving nothing; roughly a third of the
page was the same data twice. Both blocks were legitimate, so the CARD went and the content stayed. The
city and year tags then came back at ANSR's request, the earlier removal having been one step stronger
than its own finding: as pills they cost ~26px a row and answer what a ranking otherwise leaves open.
Three figure arrangements: at the trailing end of the NAME row (right until the tags existed), then a tag
line of its own (which put the pills between the figure and its own bar), then down beside the bar (which
left a void across the card's leading half). The bars sat in a 224px column at the trailing end, where 71%
against 53% is 40px of difference across a 350px gulf. `largestAxisNote` was the fourth appearance of the
same two values under a ranking whose first row IS the axis.

**The scale strip.** Two proportion bars went because a headcount sum has no fixed list behind it, so the
third cell could never carry one. The share then moved into the sentence and was removed from there too at
ANSR's request. The third figure was the Fortune subset alone standing in as the total for both lists;
adding two separate sums would overstate by 60%, since 171 of the 181 Fortune companies are also in the
Forbes 2000.

**The snapshot, two rejected shapes** — one bordered container divided by grid-gap rules, then four tiles
with icon discs. Labels were de-interpolated because "Share of India's GCCs in {industry}" at 34
characters beside another at 24 under four perfectly aligned figures stated the same word three times
inside 900px. The leading city was `--ansr-accent-warm` at 20/30px beside `--ansr-action` at 36/48 — two
oranges and a two-step gap, reading as a cell from another component. The `%` was `0.55em`, which renders
26.4px and 20.9px and puts two sizes on the surface that nothing else uses.

**Screen 2's figure row, four shapes collapsed to one.** Technology's borderless row with a line glyph over
every figure and CSS hairlines between cells; HR's three bordered cards each with a 64px filled teal disc;
operations' four bordered cards; finance's three with a qualifier. Two of those four were shapes the
snapshot had already rejected — a bordered box on a tint reads as a table, and a disc holding a line icon
is the stats block every generated dashboard ships with. The dividers were CSS keyed to a `data-cols`
count because which cell begins a wrapped row changes at every breakpoint: a real problem, correctly
solved, for a device the snapshot had ruled out. `min-h-16` reserved the label-and-unit pair, which buys
alignment against no edge once the cells are bare, at the cost of up to 24px of declared empty space in
three cells to tidy the one whose title wraps. "at a glance" went from all four headings: eleven
characters of padding on a caps line whose job is to name a subject is what makes it read as a label.

**Screen 2's surface, and why the borders came back.** For a pass the two halves disagreed — see "Screen 2
— the decisions it settled" above. `third` was dropped from `metricWidth` because it mapped to six columns
below `lg` and four above it while the packing rule reasoned in thirds-of-twelve, so a layout that tiled
perfectly at 1440 could leave a hole between `sm` and `lg`. The grid moved from `sm` to `lg` because two
cards abreast from 640px gave each a 300–490px column, and both of technology's halves broke in it: a 24px
figure inside a proportional block 81px wide, and a name, a bar and a figure competing for 350px. The
breakdown threshold moved from five parts to seven because seven specialisms at full measure put the
longest bar across 1,120px, where the eye travels the whole card to reach a figure 4% longer than the one
above it. `packWidths` moved from the component into `screen2.ts`, reversing a recorded decision: it lived
in the component because a card's width is a bet about what sits beside it, which was right while there
were three widths and the browser's auto-placement of a `third` was part of the answer.

**`Journey` → `MilestoneTrack`.** What went with the staircase is the derived intervals ("+6", "+12",
"+12"), which are the reading a COO acts on — a position on a rail does not say "six more months to the
next hundred". Accepted by the project owner, because restoring the reading means restoring the staircase
on one tab, which then makes the two composed tabs draw one progression two ways.

**The function list.** A four-column ruled grid, and every column count eight items may take fails the same
way: a fixed column is as wide as the longest item, so "Human resources" sat in a 270px cell holding 110px
of text while the longest item still wrapped to two lines — ragged and short of room at once. Two columns
is that at twice the width; three would leave the last row a cell short. As tags the block fell from ~240px
to ~90px. The eight rank badges went with the order claim: they made a hardcoded list with no per-company
record look measured, and the element changed from `<ol>` to `<ul>` because an ordered list is an ordering
claim in the accessibility tree and would have outlived the badges. `COMMON_FUNCTIONS`' longest entry was
"Business operations & shared services" at 37 characters — half again the next longest; "business" was
doing no work, since a GCC's operations function is business operations by definition.

**The capability grid.** 10×10 marks for a pass: four squares in a row read as four separate objects to be
counted one at a time, where four rectangles read as one segmented bar that happens to be part-filled,
which is the comparison down a column a rated matrix exists for. 16×10 also restores the 76px marker group
the column headings are centred over. The key was a listed "Developing · Moderate · Strong · Very strong",
which states the ORDER of the steps and nothing about which fill count is which, so a cell showing two
filled marks was undecodable. Moving it below the grid gives up "a reader meets the scale before the thing
it decodes"; what it does not give up is the four ordinal words being present in TEXT somewhere in the
card, which is what licenses the `sr-only` rating. Drawn at cell size, sixteen marks one gap under the last
row read as a fifth data row.

**The header finding.** Removed for a pass on Screen 2, on the argument that its content already opens on
the finding as a real `h2`. What that missed is that the band is shared: crossing between views in one
state change dropped a whole row out of it and jumped the answer pills 60px up the page, so one header read
as two. Screen 1's old line came from `framing().title` and read "5 India GCCs match your BFSI profile" —
false in the one direction that matters, because five is what the grid SHOWS, capped by the peer limit. The
first function-view line held `{industry}` and was verified on BFSI alone, which is why interpolation is
now banned outright: industry names run from "BFSI" to "Agribusiness & Food Processing".

**The `h1`.** It was the wordmark alone with a period set after it in the action orange, because the
wordmark's artboard has no punctuation in it — so the one place ANSR's mark belongs was the one place it
was absent, and the product's name ended in a full stop nothing else on either screen uses. Sizing the
artboard to the font size instead of the wordmark's cap height sets the name at two fifths of the type
beside it.

**Metrics removed and restored.** `hr-workforce-diversity` deleted at ANSR's request, taking HR from
eleven to ten — DELETED rather than gated or emptied, because a gated card says a figure exists and is
being held, an empty definition is one an admin can half-fill into a live card, and this is out of scope
rather than either. `tech-community-events` deleted on the same reasoning, and deliberately not folded
into the figure row: the ask was for the community evidence off that page, not moved up it.
`hr-graduate-output` was removed on the argument that a nine-way disciplinary split is a claim about
national graduate supply while the decision on that page is about hiring a team — overruled rather than
disproved, because the commerce, finance and human-resources streams are the ones a CHRO recruits against.
`GRADUATE_OUTPUT` was never touched through either pass, which is what made restoring it one line; the
tidy-up available while one tab drew it was to inline it and delete the `onTab` spread, which would have
been wrong twice.

**The composed tabs' refusals.** Finance refuses four asks — a "30–40% lower" operating cost advantage
that exists nowhere in this repository (the nearest thing is a 55–65% wage gap in a gated admin note,
a different quantity against a different base), a second "Cost structure breakdown" that would sit beside
`fin-cost-composition` as two splits of one subject with one invented, a "Deep dive" of three bulleted
columns each of which would be an unsourced claim, and a CTA the tool no longer has. It also refuses the
reference's 50-to-125 axis, which puts 75 against 100 a third of the way along a track rather than three
quarters. HR refuses an "Update roles & cities" button, the tool asking five questions of which none is a
role, a level or a city — the exact defect the chevroned answer pills were rebuilt to remove. Operations'
promotion of three breakdowns to summary figures is lossy and stays honest only because each cell's note
is the part's own LABEL; `ops-grade-a-office-stock` loses its vacant figure, accepted by the project owner.


## The close comes back, as a paywall band

**Restored on both result screens at the project owner's decision**, having been removed twice at
ANSR's request — Screen 1's on the page-end instruction, Screen 2's in the zone rebuild. Restored
together, because a close on one screen only is the largest possible version of the drift the shared
component exists to prevent. `project.md` carries the rules; this is what was tried and rejected on the
way, in the order it happened.

**The shape is a blurred content field with the ask centred on it.** The instruction was a
"blurred-background paywall / premium upsell overlay", against a reference where a grid of real content
sits out of focus under a centred lockup, heading, body and buttons.

**What is blurred is authored, and this is the one line in the whole feature that cannot move.** The
obvious build — render the four gated metrics and put a filter over them — is a leak, not a style
choice: a paint-time filter is reversible from markup the browser already holds. It is also impossible
here, which is the useful part: `publicMetric`'s gated branch has no `value` and no `structure` field,
so there is nothing to render. So `TILES` in `closing-cta.tsx` is a hand-written field of
chart panels that reads nothing from the data, `aria-hidden` in full, and a spec on each screen
asserts the layer's text is empty. Deriving the block sizes from the real metrics was considered for
about a minute and rejected: it would make an ornament a function of figures that must not cross the
gate.

**Five attempts at the field. Each failure is worth keeping because each was a different mistake.**

1. **Blur `lg` (18px), blocks at 22%, backdrop opacity 0.55, scrim ellipse 78% wide.** Invisible. Three
   compounding errors: at 18px the field smeared to an even wash, 22% of teal-300 composited to within a
   couple of RGB values of the ground, and the scrim was a horizontal falloff so it covered the middle of
   the band at full strength — where all the content was.
2. **Brighter blocks, blur `md`, scrim widened to 120% so the falloff is vertical.** Still nearly
   invisible, because the columns' own `justify-center` put everything in the middle, which the scrim was
   solid over BY DESIGN. The top and bottom strips — the only places it cleared — held nothing but padding.
3. **Columns at `justify-between` over the full height.** The field finally showed. It was also four
   copies of one shape, which read as a pattern rather than as content.
4. **Six tile kinds, flat 78% veil.** The vignette went, and the field went dim with it — a flat veil dims
   everywhere, so its weight is set by the FAINTEST ink on the band, and 78% is what a muted body line
   needs. At 78% the tiles stop being distinguishable, which is the whole point of them. Two of the six
   kinds were also redundant: ranked rows and a small table both blurred to the same thing as each other
   and as the figure tile's label rows.
5. **Four kinds, tile panel fills, 180-degree rotational symmetry, veil at 58%, white body copy.** This is
   the one that works, and the four changes are one decision each:

   - **A faint panel fill behind every tile.** The single biggest win. Blocks on the bare ground are
     scattered marks; the same blocks on eight faint cards are a dashboard. "Randomly placed" was an
     accurate description of the version without it.
   - **Rotational symmetry rather than mirrored.** Read row one left to right and row two right to left
     and the kinds are in the same order, so every tile has a partner diagonally opposite and the field is
     balanced about the centre where the copy sits. A mirror was tried first and puts identical shapes
     side by side across the centre line, which is the repeated-pattern problem again.
   - **A grid gap WIDER THAN THE BLUR RADIUS.** At `gap-4` (16px) under a 10px blur the two rows merged
     into one tall panel per column and the grid read as four columns, not eight tiles. `gap-6 md:gap-8`
     is the fix and the rule generalises: any gap that has to survive a blur has to exceed its radius.
   - **White body copy, which is what bought the veil back down to 58%.** With the binding ink at
     8.08:1 instead of 4.77:1 there are twenty points of veil to spend on the field. The band is
     white-ink-only for the same class of reason `ask-hero.tsx` is, and hierarchy is carried by size and
     weight instead of a colour step.

**The donut is drawn as a swept arc, not a plain ring.** A full ring blurs to an even annulus and reads as
a bevelled hole; a visible sweep reads as a share of something. One element — a `conic-gradient` for the
sweep, a `radial-gradient` mask for the hole — because an arc drawn as a border plus an overlay to cover
the middle is two shapes that have to stay concentric through a blur, and they do not. It is the only
round thing in the field and the largest single shape in it, both deliberately: it is what stops the field
reading as one repeated motif.

**The sparkline needs `non-scaling-stroke`.** `preserveAspectRatio="none"` is what keeps it a sparkline at
any column width, and it scales the two axes differently — which takes the stroke width with it, so the
line came out thinner vertically than horizontally and vanished into the blur.

**A real defect came out of this and is worth remembering as a class.** The backdrop carried
`transform: scale(1.06)`, to push the blur's feathered edge off the band. What it actually did was push the
field's BRIGHTEST content into the band's corners — and the close is the card's last band, so those are the
card's bottom corners, where `.gcc-result-card` draws a 9%-white hairline ring against the teal-deep page
ground. Bright blur behind a light ring on a dark ground read as light seeping out of the card's foot. The
ring was not the bug and was not touched: **putting a dark band at the foot of a card whose edge treatment
was designed against light content is what exposed it.** The fix is a mask that fades the field before the
band's own edges, longer at the bottom where the radius is, which also stopped the field looking cropped
mid-panel. It is not the vignette that was removed — that was a radial spotlight on the axis the reader
looks along; this does nothing behind the text.

**On a phone the field is faint and that is the correct trade.** Two columns in a short band under a
scrim sized to protect three lines of copy leaves very little showing. The alternative — dropping the
backdrop below `lg`, which is what the header band does with its map — loses the paywall signal
entirely, and a faint field says more than a flat one.

**`--ansr-surface-inverse-soft`, not the inverse teal, and it is structural.** The card floats on flat
teal-deep, so an inverse band at the card's foot is the same value as the ground it is lifted off and
the card loses its bottom edge — the edge that makes the whole surface one object. Teal-800 exists for
this and its token note says so. It also can take no warm ink, which is why the band's one orange role
is the button and nothing else, and why the eyebrow — while it existed — was teal-bright.

**Three elements were built, shipped and cut, in this order.**

- **A bordered panel NAMING each withheld metric**, beside the ask on a 7/5 split, with frosted glass over
  an empty slot per row. Honest — a gated title crosses the gate and may contain no digits, and the slots
  were empty in the DOM — and cut as too much band for a close. It took `withheldTitles`, the prop that
  carried the names from `page.tsx`, `.gcc-close-sealed` / `-slot` / `-frost`, and `--ansr-blur-sm`. The
  blur tokens survive because the backdrop uses `md`.
- **A "NEXT STEP" eyebrow.** A label for the band over a heading that is itself the next step.
- **Per-status branched copy.** See below.

**The copy was rewritten four times and ended up SUPPLIED, FIXED and EDITABLE.** First restoration: two
sentences per body, the industry interpolated, and a `ctaLabel` per branch — "Talk to ANSR about building
your India GCC" and two variants, on each screen, so one sentence had six forms and the longest wrapped
inside a pill on a phone. Second: one line per body, no interpolation, one shared label. Third: a supplied
heading, line and label, identical on both screens. Fourth: the heading deleted and the two survivors moved
into `siteContent`.

**That third step unrendered `gccStatus` again, and it is a trade rather than a loss.** Branching a close on
a field the form does not ask for was up to eighteen authored sentences for a band with three elements in
it — and the two screens' headings had already converged once by accident, which is the thing the branch was
supposed to make impossible. Screen 1 said "See what this looks like for your roles" against Screen 2's
"What this looks like for your roles"; a visitor met the difference by pressing a tab. One shared constant
makes that unreachable, which is a better answer than the test written to catch it. `functionFraming` stays
exported and tested on all three values; `peerClosing` was deleted rather than kept, because a second
unrendered copy of one branch is two things to keep in step for no reader.

**The HEADING is gone and the supporting line took its place rather than its size.** "Unlock the full GCC
landscape" over "Access the complete dataset, deeper benchmarks and detailed cost structures" was the same
thing said twice at two sizes — a promise, then the specific version of it. Cutting the promise leaves the
sentence worth reading. The heading's words survive as the band's `aria-label`, which is where they are
still doing real work: with no heading the section needs an accessible name or it is not a `region`, and
`aria-label` is how `#function-metrics` already solves exactly this. An `sr-only` `h2` was the alternative
and is worse — an invisible level in the outline, with the test-suite costs `docs/traps.md` records.

**Promoting the line to the heading's old display scale was wrong and was reverted the same session.** At
24/30/38 with `tracking-display` a 98-character sentence is three lines of display type, and the band stops
being a close and starts being a second hero — "too big and looks bad" was the accurate verdict. It sits at
18/20px Light with reading leading: one step up from where it was as a subordinate line, three steps down
from the promotion. The button went 48px/`text-base` to 56px/`text-lg` and back to 48px with one extra step
of horizontal padding. **The close is the last thing on a long page of evidence and should ask quietly.**

**The band admits WHITE INK ONLY and that survived the size reversal, because it was never about
prominence.** `--ansr-text-inverse-muted` measures 3.93:1 over the field's brightest possible pixel, which
fails AA at any size this line uses; the only way to make it legal is raising the veil to 78%, where the
tiles stop being distinguishable. At 18px Light 300 white reads as quietly as the muted token would and
clears AA with room. Same class of constraint as `ask-hero.tsx`.

**The two strings are `siteContent.close`, which makes the close the only editable band on the RESULT
screens.** The test it had to pass is the one `project.md` sets for the hero: everything else on these
screens is an argument about the dataset and belongs beside the logic making the argument, while the close
is positioning and an offer on ANSR's own schedule. Same category, same treatment. What came with it:
`closeCopySchema` defaulted so an older dataset still reads (the `metrics` precedent), a `close` field list
in `SiteContentDiff` so an edit is REPORTED — the whole reason that diff category exists — the draft
`STORAGE_KEY` bumped to v5, and the admin tab renamed from "Entry point" to "Site copy" because it is no
longer only the entry point. **There is deliberately no heading FIELD**: a field an admin can fill that
nothing draws is worse than no field.

**No public spec names the button's words.** The label is editable copy now, so locating the CTA by its
text would make an ANSR wording change break a public spec — the same failure twenty band locators had when
they were keyed to heading text. The band id is the contract and the link is found by role inside it.

**`Zone` gained two things and both are for this band.** `inverse-soft` is the one ground exempt from
the strict white/mint alternation: the tabs have different section counts, so the last content zone is
white on one and mint on another, and a close that had to alternate with whatever preceded it would need
its ground derived per tab. `behind` is a full-bleed slot under the padded container, because the
backdrop has to reach the card's edges — inside the container it stopped at the gutter and read as a
rectangle parked in the band.

**`.gcc-close-streaks` is deleted**, and with it the last use of `public/brand/close-streaks.svg`. The
cropped diagonal texture was the old close's depth; the backdrop is now that, and two textures on one
band compete. The derived SVG is left in `public/brand/` as reproducible output with no consumer.

## The ANSR Atlas copy pass — twenty strings, and the three that could not be taken literally

ANSR supplied a list of replacement wordings across both screens: the hero and its subhead, the form's
heading and CTA, the impact band's title, all four snapshot labels, the comparable-companies heading, the
functions heading, the locations heading, the close's line and button, and nine metric titles and labels.
Most were a substitution. What is recorded here is the handful that were not, plus what the longer strings
did to the layout.

### Three requested labels named a population their figure was not measured over

Asked for, and not shipped as asked:

- **"cities in India host GCCs from your sub-industry"** — the count is `view.map.cities.length`.
- **"the city where most peer GCCs are based"** — the value is `view.map.cities[0]`.
- **"Cities where {SUB INDUSTRY} companies have set up"** — the map's dots are `density`.

All three read off `MapBlock`, whose `industry` field is `input.industry` verbatim and which is filtered to
the industry, never to the sub-industry and never to the five-company peer set. So each of the three would
have put a narrower subject over a wider figure — the one thing copy on these screens may not do.

**The alternative was to narrow the DATA rather than the words, and it was rejected on what it would draw.**
A sub-industry city derivation is buildable. The thinnest sub-industries hold a handful of companies, so the
map would resolve to two or three dots on an outline of India and the ranked list beside it to two rows —
which is not a thin answer, it is a broken-looking one, and it would replace a card that works for every
visitor with one that works for the ones in large sub-industries. The map is also the only block on the
surface that has no shortfall sentence to fall back on.

So the labels name the industry: "cities in India host GCCs from your industry", "the city where most of
these GCCs are based" ("these" resolving to the section heading, which names the industry once for all four
cells), and "Cities where {industry} companies have set up". Each has a spec asserting the narrower word
stays out, in both directions, because the obvious future "fix" is to reach for
`view.industry.businessType.name` — which passes a no-sub-industry loop and breaks only for the visitors who
answered the optional field.

### The snapshot labels became sentence predicates, which is a shape the surface already had

All four moved from noun phrases naming the measure ("Typical GCC headcount") to clauses completing the
figure ("average employees in each GCC"). That is the terminating scale strip's own shape, whose three
labels are capped at 120 and 140 characters for exactly this reason, so the three published snapshot caps
went from 32 to 56.

"Average" replaced "typical", and "typical" had been carrying the figure's honesty through three earlier
rewordings — it is a rounded mean of FTE band midpoints, and "typical" claims a central tendency where
"average" claims arithmetic. What carries it now is "in each GCC", which frames the number as per-centre
rather than as a measured distribution, plus the rounding assertions in the unit suite. The one label that
must never be read as a total is asserted against `/total/i`.

**Measured at five widths, and the row survives it.** Cell heights are equal at every width (96px at
1440/1280/1024, 76 at 768, 64 at 390) because the grid row stretches them, and the labels all start on one
line because the figure box is a fixed height. The only unevenness is at 1280 and above, where "average
employees in each GCC" is 29 characters and fits one line while the other three take two. Reserving a second
line for all four was considered and does nothing: the short label is still short, and the empty line is
invisible. Left as it is.

### The comparable-companies heading left the schema

"GCC details of peers closest to {company}" interpolates the one OPTIONAL input, so `peersTitle` could not
stay a flat published string — whichever branch an admin typed, most visitors would read the other. This is
the same reasoning that kept the snapshot's opening label in code from the start.

The fallback branch is "closest to your profile", which is the wording the whole heading used to be, kept
rather than replaced: "closest to yours" presumes the visitor already runs an India centre, and `gccStatus`
is a constant the form never asks for.

**Removing a published key is not symmetric with adding one.** Adding one is caught by the draft
provider's shape check; removing one is not, because zod STRIPS an unrecognised key rather than refusing
it — so a v5 draft holding `peersTitle` would parse, publish cleanly, and drop the string with no diff
entry. There is no key whose absence marks such a draft, so the storage key went to v6. That is the whole
argument for the version being a version and not a shape check.

At 1440 a 42-character company name still sets on one line at 30px; at 390 it takes four. It is a section
heading rather than a fixed box, and it is the visitor's own input.

### The impact band's mark moved to the front of its own heading

"ANSR By The Numbers" puts the brand first, where "Impact delivered by ANSR" put it last. The lockup is
drawn, not typed, so this is a DOM order change: the `sr-only` word and the image lead, the published phrase
follows. `ms-[0.1em]` became `me-[0.1em]` — that margin was never symmetric padding, it existed because the
burst has no left sidebearing and its outermost ray sat about 10px from the preceding "y" at 48px. Leading
the line the burst has nothing before it; what needs the space is the trailing side, where the wordmark's
"R" meets "By".

**And the `{" "}` between them is load-bearing for the accessible name only.** JSX strips whitespace
containing a newline, so the first pass computed "ANSRBy The Numbers" — one word, wrong, and completely
invisible on screen because `me-[0.1em]` was drawing the gap. It was caught by reading `textContent` in a
measurement harness, not by looking at the render, which is the point worth remembering: this class of
defect cannot be seen.

### "Very strong" is drawn a step deeper, and the data makes it ambiguous

ANSR asked for the capability grid's top rating in "the deeper blue that we have the color we used in the
1.5M of Technology Graduate Pipeline" — that is `--ansr-accent-teal`, the fill on `AdjacentBlocks`' larger
block. So `ratingFill` draws a top-rated cell's segments in the brand teal and every lower rating's in
`teal-500`.

**Two steps and not four.** A full ramp across the four ratings would put the weakest cells on a pale teal,
and these segments are the only visible encoding on the chart — the rating word is `sr-only` — so every fill
has to clear 3:1 against its own `surface-sunken` track. `teal-400` measures 2.15:1 there, which is the same
measurement `BarTrack` records, so the legal range is exactly the two deepest steps.

**It keys on the CELL'S rating, not the column, which is what distinguishes it from the emphasis ANSR had
removed.** `anchorColumn`'s deeper segments were wrong because a darker mark in one column reads as a higher
rating; here the depth IS the rating, so a top-rated Poland cell would draw identically.

**The open problem is that no reader can tell, because every "Very strong" in today's ratings is India's.**
Read on screen, the deep teal is four full rows down one column — visually the emphasis that came off. The
only cue against that reading is India's Cybersecurity row, rated Strong and correctly drawn lighter. This is
a property of the ratings rather than of the code, and the ratings are themselves provisional (Vietnam's
column is illustrative and flagged for replacement), so it is on the blocked list rather than being designed
around. The specs pin the MECHANISM on "Strong", which does span columns, precisely because the top step
cannot carry that assertion.

### "854 mn sq ft" — a word unit beside a numeral, and the one place the formatter cannot help

ANSR asked for the unit "up near the number" and left the how open. `figureParts` was not an option: it
splits a CLOSED trailing alphabet (`%`, `M`, `K`, `+`) off a string that module produced itself, and "mn sq
ft" is not a suffix on the number at all — it is the metric's own `unit`. So `SummaryFigure` gained an
explicit `unit`, passed by `ops-view.tsx` from the metric, and the title dropped to "Grade A stock in top 7
cities".

Three things fell out of it. The stored unit changed from "million sq ft" to "mn sq ft", because the string
is now DRAWN at 24px beside a 48px numeral rather than read as prose — the renderer abbreviates nothing, so
the abbreviation is the datum. `Unit` gained a `word` flag setting a 4px gap rather than 2px: a symbol is a
suffix on the numeral and sets tight, a word is a separate token and needs a real space. And both take
`whitespace-nowrap`, because the figure box is a fixed height and a wrapped unit would be clipped rather
than shown.

**Measured at the tightest cell it can occupy** — `lg`, four columns, a 192px box — where the ink is 170px.
It is 139px of 294 at 390 and 170 of 256 at 1440. Re-measure before lengthening it.

The numeral also gained a box of its own. That is layout-neutral (a text run in a flex container is already
an anonymous flex item) and it exists so a spec can measure the unit's position against the numeral, which
is the only way to assert "beside, not below". Both carry `data-figure-value` / `data-figure-unit`, added
because the existing spec located the unit as `span > span` and silently started matching the numeral the
moment it had a box — a numeral compared against itself, which fails for a reason that has nothing to do
with the unit.

### The rest of the metric wordings, and what they did to the two figure rows

"Manager-level and above", "Professionals with 10+ years of experience", "GCCs have tech teams of 100+
FTEs", "Graduate pipeline for technology", "Through EOR model", "Through own entity", "Salary growth in
India, YoY", "Increase in operating costs, YoY", "Increase in workplace costs, YoY".

Two are worth noting. **The 10+ years title is a shared metric**, so one edit covers the technology and HR
cards and they cannot drift; the title now matches its own `unit` word for word, which is harmless because
both tabs draw it as a figure-row cell where the unit is never rendered. And **the two first-hire labels
had to keep "Through"** — it is what says they name an OPERATING MODEL rather than a function or a
seniority, which is the distinction the metric exists to draw. A bare "EOR" names a vendor category.

Finance came out better than it went in: three titles at 27, 32 and 32 characters, one line each at every
width, where "…, year on year" was the wording that had made an earlier third-width row ragged. The
technology row is five cells of equal height at every width — all five labels on two lines at 1024, three on
one and two on two at 1440.

## The phone pass — the second half, and where it deviated from the ask

The first half of this pass (the hero shoulder and pull, the dot map's fixed frame, the impact band's two
columns, the form's field gap, the capability grid's reflow, the answer editor's target) is recorded above
and in the blocks in `globals.css`. This is the rest of the same instruction list, plus the two places the
answer is not what was literally asked for.

### The rule that generalised out of it

Every item here came back to the same thing: a composition budgeted for a screen with room to spare, taken
down by a multiplier instead of re-budgeted. So the pass has one habit rather than nine fixes — **when a
size was chosen as a RATIO (a heading under a figure, a unit under a numeral, a gap against a mark), the
whole ratio steps at `sm`, not just the part that was too big.** A figure that comes down while its unit
does not is a unit that has come up.

### The result band's ornament — one graphic at every width, and two layers retired

The band drew the dotted map from `lg` and each screen's brand motif below it, swapped at that breakpoint
because a percentage-framed map does not resolve at phone width. The hero's own fix — a fixed `56rem` frame
— removes the reason for the swap, so the map now draws everywhere and the motif has nowhere left to be.
`HeaderMotif`, `PEER_MOTIF`, `FUNCTION_MOTIF`, `.gcc-hero-diagonal` and `.gcc-rings` are deleted rather
than parked; `.gcc-horizon` went with them, having had no caller for some time.

The leading-edge dot lattice went at the project owner's instruction. Two readings of the same complaint:
it is a dotted texture at one density beside a dotted map at another, and on a phone — where the map was
absent — it was the only graphic on the band, which made a decorative grid the band's subject.

**Considered and rejected: keeping the motif on the tablet band only.** It preserves "one ornament per
width" with no deletions and it is what a minimal reading of the instruction allows. It was rejected
because the seam is arbitrary — phone and desktop draw the map, the 256px band between them draws something
else — and a reviewer meeting that on a tablet reads it as a bug rather than as a decision.

### The answer pills — read but not drawn

Four pills wrapped to three lines at 390 to restate what the visitor had typed thirty seconds earlier. The
instruction was to hide them and keep the button.

They are hidden with the sr-only treatment rather than `display: none`, so the group keeps all four members
and a reader working the band by role hears exactly what it hears at every other width. That is not
over-engineering the instruction: what a phone was spending was the DRAWING of a restatement, and the
accessibility tree costs no pixels.

**Considered and rejected: `sr-only md:not-sr-only` on the element.** `not-sr-only` sets `padding: 0` and
lands in the same layer as the `px-3.5 py-1.5` the pill needs back at `md`, so which one wins is decided by
generated order — invisible in the markup and a trap for whoever reads it next. One media query on the
class the pill already carries has no such ambiguity, and absolute positioning also takes the pills out of
the flex flow, so the row's `gap-x` has nothing left to space and the button sits at the band's own leading
edge.

### The ranking row — a grid, because a wrap could not be told where to break

The row's three groups were two nested flex containers, and the phone artefact was structural: the tags
alone take two lines at 375, so the figure wrapped under them — three lines below the small-caps column
header that names the quantity and two above the bar it is the value of. Both relationships the row is
built out of, broken at once. That is the "the headcount is in one place and the numbers are in another"
reading.

It is a grid of named areas now, with the phone map putting the figure on the NAME's line and the tags
under the bar. What that buys beyond the fix: the trailing column is `auto`-sized, so `ms-auto` and
`justify-between` — both there purely to survive a wrap — are gone. A column cannot wrap.

The row gap is 4px and the two 8px gaps are margins on whichever item opens a group, because a grid has one
row gap and this row needs two values. Measured after: at 1440 the geometry is identical to what it
replaced (name 20px, 8px, line two 24px, 4px, bar 8px; row 65px). At 390 the row is 83px with the tags on
two lines.

### The density map — four names on a phone, which is a scoped exception

"The labelled set is exactly the ranked list's set" is ANSR's ask and it holds at every width the labels
were drawn at. The labels were not drawn below `sm` at all, for a sound reason: the font size is a share of
the frame, so the desktop share renders at about 8px on a 300px box.

The instruction was to show the names. Eight of them at a legible size is more label than map and the
de-collision stacks them into a column, which is the gutter layout this design replaced — so the phone
layer names four at 0.05 of the frame (about 14px, which is what a desktop label measures at 1440). The
exception is defensible because on a phone the ranked list sits directly under the map with every row
visible: what the graphic states is a subset of a list the reader can see, which is not a disagreement.

The wrapper reserves 6% either side rather than nothing — the phone names are set at nearly twice the
desktop share, so the widest of them runs further past the coast than any desktop label does — and
deliberately less than `sm`'s 10%, because the country is the subject on the smallest screen.

Two layers in the DOM, one layout function. Both are `aria-hidden` at every width, so the duplication costs
nothing in the accessibility tree; `svg text` stopped meaning "the labels on screen", so each layer carries
`data-map-labels` and the spec that pins the label-to-list coupling names the wide one.

### Time to reach scale — the rail rotates

The phone fallback was four rows with a hairline: every figure stated, no line drawn. Honest, and not the
chart — nothing in it said the four waypoints are positions on ONE progression, and the two tracks became
two lists to compare row by row.

It is the same rail turned vertical: `--gcc-at` read as a `top` down a fixed 10rem axis, one ring per
waypoint, name and figure beside it. Every property the chart is built on survives — proportional spacing,
one axis length shared by both tracks, both tracks drawn identically — and it costs about 30px a track over
the list.

**The bug worth recording, because it is a property of grid rather than of this chart.** The item's three
children are in the DOM as label, dot, figure, which is what the horizontal reading needs. Placing only
their COLUMNS left auto-placement to pick the rows, and it picks badly by construction: the label takes
column 2 of row 1, which moves the cursor past column 1, so the dot cannot go in row 1 and drops to row 2
with the figure after it. Rendered, that was a two-row item — the milestone name floating above its own
ring — and since the items are absolutely positioned 26px apart, every name landed on the ring belonging to
the waypoint before it, so every figure was against the wrong name. It looked like a data bug. `grid-row: 1`
on all three is the fix, and the `sm` block has to release both axes.

### The four function tabs

At the full size the four labels need about 430px against a 327px card body, so the row wrapped by content
— "Technology Operations" then "HR Finance", two ragged lines of two, with the shortest label in the set
starting the second. A tab strip is four peers and that shape says they are two groups.

`grid-cols-4` at 12px is the only arrangement of four that reads as one switch. The type size is the price:
at 320 a cell is 68px and "Operations" is about 66px of ink at 12px Semibold. One step up overflows the
cell rather than wrapping, because every label is a single word, and an overflowing cell is a horizontal
scrollbar on a document this tool does not own the scroll of.

### The two figure rows, and the snapshot

Both were one column below `sm` on the same measurement — a 36px figure and its unit are most of a 171px
half-cell. The measurement was right and the conclusion was wrong: the answer is not one figure per
screen-width row (four of them ran 430px with most of every line empty), it is to set the figure at the
size a half-cell holds. 30px, and the unit and the box step with it.

An odd last cell widens to the full row below `sm`, which is the rule the impact band and `packWidths`
already follow: a lone cell in a row of evidence reads as a figure that failed to load.

### The dropdown and the software keyboard

Pressing a dropdown raised the keyboard, because the filter takes focus on open. Gated on
`(pointer: coarse)` — not a width, not a user agent, not `ontouchstart`. A 700px window on a laptop has a
hardware keyboard and wants the filter focused; a touchscreen laptop has touch and its primary pointer is
still fine. `pointer: coarse` is the one query that asks what the primary input IS, which is exactly what
decides whether a focused input costs half the screen.

### Measured after, at 375 / 390 / 768 / 1440

No horizontal overflow at 320, 375, 390, 640, 768, 1024 or 1440, on the entry point, the peer view and all
four function tabs. The peer document is 5,174px at 390 where the sections themselves account for the bulk
of it; the entry point is 1,532px against 1,854 before the pass began. Desktop measures identical to the
baseline in every box checked, which is the constraint the whole pass was held to.

## The phone pass — the third round, from the owner's own reading of the two result screens

Seven items off a list, plus the general instruction to sweep for type that had been sized for a wider
screen. Everything below is scoped below `sm` except where it says otherwise; desktop geometry was
re-measured after each change and did not move.

### The rule that generalised, again — and it is narrower than last round's

Last round's habit was "step the whole ratio, not the part that was too big". This round it split in two,
because half the items turned out not to be type at all:

**A figure inside a CARD steps at `sm`; a BAND's own display figure does not.** The comparison card's
headcount band and the ranking's step to 18px together — they are one quantity under one label key, so a step
applied to one and not the other is exactly the drift that key exists to prevent. The snapshot's four, the
summary row's, a card's primary value: none of those step, because each is the thing its neighbours were
sized against in the first place, and stepping the reference moves everything measured off it.

**And half of "the font is too big" was space, not size.** Three of the seven items were a composition
measured for a width it was not being drawn at, and in each the type was a symptom. Reading a complaint about
size as a complaint about size would have shrunk correct type and left the layout wrong.

### The peer cards — the empty half was the interior, not the type

A comparison card is a fifth of a row at `lg`, half at `sm`, and the WHOLE measure on a phone. Its interior
never changed: three facts down one flex column, so a 270px card drew a 112px figure and a two-chip city list
down its leading half and left the trailing half blank, four rows deep, five cards in a row. About 250px of
card each, 1,361px for the block.

**So the figure and the year share a line and the city list keeps the full measure.** Which fact pairs with
the figure is measured rather than chosen, and the obvious pairing is the wrong one: two city chips and an
overflow pill are about 176px of ink, which fits across the card and needs three lines in half of it — paired
with the figure it made the two-column card TALLER than the column it replaced. The year is a short prefix and
four digits. Placement rather than DOM order, so the reading order is unchanged.

**It is a media query with a lower bound, and the bound is why it is not a utility.** A cell has to hold the
widest band at 18px (112px) and "In India since 2002" at 14px (116px), so two columns need about 248px of card
content; a 320px viewport gives 200 and the figure wraps mid-number, which is worse than the space. `23rem` is
where the content box reaches 248. Below it the flex column renders unchanged — verified at 320, where the
cards are the original stack and nothing wraps.

The block came down from 1,361px to 1,001px at 390 with nothing removed from it.

**The mark's reserved band also went, and only below `sm`.** The reservation is there because cards sharing a
row are read across, so an unmarked card lifts its whole interior by a mark's height. On a phone the grid is
one column: no two cards share a band, so there is nothing to keep in step and the reservation is 28px of
blank opening every unmarked card — which, with the provider tier returning nothing, is all of them. The
instruction is about the row; where the row does not exist, neither is the reason.

### The Fortune badge on the ranking — two causes, and the second one was a bug

The complaint was that the badge sits "here and there". It had two independent causes and fixing either alone
would have left it looking half-fixed.

**Inline flow was the first.** The badge follows the company name inside a wrapping flex row, so its x is
wherever that name ends — and on a name that wraps it broke to a third line at the leading edge. Five rows,
five offsets, two depths. `basis-full` on the marker-and-badge item below `sm` gives it a line of its own at
the leading edge, directly under the name it accredits, at one x on every row.

That took two passes, because a line of its own is not the same as one position. With the marker first the
badge measured 61px on a row outside the peer set and 156 on a row inside it — and 115 at 320, where the
marker's own text wrapped to two lines. So the badge takes `order` ahead of the marker below `sm` and the
marker takes `whitespace-nowrap`. Measured after: one nameX, one badgeX and one figure trailing edge at 320,
360, 375, 390 and 430; at 640 and above the badge's five distinct x values are the inline flow, untouched.

It costs no line for the figure, which is the part that made it cheap: the figure is the grid's own trailing
column at `align-items: end`, so it drops to the bottom of the name block and lands beside the badge's line —
still directly above its own bar and still under the column header that names it, which are the two
relationships the phone arrangement exists to protect. A row with neither marker is one line and nothing
moves.

**Rejected: giving the marks their own grid area.** `.gcc-rank-row` is already a named-area grid and a
`"marks figure"` row is the tidier expression of the same result. It needs the marks span to be a child of the
row rather than of the name block, and at `sm` and above the badge has to flow INLINE after the name — which a
grid area cannot express. `display: contents` on the name block below `sm` would release its children as grid
items and was the third option; it turns one item into three that each need placing, including a mark whose
column collapses to zero when it is absent while the column gap does not.

**The second cause was a phantom flex item, and it is a defect at every width.** The row wrapped the mark in
`<span className="shrink-0">` and guarded the wrapper on `markUrl`. That guard is decided on the server and
cannot see the case that actually happens: a URL that resolves and then FAILS to load leaves `CompanyMark`
returning null with the wrapper still standing — a zero-width flex item plus the row's own 10px `gap-x`. So
every company with a domain had its name indented 10px and every company without one did not, measured at 71
against 61. With the provider tier rejected today that is most of the block, and it means the names the badge
was being read against were not on one edge either.

The wrapper is gone and `shrink-0` moved into the component, which is what the no-caller-guards rule was
already asking for. **`self-start` had to be scoped with it**: on the card the mark is an item in a flex
COLUMN, where it resolves on the inline axis and is what lets the box hug the artwork, and on a ranking row it
resolves on the block axis and would top-align the mark against a line that is deliberately centred. It only
became reachable when the wrapper went, since a wrapper is what used to be the flex item.

### The milestone rail — horizontal at every width, and the cap is why it could not be before

The rail was horizontal from `sm` and something else below it: first a list of four rows with no line at all,
then a vertical rail with the ring leading each row and the duration at the trailing edge. The vertical
version kept every property the chart is built on and still read as a different chart from the one it is drawn
beside — a reader asked to compare two curves was comparing two rails drawn down the page — and it cost 160px a
track against the 92px the horizontal one does.

**What made the horizontal reading unavailable at phone width was the item CAP, and the cap was a rem.** The
tightest pair of waypoints on the scale curve is 16.7% of the rail apart at every width, because the positions
are proportional to the stored figures. 3.5rem is less than 16.7% of a 1024px card's rail and more than 16.7%
of a 208px one, so one number cannot serve both. As a percentage the clearance becomes a property of the DATA
rather than of the viewport: 14% leaves 2.7% of the rail between neighbours at 320, at 390 and at 1440 alike.
Measured minimum gap: 5px at 320, 6px at 360 and 390, 7px at 430, unchanged at 6px at 1024 where the desktop
cap still applies.

**The wrapper's inset had to become a percentage too**, because what it absorbs is half an item and half an
item is now a percentage. `px-[7%]` covers 6% with a point to spare at every phone width, where a fixed 28px
would take a fifth of a 248px measure and a fixed 16px would let the last waypoint out of the card. The
captions take the inset, which is what they already did from `sm`.

The whole two-layout apparatus went with it — the vertical rail, `--gcc-milestone-rail`, and every `auto` /
`none` reset the `sm` block needed to cancel a phone value. Three variables step at `sm` now and no placement
does, which is also what let the explicit `grid-row` / `grid-column` on all three children go: those existed
to place a second layout by column, and placing only one axis is what once rendered every figure against the
wrong milestone name.

### The tab strip — the equal grid was the wrong fix for the right problem

`grid-cols-4` was there because the flex row wrapped by content into "Technology Operations" over "HR
Finance", two ragged lines of two, which reads as two groups rather than one switch. It fixed that and bought
a new problem: "HR" is 16px of ink, so it sat in a 68px cell under a 68px selected rule, and the indicator
named the cell rather than the word.

**The row wrapped because of the PADDING, not the labels.** The four together are 180px of ink at 12px against
a 224px strip at 320 — they fit with 44px to spare — and `px-5` a side was adding 160px on top. So the cells go
back to their own content width with `justify-between` distributing the slack, and the row cannot wrap because
the ink alone never fills it. `min-w-8` is the only thing the padding was still buying: it holds "HR" to a 32px
target, above the 24px floor, without widening the three labels already past it.

### The range card — the origin numeral was costing the low figure its position

"Through EOR model" and "Through own entity" were reported as misplaced and read as a type-size problem. They
are not: they bracket the rail correctly at 12px. What was misplaced was the low endpoint FIGURE. The low end
of the first-hire card is at 10% of the rail, 29px at 390, so "7 days" and the origin `0` overlap and
`--gcc-range-floor` pushes the figure to 48px — 19px to the trailing side of the mark it belongs to, on a chart
whose entire construction is that the number sits under its own mark.

So the origin's NUMERAL is not drawn below `sm` and the floor goes to zero there. The TICK on the rail stays at
every width, so the rail still visibly starts at an origin and the zero-tick rule a cost index depends on is
untouched. What the numeral buys — the run-up reading as elapsed time — is worth less than the low figure's
position, and only on a phone is the choice forced.

### The range card, second report — the end labels belonged to the note, not to the rail

Reported again on a phone: "Through EOR model / Through own entity" still feels too far from where it is
supposed to be and is creating confusion. Measured at 390, where the card's body is 268px: the endpoint
figures end at y=176, the label pair sits at y=204, and the card's own note sits at y=248. **28px above, 28px
below, and the pair set at `text-xs` in `--ansr-text-muted` — which is the note's exact treatment.** So the
labels were equidistant between the two blocks they could belong to and typographically identical to the
wrong one. Nothing was misaligned; the pair had simply been adopted by the paragraph under it.

The horizontal reading was checked before anything moved, because it was the obvious suspect. It is fine: the
low figure is centred on a mark at 10% of the rail, which puts its leading edge 6px in, and the label sits at
0 — a 6px difference nobody sees. What is true horizontally is that at 390 the two labels are 128px each and
meet in the middle with a 12px gap, so a pair already floating between two blocks can also be scanned as one
sentence.

So the rail block and the label pair are one flex column at `gap-1`, and the labels take `font-medium`. Each
label is now 8px of visible air under the figure it names against 28px to the note, and Medium against the
note's Light 300 separates a caption from prose without spending an ink step. It is grouped at every width:
the desktop card carries the same two gaps, and `gap-6` there put the labels 28px from the figures too.

**Four alternatives were considered and three rejected.**

- **A keyed two-row list below the rail** — ring, "7 days", "Through EOR model" on one line, disc, "70 days",
  "Through own entity" on the next. It removes the ambiguity completely and it is the one shape ANSR has
  already taken off a neighbouring card: `IndexSpread`'s disc-and-ring key was deleted at their request in
  favour of names sitting on the marks they belong to. Reintroducing it here would contradict that.
- **Moving each label into its endpoint's positioned column**, `IndexSpread`-style, so the name, the mark and
  the figure are one absolutely positioned stack. This is the right shape for a chart whose points can be
  anywhere on the rail — and it buys nothing here, because the low figure's leading edge is already within
  6px of the label's. It costs a column cap: at 268px of rail two 128px labels cannot both sit at their own
  marks without a `max-inline-size` that wraps them, and the cap has to be derived from `offset` so the two
  columns cannot collide on a range whose low end sits near the middle.
- **A 24px column gap, to stop the two labels meeting.** Both then wrap to two lines at 375 and 390 as well
  as 320, and a ragged wrap is a worse reading than a 12px gap between two blocks that are now unmistakably
  captions.
- **Kept: 320 already wraps both labels**, one under each figure, and reads as two blocks. That is the width
  the arrangement is worst at and it is correct there.

### The two smallest items

**The function tags.** Eight memberships at 14px with 14px of inline padding put almost every item on a line of
its own: 340px of the phone's peer view for the one block that deliberately claims no numeral, no bar and no
order — more than the five peer cards' figures put together. At 12px in a tighter box they pack where they can
and the block is about 245px. **Rejected: a two-column grid.** Eight items divide evenly, so there would be no
part-empty cell — but a half-width phone cell is 145px and the longest item is 192px of nowrap pill, so it
would overflow, and a column count is the thing this block gave up twice already.

**The close's line.** 18px Light on a 98-character sentence is four centred lines on a phone, which is the
second-hero reading the promotion to display scale was reverted for, arriving by measure instead of by size.
16px takes it to three. The contrast bound is on the colour and does not move with the size: the veil is one
flat value, so white stays the only legal ink.

## `ANSR ATLAS` — the product name is a step SMALLER than the brand half, and only on the result screens

**Reported as "ATLAS looks bigger and sits a bit far from ANSR" on the result screens, with the entry
point's headline read as correct.** Both halves of that are real and both were measured; the entry point
needed nothing.

**Measurement method, because path coordinates are the wrong source.** A traced outline puts control
points outside its ink, and both marks' S overshoots the cap line and the baseline by different amounts —
so an ink bbox measures the S and not the caps. Each mark was rasterised at 1600px and scanned for alpha,
windowed in x to the flat-topped letters only (`ATL A` without the S; the wordmark's `A N` without the S,
the R and the registered symbol). Cap band as a fraction of the box: ATLAS 0.95125, the ANSR wordmark
(158×41) 0.92375, the on-dark lockup (253×91) 0.41625. Same approach `logo:crop` uses.

What that gives, rendered:

| | ANSR caps | ATLAS caps | ratio | ink gap |
| --- | --- | --- | --- | --- |
| Entry point, 72px | 0.739em | 0.712em | **0.9641** | **0.266em** |
| Result screens, was | 0.708em | 0.712em | 1.0068 | 0.410em |
| Result screens, now | 0.708em | 0.682em | 0.9634 | 0.260em |

**The size complaint is NOT a cap-height error, and that is the whole finding.** At parity the two agreed
to 0.7%, which is 0.14px at 30px — nobody sees that. What is visible is that ATLAS is the wider and
heavier run (stem 0.1417 of its cap height against the wordmark's 0.137) and that on this band the brand
half is the FULL lockup, so the letters sit beside a circular mark two and a half times their cap height
and read reduced by it. The entry point has none of that: the wordmark stands alone in a line of type.

**So the correction is optical and the entry point supplies the amount.** It already draws ATLAS at 0.9641
of the ANSR caps beside it — incidentally, because `AnsrWordmark` is set at 0.8em of artboard rather than
the 0.772em cap parity would ask for — and that is the relationship the project owner reads as one lockup.
`0.717em` of box reproduces it on the result screens. **Rejected: growing the lockup to 1.775em instead**,
which would have made the two ANSR marks agree at one cap height and kept ATLAS at a single size. It
grows the circular mark 4.4% and with it the `h1`'s whole height, and 1.7em is the measured number that
puts the mark about half an em above the caps and half below the baseline — the geometry of a lockup, paid
for to fix a 0.14px discrepancy that was never the complaint.

**The gap is a WORD SPACE, stated in `em`.** It was `ms-3`: 12px, which is 0.4em at 24px and 0.4em at 30px
only by coincidence of being the same 12px — against the 0.266em the headline sets between the same two
halves. The display face's space advance is 0.26em; the lockup's artboard carries 0.0095em of trailing
clearance past the registered symbol, so `ms-[0.25em]` lands the visible gap on the headline's. A spacing
step cannot do this: the gap has to hold its proportion across the 24/30px step and a fixed pixel does
not.

**Both numbers are the CALL SITE's, not `AtlasWordmark`'s defaults, and that is deliberate.** The
component's 0.749em still serves the entry point, where the ANSR half is a different object. Two sizes for
one mark is normal optical practice and the alternative — one size that is wrong on one of the two
surfaces — is worse.
