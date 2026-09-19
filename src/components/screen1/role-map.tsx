"use client";

import { usePublicCopy } from "@/components/public/copy-context";
import { placeRoles, type PlacedRole } from "@/data/screen1";
import type { RoleBand, RoleFamily, RoleMap } from "@/data/schema";

/**
 * The role map — which roles India GCCs hire, by complexity and by hiring demand.
 *
 * Reconstructed from a supplied slide that draws thirty-six labelled bubbles in two
 * coloured fields. Three of its four encodings survive unchanged; the fourth could not,
 * and the substitutions are the whole of what is worth knowing about this file.
 *
 * ## What the slide encodes, and what this draws
 *
 * **Horizontal position is job role complexity, and it carries NO numeral — which is the
 * slide's own choice and the honest one.** Its axis is labelled "Lower" and "Higher" and
 * nothing else, because what ANSR holds is an ordering rather than a measured index.
 * `role.complexity` exists to place a dot; no tick, gridline or value is drawn from it at
 * any width, and the admin editor says so on the field.
 *
 * **Dot AREA is hiring demand, and it is a NAMED ordinal step where the slide leaves it
 * unnamed.** The slide's only statement about size is the note "bubble size = hiring
 * demand" — so a reader can see that one bubble is bigger and can learn the quantity
 * nowhere, which is exactly the shape this project's chart rules refuse. The fix is not
 * to invent a number: `demand` is a step on a short ordinal scale, the scale's WORDS are
 * drawn in the key, and each dot's accessible name carries its own word. That is the
 * licence the capability grid already runs on — an on-screen-only mark is legal when the
 * ordinal words are present in text in the key.
 *
 * **The two bands survive as the primary structure and they are TWO FIELDS OF DIFFERENT
 * HUE THAT TOUCH**, which is the slide's own construction and took three passes to get
 * back to. They were unfilled with a hairline between them, then one shared tint with a
 * gap, and both readings failed the same way: two identical or absent fills separated by
 * the panel's white are two charts stacked, where the slide is one axis divided once.
 * `--ansr-surface-warm` exists for the emerging field and `surface-tint` carries the
 * established one; the seam between them is drawn by nothing, because two hues meeting is
 * already an edge.
 *
 * **HUE IS THE ROLE FAMILY, kept from the slide at the project owner's instruction, and
 * it is the one categorical palette in this product.** Colour inside a chart here is
 * otherwise ordinal only, on the teal ramp, with a categorical distinction carried by
 * form — so this is an exception rather than a precedent, and the `--ansr-role-*` block in
 * `tokens.css` carries the reasoning and the measurements. Three things make it safe:
 * every ink clears the 3:1 mark floor on both band fills, which left four of the slide's
 * seven exactly as supplied and forced three to be darkened; the hue comes from
 * the family's own stored `tone` rather than its position, so tidying the legend cannot
 * repaint the field; and **the colour is never the only reading** — the legend names each
 * family in text beside its own swatch, and each dot carries its family in its accessible
 * name. That last point is what pays for the one thing the palette cannot do, which is
 * separate in greyscale.
 *
 * ## One DOM tree, two drawings
 *
 * **The field and the reflow are the same markup, and that is a requirement rather than
 * an economy.** Two trees behind `hidden lg:flex` and `lg:hidden` would put all
 * thirty-six role names in the accessibility tree twice, which is the defect the ranking
 * row's named grid areas exist to avoid. So the DOM is band → family group → role, the
 * group is `display: contents` from `lg` up so its roles position against the band's own
 * field, and the group's label takes the `sr-only` treatment there rather than
 * `display: none` — the same device `.gcc-context-pill` uses, so nothing ever leaves the
 * reading order.
 *
 * **Below `lg` this is a chip flow grouped by family, and not a scroller**, on the
 * capability grid's argument: a horizontal scroller is how that grid came to hide India by
 * default, and no cue makes hiding visible rather than merely announced. The gate is `lg`
 * rather than `md` because the packing is computed once on the server and has to hold at
 * the narrowest width it is drawn at — see the media query in globals.css for the
 * measurement that moved it.
 *
 * Geometry is `.gcc-role-map` in globals.css, on `.gcc-milestones`' pattern; the row
 * packing is `packRoleRows` in `data/screen1.ts`, because it is arithmetic worth testing
 * and has no business running inside a render.
 */
export function RoleMapView({ roleMap }: { roleMap: RoleMap }) {
  const copy = usePublicCopy();

  const bands: ReadonlyArray<{ band: RoleBand; label: string }> = [
    { band: "emerging", label: copy.rolesBandEmerging },
    { band: "established", label: copy.rolesBandEstablished },
  ];

  return (
    <div className="flex flex-col gap-4 md:gap-5">
      {/**
       * **ONE CANVAS, TWO WASHES, at the project owner's instruction — and the seam is a
       * COLOUR STOP rather than a boundary between boxes.**
       *
       * It was two separately positioned fields with `lane` scoped to each. That made the
       * slide's own reading inexpressible: three of its discs sit ACROSS the divide, part
       * in one register and part in the other, and a disc confined to one box can only be
       * clipped to that box's 0..100. With one canvas a lane near 50 draws exactly where
       * the slide draws it, so those three say what they are meant to say.
       *
       * The washes still meet with no rule between them: they differ in HUE, which is
       * already an edge. Geometry, the seam's own percentage and the two fills are all in
       * `.gcc-role-map` in globals.css — one place, because a straddling disc is the one
       * thing that breaks if the seam is decided twice.
       */}
      <div className="gcc-role-map">
        {bands.map(({ band, label }) => (
          <BandField
            key={band}
            band={band}
            label={label}
            roleMap={roleMap}
            levels={roleMap.demandLevels}
          />
        ))}
      </div>

      <ComplexityAxis
        label={copy.rolesAxisLabel}
        low={copy.rolesAxisLow}
        high={copy.rolesAxisHigh}
      />

      {/**
       * **THE KEY IS ITS OWN TIER UNDER ONE HAIRLINE: the legend TRAILING, and the two
       * muted lines beside it in a leading column, at ANSR's request.**
       *
       * The axis ends the chart, one hairline closes it, and everything below the hairline
       * is apparatus. This has been three shapes. A snug three-column legend trailing with
       * the size note opposite it read as two leftovers. Then all three stacked, legend
       * over both notes, every one of them trailing. Now the legend keeps the trailing edge
       * and the two notes take the leading one, on the same rows the legend already has.
       *
       * **THE TWO NOTES ARE PINNED TO THE LEGEND'S FIRST AND LAST ROWS, and `justify-between`
       * in a STRETCHED column is the whole mechanism.** ANSR asked for the size key on the
       * line of the legend's opening entry and the provenance line on the line of its last
       * one. The notes column is a flex item, so it stretches to the legend's own height;
       * pushing its two children apart lands the first on the legend's first line and the
       * last on its last. Nothing measures the legend and nothing hardcodes a row count, so
       * three columns or four, seven families or nine, the two lines still align.
       *
       * They hold because all four boxes are 12px on the same leading, so a first line is a
       * first line. **A leading override on either note, or a second line on one of them,
       * breaks the alignment**, because a stretched column with a two-line child is taller
       * than the legend and the legend's own rows then spread to fill it.
       *
       * **SO THE ROW IS GATED ON `xl` AND NOT `lg`, which is where the FIELD starts too.**
       * At 1024 the legend takes 475px of an 814px card and the notes column is left ~307,
       * where the basis sentence's ~360px of ink wraps — measured, and it put the legend's
       * first entry 8px below the size key. At `xl` the column gets ~440px and both notes
       * set on one line. Below `xl` the whole tier is one column, legend then both notes.
       *
       * `flex-row-reverse` is what puts the legend trailing while leaving it FIRST in the
       * DOM: the colour key decodes seven marks, so it is read before the lines that
       * qualify them, at every width.
       *
       * `rolesBasisNote` keeps `industryBasisNote`'s own treatment, which is the same kind
       * of sentence in the same kind of place. This block is the only section on the
       * surface not drawn from the company data, so it is what stops a reader carrying the
       * peer grid's provenance down into it.
       */}
      <div className="flex flex-col gap-3 border-t border-border pt-4 xl:flex-row-reverse xl:justify-between xl:gap-8">
        <FamilyLegend families={roleMap.families} />

        <div className="flex flex-col gap-1 xl:justify-between">
          <DemandNote note={copy.rolesDemandKey} />
          <p className="max-w-measure text-xs text-text-muted">{copy.rolesBasisNote}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * One band: its label, then its roles grouped by family.
 *
 * A family with no roles in this band is omitted rather than drawn empty — a lane
 * heading with nothing under it reads as a group that failed to load, which is the same
 * argument the impact band and the logo strip are hidden on when they are empty.
 */
function BandField({
  band,
  label,
  roleMap,
  levels,
}: {
  band: RoleBand;
  label: string;
  roleMap: RoleMap;
  levels: readonly string[];
}) {
  const inBand = roleMap.roles.filter((role) => role.band === band);
  if (inBand.length === 0) return null;

  /**
   * Every role in the band with its family resolved, ordered down the field.
   *
   * No packing and no row assignment: each role carries its own `lane`, so the only thing
   * left to decide is the DOM order, and `lane` is the order that makes the reflow below
   * `lg` read top to bottom.
   */
  const placed = placeRoles(inBand, roleMap.families);

  const groups = roleMap.families
    .map((family) => ({
      family,
      /* Complexity order INSIDE a group, which is what the chip flow below `lg` reads.
         The field ignores it — every dot is placed absolutely — so this is the reflow's
         order and nothing else. */
      roles: placed
        .filter((item) => item.family.id === family.id)
        .sort((a, b) => a.role.complexity - b.role.complexity),
    }))
    .filter((group) => group.roles.length > 0);

  const emerging = band === "emerging";

  return (
    /**
     * **THE BAND IS A BOX BELOW `lg` AND `display: contents` ABOVE IT, and that split is
     * what lets a disc cross the seam.** In the reflow it is a real box carrying its own
     * wash and padding, because there the two registers are two stacked lists. On the field
     * it stops being a box, so every role inside it positions against the CANVAS — which is
     * the only way a lane near 50 can draw half in one wash and half in the other, as the
     * slide draws three of them.
     *
     * **THE TWO WASHES DIFFER IN HUE rather than in another step of the same ramp.** They
     * were both `surface-tint`, on the argument that the slide's warm-and-cool pair reads
     * as a judgement about the work — one band hot, the other cooling. What that missed is
     * that two identical fills meeting at a seam do not say "two groups" at all; they say
     * one field with a label repeated in it. So emerging takes `--ansr-surface-warm` and
     * established keeps `surface-tint`, which is the slide's own relationship.
     *
     * **The two are 1.105:1 apart in luminance and that smallness is deliberate.** A
     * bigger step would read as one band emphasised over the other, which is the judgement
     * the single fill was protecting against; hue carries the split instead.
     *
     * Every fill, the seam's own percentage and all the geometry are in globals.css. None
     * of it is a `className`, because the canvas has to undo the box and two files deciding
     * whether the seam is a box boundary is how a straddling disc gets clipped again.
     */
    <div className="gcc-role-map__band" data-band={band}>
      {/**
       * The band's own label, as an EYEBROW.
       *
       * **It was a filled pill and the pill is gone at the project owner's request.** The
       * slide draws one, and reproducing it put a solid button-shaped object at the leading
       * edge of a field whose every other mark is a flat disc — so on a surface where
       * nothing is pressable, the one thing that looked pressable was a label. The pill was
       * there to stop a faint label disappearing on a faint field; the field now carries
       * its own hue, so the label can be ink.
       *
       * **Each band's ink is its own field's hue**, which is what keeps a 12px line legible
       * on a wash without a fill behind it: `--ansr-accent-warm` at 5.68:1 on the warm
       * field, the heading teal at 7.72:1 on the mint. This is the panel's ONE orange role
       * and it is the categorical-eyebrow role, which is what that token exists for.
       *
       * **On the canvas it is PINNED INSIDE ITS OWN HALF**, at `--gcc-band-at` — 0 or the
       * seam — plus a step of padding. Absolutely positioned rather than in flow, because
       * the band is `display: contents` there and has no flow of its own to sit in.
       */}
      <p
        className={`gcc-role-map__band-label text-xs font-bold tracking-display uppercase ${
          emerging ? "text-accent-warm" : "text-accent-teal"
        }`}
      >
        {label}
      </p>

      {groups.map(({ family, roles }) => (
        <div key={family.id} className="gcc-role-map__group">
          {/* The family as a grouping HEADING, drawn below `lg` and read at every
              width. `sr-only` from `lg` up rather than `display: none`, so the group
              never leaves the reading order — `.gcc-context-pill` is the precedent and
              the reason. On the field the family is carried by the dot's hue and named
              in the legend instead, which is where a 2D layout has room for it. */}
          <p className="gcc-role-map__group-label text-xs font-medium tracking-display uppercase text-text-muted">
            {family.name}
          </p>
          {roles.map((item) => (
            <RoleDot key={item.role.id} placed={item} levels={levels} />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * One role: its dot and its name.
 *
 * The dot is `aria-hidden` on the file-wide rule — a mark is a second reading of
 * something already in text — and the demand WORD rides in the name's own `sr-only`
 * span, because the area is what a sighted reader decodes off the key and there is
 * nothing for a screen reader to decode.
 */
function RoleDot({
  placed,
  levels,
}: {
  placed: PlacedRole;
  levels: readonly string[];
}) {
  const { role, family } = placed;
  const level = levels[role.demand - 1];

  return (
    <span
      className="gcc-role-map__item"
      data-side={role.labelSide}
      /* The demand step, which decides the dot's area. The same attribute the KEY carries,
         so one set of rules serves both and the key cannot draw a size the field does not
         — see the `[data-role-step]` block in globals.css. */
      data-role-step={role.demand}
      /* The family's own ink, resolved by a rule in globals.css rather than an inline
         colour — so `tokens.css` stays the only place a value is named. */
      data-tone={family.tone}
      /* Both coordinates, straight from the data. `--gcc-at` addresses the dot's centre
         across the plot and `--gcc-lane` its centre down the band; only the first of them
         means anything, and the chart draws nothing from the second. */
      style={
        {
          "--gcc-at": `${role.complexity}%`,
          "--gcc-lane": `${role.lane}%`,
        } as React.CSSProperties
      }
    >
      {/* The dot directly, with no wrapper cell: the item's own offset is half the DOT, so
          a small mark's label hugs it exactly as a large one's does. A constant cell put an
          8px dot 20px from its own name. */}
      <span aria-hidden="true" className="gcc-role-map__dot" />
      <span className="text-xs leading-none text-text">
        {role.name}
        {/* The two things the DRAWING says and the visible text does not: the family, which
            is the dot's hue, and the demand step, which is its area. Both are facts about
            this role rather than about the chart, so they belong in its own name — and
            carrying them here is what licenses a colour that does not survive greyscale
            and an area with no figure on it. */}
        <span className="sr-only">
          {` — ${family.name}`}
          {level ? `, ${level} hiring demand` : ""}
        </span>
      </span>
    </span>
  );
}

/**
 * The complexity axis: a rail with its name centred and its two ends bracketing it.
 *
 * **Three columns with the middle one centred, which is `RangeBenchmark`'s own shape for
 * two end labels and is why the ends are not stacked.** Stacked at the leading edge they
 * read as a two-item list of notes, where what they name is the two ends of the drawing
 * above them.
 *
 * Drawn at EVERY width, including below `md` where there is no plot under it. That looks
 * like chrome for a chart that is not there, and it is not: the chip flow is in
 * complexity order too, so the bracket is the only thing that says what the order is.
 * One element either way, so neither label is in the accessibility tree twice.
 */
function ComplexityAxis({
  label,
  low,
  high,
}: {
  label: string;
  low: string;
  high: string;
}) {
  return (
    /**
     * **Two columns below `sm` with the name on its own row, three columns from it.**
     *
     * In three equal columns at 302px the middle one is about 100px, so "JOB ROLE
     * COMPLEXITY" broke to two lines between its own end labels — which reads as the axis
     * having a two-line name rather than as one label in a tight cell. Given a row of its
     * own it sets on one line and the two ends still bracket the measure.
     *
     * **DOM order is low, name, high at both widths and only `order` moves**, so the axis
     * reads left to right for anybody taking it by role rather than by sight — and nothing
     * is drawn twice, which a `sm:hidden` pair would have cost.
     */
    /* **No hairline of its own any more**: the fields now end on a solid tinted edge, so a
       rule under them was a second separator drawn 2px from a real one. The one hairline
       this block has belongs to the key below, which is the thing that needs detaching. */
    <div className="grid grid-cols-2 items-baseline gap-x-2 gap-y-1 text-xs text-text-muted sm:grid-cols-3 sm:gap-y-0">
      <span className="order-1 sm:order-none">{low}</span>
      {/* The axis's own name, in the heading teal and one weight up: it is the thing the
          two ends are ends OF, so it cannot be the same ink as them. */}
      <span className="order-3 col-span-2 text-center font-medium tracking-display uppercase text-accent-teal sm:order-none sm:col-span-1">
        {label}
      </span>
      <span className="order-2 text-end sm:order-none">{high}</span>
    </div>
  );
}

/**
 * The family legend: a swatch and a name per family.
 *
 * **This is what makes the categorical palette legal, so it is not optional chrome.** The
 * eight inks are the one exception to the ordinal-colour rule, and the thing that pays for
 * it is that every hue is named in TEXT right here — a reader who cannot separate the red
 * from the gold, or who is reading in greyscale, loses a shortcut rather than the
 * information. So the swatch is `aria-hidden` and the name is real text, which is the same
 * relationship every other mark on this surface has to its own figure.
 *
 * **THREE COLUMNS FROM `sm`, ONE SHAPE AT EVERY WIDTH IT DRAWS AT.** It was `grid-cols-3` with
 * `ms-auto` opposite the size note — three columns of seven entries squeezed against the
 * trailing edge of a 1070px card with a sentence on the other side of it. The columns aligned
 * and nothing else did, which is what the project owner read as badly placed. Then it was
 * four, reproducing the slide's own 4-and-3, stacked over both notes at the trailing edge.
 *
 * **The `sm`-to-`lg` step down to TWO columns is gone, because two made the dead air worse
 * than three did.** A two-column block is sized by "Application Development", so "AI / ML"
 * carried 96px of empty cell against 53 at three columns — a narrower block that reads emptier.
 * Content-sized, three columns are 438px against a 502px host at 640, which is the narrowest
 * width this draws at, so there was never a fitting reason for the step. Measured at 640, 700,
 * 768, 1024, 1280 and 1440: no overflow, no scroll, three rows throughout.
 *
 * **THREE IS ANSR'S REQUEST, and it costs the slide's row split.** Seven families over three
 * columns is 3, 3 and 1, so the last row holds one entry where four columns left three — a
 * less even block, and not a claim either way, because the columns are an alignment device
 * and say nothing about how the families group.
 *
 * **EACH COLUMN IS `max-content` OF ITS OWN MEMBERS, NOT `1fr`, AND THAT IS THE FIX FOR THE
 * DEAD AIR.** `1fr` under `w-fit` resolves every column to the WIDEST label in the whole
 * legend — 167px, set by "Data Engineering & Analytics" — so "AI / ML" carried 114px of empty
 * cell and row one read as a 146px gap followed by a 32px one. The column gap was equal the
 * whole time; what a reader sees is the cell's leftover plus that gap, which is why an equal
 * grid drew unequal space. Sized to their own content the three columns are 106 / 167 / 117,
 * the gap is a real 24px everywhere, and the block goes 566px to 438 — so it also sits 128px
 * further along, its trailing edge being pinned to the field's. **The residual is ~53px after
 * "AI / ML", which shares a column with "Product & Design", and no arrangement removes it
 * while the swatches stay aligned**: 2 and 4 columns were both measured worse, and equalising
 * it needs either right-aligned entries (ragged swatches, which is what the columns were
 * asked for) or a wrapping row (no columns at all). Style lock carries both.
 *
 * **THE TIER'S FOUR BOXES ARE ONE TREATMENT AND ALWAYS WERE — 12px in `--ansr-text-muted`,
 * the same as the two notes beside it — so what read as the key being bigger and darker was
 * the SWATCH.** At `--ansr-space-3` each disc matched the cap height of its own label, which
 * put seven saturated marks against two faint lines and made the tier read as one heavy block
 * and two afterthoughts. The swatch is a step down and the entry takes the field's binding
 * gap; the type does not move, being both the notes' own size and the caption floor. Sizes
 * are in `.gcc-role-legend__dot` and `.gcc-role-legend__entry`.
 *
 * **`w-fit` is what makes it a flex item narrower than the tier**, which is what leaves the
 * leading half for the two notes; the side comes from the tier's `flex-row-reverse` rather
 * than from any margin here, so there is no `ms-auto` and nothing in this component knows
 * which edge it is on. The capability grid key keeps `1fr` and is right to: four ordinal
 * words of similar length have little leftover to give, where seven family names run 53px to
 * 167 and an equal column is mostly air.
 *
 * **Below `sm` it is still a wrapping row**, on the same argument as before: a row is the
 * one shape that cannot overflow, and at a width where the block fills the measure there is
 * nothing for columns to align against. The tier above it stacks at `md` for its own reason,
 * which is unrelated to the count.
 *
 * The columns are an alignment device and not a claim that the families group.
 */
function FamilyLegend({ families }: { families: readonly RoleFamily[] }) {
  return (
    <p className="gcc-role-legend flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-text-muted sm:grid sm:w-fit sm:grid-cols-[repeat(3,max-content)] sm:items-center sm:gap-x-6">
      {families.map((family) => (
        /* The swatch and the name on the field's own binding distance — see
           `.gcc-role-legend__entry`, which is also where the two sizes are decided. */
        <span key={family.id} className="gcc-role-legend__entry">
          <span
            aria-hidden="true"
            className="gcc-role-legend__dot"
            data-tone={family.tone}
          />
          {family.name}
        </span>
      ))}
    </p>
  );
}

/**
 * What the bubble sizes mean, in ONE LINE.
 *
 * **This replaced a four-step key of rings drawn at the field's own sizes, at the project
 * owner's instruction, and the removal is worth recording because it gives something up.**
 * That key was the strict reading of this project's chart rule — a mark's quantity has to
 * be available in text, and four rings each beside their own word is the most literal way
 * to supply it. It also cost about 60px of a card that was already the tallest on the
 * surface, and four rings up to 44px across read as a fifth row of data rather than as
 * chrome. The source slide states the encoding in a single small note and nothing else.
 *
 * **THE SCALE'S TWO ENDS ARE OFF THE LINE TOO, at the project owner's request, and what
 * is left is the ENCODING alone.** The note read "Bubble size is hiring demand: Low →
 * Very high", where the first clause names what a reader is looking at and the second was
 * a two-word fragment of a four-step scale set in the same muted caption. **The wording is
 * now "Bubble size = Hiring Demand", at ANSR's request** — the slide's own construction,
 * which states the encoding as an equation rather than as a sentence, and which is what a
 * key beside a legend reads as. TEMP
 * Very high", where the first clause names what a reader is looking at and the second was
 * a two-word fragment of a four-step scale set in the same muted caption — it looked like
 * a truncated legend rather than a range, and next to a family legend that names seven
 * things in full it read as the one key that had been cut off. So the direction goes with
 * the steps.
 *
 * **What keeps this honest is unchanged, and it is not this line: every dot carries its
 * own level word in its own accessible name.** The value is in the document for every
 * bubble rather than at the two ends of the scale, which is more than the drawn key ever
 * supplied — so removing the ends costs a sighted reader the ability to say which way the
 * areas run without comparing two dots, and costs the reading nothing. `demandLevels` is
 * still what supplies those words, so renaming a step in admin still moves them.
 */
function DemandNote({ note }: { note: string }) {
  return <p className="text-xs text-text-muted">{note}</p>;
}
