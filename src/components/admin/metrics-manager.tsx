"use client";

import { useMemo, useState } from "react";

import { MetricEditor } from "@/components/admin/metric-editor";
import { useDraft } from "@/components/admin/draft-provider";
import { AdminPageHeader, AdminSection } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  METRIC_FUNCTION_LABELS,
  METRIC_LENS_ADMIN_LABELS,
  formatMetricValue,
  groupMetrics,
  isMetricComplete,
  metricProgress,
} from "@/data/metrics";
import type { Metric } from "@/data/schema";

/**
 * The Screen 2 catalogue, as an editing surface.
 *
 * A data view, not a marketing surface: the app-shell track, so no imagery and no
 * scroll motion. What earns its keep here is knowing, at a glance, how much of a
 * 35-metric catalogue is still empty — because the values arrive over months, one
 * batch at a time, and the question the admin actually has on arrival is "where
 * did I get to?".
 *
 * Grouped by function area, then by lens. The lens names are visible HERE and
 * nowhere public: they are the author's internal filing system, which is exactly
 * what an internal editor should show. `publicMetric` drops the field, so the
 * visitor-facing side cannot render it even by accident.
 */

export function MetricsManager() {
  const { draft } = useDraft();
  const [editing, setEditing] = useState<string | null>(null);

  const progress = useMemo(() => metricProgress(draft.metrics), [draft.metrics]);
  const grouped = useMemo(() => groupMetrics(draft.metrics), [draft.metrics]);
  const editingMetric = editing
    ? draft.metrics.find((metric) => metric.id === editing) ?? null
    : null;

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Function metrics"
        lead="The figures behind the second screen, typed in here and published with everything else."
      />

      {draft.metrics.length === 0 ? (
        <p className="border border-border-subtle bg-surface px-6 py-12 text-center text-sm text-text-muted">
          No metrics in this dataset.
        </p>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-px border border-border-subtle bg-border-subtle sm:grid-cols-5">
            <Figure label="Metrics" value={progress.total} />
            <Figure label="Complete" value={progress.complete} />
            <Figure label="Part entered" value={progress.partial} />
            <Figure label="Empty" value={progress.empty} />
            <Figure label="Behind the gate" value={progress.gated} />
          </dl>

          {grouped.map((entry) => (
            <AdminSection
              key={entry.functionArea}
              id={`metrics-${entry.functionArea}`}
              title={METRIC_FUNCTION_LABELS[entry.functionArea]}
              description={
                <p>
                  {entry.groups.reduce((n, g) => n + g.metrics.length, 0)} metrics.
                  The groupings below are how this data is filed internally; they
                  are not what a visitor sees.
                </p>
              }
            >
              {entry.groups.map((group) => (
                <div key={group.lens}>
                  <h3 className="border-b border-border-subtle bg-surface-subtle px-5 py-2 text-xs font-medium uppercase tracking-caps text-text-muted">
                    {METRIC_LENS_ADMIN_LABELS[group.lens]}
                  </h3>
                  <ul className="divide-y divide-border-subtle">
                    {group.metrics.map((metric) => (
                      <MetricRow
                        key={metric.id}
                        metric={metric}
                        onEdit={() => setEditing(metric.id)}
                      />
                    ))}
                  </ul>
                </div>
              ))}
            </AdminSection>
          ))}
        </>
      )}

      {editingMetric ? (
        <MetricEditor
          // Remounting on a different metric is what resets the form.
          key={editingMetric.id}
          metric={editingMetric}
          open
          onClose={() => setEditing(null)}
        />
      ) : null}
    </div>
  );
}

function MetricRow({
  metric,
  onEdit,
}: {
  metric: Metric;
  onEdit: () => void;
}) {
  const complete = isMetricComplete(metric);
  return (
    <li className="flex flex-wrap items-baseline gap-x-4 gap-y-1.5 px-5 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-text">{metric.title}</p>
        <p className="mt-0.5 max-w-measure text-sm text-text-muted">
          {metric.question}
        </p>
      </div>

      {metric.gated ? (
        /* Status by form and words, never by colour alone: this palette carries
           exactly two semantic hues and neither of them means "restricted". */
        <Badge variant="outline" className="shrink-0">
          Behind the gate
        </Badge>
      ) : null}

      <p
        className={[
          "w-40 shrink-0 text-sm tabular-nums",
          complete ? "text-text" : "text-text-muted",
        ].join(" ")}
      >
        {formatMetricValue(metric)}
      </p>

      <Button variant="outline" size="sm" onClick={onEdit} className="shrink-0">
        Edit
        {/* The function area is part of the name, not decoration. Six titles now
            appear on more than one tab — bench strength, graduate output,
            leadership depth, backfill, first hire, the scale curve — because they
            are one figure shown in several views. "Edit Bench strength" alone would
            name three different buttons on this page. */}
        <span className="sr-only">
          {" "}
          {metric.title}, {METRIC_FUNCTION_LABELS[metric.functionArea]}
        </span>
      </Button>
    </li>
  );
}

function Figure({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-surface px-5 py-4">
      <dt className="text-xs uppercase tracking-caps text-text-muted">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold tabular-nums text-text">
        {value.toLocaleString()}
      </dd>
    </div>
  );
}
