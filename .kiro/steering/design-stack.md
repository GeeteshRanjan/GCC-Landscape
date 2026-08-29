---
inclusion: always
---

# Design Stack & Conventions

Companion to `skill-router.md`. The router picks *which* skill; this file supplies the *project
facts* those skills need. Keep it current — a stale value here silently corrupts every skill output.

## Brand source of truth
| Input | Path | Status |
| --- | --- | --- |
| **Palette, type, grid, bands, motifs** | `docs/ansrx-visual-language.md` | `Group 149.svg` measured; **the authority** |
| Palette provenance (CMYK/PMS, gradient fits) | `assets/brand/BRAND.md` + `reference/*.png` | superseded for values, kept for provenance |
| Brand SVG library | `assets/brand/` (+ `manifest.json`) | curated, recoloured to the current tokens |
| Project brief / landscape | `docs/brief.md` | transcribed |

**The palette came from `Group 149.svg`, not from Branding_Palette.docx.** The docx is superseded
and the change is settled, not pending: the comp is the newer art direction, and it was not built
from the docx at all — its CTA is `#FD4E11` rather than `#FF5400`, its ground is a navy rather than
a deep teal, and its most-used accent is a bright mint-teal the docx does not contain. What survives
from the docx is CMYK/PMS provenance and the two **fitted gradient geometries**, which the comp
does not restate.

## Design tokens
**`assets/brand/tokens.css` is the single source of truth.** Read it; do not restate its values
anywhere else; generate any Tailwind theme from it. Every value in it now carries its occurrence
count in the reference or the interpolation that produced it, so a suspect step can be re-derived
rather than argued about: `python3 scripts/brand_asset.py ramp` reproduces all three ramps and must
agree with the CSS.

The system is complete. Eight families, all defined:

| Family | Prefix | Notes |
| --- | --- | --- |
| Colour | `--ansr-{black,white,grey,teal,teal-deep,teal-bright,orange}` | Core, measured off the reference |
| — ramps | `--ansr-{teal,orange,grey}-{950..50}` | Oklab interpolations between measured anchors. Teal has four; `--ansr-teal` is **600**, not 500. `teal-950` and `teal-50` are **client-specified**, not measured |
| — aliases | `--ansr-{surface,text,border,action,accent,focus,feedback}-*` | **Components use these** |
| Gradients | `--ansr-gradient-{teal,orange,hero,conic}` | `teal`/`orange` are the docx's fitted geometry; `hero` is the reference's linear ground; conic is a reconstruction |
| Type | `--ansr-{font,text,leading,weight,tracking,measure}-*` | Inter for UI, `font-display` for display; 12→80px scale |
| Spacing | `--ansr-space-{0..32}`, plus `40/48/56` | 4px base unit. The 40–56 steps are **band scale**, past where component rhythm stops |
| Radius | `--ansr-radius-{none,sm,md,lg,xl,pill}` | Minimal — brand geometry is hard-edged |
| Elevation | `--ansr-shadow-{xs..lg}`, `--ansr-z-*` | Teal-tinted, shallow |
| Motion | `--ansr-duration-*`, `--ansr-ease-*` | 120/180/240/320ms, all under 400ms — plus `-marquee` (48s), which is AMBIENT motion and a different quantity |
| Layout | `--ansr-container*`, `--ansr-gutter*` | 1280px content max. `-hero` (704px) caps a centred display block, `-card` (896px) the entry-point form |

Hard rules:
- Orange is a highlight, restricted to CTAs and hover states. Not a surface, not body text.
  **Once per band**, which is stricter than "restricted to CTAs" and is the reference's own rule.
- Never a raw hex, magic pixel value, or ad-hoc duration. `scripts/brand_lint.py` enforces it.
- **Three grounds were added at the client's request, and two are new values.** `#D1E9E7` was
  already `--ansr-teal-100` / `--ansr-surface-tint`. `#F5FFFE` is now `--ansr-teal-50` /
  `--ansr-surface-pale`, a near-white with the mint still in it. `#072228` is now
  `--ansr-teal-950` / `--ansr-surface-deep` — **it was previously lint-blocked as a drift off
  `--ansr-teal-deep`, and that OFF_BRAND entry was removed because it is now a live token.** The
  drift risk is real and unchanged: the two darks are within dE ~1 and not separable by eye. So
  `--ansr-surface-deep` has exactly one consumer, the entry point's impact band, and anything else
  wanting a dark ground uses `--ansr-surface-inverse`. Both new steps keep the ramp monotonic in
  Oklab lightness and both take every ink their neighbour does; the measurements are beside the
  tokens.
- **The teal family has three anchors, and the bright one is for dark grounds only.**
  `--ansr-teal` is the heading teal on a light ground; `--ansr-teal-bright` (= `teal-400`,
  = `--ansr-accent-inverse`) is the accent on a dark one, and measures 2.44:1 on white. Putting
  it on a light ground is the single easiest way to break a screen with an on-brand colour.
- **Reject on sight: the retired docx palette.** Light Teal `#005465`, Deep Teal `#00242E`,
  Orange Highlight `#FF5400`, and every step of the ramps derived from them. They are not deck
  art, they were this project's palette until `Group 149.svg` superseded it, so they will keep
  turning up in older files and older screenshots. Also still rejected: vermilion `#F05A30`,
  amber `#F47F20`, deck teal `#006968`, old logo orange `#DD6236`, and the near-miss drifts
  around the new anchors (`#00B8A9`, `#00544C`, `#072228`). `brand_lint.py` names each with its
  replacement token.
- Radius defaults to `md` (4px), and `none` for anything sitting against a brand motif. The
  reference is one step harder-edged than that: its cards, panels and accordion rows are true 0,
  and only the pill CTA and one stat card are round. Prefer `none` on the public screens — **with
  one sanctioned exception, the entry point's form card and its controls at `lg` (8px)**, which the
  client asked for. Nothing there sits against a motif, and a 4px field inside an 8px card reads as
  a mismatch rather than as restraint. Do not spread it to the evidence bands.
- **Status is carried by form, not colour.** Re-measured against the new palette rather than
  carried over, because a bright accent could have overturned it: it did not. This palette
  supports exactly two semantic colour signals — `--ansr-feedback-neutral` (teal) and
  `--ansr-feedback-attention` (orange). 9 of the teal ramp's 36 step pairs are still under the
  ΔE 0.15 "clearly different" threshold and the whole dark end sits at 0.043–0.046, so
  success/info cannot be separated by hue; orange belongs to CTAs, so danger cannot borrow it.
  Success, warning and danger are carried by icon + label + weight + form. Destructive controls
  use `.ansr-destructive`. Re-run `python3 scripts/brand_status_analysis.py` after any palette
  change — it derives from the ramps rather than hardcoding, so it re-checks itself.
- The four `--ansr-status-*` tokens are **retired** and lint-blocked. `--ansr-status-danger`
  resolved to the CTA orange, making Delete look identical to Save. Do not reintroduce them.
- One open brand ask: a single functional red for destructive actions. Against the new palette
  the best verified candidate is `#B3505B` (4.98:1 on white, 3.20:1 on the dark ground, and
  separable from the CTA orange under both protanopia and deuteranopia). See
  `assets/brand/BRAND.md`. Nothing is blocked while it is pending.

Project decisions not sourced from a brand document (each a one-token swap if ANSR supplies a
standard): 4px spacing base, minimal radius scale, teal-tinted elevation, motion timings,
status mapping, and the two bounds below — both of which exist because a measurement forced them
rather than because they looked better.

- **`--ansr-gradient-teal` is capped at `teal-700`.** Its old peak put
  `--ansr-text-inverse-muted` at 3.30:1, a latent AA failure on every band using it. Capped, the
  worst point on the band clears AA for every ink allowed on an inverse ground.
- **`--ansr-gradient-hero` is capped at 60% of the way to the bright accent.** Run to the full
  accent the way the reference draws it, white measures 2.44:1 at the bottom edge. The reference
  survives that only because its hero copy sits in the top third, which is a per-placement
  guarantee rather than a property of the ground.

**The typeface is no longer one of them. The brand has one: Moderat.** ansr.com sets it on every
heading and paragraph, and `Group 149.svg`'s outlined glyph widths match its advance widths to
within 1%. Two consequences that are not optional if a screen is to read as ANSR:

- **Body copy is Moderat Light 300**, not Regular. Their own CSS says `Moderat 300` on every `<p>`,
  and the measured stem confirms it. This is the single biggest tell of the brand.
- The live site licenses only Light and Regular `.woff` files, so its 500/600/700 rules are
  browser-synthesised faux bold. Do not replicate that — specify real weights, load real files.

Moderat is commercial and its licence for an embedded tool is unresolved, so `--ansr-font-display`
resolves to **Hanken Grotesk**, which ansr.com already loads as its second family and which is free
to self-host. Put Moderat at the front of that token once the licence is confirmed; nothing else
changes. `--ansr-font-sans` stays Inter for UI and admin. Full measurement, including the type
scale, grid, band system and motif parameters, is in `docs/ansrx-visual-language.md`.

## Brand assets
`assets/brand/` — `logo/` (3 lockups), `motif/` (16 pin/arc graphics), `texture/` (2 full-bleed
grounds), `manifest.json`, `tokens.css`.

Motifs and textures are **starting points, never drop-in art** — adapt every placement via
`scripts/brand_asset.py` (recolor, fade, trim, crop, flip, currentcolor, normalize) or CSS.
Logos are the one literal-use exception. The `ansr-brand-assets` skill governs this; activate it
before touching anything under `assets/brand/`.

## Component sourcing
Next.js 16 + Tailwind v4 + shadcn/ui is scaffolded at the repo root. `components.json` is in
place with `@kokonutui` and `@bklitui` registered, and `npx shadcn@latest add <name>` is verified
working.

`src/app/globals.css` is the theme: it imports `assets/brand/tokens.css` verbatim, aliases every
Tailwind key onto an `--ansr-*` token, and clears Tailwind's default palette (`--color-*: initial`).
Two consequences worth knowing before writing markup:

- A component pulled straight from a registry is already on-brand — the shadcn contract variables
  (`--background`, `--primary`, `--ring`, …) are mapped onto the brand aliases. `primary` is the
  brand teal, not the orange, because shadcn maps `primary` onto every default button and orange is
  restricted to CTAs.
- `bg-red-500` and friends no longer exist. Off-brand colour is unreachable through a utility class,
  which is why `brand_lint.py` catching raw hex is sufficient rather than optimistic.

Precedence when a component is needed: shadcn/ui base → `@kokonutui` / `@bklitui` / Magic UI
registry component → hand-built. Search before building.

## MCP servers
Both servers are verified working (handshake + `tools/list` probed on 2026-08-26) and registered in
`.kiro/settings/mcp.json` (the file Kiro reads). `.mcp.json` at the repo root is the same content for
other clients. Note: `.kiro/settings/` is permission-guarded against agent writes — future edits
there need explicit user authorisation, so do not attempt silent changes.

Verified tool names — do not guess others:
- `shadcn` (v4.19.0): `get_project_registries`, `list_items_in_registries`,
  `search_items_in_registries`, `view_items_in_registries`, `get_add_command_for_items`,
  `get_audit_checklist`.
- `magicui` (`@magicuidesign/mcp@2.0.0`): `listRegistryItems`, `getRegistryItem`,
  `searchRegistryItems`. (The older `getAnimations` / `getUIComponents` style names are gone.)

The `shadcn` server resolves registries from the project's `components.json`, which now exists, so
searching works.

If an MCP tool call fails or the server is unreachable, fall back to the `bklit-ui` skill for charts
and to hand-built components, and say so rather than inventing component APIs.

## Skill library maintenance
- Provenance (repo, commit, skill list per pack) lives in `.kiro/skill-sources.json`.
- Update a pack by re-cloning its repo and re-copying only its listed skill folders; skill folder
  names are flat and must keep matching the `name` in their own frontmatter.
- Magic UI is **not** installed as a skill — its source repo (`dev-jelly/jelly-dotclaude`) no
  longer exists on GitHub. Its capability comes from the `magicui` MCP server above.
