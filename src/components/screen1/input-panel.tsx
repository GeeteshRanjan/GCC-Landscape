"use client";

import { ChevronDown } from "lucide-react";
import { useId, useRef, useState } from "react";

import { type GccStatus, type PeerViewInput } from "@/data/screen1";
import { cn } from "@/lib/utils";
import { ASK } from "./copy";

/**
 * The ask: five inputs, three of them required.
 *
 * Every input has a consumer. Company name and line of business are the two
 * optional ones — the name personalises copy, and line of business narrows the
 * peer set to companies in the same business. There is deliberately no sixth
 * field, no revenue *figure* (the data holds bands, so the input is a band) and no
 * email: this tool informs and earns a conversation, and there is no lead capture
 * anywhere in the codebase.
 *
 * **The India-presence question was removed at ANSR's request, and its FIELD was
 * not.** `gccStatus` still exists on `PeerViewInput`, still drives `framing()`, and
 * is now supplied as a constant — see `ASSUMED_GCC_STATUS` for which value and why.
 * So this is a form with five controls over a six-field contract, deliberately,
 * and restoring the question is a UI change rather than a data migration.
 *
 * **No company-name autocomplete.** It was built and removed. Completions could
 * only ever come from the 1834 companies in our own database, so a visitor at a
 * large company we have not mapped would type their name, see an empty dropdown,
 * and read it as "this tool does not know who we are" — the opposite of what the
 * screen is for. There is no version of the feature that avoids this, because the
 * absence of a suggestion is itself the message. Left as a plain text input.
 *
 * **No per-field help text.** Each field carried a line explaining what it was
 * for — why we ask for a band rather than a figure, what the HQ answer sorts. A
 * label per field each trailing an explanation is several times the reading for a
 * form that takes twenty seconds, and "Industry" does not need a sentence under
 * it. The one exception is the line-of-business status line, which is a live
 * region announcing that the control became available rather than a description of
 * it. What the matching actually did with the answers is said on the result, where
 * it is evidence for the peer set rather than an instruction; see `matchBasis` in
 * `copy.ts`. The storage promise that used to sit beside the submit button is gone
 * too — see `ASK` in `copy.ts` — so the live region is now the only help text on
 * the form.
 *
 * The field primitives are local rather than shared with `components/admin/`,
 * which is a deliberate duplication. Admin is a dense internal tool built at 36px
 * control height; this is a public form that has to survive a phone and a
 * first-time visitor, so it sits at 44px with larger labels. Sharing them would
 * mean an admin density tweak silently changing the public screen.
 */

const REQUIRED_MESSAGE = "Choose one to continue.";

interface FieldProps {
  label: string;
  error?: string;
  /**
   * Marks a field the visitor may skip.
   *
   * **Only line of business carries it, and company name deliberately does not**,
   * even though the server accepts an empty name. The two are optional in
   * different senses and the marker is only honest about one of them: line of
   * business sits beside a control that is disabled until an industry is chosen, so
   * the marker is what explains why it can be left alone. Company name is what
   * personalises every sentence in the result — it is the input that makes the
   * answer read as being about them — and labelling it optional invited a visitor
   * to skip the one field that costs them nothing and changes the most.
   *
   * The mild inconsistency is the price, and it is the cheaper of the two: a
   * visitor who leaves the name blank still gets a correct result, and one who
   * skipped it because the label said they could gets a flatter one for no reason.
   */
  optional?: boolean;
  /**
   * How much of the six-column field row this control takes.
   *
   * Five controls do not tile a two-column grid, and the leftover cell landed
   * beside Headquarters — a hole in the middle of the one thing on the entry point
   * a visitor has to DO. Six columns divide by both two and three, so the two text
   * inputs take three each and the three selects take two each, and both rows fill.
   *
   * The rule may only ever WIDEN a control, never narrow or reorder one. DOM order
   * is the tab order and the spec's order.
   */
  span?: string;
  children: (ids: { controlId: string; describedBy?: string }) => React.ReactNode;
}

function Field({ label, error, optional, span, children }: FieldProps) {
  const controlId = useId();
  const errorId = `${controlId}-error`;
  const describedBy = error ? errorId : undefined;

  return (
    <div className={cn("flex min-w-0 flex-col gap-2", span)}>
      {/* Sentence case, not caps. Tracked uppercase labels were tried and are the
          wrong idiom here: at 14px across five fields they turned a public form into
          a data-entry table, and the reference's own small label is sentence-case
          Light. Weight carries the label instead. */}
      <label htmlFor={controlId} className="text-sm font-semibold text-text">
        {label}
        {optional ? (
          <span className="font-light text-text-muted"> (optional)</span>
        ) : null}
      </label>
      {children({ controlId, describedBy })}
      {error ? (
        // Form-based, not hue-based: this palette has no danger colour, so the
        // error is carried by an orange rule plus weight. See tokens.css.
        <p id={errorId} className="ansr-field-error text-xs">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * A filled field with one bottom rule, radius 0. See `.gcc-field` in globals.css
 * for the three measurements that produced the shape — the short version is that
 * the bordered box this replaces had a 1.78:1 boundary, which is not a boundary.
 *
 * 44px (`h-11`) stays. A public form has to survive a phone and a first-time
 * visitor, and this is the reason these primitives are local rather than shared
 * with admin's 36px ones.
 */
const CONTROL_CLASS = cn(
  // 48px, up from 44. The floor for a touch target is 44 and that is what the
  // previous pass used; a public form on a rounded card reads tight at the floor,
  // and 48 is what the controls in the card now share with the submit button.
  "gcc-field h-12 w-full min-w-0 px-4 text-base font-light text-text",
  "outline-none",
);

/**
 * A select carries the same shape plus room for the chevron `SelectShell` draws.
 * Without the trailing padding a long option — "Democratic Republic of the Congo",
 * "Architecture, Engineering, & Construction" — runs under the icon.
 *
 * 36px, which is the icon's 16 plus its 12 inset plus a hair. It was 44 and that was
 * too much: a native select clips its text silently, and at tablet width the extra
 * eight pixels truncated "Choose a country" to "Choose a countr" inside a
 * two-of-six column. The same failure the revenue placeholder was shortened for.
 */
const SELECT_CLASS = cn(CONTROL_CLASS, "appearance-none pe-9");

/**
 * A native `<select>` with the platform chevron replaced.
 *
 * **Still a native select, and that is not negotiable here.** The HQ list is now
 * 201 countries in two `optgroup`s; a custom listbox would have to rebuild
 * keyboard type-ahead, the platform's own long-list scrolling, and — on a phone —
 * the native wheel picker, and would rebuild all three worse. So only the
 * *appearance* is taken over: `appearance-none` drops the OS chevron and this draws
 * one in the brand's own ink, at a size that matches the 48px control instead of
 * the 1990s inset triangle that made the form read as old.
 *
 * The icon is `pointer-events-none` and `aria-hidden`, so it is decoration over a
 * control that still behaves exactly as the platform's. Clicking where the chevron
 * appears opens the select, because the click lands on the select underneath.
 */
function SelectShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      {children}
      <ChevronDown
        aria-hidden="true"
        // `end-4` not `right-4`, so it mirrors under a right-to-left locale along
        // with the padding on the control.
        className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-accent-teal"
      />
    </div>
  );
}

export interface BusinessTypeOption {
  id: string;
  name: string;
}

/**
 * A dropdown split into a leading tier and the rest.
 *
 * Both tiers are built in `screen1.ts` from how many companies each value actually
 * has, so this form renders an order it did not decide and cannot get out of step
 * with the data. Used for industry and HQ country.
 *
 * **Revenue band deliberately does not get this**, and stays a plain
 * `readonly string[]` rendered in its stored order: that order is the peer-matching
 * contract, and a tier split would reorder it.
 */
export interface TieredOptions {
  common: readonly string[];
  others: readonly string[];
}

export interface InputPanelProps {
  industries: TieredOptions;
  revenueBands: readonly string[];
  hqCountries: TieredOptions;
  /**
   * Industry -> the lines of business on offer within it.
   *
   * Passed whole rather than fetched on change, because the payload is a few
   * kilobytes of labels and a round trip per industry selection would put a
   * spinner inside a dropdown for no gain.
   */
  businessTypesByIndustry: Readonly<Record<string, readonly BusinessTypeOption[]>>;
  /** Set when returning to the form, so a correction starts from the last answer. */
  initial?: Partial<PeerViewInput>;
  pending: boolean;
  /** Server-side failure, surfaced above the button rather than per field. */
  submitError?: string | null;
  onSubmit: (input: PeerViewInput) => void;
}

type Errors = Partial<Record<"industry" | "revenueBand" | "hqCountry", string>>;

/**
 * The India-presence answer the form no longer asks for.
 *
 * **`gccStatus` is still in `PeerViewInput`, still required, and still the only
 * consumer of `framing()` — the QUESTION was removed, not the field.** Keeping the
 * contract intact is deliberate: the branch it drives is a real product feature
 * (the answer is framed differently for someone evaluating a first centre than for
 * someone expanding a tenth), the schema and server validation are untouched, and
 * restoring the control is a UI change rather than a data migration if ANSR wants
 * the question back.
 *
 * `evaluating` is the branch to stand in on, because it is the one whose copy is
 * true regardless of who is reading: "You would not be first. Here is who already
 * is." is a statement about the industry, not a claim about the visitor. The other
 * two assert something the visitor never told us.
 *
 * **The other half of this is in the answer header**, which no longer lists "India
 * today" among the facts it echoes back. Showing a constant there would have been
 * the tool telling the visitor what they said about something it never asked.
 */
const ASSUMED_GCC_STATUS: GccStatus = "evaluating";

export function InputPanel({
  industries,
  revenueBands,
  hqCountries,
  businessTypesByIndustry,
  initial,
  pending,
  submitError,
  onSubmit,
}: InputPanelProps) {
  const [companyName, setCompanyName] = useState(initial?.companyName ?? "");
  const [industry, setIndustry] = useState(initial?.industry ?? "");
  const [revenueBand, setRevenueBand] = useState(initial?.revenueBand ?? "");
  const [hqCountry, setHqCountry] = useState(initial?.hqCountry ?? "");
  const [businessTypeId, setBusinessTypeId] = useState(initial?.businessTypeId ?? "");
  const [errors, setErrors] = useState<Errors>({});

  const businessTypeStatusId = useId();

  const businessTypeOptions = businessTypesByIndustry[industry] ?? [];

  /**
   * Changing industry replaces the list, so a selection made under the old one is
   * cleared rather than carried over.
   *
   * Left in place it would be an id that does not exist in the new industry, which
   * the server rejects — and rejects correctly, since silently ignoring it would
   * return an industry-wide peer set while the visitor believes they narrowed it.
   * Better to clear it here than to fail at submit.
   */
  /**
   * Clears one field's error the moment it is answered.
   *
   * Validation still only RUNS on submit — marking a field invalid before someone
   * has finished answering it is noise. But an error that survives its own
   * correction is worse than that: the field reads as still wrong, `aria-invalid`
   * stays true so a screen reader keeps announcing it as invalid, and the orange
   * rule keeps drawing the eye to the one row that no longer needs it. Caught by
   * looking at the rendered form after a failed submit, which is the only check
   * this repo has for how a screen behaves once it is in a state.
   */
  function clearError(field: keyof Errors) {
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function handleIndustryChange(next: string) {
    setIndustry(next);
    clearError("industry");
    setBusinessTypeId((current) => {
      if (!current) return current;
      const allowed = businessTypesByIndustry[next] ?? [];
      return allowed.some((option) => option.id === current) ? current : "";
    });
  }

  /**
   * Direct handles on the controls that can fail validation, in the order they
   * appear.
   *
   * Not a DOM query for `[aria-invalid="true"]`: `setErrors` is a state update, so
   * the attribute does not exist yet at the moment the submit handler needs it and
   * the query comes back empty. The symptom is subtle — the errors appear
   * correctly and focus silently does not move — which is exactly the kind of
   * keyboard-only failure nobody notices by clicking around.
   */
  const controls = useRef<
    Partial<Record<keyof Errors, HTMLElement | null>>
  >({});

  const FIELD_ORDER: ReadonlyArray<keyof Errors> = [
    "industry",
    "revenueBand",
    "hqCountry",
  ];

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    // Validated on submit, not on change. Marking a field invalid before someone
    // has finished answering it is noise, and the browser's own required-field
    // behaviour is suppressed (noValidate) so the messages here can be ours.
    const next: Errors = {};
    if (!industry) next.industry = REQUIRED_MESSAGE;
    if (!revenueBand) next.revenueBand = REQUIRED_MESSAGE;
    if (!hqCountry) next.hqCountry = REQUIRED_MESSAGE;
    setErrors(next);

    if (Object.keys(next).length > 0) {
      // Put the keyboard on the first thing that is actually wrong, rather than
      // leaving someone to hunt the form for it.
      const first = FIELD_ORDER.find((field) => next[field]);
      if (first) controls.current[first]?.focus();
      return;
    }

    onSubmit({
      companyName: companyName.trim() || undefined,
      industry,
      revenueBand,
      hqCountry,
      businessTypeId: businessTypeId || undefined,
      gccStatus: ASSUMED_GCC_STATUS,
    });
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-8">
      {/* Six columns, so five controls fill two rows exactly. See `FieldProps.span`. */}
      <div className="grid gap-6 md:grid-cols-6">
        {/* Not marked optional, though the server accepts it empty. See
            `FieldProps.optional` — this is the input that personalises every
            sentence in the result, and the marker was talking a visitor out of the
            one field that costs nothing and changes the most. */}
        <Field label="Company name" span="md:col-span-3">
          {({ controlId, describedBy }) => (
            <input
              id={controlId}
              type="text"
              value={companyName}
              autoComplete="organization"
              // Deliberately no example text in the field. It carried a stock
              // company name, which restated a control already labelled "Company
              // name (optional)" and spent the only piece of sample copy on either
              // screen on something invented — in front of the audience this tool
              // exists to look credible to. Hint text that repeats its own label is
              // noise, and it is noise at reduced contrast.
              aria-describedby={describedBy}
              onChange={(event) => setCompanyName(event.target.value)}
              className={CONTROL_CLASS}
            />
          )}
        </Field>

        <Field
          label="Industry"
          error={errors.industry}
          span="md:col-span-3"
        >
          {({ controlId, describedBy }) => (
            <SelectShell>
              <select
                id={controlId}
                // One ref, for validation focus. This used to feed two — the hero
                // carried a pill that put the keyboard here, so the same node had to
                // be reachable for both jobs through a single callback, because a
                // second `ref` prop would have silently replaced the first. The pill
                // went with the hero rework, so the arrangement is gone too rather
                // than left behind as a prop nothing passes.
                ref={(node) => {
                  controls.current.industry = node;
                }}
                value={industry}
                aria-invalid={errors.industry ? true : undefined}
                aria-describedby={describedBy}
                onChange={(event) => handleIndustryChange(event.target.value)}
                className={SELECT_CLASS}
              >
                <option value="">Choose your industry</option>
                {/* Two groups, for the same reason the country list has them: the
                    six industries that cover most of the data lead, and the rest is
                    alphabetical so a mid-frequency industry is findable. See
                    `industryOptions`. */}
                <optgroup label="Most common">
                  {industries.common.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="All industries">
                  {industries.others.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </optgroup>
              </select>
            </SelectShell>
          )}
        </Field>

        {/*
          Line of business — the one optional select, and the only field on this
          form that is disabled until another is answered.

          Rendered unconditionally rather than appearing on industry selection: a
          control that materialises mid-form moves everything below it and is
          announced to a screen reader as a change of document rather than a change
          of state. Disabled-then-enabled keeps the form's shape fixed, and the
          status line below is an aria-live region so the enabling IS announced.
        */}
        <Field label="Line of business" optional span="md:col-span-2">
          {({ controlId, describedBy }) => (
            <>
              <SelectShell>
              <select
                  id={controlId}
                  value={businessTypeId}
                  disabled={businessTypeOptions.length === 0}
                  aria-describedby={`${describedBy ?? ""} ${businessTypeStatusId}`.trim()}
                  onChange={(event) => setBusinessTypeId(event.target.value)}
                  className={cn(
                    SELECT_CLASS,
                    businessTypeOptions.length === 0 && "opacity-60",
                  )}
                >
                  {/* One string in both states, rather than swapping in "Choose an
                      industry first" while disabled. Two reasons: that string clipped
                      at tablet width, and it duplicated the status line below, which
                      is an aria-live region and is therefore the thing that actually
                      ANNOUNCES the change. This is also just true — no line of
                      business selected means all of the industry. */}
                  <option value="">All of my industry</option>
                  {businessTypeOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
            </SelectShell>
              <p
                id={businessTypeStatusId}
                aria-live="polite"
                className="text-xs leading-normal font-light text-text-muted"
              >
                {/* One clause once it is available. The longer version named the
                    count, the effect and the mechanism, wrapped to two lines, and
                    pushed the row below it down as it appeared — which is a layout
                    shift caused by explaining something the visitor can see. */}
                {businessTypeOptions.length === 0
                  ? "Available once you choose an industry."
                  : `${businessTypeOptions.length} to choose from, for a closer comparison.`}
              </p>
            </>
          )}
        </Field>

        <Field
          label="Annual revenue"
          error={errors.revenueBand}
          span="md:col-span-2"
        >
          {({ controlId, describedBy }) => (
            <SelectShell>
              <select
                id={controlId}
                ref={(node) => {
                  controls.current.revenueBand = node;
                }}
                value={revenueBand}
                aria-invalid={errors.revenueBand ? true : undefined}
                aria-describedby={describedBy}
                onChange={(event) => {
                  setRevenueBand(event.target.value);
                  clearError("revenueBand");
                }}
                className={SELECT_CLASS}
              >
                {/* "Choose a revenue band" truncated inside a two-of-six column at
                    tablet width, which is where a native select clips silently. The
                    label above already says Annual revenue, so the word "revenue"
                    was doing nothing here twice. */}
                <option value="">Choose a band</option>
                {revenueBands.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </SelectShell>
          )}
        </Field>

        <Field
          label="Headquarters"
          error={errors.hqCountry}
          span="md:col-span-2"
        >
          {({ controlId, describedBy }) => (
            <SelectShell>
              <select
                id={controlId}
                ref={(node) => {
                  controls.current.hqCountry = node;
                }}
                value={hqCountry}
                aria-invalid={errors.hqCountry ? true : undefined}
                aria-describedby={describedBy}
                onChange={(event) => {
                  setHqCountry(event.target.value);
                  clearError("hqCountry");
                }}
                className={SELECT_CLASS}
              >
                <option value="">Choose a country</option>
                {/* Two `optgroup`s rather than one flat list of 201, and the split
                    is what makes the list usable at that length.

                    The leading group is the countries our data actually has
                    companies in, most-represented first — so the fifteen or so
                    answers this audience is overwhelmingly likely to give are the
                    first fifteen, and USA is first because 1,176 of the companies
                    are American, not because someone decided it should be.

                    The second group is every other country, alphabetical. It is
                    there for one reason: a CIO who cannot find their own country
                    has been told the tool is not for them. That is the same failure
                    that removed company-name autocomplete, and it costs nothing to
                    avoid here, because HQ is a sort preference rather than a
                    matching key — see `hqCountryOptions`.

                    Native `optgroup`, not two lists with a styled divider: the
                    grouping is then announced by a screen reader and honoured by
                    the platform's own picker on a phone. */}
                <optgroup label="Most common">
                  {hqCountries.common.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="All countries">
                  {hqCountries.others.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </optgroup>
              </select>
            </SelectShell>
          )}
        </Field>
      </div>

      <div className="flex flex-col gap-3">
        {/* Not role="alert": this appears in response to the visitor's own submit,
            which they are already attending to, and an assertive interruption for
            a routine failure is exactly what that role should not be used for. */}
        {submitError ? (
          <p role="status" className="ansr-field-error text-sm">
            {submitError}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <button
            type="submit"
            // Enabled until the request actually starts. Disabling on an invalid
            // form leaves a keyboard user with no way to find out what is wrong.
            disabled={pending}
            aria-busy={pending || undefined}
            // Black label on the orange fill, not the white that
            // `--ansr-action-text` names. Re-measured against the new orange
            // rather than carried over: white on --ansr-action is 3.35:1, so the
            // AA failure is not fixed by the new palette, and black on the same
            // fill is 6.27:1. The reference puts white on its pill twice and is
            // wrong both times.
            className={cn(
              // The one orange thing on this screen, and the reference's rule is
              // one per band. Fully round, matching the close's primary — same
              // shape so both read as actions, different fill so only one reads as
              // THE action.
              "inline-flex min-h-12 items-center justify-center rounded-full px-7 text-base font-semibold",
              // Full width on a phone, intrinsic from `sm` up. On a single-column
              // form every control above it is full width, so a 160px button under
              // a stack of 358px fields reads as a smaller, lesser control — and it
              // is the one thing on the screen the visitor has to hit with a thumb.
              // From `sm` the fields sit two and three to a row, and a full-width
              // button would then be wider than anything above it.
              "w-full sm:w-auto",
              "bg-action text-text transition-colors duration-fast ease-standard",
              "hover:bg-action-hover disabled:opacity-60",
            )}
          >
            {pending ? ASK.submitPending : ASK.submit}
          </button>
        </div>
      </div>
    </form>
  );
}
