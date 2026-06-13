from __future__ import annotations

import sys
from pathlib import Path

PIPELINE_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PIPELINE_ROOT))

from lib.enrich_signals import (  # noqa: E402
    _agency_matches_posting,
    _is_us_indeed_url,
    contextual_growth_signal,
    count_team_members,
    parse_blog_recency,
    resolve_headcount,
    verify_jobs,
)
from lib.models import AgencyRecord  # noqa: E402
from lib.config import PipelineConfig  # noqa: E402
from lib.geo import verify_geography  # noqa: E402
from lib.paths import CONFIG_PATH  # noqa: E402


def test_h01_regex_does_not_raise() -> None:
    about = "We are hiring a business development manager to drive new client acquisition."
    hit = contextual_growth_signal("", about, "https://example.com/about")
    assert hit is not None
    assert hit.signal_id == "H01"


def test_team_page_count_not_verified() -> None:
    about = "Founder CEO Director Manager Specialist Designer Partner"
    hc, src, _matched, verified = resolve_headcount("", about)
    assert hc is not None
    assert src == "team_page_count"
    assert verified is False


def test_team_page_count_requires_distinct_roles() -> None:
    text = "Our director and manager work with your account executive."
    assert count_team_members(text) is None


def test_blog_recency_parses_full_month_name() -> None:
    recent, post_date, _ = parse_blog_recency("Posted April 30, 2026 — new case study", max_days=365)
    assert recent is True
    assert post_date == "2026-04-30"


def test_geography_rejects_client_mention_washington_only() -> None:
    config = PipelineConfig.load(CONFIG_PATH)
    record = AgencyRecord(
        agency_name="Denver Shop",
        website="https://denvershop.example",
        city="Denver",
        state="CO",
    )
    contact = "We serve clients in Washington, DC and across the country."
    result = verify_geography(record, contact, config)
    assert result.ok is False


def test_geography_accepts_explicit_dmv_address() -> None:
    config = PipelineConfig.load(CONFIG_PATH)
    record = AgencyRecord(
        agency_name="Arlington Shop",
        website="https://arlingtonshop.example",
        city="",
        state="",
    )
    contact = "Located in Arlington, VA 22201"
    result = verify_geography(record, contact, config)
    assert result.ok is True


def test_h06_rejects_non_us_indeed_locale() -> None:
    assert _is_us_indeed_url("https://in.indeed.com/viewjob?jk=abc") is False
    assert _is_us_indeed_url("https://www.indeed.com/viewjob?jk=abc") is True


def test_h06_rejects_single_token_company_match() -> None:
    snippet = (
        "MARKETING EXECUTIVE / BUSINESS DEVELOPMENT EXECUTIVE - LUCKNOW. "
        "Company Name. Four Pixels Healthcare"
    )
    assert _agency_matches_posting(
        "Pixel This Marketing - HQ",
        "https://pixelthismarketing.com/",
        snippet,
    ) is False


def test_h06_verify_jobs_rejects_india_posting_for_va_agency() -> None:
    def fake_tavily(_query: str, max_results: int = 5):
        return [
            {
                "url": "https://in.indeed.com/viewjob?jk=abc123",
                "snippet": (
                    "MARKETING EXECUTIVE / BUSINESS DEVELOPMENT EXECUTIVE - LUCKNOW. "
                    "Company Name. De Four Pixels Healthcare"
                ),
            }
        ]

    result = verify_jobs(
        "Pixel This Marketing - HQ",
        "",
        "",
        "https://pixelthismarketing.com/",
        tavily_search_fn=fake_tavily,
    )
    assert result is not None
    assert result.status == "not_found"


if __name__ == "__main__":
    tests = [
        test_h01_regex_does_not_raise,
        test_team_page_count_not_verified,
        test_team_page_count_requires_distinct_roles,
        test_blog_recency_parses_full_month_name,
        test_geography_rejects_client_mention_washington_only,
        test_geography_accepts_explicit_dmv_address,
        test_h06_rejects_non_us_indeed_locale,
        test_h06_rejects_single_token_company_match,
        test_h06_verify_jobs_rejects_india_posting_for_va_agency,
    ]
    failed = 0
    for t in tests:
        try:
            t()
            print(f"PASS {t.__name__}")
        except AssertionError as exc:
            print(f"FAIL {t.__name__}: {exc}")
            failed += 1
    raise SystemExit(1 if failed else 0)
