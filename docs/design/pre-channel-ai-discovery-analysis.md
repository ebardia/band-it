# Pre-channel opportunity discovery — full analysis (shareable)

| Field | Value |
|-------|--------|
| **Purpose** | Single document to share with reviewers (GPT, Claude, stakeholders) |
| **Product** | Band It — Agent Factory + Opportunity Discovery |
| **First customer context** | “Joe” — wholesale home furnishings / graded e-commerce returns; wants inventory **before** public liquidators and marketplaces |
| **Status** | Exploration / pre-product (Phase 0) |
| **Related repo files** | [pre-channel-how-we-find-inventory.md](./pre-channel-how-we-find-inventory.md), [pre-channel-opportunity-discovery.md](./pre-channel-opportunity-discovery.md), [pre-channel-signal-to-deal-playbook.md](./pre-channel-signal-to-deal-playbook.md), [Pre-channel-opportunity-signals.csv](./customer-track-a-spreadsheet/Pre-channel-opportunity-signals.csv), [Pre-channel-watchlist.csv](./customer-track-a-spreadsheet/Pre-channel-watchlist.csv) |
| **Last updated** | 2026-05-29 |

---

## 1. Executive summary

**The opportunity is not “find more liquidation websites.”** The customer already buys from B-Stock, Liquidation.com, ReturnPro-style processors, and broker marketplaces. Those are **downstream channels**—inventory already committed to a disposition path.

**The gem layer is pre-channel:** returns, overstock, or closeout stock **in custody** (retailer, 3PL, manufacturer DC) **without** an active wholesale program—or in a **short window** before Hilco, Planned Furniture Promotions (PFP), B-Stock, ReturnPro, or an auctioneer is engaged.

**Neither AI nor Google alone finds secret warehouses.** Public web finds **signals** (distress, timing, custody pressure). Humans **verify** and **outreach** wins deals.

**Truck monitoring is not a viable national discovery method.** Facility-first signals + channel exclusion + timing + call is the realistic path.

**Recommended AI agent focus:** signal scanning, **channel detector** (exclude late stage), signal **stacking**, legitimacy scoring, rank for human outreach—not LLM-invented warehouse lists.

---

## 2. Customer problem (corrected after feedback)

| Customer wants | Customer does **not** need |
|----------------|---------------------------|
| Graded e-commerce returns / overstock **before** resell channel exists | Another B-Stock / Liquidation.com / ReturnPro directory |
| Truckloads from stressed operators with trapped inventory | Store GOOB run by PFP/Hilco (different lane unless they also buy that) |
| Relationships: call owner, 3PL, counsel **before** liquidator contract | SEO lists of “liquidation truckloads for sale” |

**Benchmark only (margin math after you have an ask price):** B-Stock, Liquidation.com, broker comps—not “discovery.”

---

## 3. Definitions

| Term | Meaning |
|------|---------|
| **Pre-channel** | Inventory in custody without an active scale disposition partner, or window before contract |
| **Channel assigned** | Hilco, PFP, B-Stock, ReturnPro, goTRG, auction, named GOB operator—gem window largely closed for outsiders |
| **Signal** | Observable public fact suggesting pre-channel inventory **may** exist (not proof of a truckload) |
| **Lead** | Entity + signal instance worth human verify/outreach |
| **Gem** | Customer’s label for a deal they actually won—used to train which signal types matter |

---

## 4. Funnel position

```text
Online return / overstock / closeout
        ↓
[ PRE-CHANNEL ]  ← discovery targets THIS
   trapped in DC / 3PL / back room
   no buyer program yet (or days–weeks before contract)
        ↓
Channel assigned (liquidator, B-Stock, ReturnPro, PFP…)
        ↓
Public auction / broker markup
        ↓
Competitors buy
```

---

## 5. Can we monitor trucks to find gems?

### 5.1 Short answer

**No** as a nationwide “which carrier is moving home-goods return loads” discovery engine. Truck position and cargo are private; cargo type is not visible from GPS.

### 5.2 Why it’s hard

- Shipper, 3PL, and carrier treat lane, customer, and cargo as confidential.
- A dry van from a known zip could be furniture, mixed GM, or unrelated freight.
- Pre-channel loads are often small, irregular, and brokered quietly—not pattern-matchable like parcel hub lanes.

### 5.3 What exists (and who can use it)

| Approach | What it shows | Useful for pre-channel gems? |
|----------|---------------|------------------------------|
| **Load boards** (DAT, Truckstop) | Posted **open** loads brokers need covered; sometimes “furniture” in notes | **Weak hint**—freight to haul, not secret inventory source; subscription + noise |
| **Shipper visibility** (project44, FourKites, MacroPoint) | ETA for **that shipper’s** freight | **No**—enterprise contracts only |
| **Carrier telematics** (Motive, Samsara) | **Their** fleet only | **No** |
| **FMCSA / SAFER** | Authority, safety, fleet size | Vet a carrier **after** a lead—not discovery |
| **Freight intel / LPR vendors** | Aggregated traffic | Expensive, privacy limits, weak on “what’s inside” |
| **Watching a known DC address** | In/out activity | **Local**, only after you already have a facility lead |
| **Import / BOL data** | Ocean containers → ports | Different supply chain; not US return-center vans |
| **Liquidation listings with FOB** | Which DC a **listed** lot ships from | **Downstream**—channel already forming |

### 5.4 What might help a little (indirect)

1. Load-board **keyword alerts** (`furniture`, `home goods`, `returns`, `GM`) near watchlist zips—late, noisy.
2. Relationships with **liquidation freight brokers**—downstream but teaches lanes/carriers.
3. **Facility-first** → on call learn pickup schedule and broker.
4. Product angle: monitor **facilities + filings + news**, not trucks; optional weak zip-level load-board correlation.

### 5.5 Bottom line (trucks)

Truck/carrier data is **enrichment after a lead**, not a hidden-gem finder. Do not build “truck radar” as core discovery.

---

## 6. What AI agents can and cannot do

| Can do well | Cannot do reliably |
|-------------|-------------------|
| Monitor **published** distress (news, WARN, early filings, jobs) | Know undisclosed warehouse SKUs or manifests |
| Run **channel detector** on entity (Hilco, B-Stock, ReturnPro, PFP…) | Replace human relationship and phone outreach |
| **Stack** weak signals (distress + custody + no liquidator in 30 days) | Invent “secret warehouse” lists (hallucination risk) |
| Diff **watchlist domains** (policy pages, warehouse sale pages) | Scrape B-Stock/Liquidation.com for “new gems” (that’s downstream) |
| Draft outreach, score legitimacy, rank by window | Guarantee truckload availability |
| Exclude **S15** channel-assigned entities from outreach list | Nationwide anonymous truck GPS by cargo type |

**Operator principle:** Signals + timing + verify + outreach—not “AI found 30 truckloads online.”

**Budget constraint (when automating):** ~$10/run → favor RSS/news + WARN + channel search + 1–2 site fetches, not deep PACER every run.

**Retention:** 90-day opportunity retention (product constraint from broader spec).

---

## 7. Agent roles (factory mapping)

| Agent | Role | Input | Output |
|-------|------|-------|--------|
| **Signal scanner** | Find weak public signals | News, PACER, WARN, jobs, SOS, trade press, local ads | Raw hits |
| **Channel detector** | Exclude late stage | Search entity + Hilco, PFP, B-Stock, ReturnPro, liquidation auction, goTRG | `channel_assigned` flag |
| **Correlator** | Stack signals | Multiple hits per entity | Composite score |
| **Legitimacy** | Filter scams / fake GOOB | Address, SOS, news patterns | Score 1–5 |
| **Fit** | Home furnishings / TL economics | Category, region | Fit score |
| **Rank** | Order outreach list | Signal strength × window × fit | Top N for human |
| **Human** | buy / maybe / not + why | Ranked list | Training labels |

Phase 0: humans run scanner + channel detector using CSV playbooks.  
Phase 1+: agents assist; **no** agent outputs warehouse names without evidence chain.

---

## 8. Signal catalog — original (S01–S15)

From [Pre-channel-opportunity-signals.csv](./customer-track-a-spreadsheet/Pre-channel-opportunity-signals.csv).

| ID | Name | What it indicates | Why pre-channel | Primary sources | Exclude if (channel assigned) |
|----|------|-------------------|-----------------|-----------------|--------------------------------|
| **S01** | Distress before liquidator named | Financial trouble, no Hilco/PFP/B-Stock/ReturnPro yet | Window before disposition contract | Local news, trade press, early dockets | PR names SB360, Hilco, Gordon Brothers, PFP, ReturnPro, B-Stock |
| **S02** | Operational shutdown before bankruptcy | Stores closed weeks before Ch7/Ch11 | Inventory may sit with no formal disposition | News, filings, employee/customer chaos stories | Trustee + auction schedule already published |
| **S03** | Returns backlog hire (retailer) | Hiring returns/disposition at **brand**, not 3PL liquidator | May be building process before vendor locked | Indeed, LinkedIn, Glassdoor | Job at ReturnPro, Inmar, goTRG, B-Stock |
| **S04** | Excess inventory press, no buyer | Earnings/trade cite warehouse costs, no liquidator | Management may take first serious TL offer | Furniture Today, biz journals | Article names Hilco or B-Stock |
| **S05** | 3PL storing unsold retail inventory | Aged/returned goods; owner not moving | 3PL may pressure for bulk takeaway | 3PL posts, brokers, LinkedIn | Already on DL, BULQ, B-Stock |
| **S06** | Regional e-comm furniture stress | Dot-com home goods, weak reverse-log maturity | Direct deal before marketplace | Site policy, SimilarWeb, state SOS | Already on major marketplace as seller only |
| **S07** | Manufacturer overstock, no retail partner | Tariff cancel, factory overrun | Factory may sell TL once | Trade, import signals, LinkedIn | Regular Via Trading / B-Stock factory seller |
| **S08** | Warehouse sublease / distress lease | DC vacating; goods may remain | Landlord/tenant need bulk takeaway | LoopNet, Crexi, brokers | Auctioneer named in listing |
| **S09** | Ch11 filed, no stalking horse yet | Recent voluntary bankruptcy | Early 363 period—counsel/trustee outreach | PACER, BankruptcyObserver | Stalking horse approved; auction calendar live |
| **S10** | Strategic store closure (not bankruptcy) | Pruning stores; DC may lag retail floor | Post-floor DC phase less public | Retail Dive, company PR | Full chain Hilco GOB already running |
| **S11** | Local GOB not PFP-run | Owner-run everything-must-go | Bulk remainder after floor picked | Facebook, local news, Craigslist | PFP/Hilco banner on storefront or ad |
| **S12** | Dot-com return rate spike in press | Return cost pain, no vendor named | Ops pain → openness if approached well | Earnings, podcasts, trade | ReturnPro, Narvar, Optoro partnership announced |
| **S13** | UCC / lender inventory collateral | Default on inventory-backed loan | Quick monetization before auction | State UCC filings | Public auction with auctioneer |
| **S14** | Customer past win pattern | Interview: replicate historical gems | Defines positive training labels | Customer meeting | N/A—internal |
| **S15** | Channel assigned (negative training) | Already on B-Stock, ReturnPro, etc. | Teach agents what to **drop** | B-Stock seller list, press | Confirmed public channel → dead lead |

**S15 is the gate:** run channel detector on every entity before outreach.

---

## 9. Proposed additional signals (S16–S25) — for AI exploration

Not yet in CSV; recommended for Phase 1 pilots.

| ID | Name | What it indicates | AI monitor approach | Priority (home goods) |
|----|------|-------------------|----------------------|------------------------|
| **S16** | Floor-plan / inventory financing stress | Furniture dealers on Triumph, WF CIT, etc.; curtailment/repossession | Trade press + lender suits + “floor plan” + furniture | **High** — industry-specific |
| **S17** | WARN Act mass layoff | 60–90 day notice at retailer/DC | dol.gov WARN data + name/NAICS filters | **High** |
| **S18** | Restructuring advisor, no liquidator | AlixPartners, FTI, Riveron retained—not Hilco GOB | News: `restructuring advisor` + furniture − liquidator names | **High** |
| **S19** | State ABC / receivership | Assignment for benefit of creditors; state receiver | State court + receiver PR (PwC-style) before auction catalog | **High** |
| **S20** | Warehouseman / storage lien suit | 3PL sues for unpaid storage | Court search: storage lien + furniture debtor | **High** (extends S05) |
| **S21** | Commercial eviction (furniture tenant) | Goods may remain in space | County eviction indexes, legal notices | **Medium** |
| **S22** | Local “warehouse sale / appointment only” ads | Back-room clearance, not national GOB firm | Craigslist, FB Marketplace, geo keywords − PFP/Hilco | **High** (extends S11 at scale) |
| **S23** | Website / ops diff | Warehouse sale page, sitewide clearance, policy change, Maps “closed” before liquidator news | Periodic fetch + diff on watchlist domains | **Medium** |
| **S24** | Public co inventory write-down | 10-Q / 8-K impairment, excess & obsolete | SEC EDGAR + earnings transcripts | **Medium** (subset of issuers) |
| **S25** | Franchisee / dealer-group collapse | Local LLC distress, not HQ channel | Local news + SOS for dealer entity | **Medium** |

### 9.1 Correlation patterns (agent “stack,” not single hits)

| Stack | Components | Inference |
|-------|------------|-------------|
| **Distress stack** | S01 or S04 + S17 + no S15 in 30 days | Real window; prioritize |
| **Custody stack** | S05 or S20 + S08 | Inventory + space pressure |
| **Shutdown stack** | S02 + Maps closed + site still taking orders | Classic trapped inventory |
| **Channel forming** | New “[Retailer] Liquidation LLC” + auction manager job | Deprioritize or race |
| **Absence** | S12 pain press + no ReturnPro/vendor in 90 days news | Pain without vendor—careful outreach |

---

## 10. Signal feasibility for automation (rough tiers)

### Tier A — good Phase 1 agent pilots (~$10/run friendly)

- Channel detector (S15) on every candidate entity  
- Google News / RSS templates from S01, S04, S11  
- WARN filings (S17)  
- Furniture Today / trade closing feeds (watchlist)  
- Early bankruptcy monitor (S09) with BankruptcyObserver-style alerts  
- Restructuring advisor without liquidator (S18)  
- Watchlist domain diffs (S23)  

### Tier B — valuable but noisier or costlier

- Job boards (S03)  
- LoopNet / lease alerts (S08)  
- Local bulk ads (S22)  
- UCC filings (S13) — state-by-state fragmentation  
- Floor-plan distress (S16) — needs trade + court glue  
- Storage lien / eviction dockets (S20, S21) — local court pain  
- SEC EDGAR (S24) — only public companies  
- BBB/review shock, Glassdoor, Reddit — high noise  

### Tier C — weak or downstream for gems

- Load-board keyword alerts (truck section)  
- Import/BOL volume (paid, import lane)  
- Generic “liquidation truckload” broker SEO  
- New B-Stock listings as “leads”  
- LLM-generated warehouse lists  
- Nationwide truck GPS by cargo type  

---

## 11. Data sources by phase

### Phase 0 — manual (now)

| Source | Signals |
|--------|---------|
| Furniture Today closings | S01, S10 |
| Local news | S01, S02, S11 |
| PACER / BankruptcyObserver | S09, S02 |
| Google Alerts | S01, S04, S11 |
| Indeed (returns manager, furniture) | S03 |
| LoopNet | S08 |
| Customer interview | **S14** — best ground truth |
| UCC (manual) | S13 |
| Pre-channel-watchlist.csv | Specific companies + monitoring URLs |

### Phase 1 — semi-automated

- RSS / news alerts from query templates  
- WARN + early filing monitors  
- Channel detector automation  
- Signal stacking + rank  
- **Do not** crawl B-Stock/Liquidation.com for discovery  

### Phase 2 — enrichment (budgeted, licensed)

- LinkedIn patterns  
- Credit/risk APIs  
- CoStar / industrial lease  
- Import data (if import lane matters)  

---

## 12. Historical examples (why signals matter)

Illustrative instances from [Pre-channel-example-leads.csv](./customer-track-a-spreadsheet/Pre-channel-example-leads.csv):

| Example | Signals | Lesson |
|---------|---------|--------|
| Gustafson’s (Rockford) | S02, S11 | Ops halted **weeks** before PFP GOB formalized—call owner/landlord in Feb–Mar |
| Circle Furniture | S02 | Stores dark ~6 weeks before Saperstein auction path |
| Value City / American Signature | S01, S10 | Nov Ch11 → Jan Hilco/SB360—window between filing and GOB operator |
| Generic 3PL pattern | S05 | Aged client goods; 3PL wants fees paid—retailer must agree |
| Ch11 <21 days template | S09 | Inventory on schedules, no 363 stalking horse yet |

**Success metric for Phase 0:** customer marks which **signal types** they would have chased—not whether we found 30 truckloads online.

---

## 13. Outreach principle

You are not buying from a marketplace listing. You are offering:

> “We buy home-goods returns and overstock truckloads directly—before you sign a liquidator or list on B-Stock.”

**Operational detail:** see [pre-channel-signal-to-deal-playbook.md](./pre-channel-signal-to-deal-playbook.md) (signal → channel gate → verify → call → close).

---

## 14. What NOT to show the customer as “discovery”

- Reverse-logistics-home-goods.csv, For-customer-review.csv (broker/B-Stock tiers)  
- Unless explicitly discussing **benchmark margins** only  

---

## 15. Repo deliverables (where files live)

| Path | Purpose |
|------|---------|
| `docs/design/pre-channel-ai-discovery-analysis.md` | **This file** — full shareable analysis |
| `docs/design/pre-channel-opportunity-discovery.md` | Shorter product spec + meeting talk track |
| `docs/design/customer-track-a-spreadsheet/Pre-channel-opportunity-signals.csv` | S01–S15 signal types |
| `docs/design/customer-track-a-spreadsheet/Pre-channel-example-leads.csv` | Example instances |
| `docs/design/customer-track-a-spreadsheet/Pre-channel-watchlist.csv` | Monitoring sources + companies to verify |
| `docs/design/customer-track-a-spreadsheet/Pre-channel-meeting-guide.md` | Facilitator questions |

---

## 16. Questions for external reviewers (GPT / Claude)

Please critique:

1. **Signal set:** Are S01–S15 + proposed S16–S25 the right coverage for US home-goods pre-channel? What’s missing or over-weighted?  
2. **AI feasibility:** Is ~$10/run realistic for Tier A? What architecture (tools, cron, human-in-loop) would you use?  
3. **Channel detector:** Best approach to auto-exclude Hilco, PFP, B-Stock, ReturnPro, goTRG false negatives/positives?  
4. **False positives:** Which signals generate the most junk (local GOOB scams, SEO liquidation sites)?  
5. **Legal / ToS:** Any scrape sources to avoid in Phase 1?  
6. **Ranking:** How would you score `window_days × signal_strength × fit − channel_assigned`?  
7. **Trucks:** Agree that truck monitoring should stay out of core discovery? Any exception?  
8. **Customer validation:** What 5 questions should we ask Joe in the meeting to calibrate agents?  

---

## 17. Revision history

| Date | Change |
|------|--------|
| 2026-05-29 | Consolidated analysis for external review (signals, trucks, agents, S16–S25) |
