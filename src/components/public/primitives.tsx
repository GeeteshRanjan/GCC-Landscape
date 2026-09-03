import { cn } from "@/lib/utils";

/**
 * The shared shapes BOTH public screens are built from.
 *
 * This lived in `components/screen1/` while there was only one screen. Screen 2
 * wants `Section`, `Chip`, `Provenance` and `formatCount`, which is most of the
 * file — so it moved here rather than being imported across screen folders. A
 * cross-folder import would have made `screen1` the de facto owner of shapes both
 * screens depend on, and the next edit to it a change to two screens by accident.
 *
 * Three layout decisions are fixed here rather than repeated per block, which is
 * what keeps a screen from drifting section by section:
 *
 *   - **Section separation is an alternating surface tint**, never a divider rule.
 *     One mechanism, applied at every boundary. The brand's geometry is already
 *     hard-edged and hairline-heavy, and adding rules between full-width bands on
 *     top of that reads as noise rather than structure.
 *   - **Section padding is weighted by role**, not uniform: connective bands get
 *     less than pivotal ones. The values are deliberately tighter than a
 *     standalone landing page would use, because this is an embedded tool inside
 *     a page that already has its own rhythm — 192px of air inside an iframe is
 *     the host page's scroll being spent on nothing.
 *   - **Nothing assumes it owns the viewport.** No `100vh`, no fixed or sticky
 *     positioning anywhere in the public screens; height is negotiated with the
 *     parent instead. See `use-frame-height.ts`.
 */

/**
 * `en-US` grouping, and the audience is the reason rather than the subject.
 *
 * The tool is about India and is read by CIOs in the US, Europe and Japan. Indian
 * digit grouping renders 720,000 as "7,20,000" — correct for an Indian reader, a
 * stumble for everyone these screens are written for.
 *
 * With the current data this changes nothing Screen 1 renders, and that is checked
 * rather than assumed: every count it shows is under six digits, and both
 * professionals totals are above a million so they take the branch below. The
 * difference is latent until a count passes 99,999 or a professionals total falls
 * under a million. Screen 2 is where it stopped being latent.
 */
const numberFormat = new Intl.NumberFormat("en-US");

/** Grouped digits. */
export function formatCount(value: number): string {
  return numberFormat.format(value);
}

/**
 * A 0-to-1 share as a whole percentage.
 *
 * Whole, not one decimal: these are counts over fixed list sizes, so the exact
 * value is available and "36.2%" invites a precision question about a number whose
 * usefulness is entirely in its order of magnitude. Rounded once, here, so a
 * figure and the bar beside it cannot disagree.
 */
export function formatShare(share: number): string {
  return `${Math.round(share * 100)}%`;
}

/**
 * Professionals, in the units a CIO reads at a glance.
 *
 * The value is already rounded to the nearest ten thousand by
 * `roundProfessionals`, because it is a sum of headcount band midpoints. This
 * only chooses the unit; it never re-rounds, so the figure on the screen and the
 * figure in the model agree.
 */
export function formatProfessionals(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)} million`;
  }
  return numberFormat.format(value);
}

/**
 * A revenue band, as a visitor reads it.
 *
 * **Presentation only. The stored string is untouched and stays the matching key.**
 * `taxonomy.revenueBands` holds `"< $100 Mn"` and `"$1 Bn – $5 Bn"`, and that array's
 * ORDER is the peer-matching contract — the adjacent-band step is index arithmetic on it.
 * So the band is not renamed in the data: renaming would cascade into all 1834 companies,
 * move the `data:verify` profile, and put a taxonomy edit behind a typographic decision.
 * Admin keeps showing the stored strings, which is correct, because admin edits the datum.
 *
 * Two changes, both ANSR's:
 *
 *   - **`<` becomes "Under", `>` becomes "Above".** A mathematical operator in a list a
 *     CFO reads is a glyph that has to be decoded; the word does not. `"Above $20 Bn"` is
 *     already spelled out at the other end of the list, so this also makes the two ends
 *     of the band set symmetrical, which they were not.
 *   - **The currency mark comes off every row and is stated ONCE**, in the panel's own
 *     hint. Seven rows carrying up to two `$` each is fourteen marks saying one thing,
 *     and they crowd the figures that actually differ between the rows.
 *
 * It is a rule rather than a lookup table, deliberately and unlike `COMPANY_NAME_FIXES`:
 * these seven strings are one authored series in one notation, not 1834 names arriving
 * from the world in every convention — so a rule cannot damage a row it was not aimed at.
 * `tests/unit/screen1.test.ts` pins all seven outputs, so a new band that does not fit
 * the notation fails there rather than rendering wrong.
 *
 * **Applied everywhere a band is shown to a visitor, which is three places**: the
 * dropdown's options, and the answer pills on each result screen. A band formatted in the
 * control and raw in the echo of the visitor's own answer would read as two different
 * answers.
 */
export function formatRevenueBand(band: string): string {
  return band
    .replaceAll("$", "")
    .replace(/^<\s*/, "Under ")
    .replace(/^>\s*/, "Above ")
    .trim();
}

type SectionWeight = "connective" | "standard" | "pivotal";

/**
 * How much air a band gets, by what it is doing.
 *
 * Still tighter than a standalone landing page, and still for the iframe reason —
 * but the first pass read that constraint as "uniformly tight" and capped
 * everything at 48–80px, which is why no band on either screen had a moment of
 * its own. A pivotal band now genuinely outweighs a connective one.
 */
const SECTION_PADDING: Record<SectionWeight, string> = {
  connective: "py-14 md:py-16",
  standard: "py-16 md:py-24",
  pivotal: "py-20 md:py-28",
};

/**
 * The ground a band sits on. Three, not two.
 *
 * The first pass alternated `surface` and `surface-subtle` — white against a grey
 * two steps off it — which meant 95% of both screens rendered as one value and no
 * section announced itself. ansr.com's own pages alternate three saturated
 * grounds, and that is what carries its sectioning; the type and the ornament sit
 * on top of it.
 *
 * `inverse` is no longer reserved for the close. It is what a FIGURE band gets:
 * the two moments on Screen 1 that are a single large number (the industry count,
 * the national base) earn a ground of their own, because a number reversed out of
 * deep teal is the most emphatic thing this palette can do without touching
 * orange — which is committed to the CTA.
 */
export type Ground = "surface" | "tint" | "inverse";

const GROUND: Record<Ground, string> = {
  surface: "bg-surface",
  tint: "bg-surface-tint",
  inverse: "bg-surface-inverse",
};

/** Ground-dependent text colours, resolved once here rather than per band. */
const ON_GROUND: Record<Ground, { kicker: string; title: string; lead: string }> = {
  surface: {
    kicker: "text-accent-teal",
    title: "text-text",
    lead: "text-text-muted",
  },
  tint: {
    kicker: "text-accent-teal",
    title: "text-text",
    lead: "text-text-muted",
  },
  inverse: {
    kicker: "text-text-inverse-muted",
    title: "text-text-inverse",
    lead: "text-text-inverse-muted",
  },
};

export function Section({
  id,
  title,
  kicker,
  lead,
  ground = "surface",
  weight = "standard",
  layout = "stack",
  headingLevel = 2,
  children,
}: {
  /** Also the `aria-labelledby` target, so the section is a real landmark. */
  id: string;
  title: string;
  kicker?: string;
  lead?: string;
  /** Which of the three grounds. Chosen per band by role, not alternated blindly. */
  ground?: Ground;
  weight?: SectionWeight;
  /**
   * `split` puts the heading in a leading column beside the content instead of
   * above it — ansr.com's own dominant section shape, and the one that lets a
   * heading be genuinely large without pushing the evidence off the fold. Used
   * where the content is a grid or a list; `stack` stays for full-width charts,
   * which need the whole measure.
   */
  layout?: "stack" | "split";
  headingLevel?: 2 | 3;
  children: React.ReactNode;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const headingId = `${id}-heading`;
  const on = ON_GROUND[ground];

  const header = (
    <header className="flex flex-col gap-4">
      {kicker ? (
        <p
          className={cn(
            "text-xs font-semibold tracking-caps uppercase",
            on.kicker,
          )}
        >
          {kicker}
        </p>
      ) : null}
      <Heading
        id={headingId}
        className={cn(
          // Up from 24/30px. The tokens carried a 48px step that neither public
          // screen used, so every heading came out mid-scale against a 1280px
          // canvas. `text-balance` keeps a three-word third line from happening
          // now that the type is large enough for it to show.
          "text-3xl leading-tight font-bold tracking-display text-balance",
          "md:text-4xl lg:text-5xl",
          on.title,
        )}
      >
        {title}
      </Heading>
      {lead ? (
        <p className={cn("max-w-measure text-lg", on.lead)}>{lead}</p>
      ) : null}
    </header>
  );

  return (
    // A <section> with no accessible name is not a `region` landmark, so it is
    // unreachable by role for a screen-reader user and untestable by role here.
    <section
      id={id}
      aria-labelledby={headingId}
      className={cn(SECTION_PADDING[weight], GROUND[ground])}
    >
      <div className="mx-auto max-w-content px-6 md:px-12">
        {layout === "split" ? (
          // Twelve columns, 5/7. The heading column is capped at the reading
          // measure by its own width rather than by max-w-measure, so a long
          // industry name wraps inside the column instead of escaping it.
          //
          // `items-start` for the same reason the metric grid needs it: a grid
          // child stretches to its row by default, so a card in the content column
          // was padded out to the height of the heading beside it and rendered with
          // a band of empty white under its own content.
          <div className="grid items-start gap-10 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-5">{header}</div>
            <div className="lg:col-span-7">{children}</div>
          </div>
        ) : (
          <>
            {header}
            <div className="mt-10 md:mt-12">{children}</div>
          </>
        )}
      </div>
    </section>
  );
}

/**
 * The flavour a `Panel` is drawn in.
 *
 * **Four tones exist because one tone across eight cards is what made the result
 * surface read as monotonous.** Every card was a white rectangle with a hairline
 * border and a 16px heading, stacked down one white page — cognitively flat, with
 * nothing telling the eye that the comparison set and the national scale proof are
 * different kinds of claim. The tones are not decoration: each one marks a class of
 * evidence, and they are applied once per class rather than alternated.
 *
 *   - `plain` — a white card on whatever ground it sits on. The default, and the
 *     one used where the CONTENT is the colour: the comparison cards, the map.
 *   - `tint` — a pale mint fill with a teal heading rule. For a card that has to
 *     hold its own against a white neighbour without becoming a figure band.
 *   - `accent` — a teal gradient heading strip over a white body. For the two
 *     analytical cards that carry a chart, so the chart reads as the subject and
 *     the card still announces itself.
 *   - `inverse` — deep teal throughout. Reserved for the terminating scale strip,
 *     as before.
 */
/**
 * **Two of those four tones were dead and a third is new.** The paragraph above is
 * kept because it records why the tonal system existed; the specificity pass
 * replaced it with a structural rule, and the tones went with it. `tint` differs from
 * `plain` by about 4% lightness and had no caller; `accent` was the gradient heading
 * strip, and what announces the primary evidence now is `weight="lead"` on a `Block`,
 * which is size rather than colour. Neither was passed anywhere in `src/` — they were
 * an API nobody could use correctly, since the one thing they were for is now done by
 * a different primitive.
 *
 * `sealed` arrives from Screen 2, which is the one surface with a card that is
 * deliberately closed rather than empty. It is not a colour either: it is a step
 * firmer on the same border, which is the whole signal.
 */
export type PanelTone = "plain" | "inverse" | "sealed";

/**
 * A bordered card section — the unit the result surface is built from.
 *
 * **This is not a variant of `Section` and it replaces it on the peer view.** A
 * `Section` is a full-bleed BAND: its own ground, 80–112px of vertical air, a 48px
 * heading. Seven of them stacked was a landing page, and the peer view is not one —
 * it is the answer to a form, read by someone who wants to see six things at once
 * and compare two of them side by side. That wants a grid of cards on one ground,
 * at enterprise-dashboard density, which is a different component rather than the
 * same one with smaller padding.
 *
 * Three things it fixes that the band system could not:
 *
 *   - **Two cards can sit beside each other.** A band owns the full width by
 *     definition, so the industry context and the largest centres had to be two
 *     scroll positions rather than one comparison.
 *   - **The heading stops competing.** A 48px heading over a chart makes the
 *     heading the loudest thing in the band; here the heading is 16px and the
 *     figures are the largest thing on the card, which is the correct order for
 *     evidence.
 *   - **It is a real landmark.** Same contract as `Section`: `id` names the
 *     section for `aria-labelledby`, so every card is reachable by role and
 *     locatable in a test by id rather than by its wording.
 *
 * **There is no step number on the heading any more.** The reference composition
 * numbered its six cards 1 through 6 and this drew them as accent discs. Numbering
 * asserts that the cards are a SEQUENCE to be worked through in order, which they
 * are not — they are six independent readings of one result, and a visitor who
 * cares only about locations is not skipping steps 1 to 4. It also spent the one
 * accent fill on the surface six times over, on the least informative element of
 * each card. Removed at ANSR's request, and the `ordinal` prop went with it rather
 * than being left unused for someone to pass again.
 *
 * `lead` is the one line under the heading, for a card whose finding is a sentence
 * rather than a figure. It sits inside the header block so a card's claim and its
 * name are one unit, and so no card has to open its body with a paragraph that
 * looks like content.
 */
/**
 * How round a card's corners are.
 *
 * **`none` is the default and is the derived answer; `md` is a per-surface request.**
 * The board was rendered at 1440 and every container on it is true zero — see the
 * comment inside `Panel` — so nothing gets a radius by default. `md` is 4px, which is
 * the step the entry point's form card and its fields already carry at the client's
 * own request, and it is what the HR composition asks for in its own words: subtle and
 * consistent rather than soft. It is a caller's decision because it is a decision about
 * a SURFACE, not about a card: a tab where two cards disagree about their corners is
 * worse than either value.
 */
export type PanelRadius = "none" | "md";

const PANEL_RADIUS: Record<PanelRadius, string> = {
  none: "rounded-none",
  md: "rounded-md",
};

export function Panel({
  id,
  title,
  lead,
  tone = "plain",
  radius = "none",
  chip,
  headingLevel = 2,
  motif,
  bodyClassName,
  className,
  children,
}: {
  id: string;
  title: string;
  /** The card's finding, in one line. Rendered in the header, not the body. */
  lead?: string;
  tone?: PanelTone;
  /** See `PanelRadius`. One surface passes this; everything else is square. */
  radius?: PanelRadius;
  /**
   * A short status beside the heading. One caller: Screen 2's sealed cards, where it
   * says "Held back".
   */
  chip?: string;
  /**
   * 2 by default. 3 for a card that sits under a group heading of its own, which is
   * Screen 2's held group and nothing else.
   *
   * A level is a real outline rather than a size — skipping one leaves a
   * screen-reader user with a broken structure — so it is a prop rather than being
   * inferred, and the size does not change with it.
   */
  headingLevel?: 2 | 3;
  /**
   * A muted brand graphic behind the header. Supplied by the caller so this file
   * draws no art and knows no file paths; `aria-hidden` is applied here, because a
   * decorative graphic is never the caller's decision to get wrong.
   */
  motif?: React.ReactNode;
  /** Where a card is a grid child, its own column span. */
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}) {
  const headingId = `${id}-heading`;
  const inverse = tone === "inverse";
  const sealed = tone === "sealed";
  const Heading = headingLevel === 3 ? "h3" : "h2";

  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={cn(
        /**
         * **Radius `none` and no shadow, re-derived from `Group 149.svg` rather than
         * from a description of it.** The board was rendered at 1440 and read: every
         * container on it is TRUE ZERO — the three white model cards, the FAQ rows,
         * all of it — and the only round things are the pill CTA and two 4px social
         * squares. Nothing carries a shadow anywhere on 5,531px of board.
         *
         * This card had `rounded-lg` and `shadow-sm`, on the reasoning that a card
         * sitting on a mint zone needs elevation because a hairline against a tint is
         * nearly invisible. The board answers that directly and differently: its white
         * cards sit on a mint ground with **no border and no shadow at all**, because
         * the fill against the tint IS the boundary. So the premise was right and the
         * conclusion was one device too many.
         *
         * What is left is the hairline, and it is kept for the reason the earned-border
         * rule gives rather than for separation: a `Panel` is what a block takes when
         * it draws a MARK, and a bar's full width means nothing without an edge to
         * measure it against. That edge has to be explicit on a white zone, where the
         * fill supplies no boundary at all. One treatment on both zones, because the
         * border is about the marks and not about the ground.
         *
         * The floating result card keeps its own radius and its two shadow layers —
         * `.gcc-result-card`, on a teal-deep ground where the shadow tokens are
         * invisible. It is the container; these are its contents, and the container
         * being the one round object on the surface is what says so.
         */
        "gcc-panel relative flex min-w-0 flex-col overflow-hidden",
        PANEL_RADIUS[radius],
        inverse
          ? "border border-border-inverse bg-surface-inverse"
          : sealed
            ? // A step firmer than its neighbours, which is the entire statement that
              // the slot is closed rather than broken. Never a dimmer card: dimming
              // says unavailable, a firmer edge says withheld.
              "border-2 border-border-strong bg-surface"
            : "border border-border bg-surface",
        className,
      )}
    >
      {motif ? (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          {motif}
        </div>
      ) : null}
      {/* The header. A hairline under a plain fill, on every tone — the gradient
          strip that used to mark the two analytical cards is gone with the `accent`
          tone, because what announces the primary evidence is now size rather than
          colour. The heading wraps inside its own column rather than pushing the row
          taller than its neighbour's. */}
      <div
        className={cn(
          "relative flex flex-col gap-1.5 px-5 py-4 md:px-6 md:py-4.5",
          inverse ? "border-b border-border-inverse" : "border-b border-border",
        )}
      >
        {/* **20/24px Bold, up from 16/18px Semibold, and it is a scale fix rather
            than a preference.** The reasoning for 16px was sound and was answering the
            wrong question: a 48px band heading over a chart makes the heading the
            loudest thing in the band, so the size came down until the figures won.
            What that produced across six cards was a surface whose largest type was a
            figure and whose every heading was the size of a UI label — so the result
            screen read as a different product from the entry point, whose own `h1` is
            80px. A heading can be subordinate to the evidence without being chrome.

            20/24 is the register the brand board sets its card headings in (~26px),
            and it stays a clear step under the 30/38px figures the cards carry, so the
            original ordering is intact. `font-bold` and `tracking-display` per the
            display rule; the two headings on these screens that contain a DRAWN
            wordmark are the exception and stay Medium 500 with `tracking-body`,
            measured off the mark's own stem. Neither of them is here. */}
        {/* The heading, and a chip beside it where the card has one. A row rather
            than a column, and `items-baseline`, so a "Held back" chip sits on the
            heading's own baseline instead of above a wrapped second line — and
            `flex-wrap`, so at 320 the chip drops under the heading rather than
            squeezing it. Screen 2's sealed cards are the only caller; Screen 1 passes
            no chip and gets the heading alone, with no extra box in the tree. */}
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
          <Heading
            id={headingId}
            className={cn(
              "min-w-0 text-xl leading-snug font-bold tracking-display text-pretty md:text-2xl",
              inverse ? "text-text-inverse" : "text-text",
            )}
          >
            {title}
          </Heading>
          {chip ? <Chip>{chip}</Chip> : null}
        </div>
        {lead ? (
          // Up from 14px with the heading. A 24px heading over a 14px lead is a
          // jump the eye reads as a caption rather than as the card's claim, and the
          // lead is where several cards state their finding.
          <p
            className={cn(
              "max-w-measure text-sm md:text-base",
              inverse ? "text-text-inverse-muted" : "text-text-muted",
            )}
          >
            {lead}
          </p>
        ) : null}
      </div>
      <div className={cn("relative px-5 py-5 md:px-6 md:py-6", bodyClassName)}>
        {children}
      </div>
    </section>
  );
}

/**
 * A section with the same landmark contract as `Panel` and no container at all.
 *
 * **This is the other half of the rule that a border has to be EARNED**, and it is
 * what the result surface was missing. Every section on the peer view was a `Panel`,
 * so the page rendered as eleven bordered objects on a page whose own zones were
 * already doing the sectioning — and nothing told the eye that a chart and a list of
 * eight words are different kinds of claim. Four `PanelTone` values were supposed to
 * carry that and could not: `plain` covered three unrelated kinds of evidence and
 * `tint` differed from it by about 4% lightness.
 *
 * The rule now is structural rather than tonal:
 *
 *   - **A block that draws a MARK gets a `Panel`.** A chart or a map needs a frame:
 *     the marks are measured against the card's own edges, and a bordered ground is
 *     what makes a bar's full width mean something. The containment chart, the ranked
 *     centres and the density map.
 *   - **A block that is a grid of its own cards gets a `Block`.** Wrapping five
 *     floating company cards in a sixth bordered box is a card inside a card, which
 *     is the one nesting no brief earns — and the outer border adds nothing, because
 *     the cards already have edges.
 *   - **A block that is text gets a `Block`.** The function list claims no share and
 *     no order; a container around it asserts it is an object with properties.
 *
 * The zone's own ground is the container in both cases. That is what a zone was for.
 *
 * `weight` is how the surface gets a hierarchy it previously faked with tone. The
 * primary evidence on a screen takes `lead` and reads a step larger than everything
 * under it; every other block takes the same size as a `Panel` heading, so a card and
 * a bare block in one row still read as peers.
 */
export function Block({
  id,
  title,
  lead,
  weight = "standard",
  className,
  children,
}: {
  id: string;
  title: string;
  lead?: string;
  /** `lead` is one step up, for the one section that is the screen's primary evidence. */
  weight?: "standard" | "lead";
  className?: string;
  children: React.ReactNode;
}) {
  const headingId = `${id}-heading`;
  return (
    // Same landmark contract as `Panel`: a <section> with no accessible name is not a
    // `region`, so it is unreachable by role and untestable by role. `expectBand` in
    // the browser helpers asserts exactly this.
    <section
      id={id}
      aria-labelledby={headingId}
      className={cn("flex min-w-0 flex-col", className)}
    >
      <header className="flex flex-col gap-1.5">
        <h2
          id={headingId}
          className={cn(
            "min-w-0 font-bold tracking-display text-balance text-text",
            weight === "lead"
              ? // A step above every `Panel` heading on the surface. This is the
                // hierarchy the four tones were trying to supply: the primary evidence
                // is larger, and nothing else has to be a different colour to say it
                // is a different kind of claim.
                "text-2xl leading-tight md:text-3xl"
              : "text-xl leading-snug md:text-2xl",
          )}
        >
          {title}
        </h2>
        {/* One muted ink, because every ground a `Block` renders on is light —
            `surface`, `surface-tint` and `surface-pale` all take `--ansr-text-muted`
            at 5.6:1 or better. A block on an inverse ground would need its own ink and
            deliberately is not offered one: the only inverse section on either screen
            is the terminating strip, which is a `Panel` because its fill is its
            meaning. */}
        {lead ? (
          <p className="max-w-measure text-sm text-text-muted md:text-base">
            {lead}
          </p>
        ) : null}
      </header>
      <div className="mt-5 md:mt-6">{children}</div>
    </section>
  );
}

/**
 * One full-bleed band of ground inside the floating result card.
 *
 * **Moved here from `screen1/peer-view.tsx`, because both result screens draw with it
 * now.** It was local to the peer view while the peer view was the only surface with
 * alternating grounds; the function view's own sections are the same kind of object —
 * a colour change at a boundary and nothing else — and two copies of this markup would
 * be two rhythms and two insets to keep in agreement. That is the reason
 * `components/public/` exists: importing across screen folders would have made
 * `screen1` the owner of a shape both screens depend on.
 *
 * **The grounds STRICTLY ALTERNATE, and the caller owns the sequence.** White beside
 * white is not a boundary, so every adjacent pair has to differ; `surface-pale` is
 * about 2% off white and may only ever neighbour the mint. Nothing here enforces it,
 * because the sequence depends on which sections a result actually has — see how each
 * screen derives its own.
 *
 * `overflow-hidden` via `.gcc-zone`, because a zone is where a full-bleed ornament
 * would be cropped, and adding one must not silently widen a document whose scroll
 * the iframe does not own.
 */
export function Zone({
  ground,
  className,
  style,
  behind,
  children,
}: {
  /**
   * **`inverse-soft` is the one ground that is exempt from the alternation, and the
   * exemption is what it is for.** The other three alternate so that every boundary
   * between two zones is visible; this one is the CLOSE, which is a different kind of
   * band — it asks rather than shows — and a deep ground against either white or mint
   * is a boundary by a wider margin than alternating white and mint ever bought. So it
   * may follow either of them, and a screen's sequence does not have to be re-derived
   * when it is added or removed.
   *
   * **It is teal-800 rather than the inverse teal, and that is a structural
   * requirement rather than a preference.** The close is the last band inside the
   * floating result card, and the card floats on flat teal-deep
   * (`.gcc-result-page`). An inverse band at the card's foot would be the same value
   * as the ground it is lifted off, so the card would lose its bottom edge — the one
   * edge that makes the whole surface read as a single object. `surface-inverse-soft`
   * exists for exactly this case and its own token note says so.
   *
   * Its ink contract holds with no per-placement measurement, because it is a flat
   * fill rather than a gradient: white 13.79:1, `--ansr-text-inverse-muted` 5.95:1,
   * `--ansr-accent-inverse` 5.64:1. **`--ansr-accent-warm` is not among them** and is
   * unusable here, which is why the close's eyebrow is teal-bright where every eyebrow
   * on a light ground is the warm orange.
   */
  /**
   * **`accent` is `--ansr-surface-accent`, the brand's own teal, and it is the ground a
   * band takes when it is the surface's primary evidence.** `Section` already documents
   * the device and reserves it for a FIGURE band — reversing content out of teal is the
   * most emphatic thing this palette can do without touching orange, which is committed
   * to the CTA and unusable on the mint at any size (2.63:1). `Zone` was never given a
   * dark ground because until now no band INSIDE the result card wanted one.
   *
   * **It is teal-600 rather than teal-deep, and that is a requirement rather than a
   * preference.** The result card floats on flat teal-deep, so a teal-deep band would be
   * the same value as the ground the card is lifted off and the card would lose its side
   * edges for the height of that band — measured, and it is the same defect
   * `inverse-soft` records for the card's FOOT. Teal-600 is four ramp steps clear of the
   * page ground and two clear of the close's own band, so neither boundary is lost and
   * the two dark bands do not read as a pair.
   *
   * Ink: white 8.55:1. **`--ansr-text-inverse-muted` is 2.6:1 here and is forbidden** —
   * a band on this ground takes white for every line, which is the same constraint
   * `ask-hero.tsx` carries on the brand gradient. `--ansr-accent-warm` is unusable, as
   * on `inverse-soft`.
   *
   * Exempt from the alternation for the reason `inverse-soft` is.
   */
  ground: "surface" | "tint" | "pale" | "accent" | "inverse-soft";
  /** Applied to the inner container, which is what carries the rhythm. */
  className?: string;
  /**
   * Also the inner container, so a caller staggering its zones can put
   * `--gcc-enter-index` on the same element as `.gcc-enter`. The function view is the
   * one caller.
   */
  style?: React.CSSProperties;
  /**
   * A FULL-BLEED layer behind the zone's padded container, edge to edge.
   *
   * **The one thing a zone could not previously hold, and the close is why.** Its
   * backdrop is a blurred field that has to reach the card's own edges — a decorative
   * layer inside the container would stop at the gutter and read as a rectangle parked
   * in the middle of the band. Every other ornament on these screens is either inside a
   * card or on the header band, which is not a zone.
   *
   * The caller is responsible for positioning it (`absolute inset-0`) and for
   * `aria-hidden`; this only guarantees it a positioned parent at the zone's full width
   * and that the content renders above it. `.gcc-zone` already clips, so a layer that
   * overflows cannot widen a document whose horizontal scroll the iframe does not own.
   */
  behind?: React.ReactNode;
  children: React.ReactNode;
}) {
  const GROUND = {
    surface: "bg-surface",
    tint: "bg-surface-tint",
    pale: "bg-surface-pale",
    accent: "bg-surface-accent",
    "inverse-soft": "bg-surface-inverse-soft",
  } as const;
  return (
    // `relative` unconditionally rather than only with `behind`: it changes nothing
    // visually on a static block, and a positioning context that appears and disappears
    // with a prop is the kind of difference a caller debugs once and never expects.
    <div className={cn("gcc-zone relative", GROUND[ground])}>
      {behind}
      <div
        className={cn(
          // Above the full-bleed layer, and it needs its own stacking position to be
          // there — the layer is absolutely positioned, so a static sibling after it
          // paints underneath.
          "relative",
          // Tighter than the band system's rhythm, on purpose. This is an embedded
          // tool inside a page with its own rhythm, and the complaint this pass is
          // answering was that everything was too far apart.
          //
          // **`md:px-8` rather than the container's own `md:px-12`, and the 16px is
          // measured rather than trimmed by eye.** A zone is inside the floating card,
          // so it is inset three times over — the container's gutter, the card's 8px
          // rim, then this — and at `md:px-12` the snapshot's leading city name
          // overflowed its cell by 3px and truncated to "Bengalu…". The figure cells
          // are the narrowest thing on the surface and the first to fail, so this
          // padding is set by them.
          "mx-auto max-w-content px-6 py-8 md:px-8 md:py-10",
          className,
        )}
        style={style}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * A quiet trailing control on a `Panel`'s heading row, or under its body.
 *
 * Text plus a chevron, never a filled button: there is one filled control per
 * screen and it is not a disclosure. The chevron is `aria-hidden` because the
 * label already says what pressing it does.
 */
export function PanelAction({
  children,
  onClick,
  expanded,
  controls,
}: {
  children: React.ReactNode;
  onClick: () => void;
  /** Set when this toggles a region, so the state is announced rather than shown. */
  expanded?: boolean;
  controls?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={expanded}
      aria-controls={controls}
      /* **`min-h-11`, up from `min-h-9`.** It measured 126.5 × 36 on the peer view,
         which is under the 44px minimum on one axis — and it is one of only four
         focusable things on the whole screen, so there was no reason for it to be the
         tight one. The extra height is padding around the same label, so nothing
         moves except the hit area. */
      className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-accent-teal transition-colors duration-fast ease-standard hover:text-text"
    >
      {children}
      {/* **A chevron, not an arrow.** `→` is the glyph for going somewhere, and this
          control goes nowhere: it expands a region in place, on a tool that does not
          own the URL bar. A reader who reads it as navigation is being told the wrong
          thing by the one character that is not a word. `⌄` and `⌃` are the disclosure
          pair, so the collapsed and expanded states are the same glyph rotated rather
          than an arrow becoming a dash — which is what it was, and a dash reads as
          "minus" or as an em rule rather than as "this closes". */}
      <span
        aria-hidden="true"
        className={cn(
          "text-base leading-none transition-transform duration-fast ease-standard",
          expanded === true ? "rotate-180" : "",
        )}
      >
        {"\u2304"}
      </span>
    </button>
  );
}

/**
 * One figure and its label.
 *
 * The figure leads at display size because a number is the fastest thing on a
 * screen to read, and the label sits under it rather than beside it so a long
 * label wraps without shifting the figure's alignment. `footnote` is where a
 * figure states its own limits — an approximate total says so here rather than
 * in a legend the eye never reaches.
 */
export function Stat({
  value,
  label,
  footnote,
  emphasis = false,
  size = "md",
  ground = "surface",
}: {
  value: string;
  label: string;
  footnote?: string;
  emphasis?: boolean;
  /**
   * `display` is for a figure that IS the band — the industry count, the national
   * base. The first pass set every figure at one size, so the most persuasive
   * numbers on the screen were the same weight as a caption beside a chart.
   */
  size?: "md" | "display";
  ground?: Ground;
}) {
  const inverse = ground === "inverse";
  return (
    // A rule under the figure, ansr.com's own stat shape: it separates the number
    // from its label without a box, and it gives a lone figure an edge to sit on.
    <div className="flex flex-col gap-3">
      <p
        className={cn(
          "leading-tight font-bold tracking-display tabular-nums",
          // Capped at 60px, matching `FractionBar`. It is not the hero: 72px is
          // reserved for the h1, and at 72px in a one-third column "1.06 million"
          // broke across two lines mid-figure, which reads as two numbers.
          size === "display" ? "text-5xl md:text-6xl" : "text-4xl md:text-5xl",
          inverse
            ? "text-text-inverse"
            : emphasis
              ? "text-accent-teal"
              : "text-text",
        )}
      >
        {value}
      </p>
      <div
        className={cn(
          "border-t pt-3",
          inverse ? "border-border-inverse" : "border-border-strong",
        )}
      >
        <p
          className={cn(
            "font-medium",
            size === "display" ? "text-lg" : "text-base",
            inverse ? "text-text-inverse" : "text-text",
          )}
        >
          {label}
        </p>
        {footnote ? (
          <p
            className={cn(
              "mt-1 text-xs",
              inverse ? "text-text-inverse-muted" : "text-text-muted",
            )}
          >
            {footnote}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * A city, an index membership, a small fact. Pill radius is the one place the
 * brand's radius scale allows it — tokens.css restricts `pill` to tags and
 * counters, which is exactly this.
 */
export function Chip({
  children,
  tone = "neutral",
  size = "md",
  ground = "surface",
}: {
  children: React.ReactNode;
  /**
   * `accent` marks something the visitor should notice once per card, never
   * twice. There is no danger tone: this palette carries status by form, not by
   * hue, and a chip has no form to vary.
   *
   * **`quiet` is the same pill with a step less of everything, at ANSR's request**, and
   * it exists for one placement: the largest-centres ranking, where a row carries two
   * or three city pills and a year pill on the line ABOVE its own bar. A neutral chip
   * there is `grey-100` under black at Medium — five rows of it read as a second set of
   * marks competing with the bars, which is the interference ANSR reported. It is still
   * a filled pill rather than an outlined one: a hairline round four pills a row is more
   * chrome than the fill it replaces, not less.
   *
   * Both steps stay well clear of the floor. `grey-50` under `grey-700` is 7.81:1
   * against the neutral chip's 6.88:1, so the quieter pill is the more legible of the
   * two — what it gives up is WEIGHT, which is the thing that was competing.
   */
  tone?: "neutral" | "accent" | "quiet";
  /**
   * `sm` is a step down in type and padding, for a chip that sits beside a heading or
   * inside a dense row rather than in a list of its own.
   *
   * **The index memberships take it, at ANSR's request.** "Fortune Global 500" is eighteen
   * characters and it appeared at the same size as a city chip — on the ranked rows that
   * put a full-size pill in the middle of a one-line row, competing with the company name
   * it qualifies. It is a footnote about the company, not a second subject.
   */
  size?: "md" | "sm";
  /**
   * A neutral chip is a filled grey pill, which disappears on the tint ground and
   * inverts wrongly on the inverse one. Passing the ground is what keeps one chip
   * component legible on all three rather than spawning a second.
   */
  ground?: Ground;
}) {
  const neutral: Record<Ground, string> = {
    surface: "bg-surface-sunken text-text",
    tint: "bg-surface text-text",
    inverse: "border border-border-inverse text-text-inverse",
  };
  /**
   * The quiet pill, per ground. On white the fill steps down a rung of the neutral ramp
   * and the ink steps back to the muted grey. On the mint there is no rung below the
   * card's own white, so only the ink moves — `grey-50` on the tint reads as a gap
   * rather than as a quieter pill.
   */
  const quiet: Record<Ground, string> = {
    surface: "bg-surface-subtle text-text-muted",
    tint: "bg-surface text-text-muted",
    inverse: "border border-border-inverse text-text-inverse-muted",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full",
        // Medium is what makes a neutral chip read as a fact rather than as a caption;
        // the quiet one gives exactly that up, which is the point of it.
        tone === "quiet" ? "font-regular" : "font-medium",
        size === "sm"
          ? "px-2 py-0.5 text-[0.6875rem] leading-snug"
          : "px-2.5 py-1 text-xs",
        tone === "accent"
          ? "bg-surface-accent text-text-on-accent"
          : tone === "quiet"
            ? quiet[ground]
            : neutral[ground],
      )}
    >
      {children}
    </span>
  );
}

/**
 * A labelled row of figures. `dl` rather than divs because these genuinely are
 * term-and-definition pairs, and the semantics are free.
 */
export function FactList({
  facts,
}: {
  facts: ReadonlyArray<{ term: string; value: string }>;
}) {
  return (
    <dl className="flex flex-col gap-2">
      {facts.map((fact) => (
        <div key={fact.term} className="flex flex-wrap items-baseline gap-x-2">
          <dt className="text-xs text-text-muted">{fact.term}</dt>
          <dd className="text-sm font-medium text-text tabular-nums">
            {fact.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * A note the screen owes the reader: where a number came from, or what it does
 * not cover. Kept visually quiet but never hidden behind a disclosure — a caveat
 * the visitor has to open is a caveat the screen is hiding.
 */
export function Provenance({
  children,
  ground = "surface",
}: {
  children: React.ReactNode;
  ground?: Ground;
}) {
  return (
    <p
      className={cn(
        "max-w-measure border-s-2 ps-3 text-xs",
        ground === "inverse"
          ? "border-border-inverse text-text-inverse-muted"
          : "border-border-strong text-text-muted",
      )}
    >
      {children}
    </p>
  );
}
