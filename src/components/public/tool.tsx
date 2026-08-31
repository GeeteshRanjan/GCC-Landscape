"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { fetchPeerView } from "@/app/actions";
import type { HeroCopy, ImpactStat } from "@/data/schema";
import type { TieredOptions } from "@/components/screen1/input-panel";
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
  industries: TieredOptions;
  revenueBands: readonly string[];
  /**
   * The HQ dropdown's two tiers — countries our data has evidence about, then the
   * rest of the world. Computed in `page.tsx` from company counts rather than
   * passed as one flat list, so the form does not have to know how the split is
   * decided. See `hqCountryOptions`.
   */
  hqCountries: TieredOptions;
  businessTypesByIndustry: Readonly<Record<string, readonly BusinessTypeOption[]>>;
  /** Screen 2's payload, already through the gate. Visitor-independent. */
  functionView: FunctionView;
  /**
   * The entry point's editable content: the hero's two lines, and ANSR's impact
   * figures. Threaded from `page.tsx` rather than fetched here, for the same
   * reason `functionView` is — it does not depend on the visitor, so a server
   * action for it would be a round trip that can only ever return one answer.
   */
  heroCopy: HeroCopy;
  impactStats: readonly ImpactStat[];
  /**
   * Where a closing CTA would send the visitor. **Nothing reads it.**
   *
   * Both screens' closes are removed at ANSR's request — Screen 1's on the page-end
   * instruction, Screen 2's in the pass that rebuilt its zones — so the tool has no
   * call to action and no outbound link. Kept threaded from `page.tsx` because
   * restoring one is a component and a prop rather than an environment variable and a
   * redeploy, and `NEXT_PUBLIC_GCC_CTA_URL` is unset in production anyway. Deleting it
   * is a decision to take with ANSR, not a tidy-up.
   */
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
  heroCopy,
  impactStats,
  ctaHref,
}: GccLandscapeToolProps) {
  useFrameHeight();

  const [phase, setPhase] = useState<Phase>({ kind: "ask" });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastInput, setLastInput] = useState<PeerViewInput | null>(null);

  const askHeadingRef = useRef<HTMLHeadingElement>(null);
  /**
   * The result screens' focus targets are their TAB PANELS, not their headings.
   *
   * The `h1` on both result screens is now the product lockup — "ANSR. GCC
   * Intelligence" — which is identical on the two of them, so focusing it on a
   * peers-to-functions change would announce nothing about the change. A
   * `role="tabpanel"` named by its own tab announces "Peer landscape, tab panel",
   * which is the phase change said out loud, and it still puts the keyboard at the
   * top of the new screen. The ask keeps its heading, because its `h1` is its own.
   */
  const peersPanelRef = useRef<HTMLDivElement>(null);
  const functionsPanelRef = useRef<HTMLDivElement>(null);

  /**
   * Move focus to the new phase's `h1`, after React has committed it.
   *
   * This is an effect on `phase.kind` rather than a call beside each `setPhase`,
   * and the difference is a real bug rather than a preference. The previous version
   * did:
   *
   *     setPhase({ kind: "peers", view });
   *     requestAnimationFrame(() => ref.current?.focus());
   *
   * which assumes React commits the new tree before the next animation frame. It
   * usually does, so this passed locally every time. It is not guaranteed —
   * rendering can land in a later frame, and then `ref.current` is still `null`,
   * `?.focus()` is a silent no-op and nothing retries. Caught by running the suite
   * against the deployed build, where it fails intermittently.
   *
   * The cost of that failure is not cosmetic: no navigation happens between phases,
   * so this focus move is the only thing that tells a screen reader the screen
   * changed. Losing it means the announcement is silently skipped.
   *
   * An effect keyed on the phase runs after commit, so the heading is mounted by
   * definition and the ref cannot be null for the phase being focused.
   */
  /**
   * The guard records the PREVIOUS phase, not whether the effect has run before.
   *
   * The difference is observable. A `hasRendered` boolean says "this is not the
   * first run", and under React's development double-invoke the second run of the
   * mount effect is not the first run — so an arriving visitor had the keyboard
   * moved to the `h1` and the frame scrolled to it, with a focus ring drawn around
   * the headline, before they had done anything. It was visible in every
   * screenshot of the entry point.
   *
   * Comparing phases instead says what is actually meant: focus moves on a
   * TRANSITION. A repeated run at the same phase is not one, so the double-invoke
   * is correctly ignored, and the effect stays right for the reason it exists
   * rather than by arithmetic on how many times it has fired.
   */
  const previousPhase = useRef<Phase["kind"] | null>(null);
  useEffect(() => {
    const from = previousPhase.current;
    const changed = from !== null && from !== phase.kind;
    previousPhase.current = phase.kind;
    if (!changed) return;

    const target =
      phase.kind === "ask"
        ? askHeadingRef.current
        : phase.kind === "peers"
          ? peersPanelRef.current
          : functionsPanelRef.current;
    /**
     * **Focus never scrolls. The tool states the position instead, and there are two
     * answers depending on which pair of phases is involved.**
     *
     * `focus()` scrolls its target into view, and letting it do so was wrong for BOTH
     * kinds of transition, in opposite directions.
     *
     * On the two result phases it moved the page when nothing had moved: they share an
     * identical header band and an identical card top edge, so the switch changes only
     * what is inside the card, and scrolling to the top of it dragged a visitor three
     * sections down back to a band that had not changed. The card is deliberately not
     * sticky, so nothing on screen explained the jump.
     *
     * **Entering the result was worse, and it looked like the page had loaded already
     * scrolled.** The focus target on a result screen is the TAB PANEL rather than the
     * `h1` — see the note above for why — and the panel begins BELOW the tab bar, 323px
     * into the document at 1440. So submitting the form landed the visitor inside the
     * card's first section with the whole teal band, the finding, their four answers and
     * the view switch itself scrolled off above them, having to scroll UP to find the
     * header of a screen they had just asked for. Focusing the `h1` used to hide this,
     * which is why moving the focus target introduced it silently.
     *
     * So `preventScroll` on every transition, and the position is set explicitly:
     *
     *   - between the two result views, the offset the visitor was already at;
     *   - anything involving the ask, the top — a surface they have not seen, met at its
     *     own beginning. The result screen's first element is the teal band and the ask's
     *     is the hero, so document top IS the top of the new surface in both directions.
     *
     * Keeping the focus MOVE is not optional either way: no navigation happens between
     * phases, so it is the only thing telling a screen reader the screen changed. The
     * panel is named by its own tab, so it still announces "Peer landscape, tab panel"
     * wherever the page happens to be standing.
     *
     * Both writes are inert in the embed, where a frame sized to its own content has no
     * scroll of its own — which is also true of the `focus()` scroll they replace, so
     * nothing about the framed case changed.
     */
    const betweenViews =
      (from === "peers" || from === "functions") &&
      (phase.kind === "peers" || phase.kind === "functions");
    target?.focus({ preventScroll: true });

    // Read and clear together, so an ask transition cannot inherit a position from a
    // view swap two states ago.
    const restore = restoreScroll.current;
    restoreScroll.current = null;
    window.scrollTo({ top: betweenViews && restore !== null ? restore : 0 });
  }, [phase.kind]);

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
      } catch {
        setError(
          "Something went wrong reaching our data. Please try again in a moment.",
        );
      } finally {
        setPending(false);
      }
    },
    [],
  );

  const backToAsk = useCallback(() => {
    setPhase({ kind: "ask" });
    setError(null);
  }, []);

  /**
   * Where the visitor was standing when they pressed a view tab, so the switch can put
   * them back.
   *
   * **`preventScroll` on the focus move was necessary and not sufficient.** With the
   * focus scroll suppressed the page still jumped to the top, because the two views are
   * not the same length — the peer landscape measures about 2,900px against the function
   * view's 1,650px at 1440 — and replacing a tall document with a short one in one commit
   * puts the browser's own scroll restoration in charge, which drops to 0. So the tool
   * has to state the position it wants rather than hope the browser keeps it.
   *
   * **Reading `scrollY` here is not the scroll-position logic the public screens ban.**
   * That ban is on scroll-DRIVEN behaviour — listeners and `IntersectionObserver` against
   * our own viewport — because the tool is framed and the parent decides what is on
   * screen, so such a thing fires for content nobody is looking at. This reads the offset
   * once, in direct response to a press, and writes it back once. It is also inert in the
   * embed for the same reason the dropdown's reveal is: a frame sized to its own content
   * has no scroll of its own, so `scrollY` is 0 and the restore is a no-op.
   *
   * `scrollTo` clamps to the new document, so a position past the shorter view's end
   * lands at its end rather than out of bounds. In the ordinary flow that never fires —
   * the tab bar is the card's top row and is not sticky, so a visitor has to have it on
   * screen to press it, which means the offset they are restored to is one the shorter
   * view can hold.
   */
  const restoreScroll = useRef<number | null>(null);

  const openFunctions = useCallback(() => {
    restoreScroll.current = window.scrollY;
    setPhase((current) =>
      current.kind === "ask" ? current : { kind: "functions", view: current.view },
    );
  }, []);

  const backToPeers = useCallback(() => {
    restoreScroll.current = window.scrollY;
    setPhase((current) =>
      current.kind === "ask" ? current : { kind: "peers", view: current.view },
    );
  }, []);

  return (
    /**
     * **`font-display` is on the public root, and it was on two of the three phases.**
     * The ask and the peer view each set it on their own wrapper; the function view set
     * it nowhere, so Screen 2 rendered in Inter — including the `h1` lockup line and the
     * answer pills, which are the SAME components Screen 1 draws in the display face.
     * Switching tabs changed the typeface of the header without changing the header,
     * which is the one thing the shared band exists to prevent.
     *
     * Scoped here rather than on `body` for the reason it always was: this is the public
     * surface, and admin is a dense internal tool that keeps Inter. One class on the one
     * element every public phase mounts under, so a fourth phase cannot be added without
     * it. It brings Light 300 body copy with it, which is the brand's single biggest
     * typographic tell.
     */
    <main className="bg-surface font-display">
      {phase.kind === "ask" ? (
        <PeerViewAsk
          headingRef={askHeadingRef}
          heroCopy={heroCopy}
          impactStats={impactStats}
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
          panelRef={peersPanelRef}
          view={phase.view}
          onChangeDetails={backToAsk}
          onOpenFunctions={openFunctions}
        />
      ) : null}

      {phase.kind === "functions" ? (
        <FunctionViewScreen
          view={functionView}
          input={phase.view.input}
          onBack={backToPeers}
          onEditProfile={backToAsk}
          panelRef={functionsPanelRef}
        />
      ) : null}
    </main>
  );
}
