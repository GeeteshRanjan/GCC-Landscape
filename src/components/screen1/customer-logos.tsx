import { usePublicCopy } from "@/components/public/copy-context";
import type { CustomerLogo } from "@/data/schema";

/**
 * The customer-logo strip: one row of marks, moving continuously, on the palest
 * ground in the palette.
 *
 * **What this band claims, and what it must not.** These are companies ANSR has
 * worked with in India. Nothing here says or implies they used this tool, and the
 * section's accessible name is where that is stated precisely — `customersLabel` in
 * `publicCopySchema`, whose shipped wording and the reasoning for it are in
 * `CUSTOMERS.label`. There is no visible heading by design, so that name is the
 * only thing making it a real `region` landmark rather than an anonymous
 * `<section>`.
 *
 * **These are third-party marks, so three of the usual moves are unavailable.**
 * They are not recoloured, not monochromed and not put in tiles: each is a
 * registered trademark whose colour is part of it, and a logo wall of bordered
 * boxes reads as a comparison table. So the only thing this component controls is
 * size and rhythm — which turns out to be the whole design problem, below.
 *
 * The motion, the seam and the reduced-motion fallback are all in `.gcc-marquee`
 * in globals.css, where the iframe constraints that shaped them are recorded.
 */

/**
 * **The marks are DATA now, from `siteContent.logos`, threaded in as a prop.** They were
 * a module constant here; the shipped ten are unchanged and live in `DEFAULT_LOGOS`,
 * which is also what `--reseed-site-content` restores. What an admin controls is which
 * of the files already served from `public/logos/` appear, in what order, and under what
 * name — `customerLogoSchema` validates `src` against that directory, so this cannot
 * become a way to point the strip at an arbitrary URL. Adapting a NEW mark is still a
 * `brand_asset.py` step and a commit.
 *
 * Everything below about how they are sized is unchanged, and all of it still matters:
 *
 * **Dimensions are stated rather than left to the browser**, so each slot has its
 * aspect ratio before the file arrives. Without them the row is ten zero-width
 * boxes until the last logo loads and then jumps to full width — a layout shift
 * on the band directly under the form, which is the worst place on the page for
 * one. They are the mark's own ink bounds, which is why the schema requires both and
 * why an admin adding a row has to measure rather than guess.
 *
 * **Four are PNG and six are SVG, and the split is not arbitrary.** Best Buy,
 * Wells Fargo, PepsiCo and Goldman Sachs were supplied as a single base64 raster
 * inside an SVG `<pattern>` — not vectors at all, and ~520 KB between them at
 * full source resolution. They are re-encoded to plain PNGs at 2x their display
 * height, which is 36 KB for the four. The other six are genuine paths and stay
 * as SVG. A future batch of logos should be checked the same way: an `.svg` that
 * is really a raster is invisible until someone looks at its bytes.
 *
 * Walmart's export also arrived with a `viewBox` nine tenths too small, so only
 * "Wal" rendered. Corrected in `public/logos/walmart.svg` to its real ink bounds.
 */

/**
 * **A height cap AND a width cap, which is the one real design decision here.**
 *
 * A single uniform height is the obvious rule and it is wrong, visibly. These ten
 * marks are three different shapes: a one-line wordmark (Walmart, 4.9:1), a
 * two-line lockup (Wells Fargo, Goldman, Best Buy) and a compact stacked mark
 * (Target, 0.8:1). Set every one to 40px tall and Walmart renders 195px wide
 * beside a 31px Target — six times the optical weight, so the strip reads as
 * "Walmart, and some others" rather than as a set.
 *
 * Capping both dimensions fixes it with two numbers instead of ten hand-tuned
 * heights, and it self-corrects for logos nobody has seen yet: a tall mark hits
 * the height cap, a wide one hits the width cap, and everything in between is
 * unaffected. Of these ten only Walmart hits the width cap, which is exactly the
 * outlier.
 *
 * Both come off the spacing scale rather than being picked pixel values — `h-10`
 * is 40px, `max-w-32` is 128px.
 *
 * **`h-10 w-auto`, not `max-h-10 h-auto`, and the difference was a bug.** With
 * both CSS dimensions `auto`, a replaced element falls back to its source's
 * intrinsic SIZE — and an SVG carrying only a `viewBox` has an intrinsic ratio but
 * no intrinsic size, so all six vector marks resolved against the 300x150 default
 * and then collapsed to 0x0 inside the capped flex row. Two things fix it
 * together and both are worth keeping: the files carry explicit `width`/`height`
 * again, and the height here is definite so `w-auto` has a real number to scale
 * the ratio from.
 *
 * `object-contain` is what makes the width cap non-destructive. With a definite
 * height and a clamped width the box is no longer the logo's aspect ratio, so
 * without it Walmart would be squashed to fit; with it the mark is fitted inside
 * the box and centred instead.
 */
const LOGO_SIZE = "h-10 w-auto max-w-32 object-contain";

function LogoRow({
  logos,
  duplicate,
}: {
  logos: readonly CustomerLogo[];
  duplicate: boolean;
}) {
  return (
    /* The gap is on the container, not a margin on each item, and that is what
       makes the loop seamless: the space between the last logo of one copy and
       the first of the next is the same gap as every other pair, so there is no
       wider join once per cycle. `shrink-0` because the track is `max-content` —
       without it flex would compress the row back to the parent's width and the
       -50% translate would no longer be one full copy. */
    <ul
      className="flex shrink-0 items-center gap-14 px-7 md:gap-20 md:px-10"
      // The second copy exists only so the loop has somewhere to go. Announcing
      // ten company names twice is the accessibility bug this one attribute
      // prevents.
      aria-hidden={duplicate || undefined}
    >
      {logos.map((logo) => (
        <li key={logo.name} className="flex shrink-0 items-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- ten small
              static files already sized for their slot; an optimiser round trip
              would add a build step and change nothing. */}
          <img
            src={logo.src}
            // Named in the first copy, empty in the second. A logo wall's
            // information IS which companies are on it, so the names are content
            // rather than decoration — the strip is evidence, and evidence a
            // screen-reader user cannot read is not evidence.
            alt={duplicate ? "" : logo.name}
            width={logo.width}
            height={logo.height}
            className={LOGO_SIZE}
            // Eager, not lazy. The strip sits just under the form, so it is in or
            // near the first screen, and a lazy logo pops in after the row has
            // already started moving.
            loading="eager"
            decoding="async"
          />
        </li>
      ))}
    </ul>
  );
}

export function CustomerLogos({ logos }: { logos: readonly CustomerLogo[] }) {
  const copy = usePublicCopy();

  return (
    <section
      id="customers"
      // No visible heading, so the name comes from here. Without it a `<section>`
      // is not a landmark and is unreachable by role.
      //
      // **Published copy, and this is the one accessible name on the surface that is.**
      // It is safe because the string states a fact about ANSR's own business rather
      // than describing what is drawn: the marks carry their own names, so an edit here
      // cannot make the images unreadable — the worst it can do is misdescribe the set,
      // which is exactly the claim ANSR is the right party to word.
      aria-label={copy.customersLabel}
      // **Read together with the tint band's bottom padding in `peer-view.tsx`** —
      // the two are adjacent and add up, and at 40 + 56 = 96px the gap between the
      // form card and this strip read as a hole rather than as separation. Both came
      // down; neither number means anything on its own.
      className="bg-surface-pale py-7 md:py-8"
    >
      <div className="gcc-marquee">
        <div className="gcc-marquee-track">
          <LogoRow logos={logos} duplicate={false} />
          <LogoRow logos={logos} duplicate />
        </div>
      </div>
    </section>
  );
}
