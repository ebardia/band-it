from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from .env import env
from .http_util import request_json
from .models import EvidenceItem, MedSpa

SEARCH_FIELDS = (
    "places.id,places.displayName,places.formattedAddress,"
    "places.rating,places.userRatingCount,places.googleMapsUri"
)
DETAIL_FIELDS = (
    "id,displayName,formattedAddress,rating,userRatingCount,googleMapsUri,reviews"
)


def _api_key() -> str | None:
    key = env("GOOGLE_PLACES_API_KEY") or env("GOOGLE_MAPS_API_KEY")
    return key or None


def search_text(query: str, *, max_results: int = 5) -> list[dict[str, Any]]:
    api_key = _api_key()
    if not api_key:
        raise RuntimeError("missing GOOGLE_PLACES_API_KEY")

    _, payload = request_json(
        "https://places.googleapis.com/v1/places:searchText",
        method="POST",
        headers={
            "X-Goog-Api-Key": api_key,
            "X-Goog-FieldMask": SEARCH_FIELDS,
        },
        data={"textQuery": query, "maxResultCount": max_results},
    )
    return payload.get("places") or []


def place_details(place_id: str) -> dict[str, Any]:
    api_key = _api_key()
    if not api_key:
        raise RuntimeError("missing GOOGLE_PLACES_API_KEY")

    _, payload = request_json(
        f"https://places.googleapis.com/v1/places/{place_id}",
        headers={
            "X-Goog-Api-Key": api_key,
            "X-Goog-FieldMask": DETAIL_FIELDS,
        },
    )
    return payload


def _display_name(place: dict[str, Any]) -> str:
    name = place.get("displayName") or {}
    return name.get("text") or ""


def _reviews_from_place(place: dict[str, Any], spa_name: str) -> list[EvidenceItem]:
    items: list[EvidenceItem] = []
    maps_uri = place.get("googleMapsUri") or ""
    place_name = _display_name(place)
    for review in place.get("reviews") or []:
        text_obj = review.get("text") or {}
        text = text_obj.get("text") or ""
        if not text.strip():
            continue
        publish = review.get("publishTime") or datetime.now(timezone.utc).isoformat()
        items.append(
            EvidenceItem(
                source="google_places",
                source_url=maps_uri or f"https://places.googleapis.com/v1/places/{place.get('id', '')}",
                title=f"Google review — {place_name} ({review.get('rating', '?')}★)",
                text=text[:4000],
                observed_at=publish,
                spa_name=spa_name or place_name,
                metadata={
                    "rating": review.get("rating"),
                    "place_id": place.get("id"),
                    "place_name": place_name,
                },
            )
        )
    rating = place.get("rating")
    count = place.get("userRatingCount")
    if rating is not None:
        items.insert(
            0,
            EvidenceItem(
                source="google_places",
                source_url=maps_uri,
                title=f"Google aggregate — {place_name}",
                text=f"Rating {rating} from {count or 0} reviews.",
                observed_at=datetime.now(timezone.utc).isoformat(),
                spa_name=spa_name or place_name,
                metadata={"rating": rating, "review_count": count, "place_id": place.get("id")},
            ),
        )
    return items


def collect_for_spa(spa: MedSpa) -> tuple[list[EvidenceItem], list[str]]:
    if not _api_key():
        return [], ["google_places: skipped (set GOOGLE_PLACES_API_KEY)"]

    warnings: list[str] = []
    items: list[EvidenceItem] = []
    query = f"{spa.spa_name} {spa.city} {spa.state}".strip()
    try:
        places = search_text(query, max_results=3)
    except RuntimeError as exc:
        return [], [f"google_places search '{query}': {exc}"]

    if not places:
        warnings.append(f"google_places: no match for '{query}'")
        return items, warnings

    place = places[0]
    place_id = place.get("id")
    if not place_id:
        return items, warnings

    try:
        detail = place_details(place_id)
        items.extend(_reviews_from_place(detail, spa.spa_name))
    except RuntimeError as exc:
        warnings.append(f"google_places details {place_id}: {exc}")

    return items, warnings


def discover_by_zip(zip_code: str, city: str, state: str) -> tuple[list[EvidenceItem], list[str]]:
    if not _api_key():
        return [], ["google_places discovery: skipped (set GOOGLE_PLACES_API_KEY)"]

    query = f"med spa {city} {state} {zip_code}"
    warnings: list[str] = []
    items: list[EvidenceItem] = []
    try:
        places = search_text(query, max_results=5)
    except RuntimeError as exc:
        return [], [f"google_places discovery '{query}': {exc}"]

    for place in places:
        place_id = place.get("id")
        if not place_id:
            continue
        try:
            detail = place_details(place_id)
            items.extend(_reviews_from_place(detail, _display_name(detail)))
        except RuntimeError as exc:
            warnings.append(f"google_places details {place_id}: {exc}")

    return items, warnings
