import { describe, expect, it } from "vitest";

import { seedMetricCatalogue } from "@/data/metric-catalogue";
import { publicMetricsFor } from "@/data/metrics";
import { DEFAULT_SITE_CONTENT, type Dataset, type Metric } from "@/data/schema";
import {
  anchorColumnFor,
  breakdownDisplay,
  breakdownScale,
  buildFunctionAreaView,
  buildFunctionView,
  formatCompact,
  formatFigure,
  gridDisplay,
  metricWidth,
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
    expect(counts).toEqual([
      [9, 0],
      [9, 0],
      [9, 2],
      [4, 2],
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
    // The point of the change: a single figure no longer takes the same width as a
    // nine-part breakdown, which is what made a scalar card stretch to a tall
    // neighbour's height and render four fifths empty.
    expect(metricWidth(find(view, "tech-bench-strength"))).toBe("third");
    expect(metricWidth(find(view, "hr-time-to-first-hire"))).toBe("half");
    expect(metricWidth(find(view, "tech-graduate-output"))).toBe("full");
    expect(metricWidth(find(view, "fin-cost-composition"))).toBe("full");
    expect(metricWidth(find(view, "fin-tier-cost-spread"))).toBe("full");
    expect(metricWidth(find(view, "ops-power-uptime"))).toBe("half");
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
    // 132 vacant of 854 total is a containment: both are million sq ft, and the
    // second is some of the first.
    expect(breakdownDisplay("number", [854, 132], "million sq ft")).toBe("nested");
    // Two counts that happen to be close are a comparison, not a containment.
    expect(breakdownDisplay("number", [854, 700], "million sq ft")).toBe("bars");

    const stock = find(view, "ops-grade-a-office-stock");
    if (stock.shape !== "breakdown") throw new Error("expected a breakdown");
    expect(stock.display).toBe("nested");
  });

  it("refuses to nest two parts that do not share a unit", () => {
    // The bug this rule exists for, and it shipped as a drawn falsehood. Technical
    // community activity holds 1,400 meetup groups and 120 conferences a year: two
    // parts, and 120 is well under half of 1,400, so a size-only rule nested them
    // and asserted that a conference is a kind of meetup group. The metric declares
    // no unit precisely BECAUSE its two parts count different things.
    expect(breakdownDisplay("number", [1_400, 120], undefined)).toBe("bars");

    const community = find(view, "tech-community-events");
    if (community.shape !== "breakdown") throw new Error("expected a breakdown");
    expect(community.metric.unit).toBeUndefined();
    expect(community.display).toBe("bars");
  });

  it("leaves a percentage split that does not sum to a whole as bars", () => {
    expect(breakdownDisplay("percent", [35, 25, 28.8])).toBe("bars");
    expect(breakdownDisplay("percent", [9.8, 21.1, 20, 16.1, 7.5])).toBe("bars");
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
    expect(compensation?.from.column).toBe("Tier 1 cities");
    expect(compensation?.to.column).toBe("Tier 2 cities");
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
    // A floor, not a point measurement, and the "+" says so.
    expect(shown.figure).toBe("8.7 million+");
  });

  it("marks every part of a breakdown as a floor, or none of them", () => {
    // The claim belongs to the metric, so it cannot land on the headline figure and
    // silently fall off the parts list.
    const shown = find(view, "tech-ecosystem-size");
    if (shown.shape !== "breakdown") throw new Error("expected a breakdown");
    for (const part of shown.parts) expect(part.figure).toMatch(/\+$/);
    expect(shown.parts[0]?.figure).toBe("1,700,000+");

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
    expect(shown.lowLabel).toBe("on an employer of record");
    expect(shown.highLabel).toBe("hiring directly into your own entity");
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
      ["tech-graduate-output", "ops-graduate-output", "hr-graduate-output"],
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

  it("keeps one presentation across a breakdown's parts", () => {
    const shown = find(view, "tech-graduate-output");
    if (shown.shape !== "breakdown") throw new Error("expected a breakdown");
    // Not "1.5 million" beside "300,000": a reader should not have to convert
    // between units to compare two rows of the same list.
    expect(shown.parts.map((part) => part.figure)).toEqual([
      "1,500,000",
      "300,000",
      "250,000",
      "200,000",
      "350,000",
      "600,000",
      "450,000",
      "250,000",
      "45,000",
    ]);
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

    expect(shown.grid.columns).toEqual(["Tier 1 cities", "Tier 2 cities"]);
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
  it("scales a percentage against 100, never against the largest part", () => {
    // 99.95 and 99.5 against each other would draw two near-identical full bars
    // by accident; against 100 they are correctly both near-full.
    expect(breakdownScale("percent", [99.95, 99.5])).toBe(100);
    expect(breakdownScale("percent", [9.8, 3, 2])).toBe(100);
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
    expect(formatCompact(5_800_000)).toBe("5.8 million");
    expect(formatCompact(17_000_000)).toBe("17 million");
    expect(formatCompact(2_360_000)).toBe("2.36 million");
    // Would need rounding to fit the unit, so it keeps its digits instead.
    expect(formatCompact(17_342_881)).toBe("17,342,881");
  });

  it("groups in the reader's locale, not the subject's", () => {
    // en-IN would render this "6,00,000", which is correct for an Indian reader
    // and a stumble for the audience these screens are written for. This is the
    // first screen with a figure large enough for the two to differ at all.
    expect(formatCompact(600_000)).toBe("600,000");
    expect(formatFigure("number", 1_250)).toBe("1,250");
  });

  it("suffixes a percentage and leaves an index bare", () => {
    expect(formatFigure("percent", 9.8)).toBe("9.8%");
    expect(formatFigure("percent", 35)).toBe("35%");
    expect(formatFigure("index", 100)).toBe("100");
    expect(formatFigure("duration", 84)).toBe("84");
  });

  it("compacts only where a figure stands alone", () => {
    expect(formatFigure("number", 5_800_000, true)).toBe("5.8 million");
    expect(formatFigure("number", 5_800_000)).toBe("5,800,000");
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
    expect(area.shown).toHaveLength(4);
  });
});
