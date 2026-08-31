import type { HeroCopy } from "@/data/schema";
import { AnsrWordmark } from "./ansr-wordmark";
import { DottedWorldMap } from "./dotted-world-map";

/**
 * The brand name, set as the ANSR WORDMARK in the action orange inside the
 * headline.
 *
 * **Matched as a literal token rather than sliced by position**, which is the
 * opposite of the call made for the impact band's heading. There, the highlight is
 * the last word of a fixed string, so a slice would silently move if the heading
 * were reworded — hence two separate copy fields. Here the title is ADMIN-EDITABLE
 * free text, so two fields would mean an admin had to know to split their headline
 * across them. Matching a literal is stable under rewording in a way a slice is
 * not: reword the title however you like and the brand name is still the brand
 * name. Remove it and there is simply no highlight, which is the right degradation.
 *
 * **Only the first occurrence is highlighted, and that is a contrast bound rather
 * than a stylistic preference.** Orange on `--ansr-gradient-hero` measures 4.27:1
 * at the top of the band falling to 2.95:1 by 45% down — so it clears the 3:1
 * large-text floor on the headline's FIRST line (3.62:1 at worst) and fails on its
 * second. The first line always begins at the hero's top padding and is exactly one
 * line-height tall whatever the title's length, so a leading "ANSR" is legal by
 * construction. A second occurrence deeper in a wrapped headline would not be, and
 * is therefore left white.
 *
 * **What lands there is now the drawn lockup rather than the typed word**, which is
 * the one place on either screen where a brand asset is used literally — logos are
 * the exception the adapt-never-paste rule names. It inherits the ink and the cap
 * height of the line it sits in, so the substitution changes what the letters are
 * drawn from and nothing about the composition; `ansr-wordmark.tsx` carries the two
 * measurements that make that true.
 *
 * The rendered heading is still one accessible name — the wordmark is out of the
 * accessibility tree and carries the word beside it, visually hidden.
 */
const BRAND = "ANSR";

function withBrandMark(title: string): React.ReactNode {
  const at = title.indexOf(BRAND);
  if (at === -1) return title;
  return (
    <>
      {title.slice(0, at)}
      <AnsrWordmark className="text-action" />
      {title.slice(at + BRAND.length)}
    </>
  );
}

/**
 * The ask screen's hero: a centred title and one supporting line on the brand's
 * own display ground, and deliberately nothing else.
 *
 * **Why this is not `ResultSurface`'s band.** That band is shared by the answer
 * state and Screen 2, and both of them need something this band cannot give
 * them: a MUTED ink for a lead, a facts summary, and a way back. On
 * `--ansr-gradient-hero` a muted ink measures 2.23:1, so a shared header would
 * have had to either give up the reference's ground or ship an illegal pairing on
 * two screens. Those two screens keep `ResultSurface` and its own gradient, which
 * is capped dark enough for a muted ink; this band is the one place the brand's
 * real display ground is used, and it is white-only by construction.
 *
 * **Leading-aligned and inset, which is back to the reference's own hero anatomy
 * after a centred pass.** The centred version was tried because the band had lost
 * its ornament and a centred block is the honest composition for a band with
 * nothing on either side of the copy. The band has an ornament again — the dotted
 * world map — and with one, centring is the wrong call twice over: the copy sits
 * off-axis from both the graphic and the band, and the graphic has to be pushed to
 * the trailing edge to stay clear of copy that reaches three quarters of the way
 * across. Leading-aligned, the band is two things beside each other and both get
 * more room than the centred version gave either.
 *
 * What did NOT come back from the pre-centred version is the outlined pill under
 * the lead. The form now overlaps this band, so its first field is already on
 * screen and the pill was a control that scrolled you to something you could see.
 *
 * The rest of the anatomy was never about alignment:
 *
 *   - **80px at 1.05 leading**, and the leading is the load-bearing half: at our
 *     `tight` 1.15 a two-line headline reads as two lines instead of one object.
 *   - **Medium 500 rather than Bold**, because the heading contains the drawn
 *     wordmark and the wordmark's own stroke is a Medium. The measurement is
 *     beside the `h1`.
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
    <div className="gcc-ground-hero relative overflow-hidden pt-10 pb-28 md:pt-14 md:pb-40 lg:pt-16 lg:pb-48">
      {/* Decorative and redundant: everything it could convey is in the text
          beside it. Out of the tab order and out of the accessibility tree.

          **Desktop only, and it is `lg` rather than the `md` the fan used.** This
          was read at 768 before it was decided: India lands about seven tenths of
          the way across the frame WHEREVER the frame is, because that is where it
          is on the Earth relative to the window the map draws — and at 768 the
          headline runs nearly the full band, so those seven tenths are behind the
          last word of it. The orange came out from under "Intelligence" and was
          clipped by the viewport at the same time. Nothing about opacity fixes
          that; the collision is geometric.

          So the rule is the one the fan followed for the same reason, one
          breakpoint later: the band has spare ground only when the copy is capped
          well inside it. Below `lg` the gradient carries the band alone, which it
          does well — and on a phone the frame is narrow enough that India's dots
          would merge into a blob anyway.

          **The block-end inset lives in `.gcc-hero-map` and is the FORM CARD's
          overlap**, which is the one measurement this composition duplicates. It
          has to be: the map is centred in the band a visitor can SEE, and the
          bottom of this box is covered by the card — so the number that matters is
          the card's negative top margin in `peer-view.tsx`, not the padding below.
          Change either and the other has to move. */}
      <div className="gcc-hero-map hidden lg:flex" aria-hidden="true">
        <DottedWorldMap />
      </div>

      <div className="relative mx-auto max-w-content px-6 md:px-12">
        {/* **`max-w-card` is not a typo and it holds no card — it is the shared
            leading edge, and it is the single change that made this band and the form
            read as one page.**

            The hero copy and the form card were three different left edges within
            130px of each other: copy at 187, card at 272, the card's own heading at
            320 (measured at 1440). Nothing was misaligned enough to look like a bug
            and nothing agreed, which is precisely the register that reads as
            unfinished. A tuned percentage cannot fix it either — that was the
            previous `ms-[5%]`, and it could not, because the card is CENTRED and
            CAPPED, so the inset that would align them is a different number at every
            viewport width.

            So both bands now derive their leading edge from the same box:
            `max-w-content` for the gutter, then `mx-auto max-w-card` inside it. The
            hero's copy starts where the card starts, at every width, without either
            file knowing the other's numbers. `peer-view.tsx` uses the identical pair
            — and its `px-4` was raised to `px-6` to match, which is what closes the
            last 8px at phone width.

            **The consequence to know before changing `--ansr-container-card`:** it is
            now a composition token rather than a width, so widening the card moves the
            headline. The dot map's leading mask fade is measured against where the
            copy ends, so that moves too — the three are one decision in three files
            and each says so.

            Capped at `max-w-hero` inside that: the reading measure is right for a
            paragraph and far too wide for an 80px headline, which would run to one
            line and leave the supporting line stranded under it. At this cap the
            headline takes two lines on desktop and the two elements share an edge —
            a real edge rather than a centre line, which is what makes the block read
            as one object.

            No manual break anywhere: the wrap is the width's job, so it responds
            to the viewport instead of snapping at one. */}
        <div className="mx-auto max-w-card">
          {/* **The copy now sits a step OUTSIDE the card's leading edge, and the
              outdent is deliberately expressed against that edge rather than
              replacing it.** ANSR asked for the hero to start further left than the
              form. The derivation stays — `max-w-card` above is still what puts the
              two in the same place at every width — and this pulls a fixed step off
              it, so the relationship is "one step left of the card" instead of a
              second independently-tuned inset. The failure the derivation exists to
              prevent was three edges within 130px of each other that agreed on
              nothing; two edges a deliberate 48px apart is a composition.

              **Desktop only, because the room is only there on a desktop.** At `md`
              the card already fills the container between its gutters, so an outdent
              would spend the gutter itself and leave the headline 8px off the
              viewport edge. It engages at `lg` at half strength — 24px, where the
              card has 16px of margin to give — and reaches the full step from `xl`,
              where there is 144px.

              **From `xl` the step is the WHOLE margin — 144px — so the copy sits on
              the container's own gutter.** ANSR asked for it further left again, and
              the gutter is where "further left" runs out: past it the copy is off the
              page's own edge. So the two bands are now a deliberate 144px apart at
              desktop rather than 48, and the derivation is still what says WHERE
              apart — `max-w-card` above minus the card's full margin is exactly the
              container gutter at every width from `xl`, without this file knowing
              either number.

              **The cap moved off this block and onto the two children, and that is
              the other half of the same change.** A single cap here made the
              paragraph inherit a limit chosen for the headline: `max-w-hero` is what
              keeps an 80px display line from running out as a strapline, and it broke
              a 137-character sentence to three lines with a two-word orphan. The h1
              keeps it; the lead takes `max-w-lead`, 6rem wider.

              **The two numbers are one decision: the copy shifts LEFT by the same 6rem
              the lead gains on the right.** So the block's trailing edge is unchanged
              at every width, and the dot map's leading mask fade — measured against
              where this copy ends — did not have to move at all. Widen the lead without
              shifting, and the sentence runs onto the map's visible field. */}
          <div className="flex flex-col items-start gap-6 text-left lg:-ms-6 xl:-ms-36">
          {/* **Medium 500 at 80px, and the weight is MEASURED off the wordmark
              rather than chosen.** This heading is the one place in the tool where
              drawn letters and set letters sit on the same baseline, so "GCC
              Intelligence" is not free to be any weight it likes — it either matches
              the lockup beside it or the line reads as two fonts.

              The lockup's own stroke, from its geometry: the N's stem is 5.18 units
              against a cap height of 37.86, a ratio of 0.137. Hanken Grotesk's stems
              against its own cap height are ~0.11 at Regular, ~0.138 at Medium and
              ~0.20 at Bold. So Medium is the match, to within a rounding error, and
              Bold — which is what this shipped as — was half again as heavy as the
              mark it sat next to. That is the mismatch, and it is why neither Regular
              nor Semibold is the answer either.

              **Tracking follows from the same measurement.** `tracking-display` is
              -0.02em, and the lockup is not tight: its A-to-N sidebearing gap is 3.96
              units, which against the implied 52.6-unit em is ~0.075em — normal to
              slightly loose for a geometric grotesque at this size. So this heading
              takes `tracking-body` (0) where every other display heading in the tool
              takes `tracking-display`. It is the only heading with a drawn word in
              it; it is the only one that should differ.

              The weight drop costs presence against the white card rising into the
              band from below, which is what the Bold pass was buying. Two things pay
              it back: the block is now leading-aligned, so it owns a column instead
              of competing across the middle, and 80px is kept rather than dropped to
              72 — it still wraps to two lines at the hero cap, and two lines are a
              block where one is a strapline.

              `text-balance` still earns its place, though less than it did centred:
              on a left-aligned block a stranded last word is at the leading edge
              rather than dead centre, which is a far quieter failure. */}
          <h1
            ref={headingRef}
            tabIndex={-1}
            id="ask-title"
            className={
              "gcc-enter max-w-hero text-4xl leading-display font-medium tracking-body " +
              "text-balance text-text-inverse md:text-6xl lg:text-8xl"
            }
            style={{ "--gcc-enter-index": 0 } as React.CSSProperties}
          >
            {withBrandMark(copy.title)}
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
          {/* **`max-w-lead`, not `max-w-measure`, and the size step moved from `lg` to
              `xl`.** Two lines is the target and each breakpoint gets there its own
              way: from `xl` the block has shifted onto the container gutter and this
              cap is 6rem wider, so 24px fits in two; between `lg` and `xl` the outdent
              is only 24px — the card has 16px of margin to give there — so the room is
              not available and the size stays at 20px instead, which fits two lines at
              the narrower cap. A three-line lead under a two-line headline puts a
              two-word orphan at the block's leading edge.

              **The wider cap is gated on `xl` for the same reason the outdent is.** Set
              unconditionally it widened the block at `lg` too, where nothing shifted
              left to pay for it — the sentence's trailing edge moved 96px right, onto
              the part of the band the dot map's mask actually lets through. Measured on
              the render: 744 before, 840 after, against a leading fade that completes
              around 625 at that width. */}
          <p
            className={
              "gcc-enter max-w-hero text-lg leading-normal font-light text-pretty " +
              "xl:max-w-lead " +
              "text-text-inverse md:text-xl xl:text-2xl"
            }
            style={{ "--gcc-enter-index": 1 } as React.CSSProperties}
          >
            {copy.lead}
          </p>
          </div>
        </div>
      </div>
    </div>
  );
}
