"use client";

import { useId } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Form field primitives for the admin.
 *
 * Three decisions worth recording:
 *
 *   - Single column, top-aligned labels, helper text between the label and the
 *     control. Faster to scan than left-aligned, and resilient to a long label.
 *   - A native <select>, not a listbox. The city list runs past a hundred
 *     entries and the industry list past forty; a native select gives keyboard
 *     type-ahead and the platform's own long-list behaviour for free, which a
 *     custom widget would have to rebuild and would rebuild worse.
 *   - Errors sit directly below the control, wired with aria-describedby and
 *     aria-invalid, never as a colour change alone.
 */

interface FieldShellProps {
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  className?: string;
  children: (ids: { controlId: string; describedBy?: string }) => React.ReactNode;
}

function FieldShell({
  label,
  hint,
  error,
  optional,
  className,
  children,
}: FieldShellProps) {
  const controlId = useId();
  const hintId = `${controlId}-hint`;
  const errorId = `${controlId}-error`;
  const describedBy =
    [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") ||
    undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={controlId}>
        {label}
        {/* Optional is marked, not required — most fields here are required, so
            flagging the exceptions is the quieter signal. */}
        {optional ? (
          <span className="font-regular text-text-muted"> (optional)</span>
        ) : null}
      </Label>
      {hint ? (
        <p id={hintId} className="text-xs text-text-muted">
          {hint}
        </p>
      ) : null}
      {children({ controlId, describedBy })}
      {/* .ansr-field-error is the brand's own form-based error treatment: an
          orange rule plus weight, not a danger hue, because this palette has
          none. See tokens.css. */}
      {error ? (
        <p id={errorId} className="ansr-field-error text-xs">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function TextField({
  label,
  hint,
  error,
  optional,
  className,
  value,
  onChange,
  inputMode,
  placeholder,
  widthClass,
}: {
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  className?: string;
  value: string;
  onChange: (value: string) => void;
  inputMode?: React.ComponentProps<"input">["inputMode"];
  placeholder?: string;
  /** Field width should reflect expected input length. */
  widthClass?: string;
}) {
  return (
    <FieldShell
      label={label}
      hint={hint}
      error={error}
      optional={optional}
      className={className}
    >
      {({ controlId, describedBy }) => (
        <Input
          id={controlId}
          value={value}
          inputMode={inputMode}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={widthClass}
        />
      )}
    </FieldShell>
  );
}

export function SelectField({
  label,
  hint,
  error,
  className,
  value,
  options,
  onChange,
  placeholder = "Choose…",
}: {
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <FieldShell label={label} hint={hint} error={error} className={className}>
      {({ controlId, describedBy }) => (
        <select
          id={controlId}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            "h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base text-text shadow-xs",
            "outline-none transition-[color,box-shadow] duration-fast",
            "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
            "aria-invalid:border-feedback-attention md:text-sm",
          )}
        >
          {/* An empty option so a missing value is visible rather than
              masquerading as the first real one. */}
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      )}
    </FieldShell>
  );
}

/**
 * Two-or-fewer options is a checkbox, not a select. The label and the box share
 * one hit target with no dead zone between them.
 */
export function CheckboxField({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={id}
        className="flex min-h-[24px] cursor-pointer items-center gap-2.5 text-sm text-text"
      >
        <input
          id={id}
          type="checkbox"
          checked={checked}
          aria-describedby={hint ? hintId : undefined}
          onChange={(event) => onChange(event.target.checked)}
          className="size-4 shrink-0 accent-[var(--ansr-accent)]"
        />
        {label}
      </label>
      {hint ? (
        <p id={hintId} className="ps-[26px] text-xs text-text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Multi-select over a long list, as a filterable checkbox group rather than a
 * custom combobox. Every option stays a real checkbox, so the platform supplies
 * the keyboard behaviour and the screen-reader state.
 */
export function CheckboxGroupField({
  legend,
  hint,
  error,
  options,
  selected,
  onToggle,
  filterLabel,
  filter,
  onFilterChange,
  emptyMessage,
}: {
  legend: string;
  hint?: string;
  error?: string;
  options: readonly string[];
  selected: readonly string[];
  onToggle: (value: string, checked: boolean) => void;
  filterLabel: string;
  filter: string;
  onFilterChange: (value: string) => void;
  emptyMessage: string;
}) {
  const groupId = useId();
  const hintId = `${groupId}-hint`;
  const errorId = `${groupId}-error`;
  const filterId = `${groupId}-filter`;
  const selectedSet = new Set(selected);

  return (
    <fieldset
      className="flex flex-col gap-2"
      aria-describedby={
        [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") ||
        undefined
      }
    >
      <legend className="text-sm font-medium text-text">{legend}</legend>
      {hint ? (
        <p id={hintId} className="text-xs text-text-muted">
          {hint}
        </p>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={filterId} className="text-xs font-regular text-text-muted">
          {filterLabel}
        </Label>
        <Input
          id={filterId}
          value={filter}
          onChange={(event) => onFilterChange(event.target.value)}
          placeholder="Type to narrow the list"
        />
      </div>

      {/* Selected values are pulled out above the list, so a choice made and
          then filtered out of view does not look like it was lost. */}
      {selected.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {selected.map((value) => (
            <li key={value}>
              <button
                type="button"
                onClick={() => onToggle(value, false)}
                className="inline-flex min-h-6 items-center gap-1.5 rounded-md bg-surface-sunken px-2 py-1 text-xs text-text transition-colors duration-fast hover:bg-surface-accent hover:text-text-on-accent"
              >
                {value}
                <span aria-hidden="true">×</span>
                <span className="sr-only">Remove</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="max-h-56 overflow-y-auto border border-border-subtle bg-surface p-2">
        {options.length === 0 ? (
          <p className="px-1 py-2 text-sm text-text-muted">{emptyMessage}</p>
        ) : (
          <ul className="flex flex-col">
            {options.map((option) => {
              const optionId = `${groupId}-${option}`;
              return (
                <li key={option}>
                  <label
                    htmlFor={optionId}
                    className="flex min-h-7 cursor-pointer items-center gap-2.5 px-1 text-sm text-text"
                  >
                    <input
                      id={optionId}
                      type="checkbox"
                      checked={selectedSet.has(option)}
                      onChange={(event) => onToggle(option, event.target.checked)}
                      className="size-4 shrink-0 accent-[var(--ansr-accent)]"
                    />
                    {option}
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {error ? (
        <p id={errorId} className="ansr-field-error text-xs">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

/**
 * A multi-line field, for the one kind of content the metric editor collects that
 * a single-line input would truncate out of sight: the internal working note.
 * Resizable vertically only — horizontal resize breaks out of the dialog.
 */
export function TextAreaField({
  label,
  hint,
  error,
  optional,
  value,
  onChange,
  rows = 3,
}: {
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  return (
    <FieldShell label={label} hint={hint} error={error} optional={optional}>
      {({ controlId, describedBy }) => (
        <textarea
          id={controlId}
          rows={rows}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            "w-full min-w-0 resize-y rounded-md border border-input bg-transparent px-3 py-2 text-base text-text shadow-xs",
            "outline-none transition-[color,box-shadow] duration-fast",
            "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
            "aria-invalid:border-feedback-attention md:text-sm",
          )}
        />
      )}
    </FieldShell>
  );
}
