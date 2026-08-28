"use client";

import { ASK } from "./copy";

/**
 * The ask screen's hero, built to the reference's own measured hero anatomy.
 *
 * **Why this is not `ScreenHeader`.** That component is shared by the answer state
 * and Screen 2, and both of them need something this band cannot give them: a
 * MUTED ink for a lead, a facts summary, and a way back. On
 * `--ansr-gradient-hero` a muted ink measures 2.23:1, so a shared header would
 * have had to either give up the reference's ground or ship an illegal pairing on
 * two screens. Those two screens keep `ScreenHeader` and its own gradient, which
 * is capped dark enough for a muted ink; this band is the one place the brand's
 * real display ground is used, and it is white-only by construction.
 *
 * The anatomy, from docs/ansrx-visual-language.md §8, normalised for a 1280
 * container inside an iframe:
 *
 *   - Headline in **under half the band width**. The reference sets ~500 of its
 *     1263, which is 6 of 12 columns once the gutter is counted, so that is how it
 *     is expressed here rather than as a picked max-width.
 *   - **80px at 1.05 leading**, Regular rather than Bold. Both are the reference's,
 *     and the leading is the load-bearing half: at our old `tight` 1.15 a
 *     three-line headline reads as three lines instead of one object.
 *   - The fan filling the trailing half and bleeding off that edge.
 *   - **One pill**, and it is outlined rather than orange. The reference's hero
 *     pill is orange because its hero is the only action in that band; ours is not.
 *     The form's submit directly below is the screen's one real ask, and a screen
 *     with two orange controls has no primary action at all. Same shape, different
 *     fill: both read as actions, only one reads as THE action.
 *
 * Nothing here is fixed, sticky, or measured against the viewport.
 */
export function AskHero({
  headingRef,
  onJumpToForm,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  onJumpToForm: () => void;
}) {
  return (
    <div className="gcc-ground-hero relative overflow-hidden pt-16 pb-20 md:pt-24 md:pb-28">
      {/* Decorative and redundant: everything it could convey is in the text
          beside it. Out of the tab order and out of the accessibility tree.

          Hidden below `md`, where the headline runs the full width and there is no
          empty ground for ornament to occupy. Nothing is lost — the gradient
          carries the band on its own, and on a phone it carries it better. */}
      <div
        className="ansr-motif gcc-motif-inverse gcc-ask-fan hidden md:block"
        aria-hidden="true"
      >
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
        <div className="grid lg:grid-cols-12">
          {/* Six of twelve. The reference's headline occupies under half its band,
              and that proportion is most of why the fan beside it reads as part of
              the composition rather than as wallpaper behind the copy. */}
          <div className="flex flex-col items-start gap-6 lg:col-span-6">
            {/* 14px rather than the 12px the other screens' kickers use. The
                reference's eyebrows are 22px Bold, and at 12px above an 80px
                headline this read as a caption that had drifted upward rather than
                as the label of the band. Bold, because on this ground the only
                variables available are size and weight. */}
            <p className="text-sm font-semibold tracking-caps text-text-inverse uppercase">
              {ASK.kicker}
            </p>

            {/* Regular, not bold, and that is the reference's own weight. At 80px
                with a real display face loaded, Bold reads as shouting and Light
                reads as fashion; Regular is the one that reads as a statement.

                `text-balance` matters more here than anywhere else on either
                screen: an unbalanced five-word headline at this size drops one
                short word onto a line of its own. */}
            <h1
              ref={headingRef}
              tabIndex={-1}
              id="ask-title"
              className={
                "text-4xl leading-display font-regular tracking-display text-balance " +
                "text-text-inverse md:text-6xl lg:text-8xl"
              }
            >
              {ASK.title}
            </h1>

            {/* Light 300, and this is the single biggest tell of the brand — the
                reference's body copy is Light and ansr.com's own CSS says so on
                every paragraph. White rather than a muted tint, because a muted
                tint on this ground is 2.23:1; the size drop from 80px to 20px is
                doing the hierarchy on its own, which is what the reference relies
                on too.

                `text-pretty`, not `text-balance`: this is a two-sentence lead that
                reads better ragged. Pretty only refuses to leave the last word
                stranded. */}
            <p className="max-w-measure text-lg leading-normal font-light text-pretty text-text-inverse md:text-xl">
              {ASK.lead}
            </p>

            {/* The reference puts its pill 21px under the last baseline, which is
                closer than a gap step. `mt-2` on top of the column's `gap-6`. */}
            <button
              type="button"
              onClick={onJumpToForm}
              // Sized against the reference's own pill: 225x49 carrying a 22px
              // label. At 44px with a 16px label it read as a secondary control
              // that had wandered into a display band.
              className={
                "mt-2 inline-flex min-h-12 items-center rounded-full border " +
                "border-border-inverse px-7 text-lg font-medium text-text-inverse " +
                "transition-colors duration-fast ease-standard hover:bg-surface-inverse"
              }
            >
              {ASK.jump}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
