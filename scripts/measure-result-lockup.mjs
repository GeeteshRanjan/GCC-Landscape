/**
 * The instrument for the result screens' `h1` — `ANSR GCC ATLAS`, where a supplied lockup
 * IMAGE and the product's name set in TYPE have to read as one lockup.
 *
 * WHY IT EXISTS. The two halves are aligned by `items-center`, which aligns BOXES. The
 * lockup's artboard happens to be symmetric about its wordmark's cap band, so centring the
 * image centres its caps; a line box is not symmetric about its cap band, so centring the
 * type DROPS its caps. The typed name sat exactly 1.00px low at every width before the
 * correction in `screen-header.tsx`, which reads as the name being short or sitting low
 * against the mark. That correction is a measured `em` and the comment beside it says to
 * re-measure it on any change to the face, to the lockup file or to the heading's size —
 * this is what that instruction means.
 *
 *   node scripts/measure-result-lockup.mjs            # verify what ships
 *   node scripts/measure-result-lockup.mjs 0.03 0.05  # sweep candidate extra lifts
 *
 * Needs a server on :3000 — `npm run dev` is fine, the heading is not build-dependent.
 *
 * HOW IT MEASURES, and why not any of the cheaper ways. Ink, scanned off a real raster of
 * the real page at deviceScaleFactor 4, with the dotted map hidden and the band's gradient
 * flattened to black so the only non-ground pixels are ink. Never font metrics and never
 * `getBoundingClientRect` on the span: a client rect is the LINE box rather than the
 * content area, and the face's own ascent and descent predict a correction of 0.05em that
 * OVERSHOOTS by half a pixel, because vertical glyph origins snap to whole pixels. See
 * `docs/traps.md` on measuring type.
 *
 * Only WHITE ink counts. The lockup's mark is Fortune-adjacent orange in the brand's action
 * colour and would otherwise set the cap band's extremes; the registered symbol is dropped
 * by height, being much shorter than a letter. The cap band is taken from the FLAT letters
 * — the lowest top and the highest bottom among them — because `S` and the round capitals
 * overshoot at both ends.
 *
 * WHAT TO READ. `dCapH` says whether the two halves are drawn at one cap height, which is
 * what the image's own `1.7em` is for; `dCapTop`, `dBase` and `dMidline` say whether that
 * shared cap band sits in the same PLACE. All four should be within a quarter of a pixel,
 * which is the raster's own quantum. A `dCapH` that is off is a change to the image's
 * height; the other three are the lift.
 */
import { chromium } from "playwright";

/** deviceScaleFactor, so the quantum is a quarter of a CSS pixel. */
const SCALE = 4;

/**
 * Extra lift to apply to the name ON TOP of what ships, in em. `0` is the verification run.
 *
 * A sweep is wide and flat rather than sharp, and that is the finding rather than a fault
 * in the sweep: the ink moves in whole pixels, so every request between roughly 0.5px and
 * 1.4px produces the same one pixel. Pick from the middle of the band that reads zero at
 * BOTH font sizes, not from its edge.
 */
const NUDGES = process.argv.slice(2).map(Number);
if (!NUDGES.length) NUDGES.push(0);

/** Both sizes the heading takes (24px below `md`, 30px from it), and the ends of each. */
const WIDTHS = [1440, 1024, 768, 640, 390, 320];

const browser = await chromium.launch();

for (const width of WIDTHS) {
  const page = await browser.newPage({
    viewport: { width, height: 900 },
    deviceScaleFactor: SCALE,
  });
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });

  // The heading only exists on a result screen, so the form has to be answered. Any
  // industry does — the heading is identical for every visitor.
  const pick = async (label, value, cascades) => {
    await page.getByLabel(label).click();
    const filter = page.getByLabel(/^Filter/);
    if (await filter.count()) await filter.fill(value);
    await page
      .getByRole("option", { name: value, exact: true })
      .or(page.getByRole("treeitem", { name: value, exact: true }))
      .first()
      .click();
    // An industry carrying sub-industries opens its cascade rather than closing; the
    // leading row is the exit that keeps the broad answer.
    if (cascades) {
      const all = page.getByRole("treeitem", { name: `All of ${value}`, exact: true });
      if (await all.count()) await all.first().click();
    }
  };
  await pick("Industry", "BFSI", true);
  await pick("Annual revenue", "Above 20 Bn");
  await pick("Headquarters", "USA");
  await page.getByRole("button", { name: /Build my GCC Landscape/i }).click();
  await page.getByRole("tab", { name: /Peer Landscape/i }).waitFor({ timeout: 20_000 });
  await page.evaluate(() => document.fonts.ready);

  // Flatten the ground. The band is a radial gradient with a dotted map over it, and both
  // would scan as ink.
  await page.evaluate(() => {
    document
      .querySelectorAll(".gcc-header-map")
      .forEach((n) => n.style.setProperty("display", "none"));
    document.querySelector(".gcc-result-band")?.style.setProperty("background", "#000");
  });

  const geom = await page.evaluate(() => {
    const h1 = document.querySelector("h1");
    const img = h1.querySelector("img");
    const span = [...h1.querySelectorAll("span")].find((s) =>
      /GCC ATLAS/.test(s.textContent),
    );
    const box = h1.getBoundingClientRect();
    return {
      box: { x: box.x, y: box.y, w: box.width, h: box.height },
      // The midpoint of the word space, which is where the raster is split into halves.
      split: (img.getBoundingClientRect().right + span.getBoundingClientRect().left) / 2,
      fontSize: parseFloat(getComputedStyle(span).fontSize),
    };
  });

  console.log(`\n=== ${width}px — heading at ${geom.fontSize}px ===`);
  console.log("  extra lift  lockupCap  typedCap   dCapH   dCapTop   dBase  dMidline");

  for (const lift of NUDGES) {
    await page.evaluate((em) => {
      const span = [...document.querySelectorAll("h1 span")].find((s) =>
        /GCC ATLAS/.test(s.textContent),
      );
      // Additive: the shipped lift is a class, so this is a second offset on top of it.
      span.style.marginBlockStart = em ? `-${em}em` : "";
    }, lift);

    const PAD = 12;
    const shot = await page.screenshot({
      clip: {
        x: geom.box.x - PAD,
        y: geom.box.y - PAD,
        width: geom.box.w + PAD * 2,
        height: geom.box.h + PAD * 2,
      },
    });

    const ink = await page.evaluate(
      async ({ b64, scale, splitPx }) => {
        const image = new Image();
        image.src = `data:image/png;base64,${b64}`;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(image, 0, 0);
        const d = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

        // Per-column ink extents. White only: the lockup's mark is orange.
        const cols = new Array(canvas.width).fill(null);
        for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            const i = (y * canvas.width + x) * 4;
            const [r, g, b] = [d[i], d[i + 1], d[i + 2]];
            if ((r + g + b) / 3 < 150) continue;
            if (Math.abs(r - b) > 45 || Math.abs(g - b) > 45) continue;
            if (!cols[x]) cols[x] = { top: y, bottom: y };
            else cols[x].bottom = y;
          }
        }

        // Column groups, split on empty columns: one per letter, plus the ®.
        const groups = [];
        let cur = null;
        for (let x = 0; x < canvas.width; x++) {
          if (cols[x]) {
            cur ??= { x0: x, x1: x, top: cols[x].top, bottom: cols[x].bottom };
            cur.x1 = x;
            cur.top = Math.min(cur.top, cols[x].top);
            cur.bottom = Math.max(cur.bottom, cols[x].bottom);
          } else if (cur) {
            groups.push(cur);
            cur = null;
          }
        }
        if (cur) groups.push(cur);

        const capBand = (gs) => {
          const tallest = Math.max(...gs.map((g) => g.bottom - g.top));
          // Drops the registered symbol and any antialiasing speck.
          const letters = gs.filter((g) => g.bottom - g.top > tallest * 0.6);
          // Flat letters set the cap band; round ones overshoot at both ends.
          return {
            top: Math.max(...letters.map((g) => g.top)) / scale,
            bottom: (Math.min(...letters.map((g) => g.bottom)) + 1) / scale,
          };
        };
        return {
          lockup: capBand(groups.filter((g) => g.x1 < splitPx)),
          typed: capBand(groups.filter((g) => g.x0 >= splitPx)),
        };
      },
      {
        b64: shot.toString("base64"),
        scale: SCALE,
        splitPx: (geom.split - (geom.box.x - PAD)) * SCALE,
      },
    );

    const wm = ink.lockup.bottom - ink.lockup.top;
    const typed = ink.typed.bottom - ink.typed.top;
    const mid = (b) => (b.top + b.bottom) / 2;
    const f = (v) => v.toFixed(2).padStart(7);
    console.log(
      `  -${lift.toFixed(3)}em  ${f(wm)}   ${f(typed)}  ${f(typed - wm)}  ` +
        `${f(ink.typed.top - ink.lockup.top)} ${f(ink.typed.bottom - ink.lockup.bottom)} ` +
        `${f(mid(ink.typed) - mid(ink.lockup))}`,
    );
  }
  await page.close();
}

await browser.close();
