# Peer-bucket split — running playbook

Reference, read on demand. Not steering. This file drives an ONGOING, batched effort to split
peer-matching business types that conflate distinct businesses, and it is the single source of truth for
what is done and what is left. The human pastes one fixed trigger each session; this file does the rest.

Method and reasoning live in `docs/business-types.md`, section "Splitting a bucket that conflated
distinct businesses". This file is the operating loop, not the theory.

## How you (the human) use this — paste this ONE line each session

> Execute the peer-split playbook at `docs/peer-split-playbook.md`: do exactly what its "Current batch
> prompt" block says, then update the file as that block instructs. If that block says the effort is
> complete, just tell me that and stop.

That is the whole input, every session — you never open or copy anything else. Then:

1. The agent reads this file, does one bucket end to end, proves it did not regress, and stops.
2. Review its before/after numbers and the finer categories it chose (world-knowledge calls — your /
   ANSR sign-off point).
3. Say "commit" when happy (it will not commit unless asked).
4. The agent has already recorded the finished work in the Completed log and rewritten the "Current
   batch prompt" to the next bucket. Paste the same one line again next session.

When everything is done, the "Current batch prompt" block will read only a completion line, and pasting
the trigger just gets you "the effort is complete" — nothing runs. The loop is finite and cannot loop
forever; see "When to stop".

## Completed log — APPEND-ONLY, never delete (this is what stops work being redone)

Every finished batch is recorded here, permanently. A session must read this before acting and must
never re-do a bucket listed here.

- **`fin-payments`** → split into `fin-payments` (payment processing & gateways, id kept),
  `fin-card-network`, `fin-money-transfer`, `fin-expense-cards`. Result: a processing visitor gets
  processors not card networks; Adyen rank 16→3 at its band; short sets 154→154, coherence 0.921→0.918.

## Status

- **Queue (finite, judge each by member list first):** `fin-asset-management` (NEXT), then
  `sw-it-services` (localization vs IT services; likely needs a new atom), then `hc-pharma`
  (consumer-health), then `auto-components`.
- **Reviewed — kept as-is, do NOT re-open:** (none yet) — when a session examines a bucket and decides
  it is genuine peers, it records the id here so no future session reconsiders it.
- **One-time sweep, do it LAST:** after the queue is empty, run `analyze-conflation.ts` once over every
  type with ≥15 members; add only the ones that genuinely conflate (see "Do NOT split when"). Mark this
  `sweep: not yet done` / `sweep: done` so it happens exactly once.
  - `sweep: not yet done`

## When to stop (the effort is DONE when)

All three hold — then REPLACE the "Current batch prompt" block with exactly:
`The peer-split effort is complete — no conflated buckets remain.`

1. The **Queue** is empty.
2. The **one-time sweep** is marked done, and every ≥15-member type is split, queued, or in
   **Reviewed — kept as-is**.
3. No bucket is left that a CIO would look at and say "these are not the same business."

Splitting is NOT the goal — correct peer ordering is. A type that already groups genuine peers must be
LEFT ALONE. Never invent work to keep the loop going.

## Guardrails that define "better, not worse"

- Short-set count must not rise, coherence must not drop (`scripts/measure-peers.ts`).
- The finer-type visitor must LEAD with its own members at its own band.
- `data:verify` moves only the business-type count; "floor shortens" must hold.
- Full gate green: `tsc`, `vitest`, `test:browser`, `brand_lint.py`.

## Do NOT split when (any one of these) — record the bucket in "Reviewed — kept as-is" instead

- The members are genuine peers a CIO would accept together (all big pharma, all car makers, all banks).
- No RARE-in-industry distinguishing atom exists and a defensible new one (with a second carrier) does
  not either — a weak distinguisher does not reorder anything and just adds dropdown noise.
- A split would create finer types so small they shorten peer sets (watch the short-set count).
- Over-splitting: a business is one line, not several. When in doubt, leave it and record the review.

---

## Current batch prompt

> **Task: continue splitting conflated peer-matching business types — one batch, part of an ongoing
> effort. Read `docs/peer-split-playbook.md` end to end first (especially the Completed log — never redo
> a bucket listed there) and `docs/business-types.md`, section "Splitting a bucket that conflated
> distinct businesses".**
>
> Background: peer ordering *within* a sub-industry is band-then-size, because tags live on the business
> type, not the company. That is correct when a type groups genuine peers and wrong when it lumps
> distinct businesses. The fix is to split the conflated type into finer ones. The payments batch is the
> worked example.
>
> **This batch: `fin-asset-management` (40 companies).** It conflates:
> - Asset managers / PE / wealth (keep here): BlackRock, Blackstone, KKR, Apollo, Ares, Goldman Sachs,
>   Morgan Stanley, Vanguard, Invesco, Franklin, Fidelity, Macquarie, Nomura, and similar.
> - Fund administration / corporate & fund services (split out): Citco, IQ-EQ, Alter Domus, Apex Group,
>   AMICORP, Formidium, FNZ Group.
> - Custodians (decide: own type or fold into fund-services): BNY, State Street, Northern Trust.
>
> A fund administrator is a back-office services firm, not a peer of BlackRock. Propose `fin-fund-services`
> distinguished by `services-firm`/`outsourcing-bpo` (rare in BFSI, so strong); asset managers keep
> `asset-management`+`capital-markets`.
>
> **First, a go/no-go.** Inspect the members (step 1) and apply "Do NOT split when". If it does NOT
> genuinely conflate, do NOT split: record its id under "Reviewed — kept as-is", then rewrite this block
> for the next Queue item and stop — do not ship a pointless split.
>
> **Method — do exactly this, in order:**
> 1. Inspect and baseline: `npx tsx scripts/analyze-conflation.ts fin-asset-management`, then
>    `npx tsx scripts/measure-peers.ts` and `... fin-asset-management "$1 Bn – $5 Bn"`. Record the
>    before numbers.
> 2. Design finer types: each carries **one atom the siblings lack** (similarity is asymmetric — a
>    company ranks below a peer only if the VISITOR carries a tag it lacks); prefer a **rare-in-industry**
>    distinguisher (`b2c` is too weak); all keep the **shared core** so siblings stay above the 0.20 floor
>    and no set shortens; **reuse existing atoms** so every tag stays on ≥2 types (add a new atom only if
>    unavoidable, with a second carrier). Confirm any near-duplicate pair the match-quality test names
>    still holds.
> 3. Edit `src/data/business-type-catalogue.ts` (keep an id to avoid churn), re-map companies in
>    `scripts/business-type-map.ts` (`COMPANY_TO_TYPES`), add a `src/data/search-terms.ts` entry for every
>    new type.
> 4. `npx tsx scripts/import-seed.ts --reseed-business-types --dry-run`, check the diff, then run it
>    without `--dry-run`.
> 5. Prove **better, not worse**: short sets must not rise, coherence must not drop, the finer-type
>    visitor must lead with its own members at its band. `npm run data:verify` then `-- --accept`. Update
>    `docs/business-types.md` and `docs/data-audit.md` counts, the business-type count assertion in
>    `tests/browser/3-business-types.spec.ts`, and any renamed-row references in `tests/browser/0-search.spec.ts`.
>    Extend `tests/unit/peer-resolution.test.ts` to assert this split.
> 6. Full gate, all green before stopping: `npx tsc --noEmit`, `npx vitest run`, `npm run test:browser`
>    (rebuilds the fixture — raw `playwright test` does not), `python3 scripts/brand_lint.py`.
>
> **Constraints:** if a guardrail regresses, stop and reconsider the design rather than shipping. Do only
> this one bucket. The finer categories are world knowledge, not in the source — flag them for ANSR
> sign-off. Do not commit unless asked; leave the change set staged in one tree and note it.
>
> **Before you finish — update `docs/peer-split-playbook.md` (mandatory bookkeeping):**
> 1. If you split it: APPEND a one-line entry to the **Completed log** (bucket → new types + one-line
>    result), and remove it from the **Queue**. If you kept it: add its id to **Reviewed — kept as-is**
>    and remove it from the **Queue**. If you ran the sweep: flip its marker to `sweep: done` and log any
>    buckets it added.
> 2. Then apply **When to stop**: if the Queue is empty AND the sweep is done, REPLACE this entire
>    "Current batch prompt" block with exactly `The peer-split effort is complete — no conflated buckets
>    remain.` Otherwise REWRITE this block to target the next Queue item (or the one-time sweep if the
>    Queue is empty but the sweep is not done), carrying forward the method, guardrails, "Do NOT split
>    when", the go/no-go step, and this bookkeeping instruction verbatim.
> 3. Never invent a candidate to keep the loop alive — empty Queue plus a done sweep means STOP.
