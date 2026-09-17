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
    /**
     * **A hairline under the header, which is the one structural thing this row was
     * missing.** Every admin page is a heading, then a filter row on its own bordered
     * fill, then a bordered section — three boxes of the same weight in a column, so
     * nothing said which of them was the page's title and which were its contents. The
     * rule closes the header band, and it is a border rather than extra space because
     * space is what the rest of the page is already using to separate sections.
     *
     * `items-end` keeps the primary action on the title's own baseline rather than
     * centred against a two-line lead.
     */
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-border-subtle pb-4">
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
  actions,
  padded = false,
  children,
}: {
  id: string;
  title: string;
  description?: ReactNode;
  /** Sits on the heading's baseline: a count, or a warning that order matters. */
  meta?: ReactNode;
  /**
   * The section's own control, trailing-aligned in the heading row.
   *
   * Added because three sections had grown one anyway, each putting it somewhere
   * different — inside `meta`, above the body, or as the first row of the list. A
   * section-scoped action belongs on the section's heading row for the same reason a
   * page-scoped one belongs on the page's.
   */
  actions?: ReactNode;
  /**
   * Pad the body.
   *
   * Defaults to FALSE, and the default is the load-bearing half: a divided list has to
   * reach the card's edges or its hairlines stop short of them, so every list-shaped
   * caller needs no padding and would have to undo it. Callers whose body is a form or a
   * paragraph opt in, which is what stops each of them choosing a different inset — the
   * drift this component was extracted to end, arriving one level down.
   */
  padded?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      /**
       * **Radius `md`, which is admin's own default and what this card was the last
       * thing not to use.** Every control inside it is `rounded-md` — that is
       * `--radius` in the shadcn contract block — so a square card full of rounded
       * controls read as two design systems in one box. The public screens are the ones
       * on radius `none`, deliberately, and `primitives.tsx` is where that lives.
       */
      className="overflow-hidden rounded-md border border-border-subtle bg-surface"
    >
      {/* The heading row takes the sunken fill, so a section reads as a titled card
          rather than as a paragraph with a rule under it. It is the same relationship
          the page header's hairline draws, one level down — and it is a FILL here rather
          than a second rule because two identical rules in a column say nothing about
          which contains which. */}
      <div className="border-b border-border-subtle bg-surface-subtle px-5 py-3.5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 id={id} className="text-base font-semibold text-text">
              {title}
            </h2>
            {meta}
          </div>
          {actions ? (
            <div className="flex shrink-0 items-center gap-2">{actions}</div>
          ) : null}
        </div>
        {description ? (
          <div className="mt-1 flex max-w-measure flex-col gap-1 text-sm text-text-muted">
            {description}
          </div>
        ) : null}
      </div>
      {padded ? <div className="px-5 py-4">{children}</div> : children}
    </section>
  );
}
