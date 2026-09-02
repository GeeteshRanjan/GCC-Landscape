# Handoff — current state

State and pointers only. Reasoning lives in `project.md` if durable or `.tastemaker/style-lock.md` if
visual. Bounded by SHAPE, not length — see the `handoff.md` subsection of "Document protocol" in
`project.md` before editing. Never measure this file; over a cap, delete or merge a whole item.

**Last updated:** 2026-09-02

## Where we are

- **Working tree is DIRTY and nothing is committed or pushed.** Two-dozen-plus files across
  `src/`, `data/`, `docs/`, `.tastemaker/` and `.kiro/steering/`, plus five new files —
  `src/components/public/ansr-wordmark.tsx`, `src/components/screen2/milestone-card.tsx`,
  `src/data/company-mark.ts`, `scripts/domains.ts` and two unit specs.
- **Domains are IN: 1,828 of 1,834 companies, 99.7%.** Six carry none and nine domains are shared by
  two companies each, both legitimate. Loaded through `scripts/domains.ts`; rules in `project.md`.
- **The Brandfetch mark tier is BUILT. ON locally via `.env.local` (gitignored, so not part of the
  commit), pinned OFF for the browser suite, and UNSET in production.** `company-mark.ts` resolves
  `PeerCard.markUrl` and the public `img-src` derives from the same var. Rules in `project.md`, three
  measured traps in `docs/traps.md`.
- **Uncommitted refinement work across both screens, all at ANSR's request** — the HR salary ranking is
  seven rows with "All roles" as the orange comparator named by its own label, plus quietened peer
  pills, graduate-pipeline outline removed, capability-grid India emphasis removed, velocity rails
  aligned. Rules in `project.md`; measurements in the style lock.
- **FULL gate GREEN, browser suite included:** `tsc`, 668 Vitest, **199 Playwright**, `data:verify`
  clean, `brand:lint` clean.

## Next action

1. **Read the peer row in a browser at 1440, 768 and 390 with marks ON.** `npm run dev`; the client ID
   is already in `.env.local`. Marks have only ever been verified as HTTP responses — whether a wordmark
   sits level with a stacked mark under the dual size cap is a visual judgement no assertion covers.
2. **Commit and push, then read all four Screen 2 tabs.** Nothing across the last several sessions was
   looked at in a browser by a human.
3. **On Vercel, add `NEXT_PUBLIC_GCC_BRANDFETCH_CLIENT_ID` to PREVIEW ONLY, then redeploy** — env vars
   apply only to builds created after they are added. Production waits on blocked item 12.
4. **A live PREVIEW of the public screens from the draft is the one part of the earlier ask not built.**
   Peer view can render from the draft directly; Screen 2 needs a server action (the `server-only`
   gate must stay).
5. **`.impeccable/critique/` is an orphaned artifact** — delete the directory or accept it as a local
   read-only record.

## Blocked / needs the user

1. **MUST NOT SHIP UNEXAMINED — the ANSR rail's four months (4, 8, 16, 24).** `ANSR_MONTHS` in
   `screen2/milestone-card.tsx`. A marketing claim the dataset does not hold.
2. **MUST NOT SHIP UNEXAMINED — three PROVISIONAL latency figures**, Middle East 50, Singapore 70, US
   West 230 on `ops-network-latency`; named in the metric's note and `docs/data-audit.md`.
3. **MUST NOT SHIP AS IS — two placeholder figures at 10%.** India operating cost growth and workplace
   cost growth. Replace under Metrics → Finance, and replace the `PLACEHOLDER` marker with the number.
4. **Rotate the admin password** (shared in a transcript). `npm run admin:hash`, set
   `ADMIN_PASSWORD_HASH`, redeploy. Calendar the `GCC_GITHUB_TOKEN` expiry.
5. **Recent Screen 2 changes want ANSR sign-off as a set** — the two new salary rows and dropped
   comparator sentence, two renamed salary entries, "Base pay" unit, backfill note, extended latency
   card, capability grid losing India emphasis, twelve retitled metrics, removed summary/section
   headings, deleted floor sentence, "Other sciences" dropped from the discipline split.
6. **Deleting the sealed group means a visitor is never told a figure is being withheld.** Four gated
   metrics render nothing; restoring the signal is one section per tab.
7. **The industry re-homes + tags want ANSR sign-off** — 26 moves; table in
   `scripts/business-type-map.ts`, summary in `docs/data-audit.md`.
8. **38 companies stay untagged, 6 business types single-member, `avi-services` empty** — honest thin
   spots, not defects; need a real second company from a future batch.
9. **Every peer-split's finer categories want ANSR sign-off** — payments, BFSI fund servicers,
   Software localization/content, pharma consumer-health.
10. **Moderat is still not on the page.** `Moderat-*.woff` on disk under `public/fonts/` but gitignored
    and unwired; licence unsettled and Light+Regular alone would synthesise Bold. Needs a licensed
    woff2 set with Medium and Bold, then Moderat at the front of `--ansr-font-display`.
11. **Kept, tested, rendered nowhere** — Screen 2's six sentences, `FIN_DRIVERS_INSIGHT`,
    `FIN_FIGURES_QUALIFIER`, `FLOOR_NOTE`; Screen 1's `LARGEST_LEAD`, `peerLead`; `grid.anchorColumn`;
    `BarTone`'s `muted`. Plus: India outline sign-off (three places), palette anchors, the five
    composed-tab asks asserted absent (style lock).
12. **TRADEMARK IS THE ONLY THING GATING THE MARK TIER GOING LIVE.** 1,834 third-party marks on an ANSR
    page beside an ANSR CTA is ANSR's decision, not this repo's; production leaves the client ID unset
    until it is settled. Separately, the upload tier — if built — needs your sign-off on
    `data/logo-manifest.json` as a deliberate exception to the one-file rule.

## Traps worth remembering

**`docs/traps.md`** — read it before touching the test suite, the dev server, the metric catalogue, or
anything that renders. Five that would cost the most time:

- **`curl` against `cdn.brandfetch.io` 302s to their guidelines with OR without a valid client ID**, so a
  shell test reports `text/html` for every domain and looks like a dead credential. And **`fallback` is a
  PATH segment**: `?fallback=404` is ignored and returns a placeholder with HTTP 200, `/fallback/404`
  returns a real 404. Verify marks in a browser, never a terminal.
- **A spec reading an inline style gets an EMPTY STRING, not a failure, when the positioning moves to a
  custom property.** Cost this session: nine empty strings read as a broken finance chart that was
  drawing correctly. Moving a measurement into CSS means grepping the specs for the old property.
- **Never touch `.next/` while a dev server holds it.** Every request then 500s with
  `TurbopackInternalError`. Kill both processes, `rm -rf .next`, restart. Playwright leaves port 3210
  held after a killed run — `lsof -ti:3210 | xargs kill -9`.
- **`npx playwright test` does not rebuild the fixture** — only `npm run test:browser` (or
  `tsx tests/browser/prepare.ts`) regenerates `tests/browser/.tmp/dataset.json` from `data/dataset.json`.
  It also cannot start without an existing production build.
- **Back-to-back browser runs go flaky and the failures name the wrong specs** — the server holds the
  rate limiter and dataset cache in memory, so a re-run right after another reports failures and "did not
  run" that a clean run does not. Kill port 3210, `rm -rf test-results`, then re-run once.
