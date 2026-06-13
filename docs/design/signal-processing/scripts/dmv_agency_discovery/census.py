from __future__ import annotations

import re
import sys
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

SCRIPT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(SCRIPT_DIR))

from cat_bot_roam.env import env  # noqa: E402
from cat_bot_roam.http_util import request_json  # noqa: E402

from .models import Agency

SEARCH_FIELDS = (
    "places.id,places.displayName,places.formattedAddress,"
    "places.websiteUri,places.googleMapsUri"
)

DMV_LOCALITIES = [
    "Washington DC",
    "Arlington VA",
    "Alexandria VA",
    "Bethesda MD",
    "Rockville MD",
    "Silver Spring MD",
    "Fairfax VA",
    "Tysons VA",
    "Reston VA",
    "Columbia MD",
    "Gaithersburg MD",
    "Bowie MD",
    "Annapolis MD",
    "Frederick MD",
    "Manassas VA",
    "Potomac MD",
]

SEARCH_TEMPLATE = "digital marketing agency {locality}"


def _search_text(query: str, *, max_results: int) -> list[dict[str, Any]]:
    api_key = env("GOOGLE_PLACES_API_KEY") or env("GOOGLE_MAPS_API_KEY")
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


def _display_name(place: dict[str, Any]) -> str:
    name = place.get("displayName") or {}
    return name.get("text") or ""


def _parse_city_state(address: str) -> tuple[str, str, str]:
    parts = [p.strip() for p in address.split(",")]
    if len(parts) >= 2:
        state_zip = parts[-1]
        city = parts[-2]
        tokens = state_zip.split()
        state = tokens[0] if tokens else ""
        zip_code = ""
        for token in tokens[1:]:
            if token.isdigit() and len(token) == 5:
                zip_code = token
                break
        if not zip_code:
            zip_match = re.search(r"\b(\d{5})\b", city)
            if zip_match:
                zip_code = zip_match.group(1)
        if re.match(r"^[A-Z]{2}\s+\d{5}$", city, re.I):
            zip_match = re.match(r"^(?P<st>[A-Z]{2})\s+(?P<zip>\d{5})$", city, re.I)
            if zip_match:
                state = zip_match.group("st").upper()
                zip_code = zip_match.group("zip")
                city = ""
        return city, state, zip_code
    return "", "", ""


def census_places(*, max_per_query: int = 8, localities: list[str] | None = None) -> list[Agency]:
    agencies: list[Agency] = []
    seen_domains: set[str] = set()
    search_localities = localities or DMV_LOCALITIES

    for locality in search_localities:
        query = SEARCH_TEMPLATE.format(locality=locality)
        try:
            places = _search_text(query, max_results=max_per_query)
        except RuntimeError:
            continue

        for place in places:
            name = _display_name(place)
            website = (place.get("websiteUri") or "").strip()
            if not name:
                continue
            domain = urlparse(website).netloc.lower().removeprefix("www.") if website else name
            if domain in seen_domains:
                continue
            seen_domains.add(domain)

            address = place.get("formattedAddress") or ""
            city, state, zip_code = _parse_city_state(address)
            maps_uri = place.get("googleMapsUri") or ""
            agencies.append(
                Agency(
                    agency_name=name,
                    website=website,
                    city=city,
                    state=state,
                    zip_code=zip_code,
                    places_id=place.get("id") or "",
                    source_notes=f"places_census:{query}; maps={maps_uri}",
                )
            )

    return agencies
