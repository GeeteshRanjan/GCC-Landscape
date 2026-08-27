import type { Dataset } from "./schema";

/**
 * The whole storage contract: read the published dataset, write a new one.
 *
 * Two things it is deliberately not. It is not a runtime datastore — publishing
 * is batched roughly monthly and sends the entire edited dataset as one commit,
 * so nothing is ever written field by field. And it is not host-specific: the
 * write path is one swappable module, which is what keeps ANSR's option to take
 * this in-house open. See "Vercel is a host, not a platform" in
 * .kiro/steering/project.md.
 *
 * Implementations:
 *   FsDataStore      — reads the JSON in the repo; writes to disk. Used by the
 *                      seed importer, local development, and any self-hosted
 *                      deployment with a filesystem.
 *   GitHubDataStore  — commits the JSON through the GitHub API, triggering a
 *                      rebuild. Needed only by admin publishing, which is not
 *                      built yet. Not stubbed here: an interface with one real
 *                      implementation is honest, a fake second one is not.
 */
export interface DataStore {
  /** For diagnostics and the admin publish confirmation. */
  readonly kind: string;
  /** Reads and validates. Throws on a schema violation rather than serving junk. */
  read(): Promise<Dataset>;
  /** Persists a validated dataset. Validation failure must block the write. */
  write(dataset: Dataset, options: WriteOptions): Promise<WriteResult>;
}

export interface WriteOptions {
  /** Commit message, or a log line for a filesystem write. */
  message: string;
}

export interface WriteResult {
  kind: string;
  /** Where it landed: a file path, or a commit sha once GitHub is wired up. */
  location: string;
}

export class DataStoreError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "DataStoreError";
  }
}

/**
 * The on-disk form, shared by every implementation.
 *
 * Pretty-printed with a trailing newline, deliberately: a reviewable
 * line-per-field diff is the entire reason there is no database. Both stores
 * must produce byte-identical output, or a publish through one would show up as
 * a whole-file rewrite in the other's diff.
 */
export function serializeDataset(dataset: Dataset): string {
  return `${JSON.stringify(dataset, null, 2)}\n`;
}
