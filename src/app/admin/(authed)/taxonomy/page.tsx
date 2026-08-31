import type { Metadata } from "next";

import { TaxonomyManager } from "@/components/admin/taxonomy-manager";

export const metadata: Metadata = { title: "Taxonomy · GCC data" };

export default function AdminTaxonomyPage() {
  return <TaxonomyManager />;
}
