from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .env import env
from .http_util import request_json
from .models import EvidenceItem, RoamConfig, RoamEvidence


def _group_items(items: list[EvidenceItem]) -> tuple[list[EvidenceItem], list[EvidenceItem], list[EvidenceItem]]:
    reviews: list[EvidenceItem] = []
    community: list[EvidenceItem] = []
    other: list[EvidenceItem] = []
    for item in items:
        if item.source in {"google_places", "yelp"}:
            reviews.append(item)
        elif item.source in {"reddit"}:
            community.append(item)
        else:
            other.append(item)
    return reviews, community, other


def heuristic_packet(evidence: RoamEvidence) -> dict[str, Any]:
    reviews, community, other = _group_items(evidence.items)
    now = datetime.now(timezone.utc).isoformat()
    roam_id = str(uuid.uuid4())

    def angle_from(items: list[EvidenceItem], thesis: str, **extra: Any) -> dict[str, Any]:
        return {
            "thesis": thesis,
            "evidence": [i.to_angle_evidence() for i in items[:8]],
            "confidence": "medium" if len(items) >= 3 else "low",
            **extra,
        }

    return {
        "roam_id": roam_id,
        "cat_id": "lab-v0",
        "neighborhood": evidence.config.neighborhood,
        "mission": evidence.config.mission,
        "completed_at": now,
        "synthesis_mode": "heuristic",
        "owner_disclosure": {
            "owner_name": evidence.config.owner_name,
            "owner_mission": evidence.config.owner_mission,
            "bias_statement": evidence.config.bias_statement,
        },
        "angle_1": angle_from(
            reviews,
            "Review platforms surface experience themes (service quality, wait times, results).",
        ),
        "angle_2": angle_from(
            community,
            "Community threads emphasize questions, skepticism, and rejected outreach patterns.",
            contradicts_angle_1="Reviews optimize for outcomes; forums optimize for trust and process.",
        ),
        "angle_3": angle_from(
            other,
            "News and secondary web sources add reputation and local context.",
            lens="Regional press and discovered forum/blog pages",
        ),
        "stuck_trap": "Buy contact lists or cold-DM affluent zip residents from review scrapes.",
        "recommendation": {
            "ranked_paths": [
                "Consent-native discovery (user-initiated search and spa-owned nurture)",
                "Community-informed FAQ and objection handling on owned channels",
                "Partnership with local trust anchors (studios, physicians) — verify manually",
            ],
            "human_decision_needed": "Which path matches Potomac Skin Care brand and legal boundaries?",
        },
        "do_not_do": [
            "Scrape login-walled neighborhoods (Nextdoor, private Facebook groups)",
            "Treat review snippets as opted-in marketing contacts",
        ],
        "proposed_memory_items": [],
        "collection_stats": {
            "evidence_count": len(evidence.items),
            "skipped_sources": evidence.skipped_sources,
            "warnings": evidence.warnings[:20],
        },
    }


def _anthropic_synthesize(evidence: RoamEvidence) -> dict[str, Any]:
    api_key = env("ANTHROPIC_API_KEY")
    if not api_key:
        raise RuntimeError("missing ANTHROPIC_API_KEY")

    compact = [
        {
            "source": i.source,
            "url": i.source_url,
            "title": i.title,
            "text": i.text[:1500],
            "observed_at": i.observed_at,
            "spa_name": i.spa_name,
        }
        for i in evidence.items[:40]
    ]
    system = (
        "You synthesize a Cat Bot roam return packet for a med-spa neighborhood hypothesis test. "
        "Use only supplied evidence. Output valid JSON matching the schema. "
        "Three angles must genuinely differ. Label stuck_trap as the obvious bad first path. "
        "Include do_not_do items for illegal, deceptive, or cold-contact tactics."
    )
    user = json.dumps(
        {
            "neighborhood": evidence.config.neighborhood,
            "mission": evidence.config.mission,
            "owner_disclosure": {
                "owner_name": evidence.config.owner_name,
                "owner_mission": evidence.config.owner_mission,
                "bias_statement": evidence.config.bias_statement,
            },
            "evidence": compact,
            "required_schema": {
                "roam_id": "uuid string",
                "cat_id": "lab-v0",
                "neighborhood": "string",
                "mission": "string",
                "completed_at": "ISO-8601",
                "owner_disclosure": {},
                "angle_1": {"thesis": "", "evidence": [], "confidence": ""},
                "angle_2": {
                    "thesis": "",
                    "contradicts_angle_1": "",
                    "evidence": [],
                    "confidence": "",
                },
                "angle_3": {"thesis": "", "lens": "", "evidence": [], "confidence": ""},
                "stuck_trap": "",
                "recommendation": {"ranked_paths": [], "human_decision_needed": ""},
                "do_not_do": [],
                "proposed_memory_items": [],
            },
        },
        indent=2,
    )

    _, payload = request_json(
        "https://api.anthropic.com/v1/messages",
        method="POST",
        headers={
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        data={
            "model": env("ANTHROPIC_MODEL", "claude-sonnet-4-20250514"),
            "max_tokens": 4096,
            "system": system,
            "messages": [{"role": "user", "content": user}],
        },
    )

    blocks = payload.get("content") or []
    text = ""
    for block in blocks:
        if block.get("type") == "text":
            text += block.get("text") or ""

    text = text.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        text = "\n".join(lines[1:-1] if lines[-1].startswith("```") else lines[1:])

    packet = json.loads(text)
    packet.setdefault("roam_id", str(uuid.uuid4()))
    packet.setdefault("cat_id", "lab-v0")
    packet.setdefault("completed_at", datetime.now(timezone.utc).isoformat())
    packet["synthesis_mode"] = "anthropic"
    packet["collection_stats"] = {
        "evidence_count": len(evidence.items),
        "skipped_sources": evidence.skipped_sources,
        "warnings": evidence.warnings[:20],
    }
    return packet


def synthesize_packet(evidence: RoamEvidence, *, use_llm: bool = True) -> dict[str, Any]:
    if use_llm and env("ANTHROPIC_API_KEY"):
        try:
            return _anthropic_synthesize(evidence)
        except (RuntimeError, json.JSONDecodeError, KeyError) as exc:
            evidence.warnings.append(f"synthesis fallback: {exc}")
    return heuristic_packet(evidence)


def write_packet_json(path: Path, packet: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(packet, indent=2), encoding="utf-8")
