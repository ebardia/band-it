from __future__ import annotations

import gc
import shutil
import sys
import tempfile
from pathlib import Path

PIPELINE_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PIPELINE_ROOT))

from lib.db import EntityStore  # noqa: E402


def test_entity_history_appends_without_overwriting() -> None:
    tmp = tempfile.mkdtemp()
    store = None
    try:
        db_path = Path(tmp) / "entities.sqlite"
        store = EntityStore(db_path)

        snap_v1 = {"agency_score": 10, "signals": {"H01": {}}}
        snap_v2 = {"agency_score": 25, "signals": {"H01": {}, "H06": {}}}

        store.upsert_entity("example.com", "Example", "https://example.com", snap_v1, run_id="2026-05-01")
        store.upsert_entity("example.com", "Example", "https://example.com", snap_v2, run_id="2026-05-08")

        history = store.list_entity_history("example.com")
        assert len(history) == 2
        assert history[0]["run_id"] == "2026-05-01"
        assert history[0]["snapshot"]["agency_score"] == 10
        assert history[1]["run_id"] == "2026-05-08"
        assert history[1]["snapshot"]["agency_score"] == 25

        current = store.get_entity("example.com")
        assert current is not None
        assert current["agency_score"] == 25

        at_run = store.get_entity_snapshot_at_run("example.com", "2026-05-01")
        assert at_run is not None
        assert at_run["agency_score"] == 10
    finally:
        del store
        gc.collect()
        shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    test_entity_history_appends_without_overwriting()
    print("PASS test_entity_history_appends_without_overwriting")
