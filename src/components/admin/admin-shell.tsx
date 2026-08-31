"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { useDraft } from "@/components/admin/draft-provider";
import { Button } from "@/components/ui/button";

/**
 * App-shell chrome: a skip link, the grouped section nav, and one honest status
 * line.
 *
 * Deliberately not a marketing surface, so the tastemaker asset and
 * scroll-motion defaults do not apply here — this is the app-shell track. No
 * hero, no imagery, no scroll storytelling. What earns its keep in a data tool
 * is density, a visible current location, and never lying about whether work is
 * saved.
 *
 * The status line is the unpublished-changes warning. It is always present when
 * the draft is dirty, on every tab, because the failure it guards against is an
 * admin who edited for an hour and closed the tab.
 */

/**
 * The six sections, grouped the way the product is.
 *
 * Flat, the list said nothing about what a tab reaches: "Site copy" and "Function
 * metrics" edit what a visitor is SHOWN, "Companies" and "Taxonomy" edit what that
 * is drawn FROM, and "Publish" is the one act that makes either live. Three groups
 * in that order, so a change request about a public screen maps to one place.
 *
 * Every label uses the product's own vocabulary, which is why `/admin/business-types`
 * reads "Sub-industries": that is the word on the public dropdown and in the company
 * table. **Only the LABEL moves** — the route, the dataset key and the component all
 * keep their names, and the route is what the browser specs navigate by.
 *
 * "Site copy" is likewise named for the surface it edits rather than for the
 * `siteContent` key behind it: an admin is looking for the headline on the first
 * page, not for a schema field.
 */
const NAV_GROUPS = [
  {
    label: "Public screens",
    tabs: [
      { href: "/admin/entry-point", label: "Site copy" },
      { href: "/admin/metrics", label: "Function metrics" },
    ],
  },
  {
    label: "Data",
    tabs: [
      { href: "/admin", label: "Companies" },
      { href: "/admin/taxonomy", label: "Taxonomy" },
      { href: "/admin/business-types", label: "Sub-industries" },
    ],
  },
  {
    label: "Release",
    tabs: [{ href: "/admin/publish", label: "Publish" }],
  },
] as const;

export function AdminShell({
  publishTarget,
  children,
}: {
  publishTarget:
    | { ok: true; target: "github" | "fs"; description: string }
    | { ok: false; error: string };
  children: React.ReactNode;
}) {
  const { dirty, saveState, conflict, discardDraft, keepDraftAgainstNewBaseline } =
    useDraft();
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
  }

  return (
    <div className="min-h-dvh bg-surface-subtle">
      <a
        href="#admin-main"
        className="sr-only focus-visible:not-sr-only focus-visible:absolute focus-visible:left-4 focus-visible:top-4 focus-visible:z-50 focus-visible:bg-surface focus-visible:px-4 focus-visible:py-2 focus-visible:text-sm focus-visible:shadow-md"
      >
        Skip to content
      </a>

      {/* Two rows, because the group labels need the width. The identity and the
          save status are the persistent state; the nav is the choice. */}
      <header className="sticky top-0 z-30 border-b border-border-subtle bg-surface">
        <div className="mx-auto flex max-w-wide flex-wrap items-center gap-x-6 gap-y-3 px-6 pt-3 pb-1">
          <p className="text-sm font-semibold tracking-heading text-text">
            GCC data
          </p>

          <div className="ms-auto flex items-center gap-4">
            <SaveStatus dirty={dirty} saveState={saveState} />
            <Button variant="ghost" size="sm" onClick={signOut}>
              Sign out
            </Button>
          </div>
        </div>

        {/*
          A group per band rather than a list of lists, and that is a hard
          constraint rather than a preference: `listitem` is counted PAGE-WIDE by
          `4-entry-point.spec.ts`, where it means "an impact figure". Six links in a
          `<ul>` would make that count read the nav. `role="group"` carries the same
          grouping to a screen reader and adds no list role.
        */}
        <nav
          aria-label="Sections"
          className="mx-auto flex max-w-wide flex-wrap items-center gap-x-6 gap-y-1 px-6 pb-3"
        >
          {NAV_GROUPS.map((group) => {
            const labelId = `admin-nav-${group.label.toLowerCase().replace(/\W+/g, "-")}`;
            return (
              <div
                key={group.label}
                role="group"
                aria-labelledby={labelId}
                className="flex flex-wrap items-center gap-x-2"
              >
                <span
                  id={labelId}
                  className="text-xs font-medium uppercase tracking-caps text-text-muted"
                >
                  {group.label}
                </span>
                {group.tabs.map((tab) => {
                  const active =
                    tab.href === "/admin"
                      ? pathname === "/admin"
                      : pathname.startsWith(tab.href);
                  return (
                    <Link
                      key={tab.href}
                      href={tab.href}
                      aria-current={active ? "page" : undefined}
                      className={[
                        "px-3 py-1.5 text-sm transition-colors duration-fast",
                        active
                          ? "bg-surface-sunken font-medium text-text"
                          : "text-text-muted hover:text-text",
                      ].join(" ")}
                    >
                      {tab.label}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>
      </header>

      {/* Two banners, in severity order. The conflict one is a blocker in
          practice, so it sits above the routine warning. */}
      {conflict ? (
        <div
          role="alert"
          className="border-b border-border-strong bg-surface-sunken"
        >
          <div className="mx-auto flex max-w-wide flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center">
            <p className="text-sm text-text">
              <span className="font-semibold">
                The live data changed since these edits were started.
              </span>{" "}
              Your unpublished edits were saved against an older copy
              {conflict.savedAt ? ` on ${formatWhen(conflict.savedAt)}` : ""}.
              Publishing them would overwrite whatever changed in between.
            </p>
            <div className="flex shrink-0 gap-2 sm:ms-auto">
              <Button variant="outline" size="sm" onClick={keepDraftAgainstNewBaseline}>
                Keep my edits
              </Button>
              <Button variant="ghost" size="sm" onClick={discardDraft}>
                Discard my edits
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {dirty ? (
        <div className="border-b border-border-subtle bg-surface">
          <div className="mx-auto flex max-w-wide flex-wrap items-center gap-3 px-6 py-2.5">
            <span
              aria-hidden="true"
              className="size-2 rounded-full bg-feedback-attention"
            />
            <p className="text-sm text-text">
              You have unpublished changes. Nothing is live until you publish.
            </p>
            <div className="ms-auto flex gap-2">
              <Link
                href="/admin/publish"
                className="text-sm font-medium text-action underline underline-offset-4 hover:text-action-hover"
              >
                Review and publish
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      {!publishTarget.ok ? (
        <div role="alert" className="border-b border-border-strong bg-surface-sunken">
          <p className="mx-auto max-w-wide px-6 py-4 text-sm text-text">
            <span className="font-semibold">Publishing is unavailable.</span>{" "}
            {publishTarget.error}
          </p>
        </div>
      ) : null}

      <main id="admin-main" className="mx-auto max-w-wide px-6 py-8">
        {children}
      </main>
    </div>
  );
}

function SaveStatus({
  dirty,
  saveState,
}: {
  dirty: boolean;
  saveState: "idle" | "saving" | "saved" | "unavailable";
}) {
  /**
   * A stable region that is present before its text changes, so repeated polite
   * updates are announced rather than swallowed.
   *
   * "Saved locally" requires an explicit `saved` state — it is never the fallback.
   * Written the other way round, any state that is not literally "saving" reads as
   * saved, which meant a freshly edited draft announced itself as safe before the
   * debounce had written anything.
   */
  const text = (() => {
    if (saveState === "unavailable") {
      return "Cannot save a local copy — do not close this tab before publishing.";
    }
    if (!dirty) return "No unpublished changes";
    if (saveState === "saved") return "Saved locally";
    return "Saving locally…";
  })();

  return (
    <p
      role="status"
      className={[
        "text-sm",
        saveState === "unavailable" ? "text-text" : "text-text-muted",
      ].join(" ")}
    >
      {saveState === "unavailable" ? (
        <span className="ansr-field-error">{text}</span>
      ) : (
        text
      )}
    </p>
  );
}

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "an earlier session";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
