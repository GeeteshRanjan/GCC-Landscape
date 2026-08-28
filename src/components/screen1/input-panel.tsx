"use client";

import { useId, useRef, useState } from "react";

import {
  GCC_STATUSES,
  GCC_STATUS_LABELS,
  type GccStatus,
  type PeerViewInput,
} from "@/data/screen1";
import { cn } from "@/lib/utils";

/**
 * The ask: six inputs, four of them required.
 *
 * Every input has a consumer. Company name and line of business are the two
 * optional ones — the name personalises copy, and line of business narrows the
 * peer set to companies in the same business. There is deliberately no seventh
 * field, no revenue *figure* (the data holds bands, so the input is a band) and no
 * email: this tool informs and earns a conversation, and there is no lead capture
 * anywhere in the codebase.
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
 * it. What the
 * matching actually did with the answers is said on the result, where it is
 * evidence for the peer set rather than an instruction; see `matchBasis` in
 * `copy.ts`. The one line kept is the storage promise beside the submit button,
 * which is a commitment rather than a description.
 *
 * The field primitives are local rather than shared with `components/admin/`,
 * which is a deliberate duplication. Admin is a dense internal tool built at 36px
 * control height; this is a public form that has to survive a phone and a
 * first-time visitor, so it sits at 44px with larger labels. Sharing them would
 * mean an admin density tweak silently changing the public screen.
 */

/** Company name is the one optional field: it personalises copy and nothing else. */
const REQUIRED_MESSAGE = "Choose one to continue.";

interface FieldProps {
  label: string;
  error?: string;
  optional?: boolean;
  children: (ids: { controlId: string; describedBy?: string }) => React.ReactNode;
}

function Field({ label, error, optional, children }: FieldProps) {
  const controlId = useId();
  const errorId = `${controlId}-error`;
  const describedBy = error ? errorId : undefined;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={controlId} className="text-sm font-semibold text-text">
        {label}
        {optional ? (
          <span className="font-regular text-text-muted"> (optional)</span>
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

const CONTROL_CLASS = cn(
  "h-11 w-full min-w-0 rounded-md border border-border-strong bg-surface px-3 text-base text-text",
  "outline-none transition-[border-color,box-shadow] duration-fast ease-standard",
  "focus-visible:border-focus",
  "aria-invalid:border-feedback-attention aria-invalid:border-2",
);

export interface BusinessTypeOption {
  id: string;
  name: string;
}

export interface InputPanelProps {
  industries: readonly string[];
  revenueBands: readonly string[];
  hqCountries: readonly string[];
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

type Errors = Partial<Record<"industry" | "revenueBand" | "hqCountry" | "gccStatus", string>>;

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
  const [gccStatus, setGccStatus] = useState<GccStatus | "">(
    initial?.gccStatus ?? "",
  );
  const [errors, setErrors] = useState<Errors>({});

  const statusLegendId = useId();
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
  function handleIndustryChange(next: string) {
    setIndustry(next);
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
    "gccStatus",
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
    if (!gccStatus) next.gccStatus = REQUIRED_MESSAGE;
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
      gccStatus: gccStatus as GccStatus,
    });
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-8">
      <div className="grid gap-6 md:grid-cols-2">
        <Field label="Company name" optional>
          {({ controlId, describedBy }) => (
            <input
              id={controlId}
              type="text"
              value={companyName}
              autoComplete="organization"
              placeholder="Acme Corporation"
              aria-describedby={describedBy}
              onChange={(event) => setCompanyName(event.target.value)}
              className={CONTROL_CLASS}
            />
          )}
        </Field>

        <Field
          label="Industry"
          error={errors.industry}
        >
          {({ controlId, describedBy }) => (
            <select
              id={controlId}
              ref={(node) => {
                controls.current.industry = node;
              }}
              value={industry}
              aria-invalid={errors.industry ? true : undefined}
              aria-describedby={describedBy}
              onChange={(event) => handleIndustryChange(event.target.value)}
              className={CONTROL_CLASS}
            >
              <option value="">Choose your industry</option>
              {industries.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
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
        <Field label="Line of business" optional>
          {({ controlId, describedBy }) => (
            <>
              <select
                id={controlId}
                value={businessTypeId}
                disabled={businessTypeOptions.length === 0}
                aria-describedby={`${describedBy ?? ""} ${businessTypeStatusId}`.trim()}
                onChange={(event) => setBusinessTypeId(event.target.value)}
                className={cn(
                  CONTROL_CLASS,
                  businessTypeOptions.length === 0 && "opacity-60",
                )}
              >
                <option value="">
                  {businessTypeOptions.length === 0
                    ? "Choose an industry first"
                    : "All of my industry"}
                </option>
                {businessTypeOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
              <p
                id={businessTypeStatusId}
                aria-live="polite"
                className="text-[length:var(--ansr-text-xs)] leading-[var(--ansr-leading-normal)] text-[var(--ansr-text-muted)]"
              >
                {businessTypeOptions.length === 0
                  ? "Available once you choose an industry."
                  : `${businessTypeOptions.length} to choose from. Narrows your comparison to companies in the same business.`}
              </p>
            </>
          )}
        </Field>

        <Field
          label="Annual revenue"
          error={errors.revenueBand}
        >
          {({ controlId, describedBy }) => (
            <select
              id={controlId}
              ref={(node) => {
                controls.current.revenueBand = node;
              }}
              value={revenueBand}
              aria-invalid={errors.revenueBand ? true : undefined}
              aria-describedby={describedBy}
              onChange={(event) => setRevenueBand(event.target.value)}
              className={CONTROL_CLASS}
            >
              <option value="">Choose a revenue band</option>
              {revenueBands.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          )}
        </Field>

        <Field
          label="Headquarters"
          error={errors.hqCountry}
        >
          {({ controlId, describedBy }) => (
            <select
              id={controlId}
              ref={(node) => {
                controls.current.hqCountry = node;
              }}
              value={hqCountry}
              aria-invalid={errors.hqCountry ? true : undefined}
              aria-describedby={describedBy}
              onChange={(event) => setHqCountry(event.target.value)}
              className={CONTROL_CLASS}
            >
              <option value="">Choose a country</option>
              {hqCountries.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>

      {/* Three options, so they are all visible: a select would hide the choice
          set behind a click for no gain, and this input changes how the whole
          answer is framed. */}
      <fieldset
        className="flex flex-col gap-3"
        aria-describedby={errors.gccStatus ? `${statusLegendId}-error` : undefined}
      >
        <legend className="text-sm font-semibold text-text">
          Where are you with India today?
        </legend>
        <div className="grid gap-2 md:grid-cols-3">
          {GCC_STATUSES.map((option) => {
            const optionId = `${statusLegendId}-${option}`;
            const checked = gccStatus === option;
            return (
              <label
                key={option}
                htmlFor={optionId}
                className={cn(
                  "flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm text-text",
                  "transition-[border-color,background-color] duration-fast ease-standard",
                  checked
                    ? "border-accent-teal bg-surface-subtle font-medium"
                    : "border-border-strong bg-surface",
                )}
              >
                <input
                  id={optionId}
                  // Only the first radio is tracked: focusing a radio group means
                  // focusing its entry point, and the browser moves from there.
                  ref={
                    option === GCC_STATUSES[0]
                      ? (node) => {
                          controls.current.gccStatus = node;
                        }
                      : undefined
                  }
                  type="radio"
                  name="gcc-status"
                  value={option}
                  checked={checked}
                  aria-invalid={errors.gccStatus ? true : undefined}
                  onChange={() => setGccStatus(option)}
                  className="size-4 shrink-0 accent-[var(--ansr-accent)]"
                />
                {GCC_STATUS_LABELS[option]}
              </label>
            );
          })}
        </div>
        {errors.gccStatus ? (
          <p id={`${statusLegendId}-error`} className="ansr-field-error text-xs">
            {errors.gccStatus}
          </p>
        ) : null}
      </fieldset>

      <div className="flex flex-col gap-3">
        {/* Not role="alert": this appears in response to the visitor's own submit,
            which they are already attending to, and an assertive interruption for
            a routine failure is exactly what that role should not be used for. */}
        {submitError ? (
          <p role="status" className="ansr-field-error text-sm">
            {submitError}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="submit"
            // Enabled until the request actually starts. Disabling on an invalid
            // form leaves a keyboard user with no way to find out what is wrong.
            disabled={pending}
            aria-busy={pending || undefined}
            // Black label on the orange fill, not the white that
            // `--ansr-action-text` names. Measured: white on --ansr-orange is
            // 3.22:1, which fails AA for text this size, and black on the same
            // fill is 6.52:1. The palette is left alone and a legal pairing is
            // used instead; see the note in handoff.md about the token itself.
            className={cn(
              "inline-flex min-h-11 items-center justify-center rounded-md px-6 text-base font-semibold",
              "bg-action text-text transition-colors duration-fast ease-standard",
              "hover:bg-action-hover disabled:opacity-60",
            )}
          >
            {pending ? "Finding comparable companies…" : "Show me the landscape"}
          </button>
          <p className="text-xs text-text-muted">
            Nothing you enter is stored or sent to us.
          </p>
        </div>
      </div>
    </form>
  );
}
