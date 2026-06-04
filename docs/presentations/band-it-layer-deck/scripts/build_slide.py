"""
Build one or more Band It Layer deck slides as .pptx (1950s newspaper style).

Usage:
  python docs/presentations/band-it-layer-deck/scripts/build_slide.py 1
  python docs/presentations/band-it-layer-deck/scripts/build_slide.py 1 2 3
  python docs/presentations/band-it-layer-deck/scripts/build_slide.py --all
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.util import Inches, Pt

ROOT = Path(__file__).resolve().parents[1]
SLIDES_DIR = ROOT / "slides"
ASSETS_DIR = ROOT / "assets"
OUTPUT_DIR = ROOT

# Band It newspaper tokens
PAPER = RGBColor(0xFA, 0xFA, 0xFA)
INK = RGBColor(0x0A, 0x0A, 0x0A)
MUTED = RGBColor(0x5C, 0x5C, 0x5C)
ACCENT = RGBColor(0x00, 0x14, 0xFF)
NEON = RGBColor(0xFF, 0xDD, 0x00)
RULE_SOFT = RGBColor(0xE0, 0xE0, 0xE0)

FONT_HEADLINE = "Arial Black"
FONT_BODY = "Georgia"
FONT_KICKER = "Consolas"


def parse_slide_md(path: Path) -> dict:
    text = path.read_text(encoding="utf-8")
    headline_m = re.search(r"^## Headline\s*\n(.+?)(?=\n## )", text, re.M | re.S)
    kicker_m = re.search(r"^## Kicker.*\n(.+?)(?=\n## )", text, re.M | re.S)
    body_m = re.search(r"^## Body\s*\n(.+?)(?=\n## )", text, re.M | re.S)

    headline = (headline_m.group(1).strip() if headline_m else path.stem)
    kicker = (kicker_m.group(1).strip() if kicker_m else "")
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

    slug = path.stem  # e.g. 01-problem
    num = slug.split("-", 1)[0]
    matches = sorted(ASSETS_DIR.glob(f"slide-{num}-*.png"))
    asset = matches[-1] if matches else None
    caption_m = re.search(r"^## (?:Image caption|Fig caption)\s*\n(.+?)(?=\n## )", text, re.M | re.S)
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


def _add_textbox(slide, left, top, width, height):
    return slide.shapes.add_textbox(left, top, width, height)


def _style_run(run, *, size: int, bold: bool = False, color=INK, font: str = FONT_BODY):
    run.font.name = font
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = color


def add_slide(prs: Presentation, data: dict) -> None:
    blank = prs.slide_layouts[6]
    slide = prs.slides.add_slide(blank)

    # Background
    slide.background.fill.solid()
    slide.background.fill.fore_color.rgb = PAPER

    sw = prs.slide_width
    sh = prs.slide_height
    margin = Inches(0.55)
    content_w = sw - margin * 2

    # Top rules (masthead)
    rule = slide.shapes.add_shape(1, margin, Inches(0.42), content_w, Pt(2))
    rule.fill.solid()
    rule.fill.fore_color.rgb = INK
    rule.line.fill.background()

    rule2 = slide.shapes.add_shape(1, margin, Inches(0.48), content_w, Pt(1))
    rule2.fill.solid()
    rule2.fill.fore_color.rgb = RULE_SOFT
    rule2.line.fill.background()

    # Kicker
    if data["kicker"]:
        kbox = _add_textbox(slide, margin, Inches(0.58), content_w, Inches(0.35))
        ktf = kbox.text_frame
        ktf.clear()
        p = ktf.paragraphs[0]
        r = p.add_run()
        r.text = data["kicker"].upper()
        _style_run(r, size=9, color=MUTED, font=FONT_KICKER)
        p.alignment = PP_ALIGN.LEFT

    # Layout: text left ~58%, image right ~40%
    text_left = margin
    text_w = int(content_w * 0.56)
    img_left = text_left + text_w + Inches(0.2)
    img_w = content_w - text_w - Inches(0.2)

    # Yellow accent bar (briefing box)
    accent = slide.shapes.add_shape(1, text_left, Inches(1.05), Pt(4), Inches(1.55))
    accent.fill.solid()
    accent.fill.fore_color.rgb = NEON
    accent.line.fill.background()

    # Headline
    hbox = _add_textbox(slide, text_left + Inches(0.14), Inches(1.0), text_w - Inches(0.14), Inches(1.6))
    htf = hbox.text_frame
    htf.word_wrap = True
    htf.clear()
    hp = htf.paragraphs[0]
    hr = hp.add_run()
    hr.text = data["headline"]
    _style_run(hr, size=22, bold=True, font=FONT_HEADLINE)
    hp.line_spacing = 1.05

    # Body
    body_top = Inches(2.75)
    body_h = sh - body_top - Inches(0.55)
    bbox = _add_textbox(slide, text_left, body_top, text_w, body_h)
    btf = bbox.text_frame
    btf.word_wrap = True
    btf.vertical_anchor = MSO_ANCHOR.TOP
    btf.clear()
    first = True

    for para in data["paragraphs"]:
        p = btf.paragraphs[0] if first else btf.add_paragraph()
        first = False
        r = p.add_run()
        r.text = para
        _style_run(r, size=13, font=FONT_BODY)
        p.space_after = Pt(10)
        p.line_spacing = 1.15

    for bullet in data["bullets"]:
        p = btf.paragraphs[0] if first else btf.add_paragraph()
        first = False
        p.level = 0
        r = p.add_run()
        r.text = bullet
        _style_run(r, size=12, font=FONT_BODY)
        p.space_after = Pt(4)
        p.line_spacing = 1.1

    # Image + caption frame
    if data["asset"] and data["asset"].exists():
        frame = slide.shapes.add_shape(
            1, img_left, Inches(1.0), img_w, Inches(5.85)
        )
        frame.fill.solid()
        frame.fill.fore_color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
        frame.line.color.rgb = INK
        frame.line.width = Pt(1)

        pic = slide.shapes.add_picture(
            str(data["asset"]),
            img_left + Inches(0.08),
            Inches(1.12),
            width=img_w - Inches(0.16),
            height=Inches(5.35),
        )

        cap = _add_textbox(slide, img_left, Inches(6.55), img_w, Inches(0.35))
        ctf = cap.text_frame
        ctf.clear()
        cp = ctf.paragraphs[0]
        cr = cp.add_run()
        cr.text = data.get("fig_caption", f"Fig. {data['num']} — Signal desk")
        _style_run(cr, size=8, color=MUTED, font=FONT_KICKER)
        cp.alignment = PP_ALIGN.CENTER

    # Footer rule
    foot = slide.shapes.add_shape(1, margin, sh - Inches(0.38), content_w, Pt(1))
    foot.fill.solid()
    foot.fill.fore_color.rgb = INK
    foot.line.fill.background()

    brand = _add_textbox(slide, margin, sh - Inches(0.34), content_w, Inches(0.28))
    btf2 = brand.text_frame
    btf2.clear()
    bp = btf2.paragraphs[0]
    br = bp.add_run()
    br.text = "THE BAND IT LAYER"
    _style_run(br, size=8, color=ACCENT, font=FONT_KICKER)
    bp.alignment = PP_ALIGN.RIGHT


def build(slide_nums: list[str], out_name: str) -> Path:
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)

    for num in slide_nums:
        matches = list(SLIDES_DIR.glob(f"{num.zfill(2)}-*.md"))
        if not matches:
            matches = list(SLIDES_DIR.glob(f"{num}-*.md"))
        if not matches:
            raise FileNotFoundError(f"No slide markdown for number {num}")
        add_slide(prs, parse_slide_md(matches[0]))

    out = OUTPUT_DIR / out_name
    prs.save(out)
    return out


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("slides", nargs="*", help="Slide numbers e.g. 1 2 3")
    parser.add_argument("--all", action="store_true", help="Build all slides in slides/")
    args = parser.parse_args()

    if args.all:
        nums = sorted({p.name.split("-", 1)[0] for p in SLIDES_DIR.glob("*.md") if p.name != "README.md"})
        out_name = "band-it-layer-deck.pptx"
    elif args.slides:
        nums = args.slides
        out_name = "band-it-layer-deck-slide-{:02d}.pptx".format(int(nums[0])) if len(nums) == 1 else "band-it-layer-deck.pptx"
    else:
        parser.error("Provide slide numbers or --all")

    path = build(nums, out_name)
    print(path)


if __name__ == "__main__":
    main()
