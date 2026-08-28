---
inclusion: always
---

# Handoff — current state

Volatile. Rewritten each session, never appended to. Cap 120 lines. Present tense only.

**Last updated:** 2026-08-28

## Where we are

**Branch `ask-screen-overhaul`, three commits, all pushed.** `main` is untouched, so
`gcc-landscape.vercel.app` and `test:deployed` still measure the old UI and the old palette. Nothing
is at risk any more — every state has a commit behind it.

1. `0549037` — the four previously unreviewed passes (chart vocabulary, art direction, row packing,
   the Group 149 measurement), committed together as the restore point.
2. `afde570` — **the palette swap.** Branding_Palette.docx is superseded by `Group 149.svg`. Token
   names and semantic aliases are unchanged; only values moved. Recorded durably in
   `design-stack.md`, `project.md` invariant 6 and `BRAND.md`.
3. `569fc22` — **the ask screen, rebuilt.** Hero on the reference's linear ground, form panel on its
   offer-card anatomy, a real display face loading for the first time.

**Gate is green on all six:** 350 Vitest, 114 Playwright (two new), `tsc`, `brand_lint.py`,
`next build`, `data:verify`. Renders read by hand at 1440, 768 and 390, plus the validation-error and
filled states.

**The display face now loads** — Hanken Grotesk, self-hosted via `next/font`, real 300–700 weights.
**Only the ask screen opts in.** The answer state, Screen 2 and admin still resolve to
`--ansr-font-sans`, and since nothing loads Inter either, they render in the system sans at Regular.
That is the largest visible inconsistency in the tool right now.

## Next action

**Continue one screen at a time. The Peer View answer state is next**, then Screen 2. Both are three
generations of art direction behind the ask and neither has been looked at since the palette moved.

1. **Read the renders first.** The answer state now runs on the new palette with no pass over it: the
   pale ground is visibly greener, `--ansr-accent` moved, and `--ansr-gradient-teal`'s peak dropped a
   step. Nothing is known to be broken, but nothing has been checked either.
2. Roll `font-display` outward, one screen at a time, and check each — the metrics differ from the
   system sans, so anything tuned by eye against Inter can reflow.
3. The reference moves that the ask now uses and the other screens do not: the **80px hero at 1.05
   leading**, **Light 300 body copy**, **radius 0 on panels**, **`.ansr-dissolve` instead of a card
   edge**, **`.ansr-bar-ramp` in a band's trailing ground**, and **filled controls with one bottom
   rule** (`.gcc-field`). `.tastemaker/style-lock.md` records what each one cost to get right.
4. `--ansr-accent-inverse` (the bright mint) exists now and nothing outside the token file uses it.
   It is the reference's whole dark-ground voice, and both inverse figure bands on the answer state
   are candidates. It is illegal on any light ground at 2.44:1.
5. Open a PR when the answer state lands, rather than at the end.

## Blocked / needs the user

1. **The palette anchors were adopted on the reference's own evidence, not by explicit sign-off.**
   Every value in `tokens.css` now carries its occurrence count in `Group 149.svg`, so the case is
   auditable — but ANSR has not confirmed it. Worth doing before this reaches a client review.
2. **Rotate the admin password.** Shared in a chat transcript, deployment publicly reachable. Still
   the only item with live exposure. `npm run admin:hash`, set `ADMIN_PASSWORD_HASH`, redeploy.
3. **Moderat's licence.** ansr.com serves the two `.woff` files publicly, which is not a licence for
   an embedded tool, but theirs may already cover the domain. Hanken Grotesk is shipping in the
   meantime; when the answer arrives Moderat goes in front of it in `--ansr-font-display` and nothing
   else changes.
4. **Whether admin converts to the display face too.** Current plan: no. It is a dense internal tool
   and Inter's tabular numerals earn their place there.
5. **Calendar the `GCC_GITHUB_TOKEN` expiry** — on lapse, publishing fails with a GitHub 401 that
   reads like a bug months after anyone touched this.
6. **Two unset env vars, both needing a redeploy** (`NEXT_PUBLIC_*` is inlined at build time):
   `NEXT_PUBLIC_GCC_CTA_URL`, so both screens fall back to `https://www.ansr.com/`, and
   `NEXT_PUBLIC_GCC_FRAME_TARGET_ORIGIN`, so height posts to `*`. Plus which ansr.com page carries
   the iframe, and who adds the snippet.
7. **Three sign-offs from ANSR:** Screen 2's figures as publishable (four are judgement —
   `data-audit.md`), `COMMON_FUNCTIONS`, and the business types per industry (`business-types.md`).
8. **One open brand ask, unblocked but unanswered:** a single functional red for destructive actions.
   Re-measured against the new palette, `#B3505B` is the best verified candidate. See `BRAND.md`.

## Open decisions, not yet made

- **The city map's fixed frame leaves its northern third empty** for a southern-clustered industry.
  Invariant 8 working as intended, so it wants a decision, not a fix.
- **Whether to relax the industry boundary, as a fallback only.** `scripts/proto-industry-tag.ts`:
  the obvious form fails — industry as a weighted tag gives zero cross-industry peers at any weight.
  **The variant to decide on** is cross-industry above a 0.40 bar, lengthening 105 of 119 short sets.
  It breaks an invariant and leaves `industryOthers` industry-scoped, so the split bar stops
  describing the peers shown — a copy decision first.
- **How many content grounds Screen 2 needs** — hero → one tint field → close, against the
  reference's four. Still the flattest surface in the tool.
- **Vercel preview protection and `ADMIN_TOTP_SECRET`** are both still unresolved; the durable
  reasoning for each is in `project.md`, so only the choice is outstanding.
- **Whether either browser suite runs in CI.** Related and worse: **nothing verifies how a screen
  LOOKS.** Reading renders by hand caught three real defects this session that every automated check
  passed — a dissolve that rendered as a blank card, a motif that read as a divider rule, and a
  control boundary at 1.78:1. That is the argument for a visual-regression and axe pass, and also
  the reason not to trust a green gate as evidence a screen is finished.

## Traps worth remembering

Invariants in `project.md`, brand rules in `design-stack.md`, visuals in `.tastemaker/style-lock.md`
and `docs/ansrx-visual-language.md`. These bite only in the code.

- **`brand_lint.py` reads its raw-hex allow-list out of `tokens.css` and does not distinguish a
  comment from a declaration**, so quoting a value in a comment there legitimises it project-wide.
  Name tokens in comments, never quote them. It also **skips `assets/` and `scripts/` entirely**, so
  a retired colour surviving in a motif is silent — `brand_asset.py stat` every asset after a palette
  change and read the colour lists.
- **`brand_asset.py recolor --map` takes one comma-separated string.** Repeating the flag applies
  only the last pair, and the sole signal is an "unmapped colors left as-is" line on stderr. Watch
  for a **collapse** where two source steps resolve to one target: that flattened both diagonal
  textures from four depth steps to three before an explicit map fixed them.
- **`.ansr-dissolve` only works where its fill meets a different ground.** Inside a panel of the same
  colour it masks white onto white and the panel's own background still draws the edge.
- **`--ansr-accent-inverse` and `--ansr-text-inverse-muted` are both illegal on
  `--ansr-gradient-hero`** (2.12:1 and 2.23:1). That ground carries white only.
- **Never pair `setState` with a `requestAnimationFrame` that reads a ref** — React may commit later,
  so the ref is null and the call vanishes. And a "have I run before" boolean is not a transition
  guard: React's dev double-invoke makes the second mount run not-the-first.
- **Two refs on one node must share one callback.** A second `ref` prop silently replaces the first;
  in `input-panel.tsx` that would have broken focus-on-invalid-submit with no visible symptom.
- **A guard that is always false passes while asserting nothing.** A test read `hqCountry` off a
  `PeerCard`, which drops it. Keep the exhaustive key-list assertion. And **`peerLead` only claims
  "your own market first" when no line of business was given** — exactly when matching is band-led
  and the claim is true. It reads as a bug and is not one.
- **A public spec must never locate a band or a heading by its wording.** `helpers.ts` `band()` /
  `expectBand()` and `h1#ask-title` are the contract. Nor anchor a regex on punctuation next to copy:
  `/to choose from\./` broke on a pass that only changed the clause after the full stop.
- **Pure IDF scores every tag zero when one industry's tagged companies share a type** — keep the
  unweighted-overlap fallback, and use **`log(N/f)`, not `log(1 + N/f)`**. `sweep-floor.ts` is
  worthless unless its self-check says SOUND. **Peer-set assertions must be scoped to `#peers`**:
  Walmart legitimately appears on Nike's result, in the largest-in-industry panel.
- **`tsc` covers `scripts/`, but `tsx` does not typecheck.** `noUncheckedIndexedAccess` is on, so any
  new indexed read needs a guard. **`hqCountry` is `"USA"`**. No "SaaS" business type. Per-company
  keys must be industry-scoped. Draft `STORAGE_KEY` is v3, mirrored in `helpers.ts`.
- **In deployed mode only `0-` specs run, so a write-capable spec renumbered `0-` would publish to
  production.** And **Screen 2's tab is "HR"**, not "Human resources": a capture or spec looping the
  long name skips that tab in silence.
