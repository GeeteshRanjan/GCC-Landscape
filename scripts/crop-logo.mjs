/**
 * Crop a supplied logo SVG to its own INK bounds and print the dimensions to record.
 *
 *   node scripts/crop-logo.mjs <in.svg> public/logos/<slug>.svg
 *
 * **Why a script rather than a hand edit.** Logos arrive in batches from four or five
 * different export tools, and every batch has had at least one file whose artboard was
 * not its artwork — Hudson's Bay was a 578x444 board around 446x297 of ink, which at a
 * fixed height would have rendered a third smaller than everything beside it while
 * claiming the same slot. Doing it by eye is how one mark in twenty ends up wrong, and
 * the wrongness looks like a design choice.
 *
 * **The bounds are found by RASTERISING and scanning alpha, not by `getBBox`.** getBBox
 * ignores strokes, markers and filters, so a mark whose outer edge is a stroke measures
 * short and gets clipped. Rendering the artboard and finding the outermost non-transparent
 * pixel is the only method that sees what a visitor sees.
 *
 * **Nothing is traced, refitted or re-drawn.** The crop is written as a `viewBox` in the
 * file's OWN user space and the child elements are copied verbatim, so what ships stays
 * byte-comparable to what was supplied — the same rule the drawn wordmarks follow. The
 * root's `width`/`height` are replaced because an `<img>` needs an intrinsic size to scale
 * a ratio from, and several supplied files had none, a negative one, or one that disagreed
 * with their own `viewBox`.
 *
 * Run it through `npm run logo:crop`. The numbers it prints go on the matching
 * `DEFAULT_LOGOS` entry in `src/data/schema.ts` and into `data/dataset.json`.
 */
import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";

const [input, output] = process.argv.slice(2);
if (!input || !output) {
  console.error("usage: node scripts/crop-logo.mjs <in.svg> <out.svg>");
  process.exit(1);
}

/** The long side of the emitted file, in px. A ratio is what matters; this sets the scale. */
const LONG_SIDE = 128;
/** Alpha below this is an antialias tail rather than ink. */
const ALPHA_FLOOR = 8;
/** Raster width used for the measurement. Higher costs time and buys sub-pixel accuracy. */
const PROBE = 1600;

const round = (v) => Number(v.toFixed(4));

function rootTag(svg) {
  const m = svg.match(/<svg\b[^>]*>/i);
  if (!m) throw new Error(`${input}: no <svg> element`);
  return { tag: m[0], end: m.index + m[0].length };
}

const attr = (tag, name) =>
  tag.match(new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`, "i"))?.[1] ?? null;

/** The file's own user-space box, from its `viewBox` or failing that its dimensions. */
function userBox(tag) {
  const vb = attr(tag, "viewBox");
  if (vb) {
    const n = vb.trim().split(/[\s,]+/).map(Number);
    if (n.length === 4 && n.every(Number.isFinite)) return n;
  }
  // Some exports carry a negative or absent height — `lululemon-1.svg` shipped -647.
  const w = Math.abs(parseFloat(attr(tag, "width") ?? ""));
  const h = Math.abs(parseFloat(attr(tag, "height") ?? ""));
  if (Number.isFinite(w) && Number.isFinite(h)) return [0, 0, w, h];
  throw new Error(`${input}: no viewBox and no usable width/height`);
}

/**
 * Rebuild the root tag, keeping every attribute the CHILDREN might depend on.
 *
 * **Every `xmlns:*` declaration has to survive.** Inkscape and Illustrator exports carry
 * `sodipodi:` and `inkscape:` prefixes on their children, and dropping the declaration is
 * an XML parse error — which an `<img>` reports by rendering nothing at all.
 */
function reroot(svg, box, px) {
  const { tag, end } = rootTag(svg);
  const kept = [...tag.matchAll(/([:A-Za-z_][-:.\w]*)\s*=\s*"([^"]*)"/g)]
    .filter(([, k]) => !/^(width|height|viewBox|x|y|style|enable-background)$/i.test(k))
    .map(([, k, v]) => ` ${k}="${v}"`)
    .join("");
  const ns = kept.includes(' xmlns="') ? "" : ' xmlns="http://www.w3.org/2000/svg"';
  const [x, y, w, h] = box;
  return (
    `<svg${ns}${kept} width="${px[0]}" height="${px[1]}"` +
    ` viewBox="${round(x)} ${round(y)} ${round(w)} ${round(h)}">` +
    svg.slice(end).replace(/<\?xml[^>]*\?>/g, "")
  );
}

const raw = readFileSync(input, "utf8");
const box = userBox(rootTag(raw).tag);
const scale = PROBE / Math.max(box[2], box[3]);
const probeSize = [Math.round(box[2] * scale), Math.round(box[3] * scale)];

const browser = await chromium.launch();
const page = await browser.newPage();
const ink = await page.evaluate(
  async ([markup, w, h, floor]) => {
    const img = new Image();
    img.width = w;
    img.height = h;
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = () => rej(new Error("the SVG did not decode"));
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(markup);
    });
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, w, h);
    const d = ctx.getImageData(0, 0, w, h).data;
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (d[(y * w + x) * 4 + 3] > floor) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
      }
    }
    return x1 < 0 ? null : { x0, y0, x1, y1 };
  },
  [reroot(raw, box, probeSize), probeSize[0], probeSize[1], ALPHA_FLOOR],
);
await browser.close();

if (!ink) throw new Error(`${input}: nothing rendered — check it is not an empty artboard`);

// Back into the file's own user space, with one probe pixel of bleed so the alpha floor
// cannot clip a letterform's outermost antialiased column.
const bleed = 1 / scale;
const crop = [
  box[0] + ink.x0 / scale - bleed,
  box[1] + ink.y0 / scale - bleed,
  (ink.x1 - ink.x0 + 1) / scale + bleed * 2,
  (ink.y1 - ink.y0 + 1) / scale + bleed * 2,
];

const ratio = crop[2] / crop[3];
const px =
  ratio >= 1
    ? [LONG_SIDE, Math.round(LONG_SIDE / ratio)]
    : [Math.round(LONG_SIDE * ratio), LONG_SIDE];

writeFileSync(output, reroot(raw, crop, px) + "\n");

const trimmed = (1 - (crop[2] * crop[3]) / (box[2] * box[3])) * 100;
console.log(`${output}`);
console.log(`  artboard  ${round(box[2])} x ${round(box[3])}`);
console.log(`  ink       ${round(crop[2])} x ${round(crop[3])}  (${trimmed.toFixed(1)}% of the board trimmed)`);
console.log(`  ratio     ${ratio.toFixed(3)}:1`);
console.log(`  RECORD    width: ${px[0]}, height: ${px[1]}`);
