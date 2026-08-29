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
import {
  buildPeerView,
  companyName,
  COMMON_FUNCTIONS,
  GCC_STATUSES,
  peerViewInputSchema,
  roundProfessionals,
  type PeerViewInput,
} from "@/data/screen1";
import {
  formatCount,
  formatProfessionals,
  formatShare,
} from "@/components/public/primitives";
import { parseDataset, type Dataset } from "@/data/schema";
import {
  framing,
  industryLine,
  FUNCTIONS_LEAD,
  FUNCTIONS_TITLE,
  largestAxisNote,
  largestCountLine,
  largestLine,
  mapHeading,
  peerCountLine,
  peerLead,
  shortfallLine,
  signals,
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

  it("carries the common functions, and says nothing per-company about them", () => {
    const view = buildPeerView(dataset, input());
    expect(view.functions).toEqual(COMMON_FUNCTIONS);
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
   * **The company name is no longer in the headline, and this test moved with it.**
   * It used to assert the h1 contained "Acme". The h1 now states the finding — how
   * many relevant peers were found — and the name is persistent context beside the
   * three answers that produced it, which is where a visitor can still see it for the
   * whole page rather than for one sentence.
   *
   * So what has to hold is the derivation, not the interpolation: a name that is
   * whitespace, or absent, must resolve to null rather than reaching a context row as
   * an empty fact, and the headline must be a real sentence in both cases.
   */
  it("resolves the company name the same way however it was left, and keeps it out of the headline", () => {
    expect(companyName(input({ companyName: "Acme" }))).toBe("Acme");
    expect(companyName(input({ companyName: "  Acme  " }))).toBe("Acme");
    expect(companyName(input({ companyName: "   " }))).toBeNull();
    expect(companyName(input({ companyName: "" }))).toBeNull();
    expect(companyName(input())).toBeNull();

    const named = framing(buildPeerView(dataset, input({ companyName: "Acme" })));
    const anon = framing(buildPeerView(dataset, input()));
    expect(named.title).not.toContain("Acme");
    expect(named.title).toBe(anon.title);
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

  it("produces no copy containing an unresolved placeholder", () => {
    for (const industry of dataset.taxonomy.industries) {
      const view = buildPeerView(dataset, input({ industry }));
      const lines = [
        framing(view).title,
        framing(view).lead,
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

      if (shown === 0) {
        // An absence is not a count. "0 relevant peers operate a GCC in India" is a
        // headline built out of nothing, so the zero branch names the industry
        // instead and the band below says the honest version at reading size.
        expect(title, industry).toContain(industry);
        expect(title, industry).not.toMatch(/\d/);
        continue;
      }
      if (shown === 1) {
        expect(title, industry).toContain("One relevant peer");
        expect(title, industry).not.toContain("peers");
        continue;
      }
      expect(title, `${industry} shows ${shown}`).toContain(
        `${shown} relevant peers`,
      );
      // And never a count it did not show, which was the whole bug.
      for (const other of counts) {
        if (other === shown) continue;
        expect(title, `${industry} shows ${shown}`).not.toContain(
          `${other} relevant`,
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
        for (const text of [cell.label, cell.note]) {
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
        expect(`${cell.label} ${cell.note}`, industry).not.toMatch(/GCC's/);
      }

      // Labels are unique, or the snapshot is drawing the same cell twice — and the
      // component keys on the label.
      expect(new Set(cells.map((cell) => cell.label)).size, industry).toBe(
        cells.length,
      );

      // Every figure is a property of the INDUSTRY, not of the five-company set our
      // own matching chose, so the two count labels name the industry.
      expect(cells[0]!.label, industry).toBe(`${industry} companies in India`);
      expect(cells[1]!.label, industry).toBe(`Typical centre size in ${industry}`);
      expect(cells[2]!.label, industry).toBe("Indian cities in play");
      expect(cells[3]!.label, industry).toBe("Where the industry concentrates");
    }
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
      expect(cell.label, industry).toMatch(/^Typical centre size/);
      expect(cell.label, industry).not.toMatch(/^(Average|Total)/);
      expect(cell.note, industry).not.toMatch(/mean of/i);
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
 * The axis notes, which every bar on this screen was missing.
 *
 * A bar whose maximum is unstated looks precise and communicates nothing: a reader
 * cannot tell whether full width is the largest company in the set, the largest in
 * India, or the top of a revenue band. Both notes name the company the track belongs
 * to, because the ratio behind the length is derived from band midpoints and may not
 * be published as a figure.
 */
describe("axis notes", () => {
  it("name the company full width belongs to, and say nothing when there is nothing to compare", () => {
    for (const industry of dataset.taxonomy.industries) {
      const view = buildPeerView(dataset, input({ industry }));

      const largestNote = largestAxisNote(view);
      if (view.largest.entries.length < 2) {
        expect(largestNote, industry).toBeNull();
      } else {
        const first = view.largest.entries[0]!.company;
        expect(largestNote, industry).toContain(first.name);
        expect(largestNote, industry).toContain(first.headcount);
      }
    }
  });

  it("never publishes the ratio itself as a figure", () => {
    // `sizeShare` is a ratio of band midpoints. It is honest as a bar's length and
    // would not be honest as a number, so no note may state it as a percentage.
    for (const industry of dataset.taxonomy.industries) {
      const view = buildPeerView(dataset, input({ industry }));
      const note = largestAxisNote(view);
      if (note) expect(note, industry).not.toMatch(/%/);
    }
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
 * discounts. Two uses survive deliberately and are allowed by name below, both inside
 * a clause about what the tool has ALREADY SHOWN the reader rather than about the
 * market: the largest panel collapsing onto the peer cards, and a chip marking a
 * company that appeared in both blocks.
 *
 * **"actually"** contributed nothing to a sentence nobody had contradicted.
 */
describe("the words the copy pass removed", () => {
  const lines = (view: ReturnType<typeof buildPeerView>) => [
    framing(view).title,
    framing(view).lead,
    framing(view).ctaHeading,
    framing(view).ctaBody,
    framing(view).ctaLabel,
    industryLine(view),
    mapHeading(view),
    peerLead(view),
    shortfallLine(view) ?? "",
    largestAxisNote(view) ?? "",
    ...signals(view).flatMap((cell) => [cell.label, cell.note]),
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
    companyName: "Nike",
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
    expect(lead.search(/business/i)).toBeLessThan(lead.search(/size/i));
    // And it names the sub-industry it matched on, which is the one answer on the form
    // a visitor could reasonably wonder whether the tool used.
    expect(lead).toContain(view.industry.businessType!.name.toLowerCase());
  });

  it("still says band-led when no line of business was given, because then it is", () => {
    const view = buildPeerView(
      dataset,
      input({ industry: "Retail", revenueBand: TOP_BAND, hqCountry: "USA" }),
    );
    expect(view.peers.businessMatched).toBe(false);
    expect(peerLead(view)).toMatch(/closest revenue band/);
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
