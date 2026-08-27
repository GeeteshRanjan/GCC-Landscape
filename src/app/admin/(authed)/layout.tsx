import type { Metadata } from "next";

import { AdminShell } from "@/components/admin/admin-shell";
import { DraftProvider } from "@/components/admin/draft-provider";
import { getDataset } from "@/data/dataset";
import { describePublishTarget } from "@/data/publish-store";
import { requirePageSession } from "@/lib/admin/guard";

/**
 * The guard for every authenticated admin page.
 *
 * A route group rather than middleware. Middleware would be a second runtime to
 * keep Node-only for no gain, and this layout is a boundary every page inside
 * the group must pass through. Route handlers get their own check, because a
 * layout cannot guard one.
 *
 * The layout also loads the published dataset once and hands it to the draft
 * provider. Because a layout does not remount when navigating between its
 * children, the draft survives moving between Companies, Taxonomy and Publish —
 * which is what makes those real URLs rather than component state. Admin is
 * never framed, so unlike the public surface it may own the URL and the
 * viewport.
 */
export const metadata: Metadata = {
  title: "GCC data",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AuthedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePageSession();

  const dataset = await getDataset();
  const publishTarget = describePublishTarget();

  return (
    <DraftProvider baseline={dataset}>
      <AdminShell publishTarget={publishTarget}>{children}</AdminShell>
    </DraftProvider>
  );
}
