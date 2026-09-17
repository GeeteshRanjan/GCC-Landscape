import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_SITE_CONTENT, DATASET_VERSION, type Dataset } from "@/data/schema";
import { DataStoreError, serializeDataset } from "@/data/store";
import {
  GitHubConfigError,
  createGitHubDataStore,
  readGitHubConfigFromEnv,
  type GitHubStoreConfig,
} from "@/data/store/github-store";

/**
 * The GitHub store cannot be tested against a real repository here, so it is
 * tested against a fake API that enforces the two properties that matter:
 *
 *   - the write is a genuine fast-forward, refusing when the branch moved;
 *   - reads use the `raw` media type, because the Contents API's JSON form
 *     returns an *empty* content field above 1 MB rather than an error, and the
 *     dataset is 700 KB and growing.
 *
 * The token-leak tests exist because every error path here builds a message from
 * a request that carried a credential.
 */

/**
 * Deliberately not shaped like a real credential. A `ghp_`-prefixed fixture trips
 * GitHub push protection and every secret scanner on the way past, and a scanner
 * that cries wolf over test data is a scanner people learn to ignore.
 */
const TOKEN = "fake-token-for-tests-do-not-scan-me";

function config(overrides: Partial<GitHubStoreConfig> = {}): GitHubStoreConfig {
  return {
    repo: "ansr/gcc-landscape",
    branch: "main",
    path: "data/dataset.json",
    token: TOKEN,
    ...overrides,
  };
}

function dataset(overrides: Partial<Dataset> = {}): Dataset {
  return {
    version: DATASET_VERSION,
    generatedAt: "2026-08-01T00:00:00.000Z",
    source: "seed.xlsx",
    taxonomy: {
      industries: ["BFSI"],
      revenueBands: ["$1 Bn – $5 Bn"],
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
        revenueBand: "$1 Bn – $5 Bn",
        establishedYear: 2015,
        cities: ["Bengaluru"],
        fte: { min: 100, max: 500 },
        fortuneGlobal500: false,
        forbesGlobal2000: false,
        businessTypes: [],
      },
    ],
    businessTypes: [],
    peerOverrides: [],
    metrics: [],
    siteContent: DEFAULT_SITE_CONTENT,
    ...overrides,
  };
}

interface Call {
  url: string;
  method: string;
  body: Record<string, unknown> | null;
  accept: string | null;
  authorization: string | null;
}

/**
 * A fake GitHub. Tracks the branch tip so the ref update can be checked for
 * being a real fast-forward rather than a formality.
 */
function fakeGitHub(options: {
  raw?: string;
  tipSha?: string;
  /** Simulates another publish landing between the read and the ref update. */
  moveBranchBeforePatch?: boolean;
  failures?: Record<string, { status: number; message?: string }>;
} = {}) {
  const calls: Call[] = [];
  let tip = options.tipSha ?? "a".repeat(40);
  const raw = options.raw ?? serializeDataset(dataset());

  const handler = vi.fn(async (input: string | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    const headers = (init?.headers ?? {}) as Record<string, string>;
    const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : null;
    calls.push({
      url,
      method,
      body,
      accept: headers.Accept ?? null,
      authorization: headers.Authorization ?? null,
    });

    const json = (payload: unknown, status = 200) =>
      new Response(JSON.stringify(payload), {
        status,
        headers: { "Content-Type": "application/json" },
      });

    for (const [fragment, failure] of Object.entries(options.failures ?? {})) {
      if (url.includes(fragment) || method === fragment) {
        return json({ message: failure.message ?? "nope" }, failure.status);
      }
    }

    if (url.includes("/contents/") && method === "GET") {
      return new Response(raw, { status: 200, headers: { "Content-Type": "text/plain" } });
    }
    if (url.includes("/git/ref/heads/")) {
      return json({ object: { sha: tip } });
    }
    if (url.includes("/git/commits/") && method === "GET") {
      return json({ tree: { sha: "t".repeat(40) } });
    }
    if (url.includes("/git/blobs") && method === "POST") {
      return json({ sha: "b".repeat(40) });
    }
    if (url.includes("/git/trees") && method === "POST") {
      return json({ sha: "n".repeat(40) });
    }
    if (url.includes("/git/commits") && method === "POST") {
      return json({ sha: "c".repeat(40) });
    }
    if (url.includes("/git/refs/heads/") && method === "PATCH") {
      const parents = calls.find((c) => c.url.includes("/git/commits") && c.method === "POST")
        ?.body?.parents as string[] | undefined;
      if (options.moveBranchBeforePatch) tip = "z".repeat(40);
      if (parents?.[0] !== tip) {
        return json({ message: "Update is not a fast forward" }, 422);
      }
      tip = String(body?.sha);
      return json({ object: { sha: tip } });
    }
    return json({ message: `unexpected ${method} ${url}` }, 500);
  });

  vi.stubGlobal("fetch", handler);
  return { calls, handler, get tip() { return tip; } };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("readGitHubConfigFromEnv", () => {
  beforeEach(() => {
    vi.stubEnv("GCC_GITHUB_REPO", "");
    vi.stubEnv("GCC_GITHUB_TOKEN", "");
  });

  it("refuses a partial configuration rather than filling in a default", () => {
    expect(() => readGitHubConfigFromEnv()).toThrow(GitHubConfigError);

    vi.stubEnv("GCC_GITHUB_REPO", "ansr/gcc-landscape");
    expect(() => readGitHubConfigFromEnv()).toThrow(/GCC_GITHUB_TOKEN/);

    vi.stubEnv("GCC_GITHUB_REPO", "");
    vi.stubEnv("GCC_GITHUB_TOKEN", TOKEN);
    expect(() => readGitHubConfigFromEnv()).toThrow(/GCC_GITHUB_REPO/);
  });

  it("rejects a repo that is not owner/name", () => {
    vi.stubEnv("GCC_GITHUB_TOKEN", TOKEN);
    for (const repo of ["justaname", "too/many/parts", "owner/", "/name"]) {
      vi.stubEnv("GCC_GITHUB_REPO", repo);
      expect(() => readGitHubConfigFromEnv(), repo).toThrow(GitHubConfigError);
    }
  });

  it("defaults the branch and path, and reads the optional author", () => {
    vi.stubEnv("GCC_GITHUB_REPO", "ansr/gcc-landscape");
    vi.stubEnv("GCC_GITHUB_TOKEN", TOKEN);
    expect(readGitHubConfigFromEnv()).toMatchObject({
      branch: "main",
      path: "data/dataset.json",
      authorName: undefined,
    });

    vi.stubEnv("GCC_GITHUB_BRANCH", "production");
    vi.stubEnv("GCC_GITHUB_AUTHOR_NAME", "GCC Admin");
    vi.stubEnv("GCC_GITHUB_AUTHOR_EMAIL", "admin@example.com");
    expect(readGitHubConfigFromEnv()).toMatchObject({
      branch: "production",
      authorName: "GCC Admin",
      authorEmail: "admin@example.com",
    });
  });
});

describe("read", () => {
  it("asks for the raw media type, not the size-limited JSON form", async () => {
    const api = fakeGitHub();
    await createGitHubDataStore(config()).read();

    const read = api.calls.find((c) => c.url.includes("/contents/"));
    expect(read?.accept).toBe("application/vnd.github.raw");
    expect(read?.url).toContain("ref=main");
  });

  it("reads a payload far larger than the Contents API JSON limit", async () => {
    // The exact failure the raw media type avoids: the JSON form returns an
    // empty `content` above 1 MB instead of an error.
    const big = dataset({
      companies: Array.from({ length: 4_000 }, (_, i) => ({
        ...dataset().companies[0]!,
        id: `row-${i}`,
        name: `Company number ${i} with a deliberately long name to pad the payload`,
      })),
    });
    const raw = serializeDataset(big);
    expect(raw.length).toBeGreaterThan(1_000_000);

    fakeGitHub({ raw });
    const loaded = await createGitHubDataStore(config()).read();
    expect(loaded.companies).toHaveLength(4_000);
  });

  it("rejects a dataset that fails the schema rather than serving it", async () => {
    const broken = JSON.parse(serializeDataset(dataset())) as Dataset;
    broken.companies[0]!.industry = "Not In Taxonomy";
    fakeGitHub({ raw: JSON.stringify(broken) });

    await expect(createGitHubDataStore(config()).read()).rejects.toThrow(
      /failed schema validation/,
    );
  });

  it("rejects a version mismatch", async () => {
    fakeGitHub({ raw: serializeDataset(dataset({ version: DATASET_VERSION + 1 })) });
    await expect(createGitHubDataStore(config()).read()).rejects.toThrow(/dataset version/);
  });

  it("reports malformed JSON without dumping the file", async () => {
    fakeGitHub({ raw: "{ not json" });
    await expect(createGitHubDataStore(config()).read()).rejects.toThrow(/not valid JSON/);
  });
});

describe("write", () => {
  it("walks the Git Data API in order and moves the branch", async () => {
    const api = fakeGitHub();
    const result = await createGitHubDataStore(config()).write(dataset(), {
      message: "data: publish from admin",
    });

    const sequence = api.calls
      .filter((c) => !c.url.includes("/contents/"))
      .map((c) => `${c.method} ${c.url.split("/repos/ansr/gcc-landscape")[1]}`);

    expect(sequence).toEqual([
      "GET /git/ref/heads/main",
      `GET /git/commits/${"a".repeat(40)}`,
      "POST /git/blobs",
      "POST /git/trees",
      "POST /git/commits",
      "PATCH /git/refs/heads/main",
    ]);
    expect(result.kind).toBe("github");
    expect(result.location).toContain("ansr/gcc-landscape@");
  });

  it("bases the new tree on the parent, so other files are not dropped", async () => {
    const api = fakeGitHub();
    await createGitHubDataStore(config()).write(dataset(), { message: "m" });

    const tree = api.calls.find((c) => c.url.includes("/git/trees"));
    expect(tree?.body?.base_tree).toBe("t".repeat(40));
    expect(tree?.body?.tree).toEqual([
      { path: "data/dataset.json", mode: "100644", type: "blob", sha: "b".repeat(40) },
    ]);
  });

  it("commits the same bytes the filesystem store would write", async () => {
    const api = fakeGitHub();
    const payload = dataset();
    await createGitHubDataStore(config()).write(payload, { message: "m" });

    const blob = api.calls.find((c) => c.url.includes("/git/blobs"));
    const committed = Buffer.from(String(blob?.body?.content), "base64").toString("utf8");
    // Byte-identical, or a publish through one store shows up as a whole-file
    // rewrite in the other's diff.
    expect(committed).toBe(serializeDataset(payload));
    expect(committed.endsWith("}\n")).toBe(true);
  });

  it("sends the commit message and does not force the ref", async () => {
    const api = fakeGitHub();
    await createGitHubDataStore(config()).write(dataset(), { message: "data: publish X" });

    expect(api.calls.find((c) => c.url.endsWith("/git/commits"))?.body?.message).toBe(
      "data: publish X",
    );
    expect(api.calls.find((c) => c.method === "PATCH")?.body?.force).toBe(false);
  });

  it("refuses when the branch moved underneath, and leaves the tip alone", async () => {
    const api = fakeGitHub({ moveBranchBeforePatch: true });

    await expect(
      createGitHubDataStore(config()).write(dataset(), { message: "m" }),
    ).rejects.toThrow(/branch moved while publishing/i);

    // The blob, tree and commit are unreferenced and get garbage collected, so
    // a rejection leaves no partial state.
    expect(api.tip).toBe("z".repeat(40));
  });

  it("validates before making any request at all", async () => {
    const api = fakeGitHub();
    const broken = dataset();
    broken.companies[0]!.establishedYear = 1200;

    await expect(
      createGitHubDataStore(config()).write(broken, { message: "m" }),
    ).rejects.toThrow(DataStoreError);
    expect(api.handler).not.toHaveBeenCalled();
  });

  it("omits the author block when only one half is configured", async () => {
    const api = fakeGitHub();
    await createGitHubDataStore(config({ authorName: "Someone" })).write(dataset(), {
      message: "m",
    });
    expect(api.calls.find((c) => c.url.endsWith("/git/commits"))?.body?.author).toBeUndefined();
  });

  it("includes the author when both halves are configured", async () => {
    const api = fakeGitHub();
    await createGitHubDataStore(
      config({ authorName: "GCC Admin", authorEmail: "admin@example.com" }),
    ).write(dataset(), { message: "m" });

    expect(api.calls.find((c) => c.url.endsWith("/git/commits"))?.body?.author).toEqual({
      name: "GCC Admin",
      email: "admin@example.com",
    });
  });
});

describe("error handling", () => {
  it("maps status codes to something an admin can act on", async () => {
    const cases: ReadonlyArray<[number, RegExp]> = [
      [401, /token/i],
      [403, /token/i],
      [404, /repo, branch/i],
      [422, /branch moved/i],
      [429, /rate limiting|unavailable/i],
      [503, /rate limiting|unavailable/i],
    ];

    for (const [status, pattern] of cases) {
      fakeGitHub({ failures: { "/contents/": { status } } });
      await expect(
        createGitHubDataStore(config()).read(),
        `status ${status}`,
      ).rejects.toThrow(pattern);
    }
  });

  it("reports a network failure as nothing having been written", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed");
      }),
    );
    await expect(
      createGitHubDataStore(config()).write(dataset(), { message: "m" }),
    ).rejects.toThrow(/Nothing was written/);
  });

  /**
   * Every error message above is built from a request that carried a bearer
   * token, and these messages are surfaced to the admin UI.
   */
  it("never puts the token in an error message", async () => {
    const surfaces: string[] = [];

    for (const status of [401, 403, 404, 422, 500]) {
      fakeGitHub({ failures: { "/contents/": { status, message: `boom ${TOKEN}` } } });
      await createGitHubDataStore(config())
        .read()
        .catch((error: unknown) => {
          surfaces.push(error instanceof Error ? `${error.message}${error.stack ?? ""}` : String(error));
        });
    }

    fakeGitHub({ failures: { PATCH: { status: 422 } } });
    await createGitHubDataStore(config())
      .write(dataset(), { message: "m" })
      .catch((error: unknown) => {
        surfaces.push(error instanceof Error ? error.message : String(error));
      });

    expect(surfaces.length).toBeGreaterThan(0);
    for (const surface of surfaces) {
      expect(surface).not.toContain(TOKEN);
      expect(surface).not.toContain("Bearer");
    }
  });

  it("does send the token as a bearer credential, so the omission above is real", async () => {
    const api = fakeGitHub();
    await createGitHubDataStore(config()).read();
    expect(api.calls[0]?.authorization).toBe(`Bearer ${TOKEN}`);
  });
});
