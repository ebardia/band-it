# Signal processing — design folder

Reusable **signal → exclude → verify → rank → act** patterns for Band It workflows.

| Path | Purpose |
|------|---------|
| [../cat-bot-intelligence-gathering.md](../cat-bot-intelligence-gathering.md) | **Cat Bot pattern** — seven traits, dead mouse, VetDesk reference, Agent Factory mapping |
| [band-it-outbound-discovery.md](./band-it-outbound-discovery.md) | Dogfood use case: find 50 DC-metro SMBs to call for Band It |
| [band-it-outbound-signals.csv](./band-it-outbound-signals.csv) | Signal registry (fit / hunt / exclude / backlog) for agent build |
| [worksmarter-medspa/](./worksmarter-medspa/) | Work Smarter med spa demo — reseller → end-client vertical |
| [dmv-smb-tech-reseller-discovery.md](./dmv-smb-tech-reseller-discovery.md) | **Big Band prospecting** — 50 DMV SMB technology resellers |
| [dmv-smb-tech-reseller-outreach-intel.md](./dmv-smb-tech-reseller-outreach-intel.md) | **Pre-outreach Cat Bot dossier** — O-signals + openers |
| [worksmarter-medspa/guest-post-publish-cat-potomac-skin-care.md](./worksmarter-medspa/guest-post-publish-cat-potomac-skin-care.md) | **Publish Cat** — guest posts when client-active (design only) |
| [worksmarter-medspa/social-cat-campaign-copilot-potomac-skin-care.md](./worksmarter-medspa/social-cat-campaign-copilot-potomac-skin-care.md) | **Social Cat** — organic social copilot when client-active (design only) |

## How this relates to other design docs

| Doc | Relationship |
|-----|----------------|
| [cat-bot-intelligence-gathering.md](../cat-bot-intelligence-gathering.md) | **Trait-based intelligence bots** — dead mouse, clowder, VetDesk; extends this folder + Agent Factory |
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

## Build sequencing (v0)

Aligns with [platform doc §6.5](../adopt-a-cat-bot-platform.md#65-build-sequencing-v0--decided-2026-06-08):

```text
1. Python roam lab (this folder)     →  real JSON, tune signals
2. House Band on adoptacatbot        →  store RoamRun + domesticate
3. Customer Big Band demo            →  Work Smarter + Potomac
```

| Track | Scripts | APIs to prove first |
|-------|---------|---------------------|
| **Med spa Market Cat** | `run_cat_bot_roam_v0.py` | Google Places (New), Yelp Fusion, news RSS; Reddit when approved |
| **Big Band reseller outreach** | `run_reseller_dossier_v0.py` (planned) | Homepage fetch, Clutch, news — **not** Places/Yelp-first |

## API credentials (v0 lab)

Add to repo root `.env` (gitignored). Loader: `scripts/cat_bot_roam/env.py`.

| Variable | Used for | When required |
|----------|----------|---------------|
| `GOOGLE_PLACES_API_KEY` | Text Search + Place Details (reviews) | Med spa / local consumer roams |
| `YELP_API_KEY` | Fusion business + reviews | Med spa / local consumer roams |
| `GEMINI_API_KEY` | Return packet synthesis (preferred over Anthropic in lab) | Optional — [AI Studio](https://aistudio.google.com/apikey) |
| `GEMINI_MODEL` | Default `gemini-2.5-flash` | Optional |
| `ANTHROPIC_API_KEY` | Return packet synthesis (fallback) | Optional |
| `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET` | Subreddit search | Optional until Reddit Data Access approved |
| `BRAVE_SEARCH_API_KEY` | Forum/blog discovery | Optional |
| `ANTHROPIC_API_KEY` | LLM return packet | Optional (`--no-synthesize` for heuristic) |

**Google Cloud setup:** enable **Places API (New)** (not legacy Places API), attach billing, create API key restricted to that API. Test Places-only:

```bash
python docs/design/signal-processing/scripts/run_cat_bot_roam_v0.py \
  --zip 20854 --max-spas 1 --no-synthesize --no-reddit --no-yelp --no-brave --no-news
```

**Why APIs if data is public?** Repeatable roams, citations, cross-source merge — not a substitute for product value. See [adopt-a-cat-bot.md §5.3–12.0](../adopt-a-cat-bot.md#53-value-on-top-of-public-sources-google-yelp-reddit-).

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

