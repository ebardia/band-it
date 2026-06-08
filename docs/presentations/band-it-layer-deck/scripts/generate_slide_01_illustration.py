"""
Generate slide-01 signal-vs-noise engraving (Band It newspaper / 1950s retro-future).

Composites site-style sepia engraving with ticker-tape newsroom overlays and a
single electric-blue "signal" headline beam.

Usage:
  python docs/presentations/band-it-layer-deck/scripts/generate_slide_01_illustration.py
"""

from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parents[2]
PUBLIC = REPO / "apps" / "web" / "public"
OUT = ROOT / "assets" / "slide-01-signal-vs-noise.jpg"

W, H = 1400, 1050
PAPER = (250, 247, 240)
INK = (12, 10, 8)
INK_MID = (58, 46, 34)
INK_LIGHT = (118, 98, 78)
ACCENT = (0, 20, 255)

# Prefer steampunk factory (dense gauges / wires); fallback to proof pigeons office
BASE_CANDIDATES = [
    PUBLIC / "landing-steampunk-factory.png",
    PUBLIC / "proof-pigeons.png",
    PUBLIC / "landing-bandit-layer.png",
]


def load_base() -> Image.Image:
    for path in BASE_CANDIDATES:
        if path.exists():
            img = Image.open(path).convert("RGB")
            # Crop a busy vertical band and scale to slide aspect
            bw, bh = img.size
            crop = img.crop((int(bw * 0.08), int(bh * 0.05), int(bw * 0.92), int(bh * 0.95)))
            return ImageOps.fit(crop, (W, H), method=Image.Resampling.LANCZOS)
    return Image.new("RGB", (W, H), PAPER)


def to_sepia_engraving(img: Image.Image) -> Image.Image:
    img = ImageEnhance.Color(img).enhance(0.15)
    img = ImageOps.grayscale(img).convert("RGB")
    # Lift paper, deepen ink (newspaper print)
    img = ImageEnhance.Contrast(img).enhance(1.35)
    img = ImageEnhance.Brightness(img).enhance(1.08)
    px = img.load()
    for y in range(0, H, 1):
        for x in range(0, W, 1):
            r, g, b = px[x, y]
            lum = int(0.299 * r + 0.587 * g + 0.114 * b)
            # Warm newsprint ramp
            nr = min(255, int(lum * 1.02 + 18))
            ng = min(255, int(lum * 0.98 + 12))
            nb = min(255, int(lum * 0.88 + 6))
            px[x, y] = (nr, ng, nb)
    return img


def stipple_overlay(base: Image.Image, strength: float = 0.12) -> Image.Image:
    noise = Image.new("L", (W, H), 0)
    npx = noise.load()
    rng = random.Random(17)
    for y in range(H):
        for x in range(W):
            if rng.random() < strength:
                npx[x, y] = rng.randint(140, 220)
    noise = noise.filter(ImageFilter.GaussianBlur(0.6))
    dark = Image.new("RGB", (W, H), INK)
    return Image.composite(base, dark, noise.point(lambda v: 255 - v))


def draw_ticker_tape(draw: ImageDraw.ImageDraw, y: int, phase: float) -> None:
    x = 30
    rng = random.Random(int(y * 3))
    while x < W - 40:
        w = rng.randint(55, 140)
        draw.rectangle([x, y, x + w, y + 16], fill=(242, 236, 224), outline=INK_LIGHT, width=1)
        for i in range(4):
            draw.line([(x + 10 + i * 20, y + 5), (x + 26 + i * 20, y + 5)], fill=INK_MID, width=1)
        x += w + rng.randint(6, 18)


def draw_teletype_row(draw: ImageDraw.ImageDraw, y: int) -> None:
    rng = random.Random(y)
    x = 40
    while x < W - 120:
        w, h = rng.randint(90, 160), rng.randint(50, 80)
        draw.rectangle([x, y, x + w, y + h], outline=INK, width=2)
        draw.rectangle([x + 6, y + 8, x + w - 6, y + h - 18], outline=INK_MID, width=1)
        for row in range(4):
            draw.line([(x + 12, y + 14 + row * 10), (x + w - 12, y + 14 + row * 10)], fill=INK_LIGHT, width=1)
        for col in range(5):
            cx = x + 10 + col * ((w - 20) // 4)
            draw.ellipse([cx, y + h - 16, cx + 8, y + h - 6], outline=INK_MID, width=1)
        x += w + rng.randint(20, 40)


def draw_antenna(draw: ImageDraw.ImageDraw, x: int, y: int) -> None:
    draw.line([(x, y + 100), (x, y)], fill=INK, width=2)
    draw.arc([x - 55, y - 20, x + 55, y + 40], 205, 335, fill=INK, width=2)


def add_signal_beam(img: Image.Image) -> Image.Image:
    hx0, hy0, hx1, hy1 = 780, 300, 1120, 390
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    for spread in (100, 70, 42, 20):
        alpha = 22 if spread > 60 else 48
        gd.rounded_rectangle(
            [hx0 - spread, hy0 - spread, hx1 + spread, hy1 + spread],
            radius=10,
            fill=(*ACCENT, alpha),
        )
    gd.rounded_rectangle([hx0, hy0, hx1, hy1], radius=5, fill=(255, 252, 245, 245))
    for i in range(6):
        yy = hy0 + 12 + i * 11
        gd.line([(hx0 + 14, yy), (hx1 - 14, yy)], fill=(30, 28, 24, 200), width=2)
    out = Image.alpha_composite(img.convert("RGBA"), glow)
    draw = ImageDraw.Draw(out)
    draw.rounded_rectangle([hx0, hy0, hx1, hy1], radius=5, outline=INK, width=2)
    # Beam from lower-left editor toward headline
    beam = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    bd = ImageDraw.Draw(beam)
    bd.polygon(
        [(520, 700), (760, 520), (hx0 + 30, hy0 + 50), (hx1 - 30, hy1 + 10), (600, 720)],
        fill=(200, 215, 255, 40),
    )
    out = Image.alpha_composite(out, beam)
    return out.convert("RGB")


def fade_noise_keep_signal(img: Image.Image) -> Image.Image:
    hx0, hy0, hx1, hy1 = 780, 300, 1120, 390
    mask = Image.new("L", (W, H), 85)
    md = ImageDraw.Draw(mask)
    md.ellipse([hx0 - 140, hy0 - 120, hx1 + 200, hy1 + 220], fill=235)
    md.rectangle([0, 0, hx0 - 60, H], fill=55)
    md.rectangle([0, 0, W, int(H * 0.45)], fill=65)
    mask = mask.filter(ImageFilter.GaussianBlur(50))
    muted = ImageEnhance.Brightness(img).enhance(0.72)
    muted = ImageEnhance.Contrast(muted).enhance(0.9)
    return Image.composite(img, muted, mask)


def draw_editor_silhouette(draw: ImageDraw.ImageDraw) -> None:
    ex, ey = 480, 640
    draw.ellipse([ex - 32, ey - 82, ex + 32, ey - 14], fill=(245, 240, 232), outline=INK, width=2)
    draw.polygon(
        [(ex - 62, ey - 10), (ex + 62, ey - 10), (ex + 48, ey + 120), (ex - 48, ey + 120)],
        fill=(248, 244, 236),
        outline=INK,
    )
    draw.line([(ex - 85, ey + 30), (ex - 25, ey + 50)], fill=INK, width=3)
    draw.line([(ex + 20, ey + 45), (ex + 100, ey + 15)], fill=INK, width=3)


def main() -> None:
    random.seed(7)
    img = load_base()
    img = to_sepia_engraving(img)
    img = stipple_overlay(img, strength=0.09)

    draw = ImageDraw.Draw(img)
    # Newsroom layer — ticker cascades along lower third only (keep engraving readable)
    for row in range(5):
        draw_ticker_tape(draw, int(H * 0.58) + row * 34, row * 0.9)
    draw_teletype_row(draw, H - 185)
    draw_antenna(draw, 80, 160)
    draw_antenna(draw, 1320, 140)
    draw_editor_silhouette(draw)

    img = fade_noise_keep_signal(img)
    img = add_signal_beam(img)

    # Final print pass
    img = img.filter(ImageFilter.UnsharpMask(radius=1.2, percent=80, threshold=3))
    img = ImageEnhance.Contrast(img).enhance(1.05)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    img.save(OUT, format="JPEG", quality=92, optimize=True)
    print(f"Wrote {OUT} ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
