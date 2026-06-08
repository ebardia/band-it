# Open this deck in Google Slides (no PowerPoint license)

**Do not upload a `.png` or `.jpg` file to create a presentation** — Google Slides only treats those as pictures, not as a full slide deck.

Use one of these instead:

## Option A — Import `.pptx` (recommended)

1. Open [Google Slides](https://slides.google.com) → **Blank presentation**
2. **File → Import slides → Upload**
3. Choose `band-it-layer-deck-slide-01.pptx` (in this folder)
4. Select **Replace slides** or **Append**

Illustrations are embedded as **JPEG** inside the file (better compatibility than loose PNG uploads).

## Option B — Import `.pdf`

If `.pptx` import looks wrong:

1. Build the PDF:
   ```bash
   pip install reportlab
   python docs/presentations/band-it-layer-deck/scripts/build_pdf_slide.py 1
   ```
2. In Google Slides: **File → Import slides → Upload** → `band-it-layer-deck-slide-01.pdf`

Each PDF page becomes one slide (layout is flattened; text may not be editable).

## Option C — Browser preview (no Google account)

Open `slide-01-preview.html` in Chrome/Edge to check layout and copy.

## Replace the illustration inside Google Slides

1. Click the picture on the slide
2. **Replace image → Upload from computer**
3. Use `assets/slide-01-newsroom-noise.jpg` (JPEG, not PNG)

## Regenerate assets and deck

```bash
python docs/presentations/band-it-layer-deck/scripts/sync_assets.py 1
python docs/presentations/band-it-layer-deck/scripts/build_slide.py 1
python docs/presentations/band-it-layer-deck/scripts/build_pdf_slide.py 1
python docs/presentations/band-it-layer-deck/scripts/build_html_slide.py 1
```

## Full deck (when all 10 slides are ready)

```bash
python docs/presentations/band-it-layer-deck/scripts/build_slide.py --all
```

Upload `band-it-layer-deck.pptx` the same way as Option A.
