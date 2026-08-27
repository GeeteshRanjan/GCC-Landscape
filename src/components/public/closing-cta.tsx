import { cn } from "@/lib/utils";

/**
 * The close, shared by both public screens.
 *
 * It links out to a separate landing page and collects nothing — no form, no email
 * field, and no visitor input stored anywhere in this codebase. Lead capture is
 * out of scope by design: the tool informs and earns a conversation.
 *
 * **One inverse band per screen, and this is it.** Alternating surface tint is the
 * separation mechanism everywhere else; the close earns the inversion because it
 * is the only band on a screen that asks for something rather than showing
 * something. A second inverse band would spend that distinction.
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
    <section aria-labelledby={headingId} className="bg-surface-inverse py-20">
      <div className="mx-auto flex max-w-content flex-col gap-6 px-6 md:px-12">
        <h2
          id={headingId}
          className="max-w-measure text-2xl font-semibold tracking-heading text-text-inverse md:text-3xl"
        >
          {copy.ctaHeading}
        </h2>
        <p className="max-w-measure text-base text-text-inverse/80">
          {copy.ctaBody}
        </p>
        <div>
          <a
            href={href}
            // Opens in the top-level window rather than inside the iframe: a
            // marketing page rendered in a 900px frame inside another page is
            // broken, and `_parent` keeps the visitor on ansr.com rather than in a
            // new tab they have to manage.
            target="_parent"
            className={cn(
              "inline-flex min-h-11 items-center rounded-md bg-action px-6 text-base font-semibold",
              // BLACK on the orange fill, not white. Measured 6.52:1 against
              // 3.22:1, which fails AA at every size this label uses. The palette
              // was left alone and a legal pairing used instead.
              "text-text transition-colors duration-fast ease-standard hover:bg-action-hover",
            )}
          >
            {copy.ctaLabel}
          </a>
        </div>
      </div>
    </section>
  );
}
