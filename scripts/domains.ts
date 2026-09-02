/**
 * Bulk-fill company domains from a CSV, and emit the CSV to fill.
 *
 * ## Why this exists rather than an editing session
 *
 * There are 1,834 companies. Typing a domain into each in admin is a week of
 * clicking, and hand-editing `data/dataset.json` is worse: the file is the
 * product's whole source of truth, a JSON syntax error takes the app down, and a
 * row edited under the wrong `id` puts one company's domain on another — which is
 * silent, plausible-looking, and ends with the WRONG COMPANY'S LOGO on a peer
 * card. This script exists so neither of those is ever the method.
 *
 * ## The shape of the safety
 *
 * **Template out, validate in.** `template` writes every company's `id` and `name`
 * into a CSV. A human fills only the `domain` column. `import` reads it back and
 * refuses the whole file unless every check passes. Because the ids came FROM the
 * dataset, they cannot be mistyped, and because the names travel alongside them,
 * a row-shifted or re-sorted file is caught rather than applied.
 *
 * **Dry run is the default.** `import` reports and writes nothing. `--apply` is the
 * only thing that touches the dataset. So the destructive step is always the
 * second command, after a report has been read.
 *
 * **All or nothing.** One bad row fails the run. A partially-applied import is the
 * state nobody can reason about afterwards, so it is not a state this can produce.
 *
 * ## Usage
 *
 *   npm run domains:template            # writes data/domains.csv
 *   npm run domains:import              # dry run: reports, changes nothing
 *   npm run domains:import -- --apply   # writes data/dataset.json
 *
 * Both take an optional `--file <path>` if the CSV lives somewhere else.
 *
 * After `--apply`, run `npm run data:verify` and `npm test`, then publish from
 * admin. This script does NOT publish — it edits the local file, exactly as the
 * seed importer does.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

import { canonicalDomain, DOMAIN_PATTERN } from "../src/data/normalize";
import { datasetSchema, type Company } from "../src/data/schema";
import { serializeDataset } from "../src/data/store";

const DATASET_PATH = resolve(process.cwd(), "data/dataset.json");
const DEFAULT_CSV_PATH = resolve(process.cwd(), "data/domains.csv");

/**
 * The exact header, in this order.
 *
 * Checked literally on import. A file whose columns have been reordered or renamed
 * by a spreadsheet round-trip is refused with a message naming what was expected,
 * rather than read positionally into the wrong fields.
 */
const HEADER = ["id", "name", "industry", "domain"] as const;

/* -------------------------------------------------------------------------- */
/* CSV, without a dependency                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Quote a field only where it needs it, per RFC 4180.
 *
 * Company names contain commas ("Ingram Micro, Inc.") and a handful contain
 * quotes, so naive joining corrupts the file at exactly the rows most likely to
 * matter. Excel and Sheets both read this dialect.
 */
function csvField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function toCsv(rows: readonly string[][]): string {
  // CRLF, because that is what Excel writes and expects; the parser accepts either.
  return rows.map((row) => row.map(csvField).join(",")).join("\r\n") + "\r\n";
}

/**
 * A real RFC 4180 parser, because the alternative is `split(",")` mangling any row
 * with a comma inside a quoted name.
 *
 * Returns rows of raw strings. A BOM is stripped: Excel writes one on "CSV UTF-8"
 * and it would otherwise become part of the first header cell, failing the header
 * check with a message that looks like nonsense.
 */
function parseCsv(text: string): string[][] {
  const input = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let i = 0;

  const endField = () => {
    row.push(field);
    field = "";
  };
  const endRow = () => {
    endField();
    // A trailing newline produces one empty final row; drop it rather than
    // reporting a blank row as a malformed company.
    if (row.length > 1 || row[0] !== "") rows.push(row);
    row = [];
  };

  while (i < input.length) {
    const char = input[i];

    if (quoted) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        quoted = false;
        i += 1;
        continue;
      }
      field += char;
      i += 1;
      continue;
    }

    if (char === '"' && field === "") {
      quoted = true;
      i += 1;
      continue;
    }
    if (char === ",") {
      endField();
      i += 1;
      continue;
    }
    if (char === "\r") {
      // CRLF or a lone CR both end the row.
      if (input[i + 1] === "\n") i += 1;
      endRow();
      i += 1;
      continue;
    }
    if (char === "\n") {
      endRow();
      i += 1;
      continue;
    }
    field += char;
    i += 1;
  }

  if (field !== "" || row.length > 0) endRow();
  return rows;
}

/* -------------------------------------------------------------------------- */
/* Shared                                                                     */
/* -------------------------------------------------------------------------- */

function readDataset() {
  if (!existsSync(DATASET_PATH)) {
    fail(`No dataset at ${DATASET_PATH}. Nothing to work from.`);
  }
  const raw = readFileSync(DATASET_PATH, "utf8");
  const parsed = datasetSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    fail(
      "data/dataset.json does not satisfy the schema, so this script refuses to " +
        "edit it. Fix the dataset first.\n" +
        parsed.error.issues
          .slice(0, 10)
          .map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
          .join("\n"),
    );
  }
  return parsed.data;
}

function fail(message: string): never {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

function csvPath(): string {
  const supplied = arg("file");
  return supplied ? resolve(process.cwd(), supplied) : DEFAULT_CSV_PATH;
}

/* -------------------------------------------------------------------------- */
/* template                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Write one row per company, pre-filled with any domain already stored.
 *
 * Sorted by industry then name, because the person filling this works through
 * related companies together and the sort is the only help this format can offer.
 * `industry` is in the file for the same reason and is never read back — it is
 * context for the human, and `import` ignores it.
 */
function writeTemplate() {
  const dataset = readDataset();
  const target = csvPath();

  const companies = [...dataset.companies].sort(
    (a, b) =>
      a.industry.localeCompare(b.industry) || a.name.localeCompare(b.name),
  );

  const rows: string[][] = [
    [...HEADER],
    ...companies.map((company) => [
      company.id,
      company.name,
      company.industry,
      company.domain ?? "",
    ]),
  ];

  writeFileSync(target, toCsv(rows), "utf8");

  const filled = companies.filter((company) => company.domain).length;
  console.log(`\n✓ Wrote ${target}`);
  console.log(`  ${companies.length} companies, ${filled} already have a domain.`);
  console.log(`\n  Fill the "domain" column only. Do not add, remove, reorder or`);
  console.log(`  rename rows or columns — import checks all of that.\n`);
}

/* -------------------------------------------------------------------------- */
/* import                                                                     */
/* -------------------------------------------------------------------------- */

type Problem = { line: number; id: string; message: string };

function runImport() {
  const dataset = readDataset();
  const target = csvPath();
  const apply = process.argv.includes("--apply");

  if (!existsSync(target)) {
    fail(
      `No CSV at ${target}.\nRun \`npm run domains:template\` first, then fill the domain column.`,
    );
  }

  const rows = parseCsv(readFileSync(target, "utf8"));
  if (rows.length === 0) fail(`${target} is empty.`);

  /* -- header ------------------------------------------------------------- */
  const header = (rows[0] ?? []).map((cell) => cell.trim().toLowerCase());
  if (header.length !== HEADER.length || HEADER.some((name, i) => header[i] !== name)) {
    fail(
      `Wrong header.\n  expected: ${HEADER.join(",")}\n  found:    ${header.join(",")}\n\n` +
        `Re-run \`npm run domains:template\` and fill the domain column of the new file.`,
    );
  }

  const body = rows.slice(1);
  const byId = new Map(dataset.companies.map((company) => [company.id, company]));

  const problems: Problem[] = [];
  const seenIds = new Set<string>();
  /** id -> cleaned domain, for the rows that will actually change something. */
  const updates = new Map<string, string | undefined>();
  const cleaned: Array<{ id: string; from: string; to: string }> = [];

  body.forEach((row, index) => {
    // +2: one for the header, one because humans count from 1.
    const line = index + 2;

    if (row.length !== HEADER.length) {
      problems.push({
        line,
        id: row[0] ?? "",
        message: `has ${row.length} columns, expected ${HEADER.length}`,
      });
      return;
    }

    // Indexed access is checked in this project, and the length guard above already
    // proved all four cells exist.
    const id = (row[0] ?? "").trim();
    const name = (row[1] ?? "").trim();
    const rawDomain = row[3] ?? "";

    if (!id) {
      problems.push({ line, id: "", message: "blank id" });
      return;
    }

    const company = byId.get(id);
    if (!company) {
      problems.push({
        line,
        id,
        message: "no company with this id — was the id column edited?",
      });
      return;
    }

    if (seenIds.has(id)) {
      problems.push({ line, id, message: "duplicate row for this id" });
      return;
    }
    seenIds.add(id);

    /**
     * The row-shift guard, and the single most valuable check here.
     *
     * If a spreadsheet was sorted with the header included, or a row inserted, or a
     * column dragged, ids and names stop lining up. Every other check would still
     * pass and the import would put real domains on the wrong companies. Comparing
     * the name against the dataset's own catches it on the first affected row.
     */
    if (name !== company.name) {
      problems.push({
        line,
        id,
        message: `name is "${name}" but company ${id} is "${company.name}" — rows appear shifted`,
      });
      return;
    }

    const supplied = rawDomain.trim();
    const domain = canonicalDomain(supplied);

    if (domain && !DOMAIN_PATTERN.test(domain)) {
      problems.push({
        line,
        id,
        message: `"${supplied}" is not a domain${
          domain !== supplied.toLowerCase() ? ` (read as "${domain}")` : ""
        }`,
      });
      return;
    }

    if (supplied && domain !== supplied) {
      cleaned.push({ id, from: supplied, to: domain });
    }

    const next = domain || undefined;
    if (next !== (company.domain ?? undefined)) {
      updates.set(id, next);
    }
  });

  /* -- completeness -------------------------------------------------------- */
  /**
   * Every company must appear. A truncated file — the classic outcome of a
   * spreadsheet saving only the visible rows, or of a filtered view being exported
   * — would otherwise look like a clean partial import, and the companies that fell
   * off would keep whatever they had while reading as "done".
   */
  const missing = dataset.companies.filter((company) => !seenIds.has(company.id));
  if (missing.length > 0) {
    problems.push({
      line: 0,
      id: "",
      message:
        `${missing.length} companies are not in the file, e.g. ` +
        missing
          .slice(0, 5)
          .map((company) => company.id)
          .join(", ") +
        ". Every company must have a row, even with a blank domain.",
    });
  }

  /* -- report -------------------------------------------------------------- */
  console.log(`\nFile:    ${target}`);
  console.log(`Dataset: ${dataset.companies.length} companies`);
  console.log(`Rows:    ${body.length}`);

  if (cleaned.length > 0) {
    console.log(`\nCleaned ${cleaned.length} value(s) on the way in:`);
    for (const item of cleaned.slice(0, 20)) {
      console.log(`  ${item.id}: "${item.from}" → "${item.to}"`);
    }
    if (cleaned.length > 20) console.log(`  … and ${cleaned.length - 20} more.`);
  }

  /**
   * Two companies sharing a domain is legitimate — subsidiaries, and two rows that
   * look like one company but are deliberately two. So this warns and never blocks.
   */
  const domainOwners = new Map<string, string[]>();
  for (const company of dataset.companies) {
    const value = updates.has(company.id)
      ? updates.get(company.id)
      : company.domain ?? undefined;
    if (!value) continue;
    domainOwners.set(value, [...(domainOwners.get(value) ?? []), company.id]);
  }
  const shared = [...domainOwners.entries()].filter(([, ids]) => ids.length > 1);
  if (shared.length > 0) {
    console.log(`\n! ${shared.length} domain(s) used by more than one company:`);
    for (const [domain, ids] of shared.slice(0, 10)) {
      console.log(`  ${domain}: ${ids.join(", ")}`);
    }
    console.log(`  Legitimate for subsidiaries. Not blocking.`);
  }

  if (problems.length > 0) {
    console.error(`\n✗ ${problems.length} problem(s). NOTHING was written.\n`);
    for (const problem of problems.slice(0, 40)) {
      const where = problem.line > 0 ? `line ${problem.line}` : "file";
      console.error(`  ${where}${problem.id ? ` (${problem.id})` : ""}: ${problem.message}`);
    }
    if (problems.length > 40) {
      console.error(`  … and ${problems.length - 40} more.`);
    }
    console.error("");
    process.exit(1);
  }

  const withDomain = dataset.companies.filter((company) =>
    updates.has(company.id) ? updates.get(company.id) : company.domain,
  ).length;

  console.log(`\n✓ All rows valid.`);
  console.log(`  ${updates.size} company/companies would change.`);
  console.log(
    `  Coverage after: ${withDomain} of ${dataset.companies.length} have a domain.`,
  );

  if (!apply) {
    console.log(`\n  DRY RUN — nothing written. Re-run with --apply to write.\n`);
    return;
  }

  if (updates.size === 0) {
    console.log(`\n  Nothing to change. Dataset left untouched.\n`);
    return;
  }

  /* -- apply --------------------------------------------------------------- */
  const next = {
    ...dataset,
    companies: dataset.companies.map((company): Company => {
      if (!updates.has(company.id)) return company;
      const domain = updates.get(company.id);
      // Delete rather than set undefined: an explicit `undefined` survives the
      // spread and `JSON.stringify` drops it, but the intent is clearer written
      // this way and it keeps the object shape honest for the re-validation below.
      const { domain: _previous, ...rest } = company;
      return domain ? { ...rest, domain } : (rest as Company);
    }),
  };

  // Re-validate the whole thing. The dataset is only ever written through the gate.
  const revalidated = datasetSchema.safeParse(next);
  if (!revalidated.success) {
    fail(
      "The edited dataset failed validation, so nothing was written. This is a bug " +
        "in this script.\n" +
        revalidated.error.issues
          .slice(0, 10)
          .map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
          .join("\n"),
    );
  }

  writeFileSync(DATASET_PATH, serializeDataset(revalidated.data), "utf8");
  console.log(`\n✓ Wrote ${DATASET_PATH}`);
  console.log(`\n  Next: npm run data:verify && npm test, then publish from admin.\n`);
}

/* -------------------------------------------------------------------------- */
/* merge                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Fold a name for matching only. Never for storage.
 *
 * Case and whitespace only. **Deliberately not suffix-stripping, not punctuation-
 * folding, and never fuzzy.** A supplied name that does not resolve is REPORTED for a
 * human to place, because the cost of a wrong match here is one company's domain on
 * another company's row, which ends as the wrong logo on a peer card — silent,
 * plausible, and on the one surface whose whole job is credibility. A miss costs a
 * lookup; a mismatch costs trust, so this errs entirely towards missing.
 */
function foldName(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

/** Find a column by trying each candidate against the header, in order. */
function findColumn(
  header: readonly string[],
  candidates: readonly string[],
): number {
  for (const candidate of candidates) {
    const exact = header.indexOf(candidate);
    if (exact !== -1) return exact;
  }
  for (const candidate of candidates) {
    const partial = header.findIndex((cell) => cell.includes(candidate));
    if (partial !== -1) return partial;
  }
  return -1;
}

/**
 * Take an arbitrary two-column CSV of company name and domain and produce the filled
 * template.
 *
 * **This exists so nobody has to write a merge.** A hand-rolled one gets three things
 * wrong that are all present in this data: 22 company names contain a comma, so
 * `split(",")` corrupts exactly the rows most likely to matter; three names are
 * ambiguous across two companies each; and legal suffixes are stored as supplied, so a
 * source saying "Assent" will not exact-match "Assent Inc.".
 *
 * Output is `data/domains.csv`, ready for `import`, plus `data/domains-unmatched.csv`
 * holding every row this refused to place so it can be resolved and re-run.
 */
function runMerge() {
  const dataset = readDataset();
  const source = arg("from");
  if (!source) {
    fail(
      "merge needs a source file:\n  npm run domains:merge -- --from path/to/your.csv",
    );
  }
  const sourcePath = resolve(process.cwd(), source);
  if (!existsSync(sourcePath)) fail(`No file at ${sourcePath}.`);

  const rows = parseCsv(readFileSync(sourcePath, "utf8"));
  if (rows.length < 2) fail(`${sourcePath} has no data rows.`);

  const header = (rows[0] ?? []).map((cell) => cell.trim().toLowerCase());
  const nameColumn = findColumn(header, ["name", "company", "company name"]);
  const domainColumn = findColumn(header, ["domain", "website", "url", "site"]);

  if (nameColumn === -1 || domainColumn === -1) {
    fail(
      `Could not find the columns in ${sourcePath}.\n` +
        `  header: ${header.join(",")}\n` +
        `  need one column naming the company and one naming the domain.\n` +
        `  Rename them to "name" and "domain" and re-run.`,
    );
  }
  console.log(
    `\nReading "${header[nameColumn]}" as the company and "${header[domainColumn]}" as the domain.`,
  );

  /* -- match index --------------------------------------------------------- */
  const byExact = new Map<string, string[]>();
  const byFolded = new Map<string, string[]>();
  for (const company of dataset.companies) {
    byExact.set(company.name, [...(byExact.get(company.name) ?? []), company.id]);
    const folded = foldName(company.name);
    byFolded.set(folded, [...(byFolded.get(folded) ?? []), company.id]);
  }

  const resolved = new Map<string, string>();
  /**
   * An unresolved row, plus the candidates it could have been.
   *
   * **The candidates are the whole point of this report.** "Astera Labs matches 2
   * companies" is not actionable — two ids with nothing to tell them apart leaves the
   * same guess this script exists to refuse. Carrying each candidate's industry, HQ,
   * year and cities is what lets a human decide, which is the only place that decision
   * belongs.
   */
  const unmatched: Array<{
    line: number;
    name: string;
    domain: string;
    why: string;
    candidates: string[];
  }> = [];
  let blank = 0;
  let loose = 0;

  rows.slice(1).forEach((row, index) => {
    const line = index + 2;
    const name = (row[nameColumn] ?? "").trim();
    const supplied = (row[domainColumn] ?? "").trim();
    if (!name && !supplied) return;

    if (!supplied) {
      blank += 1;
      return;
    }

    const domain = canonicalDomain(supplied);
    if (!domain || !DOMAIN_PATTERN.test(domain)) {
      unmatched.push({
        line,
        name,
        domain: supplied,
        why: `not a domain${domain && domain !== supplied.toLowerCase() ? ` (read as "${domain}")` : ""}`,
        candidates: [],
      });
      return;
    }

    let ids = byExact.get(name);
    if (!ids) {
      ids = byFolded.get(foldName(name));
      if (ids && ids.length === 1) loose += 1;
    }

    if (!ids) {
      unmatched.push({
        line,
        name,
        domain,
        why: "no company with this name",
        candidates: [],
      });
      return;
    }
    if (ids.length > 1) {
      unmatched.push({
        line,
        name,
        domain,
        why: `matches ${ids.length} companies — pick one`,
        candidates: ids,
      });
      return;
    }

    const id = ids[0] as string;
    const previous = resolved.get(id);
    if (previous && previous !== domain) {
      unmatched.push({
        line,
        name,
        domain,
        why: `this file already gave ${id} the domain "${previous}"`,
        candidates: [id],
      });
      return;
    }
    resolved.set(id, domain);
  });

  /* -- write the filled template ------------------------------------------- */
  const companies = [...dataset.companies].sort(
    (a, b) =>
      a.industry.localeCompare(b.industry) || a.name.localeCompare(b.name),
  );
  const out: string[][] = [
    [...HEADER],
    ...companies.map((company) => [
      company.id,
      company.name,
      company.industry,
      // A resolved domain wins; otherwise whatever is already stored is preserved, so
      // merging a second batch never blanks the first.
      resolved.get(company.id) ?? company.domain ?? "",
    ]),
  ];
  writeFileSync(DEFAULT_CSV_PATH, toCsv(out), "utf8");

  /* -- report -------------------------------------------------------------- */
  console.log(`\n✓ Wrote ${DEFAULT_CSV_PATH}`);
  console.log(`  matched:   ${resolved.size}`);
  if (loose > 0) console.log(`  of those, ${loose} matched only after folding case/spacing.`);
  if (blank > 0) console.log(`  skipped:   ${blank} source row(s) with no domain.`);

  if (unmatched.length > 0) {
    const report = resolve(process.cwd(), "data/domains-unmatched.csv");
    const byId = new Map(dataset.companies.map((company) => [company.id, company]));

    /**
     * One row per CANDIDATE, not per source row, so an ambiguous name produces two
     * fully described lines to choose between rather than one line naming a problem.
     * `paste_domain_here` is last and pre-filled, so resolving a row is: delete the
     * value on the wrong candidate, keep it on the right one, copy into
     * `data/domains.csv` against that id.
     */
    const reportRows: string[][] = [
      [
        "source_line",
        "source_name",
        "problem",
        "candidate_id",
        "candidate_name",
        "candidate_industry",
        "candidate_hq",
        "candidate_established",
        "candidate_cities",
        "paste_domain_here",
      ],
    ];
    for (const item of unmatched) {
      if (item.candidates.length === 0) {
        reportRows.push([
          String(item.line),
          item.name,
          item.why,
          "",
          "",
          "",
          "",
          "",
          "",
          item.domain,
        ]);
        continue;
      }
      for (const id of item.candidates) {
        const company = byId.get(id);
        reportRows.push([
          String(item.line),
          item.name,
          item.why,
          id,
          company?.name ?? "",
          company?.industry ?? "",
          company?.hqCountry ?? "",
          company ? String(company.establishedYear) : "",
          company ? company.cities.join(" / ") : "",
          item.domain,
        ]);
      }
    }
    writeFileSync(report, toCsv(reportRows), "utf8");

    console.log(`\n! ${unmatched.length} row(s) NOT placed. Written to ${report}`);
    for (const item of unmatched.slice(0, 12)) {
      console.log(`  line ${item.line} "${item.name}" → ${item.domain}: ${item.why}`);
      for (const id of item.candidates) {
        const company = byId.get(id);
        console.log(
          `      ${id}  ${company?.industry ?? "?"}, ${company?.hqCountry ?? "?"}, ` +
            `est. ${company?.establishedYear ?? "?"}, ${company?.cities.join(" / ") ?? "?"}`,
        );
      }
    }
    if (unmatched.length > 12) console.log(`  … and ${unmatched.length - 12} more.`);
    console.log(
      `\n  Reported rather than guessed on purpose — a wrong match puts one company's\n` +
        `  logo on another. To resolve: pick the right candidate_id and put the domain\n` +
        `  in that id's row in data/domains.csv, then re-run domains:import.`,
    );
  }

  console.log(`\n  Next: npm run domains:import\n`);
}

/* -------------------------------------------------------------------------- */

const mode = process.argv[2];
if (mode === "template") {
  writeTemplate();
} else if (mode === "merge") {
  runMerge();
} else if (mode === "import") {
  runImport();
} else {
  console.error(
    `\nUsage:\n` +
      `  npm run domains:template               write an empty data/domains.csv\n` +
      `  npm run domains:merge -- --from x.csv  fill it from your own name,domain file\n` +
      `  npm run domains:import                 dry run, reports only\n` +
      `  npm run domains:import -- --apply      write data/dataset.json\n`,
  );
  process.exit(1);
}
