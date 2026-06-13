from __future__ import annotations

from .models import ScoredAgency

FIT_BASE = 25


def score_agency(scored: ScoredAgency) -> ScoredAgency:
    if not scored.fit_pass:
        scored.score = 0
        return scored

    if scored.excludes:
        scored.score = 0
        return scored

    raw = FIT_BASE + sum(h.points for h in scored.hits)
    scored.score = min(100, raw)
    return scored


def build_why_flagged(scored: ScoredAgency) -> str:
    if scored.excludes:
        ex = scored.excludes[0]
        return f"Excluded ({ex.signal_id}): {ex.evidence}"

    if not scored.fit_pass:
        return scored.fit_reason

    parts: list[str] = []
    for h in scored.hits[:3]:
        parts.append(f"{h.signal_id} ({h.evidence})")
    if not parts:
        return "Passed fit; weak hunger signals — verify manually"
    return "Flagged: " + "; ".join(parts)


def build_evidence_links(scored: ScoredAgency) -> list[str]:
    links: list[str] = []
    a = scored.agency
    if a.website:
        url = a.website if a.website.startswith("http") else f"https://{a.website}"
        links.append(url)
    if a.clutch_url:
        links.append(a.clutch_url)
    if a.linkedin_company_url:
        links.append(a.linkedin_company_url)
    for h in scored.hits:
        if h.signal_id == "H01" and a.website:
            base = a.website if a.website.startswith("http") else f"https://{a.website}"
            links.append(base.rstrip("/") + "/careers")
            break
    return links[:5]


def verification_hints(scored: ScoredAgency) -> list[str]:
    if scored.excludes:
        return ["Excluded — do not call unless override"]
    if not scored.fit_pass:
        return [scored.fit_reason]
    hints = ["Confirm employee count and SMB portfolio before call"]
    if any(h.signal_id == "H01" for h in scored.hits):
        hints.append("Verify BD job still open on careers page")
    if scored.score >= 55:
        hints.append("Strong Cat Bot prospect — prepare sample mouse for their vertical")
    return hints
