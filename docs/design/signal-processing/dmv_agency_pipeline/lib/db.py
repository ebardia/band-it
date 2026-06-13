from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


class EntityStore:
    def __init__(self, db_path: Path) -> None:
        self.db_path = db_path
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        with self._connect() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS entities (
                    domain TEXT PRIMARY KEY,
                    agency_name TEXT,
                    website TEXT,
                    first_seen TEXT,
                    last_seen TEXT,
                    snapshot_json TEXT
                );
                CREATE TABLE IF NOT EXISTS entity_history (
                    domain TEXT NOT NULL,
                    run_id TEXT NOT NULL,
                    observed_at TEXT NOT NULL,
                    snapshot_json TEXT NOT NULL,
                    PRIMARY KEY (domain, run_id)
                );
                CREATE TABLE IF NOT EXISTS runs (
                    run_id TEXT PRIMARY KEY,
                    completed_at TEXT,
                    top_domains_json TEXT,
                    scores_json TEXT
                );
                CREATE INDEX IF NOT EXISTS idx_entity_history_domain
                    ON entity_history (domain, observed_at);
                """
            )

    def upsert_entity(
        self,
        domain: str,
        agency_name: str,
        website: str,
        snapshot: dict[str, Any],
        *,
        run_id: str | None = None,
    ) -> None:
        now = _utc_now()
        history_run_id = run_id or now[:10]
        snapshot_json = json.dumps(snapshot)
        with self._connect() as conn:
            row = conn.execute("SELECT first_seen FROM entities WHERE domain=?", (domain,)).fetchone()
            first = row["first_seen"] if row else now
            conn.execute(
                """
                INSERT INTO entities (domain, agency_name, website, first_seen, last_seen, snapshot_json)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(domain) DO UPDATE SET
                    agency_name=excluded.agency_name,
                    website=excluded.website,
                    last_seen=excluded.last_seen,
                    snapshot_json=excluded.snapshot_json
                """,
                (domain, agency_name, website, first, now, snapshot_json),
            )
            conn.execute(
                """
                INSERT INTO entity_history (domain, run_id, observed_at, snapshot_json)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(domain, run_id) DO NOTHING
                """,
                (domain, history_run_id, now, snapshot_json),
            )

    def get_entity(self, domain: str) -> dict[str, Any] | None:
        with self._connect() as conn:
            row = conn.execute("SELECT snapshot_json FROM entities WHERE domain=?", (domain,)).fetchone()
            if not row:
                return None
            return json.loads(row["snapshot_json"])

    def get_entity_snapshot_at_run(self, domain: str, run_id: str) -> dict[str, Any] | None:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT snapshot_json FROM entity_history WHERE domain=? AND run_id=?",
                (domain, run_id),
            ).fetchone()
            if not row:
                return None
            return json.loads(row["snapshot_json"])

    def list_entity_history(self, domain: str) -> list[dict[str, Any]]:
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT run_id, observed_at, snapshot_json
                FROM entity_history
                WHERE domain=?
                ORDER BY observed_at ASC
                """,
                (domain,),
            ).fetchall()
            return [
                {
                    "run_id": row["run_id"],
                    "observed_at": row["observed_at"],
                    "snapshot": json.loads(row["snapshot_json"]),
                }
                for row in rows
            ]

    def save_run(self, run_id: str, scores: dict[str, int], top_domains: list[str]) -> None:
        with self._connect() as conn:
            conn.execute(
                "INSERT OR REPLACE INTO runs (run_id, completed_at, top_domains_json, scores_json) VALUES (?, ?, ?, ?)",
                (run_id, _utc_now(), json.dumps(top_domains), json.dumps(scores)),
            )

    def get_last_run(self) -> tuple[str, dict[str, int], list[str]] | None:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT run_id, scores_json, top_domains_json FROM runs ORDER BY completed_at DESC LIMIT 1"
            ).fetchone()
            if not row:
                return None
            return row["run_id"], json.loads(row["scores_json"]), json.loads(row["top_domains_json"])

    def list_known_domains(self) -> set[str]:
        with self._connect() as conn:
            rows = conn.execute("SELECT domain FROM entities").fetchall()
            return {r["domain"] for r in rows}
