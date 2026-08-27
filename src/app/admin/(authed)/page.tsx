import { CompanyManager } from "@/components/admin/company-manager";

/**
 * /admin — the company table. The draft it edits lives in the provider in the
 * layout above, so navigating to Taxonomy and back does not lose anything.
 */
export default function AdminCompaniesPage() {
  return <CompanyManager />;
}
