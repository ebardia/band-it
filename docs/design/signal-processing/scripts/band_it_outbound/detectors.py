from __future__ import annotations

import re

from .models import Company, SignalHit

# DC metro: DC + MD/VA localities commonly used for outbound wedge
DMV_STATES = {"dc", "district of columbia", "maryland", "md", "virginia", "va"}
DMV_CITY_HINTS = {
    "washington",
    "arlington",
    "alexandria",
    "fairfax",
    "falls church",
    "mclean",
    "tysons",
    "reston",
    "herndon",
    "vienna",
    "bethesda",
    "rockville",
    "silver spring",
    "gaithersburg",
    "college park",
    "bowie",
    "annapolis",
    "baltimore",
    "columbia",
    "frederick",
    "manassas",
    "woodbridge",
    "leesburg",
}

MIN_EMPLOYEES = 10
MAX_EMPLOYEES = 100

EXCLUDE_X02_PATTERNS = [
    r"\bstaffing agency\b",
    r"\btemp agency\b",
    r"\bstaffing firm\b",
    r"\brecruiting firm\b",
    r"\bmsp only\b",
    r"\bmanaged service provider\b",
    r"\bbody shop\b",
    r"\bstaff augmentation\b",
    r"\bplacement services\b",
]

EXCLUDE_X03_PATTERNS = [
    r"\bai saas\b",
    r"\bai platform\b",
    r"\bllm platform\b",
    r"\bour ai agents product\b",
    r"\bautonomous ai workflow product\b",
    r"\bmachine learning product\b",
    r"\bgenerative ai platform\b",
]

EXCLUDE_X01_PATTERNS = [
    r"\bsalesforce customer 360 deployment complete\b",
    r"\bdigital transformation complete\b",
    r"\benterprise-wide rollout complete\b",
    r"\bfully migrated to salesforce\b",
]

HUNT_PATTERNS: dict[str, tuple[str, list[str]]] = {
    "B01": (
        "growth",
        [
            r"\b(hiring surge|rapid hiring|multiple open roles|5\+ open roles|expanding team)\b",
            r"\b(\d{2,})\s+open (roles|positions)\b",
        ],
    ),
    "B02": (
        "growth",
        [
            r"\b(business development|bd manager|partnerships director|growth lead)\b",
            r"\b(capture manager|proposal manager|director of capture)\b",
        ],
    ),
    "B03": (
        "operational_stress",
        [
            r"\b(project coordinator|program coordinator|operations coordinator)\b",
            r"\b(cross-functional|coordinate across teams)\b",
        ],
    ),
    "B04": (
        "growth",
        [
            r"\b(new service|new vertical|expanded (services|practice)|now offering|proud to announce)\b",
            r"\b(launch(ed|ing) (our|a) (practice|service line))\b",
        ],
    ),
    "B05": (
        "organizational_change",
        [
            r"\b(new ceo|new coo|new president|appointed (ceo|coo|president))\b",
            r"\b(welcomes new (ceo|coo|president))\b",
        ],
    ),
    "B06": (
        "band_it_specific",
        [
            r"\b(founder|principal|managing partner)\b.{0,40}\b(every|all) (case study|project|engagement)\b",
            r"\bfounder still runs day-to-day\b",
            r"\bfeatured on every case study page\b",
        ],
    ),
    "B07": (
        "band_it_specific",
        [
            r"\b(spreadsheet|excel|manual process|email workflow|email chains)\b",
            r"\b(disconnected systems|manual handoffs|track(s|ing) in excel)\b",
        ],
    ),
    "B08": (
        "capture_management",
        [
            r"\b(sam\.gov|govcon|federal contract|gsa schedule|proposal (team|effort))\b",
            r"\b(capture manager|federal pipeline|contract vehicle)\b",
        ],
    ),
    "B09": (
        "technology_readiness",
        [
            r"\b(crm|erp|digital transformation|modernization|cloud migration)\b",
            r"\b(process improvement|salesforce|dynamics 365|netsuite)\b",
        ],
    ),
    "B10": (
        "band_it_specific",
        [
            r"\b(our services:|practice areas|professional services)\b",
            r"\b(management consulting|systems integration|advisory|project delivery)\b",
            r"\b(it consulting and federal integration)\b",
        ],
    ),
}


def _match_any(text: str, patterns: list[str]) -> str | None:
    for pat in patterns:
        m = re.search(pat, text, re.I)
        if m:
            return m.group(0)
    return None


def check_fit(company: Company) -> tuple[bool, str]:
    city = company.city.lower().strip()
    state = company.state.lower().strip()
    reasons: list[str] = []

    in_dmv = False
    if state in {"dc", "district of columbia"} or city == "washington":
        in_dmv = True
        reasons.append("F01: DC")
    elif state in {"md", "maryland", "va", "virginia"}:
        if any(h in city for h in DMV_CITY_HINTS) or city:
            in_dmv = True
            reasons.append(f"F01: {city.title()}, {state.upper()}")
    elif company.source_notes and any(h in company.corpus for h in DMV_CITY_HINTS):
        in_dmv = True
        reasons.append("F01: DMV mention in notes")

    if not in_dmv:
        return False, "Fail F01: not in DC metro footprint"

    headcount_ok = False
    if company.employee_count is not None:
        if MIN_EMPLOYEES <= company.employee_count <= MAX_EMPLOYEES:
            headcount_ok = True
            reasons.append(f"F03: {company.employee_count} employees")
        else:
            return False, f"Fail F03: employee_count={company.employee_count} outside 10–100"

    # F02 revenue proxy: headcount band is acceptable stand-in for v1
    if headcount_ok:
        reasons.append("F02: SMB size proxy via headcount")

    if not headcount_ok:
        return False, "Fail F02/F03: missing or invalid employee_count"

    return True, "; ".join(reasons)


def detect_excludes(company: Company) -> list[SignalHit]:
    text = company.corpus
    hits: list[SignalHit] = []

    for sid, name, patterns in [
        ("X02", "Wrong_business_model", EXCLUDE_X02_PATTERNS),
        ("X03", "AI_native_product_company", EXCLUDE_X03_PATTERNS),
        ("X01", "Enterprise_stack_locked", EXCLUDE_X01_PATTERNS),
    ]:
        ev = _match_any(text, patterns)
        if ev:
            hits.append(
                SignalHit(
                    signal_id=sid,
                    signal_name=name,
                    signal_role="exclude",
                    category="fit" if sid == "X02" else "technology_readiness",
                    evidence=ev,
                )
            )

    if company.sam_registered.lower() in {"yes", "y", "true", "1"}:
        pass  # not an exclude

    return hits


def detect_hunts(company: Company) -> list[SignalHit]:
    text = company.corpus
    hits: list[SignalHit] = []

    if company.sam_registered.lower() in {"yes", "y", "true", "1"}:
        hits.append(
            SignalHit(
                signal_id="B08",
                signal_name="Gov_or_contract_facing_growth",
                signal_role="hunt",
                category="capture_management",
                evidence="sam_registered=yes",
            )
        )

    job_lines = [ln.strip() for ln in company.job_postings_text.splitlines() if ln.strip()]
    if len(job_lines) >= 3:
        hits.append(
            SignalHit(
                signal_id="B01",
                signal_name="Recent_hiring_surge",
                signal_role="hunt",
                category="growth",
                evidence=f"{len(job_lines)} job lines in seed data",
            )
        )

    for sid, (category, patterns) in HUNT_PATTERNS.items():
        if sid == "B08" and any(h.signal_id == "B08" for h in hits):
            continue
        if sid == "B01" and any(h.signal_id == "B01" for h in hits):
            continue
        ev = _match_any(text, patterns)
        if ev:
            hits.append(
                SignalHit(
                    signal_id=sid,
                    signal_name=_signal_name(sid),
                    signal_role="hunt",
                    category=category,
                    evidence=ev[:120],
                )
            )

    # dedupe by signal_id
    seen: set[str] = set()
    unique: list[SignalHit] = []
    for h in hits:
        if h.signal_id not in seen:
            seen.add(h.signal_id)
            unique.append(h)
    return unique


def _signal_name(sid: str) -> str:
    names = {
        "B01": "Recent_hiring_surge",
        "B02": "Business_development_hiring",
        "B03": "Ops_or_project_coordinator_hiring",
        "B04": "New_service_or_vertical",
        "B05": "Leadership_change_CEO_COO",
        "B06": "Knowledge_concentration_risk",
        "B07": "Workflow_fragmentation",
        "B08": "Gov_or_contract_facing_growth",
        "B09": "Digital_modernization_mention",
        "B10": "Multi_team_delivery_model",
    }
    return names.get(sid, sid)
