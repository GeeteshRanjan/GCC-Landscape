"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { fetchPeerView } from "@/app/actions";
import type { AnswerEditing } from "@/components/public/answer-editor";
import { PublicCopyProvider } from "@/components/public/copy-context";
/* `derive.ts` is pure and holds no dataset, so it is safe in a client component —
   the same reason `search.ts` is. `resolveCtaHref` is the one thing read from it. */
import { resolveCtaHref } from "@/data/derive";
import type {
  CloseCopy,
  CustomerLogo,
  HeroCopy,
  ImpactStat,
  PublicCopy,
} from "@/data/schema";
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
 *   - **The browser's back button DOES step back a phase now — see `pushPhase`.** It did
 *     not, and it was the most reported problem with the tool: submitting the form is the
 *     only navigation-shaped act on the entry point, so pressing Back on a result did
 *     what Back does on any other page and left the tool entirely. Every phase still
 *     carries its own way back as a real control in the normal flow, because Back is
 *     something a visitor may or may not reach for and never the only route.
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
   * Where the close sends the visitor. **Both result screens read it now.**
   *
   * The two closes were removed at ANSR's request — Screen 1's on the page-end
   * instruction, Screen 2's in the pass that rebuilt its zones — and are restored at
   * the project owner's decision. The prop survived that whole period threaded and
   * unread, on the recorded argument that restoring a link out is a component and a
   * prop rather than an environment variable and a redeploy. That turned out to be
   * exactly what it took.
   *
   * **This is now the FALLBACK rather than the link, and the rename it did not get is
   * deliberate.** `siteContent.close` carries a link per result screen so the two presses
   * can be told apart in ANSR's analytics, and `resolveCtaHref` prefers those. This prop
   * is what a screen whose field is blank falls back to: `NEXT_PUBLIC_GCC_CTA_URL`, and
   * behind that the fallback in `page.tsx` — ansr.com itself. Both paths stay live, so a
   * deployment with one landing page and no tagging needs no data edit.
   *
   * The name is kept because it is still literally the href for any screen the admin has
   * not tagged, and every screen below it takes a resolved `ctaHref` rather than a
   * fallback plus a rule.
   */
  ctaHref: string;
  /**
   * The close's two strings, from `siteContent.close`. Admin-editable and threaded from
   * `page.tsx` for the same reason `heroCopy` is: it does not depend on the visitor, so a
   * server action for it could only ever return one answer.
   */
  closeCopy: CloseCopy;
  /**
   * Every static heading and label on both screens, from `siteContent.copy`.
   *
   * **Threaded to here and then supplied as a CONTEXT rather than as a prop**, because
   * the consumers are thirty deep across four levels of component and most of the levels
   * between have no interest in copy at all — see `copy-context.tsx`. This is the one
   * place the published strings enter the tree, which is also what makes "the public
   * screens render published copy" a single seam rather than a property of eleven files.
   */
  publicCopy: PublicCopy;
  /**
   * The customer marks in the entry point's scrolling strip.
   *
   * A prop rather than part of the copy context, deliberately: it has exactly one
   * consumer, two levels down, and a context for a value read in one place is
   * indirection bought for nothing. It is also not copy — the names are accessible names
   * for images, and the dimensions are measured ink bounds.
   */
  logos: readonly CustomerLogo[];
}

type Phase =
  | { kind: "ask" }
  | { kind: "peers"; view: PeerView }
  | { kind: "functions"; view: PeerView };

/**
 * The key each history entry is stamped with, holding an INDEX into the phase trail and
 * never a phase.
 *
 * **A `PeerView` cannot go into `history.state` and must not be asked to.** It is the
 * whole matched result — five peers, the industry counts, the city map — so serialising
 * one per entry would put tens of kilobytes into the session history on every tab press,
 * and `history.state` is a structured clone that would have to survive a shape change in
 * the view model. An index into a trail held in a ref costs a number.
 *
 * The cost of the ref is that the trail does not survive a RELOAD, so a restored entry
 * resolves to the ask. That is the correct fallback rather than a limitation to fix: the
 * result is produced by a server action over answers the tool deliberately does not store,
 * so there is nothing to rebuild a reloaded result from. It is the same reason there are
 * no deep links.
 *
 * **`pushState` is called with no URL argument, so the address never changes.** The rule
 * that the tool does not own the URL bar is intact — what is added is an entry in the
 * session history at the URL the parent page already put there.
 */
const HISTORY_MARK = "gccLandscapePhase";

export function GccLandscapeTool({
  industries,
  revenueBands,
  hqCountries,
  businessTypesByIndustry,
  functionView,
  heroCopy,
  impactStats,
  ctaHref,
  closeCopy,
  publicCopy,
  logos,
}: GccLandscapeToolProps) {
  useFrameHeight();

  const [phase, setPhase] = useState<Phase>({ kind: "ask" });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastInput, setLastInput] = useState<PeerViewInput | null>(null);

  /**
   * Every phase the visitor has stood on, and where in it they are.
   *
   * Refs rather than state: nothing renders off either, and a `popstate` handler
   * registered once has to read the CURRENT trail rather than the one that existed when
   * it was registered. A state value in that closure would be the first one forever.
   */
  const phaseTrail = useRef<Phase[]>([{ kind: "ask" }]);
  const trailAt = useRef(0);

  /**
   * Stamp the entry the tool was LOADED on.
   *
   * Without this the visitor's first `pushState` is preceded by an entry with no mark on
   * it, so stepping back onto it reads `event.state` as null — which resolves to the ask
   * by the fallback and happens to be right. It is right by accident: the parent page may
   * have put its own state on that entry, and `replaceState` here preserves it by
   * spreading rather than replacing. Explicit, so the ask is reached because it is index
   * 0 and not because nothing was found.
   */
  useEffect(() => {
    window.history.replaceState(
      { ...window.history.state, [HISTORY_MARK]: 0 },
      "",
    );
  }, []);

  /**
   * Move to a phase and record it as a step the visitor can come back from.
   *
   * **Truncating the trail at the current position is what makes a branch behave.** Step
   * back to the peer view and then press the function tab, and the entry that held the
   * old function view is no longer reachable — the browser drops its forward entries on a
   * push, so the trail has to drop the same ones or an index would resolve to a phase the
   * history no longer contains.
   */
  const pushPhase = useCallback((next: Phase) => {
    const at = trailAt.current + 1;
    phaseTrail.current = [...phaseTrail.current.slice(0, at), next];
    trailAt.current = at;
    window.history.pushState({ ...window.history.state, [HISTORY_MARK]: at }, "");
    setPhase(next);
  }, []);

  /**
   * Replace the phase the visitor is standing on, WITHOUT adding a history entry.
   *
   * For a refined result: the answers changed, the screen did not, so there is nothing to
   * step back from — and an entry per correction would mean four presses of Back to leave
   * a result someone had adjusted four dropdowns on.
   *
   * The trail write is inside the updater because it needs the current phase, and it is
   * idempotent so React's double-invoke cannot corrupt it: the same index is overwritten
   * with the same value.
   */
  const replacePhase = useCallback((update: (current: Phase) => Phase) => {
    setPhase((current) => {
      const next = update(current);
      phaseTrail.current = phaseTrail.current.map((entry, index) =>
        index === trailAt.current ? next : entry,
      );
      return next;
    });
  }, []);

  useEffect(() => {
    const onPop = (event: PopStateEvent) => {
      const marked = (event.state as Record<string, unknown> | null)?.[
        HISTORY_MARK
      ];
      const at = typeof marked === "number" ? marked : 0;
      const target = phaseTrail.current[at];
      // An entry we did not stamp, or one whose phase the trail lost to a reload.
      // The ask is the only phase reachable without a result, so it is the floor.
      if (!target) {
        trailAt.current = 0;
        fromHistory.current = true;
        setPhase({ kind: "ask" });
        setError(null);
        return;
      }
      trailAt.current = at;
      fromHistory.current = true;
      setPhase(target);
      setError(null);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

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

    /**
     * **A transition the BROWSER drove states no position at all, and that is the third
     * case.** Back and Forward restore their own scroll offset — the browser recorded it
     * on the entry being returned to, which is a better answer than either of ours: it is
     * where the visitor actually was on that screen, not where they were when they left
     * the current one. Writing 0 over it, which is what the `betweenViews` branch would
     * do on a `popstate`, would make Back mean "go to that screen's top" and lose the
     * whole point of stepping back to something you were reading.
     *
     * Read and clear, so one press cannot inherit the flag.
     */
    const popped = fromHistory.current;
    fromHistory.current = false;
    if (popped) return;

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
        pushPhase({ kind: "peers", view: result.view });
      } catch {
        setError(publicCopy.askSubmitError);
      } finally {
        setPending(false);
      }
    },
    [pushPhase],
  );

  /**
   * The same request, applied to the screen the visitor is already on.
   *
   * **This is what the answer editor submits to, and the difference from `submit` is the
   * phase KIND.** `submit` always lands on the peer view, which is right for the entry
   * point: a visitor who has just described their company is being shown their peers.
   * It is wrong for a correction made from Screen 2 — reading function metrics, fixing a
   * revenue band, and being thrown onto a different screen is the same defect as being
   * thrown onto the form, one screen shallower. So the kind is carried across and only
   * the view is replaced.
   *
   * Returns whether it worked, because the editor has to stay open on a failure: closing
   * a panel whose error message is the only explanation of what went wrong leaves a
   * visitor looking at an unchanged result with no reason given.
   */
  const refine = useCallback(
    async (input: PeerViewInput): Promise<boolean> => {
      setPending(true);
      setError(null);
      setLastInput(input);
      try {
        const result = await fetchPeerView(input);
        if (!result.ok) {
          setError(result.reason);
          return false;
        }
        replacePhase((current) =>
          current.kind === "ask" ? current : { ...current, view: result.view },
        );
        return true;
      } catch {
        setError(publicCopy.askSubmitError);
        return false;
      } finally {
        setPending(false);
      }
    },
    [replacePhase],
  );

  /**
   * Back to the entry point.
   *
   * **Its one caller is the band's lockup now**, not "Edit answers" — see `AnswerEditor`
   * for why correcting an answer stopped being a trip to the form. A push rather than a
   * `history.back()`: the ask is a phase the visitor chose to move to, so it gets an
   * entry of its own and Back from it returns to the result they left, which is the only
   * route back to a result the entry point cannot rebuild on its own.
   */
  const backToAsk = useCallback(() => {
    pushPhase({ kind: "ask" });
    setError(null);
  }, [pushPhase]);

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

  /**
   * Set for exactly one transition when Back or Forward caused it, so the focus effect
   * leaves the scroll offset to the browser. See the effect for why that is the better
   * answer on a history move than either position the tool would otherwise state.
   */
  const fromHistory = useRef(false);

  /**
   * The two view swaps, which read the current phase rather than updating from it.
   *
   * They were functional updaters, which cannot work now: the new phase has to be recorded
   * in the trail and pushed onto the history at the same time, and neither of those can
   * happen inside a `setState` updater — React may call it twice, and a doubled
   * `pushState` puts an unreachable entry in the visitor's history. So the guard against
   * the ask phase is an early return here instead of a branch in the updater.
   */
  const openFunctions = useCallback(() => {
    if (phase.kind === "ask") return;
    restoreScroll.current = window.scrollY;
    pushPhase({ kind: "functions", view: phase.view });
  }, [phase, pushPhase]);

  const backToPeers = useCallback(() => {
    if (phase.kind === "ask") return;
    restoreScroll.current = window.scrollY;
    pushPhase({ kind: "peers", view: phase.view });
  }, [phase, pushPhase]);

  /**
   * What both result screens need in order to offer the answer editor.
   *
   * Memoised on its parts rather than rebuilt per render, because it is a prop on a screen
   * that mounts a ~2,900px tree: a fresh object every render is a fresh identity for every
   * memo below it. The four option lists are props and never change for the life of the
   * tool, so the only members that actually move are `pending` and `error`.
   */
  const editing = useMemo<AnswerEditing>(
    () => ({
      options: {
        industries,
        revenueBands,
        hqCountries,
        businessTypesByIndustry,
      },
      pending,
      error,
      onApply: refine,
    }),
    [
      industries,
      revenueBands,
      hqCountries,
      businessTypesByIndustry,
      pending,
      error,
      refine,
    ],
  );

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
    /**
     * **The provider wraps the whole tree, and it is OUTSIDE the phase switch on
     * purpose.** All three phases read published copy, and two of them share the header
     * band — so a provider per phase would be three places for one decision, and the
     * shared band would take its strings from whichever phase happened to mount it.
     *
     * It carries no ground, no class and no element of its own, so it cannot affect the
     * `font-display` scope below it or the stacking context the entry point's dropdown
     * depends on.
     */
    <PublicCopyProvider copy={publicCopy}>
    <main className="bg-surface font-display">
      {phase.kind === "ask" ? (
        <PeerViewAsk
          headingRef={askHeadingRef}
          heroCopy={heroCopy}
          impactStats={impactStats}
          logos={logos}
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
          // rather than only on the first one — which is also what closes the answer
          // editor and confirms, visibly, that a correction landed.
          key={JSON.stringify(phase.view.input)}
          panelRef={peersPanelRef}
          view={phase.view}
          onHome={backToAsk}
          editing={editing}
          onOpenFunctions={openFunctions}
          ctaHref={resolveCtaHref(closeCopy, "peers", ctaHref)}
          closeCopy={closeCopy}
        />
      ) : null}

      {phase.kind === "functions" ? (
        <FunctionViewScreen
          view={functionView}
          input={phase.view.input}
          /* The sub-industry by NAME, for the answer pill. It comes off the matched peer
             view rather than being resolved on Screen 2, because the names live in the
             dataset and the dataset does not cross to the browser — and because both
             screens then draw one resolution rather than two. `phase.view` is always the
             peer view the visitor arrived through: submitting always lands on peers, and a
             correction made here keeps the phase. */
          subIndustry={phase.view.industry.businessType?.name}
          onBack={backToPeers}
          onHome={backToAsk}
          editing={editing}
          panelRef={functionsPanelRef}
          ctaHref={resolveCtaHref(closeCopy, "functions", ctaHref)}
          closeCopy={closeCopy}
        />
      ) : null}
    </main>
    </PublicCopyProvider>
  );
}
