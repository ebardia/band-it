from __future__ import annotations

import hashlib
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen
import ssl


class CachedFetcher:
    def __init__(self, cache_dir: Path, *, ttl_days: int, user_agent: str) -> None:
        self.cache_dir = cache_dir
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.ttl = timedelta(days=ttl_days)
        self.user_agent = user_agent
        self._last_request = 0.0

    def _cache_path(self, url: str) -> Path:
        key = hashlib.sha256(url.encode()).hexdigest()
        return self.cache_dir / f"{key}.txt"

    def _is_fresh(self, path: Path) -> bool:
        if not path.exists():
            return False
        mtime = datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc)
        return datetime.now(timezone.utc) - mtime < self.ttl

    def _throttle(self, min_interval: float = 0.5) -> None:
        elapsed = time.time() - self._last_request
        if elapsed < min_interval:
            time.sleep(min_interval - elapsed)
        self._last_request = time.time()

    def fetch(self, url: str, *, max_bytes: int = 500_000) -> tuple[str, str]:
        if not url:
            return "", "empty_url"
        if not url.startswith(("http://", "https://")):
            url = "https://" + url.lstrip("/")

        cache_path = self._cache_path(url)
        if self._is_fresh(cache_path):
            return cache_path.read_text(encoding="utf-8", errors="replace"), "cache"

        self._throttle()
        req = Request(url, headers={"User-Agent": self.user_agent})
        ctx = ssl.create_default_context()
        try:
            with urlopen(req, timeout=20, context=ctx) as resp:
                if resp.status == 429:
                    time.sleep(2)
                    return self.fetch(url, max_bytes=max_bytes)
                raw = resp.read(max_bytes)
                charset = resp.headers.get_content_charset() or "utf-8"
                text = raw.decode(charset, errors="replace")
        except HTTPError as exc:
            if exc.code == 429:
                time.sleep(2)
                return self.fetch(url, max_bytes=max_bytes)
            return f"[fetch_failed: HTTP {exc.code}]", "error"
        except (URLError, TimeoutError, ValueError, ssl.SSLError, ConnectionResetError, OSError) as exc:
            return f"[fetch_failed: {exc}]", "error"

        cache_path.write_text(text, encoding="utf-8")
        return text, "network"

    def fetch_text_only(self, url: str) -> str:
        html, _ = self.fetch(url)
        return _html_to_text(html)


def _html_to_text(html: str) -> str:
    if html.startswith("[fetch_failed"):
        return html
    import re

    html = re.sub(r"(?is)<(script|style|noscript)[^>]*>.*?</\1>", " ", html)
    html = re.sub(r"(?is)<[^>]+>", " ", html)
    html = re.sub(r"\s+", " ", html)
    return html.strip()[:80_000]
