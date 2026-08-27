#!/usr/bin/env python3
"""
Can colour carry status signalling inside a six-colour brand palette?

The brand doc assigns Orange Highlight to CTAs and hover states. A destructive
action therefore cannot also be orange, or Delete and Save become the same
button. This asks whether any added hue actually solves that, or whether the
pattern layer has to.

Tests each candidate against five requirements:
  1. distinguishable from the CTA orange (Oklab dE)
  2. >= 4.5:1 on white            (usable as text/icon)
  3. >= 3:1 on deep teal          (usable on dark surfaces)
  4. still distinguishable from the CTA orange under protanopia and
     deuteranopia -- the case that normally breaks red-vs-orange
  5. success and danger distinguishable from each other under CVD

CVD simulation uses the Machado, Oliveira & Fernandes (2009) severity-1.0
matrices, applied in linear RGB.

Run: python3 scripts/brand_status_analysis.py
"""
import itertools
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from brand_asset import (hex_to_rgb, rgb_to_hex, rgb_to_oklab, oklab_to_rgb,
                         _srgb_to_lin, _lin_to_srgb, CORE)

# ---------------------------------------------------------------- CVD ------
CVD = {
    "protanopia": ((0.152286, 1.052583, -0.204868),
                   (0.114503, 0.786281, 0.099216),
                   (-0.003882, -0.048116, 1.051998)),
    "deuteranopia": ((0.367322, 0.860646, -0.227968),
                     (0.280085, 0.672501, 0.047413),
                     (-0.011820, 0.042940, 0.968881)),
    "tritanopia": ((1.255528, -0.076749, -0.178779),
                   (-0.078411, 0.930809, 0.147602),
                   (0.004733, 0.691367, 0.303900)),
}


def simulate(rgb, kind):
    lin = [_srgb_to_lin(c) for c in rgb]
    m = CVD[kind]
    out = [sum(m[i][j] * lin[j] for j in range(3)) for i in range(3)]
    return tuple(_lin_to_srgb(max(0.0, min(1.0, v))) for v in out)


# ------------------------------------------------------------ metrics ------
def luminance(rgb):
    r, g, b = (_srgb_to_lin(c) for c in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(a, b):
    la, lb = luminance(a), luminance(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


def de(h1, h2):
    """Oklab euclidean distance. ~0.02 just noticeable, >0.15 clearly different."""
    a, b = rgb_to_oklab(hex_to_rgb(h1)), rgb_to_oklab(hex_to_rgb(h2))
    return math.dist(a, b)


def de_cvd(h1, h2, kind):
    a = rgb_to_oklab(simulate(hex_to_rgb(h1), kind))
    b = rgb_to_oklab(simulate(hex_to_rgb(h2), kind))
    return math.dist(a, b)


def oklch(h):
    L, a, b = rgb_to_oklab(hex_to_rgb(h))
    return L, math.hypot(a, b), math.degrees(math.atan2(b, a)) % 360


def from_oklch(L, C, hdeg):
    r = math.radians(hdeg)
    return rgb_to_hex(oklab_to_rgb((L, C * math.cos(r), C * math.sin(r))))


def in_gamut(L, C, hdeg):
    """Reject values that clipped on conversion."""
    hx = from_oklch(L, C, hdeg)
    L2, C2, h2 = oklch(hx)
    return abs(L - L2) < 0.02 and abs(C - C2) < 0.02


# --------------------------------------------------------------- search ----
ORANGE = CORE["orange"]
TEAL = CORE["teal"]
DEEP = CORE["teal-deep"]
WHITE = CORE["white"]

REQ_DE_ORANGE = 0.15   # clearly different in normal vision
REQ_DE_CVD = 0.08      # still separable under CVD
REQ_ON_WHITE = 4.5
REQ_ON_DEEP = 3.0


def evaluate(hx, label, compare_to):
    w = contrast(hex_to_rgb(hx), hex_to_rgb(WHITE))
    d = contrast(hex_to_rgb(hx), hex_to_rgb(DEEP))
    row = {
        "hex": hx, "label": label,
        "on_white": w, "on_deep": d,
        "de": de(hx, compare_to),
        "de_prot": de_cvd(hx, compare_to, "protanopia"),
        "de_deut": de_cvd(hx, compare_to, "deuteranopia"),
    }
    row["pass"] = (row["de"] >= REQ_DE_ORANGE and w >= REQ_ON_WHITE
                   and d >= REQ_ON_DEEP
                   and row["de_prot"] >= REQ_DE_CVD
                   and row["de_deut"] >= REQ_DE_CVD)
    return row


def search(hue_lo, hue_hi, compare_to, label):
    """Grid search OkLCh for the best candidate meeting all requirements."""
    best = []
    for hdeg in range(hue_lo, hue_hi + 1, 3):
        for L in [x / 100 for x in range(35, 71, 3)]:
            for C in [x / 1000 for x in range(60, 251, 10)]:
                if not in_gamut(L, C, hdeg):
                    continue
                hx = from_oklch(L, C, hdeg)
                r = evaluate(hx, label, compare_to)
                r["oklch"] = (L, C, hdeg)
                if r["pass"]:
                    best.append(r)
    # prefer maximum CVD separability, then normal-vision separability
    best.sort(key=lambda r: (min(r["de_prot"], r["de_deut"]), r["de"]), reverse=True)
    return best


def show(title, rows, n=5):
    print(f"\n{title}")
    print(f"  {'hex':9} {'on white':>9} {'on deep':>8} {'dE':>6} "
          f"{'dE prot':>8} {'dE deut':>8}")
    if not rows:
        print("  -- nothing meets all requirements --")
        return
    for r in rows[:n]:
        print(f"  {r['hex']:9} {r['on_white']:8.2f}:1 {r['on_deep']:7.2f}:1 "
              f"{r['de']:6.3f} {r['de_prot']:8.3f} {r['de_deut']:8.3f}")


def main():
    print("=" * 74)
    print("BASELINE — what the palette already gives us")
    print("=" * 74)
    L, C, H = oklch(ORANGE)
    print(f"  CTA orange {ORANGE}  OkLCh L={L:.3f} C={C:.3f} h={H:.1f}deg")
    L, C, H = oklch(TEAL)
    print(f"  Teal       {TEAL}  OkLCh L={L:.3f} C={C:.3f} h={H:.1f}deg")

    print("\n  Current token mapping, measured:")
    cur = {"status-danger": "#FF5400", "status-warning": "#FF865D",
           "status-success": "#004757", "status-info": "#005465"}
    for name, hx in cur.items():
        print(f"    {name:16} {hx}  dE from CTA orange {de(hx, ORANGE):.3f}"
              f"   on white {contrast(hex_to_rgb(hx), hex_to_rgb(WHITE)):.2f}:1")
    print(f"\n    danger vs warning        dE {de(cur['status-danger'], cur['status-warning']):.3f}"
          f"  <- must be clearly different, is not")
    print(f"    success vs info          dE {de(cur['status-success'], cur['status-info']):.3f}"
          f"  <- effectively the same colour")
    print(f"    danger vs CTA orange     dE {de(cur['status-danger'], ORANGE):.3f}"
          f"  <- IDENTICAL. Delete looks like Save.")

    print("\n" + "=" * 74)
    print("CAN AN ADDED RED SOLVE IT? (searching hue 15-40deg)")
    print("=" * 74)
    reds = search(15, 40, ORANGE, "danger")
    show("Candidate danger reds, ranked by CVD separability from the CTA orange:", reds)

    print("\n" + "=" * 74)
    print("CAN AN ADDED GREEN SOLVE SUCCESS? (searching hue 130-165deg)")
    print("=" * 74)
    greens = search(130, 165, TEAL, "success")
    show("Candidate success greens, ranked by CVD separability from brand teal:", greens)

    if reds and greens:
        r, g = reds[0]["hex"], greens[0]["hex"]
        print("\n" + "=" * 74)
        print("CROSS-CHECK — the classic red/green failure")
        print("=" * 74)
        print(f"  danger {r} vs success {g}")
        print(f"    normal vision   dE {de(r, g):.3f}")
        for kind in ("protanopia", "deuteranopia", "tritanopia"):
            d = de_cvd(r, g, kind)
            verdict = "separable" if d >= REQ_DE_CVD else "COLLAPSES"
            print(f"    {kind:14} dE {d:.3f}   {verdict}")
            print(f"        appears as {rgb_to_hex(simulate(hex_to_rgb(r), kind))}"
                  f" vs {rgb_to_hex(simulate(hex_to_rgb(g), kind))}")

        print(f"\n  danger {r} vs CTA orange {ORANGE}")
        for kind in ("protanopia", "deuteranopia"):
            d = de_cvd(r, ORANGE, kind)
            verdict = "separable" if d >= REQ_DE_CVD else "COLLAPSES"
            print(f"    {kind:14} dE {d:.3f}   {verdict}")
            print(f"        appears as {rgb_to_hex(simulate(hex_to_rgb(r), kind))}"
                  f" vs {rgb_to_hex(simulate(hex_to_rgb(ORANGE), kind))}")


if __name__ == "__main__":
    main()
