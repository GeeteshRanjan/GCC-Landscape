"use client";

import { X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { useDraft, type RevertTarget } from "@/components/admin/draft-provider";
import { AdminPageHeader, AdminSection } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import {
  CLOSE_FIELD_LABELS,
  HERO_FIELD_LABELS,
  ROLE_FAMILY_FIELD_LABELS,
  ROLE_FIELD_LABELS,
  METRIC_FIELD_LABELS,
  PUBLIC_COPY_LABELS,
  TAXONOMY_LABELS,
  formatFieldValue,
  formatMetricFieldValue,
  type DatasetDiff,
  type PeerOverrideFieldChange,
} from "@/data/diff";

/**
 * Validate, show the diff, then commit. In that order, always.
 *
 * The preview is not decoration and it is not computed here — it comes back from
 * the server, which validates the submitted dataset against the schema and
 * diffs it against what the write will actually land on. That matters: diffing
 * in the browser against the copy the page loaded with would miss anything
 * published from another session in between.
 *
 * No git vocabulary reaches this screen. There is one button, and what it says
 * is what happens.
 */

interface PreviewState {
  diff: DatasetDiff;
  targetDescription: string;
}

type Phase =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "ready"; preview: PreviewState }
  | { kind: "publishing"; preview: PreviewState }
  | { kind: "published"; diff: DatasetDiff }
  | { kind: "blocked"; error: string; issues?: string[] };

export function PublishPanel() {
  const { draft, dirty, conflict, markPublished, discardDraft, revert } =
    useDraft();
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });

  const check = useCallback(async () => {
    setPhase({ kind: "checking" });
    try {
      const response = await fetch("/api/admin/diff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataset: draft }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        diff?: DatasetDiff;
        targetDescription?: string;
        error?: string;
        issues?: string[];
      };
      if (!response.ok || !body.diff) {
        setPhase({
          kind: "blocked",
          error: body.error ?? "Could not check these changes.",
          issues: body.issues,
        });
        return;
      }
      setPhase({
        kind: "ready",
        preview: {
          diff: body.diff,
          targetDescription: body.targetDescription ?? "",
        },
      });
    } catch {
      setPhase({
        kind: "blocked",
        error: "Could not reach the server. Nothing was published.",
      });
    }
  }, [draft]);

  /**
   * Check on arrival when there is something to check, so the admin lands on the
   * diff rather than on a button that hides it.
   *
   * The `published` phase is held rather than replaced. A successful publish
   * clears the draft, which makes this fire with `dirty` false — and replacing the
   * confirmation with "Nothing to publish" means the one moment the admin needs
   * acknowledgement is the moment they get none. It reads as though the publish
   * did nothing.
   */
  useEffect(() => {
    if (dirty) {
      void check();
      return;
    }
    setPhase((current) => (current.kind === "published" ? current : { kind: "idle" }));
    // `check` closes over the draft; re-running on every keystroke elsewhere in
    // the app is not wanted, so this intentionally keys on dirty alone.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty]);

  async function publish(preview: PreviewState) {
    setPhase({ kind: "publishing", preview });
    try {
      const response = await fetch("/api/admin/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataset: draft }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        diff?: DatasetDiff;
        published?: { version: number; generatedAt: string; source: string };
        error?: string;
        issues?: string[];
      };
      if (!response.ok || !body.ok || !body.published || !body.diff) {
        setPhase({
          kind: "blocked",
          error: body.error ?? "The changes were not published.",
          issues: body.issues,
        });
        return;
      }
      markPublished(body.published);
      setPhase({ kind: "published", diff: body.diff });
    } catch {
      setPhase({
        kind: "blocked",
        error:
          "Lost the connection before the changes were confirmed. Reload this page to see whether they went through.",
      });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Publish"
        lead="Everything is checked before anything goes live, and a failed check publishes nothing."
      />

      {conflict ? (
        <p role="alert" className="ansr-field-error text-sm">
          The live data changed since these edits were started. Resolve that at
          the top of the page before publishing.
        </p>
      ) : null}

      {phase.kind === "idle" ? (
        <EmptyState />
      ) : phase.kind === "checking" ? (
        <SkeletonState />
      ) : phase.kind === "blocked" ? (
        <BlockedState
          error={phase.error}
          issues={phase.issues}
          onRetry={dirty ? check : undefined}
        />
      ) : phase.kind === "published" ? (
        <PublishedState diff={phase.diff} />
      ) : (
        <>
          <DiffView diff={phase.preview.diff} onRevert={revert} />
          <div className="flex flex-wrap items-center gap-4 border-t border-border-subtle pt-5">
            <Button
              onClick={() => void publish(phase.preview)}
              disabled={phase.kind === "publishing" || phase.preview.diff.isEmpty}
            >
              {phase.kind === "publishing" ? "Publishing…" : "Publish changes"}
            </Button>
            <Button
              variant="ghost"
              onClick={discardDraft}
              disabled={phase.kind === "publishing"}
            >
              Discard all changes
            </Button>
            {phase.preview.targetDescription ? (
              <p className="text-sm text-text-muted">
                {phase.preview.targetDescription}
              </p>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-md border border-border-subtle bg-surface px-6 py-12 text-center">
      <p className="text-sm text-text">Nothing to publish.</p>
      <p className="mt-1 text-sm text-text-muted">
        The draft matches what is already live. Edit a company, a taxonomy value
        or a function metric and the changes will show up here.
      </p>
    </div>
  );
}

function SkeletonState() {
  return (
    <div
      role="status"
      className="rounded-md border border-border-subtle bg-surface p-6"
      aria-label="Checking the changes"
    >
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((row) => (
          <div
            key={row}
            aria-hidden="true"
            className="h-4 animate-pulse bg-surface-sunken"
            style={{ width: `${70 - row * 15}%` }}
          />
        ))}
      </div>
      <p className="mt-4 text-sm text-text-muted">Checking the changes…</p>
    </div>
  );
}

function BlockedState({
  error,
  issues,
  onRetry,
}: {
  error: string;
  issues?: string[];
  onRetry?: () => void;
}) {
  return (
    <div role="alert" className="border border-border-strong bg-surface p-6">
      <h2 className="text-base font-semibold text-text">Not published</h2>
      <p className="ansr-field-error mt-2 text-sm">{error}</p>
      {issues && issues.length > 0 ? (
        <ul className="mt-4 flex flex-col gap-1 border-t border-border-subtle pt-4">
          {issues.map((issue, index) => (
            <li key={`${issue}-${index}`} className="font-mono text-xs text-text">
              {issue}
            </li>
          ))}
        </ul>
      ) : null}
      {onRetry ? (
        <Button variant="outline" className="mt-5" onClick={onRetry}>
          Check again
        </Button>
      ) : null}
    </div>
  );
}

function PublishedState({ diff }: { diff: DatasetDiff }) {
  return (
    <div className="rounded-md border border-border-subtle bg-surface p-6">
      {/* Success carried by form and words, not a colour: this palette has no
          success hue, by measurement. See tokens.css. */}
      <h2 className="flex items-center gap-2 text-base font-semibold text-text">
        <span aria-hidden="true">✓</span>
        Published
      </h2>
      <p className="mt-2 max-w-measure text-sm text-text-muted">
        {summarise(diff)}. Changes go live shortly — give it a minute, then
        reload the public page to see them.
      </p>
    </div>
  );
}

function summarise(diff: DatasetDiff): string {
  const parts: string[] = [];
  if (diff.counts.added) parts.push(`${diff.counts.added} added`);
  if (diff.counts.removed) parts.push(`${diff.counts.removed} removed`);
  if (diff.counts.changed) parts.push(`${diff.counts.changed} edited`);
  if (diff.counts.taxonomy) {
    parts.push(
      `${diff.counts.taxonomy} taxonomy list${diff.counts.taxonomy === 1 ? "" : "s"} updated`,
    );
  }
  if (diff.counts.metrics) {
    parts.push(
      `${diff.counts.metrics} metric${diff.counts.metrics === 1 ? "" : "s"} updated`,
    );
  }
  // Named in the summary rather than folded into a total, on the site-copy argument
  // below: this is the change with no visible consequence anywhere else in the review,
  // so the one-line summary is the only place a reviewer might catch it before scrolling.
  if (diff.counts.peerOverrides) {
    parts.push(
      `${diff.counts.peerOverrides} pinned peer set${diff.counts.peerOverrides === 1 ? "" : "s"} updated`,
    );
  }
  // Named rather than counted, because "1 edit" here can be the headline every
  // visitor reads and the admin should see which surface moved before they read
  // how much of it did.
  if (diff.counts.siteContent) parts.push("site copy edited");
  return parts.length > 0 ? parts.join(", ") : "No changes";
}

/**
 * What each override field is called in the review.
 *
 * Same reasoning as `CLOSE_FIELD_LABELS` and `METRIC_FIELD_LABELS`: `businessTypeId`
 * tells a reviewer nothing, and `companyIds` least of all — what changed is the peer
 * set, which is the thing being approved.
 */
const PEER_OVERRIDE_FIELD_LABELS: Record<
  PeerOverrideFieldChange["field"],
  string
> = {
  id: "id",
  industry: "industry",
  businessTypeId: "sub-industry",
  revenueBand: "revenue band",
  hqCountry: "HQ location",
  companyIds: "the peer set, in order",
  note: "note",
};

/**
 * An override field for the review, with the wildcard spelled out.
 *
 * A cleared field reads "any" rather than as a blank, because the difference between
 * "one revenue band" and "all seven" is the whole meaning of the row and a reviewer
 * cannot read it off an absence — the same rule `describePeerOverride` follows.
 */
function formatOverrideValue(value: unknown): string {
  if (value === undefined || value === null || value === "") return "any";
  if (Array.isArray(value)) return value.join(" → ");
  return String(value);
}

/**
 * The cross on a change row. Removing a change is undoing a local draft edit,
 * never a destructive act on published data, so it is a quiet ghost control
 * rather than an `.ansr-destructive` one. Admin is exempt from the public
 * target-size floor; the negative margins keep it from growing the row.
 */
function RemoveButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="-my-2 -me-2 ms-auto inline-flex size-9 shrink-0 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-sunken hover:text-text focus-visible:bg-surface-sunken focus-visible:text-text"
    >
      <X aria-hidden="true" className="size-4" />
    </button>
  );
}

function DiffView({
  diff,
  onRevert,
}: {
  diff: DatasetDiff;
  onRevert: (target: RevertTarget) => void;
}) {
  if (diff.isEmpty) {
    return (
      <div className="rounded-md border border-border-subtle bg-surface px-6 py-12 text-center">
        <p className="text-sm text-text">
          These changes match what is already live.
        </p>
        <p className="mt-1 text-sm text-text-muted">
          There is nothing to publish.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Seven cells now, so the row goes to seven columns at `lg` rather than six. The
          hairline grid is `gap-px` over a border-coloured fill, so the column count is
          the only thing that has to move. */}
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border-subtle bg-border-subtle sm:grid-cols-3 lg:grid-cols-7">
        <Count label="Added" value={diff.counts.added} />
        <Count label="Removed" value={diff.counts.removed} />
        <Count label="Edited" value={diff.counts.changed} />
        <Count label="Taxonomy lists" value={diff.counts.taxonomy} />
        <Count label="Pinned peers" value={diff.counts.peerOverrides} />
        <Count label="Metrics" value={diff.counts.metrics} />
        <Count label="Site copy" value={diff.counts.siteContent} />
      </dl>

      {diff.counts.siteContent > 0 ? (
        /* First, and deliberately ahead of the company and taxonomy sections.
           Every other part of a publish changes what SOME visitor is shown once
           they have answered the form; this changes the first thing all of them
           read. Spelled out in full rather than sampled, because a reviewer has to
           read the before and after of a headline, not count that it moved. */
        <DiffSection title={`Site copy (${diff.counts.siteContent})`}>
          <ul className="divide-y divide-border-subtle">
            {diff.siteContent.hero.map((change) => (
              <li key={change.field} className="flex items-start gap-3 px-5 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="text-xs uppercase tracking-caps text-text-muted">
                    Hero {HERO_FIELD_LABELS[change.field]}
                  </p>
                  <p className="mt-1 text-text-muted line-through">{change.before}</p>
                  <p className="mt-0.5 text-text">{change.after}</p>
                </div>
                <RemoveButton
                  label={`Remove this change to the hero ${HERO_FIELD_LABELS[change.field]}`}
                  onClick={() => onRevert({ kind: "heroField", field: change.field })}
                />
              </li>
            ))}
            {/* The close's copy, beside the hero's and in the same shape. It is the one
                part of this category that is not on the entry point, which is why the
                label says so rather than leaving a reviewer to guess which band moved. */}
            {diff.siteContent.close.map((change) => (
              <li key={change.field} className="flex items-start gap-3 px-5 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="text-xs uppercase tracking-caps text-text-muted">
                    {/* `CLOSE_FIELD_LABELS` rather than the key, because two of the four
                        are `ctaHrefPeers` and `ctaHrefFunctions` and neither names a
                        screen an admin would recognise. Shared with the text renderer so
                        the same change reads the same way in both. */}
                    Result close {CLOSE_FIELD_LABELS[change.field]}
                  </p>
                  {/* A link field may legitimately be blank, meaning "use the configured
                      default" — and a struck-through empty string renders as nothing at
                      all, which would show a change with only one side of it. So a blank
                      is named rather than drawn. */}
                  <p className="mt-1 text-text-muted line-through">
                    {change.before || "(not set)"}
                  </p>
                  <p className="mt-0.5 text-text">{change.after || "(not set)"}</p>
                </div>
                <RemoveButton
                  label={`Remove this change to the result close ${CLOSE_FIELD_LABELS[change.field]}`}
                  onClick={() => onRevert({ kind: "closeField", field: change.field })}
                />
              </li>
            ))}
            {/* The static strings, spelled out for the same reason the hero is: these
                are headings and labels a reviewer has to READ. `PUBLIC_COPY_LABELS`
                names the slot rather than the key, because "figuresHr" tells an admin
                nothing about which screen moved. */}
            {diff.siteContent.copy.map((change) => (
              <li key={change.field} className="flex items-start gap-3 px-5 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="text-xs uppercase tracking-caps text-text-muted">
                    {PUBLIC_COPY_LABELS[change.field] ?? change.field}
                  </p>
                  <p className="mt-1 text-text-muted line-through">{change.before}</p>
                  <p className="mt-0.5 text-text">{change.after}</p>
                </div>
                <RemoveButton
                  label={`Remove this change to ${PUBLIC_COPY_LABELS[change.field] ?? change.field}`}
                  onClick={() => onRevert({ kind: "copyField", field: change.field })}
                />
              </li>
            ))}
            {diff.siteContent.commonFunctions.added.map((value) => (
              <li
                key={`fn-add-${value}`}
                className="flex items-center gap-3 px-5 py-2.5 text-sm text-text"
              >
                <span className="min-w-0 flex-1">Function added: {value}</span>
                <RemoveButton
                  label="Undo all changes to the function list"
                  onClick={() => onRevert({ kind: "commonFunctions" })}
                />
              </li>
            ))}
            {diff.siteContent.commonFunctions.removed.map((value) => (
              <li
                key={`fn-del-${value}`}
                className="flex items-center gap-3 px-5 py-2.5 text-sm text-text"
              >
                <span className="min-w-0 flex-1">Function removed: {value}</span>
                <RemoveButton
                  label="Undo all changes to the function list"
                  onClick={() => onRevert({ kind: "commonFunctions" })}
                />
              </li>
            ))}
            {diff.siteContent.commonFunctions.reordered ? (
              <li className="flex items-center gap-3 px-5 py-2.5 text-sm text-text">
                <span className="min-w-0 flex-1">
                  Function list reordered. The tags render in this order, so the page
                  changes even though no tag did.
                </span>
                <RemoveButton
                  label="Undo all changes to the function list"
                  onClick={() => onRevert({ kind: "commonFunctions" })}
                />
              </li>
            ) : null}
            {/* The role map. **Reverted as the WHOLE map from every row**, because its three
                parts reference each other — putting one group back while four roles point at
                the group that replaced it is a draft the gate refuses. Same grain as a
                metric, and `RevertTarget` records the argument. */}
            {diff.siteContent.roleMap.demandLevels ? (
              <li className="flex items-start gap-3 px-5 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-text">Hiring demand scale</p>
                  {/* Both sides in full, because a role stores its STEP on this scale: a
                      reorder here re-rates every bubble on the map and moves no other line
                      in this diff. It is the change with the largest effect and the least
                      trace. */}
                  <p className="mt-1.5 text-text-muted">
                    <span className="line-through">
                      {diff.siteContent.roleMap.demandLevels.before.join(" · ")}
                    </span>
                    <span className="mx-2">→</span>
                    <span className="text-text">
                      {diff.siteContent.roleMap.demandLevels.after.join(" · ")}
                    </span>
                  </p>
                </div>
                <RemoveButton
                  label="Undo all changes to the role map"
                  onClick={() => onRevert({ kind: "roleMap" })}
                />
              </li>
            ) : null}
            {diff.siteContent.roleMap.families.added.map((family) => (
              <li
                key={`rfam-add-${family.id}`}
                className="flex items-center gap-3 px-5 py-2.5 text-sm text-text"
              >
                <span className="min-w-0 flex-1">Role group added: {family.name}</span>
                <RemoveButton
                  label="Undo all changes to the role map"
                  onClick={() => onRevert({ kind: "roleMap" })}
                />
              </li>
            ))}
            {diff.siteContent.roleMap.families.removed.map((family) => (
              <li
                key={`rfam-del-${family.id}`}
                className="flex items-center gap-3 px-5 py-2.5 text-sm text-text"
              >
                <span className="min-w-0 flex-1">Role group removed: {family.name}</span>
                <RemoveButton
                  label="Undo all changes to the role map"
                  onClick={() => onRevert({ kind: "roleMap" })}
                />
              </li>
            ))}
            {diff.siteContent.roleMap.families.changed.map((family) => (
              <li key={`rfam-${family.id}`} className="flex items-start gap-3 px-5 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-text">{family.name}</p>
                  <ul className="mt-1.5 flex flex-col gap-1">
                    {family.changes.map((change) => (
                      <li key={change.field} className="flex flex-wrap gap-x-2">
                        <span className="text-text-muted">
                          {ROLE_FAMILY_FIELD_LABELS[change.field]}
                        </span>
                        <span className="text-text-muted line-through">{change.before}</span>
                        <span className="text-text-muted">→</span>
                        <span className="text-text">{change.after}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <RemoveButton
                  label="Undo all changes to the role map"
                  onClick={() => onRevert({ kind: "roleMap" })}
                />
              </li>
            ))}
            {diff.siteContent.roleMap.families.reordered ? (
              <li className="flex items-center gap-3 px-5 py-2.5 text-sm text-text">
                <span className="min-w-0 flex-1">
                  Role groups reordered. The legend reads in this order; no bubble moves,
                  because a group&rsquo;s colour is stored on the group.
                </span>
                <RemoveButton
                  label="Undo all changes to the role map"
                  onClick={() => onRevert({ kind: "roleMap" })}
                />
              </li>
            ) : null}
            {diff.siteContent.roleMap.roles.added.map((role) => (
              <li
                key={`role-add-${role.id}`}
                className="flex items-center gap-3 px-5 py-2.5 text-sm text-text"
              >
                <span className="min-w-0 flex-1">Role added: {role.name}</span>
                <RemoveButton
                  label="Undo all changes to the role map"
                  onClick={() => onRevert({ kind: "roleMap" })}
                />
              </li>
            ))}
            {diff.siteContent.roleMap.roles.removed.map((role) => (
              <li
                key={`role-del-${role.id}`}
                className="flex items-center gap-3 px-5 py-2.5 text-sm text-text"
              >
                <span className="min-w-0 flex-1">Role removed: {role.name}</span>
                <RemoveButton
                  label="Undo all changes to the role map"
                  onClick={() => onRevert({ kind: "roleMap" })}
                />
              </li>
            ))}
            {diff.siteContent.roleMap.roles.changed.map((role) => (
              <li key={`role-${role.id}`} className="flex items-start gap-3 px-5 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-text">{role.name}</p>
                  <ul className="mt-1.5 flex flex-col gap-1">
                    {role.changes.map((change) => (
                      <li key={change.field} className="flex flex-wrap gap-x-2">
                        <span className="text-text-muted">
                          {ROLE_FIELD_LABELS[change.field]}
                        </span>
                        <span className="text-text-muted line-through">{change.before}</span>
                        <span className="text-text-muted">→</span>
                        <span className="text-text">{change.after}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <RemoveButton
                  label="Undo all changes to the role map"
                  onClick={() => onRevert({ kind: "roleMap" })}
                />
              </li>
            ))}
            {diff.siteContent.logos.changed.map((logo) => (
              <li key={`logo-${logo.src}`} className="flex items-start gap-3 px-5 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-text">{logo.name || logo.src}</p>
                  <ul className="mt-1.5 flex flex-col gap-1">
                    {logo.changes.map((change) => (
                      <li key={change.field} className="flex flex-wrap gap-x-2">
                        <span className="text-xs uppercase tracking-caps text-text-muted">
                          {change.field}
                        </span>
                        <span className="text-text-muted line-through">
                          {change.before}
                        </span>
                        <span aria-hidden="true" className="text-text-muted">
                          →
                        </span>
                        <span className="text-text">{change.after}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <RemoveButton
                  label="Undo all changes to the logo strip"
                  onClick={() => onRevert({ kind: "logos" })}
                />
              </li>
            ))}
            {diff.siteContent.logos.added.map((logo) => (
              <li
                key={`logo-add-${logo.src}`}
                className="flex items-center gap-3 px-5 py-2.5 text-sm text-text"
              >
                <span className="min-w-0 flex-1">
                  Logo added: {logo.name || "unnamed"}
                  <span className="ms-2 font-mono text-xs text-text-muted">{logo.src}</span>
                </span>
                <RemoveButton
                  label="Undo all changes to the logo strip"
                  onClick={() => onRevert({ kind: "logos" })}
                />
              </li>
            ))}
            {diff.siteContent.logos.removed.map((logo) => (
              <li
                key={`logo-del-${logo.src}`}
                className="flex items-center gap-3 px-5 py-2.5 text-sm text-text"
              >
                <span className="min-w-0 flex-1">
                  Logo removed: {logo.name || "unnamed"}
                  <span className="ms-2 font-mono text-xs text-text-muted">{logo.src}</span>
                </span>
                <RemoveButton
                  label="Undo all changes to the logo strip"
                  onClick={() => onRevert({ kind: "logos" })}
                />
              </li>
            ))}
            {diff.siteContent.logos.reordered ? (
              <li className="flex items-center gap-3 px-5 py-2.5 text-sm text-text">
                <span className="min-w-0 flex-1">
                  Logo strip reordered. The strip scrolls in this order.
                </span>
                <RemoveButton
                  label="Undo all changes to the logo strip"
                  onClick={() => onRevert({ kind: "logos" })}
                />
              </li>
            ) : null}
            {diff.siteContent.impactStats.changed.map((stat) => (
              <li key={stat.id} className="flex items-start gap-3 px-5 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-text">{stat.label || stat.id}</p>
                  <ul className="mt-1.5 flex flex-col gap-1">
                    {stat.changes.map((change) => (
                      <li key={change.field} className="flex flex-wrap gap-x-2">
                        <span className="text-xs uppercase tracking-caps text-text-muted">
                          {change.field}
                        </span>
                        <span className="text-text-muted line-through">
                          {change.before}
                        </span>
                        <span aria-hidden="true" className="text-text-muted">
                          →
                        </span>
                        <span className="text-text">{change.after}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <RemoveButton
                  label="Undo all changes to the impact figures"
                  onClick={() => onRevert({ kind: "impactStats" })}
                />
              </li>
            ))}
            {diff.siteContent.impactStats.added.map((stat) => (
              <li
                key={stat.id}
                className="flex items-center gap-3 px-5 py-2.5 text-sm text-text"
              >
                <span className="min-w-0 flex-1">
                  Figure added: {stat.value} {stat.label}
                </span>
                <RemoveButton
                  label="Undo all changes to the impact figures"
                  onClick={() => onRevert({ kind: "impactStats" })}
                />
              </li>
            ))}
            {diff.siteContent.impactStats.removed.map((stat) => (
              <li
                key={stat.id}
                className="flex items-center gap-3 px-5 py-2.5 text-sm text-text"
              >
                <span className="min-w-0 flex-1">
                  Figure removed: {stat.value} {stat.label}
                </span>
                <RemoveButton
                  label="Undo all changes to the impact figures"
                  onClick={() => onRevert({ kind: "impactStats" })}
                />
              </li>
            ))}
            {diff.siteContent.impactStats.reordered ? (
              <li className="flex items-center gap-3 px-5 py-2.5 text-sm text-text">
                <span className="min-w-0 flex-1">
                  Impact figures reordered. The order is what a visitor reads left to
                  right, so this changes the page even though no figure changed.
                </span>
                <RemoveButton
                  label="Undo all changes to the impact figures"
                  onClick={() => onRevert({ kind: "impactStats" })}
                />
              </li>
            ) : null}
          </ul>
        </DiffSection>
      ) : null}

      {diff.taxonomy.length > 0 ? (
        /* `DiffSection` derives the same `diff-taxonomy` heading id this section
           used to spell out, so the landmark's name and id are unchanged. */
        <DiffSection title="Taxonomy">
          <ul className="divide-y divide-border-subtle">
            {diff.taxonomy.map((entry) => (
              <li key={entry.key} className="flex items-start gap-3 px-5 py-3 text-sm">
                <div className="min-w-0 flex-1">
                <p className="font-medium text-text">
                  {TAXONOMY_LABELS[entry.key]}
                </p>
                <ul className="mt-1 flex flex-col gap-0.5 text-text-muted">
                  {entry.added.length > 0 ? (
                    <li>Added: {entry.added.join(", ")}</li>
                  ) : null}
                  {entry.removed.length > 0 ? (
                    <li>Removed: {entry.removed.join(", ")}</li>
                  ) : null}
                  {entry.reordered ? (
                    <li className="text-text">
                      Reordered. For revenue bands this changes which band counts
                      as adjacent, so it changes who matches as a peer.
                    </li>
                  ) : null}
                </ul>
                </div>
                <RemoveButton
                  label={`Undo all changes to ${TAXONOMY_LABELS[entry.key]}`}
                  onClick={() => onRevert({ kind: "taxonomy", key: entry.key })}
                />
              </li>
            ))}
          </ul>
        </DiffSection>
      ) : null}

      {/*
        Business types get their own section for a sharper reason than the metrics
        one. A tag change here re-scores every peer set in that type's industry — a
        visitor from an apparel brand sees five different companies — while every
        company row stays byte-identical. Folded into the company counts it would be
        invisible; omitted entirely, an admin would publish a reshaping of the product
        believing they had published nothing.
      */}
      {diff.counts.businessTypes > 0 ? (
        <DiffSection title={`Business types (${diff.counts.businessTypes})`}>
          <p className="border-b border-border-subtle px-5 py-3 text-sm text-text-muted">
            Changing a type&apos;s tags changes which companies appear as peers across
            its whole industry, with no company row edited.
          </p>
          <ul className="divide-y divide-border-subtle">
            {diff.businessTypes.changed.map((type) => (
              <li key={type.id} className="flex items-start gap-3 px-5 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-text">{type.name}</p>
                  <p className="text-xs text-text-muted">{type.id}</p>
                  <ul className="mt-1.5 flex flex-col gap-1">
                    {type.changes.map((change) => (
                      <li key={change.field} className="text-sm text-text-muted">
                        <span className="text-text">{change.field}</span>:{" "}
                        {String(change.before) || "—"} → {String(change.after) || "—"}
                      </li>
                    ))}
                  </ul>
                </div>
                <RemoveButton
                  label={`Remove these changes to ${type.name}`}
                  onClick={() => onRevert({ kind: "businessType", id: type.id })}
                />
              </li>
            ))}
            {diff.businessTypes.added.map((type) => (
              <li key={type.id} className="flex items-center gap-3 px-5 py-2.5 text-sm text-text">
                <span className="min-w-0 flex-1">
                  Added: {type.name}
                  <span className="text-text-muted"> ({type.id})</span>
                </span>
                <RemoveButton
                  label={`Remove the added business type ${type.name}`}
                  onClick={() => onRevert({ kind: "businessType", id: type.id })}
                />
              </li>
            ))}
            {diff.businessTypes.removed.map((type) => (
              <li key={type.id} className="flex items-center gap-3 px-5 py-2.5 text-sm text-text">
                <span className="min-w-0 flex-1">
                  Removed: {type.name}
                  <span className="text-text-muted">
                    {" "}
                    ({type.id}) — its companies fall back to industry-level matching
                  </span>
                </span>
                <RemoveButton
                  label={`Restore the removed business type ${type.name}`}
                  onClick={() => onRevert({ kind: "businessType", id: type.id })}
                />
              </li>
            ))}
          </ul>
        </DiffSection>
      ) : null}

      {/*
        Pinned peer sets, immediately after the business types whose scoring they
        overrule — and it is the section with the least visible consequence in the whole
        review. No company row moves, no string on the page moves, and the public screen
        deliberately never says a peer set was hand-picked, so the result is
        indistinguishable from the engine's own answer. A reviewer's only handle on it is
        this section, which is why every entry names the COMBINATION rather than the id
        and spells the pinned companies out in order.
      */}
      {diff.counts.peerOverrides > 0 ? (
        <DiffSection title={`Pinned peer sets (${diff.counts.peerOverrides})`}>
          <p className="border-b border-border-subtle px-5 py-3 text-sm text-text-muted">
            A pinned set replaces what the scoring engine would show, for exactly the
            answers it names. Nothing on the public screen says so.
          </p>
          <ul className="divide-y divide-border-subtle">
            {diff.peerOverrides.changed.map((entry) => (
              <li key={entry.id} className="flex items-start gap-3 px-5 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-text">{entry.combination}</p>
                  <ul className="mt-1.5 flex flex-col gap-1">
                    {entry.changes.map((change) => (
                      <li key={change.field} className="flex flex-col gap-0.5">
                        <span className="text-xs uppercase tracking-caps text-text-muted">
                          {PEER_OVERRIDE_FIELD_LABELS[change.field]}
                        </span>
                        <span className="text-text-muted line-through">
                          {formatOverrideValue(change.before)}
                        </span>
                        <span className="text-text">
                          {formatOverrideValue(change.after)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <RemoveButton
                  label={`Remove these changes to ${entry.combination}`}
                  onClick={() => onRevert({ kind: "peerOverride", id: entry.id })}
                />
              </li>
            ))}
            {diff.peerOverrides.added.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center gap-3 px-5 py-2.5 text-sm text-text"
              >
                <span className="min-w-0 flex-1">Pinned: {entry.combination}</span>
                <RemoveButton
                  label={`Remove the pinned peer set for ${entry.combination}`}
                  onClick={() => onRevert({ kind: "peerOverride", id: entry.id })}
                />
              </li>
            ))}
            {diff.peerOverrides.removed.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center gap-3 px-5 py-2.5 text-sm text-text"
              >
                <span className="min-w-0 flex-1">
                  Unpinned: {entry.combination}
                  <span className="text-text-muted">
                    {" "}
                    — the scoring engine answers it again
                  </span>
                </span>
                <RemoveButton
                  label={`Restore the pinned peer set for ${entry.combination}`}
                  onClick={() => onRevert({ kind: "peerOverride", id: entry.id })}
                />
              </li>
            ))}
          </ul>
        </DiffSection>
      ) : null}

      {diff.counts.metrics > 0 ? (
        <DiffSection title={`Function metrics (${diff.counts.metrics})`}>
          <ul className="divide-y divide-border-subtle">
            {diff.metrics.changed.slice(0, 100).map((metric) => (
              <li key={metric.id} className="flex items-start gap-3 px-5 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-text">{metric.title}</p>
                  <ul className="mt-1.5 flex flex-col gap-1">
                    {metric.changes.map((change) => (
                      <li key={change.field} className="flex flex-col gap-0.5">
                        <span className="text-xs uppercase tracking-caps text-text-muted">
                          {METRIC_FIELD_LABELS[change.field]}
                        </span>
                        <span className="flex flex-wrap gap-x-2">
                          <span className="text-text-muted line-through">
                            {formatMetricFieldValue(change.field, change.before)}
                          </span>
                          <span aria-hidden="true" className="text-text-muted">
                            →
                          </span>
                          <span className="text-text">
                            {formatMetricFieldValue(change.field, change.after)}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <RemoveButton
                  label={`Remove these changes to ${metric.title}`}
                  onClick={() => onRevert({ kind: "metric", id: metric.id })}
                />
              </li>
            ))}
            {diff.metrics.added.map((metric) => (
              <li key={metric.id} className="flex items-center gap-3 px-5 py-2.5 text-sm text-text">
                <span className="min-w-0 flex-1">
                  Added: {metric.title}
                  <span className="ms-2 font-mono text-xs text-text-muted">
                    {metric.id}
                  </span>
                </span>
                <RemoveButton
                  label={`Remove the added metric ${metric.title}`}
                  onClick={() => onRevert({ kind: "metric", id: metric.id })}
                />
              </li>
            ))}
            {diff.metrics.removed.map((metric) => (
              <li key={metric.id} className="flex items-center gap-3 px-5 py-2.5 text-sm text-text">
                <span className="min-w-0 flex-1">
                  Removed: {metric.title}
                  <span className="ms-2 font-mono text-xs text-text-muted">
                    {metric.id}
                  </span>
                </span>
                <RemoveButton
                  label={`Restore the removed metric ${metric.title}`}
                  onClick={() => onRevert({ kind: "metric", id: metric.id })}
                />
              </li>
            ))}
          </ul>
          {diff.metrics.changed.length > 100 ? (
            <p className="border-t border-border-subtle px-5 py-3 text-sm text-text-muted">
              …and {diff.metrics.changed.length - 100} more. All of them will be
              published.
            </p>
          ) : null}
        </DiffSection>
      ) : null}

      {diff.changed.length > 0 ? (
        <DiffSection title={`Edited (${diff.changed.length})`}>
          <ul className="divide-y divide-border-subtle">
            {diff.changed.slice(0, 100).map((company) => (
              <li key={company.id} className="px-5 py-3 text-sm">
                <p className="font-medium text-text">{company.name}</p>
                <ul className="mt-1.5 flex flex-col gap-1">
                  {company.changes.map((change) => (
                    <li
                      key={change.field}
                      className="flex items-center gap-3"
                    >
                      <span className="flex flex-1 flex-wrap gap-x-2">
                        <span className="text-xs uppercase tracking-caps text-text-muted">
                          {change.field}
                        </span>
                        <span className="text-text-muted line-through">
                          {formatFieldValue(change.before)}
                        </span>
                        <span aria-hidden="true" className="text-text-muted">
                          →
                        </span>
                        <span className="text-text">
                          {formatFieldValue(change.after)}
                        </span>
                      </span>
                      <RemoveButton
                        label={`Remove the change to ${change.field} for ${company.name}`}
                        onClick={() =>
                          onRevert({
                            kind: "companyField",
                            id: company.id,
                            field: change.field,
                          })
                        }
                      />
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
          {diff.changed.length > 100 ? (
            <p className="border-t border-border-subtle px-5 py-3 text-sm text-text-muted">
              …and {diff.changed.length - 100} more. All of them will be
              published.
            </p>
          ) : null}
        </DiffSection>
      ) : null}

      {diff.added.length > 0 ? (
        <DiffSection title={`Added (${diff.added.length})`}>
          <NameList
            items={diff.added}
            onRemove={(id) => onRevert({ kind: "company", id })}
            removeLabel={(name) => `Remove the added company ${name}`}
          />
        </DiffSection>
      ) : null}

      {diff.removed.length > 0 ? (
        <DiffSection title={`Removed (${diff.removed.length})`}>
          <NameList
            items={diff.removed}
            onRemove={(id) => onRevert({ kind: "company", id })}
            removeLabel={(name) => `Restore the removed company ${name}`}
          />
        </DiffSection>
      ) : null}
    </div>
  );
}

/**
 * `aria-labelledby` is what makes each block a named landmark rather than an
 * anonymous <section>. The diff is the densest thing on this screen and the one
 * an admin is being asked to approve, so being able to jump between Added,
 * Removed and Edited by region is the difference between reviewing it and
 * scrolling past it.
 */
function DiffSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const headingId = `diff-${title.replace(/[^a-z]+/gi, "-").toLowerCase()}`;
  return (
    <AdminSection id={headingId} title={title}>
      {children}
    </AdminSection>
  );
}

function NameList({
  items,
  onRemove,
  removeLabel,
}: {
  items: Array<{ id: string; name: string }>;
  onRemove?: (id: string) => void;
  removeLabel?: (name: string) => string;
}) {
  return (
    <ul className="divide-y divide-border-subtle">
      {items.slice(0, 100).map((item) => (
        <li
          key={item.id}
          className="flex items-center gap-3 px-5 py-2.5 text-sm text-text"
        >
          <span className="min-w-0 flex-1">
            {item.name}
            <span className="ms-2 font-mono text-xs text-text-muted">{item.id}</span>
          </span>
          {onRemove ? (
            <RemoveButton
              label={removeLabel ? removeLabel(item.name) : `Remove ${item.name}`}
              onClick={() => onRemove(item.id)}
            />
          ) : null}
        </li>
      ))}
      {items.length > 100 ? (
        <li className="px-5 py-2.5 text-sm text-text-muted">
          …and {items.length - 100} more.
        </li>
      ) : null}
    </ul>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-surface px-5 py-4">
      <dt className="text-xs uppercase tracking-caps text-text-muted">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold tabular-nums text-text">
        {value.toLocaleString()}
      </dd>
    </div>
  );
}
