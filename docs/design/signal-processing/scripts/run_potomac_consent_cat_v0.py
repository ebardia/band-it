#!/usr/bin/env python3
"""
Gold-path Cat Bot roam — Potomac Skin Care (Work Smarter demo).

Runs consent-native mission against the real client from campaign-brief-potomac-skin-care.md:
  spa website + Google Places + Yelp + news RSS → return packet.

Usage:
  python docs/design/signal-processing/scripts/run_potomac_consent_cat_v0.py
  python docs/design/signal-processing/scripts/run_potomac_consent_cat_v0.py --no-synthesize

Outputs:
  docs/design/signal-processing/worksmarter-medspa/output/potomac-consent-cat-evidence-<stamp>.json
  docs/design/signal-processing/worksmarter-medspa/output/potomac-consent-cat-packet-<stamp>.json
"""

from __future__ import annotations

import argparse
import sys
from datetime import datetime, timezone
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
SIGNAL_ROOT = SCRIPT_DIR.parent
WORKSMARTER_ROOT = SIGNAL_ROOT / "worksmarter-medspa"
DEFAULT_SPA_CSV = WORKSMARTER_ROOT / "potomac-skin-care-gold-path.csv"
DEFAULT_OUTPUT_DIR = WORKSMARTER_ROOT / "output"

sys.path.insert(0, str(SCRIPT_DIR))

from cat_bot_roam.env import load_dotenv  # noqa: E402
from cat_bot_roam.models import RoamConfig  # noqa: E402
from cat_bot_roam.pipeline import dedupe_items, load_spas, run_roam, write_evidence_json  # noqa: E402
from cat_bot_roam.synthesize import synthesize_packet, write_packet_json  # noqa: E402


def stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def potomac_config() -> RoamConfig:
    return RoamConfig(
        neighborhood="Potomac Skin Care trade area — affluent DMV med spa (20854 + 12mi radius)",
        mission=(
            "Map how affluent clients discover, trust, and consent to med spa care "
            "— not cold contact or review-scrape outreach"
        ),
        owner_name="Work Smarter Digital (for Potomac Skin Care)",
        owner_mission=(
            "Consent-native digital paths for Potomac Skin Care — SMS keyword, website concierge, "
            "partner embeds; HighLevel nurture after opt-in"
        ),
        bias_statement=(
            "This cat is owned by Work Smarter Digital on behalf of Potomac Skin Care. "
            "It may favor CRM, re-engagement, and physician-trust messaging over discount or cold lists."
        ),
        reddit_queries=[
            "med spa Potomac",
            "botox DMV experience",
            "how choose med spa",
            "med spa consultation worth it",
            "Potomac aesthetic",
        ],
    )


def main() -> int:
    load_dotenv()

    parser = argparse.ArgumentParser(description="Potomac Skin Care consent cat — gold-path roam")
    parser.add_argument("--spa-csv", type=Path, default=DEFAULT_SPA_CSV)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--no-reddit", action="store_true", help="Skip Reddit (default until API approved)")
    parser.add_argument("--reddit", action="store_true", help="Enable Reddit collection")
    parser.add_argument("--no-places", action="store_true")
    parser.add_argument("--no-yelp", action="store_true")
    parser.add_argument("--no-news", action="store_true")
    parser.add_argument("--no-website", action="store_true")
    parser.add_argument("--brave", action="store_true", help="Enable Brave search discovery")
    parser.add_argument("--no-tavily", action="store_true", help="Disable Tavily web search (on by default)")
    parser.add_argument(
        "--no-synthesize",
        action="store_true",
        help="Heuristic return packet only (no Anthropic call)",
    )
    args = parser.parse_args()

    if not args.spa_csv.exists():
        print(f"Spa CSV not found: {args.spa_csv}", file=sys.stderr)
        return 1

    spas = load_spas(args.spa_csv)
    if not spas:
        print("No spas in seed file.", file=sys.stderr)
        return 1

    config = potomac_config()
    news_query = (
        '"Potomac Skin Care" OR "med spa" Potomac Maryland OR '
        '"River Road" aesthetics OR botox Potomac'
    )

    print(f"Gold-path roam: {spas[0].spa_name} ({spas[0].city}, {spas[0].state} {spas[0].zip})")
    print(f"Mission: {config.mission}")

    evidence = run_roam(
        spas,
        config,
        enable_reddit=args.reddit and not args.no_reddit,
        enable_places=not args.no_places,
        enable_yelp=not args.no_yelp,
        enable_brave=args.brave,
        enable_tavily=not args.no_tavily,
        enable_news=not args.no_news,
        enable_spa_website=not args.no_website,
        news_query=news_query,
        max_reddit_items=20,
    )
    evidence.items = dedupe_items(evidence.items)

    out_stamp = stamp()
    evidence_path = args.output_dir / f"potomac-consent-cat-evidence-{out_stamp}.json"
    packet_path = args.output_dir / f"potomac-consent-cat-packet-{out_stamp}.json"

    write_evidence_json(evidence_path, evidence)
    packet = synthesize_packet(evidence, use_llm=not args.no_synthesize)
    packet["cat_id"] = "potomac-consent-cat-v0"
    packet["client_band"] = "Potomac Skin Care"
    packet["big_band"] = "Work Smarter Digital"
    write_packet_json(packet_path, packet)

    by_source: dict[str, int] = {}
    for item in evidence.items:
        by_source[item.source] = by_source.get(item.source, 0) + 1

    print(f"Evidence: {len(evidence.items)} items -> {evidence_path}")
    print(f"  by source: {by_source}")
    print(f"Packet ({packet.get('synthesis_mode', '?')}) -> {packet_path}")
    if evidence.warnings:
        print("Warnings:")
        for w in evidence.warnings[:12]:
            print(f"  - {w}")
        if len(evidence.warnings) > 12:
            print(f"  ... and {len(evidence.warnings) - 12} more")
    if evidence.skipped_sources:
        print(f"Skipped / empty sources: {', '.join(evidence.skipped_sources)}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
