from __future__ import annotations

import re
from dataclasses import dataclass

from .config import PipelineConfig
from .models import AgencyRecord, parse_zip_from_city_field

# Zip prefix -> (county, state) heuristic for DMV
ZIP_COUNTY: dict[str, tuple[str, str]] = {}
for prefix, county, state in [
    ("200", "District of Columbia", "DC"),
    ("201", "Loudoun", "VA"),
    ("220", "Fairfax", "VA"),
    ("221", "Fairfax", "VA"),
    ("222", "Arlington", "VA"),
    ("223", "Alexandria", "VA"),
    ("208", "Montgomery", "MD"),
    ("209", "Montgomery", "MD"),
    ("207", "Prince George's", "MD"),
    ("210", "Anne Arundel", "MD"),
    ("211", "Baltimore", "MD"),
    ("212", "Baltimore", "MD"),
    ("217", "Frederick", "MD"),
    ("206", "Charles", "MD"),
]:
    ZIP_COUNTY[prefix] = (county, state)

OUT_OF_TERRITORY_CITIES = {
    "pittsburgh", "philadelphia", "new york", "nyc", "chicago", "los angeles",
    "san francisco", "boston", "austin", "miami", "atlanta", "seattle",
}

BALTIMORE_MARKERS = {"baltimore"}

DMV_CITIES = (
    "arlington", "alexandria", "bethesda", "rockville", "silver spring", "gaithersburg",
    "fairfax", "falls church", "mclean", "tysons", "reston", "vienna", "herndon",
    "washington", "columbia", "annapolis", "frederick", "manassas", "potomac",
    "north bethesda", "chevy chase", "bowie", "glen burnie",
)


@dataclass
class GeoResult:
    ok: bool
    city: str
    county: str
    state: str
    zip_code: str
    reason: str = ""


def _county_allowed(config: PipelineConfig, county: str, state: str) -> bool:
    if state == "DC":
        return bool(config.get("territory", "dc", default=True))
    if county in BALTIMORE_MARKERS or "baltimore" in county.lower():
        return config.include_baltimore
    if state == "MD":
        allowed = [c.lower() for c in config.get("territory", "md_counties", default=[])]
        return county.lower() in allowed or any(a in county.lower() for a in allowed)
    if state == "VA":
        allowed = [c.lower() for c in config.get("territory", "va_counties", default=[])]
        return county.lower() in allowed or any(a in county.lower() for a in allowed)
    return False


def infer_from_zip(zip_code: str, config: PipelineConfig | None = None) -> tuple[str, str, str]:
    if not zip_code or len(zip_code) < 3:
        return "", "", ""
    zip_map = _zip_map(config)
    if len(zip_code) >= 5 and zip_code[:5] in zip_map:
        county, state = zip_map[zip_code[:5]]
        return county, state, zip_code
    prefix = zip_code[:3]
    county, state = zip_map.get(prefix, ("", ""))
    return county, state, zip_code


def _zip_map(config: PipelineConfig | None) -> dict[str, tuple[str, str]]:
    if config:
        custom = config.zip_prefix_map()
        if custom:
            return {**ZIP_COUNTY, **custom}
    return ZIP_COUNTY


def _location_city_names(config: PipelineConfig) -> tuple[str, ...]:
    custom = config.location_cities()
    return custom if custom else DMV_CITIES


def _zip_in_territory(zip_code: str, config: PipelineConfig | None = None) -> bool:
    if not zip_code:
        return False
    county, state, _ = infer_from_zip(zip_code, config)
    if county and config:
        return _county_allowed(config, county, state)
    return zip_code[:3] in _zip_map(config)


def _excluded_city_hit(location_blob: str, city: str, exclude: tuple[str, ...]) -> str | None:
    haystack = f"{location_blob}\n{city}".lower()
    for name in exclude:
        if name not in haystack:
            continue
        if _out_of_territory_hit(haystack, name) or _hq_city_markers(haystack, name):
            return name
    return None


def _location_text(record: AgencyRecord, contact_text: str) -> str:
    about = record.pages.get("about", "")
    parts = [contact_text, about, record.city, record.state, record.zip_code]
    return "\n".join(p for p in parts if p).lower()


def _hq_city_markers(text: str, city: str) -> bool:
    markers = (
        f"based in {city}",
        f"located in {city}",
        f"office in {city}",
        f"headquartered in {city}",
        f"{city},",
        f"{city} ",
    )
    return any(marker in text for marker in markers)


def _out_of_territory_hit(text: str, bad: str) -> bool:
    if bad == "alexandria" and "virginia" in text:
        return False
    patterns = (
        rf"\bbased in {re.escape(bad)}\b",
        rf"\blocated in {re.escape(bad)}\b",
        rf"\bheadquartered in {re.escape(bad)}\b",
        rf"\b{re.escape(bad)}\b,\s*(?:pa|tx|co|il|ca|ny|fl|ga|wa|ma)",
    )
    return any(re.search(pat, text, re.I) for pat in patterns)


def _dmv_city_in_location(name: str, text: str) -> bool:
    if name == "washington":
        # Require HQ/address context — not "clients in Washington, DC".
        patterns = (
            r"(?:based in|located in|office in|headquartered in)\s+washington\b,?\s*(?:dc|d\.c\.)",
            r"\b(?:our|main|corporate|head)\s+office\b[^.\n]{0,80}\bwashington\b,?\s*(?:dc|d\.c\.)",
            r"\b\d+\s+[^,\n]{0,40}\bwashington\b,?\s*(?:dc|d\.c\.)\b",
        )
    else:
        patterns = (
            rf"(?:based in|located in|office in|headquartered in)\s+{re.escape(name)}\b",
            rf"\b{re.escape(name)}\b,?\s*(?:va|md|dc|virginia|maryland)\b",
            rf"\b{re.escape(name)}\b,?\s+\d{{5}}\b",
        )
    return any(re.search(pat, text, re.I) for pat in patterns)


def verify_geography(record: AgencyRecord, contact_text: str, config: PipelineConfig) -> GeoResult:
    zip_code, city_raw = parse_zip_from_city_field(record.city)
    if not zip_code and record.zip_code:
        zip_code = record.zip_code

    county, state_from_zip, _ = infer_from_zip(zip_code, config)
    state = (record.state or state_from_zip or "").upper().replace("USA", "").strip()
    city = city_raw if city_raw and not re.match(r"^[A-Z]{2}\s*\d", city_raw) else record.city
    city = re.sub(r"\b(USA|United States)\b", "", city, flags=re.I).strip(" ,")

    location_blob = _location_text(record, contact_text)
    zip_map = _zip_map(config)
    allowed_states = [s.upper() for s in (config.get("territory", "states", default=["DC", "MD", "VA"]) or [])]

    excluded = _excluded_city_hit(location_blob, city, config.exclude_cities())
    if excluded:
        return GeoResult(False, city, county, state, zip_code, f"geography: {excluded.title()} excluded")

    for bad in OUT_OF_TERRITORY_CITIES:
        if bad in location_blob and _out_of_territory_hit(location_blob, bad):
            return GeoResult(False, city, county, state, zip_code, f"geography: HQ appears {bad.title()}")

    if "pittsburgh" in location_blob and _out_of_territory_hit(location_blob, "pittsburgh"):
        return GeoResult(False, city, county, state, zip_code, "geography: Pittsburgh PA HQ")

    if not county and state in {"MD", "VA", "DC"}:
        for hint, (c, st) in zip_map.items():
            if zip_code.startswith(hint):
                county = c
                state = st if st else state
                break

    if (state == "DC" or county == "District of Columbia") and config.get("territory", "dc", default=True):
        return GeoResult(True, "Washington", "District of Columbia", "DC", zip_code, "")

    if state == "DC" and not config.get("territory", "dc", default=True):
        return GeoResult(False, city, county, state, zip_code, "geography: DC excluded")

    if "baltimore" in location_blob or "baltimore" in city.lower():
        if not config.include_baltimore:
            return GeoResult(False, city, "Baltimore", "MD", zip_code, "geography: Baltimore excluded")

    if county and _county_allowed(config, county, state):
        return GeoResult(True, city, county, state, zip_code, "")

    if _zip_in_territory(zip_code, config) and (not allowed_states or state in allowed_states):
        return GeoResult(True, city, county, state, zip_code, "geography: zip in territory")

    # Fallback: explicit address cues on contact/about only (not portfolio/home corpus).
    for name in _location_city_names(config):
        if _dmv_city_in_location(name, location_blob):
            fallback_state = state or ("DC" if name == "washington" else "VA")
            if allowed_states and fallback_state not in allowed_states:
                continue
            return GeoResult(
                True,
                city or name.title(),
                county or "",
                fallback_state,
                zip_code,
                "geography: contact/about location cue",
            )

    if city and _hq_city_markers(location_blob, city.lower()):
        if (not allowed_states or state in allowed_states) and (
            state in {"MD", "VA", "DC"} or _zip_in_territory(zip_code, config)
        ):
            return GeoResult(True, city, county, state, zip_code, "geography: city field + contact cue")

    return GeoResult(False, city, county, state, zip_code, "geography: outside allowed territory")
