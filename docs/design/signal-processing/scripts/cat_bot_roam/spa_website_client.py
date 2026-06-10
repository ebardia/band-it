from __future__ import annotations

import sys
from datetime import datetime, timezone
from pathlib import Path

from .models import EvidenceItem, MedSpa

_SCRIPT_DIR = Path(__file__).resolve().parents[1]
if str(_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_DIR))

from band_it_outbound.fetch import fetch_website_text  # noqa: E402


def collect_for_spa(spa: MedSpa, *, max_chars: int = 8000) -> tuple[list[EvidenceItem], list[str]]:
    url = (spa.website or "").strip()
    if not url:
        return [], [f"spa_website: no URL for {spa.spa_name}"]

    text = fetch_website_text(url)
    warnings: list[str] = []
    if not text or text.startswith("[fetch_failed"):
        return [], [f"spa_website {url}: {text or 'empty'}"]

    # Pull a few signal-rich snippets for the packet (VIP, physician, services).
    lowered = text.lower()
    snippets: list[str] = []
    for needle in (
        "vip",
        "physician",
        "since 1998",
        "botox",
        "consult",
        "zo skin",
        "venus",
        "cherry",
        "river",
    ):
        idx = lowered.find(needle)
        if idx >= 0:
            start = max(0, idx - 80)
            end = min(len(text), idx + 220)
            snippet = text[start:end].strip()
            if snippet and snippet not in snippets:
                snippets.append(snippet)

    body = text[:max_chars]
    if snippets:
        body = " | ".join(snippets[:6]) + "\n\n---\n\n" + body[:4000]

    items = [
        EvidenceItem(
            source="spa_website",
            source_url=url if url.startswith("http") else f"https://{url}",
            title=f"Spa website — {spa.spa_name}",
            text=body,
            observed_at=datetime.now(timezone.utc).isoformat(),
            spa_name=spa.spa_name,
            metadata={"url": url},
        )
    ]
    return items, warnings
