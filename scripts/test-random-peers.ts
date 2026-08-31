/**
 * Ad-hoc peer-set sanity harness. NOT part of the suite — run by hand.
 *
 *   npx tsx scripts/test-random-peers.ts [count] [seed]
 *
 * Picks `count` random companies (default 12) from the published dataset, treats
 * each as the visitor using its OWN industry / revenue band / HQ country / first
 * business type, runs the real `matchPeers`, prints the returned set with scores
 * and shared tags, and asserts the invariants that define a correct peer set:
 *
 *   - every peer is in the visitor's industry (hard boundary)
 *   - the visitor never appears in its own set
 *   - the set is ordered by score descending
 *   - when a business type was given, every peer clears the similarity floor
 *   - peer count never exceeds the limit
 *
 * A seed makes a run reproducible; omit it for a fresh random sample.
 */
import process from "node:process";

import { fteMidpoint } from "../src/data/derive";
import { matchPeers, type VisitorInput } from "../src/data/peers";
import type { BusinessType, Company, Dataset } from "../src/data/schema";
import {
  SIMILARITY_FLOOR,
  buildSimilarityModel,
  scoreCompany,
  visitorTags,
} from "../src/data/similarity";
import { createFsDataStore } from "../src/data/store/fs-store";

/** Tiny deterministic PRNG so a seed reproduces a sample. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sample<T>(items: readonly T[], n: number, rnd: () => number): T[] {
  const pool = [...items];
  const out: T[] = [];
  while (out.length < n && pool.length > 0) {
    const i = Math.floor(rnd() * pool.length);
    const [picked] = pool.splice(i, 1);
    if (picked !== undefined) out.push(picked);
  }
  return out;
}

function fteLabel(c: Company): string {
  return `${c.fte.min.toLocaleString()}–${c.fte.max.toLocaleString()}`;
}

function typeName(id: string, types: readonly BusinessType[]): string {
  return types.find((t) => t.id === id)?.name ?? id;
}

async function main(): Promise<void> {
  const count = Number(process.argv[2]) || 12;
  const seed =
    process.argv[3] !== undefined
      ? Number(process.argv[3])
      : Math.floor(Math.random() * 1e9);
  const rnd = mulberry32(seed);

  const dataset: Dataset = await createFsDataStore().read();
  const types = dataset.businessTypes;

  console.log(
    `\nPeer-set sanity check — ${count} random companies, seed ${seed}\n` +
      `dataset: ${dataset.companies.length} companies, ${types.length} business types, ` +
      `floor ${SIMILARITY_FLOOR}\n`,
  );

  const visitors = sample(dataset.companies, count, rnd);
  let totalFailures = 0;

  for (const v of visitors) {
    const input: VisitorInput = {
      companyName: v.name,
      industry: v.industry,
      revenueBand: v.revenueBand,
      hqCountry: v.hqCountry,
      businessTypeId: v.businessTypes[0],
    };

    const result = matchPeers(dataset, input);

    // Re-score the visitor's own peers to expose the numbers behind the order.
    const model = buildSimilarityModel(dataset, v.industry);
    const vTags = visitorTags(types, input.businessTypeId);

    const btLabel = input.businessTypeId
      ? typeName(input.businessTypeId, types)
      : "(none — band-only match)";

    console.log("─".repeat(92));
    console.log(
      `VISITOR  ${v.name}  [${v.hqCountry}]\n` +
        `         ${v.industry}  ·  ${v.revenueBand}  ·  ${fteLabel(v)} FTE\n` +
        `         sub-industry / business type: ${btLabel}\n` +
        `         industry pool: ${result.industryTotal}  ·  ` +
        `same business type: ${result.sameBusinessType}  ·  ` +
        `close matches: ${result.closeMatches}  ·  ` +
        `shortfall: ${result.shortfall}${result.floorShortened ? " (floor shortened)" : ""}`,
    );
    if (result.basis.sharedTags.length > 0) {
      console.log(`         shared across all peers: ${result.basis.sharedTags.join(", ")}`);
    }
    console.log("");

    result.peers.forEach((p, i) => {
      const scored = scoreCompany(p, {
        model,
        revenueBands: dataset.taxonomy.revenueBands,
        visitorTags: vTags,
        visitorBand: v.revenueBand,
      });
      const bt = p.businessTypes.map((id) => typeName(id, types)).join(", ") || "untagged";
      console.log(
        `   ${i + 1}. ${p.name}  [${p.hqCountry}]  ${p.revenueBand}  ${fteLabel(p)} FTE\n` +
          `      score ${scored.score.toFixed(3)}  ` +
          `(business ${scored.businessSimilarity.toFixed(3)} · band ${scored.bandProximity.toFixed(2)})  ` +
          `— ${bt}`,
      );
    });
    if (result.peers.length === 0) console.log("   (no peers cleared the floor)");
    console.log("");

    // ── Invariants ───────────────────────────────────────────────────────────
    const problems: string[] = [];

    for (const p of result.peers) {
      if (p.industry !== v.industry) {
        problems.push(`peer "${p.name}" is in ${p.industry}, not ${v.industry}`);
      }
      if (p.name.trim().toLowerCase() === v.name.trim().toLowerCase()) {
        problems.push(`visitor appears in its own peer set`);
      }
    }

    const scores = result.peers.map(
      (p) =>
        scoreCompany(p, {
          model,
          revenueBands: dataset.taxonomy.revenueBands,
          visitorTags: vTags,
          visitorBand: v.revenueBand,
        }).score,
    );
    for (let i = 1; i < scores.length; i += 1) {
      const current = scores[i];
      const previous = scores[i - 1];
      if (current !== undefined && previous !== undefined && current > previous + 1e-9) {
        problems.push(`out of order: peer ${i + 1} scores higher than peer ${i}`);
      }
    }

    if (input.businessTypeId) {
      for (const p of result.peers) {
        const s = scoreCompany(p, {
          model,
          revenueBands: dataset.taxonomy.revenueBands,
          visitorTags: vTags,
          visitorBand: v.revenueBand,
        });
        if (s.businessSimilarity < SIMILARITY_FLOOR - 1e-9) {
          problems.push(
            `peer "${p.name}" below floor (${s.businessSimilarity.toFixed(3)} < ${SIMILARITY_FLOOR})`,
          );
        }
      }
    }

    if (result.peers.length > result.limit) {
      problems.push(`returned ${result.peers.length} peers, over limit ${result.limit}`);
    }

    if (problems.length === 0) {
      console.log("   ✓ invariants hold");
    } else {
      totalFailures += problems.length;
      for (const p of problems) console.log(`   ✗ ${p}`);
    }
    console.log("");
  }

  console.log("═".repeat(92));
  console.log(
    totalFailures === 0
      ? `ALL CLEAR — ${visitors.length} visitors, 0 invariant violations. Re-run with the same ` +
          `seed (${seed}) to reproduce.`
      : `${totalFailures} invariant violation(s) across ${visitors.length} visitors — see ✗ lines above.`,
  );
  console.log("");

  if (totalFailures > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
