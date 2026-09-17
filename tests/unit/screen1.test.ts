import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  CITY_COORDINATES,
  MAP_FRAME,
  MAP_HEIGHT,
  MAP_STANDARD_PARALLEL,
  MAP_WIDTH,
  projectCity,
} from "@/data/geo";
import { INDIA_OUTLINE_FRAME, INDIA_OUTLINE_PATH } from "@/data/india-outline";
import { sumProfessionals } from "@/data/derive";
import { matchPeers } from "@/data/peers";
import {
  buildPeerView,
  COMMON_FUNCTIONS,
  GCC_STATUSES,
  industryOptions,
  peerViewInputSchema,
  roundProfessionals,
  type PeerViewInput,
} from "@/data/screen1";
import {
  formatCount,
  formatProfessionals,
  formatRevenueBand,
  formatShare,
} from "@/components/public/primitives";
import {
  DEFAULT_COMMON_FUNCTIONS,
  parseDataset,
  type Dataset,
  type LatLon,
} from "@/data/schema";
import {
  framing,
  industryLine,
  FUNCTIONS_LEAD,
  FUNCTIONS_TITLE,
  LARGEST_LEAD,
  largestCountLine,
  largestLine,
  largestOverlapLine,
  largestTitle,
  mapHeading,
  mapTitle,
  peerCountLine,
  peerLead,
  SCALE,
  shortfallLine,
  signals,
  snapshotHeading,
} from "@/components/screen1/copy";

/**
 * Screen 1's view model and its copy.
 *
 * Run against the real published dataset rather than a fixture, deliberately. The
 * cases worth testing here are the degenerate ones — the industries too small to
 * fill a peer set, the ones with nobody in the top revenue band — and those are
 * properties of the actual data. A hand-built fixture would let the code pass
 * while the real screen renders "and 0 others".
 *
 * Peer matching itself is not retested; it belongs to ./peers.ts and to
 * `npm run data:verify`'s invariants. What is tested here is the layer on top:
 * whether the view model correctly identifies a result as degenerate, and whether
 * the copy says something true when it is.
 */

const dataset: Dataset = parseDataset(
  JSON.parse(
    readFileSync(path.join(process.cwd(), "data", "dataset.json"), "utf8"),
  ),
);

const BANDS = dataset.taxonomy.revenueBands;
const TOP_BAND = BANDS[BANDS.length - 1]!;

function input(overrides: Partial<PeerViewInput> = {}): PeerViewInput {
  return {
    industry: "BFSI",
    revenueBand: TOP_BAND,
    hqCountry: "USA",
    gccStatus: "evaluating",
    ...overrides,
  };
}

/**
 * The published dataset with one taxonomy or `siteContent` key replaced.
 *
 * Three things the view model used to hardcode are now dataset fields, and each of
 * them can only be tested by varying it — the shipped values are the ones the live
 * screen uses, so asserting against them alone would pass just as happily on a
 * constant. These build the counter-case.
 *
 * Structural spreads rather than a re-parse, deliberately. Re-validating 1,834
 * companies per case buys nothing here: what the schema guarantees about these keys
 * (a pinned industry exists, a coordinate's city exists, the coordinate is inside
 * India) is asserted in `schema.test.ts`, and these tests are about what the view
 * model does with a value that already passed the gate.
 */
const withTaxonomy = (taxonomy: Partial<Dataset["taxonomy"]>): Dataset => ({
  ...dataset,
  taxonomy: { ...dataset.taxonomy, ...taxonomy },
});

const withSiteContent = (
  siteContent: Partial<Dataset["siteContent"]>,
): Dataset => ({
  ...dataset,
  siteContent: { ...dataset.siteContent, ...siteContent },
});

describe("input validation", () => {
  const schema = peerViewInputSchema(dataset.taxonomy);

  it("accepts a well-formed input", () => {
    expect(schema.safeParse(input()).success).toBe(true);
  });

  it("rejects values that are not in the taxonomy", () => {
    // The taxonomy is admin-editable, so validation is built from it rather than
    // from a fixed enum. Anything off the list is refused rather than coerced: a
    // near-miss industry would silently return a different industry's peers.
    for (const field of ["industry", "revenueBand", "hqCountry"] as const) {
      const result = schema.safeParse(input({ [field]: "Not A Real Value" }));
      expect(result.success, field).toBe(false);
    }
  });

  it("rejects an unknown GCC status", () => {
    expect(schema.safeParse(input({ gccStatus: "maybe" as never })).success).toBe(
      false,
    );
  });

  /**
   * **The company name is not a field any more, and this replaces the two tests that
   * validated it.** They checked that it was optional, trimmed, and refused past 120
   * characters. The form no longer asks, so what has to hold is stronger and simpler: a
   * name posted at this action does not survive validation. zod strips an unrecognised key
   * rather than refusing it, which is the behaviour to pin — the parsed input is what the
   * server acts on, and nothing about a visitor's identity may reach it. There is no lead
   * capture in this codebase.
   */
  it("drops a company name rather than accepting one", () => {
    const posted = { ...input(), companyName: "  Acme  " };
    const result = schema.safeParse(posted);
    expect(result.success).toBe(true);
    expect(result.success && result.data).not.toHaveProperty("companyName");
    expect(Object.keys(result.success ? result.data : {})).not.toContain("companyName");
  });
});

/**
 * The industry dropdown's leading tier: company counts, plus whatever the taxonomy
 * pins.
 *
 * **The pinned list is data now, and these tests are what stop it quietly becoming a
 * constant again.** Retail and Consumer Packaged Goods are what `data/dataset.json`
 * pins today, so every assertion about the shipped dataset would pass identically
 * against a hardcoded pair — which is why the cases below vary the field and check the
 * tier moves with it. The two properties that have to survive any value: pinning
 * decides MEMBERSHIP and never position, and an empty list leaves a pure count
 * ordering, which is the behaviour a dataset written before the key existed reads with.
 */
describe("the industry dropdown's leading tier", () => {
  const counts = new Map<string, number>();
  for (const company of dataset.companies) {
    counts.set(company.industry, (counts.get(company.industry) ?? 0) + 1);
  }
  const count = (industry: string) => counts.get(industry) ?? 0;

  /** Count descending, name ascending — the order `industryOptions` derives from. */
  const byCount = [...dataset.taxonomy.industries].sort(
    (a, b) => count(b) - count(a) || a.localeCompare(b, "en"),
  );
  const COMMON_INDUSTRIES = 6;
  const onCount = byCount.slice(0, COMMON_INDUSTRIES);
  const smallest = byCount[byCount.length - 1]!;
  const largest = byCount[0]!;

  it("pins what the taxonomy pins, and nothing frequency would have found anyway", () => {
    expect(dataset.taxonomy.pinnedIndustries).toEqual([
      "Retail",
      "Consumer Packaged Goods",
    ]);

    const { common, others } = industryOptions(dataset);
    for (const pinned of dataset.taxonomy.pinnedIndustries) {
      expect(common, pinned).toContain(pinned);
      expect(others, pinned).not.toContain(pinned);
      // The reason pinning exists at all: neither reaches the tier on count. If one
      // ever does, its pin has stopped doing anything and can go.
      expect(onCount, pinned).not.toContain(pinned);
    }
  });

  it("takes the list from the taxonomy rather than from a value written down here", () => {
    // The smallest industry in the data. Nothing about frequency could put it in a
    // six-entry tier, so its presence there is only explicable by the pin.
    const { common, others } = industryOptions(
      withTaxonomy({ pinnedIndustries: [smallest] }),
    );
    expect(common).toContain(smallest);
    expect(others).not.toContain(smallest);

    // And the pair the shipped dataset pins drops out, which is the half that a
    // surviving constant would fail.
    for (const unpinned of dataset.taxonomy.pinnedIndustries) {
      expect(common, unpinned).not.toContain(unpinned);
      expect(others, unpinned).toContain(unpinned);
    }
  });

  it("sorts the tier by count, so a pin decides membership and never position", () => {
    const { common } = industryOptions(
      withTaxonomy({ pinnedIndustries: [smallest] }),
    );
    for (let i = 1; i < common.length; i += 1) {
      expect(
        count(common[i]!),
        `${common[i]} above ${common[i - 1]}`,
      ).toBeLessThanOrEqual(count(common[i - 1]!));
    }
    // Largest-first means the pinned outlier lands last, not first.
    expect(common[common.length - 1]).toBe(smallest);
  });

  it("leaves a pure count ordering when nothing is pinned", () => {
    const { common, others } = industryOptions(
      withTaxonomy({ pinnedIndustries: [] }),
    );
    expect(common).toEqual(onCount);
    expect(others).toEqual(
      [...byCount.slice(COMMON_INDUSTRIES)].sort((a, b) => a.localeCompare(b, "en")),
    );
    // Nothing is lost or duplicated by the split, whatever is pinned.
    expect([...common, ...others].sort()).toEqual(
      [...dataset.taxonomy.industries].sort(),
    );
  });

  it("never lists an industry twice, however the pins overlap the count", () => {
    // The case a concat would break: pinning something the count already put in the
    // tier. It shows up as a duplicated option in a dropdown long after the person
    // who pinned it has forgotten.
    const { common, others } = industryOptions(
      withTaxonomy({ pinnedIndustries: [largest, smallest] }),
    );
    expect(common.filter((industry) => industry === largest)).toHaveLength(1);
    expect(common).toEqual([...onCount, smallest]);
    expect(others).not.toContain(largest);
  });
});

describe("buildPeerView", () => {
  it("returns cards, not companies", () => {
    const view = buildPeerView(dataset, input());
    const [peer] = view.peers.peers;
    expect(peer).toBeDefined();
    // Narrower than `Company` on purpose: revenue band is a matching input, not a
    // fact worth publishing beside a peer's name. The exhaustive key list is the
    // point — it is what makes adding a field to this card a deliberate act rather
    // than something that happens on the way to fixing a layout.
    expect(Object.keys(peer!).sort()).toEqual([
      "cities",
      "establishedYear",
      "fortuneGlobal500",
      "headcount",
      // **`hqCountry` is NOT here, and its absence is the assertion.** It was shown
      // as the comparison table's Headquarters column for one pass and ANSR asked for
      // it back off; the field went with the column, because a card carrying a value
      // nothing renders is how the next reader concludes the omission was an
      // oversight. Also still absent: `revenueBand`, `industry`, `businessTypes` and
      // `forbesGlobal2000`.
      "id",
      // **`markUrl` is a resolved URL or null, and `domain` is deliberately NOT here.**
      // The card is handed a finished source so the component knows no provider, holds
      // no client ID and picks no source; a raw domain on the card would invite a second
      // component to build its own URL from it. Resolved by `company-mark.ts`.
      "markUrl",
      "name",
      // A ratio, never a published figure: the visible headcount stays the band,
      // because a share derived from band midpoints is honest as a bar's length
      // and would not be honest as a statistic.
      "sizeShare",
    ]);
  });

  it("scales each set of cards against its own largest member", () => {
    // Sharing one peak across both blocks would flatten every peer bar to a sliver
    // whenever the industry contained an Amazon — which is most industries — and
    // the peer block's comparison would be lost to a company it does not show.
    const view = buildPeerView(dataset, input({ industry: "Retail" }));

    const peerShares = view.peers.peers.map((peer) => peer.sizeShare);
    expect(Math.max(...peerShares)).toBe(1);

    const largestShares = view.largest.entries.map(
      (entry) => entry.company.sizeShare,
    );
    expect(Math.max(...largestShares)).toBe(1);

    // And the two really are different scales here, so the peer bars are not just
    // the largest panel's bars under another heading.
    expect(peerShares).not.toEqual(largestShares);
  });

  /**
   * **This asserts the ENGINE's guard, because the view model can no longer reach it.**
   * It used to build a `PeerView` with the visitor's own name in the input; the form no
   * longer asks for a name, `PeerViewInput` has no field for one, and `buildPeerView`
   * therefore cannot exclude anybody. The guard itself is unchanged and still lives on
   * `VisitorInput.companyName` in `peers.ts`, exercised here and by the analysis scripts.
   *
   * The consequence for a visitor is real and is recorded on `PeerViewInput`: their own
   * company can now appear in its own peer set. Restoring the exclusion means asking for a
   * name again, which is a product decision — so this test is what keeps the mechanism
   * working for whenever that is taken.
   */
  it("keeps the visitor's own company out of the set when a name is supplied to the engine", () => {
    const own = dataset.companies.find((c) => c.industry === "BFSI")!;
    const result = matchPeers(dataset, {
      companyName: own.name,
      industry: "BFSI",
      revenueBand: own.revenueBand,
    });
    expect(result.peers.map((p) => p.id)).not.toContain(own.id);
  });

  it("shows headcount as a band, never a point figure", () => {
    const view = buildPeerView(dataset, input());
    for (const peer of view.peers.peers) {
      // Either a range, or an open-ended floor. Never a bare number, because the
      // exact-headcount column is dropped and a point figure would imply one.
      expect(peer.headcount).toMatch(/[\u2013+]|^under /);
    }
  });

  it("rounds professionals rather than implying band-midpoint precision", () => {
    const view = buildPeerView(dataset, input());
    expect(view.scale.professionals % 10_000).toBe(0);
    expect(view.scale.indexedProfessionals % 10_000).toBe(0);
    // Rounding must not become invention: it stays within half a step of truth.
    expect(view.scale.indexedProfessionals).toBeGreaterThan(0);
    expect(view.scale.indexedProfessionals).toBeLessThan(
      view.scale.professionals,
    );
  });

  /**
   * **The indexed figure is the UNION of the two memberships, deduplicated.** It was the
   * Fortune Global 500 subset alone, reported under two cells naming two different
   * indices — so the narrower membership stood in as the total for both.
   *
   * The property that has to hold is that it cannot be the two sums added: the indices
   * overlap heavily, so adding them would count most of these companies' people twice.
   * Asserted as a bound rather than as an equality, because the exact figure is a profile
   * measurement and lives in `data:verify`'s baseline.
   */
  it("sums the two index memberships once each, never twice", () => {
    const view = buildPeerView(dataset, input());
    const both = dataset.companies.filter(
      (c) => c.fortuneGlobal500 && c.forbesGlobal2000,
    );
    // The overlap is real, or this test is asserting nothing.
    expect(both.length).toBeGreaterThan(0);

    const fortuneOnly = sumProfessionals(
      dataset.companies.filter((c) => c.fortuneGlobal500),
    );
    const forbesOnly = sumProfessionals(
      dataset.companies.filter((c) => c.forbesGlobal2000),
    );
    // Strictly under the naive sum, by at least the overlap's own people.
    expect(view.scale.indexedProfessionals).toBeLessThan(
      fortuneOnly + forbesOnly,
    );
    // And at least as large as either membership alone, which a union must be.
    expect(view.scale.indexedProfessionals).toBeGreaterThanOrEqual(
      roundProfessionals(Math.max(fortuneOnly, forbesOnly)),
    );
  });

  /**
   * **The industry's share of India is counted over ONE population on both sides.**
   *
   * `industry.total` is the peer pool, which drops the visitor's own company where the
   * dataset holds it; `scale.companyCount` is every company, which does not. Dividing one
   * by the other — which the snapshot did — is a ratio of two populations differing by
   * one, in a direction that depends on whether the visitor's own company is in our data.
   * `shareOfIndia` is derived in the view model for that reason.
   */
  it("derives the industry share over a consistent population", () => {
    for (const industry of dataset.taxonomy.industries) {
      const inIndustry = dataset.companies.filter(
        (c) => c.industry === industry,
      ).length;
      const view = buildPeerView(dataset, input({ industry }));
      expect(view.industry.shareOfIndia, industry).toBeCloseTo(
        inIndustry / dataset.companies.length,
        10,
      );
    }

    /**
     * **The counter-example this test used to end on is GONE, and it is worth saying why
     * rather than quietly dropping it.** It built two views of BFSI, one naming JPMorgan
     * Chase, and asserted that `total` fell by one while `shareOfIndia` did not — which is
     * what proves the share is computed over the industry rather than as
     * `total / companies.length`. Both figures were only ever different for a visitor who
     * named a company we hold, and the form no longer asks for a name, so the two are now
     * equal for every input and the case cannot be constructed through `buildPeerView`.
     *
     * What survives is the loop above, which pins the share to the industry's own count
     * for all 24 industries. The derivation it guards is unchanged and `shareOfIndia` is
     * rendered by nothing today; the rule that it must never be recomputed from two
     * populations is in `project.md`.
     */
    const anonymous = buildPeerView(dataset, input({ industry: "BFSI" }));
    expect(anonymous.industry.shareOfIndia).toBeCloseTo(
      dataset.companies.filter((c) => c.industry === "BFSI").length /
        dataset.companies.length,
      10,
    );
  });

  it("reports the same national scale whatever the visitor answers", () => {
    // The block is scale proof across all of India, not the peer set. If it moved
    // with the input it would be measuring the wrong thing.
    const a = buildPeerView(dataset, input({ industry: "BFSI" }));
    const b = buildPeerView(
      dataset,
      input({ industry: "Education", revenueBand: BANDS[0] }),
    );
    expect(a.scale).toEqual(b.scale);
  });

  it("filters the map to the visitor's industry", () => {
    const view = buildPeerView(dataset, input({ industry: "BFSI" }));
    const national = buildPeerView(dataset, input({ industry: "Software & Internet" }));
    expect(view.map.industry).toBe("BFSI");
    expect(view.map.cities.length).toBeLessThan(national.map.cities.length);
    expect(view.map.peak).toBe(view.map.cities[0]!.companies);
  });

  it("carries the common functions, and says nothing per-company about them", () => {
    const view = buildPeerView(dataset, input());
    // The PUBLISHED labels, which is what the block renders. The shipped dataset
    // still holds the seeded eight, so the two agree today — asserted both ways,
    // because the agreement is the thing that makes every other test in this file
    // able to talk about "the functions" without saying which copy it means.
    expect(view.functions).toEqual(dataset.siteContent.commonFunctions);
    expect(dataset.siteContent.commonFunctions).toEqual([...COMMON_FUNCTIONS]);
    /**
     * **`functionsBasis` is gone from the view model**, with the two caveat paragraphs
     * it fed. They said the list is the general India pattern rather than a breakdown
     * of the companies above, and that no share is stated for any function — both true,
     * both removed at ANSR's request. What carries the job now is the section's own
     * heading, "Functions most GCCs run from India", which is a claim about GCCs in
     * general and cannot be read as one about the five companies above it.
     *
     * So what is left to assert here is the property, not the sentence: the list is a
     * fixed general pattern with no per-company figure anywhere near it.
     */
    expect("functionsBasis" in view).toBe(false);
    expect(FUNCTIONS_TITLE).toMatch(/GCCs/);
    expect(FUNCTIONS_LEAD).not.toMatch(/%/);
  });

  /**
   * **The labels follow `siteContent.commonFunctions`, and `COMMON_FUNCTIONS` is the
   * seed rather than the render source.**
   *
   * The block could become editable data because it claims nothing — no count, no
   * share, no order — so there is nothing for an edit to contradict. That is also why
   * this test can vary the labels to something ANSR never approved without checking
   * anything about the words: what matters is which copy the screen reads.
   *
   * The constant is asserted NOT to be the render source, which is the failure this
   * guards. Both are the shipped eight today, so a `view.functions` that had gone on
   * reading the constant would pass every other test in the file.
   */
  it("renders the published functions, never the seeded constant", () => {
    const edited = ["Engineering", "Payroll & benefits", "Treasury"];
    const view = buildPeerView(
      withSiteContent({ commonFunctions: edited }),
      input(),
    );
    expect(view.functions).toEqual(edited);
    expect(view.functions).not.toEqual([...COMMON_FUNCTIONS]);

    // And the seed itself did not move: it is the schema's default and the thing to
    // diff a live dataset against, so it has to stay the shipped eight.
    expect(COMMON_FUNCTIONS).toEqual(DEFAULT_COMMON_FUNCTIONS);
    expect(COMMON_FUNCTIONS).toHaveLength(8);
  });

  /**
   * **The lead claimed a ranking the page has no evidence for.** It read "Most to
   * least common across India GCCs." over eight NUMBERED tiles — and `COMMON_FUNCTIONS`
   * is a hardcoded list, `COMMON_FUNCTIONS_BASIS` was deleted, and there is no
   * per-company function record in this dataset to derive a frequency from. The rank
   * badges made an unmeasured claim look measured, so the numbering went with the
   * sentence; `CommonFunctionsView` renders a `<ul>` now, because an ordered list is
   * itself an ordering claim in the accessibility tree.
   *
   * What the lead says instead is the one thing about the list that is both true and
   * worth knowing: it does not move with the visitor's answers. That is asserted here
   * as a property of the view model rather than taken on trust from the wording.
   */
  it("claims no ordering over the functions, because nothing measures one", () => {
    expect(FUNCTIONS_LEAD).not.toMatch(/most to least/i);
    expect(FUNCTIONS_LEAD).not.toMatch(/\border(ed|ing)?\b/i);
    expect(FUNCTIONS_LEAD).not.toMatch(/\branked?\b/i);

    // The claim the lead does make: the list is the same whatever was answered.
    const across = dataset.taxonomy.industries.map((industry) =>
      buildPeerView(dataset, input({ industry })).functions.join("|"),
    );
    expect(new Set(across).size).toBe(1);
  });
});

/**
 * The terminating scale strip's three labels.
 *
 * **All three were fragments and two of them said 500 twice.** The cell rendered a
 * 36px "181", then a smaller "of 500" beside it, then
 * "of the Fortune Global 500 companies have GCCs in India" underneath — so the reader
 * met the denominator twice and then a line opening with a preposition, which is not a
 * sentence in any reading order. Each label is now the predicate of a whole sentence
 * whose subject is the figure above it, and the standalone "of 500" is gone from the
 * component with the duplication.
 */
describe("the scale strip's labels", () => {
  const labels = [SCALE.fortuneLabel, SCALE.forbesLabel, SCALE.peopleLabel];

  it("reads as a whole sentence once the figure is in front of it", () => {
    for (const label of labels) {
      // A predicate, not a fragment: it may not open with the preposition that used to
      // make "181 of 500 / of the Fortune Global 500 companies…" unreadable.
      expect(label).not.toMatch(/^of\b/i);
      expect(label).toMatch(/\.$/);
      // A verb, which is what makes it a sentence rather than a caption.
      expect(label).toMatch(/\b(run|work)\b/);
    }
  });

  it("states each denominator exactly once", () => {
    // "500" appeared in `ofLabel` and again inside the index name. The index name is
    // where it belongs, so it is the only place it may appear.
    expect(SCALE.fortuneLabel.match(/500/g)).toHaveLength(1);
    expect(SCALE.forbesLabel.match(/2000/g)).toHaveLength(1);
  });

  /**
   * **No label states a share, at ANSR's request.** Both carried one — ", 36% of the
   * list." — which arrived when the two proportion bars came off, on the argument that a
   * figure with a denominator should state it. The count and the index name are what is
   * left, and the index name still carries its own denominator.
   *
   * Asserted absent so the clause cannot come back on one cell and not the other, which
   * is how this block ended up with two marks beside a gap the first time.
   */
  it("states no share, on any cell", () => {
    for (const label of labels) {
      expect(label).not.toMatch(/%/);
      expect(label).not.toMatch(/of the list/);
    }
  });

  /**
   * **The third cell covers BOTH indices, and its wording is what makes the union
   * legible.** The figure was the Fortune Global 500 subset alone, under two cells naming
   * two different indices — so "those GCCs" pointed at one of the two memberships while
   * reading as both.
   */
  it("names both indices on the people cell", () => {
    expect(SCALE.peopleLabel).toContain("Fortune Global 500");
    expect(SCALE.peopleLabel).toContain("Forbes Global 2000");
  });

  it("never shortens Fortune Global 500 to Fortune 500", () => {
    // Different lists with different membership. The figure counts professionals
    // inside Fortune GLOBAL 500 companies.
    for (const label of [SCALE.fortuneLabel, SCALE.peopleLabel, SCALE.title]) {
      expect(label).not.toMatch(/Fortune 500/);
    }
  });
});

describe("degenerate industries", () => {
  /**
   * Electrical & Electronics holds two companies, so it fills two of five slots
   * and the "and N others" clause has nothing to say. This is the case the
   * industry block's headline choice exists for.
   */
  it("reports a thin industry as thin, with no padding", () => {
    const view = buildPeerView(
      dataset,
      input({ industry: "Electrical & Electronics" }),
    );
    expect(view.peers.peers.length).toBe(2);
    expect(view.peers.shortfall).toBe(3);
    expect(view.industry.total).toBe(2);
    expect(view.industry.others).toBe(0);
    expect(view.industry.exhaustive).toBe(true);
  });

  it("never claims the industry is bigger than the table when it is not", () => {
    /**
     * The derived heading this used to check is gone — the card headings are fixed now
     * — so what is left is the property it was protecting: wherever the industry is
     * NOT exhausted, there really are more companies in it than the table shows, and
     * the exhaustive case is handled by `industryLine` rather than by a heading.
     */
    for (const industry of dataset.taxonomy.industries) {
      const view = buildPeerView(dataset, input({ industry }));
      if (view.industry.exhaustive) {
        expect(industryLine(view), industry).toMatch(
          /all of them in our data|the only one in our data/,
        );
      } else {
        expect(view.industry.total, industry).toBeGreaterThan(
          view.peers.peers.length,
        );
      }
    }
  });

  it("never says 'and 0 others'", () => {
    for (const industry of dataset.taxonomy.industries) {
      for (const revenueBand of BANDS) {
        const view = buildPeerView(dataset, input({ industry, revenueBand }));
        const line = industryLine(view);
        expect(line, `${industry} / ${revenueBand}`).not.toMatch(/\b0 (more|others)\b/);
        // The headline figure is the industry total, which is never zero while
        // the industry has members.
        if (view.peers.peers.length > 0) {
          expect(view.industry.total).toBeGreaterThan(0);
        }
      }
    }
  });

  it("collapses the largest panel when it would repeat the peer cards", () => {
    const view = buildPeerView(
      dataset,
      input({ industry: "Electrical & Electronics" }),
    );
    const peerIds = new Set(view.peers.peers.map((peer) => peer.id));
    expect(
      view.largest.entries.every((entry) => peerIds.has(entry.company.id)),
    ).toBe(true);
    expect(view.largest.entries.every((entry) => entry.alsoPeer)).toBe(true);
    expect(view.largest.repeatsPeers).toBe(true);
    expect(largestLine(view)).toMatch(/already named above/);
    // **The line that renders here may not contain a possessive on the industry
    // name**, and this is the branch every thin industry takes — so the one sentence
    // guaranteed to reach the visitors most likely to see it was the one producing
    // "Electrical & Electronics's". No apostrophe rule makes 24 admin-editable names
    // come out right, so the copy is phrased to avoid one.
    expect(largestLine(view)).not.toContain("Electronics's");
    expect(largestLine(view)).not.toMatch(/s's\b/);
  });

  it("flags an industry with nobody in the top revenue band", () => {
    // Measured in docs/data-audit.md: three industries have no member in the
    // highest band, so the panel walks down and the copy must not claim it found
    // the top.
    const walked = dataset.taxonomy.industries.filter(
      (industry) => buildPeerView(dataset, input({ industry })).largest.belowTopBand,
    );
    expect(walked.length).toBeGreaterThan(0);
    for (const industry of walked) {
      const view = buildPeerView(dataset, input({ industry }));
      if (view.largest.repeatsPeers || view.largest.entries.length === 0) continue;
      expect(largestLine(view)).toContain(view.largest.topBand!);
    }
  });

  it("ranks the largest panel by GCC size, with shares that describe a magnitude", () => {
    const view = buildPeerView(dataset, input({ industry: "BFSI" }));
    const shares = view.largest.entries.map((entry) => entry.company.sizeShare);
    // Already ordered largest-first by `largestInIndustry`, so the shares must be
    // non-increasing and the leader must be exactly 1. A bar drawn from these is
    // what makes "largest" a magnitude rather than a claim.
    expect(shares[0]).toBe(1);
    for (let i = 1; i < shares.length; i += 1) {
      expect(shares[i]!).toBeLessThanOrEqual(shares[i - 1]!);
      expect(shares[i]!).toBeGreaterThan(0);
    }
  });

  it("keeps the largest panel non-empty for every industry", () => {
    // Same invariant `npm run data:verify` asserts, checked here at the view layer
    // so a change to the mapping cannot empty the panel without a test failing.
    for (const industry of dataset.taxonomy.industries) {
      const view = buildPeerView(dataset, input({ industry }));
      expect(view.largest.entries.length, industry).toBeGreaterThan(0);
    }
  });
});

describe("copy", () => {
  it("states a shortfall in one line and never at a full set", () => {
    const full = buildPeerView(dataset, input({ industry: "Software & Internet" }));
    expect(full.peers.shortfall).toBe(0);
    expect(shortfallLine(full)).toBeNull();

    const thin = buildPeerView(
      dataset,
      input({ industry: "Electrical & Electronics" }),
    );
    const line = shortfallLine(thin)!;
    expect(line).not.toBeNull();
    // One sentence's worth of statement, reframed rather than apologised for.
    expect(line).toMatch(/thin/i);
    expect(line).toMatch(/early ground/i);
    // And it does not narrate our own restraint. The line used to close on "we
    // would rather show you two defensible comparisons than pad the list", which
    // answers a question the reader had not asked and plants it by answering.
    // Not padding the set is an invariant, checked in `matchPeers`, not a promise
    // made on the page.
    expect(line).not.toMatch(/\bpad\b/i);
    expect(line).not.toMatch(/\bwe would rather\b/i);
  });

  /**
   * The floor-shortened branch, which had no assertion of its own for a year — the
   * rule being that every branch of a derived sentence needs one.
   *
   * **It is the ONE branch that is published copy**, so this pins the two properties
   * that made it publishable rather than its wording: it names the industry, and it
   * states no quantity. `peerCountLine` renders directly above it and owns the count;
   * a number here would be the same figure stated twice, and at a set of one the old
   * sentence stated it ungrammatically as well ("only one are close enough").
   *
   * The case is SEARCHED for rather than named, because which sub-industries the
   * similarity floor shortens is a property of the data and a legitimate re-tagging
   * pass moves it. Finding none at all would mean the branch is unreachable, which is
   * itself worth failing on.
   */
  it("explains a floor-shortened set by scope, and states no count in it", () => {
    const shortened = dataset.businessTypes.flatMap((type) => {
      const view = buildPeerView(
        dataset,
        input({ industry: type.industry, businessTypeId: type.id }),
      );
      const { floorShortened, shortfall, peers } = view.peers;
      return floorShortened && shortfall > 0 && peers.length > 0 ? [view] : [];
    });
    expect(shortened.length).toBeGreaterThan(0);

    for (const view of shortened) {
      const line = shortfallLine(view)!;
      expect(line, view.industry.industry).not.toBeNull();
      // The slot resolved, so no `{industry}` survived into the rendered sentence.
      expect(line).toContain(view.industry.industry);
      expect(line).not.toContain("{");
      // Not the thin-industry claim: this industry has plenty of companies in India.
      expect(line, view.industry.industry).not.toMatch(/thin/i);
      // No digit and no counting word. The line above states the number, once.
      expect(line, view.industry.industry).not.toMatch(/\d/);
      expect(line, view.industry.industry).not.toMatch(/\bonly (one|two|three|four)\b/i);
      // And it does not narrate our own restraint, which "worth naming" did.
      expect(line, view.industry.industry).not.toMatch(/worth naming/i);
      // The ban that this sentence was the last visitor-facing holder of.
      expect(line, view.industry.industry).not.toContain("\u2014");
    }
  });

  /**
   * **`companyName()` is deleted and this test is what is left of it.** It used to pin the
   * helper's four cases — a name, a padded name, whitespace, absent — because a
   * blank-but-not-empty name must not personalise one screen and not the other. The form
   * no longer asks, the helper has no callers and no field to read, so what remains to
   * assert is that nothing composes over a name any more: the headline is one sentence for
   * every visitor, and it is a real one.
   */
  it("states a headline that names no company, whatever else it composes over", () => {
    for (const industry of ["BFSI", "Retail", "Software & Internet"]) {
      const line = framing(buildPeerView(dataset, input({ industry }))).title;
      // It composes over the INDUSTRY, which is an answer the form still asks for.
      expect(line, industry).toContain(industry);
      // What it can no longer compose over is a name, so neither a stale interpolation
      // nor an unfilled slot may appear.
      expect(line, industry).not.toContain("undefined");
      expect(line, industry).not.toContain("{");
      expect(line.length, industry).toBeGreaterThan(0);
    }
  });

  /**
   * **`framing()` has no caller in `src/` — the band's line is a constant — so what this
   * asserts is that the branch is still a real branch, not that a visitor sees it.**
   *
   * It used to check `ctaLabel` and `ctaBody` too. Those fields are gone: Screen 1 has no
   * CTA by instruction, so three CTA strings in this function were the element the
   * page-end rule forbids, sitting in the one place a reader would look to restore
   * something.
   *
   * **`gccStatus` is not decoration and this test is not what proves it.** Screen 2's
   * `functionFraming` branches on the same field for the three fields of its closing
   * CTA — that is where the field is load-bearing, and it is covered in
   * `screen2.test.ts`. It used to be five: the screen's `h2` and the paragraph under it
   * have gone with the rest of that screen's copy strip, and the paragraph never
   * branched in the first place.
   */
  it("gives every GCC status its own framing", () => {
    const titles = new Set<string>();
    for (const gccStatus of GCC_STATUSES) {
      const copy = framing(buildPeerView(dataset, input({ gccStatus })));
      expect(copy.title.length).toBeGreaterThan(0);
      titles.add(copy.title);
    }
    // If two statuses produced identical copy the branch would be decoration.
    expect(titles.size).toBe(GCC_STATUSES.length);
  });

  it("produces no copy containing an unresolved placeholder", () => {
    for (const industry of dataset.taxonomy.industries) {
      const view = buildPeerView(dataset, input({ industry }));
      const lines = [
        framing(view).title,
        industryLine(view),
        largestLine(view),
        shortfallLine(view) ?? "",
        mapHeading(view),
        peerLead(view),
        largestCountLine(view),
        peerCountLine(view),
      ];
      for (const line of lines) {
        expect(line, industry).not.toMatch(/undefined|null|NaN|\$\{/);
      }
    }
  });

  /**
   * **The derived count moved from the industry heading to the headline, and this
   * test moved with it — the property it protects has not changed.**
   *
   * The rule is that no heading may claim a count the page did not show. It was
   * written when the industry heading read "The five above were a selection, not the
   * supply" for every non-exhaustive industry, including the ones that can only
   * supply two or three peers, so a reader looking at three cards was told they had
   * seen five. The industry heading no longer states a count at all — the divided bar
   * beside it supplies every figure — and the h1 is now where the count lives, so the
   * h1 is where the check belongs. Deleting the test rather than moving it would have
   * retired the guard at the exact moment the count changed places.
   */
  it("counts the peers it claims to have shown, in every industry", () => {
    const counts = [0, 1, 2, 3, 4, 5];
    for (const industry of dataset.taxonomy.industries) {
      const view = buildPeerView(dataset, input({ industry }));
      const title = framing(view).title;
      const shown = view.peers.peers.length;

      // **"India GCCs", where the subject phrase was "relevant peers".** "Relevant" was
      // the tool grading its own output in the first sentence after a form, and "peer" is
      // our word for a matched company rather than the reader's word for what it is.
      if (shown === 0) {
        // An absence is not a count. "0 India GCCs match your profile" is a headline
        // built out of nothing, so the zero branch names the industry instead and the
        // band below says the honest version at reading size.
        expect(title, industry).toContain(industry);
        expect(title, industry).not.toMatch(/\d/);
        continue;
      }
      if (shown === 1) {
        expect(title, industry).toContain("One India GCC");
        expect(title, industry).not.toContain("GCCs");
        continue;
      }
      expect(title, `${industry} shows ${shown}`).toContain(
        `${shown} India GCCs`,
      );
      // And never a count it did not show, which was the whole bug.
      for (const other of counts) {
        if (other === shown) continue;
        expect(title, `${industry} shows ${shown}`).not.toContain(
          `${other} India`,
        );
      }
    }
  });

  /**
   * The industry heading's two branches, now that neither carries a figure.
   *
   * The exhaustive branch has to keep naming the industry: "your peers sit within a
   * much larger industry base" is a plain falsehood where the peer set already IS the
   * whole industry, and a heading contradicting the number beneath it costs more than
   * the line buys.
   */
  it("still degrades the industry line when the peer set is the whole industry", () => {
    /**
     * The derived heading that used to carry this is gone with the fixed card
     * headings, so the assertion moved to the sentence that survived it. Both branches
     * are covered: an exhausted industry says its peers are all of it, and a deeper one
     * says how many OTHERS there are.
     */
    let exhaustive = 0;
    for (const industry of dataset.taxonomy.industries) {
      const view = buildPeerView(dataset, input({ industry }));
      const line = industryLine(view);
      if (view.industry.exhaustive) {
        exhaustive += 1;
        expect(line, industry).toMatch(
          /all of them in our data|the only one in our data/,
        );
        expect(line, industry).not.toMatch(/^other /);
      } else {
        expect(line, industry).toMatch(/^other /);
      }
    }
    // The branch exists because real industries reach it. If none did, the degenerate
    // handling would be untested rather than unnecessary.
    expect(exhaustive).toBeGreaterThan(0);
  });

  /**
   * The map heading is derived, so its two branches are worth pinning: a
   * concentration claim needs both a dominant city AND enough presences for a
   * percentage to mean anything. Electrical & Electronics is the case that forced the
   * second condition — two presences, one each in two cities, which produced a
   * perfectly true "Kolkata holds 50%".
   */
  it("only claims concentration when there is enough of a footprint to claim it", () => {
    for (const industry of dataset.taxonomy.industries) {
      const view = buildPeerView(dataset, input({ industry }));
      const heading = mapHeading(view);
      const total = view.map.cities.reduce((sum, city) => sum + city.companies, 0);
      if (total < 5) {
        expect(heading, industry).not.toMatch(/%/);
        continue;
      }
      if (!heading.includes("%")) continue;
      // A percentage claim must name the leading city and be at or above the
      // threshold, both read off the same figures the ranked list draws.
      const leader = view.map.cities[0]!;
      expect(heading, industry).toContain(leader.city);
      const claimed = Number(heading.match(/(\d+)%/)![1]);
      expect(claimed, industry).toBe(Math.round((leader.companies / total) * 100));
      expect(claimed, industry).toBeGreaterThanOrEqual(40);
    }
  });
});

describe("geography", () => {
  it("has a coordinate for every city in the taxonomy", () => {
    // A city added in admin without a coordinate degrades to being listed rather
    // than plotted, which is survivable — but the seeded set should be complete.
    const missing = dataset.taxonomy.cities.filter(
      (city) => !(city in CITY_COORDINATES),
    );
    expect(missing).toEqual([]);
  });

  it("projects every city inside the field", () => {
    for (const city of Object.keys(CITY_COORDINATES)) {
      const point = projectCity(city)!;
      expect(point, city).not.toBeNull();
      expect(point.x, city).toBeGreaterThanOrEqual(0);
      expect(point.x, city).toBeLessThanOrEqual(MAP_WIDTH);
      expect(point.y, city).toBeGreaterThanOrEqual(0);
      expect(point.y, city).toBeLessThanOrEqual(MAP_HEIGHT);
    }
  });

  it("returns null for a city it has never heard of", () => {
    expect(projectCity("Atlantis")).toBeNull();
  });

  /**
   * `taxonomy.cityCoordinates`, the dataset's overlay on the seeded table.
   *
   * It exists for the one thing the code cannot know: where a city added after the
   * seed actually is. So the cases that matter are the resolution order and the miss —
   * an overlay that silently lost to the table would leave a new city unplotted with
   * nothing failing, and an overlay that fabricated a position for a city neither side
   * knows would draw a dot claiming a company is somewhere it is not.
   *
   * Warangal is used throughout as the city a taxonomy editor might add: a real place,
   * really absent from `CITY_COORDINATES`.
   */
  describe("the taxonomy's coordinate overlay", () => {
    const WARANGAL: Readonly<Record<string, LatLon>> = {
      Warangal: { lat: 17.97, lon: 79.59 },
    };

    it("plots a city only the overlay knows", () => {
      expect("Warangal" in CITY_COORDINATES).toBe(false);
      expect(projectCity("Warangal")).toBeNull();

      const point = projectCity("Warangal", WARANGAL)!;
      expect(point).not.toBeNull();
      expect(point.x).toBeGreaterThanOrEqual(0);
      expect(point.x).toBeLessThanOrEqual(MAP_WIDTH);
      expect(point.y).toBeGreaterThanOrEqual(0);
      expect(point.y).toBeLessThanOrEqual(MAP_HEIGHT);

      // The supplied coordinate is really what was projected, not a stand-in that
      // happens to land inside the frame: Warangal is north-east of Hyderabad, and
      // the point has to sit north-east of Hyderabad's.
      const hyderabad = projectCity("Hyderabad")!;
      expect(point.y).toBeLessThan(hyderabad.y);
      expect(point.x).toBeGreaterThan(hyderabad.x);
    });

    it("lets the overlay win, so a wrong coordinate is correctable without a deploy", () => {
      const seeded = projectCity("Bengaluru")!;
      const corrected = projectCity("Bengaluru", {
        // Delhi's coordinate, which is also Delhi NCR's — so the corrected point
        // can be asserted against a known projection rather than merely
        // "different".
        Bengaluru: { lat: 28.61, lon: 77.21 },
      })!;
      expect(corrected).not.toEqual(seeded);
      expect(corrected).toEqual(projectCity("Delhi NCR"));
    });

    it("leaves the seeded table as the source wherever the overlay is silent", () => {
      const seeded = projectCity("Bengaluru")!;
      // An overlay about some other city, and an empty one. Both are the live case:
      // `cityCoordinates` is `{}` in the published dataset, so every dot on the screen
      // today comes from the code's table.
      expect(projectCity("Bengaluru", WARANGAL)).toEqual(seeded);
      expect(projectCity("Bengaluru", {})).toEqual(seeded);
    });

    it("invents nothing for a city neither side has a coordinate for", () => {
      // Null, not a centre-of-India default and not a point on the frame's edge. A dot
      // is a claim about where a company is, and a guessed one is a wrong claim drawn
      // at full confidence.
      expect(projectCity("Atlantis", {})).toBeNull();
      expect(projectCity("Atlantis", WARANGAL)).toBeNull();
    });

    /**
     * And the view model passes the overlay through, which is the half of this that a
     * unit test of `projectCity` alone would miss: the function could resolve the
     * overlay perfectly while `buildPeerView` went on calling it with one argument.
     *
     * A city is added to the taxonomy AND to a company, because `cityDensity` counts
     * companies rather than reading the taxonomy — a city no company is in never
     * reaches the map at all.
     */
    describe("reaches the map through the view model", () => {
      const inWarangal = (coordinates: Record<string, LatLon>): Dataset => {
        const [first, ...rest] = dataset.companies;
        return {
          ...withTaxonomy({
            cities: [...dataset.taxonomy.cities, "Warangal"],
            cityCoordinates: coordinates,
          }),
          companies: [
            { ...first!, cities: [...first!.cities, "Warangal"] },
            ...rest,
          ],
        };
      };
      const industry = dataset.companies[0]!.industry;
      const cityOn = (data: Dataset) =>
        buildPeerView(data, input({ industry })).map.cities.find(
          (entry) => entry.city === "Warangal",
        )!;

      it("plots an added city once the taxonomy carries its coordinate", () => {
        const data = inWarangal(WARANGAL);
        expect(cityOn(data).point).not.toBeNull();
        expect(buildPeerView(data, input({ industry })).map.unplotted).not.toContain(
          "Warangal",
        );
      });

      it("lists an added city with no coordinate, and says nothing about it", () => {
        const data = inWarangal({});
        const entry = cityOn(data);
        // Counted and ranked as normal — the city is present in the block with its
        // company count. It simply carries no dot.
        expect(entry.point).toBeNull();
        expect(entry.companies).toBeGreaterThan(0);
        expect(buildPeerView(data, input({ industry })).map.unplotted).toContain(
          "Warangal",
        );
      });
    });
  });

  it("orients north up and east right", () => {
    // Guards a sign error in the projection, which would render a mirrored or
    // upside-down India while every other test still passed.
    const chandigarh = projectCity("Chandigarh")!; // far north
    const trivandrum = projectCity("Trivandrum")!; // far south
    const mumbai = projectCity("Mumbai")!; // west
    const kolkata = projectCity("Kolkata")!; // east
    expect(chandigarh.y).toBeLessThan(trivandrum.y);
    expect(mumbai.x).toBeLessThan(kolkata.x);
  });

  it("keeps the field's aspect ratio close to true at mid-latitude", () => {
    // Equirectangular corrected at the standard parallel. A stretched India is a
    // silent bug: nothing errors, it just looks wrong.
    expect(MAP_WIDTH / MAP_HEIGHT).toBeGreaterThan(0.8);
    expect(MAP_WIDTH / MAP_HEIGHT).toBeLessThan(0.95);
  });

  /**
   * The one test that has to exist for the outline to be safe to draw.
   *
   * `src/data/india-outline.ts` is generated by a Python script that cannot import
   * `geo.ts`, so the frame is written down twice. If it moves on one side only,
   * every city dot lands in the wrong place on a correctly drawn country — and
   * nothing throws, nothing logs, and the render looks like a data problem rather
   * than a projection problem. Regenerate with
   * `python3 scripts/build_india_outline.py` when this fails.
   */
  it("projects the outline in the same frame as the cities", () => {
    expect({
      ...INDIA_OUTLINE_FRAME,
      standardParallel: undefined,
      width: undefined,
      height: undefined,
    }).toEqual({
      ...MAP_FRAME,
      standardParallel: undefined,
      width: undefined,
      height: undefined,
    });
    expect(INDIA_OUTLINE_FRAME.standardParallel).toBe(MAP_STANDARD_PARALLEL);
    expect(INDIA_OUTLINE_FRAME.width).toBe(MAP_WIDTH);
    expect(INDIA_OUTLINE_FRAME.height).toBe(MAP_HEIGHT);
  });

  it("draws the whole outline inside the field", () => {
    // A frame that clipped the northeast or Ladakh was the state this replaced, and
    // it looked entirely correct. Every coordinate in the generated path has to be
    // inside the box, with no margin taken on trust.
    const numbers = INDIA_OUTLINE_PATH.match(/-?\d+(\.\d+)?/g) ?? [];
    expect(numbers.length).toBeGreaterThan(100);
    for (let i = 0; i < numbers.length; i += 2) {
      const x = Number(numbers[i]);
      const y = Number(numbers[i + 1]);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(MAP_WIDTH);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(MAP_HEIGHT);
    }
  });
});

/**
 * SNAPSHOT: the four figures at the head of the content surface.
 *
 * Two properties matter and they pull against each other. The cell count is FIXED at
 * four, because a stated four-up snapshot that silently renders three reads as a card
 * which failed to load. And a cell the data cannot fill must never be filled anyway —
 * a fabricated figure in the first thing a CIO reads is the cheapest available way to
 * lose the free layer's believability, which is invariant 2. So the resolution is a
 * null value rendered as a stated "Data unavailable", and what these assert is that
 * neither half of that slips.
 */
describe("the snapshot", () => {
  it("renders four industry-level cells for every industry, and fabricates none of them", () => {
    for (const industry of dataset.taxonomy.industries) {
      const view = buildPeerView(dataset, input({ industry }));
      const cells = signals(view);

      // Exactly four. Never a variable count.
      expect(cells.length, industry).toBe(4);

      for (const cell of cells) {
        for (const text of [cell.label]) {
          expect(text, `${industry} / ${cell.label}`).not.toMatch(
            /undefined|null|NaN|\$\{/,
          );
          expect(text.trim().length, `${industry} / ${cell.label}`).toBeGreaterThan(0);
        }
        // A missing figure is null, which the component states. It is never a dash,
        // an "n/a" or a zero standing in for something that does not exist.
        if (cell.value !== null) {
          expect(cell.value, `${industry} / ${cell.label}`).not.toMatch(
            /undefined|null|NaN|\$\{/,
          );
          expect(cell.value.trim().length, industry).toBeGreaterThan(0);
          expect(cell.value, industry).not.toMatch(/^(—|-|n\/a|N\/A|0)$/);
        }
        // The plural is "GCCs". "GCC's" is a possessive and ANSR asked for it never
        // to appear; the snapshot is where it would have, since two labels mention
        // the plural.
        expect(cell.label, industry).not.toMatch(/GCC's/);
      }

      // Labels are unique, or the snapshot is drawing the same cell twice — and the
      // component keys on the label.
      expect(new Set(cells.map((cell) => cell.label)).size, industry).toBe(
        cells.length,
      );

      // **No label names the industry any more, and the SECTION HEADING does instead.**
      // Three of the four interpolated it, which put one label at 34 characters against
      // another at 24 under four figures that align perfectly, and said the same word
      // three times inside 900px. A subject shared by every cell belongs in the section's
      // name — asserted below, so the two halves of this cannot drift apart.
      for (const cell of cells) {
        expect(cell.label, `${industry}: ${cell.label}`).not.toContain(industry);
      }
      expect(snapshotHeading(view), industry).toBe(
        `Snapshot of ${industry} GCCs in India`,
      );
      // "GCCs", never "GCC's", which ANSR asked never to appear anywhere.
      expect(snapshotHeading(view), industry).not.toMatch(/GCC's/);

      /**
       * **The first cell is a COUNT of comparable centres, where it was the industry's
       * share of the national base**, at ANSR's request. Both branches are asserted, and
       * they are asserted as a pair: the cell is scoped to the visitor's sub-industry when
       * they gave one and to their industry when they did not, so a change that dropped
       * the fallback would leave the strip with a hole for the majority of visitors.
       *
       * These views carry no sub-industry — see `input` — so this loop exercises the
       * industry branch; the sub-industry branch is asserted below.
       */
      expect(cells[0]!.label, industry).toBe(
        "companies in this industry have a GCC in India",
      );
      expect(cells[0]!.kind, industry).toBe("figure");
      // A grouped count and no unit, where the share carried "%" as its `suffix`.
      expect(cells[0]!.value, industry).toMatch(/^[\d,]+$/);
      expect(cells[0]!.suffix, industry).toBeUndefined();
      // The city cell is the one `place` on the strip. It must never take the figure
      // treatment — a city name in a numeral slot, letter-spaced for digits, was the
      // loudest element on the page and the visible seam of a filled template.
      expect(cells[3]!.kind, industry).toBe("place");
      // **All four are SENTENCE PREDICATES now, at ANSR's request**, completing the
      // figure above them rather than naming the measure. Asserted verbatim because the
      // three published ones are render-capped at 56 and the caps are measured on this
      // exact wording.
      expect(cells[1]!.label, industry).toBe("average employees in each GCC");
      // **"your industry", NOT "your sub-industry", and ANSR asked for the narrower
      // word.** The figure is `view.map.cities.length` — the industry's own city spread,
      // because the map block is filtered to `input.industry` and there is no
      // per-sub-industry city derivation to read. A label naming the narrower population
      // over the wider figure is the one thing copy here may not do.
      expect(cells[2]!.label, industry).toBe(
        "cities in India host GCCs from your industry",
      );
      expect(cells[2]!.label, industry).not.toMatch(/sub-industry/);
      // **"these GCCs", not "peer GCCs", for the same reason.** The leading city is
      // `view.map.cities[0]`, the industry's top city rather than the five-company peer
      // set's, so "peer" would name a population this cell was not measured over.
      expect(cells[3]!.label, industry).toBe(
        "the city where most of these GCCs are based",
      );
      expect(cells[3]!.label, industry).not.toMatch(/peer/);
    }
  });

  it("scopes the opening cell to the sub-industry when one was given", () => {
    /**
     * The other half of the pair asserted in the loop above.
     *
     * **The figure is the population the PEERS were drawn from** — everything above the
     * similarity floor — and not the companies carrying the visitor's exact business type.
     * It has to be that population or the cell disagrees with the five cards beneath it:
     * counting the exact type gave Nike "one other sportswear brand" directly above five
     * named apparel companies. `exactTypeCount` exists for `data:verify`, and this asserts
     * the cell is not reading it.
     */
    const view = buildPeerView(
      dataset,
      input({ industry: "Retail", businessTypeId: "ret-apparel" }),
    );
    const cells = signals(view);
    expect(cells[0]!.label).toBe(
      "companies in this sub-industry have a GCC in India",
    );
    expect(view.industry.businessType).not.toBeNull();
    expect(cells[0]!.value).toBe(formatCount(view.industry.businessType!.count));
    // Scoped below the industry, which is what makes the cell worth scoping at all.
    expect(view.industry.businessType!.count).toBeLessThan(view.industry.total);
  });

  it("states the mean headcount as an average, rounded, and never as a total", () => {
    for (const industry of dataset.taxonomy.industries) {
      const view = buildPeerView(dataset, input({ industry }));
      const average = view.industry.averageHeadcount;

      // Every industry in the taxonomy is derived FROM the companies, so it always
      // has at least one — there is no industry for which this is null.
      expect(average, industry).not.toBeNull();
      expect(average!, industry).toBeGreaterThan(0);

      // Rounded to a step coarser than the narrowest employee band, so the figure
      // claims no precision the banding can carry.
      const step = average! >= 1_000 ? 100 : 10;
      expect(average! % step, industry).toBe(0);

      /**
       * **The method line is gone from the cell**, at ANSR's request — it read "Mean of
       * reported employee bands, rounded". The figure is still a rounded mean of band
       * midpoints, so what carried the honesty on the page now carries it in the word
       * choice alone: "Typical", never "Average" or "Total", because a rounded mean of
       * bands is a central tendency rather than an arithmetic result, and a reader who
       * takes "typical centre size" for a measured figure has been misled far less than
       * one who takes it for a total.
       *
       * The rounding assertions above are what remains of the guard, and they are the
       * half a test can actually hold.
       */
      const cell = signals(view)[1]!;
      // **"average employees in each GCC", and the honest word is now "each".** Four
      // rewordings: "centre size", "GCC size in {industry}", "Typical GCC headcount",
      // and now a sentence predicate completing the figure above it, at ANSR's request.
      // "Typical" was what carried the honesty for three of those — the figure IS a
      // rounded mean of band midpoints — and ANSR asked for "average", which is the
      // arithmetic word. What stops it overclaiming is "in each GCC": the cell states a
      // per-centre average rather than a measured central tendency, and the rounding
      // assertions above are what actually hold the figure honest.
      //
      // **It must still never read as a TOTAL**, which is the one misreading that would
      // change the figure's meaning rather than its precision.
      expect(cell.label, industry).toBe("average employees in each GCC");
      expect(cell.label, industry).not.toMatch(/total/i);
      // **The note is gone entirely**, at ANSR's request — it was the last trace of a
      // method line on a figure that IS a rounded mean of band midpoints. Asserted absent
      // so nobody restores half of it.
      expect(cell).not.toHaveProperty("note");
    }
  });

  it("reports a leading location only where a city is actually mapped", () => {
    for (const industry of dataset.taxonomy.industries) {
      const view = buildPeerView(dataset, input({ industry }));
      const cells = signals(view);
      const hasCity = view.map.cities.length > 0;

      expect(cells[2]!.value === null, industry).toBe(!hasCity);
      expect(cells[3]!.value === null, industry).toBe(!hasCity);
      if (hasCity) {
        expect(cells[3]!.value, industry).toBe(view.map.cities[0]!.city);
        expect(cells[2]!.value, industry).toBe(
          new Intl.NumberFormat("en-US").format(view.map.cities.length),
        );
      }
    }
  });

  it("reports the largest peer centre, not the closest one", () => {
    /**
     * `peers.largest` is no longer on the snapshot — it is a property of our own
     * five-company set rather than of India — but it still drives the peer table's
     * axis note, which names the company the full-width bar belongs to. So the
     * property still has to hold: peers are ordered by business similarity and then
     * by size, so the closest comparison is frequently not the biggest, and an axis
     * note naming the first card would be wrong in a way nobody would catch by
     * looking.
     */
    let differed = 0;
    for (const industry of dataset.taxonomy.industries) {
      const view = buildPeerView(dataset, input({ industry }));
      const largest = view.peers.largest;
      if (!largest) continue;

      // It really is the largest by the ratio the bars are drawn from.
      for (const peer of view.peers.peers) {
        expect(peer.sizeShare, `${industry} / ${peer.name}`).toBeLessThanOrEqual(
          largest.sizeShare,
        );
      }
      // And it is the same object as the one in the set, not a second copy.
      expect(view.peers.peers, industry).toContain(largest);

      if (largest.id !== view.peers.peers[0]!.id) differed += 1;
    }
    expect(differed).toBeGreaterThan(0);
  });
});

/**
 * The largest-centres block's own copy, now that both of its footnotes have changed.
 *
 * **`largestAxisNote` is gone**, and the tests that pinned it went with it. It said
 * "Full width is JPMorgan Chase, at 59,900–60,000." directly under a ranked stack
 * whose first row is JPMorgan Chase, drawing a full-width bar, with that band beside
 * it at 24px — so it restated a name and a figure the reader had passed four rows
 * earlier. The general rule it came from still holds for a bar set that is not
 * self-labelling; a ranking sorted by the quantity its bars encode is.
 *
 * What survives is the property those tests were really protecting, which had nothing
 * to do with the axis: `sizeShare` is a ratio of band midpoints, honest as a bar's
 * length and not honest as a published figure. So no sentence on the block may state
 * a percentage. That is asserted over every line the block renders rather than over
 * the one function that happened to be at risk.
 */
/**
 * The locations card's heading, and the one property it must not lose.
 *
 * **ANSR asked for it to name the SUB-INDUSTRY and it names the industry**, because the
 * map is built from `density`, which is filtered to `input.industry` — `MapBlock.industry`
 * is `input.industry` verbatim. A heading naming the narrower population over dots drawn
 * from the wider one is the failure this asserts against, and it is asserted over every
 * industry AND with a sub-industry answered, which is the case that would regress: a
 * future pass reaching for `view.industry.businessType.name` here would pass the
 * no-sub-industry loop and break only for the visitors who answered the optional field.
 */
describe("the locations card's heading", () => {
  it("names the industry the map was actually filtered to", () => {
    for (const industry of dataset.taxonomy.industries) {
      const view = buildPeerView(dataset, input({ industry }));
      expect(mapTitle(view), industry).toBe(
        `Cities where ${industry} companies have set up`,
      );
      expect(mapTitle(view), industry).toContain(view.map.industry);
    }
  });

  it("still names the industry when a sub-industry was answered", () => {
    const view = buildPeerView(
      dataset,
      input({ industry: "Retail", businessTypeId: "ret-apparel" }),
    );
    expect(view.industry.businessType).not.toBeNull();
    expect(mapTitle(view)).toBe("Cities where Retail companies have set up");
    expect(mapTitle(view)).not.toContain(view.industry.businessType!.name);
  });
});

describe("the largest-centres block's copy", () => {
  const blockLines = (view: ReturnType<typeof buildPeerView>) => [
    largestTitle(view),
    LARGEST_LEAD,
    largestLine(view),
    largestCountLine(view),
    largestOverlapLine(view) ?? "",
  ];

  it("never publishes the size ratio as a figure", () => {
    for (const industry of dataset.taxonomy.industries) {
      const view = buildPeerView(dataset, input({ industry }));
      for (const line of blockLines(view)) {
        expect(line, industry).not.toMatch(/%/);
      }
    }
  });

  it("no longer restates the leading row as an axis", () => {
    // The exact shape that was removed. The bar it explained is unchanged; what
    // changed is that the sentence under it was the fourth appearance of the same
    // two values.
    for (const industry of dataset.taxonomy.industries) {
      const view = buildPeerView(dataset, input({ industry }));
      for (const line of blockLines(view)) {
        expect(line, industry).not.toMatch(/full width/i);
      }
      const first = view.largest.entries[0]?.company;
      if (first && view.largest.entries.length >= 2) {
        // The company is still drawn as row one. It is the SENTENCES that must not
        // name it, which is the assertion the deletion has to hold onto.
        expect(largestCountLine(view), industry).not.toContain(first.name);
        expect(largestCountLine(view), industry).not.toContain(first.headcount);
      }
    }
  });

  /**
   * **"we hold" was internal voice**, and it was the block's own count line saying it:
   * "The 5 largest BFSI centres in India we hold." It is how the people maintaining
   * the dataset talk about it, not how a CIO reads a page — the sentence became about
   * our filing rather than about India. `peerCountLine` and `shortfallLine` already
   * scoped their counts with "in our data", so all three now agree.
   */
  it("scopes the count without saying 'we hold'", () => {
    for (const industry of dataset.taxonomy.industries) {
      const view = buildPeerView(dataset, input({ industry }));
      const line = largestCountLine(view);
      expect(line, industry).not.toMatch(/\bwe hold\b/i);
      expect(line, industry).toMatch(/our India data/);
    }
  });

  /**
   * **The overlap line is what replaced a chip that admitted a repeat.** At the top
   * revenue band the largest centres in an industry are largely the same companies as
   * the closest comparisons — three of five in BFSI — and the previous shape drew each
   * of those as a second full card labelled "Also in your peer set". Stated as a
   * proportion of the ranking the same overlap is new information: the visitor's
   * comparison set is not a sample from the middle of the industry, it is most of its
   * top.
   *
   * Both silent branches are asserted, because a derived sentence needs every branch
   * pinned — the lesson `peerLead` cost a year to learn.
   */
  describe("largestOverlapLine", () => {
    it("states the overlap exactly, on both sides", () => {
      const view = buildPeerView(dataset, input({ industry: "BFSI" }));
      const overlap = view.largest.entries.filter((entry) => entry.alsoPeer).length;
      expect(overlap).toBeGreaterThan(0);
      expect(overlap).toBeLessThan(view.largest.entries.length);
      expect(largestOverlapLine(view)).toBe(
        `${overlap} of the ${view.largest.entries.length} largest BFSI GCCs in India are in your peer set above.`,
      );
    });

    it("says nothing when nothing overlaps, and agrees with the rows in every industry", () => {
      let silent = 0;
      for (const industry of dataset.taxonomy.industries) {
        const view = buildPeerView(dataset, input({ industry }));
        const entries = view.largest.entries;
        const overlap = entries.filter((entry) => entry.alsoPeer).length;
        const line = largestOverlapLine(view);

        if (overlap === 0 || overlap === entries.length) {
          expect(line, industry).toBeNull();
          silent += 1;
          continue;
        }
        // The figure in the sentence is the number of marked rows, never a count the
        // reader cannot check against what is on screen.
        expect(line, industry).toContain(`${overlap} of the ${entries.length}`);
        expect(line, industry).toContain(industry);
      }
      // The silent branch is reachable, so the assertion above is not vacuous for it.
      expect(silent).toBeGreaterThan(0);
    });

    /**
     * The all-overlap case never reaches this sentence: `repeatsPeers` collapses the
     * whole block to one line rather than redrawing the peer set under a second
     * heading. Asserted together, because the two are the same decision.
     */
    it("is unreachable where the block collapses onto the peer set", () => {
      const view = buildPeerView(
        dataset,
        input({ industry: "Electrical & Electronics" }),
      );
      expect(view.largest.repeatsPeers).toBe(true);
      expect(largestOverlapLine(view)).toBeNull();
    });
  });
});

/**
 * Two words the copy pass removed, and the reason each is worth a test rather than a
 * note in a document.
 *
 * **"already"** appeared in a heading, two leads and three body sentences, all doing
 * the same job: leaning on the reader to feel late. The tense already carries it — a
 * company that runs a centre in India runs one now — so the word added pressure rather
 * than information, and a page that applies pressure six times is a page this audience
 * discounts. ONE use survives deliberately and is allowed by name below, inside a
 * clause about what the tool has ALREADY SHOWN the reader rather than about the
 * market: the largest panel collapsing onto the peer cards. The second exemption this
 * comment used to claim — a chip on a company appearing in both blocks — never
 * contained the word, and the chip itself is gone.
 *
 * **"actually"** contributed nothing to a sentence nobody had contradicted.
 */
describe("the words the copy pass removed", () => {
  // `framing()` contributes one line now rather than five — the lead and the three CTA
  // fields are gone, since Screen 1 renders no lead from it and has no CTA at all. The
  // remaining lines include several nothing renders either; they are here because the ban
  // is on the VOCABULARY, so a sentence kept for restoration has to obey it too, or it
  // comes back carrying the word.
  const lines = (view: ReturnType<typeof buildPeerView>) => [
    framing(view).title,
    industryLine(view),
    mapHeading(view),
    peerLead(view),
    shortfallLine(view) ?? "",
    largestCountLine(view),
    largestOverlapLine(view) ?? "",
    peerCountLine(view),
    ...signals(view).map((cell) => cell.label),
  ];

  it("says neither 'already' nor 'actually' anywhere a visitor reads", () => {
    for (const industry of dataset.taxonomy.industries) {
      const view = buildPeerView(dataset, input({ industry }));
      for (const line of lines(view)) {
        expect(line, industry).not.toMatch(/\balready\b/i);
        expect(line, industry).not.toMatch(/\bactually\b/i);
      }
    }
  });

  it("keeps the one 'already' that is about the page rather than the market", () => {
    // The collapsed largest panel. "The ones already named above" refers to cards the
    // reader has just scrolled past, which is the word doing real work.
    const view = buildPeerView(dataset, input({ industry: "Electrical & Electronics" }));
    expect(view.largest.repeatsPeers).toBe(true);
    expect(largestLine(view)).toMatch(/already named above/);
  });
});

describe("roundProfessionals", () => {
  it("rounds to the nearest ten thousand", () => {
    expect(roundProfessionals(1_059_175)).toBe(1_060_000);
    expect(roundProfessionals(2_610_500)).toBe(2_610_000);
    expect(roundProfessionals(0)).toBe(0);
    expect(roundProfessionals(4_999)).toBe(0);
  });
});

/**
 * The two formatters both public screens share. Untested until the locale in them
 * changed, which is the wrong order — a change with no test is how "invisible on
 * Screen 1" becomes an assumption rather than a fact.
 */
describe("the shared formatters", () => {
  it("groups thousands for the reader, not for the subject", () => {
    // en-US, because the tool is about India and is read by CIOs elsewhere. With
    // the current data no figure on Screen 1 is large enough for the two locales
    // to differ — every count is under six digits and every professionals total
    // takes the million branch below — so this pins the behaviour for the day one
    // of those stops being true.
    expect(formatCount(1_834)).toBe("1,834");
    expect(formatCount(181)).toBe("181");
    expect(formatCount(600_000)).toBe("600,000");
  });

  it("switches professionals to millions, and never re-rounds", () => {
    // Already rounded to the nearest ten thousand by `roundProfessionals`, because
    // it is a sum of headcount band midpoints. This only chooses the unit, so the
    // figure on the screen and the figure in the model agree.
    expect(formatProfessionals(1_060_000)).toBe("1.06 million");
    expect(formatProfessionals(2_610_000)).toBe("2.61 million");
    expect(formatProfessionals(720_000)).toBe("720,000");
  });

  /**
   * `formatShare` exists so the figure beside a `FractionBar` and the bar itself
   * cannot disagree — the share is rounded once, in one place. Whole percentages
   * deliberately: these are counts over fixed list sizes, so "36.2%" invites a
   * precision question about a number whose value is its order of magnitude.
   */
  it("renders a share as a whole percentage", () => {
    expect(formatShare(181 / 500)).toBe("36%");
    expect(formatShare(483 / 2000)).toBe("24%");
    expect(formatShare(0)).toBe("0%");
    expect(formatShare(1)).toBe("100%");
  });

  /**
   * `formatRevenueBand` is a RULE over the stored band strings, where a company name
   * gets a lookup table — so unlike the table, it can be wrong about a row nobody
   * thought about. That is what this pins: every one of the seven bands, by its output,
   * read out of the live taxonomy rather than typed in.
   *
   * The band is not renamed in the DATA. `taxonomy.revenueBands` order is the
   * peer-matching contract and the strings are the keys 1834 companies carry, so this is
   * presentation applied at the three places a visitor sees a band — the dropdown and
   * each result screen's answer pill. Admin still shows the stored strings, correctly,
   * because admin edits the datum.
   */
  it("spells a revenue band out for a visitor without touching the stored value", () => {
    // The two ends of the set were asymmetrical in the data — one spelled out, one an
    // operator — and this is where that stops being visible.
    expect(formatRevenueBand("< $100 Mn")).toBe("Under 100 Mn");
    expect(formatRevenueBand("Above $20 Bn")).toBe("Above 20 Bn");
    expect(formatRevenueBand("$1 Bn – $5 Bn")).toBe("1 Bn – 5 Bn");

    // No `$` survives anywhere, no `<` or `>` survives at the start, and nothing else
    // about a band changes — including the en dash, which is the separator the data uses.
    for (const band of BANDS) {
      const shown = formatRevenueBand(band);
      expect(shown, band).not.toContain("$");
      expect(shown, band).not.toMatch(/^[<>]/);
      expect(shown, band).toBe(shown.trim());
      expect(band.includes("–") ? shown.includes("–") : true, band).toBe(true);
    }
  });
});

/**
 * The peer section's lead line — now the ONLY place the matching method is stated.
 *
 * Caught by walking the live deployment, not by any check in here: the lead was a
 * hardcoded "closest revenue band, and companies from your own market first" that
 * contradicted the footnote three lines below it, and was observably false on the
 * flagship example. The footnote is gone — removed at ANSR's request, along with the
 * shared-tag sentence and the headquarters clause — so these tests no longer pin two
 * sentences to each other. They pin this one to the peer set it describes, which is
 * the assertion that actually mattered.
 */
describe("the peer lead describes the peer set it sits above", () => {
  const apparel = input({
    industry: "Retail",
    revenueBand: TOP_BAND,
    businessTypeId: "ret-apparel",
    hqCountry: "USA",
  });

  it("does not claim revenue band leads when a line of business was chosen", () => {
    const view = buildPeerView(dataset, apparel);
    expect(view.peers.businessMatched).toBe(true);

    const lead = peerLead(view);

    // The old sentence, and the two claims inside it that were false.
    expect(lead).not.toBe(
      "Same industry, closest revenue band, and companies from your own market first.",
    );
    expect(lead).not.toMatch(/closest revenue band/);
    expect(lead).not.toMatch(/your own market first/);

    // The lead must lead on the same thing the basis does, and the assertion is on
    // the ORDER rather than on a phrase — the wording is a copywriter's to change,
    // but "business before size" is the ranking and has to stay true of the
    // sentence describing it.
    expect(lead).toMatch(/business/i);
    /**
     * **The second key is asserted as "revenue band", not as "size".** The sentence used
     * to say "then by size", and the ambiguity was a real defect rather than a wording
     * preference: the score's second term is band proximity, while "size" reads just as
     * easily as the centre headcount each card carries as its own figure — which is not a
     * key at all. A reader comparing two adjacent figures would have found the claim
     * broken. The assertion is still on the ORDER, which is what has to stay true.
     */
    expect(lead).toMatch(/revenue band/i);
    expect(lead.search(/business/i)).toBeLessThan(lead.search(/revenue band/i));
    // And it names the sub-industry it matched on, which is the one answer on the form
    // a visitor could reasonably wonder whether the tool used.
    expect(lead).toContain(view.industry.businessType!.name.toLowerCase());
  });

  /**
   * The no-sub-industry branch, which is the path most visitors take and the one that
   * went on returning the false sentence for a year after the other branch was fixed.
   *
   * It read "Same industry, closest revenue band, and companies from your own market
   * first." — under a comment asserting that with no sub-industry the old wording was
   * accurate again. Half of it was: business similarity really is zero for everyone on
   * this path, so the score really does reduce to band proximity. The other half never
   * became true, because headquarters is a TIEBREAK beneath the score and cannot put a
   * company first — and the comparison card stopped showing headquarters at all, so a
   * visitor could not check the claim even where it happened to hold.
   *
   * **This is asserted against the ordering rather than against a phrase.** The
   * wording is a copywriter's to change; what may not change without the sentence
   * changing with it is which keys the engine ranks by on this path and in what order.
   * The previous version of this test matched `/closest revenue band/` and passed
   * happily on a sentence that also promised own-market-first.
   */
  describe("with no sub-industry given", () => {
    const noSubIndustry = (industry: string, hqCountry = "USA") =>
      buildPeerView(dataset, input({ industry, hqCountry }));

    it("claims band proximity first and centre size second, and nothing else", () => {
      const view = noSubIndustry("Retail");
      expect(view.peers.businessMatched).toBe(false);

      const lead = peerLead(view);

      // The removed sentence, and the claim inside it that could never come true.
      expect(lead).not.toBe(
        "Same industry, closest revenue band, and companies from your own market first.",
      );
      expect(lead).not.toMatch(/market/i);
      expect(lead).not.toMatch(/headquarter/i);

      // The one key it does claim.
      expect(lead).toMatch(/revenue band/i);

      /**
       * **And no second key, which is the harder half of this assertion.**
       *
       * "…then the largest India centres" was the natural longer sentence and the
       * reasoning behind it was nearly right: within a band tie the comparator does
       * fall through to centre size, and each card carries its employee band as a
       * figure, so the claim would have been checkable. It is checkable and false —
       * see the counter-example test below. Size is the second thing a reader would
       * assume, so it is the second thing this must not say.
       */
      expect(lead).not.toMatch(/largest/i);
      expect(lead).not.toMatch(/\bsize\b/i);
    });

    /**
     * The reading of the peer set the sentence licenses, over every industry.
     *
     * "Closest to your revenue band first" means band proximity is the leading key: no
     * peer may sit above one whose band is closer to the visitor's.
     *
     * **Closeness is the engine's three-step, not an index distance**, and getting that
     * wrong is what the first draft of this test did. `bandProximity` scores 1.0 for
     * the same band, 0.66 for an adjacent one and 0 for everything else — so a company
     * three bands away and one five bands away are TIED, and the tiebreaks decide
     * between them. Modelled as a distance, this test failed on Education for an
     * ordering the engine never claimed. That is also why the sentence says "closest
     * first" rather than "ranked by how close": the second would promise a gradient.
     */
    const bands = dataset.taxonomy.revenueBands;
    const bandTier = (band: string) => {
      const gap = Math.abs(bands.indexOf(band) - bands.indexOf(TOP_BAND));
      return gap === 0 ? 0 : gap === 1 ? 1 : 2;
    };
    const midpoint = (name: string) => {
      const company = dataset.companies.find((c) => c.name === name)!;
      return (company.fte.min + company.fte.max) / 2;
    };
    const rowsFor = (industry: string) => {
      const view = noSubIndustry(industry);
      expect(view.peers.businessMatched, industry).toBe(false);
      return view.peers.peers.map((peer) => {
        const company = dataset.companies.find((c) => c.name === peer.name)!;
        return {
          name: peer.name,
          band: bandTier(company.revenueBand),
          size: midpoint(peer.name),
        };
      });
    };

    it("ranks by band proximity in every industry, as it says", () => {
      for (const industry of dataset.taxonomy.industries) {
        const rows = rowsFor(industry);
        for (let i = 1; i < rows.length; i += 1) {
          expect(
            rows[i - 1]!.band,
            `${industry}: ${rows[i - 1]!.name} above ${rows[i]!.name}`,
          ).toBeLessThanOrEqual(rows[i]!.band);
        }
      }
    });

    /**
     * **Why the sentence stops at one key, held as a named counter-example.**
     *
     * `matchPeers` puts the HQ-country tiebreak BETWEEN the score and the size, so
     * within a band tie a company from the visitor's own market outranks a larger one.
     * Where that fires, "then the largest India centres" is contradicted by two
     * adjacent cards whose employee bands the reader can compare directly.
     *
     * This asserts the violation exists rather than asserting it does not. A test that
     * merely checked size ordering would go green the day the tiebreak stopped firing
     * — and then the longer sentence could be restored on a dataset where it happens
     * to hold, which is precisely how the original claim survived a year of green
     * suites. If this test starts failing, size ordering has become universal and the
     * sentence MAY gain its second clause; deleting the test is not the fix.
     */
    it("does not rank by centre size, which is why the lead never says it does", () => {
      const offenders: string[] = [];
      for (const industry of dataset.taxonomy.industries) {
        const rows = rowsFor(industry);
        for (let i = 1; i < rows.length; i += 1) {
          const prev = rows[i - 1]!;
          const here = rows[i]!;
          if (prev.band === here.band && here.size > prev.size) {
            offenders.push(`${industry}: ${here.name} is larger than ${prev.name}`);
          }
        }
      }
      // Agribusiness & Food Processing is the one that caught this: a 150-employee US
      // company ranked above a 650-employee one, on the HQ tiebreak.
      expect(offenders.length).toBeGreaterThan(0);
      expect(offenders.join(" | ")).toMatch(/Agribusiness/);
    });
  });

  it("never promises own-market-first while showing foreign peers above domestic ones", () => {
    // The concrete failure: a US apparel visitor is shown H&M (Sweden) and Adidas
    // (Germany) above GAP (USA). Any lead promising own-market-first is
    // contradicted by the cards beside it.
    //
    // HQ country is read from the DATASET, not from the card. `toCard` drops it, so
    // reading `card.hqCountry` yields undefined and the comparison below silently
    // becomes vacuous — which is exactly how the first version of this test passed
    // while asserting nothing.
    const view = buildPeerView(dataset, apparel);
    const countryOf = (name: string) =>
      dataset.companies.find((c) => c.name === name)?.hqCountry;
    const countries = view.peers.peers.map((p) => countryOf(p.name));

    expect(countries.every((c) => typeof c === "string")).toBe(true);

    const firstForeign = countries.findIndex((c) => c !== "USA");
    const lastDomestic = countries.lastIndexOf("USA");
    // Guard the guard: if this ever stops holding, the test must fail loudly rather
    // than quietly stop testing.
    expect(firstForeign).toBeGreaterThanOrEqual(0);
    expect(lastDomestic).toBeGreaterThan(firstForeign);

    expect(peerLead(view)).not.toMatch(/own market first/);
  });
});
