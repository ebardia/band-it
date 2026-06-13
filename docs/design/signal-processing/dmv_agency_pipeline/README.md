# DMV agency pipeline

Stateful Cat Bot agency discovery. See [dmv-marketing-agency-cat-bot-discovery.md](../dmv-marketing-agency-cat-bot-discovery.md).

```bash
python docs/design/signal-processing/dmv_agency_pipeline/run_pipeline.py
```

Stages: `census` → `filter` → `enrich` → `score` → `report` (each rerunnable).

Requires repo `.env`: `GOOGLE_PLACES_API_KEY` (census), optional `TAVILY_API_KEY` (H06 job search).
