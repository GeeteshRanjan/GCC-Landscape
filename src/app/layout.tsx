import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

/**
 * The display face: **Moderat**, the brand's own, self-hosted at build time.
 *
 * ansr.com sets Moderat on every heading and paragraph, and `Group 149.svg`'s
 * outlined glyph widths match its advance widths to within 1% — so this is the
 * brand's face rather than a reading of it. It replaces the Hanken Grotesk
 * stand-in that stood here while the licence was unsettled; ANSR supplied the
 * family, and the four weights below are converted from the supplied TTFs to
 * woff2 with `fontTools` and otherwise untouched. Nothing is subset: the family
 * carries only 501 characters, so a latin subset would save under a fifth of
 * 40 KB per weight and buy a class of missing-glyph bug in exchange.
 *
 * **FOUR FILES, and a fifth was tried and reverted.** Moderat Extended Medium
 * shipped here for one pass, to set the product name at the width of the SVG
 * artwork it replaced — the supplied `GCC`'s letters are Extended-shaped to within
 * 0.1%. It was wrong, and measurably: the supplied `ATLAS` is NOT Extended, so
 * matching one half ran the other 16.6% wide and the whole lockup 10.8% wide at the
 * same cap height, which the project owner read as the name looking short and
 * vertically pressed. The normal width lands the lockup within 3.7% and its
 * letterfitting within 0.31% of the ANSR wordmark's. See `ProductName`.
 *
 * Five choices worth stating:
 *
 *   - **`next/font/local`, not a `@font-face` block in `globals.css`.** It
 *     fingerprints the files into `/_next/static/media`, emits the `@font-face`
 *     rules with the right `font-display` and preloads them, so there is no
 *     third-party request from inside an iframe on a client's marketing page and
 *     no layout shift from a late stylesheet.
 *   - **A CSS variable, not `className`.** The family name it generates is hashed,
 *     so it can only be reached through a custom property. `tokens.css` reads
 *     `--gcc-font-display-loaded` and keeps the literal name as its fallback.
 *   - **Real weight files, never a synthesised one.** ansr.com ships Light and
 *     Regular only and lets the browser fake 500/600/700, which arrives smeared;
 *     `docs/ansrx-visual-language.md` §1 says explicitly not to replicate that.
 *   - **MODERAT HAS NO SEMIBOLD, so 600 is served by Medium and never by Bold.**
 *     The family's real weights are Thin 100, Light 300, Regular 400, Medium 500,
 *     Bold 700, Black 900. With no 600 declared, the CSS font-matching algorithm
 *     resolves a request for 600 UPWARD first and would land on Bold — which
 *     would make `font-semibold` and `font-bold` the same ink, and `IndexTable`
 *     marks its base column with weight alone ("ink alone is the whole signal",
 *     asserted by a spec). So the Medium file declares `500 600` and that
 *     collapse goes the other way: the table keeps Medium against Bold, which is
 *     a wider step than the semibold-against-bold it replaces.
 *   - **`display: "swap"`.** The alternative, `optional`, drops the face entirely
 *     on a slow connection — which on this brand means silently losing Light 300.
 *     A brief fallback render is the cheaper failure.
 */
const displayFace = localFont({
  variable: "--gcc-font-display-loaded",
  display: "swap",
  // Named so the fallback metrics are computed against the real family rather
  // than against a hashed placeholder.
  fallback: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
  src: [
    // Light 300 is the body weight and the single biggest tell of this brand.
    { path: "./fonts/Moderat-Light.woff2", weight: "300", style: "normal" },
    { path: "./fonts/Moderat-Regular.woff2", weight: "400", style: "normal" },
    // `500 600` — see the semibold note above.
    { path: "./fonts/Moderat-Medium.woff2", weight: "500 600", style: "normal" },
    { path: "./fonts/Moderat-Bold.woff2", weight: "700", style: "normal" },
  ],
});


export const metadata: Metadata = {
  title: "India GCC Landscape",
  // The tool is embedded in an ansr.com page and is never a destination of its
  // own, so it stays out of the index.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // The variable is set here rather than on the public screens' own root so the
    // face is available to both surfaces, but nothing switches to it implicitly:
    // `body` still resolves to --ansr-font-sans, and a surface opts in with
    // `font-display`. Admin is a dense internal tool and stays on Inter.
    <html lang="en" className={displayFace.variable}>
      <body>{children}</body>
    </html>
  );
}
