"use client";

import { cloneElement, isValidElement, useId, type ReactNode } from "react";

/**
 * The control recipes the hand-rolled admin forms share, and the three small readouts
 * every editing surface draws.
 *
 * ## Why this exists beside `fields.tsx` rather than inside it
 *
 * `fields.tsx` owns LABELLED FIELDS bound to the draft — it takes a value and an
 * onChange and renders the whole labelled unit. Three surfaces do not want that: the
 * business-type form, the peer-override form and the company table's own toolbar all
 * compose their controls by hand, because each has a layout `fields.tsx` cannot express
 * (a fieldset of checkboxes, a two-pane picker, a filter row). So each wrote its own
 * class string, and they drifted:
 *
 *   - `min-h-11 … border-border` in the business-type editor
 *   - `h-9 … border-input shadow-xs` in `fields.tsx`
 *   - `h-9 … border-input shadow-xs` plus a focus ring in the company table, which was
 *     the only one of the three that HAD a visible focus ring
 *
 * Three heights, two border tokens, and one keyboard user out of three able to see
 * where they were. That is the defect this module fixes, and it fixes it by having one
 * recipe rather than by asking everyone to remember the same one.
 *
 * ## What it deliberately is not
 *
 * Not a component library, and not a wrapper around `src/components/ui/`. The shadcn
 * primitives stay unmodified from the registry, so `Input`, `Button` and `Table` are
 * still used directly wherever a plain one will do — `ADMIN_CONTROL` exists for the
 * native `<select>` and the bare `<input>` that admin uses on purpose (a native select
 * on a 200-item country list beats anything we would build), and it is deliberately
 * the same recipe `Input` renders so the two sit on one line without looking like two
 * kinds of control.
 *
 * And nothing here is a public-screen primitive. Admin keeps radius `md`, Inter, native
 * selects and a sticky header; `primitives.tsx` is the other track.
 *
 * `"use client"` because `AdminField` generates ids with `useId`. Every consumer is
 * already a client component, so the directive costs nothing and is declared rather than
 * inherited — a server component reaching for `AdminField` would otherwise fail at
 * runtime rather than at the import.
 */

/**
 * One input, one select, one recipe — matching what shadcn's `Input` renders, so a
 * hand-rolled control and a registry one on the same row are the same object.
 *
 * The focus ring is the half that was missing at two of the three call sites, and it is
 * why this is a shared string rather than a convention: a keyboard user tabbing through
 * the business-type form could not see where they were, and nothing about that is
 * visible to whoever is reading the markup.
 */
export const ADMIN_CONTROL =
  "h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-sm text-text shadow-xs outline-none transition-[color,box-shadow] duration-fast focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

/** The same, for a textarea: no fixed height, everything else identical. */
export const ADMIN_TEXTAREA =
  "w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-2 text-sm text-text shadow-xs outline-none transition-[color,box-shadow] duration-fast focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

/** A field's own label. 13px medium, so it reads as a label and not as content. */
export const ADMIN_LABEL = "text-sm font-medium text-text";

/** The line under a control saying what it does. Never a tooltip. */
export const ADMIN_HINT = "text-xs text-text-muted";

/**
 * A labelled control, so the label, the hint and the gap between them are decided once.
 *
 * **The hint is a DESCRIPTION and not part of the name, and getting that wrong is what
 * this component was rewritten for.** The obvious shape — a `<label>` wrapping the
 * control with the hint inside it — is what three of these surfaces already did, and it
 * folds the hint into the control's accessible NAME. So a select called "Industry" was
 * really called "Industry The hard boundary. Peer matching never leaves it, so a pinned
 * company must be in it too.", which is a sentence read out before every option and, on a
 * form holding both Industry and Sub-industry, made a name lookup for either one
 * ambiguous — a screen-reader user and a spec hit the same wall.
 *
 * So the label is a real `htmlFor` pairing and the hint is wired up with
 * `aria-describedby` — which means the control needs both ids. It gets them by CLONING
 * the single child, rather than by asking every call site to thread them through: each of
 * these fields wraps exactly one control, so the clone is unambiguous, and keeping the
 * call sites as plain JSX is what makes this worth adopting at twelve of them instead of
 * two. A caller's own `id` or `aria-describedby` wins, so a field that needs to opt out
 * can.
 */
export function AdminField({
  label,
  hint,
  className,
  children,
}: {
  label: ReactNode;
  hint?: ReactNode;
  className?: string;
  /** Exactly one control: an `input`, `select` or `textarea`. */
  children: ReactNode;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const described = hint ? hintId : undefined;

  const control = isValidElement<{
    id?: string;
    "aria-describedby"?: string;
  }>(children)
    ? cloneElement(children, {
        id: children.props.id ?? id,
        "aria-describedby": children.props["aria-describedby"] ?? described,
      })
    : children;

  return (
    <div className={["flex flex-col gap-1.5", className].filter(Boolean).join(" ")}>
      <label htmlFor={id} className={ADMIN_LABEL}>
        {label}
      </label>
      {control}
      {hint ? (
        <p id={hintId} className={ADMIN_HINT}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/**
 * The count line every filtering surface carries under its search box.
 *
 * **It is a `role="status"` and that is not decoration.** Every admin filter can hide a
 * section entirely, and a page that silently loses two thirds of itself reads as broken;
 * the count is what makes the emptiness legible, and the live region is what makes it
 * legible without sight. Shared so the five surfaces cannot disagree about whether it is
 * announced — two of them used to be a plain `<p>`.
 *
 * `note` is a second clause on the same line: what an edit here costs, which is a thing
 * two of these pages genuinely need to say beside the count and not in a heading.
 */
export function AdminCount({
  children,
  note,
}: {
  children: ReactNode;
  note?: ReactNode;
}) {
  return (
    <p role="status" className="text-sm text-text-muted">
      {children}
      {note ? <span className="text-text-muted"> {note}</span> : null}
    </p>
  );
}

/**
 * The empty state, one shape for the whole admin.
 *
 * Distinct from `NoSearchMatches` in `search-box.tsx`, which is specifically "your query
 * matched nothing" and names the query back. This is "there is nothing here yet", which
 * wants an ACTION rather than an apology — an admin looking at an empty collection needs
 * the way to start one, and every surface that had this state drew it differently.
 */
export function AdminEmpty({
  title,
  lead,
  children,
}: {
  title: string;
  lead?: ReactNode;
  /** The way out: the action that makes the emptiness stop. */
  children?: ReactNode;
}) {
  return (
    <div className="rounded-md border border-border-subtle bg-surface px-6 py-12 text-center">
      <p className="text-sm font-medium text-text">{title}</p>
      {lead ? (
        <p className="mx-auto mt-1 max-w-measure text-sm text-text-muted">{lead}</p>
      ) : null}
      {children ? (
        <div className="mt-4 flex justify-center gap-3">{children}</div>
      ) : null}
    </div>
  );
}

/**
 * A small marker: a tag, a wildcard, a state.
 *
 * Two tones and no more. **Status is carried by FORM and not by colour** — the four
 * `--ansr-status-*` tokens are retired and lint-blocked — so `quiet` and `strong` differ
 * by fill and border weight, which is what survives greyscale and colour blindness
 * alike. Anything needing a third distinction wants a word, not a third tone.
 */
export function AdminChip({
  tone = "quiet",
  title,
  children,
}: {
  tone?: "quiet" | "strong";
  title?: string;
  children: ReactNode;
}) {
  return (
    <span
      title={title}
      className={[
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs whitespace-nowrap",
        tone === "strong"
          ? "border border-border-strong bg-surface font-medium text-text"
          : "bg-surface-sunken text-text-muted",
      ].join(" ")}
    >
      {children}
    </span>
  );
}

/**
 * A divided list of rows inside an `AdminSection`, replacing the stack of floating
 * bordered cards three surfaces had grown.
 *
 * **The change is about scanning, not tidiness.** 164 business types as 164 bordered
 * cards with a gap between them gives every row the same visual weight as the section
 * containing it, so there is no hierarchy to read down — which is most of what made the
 * admin feel monotonous. One card with hairlines inside it puts the boundary where the
 * boundary is. The publish panel already did this; it is the shape being adopted rather
 * than invented.
 *
 * `<ul>`/`<li>` on purpose, and it is worth knowing why that is safe here and not
 * everywhere: `4-entry-point.spec.ts` counts `listitem` PAGE-WIDE, where it means an
 * impact figure — which is why `admin-shell.tsx`'s nav is a `role="group"`. That page is
 * the site-copy editor and draws no `AdminRows`, so the count is untouched.
 */
export function AdminRows({ children }: { children: ReactNode }) {
  return <ul className="divide-y divide-border-subtle">{children}</ul>;
}

export function AdminRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <li
      className={[
        "flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-5 py-3.5",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </li>
  );
}

/**
 * The trailing action cluster on a row: Edit, Remove, and nothing else.
 *
 * `shrink-0` so a long name wraps rather than squeezing the buttons to two lines, which
 * is what happened on the business-type rows at a narrow window.
 */
export function AdminRowActions({ children }: { children: ReactNode }) {
  return <div className="flex shrink-0 items-center gap-2">{children}</div>;
}
