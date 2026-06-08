from __future__ import annotations

from datetime import datetime, timezone
from urllib.parse import urlencode

from .env import env
from .http_util import request_json
from .models import EvidenceItem, MedSpa


def _api_key() -> str | None:
    return env("YELP_API_KEY") or None


def search_business(term: str, location: str) -> dict | None:
    api_key = _api_key()
    if not api_key:
        raise RuntimeError("missing YELP_API_KEY")

    query = urlencode(
        {
            "term": term,
            "location": location,
            "limit": 3,
            "categories": "beautysvc,health",
        }
    )
    _, payload = request_json(
        f"https://api.yelp.com/v3/businesses/search?{query}",
        headers={"Authorization": f"Bearer {api_key}"},
    )
    businesses = payload.get("businesses") or []
    return businesses[0] if businesses else None


def business_reviews(business_id: str) -> list[dict]:
    api_key = _api_key()
    if not api_key:
        raise RuntimeError("missing YELP_API_KEY")

    _, payload = request_json(
        f"https://api.yelp.com/v3/businesses/{business_id}/reviews",
        headers={"Authorization": f"Bearer {api_key}"},
    )
    return payload.get("reviews") or []


def collect_for_spa(spa: MedSpa) -> tuple[list[EvidenceItem], list[str]]:
    if not _api_key():
        return [], ["yelp: skipped (set YELP_API_KEY)"]

    location = f"{spa.city}, {spa.state}"
    term = spa.spa_name
    warnings: list[str] = []
    items: list[EvidenceItem] = []

    try:
        business = search_business(term, location)
    except RuntimeError as exc:
        return [], [f"yelp search '{term}' in {location}: {exc}"]

    if not business:
        warnings.append(f"yelp: no match for '{term}' in {location}")
        return items, warnings

    biz_id = business.get("id") or ""
    biz_url = business.get("url") or f"https://www.yelp.com/biz/{biz_id}"
    biz_name = business.get("name") or spa.spa_name
    rating = business.get("rating")
    review_count = business.get("review_count")
    items.append(
        EvidenceItem(
            source="yelp",
            source_url=biz_url,
            title=f"Yelp aggregate — {biz_name}",
            text=f"Rating {rating} from {review_count or 0} reviews.",
            observed_at=datetime.now(timezone.utc).isoformat(),
            spa_name=spa.spa_name,
            metadata={"business_id": biz_id, "rating": rating, "review_count": review_count},
        )
    )

    try:
        for review in business_reviews(biz_id):
            text = review.get("text") or ""
            if not text.strip():
                continue
            created = review.get("time_created") or datetime.now(timezone.utc).isoformat()
            items.append(
                EvidenceItem(
                    source="yelp",
                    source_url=review.get("url") or biz_url,
                    title=f"Yelp review — {biz_name} ({review.get('rating', '?')}★)",
                    text=text[:4000],
                    observed_at=created,
                    spa_name=spa.spa_name,
                    metadata={"business_id": biz_id, "rating": review.get("rating")},
                )
            )
    except RuntimeError as exc:
        warnings.append(f"yelp reviews {biz_id}: {exc}")

    return items, warnings
