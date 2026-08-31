"use client";

import { useDraft } from "@/components/admin/draft-provider";
import { SelectField, TextField } from "@/components/admin/fields";
import { AdminPageHeader, AdminSection } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { PUBLIC_COPY_LABELS } from "@/data/diff";
import {
  closeCopySchema,
  customerLogoSchema,
  heroCopySchema,
  impactStatSchema,
  publicCopySchema,
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
const MAX_LOGOS = 12;

/**
 * The marks that are actually served from `public/logos/`.
 *
 * **Hardcoded, because it is a list of FILES rather than of data, and admin cannot
 * add to it.** A new mark is a `brand_asset.py` adaptation committed to the repo —
 * six of these are real vectors and four were re-encoded from a raster hidden inside
 * an SVG `<pattern>` — so the set moves with a deploy, not with a publish. What this
 * control decides is which of them appear, in what order and under what name; the
 * schema's own `src` pattern is what stops the field becoming a way to point the
 * strip at an arbitrary URL.
 */
const SERVED_LOGO_FILES: readonly string[] = [
  "/logos/airbnb.svg",
  "/logos/bestbuy.png",
  "/logos/goldmansachs.png",
  "/logos/lowes.svg",
  "/logos/nike.svg",
  "/logos/pepsico.png",
  "/logos/target.svg",
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
  // Checked against the real gate rather than re-deriving its rules, so the
  // banner cannot say "ready" for something the publish endpoint will reject.
  const blocked = !siteContentSchema.safeParse(draft.siteContent).success;

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Site copy"
        lead="The words and figures on the public pages that are not drawn from the company data."
      />

      {blocked ? (
        /* Form and words, never colour alone: this palette carries no danger hue.
           See tokens.css. */
        <p className="ansr-field-error text-sm">
          Something below is empty or over its limit. Publishing is blocked until it
          is fixed.
        </p>
      ) : null}

      <HeroEditor hero={hero} onChange={updateHeroCopy} />

      <CloseEditor close={close} onChange={updateCloseCopy} />

      <AdminSection
        id="impact-figures"
        title="Impact figures"
        description={
          <p>
            ANSR&rsquo;s own numbers, shown as one row on the dark band. The order
            here is the order a visitor reads them in, left to right. Type the figure
            exactly as it should appear, including any suffix — &ldquo;225K+&rdquo;,
            &ldquo;$2.5B+&rdquo;. Nothing here is calculated from the company data or
            checked against it.
          </p>
        }
      >
        {impactStats.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-text-muted">
            No figures. The impact band is hidden on the public page until there is
            at least one.
          </p>
        ) : (
          <ul className="divide-y divide-border-subtle">
            {impactStats.map((stat, index) => (
              <ImpactRow
                key={stat.id}
                stat={stat}
                index={index}
                total={impactStats.length}
                onChange={(patch) => updateImpactStat(stat.id, patch)}
                onRemove={() => removeImpactStat(stat.id)}
                onMove={(delta) => moveImpactStat(index, delta)}
              />
            ))}
          </ul>
        )}

        <div className="border-t border-border-subtle px-5 py-4">
          <Button
            variant="outline"
            size="sm"
            disabled={impactStats.length >= MAX_STATS}
            onClick={() => addImpactStat()}
          >
            Add a figure
          </Button>
          {impactStats.length >= MAX_STATS ? (
            <p className="mt-2 text-xs text-text-muted">
              Six is the maximum. Past that the row either wraps to a second line of
              one figure or shrinks them all below the size that makes a figure read
              as a figure.
            </p>
          ) : null}
        </div>
      </AdminSection>

      <FunctionsEditor values={commonFunctions} onChange={setCommonFunctions} />

      <LogoEditor
        logos={logos}
        onAdd={addLogo}
        onChange={updateLogo}
        onRemove={removeLogo}
        onMove={moveLogo}
      />

      <CopyEditor copy={copy} onChange={updatePublicCopy} />
    </div>
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
 * The closing call to action, on both result screens.
 *
 * **Two fields, because the band renders two strings and has no heading.** It had one —
 * "Unlock the full GCC landscape" — and it was removed so the supporting line and the
 * button carry the band on their own. There is deliberately no heading field here: a
 * field an admin can fill that nothing draws is worse than no field, and restoring the
 * heading is a schema addition and a component change together.
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
      </div>
    </AdminSection>
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
          The tags under &ldquo;Functions most GCCs run from India&rdquo; on the peer
          landscape. They are a claim about GCCs in general, not about the companies
          above them, so keep each one a function rather than a company&rsquo;s
          department. The set wraps as one row with no columns, so an item much longer
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
            Twelve is the maximum. The strip scrolls, so a longer set is not a layout
            failure — it just stops being a curated set of proof.
          </p>
        ) : unusedFiles.length === 0 ? (
          /* The real ceiling is usually this one rather than the cap: ten files are
             served and every one of them is already in the strip. Said here, because
             a new row with no file left to choose is a blocked publish with no way
             out of it from this page. */
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
 * admin what they are looking at.** Twenty-nine labels in one column is a list of
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
 * Every cap is read off `publicCopySchema` at render, so a bound cannot be stated
 * here and be wrong.
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
      {
        key: "customersLabel",
        hint: "The strip's accessible name. Read out, never drawn.",
      },
      {
        key: "impactTitleLead",
        hint: "The words before the ANSR lockup, which is drawn rather than typed.",
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
    ],
  },
  {
    id: "copy-peers",
    heading: "Peer landscape",
    description:
      "Section headings and cell labels on the first result screen. Nothing here states a count — the sentences that do are in code, beside the logic that counts.",
    fields: [
      { key: "peersTitle" },
      { key: "industryTitle" },
      { key: "peerHeadcountLabel" },
      { key: "peerCitiesLabel" },
      { key: "peerSinceLabel" },
      { key: "snapshotHeadcountLabel" },
      { key: "snapshotCitiesLabel" },
      { key: "snapshotLeadingCityLabel" },
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
    ],
  },
];

function CopyEditor({
  copy,
  onChange,
}: {
  copy: PublicCopy;
  onChange: (patch: Partial<PublicCopy>) => void;
}) {
  return (
    <>
      {COPY_GROUPS.map((group) => (
        <AdminSection
          key={group.id}
          id={group.id}
          title={group.heading}
          description={<p>{group.description}</p>}
        >
          <div className="grid gap-5 px-5 py-5 lg:grid-cols-2">
            {group.fields.map((field) => {
              // Every key in the schema carries a cap, so this is a bound rather than
              // a default. If one ever lost its cap the count disappears and the
              // field stays required, which is the honest reading of "no limit".
              const max = publicCopySchema.shape[field.key].maxLength;
              return (
                <TextField
                  key={field.key}
                  label={PUBLIC_COPY_LABELS[field.key]}
                  hint={field.hint}
                  max={max ?? undefined}
                  value={copy[field.key]}
                  error={lengthError(
                    copy[field.key],
                    max ?? Number.MAX_SAFE_INTEGER,
                  )}
                  onChange={(value) => onChange({ [field.key]: value })}
                />
              );
            })}
          </div>
        </AdminSection>
      ))}
    </>
  );
}
