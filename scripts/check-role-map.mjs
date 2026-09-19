/**
 * The role map's collision instrument. `npm run rolemap:check`.
 *
 * **It exists because the obvious way to check this chart is wrong, and was wrong for two
 * passes.** Measuring label BOXES against each other reports a collision wherever two marks
 * are merely within each other's empty leading — a 12px label is about 1.0em of ink inside a
 * 1.2em content area — and a dot's bounding box overlaps a neighbour's long before the two
 * circles do. Measured that way, the field appeared to need a band a third taller than the
 * source slide's, which is what made the placement read wrong: `lane` is a percentage, so a
 * taller canvas stretches every vertical interval and nothing else.
 *
 * So this reads real geometry — circle against circle, circle against ink box, ink box
 * against ink box — and it is the only thing any band height, dot ramp, label size or lane
 * on this chart may be accepted against.
 *
 * **IT ASKS TWO QUESTIONS AND THE SECOND ONE IS NOT DERIVABLE FROM THE FIRST.** `collisions`
 * is overlap. `bindings` is association — whether each label's own dot is the NEAREST dot to
 * it — and a field can pass the first while failing the second on a third of its labels,
 * which is exactly what shipped: zero collisions at both widths while eleven of thirty-six
 * names sat closer to somebody else's bubble than to their own. A placement is accepted on
 * BOTH counts. Two modes:
 *
 *   node scripts/check-role-map.mjs check              measure at 1440 and 1280, screenshot
 *   node scripts/check-role-map.mjs sweep 27.5 28 29   try candidate canvas heights
 *
 * `LANES` and `SIDES` are JSON env overrides keyed by the visible role name, for trying a
 * candidate placement without writing it to the dataset first:
 *
 *   LANES='{"Data Architect":20}' SIDES='{"Data Annotator":"lead"}' node … sweep 27.5
 *
 * **It needs a dev server on 3123 and it reads `/` as a visitor would.** Start one on its own
 * dist dir — `GCC_DIST_DIR=.next-rolemap npx next dev -p 3123` — and revert `tsconfig.json`
 * afterwards, because `next dev` rewrites its `include`. `reducedMotion: "reduce"` is not
 * optional: without it the entrance keyframes leave a band washed out in the screenshots.
 */
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3123";
const ctxOpts = { reducedMotion: "reduce", deviceScaleFactor: 2 };

async function toPeers(page) {
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.getByLabel("Industry").click();
  const panel = page.locator(".gcc-select-panel");
  const filter = page.getByLabel(/^Filter/);
  if (await filter.count()) await filter.fill("Retail");
  await page.getByRole("treeitem", { name: "Retail", exact: true }).first().click();
  if (await panel.isVisible()) {
    await page.getByRole("treeitem", { name: "All of Retail" }).first().click();
  }
  await page.getByLabel("Annual revenue").click();
  await page.getByRole("option", { name: "Above 20 Bn", exact: true }).first().click();
  await page.getByLabel("Headquarters").click();
  const f2 = page.getByLabel(/^Filter/);
  if (await f2.count()) await f2.fill("USA");
  await page.getByRole("option", { name: "USA", exact: true }).first().click();
  await page.getByRole("button", { name: "Build my GCC Landscape" }).click();
  await page.locator("#roles").waitFor({ state: "visible", timeout: 30000 });
}

/**
 * Read every mark as real geometry: a dot is a CIRCLE and a label is its INK box.
 *
 * A label's line box is 1.2em of content area around about 1.0em of ink, so measuring
 * box-to-box reports a collision wherever two marks are within the empty leading — which
 * is how the first sweep concluded this field needs a band a third taller than the slide's.
 */
const read = () =>
  [...document.querySelectorAll(".gcc-role-map")].map((field) => {
    const fr = field.getBoundingClientRect();
    return {
      field: { x: fr.x, y: fr.y, w: fr.width, h: fr.height },
      items: [...field.querySelectorAll(".gcc-role-map__item")].map((el) => {
        const span = el.lastElementChild;
        const d = el.querySelector(".gcc-role-map__dot").getBoundingClientRect();
        const l = span.getBoundingClientRect();
        const em = parseFloat(getComputedStyle(span).fontSize);
        const ink = l.height - 0.2 * em; // 1.2em content area per line, ~1.0em of ink
        return {
          name: el.textContent.split(" \u2014 ")[0],
          step: el.dataset.roleStep,
          circle: { cx: d.x + d.width / 2, cy: d.y + d.height / 2, r: d.width / 2 },
          box: { x: l.x, y: l.y + (l.height - ink) / 2, w: l.width, h: ink },
          rawBox: { x: l.x, y: l.y, w: l.width, h: l.height },
        };
      }),
    };
  });

/** Shortest distance from a circle's EDGE to a box. Negative means the two overlap. */
function edgeToBox(c, b) {
  const nx = Math.max(b.x, Math.min(c.cx, b.x + b.w));
  const ny = Math.max(b.y, Math.min(c.cy, b.y + b.h));
  return Math.hypot(c.cx - nx, c.cy - ny) - c.r;
}

/**
 * Every label's distance to its OWN dot against its distance to the nearest foreign one.
 *
 * **WHICH DOT DOES THIS LABEL BELONG TO is the question `collisions` does not ask, and a
 * field can pass that one while failing this on a third of its labels.** At the 8px gap this
 * chart shipped with, eleven of the thirty-six labels had a foreign dot nearer to their ink
 * than their own dot — "Data Architect" at 1.4px against its own 8, so the name read as
 * belonging to "AI / ML Engineer" — and the collision count was zero at both widths
 * throughout. Binding is by proximity, so that is the whole of what read as clutter.
 *
 * The test is NOT directional, and that is deliberate: the competitor is usually diagonal
 * rather than on the label's own line, so restricting it to dots sharing the line would have
 * missed every case above.
 */
function bindingRows(data) {
  return data.flatMap((f, bi) =>
    f.items.map((it) => {
      const own = edgeToBox(it.circle, it.box);
      const [near] = f.items
        .filter((o) => o !== it)
        .map((o) => ({ name: o.name, d: edgeToBox(o.circle, it.box) }))
        .sort((a, b) => a.d - b.d);
      return { band: `field${bi}`, name: it.name, own, near, margin: near ? near.d - own : Infinity };
    })
  );
}

/**
 * The FAILURES: a label whose own dot is not the nearest dot to it.
 *
 * **`margin` is 0, which is the correctness bound, and it stays 0 rather than carrying a
 * comfort threshold — because eight labels ship at about a pixel of headroom and there is no
 * move available that widens them.** Their competitors are all off the label's own line, so
 * the alignment does the binding a distance cannot; buying real margin means deviating
 * further from the slide's own lanes on eight roles. A check that must be ignored after every
 * legitimate change has stopped being a check, which is `data:verify`'s own rule, so the
 * headroom is REPORTED by `bindingHeadroom` and asserted by nothing.
 */
function bindings(data, margin = 0) {
  return bindingRows(data)
    .filter((r) => r.margin < margin || r.near === undefined || r.near.d < r.own)
    .sort((a, b) => a.margin - b.margin)
    .map(
      (r) =>
        `${r.band} BOUND-WRONG "${r.name}" own=${r.own.toFixed(1)} but ${r.near.name}'s dot is ${r.near.d.toFixed(1)}`
    );
}

/** How much room the tightest bindings have, so a candidate can be judged rather than passed. */
function bindingHeadroom(data, show = 3) {
  const rows = bindingRows(data).sort((a, b) => a.margin - b.margin);
  return `tightest ${rows
    .slice(0, show)
    .map((r) => `${r.name} +${r.margin.toFixed(1)}`)
    .join(", ")}`;
}

function collisions(data, margin = 1) {
  const out = [];
  const boxHit = (a, b) => {
    const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    return ox > -margin && oy > -margin ? [ox, oy] : null;
  };
  const circleBoxHit = (c, b) => {
    const nx = Math.max(b.x, Math.min(c.cx, b.x + b.w));
    const ny = Math.max(b.y, Math.min(c.cy, b.y + b.h));
    const d = Math.hypot(c.cx - nx, c.cy - ny);
    return d < c.r + margin ? [c.r + margin - d] : null;
  };
  for (const [bi, f] of data.entries()) {
    const band = `field${bi}`;
    for (const it of f.items) {
      if (it.circle.cy - it.circle.r < f.field.y - 0.5)
        out.push(`OUT-TOP ${band} ${it.name} ${(f.field.y - it.circle.cy + it.circle.r).toFixed(1)}`);
      if (it.circle.cy + it.circle.r > f.field.y + f.field.h + 0.5)
        out.push(`OUT-BOT ${band} ${it.name} ${(it.circle.cy + it.circle.r - f.field.y - f.field.h).toFixed(1)}`);
      if (it.rawBox.x < f.field.x - 0.5)
        out.push(`OUT-LEAD ${band} ${it.name} ${(f.field.x - it.rawBox.x).toFixed(1)}`);
      if (it.rawBox.x + it.rawBox.w > f.field.x + f.field.w + 0.5)
        out.push(`OUT-TRAIL ${band} ${it.name} ${(it.rawBox.x + it.rawBox.w - f.field.x - f.field.w).toFixed(1)}`);
    }
    for (let i = 0; i < f.items.length; i++)
      for (let j = i + 1; j < f.items.length; j++) {
        const a = f.items[i], b = f.items[j];
        const dd = Math.hypot(a.circle.cx - b.circle.cx, a.circle.cy - b.circle.cy);
        if (dd < a.circle.r + b.circle.r + margin)
          out.push(`${band} DOT/DOT ${a.name} x ${b.name} gap=${(dd - a.circle.r - b.circle.r).toFixed(1)}`);
        const ll = boxHit(a.box, b.box);
        if (ll) out.push(`${band} LBL/LBL ${a.name} x ${b.name} ${ll[0].toFixed(1)}x${ll[1].toFixed(1)}`);
        const ad = circleBoxHit(a.circle, b.box);
        if (ad) out.push(`${band} DOT/LBL ${a.name}.dot x ${b.name}.label by ${ad[0].toFixed(1)}`);
        const bd = circleBoxHit(b.circle, a.box);
        if (bd) out.push(`${band} DOT/LBL ${b.name}.dot x ${a.name}.label by ${bd[0].toFixed(1)}`);
      }
  }
  return out;
}

const overrides = {
  lanes: JSON.parse(process.env.LANES ?? "{}"),
  sides: JSON.parse(process.env.SIDES ?? "{}"),
};
const applyLanes = ({ lanes, sides }) => {
  for (const el of document.querySelectorAll(".gcc-role-map__item")) {
    const name = el.textContent.split(" \u2014 ")[0].trim();
    if (lanes[name] !== undefined) el.style.setProperty("--gcc-lane", `${lanes[name]}%`);
    if (sides[name] !== undefined) el.dataset.side = sides[name];
  }
};

const browser = await chromium.launch();
const mode = process.argv[2] ?? "check";

if (mode === "sweep") {
  const page = await browser.newPage({ ...ctxOpts, viewport: { width: 1440, height: 1000 } });
  await toPeers(page);
  for (const rem of process.argv.slice(3).map(Number)) {
    await page.addStyleTag({
      content: `@media (min-width: 80rem) { .gcc-role-map { --gcc-role-field: ${rem}rem !important; } }`,
    });
    await page.evaluate(applyLanes, overrides);
    await page.waitForTimeout(120);
    const data = await page.evaluate(read);
    const c = collisions(data);
    const b = bindings(data);
    console.log(`${rem}rem band=${data[0].field.h.toFixed(0)} aspect=${(data[0].field.h / data[0].field.w).toFixed(4)} collisions=${c.length} binding=${b.length} ${bindingHeadroom(data, 1)}`);
    for (const line of [...c, ...b]) console.log("   ", line);
  }
  await page.close();
} else {
  for (const width of [1440, 1280]) {
    const page = await browser.newPage({ ...ctxOpts, viewport: { width, height: 1000 } });
    await toPeers(page);
    const data = await page.evaluate(read);
    console.log(`\n=== ${width} plot=${data[0].field.w.toFixed(0)} band=${data[0].field.h.toFixed(0)} aspect=${(data[0].field.h / data[0].field.w).toFixed(4)}`);
    const sizes = new Map();
    for (const f of data) for (const it of f.items) sizes.set(it.step, it.circle.r * 2);
    console.log("dots:", [...sizes.entries()].sort().map(([k, v]) => `${k}=${v.toFixed(1)}`).join(" "));
    const c = collisions(data);
    console.log(`collisions=${c.length}`);
    for (const line of c) console.log("   ", line);
    /* The SECOND question, and the one that shipped wrong: is every label nearest its own
       dot. See `bindings` for why a clean collision count says nothing about this. */
    const b = bindings(data);
    console.log(`binding=${b.length}  ${bindingHeadroom(data)}`);
    for (const line of b) console.log("   ", line);
    await page.locator("#roles").screenshot({ path: `/tmp/rolemap-${width}.png` });
    await page.close();
  }
  for (const width of [390, 768]) {
    const page = await browser.newPage({ ...ctxOpts, viewport: { width, height: 1400 } });
    await toPeers(page);
    await page.locator("#roles").screenshot({ path: `/tmp/rolemap-${width}.png` });
    await page.close();
  }
}
await browser.close();
