# Handoff — current state

State and pointers only. Reasoning lives in `project.md` if durable or `.tastemaker/style-lock.md` if
visual. Bounded by SHAPE, not length — see the `handoff.md` subsection of "Document protocol" in
`project.md` before editing. Never measure this file; over a cap, delete or merge a whole item.

**Last updated:** 2026-09-17

## Where we are

- **`main` is at `291f03b` and LIVE, but the tree is NO LONGER CLEAN** — this session's work is
  uncommitted and unpushed across roughly twenty-five files. Nothing is deployed yet.
- **The company-name input is removed end to end**, the peer heading is one flat key
  ("GCC details of your closest peers"), and the short-set line now leads the peer block above the cards.
  Rules in `project.md` under "Inputs — the contract" and the peer-heading block.
- **The form is three controls in two columns with industry spanning the first row**, which closed the
  empty cell the removal left. Rule in `project.md` beside the form grid.
- **Both wide dropdown panels were drawing off the leading edge of the card and are fixed**: `wide` is
  `"grid" | "column"` now rather than a boolean, and the offset moved to `.gcc-select-panel--reach`. Same
  cause as the empty cell — every control shifted one cell along. Rule in `project.md` under the panel block.
- **Verified: `tsc`, 742 unit tests, `brand_lint`, `data:verify`, an empty dataset self-diff at 67 copy
  keys, and a live pass at :3000** — four widths for the grid and all three panels, plus the snapshot
  eyebrow now drawing `SNAPSHOT OF … GCCs IN INDIA`.

## Next action

1. **Run the browser suite once the dev server frees `.next`, then commit.** It is the only cover for this
   session's spec rewrites and panel geometry, for the pointer-commit change in `291f03b`, and for the two
   fixes in `4e70c56`. `npm run test:browser` rebuilds the fixture; `helpers.ts` is at `gcc-admin-draft-v10`.
2. **Owner is deciding between peer treatments B and G. Do not merge either until told.** On the word: fold
   the winner into `peer-view.tsx` / `evidence.tsx` and delete the harness. Both candidates predate all three
   phone rounds AND this session, so they need the ranking row's grid, `.gcc-peer-facts`, the phone paddings
   and the shortfall line's new position carried in.
3. **G needs two answers before it can ship** — a Fortune recolour grant or the badge off the dark region,
   and a decision on dark-ink company logos, which vanish on teal-deep. `plate` (I) is the built answer to
   both if they block G.

## Blocked / needs the user

1. **B or G, and G's two grants.** Reasoning and both cards' source: `.tastemaker/peers-candidates.md`.
2. **Whether the visitor's own company should be excluded from its own peer set again.** It no longer is:
   the exclusion keyed on the typed name. Restoring it means asking for a name, which is the decision.
3. **Whether the provider mark tier works at all.** `COMPANY_MARKS` is empty by decision, so the peer
   sections draw from the provider or from nothing. Two probes of the same local build disagreed and `curl`
   still 302s to the hotlinking guidelines under three referrers — settle which is true before acting.
4. **Whether the basis line's wording rule should be enforced by the SCHEMA.** Today it is a unit test plus
   an admin hint, so an edit reading "figures are approximate" would publish. A `.refine` is the hard version.
5. **The count line's arrow is `--ansr-action` on the MINT ground at 2.63:1**, under the 3:1 floor for a
   graphical control, where its own note claims a white ground at 3.4:1. Fix is a zone ground or a colour.
6. **Capability grid: every "Very strong" is India's column,** so the depth-by-rating teal is
   indistinguishable from the emphasis ANSR removed. Accept, revert, or supply ratings where another hub
   reaches the top step. Style lock has the argument.
7. **Two trademark questions the customer clearance does NOT cover** — the Fortune badge (Fortune routes
   through PARS International) and the provider tier (would resolve a logo for any of the 1,834).
8. **Three requested labels ship naming the INDUSTRY where ANSR asked for the sub-industry** — snapshot
   city count, leading city, locations heading. All industry-scoped; narrowing is a data change.
9. **MUST NOT SHIP UNEXAMINED — the ANSR rail's four months (4, 8, 16, 24).** `ANSR_MONTHS` in
   `screen2/milestone-card.tsx`. A marketing claim the dataset does not hold.
10. **MUST NOT SHIP AS IS — five figures the data does not support.** Three PROVISIONAL latency figures
    (Middle East 50, Singapore 70, US West 230) on `ops-network-latency`; and two 10% placeholders,
    "Increase in operating costs, YoY" and "Increase in workplace costs, YoY", under Metrics → Finance.
11. **Rotate the admin password** (shared in a transcript): `npm run admin:hash`, set
    `ADMIN_PASSWORD_HASH`, redeploy. Calendar the `GCC_GITHUB_TOKEN` expiry.
12. **ANSR sign-off backlog, as a set:** the company-name removal with the new peer heading, the short-set
    line's move and the reshaped form; the hero rewrite and drawn product name; all three phone rounds,
    including the phone hero map, the result band losing its motif and lattice, the answer pills going
    undrawn there, and the phone map's names costing type size; the `Delhi NCR` rename; the strip going to
    twenty-two marks; Screen 2's metric rewordings, salary rows and the capability grid losing India
    emphasis; the taxonomy 26 industry re-homes, tags and peer splits; the peer-view visual pass; the
    containment chart's new basis line; and the sealed group's removal, which leaves a visitor never told a
    figure is withheld.

## Traps worth remembering

**`docs/traps.md`** — read it before touching the test suite, the dev server, the metric catalogue, or
anything that renders. Five that would cost the most time:

- **A RULE CARRIED IN A COMMENT INSTEAD OF A TYPE BREAKS SILENTLY WHEN THE LAYOUT MOVES.** The wide panel's
  offset was a boolean whose one valid position lived in prose, so removing a form field pushed two popups
  off the card with nothing failing. Same shape as a literal-token match: `withCasedGccPlural` was a no-op
  for as long as the datum said "GCCS", and the code read as though it worked.
- **A COPY KEY REMOVED IS AS DANGEROUS AS ONE ADDED, and `STORAGE_KEY` is the only instrument.** zod strips
  an unrecognised key, so a stale draft publishes cleanly with the string dropped and no diff entry. A
  template that becomes a flat field is worse: the old value still validates and draws its `{slot}` as
  literal text. Bump `draft-provider.tsx` AND `tests/browser/helpers.ts` together.
- **"I CANNOT SEE IT ON THE LIVE URL" IS USUALLY THE IMMUTABLE CSS CACHE OR A DESKTOP WINDOW**, not a failed
  deploy. Anything scoped below `lg` renders identically at desktop width. Verify by remote ref, then the
  deployed CSS, then computed style with a cache-buster.
- **THE REMOTE MOVES WITHOUT A LOCAL COMMIT.** A live admin session publishes straight to
  `GeeteshRanjan/GCC-Landscape`, so `git push` can be rejected on a clean-looking tree; fetch and read the
  `data: publish from admin` commits before assuming a conflict.
- **Never touch `.next/` while a dev server holds it**, and never run two dev servers on one `distDir`.
  Playwright leaves port 3210 held after a killed run: `lsof -ti:3210 | xargs kill -9`, and
  `npx playwright test` does NOT rebuild the fixture. `getByLabel("Industry")` is ambiguous once the popup
  is open — the trigger is `getByRole("combobox")`.
