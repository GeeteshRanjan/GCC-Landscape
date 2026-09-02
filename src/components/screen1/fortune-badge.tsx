/**
 * The Fortune Global 500 accreditation badge.
 *
 * **One component because one place has to decide the size**, and the size is the only
 * real decision here. It replaced a `Chip tone="accent" size="sm"` reading "Fortune
 * Global 500" at two sites — the comparison card and the largest-centres ranking row —
 * and the two must not drift apart, because a reader crossing between them is reading
 * the same fact about the same kind of company.
 *
 * **16px tall, set by the CAP HEIGHT of the name beside it and not by the artwork.**
 * Two larger sizes were tried and each was rejected as too big at the project owner's
 * instruction. 40px came from the badge's own wordmark — `FORTUNE` occupies 376 of the
 * artwork's 1920 units, so 40px put that line at a 7.8px cap, matching the 11px chip
 * text it replaced — and read as a second subject on the card. 24px matched the `sm`
 * chip's 22px box and was still taller than the 18px name it qualifies. 16px is that
 * name's cap height, so the badge sits inside the text's own band.
 *
 * **The consequence, stated because it is the whole cost of the size: below about 20px
 * `FORTUNE` and `GLOBAL` stop resolving and the badge reads as a red `500` mark.** The
 * artwork stacks three elements and only the largest survives. Accepted at the project
 * owner's instruction. It is also why `alt` is load-bearing here in a way it would not
 * be at 40px — the accessible name is now the only full statement of the index, so it
 * must never be emptied to match the company mark's `alt=""`.
 *
 * **The red is Fortune's and is deliberately outside the token system**, at the project
 * owner's explicit instruction. It lives inside the PNG, never in CSS, so the
 * no-raw-hex rule is not bent to admit it — `brand_lint.py` scans code, and there is no
 * colour here for it to find. Do not derive a token from it and do not recolour the
 * artwork; a recoloured accreditation mark is a fabricated one.
 *
 * **`alt` carries the index name, unlike the peer card's company mark right above it.**
 * The mark takes `alt=""` because the company name is the very next element, so naming
 * it would say the company twice. This badge is the opposite case: it REPLACES text
 * that was the only statement of the fact, so its accessible name is the fact.
 *
 * Asset: `public/badges/fortune-global-500.png`, 111×120, derived from the supplied
 * raster by cropping 75px of dead field off each side — the same padding the artwork
 * already carried top and bottom — which takes it from 1.5:1 to 0.93:1 and is what lets
 * it sit in a text row at all. Held well above the display height so the hairline
 * chevrons inside the `500` survive downscaling on a 3x screen. Not vectorised: the
 * field is a gradient and the numerals are Fortune's own artwork, so tracing it would be
 * authoring a trademark by hand.
 *
 * **Third-party trademark use on an ANSR page is still ANSR's decision, not this
 * repo's** — see the handoff. This component ships the placement; it does not settle
 * the permission.
 */
export function FortuneBadge() {
  return (
    /* eslint-disable-next-line @next/next/no-img-element -- a static file already
       sized for its slot, on the same argument as the customer strip and the ANSR
       lockups: there is nothing for an optimiser to do to a 14 KB pre-scaled raster. */
    <img
      src="/badges/fortune-global-500.png"
      alt="Fortune Global 500"
      /* Intrinsic dimensions so the row does not reflow when the file lands. */
      width={111}
      height={120}
      /* Fixed height, auto width, square corners. The badge's red field IS its
         boundary, so it takes no border, no ring and no radius — the same reasoning
         that keeps every card on this surface at radius `none`. */
      className="block h-4 w-auto rounded-none"
      loading="lazy"
      decoding="async"
    />
  );
}
