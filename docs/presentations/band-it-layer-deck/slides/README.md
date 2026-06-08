# Slide copy archive

| # | Markdown | Asset | Status |
|---|----------|-------|--------|
| 1 | `01-hero.md` | `assets/slide 1.png` | Image-only hero |
| 2 | `02-problem.md` | `assets/slide 2.png` | The problem (signals in noise) |
| 3 | `03-introducing.md` | `assets/slide 3.png` | Introducing Band It |
| 4–10 | `04-*.md` … | `assets/slide N.png` | Paste copy when ready |

## Build

```bash
# Slides 1–2 (current)
python docs/presentations/band-it-layer-deck/scripts/build_slide.py 1 2

# Full deck when all markdown files exist
python docs/presentations/band-it-layer-deck/scripts/build_slide.py --all
```

Output: `band-it-layer-deck-slides-01-02.pptx` or `band-it-layer-deck.pptx`
