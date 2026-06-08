from __future__ import annotations

import re
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from urllib.parse import quote_plus

from .env import env
from .http_util import request_json, request_text
from .models import EvidenceItem


def _api_key() -> str | None:
    return env("BRAVE_SEARCH_API_KEY") or None


def web_search(query: str, *, count: int = 5) -> list[dict]:
    api_key = _api_key()
    if not api_key:
        raise RuntimeError("missing BRAVE_SEARCH_API_KEY")

    q = quote_plus(query)
    _, payload = request_json(
        f"https://api.search.brave.com/res/v1/web/search?q={q}&count={count}",
        headers={"X-Subscription-Token": api_key, "Accept": "application/json"},
    )
    return payload.get("web", {}).get("results") or []


def collect_discovery(
    queries: list[str],
    *,
    max_results: int = 5,
    max_fetch: int = 3,
) -> tuple[list[EvidenceItem], list[str]]:
    if not _api_key():
        return [], ["brave: skipped (set BRAVE_SEARCH_API_KEY)"]

    warnings: list[str] = []
    items: list[EvidenceItem] = []
    seen_urls: set[str] = set()
    fetch_budget = max_fetch

    for query in queries:
        try:
            results = web_search(query, count=max_results)
        except RuntimeError as exc:
            warnings.append(f"brave '{query}': {exc}")
            continue

        for hit in results:
            url = hit.get("url") or ""
            if not url or url in seen_urls:
                continue
            seen_urls.add(url)
            title = hit.get("title") or url
            snippet = hit.get("description") or ""
            items.append(
                EvidenceItem(
                    source="brave_search",
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
                            metadata={"query": query},
                        )
                    )
                    fetch_budget -= 1
            except Exception as exc:  # noqa: BLE001 — lab script; keep roaming
                warnings.append(f"fetch {url}: {exc}")

    return items, warnings


def collect_news_rss(query: str, *, max_items: int = 8) -> tuple[list[EvidenceItem], list[str]]:
    warnings: list[str] = []
    items: list[EvidenceItem] = []
    url = (
        "https://news.google.com/rss/search?"
        f"q={quote_plus(query)}&hl=en-US&gl=US&ceid=US:en"
    )
    try:
        xml_text = request_text(url)
        root = ET.fromstring(xml_text)
    except (RuntimeError, ET.ParseError) as exc:
        return [], [f"news_rss '{query}': {exc}"]

    for item in root.findall(".//item")[:max_items]:
        title = (item.findtext("title") or "").strip()
        link = (item.findtext("link") or "").strip()
        pub = (item.findtext("pubDate") or "").strip()
        desc = re.sub(r"<[^>]+>", " ", item.findtext("description") or "")
        desc = re.sub(r"\s+", " ", desc).strip()
        if not link:
            continue
        items.append(
            EvidenceItem(
                source="news_rss",
                source_url=link,
                title=title,
                text=(desc or title)[:2000],
                observed_at=pub or datetime.now(timezone.utc).isoformat(),
                metadata={"query": query},
            )
        )

    return items, warnings
