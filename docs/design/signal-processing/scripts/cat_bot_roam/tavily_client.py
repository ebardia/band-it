from __future__ import annotations

import sys
from datetime import datetime, timezone
from pathlib import Path

from .env import env
from .http_util import request_json
from .models import EvidenceItem

_SCRIPT_DIR = Path(__file__).resolve().parents[1]
if str(_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_DIR))


def _api_key() -> str | None:
    return env("TAVILY_API_KEY") or None


def tavily_search(query: str, *, max_results: int = 5) -> list[dict]:
    api_key = _api_key()
    if not api_key:
        raise RuntimeError("missing TAVILY_API_KEY")

    _, payload = request_json(
        "https://api.tavily.com/search",
        method="POST",
        headers={"Content-Type": "application/json"},
        data={
            "api_key": api_key,
            "query": query,
            "search_depth": "basic",
            "max_results": max_results,
            "include_answer": False,
        },
        timeout_sec=45,
    )
    return payload.get("results") or []


def collect_tavily(
    queries: list[str],
    *,
    max_results: int = 5,
    max_fetch: int = 2,
) -> tuple[list[EvidenceItem], list[str]]:
    if not _api_key():
        return [], ["tavily: skipped (set TAVILY_API_KEY)"]

    warnings: list[str] = []
    items: list[EvidenceItem] = []
    seen_urls: set[str] = set()
    fetch_budget = max_fetch

    for query in queries:
        try:
            results = tavily_search(query, max_results=max_results)
        except RuntimeError as exc:
            warnings.append(f"tavily '{query}': {exc}")
            continue

        for hit in results:
            url = hit.get("url") or ""
            if not url or url in seen_urls:
                continue
            seen_urls.add(url)
            title = hit.get("title") or url
            snippet = hit.get("content") or hit.get("snippet") or ""
            items.append(
                EvidenceItem(
                    source="tavily_search",
                    source_url=url,
                    title=title,
                    text=snippet[:2000],
                    observed_at=datetime.now(timezone.utc).isoformat(),
                    metadata={"query": query},
                )
            )

            if fetch_budget <= 0:
                continue
            if "reddit.com" in url or "yelp.com" in url or "google.com/maps" in url:
                continue
            if "thepotomacskincare.com" in url:
                continue

            try:
                from band_it_outbound.fetch import fetch_website_text

                page_text = fetch_website_text(url)
                if page_text and not page_text.startswith("[fetch_failed"):
                    items.append(
                        EvidenceItem(
                            source="web_fetch",
                            source_url=url,
                            title=f"Fetched page — {title}",
                            text=page_text[:6000],
                            observed_at=datetime.now(timezone.utc).isoformat(),
                            metadata={"query": query, "via": "tavily"},
                        )
                    )
                    fetch_budget -= 1
            except Exception as exc:  # noqa: BLE001 — lab script
                warnings.append(f"fetch {url}: {exc}")

    return items, warnings
