import type { HeroCopy } from "@/data/schema";

/**
 * The ask screen's hero: a centred title and one supporting line on the brand's
 * own display ground, and deliberately nothing else.
 *
 * **Why this is not `ScreenHeader`.** That component is shared by the answer
 * state and Screen 2, and both of them need something this band cannot give
 * them: a MUTED ink for a lead, a facts summary, and a way back. On
 * `--ansr-gradient-hero` a muted ink measures 2.23:1, so a shared header would
 * have had to either give up the reference's ground or ship an illegal pairing on
 * two screens. Those two screens keep `ScreenHeader` and its own gradient, which
 * is capped dark enough for a muted ink; this band is the one place the brand's
 * real display ground is used, and it is white-only by construction.
 *
 * **Centred, not leading-aligned, and that changed what the band can hold.** The
 * previous version was the reference's own hero anatomy: headline in six of
 * twelve columns, the fan filling the trailing half, an outlined pill under the
 * lead. A centred composition has no trailing half to give the ornament and no
 * empty column to park a control in, so both went — the pill because the form now
 * overlaps this band and its first field is already visible, which is the whole
 * job the pill used to do.
 *
 * What survives from that anatomy is the part that was never about alignment:
 *
 *   - **80px at 1.05 leading**, Regular rather than Bold. Both are the
 *     reference's, and the leading is the load-bearing half: at our `tight` 1.15
 *     a two-line headline reads as two lines instead of one object.
 *   - **Light 300 for the supporting line**, which is the brand's single biggest
 *     typographic tell.
 *   - Hierarchy carried by SIZE AND WEIGHT in one ink, because that is what the
 *     ground allows.
 *
 * **The bottom padding is sized for the card that overlaps it, not for the copy.**
 * `pb` here plus the card's negative top margin in `peer-view.tsx` are one
 * measurement split across two files; the hero's own visible bottom edge is
 * further down than its padding suggests, because the card is drawn over it.
 *
 * Nothing here is fixed, sticky, or measured against the viewport.
 */
export function AskHero({
  headingRef,
  copy,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  copy: HeroCopy;
}) {
  return (
    <div className="gcc-ground-hero relative overflow-hidden pt-16 pb-28 md:pt-24 md:pb-40 lg:pt-28 lg:pb-48">
      {/* Decorative and redundant: everything it could convey is in the text
          beside it. Out of the tab order and out of the accessibility tree.

          Hidden below `md`, where the headline runs the full width and there is
          no empty ground for ornament to occupy. Nothing is lost — the gradient
          carries the band on its own, and on a phone it carries it better. */}
      {/* No `gcc-motif-inverse` here, deliberately. That class only sets
          `--ansr-motif-opacity` to the inverse posture, and `.gcc-ask-fan` sets the
          same custom property to a lower, MEASURED value — see globals.css for the
          contrast reason. Both are single-class selectors, so whichever appears
          later in the stylesheet wins; carrying both made the fan's opacity depend
          on the order of two rule blocks, which is exactly the kind of thing that
          silently reverts. One class owns it. */}
      <div className="ansr-motif gcc-ask-fan hidden md:block" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element -- decorative,
            fixed intrinsic ratio, and not worth an optimiser round trip. */}
        <img
          src="/brand/ask-fan.svg"
          alt=""
          width={1260}
          height={586}
          className="block h-auto w-full"
        />
      </div>

      <div className="relative mx-auto max-w-content px-6 md:px-12">
        {/* Centred and capped, and the cap is the reason the block reads as one
            object rather than as a banner. `max-w-measure` is the reading measure
            — right for a paragraph, far too wide for an 80px headline, which
            would run to a single line most of the way across a 1280 canvas and
            leave the supporting line stranded under it. Narrower than the
            measure, the headline takes two lines on desktop and the two elements
            share an edge.

            No manual break anywhere: the wrap is the width's job, so it responds
            to the viewport instead of snapping at one. */}
        <div className="mx-auto flex max-w-hero flex-col items-center gap-6 text-center">
          {/* **Bold at 80px, and this reverses the previous pass on purpose.** That
              pass set Regular because it is the weight the reference's own hero
              uses, and read against the reference alone that was right. Read against
              this page it was not: the reference's hero is the only thing in its
              band, while ours has a white card rising into it from below, and
              Regular white on the gradient loses that contest — the eye lands on the
              card and the headline reads as a caption above it. Weight is the only
              variable available, since the ground admits exactly one ink.

              80px rather than 72, for the same reason. It wraps to two lines at the
              hero measure, which the brief allows and which helps: two bold lines
              are a block, one line is a strapline.

              `text-balance` matters more here than anywhere else on either
              screen, and more again now that the block is centred: an unbalanced
              centred headline at this size drops one short word onto a line of
              its own, dead centre, where it is the most obvious thing on the
              band. */}
          <h1
            ref={headingRef}
            tabIndex={-1}
            id="ask-title"
            className={
              "text-4xl leading-display font-bold tracking-display text-balance " +
              "text-text-inverse md:text-6xl lg:text-8xl"
            }
          >
            {copy.title}
          </h1>

          {/* White rather than a muted tint, because a muted tint on this ground
              is 2.23:1. The size drop from 72px to 20px is doing the hierarchy on
              its own, which is what the reference relies on too.

              `text-pretty`, not `text-balance`: this is a long single sentence
              that reads better ragged, and pretty only refuses to leave the last
              word stranded. Capped at the reading measure inside the already
              narrower block, so the line length stays comfortable even when the
              headline above it is short. */}
          {/* Light 300 stays — it is the brand's single biggest typographic tell,
              and ansr.com sets it on every paragraph. What changed is the size: at
              18/20px under an 80px bold headline the line read as small print rather
              than as the second element of a two-part block. 24px Light against 80px
              Bold is a real interval in both axes, which is what carries hierarchy on
              a ground that allows only one ink. */}
          <p className="max-w-measure text-lg leading-normal font-light text-pretty text-text-inverse md:text-xl lg:text-2xl">
            {copy.lead}
          </p>
        </div>
      </div>
    </div>
  );
}
