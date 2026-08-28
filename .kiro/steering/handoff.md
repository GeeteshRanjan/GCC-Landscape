---
inclusion: always
---

# Handoff — current state

Volatile. Rewritten each session, never appended to. Cap 120 lines. Present tense only.

**Last updated:** 2026-08-28

## Where we are

**Branch `ask-screen-overhaul`, all pushed.** Nothing is at risk any more — every state has a commit
behind it. `0549037` is the restore point (the four formerly unreviewed passes), `afde570` is the
palette swap, `569fc22` is the ask screen. `main` is untouched, so `gcc-landscape.vercel.app` and
`test:deployed` still measure the old UI and the old palette.

**Gate is green on all six:** 350 Vitest, 114 Playwright (two new), `tsc`, `brand_lint.py`,
`next build`, `data:verify`. Renders read at 1440, 768 and 390, plus the error and filled states.

**The display face now loads** — Hanken Grotesk, self-hosted, real 300–700 weights — but **only the
ask screen opts in.** The answer state, Screen 2 and admin resolve to `--ansr-font-sans`, and since
nothing loads Inter either they render in the system sans at Regular. Largest visible inconsistency
in the tool right now.

## Next action

**Continue one screen at a time. The Peer View answer state is next**, then Screen 2. Both are three
generations of art direction behind the ask and neither has been looked at since the palette moved.

1. **Read the renders first.** The answer state runs on the new palette with no pass over it: the
   pale ground is greener, `--ansr-accent` moved, `--ansr-gradient-teal`'s peak dropped a step.
   Nothing is known to be broken, and nothing has been checked either.
2. Roll `font-display` outward one screen at a time and check each — the metrics differ from the
   system sans, so anything tuned by eye can reflow.
3. The reference moves the ask uses and the others do not: **80px hero at 1.05 leading**, **Light 300
   body**, **radius 0 on panels**, **`.ansr-dissolve` instead of a card edge**, **`.ansr-bar-ramp` in
   a band's trailing ground**, **filled controls with one bottom rule**. See the style lock.
4. **`--ansr-accent-inverse` (the bright mint) exists and nothing uses it.** It is the reference's
   whole dark-ground voice; both inverse figure bands are candidates. Illegal on light at 2.44:1.
5. Open a PR when the answer state lands, not at the end.

## Blocked / needs the user

1. **The palette anchors were adopted on the reference's own evidence, not by sign-off.** Every value
   in `tokens.css` carries its occurrence count, so the case is auditable — but confirm before a
   client review.
2. **Rotate the admin password.** Shared in a chat transcript, deployment publicly reachable. Still
   the only item with live exposure. `npm run admin:hash`, set `ADMIN_PASSWORD_HASH`, redeploy.
3. **Moderat's licence.** ansr.com serves the two `.woff` files publicly, which is not a licence for
   an embedded tool, but theirs may cover the domain. Hanken Grotesk ships meanwhile; when the answer
   arrives Moderat goes in front of it in `--ansr-font-display` and nothing else changes. Related:
   whether admin converts too. Current plan is no — Inter's tabular numerals earn their place there.
4. **Calendar the `GCC_GITHUB_TOKEN` expiry** — on lapse, publishing fails with a GitHub 401 that
   reads like a bug months after anyone touched this.
5. **Two unset env vars, both needing a redeploy:** `NEXT_PUBLIC_GCC_CTA_URL`, so both screens fall
   back to `https://www.ansr.com/`, and `NEXT_PUBLIC_GCC_FRAME_TARGET_ORIGIN`, so height posts to
   `*`. Plus which ansr.com page carries the iframe, and who adds the snippet.
6. **Three sign-offs from ANSR:** Screen 2's figures as publishable (four are judgement —
   `data-audit.md`), `COMMON_FUNCTIONS`, and the business types per industry (`business-types.md`).
7. **One brand ask, unblocked but unanswered:** a single functional red for destructive actions.
   Re-measured against the new palette, `#B3505B` is the best verified candidate. See `BRAND.md`.

## Open decisions, not yet made

- **The city map's fixed frame leaves its northern third empty** for a southern-clustered industry.
  Invariant 8 working as intended, so it wants a decision rather than a fix.
- **Whether to relax the industry boundary, as a fallback only.** Per `proto-industry-tag.ts` the
  obvious form fails: industry as a weighted tag gives zero cross-industry peers at any weight. **The
  variant to decide on** is cross-industry above a 0.40 bar, lengthening 105 of 119 short sets. It
  breaks an invariant and leaves `industryOthers` industry-scoped, so the split bar stops describing
  the peers shown — a copy decision first.
- **How many content grounds Screen 2 needs** — hero → one tint field → close, against the
  reference's four. Still the flattest surface in the tool.
- **Vercel preview protection and `ADMIN_TOTP_SECRET`** are both unresolved; the durable reasoning is
  in `project.md`, so only the choice is outstanding.
- **Whether either browser suite runs in CI, and worse, that nothing verifies how a screen LOOKS.**
  Reading renders by hand caught three real defects this session that every automated check passed: a
  dissolve that rendered as a blank card, a motif that read as a divider rule, and a control boundary
  at 1.78:1. That is the case for a visual-regression and axe pass, and the reason not to read a
  green gate as evidence a screen is finished.

## Traps worth remembering

Invariants in `project.md`, brand rules in `design-stack.md`, visuals in `.tastemaker/style-lock.md`
and `docs/ansrx-visual-language.md`. These bite only in the code.

- **`brand_lint.py` reads its raw-hex allow-list out of `tokens.css` and cannot tell a comment from a
  declaration**, so quoting a value in a comment there legitimises it project-wide — name tokens,
  never quote them. It also **skips `assets/` and `scripts/`**, so a retired colour surviving in a
  motif is silent: `brand_asset.py stat` every asset after a palette change and read the lists.
- **`brand_asset.py recolor --map` takes one comma-separated string.** Repeating the flag applies
  only the last pair, and the sole signal is an "unmapped colors left as-is" line on stderr. Watch
  for a **collapse** where two source steps resolve to one target: that flattened both diagonal
  textures from four depth steps to three before an explicit map fixed them.
- **`.ansr-dissolve` only works where its fill meets a different ground.** Inside a panel of the same
  colour it masks white onto white and the panel's own background still draws the edge.
- **`--ansr-gradient-hero` carries white only** — `--ansr-accent-inverse` is 2.12:1 on it and
  `--ansr-text-inverse-muted` 2.23:1.
- **Never pair `setState` with a `requestAnimationFrame` that reads a ref** — React may commit later,
  so the ref is null and the call vanishes. And a "have I run before" boolean is not a transition
  guard: React's dev double-invoke makes the second mount run not-the-first. Relatedly, **two refs on
  one node must share one callback**: a second `ref` prop silently replaces the first, which in
  `input-panel.tsx` would have broken focus-on-invalid-submit with no visible symptom.
- **A guard that is always false passes while asserting nothing.** A test read `hqCountry` off a
  `PeerCard`, which drops it. Keep the exhaustive key-list assertion. And **`peerLead` only claims
  "your own market first" when no line of business was given** — exactly when matching is band-led
  and the claim is true. It reads as a bug and is not one.
- **A public spec must never locate a band or heading by its wording**, nor anchor a regex on
  punctuation beside copy. `helpers.ts` `band()` / `expectBand()` and `h1#ask-title` are the
  contract; `/to choose from\./` broke on a pass that changed only the clause after the full stop.
- **Pure IDF scores every tag zero when one industry's tagged companies share a type** — keep the
  unweighted-overlap fallback, and use **`log(N/f)`, not `log(1 + N/f)`**. `sweep-floor.ts` is
  worthless unless its self-check says SOUND. **Peer-set assertions must be scoped to `#peers`**:
  Walmart legitimately appears on Nike's result, in the largest-in-industry panel.
- **`tsc` covers `scripts/`, but `tsx` does not typecheck**, and `noUncheckedIndexedAccess` is on, so
  any new indexed read needs a guard. **`hqCountry` is `"USA"`**. No "SaaS" business type.
  Per-company keys must be industry-scoped. Draft `STORAGE_KEY` is v3, mirrored in `helpers.ts`.
- **In deployed mode only `0-` specs run, so a write-capable spec renumbered `0-` would publish to
  production.** And **Screen 2's tab is "HR"**, not "Human resources": a spec looping the long name
  skips that tab in silence.
