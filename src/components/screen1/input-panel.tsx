"use client";

import { useId, useMemo, useRef, useState } from "react";

import { formatRevenueBand } from "@/components/public/primitives";
import { type GccStatus, type PeerViewInput } from "@/data/screen1";
import {
  HQ_COUNTRY_TERMS,
  INDUSTRY_TERMS,
  SUB_INDUSTRY_TERMS,
} from "@/data/search-terms";
import { usePublicCopy } from "@/components/public/copy-context";
import { cn } from "@/lib/utils";
import { SelectField } from "./select-field";
import { ASK } from "./copy";

/**
 * The ask: four controls over six fields, three of them required.
 *
 * Every input has a consumer. Company name is the one optional answer asked for on
 * its own — it personalises copy. There is deliberately no revenue *figure* (the
 * data holds bands, so the input is a band) and no email: this tool informs and
 * earns a conversation, and there is no lead capture anywhere in the codebase.
 *
 * **Sub-industry is no longer a control of its own — it lives INSIDE the industry
 * dropdown**, as a second pane that cascades out of the industry the visitor picks.
 * It is the same field on `PeerViewInput` and the same optional answer; what changed
 * is that choosing it is one act rather than two. Three things paid for the merge:
 *
 *   - Five controls plus a submit is six cells over two columns, which fits, and
 *     five fields whose second column carries a status line under one of them does
 *     not — the row grew and left an ~80px hole above the button. Four controls plus
 *     a full-width submit is two clean rows and a terminal action.
 *   - It was the only control on the form that was disabled until another was
 *     answered, which needed a live region to announce that it had become usable.
 *     A nested level needs neither: it is not there until the industry it belongs to
 *     is open.
 *   - Fewer clicks for the same answer. Open, expand, choose — against open,
 *     choose, open, choose.
 *
 * The disabled-then-enabled shape is gone with it, and so is the status line that
 * existed to announce the enabling. The affordance moves inside the panel, where the
 * thing it describes actually is; see `SelectField`'s `hint`.
 *
 * **The India-presence question was removed at ANSR's request, and its FIELD was
 * not.** `gccStatus` still exists on `PeerViewInput`, still branches Screen 2's
 * `functionFraming` and reaches the page through it, and is now supplied as a
 * constant — see `ASSUMED_GCC_STATUS` for which value and why.
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
 * it. The one line that survives is inside the industry PANEL, because the nested
 * level is the only thing on this form a visitor cannot see the shape of before
 * opening it. What the matching actually did with the answers is said on the result, where
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
   * **Nothing carries it now, and the prop is kept rather than deleted.** It
   * existed for sub-industry, which was a control disabled until an industry was
   * chosen — the marker was what explained why it could be left alone. That control
   * is gone: sub-industry is a cascading second pane inside the industry dropdown,
   * where the pane's own leading row says what happens if it is left alone.
   *
   * Company name deliberately never carried it, though the server accepts an empty
   * name: it is what personalises every sentence in the result, and labelling it
   * optional talked visitors out of the one field that costs nothing and changes
   * the most.
   *
   * So the form has no "(optional)" on it at all, which is the honest state — every
   * control that is drawn is one we want answered.
   */
  optional?: boolean;
  children: (ids: { controlId: string; describedBy?: string }) => React.ReactNode;
}

/**
 * One labelled control.
 *
 * **There is no `span` any more, and dropping it is what fixed the form's worst
 * visual problem.** The grid was six columns with two three-column text inputs on
 * the first row and three two-column selects on the second, chosen because six
 * divides by both two and three so neither row left an empty cell. It works
 * arithmetically and fails optically: two and three share no INTERIOR column
 * boundary, so the split in row one lands in the middle of a field in row two and
 * nothing below the outer edges lines up. Five fields, six different vertical edges.
 * That raggedness is most of what read as dated.
 *
 * The grid is two equal columns now — two full rows of two, then the submit across
 * both — so every control is the same width and every edge agrees. DOM order is
 * unchanged, which matters twice: it is the tab order, and it is the order the
 * browser specs read in.
 *
 * **The submit spans the grid rather than sitting in a fifth cell, and that is a
 * consequence of the industry merge.** With five controls the submit filled the
 * sixth cell, which was the only arrangement that left no hole; with four it would
 * leave one beside it. A full-width terminal action leaves none and is the plainer
 * shape: two rows of fields, then the one thing to do.
 *
 * `group` is here for the label, which tints to the accent while anything inside the
 * field is focused. Decoration only — the focus ring and the field's own edge carry
 * the state, so nothing is signalled by colour alone.
 */
function Field({ label, error, optional, children }: FieldProps) {
  const controlId = useId();
  const errorId = `${controlId}-error`;
  const describedBy = error ? errorId : undefined;

  return (
    <div className="group flex min-w-0 flex-col gap-2">
      {/* Sentence case, not caps. Tracked uppercase labels were tried and are the
          wrong idiom here: at 14px across five fields they turned a public form into
          a data-entry table, and the reference's own small label is sentence-case
          Light. Weight carries the label instead.

          **Medium, not Semibold.** At 14px Semibold over a Light 300 value read
          shouty — the label was working harder than the answer it introduced. Medium
          against Light is still a two-step interval, which is all the hierarchy a
          label needs. */}
      <label
        htmlFor={controlId}
        className={cn(
          "text-sm font-medium text-text",
          "transition-colors duration-fast ease-standard group-focus-within:text-accent-teal",
        )}
      >
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
  //
  // **The `md:px-3` clipping workaround is gone, and the two-column grid is why.**
  // It existed because the three selects were two-of-six columns at `md` — 179px,
  // which left 119px for a placeholder needing 125, so "Choose a country" silently
  // rendered as "Choose a coun…". At two equal columns the narrowest select is 284px
  // at that breakpoint, so the padding no longer has to be clawed back at one
  // width. A uniform inset is also the point: the old version had one inset at `md`
  // and another either side of it, which is three shapes for one control.
  "gcc-field h-12 w-full min-w-0 px-4 text-base font-light text-text",
  "outline-none",
);

/**
 * A plain string list as options, where the value and the label are the same thing.
 *
 * Industry, revenue band and country are all their own identifiers — the taxonomy
 * stores the display string and the matching compares it. Only sub-industry has a
 * separate id, and it builds its options inline.
 */
function asOptions(
  values: readonly string[],
  terms?: Readonly<Record<string, readonly string[]>>,
) {
  return values.map((value) => ({ value, label: value, terms: terms?.[value] }));
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

/**
 * Everything the four controls need in order to offer their options, as ONE type.
 *
 * **Extracted because the form is rendered in two places now.** The entry point mounts
 * it as the ask, and both result screens mount it inside `AnswerEditor` so a visitor can
 * correct an answer without leaving the result. Four separately-threaded props across two
 * screens and three components is four chances for the result's dropdowns to offer a
 * different set from the entry point's — which would be a peer set matched against
 * options one of the two forms could not produce.
 */
export interface AskOptions {
  industries: TieredOptions;
  revenueBands: readonly string[];
  hqCountries: TieredOptions;
  /**
   * Industry -> the sub-industries on offer within it.
   *
   * Passed whole rather than fetched on change, because the payload is a few
   * kilobytes of labels and a round trip per industry selection would put a
   * spinner inside a dropdown for no gain.
   */
  businessTypesByIndustry: Readonly<Record<string, readonly BusinessTypeOption[]>>;
}

export interface InputPanelProps extends AskOptions {
  /** Set when returning to the form, so a correction starts from the last answer. */
  initial?: Partial<PeerViewInput>;
  pending: boolean;
  /** Server-side failure, surfaced above the button rather than per field. */
  submitError?: string | null;
  onSubmit: (input: PeerViewInput) => void;
  /**
   * What the submit says, where it is not the entry point's own published label.
   *
   * **Only the answer editor passes it, and it has to.** `copy.askSubmit` is "Build my
   * GCC Landscape", which is true on the entry point and false in a panel sitting on top
   * of a landscape that already exists — a visitor correcting one dropdown is updating a
   * result, not building one. It is a prop rather than a second published key because
   * the two labels are the same decision said twice: reword the ask and this has to
   * follow, so it is composed from the one field instead. See `AnswerEditor`.
   */
  submitLabel?: string;
}

type Errors = Partial<Record<"industry" | "revenueBand" | "hqCountry", string>>;

/**
 * The India-presence answer the form no longer asks for.
 *
 * **`gccStatus` is still in `PeerViewInput`, still required, and still RENDERED — the
 * QUESTION was removed, not the field.** What renders it is `functionFraming` on Screen
 * 2, which branches on it for the `h2`, the lead and all three fields of the closing CTA.
 * Keeping the contract intact is deliberate: the branch is a real product feature (the
 * answer is framed differently for someone evaluating a first centre than for someone
 * expanding a tenth), the schema and server validation are untouched, and restoring the
 * control is a UI change rather than a data migration if ANSR wants the question back.
 *
 * **It used to say the field's only consumer was Screen 1's `framing()`, and that is now
 * backwards twice over.** `framing()` has no caller in `src/` at all — Screen 1's band
 * line is a constant — while Screen 2 has always rendered five strings off this field. A
 * reader who takes `framing()`'s deadness for the field's would delete `gccStatus` and
 * break Screen 2's heading and its call to action.
 *
 * `evaluating` is the branch to stand in on, because it is the one whose copy is
 * true regardless of who is reading — a statement about the industry rather than a claim
 * about the visitor. The other two assert something the visitor never told us.
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
  submitLabel,
}: InputPanelProps) {
  const copy = usePublicCopy();
  const [companyName, setCompanyName] = useState(initial?.companyName ?? "");
  const [industry, setIndustry] = useState(initial?.industry ?? "");
  const [revenueBand, setRevenueBand] = useState(initial?.revenueBand ?? "");
  const [hqCountry, setHqCountry] = useState(initial?.hqCountry ?? "");
  const [businessTypeId, setBusinessTypeId] = useState(initial?.businessTypeId ?? "");
  const [errors, setErrors] = useState<Errors>({});

  /**
   * The industry dropdown's own options: every industry, carrying the sub-industries
   * mapped to it as its cascade.
   *
   * Built here rather than in `screen1.ts` because the TIERS are the view model's
   * decision and the NESTING is this control's — the same two groups the flat
   * version rendered, each option carrying its own children.
   */
  const industryGroups = useMemo(() => {
    const nest = (name: string) => ({
      value: name,
      label: name,
      // Search terms, not display text. This is the row a visitor has to be able to
      // reach: taking `All of {industry}` instead drops the primary ordering signal,
      // and the peer set that comes back is then band-and-size only. See
      // `src/data/search-terms.ts` for the measurement.
      terms: INDUSTRY_TERMS[name],
      children: (businessTypesByIndustry[name] ?? []).map((option) => ({
        value: option.id,
        label: option.name,
        terms: SUB_INDUSTRY_TERMS[option.id],
      })),
    });
    return [
      { label: "Most common", options: industries.common.map(nest) },
      { label: "All industries", options: industries.others.map(nest) },
    ];
  }, [industries, businessTypesByIndustry]);

  /**
   * One control, two answers.
   *
   * A nested option hands its parent back, so a sub-industry sets the industry it
   * belongs to at the same time — which is the whole reason the two fields could
   * become one. A top-level choice clears any sub-industry: it is the visitor
   * saying "all of this industry", and it is also the only correct thing to do when
   * the industry changed, since an id from the old one does not exist in the new one
   * and the server rejects it rather than silently widening the set.
   */
  function handleIndustryChange(value: string, parent?: string) {
    if (parent) {
      setIndustry(parent);
      setBusinessTypeId(value);
    } else {
      setIndustry(value);
      setBusinessTypeId("");
    }
    clearError("industry");
  }

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
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* **Two equal columns, three rows, with the submit in the sixth cell.** The
          reasoning is on `Field` — the short version is that the previous six-column
          grid put a 3/3 row above a 2/2/2 row, which share no interior boundary, so
          five fields drew six unaligned vertical edges.

          `items-start` so a field carrying a status line below it does not stretch its
          neighbour; `gap-x-6 gap-y-6` so the vertical rhythm between rows matches the
          gap between columns and the grid reads as a grid. */}
      <div className="grid items-start gap-6 md:grid-cols-2">
        {/* Not marked optional, though the server accepts it empty. See
            `FieldProps.optional` — this is the input that personalises every
            sentence in the result, and the marker was talking a visitor out of the
            one field that costs nothing and changes the most. */}
        <Field label="Company name">
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

        {/*
          Industry, and sub-industry cascading out of it.

          The two groups are there for the same reason the country list has them:
          the industries that cover most of the data lead, plus the two ANSR expects
          out of proportion to the dataset, and the rest is alphabetical so a
          mid-frequency industry is findable. See `industryOptions`.

          The label stays "Industry" rather than becoming "Industry and line of
          business": the field's primary answer is the industry, and a label naming
          both would promise a second required choice. The hint inside the panel is
          where the nested level is offered, which is where it can be seen.
        */}
        <Field label="Industry" error={errors.industry}>
          {({ controlId, describedBy }) => (
            <SelectField
              id={controlId}
              value={businessTypeId || industry}
              triggerRef={(node) => {
                controls.current.industry = node;
              }}
              placeholder="Choose your industry"
              /* The one piece of help text on the form, and it is inside the panel
                 rather than under the label — see `InputPanel`'s note on why no
                 field carries a description. It has to name the SECOND pane, which
                 is the only thing here a visitor cannot see the shape of before
                 opening the control. */
              hint="Pick an industry to see its sub-industries (optional)"
              childLabel="sub-industries"
              /* **Widened to the whole form grid, in two columns.** 24 industries in a
                 field-width popup showed eight of them, so a visitor was deciding
                 between industries without seeing the set — and one who cannot find
                 their own row takes the broad answer, which drops the primary ordering
                 signal off the peer set. Two columns rather than three because the
                 taxonomy's longest name is 41 characters; see the `columns` prop. */
              wide
              invalid={Boolean(errors.industry)}
              describedBy={describedBy}
              onChange={handleIndustryChange}
              groups={industryGroups}
            />
          )}
        </Field>

        <Field
          label="Annual revenue"
          error={errors.revenueBand}
        >
          {({ controlId, describedBy }) => (
            <SelectField
              id={controlId}
              value={revenueBand}
              triggerRef={(node) => {
                controls.current.revenueBand = node;
              }}
              placeholder="Choose a band"
              /* **The currency, once.** Every row used to carry its own `$` — up to two
                 each, fourteen across seven rows — which is fourteen marks saying one
                 thing and crowding the figures that differ. The hint is the panel's own
                 place for a statement about the whole list, and it is where the industry
                 control already puts its one piece of help text. */
              hint="All figures in US dollars."
              invalid={Boolean(errors.revenueBand)}
              describedBy={describedBy}
              onChange={(next) => {
                setRevenueBand(next);
                clearError("revenueBand");
              }}
              /* One group, in the taxonomy's own stored order. Never tiered and
                 never sorted: that order is the peer-matching contract, because the
                 "adjacent band" step is index arithmetic on the array.

                 **The only control whose label is not its value.** `formatRevenueBand`
                 spells `<` out as "Under" and takes the currency mark off; the value
                 committed is still the stored string, so nothing about matching or
                 validation sees the rewrite. */
              groups={[
                {
                  label: "Revenue bands",
                  options: revenueBands.map((band) => ({
                    value: band,
                    label: formatRevenueBand(band),
                  })),
                },
              ]}
            />
          )}
        </Field>

        <Field
          label="Headquarters"
          error={errors.hqCountry}
        >
          {({ controlId, describedBy }) => (
            <SelectField
              id={controlId}
              value={hqCountry}
              triggerRef={(node) => {
                controls.current.hqCountry = node;
              }}
              placeholder="Choose a country"
              /* Three columns, where industry takes two: a country name is short, so
                 the list that gains most from density is also the one that can afford
                 it. This is the longest list on the form by a wide margin and the
                 filter is still what most visitors will use to cross it. */
              wide
              columns={3}
              invalid={Boolean(errors.hqCountry)}
              describedBy={describedBy}
              onChange={(next) => {
                setHqCountry(next);
                clearError("hqCountry");
              }}
              /* The twelve countries the data has most companies in lead; every
                 other country in the world follows, alphabetically. Past twelve the
                 counts are in single figures and frequency stops being informative.
                 Long enough that the panel gives itself a filter. */
              groups={[
                {
                  label: "Most common",
                  options: asOptions(hqCountries.common, HQ_COUNTRY_TERMS),
                },
                {
                  label: "All countries",
                  options: asOptions(hqCountries.others, HQ_COUNTRY_TERMS),
                },
              ]}
            />
          )}
        </Field>

        {/* **The submit spans both columns as its own row.** With five controls it
            sat in the grid's sixth cell, which was the only arrangement that left no
            empty one; with four controls that inverts — a button in a fifth cell
            leaves a hole beside it, and an empty cell in the middle of the one thing
            on the entry point a visitor has to DO is the artefact this layout keeps
            being rearranged to close.

            Two rows of fields and then a terminal action is also the plainer reading
            order: nothing sits beside the button competing for the same glance, and
            the action's own edges are the card's rather than a column's. */}
        <div className="flex min-w-0 flex-col gap-3 md:col-span-2">
          {/* Not role="alert": this appears in response to the visitor's own submit,
              which they are already attending to, and an assertive interruption for
              a routine failure is exactly what that role should not be used for. */}
          {submitError ? (
            <p role="status" className="ansr-field-error text-sm">
              {submitError}
            </p>
          ) : null}
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
              // **Full width at every size, because the row is the width.**
              // It used to be intrinsic from `sm` up, to avoid a 160px button
              // reading as a lesser control under a stack of full-width fields.
              // Inside the grid that reasoning inverts: an intrinsic-width button
              // reintroduces the same ragged edge the grid was rebuilt to remove,
              // and filling its row is what makes it read as the form's conclusion
              // rather than as an afterthought parked in a corner.
              "w-full",
              "bg-action text-text",
              // **Press feedback, and it is the cheapest polish on the page.** A
              // button that does not move under a press reads as a picture of a
              // button. 0.98 is small enough that nobody will name it and large
              // enough to register; `transform` and `background-color` are named
              // explicitly rather than `all`, so the transition cannot pick up a
              // property it was never measured for.
              "transition-[background-color,transform] duration-fast ease-standard",
              "active:scale-[0.98]",
              "hover:bg-action-hover disabled:opacity-60 disabled:active:scale-100",
            )}
          >
            {/* **The resting label is published copy; the pending one is not.** One is
                what a visitor reads while deciding to press, which is positioning; the
                other is a transient machine state an admin could not see the effect of
                editing. See `ASK.submitPending`. */}
            {pending ? ASK.submitPending : (submitLabel ?? copy.askSubmit)}
          </button>
        </div>
      </div>
    </form>
  );
}
