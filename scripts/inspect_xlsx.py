#!/usr/bin/env python3
"""Dependency-free .xlsx inspector / CSV dumper.

Reads an .xlsx with the stdlib only (a workbook is a zip of XML), so it works on a
machine with no pandas/openpyxl. Used to inspect incoming data drops before the real
TypeScript importer touches them.

Usage:
    python3 scripts/inspect_xlsx.py <file.xlsx>              # profile every column
    python3 scripts/inspect_xlsx.py <file.xlsx> --csv out.csv
    python3 scripts/inspect_xlsx.py <file.xlsx> --col 3      # value counts for one column
"""

from __future__ import annotations

import argparse
import csv
import re
import sys
import zipfile
from collections import Counter
from xml.etree import ElementTree as ET

NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"


def shared_strings(z: zipfile.ZipFile) -> list[str]:
    try:
        raw = z.read("xl/sharedStrings.xml")
    except KeyError:
        return []
    out = []
    for si in ET.fromstring(raw).findall(f"{NS}si"):
        out.append("".join(t.text or "" for t in si.iter(f"{NS}t")))
    return out


def col_index(ref: str) -> int:
    letters = re.match(r"([A-Z]+)", ref or "A").group(1)
    n = 0
    for ch in letters:
        n = n * 26 + (ord(ch) - 64)
    return n - 1


def rows(path: str):
    z = zipfile.ZipFile(path)
    strings = shared_strings(z)
    sheet = next(n for n in z.namelist() if re.match(r"xl/worksheets/sheet\d+\.xml$", n))
    with z.open(sheet) as fh:
        for _, el in ET.iterparse(fh, events=("end",)):
            if el.tag != f"{NS}row":
                continue
            cells: dict[int, str] = {}
            for c in el.findall(f"{NS}c"):
                v = c.find(f"{NS}v")
                if c.get("t") == "inlineStr":
                    is_el = c.find(f"{NS}is")
                    text = "".join(t.text or "" for t in is_el.iter(f"{NS}t")) if is_el is not None else ""
                elif c.get("t") == "s" and v is not None:
                    text = strings[int(v.text)]
                else:
                    text = v.text if v is not None else ""
                if text:
                    cells[col_index(c.get("r", ""))] = text.strip()
            if cells:
                width = max(cells) + 1
                yield [cells.get(i, "") for i in range(width)]
            el.clear()


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("path")
    ap.add_argument("--csv")
    ap.add_argument("--col", type=int)
    ap.add_argument("--limit", type=int, default=25)
    args = ap.parse_args()

    it = rows(args.path)
    header = next(it)
    data = list(it)

    if args.csv:
        with open(args.csv, "w", newline="", encoding="utf8") as fh:
            w = csv.writer(fh)
            w.writerow(header)
            w.writerows(r + [""] * (len(header) - len(r)) for r in data)
        print(f"wrote {args.csv}: {len(data)} rows x {len(header)} cols")
        return 0

    if args.col is not None:
        vals = [r[args.col] if args.col < len(r) else "" for r in data]
        counts = Counter(v for v in vals if v)
        filled = sum(counts.values())
        print(f"[{args.col}] {header[args.col]!r}  filled={filled}/{len(vals)}  distinct={len(counts)}")
        for v, n in counts.most_common(args.limit):
            print(f"  {n:5d}  {v}")
        return 0

    print(f"{len(data)} data rows x {len(header)} columns\n")
    for i, name in enumerate(header):
        vals = [r[i] if i < len(r) else "" for r in data]
        filled = [v for v in vals if v]
        distinct = sorted(set(filled))
        sample = "; ".join(distinct[:3])[:110]
        print(f"[{i:2d}] {name!r}")
        print(f"     filled {len(filled)}/{len(vals)}  distinct {len(distinct)}  e.g. {sample}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
