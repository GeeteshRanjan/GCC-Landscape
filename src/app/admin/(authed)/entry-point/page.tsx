import type { Metadata } from "next";

import { SiteContentManager } from "@/components/admin/site-content-manager";

/** The route is `entry-point`; the surface it edits is now more than that. */
export const metadata: Metadata = { title: "Site copy · GCC data" };

export default function EntryPointPage() {
  return <SiteContentManager />;
}
