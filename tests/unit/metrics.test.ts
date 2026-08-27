import { describe, expect, it } from "vitest";

import { METRIC_CATALOGUE, seedMetricCatalogue } from "@/data/metric-catalogue";
import {
  alignValue,
  emptyValueFor,
  groupMetrics,
  isMetricComplete,
  metricProgress,
  metricShape,
  publicMetric,
  publicMetricsFor,
} from "@/data/metrics";
import {
  METRIC_FUNCTIONS,
  METRIC_LENSES,
  metricSchema,
  type Metric,
} from "@/data/schema";

/**
 * The metric catalogue: the schema contract, the gate, and the alignment between
 * a metric's shape and its numbers.
 *
 * The gate tests are the ones that matter most. "A gated value never reaches the
 * browser" is an invariant in project.md, and `publicMetric` is the single place
 * it is enforced — so it is checked by walking the returned object rather than by
 * reading the type, because a type is not a test.
 */

function metric(overrides: Partial<Metric> = {}): Metric {
  return {
    id: "test-metric",
    functionArea: "tech",
    lens: "supply",
    title: "Bench strength",
    question: "How many people are available?",
    unit: "FTEs",
    format: "number",
    structure: { kind: "scalar" },
    value: { kind: "scalar", value: 1000 },
    gated: false,
    ...overrides,
  };
}

function issues(candidate: unknown): string[] {
  const parsed = metricSchema.safeParse(candidate);
  return parsed.success ? [] : parsed.error.issues.map((i) => i.message);
}

function paths(candidate: unknown): string[] {
  const parsed = metricSchema.safeParse(candidate);
  return parsed.success ? [] : parsed.error.issues.map((i) => i.path.join("."));
}

describe("metricSchema — money cannot be expressed", () => {
  it("has no currency format at all", () => {
    // The structural guarantee behind "no absolute per-head salary figures".
    // If a currency format is ever added, this test is the place that argues
    // against it.
    expect(issues(metric({ format: "currency" as never }))).not.toEqual([]);
  });

  it.each([
    "₹ per head",
    "$ per FTE",
    "USD per employee",
    "INR",
    "cost in lakhs",
    "crores a year",
    "dollars per head",
  ])("refuses a currency unit: %s", (unit) => {
    expect(paths(metric({ unit }))).toContain("unit");
  });

  it("allows a unit that is a noun rather than money", () => {
    for (const unit of ["FTEs", "days", "million sq ft", "graduates a year"]) {
      expect(issues(metric({ unit }))).toEqual([]);
    }
  });
});

describe("metricSchema — gated metrics", () => {
  it("refuses a figure in a gated metric's title or question", () => {
    // Both fields cross to the browser for a gated metric, so a number written
    // into them hands over exactly what the gate withholds.
    expect(
      paths(metric({ gated: true, title: "India is 40 percent cheaper" })),
    ).toContain("title");
    expect(
      paths(
        metric({
          gated: true,
          question: "Is the all-in cost 40% below the sending country?",
        }),
      ),
    ).toContain("question");
  });

  it("accepts a gated metric whose title and question describe the question", () => {
    expect(
      issues(
        metric({
          gated: true,
          title: "Fully loaded cost per role",
          question: "How does the all-in cost compare with the sending country?",
        }),
      ),
    ).toEqual([]);
  });

  it("does not apply the digit rule to an open metric", () => {
    expect(issues(metric({ title: "GCCs above 100 FTEs" }))).toEqual([]);
  });
});

describe("metricSchema — format rules", () => {
  it("requires a stated base for an index", () => {
    expect(paths(metric({ format: "index" }))).toContain("indexBaseline");
    expect(
      issues(metric({ format: "index", indexBaseline: "India = 100" })),
    ).toEqual([]);
  });

  it("refuses an index base on a metric that is not an index", () => {
    expect(paths(metric({ indexBaseline: "India = 100" }))).toContain(
      "indexBaseline",
    );
  });

  it("pairs ratingScale with the rating format, both ways", () => {
    expect(paths(metric({ ratingScale: ["Weak", "Strong"] }))).toContain(
      "ratingScale",
    );
    expect(
      paths(
        metric({
          format: "rating",
          structure: { kind: "matrix", rows: ["A"], columns: ["X", "Y"] },
          value: null,
        }),
      ),
    ).toContain("ratingScale");
  });

  it("only allows a rating inside a comparison grid", () => {
    expect(
      paths(
        metric({ format: "rating", ratingScale: ["Weak", "Strong"], value: null }),
      ),
    ).toContain("format");
  });

  it("bounds a percentage but allows a negative one, because growth can fall", () => {
    expect(
      issues(
        metric({
          format: "percent",
          unit: undefined,
          value: { kind: "scalar", value: -4 },
        }),
      ),
    ).toEqual([]);
    expect(
      paths(
        metric({
          format: "percent",
          unit: undefined,
          value: { kind: "scalar", value: 5000 },
        }),
      ),
    ).toContain("value.value");
  });
});

describe("metricSchema — shape and value must agree", () => {
  it("refuses a value of the wrong kind", () => {
    expect(
      paths(metric({ value: { kind: "range", min: 1, max: 2 } })),
    ).toContain("value.kind");
  });

  it("refuses a breakdown with the wrong number of slots", () => {
    expect(
      paths(
        metric({
          structure: { kind: "breakdown", entries: ["A", "B", "C"] },
          value: { kind: "breakdown", values: [1, 2] },
        }),
      ),
    ).toContain("value.values");
  });

  it("refuses a grid row with the wrong number of cells", () => {
    expect(
      paths(
        metric({
          structure: { kind: "matrix", rows: ["A", "B"], columns: ["X", "Y"] },
          value: { kind: "matrix", cells: [[1, 2], [3]] },
        }),
      ),
    ).toContain("value.cells.1");
  });

  it("refuses an inverted range", () => {
    expect(
      paths(
        metric({
          format: "duration",
          unit: "days",
          structure: { kind: "range" },
          value: { kind: "range", min: 30, max: 7 },
        }),
      ),
    ).toContain("value.max");
  });

  it("refuses text in a cell unless the metric is a rating", () => {
    expect(
      paths(
        metric({
          structure: { kind: "matrix", rows: ["A"], columns: ["X", "Y"] },
          value: { kind: "matrix", cells: [[1, "Strong"]] },
        }),
      ),
    ).toContain("value.cells.0.1");
  });

  it("refuses a rating outside its own scale", () => {
    expect(
      paths(
        metric({
          format: "rating",
          ratingScale: ["Weak", "Strong"],
          unit: undefined,
          structure: { kind: "matrix", rows: ["A"], columns: ["X", "Y"] },
          value: { kind: "matrix", cells: [["Strong", "Excellent"]] },
        }),
      ),
    ).toContain("value.cells.0.1");
  });

  it("refuses a repeated part or axis label", () => {
    expect(
      paths(metric({ structure: { kind: "breakdown", entries: ["A", "A"] }, value: null })),
    ).toContain("structure.entries");
    expect(
      paths(
        metric({
          structure: { kind: "matrix", rows: ["A"], columns: ["X", "X"] },
          value: null,
        }),
      ),
    ).toContain("structure.columns");
  });

  it("accepts a definition with no numbers yet", () => {
    // The catalogue ships this way. A metric with no value is a valid metric.
    expect(issues(metric({ value: null }))).toEqual([]);
  });
});

describe("publicMetric — the gate", () => {
  const gated = metric({
    id: "hr-fully-loaded",
    gated: true,
    title: "Fully loaded cost per role",
    question: "How does the all-in cost compare with the sending country?",
    format: "index",
    indexBaseline: "Sending country = 100",
    unit: undefined,
    note: "Internal working note",
    asOf: "2026 Q1",
    structure: { kind: "matrix", rows: ["Engineering", "Finance"], columns: ["Analyst", "Manager"] },
    value: { kind: "matrix", cells: [[62, 58], [55, 51]] },
  });

  it("carries no figure anywhere in the serialized output", () => {
    const serialized = JSON.stringify(publicMetric(gated));
    for (const figure of ["62", "58", "55", "51"]) {
      expect(serialized).not.toContain(figure);
    }
  });

  it("carries no value or structure field to put one in", () => {
    const published = publicMetric(gated) as unknown as Record<string, unknown>;
    expect("value" in published).toBe(false);
    expect("structure" in published).toBe(false);
  });

  it("withholds the row and column names too", () => {
    // A row label beside a visible axis can imply the answer, and the
    // placeholder does not need them to be the right size.
    const serialized = JSON.stringify(publicMetric(gated));
    for (const label of ["Engineering", "Finance", "Analyst", "Manager"]) {
      expect(serialized).not.toContain(label);
    }
  });

  it("keeps a shape the right size, so a placeholder can be drawn", () => {
    const published = publicMetric(gated);
    expect(published.gated).toBe(true);
    if (published.gated) {
      expect(published.shape).toEqual({ kind: "matrix", rows: 2, columns: 2 });
    }
  });

  it("withholds the index base and the as-of date as well", () => {
    const published = publicMetric(gated) as unknown as Record<string, unknown>;
    expect("indexBaseline" in published).toBe(false);
    expect("asOf" in published).toBe(false);
  });

  it("never carries the internal lens or note, gated or not", () => {
    for (const source of [gated, metric({ lens: "cost", note: "Internal note" })]) {
      const published = publicMetric(source) as unknown as Record<string, unknown>;
      expect("lens" in published).toBe(false);
      expect("note" in published).toBe(false);
      expect(JSON.stringify(published)).not.toContain("Internal");
    }
  });

  it("does carry the value for an open metric", () => {
    const published = publicMetric(metric());
    expect(published.gated).toBe(false);
    if (!published.gated) {
      expect(published.value).toEqual({ kind: "scalar", value: 1000 });
    }
  });

  it("drops an incomplete open metric from a function payload but keeps a gated one", () => {
    const payload = publicMetricsFor(
      [
        metric({ id: "done" }),
        metric({ id: "half", value: null }),
        metric({
          id: "locked",
          gated: true,
          title: "Cost position",
          question: "Does a cheaper city still carry the depth?",
          value: null,
        }),
      ],
      "tech",
    );
    expect(payload.map((m) => m.id)).toEqual(["done", "locked"]);
  });
});

describe("isMetricComplete", () => {
  it("needs every slot filled", () => {
    expect(isMetricComplete(metric())).toBe(true);
    expect(isMetricComplete(metric({ value: null }))).toBe(false);
    expect(
      isMetricComplete(
        metric({
          structure: { kind: "breakdown", entries: ["A", "B"] },
          value: { kind: "breakdown", values: [1, null] },
        }),
      ),
    ).toBe(false);
    expect(
      isMetricComplete(
        metric({
          structure: { kind: "breakdown", entries: ["A", "B"] },
          value: { kind: "breakdown", values: [1, 2] },
        }),
      ),
    ).toBe(true);
  });

  it("counts a zero as entered", () => {
    expect(
      isMetricComplete(
        metric({
          structure: { kind: "breakdown", entries: ["A", "B"] },
          value: { kind: "breakdown", values: [0, 0] },
        }),
      ),
    ).toBe(true);
  });
});

describe("alignValue — a shape change keeps the figures already typed", () => {
  it("keeps figures by position when a part is added", () => {
    expect(
      alignValue({ kind: "breakdown", entries: ["A", "B", "C"] }, {
        kind: "breakdown",
        values: [1, 2],
      }),
    ).toEqual({ kind: "breakdown", values: [1, 2, null] });
  });

  it("keeps figures when a part is renamed", () => {
    // Position is the only honest correspondence available.
    expect(
      alignValue({ kind: "breakdown", entries: ["Renamed", "B"] }, {
        kind: "breakdown",
        values: [1, 2],
      }),
    ).toEqual({ kind: "breakdown", values: [1, 2] });
  });

  it("truncates when a part is removed", () => {
    expect(
      alignValue({ kind: "breakdown", entries: ["A"] }, {
        kind: "breakdown",
        values: [1, 2],
      }),
    ).toEqual({ kind: "breakdown", values: [1] });
  });

  it("re-fits a grid in both directions at once", () => {
    expect(
      alignValue({ kind: "matrix", rows: ["A", "B", "C"], columns: ["X"] }, {
        kind: "matrix",
        cells: [
          [1, 2],
          [3, 4],
        ],
      }),
    ).toEqual({ kind: "matrix", cells: [[1], [3], [null]] });
  });

  it("discards a value of the wrong kind rather than coercing it", () => {
    expect(
      alignValue({ kind: "breakdown", entries: ["A", "B"] }, {
        kind: "scalar",
        value: 5,
      }),
    ).toEqual({ kind: "breakdown", values: [null, null] });
  });

  it("produces a schema-valid metric for every structure kind", () => {
    // The point of doing this in one place: the form cannot build a value the
    // publish gate then rejects for a length mismatch.
    const structures: Metric["structure"][] = [
      { kind: "scalar" },
      { kind: "range" },
      { kind: "breakdown", entries: ["A", "B", "C"] },
      { kind: "matrix", rows: ["R1", "R2"], columns: ["C1", "C2", "C3"] },
    ];
    for (const structure of structures) {
      // A value of the wrong kind is the worst case the form can hand over —
      // it happens the moment a metric's shape is changed under an entered value.
      const mismatched: Metric["value"] =
        structure.kind === "scalar"
          ? { kind: "breakdown", values: [1, 2] }
          : { kind: "scalar", value: 3 };
      const realigned = alignValue(structure, mismatched);
      expect(realigned).toEqual(emptyValueFor(structure));
      expect(issues(metric({ structure, value: realigned }))).toEqual([]);
      // And a value already the right size is returned untouched.
      const settled = alignValue(structure, realigned);
      expect(settled).toEqual(realigned);
    }
  });
});

describe("groupMetrics and metricProgress", () => {
  it("groups by function then lens, in the declared order", () => {
    const grouped = groupMetrics([
      metric({ id: "a", functionArea: "finance", lens: "cost" }),
      metric({ id: "b", functionArea: "tech", lens: "speed" }),
      metric({ id: "c", functionArea: "tech", lens: "supply" }),
    ]);
    expect(grouped.map((g) => g.functionArea)).toEqual(["tech", "finance"]);
    expect(grouped[0]?.groups.map((g) => g.lens)).toEqual(["supply", "speed"]);
  });

  it("drops empty lenses and empty function areas", () => {
    const grouped = groupMetrics([metric({ functionArea: "hr", lens: "cost" })]);
    expect(grouped).toHaveLength(1);
    expect(grouped[0]?.groups).toHaveLength(1);
  });

  it("counts complete, part-entered and empty separately", () => {
    const progress = metricProgress([
      metric({ id: "a" }),
      metric({ id: "b", value: null }),
      metric({
        id: "c",
        structure: { kind: "breakdown", entries: ["A", "B"] },
        value: { kind: "breakdown", values: [1, null] },
      }),
      metric({
        id: "d",
        gated: true,
        title: "Cost position",
        question: "Does a cheaper city carry the depth?",
        value: null,
      }),
    ]);
    expect(progress).toEqual({
      total: 4,
      complete: 1,
      partial: 1,
      empty: 2,
      gated: 1,
    });
  });
});

describe("the seeded catalogue", () => {
  it("every metric passes the schema the publish gate runs", () => {
    for (const entry of METRIC_CATALOGUE) {
      const parsed = metricSchema.safeParse(entry);
      expect(
        parsed.success ? [] : parsed.error.issues.map((i) => `${entry.id}: ${i.path.join(".")} ${i.message}`),
      ).toEqual([]);
    }
  });

  it("has unique ids", () => {
    const ids = METRIC_CATALOGUE.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("covers all four function areas", () => {
    const covered = new Set(METRIC_CATALOGUE.map((m) => m.functionArea));
    expect([...covered].sort()).toEqual([...METRIC_FUNCTIONS].sort());
  });

  it("uses only the four internal lenses", () => {
    for (const entry of METRIC_CATALOGUE) {
      expect(METRIC_LENSES).toContain(entry.lens);
    }
  });

  it("files Finance under cost alone, as the brief does", () => {
    const finance = METRIC_CATALOGUE.filter((m) => m.functionArea === "finance");
    expect(finance.length).toBeGreaterThan(0);
    expect(new Set(finance.map((m) => m.lens))).toEqual(new Set(["cost"]));
  });

  it("gates exactly the four metrics project.md names", () => {
    expect(METRIC_CATALOGUE.filter((m) => m.gated).map((m) => m.id).sort()).toEqual([
      "fin-cost-vs-ecosystem-depth",
      "fin-workplace-cost-gradient",
      "hr-cost-per-employee-served",
      "hr-fully-loaded-cost",
    ]);
  });

  it("carries no invented figures", () => {
    /**
     * None of the Screen 2 values have been supplied, so the seed must not
     * contain any — except the capability grid, whose cells are the worked
     * example in the brief and are ordinal ratings rather than measurements.
     */
    const withValues = METRIC_CATALOGUE.filter((m) => m.value !== null);
    expect(withValues.map((m) => m.id)).toEqual(["tech-capability-comparison"]);
  });

  it("leaves the comparator the brief names but does not rate unfilled", () => {
    const grid = METRIC_CATALOGUE.find((m) => m.id === "tech-capability-comparison");
    expect(grid?.value?.kind).toBe("matrix");
    if (grid?.value?.kind === "matrix") {
      // Vietnam is the fourth column; the brief lists it as a comparator but
      // rates only three, so every cell in that column is empty.
      expect(grid.value.cells.map((row) => row[3])).toEqual([
        null,
        null,
        null,
        null,
        null,
      ]);
    }
    expect(isMetricComplete(grid as Metric)).toBe(false);
  });

  it("hands back a fresh copy each time, so a caller cannot corrupt the seed", () => {
    const first = seedMetricCatalogue();
    const target = first[0];
    if (target) target.title = "Mutated";
    expect(seedMetricCatalogue()[0]?.title).not.toBe("Mutated");
    expect(METRIC_CATALOGUE[0]?.title).not.toBe("Mutated");
  });

  it("describes every metric's shape without reading its value", () => {
    for (const entry of METRIC_CATALOGUE) {
      const shape = metricShape(entry.structure);
      expect(shape.kind).toBe(entry.structure.kind);
    }
  });
});
