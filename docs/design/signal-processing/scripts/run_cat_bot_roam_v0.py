#!/usr/bin/env python3
"""
Cat Bot v0 roam lab — programmatic community + review collection.

Implements adopt-a-cat-bot.md §12.4:
  Reddit + Google Places + Yelp + optional Brave search + news RSS → return packet.

Usage:
  python docs/design/signal-processing/scripts/run_cat_bot_roam_v0.py

  python docs/design/signal-processing/scripts/run_cat_bot_roam_v0.py \\
    --zip 20854 --max-spas 2 --no-synthesize

Environment (repo .env or shell):
  REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET
  GOOGLE_PLACES_API_KEY
  YELP_API_KEY
  BRAVE_SEARCH_API_KEY          (optional — forum/blog discovery)
  ANTHROPIC_API_KEY             (optional — LLM return packet; else heuristic)
  ANTHROPIC_MODEL               (optional, default claude-sonnet-4-20250514)

Outputs:
  docs/design/signal-processing/output/cat-bot-roam-evidence-<stamp>.json
  docs/design/signal-processing/output/cat-bot-roam-packet-<stamp>.json
"""

from __future__ import annotations

import argparse
import sys
from datetime import datetime, timezone
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
SIGNAL_ROOT = SCRIPT_DIR.parent
DEFAULT_SPA_CSV = SIGNAL_ROOT / "worksmarter-medspa" / "sample-med-spas-dmv.csv"
DEFAULT_OUTPUT_DIR = SIGNAL_ROOT / "output"

sys.path.insert(0, str(SCRIPT_DIR))

from cat_bot_roam.env import load_dotenv  # noqa: E402
from cat_bot_roam.models import RoamConfig  # noqa: E402
from cat_bot_roam.pipeline import dedupe_items, load_spas, run_roam, write_evidence_json  # noqa: E402
from cat_bot_roam.synthesize import synthesize_packet, write_packet_json  # noqa: E402


def stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def main() -> int:
    load_dotenv()

    parser = argparse.ArgumentParser(description="Cat Bot v0 roam lab")
    parser.add_argument("--spa-csv", type=Path, default=DEFAULT_SPA_CSV, help="Seed med spas CSV")
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR, help="Output directory")
    parser.add_argument("--zip", dest="zip_filter", default="", help="Filter spas by zip (e.g. 20854)")
    parser.add_argument("--spa-name", default="", help="Filter spas where name contains this string")
    parser.add_argument("--max-spas", type=int, default=3, help="Max spas to query for reviews")
    parser.add_argument("--max-reddit", type=int, default=25, help="Max Reddit evidence items")
    parser.add_argument("--neighborhood", default="Affluent DMV med-spa end clients")
    parser.add_argument(
        "--mission",
        default="Map how target personas discover and consent — not cold contact",
    )
    parser.add_argument("--no-reddit", action="store_true")
    parser.add_argument("--no-places", action="store_true")
    parser.add_argument("--no-yelp", action="store_true")
    parser.add_argument("--no-brave", action="store_true")
    parser.add_argument("--no-news", action="store_true")
    parser.add_argument(
        "--no-synthesize",
        action="store_true",
        help="Heuristic return packet only (no Anthropic call)",
    )
    args = parser.parse_args()

    if not args.spa_csv.exists():
        print(f"Spa CSV not found: {args.spa_csv}", file=sys.stderr)
        return 1

    spas = load_spas(args.spa_csv, zip_filter=args.zip_filter, name_contains=args.spa_name)
    if not spas:
        print("No spas matched filters.", file=sys.stderr)
        return 1
    spas = spas[: args.max_spas]

    config = RoamConfig(neighborhood=args.neighborhood, mission=args.mission)
    print(f"Roam lab: {len(spas)} spa(s), neighborhood={config.neighborhood}")

    evidence = run_roam(
        spas,
        config,
        enable_reddit=not args.no_reddit,
        enable_places=not args.no_places,
        enable_yelp=not args.no_yelp,
        enable_brave=not args.no_brave,
        enable_news=not args.no_news,
        max_reddit_items=args.max_reddit,
    )
    evidence.items = dedupe_items(evidence.items)

    out_stamp = stamp()
    evidence_path = args.output_dir / f"cat-bot-roam-evidence-{out_stamp}.json"
    packet_path = args.output_dir / f"cat-bot-roam-packet-{out_stamp}.json"

    write_evidence_json(evidence_path, evidence)
    packet = synthesize_packet(evidence, use_llm=not args.no_synthesize)
    write_packet_json(packet_path, packet)

    print(f"Evidence: {len(evidence.items)} items -> {evidence_path}")
    print(f"Packet ({packet.get('synthesis_mode', '?')}) -> {packet_path}")
    if evidence.warnings:
        print("Warnings:")
        for w in evidence.warnings[:15]:
            print(f"  - {w}")
        if len(evidence.warnings) > 15:
            print(f"  ... and {len(evidence.warnings) - 15} more")
    if evidence.skipped_sources:
        print(f"Skipped / empty sources: {', '.join(evidence.skipped_sources)}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
