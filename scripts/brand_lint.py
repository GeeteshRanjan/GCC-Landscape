#!/usr/bin/env python3
"""
Brand guard. Catches the three ways this project drifts off-brand.

  1. A raw hex colour in source, when tokens.css exists.
  2. An off-brand hue from the old deck palette.
  3. A motif or texture referenced straight out of assets/brand/ with no sign
     of adaptation - the thing the ansr-brand-assets skill exists to prevent.

Usage
  brand_lint.py [paths...]     defaults to the whole workspace
  brand_lint.py --staged       only what git has staged

Exit 1 if anything is found, so it works as a hook or a pre-commit check.
"""
import argparse
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOKENS = os.path.join(ROOT, "assets", "brand", "tokens.css")

SCAN_EXT = {".css", ".scss", ".ts", ".tsx", ".js", ".jsx", ".vue", ".svelte",
            ".html", ".astro", ".mdx"}
SKIP_DIR = {"node_modules", ".git", "dist", "build", ".next", "out",
            ".kiro", "assets", "scripts",
            # Generated test output. playwright-report/index.html inlines a whole
            # third-party stylesheet, which is ~1,300 findings of noise about
            # colours nobody in this project chose or can change.
            "playwright-report", "test-results", "coverage"}

# Hexes that must never appear, each with the token that replaces it.
#
# **This list was inverted when the palette moved to `Group 149.svg`.** It used to
# name the comp's bright mint as off-brand deck art; the mint is now the accent
# and the DOCX PALETTE IS WHAT IS RETIRED. Every step of the old two-anchor ramp
# is listed, not just the two core colours, for one specific reason: the raw-hex
# check reads its allow-list out of tokens.css, so the moment a value leaves that
# file it stops being allowed — but "raw-hex" is a generic message that reads like
# a style nit. A stale `#005465` is not a style nit, it is a colour from a palette
# this project no longer uses, and it should say so.
#
# Nothing here may still be present in tokens.css: off-brand is checked BEFORE the
# allow-list, so listing a live token would fail the lint on the token file itself.
OFF_BRAND = {
    # ---- the retired docx palette: core ----
    "#005465": "retired Light Teal (docx) - use --ansr-teal or --ansr-teal-600",
    "#00242E": "retired Deep Teal (docx) - use --ansr-teal-deep",
    "#FF5400": "retired Orange Highlight (docx) - use --ansr-orange (#FD4E11)",
    # ---- the retired docx-derived ramps ----
    "#002F3B": "retired teal ramp step - use --ansr-teal-800",
    "#003B49": "retired teal ramp step - use --ansr-teal-700",
    "#004757": "retired teal ramp step - use --ansr-teal-600",
    "#54818E": "retired teal ramp step - use --ansr-teal-500",
    "#87A6AF": "retired teal ramp step - use --ansr-teal-300",
    "#BBCDD2": "retired teal ramp step - use --ansr-teal-200",
    "#E1E9EB": "retired teal ramp step - use --ansr-teal-100 (now the pale mint)",
    "#FF865D": "retired orange ramp step - use --ansr-orange-400",
    "#FFAE91": "retired orange ramp step - use --ansr-orange-300",
    "#FFD1C0": "retired orange ramp step - use --ansr-orange-200",
    "#FFEBE3": "retired orange ramp step - use --ansr-orange-100",
    # ---- deck art that was never on brand under either palette ----
    "#F05A30": "vermilion - deck art; use --ansr-orange",
    "#F05722": "vermilion - deck art; use --ansr-orange",
    "#F47F20": "amber - deck art; use --ansr-orange-400",
    "#F58A28": "amber - deck art; use --ansr-orange-400",
    "#006968": "deck teal - use --ansr-teal-500",
    "#DD6236": "old logo orange - use --ansr-orange",
    # ---- drift AROUND the new anchors, which is now the common mistake ----
    # These are near-misses for real tokens, so they are the values most likely to
    # be pasted from a Figma inspector and least likely to be noticed by eye.
    "#00B8A9": "drifted bright teal - use --ansr-teal-bright (#00BAA8)",
    "#00B3A5": "drifted bright teal - use --ansr-teal-bright (#00BAA8)",
    "#072228": "drifted dark ground - use --ansr-teal-deep (#08252F)",
    "#082D36": "drifted dark ground - use --ansr-teal-deep (#08252F)",
    "#00544C": "drifted heading teal - use --ansr-teal (#004C4D)",
}

HEX = re.compile(r"#[0-9A-Fa-f]{6}\b|#[0-9A-Fa-f]{3}\b")

# Tokens that were removed on purpose. Reintroducing them re-creates a real
# bug: --ansr-status-danger resolved to the CTA orange, so destructive buttons
# rendered identically to primary ones. See BRAND.md.
RETIRED = {
    "--ansr-status-danger":
        "removed — resolved to the CTA orange, making Delete look like Save. "
        "Use the .ansr-destructive pattern (form-based), not a colour.",
    "--ansr-status-warning":
        "removed — was within dE 0.095 of danger. Use --ansr-feedback-attention.",
    "--ansr-status-success":
        "removed — was within dE 0.044 of info; colour cannot separate them. "
        "Use --ansr-feedback-neutral plus a check icon.",
    "--ansr-status-info":
        "removed — use --ansr-feedback-neutral.",
}
RETIRED_RE = re.compile("|".join(re.escape(k) for k in RETIRED))
# A reference is "adapted" if it points at a derived file, or sits next to a
# transform: a motif wrapper class, an opacity/mask/clip, or a crop.
ADAPT_HINT = re.compile(
    r"ansr-motif|ansr-stripes|opacity|mask-image|mask:|clip-path|"
    r"brand_asset\.py|aria-hidden", re.I)
BRAND_REF = re.compile(r"assets/brand/(motif|texture)/([\w.-]+\.svg)")


def token_hexes():
    if not os.path.exists(TOKENS):
        return set()
    return {h.upper() for h in HEX.findall(open(TOKENS, encoding="utf-8").read())}


def walk(paths):
    for p in paths:
        if os.path.isfile(p):
            yield p
            continue
        for dirpath, dirnames, files in os.walk(p):
            dirnames[:] = [d for d in dirnames
                           if d not in SKIP_DIR and not d.startswith(".")]
            for f in files:
                if os.path.splitext(f)[1] in SCAN_EXT:
                    yield os.path.join(dirpath, f)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("paths", nargs="*")
    ap.add_argument("--staged", action="store_true")
    a = ap.parse_args()

    if a.staged:
        out = subprocess.run(["git", "diff", "--cached", "--name-only", "--diff-filter=ACM"],
                             cwd=ROOT, capture_output=True, text=True).stdout
        paths = [os.path.join(ROOT, l) for l in out.split() if l]
        paths = [p for p in paths
                 if os.path.splitext(p)[1] in SCAN_EXT and os.path.exists(p)]
    else:
        paths = a.paths or [ROOT]

    allowed = token_hexes()
    findings = []

    for path in walk(paths):
        try:
            lines = open(path, encoding="utf-8", errors="replace").read().splitlines()
        except OSError:
            continue
        rel = os.path.relpath(path, ROOT)
        for i, line in enumerate(lines, 1):
            for h in HEX.findall(line):
                hu = h.upper()
                if len(hu) == 4:
                    hu = "#" + "".join(c * 2 for c in hu[1:])
                if hu in OFF_BRAND:
                    findings.append((rel, i, "off-brand", f"{h} - {OFF_BRAND[hu]}"))
                elif allowed:
                    findings.append(
                        (rel, i, "raw-hex",
                         f"{h} - use a token from assets/brand/tokens.css"))
            for m in RETIRED_RE.finditer(line):
                findings.append((rel, i, "retired-token",
                                 f"{m.group(0)} — {RETIRED[m.group(0)]}"))
            for m in BRAND_REF.finditer(line):
                ctx = "\n".join(lines[max(0, i - 4):i + 3])
                if not ADAPT_HINT.search(ctx):
                    findings.append(
                        (rel, i, "unadapted",
                         f"{m.group(2)} placed with no visible adaptation - "
                         f"see .kiro/skills/ansr-brand-assets/SKILL.md"))

    if not findings:
        print("brand-lint: clean")
        return 0

    order = {"off-brand": 0, "retired-token": 1, "unadapted": 2, "raw-hex": 3}
    for rel, ln, kind, msg in sorted(findings, key=lambda f: (order[f[2]], f[0], f[1])):
        print(f"{rel}:{ln}: [{kind}] {msg}", file=sys.stderr)
    print(f"\nbrand-lint: {len(findings)} finding(s)", file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
