#!/usr/bin/env python3
"""
Extract everything of value from Branding_Palette.docx so the docx becomes
redundant.

The docx carries no text and no font data - Word boilerplate aside, its whole
payload is two PNG boards. So we do three things:

  1. Copy both boards into assets/brand/reference/ as the durable provenance.
  2. Auto-detect each swatch rectangle and sample it, so the gradients in
     tokens.css are measured from the source rather than eyeballed.
  3. Print the sampled values for transcription into tokens.css.

Run: python3 scripts/brand_palette_extract.py
"""
import os
import zipfile

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCX = os.path.join(ROOT, "Branding_Palette.docx")
REF = os.path.join(ROOT, "assets", "brand", "reference")

BOARDS = [("word/media/image1.png", "palette-core.png"),
          ("word/media/image2.png", "palette-gradients.png")]


def hexs(rgb):
    return "#%02X%02X%02X" % rgb[:3]


def find_swatches(im, min_side=60):
    """Locate solid/gradient swatch blocks against the board's paper colour."""
    rgb = im.convert("RGB")
    w, h = rgb.size
    paper = rgb.getpixel((4, 4))
    px = rgb.load()

    def is_paper(x, y):
        p = px[x, y]
        return all(abs(p[i] - paper[i]) <= 6 for i in range(3))

    seen = [[False] * w for _ in range(h)]
    boxes = []
    # Coarse scan; swatches are large so an 8px stride is plenty and fast.
    for y in range(0, h, 8):
        for x in range(0, w, 8):
            if seen[y][x] or is_paper(x, y):
                continue
            # grow a rectangle right then down from this seed
            x1 = x
            while x1 + 8 < w and not is_paper(x1 + 8, y):
                x1 += 8
            y1 = y
            while y1 + 8 < h and not is_paper(x, y1 + 8):
                y1 += 8
            for yy in range(y, min(y1 + 8, h), 8):
                for xx in range(x, min(x1 + 8, w), 8):
                    seen[yy][xx] = True
            if (x1 - x) >= min_side and (y1 - y) >= min_side:
                boxes.append((x, y, x1 + 8, y1 + 8))
    boxes.sort(key=lambda b: (b[1] // 40, b[0]))
    return boxes


def sample(im, box, n=5):
    """Sample an n x n grid inside a swatch, inset to dodge the edges."""
    rgb = im.convert("RGB")
    x0, y0, x1, y1 = box
    ix, iy = (x1 - x0) * 0.10, (y1 - y0) * 0.10
    x0, y0, x1, y1 = x0 + ix, y0 + iy, x1 - ix, y1 - iy
    grid = []
    for j in range(n):
        row = []
        for i in range(n):
            gx = x0 + (x1 - x0) * (i / (n - 1) if n > 1 else 0.5)
            gy = y0 + (y1 - y0) * (j / (n - 1) if n > 1 else 0.5)
            row.append(hexs(rgb.getpixel((int(gx), int(gy)))))
        grid.append(row)
    return grid


def uniform(grid):
    flat = [c for row in grid for c in row]
    return len(set(flat)) == 1, flat[len(flat) // 2]


def main():
    if not os.path.exists(DOCX):
        raise SystemExit(f"missing {DOCX} - already deleted? "
                         f"reference boards are in {REF}")
    os.makedirs(REF, exist_ok=True)
    z = zipfile.ZipFile(DOCX)

    for member, out in BOARDS:
        p = os.path.join(REF, out)
        with open(p, "wb") as f:
            f.write(z.read(member))
        print(f"saved {os.path.relpath(p, ROOT)}")

    for _, out in BOARDS:
        p = os.path.join(REF, out)
        im = Image.open(p)
        print(f"\n{'=' * 62}\n{out}  {im.size}\n{'=' * 62}")
        for box in find_swatches(im):
            grid = sample(im, box)
            flat, mid = uniform(grid)
            w, h = box[2] - box[0], box[3] - box[1]
            print(f"\nbox {box}  {w}x{h}")
            if flat:
                print(f"  SOLID  {mid}")
            else:
                print("  GRADIENT  corners "
                      f"TL {grid[0][0]}  TR {grid[0][-1]}  "
                      f"BL {grid[-1][0]}  BR {grid[-1][-1]}   mid {mid}")
                for row in grid:
                    print("    " + "  ".join(row))


if __name__ == "__main__":
    main()
