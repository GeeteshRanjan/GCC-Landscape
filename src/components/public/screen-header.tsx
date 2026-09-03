"use client";

import { Pencil } from "lucide-react";

import { AtlasWordmark } from "@/components/public/atlas-wordmark";
import { usePublicCopy } from "@/components/public/copy-context";
import { DottedWorldMap } from "@/components/screen1/dotted-world-map";
import { DEFAULT_PUBLIC_COPY, type PublicCopy } from "@/data/schema";
import { cn } from "@/lib/utils";

/**
 * The compact teal CONTEXT AREA both result screens open with, and the connected
 * tab strip that hands off to the white content surface below it.
 *
 * **This replaced a full display hero, and the replacement is the point rather
 * than a side effect.** Both result screens used to open on a 200px-tall teal band
 * carrying a kicker, a 72px headline stating the finding, a two-line lead, the
 * visitor's answers as a run of `dt`/`dd` pairs and a pill switch — so the first
 * thing a visitor saw after submitting a form was a second piece of marketing, and
 * the first actual figure was a scroll away. On a tool embedded in a marketing page
 * that is the host page's scroll being spent restating what the visitor just did.
 *
 * What the teal area is for now is exactly two things: saying which product this
 * is, and showing the profile the answer was computed from as something the visitor
 * can act on. Everything else moved down into the evidence.
 *
 * **Three consequences worth knowing before editing this file.**
 *
 *   - **The `h1` is the product, not the finding.** `ProductIdentity` renders it,
 *     so it is the same heading on both result screens — which is correct here and
 *     would not be on a page with routes: the two views are two readings of one
 *     result, and the view a visitor is in is stated by the selected tab's
 *     `aria-selected` rather than by a heading that changes under them. The finding
 *     itself is announced through the live region each screen renders.
 *   - **Focus moves to the TAB PANEL on a phase change, not to the `h1`.** With one
 *     shared product heading, focusing it would announce nothing new. A panel named
 *     by its own tab announces "Peer landscape, tab panel", which is the phase
 *     change said out loud. See `tool.tsx`.
 *   - **The band has no bottom padding**, because the selected tab has to be
 *     physically continuous with the content surface beneath it. There is nothing
 *     to tune between them; if a gap appears, something has added padding.
 */

export interface HeaderMotif {
  /** A file under `public/brand/`, already adapted. */
  src: string;
  /** Intrinsic size, so the box reserves the right ratio before the SVG lands. */
  width: number;
  height: number;
  /**
   * The placement class: where the motif is anchored and how it is masked. One
   * per screen, in globals.css, because the anchor depends on where that screen's
   * text actually is.
   */
  placement: string;
}

/**
 * The whole result surface: the teal header band, then ONE floating card carrying
 * every zone to the end of the page, with the view switch as the card's own top row.
 *
 * **This replaced two full-bleed stacks, and the card is the point.** The header
 * band and the content surface both ran edge to edge, so the answer was a sequence
 * of grounds rather than one object — nothing on the page said that all of this is
 * one result, produced by one act, distinct from the ansr.com page the tool is
 * framed inside. The zones still carry which KIND of claim a reader is on; the card
 * carries that they are all the same answer.
 *
 * Three props rather than one children list, because the order of the three is not
 * a caller's decision: the tab bar is the card's first row and the panel is the
 * rest of it, and a caller that got that order wrong would break the one joint
 * that has to be invisible.
 *
 *   - `children` — the identity, the finding and the answer pills, on the band.
 *   - `tabs` — the view switch, rendered as the card's top row.
 *   - `card` — the `ViewPanel` and everything in it, clipped by the card.
 *
 * **The card overlaps the band's bottom edge, and the pull and the band's own
 * bottom padding are one decision in two numbers.** The band is padded out far
 * enough that the card's top row lands on the gradient rather than on the flat
 * ground below it; the container's negative top margin is what lifts it there.
 * Raising one without the other either walks the card up into the answer pills or
 * drops it onto the flat ground, where the overlap that makes it read as lifted is
 * gone. Same relationship as the entry point's form card over its hero.
 *
 * **The band's ornament is swapped at `lg`, not layered.** The dotted world map is
 * the entry point's own graphic and is what this band carries on a desktop; below
 * `lg` the finding runs most of the band's width and the frame is too narrow for the
 * dots to resolve, so the screen's motif takes over there. One ornament at every
 * width, never two — the pair used to render together and the band read as a
 * coloured strip with two unrelated graphics parked on it.
 */
export function ResultSurface({
  motif,
  tabs,
  card,
  editor,
  footer,
  children,
}: {
  motif: HeaderMotif;
  tabs: React.ReactNode;
  card: React.ReactNode;
  /**
   * The answer editor, when the visitor has opened it — see `AnswerEditor`.
   *
   * **A slot here rather than a node inside `children`, and `.gcc-result-band`'s
   * `overflow: hidden` is the whole reason.** The band clips: it has to, because the
   * dotted map, the lattice and the motif all overhang it. Every control in the editor
   * opens a popup taller than the room below it, so an editor rendered among the band's
   * children would have all four dropdowns cut off at the band's bottom edge — silently,
   * and looking like a broken control rather than a clipping ancestor.
   *
   * So it renders as a SIBLING of the band, overlapping its lower edge with the same
   * negative pull the card uses. Which is also the entry point's own composition — a
   * white form card lifted onto the teal — and that is the right reading rather than a
   * coincidence: it is the same form.
   */
  editor?: React.ReactNode;
  /**
   * One caption line UNDER the card, on the page ground.
   *
   * Outside the card deliberately: it is an attribution for the whole surface rather
   * than a note on any section of it, and inside the card it would have to belong to
   * whichever zone happened to be last. Screen 1 passes none — its page ends at the
   * evidence strip by instruction — so the slot is empty there rather than holding an
   * element nobody asked for.
   */
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    // The page ground: the flat inverse teal, which is what the card is lifted off.
    // Deliberately not the gradient — see `.gcc-result-page` for why a fitted radial
    // cannot be stretched over a 3,500px document.
    <div className="gcc-result-page">
      {/* The band keeps the brand's own teal gradient at the size it was fitted
          for — a radial teal over teal-deep, so this is the brand's actual display
          ground rather than a colour picked to look rich. Its contrast contract
          holds without a per-placement measurement: the brightest point is
          `--ansr-teal-700`, and every ink allowed on an inverse ground clears AA
          across the whole band. `.gcc-result-band` adds the fade that keeps its
          bottom edge from seaming against the page ground. */}
      <div className="gcc-result-band pt-10 pb-28 md:pt-14 md:pb-32">
        {/* The screen's own motif, and it is the TABLET-and-below ornament now: the
            dotted map below takes the band from `lg`, and the two used to draw over
            each other on the same trailing edge. Decorative and redundant either
            way — everything it could convey is in the text beside it, so it is out
            of the tab order and out of the accessibility tree. */}
        <div
          className={cn(
            "ansr-motif gcc-motif-inverse hidden md:block lg:hidden",
            motif.placement,
          )}
          aria-hidden="true"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- decorative,
              fixed intrinsic ratio, and not worth an optimiser round trip. */}
          <img
            src={motif.src}
            alt=""
            width={motif.width}
            height={motif.height}
            className="block h-auto w-full"
          />
        </div>
        {/* **The entry point's own hero graphic, on the result band.** Same
            component and the same two child classes, so this is one graphic used
            twice rather than a second copy of one — what differs is only the
            placement: held further back by opacity, masked away from the copy, and
            faded to nothing well before the card's top edge, because here the band
            already carries a finding and a switch and the map is depth rather than
            subject. It is NOT blurred — that was tried and read as a
            low-resolution copy of the entry point's map rather than as depth. Every
            value and the reasoning is in `.gcc-header-map`. */}
        <div className="gcc-header-map hidden lg:flex" aria-hidden="true">
          <DottedWorldMap />
        </div>
        {/* **A second, much fainter ornament layer, generated rather than placed.**
            The brand's pin field as a fine dot lattice along the leading edge —
            behind the copy, at a strength measured so it cannot lift the local ground
            under white text, which is what lets it coexist with the map on the
            opposite edge. See `.gcc-header-lattice`. */}
        <div aria-hidden="true" className="gcc-header-lattice" />
        <div className="relative mx-auto max-w-content px-6 md:px-12">
          <div className="flex flex-col gap-6 md:gap-7">{children}</div>
        </div>
      </div>

      {/* **The answer editor, occupying the overlap the card normally has.** It takes the
          card's own pull, so the panel is lifted onto the band exactly as far as the card
          would have been — the surface's silhouette is unchanged and only what sits in
          the notch differs.

          `z-20` is what lets its dropdowns overhang the card below it. Everything else on
          this page is `z-auto`, so a single positive step is enough and no other layer
          had to be given a number to make room for it. */}
      {editor ? (
        <div className="relative z-20 mx-auto -mt-20 max-w-content px-6 md:-mt-24 md:px-12">
          {/* Radius `xl` and a shadow, matching `.gcc-result-card` rather than the entry
              point's `lg` form card: this panel is the same width as the card beneath it
              and stacked directly above it, so a smaller radius on the upper of two
              concentric white boxes reads as a mistake. */}
          <div className="rounded-xl bg-surface px-5 py-6 shadow-lg sm:px-8 md:px-10 md:py-8">
            {editor}
          </div>
        </div>
      ) : null}

      {/* The card, pulled up onto the band. The bottom padding is the page ground
          showing under the card, which is what makes it float rather than sit on a
          shelf — and it is where the document ends.

          **The pull is DROPPED while the editor is open**, because the editor is already
          in the notch. Two elements sharing one negative margin would put the card's top
          edge over the editor's foot, which is the one place the editor's submit button
          is. A plain gap instead, so the two read as stacked panels on the page ground. */}
      <div
        className={cn(
          "relative mx-auto max-w-content px-6 pb-10 md:px-12 md:pb-16",
          editor ? "mt-6 md:mt-8" : "-mt-20 md:-mt-24",
        )}
      >
        <div className="gcc-result-card">
          {/* The card's first row and the rest of it. No wrapper between them and
              nothing positioned: the bar is in the flow, so its corners are the
              card's corners and the joint under the selected cell is the absence of
              anything rather than two edges lined up. */}
          {tabs}
          {card}
        </div>
        {/* Muted inverse ink on the page ground, at caption size. It is the last thing
            in the document, so nothing is pinned or positioned to make it so. */}
        {footer ? (
          <p className="mt-5 text-xs text-text-inverse-muted md:mt-6">{footer}</p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * The finding, as the band's own display line.
 *
 * **The band had no sentence in it at all, and that is what made it boring rather
 * than compact.** Cutting the old display hero was right — a 200px marketing
 * headline restating the form was the host page's scroll spent on nothing — but the
 * pass that cut it left the band holding a lockup and a row of answers, which is
 * chrome and no content. A visitor who had just submitted a form was told what
 * product they were in and what they had typed, and nothing about the result.
 *
 * So the finding comes back, at a fraction of the size the hero used: one line, one
 * claim, `text-3xl` to `text-4xl` rather than 72px, under a lockup that stays the
 * `h1`. It is deliberately NOT a heading — the `h1` is the product and is identical
 * on both result screens, and a second heading here would put the finding into the
 * document outline where a phase change would silently rewrite it. Screen readers
 * get the finding from each screen's own live region, which is unchanged.
 *
 * White ink only. `--ansr-text-inverse-muted` is legal on this gradient, but the
 * line is the band's subject and a muted subject under a coloured lockup inverts
 * the hierarchy.
 */
/**
 * The two band lines, written as a PAIR and held in one place.
 *
 * **Only Screen 1 used to have one, and that is what made the header read as two
 * different headers.** Its band carried a lockup, a display line and four answer
 * pills; the function view's carried a lockup and four answer pills, so crossing
 * between the two in one state change dropped a whole row out of the band and the
 * pills jumped 60px up the page. The line was Screen 1's on the argument that Screen
 * 2's content already opens on a finding as a real `h2` — which is true, and is why
 * this is not that finding.
 *
 * So each screen's line says what that VIEW is over, in the same construction: a
 * count or a scope, then the visitor's own industry. Screen 2's h2 ("What an India GCC
 * would give you") is a different sentence about a different thing, so nothing is said
 * twice inside one scroll.
 *
 * Held here rather than in either screen's `copy.ts` for the same reason `viewLabels`
 * is: they are a pair, and the failure mode is one drifting out of construction with
 * the other. The peer line is composed in `screen1/copy.ts` because it depends on the
 * result rather than on the input, and it is the one thing on this band that does.
 */
/**
 * **The pair, built from published copy in ONE place, which is the whole reason this
 * shape survived becoming data.** Two schema keys could be edited independently, so what
 * keeps them a pair is that both screens read them through this function rather than
 * reaching for a field each: whoever changes what the peer line is FOR has the function
 * line in front of them while they do it. The caps in `publicCopySchema` carry the other
 * half of the constraint — 40 characters each, which is what holds both to one line.
 */
export function headerLines(copy: PublicCopy) {
  return {
    /**
     * The peer view's line.
     *
     * **It states no COUNT, and that is the correction rather than a simplification.** It
     * read "5 India GCCs match your BFSI profile", which is false in the one direction that
     * matters: five is what the block SHOWS, capped by `DEFAULT_PEER_LIMIT`, not how many
     * matched — the count line under the grid says "Showing 5 of 189". So the band's own
     * sentence understated the evidence directly above a line that contradicted it, and it
     * read as "we could only find five".
     *
     * It does not say the opposite either. "…and more" would be a second claim about a
     * denominator the band has no room to state, and the grid's count line already states
     * it exactly. What is left is what the whole screen is: how this industry operates
     * here, which every band under it evidences.
     *
     * **Not stating a count is also what let this line become editable at all.** A
     * sentence naming a figure has to move when the figure moves, so it belongs beside
     * the logic that computes it; a scope statement makes no claim about the data and can
     * be free text. That test is the reason `peerCountLine` is still in code twenty lines
     * of DOM below this.
     */
    peers: copy.headerPeers,
    /**
     * The function view's line. A scope statement, because that screen's figures are
     * national and do not move with the visitor's answers.
     *
     * **"beyond your industry", at ANSR's wording.** It said "The India market behind
     * {industry} GCCs", which was right about the subject and wrong about the relationship:
     * these figures are not the market behind one industry, they are the market that
     * extends past it. "Beyond" says that in one word.
     */
    functions: copy.headerFunctions,
    /**
     * **NEITHER LINE INTERPOLATES THE INDUSTRY, and that is a hard constraint rather than a
     * style choice.** `HeaderFinding` is capped at `--ansr-container-lead` (800px) and sets
     * at 48px, so anything past roughly 36 characters wraps — and a two-line band beside a
     * one-line band puts back the 50px jump across the tab switch that this pair exists to
     * remove. Industry names run from "BFSI" to "Agribusiness & Food Processing", so any
     * interpolated line is one line for some visitors and two for others. The previous
     * function line held `{industry}` and was verified on BFSI only; at "Software &
     * Internet" it wrapped.
     *
     * It is also why neither is a template an admin can put `{industry}` into: there is no
     * interpolation on this band, so a brace in the field renders as a brace.
     *
     * The band is not left impersonal by it: the four answer pills directly beneath carry
     * the company, the industry, the headquarters and the revenue band.
     *
     * Sentence case with a capital first letter, both of them. The peer line used to open
     * on a digit.
     */
  };
}

/** The shipped pair, which is what `headerLines` returns with no provider above it. */
export const HEADER_LINES = headerLines(DEFAULT_PUBLIC_COPY);

export function HeaderFinding({ children }: { children: React.ReactNode }) {
  return (
    // **Up one step at every breakpoint, to 30/38/48px, and 48 is where the display
    // leading token becomes legal.** At 24/30/38 this was the same size as the card
    // headings under it, which left the band's only sentence competing with six
    // labels; the entry point states its claim at 80px, and a result screen whose
    // finding is smaller than that by a factor of three reads as a different product.
    //
    // `tracking-display` comes with the size — the negative tracking is what stops a
    // 48px line looking loose — and Light 300 stays, because that is the brand's
    // display voice and the ask hero's supporting line uses it too. There is no drawn
    // mark on this line, so nothing here takes the mark-bearing exception.
    // `id` so a spec can assert the finding where it actually renders. It used to be
    // asserted through the live region, which restated it — and once the live region
    // stopped restating it, two specs were checking the finding in the one place it is
    // deliberately no longer said. A structural hook is the contract; the wording is a
    // copywriter's to change.
    <p
      id="header-finding"
      className="max-w-lead text-3xl leading-tight font-light tracking-display text-balance text-text-inverse md:text-4xl lg:text-5xl lg:leading-display"
    >
      {children}
    </p>
  );
}

/**
 * `ANSR ATLAS` — the product lockup, and the `h1` of both result screens.
 *
 * **"ATLAS", where this read "GCC Intelligence", at ANSR's request.** The old wording
 * named a CATEGORY, and it named it in three words directly above a finding line that
 * also describes what the screen is about — so the `h1` and the sentence under it were
 * doing the same job and neither was the product's name. Atlas is the name, it is already
 * the entry point's own headline (`siteContent.hero.title` opens "ANSR ATLAS"), and the
 * two surfaces now say the same thing about what a visitor is in.
 *
 * Set in CAPS, matching the headline rather than the sentence case the old phrase used:
 * the wordmark beside it is all-caps drawn letters, so a title-case word next to it read
 * as a caption appended to the mark rather than as the second half of a lockup.
 *
 * **BOTH HALVES ARE DRAWN NOW — see `AtlasWordmark`.** The name was typed for a pass,
 * which put a font beside artwork inside one lockup and made the two halves answer to
 * different things: the drawn half is fixed and the typed half moves with whatever face
 * is loaded, so the day Moderat replaces the stand-in the lockup changes shape. The
 * substitution keeps the composition — the drawn name's caps are set to the display
 * face's own cap height, so it occupies the cap band the typed word occupied — and the
 * heading's accessible name is unchanged, the mark being out of the accessibility tree
 * with the word carried beside it.
 *
 * **It is a CONTROL now — see `onHome`.**
 *
 * **The full lockup, mark and wordmark together, and the typed period is gone.**
 * It was the wordmark alone with a period typed after it in the action orange,
 * because the wordmark's artboard has no punctuation in it — which meant the one
 * place ANSR's own mark belongs was the one place it was absent, and the product's
 * name ended in a full stop nothing else on either screen uses. The period went
 * with the change: it was punctuation invented to make a lockup out of half a
 * lockup, and with the mark present there is nothing to make.
 *
 * `ansr-logo-on-dark.svg` is used LITERALLY — the mark in the action orange, the
 * wordmark in white, which is the brand's own on-dark relationship rather than one
 * assembled here out of two files. Logos are the single exception the
 * adapt-never-paste rule grants, and composing the mark and the name by hand would
 * have meant inventing the gap between them.
 *
 * **It is sized off the WORDMARK's cap height, not off the artboard.** The lockup
 * is 253 × 91 and the letters occupy 37.9 of those 91 units, so a height of 1.7em
 * puts the wordmark's caps at 0.71em — the display face's cap height, and the same
 * measurement `AnsrWordmark` makes for the same reason. Matching the artboard to
 * the font size instead would set the name at roughly two fifths of the type
 * beside it. The mark then runs about half an em above the caps and half below the
 * baseline, which is what a mark is supposed to do in a lockup.
 *
 * `items-center` rather than `items-baseline`: the wordmark's own vertical centre
 * sits within half a unit of the artboard's, so centring the lockup against the
 * line aligns the name with the type beside it without a baseline shift to tune.
 *
 * **The weight is still measured off the mark rather than chosen.** The wordmark's
 * stem is 0.137 of its cap height, which is the display face's Medium 500, and its
 * sidebearings are normal rather than `tracking-display`'s -0.02em — so a Bold
 * heading beside it is two fonts on one line. Same rule as the entry point's
 * headline and the impact band's, and the only three places a drawn mark sits in a
 * line of type.
 */
export function ProductIdentity({
  id,
  onHome,
}: {
  id: string;
  /**
   * Back to the entry point, at ANSR's request: the lockup is the way home.
   *
   * **This is the ONE affordance on the band that leaves the result, and it exists
   * because the other one stopped leaving.** "Edit answers" used to go to the form; it
   * now opens the answer editor in place — see `ContextPanels` — so without this there
   * would be no route back to the entry point from either result screen at all. A mark
   * that returns you to the start is the most reproduced pattern on the web and needs no
   * label to explain it, which is why it is the control that took the job rather than a
   * second button added to a band that has one.
   *
   * Optional, so the lockup is still renderable as a plain heading. Nothing passes it
   * absent today; the branch is what keeps the `h1` from being unconditionally
   * interactive, which is a claim about the surface rather than about this component.
   */
  onHome?: () => void;
}) {
  /**
   * The lockup's own contents, drawn identically whether or not they are inside a
   * button.
   *
   * **One copy, deliberately.** The two branches differ by exactly one element, and the
   * measurements below — 1.7em off the artboard, the `ps-3` gap — are the reason this
   * component exists. Two copies of them is how a pressable lockup and a plain one start
   * being drawn at two different sizes.
   */
  const lockup = (
    <>
      {/* The lockup carries the heading's first word. `alt="ANSR"` rather than an
          empty alt with an `sr-only` node beside it: this is a real image with real
          text in it, so the accessible name belongs on the element, and the heading
          computes to "ANSR ATLAS" — the product's name, unchanged in meaning from
          the version that typed the word. */}
      {/* eslint-disable-next-line @next/next/no-img-element -- a fixed-ratio SVG
          lockup, which the optimiser cannot improve on. */}
      <img
        src="/brand/ansr-logo-on-dark.svg"
        alt="ANSR"
        width={253}
        height={91}
        // 1.7em off the artboard puts the wordmark's caps at 0.71em, which is the
        // display face's cap height. See the block comment for the arithmetic — it
        // is the reason this is not `h-[1em]`.
        className="h-[1.7em] w-auto shrink-0"
      />
      {/* **The product name is DRAWN here too, so the `h1` is two marks and no type.**
          It was the typed word, which meant half the lockup was a font and half was
          artwork — and the half that was a font changes with the face, so the two
          would have drifted the moment Moderat replaced the stand-in. `AtlasWordmark`
          carries the measurement that keeps them one object: its caps are set to the
          display face's own cap height, which is within 1.6% of what the ANSR lockup's
          wordmark sets beside it, so the substitution changed what the letters are
          drawn from and nothing about the composition. `ms-3` is the gap the typed
          word's `ps-3` was, moved from padding to margin because the flex item is the
          mark itself now rather than a span around it — see `AtlasWordmark`, where
          the wrapper is what put it 1.1px off the lockup. */}
      <AtlasWordmark className="ms-3" />
    </>
  );

  return (
    <h1
      id={id}
      // **Down a step, from 24/30px to 20/24px, because the band now has a subject
      // and the lockup is not it.** The product name was the largest type in the band
      // when it was the only type in the band; with the finding under it at 36px, a
      // 30px lockup competed with the sentence it introduces. Small caps-adjacent
      // scale is the right register for a product label above a claim — the reference
      // does the same thing, and it is why the lockup reads as a mark rather than as
      // a headline.
      // **24/30px, up from 20/24, and it moves with the finding rather than against
      // it.** The lockup was taken down a step when the finding arrived, on the
      // argument that the band now has a subject and the product label is not it —
      // which is still true and is why this stays a step UNDER the finding at every
      // breakpoint (24 against 30, 30 against 38, 30 against 48). What changed is the
      // finding's size, so holding the lockup at 20px would have left the `h1` at a
      // quarter of the line beneath it and reading as a caption on its own page.
      //
      // Medium 500 and `tracking-body`, unchanged and not a candidate for the Bold +
      // `tracking-display` rule the other display headings take: this line contains
      // the drawn wordmark, whose stem is 0.137 of its cap height — the display face's
      // Medium — and whose sidebearings are normal rather than tight. Bold beside it is
      // two fonts on one line.
      // `flex` on the heading itself only where the lockup is NOT wrapped — a button
      // child would otherwise be a flex item and the alignment would have to be stated
      // twice. Where there is a button, the button is the flex row.
      className={cn(
        "text-2xl leading-tight font-medium tracking-body text-text-inverse md:text-3xl",
        onHome ? undefined : "flex items-center",
      )}
    >
      {onHome ? (
        <button
          type="button"
          onClick={onHome}
          /**
           * **The accessible name is the product's name and nothing else, which is
           * deliberate.** An `aria-label` here would be read by name-from-content when
           * the `h1` computes its own name — so "ANSR ATLAS, back to the form" would
           * become the heading of both result screens, and the outline would carry an
           * instruction. `title` says where it goes to a pointer user without touching
           * either name; the pattern itself is what says it to everyone else.
           */
          title="Back to the start"
          className={cn(
            "flex items-center text-start",
            // The one hover state anywhere on this band, and it is legal here for the
            // reason it is banned on the pills: this object is pressable. Opacity
            // rather than a rise or a fill — the lockup is a brand asset used
            // literally, so nothing may recolour it, and a transform on a 1.7em image
            // beside type would move the wordmark off the line the type sits on.
            "transition-opacity duration-fast ease-standard hover:opacity-80",
            // The band is a dark gradient, so the ring has to be the inverse ink or it
            // is invisible on the one surface it has to be visible on.
            "rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-text-inverse focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
          )}
        >
          {lockup}
        </button>
      ) : (
        lockup
      )}
    </h1>
  );
}

/**
 * One answer, read back: a small caps label and the value, in a rounded pill.
 *
 * **These stopped being controls, and that is a reversal of the previous pass.**
 * Each answer used to be a full-width button with a chevron or a pencil on it, on
 * the argument that the thing which is wrong should be the thing you press. What
 * that produced on screen was four large, bordered, chevroned cells directly under
 * the product name — the loudest element in the band, reading as four dropdowns
 * the visitor was expected to operate. The chevron in particular promised an
 * in-place editor that does not exist: every one of them left the page for the
 * form. Four affordances for one destination.
 *
 * So the answers are a summary again, and the way back is one explicit button
 * beside them — see `ContextPanels`. The pill is deliberately quiet: pill radius,
 * no chevron, no hover state, and small enough that it reads as a caption on the
 * band rather than as a control on it.
 *
 * **The fill is a translucent BLACK, not white, and that is a contrast decision
 * rather than a style one.** A white overlay lightens the gradient underneath and
 * pushes `--ansr-text-inverse-muted` to roughly 2.5:1, so the label would have to
 * become pure white and compete with the value it labels. Black recedes instead:
 * white lands near 11:1 and the muted label near 4.8:1. `.gcc-context-pill` in
 * globals.css carries it, and it degrades across the whole radial gradient without
 * a per-placement measurement because it is a relative darken.
 */
function ContextPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="gcc-context-pill inline-flex max-w-full items-baseline gap-2 px-3.5 py-1.5">
      <span className="shrink-0 text-[0.6875rem] font-semibold tracking-caps text-text-inverse-muted uppercase">
        {label}
      </span>
      {/* `truncate` with a `min-w-0` parent: "Consumer Packaged Goods" and
          "Above $20 Bn" are very different lengths, and a long industry name must
          shorten rather than push the row onto another line. The full value is
          always in the group's own reading order either way, and the form behind
          the change button holds it verbatim. */}
      <span className="min-w-0 truncate text-sm font-medium text-text-inverse">
        {value}
      </span>
    </span>
  );
}

export interface ContextFact {
  label: string;
  value: string;
}

/**
 * The answers as a row of pills, with ONE control beside them.
 *
 * **One button, not four.** All four answers only ever led to the same place — the
 * form, with the answers intact — so four separate affordances were four ways to
 * ask for one thing, and the chevron on three of them implied an editor that does
 * not exist. The single control says exactly what it does and where it goes, which
 * is what the four accessible names were individually having to explain.
 *
 * The row wraps rather than dividing into a grid of equal cells. Equal columns
 * forced a two-word revenue band to occupy the same width as a four-word industry
 * name, which is what made the group read as a form; pills sized to their own
 * content read as a summary. The control sits at the trailing end on desktop and
 * falls under the pills on a phone, where a trailing control would be off the edge
 * of a wrapped row.
 *
 * A company pill is only rendered when the visitor typed a name, since that field
 * is optional on the form.
 */
export function ContextPanels({
  facts,
  onEdit,
  editing = false,
  controls,
}: {
  facts: readonly ContextFact[];
  /**
   * Opens — and closes — the answer editor.
   *
   * **It no longer leaves the result screen**, which is the change and the reason
   * `editing` exists beside it. See `AnswerEditor` for why the trip to the form was
   * dropped. The label is unchanged, because "Edit answers" was already the honest
   * description of what the control does and is now more so.
   */
  onEdit: () => void;
  /** Whether the editor is open, which the button reports and reflects. */
  editing?: boolean;
  /** The editor's id, for `aria-controls`. */
  controls?: string;
}) {
  return (
    /**
     * **One wrapping row, with the control immediately after the last pill.** It
     * used to be two groups pushed to opposite ends of the container — the answers
     * leading, the button trailing, with up to 700px of empty band between them at
     * desktop. A control that acts on a specific set of things has to look like it
     * belongs to them, and at that distance it read as a second, unrelated piece of
     * header chrome; a visitor who spotted a wrong revenue band in the third pill
     * had to cross the band to find the way to fix it.
     *
     * In the same flow rather than in a second box, so it wraps with the pills
     * instead of dropping to its own line: on a phone it follows the last pill, and
     * where the pills fill a line it starts the next one.
     */
    <div
      role="group"
      aria-label="Your profile, as you entered it"
      className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-3"
    >
      {facts.map((fact) => (
        <ContextPill key={fact.label} label={fact.label} value={fact.value} />
      ))}
      {/* **"Edit answers", shortened from "Change my answers".** Both name the thing
          the visitor typed rather than the tool's word for it — "Edit profile" implied
          a stored account, which this tool does not have and must not imply — but the
          possessive was doing no work now the control sits against the pills it acts
          on, and at four syllables it was the longest label in the band. `ms-1` is the
          one piece of spacing that is not the row's own gap: the control is a
          different kind of thing from the tags before it, and a step of separation is
          what says so without a divider. */}
      <button
        type="button"
        onClick={onEdit}
        /* **A disclosure, not a link out.** The editor opens below the band rather than
           replacing the screen, so the control is a toggle and says so: `aria-expanded`
           is the machine reading, and `aria-controls` points at the panel it opens. Both
           were absent while pressing this was a navigation, and adding them is what stops
           a screen-reader user pressing it, hearing nothing change, and pressing again. */
        aria-expanded={editing}
        aria-controls={editing ? controls : undefined}
        /* **It is the size of a pill again, and the 44px target is kept off-screen.**
           `min-h-11` was added because the control measured 38px on one axis, under the
           minimum — and it bought that by making the only button in the band 44px tall
           beside four 30px tags, so the loudest object in the header was the one piece
           of chrome rather than any of the four answers it acts on. A control that
           outsizes its own subject is the same defect as pushing it to the far end of
           the row, which the previous pass fixed.

           So the visible pill matches the tags — same vertical padding, same type size,
           one step more horizontal padding for the glyph — and the target is expanded by
           a transparent pseudo-element that overhangs the box top and bottom. See
           `.gcc-context-edit::after`. The hit area is 44px; the ink is 30px. The row's
           `gap-y-3` is 12px, so two wrapped rows of pills cannot bring one target within
           overlapping distance of another — and there is exactly one of these per
           screen. */
        className="gcc-context-edit group relative inline-flex shrink-0 items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-text-inverse md:ms-1"
      >
        <Pencil aria-hidden="true" className="size-3.5 shrink-0" />
        Edit answers
      </button>
    </div>
  );
}

/* ==========================================================================
   The view tabs
   ========================================================================== */

/**
 * The two view names, here rather than in either screen's `copy.ts`.
 *
 * They are the one pair of strings that belongs to neither screen alone: both
 * screens render both labels, so holding them in one screen's copy file would make
 * that screen the owner of the other's name — and the failure mode is the switch
 * disagreeing with itself about what the visitor is looking at. Deliberately not
 * "Screen 1" and "Screen 2", which are our words for them and not anyone else's.
 */
/**
 * **"Function Metrics", where this said "Function Opportunity".** "Opportunity" was
 * doing two things a switch label must not: it sold the view before the visitor
 * reached it, and it named nothing that is on it. The screen holds thirty-five
 * measured figures grouped by the four functions a GCC runs — talent depth, time to
 * stand up, what the location gives you, how cost moves — so "metrics" is what the
 * label owes the reader, and it is the word the section's own id already uses
 * (`function-metrics`).
 *
 * It also pairs. "Peer Landscape" and "Function Metrics" are both {qualifier + what
 * you get}; "Peer Landscape" and "Function Opportunity" were a noun and a promise.
 */
/**
 * **Built in one place from two published keys, for the reason `headerLines` is.** The
 * two labels are a pair — {qualifier + what you get}, twice — and a pair whose halves are
 * reached independently is a pair only by coincidence. The 24-character cap on each is
 * what keeps the bar's two equal halves from wrapping at 320.
 */
function viewLabels(copy: PublicCopy): Record<ViewKind, string> {
  return {
    peers: copy.viewPeers,
    functions: copy.viewFunctions,
  };
}

/**
 * The two views, as a type rather than as `keyof typeof` over a literal.
 *
 * It was derived from the label object, which stopped being possible once the labels
 * became published strings: `Record<string, string>` has no keys to read. Written out
 * instead, and `viewLabels` returns a `Record<ViewKind, string>` — so the compiler still
 * refuses a label object that is missing a view, which is the property the old
 * `keyof typeof` was actually buying.
 */
export type ViewKind = "peers" | "functions";

const VIEW_ORDER: readonly ViewKind[] = ["peers", "functions"];

/** Stable ids, so a tab and its panel can point at each other across two files. */
export const viewTabId = (view: ViewKind) => `view-tab-${view}`;
export const viewPanelId = (view: ViewKind) => `view-panel-${view}`;

/**
 * The two result views, as the card's own top row: full width, two equal halves.
 *
 * **Two earlier shapes, each rejected for a different reason.** It began as a strip
 * dividing the header BAND's foot, whose selected half was white and continued into
 * a full-bleed white page — right for a full-bleed page, orphaned the moment the
 * content moved inside a card, because a strip spanning the frame is wider than the
 * thing it selects. It then became a content-sized notch sticking up out of the
 * card's top edge, and that is where the bends came from: a rounded tab meeting a
 * rounded card is two curves that have to agree and cannot, plus a step where the
 * notch ends and the card carries on.
 *
 * Neither problem exists here, because the bar is not attached to the card — it is
 * the card's first row. The corners are the card's own radius under its own
 * `overflow: hidden`, so there is one curve in the composition and nothing to align.
 *
 * **`ground` is what makes the selected cell continuous rather than merely light.**
 * Screen 1's content opens on the mint zone and Screen 2's on white, so a cell
 * claiming to be the surface you are on has to be filled with that surface. Passing
 * it is the caller's one job here; the alternative — hard-coding white — was tried
 * and put a white cell above a mint zone, which is a visible edge across the joint
 * this shape exists to remove.
 *
 * **Real tab semantics, with MANUAL activation.** `role="tablist"` with a roving
 * tabindex, arrow keys plus Home/End to move focus, Enter or Space to activate.
 * Manual rather than automatic because activating swaps the entire screen: arrowing
 * across with automatic activation would tear the page down and rebuild it under a
 * visitor who was only looking. `aria-controls` is set on the selected tab alone,
 * since the inactive view's panel is genuinely not mounted — there is one result on
 * the page at a time, and pointing at an absent id would be a broken reference
 * rather than a hidden panel.
 *
 * **Selected state is never carried by colour alone, and there is no drawn line
 * anywhere in the bar now.** `aria-selected` is the machine reading. The visual ones
 * are the selected cell being filled with the ground of the content beneath it where the
 * other shows the bar's own pale mint through, the ink moving from muted to the heading
 * teal, and the weight. Two earlier indicators are gone: an orange rule over the
 * selected cell, which was the most reproduced tab device there is, and then a teal edge
 * under the UNSELECTED one, which ANSR rejected — see `.gcc-result-tab--off`.
 *
 * Deliberately NOT sticky, and that is an iframe constraint rather than a
 * preference: the tool negotiates its height with the parent and never owns a
 * scroll container, so a pinned strip would fix itself to a viewport the visitor
 * may not be looking at.
 */
export function ViewTabs({
  current,
  onSwitch,
  ground = "surface",
}: {
  current: ViewKind;
  /** Called with the view being moved to. The tool owns the phase. */
  onSwitch: (view: ViewKind) => void;
  /**
   * The ground the caller's content surface opens on, which is what the selected
   * cell is filled with. Screen 1 opens on the near-white mint; Screen 2 on white.
   *
   * **`pale` exists because the snapshot's figures needed a legal ground.** Screen 1's
   * first zone was the mint `tint`, and `--ansr-action` is 2.63:1 on it — under the
   * 3:1 large-text floor at any size — which was survivable only while every figure
   * sat on a white card's own fill inside that zone. With the snapshot's cards gone
   * the figures sit on the zone itself, so the zone moved to `--ansr-surface-pale`,
   * where the same orange measures 3.29:1 and clears the floor. The bar has to follow
   * it or the joint this component exists to hide reappears as an edge.
   */
  ground?: "surface" | "tint" | "pale";
}) {
  // The one component that draws BOTH labels, whichever screen mounted it — so the
  // switch cannot disagree with itself about what the visitor is looking at, and the
  // published pair is read once per render rather than once per cell.
  const labels = viewLabels(usePublicCopy());

  const move = (from: number, to: number) => {
    const next = VIEW_ORDER[(to + VIEW_ORDER.length) % VIEW_ORDER.length];
    if (!next || next === VIEW_ORDER[from]) return;
    document.getElementById(viewTabId(next))?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        move(index, index + 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        move(index, index - 1);
        break;
      case "Home":
        event.preventDefault();
        move(index, 0);
        break;
      case "End":
        event.preventDefault();
        move(index, VIEW_ORDER.length - 1);
        break;
    }
  };

  return (
    <div role="tablist" aria-label="Result view" className="gcc-result-tabs">
      {VIEW_ORDER.map((view, index) => {
        const selected = view === current;
        return (
          <button
            key={view}
            id={viewTabId(view)}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={selected ? viewPanelId(view) : undefined}
            // The roving tabindex. Exactly one tab is in the tab order, and it is
            // the selected one, so Tab lands on where the visitor already is.
            tabIndex={selected ? 0 : -1}
            onClick={() => onSwitch(view)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              // Two equal halves of the card, each 56px of target at every width.
              // `min-w-0` so a long label wraps inside its own half rather than
              // widening the bar past the card, which the iframe does not own the
              // scroll of.
              // **No glyph, at ANSR's request, and the switch loses nothing by it.**
              // Each cell carried a 20px line icon before its label — a person for the
              // peer view, a bar chart for the function view — both already
              // `aria-hidden`, both category-interchangeable, and neither able to say
              // anything the label beside it did not. On a two-cell switch where exactly
              // one is always selected, an icon is the third redundant signal after the
              // fill and the ink, and it was the one that made the row read as an app
              // toolbar rather than as the card's own top edge. It also removes the
              // breakpoint rule that had to drop them below `sm` to keep the labels on
              // one line at 320.
              "gcc-result-tab flex min-w-0 items-center justify-center",
              "px-3 py-4 text-sm font-semibold sm:px-5 md:text-base",
              // Colour only. `transition-all` on a control that changes surface,
              // ink and border at once is what makes a switch feel loose.
              "transition-colors duration-fast ease-standard",
              selected
                ? cn(
                    // The ground of the content below it, so the cell and the surface
                    // are one fill with no edge between them, plus the orange rule on
                    // the cell's top edge.
                    "gcc-result-tab--on text-accent-teal",
                    ground === "tint"
                      ? "gcc-result-tab--on-tint"
                      : ground === "pale"
                        ? "gcc-result-tab--on-pale"
                        : "gcc-result-tab--on-surface",
                  )
                : // A step back on the bar's own ground, which is darker than either
                  // content ground so the selected cell is the lightest thing in the
                  // row. Muted rather than a lighter weight of the same ink: the two
                  // cells are the same size and the same type, so ink value is what
                  // separates them. 5.2:1 there — measured, see `.gcc-result-tabs`.
                  "gcc-result-tab--off text-text-muted hover:text-text",
            )}
          >
            {labels[view]}
          </button>
        );
      })}
    </div>
  );
}

/**
 * The white content surface, named by the tab that selected it.
 *
 * It is the focus target on every phase change — see the file comment — so it
 * carries `tabIndex={-1}` and the ref, and a screen reader announces "Peer
 * landscape, tab panel" rather than re-reading a heading that did not change.
 */
export function ViewPanel({
  view,
  panelRef,
  children,
}: {
  view: ViewKind;
  panelRef: React.RefObject<HTMLDivElement | null>;
  children: React.ReactNode;
}) {
  return (
    <div
      ref={panelRef}
      id={viewPanelId(view)}
      role="tabpanel"
      aria-labelledby={viewTabId(view)}
      tabIndex={-1}
      // No focus ring on the panel itself: it is a 3,000px region, and outlining
      // the whole page on a phase change is noise rather than a location. The tab
      // above it is the visible marker, and it is already marked.
      className="bg-surface outline-none"
    >
      {children}
    </div>
  );
}
