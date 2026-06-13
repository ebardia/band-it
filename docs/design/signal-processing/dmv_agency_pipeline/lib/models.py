from __future__ import annotations

import hashlib
import json
import re
from dataclasses import asdict, dataclass, field
from typing import Any
from urllib.parse import urlparse


def normalize_domain(website: str) -> str:
    if not website:
        return ""
    url = website if "://" in website else f"https://{website}"
    host = urlparse(url).netloc.lower().removeprefix("www.")
    return host.split(":")[0]


@dataclass
class SignalEvidence:
    signal_id: str
    source_url: str
    matched_text: str
    status: str = "fired"
    extra: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class AgencyRecord:
    agency_name: str
    website: str
    domain: str = ""
    city: str = ""
    county: str = ""
    state: str = ""
    zip_code: str = ""
    headcount: int | None = None
    headcount_source: str = ""
    headcount_verified: bool = False
    verify_status: str = "pending"
    source_notes: str = ""
    places_id: str = ""
    clutch_url: str = ""
    linkedin_company_url: str = ""
    employee_count_estimate: int | None = None
    vertical_focus: str = ""
    pages: dict[str, str] = field(default_factory=dict)
    signals: dict[str, dict[str, Any]] = field(default_factory=dict)
    agency_score: int = 0
    reject_reason: str = ""
    smb_verticals: list[str] = field(default_factory=list)
    enterprise_client_risk: bool = False

    def __post_init__(self) -> None:
        if not self.domain:
            self.domain = normalize_domain(self.website)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> AgencyRecord:
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})

    @property
    def corpus(self) -> str:
        parts = [
            self.agency_name,
            self.vertical_focus,
            self.source_notes,
            *self.pages.values(),
        ]
        return "\n".join(p for p in parts if p).lower()


def parse_zip_from_city_field(city: str) -> tuple[str, str]:
    """'MD 20878' -> ('20878', 'MD')"""
    city = (city or "").strip()
    m = re.match(r"^(?P<st>[A-Z]{2})\s+(?P<zip>\d{5})", city, re.I)
    if m:
        return m.group("zip"), m.group("st").upper()
    m2 = re.search(r"\b(\d{5})\b", city)
    if m2:
        return m2.group(1), ""
    return "", city
