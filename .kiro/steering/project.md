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

**Inputs — six, and every one has a consumer.** Global headcount was cut once nothing consumed it;
hold the set to the same standard. The sixth, line of business, is the only OPTIONAL one: left
unanswered the peer set is byte-identical to what the five produced, so it adds precision without
adding a required field.

| Input | Control | What uses it |
| --- | --- | --- |
| Company name | text | Personalises copy only |
| Industry | select | Primary peer match key, and a hard boundary |
| Revenue band | select, the seven bands in the data | Peer similarity axis, weighted below business |
| HQ location | select | Sort preference on the peer set |
| Existing GCC status | select | Branches the framing: evaluating vs expanding |
| Line of business | select, **optional**, dependent on industry | Business similarity — the primary ordering signal |

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
public UI labels**. The rendered grouping and copy on the public screen are a design decision, made
per screen. Admin does show them, labelled as internal, because that is what a filing system is for.

**The four tabs are four VIEWS of one national picture, not four datasets.** The tool is not claiming
that a COO looks at a different India from a CTO; it is putting in front of each of them the figures
they are asked to justify. So a metric that appears on more than one tab carries **the same figure on
every one of them** — bench strength, graduate output, leadership depth, time to backfill, time to
first hire and the scale curve are all shared. They are authored **once** in
`src/data/metric-catalogue.ts` and spread onto each tab with a different id, and `data:verify` carries
the property as an **invariant**: metrics sharing a title must be identical apart from `id` and
`functionArea`. There is no legitimate edit that makes two views of one number disagree. Every shared
figure is a technology-role figure and the cards deliberately do not say so — re-labelling each one
"for technology roles" would be noise over the point.

The brief's author used six lenses, adding Fit and Optional. Both collapse into supply: Fit is
comparative capability supply across delivery locations, and the Optional diversity block is the
composition of the workforce on offer. Nothing from the brief lost a home, and the four are the
contract — see `METRIC_LENSES` in `src/data/schema.ts`.

**A metric is a shape plus, separately, its numbers.** Structure (`scalar`, `range`, `breakdown`,
`matrix`) is authored once; `value` is nullable and arrives later. That split is what makes two
things work at once: the catalogue can ship as definitions with no invented figures, and a gated
metric has a shape to render a placeholder from without a value existing anywhere near the browser.
`alignValue` re-fits the numbers when the shape changes, in one tested place, so the form cannot
build something the publish gate then rejects for a length mismatch.

**`atLeast` marks a metric whose figures are a floor**, and it is part of the definition rather than
the value — "8.7 million or more" is a claim about how the figure was arrived at, and it holds whatever
number is entered next month. Every figure the metric produces renders with a trailing `+`, applied in
one place in `src/data/screen2.ts` so a parts list cannot silently drop it and make a stronger claim
than the data does. Refused on a rating, since an ordinal has no "or more", and dropped by the gate,
where it would qualify a figure that is not there.

**India heatmap.** Built from the city lists in the company data — density of GCCs per city, filtered
to the visitor's industry. Not a separate dataset.

**Cut from the brief, deliberately:** the editable peer set, and "India GCC as a % of global tech
workforce". Do not reintroduce either.

**Built, then cut: company-name autocomplete.** Typing a name offered matching companies and prefilled
industry, revenue band and line of business. It worked, it shipped nothing to the browser it should not
have, and it was still wrong: the suggestions could only ever come from our own 1834, so a visitor at a
large company we have not mapped types their name, sees an empty dropdown, and reads it as "this tool
does not know who we are" — in front of the exact audience the tool exists to impress. **The absence of
a suggestion is itself a message, which is why no amount of care in the mechanism fixes it.** Do not
reintroduce it against this dataset. It becomes reasonable only against a data source that covers
companies we have not researched, and at that point the empty state is a genuine "not found" rather than
a statement about ANSR's coverage.

**Lead capture is out of scope.** The tool informs and earns a conversation; the CTA links out to a
separate landing page. No form, no email field, no stored visitor input anywhere in this codebase.

## Invariants

Violating any of these breaks the product, not just the build.

1. **Gated values never reach the visitor's browser.** Fully loaded cost per FTE by role and level,
   HR cost per employee served, the cost-vs-ecosystem-depth trade-off, and the workplace-cost
   gradient are server-side omissions rendered as shape-only placeholders. A CSS blur over real text
   is a leak. Absolute per-head salary figures are never shown, gated or not.

   **`publicMetric` in `src/data/metrics.ts` is the single enforcement point, and the only way a
   metric may cross.** Its gated branch has no `value` or `structure` field for a number to travel
   in, so the compiler carries the invariant rather than whoever writes the component. It also drops
   the row and column names, the unit, the index base and the as-of date: a row label beside a
   visible axis can imply the answer, and a placeholder needs only cardinality to be the right size.
   Both branches drop `lens` and `note`.

   Gated metrics *are* edited normally in admin, and that is not a contradiction — admin is
   authenticated and already holds the whole dataset, exactly as it does for companies. The gate is
   on the way out.

   Two ways the schema makes a leak impossible rather than merely discouraged: there is **no
   currency format**, and a currency-looking `unit` is refused, so no absolute money figure can be
   expressed at all; and a **gated metric's title and question may not contain digits**, because
   both do cross to the browser and omitting the value is no help if the sentence beside it gives
   the answer away. `gated` is not an admin control — the provider re-pins it on save.
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
8. **The India map asserts no boundary.** It plots real city coordinates on an unbordered field and
   says so in a visible caption. India's borders are contested, so a hand-authored or approximated
   outline states a border position the tool has no business stating — under ANSR's brand, in front
   of the client's own prospects. Positions come from `CITY_COORDINATES` in `src/data/geo.ts`;
   coordinates are geographic fact and live in code rather than in the dataset, so the taxonomy
   editor cannot produce a city plotted somewhere invented. A **verified, licensed** outline may be
   added behind `projectCity` if one is ever sourced. Drawing one by hand is not an option, and
   neither is fitting the frame to whichever cities an industry happens to occupy — a fixed frame is
   what makes a thin industry look thin.

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
- **No scroll-driven motion, and no scroll-position logic.** The parent decides what is on screen,
  so an IntersectionObserver or scroll listener against our own viewport fires for content the
  visitor cannot see and stays silent for content they can. Motion on the public screens is tied to
  state changes instead — which is also why no scroll-animation dependency is installed.
- `frame-ancestors` allows ansr.com for public routes and `'none'` for `/admin`.
- Admin is unaffected: same deployment, `/admin`, opened directly, never framed. Because it is never
  framed it is **exempt from every constraint above** — it uses real routes, owns the URL, and may
  assume viewport height and a sticky header. Do not carry those patterns back into the public
  screens, and do not "simplify" them out of admin to match.

**Preview deployments are behind Vercel Deployment Protection, and that partly defeats the reason
Vercel was chosen.** Every push builds a preview, but fetching one returns Vercel's own login page, not
the tool — so an ANSR stakeholder cannot open a preview link, and neither can any automated check. Only
`gcc-landscape.vercel.app`, built from `main`, is publicly reachable. Either disable protection for
previews or mint a bypass token before treating a preview URL as something a reviewer can use; until
then "review it on the preview" is not a workflow that exists. This is also why the browser suite runs
against a local production build rather than a deployed one.

**Vercel is a host, not a platform.** ANSR may take this in-house, so nothing host-specific gets
used. Concretely:

- Data access goes through a thin `DataStore` interface — `read`, `write` — so the write path is one
  swappable module: GitHub commit in production, direct file write in local development, plain disk
  write if ANSR self-hosts on a server with a filesystem. No host-specific storage API anywhere.
  The GitHub store reads with the Contents API's `raw` media type and writes through the Git Data API
  — blob, tree, commit, non-forced ref update. Both choices are about limits the simple path silently
  hits: the Contents API's JSON form returns *empty content* above 1 MB, and its single-call update
  cannot express a real fast-forward check. Do not "simplify" either back. Verified against the real
  repository: a publish produces one commit touching only the dataset path, so basing the new tree on the
  parent's does keep every other file — the failure mode a hand-built tree would have introduced.

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

`exceljs` carries a moderate `uuid` advisory reachable only when *writing*; this is an offline,
read-only script, and the version is pinned.

**Excel is a seed, not a system of record.** It is imported once, cleaned and normalised on the way
in, and after that **admin is the authoritative editor** — full row CRUD on companies, plus taxonomy,
plus the Screen 2 metrics. The spreadsheet is never read again except to bulk-append a future batch
of new companies, which goes through the same validation as the seed.

**Pipeline.** Upload or edit → parse → validate against schema → **diff preview** → publish, which
commits the JSON and triggers a rebuild. Live in about a minute; that latency was weighed against
instant-publish alternatives and accepted, so do not reopen it. Validation failure blocks the
publish. Rollback is a git revert.

**Development never publishes to the configured production store.** Once `GCC_DATA_STORE=github` is set
somewhere, a publish is a real commit to the real branch that rebuilds the live site — so "just testing
the pipeline" mutates the client's data and shows up in history. Locally the store is `fs` and writes to
`data/dataset.json`, which is fine and revertible. To exercise the publish path deliberately, use the
browser suite: it runs against its own copy of the dataset in `tests/browser/.tmp`, which is exactly why
that fixture exists.

**The admin never touches git.** The app makes the commit server-side with a token from the
environment. Admin sees one Publish button and no mention of a repository.

**Publishing is batched, not continuous.** The admin does a month's worth of edits in one sitting.
Those edits are held as a **draft in the browser**, autosaved locally, with an explicit
unpublished-changes warning — no server-side draft storage exists. Publish sends the whole edited
dataset as a single commit. This is the reason no runtime datastore is needed: nothing is ever
written to a live store one field at a time.

The dataset is read server-side and held in memory. It is never shipped whole to the browser —
Screen 1 sends five peers and a few counts, nothing more.

**Two datasets, one admin, one file.** The company table seeds from a spreadsheet upload. The Screen 2
function metrics are hundreds of individual values with no spreadsheet behind them, so admin edits
those as forms, through the same draft-then-publish flow.

They live under `metrics` in the **same `dataset.json`**, not a second file, and that is what makes
"one pipeline" true rather than aspirational: the schema is already the publish gate, the diff, the
browser draft, the two stores and the mtime-and-size read cache all carry the new key with no changes.
A second file would mean a second write target, a second diff, a second cache and a publish that could
half-succeed. The key is **defaulted to `[]` rather than required**, so a dataset written before it
existed still reads — the fs store refuses a version it does not recognise, so bumping
`DATASET_VERSION` would have turned a backwards-compatible addition into a broken read.

**The importer preserves the catalogue; the seed is only used when there is none.** A re-import
rebuilds companies and taxonomy from the spreadsheet, and would otherwise erase months of typed-in
metric values in a way that looks exactly like a normal import. `scripts/import-seed.ts` carries the
existing `metrics` across untouched.

**No invented metric values, and no estimated ones.** The audience is a CIO sizing a
several-hundred-person commitment, so a plausible-looking placeholder figure is worse than an empty
screen. An incomplete open metric is left off the public screen rather than rendered half-filled; a
gated one is always included, because it has nothing to be missing. Three rules govern the catalogue's
values, and `docs/data-audit.md` records how each played out:

- **Supplied money becomes an index, or nothing.** Absolute amounts cannot be stored — no currency
  format exists — so where the source gave a comparison base they are divided through it, and where it
  did not the metric stays empty with a `STILL NEEDS` note. Never estimated into place.
- **A range collapses to the end that understates India's advantage.** A breakdown slot holds one
  number, and a figure a client's own team can beat down costs more than it gains.
- **Structure follows the data.** If the supplied split does not match the seeded parts, the shape
  changes; parts with no figure are removed rather than left empty.

**`npm run data:import -- --reseed-metrics` adopts the catalogue in code over the stored one.** The
plain import preserves what is stored, which is right for a monthly spreadsheet append and wrong when
the definitions themselves have changed in a commit. It is loud about what it discards, and the diff
is the record.

**Columns kept.** Company name, HQ country, revenue band, industry, establishment year, city list,
FTE range, Fortune Global 500 flag, Forbes Global 2000 flag.

**Columns dropped** — sub-industry (see below), company type, exact GCC headcount, estimated FTEs,
S.No. FTE range is the only headcount field: stored as a normalised `(min, max)` integer pair, which
kills the hyphen-vs-en-dash inconsistency in the source. Every supplied range is already a closed
pair, so no ceilings need inventing. Display strings, location count and tier-2 presence are derived
from range and city list, never stored — storing them is how two columns start disagreeing.

**Peer matching is a continuous score, not a ladder.** Every company in the visitor's industry is
scored and ordered:

```
score = 0.7 × businessSimilarity + 0.3 × bandProximity     ordering: score, then HQ country,
                                                            then GCC size, year, name
```

`businessSimilarity` is the share of the visitor's **IDF-weighted** tag mass a company shares, where
tags come from its business type(s). Weights are rarity within the industry and are **never
hand-authored** — a tag every retailer carries scores zero there and the weighting re-derives itself
as companies are added. `bandProximity` is a three-step function: 1.0 same band, 0.66 adjacent, 0
otherwise.

**Business similarity outranks both revenue band and HQ country, and the reason is in the card.**
A `PeerCard` carries only id, name, cities, headcount band, established year and the Fortune flag —
`toCard` drops `revenueBand`, `hqCountry`, `industry` and `businessTypes`. So a band or market mismatch
is invisible to the visitor while a business mismatch is the first thing they see. HQ country is still a
preference and never a filter, so it cannot change how many peers come back.

Two consequences worth knowing before writing anything against a card. **No copy may claim something a
card cannot show** — a lead promising "companies from your own market first" was shipped and was false,
because H&M and Adidas outrank GAP for a US apparel visitor and nothing on the card reveals it. And **a
test that reads a dropped field gets `undefined`**, so a comparison over it silently passes; assert that
the guard itself holds, or read the field from the dataset.

**A similarity floor of 0.20 applies to `businessSimilarity` ALONE, never the combined score.** A
perfect band match is worth 0.3; on the combined score it would drag a business-irrelevant company
over the line, which is the bug the whole mechanism exists to prevent. The floor can shorten a set —
that is invariant 3, not a defect — and `data:verify` counts how often (147 of 1064), so the trade is
measured rather than guessed.

**Raising the floor does not merely truncate, which is why 0.20 rather than 0.15.** Since a perfect
band match is worth 0.3 of the combined score, a company below the floor can outrank one above it, so
lifting the floor evicts that interloper and promotes a more similar peer. Measured over the whole
dataset, every set whose membership changed between 0.15 and 0.20 gained a company more similar than
the one it lost. The reasoning and the rejected values are in `similarity.ts` beside the constant;
`docs/business-types.md` carries the version for ANSR.

**The old three-rung band ladder survives as `matchPeersByBandLadder`, as the test oracle.** With no
line of business selected the scored engine returns its output company-for-company; that equivalence
is asserted both in `similarity.test.ts` and as a `data:verify` invariant, and is what makes the
whole change provably additive. Do not delete it without deleting those.

**Sub-industry is still never a match key.** 620 values over 1834 companies is not a taxonomy. It is
read on import, collapsed through `scripts/business-type-map.ts` into one of 158 business types, and
discarded. The 35.8% coverage figure that killed it measured it as a FILTER; as a continuous
similarity signal it costs no coverage at all. See `docs/business-types.md`.

**Tags are code, business types are data.** `BUSINESS_TAGS` (137, in `business-tags.ts`) is the
scoring substrate: a tag nobody else carries matches nothing, and deleting one silently re-scores
every peer set, so changing the vocabulary is a code change — the same reasoning as `METRIC_LENSES`.
Business types are admin-editable, because ANSR must be able to add "Quick commerce" without a
developer. **Every tag must be carried by at least two business types**, asserted by `data:verify`:
a one-type tag can only be shared in a type-against-itself comparison and is therefore dead, and
that rule is what stops the vocabulary drifting back towards 620 values of one member each.

**Matching never leaves the industry.** Measured consequences the copy has to carry rather than the
data hide: Education has six companies, so it fills all five slots from its own industry and no
further; Electrical & Electronics has two, so it stays three short and says so. Relaxing the
boundary — industry as a heavily-weighted tag rather than a filter, so a footwear brand could see a
global personal-care brand — is cheap under this architecture and is a separate decision.

**A company's business types must belong to its own industry**, enforced by the schema. So an
industry rename cascades into `businessTypes[].industry` as well as into companies, and deleting an
industry drops the types scoped to it. Miss either and the publish fails referential integrity from
an edit the UI reported as successful.

**An untagged company is a safe state, not a gap.** It matches at industry level exactly as before
business types existed, which is what let the tagging roll out one industry at a time. 66 companies
are deliberately untagged and listed as such.

**`taxonomy.revenueBands` is ordered ascending, and that order is the contract** — step 2 above is
index arithmetic on the array. Nothing sorts it, anywhere. The taxonomy editor appends a new band at
the end and offers Move up / Move down to place it, and the publish diff reports a reorder as a real
change even when no value was added or removed, because a reorder changes who matches as a peer.

**Taxonomy is a first-class, admin-editable entity.** Industry, revenue band, city, HQ country.
Admin adds a value and it appears in the public dropdowns on the next publish — no code change, no
developer involved. Renaming a value **cascades into every company that referenced it**; without the
cascade the publish fails referential integrity, which is correct but useless. Deleting a value still
in use is refused in the editor, where the reason can be explained, rather than at the schema gate.

**The four function areas and four lenses are enums, not taxonomy.** They come from the brief and
Screen 2's tab structure, so there is nothing for an admin to add. The metric editor can rename a
metric, rewrite its question, and add, rename or remove the parts and axes of its shape — but not add
or delete a whole metric, and not change its format, its function area, its lens, its gating or its
`atLeast` floor marker. If a genuinely new metric is ever needed, that is a code change to the
catalogue, deliberately. Because six titles now appear on more than one tab, admin's Edit button names
the function area alongside the title — three buttons all called "Edit Bench strength" would leave an
admin unable to tell which copy they had opened, or that there were three.

**`data:verify` checks two different things and the distinction is load-bearing.**

*Invariants* are properties of the code that must hold for any dataset, seed or heavily edited: peer
matching never leaves the industry, a thin industry degrades rather than pads, HQ country never changes
how many peers come back, the largest-in-industry panel is never empty, known revenue bands stay in
ascending order, a metric shown on several tabs carries one set of figures, every tag is carried by at
least two business types, a company never carries a business type from another industry, no peer is
ever shown below the similarity floor, the floor never empties a set the industry could fill, and
**selecting no line of business reproduces the old band ladder exactly**. A failure here is a bug, and
`--accept` deliberately cannot silence it.

*Profile figures* are the measurements in `docs/data-audit.md` — counts, index membership, aggregate
professionals, city density, coverage, and the metric catalogue's completeness. They pin a snapshot,
and a legitimate admin edit is supposed to move them; entering a batch of metric values is exactly
that. The gated set is recorded **by id rather than counted**, so a metric quietly losing its gate
reads as a named change in the baseline diff instead of a number going down by one. They live in `data/verify-baseline.json`, not hardcoded in the script, so accepting a real
change is `npm run data:verify -- --accept`, which rewrites the baseline and prints the delta. Commit
that file alongside the data change and bring the audit document into line.

That split is what makes the check survivable after a publish. Do not collapse it back into one list
of hardcoded numbers: a check that must be edited or ignored after every legitimate change has
stopped being a check.

**Known gaps** — tracked in `handoff.md`:
- No per-company function list, and there will not be one. `COMMON_FUNCTIONS` in
  `src/data/screen1.ts` is the hardcoded set the brief permits, rendered with a visible line saying
  it is the general India GCC pattern rather than a breakdown of the companies shown. ANSR has still
  to sign off the wording and the order.
- Screen 2 metric values: all 35 populated, from figures ANSR supplied and revised rather than from a
  citable source, and three filled from judgement. **The "Sample, not for publication" stamp has been
  removed at ANSR's request**, so nothing on the page now flags a figure as not-yet-final; `asOf` is
  only ever provenance an admin typed. `data:verify` counts how many state none. See
  `docs/data-audit.md`.

## Architecture map

Maintained as directories acquire responsibilities. The file tree is supplied automatically each
session, so this records **what lives where and why**, never a file listing.

| Path | Responsibility |
| --- | --- |
| `src/app/` | Next.js App Router. `page.tsx` is the tool's only public route and serves BOTH screens; it is `force-dynamic`, because a prerender would bake the taxonomy into the build and defeat the read cache the data layer was designed around. `actions.ts` is the public surface's single server action — deliberately one seam, so there is one place to check that the dataset does not cross. Screen 2 needs no action: its payload does not depend on the visitor, so `page.tsx` builds it per request and passes it down. `globals.css` is the Tailwind theme, aliased onto the brand tokens — it restates no values and clears Tailwind's default palette so off-brand colour is unreachable through a utility class, and it carries the public screens' one motion sequence. |
| `src/data/` | The whole data layer, and the only place that knows the dataset shape. `schema.ts` is the zod contract; `normalize.ts` holds the cleaning primitives, shared by the seed importer and the future admin upload so one file format never gets two parsers; `derive.ts` computes everything not stored; `peers.ts` is the scored matching engine and the Screen 1 counts, pure functions over a loaded dataset, and it keeps `matchPeersByBandLadder` as the equivalence oracle; `similarity.ts` is the IDF weighting, the business-similarity ratio, the band step function and the floor — the single place a peer's rank is decided, and the place to change one number (`SIMILARITY_FLOOR`) if ANSR wants longer sets at lower quality; `business-tags.ts` is the 137-tag vocabulary, code-level for the same reason `METRIC_LENSES` is; `business-type-catalogue.ts` is the 158-type seed, standing to `dataset.businessTypes` exactly as `metric-catalogue.ts` stands to `dataset.metrics`; `diff.ts` is the dataset diff — one computation with two renderers, a console one for the importer and structured output for the admin preview, so the two can never disagree; `metrics.ts` holds the Screen 2 catalogue's behaviour, and `publicMetric` there is the single place a gated value is omitted; `metric-catalogue.ts` is the seed transcribed from the brief and populated, and the place a metric shown on several tabs is authored once and spread onto each with a different id; `store.ts` + `store/{fs,github}-store.ts` are the `DataStore` implementations; `publish-store.ts` selects the write target and refuses to guess; `dataset.ts` is the cached server-side read, invalidated by an mtime-and-size check rather than by anyone remembering to clear it, and is `server-only`, which is what makes "never ship the dataset to the browser" a build error rather than a habit. `screen1.ts` is Screen 1's view model — the pure function that turns a dataset plus five inputs into the couple of kilobytes the Peer View renders, and the place that decides whether a result is degenerate so the copy can say something true about it; `geo.ts` holds the city coordinates the density map plots, hardcoded here because they are geographic fact rather than admin-editable data. `screen2.ts` is Screen 2's view model: it imports the gate rather than `dataset.metrics`, so there is no path around it, and it resolves every metric to pre-formatted figures and bar fractions with no nullable value left in the type — which is where the "an incomplete open metric is dropped, never half-filled" rule becomes something the compiler carries. |
| `src/app/admin/` | The admin surface. Four tabs: Companies, Taxonomy, Metrics, Publish. `login/` sits outside the `(authed)` route group and is the one path without a session; the group's layout is the guard for everything else and hosts the draft provider, so a draft survives moving between tabs. A route group rather than middleware: middleware would be a second runtime to keep Node-only for no gain. |
| `src/app/api/admin/` | Login, logout, diff preview, publish. Each **re-checks the session itself** — deliberate duplication, because a layout cannot guard a route handler and a route that forgot would be silently public. |
| `src/lib/admin/` | Auth and the publish pipeline. `password.ts` is scrypt hashing; `session.ts` is the signed cookie and is `server-only`; `rate-limit.ts` is the two-budget login limiter; `totp.ts` is the optional second factor, RFC 6238 on `node:crypto` with no dependency; `guard.ts` holds the two refusal shapes (redirect for pages, bare 401 for APIs); `publish.ts` is the validate → read → diff pipeline shared by preview and commit; `constants.ts` exists solely because `server-only` throws under `tsx`, so anything a script imports cannot carry the marker. |
| `src/components/admin/` | Client-side admin UI. `draft-provider.tsx` is the browser draft, autosaved locally and pinned to the baseline it started from; its `STORAGE_KEY` is versioned and **is bumped whenever the editable shape changes**, because restoring a draft missing a key produces a schema error the admin cannot fix from the UI. The rest is the app-shell chrome, the company table and editor, the taxonomy editor, the metric catalogue and editor, and the publish view. |
| `src/components/public/` | What both screens use. `tool.tsx` owns the whole phase machine — ask, Peer View, Function View — as component state rather than routes, because the tool cannot own the URL bar, and moves focus to the new `h1` on every transition since nothing else announces a change that was not a navigation. **That focus move is an effect keyed on the phase, never a call beside `setPhase`.** It was written as `setPhase(...)` followed by a `requestAnimationFrame` that focused a ref, which assumes React commits before the next frame; when it does not, the ref is null, the focus call silently does nothing, and the only announcement a screen reader gets for a phase change is dropped. It passed every local test and failed against the deployed build. An effect runs after commit, so the heading is mounted by definition — and it must skip its first run, or an arriving visitor has the keyboard moved and the frame scrolled before they have done anything. `primitives.tsx` is the section, stat, chip, fact-list and provenance shapes plus the number formatters; `screen-header.tsx` is the one motif-bearing header band, with the placement passed in because where a motif can sit depends on where that screen's text is; `closing-cta.tsx` is the single inverse band. This folder exists because Screen 2 wanted most of `screen1/primitives.tsx`: importing across screen folders would have made `screen1` the owner of shapes both screens depend on. |
| `src/components/screen1/` | The public Peer View. `peer-view.tsx` is the ask and answer states; `input-panel.tsx` is the six inputs, with its own field primitives rather than admin's because a public form and a dense internal tool want different densities; `evidence.tsx` and `city-map.tsx` are the blocks. **`copy.ts` holds every visitor-facing sentence**, including the band that offers Screen 2 — the words before a visitor decides to go on are this screen's problem. `use-frame-height.ts` negotiates height with the hosting page. |
| `src/components/screen2/` | The public Function View. `function-view.tsx` is the screen and the four function tabs, built on the Radix Tabs primitive rather than the registry wrapper — 44px triggers, no `transition-all`, no shadow. `metric-card.tsx` renders the five value shapes and, separately, the shape-only placeholder for a withheld one: static, hatched and uniform, so it reads as sealed rather than as loading. There are deliberately no group headings inside a tab, because four public subheadings would have been the internal lenses re-lettered. `copy.ts` holds every visitor-facing sentence, as on Screen 1. |
| `src/components/ui/` | shadcn/ui components, unmodified from the registry. On-brand because `globals.css` maps the registry's contract variables onto brand tokens. |
| `data/` | `dataset.json` — the published dataset, tracked in git. Pretty-printed on purpose: a reviewable diff is the reason there is no database. `verify-baseline.json` holds the profile figures `data:verify` compares against; also tracked, and updated only by `data:verify -- --accept`. |
| `assets/brand/` | Brand source of truth. `tokens.css` is authoritative. Motifs adapted, never pasted. |
| `public/brand/` | Motifs already adapted for a specific placement, served as static files. Derived output, not source — each one is reproducible from `assets/brand/` with a `scripts/brand_asset.py` command recorded next to where it is used. |
| `.tastemaker/` | `style-lock.md` — both public screens' visual decisions and the reasoning behind them, so a third surface reuses rather than re-derives. It restates no token values; `design-stack.md` and `tokens.css` outrank it. |
| `tests/unit/` | Vitest, node environment, no jsdom. Pure and server-side logic: hashing, session signing, TOTP, the rate limiter, the diff, the schema, the cleaning primitives, the metric catalogue and its gate, the GitHub store against a stubbed `fetch`, and the publish pipeline against a temp file. `vitest.config.ts` resolves the `react-server` condition, which is how these import a `server-only` module at all. |
| `tests/browser/` | Playwright against a real `next build && next start`, on its own copy of the dataset. Covers what a unit test structurally cannot: the draft lifecycle, autosave, restore after reload, the stale-baseline conflict, and focus behaviour. Serial, one worker — the server holds the rate limiter and the dataset cache in memory, so parallelism would make test order part of the result. Numbered specs run in reading order; `6-lockout.spec.ts` exhausts the limiter and must stay last. The `public` project covers both public screens and runs first, before the publish spec rewrites the fixture. Each project's `testMatch` is a narrow pattern, so a spec numbered outside all of them lands in no project and silently never runs — `helpers.ts` also owns `DRAFT_STORAGE_KEY`, so a provider bump is one edit rather than eight. |
| `scripts/` | Maintenance tools, run by hand, never at request time. Python: `brand_lint.py` enforces tokens, `brand_asset.py` adapts SVGs, `inspect_xlsx.py` profiles data drops. TypeScript via `tsx`: `import-seed.ts` is the xlsx → JSON pipeline, `verify-data.ts` reproduces every figure in `docs/data-audit.md` from the published dataset and exits non-zero if one moves, `admin-hash.ts` mints the two admin env values from a TTY prompt so the password never lands in shell history. `business-type-map.ts` is the classification table — 601 sub-industry mappings plus 568 per-company decisions, keyed by `industry||name` because company names are not unique even case-insensitively — and it is the reviewable artifact behind `docs/business-types.md`. `check-business-tags.ts` and `check-company-types.ts` are the authoring checks for that table, run by hand while editing it; `data:verify` carries the same properties as invariants once published. |
| `docs/` | Deep reference, read on demand. Not steering. `brief.md` is the transcription of the source mind map — read it, not the image. `data-audit.md` is the profile of the source database. `business-types.md` is the peer-matching vocabulary: why tags rather than sub-industry, how the score works, and the 158 types by industry — the document to hand ANSR when they want to check the business judgement. |
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
