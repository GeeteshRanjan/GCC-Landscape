"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ROLE_BANDS, type Role, type RoleBand, type RoleMap } from "@/data/schema";
import { cn } from "@/lib/utils";

/**
 * The role map's placement canvas — drag a bubble where you want it.
 *
 * **This exists because the numeric fields are the wrong instrument for the job they
 * describe.** A role's `complexity` and `lane` are a POSITION on a field, and the task an
 * admin actually has is "this label overlaps that one, move it down a bit". Typing 67 into a
 * box, publishing, and looking at the public page is a three-minute loop for a two-second
 * decision; the whole reason the placement is stored rather than computed is that a person
 * has to make it, so the editor has to be a person-shaped tool. The numeric table stays
 * below this as the precise and keyboard-exact fallback, and the two write the same fields.
 *
 * **It is a faithful preview, not a schematic, and that is the point.** ONE canvas at the
 * public aspect, the same two washes with the seam in the same place, the same eyebrows,
 * the same eight inks, the same five bubble sizes, the same label side — because an admin
 * placing a bubble is judging a label against its neighbours, and a preview that abstracts
 * the labels away cannot answer the only question being asked. What it adds is a 10%
 * lattice and a hit area big enough to grab.
 *
 * ## Three things about the interaction
 *
 * **The draft is written on DROP, not on every move.** `applyEdit` marks the draft unsaved
 * and the autosave serialises ~700KB, so committing per `pointermove` would write on every
 * frame of a drag. The bubble follows the pointer from local state and one edit lands at the
 * end, which is also what makes a drag a single undo step.
 *
 * **THE BAND IS NOT SET BY DRAGGING ANY MORE, and that followed the public chart rather
 * than being a simplification.** There used to be two fields, so dropping a role in the
 * other one was the whole gesture for changing its band. The public field is now one canvas
 * with the divide drawn as a colour stop — which is what lets a disc sit ACROSS it, as three
 * do on the source slide — so there is no second rect to drop into, and a lane near 50 says
 * nothing about which register a role belongs to. `[` and `]` set the band, and the numeric
 * table below shows it; the readout names it after every move so the pairing stays visible.
 *
 * **Everything is reachable from the keyboard**, because admin is a real application and
 * this is the only editor in it that is a canvas. Each bubble is a button; arrows nudge it
 * by 1%, with Shift for 5% and `[`/`]` for the band. A live region announces the new
 * position, since the visual feedback is a 7px disc moving four pixels.
 */
export function RoleMapCanvas({
  map,
  bandLabels,
  onChange,
}: {
  map: RoleMap;
  /** The two band words, so the canvas names them as the public screen does. */
  bandLabels: Record<RoleBand, string>;
  onChange: (next: RoleMap) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  /** The role being dragged and where it currently is, before anything is committed. */
  const [drag, setDrag] = useState<
    | { id: string; complexity: number; lane: number }
    | null
  >(null);
  const [announcement, setAnnouncement] = useState("");
  const field = useRef<HTMLDivElement | null>(null);

  const patch = useCallback(
    (id: string, next: Partial<Omit<Role, "id">>) => {
      onChange({
        ...map,
        roles: map.roles.map((role) =>
          role.id === id ? { ...role, ...next } : role,
        ),
      });
    },
    [map, onChange],
  );

  /**
   * Where a pointer is, as a position on the canvas.
   *
   * Clamped rather than refused outside the box: with one field there is nowhere else for a
   * drop to mean, and a release two pixels past the edge should land on the edge rather than
   * abandon the move.
   */
  const readPointer = useCallback((clientX: number, clientY: number) => {
    const box = field.current?.getBoundingClientRect();
    if (!box) return null;
    return {
      complexity: clamp(((clientX - box.left) / box.width) * 100),
      lane: clamp(((clientY - box.top) / box.height) * 100),
    };
  }, []);

  /* Pointer move and release are on the WINDOW rather than on the bubble, because a drag
     routinely leaves the element it started on — and with listeners on the bubble a fast
     drag drops the role wherever the last event that did hit it landed. */
  useEffect(() => {
    if (!drag) return;

    const move = (event: PointerEvent) => {
      const at = readPointer(event.clientX, event.clientY);
      if (!at) return;
      setDrag((held) => (held ? { ...held, ...at } : held));
    };
    const end = (event: PointerEvent) => {
      const at = readPointer(event.clientX, event.clientY);
      const settled = at ? { ...drag, ...at } : drag;
      patch(settled.id, {
        complexity: settled.complexity,
        lane: settled.lane,
      });
      const role = map.roles.find((held) => held.id === settled.id);
      setAnnouncement(
        `${role?.name ?? "Role"} placed at ${settled.complexity} across, ${settled.lane} down${role ? `, ${bandLabels[role.band]}` : ""}.`,
      );
      setDrag(null);
    };
    /* `pointercancel` abandons rather than commits — the same call `select-field.tsx` makes
       for a touch that turns into a scroll. A cancelled gesture is not a placement. */
    const cancel = () => setDrag(null);

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", cancel);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", cancel);
    };
  }, [drag, readPointer, patch, map.roles, bandLabels]);

  function nudge(role: Role, event: React.KeyboardEvent) {
    const step = event.shiftKey ? 5 : 1;
    const moves: Record<string, Partial<Omit<Role, "id">>> = {
      ArrowLeft: { complexity: clamp(role.complexity - step) },
      ArrowRight: { complexity: clamp(role.complexity + step) },
      ArrowUp: { lane: clamp(role.lane - step) },
      ArrowDown: { lane: clamp(role.lane + step) },
      "[": { band: "emerging" },
      "]": { band: "established" },
      // The label side, because it is the third placement decision and the only one with
      // no direction to nudge.
      s: { labelSide: role.labelSide === "trail" ? "lead" : "trail" },
    };
    const next = moves[event.key];
    if (!next) return;
    event.preventDefault();
    patch(role.id, next);
    const after = { ...role, ...next };
    setAnnouncement(
      `${role.name || "Role"}: ${after.complexity} across, ${after.lane} down, ${bandLabels[after.band]}, name ${after.labelSide === "lead" ? "before" : "after"} the bubble.`,
    );
  }

  const chosen = map.roles.find((role) => role.id === selected);

  return (
    <div className="flex flex-col gap-3 px-5 py-4">
      <p className="text-xs text-text-muted">
        Drag a bubble to place it. A bubble may sit across the divide &mdash; the two washes
        are one field, so the band is a label rather than a box. With one selected, the arrow
        keys nudge it by 1 and Shift + arrows by 5;{" "}
        <kbd className="rounded-sm border border-border-subtle px-1">[</kbd> and{" "}
        <kbd className="rounded-sm border border-border-subtle px-1">]</kbd> set which band it
        belongs to and{" "}
        <kbd className="rounded-sm border border-border-subtle px-1">S</kbd> flips which side
        its name sits on. The grid is every 10 and is an alignment aid only &mdash; height
        carries no meaning on the public chart.
      </p>

      {/**
       * ONE field, at the public composition's own aspect.
       *
       * `aspect-[1070/440]` is the measured plot over the measured canvas height, and
       * `.gcc-role-canvas` caps the WIDTH at that same 1070 — so on a wide enough window this
       * is the public drawing at the public size, not merely at the public shape. That
       * equivalence is the only reason to preview at all: a label is a fixed number of
       * pixels, so a wider preview would make every name relatively narrower than it will be
       * live and an admin could clear an overlap that still ships. See the class.
       */}
      <div ref={field} className="gcc-role-canvas aspect-[1070/440] w-full">
        {/* Each half's own eyebrow, in the public ink and the public position — the preview
            is faithful or it is not a preview. `--gcc-band-at` is what `.gcc-role-canvas__
            band-label` reads, and it is the seam for the lower one. */}
        {ROLE_BANDS.map((band) => (
          <p
            key={band}
            className={`gcc-role-canvas__band-label text-xs font-bold tracking-display uppercase ${
              band === "emerging" ? "text-accent-warm" : "text-accent-teal"
            }`}
            style={
              {
                "--gcc-band-at": band === "emerging" ? "0%" : "var(--gcc-role-seam)",
              } as React.CSSProperties
            }
          >
            {bandLabels[band]}
          </p>
        ))}

        {map.roles.map((role) => {
          const family = map.families.find((held) => held.id === role.familyId);
          const live = drag?.id === role.id ? drag : role;
          const moving = drag?.id === role.id;
          return (
            <button
              key={role.id}
              type="button"
              className="gcc-role-canvas__pin"
              data-tone={family?.tone ?? 1}
              data-role-step={role.demand}
              /* The side the public field would draw the name on, because the geometry is
                 keyed on it there and the preview has to be keyed on it here. */
              data-side={role.labelSide}
              data-dragging={moving}
              aria-pressed={selected === role.id}
              /* The full placement in the name, because the mark itself says none of
                 it and a 7px disc four pixels to the left is not feedback. The BAND is in
                 here too now that no gesture reveals it. */
              aria-label={`${role.name || "Unnamed role"}, ${family?.name ?? "no group"}, ${live.complexity} across, ${live.lane} down, ${bandLabels[role.band]}`}
              onPointerDown={(event) => {
                // Primary button only, so a right-click or a middle-click does not
                // start a drag that cannot be finished.
                if (event.button !== 0) return;
                event.preventDefault();
                setSelected(role.id);
                setDrag({
                  id: role.id,
                  complexity: role.complexity,
                  lane: role.lane,
                });
              }}
              onFocus={() => setSelected(role.id)}
              onKeyDown={(event) => nudge(role, event)}
              style={
                {
                  "--gcc-at": `${live.complexity}%`,
                  "--gcc-lane": `${live.lane}%`,
                } as React.CSSProperties
              }
            >
              {/* The dot and the label, drawn exactly as the public field draws them —
                  same ink, same size ramp, same side, and the same dot-to-name GAP, which
                  `.gcc-role-canvas__pin-row` is what holds — because the overlap an admin
                  is here to fix is between LABELS. */}
              <span
                className={cn(
                  "gcc-role-canvas__pin-row pointer-events-none",
                  role.labelSide === "lead" && "flex-row-reverse",
                )}
              >
                <span className="gcc-role-map__dot shrink-0" />
                {/* `text-xs`, the same size the public field draws — and the canvas is at
                    the public size, so a label that clears its neighbours here clears them
                    live. That equivalence is the whole value of the preview, so this size
                    may not be reduced to fit more in. No `nowrap`, for the same reason: the
                    public field lets a label that cannot fit inside the plot wrap, and one
                    of them does. */}
                <span className="text-xs leading-none text-text">
                  {role.name || "Untitled"}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* A live region, because every change here is a few pixels of movement. Polite: the
          admin asked for it. */}
      <p role="status" className="sr-only">
        {announcement}
      </p>

      {chosen ? (
        <p className="text-xs text-text-muted">
          <span className="font-medium text-text">{chosen.name || "Untitled"}</span>
          {" — "}
          {chosen.complexity} across, {chosen.lane} down,{" "}
          {bandLabels[chosen.band]}, name{" "}
          {chosen.labelSide === "lead" ? "before" : "after"} the bubble. Exact values are in
          the table below.
        </p>
      ) : (
        <p className="text-xs text-text-muted">
          Nothing selected. Click or tab to a bubble to move it with the keyboard.
        </p>
      )}
    </div>
  );
}

/** A position is a whole number 0 to 100, which is what the schema accepts. */
function clamp(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}
