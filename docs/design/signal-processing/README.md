# Signal processing — design folder

Reusable **signal → exclude → verify → rank → act** patterns for Band It workflows.

| Path | Purpose |
|------|---------|
| [band-it-outbound-discovery.md](./band-it-outbound-discovery.md) | Dogfood use case: find 50 DC-metro SMBs to call for Band It |
| [band-it-outbound-signals.csv](./band-it-outbound-signals.csv) | Signal registry (fit / hunt / exclude / backlog) for agent build |
| [worksmarter-medspa/](./worksmarter-medspa/) | **Work Smarter Digital** demo — master doc includes hypothesis tests, legal boundaries, public-role research |

## How this relates to other design docs

| Doc | Relationship |
|-----|----------------|
| [pre-channel-opportunity-discovery.md](../pre-channel-opportunity-discovery.md) | **Vertical instance** — reverse logistics / trapped stock (customer Track A) |
| [pre-channel-ai-discovery-analysis.md](../pre-channel-ai-discovery-analysis.md) | Deep analysis; same playbook, different signals |
| [agent-workflow-composition.md](../agent-workflow-composition.md) | How bands compose scanner → classifier → ranker → human nodes |
| [adopt-a-cat-bot.md](../adopt-a-cat-bot.md) | **Product pivot** — specialized roam agents, 3-angle learning, gated memory (Work Smarter med spa = first neighborhood test) |
| Helmet / stack diagrams (`../intelligence-signal-processing-*.png`) | Product narrative art — not operational specs |

**Rule:** Put **framework + reusable signal catalogs** here. Put **customer-specific spreadsheets and meeting artifacts** under `customer-track-a-spreadsheet/` (or a future `customer-track-b/`).

## When to add a new doc here

- New **use case** with its own signal CSV (e.g. capture management outbound, environmental consulting)
- Shared scoring, agent roles, or verification patterns that apply across verticals

Do **not** duplicate pre-channel content — link to it as the reference implementation.

## Run outbound discovery v1

```bash
python docs/design/signal-processing/scripts/run_band_it_outbound_v1.py \
  --input docs/design/signal-processing/sample-seed-companies.csv \
  --output docs/design/signal-processing/output/band-it-outbound-leads.csv \
  --top 50
```

| Flag | Purpose |
|------|---------|
| `--fetch-web` | Pull homepage text before running keyword detectors |
| `--include-excluded` | Include excluded / zero-score rows in output |

**Input:** `sample-seed-companies.csv` (replace with your DMV company list).  
**Output:** ranked `band-it-outbound-leads.csv` with score, signals fired, verify hints.

Script package: `scripts/band_it_outbound/` — detectors, scoring, optional fetch.

