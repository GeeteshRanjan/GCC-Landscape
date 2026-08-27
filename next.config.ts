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
 */
const ANSR_FRAME_ANCESTORS = "https://ansr.com https://*.ansr.com";

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
            value: `frame-ancestors 'self' ${ANSR_FRAME_ANCESTORS}`,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
