#!/usr/bin/env python3
"""
Band It outbound discovery — signal processing v1.

Pipeline: fit filters → hunt signals → exclude rules → score → ranked CSV.

Usage:
  python docs/design/signal-processing/scripts/run_band_it_outbound_v1.py \\
    --input docs/design/signal-processing/sample-seed-companies.csv \\
    --output docs/design/signal-processing/output/band-it-outbound-leads.csv \\
    --top 50

Input CSV columns (header row required):
  company_name, website, city, state, employee_count, industry,
  job_postings_text, leadership_notes, sam_registered, source_notes

See band-it-outbound-discovery.md for signal definitions.
"""

from __future__ import annotations

import argparse
import csv
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
PKG_DIR = SCRIPT_DIR / "band_it_outbound"
SIGNAL_ROOT = SCRIPT_DIR.parent
DEFAULT_REGISTRY = SIGNAL_ROOT / "band-it-outbound-signals.csv"
DEFAULT_INPUT = SIGNAL_ROOT / "sample-seed-companies.csv"
DEFAULT_OUTPUT = SIGNAL_ROOT / "output" / "band-it-outbound-leads.csv"

sys.path.insert(0, str(SCRIPT_DIR))

from band_it_outbound.detectors import check_fit, detect_excludes, detect_hunts  # noqa: E402
from band_it_outbound.fetch import fetch_website_text  # noqa: E402
from band_it_outbound.models import Company, ScoredCompany  # noqa: E402
from band_it_outbound.scoring import score_company, verification_hints  # noqa: E402


def load_companies(path: Path) -> list[Company]:
    companies: list[Company] = []
    with path.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            name = (row.get("company_name") or "").strip()
            if not name:
                continue
            ec_raw = (row.get("employee_count") or "").strip()
            employee_count: int | None = None
            if ec_raw.isdigit():
                employee_count = int(ec_raw)
            companies.append(
                Company(
                    company_name=name,
                    website=(row.get("website") or "").strip(),
                    city=(row.get("city") or "").strip(),
                    state=(row.get("state") or "").strip(),
                    employee_count=employee_count,
                    industry=(row.get("industry") or "").strip(),
                    job_postings_text=(row.get("job_postings_text") or "").strip(),
                    leadership_notes=(row.get("leadership_notes") or "").strip(),
                    sam_registered=(row.get("sam_registered") or "").strip(),
                    source_notes=(row.get("source_notes") or "").strip(),
                )
            )
    return companies


def process_company(company: Company, fetch_web: bool) -> ScoredCompany:
    if fetch_web and company.website:
        company.website_text = fetch_website_text(company.website)

    fit_pass, fit_reason = check_fit(company)
    scored = ScoredCompany(company=company, fit_pass=fit_pass, fit_reason=fit_reason)
    if not fit_pass:
        scored.verify_hints = verification_hints(scored)
        return scored

    scored.hits = detect_hunts(company)
    scored.excludes = detect_excludes(company)
    score_company(scored)
    scored.verify_hints = verification_hints(scored)
    return scored


def write_output(path: Path, rows: list[ScoredCompany]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = [
        "rank",
        "company_name",
        "website",
        "city",
        "state",
        "employee_count",
        "opportunity_score",
        "fit_pass",
        "fit_reason",
        "signals_fired",
        "signal_categories",
        "exclude_flags",
        "verify_status",
        "verification_hints",
        "source_notes",
    ]
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for rank, sc in enumerate(rows, start=1):
            c = sc.company
            writer.writerow(
                {
                    "rank": rank,
                    "company_name": c.company_name,
                    "website": c.website,
                    "city": c.city,
                    "state": c.state,
                    "employee_count": c.employee_count or "",
                    "opportunity_score": sc.score,
                    "fit_pass": sc.fit_pass,
                    "fit_reason": sc.fit_reason,
                    "signals_fired": "|".join(
                        f"{h.signal_id}:{h.evidence}" for h in sc.hits
                    ),
                    "signal_categories": "|".join(sorted({h.category for h in sc.hits})),
                    "exclude_flags": "|".join(
                        f"{x.signal_id}:{x.evidence}" for x in sc.excludes
                    ),
                    "verify_status": "pending",
                    "verification_hints": "; ".join(sc.verify_hints),
                    "source_notes": c.source_notes,
                }
            )


def main() -> int:
    parser = argparse.ArgumentParser(description="Band It outbound signal processing v1")
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT, help="Seed companies CSV")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help="Ranked leads CSV")
    parser.add_argument("--top", type=int, default=50, help="Max rows in output")
    parser.add_argument(
        "--fetch-web",
        action="store_true",
        help="Fetch company homepage text (slow; respects timeout)",
    )
    parser.add_argument(
        "--include-excluded",
        action="store_true",
        help="Include excluded companies in output (score 0)",
    )
    args = parser.parse_args()

    if not args.input.exists():
        print(f"Input not found: {args.input}", file=sys.stderr)
        return 1

    companies = load_companies(args.input)
    if not companies:
        print("No companies in input.", file=sys.stderr)
        return 1

    scored_list = [process_company(c, args.fetch_web) for c in companies]

    eligible = [
        sc
        for sc in scored_list
        if sc.fit_pass and not sc.excludes and sc.score > 0
    ]
    if args.include_excluded:
        rest = [sc for sc in scored_list if sc not in eligible]
        eligible = eligible + rest

    eligible.sort(key=lambda s: s.score, reverse=True)
    top = eligible[: args.top]

    write_output(args.output, top)
    print(f"Processed {len(companies)} companies -> wrote {len(top)} rows to {args.output}")
    if top:
        print(f"Top score: {top[0].score} ({top[0].company.company_name})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
