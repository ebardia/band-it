"""
Export a single slide as PDF (Google Slides imports PDF pages well).

Usage:
  python docs/presentations/band-it-layer-deck/scripts/build_pdf_slide.py 1
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path

from reportlab.lib.colors import HexColor
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas

ROOT = Path(__file__).resolve().parents[1]
SLIDES_DIR = ROOT / "slides"
ASSETS_DIR = ROOT / "assets"

PAPER = HexColor("#FAFAFA")
INK = HexColor("#0A0A0A")
MUTED = HexColor("#5C5C5C")
ACCENT = HexColor("#0014FF")
NEON = HexColor("#FFDD00")

W = 13.333 * inch
H = 7.5 * inch
MARGIN = 0.55 * inch


def parse_slide_md(path: Path) -> dict:
    text = path.read_text(encoding="utf-8")
    headline_m = re.search(r"^## Headline\s*\n(.+?)(?=\n## )", text, re.M | re.S)
    kicker_m = re.search(r"^## Kicker.*\n(.+?)(?=\n## )", text, re.M | re.S)
    body_m = re.search(r"^## Body\s*\n(.+?)(?=\n## )", text, re.M | re.S)
    caption_m = re.search(r"^## Fig caption\s*\n(.+?)(?=\n## )", text, re.M | re.S)

    headline = headline_m.group(1).strip() if headline_m else path.stem
    kicker = kicker_m.group(1).strip() if kicker_m else ""
    body_raw = body_m.group(1).strip() if body_m else ""
    fig_caption = caption_m.group(1).strip() if caption_m else "Fig. 1"

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
    return {
        "num": num,
        "headline": headline,
        "kicker": kicker,
        "paragraphs": paragraphs,
        "bullets": bullets,
        "asset": matches[-1] if matches else None,
        "fig_caption": fig_caption,
    }


def wrap_text(c: canvas.Canvas, text: str, x: float, y: float, max_width: float, font: str, size: int, leading: float) -> float:
    c.setFont(font, size)
    words = text.split()
    line = ""
    cy = y
    for word in words:
        trial = f"{line} {word}".strip()
        if c.stringWidth(trial, font, size) <= max_width:
            line = trial
        else:
            if line:
                c.drawString(x, cy, line)
                cy -= leading
            line = word
    if line:
        c.drawString(x, cy, line)
        cy -= leading
    return cy


def build_pdf(data: dict, out: Path) -> None:
    c = canvas.Canvas(str(out), pagesize=(W, H))
    c.setFillColor(PAPER)
    c.rect(0, 0, W, H, fill=1, stroke=0)

    content_w = W - 2 * MARGIN
    y = H - 0.55 * inch
    c.setStrokeColor(INK)
    c.setLineWidth(2)
    c.line(MARGIN, y, MARGIN + content_w, y)
    y -= 8
    c.setLineWidth(1)
    c.setStrokeColor(HexColor("#E0E0E0"))
    c.line(MARGIN, y, MARGIN + content_w, y)
    y -= 22

    if data["kicker"]:
        c.setFillColor(MUTED)
        c.setFont("Courier", 9)
        c.drawString(MARGIN, y, data["kicker"].upper())
        y -= 18

    text_w = content_w * 0.56
    img_x = MARGIN + text_w + 0.2 * inch
    img_w = content_w - text_w - 0.2 * inch

    c.setFillColor(NEON)
    c.rect(MARGIN, y - 1.1 * inch, 3, 1.1 * inch, fill=1, stroke=0)

    c.setFillColor(INK)
    y_head = y
    y = wrap_text(c, data["headline"], MARGIN + 10, y_head, text_w - 14, "Helvetica-Bold", 20, 24)

    y -= 12
    c.setFont("Times-Roman", 11)
    c.setFillColor(INK)
    for para in data["paragraphs"]:
        y = wrap_text(c, para, MARGIN, y, text_w, "Times-Roman", 11, 14)
        y -= 4
    for bullet in data["bullets"]:
        y = wrap_text(c, f"• {bullet}", MARGIN + 8, y, text_w - 8, "Times-Roman", 10, 13)

    if data["asset"] and data["asset"].exists():
        top = H - 1.0 * inch
        frame_h = 5.85 * inch
        c.setStrokeColor(INK)
        c.setLineWidth(1)
        c.rect(img_x, top - frame_h, img_w, frame_h, fill=0, stroke=1)
        pad = 0.08 * inch
        c.drawImage(
            str(data["asset"]),
            img_x + pad,
            top - frame_h + pad,
            width=img_w - 2 * pad,
            height=frame_h - 0.5 * inch,
            preserveAspectRatio=True,
            anchor="n",
        )
        c.setFillColor(MUTED)
        c.setFont("Courier", 8)
        cap_w = c.stringWidth(data["fig_caption"], "Courier", 8)
        c.drawString(img_x + (img_w - cap_w) / 2, top - frame_h - 0.38 * inch, data["fig_caption"])

    c.setStrokeColor(INK)
    c.line(MARGIN, 0.42 * inch, MARGIN + content_w, 0.42 * inch)
    c.setFillColor(ACCENT)
    c.setFont("Courier", 8)
    brand = "THE BAND IT LAYER"
    c.drawRightString(MARGIN + content_w, 0.28 * inch, brand)

    c.showPage()
    c.save()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("num", default="1", nargs="?")
    args = parser.parse_args()
    matches = list(SLIDES_DIR.glob(f"{args.num.zfill(2)}-*.md"))
    if not matches:
        raise SystemExit(f"No slide file for {args.num}")
    data = parse_slide_md(matches[0])
    out = ROOT / f"band-it-layer-deck-slide-{args.num.zfill(2)}.pdf"
    build_pdf(data, out)
    print(out)


if __name__ == "__main__":
    main()
