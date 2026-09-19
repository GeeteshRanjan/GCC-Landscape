import { z } from "zod";

import { BUSINESS_TAG_MAX_LENGTH, BUSINESS_TAG_PATTERN } from "./business-tags";
/**
 * The world list, for the one override field that is a sort preference rather than a
 * match key. `countries.ts` imports nothing, so this cannot cycle — the same
 * guarantee the `normalize.ts` import above relies on.
 */
import { HQ_COUNTRIES } from "./countries";
/**
 * `normalize.ts` imports nothing, so this cannot cycle. The pattern lives there
 * beside `canonicalDomain` because a cleaner and its validator drifting apart is the
 * failure this pairing exists to prevent.
 */
import { CTA_URL_MAX_LENGTH, DOMAIN_PATTERN, isCtaUrl } from "./normalize";

/**
 * The published dataset shape. This is the contract for every consumer: the
 * seed importer writes it, the DataStore validates it on read, and admin will
 * validate against it before a publish is allowed.
 *
 * Columns kept and dropped are recorded in .kiro/steering/project.md and
 * justified in docs/data-audit.md. Two rules govern this file:
 *
 *   - Nothing derivable is stored. Location count, tier-2 presence and the FTE
 *     display string all come from `cities` and `fte` at read time. Storing
 *     them is how two fields start disagreeing.
 *   - Taxonomy is a first-class entity, and `revenueBands` is ORDERED,
 *     ascending. Peer matching's "adjacent band" step is index arithmetic on
 *     that array, so the order is data, not presentation.
 */

const nonEmpty = z.string().trim().min(1);

/* ==========================================================================
   Copy TEMPLATES — an editable string with a mandatory slot in it
   ========================================================================== */

/**
 * The placeholders a copy template may carry, and the value each one stands for.
 *
 * **A closed set, deliberately.** A template's slot is filled from the view model at
 * render time, so a name here is a promise that the render path has that value in
 * hand — an admin cannot invent `{headcount}` and have it resolve, and a typo would
 * otherwise publish as literal text in a heading. `fillTemplate` replaces only these.
 */
export const COPY_PLACEHOLDERS = {
  /** The visitor's industry, as `view.industry.industry`. */
  industry: "{industry}",
  /** The visitor's own typed text, echoed back by the dropdown filter. */
  query: "{query}",
  /** A metric's own `indexBaseline`, which is itself admin-editable. */
  baseline: "{baseline}",
} as const;

export type CopyPlaceholder = keyof typeof COPY_PLACEHOLDERS;

/**
 * An editable string that MUST contain the slots it is declared with.
 *
 * **The refine is the whole point: a template with its slot deleted is refused, and
 * the save is blocked.** These strings exist because ANSR wanted a heading to name the
 * visitor's own scope, so the slot is not decoration — `Snapshot of {industry} GCCs in
 * India` with the slot removed reads "Snapshot of GCCs in India" on every industry, and
 * the snapshot's section heading is the ONE place the industry is named (all four cell
 * labels stopped naming it precisely so this line could). A silent fallback would make
 * that a rule an admin can switch off without being told. So the schema refuses it, and
 * `site-content-manager.tsx` states the requirement on the field rather than letting the
 * publish be where an admin finds out.
 *
 * **The cap is measured on the FILLED string, not this one.** The longest industry name
 * in the taxonomy is 41 characters, so a caller passes the cap it wants AFTER
 * substitution and this subtracts the slot's own width — otherwise a template that
 * validates renders past the measurement its cap was taken from.
 */
function copyTemplate(key: CopyTemplateKey): z.ZodType<string> {
  const { slots: placeholders, filledMax } = COPY_TEMPLATES[key];
  const slots = placeholders.map((name) => COPY_PLACEHOLDERS[name]);
  /**
   * The widest thing each slot can become, so the cap holds for the worst real case
   * rather than for the template as typed. `industry` is the taxonomy's longest name;
   * `query` and `baseline` are visitor or admin values with no bound this schema can
   * see, so they are budgeted at the slot's own width and the caller's cap carries the
   * rest.
   */
  const widest: Record<CopyPlaceholder, number> = {
    industry: 41,
    query: 0,
    baseline: 0,
  };
  const budget = placeholders.reduce(
    (total, name) => total + Math.max(0, widest[name] - COPY_PLACEHOLDERS[name].length),
    0,
  );

  return nonEmpty.max(Math.max(1, filledMax - budget)).refine(
    (value) => slots.every((slot) => value.includes(slot)),
    {
      message:
        slots.length === 1
          ? `must contain ${slots[0]}, which is replaced with the real value`
          : `must contain each of ${slots.join(", ")}, which are replaced with the real values`,
    },
  );
}

/**
 * The character cap the admin editor states for a copy field, template or not.
 *
 * One call so the editor has no branch of its own and no number of its own: a plain
 * string's bound is read off the schema where it is declared, and a template's comes
 * from `COPY_TEMPLATES` because `.refine()` erased it. Returns `undefined` only if a
 * field somehow has neither, which the editor renders as "no limit" rather than
 * guessing.
 */
export function copyFieldMax(key: keyof PublicCopy): number | undefined {
  if (isCopyTemplate(key)) return COPY_TEMPLATES[key].filledMax;
  const field = publicCopySchema.shape[key];
  return field instanceof z.ZodString ? (field.maxLength ?? undefined) : undefined;
}

/**
 * Substitute a template's slots. The one implementation, used by every render path.
 *
 * A slot with no value supplied is left as typed rather than blanked: that can only
 * happen if a caller forgets to pass one, and a visible `{industry}` in a heading is a
 * bug that reports itself, where an empty gap reads as intentional copy.
 */
export function fillTemplate(
  template: string,
  values: Partial<Record<CopyPlaceholder, string>>,
): string {
  let filled = template;
  for (const [name, slot] of Object.entries(COPY_PLACEHOLDERS)) {
    const value = values[name as CopyPlaceholder];
    if (value === undefined) continue;
    filled = filled.split(slot).join(value);
  }
  return filled;
}

/**
 * Every template key, the slots it requires, and the cap on its FILLED length.
 *
 * **This table is the single home for both facts, because `.refine()` erases
 * `maxLength`.** The admin editor reads every other field's cap straight off
 * `publicCopySchema.shape`, which is what stops a bound being restated in the UI and
 * being wrong — a template is a `ZodType` rather than a `ZodString`, so that route is
 * closed and the cap would have had to be typed a second time in the editor. Both sides
 * read this instead: the schema builds the field from it, and `copyFieldMax` hands the
 * editor the same number. `public-copy.test.ts` pins every shipped default against it.
 */
export const COPY_TEMPLATES = {
  snapshotHeading: { slots: ["industry"], filledMax: 72 },
  peersNarrowNote: { slots: ["industry"], filledMax: 160 },
  largestTitle: { slots: ["industry"], filledMax: 72 },
  mapTitle: { slots: ["industry"], filledMax: 80 },
  indexedNote: { slots: ["baseline"], filledMax: 60 },
  filterEmpty: { slots: ["query"], filledMax: 60 },
} as const satisfies Record<
  string,
  { slots: readonly CopyPlaceholder[]; filledMax: number }
>;

export type CopyTemplateKey = keyof typeof COPY_TEMPLATES;

/** Whether a copy key is a template, narrowing so callers can reach `COPY_TEMPLATES`. */
export function isCopyTemplate(key: string): key is CopyTemplateKey {
  return key in COPY_TEMPLATES;
}

const slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "id must be a lowercase slug");

export const fteRangeSchema = z
  .object({
    min: z.number().int().min(0),
    max: z.number().int().min(0),
  })
  .refine((r) => r.max >= r.min, {
    message: "fte.max must be greater than or equal to fte.min",
  });

export const companySchema = z.object({
  /** Stable slug. The source has one duplicate name, so the name is not a key. */
  id: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "id must be a lowercase slug"),
  name: nonEmpty,
  /**
   * The company's registrable domain, lowercase and bare. The identifier a logo
   * provider is asked for; nothing else in the product reads it.
   *
   * **`.optional()` rather than `.default("")`, and the difference is 1,834 lines.**
   * A defaulted string is written back on every publish, so adding it would put
   * `"domain": ""` on every company in `dataset.json` — a diff nobody can read, on the
   * file whose reviewable diff is the reason there is no database. Optional means an
   * unfilled company carries no key at all and only a real domain shows up.
   *
   * **So a blank must be stored as `undefined`, never `""`.** `sameValue` in `diff.ts`
   * compares through `JSON.stringify`, where those two are not equal — an editor
   * emitting `""` for an untouched blank would report every company as changed.
   *
   * Validated against `DOMAIN_PATTERN` and cleaned by `canonicalDomain`, both in
   * `normalize.ts`, so the admin form and the bulk import cannot disagree about what a
   * domain is. The empty string is accepted here only so a form round-trip cannot fail
   * the gate on a field the admin left alone.
   */
  domain: z
    .string()
    .max(253)
    .refine((value) => value === "" || DOMAIN_PATTERN.test(value), {
      message:
        "domain must be a bare registrable domain, lowercase, with no scheme, www. or path — e.g. nike.com",
    })
    .optional(),
  /** Country, not city — the source column is misleadingly named "Company HQ". */
  hqCountry: nonEmpty,
  industry: nonEmpty,
  revenueBand: nonEmpty,
  /** Year the India GCC was established. */
  establishedYear: z.number().int().min(1900).max(2100),
  /** One or more India cities. Order as supplied. */
  cities: z.array(nonEmpty).min(1),
  /** The only headcount field kept. Always a closed pair; see the audit. */
  fte: fteRangeSchema,
  fortuneGlobal500: z.boolean(),
  forbesGlobal2000: z.boolean(),
  /**
   * What this company actually does, by reference to `dataset.businessTypes`.
   *
   * Defaulted to `[]` rather than required, which is the whole reason this could
   * be added without touching `DATASET_VERSION` or re-importing: a company row
   * written before the field existed still parses, and an untagged company falls
   * through to industry-level peer matching — byte-identically to how the product
   * behaved before any of this existed. That is what makes the tagging safe to
   * roll out one industry at a time.
   *
   * An ARRAY because a handful of companies genuinely are two businesses; the
   * dataset is overwhelmingly length 0 or 1. Where there are two, similarity uses
   * the union of their tags, so a conglomerate is a credible peer for both sides
   * of itself rather than a diluted match for neither.
   */
  businessTypes: z.array(nonEmpty).default([]),
});

/**
 * A tag, validated by SHAPE rather than by membership of the authored vocabulary.
 *
 * **It was `z.enum(BUSINESS_TAGS)`, and opening it up is a deliberate product
 * decision with one measured guard behind it.** The objection to admin-editable tags
 * was never that a lonely tag matches nothing — it is that IDF is unbounded, so a
 * fresh tag arrives at roughly a hundred times a common one and dominates the
 * visitor's own denominator; one invented tag was measured cutting the eligible
 * population 20% on average and 95% at worst. That is now handled where it belongs,
 * in `buildSimilarityModel`, which caps a tag outside the authored vocabulary at the
 * most discriminating AUTHORED weight in its own industry. So the expressiveness is
 * available and the peer engine cannot be blown up by it.
 *
 * The enum is not merely relaxed to `z.string()`: a tag is a matching key compared by
 * equality, so `Quick Commerce`, `quick commerce` and `quick-commerce` would be three
 * tags sharing nothing. The slug is what makes one idea one key.
 */
export const businessTagSchema = z
  .string()
  .trim()
  .min(2)
  .max(BUSINESS_TAG_MAX_LENGTH)
  .regex(
    BUSINESS_TAG_PATTERN,
    "a tag is a lowercase hyphenated slug — it is compared by equality, so two spellings would be two tags",
  );

/**
 * A business type: what a visitor picks, and the tag set a company inherits.
 *
 * Admin-editable, and since the tag vocabulary opened up so are its tags — ANSR can
 * add "Quick commerce" and file it under a tag nobody thought of, without a developer.
 * What has not changed is the consequence: deleting a tag silently re-scores every peer
 * set in the industry, which is why the publish diff reports a tag change as a real
 * change. See `business-tags.ts` and the weight cap in `similarity.ts`.
 */
export const businessTypeSchema = z.object({
  id: slug,
  /** The public dropdown label. Renaming is free; changing `id` is not. */
  name: nonEmpty.max(80),
  /** Must be a value in `taxonomy.industries`. Checked below. */
  industry: nonEmpty,
  /**
   * At least two, because similarity needs something to share. A one-tag type
   * would either match everything in its industry or nothing.
   */
  tags: z.array(businessTagSchema).min(2).max(16),
});

/**
 * The most peers any override may pin.
 *
 * Five, because the comparison grid is one row of up to five columns and the count of
 * columns IS the count of peers. It is the same ceiling `DEFAULT_PEER_LIMIT` sets, held
 * here rather than imported so the schema does not depend on the engine — but the two
 * are the same number and a change to either is a change to both.
 */
export const PEER_OVERRIDE_MAX_COMPANIES = 5;

/**
 * A hand-picked peer set for one combination of answers.
 *
 * **What it is for: control where the data is thin.** For most combinations the scored
 * engine is right and nothing here exists. For the ones where it is not — a
 * sub-industry with four eligible companies, an industry where the two obvious
 * comparisons happen to score below the floor, a company ANSR would rather not put in
 * front of a particular visitor — this replaces the engine's answer with a named list.
 * It is a REPLACEMENT and not a nudge: whatever is in `companyIds` is the peer set, in
 * that order, and whatever is not is not shown. That is what makes it both an include
 * list and an exclude list without a second field.
 *
 * ## The combination is a pattern, not a tuple
 *
 * `industry` is required; the other three are optional and an absent one means ANY. So
 * one row can cover the whole of Education, or exactly one band inside one sub-industry
 * inside one country. `matchPeerOverride` picks the MOST SPECIFIC row that fits, which is
 * what lets a broad safety net and a narrow correction coexist — see it for the
 * precedence and for why a duplicate combination is refused rather than resolved.
 *
 * `industry` is required for two reasons and both matter. It is the hard boundary peer
 * matching may never cross, so an override that omitted it could put a bank in front of
 * a retailer; and it is what scopes the candidate list the admin picks from, which is
 * unusable at 1,834 rows.
 *
 * ## What it deliberately cannot do
 *
 * It cannot reach outside the industry — the schema refuses a company from another one.
 * It cannot pin an empty set: a zero-peer result is a real state the engine can produce
 * and the copy handles, but arriving at it by hand is indistinguishable from a row
 * somebody half-filled, so the minimum is one. And it cannot invent a company; every id
 * is checked against `companies`, so deleting a company sweeps it out of every override
 * rather than leaving a publish that fails validation.
 */
export const peerOverrideSchema = z.object({
  id: slug,
  /** Required, and checked against `taxonomy.industries`. The hard boundary. */
  industry: nonEmpty,
  /** Absent means every sub-industry, including a visitor who named none. */
  businessTypeId: z.string().trim().min(1).optional(),
  /** Absent means every band. Checked against `taxonomy.revenueBands`. */
  revenueBand: z.string().trim().min(1).optional(),
  /**
   * Absent means every country.
   *
   * Checked against the taxonomy UNION the world list, which is the same asymmetry
   * `peerViewInputSchema` applies to the visitor's own answer and for the same reason:
   * HQ is a sort preference, so a country with no companies in the data is a perfectly
   * coherent thing for a visitor to have answered and therefore a coherent thing to
   * write an override against.
   */
  hqCountry: z.string().trim().min(1).optional(),
  /**
   * The peer set, in the order it is drawn. Left to right is the ranking — there is no
   * ordinal on a card, so position is the only statement of order and the admin owns it.
   */
  companyIds: z.array(nonEmpty).min(1).max(PEER_OVERRIDE_MAX_COMPANIES),
  /**
   * Why this exists, for whoever finds it in six months. Admin-only and read by nothing
   * on the public screens.
   *
   * Optional rather than required: a required justification field is one people fill
   * with a full stop. It is here because an override is invisible from the public screen
   * — the peers just look chosen — so the alternative to a note is git archaeology.
   */
  note: z.string().trim().max(280).optional(),
});

/**
 * What an admin may do to the sentence above the peer grid, for one combination of answers.
 *
 * **The gap this fills is a real collision, not a hypothetical one.** Two sentences can
 * describe a peer set: `shortfallLine`, when the set came back SHORT, and `broadenedLine`,
 * when a full set had to reach past the visitor's own sub-industry or revenue band to fill
 * itself. Swept over every combination the form can produce — 1,316 of them — **122 are
 * short AND reached**: 1 past the sub-industry, 108 past the band, 13 past both. In every
 * one of those the engine has a genuine choice and today it is made in code, by the
 * `shortfall === 0` conjunct on both reach signals in `screen1.ts`, which silently drops the
 * broadened line. That default is defensible — "the set is short" is the more urgent fact,
 * and the narrow note's own "so these are the nearest" already carries the reach — but it is
 * a judgement, and ANSR should be able to make it per combination.
 *
 * ## What a policy may and may not do
 *
 * The first three cannot make the tool say anything it could not already say:
 *
 *   - `auto` — today's behaviour. The short line wins wherever both apply.
 *   - `prefer-broadened` — where BOTH apply, draw the broadened line instead. Where only
 *     one applies it is `auto`, so this can never invent a reach.
 *   - `suppress` — draw neither. A silence is not a claim, so this is always safe.
 *
 * The last two CAN, and that is the whole reason they are gated:
 *
 *   - `force-narrow`, `force-broadened` — draw the sentence even where its signal did not
 *     fire.
 *
 * **A forcing policy is the one place in this product an admin can put a statement in front
 * of a visitor that the data does not support**, and it exists because the admin sometimes
 * knows something the engine cannot: the commonest case is a hand-pinned peer set, where
 * `matchPeers` deliberately reports no shortfall and no reach — an override "makes no
 * automatic claim" — so both sentences go silent even though ANSR pinned three companies
 * precisely BECAUSE few comparable ones exist. Forcing the narrow note there is true, and
 * nothing else in the system can say it.
 *
 * ## `acknowledged` is the second step, and it is PERSISTED rather than a UI state
 *
 * A forcing policy is refused by the publish gate unless `acknowledged` is true. The admin
 * sets it through a confirmation step that states what it costs; storing it means the
 * approval is a reviewable fact in the diff rather than a click nobody can audit, and it
 * means a hand-edited `dataset.json` cannot smuggle a forced sentence past either. It is
 * `.default(false)` rather than optional — unlike `company.domain`, where an absent key and
 * an empty one had to stay distinct to keep 1,834 diffs quiet — because absent-versus-false
 * is exactly the ambiguity an approval flag must not have.
 *
 * ## The two forcing policies are not symmetric
 *
 * `force-narrow` draws `copy.peersNarrowNote`, which says "few GCCs closely match your
 * sub-industry". For a visitor who named no sub-industry that sentence is not merely
 * unsupported, it is incoherent — so a rule using it must name a `businessTypeId`, checked
 * by `datasetSchema`. `force-broadened` needs no such guard: its sentence says "few
 * companies match your selection exactly", which is true of whatever the visitor selected.
 *
 * **Only the two PUBLISHED sentences can be forced.** `shortfallLine`'s other three
 * branches state counts and populations — "3 rather than 5", "no other X runs an India
 * centre yet" — so forcing one would print a number the set does not have. Those stay
 * derived and unreachable from here.
 */
export const PEER_NOTE_POLICIES = [
  "auto",
  "prefer-broadened",
  "suppress",
  "force-narrow",
  "force-broadened",
] as const;

export type PeerNotePolicy = (typeof PEER_NOTE_POLICIES)[number];

/**
 * The policies that can state something the peer set does not support, and therefore the
 * ones `acknowledged` is required for.
 *
 * A list rather than a `startsWith("force-")` test: the set of dangerous policies is a
 * product decision, and deriving it from the spelling of a name means renaming a policy
 * silently changes what needs approval.
 */
export const FORCING_NOTE_POLICIES: readonly PeerNotePolicy[] = [
  "force-narrow",
  "force-broadened",
];

export function isForcingNotePolicy(policy: PeerNotePolicy): boolean {
  return FORCING_NOTE_POLICIES.includes(policy);
}

/**
 * A sentence rule for one combination of answers.
 *
 * **The combination is a PATTERN on exactly the shape `peerOverrideSchema` uses** —
 * industry required, the other three optional with absent meaning ANY — so `overrideFits`
 * and `overrideSpecificity` in `peers.ts` serve both collections and the precedence rules
 * cannot drift apart. See `matchPeerNoteRule`.
 *
 * **It is a SEPARATE collection from `peerOverrides` and that is forced by the engine, not
 * a filing preference.** A pinned peer set already reports `shortfall: 0`,
 * `bandReached: false` and `shownSameBusinessType === peers.length`, so both sentences are
 * silent on a pinned combination by construction — a policy field on that row would be dead
 * for every value except the two forcing ones. And the reverse matters more: the 122
 * colliding combinations are overwhelmingly ones nobody has pinned or ever will, so tying
 * the sentence to a pinned set would make the feature unreachable exactly where it is
 * needed. The two decisions are independent and get one home each.
 */
export const peerNoteRuleSchema = z.object({
  id: slug,
  /** Required, and checked against `taxonomy.industries`. Scopes the rule, as on an override. */
  industry: nonEmpty,
  /** Absent means every sub-industry, including a visitor who named none. */
  businessTypeId: z.string().trim().min(1).optional(),
  /** Absent means every band. Checked against `taxonomy.revenueBands`. */
  revenueBand: z.string().trim().min(1).optional(),
  /** Absent means every country. Taxonomy UNION the world list, as on an override. */
  hqCountry: z.string().trim().min(1).optional(),
  policy: z.enum(PEER_NOTE_POLICIES),
  /**
   * The admin has confirmed a forcing policy. Required true for one; meaningless otherwise.
   *
   * See the block above `PEER_NOTE_POLICIES` for why this is stored rather than transient.
   */
  acknowledged: z.boolean().default(false),
  /**
   * Why this rule exists. Admin-only, read by nothing on the public screens.
   *
   * Optional on an `auto`-shaped rule and **required in practice on a forcing one**, where
   * `datasetSchema` insists on it: a sentence the data does not support is the one case
   * where "why" cannot be left to git archaeology.
   */
  note: z.string().trim().max(280).optional(),
});

/**
 * Where a city sits, so the density map can plot it.
 *
 * Bounded to India's own extent rather than to the globe. `MAP_FRAME` in geo.ts is
 * the field the map draws, and a coordinate outside it would render a dot on the
 * frame's edge or clipped away entirely — which reads as a broken map rather than as
 * a bad number. The bounds are deliberately a little wider than the frame so a city
 * on the boundary is not refused by rounding.
 */
export const latLonSchema = z.object({
  lat: z.number().min(5).max(38.5),
  lon: z.number().min(66).max(99),
});

/**
 * The four flat string lists, named so "a taxonomy list" has a type.
 *
 * `keyof Taxonomy` used to mean exactly this, and it stopped meaning it the moment
 * the two parallel keys below arrived — one is a record, the other holds copies of
 * strings from `industries` rather than values of its own. Everything that
 * generically walks the lists (the rename cascade, the usage counts, the diff, the
 * editor's own config) wants these four and nothing else, so they get their own key
 * type instead of a wider one each of those places would have to narrow again.
 */
export const TAXONOMY_LIST_KEYS = [
  "industries",
  "revenueBands",
  "cities",
  "hqCountries",
] as const;

export type TaxonomyListKey = (typeof TAXONOMY_LIST_KEYS)[number];

export const taxonomySchema = z.object({
  industries: z.array(nonEmpty).min(1),
  /** Ascending. Adjacency in peer matching is a step in this array. */
  revenueBands: z.array(nonEmpty).min(1),
  cities: z.array(nonEmpty).min(1),
  hqCountries: z.array(nonEmpty).min(1),
  /**
   * Industries held in the dropdown's leading tier whatever their company count.
   *
   * **A parallel list of names rather than a flag on a restructured `industries`,
   * and that is a compatibility decision.** `industries` is a `string[]` that
   * companies, business types and the public dropdowns all key on by value;
   * turning it into an array of objects would touch every one of those consumers
   * to buy one boolean. A second list of the same strings costs a referential
   * check, which `datasetSchema` does below.
   *
   * Defaulted, so a dataset written before the key existed still reads. Order
   * inside the tier is still by count — this decides membership, not position.
   */
  pinnedIndustries: z.array(nonEmpty).default([]),
  /**
   * Coordinates for cities the code does not already know.
   *
   * **An OVERLAY on `CITY_COORDINATES`, never a replacement for it.** The code's
   * table is geographic fact for the 31 cities the seed shipped, and it stays the
   * source for those so the taxonomy editor cannot move Bengaluru. What this adds
   * is the one thing the code cannot supply: where a city added after the seed
   * actually is. `projectCity` reads the overlay first, then the table.
   *
   * A city with no coordinate on either side is counted, ranked and listed as
   * normal and simply carries no dot. Nothing on the public screen says so — see
   * the admin hint, which is where the gap is surfaced.
   */
  cityCoordinates: z.record(nonEmpty, latLonSchema).default({}),
});

/* ==========================================================================
   Screen 2 — the function metric catalogue

   A second dataset with no spreadsheet behind it. It lives under its own
   top-level key inside the same `Dataset` rather than in a second file, which
   is what lets it reuse the whole existing pipeline: this schema is the publish
   gate, `formatIssues` turns a failure into a message naming the metric, the
   diff and the browser draft carry it, and the mtime-and-size read cache
   invalidates it. A second file would need a second store target, a second
   diff, and a publish that could half-succeed.
   ========================================================================== */

/**
 * The four function areas. These ARE the public UI — Screen 2's tabs.
 *
 * Named `functionArea` and not `function` because `function` cannot be
 * destructured; `const { function } = metric` is a syntax error, and a field
 * name that breaks at the first refactor is not worth the two saved characters.
 */
export const METRIC_FUNCTIONS = ["tech", "operations", "hr", "finance"] as const;

/**
 * The four lenses. An INTERNAL FILING SYSTEM, and never a public label.
 *
 * The brief's author used six (adding Fit and Optional); those two collapse into
 * the four here, because both were really supply questions: Fit is comparative
 * capability supply across delivery locations, and the Optional diversity block
 * is the composition of the workforce on offer. Nothing from the brief lost a
 * home — see docs/brief.md and the catalogue in src/data/metric-catalogue.ts.
 *
 * The admin surface does show these, because admin is internal staff and this is
 * what a filing system is for. `publicMetric` in src/data/metrics.ts strips the
 * field, so it cannot reach a visitor even by accident.
 */
export const METRIC_LENSES = ["supply", "speed", "place", "cost"] as const;

/**
 * How a number is read. Governs rendering and the bounds checked below.
 *
 * There is deliberately NO currency format, and there never will be: the brief
 * forbids absolute per-head salary figures in any lens, gated or not, so the
 * schema is built so money cannot be expressed rather than trusting everyone to
 * remember. Cost is indices, spreads, growth rates and relative positions. The
 * `unit` check below closes the obvious way round it.
 */
export const METRIC_FORMATS = [
  "number",
  "percent",
  "index",
  "duration",
  "rating",
] as const;

export type MetricFunction = (typeof METRIC_FUNCTIONS)[number];
export type MetricLens = (typeof METRIC_LENSES)[number];
export type MetricFormat = (typeof METRIC_FORMATS)[number];

/** Currency, in any of the forms someone would reach for. */
const CURRENCY_PATTERN =
  /[₹$€£¥]|\b(inr|usd|eur|gbp|jpy|rs|rupees?|lakhs?|crores?|dollars?|euros?|pounds?)\b/i;

const unitSchema = z
  .string()
  .trim()
  .min(1)
  .max(60)
  .refine((unit) => !CURRENCY_PATTERN.test(unit), {
    message:
      "cost is expressed as indices, spreads and growth rates — a currency unit would make this an absolute money figure, which is never shown",
  });

/**
 * The metric's SHAPE, authored once and independent of whether anyone has
 * entered a number yet.
 *
 * Keeping structure out of the value is what makes two things work. Values can
 * be absent — none of the Screen 2 figures have been supplied, so the catalogue
 * ships with definitions and nulls rather than invented numbers. And a gated
 * metric still has a shape to render a placeholder from without a value
 * existing anywhere near the browser.
 */
export const metricStructureSchema = z.discriminatedUnion("kind", [
  /** One number. */
  z.object({ kind: z.literal("scalar") }),
  /**
   * A spread. The end labels belong here rather than on the value because which
   * operating model each end represents is part of the definition — "as low as
   * 7 days with an employer of record, against 30 for a build-operate-transfer"
   * is the brief's own note, not a measurement.
   */
  z.object({
    kind: z.literal("range"),
    minLabel: z.string().trim().min(1).max(120).optional(),
    maxLabel: z.string().trim().min(1).max(120).optional(),
  }),
  /** Named parts: a split by discipline, by segment, by milestone. */
  z.object({
    kind: z.literal("breakdown"),
    entries: z.array(nonEmpty).min(2).max(24),
  }),
  /** A comparison grid: capability by location, cost by role and level. */
  z.object({
    kind: z.literal("matrix"),
    rows: z.array(nonEmpty).min(1).max(24),
    columns: z.array(nonEmpty).min(2).max(12),
  }),
]);

/**
 * The numbers, when they exist. `null` inside a breakdown or a matrix is a cell
 * nobody has filled yet, which is different from a zero.
 */
export const metricValueSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("scalar"), value: z.number() }),
  z.object({
    kind: z.literal("range"),
    min: z.number(),
    max: z.number(),
  }),
  z.object({
    kind: z.literal("breakdown"),
    values: z.array(z.number().nullable()),
  }),
  z.object({
    kind: z.literal("matrix"),
    /** Numbers, or a rating label when the format is `rating`. */
    cells: z.array(z.array(z.union([z.number(), nonEmpty, z.null()]))),
  }),
]);

const metricObjectSchema = z.object({
  id: slug,
  functionArea: z.enum(METRIC_FUNCTIONS),
  /** Internal only. Stripped by `publicMetric`. */
  lens: z.enum(METRIC_LENSES),
  /** The public heading. */
  title: nonEmpty.max(120),
  /** The brief's "Why:" note, in the visitor's terms. Public. */
  question: nonEmpty.max(300),
  unit: unitSchema.optional(),
  format: z.enum(METRIC_FORMATS),
  /** Required when `format` is "rating", forbidden otherwise. */
  ratingScale: z.array(nonEmpty).min(2).max(8).optional(),
  /** Required when `format` is "index": an index with no stated base is unreadable. */
  indexBaseline: z.string().trim().min(1).max(80).optional(),
  /**
   * The figures are a floor, not a point measurement, and render with a trailing
   * "+".
   *
   * Part of the DEFINITION rather than of the value, which is why it lives beside
   * `format` and not inside `metricValueSchema`: "8.7 million or more technology
   * professionals" is a claim about how the figure was arrived at, and it holds
   * whatever number is entered next month. Keeping it here also means the admin
   * editor cannot flip it while typing a value — the same reason `format` and
   * `gated` are not editable either.
   *
   * Only meaningful where a figure is a count, so it is refused on a rating; an
   * ordinal has no "or more".
   */
  atLeast: z.boolean().optional(),
  /**
   * The parts are waypoints on ONE path, not a set of independent subjects.
   *
   * **Authored, for exactly the reason `indexBaseline` carries direction:** nothing
   * in the data can tell the two apart. "To 50 FTEs / To 100 / To 300 / To 500" and
   * "Same-city cloud region / Another India region / Europe / US East" are both a
   * duration breakdown whose values rise from part to part — the first is one centre
   * measured four times as it grows, the second is four destinations measured once
   * each. Only the author of a metric knows which, and a rule that guessed from
   * monotonicity would have drawn the latency metric as a journey.
   *
   * Deliberately not inferred from the LABELS either. Entry names are
   * admin-editable, so a rule that read "To 500 FTEs" would change the chart the
   * first time somebody renamed a part.
   *
   * Refused on anything but a breakdown of three or more parts: a progression of
   * two points is a range, and it has one already.
   */
  progression: z.boolean().optional(),
  /**
   * The SECOND part is contained by the first. Drawn inside it, not beside it.
   *
   * **Authored for the same reason `progression` is, and it replaces a heuristic
   * that could draw a falsehood.** Containment used to be inferred from two parts
   * sharing a `unit` and the smaller being under half the larger — on the argument
   * that a shared unit is the definition's own statement that two parts measure the
   * same KIND of thing. That is a precondition for containment and never evidence of
   * it. "Total Grade A stock" and "vacant and available now" are both million sq ft
   * and the nesting is real; "Engineering, other disciplines" and "Management and
   * MBA graduates" are both graduates a year and are disjoint populations, so
   * nesting them asserts that every MBA graduate holds an engineering degree — a
   * claim the source does not make and that no arithmetic here could check.
   *
   * So the shared unit stays a precondition and this flag is the claim. Two parts in
   * one unit WITHOUT it are drawn adjacent, which states their sizes and asserts no
   * relationship between them.
   *
   * Refused on anything but a breakdown of exactly two parts: with three or more,
   * which one contains which is not expressible by a boolean, and the honest drawing
   * is a set of bars.
   */
  subset: z.boolean().optional(),
  /** Free-text provenance shown to the visitor, e.g. "2026 Q1". */
  asOf: z.string().trim().min(1).max(40).optional(),
  /** Internal working note. Never served — see `publicMetric`. */
  note: z.string().trim().max(600).optional(),
  structure: metricStructureSchema,
  value: metricValueSchema.nullable(),
  /**
   * Behind the gate. A server-side omission, not a CSS blur: `publicMetric`
   * returns a variant that structurally cannot carry a value.
   */
  gated: z.boolean(),
});

/** Bounds per format. Loose enough to be data, tight enough to catch a typo. */
const FORMAT_BOUNDS: Partial<Record<MetricFormat, { min: number; max: number }>> = {
  // Growth can be negative; a rate in the thousands is a units mistake.
  percent: { min: -100, max: 1000 },
  index: { min: 0, max: 10_000 },
  duration: { min: 0, max: 100_000 },
  number: { min: 0, max: 1_000_000_000 },
};

export const metricSchema = metricObjectSchema.superRefine((metric, ctx) => {
  const issue = (message: string, path: (string | number)[] = []) =>
    ctx.addIssue({ code: "custom", path, message });

  if ((metric.format === "rating") !== (metric.ratingScale !== undefined)) {
    issue(
      metric.format === "rating"
        ? "a rating metric needs ratingScale, so the ordinal steps are named"
        : "ratingScale only applies when format is \"rating\"",
      ["ratingScale"],
    );
  }
  if (metric.format === "index" && metric.indexBaseline === undefined) {
    issue("an index needs indexBaseline — an index with no stated base is unreadable", [
      "indexBaseline",
    ]);
  }
  if (metric.format !== "index" && metric.indexBaseline !== undefined) {
    issue("indexBaseline only applies when format is \"index\"", ["indexBaseline"]);
  }
  if (metric.ratingScale && new Set(metric.ratingScale).size !== metric.ratingScale.length) {
    issue("ratingScale repeats a step", ["ratingScale"]);
  }
  if (metric.atLeast && metric.format === "rating") {
    issue("an ordinal step has no \"or more\" — atLeast only applies to a figure", [
      "atLeast",
    ]);
  }
  if (
    metric.progression &&
    (metric.structure.kind !== "breakdown" || metric.structure.entries.length < 3)
  ) {
    issue(
      "a progression is a breakdown of three or more waypoints — two points are a range",
      ["progression"],
    );
  }
  if (metric.progression && metric.atLeast) {
    // A progression is drawn from the DIFFERENCES between its waypoints, and the
    // difference between two floors is not itself a floor. Marking the intervals
    // would claim more than the data does; leaving them unmarked beside marked
    // waypoints would put two kinds of figure in one chart.
    issue("a progression's intervals cannot carry a floor marker", ["atLeast"]);
  }
  if (
    metric.subset &&
    (metric.structure.kind !== "breakdown" || metric.structure.entries.length !== 2)
  ) {
    issue(
      "containment is a claim about exactly two parts — with three or more, which one contains which is not expressible",
      ["subset"],
    );
  }
  if (metric.subset && metric.unit === undefined) {
    // The unit is the definition's statement that the two parts measure the same
    // kind of thing, which is a precondition for one being inside the other. A
    // containment claim over two parts that do not declare a shared kind is the
    // meetup-groups-and-conferences defect with a flag on it.
    issue("a contained part needs a unit shared with its total", ["subset"]);
  }
  if (metric.subset && metric.progression) {
    // Waypoints on one path are all contained by the last of them, so the flag
    // would be either redundant or a second, contradictory reading of the parts.
    issue("a progression's waypoints are already cumulative — subset says nothing", [
      "subset",
    ]);
  }

  // A rating is an ordinal label, so it can only live in cells. Nothing in the
  // brief asks for a lone ordinal, and allowing one would mean a second way to
  // encode the same thing.
  if (metric.format === "rating" && metric.structure.kind !== "matrix") {
    issue("a rating is only meaningful in a comparison grid", ["format"]);
  }

  const duplicates = (values: readonly string[]) =>
    new Set(values).size !== values.length;
  if (metric.structure.kind === "breakdown" && duplicates(metric.structure.entries)) {
    issue("two parts share a label", ["structure", "entries"]);
  }
  if (metric.structure.kind === "matrix") {
    if (duplicates(metric.structure.rows)) issue("two rows share a label", ["structure", "rows"]);
    if (duplicates(metric.structure.columns)) {
      issue("two columns share a label", ["structure", "columns"]);
    }
  }

  /**
   * Gated metrics: no digits in the two fields that do reach the browser.
   *
   * The gate is a server-side omission, so the value is safe. The leak this
   * closes is the sentence next to it — a title or question written as "is India
   * 40% cheaper fully loaded?" hands over the answer the gate exists to hold
   * back, and no amount of care about the value field prevents it.
   */
  if (metric.gated) {
    for (const field of ["title", "question"] as const) {
      if (/\d/.test(metric[field])) {
        issue(
          `a gated metric's ${field} is public, so it cannot contain a figure — describe the question, not the answer`,
          [field],
        );
      }
    }
  }

  const value = metric.value;
  if (value === null) return;

  if (value.kind !== metric.structure.kind) {
    issue(
      `the value is a ${value.kind} but the metric is defined as a ${metric.structure.kind}`,
      ["value", "kind"],
    );
    return;
  }

  const bounds = FORMAT_BOUNDS[metric.format];
  const checkNumber = (n: number, path: (string | number)[]) => {
    if (!Number.isFinite(n)) {
      issue("not a finite number", path);
      return;
    }
    if (bounds && (n < bounds.min || n > bounds.max)) {
      issue(
        `${n} is outside the range a ${metric.format} metric can hold (${bounds.min} to ${bounds.max})`,
        path,
      );
    }
  };

  if (value.kind === "scalar") {
    checkNumber(value.value, ["value", "value"]);
  }

  if (value.kind === "range") {
    checkNumber(value.min, ["value", "min"]);
    checkNumber(value.max, ["value", "max"]);
    if (value.max < value.min) {
      issue("the upper end is below the lower end", ["value", "max"]);
    }
  }

  if (value.kind === "breakdown" && metric.structure.kind === "breakdown") {
    if (value.values.length !== metric.structure.entries.length) {
      issue(
        `${value.values.length} values for ${metric.structure.entries.length} parts — every part needs a slot, even an empty one`,
        ["value", "values"],
      );
    }
    value.values.forEach((n, index) => {
      if (n !== null) checkNumber(n, ["value", "values", index]);
    });
  }

  if (value.kind === "matrix" && metric.structure.kind === "matrix") {
    const { rows, columns } = metric.structure;
    if (value.cells.length !== rows.length) {
      issue(
        `${value.cells.length} rows of cells for ${rows.length} rows`,
        ["value", "cells"],
      );
    }
    const scale = metric.ratingScale ? new Set(metric.ratingScale) : null;
    value.cells.forEach((row, rowIndex) => {
      if (row.length !== columns.length) {
        issue(
          `${row.length} cells for ${columns.length} columns`,
          ["value", "cells", rowIndex],
        );
      }
      row.forEach((cell, columnIndex) => {
        const path = ["value", "cells", rowIndex, columnIndex];
        if (cell === null) return;
        if (scale) {
          if (typeof cell !== "string" || !scale.has(cell)) {
            issue(`"${String(cell)}" is not one of the rating steps`, path);
          }
          return;
        }
        if (typeof cell !== "number") {
          issue("only a rating metric may hold text in a cell", path);
          return;
        }
        checkNumber(cell, path);
      });
    });
  }
});

/* ==========================================================================
   Site content — the entry point's own words and figures

   The two things on the public entry point that are neither a company row nor a
   function metric, and that ANSR has to be able to change without a developer:
   the hero's copy, and the corporate impact figures.

   **Why these are data and the rest of the copy is not.** Every other string on
   the public screens is an argument about the dataset, so it lives beside the
   logic that makes the argument (`screen1/copy.ts`) and changing it is a
   reviewable code change. These two are different: the hero is positioning,
   which marketing owns, and the impact figures are corporate facts that move on
   their own schedule and are wrong the moment they are stale. A figure that goes
   stale because editing it needed a developer is the exact failure this key
   exists to prevent.

   Deliberately NOT in `taxonomy` — taxonomy is flat string lists with rename
   cascades and usage counts, and none of that machinery applies here. `metrics`
   and `businessTypes` set the precedent for an editable collection beside it.
   ========================================================================== */

/**
 * The product's own name, and the ONE place the shipped spelling lives.
 *
 * **It is here rather than in `product-name.tsx` because it is now the DEFAULT of an
 * editable field, and a default belongs beside the schema that declares it.**
 * `ProductName` imports it and re-exports it as `PRODUCT_NAME`, so the component that
 * draws the name and the field an admin edits cannot ship two different spellings. The
 * data layer may not import a component — `schema.ts` is read by `tsx` scripts with no
 * React in scope — so the dependency runs this way round and not the other.
 */
export const DEFAULT_PRODUCT_NAME = "GCC ATLAS";

/**
 * The hero band's copy: the product's name, the promise under it, and one supporting
 * line. Three fields, and deliberately nothing else.
 *
 * **THE HEADLINE IS TWO FIELDS RATHER THAN ONE, at the project owner's instruction, and
 * that REVERSES the reason it was ever one.** It was a single `title` matched for the
 * literal substring `GCC ATLAS` by `withProductMark` in `ask-hero.tsx`, on the argument
 * that two fields would make an admin responsible for knowing where to split their own
 * headline. What that argument missed is the failure it bought: the match was silent, so a
 * headline spelling the name any other way — doubled space, hyphen, a reword that dropped
 * a letter — rendered as ordinary heading type and looked deliberate. Nothing enforced it
 * and nothing could, because the field was free text.
 *
 * Splitting it deletes the matcher and the class of bug with it. The name is its own
 * field, so it is drawn as the name by construction; and the two halves can be SIZED
 * independently, which is what the composition now needs — see `HERO_TAGLINE_EM`.
 *
 * **There is still no kicker field, and that absence is unchanged.** The band used to
 * carry an uppercase eyebrow above an unrelated headline; a schema with a `kicker` slot
 * is an invitation to fill it, so the slot is gone rather than left empty. What arrived
 * instead is not an eyebrow — the tagline is the second half of one sentence, under the
 * name rather than above it.
 *
 * **Both new fields are DEFAULTED, which is what makes this a compatible change rather
 * than a version bump.** A dataset written while the headline was one `title` has neither
 * key; zod fills them with the shipped values and strips the stale `title`, so the fs
 * store's refusal of an unrecognised `version` never comes into it. The precedent is
 * `metrics` and `close`. `data/dataset.json` is rewritten in the same commit all the same
 * — see the note on `DEFAULT_PUBLIC_COPY` for why a key the diff cannot see is worse than
 * a key that is missing.
 *
 * Bounded lengths rather than free text, because all three have a typographic job the
 * layout depends on.
 *
 * **THE TWO NEW CAPS ARE EXPORTED CONSTANTS RATHER THAN READ OFF THE SCHEMA, for the
 * reason `CTA_URL_MAX_LENGTH` is.** `.default()` wraps the string in a `ZodDefault`, which
 * has no readable `maxLength` — so the admin form, which introspects every other bound,
 * would silently fall through to its own literal and drift from the gate. One constant per
 * cap, imported by both.
 *
 *   - `productName` is drawn `whitespace-nowrap` at up to 72px, so it CANNOT wrap and a
 *     long one overflows the band instead. 16 characters is the measured ceiling: at
 *     72px the shipped nine draw 387px inside a 704px `max-w-hero`, and at 38px on a
 *     390px phone they draw 204px inside ~342px of copy box — both give room for about
 *     fifteen more of the same average width.
 *   - `tagline` is sized as a fraction of the name and wraps freely. 56 characters holds
 *     it to two lines at the narrowest width; the shipped 28 take one line everywhere.
 *   - `lead` sits under both as a two-line supporting sentence; the cap is set to that
 *     target rather than to the reading measure, so an admin cannot quietly grow it into
 *     a paragraph that crowds the card overlapping the band.
 *
 * An admin needing more words than this needs a different band, and the form says so
 * rather than letting them find out on the live site.
 */
export const HERO_PRODUCT_NAME_MAX = 16;
export const HERO_TAGLINE_MAX = 56;

export const heroCopySchema = z.object({
  productName: nonEmpty.max(HERO_PRODUCT_NAME_MAX).default(DEFAULT_PRODUCT_NAME),
  tagline: nonEmpty.max(HERO_TAGLINE_MAX).default("Benchmark against your peers"),
  lead: nonEmpty.max(180),
});

/**
 * One corporate impact figure.
 *
 * `value` is free text and stays that way on purpose. These are not computed
 * from anything — they are ANSR's own published figures, already carrying their
 * own units and qualifiers ("225K+", "$2.5B+", "14M+"). Splitting a number from
 * its suffix would mean the schema deciding how "$2.5B+" is assembled, and the
 * next figure ANSR supplies would break the parts list. The `atLeast` reasoning
 * from the metric catalogue does not transfer: there the `+` is a claim about
 * how a figure was derived from data we hold, and here the whole string is
 * supplied.
 *
 * Which also means nothing here can be validated as a number, so nothing
 * pretends to. The gate checks it is short enough to render.
 */
export const impactStatSchema = z.object({
  id: slug,
  value: nonEmpty.max(16),
  label: nonEmpty.max(64),
});

/**
 * A CTA link as stored: blank, or an absolute `http`/`https` URL with its query string
 * intact.
 *
 * **`.refine` rather than a regex, so this is a `ZodEffects` and has no readable
 * `maxLength`.** That is why the admin form reads `CTA_URL_MAX_LENGTH` from
 * `normalize.ts` instead of introspecting the schema the way it does for every other cap.
 * The bound and the predicate are both imported from the one module that owns them, so
 * the two cannot state different rules — which is the same guarantee reading `.maxLength`
 * off the schema buys elsewhere.
 */
const ctaUrl = z
  .string()
  .trim()
  .max(CTA_URL_MAX_LENGTH)
  .refine((value) => value === "" || isCtaUrl(value), {
    message:
      "Must be a full link starting with https:// (or http://), or left blank to use the configured default.",
  })
  .default("");

/**
 * The close's copy — the one band on the RESULT screens that is editable data.
 *
 * **It is here for the same reason the hero is, and that reason is the test any future
 * addition has to pass.** Every other public string is an argument about the dataset and
 * lives beside the logic making the argument, so moving it into data would separate a
 * claim from the thing that justifies it. The close makes no claim about the dataset: it
 * is positioning and an offer, on ANSR's own schedule rather than the data's. Same
 * category as the hero, so it gets the same treatment.
 *
 * **Two strings and two links, and there is still no heading** — the band's accessible
 * name is an `aria-label` in the component, and a heading field nothing draws would be a
 * field asked for and never consumed. If a heading comes back it is a schema addition and
 * a component change together, which is the right amount of friction.
 *
 * The two caps are render limits rather than editorial taste. `body` is the band's display
 * line, set large and centred at the lead measure: past roughly 140 characters it runs to
 * four lines and the button falls out of the first screenful on a phone. `ctaLabel` sits
 * in a pill that must not wrap — 28 characters is what fits at 390 with the pill's own
 * padding, measured rather than guessed. The links have no render limit at all, so their
 * cap is a different kind of bound; see `CTA_URL_MAX_LENGTH`.
 */
export const closeCopySchema = z.object({
  body: nonEmpty.max(140),
  ctaLabel: nonEmpty.max(28),
  /**
   * Where the button goes, ONE FIELD PER RESULT SCREEN.
   *
   * **Two fields rather than one, because the point of them is the query string.** The
   * band is the tool's only outbound link and it renders on both result screens, so a
   * single URL makes the two presses indistinguishable in ANSR's analytics — a visitor
   * who converts off the peer landscape and one who converts off the function metrics
   * arrive as the same event. Separate fields let each carry its own UTM tagging, which
   * is the whole reason this is data and not one environment variable.
   *
   * **Blank is legal and means "use the configured default", which is why these are the
   * only strings in `siteContent` that may be empty.** The link out existed before this
   * field did, as `NEXT_PUBLIC_GCC_CTA_URL` with ansr.com behind it, and that path is
   * still live — see `resolveCtaHref` in `derive.ts`. So an untagged deployment keeps
   * working, an admin who wants tagging fills these, and nobody has to fill a field to
   * preserve today's behaviour. It also means `lengthError`'s "required" reading does not
   * apply here and the admin form uses its own validator.
   *
   * **`.default("")` rather than `.optional()`, which is the opposite of the call on
   * `company.domain` and for a reason that does not carry across.** A defaulted string is
   * written back on every publish; on 1,834 companies that was 1,834 unreadable lines of
   * diff, and here it is two keys on one object. What the default buys is a fixed slot,
   * so the diff reports these as field edits with both sides — the shape a reviewer needs
   * for a link — rather than as a key appearing and disappearing.
   *
   * Validated but never transformed, so the pasted string, the diffed string and the
   * `href` are one value. See `isCtaUrl`.
   */
  ctaHrefPeers: ctaUrl,
  ctaHrefFunctions: ctaUrl,
});

/**
 * One customer mark in the entry point's scrolling strip.
 *
 * **The file is chosen from what is already served, never uploaded.** `src` is
 * validated as a path under `/logos/`, so this field cannot become a way to point the
 * strip at an arbitrary URL — the marks are adapted copies committed to
 * `public/logos/`, and adapting a new one is a `brand_asset.py` step rather than a
 * form field. What an admin controls is which of them appear, in what order, and
 * under what name.
 *
 * `width` and `height` are the mark's own ink bounds, and both are needed: the strip
 * caps height AND width, because ten marks across three aspect ratios set to one
 * uniform height render a 4.9:1 wordmark six times the optical weight of a 0.8:1
 * stacked mark. See `customer-logos.tsx`.
 */
export const customerLogoSchema = z.object({
  /** The company, as its accessible name. Never drawn as text. */
  name: nonEmpty.max(40),
  src: z
    .string()
    .regex(
      /^\/logos\/[A-Za-z0-9._-]+\.(svg|png)$/,
      "src must be a file already served from /logos/, e.g. /logos/nike.svg",
    ),
  width: z.number().int().min(1).max(400),
  height: z.number().int().min(1).max(200),
});

/* ==========================================================================
   The role map — which roles India GCCs hire, by complexity and demand
   ========================================================================== */

/**
 * The two halves of the role map, and they are an ENUM rather than editable strings.
 *
 * A role is in one or the other, and the split is the chart's primary structure — the
 * whole finding is that the emerging roles sit at the complex end. So the membership has
 * to be referentially checkable, which a free string is not: an admin who typed
 * "Emerging " on one row and "emerging" on another would draw three bands. The WORDS a
 * visitor reads are `copy.rolesBandEmerging` and `copy.rolesBandEstablished`, so
 * renaming "Established" back to the slide's "Traditional" is a copy edit and the
 * structure does not move with it.
 */
export const ROLE_BANDS = ["emerging", "established"] as const;
export type RoleBand = (typeof ROLE_BANDS)[number];

/**
 * How many categorical inks `tokens.css` defines, and therefore how many families the
 * chart can tell apart.
 *
 * **TWELVE IS WHAT THE CODE CAN HONOUR AND SEVEN IS WHAT THE CHART WANTS — the two are
 * different claims and this constant is only the first.** The slide keys seven families to
 * seven hues and the shipped dataset uses all seven; the eighth is the slide's own spare.
 * Nine through twelve are ours, added so a ninth group is a publish rather than a deploy,
 * and each was picked by measurement: every one clears 3:1 on the darker wash, which three
 * of the slide's own do not, and the worst pair in the resulting twelve is still the
 * `teal`/`slate` pair that already ships. So raising the ceiling made nothing harder to tell
 * apart — but a legend a reader has to work through is still a worse legend, which the admin
 * hint says rather than the schema.
 *
 * **THIS NUMBER IS LOAD-BEARING IN THREE FILES AND `tests/unit/role-tones.test.ts` IS WHAT
 * KEEPS THEM AGREEING.** It caps `tone` and the family count here; `tokens.css` has to define
 * exactly this many `--ansr-role-*`; and `globals.css` has to carry a `[data-tone]` rule for
 * each. Raise it alone and every slot past the last rule takes the `var()` fallback —
 * measured, `--ansr-accent`, which is the ink headings and figures are set in rather than a
 * categorical one, and which is the SAME for every slot past the cap, so two extra families
 * would draw identically to each other and nothing would report it.
 *
 * Declared above `roleFamilySchema` because that schema reads it while the module is
 * evaluating, which a `const` below it would not yet have initialised.
 */
export const ROLE_TONES = 12;

/**
 * One group of roles, and the colour its dots are drawn in.
 *
 * **The hue is stored rather than derived from position, at the project owner's
 * instruction, and that is the whole reason `tone` exists.** Taking the colour from the
 * family's index in the list would mean reordering the legend silently recolours the
 * chart — an admin dragging "Cybersecurity" above "Cloud & Platform" to tidy the legend
 * would repaint eleven dots and have no way to see that coming. Stored, the colour is a
 * property of the family and a reorder moves nothing but the legend's own order.
 *
 * **`tone` is a SLOT in `--ansr-role-*`, not a colour value.** An admin picks from twelve
 * named inks — the slide's seven, its spare, and four measured additions — and cannot type a
 * hex, which is what keeps `tokens.css` the single source of truth for what this product is
 * allowed to draw.
 * The whole-map refine below refuses two families sharing a slot, because two identical
 * swatches in a legend is precisely the failure colour coding exists to prevent.
 *
 * `name` is capped at 36: it is the legend's own label and the grouping heading in the
 * reflow below `lg`. The longest shipped name is 28 ("Data Engineering & Analytics").
 */
export const roleFamilySchema = z.object({
  id: slug,
  name: nonEmpty.max(36),
  tone: z.number().int().min(1).max(ROLE_TONES),
});

/**
 * One role — one dot on the map.
 *
 * **`complexity` IS A POSITION AND NOT A SCORE, and nothing ever states it to a
 * visitor.** The source slide's axis carries "Lower" and "Higher" and no numerals at
 * all, which is the honest shape: what ANSR holds is an ordering, not a measured index.
 * So this number exists to place the dot and for no other purpose — the axis draws its
 * two ends and the chart draws no tick, no gridline and no value. Storing 0–100 rather
 * than a rank is what lets two roles sit at the same complexity, which several do.
 *
 * **`lane` IS THE VERTICAL POSITION AND IT MEANS NOTHING, which is why it is stored
 * rather than computed.** The chart has one quantitative axis and the other direction is
 * free room: the slide's author placed thirty-six bubbles by hand so that no label
 * collides, interleaving them so a dot at 62% complexity can sit above, below or beside
 * one at 60%. A renderer cannot reproduce that by packing into shared rows — it was tried,
 * and uniform rows put every right-hand label at the same x, which drew eight false
 * columns and read as a list rather than a field. So the placement is DATA, exactly as it
 * is in the source, and the chart says nowhere that height carries a value.
 *
 * **`labelSide` is stored for the same reason.** A threshold rule ("flip past 55") is
 * right most of the time and wrong exactly where the slide's author made a judgement —
 * "Cloud Engineer" keeps its label on the trailing side at 62% because there is room, and
 * "SDET" takes the leading side at 22% because "Full-Stack Developer" is beside it. Those
 * are placements, not derivations.
 *
 * **`demand` is a 1-based STEP into `demandLevels`, not a headcount.** The slide encodes
 * hiring demand as bubble area with no figure anywhere on it, which is exactly the shape
 * this project's chart rules refuse — a mark whose quantity is available nowhere in text.
 * An ordinal step fixes that without inventing a number ANSR has not supplied: the dot's
 * area carries the step, the step's WORD is drawn in the key, and the same word is in
 * each dot's accessible name. That is the licence the capability grid already runs on.
 *
 * Indexed rather than named so that renaming a level is one edit rather than thirty-six,
 * on `ratingScale`'s own argument. The cost is that REORDERING `demandLevels` re-rates
 * every role, which is why the diff reports that list as a change in its own right.
 */
export const roleSchema = z.object({
  id: slug,
  /** Drawn beside its own dot. 40 is what fits the label column at the plot's narrowest. */
  name: nonEmpty.max(40),
  familyId: slug,
  band: z.enum(ROLE_BANDS),
  /** Position along the one real axis. A position, never a score — see above. */
  complexity: z.number().int().min(0).max(100),
  /**
   * Position down its own band, 0 at the top. Carries no quantity whatsoever.
   *
   * Free room rather than a second axis, and the chart draws nothing from it — no
   * gridline, no label, no scale. It exists so labels do not collide, which on a field of
   * thirty-six named dots is the difference between a chart and a pile.
   */
  lane: z.number().int().min(0).max(100),
  /** Which side of the dot the name sits on. `trail` is after it, `lead` before. */
  labelSide: z.enum(["lead", "trail"]),
  demand: z.number().int().min(1),
});

/**
 * The whole role map: a demand scale, the families, and the roles.
 *
 * **ONE object rather than three sibling keys on `siteContent`, and that is the point of
 * it.** The three are meaningless apart — a role names a family and a demand step, so
 * splitting them would put referential integrity across three keys that can be edited,
 * diffed and defaulted independently. As one member it is one default, one diff entry,
 * one line in the draft provider's shape check and one thing to revert.
 *
 * **Every cross-reference is checked HERE rather than in the editor**, on the rule the
 * peer overrides are held to: the schema is the gate, so a row that could not publish
 * cannot be rendered either. What the editor adds is refusing to DELETE a family that
 * still has roles, which is the taxonomy rule — the gate can only say a reference is
 * broken, where the editor can say which four roles are using it.
 *
 * Caps: twelve families, because that is how many categorical inks exist — see
 * `ROLE_TONES`, and note that the number a reader can hold against a legend is smaller than
 * the number the code allows; 60 roles because the field is sparse
 * by construction and a label per dot is what makes it legible, and the shipped set is 36.
 * `demandLevels` is 3 to 5 for the reason `RAMP` has five steps: the area difference
 * between adjacent steps stops being visible past that, and below three an ordinal
 * scale is a boolean.
 */
export const roleMapSchema = z
  .object({
    /** Weakest FIRST, which is what `demand` indexes into and what the key draws. */
    demandLevels: z.array(nonEmpty.max(20)).min(3).max(5),
    families: z.array(roleFamilySchema).min(1).max(ROLE_TONES),
    roles: z.array(roleSchema).max(60),
  })
  .superRefine((map, ctx) => {
    const familyIds = new Set<string>();
    const tones = new Set<number>();
    map.families.forEach((family, index) => {
      if (familyIds.has(family.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["families"],
          message: `duplicate role family id "${family.id}"`,
        });
      }
      familyIds.add(family.id);
      /* Two families in one ink is a legend with two identical swatches, which is the
         one failure colour coding cannot survive — so it is refused here rather than
         left to the editor. See `roleFamilySchema.tone`. */
      if (tones.has(family.tone)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["families", index, "tone"],
          message: `colour ${family.tone} is already used by another role family`,
        });
      }
      tones.add(family.tone);
    });

    const roleIds = new Set<string>();
    map.roles.forEach((role, index) => {
      if (roleIds.has(role.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["roles", index, "id"],
          message: `duplicate role id "${role.id}"`,
        });
      }
      roleIds.add(role.id);
      if (!familyIds.has(role.familyId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["roles", index, "familyId"],
          message: `"${role.familyId}" is not one of the role families`,
        });
      }
      if (role.demand > map.demandLevels.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["roles", index, "demand"],
          message: `demand must be between 1 and ${map.demandLevels.length}`,
        });
      }
    });
  });

/**
 * The static visitor-facing strings, as data.
 *
 * **Only the ones that state no CLAIM about the dataset, which is the line every
 * entry here had to clear.** Most copy on the public screens is an argument about
 * the company data and lives beside the logic making that argument — a sentence
 * naming a count, a share or an ordering has to move when the thing it describes
 * moves, so holding it as free text would let it drift into a falsehood nothing
 * catches. Those stay in `copy.ts`, as do all the derived sentences, which are
 * functions of the visitor's answers and have no fixed wording to edit.
 *
 * What is here is headings, labels and attributions: they name what a reader is
 * looking at without asserting anything about it. Two exceptions kept in code
 * deliberately, both because the exact wording is load-bearing:
 * `FUNCTIONS_TITLE`, whose phrasing is what stops eight function tags being read
 * as a claim about the five companies above them, and `peerCountLine` and its
 * siblings, which state exact counts.
 *
 * **Every cap is a render limit measured on the real layout, not editorial
 * taste.** The two band lines especially: `HeaderFinding` sets at 48px capped at
 * the lead measure, so past roughly 36 characters it wraps — and a two-line band
 * on one view beside a one-line band on the other puts back the height jump
 * across the tab switch that the pair exists to remove.
 */
export const publicCopySchema = z.object({
  /* The entry point's form card. */
  askTitle: nonEmpty.max(48),
  askLead: nonEmpty.max(200),
  askSubmit: nonEmpty.max(32),
  /**
   * The three form field LABELS, and the three controls' placeholders and hints.
   *
   * **There were four, and `askCompanyLabel` went with the control it named.** The
   * company name asked the visitor for something no figure, no peer and no ordering
   * ever read — it personalised two strings — so the field was removed and the key
   * with it, on the rule that an editable field drawing nothing is worse than none.
   *
   * **These are the most spec-coupled strings in the repo and that is the thing to know
   * before rewording one.** The labels are how every browser spec reaches a control
   * (`choose(page, "Headquarters", …)`, `getByLabel("Industry")`), so a spec must read
   * these keys rather than typing the words — see the locator note in `project.md`.
   *
   * **`askIndustryPlaceholder` is also the industry popup's ACCESSIBLE NAME**, because
   * `select-field.tsx` passes `placeholder` straight to the tree's `aria-label`. That is
   * what makes `getByLabel("Industry")` ambiguous once the popup is open, which is a
   * documented trap — so this one key decides both the muted text in the closed trigger
   * and the name assistive technology reads for the open list.
   *
   * Caps: a label sits on one line above its control; a placeholder is truncated inside
   * the trigger but is read whole as the popup's name; a hint is 12px on one line inside
   * the panel, and 80 is what fits without wrapping at the panel's narrowest.
   */
  askIndustryLabel: nonEmpty.max(32),
  askRevenueLabel: nonEmpty.max(32),
  askHqLabel: nonEmpty.max(32),
  askIndustryPlaceholder: nonEmpty.max(48),
  askIndustryHint: nonEmpty.max(80),
  askRevenuePlaceholder: nonEmpty.max(48),
  askRevenueHint: nonEmpty.max(80),
  askHqPlaceholder: nonEmpty.max(48),
  /** The filter above 12 options, in a 40px row. Never the popup's name. */
  askFilterPlaceholder: nonEmpty.max(40),
  /**
   * The dropdowns' own TIER HEADINGS, published because they are the last visitor-facing
   * strings on the form that an admin could not touch.
   *
   * They clear the first test easily — a tier heading names a group of options and asserts
   * nothing about the dataset — and they were in code only because nobody had asked. What
   * makes them worth moving now is that the two tiers OVERLAP: the leading tier is a
   * shortcut and the second list holds everything, so the words have to be able to say
   * that. "All industries" above a list that omitted the pinned ones was a heading its own
   * contents contradicted, and the fix for the contents is not a licence to leave the
   * heading unowned.
   *
   * **`askGroupCommon` is ONE key for two controls, on `VELOCITY_HEADING`'s argument** —
   * the industry and country popups head their leading tier with the same words, and the
   * same words typed twice is a pair that eventually disagrees. The two "all" headings are
   * separate because they name different things.
   *
   * **The revenue popup's single group is here too and is a heading nobody sees**: a
   * one-group popup draws no tier heading, deliberately, because one label above one flat
   * list is a redundant heading. It stays a published key rather than a code constant so
   * the four group names are one decision in one place, and it becomes visible the moment
   * that list gains a second tier. That is the one entry here an admin can edit without
   * seeing a change, and it is the exception to the rule that killed `snapshotShareLabel`
   * — the string is not UNDRAWN, it is drawn by a popup that currently has nothing to
   * distinguish.
   *
   * Cap: a tier heading spans all columns of the panel body at 12px, so 32 fits at the
   * narrowest width the panel is drawn at.
   */
  askGroupCommon: nonEmpty.max(32),
  askGroupIndustriesAll: nonEmpty.max(32),
  askGroupCountriesAll: nonEmpty.max(32),
  askGroupRevenue: nonEmpty.max(32),
  /**
   * What the industry popup calls the second level, in three places at once.
   *
   * It is the count cue on a branching row ("31 sub-industries"), the accessible name of
   * the pane's own close control, and the label on the pane's "Other …" breaker. One key
   * for the three, because they are the same word about the same thing — and the word
   * itself is a term ANSR asked for, so it is exactly the kind of string that gets
   * reworded without a deploy.
   *
   * **Plural, because all three sites read it as one.** Cap 24 against the count cue,
   * which is drawn inside a row's trailing chip.
   */
  askSubIndustryPlural: nonEmpty.max(24),
  /**
   * The two strings a visitor only ever sees when something is WRONG, and they are
   * editable on the argument that ANSR's voice matters most at that moment.
   *
   * `askSubmitError` was typed twice in `tool.tsx`, once in `submit` and once in
   * `refine`; one key is now the single definition. **What stays in code is
   * `ASK.submitPending`**, whose length is load-bearing against the submit label's own
   * width — two editable strings whose RELATIVE widths decide whether the button
   * resizes mid-press is a coupling no cap can express.
   */
  askSubmitError: nonEmpty.max(120),
  askFieldRequired: nonEmpty.max(48),
  /**
   * The dropdown filter's empty state. A TEMPLATE, because it echoes the visitor's own
   * typed text back — `{query}` is the one placeholder whose value comes from neither
   * the dataset nor the admin.
   */
  filterEmpty: copyTemplate("filterEmpty"),
  /* The logo strip's accessible name, and the impact band's heading. */
  customersLabel: nonEmpty.max(80),
  /**
   * The impact band's heading, MINUS the brand name — the lockup is drawn, and it
   * now LEADS the line rather than closing it.
   *
   * The heading reads "[ANSR] By The Numbers", so this field holds only "By The
   * Numbers". It used to hold "Impact delivered by" with the mark as the sentence's
   * last word; ANSR asked for the shorter title, in which the brand comes first, so
   * the component draws the mark then this string. The accessible name is still one
   * phrase, assembled the same way round.
   *
   * The 40-character cap is unchanged and is still the same measurement: the heading
   * is words plus a 2.78:1 lockup on ONE line at 320px, and what a longer phrase
   * costs is the mark dropping to a line of its own with its rays reaching into the
   * first.
   */
  impactTitleLead: nonEmpty.max(40),
  /* The result band, shared by both screens. Capped to hold one line. */
  headerPeers: nonEmpty.max(40),
  headerFunctions: nonEmpty.max(40),
  /* The view switch. Two equal halves, so neither may wrap. */
  viewPeers: nonEmpty.max(24),
  viewFunctions: nonEmpty.max(24),
  /**
   * The four answer pills on both result screens' context band, and the accessible
   * name of the function view's tab panel.
   *
   * **One set of keys for two screens, which is the point.** The labels were two
   * separate literal arrays, `peer-view.tsx` and `function-view.tsx`, so rewording a
   * pill meant editing two files by hand and the two screens' rows could disagree —
   * `project.md` requires they read identically. `pillRevenueBand` carries the currency
   * because the pill has no hint to put it in; the FORM's own label for the same input is
   * `askRevenueLabel` and the two are deliberately different strings.
   *
   * **THREE pills now, not four, and `pillCompany` was deleted rather than left
   * unread.** The form no longer asks for a company name, so the pill it labelled can
   * never render — and a key an admin can edit that draws nothing is the one thing this
   * object is not allowed to hold. `ContextPanels` divides three cells as evenly as
   * four, which is why nothing else moved.
   *
   * **`pillSubIndustry` IS A FOURTH KEY AND IT IS NOT `pillCompany` RETURNING.** It
   * labels a CONDITIONAL pill — the visitor answered a sub-industry or they did not —
   * which is the shape the company pill had, and the two are still different cases. A
   * company name was read by nothing: no figure, no peer, no ordering. A sub-industry is
   * the PRIMARY ordering signal in `similarity.ts`, so it is the answer that most changes
   * what the screen shows, and the row echoed everything except it. So the key draws on
   * the industry's own argument rather than on the company's, and the `24` cap is the
   * pills' shared one: "Sub-industry" is the product's word for it everywhere a visitor
   * or an admin can read it, `businessTypeId` notwithstanding.
   */
  pillIndustry: nonEmpty.max(24),
  pillSubIndustry: nonEmpty.max(24),
  pillHeadquarters: nonEmpty.max(24),
  pillRevenueBand: nonEmpty.max(24),
  /** Never drawn. The `<section>` would not be a `region` without it. */
  functionPanelLabel: nonEmpty.max(60),
  /**
   * The result band's own controls and landmark names.
   *
   * **`editAnswers` names a DISCLOSURE, not a navigation** — it opens the answer editor
   * in place. Avoid "profile", which implies a stored account this tool does not have.
   * `homeTitle` is the lockup-as-button's `title`: the destination goes there rather than
   * in an `aria-label`, which name-from-content would read into the `h1` itself.
   * `pillGroupLabel` and `viewSwitchLabel` are landmark names, never drawn.
   */
  editAnswers: nonEmpty.max(24),
  pillGroupLabel: nonEmpty.max(60),
  viewSwitchLabel: nonEmpty.max(40),
  homeTitle: nonEmpty.max(40),
  /**
   * The answer editor — one component with one job, and its whole vocabulary.
   *
   * `editorSubmit` is what `InputPanel`'s `submitLabel` carries, and it is the ONE string
   * that differs between the entry point's form and this panel; that prop exists so the
   * two can differ without a second copy of the form.
   */
  editorTitle: nonEmpty.max(32),
  editorLead: nonEmpty.max(120),
  editorClose: nonEmpty.max(16),
  editorSubmit: nonEmpty.max(32),
  /**
   * The capability grid's leading `columnheader`, which is `sr-only`.
   *
   * **Read aloud and never seen, which is why it is here rather than left in code**: the
   * other column names are the metric's own admin-editable strings, so this was the one
   * name in that table an admin could not reach. It is on the grid `metric-card.tsx`
   * routes a rated matrix to, which today is the technology capability comparison.
   */
  gridRowHeader: nonEmpty.max(24),
  /**
   * Peer landscape section headings.
   *
   * **`peersTitle` IS A FLAT FIELD AGAIN, because the branch that made it a template is
   * gone.** It was a template carrying `{company}` beside a `peersTitleFallback` for the
   * visitor who typed no name — two keys for one heading, and the whole reason they were
   * two is that the company name was optional. The form no longer asks for it, so there
   * is one branch, one key, and no slot: `peersTitleFallback` is deleted rather than left
   * as an unreachable second wording.
   *
   * **The snapshot's opening label is still NOT here**, and its reasoning is unchanged
   * rather than superseded: it is composed over the visitor's SCOPE, so its two branches
   * differ by which noun the sentence uses ("your industry" / "your sub-industry"), not
   * by a value dropped into one slot. A template cannot express that and inventing a
   * second slot to fake it would put the choice of noun in an admin's hands.
   */
  industryTitle: nonEmpty.max(40),
  /**
   * What the containment chart's three counts are counted over, under the chart.
   *
   * **It shipped in code for one pass and is editable at the project owner's decision**,
   * which reverses the argument that put it there: the sentence is the only thing keeping
   * three exact counts — one of them the national total — from reading as a census, so a
   * softening would remove a qualification rather than reword a label, and no schema
   * check can see the difference. Overruled on the ground that a basis line is exactly
   * the kind of string ANSR's own voice should own, and it is not `nonEmpty` for nothing:
   * `nonEmpty` is the guard that survives, so the note can be REWORDED and cannot be
   * emptied.
   *
   * The wording rule it is held to, which lives with the reasoning in
   * `screen1/copy.ts`: name the SCOPE, never the uncertainty. "Indicative counts, drawn
   * from the GCCs ANSR tracks" and never "figures are approximate" — this surface does
   * not narrate its own integrity.
   *
   * **120, measured.** The shipped 85 characters set two lines at 12px in the
   * two-fifths card the chart sits in, ~379px at 1440 and ~287 on a phone; 120 is a
   * third line, past which the qualification outweighs the three figures it qualifies.
   */
  industryBasisNote: nonEmpty.max(120),
  snapshotHeading: copyTemplate("snapshotHeading"),
  /**
   * The peer grid's own heading. **80 is the cap the template's FILLED length carried**,
   * so an admin has exactly the room they had before, measured on the same `weight="lead"`
   * line.
   */
  peersTitle: nonEmpty.max(80),
  /**
   * The line ABOVE the peer grid when the set is short because the visitor named a
   * SUB-INDUSTRY, not because their industry is thin in India.
   *
   * **It sits above the cards, under the heading, at ANSR's request, and the wording had
   * to change with the position.** It closed on "the closest comparisons above" while it
   * was drawn under the grid; read first, it has to point FORWARD at the cards instead.
   * That is the whole reason a move is a copy edit here rather than a JSX one.
   *
   * **The one branch of `shortfallLine` that is editable, and it qualifies on the
   * template rule rather than in spite of the code rule.** A sentence that states a
   * count has to move when the count moves, which is why the other three branches stay
   * derived — the thin-industry one names both the count and the limit, and the two
   * empty-set ones name the population. This branch states no quantity at all. It names
   * the SCOPE that produced a short list, and `peerCountLine` states the exact figure
   * under the grid as "Showing 3 of 314". Two statements of the same number, one of them
   * wrong the moment the engine changes, is what that rule exists to prevent — so
   * removing the count from here is what makes it editable, and it reads better for the
   * same reason. **The move above the cards does not weaken that**: the count is still
   * stated exactly once on the screen, and this line is now read before it rather than
   * after.
   *
   * **It is also where an em dash was still shipping.** The sentence was "{industry} is
   * not short of companies in India — but only 3 are close enough to your sub-industry
   * to be worth naming", which broke the ban twice over: the dash, and "worth naming",
   * which is the tool narrating its own restraint in front of a reader who had not
   * asked. Keep it a statement about the market and the visitor's own scope.
   *
   * `{industry}` is required, because without it the sentence claims something about
   * India at large rather than about the industry a reader has just been shown.
   *
   * **160 filled, measured, and the cap matters more above the grid than it did below
   * it.** It sets at 14px inside `max-w-measure`, so 160 is two lines at 1440 and three
   * on a phone — and every one of those lines now stands between the heading and the
   * first card, which is the evidence the section exists to show.
   */
  peersNarrowNote: copyTemplate("peersNarrowNote"),
  /**
   * The line ABOVE the peer grid when the set is FULL but had to reach past the
   * visitor's own answers to fill itself — a different line of business, a different
   * size, or both. It is `peersNarrowNote`'s opposite number: the short note explains
   * a set of three, this explains a set of five that could not be filled from the
   * visitor's exact criteria, so the remaining slots went to the closest comparable
   * companies a little further out.
   *
   * **Editable, and a PLAIN string — no slots at all.** It names neither axis nor
   * industry, on purpose. It once carried an `{axis}` slot to say which of sub-industry
   * or revenue band the set reached past, but a full set can widen on both at once and
   * naming them piled up; and it named `{industry}`, which "the wider industry" says
   * generically without the possessive-heavy interpolation the other templates need. So
   * it is a fixed sentence: true whichever axis widened, scoped to the visitor's own
   * industry without naming it, and unable to claim a reach that did not happen because
   * it claims none. `broadenedLine` still fires only when a set actually broadened, on
   * either signal, and `shortfallLine` still wins the tie — the line's TRIGGER is
   * derived, only its wording is editable. No count — `peerCountLine` under the grid
   * owns the numbers — and no em dash.
   */
  peersBroadenedNote: nonEmpty.max(150),
  largestTitle: copyTemplate("largestTitle"),
  mapTitle: copyTemplate("mapTitle"),
  /**
   * The city map's disclosure. Two pairs: the scope word in the panel header, and the
   * button that switches it. Both members of each pair are drawn in the same place, so
   * they are capped together.
   */
  cityScopeAll: nonEmpty.max(24),
  cityScopeTop: nonEmpty.max(24),
  /**
   * The count column's name, opposite the scope word.
   *
   * **It is here because the ranked list carries no other statement of what the trailing
   * figure IS**, and this page carries companies, centres and people. Capped with the
   * scope word it shares a line with.
   */
  cityCountHeader: nonEmpty.max(24),
  cityToggleToTop: nonEmpty.max(40),
  cityToggleToAll: nonEmpty.max(40),
  /* The peer card's three small-caps labels. */
  peerHeadcountLabel: nonEmpty.max(24),
  peerCitiesLabel: nonEmpty.max(24),
  peerSinceLabel: nonEmpty.max(24),
  /**
   * The snapshot's cell labels — THREE of the four, not all of them.
   *
   * The opening cell's label is deliberately absent, and its absence is the rule
   * this whole object is held to: a field an admin can fill that nothing draws is
   * worse than no field at all. That label is COMPOSED over the visitor's own scope
   * — "GCCs in your industry" or "GCCs in your sub-industry" — so a flat string
   * could hold only one of its two branches, and an admin editing it would change
   * neither. It stays in `copy.ts` with the other derived wording.
   *
   * **The cap is 56, up from 32, because the labels are SENTENCE PREDICATES now.**
   * ANSR reworded all four from noun phrases naming the metric ("Typical GCC
   * headcount") to clauses completing the figure above them ("average employees in
   * each GCC"), which is the shape the terminating scale strip has always used — and
   * those three caps are 120 and 140 for the same reason. 56 is what fits three lines
   * of a `lg:grid-cols-4` cell at 14px, which is where a fourth line starts pushing
   * one cell's label visibly deeper than its neighbours'.
   */
  snapshotHeadcountLabel: nonEmpty.max(56),
  snapshotCitiesLabel: nonEmpty.max(56),
  snapshotLeadingCityLabel: nonEmpty.max(56),
  /**
   * What a snapshot cell draws instead of a figure it does not have.
   *
   * **Never a dash, a zero or an estimate** — that is the rule this string exists to
   * satisfy, and the cap is the fixed-height figure box it sits in, which would clip a
   * second line rather than grow.
   */
  figureUnavailable: nonEmpty.max(24),
  /**
   * The role map's heading, and it is a KEY where `FUNCTIONS_TITLE` beside it is not.
   *
   * **The difference is what carries the scope claim.** The functions block's wording is
   * the ONLY thing stopping eight tags being read as a breakdown of the five companies
   * above them, so that string stays in code where it cannot be reworded into a
   * falsehood. This block draws a basis note under the chart — `rolesBasisNote`, which
   * `nonEmpty` guarantees cannot be emptied — so the scope is stated by a sentence
   * whose job that is, and the heading is then the same category as `industryTitle`,
   * `mapTitle` and `scaleTitle`: a name for what a reader is looking at.
   *
   * It still may not tie the roles to the peer grid, and a unit test pins that on the
   * shipped value rather than on the schema: no possessive, and India named.
   */
  rolesTitle: nonEmpty.max(56),
  /**
   * The two band labels, which are the drawn form of the `ROLE_BANDS` enum.
   *
   * The slide says EMERGING and TRADITIONAL. "Established" ships instead, because
   * "traditional" reads as a judgement about the work — a QA engineer's role is not
   * old-fashioned — where the axis it labels is about how long the role has existed as a
   * GCC hire. Editable precisely so ANSR can put the slide's own word back without a
   * deploy, and the enum underneath does not move when they do.
   *
   * Capped short: each sits in a small-caps label above its own band, on one line.
   */
  rolesBandEmerging: nonEmpty.max(24),
  rolesBandEstablished: nonEmpty.max(24),
  /**
   * The complexity axis: its name and its two ends, and there is deliberately nothing
   * else.
   *
   * **No numeral is drawn on this axis at any width, and these three strings are the
   * whole of what states it.** `role.complexity` is a position an admin sets rather than
   * a measured score, so a tick or a value would be the chart claiming a precision the
   * data does not have — the source slide carries exactly these three labels for exactly
   * this reason. The two ends bracket the rail, trailing one end-aligned, which is the
   * shape `RangeBenchmark` holds its own end labels in.
   *
   * Below `md` there is no rail to bracket, so the same three keys are composed into one
   * line instead. One vocabulary, two drawings.
   */
  rolesAxisLabel: nonEmpty.max(32),
  rolesAxisLow: nonEmpty.max(24),
  rolesAxisHigh: nonEmpty.max(24),
  /**
   * What the bubble sizes mean, as one DRAWN line.
   *
   * **It was an `sr-only` framing for a four-ring key, and the key is gone at the project
   * owner's instruction** — so this string is now the whole visible statement of the size
   * encoding. **The renderer used to append the two ends of `roleMap.demandLevels` to it
   * and no longer does, also at the project owner's request**, so the line is exactly what
   * is typed here. The STEPS stay data because how many there are and what they are called
   * is the scale ANSR supplies; this names what the scale measures, and must not name a
   * step itself.
   *
   * 48 characters, because it sits under the family legend against the trailing edge and
   * has to stay on one line at the plot's narrowest.
   */
  rolesDemandKey: nonEmpty.max(48),
  /**
   * What the role map was measured over, under the chart. `industryBasisNote`'s twin.
   *
   * **This is the one string on the block that keeps it honest, and it is the reason the
   * heading above is allowed to be editable.** Every other section on this surface is
   * drawn from the 1,834 companies; this one is not drawn from them at all. A reader who
   * has just met five named peers, an industry count and a city map has no way to know
   * that the block under them changes to a different source, so the block says so.
   *
   * **It names the SCOPE and never the uncertainty**, which is `industryBasisNote`'s own
   * rule: the tool does not narrate its own integrity, so "drawn from ANSR's hiring
   * research" and never "these positions are approximate". `nonEmpty` is the guarantee
   * that matters — it can be reworded and cannot be emptied.
   */
  rolesBasisNote: nonEmpty.max(140),
  /* The terminating scale strip. Each label is a whole sentence's predicate. */
  scaleTitle: nonEmpty.max(60),
  scaleFortuneLabel: nonEmpty.max(120),
  scaleForbesLabel: nonEmpty.max(120),
  scalePeopleLabel: nonEmpty.max(140),
  /* Function metrics. One figure-row eyebrow per tab. */
  figuresTech: nonEmpty.max(40),
  figuresOperations: nonEmpty.max(40),
  figuresHr: nonEmpty.max(40),
  figuresFinance: nonEmpty.max(40),
  /* The composed tabs' section headings. `velocity` is shared by HR and operations. */
  velocityHeading: nonEmpty.max(40),
  hrAnalysisHeading: nonEmpty.max(40),
  opsSupportingHeading: nonEmpty.max(40),
  /* The attribution under the function view's card. */
  sourceLine: nonEmpty.max(60),
  /**
   * The close band's accessible name.
   *
   * **The band has no `h2`, so without this it is a `<section>` with no name and
   * therefore not a `region`.** It is editable alongside the two strings the band draws,
   * which are `siteContent.close` fields — this one is here because it is a landmark
   * name rather than an offer, the same category as `functionPanelLabel`.
   */
  closeLabel: nonEmpty.max(60),
  /**
   * How to read an index card, wrapping the metric's OWN `indexBaseline`.
   *
   * A template on `{baseline}`, and the lowest-stakes one here: the value in the slot is
   * already admin-editable data, so this key only owns the words around it.
   */
  indexedNote: copyTemplate("indexedNote"),
});

export const siteContentSchema = z.object({
  hero: heroCopySchema,
  /**
   * Capped at six. The band is one centred row on desktop, and a seventh figure
   * either wraps to a second row of one or shrinks all of them below the size
   * that makes a figure read as a figure. Five is what ANSR supplied.
   */
  impactStats: z.array(impactStatSchema).max(6),
  /**
   * **Defaulted rather than required, and that is a compatibility decision with a
   * precedent.** `metrics` was defaulted to `[]` for exactly this reason: the fs store
   * refuses an unrecognised `version`, so requiring a new key would turn a compatible
   * addition into a broken read of every dataset written before it existed — including
   * the one committed in `data/`. With a default, an older file reads and publishes
   * forward.
   */
  close: closeCopySchema.default(() => DEFAULT_CLOSE_COPY),
  /**
   * The functions block on the peer view.
   *
   * **A plain list of labels that claims nothing, which is why it can be data at
   * all.** There is no per-company function record in this dataset and there will
   * not be one, so the block draws no numeral, no bar and no order — the tags are a
   * statement about India GCCs in general, made by the section heading above them.
   * That heading stays in code for exactly that reason; these do not have to.
   *
   * Capped at 12 and each item at 32 characters, because the set wraps as one row of
   * tags with no column count: an item much longer than the rest is the one that
   * decides the layout. The shipped eight sit inside a 16-to-28 character range.
   */
  commonFunctions: z.array(nonEmpty.max(32)).min(1).max(12).default(() => [
    ...DEFAULT_COMMON_FUNCTIONS,
  ]),
  /**
   * The role map on the peer view, directly under the function tags.
   *
   * **Here rather than in code for the same reason `commonFunctions` is, and it clears
   * the same test.** The block states no count, no share and no ordering of the
   * companies above it — it is a picture of the India hiring market, so nothing in it can
   * drift into a falsehood about the dataset. What it does claim is stated by
   * `copy.rolesBasisNote`, which cannot be emptied.
   *
   * **It is the section on this surface an admin will most want to edit**, which is the
   * positive reason as opposed to the permissive one: roles are the fastest-moving thing
   * in this market. "Agentic Engineer" did not exist as a GCC hire two years ago, and a
   * chart that needs a developer to add the next one is a chart that goes stale in
   * public.
   *
   * Defaulted on the precedent every other addition here runs on — a required key turns a
   * compatible addition into a broken read of every dataset written before it, including
   * the one committed in `data/`.
   */
  roleMap: roleMapSchema.default(() => structuredClone(DEFAULT_ROLE_MAP)),
  /**
   * The customer strip. Defaulted, and capped at twenty-four.
   *
   * **The cap is a curation limit rather than a layout one and it moved because the
   * SERVED set moved.** The strip scrolls, so a longer list costs no height and
   * breaks nothing; what a long list costs is the band's meaning, which is a chosen
   * set of proof rather than every mark anybody could find. Twelve was the ceiling
   * while ten files existed. Twenty-two are served now, so twelve would put the
   * shipped default itself over the cap — the schema would refuse the dataset it
   * defaults to, which is a check that has stopped describing anything.
   *
   * Twenty-four is the served count plus the room to commit two more adaptations
   * without a schema edit, and `MAX_LOGOS` in `site-content-manager.tsx` mirrors it
   * so the Add button disables with a reason instead of the publish failing on a
   * list somebody spent ten minutes filling.
   */
  logos: z.array(customerLogoSchema).max(24).default(() => [...DEFAULT_LOGOS]),
  /**
   * **Every key is MERGED over the shipped block, so adding a string is a compatible
   * change rather than a broken read.** This is the same compatibility rule `metrics`
   * and `close` are defaulted for, but it has to work one level deeper: defaulting the
   * whole object only helps a dataset with no `copy` at all, and every dataset written
   * before a new KEY has a `copy` that is present and now short by one. Without the
   * merge, adding a string here refuses the committed dataset and production's alike.
   *
   * **A merge rather than a `.default()` on each field, because the shipped value must
   * live in exactly one place.** Per-field defaults would restate all fifty-seven
   * strings beside `DEFAULT_PUBLIC_COPY`, which is the drift `public-copy.test.ts`
   * exists to prevent. It also means no FUTURE key needs a default of its own.
   *
   * A stored value that is not an object is passed through untouched, so it fails on
   * the schema's own message rather than being silently replaced by the defaults.
   */
  copy: z
    .preprocess(
      (value) =>
        value && typeof value === "object" && !Array.isArray(value)
          ? { ...DEFAULT_PUBLIC_COPY, ...value }
          : value,
      publicCopySchema,
    )
    .default(() => DEFAULT_PUBLIC_COPY),
});

/**
 * Held separately from `DEFAULT_SITE_CONTENT` so the schema's own `.default()` can name it
 * without forward-referencing the larger object it is a member of.
 */
export const DEFAULT_CLOSE_COPY: CloseCopy = {
  /**
   * **The offer is now the visitor's OWN profile rather than the rest of the dataset,
   * at ANSR's request, and that changes what the band is asking.** It read "Access the
   * complete dataset, deeper benchmarks and detailed cost structures behind your
   * results" — an offer of more rows, which is a weak ask after a page that has just
   * shown a visitor five named peers and thirty national figures. "The hyper-custom GCC
   * profile built for your company" is an offer of work done ON their answers, which is
   * the thing the free layer genuinely cannot supply.
   *
   * It does not become a claim about the dataset and so does not move out of data: the
   * band still collects nothing and still states no count, a share or an ordering.
   */
  /**
   * **No em dash, at ANSR's request, and a colon rather than a comma.** The clause after
   * the break is a list of what the profile contains, so it is an expansion of the thing
   * named before it — which is what a colon says. A comma could not: the list already
   * holds two of its own ("deeper benchmarks, cost structures, and more"), so a third
   * comma at the join would read as a fourth item rather than as the break.
   */
  body:
    "Access the hyper-custom GCC profile built for your company: " +
    "deeper benchmarks, cost structures, and more.",
  ctaLabel: "See the full report",
  /**
   * **Both links ship BLANK, and blank is a real answer rather than an unfinished
   * field.** The shipped default has to reproduce today's behaviour exactly, and today's
   * behaviour is `NEXT_PUBLIC_GCC_CTA_URL` with ansr.com behind it — so seeding a URL here
   * would silently take the deployment's configured link out of the path on the next
   * publish. Empty means "whatever is configured", which is what a dataset that has never
   * been told about UTM tagging should say.
   *
   * It also keeps the default free of a guessed deep path, on the same argument as the
   * fallback in `page.tsx`: a plausible-looking URL that 404s is worse than a general one
   * that works.
   */
  ctaHrefPeers: "",
  ctaHrefFunctions: "",
};

/**
 * The eight functions, in the order ANSR supplied. Order carries no claim — the
 * block states none — so it is the order they are read in and nothing more.
 */
export const DEFAULT_COMMON_FUNCTIONS: readonly string[] = [
  "Technology & engineering",
  "Data & analytics",
  "Finance & accounting",
  "Shared services & operations",
  "Human resources",
  "Customer & partner support",
  "Procurement & supply chain",
  "Legal, risk & compliance",
];

/**
 * The shipped role map: four demand steps, seven families, thirty-six roles.
 *
 * **Every number here was read off the supplied slide and nothing was interpolated.**
 * `complexity` is the dot's own horizontal position on that slide, rescaled to the plot's
 * 0–100 — so two roles the slide draws at the same x share a value, which is correct
 * rather than a collision to break. `demand` is the slide's bubble RADIUS bucketed into
 * the four steps its sizes actually separate into: one role is alone at the top
 * ("Software Engineer", visibly twice the next), six sit in the next band, and the rest
 * split between two. Nothing was averaged, ranked or smoothed, because the slide is the
 * source and a derived number would be a figure ANSR never supplied.
 *
 * **The `band` split follows the slide's own two fields, including at the boundary.**
 * "Data Annotator" and "Systems Engineer" have labels in the upper field and dots in the
 * lower one; the DOT is what the chart positions, so both are `established`.
 *
 * Order within `roles` is by band and then by complexity, which is the order the chart
 * draws and the order the phone reflow reads. It carries no claim of its own — the chart
 * groups by family and positions by complexity, so this is a reading convenience and an
 * admin may append anywhere.
 */
export const DEFAULT_ROLE_MAP: RoleMap = {
  /**
   * Four steps, weakest first. Plain ordinal words rather than a scale with a unit,
   * because there is no unit: the slide states "bubble size = hiring demand" and no
   * quantity anywhere, so these are the most a reader can honestly be told.
   */
  demandLevels: ["Low", "Moderate", "High", "Very high"],
  /**
   * The slide's seven colour keys, in its own legend order and in its own hues.
   *
   * **Each `tone` is the slide's colour for that family**, mapped onto the nearest
   * `--ansr-role-*` ink — so the reconstruction keys red to AI / ML, teal to data, blue to
   * cloud, slate to security, gold to application development, green to quality and
   * purple to product, exactly as supplied. What moved is the saturation and lightness of
   * each: the slide's gold and its light blue both measured under the 3:1 mark floor, so
   * every hue was darkened until it cleared. See the token block for the ratios.
   *
   * `&` is kept in "Data Engineering & Analytics" and "Cloud & Platform" because the
   * slide uses it and the strings are labels rather than prose; the search matcher folds
   * `&` to "and" anyway, so an admin typing either finds the row.
   */
  families: [
    { id: "ai-ml", name: "AI / ML", tone: 1 },
    { id: "data-analytics", name: "Data Engineering & Analytics", tone: 2 },
    { id: "cloud-platform", name: "Cloud & Platform", tone: 3 },
    { id: "cybersecurity", name: "Cybersecurity", tone: 4 },
    { id: "application-development", name: "Application Development", tone: 5 },
    { id: "quality-engineering", name: "Quality Engineering", tone: 6 },
    { id: "product-design", name: "Product & Design", tone: 7 },
  ],
  /**
   * **EVERY `complexity`, `lane` AND `demand` HERE IS THE MACHINE-MEASURED VALUE OFF
   * `Slide4.jpg`, WITH NO HAND CORRECTION LEFT IN THE TABLE.** All thirty-six discs are
   * recovered by scanning coloured blobs: `complexity` is the disc's own centroid x as a
   * percentage of the field's scanned width (x 59..1219), `lane` its centroid y as a
   * percentage of the scanned height (y 81..556, which is the WHOLE canvas and not one
   * band), `labelSide` is which side of it the author put the name on, and `demand` is its
   * AREA-derived diameter's class. Nothing is averaged, ranked, smoothed or derived,
   * because the slide is the source and a computed number would be a figure ANSR never
   * supplied.
   *
   * **`demand` IS THE OPTIMAL FOUR-CLASS PARTITION OF THE MEASURED DIAMETERS, not a
   * bucketing by eye — and the four classes it returns are the four this table has always
   * held.** Exhaustive contiguous partition minimising within-class variance puts twenty
   * discs at 18.3–23.3px, nine at 25.2–28.6, six at 30.7–35.6 and "Software Engineer"
   * alone at 47.1. Every one of the thirty-six lands on the step stored here, so the
   * assignments are confirmed rather than changed. What WAS wrong is the ramp the steps
   * draw at: it took rounded cluster figures rather than the class MEANS, so every disc
   * drew 1 to 3 percent small. See the `[data-role-step]` block in globals.css.
   *
   * **THE POSITIONS ARE THE MEASUREMENT'S OWN EXCEPT WHERE A LABEL WILL NOT LET THEM BE,
   * AND FIVE OF THEM WILL NOT.** Measured against the render at 1440, every disc already
   * sat within a mean of 3.2px of where the slide draws it on a 1070 by 440 field, so the
   * placement was never the thing that was wrong. Two values were a unit off and are
   * corrected — `security-engineer` 36→35 and `full-stack-developer` 25→26. Five are
   * DELIBERATELY off the slide, and each one was tried at its measured value and reverted
   * because `rolemap:check` named the collision it caused: `ai-ml-engineer` stays at 15
   * rather than 13, where its label runs into "Agentic Engineer"'s disc by 5px;
   * `full-stack-developer` stays at 91 rather than 90, where it meets "Application
   * Developer"'s disc; `backend-engineer` 92 and `frontend-engineer` 96 stay two lanes
   * further apart than the slide's 93 and 95, where their two labels overlap by 28px; and
   * `data-architect` is the fifth, named on its own row below. The cause is one thing in all
   * five: Moderat sets these names wider relative to the plot than the slide's face does, so
   * a label needs vertical room the source did not have to give it.
   *
   * **The three discs on the SEAM need no nudge at all, and the one-canvas rewrite is what
   * bought that** — "Systems Engineer" at 51, "Data Annotator" at 52 and "Integration
   * Engineer" at 48 are the slide's own, each drawing part in one wash and part in the
   * other exactly as the source does, where two separately positioned boxes could only clip
   * a straddling disc to one of them.
   *
   * **SO A CHANGE HERE IS VERIFIED WITH `npm run rolemap:check` AND NEVER BY READING THE
   * NUMBERS.** A value that matches the source is not a value that fits, and the four above
   * are what that looks like.
   *
   * Listed by band and then by `lane`, so reading this table top to bottom is reading the
   * field top to bottom. The order carries no claim — the chart positions every dot
   * absolutely — so an admin may append anywhere.
   */
  roles: [
    /* Emerging, down the band. */
    { id: "genai-developer", name: "GenAI Developer", familyId: "ai-ml", band: "emerging", complexity: 83, lane: 5, labelSide: "trail", demand: 2 },
    { id: "agentic-engineer", name: "Agentic Engineer", familyId: "ai-ml", band: "emerging", complexity: 86, lane: 10, labelSide: "trail", demand: 2 },
    { id: "ai-ml-engineer", name: "AI / ML Engineer", familyId: "ai-ml", band: "emerging", complexity: 80, lane: 15, labelSide: "trail", demand: 3 },
    { id: "cloud-engineer", name: "Cloud Engineer", familyId: "cloud-platform", band: "emerging", complexity: 62, lane: 19, labelSide: "trail", demand: 3 },
    /**
     * **The longest name in the set, at 86% of the axis, and it is the one label the plot's
     * trailing bound WRAPS.** The slide wraps it in exactly this spot too, onto "Forward
     * Deployed / Engineer (FDE)", so the two lines are the source's own reading rather than
     * a fit correction — which is why the side and the lane are both the slide's.
     * Every attempt to place it on the leading side instead collided with the four roles
     * sharing its column; the bound in `.gcc-role-map__item` is what makes the wrap general.
     */
    { id: "forward-deployed-engineer", name: "Forward Deployed Engineer", familyId: "ai-ml", band: "emerging", complexity: 86, lane: 20, labelSide: "trail", demand: 1 },
    /**
     * **THE FIFTH DELIBERATE LANE, AND THE ONLY ONE MOVED FOR ASSOCIATION RATHER THAN FOR
     * COLLISION — 20 on the slide, 22 here.** It shares its lane with "Forward Deployed
     * Engineer" and sits under "AI / ML Engineer", so its own trail label ran to within
     * 1.4px of that disc while its own is `--gcc-role-gap` away: the nearest dot to the name
     * was not the name's dot, which is how a label comes to read as belonging to the wrong
     * mark. Nothing collided, so the collision check passed it. Two lanes is ~9px and clears
     * the last of the thirty-six; `lead` clears it too and was rejected, its label then
     * running head-on at "Cloud Engineer"'s, which shares the line at lane 19.
     */
    { id: "data-architect", name: "Data Architect", familyId: "data-analytics", band: "emerging", complexity: 74, lane: 22, labelSide: "trail", demand: 1 },
    { id: "platform-engineer", name: "Platform Engineer", familyId: "cloud-platform", band: "emerging", complexity: 83, lane: 27, labelSide: "trail", demand: 1 },
    { id: "data-engineer", name: "Data Engineer", familyId: "data-analytics", band: "emerging", complexity: 60, lane: 29, labelSide: "trail", demand: 2 },
    { id: "data-scientist", name: "Data Scientist", familyId: "ai-ml", band: "emerging", complexity: 77, lane: 32, labelSide: "trail", demand: 3 },
    { id: "cybersecurity-architect", name: "Cybersecurity Architect", familyId: "cybersecurity", band: "emerging", complexity: 47, lane: 34, labelSide: "trail", demand: 2 },
    { id: "security-engineer", name: "Security Engineer", familyId: "cybersecurity", band: "emerging", complexity: 31, lane: 35, labelSide: "trail", demand: 1 },
    { id: "infrastructure-engineer", name: "Infrastructure Engineer", familyId: "cloud-platform", band: "emerging", complexity: 63, lane: 37, labelSide: "trail", demand: 1 },
    { id: "site-reliability-engineer", name: "Site Reliability Engineer", familyId: "cloud-platform", band: "emerging", complexity: 44, lane: 42, labelSide: "trail", demand: 3 },
    { id: "cloud-security-analyst", name: "Cloud Security Analyst", familyId: "cybersecurity", band: "emerging", complexity: 28, lane: 43, labelSide: "trail", demand: 1 },
    { id: "systems-architect", name: "Systems Architect", familyId: "cloud-platform", band: "emerging", complexity: 79, lane: 45, labelSide: "lead", demand: 2 },
    { id: "solution-architect", name: "Solution Architect", familyId: "application-development", band: "emerging", complexity: 92, lane: 46, labelSide: "lead", demand: 2 },
    { id: "integration-engineer", name: "Integration Engineer", familyId: "cloud-platform", band: "emerging", complexity: 42, lane: 48, labelSide: "trail", demand: 1 },
    /* Established, down the band. */
    { id: "systems-engineer", name: "Systems Engineer", familyId: "cloud-platform", band: "established", complexity: 76, lane: 51, labelSide: "trail", demand: 1 },
    { id: "data-annotator", name: "Data Annotator", familyId: "data-analytics", band: "established", complexity: 66, lane: 52, labelSide: "lead", demand: 1 },
    { id: "devops-engineer", name: "DevOps Engineer", familyId: "cloud-platform", band: "established", complexity: 53, lane: 61, labelSide: "trail", demand: 1 },
    { id: "software-engineer", name: "Software Engineer", familyId: "application-development", band: "established", complexity: 70, lane: 62, labelSide: "trail", demand: 4 },
    { id: "iam-engineer", name: "IAM Engineer", familyId: "cybersecurity", band: "established", complexity: 12, lane: 66, labelSide: "trail", demand: 1 },
    { id: "bi-analyst", name: "BI Analyst", familyId: "data-analytics", band: "established", complexity: 36, lane: 67, labelSide: "trail", demand: 1 },
    { id: "product-designer", name: "Product Designer", familyId: "product-design", band: "established", complexity: 53, lane: 69, labelSide: "trail", demand: 1 },
    { id: "product-manager", name: "Product Manager", familyId: "product-design", band: "established", complexity: 74, lane: 72, labelSide: "lead", demand: 2 },
    { id: "servicenow-developer", name: "ServiceNow Developer", familyId: "application-development", band: "established", complexity: 15, lane: 72, labelSide: "trail", demand: 1 },
    { id: "scrum-master", name: "Scrum Master / Agile", familyId: "product-design", band: "established", complexity: 42, lane: 76, labelSide: "trail", demand: 1 },
    { id: "sdet", name: "SDET", familyId: "quality-engineering", band: "established", complexity: 23, lane: 77, labelSide: "lead", demand: 1 },
    { id: "business-analyst", name: "Business Analyst", familyId: "product-design", band: "established", complexity: 29, lane: 79, labelSide: "trail", demand: 1 },
    { id: "salesforce-engineer", name: "Salesforce Engineer", familyId: "application-development", band: "established", complexity: 64, lane: 81, labelSide: "lead", demand: 1 },
    { id: "data-analyst", name: "Data Analyst", familyId: "data-analytics", band: "established", complexity: 20, lane: 83, labelSide: "trail", demand: 3 },
    { id: "application-developer", name: "Application Developer", familyId: "application-development", band: "established", complexity: 32, lane: 86, labelSide: "trail", demand: 2 },
    { id: "full-stack-developer", name: "Full-Stack Developer", familyId: "application-development", band: "established", complexity: 26, lane: 91, labelSide: "trail", demand: 2 },
    { id: "qa-test-engineer", name: "QA / Test Engineer", familyId: "quality-engineering", band: "established", complexity: 10, lane: 92, labelSide: "trail", demand: 3 },
    { id: "backend-engineer", name: "Backend Engineer", familyId: "application-development", band: "established", complexity: 60, lane: 92, labelSide: "lead", demand: 1 },
    { id: "frontend-engineer", name: "Frontend Engineer", familyId: "application-development", band: "established", complexity: 41, lane: 96, labelSide: "trail", demand: 1 },
  ],
};

/**
 * The twenty-two marks, with the ink bounds each was measured at.
 *
 * **Every one of these is produced by `npm run logo:crop`, and a hand-typed pair is a
 * layout shift waiting to happen.** The dimensions are the RATIO an `<img>` reserves
 * before the file arrives, so a wrong one moves the band directly under the form. An
 * earlier Walmart export arrived with a `viewBox` nine tenths too small and rendered only
 * "Wal"; the script exists because that is invisible until somebody looks at the file.
 * `company-marks.test.ts` checks every vector's stated ratio against its own `viewBox`.
 *
 * **THE ORDER ALTERNATES ASPECT RATIO RATHER THAN GROUPING THE NEW MARKS AFTER THE
 * OLD, and that is the same measurement the dual cap in `customer-logos.tsx` exists
 * for.** These twenty-two span 0.78:1 (Target) to 5.18:1 (lululemon). Appended in the
 * order they were supplied, the second half is a run of six wide wordmarks — every
 * one of them pinned to the 128px width cap and therefore rendering SHORT — so a
 * third of the strip reads as small type while the first third reads as marks. Reading
 * a wide, a mid and a narrow in rotation keeps each screenful of the moving row at a
 * comparable optical weight, which is what stops one mark deciding the rhythm.
 *
 * Nothing about the order is a claim: the band states no ranking and no relationship
 * between adjacent marks, which is precisely why it is free to be arranged for
 * legibility. An admin reorder is still reported by the diff.
 */
export const DEFAULT_LOGOS: readonly CustomerLogo[] = [
  { name: "Walmart", src: "/logos/walmart.svg", width: 128, height: 30 },
  { name: "Best Buy", src: "/logos/bestbuy.png", width: 106, height: 64 },
  { name: "Target", src: "/logos/target.svg", width: 62, height: 79 },
  { name: "JCPenney", src: "/logos/jcpenney.svg", width: 128, height: 30 },
  { name: "Nike", src: "/logos/nike.svg", width: 98, height: 51 },
  { name: "Airbnb", src: "/logos/airbnb.svg", width: 86, height: 72 },
  { name: "lululemon", src: "/logos/lululemon.svg", width: 128, height: 25 },
  { name: "Lowe's", src: "/logos/lowes.svg", width: 125, height: 62 },
  { name: "X", src: "/logos/x.svg", width: 55, height: 50 },
  { name: "Kenvue", src: "/logos/kenvue.svg", width: 128, height: 30 },
  { name: "Wells Fargo", src: "/logos/wellsfargo.png", width: 127, height: 64 },
  { name: "PepsiCo", src: "/logos/pepsico.png", width: 81, height: 64 },
  { name: "DocuSign", src: "/logos/docusign.svg", width: 128, height: 26 },
  { name: "Goldman Sachs", src: "/logos/goldmansachs.png", width: 154, height: 64 },
  { name: "7-Eleven", src: "/logos/7eleven.svg", width: 128, height: 121 },
  { name: "Land O'Lakes", src: "/logos/landolakes.svg", width: 128, height: 28 },
  { name: "3M", src: "/logos/3m.svg", width: 128, height: 67 },
  { name: "Rakuten", src: "/logos/rakuten.svg", width: 128, height: 38 },
  { name: "FedEx", src: "/logos/fedex.svg", width: 128, height: 36 },
  { name: "Victoria's Secret", src: "/logos/victoriassecret.svg", width: 128, height: 42 },
  { name: "Hudson's Bay Company", src: "/logos/hudsonsbay.svg", width: 128, height: 85 },
  { name: "Uber", src: "/logos/uber.svg", width: 128, height: 45 },
];

/**
 * The shipped wording for every static string, and the fallback a dataset written
 * before this key existed reads with.
 *
 * Each of these was authored in `copy.ts` and the reasoning for the wording stays
 * there — this is the value, not the argument for it. Changing one here changes the
 * live site on the next publish; changing the reasoning is still a code edit.
 */
export const DEFAULT_PUBLIC_COPY: PublicCopy = {
  askTitle: "Find your peers",
  askLead:
    "Share your company details to identify relevant companies with GCCs in " +
    "India and explore talent, capability and location metrics.",
  askSubmit: "Build my GCC Landscape",
  askIndustryLabel: "Industry",
  /**
   * **"Annual revenue" on the FORM, "Revenue band (USD)" on the pill**, and the two are
   * separate keys because they do separate jobs. The form's own currency statement is
   * `askRevenueHint`, inside the panel; the pill has no hint, so it carries the unit in
   * its label. See `pillRevenueBand`.
   */
  askRevenueLabel: "Annual revenue",
  askHqLabel: "Headquarters",
  askIndustryPlaceholder: "Choose your industry",
  askIndustryHint: "Pick an industry to see its sub-industries (optional)",
  askRevenuePlaceholder: "Choose a band",
  askRevenueHint: "All figures in US dollars.",
  askHqPlaceholder: "Choose a country",
  askFilterPlaceholder: "Type to narrow the list",
  /**
   * **"Most common" leads and the second group holds EVERYTHING, which is what these two
   * pairs of words now have to be true about.** The tiers overlap: the leading one is a
   * shortcut into the same list, so "All industries" and "All countries" are literal
   * rather than aspirational. A reword that narrows either — "Other industries", "The
   * rest" — would describe the behaviour this pair replaced.
   */
  askGroupCommon: "Most common",
  askGroupIndustriesAll: "All industries",
  askGroupCountriesAll: "All countries",
  askGroupRevenue: "Revenue bands",
  askSubIndustryPlural: "sub-industries",
  askSubmitError:
    "Something went wrong reaching our data. Please try again in a moment.",
  askFieldRequired: "Choose one to continue.",
  /* Curly quotes, matching the typography everywhere else on the surface. */
  filterEmpty: "Nothing matches \u201C{query}\u201D.",
  customersLabel: "Companies ANSR has worked with in India",
  impactTitleLead: "By The Numbers",
  headerPeers: "How your industry operates in India",
  headerFunctions: "The India market beyond your industry",
  viewPeers: "Peer Landscape",
  viewFunctions: "Function Metrics",
  pillIndustry: "Industry",
  pillSubIndustry: "Sub-industry",
  pillHeadquarters: "Headquarters",
  pillRevenueBand: "Revenue band (USD)",
  functionPanelLabel: "India market metrics by function",
  editAnswers: "Edit answers",
  pillGroupLabel: "Your profile, as you entered it",
  viewSwitchLabel: "Result view",
  homeTitle: "Back to the start",
  editorTitle: "Your answers",
  editorLead: "Change anything below and your results update on this page.",
  editorClose: "Close",
  editorSubmit: "Update my results",
  gridRowHeader: "Capability",
  industryTitle: "Inside India's GCC base",
  /**
   * **The contrast clause is gone at the project owner's request: it names the scope and
   * stops.** It read "… drawn from the GCCs ANSR tracks rather than every centre in
   * India", where the second half spent nine words telling a reader what the figures are
   * NOT — which is the hedging register this field's own rule forbids, arriving by
   * comparison instead of by the word "approximate". "The GCCs ANSR tracks" already says
   * the counts are a tracked set rather than a census, so the clause was the same
   * qualification twice with the second one apologising.
   */
  industryBasisNote: "Indicative counts, drawn from the GCCs ANSR tracks.",
  /* "GCCs", never "GCC's", which ANSR asked never to appear. */
  snapshotHeading: "Snapshot of {industry} GCCs in India",
  /**
   * **"your closest peers", and what went is the words the layout already says.** The
   * heading was "GCC details of peers closest to {company}" and, for most visitors, "…
   * closest to your profile" — eleven characters of scaffolding around a possessive. The
   * cards are ordered by closeness and the band above states the profile they were
   * matched on, so "your closest peers" says the same thing in three words.
   *
   * **"GCC details" stays and is the load-bearing half.** The cards carry a headcount, a
   * city list and a start year — facts about the CENTRE, not about the company — and this
   * is the only place on the block that says so. **Never "closest to yours"**, which
   * presumes the visitor already runs an India centre; `gccStatus` is a constant the form
   * never asks for.
   */
  peersTitle: "GCC details of your closest peers",
  /**
   * **One sentence, one fact per clause, no number.** The first answers the question a
   * short list actually raises — is India thin in my industry? — and answers it no. The
   * second names what did the narrowing, which is the visitor's own answer rather than a
   * limit of the data. The count is under the grid, stated exactly once.
   *
   * "well established" rather than "not short of companies": a sentence that opens on
   * what the market is NOT makes the reader hold the negative through the whole clause,
   * and the finding here is positive. **Collapsed to one comma-joined sentence and
   * shortened**, because two sentences at 14px inside `max-w-measure` wrapped to a
   * second line with the first half-empty, and "closely … the closest" said "close"
   * twice. "so these are the nearest" points FORWARD — the line is read before the
   * cards now; it closed on "the closest comparisons above" while it was drawn beneath
   * them, which the move made false. Commas throughout, never a dash: no em dash
   * reaches a visitor.
   */
  peersNarrowNote:
    "{industry} is well established in India, but few GCCs closely match " +
    "your sub-industry, so these are the nearest.",
  /**
   * **Names the reach without apologising for it, and names neither axis nor industry.**
   * The clause a visitor cares about is why the set is not an exact match: their own
   * answers returned too few, so the tool reached a little past them to the closest
   * comparable companies in the wider industry. "your selection" covers a widening on
   * sub-industry, on revenue band, or on both; "the wider industry" scopes it to the
   * industry they chose without naming it. No count, no em dash.
   */
  peersBroadenedNote:
    "Few companies match your selection exactly, so these reach beyond it to the " +
    "closest comparable companies in the wider industry.",
  largestTitle: "The largest {industry} GCCs in India",
  /* Not "Where …": the block's own heading would then open the way the lead used to. */
  mapTitle: "Cities where {industry} companies have set up",
  cityScopeAll: "All cities",
  cityScopeTop: "Top cities",
  cityCountHeader: "Companies",
  cityToggleToTop: "Show the leading cities only",
  cityToggleToAll: "Explore all cities",
  peerHeadcountLabel: "GCC headcount",
  peerCitiesLabel: "Cities",
  peerSinceLabel: "In India since",
  snapshotHeadcountLabel: "average employees in each GCC",
  /**
   * **"your industry", NOT "your sub-industry", and the difference is the figure this
   * label sits under.** ANSR's wording named the sub-industry; the count is
   * `view.map.cities.length`, which is the industry's own city spread — the map block
   * is filtered to `input.industry` and there is no per-sub-industry city derivation to
   * read. A label claiming the narrower population over the wider figure is the one
   * thing copy on this surface may not do. The same correction is made on the leading
   * city below and on `mapTitle`.
   */
  snapshotCitiesLabel: "cities in India host GCCs from your industry",
  /**
   * **"these GCCs", not "peer GCCs".** The leading city is `view.map.cities[0]` — the
   * industry's top city, not the five-company peer set's — and "peer" would name a
   * population this cell was not measured over. "These" refers to the section heading
   * directly above, which names the industry once for all four cells.
   */
  snapshotLeadingCityLabel: "the city where most of these GCCs are based",
  figureUnavailable: "Data unavailable",
  /**
   * **"India GCCs" is the load-bearing half, exactly as it is in `FUNCTIONS_TITLE`.**
   * The block sits directly under five named companies, so a heading reading "Roles
   * they hire" or "Roles your peers hire" would claim a per-company role record this
   * dataset does not hold and never will. "hired into India GCCs" is a claim about the
   * market, which is what the chart actually draws.
   *
   * **"Technology and product roles", not "Roles".** The shipped thirty-six are all
   * engineering, data, security and product; a bare "Roles" would imply the finance,
   * HR and procurement functions the tags above it list, none of which are here.
   */
  rolesTitle: "Technology and product roles hired into India GCCs",
  rolesBandEmerging: "Emerging",
  rolesBandEstablished: "Established",
  rolesAxisLabel: "Job role complexity",
  rolesAxisLow: "Lower",
  rolesAxisHigh: "Higher",
  /**
   * Names the encoding the way the source slide does, and it is now the WHOLE line.
   *
   * The renderer used to append the scale's two ends to it; that went at the project
   * owner's request, so this string is the entire demand key and a reword has to carry
   * the direction itself if it wants one. It still must not name a STEP — `demandLevels`
   * owns those words, and a step typed in here would be a second place to spell one.
   */
  rolesDemandKey: "Bubble size = Hiring Demand",
  /**
   * **No em dash and no hedge.** It names where the positions come from and stops; the
   * sentence a reader must not find here is one apologising for them.
   *
   * **The "rather than from the companies above" clause is gone at the project owner's
   * request**, on `industryBasisNote`'s own reasoning: naming the source is what the
   * sentence is for, and a clause naming what the source is NOT reads as the block
   * defending itself. The scope survives in "ANSR's own hiring research", which is
   * already a different source from the peer grid.
   */
  rolesBasisNote:
    "Indicative, drawn from ANSR's own hiring research across India GCCs.",
  scaleTitle: "The world's largest companies, in India",
  scaleFortuneLabel: "Fortune Global 500 companies run a GCC in India.",
  scaleForbesLabel: "Forbes Global 2000 companies run a GCC in India.",
  scalePeopleLabel:
    "people work in those Fortune Global 500 and Forbes Global 2000 GCCs in India.",
  figuresTech: "India's technology talent",
  figuresOperations: "India's operations landscape",
  figuresHr: "India's hiring market",
  figuresFinance: "India's cost base",
  velocityHeading: "How long hiring takes",
  hrAnalysisHeading: "Scale and salary pressure",
  opsSupportingHeading: "Scale and connectivity",
  sourceLine: "Source: ANSR Research",
  closeLabel: "Unlock the full GCC landscape",
  indexedNote: "Indexed: {baseline}",
};

/**
 * What ships when the key is absent, and what `--reseed-site-content` restores.
 *
 * Inline here rather than in a catalogue file of its own, unlike
 * `metric-catalogue.ts`: this is three strings and five pairs, and a separate
 * module would have to import the types from here, which is a cycle bought for
 * nothing. It is also the schema's own `.default()`, so it has to be in scope at
 * definition time.
 *
 * **Every figure below is ANSR's own supplied copy and none of it is derived.**
 * The company count in the lead is deliberately "1,800+" and not the dataset's
 * actual 1,834: ANSR asked for the rounded form, and a figure that moves by
 * three every time a company is added is not the claim they want to make. So it
 * is a string an admin edits, not `companies.length` — and `data:verify` cannot
 * check it against the data, because it is not supposed to agree exactly.
 */
export const DEFAULT_SITE_CONTENT: SiteContent = {
  hero: {
    /**
     * **The product's name, on its own field and on its own line.**
     *
     * **The literal-substring rule is GONE with the single `title` field, and that is the
     * whole point of the split.** `withProductMark` used to search the headline for
     * `GCC ATLAS` as one two-word token and swap it for the drawn form — so a doubled
     * space, a hyphen or a reword silently lost the name's own setting and looked
     * intentional. The name is now the field, so there is nothing to match and nothing to
     * spell wrong.
     *
     * **"ANSR" is not here and must not be.** The brand came off this band as TYPE at the
     * project owner's instruction and is stated by `AnsrLockup`'s artwork above the
     * headline; a name containing it would open the line with two names again.
     *
     * **No punctuation after it, at the project owner's request.** It read
     * "ANSR ATLAS: Benchmark against your peers" while the headline was one string, and
     * the colon was doing the job the line break now does on its own.
     */
    productName: DEFAULT_PRODUCT_NAME,
    /**
     * **The promise, sized to run A LITTLE LONGER than the name above it, at the project
     * owner's request** — 104.5% of its ink, measured. See `HERO_TAGLINE_SIZE` in
     * `ask-hero.tsx` for the ratio and how it was derived; the consequence for an admin is
     * that a longer tagline does not get smaller, it wraps. Keep it to about this length and
     * the masthead stays two lines.
     */
    tagline: "Benchmark against your peers",
    /**
     * **No em dash, at ANSR's request, and a colon for the reason the close's body takes
     * one.** What follows the break names the three kinds of data the sentence before it
     * promises, so it expands the clause rather than continuing it — and "talent, cost and
     * location" already carries a comma, so a comma at the join would read as a fourth
     * item in that list instead of as the break between the two halves.
     */
    lead:
      "See how the top companies in your industry run their India GCCs today: " +
      "talent, cost and location data drawn from our research into 1,800+ centres.",
  },
  impactStats: [
    { id: "professionals-hired", value: "225K+", label: "Professionals hired" },
    { id: "centers-established", value: "210+", label: "Global centres established" },
    {
      id: "workspace-managed",
      value: "14M+",
      label: "Sq ft of workspace under management",
    },
    { id: "years-experience", value: "20+", label: "Years of experience" },
    { id: "capital-created", value: "$2.5B+", label: "Capital investment created" },
  ],
  close: DEFAULT_CLOSE_COPY,
  /**
   * **Key order here matches `siteContentSchema`'s declaration order, and that is a
   * correctness requirement rather than tidiness.** Zod emits a parsed object in the
   * order its schema declares, `serializeDataset` is `JSON.stringify`, and
   * `JSON.stringify` preserves insertion order — so a literal whose keys run in a
   * different order serialises to different bytes than the same content round-tripped
   * through the schema. The GitHub store asserts the two are byte-identical, because
   * otherwise a publish through one store shows up as a whole-file rewrite in the
   * other's diff.
   */
  commonFunctions: [...DEFAULT_COMMON_FUNCTIONS],
  roleMap: DEFAULT_ROLE_MAP,
  logos: [...DEFAULT_LOGOS],
  copy: DEFAULT_PUBLIC_COPY,
};

export type HeroCopy = z.infer<typeof heroCopySchema>;
export type ImpactStat = z.infer<typeof impactStatSchema>;
export type CloseCopy = z.infer<typeof closeCopySchema>;
export type RoleFamily = z.infer<typeof roleFamilySchema>;
export type Role = z.infer<typeof roleSchema>;
export type RoleMap = z.infer<typeof roleMapSchema>;
export type CustomerLogo = z.infer<typeof customerLogoSchema>;
export type PublicCopy = z.infer<typeof publicCopySchema>;
export type LatLon = z.infer<typeof latLonSchema>;
export type SiteContent = z.infer<typeof siteContentSchema>;

export type MetricStructure = z.infer<typeof metricStructureSchema>;
export type MetricValue = z.infer<typeof metricValueSchema>;
export type Metric = z.infer<typeof metricSchema>;

export const datasetSchema = z
  .object({
    /** Bumped by hand only when the shape changes, not per publish. */
    version: z.number().int().min(1),
    generatedAt: z.string().datetime(),
    /** Where this batch came from. Free text, for the admin's benefit. */
    source: nonEmpty,
    taxonomy: taxonomySchema,
    companies: z.array(companySchema).min(1),
    /**
     * The business-type catalogue. Defaulted for the same reason `metrics` is:
     * a dataset written before the key existed still reads, so this is a
     * backwards-compatible addition rather than a version bump the fs store
     * would refuse.
     *
     * Not part of `taxonomy`, deliberately. Taxonomy is four flat string lists
     * and the whole rename-cascade, usage-count and diff machinery assumes that
     * shape; a record-shaped fifth key would have needed a special case in every
     * one of them. `metrics` set the precedent for an editable collection that
     * lives beside taxonomy instead of inside it.
     */
    businessTypes: z.array(businessTypeSchema).max(400).default([]),
    /**
     * Hand-picked peer sets, by combination of answers. Defaulted on the same
     * argument as `businessTypes` and `metrics`: a dataset written before the key
     * existed still reads, so this is a backwards-compatible addition rather than a
     * `DATASET_VERSION` bump the fs store would refuse.
     *
     * Beside taxonomy rather than inside it, for the reason recorded on
     * `businessTypes` — taxonomy is four flat string lists and every generic walk
     * over it assumes that shape.
     *
     * **200 is a ceiling on a control surface, not on a dataset.** Overrides are
     * corrections to the engine's answer, so a repo holding hundreds of them is a repo
     * whose scoring should be fixed instead; the cap is where that stops being
     * arguable.
     */
    peerOverrides: z.array(peerOverrideSchema).max(200).default([]),
    /**
     * Which sentence the peer grid carries, per combination of answers.
     *
     * Defaulted and capped on `peerOverrides`' own reasoning: it is a control surface, so
     * hundreds of rows would mean the DEFAULT is wrong and should be changed in code
     * instead. Same 200.
     *
     * **`.default([])` is what makes this a compatible addition and also what makes the
     * draft restore blind to it**, which is why `STORAGE_KEY` moves with it — a draft
     * written before this key parses with the gap filled by an empty list, so publishing
     * one would silently delete every rule and report it as an ordinary edit.
     */
    peerNoteRules: z.array(peerNoteRuleSchema).max(200).default([]),
    /**
     * The Screen 2 catalogue. Defaulted rather than required, so a dataset
     * written before this key existed still reads and `DATASET_VERSION` does not
     * have to move — the fs store refuses a version it does not recognise, and
     * bumping it would turn a backwards-compatible addition into a broken read.
     * The parsed type is non-optional, so no consumer has to consider absence.
     */
    metrics: z.array(metricSchema).max(400).default([]),
    /**
     * The entry point's hero copy and impact figures. Defaulted for the same
     * reason `metrics` and `businessTypes` are — a dataset written before this
     * key existed still reads, so it is a backwards-compatible addition rather
     * than a `DATASET_VERSION` bump the fs store would refuse as an unknown
     * version.
     *
     * The default is real content rather than `[]`, which is the one difference
     * from the other two. An empty company list or metric catalogue is a
     * coherent state — nothing renders. An empty hero is not: the entry point
     * has no headline, and there is no visitor-facing story where that is the
     * right outcome. So this key cannot be empty, and the seed is the approved
     * copy.
     */
    siteContent: siteContentSchema.default(DEFAULT_SITE_CONTENT),
  })
  .superRefine((dataset, ctx) => {
    const seen = new Set<string>();
    for (const [index, company] of dataset.companies.entries()) {
      if (seen.has(company.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["companies", index, "id"],
          message: `duplicate company id: ${company.id}`,
        });
      }
      seen.add(company.id);
    }

    // Referential integrity against the taxonomy. A company referencing a value
    // the dropdowns do not offer is unreachable by any visitor, so it is an
    // error rather than a warning.
    const checks: ReadonlyArray<
      [TaxonomyListKey, "industry" | "revenueBand" | "hqCountry"]
    > = [
      ["industries", "industry"],
      ["revenueBands", "revenueBand"],
      ["hqCountries", "hqCountry"],
    ];

    for (const [taxonomyKey, companyKey] of checks) {
      const allowed = new Set(dataset.taxonomy[taxonomyKey]);
      for (const [index, company] of dataset.companies.entries()) {
        if (!allowed.has(company[companyKey])) {
          ctx.addIssue({
            code: "custom",
            path: ["companies", index, companyKey],
            message: `${companyKey} "${company[companyKey]}" is not in taxonomy.${taxonomyKey}`,
          });
        }
      }
    }

    const allowedCities = new Set(dataset.taxonomy.cities);
    for (const [index, company] of dataset.companies.entries()) {
      for (const [cityIndex, city] of company.cities.entries()) {
        if (!allowedCities.has(city)) {
          ctx.addIssue({
            code: "custom",
            path: ["companies", index, "cities", cityIndex],
            message: `city "${city}" is not in taxonomy.cities`,
          });
        }
      }
    }
    /* ----------------------------------------------------------------------
       The two parallel taxonomy lists. Both hold copies of strings that live in
       one of the four primary lists, which is the cost of not restructuring
       those into arrays of objects — so both need the check that keeps the copy
       honest. A pinned industry that no longer exists would silently stop
       pinning anything; a coordinate keyed to a deleted city would plot a dot
       for a place no company is in.
       ---------------------------------------------------------------------- */
    const allowedIndustries = new Set(dataset.taxonomy.industries);
    for (const [index, industry] of dataset.taxonomy.pinnedIndustries.entries()) {
      if (!allowedIndustries.has(industry)) {
        ctx.addIssue({
          code: "custom",
          path: ["taxonomy", "pinnedIndustries", index],
          message: `pinned industry "${industry}" is not in taxonomy.industries`,
        });
      }
    }
    for (const city of Object.keys(dataset.taxonomy.cityCoordinates)) {
      if (!allowedCities.has(city)) {
        ctx.addIssue({
          code: "custom",
          path: ["taxonomy", "cityCoordinates", city],
          message: `coordinate for "${city}", which is not in taxonomy.cities`,
        });
      }
    }

    /* ----------------------------------------------------------------------
       Business types.

       Two checks, and the second is the one that matters. A business type is
       scoped to an industry, and a company may only carry a type from its OWN
       industry — otherwise a Retail company could be tagged "Retail banking"
       and would be scored against a pool it can never be a member of, which is
       exactly the kind of silent nonsense the peer set cannot survive.
       ---------------------------------------------------------------------- */
    const businessTypeIds = new Set<string>();
    const industrySet = new Set(dataset.taxonomy.industries);
    const industryOfType = new Map<string, string>();

    for (const [index, type] of dataset.businessTypes.entries()) {
      if (businessTypeIds.has(type.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["businessTypes", index, "id"],
          message: `duplicate business type id: ${type.id}`,
        });
      }
      businessTypeIds.add(type.id);
      industryOfType.set(type.id, type.industry);

      if (!industrySet.has(type.industry)) {
        ctx.addIssue({
          code: "custom",
          path: ["businessTypes", index, "industry"],
          message: `industry "${type.industry}" is not in taxonomy.industries`,
        });
      }

      if (new Set(type.tags).size !== type.tags.length) {
        ctx.addIssue({
          code: "custom",
          path: ["businessTypes", index, "tags"],
          message: `business type "${type.id}" repeats a tag`,
        });
      }
    }

    for (const [index, company] of dataset.companies.entries()) {
      if (new Set(company.businessTypes).size !== company.businessTypes.length) {
        ctx.addIssue({
          code: "custom",
          path: ["companies", index, "businessTypes"],
          message: `${company.name} repeats a business type`,
        });
      }
      for (const [typeIndex, id] of company.businessTypes.entries()) {
        const path = ["companies", index, "businessTypes", typeIndex];
        if (!businessTypeIds.has(id)) {
          ctx.addIssue({
            code: "custom",
            path,
            message: `business type "${id}" is not in businessTypes`,
          });
          continue;
        }
        const owner = industryOfType.get(id);
        if (owner !== undefined && owner !== company.industry) {
          ctx.addIssue({
            code: "custom",
            path,
            message: `business type "${id}" belongs to ${owner}, but ${company.name} is in ${company.industry}`,
          });
        }
      }
    }

    /* ----------------------------------------------------------------------
       Peer overrides.

       Every check here exists because the alternative is a silent wrong answer to a
       real visitor rather than an error. An override that names a deleted company
       shows a shorter set than the admin pinned; one whose industry was renamed
       stops firing altogether and the engine answers instead, with nothing anywhere
       saying so. Both look like the feature not working.

       The DUPLICATE-COMBINATION check is the one that is about the admin rather than
       about the data: two rows matching the same answers would be resolved by list
       position, which is not a thing the editor shows, so which set a visitor sees
       would depend on something invisible. Refused, so the admin merges them.
       ---------------------------------------------------------------------- */
    const overrideIds = new Set<string>();
    const overrideKeys = new Map<string, string>();
    const companyById = new Map(dataset.companies.map((c) => [c.id, c]));
    const overrideHqAllowed = new Set<string>([
      ...dataset.taxonomy.hqCountries,
      ...HQ_COUNTRIES,
    ]);

    for (const [index, override] of dataset.peerOverrides.entries()) {
      const at = (...rest: Array<string | number>) => [
        "peerOverrides",
        index,
        ...rest,
      ];

      if (overrideIds.has(override.id)) {
        ctx.addIssue({
          code: "custom",
          path: at("id"),
          message: `duplicate peer override id: ${override.id}`,
        });
      }
      overrideIds.add(override.id);

      if (!industrySet.has(override.industry)) {
        ctx.addIssue({
          code: "custom",
          path: at("industry"),
          message: `industry "${override.industry}" is not in taxonomy.industries`,
        });
      }

      if (
        override.revenueBand !== undefined &&
        !dataset.taxonomy.revenueBands.includes(override.revenueBand)
      ) {
        ctx.addIssue({
          code: "custom",
          path: at("revenueBand"),
          message: `revenue band "${override.revenueBand}" is not in taxonomy.revenueBands`,
        });
      }

      if (
        override.hqCountry !== undefined &&
        !overrideHqAllowed.has(override.hqCountry)
      ) {
        ctx.addIssue({
          code: "custom",
          path: at("hqCountry"),
          message: `HQ location "${override.hqCountry}" is not a country a visitor can pick`,
        });
      }

      if (override.businessTypeId !== undefined) {
        const owner = industryOfType.get(override.businessTypeId);
        if (owner === undefined) {
          ctx.addIssue({
            code: "custom",
            path: at("businessTypeId"),
            message: `sub-industry "${override.businessTypeId}" is not in businessTypes`,
          });
        } else if (owner !== override.industry) {
          // Same failure as a company carrying a type from another industry, and the
          // same reason it is an error: the combination could never be answered, so
          // the override would sit there matching nothing.
          ctx.addIssue({
            code: "custom",
            path: at("businessTypeId"),
            message: `sub-industry "${override.businessTypeId}" belongs to ${owner}, but this override is for ${override.industry}`,
          });
        }
      }

      if (new Set(override.companyIds).size !== override.companyIds.length) {
        ctx.addIssue({
          code: "custom",
          path: at("companyIds"),
          message: `peer override "${override.id}" pins the same company twice`,
        });
      }

      for (const [companyIndex, id] of override.companyIds.entries()) {
        const company = companyById.get(id);
        if (!company) {
          ctx.addIssue({
            code: "custom",
            path: at("companyIds", companyIndex),
            message: `company "${id}" is not in companies`,
          });
          continue;
        }
        if (company.industry !== override.industry) {
          ctx.addIssue({
            code: "custom",
            path: at("companyIds", companyIndex),
            message: `${company.name} is in ${company.industry}, and peer matching may not leave ${override.industry}`,
          });
        }
      }

      const key = [
        override.industry,
        override.businessTypeId ?? "*",
        override.revenueBand ?? "*",
        override.hqCountry ?? "*",
      ].join("||");
      const owner = overrideKeys.get(key);
      if (owner !== undefined) {
        ctx.addIssue({
          code: "custom",
          path: at("id"),
          message: `peer override "${override.id}" covers the same combination as "${owner}" — merge them, because which one a visitor sees would depend on list order`,
        });
      } else {
        overrideKeys.set(key, override.id);
      }
    }

    const metricIds = new Set<string>();
    for (const [index, metric] of dataset.metrics.entries()) {
      if (metricIds.has(metric.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["metrics", index, "id"],
          message: `duplicate metric id: ${metric.id}`,
        });
      }
      metricIds.add(metric.id);
    }

    // Impact stat ids are React keys and the admin form's row identity. A
    // duplicate silently makes two rows edit as one.
    const impactIds = new Set<string>();
    for (const [index, stat] of dataset.siteContent.impactStats.entries()) {
      if (impactIds.has(stat.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["siteContent", "impactStats", index, "id"],
          message: `duplicate impact stat id: ${stat.id}`,
        });
      }
      impactIds.add(stat.id);
    }

    for (const key of ["industries", "revenueBands", "cities", "hqCountries"] as const) {
      const values = dataset.taxonomy[key];
      if (new Set(values).size !== values.length) {
        ctx.addIssue({
          code: "custom",
          path: ["taxonomy", key],
          message: `taxonomy.${key} contains duplicates`,
        });
      }
    }
  });

export type FteRange = z.infer<typeof fteRangeSchema>;
export type Company = z.infer<typeof companySchema>;
export type BusinessType = z.infer<typeof businessTypeSchema>;
export type PeerOverride = z.infer<typeof peerOverrideSchema>;
export type PeerNoteRule = z.infer<typeof peerNoteRuleSchema>;
export type Taxonomy = z.infer<typeof taxonomySchema>;
export type Dataset = z.infer<typeof datasetSchema>;

/** Current shape version. Bump only on a breaking shape change. */
export const DATASET_VERSION = 1;

export function parseDataset(input: unknown): Dataset {
  return datasetSchema.parse(input);
}

/**
 * Formats a ZodError into something an admin can act on. Used by the importer
 * now and by the publish endpoint later — a validation failure blocks a
 * publish, so the message has to name the row.
 */
export function formatIssues(error: z.ZodError, limit = 25): string {
  const lines = error.issues
    .slice(0, limit)
    .map((issue) => `  ${issue.path.join(".") || "(root)"}: ${issue.message}`);
  const extra = error.issues.length - lines.length;
  if (extra > 0) lines.push(`  ...and ${extra} more`);
  return lines.join("\n");
}
