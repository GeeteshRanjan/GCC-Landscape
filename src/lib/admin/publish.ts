import "server-only";

import { clearDatasetCache } from "@/data/dataset";
import { diffDatasets, type DatasetDiff } from "@/data/diff";
import {
  PublishConfigError,
  resolvePublishStore,
  type PublishTarget,
} from "@/data/publish-store";
import {
  DATASET_VERSION,
  datasetSchema,
  formatIssues,
  type Dataset,
} from "@/data/schema";
import { DataStoreError } from "@/data/store";

/**
 * The publish pipeline, shared by the preview and the commit so the two cannot
 * disagree. Both run the same three steps in the same order:
 *
 *   1. Validate the whole submitted dataset against the schema. A failure blocks
 *      everything downstream — this is the gate, not a warning.
 *   2. Read the current dataset from the *publish* store, so the diff is against
 *      what the write will actually land on top of.
 *   3. Diff, using src/data/diff.ts — the same computation the seed importer
 *      prints to the console.
 *
 * The commit endpoint then does one more thing the preview does not: write.
 */

export interface PublishFailure {
  ok: false;
  status: number;
  error: string;
  /** Per-field schema messages, when the failure was validation. */
  issues?: string[];
}

export interface PreviewSuccess {
  ok: true;
  diff: DatasetDiff;
  target: PublishTarget;
  targetDescription: string;
  /** What the commit message will say, so the preview shows the real thing. */
  message: string;
  dataset: Dataset;
}

export type PreviewResult = PreviewSuccess | PublishFailure;

/**
 * Metadata the admin does not own.
 *
 * `generatedAt` is stamped server-side, so a stale browser clock cannot write
 * the publish time. `source` is preserved from the published dataset: admin
 * edits rows, it does not change where the batch came from — that is the
 * importer's field, and the commit message carries the "what changed" instead.
 */
function stampMetadata(submitted: Dataset, published: Dataset | null): Dataset {
  return {
    ...submitted,
    version: DATASET_VERSION,
    generatedAt: new Date().toISOString(),
    source: published?.source ?? submitted.source,
  };
}

function summarize(diff: DatasetDiff): string {
  const parts: string[] = [];
  if (diff.counts.added) parts.push(`${diff.counts.added} added`);
  if (diff.counts.removed) parts.push(`${diff.counts.removed} removed`);
  if (diff.counts.changed) parts.push(`${diff.counts.changed} changed`);
  if (diff.counts.taxonomy) {
    parts.push(`${diff.counts.taxonomy} taxonomy list${diff.counts.taxonomy === 1 ? "" : "s"} updated`);
  }
  return parts.length > 0 ? parts.join(", ") : "no changes";
}

export function commitMessage(diff: DatasetDiff): string {
  return `data: publish from admin (${summarize(diff)})`;
}

/** Validate, read the current state, diff. Writes nothing. */
export async function buildPreview(body: unknown): Promise<PreviewResult> {
  const payload = body as { dataset?: unknown } | null;
  if (!payload || typeof payload !== "object" || payload.dataset === undefined) {
    return { ok: false, status: 400, error: "No dataset in the request." };
  }

  let target: PublishTarget;
  let targetDescription: string;
  let published: Dataset | null;
  try {
    const publishStore = resolvePublishStore();
    target = publishStore.target;
    targetDescription = publishStore.description;
    published = await publishStore.store.read();
  } catch (error) {
    if (error instanceof PublishConfigError) {
      return { ok: false, status: 500, error: error.message };
    }
    if (error instanceof DataStoreError) {
      return {
        ok: false,
        status: 502,
        error: `Could not read the published data, so there is nothing to compare against. ${error.message}`,
      };
    }
    throw error;
  }

  const candidate = datasetSchema.safeParse(payload.dataset);
  if (!candidate.success) {
    return {
      ok: false,
      status: 422,
      error:
        "These changes are not valid, so they cannot be published. Fix the problems below and try again.",
      issues: formatIssues(candidate.error, 40).split("\n").map((l) => l.trim()),
    };
  }

  const dataset = stampMetadata(candidate.data, published);

  // Re-validate after stamping. Cheap, and it means the object handed to the
  // store has been through the schema in exactly the form it will be written.
  const stamped = datasetSchema.safeParse(dataset);
  if (!stamped.success) {
    return {
      ok: false,
      status: 500,
      error: `Internal validation failed after stamping metadata:\n${formatIssues(stamped.error)}`,
    };
  }

  const diff = diffDatasets(stamped.data, published);
  return {
    ok: true,
    diff,
    target,
    targetDescription,
    message: commitMessage(diff),
    dataset: stamped.data,
  };
}

export interface PublishedMetadata {
  version: number;
  generatedAt: string;
  source: string;
}

export interface PublishSuccess {
  ok: true;
  diff: DatasetDiff;
  target: PublishTarget;
  location: string;
  message: string;
  /** Server-owned fields, so the browser can reset its baseline. */
  metadata: PublishedMetadata;
}

/** Validate, diff, then write. A validation failure never reaches the store. */
export async function publishDataset(
  body: unknown,
): Promise<PublishSuccess | PublishFailure> {
  const preview = await buildPreview(body);
  if (!preview.ok) return preview;

  if (preview.diff.isEmpty) {
    return {
      ok: false,
      status: 409,
      error: "Nothing to publish — these changes match what is already live.",
    };
  }

  try {
    const { store } = resolvePublishStore();
    const result = await store.write(preview.dataset, { message: preview.message });
    // The running process holds the dataset in memory; a filesystem publish
    // changes the file under it, so the cache has to go. A GitHub publish
    // rebuilds instead, but clearing is harmless either way.
    clearDatasetCache();
    return {
      ok: true,
      diff: preview.diff,
      target: preview.target,
      location: result.location,
      message: preview.message,
      metadata: {
        version: preview.dataset.version,
        generatedAt: preview.dataset.generatedAt,
        source: preview.dataset.source,
      },
    };
  } catch (error) {
    if (error instanceof PublishConfigError) {
      return { ok: false, status: 500, error: error.message };
    }
    if (error instanceof DataStoreError) {
      return { ok: false, status: 502, error: error.message };
    }
    throw error;
  }
}
