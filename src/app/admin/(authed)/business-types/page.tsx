import type { Metadata } from "next";

import { BusinessTypeManager } from "@/components/admin/business-type-manager";

/**
 * The route keeps its name. "Sub-industries" is the word the nav and the public
 * screens use; `business-types` is the data, and it is what the browser specs
 * navigate by — renaming the path would break them silently.
 */
export const metadata: Metadata = { title: "Sub-industries · GCC data" };

export default function AdminBusinessTypesPage() {
  return <BusinessTypeManager />;
}
