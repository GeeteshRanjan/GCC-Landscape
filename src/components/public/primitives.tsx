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
export type PanelTone = "plain" | "tint" | "accent" | "inverse";

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
export function Panel({
  id,
  title,
  lead,
  tone = "plain",
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
  const accent = tone === "accent";

  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={cn(
        // **Radius `lg` and a soft shadow, where this was radius `md` and a border
        // alone.** The rule that the public screens carry no shadow was written when
        // every card sat on one white page, and it is what made eight cards read as
        // eight outlined rectangles. These cards now sit on alternating grounds, and a
        // card that has to read as lifted off a pale mint band needs elevation from
        // somewhere — a hairline against a tint is nearly invisible. `lg` is the same
        // step the entry point's form card takes, which is the composition this
        // surface is being brought into line with.
        "gcc-panel relative flex min-w-0 flex-col overflow-hidden rounded-lg border",
        inverse
          ? "border-border-inverse bg-surface-inverse"
          : tone === "tint"
            ? "border-border-tint bg-surface-pale shadow-xs"
            : "border-border-strong/60 bg-surface shadow-sm",
        className,
      )}
    >
      {motif ? (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          {motif}
        </div>
      ) : null}
      {/* The header. `accent` draws it as the teal gradient strip, which is the one
          place a card announces itself in colour rather than in weight; the others
          keep a hairline under a plain fill. Either way the heading wraps inside its
          own column rather than pushing the row taller than its neighbour's. */}
      <div
        className={cn(
          "relative flex flex-col gap-1.5 px-5 py-4 md:px-6 md:py-4.5",
          accent
            ? "gcc-ground-gradient"
            : inverse
              ? "border-b border-border-inverse"
              : tone === "tint"
                ? "border-b border-border-tint"
                : "border-b border-border",
        )}
      >
        <h2
          id={headingId}
          className={cn(
            // 16/18px, not 48. On this surface the figures are the subject and the
            // heading is the label.
            "min-w-0 text-base font-semibold tracking-heading text-pretty md:text-lg",
            inverse || accent ? "text-text-inverse" : "text-text",
          )}
        >
          {title}
        </h2>
        {lead ? (
          <p
            className={cn(
              "max-w-measure text-sm",
              inverse || accent ? "text-text-inverse-muted" : "text-text-muted",
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
      className="inline-flex min-h-9 items-center gap-1.5 text-sm font-semibold text-accent-teal transition-colors duration-fast ease-standard hover:text-text"
    >
      {children}
      <span aria-hidden="true" className="text-base leading-none">
        {expanded === true ? "\u2013" : "\u2192"}
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
  ground = "surface",
}: {
  children: React.ReactNode;
  /**
   * `accent` marks something the visitor should notice once per card, never
   * twice. There is no danger tone: this palette carries status by form, not by
   * hue, and a chip has no form to vary.
   */
  tone?: "neutral" | "accent";
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
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        tone === "accent"
          ? "bg-surface-accent text-text-on-accent"
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
