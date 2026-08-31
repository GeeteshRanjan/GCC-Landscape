# Handoff — current state

State and pointers only. Reasoning lives in `project.md` if durable or `.tastemaker/style-lock.md` if
visual. Bounded by SHAPE, not length — see the `handoff.md` subsection of "Document protocol" in
`project.md` before editing. Never measure this file; over a cap, delete or merge a whole item.

**Last updated:** 2026-08-31

## Where we are

- **`main` is in sync with `origin/main` and the tree is clean** — the composed Screen 2 tabs, dropdown
  search, dataset re-tag, and this session's payments split are all committed and pushed.
  `gcc-landscape.vercel.app` deploys from `main`.
- **Peer buckets that CONFLATE distinct businesses are being split, one bucket per batch, as a
  self-perpetuating loop driven entirely by `docs/peer-split-playbook.md`.** The human pastes ONE fixed
  trigger line each session (in the playbook's "How you use this"); the file carries the append-only
  Completed log, the queue, and the self-replacing "Current batch prompt". It stops on its own. Method:
  `docs/business-types.md`, "Splitting a bucket…". Tools: `scripts/analyze-conflation.ts`,
  `scripts/measure-peers.ts`.
- **Batch 1 DONE: `fin-payments` → four types** (processing/gateways kept the id, plus card-network,
  money-transfer, expense-cards). Processing visitor now sees processors not card networks; Adyen rank
  16→3 at its band. Guardrails held (short sets 154→154, floor-shortened 147, coherence 0.921→0.918).
  Splits are world-knowledge, not in the source — they want ANSR sign-off.
- **Verified before push:** `tsc`, `brand_lint.py` clean, **557** Vitest, **194** Playwright,
  `data:verify` accepted (only 158→161 types moved). Draft `STORAGE_KEY` unchanged at **v4**.

## Next action

1. **Run the next split batch:** paste the one-line trigger from `docs/peer-split-playbook.md` ("How you
   use this") into a fresh session. It currently targets `fin-asset-management` (split fund-services /
   custody out from asset managers) and self-updates through the queue (`sw-it-services`, `hc-pharma`,
   `auto-components`) then a one-time ≥15-member sweep, then declares itself complete.
2. **Read all four function tabs at 768, and HR at 390.** Also unread on a render: the summary row at
   one column, the reworked dropdown and its filter on touch, the unblurred result-band map at 1440 and
   1920, the milestone pair at 1024, the finance table's own scroll container, the industry cascade at
   1366, the containment marker, the capability grid's new key at 768.
3. **`.impeccable/critique/` is an orphaned artifact** — the skill is gone. Delete the directory or
   accept it as a local read-only record.

## Blocked / needs the user

1. **MUST NOT SHIP AS IS — two placeholder figures at 10%, already live on `main`.** India operating
   cost growth and India workplace cost growth, the second and third cells of the finance summary row at
   36/48px in orange. Replace from admin under Metrics → Finance, **and replace the `PLACEHOLDER` marker
   with the number** — a unit test pins the marker.
2. **Rotate the admin password** — shared in a chat transcript, deployment publicly reachable. The only
   item with live exposure. `npm run admin:hash`, set `ADMIN_PASSWORD_HASH`, redeploy. Also unset:
   `NEXT_PUBLIC_GCC_CTA_URL`, `NEXT_PUBLIC_GCC_FRAME_TARGET_ORIGIN`. And calendar the `GCC_GITHUB_TOKEN`
   expiry — on lapse, publishing 401s months later and reads like a bug.
3. **Every split's finer categories want ANSR sign-off** — which companies are card networks vs
   acquirers vs money transfer vs expense cards (and, next, asset managers vs fund services) is world
   knowledge, not in the source.
4. **Moderat is not on the page.** No licensed files in the repo, so `--ansr-font-display` resolves to
   Hanken Grotesk. Drop woff2 under `public/fonts/` and put Moderat at the front of the token.
5. **Five asks are not drawn, each asserted absent by a spec** — four on finance, one on operations
   ("0 days lost to disruption" is not in this dataset; the cell states the real extent). Three need a
   figure or source from ANSR. See the style lock appendix, "the composed tabs' refusals".
6. **Four data decisions the spreadsheet cannot answer**, all in `docs/data-audit.md`: `avi-services` is
   a selectable sub-industry with no companies (all seven Aviation entries are airlines); three
   duplicate-looking pairs (Astera Labs, IQ-EQ, STATS Perform) are kept as separate rows; `Scotland`
   sits in the HQ list beside `UK`; `Vishakhapatnam` is spelled non-standardly and must agree with
   `geo.ts`.
7. **Industry and sub-industry NAMING.** `BFSI` is the only abbreviation among 23 spelled-out
   industries, `Healthcare & Lifescience` is not a word, and `Architecture, Engineering, & Construction`
   has a comma before the ampersand — all three cascade into every company and into
   `business-type-map.ts`'s keys, so they are taxonomy-editor work. Separately: industries are Title
   Case and sub-industries sentence case.
8. **Two changed figures need ANSR's eye before they ship.** The professionals figure moved from 1.06M
   to 1.69M, a published number they have seen; and the snapshot's share is now computed over a
   different population. Both are corrections and both are visible.
9. **Three sign-offs:** Screen 2's figures as publishable (five provisional — item 1),
   `COMMON_FUNCTIONS` wording, and the business types per industry — now including the 26 re-tagged
   companies and the payments split in `docs/business-types.md`. Ten logos in place, more coming.
10. **Sign off drawing India's outline at all, in three places** — the ask hero's dotted silhouette, the
    same map on both result bands, the locations map's filled outline. Invariant 8 states the position.
    Plus: **neither screen has a CTA**, the five reference departures in the style lock, and the palette
    anchors. Offer to collapse `#072228` vs `--ansr-teal-deep` to one token.
11. **Kept, tested and rendered nowhere.** Screen 2, six sentences; Screen 1, `LARGEST_LEAD`,
    `industrySentence`'s exhaustive branch, `peerLead`, `largestCountLine`, plus three provenance
    removals. Each is one prop to restore. **No metric sets `asOf`**, so no tab states provenance.
12. **Three brand asks shipped rather than held:** orange on display figures and eyebrows rather than
    CTAs only; "once per band" meaning one orange role; `--ansr-orange-700` as a token. Plus one warm
    BAR. Still pending: a functional red, `#B3505B` the verified candidate.

## Traps worth remembering

**`docs/traps.md`** — read it before touching the test suite, the dev server, the metric catalogue, or
anything that renders. Five that would cost the most time:

- **A split needs `--reseed-business-types` to adopt the catalogue**, and every new type needs
  `search-terms.ts` entries (a unit test asserts coverage) plus updated count assertions in `docs/` and
  browser specs. The distinguisher atom must be RARE in the industry — a common one like `b2c` orders
  correctly only at the finer type's own band.
- **Never touch `.next/` while a dev server holds it.** Every request then 500s with
  `TurbopackInternalError` and does not recover. Kill both processes, `rm -rf .next`, restart.
- **A figure and its unit are two elements** in one flex line, so `innerText` puts a line break between
  them. Locate with `getByText("8.7M+")`; a `toContain` against `innerText` fails.
- **`npx playwright test` does not rebuild the fixture** — only `npm run test:browser` runs `prepare.ts`.
  It also fails outright while a previous run holds port 3210, and its `webServer` runs a full typecheck.
- **A spec numbered outside every project's `testMatch` silently never runs.** `0-*` is the `public`
  project; a scratch spec must be named into one to execute at all.
