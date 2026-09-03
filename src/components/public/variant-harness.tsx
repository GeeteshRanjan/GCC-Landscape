"use client";

import { useState } from "react";

import { PublicCopyProvider } from "@/components/public/copy-context";
import { PeerViewAnswer } from "@/components/screen1/peer-view";
import {
  PEERS_VARIANTS,
  type PeersVariant,
} from "@/components/screen1/peers-variants";
import type { CloseCopy, PublicCopy } from "@/data/schema";
import type { PeerView } from "@/data/screen1";
import { cn } from "@/lib/utils";

/**
 * TEMPORARY — the variant chooser. DELETE WITH `peers-variants.tsx`.
 *
 * A switcher over one screen rather than four screens down one page: the question is
 * whether the comparison set commands attention in the scroll it actually sits in, and
 * that can only be judged one treatment at a time, at the same scroll offset. So the
 * control swaps the treatment in place and leaves the position alone.
 *
 * The bar is `position: fixed`, which the public screens may never be — it is a harness
 * affordance on a route that is not embedded, and it is why this lives in its own file
 * rather than inside the screen.
 */
export function VariantHarness({
  view,
  publicCopy,
  closeCopy,
}: {
  view: PeerView;
  publicCopy: PublicCopy;
  closeCopy: CloseCopy;
}) {
  const [variant, setVariant] = useState<PeersVariant>("current");
  const active = PEERS_VARIANTS.find((entry) => entry.id === variant);

  return (
    <PublicCopyProvider copy={publicCopy}>
      <div className="pt-16">
        <div className="fixed inset-x-0 top-0 z-50 border-b border-border-inverse bg-surface-inverse">
          <div className="mx-auto flex max-w-content flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
            <span className="text-xs font-semibold tracking-caps text-text-inverse-muted uppercase">
              Peer section
            </span>
            <div className="flex flex-wrap gap-1.5">
              {PEERS_VARIANTS.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setVariant(entry.id)}
                  aria-pressed={entry.id === variant}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                    entry.id === variant
                      ? "bg-surface text-text"
                      : "text-text-inverse-muted hover:text-text-inverse",
                  )}
                >
                  {entry.name}
                </button>
              ))}
            </div>
            {active ? (
              <span className="text-sm text-text-inverse-muted">{active.move}</span>
            ) : null}
          </div>
        </div>

        <main className="bg-surface font-display">
          <PeerViewAnswer
            // Remounted per treatment so the entrance stagger replays, exactly as a new
            // answer does on the real screen.
            key={variant}
            panelRef={{ current: null }}
            view={view}
            peersVariant={variant}
            onHome={() => undefined}
            /* The harness has no phase machine and no server action, so the editor is
               wired to nothing: its options are empty and applying never resolves true.
               It is only here to satisfy the screen's contract — the harness exists to
               look at one zone. */
            editing={{
              options: {
                industries: { common: [], others: [] },
                revenueBands: [],
                hqCountries: { common: [], others: [] },
                businessTypesByIndustry: {},
              },
              pending: false,
              error: null,
              onApply: async () => false,
            }}
            onOpenFunctions={() => undefined}
            ctaHref="https://www.ansr.com/"
            closeCopy={closeCopy}
          />
        </main>
      </div>
    </PublicCopyProvider>
  );
}
