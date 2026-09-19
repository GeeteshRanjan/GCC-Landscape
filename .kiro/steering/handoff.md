# Handoff — current state

State and pointers only. Reasoning lives in `project.md` if durable or `.tastemaker/style-lock.md` if
visual. Bounded by SHAPE, not length — see the `handoff.md` subsection of "Document protocol" in
`project.md` before editing. Never measure this file; over a cap, delete or merge a whole item.

**Last updated:** 2026-09-19

## Where we are

- **`main` is at `0051402`, nothing committed, the tree dirty** — the whole role map is still untracked.
  `tsc` 0 errors, `brand:lint` clean, unit tests 796/796. The browser suite has still NOT been run.
- **THE FORTUNE BADGE IS A NEW SUPPLIED LOCKUP, A TWO-LINE STACK AT 1.984:1, AND IT SHIPS RED.**
  `public/badges/fortune-global-500.svg` rebuilt from the new `FG500.svg`, cropped by `logo:crop` to
  1055.71×532.17 from a 1254² board; red on the `FORTUNE` plate, the rule box round `GLOBAL 500` and the
  `500`, at the owner's instruction. `FortuneBadge`'s intrinsic dims are 1056×532.
- **The badge still needs a LIGHT ground, which is the B-vs-G call.** `FORTUNE` is knocked out and the
  rule box is empty, so on `teal-deep` both fill with the ground and `GLOBAL` goes black-on-dark; both
  `peers-variants.tsx` notes corrected.
- **THE ROLE PALETTE IS TWELVE AND A NINTH GROUP IS NOW A PUBLISH RATHER THAN A DEPLOY.** Tones 9–12 are
  ours, not the slide's; all four clear 3:1 on the darker wash. `tests/unit/role-tones.test.ts` binds
  `ROLE_TONES` to the token count and the `[data-tone]` rules.
- **THE ROLE MAP'S LABELS ARE BOUND TO THEIR OWN BUBBLES.** Gap is 4px (`--gcc-role-gap`),
  `data-architect` at lane 22, `rolemap:check` reports 0 collisions and 0 mis-bindings at 1280 and 1440.
  The legend is three content-sized columns from `sm`; the dot ramp is the measured class means.

## Next action

1. **Run the browser suite.** It is the only check covering five sessions of render changes end to end;
   the peer view gained a zone four sessions ago, so expect specs keyed on zone grounds or `Enter`
   indices to need updating. The badge swap touched no spec locator.
2. **Commit and push**, once the suite is green.
3. **Finish or revert `peerNoteRules`.** It exists in `schema.ts` alone — no diff coverage, no editor,
   no consumer — so a publish changes it unreported.
4. **Re-run `scripts/measure-hero-ink.mjs` once the hero sizes settle** and refit the three constants in
   `ask-hero.tsx`. Verify the interval, never the constant.
5. **Owner is deciding peers B vs G. Do not merge either until told.** On the word, fold the winner into
   `peer-view.tsx` / `evidence.tsx` and delete that harness; both predate the phone rounds and the
   company-name removal, so carry those in.

## Blocked / needs the user

1. **THREE ROLE INKS SHIP UNDER THE 3:1 NON-TEXT FLOOR, on ANSR's own instruction** — Cloud & Platform
   2.21, Application Development 1.73, Quality Engineering 2.53 on the established wash. ANSR should see
   the number before this goes live. Style lock carries the table and both rejected alternatives.
2. **The role map's other unsigned decisions, now seven.** The categorical palette overruling the
   ordinal-teal rule; "Established" where the slide says "Traditional"; whether a fifth demand step is
   wanted; the fifth nudged lane (`data-architect`); the legend losing its `sm` two-column step; whether
   the ~53px after "AI / ML" is worth right-aligned entries; and the four non-slide inks. Style lock.
3. **Three type housekeeping calls, one line each.** Whether `ss01` goes on the range separators only;
   whether `ansr-wordmark.tsx` stays now that nothing renders it; and whether admin moves to Moderat,
   given `--ansr-font-sans` names Inter but nothing loads it. Style lock.
4. **B or G, and G's two grants — the badge's knocked-out halves still price G.** A recolour grant or the
   badge on the white plinth, plus a decision on dark-ink company logos. `plate` (I) is the built
   fallback. Reasoning: `.tastemaker/peers-candidates.md`.
5. **Two critique findings deferred, not resolved** — the phone hierarchy inversion ("225K+" at 38px/700
   over a 30px/500 `h1`) and the `h1` shrink-wrap that unbinds `max-w-hero` below 1440. Measurements in
   `.impeccable/critique/`.
6. **Whether the visitor's own company should be excluded from its own peer set again.** It no longer is;
   the exclusion keyed on the typed name. Restoring it means asking for a name, which is the decision.
7. **The company-mark tier and two trademark questions, as one set.** `COMPANY_MARKS` is empty by
   decision and the Brandfetch client ID is being rejected (302 to the hotlinking guidelines), so the
   peer sections draw no marks; the customer clearance covers neither that tier nor the Fortune badge,
   which routes through PARS International — and the badge artwork has now changed under that question.
8. **The count line's arrow is `--ansr-action` on the MINT ground at 2.63:1**, under the 3:1 floor, where
   its own note claims a white ground at 3.4:1. Fix is a zone ground or a colour.
9. **Capability grid: every "Very strong" is India's column,** so the depth-by-rating teal is
   indistinguishable from the emphasis ANSR removed. Accept, revert, or supply spanning ratings.
   Style lock.
10. **Three requested labels ship naming the INDUSTRY where ANSR asked for the sub-industry** — snapshot
    city count, leading city, locations heading. All industry-scoped; narrowing is a data change.
11. **Figures the data does not support, as one set. MUST NOT SHIP UNEXAMINED.** The ANSR rail's four
    months (`ANSR_MONTHS`); three provisional latency figures on `ops-network-latency`; two 10% finance
    placeholders; `ops-power-uptime` at 100/100 and `ops-disruption-days` at 0/0. **Rotate the admin
    password** (shared in a transcript) and calendar the `GCC_GITHUB_TOKEN` expiry while you are in there.
12. **ANSR sign-off backlog, as a set:** Moderat itself, including the semibold collapse and every
    typography correction; the `GCC ATLAS` rename, the drawn product name, the hero's masthead
    composition and the ANSR wordmark leaving the headline; the role map in full; the new red-plated
    Fortune lockup; pinned peer sets; admin-editable tags; the admin UX pass; the broadened-set call-out
    and retightened narrow note; the largest-GCCs band-shortfall removal; the company-name removal; the
    short-set line's move; all phone rounds; the `Delhi NCR` rename; the strip at twenty-two marks;
    Screen 2's rewordings, salary rows and the capability grid losing India emphasis; and the sealed
    group's removal, which leaves a visitor never told a figure is withheld.

## Traps worth remembering

**`docs/traps.md`** — read it before touching the test suite, the dev server, the metric catalogue, or
anything that renders. Five that would cost the most time:

- **THE REMOTE MOVES WITHOUT A LOCAL COMMIT, and the tree moves under you too.** The base went `732bbfb`
  → `0051402` with no local work committed, and both `peerNoteRules` and a hero resize arrived
  mid-session. A live admin session publishes straight to `GeeteshRanjan/GCC-Landscape`, so `git push`
  can be rejected on a clean-looking tree. Fetch and read the `data: publish from admin` commits first.
- **A SUPPLIED LOGO'S ARTBOARD IS NOT ITS ARTWORK, AND ITS RATIO IS THE ONLY THING THAT SURVIVES.**
  `FG500.svg` was 71.7% empty board. Crop with `npm run logo:crop` — it rasterises and scans alpha — and
  move the `<img>`'s intrinsic `width`/`height` to the new `viewBox`, or the mark letterboxes in its own
  box. Resaving at a different pixel size fixes nothing.
- **AN INSTRUMENT THAT PASSES CAN BE ANSWERING THE WRONG QUESTION, and the role map proved it twice.**
  Zero collisions hid eleven labels bound to the wrong bubble; a ramp fitted to round histogram figures
  rather than class MEANS drew all 36 discs 1–3% small. Run `npm run rolemap:check` at 1280 AND 1440 and
  read `collisions=` and `binding=`, both of which must be 0.
- **MEASURE A "TOO BIG", "TOO DARK" OR "UNEVEN" REPORT BEFORE CHANGING IT** — twice the thing named was
  not the thing at fault. The legend already matched the notes to the pixel; its column gaps were already
  equal, while a reader saw 146 then 32 because an `1fr` cell's leftover adds to the gap.
- **`next build` TYPECHECKS, so ONE type error anywhere blocks `test:browser` entirely.** Build on a
  separate `GCC_DIST_DIR` and revert `tsconfig.json` after; `next dev` rewrites `include` too. Playwright
  leaves port 3210 held (`lsof -ti:3210 | xargs kill -9`) and does NOT rebuild the fixture on
  `npx playwright test`. `getByLabel("Industry")` is ambiguous with the popup open (use
  `getByRole("combobox")`), a tiered dropdown resolves every row TWICE (take `.first()`), and
  "Sub-industry" makes an admin label lookup ambiguous (use `{ exact: true }`). The form's labels are
  "Industry", "Annual revenue" and "Headquarters", the submit is "Build my GCC Landscape", the login
  button is "Continue", and the country is `USA`.
