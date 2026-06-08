from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass
class MedSpa:
    spa_name: str
    website: str = ""
    city: str = ""
    state: str = ""
    zip: str = ""
    source_notes: str = ""


@dataclass
class EvidenceItem:
    source: str
    source_url: str
    title: str
    text: str
    observed_at: str
    spa_name: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_angle_evidence(self) -> dict[str, str]:
        return {
            "source_url": self.source_url,
            "quote_or_summary": self.text[:2000],
            "observed_at": self.observed_at[:10],
            "source": self.source,
            "title": self.title,
        }


@dataclass
class RoamConfig:
    neighborhood: str
    mission: str
    owner_name: str = "Work Smarter Digital"
    owner_mission: str = "Digital consent paths for affluent DMV med-spa clients"
    bias_statement: str = (
        "This cat is owned by Work Smarter Digital and may favor CRM and consent-native paths."
    )
    reddit_subreddits: list[str] = field(
        default_factory=lambda: [
            "SkincareAddiction",
            "PlasticSurgery",
            "30PlusSkinCare",
            "Botox",
            "washingtondc",
            "nova",
            "MontgomeryCountyMD",
        ]
    )
    reddit_queries: list[str] = field(
        default_factory=lambda: [
            "med spa DMV",
            "botox Potomac",
            "med spa Potomac MD",
            "aesthetic clinic McLean",
            "med spa Chevy Chase",
        ]
    )


@dataclass
class RoamEvidence:
    config: RoamConfig
    spas: list[MedSpa]
    items: list[EvidenceItem] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    skipped_sources: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "neighborhood": self.config.neighborhood,
            "mission": self.config.mission,
            "spas": [asdict(s) for s in self.spas],
            "evidence_count": len(self.items),
            "warnings": self.warnings,
            "skipped_sources": self.skipped_sources,
            "items": [asdict(i) for i in self.items],
        }
