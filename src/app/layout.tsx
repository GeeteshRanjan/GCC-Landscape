import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk } from "next/font/google";
import "./globals.css";

/**
 * The display face, self-hosted at build time.
 *
 * Until now nothing loaded a web font at all, so `--ansr-font-display` fell
 * through its whole stack to `system-ui` — and with it the one typographic fact
 * that most identifies this brand: **body copy is the display face's Light 300**.
 * A missing face does not fail loudly. It renders in the system sans at Regular,
 * which looks deliberate, so this was invisible rather than broken.
 *
 * Hanken Grotesk is the stand-in, not the answer. The brand's face is Moderat;
 * ansr.com sets it on every heading and paragraph, and its licence for an
 * embedded tool is an open question for ANSR. Hanken Grotesk is what ansr.com
 * already loads as its second family, is a geometric grotesque of the same
 * posture, and is free to self-host. When the licence is settled, Moderat goes in
 * front of this in `--ansr-font-display` and nothing else changes.
 *
 * Three choices worth stating:
 *
 *   - **`next/font`, not a `<link>` to Google.** It self-hosts the files at build
 *     time, so there is no third-party request from inside an iframe on a client's
 *     marketing page, and no layout shift from a late stylesheet.
 *   - **A CSS variable, not `className`.** The family name it generates is hashed,
 *     so it can only be reached through a custom property. `tokens.css` reads
 *     `--gcc-font-display-loaded` and keeps the literal name as its fallback.
 *   - **`display: "swap"`.** The alternative, `optional`, drops the face entirely
 *     on a slow connection — which on this brand means silently losing Light 300.
 *     A brief fallback render is the cheaper failure.
 */
const displayFace = Hanken_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--gcc-font-display-loaded",
  // The real weights, not synthesised ones. ansr.com ships two files and lets the
  // browser fake 500/600/700, which arrives smeared; docs/ansrx-visual-language.md
  // §1 says explicitly not to replicate that.
  weight: ["300", "400", "500", "600", "700"],
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
