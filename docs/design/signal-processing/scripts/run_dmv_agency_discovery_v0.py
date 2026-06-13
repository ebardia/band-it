#!/usr/bin/env python3
"""
DMV marketing agency discovery — Cat Bot adoption prospects (v0).

Pipeline: census (optional Places) → fit → hunt → exclude → score → ranked CSV.

Usage:
  python docs/design/signal-processing/scripts/run_dmv_agency_discovery_v0.py \\
    --input docs/design/signal-processing/dmv-marketing-agencies-seed.csv \\
    --output docs/design/signal-processing/output/dmv-agency-targets.csv \\
    --fetch-web --top 50

See dmv-marketing-agency-cat-bot-discovery.md
"""

from __future__ import annotations

import argparse
import csv
import json
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
SIGNAL_ROOT = SCRIPT_DIR.parent
DEFAULT_INPUT = SIGNAL_ROOT / "dmv-marketing-agencies-seed.csv"
DEFAULT_OUTPUT = SIGNAL_ROOT / "output" / "dmv-agency-targets.csv"

sys.path.insert(0, str(SCRIPT_DIR))

from cat_bot_roam.env import load_dotenv  # noqa: E402

load_dotenv()

from band_it_outbound.fetch import fetch_website_text  # noqa: E402
from dmv_agency_discovery.census import census_places  # noqa: E402
from dmv_agency_discovery.detectors import check_fit, detect_excludes, detect_hunts  # noqa: E402
from dmv_agency_discovery.models import Agency, ScoredAgency  # noqa: E402
from dmv_agency_discovery.scoring import (  # noqa: E402
    build_evidence_links,
    build_why_flagged,
    score_agency,
    verification_hints,
)


def _parse_int(raw: str) -> int | None:
    raw = (raw or "").strip()
    if raw.isdigit():
        return int(raw)
    return None


def load_agencies(path: Path) -> list[Agency]:
    agencies: list[Agency] = []
    with path.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            name = (row.get("agency_name") or "").strip()
            if not name:
                continue
            agencies.append(
                Agency(
                    agency_name=name,
                    website=(row.get("website") or "").strip(),
                    city=(row.get("city") or "").strip(),
                    state=(row.get("state") or "").strip(),
                    employee_count_estimate=_parse_int(row.get("employee_count_estimate") or ""),
                    vertical_focus=(row.get("vertical_focus") or "").strip(),
                    job_postings_text=(row.get("job_postings_text") or "").strip(),
                    source_notes=(row.get("source_notes") or "").strip(),
                    clutch_url=(row.get("clutch_url") or "").strip(),
                    linkedin_company_url=(row.get("linkedin_company_url") or "").strip(),
                )
            )
    return agencies


def merge_agencies(seed: list[Agency], extra: list[Agency]) -> list[Agency]:
    by_domain: dict[str, Agency] = {}
    for agency in seed + extra:
        key = agency.domain or agency.agency_name.lower()
        if key not in by_domain:
            by_domain[key] = agency
            continue
        existing = by_domain[key]
        if not existing.website and agency.website:
            by_domain[key] = agency
    return list(by_domain.values())


def process_agency(agency: Agency, fetch_web: bool) -> ScoredAgency:
    if fetch_web and agency.website:
        agency.website_text = fetch_website_text(agency.website)

    fit_pass, fit_reason = check_fit(agency)
    scored = ScoredAgency(agency=agency, fit_pass=fit_pass, fit_reason=fit_reason)
    if not fit_pass:
        scored.why_flagged = build_why_flagged(scored)
        scored.verify_hints = verification_hints(scored)
        return scored

    scored.hits = detect_hunts(agency)
    scored.excludes = detect_excludes(agency)
    score_agency(scored)
    scored.why_flagged = build_why_flagged(scored)
    scored.evidence_links = build_evidence_links(scored)
    scored.verify_hints = verification_hints(scored)
    return scored


def write_csv(path: Path, rows: list[ScoredAgency]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = [
        "rank",
        "agency_name",
        "website",
        "city",
        "state",
        "employee_estimate",
        "agency_score",
        "why_flagged",
        "signals_fired",
        "exclude_flags",
        "evidence_links",
        "verify_status",
        "verification_hints",
        "source_notes",
    ]
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for rank, sc in enumerate(rows, start=1):
            a = sc.agency
            writer.writerow(
                {
                    "rank": rank,
                    "agency_name": a.agency_name,
                    "website": a.website,
                    "city": a.city,
                    "state": a.state,
                    "employee_estimate": a.employee_count_estimate or "",
                    "agency_score": sc.score,
                    "why_flagged": sc.why_flagged,
                    "signals_fired": "|".join(
                        f"{h.signal_id}:{h.evidence}" for h in sc.hits
                    ),
                    "exclude_flags": "|".join(
                        f"{x.signal_id}:{x.evidence}" for x in sc.excludes
                    ),
                    "evidence_links": "|".join(sc.evidence_links),
                    "verify_status": "pending",
                    "verification_hints": "; ".join(sc.verify_hints),
                    "source_notes": a.source_notes,
                }
            )


def write_dossiers(path: Path, rows: list[ScoredAgency]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = []
    for sc in rows:
        a = sc.agency
        payload.append(
            {
                "agency_name": a.agency_name,
                "website": a.website,
                "score": sc.score,
                "why_flagged": sc.why_flagged,
                "evidence_links": sc.evidence_links,
                "signals": [
                    {"id": h.signal_id, "name": h.signal_name, "evidence": h.evidence}
                    for h in sc.hits
                ],
                "pitch_hook": (
                    "Everything in why_flagged was assembled from public sources — "
                    "the same pipeline we sell you for your SMB prospects."
                ),
                "sample_mouse_placeholder": (
                    f"TODO: one dead mouse in {a.vertical_focus or 'their vertical'} + DMV metro"
                ),
            }
        )
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="DMV marketing agency Cat Bot discovery v0")
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT, help="Seed agencies CSV")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help="Ranked targets CSV")
    parser.add_argument("--top", type=int, default=50, help="Max rows in output")
    parser.add_argument("--min-score", type=int, default=55, help="Minimum agency_score")
    parser.add_argument(
        "--census-places",
        action="store_true",
        help="Merge Google Places census (requires GOOGLE_PLACES_API_KEY)",
    )
    parser.add_argument("--fetch-web", action="store_true", help="Fetch homepage text")
    parser.add_argument(
        "--include-failed-fit",
        action="store_true",
        help="Include fit-fail and excluded rows in output",
    )
    parser.add_argument("--dossier-json", type=Path, default=None, help="Write top-N dossier JSON")
    parser.add_argument("--dossier-top", type=int, default=15, help="Rows for dossier JSON")
    args = parser.parse_args()

    seed: list[Agency] = []
    if args.input.exists():
        seed = load_agencies(args.input)
    else:
        print(f"Seed not found (continuing without): {args.input}", file=sys.stderr)

    extra: list[Agency] = []
    if args.census_places:
        try:
            extra = census_places()
            print(f"Places census: {len(extra)} agencies")
        except RuntimeError as exc:
            print(f"Places census skipped: {exc}", file=sys.stderr)

    agencies = merge_agencies(seed, extra)
    if not agencies:
        print("No agencies to process.", file=sys.stderr)
        return 1

    scored_list = [process_agency(a, args.fetch_web) for a in agencies]

    eligible = [
        sc
        for sc in scored_list
        if sc.fit_pass and not sc.excludes and sc.score >= args.min_score
    ]
    if args.include_failed_fit:
        rest = [sc for sc in scored_list if sc not in eligible]
        eligible = eligible + rest

    eligible.sort(key=lambda s: s.score, reverse=True)
    top = eligible[: args.top]

    write_csv(args.output, top)
    print(f"Processed {len(agencies)} agencies -> wrote {len(top)} rows to {args.output}")
    if top:
        print(f"Top: {top[0].agency.agency_name} (score {top[0].score})")

    if args.dossier_json:
        dossier_rows = [sc for sc in eligible if sc.score >= args.min_score][: args.dossier_top]
        write_dossiers(args.dossier_json, dossier_rows)
        print(f"Dossier JSON: {args.dossier_json} ({len(dossier_rows)} rows)")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
