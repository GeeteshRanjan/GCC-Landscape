# ANSR brand foundation

Extracted from `Branding_Palette.docx` on 2026-08-26. That file has been removed; this
document plus `reference/palette-core.png` and `reference/palette-gradients.png` are the
record. `tokens.css` is the machine-readable source of truth — this file explains it.

The docx carried no text and no typeface data. Its entire payload was the two boards now
in `reference/`, so nothing was lost.

> **The screen palette below is superseded.** `Group 149.svg` is the current art direction —
> measured in `docs/ansrx-visual-language.md`, with the values in `tokens.css`, which governs.
> The comp was not built from this docx at all: its action is `#FD4E11` rather than `#FF5400`,
> its ground is a navy rather than Deep Teal, and its most-used accent is a bright mint-teal
> this palette does not contain. `scripts/brand_lint.py` now **rejects** the values in the
> table below, which is the inversion of what it used to do.
>
> **Three things here are still live, and are why this file was not deleted:** the CMYK and
> PMS specifications, which are the only print reference that exists and which the comp does
> not restate; the **fitted gradient geometry** below, least-squares derived from the boards
> and still used verbatim by `--ansr-gradient-teal` and `--ansr-gradient-orange`; and the
> status-colour analysis, whose conclusion was re-run against the new palette and held.

## Core palette

Eight entries. Values below are the doc's stated values; every one was sampled back off the
source board and confirmed within PNG compression error. **They are the print reference now,
not the screen reference.** What replaced each on screen:

| Docx name | Docx hex | Replaced by | Current value |
| --- | --- | --- | --- |
| Light Teal | `#005465` | `--ansr-teal` (= `teal-600`) | `#004C4D` |
| Deep Teal | `#00242E` | `--ansr-teal-deep` (= `teal-900`) | `#08252F` |
| Orange Highlight | `#FF5400` | `--ansr-orange` | `#FD4E11` |
| *no equivalent* | — | `--ansr-teal-bright` (= `teal-400`) | `#00BAA8` |

Rich Black, White and Light Grey are unchanged. The fourth row is the substantive addition:
the docx palette had two teals, so its ramp's light end could only ever be a desaturated
grey-teal, and the bright accent that carries 141 marks in the comp was unreachable from it.

| # | Name | Hex | CMYK | RGB | PMS |
| --- | --- | --- | --- | --- | --- |
| 01 | Rich Black | `#000000` | 100 100 100 100 | 0 0 0 | — |
| 02 | Light Grey | `#E6E6E6` | 0 0 0 10 | 230 230 230 | — |
| 03 | White | `#FFFFFF` | 0 0 0 0 | 255 255 255 | — |
| 04 | Light Teal | `#005465` | 100 60 50 20 | 0 84 101 | 7714 |
| 05 | Deep Teal | `#00242E` | 90 68 57 65 | 0 36 46 | 548 |
| 06 | Teal Gradient | — | Light Teal + Deep Teal | — | 7714 + 548 |
| 07 | Orange Highlight | `#FF5400` | 0 80 100 0 | 255 84 0 | Orange 021 |
| 08 | Orange Foil | — | print finish, no screen value | — | — |

The doc's own framing: a deliberately small, sophisticated palette that keeps information
presentation clear. **Orange is a highlight, not a brand colour** — restricted to CTAs and
hover states in digital, used in a controlled manner. Orange Foil is print-only (business
cards and similar); it has no digital equivalent and no token.

## Gradients

Two, and only two. Each is built the same way: a light gradient layer with a transparent
background, composited over a solid ground.

| Gradient | Light layer | Ground |
| --- | --- | --- |
| Teal Gradient Blend | Light Teal `#005465` | Deep Teal `#00242E` |
| Orange Gradient Blend | Orange Highlight `#FF5400` | Light Grey `#E6E6E6` |

Geometry was measured, not eyeballed. A 5×5 grid was sampled from each board swatch, then
origin, radius, inner plateau and falloff exponent were least-squares fitted against it:

| | Teal | Orange |
| --- | --- | --- |
| Origin | 95% 85% | 85% 105% |
| Radius | 100% | 110% |
| Opaque plateau | to 30% | to 10% |
| Falloff exponent | 2.0 | 2.5 |
| Peak strength | 100% Light Teal | 50% Orange Highlight |
| Fit quality | 0.026 rms, 0.085 max | 0.037 rms, 0.092 max |

Both are radial, originating near the bottom-right corner, holding full strength across an
inner region before falling away quadratically. Encoded as `--ansr-gradient-teal` and
`--ansr-gradient-orange`; the stop tables in `tokens.css` are that fitted curve sampled
every 10%.

The orange peak is 50%, not opaque. Least-squares fitting the board's peak swatch against
Orange Highlight over Light Grey gives alpha 0.49 — consistent with the doc's description
of a *light* gradient layer.

**Peak colour is deliberately not taken from the board.** Its colour management is
unreliable: the Orange Highlight swatch reads `#EF5921` against a stated `#FF5400`, and the
error is neither small nor uniform across swatches. The rendered teal blend likewise peaks
brighter and greener (around `#0F666A`) than a Light-Teal-over-Deep-Teal composite can
reach. Since the doc states the pairing in words — PMS 7714 + 548 — the stated pairing
governs. Adopting the sampled peak would have introduced a third teal outside the palette.
What the board is trusted for is shape; what the text is trusted for is colour.

## Colours that are not brand colours

Older deck art circulated a wider palette. These appear in historical exports and must be
rejected on sight; `scripts/brand_lint.py` flags them.

| Rejected | Was used as | Replace with |
| --- | --- | --- |
| `#005465`, `#00242E`, `#FF5400` | **this project's own palette, until the reference superseded it** | `--ansr-teal`, `--ansr-teal-deep`, `--ansr-orange` |
| the ramps derived from those three | ditto | the current ramp step of the same number |
| `#F05A30`, `#F05722` | vermilion | `--ansr-orange` |
| `#F47F20`, `#F58A28` | amber | `--ansr-orange-400` |
| `#006968` | deck teal | `--ansr-teal-500` |
| `#DD6236` | logo orange | `--ansr-orange` |
| `#00B8A9`, `#00B3A5` | bright mint, drifted | `--ansr-teal-bright` |
| `#00544C`, `#072228`, `#082D36` | the reference's own drift around its anchors | `--ansr-teal`, `--ansr-teal-deep` |

**The bright mint changed sides.** It used to be the headline rejection here — deck art with no
brand sanction. It is now the accent the whole visual language is keyed to, and `#00B8A9` is
rejected only as a *near-miss* for `#00BAA8`. That reversal is the reason the top-of-file note
exists: a rule read out of context here would have been exactly backwards.

`#DD6236` remains a judgement call worth flagging: the logo SVGs shipped with it, a duller
orange appearing in no brand document. It was treated as export drift and pulled to the
sanctioned action orange — now `#FD4E11`. Reversible in one line if brand governance disagrees.

## Derived ramps

Motifs need up to nine depth steps. The teal family has **four measured anchors** from the
reference — the dark ground (900), a card on it (800), headings on a light ground (600), the
bright accent (400), a muted label (300), the pale ground (100) — with 700, 500 and 200
interpolated between them in Oklab. Orange and grey are still tints toward white from a single
anchor. The ramp is monotonic in Oklab lightness end to end, which is the property the chart
layer's ordinal colour depends on. Regenerate with `python3 scripts/brand_asset.py ramp` and
check it against `tokens.css`; the two must agree.

Two of those steps are measured rather than interpolated for a reason that is not obvious:
**300 is a desaturated grey-teal sitting at almost the same lightness as the bright 400 above
it.** Interpolating 400 → 100 would have produced a saturated mint where the reference has a
muted label colour, so the table cannot be collapsed into a formula.

## Decisions not sourced from a brand document

The docx covers colour only. These were decided for the project and are recorded in
`tokens.css`; each is a single-token swap if ANSR later supplies a standard.

- **Typeface — no longer one of these.** The brand has one: **Moderat**, which ansr.com sets on
  every heading and paragraph and whose advance widths match the reference's outlined glyphs to
  within 1%. **Body copy is its Light 300**, which is the single biggest tell of the brand.
  ANSR supplied the family, so `--ansr-font-display` resolves to Moderat itself, self-hosted
  from four woff2 files; the Hanken Grotesk stand-in is gone. The family has **no SemiBold**, so
  600 is drawn by Medium. `--ansr-font-sans` stays Inter for admin and dense UI, where
  tabular numerals and small-size legibility matter more than brand voice. See
  `docs/ansrx-visual-language.md` §1.
- **Spacing — 4px base unit**, scale `1–32`.
- **Radius — minimal.** The brand's geometry is hard-edged: square-cut pins, sharp logo
  rays. Default `4px`, `0` for anything sitting against a motif, pill reserved for tags.
- **Elevation — teal-tinted shadows**, shallow, so depth reads as palette rather than
  gloss.
- **Motion — 120/180/240/320ms**, all under the 400ms flow threshold.
- **Status is carried by form, not colour.** See the section below — this was measured, and
  the measurement changed the design.

## Status signalling — measured, and one open brand ask

Reproduce with `python3 scripts/brand_status_analysis.py`.

### What was broken

The first cut of these tokens had three defects, all now fixed:

Figures are **against the current palette**, re-measured rather than carried over. The script
derives them from the ramps instead of hardcoding, so this argument re-checks itself whenever
the palette moves — which is the whole reason it was written that way, and it earned that when
the palette did move.

| Token | Value now | Defect |
| --- | --- | --- |
| `--ansr-status-danger` | `#FD4E11` | **ΔE 0.000 from the CTA orange.** Delete rendered identically to Save. Also only 3.35:1 on white, so it failed text contrast independently. |
| `--ansr-status-warning` | `#FF835F` | ΔE 0.098 from danger — not clearly different. |
| `--ansr-status-success` | `#004C4D` | ΔE 0.151 from info — the one figure the new palette moved, and not far enough to matter. |

All four `--ansr-status-*` tokens are retired. `scripts/brand_lint.py` flags any attempt to
reintroduce them.

### What the palette can actually signal

Measured, with 0.15 Oklab ΔE as the threshold for "clearly different":

- **9 of the teal ramp's 36 step pairs are still under 0.15**, and the whole dark end (900
  through 600) sits at **0.043–0.046**. Adding the bright accent raised the ramp's ceiling —
  two adjacent steps now reach 0.151 and 0.187 — so this was worth re-checking rather than
  assuming. It did not change the answer: success and info still cannot be separated by
  colour, because the steps that *are* separable are separated by lightness as much as hue and
  are already spoken for as ordinal depth.
- Orange is committed to CTAs, and the reference tightens that to once per band, so danger
  cannot borrow it.

**This palette supports exactly two semantic colour signals** — neutral
(`--ansr-feedback-neutral`, teal) and attention (`--ansr-feedback-attention`, orange).
Everything else is carried by icon, label, weight and form, which WCAG 1.4.1 requires
regardless. Destructive controls use the `.ansr-destructive` pattern: outlined against a
filled primary, plus a verb naming the consequence, a warning icon, and confirmation when
the action is irreversible.

### The open ask: one functional red

The only genuinely blocked item, and a narrow yes/no.

**Ask:** approve a single functional red for destructive actions, treated as a *safety
affordance* rather than a brand colour — the same way a focus ring is functional rather
than expressive. Brand palettes govern expression; a destructive-action colour governs
whether someone deletes the wrong thing.

**Recommended value: `#B3505B`**, selected by constrained search rather than taste. Re-run
against the new palette; the previous recommendation was `#BC4757`, and the shift is small
because the constraint that binds is legibility on the dark ground rather than distance from
the orange.

| Requirement | Threshold | Result |
| --- | --- | --- |
| Contrast on white | 4.5:1 | 4.98:1 |
| Contrast on the dark ground | 3.0:1 | 3.20:1 |
| ΔE from CTA orange | 0.15 | 0.152 |
| ΔE under protanopia | 0.08 | 0.116 |
| ΔE under deuteranopia | 0.08 | 0.152 |

It is a muted, slightly dusty red rather than a signal red — that is the constraint set
doing its work. Requiring legibility on *both* white and the dark ground rules out saturated
reds: the strongest candidates reach 14:1 on white and collapse near 1:1 on the dark ground,
which is a primary brand surface.

**Do not also add a green.** Tested and rejected. The best candidate green `#00880E` is
strong alone, but red-versus-green is the classic collapse: under deuteranopia the pair
converges far enough to be unusable, and deuteranopia affects roughly 1 in 12 men. Success
stays teal plus a check icon, which is more robust than a green would be.

**If the ask is declined**, nothing breaks. The `.ansr-destructive` form-based pattern is
implemented and shippable today. The cost is that destructive actions are distinguished by
shape and wording rather than at a glance by hue — a real but bounded usability cost.

## Asset library

`logo/` is used literally — pick the lockup that matches the ground. `motif/` and
`texture/` are starting points and must be adapted before placement; see
`.kiro/skills/ansr-brand-assets/SKILL.md` and `manifest.json`.
