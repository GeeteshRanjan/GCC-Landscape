import type { Metadata } from "next";

import { PeerOverrideManager } from "@/components/admin/peer-override-manager";

/**
 * Per-page title, because admin owns its URL and six tabs all reading "GCC data" makes
 * the history and the tab strip useless.
 */
export const metadata: Metadata = {
  title: "Pinned peer sets · GCC data",
};

export default function PeerOverridesPage() {
  return <PeerOverrideManager />;
}
