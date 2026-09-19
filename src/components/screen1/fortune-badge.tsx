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
 * instruction. 40px read as a second subject on the card; 24px matched the `sm` chip's
 * 22px box and was still taller than the 18px name it qualifies. 16px is that name's
 * cap height, so the badge sits inside the text's own band. **The size is set off the
 * TYPE, so a change of artwork does not reopen it** — the earlier lockup was measured
 * the same way and landed on the same 16px.
 *
 * **The consequence, stated because it is the whole cost of the size: below about 20px
 * `FORTUNE` and `GLOBAL` stop resolving and the badge reads as a stacked block with
 * only the `500` legible.** The artwork stacks three lines in one column and only the
 * largest survives. Accepted at the project owner's instruction. It is also why `alt`
 * is load-bearing here in a way it would not be at 40px — the accessible name is now
 * the only full statement of the index, so it must never be emptied to match the
 * company mark's `alt=""`.
 *
 * **The supplied lockup is MONOCHROME and the red is a FILL ON A PARTITION OF ITS OWN
 * PATHS, at the project owner's instruction — the plate behind `FORTUNE`, the rule box
 * around `GLOBAL 500`, and the `500`.** `GLOBAL` stays black. No outline was moved,
 * split or re-cut to achieve it, and the two small paths after the plate are the ISLANDS
 * inside its `O` and `R`, so they follow the plate's fill rather than the letters'.
 * **A recolour needs the owner's word EACH time** — this has been red, then monochrome,
 * and is red again, so the file is not allowed to drift back on its own.
 * Whatever ink the artwork carries lives inside the
 * asset file and never in CSS, so the no-raw-hex rule is not bent to admit it —
 * `brand_lint.py` reads code and stylesheets, and `.svg` is not in its `SCAN_EXT`, so
 * there is no colour here for it to find. Do not derive a token from it and do not tint
 * the artwork from the outside: the fills are literal, not `currentColor`, precisely so
 * no surface this sits on can recolour an accreditation mark. **The consequence is that
 * this badge still needs a LIGHT ground** — `FORTUNE` is knocked out of its plate, so it
 * takes whatever the badge sits on, and the box around `GLOBAL 500` is a rule with
 * nothing inside it. A red plate on `teal-deep` is the open
 * question behind the peers-variants decision in the handoff, and it may not be solved
 * by inverting the fills here.
 *
 * **`alt` carries the index name, unlike the peer card's company mark right above it.**
 * The mark takes `alt=""` because the company name is the very next element, so naming
 * it would say the company twice. This badge is the opposite case: it REPLACES text
 * that was the only statement of the fact, so its accessible name is the fact.
 *
 * Asset: `public/badges/fortune-global-500.svg`, 1055.71×532.17 user units, derived from a
 * VECTOR of the lockup supplied by the project owner. **There is ONE file, replaced in
 * place, never a second copy beside it** — two copies of one trademark is how the two
 * placements start drawing different marks, which is why the 111×120 raster before it
 * was deleted rather than parked and why the supplied source is not committed alongside.
 * Nothing in the outlines is redrawn: the path data and the supplied file's own
 * `translate/scale` are carried over verbatim, and the only change to the geometry is an
 * added offset that crops the empty 1254×1254 artboard down to the lockup's own bounds,
 * 1.984:1, which is what lets it sit in a text row at all. **The bounds are measured by
 * rasterising and scanning alpha — `npm run logo:crop` — and never read off the path
 * coordinates**, on the same argument the customer strip's files are cropped by.
 * **Tracing is still banned** — this is not a trace, it arrived as a vector.
 *
 * **A ratio change is the thing to check on any future swap, because nothing here
 * constrains it.** The height is fixed and the width is free, so a wider lockup simply
 * takes more of the name's line: this supplied lockup is a two-line stack at 1.984:1, so
 * at 16px it draws ~32px wide where the 0.846:1 one before it drew ~14. `width`/`height`
 * below must move with the file's `viewBox` or the `<img>` letterboxes the mark inside
 * its own box.
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
      width={1056}
      height={532}
      /* Fixed height, auto width, square corners. The one plate in the mark is the
         ARTWORK's own and belongs to Fortune, so there is still nothing here to
         bound: no border, no ring and no radius, the same reasoning that keeps every
         card on this surface at radius `none` — and a radius on the box would clip
         that plate's corners, which is a trademark being altered rather than a card
         being styled. `.gcc-badge-pop` carries the hover growth and
         nothing else — no fill, no ring, no shadow, so the resting mark is untouched. */
      className="gcc-badge-pop block h-4 w-auto rounded-none"
      loading="lazy"
      decoding="async"
    />
  );
}
