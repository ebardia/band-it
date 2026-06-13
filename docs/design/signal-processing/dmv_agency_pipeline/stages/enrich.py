from __future__ import annotations

import csv
import sys
from pathlib import Path

PIPELINE_ROOT = Path(__file__).resolve().parents[1]
SCRIPTS_ROOT = PIPELINE_ROOT.parent / "scripts"
sys.path.insert(0, str(SCRIPTS_ROOT))
sys.path.insert(0, str(PIPELINE_ROOT))

from cat_bot_roam.env import load_dotenv  # noqa: E402

load_dotenv()

from lib.config import PipelineConfig  # noqa: E402
from lib.enrich_signals import enrich_record  # noqa: E402
from lib.fetch import CachedFetcher  # noqa: E402
from lib.jsonio import read_agencies, write_agencies  # noqa: E402
from lib.paths import CACHE_DIR, CONFIG_PATH, ENRICHED_PATH, FILTERED_PATH  # noqa: E402


def _tavily_fn(query: str, max_results: int = 3):
    from cat_bot_roam.tavily_client import tavily_search  # noqa: WPS433

    return tavily_search(query, max_results=max_results)


def run_enrich() -> int:
    config = PipelineConfig.load(CONFIG_PATH)
    fetcher = CachedFetcher(
        CACHE_DIR,
        ttl_days=int(config.get("cache_ttl_days", default=7)),
        user_agent=str(config.get("user_agent", default="AdoptACatBot/1.0")),
    )

    filtered = read_agencies(FILTERED_PATH)
    if not filtered:
        print(f"No filtered rows at {FILTERED_PATH}", file=sys.stderr)
        return 1

    tavily = None
    tavily_configured = False
    try:
        from cat_bot_roam.tavily_client import _api_key  # noqa: WPS433

        if _api_key():
            tavily = _tavily_fn
            tavily_configured = True
    except Exception:
        pass

    if not tavily_configured:
        print(
            "WARN: TAVILY_API_KEY not set — H06 job-board search disabled; "
            "only careers pages on agency sites will be checked.",
            file=sys.stderr,
        )

    enriched = [
        enrich_record(r, fetcher, config, tavily_search_fn=tavily)
        for r in filtered
    ]
    write_agencies(ENRICHED_PATH, enriched)
    print(f"Enrich: {len(enriched)} rows -> {ENRICHED_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(run_enrich())
