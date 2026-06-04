# Deck image assets

One PNG per slide, named `slide-NN-<short-name>.png` (e.g. `slide-01-newsroom-noise.png`).

## Regenerate slide 1 from site art

```bash
python docs/presentations/band-it-layer-deck/scripts/sync_assets.py 1
```

Source: `apps/web/public/waiting-room-line.png` (sepia treatment).

## Rebuild deck after replacing an image

```bash
python docs/presentations/band-it-layer-deck/scripts/build_slide.py 1
```
