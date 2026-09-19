/**
 * Measures the entry point hero's three vertical intervals INK TO INK, against a
 * running server.
 *
 *   node scripts/measure-hero-ink.mjs [url]     # default http://localhost:3000
 *
 * **Why this is committed rather than re-derived.** `ask-hero.tsx` declares its
 * shoulder and its two gaps as optical distances and corrects each one with a
 * leading trim, and the rule beside those constants is that the check is the
 * INTERVAL a correction produces, never the correction itself. Getting there needs
 * a rasteriser and three specific instrument fixes, each of which has produced a
 * confidently wrong number in this codebase already:
 *
 *   - **Canvas text metrics taken before `document.fonts.ready` describe the
 *     FALLBACK face**, which sent an earlier set of constants 0.029em out.
 *   - **A screenshot of a CONTAINER captures whatever paints over it.** The form
 *     card overlaps the hero's foot, so rasterising the band finds a white plate
 *     and reads it as ink. Every clip here is one element's own box.
 *   - **A clip to the element's box TRUNCATES ink that hangs outside it.** At
 *     `--ansr-leading-display` (1.05) against Moderat's 1.2em content area the
 *     half-leading is negative, so the headline's descenders sit below their own
 *     box — which is the very thing `HERO_PAD_BASELINE` exists to correct, and a
 *     box-tight clip reports the error as nearly zero. The last-line clip reaches
 *     past the box on purpose.
 *
 * It also does NOT hide the neighbouring elements to isolate one: an inline
 * `visibility` on the `h1` does not take, so isolation is by clip geometry instead.
 *
 * Read the output against the classes in `ask-hero.tsx`: `HERO_SHOULDER` (32 / 48 /
 * 64), `HERO_LOGO_GAP` and `HERO_LEAD_GAP` (20 on a phone, 24 from `md`). Sub-pixel
 * residue is the integer rounding a browser applies to a small line box and is not
 * worth chasing.
 */
import { chromium } from "playwright";

const URL = process.argv[2] ?? "http://localhost:3000";
const SCALE = 4;

let sharp;
try {
  sharp = (await import("sharp")).default;
} catch {
  console.error(
    "This script needs `sharp` to read pixels. It normally arrives with Next.js; " +
      "install it as a dev dependency if your platform skipped it.",
  );
  process.exit(1);
}

/** First and last row carrying ink inside a clip, in page coordinates. */
async function inkRows(page, clip) {
  const { data, info } = await sharp(await page.screenshot({ clip }))
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  let top = null;
  let bottom = null;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (width * y + x) * channels;
      // The band is forced to black below and every element on it draws white or
      // the action orange, so any pixel meaningfully above black is ink.
      if (data[i] + data[i + 1] + data[i + 2] > 90) {
        if (top === null) top = y;
        bottom = y;
        break;
      }
    }
  }
  if (top === null) return null;
  return { top: clip.y + top / SCALE, bottom: clip.y + (bottom + 1) / SCALE };
}

const browser = await chromium.launch();
// `reduce`, because `.gcc-enter` is gated on `no-preference` — so this suppresses the
// entrance animation without overriding `animation`, which would leave the elements
// parked on the keyframe's `from` state and measure nothing.
const page = await browser.newPage({ deviceScaleFactor: SCALE, reducedMotion: "reduce" });

for (const width of [1440, 768, 390]) {
  await page.setViewportSize({ width, height: 1400 });
  await page.goto(URL, { waitUntil: "networkidle" });
  // The dot map is ink too, and it sits behind the copy. The flat ground is what
  // makes a brightness threshold mean "ink" rather than "map".
  await page.addStyleTag({
    content: `
      .gcc-hero-map { display: none !important; }
      .gcc-ground-hero { background: #000 !important; }
    `,
  });
  await page.evaluate(() => document.fonts.ready);

  const geo = await page.evaluate(() => {
    const box = (el) => {
      const b = el.getBoundingClientRect();
      return { x: b.x, y: b.y, width: b.width, height: b.height, bottom: b.bottom };
    };
    const h1 = document.querySelector("#ask-title");
    const lead = document.querySelector("#ask-title ~ div p");
    const line = (el) => parseFloat(getComputedStyle(el).lineHeight);
    const size = (el) => parseFloat(getComputedStyle(el).fontSize);
    return {
      band: box(document.querySelector(".gcc-ground-hero")),
      img: box(document.querySelector('img[alt="ANSR"]')),
      h1: { ...box(h1), line: line(h1), size: size(h1) },
      lead: { ...box(lead), line: line(lead), size: size(lead) },
    };
  });

  const lockup = await inkRows(page, {
    x: geo.img.x,
    y: geo.img.y,
    width: geo.img.width,
    height: geo.img.height,
  });
  const h1First = await inkRows(page, {
    x: geo.h1.x,
    // Floored at the lockup's ink, in case a future trim pulls the box above it.
    y: Math.max(geo.h1.y, lockup.bottom + 0.5),
    width: geo.h1.width,
    height: geo.h1.line,
  });
  const h1Last = await inkRows(page, {
    x: geo.h1.x,
    y: geo.h1.bottom - geo.h1.line,
    width: geo.h1.width,
    // Past the box, for the descenders that hang out of it. 12px clears Moderat's
    // 0.21em at 72px and stays well above the lead's own first ink.
    height: geo.h1.line + 12,
  });
  const leadFirst = await inkRows(page, {
    x: geo.lead.x,
    y: geo.lead.y,
    width: geo.lead.width,
    height: geo.lead.line,
  });

  const em = (px, size) => `${(px / size).toFixed(4)}em`;
  console.log(
    `${width}: shoulder ${(lockup.top - geo.band.y).toFixed(2)}` +
      `  logoGap ${(h1First.top - lockup.bottom).toFixed(2)}` +
      `  leadGap ${(leadFirst.top - h1Last.bottom).toFixed(2)}` +
      `   [h1 ${geo.h1.size}px, lead ${geo.lead.size}px]` +
      // The three corrections, as the render actually wants them.
      `   capOffset ${em(h1First.top - geo.h1.y, geo.h1.size)}` +
      `  descenderBelowBox ${em(h1Last.bottom - geo.h1.bottom, geo.h1.size)}` +
      `  leadInkOffset ${em(leadFirst.top - geo.lead.y, geo.lead.size)}`,
  );
}

await browser.close();
