# Design reference — brand, tokens, measurements

Read on demand. **Not steering.** This holds the measurements, provenance and reasoning behind the
design rules; the rules themselves are the "Design rules" section of `.kiro/steering/project.md`,
and `assets/brand/tokens.css` is the single source of truth for every value.

This file exists because the enforcement is mechanical rather than textual: `scripts/brand_lint.py`
and the `brand-guard` PostFileSave hook reject a raw hex or a retired colour whether or not any of
this prose is in context. Carrying it on every turn bought nothing.

## Brand source of truth

| Input | Path | Status |
| --- | --- | --- |
| **Palette, type, grid, bands, motifs** | `docs/ansrx-visual-language.md` | `Group 149.svg` measured; **the authority** |
| Palette provenance (CMYK/PMS, gradient fits) | `assets/brand/BRAND.md` + `reference/*.png` | superseded for values, kept for provenance |
| Brand SVG library | `assets/brand/` (+ `manifest.json`) | curated, recoloured to the current tokens |
| Project brief / landscape | `docs/brief.md` | transcribed |

**The palette came from `Group 149.svg`, not from Branding_Palette.docx.** The docx is superseded and
the change is settled, not pending: the comp is the newer art direction and was not built from the
docx at all — its CTA is `#FD4E11` rather than `#FF5400`, its ground is a navy rather than a deep
teal, and its most-used accent is a bright mint-teal the docx does not contain. What survives from the
docx is CMYK/PMS provenance and the two **fitted gradient geometries**, which the comp does not
restate.

## Token families

Eight families, all defined in `tokens.css`. Every value there carries its occurrence count in the
reference or the interpolation that produced it, so a suspect step can be re-derived rather than
argued about: `python3 scripts/brand_asset.py ramp` reproduces all three ramps and must agree with the
CSS.

| Family | Prefix | Notes |
| --- | --- | --- |
| Colour | `--ansr-{black,white,grey,teal,teal-deep,teal-bright,orange}` | Core, measured off the reference |
| — ramps | `--ansr-{teal,orange,grey}-{950..50}` | Oklab interpolations between measured anchors. Teal has four; `--ansr-teal` is **600**, not 500. `teal-950` and `teal-50` are **client-specified**, not measured. The orange ramp is tints plus **two dark steps**: 700, the only orange that can be text on a light ground, and 800, a brown for a MARK on a light ground. 700 mirrors 400 and 800 mirrors 300, so both are derivations rather than picks |
| — aliases | `--ansr-{surface,text,border,action,accent,focus,feedback}-*` | **Components use these.** `accent` teal on light, `accent-inverse` bright teal on dark, `accent-warm` deep orange as ink on light |
| Gradients | `--ansr-gradient-{teal,orange,hero,conic}` | `teal`/`orange` are the docx's fitted geometry; `hero` is the reference's linear ground; conic is a reconstruction |
| Type | `--ansr-{font,text,leading,weight,tracking,measure}-*` | Inter for UI, `font-display` for display; 12→80px scale |
| Spacing | `--ansr-space-{0..32}`, plus `40/48/56` | 4px base unit. The 40–56 steps are **band scale**, past where component rhythm stops |
| Radius | `--ansr-radius-{none,sm,md,lg,xl,pill}` | Minimal — brand geometry is hard-edged |
| Elevation | `--ansr-shadow-{xs..lg}`, `--ansr-z-*` | Teal-tinted, shallow |
| Motion | `--ansr-duration-*`, `--ansr-ease-*` | 120/180/240/320ms, all under 400ms — plus two AMBIENT periods, a different quantity and not steps on that scale: `-marquee` (48s) for the logo strip and `-pulse` (3.2s) for the density map's hub halo |
| Layout | `--ansr-container*`, `--ansr-gutter*` | 1280px content max. `-hero` (704px) caps a display block, `-card` (896px) the entry-point form, `-lead` (800px) the hero's supporting line — wider than `-hero` on purpose, and tied to the hero's outdent |

## Contrast measurements

Measured, not estimated. Re-measure after any palette change.

**Orange has three roles** — CTAs and hover states, display FIGURES, and small categorical EYEBROWS.
Read as CTA-only it left Screen 1, which has no CTA, with one orange mark on the whole page. Never a
surface and never body text.

**One orange ROLE per band, not one orange mark.** A band may repeat one role across its peers, so
four snapshot figures are one decision. Two orange roles in one band is forbidden. Unconfirmed brand
ask — see `handoff.md`.

**Which orange depends on type size, and the two warm tokens invert against the two teals.**

| Token | White | Pale | Mint | Dark |
| --- | --- | --- | --- | --- |
| `--ansr-action` | 3.35:1 | 3.29:1 | **2.63:1 — unusable** | 4.77:1 |
| `--ansr-accent-warm` (= `orange-700`) | 6.53:1 | 6.42:1 | 5.14:1 | **2.44:1 — unusable** |

So `--ansr-action` is legal only on a figure clearing the 3:1 large-text floor; `--ansr-accent-warm`
is the ink for anything at caption size. Orange gets darker as the type gets smaller while teal gets
brighter as the ground gets darker. A figure on a mint zone sits on a white card's own fill, never on
the zone. Neither warm token may fill a control.

**`--ansr-orange-800` has no consumer, and that is current rather than an oversight.** Derived for the
density map's marks when ANSR wanted them brown; the ask moved to the bright anchor and the marks are
`--ansr-action`. The step stays because it completes the dark end symmetrically and the request has
been made once already. Its semantic alias was removed with its purpose.

**The board's bright teal on the mint ground was measured and REFUSED**, at 1.92:1. The board's own
large mint headings sample as `--ansr-teal` or black; the bright accent appears there only at ~26px,
where it fails. So the ban is not a departure from the board.

**The teal family has three anchors and the bright one is for dark grounds only.** `--ansr-teal` is
the heading teal on light; `--ansr-teal-bright` (= `teal-400` = `--ansr-accent-inverse`) is 2.44:1 on
white. Putting it on a light ground is the easiest way to break a screen with an on-brand colour, and
it is unavailable inside a chart on a light ground at all.

**Black ink fails on `--ansr-accent` (2.14:1) and on `--ansr-teal-500` (4.09:1).** A chart setting a
label on its own fill is limited to `teal-100`/`200`/`300`.

**A control's boundary needs 3:1, and only `--ansr-grey-500` clears it among the light neutrals.**
`--ansr-border-strong` (grey-300) is 1.78:1 on white and `--ansr-border-tint` is 1.65:1. grey-500 is
3.28:1 and is what the public form's fields use — against WHITE only; on a `grey-50` fill it drops to
2.98:1, so a tinted field needs a darker edge.

**A bar may be warm in exactly one situation: a set holding a comparator as well as its subjects.**
The HR salary ranking is it — seven subject rows in `--ansr-teal-500` and the all-roles row in
`--ansr-action` at 3.35:1 on white. Two conditions: something in TEXT must say which row is the
comparator, because this palette cannot separate categories by hue; and the warm fill is offered only
on a BARE track, since `--ansr-action` drops to 2.61:1 on the grey one. The text carrier used to be
"(reference)" inside the row's own label, then briefly a sentence under the chart; it is now the
self-descriptive label "All roles" itself, at ANSR's request — no separate note. See `BarTone`.

**`muted` is the third tone and is carried by nothing today.** It is `--ansr-grey-500` at 3.28:1, the
only light neutral clearing the 3:1 floor 1.4.11 asks of a non-text graphic; `--ansr-teal-300` is the
blue-grey a held-back row wants and measures ~2.3:1, so it is unavailable whatever it looks like. The
salary ranking's "roles outside engineering R&D" row took it until ANSR asked for it back on the
subject teal — beside the teal bars and one orange, a grey one read as a third category rather than
as another measurement of the same thing.

**A bar takes ONE teal whether or not it has a track.** `--ansr-teal-500` is 4.51:1 on the
`surface-sunken` track and 5.14:1 on the card's own white, so a bare bar needs no depth step to keep
reading as a mark — it used to take the brand teal, which put two teals on one tab doing one job. The
brand teal is now the `emphasis` fill only, which is the one place a bar is meant to be deeper than
its neighbours.

**Two gradient caps, both forced by measurement.** `--ansr-gradient-teal` is capped at `teal-700` —
its old peak put `--ansr-text-inverse-muted` at 3.30:1, a latent AA failure on every band using it.
`--ansr-gradient-hero` is capped at 60% of the way to the bright accent — run to the full accent the
way the reference draws it, white measures 2.44:1 at the bottom edge. The reference survives that only
because its hero copy sits in the top third, which is a per-placement guarantee rather than a property
of the ground.

## Three client-requested grounds

`#D1E9E7` was already `--ansr-teal-100` / `--ansr-surface-tint`. `#F5FFFE` is now `--ansr-teal-50` /
`--ansr-surface-pale`, a near-white with the mint still in it. `#072228` is now `--ansr-teal-950` /
`--ansr-surface-deep` — **previously lint-blocked as a drift off `--ansr-teal-deep`, and that OFF_BRAND
entry was removed because it is now a live token.** The drift risk is unchanged: the two darks are
within dE ~1 and not separable by eye, so `--ansr-surface-deep` has exactly one consumer, the entry
point's impact band, and anything else wanting a dark ground uses `--ansr-surface-inverse`. Both new
steps keep the ramp monotonic in Oklab lightness and take every ink their neighbour does.

## Reject on sight

The retired docx palette: Light Teal `#005465`, Deep Teal `#00242E`, Orange Highlight `#FF5400`, and
every ramp step derived from them. They were this project's palette until `Group 149.svg` superseded
it, so they keep turning up in older files and screenshots. Also rejected: vermilion `#F05A30`, amber
`#F47F20`, deck teal `#006968`, old logo orange `#DD6236`, and the near-miss drifts around the new
anchors (`#00B8A9`, `#00544C`, `#072228`). `brand_lint.py` names each with its replacement token.

## Radius, in detail

Radius is `none` on every card and panel on the public screens, settled against a RENDER of
`Group 149.svg` rather than a description of it: every container on the board is true 0 — the three
white model cards, the FAQ rows — and the only round things on 5,531px are the pill CTA and two 4px
social squares. `md` (4px) is admin's default, not the public screens'.

Two exceptions, both CONTAINERS rather than contents: the entry point's form card and its controls at
`lg` (8px), which the client asked for, because a 4px field inside an 8px card reads as a mismatch
rather than as restraint; and the floating result card at `xl` (12px), the one round object on the
answer surface, which is what says it is the container while the panels inside it are contents. Do not
spread either to the evidence cards. `pill` is unchanged: chips, counters, actions.

A third was tried on Screen 2 and is gone. The composed tabs' cards took `md` because HR's supplied
composition asked for it; the derived tab never did, so corner radius became a property of which file
drew the tab. `Panel` keeps the `radius` prop defaulting to `none` — still a caller's decision because
it is a decision about a SURFACE, which is exactly why it may not differ between four tabs of one
surface.

## The earned border, in detail

The board agrees with the rule: its white cards on the mint ground carry no border at all, and the one
bordered thing on it is the FAQ row, where each row is an independent interactive object.

Screen 2 had both branches at once for a pass. The composed tabs ran analytical sections on one white
ground with bordered cards, on the argument that a colour change AND two hairlines is two devices
doing one job; the derived tab alternated grounds and drew borderless cards, on the argument that the
zone does the sectioning and that an inline ranked row puts its bar in a 38% middle column with no
track, so the card's edge was never the bar's reference. Both arguments are sound and neither survived
the four tabs being read together — a visitor met a different surface by clicking a tab.

## Status is carried by form, not colour

Re-measured against the new palette rather than carried over, because a bright accent could have
overturned it: it did not. The palette supports exactly two semantic colour signals —
`--ansr-feedback-neutral` (teal) and `--ansr-feedback-attention` (orange). 9 of the teal ramp's 36 step
pairs are under the ΔE 0.15 "clearly different" threshold and the whole dark end sits at 0.043–0.046,
so success/info cannot be separated by hue; orange belongs to CTAs, so danger cannot borrow it.
Success, warning and danger are carried by icon + label + weight + form. Destructive controls use
`.ansr-destructive`. Re-run `python3 scripts/brand_status_analysis.py` after any palette change — it
derives from the ramps rather than hardcoding, so it re-checks itself.

The four `--ansr-status-*` tokens are **retired and lint-blocked**. `--ansr-status-danger` resolved to
the CTA orange, making Delete look identical to Save. Do not reintroduce them.

One open brand ask: a single functional red for destructive actions. Best verified candidate is
`#B3505B` — 4.98:1 on white, 3.20:1 on the dark ground, separable from the CTA orange under both
protanopia and deuteranopia. See `assets/brand/BRAND.md`. Nothing is blocked while it is pending.

## Typeface

**The brand has one: Moderat.** ansr.com sets it on every heading and paragraph, and `Group 149.svg`'s
outlined glyph widths match its advance widths to within 1%.

- **Body copy is Moderat Light 300**, not Regular. Their own CSS says `Moderat 300` on every `<p>` and
  the measured stem confirms it. This is the single biggest tell of the brand.
- The live site licenses only Light and Regular `.woff`, so its 500/600/700 rules are
  browser-synthesised faux bold. Do not replicate that — specify real weights, load real files.

**Moderat is now on the page.** ANSR supplied the family and `--ansr-font-display` resolves to it,
self-hosted through `next/font/local` in `layout.tsx` from four woff2 files converted out of the
supplied TTFs. The Hanken Grotesk stand-in is gone. Measured: unitsPerEm 1000, cap height 0.700 em,
hhea ascent 1.0 em, descent 0.21 em, descender ink 0.21 em, 501 characters, ~40 KB per weight as woff2.

- **There is no SemiBold in this family** — Thin 100, Light 300, Regular 400, Medium 500, Bold 700,
  Black 900 — so `--ansr-weight-semibold` (600) is drawn by the Medium file, declared `500 600`. Left
  undeclared, CSS matching resolves 600 upward onto Bold and `font-semibold` stops being separable from
  `font-bold`, which `IndexTable` depends on.
- **Anything measured ink-to-ink against the old face has to be re-measured, not scaled.** The hero's
  three leading corrections moved by three different factors and one nearly tripled; the reasoning is
  in `ask-hero.tsx`.
- **Figures take the DEFAULT set, so `tabular-nums` is neutralised on the public surface.** All four of
  the family's tabular zeros are slashed and its tabular `1` is footed; the only plain zero is the
  default one, which is proportional (`1` 369 units against `0` 604). One rule in `globals.css`.
- **`ss01` is "Thin Symbols & Accents" and is deliberately unused** — it halves the en dash, thins the
  brackets and `%`, swaps the ampersand for a more decorative form, and does not change the comma, which
  has no meaningful alternate. `ss02` is "Alternate a/g/y", also unused.

`--ansr-font-sans` stays Inter for UI and admin. Full measurement — type scale, grid, band system,
motif parameters — is in `docs/ansrx-visual-language.md`.

## Brand assets

`assets/brand/` — `logo/` (3 lockups), `motif/` (16 pin/arc graphics), `texture/` (2 full-bleed
grounds), `manifest.json`, `tokens.css`.

Motifs and textures are **starting points, never drop-in art** — adapt every placement via
`scripts/brand_asset.py` (recolor, fade, trim, crop, flip, currentcolor, normalize) or CSS. Logos are
the one literal-use exception. The `ansr-brand-assets` skill governs this; activate it before touching
anything under `assets/brand/`.

## Component sourcing

`src/app/globals.css` imports `tokens.css` verbatim, aliases every Tailwind key onto an `--ansr-*`
token, and clears Tailwind's default palette (`--color-*: initial`). Two consequences:

- A component pulled straight from a registry is already on-brand — the shadcn contract variables
  (`--background`, `--primary`, `--ring`, …) map onto the brand aliases. `primary` is the brand teal,
  not the orange, because shadcn maps `primary` onto every default button.
- `bg-red-500` and friends no longer exist. Off-brand colour is unreachable through a utility class,
  which is why `brand_lint.py` catching raw hex is sufficient rather than optimistic.
- **Tailwind's `accent` is the shadcn contract variable and resolves to the ORANGE here**, which
  catches everyone once: `text-accent` on a heading spends the once-per-band highlight by accident.
  The brand heading teal is `text-accent-teal`.

Precedence: shadcn/ui base → `@kokonutui` / `@bklitui` / Magic UI registry component → hand-built.
Search before building.

## MCP servers

Registered in `.kiro/settings/mcp.json`; `.mcp.json` at the repo root is the same content for other
clients. `.kiro/settings/` is permission-guarded against agent writes — edits there need explicit
authorisation.

Verified tool names, probed 2026-08-26 — do not guess others:

- `shadcn` (v4.19.0): `get_project_registries`, `list_items_in_registries`,
  `search_items_in_registries`, `view_items_in_registries`, `get_add_command_for_items`,
  `get_audit_checklist`.
- `magicui` (`@magicuidesign/mcp@2.0.0`): `listRegistryItems`, `getRegistryItem`,
  `searchRegistryItems`.

If a server is unreachable, hand-build and say so rather than inventing component APIs.

## Skill library

**`.kiro/skills/` holds one skill: `ansr-brand-assets`, which is ours.** The 135 vendored design packs
were removed once the design was settled — they cost a manifest on every turn and the project no longer
routes to them. `.kiro/skill-sources.json` still pins every pack's repo and commit, so restoring any of
them is a clone and a copy of its listed skill folders; folder names are flat and must match the `name`
in their own frontmatter. Magic UI was never a skill — its repo is gone and its capability comes from
the MCP server above.
