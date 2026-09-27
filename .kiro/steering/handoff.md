# Handoff — current state

State and pointers only. Reasoning lives in `project.md` if durable or `.tastemaker/style-lock.md` if
visual. Bounded by SHAPE, not length — see the `handoff.md` subsection of "Document protocol" in
`project.md` before editing. Never measure this file; over a cap, delete or merge a whole item.

**Last updated:** 2026-09-27

## Where we are

- **`main` is one commit past `db1593d`: the extra-framing opt-in, pushed.** Gates on it: `tsc` 0 errors,
  812 unit tests, `1-auth.spec.ts` 13/13 against a local production build, `brand:lint` clean on tracked
  files. The full browser suite last ran at `db1593d` (223 passed) and has not been re-run since.
- **PUBLIC FRAMING IS OPT-IN AND NOT YET ON IN PRODUCTION.** `GCC_FRAME_ANCESTORS_EXTRA` appends bare
  origins to the public `frame-ancestors`, parsed and validated by `src/lib/frame-ancestors.ts`; unset,
  production still ships ansr.com only, which is why the owner's portfolio currently reads "refused to
  connect". `/admin` stays `'none'`. Rule: project.md, iframe consequences.
- **Seven files are deliberately untracked and need a decision** — plus `portfolio-export/`, the owner's
  portfolio covers and write-up, whose `project.ts` is the ONLY source of today's three `brand:lint`
  findings (raw hex). `.probe-fixes.mjs`, `probe-mobile.mjs`, `companies-export.csv`, `untitled folder/`
  (Walmart and FedEx SVGs, so Blocked 7), both mobile-UI review notes, and
  `src/app/fonts/HankenGrotesk-Comma.woff2`, referenced nowhere and the one with a licensing cost.
- **`project.md` IS STALE ON THE DRAWN PRODUCT NAME.** `ProductWordmark`, `GccWordmark` and
  `AtlasWordmark` are all gone and the name is typed again through `product-name.tsx`; the supplied
  outlines survive as `assets/brand/logo/*-as-supplied.svg`. That whole section wants replacing.
- **THE FORTUNE BADGE SHIPS RED AND STILL NEEDS A LIGHT GROUND.** `FORTUNE` is knocked out of its plate
  and the rule box round `GLOBAL 500` is empty, so on `teal-deep` both fill with the ground and `GLOBAL`
  goes black-on-dark. That is what prices peers G.

## Next action

1. **OWNER: set `GCC_FRAME_ANCESTORS_EXTRA` on Vercel for Production and REDEPLOY** — the value is read
   at build time, so an env edit alone changes nothing. `http://localhost:5173` only frames from the
   owner's own machine; add the portfolio's deployed origin too before it goes live. Check with
   `curl -sI https://gcc-landscape.vercel.app/ | grep -i content-security`.
2. **Replace `project.md`'s drawn-wordmark section** with what ships, then — once the hero sizes settle —
   re-run `npm run wordmark:measure` and `scripts/measure-hero-ink.mjs` and refit `ask-hero.tsx`'s three
   constants. Verify the interval, never the constant.
3. **Decide the seven untracked files and `portfolio-export/`**, above.
4. **Finish or revert `peerNoteRules`.** It exists in `schema.ts` plus one baseline pass-through in
   `draft-provider.tsx` — no diff coverage, no editor, no consumer — so a publish changes it unreported.
5. **Owner is deciding peers B vs G. Do not merge either until told.** On the word, fold the winner into
   `peer-view.tsx` / `evidence.tsx` and delete `peers-variants.tsx`; both predate the phone rounds and
   the company-name removal, so carry those in.

## Blocked / needs the user

1. **THREE ROLE INKS SHIP UNDER THE 3:1 NON-TEXT FLOOR, on ANSR's own instruction** — Cloud & Platform
   2.21, Application Development 1.73, Quality Engineering 2.53 on the established wash. ANSR should see
   the number before this goes live. Style lock carries the table and both rejected alternatives.
2. **The role map's other unsigned decisions, now seven.** The categorical palette overruling the
   ordinal-teal rule; "Established" where the slide says "Traditional"; whether a fifth demand step is
   wanted; the fifth nudged lane (`data-architect`); the legend losing its `sm` two-column step; whether
   the ~53px after "AI / ML" is worth right-aligned entries; and the four non-slide inks. Style lock.
3. **Three type housekeeping calls, one line each.** Whether `ss01` goes on the range separators only;
   whether `ansr-wordmark.tsx` stays now that nothing renders it (two docblocks cite its measurement,
   nothing imports it); and whether admin moves to Moderat, given `--ansr-font-sans` names Inter but
   nothing loads it. Style lock.
4. **B or G, and G's two grants.** A recolour grant or the badge on the white plinth, plus a decision on
   dark-ink company logos. `plate` (I) is the built fallback. Reasoning: `.tastemaker/peers-candidates.md`.
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
    typography correction; the `GCC ATLAS` rename, the hero's masthead composition and the ANSR wordmark
    leaving the headline; the role map in full; the new red-plated Fortune lockup; pinned peer sets;
    admin-editable tags; the admin UX pass; the broadened-set call-out and retightened narrow note; the
    largest-GCCs band-shortfall removal; the company-name removal; the short-set line's move; all phone
    rounds; the `Delhi NCR` rename; the strip at twenty-two marks; Screen 2's rewordings, salary rows and
    the capability grid losing India emphasis; and the sealed group's removal, which leaves a visitor
    never told a figure is withheld.

## Traps worth remembering

**`docs/traps.md`** — read it before touching the test suite, the dev server, the metric catalogue, or
anything that renders. Five that would cost the most time:

- **THE REMOTE MOVES WITHOUT A LOCAL COMMIT.** A live admin session publishes straight to
  `GeeteshRanjan/GCC-Landscape`, so `git push` can be rejected on a clean-looking tree. Fetch and read
  the `data: publish from admin` commits before pushing.
- **A SPEC CAN BE STALE FOR FIVE SESSIONS AND LOOK LIKE A PRODUCT BUG.** Thirteen `0-search` specs failed
  on the overlapping tiers alone — a leading-tier industry draws TWO rows, so a bare
  `getByRole("treeitem", { name })` is a strict-mode violation for exactly the industries a visitor picks
  most. `.first()` is the fix; `helpers.ts` and `0-search.spec.ts` both carry it now. Run the browser
  suite before believing a render change shipped.
- **AN INSTRUMENT THAT PASSES CAN BE ANSWERING THE WRONG QUESTION, and the role map proved it twice.**
  Zero collisions hid eleven labels bound to the wrong bubble; a ramp fitted to round histogram figures
  rather than class MEANS drew all 36 discs 1–3% small. Run `npm run rolemap:check` at 1280 AND 1440 and
  read `collisions=` and `binding=`, both of which must be 0.
- **A CSP EDIT IS A BUILD-TIME EDIT, AND THE SUITE PINS ITS OWN VALUE.** `next.config.ts` bakes the
  headers into the build, so a Vercel env change needs a redeploy; `tests/browser/prepare.ts` sets
  `GCC_FRAME_ANCESTORS_EXTRA` to `https://portfolio.example`, so `1-auth.spec.ts` asserts that exact list
  whatever `.env.local` says.
- **`next build` TYPECHECKS, so ONE type error anywhere blocks `test:browser` entirely.** Build on a
  separate `GCC_DIST_DIR` and revert `tsconfig.json` after; `next dev` rewrites `include` too. Playwright
  leaves port 3210 held (`lsof -ti:3210 | xargs kill -9`) and does NOT rebuild the fixture on
  `npx playwright test`. `getByLabel("Industry")` is ambiguous with the popup open (use
  `getByRole("combobox")`), and "Sub-industry" makes an admin label lookup ambiguous (use
  `{ exact: true }`). The form's labels are "Industry", "Annual revenue" and "Headquarters", the submit
  is "Build my GCC Landscape", the login button is "Continue", and the country is `USA`.
