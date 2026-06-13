from __future__ import annotations

import os
from pathlib import Path


PIPELINE_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = PIPELINE_ROOT.parents[3]
SCRIPTS_ROOT = PIPELINE_ROOT.parent / "scripts"


def _config_path() -> Path:
    raw = os.environ.get("PIPELINE_CONFIG", "").strip()
    if raw:
        path = Path(raw)
        return path if path.is_absolute() else PIPELINE_ROOT / path
    return PIPELINE_ROOT / "config.json"


def _run_suffix(config_path: Path) -> str:
    if config_path.name == "config.json":
        return ""
    stem = config_path.stem
    if stem.startswith("config-"):
        return stem.removeprefix("config-")
    return stem


CONFIG_PATH = _config_path()
_RUN_SUFFIX = _run_suffix(CONFIG_PATH)
_DATA_ROOT = PIPELINE_ROOT / (f"data-{_RUN_SUFFIX}" if _RUN_SUFFIX else "data")
_OUTPUT_ROOT = PIPELINE_ROOT / (f"output-{_RUN_SUFFIX}" if _RUN_SUFFIX else "output")

DATA_DIR = _DATA_ROOT
CACHE_DIR = DATA_DIR / "cache"
OUTPUT_DIR = _OUTPUT_ROOT
DB_PATH = DATA_DIR / "entities.sqlite"

CENSUS_PATH = DATA_DIR / "census.jsonl"
FILTERED_PATH = DATA_DIR / "filtered.jsonl"
REJECTED_PATH = DATA_DIR / "rejected.csv"
ENRICHED_PATH = DATA_DIR / "enriched.jsonl"
SCORED_PATH = DATA_DIR / "scored.jsonl"
