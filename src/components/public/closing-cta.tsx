import { cn } from "@/lib/utils";

/**
 * The close, shared by both public screens.
 *
 * It links out to a separate landing page and collects nothing — no form, no email
 * field, and no visitor input stored anywhere in this codebase. Lead capture is
 * out of scope by design: the tool informs and earns a conversation.
 *
 * **It is the only band that carries the orange fill**, and that is now what makes
 * it the close rather than being the only dark band on the screen. The inverse
 * ground is used deliberately elsewhere — the hero, and each figure band — because
 * a screen built from white and one grey had no ground the eye could rest on. What
 * separates this band from those is the ask: one orange pill, once per screen.
 *
 * Shared rather than copied because the two screens' closes are the same object
 * with different words in it, and a copy is how one of them ends up with white on
 * orange again.
 */

export interface ClosingCopy {
  ctaHeading: string;
  ctaBody: string;
  ctaLabel: string;
}

/**
 * The one outward call to action, once per screen.
 *
 * A pill, because that is what ANSR's own site uses for a primary action and the
 * radius scale allows `pill` here. Everything else on these screens stays hard-edged
 * at `md` — the pill is the shape that marks the single action, so it only works as
 * long as nothing else borrows it.
 *
 * Extracted so both the label and the pairing live in one place. It was inline, and
 * inline is how the second one ends up white on orange.
 */
export function PrimaryCta({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      // Opens in the top-level window rather than inside the iframe: a marketing
      // page rendered in a 900px frame inside another page is broken, and `_parent`
      // keeps the visitor on ansr.com rather than in a new tab they have to manage.
      target="_parent"
      className={cn(
        "inline-flex min-h-12 items-center rounded-full bg-action px-7 text-base font-semibold",
        // BLACK on the orange fill, not white. Measured 6.52:1 against 3.22:1,
        // which fails AA at every size this label uses. The palette was left alone
        // and a legal pairing used instead.
        "text-text transition-colors duration-fast ease-standard hover:bg-action-hover",
      )}
    >
      {children}
    </a>
  );
}

export function ClosingCta({
  href,
  copy,
  headingId,
}: {
  href: string;
  copy: ClosingCopy;
  /** Distinct per screen, because both can exist in one document's history. */
  headingId: string;
}) {
  return (
    <section
      aria-labelledby={headingId}
      className="relative overflow-hidden bg-surface-inverse py-20"
    >
      {/* The one brand texture on the public screens, and the close is where it
          belongs: this band was a flat teal-deep rectangle, and it is the only band
          that asks for something rather than showing something — so it is the one
          place a lift in presence is not competing with a figure.

          Adapted, not placed: `texture/deep-teal-diagonal-wide.svg` is 2560x1600
          full-viewport deck art, so a 480-unit band was cropped out of it with
          `brand_asset.py crop --viewbox "0 560 2560 480"` and written to
          `public/brand/`. Held back by `.ansr-motif` and masked away from the
          leading edge, where the heading and body copy sit.

          Contrast measured rather than eyeballed, because the streaks sit under
          text: the lightest streak composited at the motif opacity over the
          inverse surface leaves white at 14.11:1 and the 80% body copy at 9.53:1.
          Both clear AA with room. */}
      <div className="ansr-motif gcc-close-streaks hidden md:block" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element -- decorative,
            fixed intrinsic ratio, and not worth an optimiser round trip. */}
        <img
          src="/brand/close-streaks.svg"
          alt=""
          width={2560}
          height={480}
          className="block h-full w-full object-cover"
        />
      </div>
      <div className="relative mx-auto flex max-w-content flex-col gap-6 px-6 md:px-12">
        <h2
          id={headingId}
          className="max-w-measure text-3xl leading-tight font-bold tracking-display text-balance text-text-inverse md:text-4xl lg:text-5xl"
        >
          {copy.ctaHeading}
        </h2>
        {/* The named token rather than `text-inverse/80`. An opacity on white was
            the same value by hand, re-derived at every dark band, and one of them
            would eventually pick 60%. */}
        <p className="max-w-measure text-lg text-text-inverse-muted">
          {copy.ctaBody}
        </p>
        <div className="pt-2">
          <PrimaryCta href={href}>{copy.ctaLabel}</PrimaryCta>
        </div>
      </div>
    </section>
  );
}
