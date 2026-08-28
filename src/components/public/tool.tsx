"use client";

import { useCallback, useRef, useState } from "react";

import { fetchPeerView } from "@/app/actions";
import type { PeerView, PeerViewInput } from "@/data/screen1";
import type { FunctionView } from "@/data/screen2";
import type { BusinessTypeOption } from "@/components/screen1/input-panel";
import { PeerViewAnswer, PeerViewAsk } from "@/components/screen1/peer-view";
import { useFrameHeight } from "@/components/screen1/use-frame-height";
import { FunctionViewScreen } from "@/components/screen2/function-view";

/**
 * The tool. One phase machine over two screens.
 *
 * **There are no routes, and that is a constraint rather than a shortcut.** The
 * tool is embedded in an ansr.com page and cannot own the URL bar, so every screen
 * change is a state change here. Three phases: the ask, the Peer View, the Function
 * View. What follows from it, and what would otherwise look like something missing:
 *
 *   - No deep link into a result or a function tab. The parent page owns the URL.
 *   - The browser's back button does not step back a phase. Every phase therefore
 *     carries its own way back as a real control in the normal flow — never
 *     something pinned to an edge, because nothing in the public screens may be
 *     fixed or sticky.
 *   - Nothing announces a phase change, because no navigation happened. So focus
 *     is moved to the new screen's `h1` on every transition, which both tells a
 *     screen-reader user the screen changed and puts the keyboard at the top of it.
 *
 * **Why the Function View needs no round trip.** Screen 1's answer depends on what
 * the visitor typed, so it goes through a server action. Screen 2's does not — the
 * metric catalogue is national, identical for every visitor — so it is built on the
 * server at request time and handed down as a prop. It has already been through
 * `publicMetricsFor`, so what crosses is a few kilobytes with every gated value
 * omitted server-side. A second action would have bought a spinner and nothing else.
 *
 * The dataset itself never crosses. `@/data/dataset` is `server-only`, so importing
 * it from this file would be a build error rather than a silent 700 KB payload.
 */

export interface GccLandscapeToolProps {
  industries: readonly string[];
  revenueBands: readonly string[];
  hqCountries: readonly string[];
  businessTypesByIndustry: Readonly<Record<string, readonly BusinessTypeOption[]>>;
  /** Screen 2's payload, already through the gate. Visitor-independent. */
  functionView: FunctionView;
  /** Where both screens' closing CTAs send the visitor. There is no form. */
  ctaHref: string;
}

type Phase =
  | { kind: "ask" }
  | { kind: "peers"; view: PeerView }
  | { kind: "functions"; view: PeerView };

export function GccLandscapeTool({
  industries,
  revenueBands,
  hqCountries,
  businessTypesByIndustry,
  functionView,
  ctaHref,
}: GccLandscapeToolProps) {
  useFrameHeight();

  const [phase, setPhase] = useState<Phase>({ kind: "ask" });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastInput, setLastInput] = useState<PeerViewInput | null>(null);

  const askHeadingRef = useRef<HTMLHeadingElement>(null);
  const peersHeadingRef = useRef<HTMLHeadingElement>(null);
  const functionsHeadingRef = useRef<HTMLHeadingElement>(null);

  /**
   * Focus after the phase has actually rendered. A ref on a component that is not
   * mounted yet is null, so this waits a frame rather than reading it in the same
   * tick as the state update.
   */
  const focusHeading = useCallback(
    (ref: React.RefObject<HTMLHeadingElement | null>) => {
      requestAnimationFrame(() => ref.current?.focus());
    },
    [],
  );

  const submit = useCallback(
    async (input: PeerViewInput) => {
      setPending(true);
      setError(null);
      setLastInput(input);
      try {
        const result = await fetchPeerView(input);
        if (!result.ok) {
          setError(result.reason);
          return;
        }
        setPhase({ kind: "peers", view: result.view });
        focusHeading(peersHeadingRef);
      } catch {
        setError(
          "Something went wrong reaching our data. Please try again in a moment.",
        );
      } finally {
        setPending(false);
      }
    },
    [focusHeading],
  );

  const backToAsk = useCallback(() => {
    setPhase({ kind: "ask" });
    setError(null);
    focusHeading(askHeadingRef);
  }, [focusHeading]);

  const openFunctions = useCallback(() => {
    setPhase((current) =>
      current.kind === "ask" ? current : { kind: "functions", view: current.view },
    );
    focusHeading(functionsHeadingRef);
  }, [focusHeading]);

  const backToPeers = useCallback(() => {
    setPhase((current) =>
      current.kind === "ask" ? current : { kind: "peers", view: current.view },
    );
    focusHeading(peersHeadingRef);
  }, [focusHeading]);

  return (
    <main className="bg-surface">
      {phase.kind === "ask" ? (
        <PeerViewAsk
          headingRef={askHeadingRef}
          industries={industries}
          revenueBands={revenueBands}
          hqCountries={hqCountries}
          businessTypesByIndustry={businessTypesByIndustry}
          initial={lastInput ?? undefined}
          pending={pending}
          submitError={error}
          onSubmit={submit}
        />
      ) : null}

      {phase.kind === "peers" ? (
        <PeerViewAnswer
          // Remounted per answer, so the entry stagger replays for a new result
          // rather than only on the first one.
          key={JSON.stringify(phase.view.input)}
          headingRef={peersHeadingRef}
          view={phase.view}
          ctaHref={ctaHref}
          onChangeDetails={backToAsk}
          onOpenFunctions={openFunctions}
        />
      ) : null}

      {phase.kind === "functions" ? (
        <FunctionViewScreen
          view={functionView}
          input={phase.view.input}
          ctaHref={ctaHref}
          onBack={backToPeers}
          headingRef={functionsHeadingRef}
        />
      ) : null}
    </main>
  );
}
