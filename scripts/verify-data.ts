/**
 * Verifies the published dataset. Two kinds of check, and the distinction is the
 * whole point of this file.
 *
 *   npm run data:verify              # run both
 *   npm run data:verify -- --accept  # re-baseline the profile figures
 *
 * **Invariants** must hold for any dataset this app will ever serve, seed or
 * heavily edited. The peer ladder never leaves the industry; a thin industry
 * degrades rather than pads; peers are ordered by size within a rung; HQ country
 * sorts but never filters; the largest-in-industry panel walks down the bands and
 * is never empty; revenue bands stay in ascending order. These are properties of
 * the code, so an edit to the data must never move them. A failure here is a bug.
 *
 * **Profile figures** are the measurements in docs/data-audit.md — company count,
 * index membership, aggregate professionals, city density, coverage. They pin a
 * snapshot, and a legitimate admin edit is *supposed* to move them. They live in
 * data/verify-baseline.json rather than hardcoded here, so accepting a real change
 * is `--accept`, which rewrites the baseline and prints the delta, instead of
 * hand-editing assertions until the script goes quiet.
 *
 * That split is what makes this runnable after a publish. Before, one flipped
 * Forbes flag failed the whole run and the only remedies were editing the script
 * or ignoring it — and a check that gets ignored has stopped being a check.
 *
 * Exits non-zero if any invariant fails, or if a profile figure moved without
 * --accept.
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

import { fteMidpoint, hasTier2Presence } from "../src/data/derive";
import { SEED_REVENUE_BAND_ORDER } from "../src/data/normalize";
import {
  DEFAULT_PEER_LIMIT,
  adjacentBands,
  cityDensity,
  companiesInIndustry,
  largestInIndustry,
  matchPeers,
  nationalScale,
} from "../src/data/peers";
import type { Company, Dataset } from "../src/data/schema";
import { createFsDataStore } from "../src/data/store/fs-store";

const BASELINE_PATH = path.join(process.cwd(), "data", "verify-baseline.json");

interface Baseline {
  /** Free text: what this baseline was taken from, for a human reading a diff. */
  describedAs: string;
  recordedAt: string;
  figures: Record<string, unknown>;
}

let invariantFailures = 0;
const profileDrift: Array<{ label: string; from: unknown; to: unknown }> = [];
const measured: Record<string, unknown> = {};

/** An invariant. Must hold for any dataset; a failure is a bug in the code. */
function invariant(label: string, actual: unknown, expected: unknown): void {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) invariantFailures += 1;
  const detail = ok
    ? JSON.stringify(actual)
    : `${JSON.stringify(actual)} != ${JSON.stringify(expected)}`;
  console.log(`  ${ok ? "ok  " : "FAIL"} ${label}: ${detail}`);
}

/**
 * A profile figure. Recorded, then compared against the baseline. Movement is
 * drift to be confirmed, not a failure to be fixed.
 */
function profile(label: string, actual: unknown, baseline: Baseline | null): void {
  measured[label] = actual;
  if (!baseline) {
    console.log(`  new  ${label}: ${JSON.stringify(actual)}`);
    return;
  }
  if (!(label in baseline.figures)) {
    console.log(`  new  ${label}: ${JSON.stringify(actual)} (not in the baseline)`);
    profileDrift.push({ label, from: undefined, to: actual });
    return;
  }
  const expected = baseline.figures[label];
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    console.log(`  ok   ${label}: ${JSON.stringify(actual)}`);
    return;
  }
  console.log(
    `  MOVED ${label}: ${JSON.stringify(expected)} -> ${JSON.stringify(actual)}`,
  );
  profileDrift.push({ label, from: expected, to: actual });
}

function report(label: string, value: unknown): void {
  console.log(`  --   ${label}: ${JSON.stringify(value)}`);
}

/** Coverage: a company is covered when five peers can be shown for it. */
function coverage(
  dataset: Dataset,
  tiers: ReadonlyArray<"same-band" | "adjacent-band">,
): number {
  const byIndustry = new Map<string, Company[]>();
  for (const company of dataset.companies) {
    const bucket = byIndustry.get(company.industry);
    if (bucket) bucket.push(company);
    else byIndustry.set(company.industry, [company]);
  }

  let covered = 0;
  for (const company of dataset.companies) {
    const pool = byIndustry.get(company.industry) ?? [];
    const bands = new Set<string>([company.revenueBand]);
    if (tiers.includes("adjacent-band")) {
      for (const band of adjacentBands(dataset, company.revenueBand)) {
        bands.add(band);
      }
    }
    const peers = pool.filter(
      (other) => other.id !== company.id && bands.has(other.revenueBand),
    );
    if (peers.length >= DEFAULT_PEER_LIMIT) covered += 1;
  }
  return covered;
}

async function readBaseline(): Promise<Baseline | null> {
  try {
    const { readFileSync } = await import("node:fs");
    return JSON.parse(readFileSync(BASELINE_PATH, "utf8")) as Baseline;
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const accept = process.argv.slice(2).includes("--accept");
  const dataset = await createFsDataStore().read();
  const baseline = await readBaseline();

  if (!baseline) {
    console.log(
      `\nNo baseline at data/verify-baseline.json — every profile figure below is new.\nRun \`npm run data:verify -- --accept\` to record it.`,
    );
  }

  /* ======================================================================
     INVARIANTS — must hold for any dataset
     ====================================================================== */

  console.log("\nInvariants — structural properties no edit may break");
  invariant(
    "every FTE range is a closed pair",
    dataset.companies.filter((c) => c.fte.max < c.fte.min).length,
    0,
  );
  invariant(
    "years are integers, no float strings",
    dataset.companies.filter((c) => !Number.isInteger(c.establishedYear)).length,
    0,
  );
  invariant(
    "company ids are unique",
    dataset.companies.length - new Set(dataset.companies.map((c) => c.id)).size,
    0,
  );

  // The bands present must appear in ascending order. Stated as a subsequence
  // check rather than an exact list, because admin may legitimately add a band —
  // what it may never do is reorder the existing ones, which is what an
  // accidental alphabetical sort would look like. Adjacent-band matching is index
  // arithmetic on this array, so the order is data, not presentation.
  const canonicalPresent = SEED_REVENUE_BAND_ORDER.filter((band) =>
    dataset.taxonomy.revenueBands.includes(band),
  );
  invariant(
    "known revenue bands stay in ascending order",
    dataset.taxonomy.revenueBands.filter((band) =>
      (SEED_REVENUE_BAND_ORDER as readonly string[]).includes(band),
    ),
    canonicalPresent,
  );

  console.log("\nInvariants — peer matching behaviour");
  const combos = new Set(
    dataset.companies.map((c) => `${c.industry}\u0000${c.revenueBand}`),
  );
  let shortSets = 0;
  const tierCounts = { "same-band": 0, "adjacent-band": 0, industry: 0 } as Record<
    string,
    number
  >;
  const outsideIndustry: string[] = [];
  const badSort: string[] = [];
  const overIndustrySize: string[] = [];

  for (const combo of combos) {
    const [industry, revenueBand] = combo.split("\u0000") as [string, string];
    const result = matchPeers(dataset, { industry, revenueBand });
    tierCounts[result.tier] = (tierCounts[result.tier] ?? 0) + 1;
    if (result.shortfall !== 0) shortSets += 1;

    if (result.peers.some((peer) => peer.industry !== industry)) {
      outsideIndustry.push(`${industry} / ${revenueBand}`);
    }
    // Never pad: a peer set can never be larger than the industry it came from.
    if (result.peers.length > companiesInIndustry(dataset, industry).length) {
      overIndustrySize.push(`${industry} / ${revenueBand}`);
    }
    // Size must be non-increasing *within a rung*. Across rungs it need not be:
    // an adjacent-band peer always outranks an any-band one however small it is,
    // because the closer revenue match is the stronger claim to comparability.
    const adjacent = new Set(adjacentBands(dataset, revenueBand));
    const rungOf = (company: Company): number =>
      company.revenueBand === revenueBand ? 0 : adjacent.has(company.revenueBand) ? 1 : 2;
    for (let i = 1; i < result.peers.length; i += 1) {
      const previous = result.peers[i - 1];
      const current = result.peers[i];
      if (!previous || !current) continue;
      if (rungOf(previous) > rungOf(current)) {
        badSort.push(`${industry} / ${revenueBand}: rung order broken`);
        break;
      }
      if (
        rungOf(previous) === rungOf(current) &&
        fteMidpoint(current.fte) > fteMidpoint(previous.fte)
      ) {
        badSort.push(`${industry} / ${revenueBand}: size order broken`);
        break;
      }
    }
  }

  invariant("a peer from another industry was never shown", outsideIndustry, []);
  invariant("a peer set never exceeds its own industry", overIndustrySize, []);
  invariant("peers ordered by GCC size within a rung", badSort, []);
  report("industry x band combinations", combos.size);
  report("tier used", tierCounts);

  // HQ country sorts, never filters. Asserted against every industry/band pair
  // that has a same-band peer set, rather than one hand-picked example: adding
  // the preference must never reduce how many peers come back.
  const filteredByCountry: string[] = [];
  for (const combo of combos) {
    const [industry, revenueBand] = combo.split("\u0000") as [string, string];
    const withoutPreference = matchPeers(dataset, { industry, revenueBand });
    const pool = companiesInIndustry(dataset, industry);
    const country = pool[0]?.hqCountry;
    if (!country) continue;
    const withPreference = matchPeers(dataset, { industry, revenueBand, hqCountry: country });
    if (withPreference.peers.length !== withoutPreference.peers.length) {
      filteredByCountry.push(`${industry} / ${revenueBand} / ${country}`);
    }
  }
  invariant(
    "HQ country never changes how many peers come back",
    filteredByCountry,
    [],
  );

  console.log("\nInvariants — largest-in-industry degrades rather than assumes");
  const emptyPanels: string[] = [];
  const panelOutsideIndustry: string[] = [];
  for (const industry of dataset.taxonomy.industries) {
    const largest = largestInIndustry(dataset, industry);
    if (largest.companies.length === 0) emptyPanels.push(industry);
    if (largest.companies.some((c) => c.industry !== industry)) {
      panelOutsideIndustry.push(industry);
    }
  }
  invariant("every industry produces a largest-in-industry panel", emptyPanels, []);
  invariant("that panel never leaves the industry", panelOutsideIndustry, []);

  /* ======================================================================
     PROFILE FIGURES — pinned to a baseline, moved deliberately
     ====================================================================== */

  console.log("\nProfile — shape");
  profile("companies", dataset.companies.length, baseline);
  profile("industries", dataset.taxonomy.industries.length, baseline);
  profile("revenue bands", dataset.taxonomy.revenueBands.length, baseline);
  profile("cities", dataset.taxonomy.cities.length, baseline);
  profile("HQ countries", dataset.taxonomy.hqCountries.length, baseline);
  profile("revenue band order", dataset.taxonomy.revenueBands, baseline);
  profile(
    "largest FTE upper bound",
    Math.max(...dataset.companies.map((c) => c.fte.max)),
    baseline,
  );
  // The audit counts 130 distinct FTE Range *strings*. Two are dash variants of a
  // range already present (`0-50` / `0–50`), so normalising to an integer pair
  // collapses them: 128 is the dash fix working, not data loss.
  profile(
    "distinct FTE ranges after normalising both dash variants",
    new Set(dataset.companies.map((c) => `${c.fte.min}-${c.fte.max}`)).size,
    baseline,
  );

  console.log("\nProfile — index membership and scale");
  const scale = nationalScale(dataset);
  profile("Fortune Global 500", scale.fortuneGlobal500Count, baseline);
  profile("Forbes Global 2000", scale.forbesGlobal2000Count, baseline);
  profile("professionals, all companies", scale.professionals, baseline);
  profile("professionals, Fortune 500 subset", scale.fortuneGlobal500Professionals, baseline);

  console.log("\nProfile — derived fields, never stored");
  profile(
    "tier-2 presence, derived",
    dataset.companies.filter(hasTier2Presence).length,
    baseline,
  );
  const density = cityDensity(dataset);
  profile(
    "top six cities",
    density.slice(0, 6).map((d) => `${d.city} ${d.companies}`),
    baseline,
  );
  profile(
    "multi-city companies",
    dataset.companies.filter((c) => c.cities.length > 1).length,
    baseline,
  );

  console.log("\nProfile — peer ladder coverage, the two figures the ladder was chosen on");
  profile("industry + revenue band", coverage(dataset, ["same-band"]), baseline);
  profile(
    "industry + revenue band +/- 1 step",
    coverage(dataset, ["same-band", "adjacent-band"]),
    baseline,
  );
  profile("industry x band combinations", combos.size, baseline);
  profile("combinations short of five peers", shortSets, baseline);

  console.log("\nProfile — thin industries and empty top bands");
  const topBandEmpty: string[] = [];
  for (const industry of dataset.taxonomy.industries) {
    const highest = dataset.taxonomy.revenueBands.at(-1);
    if (largestInIndustry(dataset, industry).topBand !== highest) {
      topBandEmpty.push(industry);
    }
  }
  profile("industries with nobody in the top band", topBandEmpty.sort(), baseline);
  for (const industry of ["Education", "Electrical & Electronics"]) {
    const total = companiesInIndustry(dataset, industry).length;
    const result = matchPeers(dataset, { industry, revenueBand: "$1 Bn – $5 Bn" });
    profile(
      `${industry}: in industry / peers / shortfall`,
      `${total} / ${result.peers.length} / ${result.shortfall}`,
      baseline,
    );
  }

  /* ====================================================================== */

  console.log("");
  if (invariantFailures > 0) {
    console.error(
      `data:verify — ${invariantFailures} INVARIANT FAILURE(S). This is a bug in the data layer, not drift. ` +
        `--accept will not silence it, and should not.\n`,
    );
    process.exit(1);
  }

  if (profileDrift.length === 0) {
    console.log("data:verify — clean, invariants hold and every profile figure matches\n");
    if (accept && baseline) {
      console.log("--accept: nothing to re-baseline.\n");
      return;
    }
    if (!baseline) writeBaseline(dataset);
    return;
  }

  console.log(`${profileDrift.length} profile figure(s) moved:`);
  for (const drift of profileDrift) {
    console.log(
      `  ${drift.label}: ${JSON.stringify(drift.from)} -> ${JSON.stringify(drift.to)}`,
    );
  }

  if (!accept) {
    console.error(
      "\ndata:verify — profile figures moved and were not accepted.\n" +
        "If this followed a deliberate edit, confirm the numbers above look right, then:\n" +
        "  npm run data:verify -- --accept\n" +
        "and update docs/data-audit.md to match. If you did not expect these, something\n" +
        "changed the data by accident — that is what this check is for.\n",
    );
    process.exit(1);
  }

  writeBaseline(dataset);
  console.log(
    "\ndata:verify — baseline updated. Commit data/verify-baseline.json alongside the data change,\n" +
      "and bring docs/data-audit.md in line with the figures above.\n",
  );
}

function writeBaseline(dataset: Dataset): void {
  const baseline: Baseline = {
    describedAs: `${dataset.companies.length} companies, from ${dataset.source}`,
    recordedAt: new Date().toISOString(),
    figures: measured,
  };
  writeFileSync(BASELINE_PATH, `${JSON.stringify(baseline, null, 2)}\n`, "utf8");
  console.log(`Wrote data/verify-baseline.json`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
