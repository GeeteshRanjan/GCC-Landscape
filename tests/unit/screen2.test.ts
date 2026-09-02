import { describe, expect, it } from "vitest";

import { seedMetricCatalogue } from "@/data/metric-catalogue";
import { publicMetricsFor } from "@/data/metrics";
import { DEFAULT_SITE_CONTENT, type Dataset, type Metric } from "@/data/schema";
import { GCC_STATUSES, type GccStatus, type PeerViewInput } from "@/data/screen1";
import {
  COST_PROVENANCE,
  FLOOR_NOTE,
  functionFraming,
  heldHeading,
  heldShapeNote,
  SCREEN_SOURCE,
  SHARED_SUPPLY_PROVENANCE,
} from "@/components/screen2/copy";
import {
  anchorColumnFor,
  breakdownDisplay,
  breakdownScale,
  buildFunctionAreaView,
  buildFunctionView,
  figureParts,
  formatCompact,
  formatFigure,
  gridDisplay,
  heldWidth,
  layoutArea,
  metricWidth,
  packWidths,
  rowScale,
  SUBJECT_COLUMN,
  type ShownMetric,
} from "@/data/screen2";

/**
 * Screen 2's view model.
 *
 * The tests fall into three groups, and the first one is the invariant: nothing a
 * gated metric holds may appear in what this file produces. That is checked
 * structurally — on the keys of the object, not on whether a particular number
 * happens to be absent from a string — because a substring assertion passes by
 * luck as often as by correctness ("37" is inside "367").
 */

const CATALOGUE = seedMetricCatalogue();

function datasetWith(metrics: Metric[]): Dataset {
  return {
    version: 1,
    generatedAt: "2026-08-27T00:00:00.000Z",
    source: "test",
    taxonomy: {
      industries: ["BFSI"],
      revenueBands: ["Above $20 Bn"],
      cities: ["Bengaluru"],
      hqCountries: ["USA"],
      pinnedIndustries: [],
      cityCoordinates: {},
    },
    companies: [
      {
        id: "acme",
        name: "Acme",
        hqCountry: "USA",
        industry: "BFSI",
        revenueBand: "Above $20 Bn",
        establishedYear: 2015,
        cities: ["Bengaluru"],
        fte: { min: 100, max: 500 },
        fortuneGlobal500: false,
        forbesGlobal2000: false,
        businessTypes: [],
      },
    ],
    businessTypes: [],
    metrics,
    siteContent: DEFAULT_SITE_CONTENT,
  };
}

function find(view: ReturnType<typeof buildFunctionView>, id: string): ShownMetric {
  for (const area of view.areas) {
    const hit = area.shown.find((shown) => shown.metric.id === id);
    if (hit) return hit;
  }
  throw new Error(`${id} is not shown`);
}

/* ==========================================================================
   The gate
   ========================================================================== */

describe("the gate", () => {
  const view = buildFunctionView(datasetWith(CATALOGUE));

  it("routes every gated metric to the held group and none to the shown one", () => {
    const gatedIds = CATALOGUE.filter((metric) => metric.gated).map((metric) => metric.id);
    expect(gatedIds.length).toBeGreaterThan(0);

    const heldIds = view.areas.flatMap((area) => area.held.map((held) => held.metric.id));
    const shownIds = view.areas.flatMap((area) =>
      area.shown.map((shown) => shown.metric.id),
    );

    expect(heldIds.sort()).toEqual([...gatedIds].sort());
    for (const id of gatedIds) expect(shownIds).not.toContain(id);
  });

  it("gives a held metric no field a number could travel in", () => {
    for (const area of view.areas) {
      for (const { metric } of area.held) {
        // Exactly the GatedMetric surface. A new key here is a new way to leak.
        expect(Object.keys(metric).sort()).toEqual(
          ["format", "functionArea", "gated", "id", "question", "shape", "title"].sort(),
        );
        expect(metric).not.toHaveProperty("value");
        expect(metric).not.toHaveProperty("structure");
        expect(metric).not.toHaveProperty("unit");
        expect(metric).not.toHaveProperty("indexBaseline");
        expect(metric).not.toHaveProperty("asOf");
      }
    }
  });

  it("keeps the row and column names of a gated grid off the wire", () => {
    const gated = CATALOGUE.find((metric) => metric.id === "hr-fully-loaded-cost");
    expect(gated?.structure.kind).toBe("matrix");
    const names =
      gated && gated.structure.kind === "matrix"
        ? [...gated.structure.rows, ...gated.structure.columns]
        : [];

    /**
     * Only the labels that are distinctive enough for a substring test to mean
     * something, which is fewer than it looks. "Engineering" is inside "Full-stack
     * and product engineering"; "Human resources" is now both a row of this grid
     * and a part of the shared graduate-output breakdown AND a row of the open
     * India-versus-hubs grid. Either would fail here while the gate was working
     * perfectly — which is why the check above is structural rather than textual,
     * and why this one is deliberately narrow.
     */
    const distinctive = ["Senior manager", "Specialist"];
    expect(names).toEqual(expect.arrayContaining(distinctive));

    const serialized = JSON.stringify(view);
    for (const name of distinctive) {
      // A row label beside a visible axis implies the answer, so cardinality is
      // all a placeholder gets.
      expect(serialized).not.toContain(name);
    }
  });

  it("carries neither the lens nor the admin's working notes", () => {
    const serialized = JSON.stringify(view);
    expect(serialized).not.toContain('"lens"');
    expect(serialized).not.toContain('"note"');
    // A phrase that only exists inside a `note`. Its absence is the check that
    // the field itself did not travel under another name.
    expect(serialized).not.toContain("STILL NEEDS");
  });

  it("drops an incomplete open metric rather than showing a half-filled one", () => {
    /**
     * Built here rather than picked out of the catalogue. This used to point at the
     * capability grid because Vietnam happened to be unrated, which made the test a
     * hostage to the seed data: the moment that cell was filled the test failed
     * while the rule it guards was still perfectly correct.
     */
    const holed: Metric = {
      id: "half-filled",
      functionArea: "tech",
      lens: "supply",
      title: "A metric with a hole in it",
      question: "Does an unfilled slot keep the whole card off the screen?",
      unit: "professionals",
      format: "number",
      structure: { kind: "breakdown", entries: ["First", "Second"] },
      value: { kind: "breakdown", values: [10, null] },
      gated: false,
    };

    const holedView = buildFunctionView(datasetWith([holed]));
    expect(holedView.areas.flatMap((area) => area.shown)).toEqual([]);
    expect(holedView.areas.flatMap((area) => area.held)).toEqual([]);
    // Better an absent card than a bar chart missing a bar.
    expect(() => find(holedView, "half-filled")).toThrow();
  });
});

/* ==========================================================================
   Shape
   ========================================================================== */

describe("area assembly", () => {
  const view = buildFunctionView(datasetWith(CATALOGUE));

  it("keeps the four function areas in their declared order", () => {
    expect(view.areas.map((area) => area.functionArea)).toEqual([
      "tech",
      "operations",
      "hr",
      "finance",
    ]);
    expect(view.areas.map((area) => area.label)).toEqual([
      "Technology",
      "Operations",
      "HR",
      "Finance",
    ]);
  });

  it("holds the catalogue's current counts", () => {
    const counts = view.areas.map((area) => [area.shown.length, area.held.length]);
    // Technology is 8 + 0 since `tech-community-events` was deleted at ANSR's request
    // and `tech-graduate-output` was replaced by the two-part `tech-graduate-pipeline`
    // — nine metrics became eight, not seven. HR is 8 + 2: workforce diversity is still
    // deleted, and `hr-graduate-output` is back at ANSR's request after one pass without
    // it. Finance is 6 + 2 with the two cost-durability additions in place.
    expect(counts).toEqual([
      [8, 0],
      [9, 0],
      [8, 2],
      [6, 2],
    ]);
  });

  it("orders a tab from the narrowest card to the widest", () => {
    const rank = { third: 0, half: 1, full: 2 } as const;
    for (const area of view.areas) {
      const ranks = area.shown.map((shown) => rank[metricWidth(shown)]);
      expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    }
  });

  it("is stable inside a shape step, so editing a value does not reshuffle", () => {
    const first = buildFunctionView(datasetWith(CATALOGUE));
    const edited = structuredClone(CATALOGUE) as Metric[];
    const target = edited.find((metric) => metric.id === "hr-bench-strength");
    if (target) target.value = { kind: "scalar", value: 190_000 };
    const second = buildFunctionView(datasetWith(edited));

    expect(second.areas.map((area) => area.shown.map((shown) => shown.metric.id))).toEqual(
      first.areas.map((area) => area.shown.map((shown) => shown.metric.id)),
    );
  });

  it("drops an area with nothing to show and nothing held", () => {
    const financeOnly = CATALOGUE.filter((metric) => metric.functionArea === "finance");
    const view = buildFunctionView(datasetWith(financeOnly));
    expect(view.areas.map((area) => area.functionArea)).toEqual(["finance"]);
  });

  it("weights a card's width by what it has to draw", () => {
    // The point of the change: how much room a card takes is a property of what it
    // draws, so a short parts list and a nine-part breakdown are not the same width.
    //
    // **There is no `third` any more.** It existed so a single figure could sit beside
    // two other single figures instead of stretching to a tall neighbour's height, and
    // the figures are not in this grid at all now — every card here draws a MARK, and a
    // mark wants either half the measure or all of it. `tech-bench-strength` is a
    // scalar, so its width is unreachable through `layoutArea` and the value below is
    // only the honest fallback; the assertion that matters about it is in "the tab
    // structure", which pins that it is in the figure row and not in `cards`.
    expect(metricWidth(find(view, "tech-bench-strength"))).toBe("half");
    expect(metricWidth(find(view, "hr-time-to-first-hire"))).toBe("half");
    // Nine disciplines still want the whole measure; the technology tab's own
    // two-part pipeline does not. The threshold moved from five parts to seven so the
    // seven specialisms could sit beside it as one two-column composition — see
    // `metricWidth`.
    expect(metricWidth(find(view, "ops-graduate-output"))).toBe("full");
    expect(metricWidth(find(view, "tech-graduate-pipeline"))).toBe("half");
    expect(metricWidth(find(view, "tech-ecosystem-size"))).toBe("half");
    expect(metricWidth(find(view, "fin-cost-composition"))).toBe("full");
    expect(metricWidth(find(view, "fin-tier-cost-spread"))).toBe("full");
    expect(metricWidth(find(view, "ops-power-uptime"))).toBe("half");
    // A four-leg staircase reads at half width, the same as any short parts list —
    // the shape changed, the amount of room it needs did not.
    expect(metricWidth(find(view, "ops-scale-milestones"))).toBe("half");
  });
});

/* ==========================================================================
   Which chart draws a metric

   The decisions that moved out of the component and into the view model, so a
   test can pin them. Each rule exists because the obvious single rule produced a
   chart that misled.
   ========================================================================== */

describe("choosing a chart", () => {
  const view = buildFunctionView(datasetWith(CATALOGUE));

  it("draws a percentage split that sums to a whole as one stacked bar", () => {
    // Four bars against a 100% axis say "each of these is some of it". One divided
    // bar says "these four are all of it", which is the claim being made.
    expect(breakdownDisplay("percent", [72, 12, 8, 8])).toBe("stack");
    const shown = find(view, "fin-cost-composition");
    if (shown.shape !== "breakdown") throw new Error("expected a breakdown");
    expect(shown.display).toBe("stack");
  });

  it("stops drawing bars for percentages clustered at the top of their domain", () => {
    // 99.95 against 99.5 draws as two identical bars on an honest 0-to-100 axis,
    // and as a difference that is not there on a truncated one. Neither is worth
    // having, so the figures carry it alone.
    expect(breakdownDisplay("percent", [99.95, 99.5])).toBe("figures");
    const shown = find(view, "ops-power-uptime");
    if (shown.shape !== "breakdown") throw new Error("expected a breakdown");
    expect(shown.display).toBe("figures");
  });

  it("nests a part inside its total, but only when it really is one", () => {
    // 132 vacant of 854 total is a containment: both are million sq ft, the second is
    // some of the first, and the METRIC SAYS SO. Containment is authored now — a shared
    // unit establishes only that two parts measure the same KIND of thing, which is a
    // precondition and never evidence. See `subset` in `schema.ts`.
    expect(breakdownDisplay("number", [854, 132], "million sq ft", undefined, true)).toBe(
      "nested",
    );
    // The same two figures without the claim: two blocks side by side, which states
    // both sizes and asserts nothing about how the two populations relate.
    expect(breakdownDisplay("number", [854, 132], "million sq ft")).toBe("adjacent");
    // A claimed subset that is more than half of its total draws as two blocks too — a
    // bar nearly filling another bar reads as a rendering fault rather than as
    // containment. The claim is unaffected; only the drawing changes.
    expect(breakdownDisplay("number", [854, 700], "million sq ft", undefined, true)).toBe(
      "adjacent",
    );

    const stock = find(view, "ops-grade-a-office-stock");
    if (stock.shape !== "breakdown") throw new Error("expected a breakdown");
    expect(stock.display).toBe("nested");
    expect(stock.metric.subset).toBe(true);
    // Only an adjacent breakdown carries a set-relative span.
    expect(stock.parts.map((part) => part.span)).toEqual([undefined, undefined]);
  });

  it("draws two disjoint populations side by side, never one inside the other", () => {
    /**
     * **The defect the authored flag exists to prevent, and it would have shipped as a
     * drawn falsehood.** 450K is TOTAL management and MBA output; it is not the number
     * of MBA graduates who hold an engineering degree, and no source available here
     * contains that number. Both parts are measured in graduates a year and 450K is
     * under half of 1.5M, so the old shared-unit rule would have nested the second
     * inside the first and asserted an overlap nobody has measured.
     */
    expect(breakdownDisplay("number", [1_500_000, 450_000], "graduates a year")).toBe(
      "adjacent",
    );

    const pipeline = find(view, "tech-graduate-pipeline");
    if (pipeline.shape !== "breakdown") throw new Error("expected a breakdown");
    expect(pipeline.display).toBe("adjacent");
    expect(pipeline.metric.subset).toBeUndefined();
    // Proportional to the SET's total, so two blocks of equal height have areas in the
    // ratio of their figures. Against the largest part they would sum to 130% and
    // overflow the row.
    const spans = pipeline.parts.map((part) => part.span);
    expect(spans.every((span) => span !== undefined)).toBe(true);
    expect(spans.reduce<number>((sum, span) => sum + (span ?? 0), 0)).toBeCloseTo(1, 10);
    expect(spans[0]).toBeCloseTo(1_500_000 / 1_950_000, 10);
    // And no overlap percentage is derived anywhere: there is nothing to derive one
    // from, which is the whole reason the two are adjacent.
    expect(pipeline.parts.map((part) => part.figure)).toEqual(["1.5M", "450K"]);
  });

  it("refuses to relate two parts that do not share a unit", () => {
    /**
     * The original bug, kept as a rule after the metric that motivated it was deleted.
     * `tech-community-events` held 1,400 meetup groups and 120 conferences a year: two
     * parts, and 120 is well under half of 1,400, so a size-only rule nested them and
     * asserted that a conference is a kind of meetup group. It declared no unit
     * precisely BECAUSE its two parts counted different things.
     *
     * The metric is gone at ANSR's request; the rule stands, and without a unit neither
     * containment nor a proportional side-by-side is available — two quantities in
     * different kinds cannot be sized against each other at all. So: bars, with or
     * without a containment claim.
     */
    expect(breakdownDisplay("number", [1_400, 120], undefined)).toBe("bars");
    expect(breakdownDisplay("number", [1_400, 120], undefined, undefined, true)).toBe(
      "bars",
    );
    expect(CATALOGUE.some((metric) => metric.id === "tech-community-events")).toBe(false);
  });

  it("leaves a percentage split that does not sum to a whole as bars", () => {
    expect(breakdownDisplay("percent", [9.8, 21.1, 20, 16.1, 7.5])).toBe("bars");
    const growth = find(view, "hr-salary-growth");
    if (growth.shape !== "breakdown") throw new Error("expected a breakdown");
    expect(growth.display).toBe("bars");
  });

  it("draws an authored progression as one path, and everything else as bars", () => {
    // The scale curve: one centre measured four times as it grows, drawn for a year
    // as four bars from a shared zero — which is the drawing of four independent
    // quantities, and is what graduate output by discipline actually is.
    expect(breakdownDisplay("duration", [6, 12, 24, 36], "months, median", true)).toBe(
      "journey",
    );

    /**
     * **The counter-example that made the flag authored rather than derived.** Network
     * latency is the same format, the same length and the same rising values — 8, 40,
     * 110, 180 ms — and is four destinations measured once each, not one journey. A
     * monotonicity rule would have drawn it as a staircase, so the discriminator has
     * to come from the definition, exactly as `indexBaseline` carries direction.
     */
    expect(breakdownDisplay("duration", [8, 40, 110, 180], "milliseconds")).toBe("bars");
    const latency = find(view, "ops-network-latency");
    if (latency.shape !== "breakdown") throw new Error("expected a breakdown");
    expect(latency.metric.progression).toBeUndefined();
    expect(latency.display).toBe("bars");
  });

  it("falls back to bars when a progression's figures have stopped progressing", () => {
    // A staircase draws each leg starting where the last one ended, so values that
    // dip cannot be drawn as one. An admin editing a waypoint below its predecessor
    // gets the wrong picture of the claim rather than a false one.
    expect(breakdownDisplay("duration", [6, 12, 9, 36], undefined, true)).toBe("bars");
    // Ties are not a progression either: two waypoints reached at the same moment
    // would draw a leg of zero length.
    expect(breakdownDisplay("duration", [6, 12, 12, 36], undefined, true)).toBe("bars");
    // Two points are a range, and the schema refuses the flag on them anyway.
    expect(breakdownDisplay("duration", [6, 36], undefined, true)).toBe("bars");
  });

  it("resolves a progression into legs that begin where the last one ended", () => {
    for (const id of ["ops-scale-milestones", "hr-scale-milestones"]) {
      const shown = find(view, id);
      if (shown.shape !== "breakdown") throw new Error("expected a breakdown");
      expect(shown.display).toBe("journey");
      const legs = shown.legs;
      if (!legs) throw new Error("expected legs");

      // Cumulative figures, exactly as stored. Nothing is recomputed into the
      // waypoints themselves.
      expect(legs.map((leg) => leg.figure)).toEqual(["6", "12", "24", "36"]);
      // The intervals are derived, signed, and absent on the first leg — which has
      // no predecessor, and whose interval would restate its own figure.
      expect(legs.map((leg) => leg.interval)).toEqual([
        undefined,
        "+6",
        "+12",
        "+12",
      ]);
      // Each leg's start is the previous leg's end, and the last one is the whole
      // journey. That property is what the staircase draws.
      expect(legs[0]?.offset).toBe(0);
      for (const [index, leg] of legs.entries()) {
        if (index > 0) expect(leg.offset).toBe(legs[index - 1]?.share);
        expect(leg.share).toBeGreaterThan(leg.offset);
      }
      expect(legs[legs.length - 1]?.share).toBe(1);
      // 6 of 36 and 12 of 36, so the first leg is half the second.
      expect(legs[0]?.share).toBeCloseTo(1 / 6, 6);
      expect(legs[1]?.share).toBeCloseTo(1 / 3, 6);
    }
  });

  it("leaves the ordinary breakdowns without legs", () => {
    for (const area of view.areas) {
      for (const shown of area.shown) {
        if (shown.shape !== "breakdown") continue;
        // Present exactly when the display is a journey, so a component reaching for
        // `legs` on a bar chart finds nothing rather than something stale.
        expect(shown.legs === undefined).toBe(shown.display !== "journey");
      }
    }
  });

  it("routes a matrix by whether it has a scale, a base, and how wide it is", () => {
    expect(gridDisplay(true, false, 4)).toBe("ratings");
    expect(gridDisplay(false, false, 4)).toBe("numbers");
    expect(gridDisplay(false, true, 2)).toBe("dumbbell");
    expect(gridDisplay(false, true, 5)).toBe("lollipop");
    // A rating scale wins over everything: an ordinal has no distance, so it gets
    // no axis whatever else the definition carries.
    expect(gridDisplay(true, true, 2)).toBe("ratings");
  });

  it("finds the index base as the column identical in every row", () => {
    // Derived from the cells, never parsed out of `indexBaseline` — that field is
    // free text an admin types, so a rule that read it would break on a typo and
    // break silently.
    expect(
      anchorColumnFor(
        ["Tier 1 cities", "Tier 2 cities"],
        [
          [100, 75],
          [100, 85],
          [100, 81],
        ],
      ),
    ).toBe("Tier 1 cities");
    expect(anchorColumnFor(["Alpha", "Beta"], [[1, 2], [3, 4]])).toBeUndefined();
  });

  it("prefers the subject column wherever the grid carries one", () => {
    // Poland is "Strong" in all five rows of the capability grid, so the
    // identical-column rule alone would anchor the reader's eye to Poland on a
    // screen about India.
    expect(
      anchorColumnFor(
        ["India", "Poland"],
        [
          ["Very strong", "Strong"],
          ["Strong", "Strong"],
        ],
      ),
    ).toBe(SUBJECT_COLUMN);
  });

  it("scales a lollipop across the whole grid, not row by row", () => {
    // The bug this chart replaced: each row was scaled to its own maximum, so
    // "India = 100" drew the SHORTEST mark in a row where the United States drew a
    // full one — and a reader scanning a cost table reads the long bar as the
    // winner. The number was right and the picture said the opposite.
    const shown = find(view, "fin-india-vs-hubs");
    if (shown.shape !== "grid") throw new Error("expected a grid");
    expect(shown.grid.kind).toBe("lollipop");
    if (shown.grid.kind !== "lollipop") return;

    expect(shown.grid.baselineColumn).toBe("India");
    // 367 is the largest cell anywhere in the grid, so it is the axis for all of
    // them and India sits at the same place on every row.
    expect(shown.grid.baselineShare).toBeCloseTo(100 / 367);
    const shares = shown.grid.rows.map(
      (row) => row.cells.find((cell) => cell.anchor)?.share,
    );
    expect(new Set(shares).size).toBe(1);

    const operations = shown.grid.rows.find((row) => row.label === "Operations");
    expect(operations?.cells.map((cell) => cell.figure)).toEqual([
      "100",
      "115",
      "148",
      "171",
      "312",
    ]);
    expect(operations?.cells[4]?.share).toBeCloseTo(312 / 367);
  });

  it("draws a two-column index as a gap, with the difference already formatted", () => {
    const shown = find(view, "fin-tier-cost-spread");
    if (shown.shape !== "grid") throw new Error("expected a grid");
    expect(shown.grid.kind).toBe("dumbbell");
    if (shown.grid.kind !== "dumbbell") return;

    const compensation = shown.grid.rows.find((row) => row.label === "Compensation");
    expect(compensation?.from.column).toBe("Tier 1");
    expect(compensation?.to.column).toBe("Tier 2");
    expect(compensation?.from.figure).toBe("100");
    expect(compensation?.to.figure).toBe("85");
    // A real minus sign, and no arithmetic left for the component.
    expect(compensation?.delta).toBe("\u221215");
  });
});

/* ==========================================================================
   The five renderings
   ========================================================================== */

describe("resolving a value", () => {
  const view = buildFunctionView(datasetWith(CATALOGUE));

  it("resolves a scalar to one compact figure, with the floor marker", () => {
    const shown = find(view, "tech-bench-strength");
    expect(shown.shape).toBe("scalar");
    if (shown.shape !== "scalar") return;
    // A floor, not a point measurement, and the "+" says so. Abbreviated because at
    // 30/38px the spelled-out unit is longer than the number it qualifies — see
    // `formatCompact`. Nothing is rounded to fit: 8.7 is exact.
    expect(shown.figure).toBe("8.7M+");
  });

  it("marks every part of a breakdown as a floor, or none of them", () => {
    // The claim belongs to the metric, so it cannot land on the headline figure and
    // silently fall off the parts list.
    const shown = find(view, "tech-ecosystem-size");
    if (shown.shape !== "breakdown") throw new Error("expected a breakdown");
    for (const part of shown.parts) expect(part.figure).toMatch(/\+$/);
    expect(shown.parts[0]?.figure).toBe("1.7M+");
    // M and K in one list, which is the trade the abbreviation makes: the reader still
    // converts between units, but the suffix is one character rather than a word, and
    // the alternative is a column running 1,700,000 down to 150,000.
    expect(shown.parts.at(-1)?.figure).toBe("150K+");

    // And a metric that declares no floor gets no marker anywhere.
    const plain = find(view, "fin-cost-composition");
    if (plain.shape !== "breakdown") throw new Error("expected a breakdown");
    for (const part of plain.parts) expect(part.figure).not.toMatch(/\+/);
  });

  it("resolves a range to two ends, their labels, and where the band starts", () => {
    const shown = find(view, "hr-time-to-first-hire");
    expect(shown.shape).toBe("range");
    if (shown.shape !== "range") return;
    expect(shown.low).toBe("7");
    expect(shown.high).toBe("70");
    // Whole clauses, not fragments. They were written to be prefixed with their own
    // endpoint figure by `RangeBar`; the HR tab draws this metric as a benchmark whose
    // figures sit on the rail itself, so the fragment had nothing to attach to and the
    // prefix was the third appearance of the same number on one card.
    expect(shown.lowLabel).toBe("Hiring through an employer of record");
    expect(shown.highLabel).toBe("Hiring directly into your own entity");
    expect(shown.offset).toBeCloseTo(7 / 70);
  });

  it("leaves a range's end labels null when the definition has none", () => {
    // Time to backfill deliberately has none: the ends would have to name a
    // function, which is the split the shared metric exists to collapse.
    const shown = find(view, "ops-backfill-time");
    if (shown.shape !== "range") throw new Error("expected a range");
    expect(shown.lowLabel).toBeNull();
    expect(shown.highLabel).toBeNull();
  });

  it("gives the same metric the same figures on every tab that shows it", () => {
    // The product claim, at the seam a visitor actually reads. Four tabs, one
    // national picture — see the note at the top of metric-catalogue.ts.
    for (const ids of [
      ["tech-bench-strength", "ops-bench-strength", "hr-bench-strength"],
      // Graduate output is not here any more, and its absence is asserted rather than
      // simply dropped: ANSR asked for the nine-discipline split off the technology page
      // and then off the HR page, so it is on operations alone and there is no second
      // rendering for it to agree with. What still guards it is
      // `metrics.test.ts`'s "keeps graduate output authored once", which pins that it is
      // still spread through `onTab` and that `tech-graduate-pipeline` quotes its
      // figures unchanged.
      ["tech-leadership-depth", "hr-leadership-depth"],
      ["ops-backfill-time", "hr-backfill-time"],
      ["ops-time-to-first-hire", "hr-time-to-first-hire"],
      ["ops-scale-milestones", "hr-scale-milestones"],
    ]) {
      const rendered = ids.map((id) => {
        const shown = find(view, id);
        // Everything the card draws, minus which tab it was found on.
        return JSON.stringify({
          ...shown,
          metric: { ...shown.metric, id: null, functionArea: null },
        });
      });
      expect(new Set(rendered).size, ids.join(" / ")).toBe(1);
    }
  });

  it("resolves a breakdown to parts in the authored order, with shares", () => {
    const shown = find(view, "fin-cost-composition");
    if (shown.shape !== "breakdown") throw new Error("expected a breakdown");
    expect(shown.parts.map((part) => part.label)[0]).toBe("Salary differential");
    expect(shown.parts.map((part) => part.figure)).toEqual(["72%", "12%", "8%", "8%"]);
    // A percentage scales to 100, so 72% draws as 72% of the track.
    expect(shown.parts[0]?.share).toBeCloseTo(0.72);
  });

  it("abbreviates a count breakdown's parts and leaves every other format alone", () => {
    const shown = find(view, "ops-graduate-output");
    if (shown.shape !== "breakdown") throw new Error("expected a breakdown");
    /**
     * **This reverses a recorded decision, and the abbreviation is what changed.** The
     * digits were kept here on the grounds that "1.5 million" beside "300,000" makes a
     * reader convert between units to compare two rows of one list. Abbreviated the
     * same list reads "1.5M" beside "300K", where the suffix is one character rather
     * than a word and the numerals still align under `tabular-nums`.
     *
     * The exactness rule is unchanged: a unit is only used where the division into it
     * is exact, and K needs a whole number of thousands at 10,000 or above — which is
     * why 45,000 abbreviates and 1,250 elsewhere does not.
     */
    // "Other sciences" (350K) was removed from the discipline split at ANSR's request,
    // on the technology, operations and HR tabs.
    expect(shown.parts.map((part) => part.figure)).toEqual([
      "1.5M",
      "300K",
      "250K",
      "200K",
      "600K",
      "450K",
      "250K",
      "45K",
    ]);
    // A duration keeps its digits: months and days are never large enough to need a
    // unit, so there is nothing for an abbreviation to buy.
    const curve = find(view, "ops-scale-milestones");
    if (curve.shape !== "breakdown") throw new Error("expected a breakdown");
    expect(curve.parts.map((part) => part.figure)).toEqual(["6", "12", "24", "36"]);
  });

  it("scales a bare numeric grid against its own row", () => {
    // The fallback reading, for a matrix that is neither an index nor a rating.
    // Its rows measure different things, so a shared axis across them would
    // compare a latency with a headcount. No seeded metric takes this path — every
    // matrix in the catalogue declares a base or a scale — so it is built here.
    const metrics = structuredClone(CATALOGUE) as Metric[];
    const target = metrics.find((metric) => metric.id === "fin-tier-cost-spread");
    if (!target) throw new Error("expected the tier spread");
    delete target.indexBaseline;

    const shown = find(buildFunctionView(datasetWith(metrics)), "fin-tier-cost-spread");
    if (shown.shape !== "grid") throw new Error("expected a grid");
    expect(shown.grid.kind).toBe("numbers");
    if (shown.grid.kind !== "numbers") return;

    expect(shown.grid.columns).toEqual(["Tier 1", "Tier 2"]);
    const compensation = shown.grid.rows.find((row) => row.label === "Compensation");
    expect(compensation?.cells.map((cell) => cell.figure)).toEqual(["100", "85"]);
    expect(compensation?.cells[0]?.share).toBeCloseTo(1);
    expect(compensation?.cells[1]?.share).toBeCloseTo(0.85);
  });

  it("resolves the rating variant of a grid to ordinal steps", () => {
    // Filled defensively rather than read straight from the seed: the rendering
    // under test is "every cell rated", and leaning on the catalogue happening to
    // be complete is how four tests broke the day the empty cells were filled.
    const metrics = structuredClone(CATALOGUE) as Metric[];
    const capability = metrics.find(
      (metric) => metric.id === "tech-capability-comparison",
    );
    if (!capability || capability.value?.kind !== "matrix") {
      throw new Error("expected the capability matrix");
    }
    capability.value = {
      kind: "matrix",
      cells: capability.value.cells.map((row) =>
        row.map((cell) => (cell === null ? "Moderate" : cell)),
      ),
    };

    const rated = buildFunctionView(datasetWith(metrics));
    const shown = find(rated, "tech-capability-comparison");
    if (shown.shape !== "grid") throw new Error("expected a grid");
    expect(shown.grid.kind).toBe("ratings");
    if (shown.grid.kind !== "ratings") return;

    expect(shown.grid.steps).toEqual([
      "Developing",
      "Moderate",
      "Strong",
      "Very strong",
    ]);
    expect(shown.grid.columns).toEqual(["India", "Poland", "Philippines", "Vietnam"]);

    const product = shown.grid.rows.find((row) => row.label === "Product engineering");
    expect(product?.cells.map((cell) => cell.rating)).toEqual([
      "Very strong",
      "Strong",
      "Developing",
      "Moderate",
    ]);
    // 1-based position in the metric's own scale, so a cell can be drawn as
    // filled steps as well as read as a label.
    expect(product?.cells.map((cell) => cell.step)).toEqual([4, 3, 1, 2]);
  });

  it("renders every shape the catalogue can produce", () => {
    const shapes = new Set(
      buildFunctionView(datasetWith(CATALOGUE)).areas.flatMap((area) =>
        area.shown.map((shown) => shown.shape),
      ),
    );
    expect([...shapes].sort()).toEqual(["breakdown", "grid", "range", "scalar"]);

    const heldShapes = new Set(
      buildFunctionView(datasetWith(CATALOGUE)).areas.flatMap((area) =>
        area.held.map((held) => held.metric.shape.kind),
      ),
    );
    expect([...heldShapes].sort()).toEqual(["breakdown", "matrix"]);
  });
});

/* ==========================================================================
   Scales
   ========================================================================== */

describe("bar scales", () => {
  /**
   * **A percentage scales to 100 where it is a SHARE OF A WHOLE, and to the largest part
   * where it is a rate.** The rule used to be "percent always scales to 100", which was
   * right about the case it was written for and wrong about the other one.
   *
   * A stacked bar has no choice: `StackedShare` lays its segments end to end, so the
   * shares must sum to one or the bar overflows and stops being a part-to-whole claim.
   *
   * A growth rate is not a share of anything. Five salary figures from 7.5% to 21.1%
   * against a 100% axis draw as slivers occupying a fifth of the track, with four fifths
   * of the card given to a region no value can reach — and they imply there is a 100%
   * figure to be read against. The case the old rule was protecting is already gone by
   * the time the scale is chosen: `clusteredHigh` routes 99.95-against-99.5 to `figures`,
   * which draws no bars at all, so the only percentages that arrive as `bars` are spread
   * across their own range where proportional length is honest.
   */
  it("scales a percentage to 100 only where the parts are the whole", () => {
    expect(breakdownScale("percent", [72, 12, 8, 8], "stack")).toBe(100);
    // A rate. Against the largest part, so the ranking is legible.
    expect(breakdownScale("percent", [21.1, 20, 16.1, 9.8, 7.5], "bars")).toBe(21.1);
    // The clustered-high pair never reaches the bars branch — `breakdownDisplay` sends
    // it to `figures` — so what its scale would have been is not load-bearing.
    expect(breakdownDisplay("percent", [99.95, 99.5])).toBe("figures");
  });

  it("scales a count or a duration against the largest part present", () => {
    expect(breakdownScale("number", [1_400, 120])).toBe(1_400);
    expect(breakdownScale("duration", [6, 12, 24, 36])).toBe(36);
    expect(breakdownScale("index", [100, 93, 70, 45, 37])).toBe(100);
  });

  it("never divides by zero", () => {
    expect(breakdownScale("number", [0, 0])).toBe(1);
    expect(rowScale([0])).toBe(1);
  });

  it("reads a grid cell against its own row", () => {
    expect(rowScale([100, 122, 167, 189, 367])).toBe(367);
  });
});

/* ==========================================================================
   Formatting
   ========================================================================== */

describe("figures", () => {
  it("uses the million unit only when the division is exact", () => {
    expect(formatCompact(5_800_000)).toBe("5.8M");
    expect(formatCompact(17_000_000)).toBe("17M");
    expect(formatCompact(2_360_000)).toBe("2.36M");
    // Would need rounding to fit the unit, so it keeps its digits instead. This is the
    // whole no-quiet-approximation rule, and the abbreviation pass did not touch it.
    expect(formatCompact(17_342_881)).toBe("17,342,881");
  });

  it("abbreviates thousands only where the digits are the harder read", () => {
    /**
     * **Stricter than millions, and 1,250 is the reason.** A count of GCCs shown as
     * "1.25K" is less immediate and less natural than the digits, so K needs a whole
     * number of thousands AND a value at 10,000 or above — the point where a
     * comma-grouped figure stops being read at a glance.
     */
    expect(formatCompact(800_000)).toBe("800K");
    expect(formatCompact(150_000)).toBe("150K");
    expect(formatCompact(45_000)).toBe("45K");
    // Not a whole number of thousands.
    expect(formatCompact(1_250)).toBe("1,250");
    expect(formatCompact(1_400)).toBe("1,400");
    // A whole number of thousands, but under the floor.
    expect(formatCompact(9_000)).toBe("9,000");
    expect(formatCompact(854)).toBe("854");
  });

  it("groups in the reader's locale, not the subject's", () => {
    // en-IN would render this "6,00,000", which is correct for an Indian reader
    // and a stumble for the audience these screens are written for. This is the
    // first screen with a figure large enough for the two to differ at all.
    // 600,000 abbreviates now, so the locale is asserted on a figure that keeps its
    // digits — which is the case where the grouping is visible at all.
    expect(formatCompact(17_342_881)).toBe("17,342,881");
    expect(formatFigure("number", 1_250)).toBe("1,250");
    expect(formatFigure("number", 1_250, true)).toBe("1,250");
  });

  it("suffixes a percentage and leaves an index bare", () => {
    expect(formatFigure("percent", 9.8)).toBe("9.8%");
    expect(formatFigure("percent", 35)).toBe("35%");
    expect(formatFigure("index", 100)).toBe("100");
    expect(formatFigure("duration", 84)).toBe("84");
  });

  /**
   * `figureParts` splits a figure into its numeral and its unit, so a summary row can
   * set the unit two scale steps down and baseline-aligned — Screen 1's snapshot device.
   *
   * **What is being pinned is the CLOSED ALPHABET.** The rule this function lives beside
   * is that a unit is a field rather than something a component regexes off a value; it
   * is allowed to exist because it operates only on strings the formatters above
   * produced, whose trailing characters can only be `%`, `M`, `K` or `+`. Anything else
   * has to come back whole — a grouped count, a bare index, and above all a signed delta,
   * which would be a wrong figure rather than a badly set one.
   */
  it("splits a figure into its numeral and its unit, and only where there is one", () => {
    expect(figureParts("8.7M+")).toEqual({ value: "8.7", suffix: "M+" });
    expect(figureParts("800K")).toEqual({ value: "800", suffix: "K" });
    expect(figureParts("17M")).toEqual({ value: "17", suffix: "M" });
    expect(figureParts("99.95%")).toEqual({ value: "99.95", suffix: "%" });
    expect(figureParts("6+")).toEqual({ value: "6", suffix: "+" });
    // Nothing to split: the whole figure comes back, suffix absent.
    expect(figureParts("1,250")).toEqual({ value: "1,250" });
    expect(figureParts("854")).toEqual({ value: "854" });
    expect(figureParts("100")).toEqual({ value: "100" });
    // A real minus sign, from a signed delta. Neither the sign nor the digits may move.
    expect(figureParts("\u221215")).toEqual({ value: "\u221215" });
    // A unit with no numeral in front of it is not a figure, so it is left whole rather
    // than reduced to an empty numeral with a suffix beside it.
    expect(figureParts("%")).toEqual({ value: "%" });
  });

  it("compacts only when the caller asks, and never for a non-count format", () => {
    expect(formatFigure("number", 5_800_000, true)).toBe("5.8M");
    expect(formatFigure("number", 5_800_000)).toBe("5,800,000");
    // Grids pass `false`: a cell is read against its own row rather than against the
    // cell beside it, so there is no set-wide reading for an abbreviation to help.
    expect(formatFigure("duration", 5_800_000, true)).toBe("5,800,000");
    expect(formatFigure("percent", 9.8, true)).toBe("9.8%");
  });
});

/* ==========================================================================
   Cost, in every lens
   ========================================================================== */

/**
 * Every string a grid puts on the screen, whichever of the four readings it is.
 *
 * Exhaustive over `MetricGrid` by construction: a fifth reading added without a
 * branch here is a compile error rather than a currency check that silently stops
 * covering one of them.
 */
function gridFigures(grid: Extract<ShownMetric, { shape: "grid" }>["grid"]): string[] {
  switch (grid.kind) {
    case "numbers":
    case "lollipop":
      return grid.rows.flatMap((row) => row.cells.map((cell) => cell.figure));
    case "dumbbell":
      return grid.rows.flatMap((row) => [row.from.figure, row.to.figure, row.delta]);
    case "ratings":
      return grid.rows.flatMap((row) => row.cells.map((cell) => cell.rating));
  }
}

describe("no absolute money anywhere", () => {
  it("shows no currency symbol or code in any figure or unit", () => {
    const view = buildFunctionView(datasetWith(CATALOGUE));
    const currency =
      /[₹$€£¥]|\b(inr|usd|eur|gbp|jpy|rs|rupees?|lakhs?|crores?|dollars?|euros?|pounds?)\b/i;

    for (const area of view.areas) {
      for (const shown of area.shown) {
        expect(shown.metric.unit ?? "").not.toMatch(currency);
        const figures =
          shown.shape === "scalar"
            ? [shown.figure]
            : shown.shape === "range"
              ? [shown.low, shown.high]
              : shown.shape === "breakdown"
                ? shown.parts.map((part) => part.figure)
                : gridFigures(shown.grid);
        for (const figure of figures) expect(figure).not.toMatch(currency);
      }
    }
  });
});

/* ==========================================================================
   The seam itself
   ========================================================================== */

describe("buildFunctionAreaView", () => {
  it("takes public metrics, so there is no path around the gate", () => {
    // The signature is the point: it cannot be handed a `Metric`, only the output
    // of `publicMetricsFor`.
    const area = buildFunctionAreaView(publicMetricsFor(CATALOGUE, "finance"), "finance");
    expect(area.functionArea).toBe("finance");
    expect(area.held).toHaveLength(2);
    expect(area.shown).toHaveLength(6);
  });
});

/* ==========================================================================
   The catalogue's own membership
   ========================================================================== */

describe("what is on the catalogue and what is not", () => {
  const view = buildFunctionView(datasetWith(CATALOGUE));

  it("no longer carries workforce diversity anywhere", () => {
    // Removed at ANSR's request, and DELETED rather than gated or emptied — a gated
    // card claims a figure is being held and an empty definition can be half-filled
    // into a live card, and neither is true of a metric that is out of scope.
    expect(CATALOGUE.some((metric) => metric.id === "hr-workforce-diversity")).toBe(
      false,
    );
    for (const area of view.areas) {
      for (const metric of [...area.shown.map((s) => s.metric), ...area.held.map((h) => h.metric)]) {
        expect(metric.title).not.toMatch(/diversity/i);
      }
    }
    const hr = view.areas.find((area) => area.functionArea === "hr");
    // Ten: nine after the diversity block went, and ten again with `hr-graduate-output`
    // restored at ANSR's request. The diversity metric is the only HR deletion left, and
    // it is a deletion rather than a gating — see above.
    expect((hr?.shown.length ?? 0) + (hr?.held.length ?? 0)).toBe(10);
    expect(CATALOGUE.some((metric) => metric.id === "hr-graduate-output")).toBe(true);
  });

  it("carries the cost-durability trio, with the two placeholders marked as such", () => {
    /**
     * **The three thirds of the brief's cost-durability metric, now all three rendered.**
     * `fin-cost-growth` is the compensation third and is real at 9.8%. The other two are
     * PLACEHOLDERS at 10%, placed on the project owner's instruction so the cards can be
     * demonstrated, and replaceable from admin without a developer.
     *
     * **This test is the guard against a placeholder quietly becoming a fact.** It pins
     * the marker rather than the number, so editing the figure in admin — the intended
     * path — leaves it passing, while deleting the marker from the note fails it. Whoever
     * removes it has to be able to say where a real rate came from.
     */
    const placeholders = ["fin-operating-cost-growth", "fin-workplace-cost-growth"];
    const finance = view.areas.find((area) => area.functionArea === "finance");
    for (const id of placeholders) {
      const metric = CATALOGUE.find((entry) => entry.id === id);
      expect(metric, id).toBeDefined();
      expect(metric?.functionArea, id).toBe("finance");
      expect(metric?.format, id).toBe("percent");
      expect(metric?.gated, id).toBe(false);
      expect(metric?.note, id).toMatch(/PLACEHOLDER/);
      expect(finance?.shown.some((shown) => shown.metric.id === id), id).toBe(true);
    }
    /**
     * **All three are in the FIGURE ROW, which is what retired the ragged titles.**
     * They used to be three thirds filling one row of the card grid, and that row was
     * ragged: "Operating cost growth year on year" and its workplace twin wrap to two
     * lines at third width where "India wage growth year on year" does not, so the
     * three figures sat at two different baselines under `items-start`. The style lock
     * left the fix to this pass with three options, all of which needed ANSR to rename
     * an admin-editable title. None was needed in the end — the figure row pins its
     * labels to two lines' worth of room, so the figures share a baseline whatever the
     * titles say.
     */
    const trio = ["fin-cost-growth", ...placeholders];
    for (const id of trio) {
      expect(
        finance?.figures.some((shown) => shown.metric.id === id),
        id,
      ).toBe(true);
    }
    expect(finance?.figures).toHaveLength(3);
    // And none of them is in the card grid, which is what the split guarantees.
    for (const id of trio) {
      expect(
        finance?.cards.some(({ shown }) => shown.metric.id === id),
        id,
      ).toBe(false);
    }
  });
});

/* ==========================================================================
   The structure — the figure row, and no part-empty row on any tab

   The promoted structure. Every bare scalar leaves the card grid for one figure row;
   every metric that draws a MARK stays in the grid at the width `metricWidth` gives
   it, packed so no row is left part-empty.

   **The packing moved out of the component to be testable.** It was in
   `function-view.tsx` on the grounds that a card's width is a bet about what sits
   beside it, which is a row-level question rather than a property of one metric. With
   two widths and every scalar out of the grid the result is a pure function of the
   metric list, so it is data — and "no row is part-empty" becomes a property a test
   can pin on all four tabs rather than something only a screenshot can show.
   ========================================================================== */

describe("the tab structure", () => {
  const view = buildFunctionView(datasetWith(CATALOGUE));

  it("puts every scalar in the figure row and nothing else", () => {
    for (const area of view.areas) {
      const scalars = area.shown.filter((shown) => shown.shape === "scalar");
      expect(area.figures, area.functionArea).toEqual(scalars);
      expect(
        area.figures.every((shown) => shown.shape === "scalar"),
        area.functionArea,
      ).toBe(true);
    }
  });

  it("puts every metric that draws a mark in the card grid, and none twice", () => {
    for (const area of view.areas) {
      const drawn = area.shown.filter((shown) => shown.shape !== "scalar");
      expect(area.cards.map(({ shown }) => shown), area.functionArea).toEqual(drawn);
      // The two runs partition `shown` — nothing is dropped and nothing is doubled.
      expect(
        area.figures.length + area.cards.length,
        area.functionArea,
      ).toBe(area.shown.length);
    }
  });

  it("leaves no part-empty row on any tab, open or held", () => {
    /**
     * Twelve columns, `half` is six and `full` is twelve at every breakpoint, so a run
     * of widths tiles exactly when its total is a multiple of twelve. That is the whole
     * arithmetic — and it is checkable now precisely because a width no longer means a
     * different number of columns at `sm` than at `lg`.
     */
    const columns = { half: 6, full: 12 } as const;
    for (const area of view.areas) {
      const open = area.cards.reduce((sum, { width }) => sum + columns[width], 0);
      expect(open % 12, `${area.functionArea} open grid`).toBe(0);

      const held = area.heldCards.reduce((sum, { width }) => sum + columns[width], 0);
      expect(held % 12, `${area.functionArea} held grid`).toBe(0);
    }
  });

  it("only ever widens a card, and never reorders one", () => {
    for (const area of view.areas) {
      for (const { shown, width } of area.cards) {
        const own = metricWidth(shown);
        // `half` is the narrow value, so a packed width may equal its own or be `full`.
        if (own === "full") {
          expect(width, shown.metric.id).toBe("full");
        } else {
          expect(["half", "full"], shown.metric.id).toContain(width);
        }
      }
    }
  });

  it("packs an odd trailing half to full rather than leaving a hole", () => {
    // Technology is the tab that exercises it: one half among three fulls.
    expect(packWidths(["half", "full", "full", "full"])).toEqual([
      "full",
      "full",
      "full",
      "full",
    ]);
    // An even run is untouched.
    expect(packWidths(["half", "half", "full"])).toEqual(["half", "half", "full"]);
    // Only the LAST half widens, so the pairs in front of it are preserved.
    expect(packWidths(["half", "half", "half"])).toEqual(["half", "half", "full"]);
    // Nothing to do.
    expect(packWidths([])).toEqual([]);
    expect(packWidths(["full"])).toEqual(["full"]);
  });

  it("gives every tab a figure row and a card grid that both have content", () => {
    /**
     * Not a structural requirement — a tab with no scalars would render no figure row,
     * and that is correct — but it is worth pinning what the catalogue actually
     * produces, so a future edit that empties one is a visible test change rather than
     * a silently different screen.
     */
    const counts = Object.fromEntries(
      view.areas.map((area) => [
        area.functionArea,
        { figures: area.figures.length, cards: area.cards.length },
      ]),
    );
    expect(counts).toEqual({
      // Technology is three drawn cards: the graduate pipeline and the specialism
      // ranking as the two halves, then the capability matrix at full measure. It was
      // four before `tech-community-events` was deleted at ANSR's request.
      tech: { figures: 5, cards: 3 },
      /**
       * **Operations is composed now and does not use these numbers either**, exactly as
       * HR does not — `OpsPanel` selects by id and draws four summary cells and five
       * cards. They are still pinned because `layoutArea` still produces them and the
       * leftover branch in that file reads whatever the composition does not place, so a
       * metric added to the tab is visible on the page the day it lands.
       */
      operations: { figures: 1, cards: 8 },
      // HR is 3 figures and 5 drawn cards with `hr-graduate-output` restored: the two
      // hiring ranges, the scale curve, the salary ranking and the nine-discipline
      // breakdown, which is the one full-measure card of the five. The HR tab does not
      // use this layout to compose itself anyway, it selects by id. The counts are still
      // pinned here because `layoutArea` still produces them and `HrPanel`'s leftover
      // branch reads whatever it does not place.
      hr: { figures: 3, cards: 5 },
      finance: { figures: 3, cards: 3 },
    });
  });

  it("splits technology's cards into a two-column zone and a full-measure one", () => {
    /**
     * **The reference composition's structure, and it falls out of the widths rather
     * than being composed by hand.** `compareByWidth` puts the halves first and
     * `packWidths` leaves them alone when there is an even number, so the leading run
     * of halves IS the two-column talent section and the remainder is the full-width
     * evidence under it. `AreaPanel` does nothing but cut the list where the widths
     * change and give each part its own ground.
     *
     * Pinned because the composition depends on it: a third half-width card on this tab
     * would widen one of them to fill its row and the two-column section would become
     * three cards, which is a visible change to a screen ANSR has signed off.
     */
    const tech = view.areas.find((area) => area.functionArea === "tech");
    if (!tech) throw new Error("expected a technology tab");
    expect(tech.cards.map((card) => [card.shown.metric.id, card.width])).toEqual([
      ["tech-graduate-pipeline", "half"],
      ["tech-ecosystem-size", "half"],
      ["tech-capability-comparison", "full"],
    ]);
    // The five figures, in the catalogue's own order, which is the pyramid.
    expect(tech.figures.map((shown) => shown.metric.id)).toEqual([
      "tech-bench-strength",
      "tech-manager-depth",
      "tech-leadership-depth",
      "tech-gcc-scale-count",
      "tech-open-source-signal",
    ]);
  });
});

/* ==========================================================================
   The copy

   Screen 2's sentences had NO unit coverage at all until this block existed —
   `screen1.test.ts` carried a comment asserting that `functionFraming`'s branching
   was "covered in screen2.test.ts", and it was not. Two things are pinned here.

   The three branches of the close, because `gccStatus` is otherwise a field with no
   test behind it and it is the only reason the input survives. **`functionFraming` is
   RENDERED BY NOTHING again** — the close's copy is supplied, fixed and identical on
   both screens, so there is nothing left for a status to select — which makes this the
   only place the field can be varied at all and moves it into the same category as the
   sentences below it. And those three sentences, because the governing rule for the
   removal pass is "kept exported and unit-tested but unrendered": a sentence with no
   test is a sentence that quietly rots until nobody dares restore it.
   ========================================================================== */

describe("the close, and the sentences kept for ANSR", () => {
  const input = (gccStatus: GccStatus): PeerViewInput => ({
    companyName: "Acme Global",
    industry: "BFSI",
    revenueBand: "Above $20 Bn",
    hqCountry: "USA",
    gccStatus,
  });

  it("branches both closing fields on gccStatus, and nothing else", () => {
    const framings = GCC_STATUSES.map((status) => functionFraming(input(status)));
    for (const field of ["ctaHeading", "ctaBody"] as const) {
      const values = framings.map((framing) => framing[field]);
      expect(new Set(values).size, field).toBe(GCC_STATUSES.length);
      for (const value of values) expect(value.trim()).not.toBe("");
    }
    /**
     * **TWO fields, not three, and not the five `project.md` once recorded.** It carried
     * a `title` and a `lead` as well — both gone with the screen's `h2` and the paragraph
     * under it — and then a `ctaLabel`, which is now one constant in the shared component:
     * three labels of the form "Talk to ANSR about {verb} your India GCC" each restated
     * the heading directly above them, and Screen 1 had the same three, so one sentence
     * had six variants.
     *
     * The key list is asserted rather than the count, so a field coming BACK has to be
     * declared here — which is the only way a fourth string can be added deliberately
     * rather than by drift.
     */
    expect(Object.keys(framings[0] ?? {}).sort()).toEqual([
      "ctaBody",
      "ctaHeading",
    ]);
  });

  it("never states a count or reads back an answer the form did not ask for", () => {
    for (const status of GCC_STATUSES) {
      const framing = functionFraming(input(status));
      const all = Object.values(framing).join(" ");
      // "India today" is the label of the removed India-presence question. `gccStatus`
      // is a constant now, so any sentence echoing it would be the tool telling a
      // visitor what they said about something it never asked.
      expect(all).not.toContain("India today");
      expect(all).not.toMatch(/\d/);
    }
  });

  it("says why a figure is held in the heading, singular and plural", () => {
    expect(heldHeading(1)).toBe("One figure shaped by your roles and cities");
    expect(heldHeading(2)).toBe("Figures shaped by your roles and cities");
    // The reason is what only words could carry. That the shape is here and the
    // figure is not is drawn three ways — the sealed card, its chip, and the
    // cardinality note — so the removed paragraph said it a fourth time.
    for (const count of [1, 2]) {
      expect(heldHeading(count)).toMatch(/shaped by your roles and cities/);
    }
  });

  it("counts a withheld shape and names nothing in it", () => {
    expect(heldShapeNote({ kind: "scalar" })).toBe("One figure.");
    expect(heldShapeNote({ kind: "breakdown", entries: 5 })).toBe("5 parts.");
    expect(heldShapeNote({ kind: "matrix", rows: 5, columns: 5 })).toBe(
      "5 rows across 5 columns.",
    );
  });

  it("keeps the three claims the page can no longer make", () => {
    /**
     * Each of these is one prop to restore and is on `handoff.md`'s blocked list.
     * `SCREEN_SOURCE` is the source credit, gone the same way Screen 1's did.
     * `COST_PROVENANCE` is the promise that no per-head salary exists behind the gate
     * either, which no label can imply. `SHARED_SUPPLY_PROVENANCE` is what the shared
     * supply figures count and that they do not move between tabs.
     */
    for (const sentence of [
      SCREEN_SOURCE,
      COST_PROVENANCE,
      SHARED_SUPPLY_PROVENANCE,
    ]) {
      expect(sentence.trim()).not.toBe("");
      expect(sentence.trim()).toMatch(/\.$/);
    }
    expect(COST_PROVENANCE).toMatch(/no per-head salary figure/);
    expect(SHARED_SUPPLY_PROVENANCE).toMatch(/national workforce/);
    expect(SHARED_SUPPLY_PROVENANCE).toMatch(/every tab/);
  });

  it("explains the floor marker where a figure carries one", () => {
    // The surviving half of `SCREEN_PROVENANCE`, moved from the foot of every tab to
    // the five cards out of thirty-four that actually have a plus on them. "indicates"
    // rather than "is", at the HR composition's own wording — the plus is a marker on a
    // figure rather than the figure itself, which is what the verb now says.
    expect(FLOOR_NOTE).toBe("+ indicates a floor, not a point measurement");
    const marked = CATALOGUE.filter((metric) => metric.atLeast);
    expect(marked.length).toBeGreaterThan(0);
    for (const metric of marked) expect(metric.format).not.toBe("rating");
  });
});
