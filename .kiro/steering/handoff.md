# Handoff — current state

State and pointers only. Reasoning lives in `project.md` if durable or `.tastemaker/style-lock.md` if
visual. Bounded by SHAPE, not length — see the `handoff.md` subsection of "Document protocol" in
`project.md` before editing. Never measure this file; over a cap, delete or merge a whole item.

**Last updated:** 2026-09-05

## Where we are

- **`main` is at `4e70c56` and pushed. The phone hero map is now the desktop composition at the mobile
  crop** — `globals.css`, uncommitted, with the rule in `project.md` and the decision in
  `.tastemaker/style-lock.md`.
- **The mobile block overrides the frame and the two insets and nothing else; the mask is inherited.** Two
  values differ from desktop: `opacity: 0.58` against `0.86`, and a trailing inset putting India at 76% of
  the band against 75%. Both tables are in the `globals.css` block.
- **TWELVE OTHER FILES ARE MODIFIED AND ARE NOT FROM THIS SESSION** — `data/dataset.json`, `schema.ts`,
  `diff.ts`, `screen1/copy.ts`, `select-field.tsx`, `evidence.tsx`, two admin components, four test files.
  Reads as a copy-key pass or a live admin publish. Separate them before staging anything.
- **Verified on the hero change: `brand_lint` clean, contrast and India's ink measured at 320, 375, 390 and
  768, render read at all four plus 1440.** Not run — the browser suite, a dev server holding `.next`. No
  spec asserts this surface.
- **Workspace state:** a dev server is running on port 3000 against `.next`. Four untracked artifacts stay
  uncommitted — `probe-mobile.mjs`, two mobile-review markdown files and `untitled folder/`. The peer-view
  variant harness is live and unmerged (`peers-variants.tsx`, `/variants`, `variant-harness.tsx`; candidates
  in `.tastemaker/peers-candidates.md`).

## Next action

1. **Account for the twelve unexplained modified files before staging anything.** `git diff` each; the hero
   change is `globals.css` plus the two documents and nothing else.
2. **Commit the hero map change, then watch the Vercel build.** `gcc-landscape.vercel.app` is the only
   publicly reachable deployment.
3. **Run the browser suite when the dev server is next free**, which clears this change and the two fixes in
   `4e70c56` that no spec covers.
4. **Owner is deciding between peer treatments B and G. Do not merge either until told.** On the word: fold
   the winner into `peer-view.tsx` / `evidence.tsx` and delete the harness and every supporting edit it does
   not use. Both candidates predate all three phone rounds and need the ranking row's grid,
   `.gcc-peer-facts` and the phone paddings carried in.
5. **G needs two answers before it can ship** — a Fortune recolour grant or the badge off the dark region,
   and a decision on dark-ink company logos, which vanish on teal-deep. `plate` (I) is the built answer to
   both if they block G.

## Blocked / needs the user

1. **B or G, and G's two grants.** Reasoning and both cards' source: `.tastemaker/peers-candidates.md`.
2. **Whether the provider mark tier works at all.** `COMPANY_MARKS` is empty by decision, so the peer
   sections draw from the provider or from nothing; the condition a committed mark must meet is in
   `project.md`. Two probes of the same local build disagreed and `curl` still 302s to the hotlinking
   guidelines under three referrers — settle which is true before acting on this.
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
    including the phone hero map now reading as the desktop composition, the result band losing its motif
    and lattice, the answer pills going undrawn there, and the phone map's names costing type size to name
    every ranked city; the `Delhi NCR` rename; the strip going to twenty-two marks; Screen 2's metric
    rewordings, salary rows/renames/notes, capability grid losing India emphasis; the taxonomy 26 industry
    re-homes, tags and peer splits (tables in `scripts/business-type-map.ts`, summary in
    `docs/data-audit.md`); the peer-view visual pass; and the containment chart's new basis line, which
    reverses a provenance removal ANSR asked for.
12. **Deleting the sealed group means a visitor is never told a figure is withheld.** Four gated metrics
    render nothing; restoring the signal is one section per tab. Plus the honest thin spots — 38 untagged
    companies, 6 single-member business types, `avi-services` empty — which need a future data batch.

## Traps worth remembering

**`docs/traps.md`** — read it before touching the test suite, the dev server, the metric catalogue, or
anything that renders. Five that would cost the most time:

- **A NEW COPY KEY IS FIVE EDITS, NOT ONE.** Schema and default, `PUBLIC_COPY_LABELS`, the admin group, a
  line in `data/dataset.json`, and `STORAGE_KEY` plus `DRAFT_STORAGE_KEY` — the merge makes both the diff
  and the draft shape check blind, so a missed bump publishes shipped values as approved edits.
- **THE REMOTE MOVES WITHOUT A LOCAL COMMIT.** A live admin session publishes straight to
  `GeeteshRanjan/GCC-Landscape`, so `git push` can be rejected on a clean-looking tree; fetch and read the
  `data: publish from admin` commits before assuming a conflict.
- **A CONTRAST OR EDGE JUDGEMENT IS MEASURED, NEVER EYEBALLED, AND ON THE HERO BAND "DARKER" MEANS A LOWER
  OPACITY.** The limiting pixel under the copy is a map DOT lightening the ground, not the gradient, which
  is the reverse of the desktop reading. Sample with the ink hidden, and hide `nextjs-portal` first — the
  dev indicator reads as pure white over the card's bottom-leading corner at phone width.
- **A CAPS TRANSFORM CAN CORRUPT A WORD, AND `uppercase` IS ON EVERY EYEBROW ON BOTH SCREENS.** Read the
  drawn line, not the string: "GCCs" is the case that bites, and a new copy key routed to a small-caps
  label needs the same check.
- **Never touch `.next/` while a dev server holds it**, and never run two dev servers on one `distDir` —
  every request then 500s. Playwright leaves port 3210 held after a killed run: `lsof -ti:3210 | xargs kill
  -9`, and `npx playwright test` does NOT rebuild the fixture. Overriding `distDir` makes `next dev` AND
  `next build` rewrite `tsconfig.json`'s `include` — revert it.
