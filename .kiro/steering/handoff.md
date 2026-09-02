# Handoff — current state

State and pointers only. Reasoning lives in `project.md` if durable or `.tastemaker/style-lock.md` if
visual. Bounded by SHAPE, not length — see the `handoff.md` subsection of "Document protocol" in
`project.md` before editing. Never measure this file; over a cap, delete or merge a whole item.

**Last updated:** 2026-09-03

## Where we are

- **Everything is committed and pushed to `main`. Working tree clean, local equals `origin/main`.** No
  SHA here on purpose — it goes stale on this file's own commit.
- **Full gate GREEN on the pushed tree** — `tsc`, `brand:lint`, 668 unit, **199 browser**, `data:verify`
  clean. Vercel rebuilds production from `main`, so this is live.
- **Another session's two admin publishes were INTEGRATED, not reverted.** The rebase auto-merged; both
  sides were verified present. Their two title renames are cascaded into `metric-catalogue.ts` and four
  spec locations; `close.ctaLabel` is now "Get all Parameters".
- **The Fortune Global 500 badge is live at 16px, replacing the accent chip at both sites.** Domains
  cover 1,828 of 1,834 companies. The Brandfetch mark tier is built and OFF — the client ID is set in
  `.env.local` only, never in production. Rules for all three in `project.md`.
- **The dev server was killed and `.next/` cleared to run the suite** — restart with `npm run dev`.

## Next action

1. **Read the peer row and the ranking rows in a real browser at 1440, 768 and 390.** The badge has only
   ever been seen in Playwright screenshots. Company marks render as broken-image icons locally because
   the CDN is unreachable from that context — worth resolving in the same pass.
2. **Read all four Screen 2 tabs in a browser.** Nothing across the last several sessions was looked at
   by a human.
3. **Serialise with the other session.** One at a time for `test:browser`, `build` and admin publish;
   everything else is safe in parallel. Rule in `project.md`.
4. **Confirm the two renamed titles belong to the twelve already awaiting ANSR sign-off**, blocked item
   6, rather than being a new decision.
5. **A live PREVIEW of the public screens from the draft is the one part of the earlier ask not built.**
   Peer view can render from the draft directly; Screen 2 needs a server action (the `server-only` gate
   must stay).

## Blocked / needs the user

1. **MUST NOT SHIP UNEXAMINED — the ANSR rail's four months (4, 8, 16, 24).** `ANSR_MONTHS` in
   `screen2/milestone-card.tsx`. A marketing claim the dataset does not hold.
2. **MUST NOT SHIP UNEXAMINED — three PROVISIONAL latency figures**, Middle East 50, Singapore 70, US
   West 230 on `ops-network-latency`; named in the metric's note and `docs/data-audit.md`.
3. **MUST NOT SHIP AS IS — two placeholder figures at 10%.** India operating cost growth and workplace
   cost growth. Replace under Metrics → Finance, and replace the `PLACEHOLDER` marker with the number.
4. **TWO TRADEMARK DECISIONS, both ANSR's and neither this repo's, and both are now on `main`.** 1,834
   hotlinked Brandfetch marks and Fortune's badge, each beside an ANSR CTA. Fortune's guidance requires
   written approval via PARS International. The mark tier is off by an unset env var; **the badge has no
   equivalent switch and would need removing.**
5. **Rotate the admin password** (shared in a transcript). `npm run admin:hash`, set
   `ADMIN_PASSWORD_HASH`, redeploy. Calendar the `GCC_GITHUB_TOKEN` expiry.
6. **Recent Screen 2 changes want ANSR sign-off as a set** — the two published title renames, the two new
   salary rows and dropped comparator sentence, two renamed salary entries, "Base pay" unit, backfill
   note, extended latency card, capability grid losing India emphasis, twelve retitled metrics, removed
   summary/section headings, deleted floor sentence, "Other sciences" dropped from the discipline split.
7. **Deleting the sealed group means a visitor is never told a figure is being withheld.** Four gated
   metrics render nothing; restoring the signal is one section per tab.
8. **The business-type taxonomy wants ANSR sign-off as one pass** — 26 industry re-homes plus tags
   (table in `scripts/business-type-map.ts`, summary in `docs/data-audit.md`), every peer-split's finer
   categories, and the honest thin spots: 38 untagged companies, 6 single-member types, `avi-services`
   empty pending a real second company.
9. **Moderat is still not on the page.** `Moderat-*.woff` on disk under `public/fonts/` but gitignored
   and unwired; licence unsettled and Light+Regular alone would synthesise Bold. Needs a licensed woff2
   set with Medium and Bold, then Moderat at the front of `--ansr-font-display`.
10. **Kept, tested, rendered nowhere** — Screen 2's six sentences, `FIN_DRIVERS_INSIGHT`,
    `FIN_FIGURES_QUALIFIER`, `FLOOR_NOTE`; Screen 1's `LARGEST_LEAD`, `peerLead`; `grid.anchorColumn`;
    `BarTone`'s `muted`. Plus: India outline sign-off (three places), palette anchors, the five
    composed-tab asks asserted absent (style lock).

## Traps worth remembering

**`docs/traps.md`** — read it before touching the test suite, the dev server, the metric catalogue, or
anything that renders. Five that would cost the most time:

- **`test:browser`, `build` and admin publish are single-tenant.** One port 3210, one fixture, one
  `test-results/`, one `.next/`, one `main`. A second session running any of them corrupts the first into
  `page.goto` timeouts and trace `ENOENT`, which reads as a product bug. Rule in `project.md`.
- **A `dataset.json` rebase AUTO-MERGES rather than conflicting**, because the file is pretty-printed and
  two sessions rarely touch the same lines. "No conflict" is not evidence nothing was lost — verify both
  sides are present in the merged file before committing.
- **A metric TITLE is load-bearing in four places** — the public card, the shared-title invariant in
  `metrics.test.ts`, admin's `Edit {title}, {area}` button, and `metric-catalogue.ts`. **A rename
  published from admin lands in `dataset.json` alone**, so the catalogue and the specs are left behind and
  `--reseed-metrics` would undo it. Nothing in the schema, the diff or `data:verify` catches this.
- **`curl` against `cdn.brandfetch.io` 302s with OR without a valid client ID**, so a shell test reports
  `text/html` for every domain and looks like a dead credential. And **`fallback` is a PATH segment**.
  Verify marks in a browser, never a terminal.
- **Never touch `.next/` while a dev server holds it.** Every request then 500s with
  `TurbopackInternalError`. Playwright also leaves 3210 held after a killed run — but check for a live run
  before killing it.
