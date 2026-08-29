
# Handoff — current state

Volatile. Rewritten each session, never appended to. Cap 120 lines. Present tense only.

**Last updated:** 2026-08-29

## Where we are

**Nothing is committed. 39 files exist only in the working tree** — `HEAD` is level with
`origin/ask-screen-overhaul` at `4e5b24a`, so every change below is at risk until it is committed.
That is the first thing to do next session, ahead of any new work.

**The entry point is rebuilt as a five-band composition**: teal gradient hero (centred, Bold 80px,
two text elements, no control) → white form card overlapping the hero → pale-teal transition band →
scrolling ANSR customer-logo strip → dark impact band, five ANSR figures between two ring motifs.
`main` is untouched, so `gcc-landscape.vercel.app` still serves the old entry point.

**Gate is green on all six:** 356 Vitest, 123 Playwright, `tsc`, `brand_lint.py`, `next build`,
`data:verify`. Renders read at 1440/768/390; no horizontal overflow at 320/390/768/1440.

Three additions that are new *kinds* of thing here, so they set precedent:

1. **`dataset.siteContent`** — the hero's title and lead plus the impact figures, edited in a new
   admin tab ("Entry point"). Defaulted, so `DATASET_VERSION` stays 1. Own publish-diff category,
   leading the preview. Draft `STORAGE_KEY` is now **v4**, mirrored in `tests/browser/helpers.ts`.
2. **`src/data/countries.ts`** — 201 countries as the HQ *input* vocabulary. Matching untouched.
3. **The first continuous motion in the project** — the logo marquee, opt-in inside
   `prefers-reduced-motion: no-preference` with a scrollable-row fallback under `reduce`.

The India-presence question is gone at ANSR's request; `gccStatus` remains, as a constant.

## Next action

1. **Commit, then open a PR.** The branch carries three passes and reviewing them together is
   already hard.
2. **The answer state, then Screen 2.** Both are now three passes behind the entry point and neither
   has been looked at since the palette moved. **Read the renders first**; both run on the new
   palette with no pass over them.
3. Roll `font-display` outward one screen at a time and check each — its metrics differ from the
   system sans, so anything tuned by eye can reflow. Only the ask opts in today.
4. The entry point uses moves the others do not: Bold 80px display type, rounded 8px card and
   controls with a `teal-500` outline, `--ansr-container-hero` / `-card`, the band-scale spacing
   steps (40/48/56), and `--ansr-accent-inverse` on the impact figures. The style lock records which
   are entry-point-only — do not spread the radius to the evidence bands.

## Blocked / needs the user

1. **Rotate the admin password.** Shared in a chat transcript, deployment publicly reachable. Still
   the only item with live exposure. `npm run admin:hash`, set `ADMIN_PASSWORD_HASH`, redeploy.
2. **`#072228` was adopted over `--ansr-teal-deep` at the client's request** and the two are within
   dE ~1, not separable by eye. Now `--ansr-teal-950` with exactly one consumer; its OFF_BRAND lint
   entry was removed. **Offer to collapse back to one token** before a client review.
3. **The hero's Bold 80px reverses the reference pass's Regular**, which came from `Group 149.svg`.
   Reasoning is in the style lock; it is a visible departure from the comp and wants confirming.
4. **The palette anchors were adopted on the reference's evidence, not by sign-off.** Occurrence
   counts in `tokens.css` make the case auditable.
5. **Moderat's licence.** Hanken Grotesk ships meanwhile; on an answer Moderat goes in front of it in
   `--ansr-font-display` and nothing else changes. Admin stays on Inter for its tabular numerals.
6. **Calendar the `GCC_GITHUB_TOKEN` expiry** — on lapse, publishing fails with a GitHub 401 that
   reads like a bug months after anyone touched this.
7. **Two unset env vars, both needing a redeploy:** `NEXT_PUBLIC_GCC_CTA_URL` (falls back to
   `https://www.ansr.com/`) and `NEXT_PUBLIC_GCC_FRAME_TARGET_ORIGIN` (height posts to `*`). Plus
   which ansr.com page carries the iframe, and who adds the snippet.
8. **Three sign-offs from ANSR:** Screen 2's figures as publishable (four are judgement —
   `data-audit.md`), `COMMON_FUNCTIONS`, and the business types per industry.
9. **More customer logos are coming.** Ten are in place.
10. **One brand ask, unblocked but unanswered:** a single functional red for destructive actions.
    `#B3505B` is the best verified candidate. See `BRAND.md`.

## Open decisions, not yet made

- **The city map's fixed frame leaves its northern third empty** for a southern-clustered industry.
  Invariant 8 working as intended, so it wants a decision rather than a fix.
- **Whether to relax the industry boundary, as a fallback only.** Industry as a weighted tag gives
  zero cross-industry peers at any weight (`proto-industry-tag.ts`). The variant to decide on is
  cross-industry above a 0.40 bar, lengthening 105 of 119 short sets — it breaks an invariant and
  leaves `industryOthers` industry-scoped, so the split bar stops describing the peers shown.
- **How many content grounds Screen 2 needs** — hero → one tint field → close, against the
  reference's four. Now the flattest surface in the tool by a wider margin.
- **Vercel preview protection and `ADMIN_TOTP_SECRET`** both unresolved; the reasoning is durable and
  in `project.md`, so only the choice is outstanding.
- **Nothing verifies how a screen LOOKS, and that is now the biggest gap in the gate.** Reading
  renders by hand caught four real defects this session that all six checks passed. Three have specs
  now; a visual-regression and axe pass is a stronger case than it was.

## Traps worth remembering

Invariants in `project.md`, brand rules in `design-stack.md`, visuals in `.tastemaker/style-lock.md`
and `docs/ansrx-visual-language.md`. These bite only in the code.

- **A negative top margin on the first child of a padding-less box COLLAPSES THROUGH and moves the
  parent.** The form card's overlap silently did not exist until the band got `flow-root`; the
  symptom is a margin that looks ignored. `overflow-hidden` also makes a BFC and would clip the third
  of the card that is the point.
- **`.ansr-motif + *` assumes a motif is followed by CONTENT.** Two adjacent motifs hand the second
  `position: relative`, dropping it into the flow. Wrap multiple motifs in one `.ansr-motif`.
- **An `<img>` with both CSS dimensions `auto` falls back to its source's intrinsic SIZE**, and an SVG
  with only a `viewBox` has a ratio but no size — it resolves to 300x150 and can collapse to 0x0 in a
  capped flex row. Give the file `width`/`height` and make one CSS dimension definite.
- **A placement class and `.gcc-motif-inverse` both set `--ansr-motif-opacity`**, both single-class,
  so RULE ORDER decides. Never carry both.
- **A light motif under white text on `--ansr-gradient-hero` is a contrast problem**, not decoration:
  the ramp's bright end is only 4.93:1 against white to begin with. Measure, do not eyeball.
- **A Figma export's `viewBox` may be smaller than its paths.** `arc-dome.svg` sliced complete rings
  through their middle; Walmart's rendered only "Wal". Widening the frame fixes both. And **check a
  logo's BYTES, not its extension** — four of ten were a raster inside an SVG `<pattern>`.
- **A native `<select>` clips its text silently.** 8px of extra chevron padding truncated "Choose a
  country" at tablet width. Measure the placeholder against the control's content box.
- **`[alt!='']` is not valid CSS nor a Playwright extension** — use `:not([alt=""])`. The answer's
  fact summary is a SIBLING of the heading's block, so walking up from `h1` scopes to nothing and the
  assertion passes vacuously. `expectBand` returns void.
- **A public spec must never locate a band or heading by its wording.** `helpers.ts` `band()` /
  `expectBand()` and `h1#ask-title` are the contract. **Three specs drive the form directly** —
  `0-screen1`, `0-screen2`, `0-business-type` — so a control or label change touches all three.
- **Never pair `setState` with a `requestAnimationFrame` that reads a ref** — React may commit later.
  A "have I run" boolean is not a transition guard either; compare phases.
- **Pure IDF scores every tag zero when one industry's tagged companies share a type** — keep the
  unweighted-overlap fallback, and use **`log(N/f)`, not `log(1 + N/f)`**. `sweep-floor.ts` is
  worthless unless its self-check says SOUND. Peer-set assertions must be scoped to `#peers`.
- **`tsc` covers `scripts/`, but `tsx` does not typecheck**, and `noUncheckedIndexedAccess` is on.
  **`hqCountry` is `"USA"`** and the taxonomy contains `"Scotland"`. No "SaaS" business type.
- **In deployed mode only `0-` specs run**, so a write-capable spec renumbered `0-` would publish to
  production. The `admin` project matches `[2345]-`, so a spec numbered outside every pattern
  silently never runs. **Screen 2's tab is "HR"**, not "Human resources".
