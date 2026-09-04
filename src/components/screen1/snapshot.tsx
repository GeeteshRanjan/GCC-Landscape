import type { Signal } from "./copy";

/**
 * SNAPSHOT — the four industry-level figures at the head of the content surface.
 *
 * **What it is for is the first five seconds.** The answer state used to open
 * straight into full-height evidence bands, each one kicker → 48px heading →
 * content, so the first thing a visitor saw after submitting a form was a *section*
 * and every figure that proved the form had worked was at least one scroll away. A
 * reader giving the page ninety seconds spent the first twenty establishing that it
 * had produced a result at all.
 *
 * **Nothing here is a new figure and nothing here is about the peer set.** All four
 * are properties of the visitor's INDUSTRY in India — its share of the national
 * base, the mean centre size, the spread of cities and the leading one — each
 * evidenced by a card further down. The version this replaced led with the peer count
 * and the largest peer centre, which are properties of a five-company set our own
 * matching chose: a statistic about the tool rather than about the ground the visitor
 * is sizing.
 *
 * **A cell the data cannot fill says so.** The cell count is fixed at four, so a
 * missing figure cannot be resolved by dropping the column — and it must never be
 * resolved by estimating one. See `Signal.value`.
 *
 * ## The shape, and the two it replaced
 *
 * **It is four typographic stat rows on the zone's own ground. No card, no border, no
 * fill, no shadow, and no icon.** Two earlier shapes are worth recording because each
 * was right about something.
 *
 * The first was ONE bordered container divided by 1px grid-gap rules. That was correct
 * on a white page — it kept the group reading as one object and never doubled an edge
 * — and wrong the moment the strip sat on the pale mint band: a single bordered box on
 * a tint reads as a table, and its internal rules were drawn in the same value as the
 * ground behind it.
 *
 * The second was four floating tiles, each with a pale disc holding a line icon, the
 * figure beside it, a hairline, then a label and a note. That fixed the ground problem
 * and introduced a worse one: **it is the stats block every generated dashboard ships
 * with**, structurally identical to the one in every component library, and it was the
 * first 200px inside the card — so it set the register for everything below it. Four
 * pale circles were doing no work that the label beside them was not already doing,
 * and the icon was the single most category-interchangeable element on the surface.
 *
 * What is here instead is **the figure with its label directly beneath it, and nothing
 * drawn between them.** Removing the containers removed four shadows and four borders
 * from a surface that had eleven of each, and it is what lets the figures step up in
 * size without the strip growing taller.
 *
 * **The hairline between figure and label has gone too, and that is the third shape.**
 * It was ansr.com's own stat device, and inside a container it works — an edge for a
 * lone figure to sit on. On four bare cells it drew four rules across the row's full
 * width, which is the header of a table whose body never arrives, and it forced 12px of
 * clearance either side of itself. A figure and its label are one unit; the cell gaps
 * already separate the four, so nothing has to divide the two.
 *
 * **The fixed-height figure box survives the rule that motivated it**, and for a better
 * reason than alignment of edges: a place name is 30px where a figure is 48px, so
 * without it the fourth label would sit 18px above its three neighbours. One height,
 * bottom-aligned, and the four labels share a line whatever each cell holds.
 *
 * ## The phone is its own budget, not the desktop strip scaled
 *
 * **Every size here steps at `sm` as well as `md`, and the box height steps with them.**
 * The strip had two sizes, 36/48px on the figures with a 36px box under both, so a phone
 * drew a desktop figure in a one-column layout: the numeral was the largest thing on the
 * screen and the label beside it had a whole line's worth of empty measure. 30px on a
 * phone against 36 at `sm` and 48 from `md`; the box is 32px where it was 36, which is
 * what stops a shorter numeral leaving the same air behind. All three branches step
 * together and the box is one value at each width — the fixed-height rule above is what
 * makes that a single edit rather than three, and breaking it at one branch is how the
 * fourth label leaves the line the other three share.
 */

export function Snapshot({
  signals,
  heading,
}: {
  signals: readonly Signal[];
  /** The section's name, which carries the industry for all four cells. */
  heading: string;
}) {
  if (signals.length === 0) return null;

  return (
    <section
      id="snapshot"
      aria-labelledby="snapshot-heading"
      className="flex flex-col gap-5 md:gap-6"
    >
      {/* A real `h2`, set at kicker size. It is the section's name — the reference
          composition sets it as a small caps label rather than a heading, and the
          semantic level and the visual weight are allowed to disagree: on this
          surface the figures are the subject.

          **"Snapshot" was the tool's word for the strip; this is the reader's.** A
          section called Snapshot describes the component; one called "Your industry
          in India" describes what the four figures are about, which is also the one
          thing that stops a reader taking them for facts about the peer set.

          **Warm, not teal, and it is the brand's own device rather than a change of
          mind about colour.** The board sets its categorical eyebrows — "For Speed",
          "For Flexibility", "For Ownership" — in orange above the heading they
          qualify, and this is the one eyebrow of that kind on the surface: it says
          what class of thing the four figures below are.

          `text-accent-warm` rather than `text-action`, and the difference is
          measured. The brand orange is 2.63:1 on this mint ground, which is not
          legible at 12px by any standard; `--ansr-accent-warm` is 5.14:1 on it and
          6.53:1 on white, so it clears AA for normal text on every light ground
          these screens use. Orange gets darker as the type gets smaller — see the
          token. */}
      {/* **It names the industry now, which is what let all four labels stop naming
          it.** "Your industry in India" was accurate and left the subject unstated, so
          three of the four labels interpolated the industry themselves — one at 34
          characters against another at 24, under four figures that align perfectly, with
          the same word repeated three times inside 900px. A subject shared by every cell
          belongs in the section's name, said once. See `snapshotHeading`. */}
      <h2
        id="snapshot-heading"
        className="text-xs font-semibold tracking-caps text-accent-warm uppercase"
      >
        {heading}
      </h2>

      {/* Four across at `lg`, and **TWO from the base rather than from `sm`** — the gaps
          are wider than the tiled version's, because with no border between two cells the
          space is the only thing separating them. `divide-*` is deliberately not used: a
          vertical rule between cells would put the strip back to reading as a table,
          which is the artefact the bordered container failed on.

          **One column on a phone was the wrong reading of four cells that are a SET.**
          Every phone in portrait is under 640px, so `sm:grid-cols-2` meant no phone ever
          saw more than one figure at a time: four full-width rows, each holding a 36px
          numeral and a two-line label with the rest of the line empty, running the strip
          to roughly 430px before any card begins. Read one at a time they are four
          unrelated statistics; the whole point of the strip is that they are four
          properties of one industry, which is a thing you see by seeing them together.
          Two columns make it a 2×2 block — the only arrangement of four that is
          symmetrical at both ends — and it halves the height at the same time.

          `gap-x-4` rather than the row gap at that width: at 375 a column is about 155px,
          so the horizontal space is the scarcest thing in the cell and a wrapping label
          needs it more than the boundary does. The vertical gap stays wider than the
          horizontal one, which is what keeps two columns reading as two columns rather
          than as a four-cell grid with equal air on every side. */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:gap-6 lg:grid-cols-4 lg:gap-8">
        {signals.map((signal) => (
          // `gap-2`, down from `gap-3`: the rule that used to sit between these two is
          // gone, so the only thing left to set is how close a label sits to the figure
          // it names — and that is closer than a figure sits to a drawn edge.
          <div key={signal.label} className="flex min-w-0 flex-col gap-2">
            {signal.value === null ? (
              /* Stated, not dashed. A dash reads as zero and a zero here would be a
                 claim; "Data unavailable" is the only honest thing to put where a
                 figure the dataset cannot supply would go. Set at the label's size
                 rather than the figure's, so a missing number does not shout — and
                 held at the figure's own box height so its label stays on the same
                 line as its three neighbours'. */
              <p className="flex h-8 items-end text-sm font-semibold text-text-muted sm:h-9 md:h-12">
                Data unavailable
              </p>
            ) : signal.kind === "place" ? (
              /**
               * **A place, drawn as a name — in ORANGE, at ANSR's request.** No
               * `tabular-nums`, because there are no digits to align and the feature was
               * letter-spacing a word, and no `tracking-display`, which is fitted to
               * figures.
               *
               * Two inks were tried before this. Black read as a cell that had not
               * loaded, beside three that carried a coloured figure. Teal fixed that and
               * kept the cell a different KIND of thing from its neighbours, which was
               * the argument for it — orange being reserved for figures on this surface.
               * ANSR asked for the city to be orange too, so the distinction is now
               * carried by size and weight alone.
               *
               * **`--ansr-accent-warm`, NOT `--ansr-action`, and that is the documented
               * size rule rather than a hedge.** The anchor is 3.35:1 on white, which
               * clears the 3:1 large-text floor and nothing below it — legal on the
               * 48px figures beside this and not legal here, where the value is 20px at
               * the base breakpoint. `--ansr-accent-warm` is 6.53:1 on white and clears
               * AA for normal text at every size. Orange gets darker as the type gets
               * smaller; see `design-stack.md`.
               *
               * **`leading-tight` and the truncation moved to an inner span, because
               * the descenders were being clipped.** `leading-none` sets the line box to
               * the em square, which cuts the tail off the g in "Bengaluru"; and
               * `truncate` puts `overflow: hidden` on the same box that `items-end` is
               * aligning, so the clip landed on the glyph rather than on the line. The
               * outer box keeps the fixed height that aligns the four rules, the inner
               * one does the ellipsis.
               *
               * One step under the figures at 30px against their 48: it is the cell's
               * answer, so it leads its own cell, but it is not competing with the
               * finding on the band above for the loudest element on the page.
               *
               * **A FIXED height, not a minimum, and it is shared by all three
               * branches.** With `min-h` the box grew to whichever was taller — 48px for
               * a figure, 44px for this — so the fourth rule sat 4px above its three
               * neighbours, measured. That is the "four hairlines that agree with
               * nothing" defect in miniature, reintroduced by the fix for it. One
               * height, bottom-aligned, and all four rules share a line whatever each
               * cell holds.
               */
              // **`text-action`, the same orange as the three figures beside it, and one
              // scale step under them rather than two.** It was `--ansr-accent-warm` at
              // 20/30px against their `--ansr-action` at 36/48 — two different oranges and
              // a two-step size gap, which read as a cell from a different component
              // rather than as the fourth cell of a set.
              //
              // The measurement that used to forbid it does not apply at this size:
              // `--ansr-action` is 3.35:1 on white, which clears the 3:1 large-text floor
              // for anything bold at 18.66px or over, and this is Semibold 600 at 30px
              // rising to 38px. It was 20px at the base breakpoint, which is why the
              // deeper step was needed then.
              //
              // Still not `tabular-nums` and still not `tracking-display`: both are fitted
              // to digits, and this cell holds a name. That, plus the one remaining step of
              // size, is what keeps a place from reading as a quantity.
              <p className="flex h-8 min-w-0 items-end overflow-hidden text-2xl leading-tight font-semibold text-action sm:h-9 sm:text-3xl md:h-12 md:text-4xl">
                <span className="min-w-0 truncate">{signal.value}</span>
              </p>
            ) : (
              /**
               * **Orange, which is the second role the board gives it and the one this
               * tool had never used.** The comp's own stat rows — "7 days to hire",
               * "2.2M+", "20+", "14M+" — set the figure in the action orange with the
               * category beside it. We had read the once-per-band rule as
               * once-per-MARK, which left orange with no legal home on a screen with
               * no CTA on it.
               *
               * `text-action` rather than `text-accent-warm`, and the split is the
               * measurement. The anchor is 3.35:1 on white, which clears the 3:1
               * large-text floor at this size and does not clear 4.5:1 — so it is
               * correct for a figure this size and wrong for the eyebrow above it.
               *
               * **With the tiles gone this sits on the ZONE, which is why the zone
               * changed value.** On the mint `--ansr-surface-tint` the same orange is
               * 2.63:1 — under the 3:1 large-text floor at any size — and it was legal
               * before only because every figure sat on a white card's own fill. The
               * strip's zone is `--ansr-surface-pale` now, where it measures 3.29:1.
               * Moving the zone was the cheaper of the two fixes: the alternative was
               * keeping four containers purely to supply a legal ground, which is the
               * container reflex justifying itself with a contrast argument.
               */
              <p className="flex h-8 min-w-0 items-end text-3xl leading-none font-bold tracking-display text-action tabular-nums sm:h-9 sm:text-4xl md:h-12 md:text-5xl">
                {/* **The unit is set a step down and baseline-aligned, not run at the
                    figure's own size.** A `%` at 48px is about a third of the cell's
                    optical weight carrying none of its information, and it turns the
                    opening cell of the strip from a figure into a data field.

                    **Two scale steps down, not a fraction of an em**, which is the
                    difference between a size and a ratio: `0.55em` renders 26.4px at
                    desktop and 20.9px on a phone, and neither is on the type scale — the
                    surface then has two sizes nothing else uses. 20 against the figure's
                    38, and 24 against its 48, are both real steps and both land near half
                    the figure, which is where a unit belongs.

                    `items-baseline` on this inner box rather than on the outer one: the
                    outer box is a fixed height that bottom-aligns whatever the cell
                    holds, so all four labels below sit on one line; the alignment the
                    unit needs is to the numeral's baseline, which is a different
                    relationship. `tracking-normal` because `tracking-display` is fitted
                    to digits and closes the gap a glyph this size needs. */}
                <span className="flex min-w-0 items-baseline truncate">
                  {signal.value}
                  {signal.suffix ? (
                    <span className="ms-0.5 shrink-0 text-lg font-semibold tracking-normal sm:text-xl md:text-2xl">
                      {signal.suffix}
                    </span>
                  ) : null}
                </span>
              </p>
            )}
            {/* The rule, then the label. ansr.com's own stat shape: it separates the
                number from its label without a box, and it gives a lone figure an
                edge to sit on. `border-border-strong` rather than the tint, because
                on the mint ground the tint value is the ground. */}
            {/* **The supporting note under each label is gone, at ANSR's request.** It
                said what the figure counts — "Of 1,834 GCCs in India", "Employees per
                GCC", "Hubs and emerging locations", "More {industry} GCCs than any
                other city" — a second line of 12px grey under every one of four cells,
                which is what made the strip read as loosely packed: two text sizes and
                three vertical gaps per cell for one number.

                What carries the job now is that **every label names its own subject in
                full** — "Share of India's GCCs in {industry}", "Typical GCC size in
                {industry}", "Indian cities with a {industry} GCC". That was the reason
                the notes existed: a bare figure beside a short label leaves a reader
                unable to tell whether they are looking at companies, centres or people,
                and this page carries all three. The labels were rewritten to say it
                before the notes came off, so nothing is now unstated.

                The one real loss is the leading city's cell, where the note carried WHY
                that city leads. The map card below states it with a share. */}
            {/* **The rule between the figure and its label is gone, and the label sits
                directly under the number.** The hairline was ansr.com's own stat device
                and it was doing the wrong job here: on four cells with no container, a
                rule under every figure is four horizontal lines across the row's full
                width, which reads as the header of a table whose body never arrives —
                and it forced 12px of clearance above and below itself, so each cell
                spent 27px separating two things that belong together. The figure and its
                label are one unit; nothing has to divide them, because the cell gaps
                already separate the four.

                The label is a step lighter and a step back in ink as a result. With a
                rule above it, semibold black was holding its own against a drawn edge;
                sitting under the figure it only has to be legible beside it, and
                `--ansr-text-muted` is 5.65:1 on the pale ground. */}
            <p className="min-w-0 text-xs font-medium text-pretty text-text-muted sm:text-sm">
              {signal.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
