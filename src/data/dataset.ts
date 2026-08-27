import "server-only";

import type { Dataset } from "./schema";
import type { DataStore } from "./store";
import { createFsDataStore, resolveDatasetPath } from "./store/fs-store";

/**
 * Server-side access to the published dataset.
 *
 * `server-only` is not decoration. The dataset is read once and held in memory,
 * and it is never shipped whole to the browser — Screen 1 sends five peers and
 * a few counts, nothing more. Importing this module from a client component is
 * a build error, which is the guard that makes that rule enforceable rather
 * than aspirational.
 */

let store: DataStore | null = null;

/**
 * The read store. Always the filesystem, and that is not a placeholder: a
 * publish commits and triggers a rebuild, so the file baked into the running
 * build is current by construction. The write path is selected separately in
 * ./publish-store.ts, because reads and writes have different correct targets.
 */
export function getDataStore(): DataStore {
  store ??= createFsDataStore();
  return store;
}

interface CacheEntry {
  /** Identifies the file contents this promise was built from. */
  stamp: string;
  dataset: Promise<Dataset>;
}

let cached: CacheEntry | null = null;

/**
 * Cheap identity for the dataset file: modified time plus size.
 *
 * This is what makes the cache correct rather than merely fast. Clearing the
 * cache from the publish endpoint is not enough: a route handler and a layout can
 * end up in different server bundles with their own copy of module-level state,
 * so the handler clears a cache the layout never reads. The symptom is a publish
 * that writes the file, reports success, and then keeps serving the old data until
 * the process restarts.
 *
 * It matters for a self-hosted deployment writing to a real disk. With GitHub
 * publishing the rebuild replaces the process anyway, but relying on that would
 * make correctness a property of the host rather than of this module.
 */
async function fileStamp(): Promise<string> {
  try {
    const { stat } = await import("node:fs/promises");
    const info = await stat(resolveDatasetPath());
    return `${info.mtimeMs}:${info.size}`;
  } catch {
    // No file, or a store that is not file-backed. Fall back to caching for the
    // process lifetime rather than re-reading on every request.
    return "unstamped";
  }
}

/**
 * Reads and validates, holding the result in memory until the underlying file
 * changes. One `stat` per request, against a 700 KB parse avoided.
 */
export async function getDataset(): Promise<Dataset> {
  const stamp = await fileStamp();
  if (cached && cached.stamp === stamp) return cached.dataset;

  const dataset = getDataStore()
    .read()
    .catch((error: unknown) => {
      cached = null;
      throw error;
    });
  cached = { stamp, dataset };
  return dataset;
}

/** For tests and the admin diff preview, which reads a fresh copy. */
export function clearDatasetCache(): void {
  cached = null;
}
