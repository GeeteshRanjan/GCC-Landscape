/**
 * Validates a per-company business-type assignment file against the catalogue:
 * every id must exist, and must belong to the company's own industry.
 *
 *   npx tsx scripts/check-company-types.ts /tmp/gcc/company-types.json /tmp/gcc/industries.json
 */
import { readFileSync } from "node:fs";

import { BUSINESS_TYPE_CATALOGUE } from "../src/data/business-type-catalogue";

const [assignPath, industryPath] = process.argv.slice(2);
if (!assignPath || !industryPath) {
  console.error("usage: check-company-types.ts <assignments.json> <industries.json>");
  process.exit(1);
}

const assignments: Record<string, string[]> = JSON.parse(
  readFileSync(assignPath, "utf8"),
);
const industries: Record<string, string> = JSON.parse(
  readFileSync(industryPath, "utf8"),
);

const industryOf = new Map(BUSINESS_TYPE_CATALOGUE.map((t) => [t.id, t.industry]));

let bad = 0;
const perType = new Map<string, number>();

for (const [company, types] of Object.entries(assignments)) {
  const companyIndustry = industries[company];
  if (companyIndustry === undefined) {
    console.log(`NO INDUSTRY  ${company}`);
    bad += 1;
    continue;
  }
  if (types.length === 0 || types.length > 2) {
    console.log(`BAD COUNT    ${company}: ${types.length} types`);
    bad += 1;
  }
  for (const id of types) {
    perType.set(id, (perType.get(id) ?? 0) + 1);
    const owner = industryOf.get(id);
    if (owner === undefined) {
      console.log(`UNKNOWN TYPE ${company}: "${id}"`);
      bad += 1;
    } else if (owner !== companyIndustry) {
      console.log(
        `WRONG INDUSTRY ${company} is ${companyIndustry} but "${id}" is ${owner}`,
      );
      bad += 1;
    }
  }
}

console.log(`\ncompanies: ${Object.keys(assignments).length}`);
console.log(`problems : ${bad}`);
console.log(`\nassignments per type:`);
for (const [id, n] of [...perType.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(4)}  ${id}`);
}
process.exit(bad > 0 ? 1 : 0);
