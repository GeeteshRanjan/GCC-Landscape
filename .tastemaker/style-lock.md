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

## Colour contract — the one measured correction

The brand's own pairing for a primary action is white on `--ansr-orange`. **Measured at
3.22:1, which fails WCAG AA for text at any size the CTA actually uses.** Black on the same
fill is **6.52:1**.

So the public screens put **black on the orange fill**, not `--ansr-action-text`. The palette
was left alone and a legal pairing used instead, per the ordered failure path: reuse a
pairing that already passes before touching a token. Applied in
`src/components/screen1/input-panel.tsx` and the closing CTA in `peer-view.tsx`.

Pairings verified for the public screens:

| Pairing | Ratio | Use |
| --- | --- | --- |
| `--ansr-text` on `--ansr-surface` | 21:1 | body, headings |
| `--ansr-text-muted` on `--ansr-surface` | 9.0:1 | secondary copy, captions |
| `--ansr-accent` on `--ansr-surface` | 8.55:1 | kickers, figures, the industry count |
| `--ansr-accent` on `--ansr-surface-subtle` | 7.77:1 | same, on a tinted band |
| `--ansr-white` on `--ansr-accent` | 8.55:1 | accent chips |
| `--ansr-white` on `--ansr-surface-inverse` | 16.26:1 | the closing band |
| `--ansr-text` on `--ansr-action` | 6.52:1 | **primary CTA label** |
| ~~`--ansr-white` on `--ansr-action`~~ | 3.22:1 | **do not use** |

Re-measure with `python3 .kiro/skills/tastemaker/scripts/check_contrast.py <fg> <bg>` before
introducing any pairing not listed.

## Density & spacing — public screens only

Admin is a dense internal tool and keeps its own density. These apply to the public screens.

- Control height **44px** (`h-11`), against admin's 36px. A public form has to survive a
  phone and a first-time visitor. This is why `src/components/screen1/input-panel.tsx` has
  its own field primitives rather than importing `components/admin/fields.tsx` — sharing
  them would mean an admin tweak silently changing the public screen.
- Section padding is **weighted by role**: connective `py-12` (48px), standard `py-16` (64px),
  pivotal `py-20` (80px). Deliberately tighter than a standalone landing page's
  128–192px tiers, because this is an embedded tool inside a page that already has its own
  rhythm — 192px of air inside an iframe spends the host page's scroll on nothing.
- Card internal padding `p-6` (24px). Content cards, not compact tiles.
- Body copy capped at `max-w-measure` (the token's own 68ch), never a hand-picked `ch`.

## Section separation

**Alternating surface tint**, `--ansr-surface` ↔ `--ansr-surface-subtle`, applied at every
boundary. One mechanism, never mixed with dividers — the brand's geometry is already
hard-edged and hairline-heavy, and rules between full-width bands read as noise on top of it.

**One exception, used exactly once per screen:** the closing call to action sits on
`--ansr-surface-inverse`. It is the only band that asks for something rather than showing
something, and it earns the inversion. Do not add a second inverse band to Screen 2.

## Shape language

- Radius `md` (4px) by default, `pill` for chips and counters only, `none` against a motif.
  Straight from the token scale's own rules.
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

Screen 1 uses `assets/brand/motif/arc-dome.svg`, recoloured to `--ansr-teal-600` and trimmed
with `scripts/brand_asset.py`, written to `public/brand/header-horizon.svg`. Placed with
`.ansr-motif` plus `.gcc-horizon`: anchored to the trailing bottom corner at 62% width and
masked to fade away from its anchor. Hidden below `md`, where the header text runs full width
and there is no empty ground for it to occupy.

Two things learned by looking at it, worth not relearning: stretched wide enough to bleed
across the header, the only part of the dome that fits inside a header's height is its
flattest slice, which reads as diagonal wallpaper rather than arcs; and the headline is
leading-aligned and capped at the reading measure, so the trailing side is the ground the
ornament should take.

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

## Reference intelligence

- Design read: an **embedded evidence tool** for CIO/CTO/COO/HR and finance leaders at large
  global companies, mode **Persuade — by evidence, not by pitch**, in an institutional,
  hard-edged visual lane set by the brand.
- Dials: variance **3** (this must look like ANSR, not like something novel), motion **3**,
  density **6**, art direction **4**.
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

Carried over unchanged: the colour contract, 44px controls, weighted section padding,
alternating tint with a single inverse close, the `.gcc-enter` stagger, one motif on the header.

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

**Charts were considered and declined.** `bklit-ui` (`@visx` + `motion`) would add a client
dependency and an 1100ms default enter animation to what are labelled comparisons of two to
seven values. CSS bars in a `dl`, and grids as real `<table>`s with `scope` on both axes, carry
the same information with the figure always in text beside the mark.

**Motion is the tab switch.** Radix unmounts the inactive panel, so the panel's three blocks
replay `.gcc-enter` on every switch. Three steps rather than one per card: twelve staggered
cards would put the last most of a second behind the first.
