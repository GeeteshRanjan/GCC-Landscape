---
inclusion: always
---

# Design Stack & Conventions

Companion to `skill-router.md`. The router picks *which* skill; this file supplies the *project
facts* those skills need. Keep it current — a stale value here silently corrupts every skill output.

## Brand source of truth
| Input | Path | Status |
| --- | --- | --- |
| Brand palette | `assets/brand/BRAND.md` + `reference/*.png` | extracted; source docx removed |
| Brand SVG library | `assets/brand/` (+ `manifest.json`) | curated, recolored to tokens |
| Project brief / landscape | `GCC Lansdscape.pdf` | not yet summarised |

## Design tokens
**`assets/brand/tokens.css` is the single source of truth.** Read it; do not restate its values
anywhere else; generate any Tailwind theme from it. `assets/brand/BRAND.md` is the written
rationale — including CMYK/PMS values, gradient fits, and which decisions were project calls
rather than brand mandates.

The system is complete. Eight families, all defined:

| Family | Prefix | Notes |
| --- | --- | --- |
| Colour | `--ansr-{black,white,grey,teal,teal-deep,orange}` | Core, verbatim from brand doc |
| — ramps | `--ansr-{teal,orange,grey}-{900..50}` | Oklab interpolations of brand anchors |
| — aliases | `--ansr-{surface,text,border,action,accent,focus,status}-*` | **Components use these** |
| Gradients | `--ansr-gradient-{teal,orange,conic}` | Exactly two are brand; conic is a reconstruction |
| Type | `--ansr-{font,text,leading,weight,tracking,measure}-*` | Inter; 12→60px scale |
| Spacing | `--ansr-space-{0..32}` | 4px base unit |
| Radius | `--ansr-radius-{none,sm,md,lg,xl,pill}` | Minimal — brand geometry is hard-edged |
| Elevation | `--ansr-shadow-{xs..lg}`, `--ansr-z-*` | Teal-tinted, shallow |
| Motion | `--ansr-duration-*`, `--ansr-ease-*` | 120/180/240/320ms, all under 400ms |
| Layout | `--ansr-container*`, `--ansr-gutter*` | 1280px content max |

Hard rules:
- Orange is a highlight, restricted to CTAs and hover states. Not a surface, not body text.
- Never a raw hex, magic pixel value, or ad-hoc duration. `scripts/brand_lint.py` enforces it.
- Reject on sight: mint `#00B8A9`, vermilion `#F05A30`, amber `#F47F20`, deck teal `#006968`,
  old logo orange `#DD6236`. All are pre-brand deck art, already folded into the ramps.
- Radius defaults to `md` (4px), and `none` for anything sitting against a brand motif.
- **Status is carried by form, not colour.** Measured: this palette supports exactly two
  semantic colour signals — `--ansr-feedback-neutral` (teal) and `--ansr-feedback-attention`
  (orange). Teal steps are within ΔE 0.087 of each other so success/info cannot be separated by
  hue, and orange belongs to CTAs so danger cannot borrow it. Success, warning and danger are
  carried by icon + label + weight + form. Destructive controls use `.ansr-destructive`.
- The four `--ansr-status-*` tokens are **retired** and lint-blocked. `--ansr-status-danger`
  resolved to the CTA orange, making Delete look identical to Save. Do not reintroduce them.
- One open brand ask: a single functional red for destructive actions, `#BC4757` recommended and
  verified. See `assets/brand/BRAND.md`. Nothing is blocked while it is pending.

Project decisions not sourced from the brand doc (each a one-token swap if brand supplies a
standard): typeface Inter, 4px spacing base, minimal radius scale, teal-tinted elevation,
motion timings, status mapping.

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
