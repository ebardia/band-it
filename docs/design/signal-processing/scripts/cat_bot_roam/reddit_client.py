from __future__ import annotations

import base64
import time
from datetime import datetime, timezone
from urllib.parse import urlencode
from typing import Any

from .env import env
from .http_util import request_json
from .models import EvidenceItem

_TOKEN: str | None = None
_TOKEN_EXPIRES = 0.0


def _token() -> str | None:
    global _TOKEN, _TOKEN_EXPIRES
    client_id = env("REDDIT_CLIENT_ID")
    client_secret = env("REDDIT_CLIENT_SECRET")
    if not client_id or not client_secret:
        return None

    now = time.time()
    if _TOKEN and now < _TOKEN_EXPIRES - 30:
        return _TOKEN

    basic = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()
    _, payload = request_json(
        "https://www.reddit.com/api/v1/access_token",
        method="POST",
        headers={"Authorization": f"Basic {basic}"},
        form={"grant_type": "client_credentials"},
    )
    _TOKEN = payload.get("access_token")
    _TOKEN_EXPIRES = now + float(payload.get("expires_in", 3600))
    return _TOKEN


def _oauth_get(path: str, params: dict[str, str]) -> dict[str, Any]:
    token = _token()
    if not token:
        raise RuntimeError("missing REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET")

    query = urlencode(params)
    url = f"https://oauth.reddit.com{path}?{query}"
    _, payload = request_json(
        url,
        headers={"Authorization": f"Bearer {token}"},
    )
    return payload


def search_posts(
    query: str,
    *,
    subreddit: str | None = None,
    limit: int = 10,
) -> list[EvidenceItem]:
    params = {
        "q": query,
        "sort": "relevance",
        "limit": str(min(limit, 25)),
        "restrict_sr": "true" if subreddit else "false",
        "type": "link",
    }
    if subreddit:
        path = f"/r/{subreddit}/search"
    else:
        path = "/search"

    payload = _oauth_get(path, params)
    items: list[EvidenceItem] = []
    for child in payload.get("data", {}).get("children", []):
        post = child.get("data", {})
        permalink = post.get("permalink") or ""
        url = f"https://www.reddit.com{permalink}" if permalink else post.get("url", "")
        created = post.get("created_utc")
        observed = (
            datetime.fromtimestamp(created, tz=timezone.utc).isoformat()
            if created
            else datetime.now(timezone.utc).isoformat()
        )
        title = post.get("title") or ""
        body = post.get("selftext") or ""
        sub = post.get("subreddit") or subreddit or ""
        text = body.strip() or title
        items.append(
            EvidenceItem(
                source="reddit",
                source_url=url,
                title=f"r/{sub}: {title}",
                text=text[:4000],
                observed_at=observed,
                metadata={
                    "subreddit": sub,
                    "score": post.get("score"),
                    "num_comments": post.get("num_comments"),
                    "query": query,
                },
            )
        )
    return items


def collect_reddit(
    queries: list[str],
    subreddits: list[str],
    *,
    per_query_limit: int = 5,
    max_items: int = 30,
) -> tuple[list[EvidenceItem], list[str]]:
    warnings: list[str] = []
    if not _token():
        return [], ["reddit: skipped (set REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET)"]

    items: list[EvidenceItem] = []
    seen_urls: set[str] = set()

    for query in queries:
        try:
            for item in search_posts(query, limit=per_query_limit):
                if item.source_url not in seen_urls:
                    seen_urls.add(item.source_url)
                    items.append(item)
        except RuntimeError as exc:
            warnings.append(f"reddit query '{query}': {exc}")

    for sub in subreddits[:4]:
        try:
            for item in search_posts("med spa OR botox OR aesthetic", subreddit=sub, limit=4):
                if item.source_url not in seen_urls:
                    seen_urls.add(item.source_url)
                    items.append(item)
        except RuntimeError as exc:
            warnings.append(f"reddit r/{sub}: {exc}")

    return items[:max_items], warnings
