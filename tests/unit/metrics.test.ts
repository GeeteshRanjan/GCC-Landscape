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

  it("withholds the three markers that describe figures that are not there", () => {
    // `atLeast` qualifies a figure; `progression` and `subset` each say how a set of
    // them relate. None has anything to qualify once the values are gone, and a
    // placeholder needs only cardinality to be the right size.
    const marked = publicMetric({
      ...gated,
      atLeast: true,
      progression: true,
      subset: true,
    } as unknown as Metric) as unknown as Record<string, unknown>;
    expect("atLeast" in marked).toBe(false);
    expect("progression" in marked).toBe(false);
    expect("subset" in marked).toBe(false);
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

  it("holds no currency figure anywhere, in any field", () => {
    /**
     * The invariant, checked against the whole serialized catalogue rather than
     * field by field — including `note`, which is where a well-meaning
     * transcription of the source data would land.
     *
     * The supplied figures did contain per-head dollar amounts and per-square-foot
     * rupee rents. They are converted to indices where the source gave a base, and
     * omitted where it did not.
     */
    const serialized = JSON.stringify(METRIC_CATALOGUE);
    for (const token of [
      "USD",
      "INR",
      "₹",
      "€",
      "£",
      "lakh",
      "crore",
      "per sq ft",
    ]) {
      expect(serialized).not.toContain(token);
    }
    expect(serialized).not.toMatch(/\$\s?\d/);
  });

  it("is fully populated, and names every figure that is not a measurement", () => {
    /**
     * **Populated is not the same as measured, and this is where the difference is
     * recorded.** Five figures in the catalogue are provisional: the two cost-durability
     * placeholders at a round 10%, and the three cells filled from judgement (Vietnam's
     * capability column, `hr-fully-loaded-cost`'s grid, the depth row in
     * `fin-cost-vs-ecosystem-depth`). Each says so in its own note.
     *
     * Named rather than counted, for the same reason the gated set is recorded by id in
     * `verify-baseline.json`: a figure quietly promoted from provisional to fact would
     * otherwise read as a number going down by one, where here it reads as a change to
     * this list and has to be explained.
     */
    const seeded = seedMetricCatalogue();
    expect(seeded.filter((m) => !isMetricComplete(m))).toEqual([]);
    expect(
      seeded.filter((m) => /PLACEHOLDER/.test(m.note ?? "")).map((m) => m.id),
    ).toEqual(["fin-operating-cost-growth", "fin-workplace-cost-growth"]);
    // Every function area has something to render: an area with nothing at all is
    // dropped and leaves a missing tab.
    for (const area of METRIC_FUNCTIONS) {
      expect(publicMetricsFor(seeded, area).length, area).toBeGreaterThan(0);
    }
  });

  it("stamps nothing on the way out, so no caveat renders beside a figure", () => {
    /**
     * `asOf` used to default to "Sample, not for publication", which is a PUBLIC
     * field and rendered on every card. That default is gone: provenance is now
     * only ever something an admin typed, and the seed states none.
     */
    const seeded = seedMetricCatalogue();
    expect(seeded.filter((m) => m.asOf !== undefined)).toEqual([]);
    expect(JSON.stringify(seeded)).not.toMatch(/sample/i);
  });

  it("lets provenance an admin typed cross the gate untouched", () => {
    const dated: Metric = { ...(METRIC_CATALOGUE[0] as Metric), asOf: "2026 Q1" };
    const published = publicMetric(dated);
    expect(published.gated).toBe(false);
    if (!published.gated) expect(published.asOf).toBe("2026 Q1");
  });

  /**
   * The four tabs are four views of one national picture, not four datasets. Six
   * titles appear on more than one tab, and each must carry an identical figure,
   * question and shape — which the seed guarantees by authoring each one once.
   *
   * **Graduate output is back among them.** It was on operations alone for a pass, after
   * ANSR asked for the discipline split off the technology page and then off the HR page;
   * the HR view is restored, so the title is policed by this invariant again rather than
   * only by the next assertion. Technology still shows less than the shared metric
   * through `tech-graduate-pipeline`, which carries a different title on purpose.
   */
  it("gives a metric shown on several tabs one set of figures", () => {
    const byTitle = new Map<string, Metric[]>();
    for (const metric of METRIC_CATALOGUE) {
      byTitle.set(metric.title, [...(byTitle.get(metric.title) ?? []), metric]);
    }

    const shared = [...byTitle.entries()].filter(([, group]) => group.length > 1);
    expect(shared.map(([title]) => title).sort()).toEqual([
      "Bench strength",
      "Graduate output by discipline",
      "Leadership depth",
      "Time to backfill a role",
      "Time to first hire",
      "Time to reach each scale milestone",
    ]);

    for (const [title, group] of shared) {
      const content = group.map((metric) => {
        const { id: _id, functionArea: _functionArea, ...rest } = metric;
        return JSON.stringify(rest);
      });
      expect(new Set(content).size, title).toBe(1);
      // And they really are on different tabs, or the check above proves nothing.
      expect(new Set(group.map((m) => m.functionArea)).size, title).toBe(group.length);
    }
  });

  /**
   * **Graduate output is on two tabs and must stay one definition.**
   *
   * It was down to operations alone for a pass, and the note then was that inlining it as
   * an ordinary entry would be wrong twice — two of its parts are quoted verbatim by
   * `tech-graduate-pipeline`, and restoring a dropped view is one line while it is shared
   * and a rewrite once it is not. Restoring the HR view is what that second half was
   * protecting, and it cost one line.
   *
   * So this asserts the shape of the arrangement rather than a count: the ids are still
   * the `{tab}-` prefixed form `onTab` produces, in catalogue order, and the two figures
   * the technology pipeline reuses are still identical to the shared metric's own.
   */
  it("keeps graduate output authored once and shown on two tabs", () => {
    const views = METRIC_CATALOGUE.filter(
      (metric) => metric.title === "Graduate output by discipline",
    );
    expect(views.map((metric) => metric.id)).toEqual([
      "ops-graduate-output",
      "hr-graduate-output",
    ]);

    const shared = views[0];
    const pipeline = METRIC_CATALOGUE.find((m) => m.id === "tech-graduate-pipeline");
    expect(shared?.structure.kind).toBe("breakdown");
    expect(pipeline?.structure.kind).toBe("breakdown");
    if (
      shared?.structure.kind !== "breakdown" ||
      shared.value?.kind !== "breakdown" ||
      pipeline?.structure.kind !== "breakdown" ||
      pipeline.value?.kind !== "breakdown"
    ) {
      throw new Error("both metrics are breakdowns");
    }

    /**
     * Every FIGURE the pipeline holds is one of the shared metric's own.
     *
     * By figure rather than by label, deliberately: the two carry the same numbers under
     * slightly different names — "Management and MBA" against "Management and MBA
     * graduates" — because one sits in a nine-part disciplinary list and the other in a
     * two-part card that has to say what it is measuring on its own. The invariant is
     * that no figure on the technology tab is new, and that is what this asserts. A
     * label check would fail on a legitimate wording difference and pass on an edited
     * number, which is exactly backwards.
     */
    for (const [index, figure] of pipeline.value.values.entries()) {
      const label = pipeline.structure.entries[index] ?? String(index);
      expect(shared.value.values, label).toContain(figure);
    }
  });

  it("holds the figures the brief was revised to, as floors where they are floors", () => {
    const value = (id: string) => METRIC_CATALOGUE.find((m) => m.id === id);

    for (const id of ["tech-bench-strength", "ops-bench-strength", "hr-bench-strength"]) {
      const metric = value(id);
      expect(metric?.value, id).toEqual({ kind: "scalar", value: 8_700_000 });
      expect(metric?.atLeast, id).toBe(true);
    }
    expect(value("tech-manager-depth")?.value).toEqual({
      kind: "scalar",
      value: 1_400_000,
    });
    expect(value("tech-leadership-depth")?.value).toEqual({
      kind: "scalar",
      value: 800_000,
    });
    expect(value("tech-ecosystem-size")?.value).toEqual({
      kind: "breakdown",
      values: [1_700_000, 1_500_000, 1_400_000, 1_300_000, 1_200_000, 1_200_000, 150_000],
    });
    for (const id of ["ops-time-to-first-hire", "hr-time-to-first-hire"]) {
      expect(value(id)?.value, id).toEqual({ kind: "range", min: 7, max: 70 });
    }
    // One national figure, not a four-city split the visitor cannot act on.
    expect(value("hr-offer-acceptance")?.structure.kind).toBe("scalar");
    // India's own wage growth, without the US and UK comparison beside it.
    expect(value("fin-cost-growth")?.value).toEqual({ kind: "scalar", value: 9.8 });
    expect(value("fin-cost-growth")?.structure.kind).toBe("scalar");
  });

  it("has dropped the metrics the brief cut", () => {
    const ids = METRIC_CATALOGUE.map((m) => m.id);
    // Legal employer readiness: removed outright.
    expect(ids).not.toContain("hr-legal-readiness-days");
    // And nothing has quietly re-created it under a different id.
    expect(JSON.stringify(METRIC_CATALOGUE)).not.toMatch(/legal employer/i);
  });

  it("compares delivery locations by umbrella function, not by one role", () => {
    const metric = METRIC_CATALOGUE.find((m) => m.id === "fin-india-vs-hubs");
    expect(metric?.structure.kind).toBe("matrix");
    if (metric?.structure.kind !== "matrix") return;
    expect(metric.structure.rows).toEqual([
      "Technology",
      "Operations",
      "Human resources",
      "Finance",
    ]);
    expect(metric.structure.rows).not.toContain("Senior engineer");
  });

  it("refuses a floor marker on an ordinal, which has no \"or more\"", () => {
    const grid = METRIC_CATALOGUE.find((m) => m.id === "tech-capability-comparison");
    const parsed = metricSchema.safeParse({ ...grid, atLeast: true });
    expect(parsed.success).toBe(false);
  });

  it("only lets a progression sit on a breakdown of three or more waypoints", () => {
    const scalar = METRIC_CATALOGUE.find((m) => m.id === "tech-bench-strength");
    // A scalar has no parts to be a path through.
    expect(
      metricSchema.safeParse({ ...scalar, atLeast: undefined, progression: true })
        .success,
    ).toBe(false);
    // A grid is a comparison, not a sequence.
    const grid = METRIC_CATALOGUE.find((m) => m.id === "fin-tier-cost-spread");
    expect(metricSchema.safeParse({ ...grid, progression: true }).success).toBe(false);
    // Two points are a range, and there is a shape for that already.
    const pair = METRIC_CATALOGUE.find((m) => m.id === "ops-grade-a-office-stock");
    expect(metricSchema.safeParse({ ...pair, progression: true }).success).toBe(false);

    const curve = METRIC_CATALOGUE.find((m) => m.id === "ops-scale-milestones");
    expect(curve?.progression).toBe(true);
    expect(metricSchema.safeParse(curve).success).toBe(true);
  });

  it("only lets containment sit on exactly two parts that share a unit", () => {
    /**
     * **The flag exists because a shared unit could never establish containment**, and
     * the version that inferred it from one would have drawn a falsehood on the
     * technology tab: total management and MBA output nested inside engineering
     * graduates asserts that every MBA graduate holds an engineering degree.
     *
     * The unit is still required, as the precondition it always was — two quantities in
     * different kinds cannot be one inside the other. What is refused beyond that is a
     * claim a boolean cannot express: with three or more parts, which one contains which
     * is unstated, and a progression's waypoints are cumulative already.
     */
    const pair = METRIC_CATALOGUE.find((m) => m.id === "ops-grade-a-office-stock");
    expect(pair?.subset).toBe(true);
    expect(metricSchema.safeParse(pair).success).toBe(true);

    // Nine disciplines: which of them contains which is not expressible.
    const nine = METRIC_CATALOGUE.find((m) => m.id === "ops-graduate-output");
    expect(metricSchema.safeParse({ ...nine, subset: true }).success).toBe(false);
    // A scalar and a grid have no parts to contain one another.
    const scalar = METRIC_CATALOGUE.find((m) => m.id === "tech-bench-strength");
    expect(
      metricSchema.safeParse({ ...scalar, atLeast: undefined, subset: true }).success,
    ).toBe(false);
    const grid = METRIC_CATALOGUE.find((m) => m.id === "fin-tier-cost-spread");
    expect(metricSchema.safeParse({ ...grid, subset: true }).success).toBe(false);
    // Two parts with no shared unit: the meetup-groups-and-conferences case, which is
    // the defect the unit requirement was written for in the first place.
    expect(
      metricSchema.safeParse({ ...pair, unit: undefined, subset: true }).success,
    ).toBe(false);
    // A progression is cumulative, so containment says nothing.
    const curve = METRIC_CATALOGUE.find((m) => m.id === "ops-scale-milestones");
    expect(metricSchema.safeParse({ ...curve, subset: true }).success).toBe(false);
  });

  it("refuses a floor marker on a progression, whose intervals are differences", () => {
    // The difference between two floors is not itself a floor, so marking the
    // intervals would claim more than the data does — and leaving them unmarked
    // beside marked waypoints would put two kinds of figure in one chart.
    const curve = METRIC_CATALOGUE.find((m) => m.id === "hr-scale-milestones");
    expect(metricSchema.safeParse({ ...curve, atLeast: true }).success).toBe(false);
  });

  it("keeps every index readable by stating its base", () => {
    for (const entry of METRIC_CATALOGUE.filter((m) => m.format === "index")) {
      expect(entry.indexBaseline, entry.id).toBeTruthy();
      expect(entry.indexBaseline, entry.id).toMatch(/100/);
    }
  });

  it("rates every comparator the grid offers, from its own scale", () => {
    const grid = METRIC_CATALOGUE.find((m) => m.id === "tech-capability-comparison");
    expect(grid?.value?.kind).toBe("matrix");
    if (grid?.value?.kind === "matrix" && grid.structure.kind === "matrix") {
      const scale = new Set(grid.ratingScale);
      // A column offered but never rated renders as a hole in the grid, so the
      // schema's own scale is the only thing that may appear in a cell.
      for (const row of grid.value.cells) {
        expect(row).toHaveLength(grid.structure.columns.length);
        for (const cell of row) expect(scale.has(cell as string)).toBe(true);
      }
    }
    expect(isMetricComplete(grid as Metric)).toBe(true);
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
