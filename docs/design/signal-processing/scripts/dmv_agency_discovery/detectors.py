from __future__ import annotations

import re

from .models import Agency, SignalHit

DMV_STATES = {"dc", "district of columbia", "maryland", "md", "virginia", "va"}
DMV_CITY_HINTS = {
    "washington", "arlington", "alexandria", "fairfax", "falls church", "mclean",
    "tysons", "reston", "herndon", "vienna", "bethesda", "rockville", "silver spring",
    "gaithersburg", "college park", "bowie", "annapolis", "baltimore", "columbia",
    "frederick", "manassas", "potomac", "north bethesda", "chevy chase", "leonardtown",
    "gaithersburg", "dmv",
}

MIN_EMPLOYEES = 3
MAX_EMPLOYEES = 15

SMB_VERTICAL_PATTERNS = [
    r"\bdental\b", r"\bdentist\b", r"\bmed spa\b", r"\bmedical spa\b",
    r"\bhome services\b", r"\bhvac\b", r"\bplumb", r"\bcontractor\b",
    r"\brestaurant\b", r"\bretail\b", r"\blaw firm\b", r"\blegal\b",
    r"\bnonprofit\b", r"\bsmall business\b", r"\blocal business\b",
    r"\bsmb\b", r"\bowner-operated\b", r"\bchiropract", r"\bphysical therapy\b",
]

MARKETING_OFFER_PATTERNS = [
    r"\bdigital marketing\b", r"\bseo\b", r"\bsem\b", r"\bppc\b",
    r"\bsocial media\b", r"\bmarketing agency\b", r"\binbound marketing\b",
    r"\bcontent marketing\b", r"\bweb design\b", r"\bhubspot\b",
    r"\bmarketing services\b",
]

BD_JOB_PATTERNS = [
    r"\bbusiness development\b", r"\baccount executive\b", r"\bgrowth marketing\b",
    r"\bsdr\b", r"\bbdr\b", r"\bsales development\b", r"\bnew business\b",
    r"\bclient acquisition\b",
]

DIRECTORY_PATTERNS = [
    r"\bclutch\b", r"\bupcity\b", r"\bdesignrush\b", r"\bhubspot\b",
    r"\bexpertise\.com\b", r"\bpartner badge\b", r"\bcertified partner\b",
]

REFERRAL_UNSOPH_PATTERNS = [
    r"\breferral\b", r"\bword of mouth\b", r"\brelationship-driven\b",
    r"\btrusted partner\b",
]

HUNGER_PATTERNS = [
    r"\bnew clients\b", r"\baccepting clients\b", r"\btaking on new\b",
    r"\bnow hiring\b", r"\bjoin our team\b", r"\bcareers\b",
]

GHL_PATTERNS = [
    r"\bgohighlevel\b", r"\bhighlevel\b", r"\bghl\b", r"\bwhite-label\b",
    r"\bwhite label\b",
]

EXCLUDE_ENTERPRISE = [
    r"\bfederal government\b", r"\bfortune 500\b", r"\benterprise-only\b",
    r"\bgovernment contracting\b", r"\bdefense contractor\b", r"\bprime contractor\b",
]

EXCLUDE_LARGE = [
    r"\b750\+ employees\b", r"\b500 employees\b", r"\bglobal agency\b",
    r"\bnational agency\b",
]

EXCLUDE_STAFFING = [
    r"\bstaffing agency\b", r"\brecruiting firm\b", r"\btemp agency\b",
]

EXCLUDE_PR_ONLY = [
    r"\bpublic relations only\b", r"\bpr firm\b(?!.*digital)",
]

EXCLUDE_DEV_ONLY = [
    r"\bsoftware development company\b", r"\bcustom software\b(?!.*marketing)",
]

EXCLUDE_AI_OUTBOUND = [
    r"\bai sdr\b", r"\boutbound automation platform\b", r"\bautonomous sales agent product\b",
]


def _first_match(patterns: list[str], text: str) -> str | None:
    for pat in patterns:
        m = re.search(pat, text, re.I)
        if m:
            return m.group(0)
    return None


def _count_team_heuristic(text: str) -> int | None:
    """Rough count of 'Name, Title' blocks on team/about pages."""
    titles = re.findall(
        r"\b(founder|president|ceo|director|manager|specialist|strategist|designer)\b",
        text,
        re.I,
    )
    if len(titles) >= 3:
        return min(len(titles), 25)
    return None


def check_fit(agency: Agency) -> tuple[bool, str]:
    corpus = agency.corpus
    state = agency.state.lower().strip()
    city = agency.city.lower().strip()

    dmv_ok = (
        state in {"dc", "md", "va", "district of columbia", "maryland", "virginia"}
        or city in DMV_CITY_HINTS
        or "dmv" in corpus
        or any(h in corpus for h in DMV_CITY_HINTS)
    )
    if not dmv_ok:
        return False, "F01: not DMV metro"

    smb_hit = _first_match(SMB_VERTICAL_PATTERNS, corpus)
    if not smb_hit and not agency.vertical_focus:
        return False, "F02: no local SMB clientele signals"

    est = agency.employee_count_estimate
    if est is None and agency.website_text:
        est = _count_team_heuristic(agency.website_text)
    if est is not None and (est < MIN_EMPLOYEES or est > MAX_EMPLOYEES):
        return False, f"F03: scale {est} outside {MIN_EMPLOYEES}–{MAX_EMPLOYEES}"

    offer_hit = _first_match(MARKETING_OFFER_PATTERNS, corpus)
    if not offer_hit:
        return False, "F04: not a digital marketing agency"

    return True, "fit pass"


def detect_excludes(agency: Agency) -> list[SignalHit]:
    corpus = agency.corpus
    out: list[SignalHit] = []
    checks = [
        ("X01", "Enterprise or gov primary", EXCLUDE_ENTERPRISE),
        ("X02", "National scale 75+", EXCLUDE_LARGE),
        ("X03", "Staffing or recruiting", EXCLUDE_STAFFING),
        ("X06", "AI outbound competitor", EXCLUDE_AI_OUTBOUND),
    ]
    est = agency.employee_count_estimate
    if est is not None and est > MAX_EMPLOYEES:
        out.append(SignalHit("X02", "National scale 75+", "exclude", "size", f"employee_estimate={est}", -30))
    for sid, name, patterns in checks:
        hit = _first_match(patterns, corpus)
        if hit:
            out.append(SignalHit(sid, name, "exclude", "type", hit, -30))
    if _first_match(EXCLUDE_PR_ONLY, corpus) and not _first_match(MARKETING_OFFER_PATTERNS, corpus):
        out.append(SignalHit("X04", "PR branding only", "exclude", "offer", "pr-only", -30))
    return out


def detect_hunts(agency: Agency) -> list[SignalHit]:
    corpus = agency.corpus
    job_corpus = (agency.job_postings_text + "\n" + agency.website_text).lower()
    hits: list[SignalHit] = []

    bd = _first_match(BD_JOB_PATTERNS, job_corpus)
    if bd:
        hits.append(SignalHit("H01", "BD or growth hiring", "hunt", "growth", bd, 20))

    verticals = {m.group(0) for pat in SMB_VERTICAL_PATTERNS for m in [re.search(pat, corpus, re.I)] if m}
    if len(verticals) >= 2 or (len(verticals) >= 1 and agency.vertical_focus):
        hits.append(
            SignalHit(
                "H02", "SMB vertical portfolio", "hunt", "icp",
                "|".join(sorted(verticals)) or agency.vertical_focus, 15,
            )
        )

    if _first_match([r"\bblog\b", r"\binsights\b", r"\bnews\b", r"\bcase stud"], corpus):
        hits.append(SignalHit("H03", "Own marketing activity", "hunt", "hunger", "content on site", 12))

    if _first_match(DIRECTORY_PATTERNS, corpus) or agency.clutch_url:
        hits.append(SignalHit("H04", "Directory badge", "hunt", "credibility", "directory", 10))

    if _first_match(REFERRAL_UNSOPH_PATTERNS, corpus):
        hits.append(SignalHit("H05", "Referral-forward unsophistication", "hunt", "fit", "referrals", 8))

    if _first_match(HUNGER_PATTERNS, corpus):
        hits.append(SignalHit("H06", "Taking new clients", "hunt", "hunger", "new clients/hiring", 8))

    if _first_match(GHL_PATTERNS, corpus):
        hits.append(SignalHit("H07", "Vertical package or GHL", "hunt", "offer", "ghl/white-label", 5))

    return hits
