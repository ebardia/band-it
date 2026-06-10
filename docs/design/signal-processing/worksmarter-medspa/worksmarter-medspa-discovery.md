# Work Smarter Digital — med spa demo (Band It)

| Field | Value |
|-------|--------|
| **Customer** | [Work Smarter Digital](https://worksmarterdigital.com) |
| **Product context** | White-label **HighLevel** CRM, funnels, SMS/email automation for local businesses |
| **Demo vertical** | **Medical spas** — DC metro (DC, MD, VA) |
| **Band It demo name** | **Work Smarter Digital** (customer-facing; not HighLevel-branded in UI copy) |
| **Status** | Draft — hypothesis tests in progress (Layer A + Layer B dry runs) |
| **Parent** | [signal-processing/](../README.md) |
| **Signals** | [med-spa-opportunity-signals.csv](./med-spa-opportunity-signals.csv), [affluent-consumer-signals.csv](./affluent-consumer-signals.csv) |
| **Hypothesis artifacts** | [campaign-brief-potomac-skin-care.md](./campaign-brief-potomac-skin-care.md), [campaign-leads-potomac-skin-care-research.csv](./campaign-leads-potomac-skin-care-research.csv) |
| **Reference playbook** | [pre-channel-opportunity-discovery.md](../../pre-channel-opportunity-discovery.md) |
| **Product pivot** | [Adopt A Cat Bot](../../adopt-a-cat-bot.md) — product spec; [Platform](../../adopt-a-cat-bot-platform.md) — Big Band → Band → Cat, repo strategy |

---

## 1. Problem

Work Smarter Digital sells **CRM and marketing systems** to local businesses via white-label **HighLevel**. They focus on **medical spas** in the **DC metro** region — businesses that serve **affluent consumers** in places like Potomac, Great Falls, McLean, Chevy Chase, and NW Washington.

Band It will demo **two agents** on a single band workflow:

1. **Opportunity detection** — Which med spas should Work Smarter pitch **now**?  
2. **Marketing** — For each **approved** spa, what campaign targets affluent clients in that spa’s trade area?

**Do not conflate the two:** Layer A finds **spa buyers**; Layer B defines **end-client audiences** for campaigns Work Smarter runs on the spa’s behalf.

---

## 2. Two signal layers

| Layer | ID prefix | Question | Output |
|-------|-----------|----------|--------|
| **A — Med spa opportunity (B2B)** | F*, M*, X* | Should Work Smarter **call this spa**? | Ranked spa list + Work Smarter Opportunity Score |
| **B — Affluent consumer (B2C)** | C* | **Who** should the spa’s campaign target? | Zip segments, lifestyle tags, creative angles |

Layer A is implemented in [med-spa-opportunity-signals.csv](./med-spa-opportunity-signals.csv).  
Layer B is implemented in [affluent-consumer-signals.csv](./affluent-consumer-signals.csv) + [affluent-dmv-zips.csv](./affluent-dmv-zips.csv).

---

## 3. Core approach

Same playbook as reverse logistics and [Band It outbound](../band-it-outbound-discovery.md):

```text
Universe (med spas) → Fit filters → Hunt signals → Exclude → Verify → Rank
    → Human label (buy / maybe / not)
        → Marketing agent (Layer B) → Human approve campaign
            → Sink (HighLevel export)
```

**Do not start with:** “Find med spas that want a CRM.”

**Start with:** “Find med spas showing **change, digital pain, reputation gaps, or affluent-market mismatch**.”

---

## 4. Target universe (med spas)

### 4.1 Fit filters (v1)

| ID | Rule |
|----|------|
| **F01** | DMV metro footprint — DC, MD, VA service area |
| **F02** | Independent or small group (1–5 locations), not national chain HQ |
| **F03** | Work Smarter ICP — owner-operated / small team; agency-sized buyer |

### 4.2 Universe sources

| Phase | Source |
|-------|--------|
| **Demo v0** | [sample-med-spas-dmv.csv](./sample-med-spas-dmv.csv) — replace placeholders with real spas from Google Maps |
| **v1** | Google Places API: `medical spa`, `med spa`, `aesthetic clinic` by affluent zip |
| **v2** | VA/MD licensing boards; periodic refresh |

### 4.3 Seed file columns

`spa_name`, `website`, `city`, `state`, `zip`, `employee_count_estimate`, `google_review_count`, `instagram_handle`, `job_postings_text`, `leadership_notes`, `services_notes`, `source_notes`

### 4.4 Gold-path spa (manual verify — Layer A)

**Primary hypothesis test target:** **Potomac Skin Care** — Dr. Jovy Eusebio  
10000 Falls Rd Ste 100, Potomac, MD 20854 · (301) 765-0990 · [thepotomacskincare.com](https://www.thepotomacskincare.com/)

| Signal | Public evidence |
|--------|-----------------|
| **F01–F03** | Independent physician-led practice since 1998; single location |
| **M14** | Premium Potomac zip; Google Sites web presence vs in-office quality |
| **M06 / M07** | Call-to-book / basic consult request — weak self-serve funnel |
| **M15** | “Feel like a VIP on every visit” — no visible email/SMS nurture |
| **Exclude** | Not national chain (X02); verify not agency-managed (X01) before pitch |

**Deprioritize as first call:** SEV Chevy Chase (43+ locations), hospital-affiliated HQs, spas with footer agency of record.

**30-minute verify checklist before Work Smarter calls:** decision-maker · X01 footer scan · GMB vs Moksha/Aluna (M10) · review themes (M11) · hospital affiliation (X03).

Seed row “Chevy Chase Elite Med Spa” in [sample-med-spas-dmv.csv](./sample-med-spas-dmv.csv) remains a **synthetic** demo row; **Potomac Skin Care** is the **live** gold path for hypothesis tests.

---

## 5. Layer A — Med spa opportunity signals

Full registry: [med-spa-opportunity-signals.csv](./med-spa-opportunity-signals.csv).

### 5.1 Hunt signals (M01–M15) — one line each

| ID | Signal | Description |
|----|--------|-------------|
| M01 | New location or second site | Opening or “coming soon” second location. |
| M02 | New service line | New modality added with weak promotion vs competitors. |
| M03 | Hiring patient coordinator | Front desk / patient coordinator / office manager hire. |
| M04 | Hiring marketing role | Spa-level marketing or social hire — direct CRM need. |
| M05 | Ownership or rebrand | Rebrand, new medical director, under new management. |
| M06 | No online booking | Phone-only or contact form; friction vs competitors. |
| M07 | Stale website or social | Site or social inactive 90+ days. |
| M08 | Fragmented marketing stack | Calendly + Mailchimp + spreadsheets; no unified CRM. |
| M09 | Weak Google Business Profile | Thin GMB: photos, services, Q&A missing. |
| M10 | Review velocity gap | Competitors gaining reviews faster. |
| M11 | Review theme: ops pain | Wait times, scheduling, follow-up complaints in reviews. |
| M12 | Heavy discounting | Groupon / deal-site dependency. |
| M13 | New competitor nearby | Another med spa opened ~5 miles. |
| M14 | Premium zip, budget digital | Serves affluent zips but digital presence looks discount. |
| M15 | VIP positioning, no nurture | Membership/VIP copy but no visible email/SMS nurture. |

### 5.2 Exclude signals (X01–X03)

| ID | Signal | Description |
|----|--------|-------------|
| X01 | Already agency managed | Site credits Work Smarter or AOR agency — do not pitch (unless displacement story). |
| X02 | Enterprise chain HQ | National chain with centralized marketing. |
| X03 | Hospital-affiliated cosmetic | Hospital-owned clinic — long cycle; out of demo ICP unless chosen. |

### 5.3 Work Smarter Opportunity Score (v1)

```
1. Must pass F01 + F02 + F03
2. +10 per hunt signal (M01–M15), cap raw at 100
3. +15 if ≥2 hunt signals in different categories
4. Score 0 if any exclude (X01–X03)
5. Sort descending → top N for Opportunity Desk → human label
```

Categories: `growth`, `operations`, `digital_pain`, `reputation`, `market`, `affluence_mismatch`.

---

## 6. Layer B — Affluent consumer signals (marketing agent)

Full registry: [affluent-consumer-signals.csv](./affluent-consumer-signals.csv).

Marketing agent uses **spa location + drive-time** intersected with [affluent-dmv-zips.csv](./affluent-dmv-zips.csv).

### 6.1 Geography (primary)

Affluent feeder areas for DC metro med spas include:

- **Maryland:** Potomac, Bethesda, Chevy Chase, Great Falls MD (Poolesville/Brookeville corridor)  
- **Virginia:** Great Falls, McLean, Vienna (select), Arlington (north), Reston, Aldie/Stone Ridge  
- **DC:** Georgetown, Spring Valley, Wesley Heights, Kent, Foxhall, Palisades  

Zip table includes `segment_tags` for agent consumption: `country_club`, `gala`, `executive`, `equestrian`, `luxury_travel`, etc.

### 6.2 Lifestyle signals (campaign angles)

| ID | Signal | Campaign use |
|----|--------|--------------|
| C02 | Country club / golf proximity | Pre-event consult; membership continuity |
| C03 | Luxury travel affinity | Before cruise / reunion / gala season |
| C04 | Charity gala / arts patron | Event-ready treatments; subtle luxury tone |
| C05 | Luxury retail / auto adjacency | Geo-target near high-end corridors |
| C06 | Wellness adjacency | Cross-promo with premium gym / Pilates / functional medicine |
| C07 | Executive / professional density | Weekday consult offers (NW DC, Tysons, Rosslyn) |
| C08 | Life-stage / seasonal | Wedding, reunion, holidays — cadence not discovery |
| C09 | Med spa’s own Layer A signals | Personalize campaign to spa’s pain (e.g. fix scheduling → “private consult, no wait”) |
| C10 | Compliance-safe messaging | No medical claims; consult required — **calibrate** all copy |

### 6.3 Campaign segments (v0 — Potomac Skin Care dry run)

Validated in [campaign-brief-potomac-skin-care.md](./campaign-brief-potomac-skin-care.md). Three segments × ~12-mile radius from 20854:

| Segment tag | Zips (examples) | Consumer signals | Offer angle |
|-------------|-----------------|------------------|-------------|
| `PSC_Potomac_Core_VIP` | 20854, 20818, 20817 | C01, C08, C09 | VIP re-engagement; Cherry financing; physician trust since 1998 |
| `PSC_GreatFalls_PreSeason` | 22066, 20815, 20814, 20833 | C02, C04, C08 | Pre-season / pre-gala consult — event-ready skin |
| `PSC_Executive_WeekdayConsult` | 20007, 20016, 20008, 22101 | C06, C07, C09 | Weekday consult blocks; discreet; minimal phone tag |

**Layer A → Layer B bridge (C09):** M14 premium zip / budget digital · M15 VIP without nurture · M06 booking friction → campaign theme *trusted in-office experience; digital front door should match*.

### 6.4 Planned consumer signals (Phase 2 backlog)

| ID | Signal | Sources | Status |
|----|--------|---------|--------|
| **C11** | Woman-owned business owner | MD MBE/WBE, VA SWaM, DC DSLBD, NAWBO, Maps, local press | Discussed — not researched yet |
| **C12** | New business opening (woman-led) | Local news, MD Business Express, ribbon-cuttings | Backlog |
| **C13** | Zip net in-migration (affluent) | Census ACS, IRS county migration, market reports | Backlog — see [§6.5](#65-migration--new-mover-signals) |
| **C14** | Recent home purchase in trade area | County deed / SDAT records | Backlog — see [§6.5](#65-migration--new-mover-signals) |
| **C15** | New mover household | USPS NCOA (licensed), spa CRM, broker new-mover products | Backlog — see [§6.5](#65-migration--new-mover-signals) |
| **C16** | Recent political donation (public) | FEC.gov, MD/VA/DC campaign finance | Backlog — see [§6.6](#66-donation--philanthropy-signals) |
| **C17** | Named charity sponsor tier | Gala programs, foundation honor rolls, annual reports | Backlog — see [§6.6](#66-donation--philanthropy-signals) |

Full registry: [affluent-consumer-signals.csv](./affluent-consumer-signals.csv). See [§16 Lead discovery channels](#16-lead-discovery-channels).

### 6.5 Migration & new mover signals

**Question:** Has the trade area **gained or lost** residents — and can we identify **new households** near the spa?

| ID | Level | What it indicates | Primary sources | Campaign use | Contact / legal notes |
|----|-------|-------------------|-----------------|--------------|------------------------|
| **C13** | **Zip aggregate** | Zip is net **in-migration** or growing affluent population — invest more in segment | [Census ACS](https://data.census.gov); IRS county-to-county migration; local market reports | Boost geo ad spend on inflow zips; deprioritize declining zips | No PII — segment prioritization only |
| **C14** | **Address / person** | **New property owner** in trade area (deed transfer) | Montgomery / Fairfax / DC land records; MD [SDAT](https://dat.maryland.gov) | “New to Potomac?” welcome consult; **direct mail** to recorded mailing address | Public record — mail channel; rarely email/phone on deed |
| **C15** | **Household** | Household **changed address** recently | Licensed **USPS NCOA**; Experian/Acxiom new-mover flags; **spa CRM** address update | Welcome-back or new-location sequence | **Licensed or spa-consented only** — not free scrape |

**What is not available:** a free list of everyone who moved into 20854 last month with cell and email.

**Band It output shape:**

- **C13:** `zip`, `net_migration_trend`, `source_url` — no names  
- **C14:** `owner_name` (if on deed), `property_address`, `deed_date`, `evidence_url`  
- **C15:** only from spa CRM or licensed file — tag `new_mover_licensed` + consent metadata  

**Hypothesis test (manual):** Compare ACS population change for 20854 vs 22066; sample 5 recent deed transfers on Falls Rd corridor; optional NCOA match only if spa shares consented patient list.

### 6.6 Donation & philanthropy signals

**Question:** Do people in the trade area **recently give** — and is that evidence public?

Extends **C04 (charity gala patron)** with **donation-specific** evidence.

| ID | Type | What it indicates | Primary sources | Campaign use | Contact / legal notes |
|----|------|-------------------|-----------------|--------------|------------------------|
| **C16** | **Political (public by law)** | Named donor, amount, date, zip, employer on FEC/state filings | [FEC.gov](https://www.fec.gov); MD State Board of Elections; VA DPPE | Affluent + civically engaged; overlaps C07; event-visible profile | Public research OK; outreach tone professional — avoid “we saw your donation” cold SMS |
| **C17** | **Charity (published)** | Named **sponsor tier** or honor roll ($1k+ gifts) | Gala program PDFs; hospital foundation annual reports; school capital campaigns | Pre-gala / event-ready consult — ties to existing public-role research | Same as C04 committee research; org-routed contact common |

**What is not available:** everyone in a zip who wrote a church check or small nonprofit gift.

**Overlap with existing research:**

| Existing channel | Signals |
|------------------|---------|
| Gala co-chairs / foundation boards | C04, C07 — often implies giving |
| **C16** | Adds **verified amount + date** (political) |
| **C17** | Adds **tier + charity name** from program PDF |

**Band It research CSV optional columns:** `donation_signal` (`FEC` \| `gala_sponsor` \| `honor_roll`), `donation_amount` (if public), `donation_date`, `donation_recipient`.

**Hypothesis test (manual):** FEC search zips 20854, 20814, 20815, 22066, 22101 (last 12–24 months); cross-check Catholic Charities / Suburban Hospital sponsor PDFs for names already in [campaign-leads-potomac-skin-care-research.csv](./campaign-leads-potomac-skin-care-research.csv).

### 6.7 Additional affluent proxies (Phase 2 backlog)

- Private school benefit events  
- Charity galas (hospital foundations, Kennedy Center) — **in use via public-role research (§17)**  
- Luxury cruise and Virtuoso travel co-marketing  
- Equestrian / polo corridor events  
- Wine and culinary festival sponsorships  
- Private aviation (Montgomery County / Dulles FBO ads)  
- Real estate median home value by block group  

Demo v0 uses **static zip + tag table** plus **manual public-role research** — no live PII scraping.

---

## 7. Two-agent workflow (Band It)

Band name: **`Work Smarter Digital — Med Spa DMV`**

**v0 production path (consent-first):** four agents — see [§18](#18-consent-first-acquisition-no-paid-social-ads) and [consent-machine-potomac-skin-care.md](./consent-machine-potomac-skin-care.md).

```text
┌─────────────────────────────────────────────────────────────┐
│ AGENT 1: Med spa opportunity detection                      │
│  Input:  sample-med-spas-dmv.csv (+ optional web fetch)     │
│  Logic:  F* → M* → X* → score                               │
│  Output: ranked_leads.json / CSV                            │
└───────────────────────────┬─────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ HUMAN: Opportunity Desk label                               │
│  buy / maybe / not + note                                   │
└───────────────────────────┬─────────────────────────────────┘
                            ▼  (buy only)
┌─────────────────────────────────────────────────────────────┐
│ AGENT 2: Segment strategist                                │
│  Input:  approved spa + affluent-dmv-zips + C* signals      │
│  Output: segments, offers, tags (campaign brief)            │
└───────────────────────────┬─────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ AGENT 3: Consent architect                                  │
│  Output: SMS keyword, web agent, partner embed, QR copy       │
└───────────────────────────┬─────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ HUMAN: Approve consent machines + go live (HighLevel / site) │
└───────────────────────────┬─────────────────────────────────┘
                            ▼  (opt-in leads only)
┌─────────────────────────────────────────────────────────────┐
│ AGENT 4: Nurture                                            │
│  Input:  consented-leads-template.csv rows                    │
│  Output: sequences + highlevel_export.csv                     │
└───────────────────────────┬─────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ SINK: HighLevel                                             │
│  Tags, custom fields, SMS/email templates (CSV or webhook)  │
└─────────────────────────────────────────────────────────────┘
```

See [agent-workflow-composition.md](../../agent-workflow-composition.md) for node types.

**Rules**

- Agent 2 runs **only** on human-approved spas (`buy`).  
- Agent 3 outputs **consent machines** only — no cold contact lists.  
- Agent 4 runs **only** on opt-in leads (`consented-leads-template.csv`).  
- AI nodes do **not** approve spend, go live, or send live campaigns without human node completion.  
- All patient-facing copy passes **C10** compliance review.  
- **No paid ads** on Meta, Google, LinkedIn, or TikTok in v0 consent pilot — see §18.

---

## 8. Agent 1 — specification

| Field | Value |
|-------|--------|
| **Name** | `worksmarter-medspa-opportunity-v1` |
| **Archetype** | Discovery + classifier + ranker |
| **Input artifact** | `MedSpaUniverse` — rows from seed CSV |
| **Output artifact** | `MedSpaLeadList` — ranked with `worksmarter_score`, `signals_fired[]`, `verify_hints[]` |

**Output columns (CSV)**

`rank`, `spa_name`, `city`, `state`, `zip`, `website`, `worksmarter_score`, `fit_pass`, `signals_fired`, `signal_categories`, `exclude_flags`, `verify_status`, `verification_hints`, `source_notes`

**Implementation path:** Clone [run_band_it_outbound_v1.py](../scripts/run_band_it_outbound_v1.py) with med-spa detectors and M*/X* patterns (future commit).

---

## 9. Agent 2 — specification (segment strategist)

| Field | Value |
|-------|--------|
| **Name** | `worksmarter-medspa-segments-v1` |
| **Archetype** | Segment + offer mapper |
| **Input artifact** | `ApprovedMedSpa` + `AffluentZipMatches` |
| **Output artifact** | `CampaignBrief` — segments, zips, tags, hooks (see [campaign-brief-potomac-skin-care.md](./campaign-brief-potomac-skin-care.md)) |

**Input JSON (conceptual)**

```json
{
  "spa": {
    "name": "Potomac Skin Care",
    "city": "Potomac",
    "state": "MD",
    "zip": "20854",
    "services": ["injectables", "ZO skin treatments", "body contouring", "Cherry financing"],
    "signals_fired": ["M14", "M15", "M06"]
  },
  "service_radius_miles": 12,
  "matched_zips": [
    { "zip": "20854", "area_label": "potomac_md", "segment_tags": ["affluent_residential", "executive"] },
    { "zip": "22066", "area_label": "great_falls_va", "segment_tags": ["country_club", "gala"] }
  ],
  "brand": "Work Smarter Digital",
  "compliance": { "no_medical_claims": true, "consult_required": true }
}
```

**Brief output sections:** executive summary · 2–3 target segments · offers · HighLevel tags · hooks (C10).

**Layer B artifacts (segment tier):** [campaign-brief-potomac-skin-care.md](./campaign-brief-potomac-skin-care.md) · synthetic [campaign-clients-potomac-skin-care.csv](./campaign-clients-potomac-skin-care.csv) · public research [campaign-leads-potomac-skin-care-research.csv](./campaign-leads-potomac-skin-care-research.csv) (angles only — no cold contact).

---

## 9b. Agent 3 — specification (consent architect)

| Field | Value |
|-------|--------|
| **Name** | `worksmarter-medspa-consent-v1` |
| **Archetype** | Funnel + conversation designer |
| **Input artifact** | `CampaignBrief` + Layer A pain signals (M06, M15, etc.) |
| **Output artifact** | `ConsentMachinePack` — SMS flows, web agent tree, partner embed, QR copy |

**Output sections:** Machine A (SMS keyword) · Machine B (web concierge) · Machine C (partner embed) · HighLevel tag map · pilot checklist.

**Reference implementation:** [consent-machine-potomac-skin-care.md](./consent-machine-potomac-skin-care.md).

---

## 9c. Agent 4 — specification (nurture)

| Field | Value |
|-------|--------|
| **Name** | `worksmarter-medspa-marketing-v1` |
| **Archetype** | Draft + enrich (LLM + templates) |
| **Input artifact** | `ConsentedLeadList` from [consented-leads-template.csv](./consented-leads-template.csv) |
| **Output artifact** | Nurture sequences + `HighLevelExport` |

**Runs only on** [consented-leads-template.csv](./consented-leads-template.csv) rows (`consent_channel`, `consent_timestamp` required).

**Output:** 3-week email/SMS cadence per segment · compliance pass (C10) · HighLevel tag updates.

---

## 10. HighLevel sink (demo)

Export CSV columns for manual import or future API:

| Column | Example |
|--------|---------|
| `contact_tag` | `WS_Potomac_Affluent` |
| `spa_client` | `Potomac Skin Care` |
| `campaign_name` | `Spring_Gala_Ready_2026` |
| `segment_zip` | `20854;20815` |
| `email_subject` | *(draft)* |
| `sms_body` | *(draft, ≤160 chars)* |

Production: webhook to Work Smarter’s HighLevel sub-account.

---

## 11. Demo script (meeting narrative)

| Step | Screen | Narrator line |
|------|--------|---------------|
| 1 | Band It band — Agent 1 run | “We scanned DMV med spas for signals Work Smarter cares about.” |
| 2 | Ranked list | “Potomac Skin Care scores high — premium zip, VIP positioning, weak digital nurture.” |
| 3 | Human label **buy** | “Your team confirms who to pursue — not the AI.” |
| 4 | Agent 2 output | “Three segments: Potomac VIP, Great Falls pre-season, executive weekday consult.” |
| 5 | Research ledger | “Ten public roles informed angles — consent machines capture opt-ins.” |
| 6 | Consent machines | SMS GLOW + web agent + partner QR — see [consent-machine](./consent-machine-potomac-skin-care.md). |
| 7 | HighLevel | Opt-in leads → nurture sequences. |

**Gold-path demo spa:** **Potomac Skin Care** — M14 + M15 + physician trust; Layer B validated in [campaign-brief-potomac-skin-care.md](./campaign-brief-potomac-skin-care.md).

---

## 12. Phases

| Phase | Deliverable | Status |
|-------|-------------|--------|
| **0a — Design** | This doc + signal CSVs + sample seed | Done |
| **0b — Layer B dry run** | Campaign brief + synthetic 10 + public research 10 (Potomac Skin Care) | Done |
| **0c — Layer A verify** | Human call to Potomac Skin Care; buy/maybe/not | Pending |
| **0d — Consent pilot** | SMS GLOW + web agent + partner embed — no paid social ads | Design done — [consent-machine](./consent-machine-potomac-skin-care.md) |
| **0f — Publish Cat (guest posts)** | Disclosed guest articles on invited third-party sites — when client-active | Design only — [guest-post-publish-cat](./guest-post-publish-cat-potomac-skin-care.md) |
| **0g — Social Cat (organic copilot)** | Weekly social plan + drafts; human publishes IG/FB/groups/Nextdoor — when client-active | Design only — [social-cat-campaign-copilot](./social-cat-campaign-copilot-potomac-skin-care.md) |
| **0e — Opt-in leads** | Log rows in `consented-leads-template.csv` | Pending pilot |
| **1 — Script** | `run_worksmarter_medspa_v1.py` — Layer A scoring | Not started |
| **2 — Consent pack generator** | Agent 3 template from brief + signals | Not started |
| **3 — Nurture generator** | Agent 4 from consented leads | Not started |
| **4 — Band It UI** | Four-agent workflow in product demo band | Not started |
| **5 — Agent-to-agent listing** | Structured spa offering for consumer assistants | Future |

**Documentation rule:** Chat explores; **this doc + linked artifacts decide**; git remembers. Update this doc at phase milestones; detail lives in linked CSVs/briefs (see [§19 Artifacts index](#19-artifacts-index)).

---

## 13. Success metrics

| Wrong | Right |
|-------|--------|
| “500 med spas scraped” | “20 spas worth a call; none already agency-managed” |
| “AI wrote ads and sent them” | “Human approved campaign; export to HighLevel” |
| Generic AI interest list | Each lead has **signals_fired** + verify hint |

| Generic AI interest list | Each lead has **signals_fired** + verify hint + evidence URL |

---

## 14. Manual hypothesis test (pre-Band It)

Run **before** product implementation to validate the two-agent story.

```text
Layer A: Pick gold-path spa → score signals → 30-min verify → Work Smarter buy/maybe/not
    ↓ (buy only)
Layer B: Draw 12-mi radius → 3 segments → brief + copy (C10)
    ↓
Layer B leads: Public-role research OR opt-in lead ads OR spa CRM export
    ↓
Human: Approve segments + any outreach channel
```

| Step | Deliverable | Artifact |
|------|-------------|----------|
| 1 | One verified spa lead | §4.4 + call notes |
| 2 | Segment + copy test | [campaign-brief-potomac-skin-care.md](./campaign-brief-potomac-skin-care.md) |
| 3 | Agent output shape | [campaign-clients-potomac-skin-care.csv](./campaign-clients-potomac-skin-care.csv) |
| 4 | Real named leads (public) | [campaign-leads-potomac-skin-care-research.csv](./campaign-leads-potomac-skin-care-research.csv) |
| 5 | Spa validates segments | Meeting: “Do these three buckets match who you want?” |

Do **not** build a ranked list of 30 spas or 30 signals before one spa passes step 1. Start with **8–10 hunt signals** observable from public web; expand after verify teaches gaps.

---

## 15. Legal data boundaries (Layer B contacts)

What Band It and Work Smarter can **legally know** vs **use for outreach**:

| Information | Without pay / opt-in | Paid / licensed | Opt-in (best) |
|-------------|-------------------|-----------------|---------------|
| Zip, segment, lifestyle tag | Yes (aggregated) | Refined models | From form |
| Named individual + public role | Yes (gala chair, board) | — | — |
| `evidence_url` | Yes | — | — |
| Business phone/email on company site | Yes (business context) | — | — |
| Personal cell / home email | No (reliable free source) | Sometimes (strict terms) | Lead form / spa CRM |
| SMS / cold mobile dial | High TCPA risk without consent | Vendor must certify | Opt-in only |
| Email commercial | CAN-SPAM (opt-out, identify sender) | List license terms | Opt-in best |

**Three-tier contact model for Agent 2 output:**

1. **Signals only** — zip segments, tags, hooks (no PII) — always safe  
2. **Public research ledger** — name, role, org, evidence URL, **routing** contact (`Events@…`, foundation staff) — [§17](#17-layer-b-lead-research-public-roles)  
3. **Consented contacts** — opt-in lead ads, spa CRM, licensed list with channel certification  

**Not valid:** scrape reviews/LinkedIn into bulk cold SMS list; guess `@gmail.com`; harvest property records for med-spa promo without compliance review.

**Paid legal paths (summary):** licensed consumer/household data (Experian, Acxiom, LiveRamp); list brokers with written channel terms; Meta/Google geo lead forms; direct mail (address-only); spa-owned CRM with marketing consent.

---

## 16. Lead discovery channels

Channels for finding **named individuals** who match C* signals (identity + evidence; contact varies).

| Channel | Signals | Typical public fields | Contact quality | Status |
|---------|---------|----------------------|-----------------|--------|
| **Hospital / charity foundation boards** | C04, C07 | Name, trustee role | Org-routed | **Researched** — 10 rows in research CSV |
| **Gala committee / co-chairs** | C04, C08 | Name, spouse, employer | Event inbox (`Events@…`) | **Researched** |
| **School PTO galas (affluent schools)** | C02, C08 | Chair names | `pto@…` event email | **Researched** (SJS Great Falls) |
| **Community foundation events** | C02, C04 | Co-chairs | Org site inquiry | **Researched** (Mingle at the Mill) |
| **Executive gala chairs (corporate)** | C07, C04 | Name + employer | Foundation event staff | **Researched** (White Hat, YFT) |
| **Woman-owned businesses** | C07, C05, C06 | Owner, company, site | **Business** phone/email on website | **Backlog (C11)** — MD MBE/WBE, SWaM, NAWBO, WBJ lists |
| **New business openings** | C08, growth | Press, filings | Business contact | **Backlog (C12)** |
| **Chamber / business journal awards** | C07 | Name, firm | Firm contact | Backlog |
| **Geo-targeted ads** | C01 + segment | Platform audience | **Opt-in** lead form | Backlog for real PII test |
| **Spa CRM export** | C09 + history | Patient/leads | Consented PII | Requires spa partnership |
| **Census / IRS zip migration** | C13 | Net in/out trend | None (aggregate) | Backlog — segment priority |
| **County deed / new owner** | C14 | Owner name, address, deed date | Mailing address (mail) | Backlog — Montgomery/Fairfax SDAT |
| **Licensed new mover (NCOA)** | C15 | Household move flag | Licensed file only | Backlog — spa CRM or vendor |
| **FEC / state campaign finance** | C16 | Donor name, amount, date, zip | Public record — no personal email | Backlog — automatable search |
| **Charity sponsor / honor roll** | C17 | Donor tier, charity name | Org-routed or mail | Backlog — extends gala PDF research |

**Woman-owned businesses (next research pass):** Often **better business contact** than gala chairs; stronger **C07 weekday consult** fit; sources include [MDOT MBE/WBE](https://marylandotda.gov/mbe/), [Virginia SWaM](https://www.sbsd.virginia.gov/), NAWBO DC, Washington Business Journal women lists, Google Maps “women owned” in 20854 / 20814 / 22066.

---

## 17. Layer B lead research (public roles)

Manual method documented in [campaign-leads-research-howto.md](./campaign-leads-research-howto.md).

```text
Pick segment → search public sources → record name + role + evidence_url
  → add contact ONLY if published → human verify → optional professional outreach
```

**Research CSV columns:** `lead_id`, `person_name`, `role_title`, `organization`, `city`, `state`, `zip_estimated`, `segment_tag`, `consumer_signals`, `layer_a_bridge_signals`, `lifestyle_trigger`, `evidence_url`, `public_contact_type`, `public_contact_value`, `recommended_channel`, `campaign_hook`, `verify_status`, `research_notes`

**Optional columns (C13–C17):** `migration_signal`, `deed_date`, `donation_signal`, `donation_amount`, `donation_date`, `donation_recipient`

**Verify statuses:** `identified_public` · `contact_pending` · `approved_for_outreach` · `rejected`

**Potomac Skin Care example (10 leads):** Julie Futrovsky (Suburban Hospital Foundation chair), Beth Lemek (Catholic Charities gala co-chair), Beth Rafferty / Deana Fernandez (Great Falls Mingle at the Mill), Taylor Draim / Alex Guest (SJS gala), Eric Wenger (White Hat Gala), Cynthia Atwater (YFT Heart 2 Heart), others — full rows in [campaign-leads-potomac-skin-care-research.csv](./campaign-leads-potomac-skin-care-research.csv).

**Key learning:** Public roles yield **identity + routing contact**, not personal inboxes. Use signals for **consent machine** offers and partner selection — see [consent-machine-potomac-skin-care.md](./consent-machine-potomac-skin-care.md). Do **not** cold-contact research names.

---

## 18. Consent-first acquisition (no paid social ads)

**Principle:** Signals tell you **who to build for** and **what offer to lead with** — not who to cold-contact. Consent happens on **owned** or **partner** channels before Agent 4 nurtures.

### 18.1 Old way vs Band It v0

| Old way | Band It consent path |
|---------|----------------------|
| Meta / Google / LinkedIn ads | **Not in v0 pilot** |
| White Pages → cold call | SMS keyword / web agent / partner embed |
| Scrape gala chair → email | Gala signal → **pre-gala offer copy** on consent machines |
| Agent outputs phone list | Agent outputs **funnel pack** |

### 18.2 Three consent machines (Potomac Skin Care)

Full spec: [consent-machine-potomac-skin-care.md](./consent-machine-potomac-skin-care.md).

| Machine | Channel | User initiates |
|---------|---------|--------------|
| **A — `GLOW` SMS** | HighLevel keyword on spa number | Texts `GLOW` first |
| **B — Web concierge** | Chat widget on spa site | Opens chat + checks consent |
| **C — Partner embed** | Pilates/wellness studio QR + quiz | Clicks + submits opt-in form |

**Pilot success:** ≥10 consented leads in 2 weeks · ≥2 consults booked.

### 18.3 Other consent channels (backlog, still no paid social)

| Channel | Consent model |
|---------|---------------|
| Referral program | Existing client introduces; referred party opts in |
| GMB / organic search → site agent | Search intent → Machine B |
| Micro-event RSVP | Form = consent |
| Agent-to-agent discovery (Phase 5) | User asks their assistant; spa agent responds |

### 18.4 White Pages era (why contact got harder)

Listed **landline** White Pages were **opt-out** directories for **personal** voice calls — not permission for **SMS marketing at scale**. Mobile numbers, TCPA, and Do Not Call changed **commercial contact** rules even when names are public. Band It targets **opt-in machines**, not directory replay.

### 18.5 Inbound lead schema

[consented-leads-template.csv](./consented-leads-template.csv) — requires `consent_channel`, `consent_timestamp`, `consent_text_version` before Agent 4 runs.

---

## 19. Artifacts index

| File | Layer | Description |
|------|-------|-------------|
| [worksmarter-medspa-discovery.md](./worksmarter-medspa-discovery.md) | Both | **This doc** — architecture, decisions, boundaries |
| [med-spa-opportunity-signals.csv](./med-spa-opportunity-signals.csv) | A | F*, M*, X* registry |
| [affluent-consumer-signals.csv](./affluent-consumer-signals.csv) | B | C* registry |
| [affluent-dmv-zips.csv](./affluent-dmv-zips.csv) | B | Zip + segment tags |
| [sample-med-spas-dmv.csv](./sample-med-spas-dmv.csv) | A | Seed universe (synthetic + placeholders) |
| [campaign-brief-potomac-skin-care.md](./campaign-brief-potomac-skin-care.md) | B | Segments, cadence, copy, HighLevel shape |
| [campaign-clients-potomac-skin-care.csv](./campaign-clients-potomac-skin-care.csv) | B | Ten synthetic archetypes |
| [campaign-leads-research-template.csv](./campaign-leads-research-template.csv) | B | Empty research ledger |
| [campaign-leads-potomac-skin-care-research.csv](./campaign-leads-potomac-skin-care-research.csv) | B | Ten real public-role leads |
| [campaign-leads-research-howto.md](./campaign-leads-research-howto.md) | B | Research method + contact rules |
| [consent-machine-potomac-skin-care.md](./consent-machine-potomac-skin-care.md) | B | Consent machines A/B/C — no paid social ads |
| [consented-leads-template.csv](./consented-leads-template.csv) | B | Opt-in lead schema for Agent 4 |
| [README.md](./README.md) | Both | Folder index |

---

## 20. Related documents

- [README.md](./README.md) — folder index  
- [campaign-brief-potomac-skin-care.md](./campaign-brief-potomac-skin-care.md) — Layer B theory test  
- [campaign-leads-research-howto.md](./campaign-leads-research-howto.md) — public-role research method  
- [consent-machine-potomac-skin-care.md](./consent-machine-potomac-skin-care.md) — consent machines (SMS, web, partner)  
- [Band It outbound discovery](../band-it-outbound-discovery.md) — scoring pattern reference  
- [Agent workflow composition](../../agent-workflow-composition.md)  
- [Pre-channel signal-to-deal playbook](../../pre-channel-signal-to-deal-playbook.md)  

---

## Revision history

| Date | Change |
|------|--------|
| 2026-06-03 | Initial design — Work Smarter Digital med spa demo; two agents; Layer A/B signals |
| 2026-05-29 | Consolidated hypothesis tests: Potomac Skin Care gold path, Layer B dry run, legal boundaries, discovery channels, public-role research, artifacts index |
| 2026-05-29 | Added C13–C17 — migration/new mover (§6.5) and donation/philanthropy (§6.6) signal sets |
| 2026-05-29 | Consent-first acquisition §18 — four-agent workflow, consent-machine pilot, no paid social ads |
