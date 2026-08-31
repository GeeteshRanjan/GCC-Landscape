# Handoff — current state

State and pointers only. Reasoning lives in `project.md` if durable or `.tastemaker/style-lock.md` if
visual. Bounded by SHAPE, not length — see the `handoff.md` subsection of "Document protocol" in
`project.md` before editing. Never measure this file; over a cap, delete or merge a whole item.

**Last updated:** 2026-09-01

## Where we are

- **`main` is pushed and clean**, four commits ahead of where the editability pass started, deploying to
  `gcc-landscape.vercel.app`. Working tree is empty. No SHA here on purpose — it goes stale on the next
  commit, including the one that rewrites this file.
- **Five collections moved from code into the dataset**, so a wording or list change is a publish rather
  than a deploy: `siteContent.copy` (29 static strings), `commonFunctions`, `logos`,
  `taxonomy.pinnedIndustries`, `taxonomy.cityCoordinates`. Derived sentences and three load-bearing
  strings deliberately stay in code — see project.md, "the line between an editable string and a code one".
- **`charts-data.test.ts` proves every chart follows its data** — 34 cases that mutate the dataset and
  require the mark to move, plus a canary in every gated slot that reaches no tab.
- **Admin nav is grouped Public screens / Data / Release**, routes unmoved, and `AdminPageHeader` +
  `AdminSection` replace fifteen hand-rolled copies. The metric editor gained an `atLeast` toggle and
  advisory notices for the three label-keyed couplings.
- **Full gate GREEN:** `tsc`, 644 Vitest, **196/196 Playwright**, `data:verify` clean, `brand:lint` clean.

## Next action

1. **Confirm the deploy is live and read both screens at 1440, 768 and 390.** Nothing in this session was
   looked at in a browser by a human. Also unread: the grouped admin nav at 768, the copy editor's four
   groups, the taxonomy rows' new pin toggle and lat/lon form.
2. **A live PREVIEW of the public screens from the draft is the one part of the ask not built.**
   `screen1.ts` is client-safe so the peer view can render from the draft directly; Screen 2 needs a
   server action because `screen2.ts` imports the `server-only` gate, which must stay.
3. **Replace the two placeholder figures** — blocked item 1, and the only thing on that list that must
   not ship as is.
4. **`.impeccable/critique/` is an orphaned artifact** — delete the directory or accept it as a local
   read-only record.

## Blocked / needs the user

1. **MUST NOT SHIP AS IS — two placeholder figures at 10%, live on `main`.** India operating cost
   growth and workplace cost growth (finance summary row). Replace under Metrics → Finance, **and
   replace the `PLACEHOLDER` marker with the number** — a unit test pins the marker.
2. **Rotate the admin password** (shared in a transcript). `npm run admin:hash`, set
   `ADMIN_PASSWORD_HASH`, redeploy. Calendar the `GCC_GITHUB_TOKEN` expiry.
3. **The Screen 2 pass wants ANSR sign-off as a whole** — twelve retitled metrics, the four removed
   summary headings, the removed HR/Ops section headings, the deleted floor sentence, and "Other
   sciences" dropped from the discipline split.
4. **Deleting the sealed group means a visitor is never told a figure is being withheld.** Four gated
   metrics render nothing at all; restoring the signal is one section per tab.
5. **The industry re-homes + tags want ANSR sign-off** — 26 moves; table in
   `scripts/business-type-map.ts`, summary in `docs/data-audit.md`.
6. **38 companies stay untagged, 6 business types single-member, `avi-services` empty** — honest thin
   spots, not defects; they need a real second company from a future batch.
7. **Every peer-split's finer categories want ANSR sign-off** — payments, BFSI fund servicers,
   Software localization/content, pharma consumer-health.
8. **Moderat is still not on the page.** `Moderat-Light.woff` and `-Regular.woff` are on disk under
   `public/fonts/` but **gitignored and unwired**: the licence for an embedded tool is unsettled, and
   Light + Regular alone would synthesise every Bold heading. Needs a licensed woff2 set with Medium
   and Bold, then Moderat at the front of `--ansr-font-display`.
9. **Five composed-tab asks are not drawn, each asserted absent** — four on finance, one on
   operations. See style lock, "the composed tabs' refusals".
10. **Industry / sub-industry NAMING** — `BFSI`, `Healthcare & Lifescience`, `Architecture,
    Engineering, & Construction` are taxonomy-editor work that cascades into companies and
    `business-type-map.ts` keys.
11. **Kept, tested, rendered nowhere** — Screen 2's six sentences, `FIN_DRIVERS_INSIGHT`,
    `FIN_FIGURES_QUALIFIER`, `FLOOR_NOTE`; Screen 1's `LARGEST_LEAD`, `peerLead`, provenance removals.
    Plus: India outline sign-off (three places), the palette anchors.
12. **Two changed figures need ANSR's eye** — professionals moved 1.06M→1.69M; the snapshot share is
    computed over a different population.

## Traps worth remembering

**`docs/traps.md`** — read it before touching the test suite, the dev server, the metric catalogue, or
anything that renders. Five that would cost the most time:

- **Never touch `.next/` while a dev server holds it.** Every request then 500s with
  `TurbopackInternalError` and does not recover. Kill both processes, `rm -rf .next`, restart.
- **A new admin label that CONTAINS an existing one breaks every spec locating the shorter one.**
  `getByLabel` matches a substring; "Figures are a floor" collided with the scalar field's "Figure" and
  took four `4-metrics.spec.ts` locators down. It is "Shown as a floor" for that reason.
- **A figure and its unit are two elements** in one flex line, so `innerText` puts a line break between
  them. Locate with `getByText("8.7M+")`; a `toContain` against `innerText` fails.
- **`npx playwright test` does not rebuild the fixture** — only `npm run test:browser` runs `prepare.ts`
  and regenerates `tests/browser/.tmp/dataset.json` from `data/dataset.json`.
- **A metric TITLE is load-bearing in three places** — the public card or cell, the shared-title
  invariant in `metrics.test.ts`, and admin's `Edit {title}, {area}` button that `4-metrics.spec.ts`
  clicks. Renaming one and running only the public spec passes and breaks seven admin tests.
