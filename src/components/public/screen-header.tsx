import { cn } from "@/lib/utils";

/**
 * The header band both public screens open with, and the only place either of
 * them carries brand ornament.
 *
 * One motif moment per screen, on the screen's own entry point. The evidence
 * bands and the metric cards get none — ornament is not a substitute for
 * hierarchy, and a dense block of figures wants no competition. The motif is
 * always adapted before it is placed: recoloured and trimmed through
 * `scripts/brand_asset.py`, written to `public/brand/`, and held back by the
 * `.ansr-motif` posture in tokens.css. Never referenced straight out of
 * `assets/brand/`.
 *
 * Hidden below `md` in both screens' placements: on a phone the header text runs
 * the full width, so there is no empty ground for ornament to occupy and it would
 * only sit under the copy. Nothing is lost — it was never carrying meaning.
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

export function ScreenHeader({
  motif,
  children,
}: {
  motif: HeaderMotif;
  children: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden bg-surface pt-16 pb-12">
      {/* Decorative and redundant: everything it could convey is in the text
          beside it. Out of the tab order and out of the accessibility tree. */}
      <div
        className={cn("ansr-motif hidden md:block", motif.placement)}
        aria-hidden="true"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- decorative,
            fixed intrinsic ratio, and not worth an optimiser round trip. */}
        <img
          src={motif.src}
          alt=""
          width={motif.width}
          height={motif.height}
          // Fills the oversized, masked box rather than sitting at its intrinsic
          // width, which clipped at a hard edge mid-headline.
          className="block h-auto w-full"
        />
      </div>
      <div className="relative mx-auto max-w-content px-6 md:px-12">
        {children}
      </div>
    </div>
  );
}

/**
 * The kicker every public screen opens with. One string, one place, so the two
 * screens cannot drift apart on the thing that tells a visitor they are still in
 * the same tool.
 */
export function HeaderKicker({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold tracking-caps text-accent-teal uppercase">
      {children}
    </p>
  );
}

/**
 * A quiet, bordered control: the way back, and the way on. Deliberately not the
 * orange fill — that is reserved for the one outward call to action per screen,
 * and a screen with two orange buttons has no primary action at all.
 */
export function QuietButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex min-h-11 items-center rounded-md border border-border-strong bg-surface px-4",
        "text-sm font-semibold text-text transition-colors duration-fast ease-standard",
        "hover:bg-surface-sunken",
      )}
    >
      {children}
    </button>
  );
}

/**
 * The four answers, echoed back in the header of both screens.
 *
 * Shown rather than assumed: a visitor who picked the wrong revenue band should be
 * able to see that from the answer, and on Screen 2 it is also the reminder of
 * which industry the peer view was filtered to — the figures on that screen are
 * national, and the copy says so.
 */
export function InputSummary({
  facts,
}: {
  facts: ReadonlyArray<{ term: string; value: string }>;
}) {
  return (
    <dl className="flex flex-wrap items-baseline gap-x-6 gap-y-2 text-sm">
      {facts.map((fact) => (
        <div key={fact.term} className="flex items-baseline gap-2">
          <dt className="text-text-muted">{fact.term}</dt>
          <dd className="font-medium text-text">{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}
