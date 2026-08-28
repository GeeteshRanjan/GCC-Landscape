# Handoff — current state

Volatile. Rewritten each session, never appended to. Cap 120 lines. Present tense only.

**Last updated:** 2026-08-28

## Where we are

**The palette and typeface in `tokens.css` are superseded, by the user's decision** — `Group 149.svg`
is the authority. The replacement is **not done**, so three always-loaded rules still contradict the
intended direction and must not be obeyed: `design-stack.md` 41 (reject mint `#00B8A9`),
`style-lock.md` 236 (take everything from the reference *except* colour), `project.md` invariant 6.

**`Group 149.svg` is fully measured into `docs/ansrx-visual-language.md`** — typeface and weights, the
type scale with real line-height ratios, the 12×86/21 grid, the four-ground band system and rhythm,
every hex against its token, the five motifs as parameters, the anatomy of all eight components, and
how each figure was obtained. **The 7.1 MB export is no longer needed**; slices in `/tmp/gcc149/`. Its
typeface half is already durable in `design-stack.md`: the face is Moderat, **body copy its Light
300**, and `--ansr-font-display` is the slot, on Hanken Grotesk as the licensable stand-in.

**Four unreviewed, uncommitted passes sit in the tree** — the chart and copy rebuild, an art-direction
pass, a row-filling pass, this session's extraction. `main` has none, so the deployed site and
`test:deployed` measure a UI three generations old, and **there is no restore point**
(`/tmp/gcc-backup/` dies with a reboot). That is why the palette swap has not started.

**Gate is green:** 350 Vitest, `tsc`, `brand_lint.py`, `next build`, `data:verify`. Playwright's 112
specs have **not** re-run since this session's five token/motif additions (§9 of the doc) — inert CSS
consumed by nothing, so it should still pass. No web font loads yet.

## Next action

**The plan is one screen at a time, starting with the ask screen**, on the user's read that every
screen currently looks bad. Steps 1–5 are the substance of a prompt written for a fresh session.

1. **Commit and push to a branch first** — everything below is hard to reverse with nothing to revert
   to. Run `test:browser` before pushing.
2. **Replace the palette. Action orange is `#FD4E11`** (the reference), not `#FF5400`; keep every token
   NAME and semantic alias so nothing downstream breaks — only values change. Blockers in the order they
   bite: `brand_lint.py` (`OFF_BRAND` names `#00B8A9`, `#00B3A5`, `#F05722`, `#DD6236` and exits 1; its
   raw-hex allow-list is read from `tokens.css`); `.kiro/hooks/brand-guard.json` (`PostFileSave`, fired
   on every save during the work); `tokens.css` (core block marked do-not-edit, all three ramps
   interpolated from the two old teal anchors); `design-stack.md` 39–49; `style-lock.md` 12, 236 and its
   16-row contrast table;
   `project.md` invariant 6 and the chart "teal ramp only" rule; `ansr-brand-assets/SKILL.md` 124–130;
   **26 brand SVGs** under `assets/brand/{logo,motif,texture}/` and `public/brand/`, recoloured to the
   old ramp (218 × `#FF5400`) — regenerate via `brand_asset.py recolor`; then `BRAND.md`,
   `brand_asset.py ramp`, `brand_status_analysis.py`, `globals.css`. No test asserts a colour.
3. **Re-measure contrast; do not drop the table.** White on orange is 3.22:1 and fails AA whatever the
   palette — the reference does it twice and is wrong there. Re-run `brand_status_analysis.py` too: a
   bright mint may overturn "status is carried by form, not colour".
4. **Overhaul the ask screen, and only it** — `peer-view.tsx` (the ask phase, ~100–145),
   `input-panel.tsx`, `screen-header.tsx`. The reference has no form, so derive: its hero anatomy for
   the header (80px at 1.05, headline under half the band, fan bleeding right, one pill), and its
   offer-card anatomy for the form panel (radius 0, generous top shoulder, `.ansr-dissolve` bottom
   edge — not a bordered box). Body copy in the display face's **Light 300**. Screenshot at 1440 and
   390 and **read the renders** before calling it done. Screen 2 and the answer state come later.
5. Two defects to fix in that pass: the lead says **"Four answers. Twenty seconds."** against six
   fields, two optional; and **"Company name" is marked `optional`** while `project.md` lists it as one
   of the six inputs. Confirm which is right and make the copy and the labels agree.

## Blocked / needs the user

1. **Confirm the palette anchors** in `ansrx-visual-language.md` §5 before ramps are generated from
   them. The orange is already settled at `#FD4E11` by default, not by explicit confirmation.
2. **Whether admin converts too.** Plan: new face for public, `--ansr-font-sans` (Inter) kept for admin.
3. **Rotate the admin password** — shared in a chat transcript, deployment publicly reachable, so this
   is the only item with live exposure. `npm run admin:hash`, set `ADMIN_PASSWORD_HASH`, redeploy.
4. **Moderat's licence.** ansr.com serves the two `.woff` files publicly, which is not a licence for an
   embedded tool — but theirs may already cover the domain. Ask before settling for a stand-in.
5. **Calendar the `GCC_GITHUB_TOKEN` expiry** — on lapse, publishing fails with a GitHub 401 that
   reads like a bug.
6. **Two unset env vars, both needing a redeploy** (`NEXT_PUBLIC_*` is inlined at build time):
   `NEXT_PUBLIC_GCC_CTA_URL`, so both screens fall back to `https://www.ansr.com/`, and
   `NEXT_PUBLIC_GCC_FRAME_TARGET_ORIGIN`, so height posts to `*`. Plus which ansr.com page carries the
   iframe, and who adds the snippet.
7. **Three sign-offs from ANSR:** Screen 2's figures as publishable (four are judgement —
   `data-audit.md`), `COMMON_FUNCTIONS`, and the business types per industry (`business-types.md`).

## Open decisions, not yet made

- **The city map's fixed frame leaves its northern third empty** for a southern-clustered industry.
  Invariant 8 working as intended, so it wants a decision, not a fix.
- **Whether to relax the industry boundary, as a fallback only.** `scripts/proto-industry-tag.ts`: the
  obvious form fails — industry as a weighted tag gives zero cross-industry peers at any weight. **The
  variant to decide on** is cross-industry above a 0.40 bar, lengthening 105 of 119 short sets. It
  breaks an invariant and leaves `industryOthers` industry-scoped, so the split bar stops describing
  the peers shown — a copy decision first.
- **How many content grounds Screen 2 needs** — hero → one tint field → close, against the reference's
  four. The flattest surface left.
- **Vercel preview protection and `ADMIN_TOTP_SECRET`** are both still unresolved; the durable
  reasoning for each is in `project.md`, so only the choice is outstanding.
- **Whether either browser suite runs in CI.** Related and worse: **nothing verifies how a screen
  LOOKS** — no visual regression, no a11y audit. Reading renders by hand is the only check.

## Traps worth remembering

Invariants in `project.md`, brand rules in `design-stack.md`, visuals in the style lock and
`ansrx-visual-language.md`. These bite only in the code.

- **`brand_lint.py` skips `assets/`**, so a hex added to `tokens.css` is legitimised everywhere with no
  warning. Both ways in the palette swap: how the new colours land, and how a stray one survives.
- **`split` is wrong for a band whose content is one control**: the column is `items-start`, so the
  control top-aligns with the kicker, ahead of its own lead in reading order.
- **Never pair `setState` with a `requestAnimationFrame` that reads a ref** — React may commit later, so
  the ref is null and the call vanishes. And a "have I run before" boolean is not a transition guard:
  React's dev double-invoke makes the second mount run not-the-first.
- **A guard that is always false passes while asserting nothing.** A test read `hqCountry` off a
  `PeerCard`, which drops it. Keep the exhaustive key-list assertion. And **`peerLead` only claims "your
  own market first" when no line of business was given** — exactly when matching is band-led and the
  claim is true. It reads as a bug and is not one.
- **Pure IDF scores every tag zero when one industry's tagged companies share a type** — keep the
  unweighted-overlap fallback, and use **`log(N/f)`, not `log(1 + N/f)`**. `sweep-floor.ts` is worthless
  unless its self-check says SOUND. **Peer-set assertions must be scoped to `#peers`**: Walmart
  legitimately appears on Nike's result, in the largest-in-industry panel.
- **`tsc` covers `scripts/`, but `tsx` does not typecheck.** `noUncheckedIndexedAccess` is on, so any
  new indexed read needs a guard. **`hqCountry` is `"USA"`**. No "SaaS" business type. Per-company keys
  must be industry-scoped. Draft `STORAGE_KEY` is v3, mirrored in `helpers.ts`.
- **In deployed mode only `0-` specs run, so a write-capable spec renumbered `0-` would publish to
  production.** And **Screen 2's tab is "HR"**, not "Human resources": a capture or spec looping the
  long name skips that tab in silence.
