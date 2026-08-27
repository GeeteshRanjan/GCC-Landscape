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
 * The ask: five inputs, four of them required.
 *
 * Every input has a consumer. There is deliberately no sixth field, no revenue
 * *figure* (the data holds bands, so the input is a band) and no email: this tool
 * informs and earns a conversation, and there is no lead capture anywhere in the
 * codebase.
 *
 * **No per-field help text.** Each field carried a line explaining what it was
 * for — why we ask for a band rather than a figure, what the HQ answer sorts. Five
 * labels each trailing an explanation is five times the reading for a form that
 * takes twenty seconds, and "Industry" does not need a sentence under it. What the
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

export interface InputPanelProps {
  industries: readonly string[];
  revenueBands: readonly string[];
  hqCountries: readonly string[];
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
  initial,
  pending,
  submitError,
  onSubmit,
}: InputPanelProps) {
  const [companyName, setCompanyName] = useState(initial?.companyName ?? "");
  const [industry, setIndustry] = useState(initial?.industry ?? "");
  const [revenueBand, setRevenueBand] = useState(initial?.revenueBand ?? "");
  const [hqCountry, setHqCountry] = useState(initial?.hqCountry ?? "");
  const [gccStatus, setGccStatus] = useState<GccStatus | "">(
    initial?.gccStatus ?? "",
  );
  const [errors, setErrors] = useState<Errors>({});

  const statusLegendId = useId();

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
              onChange={(event) => setIndustry(event.target.value)}
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
