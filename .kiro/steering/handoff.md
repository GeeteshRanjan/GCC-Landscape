# Handoff — current state

State and pointers only. Reasoning lives in `project.md` if durable or `.tastemaker/style-lock.md` if
visual. Bounded by SHAPE, not length — see the `handoff.md` subsection of "Document protocol" in
`project.md` before editing. Never measure this file; over a cap, delete or merge a whole item.

**Last updated:** 2026-09-04

## Where we are

- **`main` is at `c7d841c` and pushed; the containment pass is UNCOMMITTED on top of it.** Twelve tracked
  files: `schema.ts`, `diff.ts`, `dataset.json`, `globals.css`, `charts.tsx`,
  `screen1/{copy,evidence,peer-view}.tsx`, `admin/{draft-provider,site-content-manager}.tsx`, plus
  `project.md`, the style lock and four test files.
- **What that pass did:** the containment chart's inner layers square their top-leading corner while the
  stack keeps its own, and the block closes on a 12px basis line, `copy.industryBasisNote`. Rules in
  `project.md`, rejected alternatives in the style lock.
- **`siteContent.copy` is 69 keys — 63 flat and 6 templates — and `STORAGE_KEY` is at v8.** The basis line
  is the 69th; it shipped in code for one pass and is editable at the owner's decision.
- **Verified on this tree: `tsc`, 741 unit tests, `brand_lint`, `data:verify`, and the full 210-spec
  browser suite.** `dataset.json` self-diffs empty and an older dataset missing the new key still reads.
- **Workspace state:** servers stopped, ports 3000/3210/3400 free, `.next` holds a fixture-env build. Four
  untracked artifacts stay uncommitted — `probe-mobile.mjs`, two mobile-review markdown files and
  `untitled folder/`. The peer-view variant harness is live and unmerged (`peers-variants.tsx`,
  `/variants`, `variant-harness.tsx`; candidates in `.tastemaker/peers-candidates.md`).

## Next action

1. **Commit and push the containment pass**, then watch the Vercel build — `gcc-landscape.vercel.app` is
   the only publicly reachable deployment, and this touched the schema, `dataset.json` and the admin.
2. **Owner is deciding between peer treatments B and G. Do not merge either until told.** On the word:
   fold the winner into `peer-view.tsx` / `evidence.tsx` and delete the harness and every supporting edit
   it does not use. Both candidates predate all three phone rounds and need the ranking row's grid,
   `.gcc-peer-facts` and the phone paddings carried in.
3. **G needs two answers before it can ship** — a Fortune recolour grant or the badge off the dark region,
   and a decision on dark-ink company logos, which vanish on teal-deep. `plate` (I) is the built answer to
   both if they block G.
4. **Re-check whether the peer marks render.** Two probes of the same local build disagreed; `curl` still
   302s to the hotlinking guidelines under three referrers. Settle which is true before acting on blocked
   item 2.

## Blocked / needs the user

1. **B or G, and G's two grants.** Reasoning and both cards' source: `.tastemaker/peers-candidates.md`.
2. **Whether the provider mark tier works at all.** `COMPANY_MARKS` is empty by decision, so the peer
   sections draw from the provider or from nothing; the condition a committed mark must meet is in
   `project.md`. Read next action 4 before assuming it is broken.
3. **Whether the basis line's wording rule should be enforced by the SCHEMA.** Today it is a unit test on
   the shipped value plus an admin hint, so an edit reading "figures are approximate" would publish. A
   `.refine` is the hard version; it is a one-line change and a product call.
4. **The count line's arrow is `--ansr-action` on the MINT ground at 2.63:1**, under the 3:1 floor for a
   graphical control, where its own note claims a white ground at 3.4:1. The fix is a zone ground or a
   colour, both design calls.
5. **Capability grid: every "Very strong" is India's column,** so the depth-by-rating teal is
   indistinguishable from the emphasis ANSR removed. Accept, revert, or supply ratings where another hub
   reaches the top step. Style lock has the argument.
6. **Two trademark questions the customer clearance does NOT cover** — the Fortune badge (Fortune routes
   through PARS International) and the provider tier (would resolve a logo for any of the 1,834).
7. **Three requested labels ship naming the INDUSTRY where ANSR asked for the sub-industry** — snapshot
   city count, leading city, locations heading. All industry-scoped; narrowing is a data change. Style lock
   records it.
8. **MUST NOT SHIP UNEXAMINED — the ANSR rail's four months (4, 8, 16, 24).** `ANSR_MONTHS` in
   `screen2/milestone-card.tsx`. A marketing claim the dataset does not hold.
9. **MUST NOT SHIP AS IS — five figures the data does not support.** Three PROVISIONAL latency figures
   (Middle East 50, Singapore 70, US West 230) on `ops-network-latency`, named in the note and
   `docs/data-audit.md`; and two 10% placeholders, "Increase in operating costs, YoY" and "Increase in
   workplace costs, YoY", replaced under Metrics → Finance with the `PLACEHOLDER` marker swapped.
10. **Rotate the admin password** (shared in a transcript): `npm run admin:hash`, set
    `ADMIN_PASSWORD_HASH`, redeploy. Calendar the `GCC_GITHUB_TOKEN` expiry.
11. **ANSR sign-off backlog, as a set:** the hero rewrite and drawn product name; all three phone rounds,
    including the result band losing its motif and lattice, the answer pills going undrawn there, and the
    phone map's names costing type size to name every ranked city; the `Delhi NCR` rename; the strip going
    to twenty-two marks; Screen 2's metric rewordings, salary rows/renames/notes, capability grid losing
    India emphasis; the taxonomy 26 industry re-homes, tags and peer splits (tables in
    `scripts/business-type-map.ts`, summary in `docs/data-audit.md`); the peer-view visual pass; and the
    containment chart's new basis line, which reverses a provenance removal ANSR asked for.
12. **Deleting the sealed group means a visitor is never told a figure is withheld.** Four gated metrics
    render nothing; restoring the signal is one section per tab. Plus the honest thin spots — 38 untagged
    companies, 6 single-member business types, `avi-services` empty — which need a future data batch.

## Traps worth remembering

**`docs/traps.md`** — read it before touching the test suite, the dev server, the metric catalogue, or
anything that renders. Five that would cost the most time:

- **A NEW COPY KEY IS FIVE EDITS, NOT ONE.** Schema and default, `PUBLIC_COPY_LABELS`, the admin group, a
  line in `data/dataset.json`, and `STORAGE_KEY` plus `DRAFT_STORAGE_KEY` — the merge makes both the diff
  and the draft shape check blind, so a missed bump publishes shipped values as approved edits.
- **A JSX comment cannot sit in an ATTRIBUTE position.** `{/* … */}` between attributes on an opening tag
  is a syntax error, so a note about one `className` goes above the element.
- **`getByLabel` MATCHES ON SUBSTRING, AND AN OPEN POPUP ADDS A SECOND MATCH** — the industry tree's own
  label is `askIndustryPlaceholder`, shipping as "Choose your industry", so `getByLabel("Industry")` is
  strict-mode ambiguous once open. Locate the trigger by role.
- **Never touch `.next/` while a dev server holds it**, and never run two dev servers on one `distDir` —
  every request then 500s. Playwright leaves port 3210 held after a killed run: `lsof -ti:3210 | xargs kill
  -9`, and `npx playwright test` does NOT rebuild the fixture. Overriding `distDir` makes `next dev` AND
  `next build` rewrite `tsconfig.json`'s `include` — revert it.
- **`data/dataset.json` ON DISK IS NOT WHAT `serializeDataset` PRODUCES** — the committed file escapes
  non-ASCII as `\uXXXX` and `JSON.stringify` does not, so any parse-and-rewrite of it reports a whole-file
  diff. Edit it by line, never by round trip, until a publish normalises it.
