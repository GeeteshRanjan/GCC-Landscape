/**
 * Conflation report — which business types blend genuinely distinct businesses.
 *
 * Peer ordering WITHIN a business type is band-then-size, because every member of
 * a type carries that type's tags and nothing finer. That is correct when the
 * members are genuine peers (all pharma, all car makers) and wrong when the type
 * lumps distinct businesses together (card networks + money-transfer + expense
 * cards under one `fin-payments`). This script surfaces the second case
 * objectively, from the SOURCE Sub-Industry strings the importer collapsed away.
 *
 *   npx tsx scripts/analyze-conflation.ts            # ranked report, all industries
 *   npx tsx scripts/analyze-conflation.ts fin-payments   # one type, full detail
 *
 * Read-only. Reuses the importer's own reading + canonicalisation + map lookups,
 * so the reconstruction matches the published dataset company-for-company.
 */
import path from "node:path";
import { readFileSync } from "node:fs";

import ExcelJS from "exceljs";

import {
  COMPANY_TO_TYPES,
  SUB_INDUSTRY_TO_TYPE,
  VAGUE_SUB_INDUSTRIES,
} from "./business-type-map";
import { cleanText, canonicalCompanyName, canonicalIndustry } from "../src/data/normalize";
import { BUSINESS_TYPE_CATALOGUE } from "../src/data/business-type-catalogue";
import { parseDataset } from "../src/data/schema";

const SOURCE = "Consolidated_GCC_India_Database_2026_New.xlsx";
const COL = {
  name: "Company Name",
  industry: "Industry / Sector",
  subIndustry: "Sub-Industry",
} as const;

const typeName = new Map(BUSINESS_TYPE_CATALOGUE.map((t) => [t.id, t.name]));
const typeIndustry = new Map(BUSINESS_TYPE_CATALOGUE.map((t) => [t.id, t.industry]));

const COMPANY_TYPE_LOOKUP = new Map(
  Object.entries(COMPANY_TO_TYPES).map(([key, types]) => {
    const sep = key.indexOf("||");
    return [`${key.slice(0, sep)}||${cleanText(key.slice(sep + 2)).toLowerCase()}`, types] as const;
  }),
);

function classify(name: string, industry: string, subIndustry: string): string[] {
  const byName = COMPANY_TYPE_LOOKUP.get(`${industry}||${cleanText(name).toLowerCase()}`);
  if (byName) return [...byName];
  const bySub = SUB_INDUSTRY_TO_TYPE[`${industry}||${subIndustry}`];
  if (bySub) return [bySub];
  return [];
}

interface Row {
  name: string;
  industry: string;
  subIndustry: string;
  types: string[];
}

async function readRows(): Promise<Row[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path.resolve(SOURCE));
  const sheet = wb.worksheets[0]!;
  const header = sheet.getRow(1);
  const idx = new Map<string, number>();
  header.eachCell((cell, i) => idx.set(cleanText(cell.text), i));

  const rows: Row[] = [];
  for (let r = 2; r <= sheet.rowCount; r += 1) {
    const row = sheet.getRow(r);
    const name = canonicalCompanyName(row.getCell(idx.get(COL.name)!).text);
    const industry = canonicalIndustry(row.getCell(idx.get(COL.industry)!).text);
    const subIndustry = cleanText(row.getCell(idx.get(COL.subIndustry)!).text);
    if (!name) continue;
    rows.push({ name, industry, subIndustry, types: classify(name, industry, subIndustry) });
  }
  return rows;
}

async function main() {
  const only = process.argv[2];
  const rows = await readRows();

  // type id -> source sub-industry -> [company names]
  const byType = new Map<string, Map<string, string[]>>();
  for (const row of rows) {
    for (const t of row.types) {
      if (!byType.has(t)) byType.set(t, new Map());
      const subs = byType.get(t)!;
      const key = row.subIndustry || "(blank)";
      if (!subs.has(key)) subs.set(key, []);
      subs.get(key)!.push(row.name);
    }
  }

  if (only) {
    const subs = byType.get(only);
    if (!subs) {
      console.log(`No companies mapped to "${only}".`);
      return;
    }
    const members = [...subs.values()].reduce((n, a) => n + a.length, 0);
    console.log(`\n${only}  (${typeName.get(only)} · ${typeIndustry.get(only)})`);
    console.log(`${members} companies, ${subs.size} distinct source sub-industries:\n`);
    for (const [sub, names] of [...subs.entries()].sort((a, b) => b[1].length - a[1].length)) {
      console.log(`  ${String(names.length).padStart(3)}  ${sub}`);
      console.log(`       ${names.sort().join(", ")}`);
    }
    return;
  }

  // Ranked report: types with the most distinct source sub-industries, which is
  // the objective signal that a single type absorbed several businesses.
  const rankable = [...byType.entries()].map(([id, subs]) => {
    const members = [...subs.values()].reduce((n, a) => n + a.length, 0);
    // Distinct source sub-industries with at least 2 members — a lone stray isn't
    // conflation, a cluster is.
    const clusters = [...subs.values()].filter((a) => a.length >= 2).length;
    return { id, members, distinctSubs: subs.size, clusters };
  });

  console.log("Business types ranked by source-sub-industry diversity");
  console.log("(members / distinct source subs / clusters of >=2)\n");
  console.log("  type                              memb  subs  clus");
  for (const r of rankable
    .filter((r) => r.members >= 6)
    .sort((a, b) => b.clusters - a.clusters || b.distinctSubs - a.distinctSubs)) {
    console.log(
      `  ${r.id.padEnd(34)} ${String(r.members).padStart(3)}  ${String(r.distinctSubs).padStart(4)}  ${String(r.clusters).padStart(4)}`,
    );
  }

  // Cross-check: reconstruction total vs published dataset, so the join is trusted.
  const dataset = parseDataset(
    JSON.parse(readFileSync(path.join(process.cwd(), "data", "dataset.json"), "utf8")),
  );
  const publishedTagged = dataset.companies.filter((c) => c.businessTypes.length > 0).length;
  const reconstructedTagged = rows.filter((r) => r.types.length > 0).length;
  console.log(
    `\nreconstructed tagged=${reconstructedTagged}  published tagged=${publishedTagged}  (rows=${rows.length})`,
  );
}

main();
