import { Zone } from "@/components/public/primitives";

/**
 * A tab's sections, each on its own ground, strictly alternating.
 *
 * **One implementation for all four tabs, where there were two rules and four
 * behaviours.** The derived tab alternated white and mint from the sections it happened
 * to have; each composed tab ran everything on one white ground with 48/64px of space
 * between sections and put its sealed pair on the mint. So the rhythm of the screen
 * depended on which file drew the tab, which is exactly what a visitor notices when
 * they click between them and nothing else has changed.
 *
 * The rule is the peer view's, unchanged from `screen1/peer-view.tsx`: **a zone is a
 * colour change at a boundary and nothing else.** The sections inside keep card density
 * and card headings; the boundary costs no vertical room, because the two zones' own
 * padding is the space between them. White beside white is not a boundary, so adjacent
 * grounds have to differ — which is why this alternates from the LIST rather than from a
 * written-out sequence: a tab that gains or loses a section would otherwise end up with
 * two white zones together.
 *
 * `surface-pale` is not in the sequence. It is about 2% off white, so a pale zone
 * against a white one is not a boundary at all — the peer view keeps it for one position
 * only, the head of the card, where the alternative is no boundary whatsoever.
 *
 * **White first, on every tab.** The section's own ground is white and the function tab
 * strip sits on it, so a mint opening zone would put a colour change immediately under
 * the strip and read as though the strip belonged to the band above it.
 *
 * The stagger is capped at three steps however many zones a tab has, so the whole
 * sequence lands well inside the flow threshold — staggering twelve sections
 * individually would put the last one most of a second behind the first.
 */
export function TabZones({ sections }: { sections: readonly React.ReactNode[] }) {
  return (
    <>
      {sections.map((section, index) => (
        <Zone
          // The section's own key, set by whichever file composed it. An index would be
          // stable but would tie a zone's identity to its position, so a tab that gained
          // a section would remount every zone after it.
          key={(section as React.ReactElement).key ?? index}
          ground={index % 2 === 0 ? "surface" : "tint"}
          className="gcc-enter"
          style={{ "--gcc-enter-index": Math.min(index, 2) } as React.CSSProperties}
        >
          {section}
        </Zone>
      ))}
    </>
  );
}
