import {
  DATASET_VERSION,
  datasetSchema,
  formatIssues,
  type Dataset,
} from "../schema";
import {
  DataStoreError,
  serializeDataset,
  type DataStore,
  type WriteOptions,
  type WriteResult,
} from "../store";

/**
 * Commits data/dataset.json to GitHub.
 *
 * This is the production write path, and the only reason it exists: the dataset
 * is versioned JSON in the repo, so publishing means committing, and the commit
 * triggers the rebuild that makes the change live. Git then supplies version
 * history, diffs and rollback for free — the trade recorded in project.md.
 *
 * Reads and writes use different APIs, deliberately:
 *
 *   Read — the Contents API with the `raw` media type. The default JSON
 *   representation base64-encodes the file into the response and silently
 *   returns an empty `content` above 1 MB; `raw` streams the file itself and is
 *   good to 100 MB. The dataset is 700 KB and growing, so the JSON form was a
 *   ceiling waiting to be hit.
 *
 *   Write — the Git Data API: blob, tree, commit, then a non-forced ref update.
 *   Six calls where the Contents API needs one, which is irrelevant at roughly
 *   one publish a month, and it buys two things that matter. No size limit on
 *   the blob, and the ref update is a genuine fast-forward check against the
 *   parent commit read at the start of the write — so a branch that moved
 *   underneath is rejected by GitHub rather than silently overwritten.
 *
 * Deliberately not the Octokit SDK. This is `fetch` and JSON, and it must keep
 * working on a plain Node host with no host-specific anything.
 *
 * The token is never logged, never included in an error message, and never
 * returned to the client.
 */

const API_ROOT = "https://api.github.com";
const DEFAULT_BRANCH = "main";
const DEFAULT_PATH = "data/dataset.json";
/** Regular non-executable file. The only mode this store ever writes. */
const FILE_MODE = "100644";

export interface GitHubStoreConfig {
  /** `owner/name`. */
  repo: string;
  branch: string;
  path: string;
  token: string;
  /** Commit author. Optional; GitHub falls back to the token's own identity. */
  authorName?: string;
  authorEmail?: string;
}

export class GitHubConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GitHubConfigError";
  }
}

/**
 * Reads the config from the environment, refusing anything partial. A store that
 * half-works would write to the wrong place, so this throws rather than filling
 * in a default for a missing repo or token.
 */
export function readGitHubConfigFromEnv(): GitHubStoreConfig {
  const missing: string[] = [];
  const repo = process.env.GCC_GITHUB_REPO?.trim();
  const token = process.env.GCC_GITHUB_TOKEN?.trim();
  if (!repo) missing.push("GCC_GITHUB_REPO (owner/name)");
  if (!token) missing.push("GCC_GITHUB_TOKEN (a token with contents:write on that repo)");

  if (missing.length > 0) {
    throw new GitHubConfigError(
      `GCC_DATA_STORE=github but ${missing.join(" and ")} ${missing.length === 1 ? "is" : "are"} not set. Publishing is disabled until it is.`,
    );
  }
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo as string)) {
    throw new GitHubConfigError(
      `GCC_GITHUB_REPO must be "owner/name"; got "${repo as string}".`,
    );
  }

  return {
    repo: repo as string,
    token: token as string,
    branch: process.env.GCC_GITHUB_BRANCH?.trim() || DEFAULT_BRANCH,
    path: process.env.GCC_GITHUB_DATASET_PATH?.trim() || DEFAULT_PATH,
    authorName: process.env.GCC_GITHUB_AUTHOR_NAME?.trim() || undefined,
    authorEmail: process.env.GCC_GITHUB_AUTHOR_EMAIL?.trim() || undefined,
  };
}

export function createGitHubDataStore(config: GitHubStoreConfig): DataStore {
  const encodedPath = config.path.split("/").map(encodeURIComponent).join("/");
  const repoRoot = `${API_ROOT}/repos/${config.repo}`;
  const branchRef = `heads/${config.branch}`;

  const baseHeaders = (): Record<string, string> => ({
    Authorization: `Bearer ${config.token}`,
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "gcc-landscape-admin",
  });

  /**
   * Strips the token out of any text before it can reach an error message.
   *
   * GitHub's own error bodies do not normally echo a credential, so this is
   * belt and braces — but "does not normally" is not a property, and these
   * messages are rendered in the admin UI. A reverse proxy, a redirect, or a
   * misconfigured URL is enough to put the token in a response body, and the
   * failure mode is a secret on screen. Cheap to make unconditional.
   */
  function redact(text: string): string {
    return text.split(config.token).join("[redacted]");
  }

  /** Never includes the token, and never echoes a whole response body. */
  async function describeFailure(response: Response, what: string): Promise<string> {
    let detail = "";
    try {
      const body = (await response.json()) as { message?: string };
      if (body.message) detail = ` — ${redact(String(body.message))}`;
    } catch {
      // A non-JSON body carries nothing worth surfacing.
    }
    if (response.status === 401 || response.status === 403) {
      return `GitHub refused the request (${response.status})${detail}. Check that GCC_GITHUB_TOKEN is valid and has contents:write on ${config.repo}.`;
    }
    if (response.status === 404) {
      return `GitHub returned 404 for ${what}${detail}. Check the repo, branch and path, and that the token can see a private repo.`;
    }
    if (response.status === 409 || response.status === 422) {
      return `The branch moved while publishing (${response.status})${detail}. Nothing was written. Reload the diff and publish again.`;
    }
    if (response.status === 429 || response.status === 503) {
      return `GitHub is rate limiting or unavailable (${response.status})${detail}. Nothing was written. Try again shortly.`;
    }
    return `GitHub request for ${what} failed with ${response.status}${detail}.`;
  }

  async function call(
    url: string,
    what: string,
    init?: RequestInit & { accept?: string },
  ): Promise<Response> {
    const { accept, ...rest } = init ?? {};
    let response: Response;
    try {
      response = await fetch(url, {
        ...rest,
        headers: {
          ...baseHeaders(),
          Accept: accept ?? "application/vnd.github+json",
          ...(rest.body ? { "Content-Type": "application/json" } : {}),
          ...(rest.headers as Record<string, string> | undefined),
        },
        cache: "no-store",
      });
    } catch (cause) {
      throw new DataStoreError(
        `Could not reach the GitHub API (${what}). Publishing needs outbound network access. Nothing was written.`,
        { cause },
      );
    }
    if (!response.ok) throw new DataStoreError(await describeFailure(response, what));
    return response;
  }

  async function readRaw(): Promise<string> {
    // `raw` rather than the default JSON representation: the JSON form
    // base64-encodes the file into the response and returns empty content above
    // 1 MB. `raw` has no such limit below 100 MB.
    const response = await call(
      `${repoRoot}/contents/${encodedPath}?ref=${encodeURIComponent(config.branch)}`,
      `${config.repo}:${config.path} on ${config.branch}`,
      { accept: "application/vnd.github.raw" },
    );
    return response.text();
  }

  function parseAndValidate(raw: string, origin: string): Dataset {
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch (cause) {
      throw new DataStoreError(`${origin} is not valid JSON.`, { cause });
    }

    const result = datasetSchema.safeParse(json);
    if (!result.success) {
      throw new DataStoreError(
        `${origin} failed schema validation:\n${formatIssues(result.error)}`,
      );
    }
    if (result.data.version !== DATASET_VERSION) {
      throw new DataStoreError(
        `${origin} is dataset version ${result.data.version}; this build expects ${DATASET_VERSION}.`,
      );
    }
    return result.data;
  }

  return {
    kind: "github",

    async read(): Promise<Dataset> {
      return parseAndValidate(
        await readRaw(),
        `${config.repo}:${config.path}`,
      );
    },

    async write(dataset: Dataset, options: WriteOptions): Promise<WriteResult> {
      const result = datasetSchema.safeParse(dataset);
      if (!result.success) {
        throw new DataStoreError(
          `Refusing to commit an invalid dataset:\n${formatIssues(result.error)}`,
        );
      }

      // 1. The tip of the branch. Captured before anything is created, and used
      //    as the commit parent, so the ref update at the end is a real
      //    fast-forward check rather than a formality.
      const refResponse = await call(
        `${repoRoot}/git/ref/${branchRef}`,
        `branch ${config.branch}`,
      );
      const ref = (await refResponse.json()) as { object?: { sha?: string } };
      const parentSha = ref.object?.sha;
      if (!parentSha) {
        throw new DataStoreError(
          `GitHub returned no commit sha for branch ${config.branch}; refusing to write without a parent.`,
        );
      }

      // 2. That commit's tree, to use as the base so every other file is kept.
      const commitResponse = await call(
        `${repoRoot}/git/commits/${parentSha}`,
        `commit ${parentSha.slice(0, 8)}`,
      );
      const parentCommit = (await commitResponse.json()) as {
        tree?: { sha?: string };
      };
      const baseTreeSha = parentCommit.tree?.sha;
      if (!baseTreeSha) {
        throw new DataStoreError(
          "GitHub returned no base tree for the parent commit; refusing to write a tree that could drop files.",
        );
      }

      // 3. The blob. No size limit here, which is the point of this path.
      const blobResponse = await call(`${repoRoot}/git/blobs`, "new blob", {
        method: "POST",
        body: JSON.stringify({
          content: Buffer.from(serializeDataset(result.data), "utf8").toString("base64"),
          encoding: "base64",
        }),
      });
      const blob = (await blobResponse.json()) as { sha?: string };
      if (!blob.sha) {
        throw new DataStoreError("GitHub returned no sha for the new blob.");
      }

      // 4. A tree that is the parent's tree with one path replaced.
      const treeResponse = await call(`${repoRoot}/git/trees`, "new tree", {
        method: "POST",
        body: JSON.stringify({
          base_tree: baseTreeSha,
          tree: [
            { path: config.path, mode: FILE_MODE, type: "blob", sha: blob.sha },
          ],
        }),
      });
      const tree = (await treeResponse.json()) as { sha?: string };
      if (!tree.sha) {
        throw new DataStoreError("GitHub returned no sha for the new tree.");
      }

      // 5. The commit.
      const author =
        config.authorName && config.authorEmail
          ? { name: config.authorName, email: config.authorEmail }
          : undefined;
      const newCommitResponse = await call(`${repoRoot}/git/commits`, "new commit", {
        method: "POST",
        body: JSON.stringify({
          message: options.message,
          tree: tree.sha,
          parents: [parentSha],
          ...(author ? { author, committer: author } : {}),
        }),
      });
      const newCommit = (await newCommitResponse.json()) as { sha?: string };
      if (!newCommit.sha) {
        throw new DataStoreError("GitHub returned no sha for the new commit.");
      }

      // 6. Move the branch. `force: false` makes GitHub reject anything that is
      //    not a fast-forward from `parentSha`, which is exactly the conflict we
      //    want to hear about. Everything created above is unreferenced and gets
      //    garbage collected, so a rejection here leaves no partial state.
      await call(`${repoRoot}/git/refs/${branchRef}`, `branch ${config.branch}`, {
        method: "PATCH",
        body: JSON.stringify({ sha: newCommit.sha, force: false }),
      });

      return {
        kind: "github",
        location: `${config.repo}@${newCommit.sha.slice(0, 8)}`,
      };
    },
  };
}
