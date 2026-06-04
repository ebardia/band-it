# Import this deck into Google Slides (no PowerPoint license needed)

Google Slides opens `.pptx` files in the browser. You do **not** need Microsoft PowerPoint installed.

## Slide 1 (style preview)

1. Open [Google Drive](https://drive.google.com).
2. **New → File upload** and choose:
   - `band-it-layer-deck-slide-01.pptx` (in this folder)
3. Double-click the uploaded file → **Open with → Google Slides**.
4. Or: open [Google Slides](https://slides.google.com) → **File → Import slides → Upload** → select the `.pptx`.

Fonts may substitute (Arial Black / Georgia / Consolas are standard on Google’s side). Colors and layout should carry over.

## Replace the illustration

The image is a separate PNG in `assets/`. To swap art on a slide in Google Slides:

1. Click the picture → **Replace image → Upload from computer**
2. Use the matching file, e.g. `assets/slide-01-newsroom-noise.png`

## Rebuild after copy or image changes

```bash
python docs/presentations/band-it-layer-deck/scripts/build_slide.py 1
```

Then re-import or replace the slide in your Google Slides deck.

## Full deck (when all 10 slides are ready)

```bash
python docs/presentations/band-it-layer-deck/scripts/build_slide.py --all
```

Upload `band-it-layer-deck.pptx` the same way.
