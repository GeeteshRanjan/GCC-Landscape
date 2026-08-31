import type { Metadata } from "next";

import { PublishPanel } from "@/components/admin/publish-panel";

export const metadata: Metadata = { title: "Publish · GCC data" };

export default function AdminPublishPage() {
  return <PublishPanel />;
}
