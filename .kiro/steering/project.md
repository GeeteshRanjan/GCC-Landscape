# GCC Landscape — product & architecture invariants

Durable truth. Always in context. Change only with a stated reason, and update the same day the
code changes — a stale line here silently corrupts every session that follows.

Companions: `design-stack.md` (tokens, brand), `skill-router.md` (which skill to run),
`handoff.md` (where we are right now). Deep reference lives in `docs/` and is read on demand.

## What we are building

A self-serve web tool on ANSR's site. A visitor enters a few facts about their company and gets a
personalised picture of the India GCC market: what comparable companies already do here, and the
function-level metrics they would care about. Aim is to inform, and to earn a conversation.

**Audience:** CIO / CTO / COO / HR and finance leaders at large global companies, evaluating or
expanding an India GCC. Arriving from ansr.com or outbound campaigns. Not analysts, not students.

Full transcription of the source brief: `docs/brief.md`. Read it before building either screen.

**Inputs — five, and every one has a consumer.** Sub-industry and global headcount were both cut
once nothing consumed them; hold the remaining set to the same standard.

| Input | Control | What uses it |
| --- | --- | --- |
| Company name | text | Personalises copy only |
| Industry | select | Primary peer match key |
| Revenue band | select, the seven bands in the data | Peer similarity axis |
| HQ location | select | Sort preference on the peer set |
| Existing GCC status | select | Branches the framing: evaluating vs expanding |

Never ask for a revenue figure. The data holds bands, so the input is a band.

**Two screens.**

*Screen 1 — Peer View.* Four blocks:
1. Up to five comparable companies already running India GCCs — cities, India headcount as a band,
   year established.
2. **The industry count**: how many other companies in their industry run an India GCC. This turns
   the thin-peer case from a weakness into evidence — five named peers plus "and 184 others in
   BFSI" reads stronger than five peers alone.
3. **The largest companies in their industry with an India GCC**, as an aspirational anchor. We hold
   revenue *bands*, not revenue, so nothing can be ranked by revenue. The rule is: take the highest
   band that has members in that industry and fill from there downward, ordered by GCC size. Three
   industries have nobody in the top band, so the panel must degrade rather than assume one exists.
4. The Fortune Global 500 count and summed professionals, as scale proof — across all of India, not
   just the peer set.

*Screen 2 — Function View.* Tech, Operations, HR, Finance. Internally the metrics are organised by
four lenses — supply, speed, place, cost — but **the lens names are an internal filing system, not
UI labels**. The rendered grouping and copy are a design decision, made per screen.

**India heatmap.** Built from the city lists in the company data — density of GCCs per city, filtered
to the visitor's industry. Not a separate dataset.

**Cut from the brief, deliberately:** the editable peer set, and "India GCC as a % of global tech
workforce". Do not reintroduce either.

## Invariants

Violating any of these breaks the product, not just the build.

1. **Gated values never reach the browser.** Fully loaded cost per FTE by role and level, HR cost
   per employee served, the cost-vs-ecosystem-depth trade-off, and the workplace-cost gradient are
   server-side omissions rendered as shape-only placeholders. A CSS blur over real text is a leak.
   Absolute per-head salary figures are never shown, gated or not.
2. **The free layer must stand alone as credible.** Peer proof carries it. If a screen only makes
   sense once the gate is paid, the free layer has failed.
3. **Peers must be defensibly comparable.** Never pad a thin set with a company the visitor can see
   is wrong — one bad peer discredits the whole card. When the set is short we say so plainly and
   reframe it as first-mover ground, in one short line — then the industry count carries the weight.
4. **Absolute per-head salary figures are never shown**, in any lens, gated or not. The brief is
   explicit. Cost is expressed as indices, spreads, growth rates and relative positions.
5. **Excel is a seed, never a runtime dependency.** Nothing reads `.xlsx` on request, and after the
   first import admin is the system of record.
6. **No raw hex, magic pixel, or ad-hoc duration.** `assets/brand/tokens.css` governs;
   `scripts/brand_lint.py` enforces. See `design-stack.md`.
7. **The public surface never hints that an admin exists.** No login link, no admin nav, no
   "sign in". Admin is reached by typing the URL and is behind real auth — an unguessable path is
   not access control.

## Stack

Decided. Reasons recorded because they constrain later choices.

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | **Next.js (App Router), TypeScript**, at the repo root | Three server needs, none optional: gated metrics must not be serialized to the browser, admin needs auth and a write endpoint holding the publish credential, and peer matching filters the dataset server-side. A Vite SPA would need a second deployable to do any of it. Not chosen for SEO — the iframe means nothing here is indexed as a destination. |
| Styling | **Tailwind v4 + shadcn/ui** | `@theme` consumes `tokens.css` directly, no duplicated palette. |
| Data | **Versioned JSON in the repo. No database, no bucket.** | The dataset is 326 KB, 33 KB gzipped, and every query is "filter by industry and band, then sort". Publishing happens roughly monthly in one batched sitting, so a rebuild per publish costs nothing — and git then supplies version history, diffs and rollback for free, instead of us building a snapshot-pointer mechanism to reproduce them. |
| Auth | Single admin password, scrypt-hashed in env, signed httpOnly cookie, rate limited, optional TOTP | Real auth without a database. `ADMIN_PASSWORD_HASH` uses `:` separators and base64url, **not** the conventional `$` and base64: dotenv expands `$N` as a variable reference, so a `$`-separated hash arrives truncated and a correct password fails. Do not standardise the format back. Rate limiting has **two** budgets — per IP and per process — because `x-forwarded-for` is attacker-supplied and the per-IP one alone is defeated by rotating it. Neither bounds a distributed attempt across instances, which is what `ADMIN_TOTP_SECRET` is for; it is opt-in and unset by default. **Setting it without first confirming a working code locks everyone out of admin** — there is no recovery path through the UI, only editing the variable and redeploying, so it is the one setting that must never be enabled speculatively. `.env.example` documents every key. |
| Deploy | **`GeeteshRanjan/GCC-Landscape`** on GitHub → **`gcc-landscape.vercel.app`** **for now** | Preview URLs matter for a stakeholder-reviewed tool. That `owner/name` is also the value `GCC_GITHUB_REPO` needs before admin publishing works, and the two must never diverge: publishing commits to the repo the app is deployed from, because the commit is what triggers the rebuild. **Vercel applies environment variables only to builds created after they were added** — changing one and not redeploying leaves the running app with the old set, or with none, and the app cannot tell you that. |
| Delivery | **iframe embed in an ansr.com page** | Client's call. Consequences below. |

**iframe consequences, all load-bearing:**
- The tool cannot own the URL bar. Screen state lives in component state, not routes, and
  Screen 1 → Screen 2 is not a page navigation. Deep links are out unless the parent cooperates.
- Height is negotiated with the parent via `postMessage`. Never assume viewport height; no
  `100vh` layouts, no fixed/sticky positioning that assumes it owns the scroll container.
- `frame-ancestors` allows ansr.com for public routes and `'none'` for `/admin`.
- Admin is unaffected: same deployment, `/admin`, opened directly, never framed. Because it is never
  framed it is **exempt from every constraint above** — it uses real routes, owns the URL, and may
  assume viewport height and a sticky header. Do not carry those patterns back into the public
  screens, and do not "simplify" them out of admin to match.

**Vercel is a host, not a platform.** ANSR may take this in-house, so nothing host-specific gets
used. Concretely:

- Data access goes through a thin `DataStore` interface — `read`, `write` — so the write path is one
  swappable module: GitHub commit in production, direct file write in local development, plain disk
  write if ANSR self-hosts on a server with a filesystem. No host-specific storage API anywhere.
  The GitHub store reads with the Contents API's `raw` media type and writes through the Git Data API
  — blob, tree, commit, non-forced ref update. Both choices are about limits the simple path silently
  hits: the Contents API's JSON form returns *empty content* above 1 MB, and its single-call update
  cannot express a real fast-forward check. Do not "simplify" either back.

  **`GCC_GITHUB_TOKEN` is a scheduled failure.** A fine-grained token expires, and when it does
  publishing starts returning "GitHub refused the request (401)" with a valid password and a valid
  draft — a failure that looks like a bug months after anyone last touched this. Record the expiry
  date with the deployment, and read that 401 as an expired token before debugging anything else.
  **Reads and writes select different stores, deliberately.** Reads always come from the local JSON,
  because a GitHub round trip per cold start would add a network dependency and a rate limit to the
  public screens for nothing. Writes go wherever the deployment's source of truth is, and the diff is
  computed against that same place — diffing against the baked-in file while committing to a branch
  that has moved is how one publish silently reverts another. With nothing configured in production,
  publishing refuses to start rather than writing somewhere the next deploy discards.

  **`GCC_DATA_STORE=fs` on a serverless host is the one setting that loses data silently.** It is the
  obvious way to make the "publishing is unavailable" banner go away, and it is wrong: the filesystem
  is ephemeral, so a publish validates, shows a correct diff, reports success, and is gone on the next
  deploy. `fs` is for local development and for a self-hosted server with a real disk. Leaving the
  variable unset on such a host is the safe state, and the banner is doing its job.

  **The read cache is invalidated by the file, not by the writer.** `dataset.ts` stamps each cached
  copy with the dataset's mtime and size and re-reads when either moves. Having the publish endpoint
  clear the cache is not sufficient and was measured not to work: a route handler and a layout can be
  bundled separately, each with its own copy of module-level state, so the handler clears a cache the
  page never reads. The symptom is a publish that writes the file, reports success, and keeps serving
  the old data until the process restarts. It only bites where nothing restarts the process — a
  self-hosted deployment writing to a real disk — and relying on a rebuild to paper over it would make
  correctness a property of the host rather than of this module.
- Node runtime everywhere. No edge runtime, no Vercel-only middleware behaviour.
- `next build && next start` must work on a plain Node host. That is the portability test.
- Any scheduled work is a plain route protected by a shared secret, callable by any cron.

When it does move in-house and the tool is served from ansr.com directly, the iframe may disappear.
That is a simplification, not a migration — but do not relax the iframe constraints below until it
has actually happened.

## Data

**Seed:** `Consolidated_GCC_India_Database_2026_New.xlsx` — 1834 companies, 16 columns, one sheet.
Profiled in `docs/data-audit.md`; read that before touching the schema.

**Excel is a seed, not a system of record.** It is imported once, cleaned and normalised on the way
in, and after that **admin is the authoritative editor** — full row CRUD on companies, plus taxonomy,
plus the Screen 2 metrics. The spreadsheet is never read again except to bulk-append a future batch
of new companies, which goes through the same validation as the seed.

**Pipeline.** Upload or edit → parse → validate against schema → **diff preview** → publish, which
commits the JSON and triggers a rebuild. Live in about a minute; that latency was weighed against
instant-publish alternatives and accepted, so do not reopen it. Validation failure blocks the
publish. Rollback is a git revert.

**The admin never touches git.** The app makes the commit server-side with a token from the
environment. Admin sees one Publish button and no mention of a repository.

**Publishing is batched, not continuous.** The admin does a month's worth of edits in one sitting.
Those edits are held as a **draft in the browser**, autosaved locally, with an explicit
unpublished-changes warning — no server-side draft storage exists. Publish sends the whole edited
dataset as a single commit. This is the reason no runtime datastore is needed: nothing is ever
written to a live store one field at a time.

The dataset is read server-side and held in memory. It is never shipped whole to the browser —
Screen 1 sends five peers and a few counts, nothing more.

**Two datasets, one admin.** The company table seeds from a spreadsheet upload. The Screen 2 function
metrics are hundreds of individual values with no spreadsheet behind them, so admin edits those as
forms, through the same draft-then-publish flow.

**Columns kept.** Company name, HQ country, revenue band, industry, establishment year, city list,
FTE range, Fortune Global 500 flag, Forbes Global 2000 flag.

**Columns dropped** — sub-industry (see below), company type, exact GCC headcount, estimated FTEs,
S.No. FTE range is the only headcount field: stored as a normalised `(min, max)` integer pair, which
kills the hyphen-vs-en-dash inconsistency in the source. Every supplied range is already a closed
pair, so no ceilings need inventing. Display strings, location count and tier-2 presence are derived
from range and city list, never stored — storing them is how two columns start disagreeing.

**Peer matching ladder.** Sub-industry is not used at all: 620 values over 1834 companies made it
unusable as a match key. Measured coverage in `docs/data-audit.md`.

1. Same industry, same revenue band. Covers 92%.
2. Same industry, adjacent revenue band (±1 step). Takes it to 98%.
3. Whatever exists, with the shortfall stated.

Same HQ country is a **sort preference, never a filter**: same-country peers fill the slots first
because a visitor recognises companies from their own market, then remaining slots are filled from
other countries. As a filter it would cost 33 points of coverage.

**The ladder never leaves the industry.** Measured consequences, both of which the copy has to carry
rather than the data hide: Education has six companies, so it fills all five slots from its own
industry and no further; Electrical & Electronics has two, so it stays three short and says so.

**`taxonomy.revenueBands` is ordered ascending, and that order is the contract** — step 2 above is
index arithmetic on the array. Nothing sorts it, anywhere. The taxonomy editor appends a new band at
the end and offers Move up / Move down to place it, and the publish diff reports a reorder as a real
change even when no value was added or removed, because a reorder changes who matches as a peer.

**Taxonomy is a first-class, admin-editable entity.** Industry, revenue band, city, HQ country.
Admin adds a value and it appears in the public dropdowns on the next publish — no code change, no
developer involved. Renaming a value **cascades into every company that referenced it**; without the
cascade the publish fails referential integrity, which is correct but useless. Deleting a value still
in use is refused in the editor, where the reason can be explained, rather than at the schema gate.

**`data:verify` checks two different things and the distinction is load-bearing.**

*Invariants* are properties of the code that must hold for any dataset, seed or heavily edited: the
peer ladder never leaves the industry, a thin industry degrades rather than pads, peers are ordered by
size within a rung, HQ country never changes how many peers come back, the largest-in-industry panel is
never empty, known revenue bands stay in ascending order. A failure here is a bug, and `--accept`
deliberately cannot silence it.

*Profile figures* are the measurements in `docs/data-audit.md` — counts, index membership, aggregate
professionals, city density, coverage. They pin a snapshot, and a legitimate admin edit is supposed to
move them. They live in `data/verify-baseline.json`, not hardcoded in the script, so accepting a real
change is `npm run data:verify -- --accept`, which rewrites the baseline and prints the delta. Commit
that file alongside the data change and bring the audit document into line.

That split is what makes the check survivable after a publish. Do not collapse it back into one list
of hardcoded numbers: a check that must be edited or ignored after every legitimate change has
stopped being a check.

**Known gaps** — tracked in `handoff.md`:
- No per-company function list → the common-functions block has no source. The brief permits a
  hardcoded common function set.
- All Screen 2 metrics. Admin gets the editing views first; the values are entered there.

## Architecture map

Maintained as directories acquire responsibilities. The file tree is supplied automatically each
session, so this records **what lives where and why**, never a file listing.

| Path | Responsibility |
| --- | --- |
| `src/app/` | Next.js App Router. `globals.css` is the Tailwind theme, aliased onto the brand tokens — it restates no values and clears Tailwind's default palette so off-brand colour is unreachable through a utility class. |
| `src/data/` | The whole data layer, and the only place that knows the dataset shape. `schema.ts` is the zod contract; `normalize.ts` holds the cleaning primitives, shared by the seed importer and the future admin upload so one file format never gets two parsers; `derive.ts` computes everything not stored; `peers.ts` is the matching ladder and the Screen 1 counts, pure functions over a loaded dataset; `diff.ts` is the dataset diff — one computation with two renderers, a console one for the importer and structured output for the admin preview, so the two can never disagree; `store.ts` + `store/{fs,github}-store.ts` are the `DataStore` implementations; `publish-store.ts` selects the write target and refuses to guess; `dataset.ts` is the cached server-side read, invalidated by an mtime-and-size check rather than by anyone remembering to clear it, and is `server-only`, which is what makes "never ship the dataset to the browser" a build error rather than a habit. |
| `src/app/admin/` | The admin surface. `login/` sits outside the `(authed)` route group and is the one path without a session; the group's layout is the guard for everything else and hosts the draft provider, so a draft survives moving between tabs. A route group rather than middleware: middleware would be a second runtime to keep Node-only for no gain. |
| `src/app/api/admin/` | Login, logout, diff preview, publish. Each **re-checks the session itself** — deliberate duplication, because a layout cannot guard a route handler and a route that forgot would be silently public. |
| `src/lib/admin/` | Auth and the publish pipeline. `password.ts` is scrypt hashing; `session.ts` is the signed cookie and is `server-only`; `rate-limit.ts` is the two-budget login limiter; `totp.ts` is the optional second factor, RFC 6238 on `node:crypto` with no dependency; `guard.ts` holds the two refusal shapes (redirect for pages, bare 401 for APIs); `publish.ts` is the validate → read → diff pipeline shared by preview and commit; `constants.ts` exists solely because `server-only` throws under `tsx`, so anything a script imports cannot carry the marker. |
| `src/components/admin/` | Client-side admin UI. `draft-provider.tsx` is the browser draft, autosaved locally and pinned to the baseline it started from. The rest is the app-shell chrome, the company table and editor, the taxonomy editor and the publish view. |
| `src/components/ui/` | shadcn/ui components, unmodified from the registry. On-brand because `globals.css` maps the registry's contract variables onto brand tokens. |
| `data/` | `dataset.json` — the published dataset, tracked in git. Pretty-printed on purpose: a reviewable diff is the reason there is no database. `verify-baseline.json` holds the profile figures `data:verify` compares against; also tracked, and updated only by `data:verify -- --accept`. |
| `assets/brand/` | Brand source of truth. `tokens.css` is authoritative. Motifs adapted, never pasted. |
| `tests/unit/` | Vitest, node environment, no jsdom. Pure and server-side logic: hashing, session signing, TOTP, the rate limiter, the diff, the schema, the cleaning primitives, the GitHub store against a stubbed `fetch`, and the publish pipeline against a temp file. `vitest.config.ts` resolves the `react-server` condition, which is how these import a `server-only` module at all. |
| `tests/browser/` | Playwright against a real `next build && next start`, on its own copy of the dataset. Covers what a unit test structurally cannot: the draft lifecycle, autosave, restore after reload, the stale-baseline conflict, and focus behaviour. Serial, one worker — the server holds the rate limiter and the dataset cache in memory, so parallelism would make test order part of the result. Numbered specs run in reading order; `5-lockout.spec.ts` exhausts the limiter and must stay last. |
| `scripts/` | Maintenance tools, run by hand, never at request time. Python: `brand_lint.py` enforces tokens, `brand_asset.py` adapts SVGs, `inspect_xlsx.py` profiles data drops. TypeScript via `tsx`: `import-seed.ts` is the xlsx → JSON pipeline, `verify-data.ts` reproduces every figure in `docs/data-audit.md` from the published dataset and exits non-zero if one moves, `admin-hash.ts` mints the two admin env values from a TTY prompt so the password never lands in shell history. |
| `docs/` | Deep reference, read on demand. Not steering. `brief.md` is the transcription of the source mind map — read it, not the image. `data-audit.md` is the profile of the source database. |
| `.kiro/steering/` | Always-in-context rules. Four files, kept small on purpose. Tracked, along with `hooks/`, `settings/` and `skill-sources.json`. **`.kiro/skills/` is deliberately untracked** — 300 files of vendored third-party packs with one LICENSE between them, and git history is forever. `skill-sources.json` pins each pack's repo and commit, so re-cloning restores them. |

## Document protocol

Four steering files and a `docs/` folder. Adding a fifth steering file needs a reason, because
everything here is paid for on every single turn.

**These files are committed.** No live credential ever goes in one, not even a throwaway that only
guards a local dev server — refer to `npm run admin:hash` and name the variable, never the value. The
same applies to test fixtures: a credential-shaped string trips push protection and every scanner
downstream, and a scanner that cries wolf over test data is one people learn to ignore.

- **`project.md` (this file)** — durable. Edited by replacement, never by appending. If a line is
  no longer true, it is deleted, not annotated with a correction.
- **`handoff.md`** — volatile, current state only, hard cap of 120 lines. **Rewritten** at the end
  of each working session, not appended to. Yesterday's state is not context, it is noise. The
  `handoff-refresh` Stop hook enforces this.
- **`docs/*.md`** — reference detail. Not auto-loaded. One topic per file, named for the topic.
- **Superseded content is deleted.** Not struck through, not moved to an "Archive" heading. Git
  holds the history; these files hold the present.
