# Deck image assets

One **JPEG** per slide, named `slide-NN-<short-name>.jpg` (e.g. `slide-01-newsroom-noise.jpg`).

Google Slides cannot open a raw image file as a presentation — JPEGs are embedded in `.pptx` / used when you **Replace image** on a slide.

## Regenerate slide 1 from site art

```bash
python docs/presentations/band-it-layer-deck/scripts/sync_assets.py 1
```

Source: `apps/web/public/waiting-room-line.png` (sepia treatment).

## Rebuild deck after replacing an image

```bash
python docs/presentations/band-it-layer-deck/scripts/build_slide.py 1
```
