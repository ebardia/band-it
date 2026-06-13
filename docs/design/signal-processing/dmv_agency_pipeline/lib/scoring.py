from __future__ import annotations

from .config import PipelineConfig
from .models import AgencyRecord


def compute_score(record: AgencyRecord, config: PipelineConfig) -> int:
    w = config.score_weights
    score = 0
    signals = record.signals or {}

    h06 = signals.get("H06", {})
    if h06.get("status") == "verified_open":
        score += int(w.get("H06", 30))

    if "H01" in signals:
        score += int(w.get("H01", 15))

    if "H02" in signals:
        verticals = record.smb_verticals or []
        per = int(w.get("H02_per_vertical", 5))
        cap = int(w.get("H02_cap", 15))
        score += min(len(verticals) * per, cap)

    if "H03b" in signals:
        score += int(w.get("H03b", 10))

    if "H04" in signals:
        score += int(w.get("H04", 10))

    if "H05" in signals:
        score += int(w.get("H05", 5))

    if "H07" in signals:
        score += int(w.get("H07", 15))

    score = min(100, score)

    if not record.headcount_verified:
        cap = int(config.get("size", "unverified_score_cap", default=50))
        score = min(score, cap)
        record.verify_status = "unverified_size"
    else:
        record.verify_status = "verified"

    record.agency_score = score
    return score


def score_formula_header(config: PipelineConfig) -> str:
    w = config.score_weights
    return (
        "# Scoring v2 formula\n"
        f"H06 verified_open={w.get('H06', 30)}; "
        f"H01={w.get('H01', 15)}; "
        f"H02={w.get('H02_per_vertical', 5)}/vertical cap {w.get('H02_cap', 15)}; "
        f"H03b={w.get('H03b', 10)}; "
        f"H04={w.get('H04', 10)}; "
        f"H05={w.get('H05', 5)}; "
        f"H07={w.get('H07', 15)}; max 100; "
        f"unverified_size cap={config.get('size', 'unverified_score_cap', default=50)}"
    )
