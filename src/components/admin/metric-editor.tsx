"use client";

import { useState } from "react";

import { useDraft } from "@/components/admin/draft-provider";
import {
  CheckboxField,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/admin/fields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { METRIC_FORMAT_LABELS } from "@/data/metrics";
import { metricSchema, type Metric, type MetricValue } from "@/data/schema";

/**
 * One metric, definition and figures together.
 *
 * Three decisions worth recording.
 *
 * **Labels and numbers sit next to each other.** A breakdown's parts are edited
 * as a list of rows, each row carrying the part's name and its figure. The
 * alternative — a list of labels here, a list of numbers there — makes the admin
 * hold the alignment in their head, and it is the alignment that goes wrong.
 *
 * **Format and gating are not fields.** Neither appears as a control, because
 * neither is an editorial choice: the format decides whether a cell may hold
 * text, and which metrics sit behind the gate is an invariant in project.md. The
 * provider re-pins both on save regardless of what arrives.
 *
 * **`atLeast` IS a field, and the line between it and those two is worth being
 * precise about.** It is part of the definition, like the format — but it is a
 * statement about how the figures in front of the admin were arrived at, which is
 * the one thing only whoever entered them knows. "8.7 million or more" against
 * "8.7 million" is their call about their own number, so the provider takes it from
 * this form rather than re-pinning it. `progression` and `subset` are not fields
 * for the opposite reason: both change which chart is drawn.
 *
 * **Gated metrics are edited normally, and say why that is safe.** The value is
 * held in the dataset and omitted server-side on the way out — see
 * `publicMetric`. The admin browser is authenticated and already holds the whole
 * dataset; the visitor's receives a placeholder of the right shape and no number.
 */

type CellText = string;

interface Form {
  title: string;
  question: string;
  unit: string;
  indexBaseline: string;
  asOf: string;
  note: string;
  /** Part of the definition. See the note on `atLeast` at the top of this file. */
  atLeast: boolean;
  /** Range only. */
  minLabel: string;
  maxLabel: string;
  /** Scalar only. */
  scalar: CellText;
  /** Range only. */
  min: CellText;
  max: CellText;
  /** Breakdown only, parallel arrays. */
  entries: string[];
  entryValues: CellText[];
  /** Matrix only. */
  rows: string[];
  columns: string[];
  cells: CellText[][];
}

type Errors = Partial<Record<"title" | "question" | "unit" | "indexBaseline" | "shape" | "values" | "form", string>>;

function cellToText(cell: number | string | null): string {
  return cell === null ? "" : String(cell);
}

function toForm(metric: Metric): Form {
  const value = metric.value;
  const structure = metric.structure;

  const base: Form = {
    title: metric.title,
    question: metric.question,
    unit: metric.unit ?? "",
    indexBaseline: metric.indexBaseline ?? "",
    asOf: metric.asOf ?? "",
    note: metric.note ?? "",
    atLeast: metric.atLeast ?? false,
    minLabel: structure.kind === "range" ? structure.minLabel ?? "" : "",
    maxLabel: structure.kind === "range" ? structure.maxLabel ?? "" : "",
    scalar: "",
    min: "",
    max: "",
    entries: structure.kind === "breakdown" ? [...structure.entries] : [],
    entryValues:
      structure.kind === "breakdown" ? structure.entries.map(() => "") : [],
    rows: structure.kind === "matrix" ? [...structure.rows] : [],
    columns: structure.kind === "matrix" ? [...structure.columns] : [],
    cells:
      structure.kind === "matrix"
        ? structure.rows.map(() => structure.columns.map(() => ""))
        : [],
  };

  if (value === null) return base;
  if (value.kind === "scalar") return { ...base, scalar: String(value.value) };
  if (value.kind === "range") {
    return { ...base, min: String(value.min), max: String(value.max) };
  }
  if (value.kind === "breakdown") {
    return {
      ...base,
      entryValues: base.entries.map((_, i) => cellToText(value.values[i] ?? null)),
    };
  }
  return {
    ...base,
    cells: base.rows.map((_, r) =>
      base.columns.map((_c, c) => cellToText(value.cells[r]?.[c] ?? null)),
    ),
  };
}

/** "" is an unfilled slot, not a zero. Anything unparseable is reported. */
function parseNumber(text: string): number | null | "invalid" {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : "invalid";
}

/* --------------------------------------------------------------------------
   Three couplings the admin cannot otherwise see

   Three places on the public screens read something this form controls and change
   quietly when it moves. Each is documented where it lives. What was missing is that
   the person typing had no way to know. These notices are that, and nothing more: they
   are advisory, they never block a save, and they never mark a field invalid.

   **TWO OF THE THREE ARE COSMETIC AND THE THIRD IS NOT, and the wording has to keep
   them apart.** The glyph column and the comparator tone are accepted trades — the
   figure, the order and the words are all unaffected, so nothing the screen CLAIMS can
   move, and the notices for both say as much. The scale-milestone rule is different in
   kind: it warns that the public card would state something FALSE. It gets no softening
   clause for that reason.

   **One earlier notice was deleted rather than kept, because its coupling went.** A
   ratings grid used to emphasise the column called "India" — a pale band the height of
   the grid, a teal heading, deeper segments — so renaming it lost the emphasis and the
   admin was warned. ANSR asked for that emphasis off the capability grid entirely;
   `grid.anchorColumn` is still derived and is drawn by nothing, so renaming the column
   now changes nothing a visitor sees. A notice describing a consequence that no longer
   happens is worse than no notice: it is a warning the reader cannot verify and will
   learn to ignore.

   **The three key lists below are MIRRORS, copied rather than imported, and they can
   drift.** No source is importable here: `metric-card.tsx`, `hr-view.tsx` and
   `milestone-card.tsx` are public components, and importing any of them would pull the
   public screen's React tree into the admin bundle. So the copies are the cheap option
   and the drift is the cost. If a source list gains an entry, add it here too.
   -------------------------------------------------------------------------- */

/**
 * Mirror of `CAPABILITY_ICONS` in `src/components/screen2/metric-card.tsx`.
 *
 * Keyed by matrix ROW label, and all-or-nothing: the public grid draws a glyph beside
 * every row or beside none, because four rows of five carrying one reads as a row that
 * failed to load. So renaming ONE row takes the glyphs off ALL of them.
 */
const GLYPH_ROWS: readonly string[] = [
  "Product engineering",
  "Data and AI",
  "Cloud and platform",
  "Cybersecurity",
  "Enterprise technology",
  "Shared services",
  "Engineering",
];

/**
 * Mirror of `SALARY_TONES` in `src/components/screen2/hr-view.tsx`.
 *
 * Keyed by breakdown ENTRY label. This row of the salary ranking draws in its own tone
 * so the comparator reads as the comparator; every other row takes the subject tone.
 *
 * **One entry, not two.** "Non-ER&D roles" took the muted grey and no longer does — it
 * was reading as a third category rather than as another measurement of the same thing —
 * and it has been renamed "Roles outside engineering R&D" besides. "All roles" lost its
 * "(reference)" suffix at ANSR's request; the self-descriptive label "All roles" names
 * the comparator itself now, so there is no sentence under the chart to keep in step.
 */
const TONED_ENTRIES: readonly string[] = ["All roles"];

/**
 * Mirror of `ANSR_MONTHS` in `src/components/screen2/milestone-card.tsx`, and of the two
 * metric ids that card is drawn for.
 *
 * **This is the one coupling here that can make the public screen state something
 * false, and it is the only reason this rule exists.** The scale-milestone card draws a
 * second rail captioned "Built with ANSR" whose figures are supplied in code rather than
 * held in the dataset — the project owner's decision, recorded in project.md — and it is
 * drawn at the MARKET rail's own positions, so the numbers are the only thing saying the
 * ANSR curve is the faster one. An admin editing the market months down to 3, 6, 12, 18
 * would leave a card claiming ANSR reaches fifty FTEs in four months beside a market
 * that reaches it in three. Nothing else catches that: the supplied months are not in
 * the dataset, so the schema cannot see them, the publish diff cannot see them and
 * `data:verify` cannot see them.
 *
 * **Two deviations from its two siblings, both deliberate.** It keys on `metric.id`
 * rather than on a label, because a figure has no name to key on and the id is the one
 * handle admin cannot change. And it reads the FORM ALONE rather than comparing the form
 * with the saved metric: the other two warn about something an edit is taking away,
 * where this warns about the state the card would be left in — which is worth saying even
 * on a metric that was already wrong before this dialog opened.
 */
const ANSR_RAIL_IDS: readonly string[] = [
  "ops-scale-milestones",
  "hr-scale-milestones",
];
const ANSR_RAIL_MONTHS: readonly number[] = [4, 8, 16, 24];

interface Coupling {
  id: string;
  text: string;
}

/**
 * What the public screen would stop drawing if this form were saved as it stands.
 *
 * Every rule compares the SAVED metric with the form, so a notice only ever appears
 * where something real is about to be lost — a metric that never had a glyph column
 * cannot be warned about losing one. Nothing here is a validation: the word "loses"
 * is doing the work, and the save button is unaffected.
 */
function couplings(metric: Metric, form: Form): Coupling[] {
  const notices: Coupling[] = [];
  const structure = metric.structure;
  const trimmed = (values: readonly string[]) => values.map((value) => value.trim());

  if (structure.kind === "matrix") {
    const saved = trimmed(structure.rows);
    const rows = trimmed(form.rows);
    /**
     * Rating format only, because the glyph column is drawn by the ordinal grid and
     * nothing else reads the row names.
     */
    if (
      metric.format === "rating" &&
      saved.length > 0 &&
      saved.every((row) => GLYPH_ROWS.includes(row)) &&
      !rows.every((row) => GLYPH_ROWS.includes(row))
    ) {
      notices.push({
        id: "rows",
        text:
          "The small mark beside each row comes off the whole grid, not just the row you changed — the visitor sees every row without one. The names the public screen recognises are: " +
          `${GLYPH_ROWS.join(", ")}.`,
      });
    }

    // The subject-column notice used to be here and is gone with the emphasis it warned
    // about. See the block comment above.
  }

  if (structure.kind === "breakdown") {
    const entries = trimmed(form.entries);
    const lost = TONED_ENTRIES.filter(
      (entry) => trimmed(structure.entries).includes(entry) && !entries.includes(entry),
    );
    if (lost.length > 0) {
      notices.push({
        id: "entries",
        text: `${lost.join(" and ")} draws in its own tone on the public ranking, so a reader can see at a glance which row is the comparison. Renamed, it draws like every other row — the words in the name are what actually tell them, so nothing is stated any less clearly.`,
      });
    }

    /**
     * The scale curve's second rail. See `ANSR_RAIL_MONTHS` for why this one is not a
     * cosmetic warning, and `milestone-card.tsx` for where the months it compares against
     * are supplied.
     *
     * Only a waypoint the second rail actually draws is checked: it zips by position and
     * drops anything past the end of the supplied list, so a fifth milestone shortens the
     * rail rather than inventing a fifth month, and there is nothing to warn about there.
     */
    if (ANSR_RAIL_IDS.includes(metric.id)) {
      const conflicts = ANSR_RAIL_MONTHS.flatMap((ansr, index) => {
        const typed = parseNumber(form.entryValues[index] ?? "");
        if (typed === null || typed === "invalid") return [];
        if (typed > ansr) return [];
        return [`${(form.entries[index] ?? "").trim() || `part ${index + 1}`} (${typed})`];
      });
      if (conflicts.length > 0) {
        notices.push({
          id: "ansr-rail",
          text:
            "This card draws a second line captioned “Built with ANSR”, at a fixed " +
            `${ANSR_RAIL_MONTHS.join(", ")} months. These figures are at or below it, so the ` +
            `public card would show ANSR as no faster than a typical centre: ${conflicts.join(", ")}. ` +
            "The ANSR line is set in code and cannot be changed here — ask a developer before saving.",
        });
      }
    }
  }

  /**
   * The one metric whose `unit` is DRAWN beside its figure rather than read as prose.
   *
   * See `DRAWN_UNIT_IDS` for why the schema cannot express this and why the threshold is
   * a length rather than a mirrored constant. Outside the structure branch above, because
   * a unit is a field of the metric rather than of its shape.
   */
  if (DRAWN_UNIT_IDS.includes(metric.id)) {
    const unit = form.unit.trim();
    if (unit.length > DRAWN_UNIT_MAX) {
      notices.push({
        id: "drawn-unit",
        text:
          "This figure opens the operations tab with its unit set beside the number, not " +
          `underneath it — so the unit is drawn at display size in a narrow cell. “${unit}” is ` +
          `${unit.length} characters and the cell fits about ${DRAWN_UNIT_MAX}; longer than that ` +
          "and the public screen clips it on a laptop. Abbreviate it (“mn sq ft”, not “million " +
          "square feet”).",
      });
    }
  }

  return notices;
}

/**
 * The metric whose `unit` the public screen DRAWS, and the length the cell holds.
 *
 * **Why the schema cannot carry this.** `unitSchema` caps a unit at 60 characters, which
 * is right for every other metric: a unit is normally prose in an axis note under a card
 * heading, and two of them are already 39 and 42 characters ("professionals in manager
 * and above roles"). This one is different because the metric is PROMOTED into the
 * operations figure row, where its unit is passed through as `SummaryFigure.unit` and set
 * two scale steps under a 48px numeral — so its render limit is a property of one cell on
 * one tab, and a cap tight enough for it would refuse the other metrics' units outright.
 *
 * **A LENGTH rather than a mirrored constant, which is the deviation from its three
 * siblings.** The other notices mirror a public list — row names, entry names, supplied
 * months — and compare against it. There is no list to mirror here: what constrains this
 * field is 22px of measured headroom in a 192px box at `lg`, and the honest admin-side
 * expression of that is roughly how many characters fit. 12 is "mn sq ft" plus room,
 * derived from the measurement recorded in project.md rather than from the token system.
 * Re-derive it if the figure row's column count or the unit's size step changes.
 *
 * Advisory like the rest: it blocks no save and marks no field invalid.
 */
const DRAWN_UNIT_IDS: readonly string[] = ["ops-grade-a-office-stock"];
const DRAWN_UNIT_MAX = 12;

export function MetricEditor({
  metric,
  open,
  onClose,
}: {
  metric: Metric;
  open: boolean;
  onClose: () => void;
}) {
  const { replaceMetric, clearMetricValue } = useDraft();
  const [form, setForm] = useState<Form>(() => toForm(metric));
  const [errors, setErrors] = useState<Errors>({});

  const kind = metric.structure.kind;
  const isRating = metric.format === "rating";
  const scale = metric.ratingScale ?? [];
  /**
   * Recomputed on every keystroke rather than held in state: it is a pure function of
   * the metric and the form, so a second copy of it could only ever be a stale one.
   */
  const lost = couplings(metric, form);

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors({});
  }

  /** Adding or removing a part keeps the figures already typed, by position. */
  function setEntries(entries: string[], entryValues: CellText[]) {
    setForm((current) => ({ ...current, entries, entryValues }));
    setErrors({});
  }

  function setAxes(rows: string[], columns: string[], cells: CellText[][]) {
    setForm((current) => ({ ...current, rows, columns, cells }));
    setErrors({});
  }

  function buildStructure(): Metric["structure"] {
    switch (kind) {
      case "scalar":
        return { kind: "scalar" };
      case "range":
        return {
          kind: "range",
          ...(form.minLabel.trim() ? { minLabel: form.minLabel.trim() } : {}),
          ...(form.maxLabel.trim() ? { maxLabel: form.maxLabel.trim() } : {}),
        };
      case "breakdown":
        return { kind: "breakdown", entries: form.entries.map((e) => e.trim()) };
      case "matrix":
        return {
          kind: "matrix",
          rows: form.rows.map((r) => r.trim()),
          columns: form.columns.map((c) => c.trim()),
        };
    }
  }

  function buildValue(): MetricValue | null | "invalid" {
    if (kind === "scalar") {
      const n = parseNumber(form.scalar);
      if (n === "invalid") return "invalid";
      return n === null ? null : { kind: "scalar", value: n };
    }
    if (kind === "range") {
      const min = parseNumber(form.min);
      const max = parseNumber(form.max);
      if (min === "invalid" || max === "invalid") return "invalid";
      // A range is one value: half of it is not a partial entry, it is unentered.
      if (min === null || max === null) return null;
      return { kind: "range", min, max };
    }
    if (kind === "breakdown") {
      const values: Array<number | null> = [];
      for (const text of form.entryValues) {
        const n = parseNumber(text);
        if (n === "invalid") return "invalid";
        values.push(n);
      }
      if (values.every((n) => n === null)) return null;
      return { kind: "breakdown", values };
    }
    const cells: Array<Array<number | string | null>> = [];
    for (const row of form.cells) {
      const built: Array<number | string | null> = [];
      for (const text of row) {
        if (isRating) {
          built.push(text.trim() ? text : null);
          continue;
        }
        const n = parseNumber(text);
        if (n === "invalid") return "invalid";
        built.push(n);
      }
      cells.push(built);
    }
    if (cells.flat().every((cell) => cell === null)) return null;
    return { kind: "matrix", cells };
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const next: Errors = {};
    if (!form.title.trim()) next.title = "A title is required — this is the public heading.";
    if (!form.question.trim()) {
      next.question =
        "A question is required. It is what the visitor reads under the title.";
    }
    if (metric.format === "index" && !form.indexBaseline.trim()) {
      next.indexBaseline =
        "An index needs a stated base, otherwise the numbers cannot be read.";
    }
    if (kind === "breakdown" && form.entries.some((e) => !e.trim())) {
      next.shape = "Every part needs a name.";
    }
    if (kind === "matrix") {
      if (form.rows.some((r) => !r.trim())) next.shape = "Every row needs a name.";
      if (form.columns.some((c) => !c.trim())) {
        next.shape = "Every column needs a name.";
      }
    }

    const value = buildValue();
    if (value === "invalid") {
      next.values = "One of the figures is not a number. Leave a slot empty rather than guessing.";
    }

    if (Object.values(next).some(Boolean)) {
      setErrors(next);
      return;
    }

    const candidate: Metric = {
      ...metric,
      title: form.title.trim(),
      question: form.question.trim(),
      ...(form.unit.trim() ? { unit: form.unit.trim() } : { unit: undefined }),
      ...(form.indexBaseline.trim()
        ? { indexBaseline: form.indexBaseline.trim() }
        : { indexBaseline: undefined }),
      ...(form.asOf.trim() ? { asOf: form.asOf.trim() } : { asOf: undefined }),
      ...(form.note.trim() ? { note: form.note.trim() } : { note: undefined }),
      // Written as `undefined` rather than `false` when it is off, so an unmarked
      // metric serialises without the key at all — the same shape the catalogue
      // authored and the diff already compares against.
      atLeast: form.atLeast ? true : undefined,
      structure: buildStructure(),
      value: value === "invalid" ? null : value,
    };

    // The same schema the publish gate runs, so a metric that saves here cannot
    // fail the publish for a shape reason — and the message the admin reads is
    // the schema's own.
    const parsed = metricSchema.safeParse(candidate);
    if (!parsed.success) {
      setErrors({
        form: parsed.error.issues
          .map((issue) => `${issue.path.join(".") || "metric"}: ${issue.message}`)
          .join(" · "),
      });
      return;
    }

    replaceMetric(metric.id, parsed.data);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? null : onClose())}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{form.title || "Edit metric"}</DialogTitle>
          <DialogDescription>
            {METRIC_FORMAT_LABELS[metric.format]}
            {metric.unit ? ` in ${metric.unit}` : ""}. Leave a slot empty rather
            than estimating — an empty slot keeps the metric off the public screen,
            a wrong figure does not.
          </DialogDescription>
        </DialogHeader>

        {metric.gated ? (
          <p className="border border-border-strong bg-surface-sunken px-4 py-3 text-sm text-text">
            <span className="font-semibold">Behind the gate.</span> These figures
            are held here and removed on the server before the public screen is
            built. A visitor receives an empty shape of the right size — never the
            numbers, and never the row and column names.
          </p>
        ) : null}

        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
          <TextField
            label="Title"
            value={form.title}
            onChange={(value) => set("title", value)}
            error={errors.title}
            hint="The heading a visitor reads."
          />

          <TextAreaField
            label="Question it answers"
            value={form.question}
            onChange={(value) => set("question", value)}
            error={errors.question}
            hint="In the visitor's words, not ours. Shown under the title."
          />

          <div className="flex flex-wrap items-start gap-4">
            <TextField
              label="Unit"
              optional
              value={form.unit}
              onChange={(value) => set("unit", value)}
              hint="A noun, never a currency."
              widthClass="w-64"
            />
            <TextField
              label="As of"
              optional
              value={form.asOf}
              onChange={(value) => set("asOf", value)}
              hint="Provenance, e.g. 2026 Q1."
              widthClass="w-40"
            />
          </div>

          {metric.format === "index" ? (
            <TextField
              label="Index base"
              value={form.indexBaseline}
              onChange={(value) => set("indexBaseline", value)}
              error={errors.indexBaseline}
              hint="What 100 refers to."
              widthClass="w-80"
            />
          ) : null}

          {/*
            Absent rather than disabled in the two cases the schema refuses, because
            neither is something an admin can act on: a rating is an ordinal and has
            no "or more", and a progression is drawn from the differences between its
            waypoints, where the difference between two floors is not itself a floor.
            A control that can only ever produce an error is worse than no control.

            **Its label may not contain the word "figure", and that is a test
            constraint rather than a copy preference.** The scalar control below is
            labelled "Figure", `getByLabel` matches on a SUBSTRING, and four admin
            specs locate that control by it — so "Figures are a floor" resolved to two
            elements and broke all four. "Shown as a floor" is also the wording
            `METRIC_FIELD_LABELS.atLeast` already uses in the publish diff, which is
            the better outcome anyway: one set of words for the field an admin sets
            and the field a reviewer approves. See docs/traps.md.
          */}
          {metric.format === "rating" || metric.progression ? null : (
            <CheckboxField
              label="Shown as a floor"
              hint="Every value renders with a trailing + — “8.7M+”. Part of the definition rather than of the value, so it holds for whatever number is entered next."
              checked={form.atLeast}
              onChange={(checked) => set("atLeast", checked)}
            />
          )}

          {kind === "scalar" ? (
            <TextField
              label="Figure"
              optional
              value={form.scalar}
              onChange={(value) => set("scalar", value)}
              error={errors.values}
              inputMode="decimal"
              widthClass="w-40"
            />
          ) : null}

          {kind === "range" ? (
            <fieldset className="flex flex-col gap-3">
              <legend className="text-sm font-medium text-text">Range</legend>
              <p className="max-w-measure text-xs text-text-muted">
                Both ends or neither. The end labels say which operating model
                produces each end, and they belong to the definition rather than
                the figures.
              </p>
              <div className="flex flex-wrap items-start gap-4">
                <TextField
                  label="Lower"
                  value={form.min}
                  onChange={(value) => set("min", value)}
                  inputMode="decimal"
                  widthClass="w-28"
                />
                <TextField
                  label="Upper"
                  value={form.max}
                  onChange={(value) => set("max", value)}
                  error={errors.values}
                  inputMode="decimal"
                  widthClass="w-28"
                />
              </div>
              <TextField
                label="Lower end describes"
                optional
                value={form.minLabel}
                onChange={(value) => set("minLabel", value)}
              />
              <TextField
                label="Upper end describes"
                optional
                value={form.maxLabel}
                onChange={(value) => set("maxLabel", value)}
              />
            </fieldset>
          ) : null}

          {/*
            **Advisory, and `role="status"` rather than `role="alert"` says so.** An
            alert interrupts, which is right for something the admin has to fix and
            wrong for three cosmetic degradations they may well intend. Nothing here
            reaches `errors`, nothing here disables the save, and no field is marked
            invalid — the whole point is that these are decisions rather than mistakes.

            It sits directly above the row, column and part editors, because that is
            where the strings it is about are typed.

            **No new label contains the word "figure".** `getByLabel` matches on a
            SUBSTRING and the scalar control above is labelled "Figure"; a new label
            containing it resolves to two elements and breaks every spec locating the
            shorter one. That has already cost four specs once. See docs/traps.md.
          */}
          {lost.length > 0 ? (
            <div
              role="status"
              className="flex flex-col gap-2 border border-border-subtle bg-surface-subtle px-4 py-3"
            >
              <p className="text-xs font-semibold uppercase tracking-caps text-text-muted">
                Saving this changes how the public screen draws
              </p>
              <ul className="flex max-w-measure flex-col gap-1.5">
                {lost.map((notice) => (
                  <li key={notice.id} className="text-xs text-text">
                    {notice.text}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {kind === "breakdown" ? (
            <BreakdownFields
              entries={form.entries}
              values={form.entryValues}
              error={errors.shape ?? errors.values}
              onChange={setEntries}
            />
          ) : null}

          {kind === "matrix" ? (
            <MatrixFields
              rows={form.rows}
              columns={form.columns}
              cells={form.cells}
              ratingScale={isRating ? scale : null}
              error={errors.shape ?? errors.values}
              onChange={setAxes}
            />
          ) : null}

          <TextAreaField
            label="Internal note"
            optional
            value={form.note}
            onChange={(value) => set("note", value)}
            hint="For whoever maintains this. Never sent to a visitor."
          />

          {errors.form ? (
            <p role="alert" className="ansr-field-error text-sm">
              {errors.form}
            </p>
          ) : null}

          <DialogFooter className="sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              className="ansr-destructive"
              onClick={() => {
                clearMetricValue(metric.id);
                onClose();
              }}
            >
              Clear all figures
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">Save to draft</Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * A breakdown's parts. Name and figure on the same row, so the correspondence is
 * visible rather than counted.
 */
function BreakdownFields({
  entries,
  values,
  error,
  onChange,
}: {
  entries: string[];
  values: string[];
  error?: string;
  onChange: (entries: string[], values: string[]) => void;
}) {
  const errorId = "metric-breakdown-error";
  return (
    <fieldset
      className="flex flex-col gap-3"
      aria-describedby={error ? errorId : undefined}
    >
      <legend className="text-sm font-medium text-text">Parts</legend>
      <p className="max-w-measure text-xs text-text-muted">
        Rename, add or remove a part and the figures already typed stay with their
        row. A part left empty keeps the whole metric off the public screen.
      </p>

      <ul className="flex flex-col gap-2">
        {entries.map((entry, index) => (
          <li key={index} className="flex flex-wrap items-end gap-2">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor={`metric-entry-${index}`} className="text-xs text-text-muted">
                Part {index + 1}
              </Label>
              <Input
                id={`metric-entry-${index}`}
                value={entry}
                onChange={(event) =>
                  onChange(
                    entries.map((e, i) => (i === index ? event.target.value : e)),
                    values,
                  )
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              {/* Numbered, not just "Figure". Every part's number field would
                  otherwise share one accessible name, so a screen-reader user
                  moving between form fields would hear "Figure" five times with
                  nothing to tell them apart. */}
              <Label htmlFor={`metric-entry-value-${index}`} className="text-xs text-text-muted">
                Figure {index + 1}
              </Label>
              <Input
                id={`metric-entry-value-${index}`}
                value={values[index] ?? ""}
                inputMode="decimal"
                className="w-28"
                onChange={(event) =>
                  onChange(
                    entries,
                    values.map((v, i) => (i === index ? event.target.value : v)),
                  )
                }
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={entries.length <= 2}
              onClick={() =>
                onChange(
                  entries.filter((_, i) => i !== index),
                  values.filter((_, i) => i !== index),
                )
              }
            >
              Remove
              <span className="sr-only"> part {index + 1}</span>
            </Button>
          </li>
        ))}
      </ul>

      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...entries, ""], [...values, ""])}
        >
          Add a part
        </Button>
      </div>

      {error ? (
        <p id={errorId} role="alert" className="ansr-field-error text-xs">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

/**
 * A comparison grid. Row and column names are editable above the grid, and the
 * grid is a real table so the row header names each cell for a screen reader.
 */
function MatrixFields({
  rows,
  columns,
  cells,
  ratingScale,
  error,
  onChange,
}: {
  rows: string[];
  columns: string[];
  cells: string[][];
  /** Non-null when cells hold ordinal labels rather than numbers. */
  ratingScale: readonly string[] | null;
  error?: string;
  onChange: (rows: string[], columns: string[], cells: string[][]) => void;
}) {
  const errorId = "metric-matrix-error";

  function editAxis(
    axis: "rows" | "columns",
    action: "rename" | "add" | "remove",
    index: number,
    text?: string,
  ) {
    const current = axis === "rows" ? rows : columns;
    let nextAxis: string[];
    if (action === "rename") {
      nextAxis = current.map((v, i) => (i === index ? text ?? "" : v));
    } else if (action === "add") {
      nextAxis = [...current, ""];
    } else {
      nextAxis = current.filter((_, i) => i !== index);
    }

    const nextRows = axis === "rows" ? nextAxis : rows;
    const nextColumns = axis === "columns" ? nextAxis : columns;
    // Re-fit by position, the same rule alignValue applies on save.
    const nextCells = nextRows.map((_row, r) => {
      const sourceRow = axis === "rows" && action === "remove" && r >= index ? r + 1 : r;
      return nextColumns.map((_column, c) => {
        const sourceColumn =
          axis === "columns" && action === "remove" && c >= index ? c + 1 : c;
        return cells[sourceRow]?.[sourceColumn] ?? "";
      });
    });
    onChange(nextRows, nextColumns, nextCells);
  }

  return (
    <fieldset
      className="flex flex-col gap-3"
      aria-describedby={error ? errorId : undefined}
    >
      <legend className="text-sm font-medium text-text">Comparison grid</legend>
      <p className="max-w-measure text-xs text-text-muted">
        {ratingScale
          ? `Each cell is one of: ${ratingScale.join(", ")}. Leave a cell empty rather than rating something nobody has assessed.`
          : "Each cell is a figure. Leave a cell empty rather than estimating it."}
      </p>

      <AxisEditor
        legend="Rows"
        values={rows}
        minimum={1}
        onRename={(index, text) => editAxis("rows", "rename", index, text)}
        onAdd={() => editAxis("rows", "add", rows.length)}
        onRemove={(index) => editAxis("rows", "remove", index)}
      />
      <AxisEditor
        legend="Columns"
        values={columns}
        minimum={2}
        onRename={(index, text) => editAxis("columns", "rename", index, text)}
        onAdd={() => editAxis("columns", "add", columns.length)}
        onRemove={(index) => editAxis("columns", "remove", index)}
      />

      <div className="overflow-x-auto border border-border-subtle">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">
            Figures for each row and column of this metric
          </caption>
          <thead>
            <tr className="border-b border-border-subtle bg-surface-subtle">
              <th scope="col" className="px-3 py-2 text-start text-xs font-medium text-text-muted">
                Row
              </th>
              {columns.map((column, index) => (
                <th
                  key={index}
                  scope="col"
                  className="px-3 py-2 text-start text-xs font-medium text-text-muted"
                >
                  {column.trim() || `Column ${index + 1}`}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                <th
                  scope="row"
                  className="px-3 py-2 text-start text-sm font-medium text-text"
                >
                  {row.trim() || `Row ${rowIndex + 1}`}
                </th>
                {columns.map((column, columnIndex) => {
                  const id = `metric-cell-${rowIndex}-${columnIndex}`;
                  const label = `${row.trim() || `Row ${rowIndex + 1}`}, ${column.trim() || `column ${columnIndex + 1}`}`;
                  const value = cells[rowIndex]?.[columnIndex] ?? "";
                  const write = (text: string) =>
                    onChange(
                      rows,
                      columns,
                      rows.map((_r, r) =>
                        columns.map((_c, c) =>
                          r === rowIndex && c === columnIndex
                            ? text
                            : cells[r]?.[c] ?? "",
                        ),
                      ),
                    );
                  return (
                    <td key={columnIndex} className="px-3 py-2">
                      <Label htmlFor={id} className="sr-only">
                        {label}
                      </Label>
                      {ratingScale ? (
                        <select
                          id={id}
                          value={value}
                          onChange={(event) => write(event.target.value)}
                          className="h-9 w-full min-w-32 rounded-md border border-input bg-transparent px-2 text-sm text-text outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                        >
                          <option value="">Not assessed</option>
                          {ratingScale.map((step) => (
                            <option key={step} value={step}>
                              {step}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Input
                          id={id}
                          value={value}
                          inputMode="decimal"
                          className="w-24"
                          onChange={(event) => write(event.target.value)}
                        />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error ? (
        <p id={errorId} role="alert" className="ansr-field-error text-xs">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

function AxisEditor({
  legend,
  values,
  minimum,
  onRename,
  onAdd,
  onRemove,
}: {
  legend: string;
  values: string[];
  /** The schema's floor for this axis, so Remove disables rather than failing. */
  minimum: number;
  onRename: (index: number, text: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium uppercase tracking-caps text-text-muted">
        {legend}
      </p>
      <ul className="flex flex-wrap gap-2">
        {values.map((value, index) => (
          <li key={index} className="flex items-center gap-1">
            <Label htmlFor={`axis-${legend}-${index}`} className="sr-only">
              {legend} {index + 1}
            </Label>
            <Input
              id={`axis-${legend}-${index}`}
              value={value}
              className="w-44"
              onChange={(event) => onRename(index, event.target.value)}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={values.length <= minimum}
              onClick={() => onRemove(index)}
            >
              <span aria-hidden="true">×</span>
              <span className="sr-only">
                Remove {legend} {index + 1}
              </span>
            </Button>
          </li>
        ))}
      </ul>
      <div>
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
          Add {legend.toLowerCase().replace(/s$/, "")}
        </Button>
      </div>
    </div>
  );
}
