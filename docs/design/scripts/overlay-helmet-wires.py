"""v5 fork wiring: trunk below stack, branches up to 05 & 06 only."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "intelligence-signal-processing-bandit-helmet-v5.png"
OUT = ROOT / "intelligence-signal-processing-bandit-helmet-v8.png"

RIB = (94, 74, 50)
CORE = (48, 34, 20)

# Trunk runs below the stack (y=430), then branches rise on the left/right edge
LEFT = dict(start=(408, 430), fork=(536, 430), rail=(582, 430), l6=(592, 304), l5=(592, 344))
RIGHT = dict(start=(1128, 430), fork=(1000, 430), rail=(954, 430), l6=(944, 304), l5=(944, 344))


def lerp(a, b, t):
    return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)


def chain(*nodes):
    out = []
    for a, b in zip(nodes, nodes[1:]):
        seg = [lerp(a, b, i / 24) for i in range(25)]
        out.extend(seg[:-1])
    out.append(nodes[-1])
    return out


def tube(draw, nodes, w=10):
    p = chain(*nodes)
    draw.line(p, fill=RIB, width=w, joint="curve")
    draw.line(p, fill=CORE, width=2, joint="curve")


def side(draw, cfg, w_trunk=12):
    tube(draw, [cfg["start"], cfg["fork"], cfg["rail"]], w=w_trunk)
    tube(draw, [cfg["rail"], (cfg["rail"][0], cfg["l6"][1]), cfg["l6"]], w=9)
    tube(draw, [cfg["rail"], (cfg["rail"][0], cfg["l5"][1]), cfg["l5"]], w=9)


def main() -> None:
    img = Image.open(SRC).convert("RGB")
    draw = ImageDraw.Draw(img)
    side(draw, LEFT)
    side(draw, RIGHT)
    img.save(OUT, quality=95)
    print(f"Saved {OUT}")


if __name__ == "__main__":
    main()
