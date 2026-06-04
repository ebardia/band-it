"""
Copy / process site illustrations into deck assets/.

Usage:
  python docs/presentations/band-it-layer-deck/scripts/sync_assets.py 1
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from PIL import Image, ImageEnhance

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parents[2]
ASSETS = ROOT / "assets"
PUBLIC = REPO / "apps" / "web" / "public"

SLIDE_SOURCES: dict[str, tuple[Path, str]] = {
    "1": (PUBLIC / "waiting-room-line.png", "slide-01-newsroom-noise.png"),
}


def sepia_copy(src: Path, dst: Path) -> None:
    img = Image.open(src).convert("RGB")
    w, h = img.size
    img = img.crop((int(w * 0.05), 0, w - int(w * 0.05), h))
    img = ImageEnhance.Color(img).enhance(0.4)
    img = ImageEnhance.Contrast(img).enhance(1.1)
    ASSETS.mkdir(parents=True, exist_ok=True)
    img.save(dst, optimize=True)
    print(f"Wrote {dst} ({dst.stat().st_size} bytes)")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("num", help="Slide number, e.g. 1")
    args = parser.parse_args()
    entry = SLIDE_SOURCES.get(args.num)
    if not entry:
        print(f"No source mapped for slide {args.num}", file=sys.stderr)
        sys.exit(1)
    src, name = entry
    if not src.exists():
        print(f"Missing source image: {src}", file=sys.stderr)
        sys.exit(1)
    sepia_copy(src, ASSETS / name)


if __name__ == "__main__":
    main()
