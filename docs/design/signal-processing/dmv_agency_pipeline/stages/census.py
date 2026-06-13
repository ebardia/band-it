from __future__ import annotations

import csv
import sys
from pathlib import Path

PIPELINE_ROOT = Path(__file__).resolve().parents[1]
SCRIPTS_ROOT = PIPELINE_ROOT.parent / "scripts"
sys.path.insert(0, str(SCRIPTS_ROOT))
sys.path.insert(0, str(PIPELINE_ROOT))

from cat_bot_roam.env import load_dotenv  # noqa: E402

load_dotenv()

from dmv_agency_discovery.census import census_places  # noqa: E402
from lib.jsonio import write_agencies  # noqa: E402
from lib.models import AgencyRecord, normalize_domain  # noqa: E402
from lib.paths import CENSUS_PATH, CONFIG_PATH, PIPELINE_ROOT  # noqa: E402
from lib.config import PipelineConfig  # noqa: E402


def load_seed_csv(path: Path) -> list[AgencyRecord]:
    rows: list[AgencyRecord] = []
    with path.open(newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            name = (row.get("agency_name") or "").strip()
            if not name:
                continue
            est_raw = (row.get("employee_count_estimate") or "").strip()
            est = int(est_raw) if est_raw.isdigit() else None
            rows.append(
                AgencyRecord(
                    agency_name=name,
                    website=(row.get("website") or "").strip(),
                    city=(row.get("city") or "").strip(),
                    state=(row.get("state") or "").strip(),
                    employee_count_estimate=est,
                    vertical_focus=(row.get("vertical_focus") or "").strip(),
                    source_notes=(row.get("source_notes") or "").strip(),
                    clutch_url=(row.get("clutch_url") or "").strip(),
                    linkedin_company_url=(row.get("linkedin_company_url") or "").strip(),
                )
            )
    return rows


def load_legacy_targets_csv(path: Path) -> list[AgencyRecord]:
    rows: list[AgencyRecord] = []
    with path.open(newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            name = (row.get("agency_name") or "").strip()
            if not name:
                continue
            est_raw = (row.get("employee_estimate") or "").strip()
            est = int(est_raw) if est_raw.isdigit() else None
            rows.append(
                AgencyRecord(
                    agency_name=name,
                    website=(row.get("website") or "").strip(),
                    city=(row.get("city") or "").strip(),
                    state=(row.get("state") or "").strip(),
                    employee_count_estimate=est,
                    source_notes=(row.get("source_notes") or "").strip(),
                )
            )
    return rows


def merge_census(*lists: list[AgencyRecord]) -> list[AgencyRecord]:
    by_domain: dict[str, AgencyRecord] = {}
    for items in lists:
        for r in items:
            key = r.domain or normalize_domain(r.website) or r.agency_name.lower()
            if key not in by_domain:
                by_domain[key] = r
    return list(by_domain.values())


def run_census(*, use_places: bool = True, legacy_csv: Path | None = None) -> int:
    config = PipelineConfig.load(CONFIG_PATH)
    seed_rel = config.get("census", "seed_csv", default="../dmv-marketing-agencies-seed.csv")
    seed_path = (PIPELINE_ROOT / str(seed_rel)).resolve() if seed_rel else None

    lists: list[list[AgencyRecord]] = []
    if seed_path and seed_path.exists():
        lists.append(load_seed_csv(seed_path))
        print(f"Seed: {len(lists[-1])} from {seed_path.name}")

    if legacy_csv and legacy_csv.exists():
        lists.append(load_legacy_targets_csv(legacy_csv))
        print(f"Legacy: {len(lists[-1])} from {legacy_csv.name}")

    if use_places:
        try:
            places = [
                AgencyRecord(
                    agency_name=p.agency_name,
                    website=p.website,
                    city=p.city,
                    state=p.state,
                    zip_code=p.zip_code,
                    places_id=p.places_id,
                    source_notes=p.source_notes,
                )
                for p in census_places(
                    max_per_query=int(config.get("census", "places_max_per_query", default=8)),
                    localities=config.places_localities() or None,
                )
            ]
            lists.append(places)
            print(f"Places: {len(places)} agencies")
        except RuntimeError as exc:
            print(f"Places census skipped: {exc}", file=sys.stderr)

    merged = merge_census(*lists) if lists else []
    write_agencies(CENSUS_PATH, merged)
    print(f"Census: {len(merged)} unique -> {CENSUS_PATH}")
    return 0


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--no-places", action="store_true")
    parser.add_argument(
        "--legacy-csv",
        type=Path,
        default=None,
        help="Optional legacy targets CSV to merge into census",
    )
    args = parser.parse_args()
    raise SystemExit(run_census(use_places=not args.no_places, legacy_csv=args.legacy_csv))
