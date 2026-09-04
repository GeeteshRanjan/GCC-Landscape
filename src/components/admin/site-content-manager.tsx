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
import { Button } from "@/components/ui/button";
import { PUBLIC_COPY_LABELS } from "@/data/diff";
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
  impactStatSchema,
  isCopyTemplate,
  siteContentSchema,
  type CloseCopy,
  type CustomerLogo,
  type HeroCopy,
  type ImpactStat,
  type PublicCopy,
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
  title: heroCopySchema.shape.title.maxLength ?? 60,
  lead: heroCopySchema.shape.lead.maxLength ?? 240,
  value: impactStatSchema.shape.value.maxLength ?? 16,
  label: impactStatSchema.shape.label.maxLength ?? 64,
  closeBody: closeCopySchema.shape.body.maxLength ?? 140,
  closeLabel: closeCopySchema.shape.ctaLabel.maxLength ?? 28,
  functionItem:
    siteContentSchema.shape.commonFunctions.unwrap().element.maxLength ?? 32,
  logoName: customerLogoSchema.shape.name.maxLength ?? 40,
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
    addLogo,
    updateLogo,
    removeLogo,
    moveLogo,
  } = useDraft();

  const { hero, impactStats, close, commonFunctions, logos, copy } =
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
      "hero title supporting line headline",
      hero.title,
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
          Two elements, and there is no third — no eyebrow, no button, no proof line.
          The title is the product label and the page&rsquo;s only <code>h1</code>.
        </p>
      }
    >
      <div className="flex flex-col gap-5 px-5 py-5">
        <TextField
          label="Title"
          hint={`Sets bold at up to 80px, centred. Keep it to about ${MAX.title} characters — past that it takes a third line on a desktop screen and pushes the form below the fold. "ANSR" is set in the brand orange automatically; keep it as the first word, because the orange is only legible against the top of the hero gradient.`}
          value={hero.title}
          error={lengthError(hero.title, MAX.title)}
          onChange={(value) => onChange({ title: value })}
        />
        <TextField
          label="Supporting line"
          hint={`One sentence under the title, at up to ${MAX.lead} characters. Write the company count the way it should read — it is text, not a total, so it does not have to match the ${new Intl.NumberFormat("en-US").format(1834)} companies in the data exactly.`}
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
 * admin what they are looking at.** Sixty-eight labels in one column is a list of
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
      { key: "askCompanyLabel" },
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
        key: "pillCompany",
        hint: "The four answer pills, drawn on BOTH result screens from these four keys. Below md they are read out but not drawn.",
      },
      { key: "pillIndustry" },
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
        hint: "The tooltip on the ANSR ATLAS lockup, which is the way back to the start.",
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
        hint: "Must keep {industry}. This heading is the ONE place the industry is named \u2014 the four cell labels below it deliberately do not.",
      },
      {
        key: "peersTitle",
        hint: "Must keep {company}, which is replaced with the visitor's own company name.",
      },
      {
        key: "peersTitleFallback",
        hint: "Substituted for {company} when the visitor did not give a name. Do not write \u201cyours\u201d \u2014 it presumes they already run a centre in India.",
      },
      { key: "industryTitle" },
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
