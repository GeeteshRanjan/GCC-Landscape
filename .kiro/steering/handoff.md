# Handoff — current state

State and pointers only. Reasoning lives in `project.md` if durable or `.tastemaker/style-lock.md` if
visual. Bounded by SHAPE, not length — see the `handoff.md` subsection of "Document protocol" in
`project.md` before editing. Never measure this file; over a cap, delete or merge a whole item.

**Last updated:** 2026-09-03

## Where we are

- **UNCOMMITTED on `main`,** many stacked passes in the working tree. Newest is a peer-view UX + search
  pass: cities prominence-ordered (`orderCitiesByProminence` in `derive.ts`) and capped with a rounded
  "+N" disclosure pill (comparison cards max 2, ranking rows max 3, hover `title` + click to expand) in
  `evidence.tsx`; the containment "shown above" marker now takes the bars' trailing radius; the count-line
  arrow is a head-only right-facing `ChevronRight`; search folds apostrophes (`L'Oréal`→`loreal`) and
  prefixes short tokens in every position. Verified `tsc` + unit + `brand_lint` clean; `next build` and the
  browser suite NOT run this session.
- **THE CUSTOMER STRIP CARRIES TWENTY-TWO MARKS and that is the only place the new logos are used.**
  `public/logos/`, each cropped to ink bounds by `npm run logo:crop`. Schema cap 24; admin picker lists all.
- **THE PEER AND LARGEST-GCC SECTIONS ARE REVERTED to their pre-logo look, and `COMPANY_MARKS` is EMPTY by
  decision.** The mark tier is still wired end to end so one table entry restores it; the condition a
  committed mark must meet first is in `project.md`.
- **NINE candidate treatments of the peers section exist; B `authority` and G `reverse` are the shortlist
  and NOTHING is merged.** Record in `.tastemaker/peers-candidates.md`; live code in `peers-variants.tsx`,
  harness on port 3400. **Both dev servers are running, on `.next` and `.next-variants`, and
  `.next-variants/` is untracked** — gitignore or delete it before staging.

## Next action

1. **Stop BOTH dev servers, run `next build`, then `npm run test:browser`.** Unverified by the suite:
   the new city "+N" pills, the head-only arrow, plus the earlier hero/ATLAS-wordmark/CTA-links passes.
   `0-search.spec.ts` drives the dropdown filter — confirm the short-token-prefix change did not shift its
   expectations.
2. **Owner is deciding between B and G. Do not merge either until told.** On the word: fold the winner into
   `peer-view.tsx` / `evidence.tsx`, delete `peers-variants.tsx`, `/variants`, `variant-harness.tsx` and
   every supporting edit the winner does not use.
3. **G needs two answers before it can ship** — a Fortune recolour grant or the badge moved off the dark
   region, and a decision on dark-ink company logos, which vanish on teal-deep. `plate` (I) is the built
   answer to both if they block G.
4. **Decide whether the `impeccable` devDependency belongs in the repo at all** — a caret range against the
   exact-pin rule. Pin it exactly or remove it before any of this is committed.

## Blocked / needs the user

1. **B or G, and G's two grants.** Reasoning and both cards' source: `.tastemaker/peers-candidates.md`.
2. **THE PEER SECTIONS DRAW NO COMPANY MARKS AT ALL, because the Brandfetch client ID is rejected** —
   every `cdn.brandfetch.io` request 302s to their hotlinking guidelines, across three referrers and with
   no id. Either settle it with the provider, or letterbox committed marks onto the resolver's own box and
   repopulate `COMPANY_MARKS`; `project.md` has the condition.
3. **The per-SET mark reservation.** Every candidate treatment reserves the mark's band only when some peer
   in the set has one, where the shipped card reserves per card. It changes a rule the owner set.
4. **Capability grid: every "Very strong" is India's column,** so the depth-by-rating teal is
   indistinguishable from the emphasis ANSR removed. Accept, revert, or supply ratings where another hub
   reaches the top step. Style lock has the argument.
5. **Two trademark questions the customer clearance does NOT cover** — the Fortune badge (Fortune routes
   through PARS International) and the provider tier (would resolve a logo for any of the 1,834).
6. **Three requested labels ship naming the INDUSTRY where ANSR asked for the sub-industry** — snapshot
   city count, leading city, locations heading. All industry-scoped; narrowing is a data change. Style lock
   records it.
7. **MUST NOT SHIP UNEXAMINED — the ANSR rail's four months (4, 8, 16, 24).** `ANSR_MONTHS` in
   `screen2/milestone-card.tsx`. A marketing claim the dataset does not hold.
8. **MUST NOT SHIP UNEXAMINED — three PROVISIONAL latency figures** (Middle East 50, Singapore 70, US West
   230) on `ops-network-latency`; named in the note and `docs/data-audit.md`.
9. **MUST NOT SHIP AS IS — two 10% placeholder figures**, "Increase in operating costs, YoY" and "Increase
   in workplace costs, YoY". Replace under Metrics → Finance and swap the `PLACEHOLDER` marker.
10. **Rotate the admin password** (shared in a transcript): `npm run admin:hash`, set `ADMIN_PASSWORD_HASH`,
    redeploy. Calendar the `GCC_GITHUB_TOKEN` expiry.
11. **ANSR sign-off backlog, as a set:** the hero rewrite and drawn product name; the mobile map as texture
    below `lg`; the strip going to twenty-two marks; Screen 2's metric rewordings, salary rows/renames/notes,
    capability grid losing India emphasis, retitled metrics; and the taxonomy 26 industry re-homes, tags and
    peer splits (tables in `scripts/business-type-map.ts`, summary in `docs/data-audit.md`).
12. **Deleting the sealed group means a visitor is never told a figure is withheld.** Four gated metrics
    render nothing; restoring the signal is one section per tab. Plus the honest thin spots — 38 untagged
    companies, 6 single-member business types, `avi-services` empty — which need a future data batch.

## Traps worth remembering

**`docs/traps.md`** — read it before touching the test suite, the dev server, the metric catalogue, or
anything that renders. Five that would cost the most time:

- **Never touch `.next/` while a dev server holds it**, and never run two dev servers on one `distDir` —
  every request then 500s. Two are running now, on `.next` and `.next-variants`. Playwright leaves port
  3210 held after a killed run: `lsof -ti:3210 | xargs kill -9`, and `npx playwright test` does NOT rebuild
  the fixture. Overriding `distDir` makes `next dev` AND `next build` rewrite `tsconfig.json`'s `include` —
  revert it.
- **THE MARK TIER LIES TWICE OVER, so believe neither the local render nor an absent logo.** `.env.local`
  sets the client ID, so a local dev server has the tier ON while production ships it OFF, and the ID is
  currently REJECTED so a mark that will not draw is the CDN 302, not the card. Blank the var on its own
  `GCC_DIST_DIR` to see the shipped state; `curl` the CDN before debugging a component.
- **WHILE A RADIX DIALOG IS OPEN OR CLOSING, EVERY ROLE QUERY AGAINST THE PAGE BEHIND IT RETURNS NOTHING** —
  the rest of the document is `aria-hidden` and `getByRole` honours it. Wait for `[role="dialog"]` to
  detach, or locate by tag. More probe traps beside it in `docs/traps.md`.
- **30px IS NOT AVAILABLE for a peer card's headcount figure at five columns** — "22,100–22,200" wraps to
  two lines in a 205px card. A louder figure needs a different ground, ratio, or a full-width row.
- **A SPEC IS COUPLED TO CONTENT IN MORE PLACES THAN THE RENDER PATH.** A hero title lives in
  `dataset.json`, `DEFAULT_SITE_CONTENT` and every spec naming it; `getByLabel` matches on SUBSTRING, so a
  new admin field can break a spec naming an old one. Grep on every content pass.
