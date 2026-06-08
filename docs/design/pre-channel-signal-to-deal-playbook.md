# Pre-channel: from signal to deal

| Field | Value |
|-------|--------|
| **Parent** | [pre-channel-ai-discovery-analysis.md](./pre-channel-ai-discovery-analysis.md) |
| **Audience** | Joe (buyer), Band It operators, future discovery agents |
| **Core idea** | A **signal** is a clue. A **deal** requires proof of custody, timing, and a yes from someone who can sell. |

---

## 1. What a “deal” means here

| Stage | You have… | You do **not** have yet |
|-------|-----------|-------------------------|
| **Signal** | News, filing, job post, lease listing | Inventory, price, or legal seller |
| **Lead** | Named entity + signal + channel detector **pass** | Confirmed truckload or manifest |
| **Qualified opportunity** | Verified: goods exist, owner/seller identified, window open | Signed terms / pickup |
| **Deal** | Purchase agreement, payment, pickup scheduled | — |

**Band It / AI stops at “qualified opportunity” ranked for human call.** Joe (or his buyer) closes the deal on the phone and at the dock.

---

## 2. End-to-end pipeline (one page)

```text
MONITOR          →  TRIAGE           →  VERIFY           →  OUTREACH         →  CLOSE
(signals)           (channel gate)      (human 30–90 min)    (phone/email)        (terms + pickup)

Sources:            Drop if S15:        Confirm:            Who to call:         FOB price,
news, WARN,         Hilco, PFP,         • Entity real       map by signal        manifest,
jobs, PACER,        B-Stock,            • Channel open      (§4)                 inspection,
watchlist           ReturnPro…          • Custody           Script (§5)          wire/ACH,
                                        • Location          Log in Band It       freight book
                                        • Urgency
```

**Throughput rule:** Most signals die at **channel gate** or **verify**. That is success—not noise in Joe’s inbox.

---

## 3. Step 0 — Channel gate (do this first, every time)

Before any outreach, run **channel detector** on the **legal entity** that holds inventory (not just the brand name).

| Search (entity name + each) | If found → status |
|-----------------------------|-------------------|
| Hilco, Gordon Brothers, SB360, Gordon Brothers | Likely **channel assigned** — deprioritize |
| Planned Furniture Promotions, PFP | Store GOOB path — usually **late** for pre-channel TL |
| B-Stock, Liquidation.com, Direct Liquidation | **Downstream** — benchmark only |
| ReturnPro, goTRG, Inmar, Liquidity Services | **Processor engaged** — deprioritize |
| Named auctioneer + BidSpotter catalog live | **Late** |
| “Retained restructuring advisor” only | **Still open** — good (S18) |
| Nothing above in last 30 days of news | **Open** — proceed to verify |

**Agent output:** `channel_status: open | forming | assigned` + evidence URLs.

---

## 4. Step 1 — Verify (signal → qualified opportunity)

Use the **verification_steps** column in [Pre-channel-opportunity-signals.csv](./customer-track-a-spreadsheet/Pre-channel-opportunity-signals.csv). Universal checklist:

| # | Question | How to answer | Pass |
|---|----------|---------------|------|
| 1 | Is the company real and tied to this signal? | SOS lookup, website, phone, news | Active or winding down—not SEO scam |
| 2 | Is there **physical** inventory likely? | Closing stores, DC in articles, Ch11 schedules list inventory, lease mentions goods | Yes / unknown—site visit if local |
| 3 | Who **owns** the goods? | Retailer, manufacturer, trustee, landlord, 3PL client | Identified role |
| 4 | Is the window still open? | Compare dates: filing vs liquidator PR vs auction date | Days–weeks, not months post-auction |
| 5 | Can Joe **economically** haul it? | Region, TL vs partial, category fit | Fit score ≥ threshold |

**Time box:** 30–90 minutes per lead. If you cannot get past row 3, **park** (watch docket/news) or **drop**.

### Signal-specific “who holds the goods?”

| Signal family | Likely custodian | First verify action |
|---------------|------------------|---------------------|
| S01, S02, S10, S11 | Retailer / owner | Call store or HQ; ask warehouse vs floor only |
| S05, S20 | 3PL (client = retailer) | Call 3PL ops; confirm client and whether client authorized bulk sale |
| S07, S16 | Manufacturer / dealer | Call ops or receiver; ask overrun / floor-plan status |
| S08, S21 | Tenant or landlord | Call listing broker; “Is inventory included?” |
| S09, S19 | Debtor estate / receiver / trustee | Email counsel or receiver; reference TL buyer letter |
| S17 | HR/ops at entity | WARN ≠ inventory alone—pair with S01/S02/S09 |

---

## 5. Step 2 — Who to call (by situation)

| Situation | Call / email (in order) | Avoid |
|-----------|-------------------------|--------|
| Independent store / local GOB (S11) | Owner → store manager | Middleman “liquidation companies” in Craigslist ad |
| Multi-store regional (S01, S10) | CFO/COO or “inventory” contact → general counsel | Public GOB line until you know PFP isn’t exclusive |
| Ch11 / receiver (S09, S19) | Debtor counsel → trustee/receiver | Random employees |
| 3PL pressure (S05, S20) | 3PL warehouse manager → **retailer** asset owner | Buying without owner consent |
| Lease / eviction (S08, S21) | Broker → tenant → landlord | Assuming goods are included without written OK |
| Manufacturer overrun (S07) | Plant ops / sales → receiver if in ABC | Brokers posing as factory |

**Gatekeeper script (10 seconds):**  
> “We’re a certified truckload buyer for home furnishings returns and overstock—not a liquidator. We can move inventory direct from your warehouse with one PO and quick pickup. Who handles bulk disposition?”

---

## 6. Step 3 — Outreach (what actually unlocks inventory)

Signals do not create inventory—they create **permission to ask**. Effective offers address **their** pain:

| Their pain (from signal) | Your offer |
|--------------------------|------------|
| Space / lease deadline (S08, S21) | “We’ll clear N trailers by [date]; you keep racking if needed.” |
| Carrying cost / write-down (S04, S24) | “One TL this week at $X—all-in pickup—stops the bleeding on [category].” |
| No reverse-logistics vendor (S03, S06, S12) | “Pilot one truckload graded to your spec; no marketplace listing required.” |
| Bankruptcy clock (S09) | “TL offer to estate before 363; certified funds; quick close.” |
| Owner tired after floor sale (S11) | “We buy backroom/warehouse remainder by the trailer—after your retail ends.” |
| 3PL storage fees (S05) | “We buy from [retailer] with their sign-off; you get space back.” |

**Do not lead with:** “We saw you’re in trouble.” Lead with: **speed, certainty, one buyer, no auction fees.**

### Minimum info to get on first call

1. Approx **piece count / pallets / trailers**  
2. **Location** (city + dock type)  
3. **Condition mix** (returns vs new overstock vs floor)  
4. **Manifest** (yes/no/sample)  
5. **Timeline** (when must it move)  
6. **Who signs** the bill of sale  

If they won’t answer 1–3, you have a **signal**, not an opportunity.

---

## 7. Step 4 — Structure the deal (economics)

| Term | Pre-channel norm | Notes |
|------|------------------|-------|
| **Pricing** | $/truck all-in or $/unit on manifest sample | Joe sets max from resale math (use B-Stock comps **after** ask) |
| **FOB** | Pickup at their DC / store backroom | Buyer books freight unless they deliver |
| **Inspection** | Sample photos or 30-min dock walk | Required for unmanifested |
| **Payment** | Wire after BOL or escrow for unknown counterparties | No crypto; verify SOS + ID for new parties |
| **Volume** | Start **one TL** pilot | Proves seriousness; reduces their risk |
| **Exclusivity** | Rare at first | They may still hire Hilco later—you want **first** TL |

**Deal killers (walk away):**  
- Seller cannot prove title  
- Only “broker fee” upfront  
- Inventory already committed to auction catalog  
- Category mismatch (mattress-only when Joe needs case goods)  
- Pickup window already passed  

---

## 8. Timing: when signals are actionable

| Signal | Typical window | Act |
|--------|----------------|-----|
| S02 shutdown → bankruptcy | 2–8 weeks | **Days matter** |
| S01 closing announced, no liquidator | 1–4 weeks | Before PFP/Hilco PR |
| S09 Ch11 filed | 1–30 days post-petition | Before stalking horse |
| S11 local GOB | Last 2 weeks of sale + 2 weeks after | Backroom phase |
| S08 lease listing | 30–90 days | When “must vacate” appears |
| S10 strategic closure | After store signs down, DC unclear | 4–12 weeks post-announcement |
| S15 channel assigned | — | **Do not chase** (train detector only) |

**Band It alert SLA (product target):** surface **open channel** leads within 24–72h of signal detection; human calls same day for Tier A stacks.

---

## 9. How AI uses signals (without pretending to “find truckloads”)

| Agent step | Input | Output |
|------------|-------|--------|
| Scan | Watchlist + query templates | Raw hits tagged S## |
| Channel detect | Entity name | open / assigned + URLs |
| Stack | Multiple S## on one entity | Priority score |
| Rank | Window × stack × fit | Top 5–10 for **human verify** |
| Draft | Qualified lead | Call script + who to contact |
| Human | Phone | Qualified / dead / deal |
| Learn | Joe labels | Tune which S## to chase |

**Weekly human ritual (Phase 0):**  
1. Run watchlist monitors (15 min)  
2. Channel-gate new names (15 min)  
3. Verify top 3 leads (2 hr)  
4. Call top 1–2 (30 min)  
5. Log outcome in example-leads sheet (training data)  

---

## 10. Worked example (signal → deal path)

**Signal:** Furniture Today reports regional chain “optimizing” 8 stores; no Hilco in article (S10 + S01).

| Step | Action | Result |
|------|--------|--------|
| Channel gate | Search chain + Hilco, B-Stock, ReturnPro | Open |
| Verify | PR + LinkedIn; DC city in Q3 call transcript | Inventory likely at regional DC |
| Outreach | Email ops: “TL buyer before you engage national liquidator” | Routed to VP Supply Chain |
| Qualify | 2 trailers, mixed returns, manifest partial, Indianapolis | Opportunity |
| Close | $X/trailer, inspect 50 units, wire, book DAT | **Deal** |

If Hilco named in week-2 PR → same entity becomes **S15** → stop.

---

## 11. Success metrics (realistic)

| Metric | Phase 0 target |
|--------|----------------|
| Signals processed / week | 20–50 (automated or manual) |
| Pass channel gate | ~10–20% |
| Verified opportunities | 2–5 / week |
| First calls | 1–3 / week |
| Pilots / deals | **Customer-dependent** — 1 TL/month is a strong outcome early |

**Wrong metric:** “AI listed 30 warehouses.”  
**Right metric:** “We called 2 qualified parties this week that weren’t on B-Stock yet.”

---

## 12. How you fund inventory under pressure

Signals get you to the table. **Funding is why they say yes**—distressed operators want **certainty and speed**, not another broker who “might find a buyer.”

### 12.1 Who writes the check

| Model | Who funds | Band It role |
|-------|-----------|--------------|
| **Buyer-funded (default)** | Joe / his LLC wires for goods + books freight | Discovery + deal memo; no balance-sheet risk |
| **JV per deal** | Joe + capital partner split $ and margin | Introduce lead; partner funds if Joe lacks dry powder |
| **Platform-assisted (future)** | Licensed lender / factor on approved deals | Pre-qualify lead economics; handoff to finance partner |

Band It does **not** need to own inventory to be valuable. It needs to surface deals Joe can **fund within the window**.

### 12.2 What sellers under pressure actually want

| Seller need | Funding response |
|-------------|------------------|
| **Fast close** | Wire within 24–48h of signed PO + inspect (or escrow release) |
| **No auction risk** | All-cash TL offer vs 363 stalking horse |
| **Space by date** | Fund pickup + freight before lease end |
| **Court credibility** | Proof of funds letter + ability to perform (Ch11/363) |
| **Low hassle** | One buyer, one PO, one trailer pilot—not 40 pallet buyers |

Your outreach should sound like: **“We have funds ready for one truckload this week”**—only if true.

### 12.3 Capital stack (typical wholesale resale buyer)

Use in order of fit for **time-sensitive** pre-channel:

1. **Cash / retained earnings** — Best for first pilot with new counterparty; fastest close.
2. **Revolving LOC (bank)** — Draw for inventory + repay as goods sell; needs 6–12 mo operating history.
3. **Asset-based line (inventory lender)** — Advances against **your** warehouse inventory; sometimes new purchases if lender approves SKU class.
4. **PO / trade finance** — Only if Joe has **firm resale PO** before buying (rare on gems, common if he supplies a chain).
5. **Factoring** — Funds **after** you invoice a creditworthy retailer (helps **second** truck, not first).
6. **Deal JV** — Angel / experienced liquidator puts up $ for split margin on one TL.
7. **Escrow (first deal)** — Split risk with unknown seller: deposit at inspect, balance at pickup.

**Usually wrong for pre-channel windows:** SBA 7(a) (slow), merchant cash advance (expensive), crypto/wire-only scams.

### 12.4 Rough economics (plan capital per truck)

From broker benchmarks in Track A comps (not offers):

| Line item | Typical band (home goods TL) |
|-----------|------------------------------|
| Purchase price | ~$4k–$20k+ per truck (unmanifested low, manifested premium high) |
| Inbound freight | ~$800–$2.5k+ depending on lane |
| Inspect / labor / shrink | Budget 5–15% of purchase |
| **Cash to dock (one TL)** | Often **$6k–$25k** all-in before resale |
| Working capital to sell through | 30–90 days inventory → need **2–3×** one-truck cash if stacking deals |

**Rule:** Do not commit truck #2 until truck #1 is **sold or financed against**.

### 12.5 Payment structures that work

| Structure | When | Risk |
|-----------|------|------|
| **100% wire on pickup** | Owner/3PL you trust after inspect | Seller may want proof first → escrow |
| **Deposit + balance at load** | New counterparty | 10–30% deposit after manifest sample |
| **Escrow (attorney / Escrow.com)** | Ch11, receiver, unknown LLC | Fees + delay; worth it once |
| **Court-approved 363 bid** | Bankruptcy | Deposit % + show ability to perform; counsel required |
| **Net terms from seller** | Rare pre-channel | Only if they’re solvent and desperate for space not cash |

Pre-channel **advantage:** sometimes **10–20% below** B-Stock ask because no auction fee layer—but seller still wants **cash**, not “we’ll pay when we sell.”

### 12.6 Funding by signal type

| Signal | Who you pay | Funding note |
|--------|-------------|--------------|
| S11 local owner | Owner / LLC | Cash pilot; often no escrow needed after store visit |
| S09 / S19 bankruptcy | Estate / receiver | **Proof of funds** + court process; budget legal hour |
| S05 3PL | **Retailer** (owner of goods) | 3PL is not seller; get written authorization |
| S08 / S21 lease | Tenant or landlord | Confirm **title** in purchase agreement |
| S07 factory overrun | Manufacturer / receiver | Often cleaner invoice; may want faster close for space |

### 12.7 Proof-of-funds (when required)

Keep ready (PDF, dated within 30 days):

- Redacted bank statement or LOC availability letter  
- Short **buyer profile** (EIN, resale cert, references, dock addresses)  
- One-pager: “We buy 1–N truckloads home furnishings; close in X days”

Ch11 counsel will not take you seriously without this.

### 12.8 Band It / agent support (no lending required)

| Output | Use |
|--------|-----|
| **Capital required** on lead card | Purchase + freight + buffer from ask or comp |
| **Days to sell-through** (Joe label) | Whether factoring/LOC needed |
| **channel_status** | Assigned = don’t deploy capital |
| **Deal memo** | Max bid, margin at 30/50/70% recovery, walk-away price |

### 12.9 Questions for Joe (funding calibration)

1. Dry powder available for **one** pilot TL this month?  
2. Max wire without partner approval?  
3. LOC / inventory line in place today?  
4. Will you use escrow on first contact with estate counsel?  
5. Average days inventory sits before sold?  
6. Do you ever buy on **consignment** or only cash-on-pickup?

---

## 13. Questions for Joe (calibrate playbook)

1. Max geography / freight radius for a pilot TL?  
2. Minimum and maximum $ per truck you’ll wire on first deal with unknown party?  
3. Categories you’ll refuse (mattress-only, outdoor, raw wood)?  
4. Will you inspect every unmanifested load?  
5. Who in your network can **intro** to 3PLs (S05)?  
6. Past gems: who did you call **first**—owner, counsel, or 3PL?  

Record answers as **S14** training rows.

---

## Revision history

| Date | Change |
|------|--------|
| 2026-05-29 | Initial signal-to-deal playbook |
| 2026-05-29 | §12 funding inventory under pressure |
