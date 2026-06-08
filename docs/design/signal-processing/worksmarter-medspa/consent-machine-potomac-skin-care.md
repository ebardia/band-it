# Consent machine — Potomac Skin Care (v0)

| Field | Value |
|-------|--------|
| **Status** | Design — ready for manual pilot |
| **Parent** | [worksmarter-medspa-discovery.md](./worksmarter-medspa-discovery.md) §18 |
| **Spa** | Potomac Skin Care — Dr. Jovy Eusebio · (301) 765-0990 · 20854 |
| **Principle** | **No cold contact.** No paid ads on Meta, Google, LinkedIn, or TikTok. Consent before nurture. |
| **Sink** | Work Smarter white-label **HighLevel** |
| **Inbound template** | [consented-leads-template.csv](./consented-leads-template.csv) |

---

## 1. What this is

Three **consent machines** that turn signals into **opt-in leads** on channels the spa owns or trusts:

| # | Machine | User initiates | Primary signals |
|---|---------|----------------|-----------------|
| **A** | SMS keyword **GLOW** | Customer texts first | C09 VIP / M15 · C08 seasonal |
| **B** | Website **concierge agent** | Visitor opens chat | C09 M06 booking friction · all segments |
| **C** | **Partner embed** (Pilates/wellness) | Partner client clicks | C06 wellness · C01 Potomac zip |

Public-role research (gala chairs, FEC donors) **does not** feed cold outreach. It informs **offer wording** and **which partner** to pursue — not who to text.

---

## 2. Band It agent roles (consent era)

```text
┌──────────────────────────────────────────────────────────────┐
│ AGENT 1: Spa opportunity (Layer A) — unchanged               │
└────────────────────────────┬─────────────────────────────────┘
                             ▼ human: buy
┌──────────────────────────────────────────────────────────────┐
│ AGENT 2: Segment strategist                                  │
│  Output: 3 segments, offers, signal map (from campaign brief)│
└────────────────────────────┬─────────────────────────────────┘
                             ▼
┌──────────────────────────────────────────────────────────────┐
│ AGENT 3: Consent architect  ← THIS DOC                         │
│  Output: SMS flow, web agent script, partner embed, QR, copy │
└────────────────────────────┬─────────────────────────────────┘
                             ▼ human: approve + go live
┌──────────────────────────────────────────────────────────────┐
│ CHANNELS (owned / partner — NOT paid social ads)             │
│  A: HighLevel SMS keyword  B: site widget  C: partner iframe │
└────────────────────────────┬─────────────────────────────────┘
                             ▼ opt-in leads
┌──────────────────────────────────────────────────────────────┐
│ AGENT 4: Nurture (former Agent 2 marketing)                  │
│  Sequences for consented contacts only                       │
└────────────────────────────┬─────────────────────────────────┘
                             ▼
                         HighLevel CRM
```

**Hard rule:** Agents **design** consent paths. They **never send** to non-consented contacts.

---

## 3. Machine A — SMS keyword `GLOW`

### 3.1 User journey

| Step | Who | Action |
|------|-----|--------|
| 1 | Spa staff | Hand receipt / checkout card with: *“Text **GLOW** to (301) 765-0990 for consult times & skin plan reminders.”* |
| 2 | Customer | Sends `GLOW` from their phone (**they initiate** — TCPA-friendly keyword flow) |
| 3 | HighLevel / SMS bot | Auto-reply with consent language + 2 questions |
| 4 | Customer | Replies with interest (e.g. `1` = consult, `2` = reminders only) |
| 5 | System | Creates contact in HighLevel: `consent_sms=true`, `source=keyword_glow`, tags |
| 6 | Staff / nurture agent | Books consult or adds to VIP reminder sequence |

### 3.2 Agent 3 deliverables (Machine A)

| Artifact | Content |
|----------|---------|
| `sms_keyword` | `GLOW` |
| `sms_auto_reply_1` | See §3.3 |
| `sms_branch_consult` | Consult booking CTA + call (301) 765-0990 |
| `sms_branch_reminders` | Quarterly skin tip + consult offer; opt-out |
| `checkout_card_copy` | Front/back print copy for front desk |
| `highlevel_tags` | `PSC_SMS_GLOW`, `Consent_SMS`, segment inferred from reply |

### 3.3 Copy (C10 compliant — draft)

**Auto-reply after `GLOW`:**

> Potomac Skin Care — physician-led on River Rd since 1998. Reply **1** for a complimentary skin consult (consult required; individual results vary). Reply **2** for seasonal skin reminders only. Msg/data rates may apply. Reply STOP to opt out.

**After `1`:**

> Thank you. Our team will text consult times within 1 business day, or call (301) 765-0990. Reply STOP to opt out.

**After `2`:**

> You're on our seasonal reminder list. We'll send 4 gentle tips per year — no medical claims. Reply STOP anytime.

### 3.4 Signal mapping

| Signal | How machine uses it |
|--------|---------------------|
| **M15** VIP no nurture | Replaces missing email nurture with **opt-in SMS** |
| **C09** spa digital gap | Meets clients on mobile without rebuilding website |
| **C08** seasonal | Branch 2 = gala/summer reminder cadence |

---

## 4. Machine B — Website concierge agent

### 4.1 User journey

| Step | Who | Action |
|------|-----|--------|
| 1 | Visitor | Lands on thepotomacskincare.com (organic search, referral, GMB — not paid ad) |
| 2 | Visitor | Opens chat widget: *“Ask about consults & treatments”* |
| 3 | Concierge agent | Qualifies: new vs returning · interest (injectables / skin / body) · preferred contact |
| 4 | Visitor | Enters name + mobile or email; checks **“OK to contact me about appointments”** |
| 5 | System | HighLevel contact: `consent_web=true`, `source=web_agent`, segment tag |
| 6 | Staff | Follow-up within 24h; nurture agent handles sequence |

### 4.2 Agent 3 deliverables (Machine B)

| Artifact | Content |
|----------|---------|
| `agent_system_prompt` | Tone, services, boundaries, no medical claims |
| `conversation_tree.md` | Branching FAQ → consult offer |
| `form_fields` | name, phone, email, interest, consent checkbox text |
| `fallback` | “Call (301) 765-0990” when agent unsure |
| `highlevel_webhook_mapping` | Field → CRM custom fields |

### 4.3 Conversation outline

```text
GREET → Physician-led Potomac Skin Care since 1998. How can I help?
  ├─ New client → interest? [Injectables | Skin treatments | Body contouring]
  │     └─ Offer free consult → capture contact + consent checkbox
  ├─ Returning → Call (301) 765-0990 or leave number for callback
  ├─ Cherry financing → Explain consult required; capture lead
  └─ Medical question → "I can't give medical advice — let's book a consult with Dr. Eusebio's team."
```

### 4.4 Signal mapping

| Signal | How machine uses it |
|--------|---------------------|
| **M06** no online booking | Chat = self-serve front door |
| **M14** premium zip / weak site | Elevates trust (physician, since 1998) |
| **C07** executive | “Weekday consult blocks” branch in tree |

**Implementation note:** Widget can be HighLevel chat, Intercom, or custom — Band It spec is **behavior + copy**, not vendor lock.

---

## 5. Machine C — Partner embed (wellness adjacency)

### 5.1 Partner target (v0)

| Field | Value |
|-------|--------|
| **Type** | Premium Pilates / yoga / functional wellness studio |
| **Geo** | Potomac / Bethesda / Great Falls corridor (20854, 20814, 22066) |
| **Signal** | **C06** wellness adjacency |
| **Why not cold ads** | Partner **already** has trusted client relationship |

**Selection method:** Manual — Google Maps “Pilates Potomac MD” → owner-operated studio → owner conversation. Agent 3 drafts outreach email; human closes partnership.

### 5.2 User journey

| Step | Who | Action |
|------|-----|--------|
| 1 | Partner owner | Agrees to counter card + QR / iframe on “Recommended partners” page |
| 2 | Studio client | Scans QR or clicks *“Potomac physician skin consult — neighbor offer”* |
| 3 | Embed page | 60-second quiz: skin goal + contact + **explicit opt-in** |
| 4 | System | HighLevel: `source=partner_pilates`, `consent_partner=true`, `segment_tag` |
| 5 | Spa | Calls within 48h; tags partner for thank-you |

### 5.3 Agent 3 deliverables (Machine C)

| Artifact | Content |
|----------|---------|
| `partner_pitch_email` | To studio owner — co-marketing, no fee (v0) |
| `embed_headline` | *“Your neighbors at Potomac Skin Care — physician-led since 1998”* |
| `quiz_questions` | 3 questions → segment tag |
| `quiz_outcomes` | Injectables / skin / body → tailored consult hook |
| `partner_counter_card` | QR → embed URL |
| `highlevel_tags` | `PSC_Partner_Wellness`, `Consent_Web` |

### 5.4 Quiz (consent on submit)

1. What brings you here today? *(Event season / Maintenance / New treatment / Not sure)*  
2. Best way to reach you? *(Mobile / Email)* + field  
3. ☑ *I agree Potomac Skin Care may contact me about scheduling a consultation. Consult required; not medical advice.*

**Submit →** “Thank you — expect a call within 2 business days.”

### 5.5 Signal mapping

| Signal | How machine uses it |
|--------|---------------------|
| **C06** | Partner type selection |
| **C08** | Quiz branch “event season” → PreSeason segment |
| **C01** | Partner must sit in spa trade-area zip |

---

## 6. What each agent produces (summary table)

| Agent | Input | Output files / records |
|-------|--------|-------------------------|
| **1 — Spa opportunity** | Med spa universe | Potomac Skin Care = **buy** |
| **2 — Segment strategist** | Approved spa + C* + zips | 3 segments (from [campaign-brief](./campaign-brief-potomac-skin-care.md)) |
| **3 — Consent architect** | Segments + M15/M06/C06 | This doc §3–5 artifacts |
| **Human** | Review copy + TCPA/consent | Approve go-live |
| **Ops** | HighLevel config | Keyword, widget, embed URL live |
| **4 — Nurture** | `consented-leads-template.csv` rows | Email/SMS sequences **opt-in only** |

---

## 7. Consented lead record (HighLevel shape)

See [consented-leads-template.csv](./consented-leads-template.csv).

| Column | Example |
|--------|---------|
| `lead_id` | `INB-001` |
| `spa_client` | Potomac Skin Care |
| `full_name` | *(from form)* |
| `phone` | *(opt-in)* |
| `email` | *(opt-in)* |
| `consent_channel` | `sms_keyword` \| `web_agent` \| `partner_embed` |
| `consent_timestamp` | ISO datetime |
| `consent_text_version` | `glow_v1_2026-05-29` |
| `source_machine` | `A` \| `B` \| `C` |
| `segment_tag` | `PSC_Potomac_Core_VIP` |
| `consumer_signals` | `C09;C08` |
| `interest` | injectables / skin / body |
| `partner_name` | *(Machine C only)* |
| `next_action` | book_consult / nurture_reminders |

---

## 8. Pilot plan (2 weeks, no paid ads)

| Day | Action | Owner |
|-----|--------|-------|
| 1–2 | Configure HighLevel SMS keyword **GLOW** + auto-replies | Work Smarter |
| 2–3 | Print 100 checkout cards (Machine A) | Spa |
| 3–5 | Deploy web chat widget + agent prompt (Machine B) | Work Smarter |
| 5–10 | Identify 1 Pilates/wellness partner; send pitch; place QR (Machine C) | Human + Agent 3 draft |
| 10–14 | Log all inbound to `consented-leads-template.csv` | Ops |
| 14 | Review: opt-ins per machine, consults booked, segment mix | Work Smarter + spa |

**Success (v0):** ≥ **10 consented leads** across A/B/C with **≥2 consults booked** — not “500 names scraped.”

---

## 9. What we explicitly do not do

- Paid Meta / Google / LinkedIn / TikTok ads  
- Cold SMS or email to public-role research names  
- People-search phone append  
- Agent sends without human-approved live config  

Public research ([campaign-leads-potomac-skin-care-research.csv](./campaign-leads-potomac-skin-care-research.csv)) informs **angles and partners**, not outbound lists.

---

## 10. Future: agent-to-agent discovery (Phase 3)

Publish structured spa offering (services, zips, booking API) so **consumer assistants** can discover Potomac Skin Care when a user asks — user-initiated, consent-native. Details in [worksmarter-medspa-discovery.md](./worksmarter-medspa-discovery.md) §18.

---

## Revision history

| Date | Change |
|------|--------|
| 2026-05-29 | Initial consent machine v0 — SMS GLOW, web concierge, partner embed |
