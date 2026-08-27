#!/usr/bin/env node
/**
 * Figma brand extractor.
 *
 * Pulls everything reusable out of a Figma file and lands it in `brand/`:
 *   - published colour / text / effect / grid styles, resolved to real values
 *   - the component + component-set inventory (names, descriptions, sizes)
 *   - every top-level frame exported as an image (infographics, diagrams, boards)
 *   - a raw JSON dump so later passes never need to re-hit the API
 *
 * Usage:
 *   FIGMA_TOKEN=figd_xxx node scripts/figma-extract.mjs
 *   FIGMA_TOKEN=figd_xxx node scripts/figma-extract.mjs --file <fileKey> --format svg
 *
 * Token: Figma > account settings > Personal access tokens.
 * Needs the `file_content:read` and `file_dev_resources:read` scopes (or a legacy
 * full-access token). Read-only — this script never writes to Figma.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'brand');
const RAW = join(OUT, 'raw');
const ASSETS = join(OUT, 'assets');

const DEFAULT_FILE_KEY = 'RYlYELXmAHb0whFs20E8Ne';
const API = 'https://api.figma.com/v1';

// ---------------------------------------------------------------- args + auth

function parseArgs(argv) {
  const args = { file: DEFAULT_FILE_KEY, format: 'png', scale: '2' };
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (key === '--file' || key === '--format' || key === '--scale') {
      args[key.slice(2)] = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const TOKEN = process.env.FIGMA_TOKEN || process.env.FIGMA_PERSONAL_ACCESS_TOKEN;

if (!TOKEN) {
  console.error(
    'Missing FIGMA_TOKEN.\n' +
      '  1. Figma > account settings > Personal access tokens > create a read-only token\n' +
      '  2. FIGMA_TOKEN=figd_xxx node scripts/figma-extract.mjs'
  );
  process.exit(1);
}

// -------------------------------------------------------------------- fetching

async function api(path) {
  const res = await fetch(`${API}${path}`, {
    headers: { 'X-Figma-Token': TOKEN },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`GET ${path} -> ${res.status} ${res.statusText}\n${body.slice(0, 500)}`);
  }
  return res.json();
}

/** Figma caps ids-per-request; chunk to stay well under the URL limit. */
function chunk(list, size) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

// ------------------------------------------------------------- value decoding

const clamp01 = (n) => Math.min(1, Math.max(0, n));

function toHex({ r, g, b }) {
  const part = (n) =>
    Math.round(clamp01(n) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${part(r)}${part(g)}${part(b)}`.toUpperCase();
}

function describePaint(paint) {
  if (!paint) return null;
  const base = { type: paint.type, visible: paint.visible !== false };
  if (paint.opacity != null) base.opacity = round(paint.opacity, 3);

  if (paint.type === 'SOLID') {
    return { ...base, hex: toHex(paint.color), alpha: round(paint.color.a ?? 1, 3) };
  }
  if (paint.type?.startsWith('GRADIENT')) {
    return {
      ...base,
      stops: (paint.gradientStops || []).map((s) => ({
        position: round(s.position, 4),
        hex: toHex(s.color),
        alpha: round(s.color.a ?? 1, 3),
      })),
      handles: paint.gradientHandlePositions,
    };
  }
  if (paint.type === 'IMAGE') {
    return { ...base, scaleMode: paint.scaleMode, imageRef: paint.imageRef };
  }
  return base;
}

function round(n, places = 2) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return n;
  const f = 10 ** places;
  return Math.round(n * f) / f;
}

function describeTypeStyle(style) {
  if (!style) return null;
  return {
    fontFamily: style.fontFamily,
    fontPostScriptName: style.fontPostScriptName,
    fontWeight: style.fontWeight,
    fontSize: round(style.fontSize),
    lineHeight:
      style.lineHeightUnit === 'AUTO'
        ? 'auto'
        : style.lineHeightPx != null
          ? `${round(style.lineHeightPx)}px`
          : style.lineHeightPercentFontSize != null
            ? `${round(style.lineHeightPercentFontSize)}%`
            : undefined,
    letterSpacing: round(style.letterSpacing, 3),
    textCase: style.textCase,
    textDecoration: style.textDecoration,
    textAlignHorizontal: style.textAlignHorizontal,
    paragraphSpacing: round(style.paragraphSpacing),
    italic: style.italic || undefined,
  };
}

function describeEffect(effect) {
  if (!effect) return null;
  return {
    type: effect.type,
    visible: effect.visible !== false,
    color: effect.color ? toHex(effect.color) : undefined,
    alpha: effect.color ? round(effect.color.a ?? 1, 3) : undefined,
    offset: effect.offset ? { x: round(effect.offset.x), y: round(effect.offset.y) } : undefined,
    radius: round(effect.radius),
    spread: round(effect.spread),
  };
}

// --------------------------------------------------------------- tree walking

function* walk(node, path = []) {
  if (!node) return;
  yield { node, path };
  for (const child of node.children || []) {
    yield* walk(child, [...path, node.name]);
  }
}

/** Rough "is this an infographic / illustration worth exporting" heuristic. */
const EXPORT_HINT = /(infographic|graphic|diagram|chart|illustration|hero|banner|map|framework|matrix|journey|funnel|timeline|visual|slide|board|cover|screenshot)/i;

// ------------------------------------------------------------------ collectors

function collectStyleUsage(document) {
  const colors = new Map(); // hex -> { count, samples:Set<name> }
  const fonts = new Map(); // "Family|weight|size" -> { count, ...spec }
  const radii = new Map(); // value -> count
  const spacings = new Map(); // value -> count (auto-layout gaps + padding)
  const shadows = new Map(); // key -> { count, effect }

  const bump = (map, key, seed) => {
    const hit = map.get(key) || { count: 0, ...seed };
    hit.count += 1;
    map.set(key, hit);
    return hit;
  };

  for (const { node } of walk(document)) {
    for (const paint of node.fills || []) {
      if (paint.visible === false || paint.type !== 'SOLID') continue;
      const hex = toHex(paint.color);
      const hit = bump(colors, hex, { fillCount: 0, strokeCount: 0, textCount: 0, samples: [] });
      if (node.type === 'TEXT') hit.textCount += 1;
      else hit.fillCount += 1;
      if (hit.samples.length < 8 && node.name) hit.samples.push(node.name);
    }
    for (const paint of node.strokes || []) {
      if (paint.visible === false || paint.type !== 'SOLID') continue;
      const hex = toHex(paint.color);
      const hit = bump(colors, hex, { fillCount: 0, strokeCount: 0, textCount: 0, samples: [] });
      hit.strokeCount += 1;
    }
    if (node.type === 'TEXT' && node.style?.fontFamily) {
      const s = node.style;
      const key = `${s.fontFamily}|${s.fontWeight}|${round(s.fontSize)}`;
      const hit = bump(fonts, key, { spec: describeTypeStyle(s), samples: [] });
      if (hit.samples.length < 6 && node.name) hit.samples.push(node.name.slice(0, 60));
    }
    if (typeof node.cornerRadius === 'number' && node.cornerRadius > 0) {
      bump(radii, round(node.cornerRadius), {});
    }
    for (const key of ['itemSpacing', 'paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom']) {
      const v = node[key];
      if (typeof v === 'number' && v > 0) bump(spacings, round(v), {});
    }
    for (const effect of node.effects || []) {
      if (effect.visible === false) continue;
      if (effect.type !== 'DROP_SHADOW' && effect.type !== 'INNER_SHADOW') continue;
      const d = describeEffect(effect);
      bump(shadows, JSON.stringify(d), { effect: d });
    }
  }

  const byCount = (a, b) => b[1].count - a[1].count;
  return {
    colors: [...colors.entries()]
      .sort(byCount)
      .map(([hex, v]) => ({ hex, ...v })),
    typeStyles: [...fonts.entries()]
      .sort(byCount)
      .map(([key, v]) => ({ key, count: v.count, ...v.spec, samples: v.samples })),
    cornerRadii: [...radii.entries()].sort((a, b) => a[0] - b[0]).map(([value, v]) => ({ value, count: v.count })),
    spacingValues: [...spacings.entries()].sort((a, b) => a[0] - b[0]).map(([value, v]) => ({ value, count: v.count })),
    shadows: [...shadows.values()].sort((a, b) => b.count - a.count).map((v) => ({ count: v.count, ...v.effect })),
  };
}

function collectStructure(document) {
  const pages = [];
  const components = [];
  const componentSets = [];
  const exportables = [];
  const textContent = [];

  for (const page of document.children || []) {
    const frames = [];
    for (const { node } of walk(page)) {
      if (node.type === 'COMPONENT') {
        components.push({
          id: node.id,
          name: node.name,
          page: page.name,
          size: node.absoluteBoundingBox
            ? { w: round(node.absoluteBoundingBox.width), h: round(node.absoluteBoundingBox.height) }
            : undefined,
        });
      }
      if (node.type === 'COMPONENT_SET') {
        componentSets.push({
          id: node.id,
          name: node.name,
          page: page.name,
          variants: (node.children || []).map((c) => c.name),
        });
      }
      if (node.type === 'TEXT' && node.characters?.trim()) {
        textContent.push({ page: page.name, name: node.name, text: node.characters.trim().slice(0, 400) });
      }
    }
    for (const child of page.children || []) {
      const box = child.absoluteBoundingBox;
      const entry = {
        id: child.id,
        name: child.name,
        type: child.type,
        page: page.name,
        size: box ? { w: round(box.width), h: round(box.height) } : undefined,
      };
      frames.push(entry);
      const big = box && box.width >= 200 && box.height >= 120;
      const visual = ['FRAME', 'GROUP', 'COMPONENT', 'COMPONENT_SET', 'INSTANCE', 'SECTION', 'RECTANGLE', 'VECTOR'].includes(
        child.type
      );
      if (visual && (big || EXPORT_HINT.test(child.name))) {
        exportables.push({ ...entry, hinted: EXPORT_HINT.test(child.name) });
      }
    }
    pages.push({ id: page.id, name: page.name, topLevelNodes: frames });
  }

  return { pages, components, componentSets, exportables, textContent };
}

// ------------------------------------------------------------------- reporting

function mdTable(headers, rows) {
  const head = `| ${headers.join(' | ')} |`;
  const sep = `| ${headers.map(() => '---').join(' | ')} |`;
  const body = rows.map((r) => `| ${r.join(' | ')} |`).join('\n');
  return [head, sep, body].filter(Boolean).join('\n');
}

function buildReport({ file, fileKey, usage, structure, publishedStyles, exported }) {
  const lines = [];
  const p = (s = '') => lines.push(s);

  p('# Figma brand extract');
  p();
  p(`Source: [${file.name}](https://www.figma.com/design/${fileKey}/) — Figma \`${fileKey}\``);
  p(`Last modified in Figma: ${file.lastModified}`);
  p(`Extracted: ${new Date().toISOString()}`);
  p();
  p('Generated by `scripts/figma-extract.mjs`. Re-run that script rather than editing this file.');
  p();

  p('## Pages');
  p();
  p(mdTable(['Page', 'Top-level nodes'], structure.pages.map((pg) => [pg.name, String(pg.topLevelNodes.length)])));
  p();

  if (publishedStyles.color.length) {
    p('## Published colour styles');
    p();
    p(
      mdTable(
        ['Style', 'Value', 'Description'],
        publishedStyles.color.map((s) => [
          s.name,
          s.value?.hex ? `\`${s.value.hex}\`${s.value.alpha < 1 ? ` @ ${s.value.alpha}` : ''}` : s.value?.type || '—',
          s.description || '',
        ])
      )
    );
    p();
  }

  if (publishedStyles.text.length) {
    p('## Published text styles');
    p();
    p(
      mdTable(
        ['Style', 'Font', 'Size', 'Weight', 'Line height', 'Tracking'],
        publishedStyles.text.map((s) => [
          s.name,
          s.value?.fontFamily || '—',
          s.value?.fontSize ?? '—',
          s.value?.fontWeight ?? '—',
          s.value?.lineHeight ?? '—',
          s.value?.letterSpacing ?? '—',
        ])
      )
    );
    p();
  }

  p('## Colours actually used (by frequency)');
  p();
  p('Frequency is a proxy for role: the top few are usually surface, ink and brand.');
  p();
  p(
    mdTable(
      ['Hex', 'Uses', 'As fill', 'As text', 'As stroke', 'Seen on'],
      usage.colors
        .slice(0, 40)
        .map((c) => [
          `\`${c.hex}\``,
          String(c.count),
          String(c.fillCount),
          String(c.textCount),
          String(c.strokeCount),
          (c.samples || []).slice(0, 3).join(', '),
        ])
    )
  );
  p();

  p('## Type styles actually used (by frequency)');
  p();
  p(
    mdTable(
      ['Font', 'Weight', 'Size', 'Line height', 'Tracking', 'Uses'],
      usage.typeStyles
        .slice(0, 30)
        .map((t) => [
          t.fontFamily || '—',
          String(t.fontWeight ?? '—'),
          String(t.fontSize ?? '—'),
          String(t.lineHeight ?? '—'),
          String(t.letterSpacing ?? '—'),
          String(t.count),
        ])
    )
  );
  p();

  p('## Spacing values in use');
  p();
  p(usage.spacingValues.map((s) => `\`${s.value}\` (${s.count})`).join(' · ') || '_none_');
  p();
  p('## Corner radii in use');
  p();
  p(usage.cornerRadii.map((r) => `\`${r.value}\` (${r.count})`).join(' · ') || '_none_');
  p();

  if (usage.shadows.length) {
    p('## Shadows in use');
    p();
    p(
      mdTable(
        ['Type', 'Colour', 'Alpha', 'Offset', 'Blur', 'Spread', 'Uses'],
        usage.shadows.slice(0, 15).map((s) => [
          s.type,
          s.color || '—',
          String(s.alpha ?? '—'),
          s.offset ? `${s.offset.x}, ${s.offset.y}` : '—',
          String(s.radius ?? '—'),
          String(s.spread ?? 0),
          String(s.count),
        ])
      )
    );
    p();
  }

  if (structure.componentSets.length) {
    p('## Component sets (variants)');
    p();
    p(
      mdTable(
        ['Set', 'Page', 'Variants'],
        structure.componentSets.map((s) => [s.name, s.page, s.variants.join(' · ')])
      )
    );
    p();
  }

  if (structure.components.length) {
    p('## Components');
    p();
    p(
      mdTable(
        ['Component', 'Page', 'Size'],
        structure.components.map((c) => [c.name, c.page, c.size ? `${c.size.w}×${c.size.h}` : '—'])
      )
    );
    p();
  }

  if (exported.length) {
    p('## Exported visuals');
    p();
    p('Images live in `brand/assets/`. Reference these when a layout needs an existing infographic.');
    p();
    p(
      mdTable(
        ['File', 'Source node', 'Page', 'Size'],
        exported.map((e) => [
          `[${e.file}](./assets/${e.file})`,
          e.name,
          e.page,
          e.size ? `${e.size.w}×${e.size.h}` : '—',
        ])
      )
    );
    p();
  }

  p('## Raw data');
  p();
  p('- `brand/raw/file.json` — full Figma document tree');
  p('- `brand/raw/styles.json` — published styles, resolved to values');
  p('- `brand/raw/components.json` — component + component-set metadata');
  p('- `brand/raw/usage.json` — colour / type / spacing frequency tables');
  p('- `brand/raw/text.json` — every text string in the file (copy reference)');
  p();

  return lines.join('\n');
}

// ------------------------------------------------------------------------ main

function safeName(name, id) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `${slug || 'node'}-${id.replace(/[^a-zA-Z0-9]/g, '')}`;
}

async function resolvePublishedStyles(fileKey, fileStyles) {
  const entries = Object.entries(fileStyles || {});
  const grouped = { color: [], text: [], effect: [], grid: [] };
  if (!entries.length) return grouped;

  const ids = entries.map(([id]) => id);
  const nodeMap = {};
  for (const batch of chunk(ids, 40)) {
    const res = await api(`/files/${fileKey}/nodes?ids=${batch.map(encodeURIComponent).join(',')}`);
    Object.assign(nodeMap, res.nodes || {});
  }

  for (const [id, meta] of entries) {
    const doc = nodeMap[id]?.document;
    const record = { id, name: meta.name, description: meta.description || '', styleType: meta.styleType };
    if (meta.styleType === 'FILL') {
      record.value = describePaint((doc?.fills || [])[0]);
      grouped.color.push(record);
    } else if (meta.styleType === 'TEXT') {
      record.value = describeTypeStyle(doc?.style);
      grouped.text.push(record);
    } else if (meta.styleType === 'EFFECT') {
      record.value = (doc?.effects || []).map(describeEffect);
      grouped.effect.push(record);
    } else if (meta.styleType === 'GRID') {
      record.value = doc?.layoutGrids;
      grouped.grid.push(record);
    }
  }
  return grouped;
}

async function exportImages(fileKey, nodes, format, scale) {
  if (!nodes.length) return [];
  const exported = [];
  for (const batch of chunk(nodes, 15)) {
    const ids = batch.map((n) => n.id);
    const query = new URLSearchParams({ ids: ids.join(','), format });
    if (format === 'png' || format === 'jpg') query.set('scale', scale);
    let res;
    try {
      res = await api(`/images/${fileKey}?${query}`);
    } catch (err) {
      console.warn(`  ! export batch failed: ${err.message.split('\n')[0]}`);
      continue;
    }
    for (const node of batch) {
      const url = res.images?.[node.id];
      if (!url) {
        console.warn(`  ! no image URL for ${node.name}`);
        continue;
      }
      const bin = await fetch(url);
      if (!bin.ok) {
        console.warn(`  ! download failed for ${node.name} (${bin.status})`);
        continue;
      }
      const file = `${safeName(node.name, node.id)}.${format}`;
      await writeFile(join(ASSETS, file), Buffer.from(await bin.arrayBuffer()));
      exported.push({ ...node, file });
      console.log(`  + ${file}`);
    }
  }
  return exported;
}

async function main() {
  const fileKey = args.file;
  await mkdir(RAW, { recursive: true });
  await mkdir(ASSETS, { recursive: true });

  console.log(`Fetching Figma file ${fileKey} ...`);
  const file = await api(`/files/${fileKey}?geometry=paths`);
  await writeFile(join(RAW, 'file.json'), JSON.stringify(file, null, 2));
  console.log(`  "${file.name}" — ${file.document.children?.length || 0} page(s)`);

  const structure = collectStructure(file.document);
  const usage = collectStyleUsage(file.document);

  console.log('Resolving published styles ...');
  const publishedStyles = await resolvePublishedStyles(fileKey, file.styles);
  console.log(
    `  ${publishedStyles.color.length} colour, ${publishedStyles.text.length} text, ` +
      `${publishedStyles.effect.length} effect, ${publishedStyles.grid.length} grid`
  );

  let components = { meta: null };
  try {
    components = await api(`/files/${fileKey}/components`);
  } catch (err) {
    console.warn(`  ! /components unavailable (file may not be published): ${err.message.split('\n')[0]}`);
  }

  await writeFile(join(RAW, 'styles.json'), JSON.stringify(publishedStyles, null, 2));
  await writeFile(
    join(RAW, 'components.json'),
    JSON.stringify(
      { local: { components: structure.components, componentSets: structure.componentSets }, published: components.meta },
      null,
      2
    )
  );
  await writeFile(join(RAW, 'usage.json'), JSON.stringify(usage, null, 2));
  await writeFile(join(RAW, 'text.json'), JSON.stringify(structure.textContent, null, 2));
  await writeFile(join(RAW, 'structure.json'), JSON.stringify(structure.pages, null, 2));

  console.log(`Exporting ${structure.exportables.length} visual(s) as ${args.format} ...`);
  const exported = await exportImages(fileKey, structure.exportables, args.format, args.scale);

  const report = buildReport({ file, fileKey, usage, structure, publishedStyles, exported });
  await writeFile(join(OUT, 'figma-extract.md'), report);

  console.log('\nDone.');
  console.log(`  brand/figma-extract.md   report`);
  console.log(`  brand/assets/            ${exported.length} image(s)`);
  console.log(`  brand/raw/               raw JSON`);
}

main().catch((err) => {
  console.error(`\nFailed: ${err.message}`);
  if (String(err.message).includes('403')) {
    console.error(
      'A 403 usually means the token lacks access to this file, or the token scopes are too narrow.\n' +
        'Confirm the token belongs to an account that can open the file, with `file_content:read` scope.'
    );
  }
  process.exit(1);
});
