# Handoff — current state

State and pointers only. Reasoning lives in `project.md` if durable or `.tastemaker/style-lock.md` if
visual. Bounded by SHAPE, not length — see the `handoff.md` subsection of "Document protocol" in
`project.md` before editing. Never measure this file; over a cap, delete or merge a whole item.

**Last updated:** 2026-09-17

## Where we are

- **`main` is at `732bbfb`, pushed and LIVE, and the tree is clean** apart from five untracked scratch
  files from an earlier session (`probe-mobile.mjs`, two mobile-review notes, `companies-export.csv`,
  `untitled folder/`). Nothing tracked is outstanding.
- **Pinned peer sets ship end to end** — `dataset.peerOverrides`, the `/admin/peer-overrides` page, the
  diff category and the cascades. Rules in `project.md` under "Peer matching".
- **Tags are admin-editable, bounded by `capCustomTagWeights`**, provably inert on today's data because
  every shipped tag is authored. Rules in `project.md` beside "TAGS ARE DATA NOW".
- **The broadened-set call-out ships on BOTH axes** — `broadenedLine` names when a full set reached past
  the visitor's sub-industry, revenue band (beyond ±1), or both, on one line. Mutually exclusive with
  `shortfallLine`. Rule in `project.md` under "Peer matching".
- **Admin UX pass**: `controls.tsx` is the one control recipe; `AdminField` moved every hint into
  `aria-describedby`; section cards and the nav gained hierarchy.

## Next action

1. **Look at `/admin/peer-overrides` and the broadened line on the deployed build before ANSR does.**
   Neither has been seen outside the browser suite. The candidate list is the part to judge — it draws
   the whole industry ranked, marks the five the engine would show, and marks what the floor rejected.
2. **Owner is deciding between peer treatments B and G. Do not merge either until told.** On the word,
   fold the winner into `peer-view.tsx` / `evidence.tsx` and delete the harness. Both candidates predate
   the phone rounds, the company-name removal and the recent sessions, so they need the ranking row's
   grid, `.gcc-peer-facts`, the phone paddings and the shortfall/broadened lines' position carried in.
3. **G needs two grants before it can ship** — a Fortune recolour or the badge off the dark region, and a
   decision on dark-ink company logos, which vanish on teal-deep. `plate` (I) is the built fallback.

## Blocked / needs the user

1. **B or G, and G's two grants.** Reasoning and both cards' source: `.tastemaker/peers-candidates.md`.
2. **Whether the visitor's own company should be excluded from its own peer set again.** It no longer is;
   the exclusion keyed on the typed name. Restoring it means asking for a name, which is the decision.
3. **Whether the provider mark tier works at all.** `COMPANY_MARKS` is empty by decision, the client ID is
   being rejected (302 to the hotlinking guidelines under three referrers), so the peer sections draw no
   marks. Settle whether the tier can work before acting.
4. **Whether the basis line's wording rule should be enforced by the SCHEMA.** Today a unit test plus an
   admin hint, so "figures are approximate" would publish. A `.refine` is the hard version.
5. **The count line's arrow is `--ansr-action` on the MINT ground at 2.63:1**, under the 3:1 floor, where
   its own note claims a white ground at 3.4:1. Fix is a zone ground or a colour.
6. **Capability grid: every "Very strong" is India's column,** so the depth-by-rating teal is
   indistinguishable from the emphasis ANSR removed. Accept, revert, or supply spanning ratings. Style lock.
7. **Two trademark questions the customer clearance does NOT cover** — the Fortune badge (routes through
   PARS International) and the provider tier (would resolve a logo for any of the 1,834).
8. **Three requested labels ship naming the INDUSTRY where ANSR asked for the sub-industry** — snapshot
   city count, leading city, locations heading. All industry-scoped; narrowing is a data change.
9. **MUST NOT SHIP UNEXAMINED — the ANSR rail's four months (4, 8, 16, 24).** `ANSR_MONTHS` in
   `screen2/milestone-card.tsx`. A marketing claim the dataset does not hold.
10. **Figures the data does not support, as a set:** three PROVISIONAL latency figures (Middle East 50,
    Singapore 70, US West 230) on `ops-network-latency`; two 10% finance placeholders; and from the 5 Sept
    admin publish, now cascaded but flagged — `ops-power-uptime` at 100/100 (stronger than the split card
    was built for) and `ops-disruption-days` at 0/0 (the zero is in the datum now, not just supplied).
11. **Rotate the admin password** (shared in a transcript): `npm run admin:hash`, set
    `ADMIN_PASSWORD_HASH`, redeploy. Calendar the `GCC_GITHUB_TOKEN` expiry.
12. **ANSR sign-off backlog, as a set:** pinned peer sets; admin-editable tags; the admin UX pass; the
    broadened-set call-out; the company-name removal with the new peer heading; the short-set line's move
    and reshaped form; the hero rewrite and drawn product name; all phone rounds; the `Delhi NCR` rename;
    the strip at twenty-two marks; Screen 2's rewordings, salary rows and the capability grid losing India
    emphasis; the taxonomy re-homes and peer splits; and the sealed group's removal, which leaves a visitor
    never told a figure is withheld.

## Traps worth remembering

**`docs/traps.md`** — read it before touching the test suite, the dev server, the metric catalogue, or
anything that renders. Five that would cost the most time:

- **THE REMOTE MOVES WITHOUT A LOCAL COMMIT.** A live admin session publishes straight to
  `GeeteshRanjan/GCC-Landscape`, so `git push` can be rejected on a clean-looking tree, and a publish can
  rename a metric or change a figure without cascading into `metric-catalogue.ts` or the specs — which
  reads as a red suite that is not your fault. Fetch and read the `data: publish from admin` commits first.
- **A RULE CARRIED IN A COMMENT INSTEAD OF A TYPE BREAKS SILENTLY WHEN THE LAYOUT MOVES**, and a
  LITERAL-TOKEN match is the same shape — `withCasedGccPlural` was a no-op while the datum said "GCCS".
- **A COPY KEY REMOVED IS AS DANGEROUS AS ONE ADDED, and `STORAGE_KEY` is the only instrument** (at v11
  now; `tests/browser/helpers.ts` owns `DRAFT_STORAGE_KEY` and moves with it). A defaulted new COLLECTION
  is the same trap — a stale draft publishes it away and reports an ordinary edit.
- **"I CANNOT SEE IT ON THE LIVE URL" IS USUALLY THE IMMUTABLE CSS CACHE OR A DESKTOP WINDOW**, not a
  failed deploy. Anything scoped below `lg` renders identically at desktop width.
- **Never touch `.next/` while a dev server holds it**; Playwright leaves port 3210 held
  (`lsof -ti:3210 | xargs kill -9`) and does NOT rebuild the fixture on `npx playwright test`.
  `getByLabel("Industry")` is ambiguous with the popup open (use `getByRole("combobox")`) and with
  "Sub-industry" on an admin form (use `{ exact: true }` — `getByLabel` matches on substring).
