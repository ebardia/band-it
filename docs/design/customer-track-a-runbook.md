# Track A runbook — pre-product customer review

| Field | Value |
|-------|--------|
| **Status** | Active |
| **Parent design** | [Agent Factory & Opportunity Discovery](./agent-factory-opportunity-discovery.md) |
| **Goal** | Hand the **customer** a real opportunity list + source map **before** Band It product build |
| **First instance** | Resale / liquidation domain pack, `home_furnishings` category (among others) |

---

## What you are delivering

The customer should receive:

1. **Source map** — where Band It looked; what is upstream vs benchmark-only.
2. **~20–30 real opportunities** — live links, best-effort economics, legitimacy notes.
3. **A simple ask** — mark each row **buy / maybe / not**; optional **why** (especially on “not”).

**Not required:** Band It UI, cron jobs, judgment model, or customer login.

---

## Success checklist (before scheduling the meeting)

- [ ] 15+ sources documented (upstream vs benchmark clear)
- [ ] 20–30 real URLs (you opened each link yourself)
- [ ] Every row has a legitimacy note (include 2–3 “going out of business” examples if found)
- [ ] Benchmark column treats Liquidation.com / B-Stock as **resale ceiling**, not buy sources
- [ ] `customer_verdict` and `customer_why` columns empty and ready
- [ ] You can explain group-in-the-loop in under 2 minutes

---

## Workbook structure

**Ready-made CSVs (2026-05-29 research pass):** [customer-track-a-spreadsheet/](./customer-track-a-spreadsheet/)

Use one spreadsheet (Google Sheets or Excel) with two tabs.

### Tab 1: `Sources`

| Column | Description |
|--------|-------------|
| `source_name` | Marketplace, broker, auction site, etc. |
| `url` | Homepage or listings index |
| `role` | `upstream` or `benchmark_only` |
| `access_today` | `public` / `login_required` / `manual_only` |
| `tos_risk` | `low` / `medium` / `do_not_scrape` |
| `notes` | How customer would actually buy; legal/access caveats |

**Targets:** 15–25 rows researched.

**Benchmark-only (always):**

- Liquidation.com
- B-Stock

These inform **estimated resale**, not where the customer should source inventory.

---

### Tab 2: `For customer review`

| Column | Description |
|--------|-------------|
| `rank` | Your pre-meeting sort (1 = best) |
| `title` | Short description of the lot/opportunity |
| `url` | Direct link to listing or sale page |
| `source_name` | From Sources tab |
| `category` | e.g. `home_furnishings`, `general_merchandise` |
| `asking_price` | If visible; else `unknown` |
| `est_resale_or_benchmark` | Comparable channel + rough note |
| `est_margin_pct` | Best-effort; note assumptions |
| `legitimacy_score` | 1–5 (5 = high trust) |
| `legitimacy_note` | One line; scam/GOOB flags here |
| `why_surfaced` | Why it made the shortlist |
| `customer_verdict` | **Customer fills:** `buy` / `maybe` / `not` |
| `customer_why` | **Customer fills:** especially for `not` |

**Targets:** 40–60 raw leads discovered → **20–30** rows on this tab.

---

## Step 1 — Source catalog (≈ half day)

1. Start from the upstream list in the [design doc](./agent-factory-opportunity-discovery.md#sources-and-legal-access) (BULQ, Direct Liquidation, 888 Lots, Quicklotz, ViaTrading, Genco, AML, etc.).
2. Add **regional liquidators** and **business closing / inventory** sellers found via search.
3. For each source, record `role` and `tos_risk`. When in doubt, `do_not_scrape` + `manual_only`.
4. Do **not** promise live API ingest in the meeting—this tab shows **coverage research**.

---

## Step 2 — Discovery sprint (1–2 days)

### Rules

- **Real only** — no fabricated URLs or placeholder listings.
- **Lawful only** — no login bypass, no aggressive scraping of `do_not_scrape` sites.
- Prefer: pages you can view in a normal browser, press releases, public auction catalogs, Craiglist-style posts (verify still live), company “everything must go” pages.

### Search query templates

Rotate and log what worked in a `Query log` section (notes column or separate tab):

```text
home furnishings liquidation pallet wholesale
furniture liquidation lot manifest
business closing inventory home goods pallet
store closing furniture wholesale lot [state or region]
overstock home furnishings truckload
salvage furniture pallet buyer
```

For legitimacy training, explicitly search:

```text
going out of business furniture inventory
store closing everything must go wholesale
```

### Raw lead log

While browsing, capture **40–60** rows in a scratch tab (`Raw`) with at minimum: `url`, `source_name`, `title`, `date_found`.

### Narrowing to 20–30

Drop or demote rows that fail any of:

| Filter | Drop if |
|--------|---------|
| **Live** | Link dead or sale ended |
| **Category** | Clearly not home furnishings / general merchandise relevant to customer |
| **Legitimacy** | Strong scam signals (see rubric below) |
| **Economics** | No price and no way to estimate; pure noise |
| **Access** | Cannot verify anything without opaque wire transfer / crypto |

Sort survivors by: `legitimacy_score` × rough margin × category fit.

### Optional AI assist (≤ ~$10 total)

On the **shortlist only** (not 500 rows):

- Draft `legitimacy_note` and `why_surfaced` from listing text you paste.
- Use cheap/fast models; cap spend.

---

## Legitimacy rubric (1–5)

| Score | Meaning |
|-------|---------|
| **5** | Known platform or verifiable business; clear terms; manifest or detailed inventory |
| **4** | Plausible seller; minor gaps |
| **3** | Uncertain — needs customer judgment |
| **2** | Red flags (vague manifest, pressure tactics, odd payment) |
| **1** | Likely scam or misrepresentation |

### “Going out of business” checklist

Flag in `legitimacy_note` if:

- [ ] Business name and address verifiable (maps, secretary of state, news)
- [ ] Story consistent (one location vs fake “national” closing)
- [ ] Inventory specific (not stock photos only)
- [ ] Payment terms normal for wholesale (not gift cards / wire-only pressure)
- [ ] Matches pattern of **performative** GOOB (pop-up “closing” sales that never end)

Customer’s **not** + **why** on these rows is high-value training data later.

---

## Benchmark / margin (best-effort)

1. Find a **comparable** on Liquidation.com or B-Stock (benchmark_only sources): category, condition, lot size.
2. Record `est_resale_or_benchmark` as a range or single estimate + link if possible.
3. `est_margin_pct` ≈ `(est_resale − asking − shipping − fees) / asking` — state assumptions in `why_surfaced` if guesswork.

If asking price unknown, still include row if legitimacy + strategic value (e.g. teachable scam example) — mark economics `unknown`.

---

## Step 3 — Meeting prep (≈ 1 hour)

### Talk track (2 minutes)

> We’re not claiming we found cheaper lots than you could. We ran discovery and filtering across upstream channels. Here are ~20 worth your time. Mark buy, maybe, or not — especially why not — so the system learns how you think. Next step is your band on Band It running this daily.

### Meeting flow (60–90 min)

1. **Sources tab** (5 min) — upstream vs benchmark.
2. **For customer review** (35–45 min) — row by row or batch; customer fills `customer_verdict` / `customer_why`.
3. **Deep dive** (15 min) — 3–5 `not` rows; GOOB/scam discussion.
4. **Close** (5 min) — “Would a weekly top-20 save you a day?” and permission to create band + import labels.

### Do not promise in the meeting

- Daily automated scraping of all marketplaces
- Better prices than the customer finds alone
- Fully trained “customer model” (that is Phase 3 after labels exist)

---

## After the meeting

| If | Then |
|----|------|
| Customer engaged | Create customer’s **band**, import labels into `OpportunityLabel` when Phase 1 ships |
| Lukewarm | Refine source list; second manual pass |
| No fit | Archive workbook; still valid factory pattern proof for other industries |

See [design doc phases](./agent-factory-opportunity-discovery.md#phases) for product build order.

---

## Revision history

| Date | Change |
|------|--------|
| 2026-05-29 | Initial runbook (customer-generic) |
