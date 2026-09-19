/**
 * `ROLE_TONES` is one number in three files, and this is what keeps them agreeing.
 *
 * The cap lives in `schema.ts`, the inks live in `assets/brand/tokens.css`, and the rule that
 * turns a `tone` into an ink lives in `src/app/globals.css`. Nothing but a comment used to
 * hold them together, and the failure mode is silent in the worst possible way: raise the cap
 * alone and the extra family resolves `--gcc-role-ink` to nothing, falls through to
 * `--ansr-accent`, and draws within a few RGB values of `--ansr-role-2` — so the legend
 * carries two identical swatches, the schema is happy, the diff reports an ordinary edit and
 * no test fails.
 *
 * It also holds the two properties the four added inks were CHOSEN by, because "measured once
 * when they were added" is not a guarantee: every ink must clear the 3:1 mark floor on the
 * darker wash, except the three of the slide's own that ANSR instructed us to ship below it,
 * and no pair may be closer in Oklab than the tightest pair the slide itself contains.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { roleFamilySchema, ROLE_TONES } from "@/data/schema";

const tokens = readFileSync("assets/brand/tokens.css", "utf8");
const globals = readFileSync("src/app/globals.css", "utf8");

/** Every `--ansr-role-N: #hex` declaration, by slot. */
function roleInks(): Map<number, string> {
  const inks = new Map<number, string>();
  const pattern = /--ansr-role-(\d+):\s*(#[0-9A-Fa-f]{6})/g;
  for (const match of tokens.matchAll(pattern)) {
    inks.set(Number(match[1]), match[2]!.toUpperCase());
  }
  return inks;
}

/* ---- colour maths, so the two bars are re-checked rather than trusted ---- */

const channels = (hex: string): [number, number, number] => [
  Number.parseInt(hex.slice(1, 3), 16) / 255,
  Number.parseInt(hex.slice(3, 5), 16) / 255,
  Number.parseInt(hex.slice(5, 7), 16) / 255,
];
const toLinear = (c: number) =>
  c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;

function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map(toLinear) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [
    number,
    number,
  ];
  return (light + 0.05) / (dark + 0.05);
}

function oklab(hex: string): [number, number, number] {
  const [r, g, b] = channels(hex).map(toLinear) as [number, number, number];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function perceptualDistance(a: string, b: string): number {
  const [p, q] = [oklab(a), oklab(b)];
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}

/**
 * The darker of the two band fills, which is the ground every ratio here is measured on.
 *
 * Resolved from the token chain rather than pasted: `--ansr-surface-tint` is
 * `--ansr-teal-100`, and a hex written here would be a fourth place a colour is named.
 */
function surfaceTint(): string {
  const alias = /--ansr-surface-tint:\s*var\((--[\w-]+)\)/.exec(tokens);
  expect(alias, "--ansr-surface-tint should alias a token").not.toBeNull();
  const target = new RegExp(`${alias![1]}:\\s*(#[0-9A-Fa-f]{6})`).exec(tokens);
  expect(target, `${alias![1]} should resolve to a hex`).not.toBeNull();
  return target![1]!.toUpperCase();
}

/**
 * The three inks ANSR instructed us to ship under the mark floor.
 *
 * Listed by SLOT and asserted to still be under it, so this is not a way to quietly excuse a
 * fourth: an ink that gets darkened out of the exception fails here and has to be taken off
 * the list deliberately. The reasoning is in the `--ansr-role-*` block in `tokens.css` and on
 * the blocked list in `handoff.md`.
 */
const INSTRUCTED_BELOW_FLOOR = [3, 5, 6];

describe("the role map's categorical inks", () => {
  it("defines exactly ROLE_TONES of them", () => {
    const inks = roleInks();
    expect(inks.size).toBe(ROLE_TONES);
    /* Contiguous from 1, because `tone` is an index and `freeTone` walks it. */
    for (let tone = 1; tone <= ROLE_TONES; tone += 1) {
      expect(inks.has(tone), `--ansr-role-${tone} should be defined`).toBe(true);
    }
  });

  it("carries a [data-tone] rule for every one of them, and none beyond", () => {
    const rules = new Set<number>();
    for (const match of globals.matchAll(
      /\[data-tone="(\d+)"\]\s*\{\s*--gcc-role-ink:\s*var\(--ansr-role-(\d+)\)/g,
    )) {
      expect(
        match[1],
        "a [data-tone] rule should point at its own ink",
      ).toBe(match[2]);
      rules.add(Number(match[1]));
    }
    expect(rules.size).toBe(ROLE_TONES);
    for (let tone = 1; tone <= ROLE_TONES; tone += 1) {
      expect(rules.has(tone), `[data-tone="${tone}"] should have a rule`).toBe(true);
    }
  });

  it("clears the 3:1 mark floor except where ANSR instructed otherwise", () => {
    const ground = surfaceTint();
    for (const [tone, hex] of roleInks()) {
      const ratio = contrast(hex, ground);
      if (INSTRUCTED_BELOW_FLOOR.includes(tone)) {
        /* Still an exception, so a silent darkening does not slip past as a fix. */
        expect(ratio, `--ansr-role-${tone} is a recorded exception`).toBeLessThan(3);
        continue;
      }
      expect(ratio, `--ansr-role-${tone} on ${ground}`).toBeGreaterThanOrEqual(3);
    }
  });

  it("keeps every pair at least as separable as the slide's own tightest", () => {
    const inks = [...roleInks().entries()];
    /* The bar comes from the slide's eight rather than from a number typed here, so it moves
       with the palette it was derived from. `teal`/`slate` at 0.079 is what it resolves to. */
    const slide = inks.filter(([tone]) => tone <= 8);
    let bar = Infinity;
    for (let i = 0; i < slide.length; i += 1) {
      for (let j = i + 1; j < slide.length; j += 1) {
        bar = Math.min(bar, perceptualDistance(slide[i]![1], slide[j]![1]));
      }
    }
    expect(bar).toBeGreaterThan(0);

    for (let i = 0; i < inks.length; i += 1) {
      for (let j = i + 1; j < inks.length; j += 1) {
        const [aTone, a] = inks[i]!;
        const [bTone, b] = inks[j]!;
        expect(
          perceptualDistance(a, b),
          `--ansr-role-${aTone} and --ansr-role-${bTone} are too close to tell apart`,
        ).toBeGreaterThanOrEqual(bar);
      }
    }
  });

  it("accepts a family on the highest tone and refuses one past it", () => {
    /* The cap is what an admin's picker is built from, so it has to be reachable. */
    const family = { id: "extra", name: "Extra", tone: ROLE_TONES };
    expect(roleFamilySchema.safeParse(family).success).toBe(true);
    expect(
      roleFamilySchema.safeParse({ ...family, tone: ROLE_TONES + 1 }).success,
    ).toBe(false);
  });
});
