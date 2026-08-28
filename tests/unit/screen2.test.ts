import { describe, expect, it } from "vitest";

import { seedMetricCatalogue } from "@/data/metric-catalogue";
import { publicMetricsFor } from "@/data/metrics";
import type { Dataset, Metric } from "@/data/schema";
import {
  breakdownScale,
  buildFunctionAreaView,
  buildFunctionView,
  formatCompact,
  formatFigure,
  metricSpan,
  rowScale,
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

  it("orders a tab from single figures to grids", () => {
    for (const area of view.areas) {
      const order = area.shown.map((shown) => shown.shape);
      const rank = { scalar: 0, range: 1, breakdown: 2, grid: 3 } as const;
      const ranks = order.map((shape) => rank[shape]);
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

  it("gives a grid the full measure and everything else half", () => {
    expect(metricSpan("grid")).toBe("full");
    expect(metricSpan("scalar")).toBe("half");
    expect(metricSpan("range")).toBe("half");
    expect(metricSpan("breakdown")).toBe("half");
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

  it("resolves a number grid and scales each cell against its own row", () => {
    const shown = find(view, "fin-tier-cost-spread");
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
                : shown.grid.kind === "numbers"
                  ? shown.grid.rows.flatMap((row) => row.cells.map((cell) => cell.figure))
                  : shown.grid.rows.flatMap((row) => row.cells.map((cell) => cell.rating));
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
