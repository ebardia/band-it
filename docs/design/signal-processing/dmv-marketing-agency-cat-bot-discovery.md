# DMV marketing agency discovery — Cat Bot adoption prospects

| Field | Value |
|-------|--------|
| **Goal** | Ranked list of **50 marketing agencies** in DC metro to pitch **Cat Bot adoption** (meta-demo: *our cats hunted you*) |
| **Archetype** | Growth-hungry **3–15 person** shop selling to **local SMBs** (restaurants, clinics, contractors, retail) — invisible to Apollo/ZoomInfo |
| **Parent** | [Cat Bot intelligence gathering](../cat-bot-intelligence-gathering.md), [signal-processing/](./README.md) |
| **Signal registry** | [dmv-marketing-agency-signals.csv](./dmv-marketing-agency-signals.csv) |
| **Seed list** | [dmv-marketing-agencies-seed.csv](./dmv-marketing-agencies-seed.csv) |
| **Script** | `scripts/run_dmv_agency_discovery_v0.py` |

---

## 1. Problem

You need **50 callable agencies** — not a generic “digital marketing” dump. Each row should answer:

1. Why do they feel **pipeline pain** (prospecting-starved)?
2. Why is their ICP **local SMB** (same resolution gap Cat Bot solves)?
3. What **evidence** would you show on slide one of the pitch?

**Meta-pitch:** Everything on the dossier page, our cats found automatically. The discovery run **is** the demo.

**Not the same list as:** [DMV SMB tech resellers](./dmv-smb-tech-reseller-discovery.md) (CRM/VAR partners). Overlap exists (HubSpot shops serving SMBs) — merge/dedupe by domain when combining lists.

---

## 2. Macro profile (four conditions)

| # | Condition | Observable from outside |
|---|-----------|------------------------|
| **C1** | Sells to **local SMBs** | Portfolio/case studies: dental, legal, home services, restaurants, med spa, contractors — not Fortune 500 / federal prime |
| **C2** | **Scramble zone** ~3–15 FTE | Team page count, LinkedIn headcount, Clutch size band, “boutique / founder-led” copy |
| **C3** | **Active hunger** | Own content cadence, directory upgrades, **BD/AE/growth job posting**, own paid search visible |
| **C4** | **Prospecting unsophistication** (optional boost) | No modern outbound stack language; referrals/word-of-mouth — **high Cat Bot fit** |

Agencies failing **C1** or **C2** drop before scoring. **C3** drives rank; **C4** breaks ties.

---

## 3. Cat mapping (this run)

| Cat | This discovery job |
|-----|-------------------|
| **Territory Cat** | Census + dedupe: Places, directories, seed CSV; optional snapshot diff on next run |
| **Whisker Cat** | Weak-signal stack: BD job + SMB portfolio + own marketing activity |
| **Stalking Cat** | Phase 2: portfolio logo removed, stale BD repost — manual/Tavily for v1 |
| **Night Vision Cat** | Phase 2: AMA-DC, WBJ lists, SCC filings — manual seed columns for v0 |
| **Curiosity Cat** | Phase 2: top-10 dossier JSON with founder + sample mouse for **their** vertical |
| **Dead mouse** | Output row: `why_flagged` + `evidence_links` — not a score-only CSV |

---

## 4. Executable process (how you actually get to 50)

### Phase A — Census (target 300–800 raw → dedupe)

| Step | Source | How (v0) | Automation |
|------|--------|----------|------------|
| **A1** | **Seed CSV** | HubSpot Solutions MD/DC/VA + manual Clutch export | `--input seed.csv` |
| **A2** | **Google Places (New)** | Text search × DMV localities × `"digital marketing agency"` | `--census-places` (needs `GOOGLE_PLACES_API_KEY`) |
| **A3** | **Clutch / UpCity / DesignRush** | Manual browse → paste into seed (`source_notes`, `clutch_url`) | v1: Tavily-assisted URL harvest |
| **A4** | **Dedupe** | Normalize `website` host; merge `places_id` + seed | Script built-in |

**DMV locality queries (Places):** Washington DC; Arlington VA; Alexandria VA; Bethesda MD; Rockville MD; Silver Spring MD; Fairfax VA; Tysons VA; Reston VA; Columbia MD; Gaithersburg MD; Bowie MD; Annapolis MD; Frederick MD; Manassas VA.

Expect **~40–80 unique agencies** from Places alone; seed + HubSpot directory gets you to **150+** before filter.

### Phase B — Filter (expect ~80–150 → ~60–100)

| ID | Rule |
|----|------|
| **F01** | DMV metro (city/state or service-area copy) |
| **F02** | Local SMB clientele signals on site |
| **F03** | Scale 3–15 (seed estimate, or team-page count heuristic) |
| **F04** | Marketing/digital offer (not pure staffing, not ISV product company) |

**Excludes (drop before rank):** X01 enterprise/gov-primary · X02 national scale 75+ · X03 staffing-only · X04 PR-only no digital · X05 pure web-dev shop no marketing · X06 Cat Bot competitor / AI outbound SaaS

### Phase C — Score (Whiskers)

| Points | Signal |
|--------|--------|
| +25 | F01–F04 pass |
| +20 | **H01** BD / AE / growth job (careers page or seed) |
| +15 | **H02** SMB vertical portfolio (≥2 verticals) |
| +12 | **H03** Active own marketing (blog/news in last 90d or seed) |
| +10 | **H04** Directory badge (HubSpot / Clutch / UpCity on site) |
| +8 | **H05** Referral-only / no outbound stack language (**unsophistication** = fit) |
| +8 | **H06** “New clients” / taking clients copy |
| +5 | **H07** GHL / white-label / local vertical package language |
| −30 | Any exclude fires |

**Target:** top **50** with score ≥ **55** after `--fetch-web`. Human verify top 20.

### Phase D — Dossier + bait (top 10–15, manual + script assist)

For outreach tier **A** rows only:

1. **Curiosity fields:** founder name, LinkedIn URL, vertical focus, contact path (from seed or manual)
2. **`why_flagged`:** one sentence combining top 2–3 signals
3. **Sample mouse:** one real finding in **their** vertical + metro (e.g. three Arlington restaurants with ownership change) — run a **vertical Places/news pass** or paste from a separate roam

This is the slide: *“You were output #4; here is a mouse we already caught for your clients.”*

---

## 5. Runbook (commands)

**Pipeline (v2 — stateful):** [`dmv_agency_pipeline/run_pipeline.py`](./dmv_agency_pipeline/run_pipeline.py)

```bash
# Full run: seed + legacy + Places census → filter → enrich → score → report
python docs/design/signal-processing/dmv_agency_pipeline/run_pipeline.py

# Compare old 30-row output only (no Places)
python docs/design/signal-processing/dmv_agency_pipeline/run_pipeline.py --legacy-only
```

Outputs: `dmv_agency_pipeline/output/targets-YYYY-MM-DD.csv`, `top10-*.md`, `deltas-*.md`, `data/rejected.csv`, `data/entities.sqlite`.

Config: [`dmv_agency_pipeline/config.json`](./dmv_agency_pipeline/config.json) (weights, territory, size band).

**Legacy one-shot script (deprecated):** `scripts/run_dmv_agency_discovery_v0.py`

**Pipeline output columns:** `rank`, `agency_name`, `website`, `domain`, `city`, `county`, `state`, `headcount`, `headcount_source`, `agency_score`, `signals_fired`, `verify_status`

---

## 6. How to fill the seed list (manual pass — ~2 hours)

Do this once; script re-scores as detectors improve.

| Source | Action |
|--------|--------|
| [Clutch — Advertising DC](https://clutch.co/agencies/digital-marketing/washington-dc) | Export top 40 by reviews; filter 3–15 employees in Clutch profile |
| [HubSpot Solutions — MD/DC/VA](https://ecosystem.hubspot.com/marketplace/solutions) | Add SMB-positioned partners **not** already in tech-reseller seed |
| [UpCity DC](https://upcity.com/digital-marketing) | Add local SMB case-study shops |
| Google Maps | Spot-check neighborhoods; add missing boutiques |
| **Overlap trim** | Dedupe against [dmv-smb-tech-resellers-seed.csv](./dmv-smb-tech-resellers-seed.csv) — keep CRM-heavy as reseller track; keep pure marketing as this track |

Goal: **≥120 seed rows** before Places census.

---

## 7. Pitch artifact (per top agency)

```markdown
## Why our cats flagged [Agency Name]

- **Territory:** DMV digital agency; team ~8; portfolio heavy on [dental / home services / legal].
- **Whiskers:** Careers page lists "Business Development Representative" (posted [date]).
- **Gap:** Site copy emphasizes referrals; no visible outbound research stack.
- **Sample mouse for your clients:** [one dead mouse — entity, window, 3 links]

> Everything above was assembled from public sources by the same pipeline we sell you.
```

---

## 8. Build phases

| Phase | Deliverable |
|-------|-------------|
| **v0 (now)** | Seed CSV + Places census + homepage detectors + ranked CSV + `why_flagged` |
| **v1** | Tavily BD-job enrichment; Clutch profile fetch; stalking deltas (portfolio diff) |
| **v2** | Curiosity dossier + auto sample-mouse from vertical mini-roam; Opportunity Desk import |
| **v3** | Scheduled territory patrol; entity graph persistence |

Aligns with [cat-bot-intelligence-gathering.md §6](../cat-bot-intelligence-gathering.md#6-what-to-build-first): patrol → finding → graph.

---

## 9. Open questions

| # | Question | Working answer |
|---|----------|----------------|
| 1 | Separate table from pre-channel/reseller seeds? | Same **Entity** graph later; separate CSV + script for v0 |
| 2 | Job posting without Indeed API? | v0: seed column + careers-page keyword scan; v1: Tavily |
| 3 | Findings UI | Outreach CSV first; top-N JSON dossier; Opportunity Desk in v2 |

---

## 10. Document map

| Doc | Relationship |
|-----|--------------|
| [cat-bot-intelligence-gathering.md](../cat-bot-intelligence-gathering.md) | Trait pattern + dead mouse |
| [dmv-smb-tech-reseller-discovery.md](./dmv-smb-tech-reseller-discovery.md) | Adjacent list — CRM/VAR Big Band prospects |
| [band-it-outbound-discovery.md](./band-it-outbound-discovery.md) | Same playbook on SMB end-buyers |

---

## 11. Revision history

| Date | Change |
|------|--------|
| 2026-06-11 | Initial design: macro profile, census/score/runbook, v0 script spec |
