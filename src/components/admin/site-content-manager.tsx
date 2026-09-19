"use client";

import { useDraft } from "@/components/admin/draft-provider";
import { SelectField, TextField } from "@/components/admin/fields";
import { AdminPageHeader, AdminSection } from "@/components/admin/page-header";
import {
  AdminSearch,
  NoSearchMatches,
  useAdminSearch,
  useDeepLinkQuery,
  type AdminSearchState,
} from "@/components/admin/search-box";
import { AdminField } from "@/components/admin/controls";
import { RoleMapCanvas } from "@/components/admin/role-map-canvas";
import { Button } from "@/components/ui/button";
import { PUBLIC_COPY_LABELS } from "@/data/diff";
import { uniqueSlug } from "@/data/normalize";
import { cn } from "@/lib/utils";
/* The gate's own bound and predicate for a CTA link, imported rather than restated for
   the reason every other cap on this page is read off the schema: a form that states a
   different rule than the publish endpoint is a form that lies. `closeCopySchema` refines
   on these two, so `.maxLength` is not readable there. */
import { CTA_URL_MAX_LENGTH, isCtaUrl } from "@/data/normalize";
import type { SearchablePart } from "@/data/search";
import {
  closeCopySchema,
  COPY_PLACEHOLDERS,
  COPY_TEMPLATES,
  copyFieldMax,
  customerLogoSchema,
  heroCopySchema,
  HERO_PRODUCT_NAME_MAX,
  HERO_TAGLINE_MAX,
  impactStatSchema,
  isCopyTemplate,
  roleFamilySchema,
  roleSchema,
  ROLE_TONES,
  siteContentSchema,
  type CloseCopy,
  type CustomerLogo,
  type HeroCopy,
  type ImpactStat,
  type PublicCopy,
  type Role,
  type RoleBand,
  type RoleFamily,
  type RoleMap,
} from "@/data/schema";

/**
 * The entry-point editor: the hero's two lines, and ANSR's impact figures.
 *
 * **Why this tab exists at all.** Everything else on the public screens is either
 * an argument about the dataset (so it lives in code beside the logic that makes
 * it) or a company row (so it lives in the company table). These two are neither:
 * the hero is positioning, and the impact figures are corporate facts on their own
 * schedule. A figure that goes stale because changing it needed a developer is the
 * exact failure the `siteContent` key exists to prevent.
 *
 * **No local form state and no Save button, which is the opposite of the metric
 * editor and is deliberate.** A metric has cross-field rules — a shape change and
 * the numbers re-fitted to it have to land as one edit, or a render sees a value
 * whose length disagrees with its structure — so it collects into a local `Form`
 * and commits once. Nothing here has a rule spanning two fields: a title and a
 * lead are independent, and so are a figure and its label. So each control writes
 * straight to the draft, the autosave picks it up, and there is no second copy of
 * the truth to get out of step with the first.
 *
 * That also means there is no "unsaved in the dialog" state to lose, which is the
 * failure mode a Save button introduces on a form somebody might close.
 *
 * **Validation is shown, not enforced.** The publish gate is the schema, and it is
 * the same schema quoted here, so a too-long headline cannot reach the site either
 * way. What this adds is telling the admin WHICH field is over and by how much,
 * while they type — rather than at publish time, in a list of zod paths, possibly
 * an hour after they wrote it.
 */

/** The bounds come off the schema, so the hint cannot drift from the gate. */
const MAX = {
  /* **The headline's two caps are imported constants, not introspected.** Both fields are
     `.default()`-ed so an older dataset reads, and a `ZodDefault` has no readable
     `maxLength` — so `?? 60` would have become the real bound and drifted from the gate the
     moment either changed. `lead` is a plain string and still reads off the schema. */
  productName: HERO_PRODUCT_NAME_MAX,
  tagline: HERO_TAGLINE_MAX,
  lead: heroCopySchema.shape.lead.maxLength ?? 180,
  value: impactStatSchema.shape.value.maxLength ?? 16,
  label: impactStatSchema.shape.label.maxLength ?? 64,
  closeBody: closeCopySchema.shape.body.maxLength ?? 140,
  closeLabel: closeCopySchema.shape.ctaLabel.maxLength ?? 28,
  functionItem:
    siteContentSchema.shape.commonFunctions.unwrap().element.maxLength ?? 32,
  logoName: customerLogoSchema.shape.name.maxLength ?? 40,
  roleName: roleSchema.shape.name.maxLength ?? 40,
  roleFamilyName: roleFamilySchema.shape.name.maxLength ?? 36,
  /* `roleMapSchema` is a `ZodEffects` because of its `superRefine`, so the element cannot
     be reached through `.shape` the way the others can. Read off the element schema
     directly, which is the same object the gate validates with. */
  roleDemandLevel: 20,
} as const;

const MAX_STATS = 6;
/**
 * The two collection caps, retyped from the schema the way `MAX_STATS` already is.
 *
 * A count is not reachable off a zod array the way a string's `maxLength` is, and
 * the schema stays the gate either way — what these buy is a disabled Add button
 * with a reason beside it instead of a publish that fails on a list somebody spent
 * ten minutes filling.
 */
const MAX_FUNCTIONS = 12;
/** Mirrors the schema's own cap on `siteContent.logos`, and must move with it. */
const MAX_LOGOS = 24;
/** Mirrors `roleMapSchema`'s own caps. A zod array's length is not introspectable. */
const MAX_ROLES = 60;
const MIN_DEMAND_LEVELS = 3;
const MAX_DEMAND_LEVELS = 5;

/**
 * The two band words as an admin reads them, and they are NOT the published copy keys.
 *
 * `copy.rolesBandEmerging` and `copy.rolesBandEstablished` are what a visitor sees and are
 * edited in the copy groups below; these name the two values of the `band` enum in a form
 * control. Keeping them separate is deliberate: an admin who renames the visitor-facing
 * word to "Traditional" must still be able to find the field, and a select whose options
 * change under them as they edit a different section is a form that moves while being used.
 */
const BAND_OPTIONS = ["Emerging", "Established"] as const;

/** Which side of its bubble a name sits on, in words rather than in the enum's. */
const SIDE_LABELS: Record<"lead" | "trail", string> = {
  trail: "After the bubble",
  lead: "Before the bubble",
};

/**
 * The marks that are actually served from `public/logos/`.
 *
 * **Hardcoded, because it is a list of FILES rather than of data, and admin cannot
 * add to it.** A new mark is an adaptation committed to the repo — eighteen of these
 * are real vectors and four were re-encoded from a raster hidden inside an SVG
 * `<pattern>` — so the set moves with a deploy, not with a publish. What this control
 * decides is which of them appear, in what order and under what name; the schema's
 * own `src` pattern is what stops the field becoming a way to point the strip at an
 * arbitrary URL.
 *
 * **Files under `/logos/companies/` are deliberately absent, and the schema's pattern
 * excludes the subdirectory rather than leaving it to this list.** That directory is
 * the uploaded tier for a PEER CARD's mark, which is a different claim: a company in
 * the dataset is not thereby a company ANSR has worked with, and this band must never
 * imply otherwise. Twenty of the marks below happen to be both, and each is ONE file
 * referenced twice rather than two copies of one trademark — see `company-marks.ts`.
 */
const SERVED_LOGO_FILES: readonly string[] = [
  "/logos/3m.svg",
  "/logos/7eleven.svg",
  "/logos/airbnb.svg",
  "/logos/bestbuy.png",
  "/logos/docusign.svg",
  "/logos/fedex.svg",
  "/logos/goldmansachs.png",
  "/logos/hudsonsbay.svg",
  "/logos/jcpenney.svg",
  "/logos/kenvue.svg",
  "/logos/landolakes.svg",
  "/logos/lowes.svg",
  "/logos/lululemon.svg",
  "/logos/nike.svg",
  "/logos/pepsico.png",
  "/logos/rakuten.svg",
  "/logos/target.svg",
  "/logos/uber.svg",
  "/logos/victoriassecret.svg",
  "/logos/walmart.svg",
  "/logos/wellsfargo.png",
  "/logos/x.svg",
];

function lengthError(value: string, max: number): string | undefined {
  const trimmed = value.trim();
  if (trimmed.length === 0) return "Required — the public page has no fallback.";
  if (trimmed.length > max) {
    return `${trimmed.length} characters. The limit is ${max}; publishing is blocked above it.`;
  }
  return undefined;
}

/**
 * Whether a template field has lost a slot it is required to carry.
 *
 * **Reported in the form rather than only at the publish gate, because the schema
 * REFUSES this value and an admin deleting `{industry}` has no other way to learn
 * that.** It reads `COPY_TEMPLATES` — the same table the schema builds the field from
 * — so the requirement stated here cannot disagree with the one enforced there. A key
 * that is not a template returns nothing, so the caller needs no branch.
 */
function templateError(key: keyof PublicCopy, value: string): string | undefined {
  if (!isCopyTemplate(key)) return undefined;
  const missing = COPY_TEMPLATES[key].slots
    .map((slot) => COPY_PLACEHOLDERS[slot])
    .filter((token) => !value.includes(token));
  if (missing.length === 0) return undefined;
  return `Must contain ${missing.join(" and ")}. Publishing is blocked without it — the real value is substituted there.`;
}

export function SiteContentManager() {
  const {
    draft,
    updateHeroCopy,
    updateCloseCopy,
    addImpactStat,
    updateImpactStat,
    removeImpactStat,
    moveImpactStat,
    updatePublicCopy,
    setCommonFunctions,
    setRoleMap,
    addLogo,
    updateLogo,
    removeLogo,
    moveLogo,
  } = useDraft();

  const { hero, impactStats, close, commonFunctions, roleMap, logos, copy } =
    draft.siteContent;
  const search = useAdminSearch();
  // Arriving from the universal search. No `open`: every field on this page writes
  // straight to the draft, so there is no editor to open — the query is what reveals
  // the section, which is why the palette's copy entries seed a word that matches it.
  useDeepLinkQuery(search.setQuery);
  // Checked against the real gate rather than re-deriving its rules, so the
  // banner cannot say "ready" for something the publish endpoint will reject.
  const blocked = !siteContentSchema.safeParse(draft.siteContent).success;

  /**
   * Whether a section survives the query.
   *
   * **This page is the reason the admin search exists.** It holds every editable
   * public string in the product — two hero lines, two close lines, six impact
   * figures, twelve function tags, twenty-two logos and 28 labels across four groups —
   * and
   * the admin arriving at it has a sentence, not a location: "change 'GCC headcount'
   * to 'India headcount'". Finding that meant knowing it was a peer-card label, on
   * this page, in the third group. Now it means typing it.
   *
   * **A section is searched by its own name AND by the words currently inside it**,
   * which is the half that matters. Nobody knows the field is called "Supporting
   * line"; they know the page says "Benchmark against your peers". Matching the VALUE
   * is what makes the request answerable in the form the request arrives in.
   */
  const show = (...terms: readonly SearchablePart[]) =>
    !search.searching || search.matches(...terms);

  const sections = {
    hero: show(
      "hero title tagline product name supporting line headline",
      hero.productName,
      hero.tagline,
      hero.lead,
    ),
    close: show(
      // The link words are here as well as the copy words, because an admin coming to
      // retag a campaign arrives with "utm" or "link", not with "closing call to action".
      // The stored URLs are searched too, so pasting a domain finds the field holding it.
      "closing call to action button cta supporting line link url utm tracking campaign destination",
      close.body,
      close.ctaLabel,
      close.ctaHrefPeers,
      close.ctaHrefFunctions,
    ),
    impact: show(
      "impact figures numbers band",
      impactStats.map((stat) => stat.value),
      impactStats.map((stat) => stat.label),
    ),
    functions: show("function list common functions tags", commonFunctions),
    /* Searched by the words an admin arrives with, which for this section is a role name
       nine times out of ten — "move Data Scientist" — so every role name, group name and
       demand step is in the haystack alongside the section's own vocabulary. "bubble",
       "colour" and "chart" are here because that is what people call it. */
    roleMap: show(
      "role map bubbles chart roles job complexity hiring demand colour groups legend emerging established",
      roleMap.roles.map((role) => role.name),
      roleMap.families.map((family) => family.name),
      roleMap.demandLevels,
    ),
    logos: show(
      "customer logo strip",
      logos.map((logo) => logo.name),
      logos.map((logo) => logo.src),
    ),
  };

  // Copy groups are counted here rather than inside `CopyEditor`, because the
  // "nothing matched" state is a statement about the whole PAGE and only this
  // component can see all of it.
  const copyMatches = COPY_GROUPS.filter((group) =>
    matchingCopyFields(group, copy, search).length > 0,
  ).length;
  const shown =
    Object.values(sections).filter(Boolean).length +
    (search.searching ? copyMatches : COPY_GROUPS.length);
  const total = Object.keys(sections).length + COPY_GROUPS.length;

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Site copy"
        lead="The words and figures on the public pages that are not drawn from the company data."
      />

      <AdminSearch
        placeholder="GCC headcount, Atlas, peers"
        hint="Searches every field's name, its hint and the words currently in it. Sections with no match are hidden."
        value={search.query}
        onChange={search.setQuery}
        status={
          search.searching
            ? `${shown} of ${total} sections`
            : undefined
        }
      />

      {search.searching && shown === 0 ? (
        <NoSearchMatches
          query={search.query}
          what="fields"
          hint="Try one word from the text as it appears on the public page."
        />
      ) : null}

      {blocked ? (
        /* Form and words, never colour alone: this palette carries no danger hue.
           See tokens.css. */
        <p className="ansr-field-error text-sm">
          Something below is empty or over its limit. Publishing is blocked until it
          is fixed.
          {/* The gate is checked against the whole draft, so it can fire for a field
              the current query has hidden. Saying so is cheaper than a hunt. */}
          {search.searching ? " It may be in a section the search is hiding." : null}
        </p>
      ) : null}

      {sections.hero ? (
        <HeroEditor hero={hero} onChange={updateHeroCopy} />
      ) : null}

      {sections.close ? (
        <CloseEditor close={close} onChange={updateCloseCopy} />
      ) : null}

      {sections.impact ? (
        <ImpactEditor
          stats={impactStats}
          onAdd={addImpactStat}
          onChange={updateImpactStat}
          onRemove={removeImpactStat}
          onMove={moveImpactStat}
        />
      ) : null}

      {sections.functions ? (
        <FunctionsEditor values={commonFunctions} onChange={setCommonFunctions} />
      ) : null}

      {/* Directly after the function tags, because that is the order the two blocks appear
          in on the peer landscape — the tags say which functions run from India GCCs and
          the map says which roles those functions hire. */}
      {sections.roleMap ? (
        <RoleMapEditor map={roleMap} onChange={setRoleMap} />
      ) : null}

      {sections.logos ? (
        <LogoEditor
          logos={logos}
          onAdd={addLogo}
          onChange={updateLogo}
          onRemove={removeLogo}
          onMove={moveLogo}
        />
      ) : null}

      <CopyEditor copy={copy} onChange={updatePublicCopy} search={search} />
    </div>
  );
}

/**
 * ANSR's own impact figures.
 *
 * Extracted from `SiteContentManager` when the search arrived, and only because it was
 * the one section still spelled out inline while its four neighbours were components.
 * A conditional wrapped round sixty lines of JSX is a section you cannot see the shape
 * of; five sibling one-liners is the shape.
 */
function ImpactEditor({
  stats,
  onAdd,
  onChange,
  onRemove,
  onMove,
}: {
  stats: readonly ImpactStat[];
  onAdd: () => void;
  onChange: (id: string, patch: Partial<Omit<ImpactStat, "id">>) => void;
  onRemove: (id: string) => void;
  onMove: (index: number, delta: number) => void;
}) {
  return (
    <AdminSection
      id="impact-figures"
      title="Impact figures"
      description={
        <p>
          ANSR&rsquo;s own numbers, shown as one row on the dark band. The order here
          is the order a visitor reads them in, left to right. Type the figure exactly
          as it should appear, including any suffix — &ldquo;225K+&rdquo;,
          &ldquo;$2.5B+&rdquo;. Nothing here is calculated from the company data or
          checked against it.
        </p>
      }
    >
      {stats.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-text-muted">
          No figures. The impact band is hidden on the public page until there is at
          least one.
        </p>
      ) : (
        <ul className="divide-y divide-border-subtle">
          {stats.map((stat, index) => (
            <ImpactRow
              key={stat.id}
              stat={stat}
              index={index}
              total={stats.length}
              onChange={(patch) => onChange(stat.id, patch)}
              onRemove={() => onRemove(stat.id)}
              onMove={(delta) => onMove(index, delta)}
            />
          ))}
        </ul>
      )}

      <div className="border-t border-border-subtle px-5 py-4">
        <Button
          variant="outline"
          size="sm"
          disabled={stats.length >= MAX_STATS}
          // Wrapped rather than passed straight through: `addImpactStat` returns the
          // new id and takes nothing, so handing it to `onClick` would feed it a mouse
          // event and make its signature a lie the next time it grows a parameter.
          onClick={() => onAdd()}
        >
          Add a figure
        </Button>
        {stats.length >= MAX_STATS ? (
          <p className="mt-2 text-xs text-text-muted">
            Six is the maximum. Past that the row either wraps to a second line of one
            figure or shrinks them all below the size that makes a figure read as a
            figure.
          </p>
        ) : null}
      </div>
    </AdminSection>
  );
}

function HeroEditor({
  hero,
  onChange,
}: {
  hero: HeroCopy;
  onChange: (patch: Partial<HeroCopy>) => void;
}) {
  return (
    <AdminSection
      id="hero-copy"
      title="Hero"
      description={
        <p>
          Three elements, and there is no fourth — no eyebrow, no button, no proof
          line. The product name and the tagline are the two halves of the
          page&rsquo;s only <code>h1</code>; the supporting line sits under both.
          ANSR&rsquo;s own logo is drawn above them and is not editable here.
        </p>
      }
    >
      <div className="flex flex-col gap-5 px-5 py-5">
        {/* **The headline is TWO fields, and it used to be one.** A single free-text
            title was searched for the literal `GCC ATLAS` and re-set the match in the
            product's own styling — which failed silently on any respelling and looked
            deliberate when it did. Splitting it is what the project owner asked for and
            it deletes that class of bug: the name is the field, so it cannot be spelled
            wrong, and the two halves can be sized independently. */}
        <TextField
          label="Product name"
          hint={`The first line of the headline, at up to ${MAX.productName} characters. It is drawn on one line and never wraps, so a longer name runs off the band rather than breaking. Do not put "ANSR" in it — the brand is stated by the logo above, and a name containing it opens the line with two names.`}
          value={hero.productName}
          error={lengthError(hero.productName, MAX.productName)}
          onChange={(value) => onChange({ productName: value })}
        />
        <TextField
          label="Tagline"
          hint={`The second line, at up to ${MAX.tagline} characters. It is sized to draw a little wider than the product name above it, so a longer tagline wraps to two lines rather than shrinking. Keep it to about the shipped length and the headline stays two lines.`}
          value={hero.tagline}
          error={lengthError(hero.tagline, MAX.tagline)}
          onChange={(value) => onChange({ tagline: value })}
        />
        <TextField
          label="Supporting line"
          hint={`One sentence under the headline, at up to ${MAX.lead} characters. Write the company count the way it should read — it is text, not a total, so it does not have to match the ${new Intl.NumberFormat("en-US").format(1834)} companies in the data exactly.`}
          value={hero.lead}
          error={lengthError(hero.lead, MAX.lead)}
          onChange={(value) => onChange({ lead: value })}
        />
      </div>
    </AdminSection>
  );
}

/**
 * The two result screens that draw the close, in the order a visitor reaches them, each
 * paired with the field holding its link.
 *
 * **A table rather than two hand-written field blocks, and that is what makes the "use
 * everywhere" button honest.** The button's promise is "every screen", so it has to be
 * able to enumerate them; written out twice, a third screen gaining a close would get a
 * field and quietly not get copied into. The keys are checked against `CloseCopy` by the
 * type, so a renamed field is a compile error rather than a control that edits nothing.
 *
 * `label` is what the admin reads and it deliberately matches the view switch's own
 * wording — "Peer Landscape" and "Function Metrics" — because that is what the tab says
 * and therefore what an admin describing the link would call it. It must not contain the
 * words "Button" or "Supporting line": Playwright's `getByLabel` matches on substring, so
 * either would make the two existing fields in this section ambiguous. See `docs/traps.md`.
 */
const CTA_LINK_FIELDS = [
  {
    key: "ctaHrefPeers",
    label: "Peer Landscape link",
    where: "the peer landscape",
  },
  {
    key: "ctaHrefFunctions",
    label: "Function Metrics link",
    where: "the function metrics",
  },
] as const satisfies ReadonlyArray<{
  key: keyof CloseCopy;
  label: string;
  where: string;
}>;

/**
 * A CTA link's own validator, and it is separate from `lengthError` for one reason:
 * **blank is legal here and blank is an error everywhere else on this page.**
 *
 * Every other field on this page is required, so `lengthError` reads an empty value as
 * "the public page has no fallback". These two have one — a blank link falls through to
 * `NEXT_PUBLIC_GCC_CTA_URL` and then to ansr.com, see `resolveCtaHref` — so an empty field
 * is the admin declining to override, not a mistake.
 *
 * The rule quoted is the gate's own: `isCtaUrl` and `CTA_URL_MAX_LENGTH` are the same two
 * things `closeCopySchema` refines on, imported rather than restated, so this cannot tell
 * an admin a link is fine that the publish then refuses.
 */
function ctaLinkError(value: string): string | undefined {
  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;
  if (trimmed.length > CTA_URL_MAX_LENGTH) {
    return `${trimmed.length} characters. The limit is ${CTA_URL_MAX_LENGTH}; publishing is blocked above it.`;
  }
  if (!isCtaUrl(trimmed)) {
    return "Must be a full link starting with https:// — paste it from the browser's address bar, with any tracking parameters left on the end.";
  }
  return undefined;
}

/**
 * The closing call to action, on both result screens.
 *
 * **Two strings and one link PER SCREEN, and there is still no heading field.** The band
 * had a heading — "Unlock the full GCC landscape" — and it was removed so the supporting
 * line and the button carry the band on their own. A field an admin can fill that nothing
 * draws is worse than no field, so restoring the heading is a schema addition and a
 * component change together.
 *
 * **The links are here rather than on a tab of their own, because they are part of this
 * band and nothing else in the product links out.** The band's two strings and the address
 * they lead to are one editorial decision — changing "See the full report" to name a
 * specific offer and pointing it at that offer's page is one act — so splitting them
 * across two pages would mean doing half of it and publishing.
 *
 * The hints name where the words appear rather than describing them, because this is the
 * one editable band an admin cannot see from the entry point — it is three clicks into
 * the result screens, behind the form.
 */
function CloseEditor({
  close,
  onChange,
}: {
  close: CloseCopy;
  onChange: (patch: Partial<CloseCopy>) => void;
}) {
  /**
   * Copy one screen's link onto every screen.
   *
   * Built here rather than in the row so the patch is ONE edit covering both fields: two
   * calls would be two entries in the autosave and, more to the point, a moment where the
   * two screens disagree. `Object.fromEntries` over the table is what keeps the promise
   * true for a third screen that has not been added yet.
   */
  const applyEverywhere = (value: string) =>
    onChange(
      Object.fromEntries(
        CTA_LINK_FIELDS.map((field) => [field.key, value]),
      ) as Partial<CloseCopy>,
    );

  return (
    <AdminSection
      id="close-copy"
      title="Closing call to action"
      description={
        <p>
          The last band on both result screens — the peer landscape and the function
          metrics — over the blurred panel of withheld detail. It is the only link out
          of the tool. There is no heading: these two elements are the whole band.
        </p>
      }
    >
      <div className="flex flex-col gap-5 px-5 py-5">
        <TextField
          label="Supporting line"
          hint={`The band's own statement, set large, light and centred at up to ${MAX.closeBody} characters. Past that it runs to a fourth line and pushes the button off the first screenful on a phone.`}
          value={close.body}
          error={lengthError(close.body, MAX.closeBody)}
          onChange={(value) => onChange({ body: value })}
        />
        <TextField
          label="Button"
          hint={`Sits in a pill that must not wrap, so keep it under ${MAX.closeLabel} characters. Say what pressing it does — the link opens in the parent window rather than inside the embedded tool.`}
          value={close.ctaLabel}
          error={lengthError(close.ctaLabel, MAX.closeLabel)}
          onChange={(value) => onChange({ ctaLabel: value })}
        />

        {/* Separated from the two strings by a rule and its own explanation, because the
            fields below are the only ones on this page whose value is not words a visitor
            reads — and the only ones where leaving the box empty is a real answer. */}
        <div className="flex flex-col gap-5 border-t border-border-subtle pt-5">
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-medium text-text">Where the button goes</h3>
            <p className="text-xs text-text-muted">
              One link per screen, so the two presses can be told apart in analytics —
              put each screen&rsquo;s own tracking parameters on the end. Leave a box
              empty to use the link configured for the deployment, which is
              ansr.com unless it has been set.
            </p>
          </div>

          {CTA_LINK_FIELDS.map((field) => (
            <CtaLinkRow
              key={field.key}
              label={field.label}
              where={field.where}
              value={close[field.key]}
              matchesEveryScreen={CTA_LINK_FIELDS.every(
                (other) => close[other.key].trim() === close[field.key].trim(),
              )}
              onChange={(value) => onChange({ [field.key]: value })}
              onApplyEverywhere={() => applyEverywhere(close[field.key].trim())}
            />
          ))}
        </div>
      </div>
    </AdminSection>
  );
}

/**
 * One screen's link, and the button that copies it to the others.
 *
 * **The button is per ROW rather than one button for the section, and that is what makes
 * it unambiguous.** A single "use the same link everywhere" control has to pick a source,
 * and whichever it picked would be a rule an admin has to know; a button attached to a
 * field copies THAT field, which is legible from where the press happens. It also scales:
 * a third screen brings its own.
 *
 * **Disabled on a blank value and on a value already everywhere**, with the reason on the
 * button rather than beside it. Enabled-and-inert is the worse option here: the press
 * would look identical to a real one and the admin would have no way to tell whether the
 * link had been copied or the field had been empty.
 *
 * `title` rather than a second visible string, and `aria-label` carrying the screen name,
 * because two buttons reading "Use everywhere" are two identically-named controls to a
 * screen-reader user — the same defect the impact rows solved by putting the figure's
 * identity in every one of their accessible names.
 */
function CtaLinkRow({
  label,
  where,
  value,
  matchesEveryScreen,
  onChange,
  onApplyEverywhere,
}: {
  label: string;
  where: string;
  value: string;
  matchesEveryScreen: boolean;
  onChange: (value: string) => void;
  onApplyEverywhere: () => void;
}) {
  const error = ctaLinkError(value);
  const blank = value.trim().length === 0;
  // A broken link must not be copyable: one bad paste spread across every screen is the
  // same mistake made twice, and the publish would then name two fields instead of one.
  const disabled = blank || matchesEveryScreen || error !== undefined;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
      <TextField
        label={label}
        className="flex-1"
        optional
        hint={`Where the button leads from ${where}. The full address, tracking parameters included.`}
        placeholder="https://www.ansr.com/…?utm_source=atlas"
        value={value}
        error={error}
        inputMode="url"
        onChange={onChange}
      />

      <div className="shrink-0 sm:pt-6">
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          aria-label={`Use the ${where} link on every screen`}
          title={
            blank
              ? "Enter a link first."
              : error !== undefined
                ? "Fix the link first."
                : matchesEveryScreen
                  ? "Already used on every screen."
                  : "Copy this link to every screen."
          }
          onClick={onApplyEverywhere}
        >
          Use everywhere
        </Button>
      </div>
    </div>
  );
}

function ImpactRow({
  stat,
  index,
  total,
  onChange,
  onRemove,
  onMove,
}: {
  stat: ImpactStat;
  index: number;
  total: number;
  onChange: (patch: Partial<Omit<ImpactStat, "id">>) => void;
  onRemove: () => void;
  onMove: (delta: number) => void;
}) {
  // Every control in this row needs the figure's identity in its accessible name,
  // or a screen-reader user hears six identically-named "Figure" inputs and four
  // identically-named buttons. The label is the honest identifier; before one is
  // typed, the position is.
  const which = stat.label.trim() || stat.value.trim() || `figure ${index + 1}`;

  return (
    <li className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-start">
      <div className="grid flex-1 gap-4 sm:grid-cols-3">
        <TextField
          label="Figure"
          value={stat.value}
          error={lengthError(stat.value, MAX.value)}
          onChange={(value) => onChange({ value })}
        />
        <TextField
          label="Label"
          className="sm:col-span-2"
          value={stat.label}
          error={lengthError(stat.label, MAX.label)}
          onChange={(value) => onChange({ label: value })}
        />
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:pt-6">
        <Button
          variant="outline"
          size="sm"
          disabled={index === 0}
          onClick={() => onMove(-1)}
        >
          <span aria-hidden="true">↑</span>
          <span className="sr-only">Move {which} earlier</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={index === total - 1}
          onClick={() => onMove(1)}
        >
          <span aria-hidden="true">↓</span>
          <span className="sr-only">Move {which} later</span>
        </Button>
        {/* `.ansr-destructive` is the palette's form-based destructive treatment —
            an outlined control against a filled primary — because orange belongs to
            the CTA and nothing else in the set reads as danger. It carries the verb
            and the subject, which is the other half of what that pattern requires;
            no confirmation step, because this is reversible until publish and the
            draft banner says so. */}
        <button
          type="button"
          onClick={onRemove}
          className="ansr-destructive inline-flex h-8 items-center px-3 text-sm"
        >
          Remove
          <span className="sr-only"> {which}</span>
        </button>
      </div>
    </li>
  );
}

/* ==========================================================================
   The three collections that moved out of code.

   **Rows are `div`s here rather than a list, and that is deliberate.** The impact
   figures above are a `<ul>` because they are one ordered row of figures a visitor
   reads as a set; each row below is a group of labelled form controls, and a list
   wrapper adds nothing a screen reader needs that the labels do not already carry.
   It also keeps `listitem` meaning one thing on this page — the impact figures —
   which is what the specs count.
   ========================================================================== */

/**
 * The function tags on the peer view.
 *
 * **Editable at all only because the block claims nothing.** There is no per-company
 * function record in this dataset, so the tags carry no numeral, no bar and no
 * ordering claim — the section heading above them is what makes them a statement
 * about India GCCs in general, and that heading stays in code for exactly that
 * reason. What an admin controls is the wording and the set.
 */
function FunctionsEditor({
  values,
  onChange,
}: {
  values: readonly string[];
  onChange: (values: string[]) => void;
}) {
  function move(index: number, delta: number) {
    const next = [...values];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved as string);
    onChange(next);
  }

  return (
    <AdminSection
      id="common-functions"
      title="Function list"
      description={
        <p>
          The tags under &ldquo;Common functions run from the India GCCs&rdquo; on the
          peer landscape. They are a claim about India GCCs in general, not about the
          companies above them, so keep each one a function rather than a
          company&rsquo;s department. The set wraps as one row with no columns, so an item much longer
          than the rest is the one that decides the layout — the shipped eight sit
          between 16 and 28 characters.
        </p>
      }
    >
      <div className="divide-y divide-border-subtle">
        {values.map((value, index) => {
          const which = value.trim() || `function ${index + 1}`;
          return (
            <div
              key={index}
              className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-start"
            >
              <TextField
                className="flex-1"
                label={`Function ${index + 1}`}
                max={MAX.functionItem}
                value={value}
                error={lengthError(value, MAX.functionItem)}
                onChange={(text) =>
                  onChange(values.map((held, i) => (i === index ? text : held)))
                }
              />
              <div className="flex shrink-0 items-center gap-2 sm:pt-6">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  <span aria-hidden="true">↑</span>
                  <span className="sr-only">Move {which} up</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={index === values.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <span aria-hidden="true">↓</span>
                  <span className="sr-only">Move {which} down</span>
                </Button>
                {/* One is the floor: the block is drawn from this list, and an empty
                    one leaves a section heading with nothing under it. */}
                <button
                  type="button"
                  disabled={values.length <= 1}
                  onClick={() => onChange(values.filter((_, i) => i !== index))}
                  className="ansr-destructive inline-flex h-8 items-center px-3 text-sm disabled:opacity-50"
                >
                  Remove
                  <span className="sr-only"> {which}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-border-subtle px-5 py-4">
        <Button
          variant="outline"
          size="sm"
          disabled={values.length >= MAX_FUNCTIONS}
          onClick={() => onChange([...values, ""])}
        >
          Add a function
        </Button>
        {values.length >= MAX_FUNCTIONS ? (
          <p className="mt-2 text-xs text-text-muted">
            Twelve is the maximum. Past that the set stops reading as a summary of
            what a GCC does and starts reading as an inventory.
          </p>
        ) : null}
      </div>
    </AdminSection>
  );
}

/* ==========================================================================
   The role map
   ========================================================================== */

/**
 * The role map's two editors, sharing one draft mutator.
 *
 * **Two `AdminSection`s and ONE `onChange`, because the schema's rules span both.** A role
 * names a family and a demand step, and the gate refuses an unknown `familyId`, a `demand`
 * past the end of the scale and two families in one colour. So both editors compute a whole
 * next map and hand it over — with a mutator each, deleting a family and reassigning its
 * roles would leave the draft in a state the publish gate rejects and the form would be
 * showing an error about a change it had just made itself.
 *
 * **Sections rather than one, because an admin comes here for one of two jobs.** Renaming a
 * group or recolouring the legend is a five-second edit on seven rows; moving a bubble is a
 * different task on thirty-six. A single section would have put the seven inside the
 * thirty-six.
 */
function RoleMapEditor({
  map,
  onChange,
}: {
  map: RoleMap;
  onChange: (next: RoleMap) => void;
}) {
  return (
    <>
      <RoleFamilyEditor map={map} onChange={onChange} />
      <RoleListEditor map={map} onChange={onChange} />
      <RoleDemandEditor map={map} onChange={onChange} />
    </>
  );
}

/** A new family starts on the lowest colour nothing else is using. */
function freeTone(map: RoleMap): number {
  const taken = new Set(map.families.map((family) => family.tone));
  for (let tone = 1; tone <= ROLE_TONES; tone += 1) {
    if (!taken.has(tone)) return tone;
  }
  return 1;
}

/**
 * The colour a `tone` draws, as a swatch.
 *
 * Reads the CSS variable rather than restating a value, so the admin preview cannot drift
 * from what the public screen paints and `tokens.css` stays the only place a colour is
 * named. It is the one place in admin that draws a public ink, and that is the point: an
 * admin choosing between twelve colours has to see them.
 */
function ToneSwatch({ tone, size = "md" }: { tone: number; size?: "sm" | "md" }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block shrink-0 rounded-full",
        size === "sm" ? "size-2.5" : "size-4",
      )}
      style={{ backgroundColor: `var(--ansr-role-${tone})` }}
    />
  );
}

/**
 * The families: their names, their colours, and their order in the legend.
 *
 * **The colour is a picker over twelve named inks and not a field, because an admin may not
 * type a hex.** `tokens.css` is the single source of truth for what this product draws, and
 * twelve is how many categorical inks it defines — see `ROLE_TONES`. A colour already spoken
 * for is offered as disabled rather than hidden, so the picker shows the whole palette and
 * says why a slot is unavailable.
 *
 * **The first EIGHT are the source slide's own and the last four are not, and the description
 * says which.** An admin adding a ninth group is leaving the graphic ANSR supplied, which is
 * a thing worth knowing at the moment of doing it and is invisible from the swatch.
 */
function RoleFamilyEditor({
  map,
  onChange,
}: {
  map: RoleMap;
  onChange: (next: RoleMap) => void;
}) {
  const usage = new Map<string, number>();
  for (const role of map.roles) {
    usage.set(role.familyId, (usage.get(role.familyId) ?? 0) + 1);
  }

  function move(index: number, delta: number) {
    const families = [...map.families];
    const target = index + delta;
    if (target < 0 || target >= families.length) return;
    const [moved] = families.splice(index, 1);
    families.splice(target, 0, moved as RoleFamily);
    onChange({ ...map, families });
  }

  return (
    <AdminSection
      id="role-families"
      title="Role groups"
      description={
        <>
          <p>
            The groups on the role map, and the colour each one&rsquo;s bubbles are drawn
            in. This order is the order the legend reads, left to right; it does not move
            any bubble, because a group&rsquo;s colour is stored on the group rather than
            taken from its position. Colours come from a fixed set of twelve &mdash; each
            one is measured to stay legible at the smallest bubble size and to be
            distinguishable from the other eleven, so they are chosen rather than typed.
          </p>
          <p>
            The first eight are the colours of the slide this chart reproduces. The last
            four are additions, so a ninth group needs no code change &mdash; but a legend
            is something a reader holds in their head, and seven is what the source uses.
            Adding groups past that works; it reads harder.
          </p>
        </>
      }
    >
      <div className="divide-y divide-border-subtle">
        {map.families.map((family, index) => {
          const which = family.name.trim() || `group ${index + 1}`;
          const inUse = usage.get(family.id) ?? 0;
          return (
            <div
              key={family.id}
              className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-start"
            >
              <div className="grid flex-1 gap-4 sm:grid-cols-2">
                <TextField
                  label={`Group ${index + 1}`}
                  max={MAX.roleFamilyName}
                  value={family.name}
                  error={lengthError(family.name, MAX.roleFamilyName)}
                  onChange={(name) =>
                    onChange({
                      ...map,
                      families: map.families.map((held) =>
                        held.id === family.id ? { ...held, name } : held,
                      ),
                    })
                  }
                />
                <AdminField
                  label={`Colour for ${which}`}
                  hint="Eight fixed inks. One group each."
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    {Array.from({ length: ROLE_TONES }, (_, i) => i + 1).map((tone) => {
                      const takenBy = map.families.find(
                        (other) => other.tone === tone && other.id !== family.id,
                      );
                      const chosen = family.tone === tone;
                      return (
                        <button
                          key={tone}
                          type="button"
                          disabled={Boolean(takenBy)}
                          aria-pressed={chosen}
                          /* The name carries the group AND the conflict, because a swatch
                             has no text of its own and "colour 5" means nothing to
                             somebody who cannot see it. */
                          title={
                            takenBy
                              ? `Colour ${tone} — already used by ${takenBy.name || "another group"}`
                              : `Colour ${tone}`
                          }
                          onClick={() =>
                            onChange({
                              ...map,
                              families: map.families.map((held) =>
                                held.id === family.id ? { ...held, tone } : held,
                              ),
                            })
                          }
                          className={cn(
                            "inline-flex size-8 items-center justify-center rounded-md border",
                            chosen
                              ? "border-accent-teal bg-surface-subtle"
                              : "border-transparent",
                            takenBy ? "cursor-not-allowed opacity-30" : "hover:bg-surface-subtle",
                          )}
                        >
                          <ToneSwatch tone={tone} />
                          <span className="sr-only">
                            {chosen ? `Colour ${tone}, selected` : `Use colour ${tone}`}
                            {takenBy ? `, already used by ${takenBy.name}` : ""}
                            {` for ${which}`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </AdminField>
              </div>

              <div className="flex shrink-0 items-center gap-2 sm:pt-6">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  <span aria-hidden="true">↑</span>
                  <span className="sr-only">Move {which} up</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={index === map.families.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <span aria-hidden="true">↓</span>
                  <span className="sr-only">Move {which} down</span>
                </Button>
                {/* **Refused here rather than at the gate, which is the taxonomy rule.**
                    The schema can only say a reference is broken; this can say which four
                    roles are using it, which is the difference between an error and an
                    instruction. Widening or silently dropping the roles would be worse —
                    see `removeBusinessType`. */}
                <button
                  type="button"
                  disabled={inUse > 0 || map.families.length <= 1}
                  title={
                    inUse > 0
                      ? `${inUse} ${inUse === 1 ? "role uses" : "roles use"} this group. Move them first.`
                      : undefined
                  }
                  onClick={() =>
                    onChange({
                      ...map,
                      families: map.families.filter((held) => held.id !== family.id),
                    })
                  }
                  className="ansr-destructive inline-flex h-8 items-center px-3 text-sm disabled:opacity-50"
                >
                  Remove
                  <span className="sr-only"> {which}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-border-subtle px-5 py-4">
        <Button
          variant="outline"
          size="sm"
          disabled={map.families.length >= ROLE_TONES}
          onClick={() =>
            onChange({
              ...map,
              families: [
                ...map.families,
                {
                  id: uniqueSlug(
                    "group",
                    new Set(map.families.map((family) => family.id)),
                  ),
                  name: "",
                  tone: freeTone(map),
                },
              ],
            })
          }
        >
          Add a group
        </Button>
        {map.families.length >= ROLE_TONES ? (
          <p className="mt-2 text-xs text-text-muted">
            Twelve is the maximum, because there are twelve colours. Past that two groups
            would share one, which is the one thing a colour-coded legend cannot survive.
          </p>
        ) : null}
      </div>
    </AdminSection>
  );
}

/**
 * The bubbles themselves.
 *
 * **Every row is a placement, and the two position fields are the thing to explain rather
 * than hide.** `complexity` is the one real axis and is never shown to a visitor as a
 * number; `lane` is free room with no meaning at all, and exists so two labels do not
 * collide. An admin who does not know that will read them as scores, so the description
 * says it before the first field does.
 */
function RoleListEditor({
  map,
  onChange,
}: {
  map: RoleMap;
  onChange: (next: RoleMap) => void;
}) {
  const bandLabels: Record<RoleBand, string> = {
    emerging: BAND_OPTIONS[0],
    established: BAND_OPTIONS[1],
  };
  const bandOf = (label: string): RoleBand =>
    label === BAND_OPTIONS[0] ? "emerging" : "established";

  const patch = (id: string, next: Partial<Omit<Role, "id">>) =>
    onChange({
      ...map,
      roles: map.roles.map((role) => (role.id === id ? { ...role, ...next } : role)),
    });

  return (
    <AdminSection
      id="role-map-roles"
      title="Roles on the map"
      description={
        <>
          <p>
            One row per bubble. <strong>Group</strong> decides its colour,{" "}
            <strong>band</strong> which of the two fields it sits in, and{" "}
            <strong>demand</strong> how big it is drawn.
          </p>
          <p>
            The two position numbers are placement and nothing else.{" "}
            <strong>Complexity</strong> is where it sits left to right on the one real axis
            &mdash; the axis is drawn with &ldquo;Lower&rdquo; and &ldquo;Higher&rdquo; at
            its ends and no numbers anywhere, so this figure is never shown to a visitor
            and is not a score. <strong>Height</strong> is where it sits top to bottom, and
            carries no meaning at all: it is there so two names do not overlap, exactly as
            you would nudge a label in a slide. <strong>Name side</strong> puts the name
            after the bubble or before it, for the same reason.
          </p>
          <p>
            The map is drawn as a field on wide screens only; narrower ones read the same
            roles as a list grouped by colour, where neither position matters. So a
            placement is worth getting right, and nothing breaks if it is not.
          </p>
        </>
      }
    >
      {map.roles.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-text-muted">
          No roles. The role map is hidden on the public page until there is at least one.
        </p>
      ) : (
        <div className="divide-y divide-border-subtle">
          {/* The canvas leads and the table follows, because placing is the job and typing a
              coordinate is the fallback — see `RoleMapCanvas`. Both write the same fields
              through the same mutator, so neither can get ahead of the other. */}
          <RoleMapCanvas map={map} bandLabels={bandLabels} onChange={onChange} />
          {map.roles.map((role, index) => {
            const family = map.families.find((held) => held.id === role.familyId);
            const which = role.name.trim() || `role ${index + 1}`;
            return (
              <div
                key={role.id}
                className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-start"
              >
                <div className="grid flex-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <TextField
                    className="sm:col-span-2 lg:col-span-1"
                    label={`Role ${index + 1}`}
                    hint="Drawn beside its own bubble."
                    max={MAX.roleName}
                    value={role.name}
                    error={lengthError(role.name, MAX.roleName)}
                    onChange={(name) => patch(role.id, { name })}
                  />
                  <SelectField
                    label={`Group ${index + 1}`}
                    hint={
                      family
                        ? `Drawn in colour ${family.tone}.`
                        : "This group no longer exists."
                    }
                    value={family?.name ?? ""}
                    options={map.families.map((held) => held.name)}
                    error={family ? undefined : "Choose a group that exists."}
                    onChange={(name) => {
                      const next = map.families.find((held) => held.name === name);
                      if (next) patch(role.id, { familyId: next.id });
                    }}
                  />
                  <SelectField
                    label={`Band ${index + 1}`}
                    hint="Which of the two fields."
                    value={bandLabels[role.band]}
                    options={BAND_OPTIONS}
                    onChange={(label) => patch(role.id, { band: bandOf(label) })}
                  />
                  <SelectField
                    label={`Demand ${index + 1}`}
                    hint="Bubble size. Weakest first."
                    value={map.demandLevels[role.demand - 1] ?? ""}
                    options={[...map.demandLevels]}
                    error={
                      role.demand <= map.demandLevels.length
                        ? undefined
                        : "Past the end of the demand scale."
                    }
                    onChange={(level) => {
                      const step = map.demandLevels.indexOf(level);
                      if (step >= 0) patch(role.id, { demand: step + 1 });
                    }}
                  />
                  <TextField
                    label={`Complexity ${index + 1}`}
                    hint="0 to 100, left to right. Never shown."
                    inputMode="numeric"
                    value={String(role.complexity)}
                    error={positionError("complexity", role.complexity)}
                    onChange={(text) =>
                      patch(role.id, { complexity: toPosition(text) })
                    }
                  />
                  <TextField
                    label={`Height ${index + 1}`}
                    hint="0 to 100, top to bottom. No meaning."
                    inputMode="numeric"
                    value={String(role.lane)}
                    error={positionError("lane", role.lane)}
                    onChange={(text) => patch(role.id, { lane: toPosition(text) })}
                  />
                  <SelectField
                    label={`Name side ${index + 1}`}
                    hint="Which side of the bubble."
                    value={SIDE_LABELS[role.labelSide]}
                    options={[SIDE_LABELS.trail, SIDE_LABELS.lead]}
                    onChange={(label) =>
                      patch(role.id, {
                        labelSide: label === SIDE_LABELS.lead ? "lead" : "trail",
                      })
                    }
                  />
                </div>

                <div className="flex shrink-0 items-center gap-2 sm:pt-6">
                  <button
                    type="button"
                    onClick={() =>
                      onChange({
                        ...map,
                        roles: map.roles.filter((held) => held.id !== role.id),
                      })
                    }
                    className="ansr-destructive inline-flex h-8 items-center px-3 text-sm"
                  >
                    Remove
                    <span className="sr-only"> {which}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="border-t border-border-subtle px-5 py-4">
        <Button
          variant="outline"
          size="sm"
          disabled={map.roles.length >= MAX_ROLES || map.families.length === 0}
          onClick={() =>
            onChange({
              ...map,
              /* Appended, and seeded mid-field rather than at 0,0 — a new bubble in the
                 corner reads as broken, and the middle is where an admin can see it before
                 deciding where it belongs. The first group and the weakest demand step are
                 the two safe defaults: both exist by construction. */
              roles: [
                ...map.roles,
                {
                  id: uniqueSlug("role", new Set(map.roles.map((role) => role.id))),
                  name: "",
                  familyId: map.families[0]?.id ?? "",
                  band: "emerging",
                  complexity: 50,
                  lane: 50,
                  labelSide: "trail",
                  demand: 1,
                },
              ],
            })
          }
        >
          Add a role
        </Button>
        {map.roles.length >= MAX_ROLES ? (
          <p className="mt-2 text-xs text-text-muted">
            Sixty is the maximum. The field is sparse by construction and a name beside
            every bubble is what makes it legible, so a longer list is a chart that has
            stopped being readable rather than one that shows more.
          </p>
        ) : null}
      </div>
    </AdminSection>
  );
}

/**
 * The demand scale.
 *
 * **Its own section, and the warning is the reason.** `role.demand` is a step INTO this
 * list, so reordering it re-rates every role on the map at once and renaming a step renames
 * it everywhere. That is the change here with the largest effect and the least visible
 * trace, which is why the publish diff reports this list with both sides spelled out.
 */
function RoleDemandEditor({
  map,
  onChange,
}: {
  map: RoleMap;
  onChange: (next: RoleMap) => void;
}) {
  const perStep = new Map<number, number>();
  for (const role of map.roles) {
    perStep.set(role.demand, (perStep.get(role.demand) ?? 0) + 1);
  }

  function move(index: number, delta: number) {
    const demandLevels = [...map.demandLevels];
    const target = index + delta;
    if (target < 0 || target >= demandLevels.length) return;
    const [moved] = demandLevels.splice(index, 1);
    demandLevels.splice(target, 0, moved as string);
    onChange({ ...map, demandLevels });
  }

  return (
    <AdminSection
      id="role-demand"
      title="Hiring demand scale"
      description={
        <>
          <p>
            The words under the bubble-size key, weakest first. A bubble&rsquo;s size is its
            step on this scale, and these are the only statement of what a size means &mdash;
            the map states no figure for demand anywhere, because the source does not hold
            one.
          </p>
          <p>
            <strong>Reordering this list re-rates every role.</strong> Each role stores which
            step it is on, not which word, so moving &ldquo;High&rdquo; above
            &ldquo;Moderate&rdquo; swaps the size of every bubble on both. Renaming a step is
            safe and changes only the key.
          </p>
        </>
      }
    >
      <div className="divide-y divide-border-subtle">
        {map.demandLevels.map((level, index) => {
          const which = level.trim() || `step ${index + 1}`;
          const used = perStep.get(index + 1) ?? 0;
          return (
            <div
              key={index}
              className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-start"
            >
              <TextField
                className="flex-1"
                label={`Step ${index + 1}${index === 0 ? " (smallest bubble)" : index === map.demandLevels.length - 1 ? " (largest bubble)" : ""}`}
                hint={`${used} ${used === 1 ? "role is" : "roles are"} on this step.`}
                max={MAX.roleDemandLevel}
                value={level}
                error={lengthError(level, MAX.roleDemandLevel)}
                onChange={(text) =>
                  onChange({
                    ...map,
                    demandLevels: map.demandLevels.map((held, i) =>
                      i === index ? text : held,
                    ),
                  })
                }
              />
              <div className="flex shrink-0 items-center gap-2 sm:pt-6">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  <span aria-hidden="true">↑</span>
                  <span className="sr-only">Move {which} up</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={index === map.demandLevels.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <span aria-hidden="true">↓</span>
                  <span className="sr-only">Move {which} down</span>
                </Button>
                {/* Three is the floor the schema sets: below it an ordinal scale is a
                    boolean. Removing the LAST step would also orphan every role on it, so
                    the button says how many that is rather than letting the gate say it. */}
                <button
                  type="button"
                  disabled={map.demandLevels.length <= MIN_DEMAND_LEVELS || used > 0}
                  title={
                    used > 0
                      ? `${used} ${used === 1 ? "role is" : "roles are"} on this step. Move them first.`
                      : undefined
                  }
                  onClick={() =>
                    onChange({
                      ...map,
                      demandLevels: map.demandLevels.filter((_, i) => i !== index),
                    })
                  }
                  className="ansr-destructive inline-flex h-8 items-center px-3 text-sm disabled:opacity-50"
                >
                  Remove
                  <span className="sr-only"> {which}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-border-subtle px-5 py-4">
        <Button
          variant="outline"
          size="sm"
          disabled={map.demandLevels.length >= MAX_DEMAND_LEVELS}
          onClick={() =>
            onChange({ ...map, demandLevels: [...map.demandLevels, ""] })
          }
        >
          Add a step
        </Button>
        {map.demandLevels.length >= MAX_DEMAND_LEVELS ? (
          <p className="mt-2 text-xs text-text-muted">
            Five is the maximum. Past that two neighbouring bubble sizes stop being
            distinguishable, so the extra step would be drawn but not readable.
          </p>
        ) : null}
      </div>
    </AdminSection>
  );
}

/** A position as a whole number in range, on `toDimension`'s argument about `NaN`. */
function toPosition(text: string): number {
  const parsed = Number.parseInt(text.trim(), 10);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(100, Math.max(0, parsed));
}

/** The schema's own bound and message, per position field. */
function positionError(
  field: "complexity" | "lane",
  value: number,
): string | undefined {
  const parsed = roleSchema.shape[field].safeParse(value);
  return parsed.success ? undefined : parsed.error.issues[0]?.message;
}

/**
 * The customer strip on the entry point.
 *
 * **Two dimensions per mark rather than one uniform height, and both are needed.**
 * The strip caps width AND height because ten marks across three aspect ratios set
 * to a single height render a 4.9:1 wordmark at six times the optical weight of a
 * 0.8:1 stacked mark. The numbers are the mark's own ink bounds, measured from the
 * file — which is why they are typed rather than derived.
 */
function LogoEditor({
  logos,
  onAdd,
  onChange,
  onRemove,
  onMove,
}: {
  logos: readonly CustomerLogo[];
  onAdd: () => void;
  onChange: (index: number, patch: Partial<CustomerLogo>) => void;
  onRemove: (index: number) => void;
  onMove: (index: number, delta: number) => void;
}) {
  const unusedFiles = SERVED_LOGO_FILES.filter(
    (file) => !logos.some((logo) => logo.src === file),
  );

  return (
    <AdminSection
      id="customer-logos"
      title="Customer logo strip"
      description={
        <p>
          The scrolling band of marks under the form. It is evidence about ANSR, not
          about this tool, so nothing here may imply these companies used it. Files
          are chosen from what is already served — adding a new mark is a developer
          step, because each one is an adapted copy committed to the repo.
        </p>
      }
    >
      {logos.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-text-muted">
          No marks. The strip is hidden on the public page until there is at least
          one.
        </p>
      ) : (
        <div className="divide-y divide-border-subtle">
          {logos.map((logo, index) => (
            <LogoRow
              key={index}
              logo={logo}
              index={index}
              total={logos.length}
              /* Files already spoken for by another row. Offering one twice would
                 draw the same mark twice in the strip, and the publish diff keys a
                 mark by its file — so two rows sharing one would report as a single
                 mark and hide whichever edit came first. */
              taken={logos.filter((_, i) => i !== index).map((other) => other.src)}
              onChange={(patch) => onChange(index, patch)}
              onRemove={() => onRemove(index)}
              onMove={(delta) => onMove(index, delta)}
            />
          ))}
        </div>
      )}

      <div className="border-t border-border-subtle px-5 py-4">
        <Button
          variant="outline"
          size="sm"
          disabled={logos.length >= MAX_LOGOS || unusedFiles.length === 0}
          onClick={onAdd}
        >
          Add a mark
        </Button>
        {logos.length >= MAX_LOGOS ? (
          <p className="mt-2 text-xs text-text-muted">
            Twenty-four is the maximum. The strip scrolls, so a longer set is not a
            layout failure — it just stops being a curated set of proof.
          </p>
        ) : unusedFiles.length === 0 ? (
          /* The real ceiling is usually this one rather than the cap: every file that
             is served is already in the strip. Said here, because a new row with no
             file left to choose is a blocked publish with no way out of it from this
             page. */
          <p className="mt-2 text-xs text-text-muted">
            Every mark that is served is already in the strip. A new one is an
            adaptation committed to <code>public/logos/</code> — a developer step.
          </p>
        ) : null}
      </div>
    </AdminSection>
  );
}

/**
 * A dimension as a whole number, with 0 standing for "nothing typed yet".
 *
 * **0 rather than `NaN` or an empty string, and the reason is the draft rather than
 * the form.** This editor writes straight through, so whatever comes out of here is
 * autosaved as JSON — and `JSON.stringify(NaN)` is `null`, which restores as a draft
 * the schema rejects with an error the admin cannot fix from the UI. 0 is a real
 * number that round-trips, is refused by the schema's own `min(1)`, and reports as
 * that refusal on the field below.
 */
function toDimension(text: string): number {
  const parsed = Number.parseInt(text.trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

/** The schema's own bound and the schema's own message, per dimension. */
function dimensionError(
  field: "width" | "height",
  value: number,
): string | undefined {
  const parsed = customerLogoSchema.shape[field].safeParse(value);
  return parsed.success ? undefined : parsed.error.issues[0]?.message;
}

function LogoRow({
  logo,
  index,
  total,
  taken,
  onChange,
  onRemove,
  onMove,
}: {
  logo: CustomerLogo;
  index: number;
  total: number;
  /** Files another row already uses. See the call site. */
  taken: readonly string[];
  onChange: (patch: Partial<CustomerLogo>) => void;
  onRemove: () => void;
  onMove: (delta: number) => void;
}) {
  // The same rule the impact rows follow: every control in the row carries the
  // mark's identity in its accessible name, or a screen-reader user hears ten
  // identically-named "Company" fields. The name is the honest identifier; before
  // one is typed, the position is.
  const which = logo.name.trim() || `mark ${index + 1}`;
  const src = customerLogoSchema.shape.src.safeParse(logo.src);

  return (
    <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-start">
      <div className="grid flex-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <TextField
          label={`Company ${index + 1}`}
          hint="The mark's accessible name. Never drawn as text."
          max={MAX.logoName}
          value={logo.name}
          error={lengthError(logo.name, MAX.logoName)}
          onChange={(name) => onChange({ name })}
        />
        <SelectField
          label={`File ${index + 1}`}
          hint="Already served from /logos/."
          value={logo.src}
          options={SERVED_LOGO_FILES.filter((file) => !taken.includes(file))}
          error={src.success ? undefined : src.error.issues[0]?.message}
          onChange={(next) => onChange({ src: next })}
          placeholder="Choose a file…"
        />
        <TextField
          label={`Width ${index + 1}`}
          hint="Ink bounds in pixels."
          inputMode="numeric"
          value={logo.width === 0 ? "" : String(logo.width)}
          error={dimensionError("width", logo.width)}
          onChange={(text) => onChange({ width: toDimension(text) })}
        />
        <TextField
          label={`Height ${index + 1}`}
          hint="Ink bounds in pixels."
          inputMode="numeric"
          value={logo.height === 0 ? "" : String(logo.height)}
          error={dimensionError("height", logo.height)}
          onChange={(text) => onChange({ height: toDimension(text) })}
        />
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:pt-6">
        <Button
          variant="outline"
          size="sm"
          disabled={index === 0}
          onClick={() => onMove(-1)}
        >
          <span aria-hidden="true">↑</span>
          <span className="sr-only">Move {which} up</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={index === total - 1}
          onClick={() => onMove(1)}
        >
          <span aria-hidden="true">↓</span>
          <span className="sr-only">Move {which} down</span>
        </Button>
        <button
          type="button"
          onClick={onRemove}
          className="ansr-destructive inline-flex h-8 items-center px-3 text-sm"
        >
          Remove
          <span className="sr-only"> {which}</span>
        </button>
      </div>
    </div>
  );
}

interface CopyFieldConfig {
  key: keyof PublicCopy;
  hint?: string;
}

interface CopyGroupConfig {
  id: string;
  heading: string;
  description: string;
  fields: readonly CopyFieldConfig[];
}

/**
 * The static strings, grouped by the screen they appear on.
 *
 * **Grouped rather than listed, because the group is the only thing that tells an
 * admin what they are looking at.** Sixty-nine labels in one column is a list of
 * slots with no map; four sections named for the surfaces of the product are four
 * questions an admin can answer one at a time. The order inside each group follows
 * the reading order of the screen it describes.
 *
 * **This config carries the grouping and the hints; the LABELS come from
 * `PUBLIC_COPY_LABELS` in `diff.ts`.** The same words have to name a slot in this
 * form and in the publish diff that asks somebody to approve the edit, and two
 * lists would let one be reworded alone — so a reviewer would be approving
 * "Attribution line" against a field the editor called something else.
 *
 * Every cap comes from `copyFieldMax` at render, so a bound cannot be stated here and
 * be wrong. That call reads the schema for a plain string and `COPY_TEMPLATES` for a
 * template, whose cap `.refine()` erases — one call so this file holds no branch and no
 * number of its own.
 */
const COPY_GROUPS: readonly CopyGroupConfig[] = [
  {
    id: "copy-entry",
    heading: "Entry point",
    description:
      "The form card under the hero, and the two bands below it. The hero's own two lines are at the top of this page.",
    fields: [
      { key: "askTitle" },
      { key: "askLead" },
      { key: "askSubmit" },
      { key: "askIndustryLabel" },
      {
        key: "askRevenueLabel",
        hint: "The form's own label. The pill on the result screens says \u201cRevenue band (USD)\u201d and is edited under Peer landscape.",
      },
      { key: "askHqLabel" },
      {
        key: "askIndustryPlaceholder",
        hint: "Shown in the control before an answer, AND read out as the name of the open list. It does both jobs, so keep it a name rather than an instruction.",
      },
      {
        key: "askIndustryHint",
        hint: "Sits inside the open panel. The one place the optional second level is offered.",
      },
      { key: "askRevenuePlaceholder" },
      {
        key: "askRevenueHint",
        hint: "States the currency once for the whole list, so no row has to carry a $.",
      },
      { key: "askHqPlaceholder" },
      {
        key: "askFilterPlaceholder",
        hint: "The filter above long option lists.",
      },
      /* The dropdowns' own four group headings and the word the industry list uses for
         its second level — the last visitor-facing strings on the form that were not
         editable. */
      {
        key: "askGroupCommon",
        hint: "Heads the leading tier in BOTH the industry and the headquarters lists. It is a shortcut into the same list, not a separate set \u2014 everything in it also appears in the group below.",
      },
      {
        key: "askGroupIndustriesAll",
        hint: "Heads the industry list's second group, which holds every industry including the ones in the tier above. Keep it saying \u201call\u201d \u2014 it is literally all of them.",
      },
      {
        key: "askGroupCountriesAll",
        hint: "The same, for headquarters: every country, including the twelve in the tier above.",
      },
      {
        key: "askGroupRevenue",
        hint: "The revenue list has ONE group, and a single group is drawn without its heading \u2014 so this is not visible today. It is here so the four group names are edited together, and it appears if that list ever gains a second tier.",
      },
      {
        key: "askSubIndustryPlural",
        hint: "Plural. Drawn as the count on an industry row (\u201c31 sub-industries\u201d), on the second pane's close control, and on that pane's \u201cOther \u2026\u201d divider.",
      },
      {
        key: "askSubmitError",
        hint: "Shown only when the server cannot be reached. The pending label on the button is not editable \u2014 its width is measured against the submit label.",
      },
      {
        key: "askFieldRequired",
        hint: "Shown under any required control left unanswered.",
      },
      {
        key: "filterEmpty",
        hint: "Must keep {query}, which is replaced with what the visitor typed.",
      },
      {
        key: "customersLabel",
        hint: "The strip's accessible name. Read out, never drawn.",
      },
      {
        key: "impactTitleLead",
        hint: "The words AFTER the ANSR lockup, which is drawn rather than typed and leads the line. The heading reads \u201cANSR\u201d then this.",
      },
    ],
  },
  {
    id: "copy-band",
    heading: "Result band",
    description:
      "The teal band at the top of both result screens, and the switch between them.",
    fields: [
      {
        key: "headerPeers",
        hint: "Sets at 48px. Past about 36 characters it wraps, and a two-line band beside a one-line one puts back the height jump across the switch.",
      },
      {
        key: "headerFunctions",
        hint: "Keep it the same length as the peer view's, for the same reason.",
      },
      {
        key: "viewPeers",
        hint: "Two equal halves, so neither may wrap.",
      },
      { key: "viewFunctions" },
      {
        key: "pillIndustry",
        hint: "The answer pills, drawn on BOTH result screens from these keys. Below md they are read out but not drawn.",
      },
      {
        key: "pillSubIndustry",
        hint: "Drawn only where the visitor narrowed to a sub-industry, which is optional on the form.",
      },
      { key: "pillHeadquarters" },
      {
        key: "pillRevenueBand",
        hint: "Carries the currency, because the pill has no hint to put it in.",
      },
      {
        key: "editAnswers",
        hint: "Opens the answer editor in place. Avoid \u201cprofile\u201d \u2014 it implies a stored account, which this tool does not have.",
      },
      {
        key: "homeTitle",
        hint: "The tooltip on the ANSR GCC ATLAS lockup, which is the way back to the start.",
      },
      {
        key: "pillGroupLabel",
        hint: "Describes the row of answers for a screen reader. Read out, never drawn.",
      },
      {
        key: "viewSwitchLabel",
        hint: "Describes the two-way switch. Read out, never drawn.",
      },
      {
        key: "editorTitle",
        hint: "The four fields below are the entry point's own form, so its labels are edited under Entry point.",
      },
      { key: "editorLead" },
      { key: "editorClose" },
      {
        key: "editorSubmit",
        hint: "The one label that differs from the entry point's own submit button.",
      },
    ],
  },
  {
    id: "copy-peers",
    heading: "Peer landscape",
    description:
      "Section headings and cell labels on the first result screen. Nothing here states a count — the sentences that do are in code, beside the logic that counts.",
    fields: [
      {
        key: "snapshotHeading",
        hint: "Must keep {industry}. This heading is the ONE place the industry is named \u2014 the four cell labels below it deliberately do not. It is drawn in capitals, and the plural \u201cGCCs\u201d keeps its small s however you type it. Never \u201cGCC\u2019s\u201d.",
      },
      {
        key: "peersTitle",
        hint: "The heading over the comparison cards. Do not write \u201cclosest to yours\u201d \u2014 it presumes the visitor already runs a centre in India.",
      },
      {
        key: "peersBroadenedNote",
        hint: "Drawn ABOVE the peer cards when a FULL set had to reach past the visitor's exact answers to fill itself \u2014 on sub-industry, revenue band, or both. Speak of \u201cyour selection\u201d and \u201cthe wider industry\u201d generically rather than naming an axis or the industry, and state no count.",
      },
      {
        key: "peersNarrowNote",
        hint: "Must keep {industry}. Drawn ABOVE the peer cards, under the heading, only when the visitor named a sub-industry and that is what shortened the list \u2014 so it explains the SCOPE, points forward at the cards, and must state no count, which the line under the grid already does exactly.",
      },
      { key: "industryTitle" },
      {
        key: "industryBasisNote",
        hint: "The line under the three-layer chart. It says what the counts COVER, never that they might be wrong \u2014 the outer layer is every GCC we track, so a reader could otherwise take it for a national census. Keep \u201cindicative\u201d or a word doing its job; do not write \u201capproximate\u201d or \u201cestimates\u201d.",
      },
      {
        key: "largestTitle",
        hint: "Must keep {industry}.",
      },
      {
        key: "mapTitle",
        hint: "Must keep {industry}. Say INDUSTRY rather than sub-industry: the map is filtered to the industry.",
      },
      {
        key: "cityScopeTop",
        hint: "The scope word in the map panel's header, and the button that switches it. Four keys, two states.",
      },
      { key: "cityScopeAll" },
      { key: "cityCountHeader" },
      { key: "cityToggleToAll" },
      { key: "cityToggleToTop" },
      { key: "peerHeadcountLabel" },
      { key: "peerCitiesLabel" },
      { key: "peerSinceLabel" },
      {
        key: "snapshotHeadcountLabel",
        hint: "These three complete the figure above them rather than naming it \u2014 \u201c3,600 / average employees in each GCC\u201d. Lower case, no full stop.",
      },
      {
        key: "snapshotCitiesLabel",
        hint: "Say INDUSTRY, never sub-industry: the count is every city in the visitor's industry, not in the narrower set they may have picked.",
      },
      {
        key: "snapshotLeadingCityLabel",
        hint: "The leading city in the visitor's INDUSTRY, not in the five peers shown below. Do not call them peers here.",
      },
      {
        key: "figureUnavailable",
        hint: "Drawn in a snapshot cell whose figure cannot be computed. Never a dash, a zero or an estimate.",
      },
      { key: "scaleTitle" },
      {
        key: "scaleFortuneLabel",
        hint: "Each of these three is the predicate of a sentence whose subject is the figure above it.",
      },
      { key: "scaleForbesLabel" },
      { key: "scalePeopleLabel" },
    ],
  },
  {
    id: "copy-functions",
    heading: "Function metrics",
    description:
      "The second result screen. One figure-row eyebrow per tab, three section headings, and the attribution under the card.",
    fields: [
      { key: "figuresTech" },
      { key: "figuresOperations" },
      { key: "figuresHr" },
      { key: "figuresFinance" },
      {
        key: "velocityHeading",
        hint: "One heading, drawn on both the HR and operations tabs.",
      },
      { key: "hrAnalysisHeading" },
      { key: "opsSupportingHeading" },
      { key: "sourceLine" },
      {
        key: "functionPanelLabel",
        hint: "The tab panel's accessible name. Read out, never drawn.",
      },
      {
        key: "indexedNote",
        hint: "Must keep {baseline}, which is replaced with the metric's own index base.",
      },
      {
        key: "gridRowHeader",
        hint: "The capability grid's leading column name. Read out, never drawn \u2014 the other column names are the metric's own.",
      },
      {
        key: "closeLabel",
        hint: "Describes the closing band for a screen reader. Read out, never drawn; the words it shows are under Closing band.",
      },
    ],
  },
];

/**
 * The fields of one copy group that survive the query.
 *
 * **A hit on the group's own HEADING keeps every field in it**, because "peer
 * landscape" is a question about a surface rather than about a string — and a group
 * whose name matched while its rows all vanished would be a section header over
 * nothing.
 *
 * Otherwise a field is matched on its label, its hint, its current value AND its
 * schema key. The key is in there for one specific reader: everything else on this
 * page is prose an admin recognises, but a developer arriving from `copy.ts` or from
 * a diff is holding `snapshotCitiesLabel`, and that is the only handle they have.
 *
 * Lives outside `CopyEditor` because the page's own empty state has to count what
 * this returns; two implementations of "does this field match" is how a search starts
 * hiding a field the count says is there.
 */
function matchingCopyFields(
  group: CopyGroupConfig,
  copy: PublicCopy,
  search: AdminSearchState,
): readonly CopyFieldConfig[] {
  if (!search.searching) return group.fields;
  if (search.matches(group.heading, group.description)) return group.fields;
  return group.fields.filter((field) =>
    search.matches(
      PUBLIC_COPY_LABELS[field.key],
      field.hint,
      copy[field.key],
      field.key,
    ),
  );
}

function CopyEditor({
  copy,
  onChange,
  search,
}: {
  copy: PublicCopy;
  onChange: (patch: Partial<PublicCopy>) => void;
  search: AdminSearchState;
}) {
  return (
    <>
      {COPY_GROUPS.map((group) => {
        const fields = matchingCopyFields(group, copy, search);
        if (fields.length === 0) return null;
        return (
        <AdminSection
          key={group.id}
          id={group.id}
          title={group.heading}
          description={
            <>
              <p>{group.description}</p>
              {fields.length < group.fields.length ? (
                <p>
                  {fields.length} of {group.fields.length} fields in this group match
                  the search.
                </p>
              ) : null}
            </>
          }
        >
          <div className="grid gap-5 px-5 py-5 lg:grid-cols-2">
            {fields.map((field) => {
              // Every key carries a cap, so this is a bound rather than a default. If
              // one ever lost its cap the count disappears and the field stays
              // required, which is the honest reading of "no limit". `copyFieldMax` is
              // the one call because a TEMPLATE's cap cannot be read off the schema —
              // `.refine()` erases `maxLength` — and restating it here is exactly the
              // second place to be wrong that reading the schema exists to avoid.
              const max = copyFieldMax(field.key);
              return (
                <TextField
                  key={field.key}
                  label={PUBLIC_COPY_LABELS[field.key]}
                  hint={field.hint}
                  max={max}
                  value={copy[field.key]}
                  error={
                    // A missing placeholder is reported BEFORE the length, because it
                    // is the error that blocks the publish and the one an admin has no
                    // other way to find out about. See `copyTemplate` in `schema.ts`.
                    templateError(field.key, copy[field.key]) ??
                    lengthError(copy[field.key], max ?? Number.MAX_SAFE_INTEGER)
                  }
                  onChange={(value) => onChange({ [field.key]: value })}
                />
              );
            })}
          </div>
        </AdminSection>
        );
      })}
    </>
  );
}
