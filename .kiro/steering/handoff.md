# Handoff — current state

Volatile. Rewritten each session, never appended to. Cap 120 lines. Present tense only.

**Last updated:** 2026-08-27

## Where we are

**Both public screens are built, and NOT YET COMMITTED.** The Peer View and Function View exist
only in the working tree — `src/components/screen1|screen2|public/`, `src/data/screen1|screen2|geo.ts`,
`src/app/actions.ts`, `public/`, and four specs, all still untracked, plus unstaged edits to
`page.tsx`, `globals.css`, `playwright.config.ts` and `.env.example`. One `git checkout` loses them.
Commit before anything else. Next.js 16, TypeScript, Tailwind v4, shadcn/ui, theme from
`assets/brand/tokens.css`.

Every check green:

- `npm test` — **301** Vitest unit tests, under a second.
- `npm run test:browser` — **99** Playwright tests against a real production build, ~1 minute.
- `npx tsc --noEmit`, `python3 scripts/brand_lint.py`, `npm run build` (the plain-Node test).
- `npm run data:verify` — clean. The baseline was re-accepted when the sample figures landed:
  "metrics a visitor would receive" now reads **8 / 9 / 12 / 6**, up from 7 on Technology because
  the capability grid is no longer incomplete. `docs/data-audit.md` is in line with it.

**One route, three phases.** `src/app/page.tsx` serves everything and
`src/components/public/tool.tsx` owns the state: ask → Peer View → Function View. Not routes —
the tool is iframed and cannot own the URL bar — so there are no deep links, the back button does
not step back a phase, and each phase carries its own way back as a real control in the flow.
Focus moves to the new `h1` on every transition, because nothing else announces a change that was
not a navigation.

**Screen 2 needs no server action** — its payload does not depend on the visitor, so `page.tsx`
calls `buildFunctionView(dataset)` per request, and that function imports `publicMetricsFor` and never
`dataset.metrics`, putting the gate on the only path in. `src/components/public/` holds what both
screens share. Orange stays reserved for the one outward CTA per screen; Screen 1's phase-advance
control is teal, so the two closes read as different registers. Reasoning in `.tastemaker/style-lock.md`.

**The deployment is two steps behind the tree.** `gcc-landscape.vercel.app` runs the last pushed
commit, which has neither the public screens (uncommitted) nor the sample figures (committed, not
pushed — `HEAD` is ahead of `origin/main` by one). So the live site is still admin-only. No publish
has ever been made from admin: the local store is `fs`, and the browser suite uses its own fixture.

## Next action

**Commit the public screens, then push.** Nothing is half-finished — the tool is feature-complete
against `docs/brief.md` — but two sessions' work is sitting unsaved in one tree. After that, the
blocked list below plus these two, neither urgent:

- **Self-host Inter.** No web font is loaded, so a visitor sees the token's fallback stack. This
  is now visible on two screens rather than one.
- **The finance tab's short bars.** Percent bars scale to 100 by rule, so 2–10% growth draws as a
  sliver. If ANSR dislikes it the honest fix is a different mark, not a different scale.

## Blocked / needs the user

1. **Rotate the admin password** — the current one was shared in a chat transcript.
   `npm run admin:hash`, then update `ADMIN_PASSWORD_HASH` in Vercel and redeploy.
2. **Calendar the `GCC_GITHUB_TOKEN` expiry.** When it lapses, publishing fails with a GitHub 401
   that reads like a bug rather than an expiry.
3. **The CTA destination.** Both screens' closes link to `NEXT_PUBLIC_GCC_CTA_URL`, falling back
   to `https://www.ansr.com/`. Note Next inlines `NEXT_PUBLIC_*` at build time, so it needs a
   redeploy, not a restart.
4. **Hosting details** — which ansr.com page hosts the iframe, who adds the embed snippet, and
   the origin for `NEXT_PUBLIC_GCC_FRAME_TARGET_ORIGIN`. The parent must listen for the
   `gcc-landscape:height` message; the snippet is in the header comment of `use-frame-height.ts`.
5. **Replace the sample figures.** All 35 metrics are now populated, but every one is
   illustrative and stamped `asOf: "Sample, not for publication"` — which is a **public** field,
   so that caveat renders beside each figure on Screen 2. That is deliberate: a sample number
   that escapes arrives labelled rather than passed off as research. Clearing it is per-metric,
   by entering a real date in the As of field, or wholesale by changing `SAMPLE_PROVENANCE` in
   `src/data/metric-catalogue.ts`. `data:verify` counts how many still carry it, so the number
   reaching zero is visible rather than something to remember.
6. **Sign off the common-function list** — eight hardcoded entries in `COMMON_FUNCTIONS`
   (`src/data/screen1.ts`). The brief permits the hardcode; the wording and order are ANSR's call.
7. **Confirm two judgement calls now visible on Screen 2.** Technology bench strength is the
   national workforce, not the GCC subset, and the screen says so in a provenance line. Grade A
   office stock now shows both total and vacant as a two-part figure, rather than picking one.

## Open decisions, not yet made

- **The white-on-orange token.** White on `--ansr-orange` measures **3.22:1** — a real AA failure
  — so both screens use **black on orange (6.52:1)** at the one call site each,
  `public/closing-cta.tsx`. Either change `--ansr-action-text` or keep overriding there.
- **Whether to switch on `ADMIN_TOTP_SECRET`.** Built and verified, currently removed. Only
  enable it while able to test a code immediately — see `project.md`.
- **Whether `fin-tier-cost-spread` gets per-city columns.** It now renders as a 3×2 grid, which
  carries the headline fine.
- **Whether the browser suite runs in CI.** Needs Chromium and a minute. No ESLint either.

## Traps worth remembering

Invariants are in `project.md`, brand rules in `design-stack.md`, the visual decisions and their
reasoning in `.tastemaker/style-lock.md`. These bite only in the code.

- **Never read `dataset.metrics` from a public screen.** `publicMetricsFor` is the gate, and
  `src/data/screen2.ts` imports it rather than the raw array on purpose.
- **A substring test for a leaked label passes by luck.** "Engineering" is inside "Full-stack and
  product engineering", so `screen2.test.ts` checks the held metric's KEYS and only spot-checks
  two genuinely distinctive labels.
- **`src/app/page.tsx` is `force-dynamic` on purpose** — a prerender bakes the taxonomy into the
  build and defeats `dataset.ts`'s mtime cache.
- **A new browser spec must be numbered inside a project's `testMatch`** — `0-` public,
  `[2345]-` admin, `1-`/`6-` auth and lockout. A `7-` spec matches no project and never runs.
- **`0-screen1.spec.ts` and `0-screen2.spec.ts` run before `5-publish.spec.ts` mutates the
  fixture.** Their figures are the seeded ones.
- **Never use a gap in the catalogue as a test fixture.** Four tests proved "incomplete metrics are
  dropped" and "Technology has N cards" by leaning on cells the seed happened to leave empty; filling
  those cells broke all four while the rules they guard stayed correct. Build a synthetic metric for
  a rule, and treat a count as the snapshot it is.
- **A grid inside a card needs `grid-cols-1` and `min-w-0`.** Without both, the table's
  `min-w-md` propagates out through the implicit grid track and the whole document scrolls
  sideways at 320px. `0-screen2.spec.ts` asserts it does not.
- **Do not focus a field by querying `[aria-invalid="true"]` after `setErrors`** — state has not
  flushed; `input-panel.tsx` holds refs, and `tool.tsx` focuses in a rAF for the same reason.
- **`data:verify -- --accept` is for profile drift only**; an INVARIANT FAILURE is a bug.
- **Bump the draft's `STORAGE_KEY` when the editable shape changes**; `helpers.ts` owns the key.
- **`server-only` throws outside a bundler's server graph**, including `tsx` — hence
  `src/lib/admin/constants.ts`. `src/data/screen2.ts` is deliberately NOT `server-only`: the
  client components need its types.
- A `<section>` with no accessible name is not a `region` landmark; every band names itself.
