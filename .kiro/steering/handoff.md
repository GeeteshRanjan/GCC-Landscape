# Handoff — current state

State and pointers only. Reasoning lives in `project.md` if durable or `.tastemaker/style-lock.md` if
visual. Bounded by SHAPE, not length — see the `handoff.md` subsection of "Document protocol" in
`project.md` before editing. Never measure this file; over a cap, delete or merge a whole item.

**Last updated:** 2026-09-01

## Where we are

- **`main` is clean and deploys `gcc-landscape.vercel.app`. The working tree now carries FOUR uncommitted
  passes, none committed:** the peer-quality/business-type pass, the Screen 2 Function View pass, the
  close, and this session's four requested UI changes.
- **Full gate GREEN:** `tsc`, 574 Vitest, `data:verify` clean, `brand:lint` clean. Playwright ran
  196/196 after the four changes; the label rename that followed was re-run against the `public` project
  only (110 specs), which is where every affected assertion lives.
- **This session's four changes**, all recorded as rules in `project.md` and as decisions in the style
  lock: the ops disruption cell states `0`; Screen 1's opening snapshot cell is a COUNT labelled "GCCs in
  your sub-industry"; the finance hub table lost its bars and its emphasised row; the tier spread labels
  each comparator marker with its figure.
- **The close is restored on both result screens** as a paywall band, and its copy is `siteContent.close`
  — admin-editable under Site copy, reported in the publish diff, draft `STORAGE_KEY` at v5.
- **`data/dataset.json` was rebuilt via `data:import --reseed-business-types --reseed-metrics`** after a
  `git checkout` destroyed its uncommitted state. `data:verify` matches the committed baseline.
  **Diff it before committing.**

## Next action

1. **Decide whether to commit** all four passes, and commit `data/verify-baseline.json` with the data.
2. **Read all four function tabs at 768 and 390.** Still unread: the finance hub table with no bars at one
   column, the tier spread's marker labels at `md` where the rail is narrowest, the one-line summary row at
   one column, the reworked dropdown on touch, the industry cascade at 1366, the containment marker.
3. **Two untracked analysis scripts are undecided** — `scripts/audit-peer-quality.ts` and
   `scripts/test-random-peers.ts`. Track them beside the other analysis scripts or delete them.
4. **`.impeccable/critique/` is an orphaned artifact** — delete it or accept it as a local record.

## Blocked / needs the user

1. **MUST NOT SHIP AS IS — two placeholder figures at 10%, live on `main`.** India operating cost growth
   and workplace cost growth. Replace under Metrics → Finance, **and replace the `PLACEHOLDER` marker with
   the number** — a unit test pins the marker.
2. **The ops disruption cell states `0`, which this dataset cannot evidence** (its four cities are 4, 2, 3
   and 6 days). Shipped on the project owner's explicit instruction over a recorded refusal; needs either
   ANSR confirming a real zero as a dataset edit or the extent restored. Style lock has both directions.
3. **Rotate the admin password** (shared in a transcript). `npm run admin:hash`, set
   `ADMIN_PASSWORD_HASH`, redeploy. Calendar the `GCC_GITHUB_TOKEN` expiry. **`NEXT_PUBLIC_GCC_CTA_URL` is
   LIVE rather than dormant** — set it to the real landing page or the close falls back to ansr.com.
4. **The close reverses ANSR's own instruction twice over and needs their sign-off as a whole** — the
   paywall framing (a blurred field implying withheld detail) is the part to put in front of them.
5. **The Screen 2 passes want ANSR sign-off** — twelve retitled metrics, four removed summary headings, the
   removed HR/Ops section headings, the deleted floor sentence, "Other sciences" dropped. Plus this
   session's finance table: removing the bars leaves twenty indices compared as numbers with no encoding of
   magnitude, which is defensible at this grid's size and not at a wider one.
6. **The earlier industry re-homes + tags want ANSR sign-off** — 26 moves; table in
   `scripts/business-type-map.ts`, summary in `docs/data-audit.md`. Plus every peer-split's finer
   categories: payments, BFSI fund servicers, Software localization/content, pharma consumer-health.
7. **38 companies stay untagged, 6 business types single-member, `avi-services` empty** — honest thin
   spots needing a real second company from a future batch.
8. **No visitor is told a specific figure is withheld.** Four gated metrics render nothing; the close's
   copy is the only signal and it is general.
9. **Moderat is not on the page** — no licensed files in repo, so `--ansr-font-display` resolves to Hanken
   Grotesk. Drop woff2 under `public/fonts/` and put Moderat at the front of the token.
10. **Industry / sub-industry NAMING** — `BFSI`, `Healthcare & Lifescience`, `Architecture, Engineering, &
    Construction` are taxonomy-editor work that cascades into companies and `business-type-map.ts` keys.
11. **Kept, tested, rendered nowhere** — Screen 2's six sentences, `FIN_DRIVERS_INSIGHT`,
    `FIN_FIGURES_QUALIFIER`, `FLOOR_NOTE`, `functionFraming`, `SummaryFigure.high`; Screen 1's
    `LARGEST_LEAD`, `peerLead`, `framing()`, `industry.shareOfIndia`, provenance removals. Plus the five
    unasserted composed-tab asks (style lock, "the composed tabs' refusals"), the India outline sign-off in
    three places, and the palette anchors.
12. **Two changed figures need ANSR's eye** — professionals moved 1.06M→1.69M; the snapshot share is
    computed over a different population.

## Traps worth remembering

**`docs/traps.md`** — read it before touching the test suite, the dev server, the metric catalogue, or
anything that renders. Five that would cost the most time:

- **Never `git checkout` a file with uncommitted work to undo your own edit to it.** It discards the whole
  working-tree state, not your part. Cost this session's recovery; the importer is why it was recoverable.
- **Never touch `.next/` while a dev server holds it**, and **kill stale Playwright servers before a new
  run** — the config binds 3210 and a second run dies with "already used" rather than reusing it.
- **`npx playwright test` does not rebuild the fixture** — only `npm run test:browser` runs `prepare.ts`
  and regenerates `tests/browser/.tmp/dataset.json` from `data/dataset.json`.
- **Never rewrite `data/dataset.json` through a JSON round-trip.** `json.dump` reformatted it into a
  615-line diff for a 4-line addition, which destroys the reviewable-diff property the no-database
  decision rests on. Edit it as text.
- **A metric TITLE is load-bearing in three places** — the public card, the shared-title invariant in
  `metrics.test.ts`, and admin's `Edit {title}, {area}` button that `4-metrics.spec.ts` clicks. The
  catalogue in code and the titles in `dataset.json` are separate copies; `--reseed-metrics` reconciles them.
