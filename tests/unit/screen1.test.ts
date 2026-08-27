import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { CITY_COORDINATES, MAP_HEIGHT, MAP_WIDTH, projectCity } from "@/data/geo";
import {
  buildPeerView,
  COMMON_FUNCTIONS,
  GCC_STATUSES,
  peerViewInputSchema,
  roundProfessionals,
  type PeerViewInput,
} from "@/data/screen1";
import { formatCount, formatProfessionals } from "@/components/public/primitives";
import { parseDataset, type Dataset } from "@/data/schema";
import {
  framing,
  industryHeading,
  industryLine,
  largestLine,
  matchBasis,
  shortfallLine,
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

  it("treats company name as optional and trims it", () => {
    expect(schema.safeParse(input({ companyName: undefined }).valueOf()).success).toBe(
      true,
    );
    const parsed = schema.parse(input({ companyName: "  Acme  " }));
    expect(parsed.companyName).toBe("Acme");
  });

  it("refuses an absurdly long company name rather than rendering it", () => {
    expect(
      schema.safeParse(input({ companyName: "x".repeat(500) })).success,
    ).toBe(false);
  });
});

describe("buildPeerView", () => {
  it("returns cards, not companies", () => {
    const view = buildPeerView(dataset, input());
    const [peer] = view.peers.peers;
    expect(peer).toBeDefined();
    // Narrower than `Company` on purpose: revenue band is a matching input, not a
    // fact worth publishing beside a peer's name.
    expect(Object.keys(peer!).sort()).toEqual([
      "cities",
      "establishedYear",
      "fortuneGlobal500",
      "headcount",
      "id",
      "name",
    ]);
  });

  it("never includes the visitor's own company in its own peer set", () => {
    const own = dataset.companies.find((c) => c.industry === "BFSI")!;
    const view = buildPeerView(
      dataset,
      input({ companyName: own.name, revenueBand: own.revenueBand }),
    );
    expect(view.peers.peers.map((p) => p.id)).not.toContain(own.id);
    expect(view.largest.entries.map((e) => e.company.id)).not.toContain(own.id);
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
    expect(view.scale.fortuneGlobal500Professionals % 10_000).toBe(0);
    // Rounding must not become invention: it stays within half a step of truth.
    expect(view.scale.fortuneGlobal500Professionals).toBeGreaterThan(0);
    expect(view.scale.fortuneGlobal500Professionals).toBeLessThan(
      view.scale.professionals,
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

  it("carries the common-function basis alongside the list", () => {
    const view = buildPeerView(dataset, input());
    // The list is a general pattern, not per-company data. Shipping it without
    // the sentence that says so is the failure this guards.
    expect(view.functions).toEqual(COMMON_FUNCTIONS);
    expect(view.functionsBasis).toMatch(/not a per-company breakdown/i);
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

  it("never claims the industry is bigger than five names when it is not", () => {
    // The heading sits directly above the count. One contradicting the other costs
    // more credibility than the line was ever going to buy.
    for (const industry of dataset.taxonomy.industries) {
      const view = buildPeerView(dataset, input({ industry }));
      const heading = industryHeading(view);
      if (view.industry.exhaustive) {
        expect(heading, industry).not.toMatch(/bigger than/);
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
    expect(largestLine(view)).toMatch(/the same ones shown above/);
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
    const shares = view.largest.entries.map((entry) => entry.sizeShare);
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
    expect(line).toMatch(/pad/i);
  });

  it("personalises on the company name and degrades without it", () => {
    const named = framing(buildPeerView(dataset, input({ companyName: "Acme" })));
    const anon = framing(buildPeerView(dataset, input()));
    expect(named.title).toContain("Acme");
    expect(anon.title).not.toContain("undefined");
    expect(anon.title.length).toBeGreaterThan(0);
  });

  it("gives every GCC status its own framing and call to action", () => {
    const titles = new Set<string>();
    const labels = new Set<string>();
    for (const gccStatus of GCC_STATUSES) {
      const copy = framing(buildPeerView(dataset, input({ gccStatus })));
      titles.add(copy.title);
      labels.add(copy.ctaLabel);
      expect(copy.ctaBody.length).toBeGreaterThan(0);
    }
    // The input's only consumer. If two statuses produced identical copy the
    // field would be decoration.
    expect(titles.size).toBe(GCC_STATUSES.length);
    expect(labels.size).toBe(GCC_STATUSES.length);
  });

  it("names the revenue band only when the band actually constrained the match", () => {
    expect(matchBasis("same-band", "Above $20 Bn")).toContain("Above $20 Bn");
    expect(matchBasis("adjacent-band", "Above $20 Bn")).toContain("either side");
    expect(matchBasis("industry", "Above $20 Bn")).not.toContain("Above $20 Bn");
  });

  it("produces no copy containing an unresolved placeholder", () => {
    for (const industry of dataset.taxonomy.industries) {
      const view = buildPeerView(dataset, input({ industry }));
      const lines = [
        framing(view).title,
        framing(view).lead,
        industryLine(view),
        largestLine(view),
        shortfallLine(view) ?? "",
        matchBasis(view.peers.basis, view.input.revenueBand),
      ];
      for (const line of lines) {
        expect(line, industry).not.toMatch(/undefined|null|NaN|\$\{/);
      }
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
});
