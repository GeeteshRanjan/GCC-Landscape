import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  WHOLE_WORD_MAX_LENGTH,
  matchesSearch,
  matchesTokens,
  normaliseSearchText,
  searchHaystack,
  searchTokens,
} from "@/data/search";
import {
  HQ_COUNTRY_TERMS,
  INDUSTRY_TERMS,
  SUB_INDUSTRY_TERMS,
} from "@/data/search-terms";
import { HQ_COUNTRIES } from "@/data/countries";
import { parseDataset, type Dataset } from "@/data/schema";

/**
 * FINDABILITY — the test that located the reported defect and now guards the fix.
 *
 * ── What was wrong ──────────────────────────────────────────────────────────
 *
 * A visitor reported that the peers they were shown had nothing to do with their
 * business. The scoring engine was not at fault: given the right sub-industry it
 * returns a coherent set (`match-quality.test.ts` measures that). The fault was
 * upstream. Sub-industry is the primary ordering signal AND it is optional, and the
 * filter in the industry dropdown was a substring test against the row's printed
 * label — so an ordinary trade word found nothing, the visitor fell back to
 * `All of {industry}`, and the engine faithfully ordered 656 software companies by
 * revenue band and headcount.
 *
 * `THE_TERMS_THAT_FOUND_NOTHING` below is the list that made it measurable. Every
 * one of them matched no row at all before the term tables existed. They are kept as
 * the regression: if any of them stops resolving, the discovery path has broken again
 * and the symptom will be a bad peer set, not a failing lookup.
 *
 * ── The shape of the assertions ─────────────────────────────────────────────
 *
 * Two directions, and both are needed.
 *
 * FORWARD: every term filed under a row must actually reach that row. Trivially true
 * for a term that is a substring of its own label; the ones worth asserting are the
 * ones that are not, which is most of them.
 *
 * REVERSE: a term must not be so broad that it reaches half the taxonomy. This is
 * the assertion that keeps the term tables from becoming keyword stuffing — the
 * failure mode of any synonym list is that somebody adds `platform` to twelve rows
 * and the filter stops narrowing anything.
 */

const dataset: Dataset = parseDataset(
  JSON.parse(readFileSync(path.join(process.cwd(), "data", "dataset.json"), "utf8")),
);

const industries = dataset.taxonomy.industries;
const businessTypes = dataset.businessTypes;

/** Every row a visitor can see in the industry tree, with its search haystack. */
const rows = [
  ...industries.map((name) => ({
    kind: "industry" as const,
    key: name,
    label: name,
    haystack: searchHaystack(name, INDUSTRY_TERMS[name]),
  })),
  ...businessTypes.map((type) => ({
    kind: "sub-industry" as const,
    key: type.id,
    label: type.name,
    haystack: searchHaystack(type.name, SUB_INDUSTRY_TERMS[type.id]),
  })),
];

function hits(query: string) {
  const tokens = searchTokens(query);
  return rows.filter((row) => matchesTokens(tokens, row.haystack));
}

/**
 * The rows the industry dropdown would actually show, which is not the same as the
 * rows that match.
 *
 * `SelectField` keeps a parent whose own label missed but one of whose CHILDREN hit,
 * because dropping it would hide the hit entirely — the child lives in a pane that
 * only opens off the parent. So `Software & Internet` is on screen for the query
 * `payments` even though the word is nowhere in the industry's own terms. Modelling
 * that here rather than asserting against `rows` directly is what keeps this file
 * testing the visitor's experience instead of a data structure.
 */
function visibleIndustries(query: string): string[] {
  const tokens = searchTokens(query);
  return industries.filter((name) => {
    const own = searchHaystack(name, INDUSTRY_TERMS[name]);
    if (matchesTokens(tokens, own)) return true;
    return businessTypes
      .filter((type) => type.industry === name)
      .some((type) =>
        matchesTokens(tokens, searchHaystack(type.name, SUB_INDUSTRY_TERMS[type.id])),
      );
  });
}

/* ────────────────────────────────────────────────────────────────────────────
 * The matcher itself
 * ──────────────────────────────────────────────────────────────────────────── */

describe("normaliseSearchText", () => {
  it("folds case, diacritics and punctuation to plain words", () => {
    expect(normaliseSearchText("Dassault Systèmes")).toBe("dassault systemes");
    expect(normaliseSearchText("CI/CD")).toBe("ci cd");
    expect(normaliseSearchText("  E-Commerce!  ")).toBe("e commerce");
  });

  /**
   * Nearly every row in this taxonomy contains an ampersand, so this one rule is the
   * difference between `research and development` reaching
   * `Clinical research & development services` and reaching nothing.
   */
  it("writes & as the word, on both sides of the comparison", () => {
    expect(normaliseSearchText("Property & casualty insurance")).toBe(
      "property and casualty insurance",
    );
    expect(matchesSearch("property and casualty", "Property & casualty insurance")).toBe(true);
    // `p & c` and `p and c` are the same query once normalised, and both reach the row
    // through its authored term rather than its label — an initialism is not a
    // substring of the words it stands for.
    expect(
      matchesSearch("p & c", "Property & casualty insurance", SUB_INDUSTRY_TERMS["fin-insurance-pc"]),
    ).toBe(true);
    expect(
      matchesSearch("p and c", "Property & casualty insurance", SUB_INDUSTRY_TERMS["fin-insurance-pc"]),
    ).toBe(true);
  });
});

describe("matchesTokens", () => {
  it("is vacuously true with no query, so an empty filter hides nothing", () => {
    expect(matchesTokens(searchTokens("   "), "anything")).toBe(true);
  });

  it("requires EVERY token, so a second word narrows rather than widens", () => {
    const haystack = searchHaystack("Payments & financial infrastructure", [
      "payment gateway",
    ]);
    expect(matchesTokens(searchTokens("payment"), haystack)).toBe(true);
    expect(matchesTokens(searchTokens("payment gateway"), haystack)).toBe(true);
    expect(matchesTokens(searchTokens("payment tractors"), haystack)).toBe(false);
  });

  /**
   * The compatibility guarantee. The previous behaviour was
   * `label.toLowerCase().includes(needle)`, and this test is what licenses the swap:
   * whatever used to match still matches, so no visitor loses a row they had
   * already learned to find.
   */
  it("strictly widens the old label-substring behaviour, from four characters up", () => {
    for (const row of rows) {
      for (const word of row.label.toLowerCase().split(/[^a-z0-9]+/)) {
        if (word.length <= WHOLE_WORD_MAX_LENGTH) continue;
        if (!row.label.toLowerCase().includes(word)) continue;
        expect(
          matchesTokens(searchTokens(word), row.haystack),
          `"${word}" used to find "${row.label}" and must still find it`,
        ).toBe(true);
      }
    }
  });

  /**
   * The deliberate narrowing, pinned so it reads as a decision. As a substring `ai`
   * reached 39 sub-industries through `retail` and `chain`; as a whole word it reaches
   * the AI platform row, which is what the visitor typing it meant.
   */
  it("treats a token of three characters or fewer as a whole word", () => {
    expect(matchesSearch("ai", "Retail")).toBe(false);
    expect(matchesSearch("ai", "AI & machine learning platform")).toBe(true);
    expect(matchesSearch("si", "Business process outsourcing")).toBe(false);
    const aiRows = hits("ai").filter((row) => row.kind === "sub-industry");
    expect(aiRows.length).toBeLessThanOrEqual(3);
  });
});

/* ────────────────────────────────────────────────────────────────────────────
 * The regression list: the words that used to find nothing
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Measured against the shipped taxonomy: 41 of 102 ordinary trade words matched no
 * row at all. These are those 41, each with the row a visitor typing it is looking
 * for. Where a word legitimately belongs to more than one row — `payments` is the
 * reported case — the expectation names the one that must be reachable, and the
 * cross-industry pair is asserted separately below.
 */
const THE_TERMS_THAT_FOUND_NOTHING: ReadonlyArray<[query: string, expectKey: string]> = [
  ["payment gateway", "sw-payments"],
  ["saas", "Software & Internet"],
  ["financial services", "BFSI"],
  ["insurtech", "sw-insurance"],
  ["adtech", "med-adtech"],
  ["3pl", "log-freight"],
  ["bpo", "prof-bpo"],
  ["wafer", "semi-foundry"],
  ["medtech", "hc-medical-devices"],
  ["cro", "hc-cro"],
  ["streaming", "sw-media-tech"],
  ["ecommerce", "ret-ecommerce"],
  ["retail bank", "fin-retail-bank"],
  ["asset management", "fin-asset-management"],
  ["hr tech", "sw-hr"],
  ["proptech", "sw-construction-tech"],
  ["legaltech", "sw-legal-compliance"],
  ["telco", "tel-operator"],
  ["isp", "tel-operator"],
  ["solar", "enr-renewables"],
  ["cosmetics", "cpg-personal-care"],
  ["defence", "aero-primes"],
  ["edtech", "edu-edtech"],
  ["university", "edu-institution"],
  ["distributor", "Wholesale"],
  ["qsr", "rst-qsr"],
  ["laptop", "ce-computing"],
  ["router", "tel-equipment"],
  ["tyre", "auto-components"],
  ["tire", "auto-components"],
  ["fertiliser", "chem-agrochemicals"],
  ["robotics", "mfg-automation"],
  ["printer", "mfg-print-imaging"],
  ["pos", "sw-retail-tech"],
  ["loyalty", "sw-retail-tech"],
  ["kyc", "fin-software-services"],
  ["aml", "fin-software-services"],
  ["wealth", "fin-asset-management"],
  ["broker", "fin-insurance-broker"],
  ["reinsurance", "fin-insurance-pc"],
  ["vaccines", "hc-pharma"],
];

describe("the trade words a visitor actually types", () => {
  it.each(THE_TERMS_THAT_FOUND_NOTHING)(
    "%s reaches %s",
    (query, expectKey) => {
      expect(hits(query).map((row) => row.key)).toContain(expectKey);
    },
  );

  /**
   * The reported case, stated as the thing it actually is.
   *
   * A payments platform is one business that this taxonomy holds on BOTH sides of a
   * hard industry boundary, and `matchPeers` never crosses that boundary. Nothing
   * here can show the visitor peers from both industries; what it can do is refuse
   * to hide the choice. Typing `payments` has to surface both rows so the decision
   * is informed rather than a coin flip.
   */
  it("surfaces both payments sub-industries, in both industries, for one query", () => {
    const keys = hits("payments").map((row) => row.key);
    expect(keys).toContain("sw-payments");
    expect(keys).toContain("fin-payments");
    expect(visibleIndustries("payments")).toEqual(
      expect.arrayContaining(["Software & Internet", "BFSI"]),
    );
    // Same for the other two words the reported visitor would plausibly have typed.
    for (const query of ["fintech", "payment gateway"]) {
      expect(visibleIndustries(query), query).toEqual(
        expect.arrayContaining(["Software & Internet", "BFSI"]),
      );
    }
  });

  /**
   * The counterpart, and the reason the AND rule matters: surfacing an ambiguous
   * choice is only useful if the filter still narrows. A visitor typing `payments`
   * must not be handed most of the taxonomy.
   */
  it("still narrows to a handful of industries for an ambiguous query", () => {
    expect(visibleIndustries("payments").length).toBeLessThanOrEqual(4);
    expect(visibleIndustries("fintech").length).toBeLessThanOrEqual(3);
  });

  /**
   * `BFSI` is the only industry name in the taxonomy that is an abbreviation, and it
   * is the one a visitor outside India is least likely to recognise. Without terms,
   * somebody at an insurer searching the dropdown never learns that 189 banks and
   * insurers are one row away.
   */
  it("reaches BFSI by the words a banker or insurer would type", () => {
    for (const query of ["banking", "insurance", "financial services", "capital markets"]) {
      expect(hits(query).map((row) => row.key), query).toContain("BFSI");
    }
  });
});

/* ────────────────────────────────────────────────────────────────────────────
 * The term tables, checked against themselves
 * ──────────────────────────────────────────────────────────────────────────── */

describe("SUB_INDUSTRY_TERMS", () => {
  it("covers every sub-industry in the published dataset", () => {
    const missing = businessTypes
      .filter((type) => !SUB_INDUSTRY_TERMS[type.id])
      .map((type) => `${type.industry} / ${type.name} (${type.id})`);
    expect(missing).toEqual([]);
  });

  /**
   * A term for a business type that no longer exists is dead weight that reads as
   * coverage. Admin can rename a business type; it cannot change the id, so a key
   * here going stale means the catalogue lost an entry.
   */
  it("has no key that does not resolve to a business type", () => {
    const ids = new Set(businessTypes.map((type) => type.id));
    expect(Object.keys(SUB_INDUSTRY_TERMS).filter((id) => !ids.has(id))).toEqual([]);
  });

  it("files every term under a row it actually reaches", () => {
    const wrong: string[] = [];
    for (const type of businessTypes) {
      const haystack = searchHaystack(type.name, SUB_INDUSTRY_TERMS[type.id]);
      for (const term of SUB_INDUSTRY_TERMS[type.id] ?? []) {
        if (!matchesTokens(searchTokens(term), haystack)) {
          wrong.push(`${type.id}: "${term}"`);
        }
      }
    }
    expect(wrong).toEqual([]);
  });

  /**
   * The anti-keyword-stuffing assertion, and the only one here with a number in it.
   *
   * A term is allowed to be ambiguous — `fintech`, `payments`, `gaming` and
   * `insurance` genuinely describe rows in more than one industry, and surfacing all
   * of them is the point. What is not allowed is a term so generic that it stops the
   * filter narrowing anything. Six rows out of 182 is the ceiling; a new term that
   * breaks it belongs on fewer rows, or belongs on the INDUSTRY instead.
   */
  it("has no term broad enough to stop the filter narrowing", () => {
    const AMBIGUITY_CEILING = 6;
    const tooBroad: string[] = [];
    const seen = new Set<string>();
    for (const terms of Object.values(SUB_INDUSTRY_TERMS)) {
      for (const term of terms) {
        if (seen.has(term)) continue;
        seen.add(term);
        const matched = hits(term).filter((row) => row.kind === "sub-industry");
        if (matched.length > AMBIGUITY_CEILING) {
          tooBroad.push(`"${term}" reaches ${matched.length} sub-industries`);
        }
      }
    }
    expect(tooBroad).toEqual([]);
  });

  it("never duplicates a term inside one row", () => {
    for (const [id, terms] of Object.entries(SUB_INDUSTRY_TERMS)) {
      expect(new Set(terms).size, id).toBe(terms.length);
    }
  });

  it("holds only normalised, non-empty terms", () => {
    for (const [id, terms] of Object.entries(SUB_INDUSTRY_TERMS)) {
      for (const term of terms) {
        expect(term, `${id}: "${term}"`).toBe(normaliseSearchText(term));
      }
    }
  });
});

describe("INDUSTRY_TERMS", () => {
  it("covers every industry in the taxonomy", () => {
    expect(industries.filter((name) => !INDUSTRY_TERMS[name])).toEqual([]);
  });

  it("has no key that is not an industry", () => {
    const known = new Set(industries);
    expect(Object.keys(INDUSTRY_TERMS).filter((name) => !known.has(name))).toEqual([]);
  });

  it("files every term under an industry it actually reaches", () => {
    const wrong: string[] = [];
    for (const name of industries) {
      const haystack = searchHaystack(name, INDUSTRY_TERMS[name]);
      for (const term of INDUSTRY_TERMS[name] ?? []) {
        if (!matchesTokens(searchTokens(term), haystack)) wrong.push(`${name}: "${term}"`);
      }
    }
    expect(wrong).toEqual([]);
  });
});

describe("HQ_COUNTRY_TERMS", () => {
  /**
   * The country list is every country in the world, so a key that is not in it is a
   * spelling mistake rather than a taxonomy change — and a silent one, because a
   * misspelled key simply never matches.
   */
  it("has no key that is not a selectable country", () => {
    const known = new Set<string>(HQ_COUNTRIES);
    expect(Object.keys(HQ_COUNTRY_TERMS).filter((name) => !known.has(name))).toEqual([]);
  });

  it("reaches the UK and the USA by the names a visitor actually uses", () => {
    const country = (name: string) =>
      HQ_COUNTRIES.filter((entry) =>
        matchesSearch(name, entry, HQ_COUNTRY_TERMS[entry]),
      );
    expect(country("england")).toContain("UK");
    expect(country("britain")).toContain("UK");
    expect(country("united states")).toContain("USA");
    expect(country("america")).toContain("USA");
    expect(country("holland")).toContain("Netherlands");
    expect(country("dubai")).toContain("UAE");
  });
});
