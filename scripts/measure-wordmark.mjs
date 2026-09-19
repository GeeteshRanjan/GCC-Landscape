/**
 * The instrument for the product name's FACE and TRACKING.
 *
 * `GCC ATLAS` was two supplied outlines for several passes and is type now. This is where
 * the choice of width and tracking comes from, and it exists mainly to stop one specific
 * mistake being made twice.
 *
 * **THE ARTWORK IS NOT A REACHABLE TARGET, and chasing it per-letter is the trap.** The two
 * supplied files were never one typeface: `GCC` is Extended-shaped, while `ATLAS`'s L-to-S
 * proportion is 1.155 against 1.219 to 1.319 across all ten cuts of Moderat. So matching one
 * half guarantees missing the other. Moderat Extended Medium shipped for a pass on the
 * strength of the `GCC` half and ran the lockup 10.8% wide at the same cap height, which
 * reads as the name looking short and vertically pressed. **Score on the LOCKUP, which is
 * the proportion a reader sees, subject to the letterfitting staying near the ANSR
 * wordmark's** — that is what this reports and why the winning row is a normal width.
 *
 * WHAT IT COMPARES. Ink, scanned off a raster, normalised by CAP HEIGHT so the comparison
 * is scale-free. Never path coordinates or font metrics: the supplied outlines are traced,
 * so their control points sit outside their ink, and the letters setting the extremes are
 * round and overshoot. The drawn targets below were taken the same way, from the SVG
 * components before they were deleted; git holds them.
 *
 *   npm run wordmark:measure
 *
 * Reports, per candidate tracking value, the typed ink width over cap height for each half
 * and for the whole lockup, against the drawn target. Pick the row that minimises the
 * LOCKUP error — the two halves cannot both be matched, because the supplied artwork
 * tracks them differently from each other.
 */
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * The supplied artwork, in ink width over CAP HEIGHT.
 *
 * Measured off `gcc-wordmark.tsx` and `atlas-wordmark.tsx` while they still existed, by
 * rasterising each at 400px of box and scanning ink. Cap height is the fraction of the
 * box each file's crop recorded — 0.9503 for GCC, 0.9500 for ATLAS — which is why these
 * are the numbers to compare against and not the boxes themselves.
 *
 * The lockup target folds in the word space those components drew: 0.355 of the box,
 * which at GCC's cap-over-box is 0.3736 of cap.
 */
const DRAWN = { gcc: 3.3463, atlas: 4.0868, wordSpace: 0.3736 };
DRAWN.lockup = DRAWN.gcc + DRAWN.wordSpace + DRAWN.atlas;

/**
 * The candidate faces, because the WIDTH is the open question and not the tracking.
 *
 * Extended was tried first, on the strength of the supplied `GCC`'s letter widths, and it
 * is wrong: matching that half per-letter runs the ATLAS half 16.6% wide and the whole
 * lockup 10.8% wide at the same cap height, which reads as vertically pressed. The normal
 * width is here because the supplied ATLAS is normal-width-shaped, and the lockup's overall
 * proportion is what a reader actually sees.
 */
const CANDIDATES = [
  { name: "Medium (normal, SHIPPED)", file: "src/app/fonts/Moderat-Medium.woff2" },
  { name: "Regular (normal)", file: "src/app/fonts/Moderat-Regular.woff2" },
  /**
   * The rejected alternative, kept measurable.
   *
   * Read from the supplied TTF library rather than from `src/app/fonts/`, because it does
   * not ship — it was converted, shipped for one pass and deleted. That directory is
   * gitignored, so this candidate is OPTIONAL: whoever has the family sees the row that
   * explains why the normal width won, and whoever does not still gets a working script.
   */
  { name: "Extended Medium (rejected)", file: "ANSR font/Moderat-Extended-Medium.ttf" },
];
const faces = [];
for (const c of CANDIDATES) {
  try {
    faces.push({ ...c, b64: readFileSync(join(root, c.file)).toString("base64") });
  } catch {
    console.log(`(skipping ${c.name} — ${c.file} is not present)`);
  }
}
const FACES = faces;

/**
 * The ANSR wordmark, which is the REFERENCE the tracking is matched to.
 *
 * The supplied `GCC` / `ATLAS` artwork is not a usable target: its ATLAS half has an
 * L-to-S proportion of 1.155, where all ten Moderat cuts sit between 1.219 and 1.319, and
 * Moderat Extended Medium's ATLAS letters alone are wider than that whole mark's ink. So
 * the artwork cannot be reproduced in the brand's own face, and is reported below only as
 * context. What the product name CAN be held to is the brand wordmark it sits beside on
 * every surface that draws it — one letterfitting across `ANSR GCC ATLAS`.
 */
const ANSR_SVG = "assets/brand/logo/ANSR Name.svg";
const ansrSrc = readFileSync(join(root, ANSR_SVG), "utf8");
const ansrPaths = [...ansrSrc.matchAll(/ d="([^"]+)"/g)].map((m) => m[1]);
const ansrViewBox = (/viewBox="([^"]+)"/.exec(ansrSrc) ?? [, "0 0 158 41"])[1];

/**
 * Tracking candidates, in em. Swept rather than solved, because `letter-spacing` applies at
 * every character boundary including the trailing one, kerning moves with it, and the space
 * glyph takes it too — so the arithmetic answer and the drawn answer differ.
 */
const SWEEP = [0, -0.02, -0.04, -0.05, -0.06, -0.07, -0.08, -0.09, -0.1, -0.11, -0.12];

/**
 * How far the letterfitting may sit from the ANSR wordmark's before a row is disqualified.
 *
 * Without this the sweep's own winner was Extended at -0.09em: the lockup width matched to
 * 0.37% while the letters were 65% tighter than the wordmark's and 0.02 of cap from
 * touching. A lockup can be the right WIDTH and still be wrong, so width alone is not a
 * score.
 */
const FIT_TOLERANCE = 0.15;

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
await page.setContent(
  `<!doctype html><meta charset="utf-8"><style>
   ${faces
     .map(
       (f, i) =>
         `@font-face{font-family:"F${i}";src:url(data:font/woff2;base64,${f.b64}) format("woff2");}`,
     )
     .join("\n")}
   html,body{margin:0;background:#fff}
   </style><body></body>`,
);
await page.evaluate(() => document.fonts.ready);
await page.evaluate(async () => {
  await Promise.all(
    [...document.fonts].map((f) => document.fonts.load(`400px "${f.family}"`, "GCC ATLASHM")),
  );
});

const out = await page.evaluate(
  async ({ sweep, ansr, faceCount }) => {
    const W = 6000;
    const H = 1000;
    const PX = 400;

    /** Ink bounds plus the interior empty-column runs, off a real raster. */
    function scan(draw) {
      const c = document.createElement("canvas");
      c.width = W;
      c.height = H;
      const ctx = c.getContext("2d");
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#000";
      draw(ctx);
      const data = ctx.getImageData(0, 0, W, H).data;
      let minX = W;
      let maxX = -1;
      let minY = H;
      let maxY = -1;
      const cols = new Uint8Array(W);
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          if (data[(y * W + x) * 4 + 3] > 8) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
            cols[x] = 1;
          }
        }
      }
      if (maxX < 0) return null;
      const gaps = [];
      let run = 0;
      for (let x = minX; x <= maxX; x++) {
        if (cols[x]) {
          if (run > 0) gaps.push(run);
          run = 0;
        } else run++;
      }
      return { w: maxX - minX + 1, h: maxY - minY + 1, gaps };
    }

    const text = (str, tracking, fi) =>
      scan((ctx) => {
        ctx.font = `${PX}px "F${fi}"`;
        ctx.textBaseline = "alphabetic";
        // Canvas has no letter-spacing on older engines; where it does, it matches CSS.
        ctx.letterSpacing = `${tracking * PX}px`;
        ctx.fillText(str, 100, 800);
      });


    /**
     * The ANSR wordmark's own interior ink gaps, over its own cap height.
     *
     * Rasterised at a big size and scanned, same as everything else. A-N-S-R has three
     * interior gaps and only S is round, so the ink height IS the cap height plus that
     * one letter's overshoot — which is why cap is taken from the FLAT letters by
     * scanning the mark's own top edge rather than from the ink box.
     */
    async function ansrGaps() {
      const svg =
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${ansr.viewBox}" height="600" fill="#000">` +
        ansr.paths.map((d) => `<path d="${d}"/>`).join("") +
        `</svg>`;
      const img = new Image();
      img.src = "data:image/svg+xml;base64," + btoa(svg);
      await img.decode();
      const r = scan((ctx) => ctx.drawImage(img, 100, 100));
      return r;
    }
    const ansrInk = await ansrGaps();

    return {
      ansr: {
        gaps: ansrInk.gaps,
        h: ansrInk.h,
        w: ansrInk.w,
      },
      faces: Array.from({ length: faceCount }, (_, fi) => {
        // Cap height from a flat-topped capital, per face, so no overshoot is folded in.
        const cap = text("H", 0, fi).h;
        return {
          cap,
          rows: sweep.map((tracking) => {
            const g = text("GCC", tracking, fi);
            const a = text("ATLAS", tracking, fi);
            const l = text("GCC ATLAS", tracking, fi);
            const letterGaps = [...g.gaps, ...a.gaps];
            return {
              tracking,
              gcc: g.w / cap,
              atlas: a.w / cap,
              lockup: l.w / cap,
              wordSpace: Math.max(...l.gaps) / cap,
              tightestGap: Math.min(...l.gaps) / cap,
              avgLetterGap:
                letterGaps.reduce((t, v) => t + v, 0) / (letterGaps.length * cap),
            };
          }),
        };
      }),
    };
  },
  { sweep: SWEEP, ansr: { paths: ansrPaths, viewBox: ansrViewBox }, faceCount: faces.length },
);

const pct = (got, want) => ((got - want) / want) * 100;
const sign = (v) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;

// The ANSR wordmark's own letterfitting, in cap widths. Its ink box includes the S's
// overshoot, so cap is scaled off the artboard's recorded letter span (37.86 of 41 units)
// rather than taken from the box.
const ansrCap = out.ansr.h / 1.0248;
const ansrGaps = out.ansr.gaps.map((g) => g / ansrCap);
const ansrAvg = ansrGaps.reduce((t, v) => t + v, 0) / ansrGaps.length;

console.log(
  `\ndrawn targets (cap widths)   GCC ${DRAWN.gcc.toFixed(4)}   ATLAS ${DRAWN.atlas.toFixed(4)}   ` +
    `LOCKUP ${DRAWN.lockup.toFixed(4)}   word space ${DRAWN.wordSpace.toFixed(4)}`,
);
console.log(
  `ANSR wordmark letterfitting  interior ink gaps / cap [${ansrGaps
    .map((g) => g.toFixed(4))
    .join(", ")}]  average ${ansrAvg.toFixed(4)}\n`,
);

let best = null;
for (const [fi, face] of out.faces.entries()) {
  console.log(`=== ${FACES[fi].name} — cap ${face.cap}px at 400px ===`);
  console.log(
    "  track     GCC             ATLAS           LOCKUP          fit vs ANSR  tightest  eligible",
  );
  for (const r of face.rows) {
    // **Scored on the LOCKUP, because that is the proportion a reader sees.** Matching the
    // halves per-letter is what put Extended on the page and read as vertically pressed:
    // the supplied files are two different typefaces, so per-letter fidelity to one of them
    // guarantees infidelity to the other, while the lockup's overall width is one number
    // both halves contribute to and is what "the aspect ratio is off" actually means.
    const fitErr = Math.abs(pct(r.avgLetterGap, ansrAvg)) / 100;
    const err = Math.abs(pct(r.lockup, DRAWN.lockup));
    const ok = fitErr <= FIT_TOLERANCE;
    if (ok && (best === null || err < best.err)) {
      best = { ...r, err, face: FACES[fi].name };
    }
    console.log(
      `  ${r.tracking.toFixed(3).padStart(6)}em ` +
        `${r.gcc.toFixed(4)} ${sign(pct(r.gcc, DRAWN.gcc)).padStart(7)}  ` +
        `${r.atlas.toFixed(4)} ${sign(pct(r.atlas, DRAWN.atlas)).padStart(7)}  ` +
        `${r.lockup.toFixed(4)} ${sign(pct(r.lockup, DRAWN.lockup)).padStart(7)}  ` +
        `${r.avgLetterGap.toFixed(4)} ${sign(pct(r.avgLetterGap, ansrAvg)).padStart(8)}  ` +
        `${r.tightestGap.toFixed(4)}    ${ok ? "yes" : "-"}`,
    );
  }
  console.log("");
}

console.log(
  `BEST on lockup width, among rows whose letterfitting is within ` +
    `${(FIT_TOLERANCE * 100).toFixed(0)}% of the ANSR wordmark's:`,
);
console.log(
  `  ${best.face} at ${best.tracking}em — ` +
    `lockup ${sign(pct(best.lockup, DRAWN.lockup))}, GCC ${sign(pct(best.gcc, DRAWN.gcc))}, ` +
    `ATLAS ${sign(pct(best.atlas, DRAWN.atlas))}`,
);
console.log(
  `  letterfitting there ${best.avgLetterGap.toFixed(4)} against ANSR's ${ansrAvg.toFixed(4)} ` +
    `(${sign(pct(best.avgLetterGap, ansrAvg))}); tightest interior gap ${best.tightestGap.toFixed(4)} cap.\n`,
);

await browser.close();
