from __future__ import annotations

import csv
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class SignalDef:
    signal_id: str
    signal_name: str
    signal_role: str
    phase: str
    category: str
    what_it_indicates: str
    verification_hint: str
    score_weight: int


def load_signal_registry(path: Path) -> list[SignalDef]:
    rows: list[SignalDef] = []
    with path.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            weight_raw = (row.get("score_weight") or "0").strip()
            try:
                weight = int(float(weight_raw.replace("+", "")))
            except ValueError:
                weight = 0
            rows.append(
                SignalDef(
                    signal_id=row["signal_id"],
                    signal_name=row["signal_name"],
                    signal_role=row["signal_role"],
                    phase=row.get("phase", ""),
                    category=row.get("category", ""),
                    what_it_indicates=row.get("what_it_indicates", ""),
                    verification_hint=row.get("verification_hint", ""),
                    score_weight=weight,
                )
            )
    return rows


def v1_signals(registry: list[SignalDef]) -> tuple[list[SignalDef], list[SignalDef], list[SignalDef]]:
    fit = [s for s in registry if s.phase == "v1" and s.signal_role == "fit"]
    hunt = [s for s in registry if s.phase == "v1" and s.signal_role == "hunt"]
    exclude = [s for s in registry if s.phase == "v1" and s.signal_role == "exclude"]
    return fit, hunt, exclude
