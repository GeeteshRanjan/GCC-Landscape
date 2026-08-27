#!/usr/bin/env python3
"""
One-time curation of the raw Figma SVG dump into assets/brand/.

Why a script and not a rename: the raw export needed three corrections that a
rename cannot make.
  1. Colour drift - exports used a wider deck palette (mint #00B8A9, vermilion
     #F05A30, amber #F47F20) that Branding_Palette.docx does not sanction.
  2. Hard-coded width/height - pins each asset to its export size.
  3. Redundancy - 12 solid-colour rects, 2 exact duplicates, 6 scale variants of
     shapes that are already scalable, and a 40MB embedded raster.

KEEP = asset earns a file because it carries geometry we cannot cheaply restate.
DROP = asset is better expressed as a token, a CSS recipe, or an existing sibling.
"""
import json
import os
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from brand_asset import (op_normalize, op_recolor, drift_map, read, write,
                         get_viewbox, CORE)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "ANSR_Brand_UI_Components")
DEST = os.path.join(ROOT, "assets", "brand")

# The logo is the one thing used literally, so it gets its own handling:
# a real accessible name, brand orange, and a wordmark that adapts to its ground.
LOGOS = [
    ("ANSR_Logo.svg", "logo/ansr-mark.svg", "ANSR", None,
     "Sunburst mark, no wordmark. The radial pin burst every other motif derives from. "
     "Use where the wordmark is already present or space is square."),
    ("ANSR_NAMED_Logo.svg", "logo/ansr-logo.svg", "ANSR", "currentColor",
     "Mark plus wordmark. Default lockup. Wordmark inherits currentColor, so it is "
     "black on light grounds and follows text colour when inlined."),
    ("ANSR_NAMED_Logo.svg", "logo/ansr-logo-on-dark.svg", "ANSR", "#FFFFFF",
     "Same lockup with an explicitly white wordmark. Use on deep teal or black grounds, "
     "and anywhere the logo is loaded via <img> where currentColor cannot inherit."),
]

# (source, dest, role, note)
KEEP = [

    # ---- arcs: pin bell-curve ----
    ("Group (3).svg", "motif/pin-arc-teal.svg", "motif",
     "Pins arranged in a bell curve, teal gradient. Reads as growth/distribution. Section header or card corner."),
    ("Group (2).svg", "motif/pin-arc-orange.svg", "motif",
     "Same bell curve in orange. Orange is a highlight colour - one per view at most."),

    # ---- fields: dense pin columns with falloff ----
    ("Group (1).svg", "motif/pin-field-teal.svg", "motif",
     "Dense pin column field fading to nothing. Best as a full-bleed edge wash behind content."),
    ("Group 37.svg", "motif/pin-field-orange.svg", "motif",
     "Orange counterpart. Very loud at full opacity - fade to 0.15-0.3 before use."),
    ("Clip path group.svg", "motif/pin-circle.svg", "motif",
     "Pin field clipped to a circle. Works as an avatar backdrop or a stat medallion."),

    # ---- rows and cascades: horizontal pin runs ----
    ("Group 38.svg", "motif/pin-cascade.svg", "motif",
     "Staggered horizontal bars ascending left to right. Progress, ranking, or timeline."),
    ("Layer_1.svg", "motif/pin-rows-accent.svg", "motif",
     "Horizontal pin rows with a few highlighted. Good for 'N of M' emphasis."),
    ("Layer_1 (3).svg", "motif/pin-rows-interlock.svg", "motif",
     "Interlocking horizontal bars, tight and graphic. Wide banner or divider."),
    ("Layer_1 (4).svg", "motif/pin-staircase.svg", "motif",
     "Blocky ascending staircase. The most chart-like motif - avoid next to a real chart."),

    # ---- diagonals ----
    ("Layer_1 (1).svg", "motif/pin-diagonal.svg", "motif",
     "Diagonal pin streaks. Motion and direction. Fade it for a background texture."),

    # ---- fans and bursts ----
    ("Layer_1 (8).svg", "motif/pin-fan-wide.svg", "motif",
     "Wide fan sweeping from a left origin. Fills an awkward horizontal gap."),
    ("Vector (2).svg", "motif/pin-fan-corner-teal.svg", "motif",
     "Tight triangular corner fan. Anchors a layout corner without competing for attention."),
    ("Vector (1).svg", "motif/pin-fan-corner-orange.svg", "motif",
     "Orange corner fan. Reserve for the one moment a view needs heat."),
    ("Vector 2.svg", "motif/pin-burst.svg", "motif",
     "Full radial burst - the logo mark blown up to graphic scale. Strong hero centrepiece; never place near the actual logo, it competes."),

    # ---- concentric arcs (no pins, pure line rhythm) ----
    ("Layer_1 (6).svg", "motif/arc-dome.svg", "motif",
     "Concentric half-dome of thin arcs. Sits under a headline as a horizon."),
    ("Layer_1 (7).svg", "motif/arc-quarter.svg", "motif",
     "Concentric quarter-circle. Corner radial rhythm; near-invisible by design."),

    # ---- scatter ----
    ("Group 40.svg", "motif/pin-scatter.svg", "motif",
     "Loose scattered pin clusters across two hues. Busy - crop a region out of it rather than using whole."),

    # ---- textures: full-bleed backgrounds ----
    ("Wireframe - 45.svg", "texture/deep-teal-diagonal-portrait.svg", "texture",
     "Deep teal ground with low-contrast diagonal streaks. Portrait/mobile hero."),
    ("Wireframe - 63.svg", "texture/deep-teal-diagonal-wide.svg", "texture",
     "Same texture, 16:10. Desktop hero or full-viewport section."),
]

DROP = [
    ("Rectangle 1.svg",
     "40MB embedded raster behind a Gaussian blur. Ships a 40MB payload to draw a "
     "blurred rectangle. Replaced by the gradient recipe in tokens.css."),
    ("Wireframe - 55.svg",
     "Figma angular-gradient export - the fill lives in a <foreignObject> XHTML div "
     "using CSS conic-gradient, which no standalone SVG renderer honours. Replaced by "
     "--ansr-gradient-conic in tokens.css."),
    ("Group 36.svg",
     "Percentage labels baked into paths. Text as vector is untranslatable, "
     "unselectable and invisible to screen readers. Build stat callouts as HTML over "
     "a motif instead."),
    ("Group.svg",
     "Palette swatch board, not an asset. Its colours are reconciled into tokens.css."),
    ("Group 2 2.svg", "Byte-identical duplicate of Group 2.svg."),
    ("Group 4 2.svg", "Byte-identical duplicate of Group 4.svg."),
    ("Group 2.svg", "Eight evenly spaced flat rects. One CSS repeating-linear-gradient. See tokens.css."),
    ("Group 3.svg", "Same stripe field, different height. viewBox already scales."),
    ("Group 4.svg", "Same stripe field, different height."),
    ("Layer_1 (5).svg", "Flat mint stripe columns - stripe recipe plus a token."),
    ("Layer_1 (9).svg", "Flat mint stripe columns, shorter."),
    ("Group (4).svg", "Scale variant of pin-arc-orange. SVG is resolution independent."),
    ("Group (5).svg", "Scale variant of pin-arc-teal."),
    ("Group (6).svg", "Scale variant of pin-arc-teal."),
    ("Layer_1 (2).svg", "Lighter, wider pin-diagonal. Reproduce with `fade`, not a second file."),
    ("Vector.svg", "Single solid rect #FFEDDF - a colour, not a shape."),
] + [(f"Vector-{i}.svg", "Single solid rect - a colour, not a shape.") for i in range(1, 13)]


def main():
    if not os.path.isdir(SRC):
        sys.exit(f"source folder missing: {SRC}")

    dmap = drift_map()
    # The logo exports use #DD6236, a duller orange that appears nowhere in
    # Branding_Palette.docx. Treated as the same export drift seen everywhere
    # else and pulled to the sanctioned Orange Highlight.
    LOGO_ORANGE_DRIFT = {"#DD6236": CORE["orange"]}

    manifest = {
        "palette_source": "Branding_Palette.docx",
        "tokens": "assets/brand/tokens.css",
        "rule": "Never place an asset from this library unmodified. See .kiro/skills/ansr-brand-assets/SKILL.md",
        "assets": [],
        "dropped": [{"file": f, "reason": r} for f, r in DROP],
    }

    for src, dst, label, wordmark, note in LOGOS:
        sp = os.path.join(SRC, src)
        if not os.path.exists(sp):
            print(f"  ! missing {src}", file=sys.stderr)
            continue
        svg = read(sp)
        before = get_viewbox(svg)
        svg = op_normalize(svg, label=label)
        svg, _ = op_recolor(svg, LOGO_ORANGE_DRIFT)
        if wordmark:
            svg = svg.replace('fill="white"', f'fill="{wordmark}"')
        dp = os.path.join(DEST, dst)
        write(dp, svg)
        manifest["assets"].append({
            "id": os.path.splitext(os.path.basename(dst))[0],
            "path": f"assets/brand/{dst}",
            "role": "logo",
            "viewBox": " ".join(f"{v:g}" for v in before) if before else None,
            "aspect": round(before[2] / before[3], 3) if before else None,
            "origin": src,
            "note": note,
            "literal_use": True,
        })
        print(f"  {src:28s} -> {dst}")

    for src, dst, role, note in KEEP:
        sp = os.path.join(SRC, src)
        if not os.path.exists(sp):
            print(f"  ! missing {src}", file=sys.stderr)
            continue
        svg = read(sp)
        before = get_viewbox(svg)
        svg = op_normalize(svg)
        svg, unmapped = op_recolor(svg, dmap)
        dp = os.path.join(DEST, dst)
        write(dp, svg)
        entry = {
            "id": os.path.splitext(os.path.basename(dst))[0],
            "path": f"assets/brand/{dst}",
            "role": role,
            "viewBox": " ".join(f"{v:g}" for v in before) if before else None,
            "aspect": round(before[2] / before[3], 3) if before else None,
            "origin": src,
            "note": note,
        }
        if unmapped:
            entry["unmapped_colors"] = unmapped
        manifest["assets"].append(entry)
        print(f"  {src:28s} -> {dst}")

    write(os.path.join(DEST, "manifest.json"), json.dumps(manifest, indent=2) + "\n")
    print(f"\n{len(manifest['assets'])} kept, {len(DROP)} dropped")


if __name__ == "__main__":
    main()
