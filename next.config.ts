import type { NextConfig } from "next";

import { publicFrameAncestors } from "./src/lib/frame-ancestors";

/**
 * Three things here are load-bearing, all recorded in .kiro/steering/project.md.
 *
 * 1. The dataset is a JSON file in the repo, read with `fs` at request time on
 *    the server. Next's file tracing has no way to see a path built at runtime,
 *    so `data/` is declared explicitly. This is a Next feature, not a Vercel
 *    one: `next build && next start` on a plain Node host behaves identically.
 *
 * 2. The public surface is iframed into an ansr.com page; /admin never is.
 *    `frame-ancestors` is set per-path accordingly, and admin's is a literal
 *    `'none'` that reads no configuration at all.
 *
 * 3. The peer cards may draw a company mark from a third-party CDN, so the public
 *    routes declare an `img-src`. It is DERIVED FROM THE SAME ENV VAR the resolver
 *    reads, so the origin is allowed only while the tier is actually on — an
 *    unconfigured deployment ships a CSP that permits nothing extra, and switching
 *    the tier off later removes the origin without a second edit to remember.
 */

/**
 * The public `frame-ancestors`: ansr.com, plus any origins in
 * `GCC_FRAME_ANCESTORS_EXTRA` (the owner's portfolio embeds the live tool). Unset
 * adds nothing, so a deployment is unchanged until someone opts in; a malformed
 * entry throws here and fails the build. Parsing and the origin rule live in
 * `src/lib/frame-ancestors.ts`, where they are unit-tested.
 *
 * Evaluated when the config loads and baked into the build's headers, so on Vercel
 * a change to the variable needs a REDEPLOY — see the Stack table in project.md.
 */
const PUBLIC_FRAME_ANCESTORS = publicFrameAncestors(process.env.GCC_FRAME_ANCESTORS_EXTRA);

/**
 * `img-src` for the public surface.
 *
 * `'self'` for everything committed under `public/`, `data:` because the brand SVGs
 * are inlined in places, and the mark CDN only when a client ID exists.
 *
 * **Declaring `img-src` at all is a tightening, not a loosening.** With no directive
 * and no `default-src`, image loading was unrestricted; naming the two origins we
 * actually use means a future component cannot quietly pull an image from anywhere
 * else.
 */
const MARK_CDN = process.env.NEXT_PUBLIC_GCC_BRANDFETCH_CLIENT_ID?.trim()
  ? " https://cdn.brandfetch.io"
  : "";
const PUBLIC_IMG_SRC = `img-src 'self' data:${MARK_CDN}`;

const nextConfig: NextConfig = {
  /**
   * TEMPORARY — lets a SECOND dev server run beside the first without either touching
   * the other's build directory. Two `next dev` processes sharing one `.next/` is the
   * failure recorded in `docs/traps.md`: every request 500s with a
   * `TurbopackInternalError`. Unset, this is `.next` and nothing changes.
   *
   * Goes with the variant harness.
   */
  distDir: process.env.GCC_DIST_DIR ?? ".next",
  outputFileTracingIncludes: {
    "/**": ["./data/**"],
  },
  async headers() {
    return [
      {
        source: "/admin/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'none'",
          },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
      {
        source: "/((?!admin).*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: `frame-ancestors ${PUBLIC_FRAME_ANCESTORS}; ${PUBLIC_IMG_SRC}`,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
