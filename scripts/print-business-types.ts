/**
 * Prints the business-type catalogue for one industry, with tags.
 * An authoring and review aid, never run at request time.
 *
 *   npx tsx scripts/print-business-types.ts "Software & Internet"
 */
import { BUSINESS_TYPE_CATALOGUE } from "../src/data/business-type-catalogue";

const wanted = process.argv[2];
if (!wanted) {
  const industries = [...new Set(BUSINESS_TYPE_CATALOGUE.map((t) => t.industry))];
  console.log(industries.sort().join("\n"));
  process.exit(0);
}

const types = BUSINESS_TYPE_CATALOGUE.filter((t) =>
  t.industry.toLowerCase().includes(wanted.toLowerCase()),
);
for (const type of types) {
  console.log(`${type.id}\t${type.name}\t${type.tags.join(" ")}`);
}
console.log(`\n${types.length} types`);
