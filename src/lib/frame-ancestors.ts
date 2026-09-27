/**
 * Who may frame the public surface. Imported by `next.config.ts`, which is the one
 * place the policy is emitted; it lives here rather than inline so the parsing can be
 * unit-tested without loading the Next config.
 *
 * Pure and dependency-free on purpose: the config loader transpiles this file on its
 * own, so it may not import from the data layer or take `server-only`.
 */

/** The embed's real home. Always present, whatever the variable says. */
export const ANSR_FRAME_ANCESTORS = ["https://ansr.com", "https://*.ansr.com"] as const;

/** One DNS label: letters, digits and inner hyphens. */
const LABEL = "[a-z0-9](?:[a-z0-9-]*[a-z0-9])?";

/**
 * A bare origin: scheme, host, optional port — no path, no trailing slash, no CSP
 * keyword. A wildcard must be followed by at least TWO labels, so `https://*.ansr.com`
 * is legal and `https://*.com`, which would let every .com site frame the tool, is not.
 * A single label is allowed without one, which is what admits `http://localhost:5173`.
 */
const ORIGIN = new RegExp(
  `^https?://(?:\\*\\.${LABEL}(?:\\.${LABEL})+|${LABEL}(?:\\.${LABEL})*)(?::\\d{1,5})?$`,
  "i",
);

/**
 * Parses `GCC_FRAME_ANCESTORS_EXTRA`: space-separated origins, unset or blank meaning
 * none. Validates and never transforms, on `isCtaUrl`'s argument — the value lands in a
 * security header, so a mistake fails the BUILD rather than being quietly repaired,
 * because a stray `;` or `'unsafe-inline'`-style keyword here would rewrite the policy.
 */
export function parseFrameAncestorsExtra(raw: string | undefined): string[] {
  const entries = (raw ?? "").split(/\s+/).filter(Boolean);
  for (const entry of entries) {
    if (!ORIGIN.test(entry)) {
      throw new Error(
        `GCC_FRAME_ANCESTORS_EXTRA: "${entry}" is not a bare origin. ` +
          "Use scheme and host with an optional port, e.g. https://example.com or " +
          "http://localhost:5173 — no path, no trailing slash.",
      );
    }
  }
  return entries;
}

/**
 * The public routes' `frame-ancestors` source list. `/admin` never reads this: its
 * policy is the literal `'none'` in `next.config.ts`.
 */
export function publicFrameAncestors(raw: string | undefined): string {
  return ["'self'", ...ANSR_FRAME_ANCESTORS, ...parseFrameAncestorsExtra(raw)].join(" ");
}
