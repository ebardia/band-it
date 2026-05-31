# Agent Factory & Opportunity Discovery — Design Document

| Field | Value |
|-------|--------|
| **Status** | Draft |
| **Created** | 2026-05-29 |
| **Authors** | Band It product/engineering |
| **First customer context** | Friend (“Joe”) — wholesale liquidation / home furnishings resale (reference instance, not product name) |

---

## Overview

Band It’s core value proposition is evolving toward **agents and the data they produce**, orchestrated by **bands** of humans. The **Agent Factory** is a **platform-wide** system: a catalog of thousands of agents (eventually user-created), organized by category, versioned, and composed into **pipelines**. **Bands** enable pipelines, configure domain settings, invite humans to review outputs, and accumulate **judgment** through labels.

**Opportunity Discovery** is the first pipeline built on this factory. It implements **group-in-the-loop**: multiple narrow agents propose and filter; humans evaluate; agents learn from human judgment over time. It is **not** a search tool and **not** industry-specific in implementation—**liquidation resale** (Joe) is the first **domain pack** and reference instance.

This document defines architecture, data model, phases, constraints, and how other industries (real estate, grants, recruiting, etc.) reuse the same pattern.

---

## Problem statement

Experts in many fields spend most of their time **finding and filtering** opportunities (deals, grants, contracts, candidates, suppliers, partners), not executing the work itself. Generic AI chat and single mega-prompts do not match how real work happens: **small groups**, **narrow agent roles**, **human checkpoints**, and **learning from repeated choices**.

Band It should provide:

1. A **factory** where agents are first-class platform assets.
2. **Pipelines** that run those agents in sequence on real-world inputs.
3. A **band workspace** where configured humans review a short ranked list and label outcomes.
4. **Per-band judgment** that improves ranking without requiring the human to review hundreds of noisy leads weekly.

---

## Goals

| Goal | Description |
|------|-------------|
| **G1** | Platform-wide **Agent Factory** with categories, versions, and composable pipelines—not band-embedded one-offs. |
| **G2** | **Generalized Opportunity Discovery** funnel reusable across industries via domain packs and category filters. |
| **G3** | **Group-in-the-loop**: discover → legit → benchmark → fit → rank → human labels → learn (later). |
| **G4** | First reference instance: **resale/liquidation** with category `home_furnishings` (among others). |
| **G5** | **Pre-customer proof**: produce a **real** opportunity list without customer input; Joe ranks buy/maybe/not (spreadsheet acceptable before full UI). |
| **G6** | **Cost discipline**: pilot runs stay ~“coffee money” (target **≤ ~$10** per manual pipeline run). |
| **G7** | **Data hygiene**: opportunity data **90-day retention** with alerts before purge. |
| **G8** | **Role-configurable** labeling (which band roles may submit buy/maybe/not). |

---

## Non-goals (initial phases)

- Perfecting any single agent before end-to-end funnel works.
- Beating the expert on deal quality in v1 (“cheaper than Joe”).
- Aggressive scraping of marketplaces that prohibit it.
- Auto-creating band projects/tasks from “would buy” (Phase 2 = **flag only**; workflow TBD).
- User-created agents in v1 (schema should **allow** later).
- Pallet-specific routes, table names, or product branding.

---

## Strategic alignment

Matches Band It landing narrative:

- **Closet / rack** → many raw opportunities visible.
- **Getting dressed** → assemble people, agents, and fit for the job.
- **Fitting room** → try, change, low cost of experiment.
- **Wardrobe** → living record of what you “wore” (pursued) before.

Matches **group-in-the-loop** thesis: human-in-the-loop AI is insufficient; **group + agents + shared workspace + human judgment** is the unit of work.

---

## Users and tenancy

### Platform

- **Agent Factory**: global catalog; maintained by Band It; eventually open to user-authored agents.
- **Agent categories**: taxonomy for discovery in factory (e.g. Discovery, Legitimacy, Benchmarking, Fit, Judgment, Facilitation).

### Band

- Founder creates or is assigned a **band** (Joe’s band created by Band It operator initially).
- Band **enables** one or more **pipeline subscriptions** (e.g. Opportunity Discovery v1).
- Band sets **domain profile**: pack template, enabled **categories**, constraints, benchmark channels, labeling roles.
- Band members with configured roles **review** ranked opportunities and apply labels.

### First customer (Joe) — reference only

- Personal friend; wholesale liquidation reseller (home furnishings).
- Sometimes finds inventory from businesses **legitimately** going out of business; must filter **pretend** going-out-of-business scams (legitimacy agent concern).
- No additional structured input available before first demo; first interaction is **reviewing a list Band It found**.

---

## Universal funnel (all industries)

Every Opportunity Discovery instance uses the same stages:

```text
 Level 1  DISCOVERY      → hundreds/thousands of raw candidates (breadth, freshness)
 Level 2  LEGITIMACY     → filter scams, stale, misrepresented, bad actors
 Level 3  BENCHMARK      → estimate “market value” or comparable outcome (domain-specific)
 Level 4  FIT            → category, economics, geography, constraints, deadlines
 Level 5  JUDGMENT       → “Would this band’s expert pursue this?” (learns over time)
          HUMAN CHECKPOINT → buy / maybe / not (+ optional why)
```

**Early-stage win metric** (all domains): expert spends **~2 hours on ~20 strong candidates** instead of **~10 hours on ~500 noisy ones**, with **same or better** decision quality—not “AI found better deals than the human.”

---

## Agent archetypes (factory building blocks)

Each archetype is a **factory agent** with its own prompt template, model tier, I/O schema, and cost profile.

| Archetype | Role | Typical model tier |
|-----------|------|--------------------|
| **Discovery** | Find raw candidates from sources, search, feeds | Cheap / high volume |
| **Legitimacy** | Trustworthiness of source and listing (incl. scam patterns) | Cheap + rules/allowlist |
| **Benchmark** | Comparable market reference (not always price) | Mid / reasoning |
| **Fit** | Rules + scoring vs band profile and categories | Rules first, LLM for edges |
| **Judgment** | Rank by predicted human pursuit; learns from labels | Mid → richer over time |

**Opportunity Discovery pipeline** = fixed ordering of these five archetypes (configurable prompts per domain pack).

---

## Industry mapping (same pipeline, different config)

| Domain pack | Discovery examples | Legitimacy focus | Benchmark examples | Fit examples | Judgment question |
|-------------|-------------------|------------------|--------------------|--------------|-------------------|
| **Resale / liquidation** (Joe) | Liquidation marketplaces, regional liquidators, GOOB sales | Fake GOOB, manifest fraud | Liquidation.com / B-Stock **resale** (not buy price) | `home_furnishings`, margin after ship/fees | Would Joe buy this lot? |
| **Real estate investor** | Auctions, MLS fragments, off-market lists | Bait listings, title red flags | Comps, ARV | Market, strategy, max price | Would we offer? |
| **Grant writer** | Grants.gov, foundations, RFPs | Pay-to-play, fake funders | Typical award size / fit | Mission, deadline, effort vs award | Would we apply? |
| **Environmental consultant** | SAM.gov, state procurement | Scope realism, set-asides | Past award patterns | Certs, region, practice area | Would we bid? |
| **Recruiter** | Boards, referrals (ToS-safe) | Fake profiles | Market comp for role | Skills, salary, mandate | Would I submit? |
| **Manufacturer / suppliers** | Directories, RFQs, trade platforms | Vendor scams | Unit economics vs alternates | Spec, MOQ, compliance | Would we RFQ/sample? |
| **Political / coalition** | Orgs in issue space | Reputational risk | Overlap / influence proxies | Values, geography | Would we partner? |

**Liquidation.com / B-Stock** (Joe): **benchmark channels only**—Joe buys **upstream**; those sites represent **expected resale**, not sourcing.

---

## Agent Factory — platform architecture

### Concepts

| Concept | Description |
|---------|-------------|
| **Agent** | Global definition: name, category, version, prompt template, default model, input/output JSON schema, cost hints. |
| **AgentCategory** | Factory navigation and permissions (Discovery, Legitimacy, …). |
| **Pipeline** | Ordered list of agent references + stage config. |
| **DomainPack** | Pipeline + default prompts, benchmark strategy, category taxonomy, example sources. |
| **BandPipelineSubscription** | Band enabled pack + overrides (profile JSON, enabled categories, labeling roles). |
| **PipelineRun** | One execution: status, counts, cost rollup, started/completed. |
| **Opportunity** | One candidate record per band per run (or persistent across runs with dedup). |
| **OpportunityLabel** | Human buy / maybe / not, optional why, userId, role at time of label. |
| **JudgmentProfile** | Per-band learned weights / model state (Phase 3+). |
| **Source** | Platform or band-defined origin (URL, adapter type, ToS notes, allowlist status). |

### Future: user-created agents

Schema should include (deferred implementation):

- `createdByUserId`, `visibility` (private | band | platform)
- Review/approval path for platform publication
- Fork/version from platform agents

### Factory is not band-only

Bands **consume** agents; they do not own the canonical agent definitions. Band-specific data: subscriptions, opportunities, labels, judgment profiles, adopted sources.

---

## Data model (draft)

Prisma-oriented sketch; names are indicative.

```text
AgentCategory
  id, slug, name, description, sortOrder

Agent
  id, categoryId, slug, name, description
  version, status (draft | published | deprecated)
  promptTemplate, systemTemplate
  defaultModel, defaultMaxTokens
  inputSchemaJson, outputSchemaJson
  createdByUserId?, visibility
  platformOwned boolean

Pipeline
  id, slug, name, description
  stagesJson  // ordered agent refs + stage keys

DomainPack
  id, pipelineId, slug, name
  defaultProfileJson, categoryTaxonomyJson
  seedSourcesJson?

BandPipelineSubscription
  id, bandId, domainPackId
  profileJson, enabledCategorySlugs[]
  labelingRoles[]  // band roles allowed to label
  isActive

Source
  id, scope (platform | band), bandId?
  name, url, adapterType, tosNotes, legitimacyTier
  isAllowlisted

Opportunity
  id, bandId, sourceId?, externalId?
  title, url, rawPayloadJson
  discoveredAt, expiresAt  // 90-day retention anchor
  discoveryRunId?, scoresJson, rank?, surfacedAt?

PipelineRun
  id, bandId, subscriptionId
  status, trigger (manual | cron)
  countsJson, costUsd?, error?
  startedAt, completedAt

OpportunityScore  // optional normalized stage outputs
  opportunityId, stage, score, reasoning, modelUsed

OpportunityLabel
  id, opportunityId, userId, memberRole
  verdict (buy | maybe | not)
  why?, createdAt

JudgmentProfile
  bandId, subscriptionId, modelStateJson, updatedAt
```

**Dedup**: same URL/hash per band should not spam daily lists.

**Retention**: `expiresAt = discoveredAt + 90 days`; job warns band at e.g. 7 days before; hard delete or archive after.

---

## Band configuration

### Domain profile (JSON). Example — liquidation pack

```json
{
  "packSlug": "resale-liquidation",
  "categories": ["home_furnishings", "general_merchandise"],
  "constraints": {
    "minMarginPercent": 15,
    "maxShippingZones": ["US"]
  },
  "benchmarkChannels": [
    { "name": "Liquidation.com", "role": "resale_ceiling" },
    { "name": "B-Stock", "role": "resale_ceiling" }
  ],
  "legitimacyNotes": ["verify_goob_authenticity"]
}
```

### Labeling permissions

Band configures which **MemberRole** values may submit labels (e.g. `FOUNDER`, `GOVERNOR` only vs all `VOTING_MEMBER`). Enforced in tRPC mutations.

### “Would buy” semantics

Phase 2: **flag on Opportunity** via `OpportunityLabel.verdict`. No automatic project/task creation until explicitly designed.

---

## Human interface — Opportunity Desk

**Naming**: general, not pallet-specific. Working title: **Opportunity Desk** (band-scoped).

### MVP UI (Phase 1–2)

- Band nav entry when subscription active.
- Daily / latest **top N** (default 20) ranked opportunities.
- Columns/cards: source, title, link, key economics, legitimacy summary, fit summary, judgment reasoning, rank.
- Actions: **Buy / Maybe / Not for me** + optional **Why?** (especially on “not”).
- **Run pipeline now** (manual trigger; admin/founder).
- Weekly summary (Phase 2+): listings processed, surfaced, labeled, time-saved estimate.

### Pre-UI deliverable (Track A — customer)

- Spreadsheet with same columns; customer marks buy/maybe/not in meeting.
- Labels imported when DB exists. See [Customer Track A runbook](./customer-track-a-runbook.md).

---

## Pipeline execution

### Orchestration

1. Load band subscription + profile.
2. **Discovery**: ingest from band/platform sources + adapters (see Sources).
3. **Legitimacy**: score/filter; apply allowlist boosts.
4. **Benchmark**: attach comparables per pack strategy.
5. **Fit**: apply categories and rules; drop below thresholds.
6. **Judgment**: rank survivors (Phase 1: heuristic `fit × legitimacy × margin`; Phase 3: judgment profile).
7. Persist top N, notify band.

### Infrastructure (existing Band It)

- **Cron**: `node-cron` in API (`apps/api/src/cron/*`); add `opportunity-discovery-cron.ts` when scheduled runs are needed. **Phase 1: manual only.**
- **AI**: `callAI` / `callGemini` with per-stage `operation` tags and usage logging (`apps/api/src/lib/ai-client.ts`).
- **Admin**: manual trigger pattern like `/admin/cron-jobs`.

### Cost controls (~$10/run)

- Cap raw listings ingested per run.
- Cheap models for Discovery + Legitimacy; fewer calls for Benchmark/Judgment.
- Short-circuit: do not run stage N+1 if stage N fails threshold.
- Log `costUsd` on `PipelineRun`; band-visible summary.

---

## Sources and legal access

### Principles

- **No aggressive scraping** of ToS-restricted marketplaces.
- Prefer: RSS, public APIs, official partner APIs, search-assisted discovery with human vetting, **band CSV/URL paste**, email forwards (later).
- **Platform seed catalog**: researched source metadata (name, URL, adapter type, risk)—not necessarily live ingest day one.

### Phase 0 (pre-build / Joe spreadsheet)

Operator-run **discovery sprint**: real URLs and listings found via permitted means + manual research. Document source catalog and 20–30 real opportunities for the customer. See [Customer Track A runbook](./customer-track-a-runbook.md).

### Adapters (Phase 1+)

| adapterType | Description |
|-------------|-------------|
| `manual` | Human-entered row |
| `csv_upload` | Band uploads sheet |
| `url_list` | Band provides URLs to fetch (respect robots/ToS) |
| `rss` | Feed URL |
| `search_api` | Configured search provider (TBD) |
| `partner_api` | OAuth APIs when available |

---

## Phases

| Phase | Scope | Deliverable |
|-------|--------|-------------|
| **0 — Pre-product** | Real opportunities + source catalog; spreadsheet; Joe labels | Validates story without full UI |
| **1** | Factory schema (minimal), band subscription, manual run, 5 agents crude, Desk v0, top 20 | End-to-end on real data |
| **2** | In-app buy/maybe/not; role config; label storage; weekly stats | Human checkpoint in product |
| **3** | Judgment profile learns from labels | “Joe-modeler” per band |
| **4** | More sources, adapters, allowlist growth | Wider funnel |
| **5** | User-authored agents; additional domain packs | Platform scale |

**Phase 1 ranking**: weighted heuristic only—**no ML** until labels exist in Phase 3.

---

## Pre-customer runbook (Track A)

**Owner**: Band It operator (not the customer).

Full checklist, search queries, legitimacy rubric, and meeting flow: **[Customer Track A runbook](./customer-track-a-runbook.md)**.

---

## Integration points (current codebase)

| Area | Path / pattern |
|------|----------------|
| Bands | `prisma.band`, `member`, roles — `apps/api/src/server/routers/band/` |
| AI calls | `apps/api/src/lib/ai-client.ts`, `gemini-client.ts` |
| Cron | `apps/api/src/cron/`, `init*Cron()` in `apps/api/src/index.ts` |
| Admin tools | `apps/web/src/app/admin/cron-jobs/` |
| Auth | JWT + band membership checks on tRPC |

New surfaces (planned):

- `apps/api/src/server/routers/agent-factory/` (catalog read, admin publish)
- `apps/api/src/server/routers/opportunity-desk/` (band runs, list, label)
- `apps/web/src/app/bands/[slug]/opportunities/` or `/desk` (TBD route)
- Platform admin: agent publish, pack seed, cost reports

---

## Security and privacy

- Opportunities may contain business names, prices, locations—treat as **band-private** by default.
- Labels attributable to users for audit; respect band role config.
- Export/delete on band dissolution follows band data policy (TBD).
- 90-day retention limits exposure; notify before delete.

---

## Success metrics

### Phase 0 (customer meeting)

- ≥20 **real** opportunities documented with URLs.
- Customer completes verdicts on ≥15 rows.
- ≥3 actionable “buy” or “maybe” items the customer agrees were worth their time.

### Phase 1 (product)

- Manual pipeline run completes with cost ≤ ~$10.
- Top 20 displayed in Desk for the customer’s band.
- Run reproducible next day with fresh ingest.

### Phase 2+

- Label rate ≥60% of surfaced rows per week.
- Week-over-week precision@10 on “buy” (customer agrees with top 10).

---

## Open questions

| # | Question | Owner |
|---|----------|--------|
| 1 | Exact route: `/bands/[slug]/desk` vs `/bands/[slug]/opportunities` | Product |
| 2 | Search API provider for Discovery (if any) vs manual-only Phase 1 | Engineering |
| 3 | Dedup strategy across runs (URL hash vs external ID) | Engineering |
| 4 | Import path for spreadsheet labels into `OpportunityLabel` | Engineering |
| 5 | Platform admin UI for agent publish vs seed scripts only | Product |
| 6 | Notification when daily run completes | Product |
| 7 | Band It legal review template per Source.adapterType | Ops |

---

## References

- Group-in-the-loop landing copy: `apps/web/src/components/landing/LandingNewspaperPage.tsx`
- Long-form essay: `apps/web/src/app/manifesto/page.tsx`
- Original Joe / liquidation spec: product discussion 2026-05-29 (chat archive)
- Cron patterns: `apps/api/src/cron/`
- Similar doc style: `docs/big-band-design.md`

---

## Revision history

| Date | Change |
|------|--------|
| 2026-05-29 | Initial draft from product discovery sessions |
