# Handoff — current state

State and pointers only. Reasoning lives in `project.md` if durable or `.tastemaker/style-lock.md` if
visual. Bounded by SHAPE, not length — see the `handoff.md` subsection of "Document protocol" in
`project.md` before editing. Never measure this file; over a cap, delete or merge a whole item.

**Last updated:** 2026-08-31

## Where we are

- **`main` is at `8d6cccb`, in sync with `origin/main`, with twenty-six passes uncommitted in one
  tree.** `gcc-landscape.vercel.app` carries none of it.
- **Peer quality, two passes.** First the discovery fix — a reported bad peer set was a FINDABILITY
  failure, `search-terms.ts` + `search.ts` wired through `select-field.tsx`. Then the Stripe→Adyen
  DIAGNOSIS: a classification-GRANULARITY issue, not scoring — `fin-payments` conflates card networks,
  acquirers/gateways, money-transfer and expense-card businesses under one identical tag set, so the
  engine ranks within it by band then size only. `tests/unit/peer-resolution.test.ts` (7) pins it; the
  fix is not yet made. Rules in `project.md`, measurements in `docs/data-audit.md`.
- **`data/dataset.json` was re-imported: 26 companies re-tagged, 13 names corrected.** Five of six
  empty sub-industries were mapping errors in `scripts/business-type-map.ts`; `businessTypes` joined
  `COMPANY_FIELDS` in `diff.ts`, without which the whole pass reported "no company changes".
  `verify-baseline.json` accepted, both docs brought in line.
- **THREE OF FOUR TABS ARE COMPOSED** — `hr-view.tsx`, `ops-view.tsx`, `fin-view.tsx`, each selecting
  by metric id. Technology is the only tab the derivation draws. Reference renders are at the repo root.
- **Verified this session:** `tsc`, `brand_lint.py` clean, **554** Vitest, **194** Playwright. Draft
  `STORAGE_KEY` unchanged at **v4**.

## Next action

1. **Commit twenty-six passes in one go**, including `data/dataset.json`, `data/verify-baseline.json`,
   `docs/`, the three composed tab files, the six `screen2/` files, the two `src/data/search*` modules,
   `tests/unit/peer-resolution.test.ts`, the other new spec files and the steering restructure.
   `.kiro/skills/` is gitignored, so the 135-skill deletion shows only as context.
2. **Split `fin-payments` into finer sub-industries** — card-networks / acquirers-gateways /
   money-transfer / expense-cards — to fix the peer-match granularity. Code+data: new `BUSINESS_TAGS`,
   `business-type-catalogue.ts`, ~20 companies re-mapped in `business-type-map.ts`, re-import. Needs
   ANSR sign-off on the categories. Diagnosis in the peer-resolution test and `project.md`.
3. **Read all four function tabs at 768, and HR at 390.** Also unread on a render: the summary row at
   one column, the reworked dropdown and its filter on touch, the unblurred result-band map at 1440 and
   1920, the milestone pair at 1024, the finance table's own scroll container, the industry cascade at
   1366, the containment marker, the capability grid's new key at 768.
4. **No browser spec covers the three defects fixed six passes ago** — the open dropdown's bounding
   box at three widths, the scroll offset unchanged across a tab switch, `scrollY === 0` after submit.
5. **`.impeccable/critique/` is an orphaned artifact** — the skill is gone. Delete the directory or
   accept it as a local read-only record.

## Blocked / needs the user

1. **MUST NOT SHIP AS IS — two placeholder figures at 10%.** India operating cost growth and India
   workplace cost growth, the second and third cells of the finance summary row at 36/48px in orange.
   Replace from admin under Metrics → Finance, **and replace the `PLACEHOLDER` marker with the number** —
   a unit test pins the marker.
2. **Rotate the admin password** — shared in a chat transcript, deployment publicly reachable. The only
   item with live exposure. `npm run admin:hash`, set `ADMIN_PASSWORD_HASH`, redeploy. Also unset:
   `NEXT_PUBLIC_GCC_CTA_URL`, `NEXT_PUBLIC_GCC_FRAME_TARGET_ORIGIN`. And calendar the `GCC_GITHUB_TOKEN`
   expiry — on lapse, publishing 401s months later and reads like a bug.
3. **Moderat is not on the page.** No licensed files in the repo, so `--ansr-font-display` resolves to
   Hanken Grotesk. Drop woff2 under `public/fonts/` and put Moderat at the front of the token.
4. **Five asks are not drawn, each asserted absent by a spec** — four on finance, one on operations
   ("0 days lost to disruption" is not in this dataset; the cell states the real extent). Three need a
   figure or source from ANSR. See the style lock appendix, "the composed tabs' refusals".
5. **Four data decisions the spreadsheet cannot answer**, all written up in `docs/data-audit.md`:
   `avi-services` is a selectable sub-industry with no companies (all seven Aviation entries are
   airlines) — drop the row or source companies; three duplicate-looking pairs (Astera Labs, IQ-EQ,
   STATS Perform) are kept as separate rows; `Scotland` sits in the HQ list beside `UK`;
   `Vishakhapatnam` is spelled non-standardly and must agree with `geo.ts`.
6. **Industry and sub-industry NAMING.** `BFSI` is the only abbreviation among 23 spelled-out
   industries, `Healthcare & Lifescience` is not a word, and `Architecture, Engineering, &
   Construction` has a comma before the ampersand — all three cascade into every company and into
   `business-type-map.ts`'s keys, so they are taxonomy-editor work. Separately: industries are Title
   Case and sub-industries sentence case, so the trigger reads "Retail · Apparel & footwear brand".
7. **Two changed figures need ANSR's eye before they ship.** The professionals figure moved from 1.06M
   to 1.69M, a published number they have seen; and the snapshot's share is now computed over a
   different population. Both are corrections and both are visible.
8. **Three sign-offs:** Screen 2's figures as publishable (five are provisional — item 1),
   `COMMON_FUNCTIONS` wording, and the business types per industry — now including the 26 re-tagged
   companies listed in `docs/business-types.md`. Ten logos in place, more coming.
9. **Sign off drawing India's outline at all, in three places** — the ask hero's dotted silhouette, the
   same map on both result bands, the locations map's filled outline. Invariant 8 states the position.
   Plus: **neither screen has a CTA**, the five reference departures in the style lock, and the palette
   anchors. Offer to collapse `#072228` vs `--ansr-teal-deep` to one token.
10. **Composed-tab deviations, settled here rather than open** — all three give up their 4px radius,
    single white ground and bespoke summary rows to the peer view's surface; the tier-spread rail is
    zero-based rather than the reference's 50-to-125. **"20.0%" for HR's "20%" is the one re-label still
    open.** And the derivation now has ONE live caller: a fourth composition request is a request to
    delete it.
11. **Kept, tested and rendered nowhere.** Screen 2, six sentences; Screen 1, `LARGEST_LEAD`,
    `industrySentence`'s exhaustive branch, `peerLead`, `largestCountLine`, plus three provenance
    removals. Each is one prop to restore. **No metric sets `asOf`**, so no tab states provenance.
    `scale.asOf` restores the date in one line.
12. **Three brand asks shipped rather than held:** orange on display figures and eyebrows rather than
    CTAs only; "once per band" meaning one orange role; `--ansr-orange-700` as a token. Plus one warm
    BAR. Still pending: a functional red, `#B3505B` the verified candidate.

## Traps worth remembering

**`docs/traps.md`** — read it before touching the test suite, the dev server, the metric catalogue, or
anything that renders. Five that would cost the most time:

- **Never touch `.next/` while a dev server holds it.** Every request then 500s with
  `TurbopackInternalError` and it does not recover. Kill both processes, `rm -rf .next`, restart.
- **A figure and its unit are two elements** in one flex line, so `innerText` puts a line break between
  them. Locate with `getByText("8.7M+")`; a `toContain` against `innerText` fails.
- **`#function-metrics ul > li` means "a figure-row cell" on all four tabs**, which is why finance's
  three tier-spread cards are a `div` of `div`s despite being a set.
- **`npx playwright test` does not rebuild the fixture** — only `npm run test:browser` runs `prepare.ts`.
  It also fails outright while a previous run holds port 3210, and its `webServer` runs a full typecheck.
- **A spec numbered outside every project's `testMatch` silently never runs.** `0-*` is the `public`
  project; a scratch spec must be named into one to execute at all.
