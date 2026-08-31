/**
 * Ad-hoc peer-QUALITY audit. NOT part of the suite — run by hand.
 *
 *   npx tsx scripts/audit-peer-quality.ts
 *
 * The engine is correct; this asks the different question the sanity harness
 * cannot: WHERE is peer quality structurally weak because of the DATA, not the
 * code. Three buckets that produce "peers that are not really the same business":
 *
 *   1. Business types with only ONE member — that visitor can never peer with its
 *      own kind, so its set is filled from adjacent businesses (DP World → shipping
 *      lines). Same failure class as the empty `avi-services`.
 *   2. Untagged companies — fall through to band-only matching, so peers are just
 *      "biggest in the industry", often unrelated (the Manufacturing coherence gap).
 *   3. Industries with a low tagged share — the pool the engine draws from is thin.
 */
import process from "node:process";

import type { Dataset } from "../src/data/schema";
import { createFsDataStore } from "../src/data/store/fs-store";

async function main(): Promise<void> {
  const dataset: Dataset = await createFsDataStore().read();
  const typeName = new Map(dataset.businessTypes.map((t) => [t.id, t.name]));

  // Members per business type.
  const members = new Map<string, number>();
  for (const c of dataset.companies) {
    for (const id of c.businessTypes) {
      members.set(id, (members.get(id) ?? 0) + 1);
    }
  }

  const singletons = [...members.entries()]
    .filter(([, n]) => n === 1)
    .map(([id]) => `${typeName.get(id) ?? id} (${id})`)
    .sort();

  const declaredTypes = new Set(dataset.businessTypes.map((t) => t.id));
  const unusedTypes = [...declaredTypes]
    .filter((id) => !members.has(id))
    .map((id) => `${typeName.get(id) ?? id} (${id})`)
    .sort();

  // Untagged companies, per industry.
  const byIndustry = new Map<string, { total: number; untagged: number }>();
  for (const c of dataset.companies) {
    const e = byIndustry.get(c.industry) ?? { total: 0, untagged: 0 };
    e.total += 1;
    if (c.businessTypes.length === 0) e.untagged += 1;
    byIndustry.set(c.industry, e);
  }

  console.log(`\nPeer-quality audit — ${dataset.companies.length} companies, ` +
    `${dataset.businessTypes.length} business types\n`);

  console.log(`── Single-member business types (${singletons.length}) ` +
    `— visitor cannot peer with its own kind ──`);
  for (const s of singletons) console.log(`   • ${s}`);

  if (unusedTypes.length > 0) {
    console.log(`\n── Business types with ZERO members (${unusedTypes.length}) ` +
      `— selectable, but empty ──`);
    for (const s of unusedTypes) console.log(`   • ${s}`);
  }

  console.log(`\n── Untagged share by industry (untagged fall through to band-only) ──`);
  const rows = [...byIndustry.entries()]
    .map(([industry, e]) => ({
      industry,
      total: e.total,
      untagged: e.untagged,
      pct: e.untagged / e.total,
    }))
    .sort((a, b) => b.pct - a.pct);
  for (const r of rows) {
    if (r.untagged === 0) continue;
    const pct = (r.pct * 100).toFixed(0).padStart(3);
    console.log(`   ${pct}%  ${r.untagged}/${r.total}  ${r.industry}`);
  }
  const fullyTagged = rows.filter((r) => r.untagged === 0).length;
  console.log(`   (${fullyTagged} industries fully tagged)`);
  console.log("");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
