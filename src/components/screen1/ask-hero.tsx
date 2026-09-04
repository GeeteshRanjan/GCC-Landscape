import { AtlasWordmark } from "@/components/public/atlas-wordmark";
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
 * **Only a LEADING occurrence is highlighted, and that is a contrast bound rather
 * than a stylistic preference.** Orange on `--ansr-gradient-hero` measures 4.27:1
 * at the top of the band falling to 2.95:1 by 45% down — so it clears the 3:1
 * large-text floor on the headline's FIRST line (3.62:1 at worst) and fails on its
 * second. The first line always begins at the hero's top padding and is exactly one
 * line-height tall whatever the title's length, so a leading "ANSR" is legal by
 * construction. An "ANSR" anywhere else — mid-sentence, or pushed onto a wrapped
 * line — is not, so it is left to inherit the headline's white ink rather than
 * shipped orange below the floor where it would look deliberate.
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

/**
 * The product's own name, drawn where the headline types it.
 *
 * **Matched as a literal token on exactly the reasoning `BRAND` is**, and it has to
 * be for the same reason: the title is admin-editable free text, so the alternative
 * is a second copy field an admin has to know to split their headline across. Absent
 * from the title, there is simply no mark — which is the right degradation, and is
 * also what makes this safe to leave in place if the wording ever stops leading with
 * the product name.
 *
 * **No contrast bound on this one, and that is the difference from `BRAND`.** The ANSR
 * mark is orange only where it leads, because `--ansr-action` clears the 3:1 floor on
 * this ground's first line alone. This mark is `currentColor` and nothing may make it
 * anything else, so it is legal wherever the wording puts it.
 */
const PRODUCT = "ATLAS";

/**
 * The product name, swapped for the drawn wordmark in whatever follows the ANSR mark.
 *
 * Applied to the REMAINDER rather than to the whole title, so the two substitutions
 * cannot overlap or reorder: the brand mark is found first and the product mark is
 * found in what is left after it, which is the order the lockup reads in.
 */
function withProductMark(rest: string): React.ReactNode {
  const at = rest.indexOf(PRODUCT);
  if (at === -1) return rest;
  const after = rest.slice(at + PRODUCT.length);
  // **The punctuation that follows the mark is tied to it, and that is a line-break
  // fix rather than a preference.** An inline SVG is an atomic inline, and the line
  // breaker takes a break opportunity on either side of one — so the shipped title's
  // colon came off the mark and started the second line on its own, which reads as a
  // typo rather than as punctuation. Nothing did that while the word was typed,
  // because there is no break opportunity inside a word.
  //
  // What is held is the run up to the first SPACE, so only characters that were
  // never allowed to wrap away from the word are pulled back: the colon here, or
  // nothing at all where the title puts a space after the name. The words after that
  // space stay outside the span and wrap as normal, so the headline is still the
  // width's decision.
  const tight = /^\S*/.exec(after)?.[0] ?? "";
  const rein = after.slice(tight.length);
  return (
    <>
      {rest.slice(0, at)}
      <span className="whitespace-nowrap">
        <AtlasWordmark />
        {tight}
      </span>
      {/* **The product name owns its own line below `lg`, and this is the one manual
          break in the composition — at the project owner's instruction.**

          Everything else about this headline is the width's decision, and at desktop
          widths that decision is already the right one: at 72px the title sets to three
          lines with "ANSR ATLAS" alone on the first. It stops being right on a phone.
          At 375 the balancer happened to break after the mark; from about 400 up it did
          not, so "ANSR ATLAS Benchmark" ran as one line and the product's name read as
          the first two words of a sentence rather than as the thing the page is called.
          That is a naming failure, not a ragging one, so it cannot be left to a cap or
          to `text-balance` — both of those move with the font size and the string.

          `lg:hidden` rather than a class on a wrapper: a `<br>` with `display: none` is
          not a break at all, so desktop composes exactly as it did and there is nothing
          to keep in step. It is emitted only when something FOLLOWS the mark, so a title
          that ends on the product name does not get a trailing empty line.

          The space that separated the two runs is left in the markup. Below `lg` it is a
          space at the start of a line, which CSS text processing removes; from `lg` the
          break is gone and the space is the only thing joining the two halves. */}
      {rein.trim() ? <br className="lg:hidden" /> : null}
      {rein}
    </>
  );
}

function withBrandMark(title: string): React.ReactNode {
  const at = title.indexOf(BRAND);
  if (at === -1) return withProductMark(title);
  // The orange is applied ONLY when the wordmark LEADS the headline. A leading
  // "ANSR" is the one occurrence guaranteed to sit on the first line whatever the
  // admin's wording, and the first line is the only place `--ansr-action` clears
  // the 3:1 large-text floor on this ground. A mark anywhere else inherits the
  // line's white ink — it is `currentColor` — so an author cannot ship an
  // out-of-contrast orange wordmark on a wrapped line, silently and looking
  // deliberate.
  const leads = at === 0;
  return (
    <>
      {title.slice(0, at)}
      <AnsrWordmark className={leads ? "text-action" : undefined} />
      {withProductMark(title.slice(at + BRAND.length))}
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
    // **The phone step is budgeted against the phone, where it used to be the desktop
    // composition taken down by a smaller multiplier.** `pt-10 pb-28` / `-mt-20` was the
    // same headline-shoulder-card strategy as `lg:pt-16 lg:pb-48` / `lg:-mt-32`, and the
    // strategy is right — what was wrong is that a desktop band has room to spare and a
    // phone band does not, so a proportional reduction still spent a disproportionate
    // share of the one screen a visitor arrives on. The top shoulder comes down to 32px,
    // which is enough to seat a 30px headline and no more, and the bottom pairs with a
    // shallower card pull in `peer-view.tsx` — the two are one measurement and neither
    // number means anything alone.
    <div className="gcc-ground-hero relative overflow-hidden pt-8 pb-24 md:pt-14 md:pb-40 lg:pt-16 lg:pb-48">
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
          <div className="flex flex-col items-start gap-5 text-left md:gap-6 lg:-ms-6 xl:-ms-36">
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
              band from below, which is what the Bold pass was buying. The
              leading-aligned block pays some of it back by owning a column instead of
              competing across the middle. The display size steps 30 / 48 / 72px
              (`text-3xl` / `md:text-5xl` / `lg:text-7xl`), one stop down from the
              scale's 80px top at the project owner's request — large enough to lead
              the band, not so large it crowds the wordmark beside it.

              **`text-pretty` below `lg` and `text-balance` from it, and the split is
              the forced break's doing.** Balancing earns its place on a desktop
              headline that has no break in it: three lines of a capped 72px title
              want equal measures. It stops working once the product name owns its own
              line — measured at 390, the balancer left "Benchmark against your /
              peers", so the one thing it exists to prevent was exactly what it
              produced. `pretty` is the narrower promise and the right one here: it
              refuses a single-word last line and otherwise leaves the rag alone, which
              gives "Benchmark against / your peers" at every phone width from 320 to
              430. From `lg` the break is `display: none` and balancing is back. */}
          <h1
            ref={headingRef}
            tabIndex={-1}
            id="ask-title"
            className={
              "gcc-enter max-w-hero text-3xl leading-display font-medium tracking-body " +
              "text-pretty lg:text-balance text-text-inverse md:text-5xl lg:text-7xl"
            }
            style={{ "--gcc-enter-index": 0 } as React.CSSProperties}
          >
            {withBrandMark(copy.title)}
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
          <p
            className={
              "gcc-enter max-w-hero text-base leading-normal font-light text-pretty " +
              "xl:max-w-lead " +
              "text-text-inverse md:text-lg xl:text-xl"
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
