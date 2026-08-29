/**
 * Seed importer: Consolidated_GCC_India_Database_2026_New.xlsx -> data/dataset.json
 *
 *   npm run data:import                      # import, diff against the current JSON, write
 *   npm run data:import -- --dry-run         # everything except the write
 *   npm run data:import -- --in <path>       # a later batch of new companies
 *   npm run data:import -- --reseed-metrics  # adopt the catalogue in code over the stored one
 *   npm run data:import -- --reseed-business-types   # same, for business types
 *   npm run data:import -- --reseed-site-content     # same, for the hero copy and impact figures
 *
 * The spreadsheet is a SEED, not a system of record. It is read once, cleaned on
 * the way in, and after that admin is the authoritative editor. This script is
 * the same pipeline admin will run on a bulk-append — parse, clean, validate,
 * diff preview, then publish — so the cleaning primitives live in
 * src/data/normalize.ts and are shared rather than duplicated here.
 *
 * Every cleaning step below answers a measured defect in the source file. The
 * list is docs/data-audit.md, "Cleaning the importer must do".
 */
import path from "node:path";
import process from "node:process";

import ExcelJS from "exceljs";

import { BUSINESS_TYPE_CATALOGUE } from "../src/data/business-type-catalogue";
import { hasTier2Presence, locationCount } from "../src/data/derive";
import { diffDatasets, renderDiffText } from "../src/data/diff";
import { seedMetricCatalogue } from "../src/data/metric-catalogue";
import {
  COMPANY_TO_TYPES,
  SUB_INDUSTRY_TO_TYPE,
  VAGUE_SUB_INDUSTRIES,
} from "./business-type-map";
import {
  SEED_REVENUE_BAND_ORDER,
  cleanText,
  parseCities,
  parseFteRange,
  parseYear,
  parseYesNo,
  uniqueSlug,
} from "../src/data/normalize";
import {
  DATASET_VERSION,
  DEFAULT_SITE_CONTENT,
  datasetSchema,
  formatIssues,
  type Company,
  type Dataset,
} from "../src/data/schema";
import { createFsDataStore, resolveDatasetPath } from "../src/data/store/fs-store";

const DEFAULT_SOURCE = "Consolidated_GCC_India_Database_2026_New.xlsx";

/** Header text -> field. Matched on the cleaned header, so column order is free. */
const COLUMNS = {
  name: "Company Name",
  hqCountry: "Company HQ",
  revenueBand: "Company Revenue Band (2025)",
  industry: "Industry / Sector",
  /**
   * Read to be MAPPED, never stored. 620 values over 1834 companies is unusable
   * as a match key — see docs/data-audit.md — so it is collapsed through
   * `SUB_INDUSTRY_TO_TYPE` into a business type and then discarded.
   */
  subIndustry: "Sub-Industry",
  establishedYear: "GCC Establish Year",
  cities: "GCC Location(s)",
  fteRange: "GCC FTE Range",
  fortune: "Fortune Global 500",
  forbes: "Forbes Global 2000",
  // Read only to be checked against the derived value, never stored.
  locationPresence: "Location Presence",
  tier2: "Tier-2 Presence",
} as const;

type ColumnKey = keyof typeof COLUMNS;

interface Args {
  input: string;
  dryRun: boolean;
  reseedMetrics: boolean;
  reseedBusinessTypes: boolean;
  reseedSiteContent: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    input: DEFAULT_SOURCE,
    dryRun: false,
    reseedMetrics: false,
    reseedBusinessTypes: false,
    reseedSiteContent: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dry-run") args.dryRun = true;
    else if (arg === "--reseed-metrics") args.reseedMetrics = true;
    else if (arg === "--reseed-business-types") args.reseedBusinessTypes = true;
    else if (arg === "--reseed-site-content") args.reseedSiteContent = true;
    else if (arg === "--in") {
      const next = argv[i + 1];
      if (!next) fail("--in needs a path");
      args.input = next;
      i += 1;
    } else if (arg?.startsWith("--")) fail(`unknown flag ${arg}`);
  }
  return args;
}

function fail(message: string): never {
  console.error(`import-seed: ${message}`);
  process.exit(1);
}

async function readRows(
  file: string,
): Promise<{ rows: Array<Record<ColumnKey, string>>; sheetName: string }> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(file);
  const sheet = workbook.worksheets[0];
  if (!sheet) fail(`${file} has no worksheets`);

  const headerRow = sheet.getRow(1);
  const columnIndex = new Map<string, number>();
  headerRow.eachCell((cell, index) => {
    columnIndex.set(cleanText(cell.text), index);
  });

  const missing = Object.entries(COLUMNS).filter(
    ([, header]) => !columnIndex.has(header),
  );
  if (missing.length > 0) {
    fail(
      `${file} is missing expected column(s): ${missing
        .map(([, header]) => `"${header}"`)
        .join(", ")}`,
    );
  }

  const rows: Array<Record<ColumnKey, string>> = [];
  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const record = {} as Record<ColumnKey, string>;
    let hasContent = false;
    for (const [key, header] of Object.entries(COLUMNS) as Array<
      [ColumnKey, string]
    >) {
      const index = columnIndex.get(header);
      const value = cleanText(index ? row.getCell(index).text : "");
      record[key] = value;
      if (value) hasContent = true;
    }
    if (hasContent) rows.push(record);
  }

  return { rows, sheetName: sheet.name };
}

/**
 * Lookup of the per-company table, keyed by industry and a case-folded name.
 *
 * Industry is part of the key because company names are not unique across
 * industries even case-insensitively — "STATS Perform" (Software & Internet) and
 * "Stats Perform" (Media & Entertainment) are different companies.
 */
const COMPANY_TYPE_LOOKUP = new Map(
  Object.entries(COMPANY_TO_TYPES).map(([key, types]) => {
    const separator = key.indexOf("||");
    const industry = key.slice(0, separator);
    const name = key.slice(separator + 2);
    return [`${industry}||${cleanText(name).toLowerCase()}`, types] as const;
  }),
);

/**
 * A company's business types, from the per-company table first and the
 * sub-industry collapse second.
 *
 * Returns a `gap` rather than throwing, because an unmapped value must not block
 * an import: a future spreadsheet batch will contain sub-industry strings nobody
 * has seen, and the right outcome is an untagged company plus a loud report, not
 * a failed import. Untagged is safe — the company still matches at industry
 * level, exactly as before business types existed.
 */
function classifyBusiness(
  name: string,
  industry: string,
  subIndustry: string,
): { types: string[]; gap: string | null } {
  const byName = COMPANY_TYPE_LOOKUP.get(
    `${industry}||${cleanText(name).toLowerCase()}`,
  );
  if (byName) return { types: [...byName], gap: null };

  const key = `${industry}||${subIndustry}`;
  const bySub = SUB_INDUSTRY_TO_TYPE[key];
  if (bySub) return { types: [bySub], gap: null };

  // A known catch-all with no per-company decision recorded. Expected for the
  // 58 deliberately untagged; anything else here wants a look.
  if (VAGUE_SUB_INDUSTRIES.has(key)) return { types: [], gap: null };

  return { types: [], gap: `unmapped sub-industry "${subIndustry}" in ${industry}` };
}

interface BuildResult {
  companies: Company[];
  errors: string[];
  warnings: string[];
}

function buildCompanies(rows: Array<Record<ColumnKey, string>>): BuildResult {
  const companies: Company[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  const businessTypeGaps: string[] = [];
  const slugs = new Set<string>();
  const namesSeen = new Map<string, number>();

  rows.forEach((row, index) => {
    const sheetRow = index + 2;
    const name = row.name;
    if (!name) {
      errors.push(`row ${sheetRow}: no company name`);
      return;
    }

    const establishedYear = parseYear(row.establishedYear);
    if (establishedYear === null) {
      errors.push(
        `row ${sheetRow} (${name}): unparseable GCC Establish Year "${row.establishedYear}"`,
      );
      return;
    }

    const fte = parseFteRange(row.fteRange);
    if (fte === null) {
      errors.push(
        `row ${sheetRow} (${name}): unparseable GCC FTE Range "${row.fteRange}"`,
      );
      return;
    }

    const cities = parseCities(row.cities);
    if (cities.length === 0) {
      errors.push(`row ${sheetRow} (${name}): no GCC location`);
      return;
    }

    const fortuneGlobal500 = parseYesNo(row.fortune);
    const forbesGlobal2000 = parseYesNo(row.forbes);
    if (fortuneGlobal500 === null || forbesGlobal2000 === null) {
      errors.push(
        `row ${sheetRow} (${name}): non Yes/No index flag(s) — Fortune "${row.fortune}", Forbes "${row.forbes}"`,
      );
      return;
    }

    for (const [key, label] of [
      ["hqCountry", "Company HQ"],
      ["revenueBand", "Company Revenue Band (2025)"],
      ["industry", "Industry / Sector"],
    ] as Array<[ColumnKey, string]>) {
      if (!row[key]) errors.push(`row ${sheetRow} (${name}): empty ${label}`);
    }

    // Defect 3: one duplicate company name in the source, so the name cannot be
    // the key. Both rows are kept — two rows may be two real entities — and the
    // collision is reported so it can be resolved in admin.
    const previous = namesSeen.get(name.toLowerCase());
    if (previous !== undefined) {
      warnings.push(
        `duplicate company name "${name}" (rows ${previous} and ${sheetRow}); both kept with distinct ids`,
      );
    }
    namesSeen.set(name.toLowerCase(), sheetRow);

    const { types: businessTypes, gap } = classifyBusiness(
      name,
      row.industry,
      row.subIndustry,
    );
    if (gap) businessTypeGaps.push(`${gap} (row ${sheetRow}, ${name})`);

    const company: Company = {
      id: uniqueSlug(name, slugs),
      name,
      hqCountry: row.hqCountry,
      industry: row.industry,
      revenueBand: row.revenueBand,
      establishedYear,
      cities,
      fte,
      fortuneGlobal500,
      forbesGlobal2000,
      businessTypes,
    };

    // Defect 6: recompute the two derived columns the source shipped as stored
    // values and report any disagreement. A mismatch means the source row is
    // stale — it is not reconciled here, and the derived value always wins
    // because the stored one is not carried into the dataset at all.
    const suppliedCount = Number(row.locationPresence);
    if (
      Number.isFinite(suppliedCount) &&
      suppliedCount !== locationCount(company)
    ) {
      warnings.push(
        `row ${sheetRow} (${name}): Location Presence says ${row.locationPresence}, city list has ${locationCount(company)}`,
      );
    }
    const suppliedTier2 = parseYesNo(row.tier2);
    if (suppliedTier2 !== null && suppliedTier2 !== hasTier2Presence(company)) {
      warnings.push(
        `row ${sheetRow} (${name}): Tier-2 Presence says ${row.tier2}, cities [${company.cities.join(", ")}] derive ${hasTier2Presence(company) ? "Yes" : "No"}`,
      );
    }

    companies.push(company);
  });

  // Loud, but not fatal. A new sub-industry string in a later batch leaves its
  // company untagged, which is safe; silence is what would not be.
  if (businessTypeGaps.length > 0) {
    const unique = [...new Set(businessTypeGaps)];
    warnings.push(
      `${unique.length} unmapped sub-industry value(s) — those companies are untagged and match at industry level only. ` +
        `Add them to scripts/business-type-map.ts:\n    ${unique.slice(0, 20).join("\n    ")}`,
    );
  }

  return { companies, errors, warnings };
}

function buildTaxonomy(companies: Company[]): Dataset["taxonomy"] {
  const collect = (pick: (c: Company) => string): string[] =>
    [...new Set(companies.map(pick))].sort((a, b) => a.localeCompare(b));

  const bandsPresent = new Set(companies.map((c) => c.revenueBand));
  // Ascending, from the canonical seed order. Alphabetical is wrong here: it
  // puts "$10 Bn – $20 Bn" second, and adjacent-band matching is index
  // arithmetic on this array.
  const revenueBands = SEED_REVENUE_BAND_ORDER.filter((band) =>
    bandsPresent.has(band),
  );
  const canonical: readonly string[] = SEED_REVENUE_BAND_ORDER;
  const unordered = [...bandsPresent].filter((band) => !canonical.includes(band));
  if (unordered.length > 0) {
    fail(
      `revenue band(s) not in the canonical order: ${unordered
        .map((b) => `"${b}"`)
        .join(", ")}. Add them to SEED_REVENUE_BAND_ORDER in the right position.`,
    );
  }

  const cities = [
    ...new Set(companies.flatMap((company) => company.cities)),
  ].sort((a, b) => a.localeCompare(b));

  return {
    industries: collect((c) => c.industry),
    revenueBands: [...revenueBands],
    cities,
    hqCountries: collect((c) => c.hqCountry),
  };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const inputPath = path.resolve(args.input);

  console.log(`import-seed: reading ${path.relative(process.cwd(), inputPath)}`);
  const { rows, sheetName } = await readRows(inputPath);
  console.log(`  sheet "${sheetName}", ${rows.length} data rows`);

  const { companies, errors, warnings } = buildCompanies(rows);

  if (warnings.length > 0) {
    console.log(`\nWarnings (${warnings.length}) — imported, but worth a look:`);
    for (const warning of warnings.slice(0, 40)) console.log(`  ${warning}`);
    if (warnings.length > 40) console.log(`  …and ${warnings.length - 40} more`);
  }

  if (errors.length > 0) {
    console.error(`\nErrors (${errors.length}) — these rows were dropped:`);
    for (const error of errors.slice(0, 40)) console.error(`  ${error}`);
    fail("import aborted; fix the source rows and re-run");
  }

  const store = createFsDataStore();
  let previous: Dataset | null = null;
  try {
    previous = await store.read();
  } catch {
    previous = null;
  }

  /**
   * The Screen 2 catalogue is carried over from the existing dataset, untouched.
   *
   * It has no spreadsheet behind it — the values are typed into admin over
   * months — so rebuilding it from the seed on every import would silently erase
   * that work, and the erasure would look exactly like a normal re-import. The
   * seed is used only when there is no catalogue yet.
   */
  const hasExisting = Boolean(previous?.metrics?.length);
  const metrics =
    hasExisting && !args.reseedMetrics
      ? (previous?.metrics as Dataset["metrics"])
      : seedMetricCatalogue();

  if (hasExisting && args.reseedMetrics) {
    console.log(
      `\n  --reseed-metrics: REPLACING ${previous?.metrics.length} existing function metrics with\n` +
        `  the ${metrics.length} in src/data/metric-catalogue.ts. Any values entered through admin\n` +
        `  and not also in the catalogue are discarded. The diff below is the record of what moved.`,
    );
  } else {
    console.log(
      hasExisting
        ? `  keeping ${metrics.length} existing function metrics untouched`
        : `  seeding ${metrics.length} function metrics from the catalogue`,
    );
  }

  /**
   * Business types, on the same terms as the metric catalogue: preserved unless
   * asked to reseed.
   *
   * The reason differs, though. Metrics are preserved because their VALUES are
   * typed in over months. Business types are preserved because an admin may have
   * added a type or re-pointed a company, and a monthly spreadsheet append should
   * not undo that. The company ASSIGNMENTS come from the spreadsheet's
   * sub-industry column through the map either way, so a reseed here replaces the
   * catalogue, not the per-company work.
   */
  const hasExistingTypes = Boolean(previous?.businessTypes?.length);
  const businessTypes =
    hasExistingTypes && !args.reseedBusinessTypes
      ? (previous?.businessTypes as Dataset["businessTypes"])
      : BUSINESS_TYPE_CATALOGUE.map((type) => ({ ...type, tags: [...type.tags] }));

  if (hasExistingTypes && args.reseedBusinessTypes) {
    console.log(
      `\n  --reseed-business-types: REPLACING ${previous?.businessTypes.length} stored business types with\n` +
        `  the ${businessTypes.length} in src/data/business-type-catalogue.ts. Any type added through admin\n` +
        `  is discarded, and a company pointing at one becomes untagged. The diff below is the record.`,
    );
  } else {
    console.log(
      hasExistingTypes
        ? `  keeping ${businessTypes.length} existing business types untouched`
        : `  seeding ${businessTypes.length} business types from the catalogue`,
    );
  }

  /**
   * Site content, on the same terms again: preserved unless asked to reseed.
   *
   * Same failure mode as the metric catalogue and worse in one way — the hero's
   * headline and the five impact figures are typed in by whoever owns ANSR's
   * positioning, they have no spreadsheet behind them, and rebuilding them from
   * the seed would replace live marketing copy with the developer's default
   * during what looks like a routine monthly company append. The visible symptom
   * would be the entry point silently reverting its headline.
   *
   * Unlike the other two, "has existing" cannot be a length check: the key always
   * parses to a populated object, because its default is real content rather than
   * `[]`. So the test is whether the stored copy DIFFERS from the default — which
   * is the same question one step later and needs no second read of the raw file.
   * If they are equal, reseeding is a no-op and either log line is true.
   */
  const hasExistingContent =
    previous !== null &&
    JSON.stringify(previous.siteContent) !== JSON.stringify(DEFAULT_SITE_CONTENT);
  const siteContent =
    hasExistingContent && !args.reseedSiteContent
      ? (previous?.siteContent as Dataset["siteContent"])
      : DEFAULT_SITE_CONTENT;

  if (hasExistingContent && args.reseedSiteContent) {
    console.log(
      `\n  --reseed-site-content: REPLACING the stored hero copy and ${previous?.siteContent.impactStats.length} impact\n` +
        `  figures with the defaults in src/data/schema.ts. Anything edited through admin is\n` +
        `  discarded. The diff below is the record of what moved.`,
    );
  } else {
    console.log(
      hasExistingContent
        ? `  keeping the stored hero copy and ${siteContent.impactStats.length} impact figures untouched`
        : `  seeding the hero copy and ${siteContent.impactStats.length} impact figures from the default`,
    );
  }

  const tagged = companies.filter((c) => c.businessTypes.length > 0).length;
  console.log(
    `  tagged ${tagged}/${companies.length} companies (${Math.round((tagged / companies.length) * 100)}%) with a business type`,
  );

  const dataset: Dataset = {
    version: DATASET_VERSION,
    generatedAt: new Date().toISOString(),
    source: path.basename(inputPath),
    taxonomy: buildTaxonomy(companies),
    companies,
    businessTypes,
    metrics,
    siteContent,
  };

  const validated = datasetSchema.safeParse(dataset);
  if (!validated.success) {
    console.error("\nSchema validation failed:");
    console.error(formatIssues(validated.error));
    fail("import aborted; nothing written");
  }

  console.log(
    `\nParsed ${companies.length} companies · ${dataset.taxonomy.industries.length} industries · ` +
      `${dataset.taxonomy.revenueBands.length} revenue bands · ${dataset.taxonomy.cities.length} cities · ` +
      `${dataset.taxonomy.hqCountries.length} HQ countries`,
  );
  // Same computation the admin publish view renders as markup; see src/data/diff.ts.
  console.log(`\n${renderDiffText(diffDatasets(validated.data, previous))}`);

  if (args.dryRun) {
    console.log("\n--dry-run: nothing written.");
    return;
  }

  const result = await store.write(validated.data, {
    message: `data: import ${companies.length} companies from ${path.basename(inputPath)}`,
  });
  console.log(`\nWrote ${path.relative(process.cwd(), result.location)}`);
  console.log(
    `Dataset path in use: ${path.relative(process.cwd(), resolveDatasetPath())}`,
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
