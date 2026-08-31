import { describe, expect, it } from "vitest";

import { getDataset } from "@/data/dataset";
import { fteMidpoint } from "@/data/derive";
import { publicMetricsFor } from "@/data/metrics";
import { businessTypesForIndustry, buildPeerView, type PeerViewInput } from "@/data/screen1";
import {
  anchorColumnFor,
  breakdownDisplay,
  breakdownScale,
  buildFunctionAreaView,
  metricWidth,
  SUBJECT_COLUMN,
  type FunctionAreaView,
  type ShownMetric,
} from "@/data/screen2";
import type { Company, Dataset, Metric } from "@/data/schema";
import { formatCount } from "@/components/public/primitives";
import { signals } from "@/components/screen1/copy";

/**
 * **Every chart follows its data.** That is the claim this file exists to prove, and
 * it is a claim about the whole render path rather than about any one function.
 *
 * The property is stated as an experiment rather than as an assertion about the
 * shipped numbers: take the published dataset, change one company row or one metric
 * value, rebuild the view model, and require the specific thing a chart draws to
 * move. A figure that is hardcoded at render time, a chart chosen by metric ID
 * rather than by its values, or a bar scaled against a constant would all survive
 * every existing test in `screen1.test.ts` and `screen2.test.ts` — both of which read
 * the published data and assert what it currently says. Neither can tell a figure
 * that came from the dataset from one that happens to agree with it.
 *
 * **A VIEW-MODEL test, deliberately, and it could not be a DOM test.** The unit suite
 * is the node environment with no jsdom and resolves the `react-server` condition, so
 * any module that transitively reaches `createContext` throws on IMPORT — see the file
 * comment in `public-copy.test.ts`. What licenses testing here instead of in a browser
 * is the project's own rule that which chart draws a metric is a property of the DATA,
 * decided in `screen2.ts` and never in a component: `metric-card.tsx` draws what it is
 * handed, and every figure it is handed is already a formatted string. So the seam
 * asserted below is the same one the components consume, and the browser suite covers
 * the markup.
 *
 * **Assertions are on the FORMATTED string, not on the raw number**, because the
 * string is what renders. A test that read `value.value` would pass while
 * `formatFigure` dropped a suffix or rounded to fit.
 *
 * The one invariant these tests must not weaken is the gate. It is asserted last, by
 * writing a canary into every gated metric and requiring that no edit to the dataset
 * can put it on the wire.
 */

/* ==========================================================================
   Fixtures

   `getDataset()` caches and returns the SAME object to every caller, so a test
   that mutated it in place would silently change what every later test reads.
   Everything below clones first, and nothing here writes to the shared copy.
   ========================================================================== */

async function published(): Promise<Dataset> {
  return structuredClone(await getDataset());
}

/** The published metrics with one of them edited. Never the shared array. */
function withMetric(
  metrics: readonly Metric[],
  id: string,
  edit: (metric: Metric) => void,
): Metric[] {
  const next = structuredClone(metrics) as Metric[];
  const target = next.find((metric) => metric.id === id);
  if (!target) throw new Error(`no metric ${id} in the published dataset`);
  edit(target);
  return next;
}

function setBreakdown(metric: Metric, values: number[]): void {
  if (metric.structure.kind !== "breakdown") {
    throw new Error(`${metric.id} is not a breakdown`);
  }
  if (values.length !== metric.structure.entries.length) {
    throw new Error(`${metric.id} has ${metric.structure.entries.length} parts`);
  }
  metric.value = { kind: "breakdown", values };
}

/**
 * One metric as its tab actually draws it.
 *
 * Deliberately read out of `figures` and `cards` rather than out of `shown`: those
 * two are what the components are handed, and a scalar that stopped being lifted
 * into the figure row would be a real change this helper should notice.
 */
function drawn(metrics: readonly Metric[], id: string): ShownMetric {
  const metric = metrics.find((entry) => entry.id === id);
  if (!metric) throw new Error(`no metric ${id} in the published dataset`);
  const view = viewFor(metrics, id);
  const inRow = view.figures.find((shown) => shown.metric.id === id);
  const inGrid = view.cards.find((card) => card.shown.metric.id === id)?.shown;
  const hit = inRow ?? inGrid;
  if (!hit) throw new Error(`${id} is not drawn on the ${metric.functionArea} tab`);
  return hit;
}

/** The whole tab a metric belongs to, through the gate, as the screen builds it. */
function viewFor(metrics: readonly Metric[], id: string): FunctionAreaView {
  const metric = metrics.find((entry) => entry.id === id);
  if (!metric) throw new Error(`no metric ${id} in the published dataset`);
  const area = metric.functionArea;
  return buildFunctionAreaView(publicMetricsFor(metrics, area), area);
}

function partsOf(shown: ShownMetric): string[] {
  if (shown.shape !== "breakdown") throw new Error("expected a breakdown");
  return shown.parts.map((part) => part.figure);
}

function displayOf(shown: ShownMetric): string {
  if (shown.shape !== "breakdown") throw new Error("expected a breakdown");
  return shown.display;
}

/* ==========================================================================
   Screen 2 — a figure moves when its value moves, in all four structures
   ========================================================================== */

describe("a Screen 2 figure is the dataset's own", () => {
  it("re-formats a scalar when the stored number changes", async () => {
    const metrics = (await published()).metrics;
    const before = drawn(metrics, "tech-bench-strength");
    if (before.shape !== "scalar") throw new Error("expected a scalar");

    const after = drawn(
      withMetric(metrics, "tech-bench-strength", (metric) => {
        metric.value = { kind: "scalar", value: 9_100_000 };
      }),
      "tech-bench-strength",
    );
    if (after.shape !== "scalar") throw new Error("expected a scalar");

    expect(after.figure).not.toBe(before.figure);
    // The floor marker is part of the definition, so it survives the edit — and the
    // abbreviation is exact to two decimals or not at all.
    expect(after.figure).toBe("9.1M+");

    // A value the millions abbreviation cannot express exactly keeps its digits,
    // which is the no-quiet-approximation rule reaching the string that renders.
    const awkward = drawn(
      withMetric(metrics, "tech-bench-strength", (metric) => {
        metric.value = { kind: "scalar", value: 8_712_345 };
      }),
      "tech-bench-strength",
    );
    if (awkward.shape !== "scalar") throw new Error("expected a scalar");
    expect(awkward.figure).toBe("8,712,345+");
  });

  it("re-formats both ends of a range, and moves where the band starts", async () => {
    const metrics = (await published()).metrics;
    const before = drawn(metrics, "hr-time-to-first-hire");
    if (before.shape !== "range") throw new Error("expected a range");

    const after = drawn(
      withMetric(metrics, "hr-time-to-first-hire", (metric) => {
        metric.value = { kind: "range", min: 14, max: 84 };
      }),
      "hr-time-to-first-hire",
    );
    if (after.shape !== "range") throw new Error("expected a range");

    expect([after.low, after.high]).toEqual(["14", "84"]);
    expect([after.low, after.high]).not.toEqual([before.low, before.high]);
    // The rail has no absolute scale, so what it shows is how wide the spread is
    // relative to its own upper end. Both ends moved, so the offset moved with them.
    expect(after.offset).toBeCloseTo(14 / 84, 10);
    expect(after.offset).not.toBeCloseTo(before.offset, 6);
    // The end labels belong to the definition and are untouched by a value edit.
    expect(after.lowLabel).toBe(before.lowLabel);
    expect(after.highLabel).toBe(before.highLabel);
  });

  it("re-formats a breakdown part and re-scales its bar", async () => {
    const metrics = (await published()).metrics;
    const before = drawn(metrics, "fin-cost-composition");
    if (before.shape !== "breakdown") throw new Error("expected a breakdown");
    expect(before.display).toBe("stack");

    // Still a whole, so the chart does not change — only the figures and the bars.
    const after = drawn(
      withMetric(metrics, "fin-cost-composition", (metric) => {
        setBreakdown(metric, [60, 24, 8, 8]);
      }),
      "fin-cost-composition",
    );
    if (after.shape !== "breakdown") throw new Error("expected a breakdown");

    expect(partsOf(after)).toEqual(["60%", "24%", "8%", "8%"]);
    expect(partsOf(after)).not.toEqual(partsOf(before));
    expect(after.display).toBe("stack");
    // A stacked whole scales to 100, so a segment's share is its own percentage.
    expect(after.parts[0]?.share).toBeCloseTo(0.6, 10);
    expect(after.parts[1]?.share).toBeCloseTo(0.24, 10);
    // Authored order, untouched by the edit.
    expect(after.parts.map((part) => part.label)).toEqual(
      before.parts.map((part) => part.label),
    );
  });

  it("re-formats a matrix cell and re-scales the axis the whole grid shares", async () => {
    const metrics = (await published()).metrics;
    const before = drawn(metrics, "fin-india-vs-hubs");
    if (before.shape !== "grid" || before.grid.kind !== "lollipop") {
      throw new Error("expected a lollipop grid");
    }

    // The last cell of the last row. Raised above every other cell in the grid, so
    // it becomes the axis — which is the property that makes the rows comparable.
    const rowIndex = before.grid.rows.length - 1;
    const columnIndex = before.grid.columns.length - 1;
    const after = drawn(
      withMetric(metrics, "fin-india-vs-hubs", (metric) => {
        if (metric.value?.kind !== "matrix") throw new Error("expected a matrix");
        const row = metric.value.cells[rowIndex];
        if (!row) throw new Error("expected a row");
        row[columnIndex] = 500;
      }),
      "fin-india-vs-hubs",
    );
    if (after.shape !== "grid" || after.grid.kind !== "lollipop") {
      throw new Error("expected a lollipop grid");
    }

    const edited = after.grid.rows[rowIndex]?.cells[columnIndex];
    expect(edited?.figure).toBe("500");
    expect(edited?.share).toBeCloseTo(1, 10);
    // One cell edit moved the axis every row is drawn against, so the base's own
    // position moved with it. The base column is still identical in every row.
    expect(after.grid.baselineShare).toBeCloseTo(100 / 500, 10);
    expect(after.grid.baselineShare).toBeLessThan(before.grid.baselineShare);
    // An untouched cell keeps its figure and loses length, which is what a shared
    // axis means: the number is the datum, the bar is a comparison.
    const untouched = { row: 0, column: columnIndex };
    const beforeCell = before.grid.rows[untouched.row]?.cells[untouched.column];
    const afterCell = after.grid.rows[untouched.row]?.cells[untouched.column];
    expect(afterCell?.figure).toBe(beforeCell?.figure);
    expect(afterCell?.share).toBeLessThan(beforeCell?.share ?? 0);
  });

  it("re-reads a rated cell's ordinal, and its step in the metric's own scale", async () => {
    const metrics = (await published()).metrics;
    const before = drawn(metrics, "tech-capability-comparison");
    if (before.shape !== "grid" || before.grid.kind !== "ratings") {
      throw new Error("expected a ratings grid");
    }
    const scale = before.grid.steps;
    const weakest = scale[0];
    if (weakest === undefined) throw new Error("expected a rating scale");

    const after = drawn(
      withMetric(metrics, "tech-capability-comparison", (metric) => {
        if (metric.value?.kind !== "matrix") throw new Error("expected a matrix");
        const row = metric.value.cells[0];
        if (!row) throw new Error("expected a row");
        row[0] = weakest;
      }),
      "tech-capability-comparison",
    );
    if (after.shape !== "grid" || after.grid.kind !== "ratings") {
      throw new Error("expected a ratings grid");
    }

    const cell = after.grid.rows[0]?.cells[0];
    expect(cell?.rating).toBe(weakest);
    // 1-based position in the metric's own scale, which is what the segments draw.
    expect(cell?.step).toBe(1);
    expect(cell?.rating).not.toBe(before.grid.rows[0]?.cells[0]?.rating);
  });

  it("drops the whole card when a rated cell stops being on the scale", async () => {
    // Not a value edit so much as a demonstration that the ordinal is read from the
    // metric's own scale rather than accepted as text: an unrecognised word takes the
    // card off the screen instead of rendering a segment with no step.
    const metrics = (await published()).metrics;
    const edited = withMetric(metrics, "tech-capability-comparison", (metric) => {
      if (metric.value?.kind !== "matrix") throw new Error("expected a matrix");
      const row = metric.value.cells[0];
      if (!row) throw new Error("expected a row");
      row[0] = "World class";
    });

    expect(() => drawn(edited, "tech-capability-comparison")).toThrow();
    const view = viewFor(edited, "tech-capability-comparison");
    expect(view.shown.map((shown) => shown.metric.id)).not.toContain(
      "tech-capability-comparison",
    );
  });
});

/* ==========================================================================
   Screen 2 — which chart is drawn follows the values, not the id
   ========================================================================== */

describe("which chart draws a metric follows its values", () => {
  /**
   * One metric id, three sets of values, three charts.
   *
   * This is the assertion that a chart cannot be selected by ID. `ops-power-uptime`
   * is the clustered-percentages case in the published data; the same metric becomes
   * a stacked whole and then a bar chart on nothing but an edit to its figures.
   */
  it("re-routes one metric between three charts on its values alone", async () => {
    const metrics = (await published()).metrics;
    expect(displayOf(drawn(metrics, "ops-power-uptime"))).toBe("figures");

    const asWhole = withMetric(metrics, "ops-power-uptime", (metric) => {
      setBreakdown(metric, [60, 40]);
    });
    expect(displayOf(drawn(asWhole, "ops-power-uptime"))).toBe("stack");

    const asBars = withMetric(metrics, "ops-power-uptime", (metric) => {
      setBreakdown(metric, [42, 18]);
    });
    expect(displayOf(drawn(asBars, "ops-power-uptime"))).toBe("bars");

    // And the rule itself, at the function, so the boundary is pinned rather than
    // inferred from whichever values the catalogue happens to hold.
    expect(breakdownDisplay("percent", [99.95, 99.5])).toBe("figures");
    expect(breakdownDisplay("percent", [60, 40])).toBe("stack");
    expect(breakdownDisplay("percent", [42, 18])).toBe("bars");
  });

  it("stops drawing a stacked whole the moment the parts stop being one", async () => {
    const metrics = (await published()).metrics;
    expect(displayOf(drawn(metrics, "fin-cost-composition"))).toBe("stack");

    // 96, not 100. A part-to-whole claim the data no longer supports is not drawn as
    // one — and the width falls out of that, so the layout moves with the figures.
    const short = withMetric(metrics, "fin-cost-composition", (metric) => {
      setBreakdown(metric, [72, 12, 8, 4]);
    });
    expect(displayOf(drawn(short, "fin-cost-composition"))).toBe("bars");

    // The width a card ASKS for, not the width it is packed to: a lone trailing half
    // is widened to fill its row, which is a property of the whole tab rather than of
    // this metric's values.
    expect(metricWidth(drawn(metrics, "fin-cost-composition"))).toBe("full");
    expect(metricWidth(drawn(short, "fin-cost-composition"))).toBe("half");
  });

  it("stops drawing a progression as one path when its figures stop rising", async () => {
    const metrics = (await published()).metrics;
    const before = drawn(metrics, "ops-scale-milestones");
    expect(displayOf(before)).toBe("journey");
    if (before.shape !== "breakdown") throw new Error("expected a breakdown");
    expect(before.legs).toBeDefined();

    // The authored claim is unchanged; only a waypoint moved below its predecessor.
    // A staircase draws each leg from where the last one ended, so this falls back to
    // bars — the wrong picture of the claim rather than a false one.
    const dipped = withMetric(metrics, "ops-scale-milestones", (metric) => {
      setBreakdown(metric, [6, 12, 9, 36]);
    });
    const after = drawn(dipped, "ops-scale-milestones");
    if (after.shape !== "breakdown") throw new Error("expected a breakdown");
    expect(after.display).toBe("bars");
    expect(after.metric.progression).toBe(true);
    // Present exactly when the display is a journey, so nothing stale is left for a
    // component to reach for.
    expect(after.legs).toBeUndefined();
  });

  it("re-derives a progression's legs from the stored waypoints", async () => {
    const metrics = (await published()).metrics;
    const raised = withMetric(metrics, "ops-scale-milestones", (metric) => {
      setBreakdown(metric, [6, 12, 24, 48]);
    });
    const shown = drawn(raised, "ops-scale-milestones");
    if (shown.shape !== "breakdown") throw new Error("expected a breakdown");
    const legs = shown.legs;
    if (!legs) throw new Error("expected legs");

    expect(legs.map((leg) => leg.figure)).toEqual(["6", "12", "24", "48"]);
    // The intervals are differences, so moving the last waypoint moves the last leg's
    // interval and every share behind it.
    expect(legs.map((leg) => leg.interval)).toEqual([undefined, "+6", "+12", "+24"]);
    expect(legs[2]?.share).toBeCloseTo(24 / 48, 10);
    expect(legs[legs.length - 1]?.share).toBeCloseTo(1, 10);
  });

  it("flips selfLabelling when a bar set stops being non-increasing", async () => {
    const metrics = (await published()).metrics;
    const before = drawn(metrics, "tech-ecosystem-size");
    if (before.shape !== "breakdown") throw new Error("expected a breakdown");
    // Descending, so row one is the longest bar and carries the axis in text. That is
    // what licenses dropping the grey track.
    expect(before.selfLabelling).toBe(true);

    const scrambled = withMetric(metrics, "tech-ecosystem-size", (metric) => {
      if (metric.value?.kind !== "breakdown") throw new Error("expected a breakdown");
      const values = metric.value.values.map((n) => n ?? 0);
      const last = values.length - 1;
      // The smallest specialism raised above the largest: the set no longer states
      // its own axis in row one, so the track has to come back.
      values[last] = (values[0] ?? 0) + 100_000;
      metric.value = { kind: "breakdown", values };
    });
    const after = drawn(scrambled, "tech-ecosystem-size");
    if (after.shape !== "breakdown") throw new Error("expected a breakdown");
    expect(after.selfLabelling).toBe(false);
    // Nothing else moved: the order is never re-sorted by value.
    expect(after.parts.map((part) => part.label)).toEqual(
      before.parts.map((part) => part.label),
    );
    // And the longest bar is now the last row, which is exactly why the axis is no
    // longer stated by the first one.
    expect(after.parts[after.parts.length - 1]?.share).toBeCloseTo(1, 10);
  });
});

/* ==========================================================================
   Screen 2 — what a bar is a share of
   ========================================================================== */

describe("a bar's scale is a property of the data", () => {
  it("scales a percentage to 100 only where the parts are the whole", () => {
    // A stacked bar lays its segments end to end, so the shares have to sum to one.
    expect(breakdownScale("percent", [72, 12, 8, 8], "stack")).toBe(100);
    // A RATE is not a share of anything. Against a 100% axis the salary ranking drew
    // five slivers in a fifth of the track, with four fifths of the card given to a
    // region no value can reach.
    expect(breakdownScale("percent", [21.1, 20, 16.1, 9.8, 7.5], "bars")).toBe(21.1);
    // Counts, durations and indices have no natural ceiling either way.
    expect(breakdownScale("number", [1_700_000, 150_000])).toBe(1_700_000);
  });

  it("re-scales a rate's bars against whatever its own largest part becomes", async () => {
    const metrics = (await published()).metrics;
    const before = drawn(metrics, "hr-salary-growth");
    if (before.shape !== "breakdown") throw new Error("expected a breakdown");
    expect(before.display).toBe("bars");
    // The largest part fills the track, because the track IS the largest part.
    expect(Math.max(...before.parts.map((part) => part.share))).toBeCloseTo(1, 10);

    const raised = withMetric(metrics, "hr-salary-growth", (metric) => {
      if (metric.value?.kind !== "breakdown") throw new Error("expected a breakdown");
      const values = metric.value.values.map((n) => n ?? 0);
      values[0] = 30;
      metric.value = { kind: "breakdown", values };
    });
    const after = drawn(raised, "hr-salary-growth");
    if (after.shape !== "breakdown") throw new Error("expected a breakdown");

    expect(after.parts[0]?.figure).toBe("30%");
    expect(after.parts[0]?.share).toBeCloseTo(1, 10);
    // Every other bar shortened by exactly the ratio the axis moved, which is the
    // check that the scale is read from the values rather than fixed.
    const second = after.parts[1];
    if (!second) throw new Error("expected a second part");
    expect(second.share).toBeCloseTo(20 / 30, 10);
    expect(second.share).toBeLessThan(before.parts[1]?.share ?? 1);
  });

  it("keeps a stacked whole's segments summing to the track", async () => {
    const metrics = (await published()).metrics;
    for (const values of [
      [72, 12, 8, 8],
      [55, 25, 12, 8],
      [40, 30, 20, 10],
    ]) {
      const shown = drawn(
        withMetric(metrics, "fin-cost-composition", (metric) => {
          setBreakdown(metric, values);
        }),
        "fin-cost-composition",
      );
      if (shown.shape !== "breakdown") throw new Error("expected a breakdown");
      expect(shown.display).toBe("stack");
      const total = shown.parts.reduce((sum, part) => sum + part.share, 0);
      expect(total).toBeCloseTo(1, 10);
    }
  });
});

/* ==========================================================================
   Screen 2 — the anchor column, and the floor marker
   ========================================================================== */

describe("a grid's anchor is derived, and degrades rather than throwing", () => {
  it("prefers the subject column, then the column identical in every row", () => {
    // The subject wins even where it varies: the tool is about India, and a grid with
    // an India column is comparing India with alternatives.
    expect(
      anchorColumnFor(
        ["Philippines", SUBJECT_COLUMN, "Poland"],
        [
          [122, 100, 189],
          [115, 104, 171],
        ],
      ),
    ).toBe(SUBJECT_COLUMN);
    // Failing that, an index base IS the column that is the same in every row.
    expect(
      anchorColumnFor(
        ["Tier 1 cities", "Tier 2 cities"],
        [
          [100, 75],
          [100, 85],
        ],
      ),
    ).toBe("Tier 1 cities");
    // And nothing is invented where neither rule fires.
    expect(
      anchorColumnFor(
        ["Alpha", "Beta"],
        [
          [1, 2],
          [3, 4],
        ],
      ),
    ).toBeUndefined();
    expect(anchorColumnFor(["Alpha", "Beta"], [])).toBeUndefined();
  });

  it("keeps an index base through a rename, because it is read from the cells", async () => {
    const metrics = (await published()).metrics;
    const before = drawn(metrics, "fin-india-vs-hubs");
    if (before.shape !== "grid" || before.grid.kind !== "lollipop") {
      throw new Error("expected a lollipop grid");
    }
    expect(before.grid.baselineColumn).toBe(SUBJECT_COLUMN);

    // The visitor's subject renamed, and the base survives under its new name — the
    // rule is "identical in every row", not a string this code holds.
    const renamed = drawn(
      withMetric(metrics, "fin-india-vs-hubs", (metric) => {
        if (metric.structure.kind !== "matrix") throw new Error("expected a matrix");
        metric.structure.columns[0] = "Bengaluru";
      }),
      "fin-india-vs-hubs",
    );
    if (renamed.shape !== "grid" || renamed.grid.kind !== "lollipop") {
      throw new Error("expected a lollipop grid");
    }
    expect(renamed.grid.baselineColumn).toBe("Bengaluru");
    expect(renamed.grid.baselineShare).toBeCloseTo(before.grid.baselineShare, 10);
  });

  it("loses the anchor without throwing when no column can be one", async () => {
    const metrics = (await published()).metrics;
    const anchorless = drawn(
      withMetric(metrics, "fin-india-vs-hubs", (metric) => {
        if (metric.structure.kind !== "matrix") throw new Error("expected a matrix");
        if (metric.value?.kind !== "matrix") throw new Error("expected a matrix");
        metric.structure.columns[0] = "Bengaluru";
        // The base column no longer identical in every row, so there is nothing left
        // for either rule to find.
        const row = metric.value.cells[0];
        if (!row) throw new Error("expected a row");
        row[0] = 105;
      }),
      "fin-india-vs-hubs",
    );
    if (anchorless.shape !== "grid" || anchorless.grid.kind !== "lollipop") {
      throw new Error("expected a lollipop grid");
    }

    // The chart still draws, every figure is still stated, and no cell claims to be
    // the base. Nothing throws and no figure moved.
    expect(anchorless.grid.baselineShare).toBe(0);
    expect(
      anchorless.grid.rows.every((row) => row.cells.every((cell) => !cell.anchor)),
    ).toBe(true);
    expect(anchorless.grid.rows[1]?.cells.map((cell) => cell.figure)).toEqual(
      ["100", "115", "148", "171", "312"],
    );
  });

  it("loses a rated grid's emphasised column when the subject is renamed", async () => {
    const metrics = (await published()).metrics;
    const before = drawn(metrics, "tech-capability-comparison");
    if (before.shape !== "grid" || before.grid.kind !== "ratings") {
      throw new Error("expected a ratings grid");
    }
    expect(before.grid.anchorColumn).toBe(SUBJECT_COLUMN);

    const renamed = drawn(
      withMetric(metrics, "tech-capability-comparison", (metric) => {
        if (metric.structure.kind !== "matrix") throw new Error("expected a matrix");
        metric.structure.columns[0] = "Bharat";
      }),
      "tech-capability-comparison",
    );
    if (renamed.shape !== "grid" || renamed.grid.kind !== "ratings") {
      throw new Error("expected a ratings grid");
    }

    /**
     * **The emphasis leaves the visitor's own subject, and this is the documented
     * cost of `SUBJECT_COLUMN` being a magic string.** Nothing throws and no rating
     * moves — but the identical-column rule then fires on the comparator that happens
     * to hold one value in every row, so the reader's eye is anchored to a rival on a
     * screen about India. `metric-editor.tsx` warns the admin before they save it.
     */
    expect(renamed.grid.anchorColumn).not.toBe(SUBJECT_COLUMN);
    expect(renamed.grid.anchorColumn).not.toBe("Bharat");
    expect(renamed.grid.rows.map((row) => row.cells.map((cell) => cell.rating))).toEqual(
      before.grid.rows.map((row) => row.cells.map((cell) => cell.rating)),
    );
  });
});

describe("the floor marker is a property of the definition", () => {
  it("puts a trailing + on every figure of a metric and on nothing else", async () => {
    const metrics = (await published()).metrics;

    // On: every part of a breakdown carries it, so a headline figure and its parts
    // cannot make two different claims about the same metric.
    const marked = drawn(metrics, "tech-ecosystem-size");
    expect(partsOf(marked).every((figure) => figure.endsWith("+"))).toBe(true);

    // Off: the numerals are untouched and every "+" is gone.
    const unmarked = drawn(
      withMetric(metrics, "tech-ecosystem-size", (metric) => {
        metric.atLeast = undefined;
      }),
      "tech-ecosystem-size",
    );
    expect(partsOf(unmarked)).toEqual(
      partsOf(marked).map((figure) => figure.replace(/\+$/, "")),
    );
    expect(partsOf(unmarked).some((figure) => figure.includes("+"))).toBe(false);

    // And a metric that never declared one gains it from the flag alone.
    const before = drawn(metrics, "tech-leadership-depth");
    if (before.shape !== "scalar") throw new Error("expected a scalar");
    expect(before.figure).not.toContain("+");
    const after = drawn(
      withMetric(metrics, "tech-leadership-depth", (metric) => {
        metric.atLeast = true;
      }),
      "tech-leadership-depth",
    );
    if (after.shape !== "scalar") throw new Error("expected a scalar");
    expect(after.figure).toBe(`${before.figure}+`);
  });

  it("marks a grid's cells and a dumbbell's ends, but never its delta", async () => {
    const metrics = (await published()).metrics;
    const marked = drawn(
      withMetric(metrics, "fin-tier-cost-spread", (metric) => {
        metric.atLeast = true;
      }),
      "fin-tier-cost-spread",
    );
    if (marked.shape !== "grid" || marked.grid.kind !== "dumbbell") {
      throw new Error("expected a dumbbell grid");
    }
    const row = marked.grid.rows[0];
    if (!row) throw new Error("expected a row");
    expect(row.from.figure.endsWith("+")).toBe(true);
    expect(row.to.figure.endsWith("+")).toBe(true);
    // The difference between two floors is not itself a floor, so the delta is
    // formatted without the marker.
    expect(row.delta).not.toContain("+2");
    expect(row.delta.endsWith("+")).toBe(false);
  });
});

/* ==========================================================================
   Screen 1 — every chart is built from the company rows
   ========================================================================== */

const CANARY_INDUSTRY = "Automotive";
/** Nobody above $10 Bn, so the largest panel has to walk down. */
const THIN_BAND_INDUSTRY = "Education";

function input(overrides: Partial<PeerViewInput> = {}): PeerViewInput {
  return {
    industry: CANARY_INDUSTRY,
    revenueBand: "Above $20 Bn",
    hqCountry: "USA",
    gccStatus: "evaluating",
    ...overrides,
  };
}

/**
 * A company row to add to a cloned dataset.
 *
 * Deliberately not `structuredClone` of a real one: every field a chart reads is
 * stated here, so a test that moves a figure names the datum it moved.
 */
function company(dataset: Dataset, overrides: Partial<Company> & { id: string }): Company {
  return {
    name: `Test ${overrides.id}`,
    hqCountry: "USA",
    industry: CANARY_INDUSTRY,
    revenueBand: dataset.taxonomy.revenueBands.at(-1) ?? "Above $20 Bn",
    establishedYear: 2020,
    cities: ["Bengaluru"],
    fte: { min: 100, max: 200 },
    fortuneGlobal500: false,
    forbesGlobal2000: false,
    // Untagged is a safe state — 38 companies in the published data are.
    businessTypes: [],
    ...overrides,
  };
}

function withCompanies(dataset: Dataset, added: readonly Company[]): Dataset {
  return { ...dataset, companies: [...dataset.companies, ...added] };
}

describe("Screen 1's charts are built from the company rows", () => {
  it("moves the containment layers when the industry gains a company", async () => {
    const dataset = await published();
    const before = buildPeerView(dataset, input());
    const after = buildPeerView(
      withCompanies(dataset, [company(dataset, { id: "canary-containment" })]),
      input(),
    );

    expect(after.industry.total).toBe(before.industry.total + 1);

    // The layers always sum to the total, which is what makes them nested
    // populations rather than a divided bar.
    const sum = (view: typeof before) =>
      view.industry.split.reduce((total, segment) => total + segment.count, 0);
    expect(sum(after)).toBe(after.industry.total);
    expect(sum(before)).toBe(before.industry.total);

    // The named peers are unchanged at five, so the layer around them absorbed the
    // new company and the innermost layer's share of the whole shrank.
    const lead = (view: typeof before) =>
      view.industry.split.find((segment) => segment.lead);
    expect(lead(after)?.count).toBe(lead(before)?.count);
    expect(lead(after)?.share).toBeLessThan(lead(before)?.share ?? 0);

    const beyond = (view: typeof before) =>
      view.industry.split.find((segment) => !segment.lead);
    expect(beyond(after)?.count).toBe((beyond(before)?.count ?? 0) + 1);
  });

  it("moves the middle layer when the sub-industry population moves", async () => {
    const dataset = await published();
    const type = businessTypesForIndustry(dataset, CANARY_INDUSTRY)[0];
    if (!type) throw new Error(`no sub-industry in ${CANARY_INDUSTRY}`);
    const answered = input({ businessTypeId: type.id });

    const before = buildPeerView(dataset, answered);
    // Carries the visitor's own sub-industry, so its similarity is 1 and it is well
    // clear of the floor — it joins the population the peers are drawn from.
    const after = buildPeerView(
      withCompanies(dataset, [
        company(dataset, { id: "canary-subindustry", businessTypes: [type.id] }),
      ]),
      answered,
    );

    expect(before.industry.businessType?.name).toBe(type.name);
    expect(after.industry.businessType?.count).toBe(
      (before.industry.businessType?.count ?? 0) + 1,
    );
    expect(after.industry.businessType?.exactTypeCount).toBe(
      (before.industry.businessType?.exactTypeCount ?? 0) + 1,
    );

    // Three layers, and the new company lands in the middle one rather than in the
    // outer: the industry grew by one and so did the comparable set.
    const middle = (view: typeof before) => view.industry.split[1];
    const outer = (view: typeof before) => view.industry.split[2];
    expect(middle(after)?.count).toBe((middle(before)?.count ?? 0) + 1);
    expect(outer(after)?.count).toBe(outer(before)?.count);
  });

  it("re-ranks the largest centres and re-scales their bars", async () => {
    const dataset = await published();
    const before = buildPeerView(dataset, input());
    const leader = before.largest.entries[0];
    if (!leader) throw new Error("expected a ranking");

    const colossus = company(dataset, {
      id: "canary-colossus",
      name: "Canary Colossus",
      fte: { min: 40_000, max: 44_000 },
    });
    const after = buildPeerView(withCompanies(dataset, [colossus]), input());

    // Top band, biggest centre, so it takes the first row — position IS the order on
    // this chart, so a new row cannot be appended.
    expect(after.largest.entries[0]?.company.id).toBe(colossus.id);
    expect(after.largest.entries[0]?.company.sizeShare).toBeCloseTo(1, 10);
    // The visible figure is the band, never the midpoint the bar is drawn from.
    expect(after.largest.entries[0]?.company.headcount).toBe("40,000–44,000");

    // Every other bar is now read against the new peak, which is the definition of
    // `sizeShare` — against the largest member of the set the card came back in.
    const demoted = after.largest.entries.find(
      (entry) => entry.company.id === leader.company.id,
    );
    expect(demoted?.company.sizeShare).toBeLessThan(leader.company.sizeShare);
    expect(demoted?.company.sizeShare).toBeCloseTo(
      fteMidpoint(leaderFte(dataset, leader.company.id)) / fteMidpoint(colossus.fte),
      10,
    );

    // Ordered by GCC size within the band walk, so the bars descend.
    const shares = after.largest.entries.map((entry) => entry.company.sizeShare);
    expect(shares).toEqual([...shares].sort((a, b) => b - a));
  });

  it("walks the largest panel down to the band the industry actually reaches", async () => {
    const dataset = await published();
    const thin = input({ industry: THIN_BAND_INDUSTRY, revenueBand: "$1 Bn – $5 Bn" });
    const before = buildPeerView(dataset, thin);
    const top = dataset.taxonomy.revenueBands.at(-1);
    if (top === undefined) throw new Error("expected a top band");

    // The published state: nobody in the top band, so the panel names the band it
    // reached rather than implying it found the top.
    expect(before.largest.topBand).not.toBe(top);
    expect(before.largest.belowTopBand).toBe(true);

    const after = buildPeerView(
      withCompanies(dataset, [
        company(dataset, {
          id: "canary-topband",
          industry: THIN_BAND_INDUSTRY,
          revenueBand: top,
          fte: { min: 5_000, max: 6_000 },
        }),
      ]),
      thin,
    );
    expect(after.largest.topBand).toBe(top);
    expect(after.largest.belowTopBand).toBe(false);
  });

  it("scales every sizeShare against the set the card came back in", async () => {
    const dataset = await published();
    const byId = new Map(dataset.companies.map((entry) => [entry.id, entry]));

    for (const industry of dataset.taxonomy.industries) {
      const view = buildPeerView(dataset, input({ industry }));
      for (const [set, cards] of [
        ["peers", view.peers.peers],
        ["largest", view.largest.entries.map((entry) => entry.company)],
      ] as const) {
        if (cards.length === 0) continue;
        const peak = Math.max(
          ...cards.map((card) => {
            const source = byId.get(card.id);
            if (!source) throw new Error(`${card.id} is not in the dataset`);
            return fteMidpoint(source.fte);
          }),
        );
        // The largest member of THIS set is at 1, whatever the other set holds and
        // whatever the industry's own upper end is.
        expect(
          Math.max(...cards.map((card) => card.sizeShare)),
          `${industry} / ${set}`,
        ).toBeCloseTo(1, 10);
        for (const card of cards) {
          const source = byId.get(card.id);
          if (!source) throw new Error(`${card.id} is not in the dataset`);
          expect(card.sizeShare, `${industry} / ${set} / ${card.name}`).toBeCloseTo(
            fteMidpoint(source.fte) / peak,
            10,
          );
        }
      }
    }
  });

  it("keeps the two Screen 1 sets on separate scales", async () => {
    // The peer cards say "these are comparable to you"; the largest panel says "this
    // is the upper end of the industry". One shared peak would flatten every peer bar
    // to a sliver whenever the industry contained a colossus the peer block does not
    // even show.
    const dataset = await published();
    const colossus = company(dataset, {
      id: "canary-two-scales",
      name: "Canary Two Scales",
      // Lowest band, so a visitor in the top band scores it at zero band proximity
      // and it sits at the back of the peer ordering.
      revenueBand: dataset.taxonomy.revenueBands[0] ?? "< $100 Mn",
      fte: { min: 60_000, max: 64_000 },
    });
    const view = buildPeerView(withCompanies(dataset, [colossus]), input());

    const shared = view.peers.peers.filter((peer) =>
      view.largest.entries.some((entry) => entry.company.id === peer.id),
    );
    expect(shared.length).toBeGreaterThan(0);
    for (const peer of shared) {
      const inLargest = view.largest.entries.find(
        (entry) => entry.company.id === peer.id,
      );
      // The same company, two cards, two scales — and the peer card's bar is the
      // longer of the two, being read against a set with no colossus in it.
      expect(inLargest?.company.sizeShare).toBeLessThan(peer.sizeShare);
    }
  });

  it("re-counts and re-orders the city density list", async () => {
    const dataset = await published();
    const before = buildPeerView(dataset, input());
    const leader = before.map.cities[0];
    const challenger = before.map.cities[1];
    if (!leader || !challenger) throw new Error("expected at least two cities");

    // Enough companies in the runner-up city to overtake the leader. Nothing about
    // this is hardcoded: the gap is read off the published counts.
    const needed = leader.companies - challenger.companies + 1;
    const added = Array.from({ length: needed }, (_, index) =>
      company(dataset, {
        id: `canary-city-${index}`,
        cities: [challenger.city],
      }),
    );
    const after = buildPeerView(withCompanies(dataset, added), input());

    const cityAfter = after.map.cities.find((entry) => entry.city === challenger.city);
    expect(cityAfter?.companies).toBe(challenger.companies + needed);
    expect(after.map.cities[0]?.city).toBe(challenger.city);
    // The peak is what the dots are sized against, so it moved with the leader.
    expect(after.map.peak).toBe(challenger.companies + needed);
    // Still sorted by count, which is what the ranked list beside the map reads.
    const counts = after.map.cities.map((entry) => entry.companies);
    expect(counts).toEqual([...counts].sort((a, b) => b - a));

    // A city the industry does not occupy yet is a new entry rather than a zero.
    const absent = dataset.taxonomy.cities.find(
      (city) => !before.map.cities.some((entry) => entry.city === city),
    );
    if (absent === undefined) throw new Error("expected an unoccupied city");
    const widened = buildPeerView(
      withCompanies(dataset, [
        company(dataset, { id: "canary-new-city", cities: [absent] }),
      ]),
      input(),
    );
    expect(widened.map.cities.length).toBe(before.map.cities.length + 1);
    expect(widened.map.cities.some((entry) => entry.city === absent)).toBe(true);
  });

  it("moves all four snapshot cells when the rows under them move", async () => {
    const dataset = await published();
    const before = signals(buildPeerView(dataset, input()));
    expect(before).toHaveLength(4);

    // 1 — the count of comparable centres is the industry's own population.
    const counted = signals(
      buildPeerView(
        withCompanies(dataset, [company(dataset, { id: "canary-snapshot-count" })]),
        input(),
      ),
    );
    expect(counted[0]?.value).not.toBe(before[0]?.value);
    expect(counted[0]?.label).toBe("GCCs in your industry");

    /**
     * The same cell reads the sub-industry population when one is answered — the
     * population the PEERS came from, so the cell and the cards below it agree.
     *
     * Its figure is asserted against that count rather than against the industry
     * branch's: in a fully tagged industry every company can be above the similarity
     * floor, so the two numbers legitimately coincide and "it changed" would be a
     * test of the seed data. What must hold is which field it reads, and that it
     * moves when that field's population does.
     */
    const type = businessTypesForIndustry(dataset, CANARY_INDUSTRY)[0];
    if (!type) throw new Error(`no sub-industry in ${CANARY_INDUSTRY}`);
    const answered = input({ businessTypeId: type.id });
    const narrowedView = buildPeerView(dataset, answered);
    const narrowed = signals(narrowedView);
    expect(narrowed[0]?.label).toBe("GCCs in your sub-industry");
    expect(narrowed[0]?.value).toBe(
      formatCount(narrowedView.industry.businessType?.count ?? -1),
    );
    const grown = signals(
      buildPeerView(
        withCompanies(dataset, [
          company(dataset, {
            id: "canary-snapshot-narrow",
            businessTypes: [type.id],
          }),
        ]),
        answered,
      ),
    );
    expect(grown[0]?.value).not.toBe(narrowed[0]?.value);

    // 2 — the mean of FTE band midpoints across the industry.
    const heavier = signals(
      buildPeerView(
        withCompanies(dataset, [
          company(dataset, {
            id: "canary-snapshot-mean",
            fte: { min: 240_000, max: 260_000 },
          }),
        ]),
        input(),
      ),
    );
    expect(heavier[1]?.value).not.toBe(before[1]?.value);

    // 3 — the spread of cities.
    const absent = dataset.taxonomy.cities.find(
      (city) =>
        !buildPeerView(dataset, input()).map.cities.some(
          (entry) => entry.city === city,
        ),
    );
    if (absent === undefined) throw new Error("expected an unoccupied city");
    const spread = signals(
      buildPeerView(
        withCompanies(dataset, [
          company(dataset, { id: "canary-snapshot-city", cities: [absent] }),
        ]),
        input(),
      ),
    );
    expect(spread[2]?.value).not.toBe(before[2]?.value);

    // 4 — the leading city, which is a name rather than a figure.
    const view = buildPeerView(dataset, input());
    const leader = view.map.cities[0];
    const challenger = view.map.cities[1];
    if (!leader || !challenger) throw new Error("expected at least two cities");
    const flipped = signals(
      buildPeerView(
        withCompanies(
          dataset,
          Array.from(
            { length: leader.companies - challenger.companies + 1 },
            (_, index) =>
              company(dataset, {
                id: `canary-snapshot-leader-${index}`,
                cities: [challenger.city],
              }),
          ),
        ),
        input(),
      ),
    );
    expect(before[3]?.value).toBe(leader.city);
    expect(flipped[3]?.value).toBe(challenger.city);
    expect(flipped[3]?.kind).toBe("place");
  });

  it("says so rather than estimating when a snapshot cell has no rows", async () => {
    const dataset = await published();
    // An industry in the taxonomy with no companies mapped to it: a real state after
    // an admin edit, and the cell must state nothing rather than draw a zero.
    const emptied: Dataset = {
      ...dataset,
      companies: dataset.companies.filter(
        (entry) => entry.industry !== CANARY_INDUSTRY,
      ),
    };
    const cells = signals(buildPeerView(emptied, input()));
    expect(cells).toHaveLength(4);
    expect(cells.map((cell) => cell.value)).toEqual([null, null, null, null]);
  });

  it("re-counts the terminating scale strip", async () => {
    const dataset = await published();
    const before = buildPeerView(dataset, input()).scale;

    // A 250,000-midpoint centre on both indices. The midpoint is a whole number of
    // ten thousands, so the rounding cannot absorb it.
    const after = buildPeerView(
      withCompanies(dataset, [
        company(dataset, {
          id: "canary-scale",
          fte: { min: 240_000, max: 260_000 },
          fortuneGlobal500: true,
          forbesGlobal2000: true,
        }),
      ]),
      input(),
    ).scale;

    expect(after.companyCount).toBe(before.companyCount + 1);
    expect(after.fortuneGlobal500Count).toBe(before.fortuneGlobal500Count + 1);
    expect(after.forbesGlobal2000Count).toBe(before.forbesGlobal2000Count + 1);
    expect(after.professionals).toBe(before.professionals + 250_000);
    expect(after.indexedProfessionals).toBe(before.indexedProfessionals + 250_000);
    // The denominators are the index sizes, so the shares move with the counts.
    expect(after.fortuneGlobal500Share).toBeCloseTo(
      after.fortuneGlobal500Count / 500,
      10,
    );
    expect(after.forbesGlobal2000Share).toBeCloseTo(
      after.forbesGlobal2000Count / 2000,
      10,
    );

    // The union is self-deduplicating because it filters the company list on an OR:
    // a company on one index only adds its people once.
    const oneIndex = buildPeerView(
      withCompanies(dataset, [
        company(dataset, {
          id: "canary-scale-one",
          fte: { min: 240_000, max: 260_000 },
          fortuneGlobal500: false,
          forbesGlobal2000: true,
        }),
      ]),
      input(),
    ).scale;
    expect(oneIndex.indexedProfessionals).toBe(before.indexedProfessionals + 250_000);
    expect(oneIndex.fortuneGlobal500Count).toBe(before.fortuneGlobal500Count);
  });

  it("states the dataset's own stamp as the strip's as-of", async () => {
    const dataset = await published();
    const stamped: Dataset = { ...dataset, generatedAt: "2027-01-31T00:00:00.000Z" };
    expect(buildPeerView(stamped, input()).scale.asOf).toBe("2027-01-31T00:00:00.000Z");
    expect(buildPeerView(dataset, input()).scale.asOf).toBe(dataset.generatedAt);
  });
});

/** The published FTE range of a company, by id. */
function leaderFte(dataset: Dataset, id: string): Company["fte"] {
  const found = dataset.companies.find((entry) => entry.id === id);
  if (!found) throw new Error(`${id} is not in the dataset`);
  return found.fte;
}

/* ==========================================================================
   The invariant these tests must not weaken
   ========================================================================== */

describe("no edit to the dataset can put a gated figure on the wire", () => {
  const CANARY = 987_654_321;

  function fillWithCanary(metric: Metric): void {
    switch (metric.structure.kind) {
      case "scalar":
        metric.value = { kind: "scalar", value: CANARY };
        return;
      case "range":
        metric.value = { kind: "range", min: CANARY, max: CANARY };
        return;
      case "breakdown":
        metric.value = {
          kind: "breakdown",
          values: metric.structure.entries.map(() => CANARY),
        };
        return;
      case "matrix":
        metric.value = {
          kind: "matrix",
          cells: metric.structure.rows.map(() =>
            (metric.structure.kind === "matrix" ? metric.structure.columns : []).map(
              () => CANARY,
            ),
          ),
        };
        return;
    }
  }

  it("keeps a gated value out of every tab however it is edited", async () => {
    const dataset = await published();
    const gated = dataset.metrics.filter((metric) => metric.gated);
    expect(gated.length).toBeGreaterThan(0);

    let metrics: Metric[] = structuredClone(dataset.metrics) as Metric[];
    for (const target of gated) {
      metrics = withMetric(metrics, target.id, fillWithCanary);
    }

    for (const area of ["tech", "operations", "hr", "finance"] as const) {
      const view = buildFunctionAreaView(publicMetricsFor(metrics, area), area);
      const serialized = JSON.stringify(view);
      // The number itself, and every string a formatter could have made of it.
      expect(serialized).not.toContain(String(CANARY));
      expect(serialized).not.toContain("987,654,321");

      for (const { metric } of view.held) {
        // Exactly the GatedMetric surface: a new key here is a new way to leak.
        expect(Object.keys(metric).sort()).toEqual(
          ["format", "functionArea", "gated", "id", "question", "shape", "title"].sort(),
        );
        expect(metric).not.toHaveProperty("value");
        expect(metric).not.toHaveProperty("structure");
      }

      // And nothing gated crossed into the drawn lists, where a value could travel.
      const drawnIds = [
        ...view.figures.map((shown) => shown.metric.id),
        ...view.cards.map((card) => card.shown.metric.id),
      ];
      for (const target of gated) expect(drawnIds).not.toContain(target.id);
    }
  });

  it("keeps a gated card's size but never its axes", async () => {
    const dataset = await published();
    const view = buildFunctionAreaView(publicMetricsFor(dataset.metrics, "hr"), "hr");
    const held = view.held.map((entry) => entry.metric);
    expect(held.length).toBeGreaterThan(0);

    for (const metric of held) {
      const source = dataset.metrics.find((entry) => entry.id === metric.id);
      if (!source) throw new Error(`${metric.id} is not in the dataset`);
      // Cardinality is all a placeholder gets, and it is enough to be the right size.
      if (source.structure.kind === "matrix" && metric.shape.kind === "matrix") {
        expect(metric.shape.rows).toBe(source.structure.rows.length);
        expect(metric.shape.columns).toBe(source.structure.columns.length);
        const serialized = JSON.stringify(view);
        for (const name of [...source.structure.rows, ...source.structure.columns]) {
          // Narrowed to the names that cannot appear legitimately elsewhere on the
          // tab: a substring test on "Engineering" would fail while the gate worked.
          if (["Senior manager", "Specialist"].includes(name)) {
            expect(serialized).not.toContain(name);
          }
        }
      }
      if (source.structure.kind === "breakdown" && metric.shape.kind === "breakdown") {
        expect(metric.shape.entries).toBe(source.structure.entries.length);
      }
    }
  });

  it("packs the held grid so no row is left part-empty", async () => {
    const dataset = await published();
    for (const area of ["tech", "operations", "hr", "finance"] as const) {
      const view = buildFunctionAreaView(publicMetricsFor(dataset.metrics, area), area);
      const halves = view.heldCards.filter((card) => card.width === "half").length;
      // An odd half cannot fill a row on its own, so it takes the whole measure.
      expect(halves % 2, area).toBe(0);
    }
  });
});
