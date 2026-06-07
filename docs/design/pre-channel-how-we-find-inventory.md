# How we find inventory under pressure

| Field | Value |
|-------|--------|
| **Parent** | [pre-channel-ai-discovery-analysis.md](./pre-channel-ai-discovery-analysis.md) |
| **Companion** | [pre-channel-signal-to-deal-playbook.md](./pre-channel-signal-to-deal-playbook.md) (verify → call → close) |
| **Core truth** | You do **not** search the web for “secret truckloads.” You find **entities + places + timing** where goods are likely trapped **before** a liquidator channel exists. |

---

## 1. What you are actually looking for

Inventory under pressure is not a URL. It is:

```text
LEGAL OWNER  +  PHYSICAL LOCATION  +  REASON TO MOVE NOW  +  NO CHANNEL YET
```

| Piece | How you find it |
|-------|-----------------|
| **Legal owner** | News, SOS, bankruptcy debtor name, lease tenant |
| **Physical location** | Articles (“DC in Indianapolis”), WARN site list, lease address, Ch11 schedules, store addresses |
| **Pressure** | Signal type S01–S25 (closure, filing, lease, storage lien, floor plan, etc.) |
| **No channel yet** | Channel detector: no Hilco, PFP, B-Stock, ReturnPro, live auction |

Until all four are plausible, you have a **signal**, not “inventory found.”

---

## 2. Where pressured inventory usually sits

| Location type | Typical owner | Common signals |
|---------------|---------------|----------------|
| **Regional DC / returns center** | Retailer or 3PL for retailer | S02, S03, S04, S09, S10, S17 |
| **Store backroom / showroom** | Retailer or franchisee | S01, S11, S02 |
| **3PL warehouse (client goods)** | Retailer (3PL holds only) | S05, S20 |
| **Factory / importer warehouse** | Manufacturer | S07, S16, S19 |
| **Dealer lot / floor-plan yard** | Independent dealer group | S16, S25 |
| **Building left behind** | Tenant, landlord, or estate | S08, S21 |

**Agent job:** tag each lead with `custody_type` + `location_hint` (city, “DC”, “3PL”, “store”).

---

## 3. The find loop (repeat weekly)

```text
┌─────────────────────────────────────────────────────────────┐
│ 1. MONITOR — run watchlist sources on a schedule            │
│    (trade press, WARN, news alerts, jobs, filings, leases)  │
└───────────────────────────┬─────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. EXTRACT — entity name, signal ID(s), date, location hint │
└───────────────────────────┬─────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. CHANNEL GATE — drop if S15 (liquidator/marketplace live) │
└───────────────────────────┬─────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. STACK — 2+ signals on same entity → priority queue       │
└───────────────────────────┬─────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. LOCATE — pin facility: news, SOS, Maps, PACER schedules  │
└───────────────────────────┬─────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. CONFIRM — call / email: “Is bulk still on site? Who signs?”│
└─────────────────────────────────────────────────────────────┘
```

**Finding ends at step 6 with a yes/no on physical bulk.** Pricing and wire are later ([playbook §7–12](./pre-channel-signal-to-deal-playbook.md)).

---

## 4. What to run (Phase 0 — manual, today)

Use [Pre-channel-watchlist.csv](./customer-track-a-spreadsheet/Pre-channel-watchlist.csv) + [Pre-channel-opportunity-signals.csv](./customer-track-a-spreadsheet/Pre-channel-opportunity-signals.csv).

| Cadence | Source | Finds |
|---------|--------|--------|
| **Weekly** | [Furniture Today store closings](https://www.furnituretoday.com/store-closings/) | S01, S10, S11 candidates |
| **Weekly** | Google Alerts (templates in watchlist) | S01, S04, S11 |
| **Weekly** | Indeed: `returns manager` + furniture − ReturnPro | S03 |
| **Weekly** | LoopNet / Crexi: furniture distribution sublease | S08 |
| **Daily** (if chasing filings) | BankruptcyObserver / PACER keywords | S09, S19 |
| **Monthly** | DOL WARN — furniture / home retail employers | S17 |
| **Continuous** | Specific companies tab in watchlist | Pre-vetted names to re-check channel |

**Per hit (15 min):** record entity → run channel searches → add to lead queue or discard.

---

## 5. What agents automate (Phase 1)

| Agent step | Input | Output |
|------------|-------|--------|
| **Scanner** | RSS, WARN API, alert queries, watchlist URLs | Raw rows: `entity, signal_ids[], date, snippet, url` |
| **Channel detector** | Entity + aliases | `open | forming | assigned` + evidence links |
| **Stacker** | All rows 30-day window | Groups by entity; boost score if 2+ signals |
| **Locator** | Entity + signal | `facility_candidates[]` (address, type, source) |
| **Ranker** | Stack × window × fit × channel | Top N for human confirm call |

**Still human:** phone call to confirm pallets/trailers on site.

**Do not automate:** “List of warehouses with furniture” from LLM alone.

---

## 6. Queries that find *situations* (copy-paste)

Run in news/Google Alerts; **always** channel-gate the entity after.

| Goal | Query pattern |
|------|----------------|
| Pre-liquidator closing | `"furniture" "closing" -Hilco -"Planned Furniture" -B-Stock` |
| Shutdown before court | `"furniture" "closed" "before" bankruptcy` |
| DC / warehouse stress | `"excess inventory" furniture warehouse` |
| 3PL / storage pain | `"storage fees" returns warehouse furniture` |
| Lease pressure | `furniture distribution sublease OR "must vacate" inventory` |
| Early bankruptcy | `"Chapter 11" furniture filed` (then check docket age) |
| Local remainder | `"warehouse sale" furniture appointment -PFP` |
| Floor plan (dealer) | `furniture "floor plan" curtailment OR repossession` |

---

## 7. How you confirm inventory exists (the “find” finish line)

| Method | When | Pass criteria |
|--------|------|----------------|
| **Phone** | Every qualified lead | They admit bulk / returns / overstock on site or at named DC |
| **Ch11 schedules** | S09 | Inventory line items, locations in schedules |
| **Site visit** | Local S11, S08 | See backroom / dock; photos |
| **Broker lease call** | S08, S21 | “Is merchandise included in deal?” |
| **3PL call** | S05 | Client authorized bulk sale; SKU category = home goods |
| **Receiver letter** | S19 | Receiver confirms finished goods asset |

**You found inventory when:** named location + category + rough quantity + seller role identified.

---

## 8. What you will not find (avoid wasted effort)

| Approach | Why it fails |
|----------|--------------|
| Scrape B-Stock / Liquidation.com for “new gems” | Already channeled (S15) |
| Truck GPS nationwide | No cargo type; not public |
| LLM “list of return centers” | Hallucination / no custody proof |
| Generic “liquidation truckload” SEO sites | Brokers, downstream |
| National PFP/Hilco GOB announcements | Late for pre-channel |

---

## 9. Example: find path for one gem

**Input:** Furniture Today — regional chain closing 6 stores; no liquidator in first article (S10 + S01).

| Step | Action | Result |
|------|--------|--------|
| Monitor | Weekly closings scan | Hit |
| Extract | “Example Home LLC”, 6 states, Mar 2026 | Entity |
| Channel gate | Search + Example Home + Hilco, B-Stock, ReturnPro | Open |
| Stack | Same week: WARN at Example Home DC (S17) | Priority ↑ |
| Locate | Q4 call transcript mentions “Indianapolis returns DC” | Facility candidate |
| Confirm | Call ops: bulk returns still there? | Yes — 2 trailers |
| **Found** | Owner = Example Home; place = Indianapolis DC; pressure = closure + WARN | → playbook outreach |

If week 2 press release names Hilco → **assigned** → stop finding; channel closed.

---

## 10. Metrics for “find” (not “deal”)

| Metric | Healthy Phase 0 |
|--------|------------------|
| Raw signals / week | 20–50 |
| Pass channel gate | ~10–20% |
| Facility located (address or city+DC) | 2–5 / week |
| **Inventory confirmed on call** | 0–2 / week |

**Wrong:** “500 warehouses in database.”  
**Right:** “2 facilities this week where bulk is still on site and no liquidator named.”

---

## 11. Calibrate with Joe (finding, not funding)

1. Which **regions** are worth a site visit?  
2. Which **signal types** matched his past gems (S14)?  
3. Will he call **3PLs** cold or only intros?  
4. Minimum confirm: **trailer count** or pallet count?  
5. Categories that are not worth finding (mattress-only, patio, RTA office)?

---

## Revision history

| Date | Change |
|------|--------|
| 2026-05-29 | Initial “how we find inventory under pressure” |
