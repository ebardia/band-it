"""
Single-slide HTML preview (browser-friendly, no PowerPoint).
Matches newspaper deck styling; useful before Google Slides import.

Usage:
  python docs/presentations/band-it-layer-deck/scripts/build_html_slide.py 1
"""

from __future__ import annotations

import argparse
import base64
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SLIDES_DIR = ROOT / "slides"
ASSETS_DIR = ROOT / "assets"


def parse_slide_md(path: Path) -> dict:
    text = path.read_text(encoding="utf-8")
    headline_m = re.search(r"^## Headline\s*\n(.+?)(?=\n## )", text, re.M | re.S)
    kicker_m = re.search(r"^## Kicker.*\n(.+?)(?=\n## )", text, re.M | re.S)
    body_m = re.search(r"^## Body\s*\n(.+?)(?=\n## )", text, re.M | re.S)
    headline = headline_m.group(1).strip() if headline_m else path.stem
    kicker = kicker_m.group(1).strip() if kicker_m else ""
    body_raw = body_m.group(1).strip() if body_m else ""

    paragraphs: list[str] = []
    bullets: list[str] = []
    for block in re.split(r"\n\n+", body_raw):
        block = block.strip()
        if not block:
            continue
        lines = [ln.strip() for ln in block.split("\n") if ln.strip()]
        if all(ln.startswith("- ") for ln in lines):
            bullets.extend(ln[2:] for ln in lines)
        else:
            paragraphs.append(" ".join(lines))

    num = path.stem.split("-", 1)[0]
    matches = sorted(
        list(ASSETS_DIR.glob(f"slide-{num}-*.jpg"))
        + list(ASSETS_DIR.glob(f"slide-{num}-*.jpeg"))
        + list(ASSETS_DIR.glob(f"slide-{num}-*.png"))
    )
    asset = matches[-1] if matches else None
    caption_m = re.search(r"^## Fig caption\s*\n(.+?)(?=\n## )", text, re.M | re.S)
    fig_caption = caption_m.group(1).strip() if caption_m else f"Fig. {int(num)} — Signal desk"
    return {
        "num": num,
        "headline": headline,
        "kicker": kicker,
        "paragraphs": paragraphs,
        "bullets": bullets,
        "asset": asset,
        "fig_caption": fig_caption,
    }


def build_html(data: dict) -> str:
    img_b64 = ""
    if data["asset"] and data["asset"].exists():
        raw = data["asset"].read_bytes()
        mime = "image/jpeg" if data["asset"].suffix.lower() in (".jpg", ".jpeg") else "image/png"
        img_b64 = base64.b64encode(raw).decode("ascii")

    bullets_html = "".join(f"<li>{b}</li>" for b in data["bullets"])
    paras_html = "".join(f"<p>{p}</p>" for p in data["paragraphs"])

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Slide {data['num']} — Band It Layer</title>
  <style>
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #e8e8e8;
      font-family: Georgia, 'Times New Roman', serif;
    }}
    .slide {{
      width: min(1280px, 96vw);
      aspect-ratio: 16 / 9;
      background: #fafafa;
      color: #0a0a0a;
      padding: 2.5% 3%;
      display: grid;
      grid-template-columns: 1fr 42%;
      gap: 2%;
      box-shadow: 0 8px 32px rgba(0,0,0,.15);
    }}
    .rule {{ border-top: 2px solid #0a0a0a; margin-bottom: 4px; }}
    .rule-soft {{ border-top: 1px solid #e0e0e0; margin-bottom: 12px; }}
    .kicker {{
      font-family: Consolas, 'Courier New', monospace;
      font-size: 0.65rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #5c5c5c;
      margin-bottom: 10px;
    }}
    .headline-wrap {{
      display: flex;
      gap: 10px;
      align-items: flex-start;
      margin-bottom: 16px;
    }}
    .accent {{ width: 4px; background: #ffdd00; flex-shrink: 0; min-height: 3.2rem; }}
    h1 {{
      font-family: 'Arial Black', 'Arial Narrow', sans-serif;
      font-size: clamp(1.1rem, 2.2vw, 1.65rem);
      line-height: 1.15;
      margin: 0;
      font-weight: 900;
    }}
    .body p {{ margin: 0 0 0.65rem; font-size: clamp(0.75rem, 1.35vw, 0.95rem); line-height: 1.35; }}
    .body ul {{ margin: 0 0 0.65rem; padding-left: 1.2rem; font-size: clamp(0.72rem, 1.25vw, 0.9rem); }}
    .body li {{ margin-bottom: 0.2rem; }}
    .figure {{
      border: 1px solid #0a0a0a;
      background: #fff;
      padding: 6px;
      display: flex;
      flex-direction: column;
      height: 100%;
    }}
    .figure img {{
      width: 100%;
      flex: 1;
      object-fit: cover;
      object-position: center top;
      filter: sepia(0.12) contrast(1.04);
    }}
    .caption {{
      font-family: Consolas, monospace;
      font-size: 0.55rem;
      text-align: center;
      color: #5c5c5c;
      margin-top: 6px;
    }}
    .footer {{
      grid-column: 1 / -1;
      border-top: 1px solid #0a0a0a;
      padding-top: 6px;
      text-align: right;
      font-family: Consolas, monospace;
      font-size: 0.55rem;
      color: #0014ff;
      letter-spacing: 0.08em;
    }}
  </style>
</head>
<body>
  <article class="slide">
    <div class="text-col">
      <div class="rule"></div>
      <div class="rule-soft"></div>
      <p class="kicker">{data['kicker']}</p>
      <div class="headline-wrap">
        <div class="accent" aria-hidden="true"></div>
        <h1>{data['headline']}</h1>
      </div>
      <div class="body">
        {paras_html}
        <ul>{bullets_html}</ul>
      </div>
    </div>
    <figure class="figure">
      <img src="data:{mime};base64,{img_b64}" alt="Fig. {data['num']}" />
      <figcaption class="caption">{data['fig_caption']}</figcaption>
    </figure>
    <footer class="footer">THE BAND IT LAYER</footer>
  </article>
</body>
</html>
"""


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("num", default="1", nargs="?")
    args = parser.parse_args()
    matches = list(SLIDES_DIR.glob(f"{args.num.zfill(2)}-*.md"))
    if not matches:
        raise SystemExit(f"No slide file for {args.num}")
    data = parse_slide_md(matches[0])
    out = ROOT / f"slide-{args.num.zfill(2)}-preview.html"
    out.write_text(build_html(data), encoding="utf-8")
    print(out)


if __name__ == "__main__":
    main()
