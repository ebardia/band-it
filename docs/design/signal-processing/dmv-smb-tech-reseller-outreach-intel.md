# DMV reseller outreach intelligence (Cat Bot dossier)

| Field | Value |
|-------|--------|
| **Goal** | Pre-approach **situation context** per Big Band prospect — citeable hooks for outreach |
| **Not the same as** | [dmv-smb-tech-reseller-signals.csv](./dmv-smb-tech-reseller-signals.csv) (F/H/X **fit** filters) |
| **Signal registry** | [dmv-smb-tech-reseller-outreach-signals.csv](./dmv-smb-tech-reseller-outreach-signals.csv) |
| **Seed list** | [dmv-smb-tech-resellers-seed.csv](./dmv-smb-tech-resellers-seed.csv) |
| **Cat Bot roam** | [run_cat_bot_roam_v0.py](./scripts/run_cat_bot_roam_v0.py) + public page fetch pattern |

---

## 1. Two signal layers

| Layer | Prefix | Question | When |
|-------|--------|----------|------|
| **Fit** | F / H / X | Should this company be on the list? | Universe build + verify |
| **Outreach intel** | O / N | What do I say, with proof, before the call? | Pre-email / pre-LinkedIn |

**Outreach rule:** Every O-signal in a dossier must have a **citation** (URL + snippet or API id) — same bar as [adopt-a-cat-bot.md §12](../adopt-a-cat-bot.md).

### 1.1 What Cat Bot adds (vs browsing their site yourself)

Prospects’ homepages, Clutch profiles, and Google listings are **public**. Cat Bot does not win on “we found your pricing page.” It wins on:

| Manual research | Cat Bot dossier |
|-----------------|-----------------|
| Ad hoc notes before one email | **Repeatable roam** → JSON → N01 score → `suggested_opener` |
| Single-source glance | **Stacked O-signals** (O01 stack + O05 pricing + O15 gap) with citations |
| Forgets last quarter | **House Band memory** after domesticate (pitch frames, traps) |
| Generic “I love your GHL shop” | **Citeable opener:** “I ran a Cat Bot on {{company}} before reaching out…” |

Full product framing: [adopt-a-cat-bot.md §5.3](../adopt-a-cat-bot.md#53-value-on-top-of-public-sources-google-yelp-reddit-).

**Reseller dossiers lean on homepage fetch**, not Google/Yelp review APIs — see §5 and [product spec §12.0](../adopt-a-cat-bot.md#120-why-programmatic-apis-if-humans-can-browse-googleyelp).

---

## 2. Recommended O-signal set (v1 — 18 signals)

Use **10–12 per prospect** for a strong dossier; not every row fires for every company.

### Stack & product (how they make money)

| ID | Signal | Why it matters |
|----|--------|----------------|
| **O01** | Primary platform stack | GHL vs HubSpot vs MSP — sets pitch frame |
| **O02** | AI vendor stack | Vapi/Marblism/GHL AI vs custom — you won't compete with their stack |
| **O04** | White-label language | Direct Big Band analog to Work Smarter |
| **O05** | Package + price anchor | Shows how they productize; Cat Bot = new SKU |
| **O15** | Intelligence layer gap | **Your wedge** — they automate leads, not vertical roam |

### Vertical & geography (who their clients are)

| ID | Signal | Why it matters |
|----|--------|----------------|
| **O03** | End-client vertical pages | law / home services / coaches / trades |
| **O10** | Geographic micro-market | Baltimore vs SOMD vs NoVA — local opener |
| **O16** | Multi-location SMB buyers | franchise / multi-office angle |
| **O18** | Outbound channel emphasis | LinkedIn vs voice vs SEO — match pitch |

### Proof & timing (why now)

| ID | Signal | Why it matters |
|----|--------|----------------|
| **O06** | Recent case study + metric | Specific compliment |
| **O07** | Founder content (90d) | Quote their priority back |
| **O08** | Partner tier / badge | Credibility + upsell mindset |
| **O09** | Hiring implementers | Scaling pain — intel reduces research |
| **O11** | Merger / rebrand | OBO→Aptitude8; stack in flux |
| **O12** | Review theme | Clutch/Google voice of customer |
| **O13** | Stale content vs AI claims | Gentle contrast hook |
| **O14** | Bold positioning claim | "Only automated LinkedIn…" — complement with roam proof |

### Narrowing (after roam)

| ID | Signal | Rule |
|----|--------|------|
| **N01** | Outreach priority score | Weighted sum; sort qualified rows |
| **N02** | Dossier ready | ≥5 O-signals with citations → send outreach |

---

## 3. Outreach priority score (N01)

Add points when signals fire (cap 100):

| Points | Signal |
|--------|--------|
| +15 | O04 white-label OR O01 = GHL |
| +12 | O15 intelligence gap (no vertical intel product) |
| +10 | O03 vertical pages match Cat Bot demo vertical |
| +10 | O02 uses off-shelf AI (Vapi/Marblism/GHL AI) — partner not builder |
| +8 | O06 case study with metric |
| +8 | O05 public package/pricing |
| +7 | O07 founder post in 90d |
| +5 | O08 partner tier Gold+ |
| +5 | O10 micro-geo matches your demo |
| +5 | O09 hiring implementation |
| −20 | O15 fails — they already sell "market intelligence" product |

**Tier A outreach:** N01 ≥ 55 and [verify_status](./dmv-smb-tech-resellers-seed.csv) = qualified.

---

## 4. Cat Bot dossier shape (one prospect)

Store as JSON or extra CSV columns `o01_snippet` … or a sidecar `dmv-reseller-dossiers/{slug}.json`.

```json
{
  "reseller_name": "LUD Marketing LLC",
  "roam_date": "2026-05-29",
  "signals": [
    {
      "id": "O01",
      "value": "GoHighLevel",
      "snippet": "Trusted Platforms & Tools — GoHighLevel",
      "source_url": "https://ludmarketingllc.com/"
    },
    {
      "id": "O02",
      "value": "LinkedIn AI Autopilot + proprietary outreach stack",
      "snippet": "deploy an AI agent that handles replies and books consultations",
      "source_url": "https://ludmarketingllc.com/linkedin-as-a-service/"
    },
    {
      "id": "O05",
      "value": "LaaS from $597/mo; Dominate $1,997/mo",
      "snippet": "Starter Outreach $597 … Advanced AI Responder",
      "source_url": "https://ludmarketingllc.com/linkedin-as-a-service/"
    },
    {
      "id": "O03",
      "value": "Law, home services, coaches, professional services",
      "snippet": "law firms, home service companies, and coaches across MD, DC & VA",
      "source_url": "https://ludmarketingllc.com/"
    },
    {
      "id": "O15",
      "value": "Gap — no vertical market intel / community roam product",
      "snippet": "Automation & CRM — systems that work while you sleep (no intel layer)",
      "source_url": "https://ludmarketingllc.com/"
    }
  ],
  "suggested_opener": "I ran a short Cat Bot roam on LUD before reaching out. You productize GHL and LinkedIn AI Autopilot for MD/DC/VA professional services — but I don't see a vertical intelligence layer you resell to those clients. That's the piece we're building for Big Bands like you.",
  "suggested_ask": "15-min call: would a white-label Cat Bot per vertical (law, home services) fit your Dominate tier clients?"
}
```

---

## 5. Where Cat Bot roams (sources per signal)

| Source | Signals fed | API / fetch | Reseller dossier? |
|--------|-------------|-------------|-------------------|
| Prospect **homepage + services + pricing** | O01 O02 O04 O05 O14 O15 | `fetch.py` pattern | **Primary** |
| **Case studies / work** | O03 O06 O16 | same | **Primary** |
| **Blog / news** | O07 O13 | RSS or fetch | Secondary |
| **HubSpot / Salesforce directory** | O08 | ecosystem.hubspot.com | When listed |
| **Clutch profile** | O06 O12 | clutch.co | When URL in seed row |
| **LinkedIn company + founder** | O07 O09 | manual or Sales Nav | v1 manual |
| **Jobs page** | O09 | careers / LinkedIn jobs | Secondary |
| **Local news RSS** | O11 | cat_bot_roam news client | Secondary |
| **Google Places / Yelp** | O12 (review theme) | Places + Fusion APIs | **Rare** — B2B agencies seldom have review signal; use for **end-client vertical** demos (med spa) not core dossier |

**v0 scope:** Website crawl + partner directory + Clutch URL if present in seed row — no LinkedIn API required for first dossiers. **Do not block reseller outreach on Places/Yelp keys** — prove med-spa Market Cat separately via [run_cat_bot_roam_v0.py](./scripts/run_cat_bot_roam_v0.py).

---

## 6. Example dossiers (from public research)

### LUD Marketing — N01 ≈ 68

| ID | Finding |
|----|---------|
| O01 | GoHighLevel on homepage |
| O02 | Proprietary LinkedIn stack + "AI Autopilot" reply/booking |
| O03 | Law, home services, coaches, professional services |
| O05 | LaaS $597 / Growth $997 / Dominate $1,997 |
| O14 | "Only automated LinkedIn lead generation… built for professional services" |
| O15 | No vertical intel / roam product for end clients |

**Opener angle:** Complement LinkedIn Autopilot with **vertical Cat Bots** their clients' industries can't get from GHL alone.

### Services America — N01 ≈ 62

| ID | Finding |
|----|---------|
| O01 | GoHighLevel CRM pipelines funnels |
| O02 | Vapi/Bland voice AI + GHL chatbots; Web ABCs/Marblism in ecosystem |
| O03 | Home services only — HVAC plumbing roofing electrical |
| O05 | Lead Capture System $3.5k–$7.5k setup; Smart Site package |
| O10 | Alexandria HQ; explicit DMV home services |
| O15 | Automates calls/forms — not community/competitive intel for contractors |

**Opener angle:** Voice AI captures the lead; **Cat Bot** tells the contractor what's happening in their ZIP + vertical before the campaign.

### Work Smarter Digital — N01 ≈ 75 (reference)

| ID | Finding |
|----|---------|
| O01 | HighLevel white-label Revenue Accelerator |
| O04 | White-label SaaS / agency platform language |
| O03 | Med spa / local SMB via Work Smarter client verticals |
| O15 | Gap — roam intel for client verticals is Cat Bot opportunity |

---

## 7. Outreach email skeleton (using dossier)

```
Subject: Cat Bot roam on {{company}} — {{one O03 vertical}} + {{O01 stack}}

Hi {{first_name}},

Before reaching out I pointed a Cat Bot at your public footprint (your site + partner listings).

What it picked up:
• {{O01 snippet — cite URL}}
• {{O02 or O05 snippet — cite URL}}
• {{O06 or O14 if present}}

What it didn't find: a resellable intelligence layer for your end clients in {{vertical}} — you automate {{channel}}, but not vertical roam/memory under your brand.

We're building Cat Bots for Big Bands (agencies like yours) to white-label for Band clients. Work Smarter-scale GHL shops are the reference.

Worth 15 minutes to see if a {{vertical}} Cat Bot fits your {{O05 package name if any}} clients?

— {{you}}
```

---

## 9. Anti-cannibalization (sits on the capture stack)

When pitching Big Band prospects (LUD, Services America, Work Smarter archetype), Cat Bot must **not** read as competition for their existing revenue lines.

### 9.1 Stack map (reference resellers)

| They sell today | Example | Cat Bot |
|-----------------|---------|---------|
| GHL white-label / CRM | Work Smarter Revenue Accelerator | **Complement** — not another CRM |
| LinkedIn LaaS / AI Autopilot | LUD $597–$1,997/mo tiers | **Complement** — intel layer before/after Autopilot books the call |
| Voice + chat capture | Services America Vapi/Bland + GHL bots | **Complement** — vertical context the voice bot doesn’t research |
| Lead Capture setup fees | $3.5k–$7.5k Smart Site packages | **Complement** — white-label **Market Cat** SKU, not cheaper lead gen |

### 9.2 What to say

**Do say:**

- “You automate **capture**; Cat Bot automates **vertical intelligence and memory** under your brand.”
- “I ran a Cat Bot on your **public footprint** — here’s what it found (cite O01/O05/O15).”
- “Your Dominate-tier clients get a **Market Cat** for their vertical — GHL doesn’t ship that.”

**Do not say:**

- “Replace your LinkedIn stack” / “cheaper leads” / “we scrape contacts”
- “Better Google reviews” (commodity — see [§5.3](../adopt-a-cat-bot.md#53-value-on-top-of-public-sources-google-yelp-reddit-))

### 9.3 O15 as the wedge

**O15 (intelligence layer gap)** is the primary pitch signal: they productize automation and CRM, not **resellable roam + domesticated memory** for end-client verticals. Cat Bot fills that gap **above** their stack.

Product-level detail: [adopt-a-cat-bot.md §5.4](../adopt-a-cat-bot.md#54-sits-on-the-capture-stack-anti-cannibalization), [platform §3.5 House Band](../adopt-a-cat-bot-platform.md#35-house-band-internal-dogfood).

---

## 10. Next implementation steps

1. Add columns to seed CSV or sidecar JSON: `outreach_priority`, `dossier_ready`, `suggested_opener`.
2. Script `run_reseller_dossier_v0.py`: input seed row → fetch homepage + /services + /about → grep O01–O15 keywords → emit JSON.
3. Run on **top 15 qualified** rows with contact fields populated.
4. Human review 5 min per dossier → send outreach.
5. Import dossier JSON into **House Band** on adoptacatbot as first `RoamRun` records (after script proof).

See [dmv-smb-tech-reseller-discovery.md](./dmv-smb-tech-reseller-discovery.md) §8 hypothesis test. Build order: [platform doc §6.5](../adopt-a-cat-bot-platform.md#65-build-sequencing-v0--decided-2026-06-08).
