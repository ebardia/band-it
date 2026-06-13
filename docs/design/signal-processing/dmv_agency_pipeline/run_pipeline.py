#!/usr/bin/env python3
"""Run DMV agency discovery pipeline stages."""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
from pathlib import Path

PIPELINE_ROOT = Path(__file__).resolve().parent
STAGES = ("census", "filter", "enrich", "score", "report")


def _stage_env(config: Path | None) -> dict[str, str]:
    env = os.environ.copy()
    if config:
        env["PIPELINE_CONFIG"] = str(config.resolve())
    return env


def run_stage(name: str, *, env: dict[str, str]) -> int:
    script = PIPELINE_ROOT / "stages" / f"{name}.py"
    cmd = [sys.executable, str(script)]
    if name == "census":
        cmd += sys.argv[2:] if "--" in sys.argv else []
    print(f"\n=== stage: {name} ===")
    return subprocess.call(cmd, env=env)


def main() -> int:
    parser = argparse.ArgumentParser(description="DMV agency Cat Bot discovery pipeline")
    parser.add_argument(
        "--stage",
        choices=STAGES + ("all",),
        default="all",
        help="Run one stage or all",
    )
    parser.add_argument(
        "--config",
        type=Path,
        default=PIPELINE_ROOT / "config.json",
        help="Territory config JSON (e.g. config-i95-south.json)",
    )
    parser.add_argument(
        "--legacy-only",
        action="store_true",
        help="Census from legacy targets CSV only (compare old 30)",
    )
    args, _unknown = parser.parse_known_args()
    env = _stage_env(args.config)

    if args.stage == "all":
        census_cmd = [sys.executable, str(PIPELINE_ROOT / "stages" / "census.py")]
        if args.legacy_only:
            census_cmd.append("--no-places")
            census_cmd.extend(
                ["--legacy-csv", str(PIPELINE_ROOT.parent / "output" / "dmv-agency-targets.csv")]
            )
        print("\n=== stage: census ===")
        code = subprocess.call(census_cmd, env=env)
        if code != 0:
            return code
        for stage in ("filter", "enrich", "score", "report"):
            code = run_stage(stage, env=env)
            if code != 0:
                return code
        return 0

    if args.stage == "census":
        cmd = [sys.executable, str(PIPELINE_ROOT / "stages" / "census.py")]
        if args.legacy_only:
            cmd.append("--no-places")
        return subprocess.call(cmd, env=env)

    return run_stage(args.stage, env=env)


if __name__ == "__main__":
    raise SystemExit(main())
