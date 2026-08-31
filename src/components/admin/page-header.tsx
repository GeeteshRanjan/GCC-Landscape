import type { ReactNode } from "react";

/**
 * The two pieces of chrome every admin page is built from.
 *
 * Both were hand-rolled at every call site — six copies of the page header, three
 * of the section card — which is how the pages drifted apart: `gap-6` on three of
 * them and `gap-8` on the other three, one `h1` carrying a paragraph and another a
 * count, a heading row at `py-3` beside one at `py-4`. Extracted so a change
 * request about admin chrome lands in one file instead of six.
 *
 * Nothing here is a public-screen primitive. Admin keeps radius `md`, native
 * selects and a sticky header; `primitives.tsx` is the other track and the two do
 * not borrow from each other.
 */

export function AdminPageHeader({
  title,
  lead,
  children,
}: {
  title: string;
  /** One short sentence at most. The detail belongs on the section it describes. */
  lead?: ReactNode;
  /** The page's primary action, trailing-aligned on the same baseline as the title. */
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div>
        <h1 className="text-xl font-semibold tracking-heading text-text">
          {title}
        </h1>
        {lead ? (
          <p className="mt-1 max-w-measure text-sm text-text-muted">{lead}</p>
        ) : null}
      </div>
      {children ? (
        <div className="flex shrink-0 items-center gap-3">{children}</div>
      ) : null}
    </div>
  );
}

/**
 * A bordered card with a named heading row.
 *
 * `id` is the HEADING's id and the section's `aria-labelledby` together, which is
 * what makes each card a landmark a screen-reader user can jump between — and what
 * the browser specs locate every one of them by (`getByRole("region")` filtered on
 * its heading). So the id is a contract, not a detail: it is passed in rather than
 * derived here, because the callers' ids already ship.
 *
 * `description` is a node rather than a string for one reason: two of the taxonomy
 * lists carry a second paragraph in this row that every row below points at with
 * `aria-describedby`, so the hint has to be able to bring its own `id`.
 */
export function AdminSection({
  id,
  title,
  description,
  meta,
  children,
}: {
  id: string;
  title: string;
  description?: ReactNode;
  /** Sits on the heading's baseline: a count, or a warning that order matters. */
  meta?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="border border-border-subtle bg-surface"
    >
      <div className="border-b border-border-subtle px-5 py-4">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 id={id} className="text-base font-semibold text-text">
            {title}
          </h2>
          {meta}
        </div>
        {description ? (
          <div className="mt-1 flex max-w-measure flex-col gap-1 text-sm text-text-muted">
            {description}
          </div>
        ) : null}
      </div>
      {children}
    </section>
  );
}
