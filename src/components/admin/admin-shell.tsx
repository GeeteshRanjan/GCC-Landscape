"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { useDraft } from "@/components/admin/draft-provider";
import { GlobalSearch } from "@/components/admin/global-search";
import { NAV_GROUPS } from "@/components/admin/sections";
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
 * The nav's six sections now come from `sections.ts`, which the universal search
 * indexes from as well — so a renamed tab cannot stay reachable in the palette under
 * its old name.
 */

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
        <div className="mx-auto flex max-w-wide flex-wrap items-center gap-x-6 gap-y-3 px-6 pt-3 pb-2">
          {/* The identity, plus where a publish would LAND. The target was only ever
              readable at the bottom of the publish page, which is the one place an admin
              is not standing when they need to know whether this window is pointed at
              production — so it rides the identity, quietly, on every page. It says
              nothing at all when publishing is unavailable, because the banner below
              already says that at full volume. */}
          <div className="flex items-baseline gap-2">
            <p className="text-sm font-semibold tracking-heading text-text">
              GCC data
            </p>
            {publishTarget.ok ? (
              <span
                className="text-xs text-text-muted"
                title={publishTarget.description}
              >
                {publishTarget.target === "github" ? "live repo" : "local file"}
              </span>
            ) : null}
          </div>

          {/* The palette's trigger leads the trailing group, before the save status.
              It is the one control on this row that is an ACTION rather than a
              readout, and it is reachable from every page. */}
          <div className="ms-auto flex items-center gap-4">
            <GlobalSearch />
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
          className="mx-auto flex max-w-wide flex-wrap items-center gap-x-5 gap-y-2 px-6 pb-3"
        >
          {NAV_GROUPS.map((group, index) => {
            const labelId = `admin-nav-${group.label.toLowerCase().replace(/\W+/g, "-")}`;
            return (
              <div
                key={group.label}
                role="group"
                aria-labelledby={labelId}
                className="flex flex-wrap items-center gap-x-1.5"
              >
                {/*
                  **A rule between groups rather than more space, and the group label
                  demoted under the links.** The label used to be the same 12px caps in
                  the same muted ink as the inactive tabs, sitting inline with them — so
                  a row of nine items read as nine peers and the grouping was invisible
                  at exactly the size it was drawn. What separates the groups now is a
                  hairline, which is the cheapest mark that survives the row wrapping —
                  and the links themselves gained a shape, so the label is the only
                  unshaped thing on the row and reads as introducing rather than
                  belonging.

                  A `<span>` inside the group, not a `::before` on it: the divider is
                  decoration and must not land in the accessible name the group takes
                  from that label.
                */}
                {index > 0 ? (
                  <span
                    aria-hidden="true"
                    className="me-3.5 hidden h-4 w-px bg-border-subtle sm:block"
                  />
                ) : null}
                <span
                  id={labelId}
                  className="me-1 text-xs font-medium uppercase tracking-caps text-text-muted"
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
                        // `rounded-md` on both states, so the hover fill is the same
                        // shape as the current one — a square hover under a square
                        // active fill read as the page having moved.
                        "rounded-md px-2.5 py-1.5 text-sm transition-colors duration-fast",
                        active
                          ? // Three signals, none of them colour: the fill, a hairline
                            // ring so it reads as a raised chip rather than a highlight,
                            // and the weight. Same argument as the public view switch.
                            "bg-surface-sunken font-medium text-text ring-1 ring-border-subtle"
                          : "text-text-muted hover:bg-surface-subtle hover:text-text",
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
      {/*
        **Three banners of one weight became three of three weights, and the ranking is
        carried by FORM rather than by colour** — which is the design rule here, the four
        `--ansr-status-*` tokens being retired and lint-blocked. All three used to be a
        full-bleed strip with a hairline and a fill, so a blocker and a routine reminder
        were the same object and an admin learned to read past both. What differs now is
        the LEADING EDGE: the two that need acting on carry a 4px inline-start rule, the
        routine one carries the attention dot it already had, and nothing gained a hue.
      */}
      {conflict ? (
        <div
          role="alert"
          className="border-b border-border-strong bg-surface-sunken border-s-4 border-s-border-strong"
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
        <div
          role="alert"
          className="border-b border-border-strong bg-surface-sunken border-s-4 border-s-border-strong"
        >
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
