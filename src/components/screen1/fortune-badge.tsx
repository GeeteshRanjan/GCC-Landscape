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
 * owner's explicit instruction. It lives inside the asset file, never in CSS, so the
 * no-raw-hex rule is not bent to admit it — `brand_lint.py` reads code and stylesheets,
 * and `.svg` is not in its `SCAN_EXT`, so there is no colour here for it to find. Do
 * not derive a token from it and do not tint the artwork from the outside: the fills are
 * literal, not `currentColor`, precisely so no surface this sits on can recolour an
 * accreditation mark.
 *
 * **`alt` carries the index name, unlike the peer card's company mark right above it.**
 * The mark takes `alt=""` because the company name is the very next element, so naming
 * it would say the company twice. This badge is the opposite case: it REPLACES text
 * that was the only statement of the fact, so its accessible name is the fact.
 *
 * Asset: `public/badges/fortune-global-500.svg`, 835×866 user units, derived from a
 * VECTOR of the lockup supplied by the project owner. **It replaces the 111×120 raster
 * and the raster is deleted rather than kept** — two copies of one trademark is how the
 * two placements start drawing different marks. Nothing in the outlines is redrawn: the
 * path data and the supplied file's own `translate/scale` are carried over verbatim, and
 * the only change to the geometry is an added offset that crops the empty 2000×2000
 * artboard down to the lockup's own bounds, 0.96:1, which is what lets it sit in a text
 * row at all. **Tracing is still banned** — this is not a trace, it arrived as a vector.
 *
 * **`GLOBAL` and the `500` are Fortune's red and `FORTUNE` is black, per the project
 * owner.** The supplied vector filled every glyph black; the two red groups are a fill
 * on the groups the supplied outlines already separate, so no outline moved to achieve
 * it. Being a vector rather than a raster is what makes the `500`'s hairline chevrons
 * survive at 16px on any density, which the raster only managed by being held at 7x its
 * display height.
 *
 * **Third-party trademark use on an ANSR page is still ANSR's decision, not this
 * repo's** — see the handoff. This component ships the placement; it does not settle
 * the permission.
 *
 * **The hover pop is `.gcc-badge-pop` in `globals.css` and this component holds no part of
 * it.** It was a `motion` (framer-motion) `whileHover` for one pass and CSS is strictly
 * better for a scale on hover: the duration and curve come straight from
 * `--ansr-duration-base` and `--ansr-ease-spring` instead of being mirrored as JS numbers
 * the brand lint cannot see, the global `reduce` clamp in `tokens.css` reaches a CSS
 * transition where it cannot reach a scripted transform, the `hover: hover` gate stops a
 * touch device leaving one badge permanently enlarged, and this file goes back to being a
 * server component. It also removed a 40KB gzipped dependency from the entry point of a
 * tool embedded in someone else's page. Every measurement and the rejected scale is in
 * the CSS rule's own comment.
 */
export function FortuneBadge() {
  return (
    /* eslint-disable-next-line @next/next/no-img-element -- a static file already
       sized for its slot, on the same argument as the customer strip and the ANSR
       lockups: there is nothing for an optimiser to do to a 7 KB vector. */
    <img
      src="/badges/fortune-global-500.svg"
      alt="Fortune Global 500"
      /* Intrinsic dimensions so the row does not reflow when the file lands. These
         are the asset's own viewBox, so the ratio here and the ratio in the file
         cannot disagree and letterbox the mark. */
      width={835}
      height={866}
      /* Fixed height, auto width, square corners. The mark is drawn on transparent
         now rather than on a red field, so there is nothing to bound: it takes no
         border, no ring and no radius, the same reasoning that keeps every card on
         this surface at radius `none`. `.gcc-badge-pop` carries the hover growth and
         nothing else — no fill, no ring, no shadow, so the resting mark is untouched. */
      className="gcc-badge-pop block h-4 w-auto rounded-none"
      loading="lazy"
      decoding="async"
    />
  );
}
