import { getDataset } from "@/data/dataset";

/**
 * Scaffold placeholder. Screen 1 replaces this wholesale.
 *
 * It reads the dataset through the DataStore on the server, which is the only
 * reason it exists: it proves the runtime data path resolves under both
 * `next dev` and `next build && next start`. Nothing here is visitor-facing
 * copy, and no design decision has been made yet.
 */
export default async function Page() {
  const dataset = await getDataset();

  return (
    <main className="mx-auto max-w-content px-6 py-16">
      <p className="text-sm text-text-muted">
        Data layer ready — {dataset.companies.length} companies, dataset version{" "}
        {dataset.version}. No screen built yet.
      </p>
    </main>
  );
}
