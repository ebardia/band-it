from __future__ import annotations

import csv
import uuid
from datetime import datetime, timezone
from pathlib import Path

from .discovery_client import collect_discovery, collect_news_rss
from .models import EvidenceItem, MedSpa, RoamConfig, RoamEvidence
from .places_client import collect_for_spa as collect_places_for_spa
from .reddit_client import collect_reddit
from .yelp_client import collect_for_spa as collect_yelp_for_spa


def load_spas(path: Path, *, zip_filter: str = "", name_contains: str = "") -> list[MedSpa]:
    spas: list[MedSpa] = []
    with path.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            name = (row.get("spa_name") or "").strip()
            if not name:
                continue
            zip_code = (row.get("zip") or "").strip()
            if zip_filter and zip_code != zip_filter:
                continue
            if name_contains and name_contains.lower() not in name.lower():
                continue
            spas.append(
                MedSpa(
                    spa_name=name,
                    website=(row.get("website") or "").strip(),
                    city=(row.get("city") or "").strip(),
                    state=(row.get("state") or "").strip(),
                    zip=zip_code,
                    source_notes=(row.get("source_notes") or "").strip(),
                )
            )
    return spas


def run_roam(
    spas: list[MedSpa],
    config: RoamConfig,
    *,
    enable_reddit: bool = True,
    enable_places: bool = True,
    enable_yelp: bool = True,
    enable_brave: bool = True,
    enable_news: bool = True,
    max_reddit_items: int = 30,
) -> RoamEvidence:
    evidence = RoamEvidence(config=config, spas=spas)
    skipped: set[str] = set()

    if enable_reddit:
        reddit_items, reddit_warnings = collect_reddit(
            config.reddit_queries,
            config.reddit_subreddits,
            max_items=max_reddit_items,
        )
        evidence.items.extend(reddit_items)
        evidence.warnings.extend(reddit_warnings)
        if not reddit_items and reddit_warnings:
            skipped.add("reddit")
    else:
        skipped.add("reddit")

    for spa in spas:
        if enable_places:
            items, warnings = collect_places_for_spa(spa)
            evidence.items.extend(items)
            evidence.warnings.extend(warnings)
            if not items and warnings:
                skipped.add("google_places")
        else:
            skipped.add("google_places")

        if enable_yelp:
            items, warnings = collect_yelp_for_spa(spa)
            evidence.items.extend(items)
            evidence.warnings.extend(warnings)
            if not items and warnings:
                skipped.add("yelp")
        else:
            skipped.add("yelp")

    discovery_queries = [
        f'"{spa.spa_name}" med spa review',
        "med spa Potomac MD forum",
        "botox DMV experience reddit OR forum",
    ]
    for spa in spas[:2]:
        discovery_queries.append(f'"{spa.spa_name}" {spa.city} review')

    if enable_brave:
        items, warnings = collect_discovery(discovery_queries, max_results=4, max_fetch=3)
        evidence.items.extend(items)
        evidence.warnings.extend(warnings)
        if not items and warnings:
            skipped.add("brave")
    else:
        skipped.add("brave")

    if enable_news:
        items, warnings = collect_news_rss("med spa Potomac Maryland OR DMV aesthetics")
        evidence.items.extend(items)
        evidence.warnings.extend(warnings)

    evidence.skipped_sources = sorted(skipped)
    return evidence


def dedupe_items(items: list[EvidenceItem]) -> list[EvidenceItem]:
    seen: set[str] = set()
    out: list[EvidenceItem] = []
    for item in items:
        key = item.source_url or item.title
        if key in seen:
            continue
        seen.add(key)
        out.append(item)
    return out


def write_evidence_json(path: Path, evidence: RoamEvidence) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    import json

    payload = evidence.to_dict()
    payload["collected_at"] = datetime.now(timezone.utc).isoformat()
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
