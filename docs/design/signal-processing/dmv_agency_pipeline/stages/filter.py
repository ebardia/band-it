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

from lib.config import PipelineConfig  # noqa: E402
from lib.enrich_signals import (
    detect_enterprise_clients,
    detect_smb_verticals,
    resolve_headcount,
)  # noqa: E402
from lib.fetch import CachedFetcher  # noqa: E402
from lib.geo import verify_geography  # noqa: E402
from lib.jsonio import read_agencies, write_agencies  # noqa: E402
from lib.models import AgencyRecord  # noqa: E402
from lib.paths import CACHE_DIR, CENSUS_PATH, CONFIG_PATH, FILTERED_PATH, REJECTED_PATH  # noqa: E402


def apply_hard_filters(record: AgencyRecord, config: PipelineConfig, fetcher: CachedFetcher) -> tuple[bool, str]:
    if not record.website:
        return False, "missing website"

    base = record.website if record.website.startswith("http") else f"https://{record.website}"
    contact_text = fetcher.fetch_text_only(base + "/contact")
    about_text = fetcher.fetch_text_only(base + "/about")
    portfolio_text = fetcher.fetch_text_only(base + "/work")
    record.pages["contact"] = contact_text
    record.pages["about"] = about_text
    record.pages["portfolio"] = portfolio_text

    geo = verify_geography(record, contact_text + "\n" + about_text, config)
    record.city = geo.city or record.city
    record.county = geo.county
    record.state = geo.state or record.state
    record.zip_code = geo.zip_code
    if not geo.ok:
        return False, geo.reason

    min_hc = int(config.get("size", "min_headcount", default=2))
    max_hc = int(config.get("size", "max_headcount", default=20))

    hc, src, matched, verified = resolve_headcount(
        contact_text,
        about_text,
        employee_count_estimate=record.employee_count_estimate,
    )
    record.headcount = hc
    record.headcount_source = src
    record.headcount_verified = verified

    if hc is not None and (hc < min_hc or hc > max_hc):
        return False, f"size: headcount {hc} outside {min_hc}-{max_hc} ({matched or src})"

    # Level Agency style: large range on about even if zip wrong
    if matched and any(x in matched for x in ("190", "250", "200", "500")):
        nums = [int(n) for n in __import__("re").findall(r"\d+", matched)]
        if nums and max(nums) > max_hc:
            return False, f"size: headcount range {matched}"

    portfolio_corpus = portfolio_text + about_text
    smb = detect_smb_verticals(portfolio_corpus)
    record.smb_verticals = smb
    if len(smb) < 1 and not record.vertical_focus:
        return False, "client_type: no local SMB portfolio signals"

    if detect_enterprise_clients(portfolio_corpus) and len(smb) < 2:
        return False, "client_type: primarily enterprise/government clients"

    return True, ""


def run_filter() -> int:
    config = PipelineConfig.load(CONFIG_PATH)
    fetcher = CachedFetcher(
        CACHE_DIR,
        ttl_days=int(config.get("cache_ttl_days", default=7)),
        user_agent=str(config.get("user_agent", default="AdoptACatBot/1.0")),
    )

    census = read_agencies(CENSUS_PATH)
    if not census:
        print(f"No census at {CENSUS_PATH}", file=sys.stderr)
        return 1

    filtered: list[AgencyRecord] = []
    rejected_rows: list[dict] = []

    for record in census:
        ok, reason = apply_hard_filters(record, config, fetcher)
        if ok:
            filtered.append(record)
        else:
            record.reject_reason = reason
            rejected_rows.append(
                {
                    "agency_name": record.agency_name,
                    "website": record.website,
                    "domain": record.domain,
                    "city": record.city,
                    "state": record.state,
                    "reject_reason": reason,
                }
            )

    write_agencies(FILTERED_PATH, filtered)
    REJECTED_PATH.parent.mkdir(parents=True, exist_ok=True)
    with REJECTED_PATH.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=["agency_name", "website", "domain", "city", "state", "reject_reason"],
        )
        writer.writeheader()
        writer.writerows(rejected_rows)

    print(f"Filter: {len(filtered)} passed, {len(rejected_rows)} rejected -> {FILTERED_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(run_filter())
