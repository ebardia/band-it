from __future__ import annotations

from .models import ScoredCompany

HUNT_POINTS = 10
STACK_BONUS = 15
EXCLUDE_PENALTY = 50


def score_company(scored: ScoredCompany) -> ScoredCompany:
    if not scored.fit_pass:
        scored.score = 0
        return scored

    if scored.excludes:
        scored.score = max(0, sum(HUNT_POINTS for _ in scored.hits) + STACK_BONUS - EXCLUDE_PENALTY)
        # Design: −50 if any exclude — effectively zero or negative; clamp at 0
        scored.score = 0
        return scored

    raw = len(scored.hits) * HUNT_POINTS
    categories = {h.category for h in scored.hits if h.category}
    if len(categories) >= 2:
        raw += STACK_BONUS

    scored.score = min(100, raw)
    return scored


def verification_hints(scored: ScoredCompany) -> list[str]:
    hints: list[str] = []
    if scored.excludes:
        hints.append("Excluded — do not call unless override with reason")
        return hints
    if not scored.fit_pass:
        hints.append("Failed fit filters")
        return hints
    if scored.score >= 30:
        hints.append("Verify website and LinkedIn before call")
    for h in scored.hits:
        if h.signal_id in {"B05", "B08", "B04"}:
            hints.append(f"Confirm {h.signal_id}: {h.evidence}")
    if not hints:
        hints.append("Light verify — weak signal stack")
    return hints
