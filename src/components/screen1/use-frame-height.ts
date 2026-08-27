"use client";

import { useEffect } from "react";

/**
 * Tells the hosting page how tall the tool is.
 *
 * The tool is embedded in an ansr.com page and does not own the scroll container,
 * so it cannot size itself: an iframe has a fixed height until the parent changes
 * it. Everything else in the public screens follows from that — no `100vh`, no
 * fixed or sticky positioning, no assumption that the viewport is the window.
 * This hook is the other half of the deal.
 *
 * The message is one integer. The parent listens for it and sets the iframe's
 * height; the snippet it needs is documented in README-facing terms below so
 * whoever adds the embed does not have to read this file.
 *
 *   window.addEventListener("message", (event) => {
 *     if (event.origin !== "https://gcc-landscape.vercel.app") return;
 *     if (event.data?.type !== "gcc-landscape:height") return;
 *     document.getElementById("gcc-landscape").style.height = `${event.data.height}px`;
 *   });
 *
 * Until that snippet exists the tool still works — it just scrolls inside a
 * fixed-height frame rather than growing. Nothing here is load-bearing for
 * correctness, which is why it fails quietly.
 */

export const FRAME_HEIGHT_MESSAGE = "gcc-landscape:height";

/**
 * Where the height is posted. `*` by default, and that is a considered choice
 * rather than a shortcut: the payload is a single integer describing our own
 * layout, so there is nothing to leak, and hardcoding an origin would break the
 * moment the tool is embedded on a staging host or moved in-house. Set
 * `NEXT_PUBLIC_GCC_FRAME_TARGET_ORIGIN` to pin it once the hosting page is known.
 */
const TARGET_ORIGIN = process.env.NEXT_PUBLIC_GCC_FRAME_TARGET_ORIGIN ?? "*";

/**
 * Observes the document and posts its height on every change.
 *
 * Observing `document.documentElement` rather than a wrapper element is
 * deliberate: a margin on the body, or anything rendered outside the tool's own
 * tree, would be missing from a wrapper's box and the frame would end up a few
 * pixels short with the last line clipped.
 */
export function useFrameHeight(): void {
  useEffect(() => {
    // Not framed — a developer opening the page directly, or an in-house
    // deployment serving it from ansr.com without a frame. Nothing to negotiate.
    if (window.parent === window) return;

    let last = -1;
    const post = () => {
      const height = Math.ceil(document.documentElement.scrollHeight);
      if (height === last) return;
      last = height;
      window.parent.postMessage({ type: FRAME_HEIGHT_MESSAGE, height }, TARGET_ORIGIN);
    };

    post();

    const observer = new ResizeObserver(post);
    observer.observe(document.documentElement);

    // Web fonts land after first paint and change every line box. Without this
    // the first reported height is the fallback font's, and the frame is short
    // until something else happens to resize.
    document.fonts?.ready.then(post).catch(() => {
      /* Font loading is best-effort; the observer still covers later changes. */
    });

    window.addEventListener("orientationchange", post);
    return () => {
      observer.disconnect();
      window.removeEventListener("orientationchange", post);
    };
  }, []);
}
