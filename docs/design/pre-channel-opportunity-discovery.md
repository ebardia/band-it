# Pre-channel opportunity discovery

| Field | Value |
|-------|--------|
| **Status** | **Build approved** (customer sign-off after Track A review) |
| **Parent** | [Agent Factory & Opportunity Discovery](./agent-factory-opportunity-discovery.md) |
| **Spreadsheets** | [Pre-channel-opportunity-signals.csv](./customer-track-a-spreadsheet/Pre-channel-opportunity-signals.csv), [Pre-channel-example-leads.csv](./customer-track-a-spreadsheet/Pre-channel-example-leads.csv) |
| **Signals PDF** | [Pre-channel-opportunity-signals.pdf](./customer-track-a-spreadsheet/Pre-channel-opportunity-signals.pdf) |
| **Full analysis** | [pre-channel-ai-discovery-analysis.md](./pre-channel-ai-discovery-analysis.md) |

---

## Problem (corrected)

The customer does **not** need another list of B-Stock, ReturnPro, or broker marketplaces. Those are **downstream channels**.

The opportunity is **trapped stock**: returns, overstock, or closeout inventory **in custody** (retailer, 3PL, manufacturer, closing store) **before** a disposition partner is engaged—or in the short window **before** that engagement becomes public.

**Both lanes:**

| Lane | Examples |
|------|----------|
| **Closings / wind-down** | Owner GOB, strategic closures, dealer distress |
| **Returns / reverse log** | Returns pile in DC or 3PL before ReturnPro/B-Stock |

Same playbook: **signal → exclude rules → verify → call**.

---

## Customer rules (post–Track A meeting)

These are **hard product rules**, not suggestions:

| Rule | Implementation |
|------|----------------|
| **Bankruptcy in press / PR = too late** | **S27** auto-exclude. Do not hunt on newspaper bankruptcy stories or press releases. |
| **S09 reframed** | Only **early docket** before public press—not BankruptcyObserver-style PR alerts. |
| **Do not target liquidation industry** | **S26** exclude: liquidators, brokers, auctioneers, ReturnPro/goTRG-style processors as **opportunity sources**. |
| **Financial stress before public collapse** | **S28–S30**: tax liens, collection/vendor suits (Phase 1); commercial credit APIs (Phase 2). |
| **Trapped stock only** | Target holds inventory under pressure—not companies whose business **is** selling liquidation. |

Joe’s current method (**relationships + intelligence**) remains the highest-yield path; Band It **widens and systematizes** early warning on public stress signals.

---

## Definitions

| Term | Meaning |
|------|---------|
| **Trapped stock** | Inventory in custody under space/time/cash pressure without a locked disposition channel |
| **Pre-channel** | Same as trapped stock before Hilco/PFP/B-Stock/ReturnPro/auction |
| **Signal** | Observable clue that trapped stock **may** exist (not proof of a truckload) |
| **signal_role** | `hunt` \| `exclude` \| `calibrate` (see signals CSV) |
| **trap_types** | `closing` \| `returns` \| `overstock` \| `financial` (comma-separated on each signal) |

---

## Agent roles (factory mapping — Phase 1 build)

This is **not one AI chatbot**. It is a **pipeline of factory agents** on Joe’s band subscription:

| Factory agent | Archetype | Role |
|---------------|-----------|------|
| **Signal scanner** | Discovery | Ingest news, WARN, jobs, leases, liens, courts (per signal adapters) |
| **Entity classifier** | Legitimacy | **S26**: drop liquidation-industry businesses |
| **Channel detector** | Legitimacy | **S15**: Hilco, PFP, B-Stock, ReturnPro, live auction |
| **Bankruptcy-public detector** | Legitimacy | **S27**: drop press/PR bankruptcy stories |
| **Stress scanner** | Discovery | **S28–S29**: tax liens, collection/vendor suits |
| **Signal stacker** | Fit | Boost rank when 2+ hunt signals on same entity (no S27/S26) |
| **Fit scorer** | Fit | Region (DMV), categories, truckload economics |
| **Ranker** | Judgment | Top N for Opportunity Desk |
| **Human** | Checkpoint | buy / maybe / not + why → trains Phase 3 judgment |

**Cat Bot design language:** trait-based intelligence bots (stalking, territory patrol, dead mouse delivery) — see [Cat Bot intelligence gathering](./cat-bot-intelligence-gathering.md). Factory agents above map to cat traits; Opportunity Desk delivers **findings**, not raw signal dumps.

**Deliverable to customer:** ranked **Opportunity Desk** list (Phase 1 UI) — same workflow as the spreadsheet, in product.

See [Agent Factory & Opportunity Discovery](./agent-factory-opportunity-discovery.md) for schema, phases, and cost caps.

**Workflow model:** [Agent workflow composition](./agent-workflow-composition.md) — bands compose agent, human, and sink nodes; Opportunity Discovery is the first template.

---

## Exclude gates (run before rank)

```text
Entity hit
  → S26 liquidation industry?        → DROP
  → S27 bankruptcy public PR/press?  → DROP (log missed window)
  → S15 channel assigned?            → DROP (benchmark only)
  → else stack hunt signals          → VERIFY queue → rank
```

---

## Signal catalog

**30 signals** in [Pre-channel-opportunity-signals.csv](./customer-track-a-spreadsheet/Pre-channel-opportunity-signals.csv):

| IDs | Role |
|-----|------|
| **S01–S13, S16–S25, S28–S29** | Hunt (trapped stock clues) |
| **S14** | Calibrate (customer past wins) |
| **S15, S26, S27** | Exclude (channel assigned, liquidation industry, bankruptcy PR) |
| **S30** | Hunt — Phase 2 paid credit data |

Plain-English PDF: [Pre-channel-opportunity-signals.pdf](./customer-track-a-spreadsheet/Pre-channel-opportunity-signals.pdf)

---

## Data sources (Phase 1 build)

| Adapter | Signals |
|---------|---------|
| RSS / news alerts | S01, S04, S11, S18 — **minus** S27 classifier |
| WARN (MD/VA/DC) | S17 |
| Indeed / jobs | S03 |
| LoopNet / lease | S08 |
| PACER early docket (not PR feed) | S09 pre-press only |
| County/state lien search | S28 |
| Civil court (vendor/collection) | S29, S20 |
| Classifieds | S22 |
| Watchlist domain diff | S23 |
| Entity classifier (NAICS + About page) | S26 |
| Manual / CSV | S14 customer wins |

**Phase 2:** S30 credit APIs; S24 EDGAR; deeper PACER.

**Never:** scrape B-Stock/Liquidation.com for discovery; LLM-invented warehouse lists.

---

## Success metrics

| Phase | Metric |
|-------|--------|
| **0 (done)** | Customer approved signal model + DMV sheet |
| **1** | Pipeline run ≤ ~$10; top 20 ranked opportunities; S26/S27 exclude working |
| **2** | Labels in app; weekly stats |
| **3** | Judgment profile weights signals Joe actually pursues |

**Wrong metric:** “500 warehouses found.”  
**Right metric:** “20 entities worth a call, none already on Hilco/B-Stock, none liquidation companies, none post-bankruptcy PR.”

---

## Revision history

| Date | Change |
|------|--------|
| 2026-05-29 | Initial spec |
| 2026-05-29 | Customer build approval; S26–S30; S27 bankruptcy-PR exclude; S26 industry exclude; trap_types; pipeline agents |

---

## Related (other use cases)

- [Cat Bot intelligence gathering](./cat-bot-intelligence-gathering.md) — trait-based bot pattern, VetDesk reference, Finding/dead-mouse model
- [Signal processing folder](./signal-processing/README.md) — reusable framework; [Band It outbound discovery](./signal-processing/band-it-outbound-discovery.md) dogfoods the same playbook for SMB sales.
