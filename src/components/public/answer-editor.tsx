"use client";

import { X } from "lucide-react";

import { usePublicCopy } from "@/components/public/copy-context";
import { InputPanel, type AskOptions } from "@/components/screen1/input-panel";
import type { PeerViewInput } from "@/data/screen1";

/**
 * The answers, corrected WHERE THEY ARE READ BACK — a panel on the result surface
 * rather than a trip to the entry point.
 *
 * **This reverses the rule that "Edit answers" leaves the result, at ANSR's request, and
 * the reversal is worth stating because the previous shape was arrived at deliberately.**
 * The band's four pills were controls once: each answer was its own chevroned button, and
 * that was cut because all four went to the same place and the chevron promised an
 * in-place editor that did not exist. The correct conclusion at the time was one honest
 * button to the form. The conclusion now is the other one: build the editor the chevron
 * was promising.
 *
 * What the trip to the form actually cost is why. Correcting one dropdown tore down a
 * ~2,900px result, mounted a five-band marketing page, and required the visitor to find
 * the submit and rebuild everything — for a revenue band they had mistyped. The result
 * they were reading was destroyed by the act of fixing a detail of it, and there was no
 * way to change their mind: pressing the control was a one-way move, since the entry point
 * has no route back to a result it has not just produced.
 *
 * **Three things about WHERE it renders, and each one is load-bearing.**
 *
 * It is NOT inside the header band. `.gcc-result-band` carries `overflow: hidden` — it has
 * to, because it clips the dotted map, the lattice and the motif — and every control here
 * opens a popup taller than the space beneath it. Inside the band, all four dropdowns
 * would be cut off at the band's foot. So the panel is a sibling of the band, in
 * `ResultSurface`, overlapping its lower edge the way the entry point's form card overlaps
 * the hero's. Same composition, and it is not a coincidence: this is the same form.
 *
 * It is on WHITE. Every control in `input-panel.tsx` was measured on the form card's own
 * fill — `--ansr-grey-500` field boundaries clearing 3:1, the popup's `surface-pale` row
 * fills, the accent-teal label tint on focus. None of those measurements survives being
 * moved onto a teal gradient, and re-measuring a whole form for one placement is how a
 * second, subtly different form gets built.
 *
 * And the CARD's own pull is dropped while it is open, so the panel occupies the overlap
 * rather than fighting the card for it. `ResultSurface` owns that switch, because the
 * negative margin is its.
 *
 * **It collects nothing new.** Same four controls, same six-field contract, same server
 * action. There is no email field, no form, and no stored visitor input anywhere in this
 * codebase, and this panel does not become the exception.
 */
/**
 * Everything the editor needs that the SCREEN does not own, as one prop.
 *
 * The two result screens each hold their own open/closed state — it is UI state about one
 * band on one screen — but the options, the request and its pending and error state all
 * belong to the tool, which owns the phase machine and the server action. Bundled rather
 * than threaded as six props through two screens: the set moves together, and every one of
 * them is meaningless without the rest.
 */
export interface AnswerEditing {
  options: AskOptions;
  pending: boolean;
  error: string | null;
  /**
   * Applies the answers to the screen the visitor is on, resolving to whether it worked.
   *
   * The boolean is what the caller closes the panel on. See `tool.tsx`'s `refine`.
   */
  onApply: (input: PeerViewInput) => Promise<boolean>;
}

/**
 * The panel's own id, for the `aria-controls` on the button that opens it, and the
 * heading's, for the name of the region.
 *
 * Constants rather than `useId`: exactly one editor exists in the document, because
 * exactly one result screen is mounted at a time — and the control that points at it lives
 * in a different component two levels up, which a generated id could only reach by being
 * threaded through the screen that sits between them.
 */
export const ANSWER_EDITOR_ID = "answer-editor";
const ANSWER_EDITOR_HEADING_ID = "answer-editor-heading";

export function AnswerEditor({
  options,
  initial,
  pending,
  error,
  onApply,
  onCancel,
}: {
  options: AskOptions;
  /** The answers as they stand, so a correction starts from them rather than from empty. */
  initial: PeerViewInput;
  pending: boolean;
  error: string | null;
  onApply: (input: PeerViewInput) => void;
  onCancel: () => void;
}) {
  const copy = usePublicCopy();
  return (
    <section
      id={ANSWER_EDITOR_ID}
      aria-labelledby={ANSWER_EDITOR_HEADING_ID}
      className="flex flex-col gap-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          {/* An `h2`, under the band's `h1` and above the card's own `h2`s — so the
              outline gains one level while the panel is open and skips none. It says
              what the panel is FOR rather than restating the control that opened it:
              "Edit answers" is the verb on the button, and a heading repeating a
              button's label is a heading that tells the reader nothing they did not
              just press.

              Teal and Medium with `tracking-display`, which is the entry point's form
              heading exactly — same treatment because it is the same form on the same
              white fill, one step down in size because this panel sits inside a result
              rather than opening a page. */}
          <h2
            id={ANSWER_EDITOR_HEADING_ID}
            className="text-xl leading-tight font-medium tracking-display text-balance text-accent-teal md:text-2xl"
          >
            {copy.editorTitle}
          </h2>
          {/* Light 300 at the reading measure, black rather than muted: it is the one
              sentence that tells a visitor the result updates in place, which is the
              whole change this panel is. */}
          <p className="max-w-measure text-sm leading-normal font-light text-pretty text-text md:text-base">
            {copy.editorLead}
          </p>
        </div>
        {/* **A real labelled control, not a bare glyph.** The panel can also be closed
            by pressing "Edit answers" again — it is a toggle and carries
            `aria-expanded` — but that control is up in the band, which on a phone is
            scrolled off by the time the fourth field is on screen. So the panel carries
            its own way out at its own top edge.

            Icon plus text rather than icon alone: an X on its own is the most
            overloaded glyph there is, and on a panel that has just been opened it reads
            as "clear the form" as readily as "close it". The word settles it.

            **`.gcc-hit-44` for the target, which is the trick `.gcc-context-edit` already
            uses on the control that opens this panel.** The pill is 32px tall, which
            clears the 24px AA floor and is under the 44px this project holds itself to —
            and the identical problem was already solved two elements up the tree, so
            solving it a second way here would be the inconsistency rather than the
            32px. The visible pill does not grow: making this control 44px of ink would
            make the way OUT of the panel the loudest thing at its top edge, which is the
            same defect the note on `.gcc-context-edit::after` records. */}
        <button
          type="button"
          onClick={onCancel}
          className="gcc-hit-44 relative inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-text-muted transition-colors duration-fast ease-standard hover:bg-surface-pale hover:text-text focus-visible:ring-2 focus-visible:ring-accent-teal focus-visible:outline-none"
        >
          <X aria-hidden="true" className="size-4" />
          {copy.editorClose}
        </button>
      </div>

      {/* The entry point's own form, unchanged, with one label swapped. Not a second
          copy of it: validation, the required-field focus move, the industry cascade and
          the revenue-band formatting are all decisions that must not differ between the
          two places a visitor answers these questions. See `InputPanelProps.submitLabel`
          for the one thing that does differ and why it is a prop. */}
      <InputPanel
        {...options}
        initial={initial}
        pending={pending}
        submitError={error}
        onSubmit={onApply}
        submitLabel={copy.editorSubmit}
      />
    </section>
  );
}
