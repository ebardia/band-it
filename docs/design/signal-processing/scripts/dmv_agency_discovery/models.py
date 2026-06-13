from __future__ import annotations

from dataclasses import dataclass, field
from urllib.parse import urlparse


@dataclass
class Agency:
    agency_name: str
    website: str = ""
    city: str = ""
    state: str = ""
    zip_code: str = ""
    employee_count_estimate: int | None = None
    vertical_focus: str = ""
    job_postings_text: str = ""
    source_notes: str = ""
    clutch_url: str = ""
    linkedin_company_url: str = ""
    places_id: str = ""
    website_text: str = ""

    @property
    def domain(self) -> str:
        if not self.website:
            return ""
        host = urlparse(self.website if "://" in self.website else f"https://{self.website}").netloc
        return host.lower().removeprefix("www.")

    @property
    def corpus(self) -> str:
        parts = [
            self.agency_name,
            self.vertical_focus,
            self.job_postings_text,
            self.source_notes,
            self.website_text,
            self.city,
            self.state,
        ]
        return "\n".join(p for p in parts if p).lower()


@dataclass
class SignalHit:
    signal_id: str
    signal_name: str
    signal_role: str
    category: str
    evidence: str
    points: int = 0


@dataclass
class ScoredAgency:
    agency: Agency
    fit_pass: bool
    fit_reason: str
    hits: list[SignalHit] = field(default_factory=list)
    excludes: list[SignalHit] = field(default_factory=list)
    score: int = 0
    why_flagged: str = ""
    evidence_links: list[str] = field(default_factory=list)
    verify_hints: list[str] = field(default_factory=list)
