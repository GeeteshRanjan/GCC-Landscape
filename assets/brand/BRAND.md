# ANSR brand foundation

Extracted from `Branding_Palette.docx` on 2026-08-26. That file has been removed; this
document plus `reference/palette-core.png` and `reference/palette-gradients.png` are the
record. `tokens.css` is the machine-readable source of truth — this file explains it.

The docx carried no text and no typeface data. Its entire payload was the two boards now
in `reference/`, so nothing was lost.

## Core palette

Eight entries. Values below are the doc's stated values, which govern; every one was
sampled back off the source board and confirmed within PNG compression error.

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
| `#00B8A9`, `#00B3A5` | bright mint | `--ansr-teal-400` |
| `#F05A30`, `#F05722` | vermilion | `--ansr-orange` |
| `#F47F20`, `#F58A28` | amber | `--ansr-orange-400` |
| `#006968` | deck teal | `--ansr-teal-600` |
| `#DD6236` | logo orange | `--ansr-orange` |

That last one is a judgement call worth flagging: the logo SVGs shipped with `#DD6236`, a
duller orange appearing nowhere in the brand doc. It was treated as the same export drift
seen throughout and pulled to the sanctioned `#FF5400`. Reversible in one line if brand
governance disagrees.

## Derived ramps

The brand gives two teals; motifs need up to nine depth steps. Rather than invent hues,
`teal-900`…`teal-500` are Oklab interpolations between the two brand anchors and
`teal-400`…`teal-100` are tints toward white. Orange and grey follow the same logic.
Regenerate with `python3 scripts/brand_asset.py ramp`.

## Decisions not sourced from the brand doc

The doc covers colour only. These were decided for the project and are recorded in
`tokens.css`; each is a single-token swap if brand later supplies a standard.

- **Typeface — Inter.** The doc specifies none, and its own boards used Word defaults.
  Inter was chosen for tabular numerals and small-size legibility, both of which a
  benchmarking product depends on.
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

| Token | Value | Defect |
| --- | --- | --- |
| `--ansr-status-danger` | `#FF5400` | **ΔE 0.000 from the CTA orange.** Delete rendered identically to Save. Also only 3.22:1 on white, so it failed text contrast independently. |
| `--ansr-status-warning` | `#FF865D` | ΔE 0.095 from danger — not clearly different. |
| `--ansr-status-success` | `#004757` | ΔE 0.044 from info — effectively the same colour. |

All four `--ansr-status-*` tokens are retired. `scripts/brand_lint.py` flags any attempt to
reintroduce them.

### What the palette can actually signal

Measured, with 0.15 Oklab ΔE as the threshold for "clearly different":

- Teal steps sit within **ΔE 0.044–0.087** of each other, so success and info cannot be
  separated by colour at all.
- Orange is committed to CTAs by the brand doc, so danger cannot borrow it.

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

**Recommended value: `#BC4757`**, selected by constrained search rather than taste:

| Requirement | Threshold | Result |
| --- | --- | --- |
| Contrast on white | 4.5:1 | 5.03:1 |
| Contrast on Deep Teal | 3.0:1 | 3.23:1 |
| ΔE from CTA orange | 0.15 | 0.152 |
| ΔE under protanopia | 0.08 | 0.130 |
| ΔE under deuteranopia | 0.08 | 0.154 |

It is a muted, slightly dusty red rather than a signal red — that is the constraint set
doing its work. Requiring legibility on *both* white and Deep Teal rules out saturated
reds: the strongest candidates reach 14:1 on white but collapse to 1.13:1 on Deep Teal,
which is a primary brand surface.

**Do not also add a green.** Tested and rejected. The best candidate green `#008700` is
strong alone, but red-versus-green collapses under deuteranopia — ΔE 0.058, rendering as
`#807854` against `#7E701A`. Deuteranopia affects roughly 1 in 12 men. Success stays teal
plus a check icon, which is more robust than a green would be.

**If the ask is declined**, nothing breaks. The `.ansr-destructive` form-based pattern is
implemented and shippable today. The cost is that destructive actions are distinguished by
shape and wording rather than at a glance by hue — a real but bounded usability cost.

## Asset library

`logo/` is used literally — pick the lockup that matches the ground. `motif/` and
`texture/` are starting points and must be adapted before placement; see
`.kiro/skills/ansr-brand-assets/SKILL.md` and `manifest.json`.
