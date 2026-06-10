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
        elif item.source in {"reddit", "tavily_search"}:
            community.append(item)
        elif item.source in {"spa_website"}:
            other.insert(0, item)
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
            "Owned site positioning and regional news frame physician-trust and VIP experience.",
            lens="Spa website + regional press (consent machines A/B/C context)",
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


def _select_evidence_for_synthesis(items: list[EvidenceItem], *, max_items: int = 14) -> list[EvidenceItem]:
    """Pick a diverse, size-safe subset for LLM synthesis."""
    priority_sources = ("spa_website", "google_places", "yelp", "reddit", "news_rss", "web_fetch")
    chosen: list[EvidenceItem] = []
    seen_urls: set[str] = set()

    def add(item: EvidenceItem) -> None:
        if len(chosen) >= max_items:
            return
        key = item.source_url or item.title
        if key in seen_urls:
            return
        seen_urls.add(key)
        chosen.append(item)

    for source in priority_sources:
        for item in items:
            if item.source == source:
                add(item)

    # Prefer Tavily hits about choosing a spa, consent/opt-in, competitors, or Potomac Skin Care.
    keywords_high = (
        "physician",
        "choose",
        "consult",
        "consent",
        "opt-in",
        "potomac skin care",
        "competitor",
        "aluna",
        "medical aesthetics",
        "email list",
    )
    keywords_low = ("botox", "med spa", "potomac", "natural results", "book")

    tavily_items = [i for i in items if i.source == "tavily_search"]
    tavily_items.sort(
        key=lambda i: (
            -sum(1 for k in keywords_high if k in (i.title + i.text).lower()),
            -sum(1 for k in keywords_low if k in (i.title + i.text).lower()),
        )
    )
    for item in tavily_items:
        add(item)

    for item in items:
        add(item)

    return chosen[:max_items]


def _compact_evidence(evidence: RoamEvidence, *, max_items: int = 14, max_text: int = 900) -> list[dict[str, Any]]:
    selected = _select_evidence_for_synthesis(evidence.items, max_items=max_items)
    return [
        {
            "source": i.source,
            "url": i.source_url,
            "title": i.title[:200],
            "text": i.text[:max_text],
            "observed_at": i.observed_at[:10],
            "spa_name": i.spa_name,
        }
        for i in selected
    ]


def _synthesis_prompt(evidence: RoamEvidence) -> tuple[str, str]:
    system = (
        "You synthesize a Cat Bot roam return packet for a med-spa neighborhood hypothesis test. "
        "Use only supplied evidence. Output valid JSON matching the schema. "
        "Keep each evidence quote_or_summary under 400 characters. "
        "Three angles must genuinely differ. Label stuck_trap as the obvious bad first path. "
        "Include do_not_do items for illegal, deceptive, or cold-contact tactics. "
        "If community/reddit evidence is empty, use angle_2 for trust/process themes from "
        "website testimonials and how clients choose physicians — still distinct from angle_1 review aggregates."
    )
    return system, _synthesis_user_payload(evidence)


def _synthesis_user_payload(evidence: RoamEvidence) -> str:
    return json.dumps(
        {
            "neighborhood": evidence.config.neighborhood,
            "mission": evidence.config.mission,
            "owner_disclosure": {
                "owner_name": evidence.config.owner_name,
                "owner_mission": evidence.config.owner_mission,
                "bias_statement": evidence.config.bias_statement,
            },
            "evidence": _compact_evidence(evidence),
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
        separators=(",", ":"),
    )


def _parse_llm_json(text: str) -> dict[str, Any]:
    text = text.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        text = "\n".join(lines[1:-1] if lines[-1].startswith("```") else lines[1:])
    return json.loads(text)


def _finalize_packet(packet: dict[str, Any], evidence: RoamEvidence, *, mode: str) -> dict[str, Any]:
    packet.setdefault("roam_id", str(uuid.uuid4()))
    packet.setdefault("cat_id", "lab-v0")
    packet.setdefault("completed_at", datetime.now(timezone.utc).isoformat())
    packet["synthesis_mode"] = mode
    packet["collection_stats"] = {
        "evidence_count": len(evidence.items),
        "skipped_sources": evidence.skipped_sources,
        "warnings": evidence.warnings[:20],
    }
    return packet


def _gemini_synthesize(evidence: RoamEvidence) -> dict[str, Any]:
    api_key = env("GEMINI_API_KEY") or env("GOOGLE_API_KEY")
    if not api_key:
        raise RuntimeError("missing GEMINI_API_KEY")

    model = env("GEMINI_MODEL", "gemini-2.5-flash")
    system, user = _synthesis_prompt(evidence)
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
        f"?key={api_key}"
    )
    _, payload = request_json(
        url,
        method="POST",
        headers={"Content-Type": "application/json"},
        data={
            "systemInstruction": {"parts": [{"text": system}]},
            "contents": [{"role": "user", "parts": [{"text": user}]}],
            "generationConfig": {
                "responseMimeType": "application/json",
                "temperature": 0.3,
                "maxOutputTokens": 8192,
            },
        },
        timeout_sec=90,
    )
    candidates = payload.get("candidates") or []
    if not candidates:
        raise RuntimeError(f"gemini empty response: {payload}")

    parts = (candidates[0].get("content") or {}).get("parts") or []
    text = ""
    for part in parts:
        text += part.get("text") or ""
    if not text.strip():
        raise RuntimeError("gemini returned no text")

    packet = _parse_llm_json(text)
    return _finalize_packet(packet, evidence, mode="gemini")


def _anthropic_synthesize(evidence: RoamEvidence) -> dict[str, Any]:
    api_key = env("ANTHROPIC_API_KEY")
    if not api_key:
        raise RuntimeError("missing ANTHROPIC_API_KEY")

    system, user = _synthesis_prompt(evidence)

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

    text = ""
    for block in blocks:
        if block.get("type") == "text":
            text += block.get("text") or ""

    packet = _parse_llm_json(text)
    return _finalize_packet(packet, evidence, mode="anthropic")


def synthesize_packet(evidence: RoamEvidence, *, use_llm: bool = True) -> dict[str, Any]:
    if not use_llm:
        return heuristic_packet(evidence)

    if env("GEMINI_API_KEY") or env("GOOGLE_API_KEY"):
        try:
            return _gemini_synthesize(evidence)
        except (RuntimeError, json.JSONDecodeError, KeyError) as exc:
            evidence.warnings.append(f"gemini synthesis fallback: {exc}")

    if env("ANTHROPIC_API_KEY"):
        try:
            return _anthropic_synthesize(evidence)
        except (RuntimeError, json.JSONDecodeError, KeyError) as exc:
            evidence.warnings.append(f"anthropic synthesis fallback: {exc}")

    return heuristic_packet(evidence)


def write_packet_json(path: Path, packet: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(packet, indent=2), encoding="utf-8")
