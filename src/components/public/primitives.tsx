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

const SECTION_PADDING: Record<SectionWeight, string> = {
  connective: "py-12",
  standard: "py-16",
  pivotal: "py-20",
};

export function Section({
  id,
  title,
  kicker,
  lead,
  tint = false,
  weight = "standard",
  headingLevel = 2,
  children,
}: {
  /** Also the `aria-labelledby` target, so the section is a real landmark. */
  id: string;
  title: string;
  kicker?: string;
  lead?: string;
  /** Alternating tint is the separation mechanism. Alternate it, do not mix. */
  tint?: boolean;
  weight?: SectionWeight;
  headingLevel?: 2 | 3;
  children: React.ReactNode;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const headingId = `${id}-heading`;

  return (
    // A <section> with no accessible name is not a `region` landmark, so it is
    // unreachable by role for a screen-reader user and untestable by role here.
    <section
      id={id}
      aria-labelledby={headingId}
      className={cn(
        SECTION_PADDING[weight],
        tint ? "bg-surface-subtle" : "bg-surface",
      )}
    >
      <div className="mx-auto max-w-content px-6 md:px-12">
        <header className="flex flex-col gap-3">
          {kicker ? (
            <p className="text-xs font-semibold tracking-caps text-accent-teal uppercase">
              {kicker}
            </p>
          ) : null}
          <Heading
            id={headingId}
            className="text-2xl font-semibold tracking-heading text-text md:text-3xl"
          >
            {title}
          </Heading>
          {lead ? (
            <p className="max-w-measure text-base text-text-muted">{lead}</p>
          ) : null}
        </header>
        <div className="mt-8">{children}</div>
      </div>
    </section>
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
}: {
  value: string;
  label: string;
  footnote?: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <p
        className={cn(
          "text-4xl leading-tight font-bold tracking-display tabular-nums md:text-5xl",
          emphasis ? "text-accent-teal" : "text-text",
        )}
      >
        {value}
      </p>
      <p className="text-sm font-medium text-text">{label}</p>
      {footnote ? <p className="text-xs text-text-muted">{footnote}</p> : null}
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
}: {
  children: React.ReactNode;
  /**
   * `accent` marks something the visitor should notice once per card, never
   * twice. There is no danger tone: this palette carries status by form, not by
   * hue, and a chip has no form to vary.
   */
  tone?: "neutral" | "accent";
  }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        tone === "accent"
          ? "bg-surface-accent text-text-on-accent"
          : "bg-surface-sunken text-text",
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
export function Provenance({ children }: { children: React.ReactNode }) {
  return (
    <p className="max-w-measure border-s-2 border-border-strong ps-3 text-xs text-text-muted">
      {children}
    </p>
  );
}
