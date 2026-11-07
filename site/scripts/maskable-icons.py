#!/usr/bin/env python3
"""Maskable app icons, derived from public/icon-512.png.

Android masks installed-app icons to a circle, squircle or rounded square. The full-bleed
icon-512.png draws its brass ring out to 91% of the half-width, so a circular mask would
cut the ring off. The maskable copies scale the same artwork to 82% and centre it on the
same pine field, which keeps every stroke inside the safe zone of the manifest spec: a
centred circle whose radius is 40% of the icon width
(https://www.w3.org/TR/appmanifest/#icon-masks).

Deriving them from icon-512.png means the two cannot drift apart: rerun this script
whenever the icon changes. It refuses to write an icon whose artwork leaves the safe zone.

    python3 site/scripts/maskable-icons.py        (needs Pillow: pip install pillow)
"""
import math
import pathlib
import sys

from PIL import Image

PUBLIC = pathlib.Path(__file__).resolve().parent.parent / "public"
SOURCE = PUBLIC / "icon-512.png"
SCALE = 0.82  # artwork size relative to the canvas
SAFE = 0.40  # safe-zone radius relative to the canvas width
TOLERANCE = 12  # a pixel further than this (per channel) from the field counts as artwork


def artwork_radius(img, bg):
    """Largest distance from the centre to any artwork pixel, as a fraction of the width."""
    w, h = img.size
    px = img.load()
    cx, cy = (w - 1) / 2, (h - 1) / 2
    far = 0.0
    for y in range(h):
        for x in range(w):
            p = px[x, y]
            if max(abs(p[i] - bg[i]) for i in range(3)) > TOLERANCE:
                far = max(far, math.hypot(x - cx, y - cy))
    return far / w


def main():
    src = Image.open(SOURCE).convert("RGB")
    bg = src.getpixel((0, 0))
    border = {src.getpixel((x, y)) for x in range(src.width) for y in (0, src.height - 1)}
    if border != {bg}:
        sys.exit(f"{SOURCE.name}: the field is not one colour, so it cannot be extended")
    for size in (512, 192):
        inner = round(size * SCALE)
        art = src.resize((inner, inner), Image.LANCZOS)
        canvas = Image.new("RGB", (size, size), bg)
        offset = (size - inner) // 2
        canvas.paste(art, (offset, offset))
        reach = artwork_radius(canvas, bg)
        if reach > SAFE:
            sys.exit(f"maskable {size}: artwork reaches {reach:.1%} of the width, safe zone is {SAFE:.0%}")
        out = PUBLIC / f"icon-maskable-{size}.png"
        canvas.save(out, optimize=True)
        print(f"{out.relative_to(PUBLIC.parent)}: {size}x{size}, artwork radius {reach:.1%} (safe zone {SAFE:.0%}), field #{bg[0]:02x}{bg[1]:02x}{bg[2]:02x}")


if __name__ == "__main__":
    main()
