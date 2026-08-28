---
inclusion: always
---

# Skill Router

135 design/UI skills are installed in `.kiro/skills/` — 134 vendored packs pinned in
`.kiro/skill-sources.json`, plus project-authored `ansr-brand-assets`. Their name + description are already
in context. This file is the decision layer: it says **which to activate, in what order, and
when to stop** — so no time is spent scanning descriptions or guessing.

## How to activate
- Activate by exact name via the skill-activation tool (`disclose_context`). Never paraphrase a name.
- **User-invoked-only skills** (`disable-model-invocation: true`) cannot be auto-activated:
  `break`, `explain-interface`, `interface-review`, `pick-ui-library`, `prototype`, `review-animations`, `variant`.
  The user runs these as `/<name>`. If a task needs one, read `.kiro/skills/<name>/SKILL.md`
  directly with the file reader and follow it inline.
- **Budget: max 3 skills for the primary job + 1 domain specialist.** If a 5th looks necessary,
  the task is really two tasks — split it.

## Step 1 — classify the request
| If the request is… | Start here |
| --- | --- |
| Build / restyle any UI, "make this look good", match a reference | `tastemaker` |
| A landing page, marketing site, or page section | `landing-page-design` |
| A standalone visual artifact (dashboard, deck, mockup, prototype HTML) | `web-design-engineer` |
| Add motion / transition / "feel alive" | `animate` (Expo/React Native → `animate-expo`) |
| Polish pass on existing UI, "feels off" | `emil-design-eng` + `better-ui` |
| Charts, data viz, dashboard metrics | `bklit-ui` |
| Brand ornament, hero background, logo placement, anything in `assets/brand/` | `ansr-brand-assets` |
| Define a design system / tokens from scratch | `design-token` |
| Critique a screen or screenshot | Step 4 (visual-critique) |
| Research, personas, journeys, testing, strategy docs | Step 5 |
| Naming an effect the user described vaguely | `animation-vocabulary` |

## Step 2 — canonical owner per concern (do not stack overlaps)
One owner per concern. The alternates exist for a different deliverable, not as a second opinion.

| Concern | Writing/changing code | Defining the system as a doc |
| --- | --- | --- |
| Color | `better-colors` | `color-system`, `theming-system`, `dark-mode-design` |
| Type | `better-typography` | `typography-scale`, `readable-measure` |
| Layout | `better-layout` | `layout-grid`, `spacing-system`, `responsive-design` |
| Hierarchy | `visual-hierarchy` (new work) | `critique-visual-hierarchy` (existing screen) |
| Copy | `better-writing` | `ux-writing`, `content-strategy` |
| Accessibility | `better-accessibility` | `accessibility-audit`, `accessibility-test-plan` |
| Motion | `animate` | `motion-system`, `animation-principles` |
| Components | `component-spec` | `pattern-library`, `documentation-template` |
| Icons | `icon-system` | `illustration-style` |

Motion sub-routing: build → `animate`. One interaction's feel → `animation-principles`.
Product-wide tokens → `motion-system`. Audit a whole codebase → `improve-animations`.
Find where motion is missing → `find-animation-opportunities`. Toasts → `ask-sonner`.
iOS-style springs, sheets, gestures, materials → `apple-design`.

## Step 3 — component sourcing (before writing a component from scratch)
Order of preference: **shadcn/ui base → registry component → custom.**
1. `shadcn` MCP — search/view/add from configured registries (incl. Kokonut UI, `@bklit`).
2. `magicui` MCP — animated effects, backgrounds, text animations, device mocks.
3. `bklit-ui` skill — anything chart or data-viz shaped.
4. Only then hand-build, and pair it with `component-spec`.

## Step 4 — critique (reading a rendered screen or image)
Pick only the lens that matches the complaint; `critique-*` skills are single-lens by design.

| Complaint | Skill |
| --- | --- |
| "Eye lands in the wrong place" | `critique-visual-hierarchy` |
| "Looks cluttered / overwhelming" | `critique-information-density` |
| "Layout feels off but hierarchy is fine" | `critique-composition` |
| "Can't tell what's clickable" | `critique-affordance` |
| Colour, contrast, palette coherence | `critique-color` |
| Type sizes, readability | `critique-typography` |
| Off-brand vs. our tokens/voice | `critique-brand-consistency` |
| "Review everything" (holistic) | `better-interface` |
| Formal expert review with severity ratings | `heuristic-evaluation` |

Root-cause laws, reached for only to *justify or fix* a critique finding — never as the entry point:
`hicks-law` (too many choices), `millers-law` (chunking), `fitts-law` (target size/position),
`law-of-proximity` / `law-of-common-region` / `law-of-similarity` / `law-of-closure` /
`law-of-continuity` / `law-of-figure-ground` (grouping & depth), `von-restorff-effect` (emphasis),
`serial-position-effect` (ordering), `jakobs-law` (familiar patterns), `teslers-law` (irreducible
complexity), `doherty-threshold` (<400ms), `zeigarnik-effect` / `peak-end-rule` (engagement & endings),
`aesthetic-usability` (why polish reads as usable).

## Step 5 — non-build work
- Strategy: `design-brief`, `north-star-vision`, `design-principles`, `opportunity-framework`,
  `competitive-analysis`, `metrics-definition`, `business-design`, `information-architecture`.
- Research: `interview-script`, `user-persona`, `jobs-to-be-done`, `journey-map`, `empathy-map`,
  `affinity-diagram`, `summarize-interview`, `survey-design`, `usability-test-plan`, `diary-study-plan`,
  `card-sort-analysis`, `research-repository`.
- Testing: `test-scenario`, `user-flow-diagram`, `wireframe-spec`, `prototype-strategy`,
  `click-test-plan`, `a-b-test-design`.
- Delivery: `handoff-spec`, `design-qa-checklist`, `design-rationale`, `presentation-deck`,
  `case-study`, `design-critique`, `design-debt-audit`, `design-token-audit`.
- Ops/governance: `design-review-process`, `design-system-governance`, `design-system-adoption`,
  `naming-convention`, `team-workflow`, `version-control-strategy`, `stakeholder-alignment`,
  `design-impact-reporting`, `design-sprint-plan`, `design-negotiation` (defending scope/quality
  to stakeholders).
- Native Swift/iOS code (not design): `write-swift`.
- Flows/patterns: `form-design`, `onboarding-design`, `navigation-patterns`, `search-ux`,
  `error-handling-ux`, `loading-states`, `feedback-patterns`, `state-machine`,
  `micro-interaction-spec`, `gesture-patterns`, `conversational-ux`, `interfaces-that-feel`,
  `localization-design`, `platform-conventions`, `data-visualization`, `service-blueprint`,
  `experience-map`.

## Recipes (proven combos, run in this order)
- **New marketing/landing page** → `tastemaker` (direction) → `landing-page-design` (structure + copy)
  → shadcn/magicui MCP (components) → `animate` (motion) → `better-accessibility` (before done).
- **New app screen** → `tastemaker` → `better-layout` → shadcn MCP → `emil-design-eng`.
- **Dashboard** → `tastemaker` → `bklit-ui` → `data-visualization` → `better-layout`.
- **Standalone deck / HTML artifact** → `web-design-engineer` → `animate`.
- **"Our UI looks generic"** → `tastemaker` (audit mode) → the one matching `critique-*` → `better-ui`.
- **Brand → design system** → `better-colors` → `typography-scale` → `spacing-system` → `design-token`
  → `theming-system`.
- **Ship-readiness gate** → `better-accessibility` → `design-qa-checklist` → `handoff-spec`.

## Standing rules
1. Any UI-producing task runs `tastemaker` (or `landing-page-design`) **before** writing markup —
   it is what prevents default AI-slop output.
2. Never invent color, type, spacing, or radius values when project tokens exist. See `design-stack.md`.
   Color is defined: `assets/brand/tokens.css`.
2b. Any brand motif or texture from `assets/brand/` must be adapted before placement, never
   pasted as-is. Activate `ansr-brand-assets` first. Logos are the only literal-use exception.
3. Accessibility is not an optional pass: `better-accessibility` runs on every interactive component.
4. Motion follows project motion tokens; if none exist, `animate` decides and records them.
5. Announce the chosen skills in one short line, then work. Do not narrate the routing.
