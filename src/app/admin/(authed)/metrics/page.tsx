import type { Metadata } from "next";

import { MetricsManager } from "@/components/admin/metrics-manager";

export const metadata: Metadata = { title: "Function metrics · GCC data" };

export default function MetricsPage() {
  return <MetricsManager />;
}
