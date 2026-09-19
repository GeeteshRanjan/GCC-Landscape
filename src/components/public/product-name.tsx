import { DEFAULT_PRODUCT_NAME } from "@/data/schema";
import { cn } from "@/lib/utils";

/**
 * `GCC ATLAS` — the product's own name, SET IN TYPE, and the one place it is spelled.
 *
 * **It was two supplied SVG outlines and it is type now, at the project owner's
 * instruction.** `gcc-wordmark.tsx`, `atlas-wordmark.tsx` and `product-wordmark.tsx` are
 * deleted, and with them a shared height derived from two cap-band fractions, a word space
 * derived from the headline's own, a `vertical-align` correction per mark, and an `sr-only`
 * node standing in for text the marks could not contribute. Git holds all of it. What
 * replaces the lot is a span with two classes and no numbers of its own.
 *
 * ## It is the SHIPPED display face at the SHIPPED display tracking
 *
 * `font-display` and `tracking-display`, which is to say Moderat Medium at -0.02em — the
 * same face and the same tracking token every other display heading in the tool takes.
 * There is no constant here, no fifth font file and nothing for anyone to re-measure.
 *
 * ## Moderat Extended was tried for the width and REVERTED, which is the thing to know
 *
 * The obvious move is to match the artwork's letter widths, and the artwork's `GCC` is
 * Extended-shaped: its `G` measures 1.0655 of cap height against Extended Medium's 1.0643,
 * where the normal widths run 0.875 to 0.957. So Extended shipped for one pass.
 *
 * **It was wrong because the two supplied files were never one typeface.** `ATLAS` is not
 * Extended and is not Moderat at all — its L-to-S proportion is 1.155, and all ten cuts of
 * the family sit between 1.219 and 1.319. So per-letter fidelity to one half guarantees
 * infidelity to the other: Extended ran `ATLAS` 16.6% wide and the whole lockup 10.8% wide
 * at the same cap height, which the project owner read, correctly, as the name looking
 * short and vertically pressed. **A lockup's overall proportion is what a reader sees, not
 * its per-letter widths**, and that is the lesson rather than the specific face.
 *
 * What ships instead lands, measured against the drawn lockup it replaces:
 *
 *   - the LOCKUP within 3.7%, against Extended's +10.8%
 *   - `ATLAS` within 0.4%
 *   - `GCC` 9.6% narrow, which is the half whose artwork is not Moderat-consistent anyway
 *   - letterfitting within 0.31% of the ANSR wordmark's own, the best of any candidate
 *
 * That last one is why `tracking-display` is right rather than merely convenient: the ANSR
 * wordmark's interior ink gaps average 0.1032 of cap height and this sets 0.1029, so
 * `ANSR GCC ATLAS` reads at one letterfitting throughout. Re-derive the whole comparison
 * with `npm run wordmark:measure`; do not re-derive it against the artwork, which is not a
 * reachable target in this family and will send you back to Extended.
 *
 * ## `whitespace-nowrap` is load-bearing NOW in a way it was not before
 *
 * As two SVGs the name could not break internally — there is no break opportunity inside an
 * atomic inline, and the space between the halves was a CSS margin rather than a character.
 * As type it is `GCC` + U+0020 + `ATLAS`, so the line breaker will happily put the product's
 * name across two lines. That is a naming failure of exactly the kind the hero's manual
 * `<br>` exists to prevent, so the name holds itself together here rather than at each call
 * site.
 */

/**
 * The product's name as a reader receives it.
 *
 * **It is the SHIPPED DEFAULT of `siteContent.hero.productName` now, not a constant this
 * module owns** — which is why it is re-exported from `schema.ts` rather than typed here.
 * The entry point draws the admin's value through the `name` prop below; the result
 * screens draw this. One spelling, two surfaces, and a rename in admin cannot leave the
 * component behind.
 *
 * **The literal-substring rule it used to carry is GONE.** While the hero headline was a
 * single editable `title`, `withProductMark` searched it for this exact string and a
 * respelt headline silently lost the name's own setting. The name is its own field now, so
 * there is nothing to match. Exported so a spec can assert a heading without typing the
 * words.
 */
export const PRODUCT_NAME = DEFAULT_PRODUCT_NAME;

export function ProductName({
  name = PRODUCT_NAME,
  className,
  leadClassName,
}: {
  /**
   * The name to set, where it is not the shipped one.
   *
   * **Only the entry point passes it, and it has to**: `siteContent.hero.productName` is
   * admin-editable, and a hero drawing this module's constant while the admin's value sat
   * unrendered is the "editable field that draws nothing" failure. The result screens take
   * the default, because their `h1` is the brand lockup plus the product's name and nothing
   * on those screens is editable copy.
   */
  name?: string;
  className?: string;
  /**
   * The space between whatever PRECEDES the name and its first letter.
   *
   * **The caller's decision and deliberately not this component's**, unchanged in contract
   * from the component this replaces. What sits before the name differs by surface — the
   * run of an admin-editable headline on the entry point, the full ANSR lockup on the
   * result screens — and only the caller knows how much trailing clearance that thing
   * carries of its own.
   */
  leadClassName?: string;
}) {
  return (
    <span
      className={cn(
        /* **The face and the tracking are restated; the WEIGHT is deliberately inherited.**
           `font-display` and `tracking-display` are the two things this name is measured
           for — see the block comment — and restating them means a heading cannot set the
           product's name at a fitting it was not measured at.

           The weight is the opposite case: the name must read as part of the sentence it
           sits in, so it takes whatever its heading takes — Medium 500 on both surfaces
           today, and a name that STATED 500 would be visibly wrong the moment either
           heading moved. It did state `font-medium` for a pass, which was indistinguishable
           from inheriting it right up until the entry point's headline went Bold for a pass
           and the name stayed behind. That is the case the inheritance exists for, and it
           is why the value is not restated now that both are Medium again. */
        "font-display tracking-display",
        // See the block comment — as type, the name can break at its own space.
        "whitespace-nowrap",
        leadClassName,
        className,
      )}
    >
      {name}
    </span>
  );
}
