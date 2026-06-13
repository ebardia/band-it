from __future__ import annotations

import csv
import json
import sys
from datetime import date
from pathlib import Path

PIPELINE_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PIPELINE_ROOT))

from lib.config import PipelineConfig  # noqa: E402
from lib.db import EntityStore  # noqa: E402
from lib.jsonio import read_agencies  # noqa: E402
from lib.paths import CONFIG_PATH, DB_PATH, OUTPUT_DIR, SCORED_PATH  # noqa: E402
from lib.scoring import score_formula_header  # noqa: E402


def _signals_fired_col(record) -> str:
    parts: list[str] = []
    for sid, ev in sorted((record.signals or {}).items()):
        status = ev.get("status", "fired")
        text = (ev.get("matched_text") or "")[:80].replace("|", "/")
        parts.append(f"{sid}[{status}]:{text}")
    return "|".join(parts)


def _why_flagged_paragraph(record) -> str:
    lines = [f"**{record.agency_name}** ({record.website}) — score {record.agency_score}"]
    lines.append(
        f"HQ: {record.city}, {record.county}, {record.state} · "
        f"headcount {record.headcount or '?'} ({record.headcount_source or 'unknown'})"
    )
    for sid, ev in sorted((record.signals or {}).items()):
        if sid == "H06" and ev.get("status") != "verified_open":
            continue
        url = ev.get("source_url") or record.website
        text = ev.get("matched_text") or ""
        lines.append(f"- **{sid}:** {text} ([source]({url}))")
    lines.append(
        "Everything above was assembled from public sources — the same pipeline we sell you."
    )
    return "\n".join(lines)


def run_report(*, run_id: str | None = None) -> int:
    config = PipelineConfig.load(CONFIG_PATH)
    scored = read_agencies(SCORED_PATH)
    if not scored:
        print(f"No scored rows at {SCORED_PATH}", file=sys.stderr)
        return 1

    today = date.today().isoformat()
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    targets_path = OUTPUT_DIR / f"targets-{today}.csv"
    top10_path = OUTPUT_DIR / f"top10-{today}.md"
    deltas_path = OUTPUT_DIR / f"deltas-{today}.md"

    fieldnames = [
        "rank",
        "agency_name",
        "website",
        "domain",
        "city",
        "county",
        "state",
        "headcount",
        "headcount_source",
        "headcount_verified",
        "verify_status",
        "agency_score",
        "signals_fired",
        "smb_verticals",
        "source_notes",
    ]

    with targets_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for rank, r in enumerate(scored, start=1):
            writer.writerow(
                {
                    "rank": rank,
                    "agency_name": r.agency_name,
                    "website": r.website,
                    "domain": r.domain,
                    "city": r.city,
                    "county": r.county,
                    "state": r.state,
                    "headcount": r.headcount or "",
                    "headcount_source": r.headcount_source,
                    "headcount_verified": r.headcount_verified,
                    "verify_status": r.verify_status,
                    "agency_score": r.agency_score,
                    "signals_fired": _signals_fired_col(r),
                    "smb_verticals": ",".join(r.smb_verticals),
                    "source_notes": r.source_notes,
                }
            )

    (OUTPUT_DIR / f"scoring-formula-{today}.md").write_text(
        score_formula_header(config) + "\n", encoding="utf-8"
    )

    top10 = scored[:10]
    top10_path.write_text(
        score_formula_header(config) + "\n\n" + "\n\n---\n\n".join(_why_flagged_paragraph(r) for r in top10),
        encoding="utf-8",
    )

    store = EntityStore(DB_PATH)
    scores = {r.domain: r.agency_score for r in scored if r.domain}
    top_domains = [r.domain for r in top10 if r.domain]

    prev = store.get_last_run()
    delta_lines: list[str] = [f"# Deltas — {today}\n"]
    if not prev:
        delta_lines.append("_First run — no prior snapshot._")
    else:
        _prev_id, prev_scores, prev_top = prev
        new_domains = [d for d in scores if d not in prev_scores]
        if new_domains:
            delta_lines.append("## New agencies\n" + "\n".join(f"- {d}" for d in new_domains))
        score_changes = []
        for d, s in scores.items():
            if d in prev_scores and abs(s - prev_scores[d]) >= 10:
                score_changes.append(f"- {d}: {prev_scores[d]} → {s}")
        if score_changes:
            delta_lines.append("## Score changes ±10\n" + "\n".join(score_changes))

        signal_changes: list[str] = []
        for r in scored:
            old = store.get_entity(r.domain) or {}
            old_sigs = set((old.get("signals") or {}).keys())
            new_sigs = set((r.signals or {}).keys())
            added = new_sigs - old_sigs
            if added:
                signal_changes.append(f"- {r.agency_name}: {', '.join(sorted(added))} newly fired")
        if signal_changes:
            delta_lines.append("## New signals\n" + "\n".join(signal_changes))

        if len(delta_lines) == 1:
            delta_lines.append("_No material changes since last run._")

    deltas_path.write_text("\n\n".join(delta_lines) + "\n", encoding="utf-8")

    rid = run_id or f"{config.territory_name}-{today}"
    for r in scored:
        store.upsert_entity(r.domain, r.agency_name, r.website, r.to_dict(), run_id=rid)
    store.save_run(rid, scores, top_domains)

    print(f"Report: {targets_path}")
    print(f"Top10: {top10_path}")
    print(f"Deltas: {deltas_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(run_report())
