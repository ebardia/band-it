# Deck image assets

Generated art: **`slide 1.png` … `slide 10.png`** (space before number) in this folder.

Legacy naming `slide-01-*.jpg` still works as a fallback.

Google Slides cannot open a raw image file as a presentation — images are embedded in `.pptx` via `build_slide.py`.

## Regenerate slide 1 illustration

**OpenAI (recommended)** — add `OPENAI_API_KEY=sk-...` to repo root `.env`, then:

```bash
pip install openai
python docs/presentations/band-it-layer-deck/scripts/generate_slide_01_openai.py
python docs/presentations/band-it-layer-deck/scripts/build_slide.py 1
```

**Offline fallback** (PIL composite from site art):

```bash
python docs/presentations/band-it-layer-deck/scripts/generate_slide_01_illustration.py
```

Output: `slide-01-signal-vs-noise.jpg`. Legacy: `sync_assets.py 1` → `slide-01-newsroom-noise.jpg`.

## Rebuild deck after replacing an image

```bash
python docs/presentations/band-it-layer-deck/scripts/build_slide.py 1
```
