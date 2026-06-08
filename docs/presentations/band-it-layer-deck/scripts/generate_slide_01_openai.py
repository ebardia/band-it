"""
Generate slide-01 illustration via OpenAI Images API.

Requires OPENAI_API_KEY in repo .env or environment.

Usage:
  pip install openai
  python docs/presentations/band-it-layer-deck/scripts/generate_slide_01_openai.py
  python docs/presentations/band-it-layer-deck/scripts/build_slide.py 1
"""

from __future__ import annotations

import base64
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parents[2]
SLIDE_MD = ROOT / "slides" / "01-problem.md"
STYLE_MD = ROOT / "STYLE.md"
OUT = ROOT / "assets" / "slide-01-signal-vs-noise.jpg"

STYLE_SUFFIX = (
    "Vintage 1950s newspaper engraving, sepia ink illustration, brass and vacuum-tube "
    "retro-future, whimsical but dignified, crosshatch print texture, no modern UI, "
    "no photorealistic faces, editorial figure caption style. Match Band It landing page "
    "newspaper art: stippled sepia woodcut, atom-age pulp sci-fi, electric blue #0014FF "
    "accent only on the one highlighted headline."
)


def load_dotenv() -> None:
    for path in (
        REPO / ".env",
        REPO / ".env.local",
        REPO / "apps" / "api" / ".env",
        REPO / "apps" / "web" / ".env.local",
    ):
        if not path.exists():
            continue
        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, val = line.partition("=")
            key = key.strip()
            val = val.strip().strip('"').strip("'").strip()
            if key and key not in os.environ:
                os.environ[key] = val


def parse_prompt() -> str:
    text = SLIDE_MD.read_text(encoding="utf-8")
    m = re.search(r"^## Image prompt\s*\n(.+?)(?=\n## )", text, re.M | re.S)
    base = m.group(1).strip() if m else ""
    if not base:
        m2 = re.search(r"^## Illustration concept\s*\n(.+?)(?=\n## )", text, re.M | re.S)
        base = m2.group(1).strip() if m2 else "1950s newsroom signal vs noise"
    return f"{base} {STYLE_SUFFIX}"


def main() -> None:
    load_dotenv()
    api_key = os.environ.get("OPENAI_API_KEY", "").strip().strip("\ufeff")
    if not api_key:
        print(
            "Missing OPENAI_API_KEY. Add to .env:\n  OPENAI_API_KEY=sk-...",
            file=sys.stderr,
        )
        sys.exit(1)

    try:
        from openai import OpenAI
    except ImportError:
        print("Install: pip install openai", file=sys.stderr)
        sys.exit(1)

    prompt = parse_prompt()
    print("Prompt length:", len(prompt))

    client = OpenAI(api_key=api_key)
    attempts = [
        ("gpt-image-1", {"size": "1536x1024", "quality": "high"}),
        ("dall-e-3", {"size": "1792x1024", "quality": "hd"}),
    ]
    response = None
    last_err: Exception | None = None
    for model, kwargs in attempts:
        print(f"Calling OpenAI Images API ({model})...")
        try:
            response = client.images.generate(model=model, prompt=prompt, n=1, **kwargs)
            break
        except Exception as exc:
            last_err = exc
            print(f"  {model} failed: {exc}", file=sys.stderr)
    if response is None:
        err = str(last_err or "")
        if "401" in err or "403" in err or "Not authorized" in err or "verified" in err.lower():
            print(
                "\nImage API blocked for this org. Fix at:\n"
                "  https://platform.openai.com/settings/organization/general\n"
                "  → Verify Organization, then create a new API key.\n"
                "Offline fallback:\n"
                "  python docs/presentations/band-it-layer-deck/scripts/generate_slide_01_illustration.py",
                file=sys.stderr,
            )
        raise last_err or RuntimeError("Image generation failed")

    item = response.data[0]
    if item.b64_json:
        raw = base64.b64decode(item.b64_json)
    elif item.url:
        import urllib.request

        raw = urllib.request.urlopen(item.url).read()
    else:
        print("No image data in response", file=sys.stderr)
        sys.exit(1)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_bytes(raw)

    # Normalize to JPEG for pptx pipeline
    from PIL import Image

    img = Image.open(OUT)
    if img.mode not in ("RGB", "L"):
        img = img.convert("RGB")
    img.save(OUT, format="JPEG", quality=92, optimize=True)
    print(f"Wrote {OUT} ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
