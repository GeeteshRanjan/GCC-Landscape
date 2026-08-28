/**
 * Authoring check for the business-type vocabulary. Run by hand while editing
 * `business-tags.ts` or `business-type-catalogue.ts`; the same properties are
 * asserted as invariants by `data:verify` once the data is published.
 *
 *   npx tsx scripts/check-business-tags.ts
 */
import { BUSINESS_TAGS } from "../src/data/business-tags";
import { BUSINESS_TYPE_CATALOGUE } from "../src/data/business-type-catalogue";

const carriers = new Map<string, string[]>();
for (const tag of BUSINESS_TAGS) carriers.set(tag, []);

let unknown = 0;
for (const type of BUSINESS_TYPE_CATALOGUE) {
  for (const tag of type.tags) {
    const list = carriers.get(tag);
    if (!list) {
      console.log(`UNKNOWN TAG on ${type.id}: ${tag}`);
      unknown += 1;
      continue;
    }
    list.push(type.id);
  }
}

console.log(`business types : ${BUSINESS_TYPE_CATALOGUE.length}`);
console.log(`tags           : ${BUSINESS_TAGS.length}`);
console.log(`unknown uses   : ${unknown}`);

const dead = [...carriers.entries()].filter(([, ids]) => ids.length < 2);
console.log(`tags on <2 types: ${dead.length}`);
for (const [tag, ids] of dead) {
  console.log(`  ${tag} -> [${ids.join(", ") || "nothing"}]`);
}

const ids = BUSINESS_TYPE_CATALOGUE.map((t) => t.id);
const dupes = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
if (dupes.length) console.log(`DUPLICATE IDS: ${dupes.join(", ")}`);

const thin = BUSINESS_TYPE_CATALOGUE.filter((t) => t.tags.length < 4);
if (thin.length) {
  console.log(`\ntypes with fewer than 4 tags (weak similarity signal):`);
  for (const t of thin) console.log(`  ${t.id} (${t.tags.length})`);
}

const perIndustry = new Map<string, number>();
for (const t of BUSINESS_TYPE_CATALOGUE) {
  perIndustry.set(t.industry, (perIndustry.get(t.industry) ?? 0) + 1);
}
console.log(`\ntypes per industry (${perIndustry.size} industries covered):`);
for (const [industry, n] of [...perIndustry.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(3)}  ${industry}`);
}

process.exit(unknown > 0 || dead.length > 0 || dupes.length > 0 ? 1 : 0);
