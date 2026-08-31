import type { Metadata } from "next";

import { CompanyManager } from "@/components/admin/company-manager";

/**
 * /admin — the company table. The draft it edits lives in the provider in the
 * layout above, so navigating to Taxonomy and back does not lose anything.
 *
 * The title is set per page rather than once in the layout because admin owns its
 * URL: six sections that all read "GCC data" make the browser's own history and
 * tab strip useless for getting back to one of them.
 */
export const metadata: Metadata = { title: "Companies · GCC data" };

export default function AdminCompaniesPage() {
  return <CompanyManager />;
}
