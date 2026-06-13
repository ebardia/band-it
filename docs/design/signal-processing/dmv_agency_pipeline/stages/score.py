from __future__ import annotations

import sys
from pathlib import Path

PIPELINE_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PIPELINE_ROOT))

from lib.config import PipelineConfig  # noqa: E402
from lib.jsonio import read_agencies, write_agencies  # noqa: E402
from lib.paths import CONFIG_PATH, ENRICHED_PATH, SCORED_PATH  # noqa: E402
from lib.scoring import compute_score  # noqa: E402


def run_score() -> int:
    config = PipelineConfig.load(CONFIG_PATH)
    enriched = read_agencies(ENRICHED_PATH)
    if not enriched:
        print(f"No enriched rows at {ENRICHED_PATH}", file=sys.stderr)
        return 1

    for record in enriched:
        compute_score(record, config)

    enriched.sort(key=lambda r: r.agency_score, reverse=True)
    write_agencies(SCORED_PATH, enriched)
    print(f"Score: {len(enriched)} rows -> {SCORED_PATH}")
    if enriched:
        print(f"Top: {enriched[0].agency_name} ({enriched[0].agency_score})")
    return 0


if __name__ == "__main__":
    raise SystemExit(run_score())
