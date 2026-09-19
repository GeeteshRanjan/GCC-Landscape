import { ProductName } from "@/components/public/product-name";

import type { HeroCopy } from "@/data/schema";
import { cn } from "@/lib/utils";
import { DottedWorldMap } from "./dotted-world-map";

/**
 * The hero's four vertical decisions, as the classes that state them.
 *
 * **Chosen by the project owner from five compositions built at `/variants/logo`**, which is
 * deleted with `hero-layouts.ts`, `hero-variant-harness.tsx` and `AskHero`'s `layout` prop.
 * The four rejected relationships are in the style lock: the lockup and title as one tight
 * block, the same masthead with the brand larger, a brand-led band, and the lockup pinned to
 * the band's trailing corner where it costs no height.
 *
 * **They are stated as SEPARATE constants rather than a layout object because each one is a
 * different KIND of decision.** `HERO_SHOULDER` belongs to the band, `HERO_LOGO` to the mark,
 * and the two gaps to the junctions between elements. A single object made them look like one
 * knob, which is what a chooser needs and what shipped code should not have.
 *
 * **Every distance here is OPTICAL — ink to ink — which is only true because of the leading
 * trims below.** The shoulder measures to the lockup's own ink, `HERO_LOGO_GAP` from that ink
 * to the headline's capitals, and `HERO_LEAD_GAP` from the headline's last ink to the lead's
 * capitals. Verified on a real render at 1440 and 390: each draws exactly its declared value.
 */
const HERO_SHOULDER = "pt-8 md:pt-12 lg:pt-16";

/**
 * The lockup's drawn height.
 *
 * **Set by the WORDMARK's letters against the lead's type, never by the artboard** — see
 * `AnsrLockup` for why the first attempt at 24/32px made the brand the smallest thing on the
 * band. At these heights the letters draw at 18.3 and 23.3px against a 16 and 20px lead.
 */
const HERO_LOGO = "h-11 md:h-14";

/** Lockup ink to the headline's capitals: 20px on a phone, 24px from `md`. */
const HERO_LOGO_GAP = "mb-5 md:mb-6";

/** The headline's last ink to the lead's capitals, matched to the gap above the title. */
const HERO_LEAD_GAP = "mt-5 md:mt-6";

/**
 * **EVERY VERTICAL INTERVAL ON THIS BAND IS DECLARED AS AN OPTICAL DISTANCE — INK TO INK —
 * AND THE TYPE'S OWN LEADING IS TRIMMED TO MAKE THAT TRUE.** This is the fix for what read
 * as an awkward gap under the lockup, and the awkwardness was real and measurable rather
 * than a matter of taste.
 *
 * A line box is not the ink in it. The first ink under the lockup sits 0.186em below the top
 * of its line box at `leading-display` — half-leading, plus the distance from the face's
 * ascent down to the drawn wordmark's cap band — so a declared 20px under the lockup DREW
 * 31.7px on desktop before any of this. The lead's capitals sit 0.42em of ITS size below its
 * own line box, so a declared 24px between the two drew 29.3px. Two consequences, both
 * visible: the intervals came out in the wrong ORDER, with more air under the title than above
 * it while the code said the opposite; and each error scaled with a DIFFERENT font size, so
 * the two gaps drifted apart as the viewport changed — which is why the band's proportions
 * moved with width in a way nobody had chosen.
 *
 * **THE BASELINE JUNCTION IS A PAD, NOT A TRIM, AND THAT SIGN IS THE INTERESTING PART.**
 * `leading-display` is 1.05 against a face whose ascent and descent sum to 1.2em, so the
 * half-leading is NEGATIVE — the box holds only 0.125em below the baseline while Moderat's
 * descender ink runs 0.21em deep, and the headline's last line therefore hangs 0.085em BELOW
 * its own box. The correction there adds space rather than removing it, and a fourth trim in
 * the obvious direction is how this junction ends up 6px tight.
 *
 * **Each correction is `em` of the element it sits on, which is what makes it free at every
 * breakpoint.** `HERO_TRIM_CAP` and `HERO_PAD_BASELINE` are the headline's, resolving against
 * 30, 48 and 72px in turn; `HERO_TRIM_LEAD_CAP` is the lead's, against 16, 18 and 20px. That
 * split is also why one number could not have covered both.
 *
 * **ALL THREE ARE MODERAT'S, RE-MEASURED WHEN THE BRAND'S OWN FACE LANDED, and the sizes of
 * the three changes are the argument for re-measuring rather than porting.** Against Hanken
 * Grotesk these were 0.162 / 0.033 / 0.387. The cap trim barely moved, because the ink it
 * measures to is a drawn SVG and only the BASELINE under it shifted; the lead's moved a step,
 * being pure font metrics; and the baseline pad nearly tripled, because Moderat's descenders
 * are deep. A face swap does not move these by one factor.
 *
 * **MEASURED ON A REAL RENDER, AFTER `document.fonts.ready`, WITH A DESCENDER IN THE SAMPLE
 * AND A CLIP THAT REACHES PAST THE BOX.** Each of those cost a pass. Canvas text metrics taken
 * before the webfont resolves silently describe the FALLBACK face, which sent every constant
 * 0.029em out; measuring the last line's ink with an all-capitals sample puts its bottom a
 * descender too high, which overstated this junction by 14px; and rasterising the element's
 * own bounding box TRUNCATES the ink that hangs below it, which is the very thing
 * `HERO_PAD_BASELINE` exists for and which reported the error as nearly zero. The check is
 * that each interval draws its declared value at 1440 and 390 — verify that, never the
 * constants. As shipped: 64 / 24.4 / 24.3 at 1440, 48 / 24.3 / 23.7 at 768, 32 / 19.2 / 21.1
 * at 390, the residue being the integer rounding a browser applies to a small line box.
 *
 * Re-measure all three if the display face changes or if `leading-display` moves. The symptom
 * of a stale correction is an interval that looks wrong while the code looks right, which is
 * exactly the state this replaced.
 */
const HERO_TRIM_CAP = "-mt-[0.186em]";
const HERO_PAD_BASELINE = "mb-[0.085em]";
const HERO_TRIM_LEAD_CAP = "-mt-[0.42em]";

/**
 * ANSR's full lockup, on its own above the headline.
 *
 * **THE BRAND IS NOT ON THE HEADLINE'S OWN LINE, at the project owner's instruction, and
 * `AnsrSunMark` is DELETED rather than left unused.** The radial mark sat inline before
 * `GCC ATLAS` for two passes at the letters' own scale, which made every question about it a
 * question about the line box — the mark had to be centred on the letters' ink, held under
 * the strut's ascent, and scaled by a transform past that ceiling, all so the second line
 * would not move. Off the line, none of that applies: the lockup is an ordinary block in the
 * band's own vertical rhythm and the `h1` is type again. The measurements are in git, and the
 * one finding that outlives them is in `docs/traps.md`.
 *
 * **IT IS THE FULL LOCKUP, so the brand's name is stated by ARTWORK where the type must not
 * state it.** That is what keeps this clear of the rule that took the ANSR WORDMARK out of
 * the headline: the objection there was a sentence opening with two names, and this is not in
 * the sentence. Same relationship the impact band and both result screens' `h1` already have.
 *
 * **`ansr-logo-on-dark.svg`, NOT `ansr-logo.svg`, and that is not a preference.** The
 * light-ground file's wordmark is `currentColor`, which inside an `<img>` resolves against
 * the image's own document and comes out near-black — invisible on this gradient. The on-dark
 * file is the brand's own dark-ground lockup: mark in the action orange, wordmark in white.
 * Used LITERALLY, which is the one exception the brand rules make for a logo, and served from
 * `public/brand/` so no component holds a second copy of the artwork.
 *
 * **THE SIZE IS SET BY THE WORDMARK'S LETTERS AGAINST THE LEAD'S TYPE, WHICH IS A CORRECTION
 * OF THE FIRST ATTEMPT.** The artboard is 253 x 91 with the letters occupying 37.9 of those
 * 91 units, so a 32px lockup draws its name at 13.3px — smaller than the 20px lead beneath
 * it, which is how the brand ended up the smallest type on the band. Sizing to the lead's
 * CAP height was the error: a cap height is not a type size. At `h-11 md:h-14` the letters
 * draw at 18.3 and 23.3px, at or just above the lead's own size, which is what a brand line
 * over a 72px title needs.
 *
 * **LAYOUT: it takes the headline's own leading edge and the space under it is its own.** It
 * sits inside the same `max-w-card` box and the same outdent wrapper the copy uses, so its
 * leading edge is the headline's at every width — which is also the form card's, the
 * alignment `--ansr-container-card` exists to hold. The gap below is `HERO_LOGO_GAP` on this
 * element, an optical distance to the headline's cap, and the copy column carries no `gap` at
 * all: every interval on the band is one declaration on one element.
 *
 * `alt="ANSR"` because the mark is the brand and nothing else on the band states it. It is
 * outside the `h1`, so the heading's accessible name is the title alone — which is what it
 * was before the inline mark, and what the specs assert with `toHaveText`.
 */
function AnsrLockup() {
  return (
    <img
      src="/brand/ansr-logo-on-dark.svg"
      alt="ANSR"
      width={253}
      height={91}
      className={cn(
        "gcc-enter block w-auto shrink-0",
        HERO_LOGO,
        HERO_LOGO_GAP,
      )}
      style={{ "--gcc-enter-index": 0 } as React.CSSProperties}
    />
  );
}

/**
 * The tagline's size, as a FRACTION OF THE PRODUCT NAME'S OWN — which is what makes the
 * two halves of the headline draw to almost exactly the same width.
 *
 * **The requirement is the project owner's: "Benchmark against your peers" should run A
 * LITTLE LONGER than `GCC ATLAS`.** 28 characters under 9 means the only way there is a size
 * ratio, and the ratio is a MEASUREMENT rather than a taste call.
 *
 * **MEASURED AS INK, not as advance width, because ink is what a reader compares.** An
 * advance width carries the trailing letter-spacing and both sidebearings, so the two
 * measures disagree by about a point and a half: rasterised at 1440, 0.39em drew the tagline
 * at 97.0% of the name's ink and 95.9% of its advance. **0.42em lands the ink at 104.5%** —
 * longer, and visibly so, without reaching a second line at any width. The exact-match
 * values are 0.4022em on ink and 0.4068em on advance; both are recorded because a future
 * "make them equal" needs to know which one is being asked for.
 *
 * It was 0.39em for one pass, at 97% — asked for as "almost fill" and then read as slightly
 * short. Do not adjust it by eye: the difference between 97% and 104% is 28px at 1440, and
 * the difference between right and wrong here is smaller than that.
 *
 * **THE RATIO IS A PROPERTY OF THE WEIGHT AS WELL AS THE FACE, which is why it cannot be
 * carried across a weight change.** Moderat's widths differ by cut, so the exact-match
 * fraction is 0.4068em at Medium 500, 0.4137 at Regular 400 and 0.4233 at Light 300. The
 * tagline inherits the heading's Medium; setting it Light without moving this number would
 * draw it 4% narrow. See the note at the call site for why Light is not on offer here.
 *
 * **It is stated in `em` and NOT in px steps, which is the whole reason there is one
 * number.** The name steps 38 / 60 / 72px across three breakpoints; an em fraction of the
 * `h1`'s own size holds the width match at every one of them, and at any size an admin's
 * longer name forces. Three px values would be three chances for the match to be right at
 * one width and wrong at the others — which is the failure the band's vertical intervals
 * already record.
 *
 * **THE FLOOR IS A HIERARCHY CONSTRAINT AND IT NO LONGER COSTS THE RATIO ANYTHING.** At the
 * phone's 38px name, 0.42em is 16.0px — level with the 16px Light lead beneath it, so the
 * tagline would stop being a step above the thing it introduces. `max()` holds it at 18px
 * there, which draws 118% of the name: further past it than the desktop 104.5%, and in the
 * same direction, so the phone overshoots the brief rather than contradicting it. The floor
 * stops binding at about a 43px name, so `md` and up are the measured figure.
 */
const HERO_TAGLINE_SIZE = "text-[max(1.125rem,0.42em)]";

/**
 * **THE COLUMN'S OPTICAL LEADING EDGE IS ITS BOX EDGE, BECAUSE THE ANSR LOCKUP'S INK IS
 * FLUSH TO IT — and the headline was the one thing not on it.**
 *
 * Measured on the shipped render at three widths, as each element's ink inset from its own
 * box, in em of its own size: the lockup 0.0000, the name 0.0600, the tagline 0.0756, the
 * lead 0.0695. Every one of those is a left sidebearing, and they are stable to a thousandth
 * of an em across 1440 / 768 / 390 — so the rag is not a rounding artefact, it is the type.
 *
 * **The absolute drift is what makes it visible, and it is the NAME that is out of line
 * rather than the tagline.** A sidebearing scales with the type, so at 72px the name's
 * 0.06em is 4.4px while the tagline's larger 0.0756em is only 2.1px at 28px — the headline
 * therefore sits 2.3px INSIDE a column everything else holds to within 1.4px, and 4.4px
 * inside the brand mark directly above it. Read from the page that presents as the tagline
 * poking out to the left, which is how it was reported; the fix is to pull the headline back
 * to the edge, not to push the tagline off it.
 *
 * So the name and the tagline each take a negative inline-start margin equal to their own
 * sidebearing, and all three — mark, name, tagline — share one ink edge.
 *
 * **Each is `em` OF ITS OWN ELEMENT, which is what makes this floor-proof.** The tagline's
 * size is normally a fraction of the `h1` but is clamped on a phone, so a correction stated
 * in em of the HEADING would be right at `md` and wrong at 390. In em of the tagline it is
 * its sidebearing at whatever size the tagline ends up.
 *
 * **THE LEAD IS DELIBERATELY NOT CORRECTED, and that is a rule rather than an omission: a
 * paragraph's optical edge is its BOX.** Only its first line begins with a letter anyone
 * chose — lines two and three start whereever the wrap falls, so shifting the block by its
 * first glyph's sidebearing would hang every other line 1.4px outside the column to bring
 * one line into it. Single-line display type is the only type that can be optically aligned,
 * which is exactly the two elements corrected here.
 *
 * Verify by rasterising on a FLAT ground with the dot map hidden, the way
 * `scripts/measure-hero-ink.mjs` does; on the live gradient a threshold high enough to
 * reject the map also eats the antialiased edge of a curve. Canvas `measureText` reports
 * `G`'s sidebearing as 0.024em and is simply wrong about this render — the third time in one
 * pass that canvas metrics disagreed with the pixels. See `docs/traps.md`.
 */
const HERO_NAME_OPTICAL = "-ms-[0.060em]";
const HERO_TAGLINE_OPTICAL = "-ms-[0.076em]";

/**
 * **`withProductMark` AND THE MANUAL `<br>` ARE BOTH DELETED, and the second one is the
 * consequence worth recording.** While the headline was one admin-editable `title`, this
 * module had to FIND the product's name inside it — a literal two-word token match, silent
 * when it failed — and then force a break after it below `lg`, because `text-balance` ran
 * the name on as the first two words of a sentence rather than as the thing the page is
 * called. That was a naming failure dressed as a ragging one, patched with a `<br>` that
 * `lg:hidden` turned off again on desktop.
 *
 * With the name on its own FIELD it is its own block, so it owns its own line at every
 * width by construction. Nothing matches, nothing can silently fail to match, and there is
 * no manual break to keep in step with a font size. `text-balance` / `text-pretty` now
 * apply only to the tagline, where ragging genuinely is the width's decision.
 *
 * **THE NAME IS ONE INK, at the project owner's instruction, and nothing passes
 * `leadClassName` here.** It took `--ansr-action` from `md` up for one pass, under two
 * measured gates: only where the name LEADS, because the orange on this gradient falls from
 * 4.27:1 at the top of the band to 2.95:1 by 45% down; and only from `md`, because the dot
 * map's own dots cost up to 1.77 of ratio at phone widths and took it to 2.33:1 at 320.
 * Both gates are gone with the colour, and the measurements are kept because they are the
 * cost of putting it back.
 *
 * **The band still has its one orange and it is `AnsrLockup`'s mark** — the accent moved
 * off the type entirely, onto a logo, where no contrast gate applies. `ProductName`'s
 * `leadClassName` is untouched and still live: the result screens' `h1` uses it for the gap
 * to the ANSR lockup.
 */

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
 *   - **Medium 500 rather than Bold**, at the project owner's instruction. It
 *     was originally forced by the drawn wordmark on this line and is now a
 *     preference; the argument and the stem measurements are beside the `h1`.
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
    // **The phone step is budgeted against the phone, where it used to be the desktop
    // composition taken down by a smaller multiplier.** `pt-10 pb-28` / `-mt-20` was the
    // same headline-shoulder-card strategy as `lg:pt-16 lg:pb-48` / `lg:-mt-32`, and the
    // strategy is right — what was wrong is that a desktop band has room to spare and a
    // phone band does not, so a proportional reduction still spent a disproportionate
    // share of the one screen a visitor arrives on. The top shoulder comes down to 32px,
    // which is enough to seat a 30px headline and no more, and the bottom pairs with a
    // shallower card pull in `peer-view.tsx` — the two are one measurement and neither
    // number means anything alone.
    //
    // **The top shoulder is the LAYOUT's now, and it is an optical distance.** The
    // headline's own leading is trimmed at the cap (see `HERO_TRIM_CAP`), so this padding
    // measures to the first INK on the band rather than to a line box — which is what makes
    // it comparable to the intervals below it. The bottom padding is unchanged and still
    // pairs with the card's pull in `peer-view.tsx`.
    <div
      className={cn(
        "gcc-ground-hero relative overflow-hidden pb-24 md:pb-40 lg:pb-48",
        HERO_SHOULDER,
      )}
    >
      {/* Decorative and redundant: everything it could convey is in the text
          beside it. Out of the tab order and out of the accessibility tree.

          **It renders at every width, and India is the subject at every one of them —
          what changes is how far in the frame is cropped.** From `lg` India sits at
          ~75% across the band, clear of a headline capped well inside the leading half.
          Below `lg` the copy spans the band, so there is no column to hold the graphic
          clear of; the frame zooms IN instead, which is what makes India resolve as its
          own outline rather than as the lozenge it used to be. The reasoning is a
          dot-to-pitch ratio and it is written out in `.gcc-hero-map`'s two mobile
          blocks, not here. Contrast is carried by the ink at those widths: white copy
          clears the body floor over the field everywhere the two meet.

          **The block-end inset lives in `.gcc-hero-map` and is the FORM CARD's
          overlap**, which is the one measurement this composition duplicates. It
          has to be: the map is centred in the band a visitor can SEE, and the
          bottom of this box is covered by the card — so the number that matters is
          the card's negative top margin in `peer-view.tsx`, not the padding below.
          Change either and the other has to move. */}
      <div className="gcc-hero-map flex" aria-hidden="true">
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
          {/* **The copy sits a step OUTSIDE the card's leading edge, at the project
              owner's preference.** `max-w-card` above puts the two in the same place at
              every width, and this pulls a fixed step LEFT off that edge: 24px at `lg`,
              where the card has margin to give, and the whole 144px container gutter
              from `xl`, where the copy sits on the page's own gutter. So the hero and
              the form are a deliberate step apart rather than flush.

              **The dot map's leading fade is coupled to where this copy ENDS, not
              where it starts.** With the outdent, the copy ends ~64% of the band and
              India sits at ~75%; the fade in `.gcc-hero-map` completes between them.
              The child caps below hold the trailing edge steady — `max-w-hero` on the
              headline, `max-w-lead` on the lead — so the fade does not move when the
              font size does. `max-w-card` here, the fade there, and those caps are one
              composition in two files. */}
          {/* `gap-5` on a phone, `gap-6` from `md`. The headline and the lead are two
              halves of one statement and the smaller step reads as such at 30px; at 48px
              and up the larger one is what keeps them from touching. */}
          {/* **The lockup is INSIDE the outdent wrapper and OUTSIDE the copy column.**
              Inside, so it takes the same leading edge as the headline at every width —
              the alignment `max-w-card` above exists to hold, shared with the form card.
              Outside the column, so the space under it is its own margin: the column's
              `gap` is a measured decision between the headline and the lead, and spending
              it here would move one of them to place the other. */}
          <div className="lg:-ms-6 xl:-ms-36">
            <AnsrLockup />
            {/* **No `gap` on this column, deliberately.** Every interval on the band is one
                declaration on one element — the lockup's `logoGap`, the lead wrapper's
                `leadGap` — because each of them also carries a leading trim that only makes
                sense beside the distance it corrects. A `gap` here would be a second,
                invisible term in every one of those sums. */}
            <div className="flex flex-col items-start text-left">
          {/* **MEDIUM 500 AT `tracking-display`, AND THE WEIGHT IS A REVERSION AT THE
              PROJECT OWNER'S INSTRUCTION.** It went Bold 700 for one pass, on the argument
              that the constraint holding it at Medium had gone: for as long as the product
              name inside this line was ARTWORK, the typed half had to match the marks' own
              stem or the line read as two fonts — ATLAS's stem measured 0.1417 of its cap
              height against Moderat's stem-to-cap of 0.099 Light, 0.130 Regular, 0.150
              Medium, 0.189 Bold, so Medium matched to within 0.008 of cap and Bold was a
              third again too heavy. The marks are gone (`ProductName` is type), so the
              weight is genuinely free — and the owner's call is that 500 is the better
              reading at every width. **The stem measurements are kept anyway**, because
              they are what any future drawn mark on this line has to answer to.

              **The SIZES do not revert with it, and that split is the point.** The defect
              the Bold pass was aimed at was the hierarchy under the headline, and the sizes
              are what actually fixed it. The lead is Light 300 and this band admits WHITE
              INK ONLY — every muted token measures under 3:1 on the display gradient — so a
              quieter ink on the supporting line is unavailable and the distinction has to
              come from size. Measured: 72/500 over 20/300 is a 3.6x ratio at 1440 and reads
              correctly, but 30/500 over 16/300 was 1.88x at 390, where the headline is three
              lines and the lead four, so the supporting block covered MORE AREA than the
              thing it supports and the two read as two paragraphs.

              **So the sizes are 38 / 60 / 72px, stepped below `lg` only**, against the old
              30 / 48 / 72: the phone goes to 2.38x and the tablet to 3.33x, while desktop is
              untouched at 72px because 3.6x was never the problem. Verified at 390, 768 and
              1440 — three headline lines and no horizontal overflow at each, which is what
              caps how far this can go. Reverting a size to buy back weight would put the
              phone case back where it started.

              **The leading trims are unaffected and that is a property of the face.** Cap
              height is 700 per 1000 upem at EVERY Moderat weight, and both trims are stated
              in `em`, so neither the weight change nor the size steps move them. Re-checked
              ink-to-ink with `scripts/measure-hero-ink.mjs` rather than assumed.

              **`lg:text-7xl` is still one stop down from the scale's 80px top, at the
              project owner's request.** That is the only part of the old size decision that
              survives unchanged: the two steps below it were set to leave room for the marks
              drawn on this line, and there are none to crowd now.

              **THE SIZE CLASSES NOW SET THE PRODUCT NAME ALONE, AND THE TAGLINE IS A
              FRACTION OF THEM.** The `h1` still carries 38 / 60 / 72px, so the name draws
              at exactly the sizes measured above; the tagline takes `HERO_TAGLINE_SIZE`,
              which is an `em` of this element. That is the one number holding the two
              halves to almost the same width at every breakpoint — see the constant.

              **`text-balance` / `text-pretty` moved ONTO THE TAGLINE and off the `h1`, and
              the manual `<br>` is gone with them.** While the name and the promise were one
              string, balancing pulled the name down onto the sentence's first line — a
              naming failure that a `<br className="lg:hidden">` had to patch. The name is
              its own block now, so it owns its line by construction; the only thing left to
              rag is the tagline, and ragging IS the width's decision there. */}
          {/* **The two leading trims are what make the intervals above and below this
              heading mean what they say.** Both are `em`, so they resolve against 38, 60
              and 72px in turn — see `HERO_TRIM_CAP`. `HERO_PAD_BASELINE` has moved onto the
              TAGLINE, because the last ink on this heading is now the tagline's descender
              and that correction is a fraction of the ink's own size, not the `h1`'s. */}
          <h1
            ref={headingRef}
            tabIndex={-1}
            id="ask-title"
            className={cn(
              "gcc-enter max-w-hero text-4xl leading-display font-medium tracking-display",
              "text-text-inverse md:text-6xl lg:text-7xl",
              HERO_TRIM_CAP,
            )}
            style={{ "--gcc-enter-index": 1 } as React.CSSProperties}
          >
            {/* **Two blocks inside one `h1`, so the heading's accessible name is still the
                whole headline.** Two separate headings would put the promise in the document
                outline as a sibling of the product's name, which is not what it is: it is the
                second half of one statement. `block` rather than two `<div>`s of markup —
                the `h1` is the element with the size steps on it, and both children resolve
                their own `em` against it. */}
            {/* **`w-fit` on both halves, and it is what makes the width match MEASURABLE
                rather than merely true.** A plain `block` span fills its container, so both
                halves would report the `h1`'s own width and a spec could not tell a matched
                pair from an unmatched one — the whole requirement would be unverifiable
                except by eye. `fit-content` shrink-wraps each to its own rendered text, so
                a browser spec can assert the ratio directly. It costs nothing otherwise: a
                block at `fit-content` still takes its own line, and still wraps when its
                content exceeds the available width, which is what the tagline needs. */}
            <ProductName
              className={cn("block w-fit", HERO_NAME_OPTICAL)}
              name={copy.productName}
            />
            {/* **THE TAGLINE KEEPS THE HEADING'S MEDIUM 500 AND MUST NOT BE SET LIGHT, and
                the reason is the PHONE.** Light 300 is the brand's biggest typographic tell
                and was the obvious call here — it measures cleanly too, 0.41em landing the
                tagline at 96.9% of the name against Medium's 95.9% at 0.39em. It is wrong
                because the LEAD is already Light: at desktop the two are 29.5px and 20px
                apart and get away with it, but the floor puts the tagline at 18px on a phone
                against the lead's 16px, and 1.125x at one weight reads as one paragraph with
                a line emphasised. That is the exact failure the band's size steps were
                widened to fix. Medium against Light is a two-step interval that holds at
                every width, and this ground admits white ink only, so weight and size are
                the whole vocabulary available. */}
            {/* **`tracking-display` IS RESTATED HERE AND IT IS NOT REDUNDANT — an inherited
                `em` letter-spacing is an absolute LENGTH.** The token is `-0.02em`, which
                resolves against the element it is DECLARED on and inherits as the resulting
                pixel value: declared on the `h1` it computes to -1.44px at 72px, and the
                tagline at 28.08px was drawing that same -1.44px, which is -0.051em — two and
                a half times the brand's display tracking. Measured on a real render: it cost
                the tagline 24.6px of width and took the match from 95.9% to 89.5%, so the one
                number the composition is built on was wrong by 6 points for a reason no
                inspection of `HERO_TAGLINE_SIZE` would show. Restating it re-resolves the em
                against 28.08px. `ProductName` restates it too, which is why the name's own
                width came out exactly as measured. */}
            <span
              className={cn(
                "block w-fit tracking-display",
                HERO_TAGLINE_SIZE,
                HERO_TAGLINE_OPTICAL,
                "text-pretty lg:text-balance",
                HERO_PAD_BASELINE,
              )}
            >
              {copy.tagline}
            </span>
          </h1>

          {/* `text-pretty`, not `text-balance`: a long single sentence that reads
              better ragged, and pretty only refuses to leave the last word stranded. */}
          {/* **`max-w-hero` normally, widening to `max-w-lead` (6rem more) from
              `xl`.** The wider cap is the paired half of the outdent: the block shifts
              6rem left and the lead gains the same 6rem on the right, so its trailing
              edge is unchanged and stays off the map's visible field. Below `xl` the
              outdent is smaller, so the lead keeps the headline's own cap. Light 300 is
              the brand's biggest typographic tell; the size carries the hierarchy
              under the headline rather than a muted ink, which this ground forbids. */}
          {/* **The gap is on the WRAPPER and the trim is on the paragraph, because the two
              resolve against different font sizes.** `leadGap` is the optical distance from
              the headline's last ink to this paragraph's cap; `HERO_TRIM_LEAD_CAP` is 0.396em
              of the LEAD's own size, which is the clearance its line box holds above those
              capitals. Summed on one element they would need a `calc` per breakpoint. */}
          <div className={HERO_LEAD_GAP}>
            <p
              className={cn(
                "gcc-enter max-w-hero text-base leading-normal font-light text-pretty",
                "xl:max-w-lead",
                "text-text-inverse md:text-lg xl:text-xl",
                HERO_TRIM_LEAD_CAP,
              )}
              style={{ "--gcc-enter-index": 2 } as React.CSSProperties}
            >
              {copy.lead}
            </p>
          </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
