from __future__ import annotations

import re
import ssl
from html.parser import HTMLParser
from urllib.error import URLError
from urllib.request import Request, urlopen

USER_AGENT = "BandItOutboundBot/1.0 (+https://adoptacatbot.com; signal-processing-v1)"
TIMEOUT_SEC = 15


class _TextExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self._chunks: list[str] = []
        self._skip = False

    def handle_starttag(self, tag: str, attrs) -> None:
        if tag in {"script", "style", "noscript"}:
            self._skip = True

    def handle_endtag(self, tag: str) -> None:
        if tag in {"script", "style", "noscript"}:
            self._skip = False

    def handle_data(self, data: str) -> None:
        if not self._skip:
            text = data.strip()
            if text:
                self._chunks.append(text)

    def text(self) -> str:
        return " ".join(self._chunks)


def fetch_website_text(url: str) -> str:
    if not url or not url.startswith(("http://", "https://")):
        if url:
            url = "https://" + url.lstrip("/")
        else:
            return ""

    req = Request(url, headers={"User-Agent": USER_AGENT})
    ctx = ssl.create_default_context()
    try:
        with urlopen(req, timeout=TIMEOUT_SEC, context=ctx) as resp:
            raw = resp.read(500_000)
            charset = resp.headers.get_content_charset() or "utf-8"
    except (URLError, TimeoutError, ValueError, ssl.SSLError) as exc:
        return f"[fetch_failed: {exc}]"

    html = raw.decode(charset, errors="replace")
    parser = _TextExtractor()
    parser.feed(html)
    text = re.sub(r"\s+", " ", parser.text())
    return text[:50_000]
