#!/usr/bin/env python3
"""
ANSR brand asset toolkit.

Every brand motif in assets/brand/ is a *starting point*, never a finished asset.
This tool is how you adapt one: recolor it to tokens, fade it back, crop it,
trim its whitespace, or make it inherit currentColor.

Usage
  brand_asset.py ramp                                  print generated token ramps
  brand_asset.py stat        <svg...>                  report size + colors used
  brand_asset.py preview     <svg...> [-o DIR]         render a labelled contact sheet
  brand_asset.py normalize   <svg> -o OUT              fluid sizing + a11y attrs
  brand_asset.py recolor     <svg> -o OUT [--map A=B,..|--to-tokens]
  brand_asset.py fade        <svg> -o OUT --opacity .3
  brand_asset.py crop        <svg> -o OUT --viewbox "x y w h"
  brand_asset.py trim        <svg> -o OUT [--pad 0]    auto-crop to ink bounds
  brand_asset.py currentcolor <svg> -o OUT --color "#005465"
  brand_asset.py flip        <svg> -o OUT [--axis x|y]

Ops compose: run one, feed the output into the next.
"""
import argparse
import os
import re
import shutil
import subprocess
import sys
import tempfile

# --------------------------------------------------------------------------
# Core brand palette. Source of truth: Group 149.svg, measured in
# docs/ansrx-visual-language.md. Branding_Palette.docx is superseded and
# survives as CMYK/PMS provenance only.
#
# Mirrors assets/brand/tokens.css, which governs. If the two disagree, the CSS
# is right and this is stale.
# --------------------------------------------------------------------------
CORE = {
    "black":       "#000000",
    "white":       "#FFFFFF",
    "grey":        "#E6E6E6",
    "teal":        "#004C4D",  # headings on a light ground
    "teal-deep":   "#08252F",  # the dark ground
    "teal-bright": "#00BAA8",  # the accent, on dark grounds only
    "orange":      "#FD4E11",  # the action, once per band
}


# ---------------------------- colour maths --------------------------------
def hex_to_rgb(h):
    h = h.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))


def rgb_to_hex(rgb):
    return "#" + "".join(f"{max(0, min(255, round(c * 255))):02X}" for c in rgb)


def _srgb_to_lin(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def _lin_to_srgb(c):
    return c * 12.92 if c <= 0.0031308 else 1.055 * c ** (1 / 2.4) - 0.055


def rgb_to_oklab(rgb):
    r, g, b = (_srgb_to_lin(c) for c in rgb)
    l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b
    m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b
    s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b
    l_, m_, s_ = (v ** (1 / 3) if v > 0 else -((-v) ** (1 / 3)) for v in (l, m, s))
    return (
        0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
        1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
        0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
    )


def oklab_to_rgb(lab):
    L, a, b = lab
    l_ = L + 0.3963377774 * a + 0.2158037573 * b
    m_ = L - 0.1055613458 * a - 0.0638541728 * b
    s_ = L - 0.0894841775 * a - 1.2914855480 * b
    l, m, s = (v ** 3 for v in (l_, m_, s_))
    r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
    g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
    bb = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
    return tuple(_lin_to_srgb(max(0.0, min(1.0, c))) for c in (r, g, bb))


def mix(c1, c2, t):
    """Perceptually even blend in Oklab."""
    a, b = rgb_to_oklab(hex_to_rgb(c1)), rgb_to_oklab(hex_to_rgb(c2))
    return rgb_to_hex(oklab_to_rgb(tuple(x + (y - x) * t for x, y in zip(a, b))))


def build_ramps():
    """Derive illustration ramps from the measured brand anchors.

    Motifs need 4-9 depth steps. The teal family has FOUR measured anchors
    rather than the docx's two, so the interpolations sit between real values
    instead of running from a midpoint to white:

        900 the dark ground        600 headings on a light ground
        800 a card on it           400 the bright accent
        300 a muted label          100 the pale ground

    Interpolated: 700, 500, 200. Monotonic in Oklab lightness end to end, which
    is the property the chart layer's ordinal ramp depends on.

    The two measured steps that are NOT interpolations of their neighbours
    (800 and 300) are why this is a table rather than a formula: 300 is a
    desaturated grey-teal sitting at almost the same lightness as the bright
    400 above it, so interpolating 400 -> 100 would have produced a saturated
    mint where the comp has a muted label colour.
    """
    deep, light, bright, orange, grey, white = (
        CORE["teal-deep"], CORE["teal"], CORE["teal-bright"],
        CORE["orange"], CORE["grey"], CORE["white"])
    card, muted, pale = "#063239", "#85B3AF", "#D1E9E7"  # measured
    return {
        "teal": {
            900: deep,
            800: card,
            700: mix(card, light, 0.50),
            600: light,
            500: mix(light, bright, 0.45),
            400: bright,
            300: muted,
            200: mix(muted, pale, 0.55),
            100: pale,
        },
        "orange": {
            # The one dark step, and the mirror of 400: a quarter of the way to
            # black where 400 is a quarter of the way to white. It exists because
            # the brand puts orange on small type and the anchor measures 3.35:1
            # on white — see the ramp note in tokens.css.
            # 800 mirrors 300 (48% to white) the way 700 mirrors 400, so the dark
            # end is a derivation on the ramp's own construction rather than a
            # picked brown. Its one consumer is the density map's city marks.
            800: mix(orange, CORE["black"], 0.48),
            700: mix(orange, CORE["black"], 0.25),
            500: orange,
            400: mix(orange, white, 0.25),
            300: mix(orange, white, 0.48),
            200: mix(orange, white, 0.70),
            100: mix(orange, white, 0.87),
        },
        "grey": {
            900: CORE["black"],
            700: mix(CORE["black"], grey, 0.45),
            500: mix(CORE["black"], grey, 0.70),
            300: mix(CORE["black"], grey, 0.88),
            100: grey,
            50:  mix(grey, white, 0.55),
        },
    }


def drift_map():
    """Any colour that has ever been in this project -> the current tokens.

    Two generations of source now feed this table, and it has to handle both:

      1. The original Figma deck exports (bright mint #00B8A9, vermilion
         #F05A30, amber #F47F20). Mint used to be folded into a desaturated
         grey-teal because the docx palette had no bright accent. It now maps to
         the real one, `teal-bright`, which is what it was always trying to be.
      2. The FIRST GENERATION OF OUR OWN OUTPUT — the 26 assets under
         assets/brand/ and public/brand/ were already recoloured onto the old
         docx ramp. Re-running `recolor --to-tokens` on them has to find those
         values, or an asset silently keeps a retired colour and brand_lint.py
         does not scan assets/ to catch it. Every old ramp step is listed for
         exactly that reason.

    A value appearing on both sides of the table is not a problem: recolor
    substitutes in one pass over the source, so a mapping is never re-applied to
    its own output.
    """
    r = build_ramps()
    t, o, g = r["teal"], r["orange"], r["grey"]
    return {
        # ---- our own first-generation output: the old docx-derived ramp ----
        "#00242E": t[900], "#002F3B": t[800], "#003B49": t[700],
        "#004757": t[600], "#005465": t[600],
        "#54818E": t[500], "#87A6AF": t[300], "#BBCDD2": t[200], "#E1E9EB": t[100],
        "#FF5400": o[500], "#FF865D": o[400], "#FFAE91": o[300],
        "#FFD1C0": o[200], "#FFEBE3": o[100],

        # ---- deep navy-teals -> the dark end of the ramp ----
        "#002630": t[900], "#082832": t[900],
        "#073038": t[800], "#053E44": t[800], "#053E45": t[800], "#00323F": t[800],
        "#004C4C": t[600], "#005557": t[600],
        # mid teals
        "#006968": t[500], "#006B69": t[500], "#00867F": t[500], "#2B7A7F": t[500],
        # bright mint / aqua -> the real bright accent, at last
        "#00B8A9": t[400], "#00B3A5": t[400], "#00AEBA": t[400],
        "#45CBC0": t[300], "#47B3B2": t[300],
        "#A2D9DA": t[200], "#BBE3E2": t[200], "#C8E1E0": t[200], "#D7EEEE": t[200],
        "#DAE6EB": t[100], "#CEDEE1": t[100], "#F2FBFA": t[100],
        "#C6D2D2": t[100],
        # oranges -> single brand orange + tints
        "#F05A30": o[500], "#F05722": o[500],
        "#E55422": o[500], "#F26F31": o[400], "#F1644A": o[400],
        "#A34626": t[800], "#6B3A29": t[800], "#40312B": t[900], "#212A2D": t[900],
        "#0E262E": t[900],
        # amber -> orange (off-brand hue, folded in)
        "#F47F20": o[400], "#F58A28": o[400], "#F8A247": o[300],
        "#FFE2C4": o[200], "#FCD6C6": o[200], "#FCDDD6": o[100],
        "#FFF0E9": o[100], "#FFEDDF": o[100], "#F7EFE3": o[100],
        # greys
        "#ACACAC": g[300], "#B3B3B4": g[300], "#BEBDBD": g[300], "#C7C7C7": g[300],
        "#D2D2D2": g[100], "#D9D9D9": g[100], "#DCDCDB": g[100],
        "#E6E6E5": g[100], "#EBEAEA": g[50],
    }


# ------------------------------- svg ops ----------------------------------
HEX_RE = re.compile(r"#[0-9A-Fa-f]{6}\b|#[0-9A-Fa-f]{3}\b")


def read(p):
    with open(p, encoding="utf-8") as f:
        return f.read()


def write(p, s):
    os.makedirs(os.path.dirname(os.path.abspath(p)), exist_ok=True)
    with open(p, "w", encoding="utf-8") as f:
        f.write(s)


def get_viewbox(svg):
    m = re.search(r'viewBox="([\d.\-+eE]+)\s+([\d.\-+eE]+)\s+([\d.\-+eE]+)\s+([\d.\-+eE]+)"', svg)
    return tuple(float(x) for x in m.groups()) if m else None


def op_normalize(svg, label=None):
    """Make the asset fluid and correctly exposed to assistive tech.

    Figma hard-codes width/height, which pins the asset to its export size and
    fights any CSS sizing. Dropping them (keeping viewBox) makes it scale to
    its container.

    Decorative motifs get aria-hidden - they carry no information, and
    announcing them is noise. Anything passed a `label` is real content
    (the logo) and instead gets role="img" plus a <title>.
    """
    m = re.match(r"<svg\b[^>]*>", svg)
    if not m:
        return svg
    tag = m.group(0)
    new = re.sub(r'\s(width|height)="[^"]*"', "", tag)
    if "preserveAspectRatio" not in new:
        new = new[:-1] + ' preserveAspectRatio="xMidYMid meet"' + ">"
    if label:
        new = new[:-1] + ' role="img"' + ">"
        svg = svg.replace(tag, new + f"\n<title>{label}</title>", 1)
        return svg
    if "aria-hidden" not in new and "role=" not in new:
        new = new[:-1] + ' aria-hidden="true" focusable="false"' + ">"
    return svg.replace(tag, new, 1)


def op_recolor(svg, mapping):
    up = {k.upper(): v for k, v in mapping.items()}
    unmapped = set()

    def sub(m):
        h = m.group(0).upper()
        if len(h) == 4:
            h = "#" + "".join(c * 2 for c in h[1:])
        if h in up:
            return up[h]
        unmapped.add(h)
        return m.group(0)

    out = HEX_RE.sub(sub, svg)
    # Figma also embeds colours as float rgb in data-figma-* payloads; those are
    # inert decoration for renderers but keep them honest where cheap.
    return out, sorted(unmapped)


def _wrap_children(svg, open_tag, close_tag="</g>"):
    m = re.match(r"<svg\b[^>]*>", svg)
    if not m:
        return svg
    head = m.group(0)
    body = svg[m.end():]
    i = body.rfind("</svg>")
    inner, tail = body[:i], body[i:]
    return f"{head}\n{open_tag}{inner}{close_tag}\n{tail}"


def op_fade(svg, opacity):
    return _wrap_children(svg, f'<g opacity="{opacity}">')


def op_flip(svg, axis):
    vb = get_viewbox(svg)
    if not vb:
        raise SystemExit("flip needs a viewBox")
    _, _, w, h = vb
    tf = f"translate({w} 0) scale(-1 1)" if axis == "x" else f"translate(0 {h}) scale(1 -1)"
    return _wrap_children(svg, f'<g transform="{tf}">')


def op_crop(svg, box):
    vals = [float(v) for v in box.replace(",", " ").split()]
    if len(vals) != 4:
        raise SystemExit('--viewbox expects "x y w h"')
    return re.sub(r'viewBox="[^"]*"', 'viewBox="%g %g %g %g"' % tuple(vals), svg, count=1)


def op_currentcolor(svg, color):
    c = color.upper()
    out = re.sub(HEX_RE, lambda m: "currentColor" if m.group(0).upper() == c else m.group(0), svg)
    return out


def render_png(svg_path, size=900):
    """Render via macOS Quick Look. Returns path to a temp PNG or None."""
    tmp = tempfile.mkdtemp()
    subprocess.run(["qlmanage", "-t", "-s", str(size), "-o", tmp, svg_path],
                   capture_output=True, timeout=120)
    for f in os.listdir(tmp):
        if f.endswith(".png"):
            return os.path.join(tmp, f)
    return None


def op_trim(svg_path, pad=0):
    """Crop the viewBox to the drawing's actual ink bounds.

    Figma exports carry generous empty margins. We render, find the alpha
    bounding box, then map those pixel bounds back into viewBox units - so the
    result is an exact crop, not an eyeballed one.
    """
    from PIL import Image, ImageChops
    svg = read(svg_path)
    vb = get_viewbox(svg)
    if not vb:
        raise SystemExit("trim needs a viewBox")
    png = render_png(svg_path, 1000)
    if not png:
        raise SystemExit("could not render for trim")
    im = Image.open(png).convert("RGBA")

    # Quick Look composites onto an opaque ground, so the alpha channel is
    # useless here - it is fully opaque everywhere. Find ink by differencing
    # against the background colour instead, sampled from a corner, and union
    # that with any genuine transparency if the renderer did preserve it.
    alpha_box = im.split()[3].getbbox() if im.mode == "RGBA" else None
    if alpha_box == (0, 0, im.width, im.height):
        alpha_box = None

    rgb = im.convert("RGB")
    bg = rgb.getpixel((0, 0))
    diff = ImageChops.difference(rgb, Image.new("RGB", rgb.size, bg)).convert("L")
    # Threshold away JPEG-ish/antialias noise before measuring.
    ink_box = diff.point(lambda v: 255 if v > 12 else 0).getbbox()

    boxes = [b for b in (alpha_box, ink_box) if b]
    if not boxes:
        raise SystemExit("nothing visible to trim")
    bbox = (min(b[0] for b in boxes), min(b[1] for b in boxes),
            max(b[2] for b in boxes), max(b[3] for b in boxes))
    vx, vy, vw, vh = vb
    sx, sy = vw / im.width, vh / im.height
    x0, y0, x1, y1 = bbox
    nx, ny = vx + x0 * sx - pad, vy + y0 * sy - pad
    nw, nh = (x1 - x0) * sx + 2 * pad, (y1 - y0) * sy + 2 * pad
    return op_crop(svg, f"{nx:.2f} {ny:.2f} {nw:.2f} {nh:.2f}")


def op_stat(paths):
    for p in paths:
        svg = read(p)
        vb = get_viewbox(svg)
        cols = sorted({c.upper() for c in HEX_RE.findall(svg)})
        size = os.path.getsize(p)
        print(f"{os.path.relpath(p)}")
        print(f"  viewBox : {vb}")
        print(f"  bytes   : {size:,}")
        print(f"  colors  : {' '.join(cols) if cols else '(gradient/none)'}")


def op_preview(paths, outdir):
    from PIL import Image, ImageDraw
    CELL, LAB, COLS = 300, 30, 4
    os.makedirs(outdir, exist_ok=True)
    cells = []
    for p in paths:
        png = render_png(p, 700)
        if not png:
            print(f"  ! render failed {p}", file=sys.stderr)
            continue
        cv = Image.new("RGB", (CELL, CELL + LAB), (250, 250, 250))
        d = ImageDraw.Draw(cv)
        for y in range(0, CELL, 20):
            for x in range(0, CELL, 20):
                if (x // 20 + y // 20) % 2 == 0:
                    d.rectangle([x, y, x + 19, y + 19], fill=(226, 226, 226))
        im = Image.open(png).convert("RGBA")
        im.thumbnail((CELL - 10, CELL - 10))
        cv.paste(im, ((CELL - im.width) // 2, (CELL - im.height) // 2), im)
        d.rectangle([0, CELL, CELL, CELL + LAB], fill=(10, 36, 46))
        d.text((6, CELL + 9), os.path.basename(p)[:44], fill=(255, 255, 255))
        d.rectangle([0, 0, CELL - 1, CELL + LAB - 1], outline=(150, 150, 150))
        cells.append(cv)
    per = COLS * 4
    made = []
    for si in range(0, len(cells), per):
        ch = cells[si:si + per]
        rows = (len(ch) + COLS - 1) // COLS
        sh = Image.new("RGB", (COLS * CELL, rows * (CELL + LAB)), (255, 255, 255))
        for i, c in enumerate(ch):
            sh.paste(c, ((i % COLS) * CELL, (i // COLS) * (CELL + LAB)))
        out = os.path.join(outdir, f"sheet{si // per + 1}.jpg")
        sh.save(out, quality=85)
        made.append(out)
        print(out)
    return made


# --------------------------------- cli ------------------------------------
def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)

    sub.add_parser("ramp")

    p = sub.add_parser("stat");    p.add_argument("svg", nargs="+")
    p = sub.add_parser("preview"); p.add_argument("svg", nargs="+"); p.add_argument("-o", default="/tmp/brand-preview")

    for name in ("normalize", "recolor", "fade", "crop", "trim", "currentcolor", "flip"):
        p = sub.add_parser(name)
        p.add_argument("svg")
        p.add_argument("-o", "--out", required=True)
        if name == "normalize":
            p.add_argument("--label", default=None,
                          help="accessible name; omit for decorative assets")
        if name == "recolor":
            p.add_argument("--map", default=None, help='"#AAA=#BBB,#CCC=#DDD"')
            p.add_argument("--to-tokens", action="store_true")
        if name == "fade":
            p.add_argument("--opacity", type=float, required=True)
        if name == "crop":
            p.add_argument("--viewbox", required=True)
        if name == "trim":
            p.add_argument("--pad", type=float, default=0)
        if name == "currentcolor":
            p.add_argument("--color", required=True)
        if name == "flip":
            p.add_argument("--axis", choices=["x", "y"], default="x")

    a = ap.parse_args()

    if a.cmd == "ramp":
        for fam, steps in build_ramps().items():
            print(f"\n{fam}")
            for k in sorted(steps, reverse=True):
                print(f"  {fam}-{k:<4} {steps[k]}")
        return
    if a.cmd == "stat":
        return op_stat(a.svg)
    if a.cmd == "preview":
        return op_preview(a.svg, a.o)

    svg = read(a.svg)
    if a.cmd == "normalize":
        out = op_normalize(svg, a.label)
    elif a.cmd == "recolor":
        mapping = drift_map() if a.to_tokens else {}
        if a.map:
            for pair in a.map.split(","):
                k, v = pair.split("=")
                mapping[k.strip()] = v.strip()
        out, unmapped = op_recolor(svg, mapping)
        if unmapped:
            print("unmapped colors left as-is: " + " ".join(unmapped), file=sys.stderr)
    elif a.cmd == "fade":
        out = op_fade(svg, a.opacity)
    elif a.cmd == "crop":
        out = op_crop(svg, a.viewbox)
    elif a.cmd == "trim":
        out = op_trim(a.svg, a.pad)
    elif a.cmd == "currentcolor":
        out = op_currentcolor(svg, a.color)
    elif a.cmd == "flip":
        out = op_flip(svg, a.axis)
    write(a.out, out)
    print(f"wrote {a.out}")


if __name__ == "__main__":
    main()
