from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class Company:
    company_name: str
    website: str = ""
    city: str = ""
    state: str = ""
    employee_count: int | None = None
    industry: str = ""
    job_postings_text: str = ""
    leadership_notes: str = ""
    sam_registered: str = ""
    source_notes: str = ""
    website_text: str = ""

    @property
    def corpus(self) -> str:
        parts = [
            self.company_name,
            self.industry,
            self.job_postings_text,
            self.leadership_notes,
            self.source_notes,
            self.website_text,
        ]
        return "\n".join(p for p in parts if p).lower()


@dataclass
class SignalHit:
    signal_id: str
    signal_name: str
    signal_role: str
    category: str
    evidence: str


@dataclass
class ScoredCompany:
    company: Company
    fit_pass: bool
    fit_reason: str
    hits: list[SignalHit] = field(default_factory=list)
    excludes: list[SignalHit] = field(default_factory=list)
    score: int = 0
    verify_hints: list[str] = field(default_factory=list)
