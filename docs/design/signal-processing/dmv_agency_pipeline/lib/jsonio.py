from __future__ import annotations

import json
from pathlib import Path
from typing import Iterable, Iterator

from .models import AgencyRecord


def read_jsonl(path: Path) -> list[dict]:
    if not path.exists():
        return []
    rows: list[dict] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line:
            rows.append(json.loads(line))
    return rows


def write_jsonl(path: Path, rows: Iterable[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        for row in rows:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")


def read_agencies(path: Path) -> list[AgencyRecord]:
    return [AgencyRecord.from_dict(r) for r in read_jsonl(path)]


def write_agencies(path: Path, agencies: Iterable[AgencyRecord]) -> None:
    write_jsonl(path, (a.to_dict() for a in agencies))
