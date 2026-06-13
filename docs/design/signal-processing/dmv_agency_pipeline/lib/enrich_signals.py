from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone
from urllib.parse import urlparse

from .config import PipelineConfig
from .fetch import CachedFetcher, _html_to_text
from .models import AgencyRecord, SignalEvidence

SMB_VERTICAL_PATTERNS: list[tuple[str, str]] = [
    ("dental", r"\bdental\b|\bdentist\b"),
    ("med_spa", r"\bmed spa\b|\bmedical spa\b"),
    ("home_services", r"\bhome services\b|\bhvac\b|\bplumb"),
    ("contractor", r"\bcontractor\b|\broofing\b|\belectrician\b"),
    ("restaurant", r"\brestaurant\b|\bfood service\b"),
    ("retail", r"\bretail\b|\bboutique\b"),
    ("legal", r"\blaw firm\b|\blegal\b|\battorney\b"),
    ("nonprofit", r"\bnonprofit\b|\bcharity\b"),
    ("clinic", r"\bclinic\b|\bchiropract\b"),
]

ENTERPRISE_CLIENT_PATTERNS = [
    r"\bfortune 500\b", r"\bfederal government\b", r"\bdepartment of defense\b",
    r"\bstate department\b", r"\bnational brand\b", r"\benterprise clients\b",
    r"\bmicrosoft\b", r"\bamazon\b", r"\bgoogle\b", r"\bnetflix\b",
]

GROWTH_PHRASES = [
    r"business development", r"account executive", r"growth marketing",
    r"sales development", r"client acquisition", r"new business development",
]

TECH_STACK_PATTERNS = [
    ("ghl", r"gohighlevel|highlevel|\bghl\b|white-?label"),
    ("hubspot", r"hubspot"),
    ("vendasta", r"vendasta"),
    ("dashclicks", r"dashclicks"),
]

REFERRAL_PATTERNS = [r"\breferral\b", r"\bword of mouth\b", r"\brelationship-driven\b"]

DIRECTORY_PATTERNS = [r"clutch\.co", r"upcity\.com", r"designrush", r"expertise\.com", r"hubspot\.com/partner"]

COMMON_AGENCY_WORDS = frozenset(
    {
        "agency", "agencies", "marketing", "digital", "media", "inc", "llc", "ltd", "corp",
        "company", "co", "the", "and", "team", "hq", "llp", "group", "solutions", "services",
        "online", "local", "this", "that", "your", "our", "new", "best", "top",
    }
)

FOREIGN_JOB_LOCATIONS = frozenset(
    {
        "lucknow", "delhi", "mumbai", "bangalore", "bengaluru", "hyderabad", "chennai", "kolkata",
        "noida", "gurgaon", "gurugram", "pune", "india", "philippines", "manila", "bangladesh",
        "dhaka", "karachi", "lahore", "pakistan", "nigeria", "lagos", "kenya", "nairobi",
        "toronto", "vancouver", "montreal", "canada", "london", "uk", "united kingdom",
        "sydney", "melbourne", "australia", "singapore", "dubai", "uae",
    }
)

US_STATE_NAMES = frozenset(
    {
        "alabama", "alaska", "arizona", "arkansas", "california", "colorado", "connecticut",
        "delaware", "florida", "georgia", "hawaii", "idaho", "illinois", "indiana", "iowa",
        "kansas", "kentucky", "louisiana", "maine", "maryland", "massachusetts", "michigan",
        "minnesota", "mississippi", "missouri", "montana", "nebraska", "nevada",
        "new hampshire", "new jersey", "new mexico", "new york", "north carolina",
        "north dakota", "ohio", "oklahoma", "oregon", "pennsylvania", "rhode island",
        "south carolina", "south dakota", "tennessee", "texas", "utah", "vermont",
        "virginia", "washington", "west virginia", "wisconsin", "wyoming",
        "district of columbia",
    }
)

US_STATE_ABBREVS = frozenset(
    {
        "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA",
        "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
        "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT",
        "VA", "WA", "WV", "WI", "WY", "DC",
    }
)

US_INDEED_HOSTS = frozenset({"indeed.com", "www.indeed.com", "us.indeed.com", "secure.indeed.com"})


def _normalize_agency_name(name: str) -> str:
    cleaned = re.sub(r"[^\w\s]", " ", (name or "").lower())
    return re.sub(r"\s+", " ", cleaned).strip()


def _distinctive_tokens(name: str) -> list[str]:
    return [
        token
        for token in _normalize_agency_name(name).split()
        if token not in COMMON_AGENCY_WORDS and len(token) > 2
    ]


def _website_domain(website: str) -> str:
    return website.replace("https://", "").replace("http://", "").split("/")[0].lower().removeprefix("www.")


def _is_us_indeed_url(url: str) -> bool:
    if not url or "indeed.com" not in url.lower():
        return True
    host = urlparse(url).netloc.lower().removeprefix("www.")
    if host in US_INDEED_HOSTS:
        return True
    if re.fullmatch(r"[a-z]{2}\.indeed\.com", host):
        return False
    if host.endswith(".indeed.com") and host not in US_INDEED_HOSTS:
        return False
    return host == "indeed.com"


def _posting_has_foreign_location(text: str) -> bool:
    lower = text.lower()
    return any(re.search(rf"\b{re.escape(loc)}\b", lower) for loc in FOREIGN_JOB_LOCATIONS)


def _posting_has_us_location(text: str) -> bool:
    if re.search(r",\s*[A-Z]{2}\b", text):
        abbrev = re.search(r",\s*([A-Z]{2})\b", text)
        if abbrev and abbrev.group(1) in US_STATE_ABBREVS:
            return True
    lower = text.lower()
    return any(re.search(rf"\b{re.escape(state)}\b", lower) for state in US_STATE_NAMES)


def _posting_location_ok(text: str) -> bool:
    if _posting_has_foreign_location(text):
        return False
    if _posting_has_us_location(text):
        return True
    return True


def _agency_matches_posting(agency_name: str, website: str, blob: str) -> bool:
    blob_lower = blob.lower()
    site_domain = _website_domain(website)
    if site_domain and site_domain in blob_lower:
        return True

    normalized_name = _normalize_agency_name(agency_name)
    if len(normalized_name) >= 8 and normalized_name in blob_lower:
        return True

    tokens = _distinctive_tokens(agency_name)
    if len(tokens) >= 2:
        phrase = " ".join(tokens)
        if phrase in blob_lower:
            return True
        if all(re.search(rf"\b{re.escape(token)}\b", blob_lower) for token in tokens):
            return True
        return False

    if len(tokens) == 1:
        token = tokens[0]
        if len(token) >= 6 and re.search(rf"\b{re.escape(token)}\b", blob_lower):
            return True

    return False


def _job_hit_is_valid(agency_name: str, website: str, url: str, snippet: str) -> bool:
    if not _is_us_indeed_url(url):
        return False
    if not _posting_location_ok(snippet):
        return False
    blob = f"{url} {snippet}"
    if not _agency_matches_posting(agency_name, website, blob):
        return False
    return True


def discover_page_links(home_html: str, base_url: str) -> dict[str, str]:
    links: dict[str, str] = {}
    for kind, patterns in {
        "contact": [r"/contact", r"contact-us", r"get-in-touch"],
        "about": [r"/about", r"who-we-are", r"our-story"],
        "careers": [r"/careers", r"/jobs", r"join-our-team", r"work-with-us"],
        "portfolio": [r"/work", r"/portfolio", r"/case-stud", r"/clients"],
        "blog": [r"/blog", r"/news", r"/insights", r"/resources"],
    }.items():
        for pat in patterns:
            m = re.search(rf'href=["\']([^"\']*{pat}[^"\']*)["\']', home_html, re.I)
            if m:
                href = m.group(1)
                if href.startswith("/"):
                    from urllib.parse import urljoin
                    href = urljoin(base_url, href)
                links[kind] = href
                break
    return links


def extract_headcount(text: str) -> tuple[int | None, str, str]:
    """Returns (headcount, source_label, matched_text)."""
    patterns = [
        (r"(?P<n>\d{1,3})\s*[-–]\s*(?P<m>\d{1,3})\s+employees", "about_page_range"),
        (r"(?P<n>\d{1,3})\+\s+employees", "about_page_plus"),
        (r"(?P<n>\d{1,3})\s+employees", "about_page"),
        (r"company size[^0-9]{0,20}(?P<n>\d{1,3})\s*[-–]\s*(?P<m>\d{1,3})", "linkedin_snippet"),
        (r"(?P<n>\d{1,3})\s*[-–]\s*(?P<m>\d{1,3})\s+on linkedin", "linkedin_snippet"),
    ]
    for pat, label in patterns:
        m = re.search(pat, text, re.I)
        if m:
            n = int(m.group("n"))
            mval = m.groupdict().get("m")
            if mval:
                hi = int(mval)
                est = (n + hi) // 2
                return est, label, m.group(0)
            return n, label, m.group(0)
    return None, "", ""


def count_team_members(team_text: str) -> int | None:
    roles = re.findall(
        r"\b(founder|co-founder|president|ceo|director|manager|specialist|strategist|designer|partner)\b",
        team_text,
        re.I,
    )
    unique_roles = {r.lower() for r in roles}
    if len(unique_roles) >= 3:
        return min(len(unique_roles), 25)
    return None


VERIFIED_HEADCOUNT_SOURCES = frozenset(
    {"about_page", "about_page_range", "about_page_plus", "linkedin_snippet"}
)


def resolve_headcount(
    contact_text: str,
    about_text: str,
    home_text: str = "",
    *,
    employee_count_estimate: int | None = None,
) -> tuple[int | None, str, str, bool]:
    """Returns (headcount, source_label, matched_text, verified)."""
    hc, src, matched = extract_headcount(f"{contact_text}\n{about_text}")
    verified = src in VERIFIED_HEADCOUNT_SOURCES
    if hc is None:
        hc = count_team_members(f"{about_text}\n{home_text}")
        if hc:
            src, matched = "team_page_count", f"team_roles~{hc}"
            verified = False
    if hc is None and employee_count_estimate:
        hc = employee_count_estimate
        src, matched = "directory_estimate", str(hc)
        verified = False
    return hc, src, matched, verified


def detect_smb_verticals(text: str) -> list[str]:
    found: list[str] = []
    for slug, pat in SMB_VERTICAL_PATTERNS:
        if re.search(pat, text, re.I):
            found.append(slug)
    return found


def detect_enterprise_clients(text: str) -> bool:
    hits = sum(1 for pat in ENTERPRISE_CLIENT_PATTERNS if re.search(pat, text, re.I))
    return hits >= 2


def _parse_blog_date(match: re.Match[str]) -> datetime | None:
    groups = match.groupdict()
    if groups.get("d") and not groups.get("m"):
        return datetime.strptime(groups["d"], "%Y-%m-%d").replace(tzinfo=timezone.utc)
    month_raw = (groups.get("m") or "").strip(".")
    if not month_raw:
        return None
    month = month_raw[:3].title()
    return datetime.strptime(
        f"{month} {groups['d']} {groups['y']}",
        "%b %d %Y",
    ).replace(tzinfo=timezone.utc)


def parse_blog_recency(blog_text: str, max_days: int) -> tuple[bool, str, str]:
    if blog_text.startswith("[fetch_failed"):
        return False, "", ""
    date_patterns = [
        r"(?P<d>20\d{2}-\d{2}-\d{2})",
        r"(?P<m>Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[a-z]*\.?\s+(?P<d>\d{1,2}),?\s+(?P<y>20\d{2})",
    ]
    now = datetime.now(timezone.utc)
    for pat in date_patterns:
        for m in re.finditer(pat, blog_text, re.I):
            try:
                dt = _parse_blog_date(m)
                if dt and now - dt <= timedelta(days=max_days):
                    return True, dt.date().isoformat(), m.group(0)
            except ValueError:
                continue
    return False, "", ""


def contextual_growth_signal(careers_text: str, about_text: str, base_url: str) -> SignalEvidence | None:
    for label, text in (("careers", careers_text), ("about", about_text)):
        if not text or text.startswith("[fetch_failed"):
            continue
        for pat in GROWTH_PHRASES:
            m = re.search(rf"(.{{0,80}}{pat}.{{0,80}})", text, re.I)
            if m:
                sentence = re.sub(r"\s+", " ", m.group(1)).strip()
                return SignalEvidence(
                    "H01",
                    base_url,
                    sentence[:300],
                    extra={"context": label},
                )
    return None


def verify_jobs(
    agency_name: str,
    careers_text: str,
    careers_url: str,
    website: str,
    *,
    tavily_search_fn=None,
) -> SignalEvidence | None:
    role_pat = r"business development|account executive|sales development|\bgrowth\b|\bsdr\b|\bbdr\b"

    if careers_text and not careers_text.startswith("[fetch_failed"):
        m = re.search(rf"(.{{0,100}}(?:{role_pat}).{{0,100}})", careers_text, re.I)
        snippet = m.group(1).strip()[:300] if m else ""
        if m and _job_hit_is_valid(agency_name, website, careers_url, snippet):
            return SignalEvidence(
                "H06",
                careers_url,
                snippet,
                status="verified_open",
            )

    if tavily_search_fn and _distinctive_tokens(agency_name):
        query = f'"{agency_name}" ("business development" OR "account executive") site:indeed.com/viewjob'
        try:
            results = tavily_search_fn(query, max_results=5)
        except Exception:
            results = []
        for hit in results:
            url = hit.get("url") or ""
            snippet = hit.get("content") or hit.get("snippet") or ""
            if "jobs available in" in snippet.lower() and not _agency_matches_posting(
                agency_name, website, f"{url} {snippet}"
            ):
                continue
            if not re.search(role_pat, snippet, re.I):
                continue
            if not _job_hit_is_valid(agency_name, website, url, snippet):
                continue
            return SignalEvidence(
                "H06",
                url,
                snippet[:300],
                status="verified_open",
                extra={"source": "job_board_search"},
            )
    return SignalEvidence("H06", careers_url or website, "", status="not_found")


def enrich_record(
    record: AgencyRecord,
    fetcher: CachedFetcher,
    config: PipelineConfig,
    *,
    tavily_search_fn=None,
) -> AgencyRecord:
    if not record.website:
        return record

    base = record.website if record.website.startswith("http") else f"https://{record.website}"
    home_html, _ = fetcher.fetch(base)
    record.pages["home"] = _html_to_text(home_html)
    links = discover_page_links(home_html, base)

    for kind, default_suffix in [
        ("contact", "/contact"),
        ("about", "/about"),
        ("careers", "/careers"),
        ("portfolio", "/work"),
        ("blog", "/blog"),
    ]:
        url = links.get(kind)
        if not url and kind in {"contact", "about"}:
            from urllib.parse import urljoin
            url = urljoin(base, default_suffix)
        if url:
            text = fetcher.fetch_text_only(url)
            record.pages[kind] = text

    contact_text = record.pages.get("contact", "") + "\n" + record.pages.get("about", "")
    about_text = record.pages.get("about", "")
    careers_text = record.pages.get("careers", "")
    portfolio_text = record.pages.get("portfolio", "")
    blog_text = record.pages.get("blog", "")

    hc, src, matched, verified = resolve_headcount(
        contact_text,
        about_text,
        record.pages.get("home", ""),
        employee_count_estimate=record.employee_count_estimate,
    )
    record.headcount = hc
    record.headcount_source = src
    record.headcount_verified = verified

    portfolio_corpus = portfolio_text + record.pages.get("home", "")
    record.smb_verticals = detect_smb_verticals(portfolio_corpus)
    record.enterprise_client_risk = detect_enterprise_clients(portfolio_corpus)

    record.signals = {}

    h01 = contextual_growth_signal(careers_text, about_text, links.get("careers", base))
    if h01:
        record.signals["H01"] = h01.to_dict()

    if record.smb_verticals:
        record.signals["H02"] = SignalEvidence(
            "H02",
            links.get("portfolio", base),
            ", ".join(record.smb_verticals),
        ).to_dict()

    blog_days = int(config.get("blog_recency_days", default=60))
    recent, post_date, matched_date = parse_blog_recency(blog_text, blog_days)
    if recent:
        record.signals["H03b"] = SignalEvidence(
            "H03b",
            links.get("blog", base),
            f"Latest post ~{post_date}: {matched_date}",
        ).to_dict()

    home_lower = home_html.lower()
    for pat in DIRECTORY_PATTERNS:
        if re.search(pat, home_lower):
            record.signals["H04"] = SignalEvidence("H04", base, pat).to_dict()
            break

    for pat in REFERRAL_PATTERNS:
        m = re.search(rf"(.{{0,60}}{pat}.{{0,60}})", record.pages.get("home", ""), re.I)
        if m:
            record.signals["H05"] = SignalEvidence("H05", base, m.group(1).strip()).to_dict()
            break

    h06 = verify_jobs(
        record.agency_name,
        careers_text,
        links.get("careers", ""),
        record.website,
        tavily_search_fn=tavily_search_fn,
    )
    if h06:
        record.signals["H06"] = h06.to_dict()

    for slug, pat in TECH_STACK_PATTERNS:
        if re.search(pat, home_html + about_text, re.I):
            m = re.search(pat, home_html + about_text, re.I)
            record.signals["H07"] = SignalEvidence(
                "H07", base, m.group(0) if m else slug, extra={"stack": slug}
            ).to_dict()
            break

    return record
