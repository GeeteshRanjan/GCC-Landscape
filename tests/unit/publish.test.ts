import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { DATASET_VERSION, type Dataset, type Metric } from "@/data/schema";
import { serializeDataset } from "@/data/store";

/**
 * The publish pipeline, end to end but on a temporary file rather than the real
 * dataset. Order is the thing under test: validate, then read the current state
 * from the store the write will land on, then diff, then write. A validation
 * failure must never reach the store, and a no-op must never produce a commit.
 *
 * `GCC_DATASET_PATH` points the filesystem store at a scratch file, which is why
 * these can exercise the real write path without touching data/dataset.json.
 */

let scratch: string;
let datasetPath: string;

function dataset(overrides: Partial<Dataset> = {}): Dataset {
  return {
    version: DATASET_VERSION,
    generatedAt: "2026-08-01T00:00:00.000Z",
    source: "seed.xlsx",
    taxonomy: {
      industries: ["BFSI", "Retail"],
      revenueBands: ["< $100 Mn", "$1 Bn – $5 Bn"],
      cities: ["Bengaluru", "Pune"],
      hqCountries: ["USA"],
    },
    companies: [
      {
        id: "acme",
        name: "Acme",
        hqCountry: "USA",
        industry: "BFSI",
        revenueBand: "$1 Bn – $5 Bn",
        establishedYear: 2015,
        cities: ["Bengaluru"],
        fte: { min: 100, max: 500 },
        fortuneGlobal500: false,
        forbesGlobal2000: false,
      },
    ],
    metrics: [],
    ...overrides,
  };
}

async function loadPublish() {
  vi.resetModules();
  return import("@/lib/admin/publish");
}

function onDisk(): Dataset {
  return JSON.parse(readFileSync(datasetPath, "utf8")) as Dataset;
}

beforeEach(() => {
  scratch = mkdtempSync(path.join(tmpdir(), "gcc-publish-"));
  datasetPath = path.join(scratch, "dataset.json");
  writeFileSync(datasetPath, serializeDataset(dataset()), "utf8");

  vi.stubEnv("GCC_DATASET_PATH", datasetPath);
  vi.stubEnv("GCC_DATA_STORE", "fs");
});

afterEach(() => {
  rmSync(scratch, { recursive: true, force: true });
  vi.unstubAllEnvs();
});

describe("buildPreview", () => {
  it("reports what a publish would change, and writes nothing", async () => {
    const { buildPreview } = await loadPublish();
    const edited = dataset();
    edited.companies[0]!.establishedYear = 2013;

    const preview = await buildPreview({ dataset: edited });

    expect(preview.ok).toBe(true);
    if (!preview.ok) return;
    expect(preview.diff.counts.changed).toBe(1);
    expect(preview.target).toBe("fs");
    expect(preview.message).toContain("1 changed");
    // Untouched.
    expect(onDisk().companies[0]!.establishedYear).toBe(2015);
  });

  it("blocks an invalid dataset with per-row messages", async () => {
    const { buildPreview } = await loadPublish();
    const broken = dataset();
    broken.companies[0]!.establishedYear = 1200;

    const preview = await buildPreview({ dataset: broken });

    expect(preview.ok).toBe(false);
    if (preview.ok) return;
    expect(preview.status).toBe(422);
    expect(preview.issues?.join("\n")).toContain("companies.0.establishedYear");
  });

  it("blocks a taxonomy value removed while still in use", async () => {
    const { buildPreview } = await loadPublish();
    const orphaned = dataset();
    orphaned.taxonomy = { ...orphaned.taxonomy, industries: ["Retail"] };

    const preview = await buildPreview({ dataset: orphaned });

    expect(preview.ok).toBe(false);
    if (preview.ok) return;
    expect(preview.status).toBe(422);
    expect(preview.issues?.join("\n")).toContain("not in taxonomy.industries");
  });

  it("rejects a request with no dataset in it", async () => {
    const { buildPreview } = await loadPublish();
    for (const body of [null, {}, undefined, "a string"]) {
      const preview = await buildPreview(body);
      expect(preview.ok, JSON.stringify(body)).toBe(false);
      if (!preview.ok) expect(preview.status).toBe(400);
    }
  });

  it("stamps the publish time server-side, ignoring the browser's clock", async () => {
    const { buildPreview } = await loadPublish();
    const submitted = dataset({ generatedAt: "1999-01-01T00:00:00.000Z" });
    submitted.companies[0]!.name = "Acme Renamed";

    const preview = await buildPreview({ dataset: submitted });
    expect(preview.ok).toBe(true);
    if (!preview.ok) return;

    expect(preview.dataset.generatedAt).not.toBe("1999-01-01T00:00:00.000Z");
    expect(Date.parse(preview.dataset.generatedAt)).toBeGreaterThan(Date.now() - 60_000);
  });

  it("preserves the published source rather than letting admin rewrite provenance", async () => {
    const { buildPreview } = await loadPublish();
    const submitted = dataset({ source: "made-up.xlsx" });
    submitted.companies[0]!.name = "Acme Renamed";

    const preview = await buildPreview({ dataset: submitted });
    expect(preview.ok).toBe(true);
    if (!preview.ok) return;
    expect(preview.dataset.source).toBe("seed.xlsx");
  });

  it("pins the dataset version rather than trusting the submitted one", async () => {
    const { buildPreview } = await loadPublish();
    const submitted = dataset();
    submitted.companies[0]!.name = "Acme Renamed";

    const preview = await buildPreview({ dataset: submitted });
    expect(preview.ok && preview.dataset.version).toBe(DATASET_VERSION);
  });
});

describe("publishDataset", () => {
  it("writes the change and reports where it landed", async () => {
    const { publishDataset } = await loadPublish();
    const edited = dataset();
    edited.companies[0]!.establishedYear = 2013;

    const result = await publishDataset({ dataset: edited });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.target).toBe("fs");
    expect(result.location).toBe(datasetPath);
    expect(onDisk().companies[0]!.establishedYear).toBe(2013);
  });

  it("refuses a no-op instead of committing nothing", async () => {
    const { publishDataset } = await loadPublish();
    const before = readFileSync(datasetPath, "utf8");

    const result = await publishDataset({ dataset: dataset() });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(409);
    expect(result.error).toMatch(/nothing to publish/i);
    expect(readFileSync(datasetPath, "utf8")).toBe(before);
  });

  it("never lets an invalid dataset reach the file", async () => {
    const { publishDataset } = await loadPublish();
    const before = readFileSync(datasetPath, "utf8");
    const broken = dataset();
    broken.companies[0]!.cities = ["Atlantis"];

    const result = await publishDataset({ dataset: broken });

    expect(result.ok).toBe(false);
    expect(readFileSync(datasetPath, "utf8")).toBe(before);
  });

  it("returns the metadata the browser needs to reset its baseline", async () => {
    const { publishDataset } = await loadPublish();
    const edited = dataset();
    edited.companies[0]!.name = "Acme Renamed";

    const result = await publishDataset({ dataset: edited });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.metadata).toMatchObject({ version: DATASET_VERSION, source: "seed.xlsx" });
    // Must match what was actually written, or the browser's baseline diverges
    // and the next visit shows a spurious conflict.
    expect(result.metadata.generatedAt).toBe(onDisk().generatedAt);
  });

  it("writes bytes a reviewer can diff line by line", async () => {
    const { publishDataset } = await loadPublish();
    const edited = dataset();
    edited.companies[0]!.name = "Acme Renamed";
    await publishDataset({ dataset: edited });

    const raw = readFileSync(datasetPath, "utf8");
    expect(raw).toContain('\n  "companies": [');
    expect(raw.endsWith("}\n")).toBe(true);
  });

  it("publishes a taxonomy addition so it reaches the public dropdowns", async () => {
    const { publishDataset } = await loadPublish();
    const edited = dataset();
    edited.taxonomy = { ...edited.taxonomy, cities: ["Bengaluru", "Pune", "Kochi"] };

    const result = await publishDataset({ dataset: edited });
    expect(result.ok).toBe(true);
    expect(onDisk().taxonomy.cities).toContain("Kochi");
  });

  it("publishes a revenue band reorder, which a set diff would call a no-op", async () => {
    const { publishDataset } = await loadPublish();
    const edited = dataset();
    edited.taxonomy = {
      ...edited.taxonomy,
      revenueBands: ["$1 Bn – $5 Bn", "< $100 Mn"],
    };

    const result = await publishDataset({ dataset: edited });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.diff.taxonomy[0]?.reordered).toBe(true);
    expect(onDisk().taxonomy.revenueBands[0]).toBe("$1 Bn – $5 Bn");
  });
});

describe("publish target selection", () => {
  it("falls back to the filesystem in development when nothing is configured", async () => {
    vi.stubEnv("GCC_DATA_STORE", "");
    vi.stubEnv("NODE_ENV", "development");
    vi.resetModules();
    const { describePublishTarget } = await import("@/data/publish-store");

    const target = describePublishTarget();
    expect(target.ok).toBe(true);
    if (!target.ok) return;
    expect(target.target).toBe("fs");
  });

  /**
   * The important one. An unconfigured production write would report success and
   * be discarded on the next deploy, which is worse than refusing to start.
   */
  it("refuses to guess in production", async () => {
    vi.stubEnv("GCC_DATA_STORE", "");
    vi.stubEnv("NODE_ENV", "production");
    vi.resetModules();
    const { describePublishTarget } = await import("@/data/publish-store");

    const target = describePublishTarget();
    expect(target.ok).toBe(false);
    if (target.ok) return;
    expect(target.error).toMatch(/not configured/i);
    expect(target.error).toMatch(/discarded on the next deploy/i);
  });

  it("surfaces a partial GitHub configuration as unavailable, not as a fallback", async () => {
    vi.stubEnv("GCC_DATA_STORE", "github");
    vi.stubEnv("GCC_GITHUB_REPO", "ansr/gcc-landscape");
    vi.stubEnv("GCC_GITHUB_TOKEN", "");
    vi.resetModules();
    const { describePublishTarget } = await import("@/data/publish-store");

    const target = describePublishTarget();
    expect(target.ok).toBe(false);
    if (target.ok) return;
    // Silently writing to disk here would be the "wrong place" failure.
    expect(target.error).toMatch(/GCC_GITHUB_TOKEN/);
  });

  it("rejects an unrecognised store name", async () => {
    vi.stubEnv("GCC_DATA_STORE", "s3");
    vi.resetModules();
    const { describePublishTarget } = await import("@/data/publish-store");

    const target = describePublishTarget();
    expect(target.ok).toBe(false);
    if (!target.ok) expect(target.error).toMatch(/expected "github" or "fs"/);
  });

  it("blocks a publish when the target is misconfigured", async () => {
    vi.stubEnv("GCC_DATA_STORE", "github");
    vi.stubEnv("GCC_GITHUB_REPO", "");
    vi.stubEnv("GCC_GITHUB_TOKEN", "");
    const { publishDataset } = await loadPublish();

    const result = await publishDataset({ dataset: dataset() });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(500);
  });

  it("describes an fs target without git vocabulary", async () => {
    vi.resetModules();
    const { describePublishTarget } = await import("@/data/publish-store");
    const target = describePublishTarget();

    expect(target.ok).toBe(true);
    if (!target.ok) return;
    // The admin never sees a repository.
    for (const word of ["commit", "git", "repository", "branch", "sha"]) {
      expect(target.description.toLowerCase()).not.toContain(word);
    }
  });
});

describe("publishing function metrics", () => {
  const metric: Metric = {
    id: "tech-bench-strength",
    functionArea: "tech",
    lens: "supply",
    title: "Technology bench strength",
    question: "How many people with the skills we need are available today?",
    unit: "FTEs",
    format: "number",
    structure: { kind: "scalar" },
    value: null,
    gated: false,
  };

  it("treats entering a figure as something to publish, and writes it", async () => {
    writeFileSync(datasetPath, serializeDataset(dataset({ metrics: [metric] })), "utf8");
    const { publishDataset } = await loadPublish();

    const result = await publishDataset({
      dataset: dataset({
        metrics: [{ ...metric, value: { kind: "scalar", value: 900_000 } }],
      }),
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.diff.counts.metrics).toBe(1);
    expect(onDisk().metrics[0]?.value).toEqual({ kind: "scalar", value: 900_000 });
  });

  it("names the metric in the commit message", async () => {
    writeFileSync(datasetPath, serializeDataset(dataset({ metrics: [metric] })), "utf8");
    const { publishDataset } = await loadPublish();

    const result = await publishDataset({
      dataset: dataset({
        metrics: [{ ...metric, value: { kind: "scalar", value: 1 } }],
      }),
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.message).toContain("1 metric updated");
  });

  it("refuses a metric edit that does not validate, and writes nothing", async () => {
    const before = serializeDataset(dataset({ metrics: [metric] }));
    writeFileSync(datasetPath, before, "utf8");
    const { publishDataset } = await loadPublish();

    const result = await publishDataset({
      dataset: dataset({
        metrics: [
          // A breakdown shape with a scalar value: the exact mismatch the
          // structure-and-value split exists to catch.
          {
            ...metric,
            structure: { kind: "breakdown", entries: ["A", "B"] },
            value: { kind: "scalar", value: 5 },
          },
        ],
      }),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(422);
      expect(result.issues?.join(" ")).toContain("metrics.0");
    }
    expect(readFileSync(datasetPath, "utf8")).toBe(before);
  });

  it("refuses a currency unit, so no absolute money figure can be published", async () => {
    writeFileSync(datasetPath, serializeDataset(dataset({ metrics: [metric] })), "utf8");
    const { publishDataset } = await loadPublish();

    const result = await publishDataset({
      dataset: dataset({ metrics: [{ ...metric, unit: "USD per head" }] }),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(422);
  });

  it("reads a dataset written before the catalogue existed, and defaults it empty", async () => {
    // The key is defaulted rather than required precisely so this works — the fs
    // store refuses an unrecognised version, so bumping DATASET_VERSION would
    // have turned a backwards-compatible addition into a broken read.
    const legacy = JSON.parse(serializeDataset(dataset())) as Record<string, unknown>;
    delete legacy.metrics;
    writeFileSync(datasetPath, `${JSON.stringify(legacy, null, 2)}\n`, "utf8");

    const { buildPreview } = await loadPublish();
    const preview = await buildPreview({ dataset: dataset({ metrics: [metric] }) });

    expect(preview.ok).toBe(true);
    if (preview.ok) {
      expect(preview.diff.counts.metrics).toBe(1);
      expect(preview.diff.metrics.added.map((m) => m.id)).toEqual([metric.id]);
    }
  });

  it("still refuses a publish that only moves the timestamp", async () => {
    writeFileSync(datasetPath, serializeDataset(dataset({ metrics: [metric] })), "utf8");
    const { publishDataset } = await loadPublish();

    const result = await publishDataset({ dataset: dataset({ metrics: [metric] }) });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(409);
  });
});
