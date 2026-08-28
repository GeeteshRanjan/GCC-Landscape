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
    // The brand's own teal gradient, not a flat fill and not white. Both public
    // screens used to open on `bg-surface`, which put the single most important
    // moment on either screen on the same ground as everything after it — the
    // reason the whole tool read as a form. `--ansr-gradient-teal` is a fitted
    // brand token (radial teal over teal-deep), so this is the brand's actual
    // display ground rather than a colour picked to look richer.
    //
    // Contrast holds everywhere on it without a per-placement measurement: the
    // gradient's brightest point is `--ansr-teal`, where white is 8.55:1, and it
    // darkens to teal-deep at 16.26:1. The peak sits bottom-trailing and the
    // copy is leading-aligned, so the text is over the darker half regardless.
    <div className="gcc-ground-gradient relative overflow-hidden pt-20 pb-16 md:pt-28 md:pb-20">
      {/* Decorative and redundant: everything it could convey is in the text
          beside it. Out of the tab order and out of the accessibility tree. */}
      <div
        className={cn(
          "ansr-motif gcc-motif-inverse hidden md:block",
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
 * The display headline both screens open with.
 *
 * One component rather than a class string repeated in three places, because it
 * carries the `tabIndex={-1}` and the ref that `tool.tsx` moves focus to on every
 * phase change — and a phase whose heading forgot either is a phase change a
 * screen-reader user is never told about.
 */
export function ScreenTitle({
  headingRef,
  children,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  children: React.ReactNode;
}) {
  return (
    <h1
      ref={headingRef}
      tabIndex={-1}
      className={
        // 38/48px became 48/60/72. ansr.com's own hero sets around 72px, and the
        // token scale stopped one step below the brand's display voice until this
        // pass added `text-7xl`. `text-balance` matters at this size: an unbalanced
        // 72px headline drops one short word onto its own line.
        "text-5xl leading-tight font-bold tracking-display text-balance text-text-inverse md:text-6xl lg:text-7xl"
      }
    >
      {children}
    </h1>
  );
}

/**
 * The kicker every public screen opens with. One string, one place, so the two
 * screens cannot drift apart on the thing that tells a visitor they are still in
 * the same tool.
 */
export function HeaderKicker({ children }: { children: React.ReactNode }) {
  return (
    // Teal-300 on the gradient rather than the accent teal, which is a mid-ramp
    // step and disappears against a ground made of the same hue. 6.27:1 at the
    // gradient's darkest, 5.51:1 at its brightest.
    <p className="text-xs font-semibold tracking-caps text-text-inverse-muted uppercase">
      {children}
    </p>
  );
}

/** The header's lead paragraph. Larger than a section lead — it is the promise. */
export function HeaderLead({ children }: { children: React.ReactNode }) {
  return (
    // `text-pretty` rather than `text-balance`: this is a two-to-three line lead,
    // and balancing would even out the line lengths of a paragraph that reads
    // better ragged. Pretty only refuses to leave the last word on a line of its
    // own, which is what the ask lead was doing with "mapped." at 1440px.
    <p className="max-w-measure text-lg text-pretty text-text-inverse-muted md:text-xl">
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
        // Outlined on the inverse ground, because the header it lives in is now
        // dark. Pill rather than 4px: this sits inside the hero, where ansr.com's
        // own controls are pills, and the radius scale allows `pill` here.
        "inline-flex min-h-11 items-center rounded-full border border-border-inverse px-5",
        "text-sm font-semibold text-text-inverse transition-colors duration-fast ease-standard",
        "hover:bg-surface-inverse-soft",
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
          <dt className="text-text-inverse-muted">{fact.term}</dt>
          <dd className="font-medium text-text-inverse">{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}
