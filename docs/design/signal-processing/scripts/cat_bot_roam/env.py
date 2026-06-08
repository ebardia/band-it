from __future__ import annotations

import os
from pathlib import Path


def repo_root() -> Path:
    # docs/design/signal-processing/scripts/cat_bot_roam -> repo root
    return Path(__file__).resolve().parents[5]


def load_dotenv() -> None:
    root = repo_root()
    for path in (
        root / ".env",
        root / ".env.local",
        root / "apps" / "api" / ".env",
        root / "apps" / "web" / ".env.local",
    ):
        if not path.exists():
            continue
        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, val = line.partition("=")
            key = key.strip()
            if key and key not in os.environ:
                val = val.strip().strip('"').strip("'").strip()
                os.environ[key] = val


def env(name: str, default: str = "") -> str:
    return os.environ.get(name, default).strip()
