"use client";

import { useDraft } from "@/components/admin/draft-provider";
import { TextField } from "@/components/admin/fields";
import { Button } from "@/components/ui/button";
import {
  closeCopySchema,
  heroCopySchema,
  impactStatSchema,
  siteContentSchema,
  type CloseCopy,
  type HeroCopy,
  type ImpactStat,
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
} as const;

const MAX_STATS = 6;

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
  } = useDraft();

  const { hero, impactStats, close } = draft.siteContent;
  // Checked against the real gate rather than re-deriving its rules, so the
  // banner cannot say "ready" for something the publish endpoint will reject.
  const blocked = !siteContentSchema.safeParse(draft.siteContent).success;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold tracking-heading text-text">
          Site copy
        </h1>
        <p className="mt-1 max-w-measure text-sm text-text-muted">
          The headline on the first screen, the impact figures at the bottom of it,
          and the closing call to action on both result screens. These are the only
          words and numbers on the public pages that are not drawn from the company
          data, which is why they are editable here — nothing is live until you
          publish.
        </p>
      </div>

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

      <section
        aria-labelledby="impact-figures"
        className="border border-border-subtle bg-surface"
      >
        <div className="border-b border-border-subtle px-5 py-4">
          <h2
            id="impact-figures"
            className="text-base font-semibold text-text"
          >
            Impact figures
          </h2>
          <p className="mt-1 max-w-measure text-sm text-text-muted">
            ANSR&rsquo;s own numbers, shown as one row on the dark band. The order
            here is the order a visitor reads them in, left to right. Type the figure
            exactly as it should appear, including any suffix — &ldquo;225K+&rdquo;,
            &ldquo;$2.5B+&rdquo;. Nothing here is calculated from the company data or
            checked against it.
          </p>
        </div>

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
      </section>
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
    <section
      aria-labelledby="hero-copy"
      className="border border-border-subtle bg-surface"
    >
      <div className="border-b border-border-subtle px-5 py-4">
        <h2 id="hero-copy" className="text-base font-semibold text-text">
          Hero
        </h2>
        <p className="mt-1 max-w-measure text-sm text-text-muted">
          Two elements, and there is no third — no eyebrow, no button, no proof line.
          The title is the product label and the page&rsquo;s only <code>h1</code>.
        </p>
      </div>

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
    </section>
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
    <section
      aria-labelledby="close-copy"
      className="border border-border-subtle bg-surface"
    >
      <div className="border-b border-border-subtle px-5 py-4">
        <h2 id="close-copy" className="text-base font-semibold text-text">
          Closing call to action
        </h2>
        <p className="mt-1 max-w-measure text-sm text-text-muted">
          The last band on both result screens — the peer landscape and the function
          metrics — over the blurred panel of withheld detail. It is the only link out
          of the tool. There is no heading: these two elements are the whole band.
        </p>
      </div>

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
    </section>
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
