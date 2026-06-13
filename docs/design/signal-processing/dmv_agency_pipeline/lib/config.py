from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass
class PipelineConfig:
    raw: dict[str, Any]

    @classmethod
    def load(cls, path: Path) -> PipelineConfig:
        return cls(raw=json.loads(path.read_text(encoding="utf-8")))

    def get(self, *keys: str, default: Any = None) -> Any:
        node: Any = self.raw
        for key in keys:
            if not isinstance(node, dict):
                return default
            node = node.get(key, default)
        return node

    @property
    def score_weights(self) -> dict[str, int]:
        return dict(self.get("score_weights", default={}))

    @property
    def include_baltimore(self) -> bool:
        return bool(self.get("territory", "include_baltimore", default=False))

    @property
    def territory_name(self) -> str:
        return str(self.get("territory", "name", default="default"))

    def zip_prefix_map(self) -> dict[str, tuple[str, str]]:
        raw = self.get("territory", "zip_prefixes", default={}) or {}
        mapped: dict[str, tuple[str, str]] = {}
        for prefix, value in raw.items():
            if isinstance(value, list) and len(value) >= 2:
                mapped[str(prefix)] = (str(value[0]), str(value[1]))
            elif isinstance(value, dict):
                mapped[str(prefix)] = (str(value.get("county", "")), str(value.get("state", "")))
        return mapped

    def location_cities(self) -> tuple[str, ...]:
        cities = self.get("territory", "location_cities", default=[]) or []
        return tuple(str(c).lower() for c in cities)

    def exclude_cities(self) -> tuple[str, ...]:
        cities = self.get("territory", "exclude_cities", default=[]) or []
        return tuple(str(c).lower() for c in cities)

    def places_localities(self) -> list[str]:
        localities = self.get("census", "places_localities", default=[]) or []
        return [str(x) for x in localities]
