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
- **`fin-asset-management`** → split into `fin-asset-management` (asset managers / PE / wealth, id kept)
  and `fin-fund-services` (fund administration & asset servicing: Citco, IQ-EQ, Alter Domus, Apex,
  AMICORP, Formidium, FNZ + custody banks BNY, State Street, Northern Trust). Distinguishers
  `services-firm`+`outsourcing-bpo` (latter unique in BFSI). Result: a $1–5 Bn asset-management visitor
  leads with real managers (Invesco/DE Shaw/Vanguard/Julius Baer/EQT) where Apex & FNZ had been top-five;
  short sets 154→154, coherence 0.9185→0.9188. Finer categories are world knowledge — ANSR sign-off.
- **`sw-it-services`** → split into `sw-it-services` (IT & Digital Engineering Services, id kept) and
  `sw-content-services` (Localization & Content Services: Lionbridge, RWS Group, Straive, Jouve,
  i-Merit, Centific). Needed a NEW atom `content-language-services` — added to `business-tags.ts` with a
  second carrier `prof-bpo` (BPO content/language labour) so the ">=2 types" rule holds, and rare in
  Software & Internet where only `sw-content-services` carries it. Distinguisher on the sibling is
  `billable-hours` (dropped from the content type). Result: a $1–5 Bn localization visitor now leads with
  Lionbridge / Straive / Centific / RWS where systems integrators had filled the top; the integrator
  visitor no longer leads with content firms. Short sets 154→154, coherence 0.9188→0.9182 (both round to
  0.918). Finer categories are world knowledge — ANSR sign-off.
- **`hc-pharma`** → split into `hc-pharma` (innovator / prescription / generics drug makers, id kept)
  and `hc-consumer-health` (Consumer Health & OTC: Haleon, Kenvue, Opella Healthcare). Distinguishers
  `brand-owner` + `personal-care` — carried by NO other Healthcare type, so both are maximally rare
  inside the industry; consumer-health also drops the innovator atoms (`clinical-research`,
  `r-and-d-intensive`, `biotech`, `clinical-regulated`, `b2b`). No new atom needed — all three
  distinguishers (incl. `b2c`) are reused from retail / CPG brands. Shared core kept
  (`process-manufacturing`, `pharmaceutical`, `regulated`, `supply-chain-heavy`). Result: a $10–20 Bn
  pharma visitor now leads with Viatris / Regeneron / Teva / Sandoz / Astellas where Kenvue and Haleon
  (OTC) had been in the top five; a consumer-health visitor leads with Kenvue / Haleon / Opella. Short
  sets 154→154, coherence 0.9182→0.9163 (the price of three consumer-health sets now carrying pharma
  only as secondary peers, same tradeoff as payments). Generics stay in `hc-pharma`. Finer categories
  are world knowledge — ANSR sign-off.

## Status

- **Queue (finite, judge each by member list first):** empty — every named candidate has been split or
  reviewed. Only the one-time sweep remains.
- **Reviewed — kept as-is, do NOT re-open:** when a session examines a bucket and decides it is genuine
  peers, it records the id here so no future session reconsiders it.
  - **`auto-components`** (Automotive Components (Tier 1), 51 companies) — NO-GO. The bucket is dominated
    by large diversified Tier-1 suppliers (Bosch, Denso, Continental, Hyundai Mobis, Valeo, Magna, ZF,
    Aptiv, Marelli, Adient, Lear, Michelin, Schaeffler, Tenneco, Borgwarner, Dana, GKN, Nexteer, Forvia)
    that a CIO accepts as peers — they run the same shape of engineering/manufacturing GCC in India. The
    genuinely distinct niches are small and scattered: pure automotive electronics (Aptiv, Visteon,
    MobileDrive, Danlaw), tires (Michelin, n=1), bearings (Schaeffler, Timken, Musashi, n=3),
    seating/interiors. The strongest candidate — electronics via the rare-in-Automotive
    `electronic-components` atom — fails the lead-own-band guardrail: its four members sit in four
    non-adjacent revenue bands (`<$100Mn`, `$100–500Mn`, `$1–5Bn`, `$10–20Bn`), so an electronics visitor
    can never lead with its own members at its band; the split would only reorder within a shared core and
    add dropdown noise. Over-splitting the rest would separate genuine peers. Left intact.
  - **`tel-operator`** (Telecom Network Operator, 54 companies) — NO-GO. It mixes true carriers (Verizon,
    AT&T, Deutsche Telekom, Vodafone, BT, Orange, T-Mobile, Comcast) with networking-hardware, test and
    infrastructure vendors (Belden, Molex, Netgear, f5, Spirent, EXFO, VIAVI, Equinix). But the stray
    vendors sit across non-adjacent revenue bands and can never LEAD their own band — the same
    lead-own-band failure as `auto-components`. The real fix, if any, is per-company re-mapping into the
    existing `tel-equipment` type: a data decision, not a peer-split into new finer types. Left intact.
- **One-time sweep, do it LAST:** after the queue is empty, run `analyze-conflation.ts` once over every
  type with ≥15 members; add only the ones that genuinely conflate (see "Do NOT split when"). Mark this
  `sweep: not yet done` / `sweep: done` so it happens exactly once.
  - `sweep: done` — ran `npx tsx scripts/analyze-conflation.ts` over every ≥15-member type and examined
    each. Split NONE. The large software types (`sw-security`, `sw-data-analytics`, `sw-devtools`,
    `sw-healthcare`, `sw-fintech-software`, `sw-telecom-software`, `sw-crm-cx`, `sw-martech`,
    `sw-supply-chain`) each build one shape of software a CIO accepts as peers; the large finance,
    manufacturing, healthcare and semiconductor types (`fin-retail-bank`, `fin-investment-bank`,
    `fin-insurance-life`, `semi-fabless`, `mfg-electrical-equipment`, `mfg-industrial-equipment`,
    `mfg-motion-control`, `mfg-hvac-building`, `hc-medical-devices`, `hc-health-it`, `ce-devices`,
    `med-advertising`, `enr-oilfield-services`, `ret-apparel`) are likewise genuine peers. `tel-operator`
    was the one borderline case and is recorded above as a no-go. No code or data changed.

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

The peer-split effort is complete — no conflated buckets remain.
