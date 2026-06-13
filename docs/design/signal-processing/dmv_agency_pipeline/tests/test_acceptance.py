from __future__ import annotations

import csv
import sys
from pathlib import Path

PIPELINE_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PIPELINE_ROOT))

from lib.jsonio import read_jsonl  # noqa: E402
from lib.paths import CENSUS_PATH, OUTPUT_DIR, REJECTED_PATH  # noqa: E402


def test_level_agency_rejected() -> None:
    assert REJECTED_PATH.exists(), "rejected.csv missing"
    rows = list(csv.DictReader(REJECTED_PATH.open(encoding="utf-8")))
    level = [r for r in rows if "level.agency" in (r.get("website") or "")]
    assert level, "Level Agency not in rejected.csv"
    reason = level[0]["reject_reason"].lower()
    assert "geography" in reason or "size" in reason or "pittsburgh" in reason, reason


def test_signal_prevalence() -> None:
    census = read_jsonl(CENSUS_PATH)
    n = len(census) or 1
    scored_path = sorted(OUTPUT_DIR.glob("targets-*.csv"))[-1] if list(OUTPUT_DIR.glob("targets-*.csv")) else None
    if not scored_path:
        return
    rows = list(csv.DictReader(scored_path.open(encoding="utf-8")))
    if rows and rows[0].get("rank") == "1":
        pass
    # Count signal ids in signals_fired column
    from collections import Counter

    counts: Counter[str] = Counter()
    for row in rows:
        sf = row.get("signals_fired") or ""
        for part in sf.split("|"):
            if not part.startswith("H"):
                continue
            sid = part.split("[")[0].split(":")[0]
            if sid == "H06" and "[verified_open]" not in part:
                continue
            counts[sid] += 1
    for sid, c in counts.items():
        assert c / max(len(rows), 1) <= 0.8, f"{sid} fires on {c}/{len(rows)} rows (>80%)"


def test_top10_evidence() -> None:
    top10_files = sorted(OUTPUT_DIR.glob("top10-*.md"))
    assert top10_files, "top10 md missing"
    text = top10_files[-1].read_text(encoding="utf-8")
    assert "headcount" in text.lower()
    assert "source" in text.lower()


def test_pixel_this_marketing_h06_not_verified() -> None:
    targets_path = sorted(OUTPUT_DIR.glob("targets-*.csv"))[-1] if list(OUTPUT_DIR.glob("targets-*.csv")) else None
    if not targets_path:
        return
    rows = list(csv.DictReader(targets_path.open(encoding="utf-8")))
    pixel = [r for r in rows if "pixelthismarketing.com" in (r.get("domain") or "")]
    if not pixel:
        return
    signals = pixel[0].get("signals_fired") or ""
    assert "H06[verified_open]" not in signals, signals
    assert "H06[not_found]" in signals, signals


def main() -> int:
    tests = [
        test_level_agency_rejected,
        test_signal_prevalence,
        test_top10_evidence,
        test_pixel_this_marketing_h06_not_verified,
    ]
    failed = 0
    for t in tests:
        try:
            t()
            print(f"PASS {t.__name__}")
        except AssertionError as exc:
            print(f"FAIL {t.__name__}: {exc}")
            failed += 1
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
