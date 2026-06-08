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
| [adopt-a-cat-bot.md](../adopt-a-cat-bot.md) | **Product pivot** — specialized roam agents, 3-angle learning, gated memory |
| [adopt-a-cat-bot-platform.md](../adopt-a-cat-bot-platform.md) | **Platform** — same repo, Big Band → Band → Cat, keep/hide/new, adoptacatbot.com |
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

## Run Cat Bot roam lab (v0)

Programmatic roam for [Adopt A Cat Bot §12.4](../adopt-a-cat-bot.md#124-recommended-v0-roam-lab-pipeline) — Reddit, Google Places, Yelp, optional Brave, news RSS → return packet JSON.

```bash
python docs/design/signal-processing/scripts/run_cat_bot_roam_v0.py \
  --zip 20854 --max-spas 2 --no-synthesize
```

| Flag | Purpose |
|------|---------|
| `--zip` | Filter seed spas by zip (e.g. Potomac `20854`) |
| `--spa-name` | Filter spas where name contains substring |
| `--max-spas` | Cap review API calls per run |
| `--no-synthesize` | Heuristic return packet (no Anthropic call) |
| `--no-reddit` / `--no-places` / `--no-yelp` / `--no-brave` / `--no-news` | Disable a source |

**Env vars** (repo `.env` or shell): `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`, `GOOGLE_PLACES_API_KEY`, `YELP_API_KEY`, optional `BRAVE_SEARCH_API_KEY`, optional `ANTHROPIC_API_KEY`.

**Output:** `output/cat-bot-roam-evidence-*.json` (raw items) and `output/cat-bot-roam-packet-*.json` (§9 return packet shape).

Script package: `scripts/cat_bot_roam/`.

