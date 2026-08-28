# ANSRx visual language — extracted from `Group 149.svg`

Reference detail, read on demand. Not steering.

`Group 149.svg` is a 1440×5531 Figma export of an ANSRx marketing page: nine bands from a site
nav to a footer. Every glyph in it is outlined, so nothing about its typography is readable as
text — this file is the measurement of it, so the 7.1 MB export never has to be opened again.

**Precedence.** `assets/brand/tokens.css` outranks this file, then
`.kiro/steering/design-stack.md`, then `.tastemaker/style-lock.md`. Where a measured value here
has no token, it is named as a gap at the end, not used.

## How every number here was obtained

Reproducible, and worth re-running rather than trusting if a figure looks wrong.

1. **Geometry** — Chromium renders the SVG, then `getBBox()` on every element down to depth 3.
   Gives band rects, card frames, radii, stroke widths, fills, and the bounding box of each
   outlined text run.
2. **Type sizes** — the page is screenshotted in 700px slices and in tight crops at 3× device
   scale, then a row-ink profile finds each text line's ink extent and the baseline pitch
   between lines.
3. **Size from ink** — the real Moderat webfont is loaded into a canvas and
   `actualBoundingBoxAscent + actualBoundingBoxDescent` measured for the exact string, giving an
   ink-to-em ratio. Measured ink ÷ ratio = font size. Cross-checked against
   `measureText().width` ÷ the same string's width ratio. Where both agree the size is certain;
   where they disagree the string was a multi-line block and only the ink figure holds.
4. **Weights** — modal horizontal run length through the stems, against Moderat's own measured
   stem ratios (Light 0.075 em, Regular 0.095 em, faux-bold +0.02 em).
5. **The live site** — `https://www.ansr.com/` loaded at 1440 and computed styles read
   directly. This is what confirmed the typeface and the CTA geometry.

## The language in one paragraph

A page is a **vertical stack of full-bleed bands**, each on one of four grounds, with no rule
ever drawn between them. Type is enormous and set tight — an 80px hero at a 1.01 line-height,
70px section headings at 1.10 — in a single geometric grotesque whose Light weight carries all
body copy and whose Bold carries figures and statements. Colour is deep navy, one bright
teal, and orange used exactly once per band as the action. Every panel is hard-edged **except**
the two things that are allowed to be round: the pill CTA and one stat card. Ornament is
never illustration: it is the ANSR pin, repeated — as a fan of rays, a ramp of vertical bars,
a dissolve of hairlines, or a texture of diagonal streaks — always behind content, always
derived from the same primitive.

## 1. Typeface

**Moderat** (TightType), confirmed three ways: the live site loads
`Moderat-Light.woff` and `Moderat-Regular.woff` and sets `font-family: Moderat` on every
heading and paragraph; the comp's outlined glyph widths match Moderat's advance widths to
within 1%; its cap-height ratio (0.70 em) matches the measured cap heights.

Weights in play, and what carries them:

| Weight | Measured stem/size | Used for |
| --- | --- | --- |
| Light 300 | 0.075 em | **all body copy**, leads, the "Why" display word, the second half of a two-tone card title |
| Regular 400 | 0.095 em | the hero h1, half the section headings, button labels, small labels |
| Bold 700 | ~0.125 em | figures, statements, eyebrows, the other half of the section headings, FAQ questions |

Two findings that matter more than they look:

- **Body copy is Light, not Regular.** Measured stem 1.33px at 18px = 0.074 em, and the live
  site's own CSS says `Moderat 300` on every `<p>`. A page set in Regular body will not read
  as this brand — it is the single biggest tell.
- **The live site only ships two weight files.** Its `font-weight: 500/600/700` rules are
  therefore browser-synthesised faux bold. Do not replicate that; specify real weights and
  load real files, or the bold half of the type system arrives smeared.

Only two weights being licensed on the live site is the reason a section heading appears in
two visually different weights across the comp: some were set from a real Bold in Figma that
the site itself cannot render.

**Licensing is unresolved and is a question for ANSR, not a decision to make here.** Moderat
is commercial. Their WordPress install serves the two `.woff` files publicly, which is not the
same as a licence covering an embedded tool. Three paths, in order of preference:

1. Ask ANSR for the Moderat webfont licence — the tool is embedded in an ansr.com page, so
   their existing licence may already cover the domain. Self-host under `public/fonts/`.
2. **Hanken Grotesk** as the stand-in. Already loaded on ansr.com as its secondary family, on
   Google Fonts, free to self-host, and a geometric grotesque of the same posture. It runs
   about 8% narrower than Moderat at the same size, so display sizes want no adjustment but a
   headline that fitted a line in the comp will fit with room to spare.
3. Inter, the current `--ansr-font-sans`. Correct and legible, and visibly not this brand —
   the tell is the double-storey `g` and the narrower caps.

Whichever wins, it goes in one place: a `--ansr-font-display` token beside `--ansr-font-sans`.
This also closes the open `handoff.md` item about no web font loading at all today.

## 2. Type scale, as measured

Sizes are the comp's own, at a 1440 canvas. `lh` is measured baseline pitch, so the ratio is
real rather than inferred.

| Role | Size | lh | ratio | Weight | Colour | Example |
| --- | --- | --- | --- | --- | --- | --- |
| Hero h1 | **80** | 81 | 1.01 | Regular | white on the gradient | "Global Teams for Growing Companies" |
| Display word | 72 | — | — | Light | white on navy | "Why" beside the logo lockup |
| Hero figure | 72 | — | — | Regular | orange | the "7" in the stat card |
| Section h2 | **70** | 77 | 1.10 | Regular *or* Bold | black on tint, teal on navy, deep teal on white | "Come as you are." / "What powers ANSRx" |
| Page-section h2 | 64 | — | — | Bold | deep navy | "FAQ's" |
| Band figure | 64 | — | — | Bold | orange | "2.2M+", "14M+" |
| Card title | 44–46 | — | — | Bold + Light mixed | deep teal, with the `x` in orange | "**ANSRx** Ready" |
| Sub-heading | 36 | 39 | 1.08 | Bold | bright teal | "Your plans are still nascent." |
| Figure label | 30 | — | — | Regular | white | "days to hire" |
| Statement | 22 | 24 | 1.09 | Bold | black | the "Best for:" answer |
| Eyebrow | 22 | — | — | Bold | orange | "For Speed" |
| Button label | 22 | — | — | Regular (site says 500) | white on orange | "Get Started" |
| FAQ question | 22 | — | — | Bold | black | "How is this different…" |
| Lead / body L | **18** | 20 | 1.11 | Light | black | the paragraph under an h2 |
| Small label | 18 | — | — | Light | muted teal-grey | "Problem 1" |
| Body M | 16 | 18 | 1.13 | Light | white / black | card body, stat card body |
| FAQ answer | 18 | 24 | 1.35 | Light | black | the disclosed panel |

Three things to take and one to refuse:

- **Take the size jump.** 80 → 70 → 36 → 18 is a scale with a hole in the middle on purpose:
  nothing sits between a heading and body, so hierarchy is never ambiguous.
- **Take the display leading.** 1.01 on the hero and 1.10 on section headings is what makes a
  three-line headline read as one object. Our `--ansr-leading-tight` is 1.15, one step loose
  for this.
- **Take the two-tone title.** "**ANSRx** Ready" sets the product name Bold and the variant
  Light at the same size, with the `x` in orange. One string, three treatments, no extra
  element.
- **Refuse the body leading.** 1.11 on 18px multi-line body copy is a readability regression,
  and the comp's own FAQ answer contradicts it at 1.35. Use `--ansr-leading-normal` (1.5) for
  anything longer than two lines. This is the same call the style lock already made about
  white-on-orange: keep the look, drop the defect.

## 3. Grid

The card row resolves the grid exactly: three cards of 407px with 21px gutters.

```
407 = 4 columns × 86 + 3 gutters × 21
12 × 86 + 11 × 21 = 1263  content width
```

So: **12 columns of 86, 21px gutters, 1263 content width** inside 1440. Every measured element
lands on it — the 300px problem column is 3 columns, the 723px stat card is 7, the 1263 heading
block is 12.

Two irregularities, both Figma slop rather than intent: the content block sits at x=118 with
its right edge at 1380, so it is 29px right of centre; and the FAQ accordion is wider than
everything else at x=100.5, w=1291.

**Normalised for this project:** `--ansr-container` (1280) centred, 12 columns, `gap-6` (24px)
— which gives a 4-column card of 413 instead of 407. Snapping the 21px gutter to the 4px base
unit is worth more than reproducing the 21.

## 4. Bands

The page is nine bands. Heights are at a 1440 canvas and scale with content, not fixed.

| # | y | h | Ground | Role |
| --- | --- | --- | --- | --- |
| 1 | 0 | 72 | white | site nav (not ours — we are in an iframe) |
| 2 | 64 | 602 | **navy→teal gradient** | hero: h1 + one pill CTA, fan motif right |
| 3 | 666 | 235 | near-white `#F5FFFE` | customer logo strip |
| 4 | 901 | 493 | **deep navy** | one rounded stat card, bar-ramp motif |
| 5 | 1392 | 1133 | **pale mint** | h2 + lead + three offer cards, fan motif top-right |
| 6 | 2525 | 648 | white | centred h2 + three icon figures |
| 7 | 3173 | 797 | **pale mint** | split: h2 left, 2×2 problem grid right, diagonal texture |
| 8 | 3969 | 352 | **deep navy** | closing band: one h2, one pill CTA, full-bleed bar stripes |
| 9 | 4321 | 645 | white | FAQ accordion, then the footer |

The system, stated as rules:

- **Four grounds, not two:** the gradient, deep navy, pale mint, white. Plus the near-white
  logo strip, which is a tinted white rather than a fifth ground.
- **No divider is ever drawn between bands.** The ground change is the separation. Our style
  lock already holds this.
- **Grounds are assigned by role, and the same ground repeats.** Pale mint appears twice, navy
  twice. There is no alternation — band 5 and band 6 are mint then white, band 7 and 8 are mint
  then navy.
- **Never two adjacent bands on the same ground.**
- **Orange appears once per band, always as the action.** Two bands have a pill; no band has
  two.
- **A motif belongs to a band, bleeds off one edge of it, and never crosses into the next.**

Vertical rhythm inside a band: **~120px above the first ink, ~100px below the last.** Measured:
122, 115, 151, 119 top; 103, 93, 64 bottom. Heading to lead is ~22; lead to the first card is
~38. At our 1280 canvas and inside an iframe the style lock's existing tiers
(`py-16 md:py-24`, `py-20 md:py-28`) are the right expression of this — the comp's 120 is
what a standalone page can afford, not what an embed should take.

## 5. Colour

Measured against `tokens.css`. Everything in the first block is already expressible.

| Measured | Occurrences | Token to use | ΔE |
| --- | --- | --- | --- |
| `#08252F` `#072228` `#082D36` navy grounds | 12 | `--ansr-teal-900` / `--ansr-surface-inverse` | small |
| `#063239` card on navy | 2 | `--ansr-teal-800` / `--ansr-surface-inverse-soft` | small |
| `#004C4D` `#00544C` deep teal headings | 7 | `--ansr-teal` / `--ansr-accent` | small |
| `#FD4E11` `#F05722` `#DD6236` orange | 41 | `--ansr-orange` / `--ansr-action` (#FF5400) | the live site's own CTA is #FF5400, so the token is right and the comp drifted |
| `#B9AFAF` accordion hairline | 4 | `--ansr-border-strong` | small |
| `#85B3AF` muted label on mint | 4 | `--ansr-teal-300` / `--ansr-text-muted` on tint | small |
| `#F5FFFE` logo strip | 1 | `--ansr-surface` or `--ansr-surface-subtle` | tinted vs neutral |
| black body text | many | `--ansr-text` | exact |

Three genuine gaps. None is used anywhere until ANSR decides — see the open decisions.

| Measured | Occurrences | Why no token covers it |
| --- | --- | --- |
| `#00BAA8` `#00B3A5` `#00B8A9` bright mint-teal | **141** | `scripts/brand_lint.py` names all three as off-brand deck art. It is the comp's most-used accent: every sub-heading on navy, the closing h2, the bar motifs, the icon fills. |
| `#D1E9E7` pale mint ground | 3 bands | `--ansr-surface-tint` is `--ansr-teal-100` #E1E9EB — greyer and lighter. The comp's ground is a visibly greener tint. |
| navy→mint vertical linear gradient | the hero | `--ansr-gradient-teal` is a *radial* teal over deep teal. The comp's hero is a plain top-to-bottom linear from `#08252F` to `#00BAA8`, with the ramp extending past the band so only 3%–82% of it is visible. |

**The pattern behind all three gaps is one question.** The comp is built on a bright mint-teal
that the brand system deliberately rejected as pre-brand deck art. Either the comp is a newer
art direction than `Branding_Palette.docx` — in which case the palette and the lint's
`OFF_BRAND` list are out of date — or the comp was made from the old deck. Its use of `#FD4E11`
rather than the brand's own `#FF5400` and `#08252F` rather than `#00242E` says it was not built
from `tokens.css` at all. That is ANSR's call, not one to make from a file.

**Accessibility corrections to carry over unchanged.** White on the comp's orange is 3.22:1 and
fails AA; the style lock's black-on-orange (6.52:1) stands. The comp puts white on its orange
pill twice — do not copy it.

## 6. Shape

Radius is not a scale here, it is a signal. Three values, each meaning one thing:

| Element | Radius | Note |
| --- | --- | --- |
| CTA pill | 24.7 on a 49.4-tall button = **fully round** | Live site: `border-radius: 100px`, `padding: 12px 24px`. Measured pill 225×49.4 with a 22px label and 53px of side padding. |
| Stat card | **17** | The only rounded panel on the page, and it is the one that carries a figure. |
| Everything else | **0** | Offer cards, accordion rows, icon glyph boxes, band edges. |

Ours already says this: `md` (4px) default, `pill` for actions only, `none` against a motif.
The comp is one step harder-edged — the offer cards are true 0.

**No shadow appears anywhere on the page.** Separation is ground, hairline, or dissolve.

Hairlines measured: 0.85px white under the hero figure (381 long, a deliberate part-width rule,
not full-width), 1px `#B9AFAF` on accordion rows with **shared borders** between adjacent rows,
1.7px teal underline under "Best for:" offset ~4px below the baseline.

## 7. Motifs

Five, all derived from the ANSR pin. Each is reproducible from parameters, which matters
because `assets/brand/` already holds the source art and the rule is to adapt rather than
place.

**A. Pin fan.** Rays radiating from an off-canvas origin, each capped with a small solid flag,
some carrying a human silhouette. Hero: 905×762 at the right, filled with a diagonal gradient
one step lighter than the ground, bleeding off the right edge. Mint band: four overlapping
fans in `#93DBD4` on `#D1E9E7`, bleeding off the top-right corner. Already in the library as
`pin-fan-wide`, `pin-fan-corner-teal`, `pin-arc-*`.

**B. Bar ramp.** The signature. Vertical bars at a **constant pitch** whose **width grows
linearly**, so density ramps across the field:

```
10 bars   widths 7.3 → 18.4, +1.23 per step   pitch 20.2   height 165.4
gap therefore closes from 12.9 to 1.8
```

In the stat card it appears twice, the second mirrored under the first, filling a 219-wide
panel that shares the card's 17px radius and takes a three-stop gradient. In the closing band
it runs full-bleed across 1441px behind the heading. `.ansr-stripes` in `tokens.css` cannot
express it — a repeating gradient has one width — which is why `.ansr-bar-ramp` is added below,
with `--flip` for the mirrored copy and `--tile` for the full-bleed case.

**C. Line dissolve.** How a white card ends without an edge: 27 horizontal bars at a 5.66px
pitch whose height decays linearly from 5.2 to 0.2 over 154px, in the card's own white over
the band's ground. The card's content runs to its true bottom edge and the dissolve carries it
out. This is a far better answer than a gradient fade because it stays crisp at any zoom.

**D. Diagonal streak texture.** Full-bleed parallelogram streaks at roughly -20°, 1986 wide ×
356 tall, bleeding off both edges of the mint band at very low contrast. Already in the
library as `texture/deep-teal-diagonal-wide.svg`.

**E. Bar-field icon.** A 124px glyph box whose fill is a dense vertical bar field in bright
teal, with the pictogram knocked out in the ground colour. Not a stroked icon and not a flat
fill — the icon is made of the same primitive as the motifs. This is the one move in the comp
we have no equivalent for, and it is cheap: a mask over `.ansr-bar-ramp`.

## 8. Component anatomy

Measured, so a rebuild does not re-guess. All numbers at the 1440 canvas.

**Hero.** Band 602 tall. h1 at x=118, 191 below the band top, three lines at 80/81, max ~500
wide so it occupies under half the band. Pill 21 below the last baseline. Fan fills the right
half, bleeding right. 105 of air under the pill.

**Stat card.** 723×328, radius 17, one step lighter than its band, at x=615 — right of centre,
not centred. Padding-left 82, padding-top 79. Figure 72px orange; label 30px white; a 381px
hairline at 0.85px; body 16/18 in two or three lines. Bar-ramp panel 219 wide flush to the
right edge, gradient-filled.

**Offer card.** 407×562, radius 0, white on mint, 21px gutters. Padding-left 37, padding-top
**95** — a deliberately empty shoulder. Then: eyebrow (22 Bold orange) → 32 → title (44, two-tone)
→ 50 → qualifier (22 Bold) → 65 → body (16/20, five lines) → 87 → "Best for:" (18, teal,
underlined) → 34 → statement (22/24 Bold, three lines) → the card's bottom edge → 154px of
dissolve.

**Icon figure.** Three columns. 124px bar-field icon → 16 → figure (64 Bold orange) → label
(24 Bold orange, two lines at 28) → 18 → body (16/18 Light black, three lines). The label being
orange as well as the figure is unusual and it works because the body underneath is black.

**Problem grid.** Band splits 6/6. Left: h2 (70/77, three lines) + lead (18/20, three lines).
Right: two columns of 3 (300 wide, 331 pitch) × two rows. Each cell: label (18 Light, muted) →
27 → heading (36/39 Bold, bright teal) → 20 → body (16/20 Light).

**Closing band.** 352 tall, navy, full-bleed bar stripes. Centred h2 (70, bright teal) 119 below
the top, pill centred 17 below it, 103 of air after. Nothing else in the band.

**Accordion.** Full-width rows, 70 tall closed, 1px `#B9AFAF`, borders shared, radius 0.
Question 22 Bold, vertically centred, padding-left 18, prefixed by a `+` / `−` glyph inline
in the text rather than a control at the right. Open row grows to 131 with the answer at 18/24
Light, indented a further 17.

## 9. Applying it here

What maps onto existing primitives with no new code:

- `Section` already owns band grounds and role-weighted padding. The comp adds: a fourth
  ground, and the rule that grounds repeat rather than alternate.
- `ScreenHeader` already carries a motif and a display title. The comp's hero is the same
  shape one step larger and tighter.
- `Stat` already puts a hairline under a figure with the label below. The comp's part-width
  rule (381 of 723) is a detail worth adopting.
- `ClosingCta` already is band 8: inverse ground, one orange pill, one brand texture.
- `PeerCard` and the metric cards are the offer card's job, and the 95px top shoulder plus the
  dissolve are the two moves they do not yet have.

What is genuinely missing, and is added to `tokens.css` by this pass because each is additive
and inert until used:

- `--ansr-font-display` — the display family slot, so the Moderat decision lands in one place.
- `--ansr-text-8xl` (80px) — the scale stops at 72 and the comp's hero is 80.
- `--ansr-leading-display` (1.05) — `tight` is 1.15, and a three-line hero at 1.15 does not
  read as one object.
- `.ansr-bar-ramp` — motif B, which `.ansr-stripes` cannot express.
- `.ansr-dissolve` — motif C.

What is deliberately **not** done here: no public screen is restyled. Three unreviewed
art-direction passes are already sitting in the working tree, and a fourth on top of them
would make all four unreviewable.

## 10. Open decisions

1. **The bright mint-teal.** 141 occurrences in the comp; named off-brand in
   `scripts/brand_lint.py`. Is the comp the newer direction, or was it built from the old deck?
   Everything else waits on this, because it is the accent the whole page is keyed to.
2. **The pale mint ground.** `#D1E9E7` against our `--ansr-surface-tint` `#E1E9EB`. Same
   question, smaller stakes — the tint we have works, it is just cooler.
3. **The hero gradient.** A linear navy→mint is not expressible from the two gradient tokens.
   If (1) goes the comp's way this becomes a third gradient token.
4. **Moderat's licence**, per section 1. Until it is answered, Hanken Grotesk self-hosted is
   the recommendation, and it also closes the "no web font loads" item in `handoff.md`.
5. **Whether `Group 149.svg` can now be deleted.** Every number in it is in this file, and the
   slice renders are reproducible in about a minute. It is 7.1 MB and gitignored, so it is
   only costing local disk — but nothing needs it any more.
