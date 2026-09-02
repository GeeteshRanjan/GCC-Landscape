import type { NextConfig } from "next";

/**
 * Two things here are load-bearing, both recorded in .kiro/steering/project.md.
 *
 * 1. The dataset is a JSON file in the repo, read with `fs` at request time on
 *    the server. Next's file tracing has no way to see a path built at runtime,
 *    so `data/` is declared explicitly. This is a Next feature, not a Vercel
 *    one: `next build && next start` on a plain Node host behaves identically.
 *
 * 2. The public surface is iframed into an ansr.com page; /admin never is.
 *    `frame-ancestors` is set per-path accordingly. ADMIN routes do not exist
 *    yet, but the header is in place so no route can ever ship without it.
 *
 * 3. The peer cards may draw a company mark from a third-party CDN, so the public
 *    routes declare an `img-src`. It is DERIVED FROM THE SAME ENV VAR the resolver
 *    reads, so the origin is allowed only while the tier is actually on — an
 *    unconfigured deployment ships a CSP that permits nothing extra, and switching
 *    the tier off later removes the origin without a second edit to remember.
 */
const ANSR_FRAME_ANCESTORS = "https://ansr.com https://*.ansr.com";

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
            value: `frame-ancestors 'self' ${ANSR_FRAME_ANCESTORS}; ${PUBLIC_IMG_SRC}`,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
