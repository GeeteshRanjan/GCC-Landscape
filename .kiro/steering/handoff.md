# Handoff — current state

State and pointers only, never reasoning — that lives in `project.md` if it is durable or
`.tastemaker/style-lock.md` if it is visual. Rewritten in one pass each session. See the document
protocol in `project.md` before editing this.

**Last updated:** 2026-08-30

## Where we are

- **Everything through the zone pass is committed as `a93e77e`. `main` is 7 commits ahead of
  `origin/main` and NOT pushed.** Pushing rebuilds `gcc-landscape.vercel.app`, so nothing below is
  live. `project.md` is modified and uncommitted, waiting on the decision below.
- Screen 1's answer state is the six-zone shape: four card tones, packed comparison cards, the
  ranked largest-centres stack, the overlapping containment chart, four snapshot tiles, and the
  teal band carrying the finding plus four answer pills and one control. Decisions are in the
  style lock, "The zone pass".
- **Gate green on all six:** **369** Vitest, **139** Playwright, `tsc`, `brand_lint.py`,
  `next build`, `data:verify`.
- **A visual audit of the peer view ran this session** against the live render, the ask screen and
  `Group 149.svg`. It changed no source; the fix sequence is below.
- Screen 2's body is still unread since the palette moved.
- Draft `STORAGE_KEY` is at **v4**, mirrored in `helpers.ts`.

## Next action

1. **Push `main`, or rewrite the last two commits first.** Seven commits unshipped. The choice is
   whether `Customer Logos/` may stay in `d767e6a`'s history — 560 KB of raw client marks whose
   adapted copies in `public/logos/` are served publicly anyway. Nothing is on the remote, so a
   rewrite needs no force push.
2. **Take blocked items 1–3 to ANSR before the copy work lands.** Two of the three are things the
   tool no longer says about its own figures.
3. **Then the fix sequence, in order.** A copy truth, B duplication and the containment chart,
   C the card system re-derived from the board, D colour and type. A–D are dependent. Then, in
   any order: E the two maps, F motion, G Screen 2 parity with whatever C and D settle. B and D
   each need ANSR — B if the three-layer shape they asked for changes, D per blocked item 11.
   Every defect behind them is visible in the render; shoot the page before starting.
4. Re-read both result screens once Moderat lands — the Medium product lockup and the map's
   in-place labels are set against Hanken's metrics.

## Blocked / needs the user

1. **The map's boundary attribution was removed and invariant 8 required it.** "Boundaries as India
   states them, from Natural Earth's India point-of-view dataset." The outline is still generated
   from that dataset, so the claim drawn is unchanged — only the statement of whose claim it is has
   gone. A spec asserts its absence. Raise this first; it is a brand-and-legal position, not a
   layout preference.
2. **The scale strip carries no provenance at all now** — no audit disclaimer, no band-midpoint
   method line, no national count, no source credit, no as-at date. `scale.asOf` is still on the
   view model, so restoring the date is one line.
3. **The mean-headcount method line is gone.** "Mean of reported employee bands, rounded." The
   figure is still a rounded mean of band midpoints; only the word "Typical" now signals it.
4. **Rotate the admin password** — shared in a chat transcript, deployment publicly reachable. The
   only item with live exposure. `npm run admin:hash`, set `ADMIN_PASSWORD_HASH`, redeploy.
5. **Sign off drawing India's outline at all, in TWO places** — the ask hero's dotted silhouette
   and the locations map's filled one. One decision, one dataset; invariant 8 states the position.
6. **Confirm the reference departures**, listed in the style lock: no function share percentages,
   no "explore more companies" action, no "view full ranking" link, no logos anywhere, and "Fortune
   Global 500" where the reference says "Fortune 500".
7. **Moderat's licence.** Hanken Grotesk is the stand-in. On an answer it goes first in
   `--ansr-font-display`; confirm the palette anchors at the same time.
8. **Screen 1 still has no CTA at all**, per the page-end instruction. Screen 2 carries the
   conversation. Confirm that is intended.
9. **`#072228` vs `--ansr-teal-deep`** — offer to collapse to one token. And **calendar the
   `GCC_GITHUB_TOKEN` expiry**: on lapse, publishing 401s months later and reads like a bug.
10. **`NEXT_PUBLIC_GCC_CTA_URL` and `NEXT_PUBLIC_GCC_FRAME_TARGET_ORIGIN` are unset**, both needing
    a redeploy. Plus which ansr.com page carries the iframe and who adds it.
11. **Three sign-offs:** Screen 2's figures as publishable (four are judgement), `COMMON_FUNCTIONS`,
    and the business types per industry. More logos coming; ten are in place. Plus two brand asks —
    a functional red, where `#B3505B` is the verified candidate, and whether orange may carry stat
    figures and eyebrows, which the board does and the once-per-band rule does not allow.
12. **Show ANSR the industry cascade at 1366 as well as 1512.** Below 1440 it is a drill-in, which
    is the one part of that ask that could not be met at every width.

## Open decisions, not yet made

- **Card shadows and radius `lg` on the public screens** reverse the no-shadow rule the band system
  was built on. Session C is where this settles.
- **The peer grid at `sm` leaves one empty cell** when five cards divide into two columns. The row
  packing only engages at `lg`, where the twelve-column grid exists.
- **The comparison cards no longer state the headquarters preference**, so a visitor cannot see why
  a Swedish company outranks an American one for an American reader. `peerLead` is the only method
  line left on the block.
- **Deferred from the earlier critique, not refused:** hover cross-highlighting between the map and
  its ranked list, and map filter controls.
- **The hero map is absent below 1024px**, most phone and tablet traffic. Entry point only.
- **The locations map's labels are ~12px at 390** and the three hubs cluster tightly there.
- **Relaxing the industry boundary, as a fallback only.** A 0.40 bar for out-of-industry peers,
  which breaks an invariant.
- **Vercel preview protection** and **`ADMIN_TOTP_SECRET`**.

## Traps worth remembering

Code only. Brand in `design-stack.md`, visual in the style lock, invariants in `project.md`.

- **Reach the dev server at `http://localhost:3000`, never `127.0.0.1`.** Next 16 403s React's chunk
  cross-origin, and the page renders perfectly with ZERO interactivity.
- **A full-page 1440 render exceeds the image limit.** Downscale with `sips` before reading one, and
  shoot `Group 149.svg` by injecting it with `setContent` and scrolling — `fullPage` times out on it.
- **Name-from-content inserts whitespace at element boundaries.** The product lockup's period lives
  in `AnsrWordmark`'s `label`; the visible one is `aria-hidden`. Check with `ariaSnapshot()`.
- **The peer block is a LIST of five cards.** Five `listitem`s, five `h3`s, no `rowheader`, no
  `table`. A `rowheader` means the table came back; an `h4` means the lead card did.
- **The largest block is a `listitem` stack too**, and it collapses to a bare line for a thin
  industry — assert `listitem` count 0 there, not 5.
- **`Containment` renders bars and labels as consecutive SIBLINGS via `Fragment`.** A
  `display: contents` wrapper would put each bar first among its own siblings and break the
  `:first-of-type` rule that suppresses the outermost shadow.
- **A `.gcc-containment__label` may not use `.gcc-enter`.** That keyframe ends on a `transform` and
  `fill: both` outranks a declared value, so it would overwrite the `translateY` that positions it.
  Same trap as the hero map's fade.
- **A wide comparison card's two-column interior is gated on `lg`, not `sm`** — the span is.
- **The profile group holds exactly ONE button**, named "Change my answers", on both result screens.
  A count of four means the panels became controls again.
- **The answer pill label is "Company", not "Your company".**
- **"India today" is asserted ABSENT** from both screens: it is the removed India-presence question's
  label. Any caption using the phrase breaks a spec that is about something else.
- **The `h1` is `ANSR. GCC Intelligence` on BOTH result screens**, and the finding beside it is a
  `<p>`. A spec asserting the finding in a heading is the old shape.
- **`expectBand` accepts `aria-label` OR `aria-labelledby`.** A band with neither still fails.
- **`getByLabel("Industry")` matches the open tree too.** Use `getByRole("combobox", { name })`.
- **A `boundingBox()` taken as a panel opens is a few px off.** Measure `clientHeight`, or await
  `document.getAnimations()` filtered to finite iterations — the marquee and the hub halo are both
  infinite and would hang the await.
- **`.gcc-*` blocks in `globals.css` are UNLAYERED** and outrank Tailwind utilities. So is
  `tokens.css` — which is why `outline-none` cannot remove the global focus ring.
- **A transform makes a stacking context, and `.gcc-enter` leaves one on every row it touches.**
- **Tailwind's `accent` is the shadcn contract variable and is ORANGE here.** Brand heading teal is
  `text-accent-teal`.
- **Black ink fails on `--ansr-accent` (2.14:1) and on `teal-500` (4.09:1).** Any chart that puts a
  label on its own fill is limited to `teal-100`/`200`/`300`. `--ansr-teal-bright` is banned in a
  chart on a light ground at all, at 2.44:1.
- **`.ansr-motif + *` assumes a motif is followed by content** — wrap multiple motifs in one.
- **`brand_lint.py` rejects a raw hex inside a COMMENT**, and `brand_asset.py recolor --map` takes
  one comma-separated string, not a repeated flag — repeating it silently applies only the last pair.
- **A Tailwind class cannot be interpolated.** `lg:col-span-${n}` generates nothing; the row plan,
  the snapshot and the context pills all use static lookups.
- **`tsc` covers `scripts/` but `tsx` does not typecheck**, `noUncheckedIndexedAccess` is on,
  `hqCountry` is `"USA"`, the taxonomy holds `"Scotland"`, and there is no "SaaS" business type.
