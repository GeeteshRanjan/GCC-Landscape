import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

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
 * Filesystem-backed store. The dataset is a versioned JSON file in the repo, so
 * a read is one `readFile` plus a schema parse, and git supplies history, diffs
 * and rollback for free.
 *
 * The path is resolved from the working directory rather than `import.meta.url`
 * so `next build && next start` and `tsx scripts/*` agree. next.config.ts
 * declares `data/**` in `outputFileTracingIncludes`, which is what keeps the
 * file present in a traced production build.
 */

export const DATASET_RELATIVE_PATH = path.join("data", "dataset.json");

export function resolveDatasetPath(): string {
  const override = process.env.GCC_DATASET_PATH;
  if (override) return path.resolve(override);
  return path.join(process.cwd(), DATASET_RELATIVE_PATH);
}

export function createFsDataStore(filePath = resolveDatasetPath()): DataStore {
  return {
    kind: "fs",

    async read(): Promise<Dataset> {
      let raw: string;
      try {
        raw = await readFile(filePath, "utf8");
      } catch (cause) {
        throw new DataStoreError(
          `No dataset at ${filePath}. Run \`npm run data:import\` to build it from the seed spreadsheet.`,
          { cause },
        );
      }

      let json: unknown;
      try {
        json = JSON.parse(raw);
      } catch (cause) {
        throw new DataStoreError(`${filePath} is not valid JSON.`, { cause });
      }

      const result = datasetSchema.safeParse(json);
      if (!result.success) {
        throw new DataStoreError(
          `${filePath} failed schema validation:\n${formatIssues(result.error)}`,
        );
      }
      if (result.data.version !== DATASET_VERSION) {
        throw new DataStoreError(
          `${filePath} is dataset version ${result.data.version}; this build expects ${DATASET_VERSION}.`,
        );
      }
      return result.data;
    },

    // `options.message` is a commit message and has nowhere to go on a plain
    // filesystem write. It is part of the contract because the GitHub store
    // cannot work without it.
    async write(dataset: Dataset, _options: WriteOptions): Promise<WriteResult> {
      const result = datasetSchema.safeParse(dataset);
      if (!result.success) {
        throw new DataStoreError(
          `Refusing to write an invalid dataset:\n${formatIssues(result.error)}`,
        );
      }
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, serializeDataset(result.data), "utf8");
      return { kind: "fs", location: filePath };
    },
  };
}
