# Copy audit — shared chart and layout layer

**Status: acted on.** Ten of the strings below moved into `siteContent.copy`; six stay in code. The
schema is at 68 keys. This file is the record of what was found and why each call went the way it did.

Scope: `charts.tsx`, `primitives.tsx`, `screen-header.tsx`, `closing-cta.tsx`, `answer-editor.tsx`,
`atlas-wordmark.tsx`, `metric-card.tsx`, `summary-figures.tsx`.

Method: comments stripped by tracking `/* … */` and `//` state across the file character by character,
never by testing whether a line starts with `*`. This matters specifically for `charts.tsx`, whose block
comments carry no `*` on continuation lines — a line-prefix filter reports its ~779 prose lines as code
and turns quoted phrases like "Very strong", "Enterprise technology" and "PHILIPPINES" into false
findings. Every candidate was confirmed by opening the file.

## Moved into `siteContent.copy` — ten keys

| String | Key | Where |
| --- | --- | --- |
| `Edit answers` | `editAnswers` | `screen-header.tsx`, `ContextPanels` |
| `Your profile, as you entered it` | `pillGroupLabel` | `screen-header.tsx`, pill group `aria-label` |
| `Result view` | `viewSwitchLabel` | `screen-header.tsx`, `ViewTabs` tablist `aria-label` |
| `Back to the start` | `homeTitle` | `screen-header.tsx`, `ProductIdentity` `title` |
| `Your answers` | `editorTitle` | `answer-editor.tsx` `h2` |
| `Change anything below and your results update on this page.` | `editorLead` | `answer-editor.tsx` |
| `Close` | `editorClose` | `answer-editor.tsx` |
| `Update my results` | `editorSubmit` | `answer-editor.tsx`, `InputPanel`'s `submitLabel` |
| `Capability` | `gridRowHeader` | `charts.tsx`, `OrdinalGrid`'s `sr-only` leading `columnheader` |
| `Unlock the full GCC landscape` | `closeLabel` | `closing-cta.tsx`, was `CLOSE_LABEL` |

Each names a control, a region or a heading and asserts nothing about the dataset, which is the line
`project.md` holds every copy field to. Two mechanical notes: `charts.tsx` and `closing-cta.tsx` have no
`"use client"`, so `gridRowHeader` and `closeLabel` arrive as REQUIRED props rather than context reads;
and `CLOSE_LABEL` was deleted rather than left pointing at the key.

## Stayed in code — six, each for a stated reason

| String | Where | Why it stays |
| --- | --- | --- |
| `ANSR` | `screen-header.tsx`, `alt` on the lockup | Composed into the `h1`'s accessible name by name-from-content: with the hidden word beside it the heading computes to "ANSR ATLAS". Editing it renames the heading, not one image. |
| `ATLAS` | `atlas-wordmark.tsx`, `label` default | The product's own name and the other half of that same computed name. |
| `Measure` | `charts.tsx`, `NumberGridChart` | **No metric routes to `numbers`**, so a field for it would draw nothing. |
| `Comparator` | `charts.tsx`, `IndexLollipop` | Same: that renderer is a fallback today's data never reaches. |
| `0` | `charts.tsx`, `RangeBenchmark`'s `originLabel` | An axis tick numeral, not prose. |
| `Under ` / `Above ` / `to` | `primitives.tsx` `formatRevenueBand`, `charts.tsx` `RangeBar`, `summary-figures.tsx` | Value-formatting vocabulary rather than labels. `formatRevenueBand`'s seven outputs are pinned by a unit test, so the words are part of a transformation with its own contract. |

## Why the routing check decided three of those

`gridDisplay` in `screen2.ts` picks the grid renderer from the metric's own `ratingScale`,
`indexBaseline` and column count. Against the committed dataset it yields `ratings` once
(`tech-capability-comparison`), `dumbbell` once, `lollipop` three times, and `numbers` **never**. So the
three `charts.tsx` grid strings split: `Capability` is live and became a key, while `Measure` and
`Comparator` sit in renderers nothing reaches.

**`ratingScale` is on the METRIC, not on `structure`.** Reading it off `structure` reports zero rated
matrices and makes the live capability grid look dead — which is the check to get right before concluding
a chart string is unreachable.

## What is NOT a finding

- **`charts.tsx` block-comment prose** — "Very strong", "Enterprise technology", "To 300 FTEs",
  "India = 100", "Tier 1, 100", "PHILIPPINES", "181 of the Fortune Global 500" and every other quoted
  phrase inside a `/* ===== … ===== */` block. Design reasoning about rejected alternatives, not markup.
- **`CAPABILITY_ICONS` keys** in `metric-card.tsx` — `"Product engineering"`, `"Data and AI"`,
  `"Cloud and platform"`, `"Enterprise technology"`, `"Shared services"`. Lookup keys matched against
  admin-editable data, never drawn.
- Tailwind class strings, CSS variable names, `cn()` arguments, type unions, SVG path data, and keyboard
  key names in a `switch`.
