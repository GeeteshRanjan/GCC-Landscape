import "server-only";

import type { DataStore } from "./store";
import { createFsDataStore, resolveDatasetPath } from "./store/fs-store";
import {
  GitHubConfigError,
  createGitHubDataStore,
  readGitHubConfigFromEnv,
} from "./store/github-store";

/**
 * Which store a publish writes through.
 *
 * Kept separate from `getDataset()` on purpose, because reads and writes have
 * genuinely different correct answers here:
 *
 *   Reads always come from the local file. A publish commits and triggers a
 *   rebuild, so the file baked into the running build is current by
 *   construction — adding a GitHub round trip to every cold start would buy
 *   nothing and add a network dependency and a rate limit to the public screens.
 *
 *   Writes must go wherever the deployment's source of truth actually is, and
 *   the diff must be computed against that same place. Diffing against the
 *   baked-in file while committing to a branch that has since moved is how one
 *   publish silently reverts another.
 *
 * The selection refuses to guess. In production with nothing configured, this
 * throws rather than quietly writing to a container filesystem that the next
 * deploy discards — a publish that reports success and loses the data is worse
 * than one that refuses to start.
 */

export type PublishTarget = "github" | "fs";

export interface PublishStore {
  store: DataStore;
  target: PublishTarget;
  /** Shown in the admin publish view. Never mentions git or a repository. */
  description: string;
}

export class PublishConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PublishConfigError";
  }
}

function fsPublishStore(reason: string): PublishStore {
  return {
    store: createFsDataStore(),
    target: "fs",
    description: reason,
  };
}

export function resolvePublishStore(): PublishStore {
  const configured = process.env.GCC_DATA_STORE?.trim().toLowerCase();

  if (configured === "github") {
    try {
      const config = readGitHubConfigFromEnv();
      return {
        store: createGitHubDataStore(config),
        target: "github",
        // No git vocabulary reaches the UI; this is what the admin sees.
        description: "Changes go live a minute or so after publishing.",
      };
    } catch (error) {
      if (error instanceof GitHubConfigError) {
        throw new PublishConfigError(error.message);
      }
      throw error;
    }
  }

  if (configured === "fs") {
    return fsPublishStore(
      `Changes are written to this machine (${relativeDatasetPath()}).`,
    );
  }

  if (configured) {
    throw new PublishConfigError(
      `GCC_DATA_STORE is "${configured}"; expected "github" or "fs".`,
    );
  }

  if (process.env.NODE_ENV === "production") {
    throw new PublishConfigError(
      "Publishing is not configured for this deployment. Set GCC_DATA_STORE=github " +
        "with GCC_GITHUB_REPO and GCC_GITHUB_TOKEN, or GCC_DATA_STORE=fs to accept " +
        "writes to this machine's filesystem. Refusing to guess: an unconfigured " +
        "write would report success and be discarded on the next deploy.",
    );
  }

  return fsPublishStore(
    `Changes are written to this machine (${relativeDatasetPath()}).`,
  );
}

function relativeDatasetPath(): string {
  const full = resolveDatasetPath();
  const cwd = process.cwd();
  return full.startsWith(cwd) ? full.slice(cwd.length + 1) : full;
}

/** Config check for the admin UI, so the publish button can explain itself. */
export function describePublishTarget():
  | { ok: true; target: PublishTarget; description: string }
  | { ok: false; error: string } {
  try {
    const { target, description } = resolvePublishStore();
    return { ok: true, target, description };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
